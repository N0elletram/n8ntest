/**
 * Masonry Avatar Integration Script
 * Demonstrates how to use the enhanced AvatarRenderer with the masonry layout
 */

class MasonryAvatarIntegration {
  constructor() {
    this.avatarRenderer = null;
    this.masonryController = null;
    this.contentAnalysis = {
      sentiment: 0,
      complexity: 'medium',
      topics: []
    };
    
    this.init();
  }

  /**
   * Initialize the integration
   */
  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize avatar renderer with masonry options
      await this.initializeAvatarRenderer();
      
      // Setup masonry controller integration
      this.setupMasonryController();
      
      // Setup content analysis
      this.setupContentAnalysis();
      
      // Setup interaction handlers
      this.setupInteractionHandlers();
      
      console.log('Masonry Avatar Integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Masonry Avatar Integration:', error);
    }
  }

  /**
   * Initialize the avatar renderer
   */
  async initializeAvatarRenderer() {
    const canvas = document.getElementById('avatarCanvas');
    if (!canvas) {
      throw new Error('Avatar canvas not found');
    }

    // Determine if this is a hero canvas
    const parentCard = canvas.closest('.card, .masonry-item');
    const isHeroCanvas = parentCard && parentCard.classList.contains('avatar-card');

    this.avatarRenderer = new AvatarRenderer('avatarCanvas', {
      heroCanvas: isHeroCanvas,
      parentCard: parentCard,
      enableFloating: true,
      enableGestures: true,
      enablePersonality: true,
      enableHoverEffects: true,
      performanceMode: 'auto',
      targetFPS: 60
    });

    // Wait for avatar to be ready
    await new Promise(resolve => {
      this.avatarRenderer.masonryEvents.addEventListener('avatarReady', resolve);
    });

    // Set initial personality based on content
    this.updateAvatarPersonality();
  }

  /**
   * Setup masonry controller integration
   */
  setupMasonryController() {
    // Check if masonry controller exists
    if (window.masonryController) {
      this.masonryController = window.masonryController;
      
      // Listen to masonry events
      document.addEventListener('cardExpanded', this.handleCardExpanded.bind(this));
      document.addEventListener('cardCollapsed', this.handleCardCollapsed.bind(this));
      document.addEventListener('themeChanged', this.handleThemeChanged.bind(this));
      document.addEventListener('masonryLayoutChanged', this.handleLayoutChanged.bind(this));
    }
  }

  /**
   * Setup content analysis
   */
  setupContentAnalysis() {
    // Analyze current page content
    this.analyzePageContent();
    
    // Monitor content changes
    const observer = new MutationObserver(() => {
      this.analyzePageContent();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * Setup interaction handlers
   */
  setupInteractionHandlers() {
    // Quick action handlers
    document.addEventListener('click', (event) => {
      if (event.target.matches('.action-tile')) {
        const action = event.target.onclick?.toString().match(/quickAction\('(\w+)'\)/)?.[1];
        if (action) {
          this.handleQuickAction(action);
        }
      }
    });

    // Message handlers
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.addEventListener('focus', () => {
        this.avatarRenderer.expressEmotion('engaged', 0.8);
      });
      
      messageInput.addEventListener('input', () => {
        this.avatarRenderer.setThinking(true);
        
        // Stop thinking after a delay
        clearTimeout(this.thinkingTimeout);
        this.thinkingTimeout = setTimeout(() => {
          this.avatarRenderer.setThinking(false);
        }, 1000);
      });
    }

    // Avatar personality event listener
    this.avatarRenderer.masonryEvents.addEventListener('personalityChanged', (event) => {
      this.updateUIBasedOnPersonality(event.detail.personality);
    });
  }

  /**
   * Analyze page content
   */
  analyzePageContent() {
    try {
      // Get all text content
      const textContent = document.body.innerText.toLowerCase();
      const words = textContent.split(/\s+/).filter(word => word.length > 2);
      
      // Simple sentiment analysis
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'success', 'win'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'fail', 'error', 'problem', 'issue'];
      
      const positiveCount = words.filter(word => positiveWords.includes(word)).length;
      const negativeCount = words.filter(word => negativeWords.includes(word)).length;
      const totalSentimentWords = positiveCount + negativeCount;
      
      this.contentAnalysis.sentiment = totalSentimentWords > 0 
        ? (positiveCount - negativeCount) / totalSentimentWords 
        : 0;

      // Complexity analysis
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      if (avgWordLength > 6) {
        this.contentAnalysis.complexity = 'high';
      } else if (avgWordLength > 4) {
        this.contentAnalysis.complexity = 'medium';
      } else {
        this.contentAnalysis.complexity = 'low';
      }

      // Topic analysis
      const topics = [];
      if (textContent.includes('technology') || textContent.includes('tech')) topics.push('technology');
      if (textContent.includes('ai') || textContent.includes('artificial intelligence')) topics.push('AI');
      if (textContent.includes('web') || textContent.includes('website')) topics.push('web');
      if (textContent.includes('development') || textContent.includes('programming')) topics.push('development');
      
      this.contentAnalysis.topics = topics;

      // Update avatar mood
      this.updateAvatarPersonality();
    } catch (error) {
      console.error('Content analysis failed:', error);
    }
  }

  /**
   * Update avatar personality based on content
   */
  updateAvatarPersonality() {
    if (this.avatarRenderer) {
      this.avatarRenderer.setMoodFromContent(this.contentAnalysis);
    }
  }

  /**
   * Handle quick actions
   */
  handleQuickAction(action) {
    switch (action) {
      case 'summarize':
        this.avatarRenderer.expressEmotion('thinking', 1.0);
        this.simulateAIResponse('Let me summarize this content for you...');
        break;
      case 'explain':
        this.avatarRenderer.expressEmotion('engaged', 0.9);
        this.simulateAIResponse('I\'ll explain the key concepts...');
        break;
      case 'questions':
        this.avatarRenderer.expressEmotion('curious', 0.8);
        this.simulateAIResponse('Here are some key questions about this content...');
        break;
      case 'translate':
        this.avatarRenderer.expressEmotion('helpful', 0.7);
        this.simulateAIResponse('I can help translate or explain technical terms...');
        break;
    }
  }

  /**
   * Simulate AI response
   */
  simulateAIResponse(message) {
    this.avatarRenderer.setSpeaking(true);
    
    // Add message to conversation
    this.addMessage('ai', message);
    
    // Stop speaking after a delay
    setTimeout(() => {
      this.avatarRenderer.setSpeaking(false);
    }, 3000);
  }

  /**
   * Add message to conversation history
   */
  addMessage(type, content) {
    const history = document.getElementById('conversationHistory');
    if (history) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type}`;
      
      messageDiv.innerHTML = `
        <div class="message-avatar">${type === 'ai' ? '🤖' : '👤'}</div>
        <div class="message-content">${content}</div>
      `;
      
      history.appendChild(messageDiv);
      history.scrollTop = history.scrollHeight;
    }
  }

  /**
   * Handle card expanded
   */
  handleCardExpanded(event) {
    if (event.detail && event.detail.card) {
      console.log('Card expanded:', event.detail.card);
    }
  }

  /**
   * Handle card collapsed
   */
  handleCardCollapsed(event) {
    if (event.detail && event.detail.card) {
      console.log('Card collapsed:', event.detail.card);
    }
  }

  /**
   * Handle theme changed
   */
  handleThemeChanged(event) {
    console.log('Theme changed:', event.detail);
    
    // Update avatar mood based on theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.avatarRenderer.expressEmotion(isDark ? 'mysterious' : 'bright', 0.5);
  }

  /**
   * Handle layout changed
   */
  handleLayoutChanged(event) {
    console.log('Layout changed:', event.detail);
  }

  /**
   * Update UI based on personality
   */
  updateUIBasedOnPersonality(personality) {
    // Update status indicator
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) {
      switch (personality.mood) {
        case 'happy':
        case 'excited':
          statusDot.style.background = '#48bb78'; // Green
          break;
        case 'thinking':
        case 'contemplative':
          statusDot.style.background = '#667eea'; // Blue
          break;
        case 'sad':
        case 'concerned':
          statusDot.style.background = '#f56565'; // Red
          break;
        default:
          statusDot.style.background = '#48bb78'; // Default green
      }
    }

    // Update card glow based on energy
    const avatarCard = document.querySelector('.avatar-card');
    if (avatarCard && personality.energy > 0.7) {
      avatarCard.style.boxShadow = `0 0 30px rgba(102, 126, 234, ${personality.energy * 0.3})`;
    } else if (avatarCard) {
      avatarCard.style.boxShadow = '';
    }
  }

  /**
   * Get avatar performance metrics
   */
  getPerformanceMetrics() {
    return this.avatarRenderer ? this.avatarRenderer.getPerformanceMetrics() : null;
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.avatarRenderer) {
      this.avatarRenderer.dispose();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.masonryAvatarIntegration = new MasonryAvatarIntegration();
  });
} else {
  window.masonryAvatarIntegration = new MasonryAvatarIntegration();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MasonryAvatarIntegration;
}