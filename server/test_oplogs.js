const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'onlineshop.db');
const db = new sqlite3.Database(dbPath, (err) => { if (err) return console.error(err); console.log('DB:', dbPath); });

function run(){
  db.run("INSERT INTO op_logs (userId,username,role,ip,action,details) VALUES (?,?,?,?,?,?)",
    [1, 'admin', 'admin', '127.0.0.1', 'test_action', JSON.stringify({info:'手动插入示例'})], function(err){
      if (err) console.error('insert err', err);
      else console.log('插入 op_logs id=', this.lastID);
  });

  setTimeout(()=>{
    db.all('SELECT * FROM op_logs ORDER BY id DESC LIMIT 20', [], (err, rows)=>{
      if (err) console.error('query err', err);
      else console.table(rows);
      db.close();
    });
  }, 200);
}

run();
