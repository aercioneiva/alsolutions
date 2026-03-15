const axios = require("axios");
const Logger = require("../libs/logger");

const companyService = require("./company-service");
const { WhatsappNotificationsQueue } = require("../libs/queue");

exports.sendNotification = async (contract, message, number) => {
  if (!contract || !message || !number) {
    return false;
  }

  const company = await companyService.getCompany(contract);

  if (!company) {
    return false;
  }

  const data = {
    message,
    number,
    contract
  };

  WhatsappNotificationsQueue.add("EnviarMensagemWhatsappNotifications", data);

  return true;
};
