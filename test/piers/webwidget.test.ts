import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import { EventEmitter } from "events"
import { NotReadyError } from "../../src/reliability/errors"
import { delay, waitFor } from "../helpers"
import { Harness, resetState, supervise } from "./harness"

const M = "webwidget_1"

let h: Harness | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
})

describe("webwidget pier", () => {
  test("sendTo: NotReady until started; emits and keeps bounded history", async () => {
    const { pierObj, generic } = resetState({ [M]: { historyLength: 2 } })
    await assert.rejects(
      pierObj.webwidget.sendTo({ messenger: M, channelId: "c", chunk: "x" }),
      NotReadyError,
    )
    const io = new EventEmitter()
    const emitted: any[] = []
    io.on("sentFrom", (d) => emitted.push(d.data.chunk))
    generic[M].client = io
    generic[M].Lojban1ChatHistory = []
    for (const n of ["1", "2", "3"])
      await pierObj.webwidget.sendTo({ messenger: M, channelId: "c", chunk: n })
    assert.deepEqual(emitted, ["1", "2", "3"])
    assert.deepEqual(
      generic[M].Lojban1ChatHistory.map((d: any) => d.chunk),
      ["2", "3"],
    )
  })

  test("health and replay of messages queued before the server started", async () => {
    const { pierObj, generic } = resetState({ [M]: {} })
    assert.equal(pierObj.webwidget.health(M).isReady(), false)
    const io = new EventEmitter()
    const emitted: string[] = []
    io.on("sentFrom", (d) => emitted.push(d.data.chunk))
    let allow = false
    h = supervise(M, "webwidget", async () => {
      if (!allow) throw new Error("port busy")
      generic[M].client = io
      generic[M].Lojban1ChatHistory = []
    })
    for (const n of ["1", "2"])
      h.enqueue({ channelId: "c", author: "a", chunk: n })
    await delay(30)
    assert.deepEqual(emitted, [])
    allow = true
    await waitFor(() => emitted.length === 2, 2000)
    assert.deepEqual(emitted, ["1", "2"])
  })
})
