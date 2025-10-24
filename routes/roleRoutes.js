const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const RoleController = require('../controller/roleController');
const authMiddleware = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');

// Updated validation to include can_add and sub-module support
//const updatePermissionsValidation = [
//  body('permissions').isArray().withMessage('Permissions must be an array'),
  //body('permissions.*.module_id').isInt({ min: 1 }).withMessage('Module ID required'),
 // body('permissions.*.can_view').optional().isBoolean(),
 // body('permissions.*.can_add').optional().isBoolean(),
 // body('permissions.*.can_edit').optional().isBoolean(),
 // body('permissions.*.can_delete').optional().isBoolean()
//];


const updatePermissionsValidation = [
  // Role details validation (optional)
  body('roleName')
    .optional()
    .notEmpty()
    .withMessage('Role name cannot be empty if provided')
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters'),
  
  body('roleDescription')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Role description cannot exceed 255 characters'),
  
  // Permissions validation (optional - but if provided, must be array)
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array if provided'),
  
  // If permissions array exists, validate each permission object
  body('permissions.*.module_id')
    .if(body('permissions').exists())
    .isInt({ min: 1 })
    .withMessage('Module ID required and must be valid'),
  
  body('permissions.*.can_view')
    .optional()
    .isBoolean()
    .withMessage('can_view must be boolean'),
  
  body('permissions.*.can_add')
    .optional()
    .isBoolean()
    .withMessage('can_add must be boolean'),
  
  body('permissions.*.can_edit')
    .optional()
    .isBoolean()
    .withMessage('can_edit must be boolean'),
  
  body('permissions.*.can_delete')
    .optional()
    .isBoolean()
    .withMessage('can_delete must be boolean'),
  
  // Custom validation to ensure at least one field is provided
  body()
    .custom((value) => {
      const { roleName, roleDescription, permissions } = value;
      if (!roleName && roleDescription === undefined && !permissions) {
        throw new Error('At least one of roleName, roleDescription, or permissions must be provided');
      }
      return true;
    })
];

// Module validation for create/update
const moduleValidation = [
  body('name').notEmpty().withMessage('Module name is required'),
  body('route').notEmpty().withMessage('Route is required'),
  body('description').optional(),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('Parent ID must be a valid integer')
];

// Sub-module specific validation
const subModuleValidation = [
  param('parentId').isInt({ min: 1 }).withMessage('Parent ID must be a valid integer'),
  body('name').notEmpty().withMessage('Sub-module name is required'),
  body('route').notEmpty().withMessage('Route is required'),
  body('description').optional()
];

// ==================== ROLE MANAGEMENT ROUTES ====================

// Create role with permissions in one step - Updated with can_add
router.post('/roles/create-with-permissions', 
  authMiddleware, 
  permissionMiddleware(['superadmin']), 
  [
    body('name').notEmpty().withMessage('Role name is required'),
    body('description').optional(),
    body('permissions').isArray({ min: 1 }).withMessage('At least one permission required'),
    body('permissions.*.module_id').isInt({ min: 1 }).withMessage('Module ID required'),
    body('permissions.*.can_view').optional().isBoolean(),
    body('permissions.*.can_add').optional().isBoolean(),
    body('permissions.*.can_edit').optional().isBoolean(),
    body('permissions.*.can_delete').optional().isBoolean()
  ],
  RoleController.createRoleWithPermissions
);

// Basic role management
router.get('/roles-dropdown', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getAllRoles);
router.get('/roles/:roleId', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getRoleById);
router.post('/roles', authMiddleware, permissionMiddleware(['superadmin']), [
  body('name').notEmpty().withMessage('Role name is required'),
  body('description').optional()
], RoleController.createRole);
router.put('/roles/:roleId', authMiddleware, permissionMiddleware(['superadmin']), [
  body('name').notEmpty().withMessage('Role name is required'),
  body('description').optional()
], RoleController.updateRole);
router.delete('/roles/:roleId', authMiddleware, permissionMiddleware(['superadmin']), RoleController.deleteRole);
router.get('/roles-summary', authMiddleware, permissionMiddleware(['superadmin']), RoleController.getRoleSummary);

// ==================== MODULE MANAGEMENT ROUTES ====================

// Get all modules (with hierarchy support)
router.get('/modules', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getAllModules);

// Get module hierarchy (tree structure)
router.get('/modules/hierarchy', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getModuleHierarchy);

// Get parent modules only (for dropdowns)
router.get('/modules/parents', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getParentModules);

// Create module (can be parent or sub-module based on parent_id)
router.post('/modules', authMiddleware, permissionMiddleware(['superadmin']), moduleValidation, RoleController.createModule);

// Update module
router.put('/modules/:moduleId', authMiddleware, permissionMiddleware(['superadmin']), [
  param('moduleId').isInt({ min: 1 }).withMessage('Module ID must be a valid integer'),
  ...moduleValidation
], RoleController.updateModule);

// Delete module
router.delete('/modules/:moduleId', authMiddleware, permissionMiddleware(['superadmin']), [
  param('moduleId').isInt({ min: 1 }).withMessage('Module ID must be a valid integer')
], RoleController.deleteModule);

// ==================== SUB-MODULE SPECIFIC ROUTES ====================

// Get sub-modules for a specific parent module
router.get('/modules/:parentId/sub-modules', 
  authMiddleware, 
  permissionMiddleware(['superadmin', 'admin']), 
  [param('parentId').isInt({ min: 1 }).withMessage('Parent ID must be a valid integer')],
  RoleController.getSubModules
);

// Create sub-module under specific parent
router.post('/modules/:parentId/sub-modules', 
  authMiddleware, 
  permissionMiddleware(['superadmin']), 
  subModuleValidation,
  RoleController.createSubModule
);

// ==================== PERMISSION MANAGEMENT ROUTES ====================

// Get role permissions (shows modules with permissions)
router.get('/roles/:roleId/permissions', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getRolePermissions);

// Get all modules for role permission management (shows all modules with current permissions)
router.get('/roles/:roleId/modules', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getAllModulesForRole);

// Update role permissions
router.put('/roles/:roleId/permissions', 
  authMiddleware, 
  permissionMiddleware(['superadmin']), 
  [
    param('roleId').isInt({ min: 1 }).withMessage('Role ID must be a valid integer'),
    // ...updateRoleAndPermissionsValidation
  ], 
  RoleController.updateRolePermissions
);

// ==================== ADVANCED PERMISSION OPERATIONS ====================

// Copy permissions between roles
router.post('/copy-permissions', 
  authMiddleware, 
  permissionMiddleware(['superadmin']),
  [
    body('fromRoleId').isInt({ min: 1 }).withMessage('Source role ID required'),
    body('toRoleId').isInt({ min: 1 }).withMessage('Target role ID required')
  ],
  async (req, res) => {
    try {
      const { fromRoleId, toRoleId } = req.body;
      const db = require('../database/connection');
      
      // Get permissions from source role
      const [sourcePermissions] = await db.execute(
        'SELECT module_id, can_view, can_add, can_edit, can_delete FROM role_permissions WHERE role_id = ?',
        [fromRoleId]
      );

      if (sourcePermissions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Source role has no permissions to copy'
        });
      }

      // Check if both roles exist
      const [sourceRole] = await db.execute('SELECT name FROM roles WHERE id = ?', [fromRoleId]);
      const [targetRole] = await db.execute('SELECT name FROM roles WHERE id = ?', [toRoleId]);
      
      if (sourceRole.length === 0 || targetRole.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'One or both roles not found'
        });
      }

      await db.query('START TRANSACTION');

      try {
        // Delete existing permissions for target role
        await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [toRoleId]);

        // Insert copied permissions
        for (const perm of sourcePermissions) {
          await db.execute(
            'INSERT INTO role_permissions (role_id, module_id, can_view, can_add, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
            [toRoleId, perm.module_id, perm.can_view, perm.can_add, perm.can_edit, perm.can_delete]
          );
        }

        await db.query('COMMIT');

        // Log activity
        if (global.logActivity) {
          await global.logActivity(req.user.userId, 'copy_permissions', 'role_management', req, {
            fromRoleId,
            toRoleId,
            copiedPermissions: sourcePermissions.length
          });
        }

        res.json({
          success: true,
          message: 'Permissions copied successfully',
          data: {
            fromRole: sourceRole[0].name,
            toRole: targetRole[0].name,
            fromRoleId: parseInt(fromRoleId),
            toRoleId: parseInt(toRoleId),
            copiedPermissions: sourcePermissions.length
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Copy permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Bulk assign permissions to multiple roles
router.post('/bulk-assign-permissions',
  authMiddleware,
  permissionMiddleware(['superadmin']),
  [
    body('roleIds').isArray({ min: 1 }).withMessage('At least one role ID required'),
    body('roleIds.*').isInt({ min: 1 }).withMessage('Each role ID must be valid'),
    body('permissions').isArray({ min: 1 }).withMessage('At least one permission required'),
    body('permissions.*.module_id').isInt({ min: 1 }).withMessage('Module ID required'),
    body('permissions.*.can_view').optional().isBoolean(),
    body('permissions.*.can_add').optional().isBoolean(),
    body('permissions.*.can_edit').optional().isBoolean(),
    body('permissions.*.can_delete').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const { roleIds, permissions } = req.body;
      const db = require('../database/connection');

      // Validate all roles exist
      const [roleCheck] = await db.execute(
        `SELECT id, name FROM roles WHERE id IN (${roleIds.map(() => '?').join(',')})`,
        roleIds
      );

      if (roleCheck.length !== roleIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more roles not found'
        });
      }

      await db.query('START TRANSACTION');

      try {
        let totalAssigned = 0;

        for (const roleId of roleIds) {
          // Delete existing permissions for this role
          await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

          // Insert new permissions
          for (const perm of permissions) {
            if (perm.can_view || perm.can_add || perm.can_edit || perm.can_delete) {
              await db.execute(
                'INSERT INTO role_permissions (role_id, module_id, can_view, can_add, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
                [roleId, perm.module_id, perm.can_view || false, perm.can_add || false, perm.can_edit || false, perm.can_delete || false]
              );
              totalAssigned++;
            }
          }
        }

        await db.query('COMMIT');

        // Log activity
        if (global.logActivity) {
          await global.logActivity(req.user.userId, 'bulk_assign_permissions', 'role_management', req, {
            roleIds,
            totalAssigned
          });
        }

        res.json({
          success: true,
          message: 'Permissions assigned to multiple roles successfully',
          data: {
            roles: roleCheck.map(r => ({ id: r.id, name: r.name })),
            totalRoles: roleIds.length,
            totalPermissions: totalAssigned
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Bulk assign permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);


router.patch('/roles/:roleId/toggle-status', 
  authMiddleware, 
  permissionMiddleware(['superadmin']),
  [param('roleId').isInt({ min: 1 }).withMessage('Role ID must be a valid integer')],
  RoleController.toggleRoleStatus
);

// ==================== ANALYTICS & REPORTING ROUTES ====================

// Get permission analytics
router.get('/analytics/permissions',
  authMiddleware,
  permissionMiddleware(['superadmin', 'admin']),
  async (req, res) => {
    try {
      const db = require('../database/connection');

      // Get comprehensive permission analytics
      const [analytics] = await db.execute(`
        SELECT 
          m.id as module_id,
          m.name as module_name,
          m.parent_id,
          p.name as parent_name,
          CASE WHEN m.parent_id IS NULL THEN 'Parent Module' ELSE 'Sub Module' END as module_type,
          COUNT(rp.role_id) as total_roles_with_access,
          SUM(rp.can_view) as roles_with_view,
          SUM(rp.can_add) as roles_with_add,
          SUM(rp.can_edit) as roles_with_edit,
          SUM(rp.can_delete) as roles_with_delete
        FROM modules m
        LEFT JOIN modules p ON m.parent_id = p.id
        LEFT JOIN role_permissions rp ON m.id = rp.module_id
        GROUP BY m.id, m.name, m.parent_id, p.name
        ORDER BY 
          COALESCE(m.parent_id, m.id), 
          m.parent_id IS NULL DESC, 
          m.name
      `);

      // Get role summary
      const [roleSummary] = await db.execute(`
        SELECT 
          r.id,
          r.name,
          COUNT(rp.module_id) as total_modules,
          COUNT(u.id) as total_users
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN users u ON r.id = u.role_id AND u.is_active = true
        GROUP BY r.id, r.name
        ORDER BY r.name
      `);

      res.json({
        success: true,
        message: 'Permission analytics retrieved successfully',
        data: {
          modulePermissions: analytics,
          roleSummary: roleSummary,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Permission analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

module.exports = router;
