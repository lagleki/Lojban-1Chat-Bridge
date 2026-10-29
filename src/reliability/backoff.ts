/**
 * Exponential backoff with jitter. Never gives up: once `maxMs` is reached
 * every further delay stays around `maxMs`.
 */
export interface BackoffOptions {
  /** First delay, ms. */
  initialMs: number
  /** Upper bound for a single delay, ms. */
  maxMs: number
  /** Growth factor per attempt (2 = doubling). */
  factor: number
  /**
   * Fraction of the delay that is randomised (0 = none, 1 = "full jitter").
   * The resulting delay is in `[base * (1 - jitter), base]`.
   */
  jitter: number
}

export const DEFAULT_BACKOFF: BackoffOptions = {
  initialMs: 1000,
  maxMs: 5 * 60 * 1000,
  factor: 2,
  jitter: 0.5,
}

export class Backoff {
  private attempt = 0
  readonly options: BackoffOptions

  constructor(
    options: Partial<BackoffOptions> = {},
    private readonly random: () => number = Math.random,
  ) {
    this.options = { ...DEFAULT_BACKOFF, ...options }
    if (this.options.initialMs < 0) this.options.initialMs = 0
    if (this.options.maxMs < this.options.initialMs)
      this.options.maxMs = this.options.initialMs
    if (this.options.factor < 1) this.options.factor = 1
    this.options.jitter = Math.min(1, Math.max(0, this.options.jitter))
  }

  /** Number of delays handed out since the last reset. */
  get attempts(): number {
    return this.attempt
  }

  /** Base (un-jittered) delay for the given attempt number. */
  baseDelay(attempt: number): number {
    const { initialMs, maxMs, factor } = this.options
    // avoid Infinity for very large attempt counts
    const exp = Math.min(attempt, 64)
    return Math.min(maxMs, initialMs * Math.pow(factor, exp))
  }

  /** Returns the next delay and advances the attempt counter. */
  next(): number {
    const base = this.baseDelay(this.attempt)
    this.attempt++
    const r = Math.min(1, Math.max(0, this.random()))
    return Math.round(base - base * this.options.jitter * r)
  }

  reset(): void {
    this.attempt = 0
  }
}
