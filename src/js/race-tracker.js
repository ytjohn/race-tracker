// Race Tracker Module
// Handles the race tracking kanban board, drag-and-drop, and batch entry system

// Batch entry state
let batchEntries = [];
let isPreviewMode = false;

// Initialize race tracker module
function initializeRaceTracker() {
  console.log('Race tracker module initialized');
  
  // Initialize pace tracking if available
  if (window.paceTracker && window.paceTracker.initialize) {
    window.paceTracker.initialize();
  }
}

// Test function for debugging
function testBatchModal() {
  console.log('Testing batch modal...');
  const modal = document.getElementById('batch-modal');
  console.log('Modal found:', modal);
  if (modal) {
    modal.classList.remove('hidden');
    console.log('Modal should now be visible');
  }
}

// Make test function globally accessible
window.testBatchModal = testBatchModal;

// Helper function to get station name by ID
function getStationName(stationId) {
  if (!eventData || !eventData.aidStations) return stationId;
  const station = eventData.aidStations.find(s => s.id === stationId);
  return station ? station.name : stationId;
}

// Helper function to get current participant station
function getCurrentParticipantStation(participantId) {
  if (!eventData || !eventData.stationAssignments) return null;
  
  for (const stationId of Object.keys(eventData.stationAssignments)) {
    if ((eventData.stationAssignments[stationId] || []).includes(participantId)) {
      return stationId;
    }
  }
  return null;
}

// Helper function to check if participant has departed from their current station
function hasParticipantDeparted(participantId) {
  if (!eventData || !eventData.activityLog) return false;
  
  const currentStation = getCurrentParticipantStation(participantId);
  if (!currentStation) return false;
  
  // Find the most recent activity for this participant at their current station
  const participantActivities = eventData.activityLog
    .filter(entry => entry.participantId === participantId && entry.stationId === currentStation)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  if (participantActivities.length === 0) return false;
  
  // Check if the most recent activity is a departure
  const mostRecentActivity = participantActivities[0];
  return mostRecentActivity.activityType === 'departed';
}

// Helper function to validate if a participant can depart from a station
function canParticipantDepartFromStation(participantId, stationId) {
  if (!eventData || !eventData.activityLog) return { valid: false, reason: 'No activity log available' };
  
  // Get all activities for this participant at this station, sorted by time
  const stationActivities = eventData.activityLog
    .filter(entry => entry.participantId === participantId && entry.stationId === stationId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  if (stationActivities.length === 0) {
    return { valid: false, reason: 'Participant has not arrived at this station' };
  }
  
  // Check the most recent activity at this station
  const mostRecentActivity = stationActivities[stationActivities.length - 1];
  
  if (mostRecentActivity.activityType === 'departed') {
    return { valid: false, reason: 'Participant has already departed from this station' };
  }
  
  if (mostRecentActivity.activityType === 'arrival') {
    return { valid: true, reason: 'Valid departure - participant has arrived and not yet departed' };
  }
  
  return { valid: false, reason: 'Invalid station activity state' };
}

// Helper function to analyze participant move for course progression
function analyzeParticipantMove(participant, targetStationId, currentStationId, activityType = 'arrival') {
  if (!participant || !participant.courseId) {
    return {
      status: 'error',
      message: 'Participant not assigned to a course'
    };
  }
  
  const course = eventData.courses.find(c => c.id === participant.courseId);
  if (!course) {
    return {
      status: 'error',
      message: 'Participant course not found'
    };
  }
  
  // Special handling for departures
  if (activityType === 'departed') {
    const departureValidation = canParticipantDepartFromStation(participant.id, targetStationId);
    return {
      status: departureValidation.valid ? 'valid' : 'error',
      message: departureValidation.reason
    };
  }
  
  // DNF and DNS can be reached from anywhere
  const flexibleStations = ['dnf', 'dns'];
  if (flexibleStations.includes(targetStationId)) {
    return {
      status: 'valid',
      message: 'Valid transition to status station'
    };
  }
  
  // Check if target station is in participant's course
  const targetStationIndex = course.stations.findIndex(cs => cs.stationId === targetStationId);
  if (targetStationIndex === -1) {
    return {
      status: 'error',
      message: 'Station not in participant course'
    };
  }
  
  // If no current station (not started), any station is potentially valid
  if (!currentStationId) {
    return targetStationId === 'start' ? {
      status: 'valid',
      message: 'Valid start position'
    } : {
      status: 'warning',
      message: 'Starting at non-start station'
    };
  }
  
  // Check current station position in course
  const currentStationIndex = course.stations.findIndex(cs => cs.stationId === currentStationId);
  if (currentStationIndex === -1) {
    // Current station not in course (e.g., DNF/DNS)
    return {
      status: 'warning',
      message: 'Moving from status station'
    };
  }
  
  // Check progression order
  if (targetStationIndex <= currentStationIndex) {
    return {
      status: 'warning',
      message: 'Moving backwards or to same station'
    };
  }
  
  // Check if skipping stations (more than 1 station ahead)
  if (targetStationIndex > currentStationIndex + 1) {
    const skippedCount = targetStationIndex - currentStationIndex - 1;
    const skippedStations = course.stations
      .slice(currentStationIndex + 1, targetStationIndex)
      .map(cs => getStationName(cs.stationId))
      .join(', ');
    
    return {
      status: 'warning',
      message: `Skipping ${skippedCount} station${skippedCount > 1 ? 's' : ''}: ${skippedStations}`
    };
  }
  
  // Valid forward progression
  return {
    status: 'valid',
    message: 'Valid course progression'
  };
}

// Helper function to get analysis icon
function getAnalysisIcon(status) {
  const icons = {
    valid: '✅',
    warning: '⚠️',
    error: '❌'
  };
  return icons[status] || '';
}

// Helper function to update participant tags display with enhanced information
function updateParticipantTagsDisplay(entryId) {
  const entry = batchEntries.find(e => e.id === entryId);
  const tagsContainer = document.getElementById(`tags-${entryId}`);
  if (!entry || !tagsContainer) return;
  
  const targetStationId = entry.stationId;
  const activityType = entry.action ? entry.action.toLowerCase() : 'arrival';
  
  tagsContainer.innerHTML = entry.participants.map(participantId => {
    const participant = eventData.participants.find(p => p.id === participantId);
    if (!participant) return `
      <span class="tag">
        ${participantId}
        <button type="button" onclick="removeParticipantFromEntry('${entryId}', '${participantId}')">&times;</button>
      </span>
    `;
    
    const currentStation = getCurrentParticipantStation(participantId);
    const course = eventData.courses.find(c => c.id === participant.courseId);
    const courseName = course ? course.name : 'No Course';
    const stationName = currentStation ? getStationName(currentStation) : 'Not Started';
    
    // Analyze course progression for this participant
    const analysis = targetStationId ? analyzeParticipantMove(participant, targetStationId, currentStation, activityType) : null;
    const analysisClass = analysis ? `course-analysis-${analysis.status}` : '';
    const analysisIcon = analysis ? getAnalysisIcon(analysis.status) : '';
    
    return `
      <span class="tag ${analysisClass}" title="${analysis ? analysis.message : ''}">
        <div class="tag-content">
          <span class="tag-id">${participant.id}</span>
          <span class="tag-course">${courseName}</span>
          <span class="tag-station">${stationName}</span>
          ${analysis ? `<span class="tag-analysis">${analysisIcon}</span>` : ''}
        </div>
        <button type="button" onclick="removeParticipantFromEntry('${entryId}', '${participantId}')">&times;</button>
      </span>
    `;
  }).join('');
}

// Render the race tracker kanban board
function renderRaceTracker() {
  if (!eventData) return;
  
  const kanbanBoard = document.getElementById('kanban-board');
  if (!kanbanBoard) return;
  
  // Initialize station assignments if not exists
  if (!eventData.stationAssignments) {
    eventData.stationAssignments = {};
    // Put all participants at start initially
    if (eventData.participants.length > 0) {
      eventData.stationAssignments['start'] = eventData.participants.map(p => p.id);
    }
  }
  
  // Initialize and update pace data if available
  if (window.paceTracker) {
    if (window.paceTracker.initialize) {
      window.paceTracker.initialize();
    }
    window.paceTracker.calculateAllPaces();
    window.paceTracker.calculateAllETAs();
  }
  
  // Group stations by course and shared stations
  const courseStations = {};
  const sharedStations = ['dnf', 'dns'];
  
  // Organize stations by course
  eventData.courses.forEach(course => {
    courseStations[course.id] = course.stations.map(cs => cs.stationId);
  });
  
  let html = '';
  
  // Render course swimlanes
  eventData.courses.forEach((course, courseIndex) => {
    const courseClass = `course-${courseIndex + 1}`;
    const courseParticipants = eventData.participants.filter(p => p.courseId === course.id);
    
    html += `
      <div class="course-swimlane ${courseClass}">
        <div class="course-swimlane-header">
          <h3>${course.name}</h3>
          <div class="course-stats">
            ${courseParticipants.length} participants • ${roundDistance(course.totalDistance || 0)} miles
          </div>
        </div>
        <div class="course-stations">
          ${courseStations[course.id].map(stationId => {
            const station = eventData.aidStations.find(s => s.id === stationId);
            if (!station) return '';
            
            const stationParticipants = (eventData.stationAssignments[stationId] || [])
              .filter(participantId => {
                const participant = eventData.participants.find(p => p.id === participantId);
                return participant && participant.courseId === course.id;
              });
            
            return renderStationColumn(station, stationParticipants, courseClass, false);
          }).join('')}
        </div>
      </div>
    `;
  });
  
  // Render shared status stations
  html += `
    <div class="shared-stations">
      <div class="shared-stations-header">
        <h3>Status Stations</h3>
        <div class="shared-stats">
          Available to all courses
        </div>
      </div>
      <div class="shared-stations-row">
        ${sharedStations.map(stationId => {
          const station = eventData.aidStations.find(s => s.id === stationId);
          if (!station) return '';
          
          const stationParticipants = eventData.stationAssignments[stationId] || [];
          
          return renderStationColumn(station, stationParticipants, 'shared', true);
        }).join('')}
      </div>
    </div>
  `;
  
  kanbanBoard.innerHTML = html;
  
  // Add drag and drop handlers
  addDragAndDropHandlers();
  
  // Apply pace-based colors if available
  if (window.paceTracker) {
    setTimeout(() => {
      window.paceTracker.updateBibCardColors();
    }, 100);
  }
  
  // Add pace legend toggle
  setTimeout(() => {
    addPaceLegendToggle();
  }, 100);
}

// Render a station column
function renderStationColumn(station, participantIds, courseClass, isShared) {
  const stationClass = isShared ? 'shared-station' : 'course-station';
  
  // Add bulk departure button for Start station
  const bulkDepartureButton = station.id === 'start' && participantIds.length > 0 ? 
    `<span class="bulk-departure-btn" onclick="event.stopPropagation(); bulkDepartureFromStart('${station.id}', '${courseClass}')" title="Mark all as departed">⏱️</span>` : '';
  
  // Add pace sorting indicator
  const paceSortingIndicator = participantIds.length > 1 ? 
    `<span class="sorting-indicator" title="Sorted by pace (fastest first)">🏃</span>` : '';
  
  return `
    <div class="column ${stationClass} ${courseClass}" 
         data-station="${station.id}" 
         data-course-class="${courseClass}">
      <div class="column-header" onclick="openBatchModal('${station.id}')">
        <span>${station.name}</span>
        <div class="column-actions">
          <span class="add-icon">+</span>
          ${bulkDepartureButton}
          ${paceSortingIndicator}
        </div>
        <div class="participant-count">${participantIds.length}</div>
      </div>
      <div class="column-body">
        ${renderParticipantGrid(participantIds, courseClass)}
      </div>
    </div>
  `;
}

// Render participants in compact grid layout
function renderParticipantGrid(participantIds, courseClass) {
  if (!participantIds.length) return '';
  
  // Sort participants by pace if pace tracker is available
  let sortedParticipants = participantIds;
  if (window.paceTracker && window.paceTracker.sortParticipantsByPace) {
    sortedParticipants = window.paceTracker.sortParticipantsByPace(participantIds);
  }
  
  return sortedParticipants.map(participantId => {
    const participant = eventData.participants.find(p => p.id === participantId);
    if (!participant) return '';
    
    const hasDeparted = hasParticipantDeparted(participantId);
    const departedClass = hasDeparted ? 'departed' : '';
    const departedIndicator = hasDeparted ? '→' : '';
    
    // Get pace-based color class if available
    let paceColorClass = '';
    if (window.paceTracker && window.paceTracker.getPaceColorClass) {
      paceColorClass = window.paceTracker.getPaceColorClass(participantId);
    }
    
    return `
      <div class="bib-card ${courseClass} ${departedClass} ${paceColorClass}" 
           draggable="true" 
           data-participant-id="${participantId}"
           title="${participant.name}${hasDeparted ? ' (Departed)' : ''}">
        ${participant.id}${departedIndicator}
      </div>
    `;
  }).join('');
}

// Add drag and drop functionality
function addDragAndDropHandlers() {
  // Add event listeners to draggable items
  document.querySelectorAll('.bib-card').forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
  
  // Add event listeners to drop zones
  document.querySelectorAll('.column').forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
}

// Drag event handlers
function handleDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.getAttribute('data-participant-id'));
  e.target.classList.add('dragging');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDragEnter(e) {
  e.preventDefault();
  if (e.target.closest('.column')) {
    e.target.closest('.column').classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  if (e.target.closest('.column') && !e.target.closest('.column').contains(e.relatedTarget)) {
    e.target.closest('.column').classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  const column = e.target.closest('.column');
  if (!column) return;
  
  column.classList.remove('drag-over');
  
  const participantId = e.dataTransfer.getData('text/plain');
  const targetStationId = column.getAttribute('data-station');
  
  if (participantId && targetStationId) {
    moveParticipant(participantId, targetStationId);
  }
}

// Move participant to a station
function moveParticipant(participantId, targetStationId) {
  if (!eventData) return;
  
  const participant = eventData.participants.find(p => p.id === participantId);
  if (!participant) return;
  
  // Find current station
  let currentStationId = null;
  Object.keys(eventData.stationAssignments).forEach(stationId => {
    if ((eventData.stationAssignments[stationId] || []).includes(participantId)) {
      currentStationId = stationId;
    }
  });
  
  // Silent no-op if dropping on same station
  if (currentStationId === targetStationId) {
    return;
  }
  
  let finalStationId = targetStationId;
  let notes = null; // No automatic notes
  let isSuspectMove = false;
  
  // Check if move is valid (course restrictions)
  const sharedStations = ['dnf', 'dns'];
  const isTargetShared = sharedStations.includes(targetStationId);
  
  if (!isTargetShared && !isStationInCourse(targetStationId, participant.courseId)) {
    // Invalid move - show error and cancel
    alert(`❌ INVALID MOVE: ${participant.name} cannot be moved to ${getStationName(targetStationId)} - not part of their course.`);
    return; // Cancel the move
  }
  
  // Remove from current station
  Object.keys(eventData.stationAssignments).forEach(stationId => {
    eventData.stationAssignments[stationId] = (eventData.stationAssignments[stationId] || [])
      .filter(id => id !== participantId);
  });
  
  // Add to final station
  if (!eventData.stationAssignments[finalStationId]) {
    eventData.stationAssignments[finalStationId] = [];
  }
  eventData.stationAssignments[finalStationId].push(participantId);
  
  // Log the activity
  logActivity({
    participantId: participantId,
    activityType: 'arrival',
    stationId: finalStationId,
    priorStationId: currentStationId,
    notes: notes
  });
  
  // Recalculate pace and ETA for this participant
  if (window.paceTracker) {
    setTimeout(() => {
      window.paceTracker.calculateAllPaces();
      window.paceTracker.calculateAllETAs();
      window.paceTracker.updateBibCardColors();
    }, 100);
  }
  
  saveData();
  renderRaceTracker();
}

// Open batch entry modal
function openBatchModal(stationId) {
  console.log('openBatchModal called with stationId:', stationId);
  const modal = document.getElementById('batch-modal');
  console.log('Modal element found:', modal);
  if (!modal) {
    console.error('Batch modal not found!');
    return;
  }
  
  // Reset state
  batchEntries = [];
  isPreviewMode = false;
  
  // Add initial entry
  addBatchRow();
  
  // Set default station for new entries
  batchEntries[0].stationId = stationId;
  
  console.log('Removing hidden class from modal');
  modal.classList.remove('hidden');
  console.log('Modal classes after removing hidden:', modal.className);
  renderBatchEntries();
}

// Make function globally accessible
window.openBatchModal = openBatchModal;

// Bulk departure function for Start station
function bulkDepartureFromStart(stationId, courseClass) {
  if (!eventData || stationId !== 'start') return;
  
  // Get all participants at the start station for this course
  const startParticipants = (eventData.stationAssignments[stationId] || [])
    .filter(participantId => {
      const participant = eventData.participants.find(p => p.id === participantId);
      if (!participant) return false;
      
      // Check if participant belongs to the course based on courseClass
      const course = eventData.courses.find(c => c.id === participant.courseId);
      if (!course) return false;
      
      // Match course class (course-1, course-2, etc.)
      const courseIndex = eventData.courses.indexOf(course) + 1;
      return courseClass === `course-${courseIndex}`;
    });
  
  if (startParticipants.length === 0) {
    alert('No participants found at Start for this course.');
    return;
  }
  
  // Confirm bulk departure
  const courseName = eventData.courses.find((course, index) => {
    const courseIndex = index + 1;
    return courseClass === `course-${courseIndex}`;
  })?.name || 'Unknown Course';
  
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const timePrompt = prompt(
    `Mark all ${startParticipants.length} participants in ${courseName} as departed from Start?\n\nEnter departure time (HH:MM format, or leave blank for ${currentTime}):`,
    currentTime
  );
  
  if (timePrompt === null) return; // User cancelled
  
  const departureTime = timePrompt.trim() || currentTime;
  
  // Validate time format
  if (!/^\d{1,2}:\d{2}$/.test(departureTime)) {
    alert('Invalid time format. Please use HH:MM format (e.g., 09:30)');
    return;
  }
  
  // Parse the departure time to a proper Date object
  const parsedTime = parseTimeInput(departureTime);
  
  // Log departure for each participant
  startParticipants.forEach(participantId => {
    logActivity({
      participantId: participantId,
      activityType: 'departed',
      stationId: stationId,
      priorStationId: null,
      notes: `Bulk departure - ${courseName}`,
      userTime: parsedTime.toISOString()
    });
  });
  
  alert(`✅ Marked ${startParticipants.length} participants as departed from Start at ${departureTime}`);
  
  saveData();
  renderRaceTracker();
}

// Make function globally accessible
window.bulkDepartureFromStart = bulkDepartureFromStart;

// Add a new batch entry row
function addBatchRow() {
  const newEntry = {
    id: generateId(),
    stationId: batchEntries.length > 0 ? batchEntries[batchEntries.length - 1].stationId : 'start',
    updateType: batchEntries.length > 0 ? batchEntries[batchEntries.length - 1].updateType : 'Race Update',
    action: 'Arrived',
    participants: [],
    time: '',
    notes: ''
  };
  
  batchEntries.push(newEntry);
  renderBatchEntries();
  
  // Focus on the new entry
  setTimeout(() => {
    const newRow = document.querySelector(`[data-entry-id="${newEntry.id}"]`);
    if (newRow) {
      const firstInput = newRow.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }
  }, 100);
}

// Remove a batch entry row
function removeBatchRow(entryId) {
  batchEntries = batchEntries.filter(entry => entry.id !== entryId);
  renderBatchEntries();
}

// Render batch entries
function renderBatchEntries() {
  console.log('renderBatchEntries called');
  const batchEntriesContainer = document.getElementById('batch-entries');
  console.log('Batch entries container found:', batchEntriesContainer);
  if (!batchEntriesContainer) {
    console.error('Batch entries container not found!');
    return;
  }
  
  if (isPreviewMode) {
    renderBatchPreview();
    return;
  }
  
  console.log('eventData available:', !!eventData);
  console.log('batchEntries length:', batchEntries.length);
  
  const html = batchEntries.map((entry, index) => `
    <div class="batch-entry-row" data-entry-id="${entry.id}">
      <div class="batch-entry-header">
        <h4>Entry ${index + 1}</h4>
        <button class="btn btn-small btn-danger" onclick="removeBatchRow('${entry.id}')">Remove</button>
      </div>
      
      <div class="batch-entry-form">
        <div class="form-row">
          <div class="form-col">
            <label>Station</label>
            <select onchange="updateBatchEntry('${entry.id}', 'stationId', this.value)">
              ${eventData.aidStations.map(station => 
                `<option value="${station.id}" ${station.id === entry.stationId ? 'selected' : ''}>${station.name}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-col">
            <label>Update Type</label>
            <select onchange="updateBatchEntry('${entry.id}', 'updateType', this.value)">
              <option value="Race Update" ${entry.updateType === 'Race Update' ? 'selected' : ''}>Race Update</option>
              <option value="Race Message" ${entry.updateType === 'Race Message' ? 'selected' : ''}>Race Message</option>
            </select>
          </div>
          
          ${entry.updateType === 'Race Update' ? `
            <div class="form-col">
              <label>Action</label>
              <select onchange="updateBatchEntry('${entry.id}', 'action', this.value)">
                <option value="Arrived" ${entry.action === 'Arrived' ? 'selected' : ''}>Arrived</option>
                <option value="Departed" ${entry.action === 'Departed' ? 'selected' : ''}>Departed</option>
              </select>
            </div>
          ` : ''}
          
          <div class="form-col">
            <label>Time (optional)</label>
            <input type="text" placeholder="e.g., 10:30, 1430, 2PM" 
                   value="${entry.time}"
                   onchange="updateBatchEntry('${entry.id}', 'time', this.value)">
          </div>
        </div>
        
        ${entry.updateType === 'Race Update' ? `
          <div class="form-row">
            <div class="form-col-full">
              <label>Participants (comma separated)</label>
              <div class="tags-input-container">
                <div class="tags-display" id="tags-${entry.id}">
                  ${entry.participants.map(p => `
                    <span class="tag">
                      ${p}
                      <button type="button" onclick="removeParticipantFromEntry('${entry.id}', '${p}')">&times;</button>
                    </span>
                  `).join('')}
                </div>
                <input type="text" class="participant-input" 
                       placeholder="Enter participant ID/name..."
                       onkeydown="handleParticipantInput(event, '${entry.id}')"
                       oninput="showParticipantSuggestions(event, '${entry.id}')"
                       onfocus="showParticipantSuggestions(event, '${entry.id}')"
                       onblur="hideParticipantSuggestions()">
                <div class="autocomplete-suggestions" id="suggestions-${entry.id}"></div>
              </div>
            </div>
          </div>
        ` : ''}
        
        <div class="form-row">
          <div class="form-col-full">
            <label>${entry.updateType === 'Race Update' ? 'Notes (optional)' : 'Message'}</label>
            <textarea rows="2" placeholder="${entry.updateType === 'Race Update' ? 'Additional notes...' : 'Enter message...'}"
                      onchange="updateBatchEntry('${entry.id}', 'notes', this.value)">${entry.notes}</textarea>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  batchEntriesContainer.innerHTML = html;
}

// Render batch preview
function renderBatchPreview() {
  const batchEntriesContainer = document.getElementById('batch-entries');
  if (!batchEntriesContainer) return;
  
  const html = batchEntries.map((entry, index) => {
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    const parsedTime = parseTimeInput(entry.time);
    
    return `
      <div class="preview-entry">
        <div class="preview-header">
          <strong>Entry ${index + 1}</strong>
          <span class="preview-time">${formatTime(parsedTime)}</span>
        </div>
        <div class="preview-station">${station ? station.name : 'Unknown Station'}</div>
        ${entry.updateType === 'Race Update' ? `
          <div class="preview-action">${entry.action}</div>
          <div class="preview-participants">
            ${entry.participants.map(p => `<span class="preview-participant">${p}</span>`).join('')}
          </div>
        ` : ''}
        ${entry.notes ? `<div class="preview-message">${entry.notes}</div>` : ''}
      </div>
    `;
  }).join('');
  
  batchEntriesContainer.innerHTML = html;
}

// Update batch entry field
function updateBatchEntry(entryId, field, value) {
  const entry = batchEntries.find(e => e.id === entryId);
  if (entry) {
    entry[field] = value;
    
    // Re-render if changing update type to show/hide fields
    if (field === 'updateType') {
      renderBatchEntries();
    }
  }
}

// Handle participant input with autocomplete
function handleParticipantInput(event, entryId) {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',') {
    event.preventDefault();
    const input = event.target;
    const participantId = input.value.trim().replace(/,$/, '');
    
    if (participantId) {
      addParticipantToEntry(entryId, participantId);
      input.value = '';
      hideParticipantSuggestions();
    }
  }
}

// Add participant to entry
function addParticipantToEntry(entryId, participantId) {
  const entry = batchEntries.find(e => e.id === entryId);
  if (!entry) return;
  
  // Avoid duplicates
  if (entry.participants.includes(participantId)) return;
  
  entry.participants.push(participantId);
  
  // Create participant if doesn't exist
  if (!eventData.participants.find(p => p.id === participantId)) {
    const newParticipant = {
      id: participantId,
      name: participantId,
      type: 'race',
      active: true,
      courseId: null // Will need to be assigned later
    };
    eventData.participants.push(newParticipant);
  }
  
  // Update the tags display with enhanced information
  updateParticipantTagsDisplay(entryId);
}

// Remove participant from entry
function removeParticipantFromEntry(entryId, participantId) {
  const entry = batchEntries.find(e => e.id === entryId);
  if (!entry) return;
  
  entry.participants = entry.participants.filter(p => p !== participantId);
  
  // Update the tags display with enhanced information
  updateParticipantTagsDisplay(entryId);
}

// Show participant suggestions with course analysis
function showParticipantSuggestions(event, entryId) {
  const input = event.target;
  const suggestionsContainer = document.getElementById(`suggestions-${entryId}`);
  if (!suggestionsContainer) return;
  
  const query = input.value.toLowerCase().trim();
  
  // Filter participants based on query (only show if query has content)
  let suggestions = [];
  if (query.length > 0) {
    suggestions = eventData.participants
      .filter(p => 
        p.id.toLowerCase().includes(query) || 
        p.name.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }
  
  if (suggestions.length > 0) {
    const entry = batchEntries.find(e => e.id === entryId);
    const targetStationId = entry ? entry.stationId : null;
    const activityType = entry && entry.action ? entry.action.toLowerCase() : 'arrival';
    
    suggestionsContainer.innerHTML = suggestions.map(p => {
      const currentStation = getCurrentParticipantStation(p.id);
      const course = eventData.courses.find(c => c.id === p.courseId);
      const courseName = course ? course.name : 'No Course';
      const stationName = currentStation ? getStationName(currentStation) : 'Not Started';
      
      // Analyze course progression for this potential move
      const analysis = targetStationId ? analyzeParticipantMove(p, targetStationId, currentStation, activityType) : null;
      const analysisClass = analysis ? `course-analysis-${analysis.status}` : '';
      const analysisIcon = analysis ? getAnalysisIcon(analysis.status) : '';
      
      return `
        <div class="suggestion-item ${analysisClass}" 
             onclick="selectParticipantSuggestion('${entryId}', '${p.id}', this)"
             title="${analysis ? analysis.message : ''}">
          <div class="suggestion-content">
            <span class="suggestion-id">${p.id}</span>
            <span class="suggestion-course">${courseName}</span>
            <span class="suggestion-station">${stationName}</span>
          </div>
          ${analysis ? `<div class="suggestion-analysis">${analysisIcon}</div>` : ''}
        </div>
      `;
    }).join('');
    suggestionsContainer.style.display = 'block';
  } else {
    suggestionsContainer.style.display = 'none';
  }
}

// Select participant suggestion
function selectParticipantSuggestion(entryId, participantId, element) {
  addParticipantToEntry(entryId, participantId);
  
  // Clear input
  const input = element.closest('.tags-input-container').querySelector('.participant-input');
  if (input) input.value = '';
  
  hideParticipantSuggestions();
}

// Hide participant suggestions
function hideParticipantSuggestions() {
  setTimeout(() => {
    document.querySelectorAll('.autocomplete-suggestions').forEach(container => {
      container.style.display = 'none';
    });
  }, 200);
}

// Toggle preview mode
function togglePreview() {
  isPreviewMode = !isPreviewMode;
  const previewBtn = document.getElementById('preview-btn');
  
  if (previewBtn) {
    previewBtn.textContent = isPreviewMode ? 'Edit' : 'Preview';
  }
  
  renderBatchEntries();
}

// Submit batch entry
function submitBatchEntry() {
  if (batchEntries.length === 0) {
    alert('No entries to submit');
    return;
  }
  
  let processedCount = 0;
  
  batchEntries.forEach(entry => {
    const parsedTime = parseTimeInput(entry.time);
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    
    if (entry.updateType === 'Race Update' && entry.participants.length > 0) {
      entry.participants.forEach(participantId => {
        // Move participant to station
        Object.keys(eventData.stationAssignments).forEach(stationId => {
          eventData.stationAssignments[stationId] = (eventData.stationAssignments[stationId] || [])
            .filter(id => id !== participantId);
        });
        
        if (!eventData.stationAssignments[entry.stationId]) {
          eventData.stationAssignments[entry.stationId] = [];
        }
        eventData.stationAssignments[entry.stationId].push(participantId);
        
        // Log activity
        logActivity({
          participantId: participantId,
          activityType: entry.action.toLowerCase(),
          stationId: entry.stationId,
          userTime: parsedTime.toISOString(),
          notes: entry.notes
        });
        
        processedCount++;
      });
    } else if (entry.updateType === 'Race Message') {
      // Log message
      logActivity({
        participantId: null,
        activityType: 'other',
        stationId: entry.stationId,
        userTime: parsedTime.toISOString(),
        notes: entry.notes
      });
      
      processedCount++;
    }
  });
  
  saveData();
  
  // Recalculate pace and ETA data after batch update
  if (window.paceTracker) {
    setTimeout(() => {
      window.paceTracker.calculateAllPaces();
      window.paceTracker.calculateAllETAs();
      window.paceTracker.updateBibCardColors();
      window.paceTracker.updateBibCardSorting();
    }, 100);
  }
  
  renderRaceTracker();
  closeBatchModal();
  
  // Show refresh indicator
  showRefreshIndicator();
  
  alert(`Processed ${processedCount} updates successfully!`);
}

// Close batch modal
function closeBatchModal() {
  const modal = document.getElementById('batch-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  
  batchEntries = [];
  isPreviewMode = false;
}

// Make functions globally accessible
window.closeBatchModal = closeBatchModal;
window.removeBatchRow = removeBatchRow;
window.updateBatchEntry = updateBatchEntry;
window.handleParticipantInput = handleParticipantInput;
window.addParticipantToEntry = addParticipantToEntry;
window.removeParticipantFromEntry = removeParticipantFromEntry;
window.showParticipantSuggestions = showParticipantSuggestions;
window.selectParticipantSuggestion = selectParticipantSuggestion;
window.hideParticipantSuggestions = hideParticipantSuggestions;
window.togglePreview = togglePreview;
window.submitBatchEntry = submitBatchEntry;
window.addBatchRow = addBatchRow;

// Add pace legend toggle functionality
function addPaceLegendToggle() {
  // Remove existing legend and toggle
  const existingLegend = document.getElementById('pace-legend');
  const existingToggle = document.getElementById('pace-legend-toggle');
  
  if (existingLegend) existingLegend.remove();
  if (existingToggle) existingToggle.remove();
  
  // Only add if we're on the race tracker page
  if (currentPage !== 'race-tracker') return;
  
  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.id = 'pace-legend-toggle';
  toggleButton.className = 'pace-legend-toggle';
  toggleButton.innerHTML = '🏃';
  toggleButton.title = 'Toggle pace legend';
  
  let isLegendVisible = false;
  
  toggleButton.addEventListener('click', () => {
    if (isLegendVisible) {
      hidePaceLegend();
      toggleButton.classList.remove('active');
      isLegendVisible = false;
    } else {
      showPaceLegend();
      toggleButton.classList.add('active');
      isLegendVisible = true;
    }
  });
  
  document.body.appendChild(toggleButton);
}

// Show pace legend
function showPaceLegend() {
  const existingLegend = document.getElementById('pace-legend');
  if (existingLegend) existingLegend.remove();
  
  const legend = document.createElement('div');
  legend.id = 'pace-legend';
  legend.className = 'pace-legend';
  legend.innerHTML = `
    <div class="pace-legend-title">Pace Status</div>
    <div class="pace-legend-item">
      <div class="pace-legend-color overdue"></div>
      <div class="pace-legend-text">Overdue</div>
    </div>
    <div class="pace-legend-item">
      <div class="pace-legend-color arriving-soon"></div>
      <div class="pace-legend-text">Arriving Soon</div>
    </div>
    <div class="pace-legend-item">
      <div class="pace-legend-color arriving-later"></div>
      <div class="pace-legend-text">Within Hour</div>
    </div>
    <div class="pace-legend-item">
      <div class="pace-legend-color on-track"></div>
      <div class="pace-legend-text">On Track</div>
    </div>
  `;
  
  document.body.appendChild(legend);
}

// Hide pace legend
function hidePaceLegend() {
  const legend = document.getElementById('pace-legend');
  if (legend) legend.remove();
}

// Show refresh indicator
function showRefreshIndicator() {
  const existingIndicator = document.getElementById('refresh-indicator');
  if (existingIndicator) existingIndicator.remove();
  
  const indicator = document.createElement('div');
  indicator.id = 'refresh-indicator';
  indicator.className = 'refresh-indicator';
  indicator.innerHTML = 'Pace data updated';
  
  document.body.appendChild(indicator);
  
  setTimeout(() => {
    indicator.remove();
  }, 3000);
}

 