const expenseService = require("../services/expenseService");

exports.addExpense = async (req, res) => {
    try {
        console.log("Add Expense Request:", req.body);
        const data = req.body;
        const result = await expenseService.addExpense(data);
        res.json({ message: "Expense added successfully", expenseId: result });
    } catch(err) {
        console.error("Expense addition error:", err.message);
        if (err.isDuplicate) {
            return res.status(409).json({
                isDuplicate: true,
                message: err.message.replace("DUPLICATE_WARNING: ", ""),
                duplicateInfo: err.duplicateInfo
            });
        }
        res.status(400).json({ message: err.message || "Failed to add expense." });
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

exports.checkDuplicate = async (req, res) => {
    try {
        const { amount, categoryId, date } = req.query;
        const duplicate = await expenseService.checkDuplicate(amount, categoryId, date);
        res.json({ isDuplicate: !!duplicate, duplicateInfo: duplicate || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error checking duplicate" });
    }
};