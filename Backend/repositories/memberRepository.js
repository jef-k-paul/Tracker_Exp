const db = require('../db/connections');

exports.findById = (accessKey) => {
    return new Promise((resolve, reject) => {
        const query = `
          SELECT m.member_id, m.name, m.role, m.access_key, m.circle_id, c.name AS circle_name, c.family_code
          FROM members m
          LEFT JOIN circles c ON m.circle_id = c.circle_id
          WHERE m.access_key = ? AND m.is_active = TRUE
        `;

        db.query(query, [accessKey?.trim()], (err, results) => {
            if(err) return reject(err);
            resolve(results[0]);
        });
    });
};

exports.getAllActiveMembers = (circleId = null) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT member_id, name, circle_id FROM members WHERE is_active = TRUE AND name NOT LIKE "%ADMIN%"`;
        const params = [];
        if (circleId) {
            query += ` AND circle_id = ?`;
            params.push(circleId);
        }

        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

exports.getMembers = (circleId = null) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT member_id, name, circle_id FROM members WHERE is_active = TRUE AND name NOT LIKE "%ADMIN%"`;
        const params = [];
        if (circleId) {
            query += ` AND circle_id = ?`;
            params.push(circleId);
        }

        db.query(query, params, (err, results) => {
            if(err) return reject(err);
            resolve(results);
        });
    });
};

exports.createMember = ({ name, role = "MEMBER", accessKey, circleId = 1 }) => {
    return new Promise((resolve, reject) => {
        const query = `
          INSERT INTO members (name, role, access_key, circle_id, is_active)
          VALUES (?, ?, ?, ?, 1)
        `;
        db.query(query, [name, role, accessKey, circleId], (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};