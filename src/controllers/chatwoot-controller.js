const chatwootMessageService = require('../services/chatwoot-message-service');

exports.webhook = async (req, res) => {
   
   const response = await chatwootMessageService.webhook(req);
   if(response.status == true){
      return res.sendStatus(200);
   }

   return res.status(response.statusCode).send(response.message);
}