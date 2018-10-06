/**
 * html-to-markdown
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
 */
const formatters = require("./html2md-formatters");
const extrasRegex = /<\/?(?:div|address|section|article|span)>/gim;
/**
 * @description replacing unncessary html tags
 * @method replaceExtras
 * @param  {String}      doc
 * @return {String}
 */
function replaceExtras(doc) {
  const matches = [];
  let newDoc = doc;
  newDoc = newDoc.replace(extrasRegex, "");
  return newDoc;
}
module.exports = {
  /**
   * @description converts given html to a markdown
   * document
   * @method convert
   * @param  {String} html
   * @return {String}
   */
  convert(html) {
    /**
     * replacing unncessary html tags
     * @type {String}
     */
    html = replaceExtras(html);
    /**
     * looping through registered formatters
     */
    for (
      let _i = 0, formatters_1 = formatters;
      _i < formatters_1.length;
      _i++
    ) {
      const formatter = formatters_1[_i];
      if (typeof formatter === "function") html = formatter(html);
    }
    html = html.replace(
      /<a.*href="(.*?)".*>(.*?)<\/a>/gi,
      (match, href, name) => {
        if (href.endsWith(".jpg")) {
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
  use(formatter) {
    formatters.push(formatter);
  }
};
