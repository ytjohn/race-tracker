// Schema version for data validation
const CURRENT_SCHEMA_VERSION = "1.0";

// Multi-event data structure
let appData = {
  version: CURRENT_SCHEMA_VERSION,
  currentEventId: null,
  events: {}
};

// Current event data (reference to active event)
let eventData = null;

// Generate unique ID for events
function generateEventId() {
  return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create default event structure
function createDefaultEventData() {
  return {
    id: generateEventId(),
    version: CURRENT_SCHEMA_VERSION,
    event: {
      name: '',
      date: '',
      location: '',
      description: ''
    },
    aidStations: [
      { id: 'start', name: 'Start', isDefault: true },
      { id: 'dnf', name: 'DNF', isDefault: true },
      { id: 'dns', name: 'DNS', isDefault: true },
      { id: 'suspect', name: 'Suspect Data', isDefault: true }
    ],
    courses: [],
    participants: [],
    stationAssignments: {},
    activityLog: []
  };
}

// Validate app data schema version
function validateAppDataVersion(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Invalid data format' };
  }
  
  if (!data.version) {
    return { valid: false, reason: `No schema version found. This data appears to be from an older version of Race Tracker. Current version: ${CURRENT_SCHEMA_VERSION}` };
  }
  
  if (data.version !== CURRENT_SCHEMA_VERSION) {
    return { valid: false, reason: `Schema version mismatch. Found: ${data.version}, Expected: ${CURRENT_SCHEMA_VERSION}` };
  }
  
  return { valid: true };
}

// Validate event data schema version
function validateEventDataVersion(eventData) {
  if (!eventData || typeof eventData !== 'object') {
    return { valid: false, reason: 'Invalid event data format' };
  }
  
  if (!eventData.version) {
    return { valid: false, reason: `Event has no schema version. Current version: ${CURRENT_SCHEMA_VERSION}` };
  }
  
  if (eventData.version !== CURRENT_SCHEMA_VERSION) {
    return { valid: false, reason: `Event schema version mismatch. Found: ${eventData.version}, Expected: ${CURRENT_SCHEMA_VERSION}` };
  }
  
  return { valid: true };
}

// Migrate existing data to add version numbers
function migrateDataToCurrentVersion() {
  console.log('Checking for schema version migration...');
  
  let migrationPerformed = false;
  
  // Add version to appData if missing
  if (!appData.version) {
    appData.version = CURRENT_SCHEMA_VERSION;
    migrationPerformed = true;
    console.log('Added version to appData');
  }
  
  // Add version to all events if missing
  Object.values(appData.events).forEach(event => {
    if (!event.version) {
      event.version = CURRENT_SCHEMA_VERSION;
      migrationPerformed = true;
      console.log(`Added version to event: ${event.event?.name || event.id}`);
    }
  });
  
  if (migrationPerformed) {
    console.log('Schema version migration completed - saving data...');
    saveAppData();
    return true;
  }
  
  return false;
}

// Create new event
function createNewEvent() {
  const newEvent = createDefaultEventData();
  appData.events[newEvent.id] = newEvent;
  appData.currentEventId = newEvent.id;
  eventData = newEvent;
  
  saveAppData();
  
  // Reset to event setup page
  showPage('event-setup');
  
  // Clear any existing form data
  clearEventForms();
  
  alert('New event created! Please configure your event details.');
}

// Switch to existing event
function switchToEvent(eventId) {
  if (appData.events[eventId]) {
    appData.currentEventId = eventId;
    eventData = appData.events[eventId];
    saveAppData();
    
    // Refresh all setup pages to show new event data
    if (window.refreshAllSetupPages) {
      refreshAllSetupPages();
    }
    
    // Refresh current page to show new event data
    const currentPageId = document.querySelector('.page.active')?.id || 'event-setup';
    showPage(currentPageId);
    
    return true;
  }
  return false;
}

// Get list of all events
function getAllEvents() {
  return Object.values(appData.events).map(event => ({
    id: event.id,
    name: event.event.name || 'Unnamed Event',
    date: event.event.date || '',
    location: event.event.location || ''
  }));
}

// Delete event
function deleteEvent(eventId) {
  if (appData.events[eventId]) {
    delete appData.events[eventId];
    
    // If we deleted the current event, switch to another or create new
    if (appData.currentEventId === eventId) {
      const remainingEvents = Object.keys(appData.events);
      if (remainingEvents.length > 0) {
        switchToEvent(remainingEvents[0]);
      } else {
        createNewEvent();
      }
    }
    
    saveAppData();
    return true;
  }
  return false;
}

// Duplicate current event
function duplicateCurrentEvent() {
  if (!eventData) {
    alert('No event to duplicate');
    return;
  }
  
  // Create a deep copy of the current event
  const duplicatedEvent = JSON.parse(JSON.stringify(eventData));
  
  // Generate new ID
  const newId = generateEventId();
  duplicatedEvent.id = newId;
  
  // Update event name to indicate it's a copy
  const originalName = duplicatedEvent.event.name || 'Unnamed Event';
  duplicatedEvent.event.name = `${originalName} (Copy)`;
  
  // Clear race data but keep setup (stations, courses, participants)
  duplicatedEvent.stationAssignments = {};
  duplicatedEvent.activityLog = [];
  
  // Reset all participants to start station
  if (duplicatedEvent.participants.length > 0) {
    duplicatedEvent.stationAssignments['start'] = duplicatedEvent.participants.map(p => p.id);
  }
  
  // Add to events
  appData.events[newId] = duplicatedEvent;
  
  // Switch to duplicated event
  switchToEvent(newId);
  
  // Show event setup page to allow editing the duplicated event
  showPage('event-setup');
  
  alert(`Event duplicated successfully! You can now modify "${duplicatedEvent.event.name}".`);
  
  return newId;
}

// Export current event
function exportEvent() {
  if (!eventData) {
    alert('No event to export');
    return;
  }
  
  const exportData = {
    ...eventData,
    exportedAt: new Date().toISOString(),
    version: CURRENT_SCHEMA_VERSION
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `race-tracker-${eventData.event.name || 'event'}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import event
function importEvent(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      // Validate schema version first
      const validation = validateEventDataVersion(importedData);
      if (!validation.valid) {
        throw new Error(`Import failed: ${validation.reason}`);
      }
      
      // Validate imported data structure
      if (!importedData.event || !importedData.aidStations || !Array.isArray(importedData.courses)) {
        throw new Error('Invalid event data format');
      }
      
      // Generate new ID to avoid conflicts
      const newId = generateEventId();
      importedData.id = newId;
      
      // Add to events
      appData.events[newId] = importedData;
      
      // Switch to imported event
      switchToEvent(newId);
      
      // Refresh all setup pages to show imported data
      if (window.refreshAllSetupPages) {
        refreshAllSetupPages();
      }
      
      alert(`Event "${importedData.event.name || 'Imported Event'}" imported successfully!`);
      
    } catch (error) {
      alert('Error importing event: ' + error.message);
    }
  };
  
  reader.readAsText(file);
  
  // Clear the file input
  event.target.value = '';
}

// Clear event forms
function clearEventForms() {
  // Clear event setup form
  const eventNameEl = document.getElementById('event-name');
  const eventDateEl = document.getElementById('event-date');
  const eventLocationEl = document.getElementById('event-location');
  const eventDescriptionEl = document.getElementById('event-description');
  
  if (eventNameEl) eventNameEl.value = '';
  if (eventDateEl) eventDateEl.value = '';
  if (eventLocationEl) eventLocationEl.value = '';
  if (eventDescriptionEl) eventDescriptionEl.value = '';
  
  // Re-render all setup pages
  if (window.refreshAllSetupPages) {
    refreshAllSetupPages();
  }
}

// Save app data to localStorage
function saveAppData() {
  try {
    localStorage.setItem('raceTrackerAppData', JSON.stringify(appData));
  } catch (error) {
    console.error('Error saving app data:', error);
  }
}

// Embedded default data (fallback for CORS issues with file:// protocol)
const EMBEDDED_DEFAULT_DATA = {
  "version": "1.0",
  "event": {
    "name": "Lost Turkey Trail Races",
    "date": "2025-07-26",
    "location": "Imler, PA",
    "description": "Welcome to Central Pennsylvania's ridges and valleys! 50K point-to-point, Half-Marathon loop, and 10K Little Turkey races."
  },
  "aidStations": [
    { "id": "start", "name": "Start", "isDefault": true },
    { "id": "dnf", "name": "DNF", "isDefault": true },
    { "id": "dns", "name": "DNS", "isDefault": true },
    { "id": "skyline", "name": "Skyline Drive", "isDefault": false },
    { "id": "burnt-house", "name": "Burnt House", "isDefault": false },
    { "id": "lost-children", "name": "Lost Children", "isDefault": false },
    { "id": "hairpin", "name": "Hairpin", "isDefault": false }
  ],
  "courses": [
    {
      "id": "50k",
      "name": "50K",
      "stations": [
        { "stationId": "start", "distance": 0, "cumulative": 0, "cumulativeDistance": 0 },
        { "stationId": "skyline", "distance": 8.6, "cumulative": 8.6, "cumulativeDistance": 8.6 },
        { "stationId": "burnt-house", "distance": 8.3, "cumulative": 16.9, "cumulativeDistance": 16.9 },
        { "stationId": "lost-children", "distance": 6.6, "cumulative": 23.9, "cumulativeDistance": 23.9 },
        { "stationId": "hairpin", "distance": 3.5, "cumulative": 27, "cumulativeDistance": 27 }
      ],
      "totalDistance": 31
    },
    {
      "id": "half-marathon",
      "name": "Half-Marathon",
      "stations": [
        { "stationId": "start", "distance": 0, "cumulative": 0, "cumulativeDistance": 0 },
        { "stationId": "lost-children", "distance": 5.7, "cumulative": 5.7, "cumulativeDistance": 5.7 },
        { "stationId": "hairpin", "distance": 3.5, "cumulative": 9.2, "cumulativeDistance": 9.2 }
      ],
      "totalDistance": 13.2
    }
  ],
  "participants": [
    // 50K participants (100-150)
    { "id": "100", "name": "100", "type": "race", "active": true, "courseId": "50k" },
    { "id": "101", "name": "101", "type": "race", "active": true, "courseId": "50k" },
    { "id": "102", "name": "102", "type": "race", "active": true, "courseId": "50k" },
    { "id": "103", "name": "103", "type": "race", "active": true, "courseId": "50k" },
    { "id": "104", "name": "104", "type": "race", "active": true, "courseId": "50k" },
    { "id": "105", "name": "105", "type": "race", "active": true, "courseId": "50k" },
    { "id": "106", "name": "106", "type": "race", "active": true, "courseId": "50k" },
    { "id": "107", "name": "107", "type": "race", "active": true, "courseId": "50k" },
    { "id": "108", "name": "108", "type": "race", "active": true, "courseId": "50k" },
    { "id": "109", "name": "109", "type": "race", "active": true, "courseId": "50k" },
    { "id": "110", "name": "110", "type": "race", "active": true, "courseId": "50k" },
    { "id": "111", "name": "111", "type": "race", "active": true, "courseId": "50k" },
    { "id": "112", "name": "112", "type": "race", "active": true, "courseId": "50k" },
    { "id": "113", "name": "113", "type": "race", "active": true, "courseId": "50k" },
    { "id": "114", "name": "114", "type": "race", "active": true, "courseId": "50k" },
    { "id": "115", "name": "115", "type": "race", "active": true, "courseId": "50k" },
    { "id": "116", "name": "116", "type": "race", "active": true, "courseId": "50k" },
    { "id": "117", "name": "117", "type": "race", "active": true, "courseId": "50k" },
    { "id": "118", "name": "118", "type": "race", "active": true, "courseId": "50k" },
    { "id": "119", "name": "119", "type": "race", "active": true, "courseId": "50k" },
    { "id": "120", "name": "120", "type": "race", "active": true, "courseId": "50k" },
    { "id": "121", "name": "121", "type": "race", "active": true, "courseId": "50k" },
    { "id": "122", "name": "122", "type": "race", "active": true, "courseId": "50k" },
    { "id": "123", "name": "123", "type": "race", "active": true, "courseId": "50k" },
    { "id": "124", "name": "124", "type": "race", "active": true, "courseId": "50k" },
    { "id": "125", "name": "125", "type": "race", "active": true, "courseId": "50k" },
    { "id": "126", "name": "126", "type": "race", "active": true, "courseId": "50k" },
    { "id": "127", "name": "127", "type": "race", "active": true, "courseId": "50k" },
    { "id": "128", "name": "128", "type": "race", "active": true, "courseId": "50k" },
    { "id": "129", "name": "129", "type": "race", "active": true, "courseId": "50k" },
    { "id": "130", "name": "130", "type": "race", "active": true, "courseId": "50k" },
    { "id": "131", "name": "131", "type": "race", "active": true, "courseId": "50k" },
    { "id": "132", "name": "132", "type": "race", "active": true, "courseId": "50k" },
    { "id": "133", "name": "133", "type": "race", "active": true, "courseId": "50k" },
    { "id": "134", "name": "134", "type": "race", "active": true, "courseId": "50k" },
    { "id": "135", "name": "135", "type": "race", "active": true, "courseId": "50k" },
    { "id": "136", "name": "136", "type": "race", "active": true, "courseId": "50k" },
    { "id": "137", "name": "137", "type": "race", "active": true, "courseId": "50k" },
    { "id": "138", "name": "138", "type": "race", "active": true, "courseId": "50k" },
    { "id": "139", "name": "139", "type": "race", "active": true, "courseId": "50k" },
    { "id": "140", "name": "140", "type": "race", "active": true, "courseId": "50k" },
    { "id": "141", "name": "141", "type": "race", "active": true, "courseId": "50k" },
    { "id": "142", "name": "142", "type": "race", "active": true, "courseId": "50k" },
    { "id": "143", "name": "143", "type": "race", "active": true, "courseId": "50k" },
    { "id": "144", "name": "144", "type": "race", "active": true, "courseId": "50k" },
    { "id": "145", "name": "145", "type": "race", "active": true, "courseId": "50k" },
    { "id": "146", "name": "146", "type": "race", "active": true, "courseId": "50k" },
    { "id": "147", "name": "147", "type": "race", "active": true, "courseId": "50k" },
    { "id": "148", "name": "148", "type": "race", "active": true, "courseId": "50k" },
    { "id": "149", "name": "149", "type": "race", "active": true, "courseId": "50k" },
    { "id": "150", "name": "150", "type": "race", "active": true, "courseId": "50k" },
    // Half-Marathon participants (300-350)
    { "id": "300", "name": "300", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "301", "name": "301", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "302", "name": "302", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "303", "name": "303", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "304", "name": "304", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "305", "name": "305", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "306", "name": "306", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "307", "name": "307", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "308", "name": "308", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "309", "name": "309", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "310", "name": "310", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "311", "name": "311", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "312", "name": "312", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "313", "name": "313", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "314", "name": "314", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "315", "name": "315", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "316", "name": "316", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "317", "name": "317", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "318", "name": "318", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "319", "name": "319", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "320", "name": "320", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "321", "name": "321", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "322", "name": "322", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "323", "name": "323", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "324", "name": "324", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "325", "name": "325", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "326", "name": "326", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "327", "name": "327", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "328", "name": "328", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "329", "name": "329", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "330", "name": "330", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "331", "name": "331", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "332", "name": "332", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "333", "name": "333", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "334", "name": "334", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "335", "name": "335", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "336", "name": "336", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "337", "name": "337", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "338", "name": "338", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "339", "name": "339", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "340", "name": "340", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "341", "name": "341", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "342", "name": "342", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "343", "name": "343", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "344", "name": "344", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "345", "name": "345", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "346", "name": "346", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "347", "name": "347", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "348", "name": "348", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "349", "name": "349", "type": "race", "active": true, "courseId": "half-marathon" },
    { "id": "350", "name": "350", "type": "race", "active": true, "courseId": "half-marathon" }
  ],
  "stationAssignments": {
    "start": [
      "100", "101", "102", "103", "104", "105", "106", "107", "108", "109", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119", "120", "121", "122", "123", "124", "125", "126", "127", "128", "129", "130", "131", "132", "133", "134", "135", "136", "137", "138", "139", "140", "141", "142", "143", "144", "145", "146", "147", "148", "149", "150",
      "300", "301", "302", "303", "304", "305", "306", "307", "308", "309", "310", "311", "312", "313", "314", "315", "316", "317", "318", "319", "320", "321", "322", "323", "324", "325", "326", "327", "328", "329", "330", "331", "332", "333", "334", "335", "336", "337", "338", "339", "340", "341", "342", "343", "344", "345", "346", "347", "348", "349", "350"
    ]
  },
  "activityLog": []
};

// Load default event data from JSON file (with embedded fallback)
async function loadDefaultEventData() {
  console.log('Attempting to load default LTTR data...');
  
  // First try to fetch from file (works when served via HTTP)
  try {
    console.log('Fetching data/default-lttr-tracker.json...');
    const response = await fetch('data/default-lttr-tracker.json');
    console.log('Fetch response:', response.status, response.statusText);
    
    if (response.ok) {
      console.log('Parsing JSON data from file...');
      const defaultData = await response.json();
      console.log('Default data loaded from file:', defaultData.event?.name);
      
      return loadDefaultEventDataFromObject(defaultData);
    } else {
      console.warn('Failed to fetch default event data from file:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('Error loading default event data from file (likely CORS):', error.message);
  }
  
  // Fallback to embedded data (works with file:// protocol)
  console.log('Using embedded default data...');
  return loadDefaultEventDataFromObject(EMBEDDED_DEFAULT_DATA);
}

// Helper function to process default data from either source
function loadDefaultEventDataFromObject(defaultData) {
  try {
    // Validate the default data schema version
    console.log('Validating schema version...');
    const validation = validateEventDataVersion(defaultData);
    if (!validation.valid) {
      console.error('Default data validation failed:', validation.reason);
      return false;
    }
    console.log('Schema validation passed');
    
    // Generate new ID to avoid conflicts
    const newId = generateEventId();
    defaultData.id = newId;
    console.log('Generated new event ID:', newId);
    
    // Add to events
    appData.events[newId] = defaultData;
    appData.currentEventId = newId;
    eventData = defaultData;
    
    saveAppData();
    
    console.log('Default event data loaded successfully:', defaultData.event?.name);
    return true;
  } catch (error) {
    console.error('Error processing default event data:', error);
    return false;
  }
}

// Load app data from localStorage
function loadAppData() {
  try {
    const saved = localStorage.getItem('raceTrackerAppData');
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Validate schema version
      const validation = validateAppDataVersion(parsed);
      if (!validation.valid) {
        console.error('Schema validation failed:', validation.reason);
        alert(`Cannot load data: ${validation.reason}\n\nYour browser data will be reset to start fresh with the current version.`);
        
        // Reset to default if invalid version
        appData = {
          version: CURRENT_SCHEMA_VERSION,
          currentEventId: null,
          events: {}
        };
        saveAppData(); // Save the reset data
        return;
      }
      
      appData = { ...appData, ...parsed };
    }
  } catch (error) {
    console.error('Error loading app data:', error);
    // Reset to default if corrupted
    appData = {
      version: CURRENT_SCHEMA_VERSION,
      currentEventId: null,
      events: {}
    };
  }
}

// Legacy save/load functions for backward compatibility
function saveData() {
  if (eventData) {
    appData.events[eventData.id] = eventData;
    saveAppData();
  }
}

async function loadData() {
  loadAppData();
  
  // Run migrations for existing data
  migrateDataToCurrentVersion();
  migrateCourseDistanceFields();
  
  // Validate final state
  validateCurrentDataState();
  
  // Auto-load last used event or create new one
  if (appData.currentEventId && appData.events[appData.currentEventId]) {
    eventData = appData.events[appData.currentEventId];
  } else {
    // Check if we have any events
    const eventIds = Object.keys(appData.events);
    if (eventIds.length > 0) {
      // Load the first available event
      appData.currentEventId = eventIds[0];
      eventData = appData.events[eventIds[0]];
    } else {
      // Try to load default data first, then create new event if that fails
      const defaultLoaded = await loadDefaultEventData();
      if (!defaultLoaded) {
        createNewEvent();
      }
    }
  }
}

// Migrate existing events to add missing cumulativeDistance fields
function migrateCourseDistanceFields() {
  console.log('Checking for course distance field migration...');
  
  let migrationNeeded = false;
  
  Object.values(appData.events).forEach(event => {
    if (event.courses) {
      event.courses.forEach(course => {
        if (course.stations) {
          course.stations.forEach(station => {
            // If cumulative exists but cumulativeDistance doesn't, migrate
            if (station.cumulative !== undefined && station.cumulativeDistance === undefined) {
              station.cumulativeDistance = station.cumulative;
              migrationNeeded = true;
            }
          });
        }
      });
    }
  });
  
  if (migrationNeeded) {
    console.log('Course distance migration applied - saving data...');
    saveAppData();
    return true;
  }
  
  return false;
}

// Validate current application state
function validateCurrentDataState() {
  console.log('=== Schema Version 1.0 Validation ===');
  
  // Validate appData
  const appValidation = validateAppDataVersion(appData);
  console.log('AppData validation:', appValidation.valid ? 'PASS' : 'FAIL - ' + appValidation.reason);
  
  // Validate all events
  let eventValidationResults = [];
  Object.entries(appData.events).forEach(([eventId, event]) => {
    const eventValidation = validateEventDataVersion(event);
    eventValidationResults.push({
      eventId,
      name: event.event?.name || 'Unnamed',
      valid: eventValidation.valid,
      reason: eventValidation.reason
    });
    console.log(`Event "${event.event?.name || eventId}":`, eventValidation.valid ? 'PASS' : 'FAIL - ' + eventValidation.reason);
  });
  
  // Check course station consistency
  let courseStationIssues = [];
  Object.values(appData.events).forEach(event => {
    if (event.courses) {
      event.courses.forEach(course => {
        course.stations?.forEach((station, index) => {
          if (station.cumulative !== station.cumulativeDistance) {
            courseStationIssues.push({
              event: event.event?.name || event.id,
              course: course.name,
              station: index,
              cumulative: station.cumulative,
              cumulativeDistance: station.cumulativeDistance
            });
          }
        });
      });
    }
  });
  
  if (courseStationIssues.length > 0) {
    console.warn('Course station field inconsistencies found:', courseStationIssues);
  } else {
    console.log('Course station fields: CONSISTENT');
  }
  
  console.log('=== Validation Complete ===');
  
  return {
    appDataValid: appValidation.valid,
    events: eventValidationResults,
    courseStationIssues: courseStationIssues
  };
}

// Clear all data (for development/testing)
function clearAllAppData() {
  if (confirm('Are you sure you want to clear all data? This will delete ALL events and cannot be undone.')) {
    localStorage.removeItem('raceTrackerAppData');
    appData = {
      version: CURRENT_SCHEMA_VERSION,
      currentEventId: null,
      events: {}
    };
    createNewEvent();
    alert('All data cleared. New event created.');
  }
}

// Make validation functions globally accessible for debugging
window.validateCurrentDataState = validateCurrentDataState;
window.validateAppDataVersion = validateAppDataVersion;
window.validateEventDataVersion = validateEventDataVersion; 