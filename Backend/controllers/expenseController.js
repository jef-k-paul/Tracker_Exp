const expenseService = require("../services/expenseService");

exports.addExpense = async (req, res) => {
    try {
    console.log(req.body);

    const data = req.body;

    const result = await expenseService.addExpense(data);

    res.json({message: "Expense addition Success", expenseId: result});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: "Server Error"});
    }
};