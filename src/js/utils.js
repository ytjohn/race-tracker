// Utility Functions

// Parse time input in various formats, with optional date parameter
function parseTimeInput(timeStr, dateStr = null) {
  if (!timeStr || timeStr.trim() === '') {
    return new Date();
  }
  
  // Use provided date or current date as base
  const baseDate = dateStr ? new Date(dateStr) : new Date();
  const input = timeStr.trim().toLowerCase();
  
  // Handle "now" or current time
  if (input === 'now' || input === '') {
    return new Date(); // Always return actual current time for "now"
  }
  
  // Handle formats like "2PM", "2:30PM", "14:30", "1430", "10:05", "1005"
  let match;
  
  // Format: "2PM", "2:30PM", "12:30AM"
  if ((match = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i))) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const period = match[3].toLowerCase();
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
  
  // Format: "14:30", "10:05"
  if ((match = input.match(/^(\d{1,2}):(\d{2})$/))) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const result = new Date(baseDate);
      result.setHours(hours, minutes, 0, 0);
      return result;
    }
  }
  
  // Format: "1430", "1005" (military time without colon)
  if ((match = input.match(/^(\d{3,4})$/))) {
    const timeNum = match[1];
    let hours, minutes;
    
    if (timeNum.length === 3) {
      hours = parseInt(timeNum.substring(0, 1));
      minutes = parseInt(timeNum.substring(1, 3));
    } else {
      hours = parseInt(timeNum.substring(0, 2));
      minutes = parseInt(timeNum.substring(2, 4));
    }
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const result = new Date(baseDate);
      result.setHours(hours, minutes, 0, 0);
      return result;
    }
  }
  
  // Format: just hour "14", "2"
  if ((match = input.match(/^(\d{1,2})$/))) {
    const hours = parseInt(match[1]);
    if (hours >= 0 && hours <= 23) {
      const result = new Date(baseDate);
      result.setHours(hours, 0, 0, 0);
      return result;
    }
  }
  
  // If nothing matches, return current time
  return new Date();
}

// Get current date in YYYY-MM-DD format for date inputs
function getCurrentDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Get current time in HH:MM format for time inputs
function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

// Parse combined date and time inputs into a single Date object
function parseDateTimeInputs(timeStr, dateStr = null) {
  const targetDate = dateStr || getCurrentDateString();
  return parseTimeInput(timeStr, targetDate);
}

// Format date for display in date inputs
function formatDateForInput(date) {
  if (!date) return getCurrentDateString();
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Format time for display in time inputs  
function formatTimeForInput(date) {
  if (!date) return getCurrentTimeString();
  const d = new Date(date);
  return d.toTimeString().slice(0, 5);
}

// Format time for display
function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper function to find participant's course
function getParticipantCourse(participantId) {
  if (!eventData) return null;
  const participant = eventData.participants.find(p => p.id === participantId);
  return participant ? participant.courseId : null;
}

// Helper function to check if a station belongs to a course
function isStationInCourse(stationId, courseId) {
  if (stationId === 'dnf' || stationId === 'dns' || stationId === 'suspect') {
    return true; // Status stations are available to all courses
  }
  
  if (!eventData) return false;
  
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return false;
  
  return course.stations.some(cs => cs.stationId === stationId);
}

// Helper function to assign participant to course
function assignParticipantToCourse(participantId, courseId) {
  if (!eventData) return null;
  
  let participant = eventData.participants.find(p => p.id === participantId);
  if (!participant) {
    participant = { 
      id: participantId, 
      name: participantId, 
      type: 'race', 
      active: true, 
      courseId: courseId 
    };
    eventData.participants.push(participant);
  } else {
    participant.courseId = courseId;
  }
  return participant;
}

// Parse participant ranges (e.g., "100-148, 150-179, HM Sweep 1")
function parseParticipantRanges(input) {
  const participants = [];
  
  if (!input || !input.trim()) {
    return participants;
  }
  
  // Split by commas and process each part
  const parts = input.split(',').map(part => part.trim()).filter(part => part);
  
  for (const part of parts) {
    // Check if it's a range (e.g., "100-148")
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          participants.push({
            id: i.toString(),
            name: i.toString(),
            type: 'race'
          });
        }
      }
    } else {
      // Single participant (could be number or text)
      participants.push({
        id: part,
        name: part,
        type: 'race'
      });
    }
  }
  
  return participants;
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Round distance to avoid floating point precision issues
function roundDistance(distance, decimals = 2) {
  if (typeof distance !== 'number') {
    distance = parseFloat(distance) || 0;
  }
  return Math.round(distance * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Calculate total course distance with proper rounding
function calculateCourseDistance(course) {
  if (!course || !course.stations || course.stations.length === 0) {
    return 0;
  }
  
  let total = 0;
  for (const station of course.stations) {
    if (station.distance && !isNaN(station.distance)) {
      total += parseFloat(station.distance);
    }
  }
  
  return roundDistance(total);
}

// Log activity
function logActivity(activity) {
  if (!eventData) return;
  
  const logEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userTime: activity.userTime || new Date().toISOString(),
    participantId: activity.participantId,
    activityType: activity.activityType, // 'arrival', 'departed', 'dnf', 'dns', 'other'
    stationId: activity.stationId,
    reportingStation: activity.reportingStation || 'system',
    notes: activity.notes || '',
    ...activity
  };
  
  eventData.activityLog.push(logEntry);
  saveData();
}

// Clear all data for current event
function clearAllData() {
  if (!eventData) return;
  
  if (confirm('Are you sure you want to clear all race data? This will reset participants to their starting positions and clear the activity log.')) {
    // Reset station assignments
    eventData.stationAssignments = {};
    
    // Clear activity log
    eventData.activityLog = [];
    
    // Reset all participants to start station
    if (eventData.participants.length > 0) {
      eventData.stationAssignments['start'] = eventData.participants.map(p => p.id);
    }
    
    saveData();
    
    // Re-render race tracker if active
    if (currentPage === 'race-tracker' && window.renderRaceTracker) {
      renderRaceTracker();
    }
    
    alert('All race data cleared. Participants reset to start.');
  }
}

// Setup Enter key handlers for inputs
function setupEnterKeyHandlers() {
  // Aid station input
  const stationInput = document.getElementById('new-station-name');
  if (stationInput) {
    stationInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (window.addAidStation) addAidStation();
      }
    });
  }
  
  // Course input
  const courseInput = document.getElementById('new-course-name');
  if (courseInput) {
    courseInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (window.addCourse) addCourse();
      }
    });
  }
  
  // Participant inputs
  const participantIdInput = document.getElementById('new-participant-id');
  if (participantIdInput) {
    participantIdInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (window.addParticipant) addParticipant();
      }
    });
  }
  
  const participantNameInput = document.getElementById('new-participant-name');
  if (participantNameInput) {
    participantNameInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (window.addParticipant) addParticipant();
      }
    });
  }
}

// Make utility functions globally accessible
window.roundDistance = roundDistance;
window.calculateCourseDistance = calculateCourseDistance;