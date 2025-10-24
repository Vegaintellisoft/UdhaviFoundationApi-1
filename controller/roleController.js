// controller/roleController.js - Enhanced with Sub-modules Support
const { validationResult } = require('express-validator');
const db = require('../database/connection');

// Helper function for API responses
const createApiResponse = (success, message, data = null, errors = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (errors !== null) {
    response.errors = errors;
  }
  
  return response;
};

class RoleController {
  
  // Get all roles (Enhanced for UI dropdown)
  static async getAllRoles(req, res) {
    try {
      console.log('📋 Getting all roles...');
      
      const [roles] = await db.execute('SELECT * FROM roles ORDER BY name');
      
      // Format for UI dropdown
      const formattedRoles = roles.map(role => ({
        id: role.id,
        name: role.name,
      }));
      
      console.log(`✅ Found ${roles.length} roles`);
      res.json(createApiResponse(true, 'Roles retrieved successfully', { 
        roles: formattedRoles 
      }));
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Create new role
  static async createRole(req, res) {
    try {
      console.log('🆕 Creating new role:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      const { name, description } = req.body;

      // Check if role already exists
      const [existingRoles] = await db.execute('SELECT id FROM roles WHERE name = ?', [name]);
      if (existingRoles.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Role name already exists'));
      }

      const [result] = await db.execute(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description]
      );

      // Log activity
      if (global.logActivity) {
        await global.logActivity(req.user.userId, 'create_role', 'role_management', req);
      }

      const responseData = {
        roleId: result.insertId,
        name,
        description,
        label: name,
        fullLabel: `${name} - ${description}`,
        value: result.insertId
      };

      console.log('✅ Role created successfully:', responseData);
      res.status(201).json(createApiResponse(true, 'Role created successfully', responseData));

    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get all modules with hierarchy (Enhanced for UI with parent-child structure)
  // static async getAllModules(req, res) {
  //   try {
  //     console.log('🧩 Getting all modules with hierarchy...');
      
  //     const [modules] = await db.execute(`
  //       SELECT 
  //         m.id,
  //         m.name,
  //         m.route,
  //         m.description,
  //         m.parent_id,
  //         p.name as parent_name,
  //         p.route as parent_route,
  //         CASE 
  //           WHEN m.parent_id IS NULL THEN 'Parent Module'
  //           ELSE 'Sub Module'
  //         END as module_type,
  //         m.created_at
  //       FROM modules m
  //       LEFT JOIN modules p ON m.parent_id = p.id
  //       ORDER BY 
  //         COALESCE(m.parent_id, m.id), 
  //         m.parent_id IS NULL DESC, 
  //         m.name
  //     `);
      
  //     // Format for UI with hierarchy
  //     const formattedModules = modules.map(module => ({
  //       id: module.id,
  //       name: module.name,
  //       route: module.route,
  //       description: module.description,
  //       parent_id: module.parent_id,
  //       parent_name: module.parent_name,
  //       parent_route: module.parent_route,
  //       module_type: module.module_type,
  //       label: module.parent_id ? `${module.parent_name} → ${module.name}` : module.name,
  //       fullLabel: module.parent_id 
  //         ? `${module.parent_name} → ${module.name} - ${module.description}` 
  //         : `${module.name} - ${module.description}`,
  //       value: module.id,
  //       created_at: module.created_at,
  //       isSubModule: Boolean(module.parent_id),
  //       level: module.parent_id ? 1 : 0
  //     }));
      
  //     console.log(`✅ Found ${modules.length} modules (including sub-modules)`);
  //     res.json(createApiResponse(true, 'Modules retrieved successfully', { 
  //       modules: formattedModules 
  //     }));
  //   } catch (error) {
  //     console.error('Get modules error:', error);
  //     res.status(500).json(createApiResponse(false, 'Internal server error'));
  //   }
  // }
static async getAllModules(req, res) {
  try {
    console.log('🧩 Getting all modules with hierarchy...');
    
    const [modules] = await db.execute(`
      SELECT 
        m.id,
        m.name,
        m.route,
        m.description,
        m.parent_id,
        p.name as parent_name,
        p.route as parent_route,
        CASE 
          WHEN m.parent_id IS NULL THEN 'Parent Module'
          ELSE 'Sub Module'
        END as module_type,
        m.created_at
      FROM modules m
      LEFT JOIN modules p ON m.parent_id = p.id
      ORDER BY 
        COALESCE(m.parent_id, m.id), 
        m.parent_id IS NULL DESC, 
        m.name
    `);
    
    // Format for UI with proper hierarchy labels
    const formattedModules = modules.map(module => ({
      id: module.id,
      name: module.name,
     // route: module.route,
      //description: module.description,
      parent_id: module.parent_id,
      //parent_name: module.parent_name,
      //parent_route: module.parent_route,
      //module_type: module.module_type,
      // This is the key fix - proper hierarchical labeling
      label: module.parent_id && module.parent_name 
        ? `${module.parent_name} → ${module.name}` 
        : module.name,
      fullLabel: module.parent_id && module.parent_name
        ? `${module.parent_name} → ${module.name} - ${module.description}` 
        : `${module.name} - ${module.description}`,
      value: module.id,
      created_at: module.created_at,
      isSubModule: Boolean(module.parent_id),
      level: module.parent_id ? 1 : 0,
      // Add indentation helper for UI
      indentation: module.parent_id ? '    ' : '', // 4 spaces for sub-modules
      displayName: module.parent_id && module.parent_name
        ? `    └─ ${module.name}` // Visual tree structure
        : module.name
    }));
    
    console.log(`✅ Found ${modules.length} modules (including sub-modules)`);
    res.json(createApiResponse(true, 'Modules retrieved successfully', { 
      modules: formattedModules 
    }));
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}
  // Get hierarchical module structure for tree view
  static async getModuleHierarchy(req, res) {
    try {
      console.log('🌳 Getting module hierarchy...');
      
      const [modules] = await db.execute(`
        SELECT 
          m.id,
          m.name,
          m.route,
          m.description,
          m.parent_id,
          m.created_at
        FROM modules m
        ORDER BY 
          COALESCE(m.parent_id, m.id), 
          m.parent_id IS NULL DESC, 
          m.name
      `);

      // Build hierarchical structure
      const parentModules = modules.filter(m => m.parent_id === null);
      const subModules = modules.filter(m => m.parent_id !== null);

      const hierarchy = parentModules.map(parent => ({
        id: parent.id,
        name: parent.name,
        route: parent.route,
        description: parent.description,
        module_type: 'Parent Module',
        created_at: parent.created_at,
        children: subModules
          .filter(sub => sub.parent_id === parent.id)
          .map(sub => ({
            id: sub.id,
            name: sub.name,
            route: sub.route,
            description: sub.description,
            parent_id: sub.parent_id,
            module_type: 'Sub Module',
            created_at: sub.created_at
          }))
      }));

      res.json(createApiResponse(true, 'Module hierarchy retrieved successfully', { 
        hierarchy,
        total_modules: modules.length,
        parent_modules: parentModules.length,
        sub_modules: subModules.length
      }));
    } catch (error) {
      console.error('Get module hierarchy error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get parent modules only (for dropdown when creating sub-modules)
  static async getParentModules(req, res) {
    try {
      console.log('📂 Getting parent modules...');
      
      const [parentModules] = await db.execute(`
        SELECT id, name, route, description, created_at
        FROM modules 
        WHERE parent_id IS NULL 
        ORDER BY name
      `);
      
      const formattedModules = parentModules.map(module => ({
        id: module.id,
        name: module.name,
        route: module.route,
        description: module.description,
        label: module.name,
        fullLabel: `${module.name} - ${module.description}`,
        value: module.id,
        created_at: module.created_at
      }));
      
      console.log(`✅ Found ${parentModules.length} parent modules`);
      res.json(createApiResponse(true, 'Parent modules retrieved successfully', { 
        modules: formattedModules 
      }));
    } catch (error) {
      console.error('Get parent modules error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Create new module (enhanced to support sub-modules)
  static async createModule(req, res) {
    try {
      console.log('🧩 Creating new module:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      const { name, route, description, parent_id } = req.body;

      // Check if module already exists
      const [existingModules] = await db.execute('SELECT id FROM modules WHERE name = ? OR route = ?', [name, route]);
      if (existingModules.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Module name or route already exists'));
      }

      // If parent_id is provided, validate parent exists
      if (parent_id) {
        const [parentCheck] = await db.execute('SELECT id, name FROM modules WHERE id = ? AND parent_id IS NULL', [parent_id]);
        if (parentCheck.length === 0) {
          return res.status(400).json(createApiResponse(false, 'Invalid parent module ID or parent module is also a sub-module'));
        }
      }

      const [result] = await db.execute(
        'INSERT INTO modules (name, route, description, parent_id) VALUES (?, ?, ?, ?)',
        [name, route, description, parent_id || null]
      );

      // Log activity
      if (global.logActivity) {
        await global.logActivity(req.user.userId, parent_id ? 'create_sub_module' : 'create_module', 'module_management', req);
      }

      // Get parent info if this is a sub-module
      let parentInfo = null;
      if (parent_id) {
        const [parentData] = await db.execute('SELECT name FROM modules WHERE id = ?', [parent_id]);
        parentInfo = parentData[0];
      }

      const responseData = {
        moduleId: result.insertId,
        name,
        route,
        //description,
        parent_id: parent_id || null,
        parent_name: parentInfo ? parentInfo.name : null,
        module_type: parent_id ? 'Sub Module' : 'Parent Module',
       // label: parentInfo ? `${parentInfo.name} → ${name}` : name,
       // fullLabel: parentInfo ? `${parentInfo.name} → ${name} - ${description}` : `${name} - ${description}`,
        value: result.insertId
      };

      console.log('✅ Module created successfully:', responseData);
      res.status(201).json(createApiResponse(true, `${parent_id ? 'Sub-module' : 'Module'} created successfully`, responseData));

    } catch (error) {
      console.error('Create module error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Create sub-module specifically under a parent module
  static async createSubModule(req, res) {
    try {
      console.log('🔧 Creating sub-module:', req.body);
      
      const { parentId } = req.params;
      const { name, route, description } = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      // Validate parent module exists and is a parent module
      const [parentCheck] = await db.execute('SELECT id, name FROM modules WHERE id = ? AND parent_id IS NULL', [parentId]);
      if (parentCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Parent module not found or is not a parent module'));
      }

      // Check if sub-module already exists
      const [existingModules] = await db.execute('SELECT id FROM modules WHERE (name = ? OR route = ?) AND parent_id = ?', [name, route, parentId]);
      if (existingModules.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Sub-module name or route already exists under this parent'));
      }

      const [result] = await db.execute(
        'INSERT INTO modules (name, route, description, parent_id) VALUES (?, ?, ?, ?)',
        [name, route, description, parentId]
      );

      // Log activity
      if (global.logActivity) {
        await global.logActivity(req.user.userId, 'create_sub_module', 'module_management', req);
      }

      const responseData = {
        moduleId: result.insertId,
        name,
        route,
        description,
        parent_id: parseInt(parentId),
        parent_name: parentCheck[0].name,
        module_type: 'Sub Module',
        label: `${parentCheck[0].name} → ${name}`,
        fullLabel: `${parentCheck[0].name} → ${name} - ${description}`,
        value: result.insertId
      };

      console.log('✅ Sub-module created successfully:', responseData);
      res.status(201).json(createApiResponse(true, 'Sub-module created successfully', responseData));

    } catch (error) {
      console.error('Create sub-module error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Get sub-modules for a specific parent module
  static async getSubModules(req, res) {
    try {
      const { parentId } = req.params;
      
      console.log(`🔍 Getting sub-modules for parent ID: ${parentId}`);

      // Validate parent module exists
      const [parentCheck] = await db.execute('SELECT id, name FROM modules WHERE id = ? AND parent_id IS NULL', [parentId]);
      if (parentCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Parent module not found'));
      }

      const [subModules] = await db.execute(`
        SELECT id, name, route, description, created_at
        FROM modules 
        WHERE parent_id = ? 
        ORDER BY name
      `, [parentId]);

      const formattedSubModules = subModules.map(module => ({
        id: module.id,
        name: module.name,
        route: module.route,
        description: module.description,
        parent_id: parseInt(parentId),
        parent_name: parentCheck[0].name,
        module_type: 'Sub Module',
        label: `${parentCheck[0].name} → ${module.name}`,
        fullLabel: `${parentCheck[0].name} → ${module.name} - ${module.description}`,
        value: module.id,
        created_at: module.created_at
      }));

      res.json(createApiResponse(true, 'Sub-modules retrieved successfully', { 
        parent: {
          id: parseInt(parentId),
          name: parentCheck[0].name
        },
        subModules: formattedSubModules,
        count: subModules.length
      }));

    } catch (error) {
      console.error('Get sub-modules error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Rest of the existing methods remain the same...
  // (getRolePermissions, updateRolePermissions, getAllModulesForRole, etc.)

  static async getRolePermissions(req, res) {
    try {
      const { roleId } = req.params;
      
      console.log(`Getting permissions for role ID: ${roleId}`);

      const [roleCheck] = await db.execute('SELECT name FROM roles WHERE id = ?', [roleId]);
      if (roleCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Role not found'));
      }

      const [permissions] = await db.execute(`
        SELECT 
          m.id, m.name, m.route, m.description, m.parent_id,
          p.name as parent_name,
          rp.can_view, rp.can_add, rp.can_edit, rp.can_delete,
          CASE 
            WHEN m.parent_id IS NULL THEN 'Parent Module'
            ELSE 'Sub Module'
          END as module_type
        FROM modules m
        LEFT JOIN modules p ON m.parent_id = p.id
        INNER JOIN role_permissions rp ON m.id = rp.module_id 
        WHERE rp.role_id = ? AND (rp.can_view = true OR rp.can_add = true OR rp.can_edit = true OR rp.can_delete = true)
        ORDER BY 
          COALESCE(m.parent_id, m.id), 
          m.parent_id IS NULL DESC, 
          m.name
      `, [roleId]);

      const responseData = {
        roleId: parseInt(roleId),
        roleName: roleCheck[0].name,
        permissions: permissions.map(perm => ({
          id: perm.id,
          name: perm.name,
          route: perm.route,
          description: perm.description,
          parent_id: perm.parent_id,
          parent_name: perm.parent_name,
          module_type: perm.module_type,
          label: perm.parent_id ? `${perm.parent_name} → ${perm.name}` : perm.name,
          can_view: Boolean(perm.can_view),
          can_add: Boolean(perm.can_add),
          can_edit: Boolean(perm.can_edit),
          can_delete: Boolean(perm.can_delete)
        }))
      };

      res.json(createApiResponse(true, 'Role permissions retrieved successfully', responseData));

    } catch (error) {
      console.error('Get role permissions error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }


// Fixed updateRolePermissions method - replace your existing method with this:

static async updateRolePermissions(req, res) {
  try {
    const { roleId } = req.params;
    
    console.log(`🔧 Updating role and permissions for role ID: ${roleId}`);
    console.log('📦 Full request body:', req.body);
    
    const { permissions, roleName, roleDescription } = req.body;
    
    console.log('🔒 Extracted permissions:', permissions);
    console.log('👤 Role name update:', roleName);
    console.log('📝 Role description update:', roleDescription);
    console.log('🔒 Is permissions array?', Array.isArray(permissions));

    // Validate role exists
    const [roleCheck] = await db.execute('SELECT name, description FROM roles WHERE id = ?', [roleId]);
    if (roleCheck.length === 0) {
      return res.status(404).json(createApiResponse(false, 'Role not found'));
    }

    const currentRole = roleCheck[0];

    // Prevent updating system roles
    const systemRoles = ['superadmin', 'admin'];
    if (systemRoles.includes(currentRole.name)) {
      return res.status(400).json(createApiResponse(false, 'Cannot update system roles'));
    }

    // Validate role name if provided (check for duplicates)
    if (roleName && roleName !== currentRole.name) {
      const [existingRoles] = await db.execute('SELECT id FROM roles WHERE name = ? AND id != ?', [roleName, roleId]);
      if (existingRoles.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Role name already exists'));
      }
    }

    // Validate permissions array if provided
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        console.log('❌ Permissions is not an array');
        return res.status(400).json(createApiResponse(false, `Permissions must be an array, received: ${typeof permissions}`));
      }

      if (permissions.length === 0) {
        console.log('⚠️ Permissions array is empty');
        return res.status(400).json(createApiResponse(false, 'Permissions array cannot be empty'));
      }

      console.log(`✅ Permissions validation passed. Array length: ${permissions.length}`);
    }

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      let updatedPermissionsCount = 0;
      let roleUpdated = false;

      // Update role details if provided
      if (roleName !== undefined || roleDescription !== undefined) {
        const finalRoleName = roleName || currentRole.name;
        const finalRoleDescription = roleDescription !== undefined ? roleDescription : currentRole.description;

        await db.execute(
          'UPDATE roles SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [finalRoleName, finalRoleDescription, roleId]
        );
        
        roleUpdated = true;
        console.log('✅ Role details updated successfully');
      }

      // Update permissions if provided
      if (permissions !== undefined) {
        // Delete existing permissions for this role
        await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
        console.log('🗑️ Existing permissions deleted');

        // Insert new permissions
        for (const perm of permissions) {
          console.log('🔄 Processing permission:', perm);
          
          // Validate permission object
          if (!perm.hasOwnProperty('module_id')) {
            console.log('❌ Permission missing module_id:', perm);
            throw new Error('Each permission must have module_id');
          }

          // Only insert if at least one permission is true
          if (perm.can_view || perm.can_add || perm.can_edit || perm.can_delete) {
            await db.execute(`
              INSERT INTO role_permissions (role_id, module_id, can_view, can_add, can_edit, can_delete)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [roleId, perm.module_id, perm.can_view || false, perm.can_add || false, perm.can_edit || false, perm.can_delete || false]);
            updatedPermissionsCount++;
            console.log(`✅ Inserted permission for module ${perm.module_id}`);
          } else {
            console.log(`⏭️ Skipped permission for module ${perm.module_id} (no permissions granted)`);
          }
        }
      }

      await db.query('COMMIT');

      // Get updated role details
      const [updatedRole] = await db.execute('SELECT name, description FROM roles WHERE id = ?', [roleId]);
      const finalRole = updatedRole[0];

      console.log(`✅ Role and permissions updated successfully`);

      // Log activity
      if (global.logActivity) {
        const activityType = roleUpdated && permissions !== undefined ? 'update_role_and_permissions' : 
                           roleUpdated ? 'update_role' : 'update_permissions';
        await global.logActivity(req.user.userId, activityType, 'role_management', req);
      }

      // Prepare response data
      const responseData = {
        roleId: parseInt(roleId),
        roleName: finalRole.name,
        roleDescription: finalRole.description,
        updatedFields: {
          roleDetails: roleUpdated,
          permissions: permissions !== undefined
        }
      };

      if (permissions !== undefined) {
        responseData.updatedPermissions = updatedPermissionsCount;
      }

      let message = '';
      if (roleUpdated && permissions !== undefined) {
        message = 'Role details and permissions updated successfully';
      } else if (roleUpdated) {
        message = 'Role details updated successfully';
      } else {
        message = 'Permissions updated successfully';
      }

      res.json(createApiResponse(true, message, responseData));

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Update role and permissions error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}

  // static async getAllModulesForRole(req, res) {
  //   try {
  //     const { roleId } = req.params;
      
  //     console.log(`🔧 Getting all modules for role permission management: ${roleId}`);

  //     // Validate role exists
  //     const [roleCheck] = await db.execute('SELECT name FROM roles WHERE id = ?', [roleId]);
  //     if (roleCheck.length === 0) {
  //       return res.status(404).json(createApiResponse(false, 'Role not found'));
  //     }

  //     // Get all modules with current permissions for this role (INCLUDING can_add and hierarchy)
  //     const [modules] = await db.execute(`
  //       SELECT 
  //         m.id, m.name, m.route, m.description, m.parent_id,
  //         p.name as parent_name,
  //         COALESCE(rp.can_view, false) as can_view,
  //         COALESCE(rp.can_add, false) as can_add,
  //         COALESCE(rp.can_edit, false) as can_edit,
  //         COALESCE(rp.can_delete, false) as can_delete,
  //         CASE 
  //           WHEN m.parent_id IS NULL THEN 'Parent Module'
  //           ELSE 'Sub Module'
  //         END as module_type
  //       FROM modules m
  //       LEFT JOIN modules p ON m.parent_id = p.id
  //       LEFT JOIN role_permissions rp ON m.id = rp.module_id AND rp.role_id = ?
  //       ORDER BY 
  //         COALESCE(m.parent_id, m.id), 
  //         m.parent_id IS NULL DESC, 
  //         m.name
  //     `, [roleId]);

  //     const responseData = {
  //       roleId: parseInt(roleId),
  //       roleName: roleCheck[0].name,
  //       modules: modules.map(mod => ({
  //         id: mod.id,
  //         name: mod.name,
  //         route: mod.route,
  //         description: mod.description,
  //         parent_id: mod.parent_id,
  //         parent_name: mod.parent_name,
  //         module_type: mod.module_type,
  //         label: mod.parent_id ? `${mod.parent_name} → ${mod.name}` : mod.name,
  //         fullLabel: mod.parent_id 
  //           ? `${mod.parent_name} → ${mod.name} - ${mod.description}` 
  //           : `${mod.name} - ${mod.description}`,
  //         value: mod.id,
  //         isSubModule: Boolean(mod.parent_id),
  //         level: mod.parent_id ? 1 : 0,
  //         permissions: {
  //           can_view: Boolean(mod.can_view),
  //           can_add: Boolean(mod.can_add),
  //           can_edit: Boolean(mod.can_edit),
  //           can_delete: Boolean(mod.can_delete)
  //         }
  //       }))
  //     };

  //     res.json(createApiResponse(true, 'All modules with permissions retrieved successfully', responseData));

  //   } catch (error) {
  //     console.error('Get all modules for role error:', error);
  //     res.status(500).json(createApiResponse(false, 'Internal server error'));
  //   }
  // }

  // Continue with other existing methods...


  // (getRoleSummary, deleteRole, updateRole, getRoleById, createRoleWithPermissions)
static async getAllModulesForRole(req, res) {
  try {
    const { roleId } = req.params;
    
    console.log(`🔧 Getting all modules for role permission management: ${roleId}`);

    // Validate role exists
    const [roleCheck] = await db.execute('SELECT name FROM roles WHERE id = ?', [roleId]);
    if (roleCheck.length === 0) {
      return res.status(404).json(createApiResponse(false, 'Role not found'));
    }

    // Get all modules with current permissions and hierarchy
    const [modules] = await db.execute(`
      SELECT 
        m.id, m.name, m.route, m.description, m.parent_id,
        p.name as parent_name,
        COALESCE(rp.can_view, false) as can_view,
        COALESCE(rp.can_add, false) as can_add,
        COALESCE(rp.can_edit, false) as can_edit,
        COALESCE(rp.can_delete, false) as can_delete,
        CASE 
          WHEN m.parent_id IS NULL THEN 'Parent Module'
          ELSE 'Sub Module'
        END as module_type
      FROM modules m
      LEFT JOIN modules p ON m.parent_id = p.id
      LEFT JOIN role_permissions rp ON m.id = rp.module_id AND rp.role_id = ?
      ORDER BY 
        COALESCE(m.parent_id, m.id), 
        m.parent_id IS NULL DESC, 
        m.name
    `, [roleId]);

    const responseData = {
      roleId: parseInt(roleId),
      roleName: roleCheck[0].name,
      modules: modules.map(mod => ({
        id: mod.id,
        name: mod.name,
        route: mod.route,
        description: mod.description,
        parent_id: mod.parent_id,
        parent_name: mod.parent_name,
        module_type: mod.module_type,
        // Proper hierarchical display for permission management
        label: mod.parent_id && mod.parent_name 
          ? `${mod.parent_name} → ${mod.name}` 
          : mod.name,
        fullLabel: mod.parent_id && mod.parent_name
          ? `${mod.parent_name} → ${mod.name} - ${mod.description}` 
          : `${mod.name} - ${mod.description}`,
        value: mod.id,
        isSubModule: Boolean(mod.parent_id),
        level: mod.parent_id ? 1 : 0,
        displayName: mod.parent_id && mod.parent_name
          ? `    └─ ${mod.name}` // Visual indentation
          : mod.name,
        permissions: {
          can_view: Boolean(mod.can_view),
          can_add: Boolean(mod.can_add),
          can_edit: Boolean(mod.can_edit),
          can_delete: Boolean(mod.can_delete)
        }
      }))
    };

    res.json(createApiResponse(true, 'All modules with permissions retrieved successfully', responseData));

  } catch (error) {
    console.error('Get all modules for role error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}
  static async getRoleSummary(req, res) {
  try {
  //  console.log('📊 Getting role summary with status...');
    
    const [summary] = await db.execute(`
      SELECT r.id, r.name, r.description, r.is_active,
             CASE WHEN r.is_active = 1 THEN 'Active' ELSE 'Inactive' END as status,
             r.created_at,
             COUNT(u.id) as user_count,
             COUNT(rp.id) as permission_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id AND u.is_active = true
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.name, r.description, r.is_active, r.created_at
      ORDER BY r.is_active DESC, r.name ASC
    `);

    const formattedSummary = summary.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      is_active: role.is_active,
      status: role.status,
      label: role.name,
      fullLabel: `${role.name} - ${role.description}`,
      value: role.id,
      created_at: role.created_at,
      user_count: role.user_count,
      permission_count: role.permission_count
    }));

  //  console.log(`✅ Role summary generated for ${summary.length} roles`);
    res.json(createApiResponse(true, 'Role summary retrieved successfully', { summary: formattedSummary }));

  } catch (error) {
    console.error('Get role summary error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}

static async toggleRoleStatus(req, res) {
  try {
    const { roleId } = req.params;
    
  //  console.log(`🔄 Toggling status for role ID: ${roleId}`);

    if (!roleId || isNaN(roleId)) {
      return res.status(400).json(createApiResponse(false, 'Valid role ID is required'));
    }

    // Check if role exists
    const [roleCheck] = await db.execute(`
      SELECT id, name, is_active FROM roles WHERE id = ?
    `, [roleId]);
    
    if (roleCheck.length === 0) {
      return res.status(404).json(createApiResponse(false, 'Role not found'));
    }

    const role = roleCheck[0];

    // Prevent deactivating superadmin role for security
    if (role.name.toLowerCase() === 'superadmin' && role.is_active === 1) {
      return res.status(400).json(createApiResponse(false, 'Cannot deactivate superadmin role'));
    }

    const newStatus = role.is_active === 1 ? 0 : 1;
    
    // Update role status
    await db.execute(
      'UPDATE roles SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, roleId]
    );

    // Log activity
    if (global.logActivity) {
      await global.logActivity(req.user.userId, 'toggle_role_status', 'role_management', req);
    }

    const responseData = {
      id: role.id,
      name: role.name,
      is_active: newStatus,
      status: newStatus ? 'Active' : 'Inactive'
    };

   // console.log(`✅ Role status toggled: ${role.name} is now ${newStatus ? 'Active' : 'Inactive'}`);
    res.json(createApiResponse(true, `Role ${newStatus ? 'activated' : 'deactivated'} successfully`, responseData));

  } catch (error) {
   // console.error('Toggle role status error:', error);
    res.status(500).json(createApiResponse(false, 'Internal server error'));
  }
}

  static async deleteRole(req, res) {
    try {
      const { roleId } = req.params;
      
      console.log(`🗑️ Attempting to delete role ID: ${roleId}`);

      const [roleCheck] = await db.execute('SELECT name FROM roles WHERE id = ?', [roleId]);
      if (roleCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Role not found'));
      }

      const systemRoles = ['superadmin', 'admin'];
      if (systemRoles.includes(roleCheck[0].name)) {
        return res.status(400).json(createApiResponse(false, 'Cannot delete system roles'));
      }

      const [userCheck] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role_id = ? AND is_active = true', [roleId]);
      if (userCheck[0].count > 0) {
        return res.status(400).json(createApiResponse(false, `Cannot delete role with ${userCheck[0].count} active users`));
      }

      await db.execute('DELETE FROM roles WHERE id = ?', [roleId]);

      if (global.logActivity) {
        await global.logActivity(req.user.userId, 'delete_role', 'role_management', req);
      }

      console.log(`✅ Role '${roleCheck[0].name}' deleted successfully`);
      res.json(createApiResponse(true, 'Role deleted successfully'));

    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  static async updateRole(req, res) {
    try {
      const { roleId } = req.params;
      const { name, description } = req.body;

      console.log(`🔧 Updating role ID: ${roleId}`, { name, description });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      // Check if role exists
      const [roleCheck] = await db.execute('SELECT name FROM roles WHERE id = ?', [roleId]);
      if (roleCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Role not found'));
      }

      // Prevent updating system roles
      const systemRoles = ['superadmin', 'admin'];
      if (systemRoles.includes(roleCheck[0].name)) {
        return res.status(400).json(createApiResponse(false, 'Cannot update system roles'));
      }

      // Check if new name already exists (if name is being changed)
      if (name && name !== roleCheck[0].name) {
        const [existingRoles] = await db.execute('SELECT id FROM roles WHERE name = ? AND id != ?', [name, roleId]);
        if (existingRoles.length > 0) {
          return res.status(400).json(createApiResponse(false, 'Role name already exists'));
        }
      }

      // Update role
      await db.execute(
        'UPDATE roles SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name || roleCheck[0].name, description, roleId]
      );

      // Log activity
      if (global.logActivity) {
        await global.logActivity(req.user.userId, 'update_role', 'role_management', req);
      }

      const responseData = {
        roleId: parseInt(roleId),
        name: name || roleCheck[0].name,
        description,
        label: name || roleCheck[0].name,
        fullLabel: `${name || roleCheck[0].name} - ${description}`,
        value: parseInt(roleId)
      };

      console.log('✅ Role updated successfully:', responseData);
      res.json(createApiResponse(true, 'Role updated successfully', responseData));

    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  static async getRoleById(req, res) {
    try {
      const { roleId } = req.params;

      console.log(`👤 Getting role by ID: ${roleId}`);

      const [roles] = await db.execute(`
        SELECT r.*, 
               COUNT(u.id) as user_count,
               COUNT(rp.id) as permission_count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id AND u.is_active = true
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        WHERE r.id = ?
        GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
      `, [roleId]);

      if (roles.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Role not found'));
      }

      const role = roles[0];
      const responseData = {
        id: role.id,
        name: role.name,
        description: role.description,
        label: role.name,
        fullLabel: `${role.name} - ${role.description}`,
        value: role.id,
        created_at: role.created_at,
        updated_at: role.updated_at,
        user_count: role.user_count,
        permission_count: role.permission_count
      };

      res.json(createApiResponse(true, 'Role retrieved successfully', responseData));

    } catch (error) {
      console.error('Get role by ID error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  static async createRoleWithPermissions(req, res) {
    try {
      console.log('Creating role with permissions:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      const { name, description, permissions } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json(createApiResponse(false, 'Role name is required'));
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json(createApiResponse(false, 'At least one module permission is required'));
      }

      // Check if role already exists
      const [existingRoles] = await db.execute('SELECT id FROM roles WHERE name = ?', [name]);
      if (existingRoles.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Role name already exists'));
      }

      // Start transaction
      await db.query('START TRANSACTION');

      try {
        // Create the role
        const [roleResult] = await db.execute(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
          [name, description]
        );

        const roleId = roleResult.insertId;
        console.log(`Role created with ID: ${roleId}`);

        // Insert permissions (INCLUDING can_add)
        let insertedCount = 0;
        for (const perm of permissions) {
          if (!perm.module_id) {
            throw new Error('Each permission must have module_id');
          }

          // Only insert if at least one permission is true (INCLUDING can_add)
          if (perm.can_view || perm.can_add || perm.can_edit || perm.can_delete) {
            await db.execute(`
              INSERT INTO role_permissions (role_id, module_id, can_view, can_add, can_edit, can_delete)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [roleId, perm.module_id, perm.can_view || false, perm.can_add || false, perm.can_edit || false, perm.can_delete || false]);
            insertedCount++;
          }
        }

        await db.query('COMMIT');

        // Log activity
        if (global.logActivity) {
          await global.logActivity(req.user.userId, 'create_role_with_permissions', 'role_management', req);
        }

        const responseData = {
          roleId: roleId,
          name,
          description,
          assignedModules: insertedCount,
          permissions: permissions.filter(p => p.can_view || p.can_add || p.can_edit || p.can_delete)
        };

        console.log('Role with permissions created successfully:', responseData);
        res.status(201).json(createApiResponse(true, 'Role created with permissions successfully', responseData));

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Create role with permissions error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Delete module (with safety checks for sub-modules)
  static async deleteModule(req, res) {
    try {
      const { moduleId } = req.params;
      
      console.log(`🗑️ Attempting to delete module ID: ${moduleId}`);

      // Check if module exists and get its details
      const [moduleCheck] = await db.execute(`
        SELECT m.id, m.name, m.parent_id, p.name as parent_name
        FROM modules m
        LEFT JOIN modules p ON m.parent_id = p.id
        WHERE m.id = ?
      `, [moduleId]);
      
      if (moduleCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Module not found'));
      }

      const module = moduleCheck[0];

      // Check if this is a parent module with sub-modules
      if (!module.parent_id) {
        const [subModuleCheck] = await db.execute('SELECT COUNT(*) as count FROM modules WHERE parent_id = ?', [moduleId]);
        if (subModuleCheck[0].count > 0) {
          return res.status(400).json(createApiResponse(false, `Cannot delete parent module with ${subModuleCheck[0].count} sub-modules. Delete sub-modules first.`));
        }
      }

      // Check if module has permissions assigned
      const [permissionCheck] = await db.execute('SELECT COUNT(*) as count FROM role_permissions WHERE module_id = ?', [moduleId]);
      if (permissionCheck[0].count > 0) {
        return res.status(400).json(createApiResponse(false, `Cannot delete module with ${permissionCheck[0].count} role permissions. Remove permissions first.`));
      }

      // Delete module
      await db.execute('DELETE FROM modules WHERE id = ?', [moduleId]);

      // Log activity
      if (global.logActivity) {
        await global.logActivity(req.user.userId, 'delete_module', 'module_management', req);
      }

      console.log(`✅ Module '${module.name}' deleted successfully`);
      res.json(createApiResponse(true, `${module.parent_id ? 'Sub-module' : 'Module'} deleted successfully`));

    } catch (error) {
      console.error('Delete module error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  // Update module (including moving between parent modules)
  static async updateModule(req, res) {
    try {
      const { moduleId } = req.params;
      const { name, route, description, parent_id } = req.body;

      console.log(`🔧 Updating module ID: ${moduleId}`, { name, route, description, parent_id });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      // Check if module exists
      const [moduleCheck] = await db.execute('SELECT * FROM modules WHERE id = ?', [moduleId]);
      if (moduleCheck.length === 0) {
        return res.status(404).json(createApiResponse(false, 'Module not found'));
      }

      const currentModule = moduleCheck[0];

      // If trying to set parent_id, validate the parent exists and is not a sub-module
      if (parent_id && parent_id !== currentModule.parent_id) {
        const [parentCheck] = await db.execute('SELECT id, name FROM modules WHERE id = ? AND parent_id IS NULL', [parent_id]);
        if (parentCheck.length === 0) {
          return res.status(400).json(createApiResponse(false, 'Invalid parent module ID or parent module is also a sub-module'));
        }

        // Prevent making a parent module a sub-module if it has children
        if (!currentModule.parent_id) {
          const [childrenCheck] = await db.execute('SELECT COUNT(*) as count FROM modules WHERE parent_id = ?', [moduleId]);
          if (childrenCheck[0].count > 0) {
            return res.status(400).json(createApiResponse(false, 'Cannot make a parent module into a sub-module while it has children'));
          }
        }
      }

      // Check if new name/route already exists (excluding current module)
      const [existingModules] = await db.execute(
        'SELECT id FROM modules WHERE (name = ? OR route = ?) AND id != ?', 
        [name || currentModule.name, route || currentModule.route, moduleId]
      );
      if (existingModules.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Module name or route already exists'));
      }

      // Update module
      await db.execute(
        'UPDATE modules SET name = ?, route = ?, description = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
          name || currentModule.name, 
          route || currentModule.route, 
          description || currentModule.description, 
          parent_id || currentModule.parent_id, 
          moduleId
        ]
      );

      // Log activity
      if (global.logActivity) {
        await global.logActivity(req.user.userId, 'update_module', 'module_management', req);
      }

      // Get updated module with parent info
      const [updatedModule] = await db.execute(`
        SELECT m.*, p.name as parent_name
        FROM modules m
        LEFT JOIN modules p ON m.parent_id = p.id
        WHERE m.id = ?
      `, [moduleId]);

      const module = updatedModule[0];
      const responseData = {
        moduleId: parseInt(moduleId),
        name: module.name,
        route: module.route,
        description: module.description,
        parent_id: module.parent_id,
        parent_name: module.parent_name,
        module_type: module.parent_id ? 'Sub Module' : 'Parent Module',
        label: module.parent_name ? `${module.parent_name} → ${module.name}` : module.name,
        fullLabel: module.parent_name 
          ? `${module.parent_name} → ${module.name} - ${module.description}` 
          : `${module.name} - ${module.description}`,
        value: parseInt(moduleId)
      };

      console.log('✅ Module updated successfully:', responseData);
      res.json(createApiResponse(true, 'Module updated successfully', responseData));

    } catch (error) {
      console.error('Update module error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }
}

module.exports = RoleController;
