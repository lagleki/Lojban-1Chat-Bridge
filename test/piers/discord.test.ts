import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import {
  classifyError,
  NotReadyError,
  PermanentSendError,
} from "../../src/reliability/errors"
import { getCursor, setCursor } from "../../src/reliability/runtime"
import { snowflakeGreater } from "../../src/piers/discord"
import { delay, waitFor } from "../helpers"
import { Harness, Net, resetState, supervise } from "./harness"

const M = "discord_1"
const CH = "111"

function fakeDiscord(net: Net) {
  const sent: string[] = []
  const history: any[] = []
  const channel = {
    id: CH,
    send: async ({ content }: { content: string }) => {
      if (!net.online)
        throw Object.assign(new Error("connect ETIMEDOUT"), {
          code: "ETIMEDOUT",
        })
      sent.push(content)
    },
    messages: {
      fetchCalls: [] as any[],
      fetch: async (opts: { after: string; limit: number }) => {
        channel.messages.fetchCalls.push(opts)
        const list = history.filter((m) => snowflakeGreater(m.id, opts.after))
        return new Map(list.slice(0, opts.limit).map((m) => [m.id, m]))
      },
    },
  }
  const client = {
    sent,
    history,
    channel,
    destroyed: false,
    ws: { status: 0 },
    channels: { cache: new Map([[CH, channel]]) },
    api: {
      users: () => ({
        get: async () => {
          net.check("ETIMEDOUT")
          return { id: "bot" }
        },
      }),
    },
    removeAllListeners() {},
    destroy() {
      client.destroyed = true
    },
  }
  return client
}

let h: Harness | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
})

describe("discord pier", () => {
  test("snowflakes compare numerically", () => {
    assert.equal(
      snowflakeGreater("100000000000000000010", "99999999999999999999"),
      true,
    )
    assert.equal(snowflakeGreater("5", "6"), false)
    assert.equal(snowflakeGreater("5", undefined), true)
  })

  test("sendTo: gateway down -> NotReady, unknown channel -> permanent", async () => {
    const { pierObj, generic } = resetState({ [M]: { noWebhooks: true } })
    await assert.rejects(
      pierObj.discord.sendTo({ messenger: M, channelId: CH, chunk: "x" }),
      NotReadyError,
    )
    const client = fakeDiscord(new Net())
    generic[M].client = client
    client.ws.status = 5 // DISCONNECTED
    await assert.rejects(
      pierObj.discord.sendTo({ messenger: M, channelId: CH, chunk: "x" }),
      NotReadyError,
    )
    client.ws.status = 0
    await assert.rejects(
      pierObj.discord.sendTo({ messenger: M, channelId: "999", chunk: "x" }),
      PermanentSendError,
    )
    await pierObj.discord.sendTo({ messenger: M, channelId: CH, chunk: "ok" })
    assert.deepEqual(client.sent, ["ok"])
  })

  test("sendTo: a network error is thrown (fallbacks only for permanent ones)", async () => {
    const { pierObj, generic } = resetState({ [M]: { noWebhooks: true } })
    const net = new Net()
    const client = fakeDiscord(net)
    generic[M].client = client
    net.online = false
    await assert.rejects(
      pierObj.discord.sendTo({ messenger: M, channelId: CH, chunk: "x" }),
      (e: any) => classifyError(e).kind === "transient",
    )
  })

  test("health: gateway status, REST probe, stop destroys the client", async () => {
    const { pierObj, generic } = resetState({ [M]: {} })
    const net = new Net()
    const client = fakeDiscord(net)
    generic[M].client = client
    const hh = pierObj.discord.health(M)
    assert.equal(hh.isReady(), true)
    assert.equal(hh.nativeRecoveryMs, 30000)
    await hh.probe()
    net.online = false
    await assert.rejects(hh.probe())
    client.ws.status = 1 // CONNECTING
    assert.equal(hh.isReady(), false)
    await hh.stop()
    assert.equal(client.destroyed, true)
    assert.equal(generic[M].client, null)
  })

  test("catch-up: fetches messages after the cursor, in order, once", async () => {
    const { pierObj, generic, state } = resetState({ [M]: {} })
    state.config.channelMapping[M] = { [CH]: {} }
    const client = fakeDiscord(new Net())
    generic[M].client = client
    const now = Date.now()
    const msg = (id: string, age = 0) => ({
      id,
      channel: { id: CH },
      createdTimestamp: now - age,
    })
    client.history.push(
      msg("20"),
      msg("30"),
      msg("25"),
      msg("10"),
      msg("40", 48 * 3600 * 1000),
    )
    const received: string[] = []
    const orig = pierObj.discord.receivedFrom
    pierObj.discord.receivedFrom = async (_m: string, m: any) =>
      void received.push(m.id)
    try {
      await pierObj.discord.catchUp(M) // no cursor yet: nothing to recover
      assert.equal(client.channel.messages.fetchCalls.length, 0)
      setCursor(`discord:${M}:${CH}`, "15")
      await pierObj.discord.catchUp(M)
      // 40 is older than the catch-up window: skipped but cursor moves on
      assert.deepEqual(received, ["20", "25", "30"])
      assert.equal(getCursor(`discord:${M}:${CH}`), "40")
      await pierObj.discord.catchUp(M)
      assert.deepEqual(received, ["20", "25", "30"]) // nothing twice
    } finally {
      pierObj.discord.receivedFrom = orig
    }
  })

  test("offline -> online: replay in order, catch-up runs on reconnect", async () => {
    const { generic, pierObj } = resetState({ [M]: { noWebhooks: true } })
    const net = new Net()
    const client = fakeDiscord(net)
    let catchUps = 0
    const origCatchUp = pierObj.discord.catchUp
    pierObj.discord.catchUp = async () => void catchUps++
    try {
      h = supervise(
        M,
        "discord",
        async () => {
          net.check()
          generic[M].client = client
          client.ws.status = 0
        },
        { nativeRecoveryMs: 20 },
      )
      await waitFor(() => h!.manager.isReady(M))
      // gateway drops (discord.js would emit shardDisconnect)
      net.online = false
      client.ws.status = 5
      for (const n of ["1", "2", "3"])
        h.enqueue({ channelId: CH, author: "a", chunk: n })
      await delay(60)
      assert.equal(client.sent.length, 0)
      net.online = true
      await waitFor(() => client.sent.length === 3, 2000)
      assert.deepEqual(client.sent, ["1", "2", "3"])
      assert.ok(catchUps >= 2)
    } finally {
      pierObj.discord.catchUp = origCatchUp
    }
  })
})
