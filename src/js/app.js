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
  { name: 'Start', bibs: [102, 103, 115, 133] },
  { name: 'Burnt House', bibs: [512, 501, 517, 525, 531, 533] },
  { name: 'Lost Children', bibs: [535, 530, 532, 529, 503, 514] },
  { name: 'Hairpin', bibs: [526, 520, 507, 534] },
  { name: 'Finish', bibs: [126, 110, 506, 106] }
];

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
      // Find and remove bib from its current station
      for (const station of aidStations) {
        const idx = station.bibs.indexOf(Number(bib));
        if (idx !== -1) {
          station.bibs.splice(idx, 1);
          break;
        }
      }
      // Add bib to the new station
      const colIdx = Array.from(bibRows).indexOf(row);
      if (colIdx !== -1) {
        aidStations[colIdx].bibs.push(Number(bib));
      }
      renderKanbanBoard();
      addDragAndDrop();
    });
  });
}

// Helper: Parse bulk bib entry
function parseBulkEntry(input) {
  // Each line: bibs (space/comma separated) [@ time]
  // Example: 101 102 103 @ 10:00
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  lines.forEach(line => {
    let [bibsPart, timePart] = line.split('@').map(s => s.trim());
    const bibs = bibsPart.split(/\s|,/).map(b => b.trim()).filter(Boolean);
    let time = timePart || null;
    entries.push({ bibs, time });
  });
  return entries;
}

// Placeholder for logging activity
function logActivity(action, bib, fromStation, toStation, time) {
  // TODO: Implement logging/persistence
  // console.log(`[${action}] Bib ${bib} from ${fromStation} to ${toStation} at ${time}`);
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
  document.getElementById('batch-bib-input').value = '';
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
      bib = Number(bib);
      // Remove bib from all stations
      let fromStation = null;
      aidStations.forEach((s, i) => {
        const idx = s.bibs.indexOf(bib);
        if (idx !== -1) {
          fromStation = s.name;
          s.bibs.splice(idx, 1);
        }
      });
      // Only add if action is Arrived
      if (action === 'Arrived') {
        aidStations[stationIdx].bibs.push(bib);
      }
      // Call logActivity placeholder
      logActivity(action, bib, fromStation, aidStations[stationIdx].name, time || new Date().toLocaleTimeString());
    });
  });
  renderKanbanBoard();
  batchModal.classList.add('hidden');
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
    // Get last bib fragment
    const match = currentLine.match(/(\d*)$/);
    const fragment = match ? match[1] : '';
    if (!fragment) {
      suggestionsBox.style.display = 'none';
      return;
    }
    // Suggest bibs not in selected station
    const stationIdx = Number(document.getElementById('modal-station-select').value);
    const allBibs = aidStations.flatMap(s => s.bibs);
    const uniqueBibs = Array.from(new Set(allBibs));
    const inStation = aidStations[stationIdx].bibs;
    const suggestions = uniqueBibs.filter(bib => !inStation.includes(bib) && String(bib).startsWith(fragment));
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
        lines[lineIdx] = currentLine.replace(/\d*$/, bib);
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

// TODO: Add logic for export/import, drag-and-drop, and Kanban state 