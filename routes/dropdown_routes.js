// routes/registrationDropdownRoutes.js
const express = require('express');
const router = express.Router();
const registrationDropdownController = require('../controller/dropdown_controller');

/**
 * @swagger
 * tags:
 *   name: Registration Dropdowns
 *   description: APIs for registration page dropdown population
 */

/**
 * @swagger
 * /registration-dropdown/preferred-locations:
 *   get:
 *     summary: Get list of preferred locations (Chennai, Bangalore, Mumbai)
 *     tags: [Registration Dropdowns]
 *     responses:
 *       200:
 *         description: A list of preferred locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   location_id:
 *                     type: integer
 *                   location_name:
 *                     type: string
 */
router.get('/preferred-locations', registrationDropdownController.getPreferredLocations);

/**
 * @swagger
 * /registration-dropdown/states:
 *   get:
 *     summary: Get list of all active states
 *     tags: [Registration Dropdowns]
 *     responses:
 *       200:
 *         description: A list of active states
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   state_id:
 *                     type: integer
 *                   state_name:
 *                     type: string
 *                   state_code:
 *                     type: string
 */
router.get('/states', registrationDropdownController.getAllStates);

/**
 * @swagger
 * /registration-dropdown/cities/{stateId}:
 *   get:
 *     summary: Get cities by state ID
 *     tags: [Registration Dropdowns]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The state ID
 *     responses:
 *       200:
 *         description: A list of cities for the given state
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   city_id:
 *                     type: integer
 *                   city_name:
 *                     type: string
 *                   is_district:
 *                     type: boolean
 */
router.get('/cities/:stateId', registrationDropdownController.getCitiesByState);

/**
 * @swagger
 * /registration-dropdown/districts/{stateId}:
 *   get:
 *     summary: Get districts only by state ID
 *     tags: [Registration Dropdowns]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The state ID
 *     responses:
 *       200:
 *         description: A list of districts for the given state
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   city_id:
 *                     type: integer
 *                   city_name:
 *                     type: string
 */
router.get('/districts/:stateId', registrationDropdownController.getDistrictsByState);

/**
 * @swagger
 * /registration-dropdown/all-cities/{stateId}:
 *   get:
 *     summary: Get all cities including districts by state ID
 *     tags: [Registration Dropdowns]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The state ID
 *     responses:
 *       200:
 *         description: A list of all cities and districts for the given state
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   city_id:
 *                     type: integer
 *                   city_name:
 *                     type: string
 *                   is_district:
 *                     type: boolean
 */
router.get('/all-cities/:stateId', registrationDropdownController.getAllCitiesByState);

/**
 * @swagger
 * /registration-dropdown/service-types:
 *   get:
 *     summary: Get list of service types
 *     tags: [Registration Dropdowns]
 *     responses:
 *       200:
 *         description: A list of service types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   service_id:
 *                     type: integer
 *                   service_name:
 *                     type: string
 *                   service_description:
 *                     type: string
 */
router.get('/service-types', registrationDropdownController.getServiceTypes);

/**
 * @swagger
 * /registration-dropdown/work-types:
 *   get:
 *     summary: Get list of work types
 *     tags: [Registration Dropdowns]
 *     responses:
 *       200:
 *         description: A list of work types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   work_type_id:
 *                     type: integer
 *                   work_type_name:
 *                     type: string
 *                   work_type_description:
 *                     type: string
 */
router.get('/work-types', registrationDropdownController.getWorkTypes);


// Get Interview Status Dropdown
router.get('/dropdown/interview-status', registrationDropdownController.getInterviewStatus);

// Get PF Toggle Dropdown
router.get('/dropdown/pf-toggle', registrationDropdownController.getPfToggle);


module.exports = router;