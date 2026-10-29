import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import { classifyError, NotReadyError } from "../../src/reliability/errors"
import { delay, waitFor } from "../helpers"
import { Harness, Net, resetState, supervise } from "./harness"

const M = "telegram_1"

/** Minimal stand-in for node-telegram-bot-api's TelegramBot. */
function fakeTelegram(net: Net) {
  const sent: Array<{ chat: string; text: string; opts: any }> = []
  const client = {
    sent,
    polling: true,
    startPollingCalls: 0,
    _polling: { _lastUpdate: Date.now(), options: { interval: 300 } },
    isPolling: () => client.polling,
    startPolling: async () => {
      client.startPollingCalls++
      client.polling = true
    },
    getMe: async () => {
      net.check("EFATAL")
      return { id: 1, username: "bridge_bot" }
    },
    sendMessage: async (chat: string, text: string, opts: any) => {
      if (!net.online)
        throw Object.assign(new Error("EFATAL: socket hang up"), {
          code: "EFATAL",
        })
      sent.push({ chat, text, opts })
      return { message_id: sent.length }
    },
  }
  return client
}

let h: Harness | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
})

describe("telegram pier", () => {
  test("sendTo: no client -> NotReadyError; errors are rethrown, not swallowed", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    await assert.rejects(
      pierObj.telegram.sendTo({ messenger: M, channelId: "-100", chunk: "x" }),
      NotReadyError,
    )
    const net = new Net()
    generic[M].client = fakeTelegram(net)
    net.online = false
    await assert.rejects(
      pierObj.telegram.sendTo({ messenger: M, channelId: "-100", chunk: "x" }),
      (e: any) => classifyError(e).kind === "transient",
    )
  })

  test("sendTo: forum topics use message_thread_id", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    const client = fakeTelegram(new Net())
    generic[M].client = client
    await pierObj.telegram.sendTo({
      messenger: M,
      channelId: "7@-100",
      chunk: "hi",
    })
    assert.deepEqual(client.sent[0], {
      chat: "-100",
      text: "hi",
      opts: { message_thread_id: "7", parse_mode: "HTML" },
    })
  })

  test("health: ready only when polling and identified", () => {
    const { pierObj, generic, state } = resetState({ [M]: { token: "t" } })
    const hh = pierObj.telegram.health(M)
    assert.equal(hh.isReady(), false)
    const client = fakeTelegram(new Net())
    generic[M].client = client
    assert.equal(hh.isReady(), false) // getMe not done yet
    state.config.piers[M].myUser = { id: 1 }
    assert.equal(hh.isReady(), true)
    client.polling = false
    assert.equal(hh.isReady(), false)
  })

  test("probe: getMe round trip, and detects a stalled long-poll", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    const net = new Net()
    const client = fakeTelegram(net)
    generic[M].client = client
    const hh = pierObj.telegram.health(M)
    await hh.probe()
    net.online = false
    await assert.rejects(hh.probe())
    net.online = true
    client._polling._lastUpdate = Date.now() - 10 * 60 * 1000
    generic[M].pollingStartedAt = Date.now() - 10 * 60 * 1000
    await assert.rejects(hh.probe(), /stalled/)
    client._polling._lastUpdate = Date.now()
    client._polling.options.interval = 10000
    await hh.probe()
    assert.equal(client._polling.options.interval, 300) // fast again
  })

  test("StartService on reconnect reuses the client (getUpdates offset kept)", async () => {
    const { pierObj, generic, state } = resetState({ [M]: { token: "t" } })
    const net = new Net()
    const client = fakeTelegram(net)
    client.polling = false
    generic[M].client = client
    net.online = false
    await assert.rejects(pierObj.telegram.StartService({ messenger: M }))
    net.online = true
    await pierObj.telegram.StartService({ messenger: M })
    assert.equal(generic[M].client, client)
    assert.equal(client.startPollingCalls, 1)
    assert.equal(state.config.piers[M].myUser.username, "bridge_bot")
  })

  test("offline -> online: queued messages are replayed in order", async () => {
    const { generic, state } = resetState({ [M]: { token: "t" } })
    const net = new Net()
    const client = fakeTelegram(net)
    h = supervise(M, "telegram", async () => {
      generic[M].client = client
      state.config.piers[M].myUser = await client.getMe()
    })
    await waitFor(() => h!.manager.isReady(M))
    h.enqueue({ channelId: "-100", author: "a", chunk: "1" })
    await waitFor(() => client.sent.length === 1)
    // connection lost: sends fail, polling keeps failing
    net.online = false
    client.polling = false
    for (const n of ["2", "3", "4"])
      h.enqueue({ channelId: "-100", author: "a", chunk: n })
    await waitFor(() => !h!.manager.isReady(M))
    await delay(30)
    assert.equal(client.sent.length, 1)
    assert.equal(h.manager.outbox.pendingCount(M), 3)
    net.online = true
    client.polling = true
    await waitFor(() => client.sent.length === 4, 2000)
    assert.deepEqual(
      client.sent.map((s) => s.text),
      ["1", "2", "3", "4"],
    )
    assert.equal(h.manager.outbox.pendingCount(M), 0)
  })

  test("429 Too Many Requests waits for retry_after, then delivers", async () => {
    const { generic, state } = resetState({ [M]: { token: "t" } })
    const client = fakeTelegram(new Net())
    let first = true
    const orig = client.sendMessage
    client.sendMessage = async (...a: [string, string, any]) => {
      if (first) {
        first = false
        throw Object.assign(new Error("ETELEGRAM: 429"), {
          code: "ETELEGRAM",
          response: {
            statusCode: 429,
            body: { parameters: { retry_after: 0.05 } },
          },
        })
      }
      return orig(...a)
    }
    h = supervise(M, "telegram", async () => {
      generic[M].client = client
      state.config.piers[M].myUser = { id: 1 }
    })
    const t0 = Date.now()
    h.enqueue({ channelId: "-100", author: "a", chunk: "x" })
    await waitFor(() => client.sent.length === 1)
    assert.ok(Date.now() - t0 >= 45)
  })

  test("400 chat not found is permanent", () => {
    const err = Object.assign(new Error("ETELEGRAM: 400 Bad Request"), {
      code: "ETELEGRAM",
      response: { statusCode: 400, body: { description: "chat not found" } },
    })
    assert.equal(classifyError(err).kind, "permanent")
  })
})
