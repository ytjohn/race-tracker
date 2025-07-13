// Race Results Module
// Generates printable race results with pacing data for each course

// Initialize race results module
function initializeRaceResults() {
  console.log('Race results module initialized');
}

// Render race results page
function renderRaceResults() {
  const resultsContainer = document.getElementById('race-results-container');
  if (!resultsContainer || !eventData) return;
  

  
  if (eventData.courses.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏁</div>
        <h3>No Courses Configured</h3>
        <p>Configure courses to generate race results</p>
        <button class="btn btn-primary" onclick="showPage('courses-setup')">
          <span class="btn-icon">⚙️</span>
          Setup Courses
        </button>
      </div>
    `;
    return;
  }
  
  // Generate results for each course
  const courseResults = eventData.courses.map(course => {
    const courseParticipants = getCourseParticipants(course);
    const participantResults = courseParticipants.map(participant => {
      return generateParticipantResult(participant, course);
    });
    
    return {
      course: course,
      participants: participantResults.sort((a, b) => {
        // Sort alphanumerically by participant ID
        const aId = a.participant.id.toString();
        const bId = b.participant.id.toString();
        return aId.localeCompare(bId, undefined, { numeric: true });
      })
    };
  });
  
  // Render the results
  const html = `
    <div class="race-results-header compact" id="race-results-top">
      <div class="results-actions">
        <button class="btn btn-secondary btn-small" onclick="printRaceResults()">
          <span class="btn-icon">🖨️</span>
          Print
        </button>
      </div>
      
      <div class="course-navigation">
        <span class="nav-label">Courses:</span>
        ${courseResults.map(result => `
          <a href="#course-${result.course.id}" class="course-nav-link">
            ${result.course.name} (${result.participants.length})
          </a>
        `).join('')}
      </div>
    </div>
    
    ${courseResults.map(result => renderCourseResultsTable(result)).join('')}
  `;
  
  resultsContainer.innerHTML = html;
}

// Get participants for a specific course
function getCourseParticipants(course) {
  return eventData.participants.filter(p => p.courseId === course.id);
}

// Generate result data for a participant
function generateParticipantResult(participant, course) {
  const participantLogs = eventData.activityLog.filter(log => 
    log.participantId === participant.id
  ).sort((a, b) => new Date(a.userTime || a.timestamp) - new Date(b.userTime || b.timestamp));
  
  // Find start time (departure from Start station)
  const startLog = participantLogs.find(log => 
    log.stationId === 'start' && log.activityType === 'departed'
  );
  
  const startTime = startLog ? new Date(startLog.userTime || startLog.timestamp) : null;
  
  // Get station arrivals for this course
  const stationResults = course.stations.map(courseStation => {
    if (courseStation.stationId === 'start') return null; // Skip start station in results
    
    // Find the actual station details from aidStations
    const station = eventData.aidStations.find(aid => aid.id === courseStation.stationId);
    if (!station) return null;
    
    const arrivalLog = participantLogs.find(log => 
      log.stationId === courseStation.stationId && log.activityType === 'arrival'
    );
    
    if (!arrivalLog || !startTime) {
      return {
        station: station,
        courseStation: courseStation,
        arrivalTime: null,
        overallPace: null,
        distance: courseStation.cumulativeDistance || 0
      };
    }
    
    const arrivalTime = new Date(arrivalLog.userTime || arrivalLog.timestamp);
    const totalHours = (arrivalTime - startTime) / (1000 * 60 * 60);
    const distance = courseStation.cumulativeDistance || 0;
    const pace = distance > 0 ? distance / totalHours : 0; // mph
    
    return {
      station: station,
      courseStation: courseStation,
      arrivalTime: arrivalTime,
      overallPace: pace,
      distance: distance
    };
  }).filter(result => result !== null);
  
  // Check for course analysis issues
  const hasIssues = participantLogs.some((log, index) => {
    // Find the prior station from the previous log entry
    let priorStation = null;
    if (index > 0) {
      const priorLog = participantLogs[index - 1];
      priorStation = eventData.aidStations.find(s => s.id === priorLog.stationId);
    }
    
    const analysis = analyzeCourseProgression(participant, log, priorStation);
    return analysis && (analysis.status === 'warning' || analysis.status === 'error');
  });
  
  return {
    participant: participant,
    startTime: startTime,
    stationResults: stationResults,
    hasIssues: hasIssues
  };
}

// Render results table for a course
function renderCourseResultsTable(result) {
  const { course, participants } = result;
  
  // Get all unique stations (excluding start) with proper station details
  const stations = course.stations
    .filter(courseStation => courseStation.stationId !== 'start')
    .map(courseStation => {
      const station = eventData.aidStations.find(aid => aid.id === courseStation.stationId);
      return {
        ...station,
        courseStation: courseStation
      };
    })
    .filter(station => station.id); // Remove any that couldn't be found
  
  if (participants.length === 0) {
    return `
      <div class="course-results-section">
        <h2 class="course-results-title">${course.name} - ${eventData.event.name || 'Race'}</h2>
        <div class="no-participants">
          <p>No participants assigned to this course</p>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="course-results-section" id="course-${course.id}">
      <div class="course-header">
        <h2 class="course-results-title">
          ${course.name} - ${eventData.event.name || 'Race'}
          <button class="export-icon-btn" onclick="exportSingleCourseResults('${course.id}')" title="Export ${course.name} CSV">
            <span class="btn-icon">📊</span>
          </button>
        </h2>
        <a href="#race-results-top" class="back-to-top">↑ Back to Top</a>
      </div>
      <div class="course-results-meta">
        <span class="participant-count">${participants.length} participants</span>
        <span class="course-distance">${getTotalCourseDistance(course).toFixed(1)} miles</span>
        ${renderIssuesSummary(participants)}
      </div>
      
      <div class="results-table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th class="participant-col">Participant</th>
              <th class="start-time-col">Start Time</th>
              ${stations.map(station => `
                <th class="station-col">
                  ${station.name}
                  <div class="station-distance">${station.courseStation.cumulativeDistance || 0} mi</div>
                </th>
              `).join('')}
              <th class="finish-col">Finish</th>
            </tr>
          </thead>
          <tbody>
            ${participants.map(participant => renderParticipantResultRow(participant, stations)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Render a single participant result row
function renderParticipantResultRow(participantResult, stations) {
  const { participant, startTime, stationResults, hasIssues } = participantResult;
  
  return `
    <tr class="participant-row ${hasIssues ? 'has-issues' : ''}">
      <td class="participant-cell">
        <div class="participant-name">
          <strong>${participant.name || participant.id}</strong>
          ${hasIssues ? ' <span class="issue-indicator">⚠️</span>' : ''}
        </div>
      </td>
      <td class="start-time-cell">
        ${startTime ? formatTime(startTime) : '<span class="no-data">No Start</span>'}
      </td>
      ${stations.map(station => {
        const stationResult = stationResults.find(r => r.station.id === station.id);
        if (!stationResult || !stationResult.arrivalTime) {
          return '<td class="station-cell no-data">--</td>';
        }
        
        return `
          <td class="station-cell">
            <div class="station-data">
              <span class="arrival-time">${formatTime(stationResult.arrivalTime)}</span>
              <span class="pace-separator"> • </span>
              <span class="pace-info"><strong>${stationResult.overallPace.toFixed(1)} mph</strong></span>
            </div>
          </td>
        `;
      }).join('')}
      <td class="finish-cell"></td>
    </tr>
  `;
}

// Render issues summary for a course
function renderIssuesSummary(participants) {
  const participantsWithIssues = participants.filter(p => p.hasIssues);
  
  if (participantsWithIssues.length === 0) {
    return '';
  }
  
  const issueNames = participantsWithIssues.map(p => p.participant.name || p.participant.id);
  
  return `
    <div class="issues-summary">
      <span class="issues-text">Double check entries for: ${issueNames.join(', ')}</span>
    </div>
  `;
}

// Get total course distance
function getTotalCourseDistance(course) {
  if (course.stations.length === 0) return 0;
  const lastStation = course.stations[course.stations.length - 1];
  return lastStation.cumulativeDistance || 0;
}

// Format time for display
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
}

// Print race results
function printRaceResults() {
  // Add print-specific styling
  const printCSS = `
    <style>
      @media print {
        .race-results-header { display: none; }
        .main-nav { display: none; }
        .main-footer { display: none; }
        .course-results-section:not(:first-child) { 
          page-break-before: always;
          page-break-inside: avoid;
        }
        .course-results-section:first-child {
          page-break-before: auto;
        }
        .results-table {
          width: 100%;
          border-collapse: collapse;
        }
        .results-table th,
        .results-table td {
          border: 1px solid #333;
          padding: 4px 6px;
          font-size: 11px;
        }
        .results-table th {
          background: #f5f5f5;
          font-weight: bold;
        }
        .station-distance {
          font-size: 9px;
          color: #666;
        }
        .pace-info {
          font-size: 9px;
          color: #666;
        }
        .participant-name {
          font-size: 9px;
          color: #666;
        }
        .no-data {
          color: #999;
          font-style: italic;
        }
        .issue-indicator {
          color: #ff6b00;
        }
        .issues-summary {
          margin-top: 4px;
          font-size: 10px;
          color: #666;
        }
      }
    </style>
  `;
  
  // Add the print CSS to the document
  const existingPrintStyle = document.getElementById('print-results-style');
  if (existingPrintStyle) {
    existingPrintStyle.remove();
  }
  
  const printStyle = document.createElement('style');
  printStyle.id = 'print-results-style';
  printStyle.innerHTML = printCSS;
  document.head.appendChild(printStyle);
  
  // Print the page
  window.print();
  
  // Remove the print CSS after printing
  setTimeout(() => {
    if (printStyle.parentNode) {
      printStyle.parentNode.removeChild(printStyle);
    }
  }, 1000);
}

// Export single course results
function exportSingleCourseResults(courseId) {
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  const courseParticipants = getCourseParticipants(course);
  const participantResults = courseParticipants.map(participant => {
    return generateParticipantResult(participant, course);
  });
  
  participantResults.sort((a, b) => {
    const aId = a.participant.id.toString();
    const bId = b.participant.id.toString();
    return aId.localeCompare(bId, undefined, { numeric: true });
  });
  
  // Get stations (excluding start) for header
  const stations = course.stations
    .filter(courseStation => courseStation.stationId !== 'start')
    .map(courseStation => {
      const station = eventData.aidStations.find(aid => aid.id === courseStation.stationId);
      return {
        ...station,
        courseStation: courseStation
      };
    })
    .filter(station => station.id);
  
  // Build CSV header
  const csvHeader = [
    'Participant ID',
    'Participant Name', 
    'Start Time'
  ];
  
  // Add two columns per station (arrival time and pace)
  stations.forEach(station => {
    csvHeader.push(`${station.name} Arrival Time`);
    csvHeader.push(`${station.name} Pace (mph)`);
  });
  
  csvHeader.push('Issues');
  
  // Build CSV data rows
  const csvRows = [csvHeader];
  
  participantResults.forEach(result => {
    const { participant, startTime, stationResults, hasIssues } = result;
    
    const row = [
      participant.id,
      participant.name || '',
      startTime ? formatTime(startTime) : 'No Start'
    ];
    
    // Add data for each station
    stations.forEach(station => {
      const stationResult = stationResults.find(r => r.station.id === station.id);
      if (stationResult && stationResult.arrivalTime) {
        row.push(formatTime(stationResult.arrivalTime));
        row.push(stationResult.overallPace.toFixed(1));
      } else {
        row.push('--'); // No arrival time
        row.push('--'); // No pace
      }
    });
    
    // Add issues column
    row.push(hasIssues ? 'YES' : 'NO');
    
    csvRows.push(row);
  });
  
  // Convert to CSV format
  const csvContent = csvRows.map(row => {
    return row.map(cell => {
      const cellStr = cell.toString();
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return '"' + cellStr.replace(/"/g, '""') + '"';
      }
      return cellStr;
    }).join(',');
  }).join('\n');
  
  // Download the CSV for this course
  const eventName = eventData.event.name || 'Event';
  const timestamp = new Date().toISOString().split('T')[0];
  const courseName = course.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${courseName}_Results_${timestamp}.csv`;
  
  downloadFile(csvContent, filename, 'text/csv');
}

// Download file utility (reused from activity-log.js)
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Make functions globally accessible
window.exportSingleCourseResults = exportSingleCourseResults; 