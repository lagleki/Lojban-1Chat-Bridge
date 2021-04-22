const lojban = require("lojban");
const split = require('emoji-aware').split;
module.exports = {
    modzi: function (name) {
        let parsed = lojban.romoi_lahi_cmaxes(name);
        if (parsed.tcini !== "snada")
            return { output: name, snada: false };
        parsed = parsed["te spuda"]
            .filter((i) => i[0] !== "drata" && !["la", "la'i", "lahi"].includes(i[1]))
            .map((i) => {
            if (i[0] == "cmevla") {
                i[1] = i[1] + "yco'e";
                i[1] = lojban
                    .zeizei(i[1])
                    .replace(/ zei co'e$/, "")
                    .split(" zei ")
                    .join(" ");
            }
            else if (i[0] == "lujvo") {
                i[1] = i[1].split("-").map((u) => {
                    if (!/[aeiouy]/.test(u.slice(-1)))
                        u = u + "y";
                    return u;
                }).join("");
                i[1] = lojban.zeizei(i[1].replace(/-/g, '')).split(" zei ").join(" ");
            }
            return i[1];
        })
            .join(" ");
        parsed = lojban.modzi(parsed).replace(/[a-zA-Z0-9-\.,]/g, "");
        if (parsed.length === 0)
            return { output: name, snada: false };
        return { output: split(parsed)[0], snada: true };
    },
};
