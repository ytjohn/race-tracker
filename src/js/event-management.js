// Event Management functionality

// Render events list page
function renderEventsListPage() {
  const currentEventDisplay = document.getElementById('current-event-display');
  const allEventsContainer = document.getElementById('all-events-container');
  
  if (!currentEventDisplay || !allEventsContainer) return;
  
  // Render current event
  if (eventData) {
    currentEventDisplay.innerHTML = renderEventCard(eventData, true);
  } else {
    currentEventDisplay.innerHTML = '<div class="empty-events-state"><p>No current event</p></div>';
  }
  
  // Render all events
  const allEvents = getAllEvents();
  if (allEvents.length === 0) {
    allEventsContainer.innerHTML = `
      <div class="empty-events-state">
        <h3>No Events Found</h3>
        <p>Create your first race event to get started.</p>
        <button class="btn btn-primary" onclick="createNewEvent()">Create New Event</button>
      </div>
    `;
  } else {
    allEventsContainer.innerHTML = allEvents.map(event => 
      renderEventCard(appData.events[event.id], event.id === appData.currentEventId)
    ).join('');
  }
}

// Render a single event card
function renderEventCard(event, isCurrent = false) {
  const courses = event.courses || [];
  const participants = event.participants || [];
  const activities = event.activityLog || [];
  
  const eventName = event.event?.name || 'Unnamed Event';
  const eventDate = event.event?.date || '';
  const eventLocation = event.event?.location || '';
  const eventDescription = event.event?.description || '';
  
  const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString() : 'No date set';
  
  return `
    <div class="event-card ${isCurrent ? 'current' : ''}" onclick="switchToEventFromCard('${event.id}')">
      <div class="event-card-header">
        <h4 class="event-name">${eventName}</h4>
        <div class="event-actions" onclick="event.stopPropagation()">
          <button class="event-action-btn delete" onclick="confirmDeleteEvent('${event.id}')" title="Delete Event">
            🗑️
          </button>
        </div>
      </div>
      
      <div class="event-details">
        <div class="event-detail-row">
          <span class="event-detail-label">Date:</span>
          <span class="event-detail-value">${formattedDate}</span>
        </div>
        ${eventLocation ? `
        <div class="event-detail-row">
          <span class="event-detail-label">Location:</span>
          <span class="event-detail-value">${eventLocation}</span>
        </div>
        ` : ''}
        ${eventDescription ? `
        <div class="event-detail-row">
          <span class="event-detail-label">Description:</span>
          <span class="event-detail-value">${eventDescription}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="event-stats">
        <div class="event-stat">
          <div class="event-stat-number">${courses.length}</div>
          <div class="event-stat-label">Courses</div>
        </div>
        <div class="event-stat">
          <div class="event-stat-number">${participants.length}</div>
          <div class="event-stat-label">Participants</div>
        </div>
        <div class="event-stat">
          <div class="event-stat-number">${activities.length}</div>
          <div class="event-stat-label">Activities</div>
        </div>
      </div>
    </div>
  `;
}

// Switch to event from card click
function switchToEventFromCard(eventId) {
  if (eventId === appData.currentEventId) {
    // Already current event, go to setup
    showPage('event-setup');
  } else {
    // Switch to this event
    if (switchToEvent(eventId)) {
      showPage('event-setup');
      alert(`Switched to event: ${eventData.event?.name || 'Unnamed Event'}`);
    }
  }
}

// Confirm delete event
function confirmDeleteEvent(eventId) {
  const event = appData.events[eventId];
  if (!event) return;
  
  const eventName = event.event?.name || 'Unnamed Event';
  const isCurrentEvent = eventId === appData.currentEventId;
  
  let message = `Are you sure you want to delete "${eventName}"?`;
  if (isCurrentEvent) {
    message += '\n\nThis is your current event. Deleting it will switch you to another event or create a new one.';
  }
  message += '\n\nThis action cannot be undone.';
  
  showConfirmationDialog(
    'Delete Event',
    message,
    () => {
      if (deleteEvent(eventId)) {
        renderEventsListPage();
        alert(`Event "${eventName}" has been deleted.`);
      } else {
        alert('Failed to delete event.');
      }
    }
  );
}

// Show confirmation dialog
function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
  // Remove any existing dialog
  const existingDialog = document.querySelector('.confirmation-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  const dialog = document.createElement('div');
  dialog.className = 'confirmation-dialog';
  dialog.innerHTML = `
    <div class="confirmation-content">
      <h3>${title}</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <div class="confirmation-actions">
        <button class="btn btn-secondary" onclick="closeConfirmationDialog()">Cancel</button>
        <button class="btn btn-danger" onclick="confirmAction()">Delete</button>
      </div>
    </div>
  `;
  
  // Add event handlers
  dialog.confirmAction = onConfirm;
  dialog.cancelAction = onCancel;
  
  document.body.appendChild(dialog);
  
  // Store reference for cleanup
  window.currentConfirmationDialog = dialog;
}

// Close confirmation dialog
function closeConfirmationDialog() {
  const dialog = document.querySelector('.confirmation-dialog');
  if (dialog) {
    if (dialog.cancelAction) {
      dialog.cancelAction();
    }
    dialog.remove();
  }
  window.currentConfirmationDialog = null;
}

// Confirm action from dialog
function confirmAction() {
  const dialog = window.currentConfirmationDialog;
  if (dialog && dialog.confirmAction) {
    dialog.confirmAction();
  }
  closeConfirmationDialog();
}

// Initialize event management page
function initializeEventManagement() {
  // Add event listeners for navigation buttons
  const newEventFromListBtn = document.getElementById('new-event-from-list');
  const duplicateEventFromListBtn = document.getElementById('duplicate-event-from-list');
  
  if (newEventFromListBtn) {
    newEventFromListBtn.addEventListener('click', () => {
      createNewEvent();
      showPage('event-setup');
    });
  }
  
  if (duplicateEventFromListBtn) {
    duplicateEventFromListBtn.addEventListener('click', () => {
      if (duplicateCurrentEvent()) {
        renderEventsListPage();
      }
    });
  }
  
  // Add event listeners for dropdown buttons
  const duplicateEventBtn = document.getElementById('duplicate-event-btn');
  if (duplicateEventBtn) {
    duplicateEventBtn.addEventListener('click', () => {
      if (duplicateCurrentEvent()) {
        // Refresh current page if it's events list
        const currentPage = document.querySelector('.page.active');
        if (currentPage && currentPage.id === 'events-list') {
          renderEventsListPage();
        }
      }
    });
  }
}

// Update navigation to show current event name
function updateNavigationEventName() {
  const navBrand = document.querySelector('.nav-brand');
  if (navBrand && eventData && eventData.event) {
    const eventName = eventData.event.name || 'Unnamed Event';
    navBrand.textContent = `Race Tracker - ${eventName}`;
  } else if (navBrand) {
    navBrand.textContent = 'Race Tracker';
  }
}

// Update the loadData function to handle async and update navigation
const originalLoadData = window.loadData;
window.loadData = async function() {
  await originalLoadData();
  updateNavigationEventName();
};

// Update switchToEvent to update navigation
const originalSwitchToEvent = window.switchToEvent;
window.switchToEvent = function(eventId) {
  const result = originalSwitchToEvent(eventId);
  if (result) {
    updateNavigationEventName();
  }
  return result;
};

// Update createNewEvent to update navigation
const originalCreateNewEvent = window.createNewEvent;
window.createNewEvent = function() {
  originalCreateNewEvent();
  updateNavigationEventName();
}; 