// Current page state
let currentPage = 'event-setup';

// Page Navigation
function showPage(pageId) {
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
  
  // Special handling for participants setup page
  if (pageId === 'participants-setup') {
    if (window.renderParticipantsSetup) {
      renderParticipantsSetup();
    }
  }
  
  // Load existing event data into forms when showing event setup
  if (pageId === 'event-setup' && eventData) {
    loadEventDataIntoForms();
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
  
  // Find the button for current page and mark as active
  const currentBtn = document.querySelector(`[onclick="showPage('${currentPage}')"]`);
  if (currentBtn) {
    currentBtn.classList.add('active');
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

// Initialize navigation system
function initializeNavigation() {
  // Navigation event listeners
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const pageAttr = btn.getAttribute('onclick');
    if (pageAttr && pageAttr.includes('showPage')) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const match = pageAttr.match(/showPage\('(.+?)'\)/);
        if (match) {
          const page = match[1];
          
          // Validate prerequisites
          if (page === 'race-tracker' && (!eventData || !eventData.courses.length || !eventData.participants.length)) {
            alert('Please complete Event Setup, Aid Stations, Courses, and Participants configuration first.');
            return;
          }
          
          showPage(page);
        }
      });
    }
  });
  
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