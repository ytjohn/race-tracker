// Exports Module
// Centralized export functionality for all race data

// Initialize exports module
function initializeExports() {
  console.log('Exports module initialized');
}

// Render the exports page
function renderExportsPage() {
  const exportsContainer = document.getElementById('exports-container');
  if (!exportsContainer || !eventData) return;
  
  const coursesWithParticipants = getCoursesWithParticipants();
  const hasActivityLog = eventData.activityLog && eventData.activityLog.length > 0;
  const hasParticipants = eventData.participants && eventData.participants.length > 0;
  
  const html = `
    <div class="exports-sections">
      
      <!-- Race Results Exports -->
      <div class="export-section">
        <div class="export-section-header">
          <h3>🏆 Race Results</h3>
          <p>Participant results with timing and pace data</p>
        </div>
        
        <div class="export-options">
          ${coursesWithParticipants.map(course => `
            <div class="export-option">
              <div class="export-option-content">
                <div class="export-option-title">${course.name} Results</div>
                <div class="export-option-description">
                  CSV with ${course.participantCount} participants
                </div>
              </div>
              <button class="btn btn-primary btn-small" onclick="exportSingleCourseResults('${course.id}')" ${course.participantCount === 0 ? 'disabled' : ''}>
                <span class="btn-icon">📊</span>
                Download CSV
              </button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Activity Log Exports -->
      <div class="export-section">
        <div class="export-section-header">
          <h3>📋 Activity Log</h3>
          <p>Detailed chronological activity records</p>
        </div>
        
        <div class="export-options">
          <div class="export-option">
            <div class="export-option-content">
              <div class="export-option-title">Complete Activity Log (CSV)</div>
              <div class="export-option-description">
                All activities with timestamps and course analysis
              </div>
            </div>
            <button class="btn btn-primary btn-small" onclick="exportActivityLog('csv')" ${!hasActivityLog ? 'disabled' : ''}>
              <span class="btn-icon">📊</span>
              Download CSV
            </button>
          </div>
          
          <div class="export-option">
            <div class="export-option-content">
              <div class="export-option-title">Complete Activity Log (JSON)</div>
              <div class="export-option-description">
                Structured data format for technical analysis
              </div>
            </div>
            <button class="btn btn-primary btn-small" onclick="exportActivityLog('json')" ${!hasActivityLog ? 'disabled' : ''}>
              <span class="btn-icon">💾</span>
              Download JSON
            </button>
          </div>
          
          ${coursesWithParticipants.map(course => `
            <div class="export-option">
              <div class="export-option-content">
                <div class="export-option-title">${course.name} Activity Log</div>
                <div class="export-option-description">
                  Activities for ${course.participantCount} participants
                </div>
              </div>
              <button class="btn btn-primary btn-small" onclick="exportCourseActivityLog('${course.id}')" ${course.participantCount === 0 ? 'disabled' : ''}>
                <span class="btn-icon">📊</span>
                Download CSV
              </button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Event Data Exports -->
      <div class="export-section">
        <div class="export-section-header">
          <h3>⚙️ Event Data</h3>
          <p>Complete event configuration and data backup</p>
        </div>
        
        <div class="export-options">
          <div class="export-option">
            <div class="export-option-content">
              <div class="export-option-title">Complete Event Export</div>
              <div class="export-option-description">
                Full event backup including all settings, participants, and activity logs
              </div>
            </div>
            <button class="btn btn-primary btn-small" onclick="exportEvent()">
              <span class="btn-icon">💾</span>
              Download JSON
            </button>
          </div>
        </div>
      </div>
      
    </div>
  `;
  
  exportsContainer.innerHTML = html;
}



// Export course-specific activity log
function exportCourseActivityLog(courseId) {
  const course = eventData.courses.find(c => c.id === courseId);
  if (!course) return;
  
  const courseParticipants = eventData.participants
    .filter(p => p.courseId === courseId)
    .map(p => p.id);
  
  const courseActivities = eventData.activityLog
    .filter(entry => !entry.participantId || courseParticipants.includes(entry.participantId))
    .sort((a, b) => new Date(a.userTime || a.timestamp) - new Date(b.userTime || b.timestamp));
  
  const headers = ['Time', 'Participant ID', 'Participant Name', 'Activity Type', 'Station', 'Prior Station', 'Course Analysis', 'Distance', 'Duration', 'Notes'];
  
  const rows = courseActivities.map(entry => {
    const participant = entry.participantId ? eventData.participants.find(p => p.id === entry.participantId) : null;
    const time = new Date(entry.userTime || entry.timestamp);
    const station = eventData.aidStations.find(s => s.id === entry.stationId);
    const priorStation = entry.priorStationId ? eventData.aidStations.find(s => s.id === entry.priorStationId) : null;
    
    // Calculate course analysis and distance if applicable
    let courseAnalysis = '—';
    let distance = '—';
    let duration = '—';
    
    if (participant && entry.activityType === 'arrival') {
      const analysis = analyzeParticipantMove(participant, entry.stationId, entry.priorStationId, 'arrival');
      courseAnalysis = analysis.message;
      
      if (analysis.distance) {
        distance = `${analysis.distance.toFixed(1)} mi`;
      }
      
      // Calculate duration if we have prior station timing
      if (entry.priorStationId) {
        const priorActivities = eventData.activityLog
          .filter(log => log.participantId === entry.participantId && log.stationId === entry.priorStationId)
          .sort((a, b) => new Date(b.userTime || b.timestamp) - new Date(a.userTime || a.timestamp));
        
        if (priorActivities.length > 0) {
          const priorTime = new Date(priorActivities[0].userTime || priorActivities[0].timestamp);
          const timeDiff = time - priorTime;
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
      }
    }
    
    return [
      formatTime(time),
      entry.participantId || '',
      participant ? participant.name : '',
      formatActivityType(entry.activityType),
      station ? station.name : entry.stationId,
      priorStation ? priorStation.name : (entry.priorStationId || ''),
      courseAnalysis,
      distance,
      duration,
      entry.notes || ''
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        const cellStr = cell.toString();
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');
  
  const eventName = eventData.event.name || 'Event';
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `${eventName}-${course.name}-Activity-Log-${timestamp}.csv`);
}

// Helper function to get courses with participant counts
function getCoursesWithParticipants() {
  if (!eventData.courses) return [];
  
  return eventData.courses.map(course => {
    const participantCount = eventData.participants.filter(p => p.courseId === course.id).length;
    return {
      ...course,
      participantCount
    };
  });
}

// Helper function to download CSV
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Make functions globally accessible
window.initializeExports = initializeExports;
window.renderExportsPage = renderExportsPage;
window.exportCourseActivityLog = exportCourseActivityLog;