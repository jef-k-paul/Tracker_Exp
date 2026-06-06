const expenseService = require("../services/expenseService");

exports.addExpense = async (req, res) => {
    try {
    console.log(req.body);

    const data = req.body;

    const result = await expenseService.addExpense(data);

    res.json({message: "Expense addition Success", expenseId: result});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: "Server Error - for addingExpense api"});
    }
};

exports.expenses = async (req, res) => {
    try {
        const { month, year }= req.query;
        const result = await expenseService.expenses(month, year);
        res.json(result);

    } catch(err) {
        console.error(err);
        res.status(500).json({message: "Server Error - for expenses api"});
    }
};