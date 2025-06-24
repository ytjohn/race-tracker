# PLANNING.md

## Project Overview

This project is a portable, offline-first race tracking tool for amateur radio operators supporting trail races. The tool will allow operators to quickly update runner locations at aid stations, log key events, and generate reports for race control. The primary interface is a Kanban-style board, with columns for each aid station and cards for each participant (bib number).

---

## MVP Scope

### Core Features

- **Kanban Board UI**
  - Columns for each aid station
  - Cards for each bib number
  - Drag-and-drop to move bibs between stations

- **Batch Data Entry**
  - Modal/popup for entering multiple bibs at once
  - Autocomplete for bib numbers

- **Visual Indicators**
  - Mark bibs as "departed" from a station
  - Highlight recent activity (most recent updates  )

- **Logging**
  - Log messages (e.g., station closed, supply requests)
  - Timestamped entries

- **Quick Add**
  - Add new participants on the fly

- **Persistence**
  - Store all data in browser (LocalStorage or IndexedDB)
  - Export/import state as JSON

- **Offline Support**
  - Fully functional as a static HTML/JS app

---

## Stretch Goals

- **Reporting/Export**
  - Export data as CSV (per-participant pacing table: one row per participant, columns per checkpoint)
  - Optionally, export as PDF or print-friendly format

- **Swimlanes/Multiple Courses**
  - Visual separation for different race courses (e.g., 50K, Half Marathon)

- **Thermal Printer Support**
  - Generate printable slips for updates

- **UI Enhancements**
  - Improved styling and usability
  - Keyboard shortcuts for faster operation

- **Estimated Arrival Windows & Overdue Flags**
  - Calculate estimated arrival times per aid station based on distance and average trail pace (configurable per course/segment)
  - Visually flag runners who are overdue (haven't checked in past the estimated window)

- **Activity Log Management**
  - Separate screen for reviewing/editing activity log entries (table view)
  - Ability to modify or delete log entries (for correcting mistakes)
  - Export/print activity logs

- **Participant Management**
  - Add/modify/delete participant entries page
  - Distinguish between official race participants and "other" participants (sweeps, crew, etc.)
  - Handle mistakes in participant movements (accidental moves, wrong times, etc.)

---

## Out of Scope (for now)

- Multi-user/networked sync
- Tauri or other desktop app wrappers
- Real-time collaboration

---

## Technical Approach

- **Frontend:** Vanilla JS, HTML, CSS (optionally Alpine.js for interactivity)
- **Data Storage:** LocalStorage or IndexedDB
- **Portability:** Runs as a static file in any modern browser (Windows, Mac, Linux)
- **No backend required**

---

## Timeline

- **Week 1:**  
  - Set up project structure  
  - Basic Kanban board with columns and cards  
  - Drag-and-drop functionality

- **Week 2:**  
  - Batch data entry modal with autocomplete  
  - Visual indicators for departed/recent activity  
  - Logging panel

- **Week 3:**  
  - Quick add participant  
  - Data persistence (LocalStorage/IndexedDB)  
  - Export/import JSON

- **Week 4:**  
  - CSV export (per-participant pacing table)  
  - UI polish, bug fixes, testing  
  - Documentation

- **Race Day (July 26):**  
  - MVP ready and tested  
  - Stretch goals as time allows

---

## Open Questions

- What is the maximum number of participants/aid stations expected?
- Any specific accessibility or display requirements for the TV/monitor?
- Should we support dark mode or high-contrast mode for visibility?

---

## Next Steps

1. Create initial project skeleton (HTML/JS/CSS)
2. Implement Kanban board with static data
3. Add drag-and-drop and batch entry modal
4. Iterate based on feedback and testing

---

*This plan will be updated as the project progresses and requirements evolve.*
