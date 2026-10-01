const expenseService = require("../services/expenseService");

exports.addExpense = async (req, res) => {
    try {
        console.log("Add Expense Request:", req.body);
        const circleId = req.user?.circleId || 1;
        const data = { ...req.body, circleId };
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
        const { month, year } = req.query;
        const circleId = req.user?.circleId || null;
        const result = await expenseService.expenses(month, year, circleId);
        res.json(result);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - for expenses api" });
    }
};

exports.checkDuplicate = async (req, res) => {
    try {
        const { amount, categoryId, date } = req.query;
        const circleId = req.user?.circleId || null;
        const duplicate = await expenseService.checkDuplicate(amount, categoryId, date, circleId);
        res.json({ isDuplicate: !!duplicate, duplicateInfo: duplicate || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error checking duplicate" });
    }
};

exports.getAllTimePaid = async (req, res) => {
    try {
        const memberId = req.query.memberId || req.user?.memberId;
        if (!memberId) {
            return res.status(400).json({ message: "Member ID is required." });
        }
        const total = await expenseService.getAllTimePaid(memberId);
        res.json({ memberId: Number(memberId), allTimeTotal: total });
    } catch (err) {
        console.error("Error fetching all-time paid total:", err);
        res.status(500).json({ message: "Server error fetching all-time expenses." });
    }
};

exports.getAllTimeShare = async (req, res) => {
    try {
        const memberId = req.query.memberId || req.user?.memberId;
        if (!memberId) {
            return res.status(400).json({ message: "Member ID is required." });
        }
        const share = await expenseService.getAllTimeShare(memberId);
        res.json({ memberId: Number(memberId), allTimeShare: share });
    } catch (err) {
        console.error("Error fetching all-time share total:", err);
        res.status(500).json({ message: "Server error fetching all-time share." });
    }
};