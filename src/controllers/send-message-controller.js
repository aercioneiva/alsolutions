const sendMessageService = require('../services/send-message-service');

exports.sendMessage = async (req, res) => {
   const { contract } = req.params;
   const { message, numbers } = req.query;

   const sent = await sendMessageService.sendMessage(contract, message, numbers);

   if(!sent){
      return res.status(400).send();
   }

   return res.status(201).send('{"status": true}');
}