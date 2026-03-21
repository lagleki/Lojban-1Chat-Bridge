import { createPierObj } from "./pier-registry"
import type { Igeneric, IMessengerInfo } from "./types"

/** Mutable bridge configuration (assigned during startup). */
export const state = {
  config: null as any,
  localizationConfig: null as any,
}

export const generic: Igeneric = {}
export const queueOf: IMessengerInfo = {}
export const common: any = {}

export const pierObj: any = createPierObj()
