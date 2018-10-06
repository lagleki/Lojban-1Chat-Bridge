var config = {};
module.exports = config;

config.generic = {
  // enable HTTP server which hosts sent media files, links to files are forwarded to IRC
  showMedia: true,
  // Add some randomness to url when realying media
  // Use 'lojbo' to generate blalalavla sequences. Use 0 to disable
  mediaRandomLength: 8,
  // HTTP server port
  httpPort: 9092,
  // HTTP server location or its forwarded by your local server address. Note: Telegram displays previews only for images at ports 80 and 443. Examples:
  // httpLocation: 'http://example.org:9092'
  // httpLocation: 'http://example.org:80/storage'
  httpLocation: ""
};

config.channels = [
  // example of a barebones IRC channel:
  // '#IRCChannel1' will be bridged to a Slack's SlackChannel1, Telegram group called 'Telegram Group 1'
  /*{
    irc: '#IRCChannel1',
    slack: 'SlackChannel1',
    telegram: 'title of Telegram Group 1'
  },
  {
      irc: '#IRCChannel1',
      irc-password: 'password',
      irc-readonly: true,
      slack: 'SlackChannel2',
      telegram: 'title of Telegram Group 2'
  },*/
];

//Facebook

config.facebook = {
  MessageLength: 2000
};
config.vkboard = {
  MessageLength: 4000
};
//Telegram
config.telegram = {
  //telegram user id to get bot actions updates
  // admins_userid: 123456,
  admins_userid: "",
  // paste the bot API token you got from BotFather here:
  // token: '012345678:ABCdefGHijkl-MNO_PQn0S65touFRfLNt1Q',
  token: "",
  // Age in seconds after which a Telegram message is not relayed, this prevents
  // spamming the IRC channel if your bot was offline for a long time
  maxMsgAge: 24 * 60 * 60,
  // formatting of Telegram usernames on IRC.
  // the following placeholders are available:
  //
  // - %firstName% (first name of sender)
  // - %lastName% (last name of sender)
  // - %username% (optional Telegram username of sender)
  nameFormat: "%username%",
  // fallback format string for %username% if sender lacks username
  usernameFallbackFormat: "%firstName% %lastName%",
  // types of actions to relay
  Actions: ["action", "topic", "error"],
  remove_added_bots: true,
  MessageLength: 4000
};

config.telegram.userMapping = {
  dirtyNick: "NickNotTobeAshamedOf"
};

//Slack
config.slack = {
  // token: 'xoxb-123456789000-1234567890004-abcdefghijklmNopqrstabD',
  token: "",
  // types of actions to relay
  Actions: ["action", "topic", "error"],
  MessageLength: 4000
};

//Mattermost
config.mattermost = {
  Actions: ["action", "topic", "error"],
  MessageLength: 4000
};

//IRC

config.irc = {
  // send IRC topic changes to other messengers
  sendTopic: true,
  // Colorizes nicks
  nickcolor: true,
  // palette_for_nickcolor: [['white'], ['lightgray', 'red'], ['blue', 'white']],
  // types of actions to relay
  Actions: ["action", "topic", "error"],
  ircServer: "irc.freenode.net",
  ircPerformCmds: [
    "NICKSERV identify myNick myPassword",
    "NICKSERV regain myNick",
    "NICKSERV set enforce on"
  ],
  // see https://node-irc.readthedocs.org/en/latest/API.html#client for
  // documentation
  ircOptions: {
    userName: "myNick",
    realName: "MessengerBridge Bot",
    nick: "myNick",
    password: "myPassword",
    port: 6667,
    localAddress: null,
    debug: false,
    showErrors: false,
    autoRejoin: true,
    autoConnect: true,
    channels: [], // don't fill this, there is config.channelMapping section for that
    secure: false,
    selfSigned: false,
    certExpired: false,
    floodProtection: true,
    floodProtectionDelay: 1000,
    sasl: false,
    stripColors: false,
    channelPrefixes: "&#!",
    messageSplit: 512
  },
  MessageLength: 190,
  sendPageTitles: true
};

config.spamfilter = {
  telegram:
    "^((%photo%|%document%).+(http|www\\.|работа|курьер|кошельк|\\bBTC\\b|bitcoin|qiwi)|[^\\/].*\\@[a-z_]+bot|.*(\\bt\\.me/|Hot Fast sex 100|([\\u0600-\\u06FF]+\\s?){2,}).*|@[a-z0-9_A-Z]+)$",
  telegram_forwarded_groups: "\\bsex\\b|\\bdating\\b|работа",
  irc:
    "This channel has moved to|This channel has been hacked|fentanyl|\\* zbagamumble|\\* topic for channel undefined"
};
