// controller/userPermissionsController.js - NEW FILE
const { validationResult } = require('express-validator');
const db = require('../database/connection');
const { createApiResponse, logActivity } = require('../utils/helpers');

class UserPermissionsController {
  // Get all permissions for a specific user
  static async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;

      console.log(`📋 Getting permissions for user ID: ${userId}`);

      // Verify user exists
      const [userCheck] = await db.execute(`
        SELECT u.id, u.name, u.username, r.name as role_name
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
      `, [userId]);

      if (userCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'User not found'));
      }

      const user = userCheck[0];

      // Get user permissions
      const [permissions] = await db.execute(`
        SELECT 
          m.id as module_id,
          m.name as module_name,
          m.route as module_route,
          m.description as module_description,
          up.can_view,
          up.can_edit,
          up.can_delete,
          up.created_at,
          creator.name as granted_by
        FROM user_permissions up
        JOIN modules m ON up.module_id = m.id
        LEFT JOIN users creator ON up.created_by = creator.id
        WHERE up.user_id = ?
        ORDER BY m.name
      `, [userId]);

      const responseData = {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role_name
        },
        permissions: permissions.map(perm => ({
          module: {
            id: perm.module_id,
            name: perm.module_name,
            route: perm.module_route,
            description: perm.module_description
          },
          access: {
            can_view: Boolean(perm.can_view),
            can_edit: Boolean(perm.can_edit),
            can_delete: Boolean(perm.can_delete)
          },
          granted_at: perm.created_at,
          granted_by: perm.granted_by
        }))
      };

      res.json(createApiResponse(true, 'User permissions retrieved successfully', responseData));

    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Update permissions for a specific user
  static async updateUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      const { permissions } = req.body;

      console.log(`🔧 Updating permissions for user ID: ${userId}`);
      console.log('New permissions:', permissions);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      // Verify user exists
      const [userCheck] = await db.execute('SELECT name FROM users WHERE id = ?', [userId]);
      if (userCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'User not found'));
      }

      // Validate permissions array
      if (!Array.isArray(permissions)) {
        return res.status(400).json(createApiResponse(false, 'Permissions must be an array'));
      }

      // Start transaction
      await db.execute('START TRANSACTION');

      try {
        // Delete existing permissions for this user
        await db.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
        console.log('🗑️ Existing permissions deleted');

        // Insert new permissions
        let insertedCount = 0;
        for (const perm of permissions) {
          // Only insert if at least one permission is true
          if (perm.can_view || perm.can_edit || perm.can_delete) {
            await db.execute(`
              INSERT INTO user_permissions (user_id, module_id, can_view, can_edit, can_delete, created_by)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              userId, 
              perm.module_id, 
              perm.can_view || false, 
              perm.can_edit || false, 
              perm.can_delete || false,
              req.user.userId
            ]);
            insertedCount++;
          }
        }

        await db.execute('COMMIT');
        console.log(`✅ ${insertedCount} permissions updated successfully`);

        // Log activity
        await logActivity(req.user.userId, 'update_user_permissions', 'user_management', req, {
          target_user_id: userId,
          permissions_count: insertedCount
        });

        res.json(createApiResponse(true, 'User permissions updated successfully', {
          userId: parseInt(userId),
          userName: userCheck[0].name,
          updatedPermissions: insertedCount
        }));

      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Update user permissions error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get all modules available for permission assignment
  static async getAvailableModules(req, res) {
    try {
      const { userId } = req.params;

      // Get all modules with current user permissions
      const [modules] = await db.execute(`
        SELECT 
          m.id,
          m.name,
          m.route,
          m.description,
          COALESCE(up.can_view, false) as can_view,
          COALESCE(up.can_edit, false) as can_edit,
          COALESCE(up.can_delete, false) as can_delete
        FROM modules m
        LEFT JOIN user_permissions up ON m.id = up.module_id AND up.user_id = ?
        ORDER BY m.name
      `, [userId]);

      const responseData = {
        modules: modules.map(mod => ({
          id: mod.id,
          name: mod.name,
          route: mod.route,
          description: mod.description,
          currentPermissions: {
            can_view: Boolean(mod.can_view),
            can_edit: Boolean(mod.can_edit),
            can_delete: Boolean(mod.can_delete)
          }
        }))
      };

      res.json(createApiResponse(true, 'Available modules retrieved successfully', responseData));

    } catch (error) {
      console.error('Get available modules error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Copy permissions from one user to another
  static async copyUserPermissions(req, res) {
    try {
      const { fromUserId, toUserId } = req.body;

      console.log(`📋 Copying permissions from user ${fromUserId} to user ${toUserId}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      // Verify both users exist
      const [users] = await db.execute(
        'SELECT id, name FROM users WHERE id IN (?, ?) AND is_active = true',
        [fromUserId, toUserId]
      );

      if (users.length !== 2) {
        return res.status(404).json(createApiResponse(false, 'One or both users not found'));
      }

      // Get source user permissions
      const [sourcePermissions] = await db.execute(`
        SELECT module_id, can_view, can_edit, can_delete
        FROM user_permissions
        WHERE user_id = ?
      `, [fromUserId]);

      if (sourcePermissions.length === 0) {
        return res.status(400).json(createApiResponse(false, 'Source user has no permissions to copy'));
      }

      // Start transaction
      await db.execute('START TRANSACTION');

      try {
        // Delete existing permissions for target user
        await db.execute('DELETE FROM user_permissions WHERE user_id = ?', [toUserId]);

        // Copy permissions
        for (const perm of sourcePermissions) {
          await db.execute(`
            INSERT INTO user_permissions (user_id, module_id, can_view, can_edit, can_delete, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [toUserId, perm.module_id, perm.can_view, perm.can_edit, perm.can_delete, req.user.userId]);
        }

        await db.execute('COMMIT');

        // Log activity
        await logActivity(req.user.userId, 'copy_user_permissions', 'user_management', req, {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          permissions_copied: sourcePermissions.length
        });

        res.json(createApiResponse(true, 'Permissions copied successfully', {
          copiedPermissions: sourcePermissions.length,
          fromUser: users.find(u => u.id == fromUserId).name,
          toUser: users.find(u => u.id == toUserId).name
        }));

      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Copy user permissions error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get permission summary for all users
  static async getPermissionsSummary(req, res) {
    try {
      const { role, module } = req.query;

      let whereConditions = ['u.is_active = true'];
      let params = [];

      if (role) {
        whereConditions.push('r.name = ?');
        params.push(role);
      }

      if (module) {
        whereConditions.push('m.name = ?');
        params.push(module);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const [summary] = await db.execute(`
        SELECT 
          u.id,
          u.name,
          u.username,
          r.name as role_name,
          COUNT(up.id) as total_permissions,
          COUNT(CASE WHEN up.can_view = true THEN 1 END) as view_permissions,
          COUNT(CASE WHEN up.can_edit = true THEN 1 END) as edit_permissions,
          COUNT(CASE WHEN up.can_delete = true THEN 1 END) as delete_permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN user_permissions up ON u.id = up.user_id
        LEFT JOIN modules m ON up.module_id = m.id
        ${whereClause}
        GROUP BY u.id, u.name, u.username, r.name
        ORDER BY u.name
      `, params);

      res.json(createApiResponse(true, 'Permissions summary retrieved successfully', { summary }));

    } catch (error) {
      console.error('Get permissions summary error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }
}

module.exports = UserPermissionsController;