# �️ OCR Service v2.3.0

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Modular-brightgreen)](src/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

🚀 Microservicio Docker de alto rendimiento para optimización de imágenes + OCR (Tesseract 5.x) para documentos financieros colombianos. Integrable con n8n, workflows automáticos y sistemas de extracción de datos.

**Versión:** 2.3.0 ✨ **(Refactorizado con arquitectura modular - Sharp + OCR + Post-processing)**  
**Stack:** Node.js 20 + Sharp 0.33.5 + Tesseract 5.x + Express 4.18  
**Use case:** Procesar estados de cuenta, facturas, transacciones bancarias (Nequi, Nu, Daviplata, RappiCard, Bancolombia, etc.), o cualquier use case de OCR personalizado.

---

## ✨ **Features**

- **🎨 Optimización Inteligente (Sharp):** Pipeline de 5 pasos con redimensionamiento, normalización, desenfoque selectivo y aumento de contraste (80% compression).
- **🔤 OCR Avanzado (Tesseract):** Multi-PSM strategy (PSM 4→6→3→11) con sistema de scoring para detectar mejor PSM. OEM 1 (LSTM-only).
- **📊 Extracción Estructurada:** Montos ($), fechas, referencias, estados, comerciantes automáticamente.
- **✍️ Síntesis de Texto:** Genera texto legible y estructurado con emojis y formato, optimizado para LLMs.
- **🎯 Clasificación Semántica:** Detección inteligente de campos (disponible, utilizado, avances, pagos, mora).
- **🇨🇴 Formato Colombiano:** Soporte nativo para $1.382.606,70 con decimales preservados (1000s + decimals).
- **🚀 API RESTful:** Endpoint `/process` simple para integración con n8n u otros workflows.
- **🏗️ Arquitectura Modular:** Código separado en 5 módulos reutilizables (Sharp, OCR, Post-processing, Utilities, Config).
- **🐳 Docker Ready:** Fácil despliegue en contenedores con health checks automáticos.
- **⚡ Performance:** ~2-3s total, ~300ms optimización, ~1.5s OCR, ~100ms post-processing.

---

## 📋 **Estructura del Proyecto**

```
ocr-tesseract-service/
│
├── ocr-service.js                # 🎯 Main entry point (Express server - Orchestrator)
├── package.json                  # Dependencies + scripts
├── Dockerfile                    # Docker build config
├── .dockerignore                 # Docker ignore rules
├── .gitignore                    # Git ignore patterns
├── README.md                     # Documentation (este archivo)
│
├── src/                          # 📁 Módulos reutilizables
│   ├── sharpOptimizer.js         # 🎨 Sharp preprocessing pipeline (NEW - v2.3.0)
│   │   ├─ optimizeForOCR()       # Main pipeline: resize→grayscale→normalize→blur→sharpen
│   │   ├─ getSupportedFormats()  # Returns: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'tiff']
│   │   └─ getImageMetadata()     # Extract image properties
│   │
│   ├── ocrEngine.js              # 🔤 OCR execution engine (NEW - v2.3.0)
│   │   ├─ performOCRWithFallback()  # Multi-PSM strategy: PSM 4→6→3→11
│   │   └─ getOCRConfig()         # Returns current OCR settings
│   │
│   ├── ocrPostProcessor.js       # 📊 Post-processing + text synthesis
│   │   ├─ extractAmounts()       # $1.382.606,70 + decimals
│   │   ├─ extractDates()         # Multiple date formats
│   │   ├─ extractReferences()    # Card numbers, references
│   │   └─ buildSynthesizedText() # Emoji-formatted output
│   │
│   └── utils.js                  # 🛠️ Shared utilities
│       ├─ formatAmount()         # Currency formatting
│       ├─ normalizeText()        # Text cleaning
│       └─ logWithTimestamp()     # Logging helper
│
├── config/                       # 📁 Configuration
│   └── tesseract.config.js       # Centralized OCR + Sharp settings
│       ├─ ocr.lang              # spa+eng
│       ├─ ocr.oem               # 1 (LSTM-only)
│       ├─ ocr.psm               # 4 (primary) + fallback chain
│       └─ sharp.pipeline        # resize 3000px, grayscale, normalize, blur, sharpen
│
├── img/                          # 📁 Test images
│   └── Tests/
│       ├── test-0.jpeg           # 
│       ├── test-1.jpg → test-11.jpg # Various financial documents (12 tests)
│
└── tests/                        # 📁 Unit tests (future)
    └── (pending)
```

---

## 🚀 **Quick Start**

### **1. Instalación inicial**

```bash
# Acceder al repositorio
cd ~/sharp-tesseract-service

# Instalar dependencias locales
npm install

# Build imagen Docker (con nombre correcto)
docker build -t ocr-service .

# Run container
docker run -d \
  --name ocr-service \
  --network n8n-network \
  -p 3002:3001 \
  --restart unless-stopped \
  ocr-service

# Verificar logs (debe mostrar módulos: Sharp, OCR, Process complete)
docker logs -f ocr-service

# Health check
curl http://localhost:3002/health
```

---

## 🎨 **Personalización: useCase Pattern**

### **¿Qué es useCase?**

El servicio proporciona **dos niveles de procesamiento**:

1. **`src/ocrPostProcessor.js`** (Público) - Extracción pura de datos
   - Extrae: montos, fechas, referencias, status, merchant
   - **Reutilizable** para cualquier aplicación

2. **`useCase.js`** (Privado - Tu personalización)
   - (está en .gitignore)
   - Contiene tu lógica de **formato y síntesis de texto**
   - Ejemplo: agregar emojis, completar datos, validaciones custom

### **Cómo personalizarlo**

```bash
# 1. Copiar template
cp useCase.example.js useCase.js

# 2. Editar para tu aplicación
nano useCase.js
# - Agregar tu lógica de formato
# - Definir tus funciones de síntesis
# - Usar datos extraídos del ocrPostProcessor

# 3. Tu código se protege automáticamente
# - useCase.js nunca se subirá a GitHub (ver .gitignore)
# - Cambios personales quedan locales
# - Código reutilizable sigue en GitHub

# 4. Cuando haces cambios, solo rebuild
docker build -t ocr-service .
docker stop ocr-service && docker rm ocr-service
docker run -d --name ocr-service --network n8n-network -p 3002:3001 --restart unless-stopped ocr-service
```

### **⚠️ Importante: Cómo afecta useCase.js a la salida JSON**

**SOLO modifica la variable `text`** en el objeto JSON de respuesta:

```json
{
  "content": [
    {
      "text": "← AQUÍ es donde useCase.js aplica formato personalizado",
      "raw": "← SIEMPRE es el texto directo del modelo OCR (sin personalización)",
      "extracted": {
        "amounts": [...],
        "dates": [...],
        "merchant": "..."
      }
    }
  ]
}
```

**¿Qué pasa en cada caso?**

| Caso | Resultado en `text` | Resultado en `raw` |
|------|---------------------|-------------------|
| **useCase.js existe** | Formato personalizado (con emojis, etc.) | Texto OCR directo |
| **Solo useCase.example.js** | Formateado con el ejemplo template | Texto OCR directo |
| **Ambos removidos** | Formato básico (sin personalización) Solo con limpieza quirúrgica | Texto OCR directo con algunos ajustes |

**Si no quieres personalizar:**

```bash
# Opción 1: Remover useCase.js (usa el ejemplo si existe)
rm src/useCase.js

# Opción 2: Remover ambos (usa formato básico)
rm src/useCase.js src/useCase.example.js

# Opción 3: Usa siempre "raw" en n8n (texto OCR puro)
# En n8n: {{ $json.body.content[0].raw }}
# Así obtienes el OCR sin ningún formato personalizado
```

**Las variables `extracted` siempre están presentes** (montos, fechas, referencias, merchant, status) independientemente de si usas useCase o no.

### **Ejemplo: Formato personalizado**

```javascript
// useCase.js - Tu código personalizado
const postProcessor = require('./src/ocrPostProcessor');

function formatForMyApp(ocrResult) {
  const { extracted } = ocrResult;
  
  // Tu síntesis personalizada con emojis, datos, etc.
  return {
    ...ocrResult,
    text: `💳 ${extracted.merchant}\n💰 $${extracted.amounts[0]}\n📅 ${extracted.dates[0]}`
  };
}

module.exports = { formatForMyApp };
```

### **Ejemplos disponibles en useCase.example.js**

El archivo de ejemplo incluye 4 formatos pre-construidos:

1. **formatForExpenseAssistant()** - Emoji + resumen legible
2. **formatForAccounting()** - Formato contable detallado
3. **formatForCSV()** - Tab-separated para spreadsheets
4. **formatForAPI()** - JSON nested para APIs

---

## 🔧 **Comandos Esenciales**

### **Desarrollo**

```bash
cd ~/sharp-tesseract-service

# Ver logs en tiempo real (con módulos Sharp, OCR, Process complete)
docker logs -f ocr-service

# Verificar estado
docker ps | grep ocr-service

# Health check
curl http://localhost:3002/health | jq

# Test endpoint con imagen real
curl -X POST http://localhost:3002/process \
  -F "image=@img/Tests/test-0.jpeg" \
  -F "reference=test001" | jq '.[] | .content[0] | {merchant: .extracted.merchant, amounts: .extracted.amounts}'

# Ver últimas líneas de logs
docker logs --tail 50 ocr-service
```

### **Modificar código**

```bash
# 1. Editar archivo modular (ej: src/sharpOptimizer.js o src/ocrEngine.js)
nano ~/sharp-tesseract-service/src/sharpOptimizer.js

# 2. Verificar sintaxis de todos los módulos
node -c ocr-service.js && \
node -c src/sharpOptimizer.js && \
node -c src/ocrEngine.js && \
node -c src/ocrPostProcessor.js && \
echo "✅ Todas las sintaxis correctas"

# 3. Rebuild imagen
cd ~/sharp-tesseract-service
docker build -t ocr-service .

# 4. Restart container (limpio, sin volume mount)
docker stop ocr-service && docker rm ocr-service
docker run -d \
  --name ocr-service \
  --network n8n-network \
  -p 3002:3001 \
  --restart unless-stopped \
  ocr-service

# 5. Verificar logs con módulos
docker logs -f ocr-service | grep -E "Sharp:|OCR:|Process complete"

# 6. Test todos los 12 tests
for i in {0..11}; do
  EXT=$([ $i -eq 0 ] && echo "jpeg" || echo "jpg")
  echo "Test $i: $(curl -s -X POST http://localhost:3002/process -F image=@img/Tests/test-${i}.${EXT} | jq '.[] | .content[0] | .extracted.merchant + \" \" + (.extracted.amounts | join(\", \"))' 2>/dev/null)"
done
```

### **Troubleshooting**

```bash
# Ver logs completos
docker logs ocr-service

# Ver últimas 50 líneas
docker logs --tail 50 ocr-service

# Filtrar solo errores
docker logs ocr-service 2>&1 | grep -E "ERROR|error|❌"

# Restart rápido
docker restart ocr-service

# Entrar al container para debug
docker exec -it ocr-service /bin/bash

# Ver uso de recursos
docker stats ocr-service

# Ver procesos activos
docker exec ocr-service ps aux | grep node

# Verificar módulos importados correctamente
docker exec ocr-service node -e "console.log(require('./ocr-service.js'))"

# Limpiar containers/imágenes viejas
docker system prune -f
```

---

## 🌐 **Endpoint API**

### **POST /process**

**URL (desde n8n):** `http://ocr-service:3001/process`  
**URL (localhost):** `http://localhost:3002/process`

**Método:** `POST`  
**Content-Type:** `multipart/form-data`

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `image` | File | ✅ | Imagen binary (JPEG/PNG) |
| `reference` | String | ❌ | Nº de referencia custom (default: timestamp) |
| `responseMode` | String | ❌ | Modo de respuesta (default: "direct") |

**Response (200 OK):**

```json
[
  {
    "role": "user",
    "content": [
      {
        "type": "document",
        "source": { "type": "text" },
        "title": "binary-data.jpeg",
        "text": "💳 RappiCard\n\n💰 Disponible: $1.382.606,70\n📊 Utilizado: $717.393,30\n💵 Avances disponibles: $420.000\n\n💸 Pagos:\n  • Mínimo: $0\n  • Total: $717.393,30\n\n📅 Fechas importantes:\n  • Corte: 2025-12-30\n  • Pago límite: 2026-01-10\n\n✅ Estado: Al día\n🔢 Tarjeta: ****1234",
        "raw": "[raw OCR output]",
        "extracted": {
          "amounts": ["1382606.70", "717393.30", "420000"],
          "dates": ["2025-12-30", "2026-01-10"],
          "references": ["1234"],
          "status": "Al día",
          "merchant": "RappiCard"
        },
        "captureType": {
          "type": "account_summary",
          "confidence": 92
        },
        "confidence": 88,
        "metadata": {
          "processingTime": 2345,
          "ocrEngine": "tesseract",
          "version": "2.3.0"
        }
      }
    ]
  }
]
```

**Response (500 Error):**

```json
[
  {
    "role": "user",
    "content": [
      {
        "type": "document",
        "source": { "type": "text" },
        "error": "File too large or invalid format"
      }
    ]
  }
]
```

---

## 🔄 **Integración con n8n**

### **HTTP Request Node Config**

```
Method: POST
URL: http://ocr-service:3001/process
Authentication: None
Response Format: JSON

Body Content Type: Multipart Form Data

Body Parameters:
┌──────────────┬─────────────────────┬────────────────────────┐
│ Parameter    │ Type                │ Value                  │
├──────────────┼─────────────────────┼────────────────────────┤
│ image        │ n8n Binary File     │ data                   │
│ reference    │ Expression          │ {{ $json.reference }}  │
└──────────────┴─────────────────────┴────────────────────────┘

Options:
- Response: Full Response
- Timeout: 30000 (30s)
```

### **Acceder al output en n8n**

```javascript
// Texto sintetizado (para pasar al LLM)
{{ $json.body.content[0].text }}

// Comerciante/Merchant
{{ $json.body.content[0].extracted.merchant }}

// Montos principales
{{ $json.body.content[0].extracted.amounts }}

// Fechas extraídas
{{ $json.body.content[0].extracted.dates }}

// Referencia/Tarjeta
{{ $json.body.content[0].extracted.references }}

// Confianza
{{ $json.body.content[0].confidence }}
```

---

## 📁 **Archivos Clave**

### **1. package.json**

```json
{
  "name": "sharp-tesseract-service",
  "version": "2.3.0",
  "description": "Image optimization + OCR service with semantic text synthesis",
  "main": "sharp-service.js",
  "scripts": {
    "start": "node sharp-service.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sharp": "^0.33.0",
    "multer": "^1.4.5-lts.1",
    "node-tesseract-ocr": "^2.2.1"
  }
}
```

### **2. Dockerfile**

```dockerfile
FROM node:20-bookworm-slim

# Install Tesseract + dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libvips-dev \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY sharp-service.js ./
COPY src/ ./src/
COPY config/ ./config/

EXPOSE 3001

CMD ["node", "sharp-service.js"]
```

### **3. config/tesseract.config.js**

Configuración centralizada para OCR y optimización de imágenes:

```javascript
{
  ocr: {
    lang: 'spa+eng',      // Español + Inglés
    oem: 3,               // LSTM + Legacy
    psm: 3                // Fully automatic
  },
  imageOptimization: {
    resize: { width: 1500 },
    pipeline: { grayscale: true, sharpen: { sigma: 0.8 } },
    jpeg: { quality: 95 }
  }
}
```

### **4. src/ocrPostProcessor.js**

Módulo de post-procesamiento OCR con:
- `extractAmounts()` - Montos (soporta formato colombiano)
- `extractDates()` - Fechas múltiples formatos
- `extractReferences()` - Referencias/últimos dígitos tarjeta
- `buildSynthesizedText()` - Texto legible estructurado
- `extractPaymentDetailsFromRaw()` - Mora, pagos

---

## 🐛 **Troubleshooting**

### **Error: Cannot find module 'sharp'**

```bash
# Reinstalar dentro del container
docker exec -it ocr-service npm install
docker restart ocr-service
```

### **Error: Tesseract not found**

```bash
# Verificar instalación
docker exec -it ocr-service tesseract --version

# Rebuild imagen
docker build --no-cache -t ocr-service .
```

### **Error: Port 3002 already in use**

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3002

# Cambiar puerto en docker run
docker run -d \
  --name ocr-service \
  --network n8n-network \
  -p 3003:3001 \  # <-- cambiar aquí
  ...
```

### **n8n no conecta con ocr-service:3001**

```bash
# Verificar que estén en la misma red
docker network inspect n8n-network | grep ocr-service

# Si no aparece, reconectar
docker network connect n8n-network ocr-service
docker restart ocr-service
```

### **OCR devuelve confianza muy baja (<70%)**

Posibles causas:
- Imagen muy borrosa (revisar quality de captura)
- Texto muy pequeño (aumentar resolución)
- Idioma no detectado (verificar tesseract-ocr-spa instalado)

```bash
# Verificar idiomas disponibles
docker exec -it ocr-service tesseract --list-langs

# Habilitar debug logs
DEBUG_OCR=true npm start
# o
docker run -e DEBUG_OCR=true -d sharp-service
```

---

## 🔐 **Seguridad**

- ✅ Sin credenciales hardcodeadas
- ✅ Límite de 20MB por imagen (protección DoS)
- ✅ Timeout de 30s en procesamiento
- ✅ Red Docker privada (n8n-network)
- ⚠️ No exponer puerto 3002 públicamente (solo localhost/VPN)

---

## 📊 **Performance**

| Métrica | Valor típico |
|---|---|
| **Latencia total** | 2-3s |
| **Optimización** | 300-500ms |
| **OCR** | 1200-1800ms |
| **Post-processing** | 100-200ms |
| **Memory** | ~250MB |
| **CPU** | ~15% (idle), 80% (processing) |

**Benchmarks (RappiCard test):**
```
Original: 432.5 KB
Optimized: 85.3 KB (80% reduction)
Total time: 2,345 ms
Confidence: 88%
```

---

## 🔄 **Actualizaciones**

### **Changelog**

**v2.3.0** (2026-01-15) ✨
- ✅ **Refactorización modular**: OCR post-processing movido a `src/ocrPostProcessor.js`
- ✅ **Configuración centralizada**: `config/tesseract.config.js`
- ✅ **Utilidades compartidas**: `src/utils.js` con funciones reutilizables
- ✅ **Mejor estructura**: Carpetas src/, config/, tests/ siguiendo best practices
- ✅ **Documentación mejorada**: README actualizado con nueva arquitectura

**v2.2.0** (2026-01-13)
- ✅ Decimal preservation en montos
- ✅ Semantic classification de campos
- ✅ Payment details extraction (Mora, Pago Mínimo, Pago Total)
- ✅ Synthesized text con emojis y estructura

**v2.1.0** (2026-01-13)
- ✅ Eliminados endpoints `/optimize` y `/optimize-generic`
- ✅ Solo endpoint `/process` (all-in-one)

---

## 📞 **Soporte**

**Logs importantes:**
```bash
docker logs ocr-service 2>&1 | grep -E "ERROR|WARN|❌"
```

**Backup antes de cambios:**
```bash
cp ~/sharp-tesseract-service/src/ocrPostProcessor.js \
   ~/sharp-tesseract-service/src/ocrPostProcessor.js.backup-$(date +%Y%m%d)
```

**Verificar sintaxis después de cambios:**
```bash
node -c ocr-service.js && echo "✅ Syntax OK"
```

---

## 📌 **Notas**

1. **Docker persistencia:** Cada `docker build` crea una nueva imagen. Cambios en código requieren rebuild.
2. **Modularidad:** Código separado en `src/` y `config/` para mantenimiento fácil.
3. **Network:** `ocr-service:3001` solo funciona dentro de Docker. Desde host usar `localhost:3002`.
4. **Restart policy:** `--restart unless-stopped` reinicia automáticamente excepto cuando se para manualmente.
5. **Debug:** Usar `DEBUG_OCR=true` para logs detallados de OCR.

---

**Última actualización:** 2026-01-15 (v2.3.0)  
**Mantenedor:** Sharp Tesseract Service Team

---

## 🤝 **Contributing**

¡Contribuciones son bienvenidas! Para contribuir:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcion`)
3. Commit tus cambios (`git commit -m 'Agrega nueva función'`)
4. Push a la rama (`git push origin feature/nueva-funcion`)
5. Abre un Pull Request

**Guías:**
- Sigue el estilo de código existente
- Agrega tests si es posible
- Actualiza el README si cambias la API
- Verifica sintaxis: `node -c archivo.js`

---

## 📄 **License**

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.
