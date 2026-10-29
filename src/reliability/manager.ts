import { ConnectivityMonitor, ConnectivityOptions } from "./connectivity"
import { Outbox, OutboxOptions } from "./outbox"
import {
  LogFn,
  PeerAdapter,
  PeerState,
  PeerSupervisor,
  SupervisorOptions,
} from "./supervisor"
import { healthBus, setCursorStore } from "./runtime"
import type { OutboxRow } from "./outbox"

export interface ReliabilityOptions {
  outbox: OutboxOptions | Outbox
  /** `false` disables the global connectivity monitor. */
  connectivity?: Partial<ConnectivityOptions> | false | ConnectivityMonitor
  supervisor?: Partial<SupervisorOptions>
  /** Failed rows older than this are deleted (ms). 0 keeps them forever. */
  failedRetentionMs?: number
  pruneIntervalMs?: number
  log?: LogFn
  /** Called when a message is dropped for good (to notify admins). */
  onPermanentFailure?: (row: OutboxRow, err: unknown) => void
  now?: () => number
  random?: () => number
}

/**
 * Glue between the outbox, the connectivity monitor and one supervisor per
 * pier instance.
 */
export class ReliabilityManager {
  readonly outbox: Outbox
  readonly monitor: ConnectivityMonitor | null
  private readonly supervisors = new Map<string, PeerSupervisor>()
  private readonly log: LogFn
  private pruneTimer: NodeJS.Timeout | null = null
  private started = false
  private readonly onDown = (messenger: string, reason: string) =>
    this.supervisors.get(messenger)?.reportDown(reason)
  private readonly onProbe = (messenger: string) =>
    this.supervisors.get(messenger)?.requestProbe()
  private readonly onOffline = () => {
    this.log("warn", "connectivity: host looks offline")
    for (const s of this.supervisors.values()) s.setNetworkOnline(false)
  }
  private readonly onOnline = (downMs: number) => {
    this.log("info", `connectivity: back online after ${downMs}ms`)
    for (const s of this.supervisors.values()) s.setNetworkOnline(true)
  }

  constructor(readonly options: ReliabilityOptions) {
    this.log = options.log ?? (() => {})
    this.outbox =
      options.outbox instanceof Outbox
        ? options.outbox
        : new Outbox({ now: options.now, ...options.outbox })
    const recovered = this.outbox.recoverInflight()
    if (recovered > 0)
      this.log(
        "warn",
        `outbox: ${recovered} message(s) were in flight during a crash, they will be re-sent`,
      )
    if (options.connectivity instanceof ConnectivityMonitor)
      this.monitor = options.connectivity
    else if (options.connectivity === false) this.monitor = null
    else this.monitor = new ConnectivityMonitor(options.connectivity ?? {})
    setCursorStore(this.outbox)
  }

  register(adapter: PeerAdapter): PeerSupervisor {
    const existing = this.supervisors.get(adapter.name)
    if (existing) return existing
    const sup = new PeerSupervisor(
      adapter,
      this.outbox,
      this.options.supervisor ?? {},
      this.log,
      this.options.now,
      this.options.random,
    )
    sup.on("failed", (row: OutboxRow, err: unknown) =>
      this.options.onPermanentFailure?.(row, err),
    )
    if (this.monitor) sup.setNetworkOnline(this.monitor.isOnline())
    this.supervisors.set(adapter.name, sup)
    if (this.started) sup.start()
    return sup
  }

  supervisor(name: string): PeerSupervisor | undefined {
    return this.supervisors.get(name)
  }

  has(name: string): boolean {
    return this.supervisors.has(name)
  }

  /** Persist one message for `target` and wake its supervisor. */
  enqueue(target: string, payload: unknown, dedupeKey?: string): number | null {
    const id = this.outbox.enqueue(target, payload, dedupeKey)
    this.supervisors.get(target)?.wake()
    return id
  }

  isReady(name: string): boolean {
    return this.supervisors.get(name)?.isReady() ?? false
  }

  /** Resolves when `name` is ready (or after `timeoutMs`, with false). */
  waitReady(name: string, timeoutMs: number): Promise<boolean> {
    const sup = this.supervisors.get(name)
    if (!sup) return Promise.resolve(false)
    if (sup.isReady()) return Promise.resolve(true)
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        sup.off("ready", onReady)
        resolve(false)
      }, timeoutMs)
      const onReady = () => {
        clearTimeout(timer)
        resolve(true)
      }
      sup.once("ready", onReady)
    })
  }

  start(): void {
    if (this.started) return
    this.started = true
    healthBus.on("down", this.onDown)
    healthBus.on("probe", this.onProbe)
    if (this.monitor) {
      this.monitor.on("offline", this.onOffline)
      this.monitor.on("online", this.onOnline)
      this.monitor.start()
    }
    for (const s of this.supervisors.values()) s.start()
    const retention = this.options.failedRetentionMs ?? 0
    const pruneEvery = this.options.pruneIntervalMs ?? 60 * 60 * 1000
    const prune = () => {
      try {
        this.outbox.prune({
          failedOlderThanMs: retention > 0 ? retention : undefined,
        })
      } catch (err) {
        this.log("error", "outbox prune failed", { error: String(err) })
      }
    }
    prune()
    this.pruneTimer = setInterval(prune, pruneEvery)
    this.pruneTimer.unref?.()
  }

  async stop(): Promise<void> {
    healthBus.off("down", this.onDown)
    healthBus.off("probe", this.onProbe)
    this.monitor?.stop()
    this.monitor?.off("offline", this.onOffline)
    this.monitor?.off("online", this.onOnline)
    if (this.pruneTimer) clearInterval(this.pruneTimer)
    this.pruneTimer = null
    await Promise.all([...this.supervisors.values()].map((s) => s.stop()))
    this.started = false
  }

  /** Close the database (after stop()). */
  close(): void {
    setCursorStore(null)
    this.outbox.close()
  }

  status(): Record<
    string,
    { state: PeerState; pending: number; lastError: string | null }
  > {
    const out: Record<
      string,
      { state: PeerState; pending: number; lastError: string | null }
    > = {}
    for (const [name, s] of this.supervisors)
      out[name] = {
        state: s.state,
        pending: this.outbox.pendingCount(name),
        lastError: s.lastError,
      }
    return out
  }
}
