const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const hdr = req.headers.authorization;
  if (!hdr) return res.status(401).json({ error: '无token' });
  try {
    req.user = jwt.verify(hdr.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'token非法' });
  }
};