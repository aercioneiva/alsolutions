const db = require('knex')({
   client: 'mysql2',
   connection: {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DATABASE,
   },
   acquireConnectionTimeout: 30000,
   pool: { 
      min: 2,
      max: 10,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
   },
   // Adicionar health check
   healthCheck: {
      query: 'SELECT 1',
      interval: 30000
   }
});

module.exports = db;
