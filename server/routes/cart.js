const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth'); // 顾客校验
const router = express.Router();
router.use(auth);

router.get('/', (req, res) => {
  const sql = `SELECT c.*, p.name, p.price 
               FROM cart c JOIN products p ON c.productId = p.id 
               WHERE c.userId = ?`;
  db.all(sql, [req.user.id], (err, rows) => res.json(rows));
});

router.post('/', (req, res) => {
  const { productId, quantity } = req.body;
  db.run('INSERT INTO cart(userId,productId,quantity) VALUES (?,?,?)',
    [req.user.id, productId, quantity], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// 更新购物车项数量
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  db.run('UPDATE cart SET quantity = ? WHERE id = ? AND userId = ?',
    [quantity, id, req.user.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ id });
    });
});

// 删除购物车项
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM cart WHERE id = ? AND userId = ?', [id, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ id });
  });
});

module.exports = router;