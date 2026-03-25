A [Telegram](https://telegram.org/) ↔ [Discord](https://discordapp.com) ↔ [Slack](https://slack.com) ↔ IRC ↔ [Mattermost](https://mattermost.com/) ↔ [MAX](https://max.ru/) (VK MAX Messenger) ↔ vk.com (community messages / chats) ↔ vk.com (board) ↔ vk.com (wall) ↔ websocket (API for external use in custom apps or custom messengers) gateway.

![standards](https://imgs.xkcd.com/comics/standards.png)

[![Build Status](https://travis-ci.org/lagleki/Lojban-1Chat-Bridge.svg?branch=develop)](https://travis-ci.org/lagleki/Lojban-1Chat-Bridge)
[![dependencies](https://david-dm.org/lagleki/Lojban-1Chat-Bridge.svg)](https://david-dm.org/lagleki/Lojban-1Chat-Bridge#info=Dependencies)
[![devDependencies](https://david-dm.org/lagleki/Lojban-1Chat-Bridge/dev-status.svg)](https://david-dm.org/lagleki/Lojban-1Chat-Bridge#info=devDependencies)

# Features

* makes a bridge where message from one messenger is sent to the rest. Both sending and receeving messages is possible.
* e.g. Telegram messages are relayed to their respective IRC channel and Slack channel and Mattermost channels ... and vice versa
* Supported messengers: [Telegram](https://telegram.org/), [Discord](https://discordapp.com), [Slack](https://slack.com), IRC, [Mattermost](https://mattermost.com/), [MAX](https://max.ru/) (VK MAX Messenger), vk.com (community messages and invited chats via **`vkchat`** pier), vk.com (board), vk.com (wall), websocket (API for external use in custom apps, web widgets or custom messengers)
* IRC messages can be configured to relay to Slack and Telegram but not from Telegram/Slack into them (thus making them readonly)
* Supports Telegram/Slack/Mattermost/Discord media files, URL to file is sent to the other messengers. Local hosting of images
* installation via Docker is highly recommended

# Slack

The bridge uses the official Node SDK packages **`@slack/rtm-api`** and **`@slack/web-api`** (keep them on the same major version as each other). Incoming messages use Slack’s **Real Time Messaging (RTM)** API over a WebSocket; outgoing messages and lookups use the **Web API** (`chat.postMessage`, `users.info`, `conversations.info`, `conversations.list`, etc.). Upstream docs: [RTM client](https://tools.slack.dev/node-slack-sdk/rtm-api), [Web API client](https://tools.slack.dev/node-slack-sdk/web-api).

**Important (RTM vs modern apps):** Slack’s RTM API is **not** available to new apps that only use **granular bot scopes**. If your bot token was issued for such an app, `rtm.connect` / `RTMClient.start()` will fail and the bridge will not receive messages. The Slack team recommends **[Bolt for JavaScript](https://tools.slack.dev/bolt-js/)** with **Socket Mode** for new integrations; this project still targets **RTM + Web API** as above. If you already have a **legacy** Slack app that still supports RTM, **do not** migrate that app to granular-only scopes or RTM may stop working (see the note in the [`@slack/rtm-api` readme](https://www.npmjs.com/package/@slack/rtm-api)).

### Configure Slack in this bridge

1. Open [Your Apps](https://api.slack.com/apps) and select an app that can use RTM with a **bot token** (`xoxb-…`), or follow Slack’s guidance for your workspace.
2. Under **OAuth & Permissions** → **Bot Token Scopes**, ensure the bot can perform what this bridge needs, for example:
   - `chat:write` — post bridged messages (`chat.postMessage`)
   - `channels:read`, `groups:read` — resolve channel names (`conversations.info`, `conversations.list`)
   - `users:read` — resolve display names (`users.info`)
   - `files:read` — download shared files (`url_private` downloads)
   - `mpim:read` — if you bridge group DMs (as needed for your mapping)
3. **Install the app** to the workspace and copy the **Bot User OAuth Token** into `config.piers.<your_slack_pier>.token` in `config.js` (see `default-config/defaults.js` for the shape of `slack_1`).
4. **Invite the bot** into every channel that appears in `channelMapping` for that pier (Slack does not deliver channel messages to bots that are not members).

### Debug

Include `slack` in the messenger list: `DEBUG=slack pnpm start` (see the Debug section below).

# MAX (VK MAX Messenger)

The bridge uses the official Node library **`@maxhub/max-bot-api`** (long polling). Documentation: [MAX for developers](https://dev.max.ru/docs/chatbots/bots-coding/library/js), package: [max-messenger/max-bot-api-client-ts](https://github.com/max-messenger/max-bot-api-client-ts).

### One MAX chat ↔ one bridge “room”

Each MAX **chat** (numeric `chat_id` from the MAX Bot API) maps to **one** relay row in `config.new_channels`, the same way a Telegram group/topic or a Discord channel does. Put the same logical room on one line—e.g. `telegram_1`, `discord_1`, `max_1`—so traffic is two-way between MAX and every other pier on that row.

### Configure MAX in this bridge

1. Create a bot in MAX (e.g. via Master Bot at [max.ru/masterbot](https://max.ru/masterbot)) and copy the **bot token** into `config.piers.<your_max_pier>.token` (see `default-config/defaults.js` for the `max_1` shape).
2. Add the bot to every MAX group/channel you want to bridge.
3. **Channel mapping**
   - On startup the bridge calls **`getAllChats`** (via the MAX API) and fills `cache.<max_pier>` with `chat title → chat_id` (and `chat_id → chat_id`). In `new_channels`, set `max_1` to either the **exact chat title** (as shown in MAX) or the numeric **`chat_id`** string (e.g. `"123456789"`). That value becomes the key in `channelMapping` for that pier—one MAX chat per relay entity, aligned with one Telegram group/topic, Discord channel, etc.
   - After the bot is added to a new chat, a `bot_added` update refreshes the cache and re-runs channel mapping when possible.
4. Optional: `maxMsgAge` (seconds) drops inbound MAX messages older than that age (similar to Telegram), `0` to disable.

Outbound text is sent as **HTML** (API `format: html`), matching the `sendTo.max.*` templates in `dict.json`. Inbound text is converted for the rest of the bridge like other piers. Reply chains in MAX are surfaced as **quotes** to the other messengers.

### Debug

Use `DEBUG=one-me:main,one-me:polling pnpm start` if you need MAX client logs (the library uses the `debug` package with namespaces `one-me:*`).

# VK community chat (`vkchat`)

The bridge uses **[vk-io](https://www.npmjs.com/package/vk-io)** for the VK API and **Bots Long Poll** (same family of updates as in the official bot overview). Outgoing messages use **`messages.send`**. Operator setup matches VK’s community bot flow: [Chat bots — quick start](https://dev.vk.com/ru/api/bots/getting-started?ref=old_portal), [API reference](https://dev.vk.com/ru/reference).

This pier is separate from **`vkboard`** / **`vkwall`**: those use `node-vk-bot-api` plus a user login for board and wall APIs. **`vkchat`** only needs a **community (group) access token** with **messages** (and related community scopes), plus **`group_id`**.

### Bots in VK group chats

You can invite the community bot into user chats when the community has **bot features** enabled and **“allow adding the community to chats”** (or “to conversations”) is turned on in **Manage → Messages → Bot settings**; then use **Invite to chat** from the community. By default the bot may only see messages that **mention** it or **reply** to it; a **chat admin** can grant access to **the full conversation** so the bridge can relay everything. See the same [VK bot getting started](https://dev.vk.com/ru/api/bots/getting-started?ref=old_portal) page for access levels.

### One VK `peer_id` ↔ one bridge “room”

Each bridged VK dialog is keyed by **`peer_id`** (string in `channelMapping`): user DMs use the user id; multi-user chats use VK’s chat peer (e.g. `2000000000 + local_chat_id`). Put **`vkchat_1`** (or your pier name) on the same `new_channels` row as `telegram_1`, `irc_1`, etc., for two-way relay.

### Configure `vkchat` in this bridge

1. Create a **community** access token with **messages** (and permissions your bridge needs): **Manage → API → Create key**. Set `config.piers.<your_vkchat_pier>.token` and **`group_id`** (see `default-config/defaults.js` for the `vkchat_1` shape).
2. Enable **messages** for the community and **bot** settings as in VK’s docs; invite the bot into each chat you want to bridge (or rely on users inviting it).
3. **Channel mapping**
   - On startup, **`getChannels`** calls **`messages.getConversations`** and fills `cache.<vkchat_pier>` with **chat title → `peer_id`** and **`peer_id` → `peer_id`** where titles exist.
   - In `new_channels`, set `vkchat_1` to either the **numeric `peer_id` string** or the **exact title** from the cache (after a successful fetch or after the first message triggers a cache refresh).
   - If a message arrives from an unknown peer, the bridge tries **`messages.getConversationsById`**, updates the cache, and re-runs channel mapping (same idea as MAX’s `bot_added` flow).
4. Optional: **`apiVersion`** (default in code is a recent stable, e.g. `5.199`), **`maxMsgAge`** (seconds; drop stale inbound messages, `0` to disable).

Inbound/outbound text uses the same VK-oriented **`convertFrom` / `convertTo`** path as **`vkboard`**. Templates live under **`sendTo.vkchat.*`** in `src/local/dict.json`. Replies in VK are surfaced as **quotes** to other piers where supported.

### Debug

Include `vkchat` in the messenger list if you add logging for it: `DEBUG=vkchat pnpm start` (see the Debug section below).

# Quick start via docker

* install Docker
* `mkdir data ; cp config/defaults.js data/config.js`
* edit `data/config.js`. Fill in all the necessary fields according to the infile instructions 
* `./docker_build.sh`
* edit `./docker_start.sh` and change `9091` to `<YOUR_FREE_PORT>` where <YOUR_FREE_PORT> is the free port in your host OS that would serve media files from the website speicified in httpLocation param in `data/config.js`. You may use an external Apache or Nginx to proxy requests from httpLocation to <YOUR_FREE_PORT>
* run `./docker_start.sh` (should add 1chat process to docker's autostart)
* see logs via `docker logs -f -t 1chat`
* if necessary stop the process via `docker stop 1chat`

## Debug

* run `./docker_dev.sh` in dev mode
Run `DEBUG=telegram,mattermost,discord,vkchat pnpm start` to output messages to and from Telegram, Mattermost, Discord, or the VK chat pier. Messengers to be separated with a comma. For the MAX bot client, use `DEBUG=one-me:main,one-me:polling` (see the MAX section above). 
