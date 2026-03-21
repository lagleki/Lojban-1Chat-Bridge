const lojban = require("lojban")

export function xovahelojbo({ text }: { text: string }) {
  const arrText = text.split(" ")
  const xovahe =
    arrText.filter(
      (i: any) => lojban.ilmentufa_off("lo'u " + i + " le'u").tcini === "snada",
    ).length / arrText.length
  return xovahe
}
