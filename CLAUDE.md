# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Race Tracker is an offline-first, browser-based race tracking system for amateur radio operators supporting trail races. The application is a single-page HTML/CSS/JavaScript application that runs entirely in the browser without requiring a server.

## Application Launch

To run the application, simply open `src/index.html` in any modern web browser. The application is completely self-contained and works offline.

## Architecture

The application follows a modular JavaScript architecture with centralized state management:

### Core Structure
- **Entry Point**: `src/index.html` - Main HTML file that loads all modules
- **State Management**: `src/js/core.js` - Global state, event data, and localStorage persistence
- **Application Bootstrap**: `src/js/app.js` - Module initialization and coordination
- **Navigation**: `src/js/navigation.js` - Page routing and state management

### Key Modules
- **Event Setup**: `src/js/event-setup.js` - Event, aid station, and course configuration
- **Participants**: `src/js/participants.js` - Participant management and course assignment
- **Race Tracker**: `src/js/race-tracker.js` - Main tracking interface with drag-and-drop
- **Activity Log**: `src/js/activity-log.js` - Chronological race activity with export
- **Display Mode**: `src/js/display-mode.js` - Public viewing screens with auto-refresh
- **Pace Tracker**: `src/js/pace-tracker.js` - ETA calculations and pace analysis
- **Race Results**: `src/js/race-results.js` - Printable results generation
- **Event Management**: `src/js/event-management.js` - Multi-event switching and templates
- **Utilities**: `src/js/utils.js` - Shared helper functions

### Data Structure
- **Multi-event support**: `appData.events` object stores multiple race events
- **Current event**: `eventData` global variable references active event
- **Persistence**: All data stored in browser localStorage, auto-saved on changes
- **Event structure**: Each event contains event info, aid stations, courses, participants, and activity log

### State Management Pattern
- Global `eventData` variable holds current event state
- Changes trigger `saveAppData()` for persistence
- Event-driven updates using custom events for real-time UI synchronization
- Module initialization happens after DOM load in `app.js`

## Key Features

### Multi-Course Support
The application handles multiple race courses (50K, Half Marathon, etc.) that can share aid stations but have different sequences and distances.

### Batch Entry System
Station headers trigger batch entry modals for efficient participant updates during radio communications. The system includes intelligent autocomplete and course validation.

### Drag-and-Drop Interface
Individual participant cards can be moved between stations using native HTML5 drag-and-drop APIs.

### Pace Tracking & ETA System
Advanced pace analysis with visual color coding (green/yellow/orange) and performance icons (🚀/⚠️/🚨) based on ETA calculations and participant pace history.

### Display Mode
Specialized public viewing interface with live updates, auto-rotation between views, and pace-based visual indicators for spectator screens.

## Development Notes

- **No build process**: Pure HTML/CSS/JavaScript with no compilation required
- **No dependencies**: Uses only browser APIs, no external libraries
- **ES6+ features**: Modern JavaScript with async/await, arrow functions, etc.
- **Responsive design**: CSS Grid and Flexbox for mobile-friendly layouts
- **Offline-first**: Designed to work without internet connectivity

## Testing

### Automated Testing with Playwright

The project now includes Playwright for automated browser testing and UI screenshots:

**Setup**: Playwright is already installed and configured. Browser binaries are downloaded automatically.

**Available Scripts**:
- `npm test` - Run all Playwright tests across multiple browsers
- `npm run test:ui` - Run tests with Playwright UI mode for debugging
- `npm run test:headed` - Run tests with visible browser windows
- `npm run screenshot` - Generate screenshots of different app states
- `npm run test:mobile` - Test mobile Chrome specifically

**Key Features**:
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile/tablet responsive testing
- Automatic screenshot generation in `screenshots/` directory
- Tests drag-and-drop functionality
- Navigation testing between app pages

**Usage for Development**:
1. Take UI screenshots: `npm run screenshot`
2. Test responsive design: `npm run test:mobile`
3. Debug tests interactively: `npm run test:ui`
4. Full test suite: `npm test`

All screenshots are saved to `screenshots/` directory with descriptive names.

### Manual Testing

For manual testing:
1. Opening `src/index.html` in browser
2. Using browser developer tools for debugging
3. Testing with sample data provided in `src/data/` directory

## Data Files

- `src/data/default-lttr-tracker.json` - Sample event configuration
- `src/data/2025 LTTR Default-activity-log.csv` - Sample activity log export
- `src/data/50k-pace-chart-calculated.json` - Pace calculation reference data