A [Telegram](https://telegram.org/) ↔ [Discord](https://discordapp.com) ↔ [Slack](https://slack.com) ↔ IRC ↔ [Mattermost](https://mattermost.com/) ↔ [Facebook Messenger](https://facebook.com)  ↔ vk.com (board) ↔ vk.com (wall)  ↔ websocket (API for external use in custom apps or custom messengers) gateway.

![standards](https://imgs.xkcd.com/comics/standards.png)

[![Build Status](https://travis-ci.org/lagleki/Lojban-1Chat-Bridge.svg?branch=develop)](https://travis-ci.org/lagleki/Lojban-1Chat-Bridge)
[![dependencies](https://david-dm.org/lagleki/Lojban-1Chat-Bridge.svg)](https://david-dm.org/lagleki/Lojban-1Chat-Bridge#info=Dependencies)
[![devDependencies](https://david-dm.org/lagleki/Lojban-1Chat-Bridge/dev-status.svg)](https://david-dm.org/lagleki/Lojban-1Chat-Bridge#info=devDependencies)

# Features

* makes a bridge where message from one messenger is sent to the rest. Both sending and receeving messages is possible.
* e.g. Telegram messages are relayed to their respective IRC channel and Slack channel and Mattermost channels ... and vice versa
* Supported messengers: [Telegram](https://telegram.org/), [Discord](https://discordapp.com), [Slack](https://slack.com), IRC, [Mattermost](https://mattermost.com/), [Facebook Messenger](https://facebook.com) (not stable currently, not recommended), vk.com (board), vk.com (wall), websocket (API for external use in custom apps, web widgets or custom messengers)
* IRC messages can be configured to relay to Slack and Telegram but not from Telegram/Slack into them (thus making them readonly)
* Supports Telegram/Slack/Mattermost/Discord media files, URL to file is sent to the other messengers. Local hosting of images

# Quick start via Podman

* install podman
* edit expose port in Dokerfile to your free port
* `mkdir custom-config ; cp config/defaults.js custom-config/config.js`
* edit `custom-config/config.js`. Fill in all the necessary fields according to the infile instructions 
* `./docker_build.sh`
* edit `./docker_start.sh` and change 9091:9091 to "YOUR_FREE_PORT:9091" where YOUR_FREE_PORT is the free port in your host OS that would serve media files from the website speicified in httpLocation param in `custom-config/config.js`. You may use an external Apache or Nginx to proxy requests from httpLocation to YOUR_FREE_PORT
* run `./docker_start.sh` (should add 1chat process to podman's autostart)
* see logs via `podman logs 1chat`
* if necessary stop the process via `podman stop 1chat`

# Quick start

Currently there are only short docs. You need to study yourself how to make users or bots for each messenger and get their credentials.

* `git clone https://github.com/lagleki/Lojban-1Chat-Bridge.git ; cd Lojban-1Chat-Bridge ; npm i`
* `npm run tsc` to compile.
* `npm run genconfig` to generate a default config
* Read and edit `vim config/defaults.js`, which has in-place instructions
* `npm run start` to start the process.
* install FFmpeg and make sure it's in your PATH, e.g. on Ubuntu/Debian:
```
sudo apt update

sudo apt install ffmpeg

ffmpeg -version
```

## Debug

Run `DEBUG=telegram,mattermost,discord npm run start` to output messages to and from Telegram, Mattermost, Discord. Messengers to be separated with a comma. 

# Future docs (not ready)

- For your convenience, there is an included systemd unit file in
  `Lojban-1Chat-Bridge.service`.
- You can tell Telegram which commands the Lojban-1Chat-Bridge bot supports by using the
  `/setcommands` BotFather command. You may copy-paste the contents of
  [`commands.txt`](/commands.txt) to show all supported commands to Telegram
  clients.
- See the [README for Docker](Docker_README.md)
