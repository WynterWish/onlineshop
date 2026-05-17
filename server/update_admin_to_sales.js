const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'onlineshop.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('db open error', err);
  db.run("UPDATE users SET isAdmin=0, role='sales' WHERE username='admin'", function(err) {
    if (err) {
      console.error('update error', err);
      db.close();
      return;
    }
    console.log('updated rows', this.changes);
    db.all("SELECT id,username,isAdmin,role,email FROM users WHERE username='admin'", [], (e, rows) => {
      if (e) console.error('select error', e);
      else console.log(rows);
      db.close();
    });
  });
});
