// Main Application Initialization
// This file coordinates all modules and initializes the app

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
  // Load app data and initialize current event
  try {
    await loadData();
  } catch (error) {
    console.error('Error loading data:', error);
  }
  
  // Initialize navigation system
  initializeNavigation();
  
  // Setup keyboard handlers
  setupEnterKeyHandlers();
  
  // Show initial page
  showPage(currentPage);
  
  // Initialize all modules
  initializeEventSetup();
  initializeParticipants();
  initializeActivityLog();
  initializeRaceResults();
  initializeExports();
  initializeEventManagement();
  initializeSearch();
  
  // Setup button event listeners
  setupButtonEventListeners();
  
  // Update navigation state
  updateNavigation();
});

// Module initialization functions
function initializeEventSetup() {
  // Event setup module is loaded - render setup pages if we have data
  if (eventData) {
    renderAidStationsSetup();
    renderCoursesSetup();
  }
}

function initializeParticipants() {
  // Participants module is loaded - render participants if we have data
  if (eventData) {
    renderParticipantsSetup();
  }
}

// Refresh all setup pages (called after import/event switch)
function refreshAllSetupPages() {
  // Load event data into forms
  loadEventDataIntoForms();
  
  // Re-render all setup pages
  renderAidStationsSetup();
  renderCoursesSetup();
  renderParticipantsSetup();
  
  // Update navigation
  updateNavigation();
}

// Setup button event listeners
function setupButtonEventListeners() {
  // Aid stations buttons
  const addStationBtn = document.getElementById('add-station-btn');
  
  if (addStationBtn) {
    addStationBtn.addEventListener('click', addAidStation);
  }
  
  // Courses buttons
  const addCourseBtn = document.getElementById('add-course-btn');
  
  if (addCourseBtn) {
    addCourseBtn.addEventListener('click', addCourse);
  }
  
  // Participants buttons
  const addParticipantBtn = document.getElementById('add-participant-btn');
  const bulkAddBtn = document.getElementById('bulk-add-btn');
  
  if (addParticipantBtn) {
    addParticipantBtn.addEventListener('click', addParticipant);
  }
  if (bulkAddBtn) {
    bulkAddBtn.addEventListener('click', bulkAddParticipants);
  }
  
  // Navigation buttons (for data-page attributes)
  document.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      showPage(page);
    });
  });
}

// Add custom search functionality
let searchState = {
    isActive: false,
    query: '',
    results: [],
    currentIndex: 0,
    searchBox: null
};

// Initialize search functionality
function initializeSearch() {
    // Create search overlay
    const searchOverlay = document.createElement('div');
    searchOverlay.className = 'search-overlay';
    searchOverlay.innerHTML = `
        <div class="search-container">
            <div class="search-header">
                <input type="text" class="search-input" placeholder="Search participants (ID, name, etc.)...">
                <div class="search-controls">
                    <span class="search-results">0 results</span>
                    <button class="search-nav-btn" data-direction="prev" title="Previous (Shift+Enter)">↑</button>
                    <button class="search-nav-btn" data-direction="next" title="Next (Enter)">↓</button>
                    <button class="search-close" title="Close (Esc)">×</button>
                </div>
            </div>
            <div class="search-help">
                <span>Search by participant ID, name, or location • <kbd>Ctrl+F</kbd> to search • <kbd>Enter</kbd> next • <kbd>Shift+Enter</kbd> previous • <kbd>Esc</kbd> close</span>
            </div>
        </div>
    `;
    document.body.appendChild(searchOverlay);

    // Get search elements
    searchState.searchBox = searchOverlay.querySelector('.search-input');
    const searchResults = searchOverlay.querySelector('.search-results');
    const searchNavButtons = searchOverlay.querySelectorAll('.search-nav-btn');
    const searchCloseButton = searchOverlay.querySelector('.search-close');

    // Search input event
    searchState.searchBox.addEventListener('input', (e) => {
        searchState.query = e.target.value.trim();
        performSearch();
        updateSearchResults();
    });

    // Search navigation
    searchNavButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const direction = e.target.dataset.direction;
            navigateSearchResults(direction);
        });
    });

    // Close search
    searchCloseButton.addEventListener('click', closeSearch);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Only intercept Ctrl+F on pages with participant cards
        const currentPage = getCurrentPage();
        const participantPages = ['race-tracker', 'display-mode'];
        
        // Ctrl+F or Cmd+F to open search (only on participant pages)
        if ((e.ctrlKey || e.metaKey) && e.key === 'f' && participantPages.includes(currentPage)) {
            e.preventDefault();
            openSearch();
        }
        
        // Handle search navigation when search is open
        if (searchState.isActive) {
            if (e.key === 'Escape') {
                closeSearch();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const direction = e.shiftKey ? 'prev' : 'next';
                navigateSearchResults(direction);
            }
        }
    });

    // Click outside to close
    searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) {
            closeSearch();
        }
    });

    function openSearch() {
        searchState.isActive = true;
        searchOverlay.classList.add('active');
        // Small delay to ensure the overlay is rendered before focusing
        setTimeout(() => {
            searchState.searchBox.focus();
            searchState.searchBox.select();
        }, 100);
    }

    function closeSearch() {
        searchState.isActive = false;
        searchOverlay.classList.remove('active');
        
        // Add fade-out class before clearing highlights
        searchState.results.forEach(card => {
            card.classList.add('search-closing');
        });
        
        // Clear highlights after a brief delay
        setTimeout(() => {
            clearSearchHighlights();
        }, 300);
        
        searchState.query = '';
        searchState.results = [];
        searchState.currentIndex = 0;
        searchState.searchBox.value = '';
        updateSearchResults();
    }

    function performSearch() {
        clearSearchHighlights();
        searchState.results = [];
        searchState.currentIndex = 0;

        if (!searchState.query) {
            return;
        }

        const query = searchState.query.toLowerCase();
        const participantCards = document.querySelectorAll('.bib-card, .compact-participant, .display-participant');

        participantCards.forEach(card => {
            const searchableText = getSearchableText(card);
            if (searchableText.toLowerCase().includes(query)) {
                searchState.results.push(card);
                highlightSearchMatch(card, query);
            }
        });

        // Navigate to first result
        if (searchState.results.length > 0) {
            scrollToResult(searchState.results[0]);
        }
    }

    function getSearchableText(card) {
        // Get all text content that should be searchable
        let id = '';
        let name = '';
        
        // Try different ways to get participant ID
        if (card.dataset.participantId) {
            id = card.dataset.participantId;
        } else if (card.querySelector('[data-participant-id]')) {
            id = card.querySelector('[data-participant-id]').dataset.participantId;
        } else {
            // For bib cards, extract just the number portion
            const textContent = card.textContent.trim();
            // Try to extract participant ID from text (handle cases like "101 🚀" or "101→")
            const idMatch = textContent.match(/(\d+)/);
            if (idMatch) {
                id = idMatch[1];
            } else {
                id = textContent;
            }
        }
        
        // Try to get participant name if it exists
        const nameElement = card.querySelector('.participant-name');
        if (nameElement) {
            name = nameElement.textContent.trim();
        }
        
        // Get station name from closest station container
        const stationContainer = card.closest('[data-station]');
        const station = stationContainer ? stationContainer.dataset.station : '';
        
        // Get course number from class name
        const courseMatch = card.className.match(/course-(\d+)/);
        const course = courseMatch ? courseMatch[1] : '';
        
        return `${id} ${name} ${station} ${course}`.trim();
    }

    function highlightSearchMatch(card, query) {
        card.classList.add('search-match');
        
        // Add search highlight to text nodes
        const textNodes = getTextNodes(card);
        textNodes.forEach(node => {
            const text = node.textContent;
            const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
            if (regex.test(text)) {
                const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                const wrapper = document.createElement('span');
                wrapper.innerHTML = highlightedText;
                node.parentNode.replaceChild(wrapper, node);
            }
        });
    }

    function getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
                textNodes.push(node);
            }
        }
        return textNodes;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function clearSearchHighlights() {
        // Remove search match class
        document.querySelectorAll('.search-match, .search-closing').forEach(card => {
            card.classList.remove('search-match', 'search-current', 'search-closing');
        });
        
        // Remove highlight spans
        document.querySelectorAll('.search-highlight').forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }

    function navigateSearchResults(direction) {
        if (searchState.results.length === 0) return;

        // Remove current highlighting
        searchState.results.forEach(card => card.classList.remove('search-current'));

        // Update index
        if (direction === 'next') {
            searchState.currentIndex = (searchState.currentIndex + 1) % searchState.results.length;
        } else {
            searchState.currentIndex = (searchState.currentIndex - 1 + searchState.results.length) % searchState.results.length;
        }

        // Highlight current result
        const currentResult = searchState.results[searchState.currentIndex];
        currentResult.classList.add('search-current');
        scrollToResult(currentResult);
        updateSearchResults();
    }

    function scrollToResult(card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function updateSearchResults() {
        const total = searchState.results.length;
        const current = total > 0 ? searchState.currentIndex + 1 : 0;
        searchResults.textContent = total > 0 ? `${current} of ${total}` : `${total} results`;
        
        // Update navigation button states
        searchNavButtons.forEach(btn => {
            btn.disabled = total === 0;
        });
    }
} 