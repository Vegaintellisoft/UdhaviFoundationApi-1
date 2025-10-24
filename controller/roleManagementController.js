const { validationResult } = require('express-validator');
const db = require('../database/connection');

const createApiResponse = (success, message, data = null, errors = null) => {
  const response = { success, message, timestamp: new Date().toISOString() };
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  return response;
};

class RoleManagementController {
  // Get roles for dropdown
  static async getRolesDropdown(req, res) {
    try {
      const [roles] = await db.execute('SELECT id, name, description FROM roles ORDER BY name');
      res.json(createApiResponse(true, 'Roles retrieved successfully', { roles }));
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get role with modules and permissions
  static async getRoleModules(req, res) {
    try {
      const { roleId } = req.params;
      
      const [roleCheck] = await db.execute('SELECT id, name FROM roles WHERE id = ?', [roleId]);
      if (roleCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Role not found'));
      }

      const [modules] = await db.execute(`
        SELECT 
          m.id, m.name, m.route, m.description,
          COALESCE(rp.can_view, false) as can_view,
          COALESCE(rp.can_edit, false) as can_edit,
          COALESCE(rp.can_delete, false) as can_delete
        FROM modules m
        LEFT JOIN role_permissions rp ON m.id = rp.module_id AND rp.role_id = ?
        ORDER BY m.name
      `, [roleId]);

      res.json(createApiResponse(true, 'Role modules retrieved successfully', {
        role: roleCheck[0],
        modules: modules.map(m => ({
          id: m.id,
          name: m.name,
          route: m.route,
          description: m.description,
          permissions: {
            can_view: Boolean(m.can_view),
            can_edit: Boolean(m.can_edit),
            can_delete: Boolean(m.can_delete)
          }
        }))
      }));
    } catch (error) {
      console.error('Get role modules error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Update role permissions
  static async updateRolePermissions(req, res) {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      await db.execute('START TRANSACTION');

      try {
        // Delete existing permissions
        await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

        // Insert new permissions
        let insertedCount = 0;
        for (const perm of permissions) {
          if (perm.can_view || perm.can_edit || perm.can_delete) {
            await db.execute(`
              INSERT INTO role_permissions (role_id, module_id, can_view, can_edit, can_delete)
              VALUES (?, ?, ?, ?, ?)
            `, [roleId, perm.module_id, perm.can_view || false, perm.can_edit || false, perm.can_delete || false]);
            insertedCount++;
          }
        }

        await db.execute('COMMIT');

        res.json(createApiResponse(true, 'Role permissions updated successfully', {
          roleId: parseInt(roleId),
          updatedPermissions: insertedCount
        }));
      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Update permissions error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Create role
  static async createRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      const { name, description } = req.body;

      const [existing] = await db.execute('SELECT id FROM roles WHERE name = ?', [name]);
      if (existing.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Role name already exists'));
      }

      const [result] = await db.execute(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description]
      );

      res.status(201).json(createApiResponse(true, 'Role created successfully', {
        roleId: result.insertId,
        name, description
      }));
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }
}

module.exports = RoleManagementController;