const { QQ } = require('qq-bot-rebown');

// 构造函数可以添加参数
// 详情参阅 [tsd 类型定义文件](./index.d.ts) 中 QQOptions 部分
const qq = new QQ({
    auth: {
        /** QQ id to use in id/pwd login */
        u: string,
        /** QQ pwd to use in id/pwd login. should NOT encrypt */
        p: string
    }});

// 设置 “收到消息” 事件监听
qq.on('msg', (msg) => {
    console.log(JSON.stringify(msg));
});

// 设置 “收到好友消息” 事件监听
qq.on('buddy', (msg) => {
    qq.sendBuddyMsg(msg.id, `Hello, ${msg.name}`);
});

// 不要忘记启动 :)
qq.run();
