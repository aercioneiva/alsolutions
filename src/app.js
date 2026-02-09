const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const errorHandler = require('./middleware/error-handler');
const basicAuth = require('./middleware/basic-auth');

const routes = require('./routes');
const { ZapNotificationsQueue, ChatQueue, HandleMessageWhatsappQueue, ZapQueue } = require('./libs/queue');

const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bullmq');

createBullBoard({
   queues: [
      new BullMQAdapter(HandleMessageWhatsappQueue),
      new BullMQAdapter(ZapQueue),
      new BullMQAdapter(ZapNotificationsQueue),
      new BullMQAdapter(ChatQueue)
   ],
   serverAdapter,
});

app.use(helmet());
app.disable('x-powered-by');
app.use(xss());
app.use(hpp());
app.use('/bullmq', basicAuth, serverAdapter.getRouter());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true }));


app.use('/api', routes);
app.get('/test', (req, res) => res.status(200).send('OK'));
app.all('*', (req, res) => res.status(404).send(`Can't find ${req.originalUrl} on this server!`));

app.use(errorHandler);

module.exports = app;
