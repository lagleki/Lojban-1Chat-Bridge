"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
;
Error.stackTraceLimit = 100;
process.env.NTBA_FIX_319 = 1;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const mkdirp_1 = require("mkdirp");
const await_to_js_1 = __importDefault(require("await-to-js"));
const http_1 = __importDefault(require("http"));
const p_queue_1 = __importDefault(require("p-queue"));
const finalhandler_1 = __importDefault(require("finalhandler"));
const serve_static_1 = __importDefault(require("serve-static"));
const nsfw_1 = require("./libs/nsfw");
const download_file_1 = require("./piers/download-file");
const html_splitter_1 = require("./piers/html-splitter");
const hooks_1 = require("./piers/hooks");
const logger_1 = require("./piers/logger");
const paths_1 = require("./piers/paths");
const register_all_1 = require("./piers/register-all");
const state_1 = require("./piers/state");
const R = require("ramda");
const defaults = path_1.default.join(__dirname, `../default-config/defaults.js`);
const sanitizeHtml = require("sanitize-html");
let server;
(0, register_all_1.registerAllPiers)(() => server);
// sendTo
async function FormatMessageChunkForSending({ messenger, channelId, author, chunk, action, title, quotation, }) {
    const root_messenger = state_1.common.root_of_messenger(messenger);
    if (quotation) {
        if (!author || author === "")
            author = "-";
        chunk = state_1.common.LocalizeString({
            messenger,
            channelId,
            localized_string_key: `OverlayMessageWithQuotedMark.${root_messenger}`,
            arrElemsToInterpolate: [
                ["author", author],
                ["chunk", chunk],
                ["title", title],
            ],
        });
        (0, logger_1.log)(messenger)({
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
        if ((state_1.state.config.piers[messenger]?.Actions || []).includes(action)) {
            chunk = state_1.common.LocalizeStringWrapper({
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
            chunk = state_1.common.LocalizeStringWrapper({
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
        chunk = state_1.common.LocalizeStringWrapper({
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
async function prepareChunks({ messenger, channelId, text, edited, messengerTo, }) {
    const root_messengerTo = state_1.common.root_of_messenger(messengerTo);
    const arrChunks = state_1.pierObj[messengerTo]?.common?.GetChunks
        ? await state_1.pierObj[messengerTo]?.common?.GetChunks(text, messengerTo)
        : await state_1.common.GetChunks(text, messengerTo);
    for (const i in arrChunks) {
        (0, logger_1.log)("generic")(`converting for messenger ${messengerTo} the text "` + arrChunks[i] + `"`);
        if (edited)
            arrChunks[i] = state_1.common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: `OverlayMessageWithEditedMark.${root_messengerTo}`,
                arrElemsToInterpolate: [["message", arrChunks[i]]],
            });
        arrChunks[i] = await state_1.pierObj[root_messengerTo]?.convertTo({
            text: arrChunks[i] || "",
            messenger,
            messengerTo,
        });
        (0, logger_1.log)("generic")(`converted for messenger ${messengerTo} to the text "` +
            arrChunks[i] +
            `"`);
    }
    return arrChunks;
}
async function universalSendTo({ messenger, channelId, author, chunk, quotation, action, file, edited, avatar, }) {
    if (state_1.state.config?.channelMapping?.[messenger]?.[channelId]?.settings?.readonly)
        return;
    if (!state_1.queueOf[messenger]) {
        logger_1.logger.log({
            level: "warn",
            message: `universalSendTo: no send queue for ${messenger}; skip (pier missing or StartService did not run)`,
        });
        return;
    }
    state_1.queueOf[messenger].add(async () => {
        // console.log(messenger, chunk);
        await state_1.pierObj[state_1.common.root_of_messenger(messenger)]?.sendTo({
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
    const ConfigNode = state_1.state.config?.channelMapping?.[messenger]?.[topicId ? `${topicId}@${channelId}` : channelId];
    if (!ConfigNode)
        return state_1.common.LogToAdmin(`error finding assignment to ${messenger} channel with id ${channelId}`);
    if (!text || text === "")
        return;
    const messenger_core = state_1.common.root_of_messenger(messenger);
    text = await state_1.pierObj[messenger_core]?.convertFrom({ text, messenger });
    text = text.replace(/\*/g, "&#x2A;").replace(/_/g, "&#x5F;");
    text = text.replace(/^(<br\/>)+/, "");
    const nsfw = state_1.state.config?.channelMapping?.[messenger]?.[channelId]?.settings
        ?.nsfw_analysis && file
        ? (await (0, await_to_js_1.default)((0, nsfw_1.getNSFWString)(remote_file)))[1]
        : null;
    if (nsfw) {
        for (const nsfw_result of nsfw) {
            const translated_text = state_1.common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: "nsfw_kv_" + nsfw_result.id.toLowerCase(),
                arrElemsToInterpolate: [["prob", nsfw_result.prob]],
            });
            const Chunks = await prepareChunks({
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
                    title: state_1.state.config.piers[messenger]?.group_id,
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
    for (const messengerTo of Object.keys(state_1.state.config.channelMapping)) {
        if (state_1.state.config.MessengersAvailable[messengerTo] &&
            ConfigNode[messengerTo] &&
            messenger !== messengerTo) {
            let thisToWhom = "";
            if (ToWhom)
                if (state_1.pierObj[messengerTo]?.common?.prepareToWhom) {
                    thisToWhom = state_1.pierObj[messengerTo]?.common.prepareToWhom({
                        messenger: messengerTo,
                        text: ToWhom,
                        targetChannel: ConfigNode[messengerTo],
                    });
                }
                else
                    thisToWhom = state_1.common.prepareToWhom({
                        messenger: messengerTo,
                        text: ToWhom,
                        targetChannel: ConfigNode[messengerTo],
                    });
            if (!author)
                author = "";
            if (state_1.pierObj[messengerTo]?.common?.prepareAuthor) {
                author = state_1.pierObj[messengerTo]?.common?.prepareAuthor({
                    messenger: messengerTo,
                    text: author,
                    targetChannel: ConfigNode[messengerTo],
                });
            }
            else
                author = state_1.common.prepareAuthor({
                    messenger: messengerTo,
                    text: author,
                    targetChannel: ConfigNode[messengerTo],
                });
            const Chunks = await prepareChunks({
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
                    title: state_1.state.config.piers[messenger]?.group_id,
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
state_1.common.writeCache = async ({ pier, channelName, channelId, action, }) => {
    await new Promise((resolve) => {
        fs_extra_1.default.writeFileSync(`${paths_1.cache_folder}/channelMapping.json`, JSON.stringify(state_1.state.config.channelMapping));
        fs_extra_1.default.writeFile(`${paths_1.cache_folder}/cache.json`, JSON.stringify(state_1.state.config.cache), (err) => {
            (0, logger_1.log)("generic")({ pier, action, channelName, channelId, error: err });
            resolve(null);
        });
    });
};
hooks_1.hooks.sendFrom = sendFrom;
// common
state_1.common.ConfigBeforeStart = () => {
    if (process.argv[2] === "--genconfig") {
        mkdirp_1.mkdirp.sync(paths_1.cache_folder);
        // read default config using readFile to include comments
        const configFile = fs_extra_1.default.readFileSync(defaults);
        const configPath = `${paths_1.cache_folder}/config.js`;
        fs_extra_1.default.writeFileSync(configPath, configFile);
        throw new Error(`Wrote default configuration to ${configPath}, please edit it before re-running`);
    }
    try {
        state_1.state.config = require(`${paths_1.cache_folder}/config.js`);
    }
    catch (e) {
        throw new Error(`ERROR while reading config:\n${e}\n\nPlease make sure ` +
            'it exists and is valid. Run "node bridge --genconfig" to ' +
            "generate a default config.");
    }
    const defaultConfig = require(defaults);
    state_1.state.config = R.mergeDeepLeft(state_1.state.config, defaultConfig);
    state_1.state.localizationConfig = require("../src/local/dict.json");
};
state_1.common.getMessengersWithPrefix = async (prefix) => {
    return Object.keys(state_1.state.config.MessengersAvailable).filter((el) => el.indexOf(prefix + "_") === 0 &&
        state_1.state.config.MessengersAvailable[el] === true);
};
async function PopulateChannelMappingCore({ messenger, }) {
    if (!state_1.state.config.MessengersAvailable[messenger])
        return;
    if (!state_1.state.config.channelMapping[messenger])
        state_1.state.config.channelMapping[messenger] = {};
    const arrMappingKeys = Object.keys(state_1.state.config.MessengersAvailable).filter((el) => state_1.state.config.MessengersAvailable[el] === true);
    state_1.state.config.new_channels.map((newChannel) => {
        let i_mapped = newChannel[messenger];
        let topicalizedChannel = {};
        if (state_1.state.config.cache[messenger]) {
            topicalizedChannel = {
                groupName: newChannel[messenger]?.groupName,
                topicId: newChannel[messenger]?.topicId,
                removeJoinMessages: newChannel[messenger]
                    ?.removeJoinMessages,
            };
            if (topicalizedChannel.groupName && topicalizedChannel.topicId) {
                i_mapped = `${topicalizedChannel.topicId}@${state_1.state.config.cache?.[messenger]?.[topicalizedChannel.groupName]}`;
            }
            else if (topicalizedChannel.groupName) {
                i_mapped =
                    state_1.state.config.cache?.[messenger]?.[topicalizedChannel.groupName];
            }
            else {
                i_mapped =
                    state_1.state.config.cache?.[messenger]?.[newChannel[messenger]];
            }
        }
        if (!i_mapped)
            return;
        const mapping = {
            settings: {
                readonly: newChannel[`${messenger}-readonly`],
                dontProcessOtherBridges: newChannel[`${messenger}-dontProcessOtherBridges`],
                nsfw_analysis: newChannel[`nsfw_analysis`],
                showNotices: newChannel["showNotices"],
                language: newChannel["language"],
                restrictToLojban: newChannel["restrictToLojban"],
                nickcolor: newChannel[`${messenger}-nickcolor`],
                name: newChannel[messenger],
                topicId: (topicalizedChannel.topicId || ""),
                removeJoinMessages: (topicalizedChannel.removeJoinMessages ??
                    false),
            },
        };
        for (const key of arrMappingKeys)
            mapping[key] = newChannel[key]?.groupName
                ? `${newChannel[key]?.topicId}@${state_1.state.config.cache?.[key]?.[newChannel[key]?.groupName] || newChannel[key]}`
                : state_1.state.config.cache?.[key]?.[newChannel[key]] ||
                    newChannel[key];
        state_1.state.config.channelMapping[messenger][i_mapped] = R.mergeDeepLeft(mapping, state_1.state.config.channelMapping[messenger][i_mapped] || {});
    });
    fs_extra_1.default.writeFileSync(`${paths_1.cache_folder}/channelMapping.json`, JSON.stringify(state_1.state.config.channelMapping, null, 2));
}
state_1.common.PopulateChannelMapping = async () => {
    if (!state_1.state.config.channelMapping)
        state_1.state.config.channelMapping = {};
    if (!state_1.state.config.cache)
        state_1.state.config.cache = {};
    const arrAvailableMessengers = Object.keys(state_1.state.config.MessengersAvailable).filter((i) => !!state_1.state.config.MessengersAvailable[i]);
    for (const pier of arrAvailableMessengers) {
        const messenger = state_1.common.root_of_messenger(pier);
        if (state_1.pierObj[messenger]?.getChannels)
            await state_1.pierObj[messenger].getChannels(pier);
    }
    for (const pier of arrAvailableMessengers) {
        await PopulateChannelMappingCore({ messenger: pier });
    }
};
state_1.common.root_of_messenger = (messenger_with_index) => messenger_with_index.replace(/_.*/g, "").replace(/_.*/g, "");
state_1.common.MessengersAvailable = () => {
    state_1.state.config.MessengersAvailable = {};
    state_1.state.config.new_channels.forEach((i) => {
        Object.keys(i)
            .filter((a) => a.indexOf("-") === -1 && a.indexOf("_") > 0)
            .forEach((a) => (state_1.state.config.MessengersAvailable[a] = true));
    });
    Object.keys(state_1.state.config.MessengersAvailable).forEach((messenger_with_index) => {
        const messenger = state_1.common.root_of_messenger(messenger_with_index);
        const pier_config = state_1.state.config.piers[messenger_with_index];
        if (state_1.pierObj[messenger]?.shouldDisableMessenger?.(pier_config))
            delete state_1.state.config.MessengersAvailable[messenger_with_index];
    });
    // Drop piers with no implementation (e.g. removed facebook) so channelMapping cannot target them.
    Object.keys(state_1.state.config.MessengersAvailable).forEach((messenger_with_index) => {
        const messenger = state_1.common.root_of_messenger(messenger_with_index);
        if (!state_1.pierObj[messenger]) {
            delete state_1.state.config.MessengersAvailable[messenger_with_index];
        }
    });
    Object.keys(state_1.state.config.MessengersAvailable).forEach((messenger) => (state_1.generic[messenger] = {}));
};
async function StartServices() {
    state_1.common.MessengersAvailable();
    if (!state_1.state.config.channelMapping)
        state_1.state.config.channelMapping = {};
    for (const messenger_with_index of Object.keys(state_1.state.config.MessengersAvailable)) {
        const messenger = messenger_with_index.replace(/_.*/g, "");
        if (state_1.pierObj[messenger]?.StartService) {
            state_1.queueOf[messenger_with_index] = new p_queue_1.default({ concurrency: 1 });
            await state_1.pierObj[messenger]?.StartService({
                messenger: messenger_with_index,
            });
        }
    }
    await state_1.common.PopulateChannelMapping();
    console.log("Lojban-1Chat-Bridge started!");
}
state_1.common.LogMessageToAdmin = async (messenger, message) => {
    if (state_1.state.config.piers[messenger].admins_userid) {
        await (0, await_to_js_1.default)(state_1.generic[messenger].client.forwardMessage(state_1.state.config.piers[messenger].admins_userid, message.chat.id, message.message_id));
        await (0, await_to_js_1.default)(state_1.generic[messenger].client.sendMessage(state_1.state.config.piers[messenger].admins_userid, JSON.stringify(message), {
            parse_mode: "HTML",
        }));
    }
};
state_1.common.LogToAdmin = (msg_text, repeat = true) => {
    logger_1.logger.log({
        level: "error",
        message: JSON.stringify(msg_text),
    });
    const telegram_piers_with_logging_to_admin = Object.keys(state_1.state.config.piers).filter((i) => typeof state_1.state.config.piers[i].admins_userid !== "undefined");
    for (const pier of telegram_piers_with_logging_to_admin)
        if (state_1.generic[pier].client)
            state_1.generic[pier].client
                .sendMessage(state_1.state.config.piers[pier].admins_userid, `\`\`\`\n${msg_text}\n\`\`\``, {
                parse_mode: "Markdown",
            })
                .catch((_e) => {
                if (repeat)
                    state_1.common.LogToAdmin(msg_text, false);
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
state_1.common.unescapeHTML = ({ text, convertHtmlEntities, escapeBackslashes = true, }) => {
    if (escapeBackslashes)
        text = text.replace(/\\/g, "\\");
    text = text.replace(/&([^;]+);/g, (entity, entityCode) => {
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
state_1.common.GetChunks = async (text, messenger) => {
    // text = await appendPageTitles(text);
    const limit = state_1.state.config.piers[messenger]?.MessageLength || 400;
    const arrText = (0, html_splitter_1.HTMLSplitter)(text, limit);
    return arrText;
};
state_1.common.downloadFile = download_file_1.downloadFile;
state_1.common.sanitizeHtml = (text, allowedTags = [
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
state_1.common.LocalizeStringWrapper = ({ messenger, channelId, localized_string_key, arrElemsToInterpolate, }) => {
    const language = state_1.state.config?.channelMapping?.[messenger]?.[channelId]?.settings
        ?.language || "English";
    const localized_string_key_additional = localized_string_key + ".fallback_solution";
    if (state_1.state.localizationConfig[language][localized_string_key_additional])
        return {
            main: state_1.common.LocalizeString({
                messenger,
                channelId,
                localized_string_key,
                arrElemsToInterpolate,
            }),
            fallback_solution: state_1.common.LocalizeString({
                messenger,
                channelId,
                localized_string_key: localized_string_key_additional,
                arrElemsToInterpolate,
            }),
        };
    else
        return state_1.common.LocalizeString({
            messenger,
            channelId,
            localized_string_key,
            arrElemsToInterpolate,
        });
};
state_1.common.LocalizeString = ({ messenger, channelId, localized_string_key, arrElemsToInterpolate, }) => {
    try {
        const language = state_1.state.config?.channelMapping?.[messenger]?.[channelId]?.settings
            ?.language || "English";
        let template = state_1.state.localizationConfig[language][localized_string_key];
        const def_template = state_1.state.localizationConfig["English"][localized_string_key];
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
        (0, logger_1.log)(messenger)({
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
state_1.common.ConfigBeforeStart();
// map channels & start listening
StartServices();
// start HTTP server for media files if configured to do so
if (state_1.state.config.generic.showMedia) {
    mkdirp_1.mkdirp.sync(`${paths_1.cache_folder}/files`);
    const serve = (0, serve_static_1.default)(`${paths_1.cache_folder}/files`, {
        lastModified: false,
        index: false,
        maxAge: 86400000,
    });
    server = http_1.default.createServer((req, res) => {
        // if ((request.url || "").indexOf("/emailing/templates") === 0) {
        serve(req, res, (0, finalhandler_1.default)(req, res));
    });
    server.listen(state_1.state.config.generic.httpPort);
}
