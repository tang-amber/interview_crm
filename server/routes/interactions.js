const express = require('express');
const { prepare } = require('../db');
const { authenticate, checkBanned } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, checkBanned);

// GET /api/companies/:companyId/interactions
router.get('/companies/:companyId/interactions', (req, res) => {
  try {
    const company = prepare('SELECT id FROM companies WHERE id = ? AND user_id = ?').get(req.params.companyId, req.user.id);
    if (!company) return res.status(404).json({ error: '公司不存在' });

    const interactions = prepare('SELECT * FROM interactions WHERE company_id = ? ORDER BY created_at DESC').all(req.params.companyId);
    res.json({ interactions, total: interactions.length });
  } catch (err) {
    console.error('List interactions error:', err);
    res.status(500).json({ error: '获取沟通记录失败' });
  }
});

// POST /api/companies/:companyId/interactions
router.post('/companies/:companyId/interactions', (req, res) => {
  try {
    const company = prepare('SELECT id FROM companies WHERE id = ? AND user_id = ?').get(req.params.companyId, req.user.id);
    if (!company) return res.status(404).json({ error: '公司不存在' });

    const { content, type } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '沟通内容不能为空' });
    }

    const result = prepare('INSERT INTO interactions (company_id, user_id, content, type) VALUES (?, ?, ?, ?)').run(
      req.params.companyId, req.user.id, content.trim(), type || 'note'
    );

    prepare("UPDATE companies SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(req.params.companyId);

    const interaction = prepare('SELECT * FROM interactions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(interaction);
  } catch (err) {
    console.error('Create interaction error:', err);
    res.status(500).json({ error: '添加沟通记录失败' });
  }
});

// DELETE /api/interactions/:id
router.delete('/interactions/:id', (req, res) => {
  try {
    const interaction = prepare('SELECT * FROM interactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!interaction) return res.status(404).json({ error: '记录不存在' });

    prepare('DELETE FROM interactions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete interaction error:', err);
    res.status(500).json({ error: '删除沟通记录失败' });
  }
});

module.exports = router;
