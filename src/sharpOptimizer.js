// src/sharpOptimizer.js - SHARP IMAGE OPTIMIZATION MODULE
// Version: 2.3.0
// Modularized Sharp preprocessing pipeline (GOLD STANDARD - Reddit validated)

const sharp = require('sharp');

/**
 * Optimize image for OCR processing using GOLD STANDARD pipeline
 * Based on: sparkco.ai + expertbeacon.com + Reddit r/tesseract
 * 
 * Pipeline: resize(3000) → grayscale → normalize → blur(0.3) → sharpen(1.0)
 * 
 * @param {Buffer} imageBuffer - Raw image buffer (supports JPEG, PNG, GIF, WebP, TIFF)
 * @returns {Promise<Buffer>} Optimized JPEG buffer (quality 95)
 */
async function optimizeForOCR(imageBuffer) {
  try {
    const startTime = Date.now();
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const originalSize = imageBuffer.length;
    
    // ✅ PIPELINE GOLD STANDARD - Reddit + Stack Overflow validated
    // Basado en: sparkco.ai + expertbeacon.com + Reddit r/tesseract
    let pipeline = sharp(imageBuffer)
      .resize({
        width: 3000,                      // DPI óptimo (300-400 DPI equivalente)
        fit: 'inside',
        withoutEnlargement: true,
        kernel: 'lanczos3'
      })
      .grayscale()                        // Reducir complejidad
      .normalize()                        // Balance automático de histograma
      .blur(0.3)                          // Gaussian blur ligero: reduce ruido sin perder bordes
      .sharpen({                          // Sharpen moderado: mejora bordes de texto
        sigma: 1.0,
        m1: 1.0,
        m2: 0.2,
        x1: 2,
        y2: 10
      });
    
    // Output as high-quality JPEG
    const optimized = await pipeline
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      .toBuffer();
    
    const optimizedSize = optimized.length;
    const processingTime = Date.now() - startTime;
    
    console.log(`ℹ️ Sharp: ${(originalSize/1024).toFixed(0)}KB → ${(optimizedSize/1024).toFixed(0)}KB | 3000px + normalize + blur 0.3 + sharpen 1.0 | ${processingTime}ms`);
    
    return optimized;
    
  } catch (error) {
    console.error('❌ Sharp optimization error:', error.message);
    throw new Error(`Sharp preprocessing failed: ${error.message}`);
  }
}

/**
 * Supported image formats
 * @returns {string[]} List of supported formats
 */
function getSupportedFormats() {
  return [
    'jpeg',   // JPEG/JPG images
    'jpg',
    'png',    // PNG images
    'gif',    // GIF images
    'webp',   // WebP images
    'tiff'    // TIFF images
  ];
}

/**
 * Get image metadata without full processing
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<object>} Image metadata (width, height, format, etc.)
 */
async function getImageMetadata(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density
    };
  } catch (error) {
    console.error('❌ Metadata extraction error:', error.message);
    throw new Error(`Could not read image metadata: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  optimizeForOCR,
  getSupportedFormats,
  getImageMetadata
};
