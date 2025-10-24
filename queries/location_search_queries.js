// // Updated location_search_queries.js - Using service_types table

// const searchQueries = {
    
//     /**
//      * Main provider search query with service_types table integration
//      * Parameters: lat, lon, lat, lon, radius (5 params total)
//      */
//     mainSearchQuery: `
//         SELECT 
//             ur.registration_id,
//             ai.full_name as provider_name,
//             ai.email_address,
//             ai.mobile_number,
            
//             -- Location details
//             cad.latitude,
//             cad.longitude,
//             cad.current_address,
//             cad.city,
//             s.state_name,
//             cad.pincode,
            
//             -- Distance calculation
//             calculate_distance_km(?, ?, cad.latitude, cad.longitude) as distance_km,
            
//             -- Service names from service_types table (improved)
//             COALESCE(
//                 GROUP_CONCAT(DISTINCT st.service_type_name ORDER BY st.service_type_name SEPARATOR ', '),
//                 'Other Services'
//             ) as service_names,
            
//             -- Work type names (simplified)
//             'General Work' as work_type_names,
            
//             si.service_type_ids,
//             si.work_type_ids,
//             COALESCE(si.experience_years, 0) as experience_years,
//             COALESCE(si.service_radius_km, 5) as service_radius_km,
//             si.service_description,
//             COALESCE(si.travel_charges, 0) as travel_charges,
            
//             -- Pricing
//             COALESCE(si.hourly_rate, 0) as hourly_rate,
//             'hour' as salary_type,
//             1 as negotiable,
//             'INR' as currency_code,
            
//             -- Total rate with travel charges
//             (COALESCE(si.hourly_rate, 0) + COALESCE(si.travel_charges, 0)) as total_hourly_rate_with_travel,
            
//             -- Availability
//             COALESCE(pa.current_status, 'available') as availability_status,
//             COALESCE(pa.is_mobile_service, 0) as is_mobile_service,
//             pa.available_days,
//             pa.available_time_slots,
//             pa.last_activity_at,
            
//             -- Ratings (default values since table might not exist)
//             0 as avg_rating,
//             0 as total_reviews,
            
//             -- Verification
//             'pending' as police_verification_status,
//             ur.registration_status,
            
//             -- Simple relevance score
//             (50 - (calculate_distance_km(?, ?, cad.latitude, cad.longitude) * 2)) as relevance_score
            
//         FROM user_registrations ur
//         JOIN account_information ai ON ur.registration_id = ai.registration_id
//         JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//         LEFT JOIN states s ON cad.state_id = s.state_id
//         JOIN service_information si ON ur.registration_id = si.registration_id
//         LEFT JOIN service_types st ON JSON_CONTAINS(si.service_type_ids, CAST(st.service_type_id as JSON))
//             AND st.status = 1
//         LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
        
//         WHERE 
//             ur.registration_status = 'approved'
//             AND ur.is_completed = TRUE
//             AND cad.latitude IS NOT NULL 
//             AND cad.longitude IS NOT NULL
//             AND calculate_distance_km(?, ?, cad.latitude, cad.longitude) <= ?
        
//         GROUP BY ur.registration_id, ai.full_name, ai.email_address, ai.mobile_number,
//                  cad.latitude, cad.longitude, cad.current_address, cad.city, s.state_name, cad.pincode,
//                  si.service_type_ids, si.work_type_ids, si.experience_years, si.service_radius_km,
//                  si.service_description, si.travel_charges, si.hourly_rate,
//                  pa.current_status, pa.is_mobile_service, pa.available_days, pa.available_time_slots,
//                  pa.last_activity_at, ur.registration_status
//     `,

//     /**
//      * Filter additions (same parameters as main query)
//      */
//     serviceTypeFilter: ` AND JSON_OVERLAPS(si.service_type_ids, CAST(? as JSON))`,
//     workTypeFilter: ` AND JSON_OVERLAPS(si.work_type_ids, CAST(? as JSON))`,
//     budgetFilter: ` AND si.hourly_rate <= ?`,
//     availabilityFilter: ` AND (pa.current_status = 'available' OR pa.current_status IS NULL)`,

//     /**
//      * Group by clause is now included in main query
//      */
//     groupByClause: ``,

//     /**
//      * Sort options
//      */
//     sortByDistance: ` ORDER BY distance_km ASC`,
//     sortByPrice: ` ORDER BY total_hourly_rate_with_travel ASC, distance_km ASC`,
//     sortByRating: ` ORDER BY distance_km ASC`,  // No ratings yet
//     sortByRelevance: ` ORDER BY relevance_score DESC, distance_km ASC`,

//     /**
//      * Filters and limit
//      */
//     ratingFilter: ``,  // Skip for now
//     limitClause: ` LIMIT ?`,

//     /**
//      * Debug query with service_types table (5 parameters: lat, lon, lat, lon, radius)
//      */
//     debugQuery: `
//         SELECT 
//             ur.registration_id,
//             ai.full_name,
//             cad.latitude,
//             cad.longitude,
//             calculate_distance_km(?, ?, cad.latitude, cad.longitude) as distance_km,
//             si.service_type_ids,
//             GROUP_CONCAT(DISTINCT st.service_type_name ORDER BY st.service_type_name SEPARATOR ', ') as service_names,
//             COALESCE(si.hourly_rate, 0) as hourly_rate,
//             pa.current_status
//         FROM user_registrations ur
//         JOIN account_information ai ON ur.registration_id = ai.registration_id
//         JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//         JOIN service_information si ON ur.registration_id = si.registration_id
//         LEFT JOIN service_types st ON JSON_CONTAINS(si.service_type_ids, CAST(st.service_type_id as JSON))
//             AND st.status = 1
//         LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//         WHERE ur.registration_status = 'approved'
//           AND ur.is_completed = TRUE
//           AND cad.latitude IS NOT NULL
//           AND cad.longitude IS NOT NULL
//           AND calculate_distance_km(?, ?, cad.latitude, cad.longitude) <= ?
//         GROUP BY ur.registration_id, ai.full_name, cad.latitude, cad.longitude,
//                  si.service_type_ids, si.hourly_rate, pa.current_status
//         ORDER BY distance_km ASC
//         LIMIT 20
//     `,

//     /**
//      * Provider availability (unchanged)
//      */
//     getProviderAvailability: `
//         SELECT 
//             ur.registration_id,
//             ai.full_name,
//             ai.mobile_number,
//             pa.current_status,
//             pa.available_days,
//             pa.available_time_slots,
//             pa.last_activity_at,
//             pa.is_mobile_service,
//             si.service_radius_km,
            
//             CASE 
//                 WHEN ? IS NOT NULL AND ? IS NOT NULL 
//                 THEN calculate_distance_km(?, ?, cad.latitude, cad.longitude)
//                 ELSE NULL
//             END as distance_to_user
            
//         FROM user_registrations ur
//         JOIN account_information ai ON ur.registration_id = ai.registration_id
//         JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//         JOIN service_information si ON ur.registration_id = si.registration_id
//         LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//         WHERE  ur.registration_status = 'approved'
//     `,

//     /**ur.registration_id = ? AND
//      * Area statistics (unchanged)
//      */
//     getAreaStatistics: `
//         SELECT 
//             COUNT(*) as total_providers_in_radius,
//             AVG(si.hourly_rate) as avg_hourly_rate,
//             MIN(si.hourly_rate) as min_rate,
//             MAX(si.hourly_rate) as max_rate,
//             COUNT(CASE WHEN pa.current_status = 'available' THEN 1 END) as available_now,
//             0 as verified_providers,
//             0 as area_avg_rating
//         FROM user_registrations ur
//         JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//         JOIN service_information si ON ur.registration_id = si.registration_id
//         LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
//         WHERE ur.registration_status = 'approved'
//           AND ur.is_completed = TRUE
//           AND cad.latitude IS NOT NULL 
//           AND cad.longitude IS NOT NULL
//           AND calculate_distance_km(?, ?, cad.latitude, cad.longitude) <= ?
//     `,

//     /**
//      * Service-specific search query
//      * Parameters: lat, lon, lat, lon, service_type_id, lat, lon, radius (8 params)
//      */
//     serviceSpecificQuery: `
//         SELECT 
//             ur.registration_id,
//             ai.full_name as provider_name,
//             ai.email_address,
//             ai.mobile_number,
            
//             -- Location details
//             cad.latitude,
//             cad.longitude,
//             cad.current_address,
//             cad.city,
//             s.state_name,
//             cad.pincode,
            
//             -- Distance calculation
//             calculate_distance_km(?, ?, cad.latitude, cad.longitude) as distance_km,
            
//             -- Service names from service_types table
//             st.service_type_name as service_names,
            
//             -- Work type names (simplified)
//             'General Work' as work_type_names,
            
//             si.service_type_ids,
//             si.work_type_ids,
//             COALESCE(si.experience_years, 0) as experience_years,
//             COALESCE(si.service_radius_km, 5) as service_radius_km,
//             si.service_description,
//             COALESCE(si.travel_charges, 0) as travel_charges,
            
//             -- Pricing
//             COALESCE(si.hourly_rate, 0) as hourly_rate,
//             'hour' as salary_type,
//             1 as negotiable,
//             'INR' as currency_code,
            
//             -- Total rate with travel charges
//             (COALESCE(si.hourly_rate, 0) + COALESCE(si.travel_charges, 0)) as total_hourly_rate_with_travel,
            
//             -- Availability
//             COALESCE(pa.current_status, 'available') as availability_status,
//             COALESCE(pa.is_mobile_service, 0) as is_mobile_service,
//             pa.available_days,
//             pa.available_time_slots,
//             pa.last_activity_at,
            
//             -- Ratings (default values)
//             0 as avg_rating,
//             0 as total_reviews,
            
//             -- Verification
//             'pending' as police_verification_status,
//             ur.registration_status,
            
//             -- Service-specific relevance score
//             (
//                 60 - (calculate_distance_km(?, ?, cad.latitude, cad.longitude) * 3) +
//                 (COALESCE(si.experience_years, 0) * 2) +
//                 CASE WHEN pa.current_status = 'available' THEN 10 ELSE 0 END
//             ) as relevance_score
            
//         FROM user_registrations ur
//         JOIN account_information ai ON ur.registration_id = ai.registration_id
//         JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
//         LEFT JOIN states s ON cad.state_id = s.state_id
//         JOIN service_information si ON ur.registration_id = si.registration_id
//         LEFT JOIN service_types st ON JSON_CONTAINS(si.service_type_ids, CAST(st.service_type_id as JSON))
//             AND st.service_type_id = ? AND st.status = 1
//         LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
        
//         WHERE 
//             ur.registration_status = 'approved'
//             AND ur.is_completed = TRUE
//             AND cad.latitude IS NOT NULL 
//             AND cad.longitude IS NOT NULL
//             AND JSON_CONTAINS(si.service_type_ids, ?)
//             AND calculate_distance_km(?, ?, cad.latitude, cad.longitude) <= ?
//     `,

//     /**
//      * Get all available services from database
//      */
//     getAvailableServicesQuery: `
//       SELECT service_id, name, description
//         FROM service_types 
//         WHERE is_active = 1
//         ORDER BY name ASC
//     `
// };

// module.exports = searchQueries;