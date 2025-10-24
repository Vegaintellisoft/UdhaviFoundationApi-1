const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const UserController = require('../controller/usercontroller');
const authMiddleware = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');
const { uploadConfigs, handleUploadError } = require('../utils/uploadUtil');

// Validation should match your table structure (company and department as text)
const createUserValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phoneNo').notEmpty().withMessage('Phone number is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender required'),
  body('company').notEmpty().withMessage('Company is required'),        // Changed from company_id
  body('department').notEmpty().withMessage('Department is required'),  // Changed from department_id
  body('role_id').isInt({ min: 1 }).withMessage('Role ID is required'),
  body('status').isIn(['Active', 'Inactive']).withMessage('Valid status required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').notEmpty().withMessage('Confirm password is required')
];

const updateUserValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender required'),
  body('company_id').isInt({ min: 1 }).withMessage('Company is required'),
  body('department_id').isInt({ min: 1 }).withMessage('Department is required'),
  body('role_id').isInt({ min: 1 }).withMessage('Role is required'),
  body('is_active').isIn([0, 1]).withMessage('Valid status required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

router.get('/', authMiddleware, permissionMiddleware(['superadmin', 'admin']), UserController.getAllUsers);

// Custom validation that works after multer
const validateUserAfterUpload = (req, res, next) => {
  const { firstName, lastName, email, phoneNo, gender, company, department, role_id, status, password, confirmPassword } = req.body;
  
  const errors = [];
  
  if (!firstName) errors.push({ type: 'field', msg: 'First name is required', path: 'firstName', location: 'body' });
  if (!lastName) errors.push({ type: 'field', msg: 'Last name is required', path: 'lastName', location: 'body' });
  if (!email || !/\S+@\S+\.\S+/.test(email)) errors.push({ type: 'field', msg: 'Valid email is required', path: 'email', location: 'body' });
  if (!phoneNo) errors.push({ type: 'field', msg: 'Phone number is required', path: 'phoneNo', location: 'body' });
  if (!['male', 'female', 'other'].includes(gender)) errors.push({ type: 'field', msg: 'Valid gender required', path: 'gender', location: 'body' });
  if (!company) errors.push({ type: 'field', msg: 'Company is required', path: 'company', location: 'body' });
  if (!department) errors.push({ type: 'field', msg: 'Department is required', path: 'department', location: 'body' });
  if (!role_id || isNaN(parseInt(role_id))) errors.push({ type: 'field', msg: 'Role ID is required', path: 'role_id', location: 'body' });
  if (!['Active', 'Inactive'].includes(status)) errors.push({ type: 'field', msg: 'Valid status required', path: 'status', location: 'body' });
  if (!password || password.length < 6) errors.push({ type: 'field', msg: 'Password must be at least 6 characters', path: 'password', location: 'body' });
  if (!confirmPassword) errors.push({ type: 'field', msg: 'Confirm password is required', path: 'confirmPassword', location: 'body' });
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      timestamp: new Date().toISOString(),
      errors: errors
    });
  }
  
  next();
};

// Update your route
router.post('/',
  authMiddleware,
  permissionMiddleware(['superadmin']),
  uploadConfigs.multipleDocuments, // Process file upload first
  handleUploadError, // Handle upload errors
  validateUserAfterUpload, // Custom validation after multer
  UserController.createUser
);

router.get('/roles-dropdown', authMiddleware, permissionMiddleware(['superadmin', 'admin']), UserController.getRolesForDropdown);
router.get('/companies-dropdown', authMiddleware, permissionMiddleware(['superadmin', 'admin']), UserController.getCompaniesDropdown);
router.get('/departments-dropdown', authMiddleware, permissionMiddleware(['superadmin', 'admin']), UserController.getDepartmentsDropdown);

router.put('/:userId/status', UserController.toggleStatus);
 
// Update user by ID
//router.put('/users/:id', UserController.updateUser);
router.put(
  '/:id',
  authMiddleware,
  permissionMiddleware(['superadmin']),
  uploadConfigs.multipleDocuments, // multiple files including profile_photo
  handleUploadError,
  UserController.updateUser
);
router.get('/:id', authMiddleware, permissionMiddleware(['superadmin']), UserController.getUserById);

module.exports = router;
