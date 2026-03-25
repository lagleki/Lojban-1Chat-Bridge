import to from "await-to-js"
import { Bot } from "@maxhub/max-bot-api"
import type { Message, MessageBody } from "@maxhub/max-bot-api/types"
import { hooks } from "../hooks"
import { log, logger } from "../logger"
import { markedParse } from "../marked-parse"
import { escapeHTML } from "../../libs/formatting-converters/generic"
import { common, generic, pierObj, state } from "../state"
import type { IsendToArgs } from "../types"

function pierCfg(messenger: string) {
  return state.config.piers[messenger]
}

function messageAgeSeconds(message: Message): number {
  const raw = message.timestamp
  const sec = raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw)
  return Math.floor(Date.now() / 1000) - sec
}

function attachmentUrls(message: Message): string[] {
  const out: string[] = []
  const list = message.body.attachments ?? []
  for (const a of list) {
    if (a.type === "image" || a.type === "video" || a.type === "audio") {
      const u = a.payload?.url
      if (u) out.push(u)
    } else if (a.type === "file") {
      const u = a.payload?.url
      if (u) out.push(a.filename ? `${u} (${a.filename})` : u)
    } else if (a.type === "sticker") {
      const u = a.payload?.url
      if (u) out.push(u)
    } else if (a.type === "share") {
      const u = a.payload?.url ?? a.image_url
      if (u) out.push(u)
    }
  }
  return out
}

function textFromBody(body: MessageBody): string {
  const parts: string[] = []
  const t = body.text?.trim() ?? ""
  if (t) parts.push(t)
  const list = body.attachments ?? []
  for (const a of list) {
    if (a.type === "image" || a.type === "video" || a.type === "audio") {
      const u = a.payload?.url
      if (u) parts.push(u)
    } else if (a.type === "file") {
      const u = a.payload?.url
      if (u) parts.push(a.filename ? `${u} (${a.filename})` : u)
    } else if (a.type === "sticker") {
      const u = a.payload?.url
      if (u) parts.push(u)
    } else if (a.type === "share") {
      const u = a.payload?.url ?? a.image_url
      if (u) parts.push(u)
    }
  }
  return parts.join("\n").trim()
}

function buildInboundText(message: Message): string {
  const parts: string[] = []
  const t = message.body.text?.trim() ?? ""
  if (t) parts.push(t)
  parts.push(...attachmentUrls(message))
  return parts.join("\n").trim()
}

async function fetchAllChatsMap(
  token: string,
): Promise<Record<string, string>> {
  const api = new Bot(token).api
  const map: Record<string, string> = {}
  let marker: number | null | undefined
  for (;;) {
    const extra =
      marker != null && marker !== undefined
        ? { marker }
        : ({} as { marker?: number })
    const [err, res] = await to(api.getAllChats(extra))
    if (err || !res?.chats) break
    for (const c of res.chats) {
      const id = String(c.chat_id)
      map[id] = id
      if (c.title) map[c.title] = id
    }
    if (res.marker == null) break
    marker = res.marker
  }
  return map
}

export function registerPier() {
  pierObj.max.shouldDisableMessenger = (cfg: { token?: string }) => !cfg?.token

  pierObj.max.common = {
    Start: async function () {
      return
    },
  }

  pierObj.max.sendTo = async ({
    messenger,
    channelId,
    author: _author,
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
    const id = Number(channelId)
    if (!Number.isFinite(id)) {
      logger.log({
        level: "error",
        function: "max.sendTo",
        message: `invalid MAX chat id: ${String(channelId)}`,
      })
      return
    }
    const client = generic[messenger]?.client as Bot | undefined
    if (!client?.api) return
    const [err] = await to(
      client.api.sendMessageToChat(id, chunkStr, { format: "html" }),
    )
    if (err)
      logger.log({
        level: "error",
        function: "max.sendTo",
        message: String(err),
      })
  }

  pierObj.max.convertFrom = async ({
    text,
    messenger: _messenger,
  }: {
    text: string
    messenger: string
  }) =>
    markedParse({
      text: escapeHTML(text),
      messenger: "max",
      unescapeCodeBlocks: true,
    })

  pierObj.max.convertTo = async ({
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
    log(messenger)({ messengerTo, "converting text": text, result })
    return result
  }

  pierObj.max.receivedFrom = async (
    messenger: string,
    args: {
      message: Message
      edited?: boolean
      botUserId?: number
    },
  ) => {
    const sendFrom = hooks.sendFrom!
    const { config } = state
    if (!config.channelMapping[messenger]) return

    const { message, edited, botUserId } = args
    const chatId = message.recipient?.chat_id
    if (chatId == null) return

    const channelId = String(chatId)
    if (!config.channelMapping[messenger][channelId]) return

    const maxAge = pierCfg(messenger).maxMsgAge ?? 0
    if (maxAge > 0 && messageAgeSeconds(message) > maxAge) {
      log(messenger)({
        skip: "old message",
        age: messageAgeSeconds(message),
        maxMsgAge: maxAge,
      })
      return
    }

    const sender = message.sender
    const client = generic[messenger]?.client as Bot | undefined
    const botUid = botUserId ?? client?.botInfo?.user_id
    if (sender?.user_id != null && botUid != null && sender.user_id === botUid)
      return

    const author = sender?.name?.trim() || "?"

    const link = message.link
    if (link?.type === "reply" && link.message) {
      const qText = textFromBody(link.message)
      if (qText)
        await sendFrom({
          messenger,
          channelId,
          author,
          text: qText,
          quotation: true,
          edited: false,
        })
    }

    const text = buildInboundText(message)
    if (!text) return

    await sendFrom({
      messenger,
      channelId,
      author,
      text,
      edited: !!edited,
    })
  }

  pierObj.max.getChannels = async (pier: string) => {
    const token = pierCfg(pier)?.token
    if (!token) return
    const [err, map] = await to(fetchAllChatsMap(token))
    if (err) {
      log("max")({ getChannelsError: String(err) })
      state.config.cache[pier] = state.config.cache[pier] || {}
      return
    }
    state.config.cache[pier] = map
  }

  pierObj.max.StartService = async ({ messenger }: { messenger: string }) => {
    if (!state.config.MessengersAvailable[messenger]) return

    const token = pierCfg(messenger).token
    const bot = new Bot(token)

    bot.catch((err, ctx) => {
      logger.log({
        level: "error",
        message: `max bot: ${String(err)}`,
        meta: ctx?.update,
      })
    })

    bot.on("message_created", (ctx) => {
      if (!ctx.message) return
      void pierObj.max.receivedFrom(messenger, {
        message: ctx.message,
        edited: false,
        botUserId: ctx.myId,
      })
    })

    bot.on("message_edited", (ctx) => {
      if (!ctx.message) return
      void pierObj.max.receivedFrom(messenger, {
        message: ctx.message,
        edited: true,
        botUserId: ctx.myId,
      })
    })

    bot.on("bot_added", async (ctx) => {
      const id = ctx.chatId
      if (id == null) return
      const [err, chat] = await to(ctx.getChat(id))
      if (err || !chat?.title) return
      if (!state.config.cache[messenger]) state.config.cache[messenger] = {}
      state.config.cache[messenger][chat.title] = String(chat.chat_id)
      state.config.cache[messenger][String(chat.chat_id)] = String(chat.chat_id)
      await to(
        common.writeCache({
          pier: messenger,
          channelName: chat.title,
          channelId: chat.chat_id,
          action: "join",
        }),
      )
      await to(common.PopulateChannelMapping())
    })

    generic[messenger].client = bot
    void bot.start().catch((err: unknown) => {
      logger.log({
        level: "error",
        function: "max.StartService",
        message: String(err),
      })
    })
  }
}
