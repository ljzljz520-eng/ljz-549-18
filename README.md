# Ajax & Servlet 异步通信演示系统

## 🛠 技术栈
- **Frontend**: React (Vite) + TailwindCSS + Fetch API
- **Backend**: Java Servlet (Jakarta EE 10) + Jetty (Dev) / Tomcat (Prod) + Gson
- **Infrastructure**: Docker Compose, Multi-stage Builds, Aliyun Mirror

## 🚀 启动指南 (How to Run)
1. 确保 Docker Desktop 已启动。
2. 在根目录执行：
   ```bash
   docker compose up --build
   ```
3. 等待容器启动完成（Backend 需要下载 Maven 依赖，首次启动可能需 2-5 分钟）。

## 🔗 服务地址 (Services)
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8080/api/hello

## 🧪 功能验证
1. **GET 请求**: 点击页面上的 "TEST GET" 按钮，应显示 `Hello from Servlet!` 且 Toast 提示成功。
2. **POST 请求**:
   - 输入任意文本，点击 "TEST POST"，应返回带有时间戳的 JSON，且中文不乱码。
   - 输入 `error`，应触发 400 错误并显示红色 Toast。
   - 输入 `server_error`，应触发 500 错误。
3. **加载状态**: 请求期间，结果区域应显示 loading spinner。

## 📁 目录结构
```
backend/       # Java Servlet Backend
frontend/      # React Frontend
_ai-rules/     # 工程规范文件
docker-compose.yml
```

## ⚙️ 镜像与加速配置
- **Maven**: 已配置阿里云镜像源 (`backend/settings.xml`)。
- **NPM**: Dockerfile 中已配置淘宝镜像源。
- **Hot Reload**:
  - 前端：Vite HMR (Save file -> Browser auto updates).
  - 后端：Jetty Scan (Save file -> Jetty auto reloads in ~2s).
