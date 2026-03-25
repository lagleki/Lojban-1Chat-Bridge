import axios, { AxiosResponse } from "axios"
import Discord from "discord.js"
import to from "await-to-js"
import { tot } from "../async-utils"
import { hooks } from "../hooks"
import { log, logger } from "../logger"
import { xovahelojbo } from "../lojban-spam"
import { common, generic, pierObj, state } from "../state"
import type { Chunk, IsendToArgs, Json } from "../types"

import * as discordParser from "discord-markdown"
import html2md from "../../libs/formatting-converters/html2md-ts"

export function registerPier() {
  pierObj.discord.shouldDisableMessenger = (cfg: any) =>
    !cfg?.client || !cfg?.token || !cfg?.guildId

  pierObj.discord.sendTo = async ({
    messenger,
    channelId,
    author,
    chunk,
    action: _action,
    quotation: _quotation,
    file,
    edited: _edited,
    avatar,
  }: IsendToArgs) => {
    const { config } = state
    let files: { attachment: string }[] = []
    if (file) {
      files = [
        {
          attachment: file,
        },
      ]
    }
    let chunk_: Chunk = chunk
    if (typeof chunk_ !== "string" && chunk_.main) chunk_ = chunk_.main
    if (chunk_ === file) chunk_ = ""

    try {
      if (avatar) {
        const response: AxiosResponse = await axios.get(avatar, {
          responseType: "arraybuffer",
        })
        const prefix = "data:" + response.headers["content-type"] + ";base64,"
        avatar =
          prefix + Buffer.from(response.data, "binary").toString("base64")
      }
    } catch (error) {
      avatar = undefined
    }

    let error

    const channel = generic[messenger].client.channels.cache.get(channelId)
    let webhooks = [],
      webhook = null
    if (!config.piers[messenger]?.noWebhooks) {
      try {
        webhooks = await channel.fetchWebhooks()
        webhook = webhooks.last()
      } catch (error) {
        logger.log({
          level: "error",
          function: "discord.sendTo",
          event: "couldn't find webhooks for the channel",
          channelId,
          message: String(error),
          chunk: chunk_,
          author,
        })
      }
      if (webhook) {
        ;[error, webhook] = await tot(
          webhook.edit({
            name: author || "-",
            avatar,
          }),
        )
        if (error) {
          logger.log({
            level: "error",
            function: "discord.sendTo",
            event: "error editing an existing webhook",
            message: error.toString(),
            chunk: chunk_,
            author,
          })
        }
      }
      if (error || !webhook) {
        const arrayedWebhooks: Discord.Webhook[] = Array.from(
          Object.values(
            webhooks.filter(
              (hook: any) =>
                hook?.owner?.id === config?.piers?.[messenger]?.client,
            ),
          ),
        )
        for (const hook of arrayedWebhooks) {
          await hook.delete()
        }
        ;[error, webhook] = await tot(
          channel.createWebhook(author || "-", avatar),
        )
        if (error) {
          logger.log({
            level: "error",
            function: "discord.sendTo",
            event: "error creating a webhook",
            message: error.toString(),
            chunk: chunk_,
            author,
          })
        }
      }
      if (!error) {
        ;[error] = await tot(
          webhook.send(chunk_, {
            username: author || "-",
            files,
          }),
        )
        if (error) {
          logger.log({
            level: "error",
            function: "discord.sendTo",
            event: "error sending a message via a webhook",
            message: error.toString(),
            chunk: chunk_,
            author,
          })
        } else return
      }
      if (webhook) {
        ;[error] = await tot(
          webhook.send(chunk_, {
            username: author || "-",
          }),
        )
        if (error) {
          logger.log({
            level: "error",
            function: "discord.sendTo",
            event: "error sending a message without attachments via a webhook",
            message: error.toString(),
            chunk: chunk_,
            author,
          })
        } else return
      }
    }
    ;[error] = await to(
      generic[messenger].client.channels.cache
        .get(channelId)
        .send({ content: (chunk as any).fallback_solution ?? chunk, files }),
    )

    if (error) {
      logger.log({
        level: "error",
        function: "discord.sendTo",
        event: "error sending a message using a webhookless method",
        message: error.toString(),
        chunk: (chunk as any).fallback_solution ?? chunk,
        author,
      })
    } else return
    ;[error] = await to(
      generic[messenger].client.channels.cache
        .get(channelId)
        .send({ content: (chunk as any).fallback_solution ?? chunk }),
    )

    if (error) {
      logger.log({
        level: "error",
        function: "discord.sendTo",
        event:
          "error sending a message without attachments using a webhookless method",
        message: error.toString(),
        chunk: (chunk as any).fallback_solution ?? chunk,
        author,
      })
    }
  }

  pierObj.discord.common.removeSpam = async (
    messenger: string,
    message: any,
    plainText: string,
  ) => {
    const { config } = state
    if (
      config.channelMapping[messenger][message?.channel?.id]?.settings
        ?.restrictToLojban &&
      plainText
    ) {
      const xovahe = await xovahelojbo({ text: plainText })
      if (xovahe < 0.5) return true
    }
    return false
  }

  pierObj.discord.receivedFrom = async (messenger: string, message: any) => {
    const { config } = state
    const sendFrom = hooks.sendFrom!
    if (
      !config?.channelMapping[messenger]?.[
        (message?.channel?.id || "").toString()
      ]
    )
      return
    if (message.author.bot || message.channel.type !== "text") return

    const plainText = !message?.content
      ? undefined
      : pierObj.discord.common.discord_reconstructPlainText(
          messenger,
          message,
          message?.content,
        )

    if (await pierObj.discord.common.removeSpam(messenger, message, plainText))
      return

    const edited = message.edited ? true : false
    for (const value of message.attachments.values()) {
      const [, res]: [any, any] = await to(
        common.downloadFile({
          messenger,
          type: "simple",
          remote_path: value.url,
        }),
      )
      let file: string, localfile: string

      if (res?.[1]) {
        ;[file, localfile] = res
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
      const text = pierObj.discord.common.discord_reconstructPlainText(
        messenger,
        message,
        value.content,
      )
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
        message.reference.messageID,
      )
      const text = pierObj.discord.common.discord_reconstructPlainText(
        messenger,
        message_,
        message_.content,
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

  pierObj.discord.common.discord_reconstructPlainText = (
    messenger: string,
    message: any,
    text: string,
  ) => {
    const { config } = state
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
    let matches = text.replace(/#0000/, "").match(/<[!&]?@[^# ]{2,32}>/g)
    if (matches && matches[0])
      for (const match of matches) {
        const core = match.replace(/[@<>!&]/g, "")
        const member = message.channel.guild.members.cache
          .array()
          .find(
            (member: any) =>
              (member.nickname || member.user?.username) &&
              member.user.id.toLowerCase() === core,
          )
        if (member)
          text = text
            .replace(/#0000/, "")
            .replace(match, "@" + (member.nickname || member.user.username))
      }
    matches = text.match(/<#[^# ]{2,32}>/g)
    if (matches?.[0])
      for (const match of matches) {
        const core = match.replace(/[<>#]/g, "")
        const chan = Object.keys(config.cache[messenger]).filter(
          (i) => config.cache[messenger][i] === core,
        )
        if (chan[0]) text = text.replace(match, "#" + chan[0])
      }

    return text
  }

  pierObj.discord.adaptName = (_messenger: string, message: any) => {
    return message.member?.nickname || message.author?.username
  }

  pierObj.discord.convertFrom = async ({
    text,
    messenger,
  }: {
    text: string
    messenger: string
  }) => {
    const result = discordParser
      .toHTML(text)
      .replace(/<span class="d-spoiler">/g, '<span class="spoiler">')

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
    const { config } = state
    const json: Json = {}
    for (const value of generic[pier].client.channels.cache.values()) {
      if (value.guild.id === config.piers[pier].guildId) {
        json[value.name] = value.id
      }
    }
    config.cache[pier] = json
  }

  pierObj.discord.StartService = async ({
    messenger,
  }: {
    messenger: string
  }) => {
    const { config } = state
    if (!config.MessengersAvailable[messenger]) return

    await new Promise<void>((resolve) => {
      const client = new Discord.Client()
      generic[messenger].client = client
      generic[messenger].client.once("ready", () => {
        generic[messenger].guilds = Array.from(client.guilds.cache.values())
        if (config.piers[messenger].guildId) {
          const guild = client.guilds.cache.find(
            (guild: any) =>
              guild.name.toLowerCase() ===
                config.piers[messenger].guildId.toLowerCase() ||
              guild.id === config.piers[messenger].guildId,
          )
          if (guild)
            generic[messenger].guilds = [
              guild,
              ...generic[messenger].guilds.filter(
                (_guild: any) => _guild.id !== guild.id,
              ),
            ]
        }
        resolve()
      })
      generic[messenger].client.on("error", (error: any) => {
        resolve()
        log("discord")(error)
      })

      generic[messenger].client.on("message", (message: Discord.Message) => {
        pierObj.discord.receivedFrom(messenger, message)
      })
      generic[messenger].client.on(
        "messageUpdate",
        (oldMessage: any, message: any) => {
          if (oldMessage.content != message.content) {
            message.edited = true
            pierObj.discord.receivedFrom(messenger, message)
          }
        },
      )
      generic[messenger].client.login(config.piers[messenger].token)
    })
  }
}
