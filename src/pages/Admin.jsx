import { useState, useEffect } from 'react';
import { adminAPI } from '../api';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        adminAPI.users(),
        adminAPI.stats()
      ]);
      setUsers(usersData.users || []);
      setStats(statsData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleBan = async (id, e) => {
    e.stopPropagation();
    try {
      await adminAPI.toggleBan(id);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card purple">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats?.totalUsers || 0}</div>
          <div className="stat-label">总注册用户</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon">🏢</div>
          <div className="stat-value">{stats?.totalCompanies || 0}</div>
          <div className="stat-label">总公司记录</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">💬</div>
          <div className="stat-value">{stats?.totalInteractions || 0}</div>
          <div className="stat-label">总沟通记录</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats?.totalInterviews || 0}</div>
          <div className="stat-label">总面试记录</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <button 
              className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('users')}
            >用户管理</button>
            <button className="btn btn-ghost" disabled>系统标签管理 (规划中)</button>
            <button className="btn btn-ghost" disabled>系统模板管理 (规划中)</button>
          </div>
        </div>

        {activeTab === 'users' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>数据量</th>
                  <th>注册时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>{u.email}</td>
                    <td><span className={`tag ${u.role === 'admin' ? 'tag-purple' : 'tag-gray'}`}>{u.role}</span></td>
                    <td>{u.company_count} 家公司</td>
                    <td>{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                    <td>
                      {u.is_banned ? <span className="tag tag-red">已封禁</span> : <span className="tag tag-green">正常</span>}
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button 
                          className={`btn btn-sm ${u.is_banned ? 'btn-success' : 'btn-danger'}`}
                          onClick={(e) => handleToggleBan(u.id, e)}
                        >
                          {u.is_banned ? '解封' : '封禁'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
