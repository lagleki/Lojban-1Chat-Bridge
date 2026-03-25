import to from "await-to-js"
import util from "util"
import { getRandomId, VK } from "vk-io"
import type { MessageContext } from "vk-io/lib/structures/contexts/message"
import { hooks } from "../hooks"
import { log, logger } from "../logger"
import { common, generic, pierObj, state } from "../state"
import type { IsendToArgs } from "../types"

const DEFAULT_API_VERSION = "5.199"

interface VkRawAttachment {
  type: string
  doc?: { url?: string }
  photo?: {
    text?: string
    sizes?: { url: string; width: number; height: number; square?: number }[]
  }
}

function pierCfg(messenger: string) {
  return state.config.piers[messenger]
}

function buildVk(messenger: string): VK {
  const cfg = pierCfg(messenger)
  return new VK({
    token: cfg.token,
    apiVersion: cfg.apiVersion ?? DEFAULT_API_VERSION,
    pollingGroupId: Number(cfg.group_id),
  })
}

async function resolveAuthor(
  vk: VK,
  messenger: string,
  senderId: number,
): Promise<string> {
  if (senderId < 0) {
    const [err, res] = await to(
      vk.api.groups.getById({
        group_id: Math.abs(senderId),
      }),
    )
    const arr = !err && Array.isArray(res) ? res : []
    const g = arr[0] as { screen_name?: string; name?: string } | undefined
    if (g) return g.screen_name || g.name || String(senderId)
    return String(senderId)
  }
  const [err, users] = await to(
    vk.api.users.get({
      user_ids: [senderId],
      fields: ["nickname", "screen_name"],
    }),
  )
  const u = !err && users?.[0]
  if (u) return pierObj.vkboard.adaptName(messenger, u)
  return String(senderId)
}

function attachmentUrlsFromRaw(attachments: VkRawAttachment[]): string[] {
  const texts: string[] = []
  for (const a of attachments) {
    switch (a.type) {
      case "photo":
      case "posted_photo": {
        const sizes = (a.photo?.sizes ?? [])
          .map((i) => {
            const copy = { ...i, square: i.width * i.height }
            return copy
          })
          .sort((d, c) => (c.square ?? 0) - (d.square ?? 0))
        if (sizes[0]?.url) texts.push(sizes[0].url)
        if (a.photo?.text) texts.push(a.photo.text)
        break
      }
      case "doc":
        if (a.doc?.url) texts.push(a.doc.url)
        break
      default:
        break
    }
  }
  return texts
}

function titleForConversationItem(
  item: Record<string, unknown>,
  profiles: {
    id: number
    first_name?: string
    last_name?: string
    screen_name?: string
  }[],
): string | undefined {
  const conv = (item.conversation ?? item) as {
    peer?: { id?: number; type?: string }
    chat_settings?: { title?: string }
  }
  const peer = conv?.peer
  if (!peer?.id) return undefined
  if (peer.type === "chat")
    return conv?.chat_settings?.title || `chat_${peer.id}`
  if (peer.type === "user") {
    const prof = profiles.find((p) => p.id === peer.id)
    if (prof) {
      const full = `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim()
      return prof.screen_name || full || `user_${peer.id}`
    }
    return `user_${peer.id}`
  }
  if (peer.type === "group") return `group_${peer.id}`
  return `peer_${peer.id}`
}

async function fetchConversationsCache(
  vk: VK,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  let offset = 0
  const count = 200
  for (;;) {
    const [err, res] = await to(
      vk.api.messages.getConversations({
        count,
        offset,
        extended: 1,
      }),
    )
    if (err || !res?.items?.length) break
    const profiles = res.profiles ?? []
    for (const item of res.items as Record<string, unknown>[]) {
      const conv = item.conversation as
        | { peer?: { id?: number; type?: string } }
        | undefined
      const peer = conv?.peer
      if (!peer?.id) continue
      const peerStr = String(peer.id)
      map[peerStr] = peerStr
      const title = titleForConversationItem(
        item as Record<string, unknown>,
        profiles,
      )
      if (title) map[title] = peerStr
    }
    offset += res.items.length
    if (res.items.length < count) break
  }
  return map
}

async function ensurePeerTitleAndCache(
  vk: VK,
  messenger: string,
  peerId: number,
): Promise<string | undefined> {
  const peerStr = String(peerId)
  const [err, res] = await to(
    vk.api.messages.getConversationsById({
      peer_ids: [peerId],
      extended: 1,
    }),
  )
  if (err || !res?.items?.length) return undefined
  const item = res.items[0] as Record<string, unknown>
  const profiles = res.profiles ?? []
  const title = titleForConversationItem(item, profiles) ?? peerStr

  state.config.cache[messenger] = state.config.cache[messenger] || {}
  state.config.cache[messenger][title] = peerStr
  state.config.cache[messenger][peerStr] = peerStr

  await to(
    common.writeCache({
      pier: messenger,
      channelName: title,
      channelId: peerStr,
      action: "join",
    }),
  )
  await to(common.PopulateChannelMapping())
  return title
}

export function registerPier() {
  pierObj.vkchat.shouldDisableMessenger = (cfg: {
    token?: string
    group_id?: string | number
  }) => !cfg?.token || cfg.group_id === undefined || cfg.group_id === ""

  pierObj.vkchat.common = {
    Start: async function () {
      return
    },
  }

  pierObj.vkchat.convertFrom = pierObj.vkboard.convertFrom
  pierObj.vkchat.convertTo = pierObj.vkboard.convertTo

  pierObj.vkchat.sendTo = async ({
    messenger,
    channelId,
    author: _author,
    chunk,
    action: _action,
    quotation: _quotation,
    file: _file,
    edited: _edited,
  }: IsendToArgs) => {
    const vk = generic[messenger].client as VK | undefined
    if (!vk) return

    const chunkStr =
      typeof chunk === "string"
        ? chunk
        : ((chunk as { main?: string }).main ?? "")

    const [err] = await to(
      vk.api.messages.send({
        peer_id: Number(channelId),
        message: chunkStr,
        random_id: getRandomId(),
      }),
    )
    if (err) {
      const { escapeHTML: esc } =
        await import("../../libs/formatting-converters/generic")
      common.LogToAdmin(
        `VK chat send error\n\nMessenger: ${messenger}\nChannel: ${channelId}\nChunk: ${esc(
          chunkStr,
        )}\n\n${esc(util.inspect(err, { depth: 4 }))}`,
      )
    }
  }

  pierObj.vkchat.receivedFrom = async (
    messenger: string,
    context: MessageContext,
    edited: boolean,
  ) => {
    const { config } = state
    const sendFrom = hooks.sendFrom!
    if (!config.channelMapping[messenger]) return

    if (context.isOutbox) return
    if (context.isEvent && !context.hasText && context.attachments.length === 0)
      return

    const vk = generic[messenger].client as VK
    const peerId = context.peerId
    const channelId = String(peerId)

    const maxAge = pierCfg(messenger).maxMsgAge
    if (maxAge != null && Number(maxAge) > 0) {
      const age = Math.floor(Date.now() / 1000) - context.createdAt
      if (age > Number(maxAge)) {
        log("vkchat")({
          skip: "maxMsgAge",
          age,
          peerId,
        })
        return
      }
    }

    if (!config.channelMapping[messenger][channelId])
      await ensurePeerTitleAndCache(vk, messenger, peerId)

    if (!config.channelMapping[messenger][channelId]) return

    const senderId = context.senderId
    const author = await resolveAuthor(vk, messenger, senderId)

    if (context.hasReplyMessage && context.replyMessage) {
      const reply = context.replyMessage
      if (!reply.isOutbox) {
        const replyAuthor = await resolveAuthor(vk, messenger, reply.senderId)
        const replyText = reply.text ?? ""
        await sendFrom({
          messenger,
          channelId,
          author: replyAuthor,
          text: replyText,
          quotation: true,
        })
      }
    }

    const rawAttachments = ((
      context as unknown as {
        payload: { message: { attachments?: unknown[] } }
      }
    ).payload.message.attachments ?? []) as VkRawAttachment[]
    const attUrls = attachmentUrlsFromRaw(rawAttachments)
    const text = context.text ?? ""

    for (const mini of attUrls.filter(Boolean)) {
      await sendFrom({
        messenger,
        channelId,
        author,
        text: mini,
        edited,
      })
    }

    await sendFrom({
      messenger,
      channelId,
      author,
      text,
      edited,
    })
  }

  pierObj.vkchat.getChannels = async (pier: string) => {
    const token = pierCfg(pier)?.token
    const gid = pierCfg(pier)?.group_id
    if (!token || gid === undefined || gid === "") return

    const vk = buildVk(pier)
    const [err, map] = await to(fetchConversationsCache(vk))
    if (err) {
      log("vkchat")({ getChannelsError: String(err) })
      state.config.cache[pier] = state.config.cache[pier] || {}
      return
    }
    state.config.cache[pier] = {
      ...state.config.cache[pier],
      ...map,
    }
  }

  pierObj.vkchat.StartService = async ({
    messenger,
  }: {
    messenger: string
  }) => {
    if (!state.config.MessengersAvailable[messenger]) return

    const vk = buildVk(messenger)
    generic[messenger].client = vk

    vk.updates.on("message_new", (ctx) => {
      void pierObj.vkchat.receivedFrom(messenger, ctx, false)
    })

    vk.updates.on("message_edit", (ctx) => {
      void pierObj.vkchat.receivedFrom(messenger, ctx, true)
    })

    void vk.updates.startPolling().catch((err: unknown) => {
      logger.log({
        level: "error",
        function: "vkchat.StartService",
        message: String(err),
      })
    })
  }
}
