const dotenv = require('dotenv');
dotenv.config();
const axios = require('axios');
const FormData = require('form-data');
const Logger = require('../libs/logger');

exports.enviarMensagemChatWoot = async function(chatwoot, { data, conversationId }){
   
   try {
      const formData = new FormData();
      formData.append('message_type', 'incoming');

      if(data.type == 'content'){
         formData.append('content', data.content);
      }else{
         const file = Buffer.from(data.file, 'base64');
         formData.append('attachments[]',file,data.fileName);
      }
      
      const headers = { headers: { 'api_access_token': chatwoot.token , ...formData.getHeaders() } };
      await axios.post(`${process.env.CHATWOOT_URL}/accounts/${chatwoot.account}/conversations/${conversationId}/messages`,formData,headers);

      return true;
   } catch (error) {
      Logger.error(error);
   }

   return false;
}