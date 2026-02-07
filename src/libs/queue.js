const dotenv = require('dotenv');
dotenv.config();
const { Queue } = require('bullmq');

const redisConnection = require('../db/redis.js');

exports.HandleMessageWhatsappQueue = new Queue('ProcessarMensagemWhatsapp',{ connection: redisConnection });
exports.ZapQueue = new Queue('EnviarMensagemZap',{ connection: redisConnection });
exports.ZapNotificationsQueue = new Queue('EnviarMensagemZapNotifications',{ connection: redisConnection });
exports.ChatQueue = new Queue('EnviarMensagemChatWoot',{ connection: redisConnection });
