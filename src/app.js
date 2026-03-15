const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const errorHandler = require("./middleware/error-handler");
const basicAuth = require("./middleware/basic-auth");

const routes = require("./routes");
const { WhatsappNotificationsQueue, HandleMessageChatWootQueue, HandleMessageWhatsappQueue, ZapQueue } = require("./libs/queue");

const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/bullmq");

createBullBoard({
  queues: [
    new BullMQAdapter(HandleMessageWhatsappQueue),
    new BullMQAdapter(ZapQueue),
    new BullMQAdapter(WhatsappNotificationsQueue),
    new BullMQAdapter(HandleMessageChatWootQueue)
  ],
  serverAdapter
});

app.use(helmet());
app.disable("x-powered-by");
app.use(xss());
app.use(hpp());
app.use("/bullmq", basicAuth, serverAdapter.getRouter());
// Rota do webhook do whatsapp precisa receber o raw body por causa da validação da assinatura, então colocamos ela antes do express.json()
app.use("/api/v1/whatsapp-webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);
app.get("/test", (req, res) => res.status(200).send("OK"));
app.all("*", (req, res) => res.status(404).send(`Can't find ${req.originalUrl} on this server!`));

app.use(errorHandler);

module.exports = app;
