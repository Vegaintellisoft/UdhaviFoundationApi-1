// controller/registration_controller.js - UPDATED WITH MOBILE OTP VERIFICATION
const db = require('../database/connection');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const queries = require('../queries/registration_queries');

class RegistrationController {
    
    // ====== MOBILE OTP VERIFICATION METHODS (NEW) ======

    // Send OTP to mobile number
    // static async sendOTP(req, res) {
    //     try {
    //         const { mobile_number } = req.body;

    //         // Validate mobile number format (Indian mobile number)
    //         const mobileRegex = /^[6-9]\d{9}$/;
    //         if (!mobile_number || !mobileRegex.test(mobile_number)) {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { 
    //                     message: 'Invalid mobile number. Please provide a valid 10-digit Indian mobile number.' 
    //                 }
    //             });
    //         }

    //         // Check if mobile number is already registered
    //         const [existingRegistration] = await db.execute(queries.checkMobileAlreadyRegistered, [mobile_number]);
            
    //         if (existingRegistration.length > 0) {
    //             const registration = existingRegistration[0];
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { 
    //                     message: 'Mobile number already registered. Please login instead.',
    //                     details: {
    //                         registrationStatus: registration.registration_status,
    //                         registeredName: registration.full_name || 'User'
    //                     }
    //                 }
    //             });
    //         }

    //         // Check rate limiting (max 5 OTP requests per hour)
    //         const [recentRequests] = await db.execute(queries.checkRecentOTPRequests, [mobile_number]);
            
    //         if (recentRequests[0].request_count >= 5) {
    //             return res.status(429).json({
    //                 success: false,
    //                 error: { 
    //                     message: 'Too many OTP requests. Please try again after 1 hour.',
    //                     retryAfter: 3600
    //                 }
    //             });
    //         }

    //         // Generate 6-digit OTP
    //         const otp = Math.floor(100000 + Math.random() * 900000).toString();
    //         console.log(`🔐 Generated OTP for ${mobile_number}: ${otp}`); // Remove in production

    //         // Save OTP request in database
    //         await db.execute(queries.createOTPRequest, [mobile_number, otp]);

    //         // TODO: Integrate with SMS service (Twilio, MSG91, etc.)
    //         // For now, we'll just log it
    //         console.log(`📱 SMS would be sent to ${mobile_number}: Your OTP for registration is ${otp}. Valid for 10 minutes.`);

    //         // Mask mobile number for response
    //         const maskedMobile = mobile_number.slice(0, -3).replace(/\d/g, 'X') + mobile_number.slice(-3);

    //         res.json({
    //             success: true,
    //             message: 'OTP sent successfully to your mobile number',
    //             data: {
    //                 mobile_number: maskedMobile,
    //                 otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    //                 masked_mobile: maskedMobile
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Send OTP error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { message: 'Failed to send OTP. Please try again.' }
    //         });
    //     }
    // }

      static async sendOTP(req, res) {
    try {
      const { mobile_number } = req.body;
      const mobileRegex = /^[6-9]\d{9}$/;

      if (!mobile_number || !mobileRegex.test(mobile_number)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid mobile number. Please provide a valid 10-digit Indian mobile number.' }
        });
      }

      // Check if user already registered
      const [existingUser] = await db.execute(queries.checkMobileAlreadyRegistered, [mobile_number]);
      const isExistingUser = existingUser.length > 0;
      const user = existingUser[0] || {};

      // Check OTP request rate limit (max 5/hour)
      const [recentRequests] = await db.execute(queries.checkRecentOTPRequests, [mobile_number]);
      if (recentRequests[0]?.request_count >= 5) {
        return res.status(429).json({
          success: false,
          error: { message: 'Too many OTP requests. Please try again after 1 hour.', retryAfter: 3600 }
        });
      }

      // Generate random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔐 OTP generated for ${mobile_number}: ${otp}`);

      // Save new OTP
      await db.execute(queries.createOTPRequest, [mobile_number, otp]);

      // (Optional) Integrate SMS Gateway here
      console.log(`📩 OTP message sent to ${mobile_number}: ${otp}`);

      // Mask mobile for UI
      const maskedMobile = mobile_number.slice(0, -3).replace(/\d/g, 'X') + mobile_number.slice(-3);

      return res.json({
        success: true,
        message: `OTP sent successfully (${isExistingUser ? 'Existing User' : 'New User'})`,
        data: {
          mobile_number: maskedMobile,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          masked_mobile: maskedMobile,
          isExistingUser,
          navigateTo: isExistingUser ? 'service-provider' : 'register',
          registrationStatus: user.registration_status || null,
          registeredName: user.full_name || null
        }
      });

    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to send OTP. Please try again.' }
      });
    }
  }
static async verifyOTPAndInitialize(req, res) {
  const { mobile_number, otp } = req.body;
  const mobileRegex = /^[6-9]\d{9}$/;
  const otpRegex = /^\d{6}$/;

  if (!mobile_number || !otp) {
    return res.status(400).json({ success: false, error: { message: 'Mobile number and OTP are required.' } });
  }
  if (!mobileRegex.test(mobile_number)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid mobile number format.' } });
  }
  if (!otpRegex.test(otp)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid OTP format.' } });
  }

  // helper that retries once when the pool transiently closes
  async function runOnce(fn) {
    try {
      return await fn();
    } catch (err) {
      // if pool/conn was closed, try one quick retry
      if (typeof err.message === 'string' && err.message.includes('closed state')) {
        console.warn('Detected closed-state error — retrying once...');
        return await fn();
      }
      throw err;
    }
  }

  try {
    // 1) read OTP request
    const [otpRows] = await runOnce(() => db.execute(queries.getOTPRequest, [mobile_number]));
    if (!otpRows || otpRows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'OTP not found or expired. Please request a new OTP.' } });
    }
    const otpRequest = otpRows[0];

    if (otpRequest.attempts >= 3) {
      return res.status(400).json({ success: false, error: { message: 'Maximum OTP attempts exceeded. Please request a new OTP.' } });
    }

    // 2) check OTP
    if (otpRequest.otp !== otp) {
      await runOnce(() => db.execute(queries.updateOTPAttempts, [mobile_number]));
      const remaining = 3 - (otpRequest.attempts + 1);
      return res.status(400).json({ success: false, error: { message: 'Invalid OTP. Please try again.', remainingAttempts: remaining } });
    }

    // 3) mark OTP verified and mobile verified
    await runOnce(() => db.execute(queries.verifyOTP, [mobile_number, otp]));
    await runOnce(() => db.execute(queries.updateMobileVerified, [mobile_number]));

    // 4) check if user exists
    const [existingUser] = await runOnce(() => db.execute(queries.checkMobileAlreadyRegistered, [mobile_number]));
    const sessionToken = crypto.randomBytes(32).toString('hex');

    if (existingUser && existingUser.length > 0) {
      const registrationId = existingUser[0].registration_id;
      const registrationStatus = existingUser[0].registration_status;

      await runOnce(() => db.execute(queries.updateRegistrationSession, [sessionToken, registrationId]));
      const [details] = await runOnce(() => db.execute(queries.getFullRegistrationDetails, [registrationId]));

      return res.json({
        success: true,
        message: 'Mobile number verified successfully.',
        data: {
          ...details[0],
          sessionToken,
          registrationId,
          registrationStatus,
          mobileNumber: mobile_number,
          mobileVerified: true,
          isExistingUser: true,
          navigateTo: 'service-provider'
        }
      });
    }

    // 5) create registration for new user
    const [insertResult] = await runOnce(() => db.execute(queries.createOrUpdateRegistration, [sessionToken, mobile_number]));
    const registrationId = insertResult.insertId;

    return res.json({
      success: true,
      message: 'Mobile number verified successfully.',
      data: {
        sessionToken,
        registrationId,
        registrationStatus: 'draft',
        mobileNumber: mobile_number,
        mobileVerified: true,
        isExistingUser: false,
        navigateTo: 'register'
      }
    });

  } catch (err) {
    console.error('❌ Verify OTP error final:', err && err.message);
    const details = err && err.message ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, error: { message: 'Failed to verify OTP. Please try again later.', details } });
  }
}



    // Verify OTP and initialize registration session
    // static async verifyOTPAndInitialize(req, res) {
    //     const connection = await db.getConnection();
        
    //     try {
    //         await connection.beginTransaction();

    //         const { mobile_number, otp } = req.body;

    //         // Validate inputs
    //         if (!mobile_number || !otp) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { message: 'Mobile number and OTP are required' }
    //             });
    //         }

    //         const mobileRegex = /^[6-9]\d{9}$/;
    //         const otpRegex = /^\d{6}$/;

    //         if (!mobileRegex.test(mobile_number)) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { message: 'Invalid mobile number format' }
    //             });
    //         }

    //         if (!otpRegex.test(otp)) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { message: 'Invalid OTP format. OTP should be 6 digits.' }
    //             });
    //         }

    //         // Get OTP request
    //         const [otpRequests] = await connection.execute(queries.getOTPRequest, [mobile_number]);

    //         if (otpRequests.length === 0) {
    //             await connection.rollback();
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { 
    //                     message: 'OTP not found or expired. Please request a new OTP.',
    //                     code: 'OTP_NOT_FOUND'
    //                 }
    //             });
    //         }

    //         const otpRequest = otpRequests[0];

    //         // Check if OTP attempts exceeded (max 3 attempts)
    //         if (otpRequest.attempts >= 3) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { 
    //                     message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
    //                     code: 'MAX_ATTEMPTS_EXCEEDED'
    //                 }
    //             });
    //         }

    //         // Verify OTP
    //         if (otpRequest.otp !== otp) {
    //             // Increment attempts
    //             await connection.execute(queries.updateOTPAttempts, [mobile_number, otp]);
    //             await connection.rollback();
                
    //             const remainingAttempts = 3 - (otpRequest.attempts + 1);
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { 
    //                     message: 'Invalid OTP. Please check and try again.',
    //                     remainingAttempts: remainingAttempts,
    //                     code: 'INVALID_OTP'
    //                 }
    //             });
    //         }

    //         // OTP is valid - mark as verified
    //         await connection.execute(queries.verifyOTP, [mobile_number, otp]);

    //         // Create registration session with verified mobile number
    //         const sessionToken = crypto.randomBytes(32).toString('hex');
    //         const [result] = await connection.execute(queries.createRegistrationSession, [
    //             sessionToken, 
    //             mobile_number
    //         ]);

    //         await connection.commit();

    //         console.log(`✅ Mobile ${mobile_number} verified successfully, session created: ${sessionToken}`);

    //         res.json({
    //             success: true,
    //             message: 'Mobile number verified successfully',
    //             data: {
    //                 sessionToken,
    //                 registrationId: result.insertId,
    //                 currentStep: 1,
    //                 totalSteps: 6,
    //                 registrationStatus: 'draft',
    //                 mobileNumber: mobile_number,
    //                 mobileVerified: true
    //             }
    //         });

    //     } catch (error) {
    //         if (connection) {
    //             await connection.rollback();
    //         }
    //         console.error('Verify OTP error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { 
    //                 message: 'Failed to verify OTP. Please try again.',
    //                 code: 'VERIFICATION_ERROR'
    //             }
    //         });
    //     } finally {
    //         if (connection) {
    //             connection.release();
    //         }
    //     }
    // }



    // Resend OTP
    // static async resendOTP(req, res) {
    //     try {
    //         const { mobile_number } = req.body;

    //         // Validate mobile number
    //         const mobileRegex = /^[6-9]\d{9}$/;
    //         if (!mobile_number || !mobileRegex.test(mobile_number)) {
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { message: 'Invalid mobile number format' }
    //             });
    //         }

    //         // Check rate limiting
    //         const [recentRequests] = await db.execute(queries.checkRecentOTPRequests, [mobile_number]);
            
    //         if (recentRequests[0].request_count >= 5) {
    //             return res.status(429).json({
    //                 success: false,
    //                 error: { 
    //                     message: 'Too many OTP requests. Please try again after 1 hour.',
    //                     retryAfter: 3600
    //                 }
    //             });
    //         }

    //         // Generate new OTP
    //         const otp = Math.floor(100000 + Math.random() * 900000).toString();
    //         console.log(`🔐 Resent OTP for ${mobile_number}: ${otp}`); // Remove in production

    //         // Save new OTP request
    //         await db.execute(queries.createOTPRequest, [mobile_number, otp]);

    //         console.log(`📱 SMS would be resent to ${mobile_number}: Your OTP for registration is ${otp}. Valid for 10 minutes.`);

    //         const maskedMobile = mobile_number.slice(0, -3).replace(/\d/g, 'X') + mobile_number.slice(-3);

    //         res.json({
    //             success: true,
    //             message: 'OTP resent successfully',
    //             data: {
    //                 mobile_number: maskedMobile,
    //                 otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Resend OTP error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { message: 'Failed to resend OTP. Please try again.' }
    //         });
    //     }
    // }

      static async resendOTP(req, res) {
    try {
      const { mobile_number } = req.body;
      const mobileRegex = /^[6-9]\d{9}$/;

      if (!mobile_number || !mobileRegex.test(mobile_number)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid mobile number format' }
        });
      }

      // Rate limiting check
      const [recentRequests] = await db.execute(queries.checkRecentOTPRequests, [mobile_number]);
      if (recentRequests[0].request_count >= 5) {
        return res.status(429).json({
          success: false,
          error: { message: 'Too many OTP requests. Please try again after 1 hour.', retryAfter: 3600 }
        });
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔐 Resent OTP for ${mobile_number}: ${otp}`);

      // Save new OTP
      await db.execute(queries.createOTPRequest, [mobile_number, otp]);
      console.log(`📱 SMS resent to ${mobile_number}: OTP ${otp} valid for 10 minutes.`);

      const maskedMobile = mobile_number.slice(0, -3).replace(/\d/g, 'X') + mobile_number.slice(-3);

      return res.json({
        success: true,
        message: 'OTP resent successfully',
        data: {
          mobile_number: maskedMobile,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }
      });

    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to resend OTP. Please try again.' }
      });
    }
  }

    // ====== EXISTING REGISTRATION METHODS (MODIFIED TO WORK WITH MOBILE VERIFICATION) ======

    // Get complete registration data
    static async getCompleteRegistration(req, res) {
        try {
            const { sessionToken } = req.params;
            
            const [results] = await db.execute(queries.getCompleteRegistrationData, [sessionToken]);
            
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

    // Get specific step data
    static async getStepData(req, res) {
        console.log('🔍 getStepData called');
        console.log('📝 Request params:', req.params);
        
        try {
            const { sessionToken, step } = req.params;
            
            console.log('🔍 Looking for session:', sessionToken, 'step:', step);
            
            // First get registration ID
            const [sessionResults] = await db.execute(queries.getRegistrationBySession, [sessionToken]);
            
            console.log('📊 Session results:', sessionResults);
            
            if (sessionResults.length === 0) {
                console.log('❌ No session found');
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration session not found' }
                });
            }
            
            const registrationId = sessionResults[0].registration_id;
            console.log('✅ Found registration ID:', registrationId);
            
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
                    // For step 6, also include the mobile number from session
                    if (results.length === 0) {
                        results = [{
                            mobile_number: sessionResults[0].mobile_number,
                            mobile_verified: true
                        }];
                    } else {
                        results[0].mobile_number = sessionResults[0].mobile_number;
                        results[0].mobile_verified = true;
                    }
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

    // Save personal information (Step 1) - UNCHANGED
    // static async savePersonalInfo(req, res) {
    //     console.log('🔄 Step 1 - savePersonalInfo called');
    //     console.log('📝 Request params:', req.params);
    //     console.log('📝 Request body:', req.body);
    //     console.log('📝 Request files:', req.files);
        
    //     try {
    //         const { sessionToken } = req.params;
    //         const {
    //             date_of_birth, gender_id, nationality_id,
    //             languages_known, id_proof_type_id, id_proof_number
    //         } = req.body;

    //         console.log('🔍 Extracted data:', {
    //             sessionToken, date_of_birth, gender_id, nationality_id,
    //             languages_known, id_proof_type_id, id_proof_number
    //         });

    //         // Get registration ID
    //         console.log('🔍 Looking up registration for session:', sessionToken);
    //         const [sessionResults] = await db.execute(queries.getRegistrationBySession, [sessionToken]);

    //         console.log('🔍 Session lookup results:', sessionResults);

    //         if (sessionResults.length === 0) {
    //             console.log('❌ No registration found for session token');
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration session not found' }
    //             });
    //         }

    //         const registrationId = sessionResults[0].registration_id;
    //         console.log('✅ Found registration ID:', registrationId);

    //         // Handle file uploads
    //         let profile_photo = null;
    //         let id_proof_document = null;

    //         if (req.files) {
    //             console.log('📁 Processing file uploads:', Object.keys(req.files));
    //             if (req.files.profile_photo) {
    //                 profile_photo = req.files.profile_photo[0].filename;
    //                 console.log('📷 Profile photo:', profile_photo);
    //             }
    //             if (req.files.id_proof_document) {
    //                 id_proof_document = req.files.id_proof_document[0].filename;
    //                 console.log('📄 ID proof document:', id_proof_document);
    //             }
    //         } else {
    //             console.log('📁 No files uploaded');
    //         }

    //         console.log('💾 Inserting personal info into database...');
    //         await db.execute(queries.insertPersonalInfo, [
    //             registrationId, date_of_birth, gender_id, profile_photo, nationality_id,
    //             languages_known, id_proof_type_id, id_proof_number, id_proof_document
    //         ]);

    //         console.log('✅ Personal info inserted successfully');

    //         // Log document verification entries for uploaded documents
    //         if (profile_photo) {
    //             await db.execute(queries.insertDocumentVerificationLog, [
    //                 registrationId, 'profile_photo', profile_photo
    //             ]);
    //         }
    //         if (id_proof_document) {
    //             await db.execute(queries.insertDocumentVerificationLog, [
    //                 registrationId, 'id_proof', id_proof_document
    //             ]);
    //         }

    //         // Update current step
    //         console.log('🔄 Updating registration step to 2...');
    //         await db.execute(queries.updateRegistrationStep, [2, sessionToken]);

    //         console.log('✅ Step 1 completed successfully');
    //         res.json({
    //             success: true,
    //             message: 'Personal information saved successfully',
    //             data: { 
    //                 currentStep: 2,
    //                 documentsStatus: 'pending_verification'
    //             }
    //         });

    //     } catch (error) {
    //         console.error('❌ Save personal info error:', error);
    //         console.error('❌ Error stack:', error.stack);
    //         res.status(500).json({
    //             success: false,
    //             error: { 
    //                 message: 'Failed to save personal information',
    //                 details: error.message 
    //             }
    //         });
    //     }
    // }

        static async savePersonalInfo(req, res) {
        console.log('🔄 Step 1 - savePersonalInfo called');
        console.log('📝 Request params:', req.params);
        console.log('📝 Request body:', req.body);
        console.log('📝 Request files:', req.files);
        
        try {
            const { sessionToken } = req.params;
            const {
                date_of_birth, gender_id, nationality_id,
                languages_known, id_proof_type_id, id_proof_number
            } = req.body;

            console.log('🔍 Extracted data:', {
                sessionToken, date_of_birth, gender_id, nationality_id,
                languages_known, id_proof_type_id, id_proof_number
            });

            // Get registration ID
            console.log('🔍 Looking up registration for session:', sessionToken);
            const [sessionResults] = await db.execute(queries.getRegistrationBySession, [sessionToken]);

            console.log('🔍 Session lookup results:', sessionResults);

            if (sessionResults.length === 0) {
                console.log('❌ No registration found for session token');
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration session not found' }
                });
            }

            const registrationId = sessionResults[0].registration_id;
            console.log('✅ Found registration ID:', registrationId);

            // Handle file uploads
            let profile_photo = null;
            let id_proof_document = null;

            if (req.files) {
                console.log('📁 Processing file uploads:', Object.keys(req.files));
                if (req.files.profile_photo) {
                    profile_photo = req.files.profile_photo[0].filename;
                    console.log('📷 Profile photo:', profile_photo);
                }
                if (req.files.id_proof_document) {
                    id_proof_document = req.files.id_proof_document[0].filename;
                    console.log('📄 ID proof document:', id_proof_document);
                }
            } else {
                console.log('📁 No files uploaded');
            }

            console.log('💾 Inserting personal info into database...');
            await db.execute(queries.insertPersonalInfo, [
                registrationId, date_of_birth, gender_id, profile_photo, nationality_id,
                languages_known, id_proof_type_id, id_proof_number, id_proof_document
            ]);

            console.log('✅ Personal info inserted successfully');

            // Log document verification entries for uploaded documents
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

            // Update current step
            console.log('🔄 Updating registration step to 2...');
            await db.execute(queries.updateRegistrationStep, [2, sessionToken]);

            console.log('✅ Step 1 completed successfully');
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
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({
                success: false,
                error: { 
                    message: 'Failed to save personal information',
                    details: error.message 
                }
            });
        }
    }

    // Save contact address (Step 2) - UNCHANGED
    // static async saveContactAddress(req, res) {
    //     try {
    //         const { sessionToken } = req.params;
    //         const {
    //             current_address, permanent_address, city, state_id, 
    //             pincode, preferred_location_id
    //         } = req.body;

    //         const [sessionResults] = await db.execute(queries.getRegistrationBySession, [sessionToken]);

    //         if (sessionResults.length === 0) {
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration session not found' }
    //             });
    //         }

    //         const registrationId = sessionResults[0].registration_id;

    //         await db.execute(queries.insertContactAddress, [
    //             registrationId, current_address, permanent_address, city, state_id, 
    //             pincode, preferred_location_id
    //         ]);

    //         await db.execute(queries.updateRegistrationStep, [3, sessionToken]);

    //         res.json({
    //             success: true,
    //             message: 'Contact information saved successfully',
    //             data: { currentStep: 3 }
    //         });

    //     } catch (error) {
    //         console.error('Save contact address error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { message: 'Failed to save contact information' }
    //         });
    //     }
    // }

    static async saveContactAddress(req, res) {
  console.log('📍 Step 2 - saveContactAddress called');
  console.log('📝 Request params:', req.params);
  console.log('📝 Request body:', req.body);

  try {
    const { sessionToken } = req.params;
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

    // ✅ Validate session token
    const [sessionResults] = await db.execute(queries.getRegistrationBySession, [sessionToken]);
    if (sessionResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Registration session not found' }
      });
    }

    const registrationId = sessionResults[0].registration_id;

    // ✅ Insert or update contact address details
    await db.execute(queries.insertContactAddress, [
      registrationId,
      current_address || null,
      permanent_address || null,
      city || null,
      state_id || null,
      pincode || null,
      preferred_location_id || null,
      current_latitude || null,
      current_longitude || null,
      permanent_latitude || null,
      permanent_longitude || null
    ]);

    // ✅ Update current registration step
    await db.execute(queries.updateRegistrationStep, [3, sessionToken]);

    return res.json({
      success: true,
      message: 'Contact information saved successfully',
      data: { currentStep: 3 }
    });
  } catch (error) {
    console.error('❌ Save contact address error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to save contact information' }
    });
  }
}

    // Save service information (Step 3) - UNCHANGED
    // static async saveServiceInfo(req, res) {
    //     console.log('🔄 Step 3 - saveServiceInfo called');
    //     console.log('📝 Request params:', req.params);
    //     console.log('📝 Request body:', req.body);
        
    //     const connection = await db.getConnection();
        
    //     try {
    //         await connection.beginTransaction();
            
    //         const { sessionToken } = req.params;
    //         const {
    //             service_type_ids, work_type_ids, experience_years,
    //             available_day_ids, time_slot_ids, expected_salary,
    //             salary_type = 'hourly', currency_code = 'INR',
    //             negotiable = true, service_description
    //         } = req.body;

    //         const [sessionResults] = await connection.execute(queries.getRegistrationBySession, [sessionToken]);

    //         if (sessionResults.length === 0) {
    //             await connection.rollback();
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration session not found' }
    //             });
    //         }

    //         const registrationId = sessionResults[0].registration_id;

    //         // Handle service image upload
    //         let service_image = null;
    //         if (req.file) {
    //             service_image = req.file.filename;
    //             // Log service image for verification
    //             await connection.execute(queries.insertDocumentVerificationLog, [
    //                 registrationId, 'service_image', service_image
    //             ]);
    //         }

    //         console.log('💰 Creating salary expectation with PENDING status (0)...');
    //         // First, insert salary expectation with status = 0 (pending)
    //         const [salaryResult] = await connection.execute(queries.insertSalaryExpectation, [
    //             registrationId, 
    //             expected_salary, 
    //             salary_type, 
    //             currency_code, 
    //             negotiable === 'true' || negotiable === true
    //         ]);

    //         // Get the salary expectation ID
    //         let salaryExpectationId;
    //         if (salaryResult.insertId) {
    //             salaryExpectationId = salaryResult.insertId;
    //         } else {
    //             // If it was an update, get the existing ID
    //             const [existingSalary] = await connection.execute(queries.getSalaryExpectationByRegistration, [registrationId]);
    //             salaryExpectationId = existingSalary[0].expectation_id;
    //         }

    //         console.log('✅ Salary expectation created/updated with ID:', salaryExpectationId);

    //         // Now insert service information with reference to salary expectation
    //         await connection.execute(queries.insertServiceInfo, [
    //             registrationId, 
    //             JSON.stringify(service_type_ids), 
    //             JSON.stringify(work_type_ids),
    //             experience_years, 
    //             JSON.stringify(available_day_ids), 
    //             JSON.stringify(time_slot_ids),
    //             service_description, 
    //             service_image, 
    //             salaryExpectationId
    //         ]);

    //         await connection.execute(queries.updateRegistrationStep, [4, sessionToken]);
            
    //         await connection.commit();

    //         console.log('✅ Step 3 completed successfully with pending salary status');
    //         res.json({
    //             success: true,
    //             message: 'Service information saved successfully',
    //             data: { 
    //                 currentStep: 4,
    //                 salaryStatus: 'pending_approval',
    //                 salaryExpectationId: salaryExpectationId
    //             }
    //         });

    //     } catch (error) {
    //         if (connection) {
    //             await connection.rollback();
    //         }
    //         console.error('❌ Save service info error:', error);
    //         res.status(500).json({
    //             success: false,
    //             error: { 
    //                 message: 'Failed to save service information',
    //                 details: error.message
    //             }
    //         });
    //     } finally {
    //         if (connection) {
    //             connection.release();
    //         }
    //     }
    // }

    static async saveServiceInfo(req, res) {
  console.log('🔄 Step 3 - saveServiceInfo called');
  console.log('📝 Request body:', req.body);

  const connection = await db.getConnection();

  // Helper: Convert comma-separated form-data to valid JSON array
  const parseToJsonArray = (str) => {
    if (!str) return null;
    return JSON.stringify(
      str.split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(Number)
    );
  };

  try {
    await connection.beginTransaction();

    const { sessionToken } = req.params;
    const {
      service_type_id,
      work_type_id,
      years_of_experience,
      expected_salary,
      salary_type = 'monthly',
      currency_code = 'INR',
      negotiable = true,
      available_day_ids,
      time_slot_ids,
      service_description
    } = req.body;

    // ✅ Get registration ID from session
    const [sessionResults] = await connection.execute(queries.getRegistrationBySession, [sessionToken]);
    if (sessionResults.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: { message: 'Registration session not found' }
      });
    }
    const registrationId = sessionResults[0].registration_id;

    // 🖼 Handle file upload (service image)
    let service_image = null;
    if (req.file) {
      service_image = req.file.filename;
      await connection.execute(queries.insertDocumentVerificationLog, [
        registrationId,
        'service_image',
        service_image
      ]);
    }

    // 🧹 Convert IDs to JSON arrays
    const cleanDaysJson = parseToJsonArray(available_day_ids);
    const cleanSlotsJson = parseToJsonArray(time_slot_ids);

    // 💰 Salary expectation insert
    const [salaryResult] = await connection.execute(queries.insertSalaryExpectation, [
      registrationId,
      expected_salary || 0,
      salary_type,
      currency_code,
      negotiable === 'true' || negotiable === true
    ]);

    let salaryExpectationId;
    if (salaryResult.insertId) {
      salaryExpectationId = salaryResult.insertId;
    } else {
      const [existing] = await connection.execute(
        queries.getSalaryExpectationByRegistration,
        [registrationId]
      );
      salaryExpectationId = existing[0].expectation_id;
    }

    // 📝 Insert service info
    await connection.execute(queries.insertServiceInfo, [
      registrationId,
      service_type_id || null,
      work_type_id || null,
      years_of_experience || null,
      expected_salary || null,
      cleanDaysJson,
      cleanSlotsJson,
      service_description || null,
      service_image || null,
      salaryExpectationId
    ]);

    await connection.execute(queries.updateRegistrationStep, [4, sessionToken]);
    await connection.commit();

    console.log('✅ Step 3 completed successfully');
    res.json({
      success: true,
      message: 'Service information saved successfully',
      data: {
        currentStep: 4,
        salaryExpectationId
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Save service info error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to save service information', details: error.message }
    });
  } finally {
    if (connection) connection.release();
  }
}

    // Save background check (Step 4) - UNCHANGED
    // static async saveBackgroundCheck(req, res) {
    //     console.log('🔄 Step 4 - saveBackgroundCheck called');
    //     console.log('📝 Request params:', req.params);
    //     console.log('📝 Request body:', req.body);
    //     console.log('📝 Request file:', req.file);
        
    //     try {
    //         const { sessionToken } = req.params;
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

    //         // Get registration ID
    //         const [sessionResults] = await db.execute(queries.getRegistrationBySession, [sessionToken]);

    //         if (sessionResults.length === 0) {
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration session not found' }
    //             });
    //         }

    //         const registrationId = sessionResults[0].registration_id;

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

    //         console.log('💾 Inserting background check data with PENDING police verification status...');
            
    //         // Insert with all the fields - police_verification_status automatically set to 'pending' in query
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
    //         await db.execute(queries.updateRegistrationStep, [5, sessionToken]);

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
        console.log('📝 Request params:', req.params);
        console.log('📝 Request body:', req.body);
        console.log('📝 Request file:', req.file);
        
        try {
            const { sessionToken } = req.params;
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

            // Get registration ID
            const [sessionResults] = await db.execute(queries.getRegistrationBySession, [sessionToken]);

            if (sessionResults.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration session not found' }
                });
            }

            const registrationId = sessionResults[0].registration_id;

            // Handle file upload
            let police_verification_document = null;
            if (req.file) {
                police_verification_document = req.file.filename;
                
                // Log document for verification with PENDING status
                await db.execute(queries.insertDocumentVerificationLog, [
                    registrationId, 'police_verification', police_verification_document
                ]);
            }

            // Convert boolean values properly
            const policeVerificationDone = police_verification_done === 'true' || police_verification_done === true || police_verification_done === 1;
            const hasPoliceVerification = has_police_verification === 'true' || has_police_verification === true || has_police_verification === 1;

            console.log('💾 Inserting background check data with PENDING police verification status...');
            
            // Insert with all the fields - police_verification_status automatically set to 'pending' in query
            await db.execute(queries.insertBackgroundCheck, [
                registrationId,
                policeVerificationDone ? 1 : 0,
                police_verification_document,
                hasPoliceVerification ? 1 : 0,
                criminal_record_details || null,
                reference1_name || null,
                reference1_contact || null,
                reference1_relationship_id || null,
                reference2_name || null,
                reference2_contact || null,
                reference2_relationship_id || null
            ]);

            // Update current step
            await db.execute(queries.updateRegistrationStep, [5, sessionToken]);

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


    // Save document uploads (Step 5) - UNCHANGED
    // static async saveDocumentUploads(req, res) {
    //     console.log('🔄 Step 5 - saveDocumentUploads called');
    //     const connection = await db.getConnection();
        
    //     try {
    //         await connection.beginTransaction();
            
    //         const { sessionToken } = req.params;

    //         const [sessionResults] = await connection.execute(queries.getRegistrationBySession, [sessionToken]);

    //         if (sessionResults.length === 0) {
    //             await connection.rollback();
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration session not found' }
    //             });
    //         }

    //         const registrationId = sessionResults[0].registration_id;

    //         let resume_bio_data = null;
    //         let driving_license = null;
    //         let experience_certificates = null;
    //         const documentsUploaded = [];

    //         if (req.files) {
    //             console.log('📁 Processing uploaded files...');
                
    //             if (req.files.resume_bio_data && req.files.resume_bio_data[0]) {
    //                 resume_bio_data = req.files.resume_bio_data[0].filename;
    //                 documentsUploaded.push('resume');
                    
    //                 // Log for verification with PENDING status
    //                 await connection.execute(queries.insertDocumentVerificationLog, [
    //                     registrationId, 'resume', resume_bio_data
    //                 ]);
    //             }
                
    //             if (req.files.driving_license && req.files.driving_license[0]) {
    //                 driving_license = req.files.driving_license[0].filename;
    //                 documentsUploaded.push('driving_license');
                    
    //                 // Log for verification with PENDING status
    //                 await connection.execute(queries.insertDocumentVerificationLog, [
    //                     registrationId, 'driving_license', driving_license
    //                 ]);
    //             }
                
    //             if (req.files.experience_certificates && req.files.experience_certificates[0]) {
    //                 experience_certificates = req.files.experience_certificates[0].filename;
    //                 documentsUploaded.push('experience_certificates');
                    
    //                 // Log for verification with PENDING status
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

    //         await connection.execute(queries.updateRegistrationStep, [6, sessionToken]);
            
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
        console.log('🔄 Step 5 - saveDocumentUploads called');
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { sessionToken } = req.params;

            const [sessionResults] = await connection.execute(queries.getRegistrationBySession, [sessionToken]);

            if (sessionResults.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration session not found' }
                });
            }

            const registrationId = sessionResults[0].registration_id;

            let resume_bio_data = null;
            let driving_license = null;
            let experience_certificates = null;
            const documentsUploaded = [];

            if (req.files) {
                console.log('📁 Processing uploaded files...');
                
                if (req.files.resume_bio_data && req.files.resume_bio_data[0]) {
                    resume_bio_data = req.files.resume_bio_data[0].filename;
                    documentsUploaded.push('resume');
                    
                    // Log for verification with PENDING status
                    await connection.execute(queries.insertDocumentVerificationLog, [
                        registrationId, 'resume', resume_bio_data
                    ]);
                }
                
                if (req.files.driving_license && req.files.driving_license[0]) {
                    driving_license = req.files.driving_license[0].filename;
                    documentsUploaded.push('driving_license');
                    
                    // Log for verification with PENDING status
                    await connection.execute(queries.insertDocumentVerificationLog, [
                        registrationId, 'driving_license', driving_license
                    ]);
                }
                
                if (req.files.experience_certificates && req.files.experience_certificates[0]) {
                    experience_certificates = req.files.experience_certificates[0].filename;
                    documentsUploaded.push('experience_certificates');
                    
                    // Log for verification with PENDING status
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

            await connection.execute(queries.updateRegistrationStep, [6, sessionToken]);
            
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

    // Save account information (Step 6) - MODIFIED to use verified mobile number
    // static async saveAccountInfo(req, res) {
    //     const connection = await db.getConnection();
        
    //     try {
    //         await connection.beginTransaction();
            
    //         const { sessionToken } = req.params;
    //         const {
    //             full_name,
    //             email_address,
    //             password,
    //             bank_account_holder_name,
    //             account_number,
    //             ifsc_code,
    //             terms_accepted,
    //             information_confirmed
    //         } = req.body;

    //         console.log('🔄 Step 6 - Processing account info:', { sessionToken, email_address });

    //         // Get session details including verified mobile number
    //         const [sessionResults] = await connection.execute(queries.getRegistrationBySession, [sessionToken]);

    //         if (sessionResults.length === 0) {
    //             await connection.rollback();
    //             return res.status(404).json({
    //                 success: false,
    //                 error: { message: 'Registration session not found' }
    //             });
    //         }

    //         const registrationId = sessionResults[0].registration_id;
    //         const verifiedMobileNumber = sessionResults[0].mobile_number; // Mobile from verified session
    //         const oldStatus = sessionResults[0].registration_status;

    //         // Validate required fields
    //         const missingFields = [];
    //         if (!full_name) missingFields.push('full_name');
    //         if (!email_address) missingFields.push('email_address');
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

    //         // Check for duplicate email only (mobile is already verified)
    //         const [emailResults] = await connection.execute(queries.checkEmailExistsSimple, [email_address]);

    //         if (emailResults.length > 0) {
    //             await connection.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 error: { message: 'Email address already exists' }
    //             });
    //         }

    //         // Hash password
    //         const hashedPassword = await bcrypt.hash(password, 12);

    //         // Handle file upload
    //         let cancelled_cheque_passbook = null;
    //         if (req.file) {
    //             cancelled_cheque_passbook = req.file.filename;
    //             // Log bank document for verification with PENDING status
    //             await connection.execute(queries.insertDocumentVerificationLog, [
    //                 registrationId, 'bank_document', cancelled_cheque_passbook
    //             ]);
    //         }

    //         // Insert account information with verified mobile number
    //         const [insertResult] = await connection.execute(queries.insertAccountInfo, [
    //             registrationId,
    //             full_name,
    //             email_address,
    //             verifiedMobileNumber, // Use mobile number from verified session
    //             hashedPassword,
    //             bank_account_holder_name || null,
    //             account_number || null,
    //             ifsc_code || null,
    //             cancelled_cheque_passbook,
    //             terms_accepted === true || terms_accepted === 'true',
    //             information_confirmed === true || information_confirmed === 'true'
    //         ]);

    //         // Complete registration - this automatically sets status to 'submitted'
    //         await connection.execute(queries.completeRegistration, [sessionToken]);

    //         // Log status change in history
    //         await connection.execute(queries.insertRegistrationStatusHistory, [
    //             registrationId, oldStatus, 'submitted', null, 'Registration completed by user'
    //         ]);

    //         await connection.commit();

    //         console.log('✅ Registration completed with SUBMITTED status');
    //         res.json({
    //             success: true,
    //             message: 'Registration completed successfully! Your application is under review.',
    //             data: {
    //                 registrationCompleted: true,
    //                 userId: registrationId,
    //                 status: 'submitted',
    //                 accountId: insertResult.insertId,
    //                 mobileNumber: verifiedMobileNumber,
    //                 mobileVerified: true,
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
    const { sessionToken } = req.params;
    const {
      full_name,
      email_address,
      password,
      bank_account_holder_name,
      account_number,
      ifsc_code,
      terms_accepted,
      information_confirmed
    } = req.body;

    // ✅ Get session info
    const [sessionResults] = await connection.execute(queries.getRegistrationBySession, [sessionToken]);
    if (sessionResults.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: { message: 'Registration session not found' }
      });
    }

    const registrationId = sessionResults[0].registration_id;
    const verifiedMobileNumber = sessionResults[0].mobile_number;
    const oldStatus = sessionResults[0].registration_status;

    // ✅ Handle file upload (cheque passbook)
    let cancelled_cheque_passbook = null;
    if (req.file) {
      cancelled_cheque_passbook = req.file.filename;
      // Log the uploaded file for verification
      await connection.execute(queries.insertDocumentVerificationLog, [
        registrationId,
        'bank_document',
        cancelled_cheque_passbook
      ]);
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // ✅ Insert or update account info
    await connection.execute(queries.insertAccountInfo, [
      registrationId,
      full_name,
      email_address,
      verifiedMobileNumber,
      hashedPassword,
      bank_account_holder_name || null,
      account_number || null,
      ifsc_code || null,
      cancelled_cheque_passbook,
      terms_accepted === 'true' || terms_accepted === true,
      information_confirmed === 'true' || information_confirmed === true,
      null // profile_image (you can add upload if needed later)
    ]);

    // ✅ Complete registration
    await connection.execute(queries.completeRegistration, [sessionToken]);
    await connection.execute(queries.insertRegistrationStatusHistory, [
      registrationId,
      oldStatus,
      'submitted',
      null,
      'Registration completed by user'
    ]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Registration completed successfully!',
      data: {
        registrationCompleted: true,
        accountId: registrationId,
        cancelled_cheque_passbook: cancelled_cheque_passbook || null
      }
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Save account info error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to complete registration',
        details: error.message
      }
    });
  } finally {
    if (connection) connection.release();
  }
}

    // Get registration status with detailed status information
    static async getRegistrationStatus(req, res) {
        try {
            const { sessionToken } = req.params;
            
            const [results] = await db.execute(queries.getRegistrationProgress, [sessionToken]);
            
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Registration session not found' }
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
                    sessionToken,
                    registrationId: progress.registration_id,
                    mobileNumber: progress.mobile_number,
                    mobileVerified: true,
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

    // ====== ADMIN FUNCTIONS (UNCHANGED) ======

    // Get all pending verifications (for admin)
    static async getPendingVerifications(req, res) {
        try {
            const [results] = await db.execute(queries.getPendingVerifications);
            
            res.json({
                success: true,
                data: {
                    totalPending: results.length,
                    pendingRegistrations: results
                }
            });
        } catch (error) {
            console.error('Get pending verifications error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch pending verifications' }
            });
        }
    }

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
            const [currentStatus] = await connection.execute(queries.getRegistrationBySession, [registrationId]);
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

    // Get dashboard summary (for admin)
    static async getDashboardSummary(req, res) {
        try {
            // Get counts of registrations by status
            const statusCountQuery = `
                SELECT 
                    registration_status,
                    COUNT(*) as count
                FROM user_registrations 
                GROUP BY registration_status
            `;

            const pendingDocumentsQuery = `
                SELECT COUNT(*) as count
                FROM document_verification_log 
                WHERE verification_status = 'pending'
            `;

            const pendingPoliceVerificationQuery = `
                SELECT COUNT(*) as count
                FROM background_reference_check 
                WHERE police_verification_status = 'pending'
            `;

            const pendingSalaryQuery = `
                SELECT COUNT(*) as count
                FROM salary_expectations 
                WHERE salary_status = 0
            `;

            const [statusCounts] = await db.execute(statusCountQuery);
            const [pendingDocs] = await db.execute(pendingDocumentsQuery);
            const [pendingPolice] = await db.execute(pendingPoliceVerificationQuery);
            const [pendingSalary] = await db.execute(pendingSalaryQuery);

            const summary = {
                registrationsByStatus: {},
                pendingItems: {
                    documents: pendingDocs[0].count,
                    policeVerifications: pendingPolice[0].count,
                    salaryApprovals: pendingSalary[0].count
                },
                totalPending: pendingDocs[0].count + pendingPolice[0].count + pendingSalary[0].count
            };

            // Format status counts
            statusCounts.forEach(item => {
                summary.registrationsByStatus[item.registration_status] = item.count;
            });

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('Get dashboard summary error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch dashboard summary' }
            });
        }
    }

    // Bulk approve registrations (admin function)
    static async bulkApproveRegistrations(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { registrationIds, adminId, remarks } = req.body;

            if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'Invalid or empty registration IDs array' }
                });
            }

            const results = [];

            for (const registrationId of registrationIds) {
                try {
                    // Update registration status
                    await connection.execute(queries.updateRegistrationStatus, [
                        'approved', remarks, adminId, registrationId
                    ]);

                    // Log status change
                    await connection.execute(queries.insertRegistrationStatusHistory, [
                        registrationId, 'submitted', 'approved', adminId, remarks || 'Bulk approval'
                    ]);

                    results.push({
                        registrationId,
                        status: 'success',
                        message: 'Approved successfully'
                    });

                } catch (error) {
                    results.push({
                        registrationId,
                        status: 'error',
                        message: error.message
                    });
                }
            }

            await connection.commit();

            const successCount = results.filter(r => r.status === 'success').length;
            const errorCount = results.filter(r => r.status === 'error').length;

            res.json({
                success: true,
                message: `Bulk approval completed: ${successCount} successful, ${errorCount} failed`,
                data: {
                    totalProcessed: registrationIds.length,
                    successful: successCount,
                    failed: errorCount,
                    results
                }
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Bulk approve registrations error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to process bulk approvals' }
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    static async getBasicUserDetailsByMobile(req, res) {
  const mobileNumber = req.params.mobile_number;  // 👈 match route param
  console.log("📱 Received mobile number:", mobileNumber);

  try {
    const [rows] = await db.query(queries.GET_BASIC_USER_DETAILS_BY_MOBILE, [mobileNumber]);
    console.log("🧾 Query result:", rows);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const data = rows[0];

    // Handle null values gracefully
    data.service_name = data.service_name || '';
    data.years_of_experience = data.years_of_experience || 0;

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error fetching basic user details:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
}

module.exports = RegistrationController;