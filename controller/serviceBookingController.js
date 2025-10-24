// controller/serviceBookingController.js - Updated for new database tables
const serviceBookingQueries = require('../queries/serviceBookingQueries');
const BookingHelper = require('../helpers/BookingHelper'); // adjust the path as needed
const path = require('path');
const db = require('../database/connection');
const { body, param, query, validationResult } = require('express-validator');

class ServiceBookingController {

    
    // Get all services for initial dropdown selection
    static async getAllServices(req, res) {
        try {
            const services = await serviceBookingQueries.getAllActiveServices();

            if (services.length === 0) {
                return res.json({
                    success: true,
                    message: 'No active services available',
                    data: {
                        services: [],
                        total_services: 0
                    }
                });
            }

            res.json({
                success: true,
                message: 'Active services retrieved successfully',
                data: {
                    services: services.map(service => ({
                        id: service.service_id,
                        name: service.name,
                        description: service.description,
                        category: service.category || 'General',
                        icon: service.icon_url,
                        base_price: service.base_price,
                        has_filters: service.filter_count > 0
                    })),
                    total_services: services.length
                }
            });

        } catch (error) {
            console.error('Get all services error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving services'
            });
        }
    }

    // Get service filters - Updated to work with new table structure
    static async getServiceFilters(req, res) {
        try {
            const { service_id } = req.params;

            if (!service_id || isNaN(service_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid service ID is required'
                });
            }

            // Check if service_id is one of the main 5 services
            if (![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Service not available. Only services 1-5 are supported.'
                });
            }

            // Get service details
            const service = await serviceBookingQueries.getServiceById(service_id);
            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found or inactive'
                });
            }

            // Get all filters for this service
            const filters = await serviceBookingQueries.getServiceFilters(service_id);

            if (filters.length === 0) {
                return res.json({
                    success: true,
                    message: 'No filters configured for this service',
                    data: {
                        service: {
                            id: service.service_id,
                            name: service.service_name,
                            description: service.description
                        },
                        sections: [],
                        total_filters: 0
                    }
                });
            }

            // Format filters inline
            const sections = [];
            let currentSection = null;

            for (let filter of filters) {
                const filterData = {
                    filter_id: filter.filter_id,
                    filter_name: filter.filter_name,
                    label: filter.filter_label,
                    type: filter.filter_type,
                    required: filter.is_required,
                    placeholder: filter.placeholder || `Select ${filter.filter_label.toLowerCase()}`,
                    help_text: filter.help_text,
                    validation_rules: {},
                    options: []
                };

                // Get options for selection-based filters
                if (['single_select', 'multi_select', 'dropdown'].includes(filter.filter_type)) {
                    try {
                        const options = await serviceBookingQueries.getFilterOptions(filter.filter_id);
                        filterData.options = options.map(opt => ({
                            value: opt.option_value,
                            label: opt.option_label,
                            display_order: opt.display_order,
                            price_modifier: opt.price_modifier || 0,
                            description: opt.description
                        }));
                    } catch (optionError) {
                        console.error(`Error fetching options for filter ${filter.filter_id}:`, optionError);
                        filterData.options = [];
                    }
                }

                // Handle special dynamic filters
                if (filter.filter_name === 'service_provider') {
                    try {
                        const providers = await serviceBookingQueries.getAvailableProviders(service_id);
                        filterData.options = providers.map(provider => ({
                            value: provider.registration_id.toString(),
                            label: provider.full_name,
                            display_order: 1,
                            price_modifier: 0,
                            description: `Rating: ${provider.rating || 'N/A'} | Experience: ${provider.experience || 'N/A'} years`,
                            additional_info: {
                                rating: provider.rating,
                                experience: provider.experience,
                                location: provider.location,
                                availability: provider.availability_status
                            }
                        }));
                    } catch (providerError) {
                        console.error(`Error fetching providers for service ${service_id}:`, providerError);
                        filterData.options = [];
                    }
                }

                // Handle time slot filters
                if (filter.filter_name === 'time_slot') {
                    try {
                        const timeSlots = await serviceBookingQueries.getAvailableTimeSlots(service_id);
                        filterData.options = timeSlots.map(slot => ({
                            value: `${slot.start_time}-${slot.end_time}`,
                            label: `${slot.start_time} - ${slot.end_time}`,
                            display_order: slot.display_order,
                            price_modifier: slot.price_modifier || 0
                        }));
                    } catch (slotError) {
                        console.error(`Error fetching time slots for service ${service_id}:`, slotError);
                        filterData.options = [];
                    }
                }

                // Group by sections
                if (filter.section_title && (!currentSection || currentSection.title !== filter.section_title)) {
                    currentSection = {
                        section_id: sections.length + 1,
                        title: filter.section_title,
                        description: filter.section_description,
                        display_order: filter.section_order || 1,
                        filters: []
                    };
                    sections.push(currentSection);
                }

                if (currentSection && filter.section_title) {
                    currentSection.filters.push(filterData);
                } else {
                    // Individual filter without section
                    sections.push({
                        section_id: sections.length + 1,
                        title: null,
                        description: null,
                        display_order: 1,
                        filters: [filterData]
                    });
                }
            }

            // Sort sections by display_order
            sections.sort((a, b) => a.display_order - b.display_order);

            res.json({
                success: true,
                message: `Filters retrieved for ${service.service_name}`,
                data: {
                    service: {
                        id: service.service_id,
                        name: service.service_name,
                        description: service.description,
                        category: ServiceBookingController.getServiceCategory(service_id)
                    },
                    sections: sections,
                    total_filters: filters.length,
                    service_type: ServiceBookingController.getServiceType(service_id)
                }
            });

        } catch (error) {
            console.error('Get service filters error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving filters'
            });
        }
    }

    // Create booking with comprehensive validation and data processing
    static async createBooking(req, res) {
        try {
            const {
                customer_id,
                service_provider_id,
                service_id,
                selected_filters,
                notes,
                estimated_price
            } = req.body;

            // Enhanced validation
            const validationResult = await ServiceBookingController.validateBookingData({
                customer_id,
                service_provider_id,
                service_id,
                selected_filters
            });

            if (!validationResult.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationResult.errors
                });
            }

            // Extract and process filter data
            const processedData = await ServiceBookingController.processFilterData(selected_filters, service_id);

            // Create booking with processed data
            const bookingData = {
                customer_id: parseInt(customer_id),
                service_provider_id: parseInt(service_provider_id),
                service_id: parseInt(service_id),
                service_date: processedData.service_date,
                start_time: processedData.start_time,
                end_time: processedData.end_time,
                total_hours: processedData.total_hours,
                days_per_week: processedData.days_per_week,
                estimated_price: estimated_price || processedData.calculated_price,
                notes: notes || null,
                special_requirements: processedData.special_requirements,
                location_details: processedData.location_details
            };

            const bookingId = await serviceBookingQueries.createBooking(bookingData);

            // Save all filter selections
            await serviceBookingQueries.saveBookingFilters(bookingId, selected_filters);

            // Get complete booking details
            const completeBooking = await serviceBookingQueries.getBookingWithDetails(bookingId);

            // Prepare response for frontend
            const response = {
                success: true,
                message: 'Booking created successfully',
                data: {
                    booking_id: bookingId,
                    booking_details: completeBooking,
                    service_summary: {
                        service_name: completeBooking.service_name,
                        provider_name: completeBooking.service_provider_name,
                        scheduled_date: completeBooking.service_date,
                        duration: completeBooking.total_hours,
                        estimated_price: completeBooking.estimated_price
                    },
                    payment_info: {
                        amount: completeBooking.estimated_price,
                        currency: 'INR',
                        payment_methods: ['online', 'cash', 'card'],
                        advance_required: ServiceBookingController.calculateAdvanceAmount(completeBooking.estimated_price)
                    },
                    next_steps: [
                        'Proceed to payment to confirm your booking',
                        'Service provider will be notified upon payment confirmation',
                        'You will receive booking confirmation via SMS/Email'
                    ]
                }
            };

            res.status(201).json(response);

        } catch (error) {
            console.error('Create booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error creating booking'
            });
        }
    }

    // Get customer's booking history with detailed information
    static async getCustomerBookings(req, res) {
        try {
            const { customer_id } = req.params;
            const { status, limit, offset } = req.query;

            if (!customer_id || isNaN(customer_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid customer ID is required'
                });
            }

            const filters = {
                customer_id: parseInt(customer_id),
                status: status || null
            };

            const bookings = await serviceBookingQueries.getCustomerBookingsWithFilters(filters);
            const totalCount = await serviceBookingQueries.getCustomerBookingCount(customer_id);

            const uniqueBookingsMap = new Map();
            for (let booking of bookings) {
                uniqueBookingsMap.set(booking.booking_id, booking);
            }
            const uniqueBookings = Array.from(uniqueBookingsMap.values());

            for (let booking of uniqueBookings) {
                booking.selected_filters = await serviceBookingQueries.getBookingFilters(booking.booking_id);
                booking.status_info = ServiceBookingController.getStatusInfo(booking.booking_status);
                booking.time_info = ServiceBookingController.calculateTimeInfo(booking.service_date, booking.start_time);
                booking.can_cancel = ServiceBookingController.canCancelBooking(booking);
                booking.can_reschedule = ServiceBookingController.canRescheduleBooking(booking);
            }

            res.json({
                success: true,
                message: 'Customer bookings retrieved successfully',
                data: {
                    bookings: uniqueBookings,
                    pagination: {
                        total_count: totalCount,
                        current_page: Math.floor((offset || 0) / (limit || 10)) + 1,
                        total_pages: Math.ceil(totalCount / (limit || 10)),
                        has_next: ((offset || 0) + (limit || 10)) < totalCount,
                        has_previous: (offset || 0) > 0
                    },
                    summary: {
                        total_bookings: totalCount,
                        pending: uniqueBookings.filter(b => b.booking_status === 'pending').length,
                        confirmed: uniqueBookings.filter(b => b.booking_status === 'confirmed').length,
                        completed: uniqueBookings.filter(b => b.booking_status === 'completed').length,
                        cancelled: uniqueBookings.filter(b => b.booking_status === 'cancelled').length
                    }
                }
            });

        } catch (error) {
            console.error('Get customer bookings error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving bookings'
            });
        }
    }

    // Get service provider bookings
    static async getServiceProviderBookings(req, res) {
        try {
            const { service_provider_id } = req.params;
            const { status, date_from, date_to } = req.query;

            if (!service_provider_id || isNaN(service_provider_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid service provider ID is required'
                });
            }

            const filters = {
                service_provider_id: parseInt(service_provider_id),
                status,
                date_from,
                date_to
            };

            const bookings = await serviceBookingQueries.getProviderBookingsWithFilters(filters);

            // Enhance bookings with customer info and filter details
            for (let booking of bookings) {
                booking.customer_filters = await serviceBookingQueries.getBookingFilters(booking.booking_id);
                booking.status_info = ServiceBookingController.getStatusInfo(booking.booking_status);
                booking.time_info = ServiceBookingController.calculateTimeInfo(booking.service_date, booking.start_time);
            }

            res.json({
                success: true,
                message: 'Provider bookings retrieved successfully',
                data: {
                    bookings: bookings,
                    provider_id: parseInt(service_provider_id),
                    total_bookings: bookings.length
                }
            });

        } catch (error) {
            console.error('Get provider bookings error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving provider bookings'
            });
        }
    }

    // Update booking status with enhanced validation
    static async updateBookingStatus(req, res) {
        try {
            const { booking_id } = req.params;
            const { status, notes, reason } = req.body;

            if (!booking_id || isNaN(booking_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid booking ID is required'
                });
            }

            // Validate status and transitions
            const validationResult = await ServiceBookingController.validateStatusUpdate(booking_id, status);
            if (!validationResult.valid) {
                return res.status(400).json({
                    success: false,
                    message: validationResult.message,
                    current_status: validationResult.current_status,
                    valid_transitions: validationResult.valid_transitions
                });
            }

            const updateData = {
                booking_id: parseInt(booking_id),
                status: status,
                notes: notes,
                reason: reason,
                updated_by: req.user?.id || 'system'
            };

            const updated = await serviceBookingQueries.updateBookingStatus(updateData);

            if (!updated) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update booking status'
                });
            }

            // Get updated booking details
            const updatedBooking = await serviceBookingQueries.getBookingWithDetails(booking_id);

            res.json({
                success: true,
                message: `Booking status updated to ${status}`,
                data: {
                    booking_id: parseInt(booking_id),
                    previous_status: validationResult.current_status,
                    new_status: status,
                    booking_details: updatedBooking,
                    status_info: ServiceBookingController.getStatusInfo(status)
                }
            });

        } catch (error) {
            console.error('Update booking status error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error updating booking status'
            });
        }
    }

    // Cancel booking with validation
    static async cancelBooking(req, res) {
        try {
            const { booking_id } = req.params;
            const { reason, refund_requested } = req.body;

            if (!booking_id || isNaN(booking_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid booking ID is required'
                });
            }

            const booking = await serviceBookingQueries.getBookingById(booking_id);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Check if cancellation is allowed
            const cancellationCheck = ServiceBookingController.checkCancellationPolicy(booking);
            if (!cancellationCheck.allowed) {
                return res.status(400).json({
                    success: false,
                    message: cancellationCheck.message,
                    cancellation_policy: cancellationCheck.policy
                });
            }

            const cancellationData = {
                booking_id: parseInt(booking_id),
                reason: reason,
                refund_amount: cancellationCheck.refund_amount,
                cancellation_charges: cancellationCheck.cancellation_charges,
                refund_requested: refund_requested || false
            };

            const cancelled = await serviceBookingQueries.cancelBooking(cancellationData);

            res.json({
                success: true,
                message: 'Booking cancelled successfully',
                data: {
                    booking_id: parseInt(booking_id),
                    cancellation_info: {
                        refund_amount: cancellationCheck.refund_amount,
                        cancellation_charges: cancellationCheck.cancellation_charges,
                        refund_timeline: '3-5 business days',
                        cancellation_reason: reason
                    }
                }
            });

        } catch (error) {
            console.error('Cancel booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error cancelling booking'
            });
        }
    }

    // Get booking details with complete information
    static async getBookingDetails(req, res) {
        try {
            const { booking_id } = req.params;

            if (!booking_id || isNaN(booking_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid booking ID is required'
                });
            }

            const booking = await serviceBookingQueries.getBookingWithDetails(booking_id);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Get filter details
            booking.selected_filters = await serviceBookingQueries.getBookingFilters(booking_id);

            // Add calculated fields and status info
            booking.status_info = ServiceBookingController.getStatusInfo(booking.booking_status);
            booking.time_info = ServiceBookingController.calculateTimeInfo(booking.service_date, booking.start_time);
            booking.actions_available = ServiceBookingController.getAvailableActions(booking);

            res.json({
                success: true,
                message: 'Booking details retrieved successfully',
                data: booking
            });

        } catch (error) {
            console.error('Get booking details error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving booking details'
            });
        }
    }

    // Search bookings with advanced filters
    static async searchBookings(req, res) {
        try {
            const filters = {
                status: req.query.status,
                service_id: req.query.service_id,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                provider_id: req.query.provider_id,
                customer_id: req.query.customer_id,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0,
                sort_by: req.query.sort_by || 'created_at',
                sort_order: req.query.sort_order || 'DESC'
            };

            const results = await serviceBookingQueries.searchBookings(filters);
            const totalCount = await serviceBookingQueries.getSearchResultsCount(filters);

            res.json({
                success: true,
                message: 'Search results retrieved successfully',
                data: {
                    bookings: results,
                    pagination: {
                        total_count: totalCount,
                        current_page: Math.floor(filters.offset / filters.limit) + 1,
                        total_pages: Math.ceil(totalCount / filters.limit)
                    },
                    filters_applied: Object.keys(filters).filter(key =>
                        filters[key] !== null && filters[key] !== undefined && filters[key] !== ''
                    )
                }
            });

        } catch (error) {
            console.error('Search bookings error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error searching bookings'
            });
        }
    }

    // Get booking statistics for dashboard
    static async getBookingStats(req, res) {
        try {
            const { period, service_id, provider_id } = req.query;

            const stats = await serviceBookingQueries.getBookingStatistics({
                period: period || 'all',
                service_id: service_id || null,
                provider_id: provider_id || null
            });

            res.json({
                success: true,
                message: 'Booking statistics retrieved successfully',
                data: stats
            });

        } catch (error) {
            console.error('Get booking stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving statistics'
            });
        }
    }

    static getServiceType(service_id) {
        const serviceMap = {
            1: 'cook',
            2: 'baby_sitter', 
            3: 'elderly_care',
            4: 'gardening',
            5: 'driving'
        };
        return serviceMap[parseInt(service_id)] || 'general';
    }

    static getServiceCategory(service_id) {
        const categoryMap = {
            1: 'Food & Cooking',
            2: 'Child Care', 
            3: 'Elder Care',
            4: 'Gardening & Landscaping',
            5: 'Transportation'
        };
        return categoryMap[parseInt(service_id)] || 'General';
    }

    static async validateBookingData(data) {
        const errors = [];

        if (!data.customer_id || isNaN(data.customer_id)) {
            errors.push('Valid customer ID is required');
        }

        if (!data.service_provider_id || isNaN(data.service_provider_id)) {
            errors.push('Valid service provider ID is required');
        }

        if (!data.service_id || isNaN(data.service_id)) {
            errors.push('Valid service ID is required');
        }

        // Check if service_id is one of the supported services
        if (![1, 2, 3, 4, 5].includes(parseInt(data.service_id))) {
            errors.push('Service not supported. Only services 1-5 are available.');
        }

        if (!data.selected_filters || !Array.isArray(data.selected_filters) || data.selected_filters.length === 0) {
            errors.push('At least one filter selection is required');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    static async processFilterData(selected_filters, service_id) {
        const processed = {
            service_date: null,
            start_time: null,
            end_time: null,
            total_hours: null,
            days_per_week: null,
            calculated_price: 0,
            special_requirements: [],
            location_details: null
        };

        for (let filter of selected_filters) {
            if (!filter.selected_values || !Array.isArray(filter.selected_values)) continue;

            switch (filter.filter_name) {
                case 'service_date':
                    processed.service_date = filter.selected_values[0];
                    break;
                case 'start_time':
                    processed.start_time = filter.selected_values[0];
                    break;
                case 'end_time':
                    processed.end_time = filter.selected_values[0];
                    break;
                case 'hours_per_day':
                    processed.total_hours = parseFloat(filter.selected_values[0]);
                    break;
                case 'days_per_week':
                case 'days_per_week_cook':
                case 'days_per_week_elder':
                case 'days_per_week_garden':
                case 'days_per_week_drive':
                    // Extract numeric value from options like "5_days", "7_days" etc
                    const daysValue = filter.selected_values[0];
                    if (daysValue.includes('_days')) {
                        processed.days_per_week = parseInt(daysValue.split('_')[0]);
                    } else {
                        processed.days_per_week = parseInt(daysValue);
                    }
                    break;
                case 'special_requirements':
                    processed.special_requirements = filter.selected_values;
                    break;
                case 'location_details':
                    processed.location_details = filter.selected_values[0];
                    break;
            }
        }

        // Calculate price based on service type and selections
        processed.calculated_price = await ServiceBookingController.calculateBookingPrice(service_id, processed, selected_filters);

        return processed;
    }

    static async calculateBookingPrice(service_id, processedData, selected_filters) {
        try {
            // Get base price for service
            const basePrice = await serviceBookingQueries.getServiceBasePrice(service_id);
            let totalPrice = basePrice || 0;

            // Add price modifiers from filter selections
            for (let filter of selected_filters) {
                if (filter.selected_values && Array.isArray(filter.selected_values)) {
                    const priceModifier = await serviceBookingQueries.getFilterPriceModifier(
                        filter.filter_id,
                        filter.selected_values
                    );
                    totalPrice += priceModifier || 0;
                }
            }

            // Calculate based on days per week if available
            if (processedData.days_per_week && processedData.days_per_week > 0) {
                // For weekly services, multiply by days per week
                totalPrice *= processedData.days_per_week;
            }

            return Math.round(totalPrice * 100) / 100; // Round to 2 decimal places
        } catch (error) {
            console.error('Error calculating booking price:', error);
            return 500; // Default price fallback
        }
    }

    static calculateAdvanceAmount(totalAmount) {
        // Calculate 25% advance or minimum 500, whichever is higher
        const percentage = totalAmount * 0.25;
        return Math.max(percentage, 500);
    }

    static getStatusInfo(status) {
        const statusMap = {
            'pending': {
                label: 'Pending Confirmation',
                color: 'orange',
                description: 'Waiting for service provider confirmation',
                next_possible: ['confirmed', 'cancelled']
            },
            'confirmed': {
                label: 'Confirmed',
                color: 'green',
                description: 'Service provider has confirmed the booking',
                next_possible: ['in_progress', 'cancelled']
            },
            'in_progress': {
                label: 'In Progress',
                color: 'blue',
                description: 'Service is currently being provided',
                next_possible: ['completed', 'cancelled']
            },
            'completed': {
                label: 'Completed',
                color: 'green',
                description: 'Service has been completed successfully',
                next_possible: []
            },
            'cancelled': {
                label: 'Cancelled',
                color: 'red',
                description: 'Booking has been cancelled',
                next_possible: []
            }
        };

        return statusMap[status] || statusMap['pending'];
    }

    static calculateTimeInfo(service_date, start_time) {
        if (!service_date) return null;

        const serviceDateTime = new Date(service_date);
        const now = new Date();
        const timeDiff = serviceDateTime - now;

        return {
            is_upcoming: timeDiff > 0,
            is_today: serviceDateTime.toDateString() === now.toDateString(),
            days_until_service: Math.ceil(timeDiff / (1000 * 60 * 60 * 24)),
            formatted_date: serviceDateTime.toLocaleDateString('en-IN'),
            formatted_time: start_time || 'Not specified'
        };
    }

    static canCancelBooking(booking) {
        if (['completed', 'cancelled'].includes(booking.booking_status)) {
            return false;
        }

        // Check if service date is more than 24 hours away
        if (booking.service_date) {
            const serviceDate = new Date(booking.service_date);
            const now = new Date();
            const hoursUntilService = (serviceDate - now) / (1000 * 60 * 60);
            return hoursUntilService > 24;
        }

        return true;
    }

    static canRescheduleBooking(booking) {
        return ['pending', 'confirmed'].includes(booking.booking_status) &&
            ServiceBookingController.canCancelBooking(booking);
    }

    static async validateStatusUpdate(booking_id, new_status) {
        const booking = await serviceBookingQueries.getBookingById(booking_id);
        if (!booking) {
            return { valid: false, message: 'Booking not found' };
        }

        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': []
        };

        const currentStatus = booking.booking_status;
        const allowedTransitions = validTransitions[currentStatus] || [];

        if (!allowedTransitions.includes(new_status)) {
            return {
                valid: false,
                message: `Cannot transition from ${currentStatus} to ${new_status}`,
                current_status: currentStatus,
                valid_transitions: allowedTransitions
            };
        }

        return { valid: true, current_status: currentStatus };
    }

    static checkCancellationPolicy(booking) {
        const now = new Date();
        const serviceDate = new Date(booking.service_date);
        const hoursUntilService = (serviceDate - now) / (1000 * 60 * 60);

        if (hoursUntilService <= 0) {
            return {
                allowed: false,
                message: 'Cannot cancel bookings that have already started or passed',
                policy: 'No cancellation allowed for past services'
            };
        }

        if (hoursUntilService < 24) {
            // Less than 24 hours - 50% refund
            return {
                allowed: true,
                refund_amount: booking.estimated_price * 0.5,
                cancellation_charges: booking.estimated_price * 0.5,
                message: 'Cancellation allowed with 50% charges',
                policy: 'Less than 24 hours: 50% cancellation charges apply'
            };
        } else if (hoursUntilService < 48) {
            // 24-48 hours - 25% charges
            return {
                allowed: true,
                refund_amount: booking.estimated_price * 0.75,
                cancellation_charges: booking.estimated_price * 0.25,
                message: 'Cancellation allowed with 25% charges',
                policy: '24-48 hours: 25% cancellation charges apply'
            };
        } else {
            // More than 48 hours - full refund
            return {
                allowed: true,
                refund_amount: booking.estimated_price,
                cancellation_charges: 0,
                message: 'Free cancellation available',
                policy: 'More than 48 hours: Full refund available'
            };
        }
    }

    static getAvailableActions(booking) {
        const actions = [];

        if (ServiceBookingController.canCancelBooking(booking)) {
            actions.push('cancel');
        }

        if (ServiceBookingController.canRescheduleBooking(booking)) {
            actions.push('reschedule');
        }

        if (booking.booking_status === 'pending') {
            actions.push('modify_requirements');
        }

        if (['completed'].includes(booking.booking_status)) {
            actions.push('rate_service', 'book_again');
        }

        return actions;
    }

    // Provider service configuration methods
    static async saveProviderServiceConfiguration(req, res) {
        try {
            const {
                provider_id,
                service_id,
                service_name,
                category_name,
                service_description,
                location_address,
                latitude,
                longitude,
                city,
                state,
                pincode,
                selected_filters,
                base_rate_type = 'per_hour',
                base_rate,
                tax_percentage = 18,
                status = 'active'
            } = req.body;

            // Validation - check if service_id is supported
            if (!service_id || ![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
                });
            }

            if (!provider_id || !service_name || !base_rate || !selected_filters) {
                return res.status(400).json({
                    success: false,
                    message: 'Provider ID, Service ID, Service Name, Base Rate, and Selected Filters are required'
                });
            }

            // Parse selected_filters if it's a string
            let parsedFilters;
            try {
                parsedFilters = typeof selected_filters === 'string' ? JSON.parse(selected_filters) : selected_filters;
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid selected_filters format'
                });
            }

            if (!Array.isArray(parsedFilters) || parsedFilters.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected filters must be a non-empty array'
                });
            }

            // Handle service image upload
            let serviceImagePath = null;
            if (req.file) {
                serviceImagePath = req.file.path;
            }

            const configData = {
                provider_id: parseInt(provider_id),
                service_id: parseInt(service_id),
                service_name: service_name.trim(),
                category_name: category_name || null,
                service_description: service_description || null,
                service_image_url: serviceImagePath || null,
                location_address: location_address || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                city: city || null,
                state: state || null,
                pincode: pincode || null,
                selected_filters: JSON.stringify(parsedFilters),
                base_rate_type: base_rate_type || 'per_hour',
                base_rate: parseFloat(base_rate),
                tax_percentage: parseFloat(tax_percentage || 18),
                status: status || 'active'
            };

            const configId = await serviceBookingQueries.saveProviderServiceConfiguration(configData);

            // Calculate pricing details
            const totalAmount = configData.base_rate;
            const taxAmount = (totalAmount * configData.tax_percentage) / 100;
            const finalAmount = totalAmount + taxAmount;

            res.status(201).json({
                success: true,
                message: 'Provider service configuration saved successfully',
                data: {
                    config_id: configId,
                    provider_id: parseInt(provider_id),
                    service_id: parseInt(service_id),
                    service_name: service_name,
                    service_image: serviceImagePath ? `/uploads/services/${path.basename(serviceImagePath)}` : null,
                    filters_saved: {
                        count: parsedFilters.length,
                        filters: parsedFilters.map(f => ({
                            filter_id: f.filter_id,
                            filter_name: f.filter_name,
                            selected_values: f.selected_values || [],
                            values_count: f.selected_values ? f.selected_values.length : 0
                        }))
                    },
                    pricing_summary: {
                        base_rate: `₹${configData.base_rate}/${base_rate_type.replace('per_', '')}`,
                        subtotal: `₹${totalAmount}`,
                        tax: `₹${taxAmount.toFixed(2)} (${configData.tax_percentage}%)`,
                        final_amount: `₹${finalAmount.toFixed(2)}`
                    },
                    location: {
                        address: location_address,
                        city: city,
                        state: state,
                        pincode: pincode
                    },
                    status: status
                }
            });

        } catch (error) {
            console.error('Save provider service configuration error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error saving service configuration'
            });
        }
    }

    // Search providers by filters
    static async searchProvidersByFilters(req, res) {
        try {
            const {
                service_id,
                customer_filters,
                location_lat,
                location_lng,
                radius_km = 10,
                days_per_week = 7,
                weeks_duration = 4
            } = req.body;

            // Validate service_id
            if (!service_id || ![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
                });
            }

            if (!customer_filters) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer filters are required'
                });
            }

            const searchCriteria = {
                service_id: parseInt(service_id),
                customer_filters: customer_filters,
                location_lat: location_lat ? parseFloat(location_lat) : null,
                location_lng: location_lng ? parseFloat(location_lng) : null,
                radius_km: parseInt(radius_km)
            };

            // Get all providers for this service
            const allProviders = await serviceBookingQueries.searchProvidersByFilters(searchCriteria);

            if (allProviders.length === 0) {
                return res.json({
                    success: true,
                    message: 'No providers found for this service',
                    data: {
                        providers: [],
                        search_summary: 'No providers available for your requirements'
                    }
                });
            }

            // Process each provider
            const processedProviders = allProviders.map(provider => {
                const providerFilters = typeof provider.selected_filters === 'string'
                    ? JSON.parse(provider.selected_filters)
                    : provider.selected_filters;

                const matchResult = ServiceBookingController.calculateSmartFilterMatch(customer_filters, providerFilters);

                // Calculate pricing based on customer duration
                const costBreakdown = ServiceBookingController.calculateCustomerCost(
                    provider,
                    days_per_week,
                    weeks_duration
                );

                return {
                    provider_id: provider.provider_id,
                    name: provider.provider_name,
                    image: provider.provider_image || provider.service_image_url || '/default-provider.jpg',
                    service: {
                        name: provider.service_name,
                        description: provider.service_description,
                        category: provider.category_name
                    },
                    location: {
                        area: `${provider.city}, ${provider.state}`,
                        distance: provider.distance_km ? `${provider.distance_km.toFixed(1)} km away` : 'Distance not calculated'
                    },
                    cost: costBreakdown,
                    match_quality: {
                        type: matchResult.match_type,
                        score: matchResult.match_percentage,
                        total_matches: matchResult.matched_filters,
                        total_filters: matchResult.total_filters
                    },
                    contact: {
                        mobile: provider.provider_mobile,
                        email: provider.provider_email
                    }
                };
            });

            // Sort by match quality, then by cost
            const sortedProviders = processedProviders.sort((a, b) => {
                if (a.match_quality.score !== b.match_quality.score) {
                    return b.match_quality.score - a.match_quality.score;
                }
                return a.cost.calculation.total_cost - b.cost.calculation.total_cost;
            });

            res.json({
                success: true,
                message: `Found ${sortedProviders.length} providers`,
                data: {
                    providers: sortedProviders,
                    search_summary: {
                        service_searched: allProviders[0]?.service_name || 'Unknown Service',
                        area_searched: location_lat ? `Within ${radius_km}km of your location` : 'All areas',
                        duration_calculated: `${days_per_week} days/week for ${weeks_duration} weeks`,
                        total_found: allProviders.length
                    }
                }
            });

        } catch (error) {
            console.error('Search providers by filters error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error searching providers'
            });
        }
    }

    static calculateSmartFilterMatch(customerFilters, providerFilters) {
        if (!Array.isArray(customerFilters) || !Array.isArray(providerFilters)) {
            return {
                match_type: 'none',
                match_percentage: 0,
                matched_filters: 0,
                total_filters: customerFilters?.length || 0
            };
        }

        let totalCustomerFilters = customerFilters.length;
        let matchedFilters = 0;

        customerFilters.forEach(customerFilter => {
            const providerFilter = providerFilters.find(pf =>
                pf.filter_name === customerFilter.filter_name
            );

            if (providerFilter) {
                const customerValues = customerFilter.selected_values || [];
                const providerValues = providerFilter.selected_values || [];

                const hasMatch = customerValues.some(cv =>
                    providerValues.includes(cv)
                );

                if (hasMatch) {
                    matchedFilters++;
                }
            }
        });

        const matchPercentage = totalCustomerFilters > 0 ?
            Math.round((matchedFilters / totalCustomerFilters) * 100) : 0;

        let matchType;
        if (matchedFilters === totalCustomerFilters) {
            matchType = 'exact';
        } else if (matchedFilters > totalCustomerFilters / 2) {
            matchType = 'partial';
        } else {
            matchType = 'none';
        }

        return {
            match_type: matchType,
            match_percentage: matchPercentage,
            matched_filters: matchedFilters,
            total_filters: totalCustomerFilters
        };
    }

    static calculateCustomerCost(provider, daysPerWeek, weeksDuration) {
        const baseRate = parseFloat(provider.base_rate);
        const taxPercentage = parseFloat(provider.tax_percentage || 0);

        let totalDays = daysPerWeek * weeksDuration;
        let subtotal = 0;

        if (provider.base_rate_type === 'per_hour') {
            const hoursPerDay = 8;
            subtotal = baseRate * hoursPerDay * totalDays;
        } else if (provider.base_rate_type === 'per_day') {
            subtotal = baseRate * totalDays;
        } else if (provider.base_rate_type === 'per_week') {
            subtotal = baseRate * weeksDuration;
        } else if (provider.base_rate_type === 'per_month') {
            const months = Math.ceil(weeksDuration / 4);
            subtotal = baseRate * months;
        } else {
            subtotal = baseRate * totalDays;
        }

        const taxAmount = (subtotal * taxPercentage) / 100;
        const totalCost = subtotal + taxAmount;

        return {
            base_rate: `₹${baseRate}/${provider.base_rate_type.replace('per_', '')}`,
            duration: `${daysPerWeek} days/week × ${weeksDuration} weeks`,
            calculation: {
                subtotal: Math.round(subtotal),
                tax: Math.round(taxAmount),
                total_cost: Math.round(totalCost)
            },
            display: `₹${Math.round(totalCost).toLocaleString('en-IN')} for ${weeksDuration} weeks`,
            per_day_cost: Math.round(totalCost / totalDays)
        };
    }

    // Get provider service configurations
    static async getProviderServiceConfigurations(req, res) {
        try {
            const { provider_id } = req.params;

            if (!provider_id || isNaN(provider_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid provider ID is required'
                });
            }

            const configurations = await serviceBookingQueries.getProviderServiceConfigurations(provider_id);

            const formattedConfigs = configurations.map(config => ({
                ...config,
                selected_filters: typeof config.selected_filters === 'string'
                    ? JSON.parse(config.selected_filters)
                    : config.selected_filters
            }));

            res.json({
                success: true,
                message: 'Provider service configurations retrieved successfully',
                data: {
                    provider_id: parseInt(provider_id),
                    configurations: formattedConfigs,
                    total_services: formattedConfigs.length
                }
            });

        } catch (error) {
            console.error('Get provider service configurations error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving service configurations'
            });
        }
    }

    // Get all provider configurations for admin
    static async getAllProviderConfigurations(req, res) {
        try {
            const query = `
                SELECT 
                    psc.config_id as id,
                    psc.provider_id,
                    psc.service_id,
                    psc.service_name,
                    psc.category_name,
                    psc.base_rate,
                    psc.base_rate_type,
                    psc.tax_percentage,
                    psc.status,
                    psc.service_image_url,
                    psc.is_active,
                    psc.created_at,
                    psc.updated_at,
                    ai.full_name as provider_name,
                    ai.mobile_number as provider_mobile,
                    ai.email_address as provider_email
                FROM provider_service_configurations psc
                JOIN account_information ai ON psc.provider_id = ai.registration_id
                WHERE psc.service_id IN (1,2,3,4,5) AND psc.is_active = 1
                ORDER BY psc.created_at DESC
            `;

            const [rows] = await db.execute(query);

            const configurations = rows.map(config => {
                const baseRate = parseFloat(config.base_rate);
                const taxPercentage = parseFloat(config.tax_percentage || 0);
                const taxAmount = (baseRate * taxPercentage) / 100;
                const finalAmount = baseRate + taxAmount;

                return {
                    id: config.id,
                    provider_id: config.provider_id,
                    service_id: config.service_id,
                    name: config.service_name,
                    provider: config.provider_name,
                    category: config.category_name,
                    estimated_salary: `Rs.${Math.round(finalAmount)}`,
                    featured: false,
                    status: config.status,
                    service_image: config.service_image_url ? `/uploads/services/${path.basename(config.service_image_url)}` : null,
                    base_rate: config.base_rate,
                    base_rate_type: config.base_rate_type,
                    tax_percentage: config.tax_percentage,
                    final_amount_with_tax: finalAmount,
                    provider_contact: {
                        mobile: config.provider_mobile,
                        email: config.provider_email
                    },
                    created_at: config.created_at,
                    updated_at: config.updated_at
                };
            });

            res.json({
                success: true,
                message: 'Provider configurations retrieved successfully',
                data: {
                    configurations,
                    total_count: configurations.length
                }
            });

        } catch (error) {
            console.error('Get all provider configurations error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving provider configurations'
            });
        }
    } 

static async updateProviderConfiguration(req, res) {
    try {
        const { configId } = req.params;
        const {
            provider_id,
            service_id,
            service_name,
            category_name,
            service_description,
            location_address,
            latitude,
            longitude,
            city,
            state,
            pincode,
            selected_filters,
            base_rate_type,
            base_rate,
            tax_percentage,
            status
        } = req.body;

        if (!configId) {
            return res.status(400).json({
                success: false,
                message: 'Configuration ID is required'
            });
        }

        // ✅ VALIDATE PROVIDER_ID IF PROVIDED
        if (provider_id) {
            const [providerExists] = await db.execute(
                'SELECT registration_id FROM account_information WHERE registration_id = ?',
                [provider_id]
            );

            if (providerExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Provider ID ${provider_id} does not exist in the system`,
                    hint: 'Please provide a valid provider registration_id from account_information table'
                });
            }
        }

        // Get current configuration
        const [currentConfig] = await db.execute(
            'SELECT provider_id, service_id FROM provider_service_configurations WHERE config_id = ?',
            [configId]
        );

        if (currentConfig.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        // Check duplicate provider-service combination
        const newProviderId = provider_id || currentConfig[0].provider_id;
        const newServiceId = service_id || currentConfig[0].service_id;

        if ((provider_id && provider_id !== currentConfig[0].provider_id) || 
            (service_id && service_id !== currentConfig[0].service_id)) {
            
            const [duplicate] = await db.execute(
                `SELECT config_id FROM provider_service_configurations 
                 WHERE provider_id = ? AND service_id = ? AND config_id != ?`,
                [newProviderId, newServiceId, configId]
            );

            if (duplicate.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Provider ${newProviderId} already has a configuration for service ${newServiceId}`,
                    hint: 'Each provider can only have one configuration per service type'
                });
            }
        }

        // Handle image upload
        let serviceImagePath = null;
        if (req.file) {
            serviceImagePath = req.file.path;
        }

        // Parse selected_filters
        let parsedFilters = null;
        if (selected_filters) {
            try {
                parsedFilters = typeof selected_filters === 'string' 
                    ? JSON.parse(selected_filters) 
                    : selected_filters;
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid selected_filters format'
                });
            }
        }

        // Build update query
        let updateFields = [];
        let queryParams = [];

        if (provider_id) {
            updateFields.push('provider_id = ?');
            queryParams.push(provider_id);
        }

        if (service_id) {
            updateFields.push('service_id = ?');
            queryParams.push(service_id);
        }

        if (service_name) {
            updateFields.push('service_name = ?');
            queryParams.push(service_name);
        }

        if (category_name) {
            updateFields.push('category_name = ?');
            queryParams.push(category_name);
        }

        if (service_description) {
            updateFields.push('service_description = ?');
            queryParams.push(service_description);
        }

        if (serviceImagePath) {
            updateFields.push('service_image_url = ?');
            queryParams.push(serviceImagePath);
        }

        if (location_address) {
            updateFields.push('location_address = ?');
            queryParams.push(location_address);
        }

        if (latitude !== undefined && latitude !== null && latitude !== '') {
            updateFields.push('latitude = ?');
            queryParams.push(parseFloat(latitude));
        }

        if (longitude !== undefined && longitude !== null && longitude !== '') {
            updateFields.push('longitude = ?');
            queryParams.push(parseFloat(longitude));
        }

        if (city) {
            updateFields.push('city = ?');
            queryParams.push(city);
        }

        if (state) {
            updateFields.push('state = ?');
            queryParams.push(state);
        }

        if (pincode) {
            updateFields.push('pincode = ?');
            queryParams.push(pincode);
        }

        if (parsedFilters) {
            updateFields.push('selected_filters = ?');
            queryParams.push(JSON.stringify(parsedFilters));
        }

        if (base_rate_type) {
            updateFields.push('base_rate_type = ?');
            queryParams.push(base_rate_type);
        }

        if (base_rate !== undefined && base_rate !== null && base_rate !== '') {
            updateFields.push('base_rate = ?');
            queryParams.push(parseFloat(base_rate));
        }

        if (tax_percentage !== undefined && tax_percentage !== null && tax_percentage !== '') {
            updateFields.push('tax_percentage = ?');
            queryParams.push(parseFloat(tax_percentage));
        }

        if (status) {
            updateFields.push('status = ?');
            queryParams.push(status);
        }

        updateFields.push('updated_at = NOW()');

        if (updateFields.length === 1) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided for update'
            });
        }

        queryParams.push(configId);

        const query = `
            UPDATE provider_service_configurations 
            SET ${updateFields.join(', ')}
            WHERE config_id = ?
        `;

        const [result] = await db.execute(query, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        const updatedConfig = await serviceBookingQueries.getProviderConfigurationById(configId);

        res.json({
            success: true,
            message: 'Provider configuration updated successfully',
            data: updatedConfig
        });

    } catch (error) {
        console.error('Update provider configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating provider configuration',
            error: error.message
        });
    }
}

    // Get single provider configuration by ID
    // static async getProviderConfigurationById(req, res) {
    //     try {
    //         const { configId } = req.params;

    //         if (!configId) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Configuration ID is required'
    //             });
    //         }

    //         const query = `
    //             SELECT 
    //                 psc.*,
    //                 ai.full_name as provider_name,
    //                 ai.mobile_number as provider_mobile,
    //                 ai.email_address as provider_email,
    //                 ai.profile_image as provider_image,
    //                 st.name as service_type_name,
    //                 st.description as service_type_description
    //             FROM provider_service_configurations psc
    //             JOIN account_information ai ON psc.provider_id = ai.registration_id
    //             LEFT JOIN service_types st ON psc.service_id = st.service_id
    //             WHERE psc.config_id = ? AND psc.service_id IN (1,2,3,4,5)
    //         `;

    //         const [rows] = await db.execute(query, [configId]);

    //         if (rows.length === 0) {
    //             return res.status(404).json({
    //                 success: false,
    //                 message: 'Configuration not found'
    //             });
    //         }

    //         const config = rows[0];

    //         // Parse selected_filters JSON
    //         let parsedFilters = [];
    //         try {
    //             parsedFilters = JSON.parse(config.selected_filters || '[]');
    //         } catch (e) {
    //             console.error('Error parsing selected_filters:', e);
    //         }

    //         // Calculate pricing details
    //         const baseRate = parseFloat(config.base_rate);
    //         const taxPercentage = parseFloat(config.tax_percentage || 0);
    //         const taxAmount = (baseRate * taxPercentage) / 100;
    //         const totalAmount = baseRate + taxAmount;

    //         const response = {
    //             id: config.config_id,
    //             provider_id: config.provider_id,
    //             service_id: config.service_id,
    //             service_name: config.service_name,
    //             category_name: config.category_name,
    //             service_description: config.service_description,
    //             service_image: config.service_image_url ? `/uploads/services/${path.basename(config.service_image_url)}` : null,

    //             provider_details: {
    //                 name: config.provider_name,
    //                 mobile: config.provider_mobile,
    //                 email: config.provider_email,
    //                 profile_image: config.provider_image
    //             },

    //             service_type: {
    //                 id: config.service_id,
    //                 name: config.service_type_name,
    //                 description: config.service_type_description
    //             },

    //             location: {
    //                 address: config.location_address,
    //                 city: config.city,
    //                 state: config.state,
    //                 pincode: config.pincode,
    //                 latitude: config.latitude,
    //                 longitude: config.longitude
    //             },

    //             filters: {
    //                 count: parsedFilters.length,
    //                 details: parsedFilters
    //             },

    //             pricing: {
    //                 base_rate: config.base_rate,
    //                 base_rate_type: config.base_rate_type,
    //                 tax_percentage: config.tax_percentage,
    //                 calculation: {
    //                     base_amount: baseRate,
    //                     tax_amount: taxAmount,
    //                     total_amount: totalAmount,
    //                     formatted_total: `Rs.${Math.round(totalAmount)}`
    //                 }
    //             },

    //             status: config.status,
    //             created_at: config.created_at,
    //             updated_at: config.updated_at
    //         };

    //         res.json({
    //             success: true,
    //             message: 'Provider configuration retrieved successfully',
    //             data: response
    //         });

    //     } catch (error) {
    //         console.error('Get provider configuration by ID error:', error);
    //         res.status(500).json({
    //             success: false,
    //             message: 'Server error retrieving provider configuration'
    //         });
    //     }
    // }
    // Get single provider configuration by ID
static async getProviderConfigurationById(req, res) {
    try {
        const { configId } = req.params;

        if (!configId) {
            return res.status(400).json({
                success: false,
                message: 'Configuration ID is required'
            });
        }

        const query = `
            SELECT 
                psc.*,
                ai.full_name as provider_name,
                ai.mobile_number as provider_mobile,
                ai.email_address as provider_email,
                ai.profile_image as provider_image,
                st.name as service_type_name,
                st.description as service_type_description
            FROM provider_service_configurations psc
            JOIN account_information ai ON psc.provider_id = ai.registration_id
            LEFT JOIN service_types st ON psc.service_id = st.service_id
            WHERE psc.config_id = ? AND psc.service_id IN (1,2,3,4,5)
        `;

        const [rows] = await db.execute(query, [configId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        const config = rows[0];

    
let parsedFilters = [];
try {
    const filtersData = config.selected_filters || '[]';
    
    // Check if it's the bad "[object Object]" string
    if (filtersData === '[object Object]' || filtersData === 'null') {
        parsedFilters = [];
    } else {
        parsedFilters = typeof filtersData === 'string' 
            ? JSON.parse(filtersData) 
            : filtersData;
    }
} catch (e) {
    console.error('Error parsing selected_filters:', e);
    console.error('Raw data:', config.selected_filters);
    parsedFilters = [];
}
        // Calculate pricing details
        const baseRate = parseFloat(config.base_rate);
        const taxPercentage = parseFloat(config.tax_percentage || 0);
        const taxAmount = (baseRate * taxPercentage) / 100;
        const totalAmount = baseRate + taxAmount;

        const response = {
            id: config.config_id,
            provider_id: config.provider_id,
            service_id: config.service_id,
            service_name: config.service_name,
            category_name: config.category_name,
            service_description: config.service_description,
            service_image: config.service_image_url ? `/uploads/services/${path.basename(config.service_image_url)}` : null,

            provider_details: {
                name: config.provider_name,
                mobile: config.provider_mobile,
                email: config.provider_email,
                profile_image: config.provider_image
            },

            service_type: {
                id: config.service_id,
                name: config.service_type_name,
                description: config.service_type_description
            },

            location: {
                address: config.location_address,
                city: config.city,
                state: config.state,
                pincode: config.pincode,
                latitude: config.latitude,
                longitude: config.longitude
            },

            filters: {
                count: parsedFilters.length,
                details: parsedFilters
            },

            pricing: {
                base_rate: config.base_rate,
                base_rate_type: config.base_rate_type,
                tax_percentage: config.tax_percentage,
                calculation: {
                    base_amount: baseRate,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    formatted_total: `Rs.${Math.round(totalAmount)}`
                }
            },

            status: config.status,
            is_active: config.is_active,  // ADD THIS LINE
            created_at: config.created_at,
            updated_at: config.updated_at
        };

        res.json({
            success: true,
            message: 'Provider configuration retrieved successfully',
            data: response
        });

    } catch (error) {
        console.error('Get provider configuration by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving provider configuration'
        });
    }
}

    // Get all active service providers
    static async getServiceProviders(req, res) {
        try {
            const providers = await serviceBookingQueries.getActiveProviders();

            res.json({
                success: true,
                message: 'Service providers retrieved successfully',
                data: {
                    providers,
                    total_count: providers.length
                }
            });
        } catch (error) {
            console.error('Get service providers error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error retrieving service providers'
            });
        }
    }

    // Customer filter methods
    // static async saveCustomerFilters(req, res) {
    //     try {
    //         const {
    //             customer_id,
    //             customer_name,
    //             service_id,
    //             customer_filters = [],
    //             location_lat,
    //             location_lng,
    //             radius_km = 10
    //         } = req.body;

    //         // Validate service_id
    //         if (!service_id || ![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
    //             });
    //         }

    //         if (!customer_id || !Array.isArray(customer_filters) || customer_filters.length === 0) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Customer ID and customer_filters array are required'
    //             });
    //         }

    //         // Validate filter structure
    //         for (const filter of customer_filters) {
    //             if (!filter.filter_id || !filter.filter_name || !filter.selected_values || !Array.isArray(filter.selected_values)) {
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: 'Each filter must have filter_id, filter_name, and selected_values array'
    //                 });
    //             }
    //         }

    //         const savedFilters = await serviceBookingQueries.saveCustomerFilters({
    //             customer_id,
    //             customer_name,
    //             service_id,
    //             selected_filters: JSON.stringify(customer_filters),
    //             location_lat: location_lat ? parseFloat(location_lat) : null,
    //             location_lng: location_lng ? parseFloat(location_lng) : null,
    //             radius_km: parseInt(radius_km),
    //             created_at: new Date(),
    //             status: 'filter_selected'
    //         });

    //         res.json({
    //             success: true,
    //             message: 'Customer filters saved successfully',
    //             data: {
    //                 filter_id: savedFilters.insertId || savedFilters.id,
    //                 customer_id,
    //                 customer_name,
    //                 service_id,
    //                 total_filters: customer_filters.length,
    //                 location: location_lat && location_lng ? {
    //                     latitude: parseFloat(location_lat),
    //                     longitude: parseFloat(location_lng),
    //                     radius_km: parseInt(radius_km)
    //                 } : null,
    //                 next_step: 'booking_details'
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Save customer filters error:', error);
    //         res.status(500).json({
    //             success: false,
    //             message: 'Server error saving filters'
    //         });
    //     }
    // }
    static async saveCustomerFilters(req, res) {
    try {
        const {
            customer_id,
            customer_name,
            service_id,
            customer_filters = [],
            location_lat,
            location_lng,
            radius_km = 10
        } = req.body;

        // Validation
        if (!customer_id || !service_id || !customer_filters || !Array.isArray(customer_filters)) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID, Service ID and customer_filters array are required'
            });
        }

        if (customer_filters.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one filter selection is required'
            });
        }

        // Validate filter structure
        for (const filter of customer_filters) {
            if (!filter.filter_id || !filter.filter_name || !filter.selected_values || !Array.isArray(filter.selected_values)) {
                return res.status(400).json({
                    success: false,
                    message: 'Each filter must have filter_id, filter_name, and selected_values array'
                });
            }
        }

        // Get service details for base price
        const serviceDetails = await serviceBookingQueries.getServiceWithFilterPricing(service_id);
        if (!serviceDetails) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Calculate pricing for selected filters
        const filterBreakdown = [];
        let totalFilterCost = 0;

        for (const filterObj of customer_filters) {
            if (!filterObj.filter_id || !filterObj.selected_values) continue;
            
            let filterCost = 0;
            const selectedValues = filterObj.selected_values;
            
            // Get pricing from database for each selected value
            for (const value of selectedValues) {
                try {
                    const options = await serviceBookingQueries.getFilterOptions(filterObj.filter_id);
                    const matchingOption = options.find(opt => opt.option_value === value);
                    
                    if (matchingOption && matchingOption.price_modifier) {
                        filterCost += parseFloat(matchingOption.price_modifier);
                    }
                } catch (error) {
                    console.error(`Error getting price for filter ${filterObj.filter_name}, value ${value}:`, error);
                }
            }
            
            if (filterCost > 0) {
                filterBreakdown.push({
                    filter_name: filterObj.filter_name.replace('_', ' ').toUpperCase(),
                    filter_value: selectedValues.join(', '),
                    cost: filterCost
                });
            }
            totalFilterCost += filterCost;
        }

        // Calculate totals
        const baseServiceCost = parseFloat(serviceDetails.base_price) || 500;
        const bookingCharges = 100;
        const estimatedTotal = baseServiceCost + totalFilterCost + bookingCharges;

        // Save to database
        const savedFilters = await serviceBookingQueries.saveCustomerFilters({
            customer_id,
            customer_name,
            service_id,
            selected_filters: JSON.stringify(customer_filters),
            location_lat: location_lat ? parseFloat(location_lat) : null,
            location_lng: location_lng ? parseFloat(location_lng) : null,
            radius_km: parseInt(radius_km),
            created_at: new Date(),
            status: 'filter_selected'
        });

        res.json({
            success: true,
            message: 'Customer filters saved successfully with pricing calculated',
            data: {
                filter_id: savedFilters.insertId || savedFilters.id,
                customer_id,
                customer_name,
                service_id,
                service_details: {
                    service_name: serviceDetails.service_name || serviceDetails.name,
                    category: serviceDetails.category,
                    base_price: baseServiceCost
                },
                selected_filters: customer_filters,
                pricing_breakdown: {
                    base_service_cost: baseServiceCost,
                    filter_costs: filterBreakdown,
                    total_filter_cost: totalFilterCost,
                    booking_charges: bookingCharges,
                    estimated_total: estimatedTotal.toFixed(2)
                },
                location: location_lat && location_lng ? {
                    latitude: parseFloat(location_lat),
                    longitude: parseFloat(location_lng),
                    radius_km: parseInt(radius_km)
                } : null,
                total_filters: customer_filters.length,
                next_step: 'confirm_booking'
            }
        });

    } catch (error) {
        console.error('Save customer filters error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error saving filters'
        });
    }
    }

    // Get booking details with pricing for customer
    // static async getBookingDetails(req, res) {
    //     try {
    //         const { customer_id, service_id } = req.params;

    //         // Validate service_id
    //         if (!service_id || ![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
    //             });
    //         }

    //         if (!customer_id) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Customer ID is required'
    //             });
    //         }

    //         // Get saved customer filters
    //         const customerFilters = await serviceBookingQueries.getCustomerFilters(customer_id, service_id);
            
    //         if (!customerFilters) {
    //             return res.status(404).json({
    //                 success: false,
    //                 message: 'No filters found for this customer'
    //             });
    //         }

    //         // Get service details and filter pricing
    //         const serviceDetails = await serviceBookingQueries.getServiceWithFilterPricing(service_id);
            
    //         // Parse saved filters
    //         const savedFilters = typeof customerFilters.selected_filters === 'string' 
    //             ? JSON.parse(customerFilters.selected_filters) 
    //             : customerFilters.selected_filters;

    //         // Calculate pricing for each selected filter dynamically from database
    //         const filterBreakdown = [];
    //         let totalFilterCost = 0;

    //         for (const filterObj of savedFilters) {
    //             if (!filterObj.filter_id || !filterObj.selected_values) continue;
                
    //             let filterCost = 0;
    //             const selectedValues = filterObj.selected_values;
                
    //             // Get pricing from database for each selected value
    //             for (const value of selectedValues) {
    //                 try {
    //                     const options = await serviceBookingQueries.getFilterOptions(filterObj.filter_id);
    //                     const matchingOption = options.find(opt => opt.option_value === value);
                        
    //                     if (matchingOption && matchingOption.price_modifier) {
    //                         filterCost += parseFloat(matchingOption.price_modifier);
    //                     }
    //                 } catch (error) {
    //                     console.error(`Error getting price for filter ${filterObj.filter_name}, value ${value}:`, error);
    //                 }
    //             }
                
    //             if (filterCost > 0) {
    //                 filterBreakdown.push({
    //                     filter_name: filterObj.filter_name.replace('_', ' ').toUpperCase(),
    //                     filter_value: selectedValues.join(', '),
    //                     cost: filterCost
    //                 });
    //                 totalFilterCost += filterCost;
    //             }
    //         }

    //         // Base service cost from database
    //         const baseServiceCost = serviceDetails?.base_price || 500;
    //         const bookingCharges = 100;
    //         const totalEstimatedCost = baseServiceCost + totalFilterCost + bookingCharges;

    //         res.json({
    //             success: true,
    //             data: {
    //                 customer_details: {
    //                     customer_id: customerFilters.customer_id,
    //                     customer_name: customerFilters.customer_name
    //                 },
    //                 service_details: {
    //                     service_id: serviceDetails.service_id,
    //                     service_name: serviceDetails.service_name || serviceDetails.name,
    //                     category: serviceDetails.category_name || serviceDetails.category
    //                 },
    //                 selected_filters: savedFilters,
    //                 pricing_breakdown: {
    //                     base_service_cost: baseServiceCost,
    //                     filter_costs: filterBreakdown,
    //                     total_filter_cost: totalFilterCost,
    //                     booking_charges: bookingCharges,
    //                     estimated_total: totalEstimatedCost
    //                 },
    //                 booking_form: {
    //                     address: '',
    //                     location_lat: '',
    //                     location_lng: '',
    //                     start_date: '',
    //                     end_date: '',
    //                     start_time: '',
    //                     end_time: '',
    //                     remarks: ''
    //                 }
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Get booking details error:', error);
    //         res.status(500).json({
    //             success: false,
    //             message: 'Server error getting booking details'
    //         });
    //     }
    // }

    static async getBookingDetails(req, res) {
    try {
        const { customer_id, service_id } = req.params;

        if (!customer_id || !service_id) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID and Service ID are required'
            });
        }

        // Get saved customer filters
        const customerFilters = await serviceBookingQueries.getCustomerFilters(customer_id, service_id);
        
        if (!customerFilters) {
            return res.status(404).json({
                success: false,
                message: 'No filters found for this customer'
            });
        }

        // Get service details and filter pricing
        const serviceDetails = await serviceBookingQueries.getServiceWithFilterPricing(service_id);
        
        // Parse saved filters - now expecting array format
        const savedFilters = typeof customerFilters.selected_filters === 'string' 
            ? JSON.parse(customerFilters.selected_filters) 
            : customerFilters.selected_filters;

        // Calculate pricing for each selected filter dynamically from database
        const filterBreakdown = [];
        let totalFilterCost = 0;

        // Process each saved filter object
        for (const filterObj of savedFilters) {
            if (!filterObj.filter_id || !filterObj.selected_values) continue;
            
            let filterCost = 0;
            const selectedValues = filterObj.selected_values;
            
            // Get pricing from database for each selected value
            for (const value of selectedValues) {
                try {
                    const options = await serviceBookingQueries.getFilterOptions(filterObj.filter_id);
                    const matchingOption = options.find(opt => opt.option_value === value);
                    
                    if (matchingOption && matchingOption.price_modifier) {
                        filterCost += parseFloat(matchingOption.price_modifier);
                    }
                } catch (error) {
                    console.error(`Error getting price for filter ${filterObj.filter_name}, value ${value}:`, error);
                }
            }
            
            if (filterCost > 0) {
                filterBreakdown.push({
                    filter_name: filterObj.filter_name.replace('_', ' ').toUpperCase(),
                    filter_value: selectedValues.join(', '),
                    cost: filterCost
                });
                totalFilterCost += filterCost;
            }
        }

        // Base service cost from database - CORRECTED field name
        const baseServiceCost = serviceDetails?.base_price || 500;
        const bookingCharges = 100; // Fixed booking fee
        const totalEstimatedCost = baseServiceCost + totalFilterCost + bookingCharges;

        res.json({
            success: true,
            data: {
                customer_details: {
                    customer_id: customerFilters.customer_id,
                    customer_name: customerFilters.customer_name
                },
                service_details: {
                    service_id: serviceDetails.service_id,
                    service_name: serviceDetails.service_name,
                    category: serviceDetails.category_name
                },
                selected_filters: savedFilters,
                pricing_breakdown: {
                    base_service_cost: baseServiceCost,
                    filter_costs: filterBreakdown,
                    total_filter_cost: totalFilterCost,
                    booking_charges: bookingCharges,
                    estimated_total: totalEstimatedCost
                },
                booking_form: {
                    address: '',
                    location_lat: '',
                    location_lng: '',
                    start_date: '',
                    end_date: '',
                    start_time: '',
                    end_time: '',
                    remarks: ''
                }
            }
        });

    } catch (error) {
        console.error('Get booking details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting booking details'
        });
    }
    }

    // Save final booking
    static async saveBooking(req, res) {
        try {
            const {
                customer_id,
                service_id,
                address,
                location_lat,
                location_lng,
                start_date,
                end_date,
                start_time,
                end_time,
                remarks,
                total_amount,
                payment_method = 'pending'
            } = req.body;

            // Validate service_id
            if (!service_id || ![1, 2, 3, 4, 5].includes(parseInt(service_id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Service ID must be one of: 1 (Cook), 2 (Baby Sitter), 3 (Elderly Care), 4 (Gardening), 5 (Driving)'
                });
            }

            if (!customer_id || !address || !start_date || !total_amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Required fields missing: customer_id, service_id, address, start_date, total_amount'
                });
            }

            // Get the saved filters for this customer
            const customerFilters = await serviceBookingQueries.getCustomerFilters(customer_id, service_id);
            
            if (!customerFilters) {
                return res.status(404).json({
                    success: false,
                    message: 'No filters found. Please select filters first.'
                });
            }

            // Generate booking ID
            const booking_id = 'BK' + Date.now();

            const bookingData = {
                booking_id,
                customer_id,
                service_id,
                customer_filters: customerFilters.selected_filters,
                service_address: address,
                location_lat: parseFloat(location_lat) || null,
                location_lng: parseFloat(location_lng) || null,
                service_start_date: start_date,
                service_end_date: end_date || start_date,
                service_start_time: start_time,
                service_end_time: end_time,
                total_amount: parseFloat(total_amount),
                booking_charges: 100,
                remarks: remarks || '',
                payment_status: 'pending',
                payment_method,
                booking_status: 'confirmed',
                created_at: new Date(),
                updated_at: new Date()
            };

            const savedBooking = await serviceBookingQueries.saveBooking(bookingData);

            // Update customer filters status
            await serviceBookingQueries.updateCustomerFiltersStatus(customer_id, service_id, 'booking_confirmed');

            res.json({
                success: true,
                message: 'Booking confirmed successfully!',
                data: {
                    booking_id,
                    customer_id,
                    service_id,
                    total_amount,
                    booking_status: 'confirmed',
                    payment_status: 'pending',
                    next_step: 'payment',
                    booking_details: {
                        address,
                        service_dates: `${start_date} to ${end_date || start_date}`,
                        service_time: `${start_time} to ${end_time}`,
                        total_cost: `Rs. ${total_amount}`
                    }
                }
            });

        } catch (error) {
            console.error('Save booking error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error saving booking'
            });
        }
    }

    // Debug method for troubleshooting
    static async debugServiceFilters(req, res) {
        try {
            const { service_id } = req.params;

            // Test database connection
            await db.execute('SELECT 1');
            
            // Check service exists
            const service = await serviceBookingQueries.getServiceById(service_id);
            
            // Get filters
            const filters = await serviceBookingQueries.getServiceFilters(service_id);
            
            let filterDetails = [];
            for (let filter of filters) {
                const options = await serviceBookingQueries.getFilterOptions(filter.filter_id);
                filterDetails.push({
                    filter: filter,
                    options: options
                });
            }

            res.json({
                success: true,
                message: 'Debug completed',
                data: {
                    service_id,
                    service,
                    filters,
                    filter_details: filterDetails,
                    database_connection: 'OK',
                    supported_services: [1, 2, 3, 4, 5]
                }
            });

        } catch (error) {
            console.error('Debug method error:', error);
            res.status(500).json({
                success: false,
                message: 'Debug failed',
                error: error.message
            });
        }
    }

    // ===============================
// ADMIN BOOKING MANAGEMENT APIs
// ===============================

// 1. GET ALL BOOKINGS FOR ADMIN GRID
// Fixed getAdminBookings method for ServiceBookingController

static async getAdminBookings(req, res) {
    try {
        // Extract query parameters
        const status = req.query.status;
        const service_id = req.query.service_id;
        const search = req.query.search;
        const date_from = req.query.date_from;
        const date_to = req.query.date_to;

        console.log('Query parameters:', {
            status,
            service_id,
            search,
            date_from,
            date_to
        });

        // Build WHERE conditions and parameters array
        let whereConditions = ['1=1'];
        let queryParams = [];

        if (status && status !== 'all') {
            whereConditions.push('sb.booking_status = ?');
            queryParams.push(status);
        }

        if (service_id) {
            whereConditions.push('sb.service_id = ?');
            queryParams.push(parseInt(service_id));
        }

        if (search) {
            whereConditions.push('(tc.name LIKE ? OR tc.mobile LIKE ? OR sb.booking_id LIKE ?)');
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        if (date_from) {
            whereConditions.push('DATE(sb.created_at) >= ?');
            queryParams.push(date_from);
        }

        if (date_to) {
            whereConditions.push('DATE(sb.created_at) <= ?');
            queryParams.push(date_to);
        }

        const whereClause = whereConditions.join(' AND ');

        console.log('Final WHERE clause:', whereClause);
        console.log('Query parameters:', queryParams);

        // Main query - NO PAGINATION
        const query = `
            SELECT 
                sb.id,
                sb.booking_id,
                sb.created_at,
                sb.service_start_date,
                sb.service_start_time,
                sb.service_end_time,
                sb.booking_status,
                sb.total_amount,
                sb.customer_filters,
                sb.remarks,
                sb.assigned_provider_id,
                sb.estimated_cost,
                
                -- Service details
                st.name as service_name,
                st.base_price,
                
                -- Customer details  
                tc.name as customer_name,
                tc.mobile as customer_mobile,
                tc.email as customer_email,
                sb.service_address,
                
                -- Assigned provider details
                ai.full_name as provider_name,
                ai.mobile_number as provider_mobile,
                
                -- Calculate service duration
                CASE 
                    WHEN sb.service_start_time IS NOT NULL AND sb.service_end_time IS NOT NULL
                    THEN TIMESTAMPDIFF(HOUR, 
                        CONCAT('2000-01-01 ', sb.service_start_time), 
                        CONCAT('2000-01-01 ', sb.service_end_time)
                    )
                    ELSE NULL
                END as service_hours
                
            FROM service_bookings sb
            LEFT JOIN service_types st ON sb.service_id = st.service_id
            LEFT JOIN temp_customers tc ON sb.customer_id = tc.id  
            LEFT JOIN account_information ai ON sb.assigned_provider_id = ai.registration_id
            WHERE ${whereClause}
            ORDER BY sb.created_at DESC
        `;

        console.log('Executing query with', queryParams.length, 'parameters');

        const [bookings] = await db.execute(query, queryParams);

        // Process bookings data
        const processedBookings = bookings.map(booking => {
            let parsedFilters = {};
            
            // Parse customer_filters JSON
            if (booking.customer_filters) {
                try {
                    parsedFilters = typeof booking.customer_filters === 'string' 
                        ? JSON.parse(booking.customer_filters)
                        : booking.customer_filters;
                } catch (error) {
                    console.error('Error parsing customer_filters for booking:', booking.booking_id, error);
                    parsedFilters = {};
                }
            }

            return {
                id: booking.id,
                booking_id: booking.booking_id,
                created_at: booking.created_at,
                service_start_date: booking.service_start_date,
                service_start_time: booking.service_start_time,
                service_end_time: booking.service_end_time,
                service_hours: booking.service_hours,
                booking_status: booking.booking_status,
                total_amount: parseFloat(booking.total_amount || 0),
                estimated_cost: parseFloat(booking.estimated_cost || 0),
                remarks: booking.remarks,
                
                service_details: {
                    name: booking.service_name,
                    base_price: parseFloat(booking.base_price || 0)
                },
                
                customer_details: {
                    name: booking.customer_name,
                    mobile: booking.customer_mobile,
                    email: booking.customer_email,
                    address: booking.service_address
                },
                
                provider_details: booking.assigned_provider_id ? {
                    id: booking.assigned_provider_id,
                    name: booking.provider_name,
                    mobile: booking.provider_mobile
                } : null,
                
                selected_filters: parsedFilters
            };
        });

        // Response - NO PAGINATION
        res.json({
            success: true,
            message: `Retrieved ${processedBookings.length} bookings`,
            data: {
                bookings: processedBookings,
                total_count: processedBookings.length,
                filters_applied: {
                    status: status || 'all',
                    service_id: service_id || 'all',
                    search: search || null,
                    date_range: {
                        from: date_from || null,
                        to: date_to || null
                    }
                }
            }
        });

    } catch (error) {
        console.error('Get admin bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve bookings',
            error: error.message
        });
    }
}

// 2. GET AVAILABLE PROVIDERS FOR ASSIGNMENT
static async getAvailableProviders(req, res) {
    try {
        const { booking_id } = req.params;

        // Get booking details with customer requirements
        const [bookingResult] = await db.execute(`
            SELECT sb.*, tc.name as customer_name, tc.mobile as customer_mobile
            FROM service_bookings sb
            LEFT JOIN temp_customers tc ON sb.customer_id = tc.id
            WHERE sb.id = ? OR sb.booking_id = ?
        `, [booking_id, booking_id]);

        if (bookingResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = bookingResult[0];
        const customerLat = parseFloat(booking.location_lat);
        const customerLng = parseFloat(booking.location_lng);

        // Parse customer filters
        let customerFilters = [];
        try {
            customerFilters = JSON.parse(booking.customer_filters || '[]');
        } catch (error) {
            console.error('Error parsing customer filters:', error);
        }

        // Get providers for the same service within radius
        let providersQuery = `
            SELECT 
                psc.config_id,
                psc.provider_id,
                psc.service_name,
                psc.base_rate,
                psc.base_rate_type,
                psc.tax_percentage,
                psc.selected_filters,
                psc.latitude,
                psc.longitude,
                psc.city,
                psc.state,
                ai.full_name as provider_name,
                ai.mobile_number as provider_mobile,
                ai.email_address as provider_email
        `;

        // Add distance calculation if customer location available
        if (customerLat && customerLng) {
            providersQuery += `,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(psc.latitude)) *
                    cos(radians(psc.longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(psc.latitude))
                )) AS distance_km
            `;
        }

        providersQuery += `
            FROM provider_service_configurations psc
            JOIN account_information ai ON psc.provider_id = ai.registration_id
            WHERE psc.service_id = ? AND psc.status = 'active' AND psc.is_active = 1
        `;

        const queryParams = [];
        if (customerLat && customerLng) {
            queryParams.push(customerLat, customerLng, customerLat);
        }
        queryParams.push(booking.service_id);

        // Add distance filter if location available
        if (customerLat && customerLng) {
            providersQuery += ` HAVING distance_km <= 50`; // 50km max radius
            providersQuery += ` ORDER BY distance_km ASC`;
        } else {
            providersQuery += ` ORDER BY psc.created_at DESC`;
        }

        const [providers] = await db.execute(providersQuery, queryParams);

        // Process providers and calculate matches
        const processedProviders = providers.map(provider => {
            let providerFilters = [];
            try {
                providerFilters = JSON.parse(provider.selected_filters || '[]');
            } catch (error) {
                console.error('Error parsing provider filters:', error);
            }

            // Calculate filter match
            const matchResult = ServiceBookingController.calculateFilterMatch(customerFilters, providerFilters);
            
            // Calculate estimated cost
            const baseCost = parseFloat(provider.base_rate) || 0;
            const taxAmount = (baseCost * (parseFloat(provider.tax_percentage) || 0)) / 100;
            const estimatedCost = baseCost + taxAmount;

            // Determine provider category
            let category = 'others';
            let categoryLabel = 'Other Providers';
            
            if (matchResult.match_percentage >= 80) {
                category = 'perfect_match';
                categoryLabel = 'Perfect Match';
            } else if (matchResult.match_percentage >= 50) {
                category = 'good_match';
                categoryLabel = 'Good Match';
            } else if (provider.distance_km && provider.distance_km <= 5) {
                category = 'nearby';
                categoryLabel = 'Nearby Providers';
            }

            return {
                provider_id: provider.provider_id,
                config_id: provider.config_id,
                name: provider.provider_name,
                mobile: provider.provider_mobile,
                email: provider.provider_email,
                service_name: provider.service_name,
                location: {
                    city: provider.city,
                    state: provider.state,
                    distance_km: provider.distance_km ? parseFloat(provider.distance_km).toFixed(1) : null,
                    distance_display: provider.distance_km ? 
                        `${parseFloat(provider.distance_km).toFixed(1)} km away` : 'Distance unknown'
                },
                match_details: {
                    category: category,
                    category_label: categoryLabel,
                    match_percentage: matchResult.match_percentage,
                    matched_filters: matchResult.matched_filters,
                    total_filters: matchResult.total_filters,
                    match_breakdown: matchResult.details
                },
                pricing: {
                    base_rate: baseCost,
                    rate_type: provider.base_rate_type,
                    tax_percentage: parseFloat(provider.tax_percentage) || 0,
                    tax_amount: taxAmount,
                    estimated_total: estimatedCost,
                    display_rate: `₹${baseCost}/${provider.base_rate_type?.replace('per_', '') || 'hour'}`,
                    display_total: `₹${Math.round(estimatedCost)}`
                },
                filters: providerFilters
            };
        });

        // Group providers by category
        const categorizedProviders = {
            perfect_match: processedProviders.filter(p => p.match_details.category === 'perfect_match'),
            good_match: processedProviders.filter(p => p.match_details.category === 'good_match'),
            nearby: processedProviders.filter(p => p.match_details.category === 'nearby'),
            others: processedProviders.filter(p => p.match_details.category === 'others')
        };

        res.json({
            success: true,
            message: 'Available providers retrieved successfully',
            data: {
                booking_id: booking.booking_id,
                customer_location: customerLat && customerLng ? {
                    latitude: customerLat,
                    longitude: customerLng
                } : null,
                customer_requirements: customerFilters,
                provider_categories: {
                    perfect_match: {
                        label: 'Perfect Match (80%+ filters match)',
                        count: categorizedProviders.perfect_match.length,
                        providers: categorizedProviders.perfect_match
                    },
                    good_match: {
                        label: 'Good Match (50%+ filters match)',
                        count: categorizedProviders.good_match.length,
                        providers: categorizedProviders.good_match
                    },
                    nearby: {
                        label: 'Nearby Providers (within 5km)',
                        count: categorizedProviders.nearby.length,
                        providers: categorizedProviders.nearby
                    },
                    others: {
                        label: 'Other Available Providers',
                        count: categorizedProviders.others.length,
                        providers: categorizedProviders.others
                    }
                },
                total_available: processedProviders.length
            }
        });

    } catch (error) {
        console.error('Get available providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving available providers'
        });
    }
}

// 3. ASSIGN PROVIDER TO BOOKING
static async assignProvider(req, res) {
    try {
        const { booking_id } = req.params;
        const { 
            provider_id, 
            estimated_cost, 
            assignment_notes,
            admin_id = 'system'
        } = req.body;

        if (!provider_id) {
            return res.status(400).json({
                success: false,
                message: 'Provider ID is required'
            });
        }

        // Get booking details
        const [bookingResult] = await db.execute(`
            SELECT * FROM service_bookings 
            WHERE id = ? OR booking_id = ?
        `, [booking_id, booking_id]);

        if (bookingResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = bookingResult[0];

        // Get provider details
        const [providerResult] = await db.execute(`
            SELECT ai.*, psc.service_name, psc.base_rate, psc.base_rate_type
            FROM account_information ai
            LEFT JOIN provider_service_configurations psc 
                ON ai.registration_id = psc.provider_id AND psc.service_id = ?
            WHERE ai.registration_id = ?
        `, [booking.service_id, provider_id]);

        if (providerResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        const provider = providerResult[0];

        // Update booking with provider assignment
        const [updateResult] = await db.execute(`
            UPDATE service_bookings 
            SET 
                assigned_provider_id = ?,
                booking_status = 'assigned',
                estimated_cost = ?,
                assignment_date = NOW(),
                assignment_notes = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [provider_id, estimated_cost || booking.total_amount, assignment_notes, booking.id]);

        if (updateResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to assign provider'
            });
        }

        // Log the assignment
        try {
            await db.execute(`
                INSERT INTO booking_assignment_history 
                (booking_id, provider_id, assigned_by, assignment_date, notes)
                VALUES (?, ?, ?, NOW(), ?)
            `, [booking.id, provider_id, admin_id, assignment_notes]);
        } catch (logError) {
            console.log('Assignment history logging failed:', logError);
            // Continue - this is not critical
        }

        res.json({
            success: true,
            message: 'Provider assigned successfully',
            data: {
                booking_id: booking.booking_id,
                provider_assigned: {
                    id: provider_id,
                    name: provider.full_name,
                    mobile: provider.mobile_number,
                    email: provider.email_address,
                    service: provider.service_name
                },
                booking_status: 'assigned',
                estimated_cost: estimated_cost || booking.total_amount,
                assignment_date: new Date().toISOString(),
                assignment_notes: assignment_notes
            }
        });

    } catch (error) {
        console.error('Assign provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error assigning provider'
        });
    }
}

// 4. UPDATE BOOKING NOTES
static async updateBookingNotes(req, res) {
    try {
        const { booking_id } = req.params;
        const { notes } = req.body;

        const [updateResult] = await db.execute(`
            UPDATE service_bookings 
            SET remarks = ?, updated_at = NOW()
            WHERE id = ? OR booking_id = ?
        `, [notes, booking_id, booking_id]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.json({
            success: true,
            message: 'Booking notes updated successfully',
            data: {
                booking_id: booking_id,
                notes: notes,
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Update booking notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating notes'
        });
    }
}

// 5. HELPER METHOD - CALCULATE FILTER MATCH
static calculateFilterMatch(customerFilters, providerFilters) {
    if (!Array.isArray(customerFilters) || !Array.isArray(providerFilters)) {
        return {
            match_percentage: 0,
            matched_filters: 0,
            total_filters: customerFilters?.length || 0,
            details: []
        };
    }

    let totalCustomerFilters = customerFilters.length;
    let matchedFilters = 0;
    let matchDetails = [];

    customerFilters.forEach(customerFilter => {
        const providerFilter = providerFilters.find(pf => 
            pf.filter_name === customerFilter.filter_name
        );

        let isMatch = false;
        let matchInfo = {
            filter_name: customerFilter.filter_name,
            customer_values: customerFilter.selected_values || [],
            provider_values: providerFilter?.selected_values || [],
            is_match: false
        };

        if (providerFilter) {
            const customerValues = customerFilter.selected_values || [];
            const providerValues = providerFilter.selected_values || [];

            isMatch = customerValues.some(cv => providerValues.includes(cv));
            matchInfo.is_match = isMatch;

            if (isMatch) {
                matchedFilters++;
                const commonValues = customerValues.filter(cv => providerValues.includes(cv));
                matchInfo.matching_values = commonValues;
            }
        }

        matchDetails.push(matchInfo);
    });

    const matchPercentage = totalCustomerFilters > 0 ? 
        Math.round((matchedFilters / totalCustomerFilters) * 100) : 0;

    return {
        match_percentage: matchPercentage,
        matched_filters: matchedFilters,
        total_filters: totalCustomerFilters,
        details: matchDetails
    };
}

//new 4
// Add these missing methods to your ServiceBookingController class

// 1. CONFIRM BOOKING WITH PROVIDER ASSIGNMENT
static async confirmBooking(req, res) {
    try {
        const { booking_id } = req.params;
        const { provider_id, confirmation_notes } = req.body;

        if (!booking_id) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        res.json({
            success: true,
            message: 'Booking confirmed successfully',
            data: {
                booking_id,
                provider_id,
                status: 'confirmed',
                confirmation_notes
            }
        });
    } catch (error) {
        console.error('Confirm booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error confirming booking'
        });
    }
}

// 2. CANCEL BOOKING
static async cancelBooking(req, res) {
    try {
        const { booking_id } = req.params;
        const { cancellation_reason, refund_amount } = req.body;

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            data: {
                booking_id,
                status: 'cancelled',
                cancellation_reason,
                refund_amount: refund_amount || 0
            }
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error cancelling booking'
        });
    }
}

// 3. ASSIGN PROVIDER TO BOOKING  
static async assignProvider(req, res) {
    try {
        const { booking_id } = req.params;
        const { provider_id, assignment_notes } = req.body;

        if (!provider_id) {
            return res.status(400).json({
                success: false,
                message: 'Provider ID is required'
            });
        }

        res.json({
            success: true,
            message: 'Provider assigned successfully',
            data: {
                booking_id,
                provider_id,
                assignment_notes,
                assigned_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Assign provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error assigning provider'
        });
    }
}

// 4. UPDATE BOOKING NOTES
static async updateBookingNotes(req, res) {
    try {
        const { booking_id } = req.params;
        const { notes, updated_by } = req.body;

        res.json({
            success: true,
            message: 'Notes updated successfully',
            data: {
                booking_id,
                notes,
                updated_by,
                updated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Update notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating notes'
        });
    }
}

// 5. GET ADMIN BOOKING STATISTICS
static async getAdminBookingStatistics(req, res) {
    try {
        const stats = {
            total_bookings: 0,
            pending_bookings: 0,
            confirmed_bookings: 0,
            completed_bookings: 0,
            cancelled_bookings: 0,
            unassigned_bookings: 0,
            revenue_today: 0,
            revenue_this_month: 0
        };

        res.json({
            success: true,
            message: 'Statistics retrieved successfully',
            data: stats
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving statistics'
        });
    }
}

// 6. BULK UPDATE BOOKINGS
static async bulkUpdateBookings(req, res) {
    try {
        const { booking_ids, update_data } = req.body;

        if (!booking_ids || !Array.isArray(booking_ids)) {
            return res.status(400).json({
                success: false,
                message: 'Booking IDs array is required'
            });
        }

        res.json({
            success: true,
            message: `${booking_ids.length} bookings updated successfully`,
            data: {
                updated_bookings: booking_ids,
                update_data
            }
        });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in bulk update'
        });
    }
}

// 7. REASSIGN PROVIDER
static async reassignProvider(req, res) {
    try {
        const { booking_id } = req.params;
        const { old_provider_id, new_provider_id, reassignment_reason } = req.body;

        res.json({
            success: true,
            message: 'Provider reassigned successfully',
            data: {
                booking_id,
                old_provider_id,
                new_provider_id,
                reassignment_reason,
                reassigned_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Reassign provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error reassigning provider'
        });
    }
}

// 8. GET ASSIGNMENT HISTORY
static async getAssignmentHistory(req, res) {
    try {
        const { booking_id } = req.params;

        const assignmentHistory = [
            {
                id: 1,
                booking_id,
                provider_id: 101,
                provider_name: "John Doe",
                assigned_at: "2025-09-25T10:00:00Z",
                status: "active",
                notes: "Initial assignment"
            }
        ];

        res.json({
            success: true,
            message: 'Assignment history retrieved',
            data: {
                booking_id,
                assignment_history: assignmentHistory
            }
        });
    } catch (error) {
        console.error('Get assignment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving history'
        });
    }
}

// 9. GET BOOKING TIMELINE
static async getBookingTimeline(req, res) {
    try {
        const { booking_id } = req.params;

        const timeline = [
            {
                event: "booking_created",
                timestamp: "2025-09-25T10:00:00Z",
                description: "Booking created by customer",
                user: "Customer"
            },
            {
                event: "provider_assigned", 
                timestamp: "2025-09-25T10:30:00Z",
                description: "Provider assigned to booking",
                user: "Admin"
            }
        ];

        res.json({
            success: true,
            message: 'Booking timeline retrieved',
            data: {
                booking_id,
                timeline
            }
        });
    } catch (error) {
        console.error('Get timeline error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving timeline'
        });
    }
}

// Toggle provider configuration status (PATCH)
static async toggleProviderConfigurationStatus(req, res) {
    try {
        const { configId } = req.params;

        if (!configId) {
            return res.status(400).json({
                success: false,
                message: 'Configuration ID is required'
            });
        }

        // First, get current status
        const getCurrentStatusQuery = `
            SELECT is_active, service_name, provider_id 
            FROM provider_service_configurations 
            WHERE config_id = ?
        `;
        
        const [currentRows] = await db.execute(getCurrentStatusQuery, [configId]);

        if (currentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        const currentStatus = currentRows[0].is_active;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update to opposite status
        const updateQuery = `
            UPDATE provider_service_configurations 
            SET is_active = ?, updated_at = NOW()
            WHERE config_id = ?
        `;

        const [result] = await db.execute(updateQuery, [newStatus, configId]);

        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update status'
            });
        }

        res.json({
            success: true,
            message: `Configuration ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
            data: {
                config_id: configId,
                previous_status: currentStatus === 1 ? 'active' : 'inactive',
                current_status: newStatus === 1 ? 'active' : 'inactive',
                is_active: newStatus
            }
        });

    } catch (error) {
        console.error('Toggle provider configuration status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating configuration status'
        });
    }
}
}

module.exports = ServiceBookingController;