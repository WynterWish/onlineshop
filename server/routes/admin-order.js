const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const nodemailer = require('nodemailer');
const router = express.Router();
router.use(requireAdmin);

const transporter = nodemailer.createTransport({
  service: 'qq',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

/* 订单列表 */
router.get('/', (req, res) => {
  const { status = '', start = '', end = '' } = req.query;
  let sql = `SELECT o.*, u.username
             FROM orders o JOIN users u ON o.userId = u.id
             WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND o.status=?'; params.push(status); }
  if (start)  { sql += ' AND date(o.created_at)>=?'; params.push(start); }
  if (end)    { sql += ' AND date(o.created_at)<=?'; params.push(end); }
  sql += ' ORDER BY o.id DESC';
  db.all(sql, params, (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

/* 改状态 + 邮件 */
router.put('/:id', (req, res) => {
  const { status } = req.body;
  db.run('UPDATE orders SET status=? WHERE id=?', [status, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: '订单不存在' });
    // 通知邮件
    db.get('SELECT o.userId AS userId, u.email AS email FROM orders o JOIN users u ON o.userId = u.id WHERE o.id=?',
      req.params.id, (e, row) => {
        if (!e && row) {
          // 保留原有邮件尝试（若配置了 SMTP）
          try { transporter.sendMail({ from: process.env.EMAIL_USER, to: row.email, subject: '订单状态更新', text: `您的订单 #${req.params.id} 状态已更新为：${status}` }); } catch(err) { console.error('sendMail err', err); }
          // 同时在站内消息表中插入一条消息（用于应用内邮箱展示）
          const subj = (status === '已发货') ? '发货成功' : '订单状态更新';
          const body = (status === '已发货') ? `您的订单 #${req.params.id} 已成功发货，感谢购买！` : `您的订单 #${req.params.id} 状态已更新为：${status}`;
          db.run('INSERT INTO messages (userId,subject,body) VALUES (?,?,?)', [row.userId, subj, body], (ie) => { if (ie) console.error('insert message err', ie); });
        }
      });
    res.json({ message: '状态已更新' });
  });
});

/* 统计 */
router.get('/stats', (req, res) => {
  const { range = 'month' } = req.query;
  const fmt = range === 'day' ? '%Y-%m-%d' : '%Y-%m';
  const sql = `
    SELECT strftime('${fmt}', created_at) as period,
           count(*) as sales,
           sum(total) as revenue
    FROM orders
    GROUP BY period
    ORDER BY period DESC
    LIMIT 30`;
  db.all(sql, (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

module.exports = router;