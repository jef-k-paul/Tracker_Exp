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

        const query = `SELECT e.expense_id, e.amount, c.name AS category, m.name AS paid_by, e.expense_date, e.description, e.split_type FROM expenses e JOIN categories c ON e.category_id = c.category_id JOIN members m ON e.paid_by = m.member_id WHERE MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ? ORDER BY e.expense_date DESC`;

        db.query(query, [month, year], (err, res) => {
            if(err)
                return reject(err);

            resolve(res);
        });
    });
}

console.log(module.exports);