const express = require('express');
const sharp = require('sharp');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'image-processing-service',
    version: '2.1.0',
    capabilities: ['ocr', 'optimization', 'text-extraction']
  });
});

// ✅ ÚNICO ENDPOINT: Optimización + OCR + Procesamiento
app.post('/process', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  let tempFilePath = null;
  
  try {
    let imageBuffer;
    let mimeType = 'image/jpeg';

    // Obtener referencia y otros parámetros opcionales desde body
    const reference = req.body.reference || Date.now().toString();
    const responseMode = req.body.responseMode || 'direct';

    // Obtener imagen desde cualquier fuente
    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    }
    else if (req.body.imageBuffer) {
      const base64Data = req.body.imageBuffer.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    else if (req.body.imageUrl) {
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
        models: "tesseract",
        confidence: 0,
        processingTimeInSeconds: 0,
        responseMode: responseMode,
        content: [],
        error: 'No image provided (file, imageUrl, or imageBuffer required)'
      }]);
    }

    // Corregir MIME type de Telegram
    if (mimeType === 'application/octet-stream') {
      mimeType = 'image/jpeg';
    }

    const originalSize = imageBuffer.length;
    const info = await sharp(imageBuffer).metadata();
    
    // ✅ PASO 1: Decidir si optimizar o no
    let optimized = imageBuffer;
    let operations = [];
    let optimizationTime = 0;
    
    // Solo optimizar si la imagen es grande O tiene color
    const needsOptimization = originalSize > 150000 || info.channels > 1 || info.width > 2400 || info.height > 2400;
    
    if (needsOptimization) {
      const optStartTime = Date.now();
      
      let pipeline = sharp(imageBuffer);
      
      // 1. Redimensionar si es muy grande
      const maxDimension = 2400;
      if (info.width > maxDimension || info.height > maxDimension) {
        pipeline = pipeline.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true,
          kernel: 'lanczos3'
        });
        operations.push('resize');
      }
      
      // 2. Escala de grises (solo si tiene color)
      if (info.channels > 1) {
        pipeline = pipeline.grayscale();
        operations.push('grayscale');
      }
      
      // 3. Normalizar contraste
      pipeline = pipeline.normalize();
      operations.push('normalize');
      
      // 4. Sharpen adaptativo según tamaño
      if (originalSize < 150000) {
        pipeline = pipeline.sharpen({ sigma: 1.5, m1: 1.2, m2: 0.6 });
        operations.push('sharpen-high');
      } else {
        pipeline = pipeline.sharpen({ sigma: 1.0, m1: 1.0, m2: 0.8 });
        operations.push('sharpen-low');
      }
      
      // 5. Boost de contraste para imágenes pequeñas
      if (originalSize < 100000) {
        pipeline = pipeline.linear(1.3, -(128 * 1.3) + 128);
        operations.push('contrast-boost');
      }
      
      // 6. Exportar como JPEG optimizado
      optimized = await pipeline
        .jpeg({ quality: 93, chromaSubsampling: '4:4:4' })
        .toBuffer();
      
      optimizationTime = Date.now() - optStartTime;
    } else {
      operations.push('skip-already-optimized');
      console.log(`⚡ Skipping optimization (already optimal: ${(originalSize/1024).toFixed(1)}KB, ${info.channels} channels)`);
    }
    
    const optimizedSize = optimized.length;
    
    // ✅ PASO 2: Guardar temporalmente para Tesseract
    tempFilePath = path.join('/tmp', `ocr_${Date.now()}.jpg`);
    await fs.writeFile(tempFilePath, optimized);
    
    // ✅ PASO 3: Ejecutar OCR con Tesseract
    const ocrStartTime = Date.now();
    const config = {
      lang: 'spa+eng',
      oem: 3,  // LSTM OCR Engine
      psm: 3   // Automatic page segmentation
    };
    
    const rawText = await tesseract.recognize(tempFilePath, config);
    const ocrTime = Date.now() - ocrStartTime;
    
    // ✅ PASO 4: Procesar texto OCR
    const processedData = processOCRText(rawText);
    
    // ✅ Limpiar archivo temporal
    await fs.unlink(tempFilePath);
    tempFilePath = null;
    
    const totalTime = Date.now() - startTime;
    const processingTimeInSeconds = parseFloat((totalTime / 1000).toFixed(1));
    
    console.log(`✅ Process complete: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB | OCR: ${processedData.extracted.text.length} chars | ${totalTime}ms`);
    
    // ✅ PASO 5: Retornar JSON en schema compatible
    const response = [
      {
        id: Date.now().toString(),
        status: "completed",
        reference: reference,
        models: "tesseract",
        confidence: processedData.confidence,
        processingTimeInSeconds: processingTimeInSeconds,
        responseMode: responseMode,
        content: [
          {
            models: "tesseract-v5-sharp-optimized",
            confidence: processedData.confidence,
            text: processedData.extracted.text,
            raw: rawText,
            extracted: {
              amounts: processedData.extracted.amounts,
              dates: processedData.extracted.dates,
              references: processedData.extracted.references,
              status: processedData.extracted.status,
              merchant: processedData.extracted.merchant,
              paymentMethod: processedData.extracted.paymentMethod
            }
          }
        ],
        _metadata: {
          originalSize,
          optimizedSize,
          reduction: needsOptimization ? ((1 - optimizedSize / originalSize) * 100).toFixed(1) + '%' : 'skipped',
          operations: operations.join(','),
          timings: {
            optimization: optimizationTime,
            ocr: ocrTime,
            processing: totalTime - optimizationTime - ocrTime,
            total: totalTime
          }
        }
      }
    ];
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Processing error:', error);
    
    // Limpiar archivo temporal si existe
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        // Ignorar error de cleanup
      }
    }
    
    // Error response en formato compatible
    res.status(500).json([
      {
        id: Date.now().toString(),
        status: "failed",
        reference: req.body.reference || "",
        models: "tesseract",
        confidence: 0,
        processingTimeInSeconds: 0,
        responseMode: req.body.responseMode || "direct",
        content: [],
        error: error.message
      }
    ]);
  }
});

// ✅ Función de procesamiento post-OCR (MEJORADA)
function processOCRText(rawText) {
  // 1. Limpiar texto básico
  let cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // 2. Extraer líneas no vacías
  const lines = cleanText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // 3. Detectar merchant (líneas ANTES del primer monto)
  let merchant = null;
  const merchantCandidates = [];
  
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    
    // Skip líneas con solo símbolos o números
    if (/^[$\d\s.,@:]+$/.test(line)) continue;
    
    // Skip líneas muy cortas
    if (line.length < 5) continue;
    
    // Skip líneas que parecen status o mensajes genéricos
    if (/^¡?listo!?$/i.test(line)) continue;
    if (/solo|pendiente|aprobado|rechazado|completado/i.test(line) && line.length < 20) continue;
    
    // Si tiene mayúsculas mezcladas con minúsculas, es buen candidato
    if (/[A-Z]/.test(line) && /[a-z]/.test(line) && line.length > 10) {
      merchantCandidates.push(line);
    }
  }
  
  // Tomar el primer candidato válido
  if (merchantCandidates.length > 0) {
    merchant = merchantCandidates[0];
  }
  
  // 4. Detectar montos (formato $XXX.XXX o $XXX,XXX)
  const amounts = [];
  const amountRegex = /\$\s*[\d.,]+/g;
  
  lines.forEach(line => {
    const matches = line.match(amountRegex);
    if (matches) {
      matches.forEach(match => {
        const numeric = parseAmount(match);
        // Filtrar: solo montos entre $1,000 y $100,000,000
        if (numeric >= 1000 && numeric <= 100000000) {
          // Evitar duplicados
          const amountStr = Math.round(numeric).toString();
          if (!amounts.includes(amountStr)) {
            amounts.push(amountStr);
          }
        }
      });
    }
  });
  
  // 5. Detectar fechas (varios formatos)
  const dates = [];
  const dateRegex = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s+\d{1,2}:\d{2})|(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/gi;
  const dateMatches = rawText.match(dateRegex);
  if (dateMatches) {
    dateMatches.forEach(dateStr => {
      const normalized = normalizeDateString(dateStr);
      if (normalized) {
        dates.push(normalized);
      }
    });
  }
  
  // 6. Detectar referencias (patrón específico: "N° de referencia" seguido de número)
  const references = [];
  const refContext = /(?:referencia|reference|ref)[:\s]*(\d{4,8})/gi;
  let match;
  
  while ((match = refContext.exec(rawText)) !== null) {
    const refNum = match[1];
    if (!references.includes(refNum) && !amounts.includes(refNum)) {
      references.push(refNum);
    }
  }
  
  // Fallback: buscar números de 6 dígitos exactos que no sean montos ni años
  if (references.length === 0) {
    const standaloneNumbers = rawText.match(/\b\d{6}\b/g);
    if (standaloneNumbers) {
      standaloneNumbers.forEach(num => {
        if (!amounts.includes(num) && num !== '202601' && !num.startsWith('202')) {
          references.push(num);
        }
      });
    }
  }
  
  // 7. Detectar status
  let status = null;
  const statusMap = {
    'pendiente': 'Pendiente',
    'pending': 'Pendiente',
    'aprobado': 'Aprobado',
    'approved': 'Aprobado',
    'rechazado': 'Rechazado',
    'rejected': 'Rechazado',
    'completado': 'Completado',
    'completed': 'Completado'
  };
  
  for (const [keyword, value] of Object.entries(statusMap)) {
    if (rawText.toLowerCase().includes(keyword)) {
      status = value;
      break;
    }
  }
  
  // 8. Detectar método de pago
  let paymentMethod = null;
  const paymentMap = {
    'tarjeta virtual': 'Tarjeta virtual',
    'virtual card': 'Tarjeta virtual',
    'tarjeta física': 'Tarjeta física',
    'physical card': 'Tarjeta física',
    'transferencia': 'Transferencia',
    'transfer': 'Transferencia',
    'efectivo': 'Efectivo',
    'cash': 'Efectivo'
  };
  
  for (const [keyword, value] of Object.entries(paymentMap)) {
    if (rawText.toLowerCase().includes(keyword)) {
      paymentMethod = value;
      break;
    }
  }
  
  // 9. Construir texto resumido
  const summaryParts = [];
  if (merchant) summaryParts.push(merchant);
  if (amounts.length > 0) summaryParts.push(`$${amounts[0]}`);
  if (status) summaryParts.push(status);
  
  let summaryText = summaryParts.join(' | ');
  
  // Agregar línea de metadata
  const metaParts = [];
  if (dates.length > 0) metaParts.push(dates[0]);
  if (paymentMethod) metaParts.push(paymentMethod);
  if (references.length > 0) metaParts.push(`Ref: ${references[0]}`);
  
  if (metaParts.length > 0) {
    summaryText += '\n' + metaParts.join(' | ');
  }
  
  // 10. Calcular confidence
  const confidence = calculateConfidence(rawText, lines, amounts, dates, merchant);
  
  return {
    confidence,
    extracted: {
      text: summaryText,
      amounts: amounts.slice(0, 3), // Máximo 3 montos
      dates: dates.slice(0, 2),     // Máximo 2 fechas
      references: references.slice(0, 2), // Máximo 2 referencias
      status: status,
      merchant: merchant,
      paymentMethod: paymentMethod
    }
  };
}

// Helper: Convertir string de monto a número
function parseAmount(amountStr) {
  let cleaned = amountStr.replace(/[$\s]/g, '');
  
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.') && !cleaned.includes(',')) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      const parts = cleaned.split('.');
      if (parts[1] && parts[1].length === 3) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned) || 0;
}

// Helper: Normalizar fecha
function normalizeDateString(dateStr) {
  const monthMap = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  // Formato: "12 Jan 2026 11:24" → "2026-01-12 11:24"
  const match = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = monthMap[match[2].toLowerCase()];
    const year = match[3];
    const hour = match[4].padStart(2, '0');
    const min = match[5];
    return `${year}-${month}-${day} ${hour}:${min}`;
  }
  
  return dateStr;
}

// Helper: Calcular confidence score
function calculateConfidence(rawText, lines, amounts, dates, merchant) {
  let score = 70; // Base score
  
  // Bonus por detectar elementos clave
  if (amounts.length > 0) score += 10;
  if (dates.length > 0) score += 10;
  if (merchant) score += 10;
  if (lines.length >= 5) score += 5;
  
  // Penalizar por caracteres raros
  const weirdCharsRegex = /[^\w\s$.,\-:¿¡]/g;
  const weirdChars = (rawText.match(weirdCharsRegex) || []).length;
  score -= Math.min(weirdChars * 0.5, 15);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Image Processing Service running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔧 Endpoint: POST /process (Sharp + Tesseract OCR + Text Extraction)`);
});
