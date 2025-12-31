require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

// 根路径显示登录页
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'client', 'login.html'));
});

// 将客户端静态文件目录暴露为静态资源（禁用静态中间件的 index 文件，确保根路由可自定义）
app.use(express.static(path.join(__dirname, '..', 'client'), { index: false }));

/* ① 顾客接口 */
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/products',require('./routes/products'));
app.use('/api/cart',    require('./routes/cart'));
app.use('/api/orders',  require('./routes/orders'));

/* ② 管理接口 */
app.use('/api/admin/products', require('./routes/admin-product'));
app.use('/api/admin/orders',   require('./routes/admin-order'));
app.use('/api/messages', require('./routes/messages'));

// 回退：对非 API 的 GET 请求返回前端入口页（用于 SPA 路由）
// 回退：对非 API 的 GET 请求返回前端入口页（用于 SPA 路由）
app.use((req, res, next) => {
	if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
	res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

const db = require('./db');
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));