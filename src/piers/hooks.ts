/**
 * Late-bound functions defined in bridge.ts after pier registration.
 * Pier handlers call these at message-handling time.
 */
export const hooks = {
  sendFrom: null as null | SendFromFn,
}

export type SendFromFn = (args: {
  messenger: string
  channelId: string | number
  topicId?: string | number | null
  author: string
  text: string
  ToWhom?: string
  quotation?: boolean
  action?: string
  file?: string
  remote_file?: string
  edited?: boolean
  avatar?: string
}) => Promise<void>
