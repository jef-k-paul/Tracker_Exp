const db = require("../db/connections");

exports.createSettlement = ({ payerId, receiverId, amount, month, year, notes = "" }) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO settlements (payer_id, receiver_id, amount, month, year, status, notes)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
    `;
    db.query(query, [payerId, receiverId, amount, month, year, notes], (err, result) => {
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
             r.name AS receiver_name
      FROM settlements s
      JOIN members p ON s.payer_id = p.member_id
      JOIN members r ON s.receiver_id = r.member_id
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

exports.getSettlementsForMonth = (month, year) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT s.*, 
             p.name AS payer_name, 
             r.name AS receiver_name
      FROM settlements s
      JOIN members p ON s.payer_id = p.member_id
      JOIN members r ON s.receiver_id = r.member_id
      WHERE s.month = ? AND s.year = ?
      ORDER BY s.created_at DESC
    `;
    db.query(query, [month, year], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

exports.getPendingSettlementsForReceiver = (receiverId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT s.*, 
             p.name AS payer_name, 
             r.name AS receiver_name
      FROM settlements s
      JOIN members p ON s.payer_id = p.member_id
      JOIN members r ON s.receiver_id = r.member_id
      WHERE s.receiver_id = ? AND s.status = 'PENDING'
      ORDER BY s.created_at DESC
    `;
    db.query(query, [receiverId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

exports.getPendingCount = (receiverId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS pending_count
      FROM settlements
      WHERE receiver_id = ? AND status = 'PENDING'
    `;
    db.query(query, [receiverId], (err, rows) => {
      if (err) return reject(err);
      resolve(Number(rows[0]?.pending_count || 0));
    });
  });
};
