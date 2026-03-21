import createDOMPurify from "dompurify"
import { Window } from "happy-dom"
import { log } from "./logger"
import { common } from "./state"

// happy-dom avoids jsdom loading the native `canvas` addon (often absent if pnpm skipped canvas install scripts).
const window = new Window()
const DOMPurify = createDOMPurify(window as any)

const diffTwo = (diffMe: string, diffBy: string) => {
  diffMe = diffMe
    .replace(/[\n\r]/g, "")
    .replace(/<br \/>/gim, "<br>")
    .replace(/<a_href=/g, "<a href=")
    .replace(/<span_class=/g, "<span class=")
  diffBy = diffBy
    .replace(/[\n\r]/g, "")
    .replace(/<br \/>/gim, "<br>")
    .replace(/<a_href=/g, "<a href=")
    .replace(/<span_class=/g, "<span class=")
  return diffMe.split(diffBy).join("")
}

export function HTMLSplitter(text: string, limit = 400) {
  log("generic")({ message: "html splitter: pre", text })

  const r = new RegExp(`(?<=.{${limit / 2},})[^<>](?![^<>]*>)`, "g")
  text = common.sanitizeHtml(
    text.replace(
      /<blockquote>([\s\S]*?)(<br>)*<\/blockquote>/gim,
      "<blockquote>$1</blockquote>",
    ),
  )
  text = text
    .replace(/<a href=/g, "<a_href=")
    .replace(/<span class=/g, "<span_class=")
  let thisChunk
  let stop = false
  let Chunks: string[] = []
  while (text !== "") {
    if (text.length >= limit) {
      thisChunk = text.substring(0, limit)
      text = text.substring(limit)
      let lastSpace = thisChunk.lastIndexOf(" ")
      if (lastSpace <= limit / 2) {
        lastSpace = thisChunk.search(r)
      }
      if (lastSpace === -1) {
        thisChunk = common.sanitizeHtml(thisChunk, [])
      } else {
        text = thisChunk.substring(lastSpace) + text
        thisChunk = thisChunk.substring(0, lastSpace)
      }
    } else {
      thisChunk = text
      stop = true
    }
    const thisChunkUntruncated: string = DOMPurify.sanitize(
      thisChunk
        .replace(/<a_href=/g, "<a href=")
        .replace(/<span_class=/g, "<span class="),
    )
      .replace(/<a href=/g, "<a_href=")
      .replace(/<span class=/g, "<span_class=")
    Chunks.push(thisChunkUntruncated)
    if (stop) break
    let diff = diffTwo(thisChunkUntruncated, thisChunk)
    if (diff !== "") {
      diff = diff
        .split(/(?=<)/)
        .reverse()
        .map((i) => i.replace("/", ""))
        .join("")
      text = DOMPurify.sanitize(diff + text)
    }
  }
  Chunks = Chunks.map((chunk) =>
    chunk
      .replace(/<a_href=/g, "<a href=")
      .replace(/<span_class=/g, "<span class="),
  )
  log("generic")({ message: "html splitter: after", Chunks })

  return Chunks
}
