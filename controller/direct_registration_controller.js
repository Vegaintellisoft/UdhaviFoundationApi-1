// controller/direct_registration_controller.js - WITHOUT SESSION TOKEN
const db = require('../database/connection');
const bcrypt = require('bcryptjs');
//const axios = require('axios'); // For geocoding API calls
const queries = require('../queries/direct_registration_queries');
const crypto = require('crypto');

class DirectRegistrationController {
    

static async createRegistration(req, res) {
  try {
    // Generate a unique session token (you can use UUID or random bytes)
    const sessionToken = crypto.randomBytes(16).toString('hex');

    const [result] = await db.execute(queries.createDirectRegistration, [sessionToken]);

    res.json({
      success: true,
      message: 'Registration created successfully',
      data: {
        registrationId: result.insertId,
        currentStep: 1,
        totalSteps: 6,
        registrationStatus: 'draft',
        sessionToken // you can send this back if needed
      }
    });

  } catch (error) {
    console.error('Create registration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create registration' }
    });
  }
}


    // Get complete registration data by ID
    static async getCompleteRegistration(req, res) {
        try {
            const { registrationId } = req.params;
            
            const [results] = await db.execute(queries.getCompleteRegistrationData, [registrationId]);
            
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration not found' }
                });
            }
            
            res.json({
                success: true,
                data: results[0]
            });
            
        } catch (error) {
            console.error('Get complete registration error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch registration data' }
            });
        }
    }

    // Get specific step data by registration ID
    static async getStepData(req, res) {
        console.log('🔍 getStepData called for direct registration');
        console.log('📝 Request params:', req.params);
        
        try {
            const { registrationId, step } = req.params;
            
            console.log('🔍 Looking for registration:', registrationId, 'step:', step);
            
            let results;
            
            switch (step) {
                case '1':
                    console.log('📋 Getting personal info...');
                    [results] = await db.execute(queries.getPersonalInfo, [registrationId]);
                    break;
                case '2':
                    console.log('📋 Getting contact address...');
                    [results] = await db.execute(queries.getContactAddress, [registrationId]);
                    break;
                case '3':
                    console.log('📋 Getting service info...');
                    [results] = await db.execute(queries.getServiceInfo, [registrationId]);
                    break;
                case '4':
                    console.log('📋 Getting background check...');
                    [results] = await db.execute(queries.getBackgroundCheck, [registrationId]);
                    break;
                case '5':
                    console.log('📋 Getting document uploads...');
                    [results] = await db.execute(queries.getDocumentUploads, [registrationId]);
                    break;
                case '6':
                    console.log('📋 Getting account info...');
                    [results] = await db.execute(queries.getAccountInfo, [registrationId]);
                    break;
                default:
                    console.log('❌ Invalid step:', step);
                    return res.status(400).json({
                        success: false,
                        error: { message: 'Invalid step number' }
                    });
            }
            
            console.log('📊 Query results:', results);
            
            res.json({
                success: true,
                data: results[0] || null
            });
            
        } catch (error) {
            console.error('❌ Get step data error:', error);
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({
                success: false,
                error: { 
                    message: 'Failed to fetch step data',
                    details: error.message
                }
            });
        }
    }


// static async savePersonalInfo(req, res) {
//   console.log('🔄 Step 1 - savePersonalInfo called (direct)');
//   console.log('📝 Request params:', req.params);
//   console.log('📝 Request body:', req.body);
//   console.log('📝 Request files:', req.files);

//   try {
//     const { registrationId } = req.params;
//     const {
//       first_name,
//       last_name,
//       date_of_birth,
//       gender_id,
//       nationality_id,
//       languages_known,
//       id_proof_type_id,
//       id_proof_number
//     } = req.body;

//     // Validate registration exists
//     const [registrationCheck] = await db.execute(queries.checkRegistrationExists, [registrationId]);
//     if (registrationCheck.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: { message: 'Registration not found' }
//       });
//     }

//     // Handle file uploads (profile photo and id proof)
//     let profile_photo = null;
//     let id_proof_document = null;

//     if (req.files) {
//       if (req.files.profile_photo) {
//         profile_photo = req.files.profile_photo[0].filename;
//       }
//       if (req.files.id_proof_document) {
//         id_proof_document = req.files.id_proof_document[0].filename;
//       }
//     }

//     // Save or update personal info in DB
//     await db.execute(queries.insertPersonalInfo, [
//       registrationId,
//       first_name,
//       last_name,
//       date_of_birth,
//       gender_id,
//       profile_photo,
//       nationality_id,
//       languages_known,
//       id_proof_type_id,
//       id_proof_number,
//       id_proof_document
//     ]);

//     // Optionally: Log document verification if needed (you can keep this from your existing code)
//     if (profile_photo) {
//       await db.execute(queries.insertDocumentVerificationLog, [
//         registrationId, 'profile_photo', profile_photo
//       ]);
//     }
//     if (id_proof_document) {
//       await db.execute(queries.insertDocumentVerificationLog, [
//         registrationId, 'id_proof', id_proof_document
//       ]);
//     }

//     // Update current step to next (e.g. 2)
//     await db.execute(queries.updateRegistrationStep, [2, registrationId]);

//     res.json({
//       success: true,
//       message: 'Personal information saved successfully',
//       data: {
//         currentStep: 2,
//         documentsStatus: 'pending_verification'
//       }
//     });

//   } catch (error) {
//     console.error('❌ Save personal info error:', error);
//     res.status(500).json({
//       success: false,
//       error: {
//         message: 'Failed to save personal information',
//         details: error.message
//       }
//     });
//   }
// }

static async savePersonalInfo(req, res) {
  console.log('🔄 Step 1 - savePersonalInfo called (direct)');
  console.log('📝 Request params:', req.params);
  console.log('📝 Request body:', req.body);
  console.log('📝 Request files:', req.files);

  try {
    const { registrationId } = req.params;
    const {
      first_name,
      last_name,
      date_of_birth,
      gender_id,
      nationality_id,
      languages_known,
      id_proof_type_id,
      id_proof_number
    } = req.body;

    // Validate registration exists
    const [registrationCheck] = await db.execute(queries.checkRegistrationExists, [registrationId]);
    if (registrationCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Registration not found' }
      });
    }

    // Handle file uploads (profile photo and id proof)
    let profile_photo = null;
    let id_proof_document = null;

    if (req.files) {
      if (req.files.profile_photo) {
        profile_photo = req.files.profile_photo[0].filename;
      }
      if (req.files.id_proof_document) {
        id_proof_document = req.files.id_proof_document[0].filename;
      }
    }

    // Save or update personal info in DB
    await db.execute(queries.insertPersonalInfo, [
      registrationId,
      first_name,
      last_name,
      date_of_birth,
      gender_id,
      profile_photo,
      nationality_id,
      languages_known,
      id_proof_type_id,
      id_proof_number,
      id_proof_document
    ]);

    // Optionally: Log document verification if needed (you can keep this from your existing code)
    if (profile_photo) {
      await db.execute(queries.insertDocumentVerificationLog, [
        registrationId, 'profile_photo', profile_photo
      ]);
    }
    if (id_proof_document) {
      await db.execute(queries.insertDocumentVerificationLog, [
        registrationId, 'id_proof', id_proof_document
      ]);
    }

    // Update current step to next (e.g. 2)
    await db.execute(queries.updateRegistrationStep, [2, registrationId]);

    res.json({
      success: true,
      message: 'Personal information saved successfully',
      data: {
        currentStep: 2,
        documentsStatus: 'pending_verification'
      }
    });

  } catch (error) {
    console.error('❌ Save personal info error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to save personal information',
        details: error.message
      }
    });
  }
}




// static async saveContactAddress(req, res) {
//     console.log('🔄 Step 2 - saveContactAddress called (direct with frontend lat/lng)');
//     console.log('📝 Request params:', req.params);
//     console.log('📝 Request body:', req.body);

//     try {
//         const { registrationId } = req.params;
//         const {
//             city,
//             state_id,
//             pincode,
//             preferred_location_id,
//             current_latitude,
//             current_longitude,
//             permanent_latitude,
//             permanent_longitude
//         } = req.body;

//         // Validate registration exists
//         const [registrationCheck] = await db.execute(queries.checkRegistrationExists, [registrationId]);
//         if (registrationCheck.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 error: { message: 'Registration not found' }
//             });
//         }

//         console.log('💾 Saving contact address with frontend lat/lng...');
//         await db.execute(queries.insertContactAddress, [
//             registrationId,
//             city,
//             state_id,
//             pincode,
//             preferred_location_id,
//             current_latitude,
//             current_longitude,
//             permanent_latitude,
//             permanent_longitude
//         ]);

//         await db.execute(queries.updateRegistrationStep, [3, registrationId]);

//         res.json({
//             success: true,
//             message: 'Contact information saved successfully',
//             data: { currentStep: 3 }
//         });

//     } catch (error) {
//         console.error('❌ Save contact address error:', error);
//         res.status(500).json({
//             success: false,
//             error: { message: 'Failed to save contact information', details: error.message }
//         });
//     }
// }

static async saveContactAddress(req, res) {
    console.log('🔄 Step 2 - saveContactAddress called (direct with frontend lat/lng)');
    console.log('📝 Request params:', req.params);
    console.log('📝 Request body:', req.body);

    try {
        const { registrationId } = req.params;
        const {
            city,
            state_id,
            pincode,
            preferred_location_id,
            current_latitude,
            current_longitude,
            permanent_latitude,
            permanent_longitude
        } = req.body;

        // Validate registration exists
        const [registrationCheck] = await db.execute(queries.checkRegistrationExists, [registrationId]);
        if (registrationCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: { message: 'Registration not found' }
            });
        }

        console.log('💾 Saving contact address with frontend lat/lng...');
        await db.execute(queries.insertContactAddress, [
            registrationId,
            city,
            state_id,
            pincode,
            preferred_location_id,
            current_latitude,
            current_longitude,
            permanent_latitude,
            permanent_longitude
        ]);

        await db.execute(queries.updateRegistrationStep, [3, registrationId]);

        res.json({
            success: true,
            message: 'Contact information saved successfully',
            data: { currentStep: 3 }
        });

    } catch (error) {
        console.error('❌ Save contact address error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to save contact information', details: error.message }
        });
    }
}

static async saveServiceInfo(req, res) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { registrationId } = req.params;
    let {
      service_type_id,
      work_type_id,
      years_of_experience,
      available_day_ids,
      time_slot_ids,
      expected_salary,
      service_description
    } = req.body;

    // ✅ Convert strings to arrays if needed
    if (typeof available_day_ids === 'string') {
      available_day_ids = available_day_ids.split(',').map(id => Number(id));
    }
    if (typeof time_slot_ids === 'string') {
      time_slot_ids = time_slot_ids.split(',').map(id => Number(id));
    }

    // ✅ Parse salary to float, store NULL if invalid/empty
    if (expected_salary !== undefined && expected_salary !== null && expected_salary !== '') {
      expected_salary = parseFloat(expected_salary);
      if (isNaN(expected_salary)) expected_salary = null;
    } else {
      expected_salary = null;
    }

    // Check registration exists
    const [registrationCheck] = await connection.execute(
      queries.checkRegistrationExists,
      [registrationId]
    );
    if (!registrationCheck.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: { message: 'Registration not found' } });
    }

    // Handle service image upload
    let service_image = req.file ? req.file.filename : null;

    // ✅ Insert / Update service info
    await connection.execute(
      `INSERT INTO service_information 
        (registration_id, service_type_id, work_type_id, years_of_experience, available_day_ids, time_slot_ids, service_description, service_image, expected_salary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         service_type_id = VALUES(service_type_id),
         work_type_id = VALUES(work_type_id),
         years_of_experience = VALUES(years_of_experience),
         available_day_ids = VALUES(available_day_ids),
         time_slot_ids = VALUES(time_slot_ids),
         service_description = VALUES(service_description),
         service_image = COALESCE(VALUES(service_image), service_image),
         expected_salary = VALUES(expected_salary),
         updated_at = CURRENT_TIMESTAMP`,
      [
        registrationId,
        service_type_id || null,
        work_type_id || null,
        years_of_experience || null,
        available_day_ids ? JSON.stringify(available_day_ids) : null,
        time_slot_ids ? JSON.stringify(time_slot_ids) : null,
        service_description || null,
        service_image,
        expected_salary
      ]
    );

    await connection.execute(queries.updateRegistrationStep, [4, registrationId]);
    await connection.commit();

    res.json({
      success: true,
      message: 'Service information saved successfully',
      data: {
        expected_salary,  // ✅ now will show saved salary
        service_type_id,
        work_type_id,
        years_of_experience,
        available_days: available_day_ids,
        time_slots: time_slot_ids,
        service_description,
        service_image
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Save service info error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
}


//     static async saveServiceInfo(req, res) {
//   const connection = await db.getConnection();
//   try {
//     await connection.beginTransaction();
 
//     const { registrationId } = req.params;
//     let {
//       service_type_id,
//       work_type_id,
//       years_of_experience,
//       available_day_ids,
//       time_slot_ids,
//       expected_salary,
//       service_description
//     } = req.body;
 
//     // ✅ Convert strings to arrays if needed
//     if (typeof available_day_ids === 'string') {
//       available_day_ids = available_day_ids.split(',').map(id => Number(id));
//     }
//     if (typeof time_slot_ids === 'string') {
//       time_slot_ids = time_slot_ids.split(',').map(id => Number(id));
//     }
 
//     // ✅ Parse salary to float, store NULL if invalid/empty
//     if (expected_salary !== undefined && expected_salary !== null && expected_salary !== '') {
//       expected_salary = parseFloat(expected_salary);
//       if (isNaN(expected_salary)) expected_salary = null;
//     } else {
//       expected_salary = null;
//     }
 
//     // Check registration exists
//     const [registrationCheck] = await connection.execute(
//       queries.checkRegistrationExists,
//       [registrationId]
//     );
//     if (!registrationCheck.length) {
//       await connection.rollback();
//       return res.status(404).json({ success: false, error: { message: 'Registration not found' } });
//     }
 
//     // Handle service image upload
//     let service_image = req.file ? req.file.filename : null;
 
//     // ✅ Insert / Update service info
//     await connection.execute(
//       `INSERT INTO service_information
//         (registration_id, service_type_id, work_type_id, years_of_experience, available_day_ids, time_slot_ids, service_description, service_image, expected_salary)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//        ON DUPLICATE KEY UPDATE
//          service_type_id = VALUES(service_type_id),
//          work_type_id = VALUES(work_type_id),
//          years_of_experience = VALUES(years_of_experience),
//          available_day_ids = VALUES(available_day_ids),
//          time_slot_ids = VALUES(time_slot_ids),
//          service_description = VALUES(service_description),
//          service_image = COALESCE(VALUES(service_image), service_image),
//          expected_salary = VALUES(expected_salary),
//          updated_at = CURRENT_TIMESTAMP`,
//       [
//         registrationId,
//         service_type_id || null,
//         work_type_id || null,
//         years_of_experience || null,
//         available_day_ids ? JSON.stringify(available_day_ids) : null,
//         time_slot_ids ? JSON.stringify(time_slot_ids) : null,
//         service_description || null,
//         service_image,
//         expected_salary
//       ]
//     );
 
//     await connection.execute(queries.updateRegistrationStep, [4, registrationId]);
//     await connection.commit();
 
//     res.json({
//       success: true,
//       message: 'Service information saved successfully',
//       data: {
//         expected_salary,  // ✅ now will show saved salary
//         service_type_id,
//         work_type_id,
//         years_of_experience,
//         available_days: available_day_ids,
//         time_slots: time_slot_ids,
//         service_description,
//         service_image
//       }
//     });
 
//   } catch (err) {
//     await connection.rollback();
//     console.error('Save service info error:', err);
//     res.status(500).json({ success: false, error: err.message });
//   } finally {
//     connection.release();
//   }
// }


    // Save background check (Step 4) - WITH POLICE VERIFICATION STATUS
    // static async saveBackgroundCheck(req, res) {
    //     console.log('🔄 Step 4 - saveBackgroundCheck called (direct)');
    //     console.log('📝 Request params:', req.params);
    //     console.log('📝 Request body:', req.body);
        
    //     try {
    //         const { registrationId } = req.params;
    //         const {
    //             police_verification_done,
    //             has_police_verification,
    //             criminal_record_details,
    //             reference1_name,
    //             reference1_contact,
    //             reference1_relationship_id,
    //             reference2_name,
    //             reference2_contact,
    //             reference2_relationship_id
    //         } = req.body;

    //         // Validate registration exists
    //         const [registrationCheck] = await db.execute(queries.checkRegistrationExists, [registrationId]);
    //         if (registrationCheck.length === 0) {
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration not found' }
    //             });
    //         }

    //         // Handle file upload
    //         let police_verification_document = null;
    //         if (req.file) {
    //             police_verification_document = req.file.filename;
                
    //             // Log document for verification with PENDING status
    //             await db.execute(queries.insertDocumentVerificationLog, [
    //                 registrationId, 'police_verification', police_verification_document
    //             ]);
    //         }

    //         // Convert boolean values properly
    //         const policeVerificationDone = police_verification_done === 'true' || police_verification_done === true || police_verification_done === 1;
    //         const hasPoliceVerification = has_police_verification === 'true' || has_police_verification === true || has_police_verification === 1;

    //         await db.execute(queries.insertBackgroundCheck, [
    //             registrationId,
    //             policeVerificationDone ? 1 : 0,
    //             police_verification_document,
    //             hasPoliceVerification ? 1 : 0,
    //             criminal_record_details || null,
    //             reference1_name || null,
    //             reference1_contact || null,
    //             reference1_relationship_id || null,
    //             reference2_name || null,
    //             reference2_contact || null,
    //             reference2_relationship_id || null
    //         ]);

    //         // Update current step
    //         await db.execute(queries.updateRegistrationStep, [5, registrationId]);

    //         res.json({
    //             success: true,
    //             message: 'Background check information saved successfully',
    //             data: { 
    //                 currentStep: 5,
    //                 policeVerificationStatus: 'pending',
    //                 documentsStatus: police_verification_document ? 'pending_verification' : 'no_documents'
    //             }
    //         });

    //     } catch (error) {
    //         console.error('❌ Save background check error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { 
    //                 message: 'Failed to save background check information',
    //                 details: error.message
    //             }
    //         });
    //     }
    // }


        static async saveBackgroundCheck(req, res) {
  console.log('🔄 Step 4 - saveBackgroundCheck called');
  console.log('Params:', req.params);
  console.log('Body:', req.body);

  try {
    const { registrationId } = req.params;
    const {
      police_verification_done,
      has_police_verification,
      criminal_record_details,
      reference1_name,
      reference1_contact,
      reference1_relationship_id,
      reference2_name,
      reference2_contact,
      reference2_relationship_id
    } = req.body;

    // ✅ Check registration exists
    const [registrationCheck] = await db.execute(
      queries.checkRegistrationExists,
      [registrationId]
    );
    if (!registrationCheck.length) {
      return res.status(404).json({
        success: false,
        error: { message: 'Registration not found' }
      });
    }

    // ✅ Handle file upload (optional)
    let police_verification_document = null;
    if (req.file) {
      police_verification_document = req.file.filename;

      await db.execute(queries.insertDocumentVerificationLog, [
        registrationId,
        'police_verification',
        police_verification_document
      ]);
    }

    // ✅ Convert boolean fields to 1/0
    const policeVerificationDone =
      police_verification_done === 'true' || police_verification_done === true || police_verification_done === '1'
        ? 1
        : 0;

    const hasPoliceVerification =
      has_police_verification === 'true' || has_police_verification === true || has_police_verification === '1'
        ? 1
        : 0;

    // ✅ Insert or update background check
    await db.execute(queries.insertBackgroundCheck, [
      registrationId,
      policeVerificationDone,
      police_verification_document,
      hasPoliceVerification,
      criminal_record_details || null,
      reference1_name || null,
      reference1_contact || null,
      reference1_relationship_id || null,
      reference2_name || null,
      reference2_contact || null,
      reference2_relationship_id || null
    ]);

    // ✅ Update registration step
    await db.execute(queries.updateRegistrationStep, [5, registrationId]);

    res.json({
      success: true,
      message: 'Background check information saved successfully',
      data: {
        currentStep: 5,
        policeVerificationStatus: 'pending',
        documentsStatus: police_verification_document ? 'pending_verification' : 'no_documents'
      }
    });
  } catch (error) {
    console.error('❌ Save background check error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to save background check information',
        details: error.message
      }
    });
  }
}
// 
    // Save document uploads (Step 5)
    // static async saveDocumentUploads(req, res) {
    //     console.log('🔄 Step 5 - saveDocumentUploads called (direct)');
    //     console.log('📝 Request params:', req.params);
    //     console.log('📝 Request files:', req.files);
        
    //     const connection = await db.getConnection();
        
    //     try {
    //         await connection.beginTransaction();
            
    //         const { registrationId } = req.params;

    //         // Validate registration exists
    //         const [registrationCheck] = await connection.execute(queries.checkRegistrationExists, [registrationId]);
    //         if (registrationCheck.length === 0) {
    //             await connection.rollback();
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration not found' }
    //             });
    //         }

    //         let resume_bio_data = null;
    //         let driving_license = null;
    //         let experience_certificates = null;
    //         const documentsUploaded = [];

    //         if (req.files) {
    //             if (req.files.resume_bio_data && req.files.resume_bio_data[0]) {
    //                 resume_bio_data = req.files.resume_bio_data[0].filename;
    //                 documentsUploaded.push('resume');
                    
    //                 await connection.execute(queries.insertDocumentVerificationLog, [
    //                     registrationId, 'resume', resume_bio_data
    //                 ]);
    //             }
                
    //             if (req.files.driving_license && req.files.driving_license[0]) {
    //                 driving_license = req.files.driving_license[0].filename;
    //                 documentsUploaded.push('driving_license');
                    
    //                 await connection.execute(queries.insertDocumentVerificationLog, [
    //                     registrationId, 'driving_license', driving_license
    //                 ]);
    //             }
                
    //             if (req.files.experience_certificates && req.files.experience_certificates[0]) {
    //                 experience_certificates = req.files.experience_certificates[0].filename;
    //                 documentsUploaded.push('experience_certificates');
                    
    //                 await connection.execute(queries.insertDocumentVerificationLog, [
    //                     registrationId, 'experience_certificates', experience_certificates
    //                 ]);
    //             }
    //         }

    //         await connection.execute(queries.insertDocumentUploads, [
    //             registrationId, 
    //             resume_bio_data,
    //             driving_license, 
    //             experience_certificates
    //         ]);

    //         await connection.execute(queries.updateRegistrationStep, [6, registrationId]);
            
    //         await connection.commit();

    //         res.json({
    //             success: true,
    //             message: 'Documents uploaded successfully',
    //             data: { 
    //                 currentStep: 6,
    //                 documentsUploaded: documentsUploaded,
    //                 documentsStatus: 'pending_verification',
    //                 totalDocuments: documentsUploaded.length
    //             }
    //         });

    //     } catch (error) {
    //         if (connection) {
    //             await connection.rollback();
    //         }
    //         console.error('❌ Save document uploads error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { 
    //                 message: 'Failed to upload documents',
    //                 details: error.message
    //             }
    //         });
    //     } finally {
    //         if (connection) {
    //             connection.release();
    //         }
    //     }
    // }

    static async saveDocumentUploads(req, res) {
        console.log('🔄 Step 5 - saveDocumentUploads called (direct)');
        console.log('📝 Request params:', req.params);
        console.log('📝 Request files:', req.files);
        
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { registrationId } = req.params;

            // Validate registration exists
            const [registrationCheck] = await connection.execute(queries.checkRegistrationExists, [registrationId]);
            if (registrationCheck.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration not found' }
                });
            }

            let resume_bio_data = null;
            let driving_license = null;
            let experience_certificates = null;
            const documentsUploaded = [];

            if (req.files) {
                if (req.files.resume_bio_data && req.files.resume_bio_data[0]) {
                    resume_bio_data = req.files.resume_bio_data[0].filename;
                    documentsUploaded.push('resume');
                    
                    await connection.execute(queries.insertDocumentVerificationLog, [
                        registrationId, 'resume', resume_bio_data
                    ]);
                }
                
                if (req.files.driving_license && req.files.driving_license[0]) {
                    driving_license = req.files.driving_license[0].filename;
                    documentsUploaded.push('driving_license');
                    
                    await connection.execute(queries.insertDocumentVerificationLog, [
                        registrationId, 'driving_license', driving_license
                    ]);
                }
                
                if (req.files.experience_certificates && req.files.experience_certificates[0]) {
                    experience_certificates = req.files.experience_certificates[0].filename;
                    documentsUploaded.push('experience_certificates');
                    
                    await connection.execute(queries.insertDocumentVerificationLog, [
                        registrationId, 'experience_certificates', experience_certificates
                    ]);
                }
            }

            await connection.execute(queries.insertDocumentUploads, [
                registrationId, 
                resume_bio_data,
                driving_license, 
                experience_certificates
            ]);

            await connection.execute(queries.updateRegistrationStep, [6, registrationId]);
            
            await connection.commit();

            res.json({
                success: true,
                message: 'Documents uploaded successfully',
                data: { 
                    currentStep: 6,
                    documentsUploaded: documentsUploaded,
                    documentsStatus: 'pending_verification',
                    totalDocuments: documentsUploaded.length
                }
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('❌ Save document uploads error:', error);
            res.status(500).json({
                success: false,
                error: { 
                    message: 'Failed to upload documents',
                    details: error.message
                }
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Save account information (Step 6) - Complete registration with SUBMITTED status
    // static async saveAccountInfo(req, res) {
    //     const connection = await db.getConnection();
        
    //     try {
    //         await connection.beginTransaction();
            
    //         const { registrationId } = req.params;
    //         const {
    //             full_name,
    //             email_address,
    //             mobile_number,
    //             password,
    //             bank_account_holder_name,
    //             account_number,
    //             ifsc_code,
    //             terms_accepted,
    //             information_confirmed
    //         } = req.body;

    //         // Validate required fields
    //         const missingFields = [];
    //         if (!full_name) missingFields.push('full_name');
    //         if (!email_address) missingFields.push('email_address');
    //         if (!mobile_number) missingFields.push('mobile_number');
    //         if (!password) missingFields.push('password');
    //         if (!terms_accepted) missingFields.push('terms_accepted');
    //         if (!information_confirmed) missingFields.push('information_confirmed');

    //         if (missingFields.length > 0) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { 
    //                     message: `Missing required fields: ${missingFields.join(', ')}`,
    //                     missingFields 
    //                 }
    //             });
    //         }

    //         // Validate registration exists and get current status
    //         const [registrationCheck] = await connection.execute(queries.checkRegistrationExists, [registrationId]);
    //         if (registrationCheck.length === 0) {
    //             await connection.rollback();
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration not found' }
    //             });
    //         }

    //         const oldStatus = registrationCheck[0].registration_status;

    //         // Check for duplicates
    //         const [emailResults] = await connection.execute(queries.checkEmailExistsSimple, [email_address]);
    //         const [mobileResults] = await connection.execute(queries.checkMobileExistsSimple, [mobile_number]);

    //         if (emailResults.length > 0) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { message: 'Email address already exists' }
    //             });
    //         }

    //         if (mobileResults.length > 0) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { message: 'Mobile number already exists' }
    //             });
    //         }

    //         // Hash password
    //         const hashedPassword = await bcrypt.hash(password, 12);

    //         // Handle file upload
    //         let cancelled_cheque_passbook = null;
    //         if (req.file) {
    //             cancelled_cheque_passbook = req.file.filename;
    //             await connection.execute(queries.insertDocumentVerificationLog, [
    //                 registrationId, 'bank_document', cancelled_cheque_passbook
    //             ]);
    //         }

    //         // Insert account information
    //         const [insertResult] = await connection.execute(queries.insertAccountInfo, [
    //             registrationId,
    //             full_name,
    //             email_address,
    //             mobile_number,
    //             hashedPassword,
    //             bank_account_holder_name || null,
    //             account_number || null,
    //             ifsc_code || null,
    //             cancelled_cheque_passbook,
    //             terms_accepted === true || terms_accepted === 'true',
    //             information_confirmed === true || information_confirmed === 'true'
    //         ]);

    //         // Complete registration
    //         await connection.execute(queries.completeRegistration, [registrationId]);

    //         // Log status change in history
    //         await connection.execute(queries.insertRegistrationStatusHistory, [
    //             registrationId, oldStatus, 'submitted', null, 'Registration completed by user'
    //         ]);

    //         await connection.commit();

    //         res.json({
    //             success: true,
    //             message: 'Registration completed successfully! Your application is under review.',
    //             data: {
    //                 registrationCompleted: true,
    //                 userId: registrationId,
    //                 status: 'submitted',
    //                 accountId: insertResult.insertId,
    //                 nextSteps: [
    //                     'Document verification in progress',
    //                     'Police verification review pending',
    //                     'Salary expectation under review',
    //                     'You will be notified of approval status via email/SMS'
    //                 ]
    //             }
    //         });

    //     } catch (error) {
    //         if (connection) {
    //             await connection.rollback();
    //         }
    //         console.error('❌ Save account info error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { 
    //                 message: 'Failed to complete registration',
    //                 details: error.message
    //             }
    //         });
    //     } finally {
    //         if (connection) {
    //             connection.release();
    //         }
    //     }
    // }

        static async saveAccountInfo(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { registrationId } = req.params;
            const {
                full_name,
                email_address,
                mobile_number,
                password,
                bank_account_holder_name,
                account_number,
                ifsc_code,
                terms_accepted,
                information_confirmed
            } = req.body;

            // Validate required fields
            const missingFields = [];
            if (!full_name) missingFields.push('full_name');
            if (!email_address) missingFields.push('email_address');
            if (!mobile_number) missingFields.push('mobile_number');
            if (!password) missingFields.push('password');
            if (!terms_accepted) missingFields.push('terms_accepted');
            if (!information_confirmed) missingFields.push('information_confirmed');

            if (missingFields.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: { 
                        message: `Missing required fields: ${missingFields.join(', ')}`,
                        missingFields 
                    }
                });
            }

            // Validate registration exists and get current status
            const [registrationCheck] = await connection.execute(queries.checkRegistrationExists, [registrationId]);
            if (registrationCheck.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration not found' }
                });
            }

            const oldStatus = registrationCheck[0].registration_status;

            // Check for duplicates
            const [emailResults] = await connection.execute(queries.checkEmailExistsSimple, [email_address]);
            const [mobileResults] = await connection.execute(queries.checkMobileExistsSimple, [mobile_number]);

            if (emailResults.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'Email address already exists' }
                });
            }

            if (mobileResults.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'Mobile number already exists' }
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Handle file upload
            let cancelled_cheque_passbook = null;
            if (req.file) {
                cancelled_cheque_passbook = req.file.filename;
                await connection.execute(queries.insertDocumentVerificationLog, [
                    registrationId, 'bank_document', cancelled_cheque_passbook
                ]);
            }

            // Insert account information
            const [insertResult] = await connection.execute(queries.insertAccountInfo, [
                registrationId,
                full_name,
                email_address,
                mobile_number,
                hashedPassword,
                bank_account_holder_name || null,
                account_number || null,
                ifsc_code || null,
                cancelled_cheque_passbook,
                terms_accepted === true || terms_accepted === 'true',
                information_confirmed === true || information_confirmed === 'true'
            ]);

            // Complete registration
            await connection.execute(queries.completeRegistration, [registrationId]);

            // Log status change in history
            await connection.execute(queries.insertRegistrationStatusHistory, [
                registrationId, oldStatus, 'submitted', null, 'Registration completed by user'
            ]);

            await connection.commit();

            res.json({
                success: true,
                message: 'Registration completed successfully! Your application is under review.',
                data: {
                    registrationCompleted: true,
                    userId: registrationId,
                    status: 'submitted',
                    accountId: insertResult.insertId,
                    nextSteps: [
                        'Document verification in progress',
                        'Police verification review pending',
                        'Salary expectation under review',
                        'You will be notified of approval status via email/SMS'
                    ]
                }
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('❌ Save account info error:', error);
            res.status(500).json({
                success: false,
                error: { 
                    message: 'Failed to complete registration',
                    details: error.message
                }
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Get registration status with detailed status information
    static async getRegistrationStatus(req, res) {
        try {
            const { registrationId } = req.params;
            
            const [results] = await db.execute(queries.getRegistrationProgress, [registrationId]);
            
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration not found' }
                });
            }
            
            const progress = results[0];
            
            // Calculate completion percentage
            const stepsCompleted = [
                progress.step1_completed,
                progress.step2_completed, 
                progress.step3_completed,
                progress.step4_completed,
                progress.step5_completed,
                progress.step6_completed
            ].filter(step => step === 1).length;
            
            const completionPercentage = Math.round((stepsCompleted / 6) * 100);
            
            res.json({
                success: true,
                data: {
                    registrationId: progress.registration_id,
                    currentStep: progress.current_step,
                    totalSteps: 6,
                    isCompleted: progress.is_completed,
                    registrationStatus: progress.registration_status,
                    completionPercentage: completionPercentage,
                    stepStatus: {
                        step1: progress.step1_completed ? 'completed' : 'pending',
                        step2: progress.step2_completed ? 'completed' : 'pending',
                        step3: progress.step3_completed ? 'completed' : 'pending',
                        step4: progress.step4_completed ? 'completed' : 'pending',
                        step5: progress.step5_completed ? 'completed' : 'pending',
                        step6: progress.step6_completed ? 'completed' : 'pending'
                    },
                    verificationStatus: {
                        policeVerification: progress.police_verification_status || 'not_submitted',
                        salaryApproval: progress.salary_status === 0 ? 'pending' : progress.salary_status === 1 ? 'approved' : 'rejected'
                    }
                }
            });
        } catch (error) {
            console.error('Get registration status error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to get registration status' }
            });
        }
    }

    // ====== ADMIN FUNCTIONS FOR STATUS MANAGEMENT ======

    // Update police verification status (admin function)
    static async updatePoliceVerificationStatus(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { registrationId } = req.params;
            const { status, remarks, adminId } = req.body;

            if (!['pending', 'approved', 'rejected'].includes(status)) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'Invalid status. Must be: pending, approved, or rejected' }
                });
            }

            await connection.execute(queries.updatePoliceVerificationStatus, [
                status, remarks, adminId, registrationId
            ]);

            // Log status change
            await connection.execute(queries.insertRegistrationStatusHistory, [
                registrationId, 'police_verification_update', status, adminId, remarks
            ]);

            await connection.commit();

            res.json({
                success: true,
                message: `Police verification status updated to ${status}`,
                data: { status, remarks }
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Update police verification status error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to update police verification status' }
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Update salary status (admin function)
    static async updateSalaryStatus(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { registrationId } = req.params;
            const { status, remarks, approvedSalary, adminId } = req.body;

            if (![0, 1, 2].includes(parseInt(status))) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'Invalid status. Must be: 0 (pending), 1 (approved), or 2 (rejected)' }
                });
            }

            await connection.execute(queries.updateSalaryStatus, [
                parseInt(status), remarks, approvedSalary, adminId, registrationId
            ]);

            // Log status change
            const statusText = status == 0 ? 'pending' : status == 1 ? 'approved' : 'rejected';
            await connection.execute(queries.insertRegistrationStatusHistory, [
                registrationId, 'salary_status_update', statusText, adminId, remarks
            ]);

            await connection.commit();

            res.json({
                success: true,
                message: `Salary status updated to ${statusText}`,
                data: { 
                    status: parseInt(status), 
                    statusText,
                    remarks, 
                    approvedSalary 
                }
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Update salary status error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to update salary status' }
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Update overall registration status (admin function)
    static async updateRegistrationStatus(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { registrationId } = req.params;
            const { status, remarks, adminId } = req.body;

            const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'pending_documents'];
            if (!validStatuses.includes(status)) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
                });
            }

            // Get current status for history
            const [currentStatus] = await connection.execute(queries.checkRegistrationExists, [registrationId]);
            const oldStatus = currentStatus[0]?.registration_status;

            await connection.execute(queries.updateRegistrationStatus, [
                status, remarks, adminId, registrationId
            ]);

            // Log status change
            await connection.execute(queries.insertRegistrationStatusHistory, [
                registrationId, oldStatus, status, adminId, remarks
            ]);

            await connection.commit();

            res.json({
                success: true,
                message: `Registration status updated to ${status}`,
                data: { 
                    oldStatus,
                    newStatus: status, 
                    remarks,
                    updatedBy: adminId,
                    updatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Update registration status error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to update registration status' }
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Get registration status history (admin function)
    static async getRegistrationStatusHistory(req, res) {
        try {
            const { registrationId } = req.params;
            
            const [results] = await db.execute(queries.getRegistrationStatusHistory, [registrationId]);
            
            res.json({
                success: true,
                data: {
                    registrationId,
                    totalChanges: results.length,
                    statusHistory: results
                }
            });
        } catch (error) {
            console.error('Get registration status history error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch registration status history' }
            });
        }
    }

//GET Users //
   static async getUsers(req, res) {
    try {
      const [rows] = await db.query(queries.getAllUsers);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("SQL ERROR (getUsers):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // GET SINGLE USER
  static async getUser(req, res) {
    try {
      const { registration_id } = req.params;
      if (!registration_id) return res.status(400).json({ success: false, error: "registration_id is required" });
 
      const [rows] = await db.query(queries.getSingleUser, [registration_id]);
      res.json({ success: true, data: rows[0] || null });
    } catch (err) {
      console.error("SQL ERROR (getUser):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // EDIT USER
  static async editUser(req, res) {
    try {
      const { registration_id } = req.params;
      const { first_name, last_name, mobile_number, service_type_id, police_verification_status, handle_by } = req.body;
 
      if (!registration_id) return res.status(400).json({ success: false, error: "registration_id is required" });
      if (!first_name || !last_name || !mobile_number) return res.status(400).json({ success: false, error: "first_name, last_name, and mobile_number are required" });
 
      const full_name = `${first_name} ${last_name}`;
 
      await db.query(queries.updatesAccountInfo, [full_name, mobile_number, registration_id]);
 
      if (service_type_id !== undefined) await db.query(queries.updateServiceInfo, [service_type_id, registration_id]);
 
      if (police_verification_status) {
        const allowedStatuses = ["approved", "pending", "rejected"];
        if (!allowedStatuses.includes(police_verification_status)) return res.status(400).json({ success: false, error: `police_verification_status must be one of: ${allowedStatuses.join(", ")}` });
        await db.query(queries.updatesPoliceVerificationQuery, [police_verification_status, registration_id]);
      }
 
      if (handle_by !== undefined) await db.query(queries.assignCRMUser, [handle_by, registration_id]);
 
      res.json({ success: true, message: "User updated successfully" });
    } catch (err) {
      console.error("SQL ERROR (editUser):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // TOGGLE STATUS
  static async toggleStatus(req, res) {
    try {
      const { registration_id } = req.params;
      if (!registration_id) return res.status(400).json({ success: false, error: "registration_id is required" });
 
      await db.query(queries.toggleUserStatus, [registration_id]);
      res.json({ success: true, message: "Status toggled successfully" });
    } catch (err) {
      console.error("SQL ERROR (toggleStatus):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // GET POLICE STATUS
  static async policeStatusController(req, res) {
    try {
      const { registration_id } = req.params;
      if (!registration_id) return res.status(400).json({ success: false, error: "registration_id is required" });
 
      const [rows] = await db.query(queries.getPoliceStatus, [registration_id]);
      res.json({ success: true, data: rows[0] || null });
    } catch (err) {
      console.error("SQL ERROR (policeStatusController):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // UPDATE POLICE VERIFICATION
  static async updatesPoliceVerification(req, res) {
    try {
      const { registration_id } = req.params;
      const { police_verification_status } = req.body;
      if (!police_verification_status) return res.status(400).json({ success: false, error: "police_verification_status is required" });
 
      const [result] = await db.query(queries.updatesPoliceVerification, [police_verification_status, registration_id]);
      if (!result || result.affectedRows === 0) return res.status(404).json({ success: false, error: "User not found" });
 
      res.json({ success: true, message: "Police verification updated successfully", registration_id, police_verification_status });
    } catch (err) {
      console.error("SQL ERROR (updatesPoliceVerification):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // GET CRM USERS
  static async getCRMUsersController(req, res) {
    try {
      const [rows] = await db.query(queries.getCRMUsers);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("SQL ERROR (getCRMUsersController):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // ASSIGN CRM USER
  static async updateCRMUser(req, res) {
    try {
      const { registration_id } = req.params;
      const { crm_user_id } = req.body;
      if (!crm_user_id) return res.status(400).json({ success: false, message: "crm_user_id is required" });
 
      const [result] = await db.query(queries.assignCRMUser, [crm_user_id, registration_id]);
      if (!result || result.affectedRows === 0) return res.status(404).json({ success: false, message: "User not found" });
 
      res.json({ success: true, message: "CRM user assigned successfully" });
    } catch (err) {
      console.error("SQL ERROR (updateCRMUser):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async editUser(req, res) {
    try {
      const { registration_id } = req.params;
      const { first_name, last_name, mobile_number, service_type_id, police_verification_status, handle_by } = req.body;
 
      if (!registration_id) return res.status(400).json({ success: false, error: "registration_id is required" });
      if (!first_name || !last_name || !mobile_number) return res.status(400).json({ success: false, error: "first_name, last_name, and mobile_number are required" });
 
      const full_name = `${first_name} ${last_name}`;
 
      await db.query(queries.updatesAccountInfo, [full_name, mobile_number, registration_id]);
 
      if (service_type_id !== undefined) await db.query(queries.updateServiceInfo, [service_type_id, registration_id]);
 
      if (police_verification_status) {
        const allowedStatuses = ["approved", "pending", "rejected"];
        if (!allowedStatuses.includes(police_verification_status)) return res.status(400).json({ success: false, error: `police_verification_status must be one of: ${allowedStatuses.join(", ")}` });
        await db.query(queries.updatesPoliceVerification, [police_verification_status, registration_id]);
      }
 
      if (handle_by !== undefined) await db.query(queries.assignCRMUser, [handle_by, registration_id]);
 
      res.json({ success: true, message: "User updated successfully" });
    } catch (err) {
      console.error("SQL ERROR (editUser):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
static async toggleStatus(req, res) {
    try {
      const { registration_id } = req.params;
      console.log("🔍 Received registration_id:", registration_id);
 
      // Run the toggle query
      const [result] = await db.query(queries.toggleStatus, [registration_id]);
      console.log("📝 Toggle query result:", result);
 
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
 
      // Get the new status after update
      const [rows] = await db.query(queries.getStatus, [registration_id]);
      console.log("📊 Status after update:", rows);
 
      return res.json({
        success: true,
        message: "Status updated successfully",
        newStatus: rows[0].status
      });
    } catch (error) {
      console.error("❌ Toggle Status Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

// ---------- STEP 1 ----------
  static async updatePersonal(req, res) {
    try {
      const { id } = req.params;
      const {
        date_of_birth,
        gender_id,
        nationality_id,
        languages_known,
        id_proof_type_id,
        id_proof_number,
      } = req.body;
 
      await db.query(queries.updatePersonalInfo, [
        date_of_birth,
        gender_id,
        nationality_id,
        languages_known,
        id_proof_type_id,
        id_proof_number,
        id,
      ]);
 
      const profilePhoto = req.files?.profile_photo
        ? req.files.profile_photo[0].filename
        : null;
      const idProof = req.files?.id_proof_document
        ? req.files.id_proof_document[0].filename
        : null;
 
      if (profilePhoto || idProof) {
        await db.query(queries.updatePersonalFiles, [profilePhoto, idProof, id]);
      }
 
      // lookup values
      const [[g]] = gender_id
        ? await db.query(queries.getGenderById, [gender_id])
        : [[]];
      const [[n]] = nationality_id
        ? await db.query(queries.getNationalityById, [nationality_id])
        : [[]];
      const [[p]] = id_proof_type_id
        ? await db.query(queries.getIdProofTypeById, [id_proof_type_id])
        : [[]];
 
      res.json({
        success: true,
        message: "Step 1 updated",
        gender: g?.gender_name || null,
        nationality: n?.nationality_name || null,
        id_proof_type: p?.proof_type_name || null,
      });
    } catch (err) {
      console.error("SQL ERROR (updatePersonal):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // ---------- STEP 2 ----------
static async updateContact(req, res) {
    try {
      const registration_id = req.params.id || req.body.registration_id;
 
      if (!registration_id) {
        return res.status(400).json({ success: false, error: "registration_id is required" });
      }
 
      const {
        current_address,
        permanent_address,
        city,
        state_id,
        pincode,
        preferred_location_id,
        current_latitude,
        current_longitude,
        permanent_latitude,
        permanent_longitude
      } = req.body;
 
      // 1️⃣ Check if contact exists
      const [rows] = await db.query(queries.checkContactExists, [registration_id]);
 
      if (rows.length > 0) {
        // 2️⃣ Update existing contact
        await db.query(queries.updateContactInfo, [
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
          registration_id
        ]);
      } else {
        // 3️⃣ Insert new contact
        await db.query(queries.insertContactInfo, [
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
          permanent_longitude
        ]);
      }
 
      // 4️⃣ Fetch state name
      let state_name = null;
      if (state_id) {
        const [[stateRow]] = await db.query(queries.getStateById, [state_id]);
        state_name = stateRow?.state_name || null;
      }
 
      // 5️⃣ Fetch preferred location name
      let preferred_location = null;
      if (preferred_location_id) {
        const [[locRow]] = await db.query(queries.getPreferredLocationById, [preferred_location_id]);
        preferred_location = locRow?.location_name || null;
      }
 
      res.json({
        success: true,
        message: rows.length > 0 ? "Contact updated successfully" : "Contact inserted successfully",
        state: state_name,
        preferred_location: preferred_location
      });
 
    } catch (err) {
      console.error("SQL ERROR (updateContact):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
 
  // ---------- STEP 3 ----------
 // ---------- STEP 3: Update Service ----------
static async updateService(req, res) {
  try {
    const { id } = req.params;
    const {
      service_type_id,
      work_type_id,
      years_of_experience,
      expected_salary,
      available_day_ids,
      time_slot_ids,
      service_description
    } = req.body;
 
    // 1️⃣ Lookup service type name
    const [serviceRows] = await db.query(queries.getServiceNameById, [service_type_id]);
    if (!serviceRows.length) {
      return res.status(400).json({ success: false, message: "Invalid service_type_id" });
    }
    const serviceName = serviceRows[0].name;
 
    // 2️⃣ Lookup work type name
    const [workRows] = await db.query(queries.getWorkTypeNameById, [work_type_id]);
    if (!workRows.length) {
      return res.status(400).json({ success: false, message: "Invalid work_type_id" });
    }
    const workTypeName = workRows[0].work_type_name;
 
    // 3️⃣ Handle file upload
    const serviceImage = req.file ? req.file.filename : null;
 
    // 4️⃣ Convert form-data values → JSON strings
    let availableDaysJson = null;
    if (available_day_ids) {
      availableDaysJson = JSON.stringify(
        Array.isArray(available_day_ids)
          ? available_day_ids
          : available_day_ids.split(",").map(Number)
      );
    }
 
    let timeSlotsJson = null;
    if (time_slot_ids) {
      timeSlotsJson = JSON.stringify(
        Array.isArray(time_slot_ids)
          ? time_slot_ids
          : time_slot_ids.split(",").map(Number)
      );
    }
 
    // 5️⃣ Keep existing description if not provided
    const desc = service_description && service_description.trim() !== ""
      ? service_description
      : null;
 
    // 6️⃣ Update service_information
    await db.query(queries.updatesServiceInfo, [
      service_type_id,
      work_type_id,
      years_of_experience,
      expected_salary,
      serviceImage,
      availableDaysJson,
      timeSlotsJson,
      desc,
      id
    ]);
 
    // ✅ Response
    return res.json({
      success: true,
      message: "Step 3 - Service Information updated",
      service: serviceName,
      work_type: workTypeName,
      available_days: availableDaysJson ? JSON.parse(availableDaysJson) : null,
      time_slots: timeSlotsJson ? JSON.parse(timeSlotsJson) : null,
      service_description: desc,
      updatedId: id
    });
  } catch (err) {
    console.error("SQL ERROR (updateService):", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
 
 
  // ---------- STEP 4 ----------
  static async updateBackground(req, res) {
    try {
      const { id } = req.params;
      const {
        police_verification_done,
        reference1_name,
        reference1_contact,
        reference1_relation_id,
        reference2_name,
        reference2_contact,
        reference2_relation_id,
      } = req.body;
 
      const policeDoc = req.file ? req.file.filename : null;
 
      await db.query(queries.updateBackgroundCheck, [
        id,
        police_verification_done,
        policeDoc,
        reference1_name,
        reference1_contact,
        reference1_relation_id || null,
        reference2_name,
        reference2_contact,
        reference2_relation_id || null,
      ]);
 
      res.json({
        success: true,
        message: "Step 4 - Background & Reference Check updated",
      });
    } catch (err) {
      console.error("SQL ERROR (updateBackground):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // ---------- STEP 5 ----------
static async updateDocuments(req, res) {
  try {
    const { id } = req.params;
 
    const resume = req.files?.resume_bio_data ? req.files.resume_bio_data[0].filename : null;
    const license = req.files?.driving_license ? req.files.driving_license[0].filename : null;
    const expCert = req.files?.experience_certificates ? req.files.experience_certificates[0].filename : null;
 
    if (!resume && !license && !expCert) {
      return res.status(400).json({ success: false, message: "No documents uploaded" });
    }
 
    await db.query(queries.updateDocuments, [
      id, resume, license, expCert
    ]);
 
    res.json({
      success: true,
      message: "Step 5 - Documents updated",
      uploaded: {
        resume,
        driving_license: license,
        experience_certificates: expCert
      }
    });
  } catch (err) {
    console.error("SQL ERROR (updateDocuments):", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
 
 
  // ---------- STEP 6 ----------
  static async updateAccount(req, res) {
    try {
      const { id } = req.params;
      const {
        full_name,
        email_address,
        mobile_number,
        bank_account_holder_name,
        account_number,
        ifsc_code,
      } = req.body;
 
      const bankDoc = req.file ? req.file.filename : null;
 
      await db.query(queries.updatesAccountInfo, [
        full_name,
        email_address,
        mobile_number,
        bank_account_holder_name,
        account_number,
        ifsc_code,
        bankDoc,
        id,
      ]);
 
      res.json({ success: true, message: "Step 6 updated" });
    } catch (err) {
      console.error("SQL ERROR (updateAccount):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // ---------- GET ALL USERS ----------
  static async getAllUsers(req, res) {
    try {
      const [rows] = await db.query(queries.getAllUsers);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("SQL ERROR (getAllUsers):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
 
  // ---------- GET USER BY ID ----------
  static async getUserById(req, res) {
    try {
      const { registration_id } = req.params;
      if (!registration_id) {
        return res
          .status(400)
          .json({ success: false, message: "registration_id is required" });
      }
 
      const [rows] = await db.query(queries.getUserById, [registration_id]);
      if (!rows.length) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
 
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error("SQL ERROR (getUserById):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  } 

  static async getUserByMobileNumber(req, res) {
    try {
      const { mobile_number } = req.params;
      if (!mobile_number) {
        return res.status(400).json({ success: false, message: "mobile_number is required" });
      }

      const [rows] = await db.query(queries.getUserByMobileNumber, [mobile_number]);

      if (!rows.length) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error("SQL ERROR (getUserByMobileNumber):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ✅ Update user profile
  static async updateUserProfile(req, res) {
    const {
      mobile_number,
      full_name,
      email_address,
      gender_id,
      date_of_birth,
      current_address,
      city,
      state_id,
      pincode
    } = req.body;

    try {
      if (!mobile_number) {
        return res.status(400).json({ success: false, message: "mobile_number is required" });
      }

      // Update account info
      const [accountResult] = await db.query(
        `UPDATE account_information 
         SET full_name = ?, email_address = ? 
         WHERE mobile_number = ?`,
        [full_name, email_address, mobile_number]
      );

      if (accountResult.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Get registration_id
      const [regRows] = await db.query(queries.getRegistrationIdByMobile, [mobile_number]);
      const registration_id = regRows[0]?.registration_id;

      if (!registration_id) {
        return res.status(404).json({ success: false, message: "Registration not found" });
      }

      // Update personal_information
      await db.query(
        `UPDATE personal_information 
         SET gender_id = ?, date_of_birth = ? 
         WHERE registration_id = ?`,
        [gender_id && gender_id !== 0 ? gender_id : null, date_of_birth, registration_id]
      );

      // Update contact_address_details
      await db.query(
        `UPDATE contact_address_details 
         SET current_address = ?, city = ?, state_id = ?, pincode = ? 
         WHERE registration_id = ?`,
        [current_address, city, state_id && state_id !== 0 ? state_id : null, pincode, registration_id]
      );

      res.json({ success: true, message: "✅ User profile updated successfully" });
    } catch (err) {
      console.error("SQL ERROR (updateUserProfile):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ✅ Get all states
  static async getAllStates(req, res) {
    try {
      const [rows] = await db.query(queries.getAllStates);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("SQL ERROR (getAllStates):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ✅ Get all genders
  static async getAllGenders(req, res) {
    try {
      const [rows] = await db.query(queries.getAllGenders);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("SQL ERROR (getAllGenders):", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = DirectRegistrationController;
