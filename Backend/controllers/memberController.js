const memberService = require("../services/memberService");

exports.getMembers = async (req, res) => {
    try {
        const circleId = req.user?.circleId || null;
        const result = await memberService.getMembers(circleId);
        res.json(result);
    } catch(err) {
        console.error(err);
        res.status(500).json({
            message: "Server error"
        });
    }  
};