const jwt = require('jsonwebtoken');
const tempCustomerQueries = require('../queries/tempcustomerQueries');

const tempCustomerAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if token is for temporary customer
        if (decoded.type !== 'temp_customer') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type. Temporary customer access required.'
            });
        }

        // Verify temp customer exists and is active
        const tempCustomer = await tempCustomerQueries.getTempCustomerById(decoded.id);
        
        if (!tempCustomer) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Customer not found.'
            });
        }

        if (!tempCustomer.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is inactive.'
            });
        }

        if (!tempCustomer.is_mobile_verified) {
            return res.status(401).json({
                success: false,
                message: 'Mobile number not verified. Please verify your mobile number.'
            });
        }

        // Check session token if provided
        if (decoded.sessionToken && tempCustomer.session_token !== decoded.sessionToken) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session. Please login again.'
            });
        }

        // Update last activity
        await tempCustomerQueries.updateTempCustomerActivity(decoded.id);
        
        // Set user info for next middleware
        req.user = {
            id: tempCustomer.id,
            name: tempCustomer.name,
            email: tempCustomer.email,
            mobile: tempCustomer.mobile,
            sessionToken: tempCustomer.session_token,
            type: 'temp_customer',
            isMobileVerified: tempCustomer.is_mobile_verified,
            currentLatitude: tempCustomer.current_latitude,
            currentLongitude: tempCustomer.current_longitude,
            selectedAddress: tempCustomer.selected_address,
            locationType: tempCustomer.location_type
        };
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }
        
        console.error('Temp customer auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

module.exports = tempCustomerAuth;