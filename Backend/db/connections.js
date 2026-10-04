const mysql = require("mysql2");
require("dotenv").config();

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Sql@123",
    database: process.env.DB_NAME || "family_expense_tracker",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

// Cloud databases (TiDB, Aiven) require SSL encryption
if (process.env.DB_SSL === "true" || process.env.TIDB_SSL === "true") {
    dbConfig.ssl = { minVersion: "TLSv1.2", rejectUnauthorized: true };
}

const pool = mysql.createPool(dbConfig);

// Verify pool connectivity on boot
pool.getConnection((err, conn) => {
    if (err) {
        console.error("DB Pool Connection Failed:", err);
    } else {
        console.log("Connected to MySQL via Connection Pool (10 max connections)");
        conn.release();
    }
});

module.exports = pool;