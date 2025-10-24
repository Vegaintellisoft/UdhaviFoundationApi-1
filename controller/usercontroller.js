
// Add this at the top of your usercontroller.js
const path = require('path');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const db = require('../database/connection');

const createApiResponse = (success, message, data = null, errors = null) => {
  const response = { success, message, timestamp: new Date().toISOString() };
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  return response;
};

class UserController {
  // Get all users
static async getAllUsers(req, res) {
  try {
    const { search = '' } = req.query;
   
    let whereClause = '';
    let params = [];
   
    if (search) {
      whereClause = 'WHERE (u.name LIKE ? OR u.username LIKE ?)';
      params = [`%${search}%`, `%${search}%`];
    }
 
    // Get all users
    const [users] = await db.execute(`
      SELECT
        u.id,
        u.name,
        u.username,
        u.is_active,
        u.created_at,
        r.name AS role_name,
        u.email,
        u.phone,
        u.gender,
        u.company,
        u.department,
        u.remarks,
        u.profile_image,
        CONCAT('/uploads/profiles/', SUBSTRING_INDEX(u.profile_image, '/', -1)) AS profile_image_url
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `, params);
 
 
    // Get all available modules
    const [allModules] = await db.execute('SELECT id, name, route, description FROM modules ORDER BY name');
 
    // Get permissions for each user
    const usersWithPermissions = await Promise.all(users.map(async (user) => {
      // Get user-specific permissions
      const [userPermissions] = await db.execute(`
        SELECT m.id, m.name as module_name, m.route, m.description,
               up.can_view, up.can_add, up.can_edit, up.can_delete
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        WHERE up.user_id = ?
      `, [user.id]);
 
      // Get role-based permissions
      const [rolePermissions] = await db.execute(`
        SELECT m.id, m.name as module_name, m.route, m.description,
               rp.can_view, rp.can_add, rp.can_edit, rp.can_delete
        FROM role_permissions rp
        JOIN modules m ON rp.module_id = m.id
        JOIN users u ON u.role_id = rp.role_id
        WHERE u.id = ?
      `, [user.id]);
 
      // Create permissions map for all modules
      const permissionsMap = {};
     
      // Initialize all modules with no permissions
      allModules.forEach(module => {
        permissionsMap[module.name] = {
          id: module.id,
          name: module.name,
          route: module.route,
          description: module.description,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false
        };
      });
 
      // Apply role permissions
      rolePermissions.forEach(perm => {
        if (permissionsMap[perm.module_name]) {
          permissionsMap[perm.module_name] = {
            ...permissionsMap[perm.module_name],
            can_view: Boolean(perm.can_view),
            can_add: Boolean(perm.can_add),
            can_edit: Boolean(perm.can_edit),
            can_delete: Boolean(perm.can_delete)
          };
        }
      });
 
      // Override with user-specific permissions
      userPermissions.forEach(perm => {
        if (permissionsMap[perm.module_name]) {
          permissionsMap[perm.module_name] = {
            ...permissionsMap[perm.module_name],
            can_view: Boolean(perm.can_view),
            can_add: Boolean(perm.can_add),
            can_edit: Boolean(perm.can_edit),
            can_delete: Boolean(perm.can_delete)
          };
        }
      });
 
      // Convert to array format
      const permissionsArray = Object.values(permissionsMap);
 
     return {
        ...user,
        is_active: Boolean(user.is_active),
        profile_image_url: user.profile_image ? `/uploads/profiles/${path.basename(user.profile_image)}` : null,
        modules: permissionsArray
      };
    }));
 
     res.json(createApiResponse(true, 'Users retrieved successfully', { users: usersWithPermissions }));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}
 
 
 


// static async createUser(req, res) {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
//     }

//     const { firstName, lastName, email, phoneNo, gender, company_id, department_id, role_id, status, password, confirmPassword, remarks } = req.body;

//     if (password !== confirmPassword) {
//       return res.status(400).json(createApiResponse(false, 'Passwords do not match'));
//     }

//     const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
//     const name = `${firstName} ${lastName}`;

//     // Check if user exists
//     const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
//     if (existing.length > 0) {
//       return res.status(400).json(createApiResponse(false, 'Username or email already exists'));
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);

//     const [result] = await db.execute(`
//       INSERT INTO users (name, username, email, phone, gender, company_id, department_id, role_id, is_active, password, remarks) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `, [name, username, email, phoneNo, gender, company_id, department_id, role_id, status === 'Active', hashedPassword, remarks]);

//     res.status(201).json(createApiResponse(true, 'User created successfully', {
//       userId: result.insertId,
//       name,
//       username,
//       email
//     }));
//   } catch (error) {
//     console.error('Create user error:', error);
//     res.status(500).json(createApiResponse(false, 'Internal server error'));
//   }
// }

  // Get roles for dropdown
//   static async createUser(req, res) {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
//     }

//     const { firstName, lastName, email, phoneNo, gender, company, department, role_id, status, password, confirmPassword, remarks } = req.body;

//     if (password !== confirmPassword) {
//       return res.status(400).json(createApiResponse(false, 'Passwords do not match'));
//     }

//     const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
//     const name = `${firstName} ${lastName}`;

//     // Check if user exists
//     const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
//     if (existing.length > 0) {
//       return res.status(400).json(createApiResponse(false, 'Username or email already exists'));
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);

//     // Handle profile photo upload
//     let profileImagePath = null;
//     if (req.files && req.files.profile_photo && req.files.profile_photo[0]) {
//       profileImagePath = req.files.profile_photo[0].path;
//     }

//     const [result] = await db.execute(`
//       INSERT INTO users (name, username, email, phone, gender, company, department, role_id, is_active, password, remarks, profile_image) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `, [name, username, email, phoneNo, gender, company, department, role_id, status === 'Active', hashedPassword, remarks, profileImagePath]);

//     res.status(201).json(createApiResponse(true, 'User created successfully', {
//       userId: result.insertId,
//       name,
//       username,
//       email,
//       profileImage: profileImagePath ? `/uploads/profiles/${path.basename(profileImagePath)}` : null
//     }));
//   } catch (error) {
//     console.error('Create user error:', error);
//     res.status(500).json(createApiResponse(false, 'Internal server error'));
//   }
// }
// static async createUser(req, res) {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
//     }

//     const { firstName, lastName, email, phoneNo, gender, company, department, role_id, status, password, confirmPassword, remarks } = req.body;

//     if (password !== confirmPassword) {
//       return res.status(400).json(createApiResponse(false, 'Passwords do not match'));
//     }

//     const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
//     const name = `${firstName} ${lastName}`;

//     // Check if user exists
//     const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
//     if (existing.length > 0) {
//       return res.status(400).json(createApiResponse(false, 'Username or email already exists'));
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);

//     // Handle profile photo upload
//     let profileImagePath = null;
//     if (req.files && req.files.profile_photo && req.files.profile_photo[0]) {
//       profileImagePath = req.files.profile_photo[0].path;
//     }

//     const [result] = await db.execute(`
//       INSERT INTO users (name, username, email, phone, gender, company, department, role_id, is_active, password, remarks, profile_image) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `, [name, username, email, phoneNo, gender, company, department, role_id, status === 'Active', hashedPassword, remarks, profileImagePath]);

//     res.status(201).json(createApiResponse(true, 'User created successfully', {
//       userId: result.insertId,
//       name,
//       username,
//       email,
//       profileImage: profileImagePath ? `/uploads/profiles/${path.basename(profileImagePath)}` : null
//     }));
//   } catch (error) {
//     console.error('Create user error:', error);
//     res.status(500).json(createApiResponse(false, 'Internal server error'));
//   }
// }
static async createUser(req, res) {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    const { firstName, lastName, email, phoneNo, gender, company_id, department_id, role_id, status, password, confirmPassword, remarks } = req.body;

    // Log all extracted values
    console.log('Extracted values:', {
      firstName, lastName, email, phoneNo, gender, 
      company_id, department_id, role_id, status, 
      password: password ? '[HIDDEN]' : undefined, 
      confirmPassword: confirmPassword ? '[HIDDEN]' : undefined, 
      remarks
    });

    if (password !== confirmPassword) {
      return res.status(400).json(createApiResponse(false, 'Passwords do not match'));
    }

    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const name = `${firstName} ${lastName}`;

    // Check if user exists
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(400).json(createApiResponse(false, 'Username or email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Handle profile photo upload
    let profileImagePath = null;
    if (req.files && req.files.profile_photo && req.files.profile_photo[0]) {
      profileImagePath = req.files.profile_photo[0].path;
    }

    // Get company and department names from IDs
    const [companyResult] = await db.execute('SELECT name FROM companies WHERE id = ?', [company_id]);
    const [departmentResult] = await db.execute('SELECT name FROM departments WHERE id = ?', [department_id]);

    if (companyResult.length === 0) {
      return res.status(400).json(createApiResponse(false, 'Invalid company ID'));
    }
    if (departmentResult.length === 0) {
      return res.status(400).json(createApiResponse(false, 'Invalid department ID'));
    }

    const company = companyResult[0].name;
    const department = departmentResult[0].name;

    // Log final values before SQL
    console.log('Final SQL values:', {
      name, username, email, phoneNo, gender, company, department, 
      role_id, isActive: status === 'Active', remarks, profileImagePath
    });

    const [result] = await db.execute(`
      INSERT INTO users (name, username, email, phone, gender, company, department, role_id, is_active, password, remarks, profile_image) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, username, email, phoneNo, gender, company, department, role_id, status === 'Active', hashedPassword, remarks, profileImagePath]);

    res.status(201).json(createApiResponse(true, 'User created successfully', {
      userId: result.insertId,
      name,
      username,
      email,
      profileImage: profileImagePath ? `/uploads/profiles/${path.basename(profileImagePath)}` : null
    }));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}
  
//   static async getRolesForDropdown(req, res) {
//     try {
//       const [roles] = await db.execute('SELECT name, description FROM roles ORDER BY name');
//       const formattedRoles = roles.map(role => ({
//         value: role.name,
//         label: role.name,
//         description: role.description || ''
//       }));
      
//       res.json(createApiResponse(true, 'Roles retrieved successfully', { 
//         roles: formattedRoles 
//       }));
//     } catch (error) {
//       console.error('Get roles error:', error);
//       res.status(500).json(createApiResponse(false, 'Internal server error'));
//     }
//   }

  // Add these methods to your UserController class
static async getProfile(req, res) {
  res.json(createApiResponse(false, 'Method not implemented yet'));
}

static async updateProfile(req, res) {
  res.json(createApiResponse(false, 'Method not implemented yet'));
}

static async changePassword(req, res) {
  res.json(createApiResponse(false, 'Method not implemented yet'));
}

static async getUserStats(req, res) {
  res.json(createApiResponse(false, 'Method not implemented yet'));
}

static async getUserById(req, res) {
 try {
    const { id } = req.params;
 
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }
 
    const [rows] = await db.execute(`
      SELECT
        u.id,
        u.name,
        u.username,
        u.is_active,
        u.created_at,
        r.name AS role_name,
        u.email,
        u.phone,
        u.gender,
        u.company,
        u.department,
        u.remarks,
        u.profile_image
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
      LIMIT 1
    `, [id]);
 
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
 
    return res.status(200).json({
      success: true,
      data: rows[0]
    });
 
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}

static async updateUser(req, res) {
  try {
    const userId = req.params.id;
    console.log('req.params.id:', userId);
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
 
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
 
    const body = req.body || {};
    const updates = {};
 
    // Combine firstName + lastName
    if (body.firstName || body.lastName) {
      const first = body.firstName || '';
      const last = body.lastName || '';
      updates.name = `${first.trim()} ${last.trim()}`.trim();
      updates.username = `${first.toLowerCase().trim()}.${last.toLowerCase().trim()}`;
    }
 
    // Simple fields
    const simpleFields = ['email', 'phoneNo', 'gender', 'role_id', 'remarks'];
    simpleFields.forEach(f => {
      if (body[f] !== undefined && body[f] !== '') {
        const col = f === 'phoneNo' ? 'phone' : f;
        updates[col] = typeof body[f] === 'string' ? body[f].trim() : body[f];
      }
    });
 
    // Status -> is_active
    if (body.status) updates.is_active = body.status === 'Active' ? 1 : 0;
 
    // Password
    if (body.password) {
      const bcrypt = require('bcryptjs');
      updates.password = await bcrypt.hash(body.password, 12);
    }
 
    // Profile photo
    if (req.files?.profile_photo?.length) {
      updates.profile_image = req.files.profile_photo[0].path || req.files.profile_photo[0].filename;
    }
 
    // Company name from ID
    if (body.company_id) {
      const [companyResult] = await db.execute('SELECT name FROM companies WHERE id = ?', [body.company_id]);
      console.log('companyResult:', companyResult);
      if (!companyResult.length) return res.status(400).json({ success: false, message: "Invalid company ID" });
      updates.company = companyResult[0].name;
    }
 
    // Department name from ID
    if (body.department_id) {
      const [deptResult] = await db.execute('SELECT name FROM departments WHERE id = ?', [body.department_id]);
      console.log('deptResult:', deptResult);
      if (!deptResult.length) return res.status(400).json({ success: false, message: "Invalid department ID" });
      updates.department = deptResult[0].name;
    }
 
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No fields provided, user unchanged" });
    }
 
    // Build dynamic SQL for MySQL
    const fields = [];
    const values = [];
 
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    });
 
    values.push(userId); // WHERE id = ?
 
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    console.log('SQL:', sql, 'Values:', values);
 
    await db.execute(sql, values);
 
    return res.json({ success: true, message: "User updated successfully" });
 
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
}

static async resetUserPassword(req, res) {
  res.json(createApiResponse(false, 'Method not implemented yet'));
}

static async deleteUser(req, res) {
  res.json(createApiResponse(false, 'Method not implemented yet'));
}
// Get companies dropdown
static async getCompaniesDropdown(req, res) {
  try {
    const [companies] = await db.execute('SELECT id, name FROM companies ORDER BY name');
    const formattedCompanies = companies.map(company => ({
      id: company.id,
      value: company.id,
      label: company.name
    }));
    
    res.json(createApiResponse(true, 'Companies retrieved successfully', { companies: formattedCompanies }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}
// Get departments dropdown
static async getDepartmentsDropdown(req, res) {
  try {
    const [departments] = await db.execute('SELECT id, name FROM departments ORDER BY name');
    const formattedDepartments = departments.map(dept => ({
      id: dept.id,
      value: dept.id,
      label: dept.name
    }));
    
    res.json(createApiResponse(true, 'Departments retrieved successfully', { departments: formattedDepartments }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}

// Update roles dropdown to return IDs
// static async getRolesForDropdown(req, res) {
//   try {
//     const [roles] = await db.execute('SELECT id, name, description FROM roles ORDER BY name');
//     const formattedRoles = roles.map(role => ({
//       id: role.id,
//       value: role.id,
//       label: role.name,
//       description: role.description || ''
//     }));
    
//     res.json(createApiResponse(true, 'Roles retrieved successfully', { 
//       roles: formattedRoles 
//     }));
//   } catch (error) {
//     console.error('Get roles error:', error);
//     res.status(500).json(createApiResponse(false, 'Internal server error'));
//   }
// }
static async getRolesForDropdown(req, res) {
  try {
     console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    const [roles] = await db.execute('SELECT id, name, description FROM roles ORDER BY name');
    const formattedRoles = roles.map(role => ({
      id: role.id,
      value: role.id,
      label: role.name,
      description: role.description || ''
    }));
    
    res.json(createApiResponse(true, 'Roles retrieved successfully', { 
      roles: formattedRoles 
    }));
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}

static async toggleStatus(req, res) {
  try {
    console.log("ToggleStatus API hit ✅");
    console.log("Params:", req.params);
    console.log("Body:", req.body);
 
    const { userId } = req.params;
    const { status } = req.body;
 
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json(createApiResponse(false, 'Status must be Active or Inactive'));
    }
 
    const isActive = status === 'Active';
 
    const [result] = await db.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive, userId]
    );
 
    if (result.affectedRows === 0) {
      return res.status(404).json(createApiResponse(false, 'User not found'));
    }
 
    res.json(createApiResponse(true, `User status updated to ${status}`, { userId, status }));
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}
// usercontroller.js 
 

}

module.exports = UserController;
