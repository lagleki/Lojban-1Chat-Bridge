"use strict";
declare var process: {
  env: {
    NTBA_FIX_319: number;
    HOME: string;
    log?: string;
  };
  argv: string[];
};
process.env.NTBA_FIX_319 = 1;
// process.on('warning', (e: any) => console.warn(e.stack));
const package_json = require("../package");

// messengers' libs
const { login } = require("libfb");

import * as Telegram from "node-telegram-bot-api";
const sanitizeHtml = require("sanitize-html");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

import { VK } from "vk-io";
import { Authorization } from "@vk-io/authorization";

const VkBot = require("node-vk-bot-api");

import Discord = require("discord.js");

const { RTMClient, WebClient } = require("@slack/client");
const emoji = require("node-emoji");

const html2slack = require("./formatting-converters/html2slack");
const html2irc = require("./formatting-converters/html2irc");

const discordParser = require("discord-markdown");

const marked = require("marked");
const lexer = marked.Lexer;
lexer.rules.list = { exec: () => {} };
lexer.rules.listitem = { exec: () => {} };
const markedRenderer = new marked.Renderer();
// markedRenderer.text = (string: string) => string.replace(/\\/g, "\\\\");

function markedParse({
  text,
  messenger,
  dontEscapeBackslash,
  unescapeCodeBlocks
}: {
  text: string;
  messenger: string;
  dontEscapeBackslash?: boolean;
  unescapeCodeBlocks?: boolean;
}) {
  if (!dontEscapeBackslash) text = text.replace(/\\/gim, "\\\\");
  markedRenderer.codespan = (text: string) => {
    if (!dontEscapeBackslash) text = text.replace(/\\\\/gim, "&#92;");
    if (unescapeCodeBlocks)
      text = generic.unescapeHTML({
        text,
        convertHtmlEntities: true
      });
    return `<code>${text}</code>`;
  };
  markedRenderer.code = (text: string) => {
    if (!dontEscapeBackslash) text = text.replace(/\\\\/gim, "&#92;");
    if (unescapeCodeBlocks)
      text = generic.unescapeHTML({
        text,
        convertHtmlEntities: true
      });
    return `<pre><code>${text}</code></pre>\n`;
  };
  const result = marked.parser(lexer.lex(text), {
    gfm: true,
    renderer: markedRenderer
  });
  debug(messenger)({ "converting source text": text, result });
  return result;
}
const html2md = require("./formatting-converters/html2md-ts");

const Irc = require("irc-upd");
const ircolors = require("./formatting-converters/irc-colors-ts");

const finalhandler = require("finalhandler");
import * as http from "http";
const serveStatic = require("serve-static");

import debug from "debug";
const winston = require("winston");
const logger = winston.createLogger({
  transports: [new winston.transports.File({ filename: "log.log" })]
});
import { inspect } from "util"; // or directly

const R = require("ramda");
const { default: PQueue } = require("p-queue");
const queue = new PQueue({ concurrency: 1 });

const { to } = require("await-to-js");
const blalalavla = require("./sugar/blalalavla");
// file system and network libs
const fs = require("fs-extra");
const path = require("path");
const mkdir = require("mkdirp-sync");
import * as request from "request";
let webwidget: any;

// NLP & spam libs
const lojban = require("lojban");

// global objects
const UrlRegExp = new RegExp(
  "(?:(?:https?|ftp|file)://|www.|ftp.)(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[A-Z0-9+&@#/%=~_|$])",
  "igm"
);
const PageTitleRegExp = /(<\s*title[^>]*>(.+?)<\s*\/\s*title)>/gi;

interface Json {
  [index: string]: string | boolean | RegExp;
}

interface IMessengerInfo {
  [x: string]: any;
}

type TextFormatConverterType = ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo?: string;
}) => Promise<any>;

interface IMessengerFunctions {
  [x: string]: TextFormatConverterType;
}

interface Igeneric extends IMessengerInfo {
  LogToAdmin?: any;
  sendOnlineUsersTo?: any;
  downloadFile?: any;
  ConfigBeforeStart?: any;
  PopulateChannelMapping?: any;
  LocalizeString?: any;
  sanitizeHtml?: any;
  randomValueBase64?: any;
  escapeHTML?: any;
  writeCache?: any;
  MessengersAvailable?: any;
}

const generic: Igeneric = {
  facebook: {},
  telegram: {},
  vkboard: {},
  vkwall: {},
  slack: {},
  mattermost: {},
  discord: {},
  irc: {},
  webwidget: {},
  fallback: {}
};

const prepareToWhom: Igeneric = {};
const prepareAuthor: Igeneric = {};
const GetChunks: Igeneric = {};

const queueOf: IMessengerInfo = {};
const receivedFrom: IMessengerInfo = {};
const sendTo: IMessengerInfo = {};
const StartService: IMessengerInfo = {};
interface IsendToArgs {
  channelId: string;
  author: string;
  chunk: string;
  action: string;
  quotation: boolean;
  file?: string;
  edited?: boolean;
}

const convertTo: IMessengerFunctions = {};
const convertFrom: IMessengerFunctions = {};
const GetName: IMessengerInfo = {};
const GetChannels: IMessengerInfo = {};
const GotProblem: IMessengerInfo = {};
const AdaptName: IMessengerInfo = {};
const BootService: IMessengerInfo = {};
const NewChannelAppeared: IMessengerInfo = {};

//declare messengers
generic.telegram.Start = () => {
  return new Telegram(config.telegram.token, {
    polling: true
  });
};
generic.webwidget.Start = () => {
  return;
};

generic.vkboard.Start = async () => {
  const vkio = new VK({
    appId: config.vkboard.appId,
    login: config.vkboard.login,
    password: config.vkboard.password,
    authScope: "offline,wall,messages,groups"
  });
  const authorization = new Authorization(vkio);
  const direct = authorization.implicitFlowUser();
  const [err, app] = await to(direct.run());

  if (err) {
    console.error("vkboard", err.toString());
  }
  const vkbot = new VkBot({
    token: config.vkboard.token,
    group_id: config.vkboard.group_id
  });
  return { bot: vkbot, app };
};

generic.vkwall.Start = async () => {
  const vkio = new VK({
    appId: config.vkboard.appId,
    login: config.vkboard.login,
    password: config.vkboard.password,
    authScope: "offline,wall,messages,groups"
  });
  const authorization = new Authorization(vkio);
  const direct = authorization.implicitFlowUser();
  const [err, app] = await to(direct.run());
  if (err) {
    console.error("vkwall", err.toString());
  }
  const vkbot = new VkBot({
    token: config.vkwall.token,
    group_id: config.vkwall.group_id
  });
  return { bot: vkbot, app };
};

generic.slack.Start = async () => {
  generic.slack.client = {
    rtm: new RTMClient(config.slack.token),
    web: new WebClient(config.slack.token)
  };
  generic.slack.client.rtm.start().catch((e: any) => {
    if (!e?.data?.ok) {
      config.MessengersAvailable.slack = false;
      debug("slack")({
        error: "Couldn't start Slack"
      });
    }
  });
  return true;
};
generic.discord.Start = async () => {
  return new Promise(resolve => {
    const client = new Discord.Client();
    generic.discord.client = client;
    generic.discord.guilds = client.guilds.array();
    if (config.discord.guildId) {
      const guild = client.guilds.find(
        (guild: any) =>
          guild.name.toLowerCase() === config.discord.guildId.toLowerCase() ||
          guild.id === config.discord.guildId
      );
      if (guild)
        generic.discord.guilds = [
          guild,
          ...generic.discord.guilds.filter(
            (_guild: any) => _guild.id !== guild.id
          )
        ];
    }
    generic.discord.guilds.getAll = (name: string) =>
      [].concat(
        ...generic.discord.guilds.map((guild: any) => guild[name].array())
      );
    resolve();
  });
};
generic.mattermost.Start = async () => {
  let [err, res] = await to(
    new Promise(resolve => {
      const credentials = {
        login_id: config.mattermost.login,
        password: config.mattermost.password
      };
      const url = `${config.mattermost.ProviderUrl}/api/v4/users/login`;
      request(
        {
          body: JSON.stringify(credentials),
          method: "POST",
          url
        },
        (err: any, response: any, body: any) => {
          if (err) {
            console.error(err);
            resolve();
          } else {
            resolve({
              token: response?.headers?.token || "",
              id: JSON.parse(body).id
            });
          }
        }
      );
    })
  );
  if (err || !res) {
    config.MessengersAvailable.mattermost = false;
    return;
  } else {
    config.mattermost.token = res.token;
    config.mattermost.user_id = res.id;
  }

  [err, res] = await to(
    new Promise(resolve => {
      const user_id = config.mattermost.user_id;
      const url = `${config.mattermost.ProviderUrl}/api/v4/users/${user_id}/teams`;
      request(
        {
          method: "GET",
          url,
          headers: {
            Authorization: `Bearer ${config.mattermost.token}`
          }
        },
        (error: any, response: any, body: any) => {
          if (err) {
            console.error(err);
            resolve();
          } else {
            const team = JSON.parse(body).find((i: any) => {
              return (
                i.display_name === config.mattermost.team ||
                i.name === config.mattermost.team
              );
            });
            config.mattermost.team_id = team.id;
            resolve(team);
          }
        }
      );
    })
  );
  if (!res) {
    config.MessengersAvailable.mattermost = false;
    return;
  }

  const ReconnectingWebSocket = require("reconnecting-websocket");
  return new ReconnectingWebSocket(config.mattermost.APIUrl, [], {
    WebSocket: require("ws")
  });
};

// sendTo
async function FormatMessageChunkForSending({
  messenger,
  channelId,
  author,
  chunk,
  action,
  title,
  quotation
}: {
  messenger: string;
  channelId: number | string;
  author: string;
  chunk: string;
  action: string;
  title?: string;
  quotation: boolean;
}) {
  if (quotation) {
    if (!author || author === "") author = "-";
    chunk = generic.LocalizeString({
      messenger,
      channelId,
      localized_string_key: `OverlayMessageWithQuotedMark.${messenger}`,
      arrElemsToInterpolate: [
        ["author", author],
        ["chunk", chunk],
        ["title", title]
      ]
    });
  } else if ((author || "") !== "") {
    if ((config[messenger].Actions || []).includes(action)) {
      chunk = generic.LocalizeString({
        messenger,
        channelId,
        localized_string_key: `sendTo.${messenger}.action`,
        arrElemsToInterpolate: [
          ["author", author],
          ["chunk", chunk],
          ["title", title]
        ]
      });
    } else {
      chunk = generic.LocalizeString({
        messenger,
        channelId,
        localized_string_key: `sendTo.${messenger}.normal`,
        arrElemsToInterpolate: [
          ["author", author],
          ["chunk", chunk],
          ["title", title]
        ]
      });
    }
  } else {
    chunk = generic.LocalizeString({
      messenger,
      channelId,
      localized_string_key: `sendTo.${messenger}.ChunkOnly`,
      arrElemsToInterpolate: [
        ["chunk", chunk],
        ["title", title]
      ]
    });
  }
  return chunk;
}
sendTo.webwidget = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (config?.channelMapping?.webwidget?.[channelId]?.settings?.readonly)
    return;
  const data = {
    channelId,
    author,
    chunk,
    action,
    quotation,
    file,
    edited
  };
  webwidget.Lojban1ChatHistory.push(data);
  webwidget.Lojban1ChatHistory = webwidget.Lojban1ChatHistory.slice(
    (config.webwidget.historyLength || 201) * -1
  );
  webwidget.emit("sentFrom", {
    data
  });
  debug("webwidget")({ "sending message": data });
  return true;
};

sendTo.facebook = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (
    config?.channelMapping?.facebook?.[channelId]?.settings.readonly ||
    !generic.facebook.client
  )
    return;
  queueOf.facebook.add(async () => {
    await new Promise((resolve: any) => {
      setTimeout(() => {
        const jsonMessage: Json = {
          body: chunk
        };
        if (file) jsonMessage.attachment = fs.createReadStream(file);
        generic.facebook.client.sendMessage(channelId, chunk).catch(catchError);
        resolve();
      }, 500);
    });
  });
  return true;
};

sendTo.telegram = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (config?.channelMapping?.telegram?.[channelId]?.settings?.readonly) return;
  queueOf.telegram.add(async () => {
    await new Promise((resolve: any) => {
      debug("telegram")({ "sending text": chunk });
      generic.telegram.client
        .sendMessage(channelId, chunk, {
          parse_mode: "HTML"
        })
        .then(() => resolve())
        .catch((err: any) => {
          generic.LogToAdmin(
            channelId +
              "\n\n" +
              "error sending chunk" +
              "\n\n" +
              generic.escapeHTML(chunk)
          );
          resolve();
        });
    });
  });
  return true;
};

sendTo.discord = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (config?.channelMapping?.discord?.[channelId]?.settings?.readonly) return;

  queueOf.discord.add(async () => {
    await new Promise((resolve: any) => {
      generic.discord.client.channels
        .get(channelId)
        .send(chunk)
        .catch(catchError);
      resolve();
    });
  });
};

sendTo.mattermost = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (config?.channelMapping?.mattermost?.[channelId]?.settings?.readonly)
    return;
  queueOf.mattermost.add(async () => {
    await new Promise((resolve: any) => {
      const option = {
        url: config.mattermost.HookUrl,
        json: {
          text: chunk,
          // username: author,
          channel: channelId
        }
      };
      const req = request.post(
        option,
        (error: any, response: any, body: any) => {
          resolve();
        }
      );
    });
  });
};
sendTo.vkwall = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (config?.channelMapping?.vkwall?.[channelId]?.settings?.readonly) return;
  if (!generic.vkwall.client.app) {
    config.MessengersAvailable.vkwall = false;
    return;
  }
  const token = generic.vkwall.client.app.token;
  queueOf.vk.add(async () => {
    await new Promise((resolve: any) => {
      setTimeout(() => {
        generic.vkwall.client.bot
          .api("wall.createComment", {
            access_token: token,
            owner_id: "-" + config.vkwall.group_id,
            post_id: channelId,
            from_group: config.vkwall.group_id,
            reply_to_comment: 1,
            message: chunk
          })
          .then((res: any) => {})
          .catch(catchError);
        resolve();
      }, 60000);
    });
  });
};

sendTo.vkboard = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (
    config?.channelMapping?.vkboard?.[channelId]?.settings?.readonly
    //todo: !vk.WaitingForCaptcha
  )
    return;
  if (!generic.vkboard.client.app) {
    config.MessengersAvailable.vkboard = false;
    return;
  }
  const token = generic.vkboard.client.app.token;
  queueOf.vk.add(async () => {
    await new Promise((resolve: any) => {
      setTimeout(() => {
        generic.vkboard.client.bot
          .api("board.createComment", {
            access_token: token,
            group_id: config.vkboard.group_id,
            topic_id: channelId,
            message: chunk,
            from_group: 1
          })
          .then((res: any) => {})
          .catch(catchError);
        resolve();
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

sendTo.slack = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (config?.channelMapping?.slack?.[channelId]?.settings?.readonly) return;
  queueOf.slack.add(async () => {
    await new Promise((resolve: any) => {
      chunk = emoji.unemojify(chunk);
      generic.slack.client.web.chat
        .postMessage({
          channel: channelId,
          username: (author || "").replace(/(^.{21}).*$/, "$1"),
          text: chunk
        })
        .then(() => resolve())
        .catch((err: any) => {
          console.error(err);
          resolve();
        });
    });
  });
};

sendTo.irc = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file,
  edited
}: IsendToArgs) => {
  if (config?.channelMapping?.irc?.[channelId]?.settings?.readonly) return;
  queueOf.irc.add(async () => {
    await new Promise((resolve: any) => {
      // if (config.irc.Actions.includes(action))
      //   chunk = ircolors.underline(chunk);
      debug("irc")({ "sending for irc": chunk });
      generic.irc.client.say(channelId, chunk);
      resolve();
    });
  });
};

async function prepareChunks({
  messenger,
  channelId,
  text,
  edited,
  messengerTo
}: {
  messenger: string;
  messengerTo: string;
  channelId: string | number;
  text: string;
  edited?: boolean;
}) {
  let arrChunks: string[],
    fallback: string = "fallback";
  if (GetChunks[messengerTo]) fallback = messengerTo;
  arrChunks = await GetChunks[fallback](text, messengerTo);
  for (let i in arrChunks) {
    debug("generic")(
      `converting for messenger ${messengerTo} the text "` + arrChunks[i] + `"`
    );
    if (edited)
      arrChunks[i] = generic.LocalizeString({
        messenger,
        channelId,
        localized_string_key: `OverlayMessageWithEditedMark.${messengerTo}`,
        arrElemsToInterpolate: [["message", arrChunks[i]]]
      });

    arrChunks[i] = await convertTo[messengerTo]({
      text: arrChunks[i],
      messenger,
      messengerTo
    });
    debug("generic")(
      `converted for messenger ${messengerTo} to text "` + arrChunks[i] + `"`
    );
  }
  return arrChunks;
}

prepareToWhom.irc = function({
  text,
  targetChannel
}: {
  text: string;
  targetChannel: string | number;
}) {
  const ColorificationMode =
    config?.channelMapping?.irc?.[targetChannel]?.settings?.nickcolor || "mood";
  return `${ircolors.MoodifyText({
    text,
    mood: ColorificationMode
  })}: `;
};

prepareToWhom.fallback = function({
  text,
  targetChannel
}: {
  text: string;
  targetChannel: string | number;
}) {
  return `${text}: `;
};

prepareAuthor.irc = function({
  text,
  targetChannel
}: {
  text: string;
  targetChannel: string | number;
}) {
  const ColorificationMode =
    config?.channelMapping?.irc?.[targetChannel]?.settings?.nickcolor || "mood";
  return `${ircolors.MoodifyText({
    text,
    mood: ColorificationMode
  })}`;
};

prepareAuthor.fallback = function({
  text,
  targetChannel
}: {
  text: string;
  targetChannel: string | number;
}) {
  return `${text}`;
};

async function sendFrom({
  messenger,
  channelId,
  author,
  text,
  ToWhom,
  quotation,
  action,
  file,
  edited
}: {
  messenger: string;
  channelId: string | number;
  author: string;
  text: string;
  ToWhom?: string;
  quotation?: boolean;
  action?: string;
  file?: string;
  edited?: boolean;
}) {
  const ConfigNode = config?.channelMapping?.[messenger]?.[channelId];
  if (!ConfigNode)
    return generic.LogToAdmin(
      `error finding assignment to ${messenger} channel with id ${channelId}`
    );
  if (!text || text === "") return;
  text = await convertFrom[messenger]({ text, messenger });
  text = text.replace(/\*/g, "&#x2A;").replace(/_/g, "&#x5F;");
  text = text.replace(/^(<br\/>)+/, "");
  const nsfw: any = undefined;//file ? await getNSFWString(file) : null;
  if (nsfw) {
    for (const nsfw_result of nsfw) {
      const translated_text = generic.LocalizeString({
        messenger,
        channelId,
        localized_string_key: "nsfw_kv_" + nsfw_result.id.toLowerCase(),
        arrElemsToInterpolate: [["prob", nsfw_result.prob]]
      });
      let Chunks = await prepareChunks({
        messenger,
        channelId,
        text: translated_text,
        messengerTo: messenger
      });
      for (const i in Chunks) {
        const chunk = Chunks[i];
        Chunks[i] = await FormatMessageChunkForSending({
          messenger,
          channelId,
          title: config?.vkboard?.group_id,
          author,
          chunk,
          action,
          quotation
        });
      }

      Chunks.map(chunk => {
        sendTo[messenger]({
          channelId: ConfigNode[messenger],
          author,
          chunk,
          quotation,
          action,
          file,
          edited
        });
      });

      text = text + "<br/>" + translated_text;
    }
  }
  for (const messengerTo of Object.keys(config.channelMapping)) {
    if (
      config.MessengersAvailable[messengerTo] &&
      ConfigNode[messengerTo] &&
      messenger !== messengerTo
    ) {
      let thisToWhom: string = "";
      if (ToWhom)
        if (prepareToWhom[messengerTo]) {
          thisToWhom = prepareToWhom[messengerTo]({
            text: ToWhom,
            targetChannel: ConfigNode[messengerTo]
          });
        } else
          thisToWhom = prepareToWhom.fallback({
            text: ToWhom,
            targetChannel: ConfigNode[messengerTo]
          });
      if (!author) author = "";
      if (prepareAuthor[messengerTo]) {
        author = prepareAuthor[messengerTo]({
          text: author,
          targetChannel: ConfigNode[messengerTo]
        });
      } else
        author = prepareAuthor.fallback({
          text: author,
          targetChannel: ConfigNode[messengerTo]
        });

      let Chunks = await prepareChunks({
        messenger,
        channelId,
        text,
        edited,
        messengerTo
      });

      for (const i in Chunks) {
        const chunk = Chunks[i];
        Chunks[i] = await FormatMessageChunkForSending({
          messenger: messengerTo,
          channelId,
          title: config?.vkboard?.group_id,
          author,
          chunk: thisToWhom + chunk,
          action,
          quotation
        });
      }

      Chunks.map(chunk => {
        sendTo[messengerTo]({
          channelId: ConfigNode[messengerTo],
          author,
          chunk,
          quotation,
          action,
          file,
          edited
        });
      });
    }
  }
}

async function getNSFWString(file: string) {
  if (file.substr(-4) !== ".jpg") return;
  const NUMBER_OF_CHANNELS = 3;

  const tf = require("@tensorflow/tfjs-node");
  const load = require("nsfwjs").load;

  const fs = require("fs");
  const jpeg = require("jpeg-js");

  const readImage = (path: string) => {
    const buf = fs.readFileSync(path);
    const pixels = jpeg.decode(buf, true);
    return pixels;
  };

  const imageByteArray = (image: any, numChannels: number) => {
    const pixels = image.data;
    const numPixels = image.width * image.height;
    const values = new Int32Array(numPixels * numChannels);

    for (let i = 0; i < numPixels; i++) {
      for (let channel = 0; channel < numChannels; ++channel) {
        values[i * numChannels + channel] = pixels[i * 4 + channel];
      }
    }

    return values;
  };

  const imageToInput = (image: any, numChannels: number) => {
    const values = imageByteArray(image, numChannels);
    const outShape = [image.height, image.width, numChannels];
    const input = tf.tensor3d(values, outShape, "int32");

    return input;
  };

  const model = await load(); //moved model at root of folder
  const logo = readImage(file);
  const input = imageToInput(logo, NUMBER_OF_CHANNELS);
  let predictions = await model.classify(input);
  predictions = predictions
    .filter((className: any) => {
      if (className.className === "Neutral") return;
      if (className.probability > 0.6) return true;
      return;
    })
    .map((i: any) => {
      return { id: i.className, prob: Math.round(i.probability * 100) };
    });
  return predictions;
}

receivedFrom.discord = async (message: any) => {
  if (
    !config?.channelMapping?.discord?.[(message?.channel?.id || "").toString()]
  )
    return;
  if (message.author.bot || message.channel.type !== "text") return;
  const edited = message.edited ? true : false;
  for (let value of message.attachments.values()) {
    //media of attachment
    //todo: height,width,generic.LocalizeString
    let [err, res] = await to(
      generic.downloadFile({
        type: "simple",
        remote_path: value.url
      })
    );
    let file: string, localfile: string;

    if (res?.[1]) {
      [file, localfile] = res;
    } else {
      file = value.url;
      localfile = value.url;
    }
    debug("discord")("sending attachment text: " + file);
    sendFrom({
      messenger: "discord",
      channelId: message.channel.id,
      author: AdaptName.discord(message),
      text: file,
      file: localfile,
      edited
    });
    //text of attachment
    const text = generic.discord.reconstructPlainText(message, value.content);
    debug("discord")("sending text of attachment: " + text);
    sendFrom({
      messenger: "discord",
      channelId: message.channel.id,
      author: AdaptName.discord(message),
      text,
      edited
    });
  }

  const text = generic.discord.reconstructPlainText(message, message.content);
  debug("discord")("sending reconstructed text: " + text);
  sendFrom({
    messenger: "discord",
    channelId: message.channel.id,
    author: AdaptName.discord(message),
    text,
    edited
  });
};

// receivedFrom
receivedFrom.facebook = async (message: any) => {
  if (!config?.channelMapping?.facebook?.[(message.threadId || "").toString()])
    return;
  let err, res;
  [err, res] = await to(generic.facebook.client.getUserInfo(message.authorId));
  if (err) return;
  let author: string;
  author = AdaptName.facebook(res);

  if (!message.attachments) message.attachments = [];
  if (message.stickerId)
    message.attachments.push({ id: message.stickerId, type: "sticker" });
  for (const attachment of message.attachments) {
    if (attachment.type === "sticker") {
      [err, res] = await to(
        generic.facebook.client.getStickerURL(attachment.id)
      );
    } else {
      [err, res] = await to(
        generic.facebook.client.getAttachmentURL(message.id, attachment.id)
      );
    }
    if (err) return;
    //todo: add type="photo","width","height","size"
    generic
      .downloadFile({
        type: "simple",
        remote_path: res
      })
      .then(([file, localfile]: [string, string]) => {
        sendFrom({
          messenger: "facebook",
          channelId: message.threadId,
          author,
          text: file,
          file: localfile
        });
      });
  }

  if (message.message)
    sendFrom({
      messenger: "facebook",
      channelId: message.threadId,
      author,
      text: message.message
    });
};

receivedFrom.telegram = async (message: Telegram.Message) => {
  //spammer
  //1. remove entered bots
  TelegramRemoveAddedBots(message);
  //2. check if admin else leave chat and return
  if (await TelegramLeaveChatIfNotAdmin(message)) return;
  //3. check for spam
  if (await TelegramRemoveSpam(message)) return;
  //4. check if new member event
  if (TelegramRemoveNewMemberMessage(message)) return;
  //now deal with the message that is fine
  if (!config.channelMapping.telegram) return;

  const age = Math.floor(Date.now() / 1000) - message.date;
  if (config.telegram.maxMsgAge && age > config.telegram.maxMsgAge)
    return console.log(
      `skipping ${age} seconds old message! NOTE: change this behaviour with config.telegram.maxMsgAge, also check your system clock`
    );

  if (!config.channelMapping.telegram[message.chat.id]) {
    if (
      config.cache.telegram[message.chat.title] &&
      config.cache.telegram[message.chat.title] === message.chat.id
    )
      return; //cached but unmapped channel so ignore it and exit the function
    await to(
      NewChannelAppeared.telegram({
        channelName: message.chat.title,
        channelId: message.chat.id
      })
    );
    if (!config.channelMapping.telegram[message.chat.id]) return;
  }

  // send message
  if (message.text && !message.text.indexOf("/names")) {
    generic.sendOnlineUsersTo("telegram", message.chat.id);
    return;
  }

  // skip posts containing media if it's configured off
  if (
    (message.audio ||
      message.document ||
      message.photo ||
      message.sticker ||
      message.video ||
      message.voice ||
      message.contact ||
      message.location) &&
    !config.generic.showMedia
  )
    return;

  await sendFromTelegram({
    message: message.reply_to_message,
    quotation: true
  });
  sendFromTelegram({ message });
};

generic.discord.reconstructPlainText = (message: any, text: string) => {
  if (!text) return "";
  const massMentions = ["@everyone", "@here"];
  if (
    massMentions.some((massMention: string) => text.includes(massMention)) &&
    !config.discord.massMentions
  ) {
    massMentions.forEach((massMention: string) => {
      text = text.replace(new RegExp(massMention, "g"), `\`${massMention}\``);
    });
  }
  let matches = text.match(/<[\!&]?@[^# ]{2,32}>/g);
  if (matches && matches[0])
    for (let match of matches) {
      const core = match.replace(/[@<>\!&]/g, "");
      const member = message.channel.guild.members
        .array()
        .find(
          (member: any) =>
            (member.nickname || member.user?.username) &&
            member.user.id.toLowerCase() === core
        );
      // logger.log({
      //   level: "info",
      //   message: message.channel.guild.members
      //     .array()
      //     .map((member: any) => {
      //       return `${member.nickname || member.user?.username} ${
      //         member.user?.id
      //       }`;
      //     })
      //     .join("\n")
      // });
      if (member)
        text = text.replace(
          match,
          "@" + (member.nickname || member.user.username)
        );
    }
  matches = text.match(/<#[^# ]{2,32}>/g);
  if (matches && matches[0])
    for (let match of matches) {
      const core = match.replace(/[<>#]/g, "");
      const chan = Object.keys(config.cache.discord).filter(
        i => config.cache.discord[i] === core
      );
      if (chan[0]) text = text.replace(match, "#" + chan[0]);
    }

  return text;
};

// reconstructs the original raw markdown message
generic.telegram.reconstructMarkdown = (msg: Telegram.Message) => {
  if (!msg.entities) return msg;
  const incrementOffsets = (from: number, by: number) => {
    msg.entities.forEach((entity: any) => {
      if (entity.offset > from) entity.offset += by;
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

function IsSpam(message: any): boolean {
  const l = config.spamremover.telegram
    .map((rule: any) => {
      let matches = true;
      for (const key of Object.keys(rule)) {
        const msg_val = R.path(key.split("."), message);
        if (rule[key] === true && !msg_val) matches = false;
        if (
          typeof rule[key] === "object" &&
          (!msg_val || msg_val.search(new RegExp(rule[key].source, "i")) === -1)
        )
          matches = false;
      }
      return matches;
    })
    .some(Boolean);
  return l;
}

async function sendFromTelegram({
  message,
  quotation
}: {
  message: any;
  quotation?: boolean;
}) {
  if (!message) return;
  let action;
  message = generic.telegram.reconstructMarkdown(message);
  //collect attachments
  const jsonMessage: any = {};
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
    "text"
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
          index: i++
        };
      } else if (el === "sticker") {
        jsonMessage[el] = {
          ...jsonMessage[el],
          width: message[el].width,
          height: message[el].height,
          index: i++
        };
      } else if (el === "location") {
        jsonMessage[el] = {
          latitude: message[el]["latitude"],
          longtitude: message[el]["longtitude"],
          index: i++
        };
      } else if (el === "contact") {
        jsonMessage[el] = {
          first_name: message[el]["first_name"],
          last_name: message[el]["last_name"],
          phone_number: message[el]["phone_number"],
          index: i++
        };
      } else if (el === "caption") {
        jsonMessage[el] = {
          text: message[el],
          index: 998
        };
      } else if (["video", "voice", "audio"].includes(el)) {
        jsonMessage[el] = {
          ...jsonMessage[el],
          duration: message[el].duration,
          index: i++
        };
      }
    }
    if (el === "text") {
      message[el] = message[el] || "";
      if (!quotation && message[el].indexOf("/me ") === 0) {
        action = "action";
        message[el] = message[el]
          .split("/me ")
          .slice(1)
          .join("/me ");
      }
      jsonMessage[el] = {
        text: message[el],
        index: 999
      };
    }
  }
  let arrMessage = Object.keys(jsonMessage).sort(
    (a, b) => jsonMessage[a].index - jsonMessage[b].index
  );

  const reply_to_bot =
    quotation && message.from.id === config.telegram.myUser.id ? true : false;
  let author = "";
  if (reply_to_bot && jsonMessage["text"] && jsonMessage["text"].text) {
    const arrTxtMsg = jsonMessage["text"].text.split(": ");
    author = arrTxtMsg[0];
    jsonMessage["text"].text = arrTxtMsg.slice(1).join(": ");
  } else if (!reply_to_bot) {
    author = GetName.telegram(message.from);
  }
  // now send from Telegram
  for (let i: number = 0; i < arrMessage.length; i++) {
    const el = arrMessage[i];
    if (el === "text") {
      jsonMessage[el].text = jsonMessage[el].text.replace(
        `@${config.telegram.myUser.username}`,
        ""
      );
      if (
        quotation &&
        jsonMessage[el].text.length > config["telegram"].MessageLength
      )
        jsonMessage[el].text = `${jsonMessage[el].text.substring(
          0,
          config["telegram"].MessageLength - 1
        )} ...`;
    }
    if (jsonMessage[el].url)
      [
        jsonMessage[el].url,
        jsonMessage[el].local_file
      ] = await generic.telegram.serveFile(jsonMessage[el].url);
    const arrForLocal = Object.keys(jsonMessage[el]).map(i => [
      i,
      jsonMessage[el][i]
    ]);
    const text = generic.LocalizeString({
      messenger: "telegram",
      channelId: message.chat.id,
      localized_string_key: `MessageWith.${el}.telegram`,
      arrElemsToInterpolate: arrForLocal
    });
    const edited = message.edit_date ? true : false;
    sendFrom({
      messenger: "telegram",
      channelId: message.chat.id,
      author,
      text,
      action,
      quotation,
      file: jsonMessage[el].local_file,
      edited
    });
  }
}

receivedFrom.vkwall = async (message: any) => {
  if (!config.channelMapping.vkwall) return;
  const channelId = message.post_id;
  if (
    !config.channelMapping.vkwall[channelId] ||
    "-" + config.vkwall.group_id === message.from_id.toString()
  )
    return;
  if (!generic.vkwall.client.app) {
    config.MessengersAvailable.vkwall = false;
    return;
  }
  let text = message.text;
  const fromwhomId = message.from_id;
  let [err, res] = await to(
    generic.vkwall.client.bot.api("users.get", {
      user_ids: fromwhomId,
      access_token: config.vkwall.token,
      fields: "nickname,screen_name"
    })
  );
  res = res?.response?.[0] || fromwhomId;
  const author = AdaptName.vkwall(res);

  let arrQuotes: string[] = [];
  text.replace(
    /\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g,
    (match: any, group_id: string, post_id: string) => {
      if (group_id === config.vkwall.group_id) {
        arrQuotes.push(post_id);
      }
    }
  );
  if (arrQuotes.length > 0) {
    const token = generic.vkwall.client.app.token;
    for (const el of arrQuotes) {
      const opts = {
        access_token: token,
        group_id: config.vkwall.group_id,
        topic_id: channelId,
        start_comment_id: el,
        count: 1,
        v: "5.84"
      };
      [err, res] = await to(
        generic.vkwall.client.bot.api("board.getComments", opts)
      );
      let text: string = res?.response?.items?.[0]?.text;
      if (!text) continue;
      let replyuser: string;
      const rg = new RegExp(
        `^\\[club${config.vkwall.group_id}\\|(.*?)\\]: (.*)$`
      );
      if (rg.test(text)) {
        [, replyuser, text] = text.match(rg);
      } else {
        let authorId = res?.response?.items?.[0]?.from_id;
        [err, res] = await to(
          generic.vkwall.client.bot.api("users.get", {
            user_ids: authorId,
            access_token: config.vkwall.token,
            fields: "nickname,screen_name"
          })
        );
        replyuser = res?.response?.[0] || "";
        replyuser = AdaptName.vkwall(replyuser);
      }
      sendFrom({
        messenger: "vkwall",
        channelId,
        author: replyuser,
        text,
        quotation: true
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
              .map((i: any) => {
                i.square = i.width * i.height;
                return i;
              })
              .sort(
                (d: any, c: any) => parseFloat(c.size) - parseFloat(d.size)
              );
            texts.push(sizes[0].url);
            texts.push(a.photo.text);
          } catch (e) {}
          break;
        case "doc":
          try {
            texts.push(a.doc.url);
          } catch (e) {}
          break;
      }
    }
  }
  texts.filter(Boolean).map((mini: string) => {
    sendFrom({
      messenger: "vkwall",
      edited: message.edited,
      channelId,
      author,
      text: mini
    });
  });
  sendFrom({
    messenger: "vkwall",
    edited: message.edited,
    channelId,
    author,
    text
  });
};

receivedFrom.vkboard = async (message: any) => {
  if (!config.channelMapping.vkboard) return;
  const channelId = message.topic_id;
  if (
    !config.channelMapping.vkboard[channelId] ||
    message.topic_owner_id === message.from_id
  )
    return;
  if (!generic.vkboard.client.app) {
    config.MessengersAvailable.vkboard = false;
    return;
  }
  let text = message.text;
  const fromwhomId = message.from_id;
  let [err, res] = await to(
    generic.vkboard.client.bot.api("users.get", {
      user_ids: fromwhomId,
      access_token: config.vkboard.token,
      fields: "nickname,screen_name"
    })
  );
  res = res?.response?.[0] || fromwhomId;
  const author = AdaptName.vkboard(res);

  let arrQuotes: string[] = [];
  text.replace(
    /\[[^\]]+:bp-([^\]]+)_([^\]]+)\|[^\]]*\]/g,
    (match: any, group_id: string, post_id: string) => {
      if (group_id === config.vkboard.group_id) {
        arrQuotes.push(post_id);
      }
    }
  );
  if (arrQuotes.length > 0) {
    const token = generic.vkboard.client.app.token;
    for (const el of arrQuotes) {
      const opts = {
        access_token: token,
        group_id: config.vkboard.group_id,
        topic_id: channelId,
        start_comment_id: el,
        count: 1,
        v: "5.84"
      };
      [err, res] = await to(
        generic.vkboard.client.bot.api("board.getComments", opts)
      );
      let text: string = res?.response?.items?.[0]?.text;
      if (!text) continue;
      let replyuser: string;
      const rg = new RegExp(
        `^\\[club${config.vkboard.group_id}\\|(.*?)\\]: (.*)$`
      );
      if (rg.test(text)) {
        [, replyuser, text] = text.match(rg);
      } else {
        let authorId = res?.response?.items?.[0]?.from_id;
        [err, res] = await to(
          generic.vkboard.client.bot.api("users.get", {
            user_ids: authorId,
            access_token: config.vkboard.token,
            fields: "nickname,screen_name"
          })
        );
        replyuser = res?.response?.[0] || "";
        replyuser = AdaptName.vkboard(replyuser);
      }
      sendFrom({
        messenger: "vkboard",
        channelId,
        author: replyuser,
        text,
        quotation: true
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
              .map((i: any) => {
                i.square = i.width * i.height;
                return i;
              })
              .sort(
                (d: any, c: any) => parseFloat(c.size) - parseFloat(d.size)
              );
            texts.push(sizes[0].url);
            texts.push(a.photo.text);
          } catch (e) {}
          break;
        case "doc":
          try {
            texts.push(a.doc.url);
          } catch (e) {}
          break;
      }
    }
  }
  texts.filter(Boolean).map((mini: string) => {
    sendFrom({
      messenger: "vkboard",
      edited: message.edited,
      channelId,
      author,
      text: mini
    });
  });
  sendFrom({
    messenger: "vkboard",
    edited: message.edited,
    channelId,
    author,
    text
  });
};

receivedFrom.slack = async (message: any) => {
  if (!config.channelMapping.slack) return;
  if (
    message.subtype === "message_changed" &&
    message?.message?.text === message?.previous_message?.text &&
    (message?.files || []).length === 0
  )
    return;
  if (
    (message.subtype &&
      !["me_message", "channel_topic", "message_changed"].includes(
        message.subtype
      )) ||
    generic.slack.client.rtm.activeUserId === message.user
  )
    return;

  if (!message.user && message.message) {
    if (!message.message.user) return;
    message.user = message.message.user;
    message.text = message.message.text;
  }
  const edited = message.subtype === "message_changed" ? true : false;

  const promUser = generic.slack.client.web.users.info({
    user: message.user
  });
  const promChannel = generic.slack.client.web.conversations.info({
    channel: message.channel
  });

  const promFiles = (message.files || []).map((file: any) =>
    generic.downloadFile({
      type: "slack",
      remote_path: file.url_private
    })
  );

  let err: any, user: any, chan: any, files: any[];
  [err, user] = await to(promUser);
  if (err) user = message.user;
  [err, chan] = await to(promChannel);
  if (err) chan = message.channel;
  [err, files] = await to(Promise.all(promFiles));
  if (err) files = [];
  const author = AdaptName.slack(user);
  const channelId = chan.channel.name || message.channel;

  let action;
  if (message.subtype === "me_message") action = "action";
  if (
    message.subtype === "channel_topic" &&
    message.topic &&
    message.topic !== ""
  ) {
    action = "topic";
    message.text = generic.LocalizeString({
      messenger: "slack",
      channelId,
      localized_string_key: "topic",
      arrElemsToInterpolate: [["topic", message.topic]]
    });
  }
  if (files.length > 0)
    files.map(([file, localfile]: [string, string]) => {
      sendFrom({
        messenger: "slack",
        channelId,
        author,
        text: file,
        file: localfile,
        edited
      });
    });
  if (message.text && !message.topic) {
    sendFrom({
      messenger: "slack",
      channelId,
      author,
      text: message.text,
      action,
      edited
    });
  }
};

receivedFrom.mattermost = async (message: any) => {
  // debug("mattermost")(message);
  // if (process.env.log)
  //   logger.log({
  //     level: "info",
  //     message: JSON.stringify(message)
  //   });
  if (!config.channelMapping.mattermost) return;
  let channelId, msgText, author, file_ids, postParsed;
  if (message.event === "post_edited") {
    const post = JSON.parse(message.data?.post || "");

    if (!post.id) return;
    message.event = "posted";
    message.edited = true;
    let err: any;
    [err] = await to(
      new Promise(resolve => {
        const url = `${config.mattermost.ProviderUrl}/api/v4/posts/${post.id}`;
        request(
          {
            method: "GET",
            url,
            headers: {
              Authorization: `Bearer ${config.mattermost.token}`
            }
          },
          (error: any, response: any, body: any) => {
            if (error) {
              console.error(error.toString());
            } else {
              msgText = JSON.parse(body).message;
              file_ids = JSON.parse(body).file_ids;
            }
            resolve();
          }
        );
      })
    );
    if (err) console.error(err.toString());
    [err] = await to(
      new Promise(resolve => {
        const url = `${config.mattermost.ProviderUrl}/api/v4/users/${post.user_id}`;
        request(
          {
            method: "GET",
            url,
            headers: {
              Authorization: `Bearer ${config.mattermost.token}`
            }
          },
          (error: any, response: any, body: any) => {
            const json: Json = {};
            if (error) {
              console.error(error.toString());
            } else {
              body = JSON.parse(body);
              author = body.username || body.nickname || body.first_name || "";
            }
            resolve();
          }
        );
      })
    );
    if (err) console.error(err.toString());
    [err] = await to(
      new Promise(resolve => {
        const url = `${config.mattermost.ProviderUrl}/api/v4/channels/${post.channel_id}`;
        request(
          {
            method: "GET",
            url,
            headers: {
              Authorization: `Bearer ${config.mattermost.token}`
            }
          },
          (error: any, response: any, body: any) => {
            const json: Json = {};
            if (error) {
              console.error(error.toString());
            } else {
              channelId = JSON.parse(body).name;
            }
            resolve();
          }
        );
      })
    );
    if (err) console.error(err.toString());
  } else {
    message.edited = false;
    if (message.data?.team_id !== config.mattermost.team_id) return;
    if (message.event !== "posted") return;
    const post = message.data?.post;
    if (!post) return;
    postParsed = JSON.parse(post);
    channelId = message.data?.channel_name;
  }
  if (
    config.channelMapping.mattermost[channelId] &&
    !postParsed?.props?.from_webhook &&
    (postParsed?.type || "") === ""
  ) {
    if (!file_ids) file_ids = postParsed?.file_ids || [];
    let files = [];
    for (const file of file_ids) {
      const [err, promfile] = await to(
        new Promise(resolve => {
          const url = `${config.mattermost.ProviderUrl}/api/v4/files/${file}/link`;
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${config.mattermost.token}`
              }
            },
            (error: any, response: any, body: any) => {
              const json: Json = {};
              if (error) {
                console.error(error.toString());
                resolve();
              } else {
                resolve(JSON.parse(body).link);
              }
            }
          );
        })
      );
      if (err) console.error(err.toString());
      const [err2, promfile2] = await to(
        new Promise(resolve => {
          const url = `${config.mattermost.ProviderUrl}/api/v4/files/${file}/info`;
          request(
            {
              method: "GET",
              url,
              headers: {
                Authorization: `Bearer ${config.mattermost.token}`
              }
            },
            (error: any, response: any, body: any) => {
              const json: Json = {};
              if (error) {
                console.error(error.toString());
                resolve();
              } else {
                resolve(JSON.parse(body).extension);
              }
            }
          );
        })
      );
      if (err2) console.error(err.toString());
      if (promfile && promfile2) files.push([promfile2, promfile]);
    }
    author = author || message.data?.sender_name;
    author = author.replace(/^@/, "");
    if (files.length > 0) {
      for (const [extension, file] of files) {
        const [file_, localfile]: [string, string] = await generic.downloadFile(
          {
            type: "simple",
            remote_path: file,
            extension
          }
        );
        sendFrom({
          messenger: "mattermost",
          channelId,
          author,
          text: file_,
          file: localfile,
          edited: message.edited
        });
      }
    }
    let action;
    //todo; handle mattermost actions
    sendFrom({
      messenger: "mattermost",
      channelId,
      author,
      text: msgText || postParsed?.message,
      action,
      edited: message.edited
    });
  }
};

receivedFrom.irc = async ({
  author,
  channelId,
  text,
  handler,
  error,
  type
}: {
  author: string;
  channelId: string;
  text: string;
  handler: any;
  error: any;
  type: string;
}) => {
  if (!config?.channelMapping?.irc) return;
  if (type === "message") {
    if (text.search(new RegExp(config.spamremover.irc.source, "i")) >= 0)
      return;
    text = ircolors.stripColorsAndStyle(text);

    text = `<${ircolors
      .stripColorsAndStyle(author)
      .replace(/_+$/g, "")}>: ${text}`;
    if (
      !config?.channelMapping?.irc?.[channelId]?.settings?.[
        "irc-dontProcessOtherBridges"
      ]
    )
      text = text
        .replace(/^<[^ <>]+?>: <([^<>]+?)> ?: /, "*$1*: ")
        .replace(/^<[^ <>]+?>: &lt;([^<>]+?)&gt; ?: /, "*$1*: ");
    text = text
      .replace(/^<([^<>]+?)>: /, "*$1*: ")
      .replace(/^\*([^<>]+?)\*: /, "<b>$1</b>: ");

    [, author, text] = text.match(/^<b>(.+?)<\/b>: (.*)/);
    if (text && text !== "") {
      sendFrom({
        messenger: "irc",
        channelId,
        author,
        text
      });
    }
  } else if (type === "action") {
    sendFrom({
      messenger: "irc",
      channelId,
      author,
      text,
      action: "action"
    });
  } else if (type === "topic") {
    const topic = generic.LocalizeString({
      messenger: "irc",
      channelId,
      localized_string_key: type,
      arrElemsToInterpolate: [[type, text]]
    });
    if (!config.channelMapping.irc[channelId]) return;

    if (
      !topic ||
      !config.irc.sendTopic ||
      // ignore first topic event when joining channel and unchanged topics
      // (should handle rejoins)
      !config.channelMapping.irc[channelId].previousTopic ||
      config.channelMapping.irc[channelId].previousTopic === text
    ) {
      config.channelMapping.irc[channelId].previousTopic = text;
      return;
    }
    sendFrom({
      messenger: "irc",
      channelId,
      author: author.split("!")[0],
      text: topic,
      action: "topic"
    });
  } else if (type === "error") {
    console.error`IRC ERROR:`;
    console.error(error);
    //todo: restart irc
  } else if (type === "registered") {
    config.irc.ircPerformCmds.forEach((cmd: string) => {
      handler.send.apply(null, cmd.split(" "));
    });
    config.irc.ircOptions.channels.forEach((channel: string) => {
      handler.join(channel);
    });
  }
};

// AdaptName
AdaptName.discord = (message: any) => {
  return message.member?.nickname || message.author?.username;
};
AdaptName.facebook = (user: any) => user.name; // || user.vanity || user.firstName;
AdaptName.telegram = (name: string) =>
  config.telegram.userMapping[name] || name;
AdaptName.vkboard = (user: any) => {
  let full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  if (full_name === "") full_name = undefined;
  if (user.nickname && user.nickname.length < 1) user.nickname = null;
  if (user.screen_name && user.screen_name.length < 1) user.screen_name = null;
  return user.screen_name || user.nickname || full_name || user.id;
};
AdaptName.vkwall = AdaptName.vkboard;
AdaptName.slack = (user: any) =>
  user?.user?.profile?.display_name ||
  user?.user?.real_name ||
  user?.user?.name;

// GetName
GetName.telegram = (user: Telegram.User) => {
  let name = config.telegram.nameFormat;
  if (user.username) {
    name = name.replace("%username%", user.username, "g");
    name = AdaptName.telegram(name);
  } else {
    // if user lacks username, use fallback format string instead
    name = name.replace(
      "%username%",
      config.telegram.usernameFallbackFormat,
      "g"
    );
  }

  name = name.replace("%firstName%", user.first_name || "", "g");
  name = name.replace("%lastName%", user.last_name || "", "g");

  // get rid of leading and trailing whitespace
  name = name.replace(/(^\s*)|(\s*$)/g, "");
  return name;
};

convertFrom.slack = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) => {
  const source = text;
  const RE_ALPHANUMERIC = new RegExp("^\\w?$"),
    RE_TAG = new RegExp("<(.+?)>", "g"),
    RE_BOLD = new RegExp("\\*([^\\*]+?)\\*", "g"),
    RE_ITALIC = new RegExp("_([^_]+?)_", "g"),
    RE_FIXED = new RegExp("(?<!`)`([^`]+?)`(?!`)", "g"),
    RE_MULTILINE_FIXED = new RegExp("```((?:(?!```)[\\s\\S])+?)```", "gm");

  const pipeSplit: any = (payload: any) => payload.split`|`;
  const payloads: any = (tag: any, start: number) => {
    if (!start) start = 0;
    const length = tag.length;
    return pipeSplit(tag.substr(start, length - start));
  };

  const tag = (tag: string, attributes: any, payload?: any) => {
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

  const matchTag = (match: RegExpExecArray | null) => {
    const action = match[1].substr(0, 1);
    let p;

    switch (action) {
      case "!":
        return tag("span", { class: "slack-cmd" }, payloads(match[1], 1)[0]);
      case "#":
        p = payloads(match[1], 2);
        return tag(
          "span",
          { class: "slack-channel" },
          p.length === 1 ? p[0] : p[1]
        );
      case "@":
        p = payloads(match[1], 2);
        return tag(
          "span",
          { class: "slack-user" },
          p.length === 1 ? p[0] : p[1]
        );
      default:
        p = payloads(match[1]);
        return tag("a", { href: p[0] }, p.length === 1 ? p[0] : p[1]);
    }
  };

  const safeMatch = (
    match: RegExpExecArray | null,
    tag: string,
    trigger?: string
  ) => {
    let prefix_ok = match.index === 0;
    let postfix_ok = match.index === match.input.length - match[0].length;

    if (!prefix_ok) {
      const charAtLeft: string = match.input.substr(match.index - 1, 1);
      prefix_ok =
        notAlphanumeric(charAtLeft) && notRepeatedChar(trigger, charAtLeft);
    }

    if (!postfix_ok) {
      const charAtRight: string = match.input.substr(
        match.index + match[0].length,
        1
      );
      postfix_ok =
        notAlphanumeric(charAtRight) && notRepeatedChar(trigger, charAtRight);
    }

    if (prefix_ok && postfix_ok) return tag;
    return false;
  };

  const matchBold = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("strong", payloads(match[1])), "*");

  const matchItalic = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("em", payloads(match[1])), "_");

  const matchFixed = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("code", payloads(match[1])));
  const matchPre = (match: RegExpExecArray | null) =>
    safeMatch(match, tag("pre", payloads(match[1])));

  const notAlphanumeric = (input: string) => !RE_ALPHANUMERIC.test(input);

  const notRepeatedChar = (trigger: string, input: string) =>
    !trigger || trigger !== input;

  async function parseSlackText(text: string) {
    const jsonChannels: Json = {};
    const jsonUsers: Json = {};
    text.replace(
      /<#(C\w+)\|?(\w+)?>/g,
      (match: any, channelId: any, readable: any) => {
        jsonChannels[channelId] = channelId;
        return channelId;
      }
    );
    text.replace(
      /<@(U\w+)\|?(\w+)?>/g,
      (match: any, userId: any, readable: any) => {
        jsonUsers[userId] = userId;
        return userId;
      }
    );
    for (const channelId of Object.keys(jsonChannels)) {
      const [err, { channel }] = await to(
        generic.slack.client.web.conversations.info({ channel: channelId })
      );
      if (!err) {
        jsonChannels[channelId] = channel.name;
      } else {
        debug("slack")({
          error: err
        });
      }
    }
    for (const userId of Object.keys(jsonUsers)) {
      const [err, user] = await to(
        generic.slack.client.web.users.info({ user: userId })
      );
      if (err) {
        debug("slack")({
          error: err
        });
      }
      jsonUsers[userId] = AdaptName.slack(user);
    }
    return (
      emoji
        .emojify(text)
        .replace(/<pre>\\n/g, "<pre>")
        .replace(":simple_smile:", ":)")
        .replace(/<!channel>/g, "@channel")
        .replace(/<!group>/g, "@group")
        .replace(/<!everyone>/g, "@everyone")
        .replace(
          /<#(C\w+)\|?(\w+)?>/g,
          (match: any, channelId: any, readable: any) => {
            return `#${readable || jsonChannels[channelId]}`;
          }
        )
        .replace(
          /<@(U\w+)\|?(\w+)?>/g,
          (match: any, userId: any, readable: any) => {
            return `@${readable || jsonUsers[userId]}`;
          }
        )
        .replace(/<(?!!)([^|]+?)>/g, (match: any, link: any) => link)
        .replace(
          /<!(\w+)\|?(\w+)?>/g,
          (match: any, command: any, label: any) => `<${label || command}>`
        )
        // .replace(/:(\w+):/g, (match: any, emoji: any) => {
        //   if (emoji in emojis) return emojis[emoji];
        //   return match;
        // })
        .replace(/<.+?\|(.+?)>/g, (match: any, readable: any) => readable)
    );
  }

  const publicParse = async (text: string) => {
    const patterns = [
      { p: RE_TAG, cb: matchTag },
      { p: RE_BOLD, cb: matchBold },
      { p: RE_ITALIC, cb: matchItalic },
      { p: RE_MULTILINE_FIXED, cb: matchPre },
      { p: RE_FIXED, cb: matchFixed }
    ];
    text = await parseSlackText(text);
    for (const pattern of patterns) {
      const original = text;
      let result: RegExpExecArray | null;

      while ((result = pattern.p.exec(original)) !== null) {
        const replace = pattern.cb(result);
        if (replace) text = text.replace(result[0], replace);
      }
    }

    return text;
  };
  // text = generic.escapeHTML(text);
  const [error, result] = await to(publicParse(text));
  debug("slack")({
    "converting source text": source,
    result: result || text,
    error
  });
  return result || text;
};

convertFrom.facebook = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) => generic.escapeHTML(text);
convertFrom.telegram = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) => {
  const res = markedParse({
    text: text.replace(
      /<p><code>([\s\S]*?)<\/code><\/p>/gim,
      "<p><pre>$1</pre></p>"
    ),
    messenger: "telegram"
  });
  return res;
};
convertFrom.vkboard = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) => generic.escapeHTML(text).replace(/\[[^\]]*\|(.*?)\](, ?)?/g, "");
convertFrom.vkwall = convertFrom.vkboard;
convertFrom.mattermost = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) =>
  markedParse({
    text: generic.escapeHTML(text),
    messenger: "mattermost",
    unescapeCodeBlocks: true
  });
convertFrom.discord = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) => {
  const result = discordParser.toHTML(text);
  debug(messenger)({
    messenger,
    "converting text": text,
    result
  });
  return result;
};

// markedParse({
//   text: text.replace(/^(>[^\n]*?\n)/gm, "$1\n").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
//   messenger: "discord",
//   dontEscapeBackslash: true
// });
convertFrom.webwidget = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) => text;
convertFrom.irc = async ({
  text,
  messenger
}: {
  text: string;
  messenger: string;
}) => {
  const result = generic
    .escapeHTML(text)
    .replace(/\*\b(\w+)\b\*/g, "<b>$1</b>")
    .replace(/_\b(\w+)\b_/g, "<i>$1</i>")
    .replace(/\*/g, "&#42;")
    .replace(/_/g, "&#95;")
    .replace(/`/g, "&#96;");
  debug(messenger)({
    messenger,
    "converting text": text,
    result
  });

  return result;
};

async function convertToPlainText(text: string) {
  let a = await generic.unescapeHTML({
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
        if (url !== name) return `${name} (${url})`;
        return " " + url;
      })
      .replace(/<(?:.|\s)*?>/g, "")
      .trim(),
    convertHtmlEntities: true
  });
  if (a.split(/\r\n|\r|\n/).length > 1) {
    a = "\n" + a;
  }
  return a;
}

convertTo.facebook = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => convertToPlainText(text);

convertTo.telegram = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => {
  const result = generic
    .sanitizeHtml(
      text
        .replace(
          /<blockquote>\n<p>([\s\S]*?)<\/p>\n<\/blockquote>/gim,
          "<pre>$1</pre>"
        )
        .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gim, "<pre>$1</pre>"),
      [
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
        "del"
      ]
    )
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gim, "<pre>$1</pre>")
    .replace(/<br( \/|)>/g, "\n");
  debug(messenger)({
    messengerTo,
    "converting text": text,
    intermediate: text.replace(
      /<blockquote>\n<p>([\s\S]*?)<\/p>\n<\/blockquote>/gim,
      "<pre>$1</pre>"
    ),
    result
  });
  return result;
};
convertTo.vkboard = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => {
  const result = html2irc(text);
  debug(messenger)({ messengerTo, "converting text": text, result });
  return result;
};
convertTo.vkwall = convertTo.vkboard;
convertTo.slack = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => {
  const result = html2slack(text);
  debug(messenger)({ messengerTo, "converting text": text, result });
  return result;
};
convertTo.mattermost = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => {
  const result = await generic.unescapeHTML({
    text: html2md.convert({
      string: text,
      hrefConvert: false,
      dialect: messengerTo
    }),
    convertHtmlEntities: true
  });
  debug(messenger)({ messengerTo, "converting text": text, result });
  return result;
};
convertTo.discord = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => {
  const result = await generic.unescapeHTML({
    text: html2md.convert({
      string: text
        .replace(/&#x2A;/g, "&#x5C;&#x2A;")
        .replace(/&#x5F;/g, "&#x5C;&#x5F;"),
      hrefConvert: false,
      dialect: messengerTo
    }),
    convertHtmlEntities: true,
    escapeBackslashes: false
  });
  debug(messenger)({ messengerTo, "converting text": text, result });
  return result;
};

convertTo.webwidget = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => text;

convertTo.irc = async ({
  text,
  messenger,
  messengerTo
}: {
  text: string;
  messenger: string;
  messengerTo: string;
}) => {
  const result = await generic.unescapeHTML({
    text: html2irc(text),
    convertHtmlEntities: true
  });
  debug(messenger)({ messengerTo, "converting text": text, result });
  return result;
};

// generic.telegram
generic.telegram.serveFile = (fileId: number) =>
  generic.downloadFile({
    type: "telegram",
    fileId
  });

generic.writeCache = async ({
  channelName,
  channelId,
  action
}: {
  channelName: string | number;
  channelId: string | number;
  action: string;
}) => {
  await new Promise(resolve => {
    fs.writeFile(
      `${process.env.HOME}/.${package_json.name}/cache.json`,
      JSON.stringify(config.cache),
      (err: any) => {
        if (err) action = "error " + err.toString();
        console.log(
          `
          action: ${action}\n
          channel Name: ${channelName}\n
          channel Id: ${channelId}
          `
        );
        resolve();
      }
    );
  });
};

async function TelegramRemoveSpam(message: Telegram.Message) {
  const cloned_message = JSON.parse(JSON.stringify(message));
  if (IsSpam(cloned_message)) {
    if (message.text && message.text.search(/\bt\.me\b/) >= 0) {
      const [err, chat] = await to(
        generic.telegram.client.getChat(message.chat.id)
      );
      if (!err) {
        const invite_link = chat.invite_link;
        cloned_message.text = cloned_message.text.replace(invite_link, "");
        if (IsSpam(cloned_message))
          generic.telegram.DeleteMessage({ message, log: true });
      } else {
        generic.LogToAdmin(
          `error on getting an invite link of the chat ${message.chat.id} ${message.chat.title}`
        );
      }
    } else {
      const [err, chat] = await to(
        generic.telegram.client.getChat(cloned_message.chat.id)
      );
      if (!err) {
        generic.telegram.DeleteMessage({ message, log: true });
      } else {
        generic.LogToAdmin(
          `error on getting an invite link of the chat ${cloned_message.chat.id} ${cloned_message.chat.title}`
        );
      }
    }
    return true;
  } else if (message.chat.title === "jbosnu" && message.text) {
    // dealing with non-lojban spam
    const arrText = message.text.split(" ");
    const xovahe =
      arrText.filter(
        i => lojban.ilmentufa_off("lo'u " + i + " le'u").tcini === "snada"
      ).length / arrText.length;
    if (xovahe < 0.5) {
      generic.telegram.client
        .sendMessage(
          message.chat.id,
          ".i mi smadi le du'u do na tavla fo su'o lojbo .i ja'e bo mi na benji di'u fi la IRC\n\nIn this group only Lojban is allowed. Try posting your question to [#lojban](https://t.me/joinchat/BLVsYz3hCF8mCAb6fzW1Rw) or [#ckule](https://telegram.me/joinchat/BLVsYz4hC9ulWahupDLovA) (school) group",
          {
            reply_to_message_id: message.message_id,
            parse_mode: "Markdown"
          }
        )
        .catch((e: any) =>
          debug("telegram")({
            error: e.toString()
          })
        );
      return true;
    }
  }
}

function TelegramRemoveAddedBots(message: Telegram.Message) {
  if (config.telegram.remove_added_bots)
    (message?.new_chat_members || []).map((u: Telegram.User) => {
      if (u.is_bot && config?.telegram?.myUser?.id !== u.id)
        generic.telegram.client
          .kickChatMember(message.chat.id, u.id)
          .catch(catchError);
    });
}

function TelegramRemoveNewMemberMessage(message: Telegram.Message) {
  if (
    message?.left_chat_member ||
    (message?.new_chat_members || []).filter(
      (u: Telegram.User) =>
        (u.username || "").length > 100 ||
        (u.first_name || "").length > 100 ||
        (u.last_name || "").length > 100
    ).length > 0
  ) {
    generic.telegram.DeleteMessage({ message, log: false });
  }
  if (message.left_chat_member || message.new_chat_members) return true;
  return false;
}

async function TelegramLeaveChatIfNotAdmin(message: Telegram.Message) {
  if (
    !["group", "supergroup"].includes(message?.chat?.type) ||
    !message?.chat?.id ||
    !config?.telegram?.myUser?.id
  )
    return;

  let [err, res] = await to(
    generic.telegram.client.getChatMember(
      message.chat.id,
      config.telegram.myUser.id
    )
  );
  if (!res) return true;
  if (!res.can_delete_messages) {
    [err, res] = await to(generic.telegram.client.leaveChat(message.chat.id));

    const jsonMessage = {
      id: message?.chat?.id || message?.from?.id,
      title: message?.chat?.title,
      first_name: message?.from?.first_name,
      last_name: message?.from?.last_name,
      username: message?.from?.username,
      message: message?.text
    };
    generic.LogToAdmin(`leaving chat ${JSON.stringify(jsonMessage)}`);
    config.cache.telegram[message.chat.title] = undefined;
    await to(
      generic.writeCache({
        channelName: message.chat.title,
        channelId: message.chat.id,
        action: "leave"
      })
    );
    return true;
  }
  return false;
}

generic.telegram.DeleteMessage = async ({
  message,
  log
}: {
  message: Telegram.Message;
  log: boolean;
}) => {
  if (log) await to(generic.LogMessageToAdmin(message));
  await to(
    generic.telegram.client.deleteMessage(message.chat.id, message.message_id)
  );
};

// generic
generic.ConfigBeforeStart = () => {
  if (process.argv[2] === "--genconfig") {
    mkdir(`${process.env.HOME}/.${package_json.name}`);

    // read default config using readFile to include comments
    const config = fs.readFileSync(`${__dirname}/../config/defaults.js`);
    const configPath = `${process.env.HOME}/.${package_json.name}/config.js`;
    fs.writeFileSync(configPath, config);
    throw new Error(
      `Wrote default configuration to ${configPath}, please edit it before re-running`
    );
  }

  let config;

  try {
    config = require(`${process.env.HOME}/.${package_json.name}/config.js`);
  } catch (e) {
    throw new Error(
      `ERROR while reading config:\n${e}\n\nPlease make sure ` +
        'it exists and is valid. Run "node bridge --genconfig" to ' +
        "generate a default config."
    );
  }

  const defaultConfig = require("../config/defaults");
  config = R.mergeDeepLeft(config, defaultConfig);

  // irc
  const channels = config.channels;
  const result = [];
  for (let i = 0; i < channels.length; i++) {
    if (channels[i].irc) {
      const chanName = channels[i]["irc-password"]
        ? `${channels[i].irc} ${channels[i]["irc-password"]}`
        : channels[i].irc;
      result.push(chanName);
    }
  }
  config.irc.ircOptions.channels = result;
  config.irc.ircOptions.encoding = "utf-8";
  const localConfig = require("../local/dict.json");

  return [config, localConfig];
};

NewChannelAppeared.telegram = async ({
  channelName,
  channelId
}: {
  channelName: string;
  channelId: string;
}) => {
  config.cache.telegram[channelName] = channelId;
  let [err, res] = await to(
    generic.writeCache({ channelName, channelId, action: "join" })
  );
  if (err) {
    console.error(err);
    return;
  }
  [err, res] = await to(generic.PopulateChannelMapping());
  if (err)
    generic.LogToAdmin(
      `got problem in the new telegram chat ${channelName}, ${channelId}`
    );
  if (err) {
    console.error(err);
    return;
  }
  return true;
};

GetChannels.telegram = async () => {
  if (!config.MessengersAvailable.telegram) return [];
  //read from file
  let [err, res] = await to(
    new Promise(resolve => {
      resolve(
        JSON.parse(
          fs.readFileSync(
            `${process.env.HOME}/.${package_json.name}/cache.json`
          )
        ).telegram
      );
    })
  );
  if (err || !res) res = {};
  config.cache.telegram = res;
  return res;
};

GetChannels.slack = async () => {
  if (!config.MessengersAvailable.slack) return {};
  let [err, res] = await to(generic.slack.client.web.conversations.list());
  if (err) {
    console.error(err);
  }
  res = res?.channels || [];
  const json: Json = {};
  res.map((i: any) => {
    json[i.name] = i.name;
  });
  config.cache.slack = json;
  return res;
};

GetChannels.mattermost = async () => {
  if (!config.MessengersAvailable.slack) return {};
  let json: Json = {};
  let url: string = `${config.mattermost.ProviderUrl}/api/v4/teams/${config.mattermost.team_id}/channels`;
  json = await GetChannelsMattermostCore(json, url);
  url = `${config.mattermost.ProviderUrl}/api/v4/users/${config.mattermost.user_id}/teams/${config.mattermost.team_id}/channels`;
  json = await GetChannelsMattermostCore(json, url);
  config.cache.mattermost = json;
  return json;
};

GetChannels.discord = async () => {
  if (!config.MessengersAvailable.discord) return;
  const json: Json = {};
  for (const value of generic.discord.client.channels.values()) {
    if (value.guild.id === config.discord.guildId) {
      json[value.name] = value.id;
    }
  }
  config.cache.discord = json;
  return;
};

async function GetChannelsMattermostCore(json: Json, url: string) {
  await to(
    new Promise(resolve => {
      request(
        {
          method: "GET",
          url,
          headers: {
            Authorization: `Bearer ${config.mattermost.token}`
          }
        },
        (error: any, response: any, body: any) => {
          if (error) {
            console.error(error.toString());
          } else {
            body = JSON.parse(body);
            if (body[0]) {
              body.map((i: any) => {
                json[i.name] = i.name;
              });
            }
          }
          resolve();
        }
      );
    })
  );
  return json;
}

async function PopulateChannelMappingCore({
  messenger
}: {
  messenger: string;
}) {
  if (!config.MessengersAvailable[messenger]) return;
  if (!config.channelMapping[messenger]) config.channelMapping[messenger] = {};
  const arrMappingKeys: string[] = [
    "facebook",
    "telegram",
    "vkboard",
    "vkwall",
    "slack",
    "mattermost",
    "discord",
    "webwidget",
    "irc"
  ];
  config.channels.map((i: any) => {
    let i_mapped = i[messenger];
    if (config.cache[messenger])
      i_mapped = config?.cache?.[messenger]?.[i[messenger]];
    if (!i_mapped) return;
    const mapping: any = {
      settings: {
        readonly: i[`${messenger}-readonly`],
        language: i["language"],
        nickcolor: i[`${messenger}-nickcolor`],
        name: i[messenger]
      }
    };
    for (const key of arrMappingKeys)
      mapping[key] = config?.cache?.[key]?.[i[key]] || i[key];

    config.channelMapping[messenger][i_mapped] = R.mergeDeepLeft(
      mapping,
      config.channelMapping[messenger][i_mapped] || {}
    );
  });
}

generic.PopulateChannelMapping = async () => {
  if (!config.channelMapping) config.channelMapping = {};
  if (!config.cache) config.cache = {};

  await GetChannels.telegram();
  await GetChannels.slack();
  await GetChannels.mattermost();
  await GetChannels.discord();

  await PopulateChannelMappingCore({ messenger: "facebook" });
  await PopulateChannelMappingCore({ messenger: "telegram" });
  await PopulateChannelMappingCore({ messenger: "vkboard" });
  await PopulateChannelMappingCore({ messenger: "vkwall" });
  await PopulateChannelMappingCore({ messenger: "slack" });
  await PopulateChannelMappingCore({ messenger: "mattermost" });
  await PopulateChannelMappingCore({ messenger: "discord" });

  await PopulateChannelMappingCore({ messenger: "webwidget" });
  await PopulateChannelMappingCore({ messenger: "irc" });
  // console.log(
  //   "started services with these channel mapping:\n",
  //   JSON.stringify(config.channelMapping, null, 2)
  // );
};

generic.MessengersAvailable = () => {
  config.MessengersAvailable = {};
  config.channels.map((i: any) => {
    if (i.facebook) config.MessengersAvailable.facebook = true;
    if (i.telegram) config.MessengersAvailable.telegram = true;
    if (i.vkboard) config.MessengersAvailable.vkboard = true;
    if (i.vkwall) config.MessengersAvailable.vkwall = true;
    if (i.slack) config.MessengersAvailable.slack = true;
    if (i.mattermost) config.MessengersAvailable.mattermost = true;
    if (i.discord) config.MessengersAvailable.discord = true;

    if (i.webwidget) config.MessengersAvailable.webwidget = true;
    if (i.irc) config.MessengersAvailable.irc = true;
  });
  if (
    (config?.facebook?.email || "") === "" ||
    (config?.facebook?.password || "") === ""
  )
    config.MessengersAvailable.facebook = false;
  if (
    (config?.discord?.client || "") === "" ||
    (config?.discord?.token || "") === "" ||
    (config?.discord?.guildId || "") === ""
  )
    config.MessengersAvailable.discord = false;
  if ((config?.telegram?.token || "") === "")
    config.MessengersAvailable.telegram = false;
  if (
    (config?.vkboard?.token || "") === "" ||
    (config?.vkboard?.group_id || "") === "" ||
    (config?.vkboard?.login || "") === "" ||
    (config?.vkboard?.password || "") === ""
  )
    config.MessengersAvailable.vkboard = false;
  if (
    (config?.vkwall?.token || "") === "" ||
    (config?.vkwall?.group_id || "") === "" ||
    (config?.vkwall?.login || "") === "" ||
    (config?.vkwall?.password || "") === ""
  )
    config.MessengersAvailable.vkwall = false;
};

StartService.facebook = async (force: boolean) => {
  //facebook
  if (!force && !config.MessengersAvailable.facebook) return;
  queueOf.facebook = new PQueue({ concurrency: 1 });
  try {
    generic.facebook.client = await login(
      config.facebook.email,
      config.facebook.password
    );
    console.log(generic.facebook.client);
    console.log(JSON.stringify(generic.facebook.client.getSession()));

    generic.facebook.client.on("message", (message: any) => {
      receivedFrom.facebook(message);
    });
    config.MessengersAvailable.facebook = true;
  } catch (e) {
    console.log(e.toString());
    // config.MessengersAvailable.facebook = false;
    // StartService.facebook(true);
  }
};

StartService.telegram = async () => {
  //telegram
  if (!config.MessengersAvailable.telegram) return;
  generic.telegram.client = generic.telegram.Start();
  queueOf.telegram = new PQueue({ concurrency: 1 });
  generic.telegram.client.on("message", (message: any) => {
    receivedFrom.telegram(message);
  });
  generic.telegram.client.on("edited_message", (message: any) => {
    receivedFrom.telegram(message);
  });
  generic.telegram.client.on("polling_error", (error: any) => {
    if (error.code === "ETELEGRAM" && error.response.body.error_code === 404) {
      config.MessengersAvailable.telegram = false;
      generic.telegram.client.stopPolling();
    }
  });
  const [err, res] = await to(generic.telegram.client.getMe());
  if (!err) config.telegram.myUser = res;
};

StartService.vkwall = async () => {
  //vkboard
  if (!config.MessengersAvailable.vkwall) return;
  generic.vkwall.client = await generic.vkwall.Start();
  if (!queueOf.vk) queueOf.vk = new PQueue({ concurrency: 1 });
  generic.vkwall.client.bot.event("wall_reply_new", async (ctx: any) => {
    receivedFrom.vkwall(ctx.message);
  });
  generic.vkwall.client.bot.event("wall_reply_edit", async (ctx: any) => {
    ctx.message.edited = true;
    receivedFrom.vkwall(ctx.message);
  });
  generic.vkwall.client.bot.startPolling();
};

StartService.vkboard = async () => {
  //vkboard
  if (!config.MessengersAvailable.vkboard) return;
  generic.vkboard.client = await generic.vkboard.Start();
  if (!queueOf.vk) queueOf.vk = new PQueue({ concurrency: 1 });
  generic.vkboard.client.bot.event("board_post_new", async (ctx: any) => {
    receivedFrom.vkboard(ctx.message);
  });
  generic.vkboard.client.bot.event("board_post_edit", async (ctx: any) => {
    ctx.message.edited = true;
    receivedFrom.vkboard(ctx.message);
  });
  generic.vkboard.client.bot.startPolling();
};

StartService.slack = async () => {
  //slack
  await generic.slack.Start();
  if (!config.MessengersAvailable.slack) return;
  queueOf.slack = new PQueue({ concurrency: 1 });
  generic.slack.client.rtm.on("message", (message: any) => {
    receivedFrom.slack(message);
  });
};

StartService.mattermost = async () => {
  //mattermost
  generic.mattermost.client = await generic.mattermost.Start();
  if (!config.MessengersAvailable.mattermost) return;
  queueOf.mattermost = new PQueue({ concurrency: 1 });
  generic.mattermost.client.addEventListener("open", () => {
    generic.mattermost.client.send(
      JSON.stringify({
        seq: 1,
        action: "authentication_challenge",
        data: {
          token: config.mattermost.token
        }
      })
    );
  });
  generic.mattermost.client.addEventListener("message", (message: any) => {
    if (!message?.data || !config.mattermost.team_id) return;
    message = JSON.parse(message.data);
    receivedFrom.mattermost(message);
  });
  generic.mattermost.client.addEventListener("close", () =>
    generic.mattermost.client._connect()
  );
  generic.mattermost.client.addEventListener("error", () =>
    generic.mattermost.client._connect()
  );
};

StartService.discord = async () => {
  //discord
  await generic.discord.Start();
  if (!config.MessengersAvailable.discord) return;

  queueOf.discord = new PQueue({ concurrency: 1 });
  await new Promise(resolve => {
    if (config.MessengersAvailable.discord) {
      generic.discord.client.on("ready", () => {
        resolve();
      });
      generic.discord.client.on("error", (error: any) => {
        debug("discord")(error);
        resolve();
        // StartService.discord();
      });
      generic.discord.client.login(config.discord.token);
    } else {
      resolve();
    }
  });
  generic.discord.client.on("message", (message: any) => {
    receivedFrom.discord(message);
  });
  generic.discord.client.on(
    "messageUpdate",
    (oldMessage: any, message: any) => {
      if (oldMessage.content != message.content) {
        message.edited = true;
        receivedFrom.discord(message);
      }
    }
  );
};

StartService.irc = async () => {
  //irc
  generic.irc.client = new Irc.Client(
    config.irc.ircServer,
    config.irc.ircOptions.nick,
    config.irc.ircOptions
  );
  if (!config.MessengersAvailable.irc) return;
  queueOf.irc = new PQueue({ concurrency: 1 });
  generic.irc.client.on("error", (error: any) => {
    receivedFrom.irc({
      error,
      type: "error"
    });
    // StartService.irc();
  });

  generic.irc.client.on("registered", () => {
    receivedFrom.irc({
      handler: generic.irc.client,
      type: "registered"
    });
  });

  generic.irc.client.on(
    "message",
    (author: string, channelId: string, text: string) => {
      receivedFrom.irc({
        author,
        channelId,
        text,
        type: "message"
      });
    }
  );

  generic.irc.client.on(
    "topic",
    (channelId: string, topic: string, author: string) => {
      receivedFrom.irc({
        author,
        channelId,
        text: topic,
        type: "topic"
      });
    }
  );

  generic.irc.client.on(
    "action",
    (author: string, channelId: string, text: string) => {
      receivedFrom.irc({
        author,
        channelId,
        text,
        type: "action"
      });
    }
  );
};

async function StartServices() {
  generic.MessengersAvailable();
  if (!config.channelMapping) config.channelMapping = {};

  await StartService.facebook();
  await StartService.telegram();
  await StartService.vkboard();
  await StartService.vkwall();
  await StartService.slack();
  await StartService.mattermost();
  await StartService.discord();
  await StartService.irc();

  await generic.PopulateChannelMapping();

  console.log("Lojban-1Chat-Bridge started!");
}

// helper functions
generic.sendOnlineUsersTo = ({
  network,
  channel
}: {
  network: string;
  channel: string;
}) => {
  // todo: get list of online users of each messenger
  // dont show the result in other networks
  if (network === "telegram") {
    const objChannel: any =
      generic.irc.client.chans[
        config?.channelMapping?.telegram?.[channel]?.irc
      ];

    if (!objChannel) return;

    let names: string[] = Object.keys(objChannel.users);

    names.forEach((name, i) => {
      names[i] = (objChannel.users[name] || "") + names[i];
    });
    names.sort();
    const strNames = `Users on ${objChannel.ircChan}:\n\n${names.join(", ")}`;

    generic.telegram.client
      .sendMessage(objChannel.id, strNames)
      .catch((e: any) =>
        debug("telegram")({
          error: "error sending to Telegram the list of online users"
        })
      );
  }
};

generic.LogMessageToAdmin = async (message: Telegram.Message) => {
  if (config.telegram.admins_userid)
    await to(
      generic.telegram.client.forwardMessage(
        config.telegram.admins_userid,
        message.chat.id,
        message.message_id
      )
    );
};

generic.LogToAdmin = (msg_text: string) => {
  if (config.telegram.admins_userid)
    generic.telegram.client
      .sendMessage(config.telegram.admins_userid, msg_text, {
        parse_mode: "Markdown"
      })
      .catch((e: any) => {
        console.log(msg_text);
        generic.LogToAdmin(msg_text);
      });
};

generic.escapeHTML = (arg: string) =>
  arg
    .replace(/&(?![a-zA-Z0-9#]{1,7};)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const htmlEntities: any = {
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
  "#96": "`"
};
generic.unescapeHTML = ({
  text,
  convertHtmlEntities,
  escapeBackslashes = true
}: {
  text: string;
  convertHtmlEntities?: boolean;
  escapeBackslashes?: boolean;
}) => {
  if (escapeBackslashes) text = text.replace(/\\/g, "\\");
  text = text.replace(/\&([^;]+);/g, (entity: string, entityCode: string) => {
    let match: any;

    if (convertHtmlEntities && htmlEntities[entityCode]) {
      return htmlEntities[entityCode];
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16));
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(~~match[1]);
    } else {
      return entity;
    }
  });
  return text;
};

function splitSlice(str: string, len: number) {
  const arrStr: string[] = [...str];
  let ret: string[] = [];
  for (let offset = 0, strLen = arrStr.length; offset < strLen; offset += len)
    ret.push(arrStr.slice(offset, len + offset).join(""));
  return ret;
}

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

// GetChunks.irc = async (text: string, messenger: string) => {
//   text = text.replace(/\n/g, "\r");
//   return await GetChunks.fallback(text, messenger);
// };

GetChunks.webwidget = async (text: string, messenger: string) => {
  return [text];
};

const diffTwo = (diffMe: string, diffBy: string) => {
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

function HTMLSplitter(text: string, limit = 400) {
  debug("generic")({ message: "html splitter: pre", text });

  const r = new RegExp(`(?<=.{${limit / 2},})[^<>](?![^<>]*>)`, "g");
  text = generic.sanitizeHtml(
    text.replace(
      /<blockquote>([\s\S]*?)(<br>)*<\/blockquote>/gim,
      "<blockquote>$1</blockquote>"
    )
  );
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
        thisChunk = generic.sanitizeHtml(thisChunk, []);
      } else {
        text = thisChunk.substring(lastSpace) + text;
        thisChunk = thisChunk.substring(0, lastSpace);
      }
    } else {
      //if text is less than limit symbols then process it and go out of the loop
      thisChunk = text;
      stop = true;
    }
    const thisChunkUntruncated = DOMPurify.sanitize(
      thisChunk.replace(/<a_href=/g, "<a href=")
    ).replace(/<a href=/g, "<a_href=");
    Chunks.push(thisChunkUntruncated);
    if (stop) break;
    let diff = diffTwo(thisChunkUntruncated, thisChunk);
    if (diff !== "") {
      // add opening tags
      diff = diff
        .split(/(?=<)/)
        .reverse()
        .map(i => i.replace("/", ""))
        .join("");
      text = DOMPurify.sanitize(diff + text);
    }
  }
  Chunks = Chunks.map(chunk => chunk.replace(/<a_href=/g, "<a href="));
  debug("generic")({ message: "html splitter: after", Chunks });

  return Chunks;
}

GetChunks.fallback = async (text: string, messenger: string) => {
  // text = await appendPageTitles(text);
  const limit = config[messenger].MessageLength || 400;
  let arrText: string[] = HTMLSplitter(text, limit);
  return arrText;
};

generic.downloadFile = async ({
  type,
  fileId,
  remote_path,
  extension
}: {
  type: string;
  fileId?: number;
  remote_path?: string;
  extension?: string;
}) => {
  const randomString = blalalavla.cupra(remote_path || fileId.toString());
  const randomStringName = blalalavla.cupra(
    (remote_path || fileId.toString()) + "1"
  );
  mkdir(`${process.env.HOME}/.${package_json.name}/files/${randomString}`);
  const rem_path = `${config.generic.httpLocation}/${randomString}`;
  const local_path = `${process.env.HOME}/.${package_json.name}/files/${randomString}`;

  let err: any, res: any;
  let rem_fullname: string = "";
  let local_fullname: string = "";
  if (type === "slack") {
    local_fullname = `${local_path}/${path.basename(remote_path)}`;
    [err, res] = await to(
      new Promise((resolve: any) => {
        try {
          let file = fs.createWriteStream(local_fullname);
          file
            .on("open", () => {
              const stream = request(
                {
                  method: "GET",
                  url: remote_path,
                  headers: {
                    Authorization: `Bearer ${config.slack.token}`
                  },
                  timeout: 3000
                },
                err => {
                  if (err) {
                    console.log(remote_path, err.toString());
                    resolve();
                  }
                }
              )
                .pipe(file)
                .on("finish", () => {
                  const rem_fullname = `${rem_path}/${path.basename(
                    remote_path
                  )}`;
                  resolve([rem_fullname, local_fullname]);
                })
                .on("error", (error: any) => {
                  console.error({
                    type: "streaming error",
                    path: remote_path,
                    error
                  });
                  resolve();
                });
            })
            .on("error", (error: any) => {
              console.error({
                type: "slack opening error",
                error
              });
            });
        } catch (error) {
          console.log({ type: "creation error", error });
        }
      })
    );
    if (res) [rem_fullname, local_fullname] = res;
  } else if (type === "simple") {
    if (extension) {
      extension = `.${extension}`;
    } else {
      extension = "";
    }
    const basename = path.basename(remote_path).split(/[\?#]/)[0] + extension;
    local_fullname = `${local_path}/${basename}`;
    await new Promise((resolve: any, reject: any) => {
      try {
        let file = fs.createWriteStream(local_fullname);
        file
          .on("open", () => {
            let stream = request({
              method: "GET",
              url: remote_path,
              timeout: 3000
            })
              .pipe(file)
              .on("finish", () => {
                rem_fullname = `${rem_path}/${basename}`;
                resolve();
              })
              .on("error", (error: any) => {
                console.error({
                  type: "streaming error",
                  path: remote_path,
                  error
                });
                resolve();
              });
          })
          .on("error", (error: any) => {
            console.error({
              type: "simple opening error",
              error,
              local_fullname
            });
          });
      } catch (error) {
        console.log({ type: "creation error", error });
      }
    });
  } else if (type === "telegram") {
    [err, local_fullname] = await to(
      generic.telegram.client.downloadFile(fileId, local_path)
    );
    if (!err) rem_fullname = `${rem_path}/${path.basename(local_fullname)}`;
  }
  if (err) {
    console.error({ remote_path, error: err, type: "generic" });
    return [remote_path || fileId, remote_path || fileId];
  }
  [err, res] = await to(
    new Promise((resolve: any) => {
      const newname = `${local_path}/${randomStringName}${path.extname(
        local_fullname
      )}`;
      fs.rename(local_fullname, newname, (err: any) => {
        if (err) {
          console.error({ remote_path, error: err, type: "renaming" });
          resolve();
        } else {
          rem_fullname = `${rem_path}/${path.basename(newname)}`;
          resolve([rem_fullname, newname]);
        }
      });
    })
  );
  if (!err) [rem_fullname, local_fullname] = res;
  if (![".webp", ".tiff"].includes(path.extname(local_fullname))) {
    return [rem_fullname, local_fullname];
  }
  const sharp = require("sharp");
  const jpgname = `${local_fullname
    .split(".")
    .slice(0, -1)
    .join(".")}.jpg`;
  [err, res] = await to(
    new Promise(resolve => {
      sharp(local_fullname).toFile(jpgname, (err: any, info: any) => {
        if (err) {
          console.error({
            type: "conversion",
            remote_path,
            error: err.toString()
          });
          resolve([rem_fullname, local_fullname]);
        } else {
          fs.unlink(local_fullname);
          resolve([
            `${rem_fullname
              .split(".")
              .slice(0, -1)
              .join(".")}.jpg`,
            jpgname
          ]);
        }
      });
    })
  );
  if (!err) [rem_fullname, local_fullname] = res;
  return [rem_fullname, local_fullname];
};

generic.sanitizeHtml = (
  text: string,
  allowedTags: string[] = [
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
    "del"
  ]
) => {
  return sanitizeHtml(text, {
    allowedTags,
    allowedAttributes: {
      a: ["href"]
    }
  });
};

generic.LocalizeString = ({
  messenger,
  channelId,
  localized_string_key,
  arrElemsToInterpolate
}: {
  messenger: string;
  channelId: string | number;
  localized_string_key: string;
  arrElemsToInterpolate: Array<Array<string>>;
}) => {
  try {
    const language =
      config?.channelMapping?.[messenger]?.[channelId]?.settings?.language ||
      "English";
    let template = localConfig[language][localized_string_key];
    const def_template = localConfig["English"][localized_string_key];
    if (!def_template) {
      console.log(`no ${localized_string_key} key specified in the dictionary`);
      return;
    }
    if (!template) template = def_template;
    for (const value of arrElemsToInterpolate)
      template = template
        .replace(new RegExp(`%${value[0]}%`, "gu"), value[1])
        .replace(/%%/g, "%");
    return template;
  } catch (err) {
    console.error(err);
  }
};

function catchError(err: any) {
  console.log(JSON.stringify(err));
}

//START
// get/set config
const [config, localConfig] = generic.ConfigBeforeStart();

// map channels & start listening
StartServices();

// start HTTP server for media files if configured to do so
if (config.generic.showMedia) {
  mkdir(`${process.env.HOME}/.${package_json.name}/files`);
  const serve = serveStatic(`${process.env.HOME}/.${package_json.name}/files`, {
    lastModified: false,
    index: false,
    maxAge: 86400000
  });
  const server = http.createServer((req: any, res: any) => {
    // if ((request.url || "").indexOf("/emailing/templates") === 0) {
    serve(req, res, finalhandler(req, res));
  });
  if (config.MessengersAvailable.webwidget) {
    webwidget = require("socket.io")(server);
    webwidget.Lojban1ChatHistory = [];
    webwidget.sockets.on("connection", (socket: any) => {
      socket.emit("history", webwidget.Lojban1ChatHistory);
    });
  }
  server.listen(config.generic.httpPort);
}
