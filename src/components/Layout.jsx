import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { path: '/', icon: '📊', label: '工作台' },
    { path: '/companies', icon: '🏢', label: '公司管理' },
    { path: '/interviews', icon: '📅', label: '面试日程' },
    { path: '/templates', icon: '💬', label: '话术模板' },
  ];

  const adminItems = [
    { path: '/admin', icon: '⚙️', label: '系统管理' },
  ];

  const getPageTitle = () => {
    const map = {
      '/': '工作台',
      '/companies': '公司管理',
      '/interviews': '面试日程',
      '/templates': '话术模板',
      '/admin': '系统管理',
    };
    for (const [path, title] of Object.entries(map)) {
      if (location.pathname === path) return title;
    }
    if (location.pathname.startsWith('/companies/')) return '公司详情';
    return '求职CRM';
  };

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🚀</div>
          <h1>求职CRM</h1>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">主菜单</div>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="nav-section-title" style={{ marginTop: 16 }}>管理</div>
              {adminItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role === 'admin' ? '管理员' : '求职者'}</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              title="退出登录"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <h2 className="topbar-title">{getPageTitle()}</h2>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
