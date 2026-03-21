import type http from "http"
import { log } from "../logger"
import { generic, pierObj, state } from "../state"
import type { IsendToArgs } from "../types"

export function registerWebwidgetPier(getHttpServer: () => http.Server) {
  pierObj.webwidget.common = {
    Start: async function () {
      return
    },
  }

  pierObj.webwidget.sendTo = async ({
    messenger,
    channelId,
    author,
    chunk,
    action,
    quotation,
    file,
    edited,
  }: IsendToArgs) => {
    const { config } = state
    await new Promise((resolve: any) => {
      const data = {
        channelId,
        author,
        chunk,
        action,
        quotation,
        file,
        edited,
      }
      generic[messenger].Lojban1ChatHistory.push(data)
      generic[messenger].Lojban1ChatHistory = generic[
        messenger
      ].Lojban1ChatHistory.slice(
        (config.piers[messenger].historyLength || 201) * -1,
      )
      generic[messenger].client.emit("sentFrom", {
        data,
      })
      log("webwidget")({ "sending message": data })
      resolve(null)
    })
  }

  pierObj.webwidget.convertFrom = async ({
    text,
    messenger: _messenger,
  }: {
    text: string
    messenger: string
  }) => text

  pierObj.webwidget.convertTo = async ({
    text,
    messenger: _messenger,
    messengerTo: _messengerTo,
  }: {
    text: string
    messenger: string
    messengerTo: string
  }) => text

  pierObj.webwidget.StartService = async ({
    messenger,
  }: {
    messenger: string
  }) => {
    generic[messenger] = {
      Lojban1ChatHistory: [],
      client: require("socket.io")(getHttpServer(), {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
          credentials: true,
        },
      }),
    }
    generic[messenger].client.sockets.on("connection", (socket: any) => {
      socket.emit("history", generic[messenger].Lojban1ChatHistory)
    })
  }

  pierObj.webwidget.common.GetChunks = async (
    text: string,
    _messenger: string,
  ) => {
    return [text]
  }
}
