/**
 * Single source of truth for supported messenger pier ids.
 * `createPierObj` builds the nested object used by the bridge at runtime.
 *
 * Discovery runs at **runtime** when this module loads (not at `tsc` compile time).
 * `__dirname` is always the folder containing this file: `src/piers` under ts-node, or
 * `dist/piers` in production after `tsc`; pier subdirs sit next to `pier-registry.js`.
 *
 * Pier ids are subdirectory names that contain a pier entry (`index.ts` in source,
 * `index.js` after build — Docker runs `pnpm run tsc` then `pnpm start`, so prod only
 * has `index.js` per pier, which matches the check below).
 *
 * Optional pier hooks (see each pier’s `registerPier`):
 * - `shouldDisableMessenger(pierConfig)` — if true, pier is removed from MessengersAvailable.
 * - `registerDownloadFileTransport(type, fn)` — register fetch handlers for `common.downloadFile` (see download-file.ts).
 */
import fs from "fs"
import path from "path"

function discoverPierIds(): string[] {
  const pierRoot = __dirname
  const ids: string[] = []
  for (const name of fs.readdirSync(pierRoot)) {
    if (name.startsWith(".")) continue
    const full = path.join(pierRoot, name)
    let st: fs.Stats
    try {
      st = fs.statSync(full)
    } catch {
      continue
    }
    if (!st.isDirectory()) continue
    const hasIndex =
      fs.existsSync(path.join(full, "index.ts")) ||
      fs.existsSync(path.join(full, "index.js"))
    if (!hasIndex) continue
    ids.push(name)
  }
  ids.sort()
  return ids
}

export const PIER_IDS: readonly string[] = discoverPierIds()

export type PierId = (typeof PIER_IDS)[number]

export function createPierObj(): Record<
  string,
  { common: Record<string, unknown> } & Record<string, unknown>
> {
  const o: Record<
    string,
    { common: Record<string, unknown> } & Record<string, unknown>
  > = {}
  for (const key of PIER_IDS) {
    o[key] = { common: {} }
  }
  return o
}
