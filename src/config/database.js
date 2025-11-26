const mysql = require("mysql2/promise");
require("dotenv").config();
// Configure your database connection details
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10, // Adjust as needed
};
// Create a connection pool
const pool = mysql.createPool(dbConfig);

module.exports = pool;
