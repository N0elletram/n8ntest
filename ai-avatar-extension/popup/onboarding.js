/**
 * AI Avatar Extension Onboarding Wizard
 * Provides a guided first-time user experience
 */

class OnboardingWizard {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 6;
    this.onComplete = null;
    this.onSkip = null;
    
    this.steps = [
      {
        id: 'welcome',
        title: 'Welcome to AI Avatar!',
        content: `
          <div class="onboarding-welcome">
            <img src="../assets/icons/icon128.png" alt="AI Avatar" class="onboarding-logo">
            <h2>Your Personal AI Assistant</h2>
            <p>AI Avatar analyzes web pages and helps you understand content through intelligent conversations.</p>
            <div class="feature-highlights">
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>Instant page analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">💬</span>
                <span>Natural conversations</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🎨</span>
                <span>Interactive 3D avatar</span>
              </div>
            </div>
          </div>
        `,
        action: 'Get Started'
      },
      {
        id: 'api-key',
        title: 'Connect Your AI',
        content: `
          <div class="onboarding-api-key">
            <div class="api-key-icon">🔑</div>
            <h3>OpenAI API Key Required</h3>
            <p>To use AI Avatar, you'll need an OpenAI API key. This enables the AI to analyze pages and respond to your questions.</p>
            
            <div class="api-key-steps">
              <div class="step-item">
                <span class="step-number">1</span>
                <div class="step-content">
                  <strong>Get your API key</strong>
                  <p>Visit <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI API Keys</a></p>
                </div>
              </div>
              <div class="step-item">
                <span class="step-number">2</span>
                <div class="step-content">
                  <strong>Create a new key</strong>
                  <p>Click "Create new secret key"</p>
                </div>
              </div>
              <div class="step-item">
                <span class="step-number">3</span>
                <div class="step-content">
                  <strong>Copy and paste below</strong>
                  <p>Your key starts with "sk-"</p>
                </div>
              </div>
            </div>
            
            <div class="api-key-input-container">
              <input type="password" id="onboardingApiKey" placeholder="sk-..." class="api-key-input">
              <small class="api-key-note">✓ Stored locally, never shared</small>
            </div>
          </div>
        `,
        action: 'Continue',
        validate: () => {
          const apiKey = document.getElementById('onboardingApiKey').value.trim();
          if (!apiKey) {
            return { valid: false, message: 'Please enter your API key' };
          }
          if (!apiKey.startsWith('sk-')) {
            return { valid: false, message: 'API key must start with "sk-"' };
          }
          // Save the API key
          chrome.storage.local.set({ apiKey });
          return { valid: true };
        }
      },
      {
        id: 'features',
        title: 'Key Features & Views',
        content: `
          <div class="onboarding-features">
            <div class="feature-showcase">
              <div class="showcase-item active" data-feature="analyze">
                <div class="showcase-icon">📊</div>
                <h4>Automatic Analysis</h4>
                <p>AI Avatar automatically analyzes web pages when you open the extension, providing instant insights.</p>
                <div class="feature-demo">
                  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150' viewBox='0 0 300 150'%3E%3Crect width='300' height='150' fill='%23f3f4f6'/%3E%3Ctext x='150' y='75' text-anchor='middle' font-family='Arial' font-size='14' fill='%23666'%3EPage Analysis Demo%3C/text%3E%3C/svg%3E" alt="Analysis demo">
                </div>
              </div>
              
              <div class="showcase-item" data-feature="chat">
                <div class="showcase-icon">💬</div>
                <h4>Smart Conversations</h4>
                <p>Ask questions about the content, request summaries, or dive deeper into specific topics.</p>
                <div class="feature-demo">
                  <div class="chat-demo">
                    <div class="demo-message user">What's this article about?</div>
                    <div class="demo-message ai">This article discusses...</div>
                  </div>
                </div>
              </div>
              
              <div class="showcase-item" data-feature="avatar">
                <div class="showcase-icon">🤖</div>
                <h4>Interactive Avatar</h4>
                <p>Watch your 3D AI avatar come to life with animations that respond to your interactions.</p>
                <div class="feature-demo">
                  <canvas id="demoAvatar" width="200" height="100"></canvas>
                </div>
              </div>
              
              <div class="showcase-item" data-feature="views">
                <div class="showcase-icon">🖥️</div>
                <h4>Multiple View Modes</h4>
                <p>Choose from compact, large, or masonry views to match your workflow and screen size.</p>
                <div class="feature-demo">
                  <div class="view-modes-demo">
                    <div class="view-mode-option" data-mode="compact">
                      <div class="view-preview compact-preview">
                        <div class="preview-header"></div>
                        <div class="preview-content">
                          <div class="preview-section small"></div>
                          <div class="preview-section small"></div>
                        </div>
                      </div>
                      <span>Compact</span>
                    </div>
                    <div class="view-mode-option" data-mode="large">
                      <div class="view-preview large-preview">
                        <div class="preview-header"></div>
                        <div class="preview-content">
                          <div class="preview-section large"></div>
                        </div>
                      </div>
                      <span>Large</span>
                    </div>
                    <div class="view-mode-option active" data-mode="masonry">
                      <div class="view-preview masonry-preview">
                        <div class="preview-header"></div>
                        <div class="preview-content masonry-grid">
                          <div class="preview-card tall"></div>
                          <div class="preview-card short"></div>
                          <div class="preview-card medium"></div>
                          <div class="preview-card short"></div>
                        </div>
                      </div>
                      <span>Masonry</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="feature-navigation">
              <button class="feature-nav-btn active" data-feature="analyze">Analysis</button>
              <button class="feature-nav-btn" data-feature="chat">Chat</button>
              <button class="feature-nav-btn" data-feature="avatar">Avatar</button>
              <button class="feature-nav-btn" data-feature="views">Views</button>
            </div>
          </div>
        `,
        action: 'Next',
        onEnter: () => {
          this.initFeatureShowcase();
        }
      },
      {
        id: 'view-modes',
        title: 'Choose Your View',
        content: `
          <div class="onboarding-view-modes">
            <p>AI Avatar offers multiple view modes to enhance your experience:</p>
            
            <div class="view-comparison">
              <div class="view-card" data-view="compact">
                <div class="view-icon">📱</div>
                <h4>Compact Mode</h4>
                <div class="view-features">
                  <div class="feature">• Perfect for small screens</div>
                  <div class="feature">• Minimal interface</div>
                  <div class="feature">• Quick interactions</div>
                  <div class="feature">• 400x600 popup</div>
                </div>
                <div class="keyboard-shortcut">Ctrl+Shift+C</div>
              </div>
              
              <div class="view-card" data-view="large">
                <div class="view-icon">🖥️</div>
                <h4>Large Mode</h4>
                <div class="view-features">
                  <div class="feature">• Expanded workspace</div>
                  <div class="feature">• Better readability</div>
                  <div class="feature">• More conversation history</div>
                  <div class="feature">• 800x800 window</div>
                </div>
                <div class="keyboard-shortcut">Ctrl+Shift+L</div>
              </div>
              
              <div class="view-card recommended" data-view="masonry">
                <div class="view-icon">🎨</div>
                <h4>Masonry Mode</h4>
                <div class="view-badge">Recommended</div>
                <div class="view-features">
                  <div class="feature">• Dynamic card layout</div>
                  <div class="feature">• Visual analytics dashboard</div>
                  <div class="feature">• Content-rich experience</div>
                  <div class="feature">• 1200x900 window</div>
                </div>
                <div class="keyboard-shortcut">Ctrl+Shift+M</div>
              </div>
            </div>
            
            <div class="view-tips">
              <h4>💡 Smart Tips:</h4>
              <ul>
                <li><strong>Auto-detection:</strong> The extension automatically chooses the best view for your screen</li>
                <li><strong>Seamless switching:</strong> Your conversation is preserved when changing views</li>
                <li><strong>Keyboard shortcuts:</strong> Use Ctrl+Shift+C/L/M for quick switching</li>
                <li><strong>Content-aware:</strong> Masonry mode is recommended for complex content</li>
              </ul>
            </div>
          </div>
        `,
        action: 'Next'
      },
      {
        id: 'try-it',
        title: 'Try These Questions',
        content: `
          <div class="onboarding-try-it">
            <p>Here are some example questions you can ask AI Avatar:</p>
            
            <div class="sample-questions">
              <button class="sample-question" data-question="Can you summarize this page in 3 bullet points?">
                <span class="question-icon">📝</span>
                <span class="question-text">Summarize this page</span>
              </button>
              
              <button class="sample-question" data-question="What are the main topics discussed here?">
                <span class="question-icon">🎯</span>
                <span class="question-text">Main topics</span>
              </button>
              
              <button class="sample-question" data-question="Can you explain this in simpler terms?">
                <span class="question-icon">💡</span>
                <span class="question-text">Simplify content</span>
              </button>
              
              <button class="sample-question" data-question="What questions should I ask to understand this better?">
                <span class="question-icon">❓</span>
                <span class="question-text">Suggest questions</span>
              </button>
              
              <button class="sample-question" data-question="Are there any important details I might have missed?">
                <span class="question-icon">🔍</span>
                <span class="question-text">Hidden details</span>
              </button>
              
              <button class="sample-question" data-question="How does this relate to current trends?">
                <span class="question-icon">📈</span>
                <span class="question-text">Current trends</span>
              </button>
            </div>
            
            <div class="quick-tips">
              <h4>💡 Pro Tips:</h4>
              <ul>
                <li>Use the quick action buttons for instant analysis</li>
                <li>Your conversation history is maintained during the session</li>
                <li>Click the refresh button to re-analyze updated content</li>
              </ul>
            </div>
          </div>
        `,
        action: 'Next'
      },
      {
        id: 'settings',
        title: 'Customize Your Experience',
        content: `
          <div class="onboarding-settings">
            <p>AI Avatar can be customized to match your preferences:</p>
            
            <div class="settings-preview">
              <div class="setting-item">
                <div class="setting-icon">🎭</div>
                <h4>Avatar Personality</h4>
                <p>Choose from professional, casual, academic, or creative personalities</p>
              </div>
              
              <div class="setting-item">
                <div class="setting-icon">⚡</div>
                <h4>Auto-Analysis</h4>
                <p>Automatically analyze pages when you open the extension</p>
              </div>
              
              <div class="setting-item">
                <div class="setting-icon">💸</div>
                <h4>Usage Limits</h4>
                <p>Set daily token and cost limits to control your API usage</p>
              </div>
              
              <div class="setting-item">
                <div class="setting-icon">🌊</div>
                <h4>Streaming Mode</h4>
                <p>See AI responses in real-time as they're generated</p>
              </div>
            </div>
            
            <div class="settings-note">
              <p>Access settings anytime by clicking the gear icon at the bottom of the extension.</p>
            </div>
          </div>
        `,
        action: 'Start Using AI Avatar'
      }
    ];
  }

  /**
   * Initialize feature showcase interactions
   */
  initFeatureShowcase() {
    const navButtons = document.querySelectorAll('.feature-nav-btn');
    const showcaseItems = document.querySelectorAll('.showcase-item');
    
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const feature = btn.dataset.feature;
        
        // Update active states
        navButtons.forEach(b => b.classList.remove('active'));
        showcaseItems.forEach(item => item.classList.remove('active'));
        
        btn.classList.add('active');
        document.querySelector(`.showcase-item[data-feature="${feature}"]`).classList.add('active');
      });
    });
    
    // Initialize demo avatar if on avatar feature
    const demoCanvas = document.getElementById('demoAvatar');
    if (demoCanvas && window.AvatarRenderer) {
      const demoAvatar = new AvatarRenderer('demoAvatar');
      demoAvatar.startIdleAnimation();
    }
  }

  /**
   * Show the onboarding wizard
   */
  show(onComplete, onSkip) {
    this.onComplete = onComplete;
    this.onSkip = onSkip;
    
    // Create and append wizard container
    const wizardHtml = `
      <div id="onboardingWizard" class="onboarding-wizard">
        <div class="onboarding-overlay"></div>
        <div class="onboarding-modal">
          <div class="onboarding-header">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(1 / this.totalSteps) * 100}%"></div>
            </div>
            <button class="skip-btn" id="skipOnboarding">Skip Tour</button>
          </div>
          
          <div class="onboarding-content" id="onboardingContent">
            <!-- Content will be inserted here -->
          </div>
          
          <div class="onboarding-footer">
            <button class="onboarding-btn secondary" id="onboardingBack" style="display: none;">Back</button>
            <div class="step-indicator">
              ${this.createStepIndicators()}
            </div>
            <button class="onboarding-btn primary" id="onboardingNext">Get Started</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', wizardHtml);
    
    // Setup event listeners
    this.setupWizardListeners();
    
    // Show first step
    this.showStep(0);
  }

  /**
   * Create step indicator dots
   */
  createStepIndicators() {
    let indicators = '';
    for (let i = 0; i < this.totalSteps; i++) {
      indicators += `<span class="step-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></span>`;
    }
    return indicators;
  }

  /**
   * Setup wizard event listeners
   */
  setupWizardListeners() {
    const nextBtn = document.getElementById('onboardingNext');
    const backBtn = document.getElementById('onboardingBack');
    const skipBtn = document.getElementById('skipOnboarding');
    
    nextBtn.addEventListener('click', () => this.handleNext());
    backBtn.addEventListener('click', () => this.handleBack());
    skipBtn.addEventListener('click', () => this.handleSkip());
    
    // Allow clicking on step dots to navigate
    document.querySelectorAll('.step-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const step = parseInt(dot.dataset.step);
        if (step < this.currentStep) {
          this.showStep(step);
        }
      });
    });
  }

  /**
   * Show a specific step
   */
  showStep(stepIndex) {
    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    const content = document.getElementById('onboardingContent');
    const nextBtn = document.getElementById('onboardingNext');
    const backBtn = document.getElementById('onboardingBack');
    
    // Update content with fade animation
    content.style.opacity = '0';
    setTimeout(() => {
      content.innerHTML = `
        <h2 class="onboarding-title">${step.title}</h2>
        ${step.content}
      `;
      content.style.opacity = '1';
      
      // Call onEnter callback if exists
      if (step.onEnter) {
        step.onEnter();
      }
      
      // Setup sample question clicks if on try-it step
      if (step.id === 'try-it') {
        this.setupSampleQuestions();
      }
    }, 300);
    
    // Update button text
    nextBtn.textContent = step.action;
    
    // Show/hide back button
    backBtn.style.display = stepIndex > 0 ? 'block' : 'none';
    
    // Update progress
    this.updateProgress();
  }

  /**
   * Setup sample question click handlers
   */
  setupSampleQuestions() {
    document.querySelectorAll('.sample-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const question = btn.dataset.question;
        // Visual feedback
        btn.classList.add('clicked');
        setTimeout(() => btn.classList.remove('clicked'), 600);
        
        // Store the sample question for later use
        chrome.storage.local.set({ sampleQuestion: question });
      });
    });
  }

  /**
   * Update progress indicators
   */
  updateProgress() {
    // Update progress bar
    const progressFill = document.querySelector('.progress-fill');
    progressFill.style.width = `${((this.currentStep + 1) / this.totalSteps) * 100}%`;
    
    // Update step dots
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === this.currentStep);
      dot.classList.toggle('completed', index < this.currentStep);
    });
  }

  /**
   * Handle next button click
   */
  async handleNext() {
    const step = this.steps[this.currentStep];
    
    // Validate current step if needed
    if (step.validate) {
      const validation = step.validate();
      if (!validation.valid) {
        this.showValidationError(validation.message);
        return;
      }
    }
    
    if (this.currentStep < this.totalSteps - 1) {
      this.showStep(this.currentStep + 1);
    } else {
      this.complete();
    }
  }

  /**
   * Handle back button click
   */
  handleBack() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  /**
   * Handle skip button click
   */
  handleSkip() {
    if (confirm('Are you sure you want to skip the tour? You can access settings later to configure the extension.')) {
      this.close();
      if (this.onSkip) {
        this.onSkip();
      }
    }
  }

  /**
   * Show validation error
   */
  showValidationError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.textContent = message;
    
    const content = document.getElementById('onboardingContent');
    const existing = content.querySelector('.validation-error');
    if (existing) {
      existing.remove();
    }
    
    content.appendChild(errorDiv);
    setTimeout(() => errorDiv.classList.add('show'), 10);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      errorDiv.classList.remove('show');
      setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
  }

  /**
   * Complete the onboarding
   */
  complete() {
    // Mark onboarding as completed
    chrome.storage.local.set({ onboardingCompleted: true });
    
    // Add completion animation
    const modal = document.querySelector('.onboarding-modal');
    modal.classList.add('completing');
    
    setTimeout(() => {
      this.close();
      if (this.onComplete) {
        this.onComplete();
      }
    }, 600);
  }

  /**
   * Close the wizard
   */
  close() {
    const wizard = document.getElementById('onboardingWizard');
    if (wizard) {
      wizard.classList.add('closing');
      setTimeout(() => wizard.remove(), 300);
    }
  }

  /**
   * Check if onboarding should be shown
   */
  static async shouldShow() {
    const { onboardingCompleted, apiKey } = await chrome.storage.local.get(['onboardingCompleted', 'apiKey']);
    return !onboardingCompleted || !apiKey;
  }

  /**
   * Reset onboarding (for testing or re-running)
   */
  static reset() {
    chrome.storage.local.remove('onboardingCompleted');
  }
}

// Export for use in popup.js
window.OnboardingWizard = OnboardingWizard;