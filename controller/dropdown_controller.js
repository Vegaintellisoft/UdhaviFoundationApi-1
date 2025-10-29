// controller/dropdown_controller.js
const db = require('../db');
const queries = require('../queries/dropdown_queries');

class DropdownController {
    // Get all dropdown data at once
    static getAllDropdownData(req, res) {
        try {
            const dropdownPromises = [
                new Promise((resolve, reject) => {
                    db.query(queries.getGenders, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'genders', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getNationalities, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'nationalities', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getIdProofTypes, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'idProofTypes', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getAllStates, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'states', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getPreferredLocations, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'preferredLocations', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getServiceTypes, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'serviceTypes', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getWorkTypes, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'workTypes', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getAvailableDays, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'availableDays', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getTimeSlots, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'timeSlots', data: results });
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queries.getRelationshipTypes, (err, results) => {
                        if (err) reject(err);
                        else resolve({ key: 'relationshipTypes', data: results });
                    });
                })
            ];

            Promise.all(dropdownPromises)
                .then(results => {
                    const dropdownData = {};
                    results.forEach(result => {
                        dropdownData[result.key] = result.data;
                    });

                    res.json({
                        success: true,
                        data: dropdownData
                    });
                })
                .catch(error => {
                    console.error('Error fetching all dropdown data:', error);
                    res.status(500).json({
                        success: false,
                        error: { message: 'Failed to fetch dropdown data' }
                    });
                });
        } catch (error) {
            console.error('Get all dropdown data error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch dropdown data' }
            });
        }
    }

    // Get preferred locations
    static getPreferredLocations(req, res) {
        db.query(queries.getPreferredLocations, (err, results) => {
            if (err) {
                console.error('Error fetching preferred locations:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch preferred locations' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get all states
    static getAllStates(req, res) {
        db.query(queries.getAllStates, (err, results) => {
            if (err) {
                console.error('Error fetching states:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch states' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get cities by state
    static getCitiesByState(req, res) {
        const { stateId } = req.params;
        
        if (!stateId) {
            return res.status(400).json({
                success: false,
                error: { message: 'State ID is required' }
            });
        }

        db.query(queries.getCitiesByState, [stateId], (err, results) => {
            if (err) {
                console.error('Error fetching cities:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch cities' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get districts by state
    static getDistrictsByState(req, res) {
        const { stateId } = req.params;
        
        if (!stateId) {
            return res.status(400).json({
                success: false,
                error: { message: 'State ID is required' }
            });
        }

        db.query(queries.getDistrictsByState, [stateId], (err, results) => {
            if (err) {
                console.error('Error fetching districts:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch districts' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get all cities by state (including non-districts)
    static getAllCitiesByState(req, res) {
        const { stateId } = req.params;
        
        if (!stateId) {
            return res.status(400).json({
                success: false,
                error: { message: 'State ID is required' }
            });
        }

        db.query(queries.getAllCitiesByState, [stateId], (err, results) => {
            if (err) {
                console.error('Error fetching all cities:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch all cities' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get service types
    static getServiceTypes(req, res) {
        db.query(queries.getServiceTypes, (err, results) => {
            if (err) {
                console.error('Error fetching service types:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch service types' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get work types
    static getWorkTypes(req, res) {
        db.query(queries.getWorkTypes, (err, results) => {
            if (err) {
                console.error('Error fetching work types:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch work types' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get genders
    static getGenders(req, res) {
        db.query(queries.getGenders, (err, results) => {
            if (err) {
                console.error('Error fetching genders:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch genders' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get nationalities
    static getNationalities(req, res) {
        db.query(queries.getNationalities, (err, results) => {
            if (err) {
                console.error('Error fetching nationalities:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch nationalities' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get ID proof types
    static getIdProofTypes(req, res) {
        db.query(queries.getIdProofTypes, (err, results) => {
            if (err) {
                console.error('Error fetching ID proof types:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch ID proof types' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get available days
    static getAvailableDays(req, res) {
        db.query(queries.getAvailableDays, (err, results) => {
            if (err) {
                console.error('Error fetching available days:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch available days' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get time slots
    static getTimeSlots(req, res) {
        db.query(queries.getTimeSlots, (err, results) => {
            if (err) {
                console.error('Error fetching time slots:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch time slots' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

    // Get relationship types
    static getRelationshipTypes(req, res) {
        db.query(queries.getRelationshipTypes, (err, results) => {
            if (err) {
                console.error('Error fetching relationship types:', err);
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to fetch relationship types' }
                });
            }
            res.json({
                success: true,
                data: results
            });
        });
    }

// ---- Get Interview Status Dropdown ----
static getInterviewStatus(req, res) {
  db.query(queries.getInterviewStatus, (err, results) => {
    if (err) {
      console.error('Error fetching interview status:', err);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch interview status dropdown' }
      });
    }
    res.json({
      success: true,
      message: 'Interview status dropdown fetched successfully',
      data: results
    });
  });
}

// ---- Get PF Toggle Dropdown ----
static getPfToggle(req, res) {
  db.query(queries.getPfToggle, (err, results) => {
    if (err) {
      console.error('Error fetching PF toggle:', err);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch PF toggle dropdown' }
      });
    }
    res.json({
      success: true,
      message: 'PF toggle dropdown fetched successfully',
      data: results
    });
  });
}
}
// Get cities by state ID
// const getCitiesByState = async (req, res) => {
//     console.log('🏙️ Getting cities for state:', req.params.stateId);
    
//     try {
//         const { stateId } = req.params;
        
//         if (!stateId || isNaN(stateId)) {
//             return res.status(400).json({
//                 success: false,
//                 error: { message: 'Valid state ID is required' }
//             });
//         }
        
//         const cities = await queryAsync(queries.getCitiesByState, [parseInt(stateId)]);
        
//         console.log(`✅ Found ${cities.length} cities for state ${stateId}`);
        
//         res.json({
//             success: true,
//             data: cities
//         });
        
//     } catch (error) {
//         console.error('❌ Error fetching cities:', error);
//         res.status(500).json({
//             success: false,
//             error: { message: 'Failed to fetch cities' }
//         });
//     }
// };

// Get districts by state ID
const getDistrictsByState = async (req, res) => {
    console.log('🏘️ Getting districts for state:', req.params.stateId);
    
    try {
        const { stateId } = req.params;
        
        if (!stateId || isNaN(stateId)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Valid state ID is required' }
            });
        }
        
        const districts = await queryAsync(queries.getDistrictsByState, [parseInt(stateId)]);
        
        console.log(`✅ Found ${districts.length} districts for state ${stateId}`);
        
        res.json({
            success: true,
            data: districts
        });
        
    } catch (error) {
        console.error('❌ Error fetching districts:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch districts' }
        });
    }
};

const getCitiesByState = async (req, res) => {
    console.log('🏙️ Getting cities for state:', req.params.stateId);
    
    try {
        const { stateId } = req.params;
        
        if (!stateId || isNaN(stateId)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Valid state ID is required' }
            });
        }
        
        const db = require('../db');
        const { promisify } = require('util');
        const queryAsync = promisify(db.query).bind(db);
        
        const cities = await queryAsync(
            'SELECT city_id, city_name FROM cities WHERE state_id = ? AND status = "Active" ORDER BY city_name',
            [parseInt(stateId)]
        );
        
        console.log(`✅ Found ${cities.length} cities for state ${stateId}`);
        
        res.json({
            success: true,
            data: cities
        });
        
    } catch (error) {
        console.error('❌ Error fetching cities:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch cities' }
        });
    }

    
};

module.exports = DropdownController;