// src/utils.js - Shared Utility Functions
// Version: 2.3.0
// Common helpers used across modules

/**
 * Format amount string as Colombian currency format
 * Converts "1382606.70" to "1.382.606,70" (dots for thousands, comma for decimal)
 * 
 * @param {string} amountStr - Amount string with optional decimal (e.g., "1382606.70")
 * @returns {string} Formatted amount (e.g., "1.382.606,70")
 */
function formatAmount(amountStr) {
  if (!amountStr) return '';
  
  // Separar parte entera y decimal
  const [intPart, decimalPart] = amountStr.split('.');
  
  // Formatear parte entera con separadores de miles (puntos)
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retornar con decimales si existen (formato colombiano: coma)
  return decimalPart ? `${formatted},${decimalPart}` : formatted;
}

/**
 * Check if a number string is likely part of an amount or date
 * Helps filter out false positive references
 * 
 * @param {string} num - Number string to check
 * @param {string} text - Full OCR text for context
 * @returns {boolean} True if likely amount or date
 */
function isLikelyAmountOrDate(num, text) {
  const amountPattern = new RegExp(`\\$[\\s.,]*${num}`, 'g');
  if (amountPattern.test(text)) return true;

  const datePattern = new RegExp(`${num}[\\s\\/\\-]\\d{1,2}[\\s\\/\\-]\\d{2,4}`, 'g');
  if (datePattern.test(text)) return true;

  return false;
}

/**
 * Check if a number string is likely a year (2020-2030)
 * 
 * @param {string} num - Number string to check
 * @returns {boolean} True if likely a year
 */
function isYear(num) {
  const year = parseInt(num);
  return year >= 2020 && year <= 2030;
}

/**
 * Get Spanish month abbreviation from month number
 * 
 * @param {string} monthNum - Month number (01-12)
 * @returns {string} Spanish month abbreviation (e.g., "ene", "feb")
 */
function getMonthNameShort(monthNum) {
  const months = {
    '01': 'ene', '02': 'feb', '03': 'mar', '04': 'abr',
    '05': 'may', '06': 'jun', '07': 'jul', '08': 'ago',
    '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dic'
  };
  return months[monthNum] || monthNum;
}

/**
 * Format ISO date as Spanish text
 * Converts "2026-02-08" to "8 de feb"
 * 
 * @param {string} isoDate - ISO date string (YYYY-MM-DD)
 * @returns {string} Spanish formatted date (e.g., "8 de feb")
 */
function formatDateSpanish(isoDate) {
  const [year, month, day] = isoDate.split('-');
  const monthName = getMonthNameShort(month);
  return `${parseInt(day)} de ${monthName}`;
}

/**
 * Get emoji for status field
 * 
 * @param {string} status - Status string (e.g., "Al día", "Pendiente")
 * @returns {string} Appropriate emoji for status
 */
function getStatusEmoji(status) {
  if (!status) return '📋';
  const lower = status.toLowerCase();
  if (lower.includes('pendiente')) return '⏳';
  if (lower.includes('completado') || lower.includes('aprobado') || lower.includes('listo')) return '✅';
  if (lower.includes('mora')) return '⚠️';
  if (lower.includes('rechazado')) return '❌';
  if (lower.includes('día')) return '✅';
  return '📋';
}

/**
 * Clean raw OCR text from control characters and normalize whitespace
 * 
 * @param {string} rawText - Raw OCR output
 * @returns {string} Cleaned text
 */
function cleanOCRText(rawText) {
  if (!rawText) return '';
  
  return rawText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Remove control chars
    .replace(/\n{3,}/g, '\n\n')                        // Normalize multiple newlines
    .trim();
}

/**
 * Extract and format a single amount from OCR match
 * Handles Colombian format ($1.382.606,70) and international format ($1,382,606.70)
 * 
 * @param {string} rawAmount - Raw amount string from regex match
 * @returns {string} Formatted amount with decimals preserved (e.g., "1382606.70")
 */
function extractAmountFromMatch(rawAmount) {
  let cleanAmount, decimals = '';
  
  if (rawAmount.includes('.') && rawAmount.includes(',')) {
    const parts = rawAmount.replace(/\./g, '').split(',');
    cleanAmount = parts[0];
    decimals = parts.length > 1 ? parts[1] : '';
  } else if (rawAmount.includes(',') && !rawAmount.includes('.')) {
    const commaIndex = rawAmount.indexOf(',');
    const afterComma = rawAmount.substring(commaIndex + 1);
    if (afterComma.length <= 2) {
      cleanAmount = rawAmount.split(',')[0];
      decimals = afterComma;
    } else {
      const parts = rawAmount.replace(/,/g, '').split('.');
      cleanAmount = parts[0];
      decimals = parts.length > 1 ? parts[1] : '';
    }
  } else {
    cleanAmount = rawAmount.replace(/\D/g, '');
    decimals = '';
  }
  
  return decimals ? `${cleanAmount}.${decimals}` : cleanAmount;
}

/**
 * Extract lines from text, with optional trimming and filtering
 * 
 * @param {string} text - Text to split into lines
 * @param {boolean} filterEmpty - Remove empty lines
 * @returns {string[]} Array of lines
 */
function getLines(text, filterEmpty = true) {
  const lines = text.split('\n').map(line => line.trim());
  return filterEmpty ? lines.filter(line => line) : lines;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  formatAmount,
  isLikelyAmountOrDate,
  isYear,
  getMonthNameShort,
  formatDateSpanish,
  getStatusEmoji,
  cleanOCRText,
  extractAmountFromMatch,
  getLines
};
