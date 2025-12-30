// /**
//  * Database Configuration
//  * MySQL connection using mysql2 with promise support
//  */

// const mysql = require('mysql2/promise');

// // Create connection pool
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   enableKeepAlive: true,
//   keepAliveInitialDelay: 0
// });

// // Test connection
// const testConnection = async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log('✅ Database connected successfully');
//     connection.release();
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//   }
// };

// testConnection();

// module.exports = pool;


/**
 * Setup Script - Run this once to create admin user
 * Usage: node setup.js
 */

// require('dotenv').config();
// const mysql = require('mysql2/promise');
// const bcrypt = require('bcryptjs');

// const setup = async () => {
//   console.log('🔧 Starting Evayo Bakery Setup...\n');

//   // Create connection
//   const connection = await mysql.createConnection({
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT || 3306,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME
//   });

//   console.log('✅ Database connected\n');

//   try {
//     // Hash the admin password
//     const adminPassword = 'admin123';
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(adminPassword, salt);

//     console.log('🔐 Generated password hash for "admin123"\n');

//     // Check if admin exists
//     const [existingAdmin] = await connection.query(
//       'SELECT id FROM users WHERE email = ?',
//       ['admin@evayobakery.com']
//     );

//     if (existingAdmin.length > 0) {
//       // Update existing admin password
//       await connection.query(
//         'UPDATE users SET password = ? WHERE email = ?',
//         [hashedPassword, 'admin@evayobakery.com']
//       );
//       console.log('✅ Admin password updated!\n');
//     } else {
//       // Create new admin user
//       await connection.query(
//         `INSERT INTO users (first_name, last_name, email, phone, password, role) 
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         ['Admin', 'User', 'admin@evayobakery.com', '+251911362562', hashedPassword, 'admin']
//       );
//       console.log('✅ Admin user created!\n');
//     }

//     console.log('========================================');
//     console.log('   ADMIN LOGIN CREDENTIALS');
//     console.log('========================================');
//     console.log('   Email:    admin@evayobakery.com');
//     console.log('   Password: admin123');
//     console.log('========================================\n');

//     // Verify the password works
//     const [admin] = await connection.query(
//       'SELECT password FROM users WHERE email = ?',
//       ['admin@evayobakery.com']
//     );
    
//     const isMatch = await bcrypt.compare('admin123', admin[0].password);
//     console.log('🔑 Password verification:', isMatch ? '✅ SUCCESS' : '❌ FAILED');

//   } catch (error) {
//     console.error('❌ Setup error:', error.message);
//   } finally {
//     await connection.end();
//     console.log('\n✅ Setup complete! You can now login to admin panel.\n');
//   }
// };

// setup();



/**
 * Database Configuration
 * MySQL connection using mysql2 with promise support
 */

const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'evayo_bakery',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

testConnection();

// Export pool methods
module.exports = {
  query: (...args) => pool.query(...args),
  getConnection: () => pool.getConnection(),
  pool
};
