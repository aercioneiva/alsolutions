const { HandleMessageChatWootQueue } = require('../libs/queue');
const Logger = require('../libs/logger');


const CONSTANTS = {
   EVENTS: {
      MESSAGE_CREATED: 'message_created',
      CONVERSATION_STATUS_CHANGED: 'conversation_status_changed',
      CONVERSATION_CREATED: 'conversation_created'
   },
   MESSAGE_TYPES: {
      OUTGOING: 'outgoing'
   },
   CONVERSATION_STATUS: {
      RESOLVED: 'resolved',
      OPEN: 'open'
   }
};

exports.webhook = async (req) => {
   if (process.env.NODE_ENV === 'development') {
      console.log('[CHATWOOT] webhook message:', JSON.stringify(req.body, null, 1));
   }

   try {
      const { contract } = req.query;

      const eventType = req.body.event;
      const status = req.body.status;

      switch (true) {
         case eventType === CONSTANTS.EVENTS.MESSAGE_CREATED && req.body.message_type === CONSTANTS.MESSAGE_TYPES.OUTGOING:
            HandleMessageChatWootQueue.add('ProcessarMensagemChatWoot', { message : req.body, contract });   
            return new Response(true, 200, '');
         case eventType === CONSTANTS.EVENTS.CONVERSATION_STATUS_CHANGED && status === CONSTANTS.CONVERSATION_STATUS.RESOLVED:
            HandleMessageChatWootQueue.add('ProcessarMensagemChatWoot', { message : req.body, contract });
            return new Response(true, 200, '');
         case eventType === CONSTANTS.EVENTS.CONVERSATION_STATUS_CHANGED && status === CONSTANTS.CONVERSATION_STATUS.OPEN:
            HandleMessageChatWootQueue.add('ProcessarMensagemChatWoot', { message : req.body, contract });
            return new Response(true, 200, '');
         case eventType === CONSTANTS.EVENTS.CONVERSATION_CREATED && status === CONSTANTS.CONVERSATION_STATUS.OPEN:
            HandleMessageChatWootQueue.add('ProcessarMensagemChatWoot', { message : req.body, contract });
            return new Response(true, 200, '');
         default:
            return new Response(true, 200, '');
      }
   } catch (error) {
      Logger.error(`[CHATWOOT] Erro ao processar webhook: ${error.message}`);
      return new Response(true, 200, '');
   }
};