const Redis = require('ioredis');

const redisOptions = {
   port: process.env.REDIS_PORT || 6379,
   host: process.env.REDIS_HOST || 'localhost',
   username: process.env.REDIS_USER,
   password: process.env.REDIS_PASS,
   db: process.env.REDIS_DB || 0,
   maxRetriesPerRequest: null,
   retryStrategy: function (times) {
      return Math.max(Math.min(Math.exp(times), 20000), 1000);
   },
   connectTimeout: 10000,
   lazyConnect: true
};




const createRedisConnection = () => {
   const client = new Redis(redisOptions);

   client.on('connect', () => {
      console.log('✅ Redis conectado com sucesso!');
   });

   client.on('error', (err) => {
      console.error('❌ Erro na conexão com o Redis:', err);
   });

   client.on('close', () => {
      console.warn('⚠️ Conexão com o Redis encerrada.');
   });

   return client;
};

module.exports = { createRedisConnection };
