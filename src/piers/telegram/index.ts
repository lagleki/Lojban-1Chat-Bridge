import fs from "fs-extra"
import path from "path"
import Telegram from "node-telegram-bot-api"
import to from "await-to-js"
import util from "util"
import { fillMarkdownEntitiesMarkup } from "../../libs/formatting-converters/telegram-utils"
import { catchError } from "../bridge-errors"
import { hooks } from "../hooks"
import { log, logger } from "../logger"
import { markedParse } from "../marked-parse"
import { xovahelojbo } from "../lojban-spam"
import { registerDownloadFileTransport } from "../download-file"
import { cache_folder } from "../paths"
import { common, generic, pierObj, state } from "../state"
import type { IsendToArgs } from "../types"

import * as R from "ramda"

type TelegramMessage = Telegram.Message & { message_thread_id?: number }

async function telegramDownloadFileTransport({
  messenger,
  fileId,
  local_path,
  rem_path,
}: {
  messenger: string
  fileId: string | number
  local_path: string
  rem_path: string
}) {
  const [err, local_fullname] = (await to(
    generic[messenger].client.downloadFile(fileId, local_path),
  )) as [unknown, string | undefined]
  let rem_fullname = ""
  if (!err && local_fullname)
    rem_fullname = `${rem_path}/${path.basename(local_fullname)}`
  return { err, rem_fullname, local_fullname }
}

export function registerPier() {
  pierObj.telegram.shouldDisableMessenger = (cfg: any) => !cfg?.token

  pierObj.telegram.common = {
    Start: async function ({ messenger }: { messenger: string }) {
      return new Telegram(state.config.piers[messenger].token, {
        polling: true,
      })
    },
  }

  pierObj.telegram.sendTo = async ({
    messenger,
    channelId,
    author: _author,
    chunk,
    action: _action,
    quotation: _quotation,
    file: _file,
    edited: _edited,
  }: IsendToArgs) => {
    try {
      log("telegram")({ "sending text": chunk })
      const [topicId, channel] = channelId.toString().split("@")
      await generic[messenger].client.sendMessage(
        channel ?? channelId,
        chunk,
        R.reject(R.isNil)({
          message_thread_id: channel && topicId !== "1" ? topicId : undefined,
          parse_mode: "HTML",
        }),
      )
    } catch (error: any) {
      const errorDetail = util.inspect(error, { showHidden: false, depth: 4 })
      const { escapeHTML } =
        await import("../../libs/formatting-converters/generic")
      common.LogToAdmin(
        `Error sending a chunk:\n\nMessenger: ${messenger}.\n\nChannel: ${channelId}.\n\nChunk: ${escapeHTML(
          chunk as string,
        )}\n\nError message: ${escapeHTML(errorDetail)}`,
      )
    }
  }

  pierObj.telegram.receivedFrom = async (
    messenger: string,
    message: TelegramMessage,
  ) => {
    const { config } = state
    pierObj.telegram.common.TelegramRemoveAddedBots(messenger, message)
    if (
      await pierObj.telegram.common.TelegramLeaveChatIfNotAdmin(
        messenger,
        message,
      )
    )
      return
    if (await pierObj.telegram.common.removeSpam(messenger, message)) return
    if (
      pierObj.telegram.common.TelegramRemoveNewMemberMessage(messenger, message)
    )
      return

    if (!config.channelMapping[messenger]) return

    const age = Math.floor(Date.now() / 1000) - message.date
    if (age > (config.piers[messenger].maxMsgAge || 0))
      return console.log(
        `skipping ${age} seconds old message! NOTE: change this behaviour with config.telegram.maxMsgAge, also check your system clock`,
      )

    let topicalizedChatId = (message.chat as any).is_forum
      ? `${
          message.message_thread_id ??
          ((message.chat as any).is_forum ? "1" : "")
        }@${message.chat.id}`
      : message.chat.id

    if (
      !config.channelMapping[messenger][topicalizedChatId] &&
      (message.chat as Telegram.Chat & { is_forum?: boolean }).is_forum
    ) {
      topicalizedChatId = `1@${message.chat.id}`
    }

    const chatTitle = message.chat.title ?? ""
    if (!config.channelMapping[messenger][topicalizedChatId]) {
      if (
        config.cache[messenger]?.[chatTitle] &&
        config.cache[messenger]?.[chatTitle] === message.chat.id
      )
        return
      await pierObj.telegram.common.NewChannelAppeared({
        messenger,
        channelName: message.chat.title,
        channelId: message.chat.id,
      })

      if (!config.channelMapping[messenger][topicalizedChatId]) return
    }

    if (
      (message.audio ||
        message.document ||
        message.photo ||
        message.sticker ||
        message.video ||
        message.voice ||
        message.contact ||
        message.location) &&
      !config.generic.showMedia
    )
      return

    const { author, avatar } = await pierObj.telegram.GetName(
      messenger,
      message.from,
    )

    await pierObj.telegram.common.sendFromTelegram({
      messenger,
      message: message.reply_to_message,
      quotation: true,
      author,
      avatar,
    })
    await pierObj.telegram.common.sendFromTelegram({
      messenger,
      message,
      author,
      avatar,
    })
  }

  pierObj.telegram.common.telegram_reconstructMarkdown = (
    msg: TelegramMessage,
  ) => {
    return {
      ...msg,
      text: fillMarkdownEntitiesMarkup(
        msg.text ?? "",
        msg.entities || [],
        logger,
      ),
    }
  }

  const latinToCyrillicMap: Record<string, string> = {
    a: "а",
    b: "в",
    6: "б",
    e: "е",
    i: "і",
    j: "ј",
    m: "м",
    u: "и",
    h: "н",
    o: "о",
    p: "р",
    c: "с",
    s: "ѕ",
    y: "у",
    x: "х",
  }

  function unmaskCyrillicChars(input: string) {
    return (input ?? "")
      .split("")
      .map((char) => {
        return latinToCyrillicMap[char] ?? char
      })
      .join("")
  }

  pierObj.telegram.common.IsSpam = (message: any): boolean => {
    const { config } = state
    return config.spamremover.telegram
      .map((rule: any) => {
        let messageOk = true
        for (const key of Object.keys(rule)) {
          const msg_val_orig = (R.path(key.split("."), message) ?? "")
            .toLowerCase()
            .replace(/\r?\n|\r/g, " ")
          if (!msg_val_orig) return true
          const unmasked_val = unmaskCyrillicChars(msg_val_orig)
          for (const msg_val of [msg_val_orig, unmasked_val]) {
            if (
              typeof rule[key] === "object" &&
              Array.isArray(rule[key]) &&
              msg_val.search(
                new RegExp(
                  rule[key].join("|").replace(/\\b/g, "(?<!\\p{L})"),
                  "iu",
                ),
              ) >= 0
            ) {
              messageOk = false
            } else if (
              typeof rule[key] === "object" &&
              msg_val.search(new RegExp(rule[key], "iu")) >= 0
            ) {
              messageOk = false
            } else if (typeof rule[key] === "string" && msg_val === rule[key]) {
              messageOk = false
            } else if (
              typeof rule[key] === "boolean" &&
              msg_val === rule[key]
            ) {
              messageOk = false
            }
          }
        }
        return messageOk
      })
      .some((i: boolean) => i === false)
  }

  pierObj.telegram.common.sendFromTelegram = async ({
    messenger,
    message,
    quotation,
    author,
    avatar,
  }: {
    messenger: string
    message: any
    quotation?: boolean
    author?: string
    avatar?: string
  }) => {
    const { config } = state
    const sendFrom = hooks.sendFrom!
    if (!message) return

    let action
    message = pierObj.telegram.common.telegram_reconstructMarkdown(message)
    const jsonMessage: any = {}
    let i = 0
    for (const el of [
      "document",
      "photo",
      "new_chat_photo",
      "sticker",
      "video",
      "audio",
      "voice",
      "location",
      "contact",
      "caption",
      "text",
    ]) {
      if (message[el]) {
        jsonMessage[el] = { url: message[el].file_id }
        if (el === "photo") {
          const photo = message[el][message[el].length - 1]
          jsonMessage[el] = {
            ...jsonMessage[el],
            url: photo.file_id,
            width: photo.width,
            height: photo.height,
            index: i++,
          }
        } else if (el === "sticker") {
          jsonMessage[el] = {
            ...jsonMessage[el],
            width: message[el].width,
            height: message[el].height,
            index: i++,
          }
        } else if (el === "location") {
          jsonMessage[el] = {
            latitude: message[el]["latitude"],
            longtitude: message[el]["longtitude"],
            index: i++,
          }
        } else if (el === "contact") {
          jsonMessage[el] = {
            first_name: message[el]["first_name"],
            last_name: message[el]["last_name"],
            phone_number: message[el]["phone_number"],
            index: i++,
          }
        } else if (el === "caption") {
          jsonMessage[el] = {
            text: message[el],
            index: 998,
          }
        } else if (["video", "voice", "audio"].includes(el)) {
          jsonMessage[el] = {
            ...jsonMessage[el],
            duration: message[el].duration,
            index: i++,
          }
        }
      }
      if (el === "text") {
        message[el] = message[el] || ""
        if (!quotation && message[el].indexOf("/me ") === 0) {
          action = "action"
          message[el] = message[el].split("/me ").slice(1).join("/me ")
        }
        jsonMessage[el] = {
          text: message[el],
          index: 999,
        }
      }
    }
    const arrMessage = Object.keys(jsonMessage).sort(
      (a, b) => jsonMessage[a].index - jsonMessage[b].index,
    )

    for (let i: number = 0; i < arrMessage.length; i++) {
      const el = arrMessage[i]
      if (el === "text") {
        jsonMessage[el].text = jsonMessage[el].text.replace(
          `@${config.piers[messenger].myUser?.username ?? ""}`,
          "",
        )
        if (
          quotation &&
          jsonMessage[el].text.length > config.piers[messenger].MessageLength
        )
          jsonMessage[el].text = `${jsonMessage[el].text.substring(
            0,
            config.piers[messenger].MessageLength - 1,
          )} ...`
      }
      if (jsonMessage[el].url)
        [jsonMessage[el].url, jsonMessage[el].local_file] =
          await common.downloadFile({
            messenger,
            type: "telegram",
            fileId: jsonMessage[el].url,
          })
      const arrForLocal = Object.keys(jsonMessage[el]).map((i) => [
        i,
        jsonMessage[el][i],
      ])
      const text = common.LocalizeString({
        messenger: "telegram",
        channelId: message.chat.id,
        localized_string_key: `MessageWith.${el}.telegram`,
        arrElemsToInterpolate: arrForLocal,
      })
      const edited = message.edit_date ? true : false

      let topicId

      if ((message.chat as any).is_forum) {
        topicId = message.message_thread_id
        if (
          !config.channelMapping[messenger][
            `${message.message_thread_id}@${message.chat.id}`
          ]
        )
          topicId = "1"
      }

      sendFrom({
        messenger,
        channelId: message.chat.id as number,
        topicId: topicId ?? "",
        author: author ?? "",
        text,
        action,
        quotation,
        file: jsonMessage[el].local_file,
        remote_file: jsonMessage[el].url,
        edited,
        avatar,
      })
    }
  }

  pierObj.telegram.adaptName = (messenger: string, name: string) =>
    state.config.piers[messenger].userMapping[name] || name

  pierObj.telegram.GetName = async (messenger: string, user: Telegram.User) => {
    const { config } = state
    let name = config.piers[messenger].nameFormat
    if (user.username) {
      name = name.replace("%username%", user.username, "g")
      name = pierObj.telegram.adaptName(messenger, name)
    } else {
      name = name.replace(
        "%username%",
        config.piers[messenger]?.usernameFallbackFormat,
        "g",
      )
    }

    name = name.replace("%firstName%", user.first_name || "", "g")
    name = name.replace("%lastName%", user.last_name || "", "g")

    name = name.replace(/(^\s*)|(\s*$)/g, "")

    let link: string | undefined
    try {
      const { photos } = await generic[messenger].client.getUserProfilePhotos(
        user.id,
        { limit: 1 },
      )
      const file_id = photos?.[0]?.[0]?.file_id
      if (file_id) link = await generic[messenger].client.getFileLink(file_id)
    } catch {
      // ignore if profile photo unavailable
    }
    return { author: name, avatar: link }
  }

  pierObj.telegram.convertFrom = async ({
    text,
    messenger: _messenger,
  }: {
    text: string
    messenger: string
  }) => {
    const res = markedParse({
      text: text
        .replace(/<p><code>([\s\S]*?)<\/code><\/p>/gim, "<p><pre>$1</pre></p>")
        .replace(/<span class="tg-spoiler">/g, '<span class="spoiler">'),
      messenger: "telegram",
      dontEscapeBackslash: true,
      unescapeCodeBlocks: true,
    })
    return res
  }

  pierObj.telegram.convertTo = async ({
    text = "",
    messenger,
    messengerTo,
  }: {
    text: string
    messenger: string
    messengerTo: string
  }) => {
    const result = common
      .sanitizeHtml(
        text
          .replace(
            /<blockquote>\n<p>([\s\S]*?)<\/p>\n<\/blockquote>/gim,
            "<pre>$1</pre>",
          )
          .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gim, "<pre>$1</pre>"),
        [
          "b",
          "strong",
          "i",
          "pre",
          "code",
          "a",
          "em",
          "u",
          "ins",
          "s",
          "br",
          "del",
        ],
      )
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gim, "<pre>$1</pre>")
      .replace(/<br( \/|)>/g, "\n")
    log(messenger)({
      messengerTo,
      "converting text": text,
      result,
    })
    return result
  }

  pierObj.telegram.common.removeSpam = async (
    messenger: string,
    message: TelegramMessage,
  ) => {
    const { config } = state
    const cloned_message = JSON.parse(JSON.stringify(message))
    if (pierObj.telegram.common.IsSpam(cloned_message)) {
      if (message.text && message.text.search(/\bt\.me\b/) >= 0) {
        const [err, chat]: [any, any] = await to(
          generic[messenger].client.getChat(message.chat.id),
        )
        if (!err) {
          const invite_link = chat.invite_link
          cloned_message.text = cloned_message.text.replace(invite_link, "")
          if (pierObj.telegram.common.IsSpam(cloned_message))
            pierObj.telegram.common.telegram_DeleteMessage({
              messenger,
              message,
              log: true,
            })
        } else {
          common.LogToAdmin(
            `error on getting an invite link of the chat ${message.chat.id} ${message.chat.title}`,
          )
        }
      } else {
        const [err, _chat] = await to(
          generic[messenger].client.getChat(cloned_message.chat.id),
        )
        if (!err) {
          pierObj.telegram.common.telegram_DeleteMessage({
            messenger,
            message,
            log: true,
          })
        } else {
          common.LogToAdmin(
            `error on getting an invite link of the chat ${cloned_message.chat.id} ${cloned_message.chat.title}`,
          )
        }
      }
      return true
    } else if (
      config.channelMapping?.[messenger]?.[message?.chat?.id]?.settings
        ?.restrictToLojban &&
      message?.text
    ) {
      const xovahe = await xovahelojbo({ text: message.text })
      if (xovahe < 0.5) {
        generic[messenger].client
          .sendMessage(
            message.chat.id,
            ".i mi smadi le du'u do na tavla fo su'o lojbo .i ja'e bo mi na benji di'u fi la IRC\n\nIn this group only Lojban is allowed. Try posting your question to [#lojban](https://t.me/joinchat/BLVsYz3hCF8mCAb6fzW1Rw) or [#ckule](https://telegram.me/joinchat/BLVsYz4hC9ulWahupDLovA) (school) group",
            {
              reply_to_message_id: message.message_id,
              parse_mode: "Markdown",
            },
          )
          .catch((e: any) =>
            log("telegram")({
              error: e.toString(),
            }),
          )
        return true
      }
    }
    return false
  }

  pierObj.telegram.common.TelegramRemoveAddedBots = (
    messenger: string,
    message: TelegramMessage,
  ) => {
    const { config } = state
    if (config.piers[messenger].remove_added_bots)
      (message?.new_chat_members || []).map((u: Telegram.User) => {
        if (u.is_bot && config.piers[messenger]?.myUser?.id !== u.id)
          generic[messenger].client
            .kickChatMember(message.chat.id, u.id)
            .catch(catchError)
      })
  }

  pierObj.telegram.common.TelegramRemoveNewMemberMessage = (
    messenger: string,
    message: TelegramMessage,
  ) => {
    const { config } = state
    if (
      message?.left_chat_member ||
      (message?.new_chat_members?.length ?? 0) > 0 ||
      (message?.new_chat_members || []).filter(
        (u: Telegram.User) =>
          (u.username || "").length > 100 ||
          (u.first_name || "").length > 100 ||
          (u.last_name || "").length > 100,
      ).length > 0 ||
      (config.channelMapping?.[messenger]?.[message?.chat?.id]?.settings
        ?.removeJoinMessages === true &&
        message.new_chat_members)
    ) {
      pierObj.telegram.common.telegram_DeleteMessage({
        messenger,
        message,
        log: false,
      })
    }
    if (message?.left_chat_member || message?.new_chat_members) return true
    return false
  }

  pierObj.telegram.common.TelegramLeaveChatIfNotAdmin = async (
    messenger: string,
    message: TelegramMessage,
  ) => {
    const { config } = state
    if (
      !["group", "supergroup"].includes(message?.chat?.type) ||
      !message?.chat?.id ||
      !config.piers[messenger]?.myUser?.id
    )
      return

    const [_err, res]: [any, any] = await to(
      generic[messenger].client.getChatMember(
        message.chat.id,
        config.piers[messenger]?.myUser?.id,
      ),
    )
    if (!res) return true
    if (!res.can_delete_messages) {
      await to(generic[messenger].client.leaveChat(message.chat.id))

      const jsonMessage = {
        id: message?.chat?.id || message?.from?.id,
        title: message?.chat?.title,
        first_name: message?.from?.first_name,
        last_name: message?.from?.last_name,
        username: message?.from?.username,
        message: message?.text,
      }
      common.LogToAdmin(`leaving chat ${JSON.stringify(jsonMessage)}`)
      const titleKey = message.chat.title ?? ""
      delete config.cache?.[messenger]?.[titleKey]
      await to(
        common.writeCache({
          pier: messenger,
          channelName: message.chat.title,
          channelId: message.chat.id,
          action: "leave",
        }),
      )
      return true
    }
    return false
  }

  pierObj.telegram.common.telegram_DeleteMessage = async ({
    messenger,
    message,
    log: shouldLog,
  }: {
    messenger: string
    message: TelegramMessage
    log: boolean
  }) => {
    if (shouldLog) await to(common.LogMessageToAdmin(messenger, message))
    await to(
      generic[messenger].client.deleteMessage(
        message.chat.id,
        message.message_id,
      ),
    )
  }

  pierObj.telegram.common.NewChannelAppeared = async ({
    messenger,
    channelName,
    channelId,
  }: {
    messenger: string
    channelName: string
    channelId: string
  }) => {
    const { config } = state
    config.cache[messenger][channelName] = channelId

    await to(common.writeCache({ channelName, channelId, action: "join" }))
    const [err] = await to(common.PopulateChannelMapping())

    if (err) {
      common.LogToAdmin(
        `got problem in the new telegram chat ${channelName}, ${channelId}`,
      )
      return false
    }
    return true
  }

  pierObj.telegram.getChannels = async (pier: string): Promise<void> => {
    const { config } = state
    let res = {}
    try {
      res = JSON.parse(
        fs.readFileSync(`${cache_folder}/cache.json`, { encoding: "utf8" }),
      )[pier]
    } catch {
      // ignore missing or invalid cache file
    }
    config.cache[pier] = res
  }

  pierObj.telegram.StartService = async ({
    messenger,
  }: {
    messenger: string
  }) => {
    const { config } = state
    if (!config.MessengersAvailable[messenger]) return
    generic[messenger].client = await pierObj.telegram.common.Start({
      messenger,
    })
    generic[messenger].client.on("message", (message: any) => {
      pierObj.telegram.receivedFrom(messenger, message)
    })
    generic[messenger].client.on("edited_message", (message: any) => {
      pierObj.telegram.receivedFrom(messenger, message)
    })
    generic[messenger].client.on("polling_error", async (error: any) => {
      log(messenger)({
        level: "error",
        function: "pierObj.telegram.StartService",
        error_code: error?.code,
        error_message: error?.message,
        response_code: error?.response?.body?.error_code,
      })
      generic[messenger].client.stopPolling().then(() => {
        setTimeout(() => {
          logger.log({
            level: "info",
            function: "pierObj.telegram.StartService",
            message: "restarting polling",
          })
          generic[messenger].client.startPolling()
        }, 3000)
      })
    })
    const [err, res] = await to(generic[messenger].client.getMe())
    if (err) {
      logger.log({
        level: "error",
        function: "StartService",
        messenger,
        message: err.message || "",
      })
    } else {
      config.piers[messenger].myUser = res
    }
  }

  registerDownloadFileTransport("telegram", telegramDownloadFileTransport)
}
