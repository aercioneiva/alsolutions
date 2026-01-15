const dotenv = require('dotenv');
dotenv.config();
const { Worker } = require('bullmq');
const Logger = require('./libs/logger');

process.on('uncaughtException', (err) => {
   Logger.error(err);
   process.exit(1);
});


const redisConnection = require('./db/redis');
const EnviarMensagemZap = require('./queue-jobs/enviar-mensagem-whatsapp');
const EnviarMensagemZapApi = require('./queue-jobs/enviar-mensagem-whatsapp-api');
const EnviarMensagemZapNotifications = require('./queue-jobs/enviar-mensagem-whatsapp-notifications');
const EnviarMensagemChatWoot = require('./queue-jobs/enviar-mensagem-chatwoot');

function enviarMensagemDelay(delay, value) {
return new Promise(function(resolve) {
   setTimeout(async function() {
      const res = await EnviarMensagemZapApi.handle(value);
      resolve(res);
   }, delay);
});
}

const workerZap = new Worker(EnviarMensagemZap.key, async job => {
   const res = await EnviarMensagemZap.handle(job.data);
   if(!res){
      throw new Error(`Error processing job: ${job.id}`);
   }
}, { connection: redisConnection });

const workerZapApi = new Worker(EnviarMensagemZapApi.key, async job => {
   const res = await enviarMensagemDelay(5000, job.data);
   if(!res){
      throw new Error(`Error processing job: ${job.id}`);
   }
}, { connection: redisConnection });

const workerZapNotifications = new Worker(EnviarMensagemZapNotifications.key, async job => {
const res = await EnviarMensagemZapNotifications.handle(job.data);
   if(!res){
      throw new Error(`Error processing job: ${job.id}`);
   }
}, { connection: redisConnection });

const workerChat = new Worker(EnviarMensagemChatWoot.key, async job => {
const res = await EnviarMensagemChatWoot.handle(job.data);
   if(!res){
      throw new Error(`Error processing job: ${job.id}`);
   }
}, { connection: redisConnection });

process.on('unhandledRejection', async (reason, promise) => {
   Logger.error(reason);
   await workerZapApi.close();
   await workerZap.close();
   await workerZapNotifications.close();
   await workerChat.close();
   process.exit(1);
});

process.on('SIGTERM', async() => {
   Logger.error('Received SIGTERM: Shutting down...');
   await workerZapApi.close();
   await workerZap.close();
   await workerZapNotifications.close();
   await workerChat.close();
   process.exit(0);
});

process.on('SIGINT', async() => {
   Logger.error('Received SIGINT: Shutting down...');
   await workerZapApi.close();
   await workerZap.close();
   await workerZapNotifications.close();
   await workerChat.close();
   process.exit(0);
});
