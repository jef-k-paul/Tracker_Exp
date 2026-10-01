const db = require("../db/connections");

exports.createCircle = ({ name, familyCode, createdBy = null }) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO circles (name, family_code, created_by)
      VALUES (?, ?, ?)
    `;
    db.query(query, [name, familyCode, createdBy], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};

exports.getCircleById = (circleId) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM circles WHERE circle_id = ?`;
    db.query(query, [circleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.getCircleByFamilyCode = (familyCode) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM circles WHERE family_code = ?`;
    db.query(query, [familyCode?.trim()?.toUpperCase()], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.getCircleMembers = (circleId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT m.member_id, m.name, m.role, m.circle_id, m.user_id, m.is_active, u.email
      FROM members m
      LEFT JOIN users u ON m.user_id = u.user_id
      WHERE m.circle_id = ? AND m.is_active = 1
      ORDER BY m.member_id ASC
    `;
    db.query(query, [circleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

exports.findMembership = (circleId, userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM members 
      WHERE circle_id = ? AND user_id = ? AND is_active = 1
    `;
    db.query(query, [circleId, userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.addMemberToCircle = ({ circleId, userId, name, role = "MEMBER" }) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO members (circle_id, user_id, name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `;
    db.query(query, [circleId, userId, name?.trim(), role], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};
