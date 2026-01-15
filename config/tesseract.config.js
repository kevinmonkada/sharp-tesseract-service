// config/tesseract.config.js - Tesseract OCR Configuration
// Version: 2.3.0
// Centralized OCR engine settings and constants

module.exports = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // TESSERACT OCR CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * OCR Config for financial documents
   * GOLD STANDARD: Configuración validada por Reddit + Stack Overflow
   * OEM (OCR Engine Mode): 1 = LSTM only (95-98% accuracy para texto impreso)
   * Languages: Spanish + English for Colombian financial documents
   * 
   * PSM_FALLBACK_CHAIN (GOLD STANDARD):
   *  - PSM 4: Single column variable-size text (PRIMARY - optimal para recibos verticales)
   *  - PSM 6: Uniform block of text (SECONDARY - for tabulated receipts)
   *  - PSM 3: Fully automatic (tertiary - for mixed layouts)
   *  - PSM 11: Sparse text (maximum coverage fallback)
   */
  ocr: {
    lang: 'spa+eng',              // ✅ Support both Spanish and English
    oem: 1,                       // ✅ LSTM only (95-98% accuracy para texto impreso)
    psm: 4,                       // ✅ PRIMARY: Single column (optimizado para recibos verticales)
    psmFallbackChain: [4, 6, 3, 11],  // ✅ GOLD STANDARD: 4→6→3→11 (Reddit validated)
    preserve_interword_spaces: '1'  // ✅ Mantener espacios entre palabras
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // IMAGE OPTIMIZATION PIPELINE CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Sharp image optimization settings
   * Optimized for financial documents: account statements, credit card invoices, etc.
   */
  imageOptimization: {
    // Resize constraints
    resize: {
      width: 1500,              // ✅ Target width for OCR (balance between quality and speed)
      fit: 'inside',            // Don't enlarge
      withoutEnlargement: true  // Skip if already smaller
    },

    // Processing pipeline
    pipeline: {
      grayscale: true,          // Convert to grayscale for OCR
      normalize: true,          // Normalize levels
      sharpen: {
        sigma: 0.8              // ✅ FIX: Reduce artifacts (0.8 instead of 1.0)
      },
      // threshold: null,        // ❌ Disabled to preserve text with shadows
      jpeg: {
        quality: 95             // High quality JPEG output
      }
    },

    // Optimization triggers
    triggers: {
      maxFileSizeKB: 150,       // Trigger optimization if > 150KB
      minWidth: 2400,           // Trigger if width > 2400px
      minHeight: 2400,          // Trigger if height > 2400px
      minChannels: 1            // Trigger if not grayscale
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESPONSE CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * API response format and capabilities
   */
  response: {
    version: '2.3.0',
    capabilities: ['ocr', 'optimization', 'text-extraction', 'synthesized-text'],
    schema: {
      role: 'user',
      contentType: 'document',
      sourceType: 'text'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEBUGGING CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Debug mode flags (controlled by environment variables)
   */
  debug: {
    logRawOCR: process.env.DEBUG_OCR === 'true',      // Log raw OCR output
    logProcessed: process.env.DEBUG_OCR === 'true',   // Log processed data
    verbose: process.env.VERBOSE === 'true'           // Verbose logging
  }
};
