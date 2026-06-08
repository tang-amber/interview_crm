const express = require('express');
const { prepare } = require('../db');
const { authenticate, checkBanned } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, checkBanned);

// GET /api/companies
router.get('/', (req, res) => {
  try {
    const { status, channel, search, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM companies WHERE user_id = ?';
    const params = [req.user.id];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (channel) { sql += ' AND channel = ?'; params.push(channel); }
    if (search) {
      sql += ' AND (company_name LIKE ? OR contact_person LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = prepare(countSql).get(...params);
    const total = countResult ? countResult.total : 0;

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const companies = prepare(sql).all(...params);

    const enriched = companies.map(c => {
      const ic = prepare('SELECT COUNT(*) as cnt FROM interactions WHERE company_id = ?').get(c.id);
      const nextInterview = prepare(
        "SELECT * FROM interviews WHERE company_id = ? AND interview_time >= datetime('now', 'localtime') ORDER BY interview_time ASC LIMIT 1"
      ).get(c.id);

      return {
        ...c,
        tags: JSON.parse(c.tags || '[]'),
        interaction_count: ic ? ic.cnt : 0,
        next_interview: nextInterview || null
      };
    });

    res.json({ companies: enriched, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List companies error:', err);
    res.status(500).json({ error: '获取公司列表失败' });
  }
});

// GET /api/companies/:id
router.get('/:id', (req, res) => {
  try {
    const company = prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!company) return res.status(404).json({ error: '公司不存在' });

    const interactions = prepare('SELECT * FROM interactions WHERE company_id = ? ORDER BY created_at DESC').all(company.id);
    const interviews = prepare('SELECT * FROM interviews WHERE company_id = ? ORDER BY interview_time ASC').all(company.id);

    res.json({
      ...company,
      tags: JSON.parse(company.tags || '[]'),
      interactions,
      interviews,
      interaction_count: interactions.length
    });
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ error: '获取公司详情失败' });
  }
});

// POST /api/companies
router.post('/', (req, res) => {
  try {
    const { company_name, channel, contact_person, status, position, salary_range, work_location, commute_time, resume_version, tags, notes } = req.body;
    if (!company_name || !channel || !contact_person) {
      return res.status(400).json({ error: '请填写公司名称、沟通渠道和沟通人' });
    }

    const result = prepare(`
      INSERT INTO companies (user_id, company_name, channel, contact_person, status, position, salary_range, work_location, commute_time, resume_version, tags, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, company_name, channel, contact_person,
      status || '打招呼', position || '软件测试工程师',
      salary_range || null, work_location || null,
      commute_time || null, resume_version || null,
      JSON.stringify(tags || []), notes || null
    );

    prepare('INSERT INTO interactions (company_id, user_id, content, type) VALUES (?, ?, ?, ?)').run(
      result.lastInsertRowid, req.user.id, `通过${channel}向${contact_person}打招呼`, 'note'
    );

    const company = prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...company, tags: JSON.parse(company.tags || '[]') });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ error: '创建公司记录失败' });
  }
});

// PUT /api/companies/:id
router.put('/:id', (req, res) => {
  try {
    const company = prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!company) return res.status(404).json({ error: '公司不存在' });

    const { company_name, channel, contact_person, status, position, salary_range, work_location, commute_time, resume_version, tags, notes } = req.body;

    prepare(`
      UPDATE companies SET
        company_name = ?, channel = ?, contact_person = ?, status = ?,
        position = ?, salary_range = ?, work_location = ?, commute_time = ?,
        resume_version = ?, tags = ?, notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ? AND user_id = ?
    `).run(
      company_name || company.company_name, channel || company.channel,
      contact_person || company.contact_person, status || company.status,
      position || company.position,
      salary_range !== undefined ? salary_range : company.salary_range,
      work_location !== undefined ? work_location : company.work_location,
      commute_time !== undefined ? commute_time : company.commute_time,
      resume_version !== undefined ? resume_version : company.resume_version,
      tags ? JSON.stringify(tags) : company.tags,
      notes !== undefined ? notes : company.notes,
      req.params.id, req.user.id
    );

    const updated = prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    res.json({ ...updated, tags: JSON.parse(updated.tags || '[]') });
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: '更新公司记录失败' });
  }
});

// PATCH /api/companies/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['打招呼', '已发简历', '约面试', '沟通无回复', '简历被拒', '面试未通过', '我方放弃', '已拿Offer'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }

    const company = prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!company) return res.status(404).json({ error: '公司不存在' });

    prepare("UPDATE companies SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(status, req.params.id);
    prepare('INSERT INTO interactions (company_id, user_id, content, type) VALUES (?, ?, ?, ?)').run(
      req.params.id, req.user.id, `状态变更：${company.status} → ${status}`, 'note'
    );

    res.json({ success: true, status });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: '状态更新失败' });
  }
});

// DELETE /api/companies/:id
router.delete('/:id', (req, res) => {
  try {
    const result = prepare('DELETE FROM companies WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: '公司不存在' });
    // Also delete related records
    prepare('DELETE FROM interactions WHERE company_id = ?').run(req.params.id);
    prepare('DELETE FROM interviews WHERE company_id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: '删除公司记录失败' });
  }
});

module.exports = router;
