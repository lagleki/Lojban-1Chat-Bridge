/**
 * Single source of truth for supported messenger pier ids.
 * `createPierObj` builds the nested object used by the bridge at runtime.
 *
 * Optional pier hooks (see each `register*Pier`):
 * - `shouldDisableMessenger(pierConfig)` — if true, pier is removed from MessengersAvailable.
 * - `registerDownloadFileTransport(type, fn)` — register fetch handlers for `common.downloadFile` (see download-file.ts).
 */
export const PIER_IDS = [
  "discord",
  "mattermost",
  "telegram",
  "irc",
  "slack",
  "vkboard",
  "vkwall",
  "webwidget",
] as const

export type PierId = (typeof PIER_IDS)[number]

export function createPierObj(): Record<
  string,
  { common: any } & Record<string, any>
> {
  const o: any = {}
  for (const key of PIER_IDS) {
    o[key] = { common: {} }
  }
  return o
}
