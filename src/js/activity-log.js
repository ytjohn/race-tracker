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
    
    <div class="activity-log-filters">
      <div class="filter-section">
        <div class="filter-controls">
          <select id="filter-participant" onchange="filterActivityLog()" class="filter-select">
            <option value="">All Participants</option>
            ${getUniqueParticipants(sortedLog).map(p => 
              `<option value="${p.id}">${p.name} (${p.id})</option>`
            ).join('')}
          </select>
          
          <select id="filter-station" onchange="filterActivityLog()" class="filter-select">
            <option value="">All Stations</option>
            ${getUniqueStations(sortedLog).map(s => 
              `<option value="${s.id}">${s.name}</option>`
            ).join('')}
          </select>
          
          <select id="filter-activity-type" onchange="filterActivityLog()" class="filter-select">
            <option value="">All Activity Types</option>
            <option value="arrival">Arrivals</option>
            <option value="departed">Departures</option>
            <option value="suspect">Suspect Data</option>
            <option value="other">Messages/Other</option>
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
            <th class="activity-column">Activity</th>
            <th class="station-column">Station</th>
            <th class="prior-station-column">Prior Station</th>
            <th class="notes-column">Notes</th>
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
              <option value="suspect" ${entry.activityType === 'suspect' ? 'selected' : ''}>Suspect</option>
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
        <td class="notes-cell">
          <div class="notes-display">${entry.notes || '—'}</div>
          <div class="notes-edit hidden">
            <textarea onchange="updateEntryNotes('${entry.id}', this.value)" 
                      placeholder="Add notes...">${entry.notes || ''}</textarea>
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
  const participantFilter = document.getElementById('filter-participant').value;
  const stationFilter = document.getElementById('filter-station').value;
  const activityFilter = document.getElementById('filter-activity-type').value;
  
  let filteredLog = [...eventData.activityLog];
  
  if (participantFilter) {
    filteredLog = filteredLog.filter(entry => entry.participantId === participantFilter);
  }
  
  if (stationFilter) {
    filteredLog = filteredLog.filter(entry => entry.stationId === stationFilter);
  }
  
  if (activityFilter) {
    filteredLog = filteredLog.filter(entry => entry.activityType === activityFilter);
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
  document.getElementById('filter-participant').value = '';
  document.getElementById('filter-station').value = '';
  document.getElementById('filter-activity-type').value = '';
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
    row.querySelectorAll('.time-display, .participant-display, .activity-display, .station-display, .prior-station-display, .notes-display').forEach(el => {
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
  row.querySelectorAll('.time-display, .participant-display, .activity-display, .station-display, .prior-station-display, .notes-display').forEach(el => {
    el.classList.remove('hidden');
  });
  row.querySelectorAll('.time-edit, .participant-edit, .activity-edit, .station-edit, .prior-station-edit, .notes-edit').forEach(el => {
    el.classList.add('hidden');
  });
  row.querySelector('.action-buttons').classList.remove('hidden');
  row.querySelector('.edit-actions').classList.add('hidden');
  
  // Reset form values to original
  renderActivityLogManagement();
}

// Save entry changes
function saveEntryChanges(entryId) {
  saveData();
  cancelEntryEdit(entryId);
  
  // Re-render to show updated data
  renderActivityLogManagement();
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
  const headers = ['Time', 'Participant ID', 'Participant Name', 'Activity Type', 'Station', 'Prior Station', 'Notes'];
  
  const rows = logEntries.map(entry => {
    const participant = entry.participantId ? 
      eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    const priorStation = entry.priorStationId ? 
      eventData.aidStations.find(s => s.id === entry.priorStationId) : null;
    const time = new Date(entry.userTime || entry.timestamp);
    
    return [
      formatTime(time),
      participant ? participant.id : '',
      participant ? participant.name : '',
      formatActivityType(entry.activityType),
      station ? station.name : 'Unknown',
      priorStation ? priorStation.name : '',
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
                <option value="suspect">Suspect</option>
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
  // Check if the batch modal functions exist
  if (window.openBatchModal && window.renderBatchModal) {
    // Open the batch modal for general activity logging
    window.openBatchModal();
  } else {
    // Create a simplified add activity modal if batch modal isn't available
    createStandaloneAddActivityModal();
  }
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
                   <option value="suspect">Suspect</option>
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