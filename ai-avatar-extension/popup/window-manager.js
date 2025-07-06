/**
 * Window Manager for AI Avatar Extension
 * Handles window mode switching, screen detection, and detached windows
 */

class WindowManager {
    constructor() {
        this.currentMode = 'compact';
        this.detachedWindow = null;
        this.settings = {
            defaultMode: 'auto',
            rememberMode: true,
            detachedWindowFeatures: 'width=900,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
        };
        
        // Keyboard shortcuts for view switching
        this.keyboardShortcuts = {
            'KeyC': 'compact',    // C for compact
            'KeyL': 'large',      // L for large
            'KeyM': 'masonry',    // M for masonry
            'KeyD': 'detached'    // D for detached
        };
        
        this.init();
    }

    async init() {
        // Load saved settings
        await this.loadSettings();
        
        // Detect screen size and set initial mode
        this.detectScreenSize();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI based on current mode
        this.updateUI();
        
        // Trigger auto-detection suggestion after a short delay
        setTimeout(() => {
            this.suggestModeChange();
        }, 3000);
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['windowSettings']);
            if (result.windowSettings) {
                this.settings = { ...this.settings, ...result.windowSettings };
            }
            
            // Load last used mode if remember mode is enabled
            if (this.settings.rememberMode) {
                const lastMode = await chrome.storage.local.get(['lastWindowMode']);
                if (lastMode.lastWindowMode) {
                    this.currentMode = lastMode.lastWindowMode;
                }
            }
        } catch (error) {
            console.log('Failed to load window settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ windowSettings: this.settings });
            
            if (this.settings.rememberMode) {
                await chrome.storage.local.set({ lastWindowMode: this.currentMode });
            }
        } catch (error) {
            console.log('Failed to save window settings:', error);
        }
    }

    detectScreenSize() {
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;
        
        // Auto-detect based on screen size and content
        if (this.settings.defaultMode === 'auto') {
            // If screen is very large (1600x1000+), prefer masonry for best content layout
            if (screenWidth >= 1600 && screenHeight >= 1000) {
                this.currentMode = 'masonry';
            }
            // If screen is large enough for large mode (at least 1200x800), use large mode
            else if (screenWidth >= 1200 && screenHeight >= 800) {
                this.currentMode = 'large';
            } else {
                this.currentMode = 'compact';
            }
        } else {
            this.currentMode = this.settings.defaultMode;
        }
        
        // Store screen info for future reference
        this.screenInfo = {
            width: screenWidth,
            height: screenHeight,
            isLargeScreen: screenWidth >= 1200 && screenHeight >= 800,
            isVeryLargeScreen: screenWidth >= 1600 && screenHeight >= 1000,
            aspectRatio: screenWidth / screenHeight
        };
    }

    setupEventListeners() {
        // Mode selector buttons
        const compactBtn = document.getElementById('compactModeBtn');
        const largeBtn = document.getElementById('largeModeBtn');
        const masonryBtn = document.getElementById('masonryModeBtn');
        const detachedBtn = document.getElementById('detachedModeBtn');

        if (compactBtn) {
            compactBtn.addEventListener('click', () => this.switchMode('compact'));
        }
        
        if (largeBtn) {
            largeBtn.addEventListener('click', () => this.switchMode('large'));
        }
        
        if (masonryBtn) {
            masonryBtn.addEventListener('click', () => this.switchMode('masonry'));
        }
        
        if (detachedBtn) {
            detachedBtn.addEventListener('click', () => this.openDetachedWindow());
        }
        
        // Keyboard shortcuts for view switching
        document.addEventListener('keydown', (e) => {
            // Only trigger if Ctrl/Cmd + Shift is held and no input is focused
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && !this.isInputFocused()) {
                const mode = this.keyboardShortcuts[e.code];
                if (mode) {
                    e.preventDefault();
                    if (mode === 'detached') {
                        this.openDetachedWindow();
                    } else {
                        this.switchMode(mode);
                    }
                    this.announceKeyboardShortcut(mode);
                }
            }
        });

        // Listen for detached window close
        window.addEventListener('beforeunload', () => {
            if (this.detachedWindow && !this.detachedWindow.closed) {
                this.detachedWindow.close();
            }
        });

        // Listen for settings changes
        const defaultModeSelect = document.getElementById('defaultWindowMode');
        if (defaultModeSelect) {
            defaultModeSelect.addEventListener('change', (e) => {
                this.settings.defaultMode = e.target.value;
                this.saveSettings();
                
                // If auto mode is selected, re-detect screen size
                if (e.target.value === 'auto') {
                    this.detectScreenSize();
                    this.updateUI();
                }
            });
        }
    }

    switchMode(mode) {
        if (mode === this.currentMode) return;

        const previousMode = this.currentMode;
        this.currentMode = mode;

        // Update usage history for learning
        this.updateUsageHistory(mode);

        // Save the new mode
        this.saveSettings();

        // Update UI
        this.updateUI();

        // If switching to/from different popup types, we need to reload with different popup
        if (this.needsReload(previousMode, mode)) {
            this.reloadWithMode(mode);
        }

        // Announce mode change for accessibility
        this.announceMode(mode);
    }

    async reloadWithMode(mode) {
        // Show transition loading state
        this.showTransitionLoading();
        
        // Store the current state
        const currentState = this.getCurrentState();
        
        // Store state for restoration
        await chrome.storage.local.set({ 
            pendingReload: true,
            restorationState: currentState,
            targetMode: mode,
            transitionTimestamp: Date.now()
        });

        // Add fade out effect before switching
        const app = document.getElementById('app');
        if (app) {
            app.classList.add('fade-transition', 'fade-out');
        }

        // Wait for fade out animation
        setTimeout(() => {
            // Close current popup and open new one
            if (mode === 'large') {
                chrome.windows.create({
                    url: chrome.runtime.getURL('popup/popup-large.html'),
                    type: 'popup',
                    width: 800,
                    height: 800,
                    focused: true
                });
            } else if (mode === 'masonry') {
                chrome.windows.create({
                    url: chrome.runtime.getURL('popup/popup-masonry.html'),
                    type: 'popup',
                    width: 1200,
                    height: 900,
                    focused: true
                });
            } else {
                // For compact mode, just close current window - browser action will open default popup
                window.close();
            }
        }, 300);
    }

    getCurrentState() {
        // Capture current conversation state, settings, etc.
        const conversationHistory = document.getElementById('conversationHistory');
        const messageInput = document.getElementById('messageInput');
        const summaryContent = document.getElementById('summaryContent');
        const wordCount = document.getElementById('wordCount');
        
        // Capture UI state
        const uiState = {
            scrollPositions: {
                conversation: conversationHistory ? conversationHistory.scrollTop : 0,
                main: window.scrollY
            },
            activeElements: {
                focused: document.activeElement ? document.activeElement.id : null
            }
        };
        
        return {
            conversationHTML: conversationHistory ? conversationHistory.innerHTML : '',
            inputValue: messageInput ? messageInput.value : '',
            summaryHTML: summaryContent ? summaryContent.innerHTML : '',
            wordCountText: wordCount ? wordCount.textContent : '',
            uiState: uiState,
            timestamp: Date.now(),
            mode: this.currentMode
        };
    }

    async restoreState() {
        try {
            const result = await chrome.storage.local.get(['pendingReload', 'restorationState', 'targetMode', 'transitionTimestamp']);
            
            if (result.pendingReload && result.restorationState) {
                const state = result.restorationState;
                
                // Show restoration in progress
                this.showRestorationProgress();
                
                // Add fade in effect
                const app = document.getElementById('app');
                if (app) {
                    app.classList.add('fade-transition', 'fade-in');
                }
                
                // Restore conversation history
                const conversationHistory = document.getElementById('conversationHistory');
                if (conversationHistory && state.conversationHTML) {
                    conversationHistory.innerHTML = state.conversationHTML;
                }
                
                // Restore input value
                const messageInput = document.getElementById('messageInput');
                if (messageInput && state.inputValue) {
                    messageInput.value = state.inputValue;
                }
                
                // Restore summary content
                const summaryContent = document.getElementById('summaryContent');
                if (summaryContent && state.summaryHTML) {
                    summaryContent.innerHTML = state.summaryHTML;
                }
                
                // Restore word count
                const wordCount = document.getElementById('wordCount');
                if (wordCount && state.wordCountText) {
                    wordCount.textContent = state.wordCountText;
                }
                
                // Update current mode
                if (result.targetMode) {
                    this.currentMode = result.targetMode;
                }
                
                // Restore UI state
                if (state.uiState) {
                    setTimeout(() => {
                        // Restore scroll positions
                        if (state.uiState.scrollPositions) {
                            if (conversationHistory && state.uiState.scrollPositions.conversation) {
                                conversationHistory.scrollTop = state.uiState.scrollPositions.conversation;
                            }
                            if (state.uiState.scrollPositions.main) {
                                window.scrollTo(0, state.uiState.scrollPositions.main);
                            }
                        }
                        
                        // Restore focus
                        if (state.uiState.activeElements && state.uiState.activeElements.focused) {
                            const focusElement = document.getElementById(state.uiState.activeElements.focused);
                            if (focusElement) {
                                focusElement.focus();
                            }
                        }
                    }, 100);
                }
                
                // Announce successful restoration
                this.announceStateRestoration(result.targetMode);
                
                // Clear the restoration data
                await chrome.storage.local.remove(['pendingReload', 'restorationState', 'targetMode', 'transitionTimestamp']);
                
                // Hide restoration progress
                setTimeout(() => this.hideRestorationProgress(), 1000);
            }
        } catch (error) {
            console.log('Failed to restore state:', error);
            this.hideRestorationProgress();
        }
    }

    async openDetachedWindow() {
        if (this.detachedWindow && !this.detachedWindow.closed) {
            // If detached window already exists, focus it
            this.detachedWindow.focus();
            return;
        }

        try {
            // Create a new detached window
            const window = await chrome.windows.create({
                url: chrome.runtime.getURL('popup/popup-large.html') + '?mode=detached',
                type: 'popup',
                width: 900,
                height: 900,
                focused: true
            });

            this.detachedWindow = window;
            
            // Close the current popup
            setTimeout(() => {
                if (chrome.extension.getViews({ type: 'popup' }).length > 0) {
                    window.close();
                }
            }, 100);

        } catch (error) {
            console.error('Failed to create detached window:', error);
            this.showError('Failed to open detached window. Please try again.');
        }
    }

    updateUI() {
        // Update mode selector buttons
        const compactBtn = document.getElementById('compactModeBtn');
        const largeBtn = document.getElementById('largeModeBtn');
        const masonryBtn = document.getElementById('masonryModeBtn');
        const detachedBtn = document.getElementById('detachedModeBtn');

        // Remove active class from all buttons
        [compactBtn, largeBtn, masonryBtn, detachedBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        // Add active class to current mode button
        if (this.currentMode === 'compact' && compactBtn) {
            compactBtn.classList.add('active');
        } else if (this.currentMode === 'large' && largeBtn) {
            largeBtn.classList.add('active');
        } else if (this.currentMode === 'masonry' && masonryBtn) {
            masonryBtn.classList.add('active');
        }

        // Update window mode indicator in footer
        const windowModeSpan = document.getElementById('windowMode');
        if (windowModeSpan) {
            const modeText = this.getModeDisplayName(this.currentMode);
            windowModeSpan.textContent = modeText;
        }

        // Update settings dropdown
        const defaultModeSelect = document.getElementById('defaultWindowMode');
        if (defaultModeSelect) {
            defaultModeSelect.value = this.settings.defaultMode;
        }

        // Show/hide mode selector based on screen size
        const modeSelector = document.querySelector('.window-mode-selector');
        if (modeSelector) {
            // Always show mode selector, but disable buttons if screen is too small
            if (!this.screenInfo.isLargeScreen) {
                if (largeBtn) {
                    largeBtn.disabled = true;
                    largeBtn.title = 'Screen too small for large mode';
                }
                if (masonryBtn) {
                    masonryBtn.disabled = true;
                    masonryBtn.title = 'Screen too small for masonry mode';
                }
                if (detachedBtn) {
                    detachedBtn.disabled = true;
                    detachedBtn.title = 'Screen too small for detached mode';
                }
            } else {
                // Enable all buttons for large screens
                [largeBtn, masonryBtn, detachedBtn].forEach(btn => {
                    if (btn) {
                        btn.disabled = false;
                        btn.title = '';
                    }
                });
            }
        }
    }

    announceMode(mode) {
        const announcement = document.getElementById('screenReaderAnnouncements');
        if (announcement) {
            const modeText = this.getModeDisplayName(mode).replace(' Mode', '');
            announcement.textContent = `Switched to ${modeText} mode`;
        }
    }

    showError(message) {
        // Show error message to user
        const announcement = document.getElementById('screenReaderAnnouncements');
        if (announcement) {
            announcement.textContent = message;
        }
        
        // Could also show a toast notification here
        console.error(message);
    }

    // Utility methods
    isLargeMode() {
        return this.currentMode === 'large';
    }

    isCompactMode() {
        return this.currentMode === 'compact';
    }
    
    isMasonryMode() {
        return this.currentMode === 'masonry';
    }

    getScreenInfo() {
        return this.screenInfo;
    }

    // Method to check if we're in a detached window
    isDetachedWindow() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mode') === 'detached';
    }

    // Method to handle detached window specific initialization
    initDetachedWindow() {
        if (this.isDetachedWindow()) {
            // Remove mode selector for detached window
            const modeSelector = document.querySelector('.window-mode-selector');
            if (modeSelector) {
                modeSelector.style.display = 'none';
            }

            // Update title
            document.title = 'AI Avatar - Detached Window';
            
            // Update logo text
            const logoText = document.querySelector('.logo-text');
            if (logoText) {
                logoText.textContent = 'AI Avatar - Detached';
            }

            // Update window mode indicator
            const windowModeSpan = document.getElementById('windowMode');
            if (windowModeSpan) {
                windowModeSpan.textContent = 'Detached Mode';
            }
        }
    }
    
    /**
     * Check if a reload is needed when switching modes
     */
    needsReload(previousMode, newMode) {
        const popupModes = {
            'compact': 'popup.html',
            'large': 'popup-large.html', 
            'masonry': 'popup-masonry.html'
        };
        
        return popupModes[previousMode] !== popupModes[newMode];
    }
    
    /**
     * Get display name for a mode
     */
    getModeDisplayName(mode) {
        const displayNames = {
            'compact': 'Compact Mode',
            'large': 'Large Mode',
            'masonry': 'Masonry Mode',
            'detached': 'Detached Mode'
        };
        
        return displayNames[mode] || 'Unknown Mode';
    }
    
    /**
     * Check if an input element is currently focused
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
    }
    
    /**
     * Announce keyboard shortcut usage
     */
    announceKeyboardShortcut(mode) {
        const announcement = document.getElementById('screenReaderAnnouncements');
        if (announcement) {
            const modeText = this.getModeDisplayName(mode).replace(' Mode', '');
            announcement.textContent = `Keyboard shortcut: Switched to ${modeText} mode`;
        }
    }
    
    /**
     * Get available modes based on screen size
     */
    getAvailableModes() {
        const allModes = ['compact', 'large', 'masonry', 'detached'];
        
        if (!this.screenInfo.isLargeScreen) {
            return ['compact']; // Only compact mode for small screens
        }
        
        return allModes;
    }
    
    /**
     * Get recommended mode based on screen size and content
     */
    getRecommendedMode() {
        // Check if we have content analysis data
        const contentComplexity = this.getContentComplexity();
        const contentType = this.getContentType();
        const userPreference = this.getUserPreference();
        
        // Factor in user's past usage patterns
        const usageHistory = this.getUsageHistory();
        
        // Score different modes based on multiple factors
        const scores = {
            compact: this.calculateModeScore('compact', contentComplexity, contentType, userPreference, usageHistory),
            large: this.calculateModeScore('large', contentComplexity, contentType, userPreference, usageHistory),
            masonry: this.calculateModeScore('masonry', contentComplexity, contentType, userPreference, usageHistory)
        };
        
        // Return the mode with the highest score
        const recommendedMode = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        
        // Store recommendation for learning
        this.storeRecommendation(recommendedMode, scores);
        
        return recommendedMode;
    }
    
    /**
     * Calculate score for a specific mode based on various factors
     */
    calculateModeScore(mode, contentComplexity, contentType, userPreference, usageHistory) {
        let score = 0;
        
        // Screen size compatibility (base score)
        if (mode === 'compact') {
            score += 100; // Always available
        } else if (mode === 'large') {
            score += this.screenInfo.isLargeScreen ? 100 : 0;
        } else if (mode === 'masonry') {
            score += this.screenInfo.isVeryLargeScreen ? 100 : 
                     this.screenInfo.isLargeScreen ? 70 : 0;
        }
        
        // Content complexity factor
        if (contentComplexity === 'high') {
            if (mode === 'masonry') score += 40;
            else if (mode === 'large') score += 20;
            else score -= 10;
        } else if (contentComplexity === 'medium') {
            if (mode === 'large') score += 30;
            else if (mode === 'masonry') score += 25;
            else score += 10;
        } else {
            if (mode === 'compact') score += 30;
            else score += 10;
        }
        
        // Content type factor
        if (contentType === 'article' || contentType === 'documentation') {
            if (mode === 'large') score += 25;
            else if (mode === 'masonry') score += 35;
        } else if (contentType === 'social' || contentType === 'forum') {
            if (mode === 'masonry') score += 30;
            else if (mode === 'large') score += 15;
        } else if (contentType === 'simple') {
            if (mode === 'compact') score += 25;
        }
        
        // User preference factor
        if (userPreference === mode) {
            score += 50;
        }
        
        // Usage history factor
        const historyBonus = usageHistory[mode] || 0;
        score += Math.min(historyBonus * 2, 30);
        
        // Time of day factor (people prefer different modes at different times)
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) { // Work hours
            if (mode === 'large' || mode === 'masonry') score += 10;
        } else { // Personal time
            if (mode === 'compact') score += 15;
        }
        
        return Math.max(0, score);
    }
    
    /**
     * Get content type from the current page
     */
    getContentType() {
        try {
            // Analyze URL patterns
            const url = window.location?.href || '';
            const hostname = window.location?.hostname || '';
            
            // Check for known content types
            if (hostname.includes('github') || hostname.includes('stackoverflow') || 
                hostname.includes('docs.') || url.includes('/docs/')) {
                return 'documentation';
            }
            
            if (hostname.includes('twitter') || hostname.includes('facebook') || 
                hostname.includes('reddit') || hostname.includes('news.ycombinator')) {
                return 'social';
            }
            
            if (hostname.includes('medium') || hostname.includes('blog') || 
                url.includes('/article/') || url.includes('/post/')) {
                return 'article';
            }
            
            // Analyze page content structure
            const headings = document.querySelectorAll('h1, h2, h3').length;
            const paragraphs = document.querySelectorAll('p').length;
            const lists = document.querySelectorAll('ul, ol').length;
            const tables = document.querySelectorAll('table').length;
            const codeBlocks = document.querySelectorAll('code, pre').length;
            
            if (codeBlocks > 5 || tables > 2) {
                return 'documentation';
            }
            
            if (headings > 5 && paragraphs > 10) {
                return 'article';
            }
            
            if (lists > 3) {
                return 'forum';
            }
            
            return 'simple';
        } catch (error) {
            return 'simple';
        }
    }
    
    /**
     * Get user's stored preference
     */
    getUserPreference() {
        try {
            // This would be enhanced to look at user's manual overrides
            return this.settings.defaultMode === 'auto' ? null : this.settings.defaultMode;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get usage history for mode recommendations
     */
    getUsageHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('modeUsageHistory') || '{}');
            return {
                compact: history.compact || 0,
                large: history.large || 0,
                masonry: history.masonry || 0
            };
        } catch (error) {
            return { compact: 0, large: 0, masonry: 0 };
        }
    }
    
    /**
     * Store recommendation for machine learning
     */
    storeRecommendation(recommendedMode, scores) {
        try {
            const recommendations = JSON.parse(localStorage.getItem('modeRecommendations') || '[]');
            
            recommendations.push({
                timestamp: Date.now(),
                recommended: recommendedMode,
                scores: scores,
                screenSize: this.screenInfo,
                contentComplexity: this.getContentComplexity(),
                contentType: this.getContentType(),
                url: window.location?.hostname || 'unknown'
            });
            
            // Keep only last 100 recommendations
            const recentRecommendations = recommendations.slice(-100);
            localStorage.setItem('modeRecommendations', JSON.stringify(recentRecommendations));
        } catch (error) {
            console.log('Failed to store recommendation:', error);
        }
    }
    
    /**
     * Update usage history when user manually switches modes
     */
    updateUsageHistory(mode) {
        try {
            const history = this.getUsageHistory();
            history[mode] = (history[mode] || 0) + 1;
            localStorage.setItem('modeUsageHistory', JSON.stringify(history));
        } catch (error) {
            console.log('Failed to update usage history:', error);
        }
    }
    
    /**
     * Auto-suggest mode change based on content analysis
     */
    suggestModeChange() {
        if (this.settings.defaultMode !== 'auto') {
            return; // User has a preferred mode, don't suggest
        }
        
        const recommended = this.getRecommendedMode();
        if (recommended !== this.currentMode && this.getAvailableModes().includes(recommended)) {
            this.showModeRecommendation(recommended);
        }
    }
    
    /**
     * Show mode recommendation to user
     */
    showModeRecommendation(recommendedMode) {
        // Don't show recommendations too frequently
        const lastSuggestion = localStorage.getItem('lastModesuggestion');
        const now = Date.now();
        if (lastSuggestion && now - parseInt(lastSuggestion) < 300000) { // 5 minutes
            return;
        }
        
        localStorage.setItem('lastModeSuggestion', now.toString());
        
        // Create suggestion notification
        const suggestion = document.createElement('div');
        suggestion.className = 'mode-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <div class="suggestion-icon">💡</div>
                <div class="suggestion-text">
                    <strong>Better view available!</strong><br>
                    ${this.getModeDisplayName(recommendedMode)} might work better for this content.
                </div>
                <div class="suggestion-actions">
                    <button class="suggestion-btn accept" onclick="window.windowManager.acceptSuggestion('${recommendedMode}')">
                        Switch
                    </button>
                    <button class="suggestion-btn dismiss" onclick="window.windowManager.dismissSuggestion()">
                        Dismiss
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(suggestion);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (suggestion.parentNode) {
                this.dismissSuggestion();
            }
        }, 10000);
    }
    
    /**
     * Accept mode suggestion
     */
    acceptSuggestion(mode) {
        this.dismissSuggestion();
        this.switchMode(mode);
        
        // Record that user accepted suggestion
        this.recordSuggestionFeedback(mode, 'accepted');
    }
    
    /**
     * Dismiss mode suggestion
     */
    dismissSuggestion() {
        const suggestion = document.querySelector('.mode-suggestion');
        if (suggestion) {
            suggestion.classList.add('dismissing');
            setTimeout(() => suggestion.remove(), 300);
        }
    }
    
    /**
     * Record user feedback on suggestions for learning
     */
    recordSuggestionFeedback(mode, action) {
        try {
            const feedback = JSON.parse(localStorage.getItem('suggestionFeedback') || '[]');
            feedback.push({
                timestamp: Date.now(),
                mode: mode,
                action: action,
                context: {
                    contentComplexity: this.getContentComplexity(),
                    contentType: this.getContentType(),
                    screenSize: this.screenInfo
                }
            });
            
            // Keep only last 50 feedback entries
            const recentFeedback = feedback.slice(-50);
            localStorage.setItem('suggestionFeedback', JSON.stringify(recentFeedback));
        } catch (error) {
            console.log('Failed to record suggestion feedback:', error);
        }
    }
    
    /**
     * Analyze content complexity for mode recommendation
     */
    getContentComplexity() {
        // This could be enhanced to analyze actual page content
        // For now, use simple heuristics
        
        try {
            const wordCount = document.getElementById('wordCount');
            const wordCountValue = wordCount ? parseInt(wordCount.textContent.replace(/[^0-9]/g, '')) : 0;
            
            if (wordCountValue > 2000) {
                return 'high';
            } else if (wordCountValue > 500) {
                return 'medium';
            } else {
                return 'low';
            }
        } catch (error) {
            return 'medium'; // Default to medium complexity
        }
    }
    
    /**
     * Show transition loading state
     */
    showTransitionLoading() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.add('transition-loading');
        }
        
        // Create loading overlay if it doesn't exist
        if (!document.getElementById('transitionOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'transitionOverlay';
            overlay.className = 'conversation-overlay';
            overlay.innerHTML = `
                <div class="preservation-message">
                    <div class="preservation-spinner"></div>
                    <p>Switching to ${this.getModeDisplayName(this.currentMode)}...</p>
                    <small>Preserving your conversation</small>
                </div>
            `;
            
            const preserveWrapper = document.querySelector('.conversation-preserve') || app;
            if (preserveWrapper) {
                preserveWrapper.appendChild(overlay);
            }
        }
    }
    
    /**
     * Show state restoration progress
     */
    showRestorationProgress() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.add('conversation-preserve', 'preserving');
        }
        
        // Create restoration overlay
        if (!document.getElementById('restorationOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'restorationOverlay';
            overlay.className = 'conversation-overlay';
            overlay.innerHTML = `
                <div class="preservation-message">
                    <div class="preservation-spinner"></div>
                    <p>Restoring your session...</p>
                    <small>Loading ${this.getModeDisplayName(this.currentMode)}</small>
                </div>
            `;
            
            if (app) {
                app.appendChild(overlay);
            }
        }
    }
    
    /**
     * Hide restoration progress
     */
    hideRestorationProgress() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('conversation-preserve', 'preserving', 'transition-loading');
        }
        
        const overlays = ['transitionOverlay', 'restorationOverlay'];
        overlays.forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay) {
                overlay.remove();
            }
        });
    }
    
    /**
     * Announce state restoration to screen readers
     */
    announceStateRestoration(mode) {
        const announcement = document.getElementById('screenReaderAnnouncements');
        if (announcement) {
            const modeText = this.getModeDisplayName(mode).replace(' Mode', '');
            announcement.textContent = `Successfully switched to ${modeText} mode. Your conversation has been preserved.`;
        }
    }
}

// Initialize window manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.windowManager = new WindowManager();
    
    // If this is a detached window, initialize it
    if (window.windowManager.isDetachedWindow()) {
        window.windowManager.initDetachedWindow();
    }
    
    // Restore state if this is a reload
    window.windowManager.restoreState();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WindowManager;
}