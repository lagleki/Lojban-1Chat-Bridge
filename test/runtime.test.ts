import { describe, test } from "node:test"
import assert from "node:assert/strict"
import {
  getCursor,
  hash31,
  healthBus,
  reportDown,
  requestProbe,
  SeenSet,
  setCursor,
  setCursorStore,
} from "../src/reliability/runtime"

describe("runtime", () => {
  test("hash31 is stable, positive and 31-bit", () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const h = hash31(`abcdef0123:${i}`)
      assert.ok(Number.isInteger(h) && h > 0 && h < 2 ** 31)
      assert.equal(h, hash31(`abcdef0123:${i}`))
      seen.add(h)
    }
    assert.equal(seen.size, 2000)
    assert.ok(hash31("") > 0)
  })

  test("SeenSet remembers ids and evicts the oldest", () => {
    const s = new SeenSet(3)
    assert.equal(s.add(1), true)
    assert.equal(s.add("1"), false)
    s.add(2)
    s.add(3)
    s.add(4)
    assert.equal(s.has(1), false)
    assert.equal(s.has(4), true)
  })

  test("cursors use the store when set, memory otherwise", () => {
    setCursorStore(null)
    setCursor("k", "mem")
    assert.equal(getCursor("k"), "mem")
    const m = new Map<string, string>()
    setCursorStore({
      getCursor: (k) => m.get(k),
      setCursor: (k, v) => void m.set(k, v),
    })
    assert.equal(getCursor("k"), undefined)
    setCursor("k", "db")
    assert.equal(m.get("k"), "db")
    setCursorStore(null)
    assert.equal(getCursor("k"), "mem")
  })

  test("reportDown / requestProbe go through the health bus", () => {
    const events: unknown[][] = []
    const onDown = (...a: unknown[]) => events.push(["down", ...a])
    const onProbe = (...a: unknown[]) => events.push(["probe", ...a])
    healthBus.on("down", onDown)
    healthBus.on("probe", onProbe)
    reportDown("irc_1", "socket closed")
    requestProbe("irc_1")
    healthBus.off("down", onDown)
    healthBus.off("probe", onProbe)
    assert.deepEqual(events, [
      ["down", "irc_1", "socket closed"],
      ["probe", "irc_1"],
    ])
  })
})
