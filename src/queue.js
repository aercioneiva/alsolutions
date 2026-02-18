const dotenv = require('dotenv');
dotenv.config();
const { Worker, tryCatch } = require('bullmq');
const redisConnection = require('./db/redis');
const db = require('./db/connection.js');
const HandleMessageWhatsapp = require('./queue-jobs/handle-message-whatsapp');
const HandleMessageChatWoot = require('./queue-jobs/handle-message-chatwoot');
const Lock = require('./utils/lock');

const Logger = require('./libs/logger');

// Controle de concorrência por usuário
// Garante que mensagens do mesmo usuário sejam processadas em sequência
const userLocks = new Lock();



const chatWootWorker = new Worker(
  'ProcessarMensagemChatWoot',
  async (job) => {

    const { messsage } = job.data;
    if(messsage.coversation){
      // Adquire lock para esse usuário
      const hasLock = userLocks.add(messsage.coversation.id, job.id);
    
      if(!hasLock){
        // Se não conseguiu o lock, move o job para "delayed" para tentar novamente em 1s
        // Isso mantém a mensagem na fila sem bloqueá-la para outra conversas
        console.log(`[Inbound] Usuário ${messsage.coversation.id} ocupado. Reagendando Job ${job.id}...`);
        await job.moveToDelayed(Date.now() + 2000);
        throw new Error('LOCK_ACQUIRED_BY_ANOTHER_JOB'); // Interrompe a execução atual
      }
    }
    

    try {
      await HandleMessageChatWoot.handle(job.data, job);
       return { success: true};
    } catch (error) {
      Logger.error(`❌ Erro ao processar mensagem chatwoot`, error);
    }finally {
      if(messsage.coversation){
        userLocks.remove(messsage.coversation.id); // Libera o lock para essa conversa, permitindo que a próxima mensagem seja processada
      }
    }
    
  },
  {
    connection: redisConnection,
    concurrency: 5, // Processa até 5 jobs simultaneamente
  }
);

chatWootWorker.on('failed', (job, err) => {
  Logger.error(`Job ${job.id} falhou:`, err.message);
});

chatWootWorker.on('error', (err) => {
  Logger.error('Erro no worker ChatWoot:', err);
});

const whatsappWorker = new Worker(
  'ProcessarMensagemWhatsapp',
  async (job) => {
    const { dbId, message, contacts } = job.data;
    const userId = contacts?.[0]?.wa_id;


    // Adquire lock para esse usuário
    const hasLock = userLocks.add(userId, job.id);
  
    if(!hasLock){
      // Se não conseguiu o lock, move o job para "delayed" para tentar novamente em 1s
      // Isso mantém a mensagem na fila sem bloqueá-la para outros usuários
      console.log(`[Inbound] Usuário ${userId} ocupado. Reagendando Job ${job.id}...`);
      await job.moveToDelayed(Date.now() + 2000);
      throw new Error('LOCK_ACQUIRED_BY_ANOTHER_JOB'); // Interrompe a execução atual
    }

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
     Logger.error(`❌ Erro ao processar mensagem whatsapp${message.id}:`, error);

      await db.raw(
        `UPDATE whatsapp_messages 
         SET status = ?, error_message = ? 
         WHERE id = ?`,
        ['failed', error.message, dbId]
      );
    } finally {
      userLocks.remove(userId); // Libera o lock para esse usuário, permitindo que a próxima mensagem seja processada
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

whatsappWorker.on('failed', (job, err) => {
  Logger.error(`Job ${job.id} falhou após ${job.attemptsMade} tentativas:`, err.message);
});

whatsappWorker.on('error', (err) => {
  Logger.error('Erro no worker:', err);
});

console.log('🚀 Worker iniciado e aguardando mensagens...');

process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando worker...');
  await whatsappWorker.close();
  await chatWootWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando worker...');
  await whatsappWorker.close();
  await chatWootWorker.close();
  process.exit(0);
});
