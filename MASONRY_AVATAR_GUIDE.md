# Enhanced Avatar Renderer for Masonry Layout

## Overview

The updated `avatar-renderer.js` provides a comprehensive 3D avatar system that seamlessly integrates with the masonry layout. The avatar feels alive and responds intelligently to user interactions, content analysis, and layout changes.

## ✨ Key Features

### 🏗️ **Masonry Integration**
- **Responsive Canvas Sizing**: Automatically adjusts between hero (400x300px) and standard (280x200px) canvas sizes
- **Card Interaction Response**: Reacts to hover, focus, expansion, and collapse events
- **Layout Awareness**: Adapts to masonry grid changes and view switches
- **Theme Synchronization**: Updates appearance based on light/dark theme

### 🎭 **Personality & Expressions**
- **Dynamic Mood System**: Happy, excited, thinking, concerned, surprised, and more
- **Content Analysis Integration**: Adjusts personality based on sentiment, complexity, and topics
- **Eyebrow Expressions**: Subtle facial expressions that reflect current mood
- **Energy & Engagement Levels**: Influences animation intensity and responsiveness

### 🎮 **Interactive Animations**
- **Card Hover Effects**: Gentle floating with cursor tracking
- **Focus Animations**: Attention posture with subtle glow effects
- **Expansion Responses**: Celebratory scaling when cards expand
- **Theme Change Reactions**: Flash effects during theme switches
- **Gesture Recognition**: Click and touch interactions trigger responses

### 🚀 **Floating Avatar**
- **Auto-Deploy**: Creates floating mini-avatar when main card collapses
- **Click to Restore**: Tap floating avatar to restore the main card
- **Performance Optimized**: Runs at 30fps with low-power mode
- **Auto-Hide**: Becomes translucent after 10 seconds

### 🎯 **Gesture System**
- **Mouse Tracking**: Head follows cursor during hover
- **Click Gestures**: Different responses for avatar center clicks
- **Touch Support**: Full touch event handling for mobile
- **Personality Gestures**: Random gestures based on expressiveness level

### ⚡ **Performance Optimization**
- **Adaptive Quality**: Automatically adjusts rendering quality based on FPS
- **LOD System**: Different detail levels for hero vs standard canvases
- **Frame Rate Monitoring**: Tracks and optimizes for target FPS
- **Memory Management**: Efficient resource cleanup and management

## 🚀 Usage

### Basic Initialization

```javascript
// Standard avatar initialization
const avatar = new AvatarRenderer('avatarCanvas', {
  heroCanvas: false,
  enableFloating: true,
  enableGestures: true,
  enablePersonality: true,
  performanceMode: 'auto'
});
```

### Hero Canvas (Large Card)

```javascript
// Hero avatar with full features
const heroAvatar = new AvatarRenderer('avatarCanvas', {
  heroCanvas: true,
  parentCard: document.querySelector('.avatar-card'),
  enableFloating: true,
  enableGestures: true,
  enablePersonality: true,
  enableHoverEffects: true,
  performanceMode: 'high',
  targetFPS: 60
});
```

### Content-Aware Personality

```javascript
// Update avatar based on content analysis
avatar.setMoodFromContent({
  sentiment: 0.7,        // -1 to 1 (negative to positive)
  complexity: 'high',    // 'low', 'medium', 'high'
  topics: ['technology', 'AI']
});

// Express specific emotions
avatar.expressEmotion('excited', 0.8);
avatar.expressEmotion('thinking', 1.0);
avatar.expressEmotion('happy', 0.6);
```

### Manual Animation Control

```javascript
// Trigger specific animations
avatar.setThinking(true);
avatar.setSpeaking(true);
avatar.greet();

// Play specific gestures
avatar.playGesture('headNod');
avatar.playGesture('armStretch');
avatar.playGesture('bodyTwist');
```

## 🔧 Configuration Options

```javascript
const options = {
  // Canvas configuration
  heroCanvas: false,           // Use larger canvas with enhanced features
  parentCard: null,            // DOM element of containing card
  
  // Feature toggles
  enableFloating: true,        // Create floating avatar on collapse
  enableGestures: true,        // Enable gesture recognition
  enablePersonality: true,     // Enable personality system
  enableHoverEffects: true,    // Enable hover animations
  
  // Performance settings
  performanceMode: 'auto',     // 'low', 'medium', 'high', 'auto'
  targetFPS: 60,              // Target frame rate
  
  // Advanced options
  shadowQuality: 'medium',     // 'low', 'medium', 'high'
  pixelRatioMax: 2,           // Maximum pixel ratio
  adaptiveQuality: true       // Enable automatic quality adjustment
};
```

## 🎨 Personality System

### Mood States
- `'neutral'` - Default calm state
- `'happy'` - Upbeat and energetic
- `'excited'` - Highly animated and engaged
- `'thinking'` - Contemplative with head tilts
- `'concerned'` - Attentive with furrowed brows
- `'surprised'` - Quick reactions and wide expressions
- `'contemplative'` - Deep thinking pose

### Personality Attributes
```javascript
avatar.updatePersonality({
  mood: 'happy',
  energy: 0.8,          // 0-1, affects animation intensity
  engagement: 0.9,      // 0-1, affects responsiveness
  confidence: 0.7,      // 0-1, affects posture
  expressiveness: 0.8   // 0-1, affects gesture frequency
});
```

## 🎭 Animation System

### Automatic Animations
- **Idle**: Breathing, blinking, subtle head movement
- **Hover**: Floating effect with cursor tracking
- **Focus**: Alert posture with glow effect
- **Thinking**: Head tilts and hand-to-chin gesture
- **Speaking**: Gesticulation and head movement
- **Greeting**: Wave animation with enthusiasm

### Gesture Library
- `headNod` - Agreeing or acknowledging
- `armStretch` - Stretching or emphasizing
- `bodyTwist` - Looking around or curiosity
- `shoulderShrug` - Uncertainty or casual response

## 🚀 Performance Features

### Adaptive Quality System
```javascript
// Monitor performance
const metrics = avatar.getPerformanceMetrics();
console.log(metrics.fps);           // Current frame rate
console.log(metrics.renderTime);    // Frame render time
console.log(metrics.memoryUsage);   // Memory usage
```

### Quality Levels
- **Low**: Basic geometry, no shadows, 1x pixel ratio
- **Medium**: Enhanced geometry, basic shadows, 1.5x pixel ratio
- **High**: Full geometry, soft shadows, 2x pixel ratio
- **Auto**: Dynamically adjusts based on performance

## 🔌 Masonry Integration

### Event Handling
```javascript
// Listen to masonry events
avatar.masonryEvents.addEventListener('avatarReady', (event) => {
  console.log('Avatar initialized');
});

avatar.masonryEvents.addEventListener('personalityChanged', (event) => {
  console.log('Personality updated:', event.detail.personality);
});

// Trigger masonry events
avatar.onMasonryEvent('cardExpanded', { card: cardElement });
avatar.onMasonryEvent('themeChanged', { theme: 'dark' });
```

### Card Effects
```javascript
// Trigger visual card effects
avatar.triggerCardEffect('hover');     // Lift and scale card
avatar.triggerCardEffect('greeting');  // Greeting animation
avatar.triggerCardEffect('thinking');  // Thinking indicator
avatar.triggerCardEffect('speaking');  // Speaking glow effect
```

## 🎮 Floating Avatar

### Automatic Creation
When the parent card collapses, a floating avatar automatically appears in the bottom-right corner.

### Manual Control
```javascript
// Create floating avatar
avatar.createFloatingAvatar();

// Destroy floating avatar
avatar.destroyFloatingAvatar();

// Restore main card
avatar.restoreCard();
```

## 📱 Touch & Mobile Support

The avatar system includes full touch support:
- **Touch tracking** for gesture recognition
- **Mobile-optimized** performance settings
- **Responsive sizing** for different screen sizes
- **Touch gestures** trigger interaction animations

## 🔧 Advanced Customization

### Custom Animations
```javascript
// Create custom gesture
avatar.playGesture('customGesture');

// Custom animation loop
avatar.currentAnimation = 'custom';
const customAnimation = () => {
  if (avatar.currentAnimation !== 'custom') return;
  
  // Your custom animation logic
  avatar.avatarParts.head.rotation.y = Math.sin(Date.now() * 0.001) * 0.2;
  
  requestAnimationFrame(customAnimation);
};
customAnimation();
```

### Theme Integration
```javascript
// Update theme manually
avatar.updateSceneTheme();

// Listen for theme changes
document.addEventListener('themeChanged', (event) => {
  avatar.handleThemeChange(event);
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Avatar not appearing**
   - Check if THREE.js is loaded
   - Verify canvas element exists
   - Check browser WebGL support

2. **Poor performance**
   - Set `performanceMode: 'low'`
   - Reduce `targetFPS`
   - Disable shadows with `shadowQuality: 'off'`

3. **Floating avatar not working**
   - Ensure `enableFloating: true`
   - Check that parent card is properly set
   - Verify collapse events are firing

### Debug Mode
```javascript
// Enable debug logging
avatar.debug = true;

// Monitor performance
setInterval(() => {
  const metrics = avatar.getPerformanceMetrics();
  console.log(`FPS: ${metrics.fps}, Render: ${metrics.renderTime}ms`);
}, 5000);
```

## 🌟 Best Practices

1. **Use hero canvas** for main avatar cards
2. **Enable adaptive quality** for best performance
3. **Set appropriate target FPS** based on device capabilities
4. **Monitor performance metrics** in production
5. **Test on mobile devices** for touch interactions
6. **Use content analysis** for dynamic personality updates
7. **Handle theme changes** for consistent appearance

## 📦 Integration Example

See `masonry-avatar-integration.js` for a complete integration example that demonstrates:
- Automatic initialization
- Content analysis integration
- Masonry event handling
- Performance monitoring
- Interactive features

The enhanced avatar renderer transforms the static 3D character into a living, breathing companion that adapts to your content and responds to user interactions, making the masonry layout feel truly alive and engaging.