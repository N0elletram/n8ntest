# AI Avatar Content Analyzer Chrome Extension

An intelligent Chrome extension that analyzes webpage content and provides an interactive 3D AI avatar for natural conversations about the content.

## Features

- **Intelligent Content Analysis**: Automatically extracts and analyzes webpage content
- **3D AI Avatar**: Interactive 3D avatar powered by Three.JS
- **Natural Conversations**: Chat with AI about webpage content using OpenAI's GPT-4
- **Markdown Conversion**: Converts webpage content to structured markdown for AI analysis
- **Multiple Content Types**: Supports blogs, news articles, documentation, tutorials, and more
- **Privacy Focused**: All processing happens locally, API keys stored securely

## Installation

### Method 1: Developer Mode (Recommended for Testing)

1. **Download the Extension**
   - Clone or download this repository
   - Ensure all files are in the `ai-avatar-extension` folder

2. **Enable Developer Mode**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `ai-avatar-extension` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "AI Avatar Content Analyzer" and click the pin icon

### Method 2: Chrome Web Store (Future)
*This extension will be available on the Chrome Web Store after review and approval.*

## Setup

### 1. Configure OpenAI API Key

1. **Get an OpenAI API Key**
   - Visit [OpenAI's website](https://platform.openai.com/api-keys)
   - Create an account or sign in
   - Generate a new API key

2. **Add API Key to Extension**
   - Click the extension icon in Chrome's toolbar
   - Click the "Settings" button (gear icon)
   - Enter your API key in the "OpenAI API Key" field
   - Click "Save Settings"

### 2. Customize Settings (Optional)

- **Avatar Personality**: Choose how the AI avatar communicates
  - Helpful & Professional
  - Casual & Friendly
  - Academic & Detailed
  - Creative & Engaging

- **Auto-analyze**: Enable/disable automatic page analysis when opening new pages

## Usage

### Basic Usage

1. **Navigate to Any Webpage**
   - Open any article, blog post, documentation, or content page
   - The extension will automatically analyze the content (if auto-analyze is enabled)

2. **Open the Extension**
   - Click the AI Avatar icon in your toolbar
   - Wait for the 3D avatar to load and content analysis to complete

3. **Start Conversing**
   - Type questions about the webpage content
   - Use quick action buttons for common requests:
     - **Summarize**: Get a concise summary
     - **Explain**: Understand main concepts
     - **Key Points**: Extract important takeaways

### Advanced Features

- **Manual Content Refresh**: Click the refresh button to re-analyze the page
- **Clear Conversation**: Start fresh with the clear button
- **Settings**: Customize avatar personality and behavior

## Supported Content Types

The extension intelligently recognizes and optimizes for:

- **Blog Posts**: Personal and professional blogs
- **News Articles**: News websites and journalism
- **Documentation**: Technical documentation and guides
- **Tutorials**: How-to guides and educational content
- **Code Repositories**: GitHub and other code hosting platforms
- **Q&A Sites**: Stack Overflow and similar platforms
- **Encyclopedia**: Wikipedia and reference materials
- **General Content**: Any text-based webpage content

## Privacy & Security

- **Local Processing**: Content analysis happens in your browser
- **Secure Storage**: API keys are stored locally using Chrome's secure storage
- **No Data Collection**: We don't collect or store your browsing data
- **OpenAI Privacy**: Conversations are sent to OpenAI according to their privacy policy

## Troubleshooting

### Extension Not Working

1. **Check API Key**: Ensure your OpenAI API key is correctly entered
2. **Refresh Page**: Try refreshing the webpage and reopening the extension
3. **Check Console**: Open Chrome DevTools (F12) and check for error messages
4. **Reload Extension**: Go to `chrome://extensions/` and click the reload button

### 3D Avatar Not Loading

1. **WebGL Support**: Ensure your browser supports WebGL
2. **Hardware Acceleration**: Enable hardware acceleration in Chrome settings
3. **Fallback Mode**: The extension will show a 2D fallback if 3D fails

### Content Not Analyzing

1. **Page Compatibility**: Some pages may block content extraction
2. **JavaScript Required**: Ensure JavaScript is enabled
3. **Manual Refresh**: Try clicking the refresh button in the extension

## Development

### File Structure

```
ai-avatar-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background script for AI communication
├── content/
│   └── content-extractor.js   # Content analysis and extraction
├── popup/
│   ├── popup.html            # Main popup interface
│   ├── popup.css             # Styling
│   ├── popup.js              # Main popup controller
│   └── avatar-renderer.js    # 3D avatar rendering
├── lib/
│   └── three.min.js          # Three.JS library
├── assets/
│   └── icons/                # Extension icons
└── README.md                 # This file
```

### Building and Testing

1. **Load in Developer Mode**: Follow installation instructions above
2. **Test on Various Sites**: Try different types of content
3. **Check Console Logs**: Monitor for errors during development
4. **Reload After Changes**: Reload the extension after code changes

## API Usage and Costs

- **OpenAI API**: This extension uses OpenAI's GPT-4 API
- **Cost**: You pay for API usage according to OpenAI's pricing
- **Optimization**: The extension optimizes requests to minimize costs
- **Token Management**: Long content is intelligently summarized to fit token limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or feature requests:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Provide detailed information about your browser, OS, and the specific problem

## Changelog

### Version 1.0.0
- Initial release
- Basic content analysis and AI conversation
- 3D avatar interface
- Support for multiple content types
- Chrome extension architecture

