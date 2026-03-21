/**
 * Twemoji-aware fillText, adapted from node-canvas-with-twemoji (MIT).
 * Uses @napi-rs/canvas (Skia) instead of node-canvas; PNG assets for loadImage.
 */
import { loadImage } from "@napi-rs/canvas/node-canvas"
import type { SKRSContext2D } from "@napi-rs/canvas"
import { parse, type TwemojiEntity } from "twemoji-parser"

const defaultHeight = 16

function getFontSizeByCssFont(cssFont: string): number {
  if (typeof cssFont !== "string") {
    return defaultHeight
  }

  const sizeFamily = cssFont.match(/([0-9.]+)(px|pt|pc|in|cm|mm|%|em|ex|ch|rem|q)/)
  if (!sizeFamily || sizeFamily.length !== 3) {
    return defaultHeight
  }

  switch (sizeFamily[2]) {
    case "pt":
      return Number(sizeFamily[1]) / 0.75
    case "pc":
      return Number(sizeFamily[1]) * 16
    case "in":
      return Number(sizeFamily[1]) * 96
    case "cm":
      return Number(sizeFamily[1]) * (96.0 / 2.54)
    case "mm":
      return Number(sizeFamily[1]) * (96.0 / 25.4)
    case "%":
      return Number(sizeFamily[1]) * (defaultHeight / 100 / 0.75)
    case "em":
    case "rem":
      return Number(sizeFamily[1]) * (defaultHeight / 0.75)
    case "q":
      return Number(sizeFamily[1]) * (96 / 25.4 / 4)
    case "px":
    default:
      return Number(sizeFamily[1])
  }
}

function splitEntitiesFromText(text: string) {
  const twemojiEntities = parse(text, {
    assetType: "png",
    buildUrl: (codepoints, assetType) =>
      assetType === "png"
        ? `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${codepoints}.png`
        : `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${codepoints}.svg`,
  })

  let unparsedText = text
  let lastTwemojiIndice = 0
  const textEntities: (string | TwemojiEntity)[] = []

  twemojiEntities.forEach((twemoji: TwemojiEntity) => {
    textEntities.push(unparsedText.slice(0, twemoji.indices[0] - lastTwemojiIndice))

    if (twemoji.url) {
      textEntities.push(twemoji)
    }

    unparsedText = unparsedText.slice(twemoji.indices[1] - lastTwemojiIndice)
    lastTwemojiIndice = twemoji.indices[1]
  })

  textEntities.push(unparsedText)

  return textEntities
}

const cachedTwemojiImages = new Map<string, Awaited<ReturnType<typeof loadImage>>>()

async function loadTwemojiImageByUrl(url: string) {
  if (cachedTwemojiImages.has(url)) {
    return cachedTwemojiImages.get(url)!
  }
  const image = await loadImage(url)
  cachedTwemojiImages.set(url, image)
  return image
}

function measureTextWidth(
  context: SKRSContext2D,
  text: string,
  emojiSideMarginPercent = 0.1,
) {
  const textEntities = splitEntitiesFromText(text)
  const fontSize = getFontSizeByCssFont(context.font)

  const emojiSideMargin = fontSize * emojiSideMarginPercent

  let currentWidth = 0

  for (let i = 0; i < textEntities.length; i++) {
    const entity = textEntities[i]
    if (typeof entity === "string") {
      currentWidth += context.measureText(entity).width
    } else {
      currentWidth += fontSize + emojiSideMargin * 2
    }
  }

  const measured = context.measureText("")

  return {
    width: currentWidth,
    alphabeticBaseline: measured.alphabeticBaseline,
  }
}

async function drawTextWithTwemoji(
  context: SKRSContext2D,
  fillType: "fill" | "stroke",
  text: string,
  x: number,
  y: number,
  {
    maxWidth = Infinity,
    emojiSideMarginPercent = 0.1,
    emojiTopMarginPercent = 0.1,
  }: {
    maxWidth?: number
    emojiSideMarginPercent?: number
    emojiTopMarginPercent?: number
  } = {},
) {
  const textEntities = splitEntitiesFromText(text)
  const fontSize = getFontSizeByCssFont(context.font)
  const baseLine = context.measureText("").alphabeticBaseline
  const textAlign = context.textAlign
  const transform = context.getTransform()

  const emojiSideMargin = fontSize * emojiSideMarginPercent
  const emojiTopMargin = fontSize * emojiTopMarginPercent

  const textWidth = measureTextWidth(context, text, emojiSideMarginPercent).width

  let textLeftMargin = 0

  if (!["", "left", "start"].includes(textAlign)) {
    context.textAlign = "left"

    switch (textAlign) {
      case "center":
        textLeftMargin = -textWidth / 2
        break

      case "right":
      case "end":
        textLeftMargin = -textWidth
        break
    }
  }

  let drawX = x
  let drawY = y

  if (textWidth > maxWidth) {
    const scale = maxWidth / textWidth
    context.setTransform(scale, 0, 0, 1, 0, 0)
    drawX = x / scale
    drawY = y
  }

  let currentWidth = 0

  for (let i = 0; i < textEntities.length; i++) {
    const entity = textEntities[i]
    if (typeof entity === "string") {
      if (fillType === "fill") {
        context.fillText(entity, textLeftMargin + drawX + currentWidth, drawY)
      } else {
        context.strokeText(entity, textLeftMargin + drawX + currentWidth, drawY)
      }

      currentWidth += context.measureText(entity).width
    } else {
      const emoji = await loadTwemojiImageByUrl(entity.url)

      context.drawImage(
        emoji,
        textLeftMargin + drawX + currentWidth + emojiSideMargin,
        drawY + emojiTopMargin - fontSize - baseLine,
        fontSize,
        fontSize,
      )

      currentWidth += fontSize + emojiSideMargin * 2
    }
  }

  if (textAlign) {
    context.textAlign = textAlign as CanvasTextAlign
  }
  context.setTransform(transform)
}

export async function fillTextWithTwemoji(
  context: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  options?: {
    maxWidth?: number
    emojiSideMarginPercent?: number
    emojiTopMarginPercent?: number
  },
) {
  await drawTextWithTwemoji(context, "fill", text, x, y, options)
}
