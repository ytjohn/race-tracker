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
  
  // Only render race tracker if we have courses configured
  if (eventData.courses.length > 0) {
    renderRaceTracker();
  }
});

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
  
  coursesContainer.innerHTML = eventData.courses.map(course => `
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
        
        <div class="add-station-to-course">
          <select id="station-select-${course.id}">
            <option value="">Select aid station...</option>
            ${eventData.aidStations.map(station => 
              `<option value="${station.id}">${station.name}</option>`
            ).join('')}
          </select>
          <input type="number" placeholder="Distance from previous" id="distance-${course.id}" step="0.1" min="0">
          <button onclick="addStationToCourse('${course.id}')">Add Station</button>
        </div>
      </div>
    </div>
  `).join('');
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
  
  eventData.courses.push(newCourse);
  nameInput.value = '';
  
  renderCoursesSetup();
  updateNavigation();
  saveData();
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

// Race Tracker Functions (simplified version of original)
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
  
  kanbanBoard.innerHTML = eventData.aidStations.map(station => `
    <div class="column" data-station="${station.id}">
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
  `).join('');
  
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

// Simplified batch modal functions
function openBatchModal(stationId) {
  alert('Batch entry modal - to be implemented in next phase');
}

function showActivityLog() {
  alert('Activity log - to be implemented in next phase');
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

function submitBatchEntry() {
  // To be implemented in next phase
  alert('Submit batch entry - to be implemented');
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