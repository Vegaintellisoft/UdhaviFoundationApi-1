const db = require('../database/connection');

// Create temporary customer
const createTempCustomer = async (customerData) => {
    try {
        const { name, email, mobile, otp, otpExpiry, sessionToken, isMobileVerified } = customerData;
        console.log('=== CREATING CUSTOMER IN DB ===');
        console.log('Data to insert:', { name, email, mobile });
        
        const query = `
            INSERT INTO temp_customers 
            (name, email, mobile, otp, otp_expiry, session_token, is_mobile_verified, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `;
        const [result] = await db.execute(query, [
            name, email, mobile, otp, otpExpiry, sessionToken, isMobileVerified
        ]);
        
        console.log('Customer inserted with ID:', result.insertId);
        return result.insertId;
    } catch (error) {
        console.error('Create temp customer query error:', error);
        throw error;
    }
};

// Get temporary customer by mobile
const getTempCustomerByMobile = async (mobile) => {
    try {
        const query = 'SELECT * FROM temp_customers WHERE mobile = ? AND is_active = 1';
        const [rows] = await db.execute(query, [mobile]);
        return rows[0];
    } catch (error) {
        console.error('Get temp customer by mobile query error:', error);
        throw error;
    }
};

// Get temporary customer by session token
const getTempCustomerBySessionToken = async (sessionToken) => {
    try {
        const query = 'SELECT * FROM temp_customers WHERE session_token = ? AND is_active = 1';
        const [rows] = await db.execute(query, [sessionToken]);
        return rows[0];
    } catch (error) {
        console.error('Get temp customer by session token query error:', error);
        throw error;
    }
};

// Get temporary customer by ID
const getTempCustomerById = async (customerId) => {
    try {
        const query = 'SELECT * FROM temp_customers WHERE id = ? AND is_active = 1';
        const [rows] = await db.execute(query, [customerId]);
        return rows[0];
    } catch (error) {
        console.error('Get temp customer by ID query error:', error);
        throw error;
    }
};

const getTempCustomerByEmail = async (email) => {
    const query = 'SELECT * FROM temp_customers WHERE email = ? LIMIT 1';
    const [rows] = await db.execute(query, [email]);
    return rows[0];
};

const getTempCustomerByName = async (name) => {
    const query = 'SELECT * FROM temp_customers WHERE name = ? LIMIT 1';
    const [rows] = await db.execute(query, [name]);
    return rows[0];
}

// Update temporary customer OTP
const updateTempCustomerOTP = async (customerId, otp, otpExpiry, sessionToken) => {
    try {
        const query = `
            UPDATE temp_customers 
            SET otp = ?, otp_expiry = ?, session_token = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        await db.execute(query, [otp, otpExpiry, sessionToken, customerId]);
    } catch (error) {
        console.error('Update temp customer OTP query error:', error);
        throw error;
    }
};

// Update temporary customer info
const updateTempCustomerInfo = async (customerId, name, email) => {
    try {
        const query = 'UPDATE temp_customers SET name = ?, email = ?, updated_at = NOW() WHERE id = ?';
        await db.execute(query, [name, email, customerId]);
    } catch (error) {
        console.error('Update temp customer info query error:', error);
        throw error;
    }
};

// Verify temporary customer and clear OTP
const verifyTempCustomer = async (customerId) => {
    try {
        const query = `
            UPDATE temp_customers 
            SET is_mobile_verified = 1, otp = NULL, otp_expiry = NULL, updated_at = NOW() 
            WHERE id = ?
        `;
        await db.execute(query, [customerId]);
    } catch (error) {
        console.error('Verify temp customer query error:', error);
        throw error;
    }
};

// Get recent OTP count for rate limiting
const getRecentOTPCount = async (mobile) => {
    try {
        const query = `
            SELECT COUNT(*) as count 
            FROM temp_customer_otp_logs 
            WHERE mobile = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        `;
        const [rows] = await db.execute(query, [mobile]);
        return rows[0].count;
    } catch (error) {
        console.error('Get recent OTP count query error:', error);
        throw error;
    }
};

// Log OTP attempt
const logOTPAttempt = async (mobile, otp, actionType, ipAddress, userAgent) => {
    try {
        const query = `
            INSERT INTO temp_customer_otp_logs 
            (mobile, otp, action_type, ip_address, user_agent, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        await db.execute(query, [mobile, otp, actionType, ipAddress, userAgent]);
    } catch (error) {
        console.error('Log OTP attempt query error:', error);
        throw error;
    }
};

// Log OTP verification
const logOTPVerification = async (mobile, otp, ipAddress) => {
    try {
        const query = `
            UPDATE temp_customer_otp_logs 
            SET is_verified = 1, verified_at = NOW() 
            WHERE mobile = ? AND otp = ? 
            ORDER BY created_at DESC LIMIT 1
        `;
        await db.execute(query, [mobile, otp]);
    } catch (error) {
        console.error('Log OTP verification query error:', error);
        throw error;
    }
};

// Save temporary customer location
const saveTempCustomerLocation = async (locationData) => {
    try {
        const { customerId, latitude, longitude, address, locationType, accuracyMeters } = locationData;
        
        // Mark all previous locations as not current
        await db.execute(
            'UPDATE temp_customer_locations SET is_current = 0 WHERE temp_customer_id = ?',
            [customerId]
        );
        
        // Insert new location
        const query = `
            INSERT INTO temp_customer_locations 
            (temp_customer_id, latitude, longitude, address, location_source, accuracy_meters, is_current, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
        `;
        await db.execute(query, [
            customerId, latitude, longitude, address, locationType, accuracyMeters
        ]);
    } catch (error) {
        console.error('Save temp customer location query error:', error);
        throw error;
    }
};

// Update customer's current location in main table
const updateTempCustomerCurrentLocation = async (customerId, latitude, longitude, address, locationType) => {
    try {
        const query = `
            UPDATE temp_customers 
            SET current_latitude = ?, current_longitude = ?, selected_address = ?, 
                location_type = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        await db.execute(query, [latitude, longitude, address, locationType, customerId]);
    } catch (error) {
        console.error('Update temp customer current location query error:', error);
        throw error;
    }
};

// Get active services from your existing service_types table - UPDATED for new structure
const getActiveServices = async () => {
    try {
        const query = `
            SELECT service_id as id, name, description, is_active 
            FROM service_types 
            WHERE service_id IN (1,2,3,4,5) AND is_active = 1 
            ORDER BY display_order ASC, name ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        console.error('Get active services query error:', error);
        throw error;
    }
};

// Validate service IDs - UPDATED for new structure
const validateServiceIds = async (serviceIds) => {
    try {
        const placeholders = serviceIds.map(() => '?').join(',');
        const query = `
            SELECT service_id as id 
            FROM service_types 
            WHERE service_id IN (${placeholders}) 
            AND service_id IN (1,2,3,4,5) 
            AND is_active = 1
        `;
        const [rows] = await db.execute(query, serviceIds);
        return rows;
    } catch (error) {
        console.error('Validate service IDs query error:', error);
        throw error;
    }
};

// Save temporary customer services
const saveTempCustomerServices = async (customerId, serviceIds) => {
    try {
        // First, delete existing service preferences
        const deleteQuery = 'DELETE FROM temp_customer_services WHERE temp_customer_id = ?';
        await db.execute(deleteQuery, [customerId]);

        // Then, insert new service preferences with priority order
        if (serviceIds.length > 0) {
            const insertValues = serviceIds.map((serviceId, index) => 
                `(${customerId}, ${serviceId}, ${index + 1}, NOW())`
            ).join(',');
            
            const insertQuery = `
                INSERT INTO temp_customer_services (temp_customer_id, service_type_id, priority_order, created_at) 
                VALUES ${insertValues}
            `;
            await db.execute(insertQuery);
        }
    } catch (error) {
        console.error('Save temp customer services query error:', error);
        throw error;
    }
};

// Get temporary customer profile with services and location (UPDATED)
const getTempCustomerProfile = async (customerId) => {
    try {
        const query = `
            SELECT 
                tc.id,
                tc.name,
                tc.email,
                tc.mobile,
                tc.is_mobile_verified,
                tc.current_latitude,
                tc.current_longitude,
                tc.selected_address,
                tc.location_type,
                tc.session_token,
                tc.last_activity,
                tc.last_login,
                tc.created_at,
                pl.location_name as preferred_location_name
            FROM temp_customers tc
            LEFT JOIN preferred_locations pl ON tc.preferred_location_id = pl.location_id
            WHERE tc.id = ? AND tc.is_active = 1
        `;
        const [customerRows] = await db.execute(query, [customerId]);
        
        if (customerRows.length === 0) {
            return null;
        }
        
        const customer = customerRows[0];
        
        // Get selected services separately (UPDATED for new structure)
        const servicesQuery = `
            SELECT 
                st.service_id,
                st.name as service_name,
                st.description as service_description,
                tcs.priority_order as priority
            FROM temp_customer_services tcs
            JOIN service_types st ON tcs.service_type_id = st.service_id
            WHERE tcs.temp_customer_id = ? AND st.service_id IN (1,2,3,4,5)
            ORDER BY tcs.priority_order
        `;
        const [servicesRows] = await db.execute(servicesQuery, [customerId]);
        
        customer.selected_services = servicesRows;
        
        return customer;
    } catch (error) {
        console.error('Get temp customer profile query error:', error);
        throw error;
    }
};

// Update last login timestamp
const updateLastLogin = async (customerId) => {
    try {
        const query = `
            UPDATE temp_customers 
            SET last_login = NOW(), updated_at = NOW() 
            WHERE id = ?
        `;
        await db.execute(query, [customerId]);
    } catch (error) {
        console.error('Update last login query error:', error);
        throw error;
    }
};

// Save search history
const saveSearchHistory = async (searchData) => {
    try {
        const query = `
            INSERT INTO temp_customer_search_history 
            (temp_customer_id, search_latitude, search_longitude, search_radius, 
             service_id, service_name, providers_found, search_timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        // Ensure providers_found is properly stringified
        const providersJson = typeof searchData.providers_found === 'string' 
            ? searchData.providers_found 
            : JSON.stringify(searchData.providers_found);
            
        await db.execute(query, [
            searchData.temp_customer_id, 
            searchData.search_latitude, 
            searchData.search_longitude, 
            searchData.search_radius,
            searchData.service_id, 
            searchData.service_name, 
            providersJson
        ]);
        
        console.log('Search history saved successfully');
    } catch (error) {
        console.error('Save search history query error:', error);
        throw error;
    }
};

// Get last search history - UPDATED for new structure
const getLastSearchHistory = async (customerId) => {
    try {
        const query = `
            SELECT 
                temp_customer_id,
                search_latitude,
                search_longitude,
                search_radius,
                service_id,
                service_name,
                providers_found,
                search_timestamp,
                DATE_FORMAT(search_timestamp, '%Y-%m-%d %H:%i:%s') as formatted_search_time
            FROM temp_customer_search_history 
            WHERE temp_customer_id = ? 
            AND service_id IN (1,2,3,4,5)
            ORDER BY search_timestamp DESC 
            LIMIT 1
        `;
        const [rows] = await db.execute(query, [customerId]);
        
        if (rows.length === 0) {
            return null;
        }
        
        const searchResult = rows[0];
        let providers = [];
        
        // Debug: Log the raw providers_found data
        console.log('Raw providers_found from DB:', searchResult.providers_found);
        
        // Try to parse providers_found
        if (searchResult.providers_found) {
            try {
                if (typeof searchResult.providers_found === 'string') {
                    providers = JSON.parse(searchResult.providers_found);
                } else {
                    providers = searchResult.providers_found;
                }
                
                if (!Array.isArray(providers)) {
                    console.log('Providers is not an array:', typeof providers);
                    providers = [];
                }
            } catch (parseError) {
                console.log('JSON parse error for providers_found:', parseError.message);
                console.log('Raw data that failed to parse:', searchResult.providers_found);
                providers = [];
            }
        }
        
        return {
            searchDetails: {
                location: {
                    latitude: parseFloat(searchResult.search_latitude),
                    longitude: parseFloat(searchResult.search_longitude),
                    radius: searchResult.search_radius
                },
                service: {
                    id: searchResult.service_id,
                    name: searchResult.service_name
                },
                timestamp: searchResult.search_timestamp,
                formattedTime: searchResult.formatted_search_time
            },
            providers: providers,
            totalProviders: providers.length
        };
    } catch (error) {
        console.error('Get last search history query error:', error);
        throw error;
    }
};

// UPDATED: Get service providers by location using new table structure
const getServiceProvidersByLocation = async (latitude, longitude, serviceId, radiusKm = 15) => {
    try {
        // Validate service ID
        if (![1, 2, 3, 4, 5].includes(parseInt(serviceId))) {
            console.log('Invalid service ID:', serviceId);
            return [];
        }

        const query = `
            SELECT 
                psc.provider_id as service_provider_id,
                ai.full_name as service_provider_name,
                COALESCE(psc.latitude, 13.0827) as latitude,
                COALESCE(psc.longitude, 80.2707) as longitude,
                psc.service_id,
                st.name as service_name,
                CASE 
                    WHEN psc.status = 'active' THEN 'available'
                    ELSE 'inactive'
                END as availability_status,
                CASE 
                    WHEN psc.status = 'active' THEN 'Available'
                    ELSE 'Not Available'
                END as availability,
                CASE 
                    WHEN psc.status = 'active' THEN 'active'
                    ELSE 'inactive'
                END as status,
                (6371 * acos(cos(radians(?)) * cos(radians(COALESCE(psc.latitude, 13.0827))) * 
                 cos(radians(COALESCE(psc.longitude, 80.2707)) - radians(?)) + sin(radians(?)) * 
                 sin(radians(COALESCE(psc.latitude, 13.0827))))) AS distance_km
            FROM provider_service_configurations psc
            JOIN account_information ai ON psc.provider_id = ai.registration_id
            JOIN service_types st ON psc.service_id = st.service_id
            WHERE psc.service_id = ?
            AND psc.service_id IN (1,2,3,4,5)
            AND psc.status = 'active'
            AND psc.is_active = 1
            HAVING distance_km < ?
            ORDER BY distance_km
        `;
        const [rows] = await db.execute(query, [latitude, longitude, latitude, serviceId, radiusKm]);
        
        // Format the distance to 2 decimal places
        return rows.map(row => ({
            ...row,
            distance_km: parseFloat(row.distance_km).toFixed(2)
        }));
    } catch (error) {
        console.error('Get service providers by location query error:', error);
        throw error;
    }
};

// UPDATED: Get service providers for multiple services using new table structure
const getServiceProvidersForServices = async (latitude, longitude, serviceIds, radiusKm = 5) => {
    try {
        if (!serviceIds || serviceIds.length === 0) return [];
        
        // Filter to only supported service IDs
        const supportedServiceIds = serviceIds.filter(id => [1, 2, 3, 4, 5].includes(parseInt(id)));
        if (supportedServiceIds.length === 0) return [];
        
        const placeholders = supportedServiceIds.map(() => '?').join(',');
        const query = `
            SELECT 
                psc.provider_id as service_provider_id,
                ai.full_name as service_provider_name,
                COALESCE(psc.latitude, 13.0827) as latitude,
                COALESCE(psc.longitude, 80.2707) as longitude,
                psc.service_id,
                st.name as service_name,
                psc.base_rate,
                psc.base_rate_type,
                CASE 
                    WHEN psc.status = 'active' THEN 'available'
                    ELSE 'inactive'
                END as availability_status,
                CASE 
                    WHEN psc.status = 'active' THEN 'Available'
                    ELSE 'Not Available'
                END as availability,
                (6371 * acos(cos(radians(?)) * cos(radians(COALESCE(psc.latitude, 13.0827))) * 
                 cos(radians(COALESCE(psc.longitude, 80.2707)) - radians(?)) + sin(radians(?)) * 
                 sin(radians(COALESCE(psc.latitude, 13.0827))))) AS distance
            FROM provider_service_configurations psc
            JOIN account_information ai ON psc.provider_id = ai.registration_id
            JOIN service_types st ON psc.service_id = st.service_id
            WHERE psc.service_id IN (${placeholders})
            AND psc.status = 'active'
            AND psc.is_active = 1
            HAVING distance < ?
            ORDER BY psc.service_id, distance
        `;
        const [rows] = await db.execute(query, [latitude, longitude, latitude, ...supportedServiceIds, radiusKm]);
        return rows;
    } catch (error) {
        console.error('Get service providers for services query error:', error);
        throw error;
    }
};

// Get temporary customer summary by mobile
const getTempCustomerSummaryByMobile = async (mobile) => {
    try {
        const query = `
            SELECT 
                id, name, email, mobile, is_mobile_verified, is_active,
                current_latitude, current_longitude, selected_address,
                last_activity, last_login, created_at
            FROM temp_customers 
            WHERE mobile = ? AND is_active = 1
        `;
        const [rows] = await db.execute(query, [mobile]);
        return rows[0];
    } catch (error) {
        console.error('Get temp customer summary query error:', error);
        throw error;
    }
};

// Get preferred locations from your existing table
const getPreferredLocations = async () => {
    try {
        const query = `
            SELECT location_id as id, location_name, status as is_active 
            FROM preferred_locations 
            WHERE status = 'Active' 
            ORDER BY location_name
        `;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        console.error('Get preferred locations query error:', error);
        throw error;
    }
};

// Get customer location history
const getTempCustomerLocationHistory = async (customerId) => {
    try {
        const query = `
            SELECT latitude, longitude, address, location_source, accuracy_meters, is_current, created_at
            FROM temp_customer_locations 
            WHERE temp_customer_id = ? 
            ORDER BY created_at DESC
        `;
        const [rows] = await db.execute(query, [customerId]);
        return rows;
    } catch (error) {
        console.error('Get temp customer location history query error:', error);
        throw error;
    }
};

// Get customer's current location
const getTempCustomerCurrentLocation = async (customerId) => {
    try {
        const query = `
            SELECT latitude, longitude, address, location_source, accuracy_meters, created_at
            FROM temp_customer_locations 
            WHERE temp_customer_id = ? AND is_current = 1
            ORDER BY created_at DESC LIMIT 1
        `;
        const [rows] = await db.execute(query, [customerId]);
        return rows[0];
    } catch (error) {
        console.error('Get temp customer current location query error:', error);
        throw error;
    }
};

// Update temp customer activity timestamp
const updateTempCustomerActivity = async (customerId) => {
    try {
        const query = 'UPDATE temp_customers SET last_activity = NOW() WHERE id = ?';
        await db.execute(query, [customerId]);
    } catch (error) {
        console.error('Update temp customer activity query error:', error);
        throw error;
    }
};

// Set preferred location for temp customer
const setTempCustomerPreferredLocation = async (customerId, locationId) => {
    try {
        const query = `
            UPDATE temp_customers 
            SET preferred_location_id = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        await db.execute(query, [locationId, customerId]);
    } catch (error) {
        console.error('Set temp customer preferred location query error:', error);
        throw error;
    }
};

// Get temp customers by location (for analytics/admin)
const getTempCustomersByLocation = async (latitude, longitude, radiusKm = 10) => {
    try {
        const query = `
            SELECT 
                id, name, mobile, current_latitude, current_longitude, 
                selected_address, created_at,
                (6371 * acos(cos(radians(?)) * cos(radians(current_latitude)) 
                * cos(radians(current_longitude) - radians(?)) 
                + sin(radians(?)) * sin(radians(current_latitude)))) AS distance
            FROM temp_customers 
            WHERE current_latitude IS NOT NULL 
            AND current_longitude IS NOT NULL 
            AND is_active = 1
            HAVING distance < ?
            ORDER BY distance
        `;
        const [rows] = await db.execute(query, [latitude, longitude, latitude, radiusKm]);
        return rows;
    } catch (error) {
        console.error('Get temp customers by location query error:', error);
        throw error;
    }
};

// Get temp customer statistics
const getTempCustomerStats = async () => {
    try {
        const queries = [
            'SELECT COUNT(*) as total_temp_customers FROM temp_customers WHERE is_active = 1',
            'SELECT COUNT(*) as verified_customers FROM temp_customers WHERE is_mobile_verified = 1 AND is_active = 1',
            'SELECT COUNT(*) as customers_with_location FROM temp_customers WHERE current_latitude IS NOT NULL AND is_active = 1',
            'SELECT COUNT(*) as customers_with_services FROM temp_customers tc JOIN temp_customer_services tcs ON tc.id = tcs.temp_customer_id WHERE tc.is_active = 1',
            'SELECT COUNT(*) as todays_registrations FROM temp_customers WHERE DATE(created_at) = CURDATE() AND is_active = 1'
        ];

        const [
            [totalResult],
            [verifiedResult], 
            [locationResult],
            [servicesResult],
            [todayResult]
        ] = await Promise.all(queries.map(query => db.execute(query)));

        return {
            total_temp_customers: totalResult[0].total_temp_customers,
            verified_customers: verifiedResult[0].verified_customers,
            customers_with_location: locationResult[0].customers_with_location,
            customers_with_services: servicesResult[0].customers_with_services,
            todays_registrations: todayResult[0].todays_registrations
        };
    } catch (error) {
        console.error('Get temp customer stats query error:', error);
        throw error;
    }
};

// Cleanup old temp customer data
const cleanupOldTempCustomers = async (daysOld = 30) => {
    try {
        const query = `
            UPDATE temp_customers 
            SET is_active = 0 
            WHERE is_mobile_verified = 0 
            AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const [result] = await db.execute(query, [daysOld]);
        return result.affectedRows;
    } catch (error) {
        console.error('Cleanup old temp customers query error:', error);
        throw error;
    }
};

const getLastSearchWithDetails = async (customerId) => {
    try {
        const query = `
            SELECT 
                tcsh.temp_customer_id,
                tcsh.search_latitude,
                tcsh.search_longitude,
                tcsh.search_radius,
                tcsh.service_id,
                tcsh.service_name,
                tcsh.providers_found,
                tcsh.search_timestamp,
                COUNT(JSON_EXTRACT(tcsh.providers_found, '$')) as provider_count
            FROM temp_customer_search_history tcsh
            WHERE tcsh.temp_customer_id = ? 
            AND tcsh.service_id IN (1,2,3,4,5)
            ORDER BY tcsh.search_timestamp DESC 
            LIMIT 1
        `;
        const [rows] = await db.execute(query, [customerId]);
        return rows[0];
    } catch (error) {
        console.error('Get last search with details query error:', error);
        throw error;
    }
};

const getCustomerWithLastSearch = async (customerId) => {
    try {
        // Get basic customer info
        const customerQuery = `
            SELECT 
                tc.id,
                tc.name,
                tc.email,
                tc.mobile,
                tc.is_mobile_verified,
                tc.current_latitude,
                tc.current_longitude,
                tc.selected_address,
                tc.location_type,
                tc.session_token,
                tc.last_activity,
                tc.last_login,
                tc.created_at
            FROM temp_customers tc
            WHERE tc.id = ? AND tc.is_active = 1
        `;
        const [customerRows] = await db.execute(customerQuery, [customerId]);
        
        if (customerRows.length === 0) {
            return null;
        }
        
        const customer = customerRows[0];
        
        // Get last search details
        const lastSearch = await getLastSearchWithDetails(customerId);
        
        if (lastSearch) {
            customer.lastSearch = {
                searchLocation: {
                    latitude: lastSearch.search_latitude,
                    longitude: lastSearch.search_longitude,
                    radius: lastSearch.search_radius
                },
                searchService: {
                    id: lastSearch.service_id,
                    name: lastSearch.service_name
                },
                searchTimestamp: lastSearch.search_timestamp,
                providerCount: lastSearch.provider_count || 0,
                providers: []
            };
            
            // Parse providers safely
            if (lastSearch.providers_found) {
                try {
                    const providers = JSON.parse(lastSearch.providers_found);
                    customer.lastSearch.providers = Array.isArray(providers) ? providers : [];
                } catch (parseError) {
                    console.log('Error parsing providers_found:', parseError.message);
                    customer.lastSearch.providers = [];
                }
            }
        }
        
        return customer;
    } catch (error) {
        console.error('Get customer with last search query error:', error);
        throw error;
    }
};

const getFormattedLastSearch = async (customerId) => {
    try {
        const query = `
            SELECT 
                search_latitude,
                search_longitude, 
                search_radius,
                service_id,
                service_name,
                providers_found,
                search_timestamp,
                DATE_FORMAT(search_timestamp, '%Y-%m-%d %H:%i:%s') as formatted_search_time
            FROM temp_customer_search_history 
            WHERE temp_customer_id = ? 
            AND service_id IN (1,2,3,4,5)
            ORDER BY search_timestamp DESC 
            LIMIT 1
        `;
        const [rows] = await db.execute(query, [customerId]);
        
        if (rows.length === 0) {
            return null;
        }
        
        const searchResult = rows[0];
        let providers = [];
        
        // Safely parse providers
        if (searchResult.providers_found) {
            try {
                providers = JSON.parse(searchResult.providers_found);
                if (!Array.isArray(providers)) {
                    providers = [];
                }
            } catch (parseError) {
                console.log('Failed to parse providers:', parseError.message);
                providers = [];
            }
        }
        
        return {
            searchDetails: {
                location: {
                    latitude: searchResult.search_latitude,
                    longitude: searchResult.search_longitude,
                    radius: searchResult.search_radius
                },
                service: {
                    id: searchResult.service_id,
                    name: searchResult.service_name
                },
                timestamp: searchResult.search_timestamp,
                formattedTime: searchResult.formatted_search_time
            },
            providers: providers,
            totalProviders: providers.length
        };
    } catch (error) {
        console.error('Get formatted last search query error:', error);
        throw error;
    }
};

const getFreshServiceProviders = async (customerId, latitude, longitude, serviceId, radiusKm = 15) => {
    try {
        // Validate service ID
        if (![1, 2, 3, 4, 5].includes(parseInt(serviceId))) {
            console.log('Invalid service ID for fresh search:', serviceId);
            return [];
        }

        // Get fresh providers
        const providers = await getServiceProvidersByLocation(latitude, longitude, serviceId, radiusKm);
        
        if (providers.length > 0) {
            // Get service name
            const serviceQuery = 'SELECT name FROM service_types WHERE service_id = ? AND service_id IN (1,2,3,4,5)';
            const [serviceRows] = await db.execute(serviceQuery, [serviceId]);
            const serviceName = serviceRows[0]?.name || 'Unknown Service';
            
            // Save this search for future reference
            await saveSearchHistory({
                temp_customer_id: customerId,
                search_latitude: latitude,
                search_longitude: longitude,
                search_radius: radiusKm,
                service_id: serviceId,
                service_name: serviceName,
                providers_found: providers
            });
        }
        
        return providers;
    } catch (error) {
        console.error('Get fresh service providers error:', error);
        throw error;
    }
};

// Get service filters for booking system - UPDATED for new structure
const getServiceFilters = async (serviceId) => {
    try {
        // Validate service ID
        if (![1, 2, 3, 4, 5].includes(parseInt(serviceId))) {
            console.log('Invalid service ID for filters:', serviceId);
            return [];
        }

        const query = `
            SELECT 
                sf.filter_id,
                sf.filter_name,
                sf.filter_label,
                sf.filter_type,
                sf.is_required,
                sf.display_order,
                sf.section_title,
                sf.help_text
            FROM service_filters sf
            WHERE sf.service_id = ? AND sf.service_id IN (1,2,3,4,5) AND sf.is_active = 1
            ORDER BY sf.display_order ASC
        `;
        const [rows] = await db.execute(query, [serviceId]);
        return rows;
    } catch (error) {
        console.error('Get service filters query error:', error);
        throw error;
    }
};

// Get filter options - UPDATED for new structure
const getFilterOptions = async (filterId) => {
    try {
        const query = `
            SELECT sfo.option_value, sfo.option_label, sfo.display_order
            FROM service_filter_options sfo
            JOIN service_filters sf ON sfo.filter_id = sf.filter_id
            WHERE sfo.filter_id = ? 
            AND sf.service_id IN (1,2,3,4,5)
            AND sfo.is_active = 1
            ORDER BY sfo.display_order ASC
        `;
        const [rows] = await db.execute(query, [filterId]);
        return rows;
    } catch (error) {
        console.error('Get filter options query error:', error);
        throw error;
    }
};

const getAllSearchHistory = async (customerId) => {
    try {
        const query = `
            SELECT
                id,
                search_latitude,
                search_longitude,
                service_id,
                service_name,
                search_timestamp
            FROM temp_customer_search_history
            WHERE temp_customer_id = ?
            ORDER BY search_timestamp DESC
        `;
        
        const [rows] = await db.execute(query, [customerId]);
        
        if (rows.length === 0) {
            return [];
        }

        // Process each search record - return only lat, long, service data
        const searchHistory = rows.map(record => {
            return {
                searchId: record.id,
                latitude: parseFloat(record.search_latitude),
                longitude: parseFloat(record.search_longitude),
                service: {
                    id: record.service_id,
                    name: record.service_name
                },
                searchedAt: record.search_timestamp
            };
        });

        return searchHistory;
        
    } catch (error) {
        console.error('Get all search history query error:', error);
        throw error;
    }
};

const getServiceProvidersForLastSearch = async (customerId) => {
    try {
        // First get the last search details
        const lastSearchQuery = `
            SELECT 
                search_latitude,
                search_longitude,
                search_radius,
                service_id,
                service_name
            FROM temp_customer_search_history 
            WHERE temp_customer_id = ? 
            ORDER BY search_timestamp DESC 
            LIMIT 1
        `;
        const [searchRows] = await db.execute(lastSearchQuery, [customerId]);
        
        if (searchRows.length === 0) {
            return null;
        }
        
        const lastSearch = searchRows[0];
        
        // Now get current service providers for that location and service
        const providersQuery = `
            SELECT 
                psc.provider_id as service_provider_id,
                ai.full_name as service_provider_name,
                COALESCE(psc.latitude, 13.0827) as latitude,
                COALESCE(psc.longitude, 80.2707) as longitude,
                psc.service_id,
                st.name as service_name,
                CASE 
                    WHEN psc.status = 'active' THEN 'available'
                    ELSE 'inactive'
                END as availability_status,
                CASE 
                    WHEN psc.status = 'active' THEN 'Available'
                    ELSE 'Not Available'
                END as availability,
                CASE 
                    WHEN psc.status = 'active' THEN 'active'
                    ELSE 'inactive'
                END as status,
                (6371 * acos(cos(radians(?)) * cos(radians(COALESCE(psc.latitude, 13.0827))) * 
                 cos(radians(COALESCE(psc.longitude, 80.2707)) - radians(?)) + sin(radians(?)) * 
                 sin(radians(COALESCE(psc.latitude, 13.0827))))) AS distance_km
            FROM provider_service_configurations psc
            JOIN account_information ai ON psc.provider_id = ai.registration_id
            JOIN service_types st ON psc.service_id = st.service_id
            WHERE psc.service_id = ?
            AND psc.service_id IN (1,2,3,4,5)
            AND psc.status = 'active'
            AND psc.is_active = 1
            HAVING distance_km < ?
            ORDER BY distance_km
        `;
        
        const [providerRows] = await db.execute(providersQuery, [
            lastSearch.search_latitude,
            lastSearch.search_longitude, 
            lastSearch.search_latitude,
            lastSearch.service_id,
            lastSearch.search_radius
        ]);
        
        // Format the response
        const providers = providerRows.map(row => ({
            service_provider_id: row.service_provider_id,
            service_provider_name: row.service_provider_name,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            service_id: row.service_id,
            service_name: row.service_name,
            availability_status: row.availability_status,
            availability: row.availability,
            status: row.status,
            distance_km: parseFloat(row.distance_km).toFixed(2)
        }));
        
        return {
            searchLocation: {
                latitude: parseFloat(lastSearch.search_latitude),
                longitude: parseFloat(lastSearch.search_longitude),
                radius: lastSearch.search_radius
            },
            searchedService: {
                id: lastSearch.service_id,
                name: lastSearch.service_name
            },
            serviceProviders: providers,
            totalProviders: providers.length
        };
        
    } catch (error) {
        console.error('Get service providers for last search error:', error);
        throw error;
    }
};

module.exports = {
  getServiceProvidersForLastSearch, 
getAllSearchHistory,
    getServiceFilters,
    getFilterOptions,
    createTempCustomer,
    getTempCustomerByMobile,
    getTempCustomerBySessionToken,
    getTempCustomerById,
    updateTempCustomerOTP,
    updateTempCustomerInfo,
    verifyTempCustomer,
    getRecentOTPCount,
    logOTPAttempt,
    logOTPVerification,
    saveTempCustomerLocation,
    updateTempCustomerCurrentLocation,
    getActiveServices,
    validateServiceIds,
    saveTempCustomerServices,
    getTempCustomerProfile,
    getPreferredLocations,
    getTempCustomerLocationHistory,
    getTempCustomerCurrentLocation,
    updateTempCustomerActivity,
    setTempCustomerPreferredLocation,
    getTempCustomersByLocation,
    getTempCustomerStats,
    cleanupOldTempCustomers,
    updateLastLogin,
    getTempCustomerSummaryByMobile,
    saveSearchHistory,
    getLastSearchHistory,
    // UPDATED FUNCTIONS FOR SERVICE PROVIDERS
    getServiceProvidersByLocation,
    getServiceProvidersForServices,
    getLastSearchWithDetails,
    getCustomerWithLastSearch,
    getFormattedLastSearch,
    getFreshServiceProviders,
    getTempCustomerByEmail,
    getTempCustomerByName
};
