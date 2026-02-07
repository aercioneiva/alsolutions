
const Logger = require('../libs/logger');
const whatsappMessageService = require('../services/whatsapp-message-service');

exports.webhookConfig = async (req, res) =>{
   const verifyToken = "ALSOLUTIONS";

   // Parse params from the webhook verification request
   const mode = req.query["hub.mode"];
   const token = req.query["hub.verify_token"];
   const challenge = req.query["hub.challenge"];

   if(mode && token){
      if(mode == "subscribe" && token == verifyToken){
         Logger.info(`[WHATSAPP] WEBHOOK_VERIFIED`);
         return res.status(200).send(challenge);
      } 

      return res.sendStatus(403);
   }
      
   return res.sendStatus(200);
}

exports.webhook = async (req, res) => {
   
   const response = await whatsappMessageService.webhook(req);

   if(response.status == true){
      return res.sendStatus(200);
   }

   return res.status(response.statusCode).send(response.message);
}
