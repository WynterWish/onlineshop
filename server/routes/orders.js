const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const router = express.Router();
router.use(auth);

const transporter = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
  ? nodemailer.createTransport({
      service: 'qq',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
  : null;

router.post('/', (req, res) => {
  const { total } = req.body;
  db.run('INSERT INTO orders(userId,total) VALUES (?,?)', [req.user.id, total], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const id = this.lastID;
    // 将购物车项写入 order_items、写 analytics、更新库存并清空购物车
    db.all('SELECT c.id AS cartId, c.productId, c.quantity, p.name, p.category, p.price FROM cart c JOIN products p ON c.productId = p.id WHERE c.userId = ?', [req.user.id], (e2, items) => {
      if (!e2 && items && items.length) {
        const ip = req.headers['x-forwarded-for'] || req.ip || req.connection && req.connection.remoteAddress;
        const oiStmt = db.prepare('INSERT INTO order_items (orderId,productId,price,quantity) VALUES (?,?,?,?)');
        const anStmt = db.prepare('INSERT INTO analytics (type,userId,ip,category,price,quantity,orderId) VALUES (?,?,?,?,?,?,?)');
        const delStmt = db.prepare('DELETE FROM cart WHERE id = ?');
        const updStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        items.forEach(it => {
          oiStmt.run(id, it.productId, it.price, it.quantity);
          anStmt.run('purchase', req.user.id, ip, it.category || null, it.price || null, it.quantity || null, id);
          delStmt.run(it.cartId);
          updStock.run(it.quantity, it.productId);
        });
        oiStmt.finalize(); anStmt.finalize(); delStmt.finalize(); updStock.finalize();
      }
      // 发邮件（仅在已配置 SMTP 时尝试）
      db.get('SELECT email FROM users WHERE id = ?', [req.user.id], (e, u) => {
        if (transporter && u && u.email) {
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: u.email,
            subject: '订单确认',
            text: `您的订单 #${id} 已确认，我们将尽快发货。`
          }).catch(err => console.error('sendMail err', err));
        }
      });
      res.json({ id });
    });
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