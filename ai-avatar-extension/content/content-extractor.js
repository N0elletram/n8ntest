/**
 * AI Avatar Content Extractor
 * Analyzes webpage content and converts it to markdown for AI conversation
 */

class ContentExtractor {
  constructor() {
    this.extractedContent = null;
    this.pageMetadata = null;
    this.isAnalyzing = false;
  }

  /**
   * Main content extraction method
   */
  async extractPageContent() {
    if (this.isAnalyzing) return this.extractedContent;
    
    this.isAnalyzing = true;
    
    try {
      // Extract page metadata
      this.pageMetadata = this.extractMetadata();
      
      // Extract main content
      const mainContent = this.extractMainContent();
      
      // Convert to markdown
      const markdownContent = this.convertToMarkdown(mainContent);
      
      // Create structured content object
      this.extractedContent = {
        url: window.location.href,
        title: document.title,
        metadata: this.pageMetadata,
        content: markdownContent,
        wordCount: this.countWords(markdownContent),
        extractedAt: new Date().toISOString(),
        contentType: this.detectContentType()
      };
      
      return this.extractedContent;
      
    } catch (error) {
      console.error('Content extraction failed:', error);
      return null;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Extract page metadata
   */
  extractMetadata() {
    const metadata = {
      title: document.title,
      description: this.getMetaContent('description'),
      keywords: this.getMetaContent('keywords'),
      author: this.getMetaContent('author'),
      publishDate: this.getMetaContent('article:published_time') || this.getMetaContent('date'),
      siteName: this.getMetaContent('og:site_name'),
      articleType: this.getMetaContent('og:type'),
      language: document.documentElement.lang || 'en'
    };
    
    return metadata;
  }

  /**
   * Get meta tag content
   */
  getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  /**
   * Extract main content from page
   */
  extractMainContent() {
    // Try to find main content using various selectors
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '#content',
      '#main-content'
    ];

    let mainElement = null;
    
    // Try each selector until we find content
    for (const selector of contentSelectors) {
      mainElement = document.querySelector(selector);
      if (mainElement && this.hasSignificantContent(mainElement)) {
        break;
      }
    }

    // Fallback to body if no main content found
    if (!mainElement) {
      mainElement = document.body;
    }

    // Extract and clean content
    const content = this.extractTextContent(mainElement);
    return this.cleanContent(content);
  }

  /**
   * Check if element has significant content
   */
  hasSignificantContent(element) {
    const text = element.textContent.trim();
    return text.length > 100 && this.countWords(text) > 20;
  }

  /**
   * Extract text content while preserving structure
   */
  extractTextContent(element) {
    const content = [];
    
    this.traverseElement(element, content);
    
    return content;
  }

  /**
   * Traverse DOM element and extract structured content
   */
  traverseElement(element, content, level = 0) {
    // Skip unwanted elements
    if (this.shouldSkipElement(element)) {
      return;
    }

    const tagName = element.tagName?.toLowerCase();
    
    // Handle different element types
    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        const headingLevel = parseInt(tagName.charAt(1));
        content.push({
          type: 'heading',
          level: headingLevel,
          text: element.textContent.trim()
        });
        break;
        
      case 'p':
        const pText = element.textContent.trim();
        if (pText.length > 10) {
          content.push({
            type: 'paragraph',
            text: pText
          });
        }
        break;
        
      case 'ul':
      case 'ol':
        const listItems = Array.from(element.querySelectorAll('li'))
          .map(li => li.textContent.trim())
          .filter(text => text.length > 0);
        
        if (listItems.length > 0) {
          content.push({
            type: tagName === 'ul' ? 'unordered_list' : 'ordered_list',
            items: listItems
          });
        }
        break;
        
      case 'blockquote':
        content.push({
          type: 'quote',
          text: element.textContent.trim()
        });
        break;
        
      case 'code':
      case 'pre':
        content.push({
          type: 'code',
          text: element.textContent.trim()
        });
        break;
        
      case 'table':
        const tableData = this.extractTableData(element);
        if (tableData) {
          content.push(tableData);
        }
        break;
        
      default:
        // For other elements, traverse children
        if (element.children && element.children.length > 0) {
          for (const child of element.children) {
            this.traverseElement(child, content, level + 1);
          }
        } else if (element.textContent && element.textContent.trim().length > 20) {
          // Add significant text content
          content.push({
            type: 'text',
            text: element.textContent.trim()
          });
        }
    }
  }

  /**
   * Check if element should be skipped
   */
  shouldSkipElement(element) {
    if (!element || !element.tagName) return true;
    
    const tagName = element.tagName.toLowerCase();
    const skipTags = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript'];
    
    if (skipTags.includes(tagName)) return true;
    
    // Skip elements with certain classes or IDs
    const className = element.className || '';
    const id = element.id || '';
    const skipPatterns = [
      'nav', 'menu', 'sidebar', 'footer', 'header', 'advertisement', 'ad',
      'social', 'share', 'comment', 'related', 'popup', 'modal'
    ];
    
    return skipPatterns.some(pattern => 
      className.toLowerCase().includes(pattern) || 
      id.toLowerCase().includes(pattern)
    );
  }

  /**
   * Extract table data
   */
  extractTableData(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return null;
    
    const headers = Array.from(rows[0].querySelectorAll('th, td'))
      .map(cell => cell.textContent.trim());
    
    const data = rows.slice(1).map(row => 
      Array.from(row.querySelectorAll('td'))
        .map(cell => cell.textContent.trim())
    );
    
    return {
      type: 'table',
      headers,
      data
    };
  }

  /**
   * Clean extracted content
   */
  cleanContent(content) {
    return content
      .filter(item => item.text && item.text.length > 5)
      .map(item => ({
        ...item,
        text: this.cleanText(item.text)
      }));
  }

  /**
   * Clean text content
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Convert structured content to markdown
   */
  convertToMarkdown(content) {
    const markdown = [];
    
    for (const item of content) {
      switch (item.type) {
        case 'heading':
          markdown.push('#'.repeat(item.level) + ' ' + item.text);
          markdown.push('');
          break;
          
        case 'paragraph':
        case 'text':
          markdown.push(item.text);
          markdown.push('');
          break;
          
        case 'unordered_list':
          item.items.forEach(listItem => {
            markdown.push('- ' + listItem);
          });
          markdown.push('');
          break;
          
        case 'ordered_list':
          item.items.forEach((listItem, index) => {
            markdown.push(`${index + 1}. ${listItem}`);
          });
          markdown.push('');
          break;
          
        case 'quote':
          markdown.push('> ' + item.text);
          markdown.push('');
          break;
          
        case 'code':
          markdown.push('```');
          markdown.push(item.text);
          markdown.push('```');
          markdown.push('');
          break;
          
        case 'table':
          if (item.headers && item.headers.length > 0) {
            markdown.push('| ' + item.headers.join(' | ') + ' |');
            markdown.push('| ' + item.headers.map(() => '---').join(' | ') + ' |');
            
            item.data.forEach(row => {
              if (row.length > 0) {
                markdown.push('| ' + row.join(' | ') + ' |');
              }
            });
            markdown.push('');
          }
          break;
      }
    }
    
    return markdown.join('\n').trim();
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Detect content type
   */
  detectContentType() {
    const url = window.location.href;
    const title = document.title.toLowerCase();
    
    if (url.includes('github.com')) return 'code_repository';
    if (url.includes('stackoverflow.com')) return 'technical_qa';
    if (url.includes('wikipedia.org')) return 'encyclopedia';
    if (url.includes('medium.com') || url.includes('blog')) return 'blog_post';
    if (title.includes('documentation') || title.includes('docs')) return 'documentation';
    if (title.includes('tutorial') || title.includes('guide')) return 'tutorial';
    if (title.includes('news')) return 'news_article';
    
    return 'general_content';
  }
}

// Initialize content extractor
const contentExtractor = new ContentExtractor();

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    contentExtractor.extractPageContent()
      .then(content => sendResponse({ success: true, content }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep message channel open for async response
  }
});

// Auto-extract content when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => contentExtractor.extractPageContent(), 1000);
  });
} else {
  setTimeout(() => contentExtractor.extractPageContent(), 1000);
}

