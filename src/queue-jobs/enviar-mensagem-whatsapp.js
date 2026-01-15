const { enviarMensagemZapMeta } = require('../utils/send-message-whatsapp');
const Logger = require('../libs/logger');

module.exports = {
   key: 'EnviarMensagemZap',
   async handle(data, job){
      try {
         Logger.info('Processing WhatsApp message job');

         let result = false;
         
         result = await enviarMensagemZapMeta(data);
        
         if(result) {
            Logger.info('WhatsApp message sent successfully');
         } else {
            Logger.error('WhatsApp message failed to send',result);
         }
         return result;
      } catch (error) {
         Logger.error('Error processing WhatsApp message job');
         throw error;
      }
   }
}
