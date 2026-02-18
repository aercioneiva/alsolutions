const { processMessageChatWoot } = require('../services/chatwoot-service');
const Logger = require('../libs/logger');

module.exports = {
   key: 'ProcessarMensagemChatWoot',
   async handle(data, job){
      try {
         await processMessageChatWoot(data);
      } catch (error) {
         Logger.error('Error processing ChatWoot message job');
         throw error;
      }
   }
}
