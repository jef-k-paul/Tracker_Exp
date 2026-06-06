const categoryRepository = require("../repositories/categoryRepository");

exports.getCategories = async () => {
    
    return await categoryRepository.getCategories();
}