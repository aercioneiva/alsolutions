const Cache = require('../libs/cache');
const companyService = require('./company-service');
const WhatsappMessageRepository = require('../repositories/whatsapp-message-repository');
const Logger = require('../libs/logger');
const Response = require('../utils/response');
const { HandleMessageWhatsappQueue } = require('../libs/queue');

function _makeMessage() {
   return new WhatsappMessageRepository();
}

async function _enqueueMessage(message, metadata, contacts, contract) {
  const userId = contacts?.[0]?.wa_id;
  const messageId = message.id;

  try {
   const insertId = await _createMessage(message, metadata, contacts, contract);

   if(insertId > 0){
      HandleMessageWhatsappQueue.add('ProcessarMensagemWhatsapp', { message, metadata, contacts, contract, dbId: insertId }, { jobId: `${userId}-${messageId}` });
   }

  } catch (error) {
    console.error('Erro ao enfileirar mensagem:', error);
  }
}

async function _createMessage(message, metadata, contacts, contract){
   const messageRepository = _makeMessage();

   try {
      const messageId = await messageRepository.create(
         message.id,
         contacts?.[0]?.wa_id || null,
         metadata.phone_number_id,
         JSON.stringify({ message, metadata, contacts }),
         'pending',
         contract
      );
      return messageId;
   } catch (error) {
      console.log(error);
      Logger.error(`[SERVICE-MESSAGE] Erro ao cadastrar mensagem:`,error);
   }
   
   return null;
}

exports.webhook = async(req) => {
   try {
      if(req.body.entry?.[0]?.changes[0]?.value?.statuses){
         return new Response(true, 200, '');
      }

      if(process.env.NODE_ENV == 'development'){
         console.log("Zap webhook message:", JSON.stringify(req.body, null, 2));
      }

      if (req.body.object !== 'whatsapp_business_account' || !req.body.entry || !Array.isArray(req.body.entry)) {
         return new Response(false, 200, '');
      }
      
      const contract = req.query?.contract;

      if(!contract){
         Logger.error(`[WHATSAPP] Não foi informado o contrato da integração`);
         return new Response(false, 200, '');
      }

      const cacheCompany = await Cache.get(contract);

      if(!cacheCompany){
         const responseCompany = await companyService.getCompany(contract);

         if(!responseCompany){
            Logger.error(`[WHATSAPP] Não achou a integracão ${contract}`);
            return new Response(false, 200, '');
         }
      }
      
      for (const entry of req.body.entry) {
         for (const change of entry.changes) {
            if (change.field === 'messages') {
               const value = change.value;
               if (value.messages) {
                  for (const message of value.messages) {
                     await _enqueueMessage(message, value.metadata, value.contacts, contract);
                  }
               }
            }
         }
      }

      return new Response(true, 200, '');
   } catch (error) {
      Logger.error(`[WHATSAPP] Erro ao processar webhook: ${error.message}`);
      return new Response(true, 200, '');
   }
}
