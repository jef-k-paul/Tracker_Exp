const mysql = require("mysql2");
require("dotenv").config();

// Create robust connection pool for high concurrency and connection re-use
const pool = mysql.createPool({
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
});

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