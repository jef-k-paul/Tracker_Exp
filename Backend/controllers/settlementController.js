const settlementService = require("../services/settlementService");

exports.getSettlements = async (req, res) => {

    try {
        const { month, year } = req.query; // gets these from the url query string

        const result = await settlementService.calculateSettlements( month, year );

        res.json(result);

    } catch (err){
        console.error(err);

        res.status(500).json({
            message : "Server error"
        });
    }

};