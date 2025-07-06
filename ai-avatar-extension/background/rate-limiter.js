/**
 * Rate Limiter and Token Tracking System for AI Avatar Chrome Extension
 * 
 * This module provides comprehensive rate limiting, token counting, and usage tracking
 * for API requests to AI services. It includes cost calculation, daily/monthly limits,
 * and persistent storage using Chrome's storage API.
 * 
 * @module RateLimiter
 */

class RateLimiter {
  /**
   * Initialize the Rate Limiter with default configuration
   * @param {Object} config - Configuration object
   * @param {Object} config.models - Model pricing configuration
   * @param {Object} config.limits - Usage limits configuration
   * @param {string} config.storageKey - Chrome storage key for persistence
   */
  constructor(config = {}) {
    // Model pricing configuration (per 1K tokens)
    this.models = config.models || {
      'gpt-4': {
        prompt: 0.03,
        completion: 0.06,
        contextWindow: 8192
      },
      'gpt-4-turbo': {
        prompt: 0.01,
        completion: 0.03,
        contextWindow: 128000
      },
      'gpt-3.5-turbo': {
        prompt: 0.0005,
        completion: 0.0015,
        contextWindow: 16385
      },
      'claude-3-opus': {
        prompt: 0.015,
        completion: 0.075,
        contextWindow: 200000
      },
      'claude-3-sonnet': {
        prompt: 0.003,
        completion: 0.015,
        contextWindow: 200000
      },
      'claude-3-haiku': {
        prompt: 0.00025,
        completion: 0.00125,
        contextWindow: 200000
      }
    };

    // Default usage limits
    this.limits = config.limits || {
      daily: {
        tokens: 100000,     // 100K tokens per day
        requests: 1000,     // 1000 requests per day
        cost: 10.00         // $10 per day
      },
      monthly: {
        tokens: 2000000,    // 2M tokens per month
        requests: 20000,    // 20K requests per month
        cost: 200.00        // $200 per month
      },
      perMinute: {
        requests: 20        // 20 requests per minute
      }
    };

    this.storageKey = config.storageKey || 'rateLimiterData';
    this.usage = null;
    this.initialized = false;
  }

  /**
   * Initialize the rate limiter by loading data from Chrome storage
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const stored = await this.getFromStorage(this.storageKey);
      
      if (stored && stored.usage) {
        this.usage = stored.usage;
        await this.checkAndResetPeriods();
      } else {
        this.usage = this.createEmptyUsage();
        await this.saveUsage();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize rate limiter:', error);
      this.usage = this.createEmptyUsage();
      this.initialized = true;
    }
  }

  /**
   * Create an empty usage object with default structure
   * @returns {Object} Empty usage object
   */
  createEmptyUsage() {
    const now = new Date();
    return {
      daily: {
        date: this.getDateString(now),
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0,
        modelBreakdown: {}
      },
      monthly: {
        month: this.getMonthString(now),
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0,
        modelBreakdown: {}
      },
      minutely: {
        timestamp: Date.now(),
        requests: []
      },
      lifetime: {
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0,
        startDate: now.toISOString(),
        modelBreakdown: {}
      }
    };
  }

  /**
   * Count tokens in a text string (approximate)
   * @param {string} text - Text to count tokens for
   * @returns {number} Estimated token count
   */
  countTokens(text) {
    if (!text) return 0;
    
    // Approximate token counting (1 token ≈ 4 characters)
    // This is a simplified version; in production, use tiktoken or similar
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    // Use the average of word-based and character-based estimates
    const wordBasedEstimate = words * 1.3;
    const charBasedEstimate = chars / 4;
    
    return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2);
  }

  /**
   * Calculate the cost of a request based on model and token usage
   * @param {string} model - Model identifier
   * @param {number} promptTokens - Number of prompt tokens
   * @param {number} completionTokens - Number of completion tokens
   * @returns {number} Cost in dollars
   */
  calculateCost(model, promptTokens, completionTokens) {
    const modelConfig = this.models[model];
    if (!modelConfig) {
      console.warn(`Unknown model: ${model}. Using default pricing.`);
      return 0;
    }

    const promptCost = (promptTokens / 1000) * modelConfig.prompt;
    const completionCost = (completionTokens / 1000) * modelConfig.completion;
    
    return promptCost + completionCost;
  }

  /**
   * Check if a request is allowed based on rate limits
   * @param {Object} requestInfo - Request information
   * @param {string} requestInfo.model - Model to use
   * @param {string} requestInfo.prompt - Prompt text
   * @param {number} requestInfo.estimatedCompletion - Estimated completion tokens
   * @returns {Promise<Object>} Result object with allowed status and reason
   */
  async checkRequest(requestInfo) {
    await this.initialize();

    const { model, prompt, estimatedCompletion = 500 } = requestInfo;
    const promptTokens = this.countTokens(prompt);
    const totalTokens = promptTokens + estimatedCompletion;
    const estimatedCost = this.calculateCost(model, promptTokens, estimatedCompletion);

    // Check per-minute rate limit
    const minuteCheck = this.checkMinuteLimit();
    if (!minuteCheck.allowed) {
      return minuteCheck;
    }

    // Check daily limits
    const dailyCheck = this.checkDailyLimits(totalTokens, estimatedCost);
    if (!dailyCheck.allowed) {
      return dailyCheck;
    }

    // Check monthly limits
    const monthlyCheck = this.checkMonthlyLimits(totalTokens, estimatedCost);
    if (!monthlyCheck.allowed) {
      return monthlyCheck;
    }

    // Check model context window
    const modelConfig = this.models[model];
    if (modelConfig && promptTokens > modelConfig.contextWindow) {
      return {
        allowed: false,
        reason: `Prompt exceeds model context window (${promptTokens} > ${modelConfig.contextWindow})`,
        limitType: 'context'
      };
    }

    return {
      allowed: true,
      estimatedTokens: { prompt: promptTokens, completion: estimatedCompletion, total: totalTokens },
      estimatedCost: estimatedCost
    };
  }

  /**
   * Record usage for a completed request
   * @param {Object} usageInfo - Usage information
   * @param {string} usageInfo.model - Model used
   * @param {number} usageInfo.promptTokens - Actual prompt tokens used
   * @param {number} usageInfo.completionTokens - Actual completion tokens used
   * @returns {Promise<void>}
   */
  async recordUsage(usageInfo) {
    await this.initialize();

    const { model, promptTokens, completionTokens } = usageInfo;
    const totalTokens = promptTokens + completionTokens;
    const cost = this.calculateCost(model, promptTokens, completionTokens);
    const now = Date.now();

    // Update daily usage
    this.usage.daily.tokens.prompt += promptTokens;
    this.usage.daily.tokens.completion += completionTokens;
    this.usage.daily.tokens.total += totalTokens;
    this.usage.daily.requests += 1;
    this.usage.daily.cost += cost;
    
    // Update model breakdown for daily
    if (!this.usage.daily.modelBreakdown[model]) {
      this.usage.daily.modelBreakdown[model] = {
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0
      };
    }
    this.usage.daily.modelBreakdown[model].tokens.prompt += promptTokens;
    this.usage.daily.modelBreakdown[model].tokens.completion += completionTokens;
    this.usage.daily.modelBreakdown[model].tokens.total += totalTokens;
    this.usage.daily.modelBreakdown[model].requests += 1;
    this.usage.daily.modelBreakdown[model].cost += cost;

    // Update monthly usage
    this.usage.monthly.tokens.prompt += promptTokens;
    this.usage.monthly.tokens.completion += completionTokens;
    this.usage.monthly.tokens.total += totalTokens;
    this.usage.monthly.requests += 1;
    this.usage.monthly.cost += cost;

    // Update model breakdown for monthly
    if (!this.usage.monthly.modelBreakdown[model]) {
      this.usage.monthly.modelBreakdown[model] = {
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0
      };
    }
    this.usage.monthly.modelBreakdown[model].tokens.prompt += promptTokens;
    this.usage.monthly.modelBreakdown[model].tokens.completion += completionTokens;
    this.usage.monthly.modelBreakdown[model].tokens.total += totalTokens;
    this.usage.monthly.modelBreakdown[model].requests += 1;
    this.usage.monthly.modelBreakdown[model].cost += cost;

    // Update lifetime usage
    this.usage.lifetime.tokens.prompt += promptTokens;
    this.usage.lifetime.tokens.completion += completionTokens;
    this.usage.lifetime.tokens.total += totalTokens;
    this.usage.lifetime.requests += 1;
    this.usage.lifetime.cost += cost;

    // Update model breakdown for lifetime
    if (!this.usage.lifetime.modelBreakdown[model]) {
      this.usage.lifetime.modelBreakdown[model] = {
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0
      };
    }
    this.usage.lifetime.modelBreakdown[model].tokens.prompt += promptTokens;
    this.usage.lifetime.modelBreakdown[model].tokens.completion += completionTokens;
    this.usage.lifetime.modelBreakdown[model].tokens.total += totalTokens;
    this.usage.lifetime.modelBreakdown[model].requests += 1;
    this.usage.lifetime.modelBreakdown[model].cost += cost;

    // Update minutely tracking
    this.usage.minutely.requests.push(now);
    
    // Clean old minute entries
    const oneMinuteAgo = now - 60000;
    this.usage.minutely.requests = this.usage.minutely.requests.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    await this.saveUsage();
  }

  /**
   * Get usage statistics
   * @param {string} period - Period to get stats for ('daily', 'monthly', 'lifetime')
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(period = 'daily') {
    await this.initialize();

    const usage = this.usage[period];
    if (!usage) {
      throw new Error(`Invalid period: ${period}`);
    }

    const limits = this.limits[period];
    const stats = {
      period,
      usage: { ...usage },
      limits: limits ? { ...limits } : null,
      percentages: {}
    };

    if (limits) {
      stats.percentages = {
        tokens: limits.tokens ? (usage.tokens.total / limits.tokens) * 100 : null,
        requests: limits.requests ? (usage.requests / limits.requests) * 100 : null,
        cost: limits.cost ? (usage.cost / limits.cost) * 100 : null
      };
    }

    return stats;
  }

  /**
   * Get all usage statistics
   * @returns {Promise<Object>} All usage statistics
   */
  async getAllStats() {
    await this.initialize();

    return {
      daily: await this.getUsageStats('daily'),
      monthly: await this.getUsageStats('monthly'),
      lifetime: await this.getUsageStats('lifetime'),
      currentMinuteRequests: this.usage.minutely.requests.length
    };
  }

  /**
   * Reset usage for a specific period
   * @param {string} period - Period to reset ('daily', 'monthly')
   * @returns {Promise<void>}
   */
  async resetUsage(period) {
    await this.initialize();

    const now = new Date();
    
    if (period === 'daily') {
      this.usage.daily = {
        date: this.getDateString(now),
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0,
        modelBreakdown: {}
      };
    } else if (period === 'monthly') {
      this.usage.monthly = {
        month: this.getMonthString(now),
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0,
        modelBreakdown: {}
      };
    }

    await this.saveUsage();
  }

  /**
   * Update rate limits
   * @param {Object} newLimits - New limits configuration
   * @returns {Promise<void>}
   */
  async updateLimits(newLimits) {
    this.limits = { ...this.limits, ...newLimits };
    await this.saveToStorage('rateLimiterConfig', { limits: this.limits });
  }

  // Private helper methods

  /**
   * Check if request is within minute limit
   * @private
   */
  checkMinuteLimit() {
    const currentRequests = this.usage.minutely.requests.length;
    
    if (currentRequests >= this.limits.perMinute.requests) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${currentRequests}/${this.limits.perMinute.requests} requests per minute`,
        limitType: 'rate',
        retryAfter: 60 - Math.floor((Date.now() - Math.min(...this.usage.minutely.requests)) / 1000)
      };
    }

    return { allowed: true };
  }

  /**
   * Check if request is within daily limits
   * @private
   */
  checkDailyLimits(tokens, cost) {
    const daily = this.usage.daily;
    const limits = this.limits.daily;

    if (limits.tokens && daily.tokens.total + tokens > limits.tokens) {
      return {
        allowed: false,
        reason: `Daily token limit exceeded: ${daily.tokens.total + tokens}/${limits.tokens}`,
        limitType: 'daily_tokens'
      };
    }

    if (limits.requests && daily.requests + 1 > limits.requests) {
      return {
        allowed: false,
        reason: `Daily request limit exceeded: ${daily.requests + 1}/${limits.requests}`,
        limitType: 'daily_requests'
      };
    }

    if (limits.cost && daily.cost + cost > limits.cost) {
      return {
        allowed: false,
        reason: `Daily cost limit exceeded: $${(daily.cost + cost).toFixed(2)}/$${limits.cost.toFixed(2)}`,
        limitType: 'daily_cost'
      };
    }

    return { allowed: true };
  }

  /**
   * Check if request is within monthly limits
   * @private
   */
  checkMonthlyLimits(tokens, cost) {
    const monthly = this.usage.monthly;
    const limits = this.limits.monthly;

    if (limits.tokens && monthly.tokens.total + tokens > limits.tokens) {
      return {
        allowed: false,
        reason: `Monthly token limit exceeded: ${monthly.tokens.total + tokens}/${limits.tokens}`,
        limitType: 'monthly_tokens'
      };
    }

    if (limits.requests && monthly.requests + 1 > limits.requests) {
      return {
        allowed: false,
        reason: `Monthly request limit exceeded: ${monthly.requests + 1}/${limits.requests}`,
        limitType: 'monthly_requests'
      };
    }

    if (limits.cost && monthly.cost + cost > limits.cost) {
      return {
        allowed: false,
        reason: `Monthly cost limit exceeded: $${(monthly.cost + cost).toFixed(2)}/$${limits.cost.toFixed(2)}`,
        limitType: 'monthly_cost'
      };
    }

    return { allowed: true };
  }

  /**
   * Check and reset usage periods if needed
   * @private
   */
  async checkAndResetPeriods() {
    const now = new Date();
    const currentDate = this.getDateString(now);
    const currentMonth = this.getMonthString(now);

    let needsSave = false;

    // Reset daily usage if it's a new day
    if (this.usage.daily.date !== currentDate) {
      this.usage.daily = {
        date: currentDate,
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0,
        modelBreakdown: {}
      };
      needsSave = true;
    }

    // Reset monthly usage if it's a new month
    if (this.usage.monthly.month !== currentMonth) {
      this.usage.monthly = {
        month: currentMonth,
        tokens: { prompt: 0, completion: 0, total: 0 },
        requests: 0,
        cost: 0,
        modelBreakdown: {}
      };
      needsSave = true;
    }

    if (needsSave) {
      await this.saveUsage();
    }
  }

  /**
   * Get date string in YYYY-MM-DD format
   * @private
   */
  getDateString(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get month string in YYYY-MM format
   * @private
   */
  getMonthString(date) {
    return date.toISOString().slice(0, 7);
  }

  /**
   * Save usage data to Chrome storage
   * @private
   */
  async saveUsage() {
    await this.saveToStorage(this.storageKey, { usage: this.usage });
  }

  /**
   * Save data to Chrome storage
   * @private
   */
  async saveToStorage(key, data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get data from Chrome storage
   * @private
   */
  async getFromStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  /**
   * Export usage data for backup or analysis
   * @returns {Promise<Object>} Complete usage data
   */
  async exportData() {
    await this.initialize();
    
    return {
      usage: this.usage,
      limits: this.limits,
      models: this.models,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Import usage data from backup
   * @param {Object} data - Data to import
   * @returns {Promise<void>}
   */
  async importData(data) {
    if (!data || !data.usage) {
      throw new Error('Invalid import data');
    }

    this.usage = data.usage;
    
    if (data.limits) {
      this.limits = data.limits;
    }
    
    if (data.models) {
      this.models = data.models;
    }

    await this.saveUsage();
    await this.saveToStorage('rateLimiterConfig', { 
      limits: this.limits,
      models: this.models 
    });
  }
}

// Export the RateLimiter class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RateLimiter;
}