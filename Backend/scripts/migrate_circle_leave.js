const db = require('../db/connections');

async function migrate() {
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, r) => (err ? reject(err) : resolve(r)));
    });

  console.log('Creating circle_leave_requests table...');
  await run(`
    CREATE TABLE IF NOT EXISTS circle_leave_requests (
      request_id INT AUTO_INCREMENT PRIMARY KEY,
      circle_id INT NOT NULL,
      member_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (circle_id) REFERENCES circles(circle_id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_circle_status (circle_id, status),
      INDEX idx_member_status (member_id, status)
    )
  `);
  console.log('circle_leave_requests migration completed successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
