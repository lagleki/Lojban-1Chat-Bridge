import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import { EventEmitter } from "events"
import { NotReadyError } from "../../src/reliability/errors"
import { ircConnected, ircRoundTrip } from "../../src/piers/irc"
import { delay, waitFor } from "../helpers"
import { Harness, Net, resetState, supervise } from "./harness"

const M = "irc_1"

/** irc-upd-like client: PING is answered with PONG only while online. */
function fakeIrc(net: Net) {
  const conn: any = new EventEmitter()
  conn.readyState = "open"
  conn.requestedDisconnect = false
  conn.destroyed = false
  const client: any = new EventEmitter()
  Object.assign(client, {
    conn,
    nick: "bridge",
    chans: { "#lojban": {} } as Record<string, unknown>,
    said: [] as string[],
    log: [] as string[],
    answerPings: true,
    say(channel: string, line: string) {
      client.log.push(`PRIVMSG ${channel} :${line}`)
      if (net.online) client.said.push(line)
    },
    join(channel: string) {
      client.log.push(`JOIN ${channel}`)
      setImmediate(() => {
        client.chans[channel.toLowerCase()] = {}
        client.emit("join", channel, client.nick)
      })
    },
    send(cmd: string, token: string) {
      client.log.push(`${cmd} ${token}`)
      if (cmd === "PING" && net.online && client.answerPings)
        setImmediate(() =>
          client.emit("raw", { command: "PONG", args: ["irc.server", token] }),
        )
    },
  })
  return client
}

function install(generic: any, client: any) {
  generic[M].client = client
  generic[M].registeredConn = client.conn
  generic[M].registeredAt = Date.now()
}

let h: Harness | undefined
afterEach(async () => {
  await h?.stop()
  h = undefined
})

describe("irc pier", () => {
  test("ircConnected requires an open, registered, current connection", () => {
    const { generic } = resetState({ [M]: {} })
    assert.equal(ircConnected(M), false)
    const client = fakeIrc(new Net())
    generic[M].client = client
    assert.equal(ircConnected(M), false) // not registered (no 001 yet)
    generic[M].registeredConn = client.conn
    assert.equal(ircConnected(M), true)
    client.conn.readyState = "closed"
    assert.equal(ircConnected(M), false)
    client.conn.readyState = "open"
    client.conn.requestedDisconnect = true
    assert.equal(ircConnected(M), false)
  })

  test("PING/PONG round trip: matching token only", async () => {
    const { generic } = resetState({ [M]: {} })
    const client = fakeIrc(new Net())
    install(generic, client)
    client.answerPings = false
    const p = ircRoundTrip(M, 500)
    const token = client.log.at(-1).split(" ")[1]
    client.emit("raw", { command: "PONG", args: ["s", "someone-else"] })
    client.emit("raw", { command: "PRIVMSG", args: [token] })
    let settled = false
    void p.then(() => (settled = true))
    await delay(10)
    assert.equal(settled, false)
    client.emit("raw", { command: "PONG", args: ["s", token] })
    await p
  })

  test("round trip fails on ping timeout, closed socket, or not connected", async () => {
    const { generic } = resetState({ [M]: {} })
    const net = new Net()
    const client = fakeIrc(net)
    install(generic, client)
    net.online = false
    await assert.rejects(ircRoundTrip(M, 20), /no PONG/)
    const p = ircRoundTrip(M, 1000)
    client.conn.emit("close")
    await assert.rejects(p, /closed/)
    generic[M].registeredConn = null
    await assert.rejects(ircRoundTrip(M, 20), NotReadyError)
  })

  test("sendTo is confirmed by the PONG that follows the PRIVMSG", async () => {
    const { pierObj, generic } = resetState({ [M]: {} })
    const client = fakeIrc(new Net())
    install(generic, client)
    await pierObj.irc.sendTo({
      messenger: M,
      channelId: "#lojban",
      chunk: "coi",
    })
    assert.deepEqual(client.said, ["coi"])
    const i = client.log.indexOf("PRIVMSG #lojban :coi")
    assert.ok(i >= 0 && client.log[i + 1].startsWith("PING bridge-"))
  })

  test("sendTo joins a channel it is not in first", async () => {
    const { pierObj, generic } = resetState({ [M]: {} })
    const client = fakeIrc(new Net())
    install(generic, client)
    await pierObj.irc.sendTo({ messenger: M, channelId: "#New", chunk: "hi" })
    assert.deepEqual(client.log.slice(0, 2), ["JOIN #New", "PRIVMSG #New :hi"])
  })

  test("sendTo on a dead link is not confirmed (no silent loss)", async () => {
    const { pierObj, generic } = resetState({ [M]: {} })
    const net = new Net()
    const client = fakeIrc(net)
    install(generic, client)
    net.online = false
    const res = await Promise.race([
      pierObj.irc
        .sendTo({ messenger: M, channelId: "#lojban", chunk: "lost?" })
        .then(() => "confirmed"),
      delay(50).then(() => "pending"),
    ])
    assert.equal(res, "pending")
  })

  test("health: ready once channels are joined (or after the grace period)", () => {
    const { pierObj, generic, state } = resetState({
      [M]: { ircOptions: { channels: ["#lojban", "#ckule key"] } },
    })
    const client = fakeIrc(new Net())
    install(generic, client)
    const hh = pierObj.irc.health(M)
    assert.equal(hh.isReady(), false) // #ckule not joined yet
    client.chans["#ckule"] = {}
    assert.equal(hh.isReady(), true)
    delete client.chans["#ckule"]
    generic[M].registeredAt = Date.now() - 60_000
    assert.equal(hh.isReady(), true)
    assert.equal(state.config.piers[M].ircOptions.channels.length, 2)
  })

  test("health.stop disconnects and forgets the connection", async () => {
    const { pierObj, generic } = resetState({ [M]: {} })
    const client = fakeIrc(new Net())
    let disconnected = false
    client.disconnect = () => (disconnected = true)
    install(generic, client)
    await pierObj.irc.health(M).stop()
    assert.ok(disconnected)
    assert.equal(generic[M].client, null)
    assert.equal(ircConnected(M), false)
    client.emit("error", new Error("late")) // must not throw
  })

  test("offline -> online: silent drop caught by PING probe, then replay", async () => {
    const { generic } = resetState({ [M]: {} })
    const net = new Net()
    let client = fakeIrc(net)
    h = supervise(
      M,
      "irc",
      async () => {
        net.check("ENETUNREACH")
        client = fakeIrc(net)
        install(generic, client)
      },
      { nativeRecoveryMs: 0, minRestartDelayMs: 0 },
      { probeIntervalMs: 10 },
    )
    await waitFor(() => h!.manager.isReady(M))
    h.enqueue({ channelId: "#lojban", author: "a", chunk: "1" })
    await waitFor(() => client.said.length === 1)
    net.online = false // socket still "open", nothing gets through
    await waitFor(() => !h!.manager.isReady(M), 2000)
    for (const n of ["2", "3"])
      h.enqueue({ channelId: "#lojban", author: "a", chunk: n })
    await delay(30)
    net.online = true
    await waitFor(() => client.said.length === 2, 3000)
    assert.deepEqual(client.said, ["2", "3"]) // new connection got both, in order
    assert.equal(h.manager.outbox.pendingCount(M), 0)
  })
})
