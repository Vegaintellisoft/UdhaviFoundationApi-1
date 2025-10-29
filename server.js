// server.js - Updated Version with Service Search API Integration
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database & Middlewares
const db = require('./database/connection');


const paymentRoutes = require("./routes/paymentRoutes");

//Payment Routes
app.use('/payment', paymentRoutes);

const authMiddleware = require('./middleware/auth');



// Helper functions
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);
};


//app.use('/api/users', userRoutes);
// Activity Logging with Enhanced User Permission Tracking
const logActivity = async (userId, action, module = null, req = null, additionalData = null) => {
  try {
    const ipAddress = req ? getClientIP(req) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    let query = 'INSERT INTO activity_logs (user_id, action, module, ip_address, user_agent';
    let values = [userId, action, module, ipAddress, userAgent];

    // Add additional data for permission tracking
    if (additionalData) {
      query += ', target_user_id, permission_details';
      values.push(additionalData.target_user_id || null, JSON.stringify(additionalData));
    }

    if (action === 'login') {
      query += ', login_time) VALUES (?, ?, ?, ?, ?, ' + (additionalData ? '?, ?, ' : '') + 'NOW())';
    } else if (action === 'logout') {
      query += ', logout_time) VALUES (?, ?, ?, ?, ?, ' + (additionalData ? '?, ?, ' : '') + 'NOW())';
    } else {
      query += ') VALUES (?, ?, ?, ?, ?' + (additionalData ? ', ?, ?' : '') + ')';
    }

    await db.execute(query, values);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Make logActivity globally available
global.logActivity = logActivity;
const directRegistrationRouter = require('./routes/direct_registration_routes');

app.use('/api/direct-registration', directRegistrationRouter);

// === Load Controllers Safely ===
const loadModule = (path, name) => {
  try {
    const mod = require(path);
    console.log(`✅ ${name} loaded successfully`);
    return mod;
  } catch (err) {
    console.error(`❌ Failed to load ${name}:`, err.message);
    return null;
  }
};


// Load controllers
const authController = loadModule('./controller/authController', 'Auth Controller');
const userController = loadModule('./controller/usercontroller', 'User Controller');
const roleController = loadModule('./controller/roleController', 'Role Controller');
const userPermissionsController = loadModule('./controller/userPermissionsController', 'User Permissions Controller');
const dropdownController = loadModule('./controller/dropdown_controller', 'Dropdown Controller');
const registrationController = loadModule('./controller/registration_controller', 'Registration Controller');
const tempCustomerController = loadModule('./controller/tempcustomerController', 'Temporary Customer Controller');
const directRegistrationController = loadModule('./controller/direct_registration_controller', 'Direct Registration Controller');
// Load Location Search Controller
const locationSearchController = loadModule('./controller/location_search_controller', 'Location Search Controller');

// Load Service Search Controller - NEW
const serviceSearchController = loadModule('./controller/serviceSearchController', 'Service Search Controller');
const { permissionMiddleware, userModulePermissionMiddleware } = require('./middleware/permissions');
const serviceManagementController = loadModule('./controller/serviceManagementController', 'Service Management Controller');
const providerManagementController = loadModule('./controller/providerManagementController', 'Provider Management Controller');
const bookingManagementController = loadModule('./controller/bookingManagementController', 'Booking Management Controller');
const masterDataController = loadModule('./controller/masterDataController', 'Master Data Controller');
const analyticsController = loadModule('./controller/analyticsController', 'Analytics Controller');

// Load utilities
const uploadUtil = loadModule('./utils/uploadUtil', 'Upload Utilities');

// Upload configurations
const uploadConfigs = uploadUtil?.uploadConfigs || {};
const handleUploadError = uploadUtil?.handleUploadError;
// === Direct Registration Routes (NO SESSION TOKEN REQUIRED) ===
if (directRegistrationController) {
  try {
    const directRegistrationRoutes = require('./routes/direct_registration_routes');
    app.use('/api/direct-registration', directRegistrationRoutes);
    console.log('✅ Direct Registration routes registered at /api/direct-registration');
  } catch (err) {
    console.error('❌ Failed to load direct registration routes:', err.message);
  }
} else {
  console.warn('⚠️  Direct Registration routes skipped - controller not found');
}
// Upload middleware helper
const getUploadMiddleware = (configName) =>
  uploadConfigs[configName] && handleUploadError
    ? [uploadConfigs[configName], handleUploadError]
    : [];


const fs = require('fs');

// Ensure upload directories exist for direct registration
const uploadDirs = [
  'uploads/documents',           // For step1 and step5 multiple documents
  'uploads/service-images',      // For step3 service images
  'uploads/police-verification', // For step4 police verification
  'uploads/bank-documents'       // For step6 bank documents
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created upload directory: ${dir}`);
  }
});

// === Direct Registration Routes (NO SESSION TOKEN REQUIRED) ===
if (directRegistrationController) {
  try {
    const directRegistrationRoutes = require('./routes/direct_registration_routes');
    app.use('/api/direct-registration', directRegistrationRoutes);
    console.log('✅ Direct Registration routes registered at /api/direct-registration');
  } catch (err) {
    console.error('❌ Failed to load direct registration routes:', err.message);
  }
} else {
  console.warn('⚠️ Direct Registration routes skipped - controller not found');
}

const serviceBookingController = loadModule('./controller/serviceBookingController', 'Service Booking Controller');


// if (serviceBookingController) {
//   console.log('Registering Service Booking routes directly...');
  
//   const { body, param,query, validationResult } = require('express-validator');
  
 
//    const handleValidationErrors = (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }
//     next();
//   };

//   // Basic Service Booking Routes
//   app.get('/api/booking/services', serviceBookingController.getAllServices);
//   app.get('/api/booking/filters/:service_id', serviceBookingController.getServiceFilters);
//   app.post('/api/booking/create', serviceBookingController.createBooking);
//   app.get('/api/booking/customer/:customer_id', serviceBookingController.getCustomerBookings);
//   app.get('/api/booking/details/:booking_id', serviceBookingController.getBookingDetails);
//   app.patch('/api/booking/status/:booking_id', serviceBookingController.updateBookingStatus);
//   app.patch('/api/booking/cancel/:booking_id', serviceBookingController.cancelBooking);
//   app.get('/api/booking/provider/:service_provider_id', serviceBookingController.getServiceProviderBookings);
//   app.get('/api/booking/search', serviceBookingController.searchBookings);
//   app.get('/api/booking/stats', serviceBookingController.getBookingStats);

//   // Provider Configuration Routes
//   app.post('/api/booking/provider/save-service-config',
//     uploadConfigs.serviceImage,
//     handleUploadError,
//     serviceBookingController.saveProviderServiceConfiguration
//   );

//   app.post('/api/booking/search-providers-by-filters',
//     [
//       body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
//       body('customer_filters').isArray({ min: 1 }).withMessage('Customer filters required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.searchProvidersByFilters
//   );
  
//  app.get('/api/booking/providers', 
//         serviceBookingController.getServiceProviders
//     );

//   app.get('/api/booking/provider/:provider_id/service-configs',
//     [
//       param('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.getProviderServiceConfigurations
//   );

//   // NEW: Provider Table Management Routes
//   app.get('/api/booking/provider-configurations', 
//       serviceBookingController.getAllProviderConfigurations
//   );

//   app.put('/api/booking/provider-configurations/:configId',
//       uploadConfigs.serviceImage,
//       handleUploadError,
//       serviceBookingController.updateProviderConfiguration
//   );

//   app.get('/api/booking/provider-configurations/:configId',
//       serviceBookingController.getProviderConfigurationById
//   );

//   // NEW: Toggle provider configuration status
// app.patch('/api/booking/provider-configurations/:configId/toggle-status',
//     serviceBookingController.toggleProviderConfigurationStatus
// );

//   // Utility Routes
//   app.get('/api/booking/status-options', (req, res) => {
//     res.json({
//       success: true,
//       message: 'Booking status options retrieved',
//       data: {
//         status_options: [
//           { value: 'pending', label: 'Pending Confirmation', color: 'orange' },
//           { value: 'confirmed', label: 'Confirmed', color: 'green' },
//           { value: 'in_progress', label: 'In Progress', color: 'blue' },
//           { value: 'completed', label: 'Completed', color: 'green' },
//           { value: 'cancelled', label: 'Cancelled', color: 'red' }
//         ]
//       }
//     });
//   });

//   app.get('/api/booking/categories', (req, res) => {
//     res.json({
//       success: true,
//       message: 'Service categories retrieved',
//       data: {
//         categories: [
//           { id: 1, name: 'Child Care', description: 'Baby sitting and child care services' },
//           { id: 2, name: 'Senior Care', description: 'Elderly care and assistance services' },
//           { id: 3, name: 'Household', description: 'Cooking and household management' },
//           { id: 4, name: 'Maintenance', description: 'Garden and property maintenance' },
//           { id: 5, name: 'Transportation', description: 'Driver and transportation services' },
//           { id: 6, name: 'Cleaning', description: 'House cleaning and sanitization' },
//           { id: 7, name: 'Pet Services', description: 'Pet care and grooming services' }
//         ]
//       }
//     });
//   });

//   app.get('/api/booking/health', (req, res) => {
//     res.json({
//       success: true,
//       message: 'Service Booking API is healthy',
//       timestamp: new Date().toISOString(),
//       version: '2.0.0'
//     });
//   });

//   app.get('/api/booking/docs', (req, res) => {
//     res.json({
//       title: 'Service Booking API Documentation',
//       version: '2.0.0',
//       baseURL: '/api/booking',
//       endpoints: {
//         services: 'GET /services - Get all services',
//         filters: 'GET /filters/:service_id - Get service filters',
//         create: 'POST /create - Create booking',
//         customer: 'GET /customer/:customer_id - Get customer bookings',
//         details: 'GET /details/:booking_id - Get booking details',
//         providerConfig: 'POST /provider/save-service-config - Save provider config',
//         searchProviders: 'POST /search-providers-by-filters - Search providers',
//         getConfigs: 'GET /provider/:provider_id/service-configs - Get provider configs',
//         // NEW TABLE APIS
//         tableConfigs: 'GET /provider-configurations - Get all for table',
//         editConfig: 'PUT /provider-configurations/:id - Update config', 
//         viewConfig: 'GET /provider-configurations/:id - View single config'
//       }
//     });
//   });
// //new 
//    app.post('/api/booking/save-filters',
//     [
//       body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
//       body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
//       body('customer_name').optional().isString().withMessage('Customer name must be string')
//     ],
//     handleValidationErrors,
//     serviceBookingController.saveCustomerFilters
//   );

//   app.get('/api/booking/booking-details/:customer_id/:service_id',
//     [
//       param('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
//       param('service_id').isInt({ min: 1 }).withMessage('Valid service ID required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.getBookingDetails
//   );

//   app.post('/api/booking/confirm-booking',
//     [
//       body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
//       body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
//       body('address').notEmpty().withMessage('Address is required'),
//       body('start_date').isDate().withMessage('Valid start date required'),
//       body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.saveBooking
//   );

//   app.get('/api/booking/service-filters/:service_id',
//     serviceBookingController.getServiceFilters
//   );

//   // NEW: Admin Booking Management Routes
//   app.get('/api/admin/bookings', 
//     [
//       query('status').optional().isIn(['all', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']),
//       query('service').optional().isIn(['all', '1', '2', '3', '4', '5']),
//       query('from_date').optional().isDate(),
//       query('to_date').optional().isDate(),
//       query('page').optional().isInt({ min: 1 }),
//       query('limit').optional().isInt({ min: 1, max: 50 })
//     ],
//     handleValidationErrors,
//     serviceBookingController.getAdminBookings
//   );

//   app.get('/api/admin/bookings/:booking_id/available-providers',
//     [
//       param('booking_id').notEmpty().withMessage('Booking ID is required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.getAvailableProviders
//   );

//   app.post('/api/admin/bookings/:booking_id/assign-provider',
//     [
//       param('booking_id').notEmpty().withMessage('Booking ID is required'),
//       body('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID is required'),
//       body('estimated_cost').optional().isFloat({ min: 0 }).withMessage('Estimated cost must be positive'),
//       body('assignment_notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes too long')
//     ],
//     handleValidationErrors,
//     serviceBookingController.assignProvider
//   );

//   app.put('/api/admin/bookings/:booking_id/notes',
//     [
//       param('booking_id').notEmpty().withMessage('Booking ID is required'),
//       body('notes').isString().isLength({ max: 2000 }).withMessage('Notes too long')
//     ],
//     handleValidationErrors,
//     serviceBookingController.updateBookingNotes
//   );

//   app.get('/api/admin/bookings/statistics',
//     serviceBookingController.getAdminBookingStatistics
//   );

//   app.patch('/api/admin/bookings/bulk-update',
//     [
//       body('booking_ids').isArray({ min: 1 }).withMessage('At least one booking ID required'),
//       body('status').isIn(['confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']),
//       body('notes').optional().isString()
//     ],
//     handleValidationErrors,
//     serviceBookingController.bulkUpdateBookings
//   );

//   app.post('/api/admin/bookings/:booking_id/reassign',
//     [
//       param('booking_id').notEmpty().withMessage('Booking ID is required'),
//       body('new_provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required'),
//       body('reason').isString().notEmpty().withMessage('Reason is required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.reassignProvider
//   );

//   app.get('/api/admin/bookings/:booking_id/history',
//     serviceBookingController.getAssignmentHistory
//   );

//   console.log('✅ Admin Booking Management routes added:');
//   console.log('   GET /api/admin/bookings');
//   console.log('   GET /api/admin/bookings/:id/available-providers');
//   console.log('   POST /api/admin/bookings/:id/assign-provider');
//   console.log('   PUT /api/admin/bookings/:id/notes');
//   console.log('   GET /api/admin/bookings/statistics');
//   console.log('   PATCH /api/admin/bookings/bulk-update');
//   console.log('   POST /api/admin/bookings/:id/reassign');
//   console.log('   GET /api/admin/bookings/:id/history');



//   console.log('✅ NEW Customer Filter & Booking APIs added:');
//   console.log('   POST /api/booking/save-filters');
//   console.log('   GET /api/booking/booking-details/:customer_id/:service_id');
//   console.log('   POST /api/booking/confirm-booking');
//   console.log('   GET /api/booking/service-filters/:service_id');
// //end
//   console.log('✅ ALL Service Booking routes registered directly:');
//   console.log('   GET /api/booking/services');
//   console.log('   GET /api/booking/filters/:service_id');
//   console.log('   POST /api/booking/create');
//   console.log('   POST /api/booking/provider/save-service-config');
//   console.log('   POST /api/booking/search-providers-by-filters');
//   console.log('   GET /api/booking/provider/:provider_id/service-configs');
//   console.log('   GET /api/booking/provider-configurations ← NEW TABLE API');
//   console.log('   PUT /api/booking/provider-configurations/:configId ← NEW EDIT API');
//   console.log('   GET /api/booking/provider-configurations/:configId ← NEW VIEW API');
//   console.log('   GET /api/booking/health');
//   console.log('   GET /api/booking/docs');

// } else {
//   console.warn('⚠️  Service Booking routes skipped - controller not found');
// }
// if (serviceBookingController) {
//   console.log('Registering Service Booking routes directly...');

//   const { body, param, validationResult } = require('express-validator');

//   const handleValidationErrors = (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }
//     next();
//   };

//   // Basic Service Booking Routes
//   app.get('/api/booking/services', serviceBookingController.getAllServices);
//   app.get('/api/booking/filters/:service_id', serviceBookingController.getServiceFilters);
//   app.post('/api/booking/create', serviceBookingController.createBooking);
//   app.get('/api/booking/customer/:customer_id', serviceBookingController.getCustomerBookings);
//   app.get('/api/booking/details/:booking_id', serviceBookingController.getBookingDetails);
//   app.patch('/api/booking/status/:booking_id', serviceBookingController.updateBookingStatus);
//   app.patch('/api/booking/cancel/:booking_id', serviceBookingController.cancelBooking);
//   app.get('/api/booking/provider/:service_provider_id', serviceBookingController.getServiceProviderBookings);
//   app.get('/api/booking/search', serviceBookingController.searchBookings);
//   app.get('/api/booking/stats', serviceBookingController.getBookingStats);

//   // NEW Provider Configuration Routes
//   //  app.post('/api/booking/provider/save-service-config',
//   //    [
//   ///      body('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required'),
//   //     body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
//   //      body('service_name').isString().notEmpty().withMessage('Service name required'),
//   //      body('base_rate').isFloat({ min: 0.01 }).withMessage('Valid base rate required'),
//   //      body('selected_filters').isArray({ min: 1 }).withMessage('At least one filter required')
//   //    ],
//   //    handleValidationErrors,
//   //    serviceBookingController.saveProviderServiceConfiguration
//   //  );

//   app.get('/api/booking/provider-configurations',
//     serviceBookingController.getAllProviderConfigurations
//   );

//   app.put('/api/booking/provider-configurations/:configId',
//     uploadConfigs.serviceImage,
//     handleUploadError,
//     serviceBookingController.updateProviderConfiguration
//   );



//   app.get('/api/booking/provider-configurations/:configId',
//     serviceBookingController.getProviderConfigurationById
//   );

//   app.get('/api/booking/providers',
//     serviceBookingController.getServiceProviders
//   );
//   //new

//   app.post('/api/booking/provider/save-service-config',
//     uploadConfigs.serviceImage,
//     handleUploadError,
//     serviceBookingController.saveProviderServiceConfiguration
//   );

//   app.post('/api/booking/search-providers-by-filters',
//     [
//       body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
//       body('customer_filters').isArray({ min: 1 }).withMessage('Customer filters required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.searchProvidersByFilters
//   );

//   app.get('/api/booking/provider/:provider_id/service-configs',
//     [
//       param('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.getProviderServiceConfigurations
//   );

//   // NEW: Toggle provider configuration status
// app.patch('/api/booking/provider-configurations/:configId/toggle-status',
//     serviceBookingController.toggleProviderConfigurationStatus
// );


//   // Utility Routes
//   app.get('/api/booking/status-options', (req, res) => {
//     res.json({
//       success: true,
//       message: 'Booking status options retrieved',
//       data: {
//         status_options: [
//           { value: 'pending', label: 'Pending Confirmation', color: 'orange' },
//           { value: 'confirmed', label: 'Confirmed', color: 'green' },
//           { value: 'in_progress', label: 'In Progress', color: 'blue' },
//           { value: 'completed', label: 'Completed', color: 'green' },
//           { value: 'cancelled', label: 'Cancelled', color: 'red' }
//         ]
//       }
//     });
//   });

//   app.get('/api/booking/categories', (req, res) => {
//     res.json({
//       success: true,
//       message: 'Service categories retrieved',
//       data: {
//         categories: [
//           { id: 1, name: 'Child Care', description: 'Baby sitting and child care services' },
//           { id: 2, name: 'Senior Care', description: 'Elderly care and assistance services' },
//           { id: 3, name: 'Household', description: 'Cooking and household management' },
//           { id: 4, name: 'Maintenance', description: 'Garden and property maintenance' },
//           { id: 5, name: 'Transportation', description: 'Driver and transportation services' },
//           { id: 6, name: 'Cleaning', description: 'House cleaning and sanitization' },
//           { id: 7, name: 'Pet Services', description: 'Pet care and grooming services' }
//         ]
//       }
//     });
//   });

//   app.get('/api/booking/health', (req, res) => {
//     res.json({
//       success: true,
//       message: 'Service Booking API is healthy',
//       timestamp: new Date().toISOString(),
//       version: '2.0.0'
//     });
//   });

//   app.get('/api/booking/docs', (req, res) => {
//     res.json({
//       title: 'Service Booking API Documentation',
//       version: '2.0.0',
//       baseURL: '/api/booking',
//       endpoints: {
//         services: 'GET /services - Get all services',
//         filters: 'GET /filters/:service_id - Get service filters',
//         create: 'POST /create - Create booking',
//         customer: 'GET /customer/:customer_id - Get customer bookings',
//         details: 'GET /details/:booking_id - Get booking details',
//         providerConfig: 'POST /provider/save-service-config - Save provider config',
//         searchProviders: 'POST /search-providers-by-filters - Search providers',
//         getConfigs: 'GET /provider/:provider_id/service-configs - Get provider configs'
//       }
//     });
//   });

//   //new 
//   app.post('/api/booking/save-filters',
//     [
//       body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
//       body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
//       body('customer_name').optional().isString().withMessage('Customer name must be string')
//     ],
//     handleValidationErrors,
//     serviceBookingController.saveCustomerFilters
//   );

//   app.get('/api/booking/booking-details/:customer_id/:service_id',
//     [
//       param('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
//       param('service_id').isInt({ min: 1 }).withMessage('Valid service ID required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.getBookingDetails
//   );

//   app.post('/api/booking/confirm-booking',
//     [
//       body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
//       body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
//       body('address').notEmpty().withMessage('Address is required'),
//       body('start_date').isDate().withMessage('Valid start date required'),
//       body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount required')
//     ],
//     handleValidationErrors,
//     serviceBookingController.saveBooking
//   );

//   app.get('/api/booking/service-filters/:service_id',
//     serviceBookingController.getServiceFilters
//   );

//   console.log('✅ ALL Service Booking routes registered directly:');
//   console.log('   GET /api/booking/services');
//   console.log('   GET /api/booking/filters/:service_id');
//   console.log('   POST /api/booking/create');
//   console.log('   POST /api/booking/provider/save-service-config ← NEW');
//   console.log('   POST /api/booking/search-providers-by-filters ← NEW');
//   console.log('   GET /api/booking/provider/:provider_id/service-configs ← NEW');
//   console.log('   GET /api/booking/health');
//   console.log('   GET /api/booking/docs');

// } else {
//   console.warn('⚠️  Service Booking routes skipped - controller not found');
// }

if (serviceBookingController) {
  console.log('Registering Service Booking routes directly...');
  
  const { body, param,query, validationResult } = require('express-validator');
  
 
   const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  };

  // Basic Service Booking Routes
  app.get('/api/booking/services', serviceBookingController.getAllServices);
  app.get('/api/booking/filters/:service_id', serviceBookingController.getServiceFilters);
  app.post('/api/booking/create', serviceBookingController.createBooking);
  app.get('/api/booking/customer/:customer_id', serviceBookingController.getCustomerBookings);
  app.get('/api/booking/details/:booking_id', serviceBookingController.getBookingDetails);
  app.patch('/api/booking/status/:booking_id', serviceBookingController.updateBookingStatus);
  app.patch('/api/booking/cancel/:booking_id', serviceBookingController.cancelBooking);
  app.get('/api/booking/provider/:service_provider_id', serviceBookingController.getServiceProviderBookings);
  app.get('/api/booking/search', serviceBookingController.searchBookings);
  app.get('/api/booking/stats', serviceBookingController.getBookingStats);

  // Provider Configuration Routes
  app.post('/api/booking/provider/save-service-config',
    uploadConfigs.serviceImage,
    handleUploadError,
    serviceBookingController.saveProviderServiceConfiguration
  );

  app.post('/api/booking/search-providers-by-filters',
    [
      body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
      body('customer_filters').isArray({ min: 1 }).withMessage('Customer filters required')
    ],
    handleValidationErrors,
    serviceBookingController.searchProvidersByFilters
  );
  
 app.get('/api/booking/providers', 
        serviceBookingController.getServiceProviders
    );

 app.get(
  "/api/booking/booked-users/:registration_id",
  serviceBookingController.getBookedUsersByRegistrationId
);

  app.get('/api/booking/provider/:provider_id/service-configs',
    [
      param('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required')
    ],
    handleValidationErrors,
    serviceBookingController.getProviderServiceConfigurations
  );

  // NEW: Provider Table Management Routes
  app.get('/api/booking/provider-configurations', 
      serviceBookingController.getAllProviderConfigurations
  );

  app.put('/api/booking/provider-configurations/:configId',
      uploadConfigs.serviceImage,
      handleUploadError,
      serviceBookingController.updateProviderConfiguration
  );

  app.get('/api/booking/provider-configurations/:configId',
      serviceBookingController.getProviderConfigurationById
  );

  // NEW: Toggle provider configuration status
app.patch('/api/booking/provider-configurations/:configId/toggle-status',
    serviceBookingController.toggleProviderConfigurationStatus
);

  // Utility Routes
  app.get('/api/booking/status-options', (req, res) => {
    res.json({
      success: true,
      message: 'Booking status options retrieved',
      data: {
        status_options: [
          { value: 'pending', label: 'Pending Confirmation', color: 'orange' },
          { value: 'confirmed', label: 'Confirmed', color: 'green' },
          { value: 'in_progress', label: 'In Progress', color: 'blue' },
          { value: 'completed', label: 'Completed', color: 'green' },
          { value: 'cancelled', label: 'Cancelled', color: 'red' }
        ]
      }
    });
  });

  app.get('/api/booking/categories', (req, res) => {
    res.json({
      success: true,
      message: 'Service categories retrieved',
      data: {
        categories: [
          { id: 1, name: 'Child Care', description: 'Baby sitting and child care services' },
          { id: 2, name: 'Senior Care', description: 'Elderly care and assistance services' },
          { id: 3, name: 'Household', description: 'Cooking and household management' },
          { id: 4, name: 'Maintenance', description: 'Garden and property maintenance' },
          { id: 5, name: 'Transportation', description: 'Driver and transportation services' },
          { id: 6, name: 'Cleaning', description: 'House cleaning and sanitization' },
          { id: 7, name: 'Pet Services', description: 'Pet care and grooming services' }
        ]
      }
    });
  });

  app.get('/api/booking/health', (req, res) => {
    res.json({
      success: true,
      message: 'Service Booking API is healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  });

  app.get('/api/booking/docs', (req, res) => {
    res.json({
      title: 'Service Booking API Documentation',
      version: '2.0.0',
      baseURL: '/api/booking',
      endpoints: {
        services: 'GET /services - Get all services',
        filters: 'GET /filters/:service_id - Get service filters',
        create: 'POST /create - Create booking',
        customer: 'GET /customer/:customer_id - Get customer bookings',
        details: 'GET /details/:booking_id - Get booking details',
        providerConfig: 'POST /provider/save-service-config - Save provider config',
        searchProviders: 'POST /search-providers-by-filters - Search providers',
        getConfigs: 'GET /provider/:provider_id/service-configs - Get provider configs',
        // NEW TABLE APIS
        tableConfigs: 'GET /provider-configurations - Get all for table',
        editConfig: 'PUT /provider-configurations/:id - Update config', 
        viewConfig: 'GET /provider-configurations/:id - View single config'
      }
    });
  });
//new 
   app.post('/api/booking/save-filters',
    [
      body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
      body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
      body('customer_name').optional().isString().withMessage('Customer name must be string')
    ],
    handleValidationErrors,
    serviceBookingController.saveCustomerFilters
  );

  app.get('/api/booking/booking-details/:customer_id/:service_id',
    [
      param('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
      param('service_id').isInt({ min: 1 }).withMessage('Valid service ID required')
    ],
    handleValidationErrors,
    serviceBookingController.getBookingDetails
  );

  app.post('/api/booking/confirm-booking',
    [
      body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
      body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
      body('address').notEmpty().withMessage('Address is required'),
      body('start_date').isDate().withMessage('Valid start date required'),
      body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount required')
    ],
    handleValidationErrors,
    serviceBookingController.saveBooking
  );

  app.get('/api/booking/service-filters/:service_id',
    serviceBookingController.getServiceFilters
  );

  // NEW: Admin Booking Management Routes
  app.get('/api/admin/bookings', 
    [
      query('status').optional().isIn(['all', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']),
      query('service').optional().isIn(['all', '1', '2', '3', '4', '5']),
      query('from_date').optional().isDate(),
      query('to_date').optional().isDate(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    handleValidationErrors,
    serviceBookingController.getAdminBookings
  );
// // ✅ Get booking details by booking_id (e.g. BK1760589362672)
// app.get(
//   "/api/booking/admin/bookings/:booking_id",
//   [
//     param("booking_id")
//       .isString()
//       .trim()
//       .notEmpty()
//       .withMessage("Booking ID must be a valid string"),
//   ],
//   handleValidationErrors,
//   serviceBookingController.getAdminBookingByBookingId // ✅ NEW CONTROLLER FUNCTION
// );

  app.get('/api/admin/bookings/:booking_id/available-providers',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidationErrors,
    serviceBookingController.getAvailableProviders
  );

  app.post('/api/admin/bookings/:booking_id/assign-provider',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required'),
      body('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID is required'),
      body('estimated_cost').optional().isFloat({ min: 0 }).withMessage('Estimated cost must be positive'),
      body('assignment_notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes too long')
    ],
    handleValidationErrors,
    serviceBookingController.assignProvider
  );

  app.put('/api/admin/bookings/:booking_id/notes',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required'),
      body('notes').isString().isLength({ max: 2000 }).withMessage('Notes too long')
    ],
    handleValidationErrors,
    serviceBookingController.updateBookingNotes
  );

  app.get('/api/admin/bookings/statistics',
    serviceBookingController.getAdminBookingStatistics
  );

  app.patch('/api/admin/bookings/bulk-update',
    [
      body('booking_ids').isArray({ min: 1 }).withMessage('At least one booking ID required'),
      body('status').isIn(['confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']),
      body('notes').optional().isString()
    ],
    handleValidationErrors,
    serviceBookingController.bulkUpdateBookings
  );

  app.post('/api/admin/bookings/:booking_id/reassign',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required'),
      body('new_provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required'),
      body('reason').isString().notEmpty().withMessage('Reason is required')
    ],
    handleValidationErrors,
    serviceBookingController.reassignProvider
  );

  app.get('/api/admin/bookings/:booking_id/history',
    serviceBookingController.getAssignmentHistory
  );

  console.log('✅ Admin Booking Management routes added:');
  console.log('   GET /api/admin/bookings');
  console.log('   GET /api/admin/bookings/:id/available-providers');
  console.log('   POST /api/admin/bookings/:id/assign-provider');
  console.log('   PUT /api/admin/bookings/:id/notes');
  console.log('   GET /api/admin/bookings/statistics');
  console.log('   PATCH /api/admin/bookings/bulk-update');
  console.log('   POST /api/admin/bookings/:id/reassign');
  console.log('   GET /api/admin/bookings/:id/history');



  console.log('✅ NEW Customer Filter & Booking APIs added:');
  console.log('   POST /api/booking/save-filters');
  console.log('   GET /api/booking/booking-details/:customer_id/:service_id');
  console.log('   POST /api/booking/confirm-booking');
  console.log('   GET /api/booking/service-filters/:service_id');
//end
  console.log('✅ ALL Service Booking routes registered directly:');
  console.log('   GET /api/booking/services');
  console.log('   GET /api/booking/filters/:service_id');
  console.log('   POST /api/booking/create');
  console.log('   POST /api/booking/provider/save-service-config');
  console.log('   POST /api/booking/search-providers-by-filters');
  console.log('   GET /api/booking/provider/:provider_id/service-configs');
  console.log('   GET /api/booking/provider-configurations ← NEW TABLE API');
  console.log('   PUT /api/booking/provider-configurations/:configId ← NEW EDIT API');
  console.log('   GET /api/booking/provider-configurations/:configId ← NEW VIEW API');
  console.log('   GET /api/booking/health');
  console.log('   GET /api/booking/docs');

} else {
  console.warn('⚠️  Service Booking routes skipped - controller not found');
}
if (serviceBookingController) {
  console.log('Registering Service Booking routes directly...');
  
  const { body, param, query, validationResult } = require('express-validator');
  
  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  };

  // ==========================================
  // BASIC SERVICE BOOKING ROUTES
  // ==========================================
  app.get('/api/booking/services', serviceBookingController.getAllServices);
  app.get('/api/booking/filters/:service_id', serviceBookingController.getServiceFilters);
  app.post('/api/booking/create', serviceBookingController.createBooking);
  app.get('/api/booking/customer/:customer_id', serviceBookingController.getCustomerBookings);
  app.get('/api/booking/details/:booking_id', serviceBookingController.getBookingDetails);
  app.patch('/api/booking/status/:booking_id', serviceBookingController.updateBookingStatus);
  app.patch('/api/booking/cancel/:booking_id', serviceBookingController.cancelBooking);
  app.get('/api/booking/provider/:service_provider_id', serviceBookingController.getServiceProviderBookings);
  app.get('/api/booking/search', serviceBookingController.searchBookings);
  app.get('/api/booking/stats', serviceBookingController.getBookingStats);

  // ==========================================
  // PROVIDER CONFIGURATION ROUTES
  // ==========================================
  app.post('/api/booking/provider/save-service-config',
    uploadConfigs.serviceImage,
    handleUploadError,
    serviceBookingController.saveProviderServiceConfiguration
  );

  app.post('/api/booking/search-providers-by-filters',
    [
      body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
      body('customer_filters').isArray({ min: 1 }).withMessage('Customer filters required')
    ],
    handleValidationErrors,
    serviceBookingController.searchProvidersByFilters
  );
  
  app.get('/api/booking/providers', 
    serviceBookingController.getServiceProviders
  );

  app.get('/api/booking/provider/:provider_id/service-configs',
    [
      param('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required')
    ],
    handleValidationErrors,
    serviceBookingController.getProviderServiceConfigurations
  );

  app.get('/api/booking/provider-configurations', 
    serviceBookingController.getAllProviderConfigurations
  );

     app.get('/api/booking/provider-configurations/:mobile_number',
    serviceBookingController.getProviderConfigurationsByMobile
);

  app.put('/api/booking/provider-configurations/:configId',
    uploadConfigs.serviceImage,
    handleUploadError,
    serviceBookingController.updateProviderConfiguration
  );

  app.get('/api/booking/provider-configurations/:configId',
    serviceBookingController.getProviderConfigurationById
  );

  app.patch('/api/booking/provider-configurations/:configId/toggle-status',
    serviceBookingController.toggleProviderConfigurationStatus
  );

  // ==========================================
  // CUSTOMER FILTER & BOOKING ROUTES
  // ==========================================
  app.post('/api/booking/save-filters',
    [
      body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
      body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
      body('customer_name').optional().isString().withMessage('Customer name must be string')
    ],
    handleValidationErrors,
    serviceBookingController.saveCustomerFilters
  );

  app.get('/api/booking/booking-details/:customer_id/:service_id',
    [
      param('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
      param('service_id').isInt({ min: 1 }).withMessage('Valid service ID required')
    ],
    handleValidationErrors,
    serviceBookingController.getBookingDetails
  );

  app.post('/api/booking/confirm-booking',
    [
      body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
      body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
      body('address').notEmpty().withMessage('Address is required'),
      body('start_date').isDate().withMessage('Valid start date required'),
      body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount required')
    ],
    handleValidationErrors,
    serviceBookingController.saveBooking
  );

  app.get('/api/booking/service-filters/:service_id',
    serviceBookingController.getServiceFilters
  );

  app.get(
  '/api/booking/admin/bookings/:booking_id',
  [
    param('booking_id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Booking ID must be a valid string')
  ],
  handleValidationErrors,
  serviceBookingController.getAdminBookingById
);

  // ==========================================
  // ADMIN BOOKING MANAGEMENT ROUTES ⭐ CRITICAL
  // ==========================================
  console.log('Registering ADMIN routes...');
  
  app.get('/api/booking/admin/bookings', 
    [
      query('status').optional().isIn(['all', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']),
      query('service_id').optional().isIn(['all', '1', '2', '3', '4', '5']),
      query('search').optional().isString(),
      query('date_from').optional().isDate(),
      query('date_to').optional().isDate(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    handleValidationErrors,
    serviceBookingController.getAdminBookings
  );

  app.get('/api/booking/admin/bookings/:booking_id/available-providers',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidationErrors,
    serviceBookingController.getAvailableProviders
  );

  app.post('/api/booking/admin/bookings/:booking_id/assign-provider',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required'),
      body('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID is required'),
      body('estimated_cost').optional().isFloat({ min: 0 }).withMessage('Estimated cost must be positive'),
      body('assignment_notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes too long')
    ],
    handleValidationErrors,
    serviceBookingController.assignProvider
  );

  app.put('/api/booking/admin/bookings/:booking_id/notes',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required'),
      body('notes').isString().isLength({ max: 2000 }).withMessage('Notes too long')
    ],
    handleValidationErrors,
    serviceBookingController.updateBookingNotes
  );

  app.get('/api/booking/admin/bookings/:booking_id/details',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required')
    ],
    handleValidationErrors,
    serviceBookingController.getBookingDetails
  );

  app.get('/api/booking/admin/bookings/statistics',
    serviceBookingController.getAdminBookingStatistics
  );

  app.patch('/api/booking/admin/bookings/bulk-update',
    [
      body('booking_ids').isArray({ min: 1 }).withMessage('At least one booking ID required'),
      body('status').isIn(['confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']),
      body('notes').optional().isString()
    ],
    handleValidationErrors,
    serviceBookingController.bulkUpdateBookings
  );

  app.post('/api/booking/admin/bookings/:booking_id/reassign',
    [
      param('booking_id').notEmpty().withMessage('Booking ID is required'),
      body('new_provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required'),
      body('reason').isString().notEmpty().withMessage('Reason is required')
    ],
    handleValidationErrors,
    serviceBookingController.reassignProvider
  );

  app.get('/api/booking/admin/bookings/:booking_id/history',
    serviceBookingController.getAssignmentHistory
  );

  // ==========================================
  // UTILITY ROUTES
  // ==========================================
  app.get('/api/booking/status-options', (req, res) => {
    res.json({
      success: true,
      message: 'Booking status options retrieved',
      data: {
        status_options: [
          { value: 'pending', label: 'Pending Confirmation', color: 'orange' },
          { value: 'confirmed', label: 'Confirmed', color: 'green' },
          { value: 'in_progress', label: 'In Progress', color: 'blue' },
          { value: 'completed', label: 'Completed', color: 'green' },
          { value: 'cancelled', label: 'Cancelled', color: 'red' }
        ]
      }
    });
  });

  app.get('/api/booking/categories', (req, res) => {
    res.json({
      success: true,
      message: 'Service categories retrieved',
      data: {
        categories: [
          { id: 1, name: 'Child Care', description: 'Baby sitting and child care services' },
          { id: 2, name: 'Senior Care', description: 'Elderly care and assistance services' },
          { id: 3, name: 'Household', description: 'Cooking and household management' },
          { id: 4, name: 'Maintenance', description: 'Garden and property maintenance' },
          { id: 5, name: 'Transportation', description: 'Driver and transportation services' },
          { id: 6, name: 'Cleaning', description: 'House cleaning and sanitization' },
          { id: 7, name: 'Pet Services', description: 'Pet care and grooming services' }
        ]
      }
    });
  });

  app.get('/api/booking/health', (req, res) => {
    res.json({
      success: true,
      message: 'Service Booking API is healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  });

  app.get('/api/booking/docs', (req, res) => {
    res.json({
      title: 'Service Booking API Documentation',
      version: '2.0.0',
      baseURL: '/api/booking',
      endpoints: {
        services: 'GET /services - Get all services',
        filters: 'GET /filters/:service_id - Get service filters',
        create: 'POST /create - Create booking',
        customer: 'GET /customer/:customer_id - Get customer bookings',
        details: 'GET /details/:booking_id - Get booking details',
        providerConfig: 'POST /provider/save-service-config - Save provider config',
        searchProviders: 'POST /search-providers-by-filters - Search providers',
        getConfigs: 'GET /provider/:provider_id/service-configs - Get provider configs',
        tableConfigs: 'GET /provider-configurations - Get all for table',
        editConfig: 'PUT /provider-configurations/:id - Update config', 
        viewConfig: 'GET /provider-configurations/:id - View single config',
        // ADMIN ENDPOINTS
        adminBookings: 'GET /admin/bookings - Get all bookings',
        availableProviders: 'GET /admin/bookings/:id/available-providers',
        assignProvider: 'POST /admin/bookings/:id/assign-provider',
        updateNotes: 'PUT /admin/bookings/:id/notes'
      }
    });
  });

  // ==========================================
  // LOG ALL REGISTERED ROUTES
  // ==========================================
  console.log('✅ ALL Service Booking routes registered:');
  console.log('   GET /api/booking/services');
  console.log('   GET /api/booking/filters/:service_id');
  console.log('   POST /api/booking/create');
  console.log('   POST /api/booking/provider/save-service-config');
  console.log('   POST /api/booking/search-providers-by-filters');
  console.log('   GET /api/booking/provider/:provider_id/service-configs');
  console.log('   GET /api/booking/provider-configurations');
  console.log('   PUT /api/booking/provider-configurations/:configId');
  console.log('   GET /api/booking/provider-configurations/:configId');
  console.log('   PATCH /api/booking/provider-configurations/:configId/toggle-status');
  console.log('   POST /api/booking/save-filters');
  console.log('   GET /api/booking/booking-details/:customer_id/:service_id');
  console.log('   POST /api/booking/confirm-booking');
  console.log('   GET /api/booking/service-filters/:service_id');
  console.log('');
  console.log('✅ ADMIN Booking Management routes:');
  console.log('   GET /api/booking/admin/bookings ⭐');
  console.log('   GET /api/booking/admin/bookings/:id/available-providers ⭐');
  console.log('   POST /api/booking/admin/bookings/:id/assign-provider ⭐');
  console.log('   PUT /api/booking/admin/bookings/:id/notes ⭐');
  console.log('   GET /api/booking/admin/bookings/:id/details ⭐');
  console.log('   GET /api/booking/admin/bookings/statistics');
  console.log('   PATCH /api/booking/admin/bookings/bulk-update');
  console.log('   POST /api/booking/admin/bookings/:id/reassign');
  console.log('   GET /api/booking/admin/bookings/:id/history');
  console.log('');
  console.log('   GET /api/booking/health');
  console.log('   GET /api/booking/docs');

} else {
  console.warn('⚠️  Service Booking routes skipped - controller not found');
}



// 4. ADD DIRECT REGISTRATION ROUTES (after existing route registrations)
// === Direct Registration Routes (NO SESSION TOKEN REQUIRED) ===
if (directRegistrationController) {
  try {
    const directRegistrationRoutes = require('./routes/direct_registration_routes');
    app.use('/api/direct-registration', directRegistrationRoutes);
    console.log('✅ Direct Registration routes registered at /api/direct-registration');

    // Add direct registration documentation endpoint
    app.get('/api/direct-registration/docs', (req, res) => {
      res.json({
        title: 'Direct Registration API Documentation',
        version: '1.0.0',
        description: 'Multi-step registration system without session tokens, with frontend coordinates',
        baseURL: '/api/direct-registration',
        features: [
          'No session token required',
          'Frontend provides coordinates directly',
          'Multi-step form submission',
          'File upload support',
          'Admin status management',
          'Registration tracking'
        ],
        endpoints: {
          registration: {
            create: 'POST /create - Initialize new registration',
            status: 'GET /status/:registrationId - Get registration status',
            complete: 'GET /complete/:registrationId - Get complete registration data',
            stepData: 'GET /step-data/:registrationId/:step - Get specific step data'
          },
          steps: {
            step1: 'POST /step1/:registrationId - Personal Information (with document uploads)',
            step2: 'POST /step2/:registrationId - Contact & Address (receives lat/lng from frontend)',
            step3: 'POST /step3/:registrationId - Service Information (with service image)',
            step4: 'POST /step4/:registrationId - Background Check (with police verification)',
            step5: 'POST /step5/:registrationId - Document Uploads (multiple documents)',
            step6: 'POST /step6/:registrationId - Account Information (with bank document)'
          },
          admin: {
            updatePoliceVerification: 'PUT /admin/police-verification/:registrationId',
            updateSalaryStatus: 'PUT /admin/salary-status/:registrationId',
            updateRegistrationStatus: 'PUT /admin/registration-status/:registrationId',
            getStatusHistory: 'GET /admin/status-history/:registrationId'
          },
          dropdowns: {
            all: 'GET /dropdowns/all - All dropdown data',
            locations: 'GET /dropdowns/preferred-locations',
            states: 'GET /dropdowns/states',
            cities: 'GET /dropdowns/cities/:stateId',
            districts: 'GET /dropdowns/districts/:stateId',
            serviceTypes: 'GET /dropdowns/service-types',
            workTypes: 'GET /dropdowns/work-types',
            genders: 'GET /dropdowns/genders',
            nationalities: 'GET /dropdowns/nationalities',
            idProofTypes: 'GET /dropdowns/id-proof-types',
            availableDays: 'GET /dropdowns/available-days',
            timeSlots: 'GET /dropdowns/time-slots',
            relationshipTypes: 'GET /dropdowns/relationship-types'
          }
        },
        workflow: {
          step1: 'Personal information with documents',
          step2: 'Contact details and address (receives lat/lng from frontend)',
          step3: 'Service information with salary expectations',
          step4: 'Background check with police verification',
          step5: 'Additional document uploads',
          step6: 'Final account setup and submission'
        },
        fileUploadLimits: {
          maxFileSize: '10MB per file',
          maxFiles: '5 files per step',
          supportedFormats: 'PDF, JPG, PNG, DOC, DOCX'
        }
      });
    });

  } catch (err) {
    console.error('❌ Failed to load direct registration routes:', err.message);

    // Fallback: Register routes directly if route file doesn't exist
    if (directRegistrationController) {
      // Core registration routes
      if (typeof directRegistrationController.createRegistration === 'function') {
        app.post('/api/direct-registration/create', directRegistrationController.createRegistration);
      }
      if (typeof directRegistrationController.getRegistrationStatus === 'function') {
        app.get('/api/direct-registration/status/:registrationId', directRegistrationController.getRegistrationStatus);
      }
      if (typeof directRegistrationController.getCompleteRegistration === 'function') {
        app.get('/api/direct-registration/complete/:registrationId', directRegistrationController.getCompleteRegistration);
      }
      if (typeof directRegistrationController.getStepData === 'function') {
        app.get('/api/direct-registration/step-data/:registrationId/:step', directRegistrationController.getStepData);
      }

      // Step routes with file uploads
      if (typeof directRegistrationController.savePersonalInfo === 'function') {
        const step1Middleware = getUploadMiddleware('multipleDocuments');
        app.post('/api/direct-registration/step1/:registrationId', ...step1Middleware, directRegistrationController.savePersonalInfo);
      }

      if (typeof directRegistrationController.saveContactAddress === 'function') {
        app.post('/api/direct-registration/step2/:registrationId', directRegistrationController.saveContactAddress);
      }

      if (typeof directRegistrationController.saveServiceInfo === 'function') {
        const step3Middleware = getUploadMiddleware('serviceImage');
        app.post('/api/direct-registration/step3/:registrationId', ...step3Middleware, directRegistrationController.saveServiceInfo);
      }

      if (typeof directRegistrationController.saveBackgroundCheck === 'function') {
        const step4Middleware = getUploadMiddleware('policeVerification');
        app.post('/api/direct-registration/step4/:registrationId', ...step4Middleware, directRegistrationController.saveBackgroundCheck);
      }

      if (typeof directRegistrationController.saveDocumentUploads === 'function') {
        const step5Middleware = getUploadMiddleware('multipleDocuments');
        app.post('/api/direct-registration/step5/:registrationId', ...step5Middleware, directRegistrationController.saveDocumentUploads);
      }

      if (typeof directRegistrationController.saveAccountInfo === 'function') {
        const step6Middleware = getUploadMiddleware('bankDocument');
        app.post('/api/direct-registration/step6/:registrationId', ...step6Middleware, directRegistrationController.saveAccountInfo);
      }

      // Admin routes
      if (typeof directRegistrationController.updatePoliceVerificationStatus === 'function') {
        app.put('/api/direct-registration/admin/police-verification/:registrationId', directRegistrationController.updatePoliceVerificationStatus);
      }
      if (typeof directRegistrationController.updateSalaryStatus === 'function') {
        app.put('/api/direct-registration/admin/salary-status/:registrationId', directRegistrationController.updateSalaryStatus);
      }
      if (typeof directRegistrationController.updateRegistrationStatus === 'function') {
        app.put('/api/direct-registration/admin/registration-status/:registrationId', directRegistrationController.updateRegistrationStatus);
      }
      if (typeof directRegistrationController.getRegistrationStatusHistory === 'function') {
        app.get('/api/direct-registration/admin/status-history/:registrationId', directRegistrationController.getRegistrationStatusHistory);
      }

      console.log('✅ Direct Registration routes registered directly');
    }
  }
} else {
  console.warn('⚠️  Direct Registration routes skipped - controller not found');
}

// === Service Search Routes - NEW INTEGRATION ===
if (serviceSearchController) {
  try {
    const serviceSearchRoutes = require('./routes/serviceRoutes');
    app.use('/api/services', serviceSearchRoutes);
    console.log('✅ Service Search routes registered at /api/services');
  } catch (err) {
    console.error('❌ Failed to load service search routes:', err.message);

    // Fallback direct routes if route file doesn't exist
    if (typeof serviceSearchController.searchServices === 'function') {
      app.post('/api/services/search', serviceSearchController.searchServices);
      app.post('/api/services/search/quick', (req, res, next) => {
        req.body.radius = req.body.radius || 5;
        req.body.max_radius = req.body.max_radius || 10;
        req.body.urgency_level = req.body.urgency_level || 'flexible';
        next();
      }, serviceSearchController.searchServices);

      if (typeof serviceSearchController.getAvailableServices === 'function') {
        app.get('/api/services/available', serviceSearchController.getAvailableServices);
      }

      if (typeof serviceSearchController.getProviderDetails === 'function') {
        app.get('/api/services/provider/:registration_id', serviceSearchController.getProviderDetails);
      }

      console.log('✅ Service Search routes registered directly');
    }
  }
} else {
  console.warn('⚠️  Service Search routes skipped - controller not found');
}

// === Location Search Routes - EXISTING ===
if (locationSearchController) {
  try {
    const locationSearchRoutes = require('./routes/location_search_routes');
    app.use('/api/location-search', locationSearchRoutes);
    console.log('✅ Location Search routes registered at /api/location-search');

    // Add location search documentation endpoint
    app.get('/api/location-search/docs', (req, res) => {
      res.json({
        title: 'Location Search API Documentation',
        version: '1.0.0',
        baseURL: '/api/location-search',
        endpoints: {
          health: 'GET /health - API health check',
          debug: {
            providers: 'GET /debug/providers?latitude=13.0827&longitude=80.2707&radius=10',
            serviceTypes: 'GET /debug/service-types?testService=electrician',
            tableCheck: 'GET /debug/table-check',
            databaseTest: 'GET /debug/database-test',
            rawLocations: 'GET /debug/raw-locations?limit=10'
          },
          search: {
            mainSearch: 'POST /providers - Main provider search',
            serviceSearch: 'POST /services/search - Search by service name',
            quickSearch3km: 'POST /providers/3km',
            quickSearch5km: 'POST /providers/5km',
            urgentProviders: 'POST /providers/urgent'
          },
          services: {
            available: 'GET /services/available - List all services',
            electricians: 'POST /services/electricians',
            plumbers: 'POST /services/plumbers',
            cleaners: 'POST /services/cleaners',
            acRepair: 'POST /services/ac-repair'
          },
          info: {
            providerAvailability: 'GET /providers/:providerId/availability',
            areaStatistics: 'GET /area/statistics',
            suggestions: 'GET /suggestions'
          },
          tracking: {
            interaction: 'POST /track-interaction'
          }
        }
      });
    });

  } catch (err) {
    console.error('❌ Failed to load location search routes:', err.message);
  }
} else {
  console.warn('⚠️  Location Search routes skipped - controller not found');
}

// === Basic Routes ===
app.get('/', (req, res) => {
  res.json({
    message: 'Udhavi Foundation API',
    version: '4.4.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
    features: [
      'Authentication & Authorization',
      'User-Based Access Control',
      'User Management',
      'Module Management',
      'User Permissions Management',
      'Temporary Customer Management',
      'Customer Admin & Status Management',
      'Location-Based Service Provider Search',
      'Advanced Service Search with Smart Radius',
      'Activity Logging',
      'Registration System'
    ],
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      roles: '/api/roles/*',
      modules: '/api/modules/*',
      userPermissions: '/api/users/:id/permissions',
      tempCustomer: '/api/temp-customer/*',
      locationSearch: '/api/location-search/*',
      serviceSearch: '/api/services/*',
      dropdown: '/api/dropdown/*',
      registration: '/api/registration/*',
      dashboards: '/api/*/dashboard'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '5.0.0', // Updated version
    database: 'Connected',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    features: {
      authentication: authController ? 'Available' : 'Not Available',
      userManagement: userController ? 'Available' : 'Not Available',
      roleManagement: roleController ? 'Available' : 'Not Available',
      userPermissions: userPermissionsController ? 'Available' : 'Not Available',
      tempCustomerManagement: tempCustomerController ? 'Available' : 'Not Available',
      locationSearch: locationSearchController ? 'Available' : 'Not Available',
      serviceSearch: serviceSearchController ? 'Available' : 'Not Available',
      serviceManagement: serviceManagementController ? 'Available' : 'Not Available', // NEW
      providerManagement: providerManagementController ? 'Available' : 'Not Available', // NEW
      bookingManagement: bookingManagementController ? 'Available' : 'Not Available', // NEW
      dropdowns: dropdownController ? 'Available' : 'Not Available',
      registration: registrationController ? 'Available' : 'Not Available'
    }
  });
});


// === Load Temporary Customer Routes ===
if (tempCustomerController) {
  try {
    const tempCustomerRoutes = require('./routes/tempcustomerRoutes');

    app.use('/api/temp-customer', tempCustomerRoutes);
    console.log('✅ Temporary Customer routes registered');
  } catch (err) {
    console.error('❌ Failed to load temp customer routes:', err.message);
  }
} else {
  console.warn('⚠️  Temporary Customer routes skipped - controller not found');
}

if (tempCustomerController) {
  try {
    // Load the customer admin controller if it exists
    const customerAdminController = loadModule('./controller/customeradmin_controller', 'Customer Admin Controller');

    if (customerAdminController) {
      // Register customer admin routes
      const customerAdminRoutes = require('./routes/customeradmin_routes');
      app.use('/api', customerAdminRoutes);
      console.log('✅ Customer Admin routes registered at /api/temp-customers');

      // Add to API documentation
      app.get('/api/customer-admin/docs', (req, res) => {
        res.json({
          title: 'Customer Admin API Documentation',
          version: '1.0.0',
          baseURL: '/api',
          endpoints: {
            getAllCustomers: {
              method: 'GET',
              path: '/temp-customers',
              description: 'Get all temp customers with optional search and filtering',
              parameters: {
                search: 'Search by name, email, or mobile (optional)',
                account_status: 'Filter by status: 0=active, 1=suspended (optional)'
              },
              example: '/api/temp-customers?search=john&account_status=0'
            },
            updateStatus: {
              method: 'PUT',
              path: '/temp-customers/:customerId/account-status',
              description: 'Update specific customer account status',
              body: {
                account_status: 'Number (0=active, 1=suspended)'
              },
              example: 'PUT /api/temp-customers/123/account-status'
            },
            toggleStatus: {
              method: 'PATCH',
              path: '/temp-customers/:customerId/toggle-status',
              description: 'Toggle customer status (0↔1)',
              body: 'No body required',
              example: 'PATCH /api/temp-customers/123/toggle-status'
            }
          },
          examples: {
            searchRequest: 'GET /api/temp-customers?search=john',
            suspendRequest: 'PUT /api/temp-customers/123/account-status with body: {"account_status": 1}',
            toggleRequest: 'PATCH /api/temp-customers/123/toggle-status'
          }
        });
      });

    } else {
      console.warn('⚠️  Customer Admin routes skipped - customeradmin_controller not found');
    }
  } catch (err) {
    console.error('❌ Failed to load customer admin routes:', err.message);

    // Fallback: Register routes directly if route file doesn't exist
    const customerAdminController = loadModule('./controller/customeradmin_controller', 'Customer Admin Controller');
    if (customerAdminController &&
      typeof customerAdminController.getTempCustomers === 'function' &&

      typeof customerAdminController.toggleTempCustomerAccountStatus === 'function') {

      app.get('/api/temp-customers', customerAdminController.getTempCustomers);
      app.put('/api/temp-customers/:customerId/account-status', customerAdminController.updateTempCustomerAccountStatus);
      app.patch('/api/temp-customers/:customerId/toggle-status', customerAdminController.toggleTempCustomerAccountStatus);

      console.log('✅ Customer Admin routes registered directly');
    }
  }
} else {
  console.warn('⚠️  Customer Admin routes skipped - tempCustomerController dependency not found');
}

// === Authentication Routes ===
if (authController) {
  const { body } = require('express-validator');

  // Login validation
  const loginValidation = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ];

  app.post('/api/auth/login', loginValidation, authController.login);
  app.post('/api/auth/logout', authMiddleware, authController.logout);
  app.get('/api/auth/profile', authMiddleware, authController.getProfile);
  app.post('/api/auth/verify-token', authMiddleware, authController.verifyToken);
  app.post('/api/auth/refresh-token', authMiddleware, authController.refreshToken);

  console.log('✅ Auth routes registered');
} else {
  console.warn('⚠️  Auth routes skipped - controller not found');
}

// === User Management Routes ===
if (userController) {
  const { body } = require('express-validator');

  const createUserValidation = [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phoneNo').notEmpty().withMessage('Phone number is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('role_id').isInt({ min: 1 }).withMessage('Role ID is required'),
    body('status').isIn(['Active', 'Inactive']).withMessage('Valid status required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required')
  ];

  // ADD THESE ROUTES:
  const { uploadConfigs, handleUploadError } = require('./utils/uploadUtil');

  // Custom validation that works with multer
  const validateUserAfterUpload = (req, res, next) => {
    const { firstName, lastName, email, phoneNo, gender, company_id, department_id, role_id, status, password, confirmPassword } = req.body;

    const errors = [];

    if (!firstName) errors.push({ type: 'field', msg: 'First name is required', path: 'firstName', location: 'body' });
    if (!lastName) errors.push({ type: 'field', msg: 'Last name is required', path: 'lastName', location: 'body' });
    if (!email || !/\S+@\S+\.\S+/.test(email)) errors.push({ type: 'field', msg: 'Valid email is required', path: 'email', location: 'body' });
    if (!phoneNo) errors.push({ type: 'field', msg: 'Phone number is required', path: 'phoneNo', location: 'body' });
    if (!['male', 'female', 'other'].includes(gender)) errors.push({ type: 'field', msg: 'Valid gender required', path: 'gender', location: 'body' });
    if (!company_id || isNaN(parseInt(company_id))) errors.push({ type: 'field', msg: 'Company ID is required', path: 'company_id', location: 'body' });
    if (!department_id || isNaN(parseInt(department_id))) errors.push({ type: 'field', msg: 'Department ID is required', path: 'department_id', location: 'body' });
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
  // Register user routes directly
  app.get('/api/users', authMiddleware, permissionMiddleware(['superadmin', 'admin']), userController.getAllUsers);

  app.post('/api/users',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    uploadConfigs.multipleDocuments,
    handleUploadError,
    validateUserAfterUpload,
    userController.createUser
  );

  app.put(
    '/api/users/:id',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    uploadConfigs.multipleDocuments, // ✅ handle multiple files including profile_photo
    handleUploadError,               // ✅ handle multer errors
    userController.updateUser        // ✅ controller
  );

  app.get('/api/users/roles-dropdown', authMiddleware, permissionMiddleware(['superadmin', 'admin']), userController.getRolesForDropdown);
  app.get('/api/users/companies-dropdown', authMiddleware, permissionMiddleware(['superadmin', 'admin']), userController.getCompaniesDropdown);
  app.get('/api/users/departments-dropdown', authMiddleware, permissionMiddleware(['superadmin', 'admin']), userController.getDepartmentsDropdown);

  console.log('✅ User Management routes registered directly');


  const updateProfileValidation = [
    body('name').notEmpty().withMessage('Name is required')
  ];

  const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ];

  const resetPasswordValidation = [
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ];




  // User routes
  app.get('/api/users', authMiddleware, permissionMiddleware(['superadmin']), userController.getAllUsers);
  app.post('/api/users', authMiddleware, permissionMiddleware(['superadmin']), createUserValidation, userController.createUser);
  app.get('/api/users/profile', authMiddleware, userController.getProfile);
  app.get('/api/users/stats', authMiddleware, permissionMiddleware(['superadmin']), userController.getUserStats);
  app.get('/api/users/:id', authMiddleware, permissionMiddleware(['superadmin']), userController.getUserById);
  app.put('/api/users/profile', authMiddleware, updateProfileValidation, userController.updateProfile);
  app.put('/api/users/change-password', authMiddleware, changePasswordValidation, userController.changePassword);
  app.put('/api/users/:id', authMiddleware, permissionMiddleware(['superadmin']), userController.updateUser);
  app.put('/api/users/:id/reset-password', authMiddleware, permissionMiddleware(['superadmin']), resetPasswordValidation, userController.resetUserPassword);
  app.delete('/api/users/:id', authMiddleware, permissionMiddleware(['superadmin']), userController.deleteUser);

  const userRoutes = require("./routes/users");
  app.use("/api/users", userRoutes);


  console.log('✅ User routes registered');
} else {
  console.warn('⚠️  User routes skipped - controller not found');
}

// === User Permissions Management Routes ===
if (userPermissionsController) {
  const { body } = require('express-validator');

  const updatePermissionsValidation = [
    body('permissions').isArray().withMessage('Permissions must be an array'),
    body('permissions.*.module_id').isInt().withMessage('Module ID must be an integer'),
    body('permissions.*.can_view').optional().isBoolean().withMessage('can_view must be boolean'),
    body('permissions.*.can_edit').optional().isBoolean().withMessage('can_edit must be boolean'),
    body('permissions.*.can_delete').optional().isBoolean().withMessage('can_delete must be boolean')
  ];

  const copyPermissionsValidation = [
    body('fromUserId').isInt().withMessage('From User ID must be an integer'),
    body('toUserId').isInt().withMessage('To User ID must be an integer')
  ];

  app.get('/api/users/:userId/permissions',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    userPermissionsController.getUserPermissions
  );

  app.put('/api/users/:userId/permissions',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    updatePermissionsValidation,
    userPermissionsController.updateUserPermissions
  );

  app.get('/api/users/:userId/available-modules',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    userPermissionsController.getAvailableModules
  );

  app.post('/api/permissions/copy',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    copyPermissionsValidation,
    userPermissionsController.copyUserPermissions
  );

  app.get('/api/permissions/summary',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    userPermissionsController.getPermissionsSummary
  );

  console.log('✅ User permissions routes registered');
} else {
  console.warn('⚠️  User permissions routes skipped - controller not found');
}

// === Role & Module Management Routes ===
// if (roleController) {
//   const { body } = require('express-validator');

//   const createRoleValidation = [
//     body('name').notEmpty().withMessage('Role name is required'),
//     body('description').optional()
//   ];

//   const createModuleValidation = [
//     body('name').notEmpty().withMessage('Module name is required'),
//     body('route').notEmpty().withMessage('Route is required'),
//     body('description').optional()
//   ];

//   // Role management routes
//   app.get('/api/roles', authMiddleware, permissionMiddleware(['superadmin']), roleController.getAllRoles);
//   app.post('/api/roles', authMiddleware, permissionMiddleware(['superadmin']), createRoleValidation, roleController.createRole);
//   app.get('/api/roles/summary', authMiddleware, permissionMiddleware(['superadmin']), roleController.getRoleSummary);
//   app.get('/api/roles/:roleId/permissions', authMiddleware, permissionMiddleware(['superadmin']), roleController.getRolePermissions);
//   app.get('/api/roles/:roleId/modules', authMiddleware, permissionMiddleware(['superadmin']), roleController.getAllModulesForRole);
//   app.put('/api/roles/:roleId/permissions', authMiddleware, permissionMiddleware(['superadmin']), roleController.updateRolePermissions);
//   app.delete('/api/roles/:roleId', authMiddleware, permissionMiddleware(['superadmin']), roleController.deleteRole);

//   // Module management routes
//   app.get('/api/modules', authMiddleware, permissionMiddleware(['superadmin']), roleController.getAllModules);
//   app.post('/api/modules', authMiddleware, permissionMiddleware(['superadmin']), createModuleValidation, roleController.createModule);

//   console.log('✅ Role & Module management routes registered');
// } else {
//   console.warn('⚠️  Role management routes skipped - controller not found');
// }
// === DIRECT ROLE MANAGEMENT ROUTE REGISTRATION (AFTER line 693) ===
// === ADD MORE ROLE MANAGEMENT ROUTES ===
// === COMPLETE ROLE MANAGEMENT ROUTES REGISTRATION ===
if (roleController) {
  const { body, param } = require('express-validator');

  console.log('Registering ALL role management routes directly...');

  // Create role with permissions
  app.post('/api/role-management/roles/create-with-permissions',
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
    roleController.createRoleWithPermissions
  );

  // Get roles dropdown
  app.get('/api/role-management/roles-dropdown',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    roleController.getAllRoles
  );

  // Get modules for role
  app.get('/api/role-management/roles/:roleId/modules',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    roleController.getAllModulesForRole
  );

  // Update role permissions
  //  app.put('/api/role-management/roles/:roleId/permissions',
  //    authMiddleware,
  //    permissionMiddleware(['superadmin']),
  //    [
  //     body('permissions').isArray().withMessage('Permissions must be an array'),
  //     body('permissions.*.module_id').isInt({ min: 1 }).withMessage('Module ID required'),
  //     body('permissions.*.can_view').optional().isBoolean(),
  //     body('permissions.*.can_add').optional().isBoolean(),
  //     body('permissions.*.can_edit').optional().isBoolean(),
  //     body('permissions.*.can_delete').optional().isBoolean()
  //   ],
  //   roleController.updateRolePermissions
  // );

  app.put('/api/role-management/roles/:roleId/permissions',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    [
      // Role name validation (optional)
      body('roleName')
        .optional()
        .notEmpty()
        .withMessage('Role name cannot be empty if provided')
        .isLength({ min: 2, max: 50 })
        .withMessage('Role name must be between 2 and 50 characters'),

      // Role description validation (optional)
      body('roleDescription')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Role description cannot exceed 255 characters'),

      // Permissions validation (now optional)
      body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array if provided'),

      // Conditional validation for permissions array elements
      body('permissions.*.module_id')
        .if(body('permissions').exists())
        .isInt({ min: 1 })
        .withMessage('Module ID required'),

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
    ],
    roleController.updateRolePermissions
  );

  app.patch('/api/role-management/roles/:roleId/toggle-status',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    [param('roleId').isInt({ min: 1 }).withMessage('Role ID must be a valid integer')],
    roleController.toggleRoleStatus
  );

  // Get role by ID
  app.get('/api/role-management/roles/:roleId',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    roleController.getRoleById
  );

  // Update role
  app.put('/api/role-management/roles/:roleId',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    [
      body('name').notEmpty().withMessage('Role name is required'),
      body('description').optional()
    ],
    roleController.updateRole
  );

  // Delete role
  app.delete('/api/role-management/roles/:roleId',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    roleController.deleteRole
  );

  // Get roles summary
  app.get('/api/role-management/roles-summary',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    roleController.getRoleSummary
  );

  // Create basic role
  app.post('/api/role-management/roles',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    [
      body('name').notEmpty().withMessage('Role name is required'),
      body('description').optional()
    ],
    roleController.createRole
  );

  // Get all modules
  app.get('/api/role-management/modules',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    roleController.getAllModules
  );

  // Create module
  app.post('/api/role-management/modules',
    authMiddleware,
    permissionMiddleware(['superadmin']),
    [
      body('name').notEmpty().withMessage('Module name is required'),
      body('route').notEmpty().withMessage('Route is required'),
      body('description').optional()
    ],
    roleController.createModule
  );

  // Get role permissions
  app.get('/api/role-management/roles/:roleId/permissions',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    roleController.getRolePermissions
  );

  console.log('ALL Role Management routes registered successfully');
  console.log('Available endpoints:');
  console.log('  POST /api/role-management/roles/create-with-permissions');
  console.log('  GET /api/role-management/roles-dropdown');
  console.log('  GET /api/role-management/roles/:roleId/modules');
  console.log('  PUT /api/role-management/roles/:roleId/permissions');
  console.log('  GET /api/role-management/roles/:roleId');
  console.log('  PUT /api/role-management/roles/:roleId');
  console.log('  DELETE /api/role-management/roles/:roleId');
  console.log('  GET /api/role-management/roles-summary');
  console.log('  POST /api/role-management/roles');
  console.log('  GET /api/role-management/modules');
  console.log('  POST /api/role-management/modules');
  console.log('  GET /api/role-management/roles/:roleId/permissions');

} else {
  console.warn('Role Management routes skipped - controller not found');
}// === Dropdown Routes ===
if (dropdownController) {
  const registerDropdownRoutes = (prefix = '/api/dropdown') => {
    const routes = {
      '/all': 'getAllDropdownData',
      '/preferred-locations': 'getPreferredLocations',
      '/states': 'getAllStates',
      '/cities/:stateId': 'getCitiesByState',
      '/districts/:stateId': 'getDistrictsByState',
      '/service-types': 'getServiceTypes',
      '/work-types': 'getWorkTypes',
      '/genders': 'getGenders',
      '/nationalities': 'getNationalities',
      '/id-proof-types': 'getIdProofTypes',
      '/available-days': 'getAvailableDays',
      '/time-slots': 'getTimeSlots',
      '/relationship-types': 'getRelationshipTypes',
      '/interview-status': 'getInterviewStatus',
      '/pf-toggle': 'getPfToggle',
    };

    Object.entries(routes).forEach(([route, handler]) => {
      if (typeof dropdownController[handler] === 'function') {
        app.get(`${prefix}${route}`, dropdownController[handler]);
      } else {
        console.warn(`⚠️  Skipped ${prefix}${route} - missing method: ${handler}`);
      }
    });

    console.log(`✅ Dropdown routes registered at ${prefix}`);
  };

  registerDropdownRoutes('/api/dropdown');
  registerDropdownRoutes('/api/registration/dropdowns');
} else {
  console.warn('⚠️  Dropdown routes skipped - controller not found');
}

// === Registration Routes ===
// if (registrationController) {
//   const methodMapping = {
//     'initialize': 'initializeRegistration',
//     'status': 'getRegistrationStatus', 
//     'complete': 'getCompleteRegistration',
//     'stepdata': 'getStepData',
//     'step1': 'savePersonalInfo',
//     'step2': 'saveContactAddress', 
//     'step3': 'saveServiceInfo',
//     'step4': 'saveBackgroundCheck',
//     'step5': 'saveDocumentUploads',
//     'step6': 'saveAccountInfo'
//   };

//   const routes = {
//     'initialize': { method: 'post' },
//     'status/:sessionToken': { method: 'get' },
//     'complete/:sessionToken': { method: 'get' },
//     'step-data/:sessionToken/:step': { method: 'get' },
//     'step1/:sessionToken': { method: 'post', upload: 'multipleDocuments' },
//     'step2/:sessionToken': { method: 'post' },
//     'step3/:sessionToken': { method: 'post', upload: 'serviceImage' },
//     'step4/:sessionToken': { method: 'post', upload: 'policeVerification' },
//     'step5/:sessionToken': { method: 'post', upload: 'multipleDocuments' },
//     'step6/:sessionToken': { method: 'post', upload: 'bankDocument' },
//   };

//   Object.entries(routes).forEach(([pathSuffix, { method, upload }]) => {
//     let handlerName;
//     if (pathSuffix.includes('/')) {
//       handlerName = pathSuffix.split('/')[0].replace(/[:\-]/g, '');
//     } else {
//       handlerName = pathSuffix;
//     }

//     const actualMethodName = methodMapping[handlerName] || handlerName;
//     const routePath = `/api/registration/${pathSuffix}`;
//     const handler = registrationController[actualMethodName];

//     if (typeof handler === 'function') {
//       const middlewares = upload ? getUploadMiddleware(upload) : [];
//       app[method](routePath, ...middlewares, handler);
//     }
//   });

//   console.log('✅ Registration routes auto-registered');
// } else {
//   console.warn('⚠️  Registration routes skipped - controller not found');
// }
// === Mobile OTP Registration Routes ===
if (registrationController) {
  try {
    const registrationRoutes = require('./routes/registration_routes');
    app.use('/api/registration', registrationRoutes);
    console.log('✅ Mobile OTP Registration routes registered at /api/registration');

    // Add registration documentation endpoint
    app.get('/api/registration/docs', (req, res) => {
      res.json({
        title: 'Mobile OTP Registration API Documentation',
        version: '2.0.0',
        description: 'Multi-step registration system with mobile OTP verification',
        baseURL: '/api/registration',
        features: [
          'Mobile number verification with OTP',
          'Duplicate mobile prevention',
          'Session token creation after verification',
          'Multi-step registration process',
          'File upload support',
          'Admin status management'
        ],
        workflow: [
          '1. POST /send-otp - Send OTP to mobile number',
          '2. POST /verify-otp - Verify OTP and get session token',
          '3. Complete 6-step registration using session token',
          '4. Admin approval workflow'
        ],
        endpoints: {
          mobileVerification: {
            sendOTP: 'POST /send-otp - Send OTP to mobile',
            verifyOTP: 'POST /verify-otp - Verify OTP and create session',
            resendOTP: 'POST /resend-otp - Resend OTP'
          },
          registration: {
            status: 'GET /status/:sessionToken - Get registration status',
            complete: 'GET /complete/:sessionToken - Get complete data',
            stepData: 'GET /step-data/:sessionToken/:step - Get step data',
            step1: 'POST /step1/:sessionToken - Personal information',
            step2: 'POST /step2/:sessionToken - Contact & address',
            step3: 'POST /step3/:sessionToken - Service information',
            step4: 'POST /step4/:sessionToken - Background check',
            step5: 'POST /step5/:sessionToken - Document uploads',
            step6: 'POST /step6/:sessionToken - Account information'
          },
          admin: {
            pendingVerifications: 'GET /admin/pending-verifications',
            updatePoliceStatus: 'PUT /admin/police-verification/:registrationId',
            updateSalaryStatus: 'PUT /admin/salary-status/:registrationId',
            updateRegistrationStatus: 'PUT /admin/registration-status/:registrationId',
            bulkApprove: 'POST /admin/bulk-approve'
          }
        }
      });
    });

  } catch (err) {
    console.error('❌ Failed to load mobile OTP registration routes:', err.message);
    console.error('Make sure routes/registration_routes.js exists and exports properly');
  }
} else {
  console.warn('⚠️  Mobile OTP Registration routes skipped - registrationController not found');
}

// === Direct Registration Routes (NO SESSION TOKEN) ===
if (directRegistrationController) {
  try {
    const directRegistrationRoutes = require('./routes/direct_registration_routes');
    app.use('/api/direct-registration', directRegistrationRoutes);
    console.log('✅ Direct Registration routes registered at /api/direct-registration');
  } catch (err) {
    console.error('❌ Failed to load direct registration routes:', err.message);
  }
} else {
  console.warn('⚠️  Direct Registration routes skipped - controller not found');
}
// Add this after your existing user routes in server.js (around line 620-630)
if (userController && typeof userController.getRolesForDropdown === 'function') {
  app.get('/api/users/roles-dropdown',
    authMiddleware,
    permissionMiddleware(['superadmin', 'admin']),
    userController.getRolesForDropdown
  );
  console.log('✅ User roles dropdown route added');
} else {
  console.log('❌ getRolesForDropdown method not found in userController');
}
// === ROLE MANAGEMENT WITH PERMISSIONS ROUTE ===
// if (roleController) {
//   const { body } = require('express-validator');

//   // Add the missing create-with-permissions route
//   const createRoleWithPermissionsValidation = [
//     body('name').notEmpty().withMessage('Role name is required'),
//     body('description').optional(),
//     body('permissions').isArray({ min: 1 }).withMessage('At least one permission required'),
//     body('permissions.*.module_id').isInt({ min: 1 }).withMessage('Module ID required'),
//     body('permissions.*.can_view').optional().isBoolean(),
//     body('permissions.*.can_edit').optional().isBoolean(),
//     body('permissions.*.can_delete').optional().isBoolean()
//   ];

//   app.post('/api/role-management/roles/create-with-permissions',
//     authMiddleware,
//     permissionMiddleware(['superadmin']),
//     createRoleWithPermissionsValidation,
//     roleController.createRoleWithPermissions
//   );

//   console.log('✅ Role Management create-with-permissions route registered');
// }
// In server.js, find this section and update it:
// === ROLE MANAGEMENT ROUTES ===
// === ROLE MANAGEMENT ROUTES ===
if (roleController) {
  try {
    const roleManagementRoutes = require('./routes/roleRoutes'); // <-- This is failing
    app.use('/api/role-management', roleManagementRoutes);
    console.log('✅ Role Management routes registered at /api/role-management');
  } catch (err) {
    console.error('❌ Failed to load role management routes:', err.message);
    console.error('Make sure ./routes/roleRoutes.js exists and exports properly');
  }
}
// === ROLE MANAGEMENT SCREEN ROUTES (for your UI) ===
// === ROLE MANAGEMENT SCREEN ROUTES (for your UI) ===
// if (roleController) {
//   const { body } = require('express-validator');

//   const createRoleValidation = [
//     body('name').notEmpty().withMessage('Role name is required'),
//     body('description').optional()
//   ];

//   // Get roles for dropdown
//   app.get('/api/role-management/roles-dropdown', 
//     authMiddleware, 
//     permissionMiddleware(['superadmin', 'admin']), 
//     roleController.getAllRoles
//   );

//   // Get role with modules and permissions (when role selected from dropdown)
//   app.get('/api/role-management/roles/:roleId/modules', 
//     authMiddleware, 
//     permissionMiddleware(['superadmin', 'admin']), 
//     roleController.getAllModulesForRole
//   );

//   // Update role permissions (Save button)
//   app.put('/api/role-management/roles/:roleId/permissions', 
//     authMiddleware, 
//     permissionMiddleware(['superadmin']), 
//     roleController.updateRolePermissions
//   );

// Create role (now with proper validation)

if (serviceManagementController) {
  try {
    const serviceManagementRoutes = require('./routes/serviceManagementRoutes');
    app.use('/api/service-management', serviceManagementRoutes);
    console.log('✅ Service Management routes registered at /api/service-management');

    // Add service management documentation endpoint
    app.get('/api/service-management/docs', (req, res) => {
      res.json({
        title: 'Service Management API Documentation',
        version: '1.0.0',
        baseURL: '/api/service-management',
        endpoints: {
          categories: {
            getAll: 'GET /categories - Get all service categories',
            create: 'POST /categories - Create service category (Admin)',
            update: 'PUT /categories/:id - Update service category (Admin)',
            getById: 'GET /categories/:id - Get service by ID',
            getFilters: 'GET /categories/:id/filters - Get service filters'
          },
          providers: {
            getAll: 'GET /providers - Get all providers',
            create: 'POST /providers - Create provider (Admin)',
            getDetails: 'GET /providers/:id/details - Get provider details',
            updateServices: 'PUT /providers/:id/services - Update provider services',
            search: 'POST /providers/search - Search providers by location',
            dashboard: 'GET /providers/:id/dashboard - Provider dashboard'
          },
          bookings: {
            create: 'POST /bookings - Create booking',
            getDetails: 'GET /bookings/:id - Get booking details',
            updateStatus: 'PUT /bookings/:id/status - Update booking status'
          },
          pricing: {
            calculate: 'POST /price/calculate - Calculate service price'
          },
          analytics: {
            services: 'GET /analytics/services - Service analytics (Admin)',
            bookings: 'GET /analytics/bookings - Booking trends (Admin)'
          }
        }
      });
    });

  } catch (err) {
    console.error('❌ Failed to load service management routes:', err.message);

    // Fallback: Register routes directly
    if (serviceManagementController) {
      // Service Categories
      app.get('/api/service-management/categories', serviceManagementController.getAllServiceCategories);
      app.post('/api/service-management/categories',
        authMiddleware,
        ...getUploadMiddleware('singleImage'),
        serviceManagementController.createServiceCategory
      );
      app.put('/api/service-management/categories/:id',
        authMiddleware,
        ...getUploadMiddleware('singleImage'),
        serviceManagementController.updateServiceCategory
      );
      app.get('/api/service-management/categories/:id', serviceManagementController.getServiceById);
      app.get('/api/service-management/categories/:serviceId/filters', serviceManagementController.getServiceFilters);

      console.log('✅ Service Management routes registered directly');
    }
  }
} else {
  console.warn('⚠️ Service Management routes skipped - controller not found');
}

// === PROVIDER MANAGEMENT ROUTES ===
if (providerManagementController) {
  try {
    const providerManagementRoutes = require('./routes/providerManagementRoutes');
    app.use('/api/provider-management', providerManagementRoutes);
    console.log('✅ Provider Management routes registered at /api/provider-management');

  } catch (err) {
    console.error('❌ Failed to load provider management routes:', err.message);

    // Fallback: Register routes directly
    if (providerManagementController) {
      app.get('/api/provider-management/providers', providerManagementController.getAllProviders);
      app.post('/api/provider-management/providers',
        authMiddleware,
        ...getUploadMiddleware('providerImages'),
        providerManagementController.createProvider
      );
      app.get('/api/provider-management/providers/:id/details', providerManagementController.getProviderDetails);
      app.put('/api/provider-management/providers/:id/services',
        authMiddleware,
        providerManagementController.updateProviderServices
      );
      app.post('/api/provider-management/providers/search', providerManagementController.searchProviders);
      app.get('/api/provider-management/providers/:id/dashboard',
        authMiddleware,
        providerManagementController.getProviderDashboard
      );

      console.log('✅ Provider Management routes registered directly');
    }
  }
} else {
  console.warn('⚠️ Provider Management routes skipped - controller not found');
}

// === BOOKING MANAGEMENT ROUTES ===
if (bookingManagementController) {
  try {
    const bookingManagementRoutes = require('./routes/bookingManagementRoutes');
    app.use('/api/booking-management', bookingManagementRoutes);
    console.log('✅ Booking Management routes registered at /api/booking-management');

  } catch (err) {
    console.error('❌ Failed to load booking management routes:', err.message);

    // Fallback: Register routes directly
    if (bookingManagementController) {
      app.post('/api/booking-management/bookings',
        authMiddleware,
        bookingManagementController.createBooking
      );
      app.get('/api/booking-management/bookings/:id', bookingManagementController.getBookingDetails);
      app.put('/api/booking-management/bookings/:id/status',
        authMiddleware,
        bookingManagementController.updateBookingStatus
      );

      console.log('✅ Booking Management routes registered directly');
    }
  }
} else {
  console.warn('⚠️ Booking Management routes skipped - controller not found');
}

// === PRICING ROUTES ===
if (serviceManagementController && typeof serviceManagementController.calculatePrice === 'function') {
  app.post('/api/service-management/price/calculate', serviceManagementController.calculatePrice);
  console.log('✅ Pricing routes registered');
}

// === ANALYTICS ROUTES (Admin only) ===
if (analyticsController) {
  try {
    app.get('/api/service-management/analytics/services',
      authMiddleware,
      permissionMiddleware(['superadmin', 'admin']),
      analyticsController.getServiceAnalytics
    );

    app.get('/api/service-management/analytics/bookings',
      authMiddleware,
      permissionMiddleware(['superadmin', 'admin']),
      analyticsController.getBookingTrends
    );

    console.log('✅ Analytics routes registered');
  } catch (err) {
    console.error('❌ Analytics routes failed:', err.message);
  }
}

// 3. ADD MASTER DATA ROUTES (for dropdowns in your UI)
if (masterDataController) {
  app.get('/api/service-management/master-data', masterDataController.getAllMasterData);
  app.get('/api/service-management/master-data/cities/:stateId', masterDataController.getCitiesByState);
  console.log('✅ Service Management Master Data routes registered');
} else {
  // Fallback using existing dropdown controller
  if (dropdownController) {
    app.get('/api/service-management/master-data', dropdownController.getAllDropdownData);
    app.get('/api/service-management/master-data/cities/:stateId', dropdownController.getCitiesByState);
    console.log('✅ Service Management Master Data routes registered (fallback)');
  }
}

// app.post('/api/role-management/roles', 
//   authMiddleware, 
//   permissionMiddleware(['superadmin']), 
//   createRoleValidation,
//   roleController.createRole
// );

console.log('✅ Role Management Screen routes registered');
// }

// === Dashboard Routes ===

// Super Admin Dashboard
app.get('/api/superadmin/dashboard', authMiddleware, permissionMiddleware(['superadmin']), async (req, res) => {
  try {
    const [userCount] = await db.execute('SELECT COUNT(*) as total FROM users WHERE is_active = true');
    const [tempCustomerCount] = await db.execute('SELECT COUNT(*) as total FROM temp_customers WHERE is_active = true');
    const [verifiedTempCustomerCount] = await db.execute('SELECT COUNT(*) as total FROM temp_customers WHERE is_mobile_verified = true AND is_active = true');
    const [roleCount] = await db.execute('SELECT COUNT(*) as total FROM roles');
    const [moduleCount] = await db.execute('SELECT COUNT(*) as total FROM modules');
    const [permissionCount] = await db.execute('SELECT COUNT(*) as total FROM user_permissions');
    const [providerCount] = await db.execute('SELECT COUNT(*) as total FROM user_registrations WHERE registration_status = "approved"');
    const [recentActivity] = await db.execute(`
      SELECT al.action, al.module, al.created_at, u.name as user_name, al.target_user_id
      FROM activity_logs al 
      JOIN users u ON al.user_id = u.id 
      ORDER BY al.created_at DESC 
      LIMIT 10
    `);

    const dashboardData = {
      message: 'Super Admin Dashboard',
      user: req.user,
      statistics: {
        totalUsers: userCount[0].total,
        totalTempCustomers: tempCustomerCount[0].total,
        verifiedTempCustomers: verifiedTempCustomerCount[0].total,
        totalServiceProviders: providerCount[0].total,
        totalRoles: roleCount[0].total,
        totalModules: moduleCount[0].total,
        totalUserPermissions: permissionCount[0].total,
        recentActivities: recentActivity.length
      },
      recentActivity,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin Dashboard
app.get('/api/admin/dashboard', authMiddleware, permissionMiddleware(['superadmin', 'admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Admin Dashboard',
    data: {
      user: req.user,
      availableModules: ['CRM', 'HR', 'Finance'],
      timestamp: new Date().toISOString()
    }
  });
});

// Module Dashboards with User-Based Permissions
app.get('/api/crm/dashboard',
  authMiddleware,
  userModulePermissionMiddleware('CRM', 'can_view'),
  (req, res) => {
    res.json({
      success: true,
      message: 'CRM Dashboard',
      data: {
        user: req.user,
        module: 'CRM',
        features: ['Customer Management', 'Lead Tracking', 'Sales Reports'],
        userPermissions: req.modulePermissions,
        accessLevel: {
          canView: req.modulePermissions?.can_view || false,
          canEdit: req.modulePermissions?.can_edit || false,
          canDelete: req.modulePermissions?.can_delete || false
        },
        timestamp: new Date().toISOString()
      }
    });
  }
);

app.get('/api/hr/dashboard',
  authMiddleware,
  userModulePermissionMiddleware('HR', 'can_view'),
  (req, res) => {
    res.json({
      success: true,
      message: 'HR Dashboard',
      data: {
        user: req.user,
        module: 'HR',
        features: ['Employee Management', 'Payroll', 'Performance Reviews'],
        userPermissions: req.modulePermissions,
        accessLevel: {
          canView: req.modulePermissions?.can_view || false,
          canEdit: req.modulePermissions?.can_edit || false,
          canDelete: req.modulePermissions?.can_delete || false
        },
        timestamp: new Date().toISOString()
      }
    });
  }
);

app.get('/api/finance/dashboard',
  authMiddleware,
  userModulePermissionMiddleware('Finance', 'can_view'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Finance Dashboard',
      data: {
        user: req.user,
        module: 'Finance',
        features: ['Budget Management', 'Expense Tracking', 'Financial Reports'],
        userPermissions: req.modulePermissions,
        accessLevel: {
          canView: req.modulePermissions?.can_view || false,
          canEdit: req.modulePermissions?.can_edit || false,
          canDelete: req.modulePermissions?.can_delete || false
        },
        timestamp: new Date().toISOString()
      }
    });
  }
);

// Database connection test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const [result] = await db.execute('SELECT 1 + 1 as result, NOW() as timestamp');
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result[0]
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test distance calculation function
app.get('/api/test-distance', async (req, res) => {
  try {
    const { lat1 = 13.0827, lon1 = 80.2707, lat2 = 13.0900, lon2 = 80.2800 } = req.query;

    const [result] = await db.execute(
      'SELECT calculate_distance_km(?, ?, ?, ?) as distance_km',
      [lat1, lon1, lat2, lon2]
    );

    res.json({
      success: true,
      message: 'Distance calculation test successful',
      data: {
        from: { latitude: parseFloat(lat1), longitude: parseFloat(lon1) },
        to: { latitude: parseFloat(lat2), longitude: parseFloat(lon2) },
        distance: {
          km: parseFloat(result[0].distance_km),
          formatted: `${parseFloat(result[0].distance_km).toFixed(2)} km`
        }
      }
    });
  } catch (error) {
    console.error('Distance calculation test error:', error);
    res.status(500).json({
      success: false,
      message: 'Distance calculation test failed',
      error: error.message
    });
  }
});

// === API Documentation Route ===
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Udhavi Foundation API Documentation',
    version: '5.0.0',
    description: 'Complete API with Service Management, Provider Management, Booking System, and User Management',
    newFeatures: {
      serviceManagement: {
        description: 'Complete service category management system',
        endpoints: '/api/service-management/*'
      },
      providerManagement: {
        description: 'Provider registration and management with location tracking',
        endpoints: '/api/provider-management/*'
      },
      bookingSystem: {
        description: 'Customer booking system with dynamic filters',
        endpoints: '/api/booking-management/*'
      }
    },
    endpoints: {
      // Your existing endpoints...
      serviceManagement: {
        categories: 'GET/POST/PUT /api/service-management/categories/*',
        providers: 'GET/POST/PUT /api/provider-management/providers/*',
        bookings: 'GET/POST/PUT /api/booking-management/bookings/*',
        pricing: 'POST /api/service-management/price/calculate',
        analytics: 'GET /api/service-management/analytics/*',
        masterData: 'GET /api/service-management/master-data/*',
        documentation: 'GET /api/service-management/docs'
      },
      // ... rest of your existing endpoints
      authentication: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile',
        verifyToken: 'POST /api/auth/verify-token',
        refreshToken: 'POST /api/auth/refresh-token'
      },
      serviceSearch: {
        searchServices: 'POST /api/services/search',
        quickSearch: 'POST /api/services/search/quick',
        availableServices: 'GET /api/services/available',
        providerDetails: 'GET /api/services/provider/:registration_id'
      },
      // ... include all your existing endpoint documentation
    },
    integration: {
      databaseTables: [
        'service_types - Service categories',
        'service_filters - Dynamic filtering system',
        'user_registrations - Service providers',
        'contact_address_details - Provider locations',
        'customer_service_bookings - Booking system',
        'provider_availability - Real-time status'
      ],
      fileUploads: {
        serviceIcons: 'Service category icons',
        providerImages: 'Provider profile and service images',
        maxSize: '10MB per file',
        formats: 'JPG, PNG, JPEG'
      }
    }
  });
});

// const customerRoutes = require('./routes/customeradmin_routes');
// app.use('/api', customerRoutes);
const customerAdminRoutes = require('./routes/customeradmin_routes');
// Add other route imports here

// Use routes
app.use('/api', customerAdminRoutes);
// Add other routes here

// === Error Handling ===
// === Error Handling ===
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // Handle multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB per file.',
      error_code: 'FILE_TOO_LARGE'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum 5 files allowed.',
      error_code: 'TOO_MANY_FILES'
    });
  }

  // Handle coordinate validation errors
  if (err.message && err.message.includes('coordinate')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid coordinates provided. Please verify location data.',
      error_code: 'INVALID_COORDINATES',
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      type: err.name || 'Error',
      timestamp: new Date().toISOString()
    },
  });
});
// app.use((err, req, res, next) => {
//   console.error('Unhandled Error:', err);
//   res.status(500).json({
//     success: false,
//     error: {
//       message: err.message || 'Internal server error',
//       type: err.name || 'Error',
//       timestamp: new Date().toISOString()
//     },
//   });
// });
const simpleRoutes = require('./routes/servicesearch_Routes');
app.use('/api/simple', simpleRoutes);
// 404 handler
// app.use('', (req, res) => {
//   res.status(404).json({
//     success: false,
//     error: {
//       message: 'Route not found',
//       path: req.originalUrl,
//       method: req.method,
//       timestamp: new Date().toISOString(),
//       availableEndpoints: [
//         'GET / - API Information',
//         'GET /health - Health Check',
//         'GET /api/docs - API Documentation',
//         'POST /api/services/search - Search Service Providers (NEW)',
//         'POST /api/services/search/quick - Quick Service Search (NEW)',
//         'GET /api/services/available - Available Services (NEW)',
//         'GET /api/services/provider/:id - Provider Details (NEW)',
//         'GET /api/location-search/docs - Location Search Documentation',
//         'POST /api/auth/login - Service Provider Login',
//         'POST /api/location-search/providers - Search Service Providers (Legacy)',
//         'GET /api/location-search/health - Location Search Health Check',
//         'GET /api/location-search/debug/providers - Debug Provider Data',
//         'GET /api/location-search/debug/service-types - Debug Service Types',
//         'POST /api/temp-customer/login - Temporary Customer Login',
//         'GET /api/test-db - Test Database Connection',
//         'GET /api/test-distance - Test Distance Calculation',
//         'POST /api/registration/send-otp - Send mobile OTP',
//         'POST /api/registration/verify-otp - Verify OTP and create session',
//         'POST /api/registration/step1-6/:sessionToken - Registration steps',
//         'GET /api/registration/docs - Mobile Registration Documentation',


//       ],
//       documentation: '/api/docs'
//     },
//   });
// });

const serviceUploadDirs = [
  'uploads/services',           // For service category icons
  'uploads/providers',          // For provider images
  'uploads/bookings'            // For booking-related files
];

serviceUploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created service management upload directory: ${dir}`);
  }
});


// === Start Server ===
const PORT = process.env.PORT || 3000;
const serviceRoutes = require('./routes/servicesearch_Routes');

const startServer = async () => {
  try {
    await db.execute('SELECT 1');
    console.log('Database connection successful');

    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`Udhavi Foundation API Server Started`);
      console.log(`Server running at: http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log('========================================');
      console.log('Available Features:');
      console.log('   Authentication & Authorization');
      console.log('   User Management');
      console.log('   Role Management');
      console.log('   Service Management (NEW)'); // NEW
      console.log('   Provider Management (NEW)'); // NEW
      console.log('   Booking System (NEW)'); // NEW
      console.log('   Temporary Customer Management');
      console.log('   Location-Based Search');
      console.log('   Registration System');
      console.log('   Activity Logging');
      console.log('========================================');
      console.log('NEW: Service Management Endpoints:');
      console.log(`   GET/POST /api/service-management/categories`);
      console.log(`   GET/POST /api/provider-management/providers`);
      console.log(`   GET/POST /api/booking-management/bookings`);
      console.log(`   POST /api/service-management/price/calculate`);
      console.log(`   GET /api/service-management/docs - Documentation`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};


app.use('/api', serviceRoutes);

startServer();

module.exports = app;
