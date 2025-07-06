/**
 * AI Avatar Extension - Masonry Layout Controller
 * Handles all interactive functionality for the masonry layout
 * @author AI Avatar Extension
 * @version 1.0.0
 */

class MasonryController {
  constructor(options = {}) {
    this.options = {
      container: '.masonry-container',
      itemSelector: '.masonry-item',
      columns: 3,
      gap: 20,
      enableDragDrop: true,
      enableKeyboardNav: true,
      autoResize: true,
      filterDebounceTime: 300,
      searchDebounceTime: 300,
      theme: 'light',
      animationDuration: 250,
      ...options
    };

    // State management
    this.state = {
      items: [],
      filteredItems: [],
      sortBy: 'default',
      sortOrder: 'asc',
      currentView: 'masonry',
      searchQuery: '',
      filters: {},
      expandedCards: new Set(),
      draggedItem: null,
      dropTargetIndex: null,
      focusedIndex: 0,
      isLoading: false,
      dataBinding: new Map(),
      performanceMetrics: {
        renderTime: 0,
        lastUpdate: Date.now(),
        updateCount: 0
      }
    };

    // Event handlers
    this.handlers = {
      resize: this.debounce(this.handleResize.bind(this), 100),
      keydown: this.handleKeydown.bind(this),
      dragstart: this.handleDragStart.bind(this),
      dragover: this.handleDragOver.bind(this),
      drop: this.handleDrop.bind(this),
      search: this.debounce(this.handleSearch.bind(this), this.options.searchDebounceTime),
      filter: this.debounce(this.handleFilter.bind(this), this.options.filterDebounceTime)
    };

    // Initialize
    this.init();
  }

  /**
   * Initialize the masonry controller
   */
  async init() {
    try {
      await this.setupDOM();
      await this.setupEventListeners();
      await this.loadData();
      await this.render();
      
      // Initialize performance monitoring
      this.initPerformanceMonitoring();
      
      // Setup intersection observer for lazy loading
      this.setupIntersectionObserver();
      
      console.log('MasonryController initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MasonryController:', error);
      this.handleError(error);
    }
  }

  /**
   * Setup DOM elements and containers
   */
  async setupDOM() {
    this.container = document.querySelector(this.options.container);
    if (!this.container) {
      throw new Error(`Container ${this.options.container} not found`);
    }

    // Create necessary elements
    this.createControlElements();
    this.createSearchAndFilter();
    this.createViewToggle();
    this.createThemeToggle();
    
    // Set initial theme
    this.setTheme(this.options.theme);
  }

  /**
   * Create control elements
   */
  createControlElements() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'masonry-controls';
    controlsContainer.innerHTML = `
      <div class="masonry-toolbar">
        <div class="search-container">
          <input type="text" class="search-input" placeholder="Search cards..." aria-label="Search cards">
          <button class="search-clear" aria-label="Clear search">×</button>
        </div>
        <div class="filter-container">
          <select class="filter-select" aria-label="Filter by category">
            <option value="">All Categories</option>
            <option value="analysis">Analysis</option>
            <option value="conversation">Conversation</option>
            <option value="actions">Actions</option>
            <option value="metrics">Metrics</option>
          </select>
        </div>
        <div class="sort-container">
          <select class="sort-select" aria-label="Sort cards">
            <option value="default">Default Order</option>
            <option value="title">Title</option>
            <option value="date">Date</option>
            <option value="type">Type</option>
          </select>
        </div>
        <div class="view-toggle">
          <button class="view-btn active" data-view="masonry" aria-label="Masonry view">
            <span class="icon">⚏</span>
          </button>
          <button class="view-btn" data-view="list" aria-label="List view">
            <span class="icon">☰</span>
          </button>
          <button class="view-btn" data-view="grid" aria-label="Grid view">
            <span class="icon">⚏</span>
          </button>
        </div>
        <button class="theme-toggle" aria-label="Toggle theme">
          <span class="icon">🌙</span>
        </button>
      </div>
    `;

    this.container.parentNode.insertBefore(controlsContainer, this.container);
    
    // Store references
    this.controls = {
      search: controlsContainer.querySelector('.search-input'),
      searchClear: controlsContainer.querySelector('.search-clear'),
      filter: controlsContainer.querySelector('.filter-select'),
      sort: controlsContainer.querySelector('.sort-select'),
      viewButtons: controlsContainer.querySelectorAll('.view-btn'),
      themeToggle: controlsContainer.querySelector('.theme-toggle')
    };
  }

  /**
   * Create search and filter functionality
   */
  createSearchAndFilter() {
    // Search functionality
    this.controls.search.addEventListener('input', this.handlers.search);
    this.controls.searchClear.addEventListener('click', () => {
      this.controls.search.value = '';
      this.handleSearch();
    });

    // Filter functionality
    this.controls.filter.addEventListener('change', this.handlers.filter);
    
    // Sort functionality
    this.controls.sort.addEventListener('change', (e) => {
      this.setSortOrder(e.target.value);
    });
  }

  /**
   * Create view toggle functionality
   */
  createViewToggle() {
    this.controls.viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });
  }

  /**
   * Create theme toggle functionality
   */
  createThemeToggle() {
    this.controls.themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });
  }

  /**
   * Setup event listeners
   */
  async setupEventListeners() {
    // Window resize
    if (this.options.autoResize) {
      window.addEventListener('resize', this.handlers.resize);
    }

    // Keyboard navigation
    if (this.options.enableKeyboardNav) {
      document.addEventListener('keydown', this.handlers.keydown);
    }

    // Drag and drop
    if (this.options.enableDragDrop) {
      this.container.addEventListener('dragstart', this.handlers.dragstart);
      this.container.addEventListener('dragover', this.handlers.dragover);
      this.container.addEventListener('drop', this.handlers.drop);
    }

    // Click handlers for cards
    this.container.addEventListener('click', this.handleCardClick.bind(this));
    
    // Focus management
    this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
    this.container.addEventListener('focusout', this.handleFocusOut.bind(this));
  }

  /**
   * Load initial data
   */
  async loadData() {
    try {
      this.state.isLoading = true;
      this.showLoadingState();

      // Get existing cards from DOM
      const existingCards = Array.from(this.container.querySelectorAll(this.options.itemSelector));
      
      this.state.items = existingCards.map((card, index) => ({
        id: card.id || `card-${index}`,
        element: card,
        data: this.extractCardData(card),
        visible: true,
        height: 0,
        position: { x: 0, y: 0 },
        expanded: false
      }));

      this.state.filteredItems = [...this.state.items];
      
      // Setup data binding for each item
      this.state.items.forEach(item => {
        this.setupDataBinding(item);
      });

    } catch (error) {
      console.error('Failed to load data:', error);
      this.handleError(error);
    } finally {
      this.state.isLoading = false;
      this.hideLoadingState();
    }
  }

  /**
   * Extract data from card element
   */
  extractCardData(card) {
    const titleElement = card.querySelector('.card-title');
    const descriptionElement = card.querySelector('.card-description');
    const typeElement = card.querySelector('.card-type');
    const dateElement = card.querySelector('.card-date');

    return {
      title: titleElement ? titleElement.textContent.trim() : '',
      description: descriptionElement ? descriptionElement.textContent.trim() : '',
      type: typeElement ? typeElement.textContent.trim() : card.dataset.type || '',
      date: dateElement ? new Date(dateElement.textContent) : new Date(),
      category: card.dataset.category || '',
      tags: card.dataset.tags ? card.dataset.tags.split(',') : [],
      priority: parseInt(card.dataset.priority) || 0,
      searchable: [
        titleElement ? titleElement.textContent : '',
        descriptionElement ? descriptionElement.textContent : '',
        card.dataset.tags || ''
      ].join(' ').toLowerCase()
    };
  }

  /**
   * Setup data binding for real-time updates
   */
  setupDataBinding(item) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          this.updateItemData(item);
        }
      });
    });

    observer.observe(item.element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-category', 'data-type', 'data-tags', 'data-priority']
    });

    this.state.dataBinding.set(item.id, observer);
  }

  /**
   * Update item data when DOM changes
   */
  updateItemData(item) {
    const oldData = { ...item.data };
    item.data = this.extractCardData(item.element);
    
    // Check if refiltering is needed
    if (oldData.searchable !== item.data.searchable ||
        oldData.category !== item.data.category ||
        oldData.type !== item.data.type) {
      
      this.applyFilters();
    }
  }

  /**
   * Render the masonry layout
   */
  async render() {
    const startTime = performance.now();
    
    try {
      // Clear existing layout
      this.clearLayout();
      
      // Apply current view
      switch (this.state.currentView) {
        case 'masonry':
          await this.renderMasonryLayout();
          break;
        case 'list':
          await this.renderListLayout();
          break;
        case 'grid':
          await this.renderGridLayout();
          break;
      }
      
      // Update performance metrics
      this.updatePerformanceMetrics(startTime);
      
    } catch (error) {
      console.error('Render failed:', error);
      this.handleError(error);
    }
  }

  /**
   * Render masonry layout
   */
  async renderMasonryLayout() {
    this.container.className = 'masonry-container masonry-view';
    
    // Calculate layout
    const layout = await this.calculateMasonryLayout();
    
    // Apply positions with animation
    await this.applyLayout(layout);
    
    // Enable drag and drop
    this.enableDragDrop();
  }

  /**
   * Render list layout
   */
  async renderListLayout() {
    this.container.className = 'masonry-container list-view';
    
    this.state.filteredItems.forEach((item, index) => {
      item.element.style.transform = `translateY(${index * 120}px)`;
      item.element.style.width = '100%';
      item.element.style.opacity = '1';
      item.element.style.transition = 'all 0.3s ease';
    });
  }

  /**
   * Render grid layout
   */
  async renderGridLayout() {
    this.container.className = 'masonry-container grid-view';
    
    const columns = this.calculateColumns();
    const itemWidth = (this.container.offsetWidth - (columns - 1) * this.options.gap) / columns;
    
    this.state.filteredItems.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      item.element.style.transform = `translate(${col * (itemWidth + this.options.gap)}px, ${row * 200}px)`;
      item.element.style.width = `${itemWidth}px`;
      item.element.style.opacity = '1';
      item.element.style.transition = 'all 0.3s ease';
    });
  }

  /**
   * Calculate masonry layout positions
   */
  async calculateMasonryLayout() {
    const columns = this.calculateColumns();
    const itemWidth = (this.container.offsetWidth - (columns - 1) * this.options.gap) / columns;
    const columnHeights = new Array(columns).fill(0);
    
    const layout = this.state.filteredItems.map((item, index) => {
      // Find shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Calculate position
      const x = shortestColumnIndex * (itemWidth + this.options.gap);
      const y = columnHeights[shortestColumnIndex];
      
      // Update item dimensions
      item.element.style.width = `${itemWidth}px`;
      
      // Get actual height (account for content)
      const height = this.getItemHeight(item.element);
      
      // Update column height
      columnHeights[shortestColumnIndex] += height + this.options.gap;
      
      return {
        item,
        x,
        y,
        width: itemWidth,
        height
      };
    });
    
    // Update container height
    this.container.style.height = `${Math.max(...columnHeights)}px`;
    
    return layout;
  }

  /**
   * Get item height including content
   */
  getItemHeight(element) {
    // Temporarily make visible to measure
    const originalStyle = {
      position: element.style.position,
      visibility: element.style.visibility,
      display: element.style.display
    };
    
    element.style.position = 'absolute';
    element.style.visibility = 'hidden';
    element.style.display = 'block';
    
    const height = element.offsetHeight;
    
    // Restore original style
    Object.assign(element.style, originalStyle);
    
    return height;
  }

  /**
   * Apply layout positions with animations
   */
  async applyLayout(layout) {
    const promises = layout.map(({ item, x, y, width, height }, index) => {
      return new Promise(resolve => {
        // Stagger animations
        setTimeout(() => {
          item.element.style.transform = `translate(${x}px, ${y}px)`;
          item.element.style.width = `${width}px`;
          item.element.style.opacity = '1';
          item.element.style.transition = `all ${this.options.animationDuration}ms ease`;
          
          // Update item position data
          item.position = { x, y };
          item.height = height;
          
          resolve();
        }, index * 50);
      });
    });
    
    await Promise.all(promises);
  }

  /**
   * Calculate number of columns based on container width
   */
  calculateColumns() {
    const containerWidth = this.container.offsetWidth;
    const minItemWidth = 280;
    const maxColumns = Math.floor(containerWidth / (minItemWidth + this.options.gap));
    
    return Math.min(Math.max(1, maxColumns), 6);
  }

  /**
   * Handle window resize
   */
  async handleResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(async () => {
      await this.render();
    }, 150);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(e) {
    if (!this.isCardFocused()) return;
    
    const currentItem = this.state.filteredItems[this.state.focusedIndex];
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.focusPreviousItem();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.focusNextItem();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.focusLeftItem();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.focusRightItem();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.toggleCardExpansion(currentItem);
        break;
      case 'Escape':
        e.preventDefault();
        this.collapseAllCards();
        break;
      case 'Home':
        e.preventDefault();
        this.focusFirstItem();
        break;
      case 'End':
        e.preventDefault();
        this.focusLastItem();
        break;
    }
  }

  /**
   * Handle card click
   */
  handleCardClick(e) {
    const card = e.target.closest(this.options.itemSelector);
    if (!card) return;
    
    const item = this.state.items.find(item => item.element === card);
    if (!item) return;
    
    // Handle expand/collapse
    if (e.target.classList.contains('expand-btn') || e.target.closest('.expand-btn')) {
      e.preventDefault();
      this.toggleCardExpansion(item);
    }
    
    // Update focus
    this.state.focusedIndex = this.state.filteredItems.indexOf(item);
  }

  /**
   * Toggle card expansion
   */
  async toggleCardExpansion(item) {
    const isExpanded = this.state.expandedCards.has(item.id);
    
    if (isExpanded) {
      await this.collapseCard(item);
    } else {
      await this.expandCard(item);
    }
  }

  /**
   * Expand card
   */
  async expandCard(item) {
    this.state.expandedCards.add(item.id);
    item.expanded = true;
    
    // Add expanded class
    item.element.classList.add('expanded');
    
    // Animate expansion
    await this.animateCardExpansion(item);
    
    // Recalculate layout
    await this.render();
    
    // Announce to screen readers
    this.announceToScreenReader(`Card expanded: ${item.data.title}`);
  }

  /**
   * Collapse card
   */
  async collapseCard(item) {
    this.state.expandedCards.delete(item.id);
    item.expanded = false;
    
    // Remove expanded class
    item.element.classList.remove('expanded');
    
    // Animate collapse
    await this.animateCardCollapse(item);
    
    // Recalculate layout
    await this.render();
    
    // Announce to screen readers
    this.announceToScreenReader(`Card collapsed: ${item.data.title}`);
  }

  /**
   * Animate card expansion
   */
  async animateCardExpansion(item) {
    const element = item.element;
    const expandableContent = element.querySelector('.expandable-content');
    
    if (expandableContent) {
      expandableContent.style.height = '0px';
      expandableContent.style.overflow = 'hidden';
      
      // Get full height
      expandableContent.style.height = 'auto';
      const fullHeight = expandableContent.offsetHeight;
      expandableContent.style.height = '0px';
      
      // Animate to full height
      await this.animateElement(expandableContent, { height: `${fullHeight}px` });
      
      // Clean up
      expandableContent.style.height = 'auto';
      expandableContent.style.overflow = 'visible';
    }
  }

  /**
   * Animate card collapse
   */
  async animateCardCollapse(item) {
    const element = item.element;
    const expandableContent = element.querySelector('.expandable-content');
    
    if (expandableContent) {
      const currentHeight = expandableContent.offsetHeight;
      expandableContent.style.height = `${currentHeight}px`;
      
      // Animate to 0 height
      await this.animateElement(expandableContent, { height: '0px' });
      
      // Clean up
      expandableContent.style.height = '';
      expandableContent.style.overflow = 'hidden';
    }
  }

  /**
   * Collapse all cards
   */
  async collapseAllCards() {
    const expandedItems = this.state.items.filter(item => item.expanded);
    
    await Promise.all(expandedItems.map(item => this.collapseCard(item)));
    
    this.announceToScreenReader('All cards collapsed');
  }

  /**
   * Handle drag start
   */
  handleDragStart(e) {
    const card = e.target.closest(this.options.itemSelector);
    if (!card) return;
    
    this.state.draggedItem = this.state.items.find(item => item.element === card);
    
    // Add dragging class
    card.classList.add('dragging');
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', card.outerHTML);
    
    // Create drag ghost
    this.createDragGhost(card);
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const card = e.target.closest(this.options.itemSelector);
    if (!card || card === this.state.draggedItem?.element) return;
    
    // Find drop target index
    const targetItem = this.state.items.find(item => item.element === card);
    if (targetItem) {
      this.state.dropTargetIndex = this.state.items.indexOf(targetItem);
      
      // Add visual feedback
      card.classList.add('drop-target');
      
      // Remove from other cards
      this.state.items.forEach(item => {
        if (item.element !== card) {
          item.element.classList.remove('drop-target');
        }
      });
    }
  }

  /**
   * Handle drop
   */
  async handleDrop(e) {
    e.preventDefault();
    
    if (!this.state.draggedItem || this.state.dropTargetIndex === null) return;
    
    // Get indices
    const draggedIndex = this.state.items.indexOf(this.state.draggedItem);
    const targetIndex = this.state.dropTargetIndex;
    
    // Reorder items
    this.reorderItems(draggedIndex, targetIndex);
    
    // Clean up
    this.state.draggedItem.element.classList.remove('dragging');
    this.state.items.forEach(item => item.element.classList.remove('drop-target'));
    
    this.state.draggedItem = null;
    this.state.dropTargetIndex = null;
    
    // Re-render
    await this.render();
    
    // Announce to screen readers
    this.announceToScreenReader('Card position updated');
  }

  /**
   * Reorder items array
   */
  reorderItems(fromIndex, toIndex) {
    const item = this.state.items.splice(fromIndex, 1)[0];
    this.state.items.splice(toIndex, 0, item);
    
    // Update filtered items if needed
    this.applyFilters();
  }

  /**
   * Handle search
   */
  handleSearch() {
    const query = this.controls.search.value.toLowerCase().trim();
    this.state.searchQuery = query;
    
    this.applyFilters();
    this.announceToScreenReader(`${this.state.filteredItems.length} cards found`);
  }

  /**
   * Handle filter
   */
  handleFilter() {
    const filterValue = this.controls.filter.value;
    this.state.filters.category = filterValue;
    
    this.applyFilters();
    this.announceToScreenReader(`Filtered to ${this.state.filteredItems.length} cards`);
  }

  /**
   * Apply filters and search
   */
  applyFilters() {
    this.state.filteredItems = this.state.items.filter(item => {
      // Search filter
      if (this.state.searchQuery && !item.data.searchable.includes(this.state.searchQuery)) {
        return false;
      }
      
      // Category filter
      if (this.state.filters.category && item.data.category !== this.state.filters.category) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting
    this.applySorting();
    
    // Re-render
    this.render();
  }

  /**
   * Apply sorting
   */
  applySorting() {
    const sortBy = this.state.sortBy;
    const sortOrder = this.state.sortOrder;
    
    this.state.filteredItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.data.title.toLowerCase();
          bValue = b.data.title.toLowerCase();
          break;
        case 'date':
          aValue = a.data.date;
          bValue = b.data.date;
          break;
        case 'type':
          aValue = a.data.type.toLowerCase();
          bValue = b.data.type.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Set sort order
   */
  setSortOrder(sortBy) {
    this.state.sortBy = sortBy;
    this.applySorting();
    this.render();
  }

  /**
   * Switch view mode
   */
  async switchView(viewType) {
    this.state.currentView = viewType;
    
    // Update button states
    this.controls.viewButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewType);
    });
    
    // Re-render with new view
    await this.render();
    
    // Announce to screen readers
    this.announceToScreenReader(`Switched to ${viewType} view`);
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    this.setTheme(newTheme);
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.options.theme = theme;
    
    // Update theme toggle icon
    const icon = this.controls.themeToggle.querySelector('.icon');
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    
    // Store preference
    localStorage.setItem('masonry-theme', theme);
    
    // Announce to screen readers
    this.announceToScreenReader(`Theme changed to ${theme} mode`);
  }

  /**
   * Focus navigation methods
   */
  focusNextItem() {
    if (this.state.focusedIndex < this.state.filteredItems.length - 1) {
      this.state.focusedIndex++;
      this.focusCurrentItem();
    }
  }

  focusPreviousItem() {
    if (this.state.focusedIndex > 0) {
      this.state.focusedIndex--;
      this.focusCurrentItem();
    }
  }

  focusLeftItem() {
    const columns = this.calculateColumns();
    const newIndex = Math.max(0, this.state.focusedIndex - 1);
    this.state.focusedIndex = newIndex;
    this.focusCurrentItem();
  }

  focusRightItem() {
    const columns = this.calculateColumns();
    const newIndex = Math.min(this.state.filteredItems.length - 1, this.state.focusedIndex + 1);
    this.state.focusedIndex = newIndex;
    this.focusCurrentItem();
  }

  focusFirstItem() {
    this.state.focusedIndex = 0;
    this.focusCurrentItem();
  }

  focusLastItem() {
    this.state.focusedIndex = this.state.filteredItems.length - 1;
    this.focusCurrentItem();
  }

  focusCurrentItem() {
    const item = this.state.filteredItems[this.state.focusedIndex];
    if (item) {
      item.element.focus();
      item.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  /**
   * Check if a card is currently focused
   */
  isCardFocused() {
    const focusedElement = document.activeElement;
    return focusedElement && focusedElement.closest(this.options.itemSelector);
  }

  /**
   * Handle focus in
   */
  handleFocusIn(e) {
    const card = e.target.closest(this.options.itemSelector);
    if (card) {
      const item = this.state.items.find(item => item.element === card);
      if (item) {
        this.state.focusedIndex = this.state.filteredItems.indexOf(item);
        card.classList.add('focused');
      }
    }
  }

  /**
   * Handle focus out
   */
  handleFocusOut(e) {
    const card = e.target.closest(this.options.itemSelector);
    if (card) {
      card.classList.remove('focused');
    }
  }

  /**
   * Enable drag and drop
   */
  enableDragDrop() {
    this.state.items.forEach(item => {
      item.element.setAttribute('draggable', 'true');
      item.element.setAttribute('tabindex', '0');
    });
  }

  /**
   * Create drag ghost
   */
  createDragGhost(element) {
    const ghost = element.cloneNode(true);
    ghost.style.opacity = '0.5';
    ghost.style.transform = 'rotate(5deg)';
    
    // This would be used with custom drag image
    // e.dataTransfer.setDragImage(ghost, 0, 0);
  }

  /**
   * Performance monitoring
   */
  initPerformanceMonitoring() {
    // Monitor render performance
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.name.includes('masonry')) {
          this.state.performanceMetrics.renderTime = entry.duration;
        }
      });
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(startTime) {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    this.state.performanceMetrics.renderTime = renderTime;
    this.state.performanceMetrics.lastUpdate = Date.now();
    this.state.performanceMetrics.updateCount++;
    
    // Performance mark
    performance.mark('masonry-render-end');
    performance.measure('masonry-render', 'masonry-render-start', 'masonry-render-end');
    
    // Log performance if needed
    if (renderTime > 100) {
      console.warn(`Slow render detected: ${renderTime}ms`);
    }
  }

  /**
   * Setup intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const card = entry.target;
            card.classList.add('visible');
            
            // Load images if needed
            const images = card.querySelectorAll('img[data-src]');
            images.forEach(img => {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            });
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
    
    // Observe all cards
    this.state.items.forEach(item => {
      this.intersectionObserver.observe(item.element);
    });
  }

  /**
   * Utility methods
   */
  
  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Animate element
   */
  animateElement(element, properties) {
    return new Promise(resolve => {
      const animation = element.animate(properties, {
        duration: this.options.animationDuration,
        easing: 'ease-out',
        fill: 'forwards'
      });
      
      animation.onfinish = resolve;
    });
  }

  /**
   * Announce to screen reader
   */
  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    this.container.classList.add('loading');
    
    // Add skeleton items
    for (let i = 0; i < 6; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'masonry-item skeleton';
      skeleton.innerHTML = `
        <div class="skeleton-header"></div>
        <div class="skeleton-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      `;
      this.container.appendChild(skeleton);
    }
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    this.container.classList.remove('loading');
    
    // Remove skeleton items
    const skeletons = this.container.querySelectorAll('.skeleton');
    skeletons.forEach(skeleton => skeleton.remove());
  }

  /**
   * Clear layout
   */
  clearLayout() {
    this.state.items.forEach(item => {
      item.element.style.transform = '';
      item.element.style.width = '';
      item.element.style.opacity = '0';
    });
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('MasonryController error:', error);
    
    // Show error message to user
    this.showErrorMessage('An error occurred while loading the layout. Please refresh the page.');
    
    // Report error if analytics available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');
    
    this.container.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /**
   * Add new card
   */
  addCard(cardData) {
    const cardElement = this.createCardElement(cardData);
    this.container.appendChild(cardElement);
    
    const item = {
      id: cardData.id || `card-${Date.now()}`,
      element: cardElement,
      data: cardData,
      visible: true,
      height: 0,
      position: { x: 0, y: 0 },
      expanded: false
    };
    
    this.state.items.push(item);
    this.setupDataBinding(item);
    this.applyFilters();
    
    // Announce to screen readers
    this.announceToScreenReader(`New card added: ${cardData.title}`);
  }

  /**
   * Remove card
   */
  removeCard(cardId) {
    const itemIndex = this.state.items.findIndex(item => item.id === cardId);
    if (itemIndex === -1) return;
    
    const item = this.state.items[itemIndex];
    
    // Clean up
    const observer = this.state.dataBinding.get(cardId);
    if (observer) {
      observer.disconnect();
      this.state.dataBinding.delete(cardId);
    }
    
    // Remove from DOM
    item.element.remove();
    
    // Remove from state
    this.state.items.splice(itemIndex, 1);
    this.state.expandedCards.delete(cardId);
    
    // Update filtered items
    this.applyFilters();
    
    // Announce to screen readers
    this.announceToScreenReader(`Card removed: ${item.data.title}`);
  }

  /**
   * Update card
   */
  updateCard(cardId, newData) {
    const item = this.state.items.find(item => item.id === cardId);
    if (!item) return;
    
    // Update data
    Object.assign(item.data, newData);
    
    // Update DOM
    this.updateCardElement(item.element, newData);
    
    // Re-apply filters
    this.applyFilters();
    
    // Announce to screen readers
    this.announceToScreenReader(`Card updated: ${item.data.title}`);
  }

  /**
   * Create card element
   */
  createCardElement(cardData) {
    const card = document.createElement('div');
    card.className = 'masonry-item';
    card.setAttribute('data-id', cardData.id);
    card.setAttribute('data-category', cardData.category || '');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'article');
    
    card.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${cardData.title}</h3>
        <button class="expand-btn" aria-label="Expand card">⌄</button>
      </div>
      <div class="card-content">
        <p class="card-description">${cardData.description}</p>
        <div class="expandable-content" style="height: 0; overflow: hidden;">
          ${cardData.expandedContent || ''}
        </div>
      </div>
      <div class="card-actions">
        ${cardData.actions || ''}
      </div>
    `;
    
    return card;
  }

  /**
   * Update card element
   */
  updateCardElement(element, newData) {
    if (newData.title) {
      const titleElement = element.querySelector('.card-title');
      if (titleElement) titleElement.textContent = newData.title;
    }
    
    if (newData.description) {
      const descElement = element.querySelector('.card-description');
      if (descElement) descElement.textContent = newData.description;
    }
    
    if (newData.category) {
      element.setAttribute('data-category', newData.category);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.state.performanceMetrics };
  }

  /**
   * Destroy controller
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('resize', this.handlers.resize);
    document.removeEventListener('keydown', this.handlers.keydown);
    
    // Disconnect observers
    this.state.dataBinding.forEach(observer => observer.disconnect());
    this.state.dataBinding.clear();
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    // Clear state
    this.state.items = [];
    this.state.filteredItems = [];
    this.state.expandedCards.clear();
    
    console.log('MasonryController destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MasonryController;
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.masonry-container')) {
      window.masonryController = new MasonryController();
    }
  });
} else {
  if (document.querySelector('.masonry-container')) {
    window.masonryController = new MasonryController();
  }
}