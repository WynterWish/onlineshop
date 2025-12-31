# 在线商店（onlineshop）

## 项目简介

这是一个基于 Node.js + Express 的简单在线商店示例项目，前端为静态 HTML/JS 页面，后端提供 REST API 并使用 SQLite 作为持久化存储。该项目适合作为学习用户认证、购物车、下单和简单管理员管理功能的练习样例。

## 技术栈

- 后端：Node.js、Express
- 数据库：SQLite（sqlite3）
- 身份认证：bcrypt（密码哈希）、jsonwebtoken（JWT）
- 配置：dotenv
- 其他中间件：cors、express-validator、nodemailer（用于邮件）

（依赖可见于 package.json）

## 目录结构（概要）

- client/        前端静态页面（index.html、login.html 等）
- server/        后端代码
	- server.js     服务器入口，挂载路由与静态资源
	- db.js         SQLite 数据库初始化与访问
	- routes/       各功能路由（auth, products, cart, orders, admin-* 等）
	- middleware/   中间件（认证、权限等）

## 快速开始（开发环境）

先确保本机安装了 Node.js 与 npm。然后在项目根目录执行：

```bash
npm install
```

创建一个 .env 文件（项目根目录）并至少设置：

```
JWT_SECRET=your_strong_secret_here
PORT=5000
```

启动服务：

```bash
node server/server.js
```

默认会在 http://localhost:5000 提供服务（可通过 PORT 环境变量修改）。

注：首次启动时会在当前工作目录创建 onlineshop.db，并初始化表与示例商品数据；如果不存在管理员账号，会自动创建一个 admin（默认密码示例为 123456，请生产环境修改）。

## API 概览（常用端点）

- POST /api/auth/register — 用户注册（请求体：username, password, email）
- POST /api/auth/login — 用户登录（返回 JWT）
- GET /api/auth/me — 获取当前用户信息（需 Authorization: Bearer <token>）
- GET /api/products — 列出所有商品（支持 ?q= 模糊搜索）
- GET/POST/PATCH/DELETE /api/cart — 购物车增删改查（需登录）
- POST /api/orders — 创建订单（需登录）
- 管理接口：/api/admin/products, /api/admin/orders（需管理员权限）

具体实现请参阅 server/routes/ 下对应路由文件。

## 数据库

项目使用 SQLite（单文件数据库 onlineshop.db）。数据库由 server/db.js 负责初始化：创建表（users, products, cart, orders, messages）并插入部分示例商品。

## 开发与调试要点

- 请在开发时设置合理的 JWT_SECRET，不要使用演示秘钥。  
- 如果要重建数据库，停止服务并删除 onlineshop.db，下次启动会重新初始化（注意：会丢失现有数据）。
- 推荐使用 Postman / curl 或浏览器控制台测试 API 与前端交互。

## 生产化建议

- 将静态文件放到 CDN 或 Nginx 静态托管，后端部署在受管进程（PM2 / systemd）后端并启用 HTTPS。  
- 将 SQLite 换为 PostgreSQL/MySQL 等服务型数据库以支持并发与高可用。  
- 添加日志、异常监控（如 Sentry）、API 速率限制、安全头配置与输入校验。  

## 贡献

欢迎改进功能或补充测试。提交 PR 前请描述变更、测试步骤与影响范围。

## 许可证

项目未附带特殊许可证，按必要时补充 LICENSE 文件。

202330451841
吴易玮