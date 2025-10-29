// queries/dropdown_queries.js

// Get all active preferred locations
const getPreferredLocations = `
  SELECT location_id, location_name
  FROM preferred_locations
  WHERE status = 'Active'
  ORDER BY location_name;
`;

// Get all active states
const getAllStates = `
  SELECT state_id, state_name, state_code
  FROM states
  WHERE status = 'Active'
  ORDER BY state_name;
`;

// Get cities/districts by state
const getCitiesByState = `
  SELECT city_id, city_name, is_district
  FROM cities
  WHERE state_id = ? AND status = 'Active'
  ORDER BY city_name;
`;

// Get districts only by state
const getDistrictsByState = `
  SELECT city_id, city_name
  FROM cities
  WHERE state_id = ? AND status = 'Active' AND is_district = TRUE
  ORDER BY city_name;
`;

// Get all cities by state (including non-districts)
const getAllCitiesByState = `
  SELECT city_id, city_name, is_district
  FROM cities
  WHERE state_id = ? AND status = 'Active'
  ORDER BY is_district DESC, city_name;
`;

// Get all active service types
const getServiceTypes = `
 SELECT service_id, name as service_name,description as service_description
FROM service_types
WHERE is_active = '1'
ORDER BY service_id;
`;

// Get all active work types
const getWorkTypes = `
  SELECT work_type_id, work_type_name, work_type_description
  FROM work_types
  WHERE status = 'Active'
  ORDER BY work_type_name;
`;

// Get all active genders
const getGenders = `
  SELECT gender_id, gender_name
  FROM genders
  WHERE status = 'Active'
  ORDER BY gender_name;
`;

// Get all active nationalities
const getNationalities = `
  SELECT nationality_id, nationality_name
  FROM nationalities
  WHERE status = 'Active'
  ORDER BY nationality_name;
`;

// Get all active ID proof types
const getIdProofTypes = `
  SELECT id_proof_type_id, proof_type_name
  FROM id_proof_types
  WHERE status = 'Active'
  ORDER BY proof_type_name;
`;

// Get all active available days
const getAvailableDays = `
  SELECT day_id, day_name
  FROM available_days
  WHERE status = 'Active'
  ORDER BY FIELD(day_name, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
`;

// Get all active time slots
const getTimeSlots = `
  SELECT slot_id, slot_name, start_time, end_time
  FROM time_slots
  WHERE status = 'Active'
  ORDER BY start_time;
`;

// Get all active relationship types
const getRelationshipTypes = `
  SELECT relationship_id, relationship_name
  FROM relationship_types
  WHERE status = 'Active'
  ORDER BY relationship_name;
`;

const getInterviewStatus = `
    SELECT id, status_name AS label 
    FROM interview_status_options
    ORDER BY id ASC
  `;

const   getPfToggle = `
    SELECT id, option_name AS label 
    FROM pf_toggle_options
    ORDER BY id ASC
  `;

module.exports = {
  getPreferredLocations,
  getAllStates,
  getCitiesByState,
  getDistrictsByState,
  getAllCitiesByState,
  getServiceTypes,
  getWorkTypes,
  getGenders,
  getNationalities,
  getIdProofTypes,
  getAvailableDays,
  getTimeSlots,
  getRelationshipTypes,
  getInterviewStatus,
  getPfToggle
};