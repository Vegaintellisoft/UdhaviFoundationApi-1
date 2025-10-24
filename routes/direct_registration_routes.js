// routes/direct_registration_routes.js - WITHOUT SESSION TOKEN, WITH GEOCODING
const express = require('express');
const router = express.Router();
const directRegistrationController = require('../controller/direct_registration_controller');
const dropdownController = require('../controller/dropdown_controller');
const { uploadConfigs, handleUploadError } = require('../utils/uploadUtil');


router.post('/create', directRegistrationController.createRegistration);


router.get('/status/:registrationId', directRegistrationController.getRegistrationStatus);


router.get('/complete/:registrationId', directRegistrationController.getCompleteRegistration);


router.get('/step-data/:registrationId/:step', directRegistrationController.getStepData);

// ====== STEP 1: PERSONAL INFORMATION ======


router.post('/step1/:registrationId', 
  uploadConfigs.multipleDocuments,
  handleUploadError,
  directRegistrationController.savePersonalInfo
);

// ====== STEP 2: CONTACT & ADDRESS WITH GEOCODING ======

router.post('/step2/:registrationId', directRegistrationController.saveContactAddress);

// ====== STEP 3: SERVICE INFORMATION WITH SALARY EXPECTATION ======


router.post('/step3/:registrationId',
  uploadConfigs.serviceImage,
  handleUploadError,
  directRegistrationController.saveServiceInfo
);

// ====== STEP 4: BACKGROUND & REFERENCE CHECK WITH STATUS ======


router.post('/step4/:registrationId',
  uploadConfigs.policeVerification,
  handleUploadError,
  directRegistrationController.saveBackgroundCheck
);

// ====== STEP 5: DOCUMENT UPLOADS WITH VERIFICATION STATUS ======


router.post('/step5/:registrationId',
  uploadConfigs.multipleDocuments,
  handleUploadError,
  directRegistrationController.saveDocumentUploads
);

// ====== STEP 6: ACCOUNT INFORMATION - FINAL SUBMISSION ======


router.post('/step6/:registrationId',
  uploadConfigs.bankDocument,
  handleUploadError,
  directRegistrationController.saveAccountInfo
);

// ====== ADMIN ROUTES FOR STATUS MANAGEMENT ======

router.put('/admin/police-verification/:registrationId', directRegistrationController.updatePoliceVerificationStatus);


router.put('/admin/salary-status/:registrationId', directRegistrationController.updateSalaryStatus);


router.put('/admin/registration-status/:registrationId', directRegistrationController.updateRegistrationStatus);


router.get('/admin/status-history/:registrationId', directRegistrationController.getRegistrationStatusHistory);

// ====== DROPDOWN ROUTES (SAME AS ORIGINAL) ======


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

//router.get("/", directRegistrationController.getUsers);
//router.get("/:registration_id", directRegistrationController.getUser);
router.patch("/:registration_id/status", directRegistrationController.toggleStatus);
router.get("/police-status/:registration_id", directRegistrationController.policeStatusController);
router.patch("/:registration_id/police-verification", directRegistrationController.updatesPoliceVerification);
router.get("/crm-users", directRegistrationController.getCRMUsersController);
router.put("/:registration_id/assign-crm", directRegistrationController.updateCRMUser);
router.put("/:registration_id/toggle-status", directRegistrationController.toggleStatus);



router.put("/users/:registration_id/toggle-status", directRegistrationController.toggleStatus);

 
// Step 1 - Personal Info (profile + id proof)
router.put("/:id/personal", uploadConfigs.multipleDocuments, directRegistrationController.updatePersonal);
 
// Step 2 - Contact Info
router.put("/:id/contact", directRegistrationController.updateContact);
 
// Step 3 - Service Info (service image)
router.put(
  "/:id/service",
  uploadConfigs.serviceImage,     // multer single("service_image")
  directRegistrationController.updateService    // controller
);
 
// Step 4 - Background (police verification doc)
router.put(
  "/:id/background",
  uploadConfigs.policeVerification,   // multer single("police_verification_document")
  directRegistrationController.updateBackground
);
 
// Step 5 - Documents (resume, dl, exp certs)
router.put(
  "/:id/documents",
  uploadConfigs.multipleDocuments,   // multer.fields for multiple files
  directRegistrationController.updateDocuments
);
 
// Step 6 - Account Info (cancelled cheque/passbook)
router.put(
  "/:id/account",
  uploadConfigs.bankDocument,     // multer.single("cancelled_cheque_passbook")
  directRegistrationController.updateAccount
);
 
 
router.get("/", directRegistrationController.getAllUsers);
router.get("/:registration_id", directRegistrationController.getUserById);
router.put("/:registration_id", directRegistrationController.editUser);
 

module.exports = router;
