// Race Tracker Module
// Handles the race tracking kanban board, drag-and-drop, and batch entry system

// Batch entry state
let batchEntries = [];
let isPreviewMode = false;

// Initialize race tracker module
function initializeRaceTracker() {
  console.log('Race tracker module initialized');
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

// Helper function to analyze participant move for course progression
function analyzeParticipantMove(participant, targetStationId, currentStationId) {
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
    const analysis = targetStationId ? analyzeParticipantMove(participant, targetStationId, currentStation) : null;
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
}

// Render a station column
function renderStationColumn(station, participantIds, courseClass, isShared) {
  const stationClass = isShared ? 'shared-station' : 'course-station';
  
  return `
    <div class="column ${stationClass} ${courseClass}" 
         data-station="${station.id}" 
         data-course-class="${courseClass}">
      <div class="column-header" onclick="openBatchModal('${station.id}')">
        <span>${station.name}</span>
        <span class="add-icon">+</span>
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
  
  return participantIds.map(participantId => {
    const participant = eventData.participants.find(p => p.id === participantId);
    if (!participant) return '';
    
    return `
      <div class="bib-card ${courseClass}" 
           draggable="true" 
           data-participant-id="${participantId}"
           title="${participant.name}">
        ${participant.id}
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
    
    suggestionsContainer.innerHTML = suggestions.map(p => {
      const currentStation = getCurrentParticipantStation(p.id);
      const course = eventData.courses.find(c => c.id === p.courseId);
      const courseName = course ? course.name : 'No Course';
      const stationName = currentStation ? getStationName(currentStation) : 'Not Started';
      
      // Analyze course progression for this potential move
      const analysis = targetStationId ? analyzeParticipantMove(p, targetStationId, currentStation) : null;
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
        const participant = eventData.participants.find(p => p.id === participantId);
        let finalStationId = entry.stationId;
        let finalNotes = entry.notes;
        // Map action to proper activity type
        const actionToActivityType = {
          'arrived': 'arrival',
          'departed': 'departed'
        };
        let activityType = actionToActivityType[entry.action.toLowerCase()] || entry.action.toLowerCase();
        
        // Check for course validation
        const sharedStations = ['dnf', 'dns'];
        const isTargetShared = sharedStations.includes(entry.stationId);
        
        if (participant && !isTargetShared && !isStationInCourse(entry.stationId, participant.courseId)) {
          // Skip invalid moves - they will be flagged in the activity log analysis
          console.warn(`Skipping invalid move: ${participantId} to ${getStationName(entry.stationId)} - not in their course`);
        }
        
        // Find current station
        let currentStationId = null;
        Object.keys(eventData.stationAssignments).forEach(stationId => {
          if ((eventData.stationAssignments[stationId] || []).includes(participantId)) {
            currentStationId = stationId;
          }
        });
        
        // Move participant to station
        Object.keys(eventData.stationAssignments).forEach(stationId => {
          eventData.stationAssignments[stationId] = (eventData.stationAssignments[stationId] || [])
            .filter(id => id !== participantId);
        });
        
        if (!eventData.stationAssignments[finalStationId]) {
          eventData.stationAssignments[finalStationId] = [];
        }
        eventData.stationAssignments[finalStationId].push(participantId);
        
        // Log activity
        logActivity({
          participantId: participantId,
          activityType: activityType,
          stationId: finalStationId,
          priorStationId: currentStationId,
          userTime: parsedTime.toISOString(),
          notes: finalNotes
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
  renderRaceTracker();
  closeBatchModal();
  
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

 