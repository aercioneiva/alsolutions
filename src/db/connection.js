const knex = require("knex");

const db = knex({
  client: "mysql2",
  connection: {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DATABASE,
  },
  pool: {
    min: 2,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 10000,
    afterCreate: function (conn, done) {
      conn.query("SELECT 1", function (err) {
        done(err, conn);
      });
    },
  },
  asyncStackTraces: process.env.NODE_ENV !== "production",
});

if (process.env.NODE_ENV !== "production") {
  db.on("query", (queryData) => {
    console.log("SQL:", queryData.sql, queryData.bindings);
  });
}

module.exports = db;
