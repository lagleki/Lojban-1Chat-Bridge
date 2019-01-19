const globalColors = {
  white: "00",
  black: "01",
  navy: "02",
  green: "03",
  red: "04",
  brown: "05",
  violet: "06",
  olive: "07",
  yellow: "08",
  lime: "09",
  teal: "10",
  cyan: "11",
  blue: "12",
  pink: "13",
  gray: "14",
  silver: "15"
};

interface Json {
  [index: string]: string;
}


const globalStyles: Json = {
  normal: "\x0F",
  underline: "\x1F",
  bold: "\x02",
  italic: "\x1D"
};

const styleChars: any = {};
Object.keys(globalStyles).forEach(key => {
  styleChars[globalStyles[key]] = true;
});


const globalRichMood = [
  ["bold", ["red", "red", "yellow"]],
  ["bold", ["blue", "green", "black"]],
  ["bold", ["navy", "green", "green"]],
  ["bold", ["teal", "navy"]],
  ["bold", ["red", "brown", "brown", "brown"]],
  ["bold", ["yellow", "yellow", "red"]],
  ["bold", ["blue", "blue", "teal"]],
  ["bold", ["olive", "olive", "white"]],
  ["bold", ["olive", "yellow", "white"]],
  ["bold", ["lightgreen", "lightgreen", "white"]],
  ["bold", ["lightgreen", "lightgreen", "olive"]],
  ["bold", ["white", "lightgreen", "white"]],
  ["bold", ["yellow", "white"]],
  ["bold", ["teal", "teal", "green"]],
  ["bold", ["violet", "violet", "violet", "red"]],
  ["normal", ["blue"]],
  ["normal", ["silver"]],
  ["normal", ["navy"]],
  ["normal", ["green"]],
  ["normal", ["red"]],
  ["normal", ["brown"]],
  ["normal", ["olive"]],
  ["normal", ["lime"]],
  ["normal", ["teal"]],
  ["normal", ["cyan"]],
  ["normal", ["blue"]],
  ["bold", ["italic"]],
  ["normal", ["violet"]]
];
const globalSimpleMood = [
  ["normal", ["silver"]],
  ["normal", ["navy"]],
  ["normal", ["green"]],
  ["normal", ["red"]],
  ["normal", ["brown"]],
  ["normal", ["purple"]],
  ["normal", ["olive"]],
  ["normal", ["lime"]],
  ["normal", ["teal"]],
  ["normal", ["cyan"]],
  ["normal", ["blue"]],
  ["normal", ["pink"]],
  ["bold", ["italic"]]
];

// Coloring character.
const globalC = "\x03";
const globalZero = globalStyles.bold + globalStyles.bold;
const globalBadStr = /^,\d/;
const globalColorCodeStr = new RegExp(`^${globalC}\\d\\d`);

function ColorifyText({ side, text, color }: { side: string, text: string, color: string }) {
  if (side === "fg") {
    return (
      globalC +
      color +
      (globalBadStr.test(text) ? globalZero : "") +
      text +
      globalC
    );
  } else if (side === "bg") {
    if (globalColorCodeStr.test(text)) {
      let str2 = text.substr(3);
      return (
        text.substr(0, 3) +
        "," +
        color +
        (str2.indexOf(globalZero) === 0 ? str2.substr(globalZero.length) : str2)
      );
    } else {
      return globalC + "01," + color + text + globalC;
    }
  } else if (side === "style") {
    let code = globalStyles[color];
    return code + text + code;
  }
}

function MoodifyText({ text, colors, mood }: {text: string, colors: any, mood: string}) {
  if (mood === "none") return text;
  if (mood === "mood") {
    colors = globalRichMood;
  } else {
    colors = colors || globalSimpleMood;
  }

  let hash = 0;
  const prettyStr = text
    .toLowerCase()
    .replace(/(\[.*)|[.,\/#!$%^&*;:{}=\-_`~()[\]]/g, "");
  for (let i = 0; i < prettyStr.length; ++i) {
    // mult by 32
    hash = (hash << 5) - hash + prettyStr.charCodeAt(i);
    hash |= 0; // number conversion
  }

  hash = Math.abs(hash % colors.length);

  const chosenBg = colors[hash][0];
  const chosenFg = colors[hash][1];
  let l = chosenFg.length;
  let i = 0;

  return prettyStr
    .split("")
    .map((c: string) => {
      if (c === " ") return c;
      const bg_text = ColorifyText({ side: "bg", text: c, color: chosenBg });
      return ColorifyText({
        side: "bg",
        text: bg_text,
        color: chosenFg[i++ % l]
      });
    })
    .join("");
}

function stripColors(str: string) {
  return str.replace(/\x03\d{0,2}(,\d{0,2}|\x02\x02)?/g, "");
}

function stripColorsAndStyle(str: string) {
  return stripColors(stripStyle(str));
}

function stripStyle(str: string) {
  let path = [];
  for (let i = 0, len = str.length; i < len; i++) {
    let char: string = str[i];
    if (styleChars[char] || char === globalC) {
      let lastChar = path[path.length - 1];
      if (lastChar && lastChar[0] === char) {
        let p0: number = parseInt(lastChar[1].toString());
        // Don't strip out styles with no characters inbetween.
        // And don't strip out color codes.
        if (i - p0 > 1 && char !== globalC) {
          str = str.slice(0, p0) + str.slice(p0 + 1, i) + str.slice(i + 1);
          i -= 2;
        }
        path.pop();
      } else {
        path.push([str[i], i]);
      }
    }
  }

  // Remove any unmatching style characterss.
  // Traverse list backwards to make removing less complicated.
  for (let char of path.reverse()) {
    if (char[0] !== globalC) {
      let pos: number = parseInt(char[1].toString());
      str = str.slice(0, pos) + str.slice(pos + 1);
    }
  }
  return str;
}

module.exports = { ColorifyText, MoodifyText, stripColorsAndStyle };
