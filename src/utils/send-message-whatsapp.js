const dotenv = require('dotenv');
dotenv.config();
const axios = require('axios');

const Logger = require('../libs/logger');

exports.enviarMensagemZapMeta = async function(data){
   const token_zap = process.env.ZAP_TOKEN;
   if (!token_zap) {
      Logger.error('[WHATSAPP] ZAP_TOKEN not configured');
      return false;
   }
   
   if (!process.env.ZAP_URL) {
      Logger.error('[WHATSAPP] ZAP_URL not configured');
      return false;
   }

   try {
      const response = await axios({
         method: "POST",
         url: `${process.env.ZAP_URL}/${data.id_whatsapp}/messages`,
         headers: {
            Authorization: `Bearer ${token_zap}`,
            'Content-Type': 'application/json'
         },
         data: data,
         timeout: 30000 // 30 segundos de timeout
      });

      return true;
   } catch (error) {
      Logger.error('[WHATSAPP] Error sending message to Meta', error.status);
   }

   return false;
}
