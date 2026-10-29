import axios from "axios"
import to from "await-to-js"
import { hooks } from "../hooks"
import { log } from "../logger"
import { markedParse } from "../marked-parse"
import { escapeHTML } from "../../libs/formatting-converters/generic"
import { common, generic, pierObj, state } from "../state"
import WebSocket from "ws"
import type { IsendToArgs, Json } from "../types"
import html2md from "../../libs/formatting-converters/html2md-ts"
import { NotReadyError, TimeoutError } from "../../reliability/errors"
import {
  getCursor,
  reportDown,
  SeenSet,
  setCursor,
} from "../../reliability/runtime"

/** HTTP timeout for REST calls and the outgoing webhook. */
const MM_HTTP_TIMEOUT_MS = 30000
/** Websocket request/response round trip timeout (probe). */
const MM_WS_TIMEOUT_MS = 15000
/** Inbound catch-up only relays posts younger than this. */
const MM_CATCHUP_MAX_AGE_MS = 24 * 3600 * 1000

const seenPosts: Record<string, SeenSet> = {}
const seen = (messenger: string) =>
  (seenPosts[messenger] = seenPosts[messenger] ?? new SeenSet())
const cursorKey = (messenger: string, channelName: string) =>
  `mattermost:${messenger}:${channelName}`

function rememberPost(messenger: string, channelName: string, post: any) {
  if (!post?.id) return
  seen(messenger).add(post.id)
  const key = cursorKey(messenger, channelName)
  const prev = Number(getCursor(key) ?? 0)
  if (Number(post.create_at) > prev) setCursor(key, String(post.create_at))
}

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
    axios.post<{ id: string }>(
      url,
      {
        login_id: pier.login,
        password: pier.password,
      },
      { timeout: MM_HTTP_TIMEOUT_MS },
    ),
  )
  if (err || !response) {
    console.error(err ?? new Error("Mattermost login: no response"))
    // offline or rejected: the supervisor retries with backoff
    throw err ?? new Error("Mattermost login: no response")
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
    axios.get<T>(url, {
      headers: authHeaders(messenger),
      timeout: MM_HTTP_TIMEOUT_MS,
    }),
  )
  if (err) {
    console.error(String(err))
    return null
  }
  return res!.data
}

/** Like mmGetJson but throws on failure. */
async function mmGetStrict<T>(messenger: string, path: string): Promise<T> {
  const res = await axios.get<T>(`${apiBase(messenger)}${path}`, {
    headers: authHeaders(messenger),
    timeout: MM_HTTP_TIMEOUT_MS,
  })
  return res.data
}

/** Same as mmGetJson but accepts an absolute URL (used where callers already build full ProviderUrl paths). */
async function mmGetAbsolute<T>(
  messenger: string,
  absoluteUrl: string,
): Promise<T | null> {
  const [err, res] = await to(
    axios.get<T>(absoluteUrl, {
      headers: authHeaders(messenger),
      timeout: MM_HTTP_TIMEOUT_MS,
    }),
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
      // failures throw: the outbox supervisor retries with backoff instead
      // of disabling the pier for the rest of the process lifetime
      const login = await mmLogin(messenger)
      pierConfig(messenger).token = login.token
      pierConfig(messenger).user_id = login.id

      const teams = await mmGetStrict<MattermostTeam[]>(
        messenger,
        `/api/v4/users/${login.id}/teams`,
      )
      const team = teams.find(
        (i) =>
          i.display_name === pierConfig(messenger).team ||
          i.name === pierConfig(messenger).team,
      )
      if (!team)
        throw new Error(
          `Mattermost: no team matching "${pierConfig(messenger).team}"`,
        )
      pierConfig(messenger).team_id = team.id

      return new WebSocket(pierConfig(messenger).APIUrl)
    },
  }

  /** Websocket request -> seq_reply round trip. */
  pierObj.mattermost.common.wsRequest = (
    messenger: string,
    action: string,
    data: Record<string, unknown> = {},
  ): Promise<any> => {
    const g = generic[messenger]
    const ws: WebSocket | undefined = g?.client
    if (!ws || ws.readyState !== WebSocket.OPEN || !g.authed)
      return Promise.reject(new NotReadyError("mattermost websocket not open"))
    g.seq = (g.seq ?? 1) + 1
    const seq = g.seq
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        delete g.pending[seq]
        reject(new TimeoutError(`mattermost: no reply to ${action}`))
      }, MM_WS_TIMEOUT_MS)
      timer.unref?.()
      g.pending[seq] = (reply: any) => {
        clearTimeout(timer)
        delete g.pending[seq]
        if (reply?.status === "OK") resolve(reply)
        else reject(new Error(`mattermost ${action}: ${JSON.stringify(reply)}`))
      }
      ws.send(JSON.stringify({ seq, action, data }))
    })
  }

  /** Re-relays posts made while the bridge was disconnected. */
  pierObj.mattermost.catchUp = async (messenger: string) => {
    const teamId = pierConfig(messenger).team_id
    if (!teamId) return
    const userNames: Record<string, string> = {}
    for (const channelName of Object.keys(
      state.config.channelMapping?.[messenger] ?? {},
    )) {
      const key = cursorKey(messenger, channelName)
      const since = Number(getCursor(key) ?? 0)
      if (!since) continue // nothing seen yet: no backlog to recover
      const channel = await mmGetStrict<{ id: string }>(
        messenger,
        `/api/v4/teams/${teamId}/channels/name/${encodeURIComponent(channelName)}`,
      )
      const list = await mmGetStrict<{
        order: string[]
        posts: Record<string, any>
      }>(messenger, `/api/v4/channels/${channel.id}/posts?since=${since}`)
      const posts = Object.values(list?.posts ?? {})
        .filter((p: any) => Number(p.create_at) > since)
        .sort((a: any, b: any) => Number(a.create_at) - Number(b.create_at))
      for (const post of posts) {
        if (seen(messenger).has(post.id)) continue
        rememberPost(messenger, channelName, post)
        if (Date.now() - Number(post.create_at) > MM_CATCHUP_MAX_AGE_MS)
          continue
        if (!userNames[post.user_id]) {
          const user = await mmGetJson<{ username?: string }>(
            messenger,
            `/api/v4/users/${post.user_id}`,
          )
          userNames[post.user_id] = user?.username ?? ""
        }
        log(messenger)({ catchUp: post.id, channelName })
        await pierObj.mattermost.receivedFrom(messenger, {
          event: "posted",
          data: {
            team_id: teamId,
            channel_name: channelName,
            sender_name: `@${userNames[post.user_id]}`,
            post: JSON.stringify(post),
          },
        })
      }
    }
  }

  /** Connection health hooks used by the outbox supervisor. */
  pierObj.mattermost.health = (messenger: string) => ({
    nativeRecoveryMs: 0, // we own the websocket: reconnect = restart
    isReady: () => {
      const g = generic[messenger]
      return !!g?.client && g.client.readyState === WebSocket.OPEN && !!g.authed
    },
    probe: async () => {
      await pierObj.mattermost.common.wsRequest(messenger, "get_statuses")
      await mmGetStrict(messenger, "/api/v4/users/me")
    },
    stop: async () => {
      const g = generic[messenger]
      const ws: WebSocket | undefined = g?.client
      if (!ws) return
      g.client = null
      g.authed = false
      ws.removeAllListeners()
      ws.on("error", () => {})
      ws.terminate()
    },
    onReady: () => pierObj.mattermost.catchUp(messenger),
  })

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
      axios.post(
        pierConfig(messenger).HookUrl,
        {
          text,
          channel: channelId,
        },
        { timeout: MM_HTTP_TIMEOUT_MS },
      ),
    )
    if (err) {
      console.error(String(err))
      throw err // the outbox retries
    }
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
      if (channelId) rememberPost(messenger, channelId, postParsed)
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
    if (!state.config.MessengersAvailable[messenger]) return
    const g = generic[messenger]
    const ws: WebSocket = await pierObj.mattermost.common.Start({
      messenger,
    })
    g.client = ws
    g.authed = false
    g.seq = 1
    g.pending = {}
    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          seq: 1,
          action: "authentication_challenge",
          data: {
            token: pierConfig(messenger).token,
          },
        }),
      )
    })
    ws.on("message", (raw: WebSocket.RawData) => {
      let parsed: any
      try {
        parsed = JSON.parse(raw.toString())
      } catch (e) {
        console.error(String(e))
        return
      }
      if (parsed?.seq_reply !== undefined) {
        if (parsed.seq_reply === 1) g.authed = parsed.status === "OK"
        g.pending?.[parsed.seq_reply]?.(parsed)
        return
      }
      if (parsed?.event === "hello") g.authed = true
      if (!pierConfig(messenger).team_id) return
      pierObj.mattermost.receivedFrom(messenger, parsed)
    })
    ws.on("close", (code: number) => {
      if (g.client !== ws) return
      g.authed = false
      reportDown(messenger, `mattermost websocket closed (${code})`)
    })
    ws.on("error", (error: Error) => {
      if (g.client !== ws) return
      g.authed = false
      reportDown(messenger, `mattermost websocket error: ${error.message}`)
    })
  }
}
