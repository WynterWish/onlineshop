const express = require('express');
const db = require('../db');
let deepseek;
try{ deepseek = require('../lib/deepseek'); }catch(e){ deepseek = null; }
const router = express.Router();

// 共购推荐：找到与指定商品在同一订单中出现的其他商品
router.get('/co-purchase/:productId', (req, res) => {
  const pid = Number(req.params.productId);
  // Prefer DeepSeek similar-products if available
  if (deepseek) {
    deepseek.similarProducts(pid).then(resp => {
      // expect resp.recommendations = [{ productId, score }]
      const recs = resp.recommendations || [];
      const ids = recs.map(r=>r.productId).slice(0,10);
      if (ids.length===0) return res.json([]);
      const scoreMap = {}; recs.forEach(r=>{ scoreMap[r.productId] = r.score || r.confidence || 0; });
      const q = `SELECT id,name FROM products WHERE id IN (${ids.map(()=>'?').join(',')})`;
      db.all(q, ids, (er, prows)=> {
        if (er) return res.status(500).json({ error: er.message });
        const out = prows.map(p => ({ id: p.id, name: p.name, score: scoreMap[p.id] || 0 }));
        res.json(out);
      });
    }).catch(err => {
      // fallback to local co-purchase
      const sql = `SELECT oi2.productId, p.name, SUM(oi2.quantity) AS cnt
                   FROM order_items oi1
                   JOIN order_items oi2 ON oi1.orderId = oi2.orderId AND oi2.productId != ?
                   JOIN products p ON oi2.productId = p.id
                   WHERE oi1.productId = ?
                   GROUP BY oi2.productId ORDER BY cnt DESC LIMIT 10`;
      db.all(sql, [pid, pid], (e, rows) => e ? res.status(500).json({ error: e.message }) : res.json(rows));
    });
  } else {
    const sql = `SELECT oi2.productId, p.name, SUM(oi2.quantity) AS cnt
                 FROM order_items oi1
                 JOIN order_items oi2 ON oi1.orderId = oi2.orderId AND oi2.productId != ?
                 JOIN products p ON oi2.productId = p.id
                 WHERE oi1.productId = ?
                 GROUP BY oi2.productId ORDER BY cnt DESC LIMIT 10`;
    db.all(sql, [pid, pid], (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
  }
});

// 简单协同过滤（基于购买历史的用户相似度）
router.get('/cf/:userId', (req, res) => {
  const uid = req.params.userId;
  // If DeepSeek available, ask for recommendations first
  if (deepseek) {
    deepseek.recommendForUser(uid).then(async (resp) => {
      const recs = resp.recommendations || resp.items || [];
      const ids = recs.map(r => r.productId || r.id).slice(0,10);
      if (ids.length===0) return res.json([]);
      const scoreMap = {}; recs.forEach(r => { const id = r.productId || r.id; scoreMap[id] = r.score || r.confidence || 0; });
      const q = `SELECT id,name FROM products WHERE id IN (${ids.map(()=>'?').join(',')})`;
      db.all(q, ids, (er, prows)=> {
        if (er) return res.status(500).json({ error: er.message });
        const out = prows.map(p => ({ id: p.id, name: p.name, score: scoreMap[p.id] || 0 }));
        res.json(out);
      });
    }).catch(err => {
      // fallback to local CF
      db.all('SELECT DISTINCT productId FROM order_items oi JOIN orders o ON oi.orderId=o.id WHERE o.userId=?', [uid], (e, mine)=>{
        if (e) return res.status(500).json({ error: e.message });
        const mineSet = new Set(mine.map(r=>r.productId));
        db.all(`SELECT o.userId AS otherUser, oi.productId
                FROM order_items oi JOIN orders o ON oi.orderId=o.id
                WHERE oi.productId IN (${mine.map(()=>'?').join(',')})`, mine.map(r=>r.productId), (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          const others = {};
          rows.forEach(r => {
            if (!others[r.otherUser]) others[r.otherUser]=new Set();
            others[r.otherUser].add(r.productId);
          });
          const candidates = {};
          Object.keys(others).forEach(k => {
            others[k].forEach(pid => {
              if (mineSet.has(pid)) return;
              candidates[pid] = (candidates[pid]||0) + 1;
            });
          });
          const ids = Object.keys(candidates).sort((a,b)=>candidates[b]-candidates[a]).slice(0,10);
          if (ids.length===0) return res.json([]);
          const q = `SELECT id,name FROM products WHERE id IN (${ids.map(()=>'?').join(',')})`;
          db.all(q, ids, (er, prows)=> er ? res.status(500).json({ error: er.message }) : res.json(prows.map(p=>({...p, score: candidates[p.id]}))));
        });
      });
    });
  } else {
    // 本地 CF
    db.all('SELECT DISTINCT productId FROM order_items oi JOIN orders o ON oi.orderId=o.id WHERE o.userId=?', [uid], (e, mine)=>{
      if (e) return res.status(500).json({ error: e.message });
      const mineSet = new Set(mine.map(r=>r.productId));
      db.all(`SELECT o.userId AS otherUser, oi.productId
              FROM order_items oi JOIN orders o ON oi.orderId=o.id
              WHERE oi.productId IN (${mine.map(()=>'?').join(',')})`, mine.map(r=>r.productId), (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const others = {};
        rows.forEach(r => {
          if (!others[r.otherUser]) others[r.otherUser]=new Set();
          others[r.otherUser].add(r.productId);
        });
        const candidates = {};
        Object.keys(others).forEach(k => {
          others[k].forEach(pid => {
            if (mineSet.has(pid)) return;
            candidates[pid] = (candidates[pid]||0) + 1;
          });
        });
        const ids = Object.keys(candidates).sort((a,b)=>candidates[b]-candidates[a]).slice(0,10);
        if (ids.length===0) return res.json([]);
        const q = `SELECT id,name FROM products WHERE id IN (${ids.map(()=>'?').join(',')})`;
        db.all(q, ids, (er, prows)=> er ? res.status(500).json({ error: er.message }) : res.json(prows.map(p=>({...p, score: candidates[p.id]}))));
      });
    });
  }
});

module.exports = router;
