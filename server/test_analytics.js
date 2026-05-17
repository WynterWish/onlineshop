const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'onlineshop.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('打开数据库失败', err);
  console.log('打开数据库：', dbPath);
});

function runDemo() {
  // 插入示例：登录
  db.run("INSERT INTO analytics (type,userId,ip) VALUES (?,?,?)", ['login', 1, '127.0.0.1'], function(err){
    if (err) console.error('插入登录失败', err);
    else console.log('插入登录记录 id=', this.lastID);
  });

  // 插入示例：浏览（停留 12 秒）
  db.run("INSERT INTO analytics (type,category,duration,ip) VALUES (?,?,?,?)", ['browse', '手机', 12, '127.0.0.1'], function(err){
    if (err) console.error('插入浏览失败', err);
    else console.log('插入浏览记录 id=', this.lastID);
  });

  // 插入示例：购买
  db.run("INSERT INTO analytics (type,userId,category,price,quantity,orderId,ip) VALUES (?,?,?,?,?,?,?)",
    ['purchase', 1, '手机', 6999, 1, 12345, '127.0.0.1'], function(err){
      if (err) console.error('插入购买失败', err);
      else console.log('插入购买记录 id=', this.lastID);
  });

  // 等一会儿再查询最新记录
  setTimeout(() => {
    console.log('\n最近 10 条 analytics：');
    db.all('SELECT id,type,userId,ip,category,duration,price,quantity,orderId,created_at FROM analytics ORDER BY id DESC LIMIT 10', [], (err, rows) => {
      if (err) console.error('查询失败', err);
      else console.table(rows);
      db.close();
    });
  }, 600);
}

runDemo();
