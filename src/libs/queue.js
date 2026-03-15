const dotenv = require("dotenv");
dotenv.config();
const { Queue } = require("bullmq");

const { createRedisConnection } = require("../db/redis");

exports.HandleMessageWhatsappQueue = new Queue("ProcessarMensagemWhatsapp", {
  connection: createRedisConnection()
});
exports.ZapQueue = new Queue("EnviarMensagemWhatsapp", {
  connection: createRedisConnection()
});
exports.WhatsappNotificationsQueue = new Queue("EnviarMensagemWhatsappNotifications", {
  connection: createRedisConnection()
});
exports.HandleMessageChatWootQueue = new Queue("ProcessarMensagemChatWoot", {
  connection: createRedisConnection()
});
