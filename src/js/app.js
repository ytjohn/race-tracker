// Data structure for the race tracker
let eventData = {
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
  stationAssignments: {}, // station_id: [participant_ids]
  activityLog: []
};

// Current page state
let currentPage = 'event-setup';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  loadData();
  updateNavigation();
  
  // Load existing event data into forms
  if (eventData.event.name) {
    const eventNameEl = document.getElementById('event-name');
    const eventDateEl = document.getElementById('event-date');
    const eventLocationEl = document.getElementById('event-location');
    const eventDescriptionEl = document.getElementById('event-description');
    
    if (eventNameEl) eventNameEl.value = eventData.event.name;
    if (eventDateEl) eventDateEl.value = eventData.event.date;
    if (eventLocationEl) eventLocationEl.value = eventData.event.location;
    if (eventDescriptionEl) eventDescriptionEl.value = eventData.event.description;
  }
  
  renderAidStationsSetup();
  renderCoursesSetup();
  renderParticipantsSetup();
  
  // Add Enter key handlers
  setupEnterKeyHandlers();
  
  // Only render race tracker if we have courses configured
  if (eventData.courses.length > 0) {
    renderRaceTracker();
  }
});

// Setup Enter key handlers for inputs
function setupEnterKeyHandlers() {
  // Aid station input
  const stationInput = document.getElementById('new-station-name');
  if (stationInput) {
    stationInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addAidStation();
      }
    });
  }
  
  // Course input
  const courseInput = document.getElementById('new-course-name');
  if (courseInput) {
    courseInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCourse();
      }
    });
  }
}

// Helper function to find participant's course
function getParticipantCourse(participantId) {
  const participant = eventData.participants.find(p => p.id === participantId);
  return participant ? participant.courseId : null;
}

// Helper function to check if a station belongs to a course
function isStationInCourse(stationId, courseId) {
  if (stationId === 'dnf' || stationId === 'dns' || stationId === 'suspect') {
    return true; // Status stations are available to all courses
  }
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return false;
  
  return course.stations.some(cs => cs.stationId === stationId);
}

// Helper function to assign participant to course
function assignParticipantToCourse(participantId, courseId) {
  let participant = eventData.participants.find(p => p.id === participantId);
  if (!participant) {
    participant = { 
      id: participantId, 
      name: participantId, 
      type: 'race', 
      active: true, 
      courseId: courseId 
    };
    eventData.participants.push(participant);
  } else {
    participant.courseId = courseId;
  }
  return participant;
}

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
    if (eventData.courses.length === 0) {
      alert('Please configure at least one course before accessing the race tracker.');
      showPage('courses-setup');
      return;
    }
    if (eventData.participants.length === 0) {
      alert('Please add participants before accessing the race tracker.');
      showPage('participants-setup');
      return;
    }
    renderRaceTracker();
    updateRaceTrackerHeader();
  }
  
  // Special handling for participants setup page
  if (pageId === 'participants-setup') {
    renderParticipantsSetup();
  }
}

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
  if (trackerBtn) {
    if (eventData.courses.length === 0 || eventData.participants.length === 0) {
      trackerBtn.style.opacity = '0.5';
      trackerBtn.title = 'Complete setup: courses and participants required';
    } else {
      trackerBtn.style.opacity = '1';
      trackerBtn.title = '';
    }
  }
}

// Event Setup Functions
function saveEventDetails() {
  const eventNameEl = document.getElementById('event-name');
  const eventDateEl = document.getElementById('event-date');
  const eventLocationEl = document.getElementById('event-location');
  const eventDescriptionEl = document.getElementById('event-description');
  
  eventData.event = {
    name: eventNameEl ? eventNameEl.value : '',
    date: eventDateEl ? eventDateEl.value : '',
    location: eventLocationEl ? eventLocationEl.value : '',
    description: eventDescriptionEl ? eventDescriptionEl.value : ''
  };
  
  saveData();
  
  // Update race tracker title
  const eventTitle = document.getElementById('event-title');
  if (eventTitle && eventData.event.name) {
    eventTitle.textContent = eventData.event.name;
  }
  
  alert('Event details saved successfully!');
}

// Aid Stations Setup Functions
function renderAidStationsSetup() {
  const customStationsList = document.getElementById('custom-stations-list');
  if (!customStationsList) return;
  
  const customStations = eventData.aidStations.filter(station => !station.isDefault);
  
  customStationsList.innerHTML = customStations.map(station => `
    <div class="station-item">
      ${station.name}
      <button class="remove-btn" onclick="removeAidStation('${station.id}')">×</button>
    </div>
  `).join('');
}

function addAidStation() {
  const nameInput = document.getElementById('new-station-name');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  
  if (!name) {
    alert('Please enter a station name');
    return;
  }
  
  // Check for duplicates
  if (eventData.aidStations.some(station => station.name.toLowerCase() === name.toLowerCase())) {
    alert('A station with this name already exists');
    return;
  }
  
  const newStation = {
    id: 'station_' + Date.now(),
    name: name,
    isDefault: false
  };
  
  eventData.aidStations.push(newStation);
  nameInput.value = '';
  
  renderAidStationsSetup();
  renderCoursesSetup(); // Update course dropdowns
  saveData();
}

function removeAidStation(stationId) {
  if (confirm('Are you sure you want to remove this aid station?')) {
    eventData.aidStations = eventData.aidStations.filter(station => station.id !== stationId);
    
    // Remove from courses
    eventData.courses.forEach(course => {
      course.stations = course.stations.filter(cs => cs.stationId !== stationId);
    });
    
    renderAidStationsSetup();
    renderCoursesSetup();
    saveData();
  }
}

function saveAidStations() {
  saveData();
  alert('Aid stations saved successfully!');
}

// Courses Setup Functions
function renderCoursesSetup() {
  const coursesContainer = document.getElementById('courses-container');
  if (!coursesContainer) return;
  
  coursesContainer.innerHTML = eventData.courses.map(course => {
    // Check if course has Finish station
    const hasFinish = course.stations.some(cs => cs.stationId === 'finish');
    
    // Filter stations for dropdown - show DNF/DNS only after Finish is added
    const availableStations = eventData.aidStations.filter(station => {
      if (station.id === 'dnf' || station.id === 'dns') {
        return hasFinish; // Only show DNF/DNS if Finish is already in the course
      }
      return true;
    });
    
    return `
    <div class="course-item">
      <div class="course-header">
        <div class="course-name">${course.name}</div>
        <button class="remove-course-btn" onclick="removeCourse('${course.id}')">Remove</button>
      </div>
      
      <div class="course-stations">
        <h4>Aid Station Sequence</h4>
        <div class="station-sequence" id="sequence-${course.id}">
          ${course.stations.map((cs, index) => {
            const station = eventData.aidStations.find(s => s.id === cs.stationId);
            return `
              <div class="station-sequence-item">
                <div class="station-info">
                  <strong>${index + 1}. ${station ? station.name : 'Unknown'}</strong>
                  <div class="station-distance-edit">
                    <input type="number" 
                           class="distance-input-inline" 
                           value="${cs.distanceFromPrevious || ''}" 
                           placeholder="Distance" 
                           step="0.1" 
                           min="0"
                           onchange="updateStationDistance('${course.id}', ${index}, this.value)"
                           ${index === 0 ? 'disabled title="Start station distance is always 0"' : ''}>
                    <span class="total-distance">
                      ${cs.totalDistance ? `(${cs.totalDistance}mi total)` : ''}
                    </span>
                  </div>
                </div>
                <div class="station-actions">
                  <button onclick="insertStationBefore('${course.id}', ${index})" 
                          class="btn-insert" 
                          title="Insert station before">⬆️</button>
                  <button onclick="insertStationAfter('${course.id}', ${index})" 
                          class="btn-insert" 
                          title="Insert station after">⬇️</button>
                  <button onclick="removeCourseStation('${course.id}', ${index})" 
                          class="btn-remove" 
                          title="Remove station">×</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${!hasFinish ? '<p style="color: #666; font-style: italic; margin: 0.5rem 0;">💡 Add Finish station first, then DNF/DNS will become available</p>' : ''}
        
        <div class="add-station-to-course">
          <select id="station-select-${course.id}">
            <option value="">Select aid station...</option>
            ${availableStations.map(station => 
              `<option value="${station.id}">${station.name}</option>`
            ).join('')}
          </select>
          <input type="number" placeholder="Distance from previous" id="distance-${course.id}" step="0.1" min="0">
          <button onclick="addStationToCourse('${course.id}')">Add Station</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function addCourse() {
  const nameInput = document.getElementById('new-course-name');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  
  if (!name) {
    alert('Please enter a course name');
    return;
  }
  
  // Check for duplicates
  if (eventData.courses.some(course => course.name.toLowerCase() === name.toLowerCase())) {
    alert('A course with this name already exists');
    return;
  }
  
  const newCourse = {
    id: 'course_' + Date.now(),
    name: name,
    stations: [] // Array of {stationId, distanceFromPrevious, totalDistance}
  };
  
  // Auto-add Start station
  const startStation = eventData.aidStations.find(s => s.id === 'start');
  if (startStation) {
    newCourse.stations.push({
      stationId: 'start',
      distanceFromPrevious: 0,
      totalDistance: 0
    });
  }
  
  eventData.courses.push(newCourse);
  nameInput.value = '';
  
  renderCoursesSetup();
  updateNavigation();
  saveData();
  
  alert(`Course "${name}" created! Start station added automatically. Add your aid stations, then Finish, then DNF/DNS will be available.`);
}

function removeCourse(courseId) {
  if (confirm('Are you sure you want to remove this course?')) {
    eventData.courses = eventData.courses.filter(course => course.id !== courseId);
    renderCoursesSetup();
    updateNavigation();
    saveData();
  }
}

function addStationToCourse(courseId) {
  const stationSelect = document.getElementById(`station-select-${courseId}`);
  const distanceInput = document.getElementById(`distance-${courseId}`);
  
  if (!stationSelect || !distanceInput) return;
  
  const stationId = stationSelect.value;
  const distance = parseFloat(distanceInput.value) || 0;
  
  if (!stationId) {
    alert('Please select a station');
    return;
  }
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  // Calculate total distance
  let totalDistance = distance;
  if (course.stations.length > 0) {
    const lastStation = course.stations[course.stations.length - 1];
    totalDistance += lastStation.totalDistance || 0;
  }
  
  course.stations.push({
    stationId: stationId,
    distanceFromPrevious: distance,
    totalDistance: totalDistance
  });
  
  stationSelect.value = '';
  distanceInput.value = '';
  
  renderCoursesSetup();
  saveData();
}

function removeCourseStation(courseId, stationIndex) {
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  course.stations.splice(stationIndex, 1);
  
  // Recalculate total distances
  recalculateCourseDistances(courseId);
  
  renderCoursesSetup();
  saveData();
}

function updateStationDistance(courseId, stationIndex, newDistance) {
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  const distance = parseFloat(newDistance) || 0;
  course.stations[stationIndex].distanceFromPrevious = distance;
  
  // Recalculate total distances
  recalculateCourseDistances(courseId);
  
  renderCoursesSetup();
  saveData();
}

function insertStationBefore(courseId, stationIndex) {
  showInsertStationModal(courseId, stationIndex);
}

function insertStationAfter(courseId, stationIndex) {
  showInsertStationModal(courseId, stationIndex + 1);
}

function showInsertStationModal(courseId, insertIndex) {
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  // Check if course has Finish station
  const hasFinish = course.stations.some(cs => cs.stationId === 'finish');
  
  // Filter available stations
  const availableStations = eventData.aidStations.filter(station => {
    if (station.id === 'dnf' || station.id === 'dns') {
      return hasFinish; // Only show DNF/DNS if Finish is already in the course
    }
    return true;
  });
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Insert Station at Position ${insertIndex + 1}</h3>
        <button class="modal-close" onclick="closeInsertModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Select Station:</label>
          <select id="insert-station-select">
            <option value="">Choose a station...</option>
            ${availableStations.map(station => 
              `<option value="${station.id}">${station.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Distance from Previous Station:</label>
          <input type="number" id="insert-distance-input" placeholder="Distance in miles" step="0.1" min="0">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeInsertModal()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmInsertStation('${courseId}', ${insertIndex})">Insert Station</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus on the select
  setTimeout(() => {
    document.getElementById('insert-station-select').focus();
  }, 100);
}

function confirmInsertStation(courseId, insertIndex) {
  const stationSelect = document.getElementById('insert-station-select');
  const distanceInput = document.getElementById('insert-distance-input');
  
  const stationId = stationSelect.value;
  const distance = parseFloat(distanceInput.value) || 0;
  
  if (!stationId) {
    alert('Please select a station');
    return;
  }
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  // Insert the new station
  course.stations.splice(insertIndex, 0, {
    stationId: stationId,
    distanceFromPrevious: distance,
    totalDistance: 0 // Will be recalculated
  });
  
  // Recalculate total distances
  recalculateCourseDistances(courseId);
  
  closeInsertModal();
  renderCoursesSetup();
  saveData();
}

function closeInsertModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    modal.remove();
  }
}

function recalculateCourseDistances(courseId) {
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  let runningTotal = 0;
  course.stations.forEach(cs => {
    runningTotal += cs.distanceFromPrevious || 0;
    cs.totalDistance = runningTotal;
  });
}

function saveCourses() {
  saveData();
  alert('Courses saved successfully!');
}

// Participants Setup Functions
function renderParticipantsSetup() {
  // Populate course dropdowns
  const newParticipantCourse = document.getElementById('new-participant-course');
  const bulkParticipantCourse = document.getElementById('bulk-participant-course');
  
  if (newParticipantCourse && bulkParticipantCourse) {
    const courseOptions = eventData.courses.map(course => 
      `<option value="${course.id}">${course.name}</option>`
    ).join('');
    
    newParticipantCourse.innerHTML = '<option value="">Select Course</option>' + courseOptions;
    bulkParticipantCourse.innerHTML = '<option value="">Select Course for All</option>' + courseOptions;
  }
  
  // Render participants list
  renderParticipantsList();
}

function renderParticipantsList() {
  const container = document.getElementById('participants-container');
  if (!container) return;
  
  if (eventData.participants.length === 0) {
    container.innerHTML = '<p style="color: #666; text-align: center;">No participants added yet.</p>';
    return;
  }
  
  // Group participants by course
  const participantsByCourse = {};
  eventData.participants.forEach(participant => {
    const courseId = participant.courseId || 'unassigned';
    if (!participantsByCourse[courseId]) {
      participantsByCourse[courseId] = [];
    }
    participantsByCourse[courseId].push(participant);
  });
  
  let html = '';
  
  // Show participants grouped by course
  Object.keys(participantsByCourse).forEach(courseId => {
    const courseName = courseId === 'unassigned' ? 'Unassigned' : 
      (eventData.courses.find(c => c.id === courseId)?.name || 'Unknown Course');
    
    html += `
      <div class="course-participants">
        <div class="course-participants-header">
          <h4>${courseName} (${participantsByCourse[courseId].length} participants)</h4>
          <div class="course-bulk-actions">
            <label>
              <input type="checkbox" onchange="toggleAllParticipants('${courseId}', this.checked)"> 
              Select All
            </label>
            <button class="btn btn-small btn-danger" onclick="clearAllParticipantsFromCourse('${courseId}')">
              Clear All
            </button>
          </div>
        </div>
        
        <div class="participants-table">
          <div class="participants-table-header">
            <div class="col-checkbox"></div>
            <div class="col-id">ID</div>
            <div class="col-name">Name</div>
          </div>
          <div class="participants-table-body">
            ${participantsByCourse[courseId].map(participant => `
              <div class="participant-row course-${courseId}">
                <div class="col-checkbox">
                  <input type="checkbox" class="participant-checkbox" data-participant-id="${participant.id}" data-course-id="${courseId}">
                </div>
                <div class="col-id">${participant.id}</div>
                <div class="col-name">${participant.name !== participant.id ? participant.name : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  });
  
  // Add bulk actions panel
  html += `
    <div class="bulk-actions-panel" id="bulk-actions-panel" style="display: none;">
      <div class="bulk-actions-content">
        <span id="selected-count">0 selected</span>
        <div class="bulk-actions-buttons">
          <select id="bulk-move-course">
            <option value="">Move to course...</option>
            ${eventData.courses.map(course => 
              `<option value="${course.id}">${course.name}</option>`
            ).join('')}
          </select>
          <button class="btn btn-small btn-primary" onclick="bulkMoveToCourse()">Move</button>
          <button class="btn btn-small btn-danger" onclick="bulkRemoveParticipants()">Remove</button>
          <button class="btn btn-small btn-secondary" onclick="clearSelection()">Clear Selection</button>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Add event listeners for checkboxes
  setupParticipantCheckboxes();
}

function addParticipant() {
  const idInput = document.getElementById('new-participant-id');
  const nameInput = document.getElementById('new-participant-name');
  const courseSelect = document.getElementById('new-participant-course');
  
  if (!idInput || !courseSelect) return;
  
  const participantId = idInput.value.trim();
  const participantName = nameInput ? nameInput.value.trim() : '';
  const courseId = courseSelect.value;
  
  if (!participantId) {
    alert('Please enter a participant ID/bib number');
    return;
  }
  
  if (!courseId) {
    alert('Please select a course');
    return;
  }
  
  // Check if participant already exists
  const existingParticipant = eventData.participants.find(p => p.id === participantId);
  if (existingParticipant) {
    alert(`Participant ${participantId} already exists`);
    return;
  }
  
  // Add participant
  const participant = {
    id: participantId,
    name: participantName || participantId,
    type: 'race',
    active: true,
    courseId: courseId
  };
  
  eventData.participants.push(participant);
  
  // Assign to Start station
  if (!eventData.stationAssignments['start']) {
    eventData.stationAssignments['start'] = [];
  }
  eventData.stationAssignments['start'].push(participantId);
  
  // Clear inputs
  idInput.value = '';
  if (nameInput) nameInput.value = '';
  courseSelect.value = '';
  
  renderParticipantsList();
  saveData();
}

function bulkAddParticipants() {
  const bulkInput = document.getElementById('bulk-participants');
  const courseSelect = document.getElementById('bulk-participant-course');
  
  if (!bulkInput || !courseSelect) return;
  
  const participantsText = bulkInput.value.trim();
  const courseId = courseSelect.value;
  
  if (!participantsText) {
    alert('Please enter participant IDs or ranges');
    return;
  }
  
  if (!courseId) {
    alert('Please select a course');
    return;
  }
  
  // Parse participants with range support
  let participantIds;
  try {
    participantIds = parseParticipantRanges(participantsText);
  } catch (error) {
    alert(`Error parsing participant ranges: ${error.message}`);
    return;
  }
  
  if (participantIds.length === 0) {
    alert('No valid participants found in input');
    return;
  }
  
  let addedCount = 0;
  let skippedCount = 0;
  
  participantIds.forEach(participantId => {
    // Check if participant already exists
    const existingParticipant = eventData.participants.find(p => p.id === participantId);
    if (existingParticipant) {
      skippedCount++;
      return;
    }
    
    // Add participant
    const participant = {
      id: participantId,
      name: participantId,
      type: 'race',
      active: true,
      courseId: courseId
    };
    
    eventData.participants.push(participant);
    
    // Assign to Start station
    if (!eventData.stationAssignments['start']) {
      eventData.stationAssignments['start'] = [];
    }
    eventData.stationAssignments['start'].push(participantId);
    
    addedCount++;
  });
  
  // Clear inputs
  bulkInput.value = '';
  courseSelect.value = '';
  
  renderParticipantsList();
  saveData();
  
  // Show summary with preview
  let message = `Added ${addedCount} participants`;
  if (skippedCount > 0) {
    message += `. Skipped ${skippedCount} duplicates`;
  }
  
  // Show preview of first few and last few if many participants
  if (addedCount > 0) {
    const addedIds = participantIds.filter(id => 
      eventData.participants.some(p => p.id === id && p.courseId === courseId)
    );
    
    if (addedIds.length <= 10) {
      message += `\n\nAdded: ${addedIds.join(', ')}`;
    } else {
      const preview = addedIds.slice(0, 5).join(', ') + 
                     ` ... ${addedIds.slice(-5).join(', ')}`;
      message += `\n\nAdded: ${preview}`;
    }
  }
  
  alert(message);
}

// Parse participant ranges like "100-148,150-179" or "101,103,105-110"
function parseParticipantRanges(input) {
  const participantIds = [];
  const segments = input.split(',').map(s => s.trim()).filter(Boolean);
  
  segments.forEach(segment => {
    if (segment.includes('-')) {
      // Handle range like "100-148"
      const parts = segment.split('-');
      if (parts.length !== 2) {
        throw new Error(`Invalid range format: "${segment}". Use format like "100-148"`);
      }
      
      const [start, end] = parts.map(s => s.trim());
      
      // Check if it's a numeric range
      const startNum = parseInt(start);
      const endNum = parseInt(end);
      
      if (!isNaN(startNum) && !isNaN(endNum)) {
        if (startNum > endNum) {
          throw new Error(`Invalid range: "${segment}". Start number must be less than or equal to end number`);
        }
        
        if (endNum - startNum > 1000) {
          throw new Error(`Range too large: "${segment}". Maximum range size is 1000 participants`);
        }
        
        // Generate numeric range
        for (let i = startNum; i <= endNum; i++) {
          participantIds.push(i.toString());
        }
      } else {
        // If not numeric, treat as individual item (e.g., "HM Sweep 1-2" as a name)
        participantIds.push(segment);
      }
    } else {
      // Handle individual participant
      if (segment.length > 0) {
        participantIds.push(segment);
      }
    }
  });
  
  // Remove duplicates
  return [...new Set(participantIds)];
}

function changeParticipantCourse(participantId, newCourseId) {
  if (!newCourseId) return;
  
  const participant = eventData.participants.find(p => p.id === participantId);
  if (participant) {
    participant.courseId = newCourseId;
    renderParticipantsList();
    saveData();
  }
}

function removeParticipant(participantId) {
  if (confirm(`Are you sure you want to remove participant ${participantId}?`)) {
    eventData.participants = eventData.participants.filter(p => p.id !== participantId);
    
    // Also remove from station assignments
    Object.keys(eventData.stationAssignments).forEach(stationId => {
      eventData.stationAssignments[stationId] = eventData.stationAssignments[stationId].filter(id => id !== participantId);
    });
    
    renderParticipantsList();
    saveData();
  }
}

// Bulk action functions
function setupParticipantCheckboxes() {
  const checkboxes = document.querySelectorAll('.participant-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateBulkActionsPanel);
  });
}

function updateBulkActionsPanel() {
  const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
  const panel = document.getElementById('bulk-actions-panel');
  const countSpan = document.getElementById('selected-count');
  
  if (selectedCheckboxes.length > 0) {
    panel.style.display = 'block';
    countSpan.textContent = `${selectedCheckboxes.length} selected`;
  } else {
    panel.style.display = 'none';
  }
}

function toggleAllParticipants(courseId, checked) {
  const checkboxes = document.querySelectorAll(`[data-course-id="${courseId}"]`);
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });
  updateBulkActionsPanel();
}

function clearSelection() {
  const checkboxes = document.querySelectorAll('.participant-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  updateBulkActionsPanel();
}

function bulkMoveToCourse() {
  const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
  const targetCourseId = document.getElementById('bulk-move-course').value;
  
  if (!targetCourseId) {
    alert('Please select a target course');
    return;
  }
  
  if (selectedCheckboxes.length === 0) {
    alert('Please select participants to move');
    return;
  }
  
  const targetCourse = eventData.courses.find(c => c.id === targetCourseId);
  const participantIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.participantId);
  
  if (confirm(`Move ${participantIds.length} participants to ${targetCourse.name}?`)) {
    participantIds.forEach(participantId => {
      const participant = eventData.participants.find(p => p.id === participantId);
      if (participant) {
        participant.courseId = targetCourseId;
      }
    });
    
    renderParticipantsList();
    saveData();
    alert(`Moved ${participantIds.length} participants to ${targetCourse.name}`);
  }
}

function bulkRemoveParticipants() {
  const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    alert('Please select participants to remove');
    return;
  }
  
  const participantIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.participantId);
  
  if (confirm(`Remove ${participantIds.length} participants? This will also remove any race activity for these participants.`)) {
    // Remove participants
    eventData.participants = eventData.participants.filter(p => !participantIds.includes(p.id));
    
    // Remove from station assignments
    Object.keys(eventData.stationAssignments).forEach(stationId => {
      eventData.stationAssignments[stationId] = eventData.stationAssignments[stationId].filter(id => !participantIds.includes(id));
    });
    
    // Remove from activity log
    eventData.activityLog = eventData.activityLog.filter(activity => !participantIds.includes(activity.participantId));
    
    renderParticipantsList();
    saveData();
    alert(`Removed ${participantIds.length} participants and their race activity`);
  }
}

function clearAllParticipantsFromCourse(courseId) {
  const courseName = courseId === 'unassigned' ? 'Unassigned' : 
    (eventData.courses.find(c => c.id === courseId)?.name || 'Unknown Course');
  
  const participantsInCourse = eventData.participants.filter(p => p.courseId === courseId || (courseId === 'unassigned' && !p.courseId));
  
  if (participantsInCourse.length === 0) {
    alert('No participants to remove from this course');
    return;
  }
  
  if (confirm(`Remove ALL ${participantsInCourse.length} participants from ${courseName}? This will also remove any race activity for these participants.`)) {
    const participantIds = participantsInCourse.map(p => p.id);
    
    // Remove participants
    eventData.participants = eventData.participants.filter(p => p.courseId !== courseId && !(courseId === 'unassigned' && !p.courseId));
    
    // Remove from station assignments
    Object.keys(eventData.stationAssignments).forEach(stationId => {
      eventData.stationAssignments[stationId] = eventData.stationAssignments[stationId].filter(id => !participantIds.includes(id));
    });
    
    // Remove from activity log
    eventData.activityLog = eventData.activityLog.filter(activity => !participantIds.includes(activity.participantId));
    
    renderParticipantsList();
    saveData();
    alert(`Removed all participants from ${courseName} and their race activity`);
  }
}

function saveParticipants() {
  saveData();
  alert('Participants saved successfully!');
}

// Race Tracker Functions (multi-course aware version)
function renderRaceTracker() {
  const kanbanBoard = document.getElementById('kanban-board');
  if (!kanbanBoard) return;
  
  // Initialize station assignments if empty
  if (Object.keys(eventData.stationAssignments).length === 0) {
    eventData.aidStations.forEach(station => {
      eventData.stationAssignments[station.id] = [];
    });
    
    // Start all registered participants at the Start station
    if (eventData.participants.length > 0) {
      eventData.stationAssignments['start'] = eventData.participants.map(p => p.id);
    }
  }
  
  // Create multi-course layout
  let html = '';
  
  // Add course swimlanes
  eventData.courses.forEach(course => {
    // Count participants in this course
    const participantCount = eventData.participants.filter(p => p.courseId === course.id).length;
    
    html += `
      <div class="course-swimlane">
        <div class="course-swimlane-header">
          <h3>${course.name}</h3>
          <div class="course-stats">
            ${participantCount} participants • ${course.stations.length} stations • ${course.stations[course.stations.length - 1]?.totalDistance || 0}mi total
          </div>
        </div>
        <div class="course-stations">
          ${course.stations.map(cs => {
            const station = eventData.aidStations.find(s => s.id === cs.stationId);
            if (!station) return '';
            
            return `
              <div class="column course-station" data-station="${station.id}">
                <div class="column-header" onclick="openBatchModal('${station.id}')">
                  ${station.name}
                  <span class="add-icon">+</span>
                </div>
                <div class="column-body">
                  ${(eventData.stationAssignments[station.id] || [])
                    .filter(participantId => {
                      const participantCourse = getParticipantCourse(participantId);
                      return participantCourse === course.id;
                    })
                    .map(participantId => {
                      const participant = eventData.participants.find(p => p.id === participantId);
                      const displayName = participant ? participant.name : participantId;
                      return `<div class="bib-card course-${course.id}" draggable="true" data-participant="${participantId}" title="Course: ${course.name}">${displayName}</div>`;
                    }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });
  
  // Add shared stations (DNF/DNS/Suspect) at the bottom
  const sharedStations = eventData.aidStations.filter(s => s.id === 'dnf' || s.id === 'dns' || s.id === 'suspect');
  if (sharedStations.length > 0) {
    html += `
      <div class="shared-stations">
        <div class="shared-stations-header">
          <h3>Status Stations</h3>
          <div class="shared-stats">Available to all courses</div>
        </div>
        <div class="shared-stations-row">
          ${sharedStations.map(station => `
            <div class="column shared-station" data-station="${station.id}">
              <div class="column-header" onclick="openBatchModal('${station.id}')">
                ${station.name}
                <span class="add-icon">+</span>
              </div>
              <div class="column-body">
                ${(eventData.stationAssignments[station.id] || []).map(participantId => {
                  const participant = eventData.participants.find(p => p.id === participantId);
                  const participantCourse = getParticipantCourse(participantId);
                  const course = eventData.courses.find(c => c.id === participantCourse);
                  const displayName = participant ? participant.name : participantId;
                  const courseClass = participantCourse ? `course-${participantCourse}` : '';
                  const courseTitle = course ? `Course: ${course.name}` : 'No course assigned';
                  
                  return `<div class="bib-card ${courseClass}" draggable="true" data-participant="${participantId}" title="${courseTitle}">${displayName}</div>`;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  kanbanBoard.innerHTML = html;
  
  // Add drag and drop functionality
  addDragAndDropHandlers();
}

function addDragAndDropHandlers() {
  const bibCards = document.querySelectorAll('.bib-card');
  const columns = document.querySelectorAll('.column');
  
  bibCards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
  
  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('drop', handleDrop);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
  });
}

let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.target;
  e.target.classList.add('dragging');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedElement = null;
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDragEnter(e) {
  e.preventDefault();
  if (e.target.classList.contains('column') || e.target.closest('.column')) {
    const column = e.target.classList.contains('column') ? e.target : e.target.closest('.column');
    column.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  if (e.target.classList.contains('column') || e.target.closest('.column')) {
    const column = e.target.classList.contains('column') ? e.target : e.target.closest('.column');
    column.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  
  const column = e.target.classList.contains('column') ? e.target : e.target.closest('.column');
  if (!column || !draggedElement) return;
  
  column.classList.remove('drag-over');
  
  const targetStationId = column.dataset.station;
  const participantId = draggedElement.dataset.participant;
  const participantCourseId = getParticipantCourse(participantId);
  
  // Check if the target station is valid for this participant's course
  if (participantCourseId && !isStationInCourse(targetStationId, participantCourseId)) {
    // Show error message
    const participant = eventData.participants.find(p => p.id === participantId);
    const course = eventData.courses.find(c => c.id === participantCourseId);
    const station = eventData.aidStations.find(s => s.id === targetStationId);
    
    alert(`Cannot move ${participant ? participant.name : participantId} to ${station ? station.name : targetStationId}.\n\nParticipant is assigned to ${course ? course.name : 'unknown course'} and can only move to stations in that course.`);
    return;
  }
  
  // Move participant between stations
  moveParticipant(participantId, targetStationId);
}

function moveParticipant(participantId, targetStationId) {
  const participantCourseId = getParticipantCourse(participantId);
  const participant = eventData.participants.find(p => p.id === participantId);
  const targetStation = eventData.aidStations.find(s => s.id === targetStationId);
  
  // Check for cross-course movement (suspect data)
  if (participantCourseId && !isStationInCourse(targetStationId, participantCourseId) && 
      targetStationId !== 'dnf' && targetStationId !== 'dns' && targetStationId !== 'suspect') {
    
    const course = eventData.courses.find(c => c.id === participantCourseId);
    
    const result = confirm(
      `⚠️ CROSS-COURSE MOVEMENT DETECTED\n\n` +
      `Participant: ${participant ? participant.name : participantId}\n` +
      `Assigned Course: ${course ? course.name : 'Unknown'}\n` +
      `Target Station: ${targetStation ? targetStation.name : targetStationId}\n\n` +
      `This station is NOT on their assigned course.\n\n` +
      `Possible causes:\n` +
      `• Wrong bib number entered\n` +
      `• Participant took wrong turn\n` +
      `• Course change needed\n\n` +
      `Click OK to move to SUSPECT DATA for review\n` +
      `Click Cancel to abort this movement`
    );
    
    if (!result) {
      return; // User cancelled
    }
    
    // Move to suspect data instead
    targetStationId = 'suspect';
  }
  
  // Remove from current station
  Object.keys(eventData.stationAssignments).forEach(stationId => {
    eventData.stationAssignments[stationId] = eventData.stationAssignments[stationId].filter(id => id !== participantId);
  });
  
  // Add to target station
  if (!eventData.stationAssignments[targetStationId]) {
    eventData.stationAssignments[targetStationId] = [];
  }
  eventData.stationAssignments[targetStationId].push(participantId);
  
  // Log the movement with appropriate notes
  const notes = targetStationId === 'suspect' ? 
    'Moved to Suspect Data due to cross-course movement' : 
    'Moved via drag and drop';
  
  logActivity({
    participantId: participantId,
    activity: 'arrival',
    station: targetStationId,
    timestamp: new Date().toISOString(),
    userTime: new Date().toLocaleTimeString(),
    notes: notes
  });
  
  renderRaceTracker();
  saveData();
}

// Advanced Batch Entry System
let batchEntryState = {
  currentStation: null,
  entries: [],
  nextEntryId: 1,
  isPreviewMode: false
};

function openBatchModal(stationId) {
  const modal = document.getElementById('batch-modal');
  if (!modal) return;
  
  // Initialize batch entry state
  batchEntryState.currentStation = stationId;
  batchEntryState.entries = [];
  batchEntryState.nextEntryId = 1;
  batchEntryState.isPreviewMode = false;
  
  // Update modal title
  const station = eventData.aidStations.find(s => s.id === stationId);
  const modalTitle = modal.querySelector('.modal-header h3');
  if (modalTitle && station) {
    modalTitle.textContent = `Batch Entry - ${station.name}`;
  }
  
  // Add initial entry
  addBatchRow();
  
  modal.classList.remove('hidden');
}

function parseTimeInput(timeStr) {
  if (!timeStr || !timeStr.trim()) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const input = timeStr.trim().toLowerCase();
  const now = new Date();
  
  // Handle various time formats
  if (input.match(/^\d{1,2}:\d{2}$/)) {
    // Format: "10:05" or "2:30"
    return input;
  } else if (input.match(/^\d{3,4}$/)) {
    // Format: "1005" or "230"
    const timeNum = input.padStart(4, '0');
    return `${timeNum.slice(0, 2)}:${timeNum.slice(2)}`;
  } else if (input.match(/^\d{1,2}(am|pm)$/)) {
    // Format: "2pm" or "10am"
    const hour = parseInt(input.replace(/[^\d]/g, ''));
    const isPM = input.includes('pm');
    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    return `${hour24.toString().padStart(2, '0')}:00`;
  } else if (input.match(/^\d{1,2}$/)) {
    // Format: "14" (assume hour)
    const hour = parseInt(input);
    return `${hour.toString().padStart(2, '0')}:00`;
  }
  
  // If we can't parse it, return as-is
  return timeStr;
}

function addBatchRow() {
  const entryId = batchEntryState.nextEntryId++;
  const previousEntry = batchEntryState.entries[batchEntryState.entries.length - 1];
  
  const newEntry = {
    id: entryId,
    station: previousEntry ? previousEntry.station : batchEntryState.currentStation,
    updateType: previousEntry ? previousEntry.updateType : 'race-update',
    action: previousEntry ? previousEntry.action : 'arrived',
    participants: [],
    message: '',
    time: '',
    notes: ''
  };
  
  batchEntryState.entries.push(newEntry);
  renderBatchEntries();
  
  // Focus on the new entry
  setTimeout(() => {
    const newEntryElement = document.querySelector(`[data-entry-id="${entryId}"]`);
    if (newEntryElement) {
      const participantInput = newEntryElement.querySelector('.participant-input');
      if (participantInput) {
        participantInput.focus();
      }
    }
  }, 100);
}

function removeBatchRow(entryId) {
  batchEntryState.entries = batchEntryState.entries.filter(entry => entry.id !== entryId);
  renderBatchEntries();
}

function renderBatchEntries() {
  const container = document.getElementById('batch-entries');
  if (!container) return;
  
  if (batchEntryState.isPreviewMode) {
    renderBatchPreview();
    return;
  }
  
  let html = '';
  
  batchEntryState.entries.forEach((entry, index) => {
    html += `
      <div class="batch-entry-row" data-entry-id="${entry.id}">
        <div class="batch-entry-header">
          <h4>Entry ${index + 1}</h4>
          ${batchEntryState.entries.length > 1 ? 
            `<button class="btn btn-danger btn-small" onclick="removeBatchRow(${entry.id})">Remove</button>` : 
            ''
          }
        </div>
        
        <div class="batch-entry-form">
          <div class="form-row">
            <div class="form-col">
              <label>Aid Station</label>
              <select onchange="updateBatchEntry(${entry.id}, 'station', this.value)">
                ${eventData.aidStations.map(station => 
                  `<option value="${station.id}" ${station.id === entry.station ? 'selected' : ''}>${station.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="form-col">
              <label>Update Type</label>
              <select onchange="updateBatchEntry(${entry.id}, 'updateType', this.value)">
                <option value="race-update" ${entry.updateType === 'race-update' ? 'selected' : ''}>Race Update</option>
                <option value="race-message" ${entry.updateType === 'race-message' ? 'selected' : ''}>Race Message</option>
              </select>
            </div>
            
            ${entry.updateType === 'race-update' ? `
              <div class="form-col">
                <label>Action</label>
                <select onchange="updateBatchEntry(${entry.id}, 'action', this.value)">
                  <option value="arrived" ${entry.action === 'arrived' ? 'selected' : ''}>Arrived</option>
                  <option value="departed" ${entry.action === 'departed' ? 'selected' : ''}>Departed</option>
                </select>
              </div>
            ` : `
              <div class="form-col">
                <label>Message</label>
                <input type="text" value="${entry.message}" placeholder="Free-form message" 
                       onchange="updateBatchEntry(${entry.id}, 'message', this.value)">
              </div>
            `}
            
            <div class="form-col">
              <label>Time</label>
              <input type="text" value="${entry.time}" placeholder="10:05, 2PM, 1430" 
                     onchange="updateBatchEntry(${entry.id}, 'time', this.value)">
            </div>
          </div>
          
          ${entry.updateType === 'race-update' ? `
            <div class="form-row">
              <div class="form-col-full">
                <label>Participants</label>
                <div class="tags-input-container" data-entry-id="${entry.id}">
                  <div class="tags-display">
                    ${entry.participants.map(p => `
                      <span class="tag">
                        ${p} <button onclick="removeParticipantFromEntry(${entry.id}, '${p}')">&times;</button>
                      </span>
                    `).join('')}
                  </div>
                  <input type="text" 
                         class="participant-input" 
                         placeholder="Type participant name or bib"
                         onkeydown="handleParticipantInput(event, ${entry.id})"
                         oninput="showParticipantSuggestions(event, ${entry.id})">
                  <div class="autocomplete-suggestions" style="display: none;"></div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function renderBatchPreview() {
  const container = document.getElementById('batch-entries');
  if (!container) return;
  
  let html = '<div class="batch-preview">';
  
  batchEntryState.entries.forEach((entry, index) => {
    const station = eventData.aidStations.find(s => s.id === entry.station);
    const stationName = station ? station.name : entry.station;
    const parsedTime = parseTimeInput(entry.time);
    
    html += `
      <div class="preview-entry">
        <div class="preview-header">
          <strong>Entry ${index + 1}: ${stationName}</strong>
          <span class="preview-time">${parsedTime}</span>
        </div>
        <div class="preview-content">
          ${entry.updateType === 'race-update' ? `
            <div class="preview-action">${entry.action}</div>
            <div class="preview-participants">
              ${entry.participants.length > 0 ? 
                entry.participants.map(p => `<span class="preview-participant">${p}</span>`).join(' ') :
                '<em>No participants</em>'
              }
            </div>
          ` : `
            <div class="preview-message">${entry.message || '<em>No message</em>'}</div>
          `}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function updateBatchEntry(entryId, field, value) {
  const entry = batchEntryState.entries.find(e => e.id === entryId);
  if (entry) {
    entry[field] = value;
    renderBatchEntries();
  }
}

function handleParticipantInput(event, entryId) {
  if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault();
    addParticipantToEntry(entryId, event.target.value.trim());
    event.target.value = '';
    hideParticipantSuggestions();
  } else if (event.key === 'Escape') {
    hideParticipantSuggestions();
  }
}

function addParticipantToEntry(entryId, participantId) {
  if (!participantId) return;
  
  const entry = batchEntryState.entries.find(e => e.id === entryId);
  if (entry && !entry.participants.includes(participantId)) {
    entry.participants.push(participantId);
    
    // Store current input focus before re-rendering
    const currentInput = document.querySelector(`[data-entry-id="${entryId}"] .participant-input`);
    const shouldRefocus = currentInput && document.activeElement === currentInput;
    
    renderBatchEntries();
    
    // Restore focus to the input after re-rendering
    if (shouldRefocus) {
      setTimeout(() => {
        const newInput = document.querySelector(`[data-entry-id="${entryId}"] .participant-input`);
        if (newInput) {
          newInput.focus();
        }
      }, 0);
    }
  }
}

function removeParticipantFromEntry(entryId, participantId) {
  const entry = batchEntryState.entries.find(e => e.id === entryId);
  if (entry) {
    entry.participants = entry.participants.filter(p => p !== participantId);
    
    // Store current input focus before re-rendering
    const currentInput = document.querySelector(`[data-entry-id="${entryId}"] .participant-input`);
    const shouldRefocus = currentInput && document.activeElement === currentInput;
    
    renderBatchEntries();
    
    // Restore focus to the input after re-rendering
    if (shouldRefocus) {
      setTimeout(() => {
        const newInput = document.querySelector(`[data-entry-id="${entryId}"] .participant-input`);
        if (newInput) {
          newInput.focus();
        }
      }, 0);
    }
  }
}

function showParticipantSuggestions(event, entryId) {
  const input = event.target;
  const query = input.value.toLowerCase();
  const container = input.parentNode;
  const suggestionsDiv = container.querySelector('.autocomplete-suggestions');
  
  if (query.length < 1) {
    suggestionsDiv.style.display = 'none';
    return;
  }
  
  // Get suggestions from existing participants
  const suggestions = eventData.participants
    .filter(p => 
      p.id.toLowerCase().includes(query) || 
      p.name.toLowerCase().includes(query)
    )
    .slice(0, 10);
  
  if (suggestions.length === 0) {
    suggestionsDiv.style.display = 'none';
    return;
  }
  
  suggestionsDiv.innerHTML = suggestions.map(p => `
    <div class="suggestion-item" onclick="selectParticipantSuggestion(${entryId}, '${p.id}', this)">
      <strong>${p.id}</strong> ${p.name !== p.id ? `(${p.name})` : ''}
    </div>
  `).join('');
  
  suggestionsDiv.style.display = 'block';
}

function selectParticipantSuggestion(entryId, participantId, element) {
  // Clear input and hide suggestions first
  const container = element.parentNode.parentNode;
  const input = container.querySelector('.participant-input');
  input.value = '';
  hideParticipantSuggestions();
  
  // Add participant (this will handle focus restoration)
  addParticipantToEntry(entryId, participantId);
}

function hideParticipantSuggestions() {
  document.querySelectorAll('.autocomplete-suggestions').forEach(div => {
    div.style.display = 'none';
  });
}

function togglePreview() {
  batchEntryState.isPreviewMode = !batchEntryState.isPreviewMode;
  renderBatchEntries();
  
  const button = document.getElementById('preview-btn');
  if (button) {
    button.textContent = batchEntryState.isPreviewMode ? 'Edit' : 'Preview';
  }
}

function submitBatchEntry() {
  if (batchEntryState.entries.length === 0) {
    alert('No entries to submit');
    return;
  }
  
  let totalProcessed = 0;
  let newParticipants = [];
  let suspectMovements = [];
  
  batchEntryState.entries.forEach(entry => {
    if (entry.updateType === 'race-update') {
      entry.participants.forEach(participantId => {
        let targetStationId = entry.station;
        
        // Check for cross-course movement (suspect data)
        const participantCourseId = getParticipantCourse(participantId);
        const participantData = eventData.participants.find(p => p.id === participantId);
        
        if (participantCourseId && !isStationInCourse(targetStationId, participantCourseId) && 
            targetStationId !== 'dnf' && targetStationId !== 'dns' && targetStationId !== 'suspect') {
          
          // Move to suspect data instead
          targetStationId = 'suspect';
          suspectMovements.push({
            participantId: participantId,
            participantName: participantData ? participantData.name : participantId,
            originalStation: entry.station,
            course: eventData.courses.find(c => c.id === participantCourseId)?.name || 'Unknown'
          });
        }
        // Remove from current station
        Object.keys(eventData.stationAssignments).forEach(sId => {
          eventData.stationAssignments[sId] = eventData.stationAssignments[sId].filter(id => id !== participantId);
        });
        
        // Add to target station
        if (!eventData.stationAssignments[targetStationId]) {
          eventData.stationAssignments[targetStationId] = [];
        }
        eventData.stationAssignments[targetStationId].push(participantId);
        
        // Create participant if doesn't exist
        let participant = eventData.participants.find(p => p.id === participantId);
        if (!participant) {
          participant = { 
            id: participantId, 
            name: participantId, 
            type: 'race', 
            active: true,
            courseId: null
          };
          eventData.participants.push(participant);
          
          // Track new participants for warning
          if (!newParticipants) newParticipants = [];
          newParticipants.push(participantId);
        }
        
        // Log the activity
        const activityNotes = targetStationId === 'suspect' ? 
          `Moved to Suspect Data (intended: ${eventData.aidStations.find(s => s.id === entry.station)?.name})` :
          (entry.notes || 'Batch entry');
          
        logActivity({
          participantId: participantId,
          activity: entry.action,
          station: targetStationId,
          timestamp: new Date().toISOString(),
          userTime: parseTimeInput(entry.time),
          notes: activityNotes
        });
        
        totalProcessed++;
      });
    } else if (entry.updateType === 'race-message') {
      // Log race message
      logActivity({
        participantId: 'STATION',
        activity: 'other',
        station: entry.station,
        timestamp: new Date().toISOString(),
        userTime: parseTimeInput(entry.time),
        notes: entry.message || 'Race message'
      });
      
      totalProcessed++;
    }
  });
  
  saveData();
  renderRaceTracker();
  closeBatchModal();
  
  let message = `Processed ${totalProcessed} entries successfully`;
  
  if (suspectMovements.length > 0) {
    message += `\n\n🚨 SUSPECT DATA DETECTED: ${suspectMovements.length} cross-course movements:\n`;
    suspectMovements.forEach(sm => {
      const originalStation = eventData.aidStations.find(s => s.id === sm.originalStation)?.name || sm.originalStation;
      message += `• ${sm.participantName} (${sm.course}) → ${originalStation}\n`;
    });
    message += `\nThese participants were moved to SUSPECT DATA for review.\nPossible causes: wrong bib number, wrong turn, or course change needed.`;
  }
  
  if (newParticipants.length > 0) {
    message += `\n\n⚠️ WARNING: Created ${newParticipants.length} new participants without course assignments:\n${newParticipants.join(', ')}\n\nThese participants are now UNASSIGNED and appear only in the Participants Setup page. Please assign them to courses if needed.`;
  }
  
  alert(message);
}

function showActivityLog() {
  const modal = document.getElementById('activity-modal');
  if (!modal) return;
  
  const logContent = document.getElementById('activity-log-content');
  if (!logContent) return;
  
  // Sort activities by timestamp (newest first)
  const sortedActivities = [...eventData.activityLog].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  if (sortedActivities.length === 0) {
    logContent.innerHTML = '<p style="text-align: center; color: #666;">No activities logged yet.</p>';
  } else {
    logContent.innerHTML = sortedActivities.map(activity => {
      const station = eventData.aidStations.find(s => s.id === activity.station);
      const stationName = station ? station.name : activity.station;
      
      return `
        <div style="border-bottom: 1px solid #eee; padding: 1rem 0;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <strong>${activity.participantId}</strong> → <strong>${stationName}</strong>
              <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
                ${activity.activity} at ${activity.userTime}
                ${activity.notes ? ` • ${activity.notes}` : ''}
              </div>
            </div>
            <div style="color: #999; font-size: 0.8rem;">
              ${new Date(activity.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  modal.classList.remove('hidden');
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    eventData = {
      event: { name: '', date: '', location: '', description: '' },
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
    
    saveData();
    location.reload();
  }
}

// Modal functions for race tracker
function closeBatchModal() {
  const modal = document.getElementById('batch-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function closeActivityLog() {
  const modal = document.getElementById('activity-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}



// Activity logging
function logActivity(activity) {
  activity.id = 'activity_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  activity.systemTimestamp = new Date().toISOString();
  
  eventData.activityLog.push(activity);
  saveData();
}

// Data persistence
function saveData() {
  try {
    localStorage.setItem('raceTrackerData', JSON.stringify(eventData));
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Error saving data. Please try again.');
  }
}

function loadData() {
  const saved = localStorage.getItem('raceTrackerData');
  if (saved) {
    try {
      const parsedData = JSON.parse(saved);
      // Merge with defaults to handle new properties
      eventData = {
        ...eventData,
        ...parsedData
      };
      console.log('Data loaded successfully');
    } catch (e) {
      console.error('Error loading saved data:', e);
      alert('Error loading saved data. Starting with defaults.');
    }
  }
}

function updateRaceTrackerHeader() {
  const eventTitle = document.getElementById('event-title');
  if (eventTitle) {
    let title = eventData.event.name || 'Race Tracker';
    if (eventData.courses.length > 0) {
      const courseNames = eventData.courses.map(c => c.name).join(', ');
      title += ` (${courseNames})`;
    }
    eventTitle.textContent = title;
  }
} 