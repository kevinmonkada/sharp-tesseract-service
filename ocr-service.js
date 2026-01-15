// ocr-service.js - OCR SERVICE MAIN ENTRY POINT
// Version: 2.3.0
// Main Express server orchestrating Sharp preprocessing + Tesseract OCR + Post-processing

const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

// Import modular components
const sharpOptimizer = require('./src/sharpOptimizer');
const ocrEngine = require('./src/ocrEngine');
const ocrPostProcessor = require('./src/ocrPostProcessor');

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ocr-service',
    version: '2.3.0',
    capabilities: ['ocr', 'image-optimization', 'text-extraction', 'multi-psm-strategy'],
    supportedFormats: sharpOptimizer.getSupportedFormats()
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENDPOINT: /process
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/process', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  let tempFilePath = null;
  
  try {
    let imageBuffer;
    let mimeType = 'image/jpeg';

    // Obtener referencia y otros parámetros opcionales
    const reference = req.body.reference || Date.now().toString();
    const responseMode = req.body.responseMode || 'direct';

    // ✅ PASO 0: Obtener imagen desde cualquier fuente
    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    }
    else if (req.body.imageBuffer) {
      const base64Data = req.body.imageBuffer.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    else if (req.body.imageUrl) {
      const axios = require('axios');
      const response = await axios.get(req.body.imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      imageBuffer = Buffer.from(response.data);
    }
    else {
      return res.status(400).json([{
        id: Date.now().toString(),
        status: "failed",
        reference: reference,
        error: 'No image provided (file, imageUrl, or imageBuffer required)'
      }]);
    }

    const originalSize = imageBuffer.length;
    
    // ✅ PASO 1: SHARP PREPROCESSING (Modular optimizer)
    let optimized = await sharpOptimizer.optimizeForOCR(imageBuffer);
    const optimizedSize = optimized.length;
    
    // ✅ PASO 2: Guardar temporalmente para Tesseract
    tempFilePath = path.join('/tmp', `ocr_${Date.now()}.jpg`);
    await fs.writeFile(tempFilePath, optimized);
    
    // ✅ PASO 3: OCR CON TESSERACT (Modular engine with multi-PSM)
    const ocrResult = await ocrEngine.performOCRWithFallback(tempFilePath);
    const rawText = ocrResult.rawText;
    
    // ✅ PASO 4: POST-PROCESSING (ocrPostProcessor handles everything internally)
    // ocrPostProcessor will cascade load: personal useCase > example template > basic
    const processedData = ocrPostProcessor.processOCRText(rawText);
    
    const totalTime = Date.now() - startTime;
    const processingTimeInSeconds = parseFloat((totalTime / 1000).toFixed(1));
    
    const formatterUsed = processedData._processorInfo?.formatterUsed || 'unknown';
    console.log(`✅ Process complete: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB | Formatter: ${formatterUsed} | PSM: ${ocrResult.usedPsm} | ${totalTime}ms`);
    
    // ✅ PASO 5: Retornar JSON en schema compatible
    const response = [{
      role: 'user',
      content: [{
        type: 'document',
        source: { type: 'text' },
        title: req.file?.originalname || 'ocr_image.jpg',
        text: processedData.text,
        raw: rawText,
        extracted: {
          amounts: processedData.extracted.amounts,
          dates: processedData.extracted.dates,
          references: processedData.extracted.references,
          status: processedData.extracted.status,
          merchant: processedData.extracted.merchant
        },
        captureType: processedData.captureType,
        confidence: processedData.confidence,
        metadata: {
          processingTime: totalTime,
          processorUsed: processedData._processorInfo?.formatterUsed || 'unknown',
          ocrEngine: 'tesseract',
          ocrPsm: ocrResult.usedPsm,
          ocrConfidence: ocrResult.confidence,
          version: '2.3.0'
        }
      }]
    }];
    
    res.json(response);
    
    // Cleanup
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
    
  } catch (error) {
    console.error('❌ Processing error:', error);
    
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
    
    res.status(500).json([{
      role: 'user',
      content: [{
        type: 'document',
        error: error.message
      }]
    }]);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ OCR Service v2.3.0 running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔧 Endpoint: POST /process`);
  console.log(`📦 Components: Sharp Optimizer + OCR Engine (Multi-PSM) + Post Processor`);
});
