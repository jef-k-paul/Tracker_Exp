const categoryService = require("../services/categoryService");

exports.getCategories = async (req, res) => {

    try {
        const result = await categoryService.getCategories();

        res.json(result);

    } catch(err) {
        
        console.error(err);
        res.status(500).json({
            message: "Server error"
        });
    }
};