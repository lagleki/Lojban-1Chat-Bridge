import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import { Outbox } from "../src/reliability/outbox"
import { PeerSupervisor } from "../src/reliability/supervisor"
import { PermanentSendError } from "../src/reliability/errors"
import { delay, FAST, FakePeer, netError, waitFor } from "./helpers"

const running: PeerSupervisor[] = []
afterEach(async () => {
  await Promise.all(running.splice(0).map((s) => s.stop()))
})

function setup(
  peer: FakePeer,
  opts: Record<string, unknown> = {},
  adapterExtra: Record<string, unknown> = {},
) {
  const outbox = new Outbox({ path: ":memory:" })
  const sup = new PeerSupervisor(peer.adapter(adapterExtra) as any, outbox, {
    ...FAST,
    ...opts,
  } as any)
  const states: string[] = []
  sup.on("state", (s: string, why: string) => states.push(`${s}:${why}`))
  running.push(sup)
  const enqueue = (...ns: number[]) => {
    for (const n of ns) outbox.enqueue(peer.name, { n })
    sup.wake()
  }
  const sentNs = () => peer.payloads().map((p) => p.n)
  return { outbox, sup, states, enqueue, sentNs }
}

describe("PeerSupervisor: readiness gating", () => {
  test("nothing is sent before the peer is ready; then the backlog drains in order", async () => {
    const peer = new FakePeer("p")
    peer.startDelayMs = 30
    peer.readyDelayMs = 40
    const { sup, enqueue, sentNs, outbox } = setup(peer)
    enqueue(1, 2, 3) // queued before the pier even started
    sup.start()
    await delay(50)
    assert.equal(peer.attempts.length, 0)
    assert.equal(sup.state, "connecting")
    await waitFor(() => sentNs().length === 3)
    assert.deepEqual(sentNs(), [1, 2, 3])
    assert.equal(outbox.pendingCount(), 0)
    assert.ok(peer.startCalls === 1)
  })

  test("a peer that never becomes ready after start is restarted, not used", async () => {
    const peer = new FakePeer("p")
    peer.readyDelayMs = 10_000 // longer than readyTimeoutMs
    const { sup, enqueue, sentNs } = setup(peer, { readyTimeoutMs: 30 })
    enqueue(1)
    sup.start()
    await waitFor(() => peer.startCalls >= 2)
    assert.equal(peer.attempts.length, 0)
    peer.readyDelayMs = 0
    await waitFor(() => sentNs().length === 1)
    assert.ok(peer.stopCalls >= 1) // restarts tear the old connection down
  })

  test("the readiness probe must pass before flushing", async () => {
    const peer = new FakePeer("p")
    peer.probeFails = true
    const { sup, enqueue, sentNs } = setup(peer)
    enqueue(1)
    sup.start()
    await waitFor(() => peer.startCalls >= 2)
    assert.equal(peer.attempts.length, 0)
    peer.probeFails = false
    await waitFor(() => sentNs().length === 1)
  })

  test("start() that hangs is timed out and retried", async () => {
    const peer = new FakePeer("p")
    peer.startHangs = true
    const { sup, enqueue, sentNs } = setup(peer, { startTimeoutMs: 20 })
    enqueue(1)
    sup.start()
    await waitFor(() => peer.startCalls >= 2)
    peer.startHangs = false
    await waitFor(() => sentNs().length === 1)
  })

  test("onReady runs on every (re)connect (inbound catch-up hook)", async () => {
    const peer = new FakePeer("p")
    const { sup } = setup(peer)
    sup.start()
    await waitFor(() => peer.onReadyCalls === 1)
    peer.drop()
    sup.reportDown("socket closed")
    peer.restore()
    await waitFor(() => peer.onReadyCalls === 2)
  })

  test("a failing onReady does not block delivery", async () => {
    const peer = new FakePeer("p")
    const { sup, enqueue, sentNs } = setup(
      peer,
      {},
      { onReady: async () => Promise.reject(new Error("catch-up failed")) },
    )
    enqueue(1)
    sup.start()
    await waitFor(() => sentNs().length === 1)
  })
})

describe("PeerSupervisor: delivery", () => {
  test("strict FIFO, one at a time, removed only after confirmation", async () => {
    const peer = new FakePeer("p")
    let release: () => void = () => {}
    let inFlight = 0
    let maxInFlight = 0
    const { sup, enqueue, outbox } = setup(
      peer,
      {},
      {
        send: async (payload: any, ctx: any) => {
          inFlight++
          maxInFlight = Math.max(maxInFlight, inFlight)
          if (payload.n === 1) await new Promise<void>((r) => (release = r))
          inFlight--
          peer.sent.push({ payload, ctx, at: Date.now() })
        },
      },
    )
    enqueue(1, 2, 3)
    sup.start()
    await waitFor(() => inFlight === 1)
    await delay(20)
    // #1 not confirmed yet: still stored, others wait behind it
    assert.equal(outbox.pendingCount(), 3)
    assert.equal(peer.sent.length, 0)
    release()
    await waitFor(() => peer.sent.length === 3)
    assert.deepEqual(
      peer.sent.map((s) => s.payload.n),
      [1, 2, 3],
    )
    assert.equal(maxInFlight, 1)
    assert.equal(outbox.pendingCount(), 0)
  })

  test("transient errors are retried with backoff; order and keys are kept", async () => {
    const peer = new FakePeer("p")
    peer.sendErrors.push(netError("ECONNRESET"), netError("ETIMEDOUT"))
    const { sup, enqueue, sentNs, outbox } = setup(peer)
    const retries: number[] = []
    sup.on("retry", (_row: unknown, _err: unknown, ms: number) =>
      retries.push(ms),
    )
    enqueue(1, 2)
    sup.start()
    await waitFor(() => sentNs().length === 2)
    assert.deepEqual(sentNs(), [1, 2])
    assert.deepEqual(retries, [5, 10]) // exponential (jitter 0 in tests)
    const tries1 = peer.attempts.filter((a) => a.payload.n === 1)
    assert.deepEqual(
      tries1.map((a) => a.ctx.attempt),
      [1, 2, 3],
    )
    assert.equal(new Set(tries1.map((a) => a.ctx.deliveryKey)).size, 1)
    assert.match(
      tries1[0].ctx.deliveryKey,
      new RegExp(`^${outbox.instanceId}:`),
    )
    assert.equal(typeof tries1[0].ctx.enqueuedAt, "number")
  })

  test("server-requested retry delay (429 retry_after) is honoured", async () => {
    const peer = new FakePeer("p")
    peer.sendErrors.push(
      Object.assign(new Error("Too Many Requests"), {
        response: {
          statusCode: 429,
          body: { parameters: { retry_after: 0.1 } },
        },
      }),
    )
    const { sup, enqueue, sentNs } = setup(peer)
    enqueue(1)
    sup.start()
    await waitFor(() => peer.attempts.length === 1)
    const t0 = Date.now()
    await waitFor(() => sentNs().length === 1)
    assert.ok(Date.now() - t0 >= 90, `retried after ${Date.now() - t0}ms`)
  })

  test("permanent rejection: retried maxPermanentAttempts times, then set aside", async () => {
    const peer = new FakePeer("p")
    peer.sendErrors.push(
      new PermanentSendError("chat not found"),
      new PermanentSendError("chat not found"),
      new PermanentSendError("chat not found"),
    )
    const { sup, enqueue, sentNs, outbox } = setup(peer, {
      maxPermanentAttempts: 3,
    })
    const failed: unknown[] = []
    sup.on("failed", (row: unknown) => failed.push(row))
    enqueue(1, 2)
    sup.start()
    await waitFor(() => sentNs().length === 1)
    assert.deepEqual(sentNs(), [2]) // the queue is not blocked forever
    assert.equal(failed.length, 1)
    const rows = outbox.listFailed()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].attempts, 3)
    assert.match(rows[0].lastError!, /chat not found/)
  })

  test("pier-specific classification wins over the default", async () => {
    const peer = new FakePeer("p")
    peer.sendErrors.push({ weird: true })
    const { sup, enqueue, sentNs, outbox } = setup(
      peer,
      { maxPermanentAttempts: 1 },
      { classifyError: () => ({ kind: "permanent", reason: "custom" }) },
    )
    enqueue(1, 2)
    sup.start()
    await waitFor(() => sentNs().length === 1)
    assert.equal(outbox.listFailed().length, 1)
  })

  test("a send that hangs times out and is retried", async () => {
    const peer = new FakePeer("p")
    peer.sendHangs = true
    const { sup, enqueue, sentNs } = setup(peer, { sendTimeoutMs: 20 })
    enqueue(1)
    sup.start()
    await waitFor(() => peer.attempts.length >= 1)
    await delay(30)
    peer.sendHangs = false
    await waitFor(() => sentNs().length === 1)
    assert.ok(peer.attempts.length >= 2)
  })

  test("per-adapter send timeout overrides the default", async () => {
    const peer = new FakePeer("p")
    let calls = 0
    const { sup, enqueue } = setup(
      peer,
      { sendTimeoutMs: 10 },
      {
        sendTimeoutMs: 1000,
        send: async () => {
          calls++
          await delay(50)
        },
      },
    )
    enqueue(1)
    sup.start()
    await delay(120)
    assert.equal(calls, 1) // took 50ms > 10ms default, but no timeout
  })
})

describe("PeerSupervisor: connection health", () => {
  test("NotReady on send marks the peer down, reconnects and replays", async () => {
    const peer = new FakePeer("p")
    const { sup, enqueue, sentNs, states } = setup(peer)
    sup.start()
    await waitFor(() => sup.isReady())
    peer.connected = false // library lost the socket, no event emitted
    enqueue(1, 2)
    await waitFor(() => sentNs().length === 2)
    assert.deepEqual(sentNs(), [1, 2])
    assert.ok(states.some((s) => s.startsWith("down:")))
    assert.ok(peer.startCalls >= 2)
  })

  test("dead socket detected by isReady() going false", async () => {
    const peer = new FakePeer("p")
    const { sup, states } = setup(peer, { idleTickMs: 5 })
    sup.start()
    await waitFor(() => sup.isReady())
    peer.connected = false
    await waitFor(() => states.some((s) => s === "down:pier reports not ready"))
  })

  test("native error event (reportDown) takes the peer down", async () => {
    const peer = new FakePeer("p")
    const { sup } = setup(peer)
    const downs: string[] = []
    sup.on("down", (r: string) => downs.push(r))
    sup.start()
    await waitFor(() => sup.isReady())
    sup.reportDown("ECONNRESET on socket")
    assert.equal(sup.state, "down")
    assert.deepEqual(downs, ["ECONNRESET on socket"])
    await waitFor(() => sup.isReady()) // and comes back
    sup.reportDown("ignored while not ready") // no-op unless ready
  })

  test("silent drop (ping timeout) is caught by the periodic probe", async () => {
    const peer = new FakePeer("p")
    const { sup, enqueue, sentNs } = setup(peer, {
      probeIntervalMs: 10,
      probeFailuresBeforeDown: 2,
    })
    sup.start()
    await waitFor(() => sup.isReady())
    peer.silentDrop() // isReady() still says true
    await waitFor(() => sup.state !== "ready")
    assert.ok(peer.probeCalls >= 2)
    enqueue(1, 2, 3) // relayed while offline: kept
    await delay(30)
    assert.equal(sentNs().length, 0)
    peer.restore()
    await waitFor(() => sentNs().length === 3)
    assert.deepEqual(sentNs(), [1, 2, 3])
  })

  test("a single probe failure is tolerated (no flapping)", async () => {
    const peer = new FakePeer("p")
    const { sup } = setup(peer, {
      probeIntervalMs: 5,
      probeFailuresBeforeDown: 2,
    })
    sup.start()
    await waitFor(() => sup.isReady())
    const probes = peer.probeCalls
    peer.probeFails = true
    await waitFor(() => peer.probeCalls === probes + 1)
    peer.probeFails = false
    await delay(40)
    assert.equal(sup.state, "ready")
  })

  test("requestProbe forces an immediate check; one failure is enough", async () => {
    const peer = new FakePeer("p")
    const { sup } = setup(peer, { probeIntervalMs: 60_000 })
    sup.start()
    await waitFor(() => sup.isReady())
    peer.silentDrop()
    sup.requestProbe()
    await waitFor(() => sup.state !== "ready", 500)
  })

  test("a failed send on a silently dead link is verified by a probe", async () => {
    const peer = new FakePeer("p")
    const { sup, enqueue, sentNs } = setup(peer, { probeIntervalMs: 60_000 })
    sup.start()
    await waitFor(() => sup.isReady())
    peer.silentDrop()
    enqueue(1)
    await waitFor(() => sup.state !== "ready", 500)
    peer.restore()
    await waitFor(() => sentNs().length === 1)
  })
})

describe("PeerSupervisor: reconnect", () => {
  test("reconnects with exponential backoff and never gives up", async () => {
    const peer = new FakePeer("p")
    peer.online = false
    const { sup } = setup(peer, {
      restartBackoff: { initialMs: 4, maxMs: 32, factor: 2, jitter: 0 },
    })
    sup.start()
    await waitFor(() => peer.startCalls >= 7, 3000)
    const gaps = peer.startTimes.slice(1).map((t, i) => t - peer.startTimes[i])
    // 4, 8, 16, 32, 32, 32 (timers may fire a bit late, never early)
    const expected = [4, 8, 16, 32, 32, 32]
    gaps
      .slice(0, 6)
      .forEach((g, i) => assert.ok(g >= expected[i] - 1, `gap ${i}: ${g}`))
    peer.restore()
    await waitFor(() => sup.isReady())
  })

  test("restart delays are jittered", async () => {
    const delays: number[] = []
    const rnd = [0, 0.5, 1]
    let i = 0
    const peer = new FakePeer("p")
    peer.online = false
    const outbox = new Outbox({ path: ":memory:" })
    const logs: string[] = []
    const sup = new PeerSupervisor(
      peer.adapter() as any,
      outbox,
      {
        ...FAST,
        restartBackoff: { initialMs: 20, maxMs: 20, factor: 2, jitter: 0.5 },
      } as any,
      (_lvl, msg) => logs.push(msg),
      Date.now,
      () => rnd[i++ % rnd.length],
    )
    running.push(sup)
    sup.start()
    await waitFor(() => peer.startCalls >= 4)
    for (const m of logs) {
      const r = /reconnecting in (\d+)ms/.exec(m)
      if (r) delays.push(Number(r[1]))
    }
    assert.deepEqual(delays.slice(0, 3), [20, 15, 10])
  })

  test("while the host is offline, restarts pause; coming online reconnects at once", async () => {
    const peer = new FakePeer("p")
    const { sup, enqueue, sentNs } = setup(peer, {
      restartBackoff: { initialMs: 5, maxMs: 2000, factor: 2, jitter: 0 },
    })
    sup.start()
    await waitFor(() => sup.isReady())
    peer.drop()
    sup.setNetworkOnline(false)
    sup.reportDown("socket closed")
    await waitFor(() => peer.startCalls >= 2) // one attempt
    const n = peer.startCalls
    await delay(100)
    assert.equal(peer.startCalls, n) // no hammering while offline
    enqueue(1, 2)
    peer.restore()
    const t0 = Date.now()
    sup.setNetworkOnline(true)
    await waitFor(() => sentNs().length === 2)
    assert.ok(Date.now() - t0 < 500, "reconnected without waiting for backoff")
    assert.deepEqual(sentNs(), [1, 2])
  })

  test("offline gating is bounded (connectivity check could be wrong)", async () => {
    const peer = new FakePeer("p")
    const { sup, sentNs, enqueue } = setup(peer, {
      restartBackoff: { initialMs: 5, maxMs: 30, factor: 2, jitter: 0 },
    })
    sup.setNetworkOnline(false) // monitor wrongly thinks we're offline
    enqueue(1)
    sup.start()
    await waitFor(() => sentNs().length === 1) // first start is not gated
    peer.drop()
    sup.reportDown("closed")
    peer.restore()
    await waitFor(() => sup.isReady(), 1000) // retried after <= maxMs anyway
  })

  test("native recovery: the library reconnects by itself, no restart", async () => {
    const peer = new FakePeer("p")
    peer.nativeRecoveryMs = 500
    const { sup, states, enqueue, sentNs } = setup(peer)
    sup.start()
    await waitFor(() => sup.isReady())
    peer.connected = false
    sup.reportDown("gateway closed")
    enqueue(1)
    setTimeout(() => (peer.connected = true), 20) // library resumes
    await waitFor(() => sentNs().length === 1)
    assert.equal(peer.startCalls, 1)
    assert.equal(peer.stopCalls, 0)
    assert.ok(states.includes("ready:native reconnect"))
  })

  test("native recovery that does not happen in time leads to a restart", async () => {
    const peer = new FakePeer("p")
    peer.nativeRecoveryMs = 30
    const { sup, states } = setup(peer)
    sup.start()
    await waitFor(() => sup.isReady())
    peer.connected = false
    sup.reportDown("gateway closed")
    await waitFor(() => peer.startCalls === 2)
    await waitFor(() => sup.isReady())
    assert.ok(states.includes("connecting:waiting for native reconnect"))
    assert.ok(states.includes("ready:restarted"))
    assert.equal(peer.stopCalls, 1)
  })

  test("stop() ends supervision and stops the pier", async () => {
    const peer = new FakePeer("p")
    const { sup, enqueue } = setup(peer)
    sup.start()
    await waitFor(() => sup.isReady())
    await sup.stop()
    assert.equal(sup.state, "stopped")
    assert.equal(peer.stopCalls, 1)
    enqueue(1)
    await delay(20)
    assert.equal(peer.attempts.length, 0)
  })

  test("rows that failed before a reconnect are retried right after it", async () => {
    const peer = new FakePeer("p")
    const { sup, enqueue, sentNs, outbox } = setup(peer, {
      sendBackoff: { initialMs: 60_000, maxMs: 60_000, jitter: 0 },
    })
    sup.start()
    await waitFor(() => sup.isReady())
    peer.silentDrop()
    enqueue(1) // fails, scheduled for +60s, peer goes down after probe
    await waitFor(() => sup.state !== "ready")
    assert.ok(outbox.head(peer.name)!.nextAttemptAt > Date.now() + 30_000)
    peer.restore()
    await waitFor(() => sentNs().length === 1, 1000)
  })
})
