const { enviarMensagemZapMeta } = require('../utils/send-message-whatsapp');

module.exports = {
   key: 'EnviarMensagemZapApi',
   async handle(data){
      return await enviarMensagemZapMeta(data);
   }
}
