/**
 * html-to-markdown
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
 */

const headingRegex = /<h(\d*)>([\s\S]*?)<\/h\d*>/gim
const pRegex = /<p>([\s\S]*?)<\/p>/gim
const ulRegex = /<ul>([\s\S]*?)<\/ul>/gim
const olRegex = /<ol>([\s\S]*?)<\/ol>/gim
const liRegex = /<li>([\s\S]*?)<\/li>/gim
const preRegex = /<pre>([\s\S]*?)<\/pre>/gim
const blockQuoteRegex = /<blockquote>([\s\S]*?)<\/blockquote>/gim
const boldRegex = /<(?:b|strong)>([\s\S]*?)<\/\w*>/gim
const italicRegex = /<(?:i|em)>([\s\S]*?)<\/\w*>/gim

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
function makeRegex(regex, doc, before, after, replaceFn) {
	let matches = []
	let newDoc = doc
	let replaceString
	while ((matches = regex.exec(doc))) {
		if (matches && matches[1]) {
			replaceString = before || ""
			let replaceText = matches[1].trim()
			if (replaceFn && typeof replaceFn === "function") {
				replaceText = replaceFn(matches)
			}
			replaceString += `${replaceText}\n`
			replaceString += after || ""
			newDoc = newDoc.replace(matches[0], replaceString)
		}
	}
	return newDoc
}

/**
 * @descriptions adds number of hashes to headings
 * based upon heading weight
 * @method addHashes
 * @param  {Number}  count [description]
 */
function addHashes(count) {
	return "#".repeat(Number(count))
}

/**
 * @description replaces html headings with equalent markdown
 * syntax
 * @method replaceHeading
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceHeading(doc) {
	return makeRegex(
		headingRegex,
		doc,
		null,
		null,
		match => addHashes(match[1]) + match[2]
	)
}

/**
 * @description replaces ul section with equalent markdown
 * syntax
 * @method replaceUl
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceUl(doc) {
	return makeRegex(ulRegex, doc, null, null, match => replaceLi(match[1], "ul"))
}

/**
 * @description replaces ol section with equalent markdown
 * syntax
 * @method replaceOl
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceOl(doc) {
	return makeRegex(olRegex, doc, null, null, match => replaceLi(match[1], "ol"))
}

/**
 * @description replaces paragraph section with equalent markdown
 * syntax
 * @method replaceParagraph
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceParagraph(doc) {
	return makeRegex(pRegex, doc)
}

/**
 * @description replaces pre section with equalent markdown
 * syntax
 * @method replacePre
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replacePre(doc) {
	return makeRegex(preRegex, doc, "`", "`")
}

/**
 * @description replaces blockquote section with equalent markdown
 * syntax
 * @method replaceBlockQuote
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceBlockQuote(doc) {
	return makeRegex(blockQuoteRegex, doc, "> ")
}

/**
 * @description replaces bold|strong section with equalent markdown
 * syntax
 * @method replaceBold
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceBold(doc) {
	return makeRegex(boldRegex, doc, "** ", " **")
}

/**
 * @description replaces i|em section with equalent markdown
 * syntax
 * @method replaceItalic
 * @param  {String}       doc [description]
 * @return {String}           [description]
 */
function replaceItalic(doc) {
	return makeRegex(italicRegex, doc, "* ", " *")
}

/**
 * @description replaces li tags with equalent markup based
 * upon their parent tag
 * @method replaceLi
 * @param  {String}  doc [description]
 * @param  {String}  tag [description]
 * @return {String}      [description]
 */
function replaceLi(doc, tag) {
	let matches = []
	let newDoc = doc
	let replaceIndex = 0
	let replaceTag = ""
	while ((matches = liRegex.exec(doc))) {
		if (matches && matches[1]) {
			if (tag !== "ul") {
				replaceIndex++
				replaceTag = `${replaceIndex}. `
			} else {
				replaceTag = "* "
			}
			newDoc = newDoc.replace(matches[0], replaceTag + matches[1].trim())
		}
	}
	return newDoc
}

module.exports = [
	replaceHeading,
	replaceParagraph,
	replacePre,
	replaceUl,
	replaceOl,
	replaceBold,
	replaceItalic,
	replaceBlockQuote
]
