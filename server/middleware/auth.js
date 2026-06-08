const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'job-crm-secret-key-2024';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

function checkBanned(req, res, next) {
  const { prepare } = require('../db');
  const user = prepare('SELECT is_banned FROM users WHERE id = ?').get(req.user.id);
  if (user && user.is_banned) {
    return res.status(403).json({ error: '账号已被封禁，请联系管理员' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, checkBanned, JWT_SECRET };
