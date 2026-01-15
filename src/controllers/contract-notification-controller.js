const contractNotificationService = require('../services/contract-notification-service');

exports.sendNotification = async (req, res) => {
   const { contract } = req.params;
   const { Cliente, Contrato, Evento } = req.body;
   const { number } = req.query

   const sent = await contractNotificationService.sendNotification(contract, Cliente, Contrato, Evento, number);

   if(!sent){
      return res.status(400).send();
   }

   return res.status(201).send('{"status": true}');
}
