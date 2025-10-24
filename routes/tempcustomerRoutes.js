// UPDATED routes/tempCustomerRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const tempCustomerController = require('../controller/tempcustomerController');
const authMiddleware = require('../middleware/auth');

// Validation middleware
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

// Mobile validation for both signup and login
const mobileValidation = [
    body('mobile')
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Valid 10-digit Indian mobile number is required (must start with 6-9)')
];

// NEW Customer Registration validation (name + email + mobile)
const newCustomerSignupValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
        .trim()
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    
    body('mobile')
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Valid 10-digit Indian mobile number is required (must start with 6-9)')
];

// OTP verification validation
const verifyOTPValidation = [
    body('sessionToken')
        .notEmpty()
        .withMessage('Session token is required'),
    
    body('otp')
        .trim()
        .isLength({ min: 6, max: 6 })
        .withMessage('Valid 6-digit OTP is required')
        .isNumeric()
        .withMessage('OTP must contain only numbers')
];

const saveLocationValidation = [
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude is required (-90 to 90)'),
    
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude is required (-180 to 180)'),
    
    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Address must not exceed 500 characters'),
    
    body('locationType')
        .optional()
        .isIn(['gps', 'map_select', 'manual'])
        .withMessage('Location type must be gps, map_select, or manual')
];

const saveServicesValidation = [
    body('serviceIds')
        .isArray({ min: 1 })
        .withMessage('At least one service must be selected'),
    
    body('serviceIds.*')
        .isInt({ min: 1 })
        .withMessage('Each service ID must be a positive integer')
];

// Helper middleware
const checkTempCustomerAccess = (req, res, next) => {
    if (req.user.type !== 'temp_customer') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Temporary customer access required.'
        });
    }
    next();
};

// === PUBLIC ROUTES (No authentication required) ===

// NEW Customer Signup - prevents duplicates, only for new customers
router.post('/signup', 
    newCustomerSignupValidation, 
    handleValidationErrors, 
    tempCustomerController.tempCustomerSignup
);

// EXISTING Customer Login - only mobile number needed, for returning customers
router.post('/login', 
    mobileValidation, 
    handleValidationErrors, 
    tempCustomerController.existingCustomerLogin
);

// Verify OTP (works for both new and existing customers)
router.post('/verify-otp', 
    verifyOTPValidation, 
    handleValidationErrors, 
    tempCustomerController.verifyTempCustomerOTP
);

// Resend OTP
router.post('/resend-otp', 
    mobileValidation, 
    handleValidationErrors, 
    tempCustomerController.resendTempCustomerOTP
);

// Get available services (public endpoint)
router.get('/services', tempCustomerController.getAvailableServices);

// Get preferred locations (public endpoint)  
router.get('/locations', tempCustomerController.getPreferredLocations);

// === PROTECTED ROUTES (Authentication required) ===

// Save customer location
router.post('/location', 
    authMiddleware, 
    checkTempCustomerAccess,
    saveLocationValidation, 
    handleValidationErrors, 
    tempCustomerController.saveTempCustomerLocation
);

// Save selected services
router.post('/services', 
    authMiddleware, 
    checkTempCustomerAccess,
    saveServicesValidation, 
    handleValidationErrors, 
    tempCustomerController.saveTempCustomerServices
);

// Get customer profile
router.get('/profile', 
    authMiddleware, 
    checkTempCustomerAccess,
    tempCustomerController.getTempCustomerProfile
);

// === ENHANCED ROUTES FOR BETTER UX ===

// Check if mobile exists (helps frontend decide signup vs login)
router.post('/check-mobile', 
    mobileValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { mobile } = req.body;
            const tempCustomerQueries = require('../queries/tempcustomerQueries');
            const existingCustomer = await tempCustomerQueries.getTempCustomerByMobile(mobile);
            
            if (existingCustomer) {
                res.json({
                    success: true,
                    message: 'Mobile number found',
                    data: {
                        exists: true,
                        customerName: existingCustomer.name,
                        action: 'login'
                    }
                });
            } else {
                res.json({
                    success: true,
                    message: 'Mobile number not found',
                    data: {
                        exists: false,
                        action: 'signup'
                    }
                });
            }
        } catch (error) {
            console.error('Check mobile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

// Get customer dashboard with last search
router.get('/dashboard', 
    authMiddleware, 
    checkTempCustomerAccess, 
    async (req, res) => {
        try {
            const customerId = req.user.id;
            const tempCustomerQueries = require('../queries/tempcustomerQueries');
            
            const customerProfile = await tempCustomerQueries.getTempCustomerProfile(customerId);
            const lastSearch = await tempCustomerQueries.getLastSearchHistory(customerId);

            res.json({
                success: true,
                message: 'Customer Dashboard',
                data: {
                    customer: {
                        id: req.user.id,
                        name: req.user.name,
                        mobile: req.user.mobile,
                        isVerified: req.user.isMobileVerified
                    },
                    profile: customerProfile,
                    lastSearch: lastSearch,
                    statistics: {
                        selectedServices: customerProfile?.selected_services?.length || 0,
                        hasLocation: !!(req.user.currentLatitude && req.user.currentLongitude),
                        hasLastSearch: !!lastSearch
                    },
                    nextSteps: [
                        !req.user.currentLatitude ? 'Set your location' : null,
                        !customerProfile?.selected_services?.length ? 'Select services' : null,
                        'Search for service providers'
                    ].filter(Boolean)
                }
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load dashboard'
            });
        }
    }
);

// Get last search history
router.get('/last-search', 
    authMiddleware, 
    checkTempCustomerAccess,
    async (req, res) => {
        try {
            const customerId = req.user.id;
            const tempCustomerQueries = require('../queries/tempcustomerQueries');
            const lastSearch = await tempCustomerQueries.getLastSearchHistory(customerId);
            
            if (!lastSearch) {
                return res.json({
                    success: true,
                    message: 'No previous searches found',
                    data: null
                });
            }

            res.json({
                success: true,
                message: 'Last search retrieved successfully',
                data: lastSearch
            });
        } catch (error) {
            console.error('Get last search error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

// All your other existing routes remain the same...
router.get('/location-history', authMiddleware, checkTempCustomerAccess, async (req, res) => {
    try {
        const customerId = req.user.id;
        const tempCustomerQueries = require('../queries/tempcustomerQueries');
        const locationHistory = await tempCustomerQueries.getTempCustomerLocationHistory(customerId);
        
        res.status(200).json({
            success: true,
            message: 'Location history retrieved successfully',
            data: locationHistory
        });
    } catch (error) {
        console.error('Get location history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

router.get('/current-location', authMiddleware, checkTempCustomerAccess, async (req, res) => {
    try {
        const customerId = req.user.id;
        const tempCustomerQueries = require('../queries/tempcustomerQueries');
        const currentLocation = await tempCustomerQueries.getTempCustomerCurrentLocation(customerId);
        
        res.status(200).json({
            success: true,
            message: 'Current location retrieved successfully',
            data: currentLocation
        });
    } catch (error) {
        console.error('Get current location error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

router.post('/ping', authMiddleware, checkTempCustomerAccess, async (req, res) => {
    try {
        const customerId = req.user.id;
        const tempCustomerQueries = require('../queries/tempcustomerQueries');
        await tempCustomerQueries.updateTempCustomerActivity(customerId);
        
        res.status(200).json({
            success: true,
            message: 'Activity updated',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Add this simple filter test
router.get('/api/booking/filters-test/:service_id', (req, res) => {
    res.json({
        success: true,
        message: 'Test filters endpoint',
        data: {
            service: { id: req.params.service_id, name: 'Test Service' },
            sections: [
                {
                    title: 'Test Section',
                    filters: [
                        {
                            filter_id: 1,
                            label: 'Test Filter',
                            type: 'dropdown',
                            options: [
                                { value: 'test1', label: 'Test Option 1' }
                            ]
                        }
                    ]
                }
            ]
        }
    });
});
// router.get('/booking/filters/:service_id', 
//     param('service_id').isInt({ min: 1 }).withMessage('Valid service ID is required'),
//     handleValidationErrors,
//     tempCustomerController.getServiceFilters
// );

router.get('/search-history/:id', tempCustomerController.getAllSearchHistory);
module.exports = router;
