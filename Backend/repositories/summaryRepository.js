const db = require("../db/connections");

exports.getTotalExpense = (month, year, circleId) => {
    return new Promise((resolve, reject) => {
        if (!circleId) {
            return reject(new Error("Active circleId is required for getTotalExpense."));
        }
        const query = `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE MONTH(expense_date) = ? AND YEAR(expense_date) = ? AND circle_id = ?
        `;
        db.query(query, [month, year, circleId], (err, res) => {
            if (err) return reject(err);
            resolve(Number(res[0]?.total || 0));
        });
    });
};

exports.getSharePerMember = (month, year, circleId) => {
    return new Promise((resolve, reject) => {
        if (!circleId) {
            return reject(new Error("Active circleId is required for getSharePerMember."));
        }
        const query = `
        SELECT es.member_id, COALESCE(SUM(es.share_amount), 0) AS total_share
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.expense_id
        WHERE MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ? AND e.circle_id = ?
        GROUP BY es.member_id
        `;
        db.query(query, [month, year, circleId], (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
};

exports.getPaidPerMember = (month, year, circleId) => {
    return new Promise((resolve, reject) => {
        if (!circleId) {
            return reject(new Error("Active circleId is required for getPaidPerMember."));
        }
        const query = `
        SELECT m.member_id, m.name, COALESCE(SUM(e.amount), 0) AS total_paid
        FROM expenses e
        JOIN members m ON e.paid_by = m.member_id
        WHERE MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ? AND e.circle_id = ?
        GROUP BY m.member_id
        `;
        db.query(query, [month, year, circleId], (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
};