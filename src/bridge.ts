"use strict"
interface ErrorConstructor {
  stackTraceLimit?: number
}

(Error as ErrorConstructor).stackTraceLimit = 100;

declare var process: {
  env: {
    NTBA_FIX_319: number
    HOME: string
    log?: string
    PWD?: string
  }
  argv: string[]
}
process.env.NTBA_FIX_319 = 1

// file system and network libs
const fs = require("fs-extra")
const path = require("path")
const mkdir = require("mkdirp-sync")
import { ImplicitFlowUser } from '@vk-io/authorization';
import to from 'await-to-js';
import axios, { AxiosResponse } from 'axios';
//discord
import * as Discord from "discord.js";
import * as http from "http";
// messengers' libs
// const { login } = require("libfb")
import * as Telegram from "node-telegram-bot-api";
import * as request from "request";
import { CallbackService } from 'vk-io';
// markedRenderer.text = (string: string) => string.replace(/\\/g, "\\\\");
// markedRenderer.text = (string: string) => escapeHTML(string)
// markedRenderer.paragraph = (string: string) => escapeHTML(string)
// markedRenderer.inlineText = (string: string) => escapeHTML(string)
import { escapeHTML } from './formatting-converters/generic';
import { fillMarkdownEntitiesMarkup } from './formatting-converters/telegram-utils';

const Timeout = require('await-timeout');

// process.on('warning', (e: any) => console.warn(e.stack));

const cache_folder = path.join(__dirname, "../data")
const defaults = path.join(__dirname, `../default-config/defaults.js`)

const sanitizeHtml = require("sanitize-html")
const createDOMPurify = require("dompurify")
const { JSDOM } = require("jsdom")
const window = new JSDOM("").window
const DOMPurify = createDOMPurify(window)

const util = require("util")


const VkBot = require("node-vk-bot-api")

const { RTMClient, WebClient } = require("@slack/client")
const emoji = require("node-emoji")

const html2slack = require("./formatting-converters/html2slack")
const html2irc = require("./formatting-converters/html2irc")

const marked = require("marked")
const lexer = marked.Lexer
lexer.rules.list = { exec: () => { } }
lexer.rules.listitem = { exec: () => { } }
const markedRenderer = new marked.Renderer()

const Avatar = require("../src/animalicons/index.js")

let server: http.Server

function markedParse({
  text,
  messenger,
  dontEscapeBackslash,
  unescapeCodeBlocks,
}: {
  text: string
  messenger: string
  dontEscapeBackslash?: boolean
  unescapeCodeBlocks?: boolean
}) {
  if (!dontEscapeBackslash) text = text.replace(/\\/gim, "\\\\")
  markedRenderer.codespan = (text: string) => {
    if (!dontEscapeBackslash) text = text.replace(/\\\\/gim, "&#92;")
    if (unescapeCodeBlocks)
      text = common.unescapeHTML({
        text,
        convertHtmlEntities: true,
      })
    return `<code>${text}</code>`
  }
  markedRenderer.code = (text: string) => {
    if (!dontEscapeBackslash) text = text.replace(/\\\\/gim, "&#92;")
    if (unescapeCodeBlocks)
      text = common.unescapeHTML({
        text,
        convertHtmlEntities: true,
      })
    return `<pre><code>${text}</code></pre>\n`
  }
  const result = marked.parser(lexer.lex(text), { gfm: true, renderer: markedRenderer, })
  log(messenger)({ "converting source text": text, result })
  return result
}
const html2md = require("./formatting-converters/html2md-ts")

const Irc = require("irc-upd")
const ircolors = require("./formatting-converters/irc-colors-ts")

const finalhandler = require("finalhandler")
const serveStatic = require("serve-static")

const winston = require("winston")

import DailyRotateFile = require("winston-daily-rotate-file");
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(cache_folder, "info-%DATE%.log"),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: false,
      maxSize: '20m',
      maxFiles: '14d'
    }),
  ],
})
const log = (messenger: String) => (message: any) =>
  logger.log({ level: "info", message: { message, messenger } })

const R = require("ramda")
const { default: PQueue } = require("p-queue")

const blalalavla = require("./sugar/blalalavla")
const modzi = require("./sugar/modzi")

// NLP & spam libs
const lojban = require("lojban")

// global objects
// const UrlRegExp = new RegExp(
//   "(?:(?:https?|ftp|file)://|www.|ftp.)(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[A-Z0-9+&@#/%=~_|$])",
//   "igm"
// )
// const PageTitleRegExp = /(<\s*title[^>]*>(.+?)<\s*\/\s*title)>/gi

interface Json {
  [index: string]: string | boolean | RegExp
}

type Chunk = { [x: string]: string } | string

interface IMessengerInfo {
  [x: string]: any
}

type TextFormatConverterType = ({
  text,
  messenger,
  messengerTo,
}: {
  text: string
  messenger: string
  messengerTo?: string
}) => Promise<any>

interface IMessengerFunctions {
  [x: string]: TextFormatConverterType
}

interface Igeneric extends IMessengerInfo {
  LogToAdmin?: any
  sendOnlineUsersTo?: any
  downloadFile?: any
  ConfigBeforeStart?: any
  PopulateChannelMapping?: any
  LocalizeString?: any
  sanitizeHtml?: any
  randomValueBase64?: any
  escapeHTML?: any
  writeCache?: any
  MessengersAvailable?: any
}

//global scope mutable vars:
const generic: Igeneric = {}
let config: any, localizationConfig: any
const queueOf: IMessengerInfo = {}

//global functions (for all piers):
const common: any = {}

interface IsendToArgs {
  messenger: string
  channelId: string
  author: string
  chunk: Chunk
  action: string
  quotation: boolean
  file?: string
  edited?: boolean
  avatar?: string
}

const pierObj: any = {
  facebook: {},
  discord: {},
  mattermost: {},
  telegram: {},
  irc: {},
  slack: {},
  vkboard: {},
  vkwall: {},
  webwidget: {}
}

Object.keys(pierObj).forEach((key: any) => {
  pierObj[key].common = {}
})

async function tot(arg: Promise<any>, timeout = 5000, rejectResponse = true) {
  return to(Timeout.wrap(arg, timeout, rejectResponse))
}

const discordParser = require("discord-markdown")

pierObj.discord.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
  avatar
}: IsendToArgs) => {
  let files = undefined
  if (file) {
    files = [
      {
        attachment: file,
      },
    ]
  }
  let chunk_: Chunk = chunk
  if (typeof chunk_ !== 'string' && chunk_.main) chunk_ = chunk_.main
  if (chunk_ === file) chunk_ = "";

  const authorTemp = author
    .replace(/[0-9_\.-]+$/, "")
    .replace(/\[.*/, "")
    .replace(/[^0-9A-Za-z].*$/, "")
    .trim()

  const parsedName = modzi.modzi(author)
  try {
    const response: AxiosResponse = await axios
      .get(avatar, {
        responseType: 'arraybuffer'
      });
    const prefix = "data:" + response.headers["content-type"] + ";base64,";
    avatar = prefix + Buffer.from(response.data, 'binary').toString('base64');
  } catch (error) {
    avatar = undefined
  }
  // if (!avatar) {
  //   const animava = new Avatar(
  //     authorTemp,
  //     512,
  //     parsedName.snada ? parsedName.output : undefined
  //   )
  //   await animava.draw()
  //   avatar = await animava.toDataURL()
  // }

  let error

  const channel = generic[messenger].client.channels.cache.get(channelId)
  let webhooks = [], webhook = null
  if (!config.piers[messenger]?.noWebhooks) {
    try {
      webhooks = (await channel.fetchWebhooks())
      webhook = webhooks.last()
    } catch (error) {
      logger.log({
        level: "error",
        function: "discord.sendTo",
        event: "couldn't find webhooks for the channel",
        channelId,
        message: error.toString(),
        chunk: chunk_, author
      });
    }
    //reuse a webhook
    if (webhook) {
      [error, webhook] = await tot(webhook.edit({
        name: author || "-",
        avatar,
      }))
      if (error) {
        logger.log({
          level: "error",
          function: "discord.sendTo",
          event: "error editing an existing webhook",
          message: error.toString(),
          chunk: chunk_, author
        });
      }
    }
    //couldnt reuse the webhook so delete all my webhooks for this Discord channel and then create a new one
    if (error || !webhook) {
      // //deleting
      const arrayedWebhooks: Discord.Webhook[] = Array.from(Object.values(webhooks.filter((hook: any) => hook?.owner?.id === config?.piers?.[messenger]?.client)));
      for (const hook of arrayedWebhooks) {
        await hook.delete()
      }
      // webhooks.filter((hook: any) => hook?.owner?.id === config?.piers?.[messenger]?.client).each((hook: any) => hook.delete())
      //creating
      ;[error, webhook] = await tot(channel.createWebhook(author || "-", avatar))
      if (error) {
        logger.log({
          level: "error",
          function: "discord.sendTo",
          event: "error creating a webhook",
          message: error.toString(),
          chunk: chunk_, author
        });
      }
    }
    if (!error) {
      //ok, we have a webhook so send a message with it 
      [error] = await tot(
        webhook.send(chunk_, {
          username: author || "-",
          files,
          // avatarURL: generic.discord.avatar.path,
        })
      )
      if (error) {
        logger.log({
          level: "error",
          function: "discord.sendTo",
          event: "error sending a message via a webhook",
          message: error.toString(),
          chunk: chunk_, author
        });
      } else return
    }
    if (webhook) {
      //we failed to send a message. try to send the message without attachments. useful when the attachments are too large for Discord to handle
      [error] = await tot(
        webhook.send(chunk_, {
          username: author || "-",
          // avatarURL: generic.discord.avatar.path,
        })
      )
      if (error) {
        logger.log({
          level: "error",
          function: "discord.sendTo",
          event: "error sending a message without attachments via a webhook",
          message: error.toString(),
          chunk: chunk_, author
        });
      } else return
    }
  }
  // now we failed all the ways to use webhooks so send the message with attachments via an older method using a bot user
  [error] = await to(generic[messenger].client.channels.cache
    .get(channelId)
    .send({ content: (chunk as any).fallback_solution ?? chunk, files }))

  if (error) {
    logger.log({
      level: "error",
      function: "discord.sendTo",
      event: "error sending a message using a webhookless method",
      message: error.toString(),
      chunk: (chunk as any).fallback_solution ?? chunk, author
    });
  } else return

  // now we failed to send the message with attachments via an older method so remove the attachments and try once again
  [error] = await to(generic[messenger].client.channels.cache
    .get(channelId)
    .send({ content: (chunk as any).fallback_solution ?? chunk, }))

  if (error) {
    logger.log({
      level: "error",
      function: "discord.sendTo",
      event: "error sending a message without attachments using a webhookless method",
      message: error.toString(),
      chunk: (chunk as any).fallback_solution ?? chunk, author
    });
  }
}

pierObj.discord.common.removeSpam = async (messenger: string, message: any, plainText: string) => {
  if (config.channelMapping[messenger][message?.channel?.id]?.settings?.restrictToLojban && plainText) {
    // dealing with non-lojban spam
    const xovahe = xovahelojbo({ text: plainText })
    if (xovahe < 0.5) return true;
  }
  return false;
}

pierObj.discord.receivedFrom = async (messenger: string, message: any) => {
  if (
    !config?.channelMapping[messenger]?.[(message?.channel?.id || "").toString()]
  )
    return
  if (message.author.bot || message.channel.type !== "text") return

  let plainText = !message?.content ? undefined : pierObj.discord.common.discord_reconstructPlainText(messenger, message, message?.content)

  if (await pierObj.discord.common.removeSpam(messenger, message, plainText)) return

  const edited = message.edited ? true : false
  for (let value of message.attachments.values()) {
    //media of attachment
    //todo: height,width,common.LocalizeString
    let [, res]: [any, any] = await to(
      common.downloadFile({
        type: "simple",
        remote_path: value.url,
      })
    )
    let file: string, localfile: string

    if (res?.[1]) {
      [file, localfile] = res
    } else {
      file = value.url
      localfile = value.url
    }
    log("discord")("sending attachment text: " + file)
    sendFrom({
      messenger,
      channelId: message.channel.id,
      author: pierObj.discord.adaptName(messenger, message),
      text: file,
      file: localfile,
      remote_file: file,
      edited,
    })
    //text of attachment
    const text = pierObj.discord.common.discord_reconstructPlainText(messenger, message, value.content)
    log("discord")("sending text of attachment: " + text)
    sendFrom({
      messenger,
      channelId: message.channel.id,
      author: pierObj.discord.adaptName(messenger, message),
      text,
      edited,
    })
  }

  if (message?.reference?.messageID) {
    const message_ = await message.channel.messages.fetch(
      message.reference.messageID
    )
    const text = pierObj.discord.common.discord_reconstructPlainText(messenger,
      message_,
      message_.content
    )
    log("discord")(`sending reconstructed text: ${text}`)
    sendFrom({
      messenger,
      channelId: message_.channel.id,
      author: pierObj.discord.adaptName(messenger, message_),
      text,
      quotation: true,
      edited,
    })
  }

  if (plainText) {
    log("discord")("sending reconstructed text: " + plainText)
    sendFrom({
      messenger,
      channelId: message.channel.id,
      author: pierObj.discord.adaptName(messenger, message),
      text: plainText,
      edited,
    })
  }
}

pierObj.discord.common.discord_reconstructPlainText = (messenger: string, message: any, text: string) => {
  if (!text) return ""
  const massMentions = ["@everyone", "@here"]
  if (
    massMentions.some((massMention: string) => text.includes(massMention)) &&
    !config.piers[messenger].massMentions
  ) {
    massMentions.forEach((massMention: string) => {
      text = text.replace(new RegExp(massMention, "g"), `\`${massMention}\``)
    })
  }
  let matches = text.replace(/#0000/, "").match(/<[\!&]?@[^# ]{2,32}>/g)
  if (matches && matches[0])
    for (let match of matches) {
      const core = match.replace(/[@<>\!&]/g, "")
      const member = message.channel.guild.members.cache
        .array()
        .find(
          (member: any) =>
            (member.nickname || member.user?.username) &&
            member.user.id.toLowerCase() === core
        )
      if (member)
        text = text
          .replace(/#0000/, "")
          .replace(match, "@" + (member.nickname || member.user.username))
    }
  matches = text.match(/<#[^# ]{2,32}>/g)
  if (matches?.[0])
    for (let match of matches) {
      const core = match.replace(/[<>#]/g, "")
      const chan = Object.keys(config.cache[messenger]).filter(
        (i) => config.cache[messenger][i] === core
      )
      if (chan[0]) text = text.replace(match, "#" + chan[0])
    }

  return text
}

pierObj.discord.adaptName = (messenger: string, message: any) => {
  return message.member?.nickname || message.author?.username
}

pierObj.discord.convertFrom = async ({
  text,
  messenger,
}: {
  text: string
  messenger: string
}) => {
  const result = discordParser.toHTML(text).replace(/<span class="d-spoiler">/g, '<span class="spoiler">')

  log(messenger)({
    messenger,
    "converting text": text,
    result,
  })
  return result
}

pierObj.discord.convertTo = async ({
  text,
  messenger,
  messengerTo,
}: {
  text: string
  messenger: string
  messengerTo: string
}) => {
  const result = await common.unescapeHTML({
    text: html2md.convert({
      string: text
        .replace(/&#x2A;/g, "&#x5C;&#x2A;")
        .replace(/&#x5F;/g, "&#x5C;&#x5F;"),
      hrefConvert: false,
      dialect: messengerTo,
    }),
    convertHtmlEntities: true,
    escapeBackslashes: false,
  })
  log(messenger)({ messengerTo, "converting text": text, result })
  return result
}

pierObj.discord.getChannels = async (pier: string): Promise<void> => {
  const json: Json = {}
  for (const value of generic[pier].client.channels.cache.values()) {
    if (value.guild.id === config.piers[pier].guildId) {
      json[value.name] = value.id
    }
  }
  config.cache[pier] = json
}

pierObj.discord.StartService = async ({ messenger }: { messenger: string }) => {
  if (!config.MessengersAvailable[messenger]) return

  await new Promise((resolve: any) => {
    const client = new Discord.Client()
    generic[messenger].client = client
    generic[messenger].client.once("ready", () => {
      generic[messenger].guilds = client.guilds.cache.array()
      if (config.piers[messenger].guildId) {
        const guild = client.guilds.cache.find(
          (guild: any) =>
            guild.name.toLowerCase() === config.piers[messenger].guildId.toLowerCase() ||
            guild.id === config.piers[messenger].guildId
        )
        if (guild)
          generic[messenger].guilds = [
            guild,
            ...generic[messenger].guilds.filter(
              (_guild: any) => _guild.id !== guild.id
            ),
          ]
      }
      resolve(null)
    })
    generic[messenger].client.on("error", (error: any) => {
      resolve(null)
      log("discord")(error)
      // pierObj.discord();.StartService
    })

    generic[messenger].client.on("message", (message: any) => {
      pierObj.discord.receivedFrom(messenger, message)
    })
    generic[messenger].client.on(
      "messageUpdate",
      (oldMessage: any, message: any) => {
        if (oldMessage.content != message.content) {
          message.edited = true
          pierObj.discord.receivedFrom(messenger, message)
        }
      }
    )
    generic[messenger].client.login(config.piers[messenger].token)
  })
}
///discord

//telegram
pierObj.telegram.common = {
  Start: async function ({ messenger }: { messenger: string }) {
    return new Telegram(config.piers[messenger].token, {
      polling: true,
    })
  }
}

pierObj.telegram.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
}: IsendToArgs) => {
  try {
    log("telegram")({ "sending text": chunk })
    await generic[messenger].client
      .sendMessage(channelId, chunk, {
        parse_mode: "HTML",
      });
  } catch (error) {
    error = util.inspect(error, { showHidden: false, depth: 4 })
    common.LogToAdmin(`Error sending a chunk:\n\nMessenger: ${messenger}.\n\nChannel: ${channelId}.\n\nChunk: ${escapeHTML(chunk as string)}\n\nError message: ${error}`)
  }
}

pierObj.telegram.receivedFrom = async (messenger: string, message: Telegram.Message) => {
  //spammer
  //1. remove entered bots
  pierObj.telegram.common.TelegramRemoveAddedBots(messenger, message)
  //2. check if admin else leave chat and return
  if (await pierObj.telegram.common.TelegramLeaveChatIfNotAdmin(messenger, message)) return
  //3. check for spam
  if (await pierObj.telegram.common.removeSpam(messenger, message)) return
  //4. check if new member event
  if (pierObj.telegram.common.TelegramRemoveNewMemberMessage(messenger, message)) return
  //now deal with the message that is fine
  if (!config.channelMapping[messenger]) return

  const age = Math.floor(Date.now() / 1000) - message.date
  if (age > (config.piers[messenger].maxMsgAge || 0))
    return console.log(
      `skipping ${age} seconds old message! NOTE: change this behaviour with config.telegram.maxMsgAge, also check your system clock`
    )

  if (!config.channelMapping[messenger][message.chat.id]) {
    if (
      config.cache[messenger][message.chat.title] &&
      config.cache[messenger][message.chat.title] === message.chat.id
    )
      return //cached but unmapped channel so ignore it and exit the function
    await
      pierObj.telegram.common.NewChannelAppeared({
        messenger,
        channelName: message.chat.title,
        channelId: message.chat.id,
      })

    if (!config.channelMapping[messenger][message.chat.id]) return
  }

  // skip posts containing media if it's configured off
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

  const { author, avatar } = await pierObj.telegram.GetName(messenger, message.from)

  await pierObj.telegram.common.sendFromTelegram({
    messenger,
    message: message.reply_to_message,
    quotation: true,
    author,
    avatar
  })
  await pierObj.telegram.common.sendFromTelegram({ messenger, message, author, avatar })
}

// reconstructs the original raw markdown message
pierObj.telegram.common.telegram_reconstructMarkdown = (msg: Telegram.Message) => {
  return { ...msg, text: fillMarkdownEntitiesMarkup(msg.text, msg.entities || [], logger) }
}

pierObj.telegram.common.IsSpam = (message: any): boolean => {
  const l = config.spamremover.telegram
    .map((rule: any) => {
      let matches = true
      for (const key of Object.keys(rule)) {
        const msg_val = R.path(key.split("."), message)
        if (rule[key] === true && !msg_val) matches = false
        if (
          typeof rule[key] === "object" &&
          (!msg_val || msg_val.search(new RegExp(rule[key].source, "i")) === -1)
        )
          matches = false
      }
      return matches
    })
    .some(Boolean)
  return l
}

pierObj.telegram.common.sendFromTelegram = async ({
  messenger,
  message,
  quotation,
  author,
  avatar
}: {
  messenger: string
  message: any
  quotation?: boolean
  author?: string
  avatar?: string
}) => {
  if (!message) return

  let action
  message = pierObj.telegram.common.telegram_reconstructMarkdown(message)
  //collect attachments
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
  let arrMessage = Object.keys(jsonMessage).sort(
    (a, b) => jsonMessage[a].index - jsonMessage[b].index
  )

  // const reply_to_bot =
  //   quotation && message.from.id === config.telegram.myUser.id
  // if (reply_to_bot && jsonMessage["text"] && jsonMessage["text"].text) {
  //   const arrTxtMsg = jsonMesole.logssage["text"].text.split(": ")
  //   author = author ?? arrTxtMsg[0]
  //   jsonMessage["text"].text = arrTxtMsg.slice(1).join(": ")
  // } else if (!reply_to_bot) {
  // }
  // now send from Telegram
  for (let i: number = 0; i < arrMessage.length; i++) {
    const el = arrMessage[i]
    if (el === "text") {
      jsonMessage[el].text = jsonMessage[el].text.replace(
        `@${config.piers[messenger].myUser.username}`,
        ""
      )
      if (
        quotation &&
        jsonMessage[el].text.length > config.piers[messenger].MessageLength
      )
        jsonMessage[el].text = `${jsonMessage[el].text.substring(
          0,
          config.piers[messenger].MessageLength - 1
        )} ...`
    }
    if (jsonMessage[el].url)
      [
        jsonMessage[el].url,
        jsonMessage[el].local_file,
      ] = await common.downloadFile({
        messenger,
        type: "telegram",
        fileId: jsonMessage[el].url
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

    sendFrom({
      messenger,
      channelId: message.chat.id,
      author,
      text,
      action,
      quotation,
      file: jsonMessage[el].local_file,
      remote_file: jsonMessage[el].url,
      edited,
      avatar
    })
  }
}

pierObj.telegram.adaptName = (messenger: string, name: string) => config.piers[messenger].userMapping[name] || name

pierObj.telegram.GetName = async (messenger: string, user: Telegram.User) => {
  let name = config.piers[messenger].nameFormat
  if (user.username) {
    name = name.replace("%username%", user.username, "g")
    name = pierObj.telegram.adaptName(messenger, name)
  } else {
    // if user lacks username, use fallback format string instead
    name = name.replace(
      "%username%",
      config.piers[messenger]?.usernameFallbackFormat,
      "g"
    )
  }

  name = name.replace("%firstName%", user.first_name || "", "g")
  name = name.replace("%lastName%", user.last_name || "", "g")

  // get rid of leading and trailing whitespace
  name = name.replace(/(^\s*)|(\s*$)/g, "")

  //now avatar
  let link: string
  try {
    const { photos } = await generic[messenger].client.getUserProfilePhotos(user.id, { limit: 1 })
    const file_id = photos?.[0]?.[0]?.file_id
    link = await generic[messenger].client.getFileLink(file_id)
  } catch (error) {

  }
  return { author: name, avatar: link }
}

pierObj.telegram.convertFrom = async ({
  text,
  messenger,
}: {
  text: string
  messenger: string
}) => {
  const res = markedParse({
    text: text.replace(
      /<p><code>([\s\S]*?)<\/code><\/p>/gim,
      "<p><pre>$1</pre></p>"
    )
      .replace(/<span class="tg-spoiler">/g, '<span class="spoiler">')
    ,
    messenger: "telegram",
    dontEscapeBackslash: true,
    unescapeCodeBlocks: true
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
          "<pre>$1</pre>"
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
      ]
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

pierObj.telegram.common.removeSpam = async (messenger: string, message: Telegram.Message) => {
  const cloned_message = JSON.parse(JSON.stringify(message))
  if (pierObj.telegram.common.IsSpam(cloned_message)) {
    if (message.text && message.text.search(/\bt\.me\b/) >= 0) {
      const [err, chat]: [any, any] = await to(
        generic[messenger].client.getChat(message.chat.id)
      )
      if (!err) {
        const invite_link = chat.invite_link
        cloned_message.text = cloned_message.text.replace(invite_link, "")
        if (pierObj.telegram.common.IsSpam(cloned_message))
          pierObj.telegram.common.telegram_DeleteMessage({ messenger, message, log: true })
      } else {
        common.LogToAdmin(
          `error on getting an invite link of the chat ${message.chat.id} ${message.chat.title}`
        )
      }
    } else {
      const [err, chat] = await to(
        generic[messenger].client.getChat(cloned_message.chat.id)
      )
      if (!err) {
        pierObj.telegram.common.telegram_DeleteMessage({ messenger, message, log: true })
      } else {
        common.LogToAdmin(
          `error on getting an invite link of the chat ${cloned_message.chat.id} ${cloned_message.chat.title}`
        )
      }
    }
    return true
  } else if (config.channelMapping?.[messenger]?.[message?.chat?.id]?.settings?.restrictToLojban && message?.text) {
    // dealing with non-lojban spam
    const xovahe = xovahelojbo({ text: message.text })
    if (xovahe < 0.5) {
      generic[messenger].client
        .sendMessage(
          message.chat.id,
          ".i mi smadi le du'u do na tavla fo su'o lojbo .i ja'e bo mi na benji di'u fi la IRC\n\nIn this group only Lojban is allowed. Try posting your question to [#lojban](https://t.me/joinchat/BLVsYz3hCF8mCAb6fzW1Rw) or [#ckule](https://telegram.me/joinchat/BLVsYz4hC9ulWahupDLovA) (school) group",
          {
            reply_to_message_id: message.message_id,
            parse_mode: "Markdown",
          }
        )
        .catch((e: any) =>
          log("telegram")({
            error: e.toString(),
          })
        )
      return true
    }
  }
}

pierObj.telegram.common.TelegramRemoveAddedBots = (messenger: string, message: Telegram.Message) => {
  if (config.piers[messenger].remove_added_bots)
    (message?.new_chat_members || []).map((u: Telegram.User) => {
      if (u.is_bot && config.piers[messenger]?.myUser?.id !== u.id)
        generic[messenger].client
          .kickChatMember(message.chat.id, u.id)
          .catch(catchError)
    })
}

pierObj.telegram.common.TelegramRemoveNewMemberMessage = (messenger: string, message: Telegram.Message) => {
  if (
    message?.left_chat_member ||
    (message?.new_chat_members || []).filter(
      (u: Telegram.User) =>
        (u.username || "").length > 100 ||
        (u.first_name || "").length > 100 ||
        (u.last_name || "").length > 100
    ).length > 0
  ) {
    pierObj.telegram.common.telegram_DeleteMessage({ messenger, message, log: false })
  }
  if (message.left_chat_member || message.new_chat_members) return true
  return false
}

pierObj.telegram.common.TelegramLeaveChatIfNotAdmin = async (messenger: string, message: Telegram.Message) => {
  if (
    !["group", "supergroup"].includes(message?.chat?.type) ||
    !message?.chat?.id ||
    !config.piers[messenger]?.myUser?.id
  )
    return

  let [err, res]: [any, any] = await to(
    generic[messenger].client.getChatMember(
      message.chat.id,
      config.piers[messenger]?.myUser?.id
    )
  )
  if (!res) return true
  if (!res.can_delete_messages) {
    ;[err, res] = await to(generic[messenger].client.leaveChat(message.chat.id))

    const jsonMessage = {
      id: message?.chat?.id || message?.from?.id,
      title: message?.chat?.title,
      first_name: message?.from?.first_name,
      last_name: message?.from?.last_name,
      username: message?.from?.username,
      message: message?.text,
    }
    common.LogToAdmin(`leaving chat ${JSON.stringify(jsonMessage)}`)
    delete config.cache?.[messenger]?.[message?.chat?.title]
    await to(
      common.writeCache({
        pier: messenger,
        channelName: message.chat.title,
        channelId: message.chat.id,
        action: "leave",
      })
    )
    return true
  }
  return false
}

pierObj.telegram.common.telegram_DeleteMessage = async ({
  messenger,
  message,
  log,
}: {
  messenger: string
  message: Telegram.Message
  log: boolean
}) => {
  if (log) await to(common.LogMessageToAdmin(messenger, message))
  await to(
    generic[messenger].client.deleteMessage(message.chat.id, message.message_id)
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
  // if (!channelName) return;
  config.cache[messenger][channelName] = channelId

  await to(
    common.writeCache({ channelName, channelId, action: "join" })
  );
  const [err] = await to(common.PopulateChannelMapping())


  if (err) {
    common.LogToAdmin(
      `got problem in the new telegram chat ${channelName}, ${channelId}`
    )
    return false;
  }
  return true
}

pierObj.telegram.getChannels = async (pier: string): Promise<void> => {
  //read from file
  let res = {}
  try {
    res = JSON.parse(fs.readFileSync(`${cache_folder}/cache.json`))[pier]
  } catch (error) { }
  config.cache[pier] = res

  //check for changes from config.js
  // const cachedGroupNames = Object.keys(config.cache[pier]);
  // let uniqueTelegramGroups: string[] = [];
  // config.new_channels.map((i: any) => {
  //   if (i[pier]) uniqueTelegramGroups.push(i[pier]);
  // });

  // uniqueTelegramGroups = Array.from(new Set(uniqueTelegramGroups));

  // for (let groupName of cachedGroupNames) {
  //   const groupId = config.cache[pier][groupName];
  //   if (!uniqueTelegramGroups.includes(groupName)) delete config.cache[pier][groupName]
  //   await common.writeCache({ pier, channelName: groupName, channelId: groupId, action: "group removed in config" })
  // }
}

pierObj.telegram.StartService = async ({ messenger }: { messenger: string }) => {
  //telegram
  if (!config.MessengersAvailable[messenger]) return
  generic[messenger].client = await pierObj.telegram.common.Start({ messenger })
  generic[messenger].client.on("message", (message: any) => {
    pierObj.telegram.receivedFrom(messenger, message)
  })
  generic[messenger].client.on("edited_message", (message: any) => {
    pierObj.telegram.receivedFrom(messenger, message)
  })
  generic[messenger].client.on("polling_error", (error: any) => {
    logger.log({
      level: "error",
      function: "pierObj.telegram.StartService",
      error_code: error?.code,
      response_code: error?.response?.body?.error_code,
    })
    generic[messenger].client.stopPolling().then(() => {
      setTimeout(() => {
        logger.log({
          level: "info",
          function: "pierObj.telegram.StartService",
          message: "restarting polling",
        })
        generic[messenger].client.startPolling();
      }, 3000)
    })

    // if (error.code === "ETELEGRAM" && error.response.body.error_code === 404) {
    //   config.MessengersAvailable[messenger] = false
    // }
  })
  const [err, res] = await to(generic[messenger].client.getMe())
  if (!err) config.piers[messenger].myUser = res
}

pierObj.webwidget.common = {
  Start: async function () {
    return
  }
}

pierObj.vkboard.common = {
  Start: async function ({ messenger }: { messenger: string }) {
    const callbackService = new CallbackService();

    const direct = new ImplicitFlowUser({
      callbackService,
      scope: "offline,wall,groups",
      apiVersion: config.piers[messenger].apiVersion,
      login: config.piers[messenger].login,
      password: config.piers[messenger].password,
      // manually provide app credentials
      clientId: config.piers[messenger].appId,
      clientSecret: config.piers[messenger].appSecret
    });

    const [err, vkapp] = await to(direct.run())

    if (err) {
      console.error("vkboard", err.toString())
    }
    const vkbot = new VkBot({
      token: config.piers[messenger].token,
      group_id: config.piers[messenger].group_id,
    })
    return { bot: vkbot, vkapp }
  }
}

pierObj.vkwall.common = {
  Start: async function ({ messenger }: { messenger: string }) {
    const callbackService = new CallbackService();

    const direct = new ImplicitFlowUser({
      callbackService,
      scope: "offline,wall,groups",
      apiVersion: config.piers[messenger].apiVersion,
      login: config.piers[messenger].login,
      password: config.piers[messenger].password,
      // manually provide app credentials
      clientId: config.piers[messenger].appId,
      clientSecret: config.piers[messenger].appSecret
    });
    const [err, vkapp] = await to(direct.run())
    if (err) {
      console.error("vkwall", err.toString())
    }
    const vkbot = new VkBot({
      token: config.piers[messenger].token,
      group_id: config.piers[messenger].group_id,
    })
    return { bot: vkbot, vkapp }
  }
}

pierObj.slack.common = {
  Start: async function ({ messenger }: { messenger: string }) {
    generic[messenger].client = {
      rtm: new RTMClient(config.piers[messenger].token),
      web: new WebClient(config.piers[messenger].token),
    }
    generic[messenger].client.rtm.start().catch((e: any) => {
      if (!e?.data?.ok) {
        config.MessengersAvailable[messenger] = false
        log("slack")({
          error: "Couldn't start Slack",
        })
      }
    })
    return true
  }
}
pierObj.mattermost.common = {
  Start: async function ({ messenger }: { messenger: string }) {
    let [err, res]: [any, any] = await to(
      new Promise((resolve) => {
        const credentials = {
          login_id: config.piers[messenger].login,
          password: config.piers[messenger].password,
        }
        const url = `${config.piers[messenger].ProviderUrl}/api/v4/users/login`
        request(
          {
            body: JSON.stringify(credentials),
            method: "POST",
            url,
          },
          (err: any, response: any, body: any) => {
            if (err) {
              console.error(err)
              resolve(null)
            } else {
              resolve({
                token: response?.headers?.token || "",
                id: JSON.parse(body).id,
              })
            }
          }
        )
      })
    )
    if (err || !res) {
      config.MessengersAvailable[messenger] = false
      return
    } else {
      config.piers[messenger].token = res.token
      config.piers[messenger].user_id = res.id
    }

    ;[err, res] = await to(
      new Promise((resolve) => {
        const user_id = config.piers[messenger].user_id
        const url = `${config.piers[messenger].ProviderUrl}/api/v4/users/${user_id}/teams`
        request(
          {
            method: "GET",
            url,
            headers: {
              Authorization: `Bearer ${config.piers[messenger].token}`,
            },
          },
          (error: any, response: any, body: any) => {
            if (err) {
              console.error(err)
              resolve(null)
            } else {
              const team = JSON.parse(body).find((i: any) => {
                return (
                  i.display_name === config.piers[messenger].team ||
                  i.name === config.piers[messenger].team
                )
              })
              config.piers[messenger].team_id = team.id
              resolve(team)
            }
          }
        )
      })
    )
    if (!res) {
      config.MessengersAvailable[messenger] = false
      return
    }

    const ReconnectingWebSocket = require("reconnecting-websocket")
    return new ReconnectingWebSocket(config.piers[messenger].APIUrl, [], {
      WebSocket: require("ws"),
    })
  }
}

// sendTo
async function FormatMessageChunkForSending({
  messenger,
  channelId,
  author,
  chunk,
  action,
  title,
  quotation,
}: {
  messenger: string
  channelId: number | string
  author: string
  chunk: Chunk
  action: string
  title?: string
  quotation: boolean
}) {
  const root_messenger = common.root_of_messenger(messenger)
  if (quotation) {
    if (!author || author === "") author = "-"
    chunk = common.LocalizeString({
      messenger,
      channelId,
      localized_string_key: `OverlayMessageWithQuotedMark.${root_messenger}`,
      arrElemsToInterpolate: [
        ["author", author],
        ["chunk", chunk],
        ["title", title],
      ],
    })

    logger.log({
      level: "info",
      function: "OverlayMessageWithQuotedMark",
      messenger,
      channelId,
      author,
      chunk,
      title
    })

  } else if ((author || "") !== "") {
    if ((config.piers[messenger].Actions || []).includes(action)) {
      chunk = common.LocalizeStringWrapper({
        messenger,
        channelId,
        localized_string_key: `sendTo.${root_messenger}.action`,
        arrElemsToInterpolate: [
          ["author", author],
          ["chunk", chunk],
          ["title", title],
        ],
      })
    } else {
      chunk = common.LocalizeStringWrapper({
        messenger,
        channelId,
        localized_string_key: `sendTo.${root_messenger}.normal`,
        arrElemsToInterpolate: [
          ["author", author],
          ["chunk", chunk],
          ["title", title],
        ],
      })
    }
  } else {
    chunk = common.LocalizeStringWrapper({
      messenger,
      channelId,
      localized_string_key: `sendTo.${root_messenger}.ChunkOnly`,
      arrElemsToInterpolate: [
        ["chunk", chunk],
        ["title", title],
      ],
    })
  }
  return chunk
}

pierObj.webwidget.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
}: IsendToArgs) => {
  await new Promise((resolve: any) => {
    const data = {
      channelId,
      author,
      chunk,
      action,
      quotation,
      file,
      edited,
    }
    generic[messenger].Lojban1ChatHistory.push(data)
    generic[messenger].Lojban1ChatHistory = generic[messenger].Lojban1ChatHistory.slice(
      (config.piers[messenger].historyLength || 201) * -1
    )
    generic[messenger].client.emit("sentFrom", {
      data,
    })
    log("webwidget")({ "sending message": data })
    resolve(null)
  })
}

// pierObj.facebook.sendTo = async ({
//   messenger,
//   channelId,
//   author,
//   chunk,
//   action,
//   quotation,
//   file,
//   edited,
// }: IsendToArgs) => {
//   await new Promise((resolve: any) => {
//     setTimeout(() => {
//       const jsonMessage: Json = {
//         body: chunk,
//       }
//       if (file) jsonMessage.attachment = fs.createReadStream(file)
//       generic[messenger].client.sendMessage(channelId, chunk).catch(catchError)
//       resolve(null)
//     }, 500)
//   })
// }


pierObj.mattermost.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
}: IsendToArgs) => {
  await new Promise((resolve: any) => {
    const option = {
      url: config.piers[messenger].HookUrl,
      json: {
        text: chunk,
        // username: author,
        channel: channelId,
      },
    }
    request.post(
      option,
      (error: any, response: any, body: any) => {
        resolve(null)
      }
    )
  })
}
pierObj.vkwall.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
}: IsendToArgs) => {
  if (!generic[messenger].client.vkapp) {
    config.MessengersAvailable[messenger] = false
    return
  }
  await new Promise((resolve: any) => {
    const token = generic[messenger].client.vkapp.token
    setTimeout(() => {
      generic[messenger].client.bot
        .api("wall.createComment", {
          access_token: token,
          owner_id: "-" + config.piers[messenger].group_id,
          post_id: channelId,
          from_group: config.piers[messenger].group_id,
          reply_to_comment: 1,
          message: chunk,
        })
        .then((res: any) => { })
        .catch(() => { })
      resolve(null)
    }, 60000)
  })
}

pierObj.vkboard.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
}: IsendToArgs) => {
  //todo: if !vk.WaitingForCaptcha return

  if (!generic[messenger].client.vkapp) {
    config.MessengersAvailable[messenger] = false
    return
  }
  await new Promise((resolve: any) => {
    const token = generic[messenger].client.vkapp.token
    setTimeout(() => {
      generic[messenger].client.bot
        .api("board.createComment", {
          access_token: token,
          group_id: config.piers[messenger].group_id,
          topic_id: channelId,
          message: chunk,
          from_group: 1,
        })
        .then((res: any) => { })
        .catch(() => { })
      resolve(null)
    }, 60000)
  })
  // if (err.error.error_code === 14) {
  //   vkboard.io.setCaptchaHandler(async ({ src }, retry) => {
  //     //todo: send image to telegram,a reply is expected
  //     vk.WaitingForCaptcha = true;
  //     const key = await myAwesomeCaptchaHandler(src);
  //     vk.WaitingForCaptcha = false;
  //     try {
  //       await retry(key);
  //
  //       console.log("Капча успешно решена");
  //     } catch (error) {
  //       console.log("Капча неверная", error.toString());
  //     }
  //   });
  // }
}
// async function myAwesomeCaptchaHandler() {}

pierObj.slack.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
}: IsendToArgs) => {
  chunk = emoji.unemojify(chunk)
  generic[messenger].client.web.chat
    .postMessage({
      channel: channelId,
      username: (author || "").replace(/(^.{21}).*$/, "$1"),
      text: chunk,
    }).catch((error: any) => {
      logger.log({
        level: "error",
        function: "slack.sendTo",
        message: error.toString(),
      })
    })
}

pierObj.irc.sendTo = async ({
  messenger,
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited,
}: IsendToArgs) => {
  log("irc")({ "sending for irc": chunk })
  generic[messenger].client.say(channelId, chunk)
}

async function prepareChunks({
  messenger,
  channelId,
  text,
  edited,
  messengerTo,
}: {
  messenger: string
  messengerTo: string
  channelId: string | number
  text: string
  edited?: boolean
}) {
  const root_messengerTo = common.root_of_messenger(messengerTo)
  const arrChunks: Chunk[] = (pierObj[messengerTo]?.common?.GetChunks) ? await pierObj[messengerTo]?.common?.GetChunks(text, messengerTo) : await common.GetChunks(text, messengerTo)

  for (let i in arrChunks) {
    log("generic")(
      `converting for messenger ${messengerTo} the text "` + arrChunks[i] + `"`
    )
    if (edited)
      arrChunks[i] = common.LocalizeString({
        messenger,
        channelId,
        localized_string_key: `OverlayMessageWithEditedMark.${root_messengerTo}`,
        arrElemsToInterpolate: [["message", arrChunks[i]]],
      })

    arrChunks[i] = await pierObj[root_messengerTo]?.convertTo({
      text: arrChunks[i] || '',
      messenger,
      messengerTo,
    })
    log("generic")(
      `converted for messenger ${messengerTo} to the text "` + arrChunks[i] + `"`
    )
  }
  return arrChunks
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
    config?.channelMapping?.[messenger]?.[targetChannel]?.settings?.nickcolor || "mood"
  return `${ircolors.MoodifyText({
    text,
    mood: ColorificationMode,
  })}: `
}

common.prepareToWhom = function ({
  messenger,
  text,
  targetChannel,
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
    config?.channelMapping?.[messenger]?.[targetChannel]?.settings?.nickcolor || "mood"
  return `${ircolors.MoodifyText({
    text,
    mood: ColorificationMode,
  })}`
}

common.prepareAuthor = function ({
  messenger,
  text,
  targetChannel,
}: {
  messenger: string
  text: string
  targetChannel: string | number
}) {
  return `${text}`
}

async function checkHelpers({
  messenger,
  channelId,
  author,
  text,
  ToWhom,
  quotation,
  action,
  edited,
  avatar
}: {
  messenger: string
  channelId: string | number
  author: string
  text: string
  ToWhom?: string
  quotation?: boolean
  action?: string
  edited?: boolean
  avatar?: string
}) {
  const tags = ["#zlm", "#modzi"]
  text = text.replace(/<[^>]*>/g, '')
  const selected_tags = tags.filter(i => text.indexOf(i) >= 0)
  if (selected_tags.length === 0) return
  tags.forEach(tag => {
    text = text.replace(tag, '')
  })
  text = text.trim()
  if (xovahelojbo({ text }) < 0.5) return

  const puppeteer = require('puppeteer-extra')
  let browser, href
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true
    });
    let page = await browser.newPage()
    await page.goto(`https://la-lojban.github.io/melbi-zei-lojban/?ceha=${selected_tags[0]}&text=${text}`)

    await page.waitForFunction(
      "document.querySelector('#myImage') && document.querySelector('#myImage').getAttribute('data:fonts-loaded')=='true'"
    )
    href = (await page.evaluate(
      () => Array.from(
        document.querySelectorAll('#myImage'),
        a => a.getAttribute('src')
      )
    ))[0];
  } catch (error) {
    logger.log({
      level: "error",
      function: "checkHelpers",
      message: error.toString(),
    })
  }
  try {
    await browser.close()
  } catch (error) {
    logger.log({
      level: "error",
      function: "checkHelpers",
      message: error.toString(),
    })
  }
  if (!href) return
  const [file, localfile]: [string, string] = await common.downloadFile(
    {
      type: "data",
      remote_path: href
    }
  )
  universalSendTo({
    messenger,
    channelId,
    author,
    chunk: file,
    quotation,
    action,
    file: localfile,
    edited,
    avatar
  })
}

async function universalSendTo({ messenger, channelId, author,
  chunk,
  quotation,
  action,
  file,
  edited, avatar }: {
    messenger: string
    channelId: string | number
    author: string
    chunk: Chunk
    quotation?: boolean
    action?: string
    file?: string
    remote_file?: string
    edited?: boolean
    avatar?: string
  }) {
  if (config?.channelMapping?.[messenger]?.[channelId]?.settings?.readonly) return
  queueOf[messenger].add(async () => {
    await pierObj[common.root_of_messenger(messenger)]?.sendTo({
      messenger: messenger,
      channelId,
      author,
      chunk,
      quotation,
      action,
      file,
      edited,
      avatar
    })
  })
}

async function sendFrom({
  messenger,
  channelId,
  author,
  text,
  ToWhom,
  quotation,
  action,
  file,
  remote_file,
  edited,
  avatar
}: {
  messenger: string
  channelId: string | number
  author: string
  text: string
  ToWhom?: string
  quotation?: boolean
  action?: string
  file?: string
  remote_file?: string
  edited?: boolean
  avatar?: string
}) {
  const ConfigNode = config?.channelMapping?.[messenger]?.[channelId]
  if (!ConfigNode)
    return common.LogToAdmin(
      `error finding assignment to ${messenger} channel with id ${channelId}`
    )
  if (!text || text === "") return
  const messenger_core = common.root_of_messenger(messenger)
  text = await pierObj[messenger_core]?.convertFrom({ text, messenger })
  text = text.replace(/\*/g, "&#x2A;").replace(/_/g, "&#x5F;")
  text = text.replace(/^(<br\/>)+/, "")

  //zbalermorna etc.
  // await checkHelpers({
  //   messenger,
  //   channelId: ConfigNode[messenger],
  //   author,
  //   text,
  //   quotation,
  //   action,
  //   edited,
  //   avatar
  // })

  const nsfw: any = (config?.channelMapping?.[messenger]?.[channelId]?.settings?.nsfw_analysis) && file ? (await to(getNSFWString(remote_file)))[1] : null
  if (nsfw) {
    for (const nsfw_result of nsfw) {
      const translated_text = common.LocalizeString({
        messenger,
        channelId,
        localized_string_key: "nsfw_kv_" + nsfw_result.id.toLowerCase(),
        arrElemsToInterpolate: [["prob", nsfw_result.prob]],
      })
      let Chunks = await prepareChunks({
        messenger,
        channelId,
        text: translated_text,
        messengerTo: messenger,
      })
      for (const i in Chunks) {
        const chunk = Chunks[i]
        Chunks[i] = await FormatMessageChunkForSending({
          messenger,
          channelId,
          title: config.piers[messenger].group_id,
          author,
          chunk,
          action,
          quotation,
        })

      }

      Chunks.map((chunk) => {
        universalSendTo({
          messenger,
          channelId: ConfigNode[messenger],
          author,
          chunk,
          quotation,
          action,
          file,
          edited,
          avatar
        })

      })

      text = text + "<br/>" + translated_text
    }
  }
  for (const messengerTo of Object.keys(config.channelMapping)) {
    if (
      config.MessengersAvailable[messengerTo] &&
      ConfigNode[messengerTo] &&
      messenger !== messengerTo
    ) {
      let thisToWhom: string = ""
      if (ToWhom)
        if (pierObj[messengerTo]?.common?.prepareToWhom) {
          thisToWhom = pierObj[messengerTo]?.common.prepareToWhom({
            messenger: messengerTo,
            text: ToWhom,
            targetChannel: ConfigNode[messengerTo],
          })
        } else
          thisToWhom = common.prepareToWhom({
            messenger: messengerTo,
            text: ToWhom,
            targetChannel: ConfigNode[messengerTo],
          })
      if (!author) author = ""
      if (pierObj[messengerTo]?.common?.prepareAuthor) {
        author = pierObj[messengerTo]?.common?.prepareAuthor({
          messenger: messengerTo,
          text: author,
          targetChannel: ConfigNode[messengerTo],
        })
      } else
        author = common.prepareAuthor({
          messenger: messengerTo,
          text: author,
          targetChannel: ConfigNode[messengerTo],
        })

      let Chunks = await prepareChunks({
        messenger,
        channelId,
        text,
        edited,
        messengerTo,
      })

      for (const i in Chunks) {
        const chunk = Chunks[i]
        Chunks[i] = await FormatMessageChunkForSending({
          messenger: messengerTo,
          channelId,
          title: config.piers[messenger]?.group_id,
          author,
          chunk: thisToWhom + chunk,
          action,
          quotation,
        })
      }

      Chunks.map((chunk) => {
        universalSendTo({
          messenger: messengerTo,
          channelId: ConfigNode[messengerTo],
          author,
          chunk,
          quotation,
          action,
          file,
          edited,
          avatar
        })
      })
    }
  }
}

async function getNSFWString(file: string) {
  // if (file.substr(-4) !== ".jpg") return
  const tf = require("@tensorflow/tfjs-node")
  const nsfw = require("nsfwjs")
  const pic = await axios.get(file, {
    responseType: "arraybuffer",
  })
  const model = await nsfw.load() // To load a local model, nsfw.load('file://./path/to/model/')
  // Image must be in tf.tensor3d format
  // you can convert image to tf.tensor3d with tf.node.decodeImage(Uint8Array,channels)
  const image = await tf.node.decodeImage(pic.data, 3)
  let predictions = await model.classify(image)
  predictions = predictions
    .filter((className: any) => {
      if (className.className === "Neutral") return
      if (className.probability > 0.6) return true
      return
    })
    .map((i: any) => {
      return { id: i.className, prob: Math.round(i.probability * 100) }
    })
  image.dispose() // Tensor memory must be managed explicitly (it is not sufficient to let a tf.Tensor go out of scope for its memory to be released).

  return predictions.length > 0 ? predictions : null
}

// receivedFrom
pierObj.facebook.receivedFrom = async (messenger: string, message: any) => {
  if (!config?.channelMapping[messenger]?.[(message?.threadId || "").toString()]) return
  let err, res
    ;[err, res] = await to(generic[messenger].client.getUserInfo(message.authorId))
  if (err) return
  let author: string
  author = pierObj.facebook.adaptName(res)

  if (!message.attachments) message.attachments = []
  if (message.stickerId)
    message.attachments.push({ id: message.stickerId, type: "sticker" })
  for (const attachment of message.attachments) {
    if (attachment.type === "sticker") {
      ;[err, res] = await to(
        generic[messenger].client.getStickerURL(attachment.id)
      )
    } else {
      ;[err, res] = await to(
        generic[messenger].client.getAttachmentURL(message.id, attachment.id)
      )
    }
    if (err) return
    //todo: add type="photo","width","height","size"
    common.downloadFile({
      type: "simple",
      remote_path: res,
    })
      .then(([file, localfile]: [string, string]) => {
        sendFrom({
          messenger,
          channelId: message.threadId,
          author,
          text: file,
          remote_file: file,
          file: localfile,
        })
      })
  }

  if (message.message)
    sendFrom({
      messenger,
      channelId: message.threadId,
      author,
      text: message.message,
    })
}

pierObj.vkwall.receivedFrom = async (messenger: string, message: any) => {
  if (!config.channelMapping[messenger]) return
  const channelId = message.post_id
  if (
    !config.channelMapping[messenger][channelId] ||
    "-" + config.piers[messenger].group_id === message.from_id.toString()
  )
    return
  if (!generic[messenger].client.vkapp) {
    config.MessengersAvailable[messenger] = false
    return
  }
  let { text, from_id: fromwhomId } = message
  let [err, res]: [any, any] = await to(
    generic[messenger].client.bot.api("users.get", {
      user_ids: fromwhomId,
      access_token: config.piers[messenger].token,
      fields: "nickname,screen_name",
    })
  )
  res = res?.response?.[0] || fromwhomId
  const author = pierObj.vkwall.adaptName(messenger, res)

  let arrQuotes: string[] = []
  text.replace(
    /\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g,
    (match: any, group_id: string, post_id: string) => {
      if (group_id === config.piers[messenger].group_id) {
        arrQuotes.push(post_id)
      }
    }
  )
  if (arrQuotes.length > 0) {
    const token = generic[messenger].client.vkapp.token
    for (const el of arrQuotes) {
      const opts = {
        access_token: token,
        group_id: config.piers[messenger].group_id,
        topic_id: channelId,
        start_comment_id: el,
        count: 1,
        v: "5.84",
      }
        ;[err, res] = await to(
          generic[messenger].client.bot.api("board.getComments", opts)
        )
      let text: string = res?.response?.items?.[0]?.text
      if (!text) continue
      let replyuser: string
      const rg = new RegExp(
        `^\\[club${config.piers[messenger]?.group_id}\\|(.*?)\\]: (.*)$`
      )
      if (rg.test(text)) {
        ;[, replyuser, text] = text.match(rg)
      } else {
        let authorId = res?.response?.items?.[0]?.from_id
          ;[err, res] = await to(
            generic[messenger].client.bot.api("users.get", {
              user_ids: authorId,
              access_token: config.piers[messenger].token,
              fields: "nickname,screen_name",
            })
          )
        replyuser = res?.response?.[0] || ""
        replyuser = pierObj.vkwall.adaptName(messenger, replyuser)
      }
      sendFrom({
        messenger,
        channelId,
        author: replyuser,
        text,
        quotation: true,
      })
    }
  }
  const attachments = message.attachments || []
  let texts = []
  if (attachments.length > 0) {
    for (let a of attachments) {
      switch (a.type) {
        case "photo":
        case "posted_photo":
          try {
            const sizes = a.photo.sizes
              .map((i: any) => {
                i.square = i.width * i.height
                return i
              })
              .sort((d: any, c: any) => parseFloat(c.size) - parseFloat(d.size))
            texts.push(sizes[0].url)
            texts.push(a.photo.text)
          } catch (e) { }
          break
        case "doc":
          try {
            texts.push(a.doc.url)
          } catch (e) { }
          break
      }
    }
  }
  texts.filter(Boolean).map((mini: string) => {
    sendFrom({
      messenger,
      edited: message.edited,
      channelId,
      author,
      text: mini,
    })
  })
  sendFrom({
    messenger,
    edited: message.edited,
    channelId,
    author,
    text,
  })
}

pierObj.vkboard.receivedFrom = async (messenger: string, message: any) => {
  if (!config.channelMapping[messenger]) return
  const channelId = message.topic_id
  if (
    !config.channelMapping[messenger][channelId] ||
    message.topic_owner_id === message.from_id
  )
    return
  if (!generic[messenger].client.vkapp) {
    config.MessengersAvailable[messenger] = false
    return
  }
  let text = message.text
  const fromwhomId = message.from_id
  let [err, res]: [any, any] = await to(
    generic[messenger].client.bot.api("users.get", {
      user_ids: fromwhomId,
      access_token: config.piers[messenger].token,
      fields: "nickname,screen_name",
    })
  )
  res = res?.response?.[0] || fromwhomId
  const author = pierObj.vkboard.adaptName(messenger, res)

  let arrQuotes: string[] = []
  text.replace(
    /\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g,
    (match: any, group_id: string, post_id: string) => {
      if (group_id === config.piers[messenger].group_id) {
        arrQuotes.push(post_id)
      }
    }
  )
  if (arrQuotes.length > 0) {
    const token = generic[messenger].client.vkapp.token
    for (const el of arrQuotes) {
      const opts = {
        access_token: token,
        group_id: config.piers[messenger].group_id,
        topic_id: channelId,
        start_comment_id: el,
        count: 1,
        v: "5.84",
      }
        ;[err, res] = await to(
          generic[messenger].client.bot.api("board.getComments", opts)
        )
      let text: string = res?.response?.items?.[0]?.text
      if (!text) continue
      let replyuser: string
      const rg = new RegExp(
        `^\\[club${config.piers[messenger].group_id}\\|(.*?)\\]: (.*)$`
      )
      if (rg.test(text)) {
        ;[, replyuser, text] = text.match(rg)
      } else {
        let authorId = res?.response?.items?.[0]?.from_id
          ;[err, res] = await to(
            generic[messenger].client.bot.api("users.get", {
              user_ids: authorId,
              access_token: config.piers[messenger]?.token,
              fields: "nickname,screen_name",
            })
          )
        replyuser = res?.response?.[0] || ""
        replyuser = pierObj.vkboard.adaptName(messenger, replyuser)
      }
      sendFrom({
        messenger,
        channelId,
        author: replyuser,
        text,
        quotation: true,
      })
    }
  }
  const attachments = message.attachments || []
  let texts = []
  if (attachments.length > 0) {
    for (let a of attachments) {
      switch (a.type) {
        case "photo":
        case "posted_photo":
          try {
            const sizes = a.photo.sizes
              .map((i: any) => {
                i.square = i.width * i.height
                return i
              })
              .sort((d: any, c: any) => parseFloat(c.size) - parseFloat(d.size))
            texts.push(sizes[0].url)
            texts.push(a.photo.text)
          } catch (e) { }
          break
        case "doc":
          try {
            texts.push(a.doc.url)
          } catch (e) { }
          break
      }
    }
  }
  texts.filter(Boolean).map((mini: string) => {
    sendFrom({
      messenger,
      edited: message.edited,
      channelId,
      author,
      text: mini,
    })
  })
  sendFrom({
    messenger,
    edited: message.edited,
    channelId,
    author,
    text,
  })
}

pierObj.slack.receivedFrom = async (messenger: string, message: any) => {
  if (!config.channelMapping[messenger]) return
  if (
    message.subtype === "message_changed" &&
    message?.message?.text === message?.previous_message?.text &&
    (message?.files || []).length === 0
  )
    return
  if (
    (message.subtype &&
      !["me_message", "channel_topic", "message_changed"].includes(
        message.subtype
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
    })
  )

  let err: any, user: any, chan: any, files: any[]
    ;[err, user] = await to(promUser)
  if (err) user = message.user
    ;[err, chan] = await to(promChannel)
  if (err) chan = message.channel
    ;[err, files] = await to(Promise.all(promFiles))
  if (err) files = []
  const author = pierObj.slack.adaptName(messenger, user)
  const channelId = chan.channel.name || message.channel

  let action
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
  if (files.length > 0)
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

pierObj.mattermost.receivedFrom = async (messenger: string, message: any) => {
  // log("mattermost")(message);
  // if (process.env.log)
  //   logger.log({
  //     level: "info",
  //     message: JSON.stringify(message)
  //   });
  if (!config.channelMapping[messenger]) return
  let channelId, msgText, author, file_ids, postParsed
  if (message.event === "post_edited") {
    const post = JSON.parse(message.data?.post || "")

    if (!post.id) return
    message.event = "posted"
    message.edited = true
    let err: any
      ;[err] = await to(
        new Promise((resolve) => {
          const url = `${config.piers[messenger].ProviderUrl}/api/v4/posts/${post.id}`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${config.piers[messenger].token}`,
              },
            },
            (error: any, response: any, body: any) => {
              if (error) {
                console.error(error.toString())
              } else {
                msgText = JSON.parse(body).message
                file_ids = JSON.parse(body).file_ids
              }
              resolve(null)
            }
          )
        })
      )
    if (err) console.error(err.toString())
      ;[err] = await to(
        new Promise((resolve) => {
          const url = `${config.piers[messenger].ProviderUrl}/api/v4/users/${post.user_id}`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${config.piers[messenger].token}`,
              },
            },
            (error: any, response: any, body: any) => {
              if (error) {
                console.error(error.toString())
              } else {
                body = JSON.parse(body)
                author = body.username || body.nickname || body.first_name || ""
              }
              resolve(null)
            }
          )
        })
      )
    if (err) console.error(err.toString())
      ;[err] = await to(
        new Promise((resolve) => {
          const url = `${config.piers[messenger].ProviderUrl}/api/v4/channels/${post.channel_id}`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${config.piers[messenger].token}`,
              },
            },
            (error: any, response: any, body: any) => {
              const json: Json = {}
              if (error) {
                console.error(error.toString())
              } else {
                channelId = JSON.parse(body).name
              }
              resolve(null)
            }
          )
        })
      )
    if (err) console.error(err.toString())
  } else {
    message.edited = false
    if (message.data?.team_id !== config.piers[messenger].team_id) return
    if (message.event !== "posted") return
    const post = message.data?.post
    if (!post) return
    postParsed = JSON.parse(post)
    channelId = message.data?.channel_name
  }
  if (
    config.channelMapping[messenger][channelId] &&
    !postParsed?.props?.from_webhook &&
    (postParsed?.type || "") === ""
  ) {
    if (!file_ids) file_ids = postParsed?.file_ids || []
    let files = []
    for (const file of file_ids) {
      const [err, promfile] = await to(
        new Promise((resolve) => {
          const url = `${config.piers[messenger].ProviderUrl}/api/v4/files/${file}/link`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${config.piers[messenger].token}`,
              },
            },
            (error: any, response: any, body: any) => {
              const json: Json = {}
              if (error) {
                console.error(error.toString())
                resolve(null)
              } else {
                resolve(JSON.parse(body).link)
              }
            }
          )
        })
      )
      if (err) console.error(err.toString())
      const [err2, promfile2] = await to(
        new Promise((resolve) => {
          const url = `${config.piers[messenger].ProviderUrl}/api/v4/files/${file}/info`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${config.piers[messenger].token}`,
              },
            },
            (error: any, response: any, body: any) => {
              const json: Json = {}
              if (error) {
                console.error(error.toString())
                resolve(null)
              } else {
                resolve(JSON.parse(body).extension)
              }
            }
          )
        })
      )
      if (err2) console.error(err.toString())
      if (promfile && promfile2) files.push([promfile2, promfile])
    }
    author = author || message.data?.sender_name
    author = author.replace(/^@/, "")
    if (files.length > 0) {
      for (const [extension, file] of files) {
        const [file_, localfile]: [string, string] = await common.downloadFile(
          {
            type: "simple",
            remote_path: file,
            extension,
          }
        )
        sendFrom({
          messenger,
          channelId,
          author,
          text: file_,
          file: localfile,
          remote_file: file_,
          edited: message.edited,
        })
      }
    }
    let action
    //todo; handle mattermost actions
    sendFrom({
      messenger,
      channelId,
      author,
      text: msgText || postParsed?.message,
      action,
      edited: message.edited,
    })
  }
}

pierObj.irc.receivedFrom = async (messenger: string, {
  author,
  channelId,
  text,
  handler,
  error,
  type,
}: {
  author: string
  channelId: string
  text: string
  handler: any
  error: any
  type: string
}) => {
  if (!config?.channelMapping[messenger]) return
  if (type === "message") {
    if (text.search(new RegExp(config.spamremover.irc.source, "i")) >= 0) return
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
      ;[, author, text] = text.match(/^<b>(.+?)<\/b>: (.*)/)
    if (text && text !== "") {
      sendFrom({
        messenger,
        channelId,
        author,
        text,
      })
    }
  } else if (type === "action") {
    sendFrom({
      messenger,
      channelId,
      author,
      text,
      action: "action",
    })
  } else if (type === "topic") {
    const topic = common.LocalizeString({
      messenger,
      channelId,
      localized_string_key: type,
      arrElemsToInterpolate: [[type, text]],
    })
    if (!config.channelMapping[messenger][channelId]) return

    if (
      !topic ||
      !config.piers[messenger].sendTopic ||
      // ignore first topic event when joining channel and unchanged topics
      // (should handle rejoins)
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
  } else if (type === "error") {
    console.error`IRC ERROR:`
    console.error(error)
    //todo: restart irc and resend the message:
    // pierObj.irc.StartService({messenger})
  } else if (type === "registered") {
    config.piers[messenger].ircPerformCmds.forEach((cmd: string) => {
      handler.send.apply(null, cmd.split(" "))
    })
    config.piers[messenger].ircOptions.channels.forEach((channel: string) => {
      handler.join(channel)
    })
  }
}

// AdaptName
pierObj.facebook.adaptName = (user: any) => user.name // || user.vanity || user.firstName;
pierObj.vkboard.adaptName = (messenger: string, user: any) => {
  let full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim()
  if (full_name === "") full_name = undefined
  if (user.nickname && user.nickname.length < 1) user.nickname = null
  if (user.screen_name && user.screen_name.length < 1) user.screen_name = null
  return user.screen_name || user.nickname || full_name || user.id
}
pierObj.vkwall.adaptName = pierObj.vkboard.adaptName
pierObj.slack.adaptName = (messenger: string, user: any) =>
  user?.user?.profile?.display_name || user?.user?.real_name || user?.user?.name

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
      if (attributes.hasOwnProperty(attribute))
        html = html.concat(" ", attribute, '="', attributes[attribute], '"')
    }
    return html.concat(">", payload, "</", tag, ">")
  }

  const matchTag = (match: RegExpExecArray | null) => {
    const action = match[1].substr(0, 1)
    let p

    switch (action) {
      case "!":
        return tag("span", { class: "slack-cmd" }, payloads(match[1], 1)[0])
      case "#":
        p = payloads(match[1], 2)
        return tag(
          "span",
          { class: "slack-channel" },
          p.length === 1 ? p[0] : p[1]
        )
      case "@":
        p = payloads(match[1], 2)
        return tag(
          "span",
          { class: "slack-user" },
          p.length === 1 ? p[0] : p[1]
        )
      default:
        p = payloads(match[1])
        return tag("a", { href: p[0] }, p.length === 1 ? p[0] : p[1])
    }
  }

  const safeMatch = (
    match: RegExpExecArray | null,
    tag: string,
    trigger?: string
  ) => {
    let prefix_ok = match.index === 0
    let postfix_ok = match.index === match.input.length - match[0].length

    if (!prefix_ok) {
      const charAtLeft: string = match.input.substr(match.index - 1, 1)
      prefix_ok =
        notAlphanumeric(charAtLeft) && notRepeatedChar(trigger, charAtLeft)
    }

    if (!postfix_ok) {
      const charAtRight: string = match.input.substr(
        match.index + match[0].length,
        1
      )
      postfix_ok =
        notAlphanumeric(charAtRight) && notRepeatedChar(trigger, charAtRight)
    }

    if (prefix_ok && postfix_ok) return tag
    return false
  }

  const matchBold = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("strong", payloads(match[1])), "*")

  const matchItalic = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("em", payloads(match[1])), "_")

  const matchFixed = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("code", payloads(match[1])))
  const matchPre = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("pre", payloads(match[1])))

  const notAlphanumeric = (input: string) => !RE_ALPHANUMERIC.test(input)

  const notRepeatedChar = (trigger: string, input: string) =>
    !trigger || trigger !== input

  async function parseSlackText(text: string) {
    const jsonChannels: Json = {}
    const jsonUsers: Json = {}
    text.replace(
      /<#(C\w+)\|?(\w+)?>/g,
      (match: any, channelId: any, readable: any) => {
        jsonChannels[channelId] = channelId
        return channelId
      }
    )
    text.replace(
      /<@(U\w+)\|?(\w+)?>/g,
      (match: any, userId: any, readable: any) => {
        jsonUsers[userId] = userId
        return userId
      }
    )
    for (const channelId of Object.keys(jsonChannels)) {
      const [err, channel] = await to(
        generic[messenger].client.web.conversations.info({ channel: channelId })
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
        generic[messenger].client.web.users.info({ user: userId })
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
          (match: any, channelId: any, readable: any) => {
            return `#${readable || jsonChannels[channelId]}`
          }
        )
        .replace(
          /<@(U\w+)\|?(\w+)?>/g,
          (match: any, userId: any, readable: any) => {
            return `@${readable || jsonUsers[userId]}`
          }
        )
        .replace(/<(?!!)([^|]+?)>/g, (match: any, link: any) => link)
        .replace(
          /<!(\w+)\|?(\w+)?>/g,
          (match: any, command: any, label: any) => `<${label || command}>`
        )
        // .replace(/:(\w+):/g, (match: any, emoji: any) => {
        //   if (emoji in emojis) return emojis[emoji];
        //   return match;
        // })
        .replace(/<.+?\|(.+?)>/g, (match: any, readable: any) => readable)
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

pierObj.facebook.convertFrom = async ({
  text,
  messenger,
}: {
  text: string
  messenger: string
}) => escapeHTML(text)

pierObj.vkboard.convertFrom = async ({
  text,
  messenger,
}: {
  text: string
  messenger: string
}) => escapeHTML(text).replace(/\[[^\]]*\|(.*?)\](, ?)?/g, "")
pierObj.vkwall.convertFrom = pierObj.vkboard.convertFrom
pierObj.mattermost.convertFrom = async ({
  text,
  messenger,
}: {
  text: string
  messenger: string
}) =>
  markedParse({
    text: escapeHTML(text),
    messenger: "mattermost",
    unescapeCodeBlocks: true,
  })

// markedParse({
//   text: text.replace(/^(>[^\n]*?\n)/gm, "$1\n").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
//   messenger: "discord",
//   dontEscapeBackslash: true
// });
pierObj.webwidget.convertFrom = async ({
  text,
  messenger,
}: {
  text: string
  messenger: string
}) => text
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

async function convertToPlainText(text: string) {
  let a = await common.unescapeHTML({
    text: text
      .replace(/<strong>(.+?)<\/strong>/g, "*$1*")
      .replace(/<b>(.+?)<\/b>/g, "*$1*")
      .replace(/<em>(.+?)<\/em>/g, "_$1_")
      .replace(/<i>(.+?)<\/i>/g, "_$1_")
      .replace(/<blockquote>([\s\S]*?[\n\r]?)<\/blockquote>/gm, "> $1\n")
      .replace(/<br\/?>/gi, "\n")
      .replace(/<a.*?href="(.+?)".*?>(.+?)<\/a>/gi, (...arr) => {
        const url = arr[1]
        const name = arr[2]
        if (url !== name) return `${name} (${url})`
        return " " + url
      })
      .replace(/<(?:.|\s)*?>/g, "")
      .trim(),
    convertHtmlEntities: true,
  })
  if (a.split(/\r\n|\r|\n/).length > 1) {
    a = "\n" + a
  }
  return a
}

pierObj.facebook.convertTo = async ({
  text,
  messenger,
  messengerTo,
}: {
  text: string
  messenger: string
  messengerTo: string
}) => convertToPlainText(text)

pierObj.vkboard.convertTo = async ({
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
    convertHtmlEntities: false,
  })
  log(messenger)({ messengerTo, "converting text": text, result })
  return result
}
pierObj.vkwall.convertTo = pierObj.vkboard.convertTo
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

pierObj.mattermost.convertTo = async ({
  text,
  messenger,
  messengerTo,
}: {
  text: string
  messenger: string
  messengerTo: string
}) => {
  const result = await common.unescapeHTML({
    text: html2md.convert({
      string: text,
      hrefConvert: false,
      dialect: messengerTo,
    }),
    convertHtmlEntities: true,
  })
  log(messenger)({ messengerTo, "converting text": text, result })
  return result
}

pierObj.webwidget.convertTo = async ({
  text,
  messenger,
  messengerTo,
}: {
  text: string
  messenger: string
  messengerTo: string
}) => text

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

common.writeCache = async ({
  pier,
  channelName,
  channelId,
  action,
}: {
  pier: string
  channelName: string | number
  channelId: string | number
  action: string
}) => {
  await new Promise((resolve) => {
    fs.writeFileSync(
      `${cache_folder}/channelMapping.json`,
      JSON.stringify(config.channelMapping)
    );
    fs.writeFile(
      `${cache_folder}/cache.json`,
      JSON.stringify(config.cache),
      (err: any) => {
        log("generic")({ pier, action, channelName, channelId, error: err })
        resolve(null)
      }
    )
  })
}

function xovahelojbo({ text }: { text: string }) {
  const arrText = text.split(" ")
  const xovahe =
    arrText.filter(
      (i: any) => lojban.ilmentufa_off("lo'u " + i + " le'u").tcini === "snada"
    ).length / arrText.length
  return xovahe
}

// common
common.ConfigBeforeStart = () => {
  if (process.argv[2] === "--genconfig") {
    mkdir(cache_folder)

    // read default config using readFile to include comments
    const config = fs.readFileSync(defaults)
    const configPath = `${cache_folder}/config.js`
    fs.writeFileSync(configPath, config)
    throw new Error(
      `Wrote default configuration to ${configPath}, please edit it before re-running`
    )
  }

  try {
    config = require(`${cache_folder}/config.js`)
  } catch (e) {
    throw new Error(
      `ERROR while reading config:\n${e}\n\nPlease make sure ` +
      'it exists and is valid. Run "node bridge --genconfig" to ' +
      "generate a default config."
    )
  }

  const defaultConfig = require(defaults)
  config = R.mergeDeepLeft(config, defaultConfig)

  localizationConfig = require("../src/local/dict.json")
}


common.getMessengersWithPrefix = async (prefix: string) => {
  return Object.keys(config.MessengersAvailable).filter((el: string) => el.indexOf(prefix + "_") === 0 && config.MessengersAvailable[el] === true)
}

pierObj.irc.getChannels = async (pier: string): Promise<void> => {
  const json = config.piers[pier].ircOptions.channels.reduce((json: { [x: string]: string }, value: string) => { json[value] = value; return json; }, {});
  config.cache[pier] = json
}

pierObj.slack.getChannels = async (pier: string): Promise<void> => {
  let [err, res]: [any, any] = await to(generic[pier].client.web.conversations.list())
  if (err) {
    console.error(err)
  }
  res = res?.channels || []
  const json: Json = {}
  res.map((i: any) => {
    json[i.name] = i.name
  })
  config.cache[pier] = json
}

pierObj.mattermost.getChannels = async (pier: string): Promise<void> => {
  let json: Json = {}
  let url: string = `${config.piers[pier].ProviderUrl}/api/v4/teams/${config.piers[pier].team_id}/channels`
  json = await pierObj.mattermost.common.GetChannelsMattermostCore(pier, json, url)
  url = `${config.piers[pier].ProviderUrl}/api/v4/users/${config.piers[pier].user_id}/teams/${config.piers[pier].team_id}/channels`
  json = await pierObj.mattermost.common.GetChannelsMattermostCore(pier, json, url)
  config.cache[pier] = json
}

pierObj.mattermost.common.GetChannelsMattermostCore = async (messenger: string, json: Json, url: string) => {
  await to(
    new Promise((resolve) => {
      request(
        {
          method: "GET",
          url,
          headers: {
            Authorization: `Bearer ${config.piers[messenger].token}`,
          },
        },
        (error: any, response: any, body: any) => {
          if (error) {
            console.error(error.toString())
          } else {
            body = JSON.parse(body)
            if (body[0]) {
              body.map((i: any) => {
                json[i.name] = i.name
              })
            }
          }
          resolve(null)
        }
      )
    })
  )
  return json
}

async function PopulateChannelMappingCore({
  messenger,
}: {
  messenger: string
}) {
  if (!config.MessengersAvailable[messenger]) return
  if (!config.channelMapping[messenger]) config.channelMapping[messenger] = {}
  const arrMappingKeys: string[] = Object.keys(config.MessengersAvailable).filter((el: string) => config.MessengersAvailable[el] === true)
  config.new_channels.map((i: any) => {
    let i_mapped = i[messenger]
    if (config.cache[messenger])
      i_mapped = config.cache?.[messenger]?.[i[messenger]]
    if (!i_mapped) return
    const mapping: any = {
      settings: {
        readonly: i[`${messenger}-readonly`],
        dontProcessOtherBridges: i[`${messenger}-dontProcessOtherBridges`],
        nsfw_analysis: i[`nsfw_analysis`],
        language: i["language"],
        restrictToLojban: i["restrictToLojban"],
        nickcolor: i[`${messenger}-nickcolor`],
        name: i[messenger],
      },
    }
    for (const key of arrMappingKeys)
      mapping[key] = config.cache?.[key]?.[i[key]] || i[key]

    config.channelMapping[messenger][i_mapped] = R.mergeDeepLeft(
      mapping,
      config.channelMapping[messenger][i_mapped] || {}
    )
  })
  fs.writeFileSync(
    `${cache_folder}/channelMapping.json`,
    JSON.stringify(config.channelMapping, null, 2)
  )
}

common.PopulateChannelMapping = async () => {
  if (!config.channelMapping) config.channelMapping = {}
  if (!config.cache) config.cache = {}

  const arrAvailableMessengers = Object.keys(config.MessengersAvailable).filter((i: string) => !!config.MessengersAvailable[i])
  for (const pier of arrAvailableMessengers) {
    const messenger = common.root_of_messenger(pier)
    if (pierObj[messenger]?.getChannels) await pierObj[messenger].getChannels(pier)
  }

  for (const pier of arrAvailableMessengers) {
    await PopulateChannelMappingCore({ messenger: pier })
  }
}

common.root_of_messenger = (messenger_with_index: string) => messenger_with_index.replace(/_.*/g, '').replace(/_.*/g, '')
common.MessengersAvailable = () => {
  config.MessengersAvailable = {}
  config.new_channels.forEach((i: any) => {
    Object.keys(i).filter((a: any) => a.indexOf("-") === -1 && a.indexOf("_") > 0).forEach((a: any) => config.MessengersAvailable[a] = true)
  })
  Object.keys(config.MessengersAvailable).forEach((messenger_with_index: string) => {
    const messenger = common.root_of_messenger(messenger_with_index)
    const pier_config = config.piers[messenger_with_index]
    const falsies = (messenger === 'facebook' &&
      (!pier_config?.email ||
        !pier_config?.password)
    )
      ||
      (messenger === 'discord' &&
        (!pier_config?.client || !pier_config?.token || !pier_config?.guildId)
      )
      ||
      (messenger === 'telegram' && (!pier_config?.token))
      ||
      (messenger === 'vkboard' && (!pier_config?.token || !pier_config?.group_id || !pier_config?.login || !pier_config?.password))
      ||
      (messenger === 'vkwall' && (!pier_config?.token || !pier_config?.group_id || !pier_config?.login || !pier_config?.password))
    if (falsies) delete config.MessengersAvailable[messenger_with_index]
  });
  Object.keys(config.MessengersAvailable).forEach((messenger: string) => generic[messenger] = {})
}

// pierObj.facebook.StartService = async ({ force, messenger = "facebook" }: { force: boolean, messenger?: string }) => {
//   //facebook
//   if (!force && !config.MessengersAvailable[messenger]) return
//   try {
//     generic[messenger].client = await login(
//       config.piers[messenger].email,
//       config.piers[messenger].password
//     )
//     console.log(generic[messenger].client)
//     console.log(JSON.stringify(generic[messenger].client.getSession()))

//     generic[messenger].client.on("message", (message: any) => {
//       pierObj.facebook.receivedFrom(messenger, message)
//     })
//     config.MessengersAvailable[messenger] = true
//   } catch (e) {
//     console.log(e.toString())
//     // config.MessengersAvailable[messenger] = false;
//     // StartService[messenger]({force: true});
//   }
// }

pierObj.webwidget.StartService = async ({ messenger }: { messenger: string }) => {
  generic[messenger] = {
    Lojban1ChatHistory: [],
    client: require("socket.io")(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        // allowedHeaders: ["my-custom-header"],
        credentials: true
      }
    })
  }
  generic[messenger].client.sockets.on("connection", (socket: any) => {
    socket.emit("history", generic[messenger].Lojban1ChatHistory)
  })
}

pierObj.vkwall.StartService = async ({ messenger }: { messenger: string }) => {
  //vkboard
  if (!config.MessengersAvailable[messenger]) return
  generic[messenger].client = await pierObj.vkwall.common.Start({ messenger })
  generic[messenger].client.bot.event("wall_reply_new", async ({ message }: { message: any }) => {
    pierObj.vkwall.receivedFrom(messenger, message)
  })
  generic[messenger].client.bot.event("wall_reply_edit", async ({ message }: { message: any }) => {
    pierObj.vkwall.receivedFrom(messenger, { ...message, edited: true })
  })
  generic[messenger].client.bot.startPolling()
}

pierObj.vkboard.StartService = async ({ messenger }: { messenger: string }) => {
  //vkboard
  if (!config.MessengersAvailable[messenger]) return
  generic[messenger].client = await pierObj.vkboard.common.Start({ messenger })
  generic[messenger].client.bot.event("board_post_new", async ({ message }: { message: any }) => {
    pierObj.vkboard.receivedFrom(messenger, message)
  })
  generic[messenger].client.bot.event("board_post_edit", async ({ message }: { message: any }) => {
    pierObj.vkboard.receivedFrom(messenger, { ...message, edited: true })
  })
  generic[messenger].client.bot.startPolling((error: any) => {
    if (error) {
      logger.log({
        level: "error",
        function: "vkboard long polling",
        type: "data",
        message: error.toString(),
      })
    }
  });
}

pierObj.slack.StartService = async ({ messenger }: { messenger: string }) => {
  //slack
  await pierObj.slack.common.Start({ messenger })
  if (!config.MessengersAvailable[messenger]) return
  generic[messenger].client.rtm.on("message", (message: any) => {
    pierObj.slack.receivedFrom(messenger, message)
  })
}

pierObj.mattermost.StartService = async ({ messenger }: { messenger: string }) => {
  //mattermost
  generic[messenger].client = await pierObj.mattermost.common.Start({ messenger })
  if (!config.MessengersAvailable[messenger]) return
  generic[messenger].client.addEventListener("open", () => {
    generic[messenger].client.send(
      JSON.stringify({
        seq: 1,
        action: "authentication_challenge",
        data: {
          token: config.piers[messenger].token,
        },
      })
    )
  })
  generic[messenger].client.addEventListener("message", (message: any) => {
    if (!message?.data || !config.piers[messenger].team_id) return
    message = JSON.parse(message.data)
    pierObj.mattermost.receivedFrom(messenger, message)
  })
  generic[messenger].client.addEventListener("close", () =>
    generic[messenger].client._connect()
  )
  generic[messenger].client.addEventListener("error", () =>
    generic[messenger].client._connect()
  )
}

pierObj.irc.StartService = async ({ messenger }: { messenger: string }) => {
  // irc
  const channels = config.new_channels
  const results: any = []
  for (const channel of channels) {
    if (!channel[messenger]) continue
    const chanName = channel[`${messenger}-password`]
      ? `${channel[messenger]} ${channel[`${messenger}-password`]}`
      : channel[messenger]
    results.push(chanName)
  }
  config.piers[messenger].ircOptions.channels = [...new Set(results)]
  config.piers[messenger].ircOptions.encoding = "utf-8"

  generic[messenger].client = new Irc.Client(
    config.piers[messenger].ircServer,
    config.piers[messenger].ircOptions.nick,
    config.piers[messenger].ircOptions
  )
  if (!config.MessengersAvailable[messenger]) return
  generic[messenger].client.on("error", (error: any) => {
    pierObj.irc.receivedFrom(messenger, {
      error,
      type: "error",
    })
    //todo:
    // pierObj.irc.StartService({messenger})
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
    }
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
    }
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
    }
  )
}

async function StartServices() {
  common.MessengersAvailable()
  if (!config.channelMapping) config.channelMapping = {}

  for (const messenger_with_index of Object.keys(config.MessengersAvailable)) {
    const messenger = messenger_with_index.replace(/_.*/g, '')
    if (pierObj[messenger]?.StartService) {
      queueOf[messenger_with_index] = new PQueue({ concurrency: 1 })
      await pierObj[messenger]?.StartService({ messenger: messenger_with_index })
    }
  }
  await common.PopulateChannelMapping()

  console.log("Lojban-1Chat-Bridge started!")
}

// helper functions

common.LogMessageToAdmin = async (messenger: string, message: Telegram.Message) => {
  if (config.piers[messenger].admins_userid)
    await to(
      generic[messenger].client.forwardMessage(
        config.piers[messenger].admins_userid,
        message.chat.id,
        message.message_id
      )
    )
}

function catchError(err: any) {
  const error = JSON.stringify(err)
  console.log(error)
  common.LogToAdmin(err)
}

common.LogToAdmin = (msg_text: string, repeat = true) => {
  logger.log({
    level: "info",
    message: JSON.stringify(msg_text),
  })
  const telegram_piers_with_logging_to_admin = Object.keys(config.piers).filter((i: any) => typeof config.piers[i].admins_userid !== 'undefined')
  for (const pier of telegram_piers_with_logging_to_admin)
    if (generic[pier].client)
      generic[pier].client
        .sendMessage(
          config.piers[pier].admins_userid,
          `\`\`\`\n${msg_text}\n\`\`\``,
          {
            parse_mode: "Markdown",
          }
        )
        .catch((e: any) => {
          if (repeat) common.LogToAdmin(msg_text, false)
        })
}

const htmlEntities: any = {
  nbsp: " ",
  cent: "¢",
  pound: "£",
  yen: "¥",
  euro: "€",
  copy: "©",
  reg: "®",
  lt: "<",
  gt: ">",
  quot: '"',
  amp: "&",
  apos: "'",
  "#42": "*",
  "#95": "_",
  "#96": "`",
}
common.unescapeHTML = ({
  text,
  convertHtmlEntities,
  escapeBackslashes = true,
}: {
  text: string
  convertHtmlEntities?: boolean
  escapeBackslashes?: boolean
}) => {
  if (escapeBackslashes) text = text.replace(/\\/g, "\\")
  text = text.replace(/\&([^;]+);/g, (entity: string, entityCode: string) => {
    let match: any

    if (convertHtmlEntities && htmlEntities[entityCode]) {
      return htmlEntities[entityCode]
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16))
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(~~match[1])
    } else {
      return entity
    }
  })
  return text
}

// async function appendPageTitles(
//   text: string,
//   sendto?: boolean,
//   messenger?: string
// ) {
//   if (config.piers[messenger].sendPageTitles) {
//     const urls = text.match(UrlRegExp);
//     if (urls.length > 0) {
//       for (const url of urls) {
//         await to(
//           new Promise((resolve) => {
//             request(
//               {
//                 url,
//                 timeout: 3000
//               },
//               (err, res, body) => {
//                 if (!err) {
//                   const match = PageTitleRegExp.exec(body);
//                   if (match && match[2]) {
//                     text += `\n${match[2]}`;
//                   }
//                 }
//               }
//             );
//           })
//         );
//       }
//     }
//   }
//   if (sendto) {
//     sendTo[m]({
//       channelId: ConfigNode[m],
//       author,
//       chunk: thisToWhom + chunk,
//       quotation,
//       action,
//       file
//     });
//   }
//   return text;
// }

pierObj.irc.common.GetChunks = async (text: string, messenger: string) => {
  const limit = config.piers[messenger].MessageLength || 400
  // text = await appendPageTitles(text)
  return text.split(/<br>/).flatMap((line) => HTMLSplitter(line, limit))
}

pierObj.webwidget.common.GetChunks = async (text: string, messenger: string) => {
  return [text]
}

const diffTwo = (diffMe: string, diffBy: string) => {
  diffMe = diffMe
    .replace(/[\n\r]/g, "")
    .replace(/<br \/>/gim, "<br>")
    .replace(/<a_href=/g, "<a href=")
    .replace(/<span_class=/g, "<span class=")
  diffBy = diffBy
    .replace(/[\n\r]/g, "")
    .replace(/<br \/>/gim, "<br>")
    .replace(/<a_href=/g, "<a href=")
    .replace(/<span_class=/g, "<span class=")
  return diffMe.split(diffBy).join("")
}

function HTMLSplitter(text: string, limit = 400) {
  log("generic")({ message: "html splitter: pre", text })

  const r = new RegExp(`(?<=.{${limit / 2},})[^<>](?![^<>]*>)`, "g")
  text = common.sanitizeHtml(
    text.replace(
      /<blockquote>([\s\S]*?)(<br>)*<\/blockquote>/gim,
      "<blockquote>$1</blockquote>"
    )
  )
  text = text.replace(/<a href=/g, "<a_href=").replace(/<span class=/g, "<span_class=")
  let thisChunk
  let stop = false
  let Chunks = []
  while (text !== "") {
    if (text.length >= limit) {
      thisChunk = text.substring(0, limit)
      text = text.substring(limit)
      let lastSpace = thisChunk.lastIndexOf(" ")
      if (lastSpace <= limit / 2) {
        //no spaces found
        lastSpace = thisChunk.search(r)
      }
      if (lastSpace === -1) {
        thisChunk = common.sanitizeHtml(thisChunk, [])
      } else {
        text = thisChunk.substring(lastSpace) + text
        thisChunk = thisChunk.substring(0, lastSpace)
      }
    } else {
      //if text is less than limit symbols then process it and go out of the loop
      thisChunk = text
      stop = true
    }
    const thisChunkUntruncated = DOMPurify.sanitize(
      thisChunk
        .replace(/<a_href=/g, "<a href=")
        .replace(/<span_class=/g, "<span class=")
    )
      .replace(/<a href=/g, "<a_href=")
      .replace(/<span class=/g, "<span_class=")
    Chunks.push(thisChunkUntruncated)
    if (stop) break
    let diff = diffTwo(thisChunkUntruncated, thisChunk)
    if (diff !== "") {
      // add opening tags
      diff = diff
        .split(/(?=<)/)
        .reverse()
        .map((i) => i.replace("/", ""))
        .join("")
      text = DOMPurify.sanitize(diff + text)
    }
  }
  Chunks = Chunks.map((chunk) => chunk.replace(/<a_href=/g, "<a href=").replace(/<span_class=/g, "<span class="))
  log("generic")({ message: "html splitter: after", Chunks })

  return Chunks
}

common.GetChunks = async (text: string, messenger: string) => {
  // text = await appendPageTitles(text);
  const limit = config.piers[messenger].MessageLength || 400
  let arrText: string[] = HTMLSplitter(text, limit)
  return arrText
}

function saveDataToFile({ data, local_fullname }: { data: string, local_fullname: string }) {
  function decodeBase64Image(dataString: string) {
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const response: any = {};

    if (matches.length !== 3) {
      return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = Buffer.from(matches[2], 'base64');

    return response;
  }

  // Regular expression for image type:
  // This regular image extracts the "jpeg" from "image/jpeg"
  const imageTypeRegularExpression = /\/(.*?)$/;

  const imageBuffer = decodeBase64Image(data);

  // This variable is actually an array which has 5 values,
  // The [1] value is the real image extension
  const type = imageBuffer
    .type
    .match(imageTypeRegularExpression);
  return { type: type[1], data: imageBuffer.data }
}


common.downloadFile = async ({
  messenger,
  type,
  fileId,
  remote_path,
  extension = "",
}: {
  messenger?: string
  type: string
  fileId?: number
  remote_path?: string
  extension?: string
}) => {
  const randomString = blalalavla.cupra(remote_path || fileId.toString())
  const randomStringName = blalalavla.cupra(
    (remote_path || fileId.toString()) + "1"
  )
  mkdir(`${cache_folder}/files/${randomString}`)
  const rem_path = `${config.generic.httpLocation}/${randomString}`
  const local_path = `${cache_folder}/files/${randomString}`

  let err: any, res: any
  let rem_fullname: string = ""
  let local_fullname: string = ""

  if (type === "slack") {
    local_fullname = `${local_path}/${path.basename(remote_path)}`
      ;[err, res] = await to(
        new Promise((resolve: any) => {
          try {
            let file = fs.createWriteStream(local_fullname)
            file
              .on("open", () => {
                request(
                  {
                    method: "GET",
                    url: remote_path,
                    headers: {
                      Authorization: `Bearer ${config.piers[messenger]?.token}`,
                    },
                    timeout: 3000,
                  },
                  (err) => {
                    if (err) {
                      console.log(remote_path, err.toString())
                      resolve(null)
                    }
                  }
                )
                  .pipe(file)
                  .on("finish", () => {
                    const rem_fullname = `${rem_path}/${path.basename(
                      remote_path
                    )}`
                    resolve([rem_fullname, local_fullname])
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
        })
      )
    if (res) [rem_fullname, local_fullname] = res
  } else if (type === "data") {
    try {
      const { type, data } = saveDataToFile({ data: remote_path, local_fullname })
      const basename = randomStringName + "." + (type ?? extension)
      local_fullname = `${local_path}/${basename}`
      fs.writeFileSync(local_fullname, data)

      rem_fullname = `${rem_path}/${basename}`
    } catch (error) {
      local_fullname = ''
      logger.log({
        level: "error",
        function: "downloadFile",
        type: "data",
        message: error.toString(),
      })
    }
  } else if (type === "simple") {
    if (extension) extension = `.${extension}`
    const basename = path.basename(remote_path).split(/[\?#]/)[0] + (extension || '')
    local_fullname = `${local_path}/${basename}`
    await new Promise((resolve: any, reject: any) => {
      try {
        let file = fs.createWriteStream(local_fullname)
        file
          .on("open", () => {
            let stream = request({
              method: "GET",
              url: remote_path,
              timeout: 3000,
            })
              .pipe(file)
              .on("finish", () => {
                rem_fullname = `${rem_path}/${basename}`
                resolve(null)
              })
              .on("error", (error: any) => {
                logger.log({
                  level: "error",
                  function: "downloadFile",
                  type: "simple",
                  path: remote_path,
                  message: error.toString(),
                })
                resolve(null)
              })
          })
          .on("error", (error: any) => {
            logger.log({
              level: "error",
              function: "downloadFile",
              type: "simple",
              error: "opening error",
              local_fullname,
              message: error.toString(),
            })
          })
      } catch (error) {
        console.log({ type: "creation error", error })
      }
    })
  } else if (type === "telegram") {
    ;[err, local_fullname] = await to(
      generic[messenger].client.downloadFile(fileId, local_path)
    )
    if (!err) rem_fullname = `${rem_path}/${path.basename(local_fullname)}`
  }
  if (err) {
    log("telegram")({ remote_path, error: err, type: "generic" })
    return [remote_path || fileId, remote_path || fileId]
  }
  ;[err, res] = await to(
    new Promise((resolve: any) => {
      const new_name = `${local_path}/${randomStringName}${path.extname(
        local_fullname
      )}`

      fs.rename(local_fullname, new_name, (err: any) => {
        if (err) {
          console.error({ remote_path, error: err, type: "renaming" })
          resolve(null)
        } else {
          rem_fullname = `${rem_path}/${path.basename(new_name)}`
          resolve([rem_fullname, new_name])
        }
      })
    })
  )
  if (!err) [rem_fullname, local_fullname] = res

  //check if it's audio:
  if (
    [".ogg", ".oga", ".opus", ".wav", ".m4a"].includes(
      path.extname(local_fullname)
    )
  ) {
    const local_mp3_file = local_fullname + ".mp3"
    const cp = require("child_process")

    cp.spawnSync("ffmpeg", ["-i", local_fullname, local_mp3_file], {
      encoding: "utf8",
    })
    if (fs.existsSync(local_mp3_file))
      return [rem_fullname + ".mp3", local_mp3_file]
    return [rem_fullname, local_fullname]
  }

  //check if it's webp/tiff:
  if ([".webp", ".tiff"].includes(path.extname(local_fullname))) {
    const sharp = require("sharp")
    const jpgname = `${local_fullname.split(".").slice(0, -1).join(".")}.jpg`
      ;[err, res] = await to(
        new Promise((resolve) => {
          sharp(local_fullname).toFile(jpgname, (err: any, info: any) => {
            if (err) {
              console.error({
                type: "conversion",
                remote_path,
                error: err.toString(),
              })
              resolve([rem_fullname, local_fullname])
            } else {
              fs.unlink(local_fullname)
              resolve([
                `${rem_fullname.split(".").slice(0, -1).join(".")}.jpg`,
                jpgname,
              ])
            }
          })
        })
      )

    if (!err) [rem_fullname, local_fullname] = res
  }

  //it's some other file format:
  return [rem_fullname, local_fullname]
}

common.sanitizeHtml = (
  text: string,
  allowedTags: string[] = [
    "blockquote",
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
    "span"
  ]
) => {
  return sanitizeHtml(text, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "class"],
    },
  })
}

common.LocalizeStringWrapper = ({
  messenger,
  channelId,
  localized_string_key,
  arrElemsToInterpolate,
}: {
  messenger: string
  channelId: string | number
  localized_string_key: string
  arrElemsToInterpolate: Array<Array<string>>
}) => {
  const language =
    config?.channelMapping?.[messenger]?.[channelId]?.settings?.language ||
    "English"
  const localized_string_key_additional = localized_string_key + ".fallback_solution"
  if (localizationConfig[language][localized_string_key_additional])
    return {
      main: common.LocalizeString({
        messenger,
        channelId,
        localized_string_key,
        arrElemsToInterpolate,
      }), fallback_solution: common.LocalizeString({
        messenger,
        channelId,
        localized_string_key: localized_string_key_additional,
        arrElemsToInterpolate,
      })
    }
  else return common.LocalizeString({
    messenger,
    channelId,
    localized_string_key,
    arrElemsToInterpolate,
  })
}

common.LocalizeString = ({
  messenger,
  channelId,
  localized_string_key,
  arrElemsToInterpolate,
}: {
  messenger: string
  channelId: string | number
  localized_string_key: string
  arrElemsToInterpolate: Array<Array<string>>
}) => {
  try {
    const language =
      config?.channelMapping?.[messenger]?.[channelId]?.settings?.language ||
      "English"
    let template = localizationConfig[language][localized_string_key]
    const def_template = localizationConfig["English"][localized_string_key]
    if (!def_template) {
      console.log(`no ${localized_string_key} key specified in the dictionary`)
      return
    }
    if (!template) template = def_template
    for (const value of arrElemsToInterpolate)
      template = template
        .replace(new RegExp(`%${value[0]}%`, "gu"), value[1])
        .replace(/%%/g, "%")
    return template
  } catch (error) {
    logger.log({
      level: "error",
      function: "LocalizeString",
      messenger,
      channelId,
      localized_string_key,
      arrElemsToInterpolate,
    })
  }
}

//START
// get/set config
common.ConfigBeforeStart()

// map channels & start listening
StartServices()

// start HTTP server for media files if configured to do so
if (config.generic.showMedia) {
  mkdir(`${cache_folder}/files`)
  const serve = serveStatic(`${cache_folder}/files`, {
    lastModified: false,
    index: false,
    maxAge: 86400000,
  })
  server = http.createServer((req: any, res: any) => {
    // if ((request.url || "").indexOf("/emailing/templates") === 0) {
    serve(req, res, finalhandler(req, res))
  })
  server.listen(config.generic.httpPort)
}
