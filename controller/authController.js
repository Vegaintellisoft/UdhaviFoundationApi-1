// controller/authController.js - Updated for User-Based Permissions
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../database/connection');
const { createApiResponse, sanitizeUserData } = require('../utils/helpers');

class AuthController {
  // Login user - Updated to use user-based permissions
static async login(req, res) {
    const { username, password } = req.body;
    try {
      // ✅ 1. Validate Input
      if (!username || !password) {
        return res
          .status(400)
          .json({ success: false, message: "Username and password are required" });
      }
      // ✅ 2. Find User
      const [users] = await db.execute(
        `SELECT
            u.id,
            u.name AS user_name,
            u.username,
            u.password,
            u.role_id,
            u.company AS company_name,
            u.department AS department_name,
            u.email,
            u.phone,
            u.gender,
            u.is_active,
            u.created_at,
            u.updated_at
         FROM users u
         WHERE u.username = ?`,
        [username]
      );
      if (!users.length) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
      }
      const user = users[0];
      // ✅ 3. Verify Password
      const isValid = await bcrypt.compare(password, user.password || "");
      if (!isValid) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
      }
      // ✅ 4. Get Role Name
      let roleName = "Not Assigned";
      if (user.role_id) {
        const [roles] = await db.execute("SELECT name FROM roles WHERE id = ?", [user.role_id]);
        if (roles.length) roleName = roles[0].name;
      }
      // ✅ 5. Fetch Modules & Permissions
      let modules = [];
      if (roleName.toLowerCase() === "superadmin") {
        // For superadmin, get all modules with parent info
        const [allModules] = await db.execute(
          `SELECT 
            m.id AS module_id, 
            m.name AS module_name, 
            m.route AS module_route,
            m.parent_id,
            pm.name AS parent_name,
            pm.route AS parent_route
          FROM modules m
          LEFT JOIN modules pm ON m.parent_id = pm.id
          ORDER BY
            CASE WHEN m.parent_id IS NULL THEN m.id ELSE m.parent_id END,
            CASE WHEN m.parent_id IS NULL THEN 0 ELSE 1 END,
            m.name`
        );
        modules = allModules.map(m => ({
          module_id: m.module_id,
          module_name: m.module_name,
          module_route: m.module_route,
          parent_id: m.parent_id,
          parent_name: m.parent_name,
          parent_route: m.parent_route,
          permission: {
            can_view: true,
            can_add: true,
            can_edit: true,
            can_delete: true
          }
        }));
      } else {
        // For other roles, get modules based on permissions
        const [permissions] = await db.execute(
          `SELECT
            m.id AS module_id,
            m.name AS module_name,
            m.route AS module_route,
            m.parent_id,
            pm.name AS parent_name,
            pm.route AS parent_route,
            p.can_view,
            p.can_add,
            p.can_edit,
            p.can_delete
          FROM role_permissions p
          JOIN modules m ON p.module_id = m.id
          LEFT JOIN modules pm ON m.parent_id = pm.id
          WHERE p.role_id = ?
          ORDER BY
            CASE WHEN m.parent_id IS NULL THEN m.id ELSE m.parent_id END,
            CASE WHEN m.parent_id IS NULL THEN 0 ELSE 1 END,
            m.name`,
          [user.role_id]
        );
        modules = permissions.map(m => ({
          module_id: m.module_id,
          module_name: m.module_name,
          module_route: m.module_route,
          parent_id: m.parent_id,
          parent_name: m.parent_name,
          parent_route: m.parent_route,
          permission: {
            can_view: !!m.can_view,
            can_add: !!m.can_add,
            can_edit: !!m.can_edit,
            can_delete: !!m.can_delete
          }
        }));
      }
      // ✅ 6. Permission Summary
      const permissionSummary = {
        totalModules: modules.length,
        viewableModules: modules.filter(m => m.permission.can_view).length,
        addableModules: modules.filter(m => m.permission.can_add).length,
        editableModules: modules.filter(m => m.permission.can_edit).length,
        deletableModules: modules.filter(m => m.permission.can_delete).length
      };
      // ✅ 7. Create JWT Token
      const tokenPayload = {
        id: user.id,
        username: user.username,
        role_id: user.role_id,
        role_name: roleName
      };
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );
      // ✅ 8. Build Response
      const userResponse = {
        id: user.id,
        name: user.user_name,
        username: user.username,
        role_id: user.role_id,
        role_name: roleName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        company: user.company_name || "Not Assigned",
        department: user.department_name || "Not Assigned",
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        modules,
        permissionSummary
      };
      return res.json({
        success: true,
        token,
        token_type: "Bearer",
        expires_in: process.env.JWT_EXPIRES_IN || "1d",
        user: userResponse
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
 
  // Logout user
  static async logout(req, res) {
    try {
      console.log('👋 User logout:', req.user?.username);
      
      if (global.logActivity && req.user?.userId) {
        await global.logActivity(req.user.userId, 'logout', null, req);
      }
      
      res.json(createApiResponse(true, 'Logout successful'));
    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get current user profile - Updated to use user-based permissions
  static async getProfile(req, res) {
    try {
      console.log('👤 Getting profile for user:', req.user?.username);
      
      const [users] = await db.execute(`
        SELECT u.id, u.name, u.username, u.created_at, u.updated_at,
               r.name as role_name, r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [req.user.userId]);

      if (users.length === 0) {
        return res.status(404).json(createApiResponse(false, 'User not found'));
      }

      // *** UPDATED: Get user-specific permissions ***
      const [permissions] = await db.execute(`
        SELECT 
          m.id as module_id,
          m.name as module_name, 
          m.route, 
          m.description as module_description,
          up.can_view, 
          up.can_edit, 
          up.can_delete,
          up.created_at as permission_granted_at,
          creator.name as granted_by
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        LEFT JOIN users creator ON up.created_by = creator.id
        WHERE up.user_id = ?
        ORDER BY m.name
      `, [req.user.userId]); // Changed from req.user.roleId to req.user.userId

      console.log('🔒 Profile permissions loaded:', permissions.length);

      // Format permissions for response
      const formattedPermissions = permissions.map(perm => ({
        module: {
          id: perm.module_id,
          name: perm.module_name,
          route: perm.route,
          description: perm.module_description
        },
        permissions: {
          can_view: Boolean(perm.can_view),
          can_edit: Boolean(perm.can_edit),
          can_delete: Boolean(perm.can_delete)
        },
        granted_at: perm.permission_granted_at,
        granted_by: perm.granted_by
      }));

      const responseData = {
        user: {
          ...users[0],
          role: users[0].role_name
        },
        permissions: formattedPermissions,
        permissionSummary: {
          totalModules: permissions.length,
          viewableModules: permissions.filter(p => p.can_view).length,
          editableModules: permissions.filter(p => p.can_edit).length,
          deletableModules: permissions.filter(p => p.can_delete).length
        }
      };

      res.json(createApiResponse(true, 'Profile retrieved successfully', responseData));

    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Verify token endpoint (useful for frontend to check if token is still valid)
  static async verifyToken(req, res) {
    try {
      console.log('🔍 Verifying token for user:', req.user?.username);
      
      // If middleware passes, token is valid
      // Get fresh user permissions in case they changed
      const [permissions] = await db.execute(`
        SELECT m.name as module_name, m.route, up.can_view, up.can_edit, up.can_delete
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        WHERE up.user_id = ?
        ORDER BY m.name
      `, [req.user.userId]);

      const responseData = {
        valid: true,
        user: {
          userId: req.user.userId,
          username: req.user.username,
          role: req.user.roleName
        },
        permissions: permissions.map(perm => ({
          module_name: perm.module_name,
          route: perm.route,
          can_view: Boolean(perm.can_view),
          can_edit: Boolean(perm.can_edit),
          can_delete: Boolean(perm.can_delete)
        })),
        permissionSummary: {
          totalModules: permissions.length,
          viewableModules: permissions.filter(p => p.can_view).length,
          editableModules: permissions.filter(p => p.can_edit).length,
          deletableModules: permissions.filter(p => p.can_delete).length
        }
      };

      res.json(createApiResponse(true, 'Token is valid', responseData));
    } catch (error) {
      console.error('❌ Verify token error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Refresh token (optional - for better security)
  static async refreshToken(req, res) {
    try {
      console.log('🔄 Refreshing token for user:', req.user?.username);
      
      const { userId, username, roleId, roleName } = req.user;
      
      // Verify user is still active and get fresh data
      const [users] = await db.execute(`
        SELECT u.id, u.is_active, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ? AND u.is_active = true
      `, [userId]);

      if (users.length === 0) {
        return res.status(401).json(createApiResponse(false, 'User account is inactive or not found'));
      }

      // Generate new JWT token with updated role info (in case role changed)
      const tokenPayload = { 
        userId, 
        username, 
        roleId, 
        roleName: users[0].role_name 
      };
      
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRE || '7d' 
      });

      // Get fresh permissions
      const [permissions] = await db.execute(`
        SELECT m.name as module_name, m.route, up.can_view, up.can_edit, up.can_delete
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        WHERE up.user_id = ?
        ORDER BY m.name
      `, [userId]);

      if (global.logActivity) {
        await global.logActivity(userId, 'token_refresh', null, req);
      }

      const responseData = { 
        token,
        user: {
          userId,
          username,
          role: users[0].role_name
        },
        permissions: permissions.map(perm => ({
          module_name: perm.module_name,
          route: perm.route,
          can_view: Boolean(perm.can_view),
          can_edit: Boolean(perm.can_edit),
          can_delete: Boolean(perm.can_delete)
        }))
      };
      
      res.json(createApiResponse(true, 'Token refreshed successfully', responseData));

    } catch (error) {
      console.error('❌ Refresh token error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get user's accessible modules (helper endpoint)
  static async getUserModules(req, res) {
    try {
      console.log('📋 Getting accessible modules for user:', req.user?.username);

      const [modules] = await db.execute(`
        SELECT 
          m.id,
          m.name,
          m.route,
          m.description,
          up.can_view,
          up.can_edit,
          up.can_delete,
          up.created_at as access_granted_at
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        WHERE up.user_id = ? AND up.can_view = true
        ORDER BY m.name
      `, [req.user.userId]);

      const responseData = {
        modules: modules.map(mod => ({
          id: mod.id,
          name: mod.name,
          route: mod.route,
          description: mod.description,
          permissions: {
            can_view: Boolean(mod.can_view),
            can_edit: Boolean(mod.can_edit),
            can_delete: Boolean(mod.can_delete)
          },
          access_granted_at: mod.access_granted_at
        })),
        summary: {
          accessibleModules: modules.length,
          editableModules: modules.filter(m => m.can_edit).length,
          deletableModules: modules.filter(m => m.can_delete).length
        }
      };

      res.json(createApiResponse(true, 'User modules retrieved successfully', responseData));

    } catch (error) {
      console.error('❌ Get user modules error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Check if user has specific permission (utility endpoint)
  static async checkPermission(req, res) {
    try {
      const { moduleName, permission } = req.query;

      if (!moduleName || !permission) {
        return res.status(400).json(createApiResponse(false, 'Module name and permission type are required'));
      }

      console.log(`🔍 Checking ${permission} permission for user ${req.user.username} on module ${moduleName}`);

      // Super admin always has access
      if (req.user.roleName === 'superadmin') {
        return res.json(createApiResponse(true, 'Permission check completed', {
          hasPermission: true,
          reason: 'SuperAdmin access'
        }));
      }

      const [result] = await db.execute(`
        SELECT up.can_view, up.can_edit, up.can_delete
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        WHERE up.user_id = ? AND m.name = ?
      `, [req.user.userId, moduleName]);

      const hasPermission = result.length > 0 && result[0][permission] === 1;

      const responseData = {
        hasPermission,
        moduleName,
        permissionType: permission,
        userPermissions: result.length > 0 ? {
          can_view: Boolean(result[0].can_view),
          can_edit: Boolean(result[0].can_edit),
          can_delete: Boolean(result[0].can_delete)
        } : null
      };

      res.json(createApiResponse(true, 'Permission check completed', responseData));

    } catch (error) {
      console.error('❌ Check permission error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }
}

module.exports = AuthController;
