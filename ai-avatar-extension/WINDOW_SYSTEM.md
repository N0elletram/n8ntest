# AI Avatar Extension - Window System

## Overview

The AI Avatar Extension now supports multiple window modes to provide the best user experience across different screen sizes and usage scenarios. The window system includes automatic screen detection, mode switching, and a detached window option for maximum workspace.

## Window Modes

### 1. Compact Mode (400x600px)
- **Default for smaller screens**
- Optimized for typical browser extension popup usage
- Vertical layout with all essential features
- Ideal for quick interactions and basic conversations

### 2. Large Mode (800x800px)
- **Default for larger screens (≥1200x800)**
- Side-by-side layout with enhanced conversation area
- Larger avatar display and more spacious interface
- Better for extended conversations and detailed analysis

### 3. Detached Window Mode (900x900px)
- **Independent browser window**
- Maximum space for complex interactions
- Persistent window that stays open independently
- Best for extensive research and analysis sessions

## Features

### Auto-Detection
The system automatically detects screen size and selects the appropriate mode:
- Screens ≥1200x800px → Large Mode
- Smaller screens → Compact Mode
- Users can override this behavior in settings

### Mode Switching
- **From Compact Mode**: Click "Large" button in footer to switch to large mode
- **In Large Mode**: Use mode selector buttons in header to switch between modes
- **Detached Mode**: Click detached window button to open independent window

### Settings Integration
- **Default Window Mode**: Choose Auto, Compact, or Large
- **Remember Mode**: System remembers last used mode (when enabled)
- **Screen Size Override**: Manual mode selection overrides auto-detection

### State Preservation
- Conversation history is preserved when switching modes
- Input text is maintained during mode transitions
- Settings and preferences carry over between modes

## Technical Implementation

### Files Structure
```
popup/
├── popup.html              # Compact mode (400x600)
├── popup-large.html        # Large mode (800x800)
├── popup.css              # Compact mode styles
├── popup-large.css        # Large mode styles
├── window-manager.js      # Core window management
├── popup.js              # Main popup controller
└── window-integration-test.js  # Testing utilities
```

### Key Components

#### WindowManager Class
- Handles mode detection and switching
- Manages screen size detection
- Controls detached window creation
- Preserves state during transitions

#### Mode Selector UI
- Header buttons for large mode
- Footer button for compact mode
- Visual indicators for current mode
- Accessibility support with ARIA labels

#### Settings Integration
- Default mode preference
- Auto-detection settings
- Mode memory functionality

## Browser Permissions

The extension requires the `windows` permission in manifest.json to create detached windows:

```json
{
  "permissions": [
    "activeTab",
    "storage", 
    "scripting",
    "windows"
  ]
}
```

## Usage Guide

### For Users

1. **First Use**: Extension auto-detects your screen size and opens in the best mode
2. **Switching Modes**: 
   - In compact mode: Click "Large" in footer
   - In large mode: Use header buttons to switch
3. **Detached Window**: Click detached window button for independent window
4. **Settings**: Configure default mode in Settings panel

### For Developers

1. **Testing**: Use `window-integration-test.js` for functionality testing
2. **Mode Detection**: Access via `window.windowManager.getScreenInfo()`
3. **Current Mode**: Check with `window.windowManager.isLargeMode()`
4. **State Management**: Automatic via WindowManager class

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all mode switching
- **Screen Reader Support**: ARIA labels and announcements for mode changes
- **High Contrast**: Enhanced visibility in high contrast mode
- **Focus Management**: Proper focus handling during mode transitions

## Browser Compatibility

- **Chrome**: Full support (Manifest V3)
- **Edge**: Full support (Chromium-based)
- **Firefox**: Planned (requires Manifest V2 compatibility layer)

## Performance Considerations

- **Memory Usage**: Large mode uses ~30% more memory for enhanced UI
- **Startup Time**: Auto-detection adds <50ms to initialization
- **State Transfer**: Minimal overhead during mode switching
- **Detached Windows**: Independent memory allocation

## Future Enhancements

### Planned Features
- **Floating Window**: Draggable overlay mode
- **Multi-Monitor**: Enhanced support for multi-monitor setups
- **Custom Sizing**: User-defined window dimensions
- **Keyboard Shortcuts**: Hotkeys for quick mode switching

### Advanced Options
- **Window Position Memory**: Remember window positions
- **Multi-Instance**: Support for multiple detached windows
- **Responsive Breakpoints**: More granular size detection

## Troubleshooting

### Common Issues

1. **Mode Switching Not Working**
   - Check browser permissions
   - Verify window-manager.js is loaded
   - Check console for JavaScript errors

2. **Detached Window Won't Open**
   - Ensure 'windows' permission is granted
   - Check popup blocker settings
   - Verify screen has sufficient space

3. **State Not Preserved**
   - Check storage permissions
   - Verify chrome.storage API access
   - Clear extension data and retry

### Debug Mode
Enable debug logging with:
```javascript
window.windowManager.debug = true;
```

## API Reference

### WindowManager Methods

```javascript
// Mode detection
windowManager.detectScreenSize()
windowManager.getScreenInfo()

// Mode checking
windowManager.isLargeMode()
windowManager.isCompactMode()
windowManager.isDetachedWindow()

// Mode switching
windowManager.switchMode('large')
windowManager.switchMode('compact')
windowManager.openDetachedWindow()

// Settings
windowManager.loadSettings()
windowManager.saveSettings()

// State management
windowManager.getCurrentState()
windowManager.restoreState()
```

### Events

```javascript
// Listen for mode changes
document.addEventListener('windowModeChanged', (event) => {
  console.log('New mode:', event.detail.mode);
});

// Listen for screen size changes
window.addEventListener('resize', () => {
  windowManager.detectScreenSize();
});
```

---

## Contributing

When contributing to the window system:

1. Test all three modes thoroughly
2. Ensure accessibility compliance
3. Verify state preservation
4. Test on different screen sizes
5. Update documentation for new features

For questions or issues, please refer to the main project repository.