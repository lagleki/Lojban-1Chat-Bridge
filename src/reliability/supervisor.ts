import { EventEmitter } from "events"
import { Backoff, BackoffOptions } from "./backoff"
import { Signal, withTimeout } from "./async"
import { classifyError, ErrorClassification, errorMessage } from "./errors"
import type { Outbox, OutboxRow } from "./outbox"

/** Context handed to `PeerAdapter.send` for one delivery attempt. */
export interface DeliveryContext {
  /** Outbox row id. */
  id: number
  /** 1-based attempt number for this row. */
  attempt: number
  /** Stable, globally unique key for this message+target (idempotency). */
  deliveryKey: string
  /** When the message was put into the outbox (ms since epoch). */
  enqueuedAt: number
}

/**
 * What the supervisor needs from a pier instance (e.g. `telegram_1`).
 * Everything except `start`, `isReady` and `send` is optional.
 */
export interface PeerAdapter<P = any> {
  name: string
  /** Connect, or reconnect from scratch. Called again after every drop. */
  start(): Promise<void>
  /** Tear the current connection down (called before a restart). */
  stop?(): Promise<void>
  /** Cheap, synchronous "is the connection up and usable right now?" */
  isReady(): boolean
  /** Active end-to-end check (round trip to the server). Throws if unhealthy. */
  probe?(): Promise<void>
  /** Deliver one message. Must throw unless the target confirmed it. */
  send(payload: P, ctx: DeliveryContext): Promise<void>
  /** Pier-specific error classification; return undefined for the default. */
  classifyError?(err: unknown): ErrorClassification | undefined
  /** Runs (in background) each time the peer becomes ready, e.g. inbound catch-up. */
  onReady?(): Promise<void>
  /** How long the library may try to reconnect by itself before a forced restart. */
  nativeRecoveryMs?: number
  /** How long to wait for isReady() after start(). */
  readyTimeoutMs?: number
  /** How long start() may take. */
  startTimeoutMs?: number
  /** Interval between active probes while idle. */
  probeIntervalMs?: number
  /** How long one send() may take (overrides the supervisor default). */
  sendTimeoutMs?: number
}

export interface SupervisorOptions {
  probeIntervalMs: number
  probeTimeoutMs: number
  probeFailuresBeforeDown: number
  readyTimeoutMs: number
  startTimeoutMs: number
  stopTimeoutMs: number
  sendTimeoutMs: number
  onReadyTimeoutMs: number
  readyPollMs: number
  idleTickMs: number
  maxPermanentAttempts: number
  restartBackoff: Partial<BackoffOptions>
  sendBackoff: Partial<BackoffOptions>
}

export const DEFAULT_SUPERVISOR: SupervisorOptions = {
  probeIntervalMs: 60000,
  probeTimeoutMs: 15000,
  probeFailuresBeforeDown: 2,
  readyTimeoutMs: 90000,
  startTimeoutMs: 90000,
  stopTimeoutMs: 10000,
  sendTimeoutMs: 60000,
  onReadyTimeoutMs: 300000,
  readyPollMs: 250,
  idleTickMs: 5000,
  maxPermanentAttempts: 3,
  restartBackoff: { initialMs: 2000, maxMs: 5 * 60 * 1000, factor: 2 },
  sendBackoff: { initialMs: 1000, maxMs: 60 * 1000, factor: 2 },
}

export type PeerState = "idle" | "connecting" | "ready" | "down" | "stopped"

export type LogFn = (
  level: "info" | "warn" | "error" | "debug",
  message: string,
  meta?: Record<string, unknown>,
) => void

/**
 * Owns one pier instance: keeps it connected, checks its health and drains
 * its outbox queue strictly in order, one message at a time.
 *
 * Events: "state" (state, reason), "ready", "down" (reason),
 * "delivered" (row), "retry" (row, err, delayMs), "failed" (row, err).
 */
export class PeerSupervisor extends EventEmitter {
  readonly target: string
  readonly options: SupervisorOptions
  private _state: PeerState = "idle"
  private stopped = false
  private loopPromise: Promise<void> | null = null
  /** Wakes the main loop (new message, state change, network change). */
  private readonly signal = new Signal()
  /** Wakes a reconnect backoff early (network back, manual kick). */
  private readonly connectSignal = new Signal()
  private readonly restartBackoff: Backoff
  private readonly sendBackoff: Backoff
  private restartAttempts = 0
  private everReady = false
  private readySince = 0
  private lastProbeAt = 0
  private probeFailures = 0
  private forceProbe = false
  private networkOnline = true
  private lastStartAttemptAt = 0
  lastError: string | null = null

  constructor(
    readonly adapter: PeerAdapter,
    readonly outbox: Outbox,
    options: Partial<SupervisorOptions> = {},
    private readonly log: LogFn = () => {},
    private readonly now: () => number = Date.now,
    random: () => number = Math.random,
  ) {
    super()
    this.target = adapter.name
    this.options = {
      ...DEFAULT_SUPERVISOR,
      ...options,
      restartBackoff: {
        ...DEFAULT_SUPERVISOR.restartBackoff,
        ...(options.restartBackoff ?? {}),
      },
      sendBackoff: {
        ...DEFAULT_SUPERVISOR.sendBackoff,
        ...(options.sendBackoff ?? {}),
      },
    }
    this.restartBackoff = new Backoff(this.options.restartBackoff, random)
    this.sendBackoff = new Backoff(this.options.sendBackoff, random)
  }

  get state(): PeerState {
    return this._state
  }

  isReady(): boolean {
    return this._state === "ready"
  }

  /** Start supervising (non-blocking). */
  start(): void {
    if (this.loopPromise) return
    this.stopped = false
    this.loopPromise = this.loop().catch((err) => {
      this.log("error", `${this.target}: supervisor loop crashed`, {
        error: errorMessage(err),
      })
    })
  }

  async stop(): Promise<void> {
    this.stopped = true
    this.signal.notify()
    this.connectSignal.notify()
    if (this.loopPromise) await this.loopPromise
    this.loopPromise = null
    if (this.adapter.stop)
      await withTimeout(
        this.adapter.stop(),
        this.options.stopTimeoutMs,
        `${this.target} stop`,
      ).catch(() => {})
    this.setState("stopped", "stopped")
  }

  /** New work in the outbox. */
  wake(): void {
    this.signal.notify()
  }

  /** A native signal says the connection is gone (socket closed, ping timeout...). */
  reportDown(reason: string): void {
    if (this._state === "ready") this.goDown(reason)
  }

  /** Something looks suspicious: run an active probe as soon as possible. */
  requestProbe(): void {
    this.forceProbe = true
    this.signal.notify()
  }

  /** Global connectivity changed. */
  setNetworkOnline(online: boolean): void {
    const was = this.networkOnline
    this.networkOnline = online
    if (online && !was) {
      // connection is back: retry right away, and don't trust old sockets
      this.restartBackoff.reset()
      this.forceProbe = true
      this.connectSignal.notify()
      this.signal.notify()
    } else if (!online && was) {
      this.forceProbe = true
      this.signal.notify()
    }
  }

  private setState(state: PeerState, reason: string) {
    if (this._state === state) return
    this._state = state
    this.emit("state", state, reason)
  }

  private goDown(reason: string) {
    this.lastError = reason
    this.log("warn", `${this.target}: connection down: ${reason}`)
    this.setState("down", reason)
    this.emit("down", reason)
    this.signal.notify()
  }

  private async loop(): Promise<void> {
    while (!this.stopped) {
      if (this._state !== "ready") {
        await this.connectCycle()
        continue
      }
      await this.drain()
      if (this.stopped || this._state !== "ready") continue
      await this.signal.wait(this.idleWaitMs())
      if (this.stopped || this._state !== "ready") continue
      await this.periodicCheck()
    }
  }

  private idleWaitMs(): number {
    let wait = this.options.idleTickMs
    const probeInterval =
      this.adapter.probeIntervalMs ?? this.options.probeIntervalMs
    wait = Math.min(wait, this.lastProbeAt + probeInterval - this.now())
    const head = this.outbox.head(this.target)
    if (head) wait = Math.min(wait, head.nextAttemptAt - this.now())
    if (this.forceProbe) wait = 0
    return Math.max(0, wait)
  }

  /** Is the connection alive? Uses the active probe when available. */
  private async healthCheck(): Promise<boolean> {
    if (!this.adapter.isReady()) return false
    if (!this.adapter.probe) return true
    try {
      await withTimeout(
        this.adapter.probe(),
        this.options.probeTimeoutMs,
        `${this.target} probe`,
      )
      return true
    } catch (err) {
      this.lastError = errorMessage(err)
      this.log("warn", `${this.target}: probe failed`, {
        error: this.lastError,
      })
      return false
    }
  }

  private async periodicCheck(): Promise<void> {
    if (!this.adapter.isReady()) {
      this.goDown("pier reports not ready")
      return
    }
    const probeInterval =
      this.adapter.probeIntervalMs ?? this.options.probeIntervalMs
    const forced = this.forceProbe
    if (!forced && this.now() - this.lastProbeAt < probeInterval) return
    this.forceProbe = false
    this.lastProbeAt = this.now()
    const ok = await this.healthCheck()
    if (ok) {
      this.probeFailures = 0
      return
    }
    this.probeFailures++
    if (forced || this.probeFailures >= this.options.probeFailuresBeforeDown)
      this.goDown(`health probe failed (${this.lastError ?? "unknown"})`)
  }

  private async waitReady(ms: number): Promise<boolean> {
    const deadline = this.now() + ms
    while (!this.stopped) {
      if (this.adapter.isReady()) return true
      const left = deadline - this.now()
      if (left <= 0) return false
      await this.connectSignal.wait(Math.min(left, this.options.readyPollMs))
    }
    return false
  }

  private async becomeReady(how: string): Promise<void> {
    this.restartAttempts = 0
    this.restartBackoff.reset()
    this.sendBackoff.reset()
    this.everReady = true
    this.readySince = this.now()
    this.lastProbeAt = this.now()
    this.probeFailures = 0
    this.forceProbe = false
    this.lastError = null
    this.log("info", `${this.target}: ready (${how})`, {
      pending: this.outbox.pendingCount(this.target),
    })
    this.setState("ready", how)
    this.emit("ready")
    if (this.adapter.onReady) {
      const onReady = this.adapter.onReady()
      void withTimeout(
        onReady,
        this.options.onReadyTimeoutMs,
        `${this.target} onReady`,
      ).catch((err) =>
        this.log("error", `${this.target}: onReady failed`, {
          error: errorMessage(err),
        }),
      )
    }
  }

  private async connectCycle(): Promise<void> {
    if (this.stopped) return
    const nativeMs = this.adapter.nativeRecoveryMs ?? 0
    // 1. right after a drop, give the library a chance to reconnect by itself
    if (this.everReady && this.restartAttempts === 0 && nativeMs > 0) {
      this.setState("connecting", "waiting for native reconnect")
      if ((await this.waitReady(nativeMs)) && (await this.healthCheck())) {
        await this.becomeReady("native reconnect")
        return
      }
      this.restartAttempts = 1 // native recovery counts as the first try
    }
    // 2. backoff before every restart except the very first start
    if (this.restartAttempts > 0) {
      const delay = this.restartBackoff.next()
      this.log("info", `${this.target}: reconnecting in ${delay}ms`)
      const deadline = this.now() + delay
      while (!this.stopped && this.now() < deadline) {
        if (await this.connectSignal.wait(deadline - this.now())) break
      }
      // while the whole host is offline, don't hammer; but never wait forever
      // (the connectivity check itself could be wrong)
      const maxWait = this.restartBackoff.options.maxMs
      while (
        !this.stopped &&
        !this.networkOnline &&
        this.now() - this.lastStartAttemptAt < maxWait
      ) {
        await this.connectSignal.wait(
          Math.min(5000, maxWait - (this.now() - this.lastStartAttemptAt)),
        )
      }
    }
    if (this.stopped) return
    const isRestart = this.everReady || this.restartAttempts > 0
    this.restartAttempts++
    this.lastStartAttemptAt = this.now()
    this.setState("connecting", isRestart ? "restarting" : "starting")
    try {
      if (isRestart && this.adapter.stop)
        await withTimeout(
          this.adapter.stop(),
          this.options.stopTimeoutMs,
          `${this.target} stop`,
        ).catch((err) =>
          this.log("warn", `${this.target}: stop failed`, {
            error: errorMessage(err),
          }),
        )
      await withTimeout(
        this.adapter.start(),
        this.adapter.startTimeoutMs ?? this.options.startTimeoutMs,
        `${this.target} start`,
      )
      const readyMs = this.adapter.readyTimeoutMs ?? this.options.readyTimeoutMs
      if (!(await this.waitReady(readyMs)))
        throw new Error(`not ready ${readyMs}ms after start`)
      if (!(await this.healthCheck()))
        throw new Error(`probe failed after start: ${this.lastError}`)
      if (this.stopped) return
      await this.becomeReady(isRestart ? "restarted" : "started")
    } catch (err) {
      this.lastError = errorMessage(err)
      this.log("warn", `${this.target}: (re)start attempt failed`, {
        attempt: this.restartAttempts,
        error: this.lastError,
      })
      this.setState("down", this.lastError)
    }
  }

  deliveryKey(id: number): string {
    return `${this.outbox.instanceId}:${id}`
  }

  private async drain(): Promise<void> {
    while (!this.stopped && this._state === "ready") {
      if (!this.adapter.isReady()) {
        this.goDown("pier reports not ready")
        return
      }
      const row = this.outbox.head(this.target)
      if (!row) return
      // honour the retry time, unless the row failed before the latest reconnect
      if (row.nextAttemptAt > this.now() && row.updatedAt >= this.readySince)
        return
      if (!this.outbox.markInflight(row.id)) continue
      if (!(await this.deliver(row))) return
    }
  }

  /** Returns true to continue draining, false to stop (retry later / down). */
  private async deliver(row: OutboxRow): Promise<boolean> {
    const attempt = row.attempts + 1
    try {
      await withTimeout(
        Promise.resolve().then(() =>
          this.adapter.send(row.payload, {
            id: row.id,
            attempt,
            deliveryKey: this.deliveryKey(row.id),
            enqueuedAt: row.createdAt,
          }),
        ),
        this.adapter.sendTimeoutMs ?? this.options.sendTimeoutMs,
        `${this.target} send`,
      )
      this.outbox.markDelivered(row.id)
      this.sendBackoff.reset()
      this.emit("delivered", row)
      return true
    } catch (err) {
      const cls = this.adapter.classifyError?.(err) ?? classifyError(err)
      const msg = errorMessage(err)
      if (
        cls.kind === "permanent" &&
        attempt >= this.options.maxPermanentAttempts
      ) {
        this.outbox.markFailed(row.id, msg)
        this.log("error", `${this.target}: message rejected permanently`, {
          id: row.id,
          error: msg,
        })
        this.emit("failed", row, err)
        return true
      }
      const delay = Math.max(cls.retryAfterMs ?? 0, this.sendBackoff.next())
      this.outbox.markRetry(row.id, msg, this.now() + delay)
      this.log("warn", `${this.target}: send failed (${cls.kind}), retry`, {
        id: row.id,
        attempt,
        delay,
        error: msg,
      })
      this.emit("retry", row, err, delay)
      if (cls.kind === "not_ready") {
        this.goDown(`send: ${msg}`)
        return false
      }
      if (cls.kind === "transient" && cls.retryAfterMs === undefined) {
        // maybe the connection silently died: verify before retrying
        this.lastProbeAt = this.now()
        if (!(await this.healthCheck())) this.goDown(`send failed: ${msg}`)
      }
      return false
    }
  }
}
