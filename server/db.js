const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('onlineshop.db');

db.serialize(() => {
  // 用户
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT,
    isAdmin INTEGER DEFAULT 0
  )`);
  // 商品
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    stock INTEGER
  )`);
  // 若 products 表为空，则插入一些默认手机商品
  db.get('SELECT COUNT(*) AS c FROM products', (err, row) => {
    if (!row || row.c === 0) {
      const products = [
        ['iPhone 14', 6999, 50],
        ['iPhone 14 Pro', 8999, 30],
        ['Samsung Galaxy S23', 5999, 40],
        ['Xiaomi 14', 4299, 60],
        ['OnePlus 12', 4999, 20],
        ['Huawei P60', 5399, 25]
      ];
      const stmt = db.prepare('INSERT INTO products (name,price,stock) VALUES (?,?,?)');
      products.forEach(p => stmt.run(p[0], p[1], p[2]));
      stmt.finalize();
    }
  });
  // 购物车
  db.run(`CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    productId INTEGER,
    quantity INTEGER
  )`);
  // 订单
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    total REAL,
    status TEXT DEFAULT '待发货',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 站内消息（简易邮箱）
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    subject TEXT,
    body TEXT,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 管理员账号
  db.get('SELECT id FROM users WHERE username = "admin"', (_, r) => {
    if (!r) {
      const bcrypt = require('bcrypt');
      const hash = bcrypt.hashSync('123456', 10);
      db.run('INSERT INTO users (username,password,email,isAdmin) VALUES (?,?,?,1)',
             ['admin', hash, 'admin@shop.com']);
    }
  });
});

module.exports = db;