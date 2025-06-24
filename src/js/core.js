// Multi-event data structure
let appData = {
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
    event: {
      name: '',
      date: '',
      location: '',
      description: ''
    },
    aidStations: [
      { id: 'start', name: 'Start', isDefault: true },
      { id: 'finish', name: 'Finish', isDefault: true },
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

// Export current event
function exportEvent() {
  if (!eventData) {
    alert('No event to export');
    return;
  }
  
  const exportData = {
    ...eventData,
    exportedAt: new Date().toISOString(),
    version: '1.0'
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

// Load app data from localStorage
function loadAppData() {
  try {
    const saved = localStorage.getItem('raceTrackerAppData');
    if (saved) {
      const parsed = JSON.parse(saved);
      appData = { ...appData, ...parsed };
    }
  } catch (error) {
    console.error('Error loading app data:', error);
    // Reset to default if corrupted
    appData = {
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

function loadData() {
  loadAppData();
  
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
      // Create new event if none exist
      createNewEvent();
    }
  }
}

// Clear all data (for development/testing)
function clearAllAppData() {
  if (confirm('Are you sure you want to clear all data? This will delete ALL events and cannot be undone.')) {
    localStorage.removeItem('raceTrackerAppData');
    appData = {
      currentEventId: null,
      events: {}
    };
    createNewEvent();
    alert('All data cleared. New event created.');
  }
} 