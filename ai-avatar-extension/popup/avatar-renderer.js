/**
 * AI Avatar 3D Renderer for Masonry Layout
 * Handles 3D avatar display and animations with masonry card integration
 * Features: Responsive sizing, personality expressions, floating avatar, gesture recognition
 */

class AvatarRenderer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.avatar = null;
    this.animationId = null;
    this.isInitialized = false;
    
    // Masonry integration options
    this.options = {
      heroCanvas: options.heroCanvas || false,
      parentCard: options.parentCard || null,
      enableFloating: options.enableFloating !== false,
      enableGestures: options.enableGestures !== false,
      enablePersonality: options.enablePersonality !== false,
      enableHoverEffects: options.enableHoverEffects !== false,
      performanceMode: options.performanceMode || 'auto',
      targetFPS: options.targetFPS || 60,
      ...options
    };
    
    // Animation states
    this.currentAnimation = 'idle';
    this.animationMixer = null;
    this.clock = new THREE.Clock();
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    
    // Masonry-specific state
    this.isExpanded = false;
    this.isFloating = false;
    this.isHovered = false;
    this.isFocused = false;
    this.masonryEvents = new EventTarget();
    
    // Personality and expressions
    this.personality = {
      mood: 'neutral',
      energy: 0.5,
      engagement: 0.5,
      confidence: 0.8,
      expressiveness: 0.7
    };
    
    // Performance monitoring
    this.performanceMetrics = {
      renderTime: 0,
      frameRate: 0,
      memoryUsage: 0,
      lastOptimization: Date.now()
    };
    
    // Gesture recognition
    this.gestureState = {
      isTracking: false,
      lastPosition: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      gestures: []
    };
    
    this.init();
  }

  /**
   * Initialize the 3D scene and avatar with masonry integration
   */
  async init() {
    try {
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupLighting();
      await this.createAvatar();
      this.setupMasonryIntegration();
      this.setupPerformanceMonitoring();
      this.startRenderLoop();
      this.isInitialized = true;
      
      // Emit ready event
      this.masonryEvents.dispatchEvent(new CustomEvent('avatarReady', {
        detail: { renderer: this }
      }));
    } catch (error) {
      console.error('Avatar initialization failed:', error);
      this.showFallback();
    }
  }

  /**
   * Setup WebGL renderer with masonry optimizations
   */
  setupRenderer() {
    // Determine optimal settings based on canvas size and performance mode
    const canvasWidth = this.canvas.clientWidth || 400;
    const canvasHeight = this.canvas.clientHeight || 300;
    const isHeroCanvas = this.options.heroCanvas || (canvasWidth > 350);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: isHeroCanvas && this.options.performanceMode !== 'low',
      alpha: true,
      powerPreference: isHeroCanvas ? 'high-performance' : 'low-power',
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: false
    });
    
    // Responsive sizing for masonry layout
    this.updateCanvasSize();
    
    // Optimize pixel ratio based on performance mode
    const pixelRatio = this.getOptimalPixelRatio();
    this.renderer.setPixelRatio(pixelRatio);
    
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = isHeroCanvas;
    this.renderer.shadowMap.type = isHeroCanvas ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    
    // Performance optimizations
    this.renderer.info.autoReset = false;
    this.renderer.sortObjects = false;
    this.renderer.autoClear = false;
  }

  /**
   * Setup 3D scene with dynamic theming
   */
  setupScene() {
    this.scene = new THREE.Scene();
    
    // Dynamic background based on theme
    this.updateSceneTheme();
    
    // Add subtle fog for depth (performance-aware)
    if (this.options.heroCanvas) {
      this.scene.fog = new THREE.Fog(0xf8f9fa, 10, 50);
    }
  }

  /**
   * Setup camera with responsive positioning
   */
  setupCamera() {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      this.options.heroCanvas ? 45 : 50,
      aspect,
      0.1,
      100
    );
    
    // Responsive camera positioning
    this.updateCameraPosition();
  }

  /**
   * Setup lighting with performance optimization
   */
  setupLighting() {
    // Ambient light for overall illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Main directional light (performance-aware)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 10, 5);
    
    if (this.options.heroCanvas) {
      this.directionalLight.castShadow = true;
      this.directionalLight.shadow.mapSize.width = 1024;
      this.directionalLight.shadow.mapSize.height = 1024;
      this.directionalLight.shadow.camera.near = 0.5;
      this.directionalLight.shadow.camera.far = 50;
    }
    this.scene.add(this.directionalLight);

    // Fill light from the other side
    this.fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    this.fillLight.position.set(-5, 5, -5);
    this.scene.add(this.fillLight);

    // Rim light for edge definition (hero canvas only)
    if (this.options.heroCanvas) {
      this.rimLight = new THREE.DirectionalLight(0x667eea, 0.2);
      this.rimLight.position.set(0, 5, -10);
      this.scene.add(this.rimLight);
    }
  }

  /**
   * Create the avatar character with enhanced features
   */
  async createAvatar() {
    const avatarGroup = new THREE.Group();
    
    // Scale avatar based on canvas size
    const scale = this.options.heroCanvas ? 1.2 : 0.8;
    avatarGroup.scale.set(scale, scale, scale);

    // Head with improved geometry
    const headGeometry = new THREE.SphereGeometry(0.3, this.options.heroCanvas ? 32 : 16, this.options.heroCanvas ? 32 : 16);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xfdbcb4,
      transparent: true,
      opacity: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    if (this.options.heroCanvas) head.castShadow = true;
    avatarGroup.add(head);

    // Eyes with personality expressions
    const eyeGeometry = new THREE.SphereGeometry(0.05, 12, 12);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.85, 0.25);
    avatarGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.85, 0.25);
    avatarGroup.add(rightEye);
    
    // Add eyebrows for expressions
    const eyebrowGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
    const eyebrowMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.1, 1.92, 0.25);
    leftEyebrow.rotation.z = -0.2;
    avatarGroup.add(leftEyebrow);
    
    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.1, 1.92, 0.25);
    rightEyebrow.rotation.z = 0.2;
    avatarGroup.add(rightEyebrow);

    // Body with gradient-like effect
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.8, this.options.heroCanvas ? 16 : 12);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x667eea,
      transparent: true,
      opacity: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.2;
    if (this.options.heroCanvas) body.castShadow = true;
    avatarGroup.add(body);

    // Arms with better geometry
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, 1.2, 0);
    leftArm.rotation.z = 0.3;
    if (this.options.heroCanvas) leftArm.castShadow = true;
    avatarGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.35, 1.2, 0);
    rightArm.rotation.z = -0.3;
    if (this.options.heroCanvas) rightArm.castShadow = true;
    avatarGroup.add(rightArm);
    
    // Add hands for gestures
    const handGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const handMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
    
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(-0.5, 0.9, 0);
    avatarGroup.add(leftHand);
    
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0.5, 0.9, 0);
    avatarGroup.add(rightHand);

    // Ground plane for shadows (hero canvas only)
    if (this.options.heroCanvas) {
      const groundGeometry = new THREE.PlaneGeometry(10, 10);
      const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);
    }

    this.avatar = avatarGroup;
    this.scene.add(avatarGroup);

    // Store references for animations and expressions
    this.avatarParts = {
      head,
      leftEye,
      rightEye,
      leftEyebrow,
      rightEyebrow,
      body,
      leftArm,
      rightArm,
      leftHand,
      rightHand
    };

    // Start idle animation
    this.startIdleAnimation();
  }

  /**
   * Start idle animation with personality
   */
  startIdleAnimation() {
    this.currentAnimation = 'idle';
    
    const breathingAnimation = () => {
      if (this.currentAnimation !== 'idle' || !this.avatar) return;
      
      const time = Date.now() * 0.001;
      const baseScale = this.options.heroCanvas ? 1.2 : 0.8;
      
      // Breathing motion with personality influence
      const breathingIntensity = 0.02 * this.personality.energy;
      this.avatar.scale.y = baseScale + Math.sin(time * 2) * breathingIntensity;
      
      // Subtle head movement based on engagement
      const headMovement = 0.1 * this.personality.engagement;
      this.avatarParts.head.rotation.y = Math.sin(time * 0.5) * headMovement;
      this.avatarParts.head.rotation.x = Math.sin(time * 0.3) * (headMovement * 0.5);
      
      // Eyebrow expressions based on mood
      if (this.avatarParts.leftEyebrow && this.avatarParts.rightEyebrow) {
        const eyebrowOffset = this.getMoodEyebrowOffset();
        this.avatarParts.leftEyebrow.rotation.z = -0.2 + eyebrowOffset;
        this.avatarParts.rightEyebrow.rotation.z = 0.2 - eyebrowOffset;
      }
      
      // Eye blinking with personality
      const blinkFrequency = 0.005 + (this.personality.energy * 0.01);
      if (Math.random() < blinkFrequency) {
        this.blink();
      }
      
      // Occasional personality gestures
      if (Math.random() < 0.001 && this.personality.expressiveness > 0.5) {
        this.playPersonalityGesture();
      }
      
      requestAnimationFrame(breathingAnimation);
    };
    
    breathingAnimation();
  }

  /**
   * Eye blinking animation with expression
   */
  blink() {
    const duration = 150 + (Math.random() * 100); // Variable blink duration
    const startTime = Date.now();
    
    const blinkAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Scale eyes down and back up with personality influence
      const blinkIntensity = 0.8 + (this.personality.expressiveness * 0.2);
      const scale = progress < 0.5 
        ? 1 - (progress * 2) * blinkIntensity 
        : (1 - blinkIntensity) + ((progress - 0.5) * 2) * blinkIntensity;
      
      this.avatarParts.leftEye.scale.y = scale;
      this.avatarParts.rightEye.scale.y = scale;
      
      if (progress < 1) {
        requestAnimationFrame(blinkAnimation);
      }
    };
    
    blinkAnimation();
  }

  /**
   * Thinking animation with masonry card interaction
   */
  startThinkingAnimation() {
    this.currentAnimation = 'thinking';
    this.updatePersonality({ mood: 'contemplative', engagement: 0.8 });
    
    const thinkingAnimation = () => {
      if (this.currentAnimation !== 'thinking' || !this.avatar) return;
      
      const time = Date.now() * 0.001;
      
      // Head tilting with personality influence
      const tiltIntensity = 0.2 * this.personality.confidence;
      this.avatarParts.head.rotation.z = Math.sin(time * 1.5) * tiltIntensity;
      this.avatarParts.head.rotation.y = Math.sin(time * 0.8) * (tiltIntensity * 1.5);
      
      // Hand to chin gesture
      if (this.avatarParts.rightHand) {
        this.avatarParts.rightHand.position.x = 0.3 + Math.sin(time * 2) * 0.1;
        this.avatarParts.rightHand.position.y = 1.4 + Math.sin(time * 1.5) * 0.05;
      }
      
      // Body swaying
      this.avatar.rotation.y = Math.sin(time * 0.6) * 0.1;
      
      // Eyebrow furrow for concentration
      if (this.avatarParts.leftEyebrow && this.avatarParts.rightEyebrow) {
        this.avatarParts.leftEyebrow.rotation.z = -0.1;
        this.avatarParts.rightEyebrow.rotation.z = 0.1;
      }
      
      requestAnimationFrame(thinkingAnimation);
    };
    
    thinkingAnimation();
  }

  /**
   * Speaking animation with enhanced gestures
   */
  startSpeakingAnimation() {
    this.currentAnimation = 'speaking';
    this.updatePersonality({ mood: 'engaging', energy: 0.8, engagement: 0.9 });
    
    const speakingAnimation = () => {
      if (this.currentAnimation !== 'speaking' || !this.avatar) return;
      
      const time = Date.now() * 0.001;
      const gestureIntensity = this.personality.expressiveness;
      
      // Animated gestures with personality
      this.avatarParts.leftArm.rotation.z = 0.3 + Math.sin(time * 3) * (0.2 * gestureIntensity);
      this.avatarParts.rightArm.rotation.z = -0.3 + Math.sin(time * 3 + 1) * (0.2 * gestureIntensity);
      
      // Hand gestures
      if (this.avatarParts.leftHand && this.avatarParts.rightHand) {
        this.avatarParts.leftHand.position.y = 0.9 + Math.sin(time * 4) * 0.1;
        this.avatarParts.rightHand.position.y = 0.9 + Math.sin(time * 4 + 0.5) * 0.1;
      }
      
      // Head movement while speaking
      this.avatarParts.head.rotation.y = Math.sin(time * 2) * (0.15 * this.personality.engagement);
      this.avatarParts.head.rotation.x = Math.sin(time * 1.5) * 0.05;
      
      // Body emphasis
      this.avatar.position.y = Math.sin(time * 4) * 0.02;
      
      // Eyebrow expressions
      if (this.avatarParts.leftEyebrow && this.avatarParts.rightEyebrow) {
        this.avatarParts.leftEyebrow.rotation.z = -0.2 + Math.sin(time * 2) * 0.1;
        this.avatarParts.rightEyebrow.rotation.z = 0.2 - Math.sin(time * 2) * 0.1;
      }
      
      requestAnimationFrame(speakingAnimation);
    };
    
    speakingAnimation();
  }

  /**
   * Greeting animation with masonry card interaction
   */
  playGreetingAnimation() {
    this.currentAnimation = 'greeting';
    this.updatePersonality({ mood: 'friendly', energy: 0.9, engagement: 1.0 });
    
    const duration = 2000;
    const startTime = Date.now();
    
    // Trigger card effect if available
    this.triggerCardEffect('greeting');
    
    const greetingAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Enhanced wave animation
      const waveIntensity = Math.sin(progress * Math.PI * 4) * (1 - progress);
      this.avatarParts.rightArm.rotation.z = -0.3 + waveIntensity * 0.8;
      
      // Hand wave motion
      if (this.avatarParts.rightHand) {
        this.avatarParts.rightHand.rotation.y = Math.sin(progress * Math.PI * 8) * 0.5;
      }
      
      // Enthusiastic head nod
      this.avatarParts.head.rotation.x = Math.sin(progress * Math.PI * 2) * 0.2;
      
      // Body bounce
      this.avatar.position.y = Math.sin(progress * Math.PI * 3) * 0.05;
      
      // Happy eyebrow expression
      if (this.avatarParts.leftEyebrow && this.avatarParts.rightEyebrow) {
        this.avatarParts.leftEyebrow.rotation.z = -0.1;
        this.avatarParts.rightEyebrow.rotation.z = 0.1;
      }
      
      if (progress < 1) {
        requestAnimationFrame(greetingAnimation);
      } else {
        this.startIdleAnimation();
      }
    };
    
    greetingAnimation();
  }

  /**
   * Start optimized render loop with FPS monitoring
   */
  startRenderLoop() {
    let lastTime = 0;
    const targetFrameTime = 1000 / this.options.targetFPS;
    
    const render = (currentTime) => {
      // FPS throttling for performance
      if (currentTime - lastTime < targetFrameTime && this.options.performanceMode !== 'high') {
        this.animationId = requestAnimationFrame(render);
        return;
      }
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(deltaTime);
      
      // Adaptive quality based on performance
      this.adaptiveQuality();
      
      if (this.renderer && this.scene && this.camera) {
        // Clear manually for better control
        this.renderer.clear();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        // Reset info for next frame
        this.renderer.info.reset();
      }
      
      this.animationId = requestAnimationFrame(render);
    };
    
    this.animationId = requestAnimationFrame(render);
  }

  /**
   * Handle window resize with masonry layout support
   */
  handleResize() {
    if (!this.camera || !this.renderer) return;
    
    this.updateCanvasSize();
    this.updateCameraPosition();
    
    // Emit resize event for masonry integration
    this.masonryEvents.dispatchEvent(new CustomEvent('avatarResize', {
      detail: { 
        width: this.canvas.clientWidth,
        height: this.canvas.clientHeight,
        isHeroCanvas: this.options.heroCanvas
      }
    }));
  }

  /**
   * Show fallback when 3D fails with masonry styling
   */
  showFallback() {
    this.canvas.style.display = 'none';
    
    const fallback = document.createElement('div');
    fallback.className = 'avatar-fallback masonry-fallback';
    fallback.innerHTML = `
      <div class="fallback-avatar">🤖</div>
      <div class="fallback-text">AI Avatar Ready</div>
      <div class="fallback-status">3D rendering unavailable</div>
    `;
    
    // Add masonry-aware styling
    const style = document.createElement('style');
    style.textContent = `
      .avatar-fallback.masonry-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: linear-gradient(135deg, var(--gradient-primary));
        border-radius: var(--radius-lg, 12px);
        color: white;
        position: relative;
        overflow: hidden;
      }
      .masonry-fallback::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
        opacity: 0.3;
      }
      .masonry-fallback .fallback-avatar {
        font-size: ${this.options.heroCanvas ? '64px' : '48px'};
        margin-bottom: 12px;
        animation: bounce 2s infinite;
        z-index: 1;
      }
      .masonry-fallback .fallback-text {
        font-size: ${this.options.heroCanvas ? '18px' : '14px'};
        font-weight: 600;
        margin-bottom: 4px;
        z-index: 1;
      }
      .masonry-fallback .fallback-status {
        font-size: 12px;
        opacity: 0.8;
        z-index: 1;
      }
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
    `;
    
    document.head.appendChild(style);
    this.canvas.parentNode.appendChild(fallback);
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.scene) {
      this.scene.clear();
    }
  }

  /**
   * Public methods for controlling avatar
   */
  setThinking(isThinking) {
    if (isThinking) {
      this.startThinkingAnimation();
    } else {
      this.startIdleAnimation();
    }
  }

  setSpeaking(isSpeaking) {
    if (isSpeaking) {
      this.startSpeakingAnimation();
    } else {
      this.startIdleAnimation();
    }
  }

  greet() {
    this.playGreetingAnimation();
  }

  /**
   * ==============================================
   * MASONRY INTEGRATION METHODS
   * ==============================================
   */

  /**
   * Setup masonry layout integration
   */
  setupMasonryIntegration() {
    if (!this.options.parentCard) {
      this.options.parentCard = this.canvas.closest('.card, .masonry-item');
    }
    
    this.setupMasonryEventListeners();
    this.setupGestureRecognition();
    this.setupCardInteractions();
    
    // Initial responsive setup
    this.updateCanvasSize();
    this.updateCameraPosition();
  }

  /**
   * Setup masonry event listeners
   */
  setupMasonryEventListeners() {
    if (!this.options.parentCard) return;
    
    // Card hover effects
    this.options.parentCard.addEventListener('mouseenter', this.handleCardHover.bind(this));
    this.options.parentCard.addEventListener('mouseleave', this.handleCardLeave.bind(this));
    
    // Card focus effects
    this.options.parentCard.addEventListener('focusin', this.handleCardFocus.bind(this));
    this.options.parentCard.addEventListener('focusout', this.handleCardBlur.bind(this));
    
    // Card expansion/collapse
    document.addEventListener('cardExpanded', this.handleCardExpanded.bind(this));
    document.addEventListener('cardCollapsed', this.handleCardCollapsed.bind(this));
    
    // Theme changes
    document.addEventListener('themeChanged', this.handleThemeChange.bind(this));
    
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Masonry layout changes
    document.addEventListener('masonryLayoutChanged', this.handleLayoutChange.bind(this));
  }

  /**
   * Remove masonry event listeners
   */
  removeMasonryEventListeners() {
    if (!this.options.parentCard) return;
    
    this.options.parentCard.removeEventListener('mouseenter', this.handleCardHover.bind(this));
    this.options.parentCard.removeEventListener('mouseleave', this.handleCardLeave.bind(this));
    this.options.parentCard.removeEventListener('focusin', this.handleCardFocus.bind(this));
    this.options.parentCard.removeEventListener('focusout', this.handleCardBlur.bind(this));
    
    document.removeEventListener('cardExpanded', this.handleCardExpanded.bind(this));
    document.removeEventListener('cardCollapsed', this.handleCardCollapsed.bind(this));
    document.removeEventListener('themeChanged', this.handleThemeChange.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('masonryLayoutChanged', this.handleLayoutChange.bind(this));
  }

  /**
   * Update canvas size responsively
   */
  updateCanvasSize() {
    const width = this.canvas.clientWidth || (this.options.heroCanvas ? 400 : 280);
    const height = this.canvas.clientHeight || (this.options.heroCanvas ? 300 : 200);
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    // Update hero canvas flag based on size
    this.options.heroCanvas = width > 350;
  }

  /**
   * Update camera position based on canvas size
   */
  updateCameraPosition() {
    const distance = this.options.heroCanvas ? 3 : 2.5;
    const height = this.options.heroCanvas ? 1.6 : 1.4;
    
    this.camera.position.set(0, height, distance);
    this.camera.lookAt(0, height, 0);
  }

  /**
   * Update scene theme based on document theme
   */
  updateSceneTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDark ? 0x1e293b : 0xf8f9fa;
    
    if (!this.scene.background) {
      this.scene.background = new THREE.Color(bgColor);
    } else {
      this.scene.background.setHex(bgColor);
    }
    
    // Update lighting for theme
    if (this.ambientLight) {
      this.ambientLight.intensity = isDark ? 0.4 : 0.6;
    }
    if (this.directionalLight) {
      this.directionalLight.intensity = isDark ? 0.6 : 0.8;
    }
  }

  /**
   * Get optimal pixel ratio for performance
   */
  getOptimalPixelRatio() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    switch (this.options.performanceMode) {
      case 'low':
        return 1;
      case 'medium':
        return Math.min(devicePixelRatio, 1.5);
      case 'high':
        return Math.min(devicePixelRatio, 2);
      default: // auto
        return this.options.heroCanvas ? Math.min(devicePixelRatio, 2) : 1;
    }
  }

  /**
   * ==============================================
   * CARD INTERACTION HANDLERS
   * ==============================================
   */

  /**
   * Handle card hover
   */
  handleCardHover(event) {
    this.isHovered = true;
    this.updatePersonality({ energy: 0.8, engagement: 0.9 });
    this.playHoverAnimation();
    this.triggerCardEffect('hover');
  }

  /**
   * Handle card leave
   */
  handleCardLeave(event) {
    this.isHovered = false;
    this.updatePersonality({ energy: 0.5, engagement: 0.6 });
    
    if (this.currentAnimation === 'hover') {
      this.startIdleAnimation();
    }
  }

  /**
   * Handle card focus
   */
  handleCardFocus(event) {
    this.isFocused = true;
    this.updatePersonality({ engagement: 1.0, confidence: 0.9 });
    this.playFocusAnimation();
  }

  /**
   * Handle card blur
   */
  handleCardBlur(event) {
    this.isFocused = false;
    this.updatePersonality({ engagement: 0.6, confidence: 0.8 });
  }

  /**
   * Handle card expansion
   */
  handleCardExpanded(event) {
    if (event.detail && event.detail.card === this.options.parentCard) {
      this.isExpanded = true;
      this.playExpansionAnimation();
      this.updatePersonality({ mood: 'excited', energy: 0.9 });
    }
  }

  /**
   * Handle card collapse
   */
  handleCardCollapsed(event) {
    if (event.detail && event.detail.card === this.options.parentCard) {
      this.isExpanded = false;
      
      if (this.options.enableFloating) {
        this.createFloatingAvatar();
      }
      
      this.updatePersonality({ mood: 'neutral', energy: 0.5 });
    }
  }

  /**
   * Handle theme change
   */
  handleThemeChange(event) {
    this.updateSceneTheme();
    this.playThemeChangeAnimation();
  }

  /**
   * Handle layout change
   */
  handleLayoutChange(event) {
    this.updateCanvasSize();
    this.updateCameraPosition();
  }

  /**
   * ==============================================
   * NEW ANIMATION METHODS
   * ==============================================
   */

  /**
   * Play hover animation
   */
  playHoverAnimation() {
    this.currentAnimation = 'hover';
    
    const hoverAnimation = () => {
      if (this.currentAnimation !== 'hover' || !this.avatar) return;
      
      const time = Date.now() * 0.001;
      
      // Gentle float effect
      this.avatar.position.y = Math.sin(time * 3) * 0.03;
      
      // Slight scale increase
      const scale = (this.options.heroCanvas ? 1.2 : 0.8) * 1.05;
      this.avatar.scale.set(scale, scale, scale);
      
      // Head tracking (follow cursor)
      if (this.gestureState.lastPosition) {
        const normalizedX = (this.gestureState.lastPosition.x / this.canvas.clientWidth - 0.5) * 0.3;
        const normalizedY = (this.gestureState.lastPosition.y / this.canvas.clientHeight - 0.5) * -0.2;
        
        this.avatarParts.head.rotation.y = normalizedX;
        this.avatarParts.head.rotation.x = normalizedY;
      }
      
      requestAnimationFrame(hoverAnimation);
    };
    
    hoverAnimation();
  }

  /**
   * Play focus animation
   */
  playFocusAnimation() {
    // Add subtle glow effect to avatar
    if (this.avatarParts.body && this.avatarParts.body.material) {
      this.avatarParts.body.material.emissive.setHex(0x667eea);
      this.avatarParts.body.material.emissiveIntensity = 0.1;
    }
    
    // Attention gesture
    this.playAttentionGesture();
  }

  /**
   * Play expansion animation
   */
  playExpansionAnimation() {
    const duration = 500;
    const startTime = Date.now();
    const initialScale = this.avatar.scale.x;
    const targetScale = initialScale * 1.1;
    
    const expansionAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      const scale = initialScale + (targetScale - initialScale) * easeProgress;
      this.avatar.scale.set(scale, scale, scale);
      
      if (progress < 1) {
        requestAnimationFrame(expansionAnimation);
      }
    };
    
    expansionAnimation();
  }

  /**
   * Play theme change animation
   */
  playThemeChangeAnimation() {
    // Flash effect
    const duration = 300;
    const startTime = Date.now();
    
    const themeAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Pulse effect
      const intensity = Math.sin(progress * Math.PI) * 0.3;
      
      if (this.avatarParts.body && this.avatarParts.body.material) {
        this.avatarParts.body.material.emissiveIntensity = intensity;
      }
      
      if (progress < 1) {
        requestAnimationFrame(themeAnimation);
      } else {
        // Reset emissive
        if (this.avatarParts.body && this.avatarParts.body.material) {
          this.avatarParts.body.material.emissiveIntensity = 0;
        }
      }
    };
    
    themeAnimation();
  }

  /**
   * ==============================================
   * PERSONALITY AND EXPRESSION METHODS
   * ==============================================
   */

  /**
   * Update avatar personality
   */
  updatePersonality(updates) {
    Object.assign(this.personality, updates);
    this.masonryEvents.dispatchEvent(new CustomEvent('personalityChanged', {
      detail: { personality: this.personality }
    }));
  }

  /**
   * Get mood-based eyebrow offset
   */
  getMoodEyebrowOffset() {
    switch (this.personality.mood) {
      case 'happy':
      case 'excited':
        return 0.1;
      case 'sad':
      case 'disappointed':
        return -0.1;
      case 'angry':
      case 'frustrated':
        return -0.2;
      case 'surprised':
        return 0.15;
      case 'contemplative':
      case 'thinking':
        return -0.05;
      default:
        return 0;
    }
  }

  /**
   * Play personality gesture
   */
  playPersonalityGesture() {
    const gestures = [
      'headNod',
      'armStretch',
      'bodyTwist',
      'shoulderShrug'
    ];
    
    const gesture = gestures[Math.floor(Math.random() * gestures.length)];
    this.playGesture(gesture);
  }

  /**
   * Play specific gesture
   */
  playGesture(gestureType) {
    const duration = 1000;
    const startTime = Date.now();
    
    const gestureAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = Math.sin(progress * Math.PI);
      
      switch (gestureType) {
        case 'headNod':
          this.avatarParts.head.rotation.x = Math.sin(progress * Math.PI * 2) * 0.2;
          break;
        case 'armStretch':
          this.avatarParts.leftArm.rotation.z = 0.3 + easeProgress * 0.5;
          this.avatarParts.rightArm.rotation.z = -0.3 - easeProgress * 0.5;
          break;
        case 'bodyTwist':
          this.avatar.rotation.y = Math.sin(progress * Math.PI) * 0.3;
          break;
        case 'shoulderShrug':
          this.avatarParts.body.position.y = 1.2 + easeProgress * 0.1;
          break;
      }
      
      if (progress < 1) {
        requestAnimationFrame(gestureAnimation);
      }
    };
    
    gestureAnimation();
  }

  /**
   * Play attention gesture
   */
  playAttentionGesture() {
    // Straighten posture
    const duration = 500;
    const startTime = Date.now();
    
    const attentionAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Straighten head
      this.avatarParts.head.rotation.x = 0;
      this.avatarParts.head.rotation.y = 0;
      
      // Alert posture
      const scale = (this.options.heroCanvas ? 1.2 : 0.8) * (1 + progress * 0.02);
      this.avatar.scale.set(scale, scale, scale);
      
      if (progress < 1) {
        requestAnimationFrame(attentionAnimation);
      }
    };
    
    attentionAnimation();
  }

  /**
   * Set avatar mood with content analysis
   */
  setMoodFromContent(contentAnalysis) {
    const { sentiment, complexity, topics } = contentAnalysis;
    
    let mood = 'neutral';
    let energy = 0.5;
    let engagement = 0.6;
    
    // Determine mood from sentiment
    if (sentiment > 0.3) {
      mood = 'happy';
      energy = 0.7;
      engagement = 0.8;
    } else if (sentiment < -0.3) {
      mood = 'concerned';
      energy = 0.4;
      engagement = 0.9;
    }
    
    // Adjust based on complexity
    if (complexity === 'high') {
      mood = 'contemplative';
      engagement = 1.0;
    }
    
    // Adjust based on topics
    if (topics.includes('technology') || topics.includes('AI')) {
      mood = 'excited';
      energy = 0.8;
    }
    
    this.updatePersonality({ mood, energy, engagement });
  }

  /**
   * Express emotion
   */
  expressEmotion(emotion, intensity = 1.0) {
    this.updatePersonality({ 
      mood: emotion,
      expressiveness: intensity,
      energy: Math.min(1.0, this.personality.energy + intensity * 0.3)
    });
    
    // Play appropriate animation
    switch (emotion) {
      case 'happy':
      case 'excited':
        this.playGesture('headNod');
        break;
      case 'thinking':
      case 'contemplative':
        this.startThinkingAnimation();
        setTimeout(() => this.startIdleAnimation(), 3000);
        break;
      case 'surprised':
        this.playGesture('bodyTwist');
        break;
      default:
        this.playPersonalityGesture();
    }
  }

  /**
   * ==============================================
   * FLOATING AVATAR METHODS
   * ==============================================
   */

  /**
   * Create floating avatar when card is collapsed
   */
  createFloatingAvatar() {
    if (this.floatingAvatar || !this.options.enableFloating) return;
    
    const floatingContainer = document.createElement('div');
    floatingContainer.className = 'floating-avatar';
    floatingContainer.innerHTML = `
      <canvas class="floating-avatar-canvas" width="80" height="80"></canvas>
      <div class="floating-avatar-indicator"></div>
    `;
    
    // Add floating avatar styles
    const style = document.createElement('style');
    style.textContent = `
      .floating-avatar {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      .floating-avatar:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
      }
      .floating-avatar-canvas {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }
      .floating-avatar-indicator {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 12px;
        height: 12px;
        background: #48bb78;
        border-radius: 50%;
        border: 2px solid white;
        animation: pulse 2s infinite;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(floatingContainer);
    
    // Create mini avatar renderer
    const canvas = floatingContainer.querySelector('.floating-avatar-canvas');
    this.floatingAvatar = new AvatarRenderer(canvas.id || 'floatingAvatarCanvas', {
      heroCanvas: false,
      enableFloating: false,
      performanceMode: 'low',
      targetFPS: 30
    });
    
    // Click to restore card
    floatingContainer.addEventListener('click', () => {
      this.restoreCard();
    });
    
    // Auto-hide after delay
    setTimeout(() => {
      if (this.floatingAvatar) {
        floatingContainer.style.opacity = '0.7';
      }
    }, 10000);
  }

  /**
   * Destroy floating avatar
   */
  destroyFloatingAvatar() {
    if (this.floatingAvatar) {
      this.floatingAvatar.dispose();
      const container = document.querySelector('.floating-avatar');
      if (container) {
        container.remove();
      }
      this.floatingAvatar = null;
    }
  }

  /**
   * Restore card from floating state
   */
  restoreCard() {
    if (this.options.parentCard) {
      // Expand the parent card
      this.options.parentCard.classList.add('expanded');
      
      // Dispatch restore event
      this.options.parentCard.dispatchEvent(new CustomEvent('cardRestore', {
        detail: { card: this.options.parentCard }
      }));
    }
    
    this.destroyFloatingAvatar();
  }

  /**
   * ==============================================
   * GESTURE RECOGNITION METHODS
   * ==============================================
   */

  /**
   * Setup gesture recognition
   */
  setupGestureRecognition() {
    if (!this.options.enableGestures) return;
    
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }

  /**
   * Handle mouse move for gesture tracking
   */
  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.updateGestureState(x, y);
  }

  /**
   * Handle click gestures
   */
  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Determine click region
    const centerX = this.canvas.clientWidth / 2;
    const centerY = this.canvas.clientHeight / 2;
    
    if (Math.abs(x - centerX) < 50 && Math.abs(y - centerY) < 50) {
      // Clicked on avatar
      this.playInteractionGesture();
    }
  }

  /**
   * Update gesture state
   */
  updateGestureState(x, y) {
    const prevPosition = this.gestureState.lastPosition;
    
    if (prevPosition.x !== 0 || prevPosition.y !== 0) {
      this.gestureState.velocity.x = x - prevPosition.x;
      this.gestureState.velocity.y = y - prevPosition.y;
    }
    
    this.gestureState.lastPosition = { x, y };
    
    // Track gesture for head following in hover animation
    if (this.currentAnimation === 'hover') {
      // Head following is handled in playHoverAnimation
    }
  }

  /**
   * Play interaction gesture
   */
  playInteractionGesture() {
    const gestures = ['wave', 'nod', 'blink', 'smile'];
    const gesture = gestures[Math.floor(Math.random() * gestures.length)];
    
    switch (gesture) {
      case 'wave':
        this.playGreetingAnimation();
        break;
      case 'nod':
        this.playGesture('headNod');
        break;
      case 'blink':
        this.blink();
        break;
      case 'smile':
        this.expressEmotion('happy', 0.8);
        break;
    }
  }

  /**
   * Add touch event handlers
   */
  handleTouchStart(event) {
    this.gestureState.isTracking = true;
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.updateGestureState(x, y);
  }

  handleTouchMove(event) {
    if (!this.gestureState.isTracking) return;
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.updateGestureState(x, y);
  }

  handleTouchEnd(event) {
    this.gestureState.isTracking = false;
    this.playInteractionGesture();
  }

  /**
   * ==============================================
   * PERFORMANCE MONITORING METHODS
   * ==============================================
   */

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.name.includes('avatar-render')) {
          this.performanceMetrics.renderTime = entry.duration;
        }
      });
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(deltaTime) {
    this.frameCount++;
    
    // Calculate FPS
    if (this.frameCount % 60 === 0) {
      this.fps = 1000 / deltaTime;
      this.performanceMetrics.frameRate = this.fps;
      
      // Memory usage (if available)
      if (performance.memory) {
        this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
      }
    }
  }

  /**
   * Adaptive quality based on performance
   */
  adaptiveQuality() {
    const now = Date.now();
    if (now - this.performanceMetrics.lastOptimization < 5000) return;
    
    // Adjust quality based on FPS
    if (this.fps < 30 && this.options.performanceMode === 'auto') {
      // Reduce quality
      this.renderer.setPixelRatio(1);
      if (this.directionalLight) {
        this.directionalLight.castShadow = false;
      }
    } else if (this.fps > 50 && this.options.performanceMode === 'auto') {
      // Increase quality
      const optimalRatio = this.getOptimalPixelRatio();
      this.renderer.setPixelRatio(optimalRatio);
      if (this.directionalLight && this.options.heroCanvas) {
        this.directionalLight.castShadow = true;
      }
    }
    
    this.performanceMetrics.lastOptimization = now;
  }

  /**
   * ==============================================
   * UTILITY METHODS
   * ==============================================
   */

  /**
   * Trigger card visual effect
   */
  triggerCardEffect(effectType) {
    if (!this.options.parentCard) return;
    
    const card = this.options.parentCard;
    
    switch (effectType) {
      case 'hover':
        card.style.transform = 'translateY(-2px) scale(1.01)';
        break;
      case 'greeting':
        card.classList.add('avatar-greeting');
        setTimeout(() => card.classList.remove('avatar-greeting'), 2000);
        break;
      case 'thinking':
        card.classList.add('avatar-thinking');
        break;
      case 'speaking':
        card.classList.add('avatar-speaking');
        break;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      fps: this.fps,
      frameCount: this.frameCount,
      isHeroCanvas: this.options.heroCanvas
    };
  }

  /**
   * Update from masonry layout events
   */
  onMasonryEvent(eventType, data) {
    switch (eventType) {
      case 'cardExpanded':
        this.handleCardExpanded({ detail: data });
        break;
      case 'cardCollapsed':
        this.handleCardCollapsed({ detail: data });
        break;
      case 'themeChanged':
        this.handleThemeChange({ detail: data });
        break;
      case 'layoutChanged':
        this.handleLayoutChange({ detail: data });
        break;
    }
  }

  /**
   * Setup card interaction observers
   */
  setupCardInteractions() {
    if (!this.options.parentCard) return;
    
    // Add CSS classes for avatar card effects
    const style = document.createElement('style');
    style.textContent = `
      .card.avatar-greeting {
        animation: avatarCardGreeting 2s ease;
      }
      .card.avatar-thinking {
        border-left: 4px solid var(--primary-color);
      }
      .card.avatar-speaking {
        box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
      }
      @keyframes avatarCardGreeting {
        0%, 100% { transform: translateY(0) scale(1); }
        25% { transform: translateY(-5px) scale(1.02); }
        75% { transform: translateY(-2px) scale(1.01); }
      }
    `;
    
    if (!document.querySelector('#avatar-card-styles')) {
      style.id = 'avatar-card-styles';
      document.head.appendChild(style);
    }
  }
}

