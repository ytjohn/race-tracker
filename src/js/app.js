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
    { id: 'dns', name: 'DNS', isDefault: true }
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
    renderRaceTracker();
    updateRaceTrackerHeader();
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
    if (eventData.courses.length === 0) {
      trackerBtn.style.opacity = '0.5';
      trackerBtn.title = 'Complete event setup first';
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
                  <span class="station-distance">
                    ${cs.distanceFromPrevious ? `+${cs.distanceFromPrevious}mi` : ''} 
                    ${cs.totalDistance ? `(${cs.totalDistance}mi total)` : ''}
                  </span>
                </div>
                <button onclick="removeCourseStation('${course.id}', ${index})" style="background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 0.2rem 0.4rem; cursor: pointer;">×</button>
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
  let runningTotal = 0;
  course.stations.forEach(cs => {
    runningTotal += cs.distanceFromPrevious || 0;
    cs.totalDistance = runningTotal;
  });
  
  renderCoursesSetup();
  saveData();
}

function saveCourses() {
  saveData();
  alert('Courses saved successfully!');
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
    
    // Add some sample participants to Start
    eventData.stationAssignments['start'] = ['101', '102', '103', '201', '202'];
    eventData.participants = [
      { id: '101', name: '101', type: 'race', active: true },
      { id: '102', name: '102', type: 'race', active: true },
      { id: '103', name: '103', type: 'race', active: true },
      { id: '201', name: '201', type: 'race', active: true },
      { id: '202', name: '202', type: 'race', active: true }
    ];
  }
  
  // Create multi-course layout
  let html = '';
  
  // Add course swimlanes
  eventData.courses.forEach(course => {
    html += `
      <div class="course-swimlane">
        <div class="course-swimlane-header">
          <h3>${course.name}</h3>
          <div class="course-stats">
            ${course.stations.length} stations • ${course.stations[course.stations.length - 1]?.totalDistance || 0}mi total
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
                  ${(eventData.stationAssignments[station.id] || []).map(participantId => 
                    `<div class="bib-card" draggable="true" data-participant="${participantId}">${participantId}</div>`
                  ).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });
  
  // Add shared stations (DNF/DNS) at the bottom
  const sharedStations = eventData.aidStations.filter(s => s.id === 'dnf' || s.id === 'dns');
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
                ${(eventData.stationAssignments[station.id] || []).map(participantId => 
                  `<div class="bib-card" draggable="true" data-participant="${participantId}">${participantId}</div>`
                ).join('')}
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
  
  // Move participant between stations
  moveParticipant(participantId, targetStationId);
}

function moveParticipant(participantId, targetStationId) {
  // Remove from current station
  Object.keys(eventData.stationAssignments).forEach(stationId => {
    eventData.stationAssignments[stationId] = eventData.stationAssignments[stationId].filter(id => id !== participantId);
  });
  
  // Add to target station
  if (!eventData.stationAssignments[targetStationId]) {
    eventData.stationAssignments[targetStationId] = [];
  }
  eventData.stationAssignments[targetStationId].push(participantId);
  
  // Log the movement
  logActivity({
    participantId: participantId,
    activity: 'arrival',
    station: targetStationId,
    timestamp: new Date().toISOString(),
    userTime: new Date().toLocaleTimeString(),
    notes: 'Moved via drag and drop'
  });
  
  renderRaceTracker();
  saveData();
}

// Batch modal functions
function openBatchModal(stationId) {
  const modal = document.getElementById('batch-modal');
  if (!modal) return;
  
  // Store current station for the modal
  modal.dataset.currentStation = stationId;
  
  // Update modal title
  const station = eventData.aidStations.find(s => s.id === stationId);
  const modalTitle = modal.querySelector('.modal-header h3');
  if (modalTitle && station) {
    modalTitle.textContent = `Batch Entry - ${station.name}`;
  }
  
  // Clear and setup batch entries
  const batchEntries = document.getElementById('batch-entries');
  if (batchEntries) {
    batchEntries.innerHTML = `
      <div class="batch-entry">
        <label>Participants (comma separated)</label>
        <textarea id="batch-participants" placeholder="101, 102, 103, 50k Sweep" rows="3"></textarea>
        
        <label>Time (optional)</label>
        <input type="text" id="batch-time" placeholder="10:05 or leave blank for current time">
        
        <label>Notes (optional)</label>
        <input type="text" id="batch-notes" placeholder="Additional notes">
      </div>
    `;
  }
  
  modal.classList.remove('hidden');
  
  // Focus on participants input
  const participantsInput = document.getElementById('batch-participants');
  if (participantsInput) {
    participantsInput.focus();
  }
}

function submitBatchEntry() {
  const modal = document.getElementById('batch-modal');
  if (!modal) return;
  
  const stationId = modal.dataset.currentStation;
  const participantsInput = document.getElementById('batch-participants');
  const timeInput = document.getElementById('batch-time');
  const notesInput = document.getElementById('batch-notes');
  
  if (!participantsInput || !stationId) return;
  
  const participantsText = participantsInput.value.trim();
  if (!participantsText) {
    alert('Please enter at least one participant');
    return;
  }
  
  // Parse participants (comma separated)
  const participants = participantsText.split(',').map(p => p.trim()).filter(Boolean);
  const time = timeInput ? timeInput.value.trim() : '';
  const notes = notesInput ? notesInput.value.trim() : '';
  const currentTime = new Date().toLocaleTimeString();
  
  // Add participants to station and log activities
  participants.forEach(participantId => {
    // Remove from current station
    Object.keys(eventData.stationAssignments).forEach(sId => {
      eventData.stationAssignments[sId] = eventData.stationAssignments[sId].filter(id => id !== participantId);
    });
    
    // Add to target station
    if (!eventData.stationAssignments[stationId]) {
      eventData.stationAssignments[stationId] = [];
    }
    eventData.stationAssignments[stationId].push(participantId);
    
    // Create or update participant
    let participant = eventData.participants.find(p => p.id === participantId);
    if (!participant) {
      participant = { id: participantId, name: participantId, type: 'race', active: true };
      eventData.participants.push(participant);
    }
    
    // Log the activity
    logActivity({
      participantId: participantId,
      activity: 'arrival',
      station: stationId,
      timestamp: new Date().toISOString(),
      userTime: time || currentTime,
      notes: notes || 'Batch entry'
    });
  });
  
  saveData();
  renderRaceTracker();
  closeBatchModal();
  
  const station = eventData.aidStations.find(s => s.id === stationId);
  alert(`Added ${participants.length} participants to ${station ? station.name : stationId}`);
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
        { id: 'dns', name: 'DNS', isDefault: true }
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

function addBatchRow() {
  // To be implemented in next phase
  alert('Add batch row - to be implemented');
}

function togglePreview() {
  // To be implemented in next phase
  alert('Toggle preview - to be implemented');
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