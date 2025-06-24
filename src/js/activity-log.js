// Activity Log Management Module
// Handles viewing, editing, and exporting activity log entries

// Initialize activity log module
function initializeActivityLog() {
  console.log('Activity log module initialized');
}

// Render activity log management page
function renderActivityLogManagement() {
  const activityContainer = document.getElementById('activity-log-container');
  if (!activityContainer || !eventData) return;
  
  const sortedLog = [...eventData.activityLog].sort((a, b) => 
    new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp)
  );
  
  // Check if course distances need to be configured
  const hasDistanceConfigIssues = eventData.courses.some(course => 
    course.stations.some((station, index) => 
      index > 0 && (station.distance === 0 || station.distance == null)
    )
  );
  
  if (sortedLog.length === 0) {
    activityContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No Activity Recorded Yet</h3>
        <p>Start tracking activities to see them here</p>
        <button class="btn btn-primary" onclick="openAddActivityModal()">
          <span class="btn-icon">➕</span>
          Add Activity
        </button>
      </div>
    `;
    return;
  }
  
  const html = `
    <div class="activity-log-header">
      <div class="log-stats">
        <div class="stat-card">
          <div class="stat-number">${sortedLog.length}</div>
          <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${getUniqueParticipants(sortedLog).length}</div>
          <div class="stat-label">Participants</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${getUniqueStations(sortedLog).length}</div>
          <div class="stat-label">Stations</div>
        </div>
      </div>
      <div class="log-actions">
        <button class="btn btn-primary" onclick="openAddActivityModal()">
          <span class="btn-icon">➕</span>
          Add Activity
        </button>
        <button class="btn btn-secondary" onclick="exportActivityLog('csv')">
          <span class="btn-icon">📊</span>
          Export CSV
        </button>
        <button class="btn btn-secondary" onclick="exportActivityLog('json')">
          <span class="btn-icon">💾</span>
          Export JSON
        </button>
        <button class="btn btn-danger" onclick="clearActivityLog()">
          <span class="btn-icon">🗑️</span>
          Clear All
        </button>
      </div>
    </div>
    
    ${hasDistanceConfigIssues ? `
      <div class="distance-config-notice">
        <div class="notice-icon">⚠️</div>
        <div class="notice-content">
          <strong>Course distances not configured</strong>
          <p>Distance calculations are showing 0.0 mi because station distances haven't been set up. 
             <a href="javascript:void(0)" onclick="showPage('courses-setup')">Go to Setup > Courses</a> 
             to add distances between stations.</p>
        </div>
      </div>
    ` : ''}
    
    <div class="activity-log-filters">
      <div class="filter-section">
        <div class="filter-controls">
          <div class="participant-filter-container">
            <div class="participant-filter-header" onclick="toggleParticipantFilter()">
              <span>✓ All Participants</span>
              <span class="filter-arrow">▼</span>
            </div>
            <div class="participant-filter-dropdown" id="participant-filter-dropdown" style="display: none;">
              <div class="participant-filter-search">
                <input type="text" id="participant-search" placeholder="Search participants..." 
                       oninput="filterParticipantList()" class="search-input">
              </div>
              <div class="participant-filter-actions">
                <button class="btn btn-small" onclick="selectAllParticipants()">Select All</button>
                <button class="btn btn-small" onclick="clearAllParticipants()">Clear All</button>
              </div>
              <div class="participant-filter-list" id="participant-filter-list">
                ${getUniqueParticipants(sortedLog).map(p => `
                  <label class="participant-filter-item">
                    <input type="checkbox" value="${p.id}" checked onchange="updateParticipantFilter()">
                    <span>${p.name} (${p.id})</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          
          <select id="filter-station" onchange="filterActivityLog()" class="filter-select">
            <option value="">All Stations</option>
            ${getUniqueStations(sortedLog).map(s => 
              `<option value="${s.id}">${s.name}</option>`
            ).join('')}
          </select>
          
          <select id="filter-course" onchange="filterActivityLog()" class="filter-select">
            <option value="">All Courses</option>
            ${eventData.courses.map(c => 
              `<option value="${c.id}">${c.name}</option>`
            ).join('')}
          </select>
          
          <select id="filter-activity-type" onchange="filterActivityLog()" class="filter-select">
            <option value="">All Activity Types</option>
            <option value="arrival">Arrivals</option>
            <option value="departed">Departures</option>
            <option value="other">Messages/Other</option>
          </select>
          
          <select id="filter-course-issues" onchange="filterActivityLog()" class="filter-select">
            <option value="">All Entries</option>
            <option value="issues-only">Course Issues Only</option>
            <option value="valid-only">Valid Entries Only</option>
          </select>
          
          <button class="btn btn-small btn-outline" onclick="clearFilters()">
            <span class="btn-icon">🔄</span>
            Clear Filters
          </button>
        </div>
        
        <div class="bulk-actions-section" id="bulk-actions-section" style="display: none;">
          <div class="bulk-selection-info">
            <span id="selected-count">0</span> selected
          </div>
          <div class="bulk-action-buttons">
            <button class="btn btn-small btn-secondary" onclick="showBulkEditModal()">
              <span class="btn-icon">✏️</span>
              Edit Selected
            </button>
            <button class="btn btn-small btn-danger" onclick="deleteBulkSelected()">
              <span class="btn-icon">🗑️</span>
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="activity-log-table-container">
      <table class="activity-log-table" id="activity-log-table">
        <thead>
          <tr>
            <th class="checkbox-column">
              <input type="checkbox" id="select-all-checkbox" onchange="toggleSelectAll()" class="bulk-checkbox">
            </th>
            <th class="time-column">Time</th>
            <th class="participant-column">Participant</th>
            <th class="course-column">Course</th>
            <th class="activity-column">Activity</th>
            <th class="station-column">Station</th>
            <th class="prior-station-column">Prior Station</th>
            <th class="distance-column">Distance</th>
            <th class="duration-column">Duration</th>
            <th class="notes-column">Notes</th>
            <th class="course-analysis-column">Analysis</th>
            <th class="actions-column">Actions</th>
          </tr>
        </thead>
        <tbody id="activity-log-tbody">
          ${renderActivityLogRows(sortedLog)}
        </tbody>
      </table>
    </div>
  `;
  
  activityContainer.innerHTML = html;
}

// Render activity log table rows
function renderActivityLogRows(logEntries) {
  return logEntries.map(entry => {
    const participant = entry.participantId ? 
      eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    const priorStation = entry.priorStationId ? 
      eventData.aidStations.find(s => s.id === entry.priorStationId) : null;
    const time = new Date(entry.userTime || entry.timestamp);
    
    // Course analysis
    const courseAnalysis = participant ? analyzeCourseProgression(participant, entry, priorStation) : null;
    
    // Check if this might be a distance configuration issue
    const isDistanceConfigIssue = courseAnalysis && courseAnalysis.cumulativeDistance === 0 && 
      participant && participant.courseId && entry.stationId !== 'start';
    
    // Duration since last event for this participant
    const duration = participant ? calculateDurationSinceLastEvent(participant.id, entry) : null;
    
    return `
      <tr class="activity-row ${entry.activityType}" data-entry-id="${entry.id}">
        <td class="checkbox-cell">
          <input type="checkbox" class="row-checkbox" data-entry-id="${entry.id}" onchange="updateBulkActions()">
        </td>
        <td class="time-cell">
          <div class="time-display">${formatTime(time)}</div>
          <div class="time-edit hidden">
            <input type="time" value="${time.toTimeString().slice(0,5)}" 
                   onchange="updateEntryTime('${entry.id}', this.value)">
          </div>
        </td>
        <td class="participant-cell">
          ${participant ? `
            <div class="participant-display">${participant.name} (${participant.id})</div>
            <div class="participant-edit hidden">
              <select onchange="updateEntryParticipant('${entry.id}', this.value)">
                <option value="">No Participant</option>
                ${eventData.participants.map(p => 
                  `<option value="${p.id}" ${p.id === participant.id ? 'selected' : ''}>${p.name} (${p.id})</option>`
                ).join('')}
              </select>
            </div>
          ` : `
            <div class="participant-display">—</div>
            <div class="participant-edit hidden">
              <select onchange="updateEntryParticipant('${entry.id}', this.value)">
                <option value="">No Participant</option>
                ${eventData.participants.map(p => 
                  `<option value="${p.id}">${p.name} (${p.id})</option>`
                ).join('')}
              </select>
            </div>
          `}
        </td>
        <td class="course-cell">
          <div class="course-display">
            ${participant && participant.courseId ? 
              (eventData.courses.find(c => c.id === participant.courseId)?.name || 'Unknown Course') : '—'}
          </div>
        </td>
        <td class="activity-cell">
          <div class="activity-display">
            <span class="activity-badge activity-${entry.activityType}">
              ${formatActivityType(entry.activityType)}
            </span>
          </div>
          <div class="activity-edit hidden">
            <select onchange="updateEntryActivityType('${entry.id}', this.value)">
              <option value="arrival" ${entry.activityType === 'arrival' ? 'selected' : ''}>Arrival</option>
              <option value="departed" ${entry.activityType === 'departed' ? 'selected' : ''}>Departure</option>
              <option value="other" ${entry.activityType === 'other' ? 'selected' : ''}>Message/Other</option>
            </select>
          </div>
        </td>
        <td class="station-cell">
          <div class="station-display">${station ? station.name : 'Unknown'}</div>
          <div class="station-edit hidden">
            <select onchange="updateEntryStation('${entry.id}', this.value)">
              ${eventData.aidStations.map(s => 
                `<option value="${s.id}" ${s.id === entry.stationId ? 'selected' : ''}>${s.name}</option>`
              ).join('')}
            </select>
          </div>
        </td>
        <td class="prior-station-cell">
          <div class="prior-station-display">${priorStation ? priorStation.name : '—'}</div>
          <div class="prior-station-edit hidden">
            <select onchange="updateEntryPriorStation('${entry.id}', this.value)">
              <option value="">No Prior Station</option>
              ${eventData.aidStations.map(s => 
                `<option value="${s.id}" ${s.id === entry.priorStationId ? 'selected' : ''}>${s.name}</option>`
              ).join('')}
            </select>
          </div>
        </td>
        <td class="distance-cell">
          <div class="distance-display">
            ${courseAnalysis && courseAnalysis.cumulativeDistance != null ? 
              (isDistanceConfigIssue ? 
                '<span title="Course distances not configured. Go to Setup > Courses to add distances between stations." style="color: #f39c12;">0.0 mi*</span>' :
                `${courseAnalysis.cumulativeDistance.toFixed(1)} mi`) : '—'}
          </div>
        </td>
        <td class="duration-cell">
          <div class="duration-display">
            ${duration ? formatDuration(duration) : '—'}
          </div>
        </td>
        <td class="notes-cell">
          <div class="notes-display">${entry.notes || '—'}</div>
          <div class="notes-edit hidden">
            <textarea onchange="updateEntryNotes('${entry.id}', this.value)" 
                      placeholder="Add notes...">${entry.notes || ''}</textarea>
          </div>
        </td>
        <td class="course-analysis-cell">
          <div class="course-analysis-display">
            ${courseAnalysis ? renderCourseAnalysisIcon(courseAnalysis, participant) : '—'}
          </div>
        </td>
        <td class="actions-cell">
          <div class="action-buttons">
            <button class="btn btn-small edit-btn" onclick="toggleEditEntry('${entry.id}')">Edit</button>
            <button class="btn btn-small btn-danger delete-btn" onclick="deleteActivityEntry('${entry.id}')">Delete</button>
          </div>
          <div class="edit-actions hidden">
            <button class="btn btn-small save-btn" onclick="saveEntryChanges('${entry.id}')">Save</button>
            <button class="btn btn-small cancel-btn" onclick="cancelEntryEdit('${entry.id}')">Cancel</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Get unique participants from log
function getUniqueParticipants(logEntries) {
  const participantIds = [...new Set(logEntries
    .filter(entry => entry.participantId)
    .map(entry => entry.participantId))];
  
  return participantIds.map(id => 
    eventData.participants.find(p => p.id === id)
  ).filter(p => p);
}

// Get unique stations from log
function getUniqueStations(logEntries) {
  const stationIds = [...new Set(logEntries.map(entry => entry.stationId))];
  
  return stationIds.map(id => 
    eventData.aidStations.find(s => s.id === id)
  ).filter(s => s);
}

// Format activity type for display
function formatActivityType(activityType) {
  const types = {
    'arrival': 'Arrived',
    'departed': 'Departed', 
    'suspect': 'Suspect',
    'other': 'Message'
  };
  return types[activityType] || activityType;
}

// Filter activity log
function filterActivityLog() {
  const selectedParticipants = Array.from(
    document.querySelectorAll('#participant-filter-list input[type="checkbox"]:checked')
  ).map(cb => cb.value);
  
  const stationFilter = document.getElementById('filter-station')?.value;
  const courseFilter = document.getElementById('filter-course')?.value;
  const activityFilter = document.getElementById('filter-activity-type')?.value;
  const courseIssuesFilter = document.getElementById('filter-course-issues')?.value;
  
  let filteredLog = [...eventData.activityLog];
  
  // Participant filter - only filter if some participants are unchecked
  if (selectedParticipants.length > 0 && 
      selectedParticipants.length < document.querySelectorAll('#participant-filter-list input[type="checkbox"]').length) {
    filteredLog = filteredLog.filter(entry => 
      !entry.participantId || selectedParticipants.includes(entry.participantId)
    );
  }
  
  if (stationFilter) {
    filteredLog = filteredLog.filter(entry => entry.stationId === stationFilter);
  }
  
  // Course filter
  if (courseFilter) {
    filteredLog = filteredLog.filter(entry => {
      const participant = entry.participantId ? 
        eventData.participants.find(p => p.id === entry.participantId) : null;
      return participant && participant.courseId === courseFilter;
    });
  }
  
  if (activityFilter) {
    filteredLog = filteredLog.filter(entry => entry.activityType === activityFilter);
  }
  
  // Course issues filter
  if (courseIssuesFilter) {
    filteredLog = filteredLog.filter(entry => {
      const participant = entry.participantId ? 
        eventData.participants.find(p => p.id === entry.participantId) : null;
      const priorStation = entry.priorStationId ? 
        eventData.aidStations.find(s => s.id === entry.priorStationId) : null;
      const courseAnalysis = participant ? analyzeCourseProgression(participant, entry, priorStation) : null;
      
      if (courseIssuesFilter === 'issues-only') {
        return courseAnalysis && (courseAnalysis.status === 'warning' || courseAnalysis.status === 'error');
      } else if (courseIssuesFilter === 'valid-only') {
        return !courseAnalysis || courseAnalysis.status === 'valid';
      }
      return true;
    });
  }
  
  // Sort filtered results
  filteredLog.sort((a, b) => 
    new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp)
  );
  
  // Update table body
  const tbody = document.getElementById('activity-log-tbody');
  if (tbody) {
    tbody.innerHTML = renderActivityLogRows(filteredLog);
  }
}

// Clear filters
function clearFilters() {
  // Reset participant filter
  const participantCheckboxes = document.querySelectorAll('#participant-filter-list input[type="checkbox"]');
  participantCheckboxes.forEach(cb => cb.checked = true);
  updateParticipantFilter();
  
  // Reset other filters
  const stationFilter = document.getElementById('filter-station');
  const courseFilter = document.getElementById('filter-course');
  const activityFilter = document.getElementById('filter-activity-type');
  const courseIssuesFilter = document.getElementById('filter-course-issues');
  if (stationFilter) stationFilter.value = '';
  if (courseFilter) courseFilter.value = '';
  if (activityFilter) activityFilter.value = '';
  if (courseIssuesFilter) courseIssuesFilter.value = '';
  
  filterActivityLog();
}

// Toggle edit mode for an entry
function toggleEditEntry(entryId) {
  const row = document.querySelector(`[data-entry-id="${entryId}"]`);
  if (!row) return;
  
  // Hide all other edit modes first
  document.querySelectorAll('.activity-row').forEach(r => {
    if (r !== row) {
      cancelEntryEdit(r.getAttribute('data-entry-id'));
    }
  });
  
  const isEditing = row.classList.contains('editing');
  
  if (isEditing) {
    cancelEntryEdit(entryId);
  } else {
    row.classList.add('editing');
    
    // Show edit controls, hide display
    row.querySelectorAll('.time-display, .participant-display, .course-display, .activity-display, .station-display, .prior-station-display, .notes-display').forEach(el => {
      el.classList.add('hidden');
    });
    row.querySelectorAll('.time-edit, .participant-edit, .activity-edit, .station-edit, .prior-station-edit, .notes-edit').forEach(el => {
      el.classList.remove('hidden');
    });
    row.querySelector('.action-buttons').classList.add('hidden');
    row.querySelector('.edit-actions').classList.remove('hidden');
  }
}

// Cancel edit mode
function cancelEntryEdit(entryId) {
  const row = document.querySelector(`[data-entry-id="${entryId}"]`);
  if (!row) return;
  
  row.classList.remove('editing');
  
  // Show display controls, hide edit
  row.querySelectorAll('.time-display, .participant-display, .course-display, .activity-display, .station-display, .prior-station-display, .notes-display').forEach(el => {
    el.classList.remove('hidden');
  });
  row.querySelectorAll('.time-edit, .participant-edit, .activity-edit, .station-edit, .prior-station-edit, .notes-edit').forEach(el => {
    el.classList.add('hidden');
  });
  row.querySelector('.action-buttons').classList.remove('hidden');
  row.querySelector('.edit-actions').classList.add('hidden');
  
  // Reset form values to original values without full re-render
  const entry = eventData.activityLog.find(e => e.id === entryId);
  if (entry) {
    const time = new Date(entry.userTime || entry.timestamp);
    const timeInput = row.querySelector('.time-edit input[type="time"]');
    if (timeInput) {
      timeInput.value = time.toTimeString().slice(0, 5);
    }
    
    const participantSelect = row.querySelector('.participant-edit select');
    if (participantSelect) {
      participantSelect.value = entry.participantId || '';
    }
    
    const activitySelect = row.querySelector('.activity-edit select');
    if (activitySelect) {
      activitySelect.value = entry.activityType;
    }
    
    const stationSelect = row.querySelector('.station-edit select');
    if (stationSelect) {
      stationSelect.value = entry.stationId;
    }
    
    const priorStationSelect = row.querySelector('.prior-station-edit select');
    if (priorStationSelect) {
      priorStationSelect.value = entry.priorStationId || '';
    }
    
    const notesTextarea = row.querySelector('.notes-edit textarea');
    if (notesTextarea) {
      notesTextarea.value = entry.notes || '';
    }
  }
}

// Save entry changes
function saveEntryChanges(entryId) {
  saveData();
  
  // Update the display values in the row without full re-render
  const row = document.querySelector(`[data-entry-id="${entryId}"]`);
  const entry = eventData.activityLog.find(e => e.id === entryId);
  
  if (row && entry) {
    // Update display values
    const participant = entry.participantId ? 
      eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    const priorStation = entry.priorStationId ? 
      eventData.aidStations.find(s => s.id === entry.priorStationId) : null;
    const time = new Date(entry.userTime || entry.timestamp);
    
    // Update time display
    const timeDisplay = row.querySelector('.time-display');
    if (timeDisplay) {
      timeDisplay.textContent = formatTime(time);
    }
    
    // Update participant display
    const participantDisplay = row.querySelector('.participant-display');
    if (participantDisplay) {
      participantDisplay.textContent = participant ? `${participant.name} (${participant.id})` : '—';
    }
    
    // Update course display
    const courseDisplay = row.querySelector('.course-display');
    if (courseDisplay) {
      const course = participant && participant.courseId ? 
        eventData.courses.find(c => c.id === participant.courseId) : null;
      courseDisplay.textContent = course ? course.name : '—';
    }
    
    // Update activity display
    const activityDisplay = row.querySelector('.activity-display .activity-badge');
    if (activityDisplay) {
      activityDisplay.textContent = formatActivityType(entry.activityType);
      activityDisplay.className = `activity-badge activity-${entry.activityType}`;
    }
    
    // Update station display
    const stationDisplay = row.querySelector('.station-display');
    if (stationDisplay) {
      stationDisplay.textContent = station ? station.name : 'Unknown';
    }
    
    // Update prior station display
    const priorStationDisplay = row.querySelector('.prior-station-display');
    if (priorStationDisplay) {
      priorStationDisplay.textContent = priorStation ? priorStation.name : '—';
    }
    
    // Update notes display
    const notesDisplay = row.querySelector('.notes-display');
    if (notesDisplay) {
      notesDisplay.textContent = entry.notes || '—';
    }
    
    // Update course analysis and distance
    const courseAnalysis = participant ? analyzeCourseProgression(participant, entry, priorStation) : null;
    const isDistanceConfigIssue = courseAnalysis && courseAnalysis.cumulativeDistance === 0 && 
      participant && participant.courseId && entry.stationId !== 'start';
    
    const distanceDisplay = row.querySelector('.distance-display');
    if (distanceDisplay) {
      if (courseAnalysis && courseAnalysis.cumulativeDistance != null) {
        if (isDistanceConfigIssue) {
          distanceDisplay.innerHTML = '<span title="Course distances not configured. Go to Setup > Courses to add distances between stations." style="color: #f39c12;">0.0 mi*</span>';
        } else {
          distanceDisplay.textContent = `${courseAnalysis.cumulativeDistance.toFixed(1)} mi`;
        }
      } else {
        distanceDisplay.textContent = '—';
      }
    }
    
    const analysisDisplay = row.querySelector('.course-analysis-display');
    if (analysisDisplay) {
      analysisDisplay.innerHTML = courseAnalysis ? renderCourseAnalysisIcon(courseAnalysis, participant) : '—';
    }
    
    // Update duration
    const duration = participant ? calculateDurationSinceLastEvent(participant.id, entry) : null;
    const durationDisplay = row.querySelector('.duration-display');
    if (durationDisplay) {
      durationDisplay.textContent = duration ? formatDuration(duration) : '—';
    }
  }
  
  cancelEntryEdit(entryId);
}

// Update entry time
function updateEntryTime(entryId, newTime) {
  const entry = eventData.activityLog.find(e => e.id === entryId);
  if (!entry) return;
  
  const currentDate = new Date(entry.userTime || entry.timestamp);
  const [hours, minutes] = newTime.split(':');
  
  const newDate = new Date(currentDate);
  newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  entry.userTime = newDate.toISOString();
}

// Update entry participant
function updateEntryParticipant(entryId, newParticipantId) {
  const entry = eventData.activityLog.find(e => e.id === entryId);
  if (!entry) return;
  
  entry.participantId = newParticipantId || null;
}

// Update entry activity type
function updateEntryActivityType(entryId, newActivityType) {
  const entry = eventData.activityLog.find(e => e.id === entryId);
  if (!entry) return;
  
  entry.activityType = newActivityType;
}

// Update entry station
function updateEntryStation(entryId, newStationId) {
  const entry = eventData.activityLog.find(e => e.id === entryId);
  if (!entry) return;
  
  entry.stationId = newStationId;
}

// Update entry prior station
function updateEntryPriorStation(entryId, newPriorStationId) {
  const entry = eventData.activityLog.find(e => e.id === entryId);
  if (!entry) return;
  
  entry.priorStationId = newPriorStationId || null;
}

// Update entry notes
function updateEntryNotes(entryId, newNotes) {
  const entry = eventData.activityLog.find(e => e.id === entryId);
  if (!entry) return;
  
  entry.notes = newNotes.trim() || null;
}

// Delete activity entry
function deleteActivityEntry(entryId) {
  if (!confirm('Are you sure you want to delete this activity entry? This cannot be undone.')) {
    return;
  }
  
  eventData.activityLog = eventData.activityLog.filter(e => e.id !== entryId);
  saveData();
  renderActivityLogManagement();
}

// Clear all activity logs
function clearActivityLog() {
  if (!confirm('Are you sure you want to clear ALL activity logs? This cannot be undone.')) {
    return;
  }
  
  eventData.activityLog = [];
  saveData();
  renderActivityLogManagement();
}

// Export activity log
function exportActivityLog(format) {
  if (!eventData.activityLog.length) {
    alert('No activity log data to export');
    return;
  }
  
  const sortedLog = [...eventData.activityLog].sort((a, b) => 
    new Date(a.userTime || a.timestamp) - new Date(b.userTime || b.timestamp)
  );
  
  if (format === 'csv') {
    exportActivityLogCSV(sortedLog);
  } else if (format === 'json') {
    exportActivityLogJSON(sortedLog);
  }
}

// Export as CSV
function exportActivityLogCSV(logEntries) {
  const headers = ['Time', 'Participant ID', 'Participant Name', 'Course', 'Activity Type', 'Station', 'Prior Station', 'Course Analysis', 'Distance', 'Duration', 'Notes'];
  
  const rows = logEntries.map(entry => {
    const participant = entry.participantId ? 
      eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    const priorStation = entry.priorStationId ? 
      eventData.aidStations.find(s => s.id === entry.priorStationId) : null;
    const time = new Date(entry.userTime || entry.timestamp);
    
    // Get course info
    const course = participant && participant.courseId ? 
      eventData.courses.find(c => c.id === participant.courseId) : null;
    
    // Get course analysis
    const courseAnalysis = participant ? analyzeCourseProgression(participant, entry, priorStation) : null;
    
    // Get duration
    const duration = participant ? calculateDurationSinceLastEvent(participant.id, entry) : null;
    
    return [
      formatTime(time),
      participant ? participant.id : '',
      participant ? participant.name : '',
      course ? course.name : '',
      formatActivityType(entry.activityType),
      station ? station.name : 'Unknown',
      priorStation ? priorStation.name : '',
      courseAnalysis ? courseAnalysis.message : '',
      courseAnalysis && courseAnalysis.cumulativeDistance != null ? 
        `${courseAnalysis.cumulativeDistance.toFixed(1)} mi` : '',
      duration ? formatDuration(duration) : '',
      entry.notes || ''
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  downloadFile(csvContent, `${eventData.event.name || 'race'}-activity-log.csv`, 'text/csv');
}

// Export as JSON
function exportActivityLogJSON(logEntries) {
  const exportData = {
    event: eventData.event,
    exportDate: new Date().toISOString(),
    activityLog: logEntries
  };
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, `${eventData.event.name || 'race'}-activity-log.json`, 'application/json');
}

// Download file helper
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Bulk selection functions
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const rowCheckboxes = document.querySelectorAll('.row-checkbox');
  
  rowCheckboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
  
  updateBulkActions();
}

function updateBulkActions() {
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  const bulkActionsSection = document.getElementById('bulk-actions-section');
  const selectedCountSpan = document.getElementById('selected-count');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  
  const selectedCount = selectedCheckboxes.length;
  const totalCheckboxes = document.querySelectorAll('.row-checkbox').length;
  
  // Update selected count
  if (selectedCountSpan) {
    selectedCountSpan.textContent = selectedCount;
  }
  
  // Show/hide bulk actions
  if (bulkActionsSection) {
    bulkActionsSection.style.display = selectedCount > 0 ? 'flex' : 'none';
  }
  
  // Update select all checkbox state
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = selectedCount === totalCheckboxes && totalCheckboxes > 0;
    selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCheckboxes;
  }
}

function getSelectedEntryIds() {
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  return Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-entry-id'));
}

function deleteBulkSelected() {
  const selectedIds = getSelectedEntryIds();
  if (selectedIds.length === 0) return;
  
  const confirmMessage = `Are you sure you want to delete ${selectedIds.length} selected entries? This cannot be undone.`;
  if (!confirm(confirmMessage)) return;
  
  // Remove selected entries
  eventData.activityLog = eventData.activityLog.filter(entry => !selectedIds.includes(entry.id));
  saveData();
  renderActivityLogManagement();
}

function showBulkEditModal() {
  const selectedIds = getSelectedEntryIds();
  if (selectedIds.length === 0) return;
  
  // Create bulk edit modal content
  const modalHtml = `
    <div class="modal-overlay" id="bulk-edit-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Bulk Edit ${selectedIds.length} Entries</h3>
          <button class="modal-close" onclick="closeBulkEditModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="bulk-edit-form">
            <div class="form-section">
              <h4>Update Time</h4>
              <label>
                <input type="checkbox" id="bulk-update-time"> 
                Change time for all selected entries
              </label>
              <input type="time" id="bulk-time-value" disabled>
            </div>
            
            <div class="form-section">
              <h4>Update Activity Type</h4>
              <label>
                <input type="checkbox" id="bulk-update-activity"> 
                Change activity type for all selected entries
              </label>
              <select id="bulk-activity-value" disabled>
                <option value="arrival">Arrival</option>
                <option value="departed">Departure</option>
                <option value="other">Message/Other</option>
              </select>
            </div>
            
            <div class="form-section">
              <h4>Update Station</h4>
              <label>
                <input type="checkbox" id="bulk-update-station"> 
                Change station for all selected entries
              </label>
              <select id="bulk-station-value" disabled>
                ${eventData.aidStations.map(s => 
                  `<option value="${s.id}">${s.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="form-section">
              <h4>Update Prior Station</h4>
              <label>
                <input type="checkbox" id="bulk-update-prior-station"> 
                Change prior station for all selected entries
              </label>
              <select id="bulk-prior-station-value" disabled>
                <option value="">No Prior Station</option>
                ${eventData.aidStations.map(s => 
                  `<option value="${s.id}">${s.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="form-section">
              <h4>Update Notes</h4>
              <label>
                <input type="checkbox" id="bulk-update-notes"> 
                Add/replace notes for all selected entries
              </label>
              <textarea id="bulk-notes-value" disabled placeholder="Enter notes..." rows="3"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeBulkEditModal()">Cancel</button>
          <button class="btn btn-primary" onclick="applyBulkEdit()">Apply Changes</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Setup checkbox handlers to enable/disable inputs
  ['time', 'activity', 'station', 'prior-station', 'notes'].forEach(field => {
    const checkbox = document.getElementById(`bulk-update-${field}`);
    const input = document.getElementById(`bulk-${field}-value`);
    
    checkbox.addEventListener('change', function() {
      input.disabled = !this.checked;
      if (this.checked) {
        input.focus();
      }
    });
  });
}

function closeBulkEditModal() {
  const modal = document.getElementById('bulk-edit-modal');
  if (modal) {
    modal.remove();
  }
}

function applyBulkEdit() {
  const selectedIds = getSelectedEntryIds();
  const updates = {};
  
  // Collect updates
  if (document.getElementById('bulk-update-time').checked) {
    const timeValue = document.getElementById('bulk-time-value').value;
    if (timeValue) {
      const today = new Date();
      const [hours, minutes] = timeValue.split(':');
      const newDate = new Date(today);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updates.userTime = newDate.toISOString();
    }
  }
  
  if (document.getElementById('bulk-update-activity').checked) {
    updates.activityType = document.getElementById('bulk-activity-value').value;
  }
  
  if (document.getElementById('bulk-update-station').checked) {
    updates.stationId = document.getElementById('bulk-station-value').value;
  }
  
  if (document.getElementById('bulk-update-prior-station').checked) {
    updates.priorStationId = document.getElementById('bulk-prior-station-value').value || null;
  }
  
  if (document.getElementById('bulk-update-notes').checked) {
    updates.notes = document.getElementById('bulk-notes-value').value.trim() || null;
  }
  
  // Apply updates
  eventData.activityLog.forEach(entry => {
    if (selectedIds.includes(entry.id)) {
      Object.assign(entry, updates);
    }
  });
  
  saveData();
  closeBulkEditModal();
  renderActivityLogManagement();
}

// Open Add Activity Modal (reuse batch entry modal)
function openAddActivityModal() {
  // Always use the standalone modal for activity log page
  createStandaloneAddActivityModal();
}

// Create standalone add activity modal
function createStandaloneAddActivityModal() {
  const modalHtml = `
    <div class="modal-overlay" id="add-activity-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Activity Entry</h3>
          <button class="modal-close" onclick="closeAddActivityModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="add-activity-form">
            <div class="form-row">
              <div class="form-col">
                <label for="add-time">Time</label>
                <input type="time" id="add-time" value="${getCurrentTimeString()}">
              </div>
              <div class="form-col">
                <label for="add-station">Station</label>
                <select id="add-station">
                  ${eventData.aidStations.map(s => 
                    `<option value="${s.id}">${s.name}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            
                         <div class="form-row">
               <div class="form-col">
                 <label for="add-participant">Participant</label>
                 <select id="add-participant">
                   <option value="">Select Participant</option>
                   ${eventData.participants.map(p => 
                     `<option value="${p.id}">${p.name} (${p.id})</option>`
                   ).join('')}
                 </select>
               </div>
               <div class="form-col">
                 <label for="add-activity-type">Activity Type</label>
                 <select id="add-activity-type">
                   <option value="arrival">Arrival</option>
                   <option value="departed">Departure</option>
                   <option value="other">Message/Other</option>
                 </select>
               </div>
             </div>
             
             <div class="form-row">
               <div class="form-col">
                 <label for="add-prior-station">Prior Station (Optional)</label>
                 <select id="add-prior-station">
                   <option value="">No Prior Station</option>
                   ${eventData.aidStations.map(s => 
                     `<option value="${s.id}">${s.name}</option>`
                   ).join('')}
                 </select>
               </div>
               <div class="form-col">
                 <!-- Spacer -->
               </div>
             </div>
            
            <div class="form-row">
              <div class="form-col-full">
                <label for="add-notes">Notes (Optional)</label>
                <textarea id="add-notes" rows="3" placeholder="Enter any additional notes..."></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeAddActivityModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitAddActivity()">Add Activity</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeAddActivityModal() {
  const modal = document.getElementById('add-activity-modal');
  if (modal) {
    modal.remove();
  }
}

function submitAddActivity() {
  const time = document.getElementById('add-time').value;
  const stationId = document.getElementById('add-station').value;
  const participantId = document.getElementById('add-participant').value;
  const activityType = document.getElementById('add-activity-type').value;
  const priorStationId = document.getElementById('add-prior-station').value;
  const notes = document.getElementById('add-notes').value.trim();
  
  if (!stationId) {
    alert('Please select a station');
    return;
  }
  
  // Create activity log entry
  const entry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userTime: time ? parseTimeToISO(time) : new Date().toISOString(),
    participantId: participantId || null,
    activityType: activityType,
    stationId: stationId,
    priorStationId: priorStationId || null,
    notes: notes || null
  };
  
  // Add to activity log
  eventData.activityLog.push(entry);
  saveData();
  
  closeAddActivityModal();
  renderActivityLogManagement();
}

function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

function parseTimeToISO(timeString) {
  const today = new Date();
  const [hours, minutes] = timeString.split(':');
  const date = new Date(today);
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date.toISOString();
}

// Make functions globally accessible
window.openAddActivityModal = openAddActivityModal;
window.closeAddActivityModal = closeAddActivityModal;
window.submitAddActivity = submitAddActivity;
window.exportActivityLog = exportActivityLog;
window.clearActivityLog = clearActivityLog;
window.toggleParticipantFilter = toggleParticipantFilter;
window.selectAllParticipants = selectAllParticipants;
window.clearAllParticipants = clearAllParticipants;
window.clearFilters = clearFilters;
window.showBulkEditModal = showBulkEditModal;
window.deleteBulkSelected = deleteBulkSelected;
window.toggleEditEntry = toggleEditEntry;
window.deleteActivityEntry = deleteActivityEntry;
window.saveEntryChanges = saveEntryChanges;
window.cancelEntryEdit = cancelEntryEdit;
window.closeBulkEditModal = closeBulkEditModal;
window.applyBulkEdit = applyBulkEdit;
window.filterByParticipant = filterByParticipant;
window.updateParticipantFilter = updateParticipantFilter;
window.filterActivityLog = filterActivityLog;
window.toggleSelectAll = toggleSelectAll;
window.updateBulkActions = updateBulkActions;
window.updateEntryTime = updateEntryTime;
window.updateEntryParticipant = updateEntryParticipant;
window.updateEntryActivityType = updateEntryActivityType;
window.updateEntryStation = updateEntryStation;
window.updateEntryPriorStation = updateEntryPriorStation;
window.updateEntryNotes = updateEntryNotes;
window.filterParticipantList = filterParticipantList;

// Participant filter functions
function toggleParticipantFilter() {
  const dropdown = document.getElementById('participant-filter-dropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

// Close participant filter when clicking outside
document.addEventListener('click', function(event) {
  const container = event.target.closest('.participant-filter-container');
  if (!container) {
    const dropdown = document.getElementById('participant-filter-dropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }
});

function filterParticipantList() {
  const searchInput = document.getElementById('participant-search');
  const filterList = document.getElementById('participant-filter-list');
  const searchTerm = searchInput.value.toLowerCase();
  
  const items = filterList.querySelectorAll('.participant-filter-item');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(searchTerm) ? 'block' : 'none';
  });
}

function selectAllParticipants() {
  const checkboxes = document.querySelectorAll('#participant-filter-list input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (checkbox.closest('.participant-filter-item').style.display !== 'none') {
      checkbox.checked = true;
    }
  });
  updateParticipantFilter();
}

function clearAllParticipants() {
  const checkboxes = document.querySelectorAll('#participant-filter-list input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (checkbox.closest('.participant-filter-item').style.display !== 'none') {
      checkbox.checked = false;
    }
  });
  updateParticipantFilter();
}

function updateParticipantFilter() {
  const checkboxes = document.querySelectorAll('#participant-filter-list input[type="checkbox"]:checked');
  const header = document.querySelector('.participant-filter-header span');
  
  if (checkboxes.length === 0) {
    header.textContent = 'No Participants Selected';
  } else if (checkboxes.length === document.querySelectorAll('#participant-filter-list input[type="checkbox"]').length) {
    header.textContent = '✓ All Participants';
  } else {
    header.textContent = `✓ ${checkboxes.length} Participants`;
  }
  
  filterActivityLog();
}

// Course analysis functions
function analyzeCourseProgression(participant, entry, priorStation) {
  if (!participant || !participant.courseId || !['arrival', 'departed'].includes(entry.activityType)) {
    return null;
  }
  
  const course = eventData.courses.find(c => c.id === participant.courseId);
  if (!course) return null;
  
  // Debug logging for participant 500
  if (participant.id === '500') {
    console.log('Course Analysis Debug for 500:', {
      participant,
      entry,
      priorStation,
      course,
      courseStations: course.stations,
      currentStation: entry.stationId,
      priorStationId: priorStation?.id
    });
  }
  
  const currentStationIndex = course.stations.findIndex(cs => cs.stationId === entry.stationId);
  const priorStationIndex = priorStation ? 
    course.stations.findIndex(cs => cs.stationId === priorStation.id) : -1;
  
  // DNF and DNS can be reached from anywhere
  const flexibleStations = ['dnf', 'dns'];
  if (flexibleStations.includes(entry.stationId)) {
    const activityMessage = entry.activityType === 'departed' ? 'Valid departure to status' : 'Valid transition';
    return {
      status: 'valid',
      message: activityMessage,
      cumulativeDistance: priorStationIndex >= 0 ? (course.stations[priorStationIndex].cumulative || 0) : 0
    };
  }
  
  // Check if current station is in course
  if (currentStationIndex === -1) {
    return {
      status: 'error',
      message: 'Station not in participant course',
      cumulativeDistance: null
    };
  }
  
  // Check progression order
  if (priorStationIndex >= 0) {
    // For departures, same station is valid (departing where you arrived)
    if (entry.activityType === 'departed' && currentStationIndex === priorStationIndex) {
      return {
        status: 'valid',
        message: 'Valid departure from arrival station',
        cumulativeDistance: course.stations[currentStationIndex].cumulative || 0
      };
    }
    
    // For arrivals, moving backwards or to same station is a warning
    if (currentStationIndex <= priorStationIndex) {
      return {
        status: 'warning',
        message: 'Moving backwards or to same station',
        cumulativeDistance: course.stations[currentStationIndex].cumulative || 0
      };
    }
    
    // Check if skipping stations (more than 1 station ahead)
    if (currentStationIndex > priorStationIndex + 1) {
      const skippedCount = currentStationIndex - priorStationIndex - 1;
      const skippedStations = course.stations
        .slice(priorStationIndex + 1, currentStationIndex)
        .map(cs => {
          const station = eventData.aidStations.find(s => s.id === cs.stationId);
          return station ? station.name : cs.stationId;
        })
        .join(', ');
      
      return {
        status: 'warning',
        message: `Skipping ${skippedCount} station${skippedCount > 1 ? 's' : ''}: ${skippedStations}`,
        cumulativeDistance: course.stations[currentStationIndex].cumulative || 0
      };
    }
  }
  
  // Valid progression
  const activityMessage = entry.activityType === 'departed' ? 'Valid departure' : 'Valid course progression';
  return {
    status: 'valid',
    message: activityMessage,
    cumulativeDistance: course.stations[currentStationIndex].cumulative || 0
  };
}

function renderCourseAnalysis(analysis) {
  if (!analysis) return '—';
  
  const statusIcons = {
    valid: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  return `
    <div class="course-analysis-badge course-analysis-${analysis.status}" 
         title="${analysis.message}">
      ${statusIcons[analysis.status]} ${analysis.message}
    </div>
  `;
}

// Render course analysis as clickable icon
function renderCourseAnalysisIcon(analysis, participant) {
  if (!analysis) return '—';
  
  const statusIcons = {
    valid: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  const participantId = participant ? participant.id : '';
  
  return `
    <div class="course-analysis-icon course-analysis-${analysis.status}" 
         title="${analysis.message} (Click to filter by this participant)"
         onclick="filterByParticipant('${participantId}')">
      ${statusIcons[analysis.status]}
    </div>
  `;
}

// Calculate duration since last event for a participant
function calculateDurationSinceLastEvent(participantId, currentEntry) {
  const participantEntries = eventData.activityLog
    .filter(entry => entry.participantId === participantId)
    .sort((a, b) => new Date(a.userTime || a.timestamp) - new Date(b.userTime || b.timestamp));
  
  const currentIndex = participantEntries.findIndex(entry => entry.id === currentEntry.id);
  if (currentIndex <= 0) return null; // First entry or not found
  
  const previousEntry = participantEntries[currentIndex - 1];
  const currentTime = new Date(currentEntry.userTime || currentEntry.timestamp);
  const previousTime = new Date(previousEntry.userTime || previousEntry.timestamp);
  
  return currentTime - previousTime; // Duration in milliseconds
}

// Format duration in a human-readable way
function formatDuration(durationMs) {
  if (!durationMs || durationMs < 0) return '—';
  
  const minutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '<1m';
  }
}

// Filter activity log by specific participant
function filterByParticipant(participantId) {
  if (!participantId) return;
  
  // Clear all participant checkboxes first
  const participantCheckboxes = document.querySelectorAll('#participant-filter-list input[type="checkbox"]');
  participantCheckboxes.forEach(cb => cb.checked = false);
  
  // Check only the specific participant
  const targetCheckbox = document.querySelector(`#participant-filter-list input[value="${participantId}"]`);
  if (targetCheckbox) {
    targetCheckbox.checked = true;
  }
  
  // Update the participant filter display
  updateParticipantFilter();
  
  // Clear other filters to focus on this participant
  const stationFilter = document.getElementById('filter-station');
  const courseFilter = document.getElementById('filter-course');
  const activityFilter = document.getElementById('filter-activity-type');
  const courseIssuesFilter = document.getElementById('filter-course-issues');
  if (stationFilter) stationFilter.value = '';
  if (courseFilter) courseFilter.value = '';
  if (activityFilter) activityFilter.value = '';
  if (courseIssuesFilter) courseIssuesFilter.value = '';
  
  // Apply the filter
  filterActivityLog();
} 