import { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { dashboardAPI, interviewsAPI } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.get(),
      interviewsAPI.upcoming()
    ]).then(([dashData, interviewData]) => {
      setData(dashData);
      setUpcoming(interviewData.interviews || []);
      if (interviewData.interviews?.length > 0) {
        setShowAlert(true);
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const funnel = data?.funnel || {};
  const funnelOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [{
      type: 'funnel',
      left: '10%',
      top: 10,
      bottom: 10,
      width: '80%',
      min: 0,
      max: Math.max(funnel.greeting || 1, 1),
      minSize: '10%',
      maxSize: '100%',
      sort: 'descending',
      gap: 4,
      label: {
        show: true,
        position: 'inside',
        formatter: '{b}\n{c}',
        fontSize: 13,
        fontWeight: 600,
        color: '#fff'
      },
      itemStyle: { borderWidth: 0, borderRadius: 4 },
      data: [
        { value: funnel.greeting || 0, name: '打招呼', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#818cf8' }]) } },
        { value: funnel.resume_sent || 0, name: '投递简历', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#a78bfa' }]) } },
        { value: funnel.interview || 0, name: '获得面试', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#06b6d4' }, { offset: 1, color: '#22d3ee' }]) } },
        { value: funnel.offer || 0, name: '拿到Offer', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' }]) } },
      ]
    }]
  };

  const calcRate = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

  // Heatmap
  const heatmapData = data?.heatmapData || [];
  const heatmapMap = {};
  heatmapData.forEach(d => { heatmapMap[d.date] = d.count; });

  const today = new Date();
  const weeks = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // Adjust to start on Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  let current = new Date(startDate);
  let currentWeek = [];
  const months = [];
  let lastMonth = -1;

  while (current <= today || currentWeek.length > 0) {
    const dateStr = current.toISOString().split('T')[0];
    const count = heatmapMap[dateStr] || 0;
    const month = current.getMonth();

    if (month !== lastMonth && current <= today) {
      months.push({ month: current.toLocaleDateString('zh-CN', { month: 'short' }), weekIndex: weeks.length });
      lastMonth = month;
    }

    currentWeek.push({ date: dateStr, count, future: current > today });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    current.setDate(current.getDate() + 1);
    if (current > today && currentWeek.length === 0) break;
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const getLevel = (count) => {
    if (count === 0) return '';
    if (count <= 2) return 'level-1';
    if (count <= 5) return 'level-2';
    if (count <= 10) return 'level-3';
    return 'level-4';
  };

  return (
    <div className="animate-fade-in">
      {/* Interview Alert Modal */}
      {showAlert && upcoming.length > 0 && (
        <div className="interview-alert-overlay" onClick={() => setShowAlert(false)}>
          <div className="interview-alert" onClick={e => e.stopPropagation()}>
            <div className="interview-alert-icon">⏰</div>
            <h2>近期面试提醒</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              你有 <strong style={{ color: 'var(--warning)' }}>{upcoming.length}</strong> 场面试即将到来
            </p>
            <div className="interview-alert-list">
              {upcoming.map(iv => {
                const dt = new Date(iv.interview_time);
                const isToday = dt.toDateString() === today.toDateString();
                const isTomorrow = dt.toDateString() === new Date(today.getTime() + 86400000).toDateString();
                const dayLabel = isToday ? '今天' : isTomorrow ? '明天' : dt.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

                return (
                  <div className="interview-alert-item" key={iv.id}>
                    <strong>{iv.company_name} - {iv.round}</strong>
                    <p>📅 {dayLabel} {dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · {iv.format}</p>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-primary" onClick={() => setShowAlert(false)} style={{ marginTop: 8 }}>
              我知道了，加油! 💪
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card purple stagger-item">
          <div className="stat-icon">🏢</div>
          <div className="stat-value">{data?.totalCompanies || 0}</div>
          <div className="stat-label">总公司数</div>
        </div>
        <div className="stat-card cyan stagger-item">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{data?.activeCount || 0}</div>
          <div className="stat-label">跟进中</div>
        </div>
        <div className="stat-card green stagger-item">
          <div className="stat-icon">🎉</div>
          <div className="stat-value">{funnel.offer || 0}</div>
          <div className="stat-label">已拿Offer</div>
        </div>
        <div className="stat-card yellow stagger-item">
          <div className="stat-icon">📈</div>
          <div className="stat-value">{data?.weekActivity || 0}</div>
          <div className="stat-label">本周活动</div>
        </div>
      </div>

      {/* Funnel + Conversion Rate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card stagger-item">
          <div className="card-header">
            <h3 className="card-title">📊 求职漏斗</h3>
          </div>
          <ReactECharts
            option={funnelOption}
            style={{ height: 280 }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
        <div className="card stagger-item">
          <div className="card-header">
            <h3 className="card-title">📈 转化率分析</h3>
          </div>
          <div style={{ padding: '16px 0' }}>
            {[
              { label: '打招呼 → 投递简历', from: funnel.greeting, to: funnel.resume_sent, color: '#8b5cf6' },
              { label: '投递简历 → 获得面试', from: funnel.resume_sent, to: funnel.interview, color: '#06b6d4' },
              { label: '获得面试 → 拿到Offer', from: funnel.interview, to: funnel.offer, color: '#10b981' },
              { label: '整体转化率', from: funnel.greeting, to: funnel.offer, color: '#f59e0b' },
            ].map((item, i) => {
              const rate = item.from > 0 ? (item.to / item.from) * 100 : 0;
              return (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: item.color }}>{calcRate(item.to, item.from)}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(rate, 100)}%`,
                      background: item.color,
                      borderRadius: 4,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="card stagger-item" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">🔥 求职活跃度</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>过去一年的求职活动记录</span>
        </div>
        <div className="heatmap-container">
          <div className="heatmap-months">
            {months.map((m, i) => (
              <span key={i} className="heatmap-month" style={{ marginLeft: i === 0 ? 0 : undefined }}>{m.month}</span>
            ))}
          </div>
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div className="heatmap-week" key={wi}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`heatmap-cell ${day.future ? '' : getLevel(day.count)}`}
                    title={day.future ? '' : `${day.date}: ${day.count} 次活动`}
                    style={day.future ? { opacity: 0.15 } : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span>少</span>
            <div className="heatmap-cell" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell level-1" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell level-2" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell level-3" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell level-4" style={{ width: 12, height: 12 }} />
            <span>多</span>
          </div>
        </div>
      </div>

      {/* Recent Companies */}
      <div className="card stagger-item">
        <div className="card-header">
          <h3 className="card-title">🕐 最近更新</h3>
        </div>
        {data?.recentCompanies?.length > 0 ? (
          <div>
            {data.recentCompanies.map(c => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.company_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {c.contact_person} · {c.channel}
                  </div>
                </div>
                <span className="status-badge" style={{
                  background: `${statusColor(c.status)}20`,
                  color: statusColor(c.status),
                  borderColor: `${statusColor(c.status)}40`,
                  border: '1px solid'
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>还没有记录</h3>
            <p>去「公司管理」添加你的第一条求职记录吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

function statusColor(status) {
  const map = {
    '打招呼': '#60a5fa', '已发简历': '#a78bfa', '约面试': '#f59e0b',
    '沟通无回复': '#6b7280', '简历被拒': '#ef4444', '面试未通过': '#f87171',
    '我方放弃': '#9ca3af', '已拿Offer': '#10b981',
  };
  return map[status] || '#6b7280';
}
