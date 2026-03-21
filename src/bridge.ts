interface ErrorConstructor {
  stackTraceLimit?: number
}

;(Error as ErrorConstructor).stackTraceLimit = 100

declare let process: {
  env: {
    NTBA_FIX_319: number
    HOME: string
    log?: string
    PWD?: string
  }
  argv: string[]
}
process.env.NTBA_FIX_319 = 1

import fs from "fs-extra"
import path from "path"
import { mkdirp } from "mkdirp"
import to from "await-to-js"
import http from "http"
import Telegram from "node-telegram-bot-api"
import PQueue from "p-queue"
import finalhandler from "finalhandler"
import serveStatic from "serve-static"

import { downloadFile } from "./piers/download-file"
import { HTMLSplitter } from "./piers/html-splitter"
import { hooks } from "./piers/hooks"
import { log, logger } from "./piers/logger"
import { cache_folder } from "./piers/paths"
import { registerAllPiers } from "./piers/register-all"
import { common, generic, pierObj, queueOf, state } from "./piers/state"
import type { Chunk } from "./piers/types"

const R = require("ramda")

const defaults = path.join(__dirname, `../default-config/defaults.js`)

const sanitizeHtml = require("sanitize-html")

type TelegramMessage = Telegram.Message & { message_thread_id?: number }

let server: http.Server
registerAllPiers(() => server)
// sendTo
async function FormatMessageChunkForSending({
  messenger,
  channelId,
  author,
  chunk,
  action,
  title,
  quotation,
}: {
  messenger: string
  channelId: number | string
  author: string
  chunk: Chunk
  action?: string
  title?: string
  quotation?: boolean
}) {
  const root_messenger = common.root_of_messenger(messenger)
  if (quotation) {
    if (!author || author === "") author = "-"
    chunk = common.LocalizeString({
      messenger,
      channelId,
      localized_string_key: `OverlayMessageWithQuotedMark.${root_messenger}`,
      arrElemsToInterpolate: [
        ["author", author],
        ["chunk", chunk],
        ["title", title],
      ],
    })

    log(messenger)({
      level: "info",
      function: "OverlayMessageWithQuotedMark",
      messenger,
      channelId,
      author,
      chunk,
      title,
    })
  } else if ((author || "") !== "") {
    if ((state.config.piers[messenger]?.Actions || []).includes(action)) {
      chunk = common.LocalizeStringWrapper({
        messenger,
        channelId,
        localized_string_key: `sendTo.${root_messenger}.action`,
        arrElemsToInterpolate: [
          ["author", author],
          ["chunk", chunk],
          ["title", title],
        ],
      })
    } else {
      chunk = common.LocalizeStringWrapper({
        messenger,
        channelId,
        localized_string_key: `sendTo.${root_messenger}.normal`,
        arrElemsToInterpolate: [
          ["author", author],
          ["chunk", chunk],
          ["title", title],
        ],
      })
    }
  } else {
    chunk = common.LocalizeStringWrapper({
      messenger,
      channelId,
      localized_string_key: `sendTo.${root_messenger}.ChunkOnly`,
      arrElemsToInterpolate: [
        ["chunk", chunk],
        ["title", title],
      ],
    })
  }
  return chunk
}

async function prepareChunks({
  messenger,
  channelId,
  text,
  edited,
  messengerTo,
}: {
  messenger: string
  messengerTo: string
  channelId: string | number
  text: string
  edited?: boolean
}) {
  const root_messengerTo = common.root_of_messenger(messengerTo)
  const arrChunks: Chunk[] = pierObj[messengerTo]?.common?.GetChunks
    ? await pierObj[messengerTo]?.common?.GetChunks(text, messengerTo)
    : await common.GetChunks(text, messengerTo)

  for (const i in arrChunks) {
    log("generic")(
      `converting for messenger ${messengerTo} the text "` + arrChunks[i] + `"`,
    )
    if (edited)
      arrChunks[i] = common.LocalizeString({
        messenger,
        channelId,
        localized_string_key: `OverlayMessageWithEditedMark.${root_messengerTo}`,
        arrElemsToInterpolate: [["message", arrChunks[i]]],
      })

    arrChunks[i] = await pierObj[root_messengerTo]?.convertTo({
      text: arrChunks[i] || "",
      messenger,
      messengerTo,
    })
    log("generic")(
      `converted for messenger ${messengerTo} to the text "` +
        arrChunks[i] +
        `"`,
    )
  }
  return arrChunks
}

async function universalSendTo({
  messenger,
  channelId,
  author,
  chunk,
  quotation,
  action,
  file,
  edited,
  avatar,
}: {
  messenger: string
  channelId: string | number
  author: string
  chunk: Chunk
  quotation?: boolean
  action?: string
  file?: string
  remote_file?: string
  edited?: boolean
  avatar?: string
}) {
  if (
    state.config?.channelMapping?.[messenger]?.[channelId]?.settings?.readonly
  )
    return
  if (!queueOf[messenger]) {
    logger.log({
      level: "warn",
      message: `universalSendTo: no send queue for ${messenger}; skip (pier missing or StartService did not run)`,
    })
    return
  }
  queueOf[messenger].add(async () => {
    // console.log(messenger, chunk);
    await pierObj[common.root_of_messenger(messenger)]?.sendTo({
      messenger: messenger,
      channelId,
      author,
      chunk,
      quotation,
      action,
      file,
      edited,
      avatar,
    })
  })
}

async function sendFrom({
  messenger,
  channelId,
  topicId,
  author,
  text,
  ToWhom,
  quotation,
  action,
  file,
  remote_file: _remoteFile,
  edited,
  avatar,
}: {
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
}) {
  const ConfigNode =
    state.config?.channelMapping?.[messenger]?.[
      topicId ? `${topicId}@${channelId}` : channelId
    ]
  if (!ConfigNode)
    return common.LogToAdmin(
      `error finding assignment to ${messenger} channel with id ${channelId}`,
    )
  if (!text || text === "") return
  const messenger_core = common.root_of_messenger(messenger)
  text = await pierObj[messenger_core]?.convertFrom({ text, messenger })
  text = text.replace(/\*/g, "&#x2A;").replace(/_/g, "&#x5F;")
  text = text.replace(/^(<br\/>)+/, "")

  for (const messengerTo of Object.keys(state.config.channelMapping)) {
    if (
      state.config.MessengersAvailable[messengerTo] &&
      ConfigNode[messengerTo] &&
      messenger !== messengerTo
    ) {
      let thisToWhom: string = ""
      if (ToWhom)
        if (pierObj[messengerTo]?.common?.prepareToWhom) {
          thisToWhom = pierObj[messengerTo]?.common.prepareToWhom({
            messenger: messengerTo,
            text: ToWhom,
            targetChannel: ConfigNode[messengerTo],
          })
        } else
          thisToWhom = common.prepareToWhom({
            messenger: messengerTo,
            text: ToWhom,
            targetChannel: ConfigNode[messengerTo],
          })
      if (!author) author = ""
      if (pierObj[messengerTo]?.common?.prepareAuthor) {
        author = pierObj[messengerTo]?.common?.prepareAuthor({
          messenger: messengerTo,
          text: author,
          targetChannel: ConfigNode[messengerTo],
        })
      } else
        author = common.prepareAuthor({
          messenger: messengerTo,
          text: author,
          targetChannel: ConfigNode[messengerTo],
        })

      const Chunks = await prepareChunks({
        messenger,
        channelId,
        text,
        edited,
        messengerTo,
      })

      for (const i in Chunks) {
        const chunk = Chunks[i]
        Chunks[i] = await FormatMessageChunkForSending({
          messenger: messengerTo,
          channelId,
          title: state.config.piers[messenger]?.group_id,
          author,
          chunk: thisToWhom + chunk,
          action,
          quotation,
        })
      }

      Chunks.map((chunk) => {
        universalSendTo({
          messenger: messengerTo,
          channelId: ConfigNode[messengerTo],
          author,
          chunk,
          quotation,
          action,
          file,
          edited,
          avatar,
        })
      })
    }
  }
}

common.writeCache = async ({
  pier,
  channelName,
  channelId,
  action,
}: {
  pier: string
  channelName: string | number
  channelId: string | number
  action: string
}) => {
  await new Promise((resolve) => {
    fs.writeFileSync(
      `${cache_folder}/channelMapping.json`,
      JSON.stringify(state.config.channelMapping),
    )
    fs.writeFile(
      `${cache_folder}/cache.json`,
      JSON.stringify(state.config.cache),
      (err: any) => {
        log("generic")({ pier, action, channelName, channelId, error: err })
        resolve(null)
      },
    )
  })
}

hooks.sendFrom = sendFrom

// common
common.ConfigBeforeStart = () => {
  if (process.argv[2] === "--genconfig") {
    mkdirp.sync(cache_folder)

    // read default config using readFile to include comments
    const configFile = fs.readFileSync(defaults)
    const configPath = `${cache_folder}/config.js`
    fs.writeFileSync(configPath, configFile)
    throw new Error(
      `Wrote default configuration to ${configPath}, please edit it before re-running`,
    )
  }

  try {
    state.config = require(`${cache_folder}/config.js`)
  } catch (e) {
    throw new Error(
      `ERROR while reading config:\n${e}\n\nPlease make sure ` +
        'it exists and is valid. Run "node bridge --genconfig" to ' +
        "generate a default config.",
    )
  }

  const defaultConfig = require(defaults)
  state.config = R.mergeDeepLeft(state.config, defaultConfig)

  state.localizationConfig = require("../src/local/dict.json")
}

common.getMessengersWithPrefix = async (prefix: string) => {
  return Object.keys(state.config.MessengersAvailable).filter(
    (el: string) =>
      el.indexOf(prefix + "_") === 0 &&
      state.config.MessengersAvailable[el] === true,
  )
}

interface TopicalizedChannel {
  groupName: string
  topicId: string
  removeJoinMessages: boolean
}

interface NewChannel {
  [messenger: string]: string | boolean | number | TopicalizedChannel
}
async function PopulateChannelMappingCore({
  messenger,
}: {
  messenger: string
}) {
  if (!state.config.MessengersAvailable[messenger]) return
  if (!state.config.channelMapping[messenger])
    state.config.channelMapping[messenger] = {}
  const arrMappingKeys: string[] = Object.keys(
    state.config.MessengersAvailable,
  ).filter((el: string) => state.config.MessengersAvailable[el] === true)
  state.config.new_channels.map((newChannel: NewChannel) => {
    let i_mapped = newChannel[messenger] as string
    let topicalizedChannel: Partial<TopicalizedChannel> = {}
    if (state.config.cache[messenger]) {
      topicalizedChannel = {
        groupName: (newChannel[messenger] as TopicalizedChannel)?.groupName,
        topicId: (newChannel[messenger] as TopicalizedChannel)?.topicId,
        removeJoinMessages: (newChannel[messenger] as TopicalizedChannel)
          ?.removeJoinMessages,
      }

      if (topicalizedChannel.groupName && topicalizedChannel.topicId) {
        i_mapped = `${topicalizedChannel.topicId}@${
          state.config.cache?.[messenger]?.[topicalizedChannel.groupName]
        }`
      } else if (topicalizedChannel.groupName) {
        i_mapped =
          state.config.cache?.[messenger]?.[topicalizedChannel.groupName]
      } else {
        i_mapped =
          state.config.cache?.[messenger]?.[newChannel[messenger] as string]
      }
    }
    if (!i_mapped) return
    const mapping: { [key: string]: string | NewChannel } = {
      settings: {
        readonly: newChannel[`${messenger}-readonly`],
        dontProcessOtherBridges:
          newChannel[`${messenger}-dontProcessOtherBridges`],
        showNotices: newChannel["showNotices"],
        language: newChannel["language"],
        restrictToLojban: newChannel["restrictToLojban"],
        nickcolor: newChannel[`${messenger}-nickcolor`],
        name: newChannel[messenger],
        topicId: (topicalizedChannel.topicId || "") as string,
        removeJoinMessages: (topicalizedChannel.removeJoinMessages ??
          false) as boolean,
      },
    }

    for (const key of arrMappingKeys)
      mapping[key] = (newChannel[key] as TopicalizedChannel)?.groupName
        ? `${(newChannel[key] as TopicalizedChannel)?.topicId}@${
            state.config.cache?.[key]?.[
              (newChannel[key] as TopicalizedChannel)?.groupName
            ] || newChannel[key]
          }`
        : state.config.cache?.[key]?.[newChannel[key] as string] ||
          newChannel[key]

    state.config.channelMapping[messenger][i_mapped] = R.mergeDeepLeft(
      mapping,
      state.config.channelMapping[messenger][i_mapped] || {},
    )
  })
  fs.writeFileSync(
    `${cache_folder}/channelMapping.json`,
    JSON.stringify(state.config.channelMapping, null, 2),
  )
}

common.PopulateChannelMapping = async () => {
  if (!state.config.channelMapping) state.config.channelMapping = {}
  if (!state.config.cache) state.config.cache = {}

  const arrAvailableMessengers = Object.keys(
    state.config.MessengersAvailable,
  ).filter((i: string) => !!state.config.MessengersAvailable[i])
  for (const pier of arrAvailableMessengers) {
    const messenger = common.root_of_messenger(pier)
    if (pierObj[messenger]?.getChannels)
      await pierObj[messenger].getChannels(pier)
  }

  for (const pier of arrAvailableMessengers) {
    await PopulateChannelMappingCore({ messenger: pier })
  }
}

common.root_of_messenger = (messenger_with_index: string) =>
  messenger_with_index.replace(/_.*/g, "").replace(/_.*/g, "")
common.MessengersAvailable = () => {
  state.config.MessengersAvailable = {}
  state.config.new_channels.forEach((i: any) => {
    Object.keys(i)
      .filter((a: any) => a.indexOf("-") === -1 && a.indexOf("_") > 0)
      .forEach((a: any) => (state.config.MessengersAvailable[a] = true))
  })
  Object.keys(state.config.MessengersAvailable).forEach(
    (messenger_with_index: string) => {
      const messenger = common.root_of_messenger(messenger_with_index)
      const pier_config = state.config.piers[messenger_with_index]
      if (pierObj[messenger]?.shouldDisableMessenger?.(pier_config))
        delete state.config.MessengersAvailable[messenger_with_index]
    },
  )
  // Drop piers with no implementation (e.g. removed facebook) so channelMapping cannot target them.
  Object.keys(state.config.MessengersAvailable).forEach(
    (messenger_with_index: string) => {
      const messenger = common.root_of_messenger(messenger_with_index)
      if (!pierObj[messenger]) {
        delete state.config.MessengersAvailable[messenger_with_index]
      }
    },
  )
  Object.keys(state.config.MessengersAvailable).forEach(
    (messenger: string) => (generic[messenger] = {}),
  )
}

async function StartServices() {
  common.MessengersAvailable()
  if (!state.config.channelMapping) state.config.channelMapping = {}

  for (const messenger_with_index of Object.keys(
    state.config.MessengersAvailable,
  )) {
    const messenger = messenger_with_index.replace(/_.*/g, "")
    if (pierObj[messenger]?.StartService) {
      queueOf[messenger_with_index] = new PQueue({ concurrency: 1 })
      await pierObj[messenger]?.StartService({
        messenger: messenger_with_index,
      })
    }
  }
  await common.PopulateChannelMapping()

  console.log("Lojban-1Chat-Bridge started!")
}
common.LogMessageToAdmin = async (
  messenger: string,
  message: TelegramMessage,
) => {
  if (state.config.piers[messenger].admins_userid) {
    await to(
      generic[messenger].client.forwardMessage(
        state.config.piers[messenger].admins_userid,
        message.chat.id,
        message.message_id,
      ),
    )
    await to(
      generic[messenger].client.sendMessage(
        state.config.piers[messenger].admins_userid,
        JSON.stringify(message),
        {
          parse_mode: "HTML",
        },
      ),
    )
  }
}

common.LogToAdmin = (msg_text: string, repeat = true) => {
  logger.log({
    level: "error",
    message: JSON.stringify(msg_text),
  })
  const telegram_piers_with_logging_to_admin = Object.keys(
    state.config.piers,
  ).filter(
    (i: any) => typeof state.config.piers[i].admins_userid !== "undefined",
  )
  for (const pier of telegram_piers_with_logging_to_admin)
    if (generic[pier].client)
      generic[pier].client
        .sendMessage(
          state.config.piers[pier].admins_userid,
          `\`\`\`\n${msg_text}\n\`\`\``,
          {
            parse_mode: "Markdown",
          },
        )
        .catch((_e: any) => {
          if (repeat) common.LogToAdmin(msg_text, false)
        })
}

const htmlEntities: any = {
  nbsp: " ",
  cent: "¢",
  pound: "£",
  yen: "¥",
  euro: "€",
  copy: "©",
  reg: "®",
  lt: "<",
  gt: ">",
  quot: '"',
  amp: "&",
  apos: "'",
  "#42": "*",
  "#95": "_",
  "#96": "`",
}
common.unescapeHTML = ({
  text,
  convertHtmlEntities,
  escapeBackslashes = true,
}: {
  text: string
  convertHtmlEntities?: boolean
  escapeBackslashes?: boolean
}) => {
  if (escapeBackslashes) text = text.replace(/\\/g, "\\")
  text = text.replace(/&([^;]+);/g, (entity: string, entityCode: string) => {
    let match: any

    if (convertHtmlEntities && htmlEntities[entityCode]) {
      return htmlEntities[entityCode]
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16))
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(~~match[1])
    } else {
      return entity
    }
  })
  return text
}
common.GetChunks = async (text: string, messenger: string) => {
  // text = await appendPageTitles(text);
  const limit = state.config.piers[messenger]?.MessageLength || 400
  const arrText: string[] = HTMLSplitter(text, limit)
  return arrText
}
common.downloadFile = downloadFile

common.sanitizeHtml = (
  text: string,
  allowedTags: string[] = [
    "blockquote",
    "b",
    "strong",
    "i",
    "pre",
    "code",
    "a",
    "em",
    "u",
    "ins",
    "s",
    "br",
    "del",
    "span",
  ],
) => {
  return sanitizeHtml(text, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "class"],
    },
  })
}

common.LocalizeStringWrapper = ({
  messenger,
  channelId,
  localized_string_key,
  arrElemsToInterpolate,
}: {
  messenger: string
  channelId: string | number
  localized_string_key: string
  arrElemsToInterpolate: Array<Array<string>>
}) => {
  const language =
    state.config?.channelMapping?.[messenger]?.[channelId]?.settings
      ?.language || "English"
  const localized_string_key_additional =
    localized_string_key + ".fallback_solution"
  if (state.localizationConfig[language][localized_string_key_additional])
    return {
      main: common.LocalizeString({
        messenger,
        channelId,
        localized_string_key,
        arrElemsToInterpolate,
      }),
      fallback_solution: common.LocalizeString({
        messenger,
        channelId,
        localized_string_key: localized_string_key_additional,
        arrElemsToInterpolate,
      }),
    }
  else
    return common.LocalizeString({
      messenger,
      channelId,
      localized_string_key,
      arrElemsToInterpolate,
    })
}

common.LocalizeString = ({
  messenger,
  channelId,
  localized_string_key,
  arrElemsToInterpolate,
}: {
  messenger: string
  channelId: string | number
  localized_string_key: string
  arrElemsToInterpolate: Array<Array<string>>
}) => {
  try {
    const language =
      state.config?.channelMapping?.[messenger]?.[channelId]?.settings
        ?.language || "English"
    let template = state.localizationConfig[language][localized_string_key]
    const def_template =
      state.localizationConfig["English"][localized_string_key]
    if (!def_template) {
      console.log(`no ${localized_string_key} key specified in the dictionary`)
      return
    }
    if (!template) template = def_template
    for (const value of arrElemsToInterpolate)
      template = template
        .replace(new RegExp(`%${value[0]}%`, "gu"), value[1])
        .replace(/%%/g, "%")
    return template
  } catch (error) {
    log(messenger)({
      level: "error",
      function: "LocalizeString",
      messenger,
      channelId,
      localized_string_key,
      arrElemsToInterpolate,
    })
  }
}
//START
// get/set config
common.ConfigBeforeStart()

// map channels & start listening
StartServices()

// start HTTP server for media files if configured to do so
if (state.config.generic.showMedia) {
  mkdirp.sync(`${cache_folder}/files`)
  const serve = serveStatic(`${cache_folder}/files`, {
    lastModified: false,
    index: false,
    maxAge: 86400000,
  })
  server = http.createServer((req: any, res: any) => {
    // if ((request.url || "").indexOf("/emailing/templates") === 0) {
    serve(req, res, finalhandler(req, res))
  })
  server.listen(state.config.generic.httpPort)
}
