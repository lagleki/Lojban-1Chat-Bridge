import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import { NotReadyError } from "../../src/reliability/errors"
import { classifySlackError } from "../../src/piers/slack"
import { delay, waitFor } from "../helpers"
import { Harness, Net, resetState, supervise } from "./harness"

const M = "slack_1"

const slackErr = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error(code), { code, ...extra })

function fakeSlack(net: Net) {
  const c: any = {
    posted: [] as any[],
    rtm: {
      connected: true,
      removed: false,
      removeAllListeners: () => void (c.rtm.removed = true),
      disconnect: async () => void (c.rtm.connected = false),
    },
    web: {
      auth: { test: async () => net.check() },
      chat: {
        postMessage: async (p: any) => {
          if (!net.online) throw slackErr("slack_webapi_request_error")
          c.posted.push(p)
          return { ok: true }
        },
      },
    },
  }
  return c
}

let h: Harness | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
})

describe("slack pier", () => {
  test("classifySlackError", () => {
    assert.deepEqual(
      classifySlackError(
        slackErr("slack_webapi_rate_limited_error", { retryAfter: 3 }),
      ),
      {
        kind: "transient",
        retryAfterMs: 3000,
        reason: "rate limited",
      },
    )
    assert.equal(
      classifySlackError(slackErr("slack_webapi_request_error"))?.kind,
      "transient",
    )
    assert.equal(
      classifySlackError(slackErr("slack_webapi_http_error"))?.kind,
      "transient",
    )
    for (const e of [
      "ratelimited",
      "internal_error",
      "fatal_error",
      "service_unavailable",
      "request_timeout",
    ])
      assert.equal(
        classifySlackError(
          slackErr("slack_webapi_platform_error", { data: { error: e } }),
        )?.kind,
        "transient",
        e,
      )
    for (const e of [
      "channel_not_found",
      "not_in_channel",
      "invalid_auth",
      "msg_too_long",
    ])
      assert.equal(
        classifySlackError(
          slackErr("slack_webapi_platform_error", { data: { error: e } }),
        )?.kind,
        "permanent",
        e,
      )
    assert.equal(classifySlackError(new Error("other")), undefined)
  })

  test("sendTo: NotReady without client, throws on failure, truncates username", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    await assert.rejects(
      pierObj.slack.sendTo({ messenger: M, channelId: "C1", chunk: "x" }),
      NotReadyError,
    )
    const net = new Net()
    const c = fakeSlack(net)
    generic[M].client = c
    await pierObj.slack.sendTo({
      messenger: M,
      channelId: "C1",
      author: "a".repeat(30),
      chunk: "hi",
    })
    assert.equal(c.posted[0].username.length, 21)
    assert.equal(c.posted[0].text, "hi")
    net.online = false
    await assert.rejects(
      pierObj.slack.sendTo({ messenger: M, channelId: "C1", chunk: "x" }),
    )
  })

  test("health: RTM connected, auth.test probe, stop disconnects", async () => {
    const { pierObj, generic } = resetState({ [M]: { token: "t" } })
    const net = new Net()
    const c = fakeSlack(net)
    generic[M].client = c
    const hh = pierObj.slack.health(M)
    assert.equal(hh.nativeRecoveryMs, 30000)
    assert.equal(hh.isReady(), true)
    await hh.probe()
    net.online = false
    await assert.rejects(hh.probe())
    await hh.stop()
    assert.equal(generic[M].client, null)
    assert.ok(c.rtm.removed)
    assert.equal(hh.isReady(), false)
  })

  test("offline -> online: replay in order after RTM reconnects natively", async () => {
    const { generic } = resetState({ [M]: { token: "t" } })
    const net = new Net()
    const c = fakeSlack(net)
    let starts = 0
    h = supervise(
      M,
      "slack",
      async () => {
        starts++
        generic[M].client = c
      },
      { nativeRecoveryMs: 5000 },
    )
    await waitFor(() => h!.manager.isReady(M))
    net.online = false
    c.rtm.connected = false
    for (const n of ["1", "2", "3"])
      h.enqueue({ channelId: "C1", author: "a", chunk: n })
    await delay(40)
    assert.equal(c.posted.length, 0)
    net.online = true
    c.rtm.connected = true // the RTM client's own reconnect
    await waitFor(() => c.posted.length === 3, 3000)
    assert.deepEqual(
      c.posted.map((p: any) => p.text),
      ["1", "2", "3"],
    )
    assert.equal(starts, 1) // within the native window: no restart
  })
})
