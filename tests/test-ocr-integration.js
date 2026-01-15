#!/usr/bin/env node

/**
 * test-ocr-integration.js - Test complete OCR pipeline with cascade loading
 * 
 * This script demonstrates:
 * 1. How the OCR pipeline works (Sharp → Tesseract → PostProcessor)
 * 2. How cascade loading works (personal > example > basic)
 * 3. How extracted data transforms based on available formatters
 * 4. How _processorInfo shows which formatter was used
 */

const fs = require('fs');
const path = require('path');
const postProcessor = require('../src/ocrPostProcessor');

// Sample OCR outputs for testing (no need for real images)
const TEST_SAMPLES = {
  rapicard: `RAPPI CARD
SALDO DISPONIBLE
$717.393,30
SALDO VIGENTE
$420.000
FECHA DE CORTE
2025-12-30
FECHA DE VENCIMIENTO
2026-01-10
ESTADO: AL DÍA`,

  nubank: `Pagina 1 de 1
NU BANK
Transferência
Beneficiário: Cuenta Ahorros
Banco: Bancolombia
Monto: $20.000
Data: 2026-01-10
Status: Completado`,

  amazon: `AMAZON
Su compra del 2026-01-29
Producto: Prime Video
Monto: $24.900
Transacción: 6199
Referencia: 24900 - 991001
Estado: Pendiente de confirmación`
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CASCADE LOADING TEST
// ═══════════════════════════════════════════════════════════════════════════════

function testCascadeLoading() {
  console.log(`\n${'╔'.padEnd(80, '═')}╗`);
  console.log(`║ SECTION 1: CASCADE LOADING TEST (Formatter Selection) ${''.padEnd(20)}║`);
  console.log(`╚${'═'.repeat(78)}╝\n`);

  const useCasePath = path.join(__dirname, '..', 'src', 'useCase.js');
  const useCaseExamplePath = path.join(__dirname, '..', 'src', 'useCase.example.js');

  const personalExists = fs.existsSync(useCasePath);
  const exampleExists = fs.existsSync(useCaseExamplePath);

  console.log('📋 FORMATTER AVAILABILITY:\n');
  console.log(`   ${personalExists ? '✅' : '❌'} Personal Formatter (src/useCase.js)`);
  console.log(`   ${exampleExists ? '✅' : '❌'} Example Template (src/useCase.example.js)`);
  console.log(`   ✅ Basic Formatter (built-in ocrPostProcessor.js)\n`);

  const expectedPriority = personalExists 
    ? 'personal (src/useCase.js)' 
    : exampleExists 
      ? 'example (src/useCase.example.js)' 
      : 'none (using basic)';

  console.log(`📌 EXPECTED PRIORITY: ${expectedPriority}\n`);

  return { personalExists, exampleExists };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: OUTPUT COMPARISON TEST - REAL OCR TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════════

function testOutputComparison(sampleName) {
  console.log(`\n${'╔'.padEnd(80, '═')}╗`);
  console.log(`║ REAL OCR TRANSFORMATION: ${sampleName.toUpperCase().padEnd(52)}║`);
  console.log(`╚${'═'.repeat(78)}╝\n`);

  const rawText = TEST_SAMPLES[sampleName];
  
  // PASO 1: Mostrar RAW TEXT
  console.log('📋 PASO 1: RAW OCR TEXT (Sin procesar)');
  console.log('─'.repeat(80));
  console.log(rawText);
  console.log('─'.repeat(80));
  
  // PASO 2: Process with postProcessor (includes cascade loading internally)
  const result = postProcessor.processOCRText(rawText);
  
  console.log('\n📊 PASO 2: DATOS EXTRAÍDOS');
  console.log('─'.repeat(80));
  console.log(JSON.stringify(result.extracted, null, 2));
  console.log(`Confianza: ${result.confidence}%`);
  console.log('─'.repeat(80));
  
  // PASO 3: Mostrar texto limpio (basic processing)
  console.log('\n✨ PASO 3: TEXTO LIMPIO (Basic - sin formatter)');
  console.log('─'.repeat(80));
  console.log(result.text || result.cleanText || '(No disponible)');
  console.log('─'.repeat(80));
  
  // PASO 4: Mostrar resultado formateado
  console.log('\n🎨 PASO 4: RESULTADO FORMATEADO');
  console.log(`   Formatter usado: ${result._processorInfo?.formatterUsed || 'unknown'}`);
  console.log(`   Es custom: ${result._processorInfo?.hasCustomFormatter ? 'Sí ✅' : 'No (fallback)'}`);
  console.log('─'.repeat(80));
  
  if (result.formatted) {
    console.log(result.formatted);
  } else if (result.text) {
    console.log(result.text);
  } else {
    console.log('(Sin formato adicional - devuelto texto limpio)');
  }
  console.log('─'.repeat(80));
  
  // PASO 5: Comparación visual
  console.log('\n📊 COMPARACIÓN: ANTES vs DESPUÉS');
  console.log('─'.repeat(80));
  console.log('ANTES (Raw):');
  const rawPreview = rawText.split('\n').slice(0, 3).join('\n');
  console.log(rawPreview);
  console.log('...\n');
  console.log('DESPUÉS (Formateado):');
  const afterText = result.formatted || result.text;
  if (afterText) {
    const formattedPreview = afterText.split('\n').slice(0, 5).join('\n');
    console.log(formattedPreview);
  } else {
    console.log('(Sin formato adicional)');
  }
  console.log('─'.repeat(80));

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: ARCHITECTURE EXPLANATION
// ═══════════════════════════════════════════════════════════════════════════════

function showArchitecture() {
  console.log(`\n${'╔'.padEnd(80, '═')}╗`);
  console.log(`║ SECTION 2: CASCADE LOADING ARCHITECTURE ${''.padEnd(37)}║`);
  console.log(`╚${'═'.repeat(78)}╝\n`);

  console.log(`
CAPA 1: EXTRACCIÓN (ocrPostProcessor.js) - PRIMARY ORCHESTRATOR
──────────────────────────────────────────────────────────────────

• Ubicación: src/ocrPostProcessor.js
• Propósito: ÚNICA ENTRADA para procesamiento OCR
• Estado: ✅ En GitHub (código público reutilizable)

Pseudocódigo:
  function processOCRText(rawText) {
    // Paso 1: Limpieza básica
    cleanText = basicCleaning(rawText)
    
    // Paso 2: CASCADE LOADING (interno)
    try {
      customFormatter = require('./useCase')           // Priority 1
      formatterUsed = 'personal (src/useCase.js)'
    } catch {
      try {
        customFormatter = require('./useCase.example')  // Priority 2
        formatterUsed = 'example (src/useCase.example.js)'
      } catch {
        formatterUsed = 'none (using basic)'           // Priority 3
      }
    }
    
    // Paso 3: Extraer datos (siempre igual)
    extracted = {
      amounts: [...],
      dates: [...],
      merchant: '...',
      status: '...',
      references: [...]
    }
    
    // Paso 4: Usar formatter si disponible
    if (customFormatter) {
      formatted = customFormatter.processOCRText({extracted, cleanText})
    } else {
      formatted = cleanText  // Fallback básico
    }
    
    // Paso 5: Adjuntar metadata (CLAVE para debugging)
    return {
      extracted,
      formatted,
      cleanText,
      confidence: calculateConfidence(extracted),
      _processorInfo: {
        formatterUsed: formatterUsed,
        hasCustomFormatter: customFormatter !== null
      }
    }
  }


CAPA 2: FORMATTERS (useCase.js vs useCase.example.js)
──────────────────────────────────────────────────────────

src/useCase.js (TU CONFIGURACIÓN PERSONAL):
  ├─ Estado: ❌ NO en GitHub (.gitignore)
  ├─ Propósito: Tu lógica específica, privada
  ├─ Contenido: Tus propias funciones:
  │   ├─ extractAmounts()         # Tu lógica de extracción
  │   ├─ extractDates()           # Tu lógica temporal
  │   ├─ extractMerchant()        # Tu lógica de merchant
  │   └─ processOCRText()         # Tu lógica de formato
  └─ Nunca se sube a GitHub

src/useCase.example.js (TEMPLATE PARA OTROS):
  ├─ Estado: ✅ En GitHub
  ├─ Propósito: Ejemplo para otros usuarios
  ├─ Contenido: Funciones de ejemplo:
  │   ├─ extractAmountsExample()  # Ejemplo de extracción
  │   ├─ extractDatesExample()    # Ejemplo de fechas
  │   ├─ formatForConsoleLog()    # Ejemplo formato 1
  │   ├─ formatForJSON()          # Ejemplo formato 2
  │   ├─ formatForCSV()           # Ejemplo formato 3
  │   └─ formatForPlainText()     # Ejemplo formato 4
  └─ Usuarios copian y personalizan


CAPA 3: SERVICIO (ocr-service.js) - SIMPLIFICADO
────────────────────────────────────────────────

// ANTES (con cascade loading): 11 líneas complejas
const processedData = new Promise((resolve, reject) => {
  try {
    const useCase = require('./useCase');
    processedData = useCase.processOCRText(rawText);
  } catch (e1) {
    try {
      const useCaseExample = require('./src/useCase.example');
      processedData = useCaseExample.processOCRText(rawText);
    } catch (e2) {
      processedData = ocrPostProcessor.processOCRText(rawText);
    }
  }
  resolve(processedData);
});

// AHORA (limpio): 1 línea
const processedData = ocrPostProcessor.processOCRText(rawText);

✅ TODA la lógica de cascade está DENTRO de ocrPostProcessor
✅ El servicio es más limpio y fácil de leer
✅ Separación clara de responsabilidades


FLUJO COMPLETO:
───────────────

HTTP Request (POST /process)
       ↓
ocr-service.js (Express endpoint)
       ↓
[1] Sharp Optimizer (imagen → optimizada)
       ↓
[2] OCR Engine (imagen → texto raw)
       ↓
[3] ocrPostProcessor.processOCRText() ← PUNTO CENTRAL
       ├─→ Limpia texto
       ├─→ CASCADE LOAD formatter (personal > example > basic)
       ├─→ Extrae datos (amounts, dates, merchant, etc.)
       ├─→ Aplica formatter si existe
       ├─→ Calcula confianza
       └─→ Adjunta _processorInfo metadata
       ↓
HTTP Response (JSON con extracted + formatted + metadata)


_processorInfo METADATA (IMPORTANTE):
──────────────────────────────────────

Adjuntada a CADA respuesta para debugging:

{
  "_processorInfo": {
    "formatterUsed": "personal (src/useCase.js)",  // Qué formatter se usó
    "hasCustomFormatter": true                     // Si hay formato custom
  }
}

VALORES POSIBLES:
  • "personal (src/useCase.js)" → Tu configuración
  • "example (src/useCase.example.js)" → Template ejemplo
  • "none (using basic)" → Solo limpieza, sin formato
  `);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: HOW TO TEST DIFFERENT SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

function showTestScenarios() {
  console.log(`\n${'╔'.padEnd(80, '═')}╗`);
  console.log(`║ SECTION 3: HOW TO TEST CASCADE LOADING ${''.padEnd(36)}║`);
  console.log(`╚${'═'.repeat(78)}╝\n`);

  console.log(`
🧪 TEST SCENARIO 1: Personal Formatter Active
────────────────────────────────────────────────
Archivo presente: src/useCase.js ✅
Archivo ausente: src/useCase.example.js (puede o no estar)

Pasos:
  1. Asegura que src/useCase.js existe
  2. Ejecuta: node tests/test-ocr-integration.js
  3. Verificar que _processorInfo.formatterUsed = "personal (src/useCase.js)"
  4. Ver que el output usa TU formato personalizado

Comando:
  $ node tests/test-ocr-integration.js


🧪 TEST SCENARIO 2: Example Template Active
─────────────────────────────────────────────
Archivo ausente: src/useCase.js ❌
Archivo presente: src/useCase.example.js ✅

Pasos:
  1. Temporalmente mueve useCase.js:
     $ mv src/useCase.js src/useCase.js.bak
  
  2. Ejecuta: node tests/test-ocr-integration.js
  3. Verificar que _processorInfo.formatterUsed = "example (src/useCase.example.js)"
  4. Ver que el output usa FORMATO DE PLANTILLA
  
  5. Restaura: $ mv src/useCase.js.bak src/useCase.js

Comandos:
  $ mv src/useCase.js src/useCase.js.bak
  $ node tests/test-ocr-integration.js
  $ mv src/useCase.js.bak src/useCase.js


🧪 TEST SCENARIO 3: Basic Formatter Only
──────────────────────────────────────────
Archivo ausente: src/useCase.js ❌
Archivo ausente: src/useCase.example.js ❌

Pasos:
  1. Temporalmente mueve ambos:
     $ mv src/useCase.js src/useCase.js.bak
     $ mv src/useCase.example.js src/useCase.example.js.bak
  
  2. Ejecuta: node tests/test-ocr-integration.js
  3. Verificar que _processorInfo.formatterUsed = "none (using basic)"
  4. Ver que el output es SOLO TEXTO LIMPIO sin formato
  
  5. Restaura ambos:
     $ mv src/useCase.js.bak src/useCase.js
     $ mv src/useCase.example.js.bak src/useCase.example.js

Comandos:
  $ mv src/useCase.js src/useCase.js.bak
  $ mv src/useCase.example.js src/useCase.example.js.bak
  $ node tests/test-ocr-integration.js
  $ mv src/useCase.js.bak src/useCase.js
  $ mv src/useCase.example.js.bak src/useCase.example.js


ENTENDER LOS RESULTADOS:
────────────────────────

SCENARIO 1 → _processorInfo.formatterUsed = "personal (src/useCase.js)"
  ✅ Tu archivo useCase.js se está usando
  ✅ El output tiene TU formato personalizado
  ✅ Verifica que _processorInfo.hasCustomFormatter = true

SCENARIO 2 → _processorInfo.formatterUsed = "example (src/useCase.example.js)"
  ✅ El archivo de plantilla se está usando
  ✅ El output tiene FORMATO DE PLANTILLA
  ✅ Verifica que _processorInfo.hasCustomFormatter = true

SCENARIO 3 → _processorInfo.formatterUsed = "none (using basic)"
  ✅ Solo código base se está usando
  ✅ El output es TEXTO LIMPIO sin formato adicional
  ✅ Verifica que _processorInfo.hasCustomFormatter = false
  `);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                   OCR SERVICE - INTEGRATION TEST                          ║
║           Testing Cascade Loading with Different Formatters               ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);

  // SECTION 1: Check cascade loading
  testCascadeLoading();

  // SECTION 2: Test each sample and show outputs
  console.log(`\n${'╔'.padEnd(80, '═')}╗`);
  console.log(`║ SECTION 2: REAL OCR TRANSFORMATION EXAMPLES ${''.padEnd(32)}║`);
  console.log(`╚${'═'.repeat(78)}╝`);

  const samples = ['rapicard', 'nubank', 'amazon'];
  const results = {};
  
  for (const sample of samples) {
    results[sample] = testOutputComparison(sample);
  }
  
  // SECTION 2B: Comparación visual de transformaciones
  console.log(`\n${'╔'.padEnd(80, '═')}╗`);
  console.log(`║ SECTION 2B: COMPARACIÓN VISUAL - CÓMO CAMBIA SEGÚN FORMATTER ${''.padEnd(10)}║`);
  console.log(`╚${'═'.repeat(78)}╝\n`);
  
  for (const [sampleName, result] of Object.entries(results)) {
    console.log(`\n📌 Muestra: ${sampleName.toUpperCase()}`);
    console.log('═'.repeat(80));
    
    console.log('\n1️⃣ RAW TEXT (Original del OCR):');
    console.log('┌' + '─'.repeat(78) + '┐');
    const rawLines = TEST_SAMPLES[sampleName].split('\n').slice(0, 4);
    rawLines.forEach(line => {
      console.log('│ ' + line.padEnd(76) + ' │');
    });
    console.log('└' + '─'.repeat(78) + '┘');
    
    console.log('\n2️⃣ CLEAN TEXT (Después de limpiar):');
    console.log('┌' + '─'.repeat(78) + '┐');
    const cleanText = result.text || result.cleanText || '(No disponible)';
    const cleanLines = cleanText.split('\n').slice(0, 4);
    cleanLines.forEach(line => {
      console.log('│ ' + (line.substring(0, 76)).padEnd(76) + ' │');
    });
    console.log('└' + '─'.repeat(78) + '┘');
    
    console.log('\n3️⃣ FORMATTED OUTPUT (Con ' + result._processorInfo?.formatterUsed + '):');
    console.log('┌' + '─'.repeat(78) + '┐');
    const outputText = result.formatted || result.text;
    if (outputText) {
      const formattedLines = outputText.split('\n').slice(0, 4);
      formattedLines.forEach(line => {
        console.log('│ ' + (line.substring(0, 76)).padEnd(76) + ' │');
      });
    } else {
      console.log('│ ' + '(Sin formato adicional)'.padEnd(76) + ' │');
    }
    console.log('└' + '─'.repeat(78) + '┘');
    
    console.log('\n📊 Metadata:');
    console.log(`   • Formatter: ${result._processorInfo?.formatterUsed}`);
    console.log(`   • Has Custom: ${result._processorInfo?.hasCustomFormatter}`);
    console.log(`   • Extracted: ${Object.keys(result.extracted).length} campos`);
    console.log(`   • Confidence: ${result.confidence}%`);
  }

  // SECTION 3: Show architecture
  showArchitecture();

  // SECTION 4: Show how to test scenarios
  showTestScenarios();

  // Final instructions
  console.log(`\n${'╔'.padEnd(80, '═')}╗`);
  console.log(`║ SECTION 4: RESUMEN Y PRÓXIMOS PASOS ${''.padEnd(40)}║`);
  console.log(`╚${'═'.repeat(78)}╝\n`);

  console.log(`
✅ ARQUITECTURA IMPLEMENTADA:

  • ocrPostProcessor.js = ÚNICO PUNTO DE ENTRADA
  • Cascade loading = INTERNO (personal > example > basic)
  • _processorInfo = METADATA que muestra qué formatter se usó
  • ocr-service.js = SIMPLIFICADO (1 línea: ocrPostProcessor.processOCRText())
  • .gitignore = PROTEGE tu useCase.js (nunca se sube a GitHub)


📚 ARCHIVOS IMPORTANTES:

  Público (En GitHub):
    ✅ src/ocrPostProcessor.js      - Procesador principal
    ✅ src/useCase.example.js       - Plantilla para usuarios
    ✅ ocr-service.js               - Servicio Express
  
  Privado (NO en GitHub):
    ❌ src/useCase.js               - Tu configuración personal
    ❌ useCase.js                   - Alternativa de ubicación


🚀 PARA COMENZAR:

  1. Crear tu configuración personal:
     $ cp src/useCase.example.js src/useCase.js
     $ nano src/useCase.js  # Editar a tu gusto

  2. Probar el pipeline:
     $ node tests/test-ocr-integration.js

  3. Ejecutar tests de diferentes escenarios:
     $ node tests/test-ocr-integration.js  # Escenario 1: Personal
     # Luego mover archivos y repetir para otros escenarios

  4. Iniciar el servicio:
     $ npm start
     $ curl -F "image=@receipt.jpg" http://localhost:3002/process


💡 CLAVE: SIEMPRE verifica _processorInfo en la respuesta para saber
   qué formatter se está usando. Eso te ayudará a entender comportamientos
   inesperados.
  `);
}

main().catch(console.error);
