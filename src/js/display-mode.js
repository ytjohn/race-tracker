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
let displayEventId = null; // Track which event ID this display should show

// View types and rotation sequence (removed recent-activity)
const DISPLAY_VIEWS = ['kanban', 'courses', 'statistics'];
const VIEW_ROTATION_TIME = 30000; // 30 seconds per view
const TICKER_UPDATE_TIME = 3000; // Update ticker every 3 seconds
const REFRESH_TIME = 2000; // Refresh data every 2 seconds
const COUNTDOWN_UPDATE_TIME = 1000; // Update countdown every second

// Initialize display mode module
function initializeDisplayMode() {
  console.log('Display mode module initialized');
  
  // Set up fullscreen change listener
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
  document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox
  document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE/Edge
  
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
    toggleBtn.textContent = '⏸️';
    toggleBtn.title = 'Auto-Rotate: ON (Click to pause)';
    toggleBtn.style.background = 'rgba(76, 175, 80, 0.3)';
  } else {
    stopAutoRotation();
    toggleBtn.textContent = '⏯️';
    toggleBtn.title = 'Auto-Rotate: OFF (Click to start)';
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

// Handle fullscreen changes (including ESC key exits)
function handleFullscreenChange() {
  const navBar = document.querySelector('.main-nav');
  if (!navBar) return;
  
  // Check for fullscreen element across different browsers
  const isFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
  
  if (isFullscreen) {
    // Entering fullscreen - hide nav bar
    navBar.style.display = 'none';
    console.log('Fullscreen entered: Nav bar hidden');
  } else {
    // Exiting fullscreen - show nav bar
    navBar.style.display = '';
    console.log('Fullscreen exited: Nav bar restored');
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
      'courses': 'Courses',
      'statistics': 'Stats'
    };
    toggleBtn.title = `Auto-Rotate: Next ${viewNames[nextView]} in ${rotationCountdown}s`;
  } else if (autoRotateEnabled) {
    toggleBtn.title = 'Auto-Rotate: ON (Click to pause)';
  } else {
    toggleBtn.title = 'Auto-Rotate: OFF (Click to start)';
  }
}

// Reload data from localStorage and check for updates
function reloadEventData() {
  try {
    // Reload data from localStorage using the new multi-event structure
    const savedAppData = localStorage.getItem('raceTrackerAppData');
    if (savedAppData) {
      const newAppData = JSON.parse(savedAppData);
      
      // Use the display event ID if set, otherwise use current event ID
      const targetEventId = displayEventId || newAppData.currentEventId;
      
      // Get target event from the multi-event structure
      if (targetEventId && newAppData.events[targetEventId]) {
        const newEventData = newAppData.events[targetEventId];
        
        // Create a simple hash to detect data changes
        const newDataHash = JSON.stringify({
          activities: newEventData.activityLog?.length || 0,
          assignments: JSON.stringify(newEventData.stationAssignments || {}),
          participants: newEventData.participants?.length || 0
        });
        
        // Check if data has changed
        if (newDataHash !== lastDataHash) {
          console.log(`Display mode: New data detected for event ${targetEventId}, updating...`);
          
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
        console.log(`Display mode: Event ${targetEventId} not found in appData`);
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
  if (!window.eventData?.activityLog) return;
  
  // Get the most recent activities
  const recentActivities = [...window.eventData.activityLog]
    .sort((a, b) => new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp))
    .slice(0, Math.min(newUpdates, 3)); // Show up to 3 activities
  
  const activityTexts = recentActivities.map(entry => {
    const participant = entry.participantId ? 
      window.eventData.participants.find(p => p.id === entry.participantId) : null;
    const station = window.eventData.aidStations.find(s => s.id === entry.stationId);
    
    if (entry.activityType === 'other' && entry.notes) {
      return entry.notes;
    } else if (participant && station) {
      const participantName = participant.name || participant.id;
      return `${participantName} → ${station.name}`;
    } else if (station) {
      return `Update at ${station.name}`;
    }
    return 'Race update';
  });
  
  const alertDiv = document.createElement('div');
  alertDiv.className = 'live-update-alert';
  
  // For multiple activities, display vertically
  if (activityTexts.length > 1) {
    alertDiv.innerHTML = `
      <div class="alert-content vertical">
        <div class="alert-header">
          <span class="alert-icon">🔴</span>
          <span class="alert-title">LIVE UPDATE: ${activityTexts.length} activities</span>
        </div>
        <div class="alert-activities">
          ${activityTexts.map(text => `<div class="alert-activity">• ${text}</div>`).join('')}
        </div>
      </div>
    `;
  } else {
    alertDiv.innerHTML = `
      <div class="alert-content">
        <span class="alert-icon">🔴</span>
        <span class="alert-text">LIVE UPDATE: ${activityTexts[0]}</span>
      </div>
    `;
  }
  
  document.body.appendChild(alertDiv);
  
  // Remove alert after 4 seconds (longer since there's more text)
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 4000);
}

// Refresh display data
function refreshDisplay() {
  const dataChanged = reloadEventData();
  
  if (!window.eventData) return;
  
  updateDisplayStats();
  
  // Update pace data if pace tracker is available and data changed
  if (dataChanged && window.paceTracker) {
    window.paceTracker.calculateAllPaces();
    window.paceTracker.calculateAllETAs();
  }
  
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
  
  // Capture the current event ID to stick to it for this display session
  if (typeof eventData !== 'undefined' && eventData && eventData.id) {
    displayEventId = eventData.id;
    console.log(`Display mode: Locking to event ${displayEventId}`);
  } else if (window.appData && window.appData.currentEventId) {
    displayEventId = window.appData.currentEventId;
    console.log(`Display mode: Locking to current event ${displayEventId}`);
  }
  
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
  
  // Initialize pace tracker if available
  if (window.paceTracker && !window.paceTracker.initialized) {
    console.log('Display mode: Initializing pace tracker...');
    window.paceTracker.initialize();
  }
  
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
  
  // Clear the locked event ID
  displayEventId = null;
  
  console.log('Display mode stopped');
}

// Update display statistics
function updateDisplayStats() {
  if (!window.eventData) return;
  
  const eventNameEl = document.getElementById('display-event-name');
  const timeEl = document.getElementById('display-time');
  const participantCountEl = document.getElementById('display-participant-count');
  
  if (eventNameEl) {
    const eventName = window.eventData.event?.name || 'Race Display';
    eventNameEl.textContent = eventName;
  }
  
  if (timeEl) {
    timeEl.textContent = new Date().toLocaleTimeString();
  }
  
  if (participantCountEl) {
    const activeParticipants = window.eventData.participants?.filter(p => p.active).length || 0;
    participantCountEl.textContent = `${activeParticipants} Participants`;
  }
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
    
    const participantText = participant ? 
      (participant.name !== participant.id ? `${participant.name} (${participant.id})` : participant.name) : 'System';
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
    case 'courses':
      renderDisplayCourses(viewContainer);
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
  const stationOrder = ['start', 'lost-children', 'hairpin', 'burnt-house', 'windber'];
  const allStations = new Set();
  
  // Add stations from courses first
  window.eventData.courses.forEach(course => {
    course.stations.forEach(station => {
      allStations.add(station.stationId);
    });
  });
  
  // Add default stations (excluding DNS/DNF/Suspect Data)
  stationOrder.forEach(id => allStations.add(id));
  
  // Get last activity time for each station for sorting
function getStationLastActivity(stationId) {
  if (!window.eventData.activityLog) return 0;
  
  const stationActivities = window.eventData.activityLog.filter(entry => 
    entry.stationId === stationId
  );
  
  if (stationActivities.length === 0) return 0;
  
  const lastActivity = stationActivities.sort((a, b) => 
    new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp)
  )[0];
  
  return new Date(lastActivity.userTime || lastActivity.timestamp).getTime();
}

// Get last activity time for a specific participant for sorting
function getParticipantLastActivityTime(participantId) {
  if (!window.eventData.activityLog) return 0;
  
  const participantActivities = window.eventData.activityLog.filter(entry => 
    entry.participantId === participantId
  );
  
  if (participantActivities.length === 0) return 0;
  
  const lastActivity = participantActivities.sort((a, b) => 
    new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp)
  )[0];
  
  return new Date(lastActivity.userTime || lastActivity.timestamp).getTime();
}

  // Sort stations by recent activity (most recent first), then by defined order
  const sortedStations = Array.from(allStations).sort((a, b) => {
    const aLastActivity = getStationLastActivity(a);
    const bLastActivity = getStationLastActivity(b);
    
    // If both have recent activity, sort by most recent first
    if (aLastActivity > 0 && bLastActivity > 0) {
      return bLastActivity - aLastActivity;
    }
    
    // If only one has activity, it comes first
    if (aLastActivity > 0) return -1;
    if (bLastActivity > 0) return 1;
    
    // If neither has activity, sort by defined order
    const aIndex = stationOrder.indexOf(a);
    const bIndex = stationOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  // Identify final aid stations for each course
  const finalStations = new Map(); // stationId -> array of course names
  window.eventData.courses.forEach(course => {
    if (course.stations.length > 0) {
      const finalStationId = course.stations[course.stations.length - 1].stationId;
      if (!['dnf', 'dns', 'suspect'].includes(finalStationId)) {
        if (!finalStations.has(finalStationId)) {
          finalStations.set(finalStationId, []);
        }
        finalStations.get(finalStationId).push(course.name);
      }
    }
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
    const isFinalStation = finalStations.has(stationId);
    const finalForCourses = finalStations.get(stationId) || [];
    
    // Check if station has recent activity (last 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const hasRecentActivity = getStationLastActivity(stationId) > thirtyMinutesAgo;
    
    // Sort participants by most recent activity (newest first) for display mode
    const sortedParticipants = [...participants].sort((a, b) => {
      const aLastActivity = getParticipantLastActivityTime(a);
      const bLastActivity = getParticipantLastActivityTime(b);
      
      // Most recent activity first, then by participant ID as tiebreaker
      if (aLastActivity !== bLastActivity) {
        return bLastActivity - aLastActivity;
      }
      return a.localeCompare(b);
    });
    
    // Group participants for compact display with pace-based styling
    const participantsHTML = sortedParticipants.map(participantId => {
      const participant = window.eventData.participants.find(p => p.id === participantId);
      const displayName = participant ? (participant.name || participant.id) : participantId;
      const isRecent = recentUpdates.includes(participantId);
      
      // Check if this participant is "finishing" (at their course's final station)
      const isFinishing = isFinalStation && participant && 
        window.eventData.courses.some(course => 
          course.id === participant.courseId && 
          course.stations.length > 0 && 
          course.stations[course.stations.length - 1].stationId === stationId
        );
      
      // Get pace-based styling if pace tracker is available
      let paceColorClass = '';
      let paceIcon = '';
      if (window.paceTracker && window.paceTracker.getPaceColorClass) {
        paceColorClass = window.paceTracker.getPaceColorClass(participantId);
        if (window.paceTracker.getPacePerformanceIconText) {
          paceIcon = window.paceTracker.getPacePerformanceIconText(participantId);
        }
      }
      
      let participantClass = 'compact-participant';
      if (paceColorClass) participantClass += ` ${paceColorClass}`;
      if (isRecent) participantClass += ' recent-update';
      if (isFinishing) participantClass += ' finishing';
      
      const iconText = paceIcon ? ` ${paceIcon}` : '';
      
      return `<span class="${participantClass}" title="${displayName}${isFinishing ? ' - Finishing!' : ''}">${displayName}${iconText}</span>`;
    }).join('');
    
    let stationClasses = 'compact-station';
    if (isFinalStation) stationClasses += ' final-station';
    if (hasRecentActivity) stationClasses += ' recent-activity';

    return `
      <div class="${stationClasses}">
        <div class="compact-station-header">
          <span class="compact-station-name">
            ${hasRecentActivity ? '🔥 ' : ''}${isFinalStation ? '🏁 ' : ''}${station.name}${isFinalStation ? ` (${finalForCourses.join(', ')} Final)` : ''}
          </span>
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

// Render Courses view - shows progression by course with detailed station stats
function renderDisplayCourses(container) {
  if (!window.eventData.courses || window.eventData.courses.length === 0) {
    container.innerHTML = '<div class="empty-state">No courses configured</div>';
    return;
  }

  // Helper function to get last activity time for a station
  function getStationLastActivityTime(stationId) {
    if (!window.eventData.activityLog) return null;
    
    const stationActivities = window.eventData.activityLog.filter(entry => 
      entry.stationId === stationId
    );
    
    if (stationActivities.length === 0) return null;
    
    const lastActivity = stationActivities.sort((a, b) => 
      new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp)
    )[0];
    
    return new Date(lastActivity.userTime || lastActivity.timestamp);
  }

  // Helper function to get first arrival time for a station
  function getStationFirstArrivalTime(stationId) {
    if (!window.eventData.activityLog) return null;
    
    const arrivalActivities = window.eventData.activityLog.filter(entry => 
      entry.stationId === stationId && entry.activityType === 'arrival'
    );
    
    if (arrivalActivities.length === 0) return null;
    
    const firstArrival = arrivalActivities.sort((a, b) => 
      new Date(a.userTime || a.timestamp) - new Date(b.userTime || b.timestamp)
    )[0];
    
    return new Date(firstArrival.userTime || firstArrival.timestamp);
  }

  // Helper function to format time ago
  function formatTimeAgo(date) {
    if (!date) return 'No activity';
    
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMinutes % 60}m ago`;
    
    return date.toLocaleDateString();
  }

  // Helper function to format first arrival time
  function formatFirstArrivalTime(date) {
    if (!date) return 'No arrivals';
    
    // Format as HH:MM AM/PM
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  const coursesHTML = window.eventData.courses.map(course => {
    // Get total participants for this course
    const courseParticipants = window.eventData.participants.filter(p => p.courseId === course.id && p.active);
    const totalCourseParticipants = courseParticipants.length;

    if (totalCourseParticipants === 0) {
      return `
        <div class="course-display">
          <div class="course-display-header">
            <h3>${course.name}</h3>
            <div class="course-display-stats">No participants assigned</div>
          </div>
        </div>
      `;
    }

    // Get station stats for this course
    const stationStatsHTML = course.stations.map(courseStation => {
      const station = window.eventData.aidStations.find(s => s.id === courseStation.stationId);
      if (!station) return '';

      // Get participants at this station for this course
      const stationParticipants = (window.eventData.stationAssignments[courseStation.stationId] || [])
        .filter(participantId => {
          const participant = window.eventData.participants.find(p => p.id === participantId);
          return participant && participant.courseId === course.id;
        });

      const count = stationParticipants.length;

      // Skip stations with no participants
      if (count === 0) return '';

      const percentage = totalCourseParticipants > 0 ? Math.round((count / totalCourseParticipants) * 100) : 0;
      const lastActivity = getStationLastActivityTime(courseStation.stationId);
      const timeAgo = formatTimeAgo(lastActivity);
      const firstArrival = getStationFirstArrivalTime(courseStation.stationId);
      const firstArrivalTime = formatFirstArrivalTime(firstArrival);

      // Check if this is the final station for this course
      const isFinalStation = course.stations[course.stations.length - 1].stationId === courseStation.stationId;

      return `
        <div class="station-display-row${isFinalStation ? ' final-station-row' : ''}">
          <div class="station-display-name">
            ${isFinalStation ? '🏁 ' : ''}${station.name}${isFinalStation ? ' (Final)' : ''}
          </div>
          <div class="station-display-stats">
            <div class="station-stat">
              <div class="stat-number">${count}</div>
              <div class="stat-label">Count</div>
            </div>
            <div class="station-stat">
              <div class="stat-number">${percentage}%</div>
              <div class="stat-label">Percentage</div>
            </div>
            <div class="station-stat">
              <div class="stat-number">${firstArrivalTime}</div>
              <div class="stat-label">First Arrival</div>
            </div>
            <div class="station-stat">
              <div class="stat-number">${timeAgo}</div>
              <div class="stat-label">Last Update</div>
            </div>
          </div>
        </div>
      `;
    }).filter(html => html !== '').join('');

    return `
      <div class="course-display">
        <div class="course-display-header">
          <h3>${course.name}</h3>
          <div class="course-display-stats">${totalCourseParticipants} participants</div>
        </div>
        <div class="stations-display">
          ${stationStatsHTML || '<div class="no-active-stations">No active stations</div>'}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="courses-display-container">${coursesHTML}</div>`;
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
    
    const participantText = participant ? 
      (participant.name !== participant.id ? `${participant.name} (${participant.id})` : participant.name) : 'System';
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

// Get participants who are "finishing" (at their course's final aid station)
function getFinishingParticipants() {
  if (!window.eventData.courses || !window.eventData.stationAssignments || !window.eventData.participants) {
    return [];
  }
  
  const finishingParticipants = [];
  
  // For each course, find participants at the final aid station
  window.eventData.courses.forEach(course => {
    if (course.stations.length === 0) return;
    
    // Get the last station in the course (final aid station before finish line)
    const finalStationId = course.stations[course.stations.length - 1].stationId;
    
    // Skip if final station is a status station (DNF/DNS)
    if (['dnf', 'dns', 'suspect'].includes(finalStationId)) return;
    
    // Get participants at this final station
    const participantsAtFinalStation = window.eventData.stationAssignments[finalStationId] || [];
    
    // Add course participants who are at the final station
    participantsAtFinalStation.forEach(participantId => {
      const participant = window.eventData.participants.find(p => p.id === participantId);
      if (participant && participant.courseId === course.id) {
        finishingParticipants.push({
          participantId,
          course: course.name,
          finalStation: window.eventData.aidStations.find(s => s.id === finalStationId)?.name || 'Unknown'
        });
      }
    });
  });
  
  return finishingParticipants;
}

// Render Statistics view with "Finishing" logic
function renderDisplayStatistics(container) {
  if (!window.eventData) {
    container.innerHTML = '<div class="empty-state">No data available</div>';
    return;
  }
  
  // Calculate statistics
  const totalParticipants = window.eventData.participants?.filter(p => p.active).length || 0;
  const totalActivities = window.eventData.activityLog?.length || 0;
  
  // Calculate finishing participants (at final aid station)
  const finishingParticipants = getFinishingParticipants();
  const finishing = finishingParticipants.length;
  
  // Calculate DNFs
  const dnfs = window.eventData.stationAssignments?.dnf?.length || 0;
  
  // Calculate still racing
  const stillRacing = totalParticipants - finishing - dnfs;
  
  // Recent activity rate (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentActivity = window.eventData.activityLog?.filter(entry => 
    new Date(entry.userTime || entry.timestamp) > oneHourAgo
  ).length || 0;
  
  // Calculate progress percentage based on finishing participants
  const progressPercentage = totalParticipants > 0 ? Math.round((finishing / totalParticipants) * 100) : 0;
  
  const statsHTML = `
    <div class="display-stat-card">
      <div class="display-stat-number">${totalParticipants}</div>
      <div class="display-stat-label">Total Participants</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${finishing}</div>
      <div class="display-stat-label">Finishing</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${stillRacing}</div>
      <div class="display-stat-label">Still Racing</div>
    </div>
    <div class="display-stat-card">
      <div class="display-stat-number">${progressPercentage}%</div>
      <div class="display-stat-label">Approaching Finish</div>
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

// Switch display to a specific event
function switchDisplayToEvent(eventId) {
  if (!eventId) {
    console.error('Display mode: No event ID provided');
    return false;
  }
  
  // Check if event exists
  const savedAppData = localStorage.getItem('raceTrackerAppData');
  if (savedAppData) {
    const appData = JSON.parse(savedAppData);
    if (!appData.events || !appData.events[eventId]) {
      console.error(`Display mode: Event ${eventId} not found`);
      return false;
    }
  }
  
  displayEventId = eventId;
  console.log(`Display mode: Switched to event ${eventId}`);
  
  // Force reload of data
  reloadEventData();
  refreshDisplay();
  
  return true;
}

// Get currently displayed event ID
function getDisplayedEventId() {
  return displayEventId;
}

// Debug function to check display mode state
function debugDisplayMode() {
  console.log('=== Display Mode Debug Info ===');
  console.log('Display Mode Active:', displayModeActive);
  console.log('Display Event ID:', displayEventId);
  console.log('Window Event Data:', window.eventData ? window.eventData.id : 'null');
  console.log('Global Event Data:', typeof eventData !== 'undefined' ? eventData.id : 'undefined');
  
  // Check localStorage
  const savedAppData = localStorage.getItem('raceTrackerAppData');
  if (savedAppData) {
    const appData = JSON.parse(savedAppData);
    console.log('Current Event ID in localStorage:', appData.currentEventId);
    console.log('Available Events:', Object.keys(appData.events || {}));
  }
  
  console.log('Last Activity Count:', lastActivityCount);
  console.log('Last Data Hash:', lastDataHash);
  console.log('================================');
}

// Export functions for global access
window.toggleDisplayMode = toggleDisplayMode;
window.refreshDisplay = forceRefresh;
window.startDisplayMode = startDisplayMode;
window.stopDisplayMode = stopDisplayMode;
window.toggleFullscreen = toggleFullscreen;
window.switchDisplayToEvent = switchDisplayToEvent;
window.getDisplayedEventId = getDisplayedEventId;
window.debugDisplayMode = debugDisplayMode;

// Initialize the display mode module when this script loads
initializeDisplayMode(); 