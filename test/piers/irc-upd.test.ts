/**
 * IRC pier against the real irc-upd client and a local server that answers
 * like Libera (Solanum): `PING tok` -> `:srv PONG srv :tok`, JOIN, NAMES end.
 *
 * Reproduces the production loop: with `floodProtection` irc-upd queues
 * *every* command (NICK, JOIN, MODE, PING...) one per `floodProtectionDelay`.
 * After a connect with 18 channels the queue holds ~40 s of JOIN/MODE, so a
 * PING sent through it is answered long after the 15 s probe timeout and the
 * healthy connection was torn down again and again.
 */
import { after, afterEach, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import net from "net"
import type { AddressInfo } from "net"
import { EventEmitter } from "events"
import { parseMessage } from "./irc-parse"
import {
  ircConnected,
  ircProbe,
  ircQueueDelayMs,
  ircRoundTrip,
  IRC_MIN_RECONNECT_MS,
} from "../../src/piers/irc"
import { delay, waitFor } from "../helpers"
import { Harness, resetState, supervise } from "./harness"
import { generic, pierObj } from "../../src/piers/state"

const M = "irc_libera"
const CHANNELS = Array.from({ length: 18 }, (_, i) => `#chan${i}`)

class FakeIrcd extends EventEmitter {
  server = net.createServer((s) => this.accept(s))
  sockets = new Set<net.Socket>()
  lines: string[] = []
  mute = false
  port = 0
  private accept(sock: net.Socket) {
    this.sockets.add(sock)
    sock.on("close", () => this.sockets.delete(sock))
    sock.on("error", () => {})
    let buf = ""
    let nick = "bridge"
    const w = (l: string) => !sock.destroyed && sock.write(`${l}\r\n`)
    sock.on("data", (d) => {
      buf += d.toString()
      const parts = buf.split("\r\n")
      buf = parts.pop() ?? ""
      for (const line of parts) {
        this.lines.push(line)
        this.emit("line", line)
        if (this.mute) continue
        const [cmd, ...args] = line.split(" ")
        if (cmd === "NICK") nick = args[0]
        if (cmd === "USER") {
          w(`:srv 001 ${nick} :Welcome to the Libera.Chat network ${nick}!u@h`)
          w(`:srv 376 ${nick} :End of /MOTD command.`)
        }
        if (cmd === "PING")
          w(`:srv PONG srv :${args.join(" ").replace(/^:/, "")}`)
        if (cmd === "JOIN") {
          const ch = args[0]
          w(`:${nick}!u@h JOIN ${ch}`)
          w(`:srv 366 ${nick} ${ch} :End of /NAMES list.`)
        }
      }
    })
  }
  async listen() {
    await new Promise<void>((r) => this.server.listen(0, "127.0.0.1", r))
    this.port = (this.server.address() as AddressInfo).port
  }
  close() {
    for (const s of this.sockets) s.destroy()
    this.server.close()
  }
}

let ircd: FakeIrcd
before(async () => {
  ircd = new FakeIrcd()
  await ircd.listen()
})
after(() => ircd.close())

let h: Harness | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
  if (generic[M]?.client) await pierObj.irc.health(M).stop()
  ircd.mute = false
  ircd.lines.length = 0
})

function setup(floodProtectionDelay = 40) {
  const env = resetState({
    [M]: {
      ircServer: "127.0.0.1",
      ircOptions: {
        nick: "bridge",
        port: ircd.port,
        floodProtection: true,
        floodProtectionDelay,
        autoRejoin: true,
        retryCount: 0,
      },
    },
  })
  env.state.config.new_channels = CHANNELS.map((c) => ({ [M]: c }))
  return env
}

describe("irc pier with real irc-upd", () => {
  test("irc-upd PONG shape: token is args[1]; the 'pong' event only has the server name", () => {
    const m = parseMessage(":srv PONG srv :bridge-abc")
    assert.equal(m.command, "PONG")
    assert.deepEqual(m.args, ["srv", "bridge-abc"])
  })

  test("prod bug: a PING behind the flood queue misses the probe timeout; ircProbe does not", async () => {
    const { pierObj, generic } = setup(40)
    await pierObj.irc.StartService({ messenger: M })
    const client = generic[M].client
    await waitFor(() => ircConnected(M), 3000)
    // joins + MODE requests are queued right after the MOTD
    await waitFor(() => client.cmdQueue.length > 10, 3000)
    const queued = ircQueueDelayMs(client)
    assert.ok(queued >= 400, `queue holds ${queued}ms`)
    // the old probe: queued PING, timeout shorter than the queue
    await assert.rejects(ircRoundTrip(M, queued / 4), /no PONG/)
    // the new probe: recent traffic is proof of life, no PING needed
    const t0 = Date.now()
    await ircProbe(M)
    assert.ok(Date.now() - t0 < 100)
    // and a round trip whose timeout accounts for the queue succeeds
    await ircRoundTrip(M)
  })

  test("a quiet link is PINGed immediately (bypassing the queue) and any reply counts", async () => {
    const { pierObj, generic } = setup(1000) // 1 cmd/s like prod
    await pierObj.irc.StartService({ messenger: M })
    const client = generic[M].client
    await waitFor(() => ircConnected(M), 5000)
    await waitFor(() => client.cmdQueue.length > 5, 3000)
    generic[M].lastRxAt = Date.now() - 10 * 60 * 1000 // pretend: silence
    const before = ircd.lines.length
    const t0 = Date.now()
    await ircProbe(M, 3000)
    assert.ok(Date.now() - t0 < 1000, "answered without waiting for the queue")
    assert.ok(
      ircd.lines.slice(before).some((l) => l.startsWith("PING bridge-probe-")),
    )
    assert.ok(client.cmdQueue.length > 0, "queued JOINs were not flushed")
  })

  test("a dead link (server stops answering) fails the probe", async () => {
    const { pierObj, generic } = setup(10)
    await pierObj.irc.StartService({ messenger: M })
    await waitFor(() => ircConnected(M), 3000)
    ircd.mute = true
    generic[M].lastRxAt = 0
    await assert.rejects(ircProbe(M, 100), /no reply to PING/)
  })

  test("sendTo: PRIVMSG then PING in order, confirmed after the queue drains", async () => {
    const { pierObj, generic } = setup(20)
    await pierObj.irc.StartService({ messenger: M })
    await waitFor(() => ircConnected(M), 3000)
    await waitFor(() => !!generic[M].client.chans["#chan0"], 3000)
    await pierObj.irc.sendTo({
      messenger: M,
      channelId: "#chan0",
      chunk: "coi",
    })
    const i = ircd.lines.indexOf("PRIVMSG #chan0 coi")
    const j = ircd.lines.findIndex(
      (l, k) => k > i && /^PING bridge-[0-9a-f]+$/.test(l),
    )
    assert.ok(i >= 0 && j > i, ircd.lines.slice(-5).join(" | "))
  })

  test("health: never reconnects faster than once a minute, generous send timeout", () => {
    const { pierObj } = setup()
    const hh = pierObj.irc.health(M)
    assert.equal(hh.minRestartDelayMs, IRC_MIN_RECONNECT_MS)
    assert.ok(IRC_MIN_RECONNECT_MS >= 30000)
    assert.ok(hh.sendTimeoutMs >= 60000)
  })

  test("StartService raises irc-upd's 2 s retryDelay", async () => {
    const { pierObj, state } = setup()
    await pierObj.irc.StartService({ messenger: M })
    assert.ok(state.config.piers[M].ircOptions.retryDelay >= 60000)
  })

  test("stop sends QUIT immediately and does not flush the flood queue", async () => {
    const { pierObj, generic } = setup(1000)
    await pierObj.irc.StartService({ messenger: M })
    const client = generic[M].client
    await waitFor(() => ircConnected(M), 5000)
    await waitFor(() => client.cmdQueue.length > 5, 3000)
    const joinsBefore = ircd.lines.filter((l) => l.startsWith("JOIN")).length
    await pierObj.irc.health(M).stop()
    await waitFor(() => ircd.lines.some((l) => l.startsWith("QUIT")), 2000)
    await delay(50)
    const joinsAfter = ircd.lines.filter((l) => l.startsWith("JOIN")).length
    assert.equal(joinsAfter, joinsBefore)
  })

  test("supervised: becomes ready once and stays up (no reconnect loop)", async () => {
    const { pierObj } = setup(30)
    let starts = 0
    h = supervise(
      M,
      "irc",
      async () => {
        starts++
        await pierObj.irc.StartService({ messenger: M })
      },
      {},
      { probeIntervalMs: 20, probeTimeoutMs: 300, readyTimeoutMs: 5000 },
    )
    await waitFor(() => h!.manager.isReady(M), 5000)
    h.enqueue({ channelId: "#chan1", author: "a", chunk: "hi" })
    await waitFor(() => ircd.lines.includes("PRIVMSG #chan1 hi"), 5000)
    await delay(300) // many probe intervals while the queue is busy
    assert.equal(h.manager.isReady(M), true)
    assert.equal(starts, 1)
  })
})
