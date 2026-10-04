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

exports.removeMemberFromCircle = (circleId, memberId) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE members 
      SET is_active = 0 
      WHERE circle_id = ? AND member_id = ?
    `;
    db.query(query, [circleId, memberId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.findMemberById = (memberId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT m.*, u.email, c.name AS circle_name
      FROM members m
      LEFT JOIN users u ON m.user_id = u.user_id
      LEFT JOIN circles c ON m.circle_id = c.circle_id
      WHERE m.member_id = ?
    `;
    db.query(query, [memberId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.getCircleMembersWithLeaveStatus = (circleId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        m.member_id, 
        m.name, 
        m.role, 
        m.circle_id, 
        m.user_id, 
        m.is_active, 
        u.email,
        clr.request_id AS leave_request_id,
        clr.status AS leave_request_status,
        clr.created_at AS leave_requested_at
      FROM members m
      LEFT JOIN users u ON m.user_id = u.user_id
      LEFT JOIN circle_leave_requests clr 
        ON clr.member_id = m.member_id 
        AND clr.circle_id = m.circle_id 
        AND clr.status = 'PENDING'
      WHERE m.circle_id = ? AND m.is_active = 1
      ORDER BY (m.role = 'ADMIN') DESC, m.member_id ASC
    `;
    db.query(query, [circleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

exports.getActiveAdminCount = (circleId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS admin_count 
      FROM members 
      WHERE circle_id = ? AND role = 'ADMIN' AND is_active = 1
    `;
    db.query(query, [circleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0]?.admin_count || 0);
    });
  });
};

exports.createLeaveRequest = ({ circleId, memberId, userId }) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO circle_leave_requests (circle_id, member_id, user_id, status)
      VALUES (?, ?, ?, 'PENDING')
    `;
    db.query(query, [circleId, memberId, userId], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};

exports.getPendingLeaveRequest = (circleId, memberId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM circle_leave_requests
      WHERE circle_id = ? AND member_id = ? AND status = 'PENDING'
      LIMIT 1
    `;
    db.query(query, [circleId, memberId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.getLeaveRequestById = (requestId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT clr.*, c.name AS circle_name, m.name AS member_name, u.email
      FROM circle_leave_requests clr
      JOIN circles c ON clr.circle_id = c.circle_id
      JOIN members m ON clr.member_id = m.member_id
      JOIN users u ON clr.user_id = u.user_id
      WHERE clr.request_id = ?
    `;
    db.query(query, [requestId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

exports.updateLeaveRequestStatus = (requestId, status) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE circle_leave_requests
      SET status = ?
      WHERE request_id = ?
    `;
    db.query(query, [status, requestId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.cancelLeaveRequest = (circleId, userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      DELETE FROM circle_leave_requests
      WHERE circle_id = ? AND user_id = ? AND status = 'PENDING'
    `;
    db.query(query, [circleId, userId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.getPendingLeaveRequestsForAdmin = (adminUserId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        clr.request_id, 
        clr.circle_id, 
        clr.member_id, 
        clr.user_id, 
        clr.status, 
        clr.created_at,
        c.name AS circle_name, 
        c.family_code,
        m.name AS member_name,
        u.email AS member_email
      FROM circle_leave_requests clr
      JOIN circles c ON clr.circle_id = c.circle_id
      JOIN members m ON clr.member_id = m.member_id
      JOIN users u ON clr.user_id = u.user_id
      JOIN members admin_m 
        ON admin_m.circle_id = c.circle_id 
        AND admin_m.user_id = ? 
        AND admin_m.role = 'ADMIN' 
        AND admin_m.is_active = 1
      WHERE clr.status = 'PENDING'
      ORDER BY clr.created_at DESC
    `;
    db.query(query, [adminUserId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

