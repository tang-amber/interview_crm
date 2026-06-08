import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { companiesAPI, interactionsAPI, interviewsAPI, templatesAPI } from '../api';
import { readClipboard, writeClipboard, renderTemplate, formatDateTime } from '../utils/clipboard';
import { ALL_STATUSES, STATUS_COLORS, INTERVIEW_ROUNDS, INTERVIEW_FORMATS, TEMPLATE_CATEGORIES } from '../utils/constants';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [noteContent, setNoteContent] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    round: '初试', interview_time: '', format: '线下面试', location: '', notes: ''
  });

  const fetchData = async () => {
    try {
      const [compData, tplData] = await Promise.all([
        companiesAPI.get(id),
        templatesAPI.list()
      ]);
      setCompany(compData);
      setTemplates(tplData.templates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await companiesAPI.updateStatus(id, newStatus);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const addInteraction = async (content, type = 'note') => {
    if (!content.trim()) return;
    try {
      await interactionsAPI.create(id, { content, type });
      setNoteContent('');
      fetchData();
    } catch (err) { console.error(err); }
  };

  const deleteInteraction = async (interactionId) => {
    if (!confirm('确定删除这条记录吗？')) return;
    try {
      await interactionsAPI.delete(interactionId);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleClipboardImport = async () => {
    const { success, text, error } = await readClipboard();
    if (success && text) {
      addInteraction(text, 'hr_reply');
    } else {
      alert(error || '未读取到内容');
    }
  };

  const useTemplate = async (tpl) => {
    const content = renderTemplate(tpl.content, {
      name: company.contact_person,
      position: company.position || '该'
    });
    const { success } = await writeClipboard(content);
    if (success) {
      addInteraction(`使用模板发送：\n${content}`, 'my_message');
      // alert('已复制到剪切板，可直接去沟通软件粘贴发送！');
    } else {
      alert('复制失败，请手动复制');
    }
  };

  const handleAddInterview = async (e) => {
    e.preventDefault();
    try {
      await interviewsAPI.create(id, interviewForm);
      setShowInterviewForm(false);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (error) return <div className="empty-state"><h3>加载失败</h3><p>{error}</p><button className="btn btn-primary" onClick={() => navigate('/companies')}>返回列表</button></div>;
  if (!company) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>

      {/* Left Column: Timeline & Interactions */}
      <div>
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <h2 className="card-title" style={{ fontSize: '1.5rem', marginBottom: 4 }}>{company.company_name}</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                👤 {company.contact_person} · 📱 {company.channel}
                {company.position && ` · 💼 ${company.position}`}
              </div>
            </div>
            <select
              className="form-select"
              value={company.status}
              onChange={e => handleStatusChange(e.target.value)}
              style={{
                width: 'auto', minWidth: 140, fontWeight: 600,
                background: `${STATUS_COLORS[company.status]}15`,
                color: STATUS_COLORS[company.status],
                borderColor: `${STATUS_COLORS[company.status]}40`
              }}
            >
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-accent" onClick={handleClipboardImport}>
              📋 一键读取HR回复 (剪切板)
            </button>
            <button className="btn btn-primary" onClick={() => setShowInterviewForm(true)}>
              📅 安排面试
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">沟通时间轴 ({company.interaction_count})</h3>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input
              className="form-input"
              placeholder="添加跟进备注..."
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInteraction(noteContent, 'note')}
            />
            <button className="btn btn-primary" onClick={() => addInteraction(noteContent, 'note')}>提交</button>
          </div>

          {company.interactions?.length > 0 ? (
            <div className="timeline">
              {company.interactions.map((it, i) => (
                <div key={it.id} className="timeline-item" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className={`timeline-dot ${it.type.replace('_', '-')}`} />
                  <div className="timeline-content">
                    <div className="timeline-meta">
                      <span className="timeline-time">{formatDateTime(it.created_at)}</span>
                      <span className="timeline-type">
                        {it.type === 'note' ? '📝 备注' :
                          it.type === 'hr_reply' ? '🏢 HR回复' :
                            it.type === 'my_message' ? '💬 我的消息' : '导入'}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0 4px', height: 'auto', marginLeft: 'auto' }}
                        onClick={() => deleteInteraction(it.id)}
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                    <div className="timeline-text">{it.content}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px 0' }}>暂无沟通记录</div>
          )}
        </div>
      </div>

      {/* Right Column: Info & Templates & Interviews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>基础信息</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem' }}>
            {company.salary_range && <div><span style={{ color: 'var(--text-muted)' }}>标称薪资：</span>{company.salary_range}</div>}
            {company.work_location && <div><span style={{ color: 'var(--text-muted)' }}>工作地点：</span>{company.work_location}</div>}
            {company.commute_time && <div><span style={{ color: 'var(--text-muted)' }}>通勤时间：</span>{company.commute_time}</div>}
            {company.resume_version && <div><span style={{ color: 'var(--text-muted)' }}>投递简历：</span>{company.resume_version}</div>}
            {company.tags?.length > 0 && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>标签：</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {company.tags.map(t => <span key={t} className="tag tag-blue">{t}</span>)}
                </div>
              </div>
            )}
            {company.notes && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>备注：</span>
                <div style={{ color: 'var(--text-secondary)' }}>{company.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>快捷回复</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="form-select"
                style={{ flex: 1 }}
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
              >
                <option value="">-- 选择话术模板 --</option>
                {Object.entries(TEMPLATE_CATEGORIES).map(([catKey, catLabel]) => {
                  const catTpls = templates.filter(t => t.category === catKey);
                  if (catTpls.length === 0) return null;
                  return (
                    <optgroup key={catKey} label={catLabel}>
                      {catTpls.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.is_system ? '🔹' : '🔸'} {tpl.title}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <button
                className="btn btn-primary"
                disabled={!selectedTemplateId}
                onClick={() => {
                  const tpl = templates.find(t => t.id.toString() === selectedTemplateId.toString());
                  if (tpl) useTemplate(tpl);
                }}
              >
                复制使用
              </button>
            </div>
            {selectedTemplateId && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                {templates.find(t => t.id.toString() === selectedTemplateId.toString())?.content}
              </div>
            )}
          </div>
        </div>

        {company.interviews?.length > 0 && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>面试记录</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {company.interviews.map(iv => (
                <div key={iv.id} style={{
                  padding: 12, background: 'var(--bg-elevated)',
                  borderRadius: 8, borderLeft: `3px solid ${iv.result === 'passed' ? 'var(--success)' : iv.result === 'failed' ? 'var(--danger)' : 'var(--warning)'}`
                }}>
                  <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{iv.round}</span>
                    <span style={{ fontSize: '0.8rem', color: iv.result === 'passed' ? 'var(--success)' : iv.result === 'failed' ? 'var(--danger)' : 'var(--warning)' }}>
                      {iv.result === 'passed' ? '通过' : iv.result === 'failed' ? '未通过' : '待面'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    <div>时间：{formatDateTime(iv.interview_time)}</div>
                    <div>形式：{iv.format}</div>
                    {iv.location && <div>地点：{iv.location}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Add Interview Modal */}
      {showInterviewForm && (
        <div className="modal-overlay" onClick={() => setShowInterviewForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">安排面试</h3>
              <button className="modal-close" onClick={() => setShowInterviewForm(false)}>×</button>
            </div>
            <form onSubmit={handleAddInterview}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">面试轮次 *</label>
                    <select className="form-select" value={interviewForm.round} onChange={e => setInterviewForm({ ...interviewForm, round: e.target.value })}>
                      {INTERVIEW_ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">面试时间 *</label>
                    <input className="form-input" type="datetime-local" value={interviewForm.interview_time} onChange={e => setInterviewForm({ ...interviewForm, interview_time: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">面试形式</label>
                  <select className="form-select" value={interviewForm.format} onChange={e => setInterviewForm({ ...interviewForm, format: e.target.value })}>
                    {INTERVIEW_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">地点/会议链接</label>
                  <input className="form-input" value={interviewForm.location} onChange={e => setInterviewForm({ ...interviewForm, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">备注</label>
                  <textarea className="form-textarea" value={interviewForm.notes} onChange={e => setInterviewForm({ ...interviewForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInterviewForm(false)}>取消</button>
                <button type="submit" className="btn btn-primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
