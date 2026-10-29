import { after, afterEach, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import http from "http"
import type { AddressInfo } from "net"
import { NotReadyError } from "../../src/reliability/errors"
import { getCursor, setCursor } from "../../src/reliability/runtime"
import { delay, waitFor } from "../helpers"
import { Harness, resetState, supervise } from "./harness"

const M = "mattermost_1"

/** A tiny Mattermost: incoming webhook + the REST endpoints we use. */
const server = {
  online: true,
  hooks: [] as Array<{ text: string; channel: string }>,
  posts: {} as Record<string, any>,
  requests: [] as string[],
}
let srv: http.Server
let base = ""

before(async () => {
  srv = http.createServer((req, res) => {
    if (!server.online) {
      req.socket.destroy()
      return
    }
    server.requests.push(`${req.method} ${req.url}`)
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      const json = (code: number, v: unknown) => {
        res.writeHead(code, { "content-type": "application/json" })
        res.end(JSON.stringify(v))
      }
      const url = req.url ?? ""
      if (url === "/hook") {
        server.hooks.push(JSON.parse(body))
        return json(200, {})
      }
      if (url === "/api/v4/users/me") return json(200, { id: "bot" })
      const ch = url.match(/^\/api\/v4\/teams\/T\/channels\/name\/(.+)$/)
      if (ch) return json(200, { id: `id-${ch[1]}` })
      const since = url.match(
        /^\/api\/v4\/channels\/id-(.+)\/posts\?since=(\d+)$/,
      )
      if (since) {
        const posts = Object.fromEntries(
          Object.values(server.posts)
            .filter((p) => p.channel === since[1])
            .map((p) => [p.id, p]),
        )
        return json(200, { order: Object.keys(posts), posts })
      }
      const user = url.match(/^\/api\/v4\/users\/(.+)$/)
      if (user) return json(200, { username: `user-${user[1]}` })
      json(404, { message: "not found" })
    })
  })
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r))
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`
})
after(() => srv.close())

function cfg() {
  return {
    [M]: {
      HookUrl: `${base}/hook`,
      ProviderUrl: base,
      team_id: "T",
      token: "tok",
    },
  }
}

/** Fake `ws` socket: answers seq requests while the server is online. */
function fakeWs(g: any) {
  const ws: any = {
    readyState: 1,
    answers: true,
    sent: [] as any[],
    terminated: false,
    removeAllListeners() {},
    on() {},
    terminate() {
      ws.terminated = true
      ws.readyState = 3
    },
    send(raw: string) {
      const msg = JSON.parse(raw)
      ws.sent.push(msg)
      if (ws.answers)
        setImmediate(() =>
          g.pending[msg.seq]?.({ status: "OK", seq_reply: msg.seq }),
        )
    },
  }
  g.client = ws
  g.authed = true
  g.pending = {}
  return ws
}

let h: Harness | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
  server.online = true
  server.hooks.length = 0
  server.posts = {}
})

describe("mattermost pier", () => {
  test("sendTo posts to the webhook and throws when it is unreachable", async () => {
    const { pierObj } = resetState(cfg())
    await pierObj.mattermost.sendTo({
      messenger: M,
      channelId: "town",
      chunk: "hi",
    })
    assert.deepEqual(server.hooks, [{ text: "hi", channel: "town" }])
    server.online = false
    await assert.rejects(
      pierObj.mattermost.sendTo({
        messenger: M,
        channelId: "town",
        chunk: "x",
      }),
    )
  })

  test("wsRequest: NotReady when closed or not authenticated; resolves on seq_reply", async () => {
    const { pierObj, generic } = resetState(cfg())
    const req = pierObj.mattermost.common.wsRequest
    await assert.rejects(req(M, "get_statuses"), NotReadyError)
    const ws = fakeWs(generic[M])
    generic[M].authed = false
    await assert.rejects(req(M, "get_statuses"), NotReadyError)
    generic[M].authed = true
    const reply = await req(M, "get_statuses")
    assert.equal(reply.status, "OK")
    assert.equal(ws.sent[0].action, "get_statuses")
    assert.deepEqual(generic[M].pending, {})
  })

  test("health: readiness, probe over websocket + REST, stop terminates", async () => {
    const { pierObj, generic } = resetState(cfg())
    const hh = pierObj.mattermost.health(M)
    assert.equal(hh.isReady(), false)
    const ws = fakeWs(generic[M])
    assert.equal(hh.isReady(), true)
    await hh.probe()
    server.online = false // REST down, websocket still answering
    await assert.rejects(hh.probe())
    server.online = true
    ws.answers = false // websocket silently dead
    const t0 = Date.now()
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error("probe timeout")), 50),
    )
    await assert.rejects(Promise.race([hh.probe(), timeout]), /probe timeout/)
    assert.ok(Date.now() - t0 < 1000)
    await hh.stop()
    assert.ok(ws.terminated)
    assert.equal(hh.isReady(), false)
  })

  test("catch-up re-relays posts after the cursor, oldest first, once", async () => {
    const { pierObj, generic, state, inbound } = resetState(cfg())
    state.config.channelMapping[M] = { town: {} }
    fakeWs(generic[M])
    const now = Date.now()
    server.posts = {
      b: {
        id: "b",
        channel: "town",
        create_at: now - 1000,
        user_id: "u1",
        message: "two",
      },
      a: {
        id: "a",
        channel: "town",
        create_at: now - 2000,
        user_id: "u2",
        message: "one",
      },
      old: {
        id: "old",
        channel: "town",
        create_at: now - 9000,
        user_id: "u2",
        message: "seen",
      },
    }
    const relayed: any[] = []
    const orig = pierObj.mattermost.receivedFrom
    pierObj.mattermost.receivedFrom = async (_m: string, msg: any) =>
      void relayed.push(msg)
    try {
      await pierObj.mattermost.catchUp(M) // no cursor: nothing
      assert.equal(relayed.length, 0)
      setCursor(`mattermost:${M}:town`, String(now - 5000))
      await pierObj.mattermost.catchUp(M)
      assert.deepEqual(
        relayed.map((m) => JSON.parse(m.data.post).id),
        ["a", "b"],
      )
      assert.equal(relayed[0].data.sender_name, "@user-u2")
      assert.equal(getCursor(`mattermost:${M}:town`), String(now - 1000))
      await pierObj.mattermost.catchUp(M)
      assert.equal(relayed.length, 2)
      assert.equal(inbound.length, 0)
    } finally {
      pierObj.mattermost.receivedFrom = orig
    }
  })

  test("offline -> online: webhook outage queues, then replays in order", async () => {
    const { generic } = resetState(cfg())
    h = supervise(
      M,
      "mattermost",
      async () => {
        if (!server.online)
          throw Object.assign(new Error("ECONNREFUSED"), {
            code: "ECONNREFUSED",
          })
        fakeWs(generic[M])
      },
      {},
      { probeIntervalMs: 15 },
    )
    await waitFor(() => h!.manager.isReady(M))
    server.online = false
    for (const n of ["1", "2", "3"])
      h.enqueue({ channelId: "town", author: "a", chunk: n })
    await waitFor(() => !h!.manager.isReady(M), 2000)
    await delay(30)
    assert.equal(server.hooks.length, 0)
    server.online = true
    await waitFor(() => server.hooks.length === 3, 3000)
    assert.deepEqual(
      server.hooks.map((x) => x.text),
      ["1", "2", "3"],
    )
  })
})
