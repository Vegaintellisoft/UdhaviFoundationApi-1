// routes/customeradmin_routes.js
const express = require('express');
const router = express.Router();

// Import controller
const { 
    getTempCustomers, 
    updateTempCustomerAccountStatus, 
    toggleTempCustomerAccountStatus 
} = require('../controller/customeradmin_controller');

// GET /api/temp-customers - Get all temp customers with pagination and filters
router.get('/temp-customers', getTempCustomers);

// PUT /api/temp-customers/:customerId/account-status - Update specific account status
router.put('/temp-customers/:customerId/account-status', updateTempCustomerAccountStatus);

// PATCH /api/temp-customers/:customerId/toggle-status - Toggle account status (0↔1)
router.patch('/temp-customers/:customerId/toggle-status', toggleTempCustomerAccountStatus);

module.exports = router;