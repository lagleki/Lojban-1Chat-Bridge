export interface Json {
  [index: string]: string | boolean | RegExp
}

export type Chunk = { [x: string]: string } | string

export interface IMessengerInfo {
  /** Pier-specific clients and helpers; intentionally loose at runtime. */
  [x: string]: any
}

type TextFormatConverterType = ({
  text,
  messenger,
  messengerTo,
}: {
  text: string
  messenger: string
  messengerTo?: string
}) => Promise<string>

export interface IMessengerFunctions {
  [x: string]: TextFormatConverterType
}

export interface Igeneric extends IMessengerInfo {
  LogToAdmin?: (payload: unknown) => void
  sendOnlineUsersTo?: (...args: unknown[]) => void
  downloadFile?: (...args: unknown[]) => unknown
  ConfigBeforeStart?: () => Promise<void>
  PopulateChannelMapping?: (...args: unknown[]) => unknown
  LocalizeString?: (args: Record<string, unknown>) => string
  sanitizeHtml?: (html: string, tags?: string[]) => string
  randomValueBase64?: (len: number) => string
  escapeHTML?: (s: string) => string
  writeCache?: (args: Record<string, unknown>) => Promise<unknown>
  MessengersAvailable?: Record<string, boolean>
}

export interface IsendToArgs {
  messenger: string
  channelId: string
  author: string
  chunk: Chunk
  action: string
  quotation: boolean
  file?: string
  edited?: boolean
  avatar?: string
}
