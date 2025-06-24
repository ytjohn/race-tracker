// Race Tracker Module
// Handles the race tracking kanban board, drag-and-drop, and batch entry system

// Batch entry state
let batchEntries = [];
let isPreviewMode = false;

// Initialize race tracker module
function initializeRaceTracker() {
  console.log('Race tracker module initialized');
}

// Helper function to get station name by ID
function getStationName(stationId) {
  if (!eventData || !eventData.aidStations) return stationId;
  const station = eventData.aidStations.find(s => s.id === stationId);
  return station ? station.name : stationId;
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
  const sharedStations = ['dnf', 'dns', 'suspect'];
  
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
            ${courseParticipants.length} participants • ${course.totalDistance || 0} miles
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
  const sharedStations = ['dnf', 'dns', 'suspect'];
  const isTargetShared = sharedStations.includes(targetStationId);
  
  if (!isTargetShared && !isStationInCourse(targetStationId, participant.courseId)) {
    // Invalid move - redirect to suspect data
    finalStationId = 'suspect';
    notes = `SUSPECT: Attempted to move from ${participant.courseId || 'unknown course'} to invalid station ${getStationName(targetStationId)}`;
    isSuspectMove = true;
    
    // Show alert to user
    alert(`⚠️ SUSPECT DATA: ${participant.name} cannot be moved to ${getStationName(targetStationId)} - not part of their course. Moved to Suspect Data instead.`);
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
    activityType: isSuspectMove ? 'suspect' : 'arrival',
    stationId: finalStationId,
    priorStationId: currentStationId,
    notes: notes
  });
  
  saveData();
  renderRaceTracker();
}

// Open batch entry modal
function openBatchModal(stationId) {
  const modal = document.getElementById('batch-modal');
  if (!modal) return;
  
  // Reset state
  batchEntries = [];
  isPreviewMode = false;
  
  // Add initial entry
  addBatchRow();
  
  // Set default station for new entries
  batchEntries[0].stationId = stationId;
  
  modal.classList.remove('hidden');
  renderBatchEntries();
}

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
  const batchEntriesContainer = document.getElementById('batch-entries');
  if (!batchEntriesContainer) return;
  
  if (isPreviewMode) {
    renderBatchPreview();
    return;
  }
  
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
  
  // Update the tags display
  const tagsContainer = document.getElementById(`tags-${entryId}`);
  if (tagsContainer) {
    tagsContainer.innerHTML = entry.participants.map(p => `
      <span class="tag">
        ${p}
        <button type="button" onclick="removeParticipantFromEntry('${entryId}', '${p}')">&times;</button>
      </span>
    `).join('');
  }
}

// Remove participant from entry
function removeParticipantFromEntry(entryId, participantId) {
  const entry = batchEntries.find(e => e.id === entryId);
  if (!entry) return;
  
  entry.participants = entry.participants.filter(p => p !== participantId);
  
  // Update the tags display
  const tagsContainer = document.getElementById(`tags-${entryId}`);
  if (tagsContainer) {
    tagsContainer.innerHTML = entry.participants.map(p => `
      <span class="tag">
        ${p}
        <button type="button" onclick="removeParticipantFromEntry('${entryId}', '${p}')">&times;</button>
      </span>
    `).join('');
  }
}

// Show participant suggestions
function showParticipantSuggestions(event, entryId) {
  const input = event.target;
  const suggestionsContainer = document.getElementById(`suggestions-${entryId}`);
  if (!suggestionsContainer) return;
  
  const query = input.value.toLowerCase();
  const suggestions = eventData.participants
    .filter(p => p.id.toLowerCase().includes(query) || p.name.toLowerCase().includes(query))
    .slice(0, 10);
  
  if (suggestions.length > 0) {
    suggestionsContainer.innerHTML = suggestions.map(p => `
      <div class="suggestion-item" onclick="selectParticipantSuggestion('${entryId}', '${p.id}', this)">
        ${p.id} - ${p.name}
      </div>
    `).join('');
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
        let activityType = entry.action.toLowerCase();
        
        // Check for suspect data conditions
        const sharedStations = ['dnf', 'dns', 'suspect'];
        const isTargetShared = sharedStations.includes(entry.stationId);
        
        if (participant && !isTargetShared && !isStationInCourse(entry.stationId, participant.courseId)) {
          // Invalid move - redirect to suspect data
          finalStationId = 'suspect';
          finalNotes = `SUSPECT: Batch entry attempted to move ${participantId} from ${participant.courseId || 'unknown course'} to invalid station ${getStationName(entry.stationId)}. Original notes: ${entry.notes || 'none'}`;
          activityType = 'suspect';
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
  
  // Count suspect entries for summary
  const suspectCount = batchEntries.reduce((count, entry) => {
    if (entry.updateType === 'Race Update') {
      return count + entry.participants.filter(participantId => {
        const participant = eventData.participants.find(p => p.id === participantId);
        const sharedStations = ['dnf', 'dns', 'suspect'];
        const isTargetShared = sharedStations.includes(entry.stationId);
        return participant && !isTargetShared && !isStationInCourse(entry.stationId, participant.courseId);
      }).length;
    }
    return count;
  }, 0);
  
  let message = `Processed ${processedCount} updates successfully!`;
  if (suspectCount > 0) {
    message += `\n\n⚠️ ${suspectCount} entries were moved to Suspect Data due to course validation issues.`;
  }
  
  alert(message);
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

// Show activity log
function showActivityLog() {
  const modal = document.getElementById('activity-modal');
  const logContent = document.getElementById('activity-log-content');
  
  if (!modal || !logContent || !eventData) return;
  
  const sortedLog = [...eventData.activityLog].sort((a, b) => 
    new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp)
  );
  
  const html = sortedLog.map(entry => {
    const participant = entry.participantId ? 
      eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    const priorStation = entry.priorStationId ? 
      eventData.aidStations.find(s => s.id === entry.priorStationId) : null;
    const time = new Date(entry.userTime || entry.timestamp);
    
    return `
      <div class="activity-entry">
        <div class="activity-time">${formatTime(time)}</div>
        <div class="activity-details">
          ${participant ? `<strong>${participant.name}</strong> ` : ''}
          ${entry.activityType} 
          ${station ? `at ${station.name}` : ''}
          ${priorStation ? ` (from ${priorStation.name})` : ''}
          ${entry.notes ? `- ${entry.notes}` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  logContent.innerHTML = html || '<p>No activity recorded yet.</p>';
  modal.classList.remove('hidden');
}

// Close activity log
function closeActivityLog() {
  const modal = document.getElementById('activity-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
} 