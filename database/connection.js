const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,  // Convert to number
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};


console.log('📊 Final DB Config:', {
  host: dbConfig.host || 'MISSING',
  user: dbConfig.user || 'MISSING',
  password: dbConfig.password ? 'EXISTS' : 'MISSING',
  database: dbConfig.database || 'MISSING'
});

const pool = mysql.createPool(dbConfig);

module.exports = pool;
