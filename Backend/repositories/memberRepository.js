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
        const query = `SELECT member_id, name FROM members WHERE is_active = TRUE AND name not like "%ADMIN%"`;

        db.query(query, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

exports.getMembers = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT member_id, name from members where is_active = TRUE AND name not like "%ADMIN%"`;

        db.query(query, (err, results) => {
            if(err) 
                return reject(err);
            
            resolve(results);
        });
    });
};