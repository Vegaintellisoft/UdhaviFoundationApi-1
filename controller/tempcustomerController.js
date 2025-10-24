// UPDATED tempCustomerController.js - Updated for new database structure
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const tempCustomerQueries = require('../queries/tempcustomerQueries');
const db = require('../database/connection');

// Generate random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate session token
const generateSessionToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Get client IP address
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// Updated signup/login with validation for supported services
const tempCustomerSignup = async (req, res) => {
    try {
        const { name, email, mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number is required'
            });
        }

        // Check if customer exists by mobile
        let existingCustomer = await tempCustomerQueries.getTempCustomerByMobile(mobile);

        if (existingCustomer) {
            // Login flow for existing customer
            const otp = generateOTP();
            const sessionToken = generateSessionToken();
            const otpExpiry = new Date(Date.now() + 40 * 1000);

            await tempCustomerQueries.updateTempCustomerOTP(existingCustomer.id, otp, otpExpiry, sessionToken);
            await tempCustomerQueries.logOTPAttempt(mobile, otp, 'existing_login', getClientIP(req), req.headers['user-agent']);

            console.log(`Login OTP for existing customer (${mobile}): ${otp}`);

            return res.status(200).json({
                success: true,
                message: 'Mobile number already registered. OTP sent for login verification.',
                data: {
                    customerId: existingCustomer.id,
                    sessionToken,
                    isExistingCustomer: true,
                    customerName: existingCustomer.name,
                    otp
                }
            });
        }

        // Signup flow for new customer, check duplicates by email and name
        if (email) {
            const existingByEmail = await tempCustomerQueries.getTempCustomerByEmail(email);
            if (existingByEmail) {
                return res.status(409).json({
                    success: false,
                    message: 'Email is already registered with another account.',
                    action: 'existing_email'
                });
            }
        }

        if (name) {
            const existingByName = await tempCustomerQueries.getTempCustomerByName(name);
            if (existingByName) {
                return res.status(409).json({
                    success: false,
                    message: 'Name is already taken. Please choose a different name.',
                    action: 'existing_name'
                });
            }
        }

        const otp = generateOTP();
        const sessionToken = generateSessionToken();
        const otpExpiry = new Date(Date.now() + 40 * 1000);

        const customerData = {
            name,
            email,
            mobile,
            otp,
            otpExpiry,
            sessionToken,
            isMobileVerified: false,
            is_active: 1
        };

        const customerId = await tempCustomerQueries.createTempCustomer(customerData);

        await tempCustomerQueries.logOTPAttempt(mobile, otp, 'new_signup', getClientIP(req), req.headers['user-agent']);

        console.log(`New customer OTP for ${mobile}: ${otp}`);

        return res.status(201).json({
            success: true,
            message: 'New customer registered! OTP sent successfully to your mobile number.',
            data: {
                customerId,
                sessionToken,
                isNewCustomer: true,
                otp
            }
        });

    } catch (error) {
        console.error('Signup/Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// EXISTING Customer Login (when mobile already exists)
const existingCustomerLogin = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number is required'
            });
        }

        // Check if customer exists in the system
        const existingCustomer = await tempCustomerQueries.getTempCustomerByMobile(mobile);
        
        if (!existingCustomer) {
            return res.status(404).json({
                success: false,
                message: 'Mobile number not found. Please register first.',
                action: 'register'
            });
        }

        // Check if customer account is active
        if (!existingCustomer.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Please contact support.'
            });
        }

        // Check rate limiting
        const recentOTPs = await tempCustomerQueries.getRecentOTPCount(mobile);
        if (recentOTPs >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Too many OTP requests. Please try again after 1 hour.'
            });
        }

        // Generate OTP and new session token for existing customer
        const otp = generateOTP();
        const sessionToken = generateSessionToken();
        const otpExpiry = new Date(Date.now() + 40 * 1000); // 40 seconds

        // Update existing customer with new OTP and session token
        await tempCustomerQueries.updateTempCustomerOTP(existingCustomer.id, otp, otpExpiry, sessionToken);

        // Log OTP attempt
        await tempCustomerQueries.logOTPAttempt(mobile, otp, 'existing_login', getClientIP(req), req.headers['user-agent']);

        console.log(`Login OTP for ${mobile}: ${otp}`);

        res.status(200).json({
            success: true,
            message: 'Welcome back! OTP sent successfully to your registered mobile number',
            data: {
                customerId: existingCustomer.id,
                sessionToken: sessionToken,
                customerName: existingCustomer.name,
                isExistingCustomer: true,
                otp: otp // Only for development testing
            }
        });

    } catch (error) {
        console.error('Existing customer login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// ENHANCED: Verify OTP with better last search handling for new structure
const verifyTempCustomerOTP = async (req, res) => {
    try {
        const { sessionToken, otp } = req.body;

        if (!sessionToken || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Session token and OTP are required'
            });
        }

        // Get temp customer by session token
        const customer = await tempCustomerQueries.getTempCustomerBySessionToken(sessionToken);
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Invalid session. Please request a new OTP.'
            });
        }

        // Check if OTP is valid and not expired
        if (customer.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        if (new Date() > new Date(customer.otp_expiry)) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Mark customer as mobile verified and clear OTP
        await tempCustomerQueries.verifyTempCustomer(customer.id);

        // Update last login timestamp
        try {
            await tempCustomerQueries.updateLastLogin(customer.id);
        } catch (loginError) {
            console.log('Last login update skipped:', loginError.message);
        }

        // Log successful verification
        await tempCustomerQueries.logOTPVerification(customer.mobile, otp, getClientIP(req));

        console.log('Customer data:', {
            id: customer.id,
            last_activity: customer.last_activity,
            last_login: customer.last_login,
            created_at: customer.created_at
        });
        
       // const isReturningCustomer = customer.last_activity !== null;
       const isReturningCustomer = customer.last_login !== null;
        console.log('isReturningCustomer:', isReturningCustomer);

        // For new customers, return simple success
        if (!isReturningCustomer) {
            console.log('NEW CUSTOMER - returning simple response');
            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully',
                data: {
                    customer: {
                        id: customer.id,
                        name: customer.name,
                        email: customer.email,
                        mobile: customer.mobile,
                        sessionToken: sessionToken,
                        isMobileVerified: true,
                        isReturningCustomer: false
                    }
                }
            });
        }

        console.log('RETURNING CUSTOMER - checking for search history');
        // For returning customers, get their last search with CURRENT service providers
  try {
    console.log('Getting last search with current providers for returning customer:', customer.id);
    const lastSearchWithProviders = await tempCustomerQueries.getServiceProvidersForLastSearch(customer.id);
    
    if (lastSearchWithProviders && lastSearchWithProviders.totalProviders > 0) {
        // Return SAME FORMAT as search API
        return res.status(200).json({
            success: true,
            message: `Found ${lastSearchWithProviders.totalProviders} service providers`,
            data: lastSearchWithProviders.serviceProviders,
            searchDetails: {
                latitude: lastSearchWithProviders.searchLocation.latitude,
                longitude: lastSearchWithProviders.searchLocation.longitude,
                radius: lastSearchWithProviders.searchLocation.radius,
                service_id: lastSearchWithProviders.searchedService.id,
              //  service_name: lastSearchWithProviders.searchedService.name,
                customer_id: customer.id,
                search_saved: true
            }
        });
    } else if (lastSearchWithProviders && lastSearchWithProviders.totalProviders === 0) {
        // Has search history but no providers found
        return res.status(200).json({
            success: true,
            message: 'Welcome back! No service providers found in your last search area.',
            data: [],
            searchDetails: {
                latitude: lastSearchWithProviders.searchLocation.latitude,
                longitude: lastSearchWithProviders.searchLocation.longitude,
                radius: lastSearchWithProviders.searchLocation.radius,
                service_id: lastSearchWithProviders.searchedService.id,
                //service_name: lastSearchWithProviders.searchedService.name,
                customer_id: customer.id,
                search_saved: true
            }
        });
    } else {
        // No search history at all - still show customer info
        return res.status(200).json({
            success: true,
            message: 'Welcome back! You can start a new search.',
            data: [],
            searchDetails: null,
            customerId: customer.id,
            customerName: customer.name
        });
    }
    
} catch (searchError) {
    console.error('Error getting last search results:', searchError);
    // Fallback for returning customers without search history
    return res.status(200).json({
        success: true,
        message: 'Welcome back! You can start a new search.',
        data: [],
        searchDetails: null,
        customerId: customer.id,
        customerName: customer.name
    });
}
  
} catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Save location (unchanged)
const saveTempCustomerLocation = async (req, res) => {
    try {
        const { latitude, longitude, address, locationType, accuracyMeters } = req.body;
        const customerId = req.user.id;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude or longitude values'
            });
        }

        const locationData = {
            customerId,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: address || null,
            locationType: locationType || 'gps',
            accuracyMeters: accuracyMeters || null
        };

        await tempCustomerQueries.saveTempCustomerLocation(locationData);
        await tempCustomerQueries.updateTempCustomerCurrentLocation(
            customerId, 
            latitude, 
            longitude, 
            address, 
            locationType
        );

        res.status(200).json({
            success: true,
            message: 'Location saved successfully',
            data: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                address: address,
                locationType: locationType
            }
        });

    } catch (error) {
        console.error('Save location error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get available services - UPDATED to only show supported services
const getAvailableServices = async (req, res) => {
    try {
        const services = await tempCustomerQueries.getActiveServices();
        
        res.status(200).json({
            success: true,
            message: 'Services retrieved successfully',
            data: services,
            supported_services: [1, 2, 3, 4, 5],
            service_names: {
                1: 'Cook',
                2: 'Baby Sitter',
                3: 'Elderly Care', 
                4: 'Gardening',
                5: 'Driving'
            }
        });

    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Save services - UPDATED with validation for supported services
const saveTempCustomerServices = async (req, res) => {
    try {
        const { serviceIds } = req.body;
        const customerId = req.user.id;

        if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one service must be selected'
            });
        }

        // Validate that all serviceIds are in the supported range
        const unsupportedServices = serviceIds.filter(id => ![1, 2, 3, 4, 5].includes(parseInt(id)));
        if (unsupportedServices.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Unsupported services: ${unsupportedServices.join(', ')}. Only services 1-5 are available.`,
                supported_services: [1, 2, 3, 4, 5]
            });
        }

        const validServices = await tempCustomerQueries.validateServiceIds(serviceIds);
        if (validServices.length !== serviceIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Some selected services are invalid or inactive'
            });
        }

        await tempCustomerQueries.saveTempCustomerServices(customerId, serviceIds);
        const customerProfile = await tempCustomerQueries.getTempCustomerProfile(customerId);

        res.status(200).json({
            success: true,
            message: 'Services saved successfully',
            data: customerProfile
        });

    } catch (error) {
        console.error('Save services error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get profile (unchanged)
const getTempCustomerProfile = async (req, res) => {
    try {
        const customerId = req.user.id;
        const customerProfile = await tempCustomerQueries.getTempCustomerProfile(customerId);
        
        if (!customerProfile) {
            return res.status(404).json({
                success: false,
                message: 'Customer profile not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: customerProfile
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Resend OTP (unchanged)
const resendTempCustomerOTP = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number is required'
            });
        }

        const recentOTPs = await tempCustomerQueries.getRecentOTPCount(mobile);
        if (recentOTPs >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Too many OTP requests. Please try again after 1 hour.'
            });
        }

        const customer = await tempCustomerQueries.getTempCustomerByMobile(mobile);
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found. Please register again.'
            });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 40 * 1000);
        await tempCustomerQueries.updateTempCustomerOTP(customer.id, otp, otpExpiry, customer.session_token);

        await tempCustomerQueries.logOTPAttempt(mobile, otp, 'resend', getClientIP(req), req.headers['user-agent']);
        console.log(`Resent OTP for ${mobile}: ${otp}`);

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
            data: {
                sessionToken: customer.session_token,
                otp: otp // Only for development testing
            }
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get preferred locations (unchanged)
const getPreferredLocations = async (req, res) => {
    try {
        const locations = await tempCustomerQueries.getPreferredLocations();
        
        res.status(200).json({
            success: true,
            message: 'Preferred locations retrieved successfully',
            data: locations
        });

    } catch (error) {
        console.error('Get preferred locations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get service filters - UPDATED with validation for supported services
const getServiceFilters = async (req, res) => {
    try {
        const { service_id } = req.params;

        // Validate service ID is supported
        if (!service_id || ![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
            return res.status(400).json({
                success: false,
                message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
            });
        }

        // Get service details first
        const serviceQuery = `
            SELECT service_id, name as service_name 
            FROM service_types 
            WHERE service_id = ? AND service_id IN (1,2,3,4,5) AND is_active = 1
        `;
        const [serviceResult] = await db.execute(serviceQuery, [service_id]);
        
        if (serviceResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not supported'
            });
        }

        // Get filters using the updated queries
        const filters = await tempCustomerQueries.getServiceFilters(service_id);
        
        // Format filters with options
        const formattedFilters = [];
        
        for (let filter of filters) {
            const filterData = {
                filter_id: filter.filter_id,
                filter_name: filter.filter_name,
                label: filter.filter_label,
                type: filter.filter_type,
                required: filter.is_required,
                section_title: filter.section_title,
                help_text: filter.help_text,
                options: []
            };

            if (['single_select', 'multi_select', 'dropdown'].includes(filter.filter_type)) {
                const options = await tempCustomerQueries.getFilterOptions(filter.filter_id);
                filterData.options = options.map(opt => ({
                    value: opt.option_value,
                    label: opt.option_label
                }));
            }

            formattedFilters.push(filterData);
        }

        // Group by sections
        const sections = [];
        let currentSection = null;
        
        for (let filter of formattedFilters) {
            if (filter.section_title && (!currentSection || currentSection.title !== filter.section_title)) {
                currentSection = {
                    title: filter.section_title,
                    help_text: filter.help_text,
                    filters: []
                };
                sections.push(currentSection);
            }
            
            if (currentSection) {
                currentSection.filters.push(filter);
            } else {
                sections.push({
                    title: null,
                    filters: [filter]
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Service filters retrieved successfully',
            data: {
                service: serviceResult[0],
                sections: sections,
                total_filters: formattedFilters.length,
                supported_services: [1, 2, 3, 4, 5]
            }
        });

    } catch (error) {
        console.error('Get service filters error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllSearchHistory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID is required'
            });
        }

        // Validate if customer exists
        const customer = await tempCustomerQueries.getTempCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Get all search history for the customer
        const searchHistory = await tempCustomerQueries.getAllSearchHistory(id);

        if (!searchHistory || searchHistory.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No search history found for this customer',
                data: {
                    customerId: id,
                    searchHistory: [],
                    totalSearches: 0
                }
            });
        }

        // Return simplified response
        res.status(200).json({
            success: true,
            message: `Found ${searchHistory.length} search records`,
            data: {
                customerId: id,
                searchHistory: searchHistory, // This now contains only lat, long, service data
                totalSearches: searchHistory.length
            }
        });

    } catch (error) {
        console.error('Get all search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


module.exports = {
getAllSearchHistory,
    getServiceFilters,
    existingCustomerLogin,       
    verifyTempCustomerOTP,       
    saveTempCustomerLocation,
    getAvailableServices,
    saveTempCustomerServices,
    getTempCustomerProfile,
    resendTempCustomerOTP,
    getPreferredLocations,
    tempCustomerSignup
};
