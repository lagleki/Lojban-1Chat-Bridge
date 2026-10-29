import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Backoff, DEFAULT_BACKOFF } from "../src/reliability/backoff"

describe("Backoff", () => {
  test("grows exponentially and caps at maxMs (no jitter)", () => {
    const b = new Backoff({ initialMs: 100, maxMs: 1000, factor: 2, jitter: 0 })
    const got = Array.from({ length: 7 }, () => b.next())
    assert.deepEqual(got, [100, 200, 400, 800, 1000, 1000, 1000])
    assert.equal(b.attempts, 7)
  })

  test("never gives up: huge attempt counts stay finite and capped", () => {
    const b = new Backoff({ initialMs: 1, maxMs: 500, jitter: 0 })
    for (let i = 0; i < 10000; i++) assert.ok(b.next() <= 500)
    assert.equal(b.baseDelay(1e9), 500)
  })

  test("jitter keeps the delay within [base*(1-jitter), base]", () => {
    for (const r of [0, 0.25, 0.5, 0.999, 1]) {
      const b = new Backoff(
        { initialMs: 1000, maxMs: 60000, factor: 2, jitter: 0.5 },
        () => r,
      )
      for (let i = 0; i < 8; i++) {
        const base = b.baseDelay(i)
        const d = b.next()
        assert.ok(d >= base * 0.5 && d <= base, `${d} not in range of ${base}`)
      }
    }
  })

  test("jitter actually spreads delays with a real RNG", () => {
    const values = new Set<number>()
    for (let i = 0; i < 50; i++) {
      const b = new Backoff({ initialMs: 10000, jitter: 1 })
      values.add(b.next())
    }
    assert.ok(values.size > 10)
  })

  test("reset starts over", () => {
    const b = new Backoff({ initialMs: 10, jitter: 0 })
    b.next()
    b.next()
    b.reset()
    assert.equal(b.attempts, 0)
    assert.equal(b.next(), 10)
  })

  test("sanitizes bad options", () => {
    const b = new Backoff({ initialMs: -5, maxMs: -1, factor: 0.5, jitter: 7 })
    assert.equal(b.options.initialMs, 0)
    assert.equal(b.options.maxMs, 0)
    assert.equal(b.options.factor, 1)
    assert.equal(b.options.jitter, 1)
    assert.equal(b.next(), 0)
  })

  test("defaults", () => {
    assert.deepEqual(new Backoff().options, DEFAULT_BACKOFF)
  })
})
