// utils/uploadUtil.js - UPDATED VERSION
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const uploadDirs = [
    './uploads/profiles',
    './uploads/documents', 
    './uploads/services',
    './uploads/police-verification',
    './uploads/bank-documents'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Basic storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = './uploads/documents'; // Default
        
        // Determine upload path based on fieldname
        switch (file.fieldname) {
            case 'profile_photo':
                uploadPath = './uploads/profiles';
                break;
            case 'service_image':
                uploadPath = './uploads/services';
                break;
            case 'police_verification_document':
                uploadPath = './uploads/police-verification';
                break;
            case 'cancelled_cheque_passbook':
                uploadPath = './uploads/bank-documents';
                break;
            default:
                uploadPath = './uploads/documents';
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Basic file filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and documents are allowed'));
    }
};

// Create upload configurations
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: fileFilter
});

// Upload configurations for different scenarios
const uploadConfigs = {
    // For multiple documents (Step 1 - Personal Info)
    multipleDocuments: upload.fields([
        { name: 'profile_photo', maxCount: 1 },
        { name: 'id_proof_document', maxCount: 1 },
        { name: 'resume_bio_data', maxCount: 1 },
        { name: 'driving_license', maxCount: 1 },
        { name: 'experience_certificates', maxCount: 1 },
        { name: 'additional_documents', maxCount: 5 }
    ]),
    
    // For single service image (Step 3)
    serviceImage: upload.single('service_image'),
    
    // For police verification document (Step 4)
    policeVerification: upload.single('police_verification_document'),
    
    // For bank document (Step 6)
    bankDocument: upload.single('cancelled_cheque_passbook'),

  singleDocument: (fieldName) => upload.single(fieldName)

};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: { message: 'File size too large. Maximum size is 10MB.' }
            });
        }
        return res.status(400).json({
            success: false,
            error: { message: 'File upload error: ' + error.message }
        });
    } else if (error) {
        return res.status(400).json({
            success: false,
            error: { message: error.message }
        });
    }
    next();
};

module.exports = {
    uploadConfigs,
    handleUploadError
};
