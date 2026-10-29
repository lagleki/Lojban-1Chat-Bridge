import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import path from "path"
import { ReliabilityManager } from "../src/reliability/manager"
import { ConnectivityMonitor } from "../src/reliability/connectivity"
import { Outbox } from "../src/reliability/outbox"
import { PermanentSendError } from "../src/reliability/errors"
import { getCursor, reportDown, requestProbe } from "../src/reliability/runtime"
import { delay, FAST, FakePeer, tempDir, waitFor } from "./helpers"

const managers: ReliabilityManager[] = []
const temps: Array<{ cleanup: () => void }> = []
afterEach(async () => {
  for (const m of managers.splice(0)) {
    await m.stop()
    m.close()
  }
  for (const t of temps.splice(0)) t.cleanup()
})

function manager(opts: Record<string, unknown> = {}) {
  const m = new ReliabilityManager({
    outbox: { path: ":memory:" },
    connectivity: false,
    supervisor: FAST as any,
    ...opts,
  } as any)
  managers.push(m)
  return m
}

describe("ReliabilityManager", () => {
  test("routes messages to their target's supervisor; targets are isolated", async () => {
    const m = manager()
    const a = new FakePeer("telegram_1")
    const b = new FakePeer("irc_1")
    b.online = false // irc is down: must not hold up telegram
    m.register(a.adapter() as any)
    m.register(b.adapter() as any)
    m.start()
    for (let i = 1; i <= 3; i++) {
      m.enqueue("telegram_1", { n: i })
      m.enqueue("irc_1", { n: i })
    }
    await waitFor(() => a.sent.length === 3)
    assert.equal(b.sent.length, 0)
    assert.equal(m.outbox.pendingCount("irc_1"), 3)
    const st = m.status()
    assert.equal(st.telegram_1.state, "ready")
    assert.equal(st.telegram_1.pending, 0)
    assert.notEqual(st.irc_1.state, "ready")
    assert.equal(st.irc_1.pending, 3)
    b.restore()
    await waitFor(() => b.sent.length === 3, 2000)
    assert.deepEqual(
      b.payloads().map((p) => p.n),
      [1, 2, 3],
    )
  })

  test("register is idempotent and works after start", async () => {
    const m = manager()
    m.start()
    const p = new FakePeer("x")
    const s1 = m.register(p.adapter() as any)
    assert.equal(m.register(p.adapter() as any), s1)
    assert.ok(m.has("x"))
    assert.equal(m.supervisor("x"), s1)
    assert.equal(await m.waitReady("x", 1000), true)
    assert.equal(m.isReady("x"), true)
    assert.equal(await m.waitReady("nope", 10), false)
  })

  test("waitReady times out with false", async () => {
    const m = manager()
    const p = new FakePeer("x")
    p.online = false
    m.register(p.adapter() as any)
    m.start()
    assert.equal(await m.waitReady("x", 30), false)
  })

  test("messages for a pier registered later are kept and delivered", async () => {
    const m = manager()
    m.start()
    m.enqueue("late", { n: 1 })
    await delay(20)
    const p = new FakePeer("late")
    m.register(p.adapter() as any)
    await waitFor(() => p.sent.length === 1)
  })

  test("pier health events (reportDown/requestProbe) reach the right supervisor", async () => {
    const m = manager()
    const p = new FakePeer("discord_1")
    const q = new FakePeer("other")
    m.register(p.adapter() as any)
    m.register(q.adapter() as any)
    m.start()
    await waitFor(() => m.isReady("discord_1") && m.isReady("other"))
    const downs: string[] = []
    m.supervisor("discord_1")!.on("down", (r: string) => downs.push(r))
    reportDown("discord_1", "shardDisconnect 1006")
    assert.deepEqual(downs, ["shardDisconnect 1006"])
    assert.equal(m.isReady("other"), true)
    await waitFor(() => m.isReady("discord_1"))
    p.silentDrop()
    requestProbe("discord_1")
    await waitFor(() => !m.isReady("discord_1"))
    reportDown("unknown_pier", "ignored") // no crash
  })

  test("connectivity monitor fans out offline/online to all supervisors", async () => {
    let up = true
    const monitor = new ConnectivityMonitor({
      intervalMs: 5,
      failuresBeforeOffline: 1,
      check: async () => up,
    })
    const m = manager({
      connectivity: monitor,
      supervisor: {
        ...FAST,
        restartBackoff: { initialMs: 5, maxMs: 5000, jitter: 0 },
      },
    })
    const peers = ["telegram_1", "irc_1", "mattermost_1"].map(
      (n) => new FakePeer(n),
    )
    for (const p of peers) m.register(p.adapter() as any)
    m.start()
    await waitFor(() => peers.every((p) => m.isReady(p.name)))
    // the router dies: every connection drops
    up = false
    for (const p of peers) p.drop()
    await waitFor(() => !monitor.isOnline())
    await waitFor(() => peers.every((p) => !m.isReady(p.name)))
    for (const p of peers)
      for (let i = 1; i <= 3; i++) m.enqueue(p.name, { n: i })
    const starts = peers.map((p) => p.startCalls)
    await delay(100)
    // restarts are paused while offline (bounded by maxMs)
    peers.forEach((p, i) => assert.ok(p.startCalls <= starts[i] + 1))
    up = true
    for (const p of peers) p.restore()
    await waitFor(() => peers.every((p) => p.sent.length === 3), 2000)
    for (const p of peers)
      assert.deepEqual(
        p.payloads().map((x) => x.n),
        [1, 2, 3],
      )
  })

  test("permanent failures are reported (admin notification hook)", async () => {
    const reported: unknown[] = []
    const m = manager({
      supervisor: { ...FAST, maxPermanentAttempts: 1 },
      onPermanentFailure: (row: unknown) => reported.push(row),
    })
    const p = new FakePeer("x")
    p.sendErrors.push(new PermanentSendError("bad chat"))
    m.register(p.adapter() as any)
    m.start()
    m.enqueue("x", { n: 1 })
    m.enqueue("x", { n: 2 })
    await waitFor(() => p.sent.length === 1)
    assert.equal(reported.length, 1)
  })

  test("dedupe keys are honoured through the manager", () => {
    const m = manager()
    assert.ok(m.enqueue("x", 1, "k"))
    assert.equal(m.enqueue("x", 1, "k"), null)
  })

  test("cursors are persisted in the outbox database", () => {
    const m = manager()
    const { setCursor } = require("../src/reliability/runtime")
    setCursor("discord:discord_1:123", "999")
    assert.equal(m.outbox.getCursor("discord:discord_1:123"), "999")
    assert.equal(getCursor("discord:discord_1:123"), "999")
  })

  test("prunes old failed rows on start", () => {
    let t = 0
    const outbox = new Outbox({ path: ":memory:", now: () => t })
    const id = outbox.enqueue("x", 1)!
    outbox.markFailed(id, "x")
    const keep = outbox.enqueue("x", 2)!
    t = 1000
    const m = manager({ outbox, failedRetentionMs: 1 })
    m.start()
    assert.equal(outbox.listFailed().length, 0)
    assert.ok(outbox.get(keep)) // pending rows are never pruned
  })
})

describe("crash / restart replay", () => {
  test("pending messages survive a process restart and are sent in order", async () => {
    const tmp = tempDir()
    temps.push(tmp)
    const file = path.join(tmp.dir, "outbox.sqlite")

    // process #1: peer offline, messages queue up, then the process dies
    const m1 = new ReliabilityManager({
      outbox: { path: file },
      connectivity: false,
      supervisor: FAST as any,
    })
    const p1 = new FakePeer("irc_1")
    p1.online = false
    m1.register(p1.adapter() as any)
    m1.start()
    for (let i = 1; i <= 5; i++) m1.enqueue("irc_1", { n: i })
    // simulate a crash mid-send of #1: it was claimed but never confirmed
    const head = m1.outbox.head("irc_1")!
    m1.outbox.markInflight(head.id)
    await m1.stop()
    m1.outbox.db.close() // no graceful drain

    // process #2: same database, the network is back
    const logs: string[] = []
    const m2 = new ReliabilityManager({
      outbox: { path: file },
      connectivity: false,
      supervisor: FAST as any,
      log: (_l, msg) => logs.push(msg),
    })
    managers.push(m2)
    assert.ok(logs.some((l) => /1 message\(s\) were in flight/.test(l)))
    const p2 = new FakePeer("irc_1")
    m2.register(p2.adapter() as any)
    m2.start()
    await waitFor(() => p2.sent.length === 5)
    assert.deepEqual(
      p2.payloads().map((p) => p.n),
      [1, 2, 3, 4, 5],
    )
    assert.equal(p2.sent[0].ctx.attempt, 2) // the interrupted attempt counted
    assert.equal(m2.outbox.pendingCount(), 0)
  })

  test("delivered messages are not re-sent after a restart (idempotent replay)", async () => {
    const tmp = tempDir()
    temps.push(tmp)
    const file = path.join(tmp.dir, "outbox.sqlite")
    const m1 = new ReliabilityManager({
      outbox: { path: file },
      connectivity: false,
      supervisor: FAST as any,
    })
    const p1 = new FakePeer("t")
    m1.register(p1.adapter() as any)
    m1.start()
    m1.enqueue("t", { n: 1 })
    m1.enqueue("t", { n: 2 })
    await waitFor(() => p1.sent.length === 2)
    await m1.stop()
    m1.close()

    const m2 = new ReliabilityManager({
      outbox: { path: file },
      connectivity: false,
      supervisor: FAST as any,
    })
    managers.push(m2)
    const p2 = new FakePeer("t")
    m2.register(p2.adapter() as any)
    m2.start()
    m2.enqueue("t", { n: 3 })
    await waitFor(() => p2.sent.length === 1)
    await delay(20)
    assert.deepEqual(
      p2.payloads().map((p) => p.n),
      [3],
    )
    // the delivery key is stable across restarts (same db instance id)
    assert.equal(
      p2.sent[0].ctx.deliveryKey.split(":")[0],
      p1.sent[0].ctx.deliveryKey.split(":")[0],
    )
  })
})
