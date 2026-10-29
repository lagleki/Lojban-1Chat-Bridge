import { EventEmitter } from "events"
import net from "net"

/**
 * Global internet connectivity monitor.
 *
 * Periodically opens a TCP connection to a few well-known hosts. The host is
 * considered online if any of them answers. `failuresBeforeOffline`
 * consecutive failed rounds are needed before switching to offline, so a
 * single lost packet does not flap the state.
 *
 * Events: "online", "offline" (only on transitions), "check" (every round).
 */
export interface ConnectivityOptions {
  /** "host:port" targets. */
  targets: string[]
  intervalMs: number
  timeoutMs: number
  failuresBeforeOffline: number
  /** Replace the TCP check (tests, or a custom probe). */
  check?: () => Promise<boolean>
}

export const DEFAULT_CONNECTIVITY: ConnectivityOptions = {
  targets: ["1.1.1.1:443", "8.8.8.8:53", "9.9.9.9:53"],
  intervalMs: 15000,
  timeoutMs: 5000,
  failuresBeforeOffline: 2,
}

export function tcpCheck(target: string, timeoutMs: number): Promise<boolean> {
  const idx = target.lastIndexOf(":")
  const host = idx > 0 ? target.slice(0, idx) : target
  const port = idx > 0 ? Number(target.slice(idx + 1)) : 443
  return new Promise((resolve) => {
    let settled = false
    const socket = net.connect({ host, port })
    const done = (ok: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once("connect", () => done(true))
    socket.once("error", () => done(false))
  })
}

export class ConnectivityMonitor extends EventEmitter {
  readonly options: ConnectivityOptions
  private online = true
  private failures = 0
  private timer: NodeJS.Timeout | null = null
  private running = false
  private checking: Promise<boolean> | null = null
  private offlineSince: number | null = null

  constructor(options: Partial<ConnectivityOptions> = {}) {
    super()
    this.options = { ...DEFAULT_CONNECTIVITY, ...options }
  }

  isOnline(): boolean {
    return this.online
  }

  /** ms spent offline in the current outage (0 when online). */
  offlineForMs(now = Date.now()): number {
    return this.offlineSince === null ? 0 : now - this.offlineSince
  }

  start(): void {
    if (this.running) return
    this.running = true
    const loop = async () => {
      if (!this.running) return
      await this.checkNow()
      if (!this.running) return
      this.timer = setTimeout(loop, this.options.intervalMs)
      this.timer.unref?.()
    }
    void loop()
  }

  stop(): void {
    this.running = false
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async probeOnce(): Promise<boolean> {
    if (this.options.check) {
      try {
        return await this.options.check()
      } catch {
        return false
      }
    }
    if (this.options.targets.length === 0) return true
    const results = await Promise.all(
      this.options.targets.map((t) => tcpCheck(t, this.options.timeoutMs)),
    )
    return results.some(Boolean)
  }

  /** Run one check round now (concurrent callers share the same round). */
  checkNow(): Promise<boolean> {
    if (this.checking) return this.checking
    this.checking = (async () => {
      const ok = await this.probeOnce()
      this.record(ok)
      this.emit("check", ok)
      return ok
    })().finally(() => {
      this.checking = null
    })
    return this.checking
  }

  /** Feed a result (also used by tests). */
  record(ok: boolean): void {
    if (ok) {
      this.failures = 0
      if (!this.online) {
        const downMs = this.offlineForMs()
        this.online = true
        this.offlineSince = null
        this.emit("online", downMs)
      }
      return
    }
    this.failures++
    if (this.online && this.failures >= this.options.failuresBeforeOffline) {
      this.online = false
      this.offlineSince = Date.now()
      this.emit("offline")
    }
  }
}
