const http = require("http");

const app = require("./app");
const Logger = require("./libs/logger");

const server = http.createServer(app);

async function main() {
  server.listen(process.env.PORT ?? 3001, async () => {
    Logger.info(`Listening on port ${process.env.PORT ?? 3001}...`);
    console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const now = new Date();
    console.log(now.toLocaleString("pt-BR"));
  });

  process.on("uncaughtException", (err) => {
    Logger.error(err);

    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    Logger.error(reason);

    server.close(() => {
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    Logger.error("Received SIGTERM: Shutting down...");

    server.close(() => {
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    Logger.error("Received SIGINT: Shutting down...");

    server.close(() => {
      process.exit(0);
    });
  });
}

main();
