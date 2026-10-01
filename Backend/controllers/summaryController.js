const summaryService = require("../services/summaryService");

exports.getSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const circleId = req.user?.circleId || null;
        const data = await summaryService.getSummary(month, year, circleId);

        res.json(data);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
