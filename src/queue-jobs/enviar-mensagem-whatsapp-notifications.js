const { enviarMensagemZapMeta } = require("../utils/send-message-whatsapp");

module.exports = {
  key: "EnviarMensagemWhatsappNotifications",
  async handle(data) {
    return await enviarMensagemZapMeta(data);
  }
};
