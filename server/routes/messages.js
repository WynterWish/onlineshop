const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// 获取当前用户的站内消息
router.get('/', auth, (req, res) => {
  const uid = req.user.id;
  db.all('SELECT id,subject,body,read,created_at FROM messages WHERE userId=? ORDER BY id DESC', [uid], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

module.exports = router;
