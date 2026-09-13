const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Sql@123",
    database: process.env.DB_NAME || "family_expense_tracker",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
});

connection.connect((err) => {
    if (err) {
        console.error("DB Connection Failed:", err);
    } else {
        console.log("Connected to MySQL");
    }
});

module.exports = connection;