/**
 * Integration test for Window Manager
 * This script can be used to test the window management functionality
 */

function testWindowManager() {
    console.log('Testing Window Manager Integration...');
    
    // Test 1: Check if WindowManager is properly loaded
    if (typeof window.windowManager === 'undefined') {
        console.error('❌ WindowManager not found');
        return false;
    }
    console.log('✅ WindowManager loaded successfully');
    
    // Test 2: Check screen detection
    const screenInfo = window.windowManager.getScreenInfo();
    console.log('📱 Screen Info:', screenInfo);
    
    // Test 3: Check current mode
    const isLarge = window.windowManager.isLargeMode();
    const isCompact = window.windowManager.isCompactMode();
    console.log(`🖥️ Current mode - Large: ${isLarge}, Compact: ${isCompact}`);
    
    // Test 4: Check if mode selector buttons exist
    const compactBtn = document.getElementById('compactModeBtn');
    const largeBtn = document.getElementById('largeModeBtn');
    const detachedBtn = document.getElementById('detachedModeBtn');
    const expandBtn = document.getElementById('expandModeBtn');
    
    console.log('🔘 Mode buttons found:', {
        compact: !!compactBtn,
        large: !!largeBtn,
        detached: !!detachedBtn,
        expand: !!expandBtn
    });
    
    // Test 5: Check settings integration
    const defaultModeSelect = document.getElementById('defaultWindowMode');
    console.log('⚙️ Settings integration:', !!defaultModeSelect);
    
    // Test 6: Check if detached window detection works
    const isDetached = window.windowManager.isDetachedWindow();
    console.log('🚀 Is detached window:', isDetached);
    
    console.log('✅ All window manager tests completed');
    return true;
}

// Run test when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testWindowManager);
} else {
    testWindowManager();
}

// Export for manual testing
window.testWindowManager = testWindowManager;