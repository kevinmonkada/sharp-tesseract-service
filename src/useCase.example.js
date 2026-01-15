// useCase.example.js - EXAMPLE TEMPLATE: Customize for your use case
// 
// This file shows how to implement extraction and formatting for your specific needs
// 
// INSTRUCTIONS:
// 1. Copy this file: cp useCase.example.js useCase.js
// 2. Edit useCase.js to match YOUR documents and needs
// 3. DO NOT commit useCase.js to GitHub (it's in .gitignore)
// 4. Implement only what you need - remove unused formatters
//
// This is a TEMPLATE showing:
// - How to create custom extraction functions
// - How to format output for your specific use case
// - How to integrate with the generic base processor

const baseProcessor = require('./ocrPostProcessor');

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main function: Process OCR text with custom extraction
 * 
 * Copy and customize this function for your specific document types
 */
function processOCRText(rawText) {
  // Step 1: Clean text (use base processor's cleaning logic)
  const cleanText = rawText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Step 2: Extract data - CUSTOMIZE THESE FUNCTIONS FOR YOUR DOCUMENTS
  const extracted = {
    amounts: extractAmountsExample(cleanText),
    dates: extractDatesExample(cleanText),
    references: extractReferencesExample(cleanText),
    status: extractStatusExample(cleanText),
    merchant: extractMerchantExample(cleanText, rawText)
  };

  // Step 3: Calculate confidence (uses generic formula from base processor)
  const confidence = baseProcessor.calculateConfidence(extracted);

  // Step 4: Format output - CHOOSE YOUR FORMATTER
  // Uncomment the format function you want to use:
  const text = formatForConsoleLog(extracted);
  // const text = formatForJSON(extracted);
  // const text = formatForCSV(extracted);

  return {
    raw: rawText,
    extracted: extracted,
    text: text,
    confidence: confidence
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE EXTRACTION FUNCTIONS
// 
// Modify these to match YOUR document types and patterns
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Example: Extract amounts
 * Add your own regex patterns for your specific documents
 */
function extractAmountsExample(text) {
  const amounts = [];
  
  // Example regex: Look for $ amounts (modify as needed)
  const pattern = /\$\s*([\d]+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const normalized = baseProcessor.normalizeAmount(match[1]);
    if (normalized && !amounts.includes(normalized)) {
      amounts.push(normalized);
    }
  }

  return amounts;
}

/**
 * Example: Extract dates
 * Modify regex patterns and month dictionaries for your region/documents
 */
function extractDatesExample(text) {
  const dates = [];
  
  // Add your date extraction patterns here
  // This is just an example structure
  
  return dates;
}

/**
 * Example: Extract references (card numbers, transaction IDs, etc.)
 */
function extractReferencesExample(text) {
  const references = [];
  
  // Example: Look for ****1234 pattern (masked card)
  const pattern = /\*{4}\s?(\d{4})\b/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    references.push(match[1]);
  }

  return references;
}

/**
 * Example: Extract status keywords
 * Customize the keywords and statuses for your use case
 */
function extractStatusExample(text) {
  const keywords = {
    'Complete': ['done', 'finished', 'completed'],
    'Pending': ['pending', 'waiting'],
    'Failed': ['error', 'failed', 'rejected']
  };

  const lowerText = text.toLowerCase();

  for (const [status, statusKeywords] of Object.entries(keywords)) {
    for (const keyword of statusKeywords) {
      if (lowerText.includes(keyword)) {
        return status;
      }
    }
  }

  return null;
}

/**
 * Example: Extract merchant/provider name
 * Customize the merchant list for your specific use case
 */
function extractMerchantExample(text, rawText) {
  const merchants = [
    'amazon', 'spotify', 'netflix', 'github', 'slack'
    // Add your merchants here
  ];

  const lowerText = text.toLowerCase();

  for (const merchant of merchants) {
    if (lowerText.includes(merchant)) {
      return merchant;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE OUTPUT FORMATTERS
// 
// Choose or create your own format for the extracted data
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Example 1: Console/Log format - Easy to read
 */
function formatForConsoleLog(extracted) {
  const lines = [];

  lines.push(`📦 Item: ${extracted.merchant || 'Unknown'}`);
  
  if (extracted.amounts.length > 0) {
    lines.push(`💰 Amount: $${extracted.amounts[0]}`);
  }

  if (extracted.dates.length > 0) {
    lines.push(`📅 Date: ${extracted.dates[0]}`);
  }

  if (extracted.status) {
    lines.push(`✅ Status: ${extracted.status}`);
  }

  return lines.join('\n');
}

/**
 * Example 2: JSON format - For API responses
 */
function formatForJSON(extracted) {
  return JSON.stringify(extracted, null, 2);
}

/**
 * Example 3: CSV format - For spreadsheets
 */
function formatForCSV(extracted) {
  return [
    extracted.merchant || 'N/A',
    extracted.amounts.join('; ') || '',
    extracted.dates.join('; ') || '',
    extracted.status || ''
  ].join(',');
}

/**
 * Example 4: Plain text - Minimal format
 */
function formatForPlainText(extracted) {
  const lines = [];
  lines.push(`Merchant: ${extracted.merchant}`);
  lines.push(`Amount: ${extracted.amounts.join(', ')}`);
  lines.push(`Date: ${extracted.dates.join(', ')}`);
  lines.push(`Status: ${extracted.status}`);
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS - Customize what you export
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  processOCRText,
  extractAmountsExample,
  extractDatesExample,
  extractReferencesExample,
  extractStatusExample,
  extractMerchantExample,
  formatForConsoleLog,
  formatForJSON,
  formatForCSV,
  formatForPlainText
};
