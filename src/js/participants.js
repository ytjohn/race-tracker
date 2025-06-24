// Participants Module
// Handles participant management and course assignments

// Initialize participants module
function initializeParticipants() {
  console.log('Participants module initialized');
}

// Render participants setup page
function renderParticipantsSetup() {
  if (!eventData) return;
  
  // Update course dropdowns
  updateParticipantCourseDropdowns();
  
  // Render participants list
  renderParticipantsList();
}

// Update course dropdown options
function updateParticipantCourseDropdowns() {
  const singleCourseSelect = document.getElementById('new-participant-course');
  const bulkCourseSelect = document.getElementById('bulk-participant-course');
  
  const courseOptions = eventData.courses.map(course => 
    `<option value="${course.id}">${course.name}</option>`
  ).join('');
  
  if (singleCourseSelect) {
    singleCourseSelect.innerHTML = '<option value="">Select Course</option>' + courseOptions;
  }
  
  if (bulkCourseSelect) {
    bulkCourseSelect.innerHTML = '<option value="">Select Course for All</option>' + courseOptions;
  }
}

// Render participants list grouped by course
function renderParticipantsList() {
  const participantsContainer = document.getElementById('participants-container');
  if (!participantsContainer || !eventData) return;
  
  if (eventData.participants.length === 0) {
    participantsContainer.innerHTML = '<p>No participants added yet. Use the form above to add participants.</p>';
    return;
  }
  
  // Group participants by course
  const participantsByCourse = {};
  const unassignedParticipants = [];
  
  eventData.participants.forEach(participant => {
    if (participant.courseId) {
      if (!participantsByCourse[participant.courseId]) {
        participantsByCourse[participant.courseId] = [];
      }
      participantsByCourse[participant.courseId].push(participant);
    } else {
      unassignedParticipants.push(participant);
    }
  });
  
  let html = '';
  
  // Show participants by course
  eventData.courses.forEach(course => {
    const courseParticipants = participantsByCourse[course.id] || [];
    html += `
      <div class="course-participants course-${eventData.courses.indexOf(course) + 1}">
        <div class="course-participants-header">
          <h4>${course.name} (${courseParticipants.length} participants)</h4>
          <div class="course-bulk-actions">
            <label>
              <input type="checkbox" onchange="toggleAllParticipants('${course.id}', this.checked)">
              Select All
            </label>
            <button class="btn btn-small" onclick="clearAllParticipantsFromCourse('${course.id}')">Clear Course</button>
          </div>
        </div>
        
        <div class="participants-table">
          <div class="participants-table-header">
            <div class="col-checkbox"></div>
            <div class="col-id">ID/Bib</div>
            <div class="col-name">Name</div>
            <div class="col-actions">Actions</div>
          </div>
          <div class="participants-table-body">
            ${courseParticipants.map(participant => `
              <div class="participant-row course-${eventData.courses.indexOf(course) + 1}">
                <div class="col-checkbox">
                  <input type="checkbox" class="participant-checkbox" data-participant-id="${participant.id}">
                </div>
                <div class="col-id">${participant.id}</div>
                <div class="col-name">${participant.name}</div>
                <div class="col-actions">
                  <select onchange="changeParticipantCourse('${participant.id}', this.value)">
                    <option value="">Move to...</option>
                    ${eventData.courses.map(c => 
                      `<option value="${c.id}" ${c.id === participant.courseId ? 'selected' : ''}>${c.name}</option>`
                    ).join('')}
                  </select>
                  <button class="btn btn-small btn-danger" onclick="removeParticipant('${participant.id}')">Remove</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  });
  
  // Show unassigned participants
  if (unassignedParticipants.length > 0) {
    html += `
      <div class="course-participants course-unassigned">
        <div class="course-participants-header">
          <h4>Unassigned Participants (${unassignedParticipants.length})</h4>
        </div>
        
        <div class="participants-table">
          <div class="participants-table-header">
            <div class="col-checkbox"></div>
            <div class="col-id">ID/Bib</div>
            <div class="col-name">Name</div>
            <div class="col-actions">Actions</div>
          </div>
          <div class="participants-table-body">
            ${unassignedParticipants.map(participant => `
              <div class="participant-row course-unassigned">
                <div class="col-checkbox">
                  <input type="checkbox" class="participant-checkbox" data-participant-id="${participant.id}">
                </div>
                <div class="col-id">${participant.id}</div>
                <div class="col-name">${participant.name}</div>
                <div class="col-actions">
                  <select onchange="changeParticipantCourse('${participant.id}', this.value)">
                    <option value="">Assign to course...</option>
                    ${eventData.courses.map(c => 
                      `<option value="${c.id}">${c.name}</option>`
                    ).join('')}
                  </select>
                  <button class="btn btn-small btn-danger" onclick="removeParticipant('${participant.id}')">Remove</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  participantsContainer.innerHTML = html;
  
  // Setup bulk actions
  setupParticipantCheckboxes();
}

// Add single participant
function addParticipant() {
  if (!eventData) return;
  
  const participantIdInput = document.getElementById('new-participant-id');
  const participantNameInput = document.getElementById('new-participant-name');
  const participantCourseSelect = document.getElementById('new-participant-course');
  
  if (!participantIdInput) return;
  
  const participantId = participantIdInput.value.trim();
  const participantName = participantNameInput ? participantNameInput.value.trim() : '';
  const courseId = participantCourseSelect ? participantCourseSelect.value : '';
  
  if (!participantId) {
    alert('Please enter a participant ID/Bib');
    return;
  }
  
  // Check if participant already exists
  if (eventData.participants.some(p => p.id === participantId)) {
    alert('A participant with this ID already exists');
    return;
  }
  
  const newParticipant = {
    id: participantId,
    name: participantName || participantId,
    type: 'race',
    active: true,
    courseId: courseId || null
  };
  
  eventData.participants.push(newParticipant);
  
  // Clear form
  participantIdInput.value = '';
  if (participantNameInput) participantNameInput.value = '';
  if (participantCourseSelect) participantCourseSelect.value = '';
  
  // Initialize station assignments if not exists
  if (!eventData.stationAssignments) {
    eventData.stationAssignments = {};
  }
  
  // Add to start station
  if (!eventData.stationAssignments['start']) {
    eventData.stationAssignments['start'] = [];
  }
  eventData.stationAssignments['start'].push(participantId);
  
  saveData();
  renderParticipantsList();
}

// Bulk add participants
function bulkAddParticipants() {
  if (!eventData) return;
  
  const bulkTextarea = document.getElementById('bulk-participants');
  const bulkCourseSelect = document.getElementById('bulk-participant-course');
  
  if (!bulkTextarea) return;
  
  const input = bulkTextarea.value.trim();
  const courseId = bulkCourseSelect ? bulkCourseSelect.value : '';
  
  if (!input) {
    alert('Please enter participant information');
    return;
  }
  
  if (!courseId) {
    alert('Please select a course for the participants');
    return;
  }
  
  const participants = parseParticipantRanges(input);
  let addedCount = 0;
  let skippedCount = 0;
  
  participants.forEach(participant => {
    // Check if participant already exists
    if (!eventData.participants.some(p => p.id === participant.id)) {
      const newParticipant = {
        ...participant,
        active: true,
        courseId: courseId
      };
      
      eventData.participants.push(newParticipant);
      
      // Add to start station
      if (!eventData.stationAssignments) {
        eventData.stationAssignments = {};
      }
      if (!eventData.stationAssignments['start']) {
        eventData.stationAssignments['start'] = [];
      }
      eventData.stationAssignments['start'].push(participant.id);
      
      addedCount++;
    } else {
      skippedCount++;
    }
  });
  
  // Clear form
  bulkTextarea.value = '';
  if (bulkCourseSelect) bulkCourseSelect.value = '';
  
  saveData();
  renderParticipantsList();
  
  let message = `Added ${addedCount} participants`;
  if (skippedCount > 0) {
    message += ` (${skippedCount} skipped - already exist)`;
  }
  alert(message);
}

// Change participant course
function changeParticipantCourse(participantId, newCourseId) {
  if (!eventData) return;
  
  const participant = eventData.participants.find(p => p.id === participantId);
  if (!participant) return;
  
  participant.courseId = newCourseId || null;
  
  saveData();
  renderParticipantsList();
}

// Remove participant
function removeParticipant(participantId) {
  if (!eventData) return;
  
  if (confirm('Are you sure you want to remove this participant?')) {
    // Remove from participants array
    eventData.participants = eventData.participants.filter(p => p.id !== participantId);
    
    // Remove from all station assignments
    Object.keys(eventData.stationAssignments).forEach(stationId => {
      eventData.stationAssignments[stationId] = eventData.stationAssignments[stationId].filter(id => id !== participantId);
    });
    
    saveData();
    renderParticipantsList();
  }
}

// Setup participant checkboxes for bulk operations
function setupParticipantCheckboxes() {
  const checkboxes = document.querySelectorAll('.participant-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateBulkActionsPanel);
  });
  
  updateBulkActionsPanel();
}

// Update bulk actions panel
function updateBulkActionsPanel() {
  const checkedBoxes = document.querySelectorAll('.participant-checkbox:checked');
  // Could implement bulk actions panel here if needed
}

// Toggle all participants in a course
function toggleAllParticipants(courseId, checked) {
  const courseSection = document.querySelector(`.course-participants`);
  if (courseSection) {
    const checkboxes = courseSection.querySelectorAll('.participant-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
    });
  }
  updateBulkActionsPanel();
}

// Clear all participants from a course
function clearAllParticipantsFromCourse(courseId) {
  if (!eventData) return;
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  if (confirm(`Are you sure you want to remove all participants from ${course.name}?`)) {
    const participantsToRemove = eventData.participants.filter(p => p.courseId === courseId);
    
    participantsToRemove.forEach(participant => {
      // Remove from participants array
      eventData.participants = eventData.participants.filter(p => p.id !== participant.id);
      
      // Remove from all station assignments
      Object.keys(eventData.stationAssignments).forEach(stationId => {
        eventData.stationAssignments[stationId] = eventData.stationAssignments[stationId].filter(id => id !== participant.id);
      });
    });
    
    saveData();
    renderParticipantsList();
    
    alert(`Removed ${participantsToRemove.length} participants from ${course.name}`);
  }
}

// Save participants
function saveParticipants() {
  saveData();
  alert('Participants saved successfully!');
} 