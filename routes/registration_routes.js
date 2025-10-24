// routes/registration_routes.js - UPDATED WITH MOBILE OTP VERIFICATION
const express = require('express');
const router = express.Router();
const registrationController = require('../controller/registration_controller');
const dropdownController = require('../controller/dropdown_controller');
const { uploadConfigs, handleUploadError } = require('../utils/uploadUtil');

/**
 * @swagger
 * components:
 *   schemas:
 *     OTPRequest:
 *       type: object
 *       required:
 *         - mobile_number
 *       properties:
 *         mobile_number:
 *           type: string
 *           pattern: '^[6-9]\d{9}$'
 *           description: 10-digit Indian mobile number
 *     OTPVerification:
 *       type: object
 *       required:
 *         - mobile_number
 *         - otp
 *       properties:
 *         mobile_number:
 *           type: string
 *           pattern: '^[6-9]\d{9}$'
 *         otp:
 *           type: string
 *           pattern: '^\d{6}$'
 *           description: 6-digit OTP
 *     RegistrationSession:
 *       type: object
 *       properties:
 *         sessionToken:
 *           type: string
 *           description: Unique session identifier
 *         registrationId:
 *           type: integer
 *           description: Registration ID in database
 *         currentStep:
 *           type: integer
 *           description: Current step in registration process (1-6)
 *         registrationStatus:
 *           type: string
 *           enum: [draft, submitted, under_review, approved, rejected, pending_documents]
 *           description: Overall registration status
 *         mobileNumber:
 *           type: string
 *           description: Verified mobile number
 */

/**
 * @swagger
 * tags:
 *   name: Mobile Verification
 *   description: Mobile number verification with OTP before registration
 */

/**
 * @swagger
 * tags:
 *   name: Registration
 *   description: Multi-step user registration system with status tracking
 */

// ====== MOBILE VERIFICATION ROUTES (BEFORE REGISTRATION) ======

/**
 * @swagger
 * /registration/send-otp:
 *   post:
 *     summary: Send OTP to mobile number for verification
 *     tags: [Mobile Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully to your mobile number"
 *                 data:
 *                   type: object
 *                   properties:
 *                     mobile_number:
 *                       type: string
 *                     otp_expires_at:
 *                       type: string
 *                       format: date-time
 *                     masked_mobile:
 *                       type: string
 *                       example: "XXXXXXX123"
 *       400:
 *         description: Invalid mobile number or mobile already registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Mobile number already registered. Please login instead."
 *       429:
 *         description: Too many OTP requests
 */
router.post('/send-otp', registrationController.sendOTP);

/**
 * @swagger
 * /registration/verify-otp:
 *   post:
 *     summary: Verify OTP and get registration session token
 *     tags: [Mobile Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerification'
 *     responses:
 *       200:
 *         description: OTP verified successfully, registration session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mobile number verified successfully"
 *                 data:
 *                   $ref: '#/components/schemas/RegistrationSession'
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: OTP request not found
 */
router.post('/verify-otp', registrationController.verifyOTPAndInitialize);

/**
 * @swagger
 * /registration/resend-otp:
 *   post:
 *     summary: Resend OTP to mobile number
 *     tags: [Mobile Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile_number
 *             properties:
 *               mobile_number:
 *                 type: string
 *                 pattern: '^[6-9]\d{9}$'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Invalid mobile number or too many attempts
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/resend-otp', registrationController.resendOTP);

// ====== EXISTING REGISTRATION ROUTES (NOW REQUIRE VERIFIED SESSION) ======

/**
 * @swagger
 * /registration/status/{sessionToken}:
 *   get:
 *     summary: Get registration status and current step with detailed status info
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: sessionToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registration status retrieved with verification status
 */
router.get('/status/:sessionToken', registrationController.getRegistrationStatus);

/**
 * @swagger
 * /registration/complete/{sessionToken}:
 *   get:
 *     summary: Get complete registration data with status information
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: sessionToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Complete registration data with all status fields
 */
router.get('/complete/:sessionToken', registrationController.getCompleteRegistration);

/**
 * @swagger
 * /registration/step-data/{sessionToken}/{step}:
 *   get:
 *     summary: Get data for a specific step
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: sessionToken
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: step
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 6
 *     responses:
 *       200:
 *         description: Step data retrieved successfully
 */
router.get('/step-data/:sessionToken/:step', registrationController.getStepData);

// ====== STEP 1: PERSONAL INFORMATION ======

/**
 * @swagger
 * /registration/step1/{sessionToken}:
 *   post:
 *     summary: Save personal information (Step 1) - Documents set to pending verification
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: sessionToken
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - date_of_birth
 *               - gender_id
 *               - nationality_id
 *               - id_proof_type_id
 *               - id_proof_number
 *             properties:
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender_id:
 *                 type: integer
 *               nationality_id:
 *                 type: integer
 *               languages_known:
 *                 type: string
 *               id_proof_type_id:
 *                 type: integer
 *               id_proof_number:
 *                 type: string
 *               profile_photo:
 *                 type: string
 *                 format: binary
 *               id_proof_document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Personal information saved, documents pending verification
 */
router.post('/step1/:sessionToken', 
  uploadConfigs.multipleDocuments,
  handleUploadError,
  registrationController.savePersonalInfo
);

// ====== STEP 2: CONTACT & ADDRESS ======

/**
 * @swagger
 * /registration/step2/{sessionToken}:
 *   post:
 *     summary: Save contact and address details (Step 2)
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: sessionToken
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               current_address:
 *                 type: string
 *               permanent_address:
 *                 type: string
 *               city:
 *                 type: string
 *               state_id:
 *                 type: integer
 *               pincode:
 *                 type: string
 *               preferred_location_id:
 *                 type: integer
 */
router.post('/step2/:sessionToken', registrationController.saveContactAddress);

// ====== STEP 3: SERVICE INFORMATION WITH SALARY EXPECTATION ======

/**
 * @swagger
 * /registration/step3/{sessionToken}:
 *   post:
 *     summary: Save service information (Step 3) - Salary expectation set to pending (status 0)
 *     tags: [Registration]
 */
router.post('/step3/:sessionToken',
  uploadConfigs.serviceImage,
  handleUploadError,
  registrationController.saveServiceInfo
);

// ====== STEP 4: BACKGROUND & REFERENCE CHECK WITH STATUS ======

/**
 * @swagger
 * /registration/step4/{sessionToken}:
 *   post:
 *     summary: Save background check (Step 4) - Police verification set to pending status
 *     tags: [Registration]
 */
router.post('/step4/:sessionToken',
  uploadConfigs.policeVerification,
  handleUploadError,
  registrationController.saveBackgroundCheck
);

// ====== STEP 5: DOCUMENT UPLOADS WITH VERIFICATION STATUS ======

/**
 * @swagger
 * /registration/step5/{sessionToken}:
 *   post:
 *     summary: Upload documents (Step 5) - All documents set to pending verification
 *     tags: [Registration]
 */
router.post('/step5/:sessionToken',
  uploadConfigs.multipleDocuments,
  handleUploadError,
  registrationController.saveDocumentUploads
);

// ====== STEP 6: ACCOUNT INFORMATION - FINAL SUBMISSION ======

/**
 * @swagger
 * /registration/step6/{sessionToken}:
 *   post:
 *     summary: Complete registration (Step 6) - Status automatically set to 'submitted'
 *     tags: [Registration]
 *     description: Mobile number is pre-filled from verified session, cannot be changed
 */
router.post('/step6/:sessionToken',
  uploadConfigs.bankDocument,
  handleUploadError,
  registrationController.saveAccountInfo
);

// ====== ADMIN ROUTES FOR STATUS MANAGEMENT ======
router.get('/admin/pending-verifications', registrationController.getPendingVerifications);
router.get('/admin/dashboard-summary', registrationController.getDashboardSummary);
router.put('/admin/police-verification/:registrationId', registrationController.updatePoliceVerificationStatus);
router.put('/admin/salary-status/:registrationId', registrationController.updateSalaryStatus);
router.put('/admin/registration-status/:registrationId', registrationController.updateRegistrationStatus);
router.get('/admin/status-history/:registrationId', registrationController.getRegistrationStatusHistory);
router.post('/admin/bulk-approve', registrationController.bulkApproveRegistrations);

// ====== DROPDOWN ROUTES ======
router.get('/dropdowns/all', dropdownController.getAllDropdownData);
router.get('/dropdowns/preferred-locations', dropdownController.getPreferredLocations);
router.get('/dropdowns/states', dropdownController.getAllStates);
router.get('/dropdowns/cities/:stateId', dropdownController.getCitiesByState);
router.get('/dropdowns/districts/:stateId', dropdownController.getDistrictsByState);
router.get('/dropdowns/service-types', dropdownController.getServiceTypes);
router.get('/dropdowns/work-types', dropdownController.getWorkTypes);
router.get('/dropdowns/genders', dropdownController.getGenders);
router.get('/dropdowns/nationalities', dropdownController.getNationalities);
router.get('/dropdowns/id-proof-types', dropdownController.getIdProofTypes);
router.get('/dropdowns/available-days', dropdownController.getAvailableDays);
router.get('/dropdowns/time-slots', dropdownController.getTimeSlots);
router.get('/dropdowns/relationship-types', dropdownController.getRelationshipTypes);


router.get('/user-details/:mobile_number', registrationController.getBasicUserDetailsByMobile);

module.exports = router;