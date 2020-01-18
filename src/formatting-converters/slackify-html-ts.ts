const htmlparser = require("htmlparser"),
  Entities = require("html-entities").AllHtmlEntities;

const entities = new Entities();

module.exports = function slackify(html: string) {
  const handler = new htmlparser.DefaultHandler((error: any, dom: any) => {
    // error ignored
  });
  const parser = new htmlparser.Parser(handler);
  parser.parseComplete(html);
  const dom = handler.dom;
  if (dom) return entities.decode(walk(dom).replace(/&lt;/g, '&amp;lt;').replace(/&gt;/g, '&amp;gt;'));
  else return "";
};

function walk(dom: any) {
  let out = "";
  if (dom)
    dom.forEach((el: any) => {
      if ("text" === el.type) out += el.data;
      if ("tag" === el.type)
        switch (el.name) {
          case "a":
            out += `<${el.attribs.href}|${walk(el.children)}>`;
            break;
          case "strong":
          case "b":
            out += `*${walk(el.children)}*`;
            break;
          case "del":
            out += `~${walk(el.children)}~`;
            break;
          case "code":
            out += `\`\`\`\n${walk(el.children)}\`\`\``;
            break;
          case "i":
          case "em":
            out += `_${walk(el.children)}_`;
            break;
          default:
            out += walk(el.children);
        }
    });
  return out;
}
