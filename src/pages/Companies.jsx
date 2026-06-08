import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { companiesAPI, tagsAPI } from '../api';
import { ALL_STATUSES, STATUS_COLORS, STATUS_ICONS, CHANNELS } from '../utils/constants';

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', channel: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState({
    company_name: '', channel: 'Boss', contact_person: '',
    status: '打招呼', position: '软件测试工程师', salary_range: '',
    work_location: '', commute_time: '', resume_version: '',
    tags: [], notes: ''
  });
  const [formError, setFormError] = useState('');

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.channel) params.channel = filters.channel;
      if (filters.search) params.search = filters.search;
      const data = await companiesAPI.list(params);
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, [page, filters]);

  useEffect(() => {
    tagsAPI.list().then(d => setTags(d.tags || [])).catch(console.error);
  }, []);

  const openCreate = () => {
    setEditingCompany(null);
    setForm({
      company_name: '', channel: 'Boss', contact_person: '',
      status: '打招呼', position: '软件测试工程师', salary_range: '',
      work_location: '', commute_time: '', resume_version: '',
      tags: [], notes: ''
    });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (c, e) => {
    e.stopPropagation();
    setEditingCompany(c);
    setForm({
      company_name: c.company_name, channel: c.channel, contact_person: c.contact_person,
      status: c.status, position: c.position || '软件测试工程师', salary_range: c.salary_range || '',
      work_location: c.work_location || '', commute_time: c.commute_time || '',
      resume_version: c.resume_version || '', tags: c.tags || [], notes: c.notes || ''
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.company_name || !form.channel || !form.contact_person) {
      setFormError('请填写公司名称、沟通渠道和沟通人');
      return;
    }
    try {
      if (editingCompany) {
        await companiesAPI.update(editingCompany.id, form);
      } else {
        await companiesAPI.create(form);
      }
      setShowForm(false);
      fetchCompanies();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('确定删除这条记录吗？')) return;
    try {
      await companiesAPI.delete(id);
      fetchCompanies();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id, newStatus, e) => {
    e.stopPropagation();
    try {
      await companiesAPI.updateStatus(id, newStatus);
      fetchCompanies();
    } catch (err) { console.error(err); }
  };

  const toggleTag = (tagName) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName) ? prev.tags.filter(t => t !== tagName) : [...prev.tags, tagName]
    }));
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="animate-fade-in">
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="search-company"
            className="form-input"
            placeholder="搜索公司名 / 沟通人..."
            value={filters.search}
            onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          />
        </div>
        <select
          id="filter-status"
          className="form-select"
          value={filters.status}
          onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
        >
          <option value="">全部状态</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_ICONS[s]} {s}</option>)}
        </select>
        <select
          id="filter-channel"
          className="form-select"
          value={filters.channel}
          onChange={e => { setFilters({ ...filters, channel: e.target.value }); setPage(1); }}
        >
          <option value="">全部渠道</option>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button id="btn-add-company" className="btn btn-primary" onClick={openCreate}>
          ＋ 新增记录
        </button>
      </div>

      {/* Company List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : companies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <h3>暂无公司记录</h3>
          <p>点击"新增记录"开始你的求职之旅</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>＋ 新增记录</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            共 {total} 条记录
          </div>
          {companies.map((c, i) => (
            <div
              key={c.id}
              className="company-card stagger-item"
              onClick={() => navigate(`/companies/${c.id}`)}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="company-card-header">
                <div>
                  <div className="company-name">{c.company_name}</div>
                  <div className="company-meta">
                    <span className="company-meta-item">👤 {c.contact_person}</span>
                    <span className="company-meta-item">📱 {c.channel}</span>
                    {c.position && <span className="company-meta-item">💼 {c.position}</span>}
                    {c.salary_range && <span className="company-meta-item">💰 {c.salary_range}</span>}
                    <span className="company-meta-item">💬 {c.interaction_count}次沟通</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    className="form-select"
                    value={c.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => handleStatusChange(c.id, e.target.value, e)}
                    style={{
                      width: 'auto', minWidth: 120, fontSize: '0.8rem', padding: '4px 28px 4px 10px',
                      background: `${STATUS_COLORS[c.status]}15`,
                      borderColor: `${STATUS_COLORS[c.status]}40`,
                      color: STATUS_COLORS[c.status]
                    }}
                  >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_ICONS[s]} {s}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={e => openEdit(c, e)} title="编辑">✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={e => handleDelete(c.id, e)} title="删除">🗑️</button>
                </div>
              </div>
              {c.tags?.length > 0 && (
                <div className="company-tags">
                  {c.tags.map(t => (
                    <span key={t} className="tag tag-blue">{t}</span>
                  ))}
                </div>
              )}
              {c.next_interview && (
                <div style={{
                  marginTop: 8, padding: '6px 12px', background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 8, fontSize: '0.8rem', color: 'var(--warning)',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  📅 即将面试：{c.next_interview.round} - {new Date(c.next_interview.interview_time).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          ))}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`pagination-btn ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCompany ? '编辑公司记录' : '新增公司记录'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="toast toast-error" style={{ marginBottom: 16, animation: 'none', minWidth: 'auto' }}>{formError}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">公司名称 *</label>
                    <input className="form-input" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="如：腾讯科技" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">沟通人 *</label>
                    <input className="form-input" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="如：张三-HR" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">沟通渠道 *</label>
                    <select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                      {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">状态</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">岗位名称</label>
                    <input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">标称薪资</label>
                    <input className="form-input" value={form.salary_range} onChange={e => setForm({ ...form, salary_range: e.target.value })} placeholder="如：10-15k" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">工作地点</label>
                    <input className="form-input" value={form.work_location} onChange={e => setForm({ ...form, work_location: e.target.value })} placeholder="如：深圳南山" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">通勤时间</label>
                    <input className="form-input" value={form.commute_time} onChange={e => setForm({ ...form, commute_time: e.target.value })} placeholder="如：30分钟" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">投递简历版本</label>
                  <input className="form-input" value={form.resume_version} onChange={e => setForm({ ...form, resume_version: e.target.value })} placeholder="如：v3-测试专版" />
                </div>
                <div className="form-group">
                  <label className="form-label">标签</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tags.map(t => (
                      <span
                        key={t.id}
                        className={`tag ${form.tags.includes(t.name) ? 'tag-blue' : 'tag-gray'} tag-removable`}
                        onClick={() => toggleTag(t.name)}
                        style={{ cursor: 'pointer' }}
                      >
                        {form.tags.includes(t.name) ? '✓ ' : ''}{t.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">备注</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="其他备注信息..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editingCompany ? '保存修改' : '创建记录'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
