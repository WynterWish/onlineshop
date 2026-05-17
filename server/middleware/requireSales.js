const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const hdr = req.headers.authorization;
  if (!hdr) return res.status(401).json({ error: '无token' });
  try {
    const payload = jwt.verify(hdr.split(' ')[1], process.env.JWT_SECRET);
    if (!payload.isAdmin && payload.role !== 'sales') return res.status(403).json({ error: '非销售人员' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'token非法' });
  }
};
