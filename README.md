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
* installation via Docker is highly recommended

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
Run `DEBUG=telegram,mattermost,discord npm run start` to output messages to and from Telegram, Mattermost, Discord. Messengers to be separated with a comma. 
