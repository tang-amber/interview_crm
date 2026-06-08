import { useState, useEffect } from 'react';
import { interviewsAPI } from '../api';
import { INTERVIEW_ROUNDS, INTERVIEW_FORMATS } from '../utils/constants';

export default function Interviews() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const data = await interviewsAPI.calendar(year, month);
      setInterviews(data.interviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInterviews(); }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDay(null);
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDay(null);
  };
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const updateResult = async (id, result) => {
    try {
      await interviewsAPI.update(id, { result });
      fetchInterviews();
    } catch (err) { alert('更新失败'); }
  };

  const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m - 1, 1).getDay(); // 0(Sun) - 6(Sat)

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  // Create calendar grid
  const days = [];
  const prevMonthDays = getDaysInMonth(year, month - 1);
  
  // Previous month padding
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: prevMonthDays - firstDay + i + 1, currentMonth: false, dateStr: `${year}-${String(month - 1).padStart(2, '0')}-${String(prevMonthDays - firstDay + i + 1).padStart(2, '0')}` });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, currentMonth: true, dateStr: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
  }
  // Next month padding
  const remaining = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, currentMonth: false, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const getInterviewsForDate = (dateStr) => {
    return interviews.filter(iv => iv.interview_time.startsWith(dateStr));
  };

  const selectedInterviews = selectedDay ? getInterviewsForDate(selectedDay) : [];

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
      
      {/* Left: Calendar */}
      <div className="card">
        <div className="calendar-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{year}年 {month}月</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleToday}>今天</button>
            <button className="btn btn-ghost btn-sm" onClick={handlePrevMonth}>‹</button>
            <button className="btn btn-ghost btn-sm" onClick={handleNextMonth}>›</button>
          </div>
        </div>

        {loading && <div className="loading-spinner"><div className="spinner" /></div>}
        
        {!loading && (
          <div className="calendar-grid">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="calendar-weekday">{d}</div>
            ))}
            
            {days.map((d, i) => {
              const dayInterviews = getInterviewsForDate(d.dateStr);
              return (
                <div 
                  key={i} 
                  className={`calendar-day ${!d.currentMonth ? 'other-month' : ''} ${d.dateStr === todayStr ? 'today' : ''}`}
                  onClick={() => setSelectedDay(d.dateStr)}
                  style={selectedDay === d.dateStr ? { borderColor: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)' } : undefined}
                >
                  <div className="calendar-day-number">{d.day}</div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, padding: '0 2px' }}>
                    {dayInterviews.slice(0, 3).map(iv => (
                      <div key={iv.id} className="calendar-event" style={{ background: iv.result === 'passed' ? 'var(--success)' : iv.result === 'failed' ? 'var(--danger)' : 'var(--warning)' }}>
                        {new Date(iv.interview_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} {iv.company_name}
                      </div>
                    ))}
                    {dayInterviews.length > 3 && (
                      <div className="calendar-event" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
                        +{dayInterviews.length - 3} 更多
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Daily Schedule */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          {selectedDay ? `${selectedDay} 面试安排` : '请选择日期'}
        </h3>
        
        {selectedDay && selectedInterviews.length === 0 && (
          <div className="empty-state" style={{ padding: '40px 0' }}>今日无面试</div>
        )}
        
        {selectedInterviews.map(iv => (
          <div key={iv.id} style={{ 
            padding: 16, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 12,
            borderLeft: `4px solid ${iv.result === 'passed' ? 'var(--success)' : iv.result === 'failed' ? 'var(--danger)' : 'var(--warning)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <strong style={{ fontSize: '1.05rem' }}>{iv.company_name}</strong>
              <span className="tag tag-gray">{iv.round}</span>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>⏰ {new Date(iv.interview_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>👤 {iv.contact_person}</div>
              <div>📍 {iv.format} {iv.location ? `- ${iv.location}` : ''}</div>
              {iv.notes && <div style={{ marginTop: 4, fontStyle: 'italic' }}>备注: {iv.notes}</div>}
            </div>
            
            <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <button 
                className={`btn btn-sm ${iv.result === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => updateResult(iv.id, 'pending')}
              >待面</button>
              <button 
                className={`btn btn-sm ${iv.result === 'passed' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => updateResult(iv.id, 'passed')}
              >通过</button>
              <button 
                className={`btn btn-sm ${iv.result === 'failed' ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => updateResult(iv.id, 'failed')}
              >未通过</button>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
