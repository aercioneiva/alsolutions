const dotenv = require('dotenv');
dotenv.config();
const axios = require('axios');
const FormData = require('form-data');


const Logger = require('../libs/logger');

async function enviarMensagemChatWoot({data, account, conversationId}){
   const token_chatwoot = process.env.CHATWOOT_TOKEN;
   
   try {
      const formData = new FormData();
      formData.append('message_type', 'incoming');

      if(data.type == 'content'){
         formData.append('content', data.content);
      }else{
         const file = Buffer.from(data.file, 'base64');
         formData.append('attachments[]',file,data.fileName);
      }
      
      const headers = { headers: { 'api_access_token': token_chatwoot , ...formData.getHeaders() } };
      await axios.post(`${process.env.CHATWOOT_URL}/accounts/${account}/conversations/${conversationId}/messages`,formData,headers);

      return true;
   } catch (error) {
      Logger.error(error);
   }

   return false;
}

module.exports = {
   key: 'EnviarMensagemChatWoot',
   async handle(data){
      return await enviarMensagemChatWoot(data);
   }
}
