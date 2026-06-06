const db = require("../db/connections");

exports.getCategories = () => {
    return new Promise((resolve, reject)=>{
        const query = `SELECT category_id, name FROM categories`;

        db.query(query, (err, results)=> {
            
            if(err)
                return reject(err);
            
            return resolve(results);
        });
    });
};