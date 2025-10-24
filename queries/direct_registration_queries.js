// queries/direct_registration_queries.js - FOR DIRECT REGISTRATION WITH GEOCODING

// ====== REGISTRATION MANAGEMENT QUERIES ======

// Create new registration directly (without session token)
// const createDirectRegistration = `
//   INSERT INTO user_registrations (current_step, registration_status, created_at)
//   VALUES (1, 'draft', CURRENT_TIMESTAMP)
// `;

const createDirectRegistration = `
  INSERT INTO user_registrations (current_step, registration_status, created_at, session_token)
  VALUES (1, 'draft', CURRENT_TIMESTAMP, ?)
`;

// Check if registration exists by ID
const checkRegistrationExists = `
  SELECT registration_id, registration_status FROM user_registrations 
  WHERE registration_id = ?
`;
// const checkRegistrationExists = `
//   SELECT registration_id, registration_status FROM user_registrations 
//   WHERE registration_id = ?
// `;


// Update registration step by ID
const updateRegistrationStep = `
  UPDATE user_registrations 
  SET current_step = ?, updated_at = CURRENT_TIMESTAMP
  WHERE registration_id = ?
`;

// Complete registration and set status to submitted
const completeRegistration = `
  UPDATE user_registrations 
  SET is_completed = TRUE, 
      completed_at = CURRENT_TIMESTAMP, 
      updated_at = CURRENT_TIMESTAMP,
      registration_status = 'submitted'
  WHERE registration_id = ?
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
// const insertPersonalInfo = `
//   INSERT INTO personal_information (
//     registration_id, date_of_birth, gender_id, profile_photo, nationality_id,
//     languages_known, id_proof_type_id, id_proof_number, id_proof_document
//   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//   ON DUPLICATE KEY UPDATE
//     date_of_birth = VALUES(date_of_birth),
//     gender_id = VALUES(gender_id),
//     profile_photo = VALUES(profile_photo),
//     nationality_id = VALUES(nationality_id),
//     languages_known = VALUES(languages_known),
//     id_proof_type_id = VALUES(id_proof_type_id),
//     id_proof_number = VALUES(id_proof_number),
//     id_proof_document = VALUES(id_proof_document),
//     updated_at = CURRENT_TIMESTAMP
// `;
const insertPersonalInfo = `
  INSERT INTO personal_information (
    registration_id, first_name, last_name, date_of_birth, gender_id, profile_photo, nationality_id,
    languages_known, id_proof_type_id, id_proof_number, id_proof_document
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
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

// ====== STEP 2: CONTACT & ADDRESS QUERIES WITH GEOCODING ======

// Insert/Update contact and address details WITH LAT/LONG
// const insertContactAddress = `
//   INSERT INTO contact_address_details (
//     registration_id, current_address, current_latitude, current_longitude,
//     permanent_address, permanent_latitude, permanent_longitude,
//     city, state_id, pincode, preferred_location_id
//   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   ON DUPLICATE KEY UPDATE
//     current_address = VALUES(current_address),
//     current_latitude = VALUES(current_latitude),
//     current_longitude = VALUES(current_longitude),
//     permanent_address = VALUES(permanent_address),
//     permanent_latitude = VALUES(permanent_latitude),
//     permanent_longitude = VALUES(permanent_longitude),
//     city = VALUES(city),
//     state_id = VALUES(state_id),
//     pincode = VALUES(pincode),
//     preferred_location_id = VALUES(preferred_location_id),
//     updated_at = CURRENT_TIMESTAMP
// `;
const insertContactAddress = `
  INSERT INTO contact_address_details (
    registration_id,
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
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 1, 'success', CURRENT_TIMESTAMP)
  ON DUPLICATE KEY UPDATE
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


// Get contact and address details WITH LAT/LONG
const getContactAddress = `
  SELECT 
    cad.*,
    s.state_name,
    pl.location_name
  FROM contact_address_details cad
  LEFT JOIN states s ON cad.state_id = s.state_id
  LEFT JOIN preferred_locations pl ON cad.preferred_location_id = pl.location_id
  WHERE cad.registration_id = ?
`;

// ====== STEP 3: SERVICE INFORMATION QUERIES ======

// Insert salary expectation with pending status
// Insert or update salary expectation
const insertSalaryExpectation = `
  INSERT INTO salary_expectations (
    registration_id, expected_salary, salary_type, currency_code, negotiable, status
  ) VALUES (?, ?, ?, ?, ?, 0)
  ON DUPLICATE KEY UPDATE
    expected_salary = VALUES(expected_salary),
    salary_type = VALUES(salary_type),
    currency_code = VALUES(currency_code),
    negotiable = VALUES(negotiable),
    updated_at = CURRENT_TIMESTAMP
`;

// Insert or update service info
const insertServiceInfo = `
  INSERT INTO service_information (
    registration_id, service_type_id, work_type_id, years_of_experience,
    available_day_ids, time_slot_ids, service_description, service_image, expectation_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    service_type_id = VALUES(service_type_id),
    work_type_id = VALUES(work_type_id),
    years_of_experience = VALUES(years_of_experience),
    available_day_ids = VALUES(available_day_ids),
    time_slot_ids = VALUES(time_slot_ids),
    service_description = VALUES(service_description),
    service_image = VALUES(service_image),
    expectation_id = VALUES(expectation_id),
    updated_at = CURRENT_TIMESTAMP
`;

// const insertSalaryExpectation = `
//   INSERT INTO salary_expectations (
//     registration_id, expected_salary, salary_type, currency_code, negotiable, salary_status
//   ) VALUES (?, ?, ?, ?, ?, 0)
//   ON DUPLICATE KEY UPDATE
//     expected_salary = VALUES(expected_salary),
//     salary_type = VALUES(salary_type),
//     currency_code = VALUES(currency_code),
//     negotiable = VALUES(negotiable),
//     salary_status = 0,
//     updated_at = CURRENT_TIMESTAMP
// `;

// // Insert/Update service information
// const insertServiceInfo = `
//   INSERT INTO service_information (
//     registration_id, service_type_ids, work_type_ids, experience_years,
//     available_day_ids, time_slot_ids, service_description, service_image, salary_expectation_id
//   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//   ON DUPLICATE KEY UPDATE
//     service_type_ids = VALUES(service_type_ids),
//     work_type_ids = VALUES(work_type_ids),
//     experience_years = VALUES(experience_years),
//     available_day_ids = VALUES(available_day_ids),
//     time_slot_ids = VALUES(time_slot_ids),
//     service_description = VALUES(service_description),
//     service_image = VALUES(service_image),
//     salary_expectation_id = VALUES(salary_expectation_id),
//     updated_at = CURRENT_TIMESTAMP
// `;

// Get service information with salary expectation
const getServiceInfo = `
  SELECT 
    si.*,
    se.expected_salary,
    se.salary_type,
    se.currency_code,
    se.negotiable,
    se.salary_status,
    se.admin_remarks as salary_remarks,
    se.approved_salary
  FROM service_information si
  LEFT JOIN salary_expectations se ON si.salary_expectation_id = se.expectation_id
  WHERE si.registration_id = ?
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

// ====== STEP 6: ACCOUNT INFORMATION QUERIES ======

// Insert/Update account information
const insertAccountInfo = `
  INSERT INTO account_information (
    registration_id, full_name, email_address, mobile_number, password_hash,
    bank_account_holder_name, account_number, ifsc_code, cancelled_cheque_passbook,
    terms_accepted, information_confirmed
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    email_address = VALUES(email_address),
    mobile_number = VALUES(mobile_number),
    password_hash = VALUES(password_hash),
    bank_account_holder_name = VALUES(bank_account_holder_name),
    account_number = VALUES(account_number),
    ifsc_code = VALUES(ifsc_code),
    cancelled_cheque_passbook = VALUES(cancelled_cheque_passbook),
    terms_accepted = VALUES(terms_accepted),
    information_confirmed = VALUES(information_confirmed),
    updated_at = CURRENT_TIMESTAMP
`;

// Get account information (without password)
const getAccountInfo = `
  SELECT 
    account_id, registration_id, full_name, email_address, mobile_number,
    bank_account_holder_name, account_number, ifsc_code, cancelled_cheque_passbook,
    terms_accepted, information_confirmed, email_verified, mobile_verified,
    created_at, updated_at
  FROM account_information 
  WHERE registration_id = ?
`;

// Check if email exists (for new registrations)
const checkEmailExistsSimple = `
  SELECT account_id FROM account_information 
  WHERE email_address = ?
`;

// Check if mobile exists (for new registrations)
const checkMobileExistsSimple = `
  SELECT account_id FROM account_information 
  WHERE mobile_number = ?
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
  SELECT * FROM registration_status_history
  WHERE registration_id = ?
  ORDER BY created_at DESC
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

// ====== COMPLETE REGISTRATION DATA QUERY WITH STATUS AND GEOCODING ======

// Get complete registration data across all steps with status and lat/long information
const getCompleteRegistrationData = `
  SELECT 
    ur.registration_id,
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
    
    -- Contact & Address WITH GEOCODING
    cad.current_address,
    cad.current_latitude,
    cad.current_longitude,
    cad.permanent_address,
    cad.permanent_latitude,
    cad.permanent_longitude,
    cad.city,
    cad.state_id,
    cad.pincode,
    cad.preferred_location_id,
    s.state_name,
    pl.location_name,
    
    -- Service Information
    si.service_type_id,
    si.work_type_id,
    si.years_of_experience,
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
    ai.mobile_number,
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
  WHERE ur.registration_id = ?
`;


// Get registration progress summary with status
const getRegistrationProgress = `
  SELECT 
    ur.registration_id,
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
  WHERE ur.registration_id = ?
`;

// ====== DROPDOWN QUERIES (SAME AS ORIGINAL) ======

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


const getAllUser = `
SELECT
    ur.registration_id,
    COALESCE(CONCAT(pi.first_name, ' ', pi.last_name), ai.full_name) AS name,
    ai.mobile_number AS phoneNo,
    GROUP_CONCAT(DISTINCT st.name) AS service,
    brc.police_verification_status AS policeVerification,
    si.handle_by,
    cu.name AS handleBy,
    CASE
        WHEN ur.registration_status = 'approved' THEN 'active'
        ELSE 'inactive'
    END AS status
FROM user_registrations ur
JOIN account_information ai
    ON ur.registration_id = ai.registration_id
LEFT JOIN personal_information pi
    ON ur.registration_id = pi.registration_id
LEFT JOIN service_information si
    ON ur.registration_id = si.registration_id
LEFT JOIN service_types st
    ON si.service_type_id = st.service_id
LEFT JOIN background_reference_check brc
    ON ur.registration_id = brc.registration_id
LEFT JOIN crm_users cu                
    ON si.handle_by = cu.id
WHERE ur.current_step = 6
  AND ur.is_completed = 1
GROUP BY
    ur.registration_id, name, ai.mobile_number,
    brc.police_verification_status, si.handle_by,
    cu.name, ur.registration_status;
`;
 
const getSingleUsers = `
SELECT
    COALESCE(CONCAT(pi.first_name, ' ', pi.last_name), ai.full_name) AS name,
    ai.mobile_number AS phoneNo,
    GROUP_CONCAT(DISTINCT st.name) AS service,
    brc.police_verification_status AS policeVerification,
    si.handle_by,
    cu.name AS handleBy,
    CASE
        WHEN ur.registration_status = 'approved' THEN 'active'
        ELSE 'inactive'
    END AS status
FROM user_registrations ur
JOIN account_information ai
    ON ur.registration_id = ai.registration_id
LEFT JOIN personal_information pi
    ON ur.registration_id = pi.registration_id
LEFT JOIN service_information si
    ON ur.registration_id = si.registration_id
LEFT JOIN service_types st
    ON si.service_type_id = st.service_id
LEFT JOIN background_reference_check brc
    ON ur.registration_id = brc.registration_id
LEFT JOIN crm_users cu          
    ON si.handle_by = cu.id
WHERE ur.registration_id = ?
GROUP BY
    name, ai.mobile_number, brc.police_verification_status,
    si.handle_by, cu.name, ur.registration_status;
`;
 
const updateAccountInfo = `
UPDATE account_information ai
JOIN service_information si
    ON ai.registration_id = si.registration_id
JOIN background_reference_check brc
    ON ai.registration_id = brc.registration_id
JOIN personal_information pi
    ON ai.registration_id = pi.registration_id
SET
    pi.first_name = ?,
    pi.last_name = ?,
    ai.mobile_number = ?,
    si.service_type_id = ?,
    brc.police_verification_status = ?,
    si.handle_by = ?
WHERE ai.registration_id = ?;
`;
 
const updateServiceInfo = `
UPDATE service_information
SET service_description = ?
WHERE registration_id = ?;
`;
 
const assignCRMUser = `
  UPDATE service_information
  SET handle_by = ?
  WHERE registration_id = ?;
`;
 
const updateStatus = `
UPDATE user_registrations
SET registration_status = ?
WHERE registration_id = ?;
`;
 
const getPoliceStatus = `
SELECT
    ur.registration_id,
    COALESCE(CONCAT(pi.first_name, ' ', pi.last_name), ai.full_name) AS name,
    brc.police_verification_status AS policeVerification
FROM user_registrations ur
JOIN account_information ai
    ON ur.registration_id = ai.registration_id
LEFT JOIN personal_information pi
    ON ur.registration_id = pi.registration_id
LEFT JOIN background_reference_check brc
    ON ur.registration_id = brc.registration_id
WHERE ur.current_step = 6
  AND ur.is_completed = 1;
`;
 
const updatesPoliceVerification = `
  UPDATE background_reference_check
  SET police_verification_status = ?
  WHERE registration_id = ?;
`;
 
 
const getCRMUsers = `
SELECT id AS handleById, name AS handleByName
FROM crm_users;
`;


const updateUserDetails = `
UPDATE account_information ai
JOIN service_information si
    ON ai.registration_id = si.registration_id
JOIN background_reference_check brc
    ON ai.registration_id = brc.registration_id
JOIN personal_information pi
    ON ai.registration_id = pi.registration_id
SET
    pi.first_name = ?,
    pi.last_name = ?,
    ai.mobile_number = ?,
    si.service_type_id = ?,
    brc.police_verification_status = ?,
    si.handle_by = ?
WHERE ai.registration_id = ?;
`;
 
const toggleStatus = `
UPDATE user_registrations
SET registration_status = CASE
    WHEN registration_status = 'approved' THEN 'rejected'
    ELSE 'approved'
END
WHERE registration_id = ?;
`;
 
const getStatus = `
SELECT CASE
    WHEN registration_status = 'approved' THEN 'active'
    ELSE 'inactive'
END AS status
FROM user_registrations
WHERE registration_id = ?;
`;


 
// ---------- STEP 1: Personal ----------
const updatePersonalInfo = `
  UPDATE personal_information
  SET date_of_birth = ?, gender_id = ?, nationality_id = ?, languages_known = ?,
      id_proof_type_id = ?, id_proof_number = ?, updated_at = NOW()
  WHERE registration_id = ?;
`;
 
const updatePersonalFiles = `
  UPDATE personal_information
  SET profile_photo = COALESCE(?, profile_photo),
      id_proof_document = COALESCE(?, id_proof_document),
      updated_at = NOW()
  WHERE registration_id = ?;
`;
 
const getGenderById = `SELECT gender_name FROM genders WHERE gender_id = ?;`;
const getNationalityById = `SELECT nationality_name FROM nationalities WHERE nationality_id = ?;`;
const getIdProofTypeById = `SELECT proof_type_name FROM id_proof_types WHERE id_proof_type_id = ?;`;
 
// ---------- STEP 2: Contact ----------
//Step 2: Contact & Address
const checkContactExists = `
  SELECT contact_id
  FROM contact_address_details
  WHERE registration_id = ?;
`;
const updateContactInfo = `
  UPDATE contact_address_details
  SET
    current_address = ?,
    permanent_address = ?,
    city = ?,
    state_id = ?,
    pincode = ?,
    preferred_location_id = ?,
    current_latitude = ?,
    current_longitude = ?,
    permanent_latitude = ?,
    permanent_longitude = ?,
    updated_at = NOW()
  WHERE registration_id = ?;
`;
 
// Insert new contact info
const insertContactInfo = `
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
    created_at,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
`;
 
 
const getStateById = `SELECT state_name FROM states WHERE state_id = ?;`;
const getPreferredLocationById = `SELECT location_name FROM preferred_locations WHERE location_id = ?;`;
 
// ---------- STEP 3: Service ----------
const updatesServiceInfo = `
  UPDATE service_information
  SET service_type_id = ?,
      work_type_id = ?,
      years_of_experience = ?,
      expected_salary = ?,
      service_image = COALESCE(?, service_image),
      available_day_ids = ?,
      time_slot_ids = ?,
      service_description = COALESCE(?, service_description),
      updated_at = NOW()
  WHERE registration_id = ?;
`;
 
const getServiceNameById = `SELECT name FROM service_types WHERE service_id = ?;`;
const getWorkTypeNameById = `SELECT work_type_name FROM work_types WHERE work_type_id = ?;`;
 
// ---------- STEP 4: Background ----------
const updateBackgroundCheck = `
  INSERT INTO background_reference_check (
    registration_id,
    police_verification_done,
    police_verification_document,
    reference1_name,
    reference1_contact,
    reference1_relation_id,
    reference2_name,
    reference2_contact,
    reference2_relation_id,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  ON DUPLICATE KEY UPDATE
    police_verification_done = VALUES(police_verification_done),
    police_verification_document = VALUES(police_verification_document),
    reference1_name = VALUES(reference1_name),
    reference1_contact = VALUES(reference1_contact),
    reference1_relation_id = VALUES(reference1_relation_id),
    reference2_name = VALUES(reference2_name),
    reference2_contact = VALUES(reference2_contact),
    reference2_relation_id = VALUES(reference2_relation_id),
    updated_at = NOW();
`;
 
// ---------- STEP 5: Documents ----------
const updateDocuments = `
  INSERT INTO document_uploads (
    registration_id,
    resume_bio_data,
    driving_license,
    experience_certificates,
    updated_at
  )
  VALUES (?, ?, ?, ?, NOW())
  ON DUPLICATE KEY UPDATE
    resume_bio_data = VALUES(resume_bio_data),
    driving_license = VALUES(driving_license),
    experience_certificates = VALUES(experience_certificates),
    updated_at = NOW();
`;
 
 
// ---------- STEP 6: Account ----------
const updatesAccountInfo = `
  UPDATE account_information
  SET full_name = ?, email_address = ?, mobile_number = ?,
      bank_account_holder_name = ?, account_number = ?, ifsc_code = ?,
      cancelled_cheque_passbook = COALESCE(?, cancelled_cheque_passbook),
      updated_at = NOW()
  WHERE registration_id = ?;
`;
 
// ---------- GET ALL USERS ----------
const getAllUsers = `
  SELECT
    ur.registration_id,
    ai.full_name,
    ai.mobile_number AS phoneNo,
    st.name AS service_name,
    wt.work_type_name,
    brc.police_verification_status AS policeVerification,
    cu.name AS handle_by,
    CASE
      WHEN ur.registration_status IN ('approved','active') THEN 'active'
      ELSE 'inactive'
    END AS status
  FROM user_registrations ur
  LEFT JOIN account_information ai ON ai.registration_id = ur.registration_id
  LEFT JOIN service_information si ON si.registration_id = ur.registration_id
  LEFT JOIN service_types st ON st.service_id = si.service_type_id
  LEFT JOIN work_types wt ON wt.work_type_id = si.work_type_id
  LEFT JOIN background_reference_check brc ON brc.registration_id = ur.registration_id
  LEFT JOIN crm_users cu ON cu.id = ur.crm_id;
`;
 
// ---------- GET USER BY ID ----------
const getUserById = `
SELECT 
    ur.registration_id,
    ai.full_name,
    ai.email_address,
    ai.mobile_number,
    DATE_FORMAT(pi.date_of_birth, '%Y-%m-%d') AS date_of_birth,
    g.gender_name,
    n.nationality_name,
    pi.languages_known,
    ipt.proof_type_name,
    pi.id_proof_number,
    pi.profile_photo,
    pi.id_proof_document,
    cad.current_address,
    cad.permanent_address,
    cad.city,
    s.state_name,
    cad.pincode,
    cad.current_latitude,
    cad.current_longitude,
    cad.permanent_latitude,
    cad.permanent_longitude,
    pl.location_name AS preferred_work_location,
    st.name AS service_name,
    wt.work_type_name,
    si.years_of_experience,
    si.expected_salary,
    si.service_image,

    -- ✅ Available Days (JSON array)
    COALESCE((
        SELECT JSON_ARRAYAGG(ad.day_name)
        FROM available_days ad
        WHERE si.available_day_ids IS NOT NULL
          AND JSON_CONTAINS(si.available_day_ids, CAST(ad.day_id AS JSON), '$')
    ), JSON_ARRAY()) AS available_days,

    -- ✅ Time Slots (JSON array)
    COALESCE((
        SELECT JSON_ARRAYAGG(ts.slot_name)
        FROM time_slots ts
        WHERE si.time_slot_ids IS NOT NULL
          AND JSON_CONTAINS(si.time_slot_ids, CAST(ts.slot_id AS JSON), '$')
    ), JSON_ARRAY()) AS time_slots,

    brc.police_verification_done,
    brc.police_verification_status,
    brc.police_verification_document,
    brc.reference1_name,
    brc.reference1_contact,
    COALESCE(r1.relationship_name, 'Not Provided') AS reference1_relation,
    brc.reference2_name,
    brc.reference2_contact,
    COALESCE(r2.relationship_name, 'Not Provided') AS reference2_relation,
    du.resume_bio_data,
    du.driving_license,
    du.experience_certificates,
    ai.bank_account_holder_name,
    ai.account_number,
    ai.ifsc_code,
    ai.cancelled_cheque_passbook,
    cu.name AS handle_by,
    CASE 
        WHEN ur.registration_status = 'active' THEN 'active'
        ELSE 'inactive'
    END AS status

FROM user_registrations ur
LEFT JOIN account_information ai ON ai.registration_id = ur.registration_id
LEFT JOIN personal_information pi ON pi.registration_id = ur.registration_id
LEFT JOIN genders g ON g.gender_id = pi.gender_id
LEFT JOIN nationalities n ON n.nationality_id = pi.nationality_id
LEFT JOIN id_proof_types ipt ON ipt.id_proof_type_id = pi.id_proof_type_id
LEFT JOIN contact_address_details cad ON cad.registration_id = ur.registration_id
LEFT JOIN states s ON s.state_id = cad.state_id
LEFT JOIN preferred_locations pl ON pl.location_id = cad.preferred_location_id
LEFT JOIN service_information si ON si.registration_id = ur.registration_id
LEFT JOIN service_types st ON st.service_id = si.service_type_id
LEFT JOIN work_types wt ON wt.work_type_id = si.work_type_id
LEFT JOIN background_reference_check brc ON brc.registration_id = ur.registration_id
LEFT JOIN relationship_types r1 ON r1.relationship_id = brc.reference1_relationship_id
LEFT JOIN relationship_types r2 ON r2.relationship_id = brc.reference2_relationship_id
LEFT JOIN document_uploads du ON du.registration_id = ur.registration_id
LEFT JOIN crm_users cu ON cu.id = ur.crm_id
WHERE ur.registration_id = ?;
`;

const getUserByMobileNumber = `
SELECT 
    ur.registration_id,
    ai.full_name,
    ai.email_address,
    ai.mobile_number,
    DATE_FORMAT(pi.date_of_birth, '%Y-%m-%d') AS date_of_birth,
    pi.gender_id,
    g.gender_name,
    n.nationality_name,
    pi.languages_known,
    ipt.proof_type_name,
    pi.id_proof_number,
    pi.profile_photo,
    pi.id_proof_document,
    cad.current_address,
    cad.permanent_address,

    -- ✅ Fix: always return numeric city_id if exists
    COALESCE(c.city_id, cad.city) AS city_id,
    COALESCE(c.city_name, cad.city) AS city_name,

    cad.state_id,
    s.state_name,
    cad.pincode,
    cad.current_latitude,
    cad.current_longitude,
    cad.permanent_latitude,
    cad.permanent_longitude,
    pl.location_name AS preferred_work_location,
    st.name AS service_name,
    wt.work_type_name,
    si.years_of_experience,
    si.expected_salary,
    si.service_image,

    -- Available Days
    COALESCE((
        SELECT JSON_ARRAYAGG(ad.day_name)
        FROM available_days ad
        WHERE si.available_day_ids IS NOT NULL
          AND JSON_CONTAINS(si.available_day_ids, CAST(ad.day_id AS JSON), '$')
    ), JSON_ARRAY()) AS available_days,

    -- Time Slots
    COALESCE((
        SELECT JSON_ARRAYAGG(ts.slot_name)
        FROM time_slots ts
        WHERE si.time_slot_ids IS NOT NULL
          AND JSON_CONTAINS(si.time_slot_ids, CAST(ts.slot_id AS JSON), '$')
    ), JSON_ARRAY()) AS time_slots,

    brc.police_verification_done,
    brc.police_verification_status,
    brc.police_verification_document,
    brc.reference1_name,
    brc.reference1_contact,
    COALESCE(r1.relationship_name, 'Not Provided') AS reference1_relation,
    brc.reference2_name,
    brc.reference2_contact,
    COALESCE(r2.relationship_name, 'Not Provided') AS reference2_relation,
    du.resume_bio_data,
    du.driving_license,
    du.experience_certificates,
    ai.bank_account_holder_name,
    ai.account_number,
    ai.ifsc_code,
    ai.cancelled_cheque_passbook,
    cu.name AS handle_by,
    CASE WHEN ur.registration_status = 'active' THEN 'active' ELSE 'inactive' END AS status

FROM user_registrations ur
JOIN account_information ai ON ai.registration_id = ur.registration_id
LEFT JOIN personal_information pi ON pi.registration_id = ur.registration_id
LEFT JOIN genders g ON g.gender_id = pi.gender_id
LEFT JOIN nationalities n ON n.nationality_id = pi.nationality_id
LEFT JOIN id_proof_types ipt ON ipt.id_proof_type_id = pi.id_proof_type_id
LEFT JOIN contact_address_details cad ON cad.registration_id = ur.registration_id

-- ✅ Allow join whether cad.city is numeric id or name
LEFT JOIN cities c ON (c.city_id = cad.city OR c.city_name = cad.city)

LEFT JOIN states s ON s.state_id = cad.state_id
LEFT JOIN preferred_locations pl ON pl.location_id = cad.preferred_location_id
LEFT JOIN service_information si ON si.registration_id = ur.registration_id
LEFT JOIN service_types st ON st.service_id = si.service_type_id
LEFT JOIN work_types wt ON wt.work_type_id = si.work_type_id
LEFT JOIN background_reference_check brc ON brc.registration_id = ur.registration_id
LEFT JOIN relationship_types r1 ON r1.relationship_id = brc.reference1_relationship_id
LEFT JOIN relationship_types r2 ON r2.relationship_id = brc.reference2_relationship_id
LEFT JOIN document_uploads du ON du.registration_id = ur.registration_id
LEFT JOIN crm_users cu ON cu.id = ur.crm_id
WHERE ai.mobile_number = ?;
`;

const updateUserProfile = `
  -- update account_information using registration_id
  UPDATE account_information
  SET full_name = ?, email_address = ?
  WHERE registration_id = ?;

  -- update personal_information
  UPDATE personal_information
  SET gender_id = CASE WHEN ? IS NULL OR ? = 0 THEN NULL ELSE ? END,
      date_of_birth = ?
  WHERE registration_id = ?;

  -- update contact_address_details: ensure city is always city_id
  UPDATE contact_address_details
  SET current_address = ?, 
      city = CASE WHEN ? IS NULL OR ? = 0 THEN NULL ELSE CAST(? AS UNSIGNED) END,  -- ✅ force store numeric id
      state_id = CASE WHEN ? IS NULL OR ? = 0 THEN NULL ELSE ? END,
      pincode = ?
  WHERE registration_id = ?;
`;

const getRegistrationIdByMobile = `
  SELECT registration_id FROM account_information WHERE mobile_number = ? LIMIT 1;
`;

const getAllGenders = `
  SELECT gender_id, gender_name FROM genders WHERE status = 'Active' ORDER BY gender_name ASC;
`;
 
 
module.exports = {
updatePersonalInfo,
  updatePersonalFiles,
  getGenderById,
  getNationalityById,
  getIdProofTypeById,
 
  updateContactInfo,
  checkContactExists,
  insertContactInfo,
  getStateById,
  getPreferredLocationById,
 
  updatesServiceInfo,
  getServiceNameById,
  getWorkTypeNameById,
 
  updateBackgroundCheck,
 
  updateDocuments,
 
  updatesAccountInfo,
 
  getAllUsers,
  getUserById, 

 // Registration management
  createDirectRegistration,
  checkRegistrationExists,
  updateRegistrationStep,
  completeRegistration,
  updateRegistrationStatus,
 
 updateUserDetails,
 toggleStatus,
 getStatus,
 
  // Personal Information (Step 1)
  insertPersonalInfo,
  getPersonalInfo,
  
  // Contact & Address (Step 2) WITH GEOCODING
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
  
  // Account Information (Step 6)
  insertAccountInfo,
  getAccountInfo,
  checkEmailExistsSimple,
  checkMobileExistsSimple,
  
  // Status tracking
  insertRegistrationStatusHistory,
  getRegistrationStatusHistory,
  
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
getAllUsers,
  getSingleUsers,
  updateAccountInfo,
  updateStatus,
  getPoliceStatus,
  assignCRMUser,
  updateServiceInfo,
  updatesPoliceVerification,
  getCRMUsers,
  getUserByMobileNumber,
  updateUserProfile,
  getRegistrationIdByMobile,
  getAllGenders
};
