export interface Json {
  [index: string]: string | boolean | RegExp
}

export type Chunk = { [x: string]: string } | string

export interface IMessengerInfo {
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
}) => Promise<any>

export interface IMessengerFunctions {
  [x: string]: TextFormatConverterType
}

export interface Igeneric extends IMessengerInfo {
  LogToAdmin?: any
  sendOnlineUsersTo?: any
  downloadFile?: any
  ConfigBeforeStart?: any
  PopulateChannelMapping?: any
  LocalizeString?: any
  sanitizeHtml?: any
  randomValueBase64?: any
  escapeHTML?: any
  writeCache?: any
  MessengersAvailable?: any
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
