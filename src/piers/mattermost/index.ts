import axios from "axios"
import to from "await-to-js"
import { hooks } from "../hooks"
import { log } from "../logger"
import { markedParse } from "../marked-parse"
import { escapeHTML } from "../../libs/formatting-converters/generic"
import { common, generic, pierObj, state } from "../state"
import ReconnectingWebSocket from "reconnecting-websocket"
import WebSocket from "ws"
import type { IsendToArgs, Json } from "../types"
import html2md from "../../libs/formatting-converters/html2md-ts"

function pierConfig(messenger: string) {
  return state.config.piers[messenger]
}

function authHeaders(messenger: string) {
  return {
    Authorization: `Bearer ${pierConfig(messenger).token}`,
  }
}

function apiBase(messenger: string): string {
  return pierConfig(messenger).ProviderUrl
}

async function mmLogin(messenger: string) {
  const pier = pierConfig(messenger)
  const url = `${pier.ProviderUrl}/api/v4/users/login`
  const [err, response] = await to(
    axios.post<{ id: string }>(url, {
      login_id: pier.login,
      password: pier.password,
    }),
  )
  if (err || !response) {
    console.error(err ?? new Error("Mattermost login: no response"))
    return null
  }
  const h = response.headers as Record<string, string | undefined>
  const token = h.token ?? h.Token ?? ""
  return { token, id: response.data.id }
}

async function mmGetJson<T>(
  messenger: string,
  path: string,
): Promise<T | null> {
  const pathPart = path.startsWith("/") ? path : `/${path}`
  const url = `${apiBase(messenger)}${pathPart}`
  const [err, res] = await to(
    axios.get<T>(url, { headers: authHeaders(messenger) }),
  )
  if (err) {
    console.error(String(err))
    return null
  }
  return res!.data
}

/** Same as mmGetJson but accepts an absolute URL (used where callers already build full ProviderUrl paths). */
async function mmGetAbsolute<T>(
  messenger: string,
  absoluteUrl: string,
): Promise<T | null> {
  const [err, res] = await to(
    axios.get<T>(absoluteUrl, { headers: authHeaders(messenger) }),
  )
  if (err) {
    console.error(String(err))
    return null
  }
  return res!.data
}

type MattermostTeam = {
  id: string
  name: string
  display_name?: string
}

export function registerPier() {
  pierObj.mattermost.common = {
    Start: async function ({ messenger }: { messenger: string }) {
      const login = await mmLogin(messenger)
      if (!login) {
        state.config.MessengersAvailable[messenger] = false
        return
      }
      pierConfig(messenger).token = login.token
      pierConfig(messenger).user_id = login.id

      const teams = await mmGetJson<MattermostTeam[]>(
        messenger,
        `/api/v4/users/${login.id}/teams`,
      )
      if (!teams) {
        state.config.MessengersAvailable[messenger] = false
        return
      }
      const team = teams.find(
        (i) =>
          i.display_name === pierConfig(messenger).team ||
          i.name === pierConfig(messenger).team,
      )
      if (!team) {
        console.error(
          new Error(
            `Mattermost: no team matching "${pierConfig(messenger).team}"`,
          ),
        )
        state.config.MessengersAvailable[messenger] = false
        return
      }
      pierConfig(messenger).team_id = team.id

      return new ReconnectingWebSocket(pierConfig(messenger).APIUrl, [], {
        WebSocket,
      })
    },
  }

  pierObj.mattermost.sendTo = async ({
    messenger,
    channelId,
    author: _author,
    chunk,
    action: _action,
    quotation: _quotation,
    file: _file,
    edited: _edited,
  }: IsendToArgs) => {
    const text =
      typeof chunk === "string"
        ? chunk
        : ((chunk as { main?: string }).main ?? String(chunk))
    const [err] = await to(
      axios.post(pierConfig(messenger).HookUrl, {
        text,
        channel: channelId,
      }),
    )
    if (err) console.error(String(err))
  }

  pierObj.mattermost.receivedFrom = async (messenger: string, message: any) => {
    const sendFrom = hooks.sendFrom!
    if (!state.config.channelMapping[messenger]) return

    let channelId: string | undefined
    let msgText: string | undefined
    let author: string | undefined
    let file_ids: string[] | undefined
    let postParsed: any

    if (message.event === "post_edited") {
      const post = JSON.parse(message.data?.post || "")

      if (!post.id) return
      message.event = "posted"
      message.edited = true

      const postData = await mmGetJson<{
        message: string
        file_ids: string[]
      }>(messenger, `/api/v4/posts/${post.id}`)
      if (postData) {
        msgText = postData.message
        file_ids = postData.file_ids
      }

      const userData = await mmGetJson<{
        username?: string
        nickname?: string
        first_name?: string
      }>(messenger, `/api/v4/users/${post.user_id}`)
      if (userData) {
        author =
          userData.username || userData.nickname || userData.first_name || ""
      }

      const channelData = await mmGetJson<{ name: string }>(
        messenger,
        `/api/v4/channels/${post.channel_id}`,
      )
      if (channelData) channelId = channelData.name
    } else {
      message.edited = false
      if (message.data?.team_id !== pierConfig(messenger).team_id) return
      if (message.event !== "posted") return
      const post = message.data?.post
      if (!post) return
      postParsed = JSON.parse(post)
      channelId = message.data?.channel_name
    }
    if (
      channelId !== undefined &&
      state.config.channelMapping[messenger][channelId] &&
      !postParsed?.props?.from_webhook &&
      (postParsed?.type || "") === ""
    ) {
      const attachmentIds: string[] = file_ids ?? postParsed?.file_ids ?? []
      const files: [string, string][] = []
      for (const file of attachmentIds) {
        const linkData = await mmGetJson<{ link: string }>(
          messenger,
          `/api/v4/files/${file}/link`,
        )
        const infoData = await mmGetJson<{ extension: string }>(
          messenger,
          `/api/v4/files/${file}/info`,
        )
        if (linkData?.link && infoData?.extension) {
          files.push([infoData.extension, linkData.link])
        }
      }
      author = author || message.data?.sender_name
      author = (author ?? "").replace(/^@/, "")
      if (files.length > 0) {
        for (const [extension, file] of files) {
          const [file_, localfile]: [string, string] =
            await common.downloadFile({
              messenger,
              type: "simple",
              remote_path: file,
              extension,
            })
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
      let action: string | undefined
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

  pierObj.mattermost.convertFrom = async ({
    text,
    messenger: _messenger,
  }: {
    text: string
    messenger: string
  }) =>
    markedParse({
      text: escapeHTML(text),
      messenger: "mattermost",
      unescapeCodeBlocks: true,
    })

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

  pierObj.mattermost.getChannels = async (pier: string): Promise<void> => {
    let json: Json = {}
    let url = `${pierConfig(pier).ProviderUrl}/api/v4/teams/${pierConfig(pier).team_id}/channels`
    json = await pierObj.mattermost.common.GetChannelsMattermostCore(
      pier,
      json,
      url,
    )
    url = `${pierConfig(pier).ProviderUrl}/api/v4/users/${pierConfig(pier).user_id}/teams/${pierConfig(pier).team_id}/channels`
    json = await pierObj.mattermost.common.GetChannelsMattermostCore(
      pier,
      json,
      url,
    )
    state.config.cache[pier] = json
  }

  pierObj.mattermost.common.GetChannelsMattermostCore = async (
    messenger: string,
    json: Json,
    url: string,
  ) => {
    const body = await mmGetAbsolute<Array<{ name: string }>>(messenger, url)
    if (Array.isArray(body)) {
      for (const i of body) {
        json[i.name] = i.name
      }
    }
    return json
  }

  pierObj.mattermost.StartService = async ({
    messenger,
  }: {
    messenger: string
  }) => {
    generic[messenger].client = await pierObj.mattermost.common.Start({
      messenger,
    })
    if (!state.config.MessengersAvailable[messenger]) return
    generic[messenger].client.addEventListener("open", () => {
      generic[messenger].client.send(
        JSON.stringify({
          seq: 1,
          action: "authentication_challenge",
          data: {
            token: pierConfig(messenger).token,
          },
        }),
      )
    })
    generic[messenger].client.addEventListener("message", (message: any) => {
      if (!message?.data || !pierConfig(messenger).team_id) return
      try {
        const parsed = JSON.parse(message.data)
        pierObj.mattermost.receivedFrom(messenger, parsed)
      } catch (e) {
        console.error(String(e))
      }
    })
    generic[messenger].client.addEventListener("close", () =>
      generic[messenger].client._connect(),
    )
    generic[messenger].client.addEventListener("error", () =>
      generic[messenger].client._connect(),
    )
  }
}
