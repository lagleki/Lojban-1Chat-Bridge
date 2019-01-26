const accessToken =
  "EAAHj4t3T3u8BAIZAURWN3OPNjHnwMaJatSu0399Ukujbo5ZACyrk18MXvsqdiBWvQZB96W7qhYTDpZCvuO2ZAVvjQDlMla35RYBAR0Ldet49C5Qggas8ZBnvxAJpkQRUjVLzeIQa2kwtoMAZARpe27NV33Q2dhtM2gIspnuPb6CUgZDZD";
const appSecret = 'e45788d5bfe3f8f07294073c51e0dd83';
const verifyToken = 'lojban';

// index.js
'use strict';
const BootBot = require('bootbot');

const bot = new BootBot({
  accessToken,
  verifyToken,
  appSecret
});
// bot.on('message', (payload, chat) => {
// 	const text = payload.message.text;
// 	console.log(`The user said: ${text}`);
// });

// bot.hear(['hello', 'hi', /hey( there)?/i], (payload, chat) => {
// 	console.log('The user said "hello", "hi", "hey", or "hey there"');
// });
bot.hear(['hello', 'hi', /hey( there)?/i], (payload, chat) => {
	// Send a text message followed by another text message that contains a typing indicator
  	console.log('The user said "hello", "hi", "hey", or "hey there"');
	chat.say('Hello, human friend!').then(() => {
		// chat.say('How are you today?', { typing: true });
	});
});

bot.hear([/[0-9, -\/=\+]/i], (payload, chat) => {
    const text = payload.message.text||'';
    const jbo = text
    .replace(/0/g,"no")
    .replace(/1/g,"pa")
    .replace(/2/g,"re")
    .replace(/3/g,"ci")
    .replace(/4/g,"vo")
    .replace(/5/g,"mu")
    .replace(/6/g,"xa")
    .replace(/7/g,"ze")
    .replace(/8/g,"bi")
    .replace(/9/g,"so")
    .replace(/ /g,"");
  	console.log('The user said a number ' + text);

	   chat.say(jbo);
});


// bot.hear(['food', 'hungry'], (payload, chat) => {
// 	// Send a text message with quick replies
// 	chat.say({
// 		text: 'What do you want to eat today?',
// 		quickReplies: ['Mexican', 'Italian', 'American', 'Argentine']
// 	});
// });

bot.hear(['help'], (payload, chat) => {
	// Send a text message with buttons
	// chat.say({
	// 	text: 'What do you need help with?',
	// 	buttons: [
	// 		{ type: 'postback', title: 'Settings', payload: 'HELP_SETTINGS' },
	// 		{ type: 'postback', title: 'FAQ', payload: 'HELP_FAQ' },
	// 		{ type: 'postback', title: 'Talk to a human', payload: 'HELP_HUMAN' }
	// 	]
	// });
  chat.say('This a bot, converting numbers into Lojban language. Just enter any number and get a reply how it\'s written in Lojban language.').then(() => {
		// chat.say('How are you today?', { typing: true });
	});
});

// bot.hear('image', (payload, chat) => {
// 	// Send an attachment
// 	chat.say({
// 		attachment: 'image',
// 		url: 'http://example.com/image.png'
// 	});
// });
// bot.hear('ask me something', (payload, chat) => {
//
// 	const askName = (convo) => {
// 		convo.ask(`What's your name?`, (payload, convo) => {
// 			const text = payload.message.text;
// 			convo.set('name', text);
// 			convo.say(`Oh, your name is ${text}`).then(() => askFavoriteFood(convo));
// 		});
// 	};
//
// 	const askFavoriteFood = (convo) => {
// 		convo.ask(`What's your favorite food?`, (payload, convo) => {
// 			const text = payload.message.text;
// 			convo.set('food', text);
// 			convo.say(`Got it, your favorite food is ${text}`).then(() => sendSummary(convo));
// 		});
// 	};
//
// 	const sendSummary = (convo) => {
// 		convo.say(`Ok, here's what you told me about you:
// 	      - Name: ${convo.get('name')}
// 	      - Favorite Food: ${convo.get('food')}`);
//       convo.end();
// 	};
//
// 	chat.conversation((convo) => {
// 		askName(convo);
// 	});
// });

bot.start(3022);
