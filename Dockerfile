FROM node:20-bookworm-slim

# Instalar dependencias del sistema para ARM64 + Tesseract
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libvips-dev \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependencias con verbose para debugging
RUN npm install --production --verbose

# Copiar código
COPY sharp-service.js ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "sharp-service.js"]
