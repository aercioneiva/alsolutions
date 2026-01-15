const axios = require('axios');

const Logger = require('../libs/logger');

exports.getFileWhatsapp = async(idMedia) => {
   const token_zap = process.env.ZAP_TOKEN;

   try {
      const ret_url_file = await axios({
         method: "GET",
         url: `${process.env.ZAP_URL}/${idMedia}`,
         headers: {
            Authorization: `Bearer ${token_zap}`,
            'Content-Type': 'application/json'
         }
      });

      if(ret_url_file.data?.url){
         const ret_get_file = await axios({
            method: "GET",
            url: ret_url_file.data?.url,
            responseType: 'arraybuffer',
            responseEncoding: 'binary',
            headers: {
               Authorization: `Bearer ${token_zap}`
            }
         });

         return ret_get_file.data;
      }
   } catch (error) {
      Logger.error(`[WHATSAPP] Não conseguiu recuperar arquivo no facebook`);
   }

   return null;
}
