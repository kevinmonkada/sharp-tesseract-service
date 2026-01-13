# 📚 **README.md - Sharp OCR Service**

# 🖼️ Sharp OCR Service

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Microservicio Docker para optimización de imágenes + OCR (Tesseract) para workflow de n8n.

**Versión:** 2.1.0  
**Stack:** Node.js 20 + Sharp + Tesseract + Express  
**Use case:** Procesar capturas Telegram de transacciones bancarias (Nequi, Nu, Daviplata, etc.)

---

## ✨ **Features**

- **Optimización Inteligente:** Reduce tamaño de imágenes sin perder calidad para OCR.
- **OCR Avanzado:** Usa Tesseract con idiomas español e inglés.
- **Procesamiento de Texto:** Extrae montos, fechas, referencias, estados y merchants automáticamente.
- **API RESTful:** Endpoint simple para integración con n8n u otros workflows.
- **Docker Ready:** Fácil despliegue en contenedores.
- **Health Checks:** Monitoreo integrado.

---

## 📋 **Arquitectura**

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   n8n       │────▶│  sharp-service   │────▶│   Expense   │
│  Telegram   │     │  (Docker 3002)   │     │   Assistant │
│   Webhook   │     │  Sharp + Tesseract│     │     LLM     │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           ▼
                    [Binary Image]
                           │
                           ▼
                    1. Sharp Optimization
                    2. Tesseract OCR
                    3. Text Processing
                           │
                           ▼
                    [Structured JSON]
```

---

## 🚀 **Quick Start**

### **1. Instalación inicial**

```bash
# Crear directorio
mkdir -p ~/sharp-service
cd ~/sharp-service

# Crear archivos
nano sharp-service.js    # Pegar código del servicio
nano Dockerfile          # Pegar Dockerfile
nano package.json        # Pegar dependencias

# Instalar dependencias locales
npm install

# Build imagen Docker
docker build -t sharp-service .

# Run container
docker run -d \
  --name sharp-service \
  --network n8n-network \
  -p 3002:3001 \
  -v ~/sharp-service:/app \
  --restart unless-stopped \
  sharp-service

# Verificar logs
docker logs -f sharp-service
```

---

## 📦 **Estructura del Proyecto**

```
~/sharp-service/
├── sharp-service.js      # Código principal
├── Dockerfile            # Configuración Docker
├── package.json          # Dependencias npm
├── node_modules/         # (generado por npm install)
└── .dockerignore         # (opcional)
```

---

## 🔧 **Comandos Esenciales**

### **Desarrollo**

```bash
cd ~/sharp-service

# Ver logs en tiempo real
docker logs -f sharp-service

# Verificar estado
docker ps | grep sharp-service

# Health check
curl http://localhost:3002/health

# Test endpoint (desde n8n usar sharp-service:3001)
curl -X POST http://localhost:3002/process \
  -F "image=@test.jpg" \
  -F "reference=123456"
```

### **Modificar código**

```bash
# 1. Editar archivo
nano ~/sharp-service/sharp-service.js

# 2. Rebuild imagen
cd ~/sharp-service
docker build -t sharp-service .

# 3. Restart container
docker stop sharp-service && docker rm sharp-service

docker run -d \
  --name sharp-service \
  --network n8n-network \
  -p 3002:3001 \
  -v ~/sharp-service:/app \
  --restart unless-stopped \
  sharp-service

# 4. Verificar
docker logs -f sharp-service
```

### **Troubleshooting**

```bash
# Ver logs completos
docker logs sharp-service

# Ver últimas 50 líneas
docker logs --tail 50 sharp-service

# Restart rápido
docker restart sharp-service

# Entrar al container (debug)
docker exec -it sharp-service /bin/bash

# Ver uso de recursos
docker stats sharp-service

# Limpiar containers viejos
docker system prune -f
```

---

## 🌐 **Endpoint API**

### **POST /process**

**URL (desde n8n):** `http://sharp-service:3001/process`  
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
    "id": "1768336106626",
    "status": "completed",
    "reference": "378913",
    "models": "tesseract",
    "confidence": 95,
    "processingTimeInSeconds": 1.2,
    "responseMode": "direct",
    "content": [
      {
        "models": "tesseract-v5-sharp-optimized",
        "confidence": 95,
        "text": "Dido Pradera Dosquebra | $167300 | Pendiente\n2026-01-12 11:24 | Tarjeta virtual | Ref: 378913",
        "raw": "8:03 @\n\nDido Pradera Dosquebra...",
        "extracted": {
          "amounts": ["167300"],
          "dates": ["2026-01-12 11:24"],
          "references": ["378913"],
          "status": "Pendiente",
          "merchant": "Dido Pradera Dosquebra",
          "paymentMethod": "Tarjeta virtual"
        }
      }
    ],
    "_metadata": {
      "originalSize": 186113,
      "optimizedSize": 83979,
      "reduction": "54.9%",
      "operations": "resize,grayscale,normalize,sharpen-low",
      "timings": {
        "optimization": 450,
        "ocr": 1200,
        "processing": 50,
        "total": 1700
      }
    }
  }
]
```

**Response (500 Error):**

```json
[
  {
    "id": "1768336106626",
    "status": "failed",
    "reference": "",
    "models": "tesseract",
    "confidence": 0,
    "processingTimeInSeconds": 0,
    "responseMode": "direct",
    "content": [],
    "error": "File too large or invalid format"
  }
]
```

---

## 🔄 **Integración con n8n**

### **HTTP Request Node Config**

```
Method: POST
URL: http://sharp-service:3001/process
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
// Text resumido (para pasar al LLM)
{{ $json.body.content.text }}

// Merchant
{{ $json.body.content.extracted.merchant }}

// Monto principal
{{ $json.body.content.extracted.amounts }}

// Fecha
{{ $json.body.content.extracted.dates }}

// Referencia
{{ $json.body.content.extracted.references }}

// Confidence
{{ $json.body.confidence }}
```

---

## 📁 **Archivos del Proyecto**

### **1. package.json**

```json
{
  "name": "sharp-service",
  "version": "2.1.0",
  "description": "Image optimization + OCR service for n8n",
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
RUN npm install --production --verbose

COPY sharp-service.js ./

EXPOSE 3001

CMD ["node", "sharp-service.js"]
```

### **3. .dockerignore** (opcional)

```
node_modules
npm-debug.log
*.backup
.git
.env
```

---

## 🐛 **Troubleshooting**

### **Error: Cannot find module 'sharp'**

```bash
# Reinstalar dentro del container
docker exec -it sharp-service npm install
docker restart sharp-service
```

### **Error: Tesseract not found**

```bash
# Verificar instalación
docker exec -it sharp-service tesseract --version

# Rebuild imagen
docker build -t sharp-service .
```

### **Error: Port 3002 already in use**

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3002

# Cambiar puerto en docker run
docker run -d \
  --name sharp-service \
  --network n8n-network \
  -p 3003:3001 \  # <-- cambiar aquí
  ...
```

### **n8n no conecta con sharp-service:3001**

```bash
# Verificar que estén en la misma red
docker network inspect n8n-network | grep sharp-service

# Si no aparece, reconectar
docker network connect n8n-network sharp-service
docker restart sharp-service
```

### **OCR devuelve confianza muy baja (<70%)**

Posibles causas:
- Imagen muy borrosa (revisar quality de captura)
- Texto muy pequeño (aumentar resolución)
- Idioma no detectado (verificar tesseract-ocr-spa instalado)

```bash
# Verificar idiomas disponibles
docker exec -it sharp-service tesseract --list-langs
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
| **Latencia total** | 1-3s |
| **Optimización** | 300-800ms |
| **OCR** | 600-1500ms |
| **Processing** | 50-100ms |
| **Memory** | ~200MB |
| **CPU** | ~15% (idle), 80% (processing) |

---

## 🔄 **Actualizaciones**

### **Changelog**

**v2.1.0** (2026-01-13)
- ✅ Eliminados endpoints `/optimize` y `/optimize-generic`
- ✅ Solo endpoint `/process` (all-in-one)
- ✅ Detección inteligente de imágenes ya optimizadas
- ✅ Mejora en detección de merchant/referencias
- ✅ Filtrado de montos por rango válido

**v2.0.0** (2026-01-13)
- ✅ Migración de tesseract.js a node-tesseract-ocr
- ✅ Sharp optimization pipeline mejorado
- ✅ Schema JSON compatible con Convert MCP

---

## 📞 **Soporte**

**Logs importantes:**
```bash
docker logs sharp-service 2>&1 | grep -E "ERROR|WARN|❌"
```

**Backup antes de cambios:**
```bash
cp ~/sharp-service/sharp-service.js ~/sharp-service/sharp-service.js.backup-$(date +%Y%m%d)
```

---

## 📌 **Notas**

1. **Docker persistencia:** Cada `docker build` crea una nueva imagen. Los cambios en `sharp-service.js` requieren rebuild.
2. **Volume mount:** El `-v ~/sharp-service:/app` es solo para desarrollo. En producción, usar COPY en Dockerfile.
3. **Network:** `sharp-service:3001` solo funciona dentro de Docker. Desde host usar `localhost:3002`.
4. **Restart policy:** `--restart unless-stopped` reinicia automáticamente excepto cuando se para manualmente.

---

**Última actualización:** 2026-01-13  
**Autor:** Expense Assistant Team  

---

## 🤝 **Contributing**

¡Contribuciones son bienvenidas! Para contribuir:

1. Fork el repositorio.
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcion`).
3. Commit tus cambios (`git commit -m 'Agrega nueva funcion'`).
4. Push a la rama (`git push origin feature/nueva-funcion`).
5. Abre un Pull Request.

**Guías:**
- Sigue el estilo de código existente.
- Agrega tests si es posible.
- Actualiza el README si cambias la API.

---

## 📄 **License**

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.