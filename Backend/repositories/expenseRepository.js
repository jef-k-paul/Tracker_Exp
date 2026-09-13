const db = require("../db/connections");

exports.insertExpense = (data) => {
return new Promise((resolve, reject) => {
    const query = `
    INSERT INTO expenses 
    (amount, category_id, paid_by, expense_date, description, split_type)
    VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(query,[data.amount,data.categoryId,data.paidBy,data.date,data.description,data.splitType],(err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
    });
});
};

exports.insertSplit = ({ expenseId, memberId, shareAmount }) => {
return new Promise((resolve, reject) => {
    const query = `
    INSERT INTO expense_splits (expense_id, member_id, share_amount)
    VALUES (?, ?, ?)
    `;

    db.query(query, [expenseId, memberId, shareAmount], (err) => {
    if (err) return reject(err);
    resolve();
    });
});
}

exports.expenses = (month, year) => {
    return new Promise((resolve, reject) => {

        const query = `SELECT e.expense_id, e.amount, c.name AS category, m.name AS paid_by, e.paid_by AS paid_by_id, e.expense_date, e.description, e.split_type FROM expenses e JOIN categories c ON e.category_id = c.category_id JOIN members m ON e.paid_by = m.member_id WHERE MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ? ORDER BY e.expense_date DESC`;

        db.query(query, [month, year], (err, res) => {
            if(err)
                return reject(err);

            resolve(res);
        });
    });
};

exports.getSplitsForMonth = (month, year) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT es.expense_id, es.member_id, m.name AS member_name, es.share_amount FROM expense_splits es JOIN members m ON es.member_id = m.member_id JOIN expenses e ON es.expense_id = e.expense_id WHERE MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?`;

        db.query(query, [month, year], (err, res) => {
            if(err) return reject(err);
            resolve(res);
        });
    });
};

exports.findDuplicateExpense = ({ amount, categoryId, date }) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT e.expense_id, e.amount, e.expense_date, c.name AS category_name, m.name AS paid_by_name
            FROM expenses e
            JOIN categories c ON e.category_id = c.category_id
            JOIN members m ON e.paid_by = m.member_id
            WHERE e.amount = ? AND e.category_id = ? AND e.expense_date = ?
            LIMIT 1
        `;

        db.query(query, [amount, categoryId, date], (err, res) => {
            if (err) return reject(err);
            resolve(res[0] || null);
        });
    });
};