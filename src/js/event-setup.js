// Event Setup Module
// Handles event details, aid stations, and courses configuration

// Initialize event setup module
function initializeEventSetup() {
  // Event setup is ready
  console.log('Event setup module initialized');
  
  // Setup auto-save for event details form
  setupEventDetailsAutoSave();
}

// Setup auto-save for event details
function setupEventDetailsAutoSave() {
  const eventInputs = [
    'event-name',
    'event-date', 
    'event-location',
    'event-description'
  ];
  
  eventInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      // Save on input change with debouncing
      let saveTimeout;
      input.addEventListener('input', function() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          saveEventDetails();
        }, 500); // 500ms debounce
      });
      
      // Also save on blur (when user moves away from field)
      input.addEventListener('blur', function() {
        clearTimeout(saveTimeout);
        saveEventDetails();
      });
    }
  });
}

// Event Setup Functions
function saveEventDetails() {
  if (!eventData) return;
  
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
  updatePageTitle();
}

// Aid Stations Setup Functions
function renderAidStationsSetup() {
  const customStationsList = document.getElementById('custom-stations-list');
  if (!customStationsList || !eventData) return;
  
  const customStations = eventData.aidStations.filter(station => !station.isDefault);
  
  customStationsList.innerHTML = customStations.map(station => `
    <div class="station-item">
      ${station.name}
      <button class="remove-btn" onclick="removeAidStation('${station.id}')" title="Remove station">×</button>
    </div>
  `).join('');
}

function addAidStation() {
  if (!eventData) return;
  
  const stationNameInput = document.getElementById('new-station-name');
  if (!stationNameInput) return;
  
  const stationName = stationNameInput.value.trim();
  if (!stationName) {
    alert('Please enter a station name');
    return;
  }
  
  // Check if station name already exists
  if (eventData.aidStations.some(station => station.name.toLowerCase() === stationName.toLowerCase())) {
    alert('A station with this name already exists');
    return;
  }
  
  const newStation = {
    id: generateId(),
    name: stationName,
    isDefault: false
  };
  
  eventData.aidStations.push(newStation);
  stationNameInput.value = '';
  
  saveData();
  renderAidStationsSetup();
  
  // Update courses setup if it exists
  if (window.renderCoursesSetup) {
    renderCoursesSetup();
  }
}

function removeAidStation(stationId) {
  if (!eventData) return;
  
  // Check if station is used in any course
  const isUsed = eventData.courses.some(course => 
    course.stations.some(cs => cs.stationId === stationId)
  );
  
  if (isUsed) {
    alert('Cannot remove station - it is being used in one or more courses');
    return;
  }
  
  eventData.aidStations = eventData.aidStations.filter(station => station.id !== stationId);
  
  saveData();
  renderAidStationsSetup();
}

function saveAidStations() {
  saveData();
}

// Courses Setup Functions
function renderCoursesSetup() {
  const coursesContainer = document.getElementById('courses-container');
  if (!coursesContainer || !eventData) return;
  
  coursesContainer.innerHTML = eventData.courses.map(course => `
    <div class="course-item">
      <div class="course-header">
        <span class="course-name">${course.name}</span>
        <button class="remove-course-btn" onclick="removeCourse('${course.id}')">Remove Course</button>
      </div>
      
      <div class="course-stations">
        <h4>Station Sequence</h4>
        <div class="station-sequence">
          ${course.stations.map((cs, index) => {
            const station = eventData.aidStations.find(s => s.id === cs.stationId);
            return `
              <div class="station-sequence-item">
                <div class="station-info">
                  <strong>${station ? station.name : 'Unknown Station'}</strong>
                  <div class="station-distance">
                    Distance: <input type="number" class="distance-input-inline" 
                           value="${cs.distance || 0}" step="0.1" min="0"
                           onchange="updateStationDistance('${course.id}', ${index}, this.value)"> miles
                    (Total: ${roundDistance(cs.cumulative || 0)} miles)
                  </div>
                </div>
                <div class="station-actions">
                  <button class="btn-insert" onclick="insertStationBefore('${course.id}', ${index})" title="Insert station before">+</button>
                  <button class="btn-remove" onclick="removeCourseStation('${course.id}', ${index})" title="Remove station">×</button>
                  <button class="btn-insert" onclick="insertStationAfter('${course.id}', ${index})" title="Insert station after">+</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="total-distance">
          <label for="total-distance-${course.id}">
            <strong>Total Course Distance:</strong>
            <input type="number" id="total-distance-${course.id}" 
                   class="distance-input-inline" 
                   value="${course.totalDistance || 0}" 
                   step="0.1" min="0" 
                   onchange="updateCourseTotalDistance('${course.id}', this.value)">
            miles
          </label>
          <div class="distance-help">
            <small>Total race distance from start to finish (may be beyond last aid station)</small>
          </div>
        </div>
        
        <div class="add-station-to-course">
          <select id="station-select-${course.id}">
            <option value="">Add Station</option>
            ${eventData.aidStations.map(station => `
              <option value="${station.id}">${station.name}</option>
            `).join('')}
          </select>
          <button class="btn btn-small" onclick="addStationToCourse('${course.id}')">Add</button>
        </div>
      </div>
    </div>
  `).join('');
  
  if (eventData.courses.length === 0) {
    coursesContainer.innerHTML = '<p>No courses configured. Add a course to get started.</p>';
  }
}

function addCourse() {
  if (!eventData) return;
  
  const courseNameInput = document.getElementById('new-course-name');
  if (!courseNameInput) return;
  
  const courseName = courseNameInput.value.trim();
  if (!courseName) {
    alert('Please enter a course name');
    return;
  }
  
  const newCourse = {
    id: generateId(),
    name: courseName,
    stations: [
      { stationId: 'start', distance: 0, cumulative: 0, cumulativeDistance: 0 }
    ],
    totalDistance: 0 // Set this to the full race distance (start to finish)
  };
  
  eventData.courses.push(newCourse);
  courseNameInput.value = '';
  
  saveData();
  renderCoursesSetup();
}

function removeCourse(courseId) {
  if (!eventData) return;
  
  if (confirm('Are you sure you want to remove this course?')) {
    eventData.courses = eventData.courses.filter(course => course.id !== courseId);
    
    // Remove participants assigned to this course
    eventData.participants = eventData.participants.filter(p => p.courseId !== courseId);
    
    saveData();
    renderCoursesSetup();
    
    if (window.renderParticipantsSetup) {
      renderParticipantsSetup();
    }
  }
}

function addStationToCourse(courseId) {
  if (!eventData) return;
  
  const selectElement = document.getElementById(`station-select-${courseId}`);
  if (!selectElement) return;
  
  const stationId = selectElement.value;
  if (!stationId) return;
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  // Add station with default distance
  course.stations.push({
    stationId: stationId,
    distance: 0,
    cumulative: 0,
    cumulativeDistance: 0
  });
  
  // Recalculate distances
  recalculateCourseDistances(courseId);
  
  selectElement.value = '';
  saveData();
  renderCoursesSetup();
}

function removeCourseStation(courseId, stationIndex) {
  if (!eventData) return;
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  // Don't allow removing the start station
  if (stationIndex === 0 && course.stations[0].stationId === 'start') {
    alert('Cannot remove the start station');
    return;
  }
  
  course.stations.splice(stationIndex, 1);
  recalculateCourseDistances(courseId);
  
  saveData();
  renderCoursesSetup();
}

function updateStationDistance(courseId, stationIndex, newDistance) {
  if (!eventData) return;
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course || !course.stations[stationIndex]) return;
  
  course.stations[stationIndex].distance = parseFloat(newDistance) || 0;
  recalculateCourseDistances(courseId);
  
  saveData();
  renderCoursesSetup();
}

function updateCourseTotalDistance(courseId, newTotalDistance) {
  if (!eventData) return;
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  course.totalDistance = parseFloat(newTotalDistance) || 0;
  
  saveData();
  
  // Recalculate pace data if pace tracker is available
  if (window.paceTracker && window.paceTracker.calculateAllPaces) {
    window.paceTracker.calculateAllPaces();
    window.paceTracker.calculateAllETAs();
    if (window.paceTracker.updateBibCardColors) {
      window.paceTracker.updateBibCardColors();
    }
  }
  
  console.log(`Updated total distance for ${course.name}: ${course.totalDistance} miles`);
}

function insertStationBefore(courseId, stationIndex) {
  showInsertStationModal(courseId, stationIndex);
}

function insertStationAfter(courseId, stationIndex) {
  showInsertStationModal(courseId, stationIndex + 1);
}

function showInsertStationModal(courseId, insertIndex) {
  // Simple prompt for now - could be enhanced with a proper modal
  const stationOptions = eventData.aidStations.map(s => `${s.name} (${s.id})`).join('\n');
  const stationName = prompt(`Insert station at position ${insertIndex + 1}:\n\nAvailable stations:\n${stationOptions}\n\nEnter station name:`);
  
  if (stationName) {
    const station = eventData.aidStations.find(s => 
      s.name.toLowerCase() === stationName.toLowerCase() || s.id === stationName
    );
    
    if (station) {
      const course = eventData.courses.find(c => c.id === courseId);
      if (course) {
        course.stations.splice(insertIndex, 0, {
          stationId: station.id,
          distance: 0,
          cumulative: 0
        });
        
        recalculateCourseDistances(courseId);
        saveData();
        renderCoursesSetup();
      }
    } else {
      alert('Station not found');
    }
  }
}

function recalculateCourseDistances(courseId) {
  if (!eventData) return;
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  let cumulative = 0;
  course.stations.forEach((station, index) => {
    if (index === 0) {
      station.cumulative = 0;
      station.cumulativeDistance = 0;
    } else {
      cumulative += parseFloat(station.distance) || 0;
      station.cumulative = roundDistance(cumulative);
      station.cumulativeDistance = roundDistance(cumulative);
    }
  });
  
  course.totalDistance = roundDistance(cumulative);
}

function saveCourses() {
  saveData();
}

// Make functions globally accessible
window.addAidStation = addAidStation;
window.removeAidStation = removeAidStation;
window.addCourse = addCourse;
window.removeCourse = removeCourse;
window.addStationToCourse = addStationToCourse;
window.removeCourseStation = removeCourseStation;
window.updateStationDistance = updateStationDistance;
window.insertStationBefore = insertStationBefore;
window.insertStationAfter = insertStationAfter;