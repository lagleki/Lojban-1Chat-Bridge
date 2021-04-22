/**
 * html-to-markdown
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
 */
const headingRegex = /<h(\d*)>([\s\S]*?)<\/h\d*>/gim;
const delRegex = /<del>([\s\S]*?)<\/del>/gim;
const pRegex = /<p>([\s\S]*?)<\/p>/gim;
const ulRegex = /<ul>([\s\S]*?)<\/ul>/gim;
const olRegex = /<ol>([\s\S]*?)<\/ol>/gim;
const liRegex = /<li>([\s\S]*?)<\/li>/gim;
const preRegex = /<pre>([\s\S]*?)<\/pre>/gim;
const codeRegex = /<code>([\s\S]*?)<\/code>/gim;
const blockQuoteRegex = /<blockquote>([\s\S]*?)<\/blockquote>/gim;
const boldRegex = /<(?:b|strong)>([\s\S]*?)<\/\w*>/gim;
const underlineRegex = /<(?:u)>([\s\S]*?)<\/\w*>/gim;
const italicRegex = /<(?:i|em)>([\s\S]*?)<\/\w*>/gim;
/**
 * @description executes a regex to replace matched text with
 * selected group with optional pre and postfix
 * @method makeRegex
 * @param  {String}  regex  [description]
 * @param  {String}  doc    [description]
 * @param  {String}  before [description]
 * @param  {String}  after  [description]
 * @return {String}         [description]
 */
function makeRegex({ regex, doc, before, after, replaceFn, dialect }) {
    let matches = [];
    let newDoc = doc;
    let replaceString;
    while ((matches = regex.exec(doc))) {
        if (matches && matches[1]) {
            replaceString = before || "";
            let replaceText = matches[1].trim();
            if (replaceFn && typeof replaceFn === "function") {
                replaceText = replaceFn(matches);
            }
            replaceString += `${replaceText}`;
            replaceString += after || "";
            newDoc = newDoc.replace(matches[0], replaceString);
        }
    }
    return newDoc;
}
/**
 * @descriptions adds number of hashes to headings
 * based upon heading weight
 * @method addHashes
 * @param  {Number}  count [description]
 */
function addHashes(count) {
    return "#".repeat(Number(count));
}
/**
 * @description replaces html headings with equalent markdown
 * syntax
 * @method replaceHeading
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceHeading({ doc, dialect }) {
    return makeRegex({
        regex: headingRegex,
        doc,
        replaceFn: (match) => addHashes(match[1]) + match[2],
        dialect
    });
}
/**
 * @description replaces ul section with equalent markdown
 * syntax
 * @method replaceUl
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceUl({ doc, dialect }) {
    return makeRegex({
        regex: ulRegex,
        doc,
        replaceFn: (match) => replaceLi({ doc: match[1], tag: "ul", dialect })
    });
}
/**
 * @description replaces ol section with equalent markdown
 * syntax
 * @method replaceOl
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceOl({ doc, dialect }) {
    return makeRegex({
        regex: olRegex,
        doc,
        replaceFn: (match) => replaceLi({ doc: match[1], tag: "ol", dialect })
    });
}
/**
 * @description replaces paragraph section with equalent markdown
 * syntax
 * @method replaceParagraph
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceParagraph({ doc, dialect }) {
    return makeRegex({ regex: pRegex, doc });
}
/**
 * @description replaces del section with equalent markdown
 * syntax
 * @method replaceDel
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceDel({ doc, dialect }) {
    return makeRegex({ regex: delRegex, doc, before: "~~", after: "~~" });
}
/**
 * @description replaces pre section with equalent markdown
 * syntax
 * @method replacePre
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replacePre({ doc, dialect }) {
    return makeRegex({
        regex: preRegex,
        doc,
        replaceFn: (match) => match[1].replace(/&#95;/g, "_"),
        before: "\n```\n",
        after: "\n```\n"
    });
}
/**
 * @description replaces pre section with equalent markdown
 * syntax
 * @method replaceCode
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceCode({ doc, dialect }) {
    return makeRegex({
        regex: codeRegex,
        doc,
        replaceFn: (match) => match[1].replace(/&#95;/g, "_"),
        before: "`",
        after: "`"
    });
}
/**
 * @description replaces blockquote section with equalent markdown
 * syntax
 * @method replaceBlockQuote
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceBlockQuote({ doc, dialect }) {
    if (dialect === "discord")
        return makeRegex({
            regex: blockQuoteRegex,
            doc,
            before: "\n> "
        });
    return makeRegex({
        regex: blockQuoteRegex,
        doc,
        before: "\n> ",
        after: "\n"
    });
}
/**
 * @description replaces bold|strong section with equalent markdown
 * syntax
 * @method replaceBold
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceBold({ doc, dialect }) {
    return makeRegex({ regex: boldRegex, doc, before: "**", after: "**" });
}
1;
/**
 * @description replaces г section with equalent markdown
 * syntax
 * @method replaceUnderline
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceUnderline({ doc, dialect }) {
    return makeRegex({
        regex: underlineRegex,
        doc,
        replaceFn: (match) => match[1].replace(/(.)/g, "$1\u035f")
    });
}
/**
 * @description replaces i|em section with equalent markdown
 * syntax
 * @method replaceItalic
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceItalic({ doc, dialect }) {
    return makeRegex({ regex: italicRegex, doc, before: "*", after: "*" });
}
/**
 * @description replaces li tags with equalent markup based
 * upon their parent tag
 * @method replaceLi
 * @param  {String}  doc [description]
 * @param  {String}  tag [description]
 * @return {String}      [description]
 */
function replaceLi({ doc, dialect, tag }) {
    let matches = [];
    let newDoc = doc;
    let replaceIndex = 0;
    let replaceTag = "";
    while ((matches = liRegex.exec(doc))) {
        if (matches && matches[1]) {
            if (tag !== "ul") {
                replaceIndex++;
                replaceTag = `${replaceIndex}. `;
            }
            else {
                replaceTag = "* ";
            }
            newDoc = newDoc.replace(matches[0], replaceTag + matches[1].trim());
        }
    }
    return newDoc;
}
module.exports = [
    replaceHeading,
    replaceParagraph,
    replaceDel,
    replacePre,
    replaceCode,
    replaceUl,
    replaceOl,
    replaceBold,
    replaceUnderline,
    replaceItalic,
    replaceBlockQuote
];
