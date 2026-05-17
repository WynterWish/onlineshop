const express = require('express');
const db = require('../db');
const requireSales = require('../middleware/requireSales');
const { logOperation } = require('../middleware/opLogger');
const router = express.Router();
router.use(requireSales);

router.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '类别名称必填' });
  db.run('INSERT INTO categories (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    try { logOperation(req, 'create_category', { id: this.lastID, name }); } catch (e) {}
    res.json({ id: this.lastID });
  });
});

router.delete('/categories/:id', (req, res) => {
  db.run('DELETE FROM categories WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    try { logOperation(req, 'delete_category', { id: req.params.id }); } catch (e) {}
    res.json({ changes: this.changes });
  });
});

router.patch('/products/:id', (req, res) => {
  const { name, price, stock, category } = req.body;
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name=?'); params.push(name); }
  if (price !== undefined) { updates.push('price=?'); params.push(price); }
  if (stock !== undefined) { updates.push('stock=?'); params.push(stock); }
  if (category !== undefined) { updates.push('category=?'); params.push(category); }
  if (!updates.length) return res.status(400).json({ error: '至少提供一个更新字段' });
  params.push(req.params.id);
  db.run(`UPDATE products SET ${updates.join(',')} WHERE id=?`, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    try { logOperation(req, 'update_product_info', { id: req.params.id, name, price, stock, category }); } catch (e) {}
    res.json({ changes: this.changes });
  });
});

router.get('/status', (req, res) => {
  const sqls = {
    today: `SELECT COUNT(*) AS orders, SUM(total) AS revenue FROM orders WHERE date(created_at)=date('now')`,
    week: `SELECT COUNT(*) AS orders, SUM(total) AS revenue FROM orders WHERE strftime('%Y-%W', created_at)=strftime('%Y-%W', 'now')`,
    month: `SELECT COUNT(*) AS orders, SUM(total) AS revenue FROM orders WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now')`,
    lowStock: `SELECT COUNT(*) AS lowStock FROM products WHERE stock<=5`
  };
  db.serialize(() => {
    db.get(sqls.today, [], (err, today) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get(sqls.week, [], (err2, week) => {
        if (err2) return res.status(500).json({ error: err2.message });
        db.get(sqls.month, [], (err3, month) => {
          if (err3) return res.status(500).json({ error: err3.message });
          db.get(sqls.lowStock, [], (err4, lowStock) => {
            if (err4) return res.status(500).json({ error: err4.message });
            db.all(`SELECT p.id,p.name,SUM(oi.quantity) AS sold FROM order_items oi JOIN products p ON oi.productId=p.id GROUP BY p.id ORDER BY sold DESC LIMIT 5`, [], (err5, top) => {
              if (err5) return res.status(500).json({ error: err5.message });
              res.json({ today, week, month, lowStock: lowStock.lowStock, topProducts: top });
            });
          });
        });
      });
    });
  });
});

router.get('/logs', (req, res) => {
  const { type = '', limit = 50 } = req.query;
  let sql = `SELECT a.*, u.username, u.email FROM analytics a LEFT JOIN users u ON a.userId=u.id`;
  const params = [];
  if (type === 'browse' || type === 'purchase' || type === 'login') {
    sql += ' WHERE a.type=?';
    params.push(type);
  }
  sql += ' ORDER BY a.id DESC LIMIT ?';
  params.push(Number(limit));
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
