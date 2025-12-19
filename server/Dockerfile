# PromptLab Server Dockerfile
FROM node:20-alpine

WORKDIR /app

# Skip puppeteer browser download (not needed for server)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create uploads directory if not exists
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/presets || exit 1

# Start server
CMD ["node", "server.js"]


