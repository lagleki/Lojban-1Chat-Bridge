/**
 * Wires the reliability layer (outbox + supervisors) into the bridge's pier
 * registry. Each pier may expose `pierObj.<pier>.health(messenger)` returning
 * a partial `PeerAdapter` (isReady, probe, stop, onReady, timeouts...).
 * Without it the pier is assumed always ready and is started with
 * `StartService`.
 */
import path from "path"
import { ConnectivityMonitor } from "./connectivity"
import { errorMessage } from "./errors"
import { ReliabilityManager } from "./manager"
import type { OutboxRow } from "./outbox"
import type { LogFn, PeerAdapter, SupervisorOptions } from "./supervisor"

export type PierHealth = Partial<Omit<PeerAdapter, "name" | "send">>

/** Fields of a queued relay message (everything sendTo needs except messenger). */
export interface OutgoingPayload {
  channelId: string | number
  author: string
  chunk: unknown
  quotation?: boolean
  action?: string
  file?: string
  edited?: boolean
  avatar?: string
}

export interface PierLike {
  StartService?: (args: { messenger: string }) => Promise<unknown>
  sendTo?: (args: Record<string, unknown>) => Promise<unknown>
  health?: (messenger: string) => PierHealth
}

/** Builds the supervisor adapter of one pier instance (e.g. "irc_1"). */
export function buildAdapter(messenger: string, pier: PierLike): PeerAdapter {
  const h: PierHealth = pier.health?.(messenger) ?? {}
  return {
    ...h,
    name: messenger,
    start:
      h.start ??
      (async () => {
        await pier.StartService?.({ messenger })
      }),
    isReady: h.isReady ?? (() => true),
    send: async (payload: OutgoingPayload, ctx) => {
      if (!pier.sendTo) throw new Error(`pier of ${messenger} has no sendTo`)
      await pier.sendTo({
        ...payload,
        messenger,
        deliveryKey: ctx.deliveryKey,
        attempt: ctx.attempt,
        enqueuedAt: ctx.enqueuedAt,
      })
    },
  }
}

/** Absolute outbox path: relative paths are resolved against `dataDir`. */
export function resolveOutboxPath(
  dbPath: string | undefined,
  dataDir: string,
): string {
  const p = dbPath || "outbox.sqlite"
  if (p === ":memory:" || path.isAbsolute(p)) return p
  return path.join(dataDir, p)
}

export interface GenericConfig {
  outbox?: {
    dbPath?: string
    synchronous?: "FULL" | "NORMAL"
    failedRetentionDays?: number
    sendTimeoutMs?: number
    retryInitialMs?: number
    retryMaxMs?: number
    maxPermanentAttempts?: number
  }
  health?: {
    connectivityTargets?: string[]
    connectivityIntervalMs?: number
    probeIntervalMs?: number
    probeTimeoutMs?: number
    reconnectInitialMs?: number
    reconnectMaxMs?: number
    startTimeoutMs?: number
    readyTimeoutMs?: number
  }
}

const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d

/** Creates a manager from `config.generic.outbox` / `config.generic.health`. */
export function createManagerFromConfig(
  generic: GenericConfig | undefined,
  dataDir: string,
  log: LogFn,
  onPermanentFailure?: (row: OutboxRow, err: unknown) => void,
): ReliabilityManager {
  const o = generic?.outbox ?? {}
  const h = generic?.health ?? {}
  const supervisor: Partial<SupervisorOptions> = {
    sendTimeoutMs: num(o.sendTimeoutMs, 60000),
    maxPermanentAttempts: num(o.maxPermanentAttempts, 3),
    sendBackoff: {
      initialMs: num(o.retryInitialMs, 1000),
      maxMs: num(o.retryMaxMs, 60000),
    },
    probeIntervalMs: num(h.probeIntervalMs, 60000),
    probeTimeoutMs: num(h.probeTimeoutMs, 15000),
    restartBackoff: {
      initialMs: num(h.reconnectInitialMs, 2000),
      maxMs: num(h.reconnectMaxMs, 300000),
    },
    startTimeoutMs: num(h.startTimeoutMs, 90000),
    readyTimeoutMs: num(h.readyTimeoutMs, 90000),
  }
  const days = num(o.failedRetentionDays, 30)
  return new ReliabilityManager({
    outbox: {
      path: resolveOutboxPath(o.dbPath, dataDir),
      synchronous: o.synchronous === "NORMAL" ? "NORMAL" : "FULL",
    },
    connectivity: new ConnectivityMonitor({
      ...(h.connectivityTargets ? { targets: h.connectivityTargets } : {}),
      intervalMs: num(h.connectivityIntervalMs, 15000),
    }),
    supervisor,
    failedRetentionMs: days > 0 ? days * 24 * 3600 * 1000 : 0,
    log,
    onPermanentFailure,
  })
}

/**
 * Runs a pier's getChannels without letting a failed/empty (offline) result
 * wipe the channel cache that was known before.
 */
export async function guardedGetChannels(
  cache: Record<string, Record<string, unknown> | undefined>,
  pier: string,
  getChannels: (pier: string) => Promise<unknown>,
  log: LogFn = () => {},
): Promise<void> {
  const before = cache[pier] ? { ...cache[pier] } : undefined
  try {
    await getChannels(pier)
  } catch (err) {
    log("warn", `${pier}: getChannels failed, keeping cached channels`, {
      error: errorMessage(err),
    })
  }
  const after = cache[pier]
  if (before && Object.keys(before).length > 0)
    cache[pier] = { ...before, ...(after ?? {}) }
}
