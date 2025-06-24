// Display Mode Module
// Handles big screen display with auto-rotation, live ticker, and enhanced visuals

// Display mode state
let displayModeActive = false;
let autoRotateEnabled = false;
let currentDisplayView = 'kanban';
let rotationInterval = null;
let tickerInterval = null;
let refreshInterval = null;
let countdownInterval = null;
let rotationCountdown = 0;
let lastActivityCount = 0;
let lastDataHash = '';

// View types and rotation sequence (removed recent-activity)
const DISPLAY_VIEWS = ['kanban', 'statistics'];
const VIEW_ROTATION_TIME = 30000; // 30 seconds per view
const TICKER_UPDATE_TIME = 3000; // Update ticker every 3 seconds
const REFRESH_TIME = 2000; // Refresh data every 2 seconds
const COUNTDOWN_UPDATE_TIME = 1000; // Update countdown every second

// Initialize display mode module
function initializeDisplayMode() {
  console.log('Display mode module initialized');
  
  // Make functions globally accessible
  window.toggleDisplayMode = toggleDisplayMode;
  window.toggleFullscreen = toggleFullscreen;
  window.switchToView = switchToView;
  window.refreshDisplay = refreshDisplay;
}

// Toggle display mode auto-rotation
function toggleDisplayMode() {
  autoRotateEnabled = !autoRotateEnabled;
  const toggleBtn = document.getElementById('display-toggle-btn');
  
  if (autoRotateEnabled) {
    startAutoRotation();
    toggleBtn.textContent = 'Auto-Rotate: ON';
    toggleBtn.style.background = 'rgba(76, 175, 80, 0.3)';
  } else {
    stopAutoRotation();
    toggleBtn.textContent = 'Auto-Rotate: OFF';
    toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  }
}

// Toggle fullscreen mode
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Error attempting to enable fullscreen:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Switch to specific view
function switchToView(viewName) {
  if (DISPLAY_VIEWS.includes(viewName)) {
    currentDisplayView = viewName;
    renderDisplayView();
    updateNavButtons();
    
    // Reset rotation countdown if auto-rotate is enabled
    if (autoRotateEnabled) {
      rotationCountdown = VIEW_ROTATION_TIME / 1000;
    }
  }
}

// Update navigation button states
function updateNavButtons() {
  // Remove active class from all nav buttons
  document.querySelectorAll('.display-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to current view button
  const activeBtn = document.getElementById(`nav-${currentDisplayView}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

// Start auto-rotation with countdown
function startAutoRotation() {
  if (rotationInterval) clearInterval(rotationInterval);
  if (countdownInterval) clearInterval(countdownInterval);
  
  rotationCountdown = VIEW_ROTATION_TIME / 1000; // Convert to seconds
  
  // Update countdown display every second
  countdownInterval = setInterval(() => {
    rotationCountdown--;
    updateCountdownDisplay();
    
    if (rotationCountdown <= 0) {
      rotationCountdown = VIEW_ROTATION_TIME / 1000;
    }
  }, COUNTDOWN_UPDATE_TIME);
  
  // Rotate views
  rotationInterval = setInterval(() => {
    const currentIndex = DISPLAY_VIEWS.indexOf(currentDisplayView);
    const nextIndex = (currentIndex + 1) % DISPLAY_VIEWS.length;
    currentDisplayView = DISPLAY_VIEWS[nextIndex];
    renderDisplayView();
    updateNavButtons();
    rotationCountdown = VIEW_ROTATION_TIME / 1000; // Reset countdown
  }, VIEW_ROTATION_TIME);
}

// Stop auto-rotation
function stopAutoRotation() {
  if (rotationInterval) {
    clearInterval(rotationInterval);
    rotationInterval = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  updateCountdownDisplay(); // Clear countdown
}

// Update countdown display
function updateCountdownDisplay() {
  const toggleBtn = document.getElementById('display-toggle-btn');
  if (!toggleBtn) return;
  
  if (autoRotateEnabled && rotationCountdown > 0) {
    const nextView = DISPLAY_VIEWS[(DISPLAY_VIEWS.indexOf(currentDisplayView) + 1) % DISPLAY_VIEWS.length];
    const viewNames = {
      'kanban': 'Board',
      'statistics': 'Stats'
    };
    toggleBtn.textContent = `Next: ${viewNames[nextView]} in ${rotationCountdown}s`;
  } else if (autoRotateEnabled) {
    toggleBtn.textContent = 'Auto-Rotate: ON';
  } else {
    toggleBtn.textContent = 'Auto-Rotate: OFF';
  }
}

// Reload data from localStorage and check for updates
function reloadEventData() {
  try {
    // Reload data from localStorage using the new multi-event structure
    const savedAppData = localStorage.getItem('raceTrackerAppData');
    if (savedAppData) {
      const newAppData = JSON.parse(savedAppData);
      
      // Get current event from the multi-event structure
      if (newAppData.currentEventId && newAppData.events[newAppData.currentEventId]) {
        const newEventData = newAppData.events[newAppData.currentEventId];
        
        // Create a simple hash to detect data changes
        const newDataHash = JSON.stringify({
          activities: newEventData.activityLog?.length || 0,
          assignments: JSON.stringify(newEventData.stationAssignments || {}),
          participants: newEventData.participants?.length || 0
        });
        
        // Check if data has changed
        if (newDataHash !== lastDataHash) {
          console.log('Display mode: New data detected, updating...');
          
          // Check for new activities
          const newActivityCount = newEventData.activityLog?.length || 0;
          const hasNewActivity = newActivityCount > lastActivityCount;
          
          // Update global eventData and window references
          window.eventData = newEventData;
          if (window.appData) {
            window.appData = newAppData;
          }
          
          // Show live update alert if there are new activities
          if (hasNewActivity && lastActivityCount > 0) {
            showLiveUpdateAlert(newActivityCount - lastActivityCount);
            // Restart ticker immediately to show new updates
            updateActivityTicker();
          }
          
          lastActivityCount = newActivityCount;
          lastDataHash = newDataHash;
          
          return true; // Data was updated
        }
      } else {
        console.log('Display mode: No current event found in appData');
      }
    }
    
    // Fallback: try the old single event structure
    console.log('Display mode: Trying fallback to old eventData structure...');
    const savedEventData = localStorage.getItem('raceTrackerData');
    if (savedEventData) {
      const newEventData = JSON.parse(savedEventData);
      
      // Create a simple hash to detect data changes
      const newDataHash = JSON.stringify({
        activities: newEventData.activityLog?.length || 0,
        assignments: JSON.stringify(newEventData.stationAssignments || {}),
        participants: newEventData.participants?.length || 0
      });
      
      // Check if data has changed
      if (newDataHash !== lastDataHash) {
        console.log('Display mode: New data detected (fallback), updating...');
        
        // Check for new activities
        const newActivityCount = newEventData.activityLog?.length || 0;
        const hasNewActivity = newActivityCount > lastActivityCount;
        
        // Update global eventData
        window.eventData = newEventData;
        
        // Show live update alert if there are new activities
        if (hasNewActivity && lastActivityCount > 0) {
          showLiveUpdateAlert(newActivityCount - lastActivityCount);
          // Restart ticker immediately to show new updates
          updateActivityTicker();
        }
        
        lastActivityCount = newActivityCount;
        lastDataHash = newDataHash;
        
        return true; // Data was updated
      }
    }
  } catch (error) {
    console.error('Error reloading event data:', error);
  }
  
  return false; // No data changes
}

// Show live update alert
function showLiveUpdateAlert(newUpdates) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'live-update-alert';
  alertDiv.innerHTML = `
    <div class="alert-content">
      <span class="alert-icon">🔴</span>
      <span class="alert-text">LIVE UPDATE: ${newUpdates} new ${newUpdates === 1 ? 'activity' : 'activities'}</span>
    </div>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Remove alert after 3 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
}

// Refresh display data
function refreshDisplay() {
  const dataChanged = reloadEventData();
  
  if (!window.eventData) return;
  
  updateDisplayStats();
  
  // Only update ticker if data changed or it's been a while
  if (dataChanged || Math.random() < 0.1) { // 10% chance to update even if no changes
    updateActivityTicker();
  }
  
  renderDisplayView();
}

// Force refresh (for manual refresh button)
function forceRefresh() {
  console.log('Force refresh triggered');
  
  // Always try to reload data
  const dataUpdated = reloadEventData();
  
  // If still no data, try to get it from global scope
  if (!window.eventData && typeof eventData !== 'undefined' && eventData) {
    console.log('Force refresh: Using global eventData');
    window.eventData = eventData;
  }
  
  // If we have data now, proceed with refresh
  if (window.eventData) {
    updateDisplayStats();
    updateActivityTicker();
    renderDisplayView();
    console.log('Force refresh: Display updated successfully');
  } else {
    console.error('Force refresh: No event data available');
    // Show an error message in the display
    const viewContainer = document.getElementById('display-view');
    if (viewContainer) {
      viewContainer.innerHTML = `
        <div class="empty-state">
          <h3>No Event Data</h3>
          <p>Please ensure you have configured an event in the Race Tracker.</p>
          <button class="btn btn-primary" onclick="showPage('race-tracker')">Go to Race Tracker</button>
        </div>
      `;
    }
  }
}

// Start display mode (called when page is shown)
function startDisplayMode() {
  if (displayModeActive) return;
  
  displayModeActive = true;
  
  // Initialize eventData if not already set
  if (!window.eventData && window.eventData !== null) {
    // Try to use the global eventData first
    if (typeof eventData !== 'undefined' && eventData) {
      window.eventData = eventData;
    } else {
      // Force reload from localStorage
      reloadEventData();
    }
  }
  
  // Initialize data tracking
  if (window.eventData?.activityLog) {
    lastActivityCount = window.eventData.activityLog.length;
    lastDataHash = JSON.stringify({
      activities: window.eventData.activityLog.length,
      assignments: JSON.stringify(window.eventData.stationAssignments || {}),
      participants: window.eventData.participants?.length || 0
    });
  } else {
    // Force a data reload if we still don't have data
    console.log('Display mode: No eventData found, forcing reload...');
    reloadEventData();
    
    // Try again after reload
    if (window.eventData?.activityLog) {
      lastActivityCount = window.eventData.activityLog.length;
      lastDataHash = JSON.stringify({
        activities: window.eventData.activityLog.length,
        assignments: JSON.stringify(window.eventData.stationAssignments || {}),
        participants: window.eventData.participants?.length || 0
      });
    }
  }
  
  refreshDisplay();
  updateNavButtons();
  
  // Start ticker updates
  if (tickerInterval) clearInterval(tickerInterval);
  tickerInterval = setInterval(updateActivityTicker, TICKER_UPDATE_TIME);
  
  // Start periodic refresh with data polling
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(refreshDisplay, REFRESH_TIME);
  
  console.log('Display mode started with live data polling');
}

// Stop display mode (called when leaving page)
function stopDisplayMode() {
  displayModeActive = false;
  stopAutoRotation();
  
  if (tickerInterval) {
    clearInterval(tickerInterval);
    tickerInterval = null;
  }
  
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  
  console.log('Display mode stopped');
}

// Update display statistics
function updateDisplayStats() {
  if (!window.eventData) return;
  
  const eventNameEl = document.getElementById('display-event-name');
  const timeEl = document.getElementById('display-time');
  const participantCountEl = document.getElementById('display-participant-count');
  const lastUpdateEl = document.getElementById('display-last-update');
  
  if (eventNameEl) {
    eventNameEl.textContent = window.eventData.event?.name || 'Race Display';
  }
  
  if (timeEl) {
    timeEl.textContent = new Date().toLocaleTimeString();
  }
  
  if (participantCountEl) {
    const activeParticipants = window.eventData.participants?.filter(p => p.active).length || 0;
    participantCountEl.textContent = `${activeParticipants} Participants`;
  }
  
  if (lastUpdateEl) {
    const lastActivity = getLastActivityTime();
    lastUpdateEl.textContent = `Last update: ${lastActivity}`;
  }
}

// Get last activity time
function getLastActivityTime() {
  if (!window.eventData?.activityLog || window.eventData.activityLog.length === 0) {
    return 'None';
  }
  
  const sortedLog = [...window.eventData.activityLog].sort((a, b) => 
    new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp)
  );
  
  const lastEntry = sortedLog[0];
  const lastTime = new Date(lastEntry.userTime || lastEntry.timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now - lastTime) / 60000);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ${diffMinutes % 60}m ago`;
}

// Update activity ticker with recent changes
function updateActivityTicker() {
  if (!window.eventData?.activityLog) return;
  
  const tickerContent = document.getElementById('ticker-content');
  if (!tickerContent) return;
  
  // Get recent activities (last 15, within last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentActivities = [...window.eventData.activityLog]
    .filter(entry => new Date(entry.userTime || entry.timestamp) > twoHoursAgo)
    .sort((a, b) => new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp))
    .slice(0, 15);
  
  if (recentActivities.length === 0) {
    tickerContent.innerHTML = '<span class="ticker-item">No recent activity in last 2 hours</span>';
    return;
  }
  
  const tickerItems = recentActivities.map(entry => {
    const participant = entry.participantId ? 
      window.eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = window.eventData.aidStations.find(s => s.id === entry.stationId);
    const time = new Date(entry.userTime || entry.timestamp);
    
    const participantText = participant ? `${participant.name} (${participant.id})` : 'System';
    const stationText = station ? station.name : 'Unknown Station';
    const activityText = formatActivityTypeShort(entry.activityType);
    
    let updateText = '';
    if (entry.activityType === 'other' && entry.notes) {
      updateText = `${entry.notes} at ${stationText}`;
    } else if (participant) {
      updateText = `${participantText} ${activityText} ${stationText}`;
    } else {
      updateText = `${activityText} at ${stationText}`;
    }
    
    return `
      <span class="ticker-item">
        <span class="ticker-time">${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        <span class="ticker-update">${updateText}</span>
      </span>
    `;
  }).join('');
  
  tickerContent.innerHTML = tickerItems;
}

// Render current display view
function renderDisplayView() {
  const viewContainer = document.getElementById('display-view');
  if (!viewContainer || !window.eventData) return;
  
  switch (currentDisplayView) {
    case 'kanban':
      renderCompactKanban(viewContainer);
      break;
    case 'statistics':
      renderDisplayStatistics(viewContainer);
      break;
    default:
      renderCompactKanban(viewContainer);
  }
}

// Render Compact Kanban view - fits everything on screen
function renderCompactKanban(container) {
  if (!window.eventData.courses || window.eventData.courses.length === 0) {
    container.innerHTML = '<div class="empty-state">No courses configured</div>';
    return;
  }
  
  // Get all stations across all courses, in logical order
  const stationOrder = ['start', 'lost-children', 'hairpin', 'burnt-house', 'windber', 'finish'];
  const allStations = new Set();
  
  // Add stations from courses first
  window.eventData.courses.forEach(course => {
    course.stations.forEach(station => {
      allStations.add(station.stationId);
    });
  });
  
  // Add default stations (excluding DNS/DNF/Suspect Data)
  stationOrder.forEach(id => allStations.add(id));
  
  // Sort stations by the defined order
  const sortedStations = Array.from(allStations).sort((a, b) => {
    const aIndex = stationOrder.indexOf(a);
    const bIndex = stationOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  const stationsHTML = sortedStations.map(stationId => {
    const station = window.eventData.aidStations.find(s => s.id === stationId);
    if (!station) return '';
    
    const participants = window.eventData.stationAssignments[stationId] || [];
    
    // Skip stations with no participants (empty stations)
    if (participants.length === 0) return '';
    
    // Skip DNS/DNF/Suspect Data stations
    if (['dns', 'dnf', 'suspect-data'].includes(stationId)) return '';
    
    const recentUpdates = getRecentParticipantUpdates(participants);
    
    // Group participants for compact display
    const participantsHTML = participants.map(participantId => {
      const participant = window.eventData.participants.find(p => p.id === participantId);
      const displayName = participant ? (participant.name || participant.id) : participantId;
      const isRecent = recentUpdates.includes(participantId);
      
      return `<span class="compact-participant${isRecent ? ' recent-update' : ''}" title="${displayName}">${displayName}</span>`;
    }).join('');
    
    return `
      <div class="compact-station">
        <div class="compact-station-header">
          <span class="compact-station-name">${station.name}</span>
          <span class="compact-station-count">${participants.length}</span>
        </div>
        <div class="compact-participants">
          ${participantsHTML}
        </div>
      </div>
    `;
  }).filter(html => html !== '').join(''); // Remove empty strings
  
  container.innerHTML = `<div class="compact-kanban">${stationsHTML}</div>`;
}

// Render Recent Activity view (unchanged but more compact)
function renderDisplayRecentActivity(container) {
  if (!window.eventData.activityLog || window.eventData.activityLog.length === 0) {
    container.innerHTML = '<div class="empty-state">No recent activity</div>';
    return;
  }
  
  const recentActivities = [...window.eventData.activityLog]
    .sort((a, b) => new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp))
    .slice(0, 15); // Show more activities
  
  const activitiesHTML = recentActivities.map(entry => {
    const participant = entry.participantId ? 
      window.eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = window.eventData.aidStations.find(s => s.id === entry.stationId);
    const time = new Date(entry.userTime || entry.timestamp);
    
    const participantText = participant ? `${participant.name} (${participant.id})` : 'System';
    const stationText = station ? station.name : 'Unknown Station';
    const activityText = formatActivityType(entry.activityType);
    
    let mainText = '';
    let detailsText = '';
    
    if (entry.activityType === 'other') {
      mainText = entry.notes || 'Race update';
      detailsText = `at ${stationText}`;
    } else if (participant) {
      mainText = `${participantText} ${activityText}`;
      detailsText = `at ${stationText}`;
    } else {
      mainText = `${activityText} at ${stationText}`;
      detailsText = entry.notes || '';
    }
    
    return `
      <div class="display-activity-item ${entry.activityType}">
        <div class="display-activity-info">
          <div class="display-activity-main">${mainText}</div>
          <div class="display-activity-details">${detailsText}</div>
        </div>
        <div class="display-activity-time">
          ${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `<div class="display-recent-activity">${activitiesHTML}</div>`;
}

// Render Statistics view (unchanged)
function renderDisplayStatistics(container) {
  if (!window.eventData) {
    container.innerHTML = '<div class="empty-state">No data available</div>';
    return;
  }
  
  // Calculate statistics
  const totalParticipants = window.eventData.participants?.filter(p => p.active).length || 0;
  const totalActivities = window.eventData.activityLog?.length || 0;
  
  // Calculate finishers
  const finishers = window.eventData.stationAssignments?.finish?.length || 0;
  
  // Calculate DNFs
  const dnfs = window.eventData.stationAssignments?.dnf?.length || 0;
  
  // Calculate still racing
  const stillRacing = totalParticipants - finishers - dnfs;
  
  // Recent activity rate (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentActivity = window.eventData.activityLog?.filter(entry => 
    new Date(entry.userTime || entry.timestamp) > oneHourAgo
  ).length || 0;
  
  // Calculate progress percentage
  const progressPercentage = totalParticipants > 0 ? Math.round((finishers / totalParticipants) * 100) : 0;
  
  const statsHTML = `
    <div class="display-stat-card">
      <div class="display-stat-number">${totalParticipants}</div>
      <div class="display-stat-label">Total Participants</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${finishers}</div>
      <div class="display-stat-label">Finishers</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${stillRacing}</div>
      <div class="display-stat-label">Still Racing</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${progressPercentage}%</div>
      <div class="display-stat-label">Race Complete</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${recentActivity}</div>
      <div class="display-stat-label">Updates (Last Hour)</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${dnfs}</div>
      <div class="display-stat-label">DNFs</div>
    </div>
  `;
  
  container.innerHTML = `<div class="display-stats-grid">${statsHTML}</div>`;
}

// Get participants with recent updates (last 5 minutes for more responsive highlighting)
function getRecentParticipantUpdates(participantIds) {
  if (!window.eventData.activityLog) return [];
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  return participantIds.filter(participantId => {
    const recentActivities = window.eventData.activityLog.filter(entry => 
      entry.participantId === participantId && 
      new Date(entry.userTime || entry.timestamp) > fiveMinutesAgo
    );
    return recentActivities.length > 0;
  });
}

// Format activity type for display
function formatActivityType(activityType) {
  const types = {
    'arrival': 'arrived at',
    'departed': 'departed from',
    'other': 'update at',
    'dnf': 'DNF at',
    'dns': 'DNS at'
  };
  return types[activityType] || activityType;
}

// Format activity type for ticker (shorter)
function formatActivityTypeShort(activityType) {
  const types = {
    'arrival': '→',
    'departed': '←',
    'other': '•',
    'dnf': 'DNF',
    'dns': 'DNS'
  };
  return types[activityType] || activityType;
}

// Export functions for global access
window.toggleDisplayMode = toggleDisplayMode;
window.refreshDisplay = forceRefresh;
window.startDisplayMode = startDisplayMode;
window.stopDisplayMode = stopDisplayMode;
window.toggleFullscreen = toggleFullscreen; 