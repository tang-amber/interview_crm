const express = require('express');
const { prepare } = require('../db');
const { authenticate, checkBanned } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, checkBanned);

router.get('/', (req, res) => {
  try {
    const tags = prepare("SELECT * FROM tags WHERE type = 'system' OR user_id = ? ORDER BY type ASC, name ASC").all(req.user.id);
    res.json({ tags });
  } catch (err) {
    console.error('List tags error:', err);
    res.status(500).json({ error: '获取标签列表失败' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '标签名不能为空' });

    const existing = prepare("SELECT id FROM tags WHERE name = ? AND (type = 'system' OR user_id = ?)").get(name.trim(), req.user.id);
    if (existing) return res.status(400).json({ error: '标签已存在' });

    const result = prepare('INSERT INTO tags (name, type, user_id) VALUES (?, ?, ?)').run(name.trim(), 'user_custom', req.user.id);
    const tag = prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (err) {
    console.error('Create tag error:', err);
    res.status(500).json({ error: '创建标签失败' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const tag = prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    if (!tag) return res.status(404).json({ error: '标签不存在' });
    if (tag.type === 'system' && req.user.role !== 'admin') return res.status(403).json({ error: '不能删除系统标签' });
    if (tag.type === 'user_custom' && tag.user_id !== req.user.id) return res.status(403).json({ error: '不能删除他人的标签' });

    prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete tag error:', err);
    res.status(500).json({ error: '删除标签失败' });
  }
});

module.exports = router;
