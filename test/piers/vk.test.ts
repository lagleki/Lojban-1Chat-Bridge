import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import { classifyError, NotReadyError } from "../../src/reliability/errors"
import { Outbox } from "../../src/reliability/outbox"
import {
  getCursor,
  hash31,
  setCursor,
  setCursorStore,
} from "../../src/reliability/runtime"
import { classifyVkError } from "../../src/piers/vkchat"
import {
  vkApiCall,
  vkBotPollLoop,
  vkTsKey,
  VkPollSession,
} from "../../src/piers/vk-bot-longpoll"
import { delay, netError, waitFor } from "../helpers"
import { Harness, Net, resetState, supervise } from "./harness"

const apiError = (code: number) =>
  Object.assign(new Error(`APIError ${code}`), { name: "APIError", code })

let h: Harness | undefined
let store: Outbox | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
  store?.close()
  store = undefined
  setCursorStore(null)
})

describe("vkchat pier (vk-io)", () => {
  const M = "vkchat_1"

  function fakeVk(net: Net) {
    const vk: any = {
      sent: [] as any[],
      updates: {
        isStarted: true,
        stop: async () => void (vk.updates.isStarted = false),
        startPolling: async () => {
          net.check()
          vk.updates.isStarted = true
        },
      },
      api: {
        messages: {
          send: async (p: any) => {
            net.check()
            // VK ignores a repeated random_id for the same peer
            if (!vk.sent.some((s: any) => s.random_id === p.random_id))
              vk.sent.push(p)
            return 1
          },
        },
        groups: { getById: async () => net.check() },
      },
    }
    return vk
  }

  test("classifyVkError: rate limits/internal transient, others permanent", () => {
    for (const c of [1, 6, 9, 10])
      assert.equal(classifyVkError(apiError(c))?.kind, "transient")
    for (const c of [7, 15, 100, 917])
      assert.equal(classifyVkError(apiError(c))?.kind, "permanent")
    assert.equal(classifyVkError(netError("ECONNRESET")), undefined)
    assert.equal(classifyVkError({ name: "APIError", code: "x" }), undefined)
  })

  test("sendTo: NotReady without client; random_id is stable per delivery key", async () => {
    const { pierObj, generic } = resetState({ [M]: { group_id: 1 } })
    generic[M].client = undefined
    await assert.rejects(
      pierObj.vkchat.sendTo({
        messenger: M,
        channelId: "2000000001",
        chunk: "x",
      }),
      NotReadyError,
    )
    const vk = fakeVk(new Net())
    generic[M].client = vk
    const args = {
      messenger: M,
      channelId: "2000000001",
      chunk: "x",
      deliveryKey: "vkchat_1:42",
    }
    await pierObj.vkchat.sendTo(args)
    await pierObj.vkchat.sendTo(args) // a retry after an unconfirmed send
    assert.equal(vk.sent.length, 1)
    assert.equal(vk.sent[0].random_id, hash31("vkchat_1:42"))
    assert.equal(vk.sent[0].peer_id, 2000000001)
  })

  test("sendTo rethrows network errors", async () => {
    const { pierObj, generic } = resetState({ [M]: { group_id: 1 } })
    const net = new Net()
    generic[M].client = fakeVk(net)
    net.online = false
    await assert.rejects(
      pierObj.vkchat.sendTo({ messenger: M, channelId: "1", chunk: "x" }),
      (e: any) => classifyError(e).kind === "transient",
    )
  })

  test("health: isStarted, probe, stop, error classifier", async () => {
    const { pierObj, generic } = resetState({ [M]: { group_id: 1 } })
    const net = new Net()
    const vk = fakeVk(net)
    generic[M].client = vk
    const hh = pierObj.vkchat.health(M)
    assert.equal(hh.isReady(), true)
    await hh.probe()
    net.online = false
    await assert.rejects(hh.probe())
    await hh.stop()
    assert.equal(hh.isReady(), false)
    assert.equal(hh.classifyError, classifyVkError)
  })

  test("offline -> online: replay in order without duplicates", async () => {
    const { pierObj, generic } = resetState({ [M]: { group_id: 1 } })
    const net = new Net()
    const vk = fakeVk(net)
    generic[M].client = vk
    h = supervise(M, "vkchat", () =>
      pierObj.vkchat.StartService({ messenger: M }),
    )
    await waitFor(() => h!.manager.isReady(M))
    net.online = false
    vk.updates.isStarted = false
    for (const n of ["1", "2", "3"])
      h.enqueue({ channelId: "5", author: "a", chunk: n })
    await delay(40)
    assert.equal(vk.sent.length, 0)
    net.online = true
    await waitFor(() => vk.sent.length === 3, 3000)
    assert.deepEqual(
      vk.sent.map((s: any) => s.message),
      ["1", "2", "3"],
    )
  })
})

describe("VK bots long poll (vkboard / vkwall)", () => {
  const M = "vkboard_1"

  function fakeBot(net: Net) {
    const bot: any = {
      settings: { group_id: 7, token: "t" },
      handled: [] as any[],
      calls: [] as Array<{ method: string; params: any }>,
      servers: 0,
      api: async (method: string, params: any) => {
        bot.calls.push({ method, params })
        net.check()
        if (method === "groups.getLongPollServer")
          return {
            response: {
              server: "https://lp",
              key: `k${++bot.servers}`,
              ts: "100",
            },
          }
        return { response: 1 }
      },
      next: (ctx: any) => void bot.handled.push(ctx),
    }
    return bot
  }

  test("vkApiCall times out a hung request", async () => {
    const bot = { api: () => new Promise(() => {}) }
    await assert.rejects(vkApiCall(bot, "wall.get", {}, 20), /timed out/)
  })

  test("long poll: dispatches updates, persists ts, handles failed 1/2/3", async () => {
    store = new Outbox({ path: ":memory:" })
    setCursorStore(store)
    resetState({ [M]: {} })
    const bot = fakeBot(new Net())
    const session: VkPollSession = { stopped: false, errors: 0, lastOkAt: 0 }
    const requests: any[] = []
    const replies: any[] = [
      { ts: "101", updates: [{ type: "board_post_new", object: { id: 1 } }] },
      { failed: 1, ts: "150" },
      { failed: 2 },
      { failed: 3 },
      { ts: "101", updates: [] },
    ]
    const get = async (_url: string, params: any) => {
      requests.push({ ...params })
      const r = replies.shift()
      if (!r) {
        session.stopped = true
        return { ts: params.ts, updates: [] }
      }
      return r
    }
    await vkBotPollLoop(M, bot, session, { get, sleep: async () => {} })
    assert.equal(bot.handled.length, 1)
    assert.deepEqual(
      requests.map((r) => [r.key, r.ts]),
      [
        ["k1", "100"],
        ["k1", "101"], // after updates
        ["k1", "150"], // failed 1: new ts, same key
        ["k2", "150"], // failed 2: new key, same ts
        ["k3", "100"], // failed 3: new key and ts
        ["k3", "101"],
      ],
    )
    assert.equal(getCursor(vkTsKey(M)), "101")
  })

  test("long poll resumes from the persisted ts and backs off on errors", async () => {
    store = new Outbox({ path: ":memory:" })
    setCursorStore(store)
    resetState({ [M]: {} })
    setCursor(vkTsKey(M), "90")
    const net = new Net()
    const bot = fakeBot(net)
    const session: VkPollSession = { stopped: false, errors: 0, lastOkAt: 0 }
    const sleeps: number[] = []
    const seenTs: string[] = []
    let n = 0
    const get = async (_u: string, params: any) => {
      seenTs.push(params.ts)
      if (++n <= 3) throw netError("ETIMEDOUT")
      session.stopped = true
      return { ts: "91", updates: [] }
    }
    await vkBotPollLoop(M, bot, session, {
      get,
      sleep: async (ms) => void sleeps.push(ms),
    })
    assert.deepEqual(sleeps, [2000, 4000, 8000])
    assert.deepEqual(seenTs, ["90", "90", "90", "90"]) // never loses ts
    assert.equal(bot.servers, 4) // new server after each error
  })

  test("vkboard sendTo: NotReady, post delay counted from enqueuedAt", async () => {
    const { pierObj, generic } = resetState({
      [M]: { group_id: 7, token: "t" },
    })
    generic[M].client = undefined
    await assert.rejects(
      pierObj.vkboard.sendTo({ messenger: M, channelId: "3", chunk: "x" }),
      NotReadyError,
    )
    const bot = fakeBot(new Net())
    generic[M].client = { bot, vkapp: { token: "user-token" } }
    const t0 = Date.now()
    await pierObj.vkboard.sendTo({
      messenger: M,
      channelId: "3",
      chunk: "old",
      enqueuedAt: Date.now() - 61_000,
    })
    assert.ok(Date.now() - t0 < 500) // backlog is not delayed again
    const call = bot.calls.at(-1)
    assert.equal(call.method, "board.createComment")
    assert.deepEqual(
      { ...call.params },
      {
        access_token: "user-token",
        group_id: 7,
        topic_id: "3",
        message: "old",
        from_group: 1,
      },
    )
    const pending = pierObj.vkboard.sendTo({
      messenger: M,
      channelId: "3",
      chunk: "new",
      enqueuedAt: Date.now() - 59_950,
    })
    await delay(10)
    assert.equal(bot.calls.length, 1)
    await pending
    assert.equal(bot.calls.length, 2)
  })

  test("vkwall sendTo posts a wall comment", async () => {
    const W = "vkwall_1"
    const { pierObj, generic } = resetState({
      [W]: { group_id: 7, token: "t" },
    })
    const bot = fakeBot(new Net())
    generic[W].client = { bot, vkapp: { token: "u" } }
    await pierObj.vkwall.sendTo({
      messenger: W,
      channelId: "9",
      chunk: "c",
      enqueuedAt: 0,
    })
    assert.equal(bot.calls.at(-1).method, "wall.createComment")
  })

  test("health for vkboard/vkwall: poll session state, probe, stop", async () => {
    for (const pier of ["vkboard", "vkwall"]) {
      const m = `${pier}_1`
      const { pierObj, generic } = resetState({
        [m]: { group_id: 7, token: "t" },
      })
      const net = new Net()
      const hh = pierObj[pier].health(m)
      assert.equal(hh.sendTimeoutMs, 120000)
      const poll = { stopped: false, errors: 0, lastOkAt: 0 }
      generic[m].client = { bot: fakeBot(net), vkapp: {}, poll }
      assert.equal(hh.isReady(), true)
      poll.errors = 1
      assert.equal(hh.isReady(), false)
      poll.errors = 0
      await hh.probe()
      net.online = false
      await assert.rejects(hh.probe())
      await hh.stop()
      assert.equal(poll.stopped, true)
      assert.equal(hh.isReady(), false)
    }
  })

  test("vkboard offline -> online: replay in order", async () => {
    const { generic } = resetState({ [M]: { group_id: 7, token: "t" } })
    const net = new Net()
    const bot = fakeBot(net)
    const posted: string[] = []
    const origApi = bot.api
    bot.api = async (method: string, params: any) => {
      const r = await origApi(method, params)
      if (method === "board.createComment") posted.push(params.message)
      return r
    }
    // messages look old enough that the 60 s posting delay has passed
    const outbox = new Outbox({
      path: ":memory:",
      now: () => Date.now() - 120_000,
    })
    h = supervise(
      M,
      "vkboard",
      async () => {
        net.check()
        generic[M].client = {
          bot,
          vkapp: { token: "u" },
          poll: { stopped: false, errors: 0, lastOkAt: 0 },
        }
      },
      {},
      {},
      { outbox },
    )
    await waitFor(() => h!.manager.isReady(M))
    net.online = false
    generic[M].client.poll.errors = 1 // poll loop failing
    for (const n of ["1", "2", "3"])
      h.enqueue({ channelId: "3", author: "a", chunk: n })
    await delay(40)
    assert.deepEqual(posted, [])
    net.online = true
    await waitFor(() => posted.length === 3, 3000)
    assert.deepEqual(posted, ["1", "2", "3"])
  })
})
