# Rate Limiter Integration Guide

## Overview

The rate limiter has been successfully integrated into the AI Avatar Chrome Extension. This system provides comprehensive rate limiting, token tracking, and cost management for OpenAI API calls.

## Features

### 1. Token Counting and Usage Tracking
- Automatic token counting for prompts and completions
- Real-time tracking of daily, monthly, and lifetime usage
- Model-specific usage breakdown

### 2. Multiple Rate Limit Types
- **Per-minute limits**: Prevents API flooding (20 requests/minute)
- **Daily limits**: 
  - Tokens: 100,000 (configurable)
  - Requests: 1,000
  - Cost: $10.00 (configurable)
- **Monthly limits**:
  - Tokens: 2,000,000
  - Requests: 20,000
  - Cost: $200.00

### 3. Cost Calculation
- Accurate cost tracking based on model pricing
- Support for multiple models (GPT-4, GPT-3.5-turbo, Claude models)
- Real-time cost monitoring

### 4. User Interface Integration
- Visual progress bars showing usage percentages
- Color-coded warnings (yellow at 75%, red at 90%)
- Live usage statistics in the popup
- Configurable daily limits in settings

## Implementation Details

### Service Worker Integration

The rate limiter is initialized when the service worker starts:

```javascript
// In service-worker.js
constructor() {
    // ... existing code ...
    this.rateLimiter = new RateLimiter();
}

async init() {
    // ... existing code ...
    await this.rateLimiter.initialize();
}
```

### Rate Limit Checking

Before each API call, the system checks if the request is allowed:

```javascript
const rateLimitCheck = await this.rateLimiter.checkRequest({
    model: 'gpt-4',
    prompt: promptContent,
    estimatedCompletion: 1000
});

if (!rateLimitCheck.allowed) {
    return {
        success: false,
        error: rateLimitCheck.reason,
        rateLimitError: true,
        limitType: rateLimitCheck.limitType,
        retryAfter: rateLimitCheck.retryAfter
    };
}
```

### Usage Recording

After successful API calls, usage is recorded:

```javascript
await this.rateLimiter.recordUsage({
    model: 'gpt-4',
    promptTokens: apiResponse.usage.prompt_tokens,
    completionTokens: apiResponse.usage.completion_tokens
});
```

## User Experience

### Visual Feedback
1. **Usage Display**: Three progress bars show token, request, and cost usage
2. **Color Coding**: 
   - Blue (0-74%): Normal usage
   - Yellow (75-89%): Warning zone
   - Red (90-100%): Critical usage

### Error Handling
When rate limits are exceeded, users receive clear messages:
- "Please wait X seconds before trying again" (per-minute limits)
- "Daily token limit reached. Limit resets at midnight" (daily limits)
- "Monthly cost limit reached. Consider upgrading your limits" (monthly limits)

### Configuration
Users can adjust daily limits in the settings panel:
- Token limit (minimum: 1,000)
- Cost limit (minimum: $0.01)

## Data Persistence

All usage data is stored in Chrome's local storage:
- Automatic daily/monthly reset
- Persistent across browser sessions
- Export/import capability for backups

## Testing

A test page is included at `test-rate-limiter.html` that allows:
- Testing the rate limiter class directly
- Verifying service worker integration
- Making test API calls
- Viewing current usage statistics

## Security Considerations

1. **Local Storage**: All usage data is stored locally, never transmitted
2. **API Key Protection**: Rate limiter doesn't handle API keys directly
3. **Input Validation**: All user inputs are validated before processing

## Future Enhancements

Potential improvements for future versions:
1. Weekly usage tracking
2. Per-model rate limits
3. Usage history graphs
4. Budget alerts via notifications
5. CSV export for usage reports
6. Integration with payment tracking

## Troubleshooting

### Common Issues

1. **Rate limits not updating**: Refresh the popup or click the refresh button
2. **Incorrect token counting**: The system uses approximate counting (1 token ≈ 4 characters)
3. **Storage errors**: Check Chrome storage permissions

### Debug Mode

To enable debug logging:
```javascript
// In console
chrome.storage.local.get('rateLimiterData', console.log);
```

## Conclusion

The rate limiter integration provides robust protection against unexpected API costs while maintaining a smooth user experience. Users have full visibility and control over their usage, ensuring they stay within their desired limits.