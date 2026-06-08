import { useState, useEffect } from 'react';
import { templatesAPI } from '../api';
import { TEMPLATE_CATEGORIES } from '../utils/constants';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'greeting' });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await templatesAPI.list();
      setTemplates(data.templates || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ title: '', content: '', category: 'greeting' });
    setShowForm(true);
  };

  const openEdit = (tpl) => {
    setEditingTemplate(tpl);
    setForm({ title: tpl.title, content: tpl.content, category: tpl.category });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await templatesAPI.update(editingTemplate.id, form);
      } else {
        await templatesAPI.create(form);
      }
      setShowForm(false);
      fetchTemplates();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此模板吗？')) return;
    try {
      await templatesAPI.delete(id);
      fetchTemplates();
    } catch (err) { alert(err.message); }
  };

  // Group templates by category
  const grouped = templates.reduce((acc, tpl) => {
    if (!acc[tpl.category]) acc[tpl.category] = [];
    acc[tpl.category].push(tpl);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>话术模板</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            支持变量：<code style={{ background: 'var(--bg-elevated)', padding: '2px 4px', borderRadius: 4 }}>{'{name}'}</code> 沟通人, 
            <code style={{ background: 'var(--bg-elevated)', padding: '2px 4px', borderRadius: 4, marginLeft: 4 }}>{'{position}'}</code> 岗位名称
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>＋ 新增模板</button>
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {Object.entries(TEMPLATE_CATEGORIES).map(([catKey, catLabel]) => (
            <div key={catKey}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                {catLabel}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {grouped[catKey]?.map(tpl => (
                  <div key={tpl.id} className="card stagger-item" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {tpl.is_system && <span className="tag tag-cyan" style={{ fontSize: '0.65rem' }}>系统</span>}
                        {tpl.title}
                      </strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {!tpl.is_system && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tpl)}>✏️</button>}
                        {!tpl.is_system && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(tpl.id)}>🗑️</button>}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', 
                      padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' 
                    }}>
                      {tpl.content}
                    </div>
                  </div>
                ))}
                {(!grouped[catKey] || grouped[catKey].length === 0) && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>无模板</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTemplate ? '编辑模板' : '新增模板'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">标题 *</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">分类</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">模板内容 *</label>
                  <textarea 
                    className="form-textarea" 
                    style={{ minHeight: 120 }}
                    value={form.content} 
                    onChange={e => setForm({...form, content: e.target.value})} 
                    placeholder="使用 {name} 代替对方称呼，{position} 代替岗位名称..."
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
