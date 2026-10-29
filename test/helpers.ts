import fs from "fs"
import os from "os"
import path from "path"
import { NotReadyError } from "../src/reliability/errors"

/** Polls `cond` until true (or fails after `timeoutMs`). */
export async function waitFor(
  cond: () => boolean,
  timeoutMs = 3000,
  what = "condition",
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!cond()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 2))
  }
}

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** A fresh temp directory, removed by the returned cleanup. */
export function tempDir(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-test-"))
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  }
}

/** Network-ish error like the ones node/http libraries throw. */
export function netError(code = "ECONNRESET"): Error {
  return Object.assign(new Error(`connect ${code}`), { code })
}

/** Fast supervisor timings for tests. */
export const FAST = {
  probeIntervalMs: 60000,
  probeTimeoutMs: 200,
  readyTimeoutMs: 300,
  startTimeoutMs: 300,
  stopTimeoutMs: 100,
  sendTimeoutMs: 300,
  onReadyTimeoutMs: 500,
  readyPollMs: 2,
  idleTickMs: 20,
  restartBackoff: { initialMs: 5, maxMs: 40, factor: 2, jitter: 0 },
  sendBackoff: { initialMs: 5, maxMs: 30, factor: 2, jitter: 0 },
}

/**
 * A scriptable fake peer: models a messenger connection that can drop
 * (cleanly or silently), refuse to start while offline, and fail sends.
 */
export class FakePeer {
  /** Is the network path to this server up? */
  online = true
  /** Library-level "connected" flag (stays true on a silent drop). */
  connected = false
  /** Library needs this long after start() to become ready. */
  readyDelayMs = 0
  startDelayMs = 0
  startHangs = false
  probeFails = false
  sendHangs = false
  nativeRecoveryMs?: number
  startCalls = 0
  stopCalls = 0
  probeCalls = 0
  onReadyCalls = 0
  startTimes: number[] = []
  sendErrors: unknown[] = []
  sent: Array<{ payload: any; ctx: any; at: number }> = []
  attempts: Array<{ payload: any; ctx: any }> = []
  readyLog: string[] = []

  constructor(readonly name: string) {}

  adapter(extra: Record<string, unknown> = {}) {
    return {
      name: this.name,
      nativeRecoveryMs: this.nativeRecoveryMs,
      start: () => this.start(),
      stop: async () => {
        this.stopCalls++
        this.connected = false
      },
      isReady: () => this.connected,
      probe: async () => {
        this.probeCalls++
        if (!this.online || this.probeFails) throw netError("ETIMEDOUT")
      },
      send: (payload: any, ctx: any) => this.send(payload, ctx),
      onReady: async () => {
        this.onReadyCalls++
      },
      ...extra,
    }
  }

  async start() {
    this.startCalls++
    this.startTimes.push(Date.now())
    if (this.startHangs) return new Promise<void>(() => {})
    if (this.startDelayMs) await delay(this.startDelayMs)
    if (!this.online) throw netError("ENETUNREACH")
    if (this.readyDelayMs)
      setTimeout(
        () => (this.connected = this.online),
        this.readyDelayMs,
      ).unref()
    else this.connected = true
  }

  /** Clean drop: the library notices (socket closed). */
  drop() {
    this.online = false
    this.connected = false
  }

  /** Silent drop: socket still looks open, nothing gets through. */
  silentDrop() {
    this.online = false
  }

  restore() {
    this.online = true
  }

  async send(payload: any, ctx: any) {
    this.attempts.push({ payload, ctx })
    if (!this.connected) throw new NotReadyError(`${this.name} not connected`)
    if (this.sendHangs) return new Promise<void>(() => {})
    if (!this.online) throw netError("ETIMEDOUT")
    const err = this.sendErrors.shift()
    if (err) throw err
    this.sent.push({ payload, ctx, at: Date.now() })
  }

  payloads() {
    return this.sent.map((s) => s.payload)
  }
}
