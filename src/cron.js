const cron = require('node-cron');

const Logger = require('./libs/logger');

process.on('uncaughtException', (err) => {
   Logger.error(err);
   process.exit(1);
});

const { inactivity } = require('./cron-jobs/inactivity');


// Define um cron job que será executado a cada minuto
cron.schedule('* * * * *', async () => {
   Logger.info('Task executed every 1 minute:');
   inactivity();
});


Logger.info('Cron job started...');


process.on('unhandledRejection', (reason, promise) => {
   Logger.error(reason);
   process.exit(1);
});

process.on('SIGTERM', () => {
   Logger.error('Received SIGTERM: Shutting down...');
   process.exit(0);
});

process.on('SIGINT', () => {
   Logger.error('Received SIGINT: Shutting down...');
   process.exit(0);
});
