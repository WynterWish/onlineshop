const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const router = express.Router();
router.use(requireAdmin);

router.get('/', (req, res) => {
  const { kw = '', page = 1, size = 10 } = req.query;
  const sql = `SELECT * FROM products
               WHERE name LIKE '%'||?||'%'
               ORDER BY id DESC LIMIT ? OFFSET ?`;
  db.all(sql, [kw, +size, (page - 1) * size], (err, rows) => res.json(rows));
});

router.post('/', (req, res) => {
  const { name, price, stock } = req.body;
  db.run('INSERT INTO products(name,price,stock) VALUES (?,?,?)',
    [name, price, stock], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

router.put('/:id', (req, res) => {
  const { name, price, stock } = req.body;
  db.run('UPDATE products SET name=?,price=?,stock=? WHERE id=?',
    [name, price, stock, req.params.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    });
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id=?', req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

module.exports = router;