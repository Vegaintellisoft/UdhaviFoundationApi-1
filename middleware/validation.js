// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

class ValidationMiddleware {
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }

  static validateServiceCategory() {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be 2-100 characters'),
      body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description too long'),
      body('category')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Category too long'),
      body('base_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Base price must be positive'),
      this.handleValidationErrors
    ];
  }

  static validateProvider() {
    return [
      body('full_name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be 2-100 characters'),
      body('email_address')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
      body('mobile_number')
        .isMobilePhone('any')
        .withMessage('Valid mobile number required'),
      body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude required'),
      body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude required'),
      body('service_type_ids')
        .custom((value) => {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed) || parsed.length === 0) {
              throw new Error('At least one service type required');
            }
            return true;
          } catch {
            throw new Error('Invalid service types format');
          }
        }),
      body('experience_years')
        .isInt({ min: 0, max: 50 })
        .withMessage('Experience years must be 0-50'),
      this.handleValidationErrors
    ];
  }

  static validateBooking() {
    return [
      body('customer_id')
        .isInt({ min: 1 })
        .withMessage('Valid customer ID required'),
      body('service_provider_id')
        .isInt({ min: 1 })
        .withMessage('Valid service provider ID required'),
      body('service_id')
        .isInt({ min: 1 })
        .withMessage('Valid service ID required'),
      body('service_date')
        .isISO8601()
        .withMessage('Valid service date required'),
      body('days_per_week')
        .optional()
        .isInt({ min: 1, max: 7 })
        .withMessage('Days per week must be 1-7'),
      this.handleValidationErrors
    ];
  }

  static validateSearch() {
    return [
      body('service_type_id')
        .isInt({ min: 1 })
        .withMessage('Valid service type ID required'),
      body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude required'),
      body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude required'),
      body('radius')
        .optional()
        .isFloat({ min: 1, max: 100 })
        .withMessage('Radius must be 1-100 km'),
      this.handleValidationErrors
    ];
  }

  static validateId() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('Valid ID required'),
      this.handleValidationErrors
    ];
  }
}

// middleware/auth.js
const jwt = require('jsonwebtoken');
const { Database } = require('../config/database');

class AuthMiddleware {
  static async validateSession(req, res, next) {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                          req.headers['x-session-token'] || 
                          req.query.session_token;

      if (!sessionToken) {
        return res.status(401).json({
          success: false,
          message: 'Session token required'
        });
      }

      // Check if session token exists in database
      const user = await Database.query(
        'SELECT registration_id, mobile_number FROM user_registrations WHERE session_token = ?',
        [sessionToken]
      );

      if (user.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session token'
        });
      }

      req.user = {
        registration_id: user[0].registration_id,
        mobile_number: user[0].mobile_number
      };

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        error: error.message
      });
    }
  }

  static async validateProvider(req, res, next) {
    try {
      await AuthMiddleware.validateSession(req, res, async () => {
        // Check if user is an approved provider
        const provider = await Database.query(
          'SELECT registration_status FROM user_registrations WHERE registration_id = ?',
          [req.user.registration_id]
        );

        if (provider.length === 0 || provider[0].registration_status !== 'approved') {
          return res.status(403).json({
            success: false,
            message: 'Provider access required'
          });
        }

        next();
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Provider validation failed',
        error: error.message
      });
    }
  }

  static async validateAdmin(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Admin token required'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check admin user in users table
      const admin = await Database.query(
        'SELECT id, role_id FROM users WHERE id = ? AND is_active = 1',
        [decoded.userId]
      );

      if (admin.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Admin access denied'
        });
      }

      req.admin = { id: admin[0].id, role_id: admin[0].role_id };
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid admin token'
      });
    }
  }
}

// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class UploadMiddleware {
  static createUploadConfig(uploadPath, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']) {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const fullPath = path.join(__dirname, '..', 'uploads', uploadPath);
        try {
          await fs.mkdir(fullPath, { recursive: true });
          cb(null, fullPath);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    const fileFilter = (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${allowedTypes.join(', ')} files are allowed`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      }
    });
  }

  static serviceImages() {
    return this.createUploadConfig('services').fields([
      { name: 'icon', maxCount: 1 },
      { name: 'service_image', maxCount: 1 }
    ]);
  }

  static providerImages() {
    return this.createUploadConfig('providers').fields([
      { name: 'profile_image', maxCount: 1 },
      { name: 'service_image', maxCount: 1 }
    ]);
  }

  static singleImage(fieldName) {
    return this.createUploadConfig('general').single(fieldName);
  }
}

// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

class RateLimitMiddleware {
  static createLimiter(windowMs, max, message) {
    return rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        message: message || 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  static general() {
    return this.createLimiter(
      15 * 60 * 1000, // 15 minutes
      100, // 100 requests per window
      'Too many requests from this IP'
    );
  }

  static search() {
    return this.createLimiter(
      60 * 1000, // 1 minute
      30, // 30 searches per minute
      'Too many search requests'
    );
  }

  static auth() {
    return this.createLimiter(
      15 * 60 * 1000, // 15 minutes
      5, // 5 attempts per window
      'Too many authentication attempts'
    );
  }

  static booking() {
    return this.createLimiter(
      60 * 1000, // 1 minute
      10, // 10 bookings per minute
      'Too many booking requests'
    );
  }
}

// middleware/errorHandler.js
class ErrorHandler {
  static notFound(req, res, next) {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.status = 404;
    next(error);
  }

  static globalErrorHandler(error, req, res, next) {
    let statusCode = error.status || 500;
    let message = error.message || 'Internal Server Error';

    // Handle specific error types
    if (error.code === 'ER_DUP_ENTRY') {
      statusCode = 409;
      message = 'Duplicate entry found';
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      statusCode = 400;
      message = 'Invalid reference data';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
    }

    // Log error for debugging
    console.error(`Error ${statusCode}: ${message}`, {
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

// helpers/responseHelper.js
class ResponseHelper {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, message = 'Error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil(pagination.total / pagination.limit)
      },
      timestamp: new Date().toISOString()
    });
  }
}

// helpers/utilities.js
class Utilities {
  static generateSessionToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  static formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  static generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  static isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  static getPagination(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return {
      limit: parseInt(limit),
      offset: parseInt(offset),
      page: parseInt(page)
    };
  }
}

// helpers/priceCalculator.js
class PriceCalculator {
  static calculateServicePrice(baseRate, filters = [], rateType = 'hourly') {
    let totalPrice = parseFloat(baseRate) || 0;
    let additionalCharges = 0;

    if (filters && Array.isArray(filters)) {
      filters.forEach(filter => {
        if (filter.selected_values && Array.isArray(filter.selected_values)) {
          filter.selected_values.forEach(value => {
            additionalCharges += this.getFilterPriceModifier(filter.filter_id, value);
          });
        }
      });
    }

    return {
      base_rate: totalPrice,
      additional_charges: additionalCharges,
      total_price: totalPrice + additionalCharges
    };
  }

  static getFilterPriceModifier(filterId, selectedValue) {
    // This would query database for actual price modifiers
    // For now returning 0, implement based on your filter structure
    return 0;
  }

  static estimateServiceCost(serviceData) {
    const {
      hourly_rate,
      hours_per_day = 1,
      days_per_week = 1,
      weeks = 1,
      filters = [],
      travel_charges = 0
    } = serviceData;

    const baseRate = parseFloat(hourly_rate) || 0;
    const totalHours = hours_per_day * days_per_week * weeks;
    const baseAmount = baseRate * totalHours;
    
    const priceCalc = this.calculateServicePrice(baseRate, filters);
    const additionalPerHour = priceCalc.additional_charges;
    const totalAdditional = additionalPerHour * totalHours;
    
    return {
      base_amount: baseAmount,
      additional_charges: totalAdditional,
      travel_charges: parseFloat(travel_charges) || 0,
      total_hours: totalHours,
      grand_total: baseAmount + totalAdditional + (parseFloat(travel_charges) || 0)
    };
  }
}

module.exports = {
  ValidationMiddleware,
  AuthMiddleware,
  UploadMiddleware,
  RateLimitMiddleware,
  ErrorHandler,
  ResponseHelper,
  Utilities,
  PriceCalculator
};