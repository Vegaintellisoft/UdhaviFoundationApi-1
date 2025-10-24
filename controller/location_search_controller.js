// // Corrected LocationSearchController based on actual database schema

// const db = require('../database/connection');
// const searchQueries = require('../queries/location_search_queries');

// class LocationSearchController {
//     static async searchProviders(req, res) {
//         console.log('Location-based provider search initiated');
//         console.log('Request body:', JSON.stringify(req.body, null, 2));
        
//         let connection;
        
//         try {
//             connection = await db.getConnection();
//             await connection.beginTransaction();
            
//             const {
//                 latitude,
//                 longitude, 
//                 radius = 3,  // Default 3km
//                 serviceTypes = [],
//                 workTypes = [],
//                 maxBudget = null,
//                 minRating = null,
//                 availabilityFilter = 'all',
//                 sortBy = 'distance',
//                 limit = 50
//             } = req.body;

//             // Validate required parameters
//             if (!latitude || !longitude) {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Latitude and longitude are required' }
//                 });
//             }

//             // Validate radius
//             if (radius > 50 || radius < 1) {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Radius must be between 1 and 50 kilometers' }
//                 });
//             }

//             // Parse and validate coordinates
//             const lat = parseFloat(latitude);
//             const lon = parseFloat(longitude);
//             const searchRadius = parseFloat(radius);

//             if (isNaN(lat) || isNaN(lon) || isNaN(searchRadius)) {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Invalid latitude, longitude, or radius values' }
//                 });
//             }

//             console.log(`Searching for providers within ${searchRadius}km of (${lat}, ${lon})`);
            
//             const searchId = Date.now();

//             // Build main search query - CORRECTED for your schema
//             let query = `
//                 SELECT 
//                     ur.registration_id,
//                     ai.full_name as provider_name,
//                     ai.email_address,
//                     ai.mobile_number,
                    
//                     -- Location details
//                     cad.latitude,
//                     cad.longitude,
//                     cad.current_address,
//                     cad.city,
//                     s.state_name,
//                     cad.pincode,
                    
//                     -- Distance calculation (need to create this function)
//                     (
//                         6371 * ACOS(
//                             COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                             COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                             SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                         )
//                     ) as distance_km,
                    
//                     -- Service names from service_types table
//                     GROUP_CONCAT(DISTINCT st.name ORDER BY st.name SEPARATOR ', ') as service_names,
                    
//                     -- Work type names
//                     GROUP_CONCAT(DISTINCT wt.work_type_name ORDER BY wt.work_type_name SEPARATOR ', ') as work_type_names,
                    
//                     si.service_type_ids,
//                     si.work_type_ids,
//                     COALESCE(si.experience_years, 0) as experience_years,
//                     COALESCE(si.service_radius_km, 5) as service_radius_km,
//                     si.service_description,
//                     COALESCE(si.travel_charges, 0) as travel_charges,
                    
//                     -- Pricing from salary_expectations table
//                     COALESCE(se.expected_salary, 0) as hourly_rate,
//                     COALESCE(se.salary_type, 'hourly') as salary_type,
//                     COALESCE(se.negotiable, 1) as negotiable,
//                     COALESCE(se.currency_code, 'INR') as currency_code,
                    
//                     -- Total rate with travel charges
//                     (COALESCE(se.expected_salary, 0) + COALESCE(si.travel_charges, 0)) as total_hourly_rate_with_travel,
                    
//                     -- Availability
//                     COALESCE(pa.current_status, 'available') as availability_status,
//                     COALESCE(pa.is_mobile_service, 0) as is_mobile_service,
//                     pa.available_days,
//                     pa.available_time_slots,
//                     pa.last_activity_at,
                    
//                     -- Ratings
//                     COALESCE(AVG(pr.overall_rating), 0) as avg_rating,
//                     COUNT(pr.rating_id) as total_reviews,
                    
//                     -- Verification
//                     COALESCE(brc.police_verification_status, 'pending') as police_verification_status,
//                     ur.registration_status,
                    
//                     -- Simple relevance score
//                     (50 - ((
//                         6371 * ACOS(
//                             COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                             COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                             SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                         )
//                     ) * 2)) as relevance_score
                    
//                 FROM user_registrations ur
//                 JOIN account_information ai ON ur.registration_id = ai.registration_id
//                 JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//                 LEFT JOIN states s ON cad.state_id = s.state_id
//                 JOIN service_information si ON ur.registration_id = si.registration_id
//                 LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
//                 LEFT JOIN service_types st ON JSON_CONTAINS(si.service_type_ids, CAST(st.service_id as JSON))
//                     AND st.is_active = 1
//                 LEFT JOIN work_types wt ON JSON_CONTAINS(si.work_type_ids, CAST(wt.work_type_id as JSON))
//                     AND wt.status = 'Active'
//                 LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//                 LEFT JOIN provider_ratings pr ON ur.registration_id = pr.provider_registration_id 
//                     AND pr.rating_status = 'active'
//                 LEFT JOIN background_reference_check brc ON ur.registration_id = brc.registration_id
                
//                 WHERE 
//                     ur.registration_status = 'approved'
//                     AND ur.is_completed = TRUE
//                     AND cad.latitude IS NOT NULL 
//                     AND cad.longitude IS NOT NULL
//                     AND (
//                         6371 * ACOS(
//                             COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                             COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                             SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                         )
//                     ) <= ?
//             `;
            
//             let queryParams = [lat, lon, lat, lat, lon, lat, lat, lon, lat, searchRadius]; // 10 parameters

//             console.log('Base query parameters:', queryParams);

//             // Add conditional filters
//             if (serviceTypes && serviceTypes.length > 0) {
//                 query += ` AND JSON_OVERLAPS(si.service_type_ids, CAST(? as JSON))`;
//                 queryParams.push(JSON.stringify(serviceTypes));
//                 console.log('Added serviceTypes filter:', serviceTypes);
//             }

//             if (workTypes && workTypes.length > 0) {
//                 query += ` AND JSON_OVERLAPS(si.work_type_ids, CAST(? as JSON))`;
//                 queryParams.push(JSON.stringify(workTypes));
//                 console.log('Added workTypes filter:', workTypes);
//             }

//             if (availabilityFilter === 'available') {
//                 query += ` AND (pa.current_status = 'available' OR pa.current_status IS NULL)`;
//                 console.log('Added availability filter');
//             }

//             if (maxBudget && !isNaN(parseFloat(maxBudget))) {
//                 query += ` AND COALESCE(se.expected_salary, 0) <= ?`;
//                 queryParams.push(parseFloat(maxBudget));
//                 console.log('Added budget filter:', maxBudget);
//             }

//             // Add GROUP BY clause
//             query += `
//                 GROUP BY ur.registration_id, ai.full_name, ai.email_address, ai.mobile_number,
//                          cad.latitude, cad.longitude, cad.current_address, cad.city, s.state_name, cad.pincode,
//                          si.service_type_ids, si.work_type_ids, si.experience_years, si.service_radius_km,
//                          si.service_description, si.travel_charges, se.expected_salary, se.salary_type,
//                          se.negotiable, se.currency_code, pa.current_status, pa.is_mobile_service,
//                          pa.available_days, pa.available_time_slots, pa.last_activity_at,
//                          brc.police_verification_status, ur.registration_status
//             `;

//             // Add sorting
//             switch (sortBy) {
//                 case 'distance':
//                     query += ` ORDER BY distance_km ASC`;
//                     break;
//                 case 'price':
//                     query += ` ORDER BY total_hourly_rate_with_travel ASC, distance_km ASC`;
//                     break;
//                 case 'rating':
//                     query += ` ORDER BY avg_rating DESC, distance_km ASC`;
//                     break;
//                 default:
//                     query += ` ORDER BY relevance_score DESC, distance_km ASC`;
//                     break;
//             }

//             // Add limit
//             query += ` LIMIT ?`;
//             queryParams.push(parseInt(limit) || 50);

//             console.log(`Final query has ${queryParams.length} parameters`);

//             // Execute query with error handling
//             let providers;
//             try {
//                 [providers] = await connection.query(query, queryParams);
//             } catch (queryError) {
//                 console.error('Query execution error:', queryError);
//                 console.error('Query:', query);
//                 console.error('Parameters:', queryParams);
//                 throw new Error(`Database query failed: ${queryError.message}`);
//             }

//             console.log(`Found ${providers.length} providers within ${searchRadius}km`);

//             await connection.commit();

//             // Helper function to safely parse JSON
//             const parseJsonSafely = (jsonString, defaultValue = null) => {
//                 try {
//                     if (!jsonString) return defaultValue;
//                     if (typeof jsonString === 'object') return jsonString;
//                     return JSON.parse(jsonString);
//                 } catch (error) {
//                     console.error('JSON parse error:', error, 'Input:', jsonString);
//                     return defaultValue;
//                 }
//             };

//             // Format response with error handling for missing fields
//             const formattedProviders = providers.map((provider, index) => {
//                 try {
//                     return {
//                         id: provider.registration_id,
//                         name: provider.provider_name || 'Unknown Provider',
//                         email: provider.email_address || '',
//                         mobile: provider.mobile_number || '',
                        
//                         location: {
//                             address: provider.current_address || 'Address not available',
//                             city: provider.city || '',
//                             state: provider.state_name || '',
//                             pincode: provider.pincode || '',
//                             coordinates: {
//                                 latitude: parseFloat(provider.latitude) || 0,
//                                 longitude: parseFloat(provider.longitude) || 0
//                             },
//                             distance: {
//                                 km: parseFloat(provider.distance_km) || 0,
//                                 formatted: `${parseFloat(provider.distance_km || 0).toFixed(1)} km away`
//                             }
//                         },
                        
//                         services: {
//                             names: provider.service_names || 'Service not specified',
//                             workTypes: provider.work_type_names || 'Work type not specified',
//                             serviceIds: parseJsonSafely(provider.service_type_ids, []),
//                             workTypeIds: parseJsonSafely(provider.work_type_ids, []),
//                             experience: provider.experience_years || 0,
//                             description: provider.service_description || 'No description available',
//                             serviceRadius: provider.service_radius_km || 5
//                         },
                        
//                         pricing: {
//                             baseRate: parseFloat(provider.hourly_rate) || 0,
//                             rateType: provider.salary_type || 'hourly',
//                             currency: provider.currency_code || 'INR',
//                             negotiable: provider.negotiable === 1,
//                             travelCharges: parseFloat(provider.travel_charges || 0),
//                             totalRateWithTravel: parseFloat(provider.total_hourly_rate_with_travel) || 0,
//                             formatted: `₹${parseFloat(provider.total_hourly_rate_with_travel || 0).toFixed(0)}/${provider.salary_type || 'hourly'}`
//                         },
                        
//                         availability: {
//                             status: provider.availability_status || 'unknown',
//                             isMobileService: provider.is_mobile_service === 1,
//                             availableDays: parseJsonSafely(provider.available_days, []),
//                             timeSlots: parseJsonSafely(provider.available_time_slots, []),
//                             lastActive: provider.last_activity_at
//                         },
                        
//                         ratings: {
//                             average: parseFloat(provider.avg_rating || 0),
//                             totalReviews: provider.total_reviews || 0,
//                             formatted: `${parseFloat(provider.avg_rating || 0).toFixed(1)} ⭐ (${provider.total_reviews || 0} reviews)`
//                         },
                        
//                         verification: {
//                             policeVerification: provider.police_verification_status || 'pending',
//                             registrationStatus: provider.registration_status || 'pending',
//                             verified: provider.police_verification_status === 'approved'
//                         },
                        
//                         searchMeta: {
//                             relevanceScore: parseFloat(provider.relevance_score) || 0,
//                             searchRank: index + 1
//                         }
//                     };
//                 } catch (formatError) {
//                     console.error('Error formatting provider:', formatError, provider);
//                     return {
//                         id: provider.registration_id,
//                         name: 'Error loading provider data',
//                         error: formatError.message
//                     };
//                 }
//             });
            
//             res.json({
//                 success: true,
//                 message: `Found ${providers.length} service providers within ${searchRadius}km`,
//                 data: {
//                     searchId: searchId,
//                     searchParams: {
//                         location: { latitude: lat, longitude: lon },
//                         radius: searchRadius,
//                         serviceTypes,
//                         workTypes,
//                         maxBudget,
//                         minRating,
//                         sortBy
//                     },
//                     results: {
//                         total: providers.length,
//                         showing: Math.min(providers.length, limit),
//                         hasMore: providers.length >= limit,
//                         searchRadius: `${searchRadius}km`
//                     },
//                     providers: formattedProviders
//                 }
//             });

//         } catch (error) {
//             if (connection) {
//                 try {
//                     await connection.rollback();
//                 } catch (rollbackError) {
//                     console.error('Rollback error:', rollbackError);
//                 }
//             }
            
//             console.error('Location search error:', error);
//             console.error('Error stack:', error.stack);
            
//             res.status(500).json({
//                 success: false,
//                 error: { 
//                     message: 'Failed to search providers',
//                     details: error.message,
//                     type: error.constructor.name
//                 }
//             });
//         } finally {
//             if (connection) {
//                 try {
//                     connection.release();
//                 } catch (releaseError) {
//                     console.error('Connection release error:', releaseError);
//                 }
//             }
//         }
//     }

//     // CORRECTED: Use actual field names from service_types table
//     static async getServiceTypeId(serviceName, connection) {
//         try {
//             // First try exact match on service name (using 'name' field, not 'service_type_name')
//             let [services] = await connection.query(`
//                 SELECT service_id, name 
//                 FROM service_types 
//                 WHERE LOWER(name) = LOWER(?) 
//                 AND is_active = 1
//             `, [serviceName.trim()]);
            
//             if (services.length > 0) {
//                 return services[0].service_id;
//             }
            
//             // If no exact match, try partial matching
//             const serviceNameLower = serviceName.toLowerCase();
            
//             [services] = await connection.query(`
//                 SELECT service_id, name 
//                 FROM service_types 
//                 WHERE is_active = 1
//             `);
            
//             // Check for common name variations
//             for (const service of services) {
//                 const serviceTypeName = service.name.toLowerCase();
                
//                 // Direct matches
//                 if (serviceTypeName.includes(serviceNameLower) || serviceNameLower.includes(serviceTypeName)) {
//                     return service.service_id;
//                 }
                
//                 // Common variations mapping
//                 const variations = {
//                     'house cleaning': ['cleaning', 'housekeeping', 'cleaner'],
//                     'painting': ['painter', 'paint'],
//                     'gardening': ['gardener', 'landscaping', 'garden'],
//                     'cooking/chef': ['cooking', 'chef', 'cook'],
//                     'tutoring': ['tutor', 'teaching', 'teacher'],
//                     'baby sitting': ['babysitting', 'childcare', 'baby sitter', 'nanny'],
//                     'elder care': ['elderly care', 'senior care', 'old age care'],
//                     'electrical work': ['electrician', 'electrical', 'electric', 'wiring'],
//                     'plumbing': ['plumber', 'pipes'],
//                     'carpentry': ['carpenter', 'wood work', 'furniture'],
//                     'ac repair': ['air conditioning', 'ac service', 'ac'],
//                     'appliance repair': ['appliance', 'home appliances'],
//                     'beauty services': ['beauty', 'beautician', 'salon']
//                 };
                
//                 // Check if current service matches any variations
//                 for (const [mainService, varList] of Object.entries(variations)) {
//                     if (serviceTypeName === mainService && varList.includes(serviceNameLower)) {
//                         return service.service_id;
//                     }
//                     if (mainService.includes(serviceNameLower) && serviceTypeName.includes(mainService.split(' ')[0])) {
//                         return service.service_id;
//                     }
//                 }
//             }
            
//             return null;
//         } catch (error) {
//             console.error('Error getting service type ID:', error);
//             return null;
//         }
//     }

//     // CORRECTED: Use actual field names
//     static async getAvailableServices(connection = null) {
//         let localConnection = connection;
//         let shouldReleaseConnection = false;
        
//         try {
//             if (!localConnection) {
//                 localConnection = await db.getConnection();
//                 shouldReleaseConnection = true;
//             }
            
//             const [services] = await localConnection.query(`
//                 SELECT service_id, name, description
//                 FROM service_types 
//                 WHERE is_active = 1
//                 ORDER BY name ASC
//             `);
            
//             return services.map(service => ({
//                 id: service.service_id,
//                 name: service.name,
//                 description: service.description || `Professional ${service.name.toLowerCase()} services`
//             }));
            
//         } catch (error) {
//             console.error('Error getting available services:', error);
//             return [];
//         } finally {
//             if (shouldReleaseConnection && localConnection) {
//                 localConnection.release();
//             }
//         }
//     }

//     // Simple debug method - CORRECTED
//     static async debugProviders(req, res) {
//         let connection;
//         try {
//             const { latitude = 13.0827, longitude = 80.2707, radius = 10 } = req.query;
            
//             const lat = parseFloat(latitude);
//             const lon = parseFloat(longitude);
//             const searchRadius = parseFloat(radius);

//             console.log(`Debug search: lat=${lat}, lon=${lon}, radius=${searchRadius}`);

//             connection = await db.getConnection();
            
//             // Simple debug query without distance function
//             const [providers] = await connection.query(`
//                 SELECT 
//                     ur.registration_id,
//                     ai.full_name,
//                     cad.latitude,
//                     cad.longitude,
//                     cad.current_address,
//                     si.service_type_ids,
//                     se.expected_salary as hourly_rate,
//                     se.salary_type,
//                     pa.current_status,
//                     (
//                         6371 * ACOS(
//                             COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                             COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                             SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                         )
//                     ) as distance_km
//                 FROM user_registrations ur
//                 JOIN account_information ai ON ur.registration_id = ai.registration_id
//                 JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//                 JOIN service_information si ON ur.registration_id = si.registration_id
//                 LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
//                 LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//                 WHERE ur.registration_status = 'approved'
//                   AND ur.is_completed = TRUE
//                   AND cad.latitude IS NOT NULL
//                   AND cad.longitude IS NOT NULL
//                 HAVING distance_km <= ?
//                 ORDER BY distance_km ASC
//                 LIMIT 20
//             `, [lat, lon, lat, searchRadius]);

//             res.json({
//                 success: true,
//                 debug: true,
//                 searchLocation: { latitude: lat, longitude: lon },
//                 searchRadius,
//                 providersFound: providers.length,
//                 providers: providers.map(p => ({
//                     id: p.registration_id,
//                     name: p.full_name,
//                     distance: parseFloat(p.distance_km).toFixed(2),
//                     location: { lat: p.latitude, lon: p.longitude },
//                     address: p.current_address,
//                     services: p.service_type_ids,
//                     hourlyRate: p.hourly_rate,
//                     salaryType: p.salary_type,
//                     status: p.current_status
//                 }))
//             });

//         } catch (error) {
//             console.error('Debug error:', error);
//             res.status(500).json({
//                 success: false,
//                 error: error.message,
//                 stack: error.stack
//             });
//         } finally {
//             if (connection) connection.release();
//         }
//     }

//     // Helper method to safely parse JSON
//     static parseJsonSafely(jsonString, defaultValue = null) {
//         try {
//             if (!jsonString) return defaultValue;
//             if (typeof jsonString === 'object') return jsonString;
//             return JSON.parse(jsonString);
//         } catch (error) {
//             console.error('JSON parse error:', error, 'Input:', jsonString);
//             return defaultValue;
//         }
//     }

//     // Test method to verify database connection
//     static async testDatabaseConnection(req, res) {
//         let connection;
//         try {
//             connection = await db.getConnection();
//             const [result] = await connection.query('SELECT 1 as test');
            
//             res.json({
//                 success: true,
//                 message: 'Database connection successful',
//                 result: result[0]
//             });
//         } catch (error) {
//             console.error('Database test error:', error);
//             res.status(500).json({
//                 success: false,
//                 error: error.message
//             });
//         } finally {
//             if (connection) connection.release();
//         }
//     }

//     static async getAvailableServicesList(req, res) {
//         let connection;
//         try {
//             connection = await db.getConnection();
//             const services = await LocationSearchController.getAvailableServices(connection);
            
//             res.json({
//                 success: true,
//                 data: {
//                     services: services,
//                     total: services.length,
//                     searchTips: [
//                         'Service names are case-insensitive',
//                         'You can use common terms like "electrician", "plumber", etc.',
//                         'Default search radius is 2km',
//                         'Maximum radius is 50km'
//                     ]
//                 }
//             });
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 error: { message: 'Failed to get services list', details: error.message }
//             });
//         } finally {
//             if (connection) connection.release();
//         }
//     }

//     // Quick service search methods
//     static async searchElectricians(req, res) {
//         req.body.serviceName = 'Electrical Work';
//         return LocationSearchController.searchByServiceName(req, res);
//     }

//     static async searchPlumbers(req, res) {
//         req.body.serviceName = 'Plumbing';
//         return LocationSearchController.searchByServiceName(req, res);
//     }

//     static async searchCleaners(req, res) {
//         req.body.serviceName = 'House Cleaning';
//         return LocationSearchController.searchByServiceName(req, res);
//     }

//     static async searchACRepair(req, res) {
//         req.body.serviceName = 'AC Repair';
//         return LocationSearchController.searchByServiceName(req, res);
//     }

//     // Updated searchByServiceName method
//     static async searchByServiceName(req, res) {
//         console.log('Service name-based provider search initiated');
//         console.log('Request body:', JSON.stringify(req.body, null, 2));
        
//         let connection;
        
//         try {
//             connection = await db.getConnection();
//             await connection.beginTransaction();
            
//             const {
//                 latitude,
//                 longitude,
//                 serviceName,
//                 radius = 2,
//                 maxBudget = null,
//                 availabilityFilter = 'all',
//                 sortBy = 'distance',
//                 limit = 20
//             } = req.body;

//             // Validate required parameters
//             if (!latitude || !longitude) {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Latitude and longitude are required' }
//                 });
//             }

//             if (!serviceName || serviceName.trim() === '') {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Service name is required' }
//                 });
//             }

//             const lat = parseFloat(latitude);
//             const lon = parseFloat(longitude);
//             const searchRadius = parseFloat(radius);

//             if (isNaN(lat) || isNaN(lon) || isNaN(searchRadius)) {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Invalid latitude, longitude, or radius values' }
//                 });
//             }

//             console.log(`Searching for ${serviceName} providers within ${searchRadius}km of (${lat}, ${lon})`);
            
//             const searchId = Date.now();

//             // Get service type ID from database
//             const serviceTypeId = await LocationSearchController.getServiceTypeId(serviceName.trim(), connection);
            
//             if (!serviceTypeId) {
//                 const availableServices = await LocationSearchController.getAvailableServices(connection);
//                 return res.status(400).json({
//                     success: false,
//                     error: { 
//                         message: 'Service not found',
//                         availableServices: availableServices.map(s => s.name)
//                     }
//                 });
//             }

//             // Build service-specific search query
//             let query = `
//                 SELECT 
//                     ur.registration_id,
//                     ai.full_name as provider_name,
//                     ai.email_address,
//                     ai.mobile_number,
                    
//                     -- Location details
//                     cad.latitude,
//                     cad.longitude,
//                     cad.current_address,
//                     cad.city,
//                     s.state_name,
//                     cad.pincode,
                    
//                     -- Distance calculation
//                     (
//                         6371 * ACOS(
//                             COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                             COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                             SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                         )
//                     ) as distance_km,
                    
//                     -- Service names from database
//                     st.name as service_names,
                    
//                     -- Work type names
//                     'General Work' as work_type_names,
                    
//                     si.service_type_ids,
//                     si.work_type_ids,
//                     COALESCE(si.experience_years, 0) as experience_years,
//                     COALESCE(si.service_radius_km, 5) as service_radius_km,
//                     si.service_description,
//                     COALESCE(si.travel_charges, 0) as travel_charges,
                    
//                     -- Pricing
//                     COALESCE(se.expected_salary, 0) as hourly_rate,
//                     COALESCE(se.salary_type, 'hourly') as salary_type,
//                     COALESCE(se.negotiable, 1) as negotiable,
//                     COALESCE(se.currency_code, 'INR') as currency_code,
                    
//                     -- Total rate with travel charges
//                     (COALESCE(se.expected_salary, 0) + COALESCE(si.travel_charges, 0)) as total_hourly_rate_with_travel,
                    
//                     -- Availability
//                     COALESCE(pa.current_status, 'available') as availability_status,
//                     COALESCE(pa.is_mobile_service, 0) as is_mobile_service,
//                     pa.available_days,
//                     pa.available_time_slots,
//                     pa.last_activity_at,
                    
//                     -- Ratings
//                     COALESCE(AVG(pr.overall_rating), 0) as avg_rating,
//                     COUNT(pr.rating_id) as total_reviews,
                    
//                     -- Verification
//                     COALESCE(brc.police_verification_status, 'pending') as police_verification_status,
//                     ur.registration_status,
                    
//                     -- Service-specific relevance score
//                     (
//                         60 - ((
//                             6371 * ACOS(
//                                 COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                                 COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                                 SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                             )
//                         ) * 3) +
//                         (COALESCE(si.experience_years, 0) * 2) +
//                         CASE WHEN pa.current_status = 'available' THEN 10 ELSE 0 END
//                     ) as relevance_score
                    
//                 FROM user_registrations ur
//                 JOIN account_information ai ON ur.registration_id = ai.registration_id
//                 JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//                 LEFT JOIN states s ON cad.state_id = s.state_id
//                 JOIN service_information si ON ur.registration_id = si.registration_id
//                 LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
//                 LEFT JOIN service_types st ON JSON_CONTAINS(si.service_type_ids, CAST(st.service_id as JSON))
//                     AND st.service_id = ? AND st.is_active = 1
//                 LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//                 LEFT JOIN provider_ratings pr ON ur.registration_id = pr.provider_registration_id 
//                     AND pr.rating_status = 'active'
//                 LEFT JOIN background_reference_check brc ON ur.registration_id = brc.registration_id
                
//                 WHERE 
//                     ur.registration_status = 'approved'
//                     AND ur.is_completed = TRUE
//                     AND cad.latitude IS NOT NULL 
//                     AND cad.longitude IS NOT NULL
//                     AND JSON_CONTAINS(si.service_type_ids, ?)
//             `;
            
//             let queryParams = [
//                 lat, lon, lat,           // distance calculation 1
//                 lat, lon, lat,           // distance calculation 2 (relevance score)
//                 serviceTypeId,           // service type join filter
//                 JSON.stringify(serviceTypeId) // service type contains filter
//             ]; // 8 parameters total

//             console.log('Base query parameters:', queryParams);

//             // Add conditional filters
//             if (availabilityFilter === 'available') {
//                 query += ` AND (pa.current_status = 'available' OR pa.current_status IS NULL)`;
//                 console.log('Added availability filter');
//             }

//             if (maxBudget && !isNaN(parseFloat(maxBudget))) {
//                 query += ` AND COALESCE(se.expected_salary, 0) <= ?`;
//                 queryParams.push(parseFloat(maxBudget));
//                 console.log('Added budget filter:', maxBudget);
//             }

//             // Add distance filter using HAVING clause
//             query += ` HAVING distance_km <= ?`;
//             queryParams.push(searchRadius);

//             // Add GROUP BY clause
//             query += `
//                 GROUP BY ur.registration_id, ai.full_name, ai.email_address, ai.mobile_number,
//                          cad.latitude, cad.longitude, cad.current_address, cad.city, s.state_name,
//                          cad.pincode, st.name, si.service_type_ids, si.work_type_ids,
//                          si.experience_years, si.service_radius_km, si.service_description,
//                          si.travel_charges, se.expected_salary, se.salary_type, se.negotiable,
//                          se.currency_code, pa.current_status, pa.is_mobile_service,
//                          pa.available_days, pa.available_time_slots, pa.last_activity_at,
//                          brc.police_verification_status, ur.registration_status
//             `;

//             // Add sorting
//             switch (sortBy) {
//                 case 'distance':
//                     query += ` ORDER BY distance_km ASC`;
//                     break;
//                 case 'price':
//                     query += ` ORDER BY total_hourly_rate_with_travel ASC, distance_km ASC`;
//                     break;
//                 case 'experience':
//                     query += ` ORDER BY experience_years DESC, distance_km ASC`;
//                     break;
//                 case 'rating':
//                     query += ` ORDER BY avg_rating DESC, distance_km ASC`;
//                     break;
//                 case 'relevance':
//                 default:
//                     query += ` ORDER BY relevance_score DESC, distance_km ASC`;
//                     break;
//             }

//             // Add limit
//             query += ` LIMIT ?`;
//             queryParams.push(parseInt(limit) || 20);

//             console.log(`Final query has ${queryParams.length} parameters`);

//             // Execute query
//             let providers;
//             try {
//                 [providers] = await connection.query(query, queryParams);
//             } catch (queryError) {
//                 console.error('Service search query error:', queryError);
//                 throw new Error(`Database query failed: ${queryError.message}`);
//             }

//             console.log(`Found ${providers.length} ${serviceName} providers within ${searchRadius}km`);

//             await connection.commit();

//             // Helper function to safely parse JSON
//             const parseJsonSafely = (jsonString, defaultValue = null) => {
//                 try {
//                     if (!jsonString) return defaultValue;
//                     if (typeof jsonString === 'object') return jsonString;
//                     return JSON.parse(jsonString);
//                 } catch (error) {
//                     return defaultValue;
//                 }
//             };

//             // Format response
//             const formattedProviders = providers.map((provider, index) => ({
//                 id: provider.registration_id,
//                 name: provider.provider_name || 'Unknown Provider',
//                 email: provider.email_address || '',
//                 mobile: provider.mobile_number || '',
                
//                 location: {
//                     address: provider.current_address || 'Address not available',
//                     city: provider.city || '',
//                     state: provider.state_name || '',
//                     pincode: provider.pincode || '',
//                     coordinates: {
//                         latitude: parseFloat(provider.latitude) || 0,
//                         longitude: parseFloat(provider.longitude) || 0
//                     },
//                     distance: {
//                         km: parseFloat(provider.distance_km) || 0,
//                         formatted: `${parseFloat(provider.distance_km || 0).toFixed(1)} km away`
//                     }
//                 },
                
//                 services: {
//                     names: provider.service_names || serviceName,
//                     workTypes: provider.work_type_names || 'General Work',
//                     serviceIds: parseJsonSafely(provider.service_type_ids, []),
//                     workTypeIds: parseJsonSafely(provider.work_type_ids, []),
//                     experience: provider.experience_years || 0,
//                     description: provider.service_description || `Professional ${serviceName} services`,
//                     serviceRadius: provider.service_radius_km || 5
//                 },
                
//                 pricing: {
//                     baseRate: parseFloat(provider.hourly_rate) || 0,
//                     rateType: provider.salary_type || 'hourly',
//                     currency: provider.currency_code || 'INR',
//                     negotiable: provider.negotiable === 1,
//                     travelCharges: parseFloat(provider.travel_charges || 0),
//                     totalRateWithTravel: parseFloat(provider.total_hourly_rate_with_travel) || 0,
//                     formatted: `₹${parseFloat(provider.total_hourly_rate_with_travel || 0).toFixed(0)}/${provider.salary_type || 'hourly'}`
//                 },
                
//                 availability: {
//                     status: provider.availability_status || 'unknown',
//                     isMobileService: provider.is_mobile_service === 1,
//                     availableDays: parseJsonSafely(provider.available_days, []),
//                     timeSlots: parseJsonSafely(provider.available_time_slots, []),
//                     lastActive: provider.last_activity_at
//                 },
                
//                 ratings: {
//                     average: parseFloat(provider.avg_rating || 0),
//                     totalReviews: provider.total_reviews || 0,
//                     formatted: `${parseFloat(provider.avg_rating || 0).toFixed(1)} ⭐ (${provider.total_reviews || 0} reviews)`
//                 },
                
//                 verification: {
//                     policeVerification: provider.police_verification_status || 'pending',
//                     registrationStatus: provider.registration_status || 'pending',
//                     verified: provider.police_verification_status === 'approved'
//                 },
                
//                 searchMeta: {
//                     relevanceScore: parseFloat(provider.relevance_score) || 0,
//                     searchRank: index + 1,
//                     matchedService: serviceName
//                 }
//             }));
            
//             res.json({
//                 success: true,
//                 message: `Found ${providers.length} ${serviceName} providers within ${searchRadius}km`,
//                 data: {
//                     searchId: searchId,
//                     searchParams: {
//                         serviceName,
//                         location: { latitude: lat, longitude: lon },
//                         radius: searchRadius,
//                         maxBudget,
//                         availabilityFilter,
//                         sortBy
//                     },
//                     results: {
//                         total: providers.length,
//                         showing: Math.min(providers.length, limit),
//                         hasMore: providers.length >= limit,
//                         searchRadius: `${searchRadius}km`,
//                         serviceType: serviceName
//                     },
//                     providers: formattedProviders
//                 }
//             });

//         } catch (error) {
//             if (connection) {
//                 try {
//                     await connection.rollback();
//                 } catch (rollbackError) {
//                     console.error('Rollback error:', rollbackError);
//                 }
//             }
            
//             console.error('Service name search error:', error);
//             res.status(500).json({
//                 success: false,
//                 error: { 
//                     message: 'Failed to search providers by service name',
//                     details: error.message
//                 }
//             });
//         } finally {
//             if (connection) connection.release();
//         }
//     }

//     // Keep existing methods with minor corrections
//     static async searchProviders3km(req, res) {
//         req.body.radius = 3;
//         return LocationSearchController.searchProviders(req, res);
//     }

//     static async searchProviders5km(req, res) {
//         req.body.radius = 5;
//         return LocationSearchController.searchProviders(req, res);
//     }

//     static async getProviderAvailability(req, res) {
//         let connection;
//         try {
//             const { providerId } = req.params;
//             const { userLatitude, userLongitude } = req.query;

//             const lat = userLatitude ? parseFloat(userLatitude) : null;
//             const lon = userLongitude ? parseFloat(userLongitude) : null;

//             connection = await db.getConnection();
            
//             let distanceCalc = 'NULL';
//             let params = [providerId];
            
//             if (lat && lon) {
//                 distanceCalc = `(
//                     6371 * ACOS(
//                         COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                         COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                         SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                     )
//                 )`;
//                 params = [lat, lon, lat, providerId];
//             }
            
//             const [provider] = await connection.query(`
//                 SELECT 
//                     ur.registration_id,
//                     ai.full_name,
//                     ai.mobile_number,
//                     pa.current_status,
//                     pa.available_days,
//                     pa.available_time_slots,
//                     pa.last_activity_at,
//                     pa.is_mobile_service,
//                     si.service_radius_km,
//                     ${distanceCalc} as distance_to_user
//                 FROM user_registrations ur
//                 JOIN account_information ai ON ur.registration_id = ai.registration_id
//                 JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//                 JOIN service_information si ON ur.registration_id = si.registration_id
//                 LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//                 WHERE ur.registration_id = ? AND ur.registration_status = 'approved'
//             `, params);

//             if (provider.length === 0) {
//                 return res.status(404).json({
//                     success: false,
//                     error: { message: 'Provider not found' }
//                 });
//             }

//             const providerData = provider[0];

//             res.json({
//                 success: true,
//                 data: {
//                     providerId: providerData.registration_id,
//                     name: providerData.full_name,
//                     mobile: providerData.mobile_number,
//                     availability: {
//                         status: providerData.current_status || 'unknown',
//                         lastActive: providerData.last_activity_at,
//                         availableDays: LocationSearchController.parseJsonSafely(providerData.available_days, []),
//                         timeSlots: LocationSearchController.parseJsonSafely(providerData.available_time_slots, [])
//                     },
//                     location: {
//                         isMobileService: providerData.is_mobile_service === 1,
//                         serviceRadius: providerData.service_radius_km,
//                         distanceToUser: providerData.distance_to_user ? 
//                                        `${parseFloat(providerData.distance_to_user).toFixed(1)} km` : 'Unknown'
//                     }
//                 }
//             });

//         } catch (error) {
//             console.error('Get provider availability error:', error);
//             res.status(500).json({
//                 success: false,
//                 error: { 
//                     message: 'Failed to get provider availability',
//                     details: error.message
//                 }
//             });
//         } finally {
//             if (connection) connection.release();
//         }
//     }

//     static async getAreaStatistics(req, res) {
//         let connection;
//         try {
//             const { latitude, longitude, radius = 5 } = req.query;

//             if (!latitude || !longitude) {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Latitude and longitude are required' }
//                 });
//             }

//             const lat = parseFloat(latitude);
//             const lon = parseFloat(longitude);
//             const searchRadius = parseFloat(radius);

//             connection = await db.getConnection();
//             const [areaStats] = await connection.query(`
//                 SELECT 
//                     COUNT(*) as total_providers_in_radius,
//                     AVG(se.expected_salary) as avg_hourly_rate,
//                     MIN(se.expected_salary) as min_rate,
//                     MAX(se.expected_salary) as max_rate,
//                     COUNT(CASE WHEN pa.current_status = 'available' THEN 1 END) as available_now,
//                     COUNT(CASE WHEN brc.police_verification_status = 'approved' THEN 1 END) as verified_providers,
//                     AVG(pr_avg.avg_rating) as area_avg_rating
//                 FROM user_registrations ur
//                 JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//                 JOIN service_information si ON ur.registration_id = si.registration_id
//                 LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
//                 LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//                 LEFT JOIN background_reference_check brc ON ur.registration_id = brc.registration_id
//                 LEFT JOIN (
//                     SELECT provider_registration_id, AVG(overall_rating) as avg_rating
//                     FROM provider_ratings 
//                     WHERE rating_status = 'active'
//                     GROUP BY provider_registration_id
//                 ) pr_avg ON ur.registration_id = pr_avg.provider_registration_id
//                 WHERE ur.registration_status = 'approved'
//                   AND ur.is_completed = TRUE
//                   AND cad.latitude IS NOT NULL 
//                   AND cad.longitude IS NOT NULL
//                   AND (
//                     6371 * ACOS(
//                         COS(RADIANS(?)) * COS(RADIANS(cad.latitude)) * 
//                         COS(RADIANS(cad.longitude) - RADIANS(?)) + 
//                         SIN(RADIANS(?)) * SIN(RADIANS(cad.latitude))
//                     )
//                   ) <= ?
//             `, [lat, lon, lat, searchRadius]);

//             const stats = areaStats[0] || {};
            
//             res.json({
//                 success: true,
//                 data: {
//                     location: {
//                         latitude: lat,
//                         longitude: lon,
//                         searchRadius: searchRadius
//                     },
//                     statistics: {
//                         totalProviders: stats.total_providers_in_radius || 0,
//                         availability: {
//                             available: stats.available_now || 0,
//                             total: stats.total_providers_in_radius || 0
//                         },
//                         pricing: {
//                             average: parseFloat(stats.avg_hourly_rate || 0),
//                             minimum: parseFloat(stats.min_rate || 0),
//                             maximum: parseFloat(stats.max_rate || 0),
//                             currency: 'INR'
//                         },
//                         quality: {
//                             averageRating: parseFloat(stats.area_avg_rating || 0),
//                             verifiedProviders: stats.verified_providers || 0
//                         }
//                     }
//                 }
//             });

//         } catch (error) {
//             console.error('Get area statistics error:', error);
//             res.status(500).json({
//                 success: false,
//                 error: { 
//                     message: 'Failed to get area statistics',
//                     details: error.message
//                 }
//             });
//         } finally {
//             if (connection) connection.release();
//         }
//     }

//     static async getSearchSuggestions(req, res) {
//         try {
//             const { latitude, longitude, radius = 10 } = req.query;

//             if (!latitude || !longitude) {
//                 return res.status(400).json({
//                     success: false,
//                     error: { message: 'Latitude and longitude are required' }
//                 });
//             }

//             res.json({
//                 success: true,
//                 data: {
//                     suggestions: [
//                         { serviceName: 'Electrical Work', providerCount: 5, avgRate: 350 },
//                         { serviceName: 'Plumbing', providerCount: 3, avgRate: 300 },
//                         { serviceName: 'AC Repair', providerCount: 2, avgRate: 450 },
//                         { serviceName: 'House Cleaning', providerCount: 4, avgRate: 200 },
//                         { serviceName: 'Carpentry', providerCount: 2, avgRate: 400 }
//                     ]
//                 }
//             });
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 error: { message: 'Failed to get suggestions', details: error.message }
//             });
//         }
//     }

//     static async searchUrgentProviders(req, res) {
//         try {
//             req.body.radius = req.body.maxRadius || 5;
//             req.body.availabilityFilter = 'available';
//             req.body.sortBy = 'distance';
//             req.body.limit = 10;
            
//             return LocationSearchController.searchProviders(req, res);
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 error: { message: 'Failed urgent search', details: error.message }
//             });
//         }
//     }

//     static async trackSearchInteraction(req, res) {
//         try {
//             const { searchId, providerId, interactionType } = req.body;

//             res.json({
//                 success: true,
//                 message: 'Interaction tracked successfully',
//                 data: { searchId, providerId, interactionType }
//             });

//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 error: { message: 'Failed to track interaction', details: error.message }
//             });
//         }
//     }
// }

// module.exports = LocationSearchController;