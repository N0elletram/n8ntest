/**
 * AI Avatar Extension Popup Controller
 * Coordinates UI interactions, content analysis, and AI conversations
 */

class PopupController {
  constructor() {
    this.avatar = null;
    this.currentPageContent = null;
    this.isAnalyzing = false;
    this.isConversing = false;
    this.settings = {};
    
    // Streaming state
    this.currentStreamId = null;
    this.currentStreamMessage = null;
    this.abortController = null;
    
    this.init();
  }

  /**
   * Validate string input according to safety requirements
   */
  validateString(input, maxLength = 500, minLength = 1) {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // Trim the input
    const trimmed = input.trim();
    
    // Check length
    if (trimmed.length < minLength) {
      throw new Error(`Input must be at least ${minLength} characters`);
    }
    
    if (trimmed.length > maxLength) {
      throw new Error(`Input must not exceed ${maxLength} characters`);
    }
    
    return trimmed;
  }

  /**
   * Validate API key format
   */
  validateApiKey(apiKey) {
    const trimmed = this.validateString(apiKey, 100, 10);
    
    // Check if it starts with sk- (OpenAI format)
    if (!trimmed.startsWith('sk-')) {
      throw new Error('API key must start with "sk-"');
    }
    
    // Check for valid characters (alphanumeric and hyphens)
    if (!/^sk-[a-zA-Z0-9-]+$/.test(trimmed)) {
      throw new Error('API key contains invalid characters');
    }
    
    return trimmed;
  }

  /**
   * Initialize the popup
   */
  async init() {
    try {
      // Check if onboarding should be shown
      const shouldShowOnboarding = await OnboardingWizard.shouldShow();
      
      if (shouldShowOnboarding) {
        // Show onboarding wizard
        const wizard = new OnboardingWizard();
        wizard.show(
          // onComplete callback
          async () => {
            await this.initializeExtension();
            // Check if there's a sample question to use
            const { sampleQuestion } = await chrome.storage.local.get('sampleQuestion');
            if (sampleQuestion) {
              document.getElementById('messageInput').value = sampleQuestion;
              chrome.storage.local.remove('sampleQuestion');
              // Enable send button
              document.getElementById('sendButton').disabled = false;
            }
          },
          // onSkip callback
          async () => {
            await this.initializeExtension();
          }
        );
      } else {
        // Normal initialization
        await this.initializeExtension();
      }
      
    } catch (error) {
      console.error('Popup initialization failed:', error);
      this.showError('Failed to initialize extension');
    }
  }

  /**
   * Initialize the extension (called after onboarding check)
   */
  async initializeExtension() {
    // Initialize 3D avatar
    this.avatar = new AvatarRenderer('avatarCanvas');
    
    // Load settings
    await this.loadSettings();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load and display rate limit stats
    await this.updateRateLimitDisplay();
    
    // Auto-analyze current page if enabled
    if (this.settings.autoAnalyze) {
      await this.analyzeCurrentPage();
    }
    
    // Show welcome state
    this.updateStatus('Ready');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Message input handling
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const charCount = document.getElementById('charCount');

    messageInput.addEventListener('input', (e) => {
      const length = e.target.value.length;
      charCount.textContent = `${length}/500`;
      sendButton.disabled = length === 0 || this.isConversing;
    });

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    sendButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    // Prevent form submission
    document.querySelector('.input-area').addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    // Abort button
    const abortButton = document.getElementById('abortButton');
    abortButton.addEventListener('click', () => this.abortStream());

    // Quick action buttons
    document.querySelectorAll('.quick-action').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleQuickAction(action);
      });
    });

    // Refresh content button
    document.getElementById('refreshContent').addEventListener('click', () => {
      this.analyzeCurrentPage();
    });

    // Settings panel
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettings();
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
      this.hideSettings();
    });

    document.getElementById('saveSettings').addEventListener('click', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
    
    // Prevent settings form submission
    document.querySelector('.settings-content').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // Clear conversation
    document.getElementById('clearConversation').addEventListener('click', () => {
      this.clearConversation();
    });
    
    // Refresh rate limit stats
    document.getElementById('refreshRateLimit').addEventListener('click', () => {
      this.updateRateLimitDisplay();
    });
    
    // Revisit onboarding tour
    document.getElementById('revisitOnboarding').addEventListener('click', () => {
      this.showOnboardingTour();
    });

    // Handle window resize for avatar
    window.addEventListener('resize', () => {
      if (this.avatar) {
        this.avatar.handleResize();
      }
    });

    // Setup keyboard navigation
    this.setupKeyboardNavigation();
  }

  /**
   * Setup comprehensive keyboard navigation
   */
  setupKeyboardNavigation() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Check if we're in an input field
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      
      // Cmd/Ctrl + Enter to send message (works anywhere)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const messageInput = document.getElementById('messageInput');
        if (messageInput.value.trim()) {
          this.sendMessage();
        }
      }
      
      // Escape key handling
      if (e.key === 'Escape') {
        // Close modals in order of priority
        if (this.isHelpMenuOpen) {
          e.preventDefault();
          this.hideKeyboardHelp();
        } else if (document.getElementById('settingsPanel').classList.contains('active')) {
          e.preventDefault();
          this.hideSettings();
        } else if (this.currentStreamId) {
          e.preventDefault();
          this.abortStream();
        }
      }
      
      // Show keyboard shortcuts help (Cmd/Ctrl + /)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        this.showKeyboardHelp();
      }
      
      // Quick actions shortcuts (Alt + number)
      if (e.altKey && !isInputFocused) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            this.handleQuickAction('summarize');
            break;
          case '2':
            e.preventDefault();
            this.handleQuickAction('explain');
            break;
          case '3':
            e.preventDefault();
            this.handleQuickAction('questions');
            break;
        }
      }
      
      // Navigation shortcuts when not in input
      if (!isInputFocused) {
        switch(e.key) {
          case 's':
            if (!e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              this.showSettings();
            }
            break;
          case 'r':
            if (!e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              this.analyzeCurrentPage();
            }
            break;
          case 'c':
            if (!e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              if (confirm('Clear conversation history?')) {
                this.clearConversation();
              }
            }
            break;
          case 'i':
            if (!e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              document.getElementById('messageInput').focus();
            }
            break;
        }
      }
    });

    // Tab navigation between sections
    this.setupTabNavigation();

    // Arrow key navigation within sections
    this.setupArrowKeyNavigation();

    // Focus trap for modals
    this.setupModalFocusTraps();

    // Focus management for dynamic elements
    this.setupDynamicFocusManagement();
  }

  /**
   * Setup tab navigation between major sections
   */
  setupTabNavigation() {
    // Define navigable sections
    const sections = [
      { id: 'avatarContainer', selector: '#avatarCanvas' },
      { id: 'contentSummary', selector: '#refreshContent' },
      { id: 'conversationHistory', selector: '#conversationHistory' },
      { id: 'quickActions', selector: '.quick-action:first-child' },
      { id: 'messageInput', selector: '#messageInput' },
      { id: 'toolbar', selector: '#settingsBtn' }
    ];

    // Add section navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && e.altKey) {
        e.preventDefault();
        const currentSection = this.getCurrentSection();
        const nextSection = this.getNextSection(currentSection, sections, !e.shiftKey);
        if (nextSection) {
          const element = document.querySelector(nextSection.selector);
          if (element) {
            element.focus();
            this.announceSection(nextSection.id);
          }
        }
      }
    });
  }

  /**
   * Get current section based on focused element
   */
  getCurrentSection() {
    const focused = document.activeElement;
    if (!focused) return null;

    if (focused.closest('#avatarContainer')) return 'avatarContainer';
    if (focused.closest('#contentSummary')) return 'contentSummary';
    if (focused.closest('#conversationHistory')) return 'conversationHistory';
    if (focused.closest('.quick-actions')) return 'quickActions';
    if (focused.closest('.input-area')) return 'messageInput';
    if (focused.closest('.toolbar')) return 'toolbar';

    return null;
  }

  /**
   * Get next section in navigation order
   */
  getNextSection(current, sections, forward = true) {
    const currentIndex = sections.findIndex(s => s.id === current);
    if (currentIndex === -1) return sections[0];

    const nextIndex = forward 
      ? (currentIndex + 1) % sections.length
      : (currentIndex - 1 + sections.length) % sections.length;

    return sections[nextIndex];
  }

  /**
   * Setup arrow key navigation within sections
   */
  setupArrowKeyNavigation() {
    // Conversation history navigation
    document.getElementById('conversationHistory').addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const messages = Array.from(e.currentTarget.querySelectorAll('.user-message, .avatar-message'));
        const currentIndex = messages.findIndex(m => m === document.activeElement);
        
        let nextIndex;
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : messages.length - 1;
        } else {
          nextIndex = currentIndex < messages.length - 1 ? currentIndex + 1 : 0;
        }
        
        if (messages[nextIndex]) {
          messages[nextIndex].setAttribute('tabindex', '0');
          messages[nextIndex].focus();
          messages[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });

    // Quick actions navigation
    const quickActionsContainer = document.querySelector('.quick-actions');
    if (quickActionsContainer) {
      quickActionsContainer.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const buttons = Array.from(quickActionsContainer.querySelectorAll('.quick-action'));
          const currentIndex = buttons.findIndex(b => b === document.activeElement);
          
          let nextIndex;
          if (e.key === 'ArrowLeft') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
          } else {
            nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
          }
          
          if (buttons[nextIndex]) {
            buttons[nextIndex].focus();
          }
        }
      });
    }

    // Settings form navigation
    document.getElementById('settingsPanel').addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown'].includes(e.key) && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const focusable = Array.from(e.currentTarget.querySelectorAll(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        ));
        const currentIndex = focusable.findIndex(el => el === document.activeElement);
        
        let nextIndex;
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
        } else {
          nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0;
        }
        
        if (focusable[nextIndex]) {
          focusable[nextIndex].focus();
        }
      }
    });
  }

  /**
   * Setup focus traps for modal dialogs
   */
  setupModalFocusTraps() {
    // Settings panel focus trap
    const settingsPanel = document.getElementById('settingsPanel');
    
    settingsPanel.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = this.getFocusableElements(settingsPanel);
        if (focusable.length === 0) return;
        
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    });

    // Help menu focus trap (will be created)
    // Similar implementation for help menu when it's added
  }

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null); // Filter out hidden elements
  }

  /**
   * Setup focus management for dynamic elements
   */
  setupDynamicFocusManagement() {
    // Store last focused element before showing modals
    this.lastFocusedElement = null;

    // Override show/hide methods to manage focus
    const originalShowSettings = this.showSettings.bind(this);
    this.showSettings = () => {
      this.lastFocusedElement = document.activeElement;
      originalShowSettings();
      
      // Focus first focusable element in settings
      setTimeout(() => {
        const firstFocusable = this.getFocusableElements(
          document.getElementById('settingsPanel')
        )[0];
        if (firstFocusable) firstFocusable.focus();
      }, 100);
    };

    const originalHideSettings = this.hideSettings.bind(this);
    this.hideSettings = () => {
      originalHideSettings();
      
      // Restore focus to last focused element
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
    };

    // Focus management for new messages
    const originalAddMessage = this.addMessageToConversation.bind(this);
    this.addMessageToConversation = (message, sender) => {
      originalAddMessage(message, sender);
      
      // Announce new message to screen readers
      this.announceMessage(message, sender);
    };
  }

  /**
   * Show keyboard shortcuts help menu
   */
  showKeyboardHelp() {
    this.isHelpMenuOpen = true;
    
    const helpContent = `
      <div class="keyboard-help-overlay" role="dialog" aria-labelledby="keyboardHelpTitle" aria-modal="true">
        <div class="keyboard-help-content">
          <h2 id="keyboardHelpTitle">Keyboard Shortcuts</h2>
          
          <div class="shortcuts-section">
            <h3>Global Shortcuts</h3>
            <dl class="shortcuts-list">
              <div class="shortcut-item">
                <dt><kbd>Cmd/Ctrl</kbd> + <kbd>Enter</kbd></dt>
                <dd>Send message</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>Cmd/Ctrl</kbd> + <kbd>/</kbd></dt>
                <dd>Show this help menu</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>Esc</kbd></dt>
                <dd>Close dialogs / Abort streaming</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>Alt</kbd> + <kbd>Tab</kbd></dt>
                <dd>Navigate between sections</dd>
              </div>
            </dl>
          </div>
          
          <div class="shortcuts-section">
            <h3>Quick Actions</h3>
            <dl class="shortcuts-list">
              <div class="shortcut-item">
                <dt><kbd>Alt</kbd> + <kbd>1</kbd></dt>
                <dd>Summarize page</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>Alt</kbd> + <kbd>2</kbd></dt>
                <dd>Explain concepts</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>Alt</kbd> + <kbd>3</kbd></dt>
                <dd>Key takeaways</dd>
              </div>
            </dl>
          </div>
          
          <div class="shortcuts-section">
            <h3>Navigation</h3>
            <dl class="shortcuts-list">
              <div class="shortcut-item">
                <dt><kbd>i</kbd></dt>
                <dd>Focus message input</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>s</kbd></dt>
                <dd>Open settings</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>r</kbd></dt>
                <dd>Refresh page analysis</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>c</kbd></dt>
                <dd>Clear conversation</dd>
              </div>
              <div class="shortcut-item">
                <dt><kbd>Arrow Keys</kbd></dt>
                <dd>Navigate within sections</dd>
              </div>
            </dl>
          </div>
          
          <button class="close-help-btn" id="closeHelpBtn">Close</button>
        </div>
      </div>
    `;
    
    // Create and append help overlay
    const helpDiv = document.createElement('div');
    helpDiv.innerHTML = helpContent;
    document.body.appendChild(helpDiv);
    
    // Focus first element
    document.getElementById('closeHelpBtn').focus();
    
    // Setup event listeners
    document.getElementById('closeHelpBtn').addEventListener('click', () => {
      this.hideKeyboardHelp();
    });
    
    // Click outside to close
    document.querySelector('.keyboard-help-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('keyboard-help-overlay')) {
        this.hideKeyboardHelp();
      }
    });
    
    // Focus trap
    const overlay = document.querySelector('.keyboard-help-overlay');
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = this.getFocusableElements(overlay);
        if (focusable.length === 0) return;
        
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    });
  }

  /**
   * Hide keyboard shortcuts help menu
   */
  hideKeyboardHelp() {
    this.isHelpMenuOpen = false;
    const overlay = document.querySelector('.keyboard-help-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Restore focus
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    } else {
      document.getElementById('messageInput').focus();
    }
  }

  /**
   * Announce section to screen readers
   */
  announceSection(sectionId) {
    const announcements = {
      avatarContainer: 'Avatar display section',
      contentSummary: 'Page analysis section',
      conversationHistory: 'Conversation history',
      quickActions: 'Quick action buttons',
      messageInput: 'Message input area',
      toolbar: 'Toolbar actions'
    };
    
    const announcement = announcements[sectionId] || 'Unknown section';
    this.announce(announcement);
  }

  /**
   * Announce message to screen readers
   */
  announceMessage(message, sender) {
    const prefix = sender === 'user' ? 'You said: ' : 'AI assistant says: ';
    this.announce(prefix + message);
  }

  /**
   * Announce text to screen readers
   */
  announce(text) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'visually-hidden';
    announcement.textContent = text;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const response = await this.sendMessageToBackground('getSettings');
      if (response.success) {
        this.settings = response.settings;
        this.updateSettingsUI();
      }
      
      // Load rate limit settings
      const rateLimitResponse = await this.sendMessageToBackground('getRateLimitStats');
      if (rateLimitResponse.success && rateLimitResponse.stats) {
        this.rateLimits = rateLimitResponse.stats.daily.limits;
        this.updateRateLimitSettingsUI();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {
        hasApiKey: false,
        avatarPersonality: 'helpful',
        responseLength: 'medium',
        autoAnalyze: true
      };
    }
  }

  /**
   * Update settings UI
   */
  updateSettingsUI() {
    const personalitySelect = document.getElementById('personalitySelect');
    const autoAnalyzeCheckbox = document.getElementById('autoAnalyze');
    const streamingCheckbox = document.getElementById('enableStreaming');
    const apiKeyInput = document.getElementById('apiKeyInput');

    if (personalitySelect) {
      personalitySelect.value = this.settings.avatarPersonality || 'helpful';
    }

    if (autoAnalyzeCheckbox) {
      autoAnalyzeCheckbox.checked = this.settings.autoAnalyze !== false;
    }
    
    if (streamingCheckbox) {
      streamingCheckbox.checked = this.settings.enableStreaming !== false;
    }
    
    if (apiKeyInput && this.settings.hasApiKey) {
      // Show a placeholder indicating key is saved
      apiKeyInput.placeholder = 'sk-...******** (key is saved)';
      apiKeyInput.value = '';
    }
  }
  
  /**
   * Update rate limit settings UI
   */
  updateRateLimitSettingsUI() {
    if (this.rateLimits) {
      const tokenLimitInput = document.getElementById('dailyTokenLimit');
      const costLimitInput = document.getElementById('dailyCostLimit');
      
      if (tokenLimitInput) {
        tokenLimitInput.value = this.rateLimits.tokens || 100000;
      }
      
      if (costLimitInput) {
        costLimitInput.value = this.rateLimits.cost || 10.00;
      }
    }
  }

  /**
   * Analyze current page content
   */
  async analyzeCurrentPage() {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.updateStatus('Analyzing page...');
    this.showLoadingState();

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }
      
      // Check if we can inject content scripts into this tab
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot analyze browser internal pages');
      }
      
      // Extract content from page with timeout
      const response = await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Content extraction timed out')), 5000)
        )
      ]);

      if (response && response.success && response.content) {
        this.currentPageContent = response.content;
        this.displayContentSummary(response.content);
        this.updateWordCount(response.content.wordCount || 0);
        this.updateStatus('Content analyzed');
        
        // Greet user if this is first analysis
        if (this.avatar) {
          this.avatar.greet();
        }
      } else {
        throw new Error(response?.error || 'Failed to extract content');
      }

    } catch (error) {
      console.error('Content analysis failed:', error);
      
      // Provide user-friendly error messages
      let userMessage = 'Unable to analyze this page. ';
      if (error.message.includes('browser internal')) {
        userMessage += 'Browser internal pages cannot be analyzed.';
      } else if (error.message.includes('timed out')) {
        userMessage += 'The page took too long to respond. Try refreshing the page.';
      } else {
        userMessage += 'Please refresh the page and try again.';
      }
      
      this.showError(userMessage);
      this.updateStatus('Analysis failed');
      
      // Show empty content summary
      const summaryContent = document.getElementById('summaryContent');
      summaryContent.innerHTML = '<div class="error-state">Unable to analyze page content</div>';
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Display content summary
   */
  displayContentSummary(content) {
    const summaryContent = document.getElementById('summaryContent');
    
    const summary = `
      <div class="content-info">
        <div class="info-item">
          <strong>Title:</strong> ${content.title}
        </div>
        <div class="info-item">
          <strong>Type:</strong> ${this.formatContentType(content.contentType)}
        </div>
        <div class="info-item">
          <strong>Words:</strong> ${content.wordCount.toLocaleString()}
        </div>
        <div class="info-item">
          <strong>Language:</strong> ${content.metadata.language || 'Unknown'}
        </div>
      </div>
    `;
    
    summaryContent.innerHTML = summary;
  }

  /**
   * Format content type for display
   */
  formatContentType(type) {
    const types = {
      'blog_post': 'Blog Post',
      'news_article': 'News Article',
      'documentation': 'Documentation',
      'tutorial': 'Tutorial',
      'code_repository': 'Code Repository',
      'technical_qa': 'Technical Q&A',
      'encyclopedia': 'Encyclopedia',
      'general_content': 'General Content'
    };
    
    return types[type] || 'Unknown';
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Analyzing page content...</span>
      </div>
    `;
  }

  /**
   * Send message to AI
   */
  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    
    try {
      const message = this.validateString(messageInput.value);
      
      if (this.isConversing) return;

      // Check if API key is configured
      if (!this.settings.hasApiKey) {
        this.showError('Please configure your OpenAI API key in settings');
        this.showSettings();
        return;
      }

      // Clear input and disable send button
      messageInput.value = '';
      document.getElementById('charCount').textContent = '0/500';
      document.getElementById('sendButton').disabled = true;
      
      // Add user message to conversation
      this.addMessageToConversation(message, 'user');
      
      // Show thinking state
      this.isConversing = true;
      this.showThinkingState();
      
      try {
        // Check if streaming is enabled
        if (this.settings.enableStreaming !== false) {
          await this.sendStreamingMessage(message);
        } else {
          // Non-streaming mode (backward compatible)
          const response = await this.sendMessageToBackground('generateResponse', {
            message: message,
            pageContent: this.currentPageContent
          });

          if (response.success) {
            this.addMessageToConversation(response.response, 'assistant');
            this.updateStatus('Response received');
            
            // Update rate limit display after successful response
            await this.updateRateLimitDisplay();
          } else {
            // Handle rate limit errors specially
            if (response.rateLimitError) {
              this.handleRateLimitError(response);
            } else {
              throw new Error(response.error || 'Failed to generate response');
            }
          }
        }

      } catch (error) {
        console.error('AI conversation failed:', error);
        this.addMessageToConversation(
          'Sorry, I encountered an error while processing your message. Please try again.',
          'assistant'
        );
        this.showError('Failed to get AI response');
      } finally {
        this.isConversing = false;
        this.hideThinkingState();
        this.hideStreamingState();
        document.getElementById('sendButton').disabled = false;
        document.getElementById('abortButton').style.display = 'none';
        messageInput.focus();
      }
    } catch (validationError) {
      // Handle validation errors
      this.showError(validationError.message);
      return;
    }
  }

  /**
   * Send streaming message
   */
  async sendStreamingMessage(message) {
    // Generate a unique stream ID
    this.currentStreamId = Date.now().toString();
    
    // Create abort controller
    this.abortController = new AbortController();
    
    // Show abort button
    document.getElementById('sendButton').style.display = 'none';
    document.getElementById('abortButton').style.display = 'flex';
    
    // Create a placeholder message element
    const messageElement = this.addStreamingMessage();
    this.currentStreamMessage = messageElement;
    
    // Setup message listener for streaming chunks
    const messageListener = (request) => {
      if (request.streamId !== this.currentStreamId) return;
      
      switch (request.action) {
        case 'streamChunk':
          this.handleStreamChunk(request.chunk, messageElement);
          break;
          
        case 'streamComplete':
          this.handleStreamComplete(request.result, messageElement);
          chrome.runtime.onMessage.removeListener(messageListener);
          break;
          
        case 'streamError':
          this.handleStreamError(request.error, messageElement);
          chrome.runtime.onMessage.removeListener(messageListener);
          break;
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Start streaming
    const response = await this.sendMessageToBackground('generateResponseStream', {
      message: message,
      pageContent: this.currentPageContent,
      streamId: this.currentStreamId
    });
    
    if (!response.success && !response.streaming) {
      chrome.runtime.onMessage.removeListener(messageListener);
      
      // Handle immediate errors
      if (response.rateLimitError) {
        this.handleRateLimitError(response);
        messageElement.remove();
      } else {
        this.handleStreamError(new Error(response.error || 'Failed to start streaming'), messageElement);
      }
    }
  }
  
  /**
   * Add a streaming message placeholder
   */
  addStreamingMessage() {
    const conversationHistory = document.getElementById('conversationHistory');
    
    const messageElement = document.createElement('div');
    messageElement.className = 'avatar-message streaming-message';
    messageElement.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content streaming">
        <p></p>
      </div>
    `;
    
    conversationHistory.appendChild(messageElement);
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
    
    return messageElement;
  }
  
  /**
   * Handle streaming chunk
   */
  handleStreamChunk(chunk, messageElement) {
    this.hideThinkingState();
    this.showStreamingState();
    
    if (this.avatar) {
      this.avatar.setSpeaking(true);
    }
    
    const contentElement = messageElement.querySelector('.message-content p');
    contentElement.textContent = chunk.accumulated || chunk.content;
    
    // Scroll to bottom
    const conversationHistory = document.getElementById('conversationHistory');
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
  }
  
  /**
   * Handle stream completion
   */
  handleStreamComplete(result, messageElement) {
    // Remove streaming class
    messageElement.querySelector('.message-content').classList.remove('streaming');
    messageElement.classList.remove('streaming-message');
    
    // Update final content with formatting
    const contentElement = messageElement.querySelector('.message-content p');
    contentElement.innerHTML = this.formatMessage(result.response);
    
    this.updateStatus('Response received');
    
    // Update rate limit display
    this.updateRateLimitDisplay();
    
    // Reset streaming state
    this.currentStreamId = null;
    this.currentStreamMessage = null;
    this.abortController = null;
  }
  
  /**
   * Handle stream error
   */
  handleStreamError(error, messageElement) {
    console.error('Stream error:', error);
    
    // Update message with error
    const contentElement = messageElement.querySelector('.message-content');
    contentElement.classList.remove('streaming');
    contentElement.innerHTML = `<p style="color: #e53e3e;">Sorry, I encountered an error while processing your message. ${error.message}</p>`;
    
    this.showError('Stream error occurred');
    
    // Reset streaming state
    this.currentStreamId = null;
    this.currentStreamMessage = null;
    this.abortController = null;
  }
  
  /**
   * Abort current stream
   */
  async abortStream() {
    if (!this.currentStreamId) return;
    
    // Send abort message to background
    await this.sendMessageToBackground('abortStream', {
      streamId: this.currentStreamId
    });
    
    // Update UI
    if (this.currentStreamMessage) {
      const contentElement = this.currentStreamMessage.querySelector('.message-content');
      contentElement.classList.remove('streaming');
      const currentText = contentElement.querySelector('p').textContent;
      contentElement.innerHTML = `<p>${this.formatMessage(currentText)} <em style="color: #718096;">(Response aborted)</em></p>`;
    }
    
    // Reset state
    this.currentStreamId = null;
    this.currentStreamMessage = null;
    this.abortController = null;
    
    // Update UI state
    this.hideStreamingState();
    this.updateStatus('Response aborted');
  }
  
  /**
   * Show streaming state
   */
  showStreamingState() {
    document.getElementById('streamingIndicator').classList.add('active');
    if (this.avatar) {
      this.avatar.setSpeaking(true);
    }
  }
  
  /**
   * Hide streaming state
   */
  hideStreamingState() {
    document.getElementById('streamingIndicator').classList.remove('active');
    document.getElementById('sendButton').style.display = 'flex';
    document.getElementById('abortButton').style.display = 'none';
    if (this.avatar) {
      this.avatar.setSpeaking(false);
    }
  }

  /**
   * Handle quick action buttons
   */
  async handleQuickAction(action) {
    const actions = {
      'summarize': 'Please provide a concise summary of this page.',
      'explain': 'Can you explain the main concepts covered on this page?',
      'questions': 'What are the key points and main takeaways from this content?'
    };

    const message = actions[action];
    if (message) {
      document.getElementById('messageInput').value = message;
      await this.sendMessage();
    }
  }

  /**
   * Add message to conversation display
   */
  addMessageToConversation(message, sender) {
    const conversationHistory = document.getElementById('conversationHistory');
    
    const messageElement = document.createElement('div');
    messageElement.className = sender === 'user' ? 'user-message' : 'avatar-message';
    
    const avatar = sender === 'user' ? '👤' : '🤖';
    
    messageElement.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <p>${this.formatMessage(message)}</p>
      </div>
    `;
    
    conversationHistory.appendChild(messageElement);
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
  }

  /**
   * Format message content safely
   */
  formatMessage(message) {
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    // Safely escape the message first
    const escaped = escapeHtml(message);
    
    // Then apply markdown-like formatting
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Show thinking state
   */
  showThinkingState() {
    document.getElementById('thinkingIndicator').classList.add('active');
    if (this.avatar) {
      this.avatar.setThinking(true);
    }
  }

  /**
   * Hide thinking state
   */
  hideThinkingState() {
    document.getElementById('thinkingIndicator').classList.remove('active');
    if (this.avatar) {
      this.avatar.setThinking(false);
    }
  }

  /**
   * Clear conversation
   */
  async clearConversation() {
    const conversationHistory = document.getElementById('conversationHistory');
    conversationHistory.innerHTML = `
      <div class="welcome-message">
        <div class="avatar-message">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <p>Hi! I'm your AI avatar assistant. I've analyzed this webpage and I'm ready to discuss its content with you. What would you like to know?</p>
          </div>
        </div>
      </div>
    `;

    // Clear conversation in background
    await this.sendMessageToBackground('clearConversation');
    
    if (this.avatar) {
      this.avatar.greet();
    }
  }

  /**
   * Show settings panel
   */
  showSettings() {
    document.getElementById('settingsPanel').classList.add('active');
  }

  /**
   * Hide settings panel
   */
  hideSettings() {
    document.getElementById('settingsPanel').classList.remove('active');
  }

  /**
   * Show onboarding tour
   */
  showOnboardingTour() {
    // Hide settings panel first
    this.hideSettings();
    
    // Reset onboarding state and show tour
    OnboardingWizard.reset();
    
    const wizard = new OnboardingWizard();
    wizard.show(
      // onComplete callback
      async () => {
        // Check if there's a sample question to use
        const { sampleQuestion } = await chrome.storage.local.get('sampleQuestion');
        if (sampleQuestion) {
          document.getElementById('messageInput').value = sampleQuestion;
          chrome.storage.local.remove('sampleQuestion');
          // Enable send button
          document.getElementById('sendButton').disabled = false;
        }
      },
      // onSkip callback
      () => {
        // Just close the wizard
      }
    );
  }

  /**
   * Save settings
   */
  async saveSettings() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const personality = document.getElementById('personalitySelect').value;
    const autoAnalyze = document.getElementById('autoAnalyze').checked;
    const enableStreaming = document.getElementById('enableStreaming').checked;
    const dailyTokenLimit = document.getElementById('dailyTokenLimit').value;
    const dailyCostLimit = document.getElementById('dailyCostLimit').value;

    try {
      let validatedApiKey = null;
      
      if (apiKeyInput.value.trim()) {
        try {
          validatedApiKey = this.validateApiKey(apiKeyInput.value);
        } catch (error) {
          this.showError(`Invalid API key: ${error.message}`);
          return;
        }
        
        await this.sendMessageToBackground('saveApiKey', { apiKey: validatedApiKey });
      }

      // Save other settings to storage
      await chrome.storage.sync.set({
        avatarPersonality: personality,
        autoAnalyze: autoAnalyze,
        enableStreaming: enableStreaming
      });
      
      // Update rate limits if changed
      if (dailyTokenLimit || dailyCostLimit) {
        const newLimits = {
          daily: {}
        };
        
        if (dailyTokenLimit) {
          newLimits.daily.tokens = parseInt(dailyTokenLimit);
        }
        
        if (dailyCostLimit) {
          newLimits.daily.cost = parseFloat(dailyCostLimit);
        }
        
        await this.sendMessageToBackground('updateRateLimits', { limits: newLimits });
      }

      this.settings = {
        ...this.settings,
        hasApiKey: !!validatedApiKey,
        avatarPersonality: personality,
        autoAnalyze: autoAnalyze,
        enableStreaming: enableStreaming
      };

      this.hideSettings();
      this.updateStatus('Settings saved');
      
      // Refresh rate limit display
      await this.updateRateLimitDisplay();

    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showError('Failed to save settings');
    }
  }

  /**
   * Update status indicator
   */
  updateStatus(status) {
    document.getElementById('statusIndicator').querySelector('.status-text').textContent = status;
  }

  /**
   * Update word count display
   */
  updateWordCount(count) {
    document.getElementById('wordCount').textContent = `${count.toLocaleString()} words analyzed`;
  }

  /**
   * Show error message
   */
  showError(message) {
    // Simple error display - could be enhanced with a proper notification system
    console.error(message);
    this.updateStatus('Error');
  }

  /**
   * Update rate limit display
   */
  async updateRateLimitDisplay() {
    try {
      const response = await this.sendMessageToBackground('getRateLimitStats');
      
      if (response.success && response.stats) {
        const daily = response.stats.daily;
        
        // Update token usage
        const tokenPercent = daily.percentages.tokens || 0;
        document.getElementById('tokenProgress').style.width = `${Math.min(tokenPercent, 100)}%`;
        document.getElementById('tokenUsage').textContent = 
          `${this.formatNumber(daily.usage.tokens.total)} / ${this.formatNumber(daily.limits.tokens)}`;
        this.updateProgressColor('tokenProgress', tokenPercent);
        
        // Update request usage
        const requestPercent = daily.percentages.requests || 0;
        document.getElementById('requestProgress').style.width = `${Math.min(requestPercent, 100)}%`;
        document.getElementById('requestUsage').textContent = 
          `${daily.usage.requests} / ${daily.limits.requests}`;
        this.updateProgressColor('requestProgress', requestPercent);
        
        // Update cost usage
        const costPercent = daily.percentages.cost || 0;
        document.getElementById('costProgress').style.width = `${Math.min(costPercent, 100)}%`;
        document.getElementById('costUsage').textContent = 
          `$${daily.usage.cost.toFixed(2)} / $${daily.limits.cost.toFixed(2)}`;
        this.updateProgressColor('costProgress', costPercent);
      }
    } catch (error) {
      console.error('Failed to update rate limit display:', error);
    }
  }
  
  /**
   * Format large numbers with K suffix
   */
  formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  }
  
  /**
   * Update progress bar color based on percentage
   */
  updateProgressColor(elementId, percentage) {
    const element = document.getElementById(elementId);
    element.classList.remove('warning', 'danger');
    
    if (percentage >= 90) {
      element.classList.add('danger');
    } else if (percentage >= 75) {
      element.classList.add('warning');
    }
  }
  
  /**
   * Handle rate limit errors
   */
  handleRateLimitError(response) {
    let message = 'Rate limit exceeded. ';
    
    switch (response.limitType) {
      case 'rate':
        message += `Please wait ${response.retryAfter} seconds before trying again.`;
        break;
      case 'daily_tokens':
        message += 'Daily token limit reached. Limit resets at midnight.';
        break;
      case 'daily_requests':
        message += 'Daily request limit reached. Limit resets at midnight.';
        break;
      case 'daily_cost':
        message += 'Daily cost limit reached. Limit resets at midnight.';
        break;
      case 'monthly_tokens':
        message += 'Monthly token limit reached. Consider upgrading your limits.';
        break;
      case 'monthly_requests':
        message += 'Monthly request limit reached. Consider upgrading your limits.';
        break;
      case 'monthly_cost':
        message += 'Monthly cost limit reached. Consider upgrading your limits.';
        break;
      default:
        message = response.error;
    }
    
    this.addMessageToConversation(message, 'assistant');
    this.showError('Rate limit exceeded');
    
    // Update rate limit display to show current status
    this.updateRateLimitDisplay();
  }

  /**
   * Send message to background script
   */
  async sendMessageToBackground(action, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, ...data }, resolve);
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

