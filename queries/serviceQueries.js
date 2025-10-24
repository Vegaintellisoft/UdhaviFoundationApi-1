// Enhanced queries/serviceQueries.js
const db = require('../database/connection');

// Service Category Queries
const serviceCategoryQueries = {
    // Get all service categories
    getAllCategories: async () => {
        try {
            const query = `
                SELECT 
                    service_id as category_id,
                    name,
                    description,
                    base_price,
                    icon_url,
                    is_active,
                    created_at,
                    updated_at,
                    CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END as status
                FROM service_types 
                ORDER BY created_at DESC
            `;
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            console.error('Get all categories query error:', error);
            throw error;
        }
    },

    // Get active categories for dropdown
    getActiveCategories: async () => {
        try {
            const query = `
                SELECT 
                    service_id as category_id,
                    name,
                    description
                FROM service_types 
                WHERE is_active = 1
                ORDER BY name ASC
            `;
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            console.error('Get active categories query error:', error);
            throw error;
        }
    },

    // Get category by ID
    getCategoryById: async (categoryId) => {
        try {
            const query = `
                SELECT 
                    service_id as category_id,
                    name,
                    description,
                    base_price,
                    icon_url,
                    is_active,
                    created_at,
                    updated_at,
                    CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END as status
                FROM service_types 
                WHERE service_id = ?
            `;
            const [rows] = await db.execute(query, [categoryId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Get category by ID query error:', error);
            throw error;
        }
    },

    // Get category by name
    getCategoryByName: async (name) => {
        try {
            const query = `
                SELECT service_id as category_id, name 
                FROM service_types 
                WHERE name = ?
            `;
            const [rows] = await db.execute(query, [name]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Get category by name query error:', error);
            throw error;
        }
    },

    // Create new category
    createCategory: async (categoryData) => {
        try {
            const query = `
                INSERT INTO service_types (name, description, base_price, icon_url, is_active)
                VALUES (?, ?, ?, ?, ?)
            `;
            const isActive = categoryData.status === 'Active' ? 1 : 0;
            const [result] = await db.execute(query, [
                categoryData.name,
                categoryData.description || null,
                0, // base_price default
                categoryData.icon_url || null,
                isActive
            ]);
            return result.insertId;
        } catch (error) {
            console.error('Create category query error:', error);
            throw error;
        }
    },

    // Update category
    updateCategory: async (categoryId, updateData) => {
        try {
            const fields = [];
            const values = [];

            if (updateData.name) {
                fields.push('name = ?');
                values.push(updateData.name);
            }
            if (updateData.description !== undefined) {
                fields.push('description = ?');
                values.push(updateData.description);
            }
            if (updateData.icon_url) {
                fields.push('icon_url = ?');
                values.push(updateData.icon_url);
            }
            if (updateData.status) {
                fields.push('is_active = ?');
                values.push(updateData.status === 'Active' ? 1 : 0);
            }

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(categoryId);

            const query = `UPDATE service_types SET ${fields.join(', ')} WHERE service_id = ?`;
            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Update category query error:', error);
            throw error;
        }
    }
};

// Service Queries
const serviceQueries = {
    // Get all services with category and provider info
    getAllServices: async () => {
        try {
            const query = `
                SELECT 
                    st.service_id,
                    st.name as service_name,
                    st.description,
                    st.base_price,
                    st.icon_url as service_image,
                    st.is_active,
                    st.created_at,
                    st.updated_at,
                    st.name as category_name,
                    'Demo Provider' as provider_name,
                    'Chennai, Tamil Nadu' as location_address,
                    CASE WHEN st.is_active = 1 THEN 'Active' ELSE 'Inactive' END as status,
                    0 as featured
                FROM service_types st
                ORDER BY st.created_at DESC
            `;
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            console.error('Get all services query error:', error);
            throw error;
        }
    },

    // Get active service providers
    getActiveProviders: async () => {
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
    },

    // Get service by ID
    getServiceById: async (serviceId) => {
        try {
            const query = `
                SELECT 
                    service_id,
                    name,
                    description,
                    base_price,
                    icon_url,
                    is_active,
                    category
                FROM service_types 
                WHERE service_id = ?
            `;
            const [rows] = await db.execute(query, [serviceId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Get service by ID query error:', error);
            throw error;
        }
    },

    // Get service filters
    getServiceFilters: async (serviceId) => {
        try {
            const query = `
                SELECT 
                    sf.filter_id,
                    sf.filter_name,
                    sf.filter_label,
                    sf.filter_type,
                    sf.is_required,
                    sf.display_order,
                    sf.section_id,
                    sf.section_title,
                    sf.section_description,
                    sf.section_order,
                    sf.help_text,
                    sf.placeholder,
                    sf.validation_rules
                FROM service_filters sf
                WHERE sf.service_id = ? AND sf.is_active = 1
                ORDER BY sf.section_order ASC, sf.display_order ASC
            `;
            const [rows] = await db.execute(query, [serviceId]);
            return rows;
        } catch (error) {
            console.error('Get service filters query error:', error);
            throw error;
        }
    },

    // Get filter options
    getFilterOptions: async (filterId) => {
        try {
            const query = `
                SELECT 
                    option_id,
                    option_value,
                    option_label,
                    display_order,
                    price_modifier,
                    is_active
                FROM service_filter_options 
                WHERE filter_id = ? AND is_active = 1
                ORDER BY display_order ASC
            `;
            const [rows] = await db.execute(query, [filterId]);
            return rows;
        } catch (error) {
            console.error('Get filter options query error:', error);
            throw error;
        }
    },

    // NEW: Save service filter data
    saveServiceFilterData: async (serviceId, filterData, providerId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Delete existing filter data for this service-provider combination
            await connection.execute(`
                DELETE FROM service_provider_filter_data 
                WHERE service_id = ? AND provider_id = ?
            `, [serviceId, providerId]);

            // Insert new filter data
            if (filterData && Object.keys(filterData).length > 0) {
                const insertQuery = `
                    INSERT INTO service_provider_filter_data 
                    (service_id, provider_id, filter_id, filter_value, created_at) 
                    VALUES (?, ?, ?, ?, NOW())
                `;

                for (const [filterId, value] of Object.entries(filterData)) {
                    const filterValue = typeof value === 'object' ? JSON.stringify(value) : value;
                    await connection.execute(insertQuery, [serviceId, providerId, filterId, filterValue]);
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Save service filter data query error:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // NEW: Update service filter data
    updateServiceFilterData: async (serviceId, filterData, providerId) => {
        try {
            // Use the same logic as save since we delete and re-insert
            return await serviceQueries.saveServiceFilterData(serviceId, filterData, providerId);
        } catch (error) {
            console.error('Update service filter data query error:', error);
            throw error;
        }
    },

    // NEW: Get service filter data
    getServiceFilterData: async (serviceId, providerId = null) => {
        try {
            let query, params;
            
            if (providerId) {
                query = `
                    SELECT 
                        spfd.filter_id,
                        spfd.filter_value,
                        sf.filter_name,
                        sf.filter_label,
                        sf.filter_type,
                        spfd.created_at,
                        spfd.updated_at
                    FROM service_provider_filter_data spfd
                    INNER JOIN service_filters sf ON spfd.filter_id = sf.filter_id
                    WHERE spfd.service_id = ? AND spfd.provider_id = ?
                    ORDER BY sf.display_order ASC
                `;
                params = [serviceId, providerId];
            } else {
                query = `
                    SELECT 
                        spfd.provider_id,
                        spfd.filter_id,
                        spfd.filter_value,
                        sf.filter_name,
                        sf.filter_label,
                        sf.filter_type,
                        ai.full_name as provider_name,
                        spfd.created_at,
                        spfd.updated_at
                    FROM service_provider_filter_data spfd
                    INNER JOIN service_filters sf ON spfd.filter_id = sf.filter_id
                    LEFT JOIN user_registrations ur ON spfd.provider_id = ur.registration_id
                    LEFT JOIN account_information ai ON ur.registration_id = ai.registration_id
                    WHERE spfd.service_id = ?
                    ORDER BY ai.full_name ASC, sf.display_order ASC
                `;
                params = [serviceId];
            }

            const [rows] = await db.execute(query, params);
            
            if (providerId) {
                // Return as object for specific provider
                const result = {};
                rows.forEach(row => {
                    let value = row.filter_value;
                    try {
                        // Try to parse JSON if it's a JSON string
                        value = JSON.parse(row.filter_value);
                    } catch (e) {
                        // Keep as string if not valid JSON
                    }
                    
                    result[row.filter_id] = {
                        value: value,
                        filter_name: row.filter_name,
                        filter_label: row.filter_label,
                        filter_type: row.filter_type
                    };
                });
                return result;
            } else {
                // Return grouped by provider for all providers
                const groupedData = {};
                rows.forEach(row => {
                    if (!groupedData[row.provider_id]) {
                        groupedData[row.provider_id] = {
                            provider_id: row.provider_id,
                            provider_name: row.provider_name,
                            filters: {}
                        };
                    }
                    
                    let value = row.filter_value;
                    try {
                        value = JSON.parse(row.filter_value);
                    } catch (e) {
                        // Keep as string if not valid JSON
                    }
                    
                    groupedData[row.provider_id].filters[row.filter_id] = {
                        value: value,
                        filter_name: row.filter_name,
                        filter_label: row.filter_label,
                        filter_type: row.filter_type
                    };
                });
                return Object.values(groupedData);
            }
        } catch (error) {
            console.error('Get service filter data query error:', error);
            throw error;
        }
    },

    // Get available providers for a service
    getAvailableProviders: async (serviceId) => {
        try {
            const query = `
                SELECT DISTINCT
                    ur.registration_id,
                    ai.full_name,
                    ai.email_address,
                    COALESCE(AVG(pr.overall_rating), 0) as rating,
                    COALESCE(si.experience_years, 0) as experience,
                    CONCAT(cad.city, ', ', s.state_name) as location,
                    COALESCE(pa.current_status, 'available') as availability_status
                FROM user_registrations ur
                INNER JOIN account_information ai ON ur.registration_id = ai.registration_id
                LEFT JOIN service_information si ON ur.registration_id = si.registration_id
                LEFT JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
                LEFT JOIN states s ON cad.state_id = s.state_id
                LEFT JOIN provider_availability pa ON ur.registration_id = pa.registration_id
                LEFT JOIN provider_ratings pr ON ur.registration_id = pr.provider_registration_id 
                    AND pr.rating_status = 'active'
                WHERE ur.registration_status = 'approved' 
                AND ur.is_completed = 1
                GROUP BY ur.registration_id, ai.full_name, ai.email_address, 
                         si.experience_years, cad.city, s.state_name, pa.current_status
                ORDER BY rating DESC, ai.full_name ASC
                LIMIT 20
            `;
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            console.error('Get available providers query error:', error);
            throw error;
        }
    },

    // Get available time slots
    getAvailableTimeSlots: async (serviceId) => {
        try {
            const query = `
                SELECT 
                    slot_id,
                    slot_name,
                    start_time,
                    end_time,
                    status,
                    1 as display_order,
                    0 as price_modifier
                FROM time_slots 
                WHERE status = 'Active'
                ORDER BY start_time ASC
            `;
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            console.error('Get available time slots query error:', error);
            throw error;
        }
    },

    // Create new service
    createService: async (serviceData) => {
        try {
            const query = `
                INSERT INTO service_types (name, description, base_price, icon_url, is_active, category)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db.execute(query, [
                serviceData.name,
                serviceData.description,
                serviceData.base_price || 250,
                serviceData.service_image || null,
                serviceData.status === 'Active' ? 1 : 0,
                serviceData.category || 'General'
            ]);
            return result.insertId;
        } catch (error) {
            console.error('Create service query error:', error);
            throw error;
        }
    },

    // Update service
    updateService: async (serviceId, updateData) => {
        try {
            const fields = [];
            const values = [];

            if (updateData.name) {
                fields.push('name = ?');
                values.push(updateData.name);
            }
            if (updateData.description !== undefined) {
                fields.push('description = ?');
                values.push(updateData.description);
            }
            if (updateData.base_price !== undefined) {
                fields.push('base_price = ?');
                values.push(updateData.base_price);
            }
            if (updateData.service_image) {
                fields.push('icon_url = ?');
                values.push(updateData.service_image);
            }
            if (updateData.is_active !== undefined) {
                fields.push('is_active = ?');
                values.push(updateData.is_active);
            }
            if (updateData.category) {
                fields.push('category = ?');
                values.push(updateData.category);
            }

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(serviceId);

            const query = `UPDATE service_types SET ${fields.join(', ')} WHERE service_id = ?`;
            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Update service query error:', error);
            throw error;
        }
    }
};

module.exports = {
    serviceCategoryQueries,
    serviceQueries
};