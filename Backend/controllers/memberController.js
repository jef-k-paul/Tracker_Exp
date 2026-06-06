const memberService = require("../services/memberService");

exports.getMembers = async (req, res) => {

    try {
        const result = await memberService.getMembers();
        
        res.json(result);

    } catch(err) {
        console.error(err);

        res.status(500).json({
            message: "Server error"
        });
    }  
};