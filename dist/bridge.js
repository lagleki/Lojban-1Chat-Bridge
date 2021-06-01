"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NTBA_FIX_319 = 1;
// file system and network libs
const fs = require("fs-extra");
const path = require("path");
const mkdir = require("mkdirp-sync");
const request = require("request");
// process.on('warning', (e: any) => console.warn(e.stack));
const cache_folder = path.join(__dirname, "../data");
const defaults = path.join(__dirname, `../default-config/defaults.js`);
// messengers' libs
const { login } = require("libfb");
const Telegram = require("node-telegram-bot-api");
const sanitizeHtml = require("sanitize-html");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
const util = require("util");
const vk_io_1 = require("vk-io");
const authorization_1 = require("@vk-io/authorization");
const VkBot = require("node-vk-bot-api");
const { RTMClient, WebClient } = require("@slack/client");
const emoji = require("node-emoji");
const html2slack = require("./formatting-converters/html2slack");
const html2irc = require("./formatting-converters/html2irc");
const Discord = require("discord.js");
const discordParser = require("discord-markdown");
const marked = require("marked");
const lexer = marked.Lexer;
lexer.rules.list = { exec: () => { } };
lexer.rules.listitem = { exec: () => { } };
const markedRenderer = new marked.Renderer();
// markedRenderer.text = (string: string) => string.replace(/\\/g, "\\\\");
const { fillMarkdownEntitiesMarkup } = require("telegram-text-entities-filler");
//fillMarkdownEntitiesMarkup(message.text, message.entities)
const avatar = require("../src/animalicons/index.js");
let server;
function markedParse({ text, messenger, dontEscapeBackslash, unescapeCodeBlocks, }) {
    if (!dontEscapeBackslash)
        text = text.replace(/\\/gim, "\\\\");
    markedRenderer.codespan = (text) => {
        if (!dontEscapeBackslash)
            text = text.replace(/\\\\/gim, "&#92;");
        if (unescapeCodeBlocks)
            text = common.unescapeHTML({
                text,
                convertHtmlEntities: true,
            });
        return `<code>${text}</code>`;
    };
    markedRenderer.code = (text) => {
        if (!dontEscapeBackslash)
            text = text.replace(/\\\\/gim, "&#92;");
        if (unescapeCodeBlocks)
            text = common.unescapeHTML({
                text,
                convertHtmlEntities: true,
            });
        return `<pre><code>${text}</code></pre>\n`;
    };
    const result = marked.parser(lexer.lex(text), {
        gfm: true,
        renderer: markedRenderer,
    });
    log(messenger)({ "converting source text": text, result });
    return result;
}
const html2md = require("./formatting-converters/html2md-ts");
const Irc = require("irc-upd");
const ircolors = require("./formatting-converters/irc-colors-ts");
const finalhandler = require("finalhandler");
const http = require("http");
const serveStatic = require("serve-static");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const logger = winston.createLogger({
    transports: [
        new DailyRotateFile({
            filename: path.join(cache_folder, "info-%DATE%.log"),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),
    ],
});
const log = (messenger) => (message) => logger.log({ level: "info", message: { message, messenger } });
const R = require("ramda");
const { default: PQueue } = require("p-queue");
const { to } = require("await-to-js");
const blalalavla = require("./sugar/blalalavla");
const modzi = require("./sugar/modzi");
// NLP & spam libs
const lojban = require("lojban");
const generic = {};
const common = {};
const prepareToWhom = {};
const prepareAuthor = {};
const GetChunks = {};
const queueOf = {};
const receivedFrom = {};
const sendTo = {};
const StartService = {};
const convertTo = {};
const convertFrom = {};
const GetName = {};
const GetChannels = {};
const GotProblem = {};
const AdaptName = {};
const BootService = {};
const NewChannelAppeared = {};
//declare messengers
common.telegram = {
    Start: async function ({ messenger }) {
        return new Telegram(config.piers[messenger].token, {
            polling: true,
        });
    }
};
common.webwidget = {
    Start: async function () {
        return;
    }
};
common.vkboard = {
    Start: async function ({ messenger }) {
        const vkio = new vk_io_1.VK({
            appId: config[messenger].appId,
            login: config[messenger].login,
            password: config[messenger].password,
            authScope: "offline,wall,messages,groups",
        });
        const authorization = new authorization_1.Authorization(vkio);
        const direct = authorization.implicitFlowUser();
        const [err, app] = await to(direct.run());
        if (err) {
            console.error("vkboard", err.toString());
        }
        const vkbot = new VkBot({
            token: config[messenger].token,
            group_id: config[messenger].group_id,
        });
        return { bot: vkbot, app };
    }
};
common.vkwall = {
    Start: async function ({ messenger }) {
        const vkio = new vk_io_1.VK({
            appId: config[messenger].appId,
            login: config[messenger].login,
            password: config[messenger].password,
            authScope: "offline,wall,messages,groups",
        });
        const authorization = new authorization_1.Authorization(vkio);
        const direct = authorization.implicitFlowUser();
        const [err, app] = await to(direct.run());
        if (err) {
            console.error("vkwall", err.toString());
        }
        const vkbot = new VkBot({
            token: config[messenger].token,
            group_id: config[messenger].group_id,
        });
        return { bot: vkbot, app };
    }
};
common.slack = {
    Start: async function ({ messenger }) {
        generic[messenger].client = {
            rtm: new RTMClient(config[messenger].token),
            web: new WebClient(config[messenger].token),
        };
        generic[messenger].client.rtm.start().catch((e) => {
            var _a;
            if (!((_a = e === null || e === void 0 ? void 0 : e.data) === null || _a === void 0 ? void 0 : _a.ok)) {
                config.MessengersAvailable[messenger] = false;
                log("slack")({
                    error: "Couldn't start Slack",
                });
            }
        });
        return true;
    }
};
common.mattermost = {
    Start: async function ({ messenger }) {
        let [err, res] = await to(new Promise((resolve) => {
            const credentials = {
                login_id: config[messenger].login,
                password: config[messenger].password,
            };
            const url = `${config[messenger].ProviderUrl}/api/v4/users/login`;
            request({
                body: JSON.stringify(credentials),
                method: "POST",
                url,
            }, (err, response, body) => {
                var _a;
                if (err) {
                    console.error(err);
                    resolve(null);
                }
                else {
                    resolve({
                        token: ((_a = response === null || response === void 0 ? void 0 : response.headers) === null || _a === void 0 ? void 0 : _a.token) || "",
                        id: JSON.parse(body).id,
                    });
                }
            });
        }));
        if (err || !res) {
            config.MessengersAvailable[messenger] = false;
            return;
        }
        else {
            config[messenger].token = res.token;
            config[messenger].user_id = res.id;
        }
        ;
        [err, res] = await to(new Promise((resolve) => {
            const user_id = config[messenger].user_id;
            const url = `${config[messenger].ProviderUrl}/api/v4/users/${user_id}/teams`;
            request({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config[messenger].token}`,
                },
            }, (error, response, body) => {
                if (err) {
                    console.error(err);
                    resolve(null);
                }
                else {
                    const team = JSON.parse(body).find((i) => {
                        return (i.display_name === config[messenger].team ||
                            i.name === config[messenger].team);
                    });
                    config[messenger].team_id = team.id;
                    resolve(team);
                }
            });
        }));
        if (!res) {
            config.MessengersAvailable[messenger] = false;
            return;
        }
        const ReconnectingWebSocket = require("reconnecting-websocket");
        return new ReconnectingWebSocket(config[messenger].APIUrl, [], {
            WebSocket: require("ws"),
        });
    }
};
// sendTo
async function FormatMessageChunkForSending({ messenger, channelId, author, chunk, action, title, quotation, }) {
    if (quotation) {
        if (!author || author === "")
            author = "-";
        chunk = common.LocalizeString({
            messenger,
            channelId,
            localized_string_key: `OverlayMessageWithQuotedMark.${messenger}`,
            arrElemsToInterpolate: [
                ["author", author],
                ["chunk", chunk],
                ["title", title],
            ],
        });
    }
    else if ((author || "") !== "") {
        // console.log(config[messenger], action,chunk)
        if ((config[messenger].Actions || []).includes(action)) {
            chunk = common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: `sendTo.${messenger}.action`,
                arrElemsToInterpolate: [
                    ["author", author],
                    ["chunk", chunk],
                    ["title", title],
                ],
            });
        }
        else {
            chunk = common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: `sendTo.${messenger}.normal`,
                arrElemsToInterpolate: [
                    ["author", author],
                    ["chunk", chunk],
                    ["title", title],
                ],
            });
        }
    }
    else {
        chunk = common.LocalizeString({
            messenger,
            channelId,
            localized_string_key: `sendTo.${messenger}.ChunkOnly`,
            arrElemsToInterpolate: [
                ["chunk", chunk],
                ["title", title],
            ],
        });
    }
    return chunk;
}
sendTo.webwidget = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly)
        return;
    const data = {
        channelId,
        author,
        chunk,
        action,
        quotation,
        file,
        edited,
    };
    generic[messenger].Lojban1ChatHistory.push(data);
    generic[messenger].Lojban1ChatHistory = generic[messenger].Lojban1ChatHistory.slice((config[messenger].historyLength || 201) * -1);
    generic[messenger].client.emit("sentFrom", {
        data,
    });
    log("webwidget")({ "sending message": data });
    return true;
};
sendTo.facebook = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if (((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly) ||
        !generic[messenger].client)
        return;
    queueOf[messenger].add(async () => {
        await new Promise((resolve) => {
            setTimeout(() => {
                const jsonMessage = {
                    body: chunk,
                };
                if (file)
                    jsonMessage.attachment = fs.createReadStream(file);
                generic[messenger].client.sendMessage(channelId, chunk).catch(catchError);
                resolve(null);
            }, 500);
        });
    });
    return true;
};
sendTo.telegram = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly)
        return;
    queueOf[messenger].add(async () => {
        await new Promise((resolve) => {
            log("telegram")({ "sending text": chunk });
            generic[messenger].client
                .sendMessage(channelId, chunk, {
                parse_mode: "HTML",
            })
                .then(() => resolve(null))
                .catch((err) => {
                err = util.inspect(err, { showHidden: false, depth: 4 });
                common.LogToAdmin(`
Error sending a chunk:

Channel: ${channelId}.

Chunk: ${common.escapeHTML(chunk)}

Error message: ${err}
            `);
                resolve(null);
            });
        });
    });
    return true;
};
sendTo.discord = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly)
        return;
    queueOf[messenger].add(async () => {
        const channel = generic[messenger].client.channels.cache.get(channelId);
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.first();
        const authorTemp = author
            .replace(/[0-9_\.-]+$/, " ")
            .replace(/\[.*/, "")
            .replace(/[^0-9A-Za-z].*$/, "")
            .trim();
        const parsedName = modzi.modzi(author);
        let ava = new avatar(authorTemp, 512, parsedName.snada ? parsedName.output : undefined);
        await ava.draw();
        ava = await ava.toDataURL();
        if (!webhook) {
            webhook = await channel.createWebhook(author || "-", ava);
        }
        else {
            webhook = await webhook.edit({
                name: author || "-",
                avatar: ava,
            });
        }
        let files = undefined;
        if (file) {
            files = [
                {
                    attachment: file,
                },
            ];
        }
        const [err] = await to(webhook.send(chunk, {
            username: author || "-",
            files,
            // avatarURL: generic.discord.avatar.path,
        }));
        if (err) {
            //try to send without the attachment. useful when the file is too large for Discord to handle
            await to(webhook.send(chunk, {
                username: author || "-",
                // avatarURL: generic.discord.avatar.path,
            }));
        }
        // await new Promise((resolve: any) => {
        //   generic.discord.client.channels.cache
        //     .get(channelId)
        //     .send(chunk)
        //     .catch(catchError)
        //   resolve(null)
        // })
    });
};
sendTo.mattermost = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly)
        return;
    queueOf[messenger].add(async () => {
        await new Promise((resolve) => {
            const option = {
                url: config[messenger].HookUrl,
                json: {
                    text: chunk,
                    // username: author,
                    channel: channelId,
                },
            };
            request.post(option, (error, response, body) => {
                resolve(null);
            });
        });
    });
};
sendTo.vkwall = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly)
        return;
    if (!generic[messenger].client.app) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    const token = generic[messenger].client.app.token;
    queueOf.vk.add(async () => {
        await new Promise((resolve) => {
            setTimeout(() => {
                generic[messenger].client.bot
                    .api("wall.createComment", {
                    access_token: token,
                    owner_id: "-" + config[messenger].group_id,
                    post_id: channelId,
                    from_group: config[messenger].group_id,
                    reply_to_comment: 1,
                    message: chunk,
                })
                    .then((res) => { })
                    .catch(() => { });
                resolve(null);
            }, 60000);
        });
    });
};
sendTo.vkboard = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly
    //todo: !vk.WaitingForCaptcha
    )
        return;
    if (!generic[messenger].client.app) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    const token = generic[messenger].client.app.token;
    queueOf.vk.add(async () => {
        await new Promise((resolve) => {
            setTimeout(() => {
                generic[messenger].client.bot
                    .api("board.createComment", {
                    access_token: token,
                    group_id: config[messenger].group_id,
                    topic_id: channelId,
                    message: chunk,
                    from_group: 1,
                })
                    .then((res) => { })
                    .catch(() => { });
                resolve(null);
            }, 60000);
        });
    });
    // if (err.error.error_code === 14) {
    //   vkboard.io.setCaptchaHandler(async ({ src }, retry) => {
    //     //todo: send image to telegram,a reply is expected
    //     vk.WaitingForCaptcha = true;
    //     const key = await myAwesomeCaptchaHandler(src);
    //     vk.WaitingForCaptcha = false;
    //     try {
    //       await retry(key);
    //
    //       console.log("Капча успешно решена");
    //     } catch (error) {
    //       console.log("Капча неверная", error.toString());
    //     }
    //   });
    // }
};
// async function myAwesomeCaptchaHandler() {}
sendTo.slack = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly)
        return;
    queueOf[messenger].add(async () => {
        await new Promise((resolve) => {
            chunk = emoji.unemojify(chunk);
            generic[messenger].client.web.chat
                .postMessage({
                channel: channelId,
                username: (author || "").replace(/(^.{21}).*$/, "$1"),
                text: chunk,
            })
                .then(() => resolve(null))
                .catch((err) => {
                console.error(err);
                resolve(null);
            });
        });
    });
};
sendTo.irc = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    var _a, _b, _c, _d;
    if ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.readonly)
        return;
    queueOf[messenger].add(async () => {
        await new Promise((resolve) => {
            log("irc")({ "sending for irc": chunk });
            generic[messenger].client.say(channelId, chunk);
            resolve(null);
        });
    });
};
async function prepareChunks({ messenger, channelId, text, edited, messengerTo, }) {
    let arrChunks, fallback = "fallback";
    if (GetChunks[messengerTo])
        fallback = messengerTo;
    arrChunks = await GetChunks[fallback](text, messengerTo);
    for (let i in arrChunks) {
        log("generic")(`converting for messenger ${messengerTo} the text "` + arrChunks[i] + `"`);
        if (edited)
            arrChunks[i] = common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: `OverlayMessageWithEditedMark.${messengerTo}`,
                arrElemsToInterpolate: [["message", arrChunks[i]]],
            });
        arrChunks[i] = await convertTo[messengerTo]({
            text: arrChunks[i],
            messenger,
            messengerTo,
        });
        log("generic")(`converted for messenger ${messengerTo} to text "` + arrChunks[i] + `"`);
    }
    return arrChunks;
}
prepareToWhom.irc = function ({ messenger, text, targetChannel, }) {
    var _a, _b, _c, _d;
    const ColorificationMode = ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[targetChannel]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.nickcolor) || "mood";
    return `${ircolors.MoodifyText({
        text,
        mood: ColorificationMode,
    })}: `;
};
prepareToWhom.fallback = function ({ messenger, text, targetChannel, }) {
    return `${text}: `;
};
prepareAuthor.irc = function ({ messenger, text, targetChannel, }) {
    var _a, _b, _c, _d;
    const ColorificationMode = ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[targetChannel]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.nickcolor) || "mood";
    return `${ircolors.MoodifyText({
        text,
        mood: ColorificationMode,
    })}`;
};
prepareAuthor.fallback = function ({ messenger, text, targetChannel, }) {
    return `${text}`;
};
async function checkHelpers({ messenger, channelId, author, text, ToWhom, quotation, action, edited, }) {
    const tags = ["#zlm", "#modzi"];
    text = text.replace(/<[^>]*>/g, '');
    const selected_tags = tags.filter(i => text.indexOf(i) >= 0);
    if (selected_tags.length === 0)
        return;
    tags.forEach(tag => {
        text = text.replace(tag, '');
    });
    text = text.trim();
    if (xovahelojbo({ text }) < 0.5)
        return;
    const puppeteer = require('puppeteer-extra');
    let browser, href;
    try {
        browser = await puppeteer.launch({
            args: ["--no-sandbox"],
            headless: true
        });
        let page = await browser.newPage();
        await page.goto(`https://la-lojban.github.io/melbi-zei-lojban/?ceha=${selected_tags[0]}&text=${text}`);
        await page.waitForFunction("document.querySelector('#myImage') && document.querySelector('#myImage').getAttribute('data:fonts-loaded')=='true'");
        href = (await page.evaluate(() => Array.from(document.querySelectorAll('#myImage'), a => a.getAttribute('src'))))[0];
    }
    catch (error) {
        logger.log({
            level: "error",
            function: "checkHelpers",
            message: error.toString(),
        });
    }
    try {
        await browser.close();
    }
    catch (error) {
        logger.log({
            level: "error",
            function: "checkHelpers",
            message: error.toString(),
        });
    }
    console.log(href);
    if (!href)
        return;
    const [file, localfile] = await common.downloadFile({
        type: "data",
        remote_path: href
    });
    console.log(file, localfile);
    sendTo[common.root_of_messenger(messenger)]({
        messenger,
        channelId,
        author,
        chunk: file,
        file: localfile,
        quotation,
        action,
        edited,
    });
}
async function sendFrom({ messenger, channelId, author, text, ToWhom, quotation, action, file, remote_file, edited, }) {
    var _a, _b, _c, _d;
    const ConfigNode = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId];
    if (!ConfigNode)
        return common.LogToAdmin(`error finding assignment to ${messenger} channel with id ${channelId}`);
    if (!text || text === "")
        return;
    const messenger_core = common.root_of_messenger(messenger);
    text = await convertFrom[messenger_core]({ text, messenger });
    text = text.replace(/\*/g, "&#x2A;").replace(/_/g, "&#x5F;");
    text = text.replace(/^(<br\/>)+/, "");
    //zbalermorna etc.
    await checkHelpers({
        messenger,
        channelId: ConfigNode[messenger],
        author,
        text,
        quotation,
        action,
        edited,
    });
    const nsfw = file ? (await to(getNSFWString(remote_file)))[1] : null;
    if (nsfw) {
        for (const nsfw_result of nsfw) {
            const translated_text = common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: "nsfw_kv_" + nsfw_result.id.toLowerCase(),
                arrElemsToInterpolate: [["prob", nsfw_result.prob]],
            });
            let Chunks = await prepareChunks({
                messenger,
                channelId,
                text: translated_text,
                messengerTo: messenger,
            });
            for (const i in Chunks) {
                const chunk = Chunks[i];
                Chunks[i] = await FormatMessageChunkForSending({
                    messenger,
                    channelId,
                    title: (_c = config === null || config === void 0 ? void 0 : config.vkboard) === null || _c === void 0 ? void 0 : _c.group_id,
                    author,
                    chunk,
                    action,
                    quotation,
                });
            }
            Chunks.map((chunk) => {
                sendTo[common.root_of_messenger(messenger)]({
                    messenger,
                    channelId: ConfigNode[messenger],
                    author,
                    chunk,
                    quotation,
                    action,
                    file,
                    edited,
                });
            });
            text = text + "<br/>" + translated_text;
        }
    }
    for (const messengerTo of Object.keys(config.channelMapping)) {
        if (config.MessengersAvailable[messengerTo] &&
            ConfigNode[messengerTo] &&
            messenger !== messengerTo) {
            let thisToWhom = "";
            if (ToWhom)
                if (prepareToWhom[messengerTo]) {
                    thisToWhom = prepareToWhom[messengerTo]({
                        messenger: messengerTo,
                        text: ToWhom,
                        targetChannel: ConfigNode[messengerTo],
                    });
                }
                else
                    thisToWhom = prepareToWhom.fallback({
                        messenger: messengerTo,
                        text: ToWhom,
                        targetChannel: ConfigNode[messengerTo],
                    });
            if (!author)
                author = "";
            if (prepareAuthor[messengerTo]) {
                author = prepareAuthor[messengerTo]({
                    messenger: messengerTo,
                    text: author,
                    targetChannel: ConfigNode[messengerTo],
                });
            }
            else
                author = prepareAuthor.fallback({
                    messenger: messengerTo,
                    text: author,
                    targetChannel: ConfigNode[messengerTo],
                });
            let Chunks = await prepareChunks({
                messenger,
                channelId,
                text,
                edited,
                messengerTo,
            });
            for (const i in Chunks) {
                const chunk = Chunks[i];
                Chunks[i] = await FormatMessageChunkForSending({
                    messenger: messengerTo,
                    channelId,
                    title: (_d = config === null || config === void 0 ? void 0 : config.vkboard) === null || _d === void 0 ? void 0 : _d.group_id,
                    author,
                    chunk: thisToWhom + chunk,
                    action,
                    quotation,
                });
            }
            Chunks.map((chunk) => {
                sendTo[common.root_of_messenger(messengerTo)]({
                    messenger: messengerTo,
                    channelId: ConfigNode[messengerTo],
                    author,
                    chunk,
                    quotation,
                    action,
                    file,
                    edited,
                });
            });
        }
    }
}
async function getNSFWString(file) {
    // if (file.substr(-4) !== ".jpg") return
    const axios = require("axios"); //you can use any http client
    const tf = require("@tensorflow/tfjs-node");
    const nsfw = require("nsfwjs");
    const pic = await axios.get(file, {
        responseType: "arraybuffer",
    });
    const model = await nsfw.load(); // To load a local model, nsfw.load('file://./path/to/model/')
    // Image must be in tf.tensor3d format
    // you can convert image to tf.tensor3d with tf.node.decodeImage(Uint8Array,channels)
    const image = await tf.node.decodeImage(pic.data, 3);
    let predictions = await model.classify(image);
    predictions = predictions
        .filter((className) => {
        if (className.className === "Neutral")
            return;
        if (className.probability > 0.6)
            return true;
        return;
    })
        .map((i) => {
        return { id: i.className, prob: Math.round(i.probability * 100) };
    });
    image.dispose(); // Tensor memory must be managed explicitly (it is not sufficient to let a tf.Tensor go out of scope for its memory to be released).
    return predictions.length > 0 ? predictions : null;
}
receivedFrom.discord = async (messenger, message) => {
    var _a, _b, _c;
    if (!((_a = config === null || config === void 0 ? void 0 : config.channelMapping[messenger]) === null || _a === void 0 ? void 0 : _a[(((_b = message === null || message === void 0 ? void 0 : message.channel) === null || _b === void 0 ? void 0 : _b.id) || "").toString()]))
        return;
    if (message.author.bot || message.channel.type !== "text")
        return;
    const edited = message.edited ? true : false;
    for (let value of message.attachments.values()) {
        //media of attachment
        //todo: height,width,common.LocalizeString
        let [, res] = await to(common.downloadFile({
            type: "simple",
            remote_path: value.url,
        }));
        let file, localfile;
        if (res === null || res === void 0 ? void 0 : res[1]) {
            ;
            [file, localfile] = res;
        }
        else {
            file = value.url;
            localfile = value.url;
        }
        log("discord")("sending attachment text: " + file);
        sendFrom({
            messenger,
            channelId: message.channel.id,
            author: AdaptName.discord(messenger, message),
            text: file,
            file: localfile,
            remote_file: file,
            edited,
        });
        //text of attachment
        const text = common.discord_reconstructPlainText(messenger, message, value.content);
        log("discord")("sending text of attachment: " + text);
        sendFrom({
            messenger: "discord",
            channelId: message.channel.id,
            author: AdaptName.discord(messenger, message),
            text,
            edited,
        });
    }
    if ((_c = message === null || message === void 0 ? void 0 : message.reference) === null || _c === void 0 ? void 0 : _c.messageID) {
        const message_ = await message.channel.messages.fetch(message.reference.messageID);
        const text = common.discord_reconstructPlainText(messenger, message_, message_.content);
        log("discord")(`sending reconstructed text: ${text}`);
        // console.log(message_, AdaptName.discord(message_))
        sendFrom({
            messenger,
            channelId: message_.channel.id,
            author: AdaptName.discord(messenger, message_),
            text,
            quotation: true,
            edited,
        });
    }
    const text = common.discord_reconstructPlainText(messenger, message, message.content);
    log("discord")("sending reconstructed text: " + text);
    sendFrom({
        messenger,
        channelId: message.channel.id,
        author: AdaptName.discord(messenger, message),
        text,
        edited,
    });
};
// receivedFrom
receivedFrom.facebook = async (messenger, message) => {
    var _a;
    if (!((_a = config === null || config === void 0 ? void 0 : config.channelMapping[messenger]) === null || _a === void 0 ? void 0 : _a[((message === null || message === void 0 ? void 0 : message.threadId) || "").toString()]))
        return;
    let err, res;
    [err, res] = await to(generic[messenger].client.getUserInfo(message.authorId));
    if (err)
        return;
    let author;
    author = AdaptName.facebook(res);
    if (!message.attachments)
        message.attachments = [];
    if (message.stickerId)
        message.attachments.push({ id: message.stickerId, type: "sticker" });
    for (const attachment of message.attachments) {
        if (attachment.type === "sticker") {
            ;
            [err, res] = await to(generic[messenger].client.getStickerURL(attachment.id));
        }
        else {
            ;
            [err, res] = await to(generic[messenger].client.getAttachmentURL(message.id, attachment.id));
        }
        if (err)
            return;
        //todo: add type="photo","width","height","size"
        common.downloadFile({
            type: "simple",
            remote_path: res,
        })
            .then(([file, localfile]) => {
            sendFrom({
                messenger,
                channelId: message.threadId,
                author,
                text: file,
                remote_file: file,
                file: localfile,
            });
        });
    }
    if (message.message)
        sendFrom({
            messenger,
            channelId: message.threadId,
            author,
            text: message.message,
        });
};
receivedFrom.telegram = async (messenger, message) => {
    //spammer
    //1. remove entered bots
    TelegramRemoveAddedBots(messenger, message);
    //2. check if admin else leave chat and return
    if (await TelegramLeaveChatIfNotAdmin(messenger, message))
        return;
    //3. check for spam
    if (await TelegramRemoveSpam(messenger, message))
        return;
    //4. check if new member event
    if (TelegramRemoveNewMemberMessage(messenger, message))
        return;
    //now deal with the message that is fine
    if (!config.channelMapping[messenger])
        return;
    const age = Math.floor(Date.now() / 1000) - message.date;
    if (age > (config.piers[messenger].maxMsgAge || 0))
        return console.log(`skipping ${age} seconds old message! NOTE: change this behaviour with config.telegram.maxMsgAge, also check your system clock`);
    if (!config.channelMapping[messenger][message.chat.id]) {
        if (config.cache[messenger][message.chat.title] &&
            config.cache[messenger][message.chat.title] === message.chat.id)
            return; //cached but unmapped channel so ignore it and exit the function
        await to(NewChannelAppeared.telegram({
            messenger,
            channelName: message.chat.title,
            channelId: message.chat.id,
        }));
        if (!config.channelMapping[messenger][message.chat.id])
            return;
    }
    // skip posts containing media if it's configured off
    if ((message.audio ||
        message.document ||
        message.photo ||
        message.sticker ||
        message.video ||
        message.voice ||
        message.contact ||
        message.location) &&
        !config.generic.showMedia)
        return;
    const author = GetName.telegram(messenger, message.from);
    await sendFromTelegram({
        messenger,
        message: message.reply_to_message,
        quotation: true,
        author,
    });
    sendFromTelegram({ messenger, message, author });
};
common.discord_reconstructPlainText = (messenger, message, text) => {
    if (!text)
        return "";
    const massMentions = ["@everyone", "@here"];
    if (massMentions.some((massMention) => text.includes(massMention)) &&
        !config.discord.massMentions) {
        massMentions.forEach((massMention) => {
            text = text.replace(new RegExp(massMention, "g"), `\`${massMention}\``);
        });
    }
    let matches = text.replace(/#0000/, "").match(/<[\!&]?@[^# ]{2,32}>/g);
    if (matches && matches[0])
        for (let match of matches) {
            const core = match.replace(/[@<>\!&]/g, "");
            const member = message.channel.guild.members.cache
                .array()
                .find((member) => {
                var _a;
                return (member.nickname || ((_a = member.user) === null || _a === void 0 ? void 0 : _a.username)) &&
                    member.user.id.toLowerCase() === core;
            });
            if (member)
                text = text
                    .replace(/#0000/, "")
                    .replace(match, "@" + (member.nickname || member.user.username));
        }
    matches = text.match(/<#[^# ]{2,32}>/g);
    if (matches && matches[0])
        for (let match of matches) {
            const core = match.replace(/[<>#]/g, "");
            const chan = Object.keys(config.cache[messenger]).filter((i) => config.cache[messenger][i] === core);
            if (chan[0])
                text = text.replace(match, "#" + chan[0]);
        }
    return text;
};
// reconstructs the original raw markdown message
common.telegram_reconstructMarkdown = (msg) => {
    if (!msg.entities)
        return msg;
    return { ...msg, text: fillMarkdownEntitiesMarkup(msg.text, msg.entities) };
    const incrementOffsets = (from, by) => {
        msg.entities.forEach((entity) => {
            if (entity.offset > from)
                entity.offset += by;
        });
    };
    // example markdown:
    // pre `txt` end
    let pre; // contains 'pre '
    let txt; // contains 'txt'
    let end; // contains ' end'
    msg.entities.forEach(({ type, offset, length, url }) => {
        switch (type) {
            case "text_link": // [text](url)
                pre = msg.text.substr(0, offset);
                txt = msg.text.substr(offset, length);
                end = msg.text.substr(offset + length);
                msg.text = `${pre}[${txt}](${url})${end}`;
                incrementOffsets(offset, 4 + url.length);
                break;
            case "code": // ` code
                pre = msg.text.substr(0, offset);
                txt = msg.text.substr(offset, length);
                end = msg.text.substr(offset + length);
                msg.text = `${pre}\`${txt}\`${end}`;
                incrementOffsets(offset, 2);
                break;
            case "pre": // ``` code blocks
                pre = msg.text.substr(0, offset);
                txt = msg.text.substr(offset, length);
                end = msg.text.substr(offset + length);
                msg.text = `${pre}\`\`\`${txt}\`\`\`${end}`;
                incrementOffsets(offset, 6);
            //   break;
            // case "hashtag": // #hashtags can be passed on as is
            // break;
            // default:
            //   console.warn("unsupported entity type:", type, msg);
        }
    });
    return msg;
};
function IsSpam(message) {
    const l = config.spamremover.telegram
        .map((rule) => {
        let matches = true;
        for (const key of Object.keys(rule)) {
            const msg_val = R.path(key.split("."), message);
            if (rule[key] === true && !msg_val)
                matches = false;
            if (typeof rule[key] === "object" &&
                (!msg_val || msg_val.search(new RegExp(rule[key].source, "i")) === -1))
                matches = false;
        }
        return matches;
    })
        .some(Boolean);
    return l;
}
async function sendFromTelegram({ messenger, message, quotation, author, }) {
    if (!message)
        return;
    let action;
    message = generic[messenger].reconstructMarkdown(message);
    //collect attachments
    const jsonMessage = {};
    let i = 0;
    for (const el of [
        "document",
        "photo",
        "new_chat_photo",
        "sticker",
        "video",
        "audio",
        "voice",
        "location",
        "contact",
        "caption",
        "text",
    ]) {
        if (message[el]) {
            jsonMessage[el] = { url: message[el].file_id };
            if (el === "photo") {
                const photo = message[el][message[el].length - 1];
                jsonMessage[el] = {
                    ...jsonMessage[el],
                    url: photo.file_id,
                    width: photo.width,
                    height: photo.height,
                    index: i++,
                };
            }
            else if (el === "sticker") {
                jsonMessage[el] = {
                    ...jsonMessage[el],
                    width: message[el].width,
                    height: message[el].height,
                    index: i++,
                };
            }
            else if (el === "location") {
                jsonMessage[el] = {
                    latitude: message[el]["latitude"],
                    longtitude: message[el]["longtitude"],
                    index: i++,
                };
            }
            else if (el === "contact") {
                jsonMessage[el] = {
                    first_name: message[el]["first_name"],
                    last_name: message[el]["last_name"],
                    phone_number: message[el]["phone_number"],
                    index: i++,
                };
            }
            else if (el === "caption") {
                jsonMessage[el] = {
                    text: message[el],
                    index: 998,
                };
            }
            else if (["video", "voice", "audio"].includes(el)) {
                jsonMessage[el] = {
                    ...jsonMessage[el],
                    duration: message[el].duration,
                    index: i++,
                };
            }
        }
        if (el === "text") {
            message[el] = message[el] || "";
            if (!quotation && message[el].indexOf("/me ") === 0) {
                action = "action";
                message[el] = message[el].split("/me ").slice(1).join("/me ");
            }
            jsonMessage[el] = {
                text: message[el],
                index: 999,
            };
        }
    }
    let arrMessage = Object.keys(jsonMessage).sort((a, b) => jsonMessage[a].index - jsonMessage[b].index);
    // const reply_to_bot =
    //   quotation && message.from.id === config.telegram.myUser.id
    // if (reply_to_bot && jsonMessage["text"] && jsonMessage["text"].text) {
    //   const arrTxtMsg = jsonMessage["text"].text.split(": ")
    //   author = author ?? arrTxtMsg[0]
    //   jsonMessage["text"].text = arrTxtMsg.slice(1).join(": ")
    // } else if (!reply_to_bot) {
    // }
    // now send from Telegram
    for (let i = 0; i < arrMessage.length; i++) {
        const el = arrMessage[i];
        if (el === "text") {
            jsonMessage[el].text = jsonMessage[el].text.replace(`@${config[messenger].myUser.username}`, "");
            if (quotation &&
                jsonMessage[el].text.length > config[messenger].MessageLength)
                jsonMessage[el].text = `${jsonMessage[el].text.substring(0, config[messenger].MessageLength - 1)} ...`;
        }
        if (jsonMessage[el].url)
            [
                jsonMessage[el].url,
                jsonMessage[el].local_file,
            ] = await common.telegram_serveFile(messenger, jsonMessage[el].url);
        const arrForLocal = Object.keys(jsonMessage[el]).map((i) => [
            i,
            jsonMessage[el][i],
        ]);
        const text = common.LocalizeString({
            messenger: "telegram",
            channelId: message.chat.id,
            localized_string_key: `MessageWith.${el}.telegram`,
            arrElemsToInterpolate: arrForLocal,
        });
        const edited = message.edit_date ? true : false;
        sendFrom({
            messenger,
            channelId: message.chat.id,
            author,
            text,
            action,
            quotation,
            file: jsonMessage[el].local_file,
            remote_file: jsonMessage[el].url,
            edited,
        });
    }
}
receivedFrom.vkwall = async (messenger, message) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!config.channelMapping[messenger])
        return;
    const channelId = message.post_id;
    if (!config.channelMapping[messenger][channelId] ||
        "-" + config[messenger].group_id === message.from_id.toString())
        return;
    if (!generic[messenger].client.app) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    let { text, from_id: fromwhomId } = message;
    let [err, res] = await to(generic[messenger].client.bot.api("users.get", {
        user_ids: fromwhomId,
        access_token: config[messenger].token,
        fields: "nickname,screen_name",
    }));
    res = ((_a = res === null || res === void 0 ? void 0 : res.response) === null || _a === void 0 ? void 0 : _a[0]) || fromwhomId;
    const author = AdaptName.vkwall(messenger, res);
    let arrQuotes = [];
    text.replace(/\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g, (match, group_id, post_id) => {
        if (group_id === config[messenger].group_id) {
            arrQuotes.push(post_id);
        }
    });
    if (arrQuotes.length > 0) {
        const token = generic[messenger].client.app.token;
        for (const el of arrQuotes) {
            const opts = {
                access_token: token,
                group_id: config[messenger].group_id,
                topic_id: channelId,
                start_comment_id: el,
                count: 1,
                v: "5.84",
            };
            [err, res] = await to(generic[messenger].client.bot.api("board.getComments", opts));
            let text = (_d = (_c = (_b = res === null || res === void 0 ? void 0 : res.response) === null || _b === void 0 ? void 0 : _b.items) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.text;
            if (!text)
                continue;
            let replyuser;
            const rg = new RegExp(`^\\[club${config.vkwall.group_id}\\|(.*?)\\]: (.*)$`);
            if (rg.test(text)) {
                ;
                [, replyuser, text] = text.match(rg);
            }
            else {
                let authorId = (_g = (_f = (_e = res === null || res === void 0 ? void 0 : res.response) === null || _e === void 0 ? void 0 : _e.items) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.from_id;
                [err, res] = await to(generic[messenger].client.bot.api("users.get", {
                    user_ids: authorId,
                    access_token: config[messenger].token,
                    fields: "nickname,screen_name",
                }));
                replyuser = ((_h = res === null || res === void 0 ? void 0 : res.response) === null || _h === void 0 ? void 0 : _h[0]) || "";
                replyuser = AdaptName.vkwall(messenger, replyuser);
            }
            sendFrom({
                messenger,
                channelId,
                author: replyuser,
                text,
                quotation: true,
            });
        }
    }
    const attachments = message.attachments || [];
    let texts = [];
    if (attachments.length > 0) {
        for (let a of attachments) {
            switch (a.type) {
                case "photo":
                case "posted_photo":
                    try {
                        const sizes = a.photo.sizes
                            .map((i) => {
                            i.square = i.width * i.height;
                            return i;
                        })
                            .sort((d, c) => parseFloat(c.size) - parseFloat(d.size));
                        texts.push(sizes[0].url);
                        texts.push(a.photo.text);
                    }
                    catch (e) { }
                    break;
                case "doc":
                    try {
                        texts.push(a.doc.url);
                    }
                    catch (e) { }
                    break;
            }
        }
    }
    texts.filter(Boolean).map((mini) => {
        sendFrom({
            messenger,
            edited: message.edited,
            channelId,
            author,
            text: mini,
        });
    });
    sendFrom({
        messenger,
        edited: message.edited,
        channelId,
        author,
        text,
    });
};
receivedFrom.vkboard = async (messenger, message) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!config.channelMapping[messenger])
        return;
    const channelId = message.topic_id;
    if (!config.channelMapping[messenger][channelId] ||
        message.topic_owner_id === message.from_id)
        return;
    if (!generic[messenger].client.app) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    let text = message.text;
    const fromwhomId = message.from_id;
    let [err, res] = await to(generic[messenger].client.bot.api("users.get", {
        user_ids: fromwhomId,
        access_token: config[messenger].token,
        fields: "nickname,screen_name",
    }));
    res = ((_a = res === null || res === void 0 ? void 0 : res.response) === null || _a === void 0 ? void 0 : _a[0]) || fromwhomId;
    const author = AdaptName.vkboard(messenger, res);
    let arrQuotes = [];
    text.replace(/\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g, (match, group_id, post_id) => {
        if (group_id === config[messenger].group_id) {
            arrQuotes.push(post_id);
        }
    });
    if (arrQuotes.length > 0) {
        const token = generic[messenger].client.app.token;
        for (const el of arrQuotes) {
            const opts = {
                access_token: token,
                group_id: config[messenger].group_id,
                topic_id: channelId,
                start_comment_id: el,
                count: 1,
                v: "5.84",
            };
            [err, res] = await to(generic[messenger].client.bot.api("board.getComments", opts));
            let text = (_d = (_c = (_b = res === null || res === void 0 ? void 0 : res.response) === null || _b === void 0 ? void 0 : _b.items) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.text;
            if (!text)
                continue;
            let replyuser;
            const rg = new RegExp(`^\\[club${config[messenger].group_id}\\|(.*?)\\]: (.*)$`);
            if (rg.test(text)) {
                ;
                [, replyuser, text] = text.match(rg);
            }
            else {
                let authorId = (_g = (_f = (_e = res === null || res === void 0 ? void 0 : res.response) === null || _e === void 0 ? void 0 : _e.items) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.from_id;
                [err, res] = await to(generic[messenger].client.bot.api("users.get", {
                    user_ids: authorId,
                    access_token: config.vkboard.token,
                    fields: "nickname,screen_name",
                }));
                replyuser = ((_h = res === null || res === void 0 ? void 0 : res.response) === null || _h === void 0 ? void 0 : _h[0]) || "";
                replyuser = AdaptName.vkboard(messenger, replyuser);
            }
            sendFrom({
                messenger,
                channelId,
                author: replyuser,
                text,
                quotation: true,
            });
        }
    }
    const attachments = message.attachments || [];
    let texts = [];
    if (attachments.length > 0) {
        for (let a of attachments) {
            switch (a.type) {
                case "photo":
                case "posted_photo":
                    try {
                        const sizes = a.photo.sizes
                            .map((i) => {
                            i.square = i.width * i.height;
                            return i;
                        })
                            .sort((d, c) => parseFloat(c.size) - parseFloat(d.size));
                        texts.push(sizes[0].url);
                        texts.push(a.photo.text);
                    }
                    catch (e) { }
                    break;
                case "doc":
                    try {
                        texts.push(a.doc.url);
                    }
                    catch (e) { }
                    break;
            }
        }
    }
    texts.filter(Boolean).map((mini) => {
        sendFrom({
            messenger,
            edited: message.edited,
            channelId,
            author,
            text: mini,
        });
    });
    sendFrom({
        messenger,
        edited: message.edited,
        channelId,
        author,
        text,
    });
};
receivedFrom.slack = async (messenger, message) => {
    var _a, _b;
    if (!config.channelMapping[messenger])
        return;
    if (message.subtype === "message_changed" &&
        ((_a = message === null || message === void 0 ? void 0 : message.message) === null || _a === void 0 ? void 0 : _a.text) === ((_b = message === null || message === void 0 ? void 0 : message.previous_message) === null || _b === void 0 ? void 0 : _b.text) &&
        ((message === null || message === void 0 ? void 0 : message.files) || []).length === 0)
        return;
    if ((message.subtype &&
        !["me_message", "channel_topic", "message_changed"].includes(message.subtype)) ||
        generic[messenger].client.rtm.activeUserId === message.user)
        return;
    if (!message.user && message.message) {
        if (!message.message.user)
            return;
        message.user = message.message.user;
        message.text = message.message.text;
    }
    const edited = message.subtype === "message_changed" ? true : false;
    const promUser = generic[messenger].client.web.users.info({
        user: message.user,
    });
    const promChannel = generic[messenger].client.web.conversations.info({
        channel: message.channel,
    });
    const promFiles = (message.files || []).map((file) => common.downloadFile({
        messenger,
        type: "slack",
        remote_path: file.url_private,
    }));
    let err, user, chan, files;
    [err, user] = await to(promUser);
    if (err)
        user = message.user;
    [err, chan] = await to(promChannel);
    if (err)
        chan = message.channel;
    [err, files] = await to(Promise.all(promFiles));
    if (err)
        files = [];
    const author = AdaptName.slack(messenger, user);
    const channelId = chan.channel.name || message.channel;
    let action;
    if (message.subtype === "me_message")
        action = "action";
    if (message.subtype === "channel_topic" &&
        message.topic &&
        message.topic !== "") {
        action = "topic";
        message.text = common.LocalizeString({
            messenger: "slack",
            channelId,
            localized_string_key: "topic",
            arrElemsToInterpolate: [["topic", message.topic]],
        });
    }
    if (files.length > 0)
        files.map(([file, localfile]) => {
            sendFrom({
                messenger,
                channelId,
                author,
                text: file,
                remote_file: file,
                file: localfile,
                edited,
            });
        });
    if (message.text && !message.topic) {
        sendFrom({
            messenger,
            channelId,
            author,
            text: message.text,
            action,
            edited,
        });
    }
};
receivedFrom.mattermost = async (messenger, message) => {
    var _a, _b, _c, _d, _e, _f;
    // log("mattermost")(message);
    // if (process.env.log)
    //   logger.log({
    //     level: "info",
    //     message: JSON.stringify(message)
    //   });
    if (!config.channelMapping[messenger])
        return;
    let channelId, msgText, author, file_ids, postParsed;
    if (message.event === "post_edited") {
        const post = JSON.parse(((_a = message.data) === null || _a === void 0 ? void 0 : _a.post) || "");
        if (!post.id)
            return;
        message.event = "posted";
        message.edited = true;
        let err;
        [err] = await to(new Promise((resolve) => {
            const url = `${config[messenger].ProviderUrl}/api/v4/posts/${post.id}`;
            request({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config[messenger].token}`,
                },
            }, (error, response, body) => {
                if (error) {
                    console.error(error.toString());
                }
                else {
                    msgText = JSON.parse(body).message;
                    file_ids = JSON.parse(body).file_ids;
                }
                resolve(null);
            });
        }));
        if (err)
            console.error(err.toString());
        [err] = await to(new Promise((resolve) => {
            const url = `${config[messenger].ProviderUrl}/api/v4/users/${post.user_id}`;
            request({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config[messenger].token}`,
                },
            }, (error, response, body) => {
                if (error) {
                    console.error(error.toString());
                }
                else {
                    body = JSON.parse(body);
                    author = body.username || body.nickname || body.first_name || "";
                }
                resolve(null);
            });
        }));
        if (err)
            console.error(err.toString());
        [err] = await to(new Promise((resolve) => {
            const url = `${config[messenger].ProviderUrl}/api/v4/channels/${post.channel_id}`;
            request({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config[messenger].token}`,
                },
            }, (error, response, body) => {
                const json = {};
                if (error) {
                    console.error(error.toString());
                }
                else {
                    channelId = JSON.parse(body).name;
                }
                resolve(null);
            });
        }));
        if (err)
            console.error(err.toString());
    }
    else {
        message.edited = false;
        if (((_b = message.data) === null || _b === void 0 ? void 0 : _b.team_id) !== config[messenger].team_id)
            return;
        if (message.event !== "posted")
            return;
        const post = (_c = message.data) === null || _c === void 0 ? void 0 : _c.post;
        if (!post)
            return;
        postParsed = JSON.parse(post);
        channelId = (_d = message.data) === null || _d === void 0 ? void 0 : _d.channel_name;
    }
    if (config.channelMapping[messenger][channelId] &&
        !((_e = postParsed === null || postParsed === void 0 ? void 0 : postParsed.props) === null || _e === void 0 ? void 0 : _e.from_webhook) &&
        ((postParsed === null || postParsed === void 0 ? void 0 : postParsed.type) || "") === "") {
        if (!file_ids)
            file_ids = (postParsed === null || postParsed === void 0 ? void 0 : postParsed.file_ids) || [];
        let files = [];
        for (const file of file_ids) {
            const [err, promfile] = await to(new Promise((resolve) => {
                const url = `${config[messenger].ProviderUrl}/api/v4/files/${file}/link`;
                request({
                    method: "GET",
                    url,
                    headers: {
                        Authorization: `Bearer ${config[messenger].token}`,
                    },
                }, (error, response, body) => {
                    const json = {};
                    if (error) {
                        console.error(error.toString());
                        resolve(null);
                    }
                    else {
                        resolve(JSON.parse(body).link);
                    }
                });
            }));
            if (err)
                console.error(err.toString());
            const [err2, promfile2] = await to(new Promise((resolve) => {
                const url = `${config[messenger].ProviderUrl}/api/v4/files/${file}/info`;
                request({
                    method: "GET",
                    url,
                    headers: {
                        Authorization: `Bearer ${config[messenger].token}`,
                    },
                }, (error, response, body) => {
                    const json = {};
                    if (error) {
                        console.error(error.toString());
                        resolve(null);
                    }
                    else {
                        resolve(JSON.parse(body).extension);
                    }
                });
            }));
            if (err2)
                console.error(err.toString());
            if (promfile && promfile2)
                files.push([promfile2, promfile]);
        }
        author = author || ((_f = message.data) === null || _f === void 0 ? void 0 : _f.sender_name);
        author = author.replace(/^@/, "");
        if (files.length > 0) {
            for (const [extension, file] of files) {
                const [file_, localfile] = await common.downloadFile({
                    type: "simple",
                    remote_path: file,
                    extension,
                });
                sendFrom({
                    messenger: "mattermost",
                    channelId,
                    author,
                    text: file_,
                    file: localfile,
                    remote_file: file_,
                    edited: message.edited,
                });
            }
        }
        let action;
        //todo; handle mattermost actions
        sendFrom({
            messenger: "mattermost",
            channelId,
            author,
            text: msgText || (postParsed === null || postParsed === void 0 ? void 0 : postParsed.message),
            action,
            edited: message.edited,
        });
    }
};
receivedFrom.irc = async (messenger, { author, channelId, text, handler, error, type, }) => {
    var _a, _b, _c;
    if (!(config === null || config === void 0 ? void 0 : config.channelMapping[messenger]))
        return;
    if (type === "message") {
        if (text.search(new RegExp(config.spamremover.irc.source, "i")) >= 0)
            return;
        text = ircolors.stripColorsAndStyle(text);
        text = `<${ircolors
            .stripColorsAndStyle(author)
            .replace(/_+$/g, "")}>: ${text}`;
        if (!((_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping[messenger]) === null || _a === void 0 ? void 0 : _a[channelId]) === null || _b === void 0 ? void 0 : _b.settings) === null || _c === void 0 ? void 0 : _c.dontProcessOtherBridges)) {
            text = text
                .replace(/^<[^ <>]+?>: <([^<>]+?)> ?: /, "*$1*: ")
                .replace(/^<[^ <>]+?>: &lt;([^<>]+?)&gt; ?: /, "*$1*: ");
        }
        text = text
            .replace(/^<([^<>]+?)>: /, "*$1*: ")
            .replace(/^\*([^<>]+?)\*: /, "<b>$1</b>: ");
        [, author, text] = text.match(/^<b>(.+?)<\/b>: (.*)/);
        if (text && text !== "") {
            sendFrom({
                messenger: "irc",
                channelId,
                author,
                text,
            });
        }
    }
    else if (type === "action") {
        sendFrom({
            messenger,
            channelId,
            author,
            text,
            action: "action",
        });
    }
    else if (type === "topic") {
        const topic = common.LocalizeString({
            messenger,
            channelId,
            localized_string_key: type,
            arrElemsToInterpolate: [[type, text]],
        });
        if (!config.channelMapping[messenger][channelId])
            return;
        if (!topic ||
            !config[messenger].sendTopic ||
            // ignore first topic event when joining channel and unchanged topics
            // (should handle rejoins)
            !config.channelMapping[messenger][channelId].previousTopic ||
            config.channelMapping[messenger][channelId].previousTopic === text) {
            config.channelMapping[messenger][channelId].previousTopic = text;
            return;
        }
        sendFrom({
            messenger,
            channelId,
            author: author.split("!")[0],
            text: topic,
            action: "topic",
        });
    }
    else if (type === "error") {
        console.error `IRC ERROR:`;
        console.error(error);
        //todo: restart irc
    }
    else if (type === "registered") {
        config[messenger].ircPerformCmds.forEach((cmd) => {
            handler.send.apply(null, cmd.split(" "));
        });
        config[messenger].ircOptions.channels.forEach((channel) => {
            handler.join(channel);
        });
    }
};
// AdaptName
AdaptName.discord = (messenger, message) => {
    var _a, _b;
    return ((_a = message.member) === null || _a === void 0 ? void 0 : _a.nickname) || ((_b = message.author) === null || _b === void 0 ? void 0 : _b.username);
};
AdaptName.facebook = (user) => user.name; // || user.vanity || user.firstName;
AdaptName.telegram = (messenger, name) => config[messenger].userMapping[name] || name;
AdaptName.vkboard = (messenger, user) => {
    let full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    if (full_name === "")
        full_name = undefined;
    if (user.nickname && user.nickname.length < 1)
        user.nickname = null;
    if (user.screen_name && user.screen_name.length < 1)
        user.screen_name = null;
    return user.screen_name || user.nickname || full_name || user.id;
};
AdaptName.vkwall = AdaptName.vkboard;
AdaptName.slack = (messenger, user) => { var _a, _b, _c, _d; return ((_b = (_a = user === null || user === void 0 ? void 0 : user.user) === null || _a === void 0 ? void 0 : _a.profile) === null || _b === void 0 ? void 0 : _b.display_name) || ((_c = user === null || user === void 0 ? void 0 : user.user) === null || _c === void 0 ? void 0 : _c.real_name) || ((_d = user === null || user === void 0 ? void 0 : user.user) === null || _d === void 0 ? void 0 : _d.name); };
// GetName
GetName.telegram = (messenger, user) => {
    let name = config[messenger].nameFormat;
    if (user.username) {
        name = name.replace("%username%", user.username, "g");
        name = AdaptName.telegram(messenger, name);
    }
    else {
        // if user lacks username, use fallback format string instead
        name = name.replace("%username%", config.telegram.usernameFallbackFormat, "g");
    }
    name = name.replace("%firstName%", user.first_name || "", "g");
    name = name.replace("%lastName%", user.last_name || "", "g");
    // get rid of leading and trailing whitespace
    name = name.replace(/(^\s*)|(\s*$)/g, "");
    return name;
};
convertFrom.slack = async ({ text, messenger, }) => {
    const source = text;
    const RE_ALPHANUMERIC = new RegExp("^\\w?$"), RE_TAG = new RegExp("<(.+?)>", "g"), RE_BOLD = new RegExp("\\*([^\\*]+?)\\*", "g"), RE_ITALIC = new RegExp("_([^_]+?)_", "g"), RE_FIXED = new RegExp("(?<!`)`([^`]+?)`(?!`)", "g"), RE_MULTILINE_FIXED = new RegExp("```((?:(?!```)[\\s\\S])+?)```", "gm");
    const pipeSplit = (payload) => payload.split `|`;
    const payloads = (tag, start) => {
        if (!start)
            start = 0;
        const length = tag.length;
        return pipeSplit(tag.substr(start, length - start));
    };
    const tag = (tag, attributes, payload) => {
        if (!payload) {
            payload = attributes;
            attributes = {};
        }
        let html = "<".concat(tag);
        for (const attribute in attributes) {
            if (attributes.hasOwnProperty(attribute))
                html = html.concat(" ", attribute, '="', attributes[attribute], '"');
        }
        return html.concat(">", payload, "</", tag, ">");
    };
    const matchTag = (match) => {
        const action = match[1].substr(0, 1);
        let p;
        switch (action) {
            case "!":
                return tag("span", { class: "slack-cmd" }, payloads(match[1], 1)[0]);
            case "#":
                p = payloads(match[1], 2);
                return tag("span", { class: "slack-channel" }, p.length === 1 ? p[0] : p[1]);
            case "@":
                p = payloads(match[1], 2);
                return tag("span", { class: "slack-user" }, p.length === 1 ? p[0] : p[1]);
            default:
                p = payloads(match[1]);
                return tag("a", { href: p[0] }, p.length === 1 ? p[0] : p[1]);
        }
    };
    const safeMatch = (match, tag, trigger) => {
        let prefix_ok = match.index === 0;
        let postfix_ok = match.index === match.input.length - match[0].length;
        if (!prefix_ok) {
            const charAtLeft = match.input.substr(match.index - 1, 1);
            prefix_ok =
                notAlphanumeric(charAtLeft) && notRepeatedChar(trigger, charAtLeft);
        }
        if (!postfix_ok) {
            const charAtRight = match.input.substr(match.index + match[0].length, 1);
            postfix_ok =
                notAlphanumeric(charAtRight) && notRepeatedChar(trigger, charAtRight);
        }
        if (prefix_ok && postfix_ok)
            return tag;
        return false;
    };
    const matchBold = (match) => safeMatch(match, tag("strong", payloads(match[1])), "*");
    const matchItalic = (match) => safeMatch(match, tag("em", payloads(match[1])), "_");
    const matchFixed = (match) => safeMatch(match, tag("code", payloads(match[1])));
    const matchPre = (match) => safeMatch(match, tag("pre", payloads(match[1])));
    const notAlphanumeric = (input) => !RE_ALPHANUMERIC.test(input);
    const notRepeatedChar = (trigger, input) => !trigger || trigger !== input;
    async function parseSlackText(text) {
        const jsonChannels = {};
        const jsonUsers = {};
        text.replace(/<#(C\w+)\|?(\w+)?>/g, (match, channelId, readable) => {
            jsonChannels[channelId] = channelId;
            return channelId;
        });
        text.replace(/<@(U\w+)\|?(\w+)?>/g, (match, userId, readable) => {
            jsonUsers[userId] = userId;
            return userId;
        });
        for (const channelId of Object.keys(jsonChannels)) {
            const [err, { channel }] = await to(generic[messenger].client.web.conversations.info({ channel: channelId }));
            if (!err) {
                jsonChannels[channelId] = channel.name;
            }
            else {
                log("slack")({
                    error: err,
                });
            }
        }
        for (const userId of Object.keys(jsonUsers)) {
            const [err, user] = await to(generic[messenger].client.web.users.info({ user: userId }));
            if (err) {
                log("slack")({
                    error: err,
                });
            }
            jsonUsers[userId] = AdaptName.slack(messenger, user);
        }
        return (emoji
            .emojify(text)
            .replace(/<pre>\\n/g, "<pre>")
            .replace(":simple_smile:", ":)")
            .replace(/<!channel>/g, "@channel")
            .replace(/<!group>/g, "@group")
            .replace(/<!everyone>/g, "@everyone")
            .replace(/<#(C\w+)\|?(\w+)?>/g, (match, channelId, readable) => {
            return `#${readable || jsonChannels[channelId]}`;
        })
            .replace(/<@(U\w+)\|?(\w+)?>/g, (match, userId, readable) => {
            return `@${readable || jsonUsers[userId]}`;
        })
            .replace(/<(?!!)([^|]+?)>/g, (match, link) => link)
            .replace(/<!(\w+)\|?(\w+)?>/g, (match, command, label) => `<${label || command}>`)
            // .replace(/:(\w+):/g, (match: any, emoji: any) => {
            //   if (emoji in emojis) return emojis[emoji];
            //   return match;
            // })
            .replace(/<.+?\|(.+?)>/g, (match, readable) => readable));
    }
    const publicParse = async (text) => {
        const patterns = [
            { p: RE_TAG, cb: matchTag },
            { p: RE_BOLD, cb: matchBold },
            { p: RE_ITALIC, cb: matchItalic },
            { p: RE_MULTILINE_FIXED, cb: matchPre },
            { p: RE_FIXED, cb: matchFixed },
        ];
        text = await parseSlackText(text);
        for (const pattern of patterns) {
            const original = text;
            let result;
            while ((result = pattern.p.exec(original)) !== null) {
                const replace = pattern.cb(result);
                if (replace)
                    text = text.replace(result[0], replace);
            }
        }
        return text;
    };
    // text = common.escapeHTML(text);
    const [error, result] = await to(publicParse(text));
    log("slack")({
        "converting source text": source,
        result: result || text,
        error,
    });
    return result || text;
};
convertFrom.facebook = async ({ text, messenger, }) => common.escapeHTML(text);
convertFrom.telegram = async ({ text, messenger, }) => {
    const res = markedParse({
        text: common.escapeHTML(text).replace(/<p><code>([\s\S]*?)<\/code><\/p>/gim, "<p><pre>$1</pre></p>"),
        messenger: "telegram",
    });
    return res;
};
convertFrom.vkboard = async ({ text, messenger, }) => common.escapeHTML(text).replace(/\[[^\]]*\|(.*?)\](, ?)?/g, "");
convertFrom.vkwall = convertFrom.vkboard;
convertFrom.mattermost = async ({ text, messenger, }) => markedParse({
    text: common.escapeHTML(text),
    messenger: "mattermost",
    unescapeCodeBlocks: true,
});
convertFrom.discord = async ({ text, messenger, }) => {
    const result = discordParser.toHTML(text);
    log(messenger)({
        messenger,
        "converting text": text,
        result,
    });
    return result;
};
// markedParse({
//   text: text.replace(/^(>[^\n]*?\n)/gm, "$1\n").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
//   messenger: "discord",
//   dontEscapeBackslash: true
// });
convertFrom.webwidget = async ({ text, messenger, }) => text;
convertFrom.irc = async ({ text, messenger, }) => {
    const result = common.escapeHTML(text)
        .replace(/\*\b(\w+)\b\*/g, "<b>$1</b>")
        .replace(/_\b(\w+)\b_/g, "<i>$1</i>")
        .replace(/\*/g, "&#42;")
        .replace(/_/g, "&#95;")
        .replace(/`/g, "&#96;");
    log(messenger)({
        messenger,
        "converting text": text,
        result,
    });
    return result;
};
async function convertToPlainText(text) {
    let a = await common.unescapeHTML({
        text: text
            .replace(/<strong>(.+?)<\/strong>/g, "*$1*")
            .replace(/<b>(.+?)<\/b>/g, "*$1*")
            .replace(/<em>(.+?)<\/em>/g, "_$1_")
            .replace(/<i>(.+?)<\/i>/g, "_$1_")
            .replace(/<blockquote>([\s\S]*?[\n\r]?)<\/blockquote>/gm, "> $1\n")
            .replace(/<br\/?>/gi, "\n")
            .replace(/<a.*?href="(.+?)".*?>(.+?)<\/a>/gi, (...arr) => {
            const url = arr[1];
            const name = arr[2];
            if (url !== name)
                return `${name} (${url})`;
            return " " + url;
        })
            .replace(/<(?:.|\s)*?>/g, "")
            .trim(),
        convertHtmlEntities: true,
    });
    if (a.split(/\r\n|\r|\n/).length > 1) {
        a = "\n" + a;
    }
    return a;
}
convertTo.facebook = async ({ text, messenger, messengerTo, }) => convertToPlainText(text);
convertTo.telegram = async ({ text, messenger, messengerTo, }) => {
    const result = common
        .sanitizeHtml(text
        .replace(/<blockquote>\n<p>([\s\S]*?)<\/p>\n<\/blockquote>/gim, "<pre>$1</pre>")
        .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gim, "<pre>$1</pre>"), [
        "b",
        "strong",
        "i",
        "pre",
        "code",
        "a",
        "em",
        "u",
        "ins",
        "s",
        "br",
        "del",
    ])
        .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gim, "<pre>$1</pre>")
        .replace(/<br( \/|)>/g, "\n");
    log(messenger)({
        messengerTo,
        "converting text": text,
        result,
    });
    return result;
};
convertTo.vkboard = async ({ text, messenger, messengerTo, }) => {
    const result = await common.unescapeHTML({
        text: html2irc(text),
        convertHtmlEntities: false,
    });
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
convertTo.vkwall = convertTo.vkboard;
convertTo.slack = async ({ text, messenger, messengerTo, }) => {
    const result = html2slack(text);
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
convertTo.mattermost = async ({ text, messenger, messengerTo, }) => {
    const result = await common.unescapeHTML({
        text: html2md.convert({
            string: text,
            hrefConvert: false,
            dialect: messengerTo,
        }),
        convertHtmlEntities: true,
    });
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
convertTo.discord = async ({ text, messenger, messengerTo, }) => {
    const result = await common.unescapeHTML({
        text: html2md.convert({
            string: text
                .replace(/&#x2A;/g, "&#x5C;&#x2A;")
                .replace(/&#x5F;/g, "&#x5C;&#x5F;"),
            hrefConvert: false,
            dialect: messengerTo,
        }),
        convertHtmlEntities: true,
        escapeBackslashes: false,
    });
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
convertTo.webwidget = async ({ text, messenger, messengerTo, }) => text;
convertTo.irc = async ({ text, messenger, messengerTo, }) => {
    const result = await common.unescapeHTML({
        text: html2irc(text),
        convertHtmlEntities: true,
    });
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
// common.telegram
common.telegram_serveFile = (messenger, fileId) => common.downloadFile({
    messenger,
    type: "telegram",
    fileId,
});
common.writeCache = async ({ channelName, channelId, action, }) => {
    await new Promise((resolve) => {
        fs.writeFile(`${cache_folder}/cache.json`, JSON.stringify(config.cache), (err) => {
            if (err)
                action = "error " + err.toString();
            console.log(`
          action: ${action}\n
          channel Name: ${channelName}\n
          channel Id: ${channelId}
          `);
            resolve(null);
        });
    });
};
function xovahelojbo({ text }) {
    const arrText = text.split(" ");
    const xovahe = arrText.filter((i) => lojban.ilmentufa_off("lo'u " + i + " le'u").tcini === "snada").length / arrText.length;
    return xovahe;
}
async function TelegramRemoveSpam(messenger, message) {
    const cloned_message = JSON.parse(JSON.stringify(message));
    if (IsSpam(cloned_message)) {
        if (message.text && message.text.search(/\bt\.me\b/) >= 0) {
            const [err, chat] = await to(generic[messenger].client.getChat(message.chat.id));
            if (!err) {
                const invite_link = chat.invite_link;
                cloned_message.text = cloned_message.text.replace(invite_link, "");
                if (IsSpam(cloned_message))
                    common.telegram_DeleteMessage({ messenger, message, log: true });
            }
            else {
                common.LogToAdmin(`error on getting an invite link of the chat ${message.chat.id} ${message.chat.title}`);
            }
        }
        else {
            const [err, chat] = await to(generic[messenger].client.getChat(cloned_message.chat.id));
            if (!err) {
                common.telegram_DeleteMessage({ messenger, message, log: true });
            }
            else {
                common.LogToAdmin(`error on getting an invite link of the chat ${cloned_message.chat.id} ${cloned_message.chat.title}`);
            }
        }
        return true;
    }
    else if (message.chat.title === "jbosnu" && message.text) {
        // dealing with non-lojban spam
        const xovahe = xovahelojbo({ text: message.text });
        if (xovahe < 0.5) {
            generic[messenger].client
                .sendMessage(message.chat.id, ".i mi smadi le du'u do na tavla fo su'o lojbo .i ja'e bo mi na benji di'u fi la IRC\n\nIn this group only Lojban is allowed. Try posting your question to [#lojban](https://t.me/joinchat/BLVsYz3hCF8mCAb6fzW1Rw) or [#ckule](https://telegram.me/joinchat/BLVsYz4hC9ulWahupDLovA) (school) group", {
                reply_to_message_id: message.message_id,
                parse_mode: "Markdown",
            })
                .catch((e) => log("telegram")({
                error: e.toString(),
            }));
            return true;
        }
    }
}
function TelegramRemoveAddedBots(messenger, message) {
    if (config[messenger].remove_added_bots)
        ((message === null || message === void 0 ? void 0 : message.new_chat_members) || []).map((u) => {
            var _a, _b;
            if (u.is_bot && ((_b = (_a = config === null || config === void 0 ? void 0 : config.telegram) === null || _a === void 0 ? void 0 : _a.myUser) === null || _b === void 0 ? void 0 : _b.id) !== u.id)
                generic[messenger].client
                    .kickChatMember(message.chat.id, u.id)
                    .catch(catchError);
        });
}
function TelegramRemoveNewMemberMessage(messenger, message) {
    if ((message === null || message === void 0 ? void 0 : message.left_chat_member) ||
        ((message === null || message === void 0 ? void 0 : message.new_chat_members) || []).filter((u) => (u.username || "").length > 100 ||
            (u.first_name || "").length > 100 ||
            (u.last_name || "").length > 100).length > 0) {
        common.telegram_DeleteMessage({ messenger, message, log: false });
    }
    if (message.left_chat_member || message.new_chat_members)
        return true;
    return false;
}
async function TelegramLeaveChatIfNotAdmin(messenger, message) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (!["group", "supergroup"].includes((_a = message === null || message === void 0 ? void 0 : message.chat) === null || _a === void 0 ? void 0 : _a.type) ||
        !((_b = message === null || message === void 0 ? void 0 : message.chat) === null || _b === void 0 ? void 0 : _b.id) ||
        !((_c = config[messenger].myUser) === null || _c === void 0 ? void 0 : _c.id))
        return;
    let [err, res] = await to(generic[messenger].client.getChatMember(message.chat.id, config.telegram.myUser.id));
    if (!res)
        return true;
    if (!res.can_delete_messages) {
        ;
        [err, res] = await to(generic[messenger].client.leaveChat(message.chat.id));
        const jsonMessage = {
            id: ((_d = message === null || message === void 0 ? void 0 : message.chat) === null || _d === void 0 ? void 0 : _d.id) || ((_e = message === null || message === void 0 ? void 0 : message.from) === null || _e === void 0 ? void 0 : _e.id),
            title: (_f = message === null || message === void 0 ? void 0 : message.chat) === null || _f === void 0 ? void 0 : _f.title,
            first_name: (_g = message === null || message === void 0 ? void 0 : message.from) === null || _g === void 0 ? void 0 : _g.first_name,
            last_name: (_h = message === null || message === void 0 ? void 0 : message.from) === null || _h === void 0 ? void 0 : _h.last_name,
            username: (_j = message === null || message === void 0 ? void 0 : message.from) === null || _j === void 0 ? void 0 : _j.username,
            message: message === null || message === void 0 ? void 0 : message.text,
        };
        common.LogToAdmin(`leaving chat ${JSON.stringify(jsonMessage)}`);
        config.cache[messenger][message.chat.title] = undefined;
        await to(common.writeCache({
            channelName: message.chat.title,
            channelId: message.chat.id,
            action: "leave",
        }));
        return true;
    }
    return false;
}
common.telegram_DeleteMessage = async ({ messenger, message, log, }) => {
    if (log)
        await to(common.LogMessageToAdmin(messenger, message));
    await to(generic[messenger].client.deleteMessage(message.chat.id, message.message_id));
};
// common
common.ConfigBeforeStart = () => {
    if (process.argv[2] === "--genconfig") {
        mkdir(cache_folder);
        // read default config using readFile to include comments
        const config = fs.readFileSync(defaults);
        const configPath = `${cache_folder}/config.js`;
        fs.writeFileSync(configPath, config);
        throw new Error(`Wrote default configuration to ${configPath}, please edit it before re-running`);
    }
    let config;
    try {
        config = require(`${cache_folder}/config.js`);
    }
    catch (e) {
        throw new Error(`ERROR while reading config:\n${e}\n\nPlease make sure ` +
            'it exists and is valid. Run "node bridge --genconfig" to ' +
            "generate a default config.");
    }
    const defaultConfig = require(defaults);
    config = R.mergeDeepLeft(config, defaultConfig);
    const localConfig = require("/home/app/1chat/src/local/dict.json");
    return [config, localConfig];
};
NewChannelAppeared.telegram = async ({ messenger, channelName, channelId, }) => {
    config.cache[messenger][channelName] = channelId;
    let [err, res] = await to(common.writeCache({ channelName, channelId, action: "join" }));
    if (err) {
        console.error(err);
        return;
    }
    ;
    [err, res] = await to(common.PopulateChannelMapping());
    if (err)
        common.LogToAdmin(`got problem in the new telegram chat ${channelName}, ${channelId}`);
    if (err) {
        console.error(err);
        return;
    }
    return true;
};
common.getMessengersWithPrefix = async (prefix) => {
    return Object.keys(config.MessengersAvailable).filter((el) => el.indexOf(prefix + "_") === 0);
};
GetChannels.telegram = async (pier) => {
    //read from file
    let res = {};
    try {
        res = JSON.parse(fs.readFileSync(`${cache_folder}/cache.json`))[pier];
    }
    catch (error) { }
    config.cache[pier] = res;
};
GetChannels.slack = async (pier) => {
    let [err, res] = await to(generic[pier].client.web.conversations.list());
    if (err) {
        console.error(err);
    }
    res = (res === null || res === void 0 ? void 0 : res.channels) || [];
    const json = {};
    res.map((i) => {
        json[i.name] = i.name;
    });
    config.cache[pier] = json;
};
GetChannels.mattermost = async (pier) => {
    let json = {};
    let url = `${config[pier].ProviderUrl}/api/v4/teams/${config[pier].team_id}/channels`;
    json = await GetChannelsMattermostCore(pier, json, url);
    url = `${config[pier].ProviderUrl}/api/v4/users/${config[pier].user_id}/teams/${config[pier].team_id}/channels`;
    json = await GetChannelsMattermostCore(pier, json, url);
    config.cache[pier] = json;
};
GetChannels.discord = async (pier) => {
    const json = {};
    for (const value of generic[pier].client.channels.cache.values()) {
        if (value.guild.id === config[pier].guildId) {
            json[value.name] = value.id;
        }
    }
    config.cache[pier] = json;
};
async function GetChannelsMattermostCore(messenger, json, url) {
    await to(new Promise((resolve) => {
        request({
            method: "GET",
            url,
            headers: {
                Authorization: `Bearer ${config[messenger].token}`,
            },
        }, (error, response, body) => {
            if (error) {
                console.error(error.toString());
            }
            else {
                body = JSON.parse(body);
                if (body[0]) {
                    body.map((i) => {
                        json[i.name] = i.name;
                    });
                }
            }
            resolve(null);
        });
    }));
    return json;
}
async function PopulateChannelMappingCore({ messenger, }) {
    if (!config.MessengersAvailable[messenger])
        return;
    if (!config.channelMapping[messenger])
        config.channelMapping[messenger] = {};
    const arrMappingKeys = Object.keys(config.MessengersAvailable);
    config.new_channels.map((i) => {
        var _a, _b, _c, _d;
        let i_mapped = i[messenger];
        if (config.cache[messenger])
            i_mapped = (_b = (_a = config === null || config === void 0 ? void 0 : config.cache) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[i[messenger]];
        if (!i_mapped)
            return;
        const mapping = {
            settings: {
                readonly: i[`${messenger}-readonly`],
                dontProcessOtherBridges: i[`${messenger}-dontProcessOtherBridges`],
                language: i["language"],
                nickcolor: i[`${messenger}-nickcolor`],
                name: i[messenger],
            },
        };
        for (const key of arrMappingKeys)
            mapping[key] = ((_d = (_c = config === null || config === void 0 ? void 0 : config.cache) === null || _c === void 0 ? void 0 : _c[key]) === null || _d === void 0 ? void 0 : _d[i[key]]) || i[key];
        config.channelMapping[messenger][i_mapped] = R.mergeDeepLeft(mapping, config.channelMapping[messenger][i_mapped] || {});
    });
}
common.PopulateChannelMapping = async () => {
    if (!config.channelMapping)
        config.channelMapping = {};
    if (!config.cache)
        config.cache = {};
    const arrAvailableMessengers = Object.keys(config.MessengersAvailable).filter((i) => !!config.MessengersAvailable[i]);
    for (const pier of arrAvailableMessengers) {
        const messenger = common.root_of_messenger(pier);
        if (GetChannels[messenger])
            await GetChannels[messenger]();
    }
    for (const pier of arrAvailableMessengers) {
        await PopulateChannelMappingCore({ messenger: pier });
    }
    // console.log(
    //   "started services with these channel mapping:\n",
    //   JSON.stringify(config.channelMapping, null, 2)
    // );
};
common.root_of_messenger = (messenger_with_index) => messenger_with_index.replace(/_.*/g, '').replace(/_.*/g, '');
common.MessengersAvailable = () => {
    config.MessengersAvailable = {};
    config.new_channels.forEach((i) => {
        Object.keys(i).filter((a) => a.indexOf("-") === -1 && a.indexOf("_") > 0).forEach((a) => config.MessengersAvailable[a] = true);
    });
    Object.keys(config.MessengersAvailable).forEach((messenger_with_index) => {
        const messenger = common.root_of_messenger(messenger_with_index);
        const pier_config = config.piers[messenger_with_index];
        const falsies = (messenger === 'facebook' &&
            (!(pier_config === null || pier_config === void 0 ? void 0 : pier_config.email) ||
                !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.password)))
            ||
                (messenger === 'discord' &&
                    (!(pier_config === null || pier_config === void 0 ? void 0 : pier_config.client) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.token) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.guildId)))
            ||
                (messenger === 'telegram' && (!(pier_config === null || pier_config === void 0 ? void 0 : pier_config.token)))
            ||
                (messenger === 'vkboard' && (!(pier_config === null || pier_config === void 0 ? void 0 : pier_config.token) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.group_id) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.login) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.password)))
            ||
                (messenger === 'vkwall' && (!(pier_config === null || pier_config === void 0 ? void 0 : pier_config.token) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.group_id) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.login) || !(pier_config === null || pier_config === void 0 ? void 0 : pier_config.password)));
        if (falsies)
            delete config.MessengersAvailable[messenger_with_index];
    });
    Object.keys(config.MessengersAvailable).forEach((messenger) => generic[messenger] = {});
};
StartService.facebook = async ({ force, messenger = "facebook" }) => {
    //facebook
    if (!force && !config.MessengersAvailable[messenger])
        return;
    queueOf[messenger] = new PQueue({ concurrency: 1 });
    try {
        generic[messenger].client = await login(config[messenger].email, config[messenger].password);
        console.log(generic[messenger].client);
        console.log(JSON.stringify(generic[messenger].client.getSession()));
        generic[messenger].client.on("message", (message) => {
            receivedFrom.facebook(messenger, message);
        });
        config.MessengersAvailable[messenger] = true;
    }
    catch (e) {
        console.log(e.toString());
        // config.MessengersAvailable[messenger] = false;
        // StartService[messenger]({force: true});
    }
};
StartService.webwidget = async ({ messenger }) => {
    generic[messenger] = {
        Lojban1ChatHistory: [],
        client: require("socket.io")(server)
    };
    generic[messenger].client.sockets.on("connection", (socket) => {
        socket.emit("history", generic[messenger].Lojban1ChatHistory);
    });
};
StartService.telegram = async ({ messenger }) => {
    //telegram
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client = await generic[messenger].Start({ messenger });
    queueOf[messenger] = new PQueue({ concurrency: 1 });
    generic[messenger].client.on("message", (message) => {
        receivedFrom.telegram(messenger, message);
    });
    generic[messenger].client.on("edited_message", (message) => {
        receivedFrom.telegram(messenger, message);
    });
    generic[messenger].client.on("polling_error", (error) => {
        if (error.code === "ETELEGRAM" && error.response.body.error_code === 404) {
            config.MessengersAvailable[messenger] = false;
            generic[messenger].client.stopPolling();
        }
    });
    const [err, res] = await to(generic[messenger].client.getMe());
    if (!err)
        config[messenger].myUser = res;
};
StartService.vkwall = async ({ messenger }) => {
    //vkboard
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client = await common.vkwall.Start({ messenger });
    if (!queueOf.vk)
        queueOf.vk = new PQueue({ concurrency: 1 });
    generic[messenger].client.bot.event("wall_reply_new", async ({ message }) => {
        receivedFrom.vkwall(messenger, message);
    });
    generic[messenger].client.bot.event("wall_reply_edit", async ({ message }) => {
        receivedFrom.vkwall(messenger, { ...message, edited: true });
    });
    generic[messenger].client.bot.startPolling();
};
StartService.vkboard = async ({ messenger }) => {
    //vkboard
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client = await common.vkboard.Start({ messenger });
    if (!queueOf.vk)
        queueOf.vk = new PQueue({ concurrency: 1 });
    generic[messenger].client.bot.event("board_post_new", async ({ message }) => {
        receivedFrom.vkboard(messenger, message);
    });
    generic[messenger].client.bot.event("board_post_edit", async ({ message }) => {
        receivedFrom.vkboard(messenger, { ...message, edited: true });
    });
    generic[messenger].client.bot.startPolling();
};
StartService.slack = async ({ messenger }) => {
    //slack
    await common.slack.Start({ messenger });
    if (!config.MessengersAvailable[messenger])
        return;
    queueOf[messenger] = new PQueue({ concurrency: 1 });
    generic[messenger].client.rtm.on("message", (message) => {
        receivedFrom.slack(messenger, message);
    });
};
StartService.mattermost = async ({ messenger }) => {
    //mattermost
    generic[messenger].client = await common.mattermost.Start({ messenger });
    if (!config.MessengersAvailable[messenger])
        return;
    queueOf[messenger] = new PQueue({ concurrency: 1 });
    generic[messenger].client.addEventListener("open", () => {
        generic[messenger].client.send(JSON.stringify({
            seq: 1,
            action: "authentication_challenge",
            data: {
                token: config[messenger].token,
            },
        }));
    });
    generic[messenger].client.addEventListener("message", (message) => {
        if (!(message === null || message === void 0 ? void 0 : message.data) || !config[messenger].team_id)
            return;
        message = JSON.parse(message.data);
        receivedFrom.mattermost(messenger, message);
    });
    generic[messenger].client.addEventListener("close", () => generic[messenger].client._connect());
    generic[messenger].client.addEventListener("error", () => generic[messenger].client._connect());
};
StartService.discord = async ({ messenger }) => {
    if (!config.MessengersAvailable[messenger])
        return;
    const client = new Discord.Client();
    generic[messenger].client = client;
    queueOf[messenger] = new PQueue({ concurrency: 1 });
    generic[messenger].client.once("ready", () => {
        generic[messenger].guilds = client.guilds.cache.array();
        if (config[messenger].guildId) {
            const guild = client.guilds.cache.find((guild) => guild.name.toLowerCase() === config[messenger].guildId.toLowerCase() ||
                guild.id === config[messenger].guildId);
            if (guild)
                generic[messenger].guilds = [
                    guild,
                    ...generic[messenger].guilds.filter((_guild) => _guild.id !== guild.id),
                ];
        }
    });
    generic[messenger].client.on("error", (error) => {
        log("discord")(error);
        // StartService.discord();
    });
    generic[messenger].client.on("message", (message) => {
        receivedFrom.discord(messenger, message);
    });
    generic[messenger].client.on("messageUpdate", (oldMessage, message) => {
        if (oldMessage.content != message.content) {
            message.edited = true;
            receivedFrom.discord(messenger, message);
        }
    });
    generic[messenger].client.login(config[messenger].token);
};
StartService.irc = async ({ messenger }) => {
    // irc
    const channels = config.new_channels;
    const results = [];
    for (const channel of channels) {
        const chanName = channel[`${messenger}-password`]
            ? `${channels[messenger]} ${channels[`${messenger}-password`]}`
            : channels[messenger];
        results.push(chanName);
    }
    config.piers[messenger].ircOptions.channels = [...new Set(results)];
    config.piers[messenger].ircOptions.encoding = "utf-8";
    generic[messenger].client = new Irc.Client(config[messenger].ircServer, config[messenger].ircOptions.nick, config[messenger].ircOptions);
    if (!config.MessengersAvailable[messenger])
        return;
    queueOf[messenger] = new PQueue({ concurrency: 1 });
    generic[messenger].client.on("error", (error) => {
        receivedFrom.irc(messenger, {
            error,
            type: "error",
        });
        // StartService.irc();
    });
    generic[messenger].client.on("registered", () => {
        receivedFrom.irc(messenger, {
            handler: generic[messenger].client,
            type: "registered",
        });
    });
    generic[messenger].client.on("message", (author, channelId, text) => {
        receivedFrom.irc(messenger, {
            author,
            channelId,
            text,
            type: "message",
        });
    });
    generic[messenger].client.on("topic", (channelId, topic, author) => {
        receivedFrom.irc(messenger, {
            author,
            channelId,
            text: topic,
            type: "topic",
        });
    });
    generic[messenger].client.on("action", (author, channelId, text) => {
        receivedFrom.irc(messenger, {
            author,
            channelId,
            text,
            type: "action",
        });
    });
};
async function StartServices() {
    common.MessengersAvailable();
    if (!config.channelMapping)
        config.channelMapping = {};
    config.MessengersAvailable.forEach(async (messenger_with_index) => {
        const messenger = messenger_with_index.replace(/_.*/g, '');
        if (StartService[messenger])
            await StartService[messenger]({ messenger: messenger_with_index });
    });
    await common.PopulateChannelMapping();
    console.log("Lojban-1Chat-Bridge started!");
}
// helper functions
common.LogMessageToAdmin = async (messenger, message) => {
    if (config[messenger].admins_userid)
        await to(generic[messenger].client.forwardMessage(config[messenger].admins_userid, message.chat.id, message.message_id));
};
function catchError(err) {
    const error = JSON.stringify(err);
    console.log(error);
    common.LogToAdmin(err);
}
common.LogToAdmin = (msg_text, repeat = true) => {
    logger.log({
        level: "info",
        message: JSON.stringify(msg_text),
    });
    const telegram_piers_with_logging_to_admin = Object.keys(config.piers).filter((i) => typeof config.piers[i].admins_userid !== 'undefined');
    for (const pier of telegram_piers_with_logging_to_admin) {
        generic[pier].client
            .sendMessage(config[pier].admins_userid, `\`\`\`\n${msg_text}\n\`\`\``, {
            parse_mode: "Markdown",
        })
            .catch((e) => {
            console.log(msg_text);
            if (repeat)
                common.LogToAdmin(msg_text, false);
        });
    }
};
common.escapeHTML = (arg) => arg
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
const htmlEntities = {
    nbsp: " ",
    cent: "¢",
    pound: "£",
    yen: "¥",
    euro: "€",
    copy: "©",
    reg: "®",
    lt: "<",
    gt: ">",
    quot: '"',
    amp: "&",
    apos: "'",
    "#42": "*",
    "#95": "_",
    "#96": "`",
};
common.unescapeHTML = ({ text, convertHtmlEntities, escapeBackslashes = true, }) => {
    if (escapeBackslashes)
        text = text.replace(/\\/g, "\\");
    text = text.replace(/\&([^;]+);/g, (entity, entityCode) => {
        let match;
        if (convertHtmlEntities && htmlEntities[entityCode]) {
            return htmlEntities[entityCode];
        }
        else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
            return String.fromCharCode(parseInt(match[1], 16));
        }
        else if ((match = entityCode.match(/^#(\d+)$/))) {
            return String.fromCharCode(~~match[1]);
        }
        else {
            return entity;
        }
    });
    return text;
};
// async function appendPageTitles(
//   text: string,
//   sendto?: boolean,
//   messenger?: string
// ) {
//   if (config[messenger].sendPageTitles) {
//     const urls = text.match(UrlRegExp);
//     if (urls.length > 0) {
//       for (const url of urls) {
//         await to(
//           new Promise((resolve) => {
//             request(
//               {
//                 url,
//                 timeout: 3000
//               },
//               (err, res, body) => {
//                 if (!err) {
//                   const match = PageTitleRegExp.exec(body);
//                   if (match && match[2]) {
//                     text += `\n${match[2]}`;
//                   }
//                 }
//               }
//             );
//           })
//         );
//       }
//     }
//   }
//   if (sendto) {
//     sendTo[m]({
//       channelId: ConfigNode[m],
//       author,
//       chunk: thisToWhom + chunk,
//       quotation,
//       action,
//       file
//     });
//   }
//   return text;
// }
GetChunks.irc = async (text, messenger) => {
    const limit = config[messenger].MessageLength || 400;
    // text = await appendPageTitles(text)
    return text.split(/<br>/).flatMap((line) => HTMLSplitter(line, limit));
};
GetChunks.webwidget = async (text, messenger) => {
    return [text];
};
const diffTwo = (diffMe, diffBy) => {
    diffMe = diffMe
        .replace(/[\n\r]/g, "")
        .replace(/<br \/>/gim, "<br>")
        .replace(/<a_href=/g, "<a href=");
    diffBy = diffBy
        .replace(/[\n\r]/g, "")
        .replace(/<br \/>/gim, "<br>")
        .replace(/<a_href=/g, "<a href=");
    return diffMe.split(diffBy).join("");
};
function HTMLSplitter(text, limit = 400) {
    log("generic")({ message: "html splitter: pre", text });
    const r = new RegExp(`(?<=.{${limit / 2},})[^<>](?![^<>]*>)`, "g");
    text = common.sanitizeHtml(text.replace(/<blockquote>([\s\S]*?)(<br>)*<\/blockquote>/gim, "<blockquote>$1</blockquote>"));
    text = text.replace(/<a href=/g, "<a_href=");
    let thisChunk;
    let stop = false;
    let Chunks = [];
    while (text !== "") {
        if (text.length >= limit) {
            thisChunk = text.substring(0, limit);
            text = text.substring(limit);
            let lastSpace = thisChunk.lastIndexOf(" ");
            if (lastSpace <= limit / 2) {
                //no spaces found
                lastSpace = thisChunk.search(r);
            }
            if (lastSpace === -1) {
                thisChunk = common.sanitizeHtml(thisChunk, []);
            }
            else {
                text = thisChunk.substring(lastSpace) + text;
                thisChunk = thisChunk.substring(0, lastSpace);
            }
        }
        else {
            //if text is less than limit symbols then process it and go out of the loop
            thisChunk = text;
            stop = true;
        }
        const thisChunkUntruncated = DOMPurify.sanitize(thisChunk.replace(/<a_href=/g, "<a href=")).replace(/<a href=/g, "<a_href=");
        Chunks.push(thisChunkUntruncated);
        if (stop)
            break;
        let diff = diffTwo(thisChunkUntruncated, thisChunk);
        if (diff !== "") {
            // add opening tags
            diff = diff
                .split(/(?=<)/)
                .reverse()
                .map((i) => i.replace("/", ""))
                .join("");
            text = DOMPurify.sanitize(diff + text);
        }
    }
    Chunks = Chunks.map((chunk) => chunk.replace(/<a_href=/g, "<a href="));
    log("generic")({ message: "html splitter: after", Chunks });
    return Chunks;
}
GetChunks.fallback = async (text, messenger) => {
    // text = await appendPageTitles(text);
    const limit = config[messenger].MessageLength || 400;
    let arrText = HTMLSplitter(text, limit);
    return arrText;
};
function saveDataToFile({ data, local_fullname }) {
    function decodeBase64Image(dataString) {
        const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const response = {};
        if (matches.length !== 3) {
            return new Error('Invalid input string');
        }
        response.type = matches[1];
        response.data = Buffer.from(matches[2], 'base64');
        return response;
    }
    // Regular expression for image type:
    // This regular image extracts the "jpeg" from "image/jpeg"
    const imageTypeRegularExpression = /\/(.*?)$/;
    const imageBuffer = decodeBase64Image(data);
    // This variable is actually an array which has 5 values,
    // The [1] value is the real image extension
    const type = imageBuffer
        .type
        .match(imageTypeRegularExpression);
    return { type: type[1], data: imageBuffer.data };
}
common.downloadFile = async ({ messenger, type, fileId, remote_path, extension = "", }) => {
    const randomString = blalalavla.cupra(remote_path || fileId.toString());
    const randomStringName = blalalavla.cupra((remote_path || fileId.toString()) + "1");
    mkdir(`${cache_folder}/files/${randomString}`);
    const rem_path = `${config.generic.httpLocation}/${randomString}`;
    const local_path = `${cache_folder}/files/${randomString}`;
    let err, res;
    let rem_fullname = "";
    let local_fullname = "";
    if (type === "slack") {
        local_fullname = `${local_path}/${path.basename(remote_path)}`;
        [err, res] = await to(new Promise((resolve) => {
            try {
                let file = fs.createWriteStream(local_fullname);
                file
                    .on("open", () => {
                    request({
                        method: "GET",
                        url: remote_path,
                        headers: {
                            Authorization: `Bearer ${config.slack.token}`,
                        },
                        timeout: 3000,
                    }, (err) => {
                        if (err) {
                            console.log(remote_path, err.toString());
                            resolve(null);
                        }
                    })
                        .pipe(file)
                        .on("finish", () => {
                        const rem_fullname = `${rem_path}/${path.basename(remote_path)}`;
                        resolve([rem_fullname, local_fullname]);
                    })
                        .on("error", (error) => {
                        console.error({
                            type: "streaming error",
                            path: remote_path,
                            error,
                        });
                        resolve(null);
                    });
                })
                    .on("error", (error) => {
                    console.error({
                        type: "slack opening error",
                        error,
                    });
                });
            }
            catch (error) {
                console.log({ type: "creation error", error });
            }
        }));
        if (res)
            [rem_fullname, local_fullname] = res;
    }
    else if (type === "data") {
        try {
            const { type, data } = saveDataToFile({ data: remote_path, local_fullname });
            const basename = randomStringName + "." + (type !== null && type !== void 0 ? type : extension);
            local_fullname = `${local_path}/${basename}`;
            fs.writeFileSync(local_fullname, data);
            rem_fullname = `${rem_path}/${basename}`;
        }
        catch (error) {
            local_fullname = '';
            logger.log({
                level: "error",
                function: "downloadFile",
                type: "data",
                message: error.toString(),
            });
        }
    }
    else if (type === "simple") {
        if (extension)
            extension = `.${extension}`;
        const basename = path.basename(remote_path).split(/[\?#]/)[0] + (extension || '');
        local_fullname = `${local_path}/${basename}`;
        await new Promise((resolve, reject) => {
            try {
                let file = fs.createWriteStream(local_fullname);
                file
                    .on("open", () => {
                    let stream = request({
                        method: "GET",
                        url: remote_path,
                        timeout: 3000,
                    })
                        .pipe(file)
                        .on("finish", () => {
                        rem_fullname = `${rem_path}/${basename}`;
                        resolve(null);
                    })
                        .on("error", (error) => {
                        logger.log({
                            level: "error",
                            function: "downloadFile",
                            type: "simple",
                            path: remote_path,
                            message: error.toString(),
                        });
                        resolve(null);
                    });
                })
                    .on("error", (error) => {
                    logger.log({
                        level: "error",
                        function: "downloadFile",
                        type: "simple",
                        error: "opening error",
                        local_fullname,
                        message: error.toString(),
                    });
                });
            }
            catch (error) {
                console.log({ type: "creation error", error });
            }
        });
    }
    else if (type === "telegram") {
        ;
        [err, local_fullname] = await to(generic[messenger].client.downloadFile(fileId, local_path));
        if (!err)
            rem_fullname = `${rem_path}/${path.basename(local_fullname)}`;
    }
    if (err) {
        console.error({ remote_path, error: err, type: "generic" });
        return [remote_path || fileId, remote_path || fileId];
    }
    ;
    [err, res] = await to(new Promise((resolve) => {
        const new_name = `${local_path}/${randomStringName}${path.extname(local_fullname)}`;
        fs.rename(local_fullname, new_name, (err) => {
            if (err) {
                console.error({ remote_path, error: err, type: "renaming" });
                resolve(null);
            }
            else {
                rem_fullname = `${rem_path}/${path.basename(new_name)}`;
                resolve([rem_fullname, new_name]);
            }
        });
    }));
    if (!err)
        [rem_fullname, local_fullname] = res;
    //check if it's audio:
    if ([".ogg", ".oga", ".opus", ".wav", ".m4a"].includes(path.extname(local_fullname))) {
        const local_mp3_file = local_fullname + ".mp3";
        const cp = require("child_process");
        cp.spawnSync("ffmpeg", ["-i", local_fullname, local_mp3_file], {
            encoding: "utf8",
        });
        if (fs.existsSync(local_mp3_file))
            return [rem_fullname + ".mp3", local_mp3_file];
        return [rem_fullname, local_fullname];
    }
    //check if it's webp/tiff:
    if ([".webp", ".tiff"].includes(path.extname(local_fullname))) {
        const sharp = require("sharp");
        const jpgname = `${local_fullname.split(".").slice(0, -1).join(".")}.jpg`;
        [err, res] = await to(new Promise((resolve) => {
            sharp(local_fullname).toFile(jpgname, (err, info) => {
                if (err) {
                    console.error({
                        type: "conversion",
                        remote_path,
                        error: err.toString(),
                    });
                    resolve([rem_fullname, local_fullname]);
                }
                else {
                    fs.unlink(local_fullname);
                    resolve([
                        `${rem_fullname.split(".").slice(0, -1).join(".")}.jpg`,
                        jpgname,
                    ]);
                }
            });
        }));
        if (!err)
            [rem_fullname, local_fullname] = res;
    }
    //it's some other file format:
    return [rem_fullname, local_fullname];
};
common.sanitizeHtml = (text, allowedTags = [
    "blockquote",
    "b",
    "strong",
    "i",
    "pre",
    "code",
    "a",
    "em",
    "u",
    "ins",
    "s",
    "br",
    "del",
]) => {
    return sanitizeHtml(text, {
        allowedTags,
        allowedAttributes: {
            a: ["href"],
        },
    });
};
common.LocalizeString = ({ messenger, channelId, localized_string_key, arrElemsToInterpolate, }) => {
    var _a, _b, _c, _d;
    try {
        const language = ((_d = (_c = (_b = (_a = config === null || config === void 0 ? void 0 : config.channelMapping) === null || _a === void 0 ? void 0 : _a[messenger]) === null || _b === void 0 ? void 0 : _b[channelId]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.language) ||
            "English";
        let template = localConfig[language][localized_string_key];
        const def_template = localConfig["English"][localized_string_key];
        if (!def_template) {
            console.log(`no ${localized_string_key} key specified in the dictionary`);
            return;
        }
        if (!template)
            template = def_template;
        for (const value of arrElemsToInterpolate)
            template = template
                .replace(new RegExp(`%${value[0]}%`, "gu"), value[1])
                .replace(/%%/g, "%");
        return template;
    }
    catch (err) {
        console.error(err);
    }
};
//START
// get/set config
const [config, localConfig] = common.ConfigBeforeStart();
// map channels & start listening
StartServices();
// start HTTP server for media files if configured to do so
if (config.generic.showMedia) {
    mkdir(`${cache_folder}/files`);
    const serve = serveStatic(`${cache_folder}/files`, {
        lastModified: false,
        index: false,
        maxAge: 86400000,
    });
    server = http.createServer((req, res) => {
        // if ((request.url || "").indexOf("/emailing/templates") === 0) {
        serve(req, res, finalhandler(req, res));
    });
    server.listen(config.generic.httpPort);
}
