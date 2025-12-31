const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const router = express.Router();
router.use(auth);

const transporter = nodemailer.createTransport({
  service: 'qq',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

router.post('/', (req, res) => {
  const { total } = req.body;
  db.run('INSERT INTO orders(userId,total) VALUES (?,?)',
    [req.user.id, total], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const id = this.lastID;
      // 发邮件
      db.get('SELECT email FROM users WHERE id = ?', [req.user.id], (e, u) => {
        if (u) transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: u.email,
          subject: '订单确认',
          text: `您的订单 #${id} 已确认，我们将尽快发货。`
        });
      });
      res.json({ id });
    });
});

// 支付订单：标记为已支付（仅限订单所属用户）
router.post('/:id/pay', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.userId !== req.user.id) return res.status(403).json({ error: '无权限' });
    db.run('UPDATE orders SET status = ? WHERE id = ?', ['已支付', id], function(e){
      if (e) return res.status(500).json({ error: e.message });
      res.json({ success: true, id: Number(id) });
    });
  });
});

router.get('/', (req, res) => {
  db.all('SELECT * FROM orders WHERE userId = ? ORDER BY id DESC', [req.user.id],
    (err, rows) => res.json(rows));
});

module.exports = router;