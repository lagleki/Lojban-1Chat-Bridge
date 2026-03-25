import * as cp from "child_process"
import fs from "fs-extra"
import path from "path"
import sharp from "sharp"
import { mkdirp } from "mkdirp"
import to from "await-to-js"
import axios from "axios"
import blalalavla from "../libs/sugar/blalalavla"
import { log, logger } from "./logger"
import { cache_folder } from "./paths"
import { state } from "./state"

export type DownloadFileArgs = {
  messenger: string
  type: string
  fileId?: string | number
  remote_path?: string
  extension?: string
}

type TransportPhaseResult = {
  err?: any
  rem_fullname: string
  local_fullname?: string
}

export type DownloadTransportArgs = {
  messenger: string
  fileId: string | number
  remote_path?: string
  extension?: string
  randomString: string
  randomStringName: string
  local_path: string
  rem_path: string
}

type DownloadTransport = (
  args: DownloadTransportArgs,
) => Promise<TransportPhaseResult>

const transports: Record<string, DownloadTransport> = {}

export function registerDownloadFileTransport(
  type: string,
  fn: DownloadTransport,
) {
  transports[type] = fn
}

function saveDataToFile({ data }: { data: string }) {
  function decodeBase64Image(dataString: string) {
    const matches = Array.from(
      dataString.match(/^data:([-+A-Za-z/]+);base64,(.+)$/) ?? [],
    )
    const response: any = {}

    if (matches.length !== 3) {
      return new Error("Invalid input string")
    }

    response.type = matches[1]
    response.data = Buffer.from(matches[2], "base64")

    return response
  }

  const imageTypeRegularExpression = /\/(.*?)$/

  const imageBuffer = decodeBase64Image(data)

  const type = imageBuffer.type.match(imageTypeRegularExpression)
  return { type: type[1], data: imageBuffer.data }
}

const simpleTransport: DownloadTransport = async ({
  remote_path,
  extension = "",
  randomString: _randomString,
  randomStringName: _randomStringName,
  local_path,
  rem_path,
}) => {
  let ext = extension
  if (ext) ext = `.${ext}`
  const basename =
    path.basename(remote_path ?? "").split(/[?#]/)[0] + (ext || "")
  const local_fullname = `${local_path}/${basename}`
  let rem_fullname = ""
  await new Promise((resolve: any) => {
    try {
      const file = fs.createWriteStream(local_fullname)
      file
        .on("open", () => {
          axios({
            method: "GET",
            url: remote_path ?? "",
            timeout: 3000,
            responseType: "stream",
          })
            .then((axiosRes) => {
              axiosRes.data
                .pipe(file)
                .on("finish", () => {
                  rem_fullname = `${rem_path}/${basename}`
                  resolve(null)
                })
                .on("error", (error: any) => {
                  logger.log({
                    level: "error",
                    function: "downloadFile",
                    type: "simple",
                    path: remote_path,
                    message: error.toString(),
                  })
                  resolve(null)
                })
            })
            .catch((error: unknown) => {
              logger.log({
                level: "error",
                function: "downloadFile",
                type: "simple",
                path: remote_path,
                message: String(error),
              })
              resolve(null)
            })
        })
        .on("error", (error: any) => {
          logger.log({
            level: "error",
            function: "downloadFile",
            type: "simple",
            error: "opening error",
            local_fullname,
            message: error.toString(),
          })
        })
    } catch (error) {
      console.log({ type: "creation error", error })
    }
  })
  return { rem_fullname, local_fullname }
}

const dataTransport: DownloadTransport = async ({
  remote_path,
  extension = "",
  randomStringName,
  local_path,
  rem_path,
}) => {
  let local_fullname: string | undefined = ""
  let rem_fullname = ""
  try {
    const { type, data } = saveDataToFile({
      data: remote_path ?? "",
    })
    const basename = randomStringName + "." + (type ?? extension)
    local_fullname = `${local_path}/${basename}`
    fs.writeFileSync(local_fullname, data)

    rem_fullname = `${rem_path}/${basename}`
  } catch (error) {
    local_fullname = ""
    logger.log({
      level: "error",
      function: "downloadFile",
      type: "data",
      message: String(error),
    })
  }
  return { rem_fullname, local_fullname }
}

registerDownloadFileTransport("simple", simpleTransport)
registerDownloadFileTransport("data", dataTransport)

export async function downloadFile({
  messenger,
  type,
  fileId = "",
  remote_path,
  extension = "",
}: DownloadFileArgs): Promise<[string, string | undefined]> {
  const randomString = blalalavla.cupra(remote_path || fileId.toString())
  const randomStringName = blalalavla.cupra(
    (remote_path || fileId.toString()) + "1",
  )
  mkdirp.sync(`${cache_folder}/files/${randomString}`)
  const rem_path = `${state.config.generic.httpLocation}/${randomString}`
  const local_path = `${cache_folder}/files/${randomString}`

  let err: any, res: any
  let rem_fullname: string = ""
  let local_fullname: string | undefined = ""

  const transport = transports[type]
  if (!transport) {
    logger.log({
      level: "error",
      function: "downloadFile",
      message: `Unknown download transport type: ${type}`,
    })
    const fb = String(remote_path ?? fileId)
    return [fb, fb]
  }

  const phase = await transport({
    messenger,
    fileId,
    remote_path,
    extension: extension || "",
    randomString,
    randomStringName,
    local_path,
    rem_path,
  })
  err = phase.err
  rem_fullname = phase.rem_fullname
  local_fullname = phase.local_fullname

  if (err) {
    log("telegram")({ remote_path, error: err, type: "generic" })
    const fallback = String(remote_path ?? fileId)
    return [fallback, fallback]
  }
  if (local_fullname === undefined || local_fullname === "") {
    const fallback = String(remote_path ?? fileId)
    return [fallback, fallback]
  }
  const localPathResolved: string = local_fullname
  ;[err, res] = await to(
    new Promise((resolve: any) => {
      const new_name = `${local_path}/${randomStringName}${path.extname(
        localPathResolved,
      )}`

      fs.rename(localPathResolved, new_name, (err: any) => {
        if (err) {
          console.error({ remote_path, error: err, type: "renaming" })
          resolve(null)
        } else {
          rem_fullname = `${rem_path}/${path.basename(new_name)}`
          resolve([rem_fullname, new_name])
        }
      })
    }),
  )
  if (!err) [rem_fullname, local_fullname] = res

  const fileOnDisk: string = local_fullname ?? localPathResolved

  if (
    [".ogg", ".oga", ".opus", ".wav", ".m4a"].includes(path.extname(fileOnDisk))
  ) {
    const local_mp3_file = fileOnDisk + ".mp3"

    cp.spawnSync("ffmpeg", ["-i", fileOnDisk, local_mp3_file], {
      encoding: "utf8",
    })
    if (fs.existsSync(local_mp3_file))
      return [rem_fullname + ".mp3", local_mp3_file]
    return [rem_fullname, fileOnDisk]
  }

  if ([".webp", ".tiff"].includes(path.extname(fileOnDisk))) {
    const jpgname = `${fileOnDisk.split(".").slice(0, -1).join(".")}.jpg`
    ;[err, res] = await to(
      new Promise((resolve) => {
        sharp(fileOnDisk).toFile(jpgname, (err: any, _info: any) => {
          if (err) {
            console.error({
              type: "conversion",
              remote_path,
              error: err.toString(),
            })
            resolve([rem_fullname, fileOnDisk])
          } else {
            fs.unlink(fileOnDisk)
            resolve([
              `${rem_fullname.split(".").slice(0, -1).join(".")}.jpg`,
              jpgname,
            ])
          }
        })
      }),
    )

    if (!err) [rem_fullname, local_fullname] = res
  }

  return [rem_fullname, local_fullname]
}
