import to from "await-to-js"
import { Bot } from "@maxhub/max-bot-api"
import type { Message, MessageBody } from "@maxhub/max-bot-api/types"
import { hooks } from "../hooks"
import { log, logger } from "../logger"
import { markedParse } from "../marked-parse"
import { escapeHTML } from "../../libs/formatting-converters/generic"
import { common, generic, pierObj, state } from "../state"
import type { IsendToArgs } from "../types"
import { NotReadyError, PermanentSendError } from "../../reliability/errors"
import { getCursor, reportDown, setCursor } from "../../reliability/runtime"

/** One run of our own long-polling loop (replaced on every restart). */
interface MaxPollSession {
  stopped: boolean
  errors: number
}

const markerKey = (messenger: string) => `max:${messenger}:marker`

/**
 * Long polling with a persisted marker. The library's own loop stops for
 * good after the first network error, so we run our own: on failure the
 * session marks itself unhealthy and the supervisor restarts it, resuming
 * from the last marker (updates sent while offline are fetched then).
 */
async function maxPollLoop(
  messenger: string,
  bot: Bot,
  session: MaxPollSession,
) {
  const g = generic[messenger]
  while (!session.stopped) {
    try {
      const saved = getCursor(markerKey(messenger))
      const marker = g.maxMarker ?? (saved ? Number(saved) : undefined)
      const res: any = await (bot.api as any).getUpdates(
        [],
        marker !== undefined ? { marker } : {},
      )
      if (session.stopped) return // a newer session took over
      session.errors = 0
      g.maxLastPollOk = Date.now()
      for (const update of res?.updates ?? [])
        await (bot as any).handleUpdate(update)
      if (res?.marker !== undefined && res?.marker !== null) {
        g.maxMarker = res.marker
        setCursor(markerKey(messenger), String(res.marker))
      }
    } catch (err) {
      if (session.stopped) return
      session.errors++
      logger.log({
        level: "error",
        function: "max.poll",
        message: String(err),
      })
      reportDown(messenger, `max polling failed: ${String(err)}`)
      await new Promise((r) =>
        setTimeout(r, Math.min(30000, 1000 * 2 ** session.errors)).unref?.(),
      )
    }
  }
}

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
      throw new PermanentSendError(`invalid MAX chat id: ${String(channelId)}`)
    }
    const client = generic[messenger]?.client as Bot | undefined
    if (!client?.api) throw new NotReadyError(`${messenger}: no MAX client`)
    const [err] = await to(
      client.api.sendMessageToChat(id, chunkStr, { format: "html" }),
    )
    if (err) {
      logger.log({
        level: "error",
        function: "max.sendTo",
        message: String(err),
      })
      throw err // the outbox retries
    }
  }

  /** Connection health hooks used by the outbox supervisor. */
  pierObj.max.health = (messenger: string) => ({
    nativeRecoveryMs: 0,
    isReady: () => {
      const g = generic[messenger]
      const session: MaxPollSession | undefined = g?.maxSession
      return (
        !!g?.client && !!session && !session.stopped && session.errors === 0
      )
    },
    probe: async () => {
      const client = generic[messenger]?.client as Bot | undefined
      if (!client) throw new NotReadyError("no MAX client")
      await client.api.getMyInfo()
    },
    stop: async () => {
      const g = generic[messenger]
      if (g?.maxSession) g.maxSession.stopped = true
      if (g) g.maxSession = null
    },
  })

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
    const g = generic[messenger]
    if (g.client) {
      // reconnect: same bot and handlers, new polling session from the marker
      const bot = g.client as Bot
      bot.botInfo = await bot.api.getMyInfo()
      if (g.maxSession) g.maxSession.stopped = true
      const session: MaxPollSession = { stopped: false, errors: 0 }
      g.maxSession = session
      void maxPollLoop(messenger, bot, session)
      return
    }

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

    // throws while offline: the supervisor retries with backoff
    bot.botInfo = await bot.api.getMyInfo()
    generic[messenger].client = bot
    const session: MaxPollSession = { stopped: false, errors: 0 }
    g.maxSession = session
    void maxPollLoop(messenger, bot, session)
  }
}
