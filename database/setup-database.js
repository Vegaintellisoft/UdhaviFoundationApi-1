// setup-database.js - Run this to set up your database
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 Setting up Udhavi Foundation database...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to database:', process.env.DB_NAME);

    // Create tables
    console.log('📊 Creating database tables...');

    // Create roles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Roles table created');

    // Create modules table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS modules (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        route VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Modules table created');

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        INDEX idx_username (username),
        INDEX idx_role (role_id),
        FOREIGN KEY (role_id) REFERENCES roles(id)
      )
    `);
    console.log('✅ Users table created');

    // Create role permissions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        role_id INT NOT NULL,
        module_id INT NOT NULL,
        can_view BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_module (role_id, module_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Role permissions table created');

    // Create activity logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(50) NOT NULL,
        module VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        login_time TIMESTAMP NULL,
        logout_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_action (user_id, action),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Activity logs table created');

    // Insert default data
    console.log('📝 Inserting default data...');

    // Insert roles
    const roles = [
      ['superadmin', 'Super Administrator with full access'],
      ['admin', 'Administrator with limited access'],
      ['crm_user', 'CRM Module User'],
      ['hr_user', 'HR Module User'],
      ['finance_user', 'Finance Module User']
    ];

    for (const [name, description] of roles) {
      await connection.execute(`
        INSERT IGNORE INTO roles (name, description) VALUES (?, ?)
      `, [name, description]);
    }
    console.log('✅ Default roles inserted');

    // Insert modules
    const modules = [
      ['Super Admin', 'superadmin', 'Super Administrator Module'],
      ['Admin', 'admin', 'Administrator Module'],
      ['CRM', 'crm', 'Customer Relationship Management'],
      ['HR', 'hr', 'Human Resources'],
      ['Finance', 'finance', 'Finance Management']
    ];

    for (const [name, route, description] of modules) {
      await connection.execute(`
        INSERT IGNORE INTO modules (name, route, description) VALUES (?, ?, ?)
      `, [name, route, description]);
    }
    console.log('✅ Default modules inserted');

    // Create superadmin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await connection.execute(`
      INSERT IGNORE INTO users (name, username, password, role_id) 
      VALUES ('Super Administrator', 'superadmin', ?, 1)
    `, [hashedPassword]);
    console.log('✅ Superadmin user created');

    // Set superadmin permissions
    await connection.execute(`
      INSERT IGNORE INTO role_permissions (role_id, module_id, can_view, can_edit, can_delete) 
      SELECT 1, id, true, true, true FROM modules
    `);
    console.log('✅ Superadmin permissions set');

    // Verify setup
    console.log('\n🔍 Verifying database setup...');
    
    const [userCheck] = await connection.execute(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.username = 'superadmin'
    `);

    if (userCheck.length > 0) {
      const user = userCheck[0];
      console.log('✅ Superadmin user verified:', {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role_name,
        active: user.is_active
      });

      // Test password
      const isValidPassword = await bcrypt.compare('admin123', user.password);
      console.log('✅ Password test:', isValidPassword ? 'PASSED' : 'FAILED');

      if (isValidPassword) {
        console.log('\n🎉 DATABASE SETUP COMPLETE!');
        console.log('You can now login with:');
        console.log('Username: superadmin');
        console.log('Password: admin123');
      }
    } else {
      console.log('❌ Superadmin user not found');
    }

    // Show summary
    const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
    const [moduleCount] = await connection.execute('SELECT COUNT(*) as count FROM modules');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [permissionCount] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions');

    console.log('\n📊 Database Summary:');
    console.log(`- Roles: ${roleCount[0].count}`);
    console.log(`- Modules: ${moduleCount[0].count}`);
    console.log(`- Users: ${userCount[0].count}`);
    console.log(`- Permissions: ${permissionCount[0].count}`);

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run setup
setupDatabase();