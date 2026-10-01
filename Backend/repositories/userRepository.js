const db = require("../db/connections");

exports.findByEmail = (email) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM users WHERE LOWER(email) = LOWER(?)`;
    db.query(query, [email?.trim()], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.findById = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT user_id, email, name, created_at FROM users WHERE user_id = ?`;
    db.query(query, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.createUser = ({ email, passwordHash, name }) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `;
    db.query(query, [email?.trim()?.toLowerCase(), passwordHash, name?.trim()], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};

exports.setResetOtp = (userId, otp, expiresAt) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users
      SET reset_otp = ?, reset_otp_expires = ?
      WHERE user_id = ?
    `;
    db.query(query, [otp, expiresAt, userId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.clearResetOtp = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users
      SET reset_otp = NULL, reset_otp_expires = NULL
      WHERE user_id = ?
    `;
    db.query(query, [userId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.updatePassword = (userId, passwordHash) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users
      SET password_hash = ?, reset_otp = NULL, reset_otp_expires = NULL
      WHERE user_id = ?
    `;
    db.query(query, [passwordHash, userId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.getUserCircles = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        c.circle_id,
        c.name AS circle_name,
        c.family_code,
        m.member_id,
        m.role,
        m.name AS member_name
      FROM members m
      JOIN circles c ON m.circle_id = c.circle_id
      WHERE m.user_id = ? AND m.is_active = 1
      ORDER BY c.circle_id ASC
    `;
    db.query(query, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};
