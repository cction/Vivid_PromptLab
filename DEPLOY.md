# PromptLab 部署指南

## 项目结构

```
Vivid_PromptLab/
├── client/          # 前端 (Vite + React)
├── server/          # 后端 (Node.js + Express)
├── docker-compose.yml
└── DEPLOY.md
```

---

## 一、本地开发运行

### 1. 启动后端服务

```bash
cd server
npm install
npm run dev    # 开发模式，支持热重载
# 或
npm start      # 生产模式
```

后端运行地址：**http://localhost:3001**

### 2. 启动前端服务

```bash
cd client
npm install
npm run dev
```

前端运行地址：**http://localhost:5173**


---

## 二、服务器部署（Docker）



### 1. 获取项目代码

#### 方式一：Git 克隆（使用镜像）

```bash
git clone https://mirror.ghproxy.com/https://github.com/cction/Vivid_PromptLab.git
# 或
git clone https://github.moeyy.xyz/https://github.com/cction/Vivid_PromptLab.git
```

#### 方式二：下载 ZIP

```bash
wget https://github.moeyy.xyz/https://github.com/cction/Vivid_PromptLab/archive/refs/heads/main.zip
unzip main.zip
mv Vivid_PromptLab-main Vivid_PromptLab
```



### 2. 启动服务

```bash
cd Vivid_PromptLab

# 构建并启动
docker compose up -d --build

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 3. 访问地址

- **前端**：http://服务器IP:8189
- **后端 API**：http://服务器IP:3001

---

## 三、常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重新构建
docker compose up -d --build

# 查看日志
docker compose logs -f
docker compose logs -f client
docker compose logs -f server

# 查看状态
docker compose ps

# 进入容器
docker compose exec server sh
docker compose exec client sh

# 清理构建缓存
docker builder prune -f
```

---

## 四、数据持久化

以下数据会自动持久化到本地目录：

| 数据 | 容器路径 | 本地路径 |
|------|----------|----------|
| 上传图片 | `/app/uploads` | `./server/uploads` |
| 预设数据 | `/app/presets.json` | `./server/presets.json` |
| 设置 | `/app/settings.json` | `./server/settings.json` |

---

## 五、跨域与 iframe 嵌入

项目已配置允许：

- ✅ 任意网站嵌入 iframe
- ✅ 跨域 API 访问

相关配置：
- 后端：`server.js` 中的 `app.use(cors())`
- 前端：`nginx.conf` 中的 CORS 和 `frame-ancestors` 配置

---


