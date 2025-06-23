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

// Modal logic for bulk entry
let selectedStationIdx = 0;
let selectedAction = 'Arrived';

function openBulkModal(stationIdx) {
  selectedStationIdx = stationIdx;
  selectedAction = 'Arrived';
  batchModal.classList.remove('hidden');
  // Set dropdowns
  document.getElementById('modal-station-select').value = stationIdx;
  document.getElementById('modal-action-select').value = 'Arrived';
  const input = document.getElementById('batch-bib-input');
  input.value = '';
  // Auto-focus on the input for faster entry
  setTimeout(() => input.focus(), 100);
}

// Add dropdowns to modal on page load
function enhanceModal() {
  // Station select
  let stationSelect = document.createElement('select');
  stationSelect.id = 'modal-station-select';
  aidStations.forEach((s, i) => {
    let opt = document.createElement('option');
    opt.value = i;
    opt.textContent = s.name;
    stationSelect.appendChild(opt);
  });
  // Action select
  let actionSelect = document.createElement('select');
  actionSelect.id = 'modal-action-select';
  ['Arrived', 'Departed', 'DNF'].forEach(action => {
    let opt = document.createElement('option');
    opt.value = action;
    opt.textContent = action;
    actionSelect.appendChild(opt);
  });
  // Place selects inside their input-group divs
  const stationGroup = document.querySelector('.input-group:nth-of-type(1)');
  const actionGroup = document.querySelector('.input-group:nth-of-type(2)');
  if (stationGroup) stationGroup.appendChild(stationSelect);
  if (actionGroup) actionGroup.appendChild(actionSelect);
}

document.addEventListener('DOMContentLoaded', enhanceModal);

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

// Handle batch bib entry submit
const submitBatchBtn = document.getElementById('submit-batch');
submitBatchBtn.addEventListener('click', () => {
  const input = document.getElementById('batch-bib-input').value;
  const stationIdx = Number(document.getElementById('modal-station-select').value);
  const action = document.getElementById('modal-action-select').value;
  const entries = parseBulkEntry(input);
  entries.forEach(({ bibs, time }) => {
    bibs.forEach(bib => {
      // Ensure participant exists
      findOrCreateParticipant(bib);
      
      // Remove bib from all stations (handle both numbers and strings)
      let fromStation = null;
      aidStations.forEach((s, i) => {
        const idx = s.bibs.findIndex(b => b === bib || b === Number(bib));
        if (idx !== -1) {
          fromStation = s.name;
          s.bibs.splice(idx, 1);
        }
      });
      // Only add if action is Arrived
      if (action === 'Arrived') {
        aidStations[stationIdx].bibs.push(bib);
      }
      
      // Log activity with proper parameters
      const activityType = action.toLowerCase();
      logActivity(activityType, bib, aidStations[stationIdx].name, aidStations[stationIdx].name, time, fromStation ? `From ${fromStation}` : '');
    });
  });
  renderKanbanBoard();
  batchModal.classList.add('hidden');
  saveData();
});

// Autocomplete for bib input
function setupAutocomplete() {
  const input = document.getElementById('batch-bib-input');
  const suggestionsBox = document.getElementById('autocomplete-suggestions');

  input.addEventListener('input', (e) => {
    const val = input.value;
    // Get current line being edited
    const lines = val.split('\n');
    const cursorPos = input.selectionStart;
    let lineIdx = 0, charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (cursorPos <= charCount + lines[i].length) {
        lineIdx = i;
        break;
      }
      charCount += lines[i].length + 1;
    }
    const currentLine = lines[lineIdx] || '';
    // Get last fragment (could be text or number)
    const match = currentLine.match(/(\S*)$/);
    const fragment = match ? match[1] : '';
    if (!fragment) {
      suggestionsBox.style.display = 'none';
      return;
    }
    // Suggest all active race participants not in selected station
    const stationIdx = Number(document.getElementById('modal-station-select').value);
    const inStation = aidStations[stationIdx].bibs;
    const raceParticipants = participants.filter(p => p.type === 'race' && p.isActive);
    const suggestions = raceParticipants
      .filter(p => !inStation.includes(p.name) && !inStation.includes(Number(p.id)))
      .filter(p => p.name.toLowerCase().includes(fragment.toLowerCase()) || p.id.toLowerCase().includes(fragment.toLowerCase()))
      .map(p => p.name);
    
    if (suggestions.length === 0) {
      suggestionsBox.style.display = 'none';
      return;
    }
    suggestionsBox.innerHTML = '';
    suggestions.forEach(bib => {
      const div = document.createElement('div');
      div.className = 'autocomplete-suggestion';
      div.textContent = bib;
      div.onclick = () => {
        // Replace fragment in current line with bib
        lines[lineIdx] = currentLine.replace(/\S*$/, bib);
        input.value = lines.join('\n');
        suggestionsBox.style.display = 'none';
        input.focus();
      };
      suggestionsBox.appendChild(div);
    });
    suggestionsBox.style.display = 'block';
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { suggestionsBox.style.display = 'none'; }, 150);
  });
}

document.addEventListener('DOMContentLoaded', setupAutocomplete);

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
  enhanceModal();
  setupAutocomplete();
  renderKanbanBoard();
  
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

document.addEventListener('DOMContentLoaded', addModalKeyboardShortcuts);

// TODO: Add logic for export/import, drag-and-drop, and Kanban state 