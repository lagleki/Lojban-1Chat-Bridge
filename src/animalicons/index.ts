import fs from "fs"
import path from "path"
import { getHash, getMinimumColorVariance } from "./utils"
const getMCV = getMinimumColorVariance
import { createCanvas, Image, registerFont } from "canvas"
import { fillTextWithTwemoji } from "node-canvas-with-twemoji"

registerFont(path.resolve(__dirname, "fonts/NotoSans-Regular.ttf"), {
  family: "Noto",
})
registerFont(path.resolve(__dirname, "fonts/NotoColorEmoji.ttf"), {
  family: "Emoji",
})

import colors from "./colors.json"
const defaultTheme: { colors: string[]; emojis: string[] } = {
  colors,
  emojis: [],
}

const folder = "./svg/"
fs.readdirSync(path.join(__dirname, folder)).forEach((file) => {
  defaultTheme.emojis.push(path.join(__dirname, folder, file))
})

class Avatar {
  size: number
  seed: any
  theme: {
    colors: string[]
    emojis: string[]
    layouts: number[]
    minimumColorVariance: number
  }
  modzi: any
  canvas: any
  constructor(seed: any, size = 128, modzi: any) {
    this.size = size
    this.seed = seed
    this.theme = {
      layouts: [...Array(10).keys()],
      minimumColorVariance: 0,
      ...defaultTheme,
    }
    this.modzi = modzi

    this.canvas = createCanvas(size, size)
  }

  async drawBackground(ctx: { fillStyle: string; fillRect: (arg0: number, arg1: number, arg2: number, arg3: number) => void }, hash: string) {
    const { size } = this
    const { colors, layouts, minimumColorVariance } = this.theme
    const layout = layouts[parseInt(hash.substring(0, 2), 16) % layouts.length]

    const color: string[] = []
    for (let i = 0; i < 4; i++) {
      const key =
        parseInt(hash.substring(18 - i * 2, 20 - i * 2), 16) % colors.length
      color[i] = colors[key]

      if (color.length > 1) {
        let offset = 0
        while (
          offset < colors.length &&
          getMCV(color[i], color.slice(0, i)) <= minimumColorVariance
        ) {
          color[i] = colors[(key + offset + 1) % colors.length]
          offset++
        }
      }
    }

    switch (layout) {
      case 9:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(size / 4, 0, (size * 3) / 4, size)

        ctx.fillStyle = color[2]
        ctx.fillRect(size / 2, 0, size / 2, size)

        ctx.fillStyle = color[3]
        ctx.fillRect((size * 3) / 4, 0, size / 4, size)
        break

      case 8:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(0, size / 4, size, (size * 3) / 4)

        ctx.fillStyle = color[2]
        ctx.fillRect(0, size / 2, size, size / 2)

        ctx.fillStyle = color[3]
        ctx.fillRect(0, (size * 3) / 4, size, size / 4)
        break

      case 7:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(0, size / 3, (size * 2) / 3, (size * 2) / 3)
        ctx.fillRect(size / 3, 0, (size * 2) / 3, (size * 2) / 3)

        ctx.fillStyle = color[2]
        ctx.fillRect(0, (size * 2) / 3, size / 3, size / 3)
        ctx.fillRect(size / 3, size / 3, size / 3, size / 3)
        ctx.fillRect((size * 2) / 3, 0, size / 3, size / 3)
        break

      case 6:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(0, 0, (size * 2) / 3, (size * 2) / 3)
        ctx.fillRect(size / 3, size / 3, (size * 2) / 3, (size * 2) / 3)

        ctx.fillStyle = color[2]
        ctx.fillRect(0, 0, size / 3, size / 3)
        ctx.fillRect(size / 3, size / 3, size / 3, size / 3)
        ctx.fillRect((size * 2) / 3, (size * 2) / 3, size / 3, size / 3)
        break

      case 5:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(size / 3, 0, (size * 2) / 3, size)

        ctx.fillStyle = color[2]
        ctx.fillRect((size * 2) / 3, 0, size / 3, size)
        break

      case 4:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(0, size / 3, size, (size * 2) / 3)

        ctx.fillStyle = color[2]
        ctx.fillRect(0, (size * 2) / 3, size, size / 3)
        break

      case 3:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(0, size / 2, size / 2, size / 2)
        ctx.fillRect(size / 2, 0, size / 2, size / 2)
        break

      case 2:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(0, size / 2, size, size / 2)
        break

      case 1:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = color[1]
        ctx.fillRect(size / 2, 0, size / 2, size)
        break

      default:
        ctx.fillStyle = color[0]
        ctx.fillRect(0, 0, size, size)
        break
    }
  }

  async drawEmoji({ ctx, hash }: { ctx: any; hash: string }) {
    const { size } = this
    const { emojis } = this.theme
    if (this.modzi) {
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.font = size / 2 + 'px "Emoji"'
      ctx.fillStyle = "black"
      try {
        await fillTextWithTwemoji(ctx, this.modzi, size / 2, size / 2)
        return null
      } catch (error) {
        this.modzi = null
      }
    }

    if (!this.modzi) {
      return new Promise((resolve) => {
        ctx.shadowColor = "rgba(0, 0, 0, 0.25)"
        ctx.shadowBlur = size / 8
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        const emoji = emojis[parseInt(hash.substring(2, 5), 16) % emojis.length]
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(
            img,
            (size * 3) / 16,
            (size * 3) / 16,
            (size * 5) / 8,
            (size * 5) / 8
          )
          resolve(null)
        }
        img.onerror = (err) => {
          console.log`${err}`
          resolve(null)
        }
        img.src = emoji
      })
    }
  }

  async draw() {
    try {
      const hash = await getHash(this.seed)
      const ctx = this.canvas.getContext("2d")
      const { colors, emojis } = this.theme
      if (colors.length) {
        await this.drawBackground(ctx, hash)
      }
      if (emojis.length) {
        await this.drawEmoji({ ctx, hash })
      }
    } catch (err) {
      console.log(err)
    }
  }

  async toDataURL(type: any, encoderOptions: any) {
    return this.canvas.toDataURL(type, encoderOptions)
  }
}

export default Avatar
