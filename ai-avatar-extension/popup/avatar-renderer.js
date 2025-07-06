/**
 * AI Avatar 3D Renderer
 * Handles 3D avatar display and animations within the Chrome extension popup
 */

class AvatarRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.avatar = null;
    this.animationId = null;
    this.isInitialized = false;
    
    // Animation states
    this.currentAnimation = 'idle';
    this.animationMixer = null;
    this.clock = new THREE.Clock();
    
    this.init();
  }

  /**
   * Initialize the 3D scene and avatar
   */
  async init() {
    try {
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupLighting();
      await this.createAvatar();
      this.startRenderLoop();
      this.isInitialized = true;
    } catch (error) {
      console.error('Avatar initialization failed:', error);
      this.showFallback();
    }
  }

  /**
   * Setup WebGL renderer
   */
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * Setup 3D scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);
    
    // Add subtle fog for depth
    this.scene.fog = new THREE.Fog(0xf8f9fa, 10, 50);
  }

  /**
   * Setup camera
   */
  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      100
    );
    
    this.camera.position.set(0, 1.6, 3);
    this.camera.lookAt(0, 1.6, 0);
  }

  /**
   * Setup lighting
   */
  setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    // Fill light from the other side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0x667eea, 0.2);
    rimLight.position.set(0, 5, -10);
    this.scene.add(rimLight);
  }

  /**
   * Create the avatar character
   */
  async createAvatar() {
    // Create a simple geometric avatar for now
    // In a full implementation, you would load a 3D model
    const avatarGroup = new THREE.Group();

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xfdbcb4,
      transparent: true,
      opacity: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    head.castShadow = true;
    avatarGroup.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.85, 0.25);
    avatarGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.85, 0.25);
    avatarGroup.add(rightEye);

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.8, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x667eea,
      transparent: true,
      opacity: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.2;
    body.castShadow = true;
    avatarGroup.add(body);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, 1.2, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    avatarGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.35, 1.2, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    avatarGroup.add(rightArm);

    // Ground plane for shadows
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.avatar = avatarGroup;
    this.scene.add(avatarGroup);

    // Store references for animations
    this.avatarParts = {
      head,
      leftEye,
      rightEye,
      body,
      leftArm,
      rightArm
    };

    // Start idle animation
    this.startIdleAnimation();
  }

  /**
   * Start idle animation
   */
  startIdleAnimation() {
    this.currentAnimation = 'idle';
    
    // Gentle breathing animation
    const breathingAnimation = () => {
      if (this.currentAnimation !== 'idle' || !this.avatar) return;
      
      const time = Date.now() * 0.001;
      
      // Breathing motion
      this.avatar.scale.y = 1 + Math.sin(time * 2) * 0.02;
      
      // Subtle head movement
      this.avatarParts.head.rotation.y = Math.sin(time * 0.5) * 0.1;
      this.avatarParts.head.rotation.x = Math.sin(time * 0.3) * 0.05;
      
      // Eye blinking
      if (Math.random() < 0.01) {
        this.blink();
      }
      
      requestAnimationFrame(breathingAnimation);
    };
    
    breathingAnimation();
  }

  /**
   * Eye blinking animation
   */
  blink() {
    const duration = 150;
    const startTime = Date.now();
    
    const blinkAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Scale eyes down and back up
      const scale = progress < 0.5 
        ? 1 - (progress * 2) * 0.8 
        : 0.2 + ((progress - 0.5) * 2) * 0.8;
      
      this.avatarParts.leftEye.scale.y = scale;
      this.avatarParts.rightEye.scale.y = scale;
      
      if (progress < 1) {
        requestAnimationFrame(blinkAnimation);
      }
    };
    
    blinkAnimation();
  }

  /**
   * Thinking animation
   */
  startThinkingAnimation() {
    this.currentAnimation = 'thinking';
    
    const thinkingAnimation = () => {
      if (this.currentAnimation !== 'thinking' || !this.avatar) return;
      
      const time = Date.now() * 0.001;
      
      // Head tilting
      this.avatarParts.head.rotation.z = Math.sin(time * 1.5) * 0.2;
      this.avatarParts.head.rotation.y = Math.sin(time * 0.8) * 0.3;
      
      // Body swaying
      this.avatar.rotation.y = Math.sin(time * 0.6) * 0.1;
      
      requestAnimationFrame(thinkingAnimation);
    };
    
    thinkingAnimation();
  }

  /**
   * Speaking animation
   */
  startSpeakingAnimation() {
    this.currentAnimation = 'speaking';
    
    const speakingAnimation = () => {
      if (this.currentAnimation !== 'speaking' || !this.avatar) return;
      
      const time = Date.now() * 0.001;
      
      // Animated gestures
      this.avatarParts.leftArm.rotation.z = 0.3 + Math.sin(time * 3) * 0.2;
      this.avatarParts.rightArm.rotation.z = -0.3 + Math.sin(time * 3 + 1) * 0.2;
      
      // Head movement while speaking
      this.avatarParts.head.rotation.y = Math.sin(time * 2) * 0.15;
      
      // Body emphasis
      this.avatar.position.y = Math.sin(time * 4) * 0.02;
      
      requestAnimationFrame(speakingAnimation);
    };
    
    speakingAnimation();
  }

  /**
   * Greeting animation
   */
  playGreetingAnimation() {
    this.currentAnimation = 'greeting';
    
    const duration = 2000;
    const startTime = Date.now();
    
    const greetingAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Wave animation
      const waveIntensity = Math.sin(progress * Math.PI * 4) * (1 - progress);
      this.avatarParts.rightArm.rotation.z = -0.3 + waveIntensity * 0.8;
      
      // Head nod
      this.avatarParts.head.rotation.x = Math.sin(progress * Math.PI * 2) * 0.2;
      
      if (progress < 1) {
        requestAnimationFrame(greetingAnimation);
      } else {
        this.startIdleAnimation();
      }
    };
    
    greetingAnimation();
  }

  /**
   * Start render loop
   */
  startRenderLoop() {
    const render = () => {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      this.animationId = requestAnimationFrame(render);
    };
    
    render();
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (!this.camera || !this.renderer) return;
    
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Show fallback when 3D fails
   */
  showFallback() {
    this.canvas.style.display = 'none';
    
    const fallback = document.createElement('div');
    fallback.className = 'avatar-fallback';
    fallback.innerHTML = `
      <div class="fallback-avatar">🤖</div>
      <div class="fallback-text">AI Avatar Ready</div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .avatar-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      }
      .fallback-avatar {
        font-size: 48px;
        margin-bottom: 8px;
        animation: bounce 2s infinite;
      }
      .fallback-text {
        font-size: 14px;
        color: #4a5568;
        font-weight: 500;
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
}

