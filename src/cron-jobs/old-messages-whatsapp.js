const dotenv = require('dotenv');
dotenv.config();

const Logger = require('../libs/logger');
const whatsappMessageService = require('../services/whatsapp-message-service');



exports.deleteWhatsappMessages = async () =>{
   try {
     whatsappMessageService.deleteOldMessages();
   } catch (error) {
      Logger.error(`Error executing deleteWhatsappMessages cron job:`);
   }
}
