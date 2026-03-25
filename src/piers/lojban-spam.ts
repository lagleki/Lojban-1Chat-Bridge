import * as lojban from "lojban"

export async function xovahelojbo({ text }: { text: string }) {
  const arrText = text.split(" ")
  let snada = 0
  for (const word of arrText) {
    const r = await lojban.ilmentufa_off("lo'u " + word + " le'u")
    if (r.tcini === "snada") snada++
  }
  return snada / arrText.length
}
