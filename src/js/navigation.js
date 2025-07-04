// Current page state
let currentPage = 'race-tracker';

// Get current page
function getCurrentPage() {
  return currentPage;
}

// Page Navigation
function showPage(pageId, updateUrl = true) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  currentPage = pageId;
  
  // Update URL without reloading page
  if (updateUrl && window.history) {
    const url = new URL(window.location);
    url.searchParams.set('page', pageId);
    window.history.pushState({ page: pageId }, '', url);
  }
  
  updateNavigation();
  
  // Special handling for race tracker page
  if (pageId === 'race-tracker') {
    if (!eventData || eventData.courses.length === 0) {
      alert('Please configure at least one course before accessing the race tracker.');
      showPage('courses-setup');
      return;
    }
    if (eventData.participants.length === 0) {
      alert('Please add participants before accessing the race tracker.');
      showPage('participants-setup');
      return;
    }
    if (window.renderRaceTracker) {
      renderRaceTracker();
      updateRaceTrackerHeader();
    }
  }
  
  // Special handling for activity log page
  if (pageId === 'activity-log') {
    if (window.renderActivityLogManagement) {
      renderActivityLogManagement();
    }
  }
  
  // Special handling for participants setup page
  if (pageId === 'participants-setup') {
    if (window.renderParticipantsSetup) {
      renderParticipantsSetup();
    }
  }
  
  // Special handling for events list page
  if (pageId === 'events-list') {
    if (window.renderEventsListPage) {
      renderEventsListPage();
    }
  }
  
  // Special handling for display mode page
  if (pageId === 'display-mode') {
    if (window.startDisplayMode) {
      startDisplayMode();
    }
  } else {
    // Stop display mode when leaving the page
    if (window.stopDisplayMode) {
      stopDisplayMode();
    }
  }
  
  // Load existing event data into forms when showing event setup
  if (pageId === 'event-setup') {
    if (eventData) {
      loadEventDataIntoForms();
    }
    // Setup auto-save functionality
    if (window.setupEventDetailsAutoSave) {
      setupEventDetailsAutoSave();
    }
  }
  
  // Re-render setup pages to show current event data
  if (pageId === 'aid-stations-setup' && window.renderAidStationsSetup) {
    renderAidStationsSetup();
  }
  
  if (pageId === 'courses-setup' && window.renderCoursesSetup) {
    renderCoursesSetup();
  }
}

// Update navigation button states
function updateNavigation() {
  // Update nav button states
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Update dropdown item states
  document.querySelectorAll('.dropdown-item').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Find the button for current page and mark as active
  const currentBtn = document.querySelector(`[data-page="${currentPage}"]`);
  if (currentBtn) {
    currentBtn.classList.add('active');
    
    // If it's a dropdown item, also highlight the dropdown toggle
    if (currentBtn.classList.contains('dropdown-item')) {
      const settingsToggle = document.getElementById('settings-toggle');
      if (settingsToggle) {
        settingsToggle.classList.add('active');
      }
    }
  }
  
  // Enable/disable race tracker based on setup completion
  const trackerBtn = document.getElementById('tracker-nav');
  if (trackerBtn && eventData) {
    if (eventData.courses.length === 0 || eventData.participants.length === 0) {
      trackerBtn.style.opacity = '0.5';
      trackerBtn.title = 'Complete setup: courses and participants required';
    } else {
      trackerBtn.style.opacity = '1';
      trackerBtn.title = '';
    }
  }
  
  // Update page title with current event name
  updatePageTitle();
}

// Update page title and event info
function updatePageTitle() {
  const navBrand = document.querySelector('.nav-brand');
  if (navBrand && eventData && eventData.event.name) {
    navBrand.textContent = `Race Tracker - ${eventData.event.name}`;
  } else if (navBrand) {
    navBrand.textContent = 'Race Tracker';
  }
}

// Load event data into forms
function loadEventDataIntoForms() {
  if (!eventData) return;
  
  const eventNameEl = document.getElementById('event-name');
  const eventDateEl = document.getElementById('event-date');
  const eventLocationEl = document.getElementById('event-location');
  const eventDescriptionEl = document.getElementById('event-description');
  
  if (eventNameEl) eventNameEl.value = eventData.event.name || '';
  if (eventDateEl) eventDateEl.value = eventData.event.date || '';
  if (eventLocationEl) eventLocationEl.value = eventData.event.location || '';
  if (eventDescriptionEl) eventDescriptionEl.value = eventData.event.description || '';
}

// Get initial page from URL or determine default
function getInitialPage() {
  // Check URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const urlPage = urlParams.get('page');
  
  if (urlPage) {
    return urlPage;
  }
  
  // Default logic: race tracker if setup is complete, otherwise event setup
  if (!eventData || !eventData.event || !eventData.event.name) {
    return 'event-setup';
  }
  
  if (!eventData.courses || eventData.courses.length === 0) {
    return 'event-setup';
  }
  
  if (!eventData.participants || eventData.participants.length === 0) {
    return 'participants-setup';
  }
  
  return 'race-tracker';
}

// Handle browser back/forward buttons
function handlePopState(event) {
  if (event.state && event.state.page) {
    showPage(event.state.page, false);
  } else {
    // Fallback to URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlPage = urlParams.get('page');
    if (urlPage) {
      showPage(urlPage, false);
    }
  }
}

// Initialize navigation system
function initializeNavigation() {
  // Set up browser back/forward handling
  window.addEventListener('popstate', handlePopState);
  
  // Set initial page based on URL or default logic
  currentPage = getInitialPage();
  // Navigation event listeners for nav buttons
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      
      // Validate prerequisites
      if (page === 'race-tracker' && (!eventData || !eventData.courses.length || !eventData.participants.length)) {
        alert('Please complete Event Setup, Aid Stations, Courses, and Participants configuration first.');
        return;
      }
      
      showPage(page);
    });
  });
  
  // Navigation event listeners for dropdown items
  document.querySelectorAll('.dropdown-item[data-page]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      
      // Close dropdown
      document.getElementById('settings-dropdown').classList.remove('show');
      
      showPage(page);
    });
  });
  
  // Navigation event listener for nav-brand
  const navBrand = document.querySelector('.nav-brand[data-page]');
  if (navBrand) {
    navBrand.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      showPage(page);
    });
  }
  
  // Settings dropdown toggle
  const settingsToggle = document.getElementById('settings-toggle');
  if (settingsToggle) {
    settingsToggle.addEventListener('click', function(e) {
      e.preventDefault();
      const dropdown = document.getElementById('settings-dropdown');
      if (dropdown) {
        dropdown.classList.toggle('show');
      }
    });
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.matches('#settings-toggle') && !e.target.closest('#settings-dropdown')) {
      const dropdown = document.getElementById('settings-dropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    }
  });
  
  // Settings menu actions
  const newEventBtn = document.getElementById('new-event-btn');
  const exportEventBtn = document.getElementById('export-event-btn');
  const importEventBtn = document.getElementById('import-event-btn');
  const importFile = document.getElementById('import-file');
  
  if (newEventBtn) {
    newEventBtn.addEventListener('click', function() {
      document.getElementById('settings-dropdown').classList.remove('show');
      createNewEvent();
    });
  }
  
  if (exportEventBtn) {
    exportEventBtn.addEventListener('click', function() {
      document.getElementById('settings-dropdown').classList.remove('show');
      exportEvent();
    });
  }
  
  if (importEventBtn) {
    importEventBtn.addEventListener('click', function() {
      document.getElementById('settings-dropdown').classList.remove('show');
      if (importFile) {
        importFile.click();
      }
    });
  }
  
  if (importFile) {
    importFile.addEventListener('change', importEvent);
  }
}

// Update race tracker header
function updateRaceTrackerHeader() {
  const eventTitle = document.getElementById('event-title');
  if (eventTitle && eventData && eventData.event.name) {
    eventTitle.textContent = eventData.event.name;
  }
} 