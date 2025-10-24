const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Access denied. No token provided.' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check token type and handle accordingly
        if (decoded.type === 'temp_customer') {
            // Temporary customer authentication
            const [tempCustomers] = await db.execute(`
                SELECT * FROM temp_customers 
                WHERE id = ? AND is_active = 1 AND is_mobile_verified = 1
            `, [decoded.id]);
            
            if (tempCustomers.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. Customer not found or not verified.'
                });
            }
            
            const tempCustomer = tempCustomers[0];
            
            // Check session token if provided
            if (decoded.sessionToken && tempCustomer.session_token !== decoded.sessionToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid session. Please login again.'
                });
            }
            
            req.user = {
                id: tempCustomer.id,
                userId: tempCustomer.id, // For backward compatibility
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
            
        } else if (decoded.type === 'customer') {
            // Full customer authentication (if you implement this later)
            const [customers] = await db.execute(`
                SELECT c.*, l.location_name, l.id as location_id
                FROM customers c
                LEFT JOIN preferred_locations l ON c.preferred_location_id = l.location_id
                WHERE c.id = ? AND c.is_verified = 1 AND c.is_active = 1
            `, [decoded.id]);
            
            if (customers.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. Customer not found or not verified.'
                });
            }
            
            req.user = {
                id: customers[0].id,
                userId: customers[0].id,
                name: customers[0].name,
                email: customers[0].email,
                mobile: customers[0].mobile,
                locationId: customers[0].location_id,
                locationName: customers[0].location_name,
                type: 'customer',
                isVerified: customers[0].is_verified
            };
            
        } else {
            // Service provider/admin authentication (existing logic)
            const [users] = await db.execute(`
                SELECT u.*, r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = ? AND u.is_active = true
            `, [decoded.userId || decoded.id]);
            
            if (users.length === 0) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid token. User not found or inactive.' 
                });
            }
            
            req.user = {
                id: users[0].id,
                userId: decoded.userId || decoded.id,
                username: decoded.username || users[0].username,
                name: users[0].name,
                roleId: decoded.roleId || users[0].role_id,
                roleName: users[0].role_name,
                type: 'service_provider',
                isActive: users[0].is_active
            };
        }
        
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
                message: 'Token expired.'
            });
        }
        
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

module.exports = authMiddleware;