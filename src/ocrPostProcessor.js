// ocrPostProcessor.js - MAIN OCR POST-PROCESSOR WITH CASCADE LOADING
// 
// This is the PRIMARY processor that orchestrates:
// 1. Basic text cleaning
// 2. Cascade loading of custom formatters (personal > example > none)
// 3. Text formatting with optional custom logic
//
// Architecture:
// - This module ALWAYS handles the main processOCRText() call
// - Internally tries to load custom formatters in cascading order
// - Falls back gracefully if no custom formatter found

/**
 * MAIN ENTRY POINT: Process raw OCR text
 * 
 * This is called by ocr-service.js - it handles everything internally
 * 
 * @param {string} rawText - Raw OCR output from Tesseract
 * @returns {object} {raw, extracted, text, confidence}
 */
function processOCRText(rawText) {
  // Step 1: Clean text
  const cleanText = rawText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Control chars
    .replace(/\n{3,}/g, '\n\n')                          // Max 2 newlines
    .trim();

  // Step 2: Try to load custom formatter (cascade pattern)
  let customFormatter = null;
  let formatterSource = 'none';

  try {
    // Priority 1: Personal useCase
    customFormatter = require('../img/useCase');
    formatterSource = 'personal (src/useCase.js)';
    console.log(`✨ Loaded PERSONAL formatter`);
  } catch (e1) {
    try {
      // Priority 2: Example template
      customFormatter = require('./useCase.example');
      formatterSource = 'example (src/useCase.example.js)';
      console.log(`📋 Loaded EXAMPLE formatter template`);
    } catch (e2) {
      // Priority 3: No custom formatter
      formatterSource = 'none (using basic)';
      console.log(`📦 Using BASIC formatter (no custom formatter found)`);
    }
  }

  // Step 3: Process with custom formatter if available
  let result;
  
  if (customFormatter && customFormatter.processOCRText) {
    // Use custom formatter's full processOCRText
    result = customFormatter.processOCRText(rawText);
  } else {
    // Basic processing without custom extraction
    const extracted = {
      amounts: [],
      dates: [],
      references: [],
      status: null,
      merchant: null
    };

    const text = cleanText;
    const confidence = 0;

    result = {
      raw: rawText,
      extracted: extracted,
      text: text,
      confidence: confidence
    };
  }

  // Step 4: Attach metadata about formatter used
  result._processorInfo = {
    formatterUsed: formatterSource,
    hasCustomFormatter: customFormatter !== null
  };

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC HELPER FUNCTIONS (Truly reusable)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize amount string to decimal format
 * Handles both Colombian (1.382.606,70) and International (1,382,606.70) formats
 * 
 * @param {string} rawAmount - Amount string
 * @returns {string|null} Normalized amount (e.g., "1382606.70") or null
 */
function normalizeAmount(rawAmount) {
  if (!rawAmount) return null;

  let cleanAmount, decimals = '';

  if (rawAmount.includes('.') && rawAmount.includes(',')) {
    // Colombian format: 1.382.606,70
    const parts = rawAmount.replace(/\./g, '').split(',');
    cleanAmount = parts[0];
    decimals = parts[1] || '';
  } else if (rawAmount.includes(',') && !rawAmount.includes('.')) {
    const commaIndex = rawAmount.indexOf(',');
    const afterComma = rawAmount.substring(commaIndex + 1);
    
    if (afterComma.length <= 2) {
      // Decimal: 1234,50
      cleanAmount = rawAmount.split(',')[0];
      decimals = afterComma;
    } else {
      // Thousands: 1,000,000
      cleanAmount = rawAmount.replace(/,/g, '');
      decimals = '';
    }
  } else if (rawAmount.includes('.') && !rawAmount.includes(',')) {
    const parts = rawAmount.split('.');
    
    if (parts.length === 2 && parts[1].length === 2) {
      // Decimal: 1234.50
      cleanAmount = parts[0];
      decimals = parts[1];
    } else {
      // Thousands: 1.000.000
      cleanAmount = rawAmount.replace(/\./g, '');
      decimals = '';
    }
  } else {
    // No separators
    cleanAmount = rawAmount;
    decimals = '';
  }

  // Validation: allow $0 or [$100 - $100M]
  const numeric = parseInt(cleanAmount);
  if (numeric === 0 || (numeric >= 100 && numeric <= 100000000)) {
    return decimals ? `${cleanAmount}.${decimals}` : cleanAmount;
  }

  return null;
}

/**
 * Format normalized amount to display format
 * "1382606.70" → "$1.382.606,70" (Colombian)
 * 
 * @param {string} normalizedAmount - Normalized amount
 * @returns {string} Formatted for display
 */
function formatAmountForDisplay(normalizedAmount) {
  if (!normalizedAmount) return '';
  
  const [intPart, decimalPart] = normalizedAmount.split('.');
  
  // Add thousands separators (dots in Colombian format)
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Return with decimals in Colombian format (comma)
  return decimalPart ? `${formatted},${decimalPart}` : formatted;
}

/**
 * Check if a string looks like a year (2020-2030)
 * 
 * @param {string} str - String to check
 * @returns {boolean} True if likely a year
 */
function isYearLike(str) {
  const year = parseInt(str);
  return year >= 2020 && year <= 2030;
}

/**
 * Extract lines from text as array, trimmed and filtered
 * 
 * @param {string} text - Text to split
 * @returns {string[]} Array of non-empty trimmed lines
 */
function getLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Search for keywords in text (case-insensitive)
 * 
 * @param {string} text - Text to search in
 * @param {string[]} keywords - Keywords to find
 * @returns {boolean} True if ANY keyword found
 */
function containsAnyKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Extract month number from Spanish month name
 * 
 * @param {string} monthName - Spanish month name or abbreviation
 * @returns {string|null} Month number (01-12) or null
 */
function getMonthNumberFromSpanish(monthName) {
  const months = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
  };
  return months[monthName.toLowerCase()] || null;
}

/**
 * Calculate confidence score
 * Generic formula: based on what was extracted
 * 
 * @param {object} extracted - Extracted fields object
 * @returns {number} Confidence score (0-100)
 */
function calculateConfidence(extracted) {
  let score = 0;
  const maxScore = 100;

  if ((extracted.amounts || []).length > 0) score += 35;
  if ((extracted.dates || []).length > 0) score += 25;
  if (extracted.merchant) score += 20;
  if (extracted.status) score += 15;
  if ((extracted.references || []).length > 0) score += 5;

  return Math.round((score / maxScore) * 100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Main entry point
  processOCRText,
  
  // Generic helpers
  normalizeAmount,
  formatAmountForDisplay,
  isYearLike,
  getLines,
  containsAnyKeyword,
  getMonthNumberFromSpanish,
  calculateConfidence
};
