import { escapeHTML } from "../../libs/formatting-converters/generic"
import { hooks } from "../hooks"
import { HTMLSplitter } from "../html-splitter"
import { log } from "../logger"
import { common, generic, pierObj, state } from "../state"
import type { Chunk, IsendToArgs } from "../types"

import Irc from "irc-upd"
import crypto from "crypto"
import {
  NotReadyError,
  PermanentSendError,
  TimeoutError,
} from "../../reliability/errors"
import { reportDown } from "../../reliability/runtime"
import ircolors from "../../libs/formatting-converters/irc-colors-ts"
import html2irc from "../../libs/formatting-converters/html2irc"

function ircChunkToString(chunk: Chunk): string {
  if (typeof chunk === "string") return chunk
  return chunk.main ?? chunk.fallback_solution ?? ""
}

/** Inbound events from irc-upd into `receivedFrom`. */
type IrcReceivedFromPayload =
  | {
      type: "message"
      author: string
      channelId: string
      text: string
    }
  | {
      type: "action"
      author: string
      channelId: string
      text: string
    }
  | {
      type: "notice"
      author: string
      channelId: string
      text: string
    }
  | {
      type: "topic"
      author: string
      channelId: string
      text: string
    }
  | { type: "error"; error: unknown }
  | {
      type: "registered"
      handler: {
        send: (...args: string[]) => void
        join: (channel: string) => void
      }
    }

/** Max wait for the server's PONG that confirms our PRIVMSG went through. */
const IRC_ROUNDTRIP_TIMEOUT_MS = 20000
/** Max wait for a JOIN before a send to that channel. */
const IRC_JOIN_TIMEOUT_MS = 15000
/** After registration, wait at most this long for all channels to be joined. */
const IRC_JOIN_GRACE_MS = 20000

const channelKey = (channelId: string) =>
  String(channelId).split(" ")[0].toLowerCase()

/** Socket open and registered (001 received) on the *current* connection. */
export function ircConnected(messenger: string): boolean {
  const client = generic[messenger]?.client
  const conn = client?.conn
  return (
    !!conn &&
    !conn.requestedDisconnect &&
    !conn.destroyed &&
    conn.readyState === "open" &&
    generic[messenger].registeredConn === conn
  )
}

/**
 * PING the server and wait for the matching PONG on the same connection.
 * IRC handles commands in order, so the PONG proves that everything written
 * before it (e.g. a PRIVMSG) reached the server.
 */
export function ircRoundTrip(
  messenger: string,
  timeoutMs = IRC_ROUNDTRIP_TIMEOUT_MS,
): Promise<void> {
  const client = generic[messenger]?.client
  const conn = client?.conn
  if (!client || !conn || !ircConnected(messenger))
    return Promise.reject(new NotReadyError("irc not connected"))
  const token = `bridge-${crypto.randomBytes(6).toString("hex")}`
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      client.removeListener("raw", onRaw)
      conn.removeListener("close", onClose)
    }
    const onRaw = (message: any) => {
      if (message?.command !== "PONG") return
      if (!(message.args ?? []).includes(token)) return
      cleanup()
      if (client.conn !== conn)
        reject(new Error("irc connection changed while waiting for PONG"))
      else resolve()
    }
    const onClose = () => {
      cleanup()
      reject(new Error("irc connection closed while waiting for PONG"))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new TimeoutError(`irc: no PONG within ${timeoutMs}ms`))
    }, timeoutMs)
    timer.unref?.()
    client.on("raw", onRaw)
    conn.once("close", onClose)
    client.send("PING", token)
  })
}

/** Make sure we are in `channelId`, joining it if needed. */
async function ensureJoined(messenger: string, channelId: string) {
  const client = generic[messenger].client
  const key = channelKey(channelId)
  if (!key.startsWith("#") && !key.startsWith("&")) return // private message
  if (client.chans?.[key]) return
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      client.removeListener("join", onJoin)
      reject(
        new PermanentSendError(
          `irc: could not join ${key} within ${IRC_JOIN_TIMEOUT_MS}ms`,
        ),
      )
    }, IRC_JOIN_TIMEOUT_MS)
    const onJoin = (channel: string, nick: string) => {
      if (channel.toLowerCase() !== key || nick !== client.nick) return
      clearTimeout(timer)
      client.removeListener("join", onJoin)
      resolve()
    }
    client.on("join", onJoin)
    client.join(String(channelId))
  })
}

export function registerPier() {
  pierObj.irc.sendTo = async ({
    messenger,
    channelId,
    author: _author,
    chunk,
    action: _action,
    quotation: _quotation,
    file: _file,
    edited: _edited,
  }: IsendToArgs) => {
    const line = ircChunkToString(chunk)
    log("irc")({ "sending for irc": line })
    if (!ircConnected(messenger))
      throw new NotReadyError(`${messenger}: irc not connected`)
    await ensureJoined(messenger, channelId)
    generic[messenger].client.say(channelId, line)
    // irc has no delivery receipts: a PING/PONG round trip on the same
    // connection confirms the server received the PRIVMSG
    await ircRoundTrip(messenger)
  }

  /** Connection health hooks used by the outbox supervisor. */
  pierObj.irc.health = (messenger: string) => ({
    // irc-upd reconnects by itself (and pings on silence); give it a minute
    nativeRecoveryMs: 60000,
    isReady: () => {
      if (!ircConnected(messenger)) return false
      const client = generic[messenger].client
      const wanted: string[] = (
        state.config.piers[messenger]?.ircOptions?.channels ?? []
      ).map(channelKey)
      const allJoined = wanted.every((c) => !!client.chans?.[c])
      const since = generic[messenger].registeredAt ?? 0
      return allJoined || Date.now() - since > IRC_JOIN_GRACE_MS
    },
    probe: () => ircRoundTrip(messenger),
    stop: async () => {
      const client = generic[messenger]?.client
      if (!client) return
      generic[messenger].client = null
      generic[messenger].registeredConn = null
      client.removeAllListeners()
      client.on("error", () => {}) // late socket errors must not crash
      if (client.retryTimeout) clearTimeout(client.retryTimeout)
      client.deactivateFloodProtection?.()
      try {
        client.disconnect("reconnecting")
      } catch {
        // already gone
      }
      client.end?.()
    },
  })

  pierObj.irc.common.prepareToWhom = function ({
    messenger,
    text,
    targetChannel,
  }: {
    messenger: string
    text: string
    targetChannel: string | number
  }) {
    const ColorificationMode =
      state.config?.channelMapping?.[messenger]?.[targetChannel]?.settings
        ?.nickcolor || "mood"
    return `${ircolors.MoodifyText({
      text,
      mood: ColorificationMode,
    })}: `
  }

  common.prepareToWhom = function ({
    messenger: _messenger,
    text,
    targetChannel: _targetChannel,
  }: {
    messenger: string
    text: string
    targetChannel: string | number
  }) {
    return `${text}: `
  }

  pierObj.irc.common.prepareAuthor = function ({
    messenger,
    text,
    targetChannel,
  }: {
    messenger: string
    text: string
    targetChannel: string | number
  }) {
    const ColorificationMode =
      state.config?.channelMapping?.[messenger]?.[targetChannel]?.settings
        ?.nickcolor || "mood"
    return `${ircolors.MoodifyText({
      text,
      mood: ColorificationMode,
    })}`
  }

  common.prepareAuthor = function ({
    messenger: _messenger,
    text,
    targetChannel: _targetChannel,
  }: {
    messenger: string
    text: string
    targetChannel: string | number
  }) {
    return `${text}`
  }

  pierObj.irc.receivedFrom = async (
    messenger: string,
    payload: IrcReceivedFromPayload,
  ) => {
    const sendFrom = hooks.sendFrom!
    const { config } = state
    if (!config?.channelMapping[messenger]) return

    switch (payload.type) {
      case "message": {
        const { channelId } = payload
        let { author, text } = payload
        if (text.search(new RegExp(config.spamremover.irc.source, "i")) >= 0)
          return
        text = ircolors.stripColorsAndStyle(text)

        text = `<${ircolors
          .stripColorsAndStyle(author)
          .replace(/_+$/g, "")}>: ${text}`

        if (
          !config?.channelMapping[messenger]?.[channelId]?.settings
            ?.dontProcessOtherBridges
        ) {
          text = text
            .replace(/^<[^ <>]+?>: <([^<>]+?)> ?: /, "*$1*: ")
            .replace(/^<[^ <>]+?>: &lt;([^<>]+?)&gt; ?: /, "*$1*: ")
        }
        text = text
          .replace(/^<([^<>]+?)>: /, "*$1*: ")
          .replace(/^\*([^<>]+?)\*: /, "<b>$1</b>: ")
        const boldMatch = text.match(/^<b>(.+?)<\/b>: (.*)/)
        ;[, author, text] = boldMatch ? Array.from(boldMatch) : []
        if (text && text !== "") {
          sendFrom({
            messenger,
            channelId,
            author,
            text,
          })
        }
        break
      }
      case "action":
        sendFrom({
          messenger,
          channelId: payload.channelId,
          author: payload.author,
          text: payload.text,
          action: "action",
        })
        break
      case "notice": {
        if (
          !config?.channelMapping[messenger]?.[payload.channelId]?.settings
            ?.showNotices
        )
          return
        sendFrom({
          messenger,
          channelId: payload.channelId,
          author: payload.author,
          text: `${payload.text}`,
        })
        break
      }
      case "topic": {
        const { channelId, text, author } = payload
        const topic = common.LocalizeString({
          messenger,
          channelId,
          localized_string_key: "topic",
          arrElemsToInterpolate: [["topic", text]],
        })
        if (!config.channelMapping[messenger][channelId]) return

        if (
          !topic ||
          !config.piers[messenger].sendTopic ||
          !config.channelMapping[messenger][channelId].previousTopic ||
          config.channelMapping[messenger][channelId].previousTopic === text
        ) {
          config.channelMapping[messenger][channelId].previousTopic = text
          return
        }
        sendFrom({
          messenger,
          channelId,
          author: author.split("!")[0],
          text: topic,
          action: "topic",
        })
        break
      }
      case "error":
        console.error("IRC ERROR:", payload.error)
        break
      case "registered": {
        const { handler } = payload
        config.piers[messenger].ircPerformCmds.forEach((cmd: string) => {
          handler.send.apply(null, cmd.split(" "))
        })
        config.piers[messenger].ircOptions.channels.forEach(
          (channel: string) => {
            handler.join(channel)
          },
        )
        break
      }
      default: {
        const _exhaustive: never = payload
        return _exhaustive
      }
    }
  }

  pierObj.irc.convertFrom = async ({
    text,
    messenger,
  }: {
    text: string
    messenger: string
  }) => {
    const result = escapeHTML(text)
      .replace(/\*\b(\w+)\b\*/g, "<b>$1</b>")
      .replace(/_\b(\w+)\b_/g, "<i>$1</i>")
      .replace(/\*/g, "&#42;")
      .replace(/_/g, "&#95;")
      .replace(/`/g, "&#96;")
    log(messenger)({
      messenger,
      "converting text": text,
      result,
    })

    return result
  }

  pierObj.irc.convertTo = async ({
    text,
    messenger,
    messengerTo,
  }: {
    text: string
    messenger: string
    messengerTo: string
  }) => {
    const result = await common.unescapeHTML({
      text: html2irc(text),
      convertHtmlEntities: true,
    })
    log(messenger)({ messengerTo, "converting text": text, result })
    return result
  }

  pierObj.irc.getChannels = async (pier: string): Promise<void> => {
    const { config } = state
    const json = config.piers[pier].ircOptions.channels.reduce(
      (acc: Record<string, string>, value: string) => {
        acc[value] = value
        return acc
      },
      {} as Record<string, string>,
    )
    config.cache[pier] = json
  }

  pierObj.irc.StartService = async ({ messenger }: { messenger: string }) => {
    const { config } = state
    const channels = config.new_channels as Array<Record<string, unknown>>
    const results: string[] = []
    for (const channel of channels) {
      const raw = channel[messenger]
      if (raw === undefined || raw === null) continue
      if (typeof raw !== "string") continue
      const password = channel[`${messenger}-password`]
      const chanName = typeof password === "string" ? `${raw} ${password}` : raw
      results.push(chanName)
    }
    config.piers[messenger].ircOptions.channels = [...new Set(results)]
    config.piers[messenger].ircOptions.encoding = "utf-8"

    generic[messenger].client = new Irc.Client(
      config.piers[messenger].ircServer,
      config.piers[messenger].ircOptions.nick,
      config.piers[messenger].ircOptions,
    )
    if (!config.MessengersAvailable[messenger]) return
    const client = generic[messenger].client
    client.on("netError", (error: any) =>
      reportDown(messenger, `irc network error: ${error?.message ?? error}`),
    )
    client.on("abort", () => reportDown(messenger, "irc gave up reconnecting"))
    generic[messenger].client.on("error", (error: unknown) => {
      pierObj.irc.receivedFrom(messenger, {
        error,
        type: "error",
      })
    })

    generic[messenger].client.on("registered", () => {
      generic[messenger].registeredConn = client.conn
      generic[messenger].registeredAt = Date.now()
      pierObj.irc.receivedFrom(messenger, {
        handler: generic[messenger].client,
        type: "registered",
      })
    })

    generic[messenger].client.on(
      "message",
      (author: string, channelId: string, text: string) => {
        pierObj.irc.receivedFrom(messenger, {
          author,
          channelId,
          text,
          type: "message",
        })
      },
    )

    generic[messenger].client.on(
      "topic",
      (channelId: string, topic: string, author: string) => {
        pierObj.irc.receivedFrom(messenger, {
          author,
          channelId,
          text: topic,
          type: "topic",
        })
      },
    )

    generic[messenger].client.on(
      "action",
      (author: string, channelId: string, text: string) => {
        pierObj.irc.receivedFrom(messenger, {
          author,
          channelId,
          text,
          type: "action",
        })
      },
    )

    generic[messenger].client.on(
      "notice",
      (author: string, channelId: string, text: string) => {
        pierObj.irc.receivedFrom(messenger, {
          author,
          channelId,
          text,
          type: "notice",
        })
      },
    )
  }

  pierObj.irc.common.GetChunks = async (text: string, messenger: string) => {
    const limit = state.config.piers[messenger].MessageLength || 400
    return text.split(/<br>/).flatMap((line) => HTMLSplitter(line, limit))
  }
}
