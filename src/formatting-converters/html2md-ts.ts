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
function replaceExtras(doc: string): string {
  const matches = [];
  let newDoc = doc;
  newDoc = newDoc.replace(extrasRegex, "");
  return newDoc;
}

const replacements = [
  [/\\/g, "\\"],
  // [/\*/g, "\*"],
  // [/#/g, "\#"],
  // // [/\//g, "\\/"],
  // [/\(/g, "\("],
  // [/\)/g, "\)"],
  // [/\[/g, "\["],
  // [/\]/g, "\]"],
  // // [/\</g, "&lt;"],
  // // [/\>/g, "&gt;"],
  // [/_/g, "\\_"]
];

module.exports = {
  /**
   * @description converts given html to a markdown
   * document
   * @method convert
   * @param  {String} html
   * @return {String}
   */
  convert({
    string,
    hrefConvert,
    dialect
  }: {
    string: string;
    hrefConvert: boolean;
    dialect?: string;
  }): string {
    string = string
      .replace(/\\/g, "\\\\")
      .replace(/_/g, "&#95;")
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gim, "<pre>$1</pre>");
    /**
     * replacing unnecessary html tags
     * @type {String}
     */
    let html: string = replaceExtras(
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
      if (typeof formatter === "function")
        html = formatter({ doc: html, dialect });
    }
    html = html.replace(
      /<a.*?href="(.*?)".*?>(.*?)<\/a>/gi,
      (match: any, href: string, name: string) => {
        if (hrefConvert === false) {
          return `${href}`;
        } else if (/\.(jpg|png|gif)/.test(href)) {
          return `\n\n![${name}](${href})`;
        } else {
          return `[${name}](${href})`;
        }
      }
    )
    .replace(/<br>/g,'\n')
    .replace(/&#95;/g, "\\_")
    ;
    return html;
  },
  /**
   * adding a new formatter to the list of formatters
   * @method use
   * @param  {Function} formatter
   * @return {void}
   */
  use(formatter: any): void {
    formatters.push(formatter);
  }
};
