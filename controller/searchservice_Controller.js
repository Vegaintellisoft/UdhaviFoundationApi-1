// UPDATED controllers/simpleController.js - Updated for new database tables
const db = require('../database/connection');

class SimpleController {
  // ENHANCED: Search service providers with better history saving
  static async searchProviders(req, res) {
    try {
      const { latitude, longitude, radius = 5, service_id, customer_id } = req.body;

      // Validation
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      if (!service_id) {
        return res.status(400).json({
          success: false,
          message: 'service_id is required'
        });
      }

      // Validate service_id is one of the supported services
      if (![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
        return res.status(400).json({
          success: false,
          message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
        });
      }

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: 'customer_id is required'
        });
      }

      // Updated query to work with new table structure
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
            WHEN psc.status = 'active' THEN 'active'
            ELSE 'inactive'
          END as status,
          CASE 
            WHEN psc.status = 'active' THEN 'Available'
            ELSE 'Not Available'
          END as availability,
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
        HAVING distance_km <= ?
        ORDER BY 
          CASE psc.status 
            WHEN 'active' THEN 1 
            ELSE 2 
          END,
          distance_km ASC
        LIMIT 20
      `;

      const [providers] = await db.execute(query, [
        latitude,
        longitude,
        latitude,
        service_id,
        radius
      ]);

      const formattedProviders = providers.map(p => ({
        service_provider_id: p.service_provider_id,
        service_provider_name: p.service_provider_name,
        latitude: parseFloat(p.latitude),
        longitude: parseFloat(p.longitude),
        service_id: parseInt(p.service_id),
        service_name: p.service_name,
        availability_status: p.availability_status,
        availability: p.availability,
        status: p.status,
        distance_km: parseFloat(p.distance_km.toFixed(2))
      }));

      // ENHANCED: Save search history with better error handling
      try {
        const searchHistoryQuery = `
          INSERT INTO temp_customer_search_history 
          (temp_customer_id, search_latitude, search_longitude, search_radius, 
           service_id, service_name, providers_found, search_timestamp) 
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        const serviceName = providers.length > 0 ? providers[0].service_name : 'Unknown Service';

        await db.execute(searchHistoryQuery, [
          customer_id,
          parseFloat(latitude),
          parseFloat(longitude),
          parseInt(radius),
          parseInt(service_id),
          serviceName,
          JSON.stringify(formattedProviders)
        ]);

        console.log('Search history saved successfully for customer:', customer_id);

      } catch (historyError) {
        console.error('Failed to save search history:', historyError);
        // Don't fail the main request if history saving fails
      }

      // Response handling
      if (providers.length === 0) {
        return res.json({
          success: true,
          message: `No service providers found for this service in ${radius}km radius`,
          data: [],
          searchDetails: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radius: parseInt(radius),
            service_id: parseInt(service_id),
            service_name: SimpleController.getServiceName(service_id)
          },
          error: 'not_found_in_radius'
        });
      }

      res.json({
        success: true,
        message: `Found ${providers.length} service providers`,
        data: formattedProviders,
        searchDetails: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius),
          service_id: parseInt(service_id),
          service_name: formattedProviders[0].service_name,
          customer_id: customer_id,
          search_saved: true
        }
      });

    } catch (error) {
      console.error('Search providers error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all services - Updated to only show the 5 main services
  static async getServices(req, res) {
    try {
      const query = `
        SELECT 
          service_id,
          name as service_name,
          description,
          is_active
        FROM service_types 
        WHERE service_id IN (1,2,3,4,5) 
        AND is_active = 1
        ORDER BY display_order ASC, name ASC
      `;

      const [services] = await db.execute(query);

      res.json({
        success: true,
        message: 'Services retrieved successfully',
        data: services,
        total: services.length
      });

    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // NEW: Get customer's search history
  static async getSearchHistory(req, res) {
    try {
      const { customer_id } = req.params;

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      const query = `
        SELECT 
          search_latitude,
          search_longitude,
          search_radius,
          service_id,
          service_name,
          providers_found,
          search_timestamp,
          DATE_FORMAT(search_timestamp, '%Y-%m-%d %H:%i:%s') as formatted_time
        FROM temp_customer_search_history 
        WHERE temp_customer_id = ? 
        AND service_id IN (1,2,3,4,5)
        ORDER BY search_timestamp DESC 
        LIMIT 10
      `;

      const [searches] = await db.execute(query, [customer_id]);

      const formattedSearches = searches.map(search => {
        let providers = [];
        try {
          providers = JSON.parse(search.providers_found || '[]');
        } catch (e) {
          providers = [];
        }

        return {
          location: {
            latitude: search.search_latitude,
            longitude: search.search_longitude,
            radius: search.search_radius
          },
          service: {
            id: search.service_id,
            name: search.service_name
          },
          providers_count: providers.length,
          providers: providers,
          searched_at: search.search_timestamp,
          formatted_time: search.formatted_time
        };
      });

      res.json({
        success: true,
        message: 'Search history retrieved successfully',
        data: formattedSearches,
        total: formattedSearches.length
      });

    } catch (error) {
      console.error('Get search history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // NEW: Get specific service details
  static async getServiceDetails(req, res) {
    try {
      const { service_id } = req.params;

      if (!service_id || ![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
        return res.status(400).json({
          success: false,
          message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
        });
      }

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
        WHERE service_id = ? 
        AND service_id IN (1,2,3,4,5)
        AND is_active = 1
      `;

      const [services] = await db.execute(query, [service_id]);

      if (services.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Service not found or inactive'
        });
      }

      // Get provider count for this service
      const countQuery = `
        SELECT COUNT(*) as provider_count
        FROM provider_service_configurations psc
        WHERE psc.service_id = ?
        AND psc.service_id IN (1,2,3,4,5)
        AND psc.status = 'active'
        AND psc.is_active = 1
      `;

      const [countResult] = await db.execute(countQuery, [service_id]);

      const serviceDetails = {
        ...services[0],
        provider_count: countResult[0].provider_count,
        service_category: SimpleController.getServiceCategory(service_id)
      };

      res.json({
        success: true,
        message: 'Service details retrieved successfully',
        data: serviceDetails
      });

    } catch (error) {
      console.error('Get service details error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // NEW: Get available providers count by service
  static async getProviderCounts(req, res) {
    try {
      const query = `
        SELECT 
          st.service_id,
          st.name as service_name,
          COUNT(psc.provider_id) as provider_count,
          COUNT(CASE WHEN psc.status = 'active' THEN 1 END) as active_providers
        FROM service_types st
        LEFT JOIN provider_service_configurations psc ON st.service_id = psc.service_id 
          AND psc.is_active = 1
        WHERE st.service_id IN (1,2,3,4,5) 
        AND st.is_active = 1
        GROUP BY st.service_id, st.name
        ORDER BY st.display_order ASC, st.name ASC
      `;

      const [results] = await db.execute(query);

      const providerCounts = results.map(result => ({
        service_id: result.service_id,
        service_name: result.service_name,
        total_providers: result.provider_count,
        active_providers: result.active_providers,
        service_category: SimpleController.getServiceCategory(result.service_id)
      }));

      res.json({
        success: true,
        message: 'Provider counts retrieved successfully',
        data: providerCounts,
        summary: {
          total_services: providerCounts.length,
          total_providers: providerCounts.reduce((sum, item) => sum + item.total_providers, 0),
          total_active_providers: providerCounts.reduce((sum, item) => sum + item.active_providers, 0)
        }
      });

    } catch (error) {
      console.error('Get provider counts error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // NEW: Search providers by location without service filter
  static async searchProvidersByLocation(req, res) {
    try {
      const { latitude, longitude, radius = 10 } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const query = `
        SELECT 
          psc.provider_id as service_provider_id,
          ai.full_name as service_provider_name,
          COALESCE(psc.latitude, 13.0827) as latitude,
          COALESCE(psc.longitude, 80.2707) as longitude,
          psc.service_id,
          st.name as service_name,
          st.category as service_category,
          psc.base_rate,
          psc.base_rate_type,
          CASE 
            WHEN psc.status = 'active' THEN 'Available'
            ELSE 'Not Available'
          END as availability,
          (6371 * acos(cos(radians(?)) * cos(radians(COALESCE(psc.latitude, 13.0827))) * 
           cos(radians(COALESCE(psc.longitude, 80.2707)) - radians(?)) + sin(radians(?)) * 
           sin(radians(COALESCE(psc.latitude, 13.0827))))) AS distance_km
        FROM provider_service_configurations psc
        JOIN account_information ai ON psc.provider_id = ai.registration_id
        JOIN service_types st ON psc.service_id = st.service_id
        WHERE psc.service_id IN (1,2,3,4,5)
          AND psc.status = 'active'
          AND psc.is_active = 1
        HAVING distance_km <= ?
        ORDER BY distance_km ASC, psc.base_rate ASC
        LIMIT 50
      `;

      const [providers] = await db.execute(query, [
        latitude,
        longitude,
        latitude,
        radius
      ]);

      const formattedProviders = providers.map(p => ({
        service_provider_id: p.service_provider_id,
        service_provider_name: p.service_provider_name,
        latitude: parseFloat(p.latitude),
        longitude: parseFloat(p.longitude),
        service_id: parseInt(p.service_id),
        service_name: p.service_name,
        service_category: p.service_category,
        base_rate: p.base_rate,
        rate_display: `₹${p.base_rate}/${p.base_rate_type.replace('per_', '')}`,
        availability: p.availability,
        distance_km: parseFloat(p.distance_km.toFixed(2))
      }));

      // Group by service type
      const groupedProviders = {};
      formattedProviders.forEach(provider => {
        if (!groupedProviders[provider.service_name]) {
          groupedProviders[provider.service_name] = [];
        }
        groupedProviders[provider.service_name].push(provider);
      });

      res.json({
        success: true,
        message: `Found ${formattedProviders.length} service providers in ${radius}km radius`,
        data: {
          all_providers: formattedProviders,
          grouped_by_service: groupedProviders,
          search_location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radius: parseInt(radius)
          },
          summary: {
            total_providers: formattedProviders.length,
            services_available: Object.keys(groupedProviders).length
          }
        }
      });

    } catch (error) {
      console.error('Search providers by location error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Helper methods
  static getServiceName(service_id) {
    const serviceNames = {
      1: 'Cook',
      2: 'Baby Sitter', 
      3: 'Elderly Care',
      4: 'Gardening',
      5: 'Driving'
    };
    return serviceNames[parseInt(service_id)] || 'Unknown Service';
  }

  static getServiceCategory(service_id) {
    const categories = {
      1: 'Food & Cooking',
      2: 'Child Care',
      3: 'Elder Care', 
      4: 'Gardening & Landscaping',
      5: 'Transportation'
    };
    return categories[parseInt(service_id)] || 'General';
  }

  // Health check for this controller
  static async healthCheck(req, res) {
    try {
      // Test database connection
      await db.execute('SELECT 1');
      
      // Check if main tables exist
      const tableCheck = await db.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name IN ('service_types', 'provider_service_configurations', 'account_information')
      `);

      // Check service count
      const [services] = await db.execute(`
        SELECT COUNT(*) as service_count 
        FROM service_types 
        WHERE service_id IN (1,2,3,4,5) AND is_active = 1
      `);

      // Check provider count
      const [providers] = await db.execute(`
        SELECT COUNT(*) as provider_count 
        FROM provider_service_configurations 
        WHERE service_id IN (1,2,3,4,5) AND is_active = 1
      `);

      res.json({
        success: true,
        message: 'Simple Controller health check passed',
        data: {
          database_connection: 'OK',
          tables_exist: tableCheck[0].count >= 3,
          supported_services: [1, 2, 3, 4, 5],
          active_services: services[0].service_count,
          registered_providers: providers[0].provider_count,
          timestamp: new Date().toISOString(),
          controller_version: '2.0.0'
        }
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }
}

module.exports = SimpleController;