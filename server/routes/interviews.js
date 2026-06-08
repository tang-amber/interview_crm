const express = require('express');
const { prepare } = require('../db');
const { authenticate, checkBanned } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, checkBanned);

// GET /api/companies/:companyId/interviews
router.get('/companies/:companyId/interviews', (req, res) => {
  try {
    const company = prepare('SELECT id FROM companies WHERE id = ? AND user_id = ?').get(req.params.companyId, req.user.id);
    if (!company) return res.status(404).json({ error: '公司不存在' });

    const interviews = prepare('SELECT * FROM interviews WHERE company_id = ? ORDER BY interview_time ASC').all(req.params.companyId);
    res.json({ interviews });
  } catch (err) {
    console.error('List interviews error:', err);
    res.status(500).json({ error: '获取面试记录失败' });
  }
});

// POST /api/companies/:companyId/interviews
router.post('/companies/:companyId/interviews', (req, res) => {
  try {
    const company = prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.companyId, req.user.id);
    if (!company) return res.status(404).json({ error: '公司不存在' });

    const { round, interview_time, format, location, notes } = req.body;
    if (!round || !interview_time) {
      return res.status(400).json({ error: '请填写面试轮次和时间' });
    }

    const result = prepare(
      'INSERT INTO interviews (company_id, user_id, round, interview_time, format, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.companyId, req.user.id, round, interview_time, format || '线下面试', location || null, notes || null);

    if (company.status !== '约面试' && company.status !== '已拿Offer') {
      prepare("UPDATE companies SET status = '约面试', updated_at = datetime('now', 'localtime') WHERE id = ?").run(req.params.companyId);
    }

    prepare('INSERT INTO interactions (company_id, user_id, content, type) VALUES (?, ?, ?, ?)').run(
      req.params.companyId, req.user.id,
      `安排${round}面试：${interview_time}，形式：${format || '线下面试'}`, 'note'
    );

    const interview = prepare('SELECT * FROM interviews WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(interview);
  } catch (err) {
    console.error('Create interview error:', err);
    res.status(500).json({ error: '添加面试记录失败' });
  }
});

// PUT /api/interviews/:id
router.put('/interviews/:id', (req, res) => {
  try {
    const interview = prepare('SELECT * FROM interviews WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!interview) return res.status(404).json({ error: '面试记录不存在' });

    const { round, interview_time, format, location, notes, result: interviewResult } = req.body;

    prepare('UPDATE interviews SET round = ?, interview_time = ?, format = ?, location = ?, notes = ?, result = ? WHERE id = ?').run(
      round || interview.round, interview_time || interview.interview_time,
      format || interview.format,
      location !== undefined ? location : interview.location,
      notes !== undefined ? notes : interview.notes,
      interviewResult || interview.result, req.params.id
    );

    const updated = prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update interview error:', err);
    res.status(500).json({ error: '更新面试记录失败' });
  }
});

// DELETE /api/interviews/:id
router.delete('/interviews/:id', (req, res) => {
  try {
    const result = prepare('DELETE FROM interviews WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: '面试记录不存在' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete interview error:', err);
    res.status(500).json({ error: '删除面试记录失败' });
  }
});

// GET /api/interviews/upcoming
router.get('/interviews/upcoming', (req, res) => {
  try {
    const interviews = prepare(`
      SELECT i.*, c.company_name, c.contact_person, c.channel
      FROM interviews i
      JOIN companies c ON i.company_id = c.id
      WHERE i.user_id = ?
        AND i.interview_time >= datetime('now', 'localtime')
        AND i.interview_time <= datetime('now', 'localtime', '+3 days')
        AND i.result = 'pending'
      ORDER BY i.interview_time ASC
    `).all(req.user.id);

    res.json({ interviews });
  } catch (err) {
    console.error('Upcoming interviews error:', err);
    res.status(500).json({ error: '获取近期面试失败' });
  }
});

// GET /api/interviews/calendar
router.get('/interviews/calendar', (req, res) => {
  try {
    const { year, month } = req.query;
    let sql = `
      SELECT i.*, c.company_name, c.contact_person
      FROM interviews i
      JOIN companies c ON i.company_id = c.id
      WHERE i.user_id = ?
    `;
    const params = [req.user.id];

    if (year && month) {
      sql += ` AND strftime('%Y', i.interview_time) = ? AND strftime('%m', i.interview_time) = ?`;
      params.push(year, month.toString().padStart(2, '0'));
    }

    sql += ' ORDER BY i.interview_time ASC';
    const interviews = prepare(sql).all(...params);
    res.json({ interviews });
  } catch (err) {
    console.error('Calendar interviews error:', err);
    res.status(500).json({ error: '获取日历数据失败' });
  }
});

module.exports = router;
