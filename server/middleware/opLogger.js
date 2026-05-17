const db = require('../db');

function getIp(req){
  return req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || null;
}

async function logOperation(req, action, details){
  try{
    const userId = req.user && req.user.id ? req.user.id : null;
    const username = req.user && req.user.username ? req.user.username : null;
    const role = req.user && req.user.isAdmin ? 'admin' : (req.user && req.user.role ? req.user.role : null);
    const ip = getIp(req);
    db.run('INSERT INTO op_logs (userId,username,role,ip,action,details) VALUES (?,?,?,?,?,?)',
      [userId, username, role, ip, action, details ? JSON.stringify(details) : null]);
  }catch(e){ console.error('logOperation err', e); }
}

module.exports = { logOperation };
