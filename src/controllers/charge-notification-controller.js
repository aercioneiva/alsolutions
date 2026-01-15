const chargeNotificationService = require('../services/charge-notification-service');

exports.sendNotification = async (req, res) => {
   const { contract } = req.params;
   const { message, numbers } = req.query;

   const sent = await chargeNotificationService.sendNotification(contract, message, numbers);

   if(!sent){
      return res.status(400).send();
   }

   return res.status(201).send('{"status": true}');
}
