A [Telegram](https://telegram.org/) ↔ [Slack](https://slack.com) ↔ IRC ↔ [Mattermost](https://mattermost.com/) ↔ [Facebook Messenger](https://facebook.com) gateway.


[![Build Status](https://travis-ci.org/lagleki/Lojban-1Chat-Bridge.svg?branch=develop)](https://travis-ci.org/lagleki/Lojban-1Chat-Bridge)
[![dependencies](https://david-dm.org/lagleki/Lojban-1Chat-Bridge.svg)](https://david-dm.org/lagleki/Lojban-1Chat-Bridge#info=Dependencies)
[![devDependencies](https://david-dm.org/lagleki/Lojban-1Chat-Bridge/dev-status.svg)](https://david-dm.org/lagleki/Lojban-1Chat-Bridge#info=devDependencies)

#### Features:

* Supports multiple Telegram group ↔ IRC channel ↔ Slack channel bridges
* Telegram messages are always relayed to their respective IRC channel and Slack channel and vice versa
* IRC messages can be configured to relay to Slack and Telegram but not from Telegram/Slack into them (thus making them readonly)
* Supports Telegram/Slack media files, URL to file sent to the other messengers

Quick start
-----------

Make sure you've installed Node.js.
1. Install the Lojban-1Chat-Bridge npm module with `npm install -g Lojban-1Chat-Bridge` (might need sudo)
2. Generate a default config using `Lojban-1Chat-Bridge --genconfig`
3. Set up your bot with [BotFather](https://telegram.me/botfather)
4. Use the `/setprivacy` command with `BotFather` to allow your bot to
   see all messages in your group (NOTE on usage: bot name is preceded by @ sign
   and 'Disable' is case-sensitive)
5. Create a Slack bot via https://api.slack.com/apps In "OAuth & Permissions" section add the following  permission scopes: channels:read, incoming-webhook, mpim:read, files:read, bot. Add your bot to necessary channels of your Slack project.
6. Edit the default config `$EDITOR ~/.Lojban-1Chat-Bridge/config.js`
7. Run `node node_modules/.bin/supervisor -- --expose-gc bridge.js`
8. chcon -t init_exec_t ./node_modules/webp-converter/lib/libwebp_linux/bin/dwebp
9. Invite your bot to any Telegram groups you've configured it for, make your bot an admin there so that it can remove spam on Telegram
10. Greet your bot once on each of your Telegram groups :tada:! This is needed
   to fetch (and store!) an internally used group ID, making communication
   from IRC to the correct Telegram group possible.

### Installing Mattermost integration

1. Add webhook
2. Add your bot to each channel (otherwise your message won't go from Mattermost anywhere)

Optional:

- For your convenience, there is an included systemd unit file in
  `Lojban-1Chat-Bridge.service`.
- You can change your Telegram Bot's profile picture with the `/setuserpic`
  BotFather command. [Here's](/icon.png) an example icon for you.
- You can tell Telegram which commands the Lojban-1Chat-Bridge bot supports by using the
  `/setcommands` BotFather command. You may copy-paste the contents of
  [`commands.txt`](/commands.txt) to show all supported commands to Telegram
  clients.

Developer install (from git)
----------------------------

    git clone https://github.com/lagleki/Lojban-1Chat-Bridge
    cd Lojban-1Chat-Bridge
    npm install

Then follow the instructions under `Setup`, with the exception of step 1.
Also, instead of using the `Lojban-1Chat-Bridge` command, use `npm run start` inside the repo.

Use the [`develop`](https://github.com/lagleki/Lojban-1Chat-Bridge/tree/develop) branch for developing, and please also send any pull requests to this branch. The [`master`](https://github.com/lagleki/Lojban-1Chat-Bridge/tree/master) branch contains the latest stable version which is also released on [npm](https://www.npmjs.com/package/Lojban-1Chat-Bridge).

Make sure that the unit tests pass before submitting your pull request, using `npm test`.

Docker install
--------------

See the [README for Docker](Docker_README.md)
