// controllers/bookingController.js
const { BookingQueries } = require('../queries');
const { Database } = require('../config/database');
const { BookingQueries } = require('../queries');
const { ResponseHelper } = require('../middleware');

class BookingController {
  static async createBooking(req, res) {
    try {
      const result = await Database.transaction(async (connection) => {
        const {
          customer_id, service_provider_id, service_id, service_date,
          days_per_week, notes, location_details, filter_selections = []
        } = req.body;
        
        // Create booking
        const [bookingResult] = await connection.execute(BookingQueries.createBooking(), [
          customer_id, service_provider_id, service_id, service_date,
          days_per_week, notes, location_details
        ]);
        
        const bookingId = bookingResult.insertId;
        
        // Save filter selections
        for (const filter of filter_selections) {
          await connection.execute(BookingQueries.createBookingFilter(), [
            bookingId, filter.filter_id, filter.filter_name, JSON.stringify(filter.selected_values)
          ]);
        }
        
        return bookingId;
      });
      
      return ResponseHelper.success(res, 
        { booking_id: result }, 
        'Booking created successfully', 
        201
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      return ResponseHelper.error(res, 'Failed to create booking', 500);
    }
  }

  static async getBookingDetails(req, res) {
    try {
      const { id } = req.params;
      
      const booking = await Database.query(BookingQueries.getBookingDetails(), [id]);
      
      if (booking.length === 0) {
        return ResponseHelper.error(res, 'Booking not found', 404);
      }
      
      // Get filter selections
      const filters = await Database.query(BookingQueries.getBookingFilters(), [id]);
      
      const responseData = {
        ...booking[0],
        filter_selections: filters
      };
      
      return ResponseHelper.success(res, responseData, 'Booking details retrieved successfully');
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return ResponseHelper.error(res, 'Failed to fetch booking details', 500);
    }
  }

  static async updateBookingStatus(req, res) {
    try {
      const result = await Database.transaction(async (connection) => {
        const { id } = req.params;
        const { status, cancellation_reason = null } = req.body;
        
        // Get current booking
        const currentBooking = await Database.query(
          'SELECT * FROM customer_service_bookings WHERE booking_id = ?',
          [id]
        );
        
        if (currentBooking.length === 0) {
          throw new Error('Booking not found');
        }
        
        const oldStatus = currentBooking[0].booking_status;
        
        // Update booking status
        await connection.execute(BookingQueries.updateBookingStatus(), [
          status, cancellation_reason, id
        ]);
        
        // Log status change
        await connection.execute(BookingQueries.createBookingStatusHistory(), [
          id, oldStatus, status, cancellation_reason
        ]);
        
        return true;
      });
      
      return ResponseHelper.success(res, null, 'Booking status updated successfully');
    } catch (error) {
      console.error('Error updating booking status:', error);
      if (error.message === 'Booking not found') {
        return ResponseHelper.error(res, 'Booking not found', 404);
      }
      return ResponseHelper.error(res, 'Failed to update booking status', 500);
    }
  }

  static async getProviderDashboard(req, res) {
    try {
      const { id } = req.params;
      
      // Get recent bookings
      const recentBookings = await Database.query(`
        SELECT 
          csb.*,
          tc.name as customer_name,
          st.name as service_name
        FROM customer_service_bookings csb
        LEFT JOIN temp_customers tc ON csb.customer_id = tc.id
        LEFT JOIN service_types st ON csb.service_id = st.service_id
        WHERE csb.service_provider_id = ?
        ORDER BY csb.created_at DESC
        LIMIT 10
      `, [id]);
      
      // Get earnings summary
      const earnings = await Database.query(BookingQueries.getProviderEarnings(), [id]);
      
      // Get recent ratings
      const ratings = await Database.query(`
        SELECT overall_rating, review_text, created_at
        FROM provider_ratings
        WHERE provider_registration_id = ? AND rating_status = 'active'
        ORDER BY created_at DESC
        LIMIT 5
      `, [id]);
      
      const dashboardData = {
        recent_bookings: recentBookings,
        earnings_summary: earnings[0],
        recent_ratings: ratings
      };
      
      return ResponseHelper.success(res, dashboardData, 'Dashboard data retrieved successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return ResponseHelper.error(res, 'Failed to fetch dashboard data', 500);
    }
  }
}
module.exports = {
 
  BookingController
};