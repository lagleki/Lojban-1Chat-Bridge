import { TimeoutError } from "./errors"

/** Rejects with TimeoutError if `promise` does not settle within `ms`. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  what = "operation",
): Promise<T> {
  if (!(ms > 0) || !Number.isFinite(ms)) return promise
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new TimeoutError(`${what} timed out after ${ms}ms`)),
      ms,
    )
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

/**
 * A resettable wake-up signal: `wait(ms)` resolves after `ms` or as soon as
 * `notify()` is called, whichever comes first.
 */
export class Signal {
  private waiters: Array<() => void> = []
  private pending = false

  /** Wake every current waiter (or the next one, if nobody waits yet). */
  notify(): void {
    if (this.waiters.length === 0) {
      this.pending = true
      return
    }
    const w = this.waiters
    this.waiters = []
    for (const fn of w) fn()
  }

  /** Resolves `true` if woken by notify(), `false` on timeout. */
  wait(ms: number): Promise<boolean> {
    if (this.pending) {
      this.pending = false
      return Promise.resolve(true)
    }
    return new Promise<boolean>((resolve) => {
      let done = false
      const timer = setTimeout(
        () => {
          if (done) return
          done = true
          this.waiters = this.waiters.filter((w) => w !== wake)
          resolve(false)
        },
        Math.max(0, ms),
      )
      const wake = () => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(true)
      }
      this.waiters.push(wake)
    })
  }
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)))
