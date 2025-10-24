const db = require('../database/connection');

// Get temp customers with optional search and account_status filters
const getTempCustomersWithFilters = async (search = '', account_status = '') => {
  try {
    let query = `
     SELECT 
    c.id, c.name, c.email, c.mobile, c.is_mobile_verified,st.name AS services, 
    c.current_latitude, c.current_longitude, c.selected_address, 
    c.location_type, c.is_active, c.account_status,
    c.last_activity, c.last_login, c.created_at, c.updated_at  
FROM 
    temp_customers c
LEFT JOIN (
    SELECT 
        temp_customer_id, 
        service_id
    FROM 
        temp_customer_search_history sch1
    WHERE 
        sch1.search_timestamp = (
            SELECT MAX(search_timestamp)
            FROM temp_customer_search_history sch2
            WHERE sch2.temp_customer_id = sch1.temp_customer_id
        )
) last_search ON c.id = last_search.temp_customer_id
LEFT JOIN service_types st ON last_search.service_id = st.service_id
     WHERE 1=1`;

    const queryParams = [];

    if (search && search.trim() !== '') {
      query += ` AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)`;
      const likeSearch = `%${search}%`;
      queryParams.push(likeSearch, likeSearch, likeSearch);
    }

    if (account_status !== '' && account_status !== null && account_status !== undefined) {
      query += ` AND account_status = ?`;
      queryParams.push(account_status);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(query, queryParams);
    console.log('Fetched temp customers:', rows);
    console.log('With filters - search:', search, 'account_status:', account_status,queryParams);
    return rows;
  } catch (error) {
    console.error('Error in getTempCustomersWithFilters:', error);
    throw error;
  }
};

// Get temp customer by ID
const getTempCustomerById = async (customerId) => {
  try {
    const query = `
      SELECT id, name, email, mobile, is_mobile_verified, 
             current_latitude, current_longitude, selected_address, 
             location_type, is_active, account_status,
             last_activity, last_login, created_at, updated_at
      FROM temp_customers
      WHERE id = ?
    `;

    const [rows] = await db.execute(query, [customerId]);

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error in getTempCustomerById:', error);
    throw error;
  }
};

// Update temp customer account status
const updateTempCustomerAccountStatus = async (customerId, account_status) => {
  try {
    const query = `
      UPDATE temp_customers 
      SET account_status = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await db.execute(query, [account_status, customerId]);

    // Return updated customer details
    return await getTempCustomerById(customerId);
  } catch (error) {
    console.error('Error in updateTempCustomerAccountStatus:', error);
    throw error;
  }
};

module.exports = {
  getTempCustomersWithFilters,
  getTempCustomerById,
  updateTempCustomerAccountStatus
};
