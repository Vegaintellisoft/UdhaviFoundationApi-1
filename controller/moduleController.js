//ModuleController.js
const { validationResult } = require('express-validator');
const db = require('../database/connection');

const createApiResponse = (success, message, data = null, errors = null) => {
  const response = { success, message, timestamp: new Date().toISOString() };
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  return response;
};

class ModuleController {
  static async getAllModules(req, res) {
    try {
      const [modules] = await db.execute('SELECT * FROM modules ORDER BY name');
      res.json(createApiResponse(true, 'Modules retrieved successfully', { modules }));
    } catch (error) {
      console.error('Get modules error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }

  static async createModule(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createApiResponse(false, 'Validation failed', null, errors.array()));
      }

      const { name, route, description } = req.body;

      // Check if module exists
      const [existing] = await db.execute('SELECT id FROM modules WHERE name = ? OR route = ?', [name, route]);
      if (existing.length > 0) {
        return res.status(400).json(createApiResponse(false, 'Module name or route already exists'));
      }

      const [result] = await db.execute(
        'INSERT INTO modules (name, route, description) VALUES (?, ?, ?)',
        [name, route, description]
      );

      res.status(201).json(createApiResponse(true, 'Module created successfully', {
        moduleId: result.insertId,
        name, route, description
      }));
    } catch (error) {
      console.error('Create module error:', error);
      res.status(500).json(createApiResponse(false, 'Internal server error'));
    }
  }
}

module.exports = ModuleController;