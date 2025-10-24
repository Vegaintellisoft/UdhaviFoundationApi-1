const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const RoleController = require('../controller/roleController');
const authMiddleware = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');

const createModuleValidation = [
  body('name').notEmpty().withMessage('Module name is required').isLength({ max: 50 }),
  body('route').notEmpty().withMessage('Route is required'),
  body('description').optional().isLength({ max: 500 })
];

router.get('/', authMiddleware, permissionMiddleware(['superadmin', 'admin']), RoleController.getAllModules);
router.post('/', authMiddleware, permissionMiddleware(['superadmin']), createModuleValidation, RoleController.createModule);

module.exports = router;