/**
 * Utility functions for working with Quill rich text content
 */

/**
 * Extracts plain text from HTML content
 * @param html - HTML string from Quill editor
 * @returns Plain text content without formatting
 */
export const getPlainTextFromHtml = (html: string): string => {
  if (!html) return '';
  // Create a temporary div to parse HTML (client-side only)
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  
  // Fallback for server-side: basic HTML tag removal
  return html
    .replace(/<[^>]*>/g, ' ') // Replace HTML tags with spaces
    .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
    .trim();                  // Trim leading/trailing spaces
};

/**
 * Sanitizes HTML content from Quill editor to prevent XSS
 * Basic implementation - for production, consider using a library like DOMPurify
 * @param html - HTML string from Quill editor
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Basic sanitization - replace script tags and on* attributes
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    .replace(/on\w+=\w+/g, '');
    
  return sanitized;
};

/**
 * Truncates HTML content to a specified length while preserving formatting
 * @param html - HTML string from Quill editor
 * @param maxLength - Maximum length in characters
 * @param suffix - Optional suffix to add when truncated (e.g., "...")
 * @returns Truncated HTML string
 */
export const truncateHtml = (
  html: string,
  maxLength: number = 100,
  suffix: string = '...'
): string => {
  if (!html) return '';
  
  // Get plain text first to measure length
  const plainText = getPlainTextFromHtml(html);
  
  // If text is already shorter than maxLength, return original HTML
  if (plainText.length <= maxLength) {
    return html;
  }
  
  // For client-side only
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let result = '';
    let currentLength = 0;
    
    // Function to process nodes recursively
    const processNode = (node: Node): boolean => {
      if (currentLength >= maxLength) return false;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const remainingLength = maxLength - currentLength;
        
        if (currentLength + text.length <= maxLength) {
          result += text;
          currentLength += text.length;
          return true;
        } else {
          result += text.substring(0, remainingLength);
          currentLength = maxLength;
          return false;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // Skip certain elements
        if (tagName === 'style' || tagName === 'script') {
          return true;
        }
        
        const startTag = element.outerHTML.split('>')[0] + '>';
        result += startTag;
        
        // Process child nodes
        const childNodes = Array.from(element.childNodes);
        for (const child of childNodes) {
          if (!processNode(child)) break;
        }
        
        result += `</${tagName}>`;
        return currentLength < maxLength;
      }
      
      return true;
    };
    
    // Process root nodes
    const rootNodes = Array.from(tempDiv.childNodes);
    for (const node of rootNodes) {
      if (!processNode(node)) break;
    }
    
    return result + (currentLength >= maxLength ? suffix : '');
  }
  
  // Fallback for server-side: just truncate plain text
  return plainText.substring(0, maxLength) + suffix;
};

/**
 * Creates a Delta object from HTML content (useful when you need to convert HTML back to Delta)
 * Requires Quill to be available (client-side only)
 * @param html - HTML string
 * @returns Delta object or null if Quill is not available
 */
export const createDeltaFromHtml = (html: string): any => {
  if (typeof window === 'undefined' || !html) return null;
  
  try {
    // Access Quill dynamically since it's only available client-side
    const Quill = require('react-quill-new').Quill;
    
    // Create a temporary editor to convert HTML to Delta
    const tempContainer = document.createElement('div');
    document.body.appendChild(tempContainer);
    
    const quill = new Quill(tempContainer, { readOnly: true });
    quill.clipboard.dangerouslyPasteHTML(html);
    
    const delta = quill.getContents();
    
    // Clean up
    document.body.removeChild(tempContainer);
    
    return delta;
  } catch (error) {
    console.error('Error creating Delta from HTML:', error);
    return null;
  }
}; 