// db.js - Improved version
const mysql = require('mysql2/promise'); // Use promises version
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
db.getConnection()
  .then(conn => {
    console.log("✅ Connected to MySQL");
    conn.release();
  })
  .catch(err => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });

module.exports = db;
