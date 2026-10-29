/**
 * Error classification for outbound delivery.
 *
 * - `transient`: network trouble, timeouts, rate limits, 5xx. Retry forever.
 * - `not_ready`: the peer is not connected/ready yet. Retry once it is ready.
 * - `permanent`: the target rejected the message for good (bad request,
 *   unknown channel, missing permissions). Retrying will not help.
 *
 * Unknown errors are treated as transient so that nothing is dropped by mistake.
 */
export type ErrorKind = "transient" | "permanent" | "not_ready"

export interface ErrorClassification {
  kind: ErrorKind
  /** Server-requested wait before the next attempt (e.g. HTTP 429). */
  retryAfterMs?: number
  reason?: string
}

/** Thrown by a pier when it cannot send because it is not connected/ready. */
export class NotReadyError extends Error {
  constructor(message = "peer is not ready") {
    super(message)
    this.name = "NotReadyError"
  }
}

/** Thrown by a pier when the target definitely rejected the message. */
export class PermanentSendError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message)
    this.name = "PermanentSendError"
  }
}

/** Thrown when an operation took longer than allowed. */
export class TimeoutError extends Error {
  constructor(message = "operation timed out") {
    super(message)
    this.name = "TimeoutError"
  }
}

const NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "EPIPE",
  "ENETUNREACH",
  "ENETDOWN",
  "EHOSTUNREACH",
  "EHOSTDOWN",
  "ENONET",
  "EPROTO",
  "ERR_SOCKET_CLOSED",
  "ERR_STREAM_DESTROYED",
  "EFATAL", // node-telegram-bot-api: network-level failure
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
])

const NETWORK_ERROR_NAMES = new Set([
  "FetchError",
  "AbortError",
  "TimeoutError",
  "HTTPError", // discord.js network/HTTP layer failure
  "RequestError",
])

function asRecord(err: unknown): Record<string, any> {
  return err && typeof err === "object" ? (err as Record<string, any>) : {}
}

/** Best-effort extraction of an HTTP status from the many error shapes in use. */
export function httpStatusOf(err: unknown): number | undefined {
  const e = asRecord(err)
  const candidates = [
    e.httpStatus, // discord.js DiscordAPIError
    e.status, // MAX MaxError, fetch-like
    e.statusCode,
    e.response?.statusCode, // node-telegram-bot-api, request
    e.response?.status, // axios
  ]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isInteger(n) && n >= 100 && n < 600) return n
  }
  return undefined
}

/** Best-effort extraction of a server-requested retry delay, in ms. */
export function retryAfterMsOf(err: unknown): number | undefined {
  const e = asRecord(err)
  const sec =
    e.response?.body?.parameters?.retry_after ?? // Telegram
    e.parameters?.retry_after ??
    e.retry_after
  if (sec !== undefined && Number.isFinite(Number(sec)))
    return Number(sec) * 1000
  const ms = e.retryAfter ?? e.retry_after_ms
  if (ms !== undefined && Number.isFinite(Number(ms))) return Number(ms)
  const header =
    e.response?.headers?.["retry-after"] ?? e.headers?.["retry-after"]
  if (header !== undefined && Number.isFinite(Number(header)))
    return Number(header) * 1000
  return undefined
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  if (typeof err === "string") return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/** Generic classifier used when a pier has no opinion of its own. */
export function classifyError(err: unknown): ErrorClassification {
  if (err instanceof NotReadyError)
    return { kind: "not_ready", reason: err.message }
  if (err instanceof PermanentSendError)
    return { kind: "permanent", reason: err.message }
  if (err instanceof TimeoutError)
    return { kind: "transient", reason: err.message }

  const e = asRecord(err)
  const retryAfterMs = retryAfterMsOf(err)
  const code = typeof e.code === "string" ? e.code : undefined
  const causeCode =
    typeof e.cause?.code === "string" ? (e.cause.code as string) : undefined
  if (
    (code && NETWORK_CODES.has(code)) ||
    (causeCode && NETWORK_CODES.has(causeCode)) ||
    (typeof e.errno === "string" && NETWORK_CODES.has(e.errno)) ||
    (typeof e.name === "string" && NETWORK_ERROR_NAMES.has(e.name))
  )
    return { kind: "transient", retryAfterMs, reason: code ?? e.name }

  const status = httpStatusOf(err)
  if (status !== undefined) {
    if (status === 408 || status === 425 || status === 429 || status >= 500)
      return { kind: "transient", retryAfterMs, reason: `HTTP ${status}` }
    if (status >= 400) return { kind: "permanent", reason: `HTTP ${status}` }
  }
  return { kind: "transient", retryAfterMs, reason: "unclassified error" }
}
