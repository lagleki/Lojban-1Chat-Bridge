import { describe, test } from "node:test"
import assert from "node:assert/strict"
import net from "net"
import { ConnectivityMonitor, tcpCheck } from "../src/reliability/connectivity"
import { waitFor } from "./helpers"

describe("ConnectivityMonitor", () => {
  test("goes offline only after N consecutive failures, online at once", () => {
    const m = new ConnectivityMonitor({ failuresBeforeOffline: 2 })
    const events: string[] = []
    m.on("offline", () => events.push("offline"))
    m.on("online", () => events.push("online"))
    m.record(false)
    assert.equal(m.isOnline(), true)
    m.record(true)
    m.record(false)
    assert.equal(m.isOnline(), true) // counter was reset by the success
    m.record(false)
    assert.equal(m.isOnline(), false)
    assert.ok(m.offlineForMs() >= 0)
    m.record(false) // no duplicate event
    m.record(true)
    assert.equal(m.isOnline(), true)
    assert.equal(m.offlineForMs(), 0)
    assert.deepEqual(events, ["offline", "online"])
  })

  test("online event reports the outage duration", () => {
    const m = new ConnectivityMonitor({ failuresBeforeOffline: 1 })
    let down = -1
    m.on("online", (ms: number) => (down = ms))
    m.record(false)
    m.record(true)
    assert.ok(down >= 0)
  })

  test("checkNow uses the custom check; errors count as offline", async () => {
    let calls = 0
    let mode: "ok" | "fail" | "throw" = "ok"
    const m = new ConnectivityMonitor({
      failuresBeforeOffline: 1,
      check: async () => {
        calls++
        if (mode === "throw") throw new Error("dns")
        return mode === "ok"
      },
    })
    assert.equal(await m.checkNow(), true)
    mode = "throw"
    assert.equal(await m.checkNow(), false)
    assert.equal(m.isOnline(), false)
    mode = "ok"
    // concurrent callers share one round
    const [a, b] = await Promise.all([m.checkNow(), m.checkNow()])
    assert.equal(a && b, true)
    assert.equal(calls, 3)
  })

  test("start/stop runs periodic checks", async () => {
    let calls = 0
    const m = new ConnectivityMonitor({
      intervalMs: 5,
      check: async () => (calls++, true),
    })
    m.start()
    m.start() // idempotent
    await waitFor(() => calls >= 3)
    m.stop()
    const n = calls
    await new Promise((r) => setTimeout(r, 30))
    assert.ok(calls <= n + 1)
  })

  test("no targets means always online", async () => {
    const m = new ConnectivityMonitor({ targets: [] })
    assert.equal(await m.checkNow(), true)
  })
})

describe("tcpCheck", () => {
  test("true for a listening port, false for a closed one", async () => {
    const server = net.createServer((s) => s.end())
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r))
    const port = (server.address() as net.AddressInfo).port
    assert.equal(await tcpCheck(`127.0.0.1:${port}`, 1000), true)
    await new Promise<void>((r) => server.close(() => r()))
    assert.equal(await tcpCheck(`127.0.0.1:${port}`, 1000), false)
  })

  test("false when the name does not resolve", async () => {
    assert.equal(await tcpCheck("does-not-exist.invalid:443", 2000), false)
  })
})
