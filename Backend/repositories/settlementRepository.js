const db = require("../db/connections");

exports.createSettlement = ({ circleId, payerId, receiverId, amount, month, year, notes = "" }) => {
  return new Promise((resolve, reject) => {
    if (!circleId) {
      return reject(new Error("Active circleId is required to create a settlement."));
    }
    const query = `
      INSERT INTO settlements (circle_id, payer_id, receiver_id, amount, month, year, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `;
    db.query(query, [circleId, payerId, receiverId, amount, month, year, notes], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};

exports.getSettlementById = (settlementId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT s.*, 
             p.name AS payer_name, 
             r.name AS receiver_name,
             r.user_id AS receiver_user_id,
             c.name AS circle_name
      FROM settlements s
      JOIN members p ON s.payer_id = p.member_id
      JOIN members r ON s.receiver_id = r.member_id
      LEFT JOIN circles c ON s.circle_id = c.circle_id
      WHERE s.settlement_id = ?
    `;
    db.query(query, [settlementId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.updateSettlementStatus = (settlementId, status, confirmedAt = null) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE settlements 
      SET status = ?, confirmed_at = ?
      WHERE settlement_id = ?
    `;
    db.query(query, [status, confirmedAt, settlementId], (err, result) => {
      if (err) return reject(err);
      resolve(result.affectedRows > 0);
    });
  });
};

exports.getSettlementsForMonth = (month, year, circleId) => {
  return new Promise((resolve, reject) => {
    if (!circleId) {
      return reject(new Error("Active circleId is required to fetch monthly settlements."));
    }

    const query = `
      SELECT s.*, 
             p.name AS payer_name, 
             r.name AS receiver_name
      FROM settlements s
      JOIN members p ON s.payer_id = p.member_id
      JOIN members r ON s.receiver_id = r.member_id
      WHERE s.month = ? AND s.year = ? AND s.circle_id = ?
      ORDER BY s.created_at DESC
    `;
    db.query(query, [month, year, circleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

exports.getPendingSettlementsForReceiver = (receiverId, userId = null) => {
  return new Promise((resolve, reject) => {
    let whereClause = "s.receiver_id = ?";
    const params = [receiverId];
    if (userId) {
      whereClause = "(s.receiver_id = ? OR r.user_id = ?)";
      params.push(userId);
    }

    const query = `
      SELECT s.*, 
             p.name AS payer_name, 
             r.name AS receiver_name,
             c.name AS circle_name
      FROM settlements s
      JOIN members p ON s.payer_id = p.member_id
      JOIN members r ON s.receiver_id = r.member_id
      LEFT JOIN circles c ON s.circle_id = c.circle_id
      WHERE ${whereClause} AND s.status = 'PENDING'
      ORDER BY s.created_at DESC
    `;
    db.query(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

exports.getPendingCount = (receiverId, userId = null) => {
  return new Promise((resolve, reject) => {
    let whereClause = "s.receiver_id = ?";
    const params = [receiverId];
    if (userId) {
      whereClause = "(s.receiver_id = ? OR r.user_id = ?)";
      params.push(userId);
    }

    const query = `
      SELECT COUNT(*) AS pending_count
      FROM settlements s
      JOIN members r ON s.receiver_id = r.member_id
      WHERE ${whereClause} AND s.status = 'PENDING'
    `;
    db.query(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(Number(rows[0]?.pending_count || 0));
    });
  });
};
