import { Lexer, Renderer, marked } from "marked"
import { log } from "./logger"
import { common } from "./state"

// Disable list / listitem tokenization (marked API expects RegExp-like rules)
;(Lexer.rules as { list: unknown; listitem: unknown }).list = {
  exec: () => null,
}
;(Lexer.rules as { list: unknown; listitem: unknown }).listitem = {
  exec: () => null,
}
const markedRenderer = new Renderer()

export function markedParse({
  text,
  messenger,
  dontEscapeBackslash,
  unescapeCodeBlocks,
}: {
  text: string
  messenger: string
  dontEscapeBackslash?: boolean
  unescapeCodeBlocks?: boolean
}) {
  if (!dontEscapeBackslash) text = text.replace(/\\/gim, "\\\\")
  markedRenderer.codespan = (text: string) => {
    if (!dontEscapeBackslash) text = text.replace(/\\\\/gim, "&#92;")
    if (unescapeCodeBlocks)
      text = common.unescapeHTML({
        text,
        convertHtmlEntities: true,
      })
    return `<code>${text}</code>`
  }
  markedRenderer.code = (text: string) => {
    if (!dontEscapeBackslash) text = text.replace(/\\\\/gim, "&#92;")
    if (unescapeCodeBlocks)
      text = common.unescapeHTML({
        text,
        convertHtmlEntities: true,
      })
    return `<pre><code>${text}</code></pre>\n`
  }
  const result = marked.parser(Lexer.lex(text), {
    gfm: true,
    renderer: markedRenderer,
  })
  log(messenger)({ "converting source text": text, result })
  return result
}
