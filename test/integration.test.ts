import { describe, test } from "node:test"
import assert from "node:assert/strict"
import path from "path"
import {
  buildAdapter,
  createManagerFromConfig,
  guardedGetChannels,
  resolveOutboxPath,
} from "../src/reliability/integration"

describe("integration helpers", () => {
  test("buildAdapter: defaults to StartService and always-ready", async () => {
    const calls: unknown[] = []
    const pier = {
      StartService: async (a: unknown) => void calls.push(["start", a]),
      sendTo: async (a: unknown) => void calls.push(["send", a]),
    }
    const ad = buildAdapter("slack_1", pier)
    assert.equal(ad.name, "slack_1")
    assert.equal(ad.isReady(), true)
    await ad.start()
    await ad.send(
      { channelId: "c", author: "a", chunk: "hi" },
      { id: 1, attempt: 2, deliveryKey: "db:1", enqueuedAt: 5 },
    )
    assert.deepEqual(calls, [
      ["start", { messenger: "slack_1" }],
      [
        "send",
        {
          channelId: "c",
          author: "a",
          chunk: "hi",
          messenger: "slack_1",
          deliveryKey: "db:1",
          attempt: 2,
          enqueuedAt: 5,
        },
      ],
    ])
  })

  test("buildAdapter: uses the pier's health hooks", async () => {
    let probed = false
    const ad = buildAdapter("irc_1", {
      sendTo: async () => {},
      health: (m: string) => ({
        isReady: () => m === "irc_1",
        probe: async () => {
          probed = true
        },
        nativeRecoveryMs: 60000,
      }),
    })
    assert.equal(ad.isReady(), true)
    await ad.probe!()
    assert.ok(probed)
    assert.equal(ad.nativeRecoveryMs, 60000)
  })

  test("buildAdapter: send without sendTo fails loudly", async () => {
    const ad = buildAdapter("x", {})
    await assert.rejects(
      ad.send({}, { id: 1, attempt: 1, deliveryKey: "k", enqueuedAt: 0 }),
    )
  })

  test("resolveOutboxPath", () => {
    assert.equal(
      resolveOutboxPath(undefined, "/d"),
      path.join("/d", "outbox.sqlite"),
    )
    assert.equal(resolveOutboxPath("q/o.db", "/d"), path.join("/d", "q/o.db"))
    assert.equal(resolveOutboxPath("/abs/o.db", "/d"), "/abs/o.db")
    assert.equal(resolveOutboxPath(":memory:", "/d"), ":memory:")
  })

  test("createManagerFromConfig maps config.generic", async () => {
    const m = createManagerFromConfig(
      {
        outbox: { dbPath: ":memory:", sendTimeoutMs: 1234, retryInitialMs: 7 },
        health: { probeIntervalMs: 999, reconnectMaxMs: 5555 },
      },
      "/nonexistent",
      () => {},
    )
    const sup = m.register({
      name: "x",
      start: async () => {},
      isReady: () => true,
      send: async () => {},
    })
    assert.equal(sup.options.sendTimeoutMs, 1234)
    assert.equal(sup.options.probeIntervalMs, 999)
    assert.equal(sup.options.sendBackoff.initialMs, 7)
    assert.equal(sup.options.restartBackoff.maxMs, 5555)
    assert.ok(m.monitor)
    await m.stop()
    m.close()
  })

  test("guardedGetChannels keeps the known channels when offline", async () => {
    const cache: Record<string, any> = { telegram_1: { a: 1, b: 2 } }
    // failure: cache untouched
    await guardedGetChannels(cache, "telegram_1", async () => {
      throw new Error("ENOTFOUND")
    })
    assert.deepEqual(cache.telegram_1, { a: 1, b: 2 })
    // empty result (offline) must not wipe it
    await guardedGetChannels(cache, "telegram_1", async (p) => {
      cache[p] = {}
    })
    assert.deepEqual(cache.telegram_1, { a: 1, b: 2 })
    // fresh data is merged in
    await guardedGetChannels(cache, "telegram_1", async (p) => {
      cache[p] = { b: 3, c: 4 }
    })
    assert.deepEqual(cache.telegram_1, { a: 1, b: 3, c: 4 })
    // nothing known before: plain result
    await guardedGetChannels(cache, "new", async (p) => {
      cache[p] = { z: 1 }
    })
    assert.deepEqual(cache.new, { z: 1 })
  })
})
