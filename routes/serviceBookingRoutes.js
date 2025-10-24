// routes/serviceBookingRoutes.js - Enhanced Dynamic Service Booking Routes
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const ServiceBookingController = require('../controller/serviceBookingController');
const { uploadConfigs, handleUploadError } = require('../utils/uploadUtil');

// === VALIDATION MIDDLEWARE ===
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.param,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// === VALIDATION RULES ===

const saveProviderServiceConfigValidation = [
  // Use custom validation that handles multipart form data
  body('provider_id').custom((value) => {
    const id = parseInt(value);
    if (!id || id < 1) {
      throw new Error('Valid provider ID required');
    }
    return true;
  }),
  
  body('service_id').custom((value) => {
    const id = parseInt(value);
    if (!id || id < 1) {
      throw new Error('Valid service ID required');
    }
    return true;
  }),
  
  body('service_name').custom((value) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Service name is required');
    }
    return true;
  }),
  
  body('base_rate').custom((value) => {
    const rate = parseFloat(value);
    if (!rate || rate <= 0) {
      throw new Error('Valid base rate is required');
    }
    return true;
  }),
  
  body('selected_filters').custom((value) => {
    if (!value) {
      throw new Error('Selected filters are required');
    }
    
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('At least one filter is required');
      }
      return true;
    } catch (e) {
      throw new Error('Invalid selected_filters format');
    }
  })
];


// Service ID validation
const serviceIdValidation = [
    param('service_id')
        .isInt({ min: 1 })
        .withMessage('Valid service ID is required')
];

// Customer ID validation
const customerIdValidation = [
    param('customer_id')
        .isInt({ min: 1 })
        .withMessage('Valid customer ID is required')
];

// Booking ID validation
const bookingIdValidation = [
    param('booking_id')
        .isInt({ min: 1 })
        .withMessage('Valid booking ID is required')
];

// Service Provider ID validation
const serviceProviderIdValidation = [
    param('service_provider_id')
        .isInt({ min: 1 })
        .withMessage('Valid service provider ID is required')
];

// Enhanced booking creation validation
const createBookingValidation = [
    body('customer_id')
        .isInt({ min: 1 })
        .withMessage('Valid customer ID is required'),
    
    body('service_provider_id')
        .isInt({ min: 1 })
        .withMessage('Valid service provider ID is required'),
    
    body('service_id')
        .isInt({ min: 1 })
        .withMessage('Valid service ID is required'),
    
    body('selected_filters')
        .isArray({ min: 1 })
        .withMessage('At least one filter must be selected'),
    
    body('selected_filters.*.filter_id')
        .isInt({ min: 1 })
        .withMessage('Each filter must have a valid filter ID'),
    
    body('selected_filters.*.filter_name')
        .isString()
        .notEmpty()
        .withMessage('Each filter must have a filter name'),
    
    body('selected_filters.*.selected_values')
        .isArray({ min: 1 })
        .withMessage('Each filter must have at least one selected value'),
    
    body('estimated_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Estimated price must be a positive number'),
    
    body('notes')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .withMessage('Notes must not exceed 2000 characters')
];

// Booking status update validation
const updateStatusValidation = [
    param('booking_id')
        .isInt({ min: 1 })
        .withMessage('Valid booking ID is required'),
    
    body('status')
        .isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status. Valid options: pending, confirmed, in_progress, completed, cancelled'),
    
    body('notes')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Notes must not exceed 1000 characters'),
    
    body('reason')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Reason must not exceed 500 characters')
];

// Booking cancellation validation
const cancelBookingValidation = [
    param('booking_id')
        .isInt({ min: 1 })
        .withMessage('Valid booking ID is required'),
    
    body('reason')
        .isString()
        .notEmpty()
        .isLength({ max: 500 })
        .withMessage('Cancellation reason is required and must not exceed 500 characters'),
    
    body('refund_requested')
        .optional()
        .isBoolean()
        .withMessage('Refund requested must be a boolean value')
];

// Search bookings validation
const searchBookingsValidation = [
    query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status filter'),
    
    query('service_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid service ID'),
    
    query('customer_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid customer ID'),
    
    query('provider_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid provider ID'),
    
    query('date_from')
        .optional()
        .isDate()
        .withMessage('Invalid date format for date_from (YYYY-MM-DD expected)'),
    
    query('date_to')
        .optional()
        .isDate()
        .withMessage('Invalid date format for date_to (YYYY-MM-DD expected)'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
    
    query('sort_by')
        .optional()
        .isIn(['created_at', 'service_date', 'booking_status', 'estimated_price'])
        .withMessage('Invalid sort field'),
    
    query('sort_order')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC')
];

// Customer bookings query validation
const customerBookingsQueryValidation = [
    query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status filter'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer')
];

// Provider bookings query validation
const providerBookingsQueryValidation = [
    query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status filter'),
    
    query('date_from')
        .optional()
        .isDate()
        .withMessage('Invalid date format for date_from'),
    
    query('date_to')
        .optional()
        .isDate()
        .withMessage('Invalid date format for date_to')
];

// Statistics query validation
const statsQueryValidation = [
    query('period')
        .optional()
        .isIn(['all', 'today', 'week', 'month'])
        .withMessage('Invalid period. Valid options: all, today, week, month'),
    
    query('service_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid service ID'),
    
    query('provider_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid provider ID')
];

// === PUBLIC ROUTES ===

// Get all active services
router.get('/services',
    ServiceBookingController.getAllServices
);

// Get service-specific filters and options (Core feature for dynamic dropdowns)
router.get('/filters/:service_id', 
    serviceIdValidation,
    handleValidationErrors,
    ServiceBookingController.getServiceFilters.bind(ServiceBookingController)
    // ServiceBookingController.getServiceFilters
);

// === CUSTOMER ROUTES ===

// Create a new booking
router.post('/create', 
    createBookingValidation,
    handleValidationErrors,
    ServiceBookingController.createBooking
);

// Get all bookings for a customer with pagination and filters
router.get('/customer/:customer_id', 
    customerIdValidation,
    customerBookingsQueryValidation,
    handleValidationErrors,
    ServiceBookingController.getCustomerBookings
);

// Get specific booking details with complete information
router.get('/details/:booking_id',
    bookingIdValidation,
    handleValidationErrors,
    ServiceBookingController.getBookingDetails
);

// Update booking status (for providers and admins)
router.patch('/status/:booking_id', 
    updateStatusValidation,
    handleValidationErrors,
    ServiceBookingController.updateBookingStatus
);

// Cancel a booking with refund processing
router.patch('/cancel/:booking_id',
    cancelBookingValidation,
    handleValidationErrors,
    ServiceBookingController.cancelBooking
);

// === SERVICE PROVIDER ROUTES ===

// Get bookings for a service provider with filters
router.get('/provider/:service_provider_id',
    serviceProviderIdValidation,
    providerBookingsQueryValidation,
    handleValidationErrors,
    ServiceBookingController.getServiceProviderBookings
);

// === ADMIN/MANAGEMENT ROUTES ===

// Advanced search for bookings with multiple filters
router.get('/search',
    searchBookingsValidation,
    handleValidationErrors,
    ServiceBookingController.searchBookings
);

// Get comprehensive booking statistics
router.get('/stats',
    statsQueryValidation,
    handleValidationErrors,
    ServiceBookingController.getBookingStats
);

// === UTILITY ROUTES ===

// Get booking status options with descriptions
router.get('/status-options', (req, res) => {
    res.json({
        success: true,
        message: 'Booking status options retrieved',
        data: {
            status_options: [
                { 
                    value: 'pending', 
                    label: 'Pending Confirmation',
                    description: 'Waiting for service provider to confirm',
                    color: 'orange',
                    can_transition_to: ['confirmed', 'cancelled']
                },
                { 
                    value: 'confirmed', 
                    label: 'Confirmed',
                    description: 'Service provider has confirmed the booking',
                    color: 'green',
                    can_transition_to: ['in_progress', 'cancelled']
                },
                { 
                    value: 'in_progress', 
                    label: 'In Progress',
                    description: 'Service is currently being provided',
                    color: 'blue',
                    can_transition_to: ['completed', 'cancelled']
                },
                { 
                    value: 'completed', 
                    label: 'Completed',
                    description: 'Service has been completed successfully',
                    color: 'green',
                    can_transition_to: []
                },
                { 
                    value: 'cancelled', 
                    label: 'Cancelled',
                    description: 'Booking has been cancelled',
                    color: 'red',
                    can_transition_to: []
                }
            ]
        }
    });
});

// Get service categories for filtering
router.get('/categories', (req, res) => {
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

// Health check endpoint with database connectivity test
router.get('/health', async (req, res) => {
    try {
        const db = require('../database/connection');
        
        // Test database connection
        await db.execute('SELECT 1');
        
        // Check required tables
        const [tables] = await db.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name IN (
                'service_types', 'service_filters', 'service_filter_options',
                'customer_service_bookings', 'customer_booking_filters',
                'temp_customers', 'account_information'
            )
        `);
        
        const requiredTables = [
            'service_types', 'service_filters', 'service_filter_options',
            'customer_service_bookings', 'customer_booking_filters',
            'temp_customers', 'account_information'
        ];
        
        const existingTables = tables.map(t => t.table_name || t.TABLE_NAME);
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        res.json({
            success: true,
            message: 'Service booking API health check completed',
            data: {
                status: 'healthy',
                database_connection: 'OK',
                timestamp: new Date().toISOString(),
                version: '2.0.0',
                required_tables: requiredTables.length,
                existing_tables: existingTables.length,
                missing_tables: missingTables,
                all_tables_present: missingTables.length === 0,
                api_endpoints: {
                    public: ['GET /services', 'GET /filters/:service_id'],
                    customer: ['POST /create', 'GET /customer/:id', 'GET /details/:id'],
                    provider: ['GET /provider/:id', 'PATCH /status/:id'],
                    admin: ['GET /search', 'GET /stats'],
                    utility: ['GET /status-options', 'GET /categories', 'GET /health']
                }
            }
        });

    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            data: {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get API documentation
router.get('/docs', (req, res) => {
    res.json({
        success: true,
        message: 'Service Booking API Documentation',
        data: {
            title: 'Service Booking API v2.0',
            description: 'Dynamic service booking system with filter-based selections',
            base_url: req.protocol + '://' + req.get('host') + req.baseUrl,
            endpoints: {
                public: {
                    'GET /services': {
                        description: 'Get all active services',
                        parameters: 'None',
                        response: 'List of services with basic info'
                    },
                    'GET /filters/:service_id': {
                        description: 'Get dynamic filters for a specific service',
                        parameters: 'service_id (path parameter)',
                        response: 'Service filters organized by sections with options'
                    }
                },
                customer: {
                    'POST /create': {
                        description: 'Create a new service booking',
                        parameters: 'customer_id, service_provider_id, service_id, selected_filters',
                        response: 'Created booking details with payment info'
                    },
                    'GET /customer/:customer_id': {
                        description: 'Get customer booking history',
                        parameters: 'customer_id (path), status, limit, offset (query)',
                        response: 'Paginated list of customer bookings'
                    },
                    'GET /details/:booking_id': {
                        description: 'Get complete booking details',
                        parameters: 'booking_id (path parameter)',
                        response: 'Complete booking information with filters'
                    }
                },
                provider: {
                    'GET /provider/:service_provider_id': {
                        description: 'Get bookings assigned to a service provider',
                        parameters: 'service_provider_id (path), status, date_from, date_to (query)',
                        response: 'List of provider bookings with customer info'
                    },
                    'PATCH /status/:booking_id': {
                        description: 'Update booking status',
                        parameters: 'booking_id (path), status, notes, reason (body)',
                        response: 'Updated booking with status transition info'
                    }
                },
                admin: {
                    'GET /search': {
                        description: 'Advanced booking search with multiple filters',
                        parameters: 'Various query parameters for filtering',
                        response: 'Filtered and paginated booking results'
                    },
                    'GET /stats': {
                        description: 'Get booking statistics and analytics',
                        parameters: 'period, service_id, provider_id (query)',
                        response: 'Comprehensive booking statistics'
                    }
                }
            },
            authentication: 'Required for customer, provider, and admin endpoints',
            rate_limiting: 'Applied per IP address',
            version: '2.0.0'
        }
    });
});

// === ERROR HANDLING MIDDLEWARE ===
router.use((error, req, res, next) => {
    console.error('Service booking route error:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        params: req.params,
        query: req.query,
        body: req.body
    });

    res.status(500).json({
        success: false,
        message: 'Internal server error in service booking',
        error_id: Date.now().toString(36),
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? {
            error_message: error.message,
            error_stack: error.stack
        } : undefined
    });
});

// === 404 HANDLER ===
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Service booking endpoint not found',
        requested: {
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
        },
        available_endpoints: {
            public: [
                'GET /api/booking/services - Get all services',
                'GET /api/booking/filters/:service_id - Get service filters'
            ],
            customer: [
                'POST /api/booking/create - Create new booking',
                'GET /api/booking/customer/:customer_id - Get customer bookings',
                'GET /api/booking/details/:booking_id - Get booking details',
                'PATCH /api/booking/cancel/:booking_id - Cancel booking'
            ],
            provider: [
                'GET /api/booking/provider/:service_provider_id - Get provider bookings',
                'PATCH /api/booking/status/:booking_id - Update booking status'
            ],
            admin: [
                'GET /api/booking/search - Advanced booking search',
                'GET /api/booking/stats - Get booking statistics'
            ],
            utility: [
                'GET /api/booking/status-options - Get status options',
                'GET /api/booking/categories - Get service categories',
                'GET /api/booking/health - API health check',
                'GET /api/booking/docs - API documentation'
            ]
        },
        suggestion: 'Check the API documentation at GET /api/booking/docs'
    });
});

// In routes/serviceBookingRoutes.js, add:
router.get('/debug/filters/:service_id', ServiceBookingController.debugServiceFilters);

//NEW

// Save provider service configuration (your complete form)
router.post('/provider/save-service-config',
    uploadConfigs.serviceImage,           // Handle service image upload
    handleUploadError,                    // Handle upload errors
    saveProviderServiceConfigValidation,  // Validate form data
    handleValidationErrors,               // Handle validation errors
    ServiceBookingController.saveProviderServiceConfiguration
);

// Search providers by customer filters
router.post('/search-providers-by-filters',
    [
        body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
        body('customer_filters').isArray({ min: 1 }).withMessage('Customer filters required')
    ],
    handleValidationErrors,
    ServiceBookingController.searchProvidersByFilters
);

// Get provider service configurations
router.get('/provider/:provider_id/service-configs',
    [
        param('provider_id').isInt({ min: 1 }).withMessage('Valid provider ID required')
    ],
    handleValidationErrors,
    ServiceBookingController.getProviderServiceConfigurations
);


//new 2
// Add these routes to your serviceBookingRoutes.js

//new 2
// Provider Configuration Routes

// 1. GET ALL CONFIGURATIONS FOR TABLE
router.get('/provider-configurations', 
    ServiceBookingController.getAllProviderConfigurations
);

// 2. UPDATE CONFIGURATION (EDIT)
router.put('/provider-configurations/:configId',
    uploadConfigs.serviceImage,
    handleUploadError,
    ServiceBookingController.updateProviderConfiguration
);

// 3. VIEW SINGLE CONFIGURATION
router.get('/provider-configurations/:configId',
    ServiceBookingController.getProviderConfigurationById
);

// 4. TOGGLE STATUS (ACTIVATE/DEACTIVATE)
router.patch('/provider-configurations/:configId/toggle-status', 
    ServiceBookingController.toggleProviderConfigurationStatus
);

// 5. GET ALL SERVICE PROVIDERS
router.get('/providers', 
    ServiceBookingController.getServiceProviders
);

    //2.new
    
    // 1. Save customer filters (when user clicks "Proceed" on filter page)
router.post('/save-filters', 
    [
        body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
        body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
        body('customer_name').optional().isString().withMessage('Customer name must be string')
    ],
    handleValidationErrors,
    ServiceBookingController.saveCustomerFilters
);

// 2. Get booking details with pricing (for booking details page)
router.get('/booking-details/:customer_id/:service_id',
    [
        param('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
        param('service_id').isInt({ min: 1 }).withMessage('Valid service ID required')
    ],
    handleValidationErrors,
    ServiceBookingController.getBookingDetails
);

// 3. Save final booking (when user confirms booking)
router.post('/confirm-booking',
    [
        body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID required'),
        body('service_id').isInt({ min: 1 }).withMessage('Valid service ID required'),
        body('address').notEmpty().withMessage('Address is required'),
        body('start_date').isDate().withMessage('Valid start date required'),
        body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount required')
    ],
    handleValidationErrors,
    ServiceBookingController.saveBooking
);

// 4. Get service filters with pricing (helper API)
router.get('/service-filters/:service_id',
    [
        param('service_id').isInt({ min: 1 }).withMessage('Valid service ID required')
    ],
    handleValidationErrors,
    ServiceBookingController.getServiceFilters
);

router.patch('/provider-configurations/:configId/toggle-status', 
    ServiceBookingController.toggleProviderConfigurationStatus  // ✅ CORRECT
);

module.exports = router;
