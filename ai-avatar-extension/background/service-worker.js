/**
 * AI Avatar Extension Background Service Worker
 * Handles AI communication, conversation management, and extension coordination
 * 
 * Streaming API Usage:
 * ===================
 * 
 * 1. To start a streaming response:
 *    chrome.runtime.sendMessage({
 *      action: 'generateResponseStream',
 *      message: 'user message',
 *      pageContent: { ... }
 *    }, (response) => {
 *      if (response.streaming) {
 *        // Listen for stream events with response.streamId
 *      }
 *    });
 * 
 * 2. Listen for stream events:
 *    chrome.runtime.onMessage.addListener((message) => {
 *      if (message.action === 'streamChunk' && message.streamId === myStreamId) {
 *        // Handle chunk: message.chunk.content
 *      } else if (message.action === 'streamComplete' && message.streamId === myStreamId) {
 *        // Handle completion: message.result
 *      } else if (message.action === 'streamError' && message.streamId === myStreamId) {
 *        // Handle error: message.error
 *      }
 *    });
 * 
 * 3. To abort a stream:
 *    chrome.runtime.sendMessage({
 *      action: 'abortStream',
 *      streamId: myStreamId
 *    });
 * 
 * 4. Non-streaming mode (backward compatible):
 *    chrome.runtime.sendMessage({
 *      action: 'generateResponse',
 *      message: 'user message',
 *      pageContent: { ... }
 *    });
 */

// Import the RateLimiter class
importScripts('./rate-limiter.js');

class AIAvatarService {
  constructor() {
    this.conversations = new Map();
    this.apiKey = null;
    this.isInitialized = false;
    // Initialize the rate limiter
    this.rateLimiter = new RateLimiter();
    // Store active streaming connections
    this.activeStreams = new Map();
    this.init();
  }

  async init() {
    // Load API key from storage
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    this.apiKey = result.openaiApiKey;
    
    // Initialize the rate limiter
    await this.rateLimiter.initialize();
    
    this.isInitialized = true;
  }

  /**
   * Generate AI response based on content and conversation history (non-streaming)
   */
  async generateResponse(tabId, userMessage, pageContent) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get or create conversation for this tab
    let conversation = this.conversations.get(tabId) || {
      messages: [],
      pageContent: null,
      startTime: Date.now()
    };

    // Update page content if provided
    if (pageContent) {
      conversation.pageContent = pageContent;
      
      // Add system message with page content context
      const systemMessage = this.createSystemMessage(pageContent);
      conversation.messages = [systemMessage];
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: userMessage
    });

    try {
      // Prepare request info for rate limiting
      const promptContent = JSON.stringify(conversation.messages);
      const requestInfo = {
        model: 'gpt-4',
        prompt: promptContent,
        estimatedCompletion: 1000 // Estimate based on max_tokens
      };
      
      // Check rate limits before making the request
      const rateLimitCheck = await this.rateLimiter.checkRequest(requestInfo);
      
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
          rateLimitError: true,
          limitType: rateLimitCheck.limitType,
          retryAfter: rateLimitCheck.retryAfter
        };
      }
      
      // Call OpenAI API
      const apiResponse = await this.callOpenAI(conversation.messages);
      
      // Add AI response to conversation
      conversation.messages.push({
        role: 'assistant',
        content: apiResponse.content
      });

      // Update conversation storage
      this.conversations.set(tabId, conversation);
      
      // Record actual usage for rate limiting
      await this.rateLimiter.recordUsage({
        model: 'gpt-4',
        promptTokens: apiResponse.usage.prompt_tokens,
        completionTokens: apiResponse.usage.completion_tokens
      });

      return {
        success: true,
        response: apiResponse.content,
        conversationLength: conversation.messages.length,
        tokenUsage: {
          prompt: apiResponse.usage.prompt_tokens,
          completion: apiResponse.usage.completion_tokens,
          total: apiResponse.usage.total_tokens
        }
      };

    } catch (error) {
      console.error('AI response generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate AI response with streaming support
   * @param {number} tabId - Tab ID
   * @param {string} userMessage - User's message
   * @param {Object} pageContent - Page content object
   * @param {Object} streamOptions - Streaming options
   * @param {Function} streamOptions.onChunk - Callback for each chunk
   * @param {Function} streamOptions.onError - Callback for errors
   * @param {Function} streamOptions.onComplete - Callback for completion
   * @param {AbortController} streamOptions.abortController - Abort controller
   */
  async generateResponseStream(tabId, userMessage, pageContent, streamOptions = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get or create conversation for this tab
    let conversation = this.conversations.get(tabId) || {
      messages: [],
      pageContent: null,
      startTime: Date.now()
    };

    // Update page content if provided
    if (pageContent) {
      conversation.pageContent = pageContent;
      
      // Add system message with page content context
      const systemMessage = this.createSystemMessage(pageContent);
      conversation.messages = [systemMessage];
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: userMessage
    });

    try {
      // Prepare request info for rate limiting
      const promptContent = JSON.stringify(conversation.messages);
      const requestInfo = {
        model: 'gpt-4',
        prompt: promptContent,
        estimatedCompletion: 1000 // Estimate based on max_tokens
      };
      
      // Check rate limits before making the request
      const rateLimitCheck = await this.rateLimiter.checkRequest(requestInfo);
      
      if (!rateLimitCheck.allowed) {
        const error = {
          success: false,
          error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
          rateLimitError: true,
          limitType: rateLimitCheck.limitType,
          retryAfter: rateLimitCheck.retryAfter
        };
        
        if (streamOptions.onError) {
          streamOptions.onError(new Error(error.error));
        }
        
        return error;
      }

      // Store the current conversation state
      let assistantResponse = '';

      // Call OpenAI API with streaming
      const apiResponse = await this.callOpenAIStream(conversation.messages, {
        ...streamOptions,
        onChunk: (chunk) => {
          assistantResponse = chunk.accumulated;
          if (streamOptions.onChunk) {
            streamOptions.onChunk(chunk);
          }
        },
        onComplete: async (result) => {
          // Add AI response to conversation
          conversation.messages.push({
            role: 'assistant',
            content: result.content
          });

          // Update conversation storage
          this.conversations.set(tabId, conversation);
          
          // Record actual usage for rate limiting
          await this.rateLimiter.recordUsage({
            model: 'gpt-4',
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens
          });

          if (streamOptions.onComplete) {
            streamOptions.onComplete({
              success: true,
              response: result.content,
              conversationLength: conversation.messages.length,
              tokenUsage: {
                prompt: result.usage.prompt_tokens,
                completion: result.usage.completion_tokens,
                total: result.usage.total_tokens
              }
            });
          }
        }
      });

      return {
        success: true,
        streaming: true
      };

    } catch (error) {
      console.error('AI streaming response generation failed:', error);
      
      if (streamOptions.onError) {
        streamOptions.onError(error);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create system message with page content context
   */
  createSystemMessage(pageContent) {
    const systemPrompt = `You are an intelligent AI avatar assistant that helps users understand and analyze webpage content. You have access to the following webpage content:

**Page Title:** ${pageContent.title}
**URL:** ${pageContent.url}
**Content Type:** ${pageContent.contentType}
**Word Count:** ${pageContent.wordCount}

**Page Content (in Markdown format):**
${pageContent.content}

**Your Role:**
- Help users understand and analyze this webpage content
- Answer questions about the content accurately and helpfully
- Provide summaries, explanations, and insights
- Engage in natural conversation about the topics covered
- Be concise but thorough in your responses
- If asked about information not in the content, clearly state that

**Conversation Style:**
- Be friendly, helpful, and engaging
- Use a conversational tone appropriate for the content type
- Provide specific examples and quotes from the content when relevant
- Ask clarifying questions when needed

Please introduce yourself briefly and let the user know you've analyzed the page content and are ready to discuss it.`;

    return {
      role: 'system',
      content: systemPrompt
    };
  }

  /**
   * Call OpenAI API (non-streaming mode for backward compatibility)
   */
  async callOpenAI(messages) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  /**
   * Call OpenAI API with streaming support
   * @param {Array} messages - Messages array for the conversation
   * @param {Object} options - Streaming options
   * @param {Function} options.onChunk - Callback for each chunk received
   * @param {Function} options.onError - Callback for stream errors
   * @param {Function} options.onComplete - Callback when stream completes
   * @param {AbortController} options.abortController - Optional abort controller
   */
  async callOpenAIStream(messages, options = {}) {
    const { onChunk, onError, onComplete, abortController } = options;
    
    let accumulatedContent = '';
    let tokenUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };
    let reader = null;
    let connectionRetries = 0;
    const maxRetries = 3;

    const cleanup = () => {
      if (reader) {
        try {
          reader.cancel();
        } catch (e) {
          console.warn('Error canceling reader:', e);
        }
      }
    };

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
          stream: true,
          stream_options: {
            include_usage: true
          }
        }),
        signal: abortController?.signal
      });

      if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
          const error = await response.json();
          errorMessage = error.error?.message || errorMessage;
          
          // Handle specific error codes
          if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (response.status === 401) {
            errorMessage = 'Invalid API key. Please check your settings.';
          } else if (response.status === 500 || response.status === 502 || response.status === 503) {
            errorMessage = 'OpenAI service is temporarily unavailable. Please try again.';
          }
        } catch (e) {
          // If we can't parse the error, use the status code
          errorMessage = `API request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastChunkTime = Date.now();
      const timeout = 30000; // 30 second timeout for no data

      while (true) {
        // Check for timeout
        if (Date.now() - lastChunkTime > timeout) {
          throw new Error('Stream timeout - no data received for 30 seconds');
        }

        const readPromise = reader.read();
        let result;

        // Add timeout to the read operation
        if (abortController) {
          result = await Promise.race([
            readPromise,
            new Promise((_, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('Read timeout'));
              }, timeout);
              
              readPromise.then(() => clearTimeout(timeoutId));
            })
          ]);
        } else {
          result = await readPromise;
        }
        
        const { done, value } = result;
        
        if (done) break;

        lastChunkTime = Date.now();
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages in the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          // Handle SSE comments (lines starting with :)
          if (line.startsWith(':')) continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Handle content chunks
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                const chunk = parsed.choices[0].delta.content;
                accumulatedContent += chunk;
                
                if (onChunk) {
                  onChunk({
                    content: chunk,
                    accumulated: accumulatedContent,
                    finished: false
                  });
                }
              }

              // Handle finish reason
              if (parsed.choices && parsed.choices[0]?.finish_reason) {
                const finishReason = parsed.choices[0].finish_reason;
                if (finishReason === 'length') {
                  console.warn('Response truncated due to max_tokens limit');
                }
              }

              // Handle usage information (usually in the last chunk)
              if (parsed.usage) {
                tokenUsage = parsed.usage;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, 'Data:', data);
              // Continue processing other chunks even if one fails
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.usage) {
              tokenUsage = parsed.usage;
            }
          } catch (e) {
            console.error('Error parsing final SSE data:', e);
          }
        }
      }

      // Estimate token usage if not provided by the API
      if (!tokenUsage.total_tokens || tokenUsage.total_tokens === 0) {
        tokenUsage.prompt_tokens = this.rateLimiter.countTokens(JSON.stringify(messages));
        tokenUsage.completion_tokens = this.rateLimiter.countTokens(accumulatedContent);
        tokenUsage.total_tokens = tokenUsage.prompt_tokens + tokenUsage.completion_tokens;
      }

      cleanup();

      if (onComplete) {
        onComplete({
          content: accumulatedContent,
          usage: tokenUsage
        });
      }

      return {
        content: accumulatedContent,
        usage: tokenUsage
      };

    } catch (error) {
      cleanup();
      
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
        if (onError) {
          onError(new Error('Stream aborted by user'));
        }
      } else {
        console.error('Stream error:', error);
        
        // Attempt to provide more helpful error messages
        let userFriendlyError = error;
        if (error.message.includes('Failed to fetch')) {
          userFriendlyError = new Error('Network error. Please check your connection and try again.');
        } else if (error.message.includes('timeout')) {
          userFriendlyError = new Error('Request timed out. Please try again.');
        }
        
        if (onError) {
          onError(userFriendlyError);
        }
      }
      throw error;
    }
  }

  /**
   * Get conversation summary for a tab
   */
  getConversationSummary(tabId) {
    const conversation = this.conversations.get(tabId);
    if (!conversation) return null;

    return {
      messageCount: conversation.messages.length,
      hasPageContent: !!conversation.pageContent,
      startTime: conversation.startTime,
      lastActivity: Date.now()
    };
  }

  /**
   * Clear conversation for a tab
   */
  clearConversation(tabId) {
    this.conversations.delete(tabId);
  }
  
  /**
   * Get conversation summary for a tab
   */
  getConversationSummary(tabId) {
    const conversation = this.conversations.get(tabId);
    if (!conversation) {
      return null;
    }

    return {
      messageCount: conversation.messages.length,
      startTime: conversation.startTime,
      lastMessage: conversation.messages[conversation.messages.length - 1]
    };
  }

  /**
   * Save API key
   */
  async saveApiKey(apiKey) {
    await chrome.storage.sync.set({ openaiApiKey: apiKey });
    this.apiKey = apiKey;
  }

  /**
   * Get stored settings
   */
  async getSettings() {
    const result = await chrome.storage.sync.get([
      'openaiApiKey',
      'avatarPersonality',
      'responseLength',
      'autoAnalyze',
      'streamingEnabled',
      'streamingChunkDelay'
    ]);

    return {
      hasApiKey: !!result.openaiApiKey,
      avatarPersonality: result.avatarPersonality || 'helpful',
      responseLength: result.responseLength || 'medium',
      autoAnalyze: result.autoAnalyze !== false,
      streamingEnabled: result.streamingEnabled !== false, // Default to true
      streamingChunkDelay: result.streamingChunkDelay || 0 // Delay between chunks in ms
    };
  }
  
  /**
   * Update streaming settings
   */
  async updateStreamingSettings(settings) {
    await chrome.storage.sync.set({
      streamingEnabled: settings.streamingEnabled,
      streamingChunkDelay: settings.streamingChunkDelay
    });
  }
  
  /**
   * Get rate limit statistics
   */
  async getRateLimitStats() {
    return await this.rateLimiter.getAllStats();
  }
  
  /**
   * Update rate limits
   */
  async updateRateLimits(newLimits) {
    return await this.rateLimiter.updateLimits(newLimits);
  }

  /**
   * Get active stream status
   */
  getActiveStreams() {
    const streams = [];
    for (const [streamId, controller] of this.activeStreams.entries()) {
      const [tabId, timestamp] = streamId.split('-');
      streams.push({
        streamId,
        tabId: parseInt(tabId),
        startTime: parseInt(timestamp),
        duration: Date.now() - parseInt(timestamp)
      });
    }
    return streams;
  }
  
  /**
   * Create a stream for a tab
   */
  createStream(tabId) {
    const streamId = `${tabId}-${Date.now()}`;
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);
    return { streamId, abortController };
  }
  
  /**
   * Abort a stream
   */
  abortStream(streamId) {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      return true;
    }
    return false;
  }
  
  /**
   * Abort all streams for a tab
   */
  abortTabStreams(tabId) {
    for (const [streamId, controller] of this.activeStreams.entries()) {
      if (streamId.startsWith(`${tabId}-`)) {
        controller.abort();
        this.activeStreams.delete(streamId);
      }
    }
  }
}

// Initialize service
const aiService = new AIAvatarService();

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (request.action) {
    case 'generateResponse':
      aiService.generateResponse(tabId, request.message, request.pageContent)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open

    case 'generateResponseStream':
      // Use the streamId from the request if provided, otherwise create one
      const streamId = request.streamId || `${tabId}-${Date.now()}`;
      const abortController = new AbortController();
      
      // Store the abort controller
      aiService.activeStreams.set(streamId, abortController);

      // Start streaming
      aiService.generateResponseStream(
        tabId, 
        request.message, 
        request.pageContent,
        {
          abortController,
          onChunk: (chunk) => {
            // Send chunk to the popup via a message
            chrome.runtime.sendMessage({
              action: 'streamChunk',
              streamId,
              tabId,
              chunk
            });
          },
          onError: (error) => {
            // Send error to the popup
            chrome.runtime.sendMessage({
              action: 'streamError',
              streamId,
              tabId,
              error: error.message
            });
            aiService.abortStream(streamId);
          },
          onComplete: (result) => {
            // Send completion to the popup
            chrome.runtime.sendMessage({
              action: 'streamComplete',
              streamId,
              tabId,
              result
            });
            aiService.abortStream(streamId);
          }
        }
      ).then(result => {
        if (!result.streaming) {
          // If streaming didn't start (e.g., rate limit), send response
          sendResponse(result);
        } else {
          // Send initial response with stream ID
          sendResponse({ 
            success: true, 
            streaming: true, 
            streamId 
          });
        }
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
        aiService.abortStream(streamId);
      });
      
      return true; // Keep message channel open

    case 'abortStream':
      const success = aiService.abortStream(request.streamId);
      sendResponse({ success, error: success ? null : 'Stream not found' });
      break;

    case 'getConversationSummary':
      const summary = aiService.getConversationSummary(tabId);
      sendResponse({ success: true, summary });
      break;

    case 'clearConversation':
      aiService.clearConversation(tabId);
      sendResponse({ success: true });
      break;

    case 'saveApiKey':
      aiService.saveApiKey(request.apiKey)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getSettings':
      aiService.getSettings()
        .then(settings => sendResponse({ success: true, settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getRateLimitStats':
      aiService.getRateLimitStats()
        .then(stats => sendResponse({ success: true, stats }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'updateRateLimits':
      aiService.updateRateLimits(request.limits)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'updateStreamingSettings':
      aiService.updateStreamingSettings(request.settings)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getActiveStreams':
      const streams = aiService.getActiveStreams();
      sendResponse({ success: true, streams });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Tab management
chrome.tabs.onRemoved.addListener((tabId) => {
  aiService.clearConversation(tabId);
  
  // Abort any active streams for this tab
  aiService.abortTabStreams(tabId);
});

// Cleanup old conversations (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (const [tabId, conversation] of aiService.conversations.entries()) {
    if (conversation.startTime < oneHourAgo) {
      aiService.conversations.delete(tabId);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

