const db = require("../db/connections");

exports.insertExpense = (data) => {
return new Promise((resolve, reject) => {
    const query = `
    INSERT INTO expenses 
    (amount, category_id, paid_by, expense_date, description, split_type)
    VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
    query,
    [
        data.amount,
        data.categoryId,
        data.paidBy,
        data.date,
        data.description,
        data.splitType
    ],
    (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
    }
    );
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
};