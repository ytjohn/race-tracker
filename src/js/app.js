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

// Update renderKanbanBoard to call addDragAndDrop after rendering
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
}

renderKanbanBoard();

// Placeholder: Handle batch bib entry
const submitBatchBtn = document.getElementById('submit-batch');
submitBatchBtn.addEventListener('click', () => {
  const input = document.getElementById('batch-bib-input').value;
  // TODO: Parse and process bib numbers
  alert('Batch bibs entered: ' + input);
  batchModal.classList.add('hidden');
});

// TODO: Add logic for export/import, drag-and-drop, and Kanban state 