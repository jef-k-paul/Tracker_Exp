const memberService = require("../services/memberService");

exports.getMembers = async (req, res) => {
    try {
        const circleId = req.user?.circleId;
        if (!circleId) {
            return res.status(400).json({ message: "You must belong to an active circle to view members." });
        }
        const result = await memberService.getMembers(circleId);
        res.json(result);
    } catch(err) {
        console.error("Error fetching circle members:", err);
        res.status(500).json({
            message: err.message || "Server error fetching members."
        });
    }  
};