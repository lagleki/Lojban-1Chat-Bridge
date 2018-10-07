#Todo

ReceivedFrom: config,facebook,sendFrom,AdaptName.facebook, generic.downloadFile
- split code by messenger
- remove spam via telegram user
- qq support
- discord support
- topic set in slack not sent anywhere
- get rid of all ".then"
- fork await-to-js to "or"
- facebook: support localization of attachments like in telegram
- captcha for vk
- get rid of all .js sub libs.
- send youtube title
  - getchunks has attachment
  - sendfrom has another instance: sendto itself
- update default.js from new config.js
- upload images in sendto.vk
- add map irc on start, leave channels if not necessary
- improve topic changes from irc, other action message, edit message
  - LocalizeString
- generic.irc.start add
- restart facebook on error
- check cold start - no ~/.something files
- complete README.md
- localize via https://www.npmjs.com/package/safe-eval
- convert channel names when sending to another messenger
- relayed messaging module should work independently
- optimize TS performance
- resend message to tg/slack/irc on fail - not more than 10 in stack for each channel. enable reject handlingin pushtask
- heroku compatible
- store files on dropbox
- todo: get list of online users of each messenger: telethon for tg
- new type of spam remover: ban user as well

- check what happens on removing from slack channel: too hard, would need to delete the bot
- check what happens on removing from telegram channel
- check what happens on removing from irc channel
- eilojbo flag for chats

# done

- queue should return await-to-js array object
