const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const router = express.Router();

router.use(requireAdmin);

let deepseek;
try{ deepseek = require('../lib/deepseek'); }catch(e){ deepseek = null; }

// 销售排行（按商品销量）
router.get('/top-products', (req, res) => {
  const limit = parseInt(req.query.limit || '10');
  const sql = `SELECT p.id,p.name, p.category, SUM(oi.quantity) AS sold
               FROM order_items oi JOIN products p ON oi.productId = p.id
               GROUP BY p.id ORDER BY sold DESC LIMIT ?`;
  db.all(sql, [limit], (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

// 销售趋势（day/week/month）
router.get('/sales-trend', (req, res) => {
  const range = req.query.range || 'month';
  const fmt = range === 'day' ? '%Y-%m-%d' : (range === 'week' ? '%Y-%W' : '%Y-%m');
  const sql = `SELECT strftime('${fmt}', o.created_at) AS period, SUM(oi.price*oi.quantity) AS revenue, SUM(oi.quantity) AS sold
               FROM orders o JOIN order_items oi ON o.id = oi.orderId
               GROUP BY period ORDER BY period DESC LIMIT 100`;
  db.all(sql, [], (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

// 简单异常检测：日收入 > mean + 3*std
router.get('/anomalies', (req, res) => {
  db.all(`SELECT strftime('%Y-%m-%d', o.created_at) AS day, SUM(oi.price*oi.quantity) AS revenue
          FROM orders o JOIN order_items oi ON o.id = oi.orderId
          GROUP BY day ORDER BY day DESC LIMIT 365`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const vals = rows.map(r => r.revenue || 0);
    const mean = vals.reduce((a,b)=>a+b,0)/vals.length || 0;
    const variance = vals.reduce((a,b)=>a+Math.pow(b-mean,2),0)/vals.length || 0;
    const std = Math.sqrt(variance);
    const threshold = mean + 3*std;
    const anomalies = rows.filter(r => (r.revenue||0) > threshold);
    res.json({ mean, std, threshold, anomalies });
  });
});

// 用户画像（基于 order_items & products）
router.get('/user-profile/:id', (req, res) => {
  const uid = req.params.id;
  db.get('SELECT username, email, region FROM users WHERE id = ?', [uid], (e, user) => {
    if (e) return res.status(500).json({ error: e.message });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    db.get('SELECT COUNT(*) AS orders, SUM(total) AS total_spent FROM orders WHERE userId = ?', [uid], (e2, s) => {
      if (e2) return res.status(500).json({ error: e2.message });
      db.all(`SELECT p.category, SUM(oi.quantity) AS qty, SUM(oi.price*oi.quantity) AS spend
              FROM order_items oi JOIN products p ON oi.productId = p.id
              JOIN orders o ON oi.orderId = o.id
              WHERE o.userId = ? GROUP BY p.category ORDER BY qty DESC`, [uid], (err, cats) => {
        if (err) return res.status(500).json({ error: err.message });
        const topCategories = cats.map(c => ({ category: c.category, qty: c.qty, spend: c.spend }));
        const purchaseCount = s.orders || 0;
        const totalSpent = s.total_spent || 0;
        const avgSpend = purchaseCount ? totalSpent / purchaseCount : 0;
        let buyingPower = '普通';
        if (avgSpend >= 5000) buyingPower = '高购力';
        else if (avgSpend >= 2000) buyingPower = '中等购力';
        res.json({
          userId: uid,
          username: user.username,
          email: user.email,
          region: user.region || '未知',
          purchaseCount,
          totalSpent,
          avgSpend,
          buyingPower,
          topCategories
        });
      });
    });
  });
});

// 综合报表：按类别、按状态、按库存分组统计
router.get('/reports', (req, res) => {
  const reports = {};
  db.serialize(() => {
    db.all(`SELECT p.category, COUNT(DISTINCT o.id) AS orders, SUM(oi.quantity) AS quantity, SUM(oi.price*oi.quantity) AS revenue
            FROM order_items oi
            JOIN products p ON oi.productId = p.id
            JOIN orders o ON oi.orderId = o.id
            GROUP BY p.category`, [], (err, categoryRows) => {
      if (err) return res.status(500).json({ error: err.message });
      reports.byCategory = categoryRows;
      db.all(`SELECT status, COUNT(*) AS orders, SUM(total) AS revenue
              FROM orders GROUP BY status`, [], (err2, statusRows) => {
        if (err2) return res.status(500).json({ error: err2.message });
        reports.byStatus = statusRows;
        db.all(`SELECT category, stock, COUNT(*) AS sku_count
                FROM products GROUP BY category, stock ORDER BY category`, [], (err3, stockRows) => {
          if (err3) return res.status(500).json({ error: err3.message });
          reports.byStock = stockRows;
          res.json(reports);
        });
      });
    });
  });
});

// 将销售数据发送到 DeepSeek 进行更深层分析（如果已配置）
router.post('/deep-analysis', async (req, res) => {
  if (!deepseek) return res.status(400).json({ error: 'DeepSeek 未配置' });
  try{
    // 构建简单聚合：按 category 销售量和收入
    db.all(`SELECT p.category, SUM(oi.quantity) AS qty, SUM(oi.price*oi.quantity) AS revenue
            FROM order_items oi JOIN products p ON oi.productId = p.id
            JOIN orders o ON oi.orderId = o.id
            GROUP BY p.category`, [], async (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const payload = { byCategory: rows, meta: { requestedBy: req.user && req.user.id ? req.user.id : null } };
      const out = await deepseek.analyzeSales(payload);
      res.json(out);
    });
  }catch(e){ res.status(500).json({ error: e.message }); }
});

module.exports = router;

