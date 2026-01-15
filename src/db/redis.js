const Redis = require('ioredis');
const Logger = require('../libs/logger');

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

const client = new Redis(redisOptions);

client.on('error', function(error){
   Logger.error('Redis connection error:', error);
});

client.on('connect', function(){
   Logger.info('Redis connected successfully');
});

client.on('ready', function(){
   Logger.info('Redis is ready to receive commands');
});

client.on('close', function(){
   Logger.error('Redis connection closed');
});

client.on('reconnecting', function(){
   Logger.info('Redis reconnecting...');
});

// Test connection on startup
client.connect().catch(error => {
   Logger.error('Failed to connect to Redis:', error);
});

module.exports = client;
