const dotenv = require('dotenv');
dotenv.config();
const { Queue } = require('bullmq');

const redisConnection = require('../db/redis.js');
const EnviarMensagemZap = require('../queue-jobs/enviar-mensagem-whatsapp');
const EnviarMensagemZapNotifications = require('../queue-jobs/enviar-mensagem-whatsapp-notifications');
const EnviarMensagemChatWoot = require('../queue-jobs/enviar-mensagem-chatwoot');


exports.ZapQueue = new Queue(EnviarMensagemZap.key,{ connection: redisConnection });
exports.ZapNotificationsQueue = new Queue(EnviarMensagemZapNotifications.key,{ connection: redisConnection });
exports.ChatQueue = new Queue(EnviarMensagemChatWoot.key,{ connection: redisConnection });
