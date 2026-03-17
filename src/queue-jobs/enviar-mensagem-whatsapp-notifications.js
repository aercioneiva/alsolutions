const { sendMessageWhatsappNotificaion } = require("../services/whatsapp-service");
const { getTemplateNotificationMessage } = require("../utils/template-message-whatsapp");
const Logger = require("../libs/logger");
const companyService = require("../services/company-service");

module.exports = {
  key: "EnviarMensagemWhatsappNotifications",
  async handle(data, job) {
    try {
      const { message, number, contract } = data;
      const responseCompany = await companyService.getCompany(contract);

      if (!responseCompany) {
        Logger.error("Company not found");
        return;
      }

      const whatsappMessage = {
        id: responseCompany.id_whatsapp,
        version: responseCompany.version_whatsapp,
        token: responseCompany.token_whatsapp
      };

      const templateMessage = getTemplateNotificationMessage(
        `55${number}`,
        message.params.nome_cliente,
        message.order_details.valor,
        message.order_details.copia_e_cola,
        message.order_details.linha_digitavel.replace(/\D/g, "")
      );

      await sendMessageWhatsappNotificaion(whatsappMessage, templateMessage);
    } catch (error) {
      Logger.error("Error processing WhatsApp notification job");
      console.error(error);
    }
  }
};
