const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username,password,email) VALUES (?,?,?)',
    [username, hash, email], function (err) {
      if (err) return res.status(400).json({ error: '用户名已存在' });
      res.json({ message: '注册成功' });
    });
});

// 管理员注册（注意：此接口会创建 isAdmin=1 的用户，请谨慎使用）
router.post('/register-admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
    console.log('Admin register request:', { username });
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username,password,isAdmin) VALUES (?,?,1)',
      [username, hash], function (err) {
        if (err) return res.status(400).json({ error: '用户名已存在' });
        res.json({ message: '管理员注册成功' });
      });
  } catch (e) {
    console.error('register-admin error', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: '用户名或密码错误' });
    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.JWT_SECRET);
    res.json({ token, isAdmin: user.isAdmin });
  });
});

// 获取当前用户信息
router.get('/me', auth, (req, res) => {
  const id = req.user && req.user.id;
  if (!id) return res.status(401).json({ error: '无token' });
  db.get('SELECT id,username,email,isAdmin FROM users WHERE id=?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '用户不存在' });
    res.json(row);
  });
});

module.exports = router;