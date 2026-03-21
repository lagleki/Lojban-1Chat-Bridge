import fs from "fs-extra"
import path from "path"
import request from "request"
import to from "await-to-js"
import emoji from "node-emoji"
import { RTMClient } from "@slack/rtm-api"
import { WebClient } from "@slack/web-api"
import { registerDownloadFileTransport } from "../download-file"
import { hooks } from "../hooks"
import { log, logger } from "../logger"
import { common, generic, pierObj, state } from "../state"
import type { IsendToArgs, Json } from "../types"

const html2slack = require("../../libs/formatting-converters/html2slack")

async function slackDownloadFileTransport({
  messenger,
  remote_path,
  local_path,
  rem_path,
}: {
  messenger: string
  remote_path?: string
  local_path: string
  rem_path: string
}) {
  const local_fullname = `${local_path}/${path.basename(remote_path ?? "")}`
  const [err, res] = (await to(
    new Promise((resolve: any) => {
      try {
        const file = fs.createWriteStream(local_fullname)
        file
          .on("open", () => {
            request(
              {
                method: "GET",
                url: remote_path || "",
                headers: {
                  Authorization: `Bearer ${state.config.piers[messenger]?.token}`,
                },
                timeout: 3000,
              },
              (reqErr: any) => {
                if (reqErr) {
                  console.log(remote_path, reqErr.toString())
                  resolve(null)
                }
              },
            )
              .pipe(file)
              .on("finish", () => {
                const rf = `${rem_path}/${path.basename(remote_path ?? "")}`
                resolve([rf, local_fullname])
              })
              .on("error", (error: any) => {
                console.error({
                  type: "streaming error",
                  path: remote_path,
                  error,
                })
                resolve(null)
              })
          })
          .on("error", (error: any) => {
            console.error({
              type: "slack opening error",
              error,
            })
          })
      } catch (error) {
        console.log({ type: "creation error", error })
      }
    }),
  )) as [unknown, [string, string] | null]
  let rem_fullname = ""
  let lf: string | undefined = local_fullname
  if (res) [rem_fullname, lf] = res
  return { err, rem_fullname, local_fullname: lf }
}

export function registerSlackPier() {
  pierObj.slack.common = {
    Start: async function ({ messenger }: { messenger: string }) {
      generic[messenger].client = {
        rtm: new RTMClient(state.config.piers[messenger].token),
        web: new WebClient(state.config.piers[messenger].token),
      }
      generic[messenger].client.rtm.start().catch((e: any) => {
        if (!e?.data?.ok) {
          state.config.MessengersAvailable[messenger] = false
          log("slack")({
            error: "Couldn't start Slack",
          })
        }
      })
      return true
    },
  }

  pierObj.slack.sendTo = async ({
    messenger,
    channelId,
    author,
    chunk,
    action: _action,
    quotation: _quotation,
    file: _file,
    edited: _edited,
  }: IsendToArgs) => {
    const chunkStr =
      typeof chunk === "string"
        ? chunk
        : ((chunk as { main?: string }).main ?? "")
    const textOut = emoji.unemojify(chunkStr)
    generic[messenger].client.web.chat
      .postMessage({
        channel: channelId,
        username: (author || "").replace(/(^.{21}).*$/, "$1"),
        text: textOut,
      })
      .catch((error: any) => {
        logger.log({
          level: "error",
          function: "slack.sendTo",
          message: error.toString(),
        })
      })
  }

  pierObj.slack.receivedFrom = async (messenger: string, message: any) => {
    const sendFrom = hooks.sendFrom!
    if (!state.config.channelMapping[messenger]) return
    if (
      message.subtype === "message_changed" &&
      message?.message?.text === message?.previous_message?.text &&
      (message?.files || []).length === 0
    )
      return
    if (
      (message.subtype &&
        !["me_message", "channel_topic", "message_changed"].includes(
          message.subtype,
        )) ||
      generic[messenger].client.rtm.activeUserId === message.user
    )
      return

    if (!message.user && message.message) {
      if (!message.message.user) return
      message.user = message.message.user
      message.text = message.message.text
    }
    const edited = message.subtype === "message_changed" ? true : false

    const promUser = generic[messenger].client.web.users.info({
      user: message.user,
    })
    const promChannel = generic[messenger].client.web.conversations.info({
      channel: message.channel,
    })

    const promFiles = (message.files || []).map((file: any) =>
      common.downloadFile({
        messenger,
        type: "slack",
        remote_path: file.url_private,
      }),
    )

    let err: any, user: any, chan: any, files: any[] | undefined
    ;[err, user] = await to(promUser)
    if (err) user = message.user
    ;[err, chan] = await to(promChannel)
    if (err) chan = message.channel
    const resolveFiles = await to(Promise.all(promFiles))
    ;[err, files] = resolveFiles
    if (err) files = []
    const author = pierObj.slack.adaptName(messenger, user)
    const channelId = chan.channel.name || message.channel

    let action: string | undefined = undefined
    if (message.subtype === "me_message") action = "action"
    if (
      message.subtype === "channel_topic" &&
      message.topic &&
      message.topic !== ""
    ) {
      action = "topic"
      message.text = common.LocalizeString({
        messenger: "slack",
        channelId,
        localized_string_key: "topic",
        arrElemsToInterpolate: [["topic", message.topic]],
      })
    }
    if (files && files.length > 0)
      files.map(([file, localfile]: [string, string]) => {
        sendFrom({
          messenger,
          channelId,
          author,
          text: file,
          remote_file: file,
          file: localfile,
          edited,
        })
      })
    if (message.text && !message.topic) {
      sendFrom({
        messenger,
        channelId,
        author,
        text: message.text,
        action,
        edited,
      })
    }
  }

  pierObj.slack.adaptName = (_messenger: string, user: any) =>
    user?.user?.profile?.display_name ||
    user?.user?.real_name ||
    user?.user?.name

  pierObj.slack.convertFrom = async ({
    text,
    messenger,
  }: {
    text: string
    messenger: string
  }) => {
    const source = text
    const RE_ALPHANUMERIC = new RegExp("^\\w?$"),
      RE_TAG = new RegExp("<(.+?)>", "g"),
      RE_BOLD = new RegExp("\\*([^\\*]+?)\\*", "g"),
      RE_ITALIC = new RegExp("_([^_]+?)_", "g"),
      RE_FIXED = new RegExp("(?<!`)`([^`]+?)`(?!`)", "g"),
      RE_MULTILINE_FIXED = new RegExp("```((?:(?!```)[\\s\\S])+?)```", "gm")

    const pipeSplit: any = (payload: any) => payload.split`|`
    const payloads: any = (tag: any, start: number) => {
      if (!start) start = 0
      const length = tag.length
      return pipeSplit(tag.substr(start, length - start))
    }

    const tag = (tag: string, attributes: any, payload?: any) => {
      if (!payload) {
        payload = attributes
        attributes = {}
      }

      let html = "<".concat(tag)
      for (const attribute in attributes) {
        if (Object.prototype.hasOwnProperty.call(attributes, attribute))
          html = html.concat(" ", attribute, '="', attributes[attribute], '"')
      }
      return html.concat(">", payload, "</", tag, ">")
    }

    const matchTag = (match: RegExpExecArray | null) => {
      const action = match?.[1]?.substr(0, 1)
      let p

      switch (action) {
        case "!":
          return tag("span", { class: "slack-cmd" }, payloads(match?.[1], 1)[0])
        case "#":
          p = payloads(match?.[1], 2)
          return tag(
            "span",
            { class: "slack-channel" },
            p.length === 1 ? p[0] : p[1],
          )
        case "@":
          p = payloads(match?.[1], 2)
          return tag(
            "span",
            { class: "slack-user" },
            p.length === 1 ? p[0] : p[1],
          )
        default:
          p = payloads(match?.[1])
          return tag("a", { href: p[0] }, p.length === 1 ? p[0] : p[1])
      }
    }

    const safeMatch = (
      match: RegExpExecArray | null,
      tag: string,
      trigger?: string,
    ) => {
      let prefix_ok = match?.index === 0
      let postfix_ok =
        match?.index === (match?.input?.length ?? 0) - (match?.[0]?.length ?? 0)

      if (!prefix_ok) {
        const charAtLeft: string | undefined = match?.input?.substr(
          match.index - 1,
          1,
        )
        prefix_ok =
          notAlphanumeric(charAtLeft || "") &&
          notRepeatedChar(trigger || "", charAtLeft || "")
      }

      if (!postfix_ok) {
        const charAtRight: string | undefined = match?.input?.substr(
          match.index + match[0].length,
          1,
        )
        postfix_ok =
          notAlphanumeric(charAtRight || "") &&
          notRepeatedChar(trigger || "", charAtRight || "")
      }

      if (prefix_ok && postfix_ok) return tag
      return false
    }

    const matchBold = (match: RegExpExecArray | null) =>
      safeMatch(match, tag("strong", payloads(match?.[1])), "*")

    const matchItalic = (match: RegExpExecArray | null) =>
      safeMatch(match, tag("em", payloads(match?.[1])), "_")

    const matchFixed = (match: RegExpExecArray | null) =>
      safeMatch(match, tag("code", payloads(match?.[1])))
    const matchPre = (match: RegExpExecArray | null) =>
      safeMatch(match, tag("pre", payloads(match?.[1])))

    const notAlphanumeric = (input: string) => !RE_ALPHANUMERIC.test(input)

    const notRepeatedChar = (trigger: string, input: string) =>
      !trigger || trigger !== input

    async function parseSlackText(text: string) {
      const jsonChannels: Json = {}
      const jsonUsers: Json = {}
      text.replace(
        /<#(C\w+)\|?(\w+)?>/g,
        (_match: any, channelId: any, _readable: any) => {
          jsonChannels[channelId] = channelId
          return channelId
        },
      )
      text.replace(
        /<@(U\w+)\|?(\w+)?>/g,
        (_match: any, userId: any, _readable: any) => {
          jsonUsers[userId] = userId
          return userId
        },
      )
      for (const channelId of Object.keys(jsonChannels)) {
        const [err, channel] = await to(
          generic[messenger].client.web.conversations.info({
            channel: channelId,
          }),
        )
        if (!err) {
          jsonChannels[channelId] = (channel as any)?.channel?.name
        } else {
          log("slack")({
            error: err,
          })
        }
      }
      for (const userId of Object.keys(jsonUsers)) {
        const [err, user] = await to(
          generic[messenger].client.web.users.info({ user: userId }),
        )
        if (err) {
          log("slack")({
            error: err,
          })
        }
        jsonUsers[userId] = pierObj.slack.adaptName(messenger, user)
      }
      return (
        emoji
          .emojify(text)
          .replace(/<pre>\\n/g, "<pre>")
          .replace(":simple_smile:", ":)")
          .replace(/<!channel>/g, "@channel")
          .replace(/<!group>/g, "@group")
          .replace(/<!everyone>/g, "@everyone")
          .replace(
            /<#(C\w+)\|?(\w+)?>/g,
            (_match: any, channelId: any, readable: any) => {
              return `#${readable || jsonChannels[channelId]}`
            },
          )
          .replace(
            /<@(U\w+)\|?(\w+)?>/g,
            (_match: any, userId: any, readable: any) => {
              return `@${readable || jsonUsers[userId]}`
            },
          )
          .replace(/<(?!!)([^|]+?)>/g, (_match: any, link: any) => link)
          .replace(
            /<!(\w+)\|?(\w+)?>/g,
            (_match: any, command: any, label: any) => `<${label || command}>`,
          )
          // .replace(/:(\w+):/g, (match: any, emoji: any) => {
          //   if (emoji in emojis) return emojis[emoji];
          //   return match;
          // })
          .replace(/<.+?\|(.+?)>/g, (_match: any, readable: any) => readable)
      )
    }

    const publicParse = async (text: string) => {
      const patterns = [
        { p: RE_TAG, cb: matchTag },
        { p: RE_BOLD, cb: matchBold },
        { p: RE_ITALIC, cb: matchItalic },
        { p: RE_MULTILINE_FIXED, cb: matchPre },
        { p: RE_FIXED, cb: matchFixed },
      ]
      text = await parseSlackText(text)
      for (const pattern of patterns) {
        const original = text
        let result: RegExpExecArray | null

        while ((result = pattern.p.exec(original)) !== null) {
          const replace = pattern.cb(result)
          if (replace) text = text.replace(result[0], replace)
        }
      }

      return text
    }
    // text = escapeHTML(text);
    const [error, result] = await to(publicParse(text))
    log("slack")({
      "converting source text": source,
      result: result || text,
      error,
    })
    return result || text
  }

  pierObj.slack.convertTo = async ({
    text,
    messenger,
    messengerTo,
  }: {
    text: string
    messenger: string
    messengerTo: string
  }) => {
    const result = html2slack(text)
    log(messenger)({ messengerTo, "converting text": text, result })
    return result
  }

  pierObj.slack.getChannels = async (pier: string): Promise<void> => {
    const [err, listRes]: [any, any] = await to(
      generic[pier].client.web.conversations.list(),
    )
    if (err) {
      console.error(err)
    }
    const res = listRes?.channels || []
    const json: Json = {}
    res.map((i: any) => {
      json[i.name] = i.name
    })
    state.config.cache[pier] = json
  }

  pierObj.slack.StartService = async ({ messenger }: { messenger: string }) => {
    //slack
    await pierObj.slack.common.Start({ messenger })
    if (!state.config.MessengersAvailable[messenger]) return
    generic[messenger].client.rtm.on("message", (message: any) => {
      pierObj.slack.receivedFrom(messenger, message)
    })
  }

  registerDownloadFileTransport("slack", slackDownloadFileTransport)
}
