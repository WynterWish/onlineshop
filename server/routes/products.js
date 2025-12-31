const express = require('express');
const db = require('../db');
const router = express.Router();

// 支持可选的查询参数 q，用于按商品名模糊搜索
router.get('/', (req, res) => {
  const q = req.query.q;
  if (q) {
    const like = `%${q}%`;
    db.all('SELECT * FROM products WHERE name LIKE ?', [like], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
});

module.exports = router;