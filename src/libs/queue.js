const dotenv = require('dotenv');
dotenv.config();
const { Queue } = require('bullmq');

const redisConnection = require('../db/redis.js');

exports.HandleMessageWhatsappQueue = new Queue('ProcessarMensagemWhatsapp',{ connection: redisConnection });
exports.ZapQueue = new Queue('EnviarMensagemWhatsapp',{ connection: redisConnection });
exports.ZapNotificationsQueue = new Queue('EnviarMensagemZapNotifications',{ connection: redisConnection });
exports.HandleMessageChatWootQueue = new Queue('ProcessarMensagemChatWoot',{ connection: redisConnection });
