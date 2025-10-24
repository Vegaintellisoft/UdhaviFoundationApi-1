// middleware/permissions.js - Updated for User-Based Permissions
const db = require('../database/connection');
const { createApiResponse } = require('../utils/helpers');

// Basic role-based middleware (for backward compatibility)
const permissionMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user.roleName;
      
      // Check if user's role is in allowed roles
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).json(createApiResponse(false, 'Access denied. Insufficient permissions.', null, {
          requiredRoles: allowedRoles,
          userRole: userRole
        }));
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  };
};

// NEW: User-based module permissions middleware
const userModulePermissionMiddleware = (moduleName, requiredPermission = 'can_view') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.roleName;

      console.log(`🔒 Checking ${requiredPermission} permission for user ${userId} on module "${moduleName}"`);

      // Super admin always has access
      if (userRole === 'superadmin') {
        console.log('✅ SuperAdmin access granted');
        return next();
      }

      // Check user-specific module permission
      const [permissions] = await db.execute(`
        SELECT up.can_view, up.can_edit, up.can_delete, m.name as module_name
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        WHERE up.user_id = ? AND m.name = ?
      `, [userId, moduleName]);

      if (permissions.length === 0) {
        console.log(`❌ No permissions found for user ${userId} on module "${moduleName}"`);
        return res.status(403).json(createApiResponse(false, `Access denied to ${moduleName} module`));
      }

      const permission = permissions[0];
      console.log(`📋 Found permissions:`, permission);

      // Check required permission
      if (!permission[requiredPermission]) {
        console.log(`❌ Missing ${requiredPermission} permission for ${moduleName}`);
        return res.status(403).json(createApiResponse(false, 
          `Access denied. Missing ${requiredPermission} permission for ${moduleName}`, 
          null, {
            requiredPermission,
            moduleName,
            userPermissions: {
              can_view: Boolean(permission.can_view),
              can_edit: Boolean(permission.can_edit),
              can_delete: Boolean(permission.can_delete)
            }
          }
        ));
      }

      console.log(`✅ Permission granted: ${requiredPermission} on ${moduleName}`);
      
      // Add permissions to request object for use in controllers
      req.modulePermissions = {
        can_view: Boolean(permission.can_view),
        can_edit: Boolean(permission.can_edit),
        can_delete: Boolean(permission.can_delete)
      };

      next();
    } catch (error) {
      console.error('User module permission middleware error:', error);
      return res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  };
};

// NEW: Check multiple permissions at once
const userMultiplePermissionsMiddleware = (permissions = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.roleName;

      // Super admin always has access
      if (userRole === 'superadmin') {
        return next();
      }

      // Check all required permissions
      for (const { moduleName, permission } of permissions) {
        const [modulePermissions] = await db.execute(`
          SELECT up.can_view, up.can_edit, up.can_delete
          FROM user_permissions up
          JOIN modules m ON up.module_id = m.id
          WHERE up.user_id = ? AND m.name = ?
        `, [userId, moduleName]);

        if (modulePermissions.length === 0 || !modulePermissions[0][permission]) {
          return res.status(403).json(createApiResponse(false, 
            `Access denied. Missing ${permission} permission for ${moduleName}`
          ));
        }
      }

      next();
    } catch (error) {
      console.error('Multiple permissions middleware error:', error);
      return res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  };
};

// NEW: Get all user permissions (utility function)
const getUserPermissions = async (userId) => {
  try {
    const [permissions] = await db.execute(`
      SELECT 
        m.id as module_id,
        m.name as module_name,
        m.route as module_route,
        m.description as module_description,
        up.can_view,
        up.can_edit,
        up.can_delete,
        up.created_at as permission_granted_at
      FROM user_permissions up
      JOIN modules m ON up.module_id = m.id
      WHERE up.user_id = ?
      ORDER BY m.name
    `, [userId]);

    return permissions.map(perm => ({
      module: {
        id: perm.module_id,
        name: perm.module_name,
        route: perm.module_route,
        description: perm.module_description
      },
      permissions: {
        can_view: Boolean(perm.can_view),
        can_edit: Boolean(perm.can_edit),
        can_delete: Boolean(perm.can_delete)
      },
      granted_at: perm.permission_granted_at
    }));
  } catch (error) {
    console.error('Get user permissions error:', error);
    return [];
  }
};

// Legacy middleware (for modules still using role-based)
const modulePermissionMiddleware = (moduleName, requiredPermission = 'can_view') => {
  return async (req, res, next) => {
    try {
      // Super admin has access to everything
      if (req.user.roleName === 'superadmin') {
        return next();
      }

      // Check role-based permission (legacy)
      const [permissions] = await db.execute(`
        SELECT rp.can_view, rp.can_edit, rp.can_delete
        FROM role_permissions rp
        JOIN modules m ON rp.module_id = m.id
        WHERE rp.role_id = ? AND m.name = ?
      `, [req.user.roleId, moduleName]);

      if (permissions.length === 0) {
        return res.status(403).json(createApiResponse(false, `Access denied to ${moduleName} module`));
      }

      const permission = permissions[0];

      if (!permission[requiredPermission]) {
        return res.status(403).json(createApiResponse(false, 
          `Access denied. Missing ${requiredPermission} permission for ${moduleName}`
        ));
      }

      next();
    } catch (error) {
      console.error('Module permission middleware error:', error);
      return res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  };
};

module.exports = {
  permissionMiddleware,
  modulePermissionMiddleware, // Legacy
  userModulePermissionMiddleware, // NEW
  userMultiplePermissionsMiddleware, // NEW
  getUserPermissions // NEW utility
};