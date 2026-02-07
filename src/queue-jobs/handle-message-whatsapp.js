const { processMessageWhatsapp } = require('../services/whatsapp-service');
const Logger = require('../libs/logger');

module.exports = {
   key: 'ProcessarMensagemWhatsapp',
   async handle(data, job){
      try {
         await processMessageWhatsapp(data);
      } catch (error) {
         Logger.error('Error processing WhatsApp message job');
         throw error;
      }
   }
}
