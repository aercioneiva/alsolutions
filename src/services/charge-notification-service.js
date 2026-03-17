const axios = require("axios");
const Logger = require("../libs/logger");

const companyService = require("./company-service");
const { WhatsappNotificationsQueue } = require("../libs/queue");

exports.sendNotification = async (contract, message, number) => {
  if (!contract || !message || !number) {
    return false;
  }

  try {
    const company = await companyService.getCompany(contract);

    if (!company) {
      return false;
    }

    const data = {
      message: JSON.parse(message),
      number,
      contract
    };

    WhatsappNotificationsQueue.add("EnviarMensagemWhatsappNotifications", data);
  } catch (error) {
    Logger.error("Invalid message format");
    return false;
  }

  return true;
};
