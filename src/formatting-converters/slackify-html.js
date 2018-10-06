const htmlparser = require("htmlparser"),
	Entities = require("html-entities").AllHtmlEntities

entities = new Entities()

module.exports = function slackify(html) {
	const handler = new htmlparser.DefaultHandler((error, dom) => {
		// error ignored
	})
	const parser = new htmlparser.Parser(handler)
	parser.parseComplete(html)
	const dom = handler.dom
	if (dom) return entities.decode(walk(dom))
	else return ""
}

function walk(dom) {
	let out = ""
	if (dom)
		dom.forEach(el => {
			if ("text" === el.type) out += el.data
			if ("tag" === el.type)
				switch (el.name) {
					case "a":
						out += `<${el.attribs.href}|${walk(el.children)}>`
						break
					case "strong":
					case "b":
						out += `*${walk(el.children)}*`
						break
					case "i":
					case "em":
						out += `_${walk(el.children)}_`
						break
					default:
						out += walk(el.children)
				}
		})
	return out
}
