# 📚 **README.md - Sharp OCR Service**

# 🖼️ Sharp OCR Service

Microservicio Docker para optimización de imágenes + OCR (Tesseract) para workflow de n8n.

**Versión:** 2.1.0  
**Stack:** Node.js 20 + Sharp + Tesseract + Express  
**Use case:** Procesar capturas Telegram de transacciones bancarias (Nequi, Nu, Daviplata, etc.)

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
**License:** MIT


***

## ✅ **Respuesta a tu pregunta**

> **"Ya estaría con su propio docker cada que le hago el build cierto?"**

✅ **SÍ, exacto.** Cada vez que haces `docker build -t sharp-service .`:
1. Crea una **imagen nueva** con los cambios
2. Luego haces `docker stop` + `docker rm` + `docker run` para usar esa nueva imagen
3. El servicio queda **aislado** en su propio container

> **"Los archivos que me queda para modificar son solo referencias?"**

**Los 3 archivos clave son:**

1. **`sharp-service.js`** ← Acá está toda la lógica (Sharp, OCR, procesamiento)
2. **`package.json`** ← Solo si necesitás agregar/quitar dependencias npm
3. **`Dockerfile`** ← Solo si necesitás cambiar versión Node o instalar paquetes Linux

**Para modificar lógica:** Solo editá `sharp-service.js` → rebuild → restart

***

**Guardá este README en:** `~/sharp-service/README.md` 🎯

[1](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a1b925ec-e9d9-42fb-b9cf-46dc7a010038/4a88029f-c535-471a-96cc-eb7acd2d1abd/seniour-full-stack-dev-Bap0gIRWQiq62Iq.na4awQ.md)
[2](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a1b925ec-e9d9-42fb-b9cf-46dc7a010038/176b5249-aa13-41f0-9e8d-895ac3e54de6/notion-architect-N_CCZamfS7a5lxgUZbWjHw.md)
[3](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a1b925ec-e9d9-42fb-b9cf-46dc7a010038/eaf46cbe-a225-4b5f-8c41-acc52186de82/migracion-a-oracle-e-informaci-EOInEAv1SYaKwIaIa70bZQ.md)
[4](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a1b925ec-e9d9-42fb-b9cf-46dc7a010038/ac02f8f3-3786-4f57-b5dc-cdb569a1beea/project-manager-full-stack-sen-hJIRJncvTB2gJdcPtEJssg.md)
[5](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a1b925ec-e9d9-42fb-b9cf-46dc7a010038/bcf035a7-e675-41bf-922b-4f9ee4576eb9/planteamiento-problema-y-propuestas-de-solucion.md)
[6](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a1b925ec-e9d9-42fb-b9cf-46dc7a010038/aec8e1bd-3d9e-498a-ad33-6f64467ac2cc/TutormeAIWorkflows.md)
[7](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a1b925ec-e9d9-42fb-b9cf-46dc7a010038/1aeb8dcb-80a0-43a8-861d-a6babfca1a1c/contextodelespacio.md)
[8](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/6f14fe45-252e-405c-b106-338c2c6be037/image.jpg)
[9](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/d4da9a79-fa66-49b4-87e0-aad5ffc8a354/image.jpg)
[10](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/dc06f730-bc64-454d-a373-ff6c8eb4a740/image.jpg)
[11](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/fb407b4a-c17d-4194-b0d2-d360db3a5a46/image.jpg)
[12](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/b1008183-1fdf-46d6-a891-4e558418b44b/paste-4.txt)
[13](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/eae294b2-9e42-4b85-82a4-5ad32944deb1/image.jpg)
[14](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/e144591d-e999-4620-9ab9-f347f3f5262e/paste-2.txt)
[15](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/a3813fba-b5ed-4666-ba31-8fc479c3def0/image.jpg)
[16](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/c27ec2fc-212b-4bb3-9e6d-d5cef4ff380b/paste-2.txt)
[17](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/d063f978-7740-4de1-a1ed-35882e850bd7/image.jpg)
[18](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/269c3759-ba4d-4836-9e44-a6770e2d36b7/paste-2.txt)
[19](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/84c0b2d8-bce8-4638-97d0-b3741b854941/image.jpg)
[20](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/6edcb479-cec1-4bab-9047-8c8f563ce3ee/image.jpg)
[21](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/7027f9e5-2d51-4d36-b637-aca6c7e7938f/image.jpg)
[22](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/68652b96-186a-488e-b91c-26297e76b150/Expense-AI-Agent-2.json)
[23](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/89c2423c-03ee-4148-b9ca-bc90251f464f/image.jpg)
[24](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/b381c704-38f2-4608-8623-eab73ff1a088/image.jpg)
[25](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/84e54e9c-41c9-4e8a-8889-79546381925d/image.jpg)
[26](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/8735415a-5fe4-432e-b94b-7e0467a43492/image.jpg)
[27](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/66434e0a-ec4d-44bc-b64a-cbb85a5baa87/image.jpg)
[28](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/f7e1af26-bc02-4548-8bcb-4cc909f26d62/image.jpg)
[29](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/8c4c545e-ca65-4595-b4ab-d2996ed68790/paste.txt)
[30](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/696a6c74-16fa-4669-bb43-509081f324eb/paste.txt)
[31](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/bc5ac998-4434-4888-8415-073860e7fac4/paste.txt)
[32](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/f349494f-2cac-4fc9-a531-68a50b0bdb11/paste.txt)
[33](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/6d277c61-aa6b-4f28-8196-3357d3c57933/paste.txt)
[34](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/d91e54d8-6302-4a25-a475-20d44c98e630/paste.txt)
[35](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/d80eba83-30d2-488c-9179-4f8ccf27375f/paste.txt)
[36](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/16d8cd88-2b96-4b88-9249-f81c7c6644b9/paste.txt)
[37](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/75c68857-eaa4-4a56-972e-94a2dca1a69f/paste.txt)
[38](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/9b418bc1-c17c-4645-9e47-327114051481/paste.txt)
[39](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/5a0749ec-bdfb-4717-81ec-31a635de2355/paste.txt)
[40](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/aa74477d-1e44-42f1-9c03-ac7552308aae/paste.txt)
[41](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/975695b6-fea1-402d-b655-675660ef40d3/paste.txt)
[42](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/fe4f971b-d865-49d0-86c1-728297ff7827/Expense-AI-Agent-4.json)
[43](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/996adf58-ad03-4973-a11c-a756adb743ac/image.jpg)
[44](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/363e772d-c778-4632-a90b-99fdc5e8fd90/image.jpg)
[45](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/270824cb-29fd-47ff-bc49-570e2e052ce7/paste.txt)
[46](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/84e22b7a-f5ad-40ef-8094-b11d115aa366/image.jpg)
[47](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/05bbc0a9-9876-490b-ab08-33865a570f97/image.jpg)
[48](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/f1ec00fb-0e80-40bf-be4d-9118b2b56773/file_248.jpg)
[49](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/20b171f0-329d-4ad8-9941-46f95ac514f7/file_248.jpg)
[50](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/93ed86fa-6889-4b2a-9d60-1e5f30c69f32/ocr_1768328295518.jpg)
[51](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/fb0a6866-dc16-4a01-b971-ed3ecd9fbca9/ocr_1768328603575.jpg)
[52](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/1bcdc1ea-6dda-4ffe-afdc-b3459ab9e8ce/image.jpg)
[53](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/1fe11466-5808-4572-a7cd-3dc86dd14e77/paste.txt)
[54](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/25936138/2acd333b-71d2-4f49-9774-85ce8155a8de/paste.txt)
[55](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/d6415bc7-0286-4e94-bb87-3f548cb37dd6/optimize.jpg)
[56](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/46b38995-2cd7-4027-bb7e-faf676b4b378/image.jpg)
[57](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/25936138/d5928609-8adc-485d-8fa0-de038f8e9eae/file_248.jpg)