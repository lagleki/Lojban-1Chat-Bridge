const config = {};
module.exports = config;

config.piers = {
  //Discord messenger:
  discord_1: {
    Actions: ["action"],
    /*
    create a Discord bot,
    add it to your server (group of channels)
    only one server per pier is supported, if you want to bridge several Discord servers create a pier for each server
    * open https://discord.com/developers/applications
    * create a new bot
    * open 'OAuth2' -> 'URL Generator' -> select 'bot' -> select 'Manage webhooks', 'Send messages', 'Attach files', 
    * use the resulting invite link and send it to the admin of the Discord server to invite the bot
    * open 'Oauth2' -> 'General' and fill the credentials:
    */
    client: "", // Client ID
    token: "", // Client secret
    /* 
    fill in the ID of the server.
    E.g. if your groups look like https://discordapp.com/channels/123498134853750762/1230785752112867346
    then your guildId is 123498134853750762 (the first of the two numbers) 
    */
    guildId: "",
  },
  //reading messages from an HTTP endpoint:
  webwidget_1: {
    //websocket dtream of messages into external services
    historyLength: 200, ///how many of them to store
  },
  // MAX (VK MAX Messenger) — https://dev.max.ru/docs — uses @maxhub/max-bot-api (long polling)
  max_1: {
    /*
      1. Create a bot (e.g. Master Bot at https://max.ru/masterbot) and paste the token below.
      2. Add the bot to each MAX chat you bridge.
      3. In config.new_channels, set max_1 to the chat title (after cache is filled) or to the numeric chat_id string.
      4. One MAX chat_id maps to one relay row — same idea as one Telegram group/topic or one Discord channel.
    */
    token: "",
    // Drop inbound MAX messages older than this many seconds (0 = no limit). Similar to telegram_1.maxMsgAge.
    maxMsgAge: 24 * 60 * 60,
    Actions: ["action"],
  },
  //Telegram messenger:
  telegram_1: {
    /*
      1. create a bot using https://t.me/botfather
      2. Use the `/setprivacy` command with `BotFather` to allow your bot to see all messages in your group (NOTE on usage: bot name is preceded by symbol `@`)
      3. add your bot to all your Telegram groups 
      4. make your bot an admin there so that it can remove spam
      5. after starting the bridge send any message in each of the Telegram groups so that the bridge can both accept and send messages
      6. You can change your Telegram Bot's profile picture with the `/setuserpic` BotFather command  
      7. If a group has topics see examples below 
    */
    admins_userid: 0, //telegram user id to get bot actions updates
    token: "128026086", // paste the bot API token you got from t.me/BotFather here:
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
    Actions: ["action"],
    userMapping: {
      one: "one_alias",
    },
  },
  //Slack messenger:
  slack_1: {
    // Bot User OAuth Token (xoxb-...) from https://api.slack.com/apps -> Your App -> OAuth & Permissions (after installing the app to the workspace).
    // This bridge uses @slack/rtm-api (RTM WebSocket) + @slack/web-api. Typical bot scopes include: chat:write, channels:read, groups:read, users:read, files:read, mpim:read (add others if your mapping needs them).
    // RTM is not available to all modern granular-only Slack apps; if the bridge logs RTM/start failures, check Slack's RTM + legacy-app notes in README.md and the @slack/rtm-api package readme.
    // Invite the bot into each Slack channel listed in channelMapping for this pier.
    token: "xoxb-12......",
    Actions: ["action"],
  },
  //Mattermost messenger:
  mattermost_1: {
    // 1. Add a webhook
    // 2. Add your bot to each channel (otherwise your message won't go from Mattermost anywhere)
    // 3. check if the bot is only in the channels you need (so that the performance of your script would be optimal)
    ProviderUrl: "https://framateam.org",
    HookUrl: "https://framateam.org/hooks/w7hkkookokok", //find in Mattermost admin GUI
    APIUrl: "wss://framateam.org/api/v4/websocket",
    team: "test",
    login: "a@example.com", //email
    password: "my_password", //password,
    Actions: ["action"],
  },

  //VK discussion board:
  vkboard_1: {
    token:
      "1dec5e308a554e004eb9931d39a41a8661a6d483916bd6e089b581e275c44ca0d13f3f3fbc64ebe602085", //Open your group => Manage => API => Create (token) => provide maximum permissions
    group_id: "123456", //vk.com group ID
    appId: "123456", //id of your vk.com app
    login: "1@example.com", //your vk.com email or phone
    password: "my_password", //your vk.com password
    Actions: ["action"],
  },
  // VK community messages (Bot / Long Poll): DMs and group chats where the community bot is invited.
  // https://dev.vk.com/ru/api/bots/getting-started — enable bot features and "allow adding community to chats".
  // For a full two-way bridge in a chat, a chat admin must grant the bot access to all messages (not only @mentions).
  // channelMapping key is peer_id (string), e.g. "2000000123" for a multi-user chat; use exact title from cache or numeric peer in new_channels.
  vkchat_1: {
    token:
      "1dec5e308a554e004eb9931d39a41a8661a6d483916bd6e089b581e275c44ca0d13f3f3fbc64ebe602085", // community access token with messages scope (Manage → API → key)
    group_id: "123456", // positive VK group id (same community as the token)
    // apiVersion: "5.199", // optional; default in code if omitted
    maxMsgAge: 24 * 60 * 60, // ignore inbound VK messages older than this many seconds (0 = no limit)
    Actions: ["action"],
  },
  //VK discussion wall:
  vkwall_1: {
    token:
      "1dec5e308a554e004eb9931d39a41a8661a6d483916bd6e089b581e275c44ca0d13f3f3fbc64ebe602085",
    group_id: "123456",
    appId: "123456",
    login: "1@example.com",
    password: "my_password",
    Actions: ["action"],
  },
  // IRC messaging:
  irc_1: {
    // send IRC topic changes to other messengers
    sendTopic: true,
    // Colorizes nicks
    nickcolor: true,
    ircServer: "irc.freenode.net",
    ircPerformCmds: [
      "NICKSERV identify bridge_ my_password", //register a new user on IRC with a password and change everywhere here "bridge_" to the name of your user. Change password in two places
      "NICKSERV regain bridge_",
      "NICKSERV set enforce on",
    ],
    // see https://node-irc.readthedocs.org/en/latest/API.html#client for
    // documentation
    ircOptions: {
      userName: "bridge_",
      realName: "1Chat Bridge Bot",
      nick: "bridge_",
      password: "my_password",
      port: 6667,
      localAddress: null,
      debug: false,
      showErrors: false,
      autoRejoin: true,
      autoConnect: true,
      secure: false,
      selfSigned: false,
      certExpired: false,
      floodProtection: true,
      floodProtectionDelay: 1000,
      sasl: false,
      stripColors: false,
      channelPrefixes: "&#!",
      messageSplit: 512,
    },
    Actions: ["action"],
  },
};

config.generic = {
  // enable HTTP server which hosts sent media files, links to files are forwarded to IRC
  //you need to forward your httpPort to httpLocation via Nginx or Apache
  showMedia: true,
  // Add some randomness to url when realying media
  // Use 0 to disable
  mediaRandomLength: "lojbo",
  // HTTP server port
  httpPort: 3000, // change if this port is taken. in case of using Docker you must leave it as it is
  // HTTP server location, URLs are generated from this
  httpLocation: "https://image.jbotcan.org", // change to your server
};

config.new_channels = [
  // example of a barebones IRC channel:
  // e.g. here 'Example chat' will be bridged to/from Slack "test" and others from this entity
  {
    //removeJoinMessages=true to remove new members join messages
    telegram_1: { groupName: "Example chat", removeJoinMessages: true },
    telegram_1: "Example chat", // telegram visiable chat name
    vkboard_1: "123456", // the id can be seen in board url
    // vkchat_1: "2000000123", // messages peer_id as string, or chat title after cache is filled from getConversations
    vkwall_1: "7", // the id can be seen in wall url
    slack_1: "test", //visible channel name
    mattermost_1: "test", //visible or url name
    discord_1: "test", // visible name without "#"
    // max_1: "123456789", // MAX chat_id as string, or exact chat title once cache lists chats
    language_1: "lojban", // comment out for English
    irc_1: "#lojbanme", // IRC channel with "#"
    webwidget_1: "#lojbanme", //how theexternal websocket service will tag this relay entity
    "irc_1-nickcolor": "mood", //options: mood / color / none
    "irc_1-readonly": true, // if true then the channel can'tbe sent to, can only be read from. Comment out for two-way bridge
    "irc_1-dontProcessOtherBridges": true, // if true then messages like "<another_bridge>: <user>: user's message" will be sent as if from another_bridge, not from user
  },
  {
    // another relay entity
    //if a Telegram group has topics then the first topic has topicId: "1", see Ids of other topics in their menu in Telegram client GUI
    telegram_1: { groupName: "Lojban", topicId: "1", removeJoinMessages: true },
  },
];

config.spamremover = {
  irc: /This channel has moved to|freeᥒοdе|This channel has been hacked|fentanyl|\\* zbagamumble|\\* topic for channel undefined/,
  telegram: [
    {
      caption: /курьер|кошельк|\bBTC\b|bitcoin|qiwi|@[a-z_]+bot|hot fast sex/,
    },
    {
      text: [
        "hot fast sex",
        "\\bsex\\b.*(chat|ating)(?!\\p{L})",
        "earn.*(\\bbtc(?!\\p{L})|money)",
        "looking for a man(?!\\p{L})",
        "\\bt.me/[a-z_0-9A-Z]+bot(?!\\p{L})",
        "\\b([a-z_.]+.)?t.me\\b(?!.*?(vedrussia|enter_the_phase|outofbody|astralos|lojb|luciddream))",
        "tinyurl.com",
        "chat.whatsapp.com",
        "(dirty|naked).*photo",
        "\\bsex.*webcam",
        "trading.*invest",
        "бесплатн.*(гадание|гадалк)",
        "💸.*клиент",
        "курс.*трейдинг",
        "набор.*команд.*зараб",
        "материал.*(трейдинг|крипт)",
        "ищу(?!\\p{L}).*\\bдoп.*заpабoт",
        "\\bзараб.т.*(💸|💵|💲|💰)",
        "💲.*доход.*(зарплат|нович)занятост.*(заработок|доп.*доход)",
        "авито.*(сбербанк|тиньк)",
        "(в поиске людей|возьму).*удал.н.*(день|час)",
        "нуж.*(бабк\\bзп(?!\\p{L})).*опыта",
        "(\\bтемк|пасс.*доход|набир.*команд|\\bудал[её]н.*(деятельно|работ|занято)).*\\b(личн.*сообщ.*|личные|лс|лc|личк.)",
        "заработ.*?удал.н.*?\\b(личн.*сообщ.*|личные|лс|лc|личк.)",
        "заработок.*(крипт|crypto)",
      ],
    },
    {
      "forward_from_chat.title": /\bsex\b|\bdating\b|работа/,
    },
    {
      "forward_from.username": /PostBot/,
    },
    {
      "via_bot.username": /PostBot/,
    },
  ],
};
