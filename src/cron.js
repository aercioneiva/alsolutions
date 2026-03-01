const cron = require("node-cron");

const Logger = require("./libs/logger");

process.on("uncaughtException", (err) => {
  Logger.error(err);
  process.exit(1);
});

const { inactivity } = require("./cron-jobs/inactivity");
const { deleteWhatsappMessages } = require("./cron-jobs/old-messages-whatsapp");

// Define um cron job que será executado a cada minuto
cron.schedule("* * * * *", async () => {
  Logger.info("Task executed every 1 minute:");
  inactivity();
});

cron.schedule("0 * * * *", async () => {
  Logger.info("Task executed every 1 hour");
  deleteWhatsappMessages();
});

Logger.info("Cron job started...");

process.on("unhandledRejection", (reason, promise) => {
  Logger.error(reason);
  process.exit(1);
});

process.on("SIGTERM", () => {
  Logger.error("Received SIGTERM: Shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  Logger.error("Received SIGINT: Shutting down...");
  process.exit(0);
});
