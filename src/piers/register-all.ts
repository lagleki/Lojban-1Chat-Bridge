import type http from "http"
import path from "path"
/** Ensures default `downloadFile` transports (simple, data) are registered before piers add theirs. */
import "./download-file"
import { PIER_IDS } from "./pier-registry"

type RegisterPierFn =
  | (() => void)
  | ((getHttpServer: () => http.Server) => void)

/**
 * Registers every pier under `src/piers/<id>/` that `PIER_IDS` lists.
 * Each pier exports `registerPier` (arity 0, or 1 with `getHttpServer` for webwidget).
 * Order follows `PIER_IDS` (sorted): e.g. vkboard → vkchat → vkwall.
 */
export function registerAllPiers(getHttpServer: () => http.Server) {
  for (const id of PIER_IDS) {
    const { registerPier } = require(path.join(__dirname, id, "index")) as {
      registerPier?: RegisterPierFn
    }
    if (typeof registerPier !== "function") {
      throw new Error(
        `pier "${id}": expected export registerPier in ./${id}/index`,
      )
    }
    if (registerPier.length > 0) {
      ;(registerPier as (g: () => http.Server) => void)(getHttpServer)
    } else {
      ;(registerPier as () => void)()
    }
  }
}
