import { escapeHTML } from "../../libs/formatting-converters/generic"
import { hooks } from "../hooks"
import { HTMLSplitter } from "../html-splitter"
import { log } from "../logger"
import { common, generic, pierObj, state } from "../state"
import type { Chunk, IsendToArgs } from "../types"

import Irc from "irc-upd"
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
    generic[messenger].client.say(channelId, line)
  }

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
    generic[messenger].client.on("error", (error: unknown) => {
      pierObj.irc.receivedFrom(messenger, {
        error,
        type: "error",
      })
    })

    generic[messenger].client.on("registered", () => {
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
