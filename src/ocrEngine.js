// src/ocrEngine.js - OCR ENGINE MODULE (Multi-PSM Strategy)
// Version: 2.3.0
// Modularized OCR execution with multi-PSM fallback strategy and scoring system

const tesseract = require('node-tesseract-ocr');
const config = require('../config/tesseract.config');

/**
 * Execute OCR with multi-PSM fallback strategy and scoring system
 * GOLD STANDARD: Reddit validated multi-PSM approach with intelligent scoring
 * 
 * Strategy:
 * 1. Try PSM chain [4, 6, 3, 11] in order
 * 2. Score each result: +30 for $, +30 for numbers, +40 for "$ <number>" pattern
 * 3. Early exit when score >= 70
 * 4. Return best result with confidence
 * 
 * @param {string} tempFilePath - Path to preprocessed image file
 * @returns {Promise<object>} {rawText, usedPsm, confidence}
 */
async function performOCRWithFallback(tempFilePath) {
  try {
    let bestResult = '';
    let bestScore = -1;
    let usedPsm = config.ocr.psm;
    
    console.log(`🔍 OCR: Starting multi-PSM fallback strategy...`);
    
    // ✅ MULTI-PSM FALLBACK STRATEGY con SCORING SYSTEM (Reddit gold standard)
    for (const psm of config.ocr.psmFallbackChain) {
      try {
        const ocrConfig = { ...config.ocr, psm: psm };
        const result = await tesseract.recognize(tempFilePath, ocrConfig);
        
        if (!result) continue;
        
        const trimmed = result.trim();
        
        // 🎯 SCORING SYSTEM (validado por comunidad)
        // +30: tiene símbolo $
        // +30: tiene números (2+ dígitos)
        // +40: tiene patrón "$ <número>" (formato esperado)
        let score = 0;
        if (trimmed.includes('$')) score += 30;
        if (trimmed.match(/\d{2,}/)) score += 30;
        if (trimmed.match(/\$\s*\d/)) score += 40;  // $ seguido de espacio y número
        
        // Bonus: más caracteres = mejor cobertura
        score += Math.min(trimmed.length / 50, 20);  // Máx +20 por contenido
        
        const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
        const hasMoneyPattern = trimmed.includes('$');
        
        console.log(`✅ PSM ${psm}: score=${score.toFixed(1)} (${trimmed.length} chars, ${lines.length} lines, has_$=${hasMoneyPattern})`);
        
        // Guardar mejor resultado
        if (score > bestScore) {
          bestScore = score;
          bestResult = trimmed;
          usedPsm = psm;
        }
        
        // 🎯 EARLY EXIT: si encontramos formato esperado con confidence alta
        if (score >= 70) {
          console.log(`⭐ Early exit: PSM ${psm} alcanzó confidence 70+ (${score.toFixed(1)})`);
          break;
        }
        
      } catch (e) {
        console.log(`⚠️ PSM ${psm} falló: ${e.message}`);
      }
    }
    
    // Convertir score a confidence (0-100)
    const confidence = Math.min(bestScore, 100);
    
    if (!bestResult) {
      console.warn(`⚠️ OCR: No readable text found in image`);
      return {
        rawText: '',
        usedPsm: config.ocr.psm,
        confidence: 0,
        error: 'No readable text detected'
      };
    }
    
    return {
      rawText: bestResult,
      usedPsm: usedPsm,
      confidence: confidence,
      score: bestScore
    };
    
  } catch (error) {
    console.error('❌ OCR engine error:', error.message);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

/**
 * Get current Tesseract configuration
 * @returns {object} OCR configuration
 */
function getOCRConfig() {
  return {
    lang: config.ocr.lang,
    oem: config.ocr.oem,
    psm: config.ocr.psm,
    psmFallbackChain: config.ocr.psmFallbackChain,
    preserve_interword_spaces: config.ocr.preserve_interword_spaces
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  performOCRWithFallback,
  getOCRConfig
};
