/**
 * html-to-markdown
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
 */
const formatters = require("./html2md-formatters-ts");
const extrasRegex = /<\/?(?:div|address|section|article|span)>/gim;
/**
 * @description replacing unncessary html tags
 * @method replaceExtras
 * @param  {String}      doc
 * @return {String}
 */
function replaceExtras(doc: string) {
  const matches = [];
  let newDoc = doc;
  newDoc = newDoc.replace(extrasRegex, "");
  return newDoc;
}

const replacements = [
  [/\\/g, "\\"]
  // [/\*/g, "\*"],
  // [/#/g, "\#"],
  // // [/\//g, "\\/"],
  // [/\(/g, "\("],
  // [/\)/g, "\)"],
  // [/\[/g, "\["],
  // [/\]/g, "\]"],
  // // [/\</g, "&lt;"],
  // // [/\>/g, "&gt;"],
  // [/_/g, "\_"]
];

module.exports = {
  /**
   * @description converts given html to a markdown
   * document
   * @method convert
   * @param  {String} html
   * @return {String}
   */
  convert({string, hrefConvert}: {string: string,hrefConvert: boolean}) {
    /**
     * replacing unncessary html tags
     * @type {String}
     */
    let html = replaceExtras(
      replacements.reduce((string: string, replacement: string[]) => {
        return string.replace(replacement[0], replacement[1]);
      }, string)
    );
    /**
     * looping through registered formatters
     */
    for (
      let _i = 0, formatters_1 = formatters;
      _i < formatters_1.length;
      _i++
    ) {
      const formatter: any = formatters_1[_i];
      if (typeof formatter === "function") html = formatter(html);
    }
    html = html.replace(
      /<a.*href="(.*?)".*>(.*?)<\/a>/gi,
      (match: any, href: string, name: string) => {
        if (hrefConvert===false){
          return `${href}`;
        }
        else if (href.endsWith(".jpg")) {
          return `\n\n![${name}](${href})`;
        } else {
          return `[${name}](${href})`;
        }
      }
    );
    return html;
  },
  /**
   * adding a new formatter to the list of formatters
   * @method use
   * @param  {Function} formatter
   * @return {void}
   */
  use(formatter: any) {
    formatters.push(formatter);
  }
};
