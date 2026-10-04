const expenseService = require("../services/expenseService");
const memberRepository = require("../repositories/memberRepository");

exports.addExpense = async (req, res) => {
    try {
        console.log("Add Expense Request:", req.body);
        const circleId = req.user?.circleId;
        if (!circleId) {
            return res.status(400).json({ message: "You must belong to an active circle to add an expense." });
        }
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
        const circleId = req.user?.circleId;
        if (!circleId) {
            return res.status(400).json({ message: "You must belong to an active circle to view expenses." });
        }
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
        const circleId = req.user?.circleId;
        if (!circleId) {
            return res.status(400).json({ message: "Active circle is required to check duplicates." });
        }
        const duplicate = await expenseService.checkDuplicate(amount, categoryId, date, circleId);
        res.json({ isDuplicate: !!duplicate, duplicateInfo: duplicate || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error checking duplicate" });
    }
};

exports.getAllTimePaid = async (req, res) => {
    try {
        const circleId = req.user?.circleId;
        if (!circleId) {
            return res.status(400).json({ message: "You must belong to an active circle." });
        }
        const memberId = req.query.memberId || req.user?.memberId;
        if (!memberId) {
            return res.status(400).json({ message: "Member ID is required." });
        }

        // Verify member belongs to the active circle to prevent IDOR / cross-circle inspection
        const member = await memberRepository.getMemberInCircle(memberId, circleId);
        if (!member) {
            return res.status(403).json({ message: "Access denied. Member does not belong to your active circle." });
        }

        const total = await expenseService.getAllTimePaid(memberId, circleId);
        res.json({ memberId: Number(memberId), allTimeTotal: total });
    } catch (err) {
        console.error("Error fetching all-time paid total:", err);
        res.status(500).json({ message: "Server error fetching all-time expenses." });
    }
};

exports.getAllTimeShare = async (req, res) => {
    try {
        const circleId = req.user?.circleId;
        if (!circleId) {
            return res.status(400).json({ message: "You must belong to an active circle." });
        }
        const memberId = req.query.memberId || req.user?.memberId;
        if (!memberId) {
            return res.status(400).json({ message: "Member ID is required." });
        }

        // Verify member belongs to the active circle to prevent IDOR / cross-circle inspection
        const member = await memberRepository.getMemberInCircle(memberId, circleId);
        if (!member) {
            return res.status(403).json({ message: "Access denied. Member does not belong to your active circle." });
        }

        const share = await expenseService.getAllTimeShare(memberId, circleId);
        res.json({ memberId: Number(memberId), allTimeShare: share });
    } catch (err) {
        console.error("Error fetching all-time share total:", err);
        res.status(500).json({ message: "Server error fetching all-time share." });
    }
};