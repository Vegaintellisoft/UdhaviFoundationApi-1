// queries/registration_queries.js - UPDATED WITH MOBILE OTP VERIFICATION

// ====== MOBILE VERIFICATION QUERIES (NEW) ======

// ✅ Create new OTP or update existing
const createOTPRequest = `
INSERT INTO otp_requests (
  mobile_number, 
  otp, 
  expires_at, 
  attempts, 
  created_at, 
  verified
)
VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0, NOW(), 0)
ON DUPLICATE KEY UPDATE
  otp = VALUES(otp),
  expires_at = VALUES(expires_at),
  attempts = 0,
  created_at = VALUES(created_at),
  verified = 0;
`;

// ✅ Get latest OTP for verification

const getOTPRequest = `
  SELECT * FROM otp_requests
  WHERE mobile_number = ?
  ORDER BY created_at DESC
  LIMIT 1
`;

// ✅ Increment failed attempt count
const updateOTPAttempts = `
  UPDATE otp_requests
  SET attempts = attempts + 1, updated_at = NOW()
  WHERE mobile_number = ?
`;

// ✅ Verify OTP and mark as verified
const verifyOTP = `
  UPDATE otp_requests
  SET verified = 1, verified_at = NOW(), updated_at = NOW()
  WHERE mobile_number = ? AND otp = ? 
    AND expires_at > NOW() 
    AND verified = 0
`;

// ✅ 2. Mark mobile as verified in account_information
const updateMobileVerified = `
  UPDATE account_information
  SET mobile_verified = 1, updated_at = NOW()
  WHERE mobile_number = ?
`;

// ✅ 3. Check if mobile number already registered
const checkMobileAlreadyRegistered = `

  SELECT 
    ur.registration_id,
    ur.registration_status,
    ai.full_name,
    ai.mobile_number
  FROM user_registrations ur
  LEFT JOIN account_information ai 
    ON ur.registration_id = ai.registration_id
  WHERE ur.mobile_number = ?
  LIMIT 1
`;

// ✅ 4. Rate limiting: count OTP requests in the last hour
const checkRecentOTPRequests = `
  SELECT COUNT(*) AS request_count
  FROM otp_requests
  WHERE mobile_number = ?
    AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);
`;

// ✅ 5. Clean expired OTPs
const cleanExpiredOTP = `
  DELETE FROM otp_requests
  WHERE expires_at < NOW()
    OR created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
`;

// ✅ 6. Check OTP verification status
const statusOtp = `
  SELECT verified, verified_at
  FROM otp_requests
  WHERE mobile_number = ?
  ORDER BY created_at DESC
  LIMIT 1;
`;

// ✅ 7. Create registration for new users
//    If the mobile already exists, just update session_token
const createOrUpdateRegistration = `
  INSERT INTO user_registrations (session_token, mobile_number, current_step, registration_status, created_at)
  VALUES (?, ?, 1, 'draft', CURRENT_TIMESTAMP)
  ON DUPLICATE KEY UPDATE
    session_token = VALUES(session_token),
    updated_at = CURRENT_TIMESTAMP
`;

// ✅ 8. Update session token only (for existing user)
const updateRegistrationSession = `
  UPDATE user_registrations
  SET session_token = ?, updated_at = NOW()
  WHERE registration_id = ?
`;

// ====== MODIFIED SESSION MANAGEMENT QUERIES ======

// Create new registration session WITH mobile number
const createRegistrationSession = `
  INSERT INTO user_registrations (session_token, mobile_number, current_step, registration_status, created_at)
  VALUES (?, ?, 1, 'draft', CURRENT_TIMESTAMP)
`;

// Get registration by session token WITH mobile number
const getRegistrationBySession = `
  SELECT * FROM user_registrations 
  WHERE session_token = ?
`;

// Update registration step
const updateRegistrationStep = `
  UPDATE user_registrations 
  SET current_step = ?, updated_at = CURRENT_TIMESTAMP
  WHERE session_token = ?
`;

// Complete registration and set status to submitted
const completeRegistration = `
  UPDATE user_registrations 
  SET is_completed = TRUE, 
      completed_at = CURRENT_TIMESTAMP, 
      updated_at = CURRENT_TIMESTAMP,
      registration_status = 'submitted'
  WHERE session_token = ?
`;

// Update registration status
const updateRegistrationStatus = `
  UPDATE user_registrations 
  SET registration_status = ?, 
      admin_remarks = ?,
      reviewed_by = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE registration_id = ?
`;

// ====== STEP 1: PERSONAL INFORMATION QUERIES ======

// Insert/Update personal information (matching actual table structure)
const insertPersonalInfo = `
  INSERT INTO personal_information (
    registration_id, date_of_birth, gender_id, profile_photo, nationality_id,
    languages_known, id_proof_type_id, id_proof_number, id_proof_document
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    date_of_birth = VALUES(date_of_birth),
    gender_id = VALUES(gender_id),
    profile_photo = VALUES(profile_photo),
    nationality_id = VALUES(nationality_id),
    languages_known = VALUES(languages_known),
    id_proof_type_id = VALUES(id_proof_type_id),
    id_proof_number = VALUES(id_proof_number),
    id_proof_document = VALUES(id_proof_document),
    updated_at = CURRENT_TIMESTAMP
`;

// Get personal information with related data
const getPersonalInfo = `
  SELECT 
    pi.*,
    g.gender_name,
    n.nationality_name,
    ipt.proof_type_name
  FROM personal_information pi
  LEFT JOIN genders g ON pi.gender_id = g.gender_id
  LEFT JOIN nationalities n ON pi.nationality_id = n.nationality_id
  LEFT JOIN id_proof_types ipt ON pi.id_proof_type_id = ipt.id_proof_type_id
  WHERE pi.registration_id = ?
`;

// ====== STEP 2: CONTACT & ADDRESS QUERIES ======

const insertContactAddress = `
  INSERT INTO contact_address_details (
    registration_id,
    current_address,
    permanent_address,
    city,
    state_id,
    pincode,
    preferred_location_id,
    current_latitude,
    current_longitude,
    permanent_latitude,
    permanent_longitude,
    location_accuracy,
    location_verified,
    geocoding_status,
    location_updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 1, 'success', CURRENT_TIMESTAMP)
  ON DUPLICATE KEY UPDATE
    current_address = VALUES(current_address),
    permanent_address = VALUES(permanent_address),
    city = VALUES(city),
    state_id = VALUES(state_id),
    pincode = VALUES(pincode),
    preferred_location_id = VALUES(preferred_location_id),
    current_latitude = VALUES(current_latitude),
    current_longitude = VALUES(current_longitude),
    permanent_latitude = VALUES(permanent_latitude),
    permanent_longitude = VALUES(permanent_longitude),
    location_accuracy = 'manual',
    location_verified = 1,
    geocoding_status = 'success',
    location_updated_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
`;

// ✅ Get contact and address details
const getContactAddress = `
  SELECT 
    cad.*,
    s.state_name,
    pl.location_name AS preferred_work_location
  FROM contact_address_details cad
  LEFT JOIN states s ON cad.state_id = s.state_id
  LEFT JOIN preferred_locations pl ON cad.preferred_location_id = pl.location_id
  WHERE cad.registration_id = ?
`;

// ====== STEP 3: SERVICE INFORMATION QUERIES ======

// Insert salary expectation with pending status
const insertSalaryExpectation = `
  INSERT INTO salary_expectations (
    registration_id,
    expected_salary,
    salary_type,
    currency_code,
    negotiable,
    salary_status
  ) VALUES (?, ?, ?, ?, ?, 0)
  ON DUPLICATE KEY UPDATE
    expected_salary = VALUES(expected_salary),
    salary_type = VALUES(salary_type),
    currency_code = VALUES(currency_code),
    negotiable = VALUES(negotiable),
    salary_status = 0,
    updated_at = CURRENT_TIMESTAMP
`;

// Insert/Update service information
const insertServiceInfo = `
  INSERT INTO service_information (
    registration_id,
    service_type_id,
    work_type_id,
    years_of_experience,
    expected_salary,
    available_day_ids,
    time_slot_ids,
    service_description,
    service_image,
    expectation_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    service_type_id = VALUES(service_type_id),
    work_type_id = VALUES(work_type_id),
    years_of_experience = VALUES(years_of_experience),
    expected_salary = VALUES(expected_salary),
    available_day_ids = VALUES(available_day_ids),
    time_slot_ids = VALUES(time_slot_ids),
    service_description = VALUES(service_description),
    service_image = VALUES(service_image),
    expectation_id = VALUES(expectation_id),
    updated_at = CURRENT_TIMESTAMP
`;

// Get service information with salary expectation
const getServiceInfo = `
  SELECT 
    si.service_info_id,
    si.registration_id,
    si.service_type_id,
    st.service_name,
    si.work_type_id,
    wt.work_type_name,
    si.years_of_experience,
    si.expected_salary,
    se.salary_type,
    se.currency_code,
    se.negotiable,
    si.service_image,
    si.available_day_ids,
    si.time_slot_ids,
    si.service_description,
    GROUP_CONCAT(DISTINCT ad.day_name) AS available_days,
    GROUP_CONCAT(DISTINCT ts.slot_name) AS time_slots
  FROM service_information si
  LEFT JOIN salary_expectations se ON si.expectation_id = se.expectation_id
  LEFT JOIN service_types st ON si.service_type_id = st.service_type_id
  LEFT JOIN work_types wt ON si.work_type_id = wt.work_type_id
  LEFT JOIN available_days ad ON JSON_CONTAINS(si.available_day_ids, CAST(ad.day_id AS JSON), '$')
  LEFT JOIN time_slots ts ON JSON_CONTAINS(si.time_slot_ids, CAST(ts.time_slot_id AS JSON), '$')
  WHERE si.registration_id = ?
  GROUP BY si.service_info_id
`;


// Get salary expectation by registration ID
const getSalaryExpectationByRegistration = `
  SELECT * FROM salary_expectations 
  WHERE registration_id = ?
`;

// ====== STEP 4: BACKGROUND & REFERENCE QUERIES WITH STATUS ======

// Insert/Update background and reference check with pending status
const insertBackgroundCheck = `
  INSERT INTO background_reference_check (
    registration_id, 
    police_verification_done, 
    police_verification_document, 
    police_verification_status,
    has_police_verification,
    criminal_record_details,
    reference1_name,
    reference1_contact,
    reference1_relationship_id,
    reference2_name,
    reference2_contact,
    reference2_relationship_id
  ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    police_verification_done = VALUES(police_verification_done),
    police_verification_document = VALUES(police_verification_document),
    police_verification_status = 'pending',
    has_police_verification = VALUES(has_police_verification),
    criminal_record_details = VALUES(criminal_record_details),
    reference1_name = VALUES(reference1_name),
    reference1_contact = VALUES(reference1_contact),
    reference1_relationship_id = VALUES(reference1_relationship_id),
    reference2_name = VALUES(reference2_name),
    reference2_contact = VALUES(reference2_contact),
    reference2_relationship_id = VALUES(reference2_relationship_id),
    updated_at = CURRENT_TIMESTAMP
`;

// Get background check with status
const getBackgroundCheck = `
  SELECT 
    brc.*,
    rt1.relationship_name as reference1_relationship_name,
    rt2.relationship_name as reference2_relationship_name
  FROM background_reference_check brc
  LEFT JOIN relationship_types rt1 ON brc.reference1_relationship_id = rt1.relationship_id
  LEFT JOIN relationship_types rt2 ON brc.reference2_relationship_id = rt2.relationship_id
  WHERE brc.registration_id = ?
`;

// Update police verification status
const updatePoliceVerificationStatus = `
  UPDATE background_reference_check 
  SET police_verification_status = ?, 
      verification_remarks = ?,
      verified_by = ?,
      verified_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE registration_id = ?
`;

// ====== STEP 5: DOCUMENT UPLOADS QUERIES ======

// Insert/Update document uploads
const insertDocumentUploads = `
  INSERT INTO document_uploads (
    registration_id, resume_bio_data, driving_license, experience_certificates
  ) VALUES (?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    resume_bio_data = VALUES(resume_bio_data),
    driving_license = VALUES(driving_license),
    experience_certificates = VALUES(experience_certificates),
    updated_at = CURRENT_TIMESTAMP
`;

// Get document uploads
const getDocumentUploads = `
  SELECT * FROM document_uploads 
  WHERE registration_id = ?
`;

// Insert document verification log
const insertDocumentVerificationLog = `
  INSERT INTO document_verification_log (
    registration_id, document_type, document_path, verification_status
  ) VALUES (?, ?, ?, 'pending')
`;

// ====== STEP 6: ACCOUNT INFORMATION QUERIES (MODIFIED) ======

// Insert/Update account information - mobile_number now comes from session
const insertAccountInfo = `
  INSERT INTO account_information (
    registration_id,
    full_name,
    email_address,
    mobile_number,
    password_hash,
    bank_account_holder_name,
    account_number,
    ifsc_code,
    cancelled_cheque_passbook,
    terms_accepted,
    information_confirmed,
    profile_image
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    email_address = VALUES(email_address),
    password_hash = VALUES(password_hash),
    bank_account_holder_name = VALUES(bank_account_holder_name),
    account_number = VALUES(account_number),
    ifsc_code = VALUES(ifsc_code),
    cancelled_cheque_passbook = VALUES(cancelled_cheque_passbook),
    terms_accepted = VALUES(terms_accepted),
    information_confirmed = VALUES(information_confirmed),
    profile_image = VALUES(profile_image),
    updated_at = CURRENT_TIMESTAMP
`;


// ✅ Get Account Information (without password)
const getAccountInfo = `
  SELECT 
    account_id,
    registration_id,
    full_name,
    email_address,
    mobile_number,
    bank_account_holder_name,
    account_number,
    ifsc_code,
    cancelled_cheque_passbook,
    profile_image,
    terms_accepted,
    information_confirmed,
    email_verified,
    mobile_verified,
    created_at,
    updated_at
  FROM account_information
  WHERE registration_id = ?
`;

// ✅ Check if email exists (excluding current registration)
const checkEmailExists = `
  SELECT account_id FROM account_information 
  WHERE email_address = ? AND registration_id != ?
`;

// ✅ Check if email exists (for new registrations)
const checkEmailExistsSimple = `
  SELECT account_id FROM account_information 
  WHERE email_address = ?
`;

// ====== STATUS TRACKING QUERIES ======

// Insert registration status history
const insertRegistrationStatusHistory = `
  INSERT INTO registration_status_history (
    registration_id, old_status, new_status, changed_by, change_reason
  ) VALUES (?, ?, ?, ?, ?)
`;

// Get registration status history
const getRegistrationStatusHistory = `
  SELECT rsh.*, ur.session_token
  FROM registration_status_history rsh
  JOIN user_registrations ur ON rsh.registration_id = ur.registration_id
  WHERE rsh.registration_id = ?
  ORDER BY rsh.created_at DESC
`;

// Get all pending verifications
const getPendingVerifications = `
  SELECT 
    ur.registration_id,
    ur.session_token,
    ur.mobile_number,
    ai.full_name,
    ai.email_address,
    brc.police_verification_status,
    se.salary_status,
    ur.registration_status,
    ur.created_at
  FROM user_registrations ur
  LEFT JOIN account_information ai ON ur.registration_id = ai.registration_id
  LEFT JOIN background_reference_check brc ON ur.registration_id = brc.registration_id
  LEFT JOIN service_information si ON ur.registration_id = si.registration_id
  LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
  WHERE ur.registration_status IN ('submitted', 'under_review')
     OR brc.police_verification_status = 'pending'
     OR se.salary_status = 0
  ORDER BY ur.created_at ASC
`;

// Update salary status
const updateSalaryStatus = `
  UPDATE salary_expectations 
  SET salary_status = ?, 
      admin_remarks = ?,
      approved_salary = ?,
      approved_by = ?,
      approved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE registration_id = ?
`;

// ====== COMPLETE REGISTRATION DATA QUERY WITH STATUS ======

// Get complete registration data across all steps with status information
const getCompleteRegistrationData = `
  SELECT 
    ur.registration_id,
    ur.session_token,
    ur.mobile_number,
    ur.current_step,
    ur.is_completed,
    ur.registration_status,
    ur.admin_remarks as registration_remarks,
    ur.created_at as registration_created_at,
    ur.completed_at,
    ur.reviewed_at,
    
    -- Personal Information
    pi.date_of_birth,
    pi.profile_photo,
    pi.id_proof_number,
    pi.id_proof_document,
    pi.languages_known,
    g.gender_name,
    n.nationality_name,
    ipt.proof_type_name,
    
    -- Contact & Address
    cad.current_address,
    cad.permanent_address,
    cad.city,
    cad.state_id,
    cad.pincode,
    cad.preferred_location_id,
    s.state_name,
    pl.location_name,
    
    -- Service Information
    si.service_type_ids,
    si.work_type_ids,
    si.experience_years,
    si.available_day_ids,
    si.time_slot_ids,
    si.service_description,
    si.service_image,
    
    -- Salary Expectation with Status
    se.expected_salary,
    se.salary_type,
    se.currency_code,
    se.salary_status,
    se.admin_remarks as salary_remarks,
    se.approved_salary,
    se.approved_at as salary_approved_at,
    
    -- Background Check with Status
    brc.police_verification_done,
    brc.police_verification_document,
    brc.police_verification_status,
    brc.verification_remarks,
    brc.verified_at as police_verified_at,
    brc.has_police_verification,
    brc.criminal_record_details,
    brc.reference1_name,
    brc.reference1_contact,
    brc.reference2_name,
    brc.reference2_contact,
    rt1.relationship_name as reference1_relationship_name,
    rt2.relationship_name as reference2_relationship_name,
    
    -- Document Uploads
    du.resume_bio_data,
    du.driving_license,
    du.experience_certificates,
    
    -- Account Information
    ai.full_name,
    ai.email_address,
    ai.mobile_number as account_mobile,
    ai.bank_account_holder_name,
    ai.account_number,
    ai.ifsc_code,
    ai.cancelled_cheque_passbook,
    ai.terms_accepted,
    ai.information_confirmed,
    ai.email_verified,
    ai.mobile_verified
    
  FROM user_registrations ur
  LEFT JOIN personal_information pi ON ur.registration_id = pi.registration_id
  LEFT JOIN genders g ON pi.gender_id = g.gender_id
  LEFT JOIN nationalities n ON pi.nationality_id = n.nationality_id
  LEFT JOIN id_proof_types ipt ON pi.id_proof_type_id = ipt.id_proof_type_id
  LEFT JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
  LEFT JOIN states s ON cad.state_id = s.state_id
  LEFT JOIN preferred_locations pl ON cad.preferred_location_id = pl.location_id
  LEFT JOIN service_information si ON ur.registration_id = si.registration_id
  LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
  LEFT JOIN background_reference_check brc ON ur.registration_id = brc.registration_id
  LEFT JOIN relationship_types rt1 ON brc.reference1_relationship_id = rt1.relationship_id
  LEFT JOIN relationship_types rt2 ON brc.reference2_relationship_id = rt2.relationship_id
  LEFT JOIN document_uploads du ON ur.registration_id = du.registration_id
  LEFT JOIN account_information ai ON ur.registration_id = ai.registration_id
  WHERE ur.session_token = ?
`;

// Get registration progress summary with status
const getRegistrationProgress = `
  SELECT 
    ur.registration_id,
    ur.session_token,
    ur.mobile_number,
    ur.current_step,
    ur.is_completed,
    ur.registration_status,
    CASE WHEN pi.registration_id IS NOT NULL THEN 1 ELSE 0 END as step1_completed,
    CASE WHEN cad.registration_id IS NOT NULL THEN 1 ELSE 0 END as step2_completed,
    CASE WHEN si.registration_id IS NOT NULL THEN 1 ELSE 0 END as step3_completed,
    CASE WHEN brc.registration_id IS NOT NULL THEN 1 ELSE 0 END as step4_completed,
    CASE WHEN du.registration_id IS NOT NULL THEN 1 ELSE 0 END as step5_completed,
    CASE WHEN ai.registration_id IS NOT NULL THEN 1 ELSE 0 END as step6_completed,
    brc.police_verification_status,
    se.salary_status
  FROM user_registrations ur
  LEFT JOIN personal_information pi ON ur.registration_id = pi.registration_id
  LEFT JOIN contact_address_details cad ON ur.registration_id = cad.registration_id
  LEFT JOIN service_information si ON ur.registration_id = si.registration_id
  LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
  LEFT JOIN background_reference_check brc ON ur.registration_id = brc.registration_id
  LEFT JOIN document_uploads du ON ur.registration_id = du.registration_id
  LEFT JOIN account_information ai ON ur.registration_id = ai.registration_id
  WHERE ur.session_token = ?
`;

// ====== DROPDOWN QUERIES ======

const getGenders = `SELECT gender_id, gender_name FROM genders WHERE status = 'Active' ORDER BY gender_name`;
const getNationalities = `SELECT nationality_id, nationality_name FROM nationalities WHERE status = 'Active' ORDER BY nationality_name`;
const getIdProofTypes = `SELECT id_proof_type_id, proof_type_name FROM id_proof_types WHERE status = 'Active' ORDER BY proof_type_name`;
const getAllStates = `SELECT state_id, state_name, state_code FROM states WHERE status = 'Active' ORDER BY state_name`;
const getPreferredLocations = `SELECT location_id, location_name FROM preferred_locations WHERE status = 'Active' ORDER BY location_name`;
const getServiceTypes = `SELECT service_id, service_name, service_description FROM service_types WHERE status = 'Active' ORDER BY service_name`;
const getWorkTypes = `SELECT work_type_id, work_type_name, work_type_description FROM work_types WHERE status = 'Active' ORDER BY work_type_name`;
const getAvailableDays = `SELECT day_id, day_name FROM available_days WHERE status = 'Active' ORDER BY FIELD(day_name, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`;
const getTimeSlots = `SELECT slot_id, slot_name, start_time, end_time FROM time_slots WHERE status = 'Active' ORDER BY start_time`;
const getRelationshipTypes = `SELECT relationship_id, relationship_name FROM relationship_types WHERE status = 'Active' ORDER BY relationship_name`;
const getCitiesByState = `SELECT city_id, city_name FROM cities WHERE state_id = ? AND status = 'Active' ORDER BY city_name`;
const getDistrictsByState = `SELECT district_id, district_name FROM districts WHERE state_id = ? AND status = 'Active' ORDER BY district_name`;

const GET_BASIC_USER_DETAILS_BY_MOBILE = `
  SELECT 
    ai.full_name AS full_name,
    st.name AS service_name,
    si.years_of_experience AS years_of_experience,
    si.expected_salary AS expected_salary,
    CASE
      WHEN ur.registration_status = 'submitted' THEN 'Active'
      ELSE 'Inactive'
    END AS status
  FROM account_information ai
  LEFT JOIN service_information si 
    ON ai.registration_id = si.registration_id
  LEFT JOIN service_types st 
    ON si.service_type_id = st.service_id
  LEFT JOIN user_registrations ur
    ON ai.registration_id = ur.registration_id
  WHERE ai.mobile_number = ?
  LIMIT 1
`;



// Export all queries
module.exports = {
  // Mobile verification queries (NEW)
  createOTPRequest,
  getOTPRequest,
  updateOTPAttempts,
  verifyOTP,
  checkMobileAlreadyRegistered,
  checkRecentOTPRequests,
  cleanExpiredOTP,
  statusOtp,
  createOrUpdateRegistration,
  updateRegistrationSession,
  
  // Session management (MODIFIED)
  createRegistrationSession,
  getRegistrationBySession,
  updateRegistrationStep,
  completeRegistration,
  updateRegistrationStatus,
  
  // Personal Information (Step 1)
  insertPersonalInfo,
  getPersonalInfo,
  
  // Contact & Address (Step 2)
  insertContactAddress,
  getContactAddress,
  
  // Service Information (Step 3) with Salary Expectation
  insertSalaryExpectation,
  insertServiceInfo,
  getServiceInfo,
  getSalaryExpectationByRegistration,
  updateSalaryStatus,
  
  // Background Check (Step 4) with Status
  insertBackgroundCheck,
  getBackgroundCheck,
  updatePoliceVerificationStatus,
  
  // Document Uploads (Step 5)
  insertDocumentUploads,
  getDocumentUploads,
  insertDocumentVerificationLog,
  
  // Account Information (Step 6) - MODIFIED
  insertAccountInfo,
  getAccountInfo,
  checkEmailExists,
  checkEmailExistsSimple,
  
  // Status tracking
  insertRegistrationStatusHistory,
  getRegistrationStatusHistory,
  getPendingVerifications,
  
  // Complete data and utilities
  getCompleteRegistrationData,
  getRegistrationProgress,
  
  // Dropdown queries
  getGenders,
  getNationalities,
  getIdProofTypes,
  getAllStates,
  getCitiesByState,
  getDistrictsByState,
  getPreferredLocations,
  getServiceTypes,
  getWorkTypes,
  getAvailableDays,
  getTimeSlots,
  getRelationshipTypes,


  // New //

  GET_BASIC_USER_DETAILS_BY_MOBILE
};