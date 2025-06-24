// Main Application Initialization
// This file coordinates all modules and initializes the app

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Load app data and initialize current event
  loadData();
  
  // Initialize navigation system
  initializeNavigation();
  
  // Setup keyboard handlers
  setupEnterKeyHandlers();
  
  // Show initial page
  showPage(currentPage);
  
  // Initialize all modules
  initializeEventSetup();
  initializeParticipants();
  
  // Setup button event listeners
  setupButtonEventListeners();
  
  // Update navigation state
  updateNavigation();
});

// Module initialization functions
function initializeEventSetup() {
  // Event setup module is loaded - render setup pages if we have data
  if (eventData) {
    renderAidStationsSetup();
    renderCoursesSetup();
  }
}

function initializeParticipants() {
  // Participants module is loaded - render participants if we have data
  if (eventData) {
    renderParticipantsSetup();
  }
}

// Refresh all setup pages (called after import/event switch)
function refreshAllSetupPages() {
  // Load event data into forms
  loadEventDataIntoForms();
  
  // Re-render all setup pages
  renderAidStationsSetup();
  renderCoursesSetup();
  renderParticipantsSetup();
  
  // Update navigation
  updateNavigation();
}

// Setup button event listeners
function setupButtonEventListeners() {
  // Event setup buttons
  const saveEventBtn = document.getElementById('save-event-btn');
  if (saveEventBtn) {
    saveEventBtn.addEventListener('click', saveEventDetails);
  }
  
  // Aid stations buttons
  const addStationBtn = document.getElementById('add-station-btn');
  const saveStationsBtn = document.getElementById('save-stations-btn');
  
  if (addStationBtn) {
    addStationBtn.addEventListener('click', addAidStation);
  }
  if (saveStationsBtn) {
    saveStationsBtn.addEventListener('click', saveAidStations);
  }
  
  // Courses buttons
  const addCourseBtn = document.getElementById('add-course-btn');
  const saveCoursesBtn = document.getElementById('save-courses-btn');
  
  if (addCourseBtn) {
    addCourseBtn.addEventListener('click', addCourse);
  }
  if (saveCoursesBtn) {
    saveCoursesBtn.addEventListener('click', saveCourses);
  }
  
  // Participants buttons
  const addParticipantBtn = document.getElementById('add-participant-btn');
  const bulkAddBtn = document.getElementById('bulk-add-btn');
  const saveParticipantsBtn = document.getElementById('save-participants-btn');
  
  if (addParticipantBtn) {
    addParticipantBtn.addEventListener('click', addParticipant);
  }
  if (bulkAddBtn) {
    bulkAddBtn.addEventListener('click', bulkAddParticipants);
  }
  if (saveParticipantsBtn) {
    saveParticipantsBtn.addEventListener('click', saveParticipants);
  }
  
  // Navigation buttons (for data-page attributes)
  document.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      showPage(page);
    });
  });
} 