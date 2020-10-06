const lojban = require("lojban")

module.exports = {
  modzi: function (name: string) {
    let parsed = lojban.romoi_lahi_cmaxes(name)
    if (parsed.tcini !== "snada") return { output: name, snada: false }
    parsed = parsed["te spuda"]
      .filter((i) => i[0] !== "drata" && !["la", "la'i", "lahi"].includes(i[1]))
      .map((i) => {
        if (i[0] == "cmevla") {
          i[1] = i[1] + "yco'e"
          console.log(i[1])
          i[1] = lojban
            .zeizei(i[1])
            .replace(/ zei co'e$/, "")
            .split(" zei ")
            .join(" ")
        } else if (i[0] == "lujvo") {
          i[1] = lojban.zeizei(i[1]).split(" zei ").join(" ")
        }
        return i[1]
      })
      .join(" ")
    parsed = lojban.modzi(parsed).replace(/[a-zA-Z0-9-\.,]/g, "")
    if (parsed.length === 0) return { output: name, snada: false }
    return { output: parsed[0], snada: true }
  },
}
