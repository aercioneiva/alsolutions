const { sendMessageWhatsapp } = require('../services/whatsapp-service');
const Logger = require('../libs/logger');

module.exports = {
   key: 'EnviarMensagemWhatsapp',
   async handle(data, job){
      try {
         await sendMessageWhatsapp(data);
      } catch (error) {
         Logger.error('Error processing WhatsApp message job');
         throw error;
      }
   }
}
