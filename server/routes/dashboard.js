const express = require('express');
const { prepare } = require('../db');
const { authenticate, checkBanned } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, checkBanned);

router.get('/', (req, res) => {
  try {
    const userId = req.user.id;

    const totalGreeting = prepare('SELECT COUNT(*) as cnt FROM companies WHERE user_id = ?').get(userId);
    const totalResumeSent = prepare("SELECT COUNT(*) as cnt FROM companies WHERE user_id = ? AND status NOT IN ('打招呼', '沟通无回复')").get(userId);
    const totalInterview = prepare("SELECT COUNT(*) as cnt FROM companies WHERE user_id = ? AND status IN ('约面试', '面试未通过', '已拿Offer')").get(userId);
    const totalOffer = prepare("SELECT COUNT(*) as cnt FROM companies WHERE user_id = ? AND status = '已拿Offer'").get(userId);

    const statusDist = prepare('SELECT status, COUNT(*) as count FROM companies WHERE user_id = ? GROUP BY status').all(userId);
    const channelDist = prepare('SELECT channel, COUNT(*) as count FROM companies WHERE user_id = ? GROUP BY channel').all(userId);

    const heatmapData = prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM (
        SELECT created_at FROM companies WHERE user_id = ?
        UNION ALL
        SELECT created_at FROM interactions WHERE user_id = ?
      )
      WHERE created_at >= date('now', 'localtime', '-365 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(userId, userId);

    const recentCompanies = prepare('SELECT * FROM companies WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5').all(userId)
      .map(c => ({ ...c, tags: JSON.parse(c.tags || '[]') }));

    const activeCount = prepare("SELECT COUNT(*) as cnt FROM companies WHERE user_id = ? AND status IN ('打招呼', '已发简历', '约面试')").get(userId);

    const weekActivity = prepare(`
      SELECT COUNT(*) as cnt FROM (
        SELECT created_at FROM companies WHERE user_id = ? AND created_at >= date('now', 'localtime', 'weekday 0', '-7 days')
        UNION ALL
        SELECT created_at FROM interactions WHERE user_id = ? AND created_at >= date('now', 'localtime', 'weekday 0', '-7 days')
      )
    `).get(userId, userId);

    res.json({
      funnel: {
        greeting: totalGreeting ? totalGreeting.cnt : 0,
        resume_sent: totalResumeSent ? totalResumeSent.cnt : 0,
        interview: totalInterview ? totalInterview.cnt : 0,
        offer: totalOffer ? totalOffer.cnt : 0
      },
      statusDistribution: statusDist,
      channelDistribution: channelDist,
      heatmapData,
      recentCompanies,
      activeCount: activeCount ? activeCount.cnt : 0,
      weekActivity: weekActivity ? weekActivity.cnt : 0,
      totalCompanies: totalGreeting ? totalGreeting.cnt : 0
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: '获取仪表盘数据失败' });
  }
});

module.exports = router;
