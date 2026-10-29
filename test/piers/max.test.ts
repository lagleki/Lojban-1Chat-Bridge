import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import { NotReadyError, PermanentSendError } from "../../src/reliability/errors"
import {
  getCursor,
  setCursor,
  setCursorStore,
} from "../../src/reliability/runtime"
import { Outbox } from "../../src/reliability/outbox"
import { delay, waitFor } from "../helpers"
import { Harness, Net, resetState, supervise } from "./harness"

const M = "max_1"

/** Stand-in for @maxhub/max-bot-api's Bot with a long-poll getUpdates. */
function fakeMax(net: Net) {
  const bot: any = {
    sent: [] as Array<{ id: number; text: string }>,
    queue: [] as any[],
    markers: [] as Array<number | undefined>,
    handled: [] as any[],
    nextMarker: 100,
    botInfo: undefined,
    api: {
      getMyInfo: async () => {
        net.check()
        return { user_id: 1, name: "bridge" }
      },
      sendMessageToChat: async (id: number, text: string) => {
        net.check()
        bot.sent.push({ id, text })
      },
      getUpdates: async (_types: string[], opts: { marker?: number }) => {
        bot.markers.push(opts.marker)
        await delay(5)
        net.check()
        const updates = bot.queue.splice(0)
        return {
          updates,
          marker: updates.length
            ? ++bot.nextMarker
            : (opts.marker ?? bot.nextMarker),
        }
      },
    },
    handleUpdate: async (u: any) => void bot.handled.push(u),
  }
  return bot
}

let h: Harness | undefined
let store: Outbox | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
  const { generic } = resetState({})
  void generic
  store?.close()
  store = undefined
  setCursorStore(null)
})

describe("max pier", () => {
  test("sendTo: invalid chat id is permanent, no client is NotReady, errors rethrown", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    await assert.rejects(
      pierObj.max.sendTo({ messenger: M, channelId: "abc", chunk: "x" }),
      PermanentSendError,
    )
    await assert.rejects(
      pierObj.max.sendTo({ messenger: M, channelId: "-5", chunk: "x" }),
      NotReadyError,
    )
    const net = new Net()
    generic[M].client = fakeMax(net)
    await pierObj.max.sendTo({ messenger: M, channelId: "-5", chunk: "ok" })
    assert.deepEqual(generic[M].client.sent, [{ id: -5, text: "ok" }])
    net.online = false
    await assert.rejects(
      pierObj.max.sendTo({ messenger: M, channelId: "-5", chunk: "x" }),
    )
  })

  test("reconnect StartService resumes polling from the persisted marker", async () => {
    store = new Outbox({ path: ":memory:" })
    setCursorStore(store)
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    const net = new Net()
    const bot = fakeMax(net)
    generic[M].client = bot
    setCursor(`max:${M}:marker`, "42")
    bot.queue.push({ update_type: "message_created", n: 1 })
    await pierObj.max.StartService({ messenger: M })
    const hh = pierObj.max.health(M)
    await waitFor(() => bot.handled.length === 1)
    assert.equal(bot.markers[0], 42)
    assert.equal(getCursor(`max:${M}:marker`), "101")
    assert.equal(hh.isReady(), true)

    // network error: session unhealthy until restarted
    net.online = false
    await waitFor(() => !hh.isReady())
    await hh.stop()
    net.online = true
    bot.queue.push({ n: 2 })
    await pierObj.max.StartService({ messenger: M })
    await waitFor(() => bot.handled.length === 2)
    assert.ok(bot.markers.includes(101))
    await hh.stop()
  })

  test("a superseded session stops polling", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    const bot = fakeMax(new Net())
    generic[M].client = bot
    await pierObj.max.StartService({ messenger: M })
    const first = generic[M].maxSession
    await pierObj.max.StartService({ messenger: M })
    assert.equal(first.stopped, true)
    assert.notEqual(generic[M].maxSession, first)
    await pierObj.max.health(M).stop()
    const n = bot.markers.length
    await delay(30)
    assert.ok(bot.markers.length <= n + 2)
  })

  test("offline -> online: replay in order after the poll recovers", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    const net = new Net()
    const bot = fakeMax(net)
    generic[M].client = bot
    h = supervise(M, "max", () => pierObj.max.StartService({ messenger: M }))
    await waitFor(() => h!.manager.isReady(M))
    net.online = false
    for (const n of ["1", "2", "3"])
      h.enqueue({ channelId: "-7", author: "a", chunk: n })
    await waitFor(() => !h!.manager.isReady(M), 2000)
    assert.equal(bot.sent.length, 0)
    net.online = true
    await waitFor(() => bot.sent.length === 3, 4000)
    assert.deepEqual(
      bot.sent.map((s: any) => s.text),
      ["1", "2", "3"],
    )
  })
})
