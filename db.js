// db.js
const mysql = require('mysql2');
require('dotenv').config();

// Create MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Vega',
  database: process.env.DB_NAME || 'your_database_name'
});

// Connect to database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err.message);
    console.error('Connection config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
    return;
  }
  console.log('Connected to MySQL database successfully!');
  console.log('Database:', process.env.DB_NAME);
});

// Handle connection errors
connection.on('error', (err) => {
  console.error('Database connection error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed. Attempting to reconnect...');
    // You can add reconnection logic here if needed
  }
});

module.exports = connection;