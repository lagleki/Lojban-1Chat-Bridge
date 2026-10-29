import { afterEach, beforeEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import path from "path"
import { Outbox } from "../src/reliability/outbox"
import { tempDir } from "./helpers"

function clock(start = 1_000_000) {
  const c = { t: start, now: () => c.t }
  return c
}

describe("Outbox", () => {
  let tmp: ReturnType<typeof tempDir>
  beforeEach(() => {
    tmp = tempDir()
  })
  afterEach(() => tmp.cleanup())

  test("enqueue stores payloads and keeps per-target FIFO order", () => {
    const ob = new Outbox({ path: ":memory:" })
    const a1 = ob.enqueue("a", { n: 1 })!
    const b1 = ob.enqueue("b", { n: 1 })!
    const a2 = ob.enqueue("a", { n: 2 })!
    ob.enqueue("a", { n: 3 })
    assert.ok(a1 < b1 && b1 < a2)
    assert.deepEqual(
      ob.list<{ n: number }>("a").map((r) => r.payload.n),
      [1, 2, 3],
    )
    assert.deepEqual(ob.head("a")!.payload, { n: 1 })
    assert.deepEqual(ob.head("b")!.payload, { n: 1 })
    assert.equal(ob.head("c"), undefined)
    assert.equal(ob.pendingCount(), 4)
    assert.equal(ob.pendingCount("a"), 3)
    assert.deepEqual(ob.targetsWithPending(), ["a", "b"])
    ob.close()
  })

  test("delivering pops the head; targets are independent", () => {
    const ob = new Outbox({ path: ":memory:" })
    for (let i = 1; i <= 3; i++) ob.enqueue("a", i)
    ob.enqueue("b", "x")
    const seen: number[] = []
    for (let row = ob.head<number>("a"); row; row = ob.head<number>("a")) {
      assert.ok(ob.markInflight(row.id))
      seen.push(row.payload)
      ob.markDelivered(row.id)
    }
    assert.deepEqual(seen, [1, 2, 3])
    assert.equal(ob.pendingCount("a"), 0)
    assert.equal(ob.pendingCount("b"), 1)
    ob.close()
  })

  test("markInflight claims a row once and counts attempts", () => {
    const ob = new Outbox({ path: ":memory:" })
    const id = ob.enqueue("a", 1)!
    assert.equal(ob.markInflight(id), true)
    assert.equal(ob.markInflight(id), false) // already in flight
    assert.equal(ob.get(id)!.status, "inflight")
    assert.equal(ob.get(id)!.attempts, 1)
    // inflight rows are not the head and still count as pending work
    assert.equal(ob.head("a"), undefined)
    assert.equal(ob.pendingCount("a"), 1)
    ob.close()
  })

  test("markRetry puts the row back at the head with a retry time", () => {
    const c = clock()
    const ob = new Outbox({ path: ":memory:", now: c.now })
    const id1 = ob.enqueue("a", 1)!
    ob.enqueue("a", 2)
    ob.markInflight(id1)
    c.t += 10
    ob.markRetry(id1, "ECONNRESET", c.t + 500)
    const head = ob.head("a")!
    assert.equal(head.id, id1) // order kept: still first
    assert.equal(head.status, "pending")
    assert.equal(head.lastError, "ECONNRESET")
    assert.equal(head.nextAttemptAt, c.t + 500)
    assert.equal(head.updatedAt, c.t)
    ob.markInflight(id1)
    assert.equal(ob.get(id1)!.attempts, 2)
    ob.close()
  })

  test("markFailed keeps the row aside; requeueFailed brings it back", () => {
    const ob = new Outbox({ path: ":memory:" })
    const id = ob.enqueue("a", 1)!
    ob.enqueue("a", 2)
    ob.markInflight(id)
    ob.markFailed(id, "403 forbidden")
    assert.equal(ob.head<number>("a")!.payload, 2) // queue moves on
    assert.equal(ob.listFailed().length, 1)
    assert.equal(ob.listFailed()[0].lastError, "403 forbidden")
    assert.deepEqual(ob.stats(), { failed: 1, pending: 1 })
    assert.equal(ob.requeueFailed("other"), 0)
    assert.equal(ob.requeueFailed("a"), 1)
    const row = ob.get(id)!
    assert.equal(row.status, "pending")
    assert.equal(row.attempts, 0)
    assert.equal(ob.head("a")!.id, id) // back in original position
    ob.close()
  })

  test("keepDelivered keeps rows as delivered until pruned", () => {
    const c = clock()
    const ob = new Outbox({ path: ":memory:", keepDelivered: true, now: c.now })
    const id = ob.enqueue("a", 1)!
    ob.markInflight(id)
    ob.markDelivered(id)
    assert.equal(ob.get(id)!.status, "delivered")
    assert.equal(ob.pendingCount(), 0)
    assert.equal(ob.prune({ deliveredOlderThanMs: 1000 }), 0)
    c.t += 2000
    assert.equal(ob.prune({ deliveredOlderThanMs: 1000 }), 1)
    assert.equal(ob.get(id), undefined)
    ob.close()
  })

  test("prune removes old failed rows but never pending/inflight ones", () => {
    const c = clock()
    const ob = new Outbox({ path: ":memory:", now: c.now })
    const failed = ob.enqueue("a", "f")!
    ob.markInflight(failed)
    ob.markFailed(failed, "x")
    const pending = ob.enqueue("a", "p")!
    const inflight = ob.enqueue("b", "i")!
    ob.markInflight(inflight)
    c.t += 10 * 24 * 3600 * 1000
    assert.equal(ob.prune({ failedOlderThanMs: 30 * 24 * 3600 * 1000 }), 0)
    c.t += 30 * 24 * 3600 * 1000
    assert.equal(ob.prune({ failedOlderThanMs: 30 * 24 * 3600 * 1000 }), 1)
    assert.equal(ob.get(failed), undefined)
    assert.ok(ob.get(pending))
    assert.ok(ob.get(inflight))
    // no failed retention given: failed rows stay
    const f2 = ob.enqueue("a", "f2")!
    ob.markFailed(f2, "x")
    c.t += 1e12
    assert.equal(ob.prune({}), 0)
    ob.close()
  })

  test("dedupe key makes enqueue idempotent per target", () => {
    const ob = new Outbox({ path: ":memory:" })
    const id = ob.enqueue("a", 1, "msg-1")
    assert.ok(id)
    assert.equal(ob.enqueue("a", 1, "msg-1"), null)
    assert.ok(ob.enqueue("b", 1, "msg-1")) // other target: separate row
    assert.ok(ob.enqueue("a", 2)) // no key: never deduplicated
    assert.ok(ob.enqueue("a", 2))
    assert.equal(ob.pendingCount("a"), 3)
    ob.close()
  })

  test("enqueueMany is atomic", () => {
    const ob = new Outbox({ path: ":memory:" })
    const ids = ob.enqueueMany([
      { target: "a", payload: 1 },
      { target: "b", payload: 2, dedupeKey: "k" },
      { target: "b", payload: 3, dedupeKey: "k" },
    ])
    assert.equal(ids.length, 3)
    assert.equal(ids[2], null)
    assert.equal(ob.pendingCount(), 2)
    const bad = {
      toJSON() {
        throw new Error("boom")
      },
    }
    assert.throws(() =>
      ob.enqueueMany([
        { target: "c", payload: 1 },
        { target: "c", payload: bad },
      ]),
    )
    assert.equal(ob.pendingCount("c"), 0) // rolled back
    ob.close()
  })

  test("survives a crash: pending and inflight rows are replayed in order", () => {
    const file = path.join(tmp.dir, "sub", "outbox.sqlite")
    const ob1 = new Outbox({ path: file })
    const instance = ob1.instanceId
    const ids = [1, 2, 3].map((n) => ob1.enqueue("irc_1", { n })!)
    ob1.enqueue("telegram_1", { n: 9 })
    ob1.markInflight(ids[0]) // crash while sending #1
    ob1.setCursor("discord:x", "123")
    // simulate a hard crash: no orderly shutdown of the queue
    ob1.db.close()

    assert.ok(fs.existsSync(file))
    const ob2 = new Outbox({ path: file })
    assert.equal(ob2.instanceId, instance) // idempotency keys stay stable
    assert.equal(ob2.head("irc_1")!.id, ids[1]) // #1 still marked inflight
    assert.equal(ob2.recoverInflight(), 1)
    assert.deepEqual(
      ob2.list<{ n: number }>("irc_1").map((r) => r.payload.n),
      [1, 2, 3],
    )
    const head = ob2.head("irc_1")!
    assert.equal(head.id, ids[0])
    assert.equal(head.attempts, 1) // the interrupted attempt is remembered
    assert.equal(ob2.pendingCount(), 4)
    assert.equal(ob2.getCursor("discord:x"), "123")
    ob2.close()
  })

  test("uses WAL and the configured synchronous level for files", () => {
    const file = path.join(tmp.dir, "o.sqlite")
    const ob = new Outbox({ path: file, synchronous: "NORMAL" })
    assert.equal(ob.db.pragma("journal_mode", { simple: true }), "wal")
    assert.equal(ob.db.pragma("synchronous", { simple: true }), 1)
    ob.close()
    const ob2 = new Outbox({ path: file })
    assert.equal(ob2.db.pragma("synchronous", { simple: true }), 2) // FULL
    ob2.close()
    ob2.close() // idempotent
  })

  test("cursors are upserted", () => {
    const ob = new Outbox({ path: ":memory:" })
    assert.equal(ob.getCursor("k"), undefined)
    ob.setCursor("k", "1")
    ob.setCursor("k", "2")
    assert.equal(ob.getCursor("k"), "2")
    ob.close()
  })

  test("payloads round-trip through JSON", () => {
    const ob = new Outbox({ path: ":memory:" })
    const payload = {
      channelId: "#lojban",
      author: "la .alis.",
      chunk: { main: "<b>coi</b>", fallback_solution: "coi" },
      edited: false,
      file: undefined,
    }
    const id = ob.enqueue("irc_1", payload)!
    assert.deepEqual(ob.get(id)!.payload, {
      channelId: "#lojban",
      author: "la .alis.",
      chunk: { main: "<b>coi</b>", fallback_solution: "coi" },
      edited: false,
    })
    ob.enqueue("x", undefined)
    assert.equal(ob.head("x")!.payload, null)
    ob.close()
  })
})
