const axios = require('axios');

const Logger = require('../libs/logger');

exports.startTypeBot = async (data) => {
   const token = process.env.TYPEBOT_TOKEN;
   try {
      const res = await axios({
         method: "POST",
         url: `${process.env.TYPEBOT_URL}/typebots/loga/startChat`,
         headers: {
         Authorization: `Bearer ${token}`,
         'Content-Type': 'application/json'
         },
         data : data
      });

      return res.data;
   } catch (error) {
      Logger.error(`[WHATSAPP] Não conseguiu iniciar o TypeBot`);
      Logger.info(error);
   }
   return null;
}

exports.sendMessageTypeBot = async(data, session) => {
   const token = process.env.TYPEBOT_TOKEN;

   try {
      const res = await axios({
         method: "POST",
         url: `${process.env.TYPEBOT_URL}/sessions/${session}/continueChat`,
         headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
         },
         data : data
      });

      return res.data;
   } catch (error) {
      Logger.error(`[WHATSAPP] Não conseguiu enviar a conversa para o TypeBot`);
      Logger.info(error);
   }

   return null;
}
