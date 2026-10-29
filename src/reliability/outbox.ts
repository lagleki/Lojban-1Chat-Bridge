import crypto from "crypto"
import fs from "fs"
import path from "path"
import Database from "better-sqlite3"

/**
 * Persistent per-target outbox backed by SQLite.
 *
 * Every outgoing relay message is stored here (one row per target pier)
 * before the bridge tries to deliver it. A row is removed only after the
 * target confirmed the send, so under normal connectivity the table stays
 * (almost) empty. Rows survive crashes/restarts and are replayed in order.
 *
 * Row life cycle:  pending -> inflight -> (deleted)            on success
 *                  pending -> inflight -> pending (retry later) on transient error
 *                  pending -> inflight -> failed                on permanent error
 * Rows left `inflight` by a crash are put back to `pending` on open
 * (at-least-once delivery: such a message may be sent twice).
 */
export type OutboxStatus = "pending" | "inflight" | "failed" | "delivered"

export interface OutboxRow<P = unknown> {
  id: number
  target: string
  payload: P
  status: OutboxStatus
  attempts: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  nextAttemptAt: number
  dedupeKey: string | null
}

export interface OutboxOptions {
  /** Path of the SQLite file, or ":memory:". */
  path: string
  /**
   * SQLite `synchronous` pragma. FULL (default) survives power loss,
   * NORMAL is faster and still survives process crashes.
   */
  synchronous?: "FULL" | "NORMAL"
  /** Keep delivered rows (status=delivered) instead of deleting them. */
  keepDelivered?: boolean
  /** Clock, for tests. */
  now?: () => number
}

interface RawRow {
  id: number
  target: string
  payload: string
  status: OutboxStatus
  attempts: number
  last_error: string | null
  created_at: number
  updated_at: number
  next_attempt_at: number
  dedupe_key: string | null
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS outbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  target          TEXT    NOT NULL,
  payload         TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending',
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  dedupe_key      TEXT
);
CREATE INDEX IF NOT EXISTS outbox_target_status_id ON outbox (target, status, id);
CREATE UNIQUE INDEX IF NOT EXISTS outbox_target_dedupe
  ON outbox (target, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS kv (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`

function toRow<P>(r: RawRow): OutboxRow<P> {
  return {
    id: r.id,
    target: r.target,
    payload: JSON.parse(r.payload) as P,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    nextAttemptAt: r.next_attempt_at,
    dedupeKey: r.dedupe_key,
  }
}

export class Outbox {
  readonly db: Database.Database
  private readonly now: () => number
  private readonly keepDelivered: boolean
  private readonly stmts: Record<string, Database.Statement>
  /** Random per-database id; lets piers derive collision-free idempotency keys. */
  readonly instanceId: string

  constructor(options: OutboxOptions) {
    this.now = options.now ?? Date.now
    this.keepDelivered = !!options.keepDelivered
    if (options.path !== ":memory:")
      fs.mkdirSync(path.dirname(path.resolve(options.path)), {
        recursive: true,
      })
    this.db = new Database(options.path)
    if (options.path !== ":memory:") this.db.pragma("journal_mode = WAL")
    this.db.pragma(`synchronous = ${options.synchronous ?? "FULL"}`)
    this.db.pragma("busy_timeout = 5000")
    this.db.exec(SCHEMA)

    const db = this.db
    this.stmts = {
      insert: db.prepare(
        `INSERT OR IGNORE INTO outbox (target, payload, status, attempts, created_at, updated_at, next_attempt_at, dedupe_key)
         VALUES (@target, @payload, 'pending', 0, @now, @now, 0, @dedupeKey)`,
      ),
      head: db.prepare(
        `SELECT * FROM outbox WHERE target = ? AND status = 'pending' ORDER BY id LIMIT 1`,
      ),
      get: db.prepare(`SELECT * FROM outbox WHERE id = ?`),
      inflight: db.prepare(
        `UPDATE outbox SET status = 'inflight', attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = 'pending'`,
      ),
      deleteRow: db.prepare(`DELETE FROM outbox WHERE id = ?`),
      delivered: db.prepare(
        `UPDATE outbox SET status = 'delivered', last_error = NULL, updated_at = ? WHERE id = ?`,
      ),
      retry: db.prepare(
        `UPDATE outbox SET status = 'pending', last_error = ?, next_attempt_at = ?, updated_at = ? WHERE id = ?`,
      ),
      failed: db.prepare(
        `UPDATE outbox SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`,
      ),
      recover: db.prepare(
        `UPDATE outbox SET status = 'pending', updated_at = ? WHERE status = 'inflight'`,
      ),
      countAll: db.prepare(
        `SELECT COUNT(*) AS n FROM outbox WHERE status IN ('pending','inflight')`,
      ),
      countTarget: db.prepare(
        `SELECT COUNT(*) AS n FROM outbox WHERE target = ? AND status IN ('pending','inflight')`,
      ),
      countStatus: db.prepare(
        `SELECT status, COUNT(*) AS n FROM outbox GROUP BY status`,
      ),
      targets: db.prepare(
        `SELECT DISTINCT target FROM outbox WHERE status = 'pending' ORDER BY target`,
      ),
      listTarget: db.prepare(
        `SELECT * FROM outbox WHERE target = ? AND status IN ('pending','inflight') ORDER BY id`,
      ),
      listFailed: db.prepare(
        `SELECT * FROM outbox WHERE status = 'failed' ORDER BY id`,
      ),
      requeueFailedAll: db.prepare(
        `UPDATE outbox SET status = 'pending', attempts = 0, next_attempt_at = 0, updated_at = ? WHERE status = 'failed'`,
      ),
      requeueFailedTarget: db.prepare(
        `UPDATE outbox SET status = 'pending', attempts = 0, next_attempt_at = 0, updated_at = ? WHERE status = 'failed' AND target = ?`,
      ),
      pruneFailed: db.prepare(
        `DELETE FROM outbox WHERE status = 'failed' AND updated_at < ?`,
      ),
      pruneDelivered: db.prepare(
        `DELETE FROM outbox WHERE status = 'delivered' AND updated_at < ?`,
      ),
      kvGet: db.prepare(`SELECT value FROM kv WHERE key = ?`),
      kvSet: db.prepare(
        `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ),
    }

    let id = this.getCursor("__outbox_instance_id")
    if (!id) {
      id = crypto.randomBytes(8).toString("hex")
      this.setCursor("__outbox_instance_id", id)
    }
    this.instanceId = id
  }

  /**
   * Store a message for `target`. Returns the row id, or `null` when a row
   * with the same `dedupeKey` already exists for this target.
   */
  enqueue(target: string, payload: unknown, dedupeKey?: string): number | null {
    const res = this.stmts.insert.run({
      target,
      payload: JSON.stringify(payload ?? null),
      now: this.now(),
      dedupeKey: dedupeKey ?? null,
    })
    return res.changes > 0 ? Number(res.lastInsertRowid) : null
  }

  /** Atomically enqueue several messages (all or nothing). */
  enqueueMany(
    items: Array<{ target: string; payload: unknown; dedupeKey?: string }>,
  ): Array<number | null> {
    const tx = this.db.transaction(() =>
      items.map((i) => this.enqueue(i.target, i.payload, i.dedupeKey)),
    )
    return tx()
  }

  /** Oldest pending row of a target (head of its queue), ignoring retry time. */
  head<P = unknown>(target: string): OutboxRow<P> | undefined {
    const r = this.stmts.head.get(target) as RawRow | undefined
    return r ? toRow<P>(r) : undefined
  }

  get<P = unknown>(id: number): OutboxRow<P> | undefined {
    const r = this.stmts.get.get(id) as RawRow | undefined
    return r ? toRow<P>(r) : undefined
  }

  /** Claim a pending row for delivery. Returns false if it was not pending. */
  markInflight(id: number): boolean {
    return this.stmts.inflight.run(this.now(), id).changes > 0
  }

  /** Target confirmed the message: prune it (or keep as delivered). */
  markDelivered(id: number): void {
    if (this.keepDelivered) this.stmts.delivered.run(this.now(), id)
    else this.stmts.deleteRow.run(id)
  }

  /** Put the row back at the head of its queue, not to be tried before `nextAttemptAt`. */
  markRetry(id: number, error: string, nextAttemptAt: number): void {
    this.stmts.retry.run(error, nextAttemptAt, this.now(), id)
  }

  /** The target rejected the message for good; keep it for inspection. */
  markFailed(id: number, error: string): void {
    this.stmts.failed.run(error, this.now(), id)
  }

  /** After a crash: rows that were being sent go back to pending. */
  recoverInflight(): number {
    return this.stmts.recover.run(this.now()).changes
  }

  pendingCount(target?: string): number {
    const r = (
      target ? this.stmts.countTarget.get(target) : this.stmts.countAll.get()
    ) as { n: number }
    return r.n
  }

  stats(): Record<string, number> {
    const out: Record<string, number> = {}
    for (const r of this.stmts.countStatus.all() as Array<{
      status: string
      n: number
    }>)
      out[r.status] = r.n
    return out
  }

  targetsWithPending(): string[] {
    return (this.stmts.targets.all() as Array<{ target: string }>).map(
      (r) => r.target,
    )
  }

  list<P = unknown>(target: string): OutboxRow<P>[] {
    return (this.stmts.listTarget.all(target) as RawRow[]).map((r) =>
      toRow<P>(r),
    )
  }

  listFailed<P = unknown>(): OutboxRow<P>[] {
    return (this.stmts.listFailed.all() as RawRow[]).map((r) => toRow<P>(r))
  }

  /** Operator helper: give permanently failed rows another chance. */
  requeueFailed(target?: string): number {
    return (
      target
        ? this.stmts.requeueFailedTarget.run(this.now(), target)
        : this.stmts.requeueFailedAll.run(this.now())
    ).changes
  }

  /** Delete failed/delivered rows older than the given ages (ms). Pending rows are never pruned. */
  prune({
    failedOlderThanMs,
    deliveredOlderThanMs = 0,
  }: {
    failedOlderThanMs?: number
    deliveredOlderThanMs?: number
  }): number {
    let n = 0
    const now = this.now()
    if (failedOlderThanMs !== undefined && failedOlderThanMs > 0)
      n += this.stmts.pruneFailed.run(now - failedOlderThanMs).changes
    n += this.stmts.pruneDelivered.run(now - deliveredOlderThanMs).changes
    return n
  }

  getCursor(key: string): string | undefined {
    const r = this.stmts.kvGet.get(key) as { value: string } | undefined
    return r?.value
  }

  setCursor(key: string, value: string): void {
    this.stmts.kvSet.run(key, value, this.now())
  }

  close(): void {
    if (this.db.open) this.db.close()
  }
}
