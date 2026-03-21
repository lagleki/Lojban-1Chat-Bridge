import type http from "http"
/** Ensures default `downloadFile` transports (simple, data) are registered before piers add theirs. */
import "./download-file"
import { registerDiscordPier } from "./discord/index"
import { registerIrcPier } from "./irc"
import { registerMattermostPier } from "./mattermost"
import { registerSlackPier } from "./slack"
import { registerTelegramPier } from "./telegram"
import { registerVkboardPier } from "./vkboard"
import { registerVkwallPier } from "./vkwall"
import { registerWebwidgetPier } from "./webwidget"

/** Registers all messenger piers on the shared `pierObj` (order matters for vkboard → vkwall). */
export function registerAllPiers(getHttpServer: () => http.Server) {
  registerDiscordPier()
  registerTelegramPier()
  registerWebwidgetPier(getHttpServer)
  registerVkboardPier()
  registerVkwallPier()
  registerSlackPier()
  registerMattermostPier()
  registerIrcPier()
}
