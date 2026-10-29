import type { EventEmitter } from "events"
import { withTimeout } from "./async"
import type { LogFn } from "./supervisor"

export interface ShutdownOptions {
  /** Graceful part: stop supervisors, peers, timers, servers. */
  stop: () => Promise<void>
  /** Final synchronous cleanup (close the SQLite outbox); runs even if stop() failed or timed out. */
  close?: () => void
  /** Process is force-exited with code 1 after this long (default 10s). */
  hardTimeoutMs?: number
  /** Budget for stop() before we give up and close anyway (default hardTimeoutMs - 2s). */
  stopTimeoutMs?: number
  signals?: NodeJS.Signals[]
  log?: LogFn
  /** Injected for tests. */
  exit?: (code: number) => void
  proc?: EventEmitter
}

export interface ShutdownHandle {
  /** Run the shutdown sequence (idempotent; a second call just returns the same promise). */
  trigger: (reason: string) => Promise<void>
  uninstall: () => void
}

/**
 * Installs SIGTERM/SIGINT handlers that stop the bridge promptly.
 *
 * - the first signal starts a graceful stop bounded by `stopTimeoutMs`, then
 *   `close()` runs and the process exits with 0;
 * - a hard timer exits with 1 after `hardTimeoutMs` no matter what is hanging;
 * - a second signal exits immediately with 1.
 *
 * Register this as early as possible so a signal that arrives while config is
 * loading or networks are connecting is not ignored (PID 1 in a container
 * ignores SIGTERM unless a handler is installed).
 */
export function installShutdown(options: ShutdownOptions): ShutdownHandle {
  const proc = options.proc ?? process
  const exit = options.exit ?? ((code: number) => process.exit(code))
  const log: LogFn = options.log ?? (() => {})
  const hardTimeoutMs = options.hardTimeoutMs ?? 10000
  const stopTimeoutMs =
    options.stopTimeoutMs ?? Math.max(0, hardTimeoutMs - 2000)
  const signals = options.signals ?? ["SIGTERM", "SIGINT"]

  let running: Promise<void> | null = null
  let exited = false
  const doExit = (code: number) => {
    if (exited) return
    exited = true
    exit(code)
  }

  const trigger = (reason: string): Promise<void> => {
    if (running) return running
    log("info", `received ${reason}, stopping`)
    const hard = setTimeout(() => {
      log(
        "error",
        `shutdown did not finish in ${hardTimeoutMs}ms, forcing exit`,
      )
      doExit(1)
    }, hardTimeoutMs)
    hard.unref?.()
    running = (async () => {
      try {
        await withTimeout(
          Promise.resolve().then(options.stop),
          stopTimeoutMs,
          "graceful stop",
        )
      } catch (err) {
        log("warn", "graceful stop incomplete", { error: String(err) })
      }
      try {
        options.close?.()
      } catch (err) {
        log("warn", "close failed", { error: String(err) })
      }
      clearTimeout(hard)
      log("info", "stopped")
      doExit(0)
    })()
    return running
  }

  const handlers = new Map<string, () => void>()
  for (const sig of signals) {
    const h = () => {
      if (running) {
        log("warn", `received ${sig} again, exiting now`)
        doExit(1)
        return
      }
      void trigger(sig)
    }
    handlers.set(sig, h)
    proc.on(sig, h)
  }

  return {
    trigger,
    uninstall: () => {
      for (const [sig, h] of handlers) proc.off(sig, h)
      handlers.clear()
    },
  }
}
