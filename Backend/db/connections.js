const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Sql@123",
    database: "family_expense_tracker"
});

connection.connect((err) => {
    if (err) {
    console.error("DB Connection Failed:", err);
    } else {
    console.log("Connected to MySQL");
    }
});

module.exports = connection;