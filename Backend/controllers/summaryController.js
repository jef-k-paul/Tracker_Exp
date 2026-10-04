const summaryService = require("../services/summaryService");

exports.getSummary = async (req, res) => {
    try {
        const circleId = req.user?.circleId;
        if (!circleId) {
            return res.status(400).json({ message: "You must belong to an active circle to view monthly summary." });
        }

        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: "Month and year query parameters are required." });
        }

        const data = await summaryService.getSummary(month, year, circleId);
        res.json(data);
    } catch(err) {
        console.error("Summary error:", err);
        res.status(500).json({ message: err.message || "Server error fetching summary." });
    }
};
