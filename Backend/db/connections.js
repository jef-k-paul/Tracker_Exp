const mysql = require("mysql2");
require("dotenv").config();

let pool;

const rawHost = process.env.DB_HOST || "";
const rawUrl = process.env.DATABASE_URL || "";
const connectionUri = rawUrl.startsWith("mysql://") ? rawUrl : (rawHost.startsWith("mysql://") ? rawHost : null);

if (connectionUri) {
    try {
        const parsed = new URL(connectionUri);
        const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, "") : (process.env.DB_NAME || "family_expense_tracker");
        const dbConfig = {
            host: parsed.hostname,
            port: parsed.port ? Number(parsed.port) : 3306,
            user: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: dbName || "family_expense_tracker",
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }
        };
        pool = mysql.createPool(dbConfig);
    } catch (e) {
        pool = mysql.createPool(connectionUri);
    }
} else {
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

    pool = mysql.createPool(dbConfig);
}

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