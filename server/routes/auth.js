const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prepare } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填项' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const existing = prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, password_hash);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.lastInsertRowid, username, email, role: 'user' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const user = prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    if (user.is_banned) {
      return res.status(403).json({ error: '账号已被封禁，请联系管理员' });
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = prepare(
      'SELECT id, username, email, role, is_banned, created_at FROM users WHERE id = ?'
    ).get(decoded.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.is_banned) return res.status(403).json({ error: '账号已被封禁' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
});

module.exports = router;
