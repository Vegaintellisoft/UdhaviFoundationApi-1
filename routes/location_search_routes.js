// // routes/location_search_routes.js - FIXED VERSION
// const express = require('express');
// const router = express.Router();
// const LocationSearchController = require('../controller/location_search_controller');
// const db = require('../database/connection'); // ADD THIS LINE

// // Request logging middleware
// router.use((req, res, next) => {
//     console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//     next();
// });

// // Health check - simple test
// router.get('/health', (req, res) => {
//     res.json({
//         success: true,
//         service: 'Location Search API',
//         status: 'Running',
//         timestamp: new Date().toISOString(),
//         version: '1.0.0'
//     });
// });

// // Test route to verify controller
// router.get('/test', (req, res) => {
//     res.json({
//         success: true,
//         message: 'Location search routes are working',
//         controller: typeof LocationSearchController,
//         methods: Object.getOwnPropertyNames(LocationSearchController),
//         availableMethods: {
//             searchProviders: typeof LocationSearchController.searchProviders,
//             searchByServiceName: typeof LocationSearchController.searchByServiceName,
//             getAvailableServicesList: typeof LocationSearchController.getAvailableServicesList,
//             debugProviders: typeof LocationSearchController.debugProviders
//         }
//     });
// });

// // Test database connection
// router.get('/debug/database-test', async (req, res) => {
//     let connection;
//     try {
//         connection = await db.getConnection();
//         const [result] = await connection.query('SELECT 1 as test');
        
//         res.json({
//             success: true,
//             message: 'Database connection successful',
//             result: result[0]
//         });
//     } catch (error) {
//         console.error('Database test error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     } finally {
//         if (connection) connection.release();
//     }
// });

// // Test service types table
// router.get('/debug/service-types', async (req, res) => {
//     let connection;
//     try {
//         connection = await db.getConnection();
        
//         // Check service_types table
//         const [services] = await connection.query(`
//             SELECT service_type_id, service_type_name, service_description, status
//             FROM service_types
//             ORDER BY service_type_id ASC
//         `);
        
//         // Test service name lookup if controller method exists
//         const testServiceName = req.query.testService || 'house cleaning';
//         let serviceTypeId = null;
//         let lookupError = null;
        
//         try {
//             if (typeof LocationSearchController.getServiceTypeId === 'function') {
//                 serviceTypeId = await LocationSearchController.getServiceTypeId(testServiceName, connection);
//             } else {
//                 lookupError = 'getServiceTypeId method not found in controller';
//             }
//         } catch (error) {
//             lookupError = error.message;
//         }
        
//         res.json({
//             success: true,
//             data: {
//                 allServices: services,
//                 totalServices: services.length,
//                 activeServices: services.filter(s => s.status === 1).length,
//                 testLookup: {
//                     searchedFor: testServiceName,
//                     foundServiceId: serviceTypeId,
//                     foundService: services.find(s => s.service_type_id === serviceTypeId),
//                     error: lookupError
//                 }
//             }
//         });
        
//     } catch (error) {
//         console.error('Service types debug error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message,
//             suggestion: 'Make sure service_types table exists with columns: service_type_id, service_type_name, service_description, status'
//         });
//     } finally {
//         if (connection) connection.release();
//     }
// });

// // Debug providers - check if method exists
// if (typeof LocationSearchController.debugProviders === 'function') {
//     router.get('/debug/providers', LocationSearchController.debugProviders);
//     console.log('✅ Debug providers route registered');
// } else {
//     console.error('❌ debugProviders method not found in controller');
//     router.get('/debug/providers', (req, res) => {
//         res.status(500).json({
//             success: false,
//             error: 'debugProviders method not implemented'
//         });
//     });
// }

// // Test table structure
// router.get('/debug/table-check', async (req, res) => {
//     let connection;
//     try {
//         connection = await db.getConnection();
        
//         // Check if required tables exist
//         const tables = [
//             'user_registrations',
//             'account_information', 
//             'contact_address_details',
//             'service_information',
//             'service_types',
//             'provider_availability'
//         ];
        
//         const tableChecks = {};
        
//         for (const table of tables) {
//             try {
//                 const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
//                 tableChecks[table] = { exists: true, count: rows[0].count };
//             } catch (error) {
//                 tableChecks[table] = { exists: false, error: error.message };
//             }
//         }
        
//         // Test distance function
//         let distanceFunction = {};
//         try {
//             const [result] = await connection.query('SELECT calculate_distance_km(13.0827, 80.2707, 13.0827, 80.2707) as distance');
//             distanceFunction = { exists: true, testResult: result[0].distance };
//         } catch (error) {
//             distanceFunction = { exists: false, error: error.message };
//         }
        
//         res.json({
//             success: true,
//             tables: tableChecks,
//             distanceFunction,
//             recommendations: getRecommendations(tableChecks, distanceFunction)
//         });
        
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     } finally {
//         if (connection) connection.release();
//     }
// });

// // Test raw location data
// router.get('/debug/raw-locations', async (req, res) => {
//     let connection;
//     try {
//         const { limit = 10 } = req.query;
//         connection = await db.getConnection();
        
//         const [providers] = await connection.query(`
//             SELECT 
//                 ur.registration_id,
//                 ai.full_name,
//                 cad.latitude,
//                 cad.longitude,
//                 cad.current_address,
//                 ur.registration_status
//             FROM user_registrations ur
//             JOIN account_information ai ON ur.registration_id = ai.registration_id  
//             JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//             WHERE cad.latitude IS NOT NULL 
//             AND cad.longitude IS NOT NULL
//             LIMIT ?
//         `, [parseInt(limit)]);
        
//         res.json({
//             success: true,
//             count: providers.length,
//             providers: providers.map(p => ({
//                 id: p.registration_id,
//                 name: p.full_name,
//                 coordinates: { lat: p.latitude, lon: p.longitude },
//                 address: p.current_address,
//                 status: p.registration_status
//             }))
//         });
        
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     } finally {
//         if (connection) connection.release();
//     }
// });

// // Helper function for recommendations
// function getRecommendations(tableChecks, distanceFunction) {
//     const recommendations = [];
    
//     Object.entries(tableChecks).forEach(([table, check]) => {
//         if (!check.exists) {
//             recommendations.push(`❌ Table '${table}' is missing or inaccessible`);
//         } else if (check.count === 0) {
//             recommendations.push(`⚠️ Table '${table}' exists but has no data`);
//         } else {
//             recommendations.push(`✅ Table '${table}' is OK (${check.count} records)`);
//         }
//     });
    
//     if (!distanceFunction.exists) {
//         recommendations.push('❌ Distance function missing - you need to create calculate_distance_km function');
//     } else {
//         recommendations.push(`✅ Distance function is working (test result: ${distanceFunction.testResult})`);
//     }
    
//     return recommendations;
// }

// // Main search providers
// if (typeof LocationSearchController.searchProviders === 'function') {
//     router.post('/providers', LocationSearchController.searchProviders);
//     console.log('✅ Main search route registered');
// } else {
//     console.error('❌ searchProviders method not found in controller');
//     router.post('/providers', (req, res) => {
//         res.status(500).json({
//             success: false,
//             error: 'searchProviders method not implemented'
//         });
//     });
// }

// // Service name-based search routes
// if (typeof LocationSearchController.searchByServiceName === 'function') {
//     router.post('/services/search', LocationSearchController.searchByServiceName);
//     console.log('✅ Service name search route registered');
// } else {
//     console.error('❌ searchByServiceName method not found in controller');
//     router.post('/services/search', (req, res) => {
//         res.status(500).json({
//             success: false,
//             error: 'searchByServiceName method not implemented'
//         });
//     });
// }

// // Get available services list
// if (typeof LocationSearchController.getAvailableServicesList === 'function') {
//     router.get('/services/available', LocationSearchController.getAvailableServicesList);
//     console.log('✅ Available services list route registered');
// } else {
//     console.error('❌ getAvailableServicesList method not found in controller');
//     router.get('/services/available', (req, res) => {
//         res.status(500).json({
//             success: false,
//             error: 'getAvailableServicesList method not implemented'
//         });
//     });
// }

// // Quick service search routes for popular services
// if (typeof LocationSearchController.searchElectricians === 'function') {
//     router.post('/services/electricians', LocationSearchController.searchElectricians);
//     console.log('✅ Electricians search route registered');
// }

// if (typeof LocationSearchController.searchPlumbers === 'function') {
//     router.post('/services/plumbers', LocationSearchController.searchPlumbers);
//     console.log('✅ Plumbers search route registered');
// }

// if (typeof LocationSearchController.searchCleaners === 'function') {
//     router.post('/services/cleaners', LocationSearchController.searchCleaners);
//     console.log('✅ Cleaners search route registered');
// }

// if (typeof LocationSearchController.searchACRepair === 'function') {
//     router.post('/services/ac-repair', LocationSearchController.searchACRepair);
//     console.log('✅ AC Repair search route registered');
// }

// // Quick radius routes
// if (typeof LocationSearchController.searchProviders3km === 'function') {
//     router.post('/providers/3km', LocationSearchController.searchProviders3km);
// }

// if (typeof LocationSearchController.searchProviders5km === 'function') {
//     router.post('/providers/5km', LocationSearchController.searchProviders5km);
// }

// // Provider availability
// if (typeof LocationSearchController.getProviderAvailability === 'function') {
//     router.get('/providers/:providerId/availability', LocationSearchController.getProviderAvailability);
// }

// // Area statistics
// if (typeof LocationSearchController.getAreaStatistics === 'function') {
//     router.get('/area/statistics', LocationSearchController.getAreaStatistics);
// }

// // Search suggestions
// if (typeof LocationSearchController.getSearchSuggestions === 'function') {
//     router.get('/suggestions', LocationSearchController.getSearchSuggestions);
// }

// // Urgent providers
// if (typeof LocationSearchController.searchUrgentProviders === 'function') {
//     router.post('/providers/urgent', LocationSearchController.searchUrgentProviders);
// }

// // Track interaction
// if (typeof LocationSearchController.trackSearchInteraction === 'function') {
//     router.post('/track-interaction', LocationSearchController.trackSearchInteraction);
// }

// module.exports = router;