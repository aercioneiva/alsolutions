const dotenv = require('dotenv');
dotenv.config();
const { Worker } = require('bullmq');
const redisConnection = require('./db/redis');
const db = require('./db/connection.js');
const HandleMessageWhatsapp= require('./queue-jobs/handle-message-whatsapp');
const Logger = require('./libs/logger');

// Controle de concorrência por usuário
// Garante que mensagens do mesmo usuário sejam processadas em sequência
const userLocks = new Map();

async function acquireUserLock(userId) {
  if (userLocks.has(userId)) {
    // Aguarda o lock anterior terminar
    await userLocks.get(userId);
  }

  let resolveLock;
  const lockPromise = new Promise(resolve => {
    resolveLock = resolve;
  });

  userLocks.set(userId, lockPromise);
  
  return () => {
    userLocks.delete(userId);
    resolveLock();
  };
}

const messageWorker = new Worker(
  'ProcessarMensagemWhatsapp',
  async (job) => {
    const { dbId, message, contacts } = job.data;
    const userId = contacts?.[0]?.wa_id;


    // Adquire lock para esse usuário
    const releaseLock = await acquireUserLock(userId);

    try {
      await db.raw(
        `UPDATE whatsapp_messages 
         SET status = ?, attempts = attempts + 1 
         WHERE id = ?`,
        ['processing', dbId]
      );

      await HandleMessageWhatsapp.handle(job.data, job);

      await db.raw(
        `UPDATE whatsapp_messages 
         SET status = ?, processed_at = NOW() 
         WHERE id = ?`,
        ['completed', dbId]
      );

      return { success: true};
    } catch (error) {
     Logger.error(`❌ Erro ao processar mensagem ${message.id}:`, error);

      await db.raw(
        `UPDATE whatsapp_messages 
         SET status = ?, error_message = ? 
         WHERE id = ?`,
        ['failed', error.message, dbId]
      );

      throw error; // BullMQ vai fazer retry automaticamente
    } finally {
      releaseLock();
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Processa até 10 jobs simultaneamente
    limiter: {
      max: 100, // Máximo 100 jobs
    },
  }
);

messageWorker.on('failed', (job, err) => {
  Logger.error(`Job ${job.id} falhou após ${job.attemptsMade} tentativas:`, err.message);
});

messageWorker.on('error', (err) => {
  Logger.error('Erro no worker:', err);
});

console.log('🚀 Worker iniciado e aguardando mensagens...');

process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando worker...');
  await messageWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando worker...');
  await messageWorker.close();
  process.exit(0);
});
