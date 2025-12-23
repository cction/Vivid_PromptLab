# PromptLab Client Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 配置 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

# Install dependencies（使用 npm install 重新生成 lock 文件）
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]