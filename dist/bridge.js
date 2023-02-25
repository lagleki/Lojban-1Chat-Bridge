"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
;
Error.stackTraceLimit = 100;
process.env.NTBA_FIX_319 = 1;
// file system and network libs
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const mkdirp_1 = require("mkdirp");
const authorization_1 = require("@vk-io/authorization");
const await_to_js_1 = __importDefault(require("await-to-js"));
const axios_1 = __importDefault(require("axios"));
//discord
const discord_js_1 = __importDefault(require("discord.js"));
const http_1 = __importDefault(require("http"));
// messengers' libs
// const { login } = require("libfb")
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const request_1 = __importDefault(require("request"));
const vk_io_1 = require("vk-io");
// markedRenderer.text = (string: string) => string.replace(/\\/g, "\\\\");
// markedRenderer.text = (string: string) => escapeHTML(string)
// markedRenderer.paragraph = (string: string) => escapeHTML(string)
// markedRenderer.inlineText = (string: string) => escapeHTML(string)
const generic_1 = require("./formatting-converters/generic");
const telegram_utils_1 = require("./formatting-converters/telegram-utils");
const Timeout = require("await-timeout");
// process.on('warning', (e: any) => console.warn(e.stack));
const cache_folder = path_1.default.join(__dirname, "../data");
const defaults = path_1.default.join(__dirname, `../default-config/defaults.js`);
const sanitizeHtml = require("sanitize-html");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
const util = require("util");
const VkBot = require("node-vk-bot-api");
const { RTMClient, WebClient } = require("@slack/client");
const emoji = require("node-emoji");
const html2slack = require("./formatting-converters/html2slack");
const html2irc = require("./formatting-converters/html2irc");
const marked = require("marked");
const lexer = marked.Lexer;
lexer.rules.list = { exec: () => { } };
lexer.rules.listitem = { exec: () => { } };
const markedRenderer = new marked.Renderer();
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
const serveStatic = require("serve-static");
const winston = __importStar(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const logger = winston.createLogger({
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(cache_folder, "info-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: false,
            maxSize: "20m",
            maxFiles: "14d",
        }),
    ],
});
const log = (messenger) => (message) => logger.log({ level: "info", message: JSON.stringify({ message, messenger }) });
const R = require("ramda");
const p_queue_1 = __importDefault(require("p-queue"));
const blalalavla = require("./sugar/blalalavla");
const modzi = require("./sugar/modzi");
// NLP & spam libs
const lojban = require("lojban");
//global scope mutable vars:
const generic = {};
let config, localizationConfig;
const queueOf = {};
//global functions (for all piers):
const common = {};
const pierObj = {
    facebook: {},
    discord: {},
    mattermost: {},
    telegram: {},
    irc: {},
    slack: {},
    vkboard: {},
    vkwall: {},
    webwidget: {},
};
Object.keys(pierObj).forEach((key) => {
    pierObj[key].common = {};
});
async function tot(arg, timeout = 5000, rejectResponse = true) {
    return (0, await_to_js_1.default)(Timeout.wrap(arg, timeout, rejectResponse));
}
const discordParser = require("discord-markdown");
pierObj.discord.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, avatar, }) => {
    let files = [];
    if (file) {
        files = [
            {
                attachment: file,
            },
        ];
    }
    let chunk_ = chunk;
    if (typeof chunk_ !== "string" && chunk_.main)
        chunk_ = chunk_.main;
    if (chunk_ === file)
        chunk_ = "";
    const authorTemp = author
        .replace(/[0-9_\.-]+$/, "")
        .replace(/\[.*/, "")
        .replace(/[^0-9A-Za-z].*$/, "")
        .trim();
    const parsedName = modzi.modzi(author);
    try {
        if (avatar) {
            const response = await axios_1.default.get(avatar, {
                responseType: "arraybuffer",
            });
            const prefix = "data:" + response.headers["content-type"] + ";base64,";
            avatar = prefix + Buffer.from(response.data, "binary").toString("base64");
        }
    }
    catch (error) {
        avatar = undefined;
    }
    // if (!avatar) {
    //   const animava = new Avatar(
    //     authorTemp,
    //     512,
    //     parsedName.snada ? parsedName.output : undefined
    //   )
    //   await animava.draw()
    //   avatar = await animava.toDataURL()
    // }
    let error;
    const channel = generic[messenger].client.channels.cache.get(channelId);
    let webhooks = [], webhook = null;
    if (!config.piers[messenger]?.noWebhooks) {
        try {
            webhooks = await channel.fetchWebhooks();
            webhook = webhooks.last();
        }
        catch (error) {
            logger.log({
                level: "error",
                function: "discord.sendTo",
                event: "couldn't find webhooks for the channel",
                channelId,
                message: error.toString(),
                chunk: chunk_,
                author,
            });
        }
        //reuse a webhook
        if (webhook) {
            ;
            [error, webhook] = await tot(webhook.edit({
                name: author || "-",
                avatar,
            }));
            if (error) {
                logger.log({
                    level: "error",
                    function: "discord.sendTo",
                    event: "error editing an existing webhook",
                    message: error.toString(),
                    chunk: chunk_,
                    author,
                });
            }
        }
        //couldnt reuse the webhook so delete all my webhooks for this Discord channel and then create a new one
        if (error || !webhook) {
            // //deleting
            const arrayedWebhooks = Array.from(Object.values(webhooks.filter((hook) => hook?.owner?.id === config?.piers?.[messenger]?.client)));
            for (const hook of arrayedWebhooks) {
                await hook.delete();
            }
            // webhooks.filter((hook: any) => hook?.owner?.id === config?.piers?.[messenger]?.client).each((hook: any) => hook.delete())
            //creating
            ;
            [error, webhook] = await tot(channel.createWebhook(author || "-", avatar));
            if (error) {
                logger.log({
                    level: "error",
                    function: "discord.sendTo",
                    event: "error creating a webhook",
                    message: error.toString(),
                    chunk: chunk_,
                    author,
                });
            }
        }
        if (!error) {
            //ok, we have a webhook so send a message with it
            ;
            [error] = await tot(webhook.send(chunk_, {
                username: author || "-",
                files,
                // avatarURL: generic.discord.avatar.path,
            }));
            if (error) {
                logger.log({
                    level: "error",
                    function: "discord.sendTo",
                    event: "error sending a message via a webhook",
                    message: error.toString(),
                    chunk: chunk_,
                    author,
                });
            }
            else
                return;
        }
        if (webhook) {
            //we failed to send a message. try to send the message without attachments. useful when the attachments are too large for Discord to handle
            ;
            [error] = await tot(webhook.send(chunk_, {
                username: author || "-",
                // avatarURL: generic.discord.avatar.path,
            }));
            if (error) {
                logger.log({
                    level: "error",
                    function: "discord.sendTo",
                    event: "error sending a message without attachments via a webhook",
                    message: error.toString(),
                    chunk: chunk_,
                    author,
                });
            }
            else
                return;
        }
    }
    // now we failed all the ways to use webhooks so send the message with attachments via an older method using a bot user
    ;
    [error] = await (0, await_to_js_1.default)(generic[messenger].client.channels.cache
        .get(channelId)
        .send({ content: chunk.fallback_solution ?? chunk, files }));
    if (error) {
        logger.log({
            level: "error",
            function: "discord.sendTo",
            event: "error sending a message using a webhookless method",
            message: error.toString(),
            chunk: chunk.fallback_solution ?? chunk,
            author,
        });
    }
    else
        return // now we failed to send the message with attachments via an older method so remove the attachments and try once again
        ;
    [error] = await (0, await_to_js_1.default)(generic[messenger].client.channels.cache
        .get(channelId)
        .send({ content: chunk.fallback_solution ?? chunk }));
    if (error) {
        logger.log({
            level: "error",
            function: "discord.sendTo",
            event: "error sending a message without attachments using a webhookless method",
            message: error.toString(),
            chunk: chunk.fallback_solution ?? chunk,
            author,
        });
    }
};
pierObj.discord.common.removeSpam = async (messenger, message, plainText) => {
    if (config.channelMapping[messenger][message?.channel?.id]?.settings
        ?.restrictToLojban &&
        plainText) {
        // dealing with non-lojban spam
        const xovahe = xovahelojbo({ text: plainText });
        if (xovahe < 0.5)
            return true;
    }
    return false;
};
pierObj.discord.receivedFrom = async (messenger, message) => {
    if (!config?.channelMapping[messenger]?.[(message?.channel?.id || "").toString()])
        return;
    if (message.author.bot || message.channel.type !== "text")
        return;
    let plainText = !message?.content
        ? undefined
        : pierObj.discord.common.discord_reconstructPlainText(messenger, message, message?.content);
    if (await pierObj.discord.common.removeSpam(messenger, message, plainText))
        return;
    const edited = message.edited ? true : false;
    for (let value of message.attachments.values()) {
        //media of attachment
        //todo: height,width,common.LocalizeString
        let [, res] = await (0, await_to_js_1.default)(common.downloadFile({
            messenger,
            type: "simple",
            remote_path: value.url,
        }));
        let file, localfile;
        if (res?.[1]) {
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
            author: pierObj.discord.adaptName(messenger, message),
            text: file,
            file: localfile,
            remote_file: file,
            edited,
        });
        //text of attachment
        const text = pierObj.discord.common.discord_reconstructPlainText(messenger, message, value.content);
        log("discord")("sending text of attachment: " + text);
        sendFrom({
            messenger,
            channelId: message.channel.id,
            author: pierObj.discord.adaptName(messenger, message),
            text,
            edited,
        });
    }
    if (message?.reference?.messageID) {
        const message_ = await message.channel.messages.fetch(message.reference.messageID);
        const text = pierObj.discord.common.discord_reconstructPlainText(messenger, message_, message_.content);
        log("discord")(`sending reconstructed text: ${text}`);
        sendFrom({
            messenger,
            channelId: message_.channel.id,
            author: pierObj.discord.adaptName(messenger, message_),
            text,
            quotation: true,
            edited,
        });
    }
    if (plainText) {
        log("discord")("sending reconstructed text: " + plainText);
        sendFrom({
            messenger,
            channelId: message.channel.id,
            author: pierObj.discord.adaptName(messenger, message),
            text: plainText,
            edited,
        });
    }
};
pierObj.discord.common.discord_reconstructPlainText = (messenger, message, text) => {
    if (!text)
        return "";
    const massMentions = ["@everyone", "@here"];
    if (massMentions.some((massMention) => text.includes(massMention)) &&
        !config.piers[messenger].massMentions) {
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
                .find((member) => (member.nickname || member.user?.username) &&
                member.user.id.toLowerCase() === core);
            if (member)
                text = text
                    .replace(/#0000/, "")
                    .replace(match, "@" + (member.nickname || member.user.username));
        }
    matches = text.match(/<#[^# ]{2,32}>/g);
    if (matches?.[0])
        for (let match of matches) {
            const core = match.replace(/[<>#]/g, "");
            const chan = Object.keys(config.cache[messenger]).filter((i) => config.cache[messenger][i] === core);
            if (chan[0])
                text = text.replace(match, "#" + chan[0]);
        }
    return text;
};
pierObj.discord.adaptName = (messenger, message) => {
    return message.member?.nickname || message.author?.username;
};
pierObj.discord.convertFrom = async ({ text, messenger, }) => {
    const result = discordParser
        .toHTML(text)
        .replace(/<span class="d-spoiler">/g, '<span class="spoiler">');
    log(messenger)({
        messenger,
        "converting text": text,
        result,
    });
    return result;
};
pierObj.discord.convertTo = async ({ text, messenger, messengerTo, }) => {
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
pierObj.discord.getChannels = async (pier) => {
    const json = {};
    for (const value of generic[pier].client.channels.cache.values()) {
        if (value.guild.id === config.piers[pier].guildId) {
            json[value.name] = value.id;
        }
    }
    config.cache[pier] = json;
};
pierObj.discord.StartService = async ({ messenger }) => {
    if (!config.MessengersAvailable[messenger])
        return;
    await new Promise((resolve) => {
        const client = new discord_js_1.default.Client();
        generic[messenger].client = client;
        generic[messenger].client.once("ready", () => {
            generic[messenger].guilds = client.guilds.cache.array();
            if (config.piers[messenger].guildId) {
                const guild = client.guilds.cache.find((guild) => guild.name.toLowerCase() ===
                    config.piers[messenger].guildId.toLowerCase() ||
                    guild.id === config.piers[messenger].guildId);
                if (guild)
                    generic[messenger].guilds = [
                        guild,
                        ...generic[messenger].guilds.filter((_guild) => _guild.id !== guild.id),
                    ];
            }
            resolve(null);
        });
        generic[messenger].client.on("error", (error) => {
            resolve(null);
            log("discord")(error);
            // pierObj.discord();.StartService
        });
        generic[messenger].client.on("message", (message) => {
            pierObj.discord.receivedFrom(messenger, message);
        });
        generic[messenger].client.on("messageUpdate", (oldMessage, message) => {
            if (oldMessage.content != message.content) {
                message.edited = true;
                pierObj.discord.receivedFrom(messenger, message);
            }
        });
        generic[messenger].client.login(config.piers[messenger].token);
    });
};
///discord
//telegram
pierObj.telegram.common = {
    Start: async function ({ messenger }) {
        return new node_telegram_bot_api_1.default(config.piers[messenger].token, {
            polling: true,
        });
    },
};
pierObj.telegram.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    try {
        log("telegram")({ "sending text": chunk });
        const [topicId, channel] = channelId.toString().split("@");
        await generic[messenger].client.sendMessage(channel ?? channelId, chunk, R.reject(R.isNil)({
            message_thread_id: channel && topicId !== "1" ? topicId : undefined,
            parse_mode: "HTML",
        }));
    }
    catch (error) {
        error = util.inspect(error, { showHidden: false, depth: 4 });
        common.LogToAdmin(`Error sending a chunk:\n\nMessenger: ${messenger}.\n\nChannel: ${channelId}.\n\nChunk: ${(0, generic_1.escapeHTML)(chunk)}\n\nError message: ${error?.message ?? error.toString()}`);
    }
};
pierObj.telegram.receivedFrom = async (messenger, message) => {
    console.log(message);
    //spammer
    //1. remove entered bots
    pierObj.telegram.common.TelegramRemoveAddedBots(messenger, message);
    //2. check if admin else leave chat and return
    if (await pierObj.telegram.common.TelegramLeaveChatIfNotAdmin(messenger, message))
        return;
    //3. check for spam
    if (await pierObj.telegram.common.removeSpam(messenger, message))
        return;
    //4. check if new member event
    if (pierObj.telegram.common.TelegramRemoveNewMemberMessage(messenger, message))
        return;
    //now deal with the message that is fine
    if (!config.channelMapping[messenger])
        return;
    const age = Math.floor(Date.now() / 1000) - message.date;
    if (age > (config.piers[messenger].maxMsgAge || 0))
        return console.log(`skipping ${age} seconds old message! NOTE: change this behaviour with config.telegram.maxMsgAge, also check your system clock`);
    let topicalizedChatId = message.message_thread_id || message.chat.is_forum
        ? `${message.message_thread_id ??
            (message.chat.is_forum ? "1" : "")}@${message.chat.id}`
        : message.chat.id;
    if (!config.channelMapping[messenger][topicalizedChatId] &&
        message.chat.is_forum) {
        topicalizedChatId = `1@${message.chat.id}`;
    }
    if (!config.channelMapping[messenger][topicalizedChatId]) {
        if (config.cache[messenger][message.chat.title] &&
            config.cache[messenger][message.chat.title] === message.chat.id)
            return; //cached but unmapped channel so ignore it and exit the function
        await pierObj.telegram.common.NewChannelAppeared({
            messenger,
            channelName: message.chat.title,
            channelId: message.chat.id,
        });
        if (!config.channelMapping[messenger][topicalizedChatId])
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
    const { author, avatar } = await pierObj.telegram.GetName(messenger, message.from);
    await pierObj.telegram.common.sendFromTelegram({
        messenger,
        message: message.reply_to_message,
        quotation: true,
        author,
        avatar,
    });
    await pierObj.telegram.common.sendFromTelegram({
        messenger,
        message,
        author,
        avatar,
    });
};
// reconstructs the original raw markdown message
pierObj.telegram.common.telegram_reconstructMarkdown = (msg) => {
    return {
        ...msg,
        text: (0, telegram_utils_1.fillMarkdownEntitiesMarkup)(msg.text, msg.entities || [], logger),
    };
};
pierObj.telegram.common.IsSpam = (message) => {
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
};
pierObj.telegram.common.sendFromTelegram = async ({ messenger, message, quotation, author, avatar, }) => {
    if (!message)
        return;
    let action;
    message = pierObj.telegram.common.telegram_reconstructMarkdown(message);
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
            jsonMessage[el].text = jsonMessage[el].text.replace(`@${config.piers[messenger].myUser?.username ?? ""}`, "");
            if (quotation &&
                jsonMessage[el].text.length > config.piers[messenger].MessageLength)
                jsonMessage[el].text = `${jsonMessage[el].text.substring(0, config.piers[messenger].MessageLength - 1)} ...`;
        }
        if (jsonMessage[el].url)
            [jsonMessage[el].url, jsonMessage[el].local_file] =
                await common.downloadFile({
                    messenger,
                    type: "telegram",
                    fileId: jsonMessage[el].url,
                });
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
        let topicId;
        if (message.chat.is_forum) {
            topicId = message.message_thread_id;
            if (!config.channelMapping[messenger][`${message.message_thread_id}@${message.chat.id}`])
                topicId = "1";
        }
        sendFrom({
            messenger,
            channelId: message.chat.id,
            topicId,
            author,
            text,
            action,
            quotation,
            file: jsonMessage[el].local_file,
            remote_file: jsonMessage[el].url,
            edited,
            avatar,
        });
    }
};
pierObj.telegram.adaptName = (messenger, name) => config.piers[messenger].userMapping[name] || name;
pierObj.telegram.GetName = async (messenger, user) => {
    let name = config.piers[messenger].nameFormat;
    if (user.username) {
        name = name.replace("%username%", user.username, "g");
        name = pierObj.telegram.adaptName(messenger, name);
    }
    else {
        // if user lacks username, use fallback format string instead
        name = name.replace("%username%", config.piers[messenger]?.usernameFallbackFormat, "g");
    }
    name = name.replace("%firstName%", user.first_name || "", "g");
    name = name.replace("%lastName%", user.last_name || "", "g");
    // get rid of leading and trailing whitespace
    name = name.replace(/(^\s*)|(\s*$)/g, "");
    //now avatar
    let link;
    try {
        const { photos } = await generic[messenger].client.getUserProfilePhotos(user.id, { limit: 1 });
        const file_id = photos?.[0]?.[0]?.file_id;
        link = await generic[messenger].client.getFileLink(file_id);
    }
    catch (error) { }
    return { author: name, avatar: link };
};
pierObj.telegram.convertFrom = async ({ text, messenger, }) => {
    const res = markedParse({
        text: text
            .replace(/<p><code>([\s\S]*?)<\/code><\/p>/gim, "<p><pre>$1</pre></p>")
            .replace(/<span class="tg-spoiler">/g, '<span class="spoiler">'),
        messenger: "telegram",
        dontEscapeBackslash: true,
        unescapeCodeBlocks: true,
    });
    return res;
};
pierObj.telegram.convertTo = async ({ text = "", messenger, messengerTo, }) => {
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
pierObj.telegram.common.removeSpam = async (messenger, message) => {
    const cloned_message = JSON.parse(JSON.stringify(message));
    if (pierObj.telegram.common.IsSpam(cloned_message)) {
        if (message.text && message.text.search(/\bt\.me\b/) >= 0) {
            const [err, chat] = await (0, await_to_js_1.default)(generic[messenger].client.getChat(message.chat.id));
            if (!err) {
                const invite_link = chat.invite_link;
                cloned_message.text = cloned_message.text.replace(invite_link, "");
                if (pierObj.telegram.common.IsSpam(cloned_message))
                    pierObj.telegram.common.telegram_DeleteMessage({
                        messenger,
                        message,
                        log: true,
                    });
            }
            else {
                common.LogToAdmin(`error on getting an invite link of the chat ${message.chat.id} ${message.chat.title}`);
            }
        }
        else {
            const [err, chat] = await (0, await_to_js_1.default)(generic[messenger].client.getChat(cloned_message.chat.id));
            if (!err) {
                pierObj.telegram.common.telegram_DeleteMessage({
                    messenger,
                    message,
                    log: true,
                });
            }
            else {
                common.LogToAdmin(`error on getting an invite link of the chat ${cloned_message.chat.id} ${cloned_message.chat.title}`);
            }
        }
        return true;
    }
    else if (config.channelMapping?.[messenger]?.[message?.chat?.id]?.settings
        ?.restrictToLojban &&
        message?.text) {
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
};
pierObj.telegram.common.TelegramRemoveAddedBots = (messenger, message) => {
    if (config.piers[messenger].remove_added_bots)
        (message?.new_chat_members || []).map((u) => {
            if (u.is_bot && config.piers[messenger]?.myUser?.id !== u.id)
                generic[messenger].client
                    .kickChatMember(message.chat.id, u.id)
                    .catch(catchError);
        });
};
pierObj.telegram.common.TelegramRemoveNewMemberMessage = (messenger, message) => {
    if (message?.left_chat_member ||
        (message?.new_chat_members || []).filter((u) => (u.username || "").length > 100 ||
            (u.first_name || "").length > 100 ||
            (u.last_name || "").length > 100).length > 0 ||
        (config.channelMapping?.[messenger]?.[message?.chat?.id]?.settings
            ?.removeJoinMessages === true &&
            message.new_chat_members)) {
        pierObj.telegram.common.telegram_DeleteMessage({
            messenger,
            message,
            log: false,
        });
    }
    if (message.left_chat_member || message.new_chat_members)
        return true;
    return false;
};
pierObj.telegram.common.TelegramLeaveChatIfNotAdmin = async (messenger, message) => {
    if (!["group", "supergroup"].includes(message?.chat?.type) ||
        !message?.chat?.id ||
        !config.piers[messenger]?.myUser?.id)
        return;
    let [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.getChatMember(message.chat.id, config.piers[messenger]?.myUser?.id));
    if (!res)
        return true;
    if (!res.can_delete_messages) {
        ;
        [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.leaveChat(message.chat.id));
        const jsonMessage = {
            id: message?.chat?.id || message?.from?.id,
            title: message?.chat?.title,
            first_name: message?.from?.first_name,
            last_name: message?.from?.last_name,
            username: message?.from?.username,
            message: message?.text,
        };
        common.LogToAdmin(`leaving chat ${JSON.stringify(jsonMessage)}`);
        delete config.cache?.[messenger]?.[message?.chat?.title];
        await (0, await_to_js_1.default)(common.writeCache({
            pier: messenger,
            channelName: message.chat.title,
            channelId: message.chat.id,
            action: "leave",
        }));
        return true;
    }
    return false;
};
pierObj.telegram.common.telegram_DeleteMessage = async ({ messenger, message, log, }) => {
    if (log)
        await (0, await_to_js_1.default)(common.LogMessageToAdmin(messenger, message));
    await (0, await_to_js_1.default)(generic[messenger].client.deleteMessage(message.chat.id, message.message_id));
};
pierObj.telegram.common.NewChannelAppeared = async ({ messenger, channelName, channelId, }) => {
    // if (!channelName) return;
    config.cache[messenger][channelName] = channelId;
    await (0, await_to_js_1.default)(common.writeCache({ channelName, channelId, action: "join" }));
    const [err] = await (0, await_to_js_1.default)(common.PopulateChannelMapping());
    if (err) {
        common.LogToAdmin(`got problem in the new telegram chat ${channelName}, ${channelId}`);
        return false;
    }
    return true;
};
pierObj.telegram.getChannels = async (pier) => {
    //read from file
    let res = {};
    try {
        res = JSON.parse(fs_extra_1.default.readFileSync(`${cache_folder}/cache.json`, { encoding: 'utf8' }))[pier];
    }
    catch (error) { }
    config.cache[pier] = res;
    //check for changes from config.js
    // const cachedGroupNames = Object.keys(config.cache[pier]);
    // let uniqueTelegramGroups: string[] = [];
    // config.new_channels.map((i: any) => {
    //   if (i[pier]) uniqueTelegramGroups.push(i[pier]);
    // });
    // uniqueTelegramGroups = Array.from(new Set(uniqueTelegramGroups));
    // for (let groupName of cachedGroupNames) {
    //   const groupId = config.cache[pier][groupName];
    //   if (!uniqueTelegramGroups.includes(groupName)) delete config.cache[pier][groupName]
    //   await common.writeCache({ pier, channelName: groupName, channelId: groupId, action: "group removed in config" })
    // }
};
pierObj.telegram.StartService = async ({ messenger, }) => {
    //telegram
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client = await pierObj.telegram.common.Start({ messenger });
    generic[messenger].client.on("message", (message) => {
        pierObj.telegram.receivedFrom(messenger, message);
    });
    generic[messenger].client.on("edited_message", (message) => {
        pierObj.telegram.receivedFrom(messenger, message);
    });
    generic[messenger].client.on("polling_error", async (error) => {
        log(messenger)({
            level: "error",
            function: "pierObj.telegram.StartService",
            error_code: error?.code,
            error_message: error?.message,
            response_code: error?.response?.body?.error_code,
        });
        // generic[messenger].client = await pierObj.telegram.common.Start({
        //   messenger,
        // })
        generic[messenger].client.stopPolling().then(() => {
            setTimeout(() => {
                logger.log({
                    level: "info",
                    function: "pierObj.telegram.StartService",
                    message: "restarting polling",
                });
                generic[messenger].client.startPolling();
            }, 3000);
        });
        // if (error.code === "ETELEGRAM" && error.response.body.error_code === 404) {
        //   config.MessengersAvailable[messenger] = false
        // }
    });
    const [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.getMe());
    if (err) {
        logger.log({
            level: "error",
            function: "StartService",
            messenger,
            message: err.message || "",
        });
    }
    else {
        config.piers[messenger].myUser = res;
    }
};
pierObj.webwidget.common = {
    Start: async function () {
        return;
    },
};
pierObj.vkboard.common = {
    Start: async function ({ messenger }) {
        const callbackService = new vk_io_1.CallbackService();
        const direct = new authorization_1.ImplicitFlowUser({
            callbackService,
            scope: "offline,wall,groups",
            apiVersion: config.piers[messenger].apiVersion,
            login: config.piers[messenger].login,
            password: config.piers[messenger].password,
            // manually provide app credentials
            clientId: config.piers[messenger].appId,
            clientSecret: config.piers[messenger].appSecret,
        });
        const [err, vkapp] = await (0, await_to_js_1.default)(direct.run());
        if (err) {
            console.error("vkboard", err.toString());
        }
        const vkbot = new VkBot({
            token: config.piers[messenger].token,
            group_id: config.piers[messenger].group_id,
        });
        return { bot: vkbot, vkapp };
    },
};
pierObj.vkwall.common = {
    Start: async function ({ messenger }) {
        const callbackService = new vk_io_1.CallbackService();
        const direct = new authorization_1.ImplicitFlowUser({
            callbackService,
            scope: "offline,wall,groups",
            apiVersion: config.piers[messenger].apiVersion,
            login: config.piers[messenger].login,
            password: config.piers[messenger].password,
            // manually provide app credentials
            clientId: config.piers[messenger].appId,
            clientSecret: config.piers[messenger].appSecret,
        });
        const [err, vkapp] = await (0, await_to_js_1.default)(direct.run());
        if (err) {
            console.error("vkwall", err.toString());
        }
        const vkbot = new VkBot({
            token: config.piers[messenger].token,
            group_id: config.piers[messenger].group_id,
        });
        return { bot: vkbot, vkapp };
    },
};
pierObj.slack.common = {
    Start: async function ({ messenger }) {
        generic[messenger].client = {
            rtm: new RTMClient(config.piers[messenger].token),
            web: new WebClient(config.piers[messenger].token),
        };
        generic[messenger].client.rtm.start().catch((e) => {
            if (!e?.data?.ok) {
                config.MessengersAvailable[messenger] = false;
                log("slack")({
                    error: "Couldn't start Slack",
                });
            }
        });
        return true;
    },
};
pierObj.mattermost.common = {
    Start: async function ({ messenger }) {
        let [err, res] = await (0, await_to_js_1.default)(new Promise((resolve) => {
            const credentials = {
                login_id: config.piers[messenger].login,
                password: config.piers[messenger].password,
            };
            const url = `${config.piers[messenger].ProviderUrl}/api/v4/users/login`;
            (0, request_1.default)({
                body: JSON.stringify(credentials),
                method: "POST",
                url,
            }, (err, response, body) => {
                if (err) {
                    console.error(err);
                    resolve(null);
                }
                else {
                    resolve({
                        token: response?.headers?.token || "",
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
            config.piers[messenger].token = res.token;
            config.piers[messenger].user_id = res.id;
        }
        ;
        [err, res] = await (0, await_to_js_1.default)(new Promise((resolve) => {
            const user_id = config.piers[messenger].user_id;
            const url = `${config.piers[messenger].ProviderUrl}/api/v4/users/${user_id}/teams`;
            (0, request_1.default)({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config.piers[messenger].token}`,
                },
            }, (error, response, body) => {
                if (err) {
                    console.error(err);
                    resolve(null);
                }
                else {
                    const team = JSON.parse(body).find((i) => {
                        return (i.display_name === config.piers[messenger].team ||
                            i.name === config.piers[messenger].team);
                    });
                    config.piers[messenger].team_id = team.id;
                    resolve(team);
                }
            });
        }));
        if (!res) {
            config.MessengersAvailable[messenger] = false;
            return;
        }
        const ReconnectingWebSocket = require("reconnecting-websocket");
        return new ReconnectingWebSocket(config.piers[messenger].APIUrl, [], {
            WebSocket: require("ws"),
        });
    },
};
// sendTo
async function FormatMessageChunkForSending({ messenger, channelId, author, chunk, action, title, quotation, }) {
    const root_messenger = common.root_of_messenger(messenger);
    if (quotation) {
        if (!author || author === "")
            author = "-";
        chunk = common.LocalizeString({
            messenger,
            channelId,
            localized_string_key: `OverlayMessageWithQuotedMark.${root_messenger}`,
            arrElemsToInterpolate: [
                ["author", author],
                ["chunk", chunk],
                ["title", title],
            ],
        });
        log(messenger)({
            level: "info",
            function: "OverlayMessageWithQuotedMark",
            messenger,
            channelId,
            author,
            chunk,
            title,
        });
    }
    else if ((author || "") !== "") {
        if ((config.piers[messenger].Actions || []).includes(action)) {
            chunk = common.LocalizeStringWrapper({
                messenger,
                channelId,
                localized_string_key: `sendTo.${root_messenger}.action`,
                arrElemsToInterpolate: [
                    ["author", author],
                    ["chunk", chunk],
                    ["title", title],
                ],
            });
        }
        else {
            chunk = common.LocalizeStringWrapper({
                messenger,
                channelId,
                localized_string_key: `sendTo.${root_messenger}.normal`,
                arrElemsToInterpolate: [
                    ["author", author],
                    ["chunk", chunk],
                    ["title", title],
                ],
            });
        }
    }
    else {
        chunk = common.LocalizeStringWrapper({
            messenger,
            channelId,
            localized_string_key: `sendTo.${root_messenger}.ChunkOnly`,
            arrElemsToInterpolate: [
                ["chunk", chunk],
                ["title", title],
            ],
        });
    }
    return chunk;
}
pierObj.webwidget.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    await new Promise((resolve) => {
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
        generic[messenger].Lojban1ChatHistory = generic[messenger].Lojban1ChatHistory.slice((config.piers[messenger].historyLength || 201) * -1);
        generic[messenger].client.emit("sentFrom", {
            data,
        });
        log("webwidget")({ "sending message": data });
        resolve(null);
    });
};
// pierObj.facebook.sendTo = async ({
//   messenger,
//   channelId,
//   author,
//   chunk,
//   action,
//   quotation,
//   file,
//   edited,
// }: IsendToArgs) => {
//   await new Promise((resolve: any) => {
//     setTimeout(() => {
//       const jsonMessage: Json = {
//         body: chunk,
//       }
//       if (file) jsonMessage.attachment = fs.createReadStream(file)
//       generic[messenger].client.sendMessage(channelId, chunk).catch(catchError)
//       resolve(null)
//     }, 500)
//   })
// }
pierObj.mattermost.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    await new Promise((resolve) => {
        const option = {
            url: config.piers[messenger].HookUrl,
            json: {
                text: chunk,
                // username: author,
                channel: channelId,
            },
        };
        request_1.default.post(option, (error, response, body) => {
            resolve(null);
        });
    });
};
pierObj.vkwall.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    if (!generic[messenger].client.vkapp) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    await new Promise((resolve) => {
        const token = generic[messenger].client.vkapp.token;
        setTimeout(() => {
            generic[messenger].client.bot
                .api("wall.createComment", {
                access_token: token,
                owner_id: "-" + config.piers[messenger].group_id,
                post_id: channelId,
                from_group: config.piers[messenger].group_id,
                reply_to_comment: 1,
                message: chunk,
            })
                .then((res) => { })
                .catch(() => { });
            resolve(null);
        }, 60000);
    });
};
pierObj.vkboard.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    //todo: if !vk.WaitingForCaptcha return
    if (!generic[messenger].client.vkapp) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    await new Promise((resolve) => {
        const token = generic[messenger].client.vkapp.token;
        setTimeout(() => {
            generic[messenger].client.bot
                .api("board.createComment", {
                access_token: token,
                group_id: config.piers[messenger].group_id,
                topic_id: channelId,
                message: chunk,
                from_group: 1,
            })
                .then((res) => { })
                .catch(() => { });
            resolve(null);
        }, 60000);
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
pierObj.slack.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    chunk = emoji.unemojify(chunk);
    generic[messenger].client.web.chat
        .postMessage({
        channel: channelId,
        username: (author || "").replace(/(^.{21}).*$/, "$1"),
        text: chunk,
    })
        .catch((error) => {
        logger.log({
            level: "error",
            function: "slack.sendTo",
            message: error.toString(),
        });
    });
};
pierObj.irc.sendTo = async ({ messenger, channelId, author, chunk, action, quotation, file, edited, }) => {
    log("irc")({ "sending for irc": chunk });
    generic[messenger].client.say(channelId, chunk);
};
async function prepareChunks({ messenger, channelId, text, edited, messengerTo, }) {
    const root_messengerTo = common.root_of_messenger(messengerTo);
    const arrChunks = pierObj[messengerTo]?.common?.GetChunks
        ? await pierObj[messengerTo]?.common?.GetChunks(text, messengerTo)
        : await common.GetChunks(text, messengerTo);
    for (let i in arrChunks) {
        log("generic")(`converting for messenger ${messengerTo} the text "` + arrChunks[i] + `"`);
        if (edited)
            arrChunks[i] = common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: `OverlayMessageWithEditedMark.${root_messengerTo}`,
                arrElemsToInterpolate: [["message", arrChunks[i]]],
            });
        arrChunks[i] = await pierObj[root_messengerTo]?.convertTo({
            text: arrChunks[i] || "",
            messenger,
            messengerTo,
        });
        log("generic")(`converted for messenger ${messengerTo} to the text "` +
            arrChunks[i] +
            `"`);
    }
    return arrChunks;
}
pierObj.irc.common.prepareToWhom = function ({ messenger, text, targetChannel, }) {
    const ColorificationMode = config?.channelMapping?.[messenger]?.[targetChannel]?.settings?.nickcolor ||
        "mood";
    return `${ircolors.MoodifyText({
        text,
        mood: ColorificationMode,
    })}: `;
};
common.prepareToWhom = function ({ messenger, text, targetChannel, }) {
    return `${text}: `;
};
pierObj.irc.common.prepareAuthor = function ({ messenger, text, targetChannel, }) {
    const ColorificationMode = config?.channelMapping?.[messenger]?.[targetChannel]?.settings?.nickcolor ||
        "mood";
    return `${ircolors.MoodifyText({
        text,
        mood: ColorificationMode,
    })}`;
};
common.prepareAuthor = function ({ messenger, text, targetChannel, }) {
    return `${text}`;
};
async function universalSendTo({ messenger, channelId, author, chunk, quotation, action, file, edited, avatar, }) {
    if (config?.channelMapping?.[messenger]?.[channelId]?.settings?.readonly)
        return;
    queueOf[messenger].add(async () => {
        await pierObj[common.root_of_messenger(messenger)]?.sendTo({
            messenger: messenger,
            channelId,
            author,
            chunk,
            quotation,
            action,
            file,
            edited,
            avatar,
        });
    });
}
async function sendFrom({ messenger, channelId, topicId, author, text, ToWhom, quotation, action, file, remote_file, edited, avatar, }) {
    const ConfigNode = config?.channelMapping?.[messenger]?.[topicId ? `${topicId}@${channelId}` : channelId];
    if (!ConfigNode)
        return common.LogToAdmin(`error finding assignment to ${messenger} channel with id ${channelId}`);
    if (!text || text === "")
        return;
    const messenger_core = common.root_of_messenger(messenger);
    text = await pierObj[messenger_core]?.convertFrom({ text, messenger });
    text = text.replace(/\*/g, "&#x2A;").replace(/_/g, "&#x5F;");
    text = text.replace(/^(<br\/>)+/, "");
    const nsfw = config?.channelMapping?.[messenger]?.[channelId]?.settings?.nsfw_analysis &&
        file
        ? (await (0, await_to_js_1.default)(getNSFWString(remote_file)))[1]
        : null;
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
                    title: config.piers[messenger].group_id,
                    author,
                    chunk,
                    action,
                    quotation,
                });
            }
            Chunks.map((chunk) => {
                universalSendTo({
                    messenger,
                    channelId: ConfigNode[messenger],
                    author,
                    chunk,
                    quotation,
                    action,
                    file,
                    edited,
                    avatar,
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
                if (pierObj[messengerTo]?.common?.prepareToWhom) {
                    thisToWhom = pierObj[messengerTo]?.common.prepareToWhom({
                        messenger: messengerTo,
                        text: ToWhom,
                        targetChannel: ConfigNode[messengerTo],
                    });
                }
                else
                    thisToWhom = common.prepareToWhom({
                        messenger: messengerTo,
                        text: ToWhom,
                        targetChannel: ConfigNode[messengerTo],
                    });
            if (!author)
                author = "";
            if (pierObj[messengerTo]?.common?.prepareAuthor) {
                author = pierObj[messengerTo]?.common?.prepareAuthor({
                    messenger: messengerTo,
                    text: author,
                    targetChannel: ConfigNode[messengerTo],
                });
            }
            else
                author = common.prepareAuthor({
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
                    title: config.piers[messenger]?.group_id,
                    author,
                    chunk: thisToWhom + chunk,
                    action,
                    quotation,
                });
            }
            Chunks.map((chunk) => {
                universalSendTo({
                    messenger: messengerTo,
                    channelId: ConfigNode[messengerTo],
                    author,
                    chunk,
                    quotation,
                    action,
                    file,
                    edited,
                    avatar,
                });
            });
        }
    }
}
async function getNSFWString(file) {
    if (file === undefined)
        return null;
    // if (file.substr(-4) !== ".jpg") return
    const tf = require("@tensorflow/tfjs-node");
    const nsfw = require("nsfwjs");
    const pic = await axios_1.default.get(file, {
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
// receivedFrom
pierObj.facebook.receivedFrom = async (messenger, message) => {
    if (!config?.channelMapping[messenger]?.[(message?.threadId || "").toString()])
        return;
    let err, res;
    [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.getUserInfo(message.authorId));
    if (err)
        return;
    let author;
    author = pierObj.facebook.adaptName(res);
    if (!message.attachments)
        message.attachments = [];
    if (message.stickerId)
        message.attachments.push({ id: message.stickerId, type: "sticker" });
    for (const attachment of message.attachments) {
        if (attachment.type === "sticker") {
            ;
            [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.getStickerURL(attachment.id));
        }
        else {
            ;
            [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.getAttachmentURL(message.id, attachment.id));
        }
        if (err)
            return;
        //todo: add type="photo","width","height","size"
        common
            .downloadFile({
            messenger,
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
pierObj.vkwall.receivedFrom = async (messenger, message) => {
    if (!config.channelMapping[messenger])
        return;
    const channelId = message.post_id;
    if (!config.channelMapping[messenger][channelId] ||
        "-" + config.piers[messenger].group_id === message.from_id.toString())
        return;
    if (!generic[messenger].client.vkapp) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    let { text, from_id: fromwhomId } = message;
    let [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.bot.api("users.get", {
        user_ids: fromwhomId,
        access_token: config.piers[messenger].token,
        fields: "nickname,screen_name",
    }));
    res = res?.response?.[0] || fromwhomId;
    const author = pierObj.vkwall.adaptName(messenger, res);
    let arrQuotes = [];
    text.replace(/\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g, (match, group_id, post_id) => {
        if (group_id === config.piers[messenger].group_id) {
            arrQuotes.push(post_id);
        }
    });
    if (arrQuotes.length > 0) {
        const token = generic[messenger].client.vkapp.token;
        for (const el of arrQuotes) {
            const opts = {
                access_token: token,
                group_id: config.piers[messenger].group_id,
                topic_id: channelId,
                start_comment_id: el,
                count: 1,
                v: "5.84",
            };
            [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.bot.api("board.getComments", opts));
            let text = res?.response?.items?.[0]?.text;
            if (!text)
                continue;
            let replyuser;
            const rg = new RegExp(`^\\[club${config.piers[messenger]?.group_id}\\|(.*?)\\]: (.*)$`);
            if (rg.test(text)) {
                ;
                [, replyuser, text] = Array.from(text.match(rg) ?? []);
            }
            else {
                let authorId = res?.response?.items?.[0]?.from_id;
                [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.bot.api("users.get", {
                    user_ids: authorId,
                    access_token: config.piers[messenger].token,
                    fields: "nickname,screen_name",
                }));
                replyuser = res?.response?.[0] || "";
                replyuser = pierObj.vkwall.adaptName(messenger, replyuser);
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
                    const sizes = (a.photo?.sizes ?? [])
                        .map((i) => {
                        i.square = i.width * i.height;
                        return i;
                    })
                        .sort((d, c) => parseFloat(c.size) - parseFloat(d.size));
                    if (sizes[0].url)
                        texts.push(sizes[0].url);
                    if (a?.photo?.text)
                        texts.push(a?.photo?.text);
                    break;
                case "doc":
                    if (a?.doc?.url)
                        texts.push(a.doc.url);
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
pierObj.vkboard.receivedFrom = async (messenger, message) => {
    if (!config.channelMapping[messenger])
        return;
    const channelId = message.topic_id;
    if (!config.channelMapping[messenger][channelId] ||
        message.topic_owner_id === message.from_id)
        return;
    if (!generic[messenger].client.vkapp) {
        config.MessengersAvailable[messenger] = false;
        return;
    }
    let text = message.text;
    const fromwhomId = message.from_id;
    let [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.bot.api("users.get", {
        user_ids: fromwhomId,
        access_token: config.piers[messenger].token,
        fields: "nickname,screen_name",
    }));
    res = res?.response?.[0] || fromwhomId;
    const author = pierObj.vkboard.adaptName(messenger, res);
    let arrQuotes = [];
    text.replace(/\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g, (match, group_id, post_id) => {
        if (group_id === config.piers[messenger].group_id) {
            arrQuotes.push(post_id);
        }
    });
    if (arrQuotes.length > 0) {
        const token = generic[messenger].client.vkapp.token;
        for (const el of arrQuotes) {
            const opts = {
                access_token: token,
                group_id: config.piers[messenger].group_id,
                topic_id: channelId,
                start_comment_id: el,
                count: 1,
                v: "5.84",
            };
            [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.bot.api("board.getComments", opts));
            let text = res?.response?.items?.[0]?.text;
            if (!text)
                continue;
            let replyuser;
            const rg = new RegExp(`^\\[club${config.piers[messenger].group_id}\\|(.*?)\\]: (.*)$`);
            if (rg.test(text)) {
                ;
                [, replyuser, text] = Array.from(text.match(rg) ?? []);
            }
            else {
                let authorId = res?.response?.items?.[0]?.from_id;
                [err, res] = await (0, await_to_js_1.default)(generic[messenger].client.bot.api("users.get", {
                    user_ids: authorId,
                    access_token: config.piers[messenger]?.token,
                    fields: "nickname,screen_name",
                }));
                replyuser = res?.response?.[0] || "";
                replyuser = pierObj.vkboard.adaptName(messenger, replyuser);
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
                    const sizes = (a?.photo?.sizes ?? [])
                        .map((i) => {
                        i.square = i.width * i.height;
                        return i;
                    })
                        .sort((d, c) => parseFloat(c.size) - parseFloat(d.size));
                    if (sizes[0].url)
                        texts.push(sizes[0].url);
                    if (a?.photo?.text)
                        texts.push(a?.photo?.text);
                    break;
                case "doc":
                    if (a?.doc?.url)
                        texts.push(a.doc.url);
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
pierObj.slack.receivedFrom = async (messenger, message) => {
    if (!config.channelMapping[messenger])
        return;
    if (message.subtype === "message_changed" &&
        message?.message?.text === message?.previous_message?.text &&
        (message?.files || []).length === 0)
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
    [err, user] = await (0, await_to_js_1.default)(promUser);
    if (err)
        user = message.user;
    [err, chan] = await (0, await_to_js_1.default)(promChannel);
    if (err)
        chan = message.channel;
    const resolveFiles = await (0, await_to_js_1.default)(Promise.all(promFiles));
    [err, files] = resolveFiles;
    if (err)
        files = [];
    const author = pierObj.slack.adaptName(messenger, user);
    const channelId = chan.channel.name || message.channel;
    let action = undefined;
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
    if (files && files.length > 0)
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
pierObj.mattermost.receivedFrom = async (messenger, message) => {
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
        const post = JSON.parse(message.data?.post || "");
        if (!post.id)
            return;
        message.event = "posted";
        message.edited = true;
        let err;
        [err] = await (0, await_to_js_1.default)(new Promise((resolve) => {
            const url = `${config.piers[messenger].ProviderUrl}/api/v4/posts/${post.id}`;
            (0, request_1.default)({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config.piers[messenger].token}`,
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
        [err] = await (0, await_to_js_1.default)(new Promise((resolve) => {
            const url = `${config.piers[messenger].ProviderUrl}/api/v4/users/${post.user_id}`;
            (0, request_1.default)({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config.piers[messenger].token}`,
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
        [err] = await (0, await_to_js_1.default)(new Promise((resolve) => {
            const url = `${config.piers[messenger].ProviderUrl}/api/v4/channels/${post.channel_id}`;
            (0, request_1.default)({
                method: "GET",
                url,
                headers: {
                    Authorization: `Bearer ${config.piers[messenger].token}`,
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
        if (message.data?.team_id !== config.piers[messenger].team_id)
            return;
        if (message.event !== "posted")
            return;
        const post = message.data?.post;
        if (!post)
            return;
        postParsed = JSON.parse(post);
        channelId = message.data?.channel_name;
    }
    if (config.channelMapping[messenger][channelId] &&
        !postParsed?.props?.from_webhook &&
        (postParsed?.type || "") === "") {
        if (!file_ids)
            file_ids = postParsed?.file_ids || [];
        let files = [];
        for (const file of file_ids) {
            const [err, promfile] = await (0, await_to_js_1.default)(new Promise((resolve) => {
                const url = `${config.piers[messenger].ProviderUrl}/api/v4/files/${file}/link`;
                (0, request_1.default)({
                    method: "GET",
                    url,
                    headers: {
                        Authorization: `Bearer ${config.piers[messenger].token}`,
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
            const [err2, promfile2] = await (0, await_to_js_1.default)(new Promise((resolve) => {
                const url = `${config.piers[messenger].ProviderUrl}/api/v4/files/${file}/info`;
                (0, request_1.default)({
                    method: "GET",
                    url,
                    headers: {
                        Authorization: `Bearer ${config.piers[messenger].token}`,
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
                console.error(err?.toString());
            if (promfile && promfile2)
                files.push([promfile2, promfile]);
        }
        author = author || message.data?.sender_name;
        author = author.replace(/^@/, "");
        if (files.length > 0) {
            for (const [extension, file] of files) {
                const [file_, localfile] = await common.downloadFile({
                    messenger,
                    type: "simple",
                    remote_path: file,
                    extension,
                });
                sendFrom({
                    messenger,
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
            messenger,
            channelId,
            author,
            text: msgText || postParsed?.message,
            action,
            edited: message.edited,
        });
    }
};
pierObj.irc.receivedFrom = async (messenger, { author, channelId, text, handler, error, type, }) => {
    if (!config?.channelMapping[messenger])
        return;
    if (type === "message") {
        if (text.search(new RegExp(config.spamremover.irc.source, "i")) >= 0)
            return;
        text = ircolors.stripColorsAndStyle(text);
        text = `<${ircolors
            .stripColorsAndStyle(author)
            .replace(/_+$/g, "")}>: ${text}`;
        if (!config?.channelMapping[messenger]?.[channelId]?.settings
            ?.dontProcessOtherBridges) {
            text = text
                .replace(/^<[^ <>]+?>: <([^<>]+?)> ?: /, "*$1*: ")
                .replace(/^<[^ <>]+?>: &lt;([^<>]+?)&gt; ?: /, "*$1*: ");
        }
        text = text
            .replace(/^<([^<>]+?)>: /, "*$1*: ")
            .replace(/^\*([^<>]+?)\*: /, "<b>$1</b>: ");
        [, author, text] = Array.from(text.match(/^<b>(.+?)<\/b>: (.*)/) ?? []);
        if (text && text !== "") {
            sendFrom({
                messenger,
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
            !config.piers[messenger].sendTopic ||
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
        //todo: restart irc and resend the message:
        // pierObj.irc.StartService({messenger})
    }
    else if (type === "registered") {
        config.piers[messenger].ircPerformCmds.forEach((cmd) => {
            handler.send.apply(null, cmd.split(" "));
        });
        config.piers[messenger].ircOptions.channels.forEach((channel) => {
            handler.join(channel);
        });
    }
};
// AdaptName
pierObj.facebook.adaptName = (user) => user.name; // || user.vanity || user.firstName;
pierObj.vkboard.adaptName = (messenger, user) => {
    let full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    if (full_name === "")
        full_name = undefined;
    if (user.nickname && user.nickname.length < 1)
        user.nickname = null;
    if (user.screen_name && user.screen_name.length < 1)
        user.screen_name = null;
    return user.screen_name || user.nickname || full_name || user.id;
};
pierObj.vkwall.adaptName = pierObj.vkboard.adaptName;
pierObj.slack.adaptName = (messenger, user) => user?.user?.profile?.display_name || user?.user?.real_name || user?.user?.name;
pierObj.slack.convertFrom = async ({ text, messenger, }) => {
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
        const action = match?.[1]?.substr(0, 1);
        let p;
        switch (action) {
            case "!":
                return tag("span", { class: "slack-cmd" }, payloads(match?.[1], 1)[0]);
            case "#":
                p = payloads(match?.[1], 2);
                return tag("span", { class: "slack-channel" }, p.length === 1 ? p[0] : p[1]);
            case "@":
                p = payloads(match?.[1], 2);
                return tag("span", { class: "slack-user" }, p.length === 1 ? p[0] : p[1]);
            default:
                p = payloads(match?.[1]);
                return tag("a", { href: p[0] }, p.length === 1 ? p[0] : p[1]);
        }
    };
    const safeMatch = (match, tag, trigger) => {
        let prefix_ok = match?.index === 0;
        let postfix_ok = match?.index === (match?.input?.length ?? 0) - (match?.[0]?.length ?? 0);
        if (!prefix_ok) {
            const charAtLeft = match?.input?.substr(match.index - 1, 1);
            prefix_ok =
                notAlphanumeric(charAtLeft || "") &&
                    notRepeatedChar(trigger || "", charAtLeft || "");
        }
        if (!postfix_ok) {
            const charAtRight = match?.input?.substr(match.index + match[0].length, 1);
            postfix_ok =
                notAlphanumeric(charAtRight || "") &&
                    notRepeatedChar(trigger || "", charAtRight || "");
        }
        if (prefix_ok && postfix_ok)
            return tag;
        return false;
    };
    const matchBold = (match) => safeMatch(match, tag("strong", payloads(match?.[1])), "*");
    const matchItalic = (match) => safeMatch(match, tag("em", payloads(match?.[1])), "_");
    const matchFixed = (match) => safeMatch(match, tag("code", payloads(match?.[1])));
    const matchPre = (match) => safeMatch(match, tag("pre", payloads(match?.[1])));
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
            const [err, channel] = await (0, await_to_js_1.default)(generic[messenger].client.web.conversations.info({ channel: channelId }));
            if (!err) {
                jsonChannels[channelId] = channel?.channel?.name;
            }
            else {
                log("slack")({
                    error: err,
                });
            }
        }
        for (const userId of Object.keys(jsonUsers)) {
            const [err, user] = await (0, await_to_js_1.default)(generic[messenger].client.web.users.info({ user: userId }));
            if (err) {
                log("slack")({
                    error: err,
                });
            }
            jsonUsers[userId] = pierObj.slack.adaptName(messenger, user);
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
    // text = escapeHTML(text);
    const [error, result] = await (0, await_to_js_1.default)(publicParse(text));
    log("slack")({
        "converting source text": source,
        result: result || text,
        error,
    });
    return result || text;
};
pierObj.facebook.convertFrom = async ({ text, messenger, }) => (0, generic_1.escapeHTML)(text);
pierObj.vkboard.convertFrom = async ({ text, messenger, }) => (0, generic_1.escapeHTML)(text).replace(/\[[^\]]*\|(.*?)\](, ?)?/g, "");
pierObj.vkwall.convertFrom = pierObj.vkboard.convertFrom;
pierObj.mattermost.convertFrom = async ({ text, messenger, }) => markedParse({
    text: (0, generic_1.escapeHTML)(text),
    messenger: "mattermost",
    unescapeCodeBlocks: true,
});
// markedParse({
//   text: text.replace(/^(>[^\n]*?\n)/gm, "$1\n").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
//   messenger: "discord",
//   dontEscapeBackslash: true
// });
pierObj.webwidget.convertFrom = async ({ text, messenger, }) => text;
pierObj.irc.convertFrom = async ({ text, messenger, }) => {
    const result = (0, generic_1.escapeHTML)(text)
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
pierObj.facebook.convertTo = async ({ text, messenger, messengerTo, }) => convertToPlainText(text);
pierObj.vkboard.convertTo = async ({ text, messenger, messengerTo, }) => {
    const result = await common.unescapeHTML({
        text: html2irc(text),
        convertHtmlEntities: false,
    });
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
pierObj.vkwall.convertTo = pierObj.vkboard.convertTo;
pierObj.slack.convertTo = async ({ text, messenger, messengerTo, }) => {
    const result = html2slack(text);
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
pierObj.mattermost.convertTo = async ({ text, messenger, messengerTo, }) => {
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
pierObj.webwidget.convertTo = async ({ text, messenger, messengerTo, }) => text;
pierObj.irc.convertTo = async ({ text, messenger, messengerTo, }) => {
    const result = await common.unescapeHTML({
        text: html2irc(text),
        convertHtmlEntities: true,
    });
    log(messenger)({ messengerTo, "converting text": text, result });
    return result;
};
common.writeCache = async ({ pier, channelName, channelId, action, }) => {
    await new Promise((resolve) => {
        fs_extra_1.default.writeFileSync(`${cache_folder}/channelMapping.json`, JSON.stringify(config.channelMapping));
        fs_extra_1.default.writeFile(`${cache_folder}/cache.json`, JSON.stringify(config.cache), (err) => {
            log("generic")({ pier, action, channelName, channelId, error: err });
            resolve(null);
        });
    });
};
function xovahelojbo({ text }) {
    const arrText = text.split(" ");
    const xovahe = arrText.filter((i) => lojban.ilmentufa_off("lo'u " + i + " le'u").tcini === "snada").length / arrText.length;
    return xovahe;
}
// common
common.ConfigBeforeStart = () => {
    if (process.argv[2] === "--genconfig") {
        mkdirp_1.mkdirp.sync(cache_folder);
        // read default config using readFile to include comments
        const config = fs_extra_1.default.readFileSync(defaults);
        const configPath = `${cache_folder}/config.js`;
        fs_extra_1.default.writeFileSync(configPath, config);
        throw new Error(`Wrote default configuration to ${configPath}, please edit it before re-running`);
    }
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
    localizationConfig = require("../src/local/dict.json");
};
common.getMessengersWithPrefix = async (prefix) => {
    return Object.keys(config.MessengersAvailable).filter((el) => el.indexOf(prefix + "_") === 0 && config.MessengersAvailable[el] === true);
};
pierObj.irc.getChannels = async (pier) => {
    const json = config.piers[pier].ircOptions.channels.reduce((json, value) => {
        json[value] = value;
        return json;
    }, {});
    config.cache[pier] = json;
};
pierObj.slack.getChannels = async (pier) => {
    let [err, res] = await (0, await_to_js_1.default)(generic[pier].client.web.conversations.list());
    if (err) {
        console.error(err);
    }
    res = res?.channels || [];
    const json = {};
    res.map((i) => {
        json[i.name] = i.name;
    });
    config.cache[pier] = json;
};
pierObj.mattermost.getChannels = async (pier) => {
    let json = {};
    let url = `${config.piers[pier].ProviderUrl}/api/v4/teams/${config.piers[pier].team_id}/channels`;
    json = await pierObj.mattermost.common.GetChannelsMattermostCore(pier, json, url);
    url = `${config.piers[pier].ProviderUrl}/api/v4/users/${config.piers[pier].user_id}/teams/${config.piers[pier].team_id}/channels`;
    json = await pierObj.mattermost.common.GetChannelsMattermostCore(pier, json, url);
    config.cache[pier] = json;
};
pierObj.mattermost.common.GetChannelsMattermostCore = async (messenger, json, url) => {
    await (0, await_to_js_1.default)(new Promise((resolve) => {
        (0, request_1.default)({
            method: "GET",
            url,
            headers: {
                Authorization: `Bearer ${config.piers[messenger].token}`,
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
};
async function PopulateChannelMappingCore({ messenger, }) {
    if (!config.MessengersAvailable[messenger])
        return;
    if (!config.channelMapping[messenger])
        config.channelMapping[messenger] = {};
    const arrMappingKeys = Object.keys(config.MessengersAvailable).filter((el) => config.MessengersAvailable[el] === true);
    config.new_channels.map((newChannel) => {
        let i_mapped = newChannel[messenger];
        let topicalizedChannel = {};
        if (config.cache[messenger]) {
            topicalizedChannel = {
                groupName: newChannel[messenger]?.groupName,
                topicId: newChannel[messenger]?.topicId,
                removeJoinMessages: newChannel[messenger]
                    ?.removeJoinMessages,
            };
            if (topicalizedChannel.groupName && topicalizedChannel.topicId) {
                i_mapped = `${topicalizedChannel.topicId}@${config.cache?.[messenger]?.[topicalizedChannel.groupName]}`;
            }
            else if (topicalizedChannel.groupName) {
                i_mapped = config.cache?.[messenger]?.[topicalizedChannel.groupName];
            }
            else {
                i_mapped = config.cache?.[messenger]?.[newChannel[messenger]];
            }
        }
        if (!i_mapped)
            return;
        const mapping = {
            settings: {
                readonly: newChannel[`${messenger}-readonly`],
                dontProcessOtherBridges: newChannel[`${messenger}-dontProcessOtherBridges`],
                nsfw_analysis: newChannel[`nsfw_analysis`],
                language: newChannel["language"],
                restrictToLojban: newChannel["restrictToLojban"],
                nickcolor: newChannel[`${messenger}-nickcolor`],
                name: newChannel[messenger],
                topicId: (topicalizedChannel.topicId || ""),
                removeJoinMessages: (topicalizedChannel.removeJoinMessages ?? false),
            },
        };
        for (const key of arrMappingKeys)
            mapping[key] = newChannel[key]?.groupName
                ? `${newChannel[key]?.topicId}@${config.cache?.[key]?.[newChannel[key]?.groupName] || newChannel[key]}`
                : config.cache?.[key]?.[newChannel[key]] || newChannel[key];
        config.channelMapping[messenger][i_mapped] = R.mergeDeepLeft(mapping, config.channelMapping[messenger][i_mapped] || {});
    });
    fs_extra_1.default.writeFileSync(`${cache_folder}/channelMapping.json`, JSON.stringify(config.channelMapping, null, 2));
}
common.PopulateChannelMapping = async () => {
    if (!config.channelMapping)
        config.channelMapping = {};
    if (!config.cache)
        config.cache = {};
    const arrAvailableMessengers = Object.keys(config.MessengersAvailable).filter((i) => !!config.MessengersAvailable[i]);
    for (const pier of arrAvailableMessengers) {
        const messenger = common.root_of_messenger(pier);
        if (pierObj[messenger]?.getChannels)
            await pierObj[messenger].getChannels(pier);
    }
    for (const pier of arrAvailableMessengers) {
        await PopulateChannelMappingCore({ messenger: pier });
    }
};
common.root_of_messenger = (messenger_with_index) => messenger_with_index.replace(/_.*/g, "").replace(/_.*/g, "");
common.MessengersAvailable = () => {
    config.MessengersAvailable = {};
    config.new_channels.forEach((i) => {
        Object.keys(i)
            .filter((a) => a.indexOf("-") === -1 && a.indexOf("_") > 0)
            .forEach((a) => (config.MessengersAvailable[a] = true));
    });
    Object.keys(config.MessengersAvailable).forEach((messenger_with_index) => {
        const messenger = common.root_of_messenger(messenger_with_index);
        const pier_config = config.piers[messenger_with_index];
        const falsies = (messenger === "facebook" &&
            (!pier_config?.email || !pier_config?.password)) ||
            (messenger === "discord" &&
                (!pier_config?.client ||
                    !pier_config?.token ||
                    !pier_config?.guildId)) ||
            (messenger === "telegram" && !pier_config?.token) ||
            (messenger === "vkboard" &&
                (!pier_config?.token ||
                    !pier_config?.group_id ||
                    !pier_config?.login ||
                    !pier_config?.password)) ||
            (messenger === "vkwall" &&
                (!pier_config?.token ||
                    !pier_config?.group_id ||
                    !pier_config?.login ||
                    !pier_config?.password));
        if (falsies)
            delete config.MessengersAvailable[messenger_with_index];
    });
    Object.keys(config.MessengersAvailable).forEach((messenger) => (generic[messenger] = {}));
};
// pierObj.facebook.StartService = async ({ force, messenger = "facebook" }: { force: boolean, messenger?: string }) => {
//   //facebook
//   if (!force && !config.MessengersAvailable[messenger]) return
//   try {
//     generic[messenger].client = await login(
//       config.piers[messenger].email,
//       config.piers[messenger].password
//     )
//     console.log(generic[messenger].client)
//     console.log(JSON.stringify(generic[messenger].client.getSession()))
//     generic[messenger].client.on("message", (message: any) => {
//       pierObj.facebook.receivedFrom(messenger, message)
//     })
//     config.MessengersAvailable[messenger] = true
//   } catch (e) {
//     console.log(e.toString())
//     // config.MessengersAvailable[messenger] = false;
//     // StartService[messenger]({force: true});
//   }
// }
pierObj.webwidget.StartService = async ({ messenger, }) => {
    generic[messenger] = {
        Lojban1ChatHistory: [],
        client: require("socket.io")(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                // allowedHeaders: ["my-custom-header"],
                credentials: true,
            },
        }),
    };
    generic[messenger].client.sockets.on("connection", (socket) => {
        socket.emit("history", generic[messenger].Lojban1ChatHistory);
    });
};
pierObj.vkwall.StartService = async ({ messenger }) => {
    //vkboard
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client = await pierObj.vkwall.common.Start({ messenger });
    generic[messenger].client.bot.event("wall_reply_new", async ({ message }) => {
        pierObj.vkwall.receivedFrom(messenger, message);
    });
    generic[messenger].client.bot.event("wall_reply_edit", async ({ message }) => {
        pierObj.vkwall.receivedFrom(messenger, { ...message, edited: true });
    });
    generic[messenger].client.bot.startPolling();
};
pierObj.vkboard.StartService = async ({ messenger }) => {
    //vkboard
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client = await pierObj.vkboard.common.Start({ messenger });
    generic[messenger].client.bot.event("board_post_new", async ({ message }) => {
        pierObj.vkboard.receivedFrom(messenger, message);
    });
    generic[messenger].client.bot.event("board_post_edit", async ({ message }) => {
        pierObj.vkboard.receivedFrom(messenger, { ...message, edited: true });
    });
    generic[messenger].client.bot.startPolling((error) => {
        if (error) {
            logger.log({
                level: "error",
                function: "vkboard long polling",
                type: "data",
                message: error.toString(),
            });
        }
    });
};
pierObj.slack.StartService = async ({ messenger }) => {
    //slack
    await pierObj.slack.common.Start({ messenger });
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client.rtm.on("message", (message) => {
        pierObj.slack.receivedFrom(messenger, message);
    });
};
pierObj.mattermost.StartService = async ({ messenger, }) => {
    //mattermost
    generic[messenger].client = await pierObj.mattermost.common.Start({
        messenger,
    });
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client.addEventListener("open", () => {
        generic[messenger].client.send(JSON.stringify({
            seq: 1,
            action: "authentication_challenge",
            data: {
                token: config.piers[messenger].token,
            },
        }));
    });
    generic[messenger].client.addEventListener("message", (message) => {
        if (!message?.data || !config.piers[messenger].team_id)
            return;
        message = JSON.parse(message.data);
        pierObj.mattermost.receivedFrom(messenger, message);
    });
    generic[messenger].client.addEventListener("close", () => generic[messenger].client._connect());
    generic[messenger].client.addEventListener("error", () => generic[messenger].client._connect());
};
pierObj.irc.StartService = async ({ messenger }) => {
    // irc
    const channels = config.new_channels;
    const results = [];
    for (const channel of channels) {
        if (!channel[messenger])
            continue;
        const chanName = channel[`${messenger}-password`]
            ? `${channel[messenger]} ${channel[`${messenger}-password`]}`
            : channel[messenger];
        results.push(chanName);
    }
    config.piers[messenger].ircOptions.channels = [...new Set(results)];
    config.piers[messenger].ircOptions.encoding = "utf-8";
    generic[messenger].client = new Irc.Client(config.piers[messenger].ircServer, config.piers[messenger].ircOptions.nick, config.piers[messenger].ircOptions);
    if (!config.MessengersAvailable[messenger])
        return;
    generic[messenger].client.on("error", (error) => {
        pierObj.irc.receivedFrom(messenger, {
            error,
            type: "error",
        });
        //todo:
        // pierObj.irc.StartService({messenger})
    });
    generic[messenger].client.on("registered", () => {
        pierObj.irc.receivedFrom(messenger, {
            handler: generic[messenger].client,
            type: "registered",
        });
    });
    generic[messenger].client.on("message", (author, channelId, text) => {
        pierObj.irc.receivedFrom(messenger, {
            author,
            channelId,
            text,
            type: "message",
        });
    });
    generic[messenger].client.on("topic", (channelId, topic, author) => {
        pierObj.irc.receivedFrom(messenger, {
            author,
            channelId,
            text: topic,
            type: "topic",
        });
    });
    generic[messenger].client.on("action", (author, channelId, text) => {
        pierObj.irc.receivedFrom(messenger, {
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
    for (const messenger_with_index of Object.keys(config.MessengersAvailable)) {
        const messenger = messenger_with_index.replace(/_.*/g, "");
        if (pierObj[messenger]?.StartService) {
            queueOf[messenger_with_index] = new p_queue_1.default({ concurrency: 1 });
            await pierObj[messenger]?.StartService({
                messenger: messenger_with_index,
            });
        }
    }
    await common.PopulateChannelMapping();
    console.log("Lojban-1Chat-Bridge started!");
}
// helper functions
common.LogMessageToAdmin = async (messenger, message) => {
    if (config.piers[messenger].admins_userid)
        await (0, await_to_js_1.default)(generic[messenger].client.forwardMessage(config.piers[messenger].admins_userid, message.chat.id, message.message_id));
};
function catchError(err) {
    const error = JSON.stringify(err);
    console.log(error);
    common.LogToAdmin(err);
}
common.LogToAdmin = (msg_text, repeat = true) => {
    logger.log({
        level: "error",
        message: JSON.stringify(msg_text),
    });
    const telegram_piers_with_logging_to_admin = Object.keys(config.piers).filter((i) => typeof config.piers[i].admins_userid !== "undefined");
    for (const pier of telegram_piers_with_logging_to_admin)
        if (generic[pier].client)
            generic[pier].client
                .sendMessage(config.piers[pier].admins_userid, `\`\`\`\n${msg_text}\n\`\`\``, {
                parse_mode: "Markdown",
            })
                .catch((e) => {
                if (repeat)
                    common.LogToAdmin(msg_text, false);
            });
};
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
//   if (config.piers[messenger].sendPageTitles) {
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
pierObj.irc.common.GetChunks = async (text, messenger) => {
    const limit = config.piers[messenger].MessageLength || 400;
    // text = await appendPageTitles(text)
    return text.split(/<br>/).flatMap((line) => HTMLSplitter(line, limit));
};
pierObj.webwidget.common.GetChunks = async (text, messenger) => {
    return [text];
};
const diffTwo = (diffMe, diffBy) => {
    diffMe = diffMe
        .replace(/[\n\r]/g, "")
        .replace(/<br \/>/gim, "<br>")
        .replace(/<a_href=/g, "<a href=")
        .replace(/<span_class=/g, "<span class=");
    diffBy = diffBy
        .replace(/[\n\r]/g, "")
        .replace(/<br \/>/gim, "<br>")
        .replace(/<a_href=/g, "<a href=")
        .replace(/<span_class=/g, "<span class=");
    return diffMe.split(diffBy).join("");
};
function HTMLSplitter(text, limit = 400) {
    log("generic")({ message: "html splitter: pre", text });
    const r = new RegExp(`(?<=.{${limit / 2},})[^<>](?![^<>]*>)`, "g");
    text = common.sanitizeHtml(text.replace(/<blockquote>([\s\S]*?)(<br>)*<\/blockquote>/gim, "<blockquote>$1</blockquote>"));
    text = text
        .replace(/<a href=/g, "<a_href=")
        .replace(/<span class=/g, "<span_class=");
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
        const thisChunkUntruncated = DOMPurify.sanitize(thisChunk
            .replace(/<a_href=/g, "<a href=")
            .replace(/<span_class=/g, "<span class="))
            .replace(/<a href=/g, "<a_href=")
            .replace(/<span class=/g, "<span_class=");
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
    Chunks = Chunks.map((chunk) => chunk
        .replace(/<a_href=/g, "<a href=")
        .replace(/<span_class=/g, "<span class="));
    log("generic")({ message: "html splitter: after", Chunks });
    return Chunks;
}
common.GetChunks = async (text, messenger) => {
    // text = await appendPageTitles(text);
    const limit = config.piers[messenger].MessageLength || 400;
    let arrText = HTMLSplitter(text, limit);
    return arrText;
};
function saveDataToFile({ data, local_fullname, }) {
    function decodeBase64Image(dataString) {
        const matches = Array.from(dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/) ?? []);
        const response = {};
        if (matches.length !== 3) {
            return new Error("Invalid input string");
        }
        response.type = matches[1];
        response.data = Buffer.from(matches[2], "base64");
        return response;
    }
    // Regular expression for image type:
    // This regular image extracts the "jpeg" from "image/jpeg"
    const imageTypeRegularExpression = /\/(.*?)$/;
    const imageBuffer = decodeBase64Image(data);
    // This variable is actually an array which has 5 values,
    // The [1] value is the real image extension
    const type = imageBuffer.type.match(imageTypeRegularExpression);
    return { type: type[1], data: imageBuffer.data };
}
common.downloadFile = async ({ messenger, type, fileId = '', remote_path, extension = "", }) => {
    const randomString = blalalavla.cupra(remote_path || fileId.toString());
    const randomStringName = blalalavla.cupra((remote_path || fileId.toString()) + "1");
    mkdirp_1.mkdirp.sync(`${cache_folder}/files/${randomString}`);
    const rem_path = `${config.generic.httpLocation}/${randomString}`;
    const local_path = `${cache_folder}/files/${randomString}`;
    let err, res;
    let rem_fullname = "";
    let local_fullname = "";
    if (type === "slack") {
        local_fullname = `${local_path}/${path_1.default.basename(remote_path)}`;
        [err, res] = await (0, await_to_js_1.default)(new Promise((resolve) => {
            try {
                let file = fs_extra_1.default.createWriteStream(local_fullname);
                file
                    .on("open", () => {
                    (0, request_1.default)({
                        method: "GET",
                        url: remote_path || '',
                        headers: {
                            Authorization: `Bearer ${config.piers[messenger]?.token}`,
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
                        const rem_fullname = `${rem_path}/${path_1.default.basename(remote_path)}`;
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
            const { type, data } = saveDataToFile({
                data: remote_path ?? '',
                local_fullname,
            });
            const basename = randomStringName + "." + (type ?? extension);
            local_fullname = `${local_path}/${basename}`;
            fs_extra_1.default.writeFileSync(local_fullname, data);
            rem_fullname = `${rem_path}/${basename}`;
        }
        catch (error) {
            local_fullname = "";
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
        const basename = path_1.default.basename(remote_path).split(/[\?#]/)[0] + (extension || "");
        local_fullname = `${local_path}/${basename}`;
        await new Promise((resolve, reject) => {
            try {
                let file = fs_extra_1.default.createWriteStream(local_fullname);
                file
                    .on("open", () => {
                    let stream = (0, request_1.default)({
                        method: "GET",
                        url: remote_path ?? '',
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
        [err, local_fullname] = await (0, await_to_js_1.default)(generic[messenger].client.downloadFile(fileId, local_path));
        if (!err)
            rem_fullname = `${rem_path}/${path_1.default.basename(local_fullname)}`;
    }
    if (err) {
        log("telegram")({ remote_path, error: err, type: "generic" });
        return [remote_path || fileId, remote_path || fileId];
    }
    ;
    [err, res] = await (0, await_to_js_1.default)(new Promise((resolve) => {
        const new_name = `${local_path}/${randomStringName}${path_1.default.extname(local_fullname)}`;
        fs_extra_1.default.rename(local_fullname, new_name, (err) => {
            if (err) {
                console.error({ remote_path, error: err, type: "renaming" });
                resolve(null);
            }
            else {
                rem_fullname = `${rem_path}/${path_1.default.basename(new_name)}`;
                resolve([rem_fullname, new_name]);
            }
        });
    }));
    if (!err)
        [rem_fullname, local_fullname] = res;
    //check if it's audio:
    if ([".ogg", ".oga", ".opus", ".wav", ".m4a"].includes(path_1.default.extname(local_fullname))) {
        const local_mp3_file = local_fullname + ".mp3";
        const cp = require("child_process");
        cp.spawnSync("ffmpeg", ["-i", local_fullname, local_mp3_file], {
            encoding: "utf8",
        });
        if (fs_extra_1.default.existsSync(local_mp3_file))
            return [rem_fullname + ".mp3", local_mp3_file];
        return [rem_fullname, local_fullname];
    }
    //check if it's webp/tiff:
    if ([".webp", ".tiff"].includes(path_1.default.extname(local_fullname))) {
        const sharp = require("sharp");
        const jpgname = `${(local_fullname ?? '').split(".").slice(0, -1).join(".")}.jpg`;
        [err, res] = await (0, await_to_js_1.default)(new Promise((resolve) => {
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
                    fs_extra_1.default.unlink(local_fullname);
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
    "span",
]) => {
    return sanitizeHtml(text, {
        allowedTags,
        allowedAttributes: {
            a: ["href", "class"],
        },
    });
};
common.LocalizeStringWrapper = ({ messenger, channelId, localized_string_key, arrElemsToInterpolate, }) => {
    const language = config?.channelMapping?.[messenger]?.[channelId]?.settings?.language ||
        "English";
    const localized_string_key_additional = localized_string_key + ".fallback_solution";
    if (localizationConfig[language][localized_string_key_additional])
        return {
            main: common.LocalizeString({
                messenger,
                channelId,
                localized_string_key,
                arrElemsToInterpolate,
            }),
            fallback_solution: common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: localized_string_key_additional,
                arrElemsToInterpolate,
            }),
        };
    else
        return common.LocalizeString({
            messenger,
            channelId,
            localized_string_key,
            arrElemsToInterpolate,
        });
};
common.LocalizeString = ({ messenger, channelId, localized_string_key, arrElemsToInterpolate, }) => {
    try {
        const language = config?.channelMapping?.[messenger]?.[channelId]?.settings?.language ||
            "English";
        let template = localizationConfig[language][localized_string_key];
        const def_template = localizationConfig["English"][localized_string_key];
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
    catch (error) {
        log(messenger)({
            level: "error",
            function: "LocalizeString",
            messenger,
            channelId,
            localized_string_key,
            arrElemsToInterpolate,
        });
    }
};
//START
// get/set config
common.ConfigBeforeStart();
// map channels & start listening
StartServices();
// start HTTP server for media files if configured to do so
if (config.generic.showMedia) {
    mkdirp_1.mkdirp.sync(`${cache_folder}/files`);
    const serve = serveStatic(`${cache_folder}/files`, {
        lastModified: false,
        index: false,
        maxAge: 86400000,
    });
    server = http_1.default.createServer((req, res) => {
        // if ((request.url || "").indexOf("/emailing/templates") === 0) {
        serve(req, res, finalhandler(req, res));
    });
    server.listen(config.generic.httpPort);
}
