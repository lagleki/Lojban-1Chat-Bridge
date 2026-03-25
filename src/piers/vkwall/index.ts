import to from "await-to-js"
import { CallbackService } from "vk-io"
import { ImplicitFlowUser } from "@vk-io/authorization"
import { hooks } from "../hooks"
import { generic, pierObj, state } from "../state"
import type { IsendToArgs } from "../types"

import VkBot from "node-vk-bot-api"
export function registerPier() {
  pierObj.vkwall.shouldDisableMessenger = (cfg: any) =>
    !cfg?.token || !cfg?.group_id || !cfg?.login || !cfg?.password

  pierObj.vkwall.common = {
    Start: async function ({ messenger }: { messenger: string }) {
      const callbackService = new CallbackService()

      const direct = new ImplicitFlowUser({
        callbackService,
        scope: "offline,wall,groups",
        apiVersion: state.config.piers[messenger].apiVersion,
        login: state.config.piers[messenger].login,
        password: state.config.piers[messenger].password,
        clientId: state.config.piers[messenger].appId,
        clientSecret: state.config.piers[messenger].appSecret,
      })
      const [err, vkapp] = await to(direct.run())
      if (err) {
        console.error("vkwall", err.toString())
      }
      const vkbot = new VkBot({
        token: state.config.piers[messenger].token,
        group_id: state.config.piers[messenger].group_id,
      })
      return { bot: vkbot, vkapp }
    },
  }

  pierObj.vkwall.sendTo = async ({
    messenger,
    channelId,
    author: _author,
    chunk,
    action: _action,
    quotation: _quotation,
    file: _file,
    edited: _edited,
  }: IsendToArgs) => {
    const { config } = state
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
          .then((_res: any) => {})
          .catch(() => {})
        resolve(null)
      }, 60000)
    })
  }

  pierObj.vkwall.adaptName = pierObj.vkboard.adaptName

  pierObj.vkwall.convertFrom = pierObj.vkboard.convertFrom

  pierObj.vkwall.convertTo = pierObj.vkboard.convertTo

  interface VkAttachment {
    type: string
    doc?: { url: string }
    photo?: {
      text: string
      sizes: { url: string; width: number; height: number; square?: number }[]
    }
  }

  pierObj.vkwall.receivedFrom = async (messenger: string, message: any) => {
    const { config } = state
    const sendFrom = hooks.sendFrom!
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
    const { text, from_id: fromwhomId } = message
    let [, res]: [any, any] = await to(
      generic[messenger].client.bot.api("users.get", {
        user_ids: fromwhomId,
        access_token: config.piers[messenger].token,
        fields: "nickname,screen_name",
      }),
    )
    res = res?.response?.[0] || fromwhomId
    const author = pierObj.vkwall.adaptName(messenger, res)

    const arrQuotes: string[] = []
    text.replace(
      /\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g,
      (_match: any, group_id: string, post_id: string) => {
        if (group_id === config.piers[messenger].group_id) {
          arrQuotes.push(post_id)
        }
      },
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
        ;[, res] = await to(
          generic[messenger].client.bot.api("board.getComments", opts),
        )
        let text: string = res?.response?.items?.[0]?.text
        if (!text) continue
        let replyuser: string
        const rg = new RegExp(
          `^\\[club${config.piers[messenger]?.group_id}\\|(.*?)\\]: (.*)$`,
        )
        if (rg.test(text)) {
          ;[, replyuser, text] = Array.from(text.match(rg) ?? [])
        } else {
          const authorId = res?.response?.items?.[0]?.from_id
          ;[, res] = await to(
            generic[messenger].client.bot.api("users.get", {
              user_ids: authorId,
              access_token: config.piers[messenger].token,
              fields: "nickname,screen_name",
            }),
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
    const attachments: VkAttachment[] = message.attachments || []
    const texts: string[] = []
    if (attachments.length > 0) {
      for (const a of attachments) {
        switch (a.type) {
          case "photo":
          case "posted_photo": {
            const sizes = (a.photo?.sizes ?? [])
              .map((i) => {
                i.square = i.width * i.height
                return i
              })
              .sort((d: any, c: any) => parseFloat(c.size) - parseFloat(d.size))
            if (sizes[0].url) texts.push(sizes[0].url)
            if (a?.photo?.text) texts.push(a?.photo?.text)

            break
          }
          case "doc":
            if (a?.doc?.url) texts.push(a.doc.url)
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

  pierObj.vkwall.StartService = async ({
    messenger,
  }: {
    messenger: string
  }) => {
    const { config } = state
    if (!config.MessengersAvailable[messenger]) return
    generic[messenger].client = await pierObj.vkwall.common.Start({ messenger })
    generic[messenger].client.bot.event(
      "wall_reply_new",
      async ({ message }: { message: any }) => {
        pierObj.vkwall.receivedFrom(messenger, message)
      },
    )
    generic[messenger].client.bot.event(
      "wall_reply_edit",
      async ({ message }: { message: any }) => {
        pierObj.vkwall.receivedFrom(messenger, { ...message, edited: true })
      },
    )
    generic[messenger].client.bot.startPolling()
  }
}
