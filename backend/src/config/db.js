import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'shippilot',
  user:     process.env.DB_USER || 'shippilot_user',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
