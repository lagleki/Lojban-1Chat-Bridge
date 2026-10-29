import { describe, test } from "node:test"
import assert from "node:assert/strict"
import {
  classifyError,
  errorMessage,
  httpStatusOf,
  NotReadyError,
  PermanentSendError,
  retryAfterMsOf,
  TimeoutError,
} from "../src/reliability/errors"
import { netError } from "./helpers"

describe("classifyError", () => {
  test("own error types", () => {
    assert.equal(classifyError(new NotReadyError()).kind, "not_ready")
    assert.equal(classifyError(new PermanentSendError("x")).kind, "permanent")
    assert.equal(classifyError(new TimeoutError()).kind, "transient")
  })

  test("network failures are transient", () => {
    for (const code of [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
      "ENETUNREACH",
      "EFATAL",
      "UND_ERR_SOCKET",
    ])
      assert.equal(classifyError(netError(code)).kind, "transient", code)
    assert.equal(
      classifyError({ cause: { code: "ECONNREFUSED" } }).kind,
      "transient",
    )
    assert.equal(classifyError({ name: "FetchError" }).kind, "transient")
    assert.equal(classifyError({ name: "AbortError" }).kind, "transient")
  })

  test("HTTP statuses", () => {
    assert.equal(classifyError({ httpStatus: 500 }).kind, "transient")
    assert.equal(classifyError({ status: 503 }).kind, "transient")
    assert.equal(classifyError({ response: { status: 408 } }).kind, "transient")
    assert.equal(classifyError({ statusCode: 429 }).kind, "transient")
    assert.equal(classifyError({ httpStatus: 403 }).kind, "permanent")
    assert.equal(
      classifyError({ response: { statusCode: 400 } }).kind,
      "permanent",
    )
    assert.equal(classifyError({ response: { status: 404 } }).kind, "permanent")
  })

  test("unknown errors are transient (never drop a message on a guess)", () => {
    assert.equal(classifyError(new Error("weird")).kind, "transient")
    assert.equal(classifyError("string error").kind, "transient")
    assert.equal(classifyError(undefined).kind, "transient")
  })

  test("telegram 429 carries retry_after", () => {
    const err = {
      code: "ETELEGRAM",
      response: { statusCode: 429, body: { parameters: { retry_after: 7 } } },
    }
    const c = classifyError(err)
    assert.equal(c.kind, "transient")
    assert.equal(c.retryAfterMs, 7000)
  })
})

describe("error helpers", () => {
  test("httpStatusOf", () => {
    assert.equal(httpStatusOf({ httpStatus: 404 }), 404)
    assert.equal(httpStatusOf({ response: { status: "502" } }), 502)
    assert.equal(httpStatusOf({ status: 42 }), undefined)
    assert.equal(httpStatusOf(null), undefined)
  })

  test("retryAfterMsOf", () => {
    assert.equal(retryAfterMsOf({ parameters: { retry_after: 2 } }), 2000)
    assert.equal(retryAfterMsOf({ retryAfter: 1500 }), 1500)
    assert.equal(
      retryAfterMsOf({ response: { headers: { "retry-after": "3" } } }),
      3000,
    )
    assert.equal(retryAfterMsOf({}), undefined)
  })

  test("errorMessage", () => {
    assert.equal(errorMessage(new TimeoutError("t")), "TimeoutError: t")
    assert.equal(errorMessage("s"), "s")
    assert.equal(errorMessage({ a: 1 }), '{"a":1}')
  })
})
