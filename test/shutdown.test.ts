import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { EventEmitter } from "events"
import { spawn } from "child_process"
import path from "path"
import { installShutdown } from "../src/reliability/shutdown"

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

function setup(over: Partial<Parameters<typeof installShutdown>[0]> = {}) {
  const proc = new EventEmitter()
  const exits: number[] = []
  const calls: string[] = []
  const h = installShutdown({
    proc,
    exit: (c) => exits.push(c),
    stop: async () => {
      calls.push("stop")
    },
    close: () => calls.push("close"),
    ...over,
  })
  return { proc, exits, calls, h }
}

describe("installShutdown", () => {
  it("SIGTERM stops, closes the db, then exits 0", async () => {
    const { proc, exits, calls, h } = setup()
    proc.emit("SIGTERM")
    await tick(5)
    assert.deepEqual(calls, ["stop", "close"])
    assert.deepEqual(exits, [0])
    h.uninstall()
  })

  it("SIGINT is handled too and a repeated trigger is idempotent", async () => {
    const { proc, exits, calls, h } = setup()
    proc.emit("SIGINT")
    await h.trigger("again")
    await tick(5)
    assert.deepEqual(calls, ["stop", "close"])
    assert.deepEqual(exits, [0])
    h.uninstall()
  })

  it("a hanging stop() is abandoned; close() still runs and we exit", async () => {
    const calls: string[] = []
    const { proc, exits, h } = setup({
      stop: () => new Promise<void>(() => {}),
      close: () => calls.push("close"),
      stopTimeoutMs: 30,
      hardTimeoutMs: 1000,
    })
    const t0 = Date.now()
    proc.emit("SIGTERM")
    await tick(80)
    assert.deepEqual(calls, ["close"])
    assert.deepEqual(exits, [0])
    assert.ok(Date.now() - t0 < 500)
    h.uninstall()
  })

  it("stop() errors do not prevent close() and exit", async () => {
    const calls: string[] = []
    const { proc, exits, h } = setup({
      stop: async () => {
        throw new Error("boom")
      },
      close: () => calls.push("close"),
    })
    proc.emit("SIGTERM")
    await tick(5)
    assert.deepEqual(calls, ["close"])
    assert.deepEqual(exits, [0])
    h.uninstall()
  })

  it("hard timeout forces exit(1) when stop() outlives it", async () => {
    const { proc, exits, h } = setup({
      stop: () => new Promise<void>(() => {}),
      stopTimeoutMs: 300,
      hardTimeoutMs: 40,
    })
    proc.emit("SIGTERM")
    await tick(100)
    assert.deepEqual(exits, [1])
    h.uninstall()
  })

  it("a second signal during shutdown exits immediately with 1", async () => {
    const { proc, exits, h } = setup({
      stop: () => new Promise<void>(() => {}),
      stopTimeoutMs: 100,
      hardTimeoutMs: 200,
    })
    proc.emit("SIGTERM")
    await tick(5)
    proc.emit("SIGINT")
    assert.deepEqual(exits, [1])
    h.uninstall()
  })

  it("uninstall removes the handlers", () => {
    const { proc, h } = setup()
    assert.equal(proc.listenerCount("SIGTERM"), 1)
    h.uninstall()
    assert.equal(proc.listenerCount("SIGTERM"), 0)
    assert.equal(proc.listenerCount("SIGINT"), 0)
  })

  it("a real SIGTERM to a node process with live timers/sockets exits promptly", async () => {
    // the child keeps an interval and a listening server alive (as the bridge
    // does) and has a stop() that never finishes; it must still exit
    const root = path.join(__dirname, "..")
    const code = `
      const net = require("net")
      const { installShutdown } = require("./src/reliability/shutdown")
      setInterval(() => {}, 1000)
      const srv = net.createServer().listen(0)
      installShutdown({
        stop: () => new Promise(() => {}),
        close: () => process.stdout.write("closed\\n"),
        stopTimeoutMs: 300,
        hardTimeoutMs: 2000,
      })
      process.stdout.write("ready\\n")
    `
    const child = spawn(
      process.execPath,
      ["--require", "./test/setup.js", "-e", code],
      { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
    )
    let out = ""
    await new Promise<void>((resolve) =>
      child.stdout.on("data", (d: Buffer) => {
        out += d.toString()
        if (out.includes("ready")) resolve()
      }),
    )
    const t0 = Date.now()
    child.kill("SIGTERM")
    const exitCode = await new Promise<number | null>((r) =>
      child.on("exit", (c) => r(c)),
    )
    assert.equal(exitCode, 0)
    assert.ok(out.includes("closed"))
    assert.ok(Date.now() - t0 < 1500, `took ${Date.now() - t0}ms`)
  })
})
