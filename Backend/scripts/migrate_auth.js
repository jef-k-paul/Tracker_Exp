const db = require('../db/connections');
const bcrypt = require('bcryptjs');

async function migrate() {
  const run = (sql, params=[]) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, r) => err ? reject(err) : resolve(r));
  });

  console.log('1. Creating users table...');
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      reset_otp VARCHAR(10) NULL,
      reset_otp_expires DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('2. Updating members table columns...');
  try {
    await run('ALTER TABLE members ADD COLUMN user_id INT NULL');
  } catch (e) {
    console.log('user_id column note:', e.message);
  }

  try {
    await run('ALTER TABLE members ADD CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL');
  } catch (e) {
    console.log('fk_members_user constraint note:', e.message);
  }

  try {
    await run('ALTER TABLE members MODIFY COLUMN access_key VARCHAR(100) NULL');
  } catch(e) {
    console.log('modify access_key note:', e.message);
  }

  try {
    await run('ALTER TABLE circles ADD COLUMN created_by INT NULL');
  } catch(e) {
    console.log('circles created_by column note:', e.message);
  }

  console.log('3. Seeding default users for Paul Family...');
  const defaultPw = await bcrypt.hash('family123', 10);
  const seedUsers = [
    { email: 'dad@paul.com', name: 'Dad', member_id: 1 },
    { email: 'mom@paul.com', name: 'Mom', member_id: 2 },
    { email: 'son@paul.com', name: 'Son', member_id: 3 },
    { email: 'sister@paul.com', name: 'Sister', member_id: 4 }
  ];

  for (const u of seedUsers) {
    const existing = await run('SELECT user_id FROM users WHERE email = ?', [u.email]);
    let uid;
    if (existing.length === 0) {
      const res = await run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [u.email, defaultPw, u.name]);
      uid = res.insertId;
      console.log('Inserted user:', u.email, 'ID:', uid);
    } else {
      uid = existing[0].user_id;
    }
    await run('UPDATE members SET user_id = ? WHERE member_id = ?', [uid, u.member_id]);
  }

  console.log('Migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
