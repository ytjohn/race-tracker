// Basic modal logic
const openBatchModalBtn = document.getElementById('open-batch-modal');
const closeBatchModalBtn = document.getElementById('close-batch-modal');
const batchModal = document.getElementById('batch-modal');

openBatchModalBtn.addEventListener('click', () => {
  batchModal.classList.remove('hidden');
});
closeBatchModalBtn.addEventListener('click', () => {
  batchModal.classList.add('hidden');
});

// Sample data for Kanban columns and bibs
const aidStations = [
  { name: 'Start', bibs: [102, 103, 115, 133, '50k Sweep', 'Half Sweep'] },
  { name: 'Burnt House', bibs: [512, 501, 517, 525, 531, 533] },
  { name: 'Lost Children', bibs: [535, 530, 532, 529, 503, 514] },
  { name: 'Hairpin', bibs: [526, 520, 507, 534] },
  { name: 'Finish', bibs: [126, 110, 506, 106] }
];

// Participants data structure
const participants = [
  // Initialize with existing bibs as race participants
  ...aidStations.flatMap(s => s.bibs).filter(bib => typeof bib === 'number').map(bib => ({
    id: String(bib),
    name: String(bib),
    type: 'race',
    isActive: true
  })),
  // Add sweep participants as race participants
  { id: '50k-sweep', name: '50k Sweep', type: 'race', isActive: true },
  { id: 'half-sweep', name: 'Half Sweep', type: 'race', isActive: true },
  // Add station participants as other
  { id: 'station-burnt', name: 'Burnt House Station', type: 'other', isActive: true },
  { id: 'station-lost', name: 'Lost Children Station', type: 'other', isActive: true },
  { id: 'station-hairpin', name: 'Hairpin Station', type: 'other', isActive: true }
];

// Activity log data structure
const activityLog = [];

// Helper functions for logging
function generateId() {
  return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function addParticipant(id, name, type = 'other') {
  const participant = { id, name, type, isActive: true };
  participants.push(participant);
  // Log the creation of new participant
  logActivity('other', id, 'System', 'System', null, `New participant added: ${name} (${type})`);
  saveData();
  return participant;
}

function logActivity(activity, participantId, station, reportingStation = null, userTime = null, notes = '') {
  const timestamp = new Date().toISOString();
  const defaultUserTime = userTime || new Date().toLocaleTimeString();
  const entry = {
    id: generateId(),
    timestamp, // When logged by user
    userTime: defaultUserTime, // Time provided by user or current time
    participant: participantId,
    activity, // 'arrival', 'departed', 'dnf', 'dns', 'other'
    station,
    reportingStation: reportingStation || station,
    notes,
    createdAt: timestamp,
    modifiedAt: timestamp
  };
  activityLog.push(entry);
  console.log('Activity logged:', entry);
  saveData();
  return entry;
}

// Helper: Find or create participant
function findOrCreateParticipant(id) {
  let participant = participants.find(p => p.id === id || p.name === id);
  if (!participant) {
    console.log(`Creating new participant: ${id}`);
    participant = addParticipant(id, id, 'other');
  }
  return participant;
}

// Enable drag-and-drop for bib cards
function addDragAndDrop() {
  const bibCards = document.querySelectorAll('.bib-card');
  const bibRows = document.querySelectorAll('.bib-row');

  bibCards.forEach(card => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.textContent);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', (e) => {
      card.classList.remove('dragging');
    });
  });

  bibRows.forEach(row => {
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('dragover');
    });
    row.addEventListener('dragleave', (e) => {
      row.classList.remove('dragover');
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('dragover');
      const bib = e.dataTransfer.getData('text/plain');
      // Find and remove bib from its current station (handle both numbers and strings)
      let fromStation = null;
      for (const station of aidStations) {
        const idx = station.bibs.findIndex(b => b === bib || b === Number(bib));
        if (idx !== -1) {
          fromStation = station.name;
          station.bibs.splice(idx, 1);
          break;
        }
      }
      // Add bib to the new station
      const colIdx = Array.from(bibRows).indexOf(row);
      if (colIdx !== -1) {
        aidStations[colIdx].bibs.push(bib);
        // Log the activity
        findOrCreateParticipant(bib);
        logActivity('arrival', bib, aidStations[colIdx].name, aidStations[colIdx].name, null, `Moved from ${fromStation || 'unknown'}`);
      }
      renderKanbanBoard();
      addDragAndDrop();
    });
  });
}

// Helper: Parse flexible time input
function parseTimeInput(timeStr) {
  if (!timeStr || timeStr.trim() === '') return null;
  
  const input = timeStr.trim().toUpperCase();
  const now = new Date();
  
  // Handle various time formats
  let hours = 0, minutes = 0;
  
  // Format: "2PM", "2AM", "14PM" (treat PM as indicator)
  if (input.match(/^\d{1,2}[AP]M?$/)) {
    hours = parseInt(input);
    const isPM = input.includes('P');
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  }
  // Format: "10:05", "2:30"
  else if (input.match(/^\d{1,2}:\d{2}$/)) {
    const parts = input.split(':');
    hours = parseInt(parts[0]);
    minutes = parseInt(parts[1]);
  }
  // Format: "1005", "1430" (military/condensed time)
  else if (input.match(/^\d{3,4}$/)) {
    if (input.length === 3) {
      hours = parseInt(input.substring(0, 1));
      minutes = parseInt(input.substring(1));
    } else {
      hours = parseInt(input.substring(0, 2));
      minutes = parseInt(input.substring(2));
    }
  }
  // Format: "10" (assume hour, 0 minutes)
  else if (input.match(/^\d{1,2}$/)) {
    hours = parseInt(input);
  }
  else {
    // Couldn't parse, return original
    return timeStr;
  }
  
  // Validate and create time string
  if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
    const timeObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return timeStr; // Return original if parsing failed
}

// Helper: Parse bulk bib entry with improved time parsing
function parseBulkEntry(input) {
  // Each line: bibs (comma separated) [@ time]
  // Example: 101, 102, 50k Sweep @ 10:05
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  lines.forEach(line => {
    let [bibsPart, timePart] = line.split('@').map(s => s.trim());
    // Split only on commas, not spaces, to preserve multi-word names
    const bibs = bibsPart.split(',').map(b => b.trim()).filter(Boolean);
    let time = timePart ? parseTimeInput(timePart) : null;
    entries.push({ bibs, time });
  });
  return entries;
}

// Batch modal state
let batchRows = [];
let batchRowCounter = 0;

// Create a new batch row
function createBatchRow(stationIdx = 0) {
  // Use last row's settings as defaults for new rows
  let defaultStationIdx = stationIdx;
  let defaultUpdateType = 'race-update';
  let defaultAction = 'arrived';
  
  if (batchRows.length > 0) {
    const lastRow = batchRows[batchRows.length - 1];
    defaultStationIdx = lastRow.stationIdx;
    defaultUpdateType = lastRow.updateType;
    defaultAction = lastRow.action;
  }
  
  const rowId = `batch-row-${++batchRowCounter}`;
  const row = {
    id: rowId,
    stationIdx: defaultStationIdx,
    updateType: defaultUpdateType, // 'race-update' or 'race-message'
    action: defaultAction,
    participants: [],
    message: '',
    time: ''
  };
  batchRows.push(row);
  return row;
}

// Remove a batch row
function removeBatchRow(rowId) {
  batchRows = batchRows.filter(row => row.id !== rowId);
  document.getElementById(rowId).remove();
}

// Render a batch row in the DOM
function renderBatchRow(row) {
  const container = document.getElementById('batch-rows-container');
  const rowDiv = document.createElement('div');
  rowDiv.className = 'batch-row';
  rowDiv.id = row.id;
  
  rowDiv.innerHTML = `
    <div class="batch-row-header">
      <span>Entry ${row.id.split('-')[2]}</span>
      <button class="remove-row-btn" onclick="removeBatchRow('${row.id}')">Remove</button>
    </div>
    <div class="batch-row-fields ${row.updateType}">
      <div class="input-group">
        <label>Aid Station</label>
        <select class="station-select" data-row="${row.id}">
          ${aidStations.map((s, i) => `<option value="${i}" ${i === row.stationIdx ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label>Update Type</label>
        <select class="update-type-select" data-row="${row.id}">
          <option value="race-update" ${row.updateType === 'race-update' ? 'selected' : ''}>Race Update</option>
          <option value="race-message" ${row.updateType === 'race-message' ? 'selected' : ''}>Race Message</option>
        </select>
      </div>
      <div class="input-group conditional-field">
        ${row.updateType === 'race-update' ? renderRaceUpdateFields(row) : renderRaceMessageFields(row)}
      </div>
      <div class="input-group">
        <label>Time</label>
        <input type="text" class="time-input" data-row="${row.id}" value="${row.time}" placeholder="10:05, 2PM, 1430">
      </div>
    </div>
  `;
  
  container.appendChild(rowDiv);
  setupRowEventListeners(row);
}

// Render race update fields (action + participants tags)
function renderRaceUpdateFields(row) {
  return `
    <div class="race-update-fields">
      <label>Action</label>
      <select class="action-select" data-row="${row.id}">
        <option value="arrived" ${row.action === 'arrived' ? 'selected' : ''}>Arrived</option>
        <option value="departed" ${row.action === 'departed' ? 'selected' : ''}>Departed</option>
        <option value="dnf" ${row.action === 'dnf' ? 'selected' : ''}>DNF</option>
        <option value="dns" ${row.action === 'dns' ? 'selected' : ''}>DNS</option>
      </select>
      <label>Participants</label>
      <div class="tags-input-container">
        <div class="tags-input" data-row="${row.id}">
          ${row.participants.map(p => `<span class="tag">${p}<span class="tag-remove" onclick="removeParticipantTag('${row.id}', '${p}')">×</span></span>`).join('')}
          <input type="text" class="tag-input" placeholder="Type participant name or bib">
        </div>
        <div class="suggestions-dropdown hidden"></div>
      </div>
    </div>
  `;
}

// Render race message fields (free-form text)
function renderRaceMessageFields(row) {
  return `
    <div class="race-message-fields">
      <label>Message</label>
      <textarea class="message-input" data-row="${row.id}" placeholder="Free-form message (e.g., 'Station requests 2 cases water')" rows="3">${row.message}</textarea>
    </div>
  `;
}

// Setup event listeners for a batch row
function setupRowEventListeners(row) {
  const rowElement = document.getElementById(row.id);
  
  // Station select
  rowElement.querySelector('.station-select').addEventListener('change', (e) => {
    row.stationIdx = parseInt(e.target.value);
  });
  
  // Update type select
  rowElement.querySelector('.update-type-select').addEventListener('change', (e) => {
    row.updateType = e.target.value;
    // Re-render the conditional field
    const conditionalField = rowElement.querySelector('.conditional-field');
    conditionalField.innerHTML = row.updateType === 'race-update' ? renderRaceUpdateFields(row) : renderRaceMessageFields(row);
    rowElement.querySelector('.batch-row-fields').className = `batch-row-fields ${row.updateType}`;
    setupRowEventListeners(row); // Re-setup listeners for new fields
  });
  
  // Time input
  rowElement.querySelector('.time-input').addEventListener('input', (e) => {
    row.time = e.target.value;
  });
  
  // Conditional field listeners
  if (row.updateType === 'race-update') {
    // Action select
    rowElement.querySelector('.action-select').addEventListener('change', (e) => {
      row.action = e.target.value;
    });
    
    // Tags input
    setupTagsInput(row);
  } else {
    // Message textarea
    rowElement.querySelector('.message-input').addEventListener('input', (e) => {
      row.message = e.target.value;
    });
  }
}

// Setup tags input with autocomplete
function setupTagsInput(row) {
  const rowElement = document.getElementById(row.id);
  const tagsInput = rowElement.querySelector('.tags-input');
  const tagInput = rowElement.querySelector('.tag-input');
  const suggestionsDropdown = rowElement.querySelector('.suggestions-dropdown');
  
  // Focus on tags input container
  tagsInput.addEventListener('click', () => {
    tagInput.focus();
  });
  
  // Handle input in tag field
  tagInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value) {
      showSuggestions(row.id, value);
    } else {
      hideSuggestions(row.id);
    }
  });
  
  // Improved keyboard handling
  tagInput.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && e.target.value.trim()) {
      e.preventDefault();
      addParticipantTag(row.id, e.target.value.trim());
      hideSuggestions(row.id);
    }
    if (e.key === 'Escape') {
      hideSuggestions(row.id);
      e.target.value = '';
    }
  });
  
  // Hide suggestions on blur
  tagInput.addEventListener('blur', () => {
    setTimeout(() => hideSuggestions(row.id), 150);
  });
}

// Show autocomplete suggestions
function showSuggestions(rowId, fragment) {
  const row = batchRows.find(r => r.id === rowId);
  const suggestionsDropdown = document.querySelector(`#${rowId} .suggestions-dropdown`);
  
  // Get race participants not already in this row
  const raceParticipants = participants.filter(p => p.type === 'race' && p.isActive);
  const suggestions = raceParticipants
    .filter(p => !row.participants.includes(p.name))
    .filter(p => p.name.toLowerCase().includes(fragment.toLowerCase()) || p.id.toLowerCase().includes(fragment.toLowerCase()))
    .slice(0, 8); // Limit suggestions
  
  let html = '';
  
  // Add existing participant suggestions
  suggestions.forEach(p => {
    html += `<div class="suggestion-item" onclick="addParticipantTag('${rowId}', '${p.name}')">Add ${p.name}</div>`;
  });
  
  // Add "new participant" option if no exact match
  const exactMatch = suggestions.find(p => p.name.toLowerCase() === fragment.toLowerCase());
  if (!exactMatch && fragment) {
    html += `<div class="suggestion-item new-participant" onclick="addParticipantTag('${rowId}', '${fragment}')">Add "${fragment}" as new participant</div>`;
  }
  
  if (html) {
    suggestionsDropdown.innerHTML = html;
    suggestionsDropdown.classList.remove('hidden');
  } else {
    hideSuggestions(rowId);
  }
}

// Hide suggestions
function hideSuggestions(rowId) {
  const suggestionsDropdown = document.querySelector(`#${rowId} .suggestions-dropdown`);
  suggestionsDropdown.classList.add('hidden');
}

// Add participant tag (improved to avoid re-rendering entire row)
function addParticipantTag(rowId, participantName) {
  const row = batchRows.find(r => r.id === rowId);
  if (!row.participants.includes(participantName)) {
    row.participants.push(participantName);
    updateParticipantTags(rowId); // Just update tags, not entire row
  }
}

// Remove participant tag (improved to avoid re-rendering entire row)
function removeParticipantTag(rowId, participantName) {
  const row = batchRows.find(r => r.id === rowId);
  row.participants = row.participants.filter(p => p !== participantName);
  updateParticipantTags(rowId); // Just update tags, not entire row
}

// Update just the participant tags without re-rendering entire row
function updateParticipantTags(rowId) {
  const row = batchRows.find(r => r.id === rowId);
  const tagsInput = document.querySelector(`#${rowId} .tags-input`);
  const tagInput = tagsInput.querySelector('.tag-input');
  
  // Remove existing tags but keep the input
  const existingTags = tagsInput.querySelectorAll('.tag');
  existingTags.forEach(tag => tag.remove());
  
  // Add updated tags
  row.participants.forEach(p => {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.innerHTML = `${p}<span class="tag-remove" onclick="removeParticipantTag('${rowId}', '${p}')">×</span>`;
    tagsInput.insertBefore(tagElement, tagInput);
  });
  
  // Clear and focus the input
  tagInput.value = '';
  tagInput.focus();
}

// Open batch modal
function openBulkModal(stationIdx) {
  // Reset modal state
  batchRows = [];
  batchRowCounter = 0;
  document.getElementById('batch-rows-container').innerHTML = '';
  document.getElementById('batch-preview').classList.add('hidden');
  
  // Ensure form sections are visible when opening
  const batchRowsContainer = document.getElementById('batch-rows-container');
  const addRowBtn = document.getElementById('add-batch-row');
  const previewBtn = document.getElementById('preview-batch');
  
  batchRowsContainer.classList.remove('hidden');
  if (addRowBtn) addRowBtn.style.display = 'inline-block';
  if (previewBtn) previewBtn.style.display = 'inline-block';
  
  // Create first row
  const firstRow = createBatchRow(stationIdx);
  renderBatchRow(firstRow);
  
  batchModal.classList.remove('hidden');
}

// Add new batch row
document.addEventListener('click', (e) => {
  if (e.target.id === 'add-batch-row') {
    const newRow = createBatchRow();
    renderBatchRow(newRow);
  }
});

// Preview batch
document.addEventListener('click', (e) => {
  if (e.target.id === 'preview-batch') {
    showBatchPreview();
  }
});

// Back to edit - show forms and hide preview
document.addEventListener('click', (e) => {
  if (e.target.id === 'back-to-edit') {
    const batchRowsContainer = document.getElementById('batch-rows-container');
    const addRowBtn = document.getElementById('add-batch-row');
    const previewBtn = document.getElementById('preview-batch');
    
    // Show form sections and buttons, hide preview
    batchRowsContainer.classList.remove('hidden');
    if (addRowBtn) addRowBtn.style.display = 'inline-block';
    if (previewBtn) previewBtn.style.display = 'inline-block';
    document.getElementById('batch-preview').classList.add('hidden');
  }
});

// Submit batch
document.addEventListener('click', (e) => {
  if (e.target.id === 'submit-batch') {
    submitBatch();
  }
});

// Show batch preview
function showBatchPreview() {
  const previewContent = document.getElementById('preview-content');
  const batchRowsContainer = document.getElementById('batch-rows-container');
  const addRowBtn = document.getElementById('add-batch-row');
  const previewBtn = document.getElementById('preview-batch');
  
  previewContent.innerHTML = '';
  
  batchRows.forEach((row, index) => {
    const stationName = aidStations[row.stationIdx].name;
    const parsedTime = row.time ? parseTimeInput(row.time) : new Date().toLocaleTimeString();
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'preview-entry';
    
    if (row.updateType === 'race-update') {
      const participantsList = row.participants.length > 0 ? row.participants.join(', ') : '<em>No participants selected</em>';
      previewDiv.innerHTML = `
        <div class="preview-entry-header">${stationName} - ${row.action.toUpperCase()}</div>
        <div class="preview-entry-details">
          <div><strong>Participants:</strong> <span class="preview-participants">${participantsList}</span></div>
          <div><strong>Time:</strong> <span class="preview-time">${parsedTime}</span></div>
        </div>
      `;
    } else {
      const message = row.message.trim() || '<em>No message entered</em>';
      previewDiv.innerHTML = `
        <div class="preview-entry-header">${stationName} - MESSAGE</div>
        <div class="preview-entry-details">
          <div><strong>Message:</strong> ${message}</div>
          <div><strong>Time:</strong> <span class="preview-time">${parsedTime}</span></div>
        </div>
      `;
    }
    
    previewContent.appendChild(previewDiv);
  });
  
  // Hide form sections and buttons, show preview
  batchRowsContainer.classList.add('hidden');
  if (addRowBtn) addRowBtn.style.display = 'none';
  if (previewBtn) previewBtn.style.display = 'none';
  document.getElementById('batch-preview').classList.remove('hidden');
}

// Submit all batch entries
function submitBatch() {
  batchRows.forEach(row => {
    const stationName = aidStations[row.stationIdx].name;
    const time = row.time ? parseTimeInput(row.time) : null;
    
    if (row.updateType === 'race-update') {
      // Process race updates
      row.participants.forEach(participantName => {
        findOrCreateParticipant(participantName);
        
        // Remove from current station and add to new station
        aidStations.forEach(station => {
          const idx = station.bibs.findIndex(b => b === participantName || b === Number(participantName));
          if (idx !== -1) {
            station.bibs.splice(idx, 1);
          }
        });
        
        if (row.action === 'arrived') {
          aidStations[row.stationIdx].bibs.push(participantName);
        }
        
        logActivity(row.action, participantName, stationName, stationName, time, '');
      });
    } else {
      // Process race message
      logActivity('other', stationName, stationName, stationName, time, row.message);
    }
  });
  
  renderKanbanBoard();
  batchModal.classList.add('hidden');
  saveData();
}

// Make column titles clickable to open modal (not entire column)
function addColumnClickHandlers() {
  const columnTitles = document.querySelectorAll('.kanban-title');
  columnTitles.forEach((title, idx) => {
    title.style.cursor = 'pointer';
    title.style.position = 'relative';
    // Add a + icon to indicate clickability
    const icon = document.createElement('span');
    icon.textContent = ' +';
    icon.style.fontSize = '1.2em';
    icon.style.color = '#007bff';
    icon.style.fontWeight = 'bold';
    title.appendChild(icon);
    title.onclick = (e) => {
      e.stopPropagation();
      openBulkModal(idx);
    };
  });
}

// Update renderKanbanBoard to call addColumnClickHandlers
function renderKanbanBoard() {
  const board = document.getElementById('kanban-board');
  board.innerHTML = '';
  aidStations.forEach(station => {
    const col = document.createElement('div');
    col.className = 'kanban-column';
    const title = document.createElement('div');
    title.className = 'kanban-title';
    title.textContent = station.name;
    col.appendChild(title);
    const bibRow = document.createElement('div');
    bibRow.className = 'bib-row';
    station.bibs.forEach(bib => {
      const bibCard = document.createElement('div');
      bibCard.className = 'bib-card';
      bibCard.textContent = bib;
      bibRow.appendChild(bibCard);
    });
    col.appendChild(bibRow);
    board.appendChild(col);
  });
  addDragAndDrop();
  addColumnClickHandlers();
}

renderKanbanBoard();

// Data persistence functions
function saveData() {
  try {
    localStorage.setItem('raceTracker_participants', JSON.stringify(participants));
    localStorage.setItem('raceTracker_aidStations', JSON.stringify(aidStations));
    localStorage.setItem('raceTracker_activityLog', JSON.stringify(activityLog));
    console.log('Data saved to localStorage');
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

function loadData() {
  try {
    const savedParticipants = localStorage.getItem('raceTracker_participants');
    const savedStations = localStorage.getItem('raceTracker_aidStations');
    const savedLog = localStorage.getItem('raceTracker_activityLog');
    
    if (savedParticipants) {
      participants.length = 0;
      participants.push(...JSON.parse(savedParticipants));
    }
    if (savedStations) {
      aidStations.length = 0;
      aidStations.push(...JSON.parse(savedStations));
    }
    if (savedLog) {
      activityLog.length = 0;
      activityLog.push(...JSON.parse(savedLog));
    }
    console.log('Data loaded from localStorage');
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderKanbanBoard();
  addModalKeyboardShortcuts();
  
  // Clear data button
  document.getElementById('clear-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.removeItem('raceTracker_participants');
      localStorage.removeItem('raceTracker_aidStations');
      localStorage.removeItem('raceTracker_activityLog');
      location.reload();
    }
  });
});

// Add keyboard shortcuts to modal
function addModalKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only handle when modal is open
    if (batchModal.classList.contains('hidden')) return;
    
    if (e.key === 'Escape') {
      batchModal.classList.add('hidden');
      e.preventDefault();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      document.getElementById('submit-batch').click();
      e.preventDefault();
    }
  });
}

// TODO: Add logic for export/import, drag-and-drop, and Kanban state 