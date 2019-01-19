"use strict";
declare var process: {
  env: {
    NTBA_FIX_319: number;
    HOME: string;
  };
  argv: string[];
};
process.env.NTBA_FIX_319 = 1;
const lg = console.log.bind(console);
const package_json = require("../package");

// messengers' libs
const facebookLib = require("facebook-chat-api");

import * as Telegram from "node-telegram-bot-api";
const sanitizeHtml = require("sanitize-html");

const { VK } = require("vk-io");
const VkBot = require("node-vk-bot-api");

const { RTMClient, WebClient } = require("@slack/client");
const emoji = require("node-emoji");

const slackify = require("./formatting-converters/slackify-html");

const marked = require("marked");
const lexer = new marked.Lexer();
lexer.rules.list = { exec: () => {} };
lexer.rules.listitem = { exec: () => {} };

const html2md = require("./formatting-converters/html2md");

const Irc = require("irc-upd");
const ircolors = require("./formatting-converters/irc-colors");

const finalhandler = require("finalhandler");
const http = require("http");
const serveStatic = require("serve-static");

// syntactic sugar
const R = require("ramda");
const Queue = require("./sugar/promise-queue");
const { to } = require("await-to-js");
const { or } = require("./sugar/await-or.js");
const blalalavla = require("./sugar/blalalavla.js");
const UrlRegExp = new RegExp(
  "(?:(?:https?|ftp|file)://|www.|ftp.)(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:([-A-Z0-9+&@#/%=~_|$?!:,.]*)|[A-Z0-9+&@#/%=~_|$])",
  "igm"
);
const PageTitleRegExp = /(<\s*title[^>]*>(.+?)<\s*\/\s*title)>/gi;

// file system and network libs
const fs = require("fs-extra");
const path = require("path");
const mkdirp = require("mkdirp");
import * as request from "request";

// NLP & spam libs
// const lojban = require("lojban")

// global objects
let facebook: any,
  telegram: any,
  vkboard: any,
  slack: any,
  mattermost: any,
  irc: any;

let facebookStop: any;

let facebookErr: any;
facebookErr = new Proxy(
  {},
  {
    set: (target: any, prop: any, val: any): any => {
      if (facebookErr.enabled && facebookStop) {
        facebookErr.enabled = false;
        lg("stopping facebook...");
        setTimeout(() => {
          // facebookStop();
          lg("stopped facebook...");
          // StartService.facebook();
        }, 3000);
        lg("restarted facebook...");
      }
      return { enabled: false };
    }
  }
);

interface Json {
  [index: string]: string | boolean | RegExp;
}

interface IMessengerInfo {
  [x: string]: any;
}

type TextFormatConverterType = (x: string) => Promise<any>;

interface IMessengerFunctions {
  [x: string]: TextFormatConverterType;
}

interface Igeneric extends IMessengerInfo {
  LogToAdmin?: any;
  sendOnlineUsersTo?: any;
  GetChunks?: any;
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
  slack: {},
  mattermost: {},
  irc: {}
};

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

generic.vkboard.Start = async () => {
  const vkio = new VK();
  const vkbot = new VkBot({
    token: config.vkboard.token,
    group_id: config.vkboard.group_id
  });
  vkio.setOptions({
    app: config.vkboard.app,
    login: config.vkboard.login,
    password: config.vkboard.password
  });
  const [err, app] = await to(vkio.auth.implicitFlowUser().run());
  if (err) {
    console.error(err.toString());
  }
  return { io: vkio, bot: vkbot, app };
};

generic.slack.Start = async () => {
  const slack = {
    rtm: new RTMClient(config.slack.token),
    web: new WebClient(config.slack.token)
  };
  slack.rtm.start().catch((e: any) => {
    if (!R.path(["data", "ok"], e)) {
      config.MessengersAvailable.slack = false;
      return;
    }
  });
  return slack;
};

generic.mattermost.Start = async () => {
  let [err, res] = await to(
    new Promise((resolve, reject) => {
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
            reject();
          } else {
            resolve({
              token: R.pathOr("", ["headers", "token"], response),
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
    new Promise((resolve, reject) => {
      const user_id = config.mattermost.user_id;
      const url = `${
        config.mattermost.ProviderUrl
      }/api/v4/users/${user_id}/teams`;
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
            reject();
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
  if (err) {
    config.MessengersAvailable.mattermost;
    return;
  }

  const ReconnectingWebSocket = require("reconnecting-websocket");
  return new ReconnectingWebSocket(config.mattermost.APIUrl, [], {
    WebSocket: require("ws")
  });
};

function consoleErr(err: any) {
  console.error(err);
}
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
  } else if (author && author !== "") {
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
      arrElemsToInterpolate: [["chunk", chunk], ["title", title]]
    });
  }
  return chunk;
}

sendTo.facebook = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file
}: IsendToArgs) => {
  if (
    R.path(
      ["channelMapping", "facebook", channelId, "settings", "readonly"],
      config
    )
    || !facebook
  )
    return;
  queueOf.facebook.pushTask((resolve: any) => {
    setTimeout(() => {
      const jsonMessage: Json = {
        body: chunk
      };
      if (file) jsonMessage.attachment = fs.createReadStream(file);
      facebook.sendMessage(
        jsonMessage,
        channelId,
        (err: any, messageInfo: any) => {
          if (err) console.error(err);
          resolve();
        }
      );
    }, 500);
  });
};

sendTo.telegram = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file
}: IsendToArgs) => {
  if (
    R.path(
      ["channelMapping", "telegram", channelId, "settings", "readonly"],
      config
    )
  )
    return;
  queueOf.telegram.pushTask((resolve: any) => {
    telegram
      .sendMessage(channelId, chunk, {
        parse_mode: "HTML"
      })
      .then(() => resolve())
      .catch((err: any) => {
        generic.LogToAdmin(err.toString() + "<br/>\n" + chunk);
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
  file
}: IsendToArgs) => {
  if (
    R.path(
      ["channelMapping", "mattermost", channelId, "settings", "readonly"],
      config
    )
  )
    return;
  queueOf.mattermost.pushTask((resolve: any, reject: any) => {
    const option = {
      url: config.mattermost.HookUrl,
      json: {
        text: chunk,
        // username: author,
        channel: channelId
      }
    };
    const req = request.post(option, (error: any, response: any, body: any) => {
      if (error) reject();
      else resolve();
    });
  });
};

sendTo.vkboard = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file
}: IsendToArgs) => {
  if (
    R.path(
      ["channelMapping", "vkboard", channelId, "settings", "readonly"],
      config
    ) //|| !vk.WaitingForCaptcha
  )
    return;
  const token = vkboard.app.token;
  queueOf.vkboard.pushTask((resolve: any) => {
    setTimeout(() => {
      vkboard.bot
        .api("board.createComment", {
          access_token: token,
          group_id: config.vkboard.group_id,
          topic_id: channelId,
          message: chunk,
          from_group: 1
        })
        .then(() => {
          resolve();
        })
        .catch((err: any) => {
          console.log(err.toString());
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
          resolve();
        });
    }, 10000);
  });
};

async function myAwesomeCaptchaHandler() {}

sendTo.slack = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file
}: IsendToArgs) => {
  if (
    R.path(
      ["channelMapping", "slack", channelId, "settings", "readonly"],
      config
    )
  )
    return;
  queueOf.slack.pushTask((resolve: any) => {
    chunk = emoji.unemojify(chunk);
    slack.web.chat
      .postMessage({
        channel: channelId,
        username: author,
        text: chunk
      })
      .then(() => resolve())
      .catch((err: any) => {
        console.error(err);
        resolve();
      });
  });
};

sendTo.irc = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file
}: IsendToArgs) => {
  if (
    R.path(["channelMapping", "irc", channelId, "settings", "readonly"], config)
  )
    return;
  const ColorificationMode = R.pathOr(
    "color",
    ["channelMapping", "irc", channelId, "settings", "nickcolor"],
    config
  );
  author = ircolors.nickcolor(author || "", config.irc, ColorificationMode);
  queueOf.irc.pushTask((resolve: any) => {
    // if (config.irc.Actions.includes(action))
    //   chunk = ircolors.underline(chunk);
    irc.say(channelId, chunk);
    resolve();
  });
};

sendTo.irc_old = async ({
  channelId,
  author,
  chunk,
  action,
  quotation,
  file
}: IsendToArgs) => {
  if (
    R.path(["channelMapping", "irc", channelId, "settings", "readonly"], config)
  )
    return;
  const ColorificationMode = R.pathOr(
    "color",
    ["channelMapping", "irc", channelId, "settings", "nickcolor"],
    config
  );
  chunk = await convertTo["irc"](chunk);
  author = ircolors.nickcolor(author, config.irc, ColorificationMode);
  author = author ? `<${author}>: ` : "";
  if (quotation) author = "> " + author;
  queueOf.irc.pushTask((resolve: any) => {
    if (config.irc.Actions.includes(action)) chunk = `\x1D${chunk}\x1D`;
    irc.say(channelId, author + chunk);
    resolve();
  });
};

// sendFrom
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
  let arrChunks: string[] = await generic.GetChunks(text, messengerTo);
  for (let i in arrChunks) {
    if (edited)
      arrChunks[i] = generic.LocalizeString({
        messenger,
        channelId,
        localized_string_key: "OverlayMessageWithEditedMark",
        arrElemsToInterpolate: [["message", arrChunks[i]]]
      });
  }
  return arrChunks;
}

// sendFrom
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
  const ConfigNode = R.path(["channelMapping", messenger,channelId],config);
  if (!ConfigNode)
    return generic.LogToAdmin(
      `error finding assignment to ${messenger} channel with id ${channelId}`
    );
  if (!text || text === "") return;
  text = await convertFrom[messenger](text);
  for (const messengerTo of Object.keys(config.channelMapping)) {
    if (ConfigNode[messengerTo] && messenger !== messengerTo) {
      let thisToWhom: string = "";
      const ColorificationMode = R.pathOr(
        "color",
        ["channelMapping", "irc", channelId, "settings", "nickcolor"],
        config
      );
      if (messengerTo === "irc" && author) {
        author = ircolors.nickcolor(author, config.irc, ColorificationMode);
      }
      if (ToWhom) {
        if (messengerTo === "irc") {
          thisToWhom = `${ircolors.nickcolor(
            ToWhom,
            config.irc,
            ColorificationMode
          )}: `;
        } else thisToWhom = `${ToWhom}: `;
      }
      let textTo = await convertTo[messengerTo](text);
      let Chunks = await prepareChunks({
        messenger,
        channelId,
        text: textTo,
        edited,
        messengerTo
      });
      for (const i in Chunks) {
        const chunk = Chunks[i];
        Chunks[i] = await FormatMessageChunkForSending({
          messenger: messengerTo,
          channelId,
          title: config.vkboard.group_id,
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
          file
        });
      });
    }
  }
}

// receivedFrom
receivedFrom.facebook = async (message: any) => {
  if (!config.channelMapping.facebook) return;
  if (
    message.type !== "message" ||
    !R.path(["channelMapping", "facebook", message.threadID], config)
  )
    return;
  facebook.getUserInfo(message.senderID, (err: any, user: any) => {
    if (err) return console.error(err);
    const author = AdaptName.facebook(user[message.senderID]);
    if (message.body) {
      sendFrom({
        messenger: "facebook",
        channelId: message.threadID,
        author,
        text: message.body
      });
    }
    if (message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        //todo: add type="photo","width","height"
        if (attachment.type === "share") continue;
        generic
          .downloadFile({
            type: "simple",
            remote_path: attachment.url
          })
          .then(([file, localfile]: [string, string]) => {
            sendFrom({
              messenger: "facebook",
              channelId: message.threadID,
              author,
              text: file,
              file: localfile
            });
          });
      }
    }
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

// reconstructs the original raw markdown message
const reconstructMarkdown = (msg: Telegram.Message) => {
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
  message = reconstructMarkdown(message);
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
    message.edited = message.edit_date ? true : false;
    sendFrom({
      messenger: "telegram",
      channelId: message.chat.id,
      author,
      text,
      action,
      quotation,
      file: jsonMessage[el].local_file,
      edited: message.edited
    });
  }
}

receivedFrom.vkboard = async (message: any) => {
  if (!config.channelMapping.vkboard) return;
  const topic_id = message.topic_id;
  if (
    !config.channelMapping.vkboard[topic_id] ||
    message.topic_owner_id === message.from_id
  )
    return; // unknown topic || group owner sent the message
  let text = message.text;
  const fromwhomId = message.from_id;
  let [err, user] = await to(
    vkboard.bot.api("users.get", {
      user_ids: fromwhomId,
      access_token: config.vkboard.token,
      fields: "nickname,screen_name"
    })
  );
  if (err || !user.response || !user.response[0]) {
    user = fromwhomId;
  } else {
    user = user.response[0];
    user = AdaptName.vkboard(user);
  }

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
    const token = vkboard.app.token;
    for (const el of arrQuotes) {
      queueOf.vkboard.pushTask((resolve: any) => {
        const opts = {
          access_token: token,
          group_id: config.vkboard.group_id,
          topic_id,
          start_comment_id: el,
          count: 1,
          v: "5.84"
        };
        vkboard.bot
          .api("board.getComments", opts)
          .then((res: any) => {
            let text = R.path(["response", "items", 0, "text"], res);
            if (text) {
              let replyuser: string;
              const rg = new RegExp(
                `^\\[club${config.vkboard.group_id}\\|(.*?)\\]: (.*)$`
              );
              if (rg.test(text)) {
                [, replyuser, text] = text.match(rg);
              } else {
                //todo: vk.user.get
                replyuser = "";
              }
              sendFrom({
                messenger: "vkboard",
                channelId: topic_id,
                author: replyuser,
                text,
                quotation: true
              });
            }
            resolve();
          })
          .catch((err: any) => {
            console.error(err);
            resolve();
          });
      });
    }
  }
  queueOf.vkboard.pushTask((resolve: any) => {
    sendFrom({
      messenger: "vkboard",
      channelId: topic_id,
      author: user,
      text
    });
    resolve();
  });
};

receivedFrom.slack = async (message: any) => {
  if (!config.channelMapping.slack) return;
  if (
    (message.subtype &&
      !["me_message", "channel_topic", "message_changed"].includes(
        message.subtype
      )) ||
    slack.rtm.activeUserId === message.user
  )
    return;

  if (!message.user && message.message) {
    if (!message.message.user) return;
    message.user = message.message.user;
    message.text = message.message.text;
  }
  message.edited = message.subtype === "message_changed" ? true : false;

  const promUser = slack.web.users.info({
    user: message.user
  });
  const promChannel = slack.web.channels.info({
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
  const channelId = R.pathOr(message.channel, ["channel", "name"], chan);

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
        edited: message.edited
      });
    });
  if (message.text && !message.topic) {
    sendFrom({
      messenger: "slack",
      channelId,
      author,
      text: message.text,
      action,
      edited: message.edited
    });
  }
};

receivedFrom.mattermost = async (message: any) => {
  if (!config.channelMapping.mattermost) return;
  if (R.path(["data", "team_id"], message) !== config.mattermost.team_id)
    return; // unknown team
  if (R.path(["event"], message) === "post_edited") {
    message.event = "posted";
    message.edited = true;
  } else {
    message.edited = false;
  }
  if (R.path(["event"], message) !== "posted") return;
  const post = R.path(["data", "post"], message);
  if (post) {
    const postParsed = JSON.parse(post);
    const channelId = R.path(["data", "channel_name"], message);
    if (
      config.channelMapping.mattermost[channelId] &&
      !R.path(["props", "from_webhook"], postParsed) &&
      R.path(["type"], postParsed) === ""
    ) {
      //now await for file_ids array downloads
      const file_ids = R.pathOr([], ["file_ids"], postParsed);
      let files = [];
      for (const file of file_ids) {
        const [err, promfile] = await to(
          new Promise((resolve, reject) => {
            const url = `${
              config.mattermost.ProviderUrl
            }/api/v4/files/${file}/link`;
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
                  reject();
                } else {
                  resolve(JSON.parse(body).link);
                }
              }
            );
          })
        );
        const [err2, promfile2] = await to(
          new Promise((resolve, reject) => {
            const url = `${
              config.mattermost.ProviderUrl
            }/api/v4/files/${file}/info`;
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
                  reject();
                } else {
                  resolve(JSON.parse(body).extension);
                }
              }
            );
          })
        );
        if (!err && !err2) files.push([promfile2, promfile]);
        if (err) console.error(err);
      }
      const author = R.path(["data", "sender_name"], message);
      if (files.length > 0) {
        for (const [extension, file] of files) {
          const [file_, localfile]: [
            string,
            string
          ] = await generic.downloadFile({
            type: "simple",
            remote_path: file,
            extension
          });
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
      sendFrom({
        messenger: "mattermost",
        channelId,
        author,
        text: R.path(["message"], postParsed),
        action,
        edited: message.edited
      });
    }
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
  if (!config.channelMapping.irc) return;
  if (type === "message") {
    if (text.search(new RegExp(config.spamremover.irc.source, "i")) >= 0)
      return;
    text = ircolors.stripColorsAndStyle(text);
    text = `<${ircolors
      .stripColorsAndStyle(author)
      .replace(/_+$/g, "")}>: ${text}`
      .replace(/^<.*?>: <([^>]*?)> ?: /, "*$1*: ")
      .replace(/^<.*?>: &lt;([^>]*?)&gt; ?: /, "*$1*: ")
      .replace(/^<(.*?)>: /, "*$1*: ")
      .replace(/^\*(.*?)\*: /, "<b>$1</b>: ");
    [, author, text] = text.match(/^<b>(.*?)<\/b>: (.*)/);
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
AdaptName.facebook = (user: any) => user.name; // || user.vanity || user.firstName;
AdaptName.telegram = (name: string) =>
  config.telegram.userMapping[name] || name;
AdaptName.vkboard = (user: any) => {
  let full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  if (full_name === "") full_name = undefined;
  return full_name || user.nickname || user.screen_name || user.id;
};
AdaptName.slack = (user: any) =>
  R.path(["user", "profile", "display_name"], user) ||
  R.path(["user", "real_name"], user) ||
  R.path(["user", "name"], user);

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

convertFrom.facebook = async (text: string) => generic.escapeHTML(text);
convertFrom.telegram = async (text: string) => marked.parser(lexer.lex(text));
convertFrom.vkboard = async (text: string) =>
  generic.escapeHTML(text).replace(/\[[^\]]*\|(.*?)\](, ?)?/g, "");
convertFrom.slack = async (text: string) => {
  const RE_ALPHANUMERIC = new RegExp("^\\w?$"),
    RE_TAG = new RegExp("<(.+?)>", "g"),
    RE_BOLD = new RegExp("\\*([^\\*]+?)\\*", "g"),
    RE_ITALIC = new RegExp("_([^_]+?)_", "g"),
    RE_FIXED = new RegExp("`([^`]+?)`", "g");

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
      const charAtLeft = match.input.substr(match.index - 1, 1);
      prefix_ok =
        notAlphanumeric(charAtLeft) && notRepeatedChar(trigger, charAtLeft);
    }

    if (!postfix_ok) {
      const charAtRight = match.input.substr(match.index + match[0].length, 1);
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
        slack.web.conversations.info({ channel: channelId })
      );
      if (!err) jsonChannels[channelId] = channel.name;
    }
    for (const userId of Object.keys(jsonUsers)) {
      const [err, { user }] = await to(slack.web.users.info({ user: userId }));
      jsonUsers[userId] = AdaptName.slack(user);
    }
    return (
      emoji
        .emojify(text)
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
  const [err, str] = await to(publicParse(text));
  return str || text;
};
convertFrom.mattermost = async (text: string) => marked.parser(lexer.lex(text));
convertFrom.irc = async (text: string) =>
  generic
    .escapeHTML(text)
    .replace(/\b\*(\w+)\*\b/g, "<b>$1</b>")
    .replace(/\b_(\w+)_\b/g, "<i>$1</i>");

async function convertToPlainText(text: string) {
  const a = await generic.unescapeHTML(
    text
      .replace(/<b>(\w)<\/b>/g, "*$1*")
      .replace(/<i>(\w)<\/i>/g, "_$1_")
      .replace(/<br\/?>/gi, "\n")
      .replace(/<a.*?href="(.+?)".*?>(.+?)<\/a>/gi, (...arr) => {
        const url = arr[1];
        // const name = arr[2];
        // if (url !== name) return `${name} (${url})`;
        return " " + url;
      })
      .replace(/<(?:.|\s)*?>/g, "")
      .trim(),
    true
  );
  return a;
}

convertTo["facebook"] = async (text: string) => convertToPlainText(text);
convertTo["telegram"] = async (text: string) => {
  const a = generic.sanitizeHtml(text);
  return a;
};
convertTo["vkboard"] = async (text: string) => await convertToPlainText(text);
convertTo["slack"] = async (text: string) => slackify(text);
convertTo["mattermost"] = async (text: string) => html2md.convert(text);
convertTo["irc"] = async (text: string) => await convertToPlainText(text);

// generic.telegram
generic.telegram.serveFile = (fileId: number) =>
  generic.downloadFile({
    type: "telegram",
    fileId
  });

generic.writeCache = async (origin: string) => {
  await new Promise((resolve, reject) => {
    fs.writeFile(
      `${process.env.HOME}/.${package_json.name}/cache.json`,
      JSON.stringify(config.cache),
      (err: any) => {
        if (err) {
          console.log`error while storing chat ID:`;
          console.log`${err}`;
          reject();
        } else {
          console.log(
            `successfully stored chat ID in ~/.${
              package_json.name
            }/cache.json, ${origin}`
          );
          resolve();
        }
      }
    );
  });
};

async function TelegramRemoveSpam(message: Telegram.Message) {
  const cloned_message = JSON.parse(JSON.stringify(message));
  if (IsSpam(cloned_message)) {
    if (message.text && message.text.search(/\bt\.me\b/) >= 0) {
      const [err, chat] = await to(telegram.getChat(message.chat.id));
      if (!err) {
        const invite_link = chat.invite_link;
        cloned_message.text = cloned_message.text.replace(invite_link, "");
        if (IsSpam(cloned_message))
          generic.telegram.DeleteMessage({ message, log: true });
      } else {
        generic.LogToAdmin(
          `error ${err} on getting an invite link of the chat ${
            message.chat.id
          } ${message.chat.title}`
        );
      }
    } else {
      const [err, chat] = await to(telegram.getChat(cloned_message.chat.id));
      if (!err) {
        generic.telegram.DeleteMessage({ message, log: true });
      } else {
        generic.LogToAdmin(
          `error ${err} on getting an invite link of the chat ${
            cloned_message.chat.id
          } ${cloned_message.chat.title}`
        );
      }
    }
    return true;
  }
  return;

  // dealing with non-lojban spam
  // if (message.chat.title === 'jbosnu' && message.text) {
  //   const arrText = message.text.split(" ");
  //   const xovahe = arrText.filter(i => lojban.ilmentufa_off("lo'u " + i + " le'u").tcini === "snada").length / arrText.length;
  //   if (xovahe < 0.5) {
  //     telegram.sendMessage(
  //       channel.id,
  //       ".i mi smadi le du'u do na tavla fo su'o lojbo .i ja'e bo mi na benji di'u fi la IRC\n\nIn this group only Lojban is allowed. Try posting your question to [#lojban](https://t.me/joinchat/BLVsYz3hCF8mCAb6fzW1Rw) or [#ckule](https://telegram.me/joinchat/BLVsYz4hC9ulWahupDLovA) (school) group", {
  //         reply_to_message_id: message.message_id,
  //         parse_mode: "Markdown"
  //       }
  //     ).catch((e) => console.log(e.toString()));
  //     return;
  //   }
  // }
}

function TelegramRemoveAddedBots(message: Telegram.Message) {
  if (config.telegram.remove_added_bots)
    R.pathOr([], ["new_chat_members"], message).map((u: Telegram.User) => {
      if (u.is_bot && R.path(["telegram", "myUser", "id"], config) !== u.id)
        telegram.kickChatMember(message.chat.id, u.id).catch(catchError);
    });
}

function TelegramRemoveNewMemberMessage(message: Telegram.Message) {
  if (
    message.left_chat_member ||
    R.pathOr([], ["new_chat_members"], message).filter(
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
    !R.path(["chat", "id"], message) ||
    !R.path(["telegram", "myUser", "id"], config)
  )
    return;
  let [err, res] = await to(
    telegram.getChatMember(message.chat.id, config.telegram.myUser.id)
  );
  if (res && !res.can_delete_messages) {
    [err, res] = await to(telegram.leaveChat(message.chat.id));
    generic.LogToAdmin(`leaving chat ${message.chat.id} ${message.chat.title}`);
    config.cache.telegram[message.chat.title] = undefined;
    await to(
      generic.writeCache(
        `(leaving chat ${message.chat.title}, id: ${message.chat.id})`
      )
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
  await to(telegram.deleteMessage(message.chat.id, message.message_id));
};

// generic
generic.ConfigBeforeStart = () => {
  if (process.argv[2] === "--genconfig") {
    mkdirp(`${process.env.HOME}/.${package_json.name}`);

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
    generic.writeCache(`(new channel ${channelName}, id: ${channelId})`)
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
  let [err, res] = await to(slack.web.channels.list());
  if (err) {
    console.error(err);
  }
  res = R.pathOr([], ["channels"], res);
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
  let url: string = `${config.mattermost.ProviderUrl}/api/v4/teams/${
    config.mattermost.team_id
  }/channels`;
  json = await GetChannelsMattermostCore(json, url);
  url = `${config.mattermost.ProviderUrl}/api/v4/users/${
    config.mattermost.user_id
  }/teams/${config.mattermost.team_id}/channels`;
  json = await GetChannelsMattermostCore(json, url);
  config.cache.mattermost = json;
  return json;
};

async function GetChannelsMattermostCore(json: Json, url: string) {
  await to(
    new Promise((resolve, reject) => {
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
            reject();
          } else {
            body = JSON.parse(body);
            if (body[0]) {
              body.map((i: any) => {
                json[i.display_name] = i.name;
              });
              resolve();
            } else reject();
          }
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
  const arrMappingKeys: Json = {
    facebook: "facebook",
    telegram: "telegram",
    vkboard: "vkboard",
    slack: "slack",
    mattermost: "mattermost",
    irc: "irc"
  };
  config.channels.map((i: any) => {
    let i_mapped = i[messenger];
    if (config.cache[messenger])
      i_mapped = R.path(["cache", messenger, i[messenger]], config);
    if (!i_mapped) return;
    const mapping: any = {
      settings: {
        readonly: i[`${messenger}-readonly`],
        language: i["language"],
        nickcolor: i[`${messenger}-nickcolor`],
        name: i[messenger]
      }
    };
    for (const key of Object.keys(arrMappingKeys)) {
      if (config.cache[key]) {
        const val = R.path(["cache", key, i[key]], config);
        mapping[key] = val;
      } else {
        mapping[key] = i[key];
      }
    }
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

  await PopulateChannelMappingCore({ messenger: "facebook" });
  await PopulateChannelMappingCore({ messenger: "telegram" });
  await PopulateChannelMappingCore({ messenger: "vkboard" });
  await PopulateChannelMappingCore({ messenger: "slack" });
  await PopulateChannelMappingCore({ messenger: "mattermost" });
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
    if (i.slack) config.MessengersAvailable.slack = true;
    if (i.mattermost) config.MessengersAvailable.mattermost = true;
    if (i.irc) config.MessengersAvailable.irc = true;
  });
  if (
    !R.path(["facebook", "email"], config) ||
    config.facebook.login === "" ||
    !R.path(["facebook", "password"], config) ||
    config.facebook.password === ""
  )
    config.MessengersAvailable.facebook = false;
  if (!R.path(["telegram", "token"], config) || config.telegram.token === "")
    config.MessengersAvailable.telegram = false;
  if (
    R.pathOr("", ["vkboard", "token"], config) === "" ||
    R.pathOr("", ["vkboard", "group_id"], config) === "" ||
    R.pathOr("", ["vkboard", "login"], config) === "" ||
    R.pathOr("", ["vkboard", "password"], config) === ""
  )
    config.MessengersAvailable.vkboard = false;
};

StartService.facebook = async () => {
  //facebook
  if (config.MessengersAvailable.facebook) {
    queueOf.facebook = new Queue({
      autoStart: true,
      concurrency: 1
    });
    facebookLib(
      { email: config.facebook.email, password: config.facebook.password },
      { forceLogin: true, logLevel: "warn", listenEvents: false },
      (err: any, api: any) => {
        if (err) {
          // config.MessengersAvailable.facebook = false;
          console.error(err);
          setTimeout(() => {
            // facebookStop();
            lg("stopped facebook...");
            // return StartService.facebook();
            // StartService.facebook();
          }, 3000);
        } else {
          config.MessengersAvailable.facebook = true;
          facebook = api;
          facebookStop = facebook.listen((err: any, message: any) => {
            if (err) {
              // config.MessengersAvailable.facebook = false;
              // facebookErr.enabled = true;
              // facebookStop();
              // setTimeout(() => {
              //   // facebookStop();
              //   lg("stopped facebook...");
              //   return StartService.facebook();
              //   // StartService.facebook();
              // }, 3000);
            } else {
              config.MessengersAvailable.facebook = true;
              receivedFrom.facebook(message);
            }
          });
        }
      }
    );
  }
};

StartService.telegram = async () => {
  //telegram
  if (config.MessengersAvailable.telegram) {
    telegram = generic.telegram.Start();
    queueOf.telegram = new Queue({
      autoStart: true,
      concurrency: 1
    });
    telegram.on("message", (message: any) => {
      receivedFrom.telegram(message);
    });
    telegram.on("edited_message", (message: any) => {
      receivedFrom.telegram(message);
    });
    telegram.on("polling_error", (error: any) => {
      if (
        error.code === "ETELEGRAM" &&
        error.response.body.error_code === 404
      ) {
        config.MessengersAvailable.telegram = false;
        telegram.stopPolling();
      }
    });
    const [err, res] = await to(telegram.getMe());
    if (!err) config.telegram.myUser = res;
  }
};

StartService.vkboard = async () => {
  //vkboard
  if (config.MessengersAvailable.vkboard) {
    vkboard = await generic.vkboard.Start();
    queueOf.vkboard = new Queue({
      autoStart: true,
      concurrency: 1
    });
    vkboard.bot.event("board_post_new", async (ctx: any) => {
      receivedFrom.vkboard(ctx.message);
    });
    vkboard.bot.startPolling();
  }
};

StartService.slack = async () => {
  //slack
  slack = await generic.slack.Start();
  if (config.MessengersAvailable.slack) {
    queueOf.slack = new Queue({
      autoStart: true,
      concurrency: 1
    });
    slack.rtm.on("message", (msg: any) => {
      receivedFrom.slack(msg);
    });
  }
};

StartService.mattermost = async () => {
  //mattermost
  mattermost = await generic.mattermost.Start();
  if (config.MessengersAvailable.mattermost) {
    queueOf.mattermost = new Queue({
      autoStart: true,
      concurrency: 1
    });
    mattermost.addEventListener("open", () => {
      mattermost.send(
        JSON.stringify({
          seq: 1,
          action: "authentication_challenge",
          data: {
            token: config.mattermost.token
          }
        })
      );
    });
    mattermost.addEventListener("message", (message: any) => {
      if (!R.path(["data"], message) || !config.mattermost.team_id) return;
      message = JSON.parse(message.data);
      receivedFrom.mattermost(message);
    });
    mattermost.addEventListener(
      "close",
      () => mattermost._shouldReconnect && mattermost._connect()
    );
  }
};

StartService.irc = async () => {
  //irc
  irc = new Irc.Client(
    config.irc.ircServer,
    config.irc.ircOptions.nick,
    config.irc.ircOptions
  );
  if (config.MessengersAvailable.irc) {
    queueOf.irc = new Queue({
      autoStart: true,
      concurrency: 1
    });
    irc.on("error", (error: any) => {
      receivedFrom.irc({
        error,
        type: "error"
      });
      // StartService.irc();
    });

    irc.on("registered", () => {
      receivedFrom.irc({
        handler: irc,
        type: "registered"
      });
    });

    irc.on("message", (author: string, channelId: string, text: string) => {
      receivedFrom.irc({
        author,
        channelId,
        text,
        type: "message"
      });
    });

    irc.on("topic", (channelId: string, topic: string, author: string) => {
      receivedFrom.irc({
        author,
        channelId,
        text: topic,
        type: "topic"
      });
    });

    irc.on("action", (author: string, channelId: string, text: string) => {
      receivedFrom.irc({
        author,
        channelId,
        text,
        type: "action"
      });
    });
  }
};

async function StartServices() {
  generic.MessengersAvailable();
  if (!config.channelMapping) config.channelMapping = {};

  await StartService.facebook();
  await StartService.telegram();
  await StartService.vkboard();
  await StartService.slack();
  await StartService.mattermost();
  await StartService.irc();

  await generic.PopulateChannelMapping();
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
      irc.chans[R.path(["channelMapping", "telegram", channel, "irc"], config)];

    if (!objChannel) return;

    let names: string[] = Object.keys(objChannel.users);

    names.forEach((name, i) => {
      names[i] = (objChannel.users[name] || "") + names[i];
    });
    names.sort();
    const strNames = `Users on ${objChannel.ircChan}:\n\n${names.join(", ")}`;

    telegram
      .sendMessage(objChannel.id, strNames)
      .catch((e: any) => console.log(e.toString()));
  }
};

generic.LogMessageToAdmin = async (message: Telegram.Message) => {
  if (config.telegram.admins_userid)
    await to(
      telegram.forwardMessage(
        config.telegram.admins_userid,
        message.chat.id,
        message.message_id
      )
    );
};

generic.LogToAdmin = (msg_text: string) => {
  if (config.telegram.admins_userid)
    telegram
      .sendMessage(
        config.telegram.admins_userid,
        generic.escapeHTML(msg_text.toString()),
        {
          parse_mode: "HTML"
        }
      )
      .catch((e: any) => console.log(e.toString()));
};

generic.escapeHTML = (arg: string) =>
  arg
    .replace(/&(?![a-zA-Z0-9#]{1,7};)/g, "&amp;")
    // .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/'/g, "&#039;");

// generic.unescapeHTML = (arg: string) =>
//   arg
//     .replace(/&amp;/g, "&")
//     .replace(/&lt;/g, "<")
//     .replace(/&gt;/g, ">")
//     .replace(/&quot;/g, '"')
//     .replace(/&apos;/g, "'")
//     .replace(/(&#039;|&#39;)/g, "'");

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
  apos: "'"
};
generic.unescapeHTML = (str: string, convertHtmlEntities: boolean) => {
  return str.replace(/\&([^;]+);/g, (entity: string, entityCode: string) => {
    let match: any;

    if (convertHtmlEntities && htmlEntities[entityCode]) {
      return htmlEntities[entityCode];
      /*eslint no-cond-assign: 0*/
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16));
      /*eslint no-cond-assign: 0*/
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(~~match[1]);
    } else {
      return entity;
    }
  });
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
//           new Promise((resolve, reject) => {
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

generic.GetChunks = async (text: string, messenger: string) => {
  // text = await appendPageTitles(text);
  const limit = config[messenger].MessageLength || 400;
  const r = new RegExp(`(.{${limit - 40},${limit}})(?= )`, "g");
  const arrText: string[] = text
    .replace(r, "$1\n")
    .split(/\n/)
    .reduce((acc: string[], i: string) => {
      if (Buffer.byteLength(i, "utf8") > limit) {
        const arrI: string[] = i.split(/(?=<a href="https?:\/\/)/gu);
        acc = acc.concat(arrI);
      } else acc.push(i);
      return acc;
    }, [])
    .reduce((acc: string[], i: string) => {
      if (Buffer.byteLength(i, "utf8") > limit) {
        const arrI: string[] = splitSlice(i, limit);
        acc = acc.concat(arrI);
      } else acc.push(i);
      return acc;
    }, [])
    .filter((i: string) => i !== "");
  // const a = arrText
  //   .map((i: string) => generic.unescapeHTML(i, false));
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
  mkdirp(`${process.env.HOME}/.${package_json.name}/files/${randomString}`);
  const rem_path = `${config.generic.httpLocation}/${randomString}`;
  const local_path = `${process.env.HOME}/.${
    package_json.name
  }/files/${randomString}`;

  let err: any;
  let rem_fullname: string;
  let local_fullname: string;
  if (type === "slack") {
    [err, [rem_fullname, local_fullname]] = await to(
      new Promise((resolve, reject) => {
        const local_fullname = `${local_path}/${path.basename(remote_path)}`;
        const stream = request(
          {
            method: "GET",
            url: remote_path,
            headers: {
              Authorization: `Bearer ${config.slack.token}`
            }
          },
          err => {
            if (err) {
              console.log(err.toString());
              reject();
            }
          }
        ).pipe(fs.createWriteStream(local_fullname));

        stream.on("finish", () => {
          const rem_fullname = `${rem_path}/${path.basename(remote_path)}`;
          resolve([rem_fullname, local_fullname]);
        });
        stream.on("error", (e: any) => {
          console.error(e);
          reject();
        });
      })
    );
  } else if (type === "simple") {
    [err, [rem_fullname, local_fullname]] = await to(
      new Promise((resolve, reject) => {
        if (extension) {
          extension = `.${extension}`;
        } else {
          extension = "";
        }
        const basename =
          path.basename(remote_path).split(/[\?#]/)[0] + extension;
        const local_fullname = `${local_path}/${basename}`;
        const stream = request(
          {
            method: "GET",
            url: remote_path
          },
          (err: any) => {
            if (err) {
              console.log(err.toString(), remote_path);
              reject(err.toString());
            }
          }
        ).pipe(fs.createWriteStream(local_fullname));

        stream.on("finish", () => {
          const rem_fullname = `${rem_path}/${basename}`;
          resolve([rem_fullname, local_fullname]);
        });
        stream.on("error", (err: any) => {
          console.log(err.toString());
          resolve([rem_fullname, local_fullname]);
          // reject(err.toString());
        });
      })
    );
  } else if (type === "telegram") {
    [err, local_fullname] = await to(telegram.downloadFile(fileId, local_path));
    if (!err) rem_fullname = `${rem_path}/${path.basename(local_fullname)}`;
  }
  if (err) {
    console.error(err);
    return [remote_path || fileId, remote_path || fileId];
  }
  let notrenamed = [rem_fullname, local_fullname];
  [err, [rem_fullname, local_fullname]] = await to(
    new Promise((resolve, reject) => {
      const newname = `${local_path}/${randomStringName}${path.extname(
        local_fullname
      )}`;
      fs.rename(local_fullname, newname, (err: any) => {
        if (err) {
          console.error(err);
          reject();
        } else {
          rem_fullname = `${rem_path}/${path.basename(newname)}`;
          resolve([rem_fullname, newname]);
        }
      });
    })
  );
  if (err) [rem_fullname, local_fullname] = notrenamed;
  if (![".webp", ".tiff"].includes(path.extname(local_fullname))) {
    return [rem_fullname, local_fullname];
  }
  const sharp = require("sharp");
  const jpgname = `${local_fullname
    .split(".")
    .slice(0, -1)
    .join(".")}.jpg`;
  notrenamed = [rem_fullname, local_fullname];
  [err, [rem_fullname, local_fullname]] = await to(
    new Promise((resolve, reject) => {
      sharp(local_fullname).toFile(jpgname, (err: any, info: any) => {
        if (err) {
          console.error(err.toString());
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
  if (err) [rem_fullname, local_fullname] = notrenamed;
  return [rem_fullname, local_fullname];
};

generic.sanitizeHtml = (text: string) => {
  return sanitizeHtml(text, {
    allowedTags: ["b", "i", "code", "pre", "a", "em"],
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
    const language = R.pathOr(
      "English",
      ["channelMapping", messenger, channelId, "settings", "language"],
      config
    );
    let template = localConfig[language][localized_string_key];
    const def_template = localConfig["English"][localized_string_key];
    if (!def_template) {
      console.log(`no ${localized_string_key} key specified in the dictionary`);
      return;
    }
    if (!template) template = def_template;
    for (const value of arrElemsToInterpolate)
      template = template.replace(new RegExp(`%${value[0]}%`, "gu"), value[1]);
    return template;
  } catch (err) {
    console.error(err);
  }
};

function catchError(err: any) {
  console.log(err);
}

//START
// get/set config
const [config, localConfig] = generic.ConfigBeforeStart();

// map channels & start listening
StartServices();

// start HTTP server for media files if configured to do so
if (config.generic.showMedia) {
  mkdirp(`${process.env.HOME}/.${package_json.name}/files`);
  const serve = serveStatic(`${process.env.HOME}/.${package_json.name}/files`, {
    lastModified: false,
    index: false,
    maxAge: 86400000
  });

  // Create server
  const server = http.createServer(function onRequest(req: any, res: any) {
    serve(req, res, finalhandler(req, res));
  });

  // Listen
  server.listen(config.generic.httpPort);
}

// p.p1 = 'v1'; // this will log o, "p1", "v1"
// o.p2 = 'v2'; /

// global var
// call function, itchecks for global var value, if different then stopListening and reboot facebook
