const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const auth = require('../middleware/auth');

async function getRegionByIp(ip) {
  if (!ip) return null;
  const cleanIp = ip.split(',')[0].trim();
  try {
    const resp = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.status === 'success') {
      return [data.country, data.regionName, data.city].filter(Boolean).join(' / ');
    }
  } catch (e) {
    console.error('GeoIP lookup failed', e.message || e);
  }
  return null;
}

router.post('/register', async (req, res) => {
  const { username, password, email, region } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection && req.connection.remoteAddress;
  const resolvedRegion = region || await getRegionByIp(ip) || '未知';
  db.run('INSERT INTO users (username,password,email,region) VALUES (?,?,?,?)',
    [username, hash, email, resolvedRegion], function (err) {
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
    db.run('INSERT INTO users (username,password,isAdmin,role) VALUES (?,?,?,?)',
      [username, hash, 1, 'admin'], function (err) {
        if (err) return res.status(400).json({ error: '用户名已存在' });
        res.json({ message: '管理员注册成功' });
      });
  } catch (e) {
    console.error('register-admin error', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/register-sales', auth, async (req, res) => {
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: '非管理员' });
  try {
    const { username, password, email, region } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username,password,email,role,region) VALUES (?,?,?,?,?)',
      [username, hash, email, 'sales', region || '未知'], function (err) {
        if (err) return res.status(400).json({ error: '用户名已存在' });
        res.json({ message: '销售用户创建成功' });
      });
  } catch (e) {
    console.error('register-sales error', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: '用户名或密码错误' });
    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin, role: user.role || 'customer', username: user.username }, process.env.JWT_SECRET);
    // 记录登录事件（analytics）
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection && req.connection.remoteAddress;
    db.run('INSERT INTO analytics (type,userId,ip) VALUES (?,?,?)', ['login', user.id, ip]);
    // 如果是管理员或销售，也将登录写入操作日志
    if (user.isAdmin || (user.role && user.role === 'sales')){
      db.run('INSERT INTO op_logs (userId,username,role,ip,action,details) VALUES (?,?,?,?,?,?)',
        [user.id, user.username, user.isAdmin ? 'admin' : user.role, ip, 'login', null]);
    }
    res.json({ token, isAdmin: user.isAdmin, role: user.role || 'customer' });
  });
});

// 获取当前用户信息
router.get('/me', auth, (req, res) => {
  const id = req.user && req.user.id;
  if (!id) return res.status(401).json({ error: '无token' });
  db.get('SELECT id,username,email,region,role,isAdmin FROM users WHERE id=?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '用户不存在' });
    res.json(row);
  });
});

module.exports = router;