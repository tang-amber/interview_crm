const express = require('express');
const { prepare } = require('../db');
const { authenticate, checkBanned } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, checkBanned);

router.get('/', (req, res) => {
  try {
    const templates = prepare('SELECT * FROM templates WHERE is_system = 1 OR user_id = ? ORDER BY is_system DESC, updated_at DESC').all(req.user.id);
    res.json({ templates });
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ error: '获取模板列表失败' });
  }
});

router.post('/', (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: '请填写模板标题和内容' });

    const result = prepare('INSERT INTO templates (user_id, title, content, category) VALUES (?, ?, ?, ?)').run(req.user.id, title, content, category || 'other');
    const template = prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(template);
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: '创建模板失败' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const template = prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: '模板不存在' });
    if (template.is_system && req.user.role !== 'admin') return res.status(403).json({ error: '不能编辑系统模板' });
    if (!template.is_system && template.user_id !== req.user.id) return res.status(403).json({ error: '不能编辑他人的模板' });

    const { title, content, category } = req.body;
    prepare("UPDATE templates SET title = ?, content = ?, category = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(
      title || template.title, content || template.content, category || template.category, req.params.id
    );

    const updated = prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: '更新模板失败' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const template = prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: '模板不存在' });
    if (template.is_system && req.user.role !== 'admin') return res.status(403).json({ error: '不能删除系统模板' });
    if (!template.is_system && template.user_id !== req.user.id) return res.status(403).json({ error: '不能删除他人的模板' });

    prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: '删除模板失败' });
  }
});

module.exports = router;
