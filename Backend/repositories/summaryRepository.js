const db = require("../db/connections");


exports.getTotalExpense = (month, year) => {

    return new Promise((resolve, reject) => {
        const query = `
        SELECT SUM(amount) AS total
        FROM expenses
        WHERE MONTH(expense_date) = ? AND YEAR(expense_date) = ?
        `;

        db.query(query, [month, year], (err, res) => {
        if (err) return reject(err);
        resolve(res[0].total || 0);
        });
    });
};

exports.getTotalExpense = (month, year) => {

    return new Promise((resolve, reject) => {
        const query = `
        SELECT SUM(amount) AS total
        FROM expenses
        WHERE MONTH(expense_date) = ? AND YEAR(expense_date) = ?
        `;

        db.query(query, [month, year], (err, res) => {
        if (err) return reject(err);
        resolve(res[0].total || 0);
        });
    });
};

exports.getSharePerMember = (month, year) => {

    return new Promise((resolve, reject) => {
        const query = `
        SELECT es.member_id, SUM(es.share_amount) AS total_share
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.expense_id
        WHERE MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
        GROUP BY es.member_id
        `;

        db.query(query, [month, year], (err, res) => {
        if (err) return reject(err);
        resolve(res);
        });
    });
};

exports.getPaidPerMember = (month, year) => {
    
    return new Promise((resolve, reject) => {
        const query = `
        SELECT m.member_id, m.name, SUM(e.amount) AS total_paid
        FROM expenses e
        JOIN members m ON e.paid_by = m.member_id
        WHERE MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
        GROUP BY m.member_id
        `;

        db.query(query, [month, year], (err, res) => {
        if (err) return reject(err);
        resolve(res);
        });
    });
};