const facebook = {
  email: "",
  password: ""
};

const { login } = require("libfb");
(async () => {
  const api = await login(facebook.email, facebook.password);
  api.on("message", message => {
    console.log(message.threadId);
    api.getAttachmentURL(message.id,message.attachments[0].id).then(res=>console.log(res));
    api.sendMessage(message.threadId, message.message);
  });
  // api.on('participantsAddedToGroupThreadEvent', async event => {
  //   const user = await api.getUserInfo(event.participantIds[0])
  //   api.sendMessage(event.threadId, `Hello, ${user.name}!`)
  // })
})();
