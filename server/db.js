const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, '..', 'onlineshop.db');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  // 用户
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT,
    region TEXT DEFAULT '未知',
    isAdmin INTEGER DEFAULT 0
  )`);

  // 商品（包含 category）
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    stock INTEGER,
    category TEXT DEFAULT '未知'
  )`);

  // 类目表
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 若 categories 表为空，则插入默认类目
  db.get('SELECT COUNT(*) AS c FROM categories', (err, row) => {
    if (!row || row.c === 0) {
      const categories = ['手机', '配件', '电脑', '家电'];
      const stmt = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
      categories.forEach(name => stmt.run(name));
      stmt.finalize();
    }
  });

  // 若 products 表为空，则插入一些默认手机商品
  db.get('SELECT COUNT(*) AS c FROM products', (err, row) => {
    if (!row || row.c === 0) {
      const products = [
        ['iPhone 14', 6999, 50, '手机'],
        ['iPhone 14 Pro', 8999, 30, '手机'],
        ['Samsung Galaxy S23', 5999, 40, '手机'],
        ['Xiaomi 14', 4299, 60, '手机'],
        ['OnePlus 12', 4999, 20, '手机'],
        ['Huawei P60', 5399, 25, '手机']
      ];
      const stmt = db.prepare('INSERT INTO products (name,price,stock,category) VALUES (?,?,?,?)');
      products.forEach(p => stmt.run(p[0], p[1], p[2], p[3]));
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

  // 订单明细
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER,
    productId INTEGER,
    price REAL,
    quantity INTEGER
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

  // 采集/分析表
  db.run(`CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    userId INTEGER,
    ip TEXT,
    category TEXT,
    duration INTEGER,
    price REAL,
    quantity INTEGER,
    orderId INTEGER,
    extra TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 操作日志表：记录管理员/销售等的操作（时间、内容、IP、账号）
  db.run(`CREATE TABLE IF NOT EXISTS op_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    username TEXT,
    role TEXT,
    ip TEXT,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 如果旧数据库的 users 表缺少 role 或 region 列，则尝试添加（向后兼容）
  db.all("PRAGMA table_info(users)", (err2, cols2) => {
    if (!err2 && cols2) {
      const hasRole = cols2.some(c => c.name === 'role');
      if (!hasRole) {
        db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'");
      }
      const hasRegion = cols2.some(c => c.name === 'region');
      if (!hasRegion) {
        db.run("ALTER TABLE users ADD COLUMN region TEXT DEFAULT '未知'");
      }
    }
  });

  // 如果旧数据库的 products 表缺少 category 列，则尝试添加（向后兼容）
  db.all("PRAGMA table_info(products)", (err, cols) => {
    if (!err && cols) {
      const hasCategory = cols.some(c => c.name === 'category');
      if (!hasCategory) {
        db.run("ALTER TABLE products ADD COLUMN category TEXT DEFAULT '未知'");
      }
    }
  });
});

module.exports = db;