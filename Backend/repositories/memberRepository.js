const db = require('../db/connections');

exports.findById = (accessKey) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT member_id, name, role FROM members WHERE access_key = ? AND is_active = TRUE';


        db.query(query, [accessKey], (err, results) => {
            if(err) return reject;

            resolve(results[0]); //first object/user
        });
    });
};

exports.getAllActiveMembers = () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT member_id FROM members WHERE is_active = TRUE";

        db.query(query, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    })
}