import request from "request"
import to from "await-to-js"
import { hooks } from "../hooks"
import { log } from "../logger"
import { markedParse } from "../marked-parse"
import { escapeHTML } from "../../libs/formatting-converters/generic"
import { common, generic, pierObj, state } from "../state"
import type { IsendToArgs, Json } from "../types"

const html2md = require("../../libs/formatting-converters/html2md-ts")

export function registerMattermostPier() {
  pierObj.mattermost.common = {
    Start: async function ({ messenger }: { messenger: string }) {
      let [err, res]: [Error, any] = await to(
        new Promise((resolve) => {
          const credentials = {
            login_id: state.config.piers[messenger].login,
            password: state.config.piers[messenger].password,
          }
          const url = `${state.config.piers[messenger].ProviderUrl}/api/v4/users/login`
          request(
            {
              body: JSON.stringify(credentials),
              method: "POST",
              url,
            },
            (err: any, response: any, body: any) => {
              if (err) {
                console.error(err)
                resolve(null)
              } else {
                resolve({
                  token: response?.headers?.token || "",
                  id: JSON.parse(body).id,
                })
              }
            },
          )
        }),
      )
      if (err || !res) {
        state.config.MessengersAvailable[messenger] = false
        return
      } else {
        state.config.piers[messenger].token = res.token
        state.config.piers[messenger].user_id = res.id
      }

      ;[err, res] = await to(
        new Promise((resolve) => {
          const user_id = state.config.piers[messenger].user_id
          const url = `${state.config.piers[messenger].ProviderUrl}/api/v4/users/${user_id}/teams`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${state.config.piers[messenger].token}`,
              },
            },
            (error: any, _response: any, body: any) => {
              if (error) {
                console.error(error)
                resolve(null)
              } else {
                const team = JSON.parse(body).find((i: any) => {
                  return (
                    i.display_name === state.config.piers[messenger].team ||
                    i.name === state.config.piers[messenger].team
                  )
                })
                state.config.piers[messenger].team_id = team.id
                resolve(team)
              }
            },
          )
        }),
      )
      if (!res) {
        state.config.MessengersAvailable[messenger] = false
        return
      }

      const ReconnectingWebSocket = require("reconnecting-websocket")
      return new ReconnectingWebSocket(
        state.config.piers[messenger].APIUrl,
        [],
        {
          WebSocket: require("ws"),
        },
      )
    },
  }

  pierObj.mattermost.sendTo = async ({
    messenger,
    channelId,
    author: _author,
    chunk,
    action: _action,
    quotation: _quotation,
    file: _file,
    edited: _edited,
  }: IsendToArgs) => {
    await new Promise((resolve: any) => {
      const option = {
        url: state.config.piers[messenger].HookUrl,
        json: {
          text: chunk,
          // username: author,
          channel: channelId,
        },
      }
      request.post(option, (_error: any, _response: any, _body: any) => {
        resolve(null)
      })
    })
  }

  pierObj.mattermost.receivedFrom = async (messenger: string, message: any) => {
    const sendFrom = hooks.sendFrom!
    // log("mattermost")(message);
    // if (process.env.log)
    //   logger.log({
    //     level: "info",
    //     message: JSON.stringify(message)
    //   });
    if (!state.config.channelMapping[messenger]) return
    let channelId, msgText, author, file_ids, postParsed
    if (message.event === "post_edited") {
      const post = JSON.parse(message.data?.post || "")

      if (!post.id) return
      message.event = "posted"
      message.edited = true
      let err: any
      ;[err] = await to(
        new Promise((resolve) => {
          const url = `${state.config.piers[messenger].ProviderUrl}/api/v4/posts/${post.id}`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${state.config.piers[messenger].token}`,
              },
            },
            (error: any, _response: any, body: any) => {
              if (error) {
                console.error(error.toString())
              } else {
                msgText = JSON.parse(body).message
                file_ids = JSON.parse(body).file_ids
              }
              resolve(null)
            },
          )
        }),
      )
      if (err) console.error(err.toString())
      ;[err] = await to(
        new Promise((resolve) => {
          const url = `${state.config.piers[messenger].ProviderUrl}/api/v4/users/${post.user_id}`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${state.config.piers[messenger].token}`,
              },
            },
            (error: any, _response: any, body: any) => {
              if (error) {
                console.error(error.toString())
              } else {
                body = JSON.parse(body)
                author = body.username || body.nickname || body.first_name || ""
              }
              resolve(null)
            },
          )
        }),
      )
      if (err) console.error(err.toString())
      ;[err] = await to(
        new Promise((resolve) => {
          const url = `${state.config.piers[messenger].ProviderUrl}/api/v4/channels/${post.channel_id}`
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${state.config.piers[messenger].token}`,
              },
            },
            (error: any, _response: any, body: any) => {
              if (error) {
                console.error(error.toString())
              } else {
                channelId = JSON.parse(body).name
              }
              resolve(null)
            },
          )
        }),
      )
      if (err) console.error(err.toString())
    } else {
      message.edited = false
      if (message.data?.team_id !== state.config.piers[messenger].team_id)
        return
      if (message.event !== "posted") return
      const post = message.data?.post
      if (!post) return
      postParsed = JSON.parse(post)
      channelId = message.data?.channel_name
    }
    if (
      state.config.channelMapping[messenger][channelId] &&
      !postParsed?.props?.from_webhook &&
      (postParsed?.type || "") === ""
    ) {
      if (!file_ids) file_ids = postParsed?.file_ids || []
      const files: any[] = []
      for (const file of file_ids) {
        const [err, promfile] = await to(
          new Promise((resolve) => {
            const url = `${state.config.piers[messenger].ProviderUrl}/api/v4/files/${file}/link`
            request(
              {
                method: "GET",
                url,
                headers: {
                  Authorization: `Bearer ${state.config.piers[messenger].token}`,
                },
              },
              (error: any, _response: any, body: any) => {
                if (error) {
                  console.error(error.toString())
                  resolve(null)
                } else {
                  resolve(JSON.parse(body).link)
                }
              },
            )
          }),
        )
        if (err) console.error(err.toString())
        const [err2, promfile2] = await to(
          new Promise((resolve) => {
            const url = `${state.config.piers[messenger].ProviderUrl}/api/v4/files/${file}/info`
            request(
              {
                method: "GET",
                url,
                headers: {
                  Authorization: `Bearer ${state.config.piers[messenger].token}`,
                },
              },
              (error: any, _response: any, body: any) => {
                if (error) {
                  console.error(error.toString())
                  resolve(null)
                } else {
                  resolve(JSON.parse(body).extension)
                }
              },
            )
          }),
        )
        if (err2) console.error(err?.toString())
        if (promfile && promfile2) files.push([promfile2, promfile])
      }
      author = author || message.data?.sender_name
      author = author.replace(/^@/, "")
      if (files.length > 0) {
        for (const [extension, file] of files) {
          const [file_, localfile]: [string, string] =
            await common.downloadFile({
              messenger,
              type: "simple",
              remote_path: file,
              extension,
            })
          sendFrom({
            messenger,
            channelId,
            author,
            text: file_,
            file: localfile,
            remote_file: file_,
            edited: message.edited,
          })
        }
      }
      let action
      //todo; handle mattermost actions
      sendFrom({
        messenger,
        channelId,
        author,
        text: msgText || postParsed?.message,
        action,
        edited: message.edited,
      })
    }
  }

  pierObj.mattermost.convertFrom = async ({
    text,
    messenger: _messenger,
  }: {
    text: string
    messenger: string
  }) =>
    markedParse({
      text: escapeHTML(text),
      messenger: "mattermost",
      unescapeCodeBlocks: true,
    })

  pierObj.mattermost.convertTo = async ({
    text,
    messenger,
    messengerTo,
  }: {
    text: string
    messenger: string
    messengerTo: string
  }) => {
    const result = await common.unescapeHTML({
      text: html2md.convert({
        string: text,
        hrefConvert: false,
        dialect: messengerTo,
      }),
      convertHtmlEntities: true,
    })
    log(messenger)({ messengerTo, "converting text": text, result })
    return result
  }

  pierObj.mattermost.getChannels = async (pier: string): Promise<void> => {
    let json: Json = {}
    let url: string = `${state.config.piers[pier].ProviderUrl}/api/v4/teams/${state.config.piers[pier].team_id}/channels`
    json = await pierObj.mattermost.common.GetChannelsMattermostCore(
      pier,
      json,
      url,
    )
    url = `${state.config.piers[pier].ProviderUrl}/api/v4/users/${state.config.piers[pier].user_id}/teams/${state.config.piers[pier].team_id}/channels`
    json = await pierObj.mattermost.common.GetChannelsMattermostCore(
      pier,
      json,
      url,
    )
    state.config.cache[pier] = json
  }

  pierObj.mattermost.common.GetChannelsMattermostCore = async (
    messenger: string,
    json: Json,
    url: string,
  ) => {
    await to(
      new Promise((resolve) => {
        request(
          {
            method: "GET",
            url,
            headers: {
              Authorization: `Bearer ${state.config.piers[messenger].token}`,
            },
          },
          (error: any, _response: any, body: any) => {
            if (error) {
              console.error(error.toString())
            } else {
              body = JSON.parse(body)
              if (body[0]) {
                body.map((i: any) => {
                  json[i.name] = i.name
                })
              }
            }
            resolve(null)
          },
        )
      }),
    )
    return json
  }

  pierObj.mattermost.StartService = async ({
    messenger,
  }: {
    messenger: string
  }) => {
    //mattermost
    generic[messenger].client = await pierObj.mattermost.common.Start({
      messenger,
    })
    if (!state.config.MessengersAvailable[messenger]) return
    generic[messenger].client.addEventListener("open", () => {
      generic[messenger].client.send(
        JSON.stringify({
          seq: 1,
          action: "authentication_challenge",
          data: {
            token: state.config.piers[messenger].token,
          },
        }),
      )
    })
    generic[messenger].client.addEventListener("message", (message: any) => {
      if (!message?.data || !state.config.piers[messenger].team_id) return
      message = JSON.parse(message.data)
      pierObj.mattermost.receivedFrom(messenger, message)
    })
    generic[messenger].client.addEventListener("close", () =>
      generic[messenger].client._connect(),
    )
    generic[messenger].client.addEventListener("error", () =>
      generic[messenger].client._connect(),
    )
  }
}
