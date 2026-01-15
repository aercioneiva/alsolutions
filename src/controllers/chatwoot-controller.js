const chatwootService = require('../services/chatwoot-service');

exports.webhook = async (req, res) => {
   
   const response = await chatwootService.webhook(req);

   if(response.status == true){
      return res.sendStatus(200);
   }

   return res.status(response.statusCode).send(response.message);
}