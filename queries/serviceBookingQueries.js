// queries/serviceBookingQueries.js - Updated to use new database tables
const db = require('../database/connection');

// === SERVICE QUERIES ===

// Get all active services with filter counts
const getAllActiveServices = async () => {
    try {
        const query = `
            SELECT 
                st.service_id,
                st.name,
                st.description,
                st.category,
                st.base_price,
                st.icon_url,
                st.is_active,
                COUNT(sf.filter_id) as filter_count
            FROM service_types st
            LEFT JOIN service_filters sf ON st.service_id = sf.service_id AND sf.is_active = 1
            WHERE st.service_id IN (1,2,3,4,5) AND st.is_active = 1
            GROUP BY st.service_id, st.name, st.description, st.category, st.base_price, st.icon_url, st.is_active
            ORDER BY st.display_order ASC, st.name ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        console.error('Get all active services query error:', error);
        throw error;
    }
};

// Get service details by ID
const getServiceById = async (serviceId) => {
    try {
        const query = `
            SELECT 
                service_id, 
                name as service_name, 
                description, 
                category,
                base_price,
                icon_url,
                is_active 
            FROM service_types 
            WHERE service_id = ? AND service_id IN (1,2,3,4,5) AND is_active = 1
        `;
        const [rows] = await db.execute(query, [serviceId]);
        return rows[0];
    } catch (error) {
        console.error('Get service by ID query error:', error);
        throw error;
    }
};

// Get service base price
const getServiceBasePrice = async (serviceId) => {
    try {
        const query = `
            SELECT base_price 
            FROM service_types 
            WHERE service_id = ? AND service_id IN (1,2,3,4,5) AND is_active = 1
        `;
        const [rows] = await db.execute(query, [serviceId]);
        return rows[0]?.base_price || 0;
    } catch (error) {
        console.error('Get service base price query error:', error);
        throw error;
    }
};

// === FILTER QUERIES ===

// Get all filters for a service with section information
const getServiceFilters = async (serviceId) => {
    try {
        const query = `
            SELECT 
                sf.filter_id,
                sf.filter_name,
                sf.filter_label,
                sf.filter_type,
                sf.is_required,
                sf.display_order,
                sf.section_title,
                sf.section_description,
                sf.section_order,
                sf.help_text,
                sf.placeholder,
                NULL as validation_rules
            FROM service_filters sf
            WHERE sf.service_id = ? AND sf.service_id IN (1,2,3,4,5) AND sf.is_active = 1
            ORDER BY sf.section_order ASC, sf.display_order ASC
        `;
        const [rows] = await db.execute(query, [serviceId]);
        return rows;
    } catch (error) {
        console.error('Get service filters query error:', error);
        throw error;
    }
};

// Get options for a specific filter
const getFilterOptions = async (filterId) => {
    try {
        const query = `
            SELECT 
                sfo.option_value, 
                sfo.option_label, 
                sfo.display_order,
                sfo.price_modifier,
                sfo.is_active,
                NULL as description
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

// Get available service providers for a service
const getAvailableProviders = async (serviceId) => {
    try {
        const query = `
            SELECT 
                ai.registration_id,
                ai.full_name,
                ai.profile_image,
                5 as experience,
                500 as hourly_rate,
                4.5 as rating,
                10 as total_ratings,
                'available' as availability_status,
                'Chennai' as city,
                'Tamil Nadu' as state,
                'Chennai, Tamil Nadu' as location
            FROM account_information ai
            WHERE ai.registration_id IN (1,2,3,4,5)
                AND ai.account_type = 'service_provider' 
                AND ai.is_active = 1
            ORDER BY ai.registration_id ASC
            LIMIT 5
        `;
        const [rows] = await db.execute(query, [serviceId]);
        return rows;
    } catch (error) {
        console.error('Get available providers query error:', error);
        throw error;
    }
};

// Get available time slots for a service
const getAvailableTimeSlots = async (serviceId) => {
    try {
        // Return default time slots since we don't have service_time_slots table
        const timeSlots = [
            { slot_id: 1, start_time: '09:00', end_time: '12:00', display_order: 1, price_modifier: 0, is_popular: 1 },
            { slot_id: 2, start_time: '12:00', end_time: '15:00', display_order: 2, price_modifier: 50, is_popular: 0 },
            { slot_id: 3, start_time: '15:00', end_time: '18:00', display_order: 3, price_modifier: 0, is_popular: 1 },
            { slot_id: 4, start_time: '18:00', end_time: '21:00', display_order: 4, price_modifier: 100, is_popular: 0 }
        ];
        return timeSlots;
    } catch (error) {
        console.error('Get available time slots query error:', error);
        throw error;
    }
};

// Get price modifier for filter selection
const getFilterPriceModifier = async (filterId, selectedValues) => {
    try {
        if (!Array.isArray(selectedValues) || selectedValues.length === 0) {
            return 0;
        }

        const placeholders = selectedValues.map(() => '?').join(',');
        const query = `
            SELECT SUM(sfo.price_modifier) as total_modifier
            FROM service_filter_options sfo
            JOIN service_filters sf ON sfo.filter_id = sf.filter_id
            WHERE sfo.filter_id = ? 
            AND sf.service_id IN (1,2,3,4,5)
            AND sfo.option_value IN (${placeholders})
            AND sfo.is_active = 1
        `;
        
        const [rows] = await db.execute(query, [filterId, ...selectedValues]);
        return rows[0]?.total_modifier || 0;
    } catch (error) {
        console.error('Get filter price modifier query error:', error);
        throw error;
    }
};

// === BOOKING QUERIES ===

// Create a new booking with enhanced data
const createBooking = async (bookingData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            customer_id,
            service_provider_id,
            service_id,
            service_date,
            start_time,
            end_time,
            total_hours,
            days_per_week,
            estimated_price,
            notes,
            special_requirements,
            location_details
        } = bookingData;

        // Ensure special_requirements is JSON or null
        const specialReq = Array.isArray(special_requirements) ? JSON.stringify(special_requirements) : null;

        // Ensure location_details is string or JSON stringified
        const locDetails = (typeof location_details === 'object') ? JSON.stringify(location_details) : location_details;

        // Ensure estimated_price is a number or default 0
        const estPrice = (estimated_price !== undefined && estimated_price !== null) ? estimated_price : 0;

        const query = `
            INSERT INTO customer_service_bookings 
            (customer_id, service_provider_id, service_id, service_date, 
             start_time, end_time, total_hours, days_per_week, 
             estimated_price, notes, special_requirements, location_details,
             booking_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
        `;

        const [result] = await connection.execute(query, [
            customer_id, service_provider_id, service_id, service_date,
            start_time, end_time, total_hours, days_per_week,
            estPrice, notes, 
            specialReq,
            locDetails
        ]);

        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        console.error('Create booking query error:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Save filter selections for a booking
const saveBookingFilters = async (bookingId, filters) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Clear existing filters for this booking
        await connection.execute(
            'DELETE FROM customer_booking_filters WHERE booking_id = ?', 
            [bookingId]
        );

        for (const filter of filters) {
            if (!filter.filter_id || !filter.selected_values || !Array.isArray(filter.selected_values)) {
                continue; // Skip invalid filters
            }

            const query = `
                INSERT INTO customer_booking_filters 
                (booking_id, filter_id, filter_name, selected_values, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `;
            
            await connection.execute(query, [
                bookingId,
                filter.filter_id,
                filter.filter_name,
                JSON.stringify(filter.selected_values)
            ]);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.error('Save booking filters query error:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Get booking by ID with basic details
const getBookingById = async (bookingId) => {
    try {
        const query = `
            SELECT 
                csb.*,
                st.name as service_name,
                st.category as service_category,
                ai.full_name as service_provider_name,
                ai.mobile_number as provider_mobile,
                ai.email_address as provider_email,
                ai.profile_image as provider_image,
                tc.name as customer_name,
                tc.mobile as customer_mobile,
                tc.email as customer_email
            FROM customer_service_bookings csb
            JOIN service_types st ON csb.service_id = st.service_id
            JOIN account_information ai ON csb.service_provider_id = ai.registration_id
            LEFT JOIN temp_customers tc ON csb.customer_id = tc.id
            WHERE csb.booking_id = ?
        `;
        const [rows] = await db.execute(query, [bookingId]);
        return rows[0];
    } catch (error) {
        console.error('Get booking by ID query error:', error);
        throw error;
    }
};

const getBookingWithDetails = async (bookingId) => {
    try {
        const query = `
            SELECT 
                csb.*,
                st.name as service_name,
                st.category as service_category,
                st.description as service_description,
                ai.full_name as service_provider_name,
                ai.mobile_number as provider_mobile,
                ai.email_address as provider_email,
                tc.name as customer_name,
                tc.mobile as customer_mobile,
                tc.email as customer_email,
                NULL as current_address,
                NULL as permanent_address,
                'Chennai' as provider_city,
                '33' as provider_state_id,
                '600001' as provider_pincode,
                13.0827 as provider_lat,
                80.2707 as provider_lng,
                4.5 as provider_rating,
                10 as total_ratings
            FROM customer_service_bookings csb
            JOIN service_types st ON csb.service_id = st.service_id
            JOIN account_information ai ON csb.service_provider_id = ai.registration_id
            LEFT JOIN temp_customers tc ON csb.customer_id = tc.id
            WHERE csb.booking_id = ?
        `;
        const [rows] = await db.execute(query, [bookingId]);
        return rows[0];
    } catch (error) {
        console.error('Get booking with details query error:', error);
        throw error;
    }
};

// Get customer bookings with filters
const getCustomerBookingsWithFilters = async (filters) => {
    try {
        let query = `
            SELECT 
                csb.*,
                st.name as service_name,
                st.category as service_category,
                ai.full_name as service_provider_name,
                ai.mobile_number as provider_mobile,
                ai.email_address as provider_email,
                ai.profile_image as provider_image,
                4.5 as provider_rating
            FROM customer_service_bookings csb
            JOIN service_types st ON csb.service_id = st.service_id
            JOIN account_information ai ON csb.service_provider_id = ai.registration_id
            WHERE csb.customer_id = ?
        `;
    
        const queryParams = [filters.customer_id];

        if (filters.status) {
            query += ' AND csb.booking_status = ?';
            queryParams.push(filters.status);
        }

        query += ' ORDER BY csb.created_at DESC';

        const [rows] = await db.execute(query, queryParams);
        return rows;

    } catch (error) {
        console.error('Get customer bookings with filters query error:', error);
        throw error;
    }
};

// Get customer booking count
const getCustomerBookingCount = async (customerId) => {
    try {
        const query = `
            SELECT COUNT(*) as total_count
            FROM customer_service_bookings
            WHERE customer_id = ?
        `;
        const [rows] = await db.execute(query, [customerId]);
        return rows[0].total_count;
    } catch (error) {
        console.error('Get customer booking count query error:', error);
        throw error;
    }
};

// Get service provider bookings with filters
const getProviderBookingsWithFilters = async (filters) => {
    try {
        let query = `
            SELECT 
                csb.*,
                st.name as service_name,
                st.category as service_category,
                tc.name as customer_name,
                tc.mobile as customer_mobile,
                tc.email as customer_email
            FROM customer_service_bookings csb
            JOIN service_types st ON csb.service_id = st.service_id
            LEFT JOIN temp_customers tc ON csb.customer_id = tc.id
            WHERE csb.service_provider_id = ?
        `;
        
        const queryParams = [filters.service_provider_id];
        
        if (filters.status) {
            query += ' AND csb.booking_status = ?';
            queryParams.push(filters.status);
        }
        
        if (filters.date_from) {
            query += ' AND csb.service_date >= ?';
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND csb.service_date <= ?';
            queryParams.push(filters.date_to);
        }
        
        query += ' ORDER BY csb.service_date ASC, csb.start_time ASC';
        
        const [rows] = await db.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Get provider bookings with filters query error:', error);
        throw error;
    }
};

// Get filter details for a booking
const getBookingFilters = async (bookingId) => {
    try {
        const query = `
            SELECT 
                cbf.filter_id,
                cbf.filter_name,
                cbf.selected_values,
                sf.filter_label,
                sf.filter_type,
                sf.section_title
            FROM customer_booking_filters cbf
            LEFT JOIN service_filters sf ON cbf.filter_id = sf.filter_id
            WHERE cbf.booking_id = ?
            ORDER BY sf.display_order ASC
        `;

        const [rows] = await db.execute(query, [bookingId]);

        return rows.map(row => ({
            filter_id: row.filter_id,
            filter_name: row.filter_name,
            filter_label: row.filter_label,
            filter_type: row.filter_type,
            section_title: row.section_title,
            selected_values: row.selected_values
        }));

    } catch (error) {
        console.error('Get booking filters query error:', error);
        throw error;
    }
};

// Update booking status with enhanced tracking
const updateBookingStatus = async (updateData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { booking_id, status, notes, reason, updated_by } = updateData;

        // Update main booking record
        const updateQuery = `
            UPDATE customer_service_bookings 
            SET booking_status = ?, 
                notes = COALESCE(?, notes), 
                updated_at = NOW()
            WHERE booking_id = ?
        `;
        
        const [result] = await connection.execute(updateQuery, [status, notes, booking_id]);

        await connection.commit();
        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        console.error('Update booking status query error:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Cancel booking with refund tracking
const cancelBooking = async (cancellationData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { booking_id, reason, refund_amount, cancellation_charges, refund_requested } = cancellationData;

        // Update booking status
        const updateQuery = `
            UPDATE customer_service_bookings 
            SET booking_status = 'cancelled', 
                notes = CONCAT(COALESCE(notes, ''), '\nCancellation Reason: ', ?),
                updated_at = NOW()
            WHERE booking_id = ?
        `;
        
        await connection.execute(updateQuery, [reason, booking_id]);

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        console.error('Cancel booking query error:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Search bookings with advanced filters
const searchBookings = async (filters) => {
    try {
        let query = `
            SELECT 
                csb.*,
                st.name as service_name,
                st.category as service_category,
                ai.full_name as service_provider_name,
                tc.name as customer_name,
                tc.mobile as customer_mobile
            FROM customer_service_bookings csb
            JOIN service_types st ON csb.service_id = st.service_id
            JOIN account_information ai ON csb.service_provider_id = ai.registration_id
            LEFT JOIN temp_customers tc ON csb.customer_id = tc.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (filters.status) {
            query += ' AND csb.booking_status = ?';
            queryParams.push(filters.status);
        }
        
        if (filters.service_id) {
            query += ' AND csb.service_id = ?';
            queryParams.push(filters.service_id);
        }
        
        if (filters.customer_id) {
            query += ' AND csb.customer_id = ?';
            queryParams.push(filters.customer_id);
        }
        
        if (filters.provider_id) {
            query += ' AND csb.service_provider_id = ?';
            queryParams.push(filters.provider_id);
        }
        
        if (filters.date_from) {
            query += ' AND csb.service_date >= ?';
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND csb.service_date <= ?';
            queryParams.push(filters.date_to);
        }
        
        // Add sorting
        const validSortColumns = ['created_at', 'service_date', 'booking_status', 'estimated_price'];
        const sortColumn = validSortColumns.includes(filters.sort_by) ? filters.sort_by : 'created_at';
        const sortOrder = filters.sort_order === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY csb.${sortColumn} ${sortOrder}`;
        
        if (filters.limit) {
            query += ' LIMIT ?';
            queryParams.push(parseInt(filters.limit));
        }
        
        if (filters.offset) {
            query += ' OFFSET ?';
            queryParams.push(parseInt(filters.offset));
        }
        
        const [rows] = await db.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Search bookings query error:', error);
        throw error;
    }
};

// Get search results count
const getSearchResultsCount = async (filters) => {
    try {
        let query = `
            SELECT COUNT(*) as total_count
            FROM customer_service_bookings csb
            JOIN service_types st ON csb.service_id = st.service_id
            JOIN account_information ai ON csb.service_provider_id = ai.registration_id
            LEFT JOIN temp_customers tc ON csb.customer_id = tc.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (filters.status) {
            query += ' AND csb.booking_status = ?';
            queryParams.push(filters.status);
        }
        
        if (filters.service_id) {
            query += ' AND csb.service_id = ?';
            queryParams.push(filters.service_id);
        }
        
        if (filters.customer_id) {
            query += ' AND csb.customer_id = ?';
            queryParams.push(filters.customer_id);
        }
        
        if (filters.provider_id) {
            query += ' AND csb.service_provider_id = ?';
            queryParams.push(filters.provider_id);
        }
        
        if (filters.date_from) {
            query += ' AND csb.service_date >= ?';
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND csb.service_date <= ?';
            queryParams.push(filters.date_to);
        }
        
        const [rows] = await db.execute(query, queryParams);
        return rows[0].total_count;
    } catch (error) {
        console.error('Get search results count query error:', error);
        throw error;
    }
};

// Get booking statistics
const getBookingStatistics = async (filters) => {
    try {
        const baseWhere = '1=1';
        let whereClause = baseWhere;
        const queryParams = [];

        if (filters.service_id) {
            whereClause += ' AND service_id = ?';
            queryParams.push(filters.service_id);
        }

        if (filters.provider_id) {
            whereClause += ' AND service_provider_id = ?';
            queryParams.push(filters.provider_id);
        }

        if (filters.period && filters.period !== 'all') {
            switch (filters.period) {
                case 'today':
                    whereClause += ' AND DATE(created_at) = CURDATE()';
                    break;
                case 'week':
                    whereClause += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    whereClause += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
            }
        }

        const queries = [
            `SELECT COUNT(*) as total_bookings FROM customer_service_bookings WHERE ${whereClause}`,
            `SELECT COUNT(*) as pending_bookings FROM customer_service_bookings WHERE ${whereClause} AND booking_status = 'pending'`,
            `SELECT COUNT(*) as confirmed_bookings FROM customer_service_bookings WHERE ${whereClause} AND booking_status = 'confirmed'`,
            `SELECT COUNT(*) as completed_bookings FROM customer_service_bookings WHERE ${whereClause} AND booking_status = 'completed'`,
            `SELECT COUNT(*) as cancelled_bookings FROM customer_service_bookings WHERE ${whereClause} AND booking_status = 'cancelled'`,
            `SELECT COALESCE(SUM(estimated_price), 0) as total_revenue FROM customer_service_bookings WHERE ${whereClause} AND booking_status = 'completed'`,
            `SELECT COALESCE(AVG(estimated_price), 0) as average_booking_value FROM customer_service_bookings WHERE ${whereClause}`,
            `SELECT COUNT(*) as todays_bookings FROM customer_service_bookings WHERE ${whereClause} AND DATE(created_at) = CURDATE()`
        ];

        const results = await Promise.all(
            queries.map(query => db.execute(query, queryParams))
        );

        return {
            total_bookings: results[0][0][0].total_bookings,
            pending_bookings: results[1][0][0].pending_bookings,
            confirmed_bookings: results[2][0][0].confirmed_bookings,
            completed_bookings: results[3][0][0].completed_bookings,
            cancelled_bookings: results[4][0][0].cancelled_bookings,
            total_revenue: parseFloat(results[5][0][0].total_revenue),
            average_booking_value: parseFloat(results[6][0][0].average_booking_value),
            todays_bookings: results[7][0][0].todays_bookings,
            completion_rate: results[0][0][0].total_bookings > 0 ? 
                (results[3][0][0].completed_bookings / results[0][0][0].total_bookings * 100).toFixed(2) : 0,
            cancellation_rate: results[0][0][0].total_bookings > 0 ? 
                (results[4][0][0].cancelled_bookings / results[0][0][0].total_bookings * 100).toFixed(2) : 0
        };
    } catch (error) {
        console.error('Get booking statistics query error:', error);
        throw error;
    }
};

// Provider service configuration functions
const saveProviderServiceConfiguration = async (configData) => {
    try {
        const query = `
            INSERT INTO provider_service_configurations 
            (provider_id, service_id, service_name, category_name, service_description, service_image_url,
             location_address, latitude, longitude, city, state, pincode, selected_filters,
             base_rate_type, base_rate, tax_percentage, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
            service_name = VALUES(service_name),
            category_name = VALUES(category_name),
            service_description = VALUES(service_description),
            service_image_url = VALUES(service_image_url),
            location_address = VALUES(location_address),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            city = VALUES(city),
            state = VALUES(state),
            pincode = VALUES(pincode),
            selected_filters = VALUES(selected_filters),
            base_rate_type = VALUES(base_rate_type),
            base_rate = VALUES(base_rate),
            tax_percentage = VALUES(tax_percentage),
            status = VALUES(status),
            updated_at = NOW()
        `;

        const queryParams = [
            configData.provider_id, configData.service_id, configData.service_name,
            configData.category_name, configData.service_description, configData.service_image_url,
            configData.location_address, configData.latitude, configData.longitude,
            configData.city, configData.state, configData.pincode, configData.selected_filters,
            configData.base_rate_type, configData.base_rate, configData.tax_percentage, configData.status
        ];

        const [result] = await db.execute(query, queryParams);
        return result.insertId || result.affectedRows;
        
    } catch (error) {
        console.error('Save provider service configuration query error:', error);
        throw error;
    }
};

// Enhanced search with better provider details
const searchProvidersByFilters = async (searchCriteria) => {
    try {
        let query = `
            SELECT 
                psc.*,
                ai.full_name as provider_name,
                ai.mobile_number as provider_mobile,
                ai.email_address as provider_email,
                ai.profile_image as provider_image,
                st.name as service_type_name,
                st.description as service_type_description
        `;

        // Add distance calculation if location provided
        if (searchCriteria.location_lat && searchCriteria.location_lng) {
            query += `,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(psc.latitude)) *
                    cos(radians(psc.longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(psc.latitude))
                )) AS distance_km
            `;
        }

        query += `
            FROM provider_service_configurations psc
            JOIN account_information ai ON psc.provider_id = ai.registration_id
            JOIN service_types st ON psc.service_id = st.service_id
            WHERE psc.service_id = ? AND psc.service_id IN (1,2,3,4,5) 
            AND psc.status = 'active' AND psc.is_active = 1
        `;

        const queryParams = [];
        
        if (searchCriteria.location_lat && searchCriteria.location_lng) {
            queryParams.push(
                searchCriteria.location_lat, 
                searchCriteria.location_lng, 
                searchCriteria.location_lat
            );
        }
        
        queryParams.push(searchCriteria.service_id);

        // Add location radius filter if provided
        if (searchCriteria.location_lat && searchCriteria.location_lng) {
            query += ` HAVING distance_km <= ?`;
            queryParams.push(searchCriteria.radius_km);
        }

        query += ` ORDER BY 
            CASE WHEN psc.status = 'active' THEN 1 ELSE 2 END,
            psc.base_rate ASC`;

        const [rows] = await db.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Enhanced search providers by filters query error:', error);
        throw error;
    }
};

// Get provider service configurations
const getProviderServiceConfigurations = async (providerId) => {
    try {
        const query = `
            SELECT 
                psc.*,
                st.name as service_type_name,
                st.description as service_type_description
            FROM provider_service_configurations psc
            JOIN service_types st ON psc.service_id = st.service_id
            WHERE psc.provider_id = ? AND psc.service_id IN (1,2,3,4,5) AND psc.is_active = 1
            ORDER BY psc.created_at DESC
        `;
        const [rows] = await db.execute(query, [providerId]);
        return rows;
    } catch (error) {
        console.error('Get provider service configurations query error:', error);
        throw error;
    }
};

const getProviderConfigurationById = async (configId) => {
    try {
        const query = `
            SELECT 
                psc.*,
                ai.full_name as provider_name,
                ai.mobile_number as provider_mobile,
                ai.email_address as provider_email
            FROM provider_service_configurations psc
            JOIN account_information ai ON psc.provider_id = ai.registration_id
            WHERE psc.config_id = ?
        `;
        const [rows] = await db.execute(query, [configId]);
        return rows[0];
    } catch (error) {
        console.error('Get provider configuration by ID query error:', error);
        throw error;
    }
};

const getActiveProviders = async () => {
    try {
        const query = `
        SELECT DISTINCT
                    ur.registration_id,
                    ai.full_name,
                    ai.email_address,
                    ai.mobile_number,
                    ur.registration_status,
                    COALESCE(pa.current_status, 'available') as availability_status
                FROM user_registrations ur
                INNER JOIN account_information ai ON ur.registration_id = ai.registration_id
                LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
                WHERE ur.registration_status = 'approved' 
                AND ur.is_completed = 1
                ORDER BY ai.full_name ASC
`;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        console.error('Get active providers query error:', error);
        throw error;
    }
};

// Customer filters functions
async function getCustomerFilters(customer_id, service_id) {
    const query = `
        SELECT * FROM customer_filters 
        WHERE customer_id = ? AND service_id = ? 
        ORDER BY updated_at DESC 
        LIMIT 1
    `;
    
    const [results] = await db.execute(query, [customer_id, service_id]);
    return results[0] || null;
}

// Save customer filters with updated structure
async function saveCustomerFilters(filterData) {
    const query = `
        INSERT INTO customer_filters 
        (customer_id, customer_name, service_id, selected_filters, location_lat, location_lng, radius_km, status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        selected_filters = VALUES(selected_filters),
        location_lat = VALUES(location_lat),
        location_lng = VALUES(location_lng),
        radius_km = VALUES(radius_km),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    return await db.execute(query, [
        filterData.customer_id,
        filterData.customer_name,
        filterData.service_id,
        filterData.selected_filters,
        filterData.location_lat,
        filterData.location_lng,
        filterData.radius_km,
        filterData.status,
        filterData.created_at
    ]);
}

// Update customer filters status
async function updateCustomerFiltersStatus(customer_id, service_id, status) {
    const query = `
        UPDATE customer_filters 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE customer_id = ? AND service_id = ?
    `;
    
    return await db.execute(query, [status, customer_id, service_id]);
}

// Save booking
async function saveBooking(bookingData) {
    const query = `
        INSERT INTO service_bookings (
            booking_id, customer_id, service_id, customer_filters,
            service_address, location_lat, location_lng,
            service_start_date, service_end_date, service_start_time, service_end_time,
            total_amount, booking_charges, booking_status, payment_status, payment_method,
            remarks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    return await db.execute(query, [
        bookingData.booking_id,
        bookingData.customer_id,
        bookingData.service_id,
        bookingData.customer_filters,
        bookingData.service_address,
        bookingData.location_lat,
        bookingData.location_lng,
        bookingData.service_start_date,
        bookingData.service_end_date,
        bookingData.service_start_time,
        bookingData.service_end_time,
        bookingData.total_amount,
        bookingData.booking_charges,
        bookingData.booking_status,
        bookingData.payment_status,
        bookingData.payment_method,
        bookingData.remarks,
        bookingData.created_at,
        bookingData.updated_at
    ]);
}

// Get service with base cost
// async function getServiceWithFilterPricing(service_id) {
//     const query = `
//         SELECT st.*, 
//                st.base_price as base_cost
//         FROM service_types st
//         WHERE st.service_id = ? AND st.service_id IN (1,2,3,4,5) AND st.is_active = 1
//     `;
    
//     const [results] = await db.execute(query, [service_id]);
//     return results[0] || null;
// }
// Get service with base cost - CORRECTED for your schema
async function getServiceWithFilterPricing(service_id) {
    const query = `
        SELECT s.service_id, s.name as service_name, s.description, s.category, 
               s.base_price, s.icon_url, s.service_code
        FROM service_types s
        WHERE s.service_id = ? AND s.is_active = 1
    `;
    
    const [results] = await db.execute(query, [service_id]);
    return results[0] || null;
}

// Get filter pricing using your existing service_filter_options table
async function getFilterPricing(service_id, filter_name = null) {
    let query = `
        SELECT sf.filter_name, sfo.option_value as filter_value, sfo.price_modifier as price 
        FROM service_filters sf
        JOIN service_filter_options sfo ON sf.filter_id = sfo.filter_id
        WHERE sf.service_id = ? AND sf.service_id IN (1,2,3,4,5) 
        AND sf.is_active = 1 AND sfo.is_active = 1
    `;
    let params = [service_id];
    
    if (filter_name) {
        query += ` AND sf.filter_name = ?`;
        params.push(filter_name);
    }
    
    query += ` ORDER BY sf.filter_name, sfo.price_modifier ASC`;
    
    const [results] = await db.execute(query, params);
    return results;
}

// Get service with all available filters and pricing using your existing tables
async function getServiceFiltersAndPricing(service_id) {
    const serviceQuery = `
        SELECT st.*, st.base_price
        FROM service_types st
        WHERE st.service_id = ? AND st.service_id IN (1,2,3,4,5) AND st.is_active = 1
    `;
    
    const pricingQuery = `
        SELECT sf.filter_name, sfo.option_value as filter_value, sfo.price_modifier as price 
        FROM service_filters sf
        JOIN service_filter_options sfo ON sf.filter_id = sfo.filter_id
        WHERE sf.service_id = ? AND sf.service_id IN (1,2,3,4,5) 
        AND sf.is_active = 1 AND sfo.is_active = 1
        ORDER BY sf.filter_name, sfo.price_modifier ASC
    `;
    
    const [serviceResults] = await db.execute(serviceQuery, [service_id]);
    const [pricingResults] = await db.execute(pricingQuery, [service_id]);
    
    // Group pricing by filter name
    const filterPricing = {};
    pricingResults.forEach(row => {
        if (!filterPricing[row.filter_name]) {
            filterPricing[row.filter_name] = [];
        }
        filterPricing[row.filter_name].push({
            value: row.filter_value,
            price: row.price || 0
        });
    });
    
    return {
        service: serviceResults[0] || null,
        filter_pricing: filterPricing
    };
}

// Get customer booking history
async function getCustomerBookings(customer_id, limit = 10) {
    const query = `
        SELECT sb.*, st.name as service_name, st.category as category_name
        FROM service_bookings sb
        LEFT JOIN service_types st ON sb.service_id = st.service_id
        WHERE sb.customer_id = ?
        ORDER BY sb.created_at DESC
        LIMIT ?
    `;
    
    const [results] = await db.execute(query, [customer_id, limit]);
    return results;
}

module.exports = {
    getActiveProviders,
    saveProviderServiceConfiguration,
    searchProvidersByFilters,
    getProviderServiceConfigurations,
    // Service queries
    getAllActiveServices,
    getServiceById,
    getServiceBasePrice,
    
    // Filter queries
    getServiceFilters,
    getFilterOptions,
    getAvailableProviders,
    getAvailableTimeSlots,
    getFilterPriceModifier,
    
    // Booking queries
    createBooking,
    saveBookingFilters,
    getBookingById,
    getBookingWithDetails,
    getCustomerBookingsWithFilters,
    getCustomerBookingCount,
    getProviderBookingsWithFilters,
    getBookingFilters,
    updateBookingStatus,
    cancelBooking,
    searchBookings,
    getSearchResultsCount,
    getBookingStatistics,

    getProviderConfigurationById,

    // Customer filter functions
    saveCustomerFilters,
    getCustomerFilters,
    updateCustomerFiltersStatus,
    saveBooking,
    getServiceWithFilterPricing,
    getFilterPricing,
    getServiceFiltersAndPricing,
    getCustomerBookings
};
