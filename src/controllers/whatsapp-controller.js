const Logger = require("../libs/logger");
const whatsappMessageService = require("../services/whatsapp-message-service");
const Cache = require("../libs/cache");
const companyService = require("../services/company-service");
const crypto = require("crypto");

exports.webhookConfig = async (req, res) => {
  const verifyToken = "ALSOLUTIONS";

  // Parse params from the webhook verification request
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode == "subscribe" && token == verifyToken) {
      Logger.info(`[WHATSAPP] WEBHOOK_VERIFIED`);
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  }

  return res.sendStatus(200);
};

exports.webhook = async (req, res) => {
  const contract = req.query?.contract;

  if (!contract) {
    Logger.error(`[WHATSAPP] Não foi informado o contrato da integração`);
    return res.sendStatus(200);
  }

  const cacheCompany = await Cache.get(contract);
  let secret_whatsapp = null;

  if (!cacheCompany) {
    const responseCompany = await companyService.getCompany(contract);

    if (!responseCompany) {
      Logger.error(`[WHATSAPP] Não achou a integracão ${contract}`);
      return res.sendStatus(200);
    }
    secret_whatsapp = responseCompany.secret_whatsapp;
  } else {
    secret_whatsapp = cacheCompany.secret_whatsapp;
  }

  if (!validateSignature(req, secret_whatsapp)) {
    console.error("Assinatura do Webhook inválida!");
    return res.sendStatus(403);
  }

  const response = await whatsappMessageService.webhook(req);

  if (response.status == true) {
    return res.sendStatus(200);
  }

  return res.status(response.statusCode).send(response.message);
};

const validateSignature = (req, secret) => {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const body = JSON.stringify(req.body);

  const elements = signature.split("=");
  const signatureHash = elements[1];
  const expectedHash = crypto.createHmac("sha256", secret).update(body).digest("hex");

  return signatureHash === expectedHash;
};
