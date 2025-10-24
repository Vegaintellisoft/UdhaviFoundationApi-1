// utils/helpers.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate random password
const generatePassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + specialChars;
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Generate secure random string
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength score
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length bonus
  score += Math.min(password.length * 2, 20);
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/[0-9]/.test(password)) score += 5;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;
  
  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 10; // Common patterns
  
  score = Math.max(0, Math.min(100, score));
  
  if (score < 30) return 'weak';
  if (score < 60) return 'medium';
  if (score < 80) return 'strong';
  return 'very strong';
};

// Validate username
const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  const errors = [];
  
  if (!usernameRegex.test(username)) {
    errors.push('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
  }
  
  if (username.toLowerCase().includes('admin') || username.toLowerCase().includes('root')) {
    errors.push('Username cannot contain reserved words');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format date for display
const formatDate = (date, format = 'full') => {
  const dateObj = new Date(date);
  
  const options = {
    full: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    },
    date: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    },
    relative: null // Will be handled separately
  };
  
  if (format === 'relative') {
    return getRelativeTime(dateObj);
  }
  
  return dateObj.toLocaleString('en-US', options[format] || options.full);
};

// Get relative time (e.g., "2 hours ago")
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\\/g, '') // Remove backslashes
    .substring(0, 1000); // Limit length
};

// Sanitize object inputs recursively
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeInput(key)] = sanitizeObject(value);
  }
  
  return sanitized;
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate JWT token
const generateJWTToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Verify JWT token
const verifyJWTToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

// Parse user agent
const parseUserAgent = (userAgent) => {
  if (!userAgent) return 'Unknown';
  
  // Simple user agent parsing
  const browsers = [
    { name: 'Chrome', pattern: /Chrome\/[\d.]+/ },
    { name: 'Firefox', pattern: /Firefox\/[\d.]+/ },
    { name: 'Safari', pattern: /Version\/[\d.]+ Safari/ },
    { name: 'Edge', pattern: /Edg\/[\d.]+/ },
    { name: 'Internet Explorer', pattern: /MSIE [\d.]+/ }
  ];
  
  for (const browser of browsers) {
    if (browser.pattern.test(userAgent)) {
      return browser.name;
    }
  }
  
  return 'Unknown Browser';
};

// Validate phone number
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Format phone number
const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if not standard format
};

// Generate API response
const createApiResponse = (success = true, message = '', data = null, errors = null) => {
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

// Paginate results
const paginate = (page = 1, limit = 10, total = 0) => {
  const currentPage = Math.max(1, parseInt(page));
  const pageSize = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 items per page
  const offset = (currentPage - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    currentPage,
    pageSize,
    offset,
    totalPages,
    total,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1
  };
};

// Validate file upload
const validateFileUpload = (file, allowedTypes = ['image/jpeg', 'image/png'], maxSize = 5 * 1024 * 1024) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    errors.push(`File size too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate file name
const generateFileName = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  
  return `${prefix}${timestamp}_${random}.${extension}`;
};

// Convert bytes to human readable format
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Rate limiting helper
const createRateLimitKey = (identifier, action) => {
  return `rate_limit:${action}:${identifier}`;
};

// Escape SQL LIKE wildcards
const escapeLikeString = (str) => {
  return str.replace(/[%_\\]/g, '\\$&');
};

// Generate slug from string
const generateSlug = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Validate date range
const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  const errors = [];
  
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }
  
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }
  
  if (start >= end) {
    errors.push('Start date must be before end date');
  }
  
  if (end > now) {
    errors.push('End date cannot be in the future');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
};

// Remove sensitive data from user object
const sanitizeUserData = (user) => {
  const sanitized = deepClone(user);
  delete sanitized.password;
  delete sanitized.reset_token;
  delete sanitized.reset_token_expires;
  return sanitized;
};

// Log error with context
const logError = (error, context = {}) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  console.error('Error:', JSON.stringify(errorLog, null, 2));
  
  // In production, you might want to send this to a logging service
  // like Winston, Sentry, or CloudWatch
};

// Retry async operation
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

module.exports = {
  generatePassword,
  generateSecureToken,
  isValidEmail,
  validatePasswordStrength,
  calculatePasswordStrength,
  validateUsername,
  formatDate,
  getRelativeTime,
  generateSessionId,
  sanitizeInput,
  sanitizeObject,
  hashPassword,
  comparePassword,
  generateJWTToken,
  verifyJWTToken,
  getClientIP,
  parseUserAgent,
  validatePhoneNumber,
  formatPhoneNumber,
  createApiResponse,
  paginate,
  validateFileUpload,
  generateFileName,
  formatBytes,
  createRateLimitKey,
  escapeLikeString,
  generateSlug,
  validateDateRange,
  deepClone,
  sanitizeUserData,
  logError,
  retryOperation
};