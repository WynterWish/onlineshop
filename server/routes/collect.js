const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

// 接收采集事件（可选携带 Authorization）
router.post('/', (req, res) => {
  const { type, category, duration, price, quantity, orderId, extra } = req.body || {};
  let userId = null;
  try {
    const hdr = req.headers.authorization;
    if (hdr) {
      const token = hdr.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.id) userId = decoded.id;
    }
  } catch (e) {}
  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection && req.connection.remoteAddress;
  db.run(`INSERT INTO analytics (type,userId,ip,category,duration,price,quantity,orderId,extra) VALUES (?,?,?,?,?,?,?,?,?)`,
    [type, userId, ip, category || null, duration || null, price || null, quantity || null, orderId || null, extra ? JSON.stringify(extra) : null], function(err){
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

module.exports = router;
