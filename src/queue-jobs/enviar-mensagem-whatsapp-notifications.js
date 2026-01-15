const { enviarMensagemZapMeta } = require('../utils/send-message-whatsapp');

module.exports = {
   key: 'EnviarMensagemZapNotifications',
   async handle(data){
      return await enviarMensagemZapMeta(data);
   }
}
