/**
 * Bots Long Poll loop for node-vk-bot-api bots (vkboard, vkwall).
 *
 * The library's own `startPolling` retries in a tight loop without delay
 * when offline, has no request timeout (a dead socket hangs forever) and
 * forgets `ts` on every error, which drops events from the outage. This loop
 * keeps (and persists) `ts`, uses timeouts and backs off, and reports the pier
 * down so the supervisor can gate deliveries.
 */
import axios from "axios"
import Context from "node-vk-bot-api/lib/context"
import { getCursor, reportDown, setCursor } from "../reliability/runtime"
import { logger } from "./logger"

export interface VkPollSession {
  stopped: boolean
  errors: number
  lastOkAt: number
}

/** Seconds the server holds a long poll request. */
const WAIT_S = 25
const REQUEST_TIMEOUT_MS = (WAIT_S + 15) * 1000

export const vkTsKey = (messenger: string) => `vk:${messenger}:ts`

export interface VkLongPollDeps {
  get?: (url: string, params: Record<string, unknown>) => Promise<any>
  sleep?: (ms: number) => Promise<void>
}

/** VK-side request with a timeout (the library sets none). */
export async function vkApiCall(
  bot: any,
  method: string,
  params: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<any> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      bot.api(method, params),
      new Promise((_r, reject) => {
        timer = setTimeout(
          () => reject(new Error(`VK ${method} timed out`)),
          timeoutMs,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function vkBotPollLoop(
  messenger: string,
  bot: any,
  session: VkPollSession,
  deps: VkLongPollDeps = {},
): Promise<void> {
  const get =
    deps.get ??
    (async (url: string, params: Record<string, unknown>) =>
      (await axios.get(url, { params, timeout: REQUEST_TIMEOUT_MS })).data)
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let server: { server: string; key: string; ts: string } | null = null
  let ts: string | undefined = getCursor(vkTsKey(messenger))
  while (!session.stopped) {
    try {
      if (!server) {
        const { response } = await vkApiCall(bot, "groups.getLongPollServer", {
          group_id: bot.settings.group_id,
          access_token: bot.settings.token,
        })
        server = response
        if (ts === undefined) ts = String(response.ts)
      }
      const body = await get(server!.server, {
        act: "a_check",
        key: server!.key,
        ts,
        wait: WAIT_S,
      })
      if (session.stopped) return
      session.errors = 0
      session.lastOkAt = Date.now()
      if (body.failed === 1) {
        // history partly lost (ts too old): continue from the new ts
        ts = String(body.ts)
        setCursor(vkTsKey(messenger), ts)
        continue
      }
      if (body.failed === 2) {
        server = null // key expired: new key, same ts
        continue
      }
      if (body.failed) {
        server = null // information lost: new key and ts
        ts = undefined
        continue
      }
      for (const update of body.updates ?? []) {
        try {
          bot.next(new Context(update, bot))
        } catch (err) {
          logger.log({
            level: "error",
            function: "vk.poll.handle",
            message: String(err),
          })
        }
      }
      ts = String(body.ts)
      setCursor(vkTsKey(messenger), ts)
    } catch (err) {
      if (session.stopped) return
      session.errors++
      server = null
      logger.log({
        level: "error",
        function: "vk.poll",
        messenger,
        message: String(err),
      })
      reportDown(messenger, `VK long poll failed: ${String(err)}`)
      await sleep(Math.min(60000, 1000 * 2 ** Math.min(session.errors, 6)))
    }
  }
}
