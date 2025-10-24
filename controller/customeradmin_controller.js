const tempCustomerQueries = require('../queries/customeradmin_queries');

// GET /api/temp-customers - fetch all temp customers with optional filters (search, account_status)
const getTempCustomers = async (req, res) => {
  try {
    const { search = '', account_status = '' } = req.query;

    // Get customers list
    const customers = await tempCustomerQueries.getTempCustomersWithFilters(search, account_status);

    return res.status(200).json({
      success: true,
      message: 'Temp customers fetched successfully',
      data: customers
    });
  } catch (error) {
    console.error('Error fetching temp customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/temp-customers/:customerId/toggle-status - toggle account_status between 0 and 1
// const toggleTempCustomerAccountStatus = async (req, res) => {
//   try {
//     const { customerId } = req.params;

//     if (!customerId) {
//       return res.status(400).json({ success: false, message: 'Customer ID is required' });
//     }

//     const customer = await tempCustomerQueries.getTempCustomerById(customerId);

//     if (!customer) {
//       return res.status(404).json({ success: false, message: 'Customer not found' });
//     }

//     // Toggle status
//     const newStatus = customer.account_status === 0 ? 1 : 0;

//     // Update database
//     const updatedCustomer = await tempCustomerQueries.updateTempCustomerAccountStatus(customerId, newStatus);

//     return res.status(200).json({
//       success: true,
//       message: `Customer account ${newStatus === 0 ? 'activated' : 'suspended'} successfully`,
//       data: {
//         customerId,
//         previousStatus: customer.account_status,
//         newStatus,
//         customer: updatedCustomer
//       }
//     });
//   } catch (error) {
//     console.error('Error toggling customer account status:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };
const toggleTempCustomerAccountStatus = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }

    const customer = await tempCustomerQueries.getTempCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Toggle between active and inactive (skip suspended for toggle)
    let newStatus;
    if (customer.account_status === 'active') {
      newStatus = 'inactive';
    } else {
      newStatus = 'active';  // From inactive or suspended to active
    }

    // Update database
    const updatedCustomer = await tempCustomerQueries.updateTempCustomerAccountStatus(customerId, newStatus);

    return res.status(200).json({
      success: true,
      message: `Customer account ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: {
        customerId,
        // previousStatus: customer.account_status,
        newStatus,
        // customer: updatedCustomer
      }
    });
  } catch (error) {
    console.error('Error toggling customer account status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// PUT /api/temp-customers/:customerId/account-status - update specific account status
// const updateTempCustomerAccountStatus = async (req, res) => {
//   try {
//     const { customerId } = req.params;
//     const { account_status } = req.body;

//     if (!customerId) {
//       return res.status(400).json({ success: false, message: 'Customer ID is required' });
//     }

//     if (account_status === undefined || account_status === null) {
//       return res.status(400).json({ success: false, message: 'Account status is required' });
//     }

//     // Validate account_status value (should be 0 or 1)
//     if (![0, 1].includes(parseInt(account_status))) {
//       return res.status(400).json({ success: false, message: 'Account status must be 0 or 1' });
//     }

//     const customer = await tempCustomerQueries.getTempCustomerById(customerId);

//     if (!customer) {
//       return res.status(404).json({ success: false, message: 'Customer not found' });
//     }

//     // Update database
//     const updatedCustomer = await tempCustomerQueries.updateTempCustomerAccountStatus(customerId, parseInt(account_status));

//     return res.status(200).json({
//       success: true,
//       message: `Customer account status updated successfully`,
//       data: {
//         customerId,
//         previousStatus: customer.account_status,
//         newStatus: parseInt(account_status),
//         customer: updatedCustomer
//       }
//     });
//   } catch (error) {
//     console.error('Error updating customer account status:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };
const updateTempCustomerAccountStatus = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { account_status } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }

    if (account_status === undefined || account_status === null) {
      return res.status(400).json({ success: false, message: 'Account status is required' });
    }

    // Convert input to ENUM values
    let dbAccountStatus;
    
    // Handle different input formats
    if (account_status === 0 || account_status === '0' || account_status === 'inactive') {
      dbAccountStatus = 'inactive';
    } else if (account_status === 1 || account_status === '1' || account_status === 'active') {
      dbAccountStatus = 'active';
    } else if (account_status === 2 || account_status === '2' || account_status === 'suspended') {
      dbAccountStatus = 'suspended';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Account status must be 0/inactive, 1/active, or 2/suspended' 
      });
    }

    const customer = await tempCustomerQueries.getTempCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Update database with ENUM value
    const updatedCustomer = await tempCustomerQueries.updateTempCustomerAccountStatus(customerId, dbAccountStatus);

    return res.status(200).json({
      success: true,
      message: `Customer account status updated to ${dbAccountStatus} successfully`,
      data: {
        customerId,
        // previousStatus: customer.account_status,
        // newStatus: dbAccountStatus,
        // customer: updatedCustomer
      }
    });
  } catch (error) {
    console.error('Error updating customer account status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getTempCustomers,
  toggleTempCustomerAccountStatus,
  updateTempCustomerAccountStatus
};
