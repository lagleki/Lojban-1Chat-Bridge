import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Signal, sleep, withTimeout } from "../src/reliability/async"
import { TimeoutError } from "../src/reliability/errors"

describe("withTimeout", () => {
  test("resolves when in time", async () => {
    assert.equal(await withTimeout(Promise.resolve(5), 50), 5)
  })
  test("rejects with TimeoutError when too slow", async () => {
    await assert.rejects(
      withTimeout(new Promise(() => {}), 10, "slow op"),
      (e: unknown) => e instanceof TimeoutError && /slow op/.test(e.message),
    )
  })
  test("passes rejections through", async () => {
    await assert.rejects(withTimeout(Promise.reject(new Error("x")), 50), /x/)
  })
  test("no timeout for 0/Infinity", async () => {
    const p = sleep(5).then(() => 1)
    assert.equal(await withTimeout(p, 0), 1)
    assert.equal(await withTimeout(Promise.resolve(2), Infinity), 2)
  })
})

describe("Signal", () => {
  test("wait times out with false", async () => {
    assert.equal(await new Signal().wait(5), false)
  })
  test("notify wakes waiters with true", async () => {
    const s = new Signal()
    const a = s.wait(1000)
    const b = s.wait(1000)
    s.notify()
    assert.deepEqual(await Promise.all([a, b]), [true, true])
  })
  test("a notify without waiters is remembered once", async () => {
    const s = new Signal()
    s.notify()
    assert.equal(await s.wait(1000), true)
    assert.equal(await s.wait(5), false)
  })
})
