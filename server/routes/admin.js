const express = require('express');
const { prepare } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/users', (req, res) => {
  try {
    const users = prepare('SELECT id, username, email, role, is_banned, created_at FROM users ORDER BY created_at DESC').all();
    const enriched = users.map(u => {
      const cc = prepare('SELECT COUNT(*) as cnt FROM companies WHERE user_id = ?').get(u.id);
      return { ...u, company_count: cc ? cc.cnt : 0 };
    });
    res.json({ users: enriched, total: users.length });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.patch('/users/:id/ban', (req, res) => {
  try {
    const user = prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'admin') return res.status(400).json({ error: '不能封禁管理员' });

    const newBanStatus = user.is_banned ? 0 : 1;
    prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(newBanStatus, req.params.id);
    res.json({ success: true, is_banned: newBanStatus });
  } catch (err) {
    console.error('Admin ban user error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const totalUsers = prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'user'").get();
    const totalCompanies = prepare('SELECT COUNT(*) as cnt FROM companies').get();
    const totalInteractions = prepare('SELECT COUNT(*) as cnt FROM interactions').get();
    const totalInterviews = prepare('SELECT COUNT(*) as cnt FROM interviews').get();

    res.json({
      totalUsers: totalUsers ? totalUsers.cnt : 0,
      totalCompanies: totalCompanies ? totalCompanies.cnt : 0,
      totalInteractions: totalInteractions ? totalInteractions.cnt : 0,
      totalInterviews: totalInterviews ? totalInterviews.cnt : 0
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

router.post('/tags', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '标签名不能为空' });

    const existing = prepare("SELECT id FROM tags WHERE name = ? AND type = 'system'").get(name.trim());
    if (existing) return res.status(400).json({ error: '系统标签已存在' });

    const result = prepare("INSERT INTO tags (name, type) VALUES (?, 'system')").run(name.trim());
    const tag = prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (err) {
    console.error('Admin create tag error:', err);
    res.status(500).json({ error: '创建标签失败' });
  }
});

router.delete('/tags/:id', (req, res) => {
  try {
    prepare("DELETE FROM tags WHERE id = ? AND type = 'system'").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete tag error:', err);
    res.status(500).json({ error: '删除标签失败' });
  }
});

router.put('/templates/:id', (req, res) => {
  try {
    const { title, content, category } = req.body;
    prepare("UPDATE templates SET title = ?, content = ?, category = ?, updated_at = datetime('now', 'localtime') WHERE id = ? AND is_system = 1").run(
      title, content, category, req.params.id
    );
    const updated = prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Admin update template error:', err);
    res.status(500).json({ error: '更新模板失败' });
  }
});

module.exports = router;
