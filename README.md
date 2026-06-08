# 求职跟踪管理系统 (Interview CRM)

这是一个为求职者量身打造的专属“个人求职 CRM”系统。它采用前后端分离架构，前端基于 React + Vite 驱动，后端基于 Node.js (Express) + SQLite 构建。

## 环境要求
- Node.js (建议 v18+)
- npm 或 yarn

## 安装依赖

在项目根目录安装前端依赖：
```bash
npm install
```

进入 `server` 目录安装后端依赖：
```bash
cd server
npm install
```

## 启动项目

你需要**同时启动**两个终端窗口来分别运行前端和后端服务：

### 1. 启动后端服务
打开终端并执行：
```bash
cd server
node index.js
```
*启动成功后，默认会在 `http://localhost:3001` 监听 API 请求，同时会在 `server/data/crm.db` 自动生成 SQLite 数据库文件。*

### 2. 启动前端页面
打开**另一个终端窗口**并在项目根目录执行：
```bash
npm run dev
```
*启动成功后，访问终端中提示的本地地址（通常是 `http://localhost:5173`）即可使用系统。*

## 关闭项目

在分别运行前端和后端的两个终端窗口中，按下快捷键组合 `Ctrl + C`（苹果电脑为 `Control + C`），即可终止对应的进程，关闭项目。

## 默认账号
- 用户名：`admin`
- 密码：`admin123`
