// routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Validation rules
const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/login', loginValidation, AuthController.login);
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/profile', authMiddleware, AuthController.getProfile);

module.exports = router;