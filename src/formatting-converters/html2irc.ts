import {decode} from 'html-entities';
interface Json {
  [index: string]: string;
}

module.exports = function ircify(html: string) {
  const htmlparser = require("htmlparser")

  const globalC = "\x03";

  const globalStyles: Json = {
    underline: "\x1F",
    bold: "\x02",
    italic: "\x1D",
  };
  const globalColors: Json = {
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
    silver: "15",
  };
  function walk(dom: any, ignoreCode = false) {
    let out = "";
    if (dom)
      dom.forEach((el: any) => {
        if ("text" === el.type) out += el.data;
        if ("tag" === el.type)
          switch (el.name) {
            case "a":
              if (el.attribs?.href) {
                const children = walk(el.children);
                if (el.attribs.href !== children) {
                  out += `<${el.attribs.href} ${walk(el.children)}>`;
                } else {
                  out += `${el.attribs.href}`;
                }
              }
              break;
            case "br":
              out += `\n`;
              break;
            case "blockquote":
              out += `\n${walk(el.children)
                .split(/\n/)
                .map((string) => `> ${string}`)
                .join("\n")}\n`;
              break;
            case "u":
              out += `${globalStyles.underline}${walk(el.children)}${
                globalStyles.underline
              }`;
              break;
            case "p":
              out += `\n${walk(el.children)}`;
              break;
            case "strong":
            case "b":
              out += `${globalStyles.bold}${walk(el.children)}${
                globalStyles.bold
              }`;
              break;
            case "del":
              out += `${walk(el.children)
                .split("")
                .map((char) => char + "\u0336")
                .join("")}`;
              break;
            case "pre":
              out += `\n\`\`\`\n${walk(el.children, true)}\n\`\`\`\n`;
              break;
            case "code":
              if (!ignoreCode) {
                out += `\`${walk(el.children)}\``;
              } else out += walk(el.children);
              break;
            case "i":
            case "em":
              out +=
                globalC +
                "01," +
                globalColors.yellow +
                walk(el.children) +
                globalC;
              break;
            default:
              out += walk(el.children);
          }
      });
    return out;
  }
  const handler = new htmlparser.DefaultHandler((error: any, dom: any) => {
    // error ignored
  });
  const parser = new htmlparser.Parser(handler);
  parser.parseComplete(html);
  const dom = handler.dom;
  if (dom)
    return decode(
      walk(dom)
        .replace(/&lt;/g, "&amp;lt;")
        .replace(/&gt;/g, "&amp;gt;")
    );
  else return "";
};
