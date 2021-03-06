const globalColors: any = {
  white: "00",
  black: "01",
  navy: "02",
  green: "03",
  red: "04",
  brown: "05",
  violet: "06",
  purple: "06",
  olive: "07",
  yellow: "08",
  lime: "09",
  lightgreen: "09",
  teal: "10",
  cyan: "11",
  blue: "12",
  pink: "13",
  lightpurple: "13",
  gray: "14",
  grey: "14",
  silver: "15"
};

const globalStyles: any = {
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
  // ["bold", ["yellow","yellow","white","white"]],

  ["black", ["silver","silver","white","white"]],
  ["white", ["navy","navy","green","green"]],
  ["black", ["lime","yellow","white","white"]],
  ["red", ["green","green"]],
  ["black", ["red","red","white","white"]],
  ["white", ["brown","brown","black","black"]],
  ["black", ["purple","purple","white","white"]],
  ["black", ["olive","olive","white","white"]],
  ["black", ["lime","lime","white","white"]],
  ["black", ["teal","teal","white","white"]],
  ["black", ["cyan","cyan","white","white"]],
  ["black", ["pink","pink","white","white"]],
  ["black", ["yellow","yellow","white","white"]],
  ["black", ["violet","violet","white","white"]],
  
  // ["bold", ["red","red","brown","brown"]],
  // ["bold", ["navy","navy","yellow","yellow"]],
  // ["bold", ["lime","lime","silver","silver"]],
  // ["bold", ["violet","violet","silver","silver"]],

  // ["bold", ["red","red","red","brown","brown","brown"]],
  // ["bold", ["white","white","white","brown","pink","pink"]],
  // ["bold", ["lime","lime","lime","silver","silver","silver"]],
  // ["bold", ["violet","violet","violet","silver","silver","silver"]],

  ["black", ["white"]],
  ["white", ["black"]],
  ["white", ["navy"]],
  ["white", ["green"]],
  ["white", ["red"]],
  ["white", ["brown"]],
  ["white", ["purple"]],
  ["white", ["olive"]],
  ["black", ["lime"]],
  ["white", ["teal"]],
  ["white", ["cyan"]],
  ["white", ["blue"]],
  ["black", ["pink"]],
  ["white", ["violet"]]
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
  ["bold", ["violet"]]
];

// Coloring character.
const globalC = "\x03";
const globalZero = globalStyles.bold + globalStyles.bold;
const globalBadStr = /^,\d/;
const globalColorCodeStr = new RegExp(`^${globalC}\\d\\d`);

function ColorifyText({
  side = "fg",
  text,
  color
}: {
  side: string;
  text: string;
  color: string;
}) {
  const code = globalColors[color] || globalStyles[color];
  if (!code || !color) return text;
  if (globalStyles[color]) {
    return code + text + code;
  } else if (side === "fg") {
    return (
      globalC +
      code +
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
        code +
        (str2.indexOf(globalZero) === 0 ? str2.substr(globalZero.length) : str2)
      );
    } else {
      return globalC + "01," + code + text + globalC;
    }
  }
}

function MoodifyText({
  text,
  colors,
  mood
}: {
  text: string;
  colors: any;
  mood: string;
}) {
  if (mood === "none") return text;
  if (mood === "mood") {
    colors = globalSimpleMood;
  } else {
    colors = colors || globalSimpleMood;
  }

  let hash = 0;
  const prettyStr = text
    // .toLowerCase()
    // .replace(/(\[.*)|[.,\/#!$%^&*;:{}=\-_`~()[\]]/g, "");
  for (let i = 0; i < prettyStr.length; ++i) {
    // mult by 32
    hash = (hash << 5) - hash + prettyStr.charCodeAt(i);
    hash |= 0; // number conversion
  }

  hash = Math.abs(hash % colors.length);
  const chosenBg = colors[hash][0];
  const chosenFg = colors[hash][1];
  let l = chosenBg.length;
  let i = 0;
  return prettyStr
    .split("")
    .map((c: string) => {
      if (c === " ") return c;
      const bg_text = ColorifyText({
        side: "fg",
        text: c,
        color: chosenFg[i++ % l]
      });
      const a: string = ColorifyText({
        text: bg_text,
        side: "bg",
        color: chosenBg
      });
      return a;
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
