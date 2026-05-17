const fetch = global.fetch || require('node-fetch');
const db = require('../db');

const BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.ai';
const KEY = process.env.DEEPSEEK_API_KEY || '';

async function call(path, body){
  if (!KEY) throw new Error('No DEEPSEEK_API_KEY');
  const url = BASE.replace(/\/$/, '') + path;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('DeepSeek API error ' + res.status);
  return res.json();
}

async function recommendForUser(userId){
  // collect user's purchased product ids
  return new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT oi.productId FROM order_items oi JOIN orders o ON oi.orderId=o.id WHERE o.userId=?', [userId], async (err, rows) => {
      if (err) return reject(err);
      const purchased = (rows||[]).map(r=>r.productId);
      try{
        const out = await call('/v1/recommend', { userId, purchased });
        resolve(out);
      }catch(e){ reject(e); }
    });
  });
}

async function similarProducts(productId){
  return call('/v1/similar', { productId });
}

async function analyzeSales(payload){
  return call('/v1/analyze-sales', payload);
}

module.exports = { recommendForUser, similarProducts, analyzeSales };
