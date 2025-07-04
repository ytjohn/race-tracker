// Pace Tracker Module
// Handles pace calculations, ETAs, and real-time updates

// Configuration
const PACE_CONFIG = {
  // Default average pace in mph for initial ETA calculations
  DEFAULT_PACE_MPH: 10.5,
  
  // Generosity factor for ETA calculations (multiply by this for more generous estimates)
  ETA_GENEROSITY_FACTOR: 1.15,
  
  // Slow down factor as race progresses (participants get slower)
  FATIGUE_FACTOR: 0.95, // 5% slower per segment
  
  // Background refresh interval in milliseconds
  REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Time window for "recent" activity (in minutes)
  RECENT_ACTIVITY_WINDOW: 5
};

// Global state
let paceTracker = {
  participantPaces: new Map(),
  participantETAs: new Map(),
  refreshInterval: null,
  lastRefresh: null,
  initialized: false
};

// Initialize pace tracker
function initializePaceTracker() {
  if (paceTracker.initialized) {
    console.log('Pace tracker already initialized');
    return;
  }
  
  console.log('Initializing pace tracker...');
  
  // Calculate initial paces and ETAs
  calculateAllPaces();
  calculateAllETAs();
  
  // Start background refresh
  startBackgroundRefresh();
  
  // Set up hover events for bib cards
  setupHoverEvents();
  
  paceTracker.initialized = true;
  console.log('Pace tracker initialized');
}

// Calculate pace for all participants
function calculateAllPaces() {
  if (!eventData || !eventData.participants) return;
  
  eventData.participants.forEach(participant => {
    const pace = calculateParticipantPace(participant.id);
    if (pace) {
      paceTracker.participantPaces.set(participant.id, pace);
    }
  });
}

// Calculate ETA for all participants
function calculateAllETAs() {
  if (!eventData || !eventData.participants) return;
  
  eventData.participants.forEach(participant => {
    const eta = calculateParticipantETA(participant.id);
    if (eta) {
      paceTracker.participantETAs.set(participant.id, eta);
    }
  });
  
  // Update bib card colors and icons after calculations
  setTimeout(() => {
    updateBibCardColors();
  }, 100);
}

// Calculate pace for a specific participant
function calculateParticipantPace(participantId) {
  if (!eventData || !eventData.activityLog) return null;
  
  const participant = eventData.participants.find(p => p.id === participantId);
  if (!participant || !participant.courseId) return null;
  
  const course = eventData.courses.find(c => c.id === participant.courseId);
  if (!course) return null;
  
  // Get participant's activity log entries (both departures and arrivals)
  const activities = eventData.activityLog
    .filter(entry => entry.participantId === participantId && 
            (entry.activityType === 'arrival' || entry.activityType === 'departed'))
    .sort((a, b) => new Date(a.userTime || a.timestamp) - new Date(b.userTime || b.timestamp));
  
  // Debug logging for specific participants
  if (participantId === '50K Sweep 1' || participantId === '500') {
    console.log(`Debug pace calculation for ${participantId}:`, {
      participantId,
      activitiesFound: activities.length,
      activities: activities.map(a => ({ stationId: a.stationId, time: a.userTime || a.timestamp })),
      courseStations: course.stations.map(s => ({ stationId: s.stationId, distance: s.cumulativeDistance || 'NOT SET' }))
    });
  }
  
  if (activities.length < 2) {
    // No pace data yet, use default
    return {
      averagePaceMPH: PACE_CONFIG.DEFAULT_PACE_MPH,
      recentPaceMPH: PACE_CONFIG.DEFAULT_PACE_MPH,
      isEstimated: true,
      dataPoints: 0
    };
  }
  
  // Check if course has distance configuration
  const hasDistanceConfig = course.stations.some(s => s.cumulativeDistance > 0);
  
  if (!hasDistanceConfig) {
    console.warn(`Course ${course.name} has no distance configuration. Pace calculation not possible.`);
    return {
      averagePaceMPH: PACE_CONFIG.DEFAULT_PACE_MPH,
      recentPaceMPH: PACE_CONFIG.DEFAULT_PACE_MPH,
      isEstimated: true,
      dataPoints: 0,
      reason: 'No distance configuration'
    };
  }
  
  // Calculate pace between consecutive stations
  const paceSegments = [];
  
  // Process activities to find consecutive segments
  for (let i = 0; i < activities.length - 1; i++) {
    const currentActivity = activities[i];
    const nextActivity = activities[i + 1];
    
    let fromStation, toStation, fromTime, toTime;
    
    // Handle departure → arrival
    if (currentActivity.activityType === 'departed' && nextActivity.activityType === 'arrival') {
      fromStation = currentActivity.stationId;
      toStation = nextActivity.stationId;
      fromTime = new Date(currentActivity.userTime || currentActivity.timestamp);
      toTime = new Date(nextActivity.userTime || nextActivity.timestamp);
    }
    // Handle arrival → arrival (consecutive station progress)
    else if (currentActivity.activityType === 'arrival' && nextActivity.activityType === 'arrival') {
      fromStation = currentActivity.stationId;
      toStation = nextActivity.stationId;
      fromTime = new Date(currentActivity.userTime || currentActivity.timestamp);
      toTime = new Date(nextActivity.userTime || nextActivity.timestamp);
    }
    
    // Calculate pace if we have a valid segment
    if (fromStation && toStation && fromStation !== toStation) {
      // Get station distances
      const fromStationIndex = course.stations.findIndex(s => s.stationId === fromStation);
      const toStationIndex = course.stations.findIndex(s => s.stationId === toStation);
      
      if (fromStationIndex !== -1 && toStationIndex !== -1 && toStationIndex > fromStationIndex) {
        // Calculate distance between stations
        const fromDistance = course.stations[fromStationIndex].cumulativeDistance || 0;
        const toDistance = course.stations[toStationIndex].cumulativeDistance || 0;
        const segmentDistance = toDistance - fromDistance;
        
        if (segmentDistance > 0) {
          // Calculate time between stations
          const segmentTimeHours = (toTime - fromTime) / (1000 * 60 * 60);
          
          if (segmentTimeHours > 0) {
            const segmentPace = segmentDistance / segmentTimeHours;
            paceSegments.push({
              distance: segmentDistance,
              timeHours: segmentTimeHours,
              paceMPH: segmentPace,
              timestamp: toTime,
              fromStation: fromStation,
              toStation: toStation
            });
          }
        }
      }
    }
  }
  
  if (paceSegments.length === 0) {
    // Check if participant has departed but not arrived anywhere yet
    const hasDeparted = activities.some(a => a.activityType === 'departed');
    
    return {
      averagePaceMPH: PACE_CONFIG.DEFAULT_PACE_MPH,
      recentPaceMPH: PACE_CONFIG.DEFAULT_PACE_MPH,
      isEstimated: true,
      dataPoints: 0,
      reason: hasDeparted ? 'Participant en route - no arrivals yet' : 'No movement data available'
    };
  }
  
  // Calculate average pace (weighted by distance)
  const totalDistance = paceSegments.reduce((sum, seg) => sum + seg.distance, 0);
  const averagePace = paceSegments.reduce((sum, seg) => sum + (seg.paceMPH * seg.distance), 0) / totalDistance;
  
  // Calculate recent pace (last 2 segments or last 2 hours, whichever is fewer)
  const recentSegments = paceSegments.slice(-2);
  const recentTotalDistance = recentSegments.reduce((sum, seg) => sum + seg.distance, 0);
  const recentPace = recentTotalDistance > 0 
    ? recentSegments.reduce((sum, seg) => sum + (seg.paceMPH * seg.distance), 0) / recentTotalDistance
    : averagePace;
  
  return {
    averagePaceMPH: averagePace,
    recentPaceMPH: recentPace,
    isEstimated: false,
    dataPoints: paceSegments.length,
    segments: paceSegments
  };
}

// Calculate ETA for a participant's next station
function calculateParticipantETA(participantId) {
  if (!eventData || !eventData.stationAssignments) return null;
  
  const participant = eventData.participants.find(p => p.id === participantId);
  if (!participant || !participant.courseId) return null;
  
  const course = eventData.courses.find(c => c.id === participant.courseId);
  if (!course) return null;
  
  // Find current station
  let currentStationId = null;
  for (const stationId of Object.keys(eventData.stationAssignments)) {
    if ((eventData.stationAssignments[stationId] || []).includes(participantId)) {
      currentStationId = stationId;
      break;
    }
  }
  
  if (!currentStationId) return null;
  
  // Find next station in course
  const currentStationIndex = course.stations.findIndex(s => s.stationId === currentStationId);
  if (currentStationIndex === -1) {
    return null; // Not in course
  }
  
  let nextStation, currentDistance, nextDistance, distanceToNext;
  
  if (currentStationIndex >= course.stations.length - 1) {
    // At final station - show virtual "Finish" station
    const finalStation = course.stations[currentStationIndex];
    currentDistance = finalStation.cumulativeDistance || 0;
    // Calculate remaining distance to finish based on course total length
    const courseTotalDistance = course.totalDistance || course.totalLength || (currentDistance + 0.1);
    nextDistance = courseTotalDistance;
    distanceToNext = nextDistance - currentDistance;
  } else {
    // Normal case - next station in course
    nextStation = course.stations[currentStationIndex + 1];
    currentDistance = course.stations[currentStationIndex].cumulativeDistance || 0;
    nextDistance = nextStation.cumulativeDistance || 0;
    distanceToNext = nextDistance - currentDistance;
  }
  
  if (distanceToNext <= 0) return null;
  
  // Get participant's pace
  const paceData = paceTracker.participantPaces.get(participantId);
  if (!paceData) return null;
  
  // Use recent pace if available, otherwise average pace, fallback to default if estimated
  let estimatedPace = paceData.isEstimated ? PACE_CONFIG.DEFAULT_PACE_MPH : paceData.recentPaceMPH;
  
  // Apply fatigue factor (participants slow down as race progresses)
  const progressFactor = Math.pow(PACE_CONFIG.FATIGUE_FACTOR, currentStationIndex);
  estimatedPace *= progressFactor;
  
  // Apply generosity factor
  estimatedPace /= PACE_CONFIG.ETA_GENEROSITY_FACTOR;
  
  // Calculate ETA
  const estimatedTimeHours = distanceToNext / estimatedPace;
  const estimatedTimeMS = estimatedTimeHours * 60 * 60 * 1000;
  
  // Get last known time - prefer departure time if participant has left the station
  let lastActivity = eventData.activityLog
    .filter(entry => entry.participantId === participantId && entry.stationId === currentStationId)
    .sort((a, b) => new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp))[0];
  
  // If no activity at current station, get most recent activity anywhere
  if (!lastActivity) {
    lastActivity = eventData.activityLog
      .filter(entry => entry.participantId === participantId)
      .sort((a, b) => new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp))[0];
  }
  
  const baseTime = lastActivity 
    ? new Date(lastActivity.userTime || lastActivity.timestamp)
    : new Date();
  
  const etaTime = new Date(baseTime.getTime() + estimatedTimeMS);
  
  // Handle finish line case vs regular station
  if (currentStationIndex >= course.stations.length - 1) {
    // At final station - return finish line ETA
    return {
      nextStationId: 'finish',
      nextStationName: 'Finish',
      distanceToNext: distanceToNext,
      estimatedPaceMPH: estimatedPace,
      estimatedTimeHours: estimatedTimeHours,
      etaTime: etaTime,
      isEstimated: true, // Always estimated for finish
      confidence: 'low', // Lower confidence for finish prediction
      isFinishLine: true
    };
  } else {
    // Regular next station
    return {
      nextStationId: nextStation.stationId,
      nextStationName: getStationName(nextStation.stationId),
      distanceToNext: distanceToNext,
      estimatedPaceMPH: estimatedPace,
      estimatedTimeHours: estimatedTimeHours,
      etaTime: etaTime,
      isEstimated: paceData.isEstimated,
      confidence: paceData.isEstimated ? 'low' : (paceData.dataPoints >= 2 ? 'high' : paceData.dataPoints >= 1 ? 'medium' : 'low')
    };
  }
}

// Get station name by ID
function getStationName(stationId) {
  if (!eventData || !eventData.aidStations) return 'Unknown';
  const station = eventData.aidStations.find(s => s.id === stationId);
  return station ? station.name : 'Unknown';
}

// Start background refresh
function startBackgroundRefresh() {
  if (paceTracker.refreshInterval) {
    clearInterval(paceTracker.refreshInterval);
  }
  
  paceTracker.refreshInterval = setInterval(() => {
    refreshPaceData();
  }, PACE_CONFIG.REFRESH_INTERVAL);
  
  console.log(`Background refresh started (every ${PACE_CONFIG.REFRESH_INTERVAL/1000} seconds)`);
}

// Stop background refresh
function stopBackgroundRefresh() {
  if (paceTracker.refreshInterval) {
    clearInterval(paceTracker.refreshInterval);
    paceTracker.refreshInterval = null;
    console.log('Background refresh stopped');
  }
}

// Refresh pace data
function refreshPaceData() {
  console.log('Refreshing pace data...');
  
  // Recalculate all paces and ETAs
  calculateAllPaces();
  calculateAllETAs();
  
  // Update UI if on race tracker page
  if (currentPage === 'race-tracker' && window.renderRaceTracker) {
    updateBibCardSorting();
    updateBibCardColors();
  }
  
  // Update display mode if active
  if (currentPage === 'display-mode' && window.refreshDisplay) {
    window.refreshDisplay();
  }
  
  paceTracker.lastRefresh = new Date();
  console.log('Pace data refreshed');
}

// Get participant's pace and ETA info for hover
function getParticipantPaceInfo(participantId) {
  const paceData = paceTracker.participantPaces.get(participantId);
  const etaData = paceTracker.participantETAs.get(participantId);
  
  if (!paceData) {
    return {
      averagePace: null,
      recentPace: null,
      nextStation: 'Unknown',
      eta: null,
      confidence: 'none',
      dataPoints: 0,
      isEstimated: true
    };
  }
  
  // Check if this is a distance configuration issue
  const participant = eventData.participants.find(p => p.id === participantId);
  const course = participant && participant.courseId ? eventData.courses.find(c => c.id === participant.courseId) : null;
  const hasDistanceConfig = course && course.stations.some(s => s.cumulativeDistance > 0);
  
  let statusMessage = '';
  if (paceData.reason === 'No distance configuration') {
    statusMessage = '⚠️ Course distances not configured';
  } else if (paceData.dataPoints === 0) {
    if (paceData.reason === 'Participant en route - no arrivals yet') {
      statusMessage = '🏃 En route to next station';
    } else {
      statusMessage = paceData.reason || 'Needs more movement data';
    }
  }
  
  return {
    averagePace: paceData.averagePaceMPH,
    recentPace: paceData.recentPaceMPH,
    nextStation: etaData ? etaData.nextStationName : 'Unknown',
    eta: etaData ? etaData.etaTime : null,
    distanceToNext: etaData ? etaData.distanceToNext : null,
    confidence: etaData ? etaData.confidence : 'none',
    dataPoints: paceData.dataPoints,
    isEstimated: paceData.isEstimated,
    statusMessage: statusMessage,
    hasDistanceConfig: hasDistanceConfig,
    isFinishLine: etaData ? etaData.isFinishLine : false
  };
}

// Format pace for display
function formatPace(paceMPH) {
  if (!paceMPH || isNaN(paceMPH) || paceMPH <= 0) return '--';
  return paceMPH.toFixed(1) + ' mph';
}

// Format ETA for display
function formatETA(etaTime) {
  if (!etaTime || !(etaTime instanceof Date) || isNaN(etaTime.getTime())) return '--';
  
  const now = new Date();
  const diffMs = etaTime - now;
  
  if (isNaN(diffMs)) return '--';
  
  const absDiffMs = Math.abs(diffMs);
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (isNaN(hours) || isNaN(minutes)) return '--';
  
  let timeStr;
  if (hours > 0) {
    timeStr = `${hours}h ${minutes}m`;
  } else {
    timeStr = `${minutes}m`;
  }
  
  if (diffMs < 0) {
    return `${timeStr} overdue`;
  } else {
    return timeStr;
  }
}

// Format ETA for display with context (handles finish line differently)
function formatETAWithContext(participantId) {
  const etaData = paceTracker.participantETAs.get(participantId);
  if (!etaData || !etaData.etaTime) return '--';
  
  const etaTime = etaData.etaTime;
  const now = new Date();
  const diffMs = etaTime - now;
  
  if (isNaN(diffMs)) return '--';
  
  const absDiffMs = Math.abs(diffMs);
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (isNaN(hours) || isNaN(minutes)) return '--';
  
  let timeStr;
  if (hours > 0) {
    timeStr = `${hours}h ${minutes}m`;
  } else {
    timeStr = `${minutes}m`;
  }
  
  if (diffMs < 0) {
    if (etaData.isFinishLine) {
      // For finish line, show estimated completion time instead of "overdue"
      const finishTimeStr = etaTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `Est. Finished @ ${finishTimeStr}`;
    } else {
      // Regular station - show overdue
      return `${timeStr} overdue`;
    }
  } else {
    return timeStr;
  }
}

// Get pace-based color class for bib cards (based on ETA proximity)
function getPaceColorClass(participantId) {
  const etaData = paceTracker.participantETAs.get(participantId);
  if (!etaData) return '';
  
  const now = new Date();
  const timeToETA = etaData.etaTime - now;
  const minutesToETA = timeToETA / (1000 * 60);
  
  // Special handling for finish line - keep them green since they're likely done
  if (etaData.isFinishLine && minutesToETA < 0) {
    return 'pace-arriving-soon'; // Green - likely finished
  }
  
  // Color coding based on ETA proximity (how soon they'll arrive)
  if (minutesToETA < 10) {
    return 'pace-arriving-soon'; // Green - arriving soon (< 10 min)
  } else if (minutesToETA < 30) {
    return 'pace-arriving-closer'; // Yellow - getting closer (10-30 min)
  } else {
    return 'pace-arriving-later'; // Orange - still far out (30+ min)
  }
}

// Get pace performance icon based on individual pace vs their own history
function getPacePerformanceIcon(participantId) {
  const paceData = paceTracker.participantPaces.get(participantId);
  const etaData = paceTracker.participantETAs.get(participantId);
  
  if (!paceData || !etaData) return '';
  
  // Special handling for finish line - don't show overdue icons since we don't track finish arrivals
  if (etaData.isFinishLine) {
    // For finish line, only show ahead icon if they're doing better than expected
    if (paceData.recentPaceMPH > paceData.averagePaceMPH * 1.1) {
      return 'pace-icon-ahead'; // 🚀 - ahead of their own pace
    }
    return ''; // No overdue icons for finish line
  }
  
  // Regular station logic - show overdue indicators
  const now = new Date();
  const timeToETA = etaData.etaTime - now;
  const minutesToETA = timeToETA / (1000 * 60);
  
  if (minutesToETA < -30) {
    return 'pace-icon-alert'; // 🚨 - significantly overdue
  } else if (minutesToETA < -10) {
    return 'pace-icon-warning'; // ⚠️ - behind pace but not critical
  } else if (paceData.recentPaceMPH > paceData.averagePaceMPH * 1.1) {
    return 'pace-icon-ahead'; // 🚀 - ahead of their own pace
  }
  
  return ''; // No icon - on track with their own pace
}

// Get pace performance icon text for tooltip display
function getPacePerformanceIconText(participantId) {
  const iconClass = getPacePerformanceIcon(participantId);
  
  if (iconClass === 'pace-icon-alert') {
    return '🚨';
  } else if (iconClass === 'pace-icon-warning') {
    return '⚠️';
  } else if (iconClass === 'pace-icon-ahead') {
    return '🚀';
  }
  
  return ''; // No icon
}

// Sort participants by ETA (soonest arrival first)
function sortParticipantsByETA(participantIds) {
  return [...participantIds].sort((a, b) => {
    const etaA = paceTracker.participantETAs.get(a);
    const etaB = paceTracker.participantETAs.get(b);
    
    if (!etaA && !etaB) return a.localeCompare(b); // Fallback to ID sort
    if (!etaA) return 1; // No ETA goes to end
    if (!etaB) return -1; // No ETA goes to end
    
    // Sort by ETA time (earliest first)
    return etaA.etaTime - etaB.etaTime;
  });
}

// Sort participants by pace (fastest first) - kept for legacy/other uses
function sortParticipantsByPace(participantIds) {
  return [...participantIds].sort((a, b) => {
    const paceA = paceTracker.participantPaces.get(a);
    const paceB = paceTracker.participantPaces.get(b);
    
    if (!paceA && !paceB) return 0;
    if (!paceA) return 1;
    if (!paceB) return -1;
    
    // Use recent pace if available, otherwise average pace
    const speedA = paceA.recentPaceMPH || paceA.averagePaceMPH;
    const speedB = paceB.recentPaceMPH || paceB.averagePaceMPH;
    
    return speedB - speedA; // Fastest first
  });
}

// Set up hover events for bib cards
function setupHoverEvents() {
  // Use event delegation since bib cards are dynamically generated
  let currentTooltipTarget = null;
  
  document.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('bib-card')) {
      // Always hide any existing tooltip first
      hidePaceTooltip();
      
      currentTooltipTarget = e.target;
      showPaceTooltip(e.target, e);
    } else if (!e.target.closest('.pace-tooltip')) {
      // Hide tooltip if mousing over something that's not a bib card or the tooltip itself
      if (currentTooltipTarget && !currentTooltipTarget.contains(e.target)) {
        hidePaceTooltip();
        currentTooltipTarget = null;
      }
    }
  });
  
  document.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('bib-card')) {
      // Small delay to prevent flickering when moving mouse within the same card
      setTimeout(() => {
        const tooltip = document.getElementById('pace-tooltip');
        if (tooltip && currentTooltipTarget === e.target) {
          const rect = e.target.getBoundingClientRect();
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          
          // Check if mouse is still over the card or tooltip
          if (mouseX < rect.left || mouseX > rect.right || 
              mouseY < rect.top || mouseY > rect.bottom) {
            hidePaceTooltip();
            currentTooltipTarget = null;
          }
        }
      }, 100);
    }
  });
  
  // Also hide tooltip when mouse leaves the document or moves to far away
  document.addEventListener('mouseleave', () => {
    hidePaceTooltip();
    currentTooltipTarget = null;
  });
}

// Show pace tooltip
function showPaceTooltip(bibCard, event) {
  const participantId = bibCard.getAttribute('data-participant-id');
  if (!participantId) return;
  
  const paceInfo = getParticipantPaceInfo(participantId);
  if (!paceInfo) return;
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.id = 'pace-tooltip';
  tooltip.className = 'pace-tooltip';
  
  let html = `
    <div class="pace-tooltip-header">
      <strong>${participantId}</strong>
      ${paceInfo.isEstimated ? '<span class="estimated-badge">EST</span>' : ''}
    </div>
    <div class="pace-tooltip-content">
      <div class="pace-info">
        <span class="label">Avg Pace:</span>
        <span class="value">${formatPace(paceInfo.averagePace)}</span>
      </div>
      <div class="pace-info">
        <span class="label">Recent Pace:</span>
        <span class="value">${formatPace(paceInfo.recentPace)}</span>
      </div>
  `;
  
  if (paceInfo.nextStation) {
    const etaData = paceTracker.participantETAs.get(participantId);
    const isFinishLine = etaData && etaData.isFinishLine;
    
    html += `
      <div class="pace-divider"></div>
      <div class="eta-info">
        <span class="label">Next Station:</span>
        <span class="value">${paceInfo.nextStation}${isFinishLine ? ' 🏁' : ''}</span>
      </div>
      <div class="eta-info">
        <span class="label">Distance:</span>
        <span class="value">${paceInfo.distanceToNext ? paceInfo.distanceToNext.toFixed(1) : '?'} mi${isFinishLine ? ' to finish' : ''}</span>
      </div>
      <div class="eta-info">
        <span class="label">ETA:</span>
        <span class="value">${formatETAWithContext(participantId)} ${getPacePerformanceIconText(participantId)}</span>
      </div>
      <div class="confidence-info">
        <span class="confidence-${paceInfo.confidence}">
          ${paceInfo.confidence.toUpperCase()} CONFIDENCE
        </span>
      </div>
    `;
  }
  
  html += `
    </div>
    <div class="pace-tooltip-footer">
      ${paceInfo.dataPoints} data points
      ${paceInfo.statusMessage ? `<div class="status-message">${paceInfo.statusMessage}</div>` : ''}
      ${paceInfo.hasDistanceConfig === false ? `<div class="help-message">💡 Run setupSampleCourseDistances() in console</div>` : ''}
    </div>
  `;
  
  tooltip.innerHTML = html;
  
  // Position tooltip
  document.body.appendChild(tooltip);
  
  const rect = bibCard.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.top - tooltipRect.height - 10;
  
  // Adjust if tooltip would go off screen
  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  if (top < 10) {
    top = rect.bottom + 10;
  }
  
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  tooltip.style.opacity = '1';
}

// Hide pace tooltip
function hidePaceTooltip() {
  const tooltip = document.getElementById('pace-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// Update bib card sorting in kanban board
function updateBibCardSorting() {
  const columns = document.querySelectorAll('.column');
  columns.forEach(column => {
    const columnBody = column.querySelector('.column-body');
    if (!columnBody) return;
    
    const bibCards = Array.from(columnBody.querySelectorAll('.bib-card'));
    const participantIds = bibCards.map(card => card.getAttribute('data-participant-id'));
    
    if (participantIds.length <= 1) return;
    
    // Sort by ETA (soonest arrival first)
    const sortedIds = sortParticipantsByETA(participantIds);
    
    // Reorder DOM elements
    sortedIds.forEach(participantId => {
      const card = columnBody.querySelector(`[data-participant-id="${participantId}"]`);
      if (card) {
        columnBody.appendChild(card);
      }
    });
  });
}

// Update bib card colors and icons based on pace
function updateBibCardColors() {
  const bibCards = document.querySelectorAll('.bib-card');
  bibCards.forEach(card => {
    const participantId = card.getAttribute('data-participant-id');
    if (!participantId) return;
    
    // Remove existing pace color classes
    card.classList.remove('pace-overdue', 'pace-arriving-soon', 'pace-arriving-closer', 'pace-arriving-later', 'pace-on-track');
    
    // Remove existing pace icon classes and elements
    card.classList.remove('pace-icon-alert', 'pace-icon-warning', 'pace-icon-ahead');
    const existingIcon = card.querySelector('.pace-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    
    // Add new pace color class (for ETA proximity)
    const colorClass = getPaceColorClass(participantId);
    if (colorClass) {
      card.classList.add(colorClass);
    }
    
    // Add pace performance icon as DOM element
    const iconClass = getPacePerformanceIcon(participantId);
    if (iconClass) {
      card.classList.add(iconClass);
      
      // Create actual icon element instead of using CSS ::after
      const iconElement = document.createElement('span');
      iconElement.className = 'pace-icon';
      
      if (iconClass === 'pace-icon-alert') {
        iconElement.textContent = '🚨';
        iconElement.style.animation = 'pulse-urgent 2s infinite';
      } else if (iconClass === 'pace-icon-warning') {
        iconElement.textContent = '⚠️';
        iconElement.style.animation = 'pulse-attention 3s infinite';
      } else if (iconClass === 'pace-icon-ahead') {
        iconElement.textContent = '🚀';
      }
      
      // Position the icon to avoid covering bib number
      iconElement.style.position = 'absolute';
      iconElement.style.top = '-6px';
      iconElement.style.right = '-6px';
      iconElement.style.fontSize = '0.8rem';
      iconElement.style.opacity = '0.9';
      iconElement.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.5)';
      iconElement.style.pointerEvents = 'none';
      iconElement.style.zIndex = '5';
      
      card.appendChild(iconElement);
    }
  });
}

// Helper function to quickly configure course distances
function configureCourseDistances() {
  if (!eventData || !eventData.courses) {
    console.error('No courses found');
    return;
  }
  
  console.log('=== Course Distance Configuration ===');
  
  eventData.courses.forEach(course => {
    console.log(`\nCourse: ${course.name}`);
    console.log('Stations:');
    course.stations.forEach((station, index) => {
      const stationName = getStationName(station.stationId);
      console.log(`  ${index + 1}. ${stationName} (${station.stationId})`);
    });
  });
  
  console.log('\n=== Quick Distance Setup ===');
  console.log('To enable pace tracking, you need to set cumulative distances.');
  console.log('Example for 50K (31 miles):');
  console.log('- Start: 0 miles');
  console.log('- Hairpin: 12 miles');
  console.log('- Burnt House: 19 miles');
  console.log('- Finish: 31 miles');
  console.log('\nWould you like me to set up some sample distances?');
}

// Quick setup function for typical ultra distances
function setupSampleCourseDistances() {
  if (!eventData || !eventData.courses) return;
  
  eventData.courses.forEach(course => {
    const stationCount = course.stations.length;
    
    if (course.name.includes('50') || course.name.includes('50K')) {
      // 50K course - 31 miles total, stations don't go all the way to finish
      const stationDistances = [0, 12, 19, 25, 27]; // Start, aid1, aid2, aid3, final aid
      course.stations.forEach((station, index) => {
        if (index < stationDistances.length) {
          station.cumulativeDistance = stationDistances[index];
        }
      });
      course.totalDistance = 31; // Full race distance
      console.log(`✅ Set up 50K distances for ${course.name} (${course.totalDistance} miles total, last station at ${stationDistances[stationDistances.length-1]} miles)`);
    } else if (course.name.includes('Half') || course.name.includes('HM')) {
      // Half Marathon - 13.1 miles total
      const stationDistances = [0, 6, 10]; // Start, aid1, final aid
      course.stations.forEach((station, index) => {
        if (index < stationDistances.length) {
          station.cumulativeDistance = stationDistances[index];
        }
      });
      course.totalDistance = 13.1; // Full race distance
      console.log(`✅ Set up Half Marathon distances for ${course.name} (${course.totalDistance} miles total, last station at ${stationDistances[stationDistances.length-1]} miles)`);
    } else {
      // Generic spacing
      const totalDistance = stationCount <= 4 ? 13.1 : 31;
      const finalStationDistance = totalDistance * 0.8; // Final station at 80% of total distance
      course.stations.forEach((station, index) => {
        if (index === stationCount - 1) {
          station.cumulativeDistance = finalStationDistance;
        } else {
          station.cumulativeDistance = (index / (stationCount - 1)) * finalStationDistance;
        }
      });
      course.totalDistance = totalDistance;
      console.log(`✅ Set up generic distances for ${course.name} (${course.totalDistance} miles total, last station at ${finalStationDistance} miles)`);
    }
  });
  
  saveData();
  console.log('\n🎉 Course distances configured! Pace tracking should now work.');
  console.log('💡 You can adjust these distances in Setup > Courses');
  
  // Recalculate pace data
  setTimeout(() => {
    calculateAllPaces();
    calculateAllETAs();
    updateBibCardColors();
    console.log('✅ Pace data recalculated with new distances');
  }, 100);
}

// Test function to verify finish line distance calculation
function testFinishLineDistances() {
  if (!eventData || !eventData.courses) {
    console.error('No event data available');
    return;
  }
  
  console.log('=== Testing Finish Line Distance Calculation ===');
  
  eventData.courses.forEach(course => {
    console.log(`\nCourse: ${course.name}`);
    console.log(`Total Distance: ${course.totalDistance || 'NOT SET'} miles`);
    
    if (course.stations && course.stations.length > 0) {
      const lastStation = course.stations[course.stations.length - 1];
      const lastStationDistance = lastStation.cumulativeDistance || 0;
      const remainingDistance = (course.totalDistance || 0) - lastStationDistance;
      
      console.log(`Last Station Distance: ${lastStationDistance} miles`);
      console.log(`Remaining Distance to Finish: ${remainingDistance.toFixed(1)} miles`);
      
      // Test with a sample participant at the last station
      const sampleParticipant = eventData.participants.find(p => p.courseId === course.id);
      if (sampleParticipant) {
        console.log(`Sample calculation for participant ${sampleParticipant.id}:`);
        console.log(`  If at last station (${getStationName(lastStation.stationId)}), distance to finish would be ${remainingDistance.toFixed(1)} miles`);
      }
    }
  });
}

// Debug function to manually test pace icon updates
function debugPaceIcons() {
  console.log('=== DEBUG: Testing Pace Icons ===');
  
  // Recalculate everything
  calculateAllPaces();
  calculateAllETAs();
  
  // Check a few participants
  const bibCards = document.querySelectorAll('.bib-card');
  console.log(`Found ${bibCards.length} bib cards`);
  
  bibCards.forEach(card => {
    const participantId = card.getAttribute('data-participant-id');
    if (!participantId) return;
    
    const paceData = paceTracker.participantPaces.get(participantId);
    const etaData = paceTracker.participantETAs.get(participantId);
    
    if (etaData) {
      const now = new Date();
      const timeToETA = etaData.etaTime - now;
      const minutesToETA = timeToETA / (1000 * 60);
      
      const colorClass = getPaceColorClass(participantId);
      const iconClass = getPacePerformanceIcon(participantId);
      
      console.log(`${participantId}: ${minutesToETA.toFixed(1)}min to ETA, color=${colorClass}, icon=${iconClass}`);
    }
  });
  
  // Update colors
  updateBibCardColors();
  
  console.log('=== DEBUG: Icons should now be visible ===');
}

// Make functions available globally
window.configureCourseDistances = configureCourseDistances;
window.setupSampleCourseDistances = setupSampleCourseDistances;
window.testFinishLineDistances = testFinishLineDistances;
window.debugPaceIcons = debugPaceIcons;

// Export functions for use in other modules
window.paceTracker = {
  initialize: initializePaceTracker,
  calculateAllPaces,
  calculateAllETAs,
  refreshPaceData,
  getParticipantPaceInfo,
  formatPace,
  formatETA,
  formatETAWithContext,
  getPaceColorClass,
  getPacePerformanceIcon,
  getPacePerformanceIconText,
  sortParticipantsByETA,
  sortParticipantsByPace,
  startBackgroundRefresh,
  stopBackgroundRefresh,
  updateBibCardSorting,
  updateBibCardColors
};

// Initialize when DOM is ready - but only if not already initialized
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!paceTracker.initialized) {
      initializePaceTracker();
    }
  });
} else {
  if (!paceTracker.initialized) {
    initializePaceTracker();
  }
} 