// UPDATED routes/simpleRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const SimpleController = require('../controller/searchservice_Controller');

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

// Search validation
const searchValidation = [
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude is required (-90 to 90)'),
    
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude is required (-180 to 180)'),
    
    body('radius')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Radius must be between 1-50 km'),
    
    body('service_id')
        .isInt({ min: 1 })
        .withMessage('Valid service ID is required'),
    
    body('customer_id')
        .isInt({ min: 1 })
        .withMessage('Valid customer ID is required')
];

// POST /api/simple/search - Enhanced with validation
router.post('/search', 
    searchValidation,
    handleValidationErrors,
    SimpleController.searchProviders
);

// GET /api/simple/services - Get all available services
router.get('/services', SimpleController.getServices);

// NEW: GET /api/simple/search-history/:customer_id - Get customer's search history
router.get('/search-history/:customer_id', SimpleController.getSearchHistory);

// NEW: POST /api/simple/quick-search - Quick search for returning customers
router.post('/quick-search',
    [
        body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { customer_id } = req.body;
            const tempCustomerQueries = require('../queries/tempcustomerQueries');
            
            // Get customer's last search
            const lastSearch = await tempCustomerQueries.getLastSearchHistory(customer_id);
            
            if (!lastSearch) {
                return res.status(404).json({
                    success: false,
                    message: 'No previous search found for this customer',
                    action: 'new_search_required'
                });
            }

            // Perform fresh search using last search parameters
            const searchParams = {
                latitude: lastSearch.search_latitude,
                longitude: lastSearch.search_longitude,  
                radius: lastSearch.search_radius,
                service_id: lastSearch.service_id,
                customer_id: customer_id
            };

            // Delegate to main search function
            req.body = searchParams;
            return SimpleController.searchProviders(req, res);

        } catch (error) {
            console.error('Quick search error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

module.exports = router;