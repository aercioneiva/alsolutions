const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DATABASE,
    timezone: 'UTC'
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000
  }
});

db.client.pool.on('acquireRequest', () => {
  console.log('🔄 Pedindo conexão...');
});

db.client.pool.on('acquireSuccess', () => {
  console.log('✅ Conexão adquirida');
});

db.client.pool.on('release', () => {
  console.log('♻️ Conexão liberada');
});

module.exports = db;

