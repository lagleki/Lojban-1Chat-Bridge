import { log } from "./logger"
import { common } from "./state"

const marked = require("marked")
const lexer = marked.Lexer
lexer.rules.list = { exec: () => {} }
lexer.rules.listitem = { exec: () => {} }
const markedRenderer = new marked.Renderer()

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
  const result = marked.parser(lexer.lex(text), {
    gfm: true,
    renderer: markedRenderer,
  })
  log(messenger)({ "converting source text": text, result })
  return result
}
