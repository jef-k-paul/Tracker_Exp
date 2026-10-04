const db = require('../db/connections');

exports.findById = (accessKey) => {
    return new Promise((resolve, reject) => {
        const query = `
          SELECT m.member_id, m.user_id, m.name, m.role, m.access_key, m.circle_id, u.email, c.name AS circle_name, c.family_code
          FROM members m
          LEFT JOIN circles c ON m.circle_id = c.circle_id
          LEFT JOIN users u ON m.user_id = u.user_id
          WHERE m.access_key = ? AND m.is_active = TRUE
        `;

        db.query(query, [accessKey?.trim()], (err, results) => {
            if(err) return reject(err);
            resolve(results[0]);
        });
    });
};

exports.getAllActiveMembers = (circleId) => {
    return new Promise((resolve, reject) => {
        if (!circleId) {
            return reject(new Error("Active circleId is required to list circle members."));
        }

        const query = `SELECT member_id, name, role, circle_id FROM members WHERE is_active = TRUE AND circle_id = ?`;

        db.query(query, [circleId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

exports.getMembers = (circleId) => {
    return new Promise((resolve, reject) => {
        if (!circleId) {
            return reject(new Error("Active circleId is required to retrieve members."));
        }

        const query = `SELECT member_id, name, role, circle_id FROM members WHERE is_active = TRUE AND circle_id = ?`;

        db.query(query, [circleId], (err, results) => {
            if(err) return reject(err);
            resolve(results);
        });
    });
};

exports.getMemberInCircle = (memberId, circleId) => {
    return new Promise((resolve, reject) => {
        if (!memberId || !circleId) {
            return resolve(null);
        }

        const query = `
          SELECT member_id, name, role, circle_id, user_id, is_active 
          FROM members 
          WHERE member_id = ? AND circle_id = ? AND is_active = 1
        `;

        db.query(query, [memberId, circleId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0] || null);
        });
    });
};

exports.createMember = ({ name, role = "MEMBER", accessKey, circleId }) => {
    return new Promise((resolve, reject) => {
        if (!circleId) {
            return reject(new Error("circleId is required to create a member."));
        }

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