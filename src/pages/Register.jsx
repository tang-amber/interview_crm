import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    if (form.password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🚀</div>
          <h1>创建账号</h1>
          <p>加入求职CRM，科学管理你的求职之旅</p>
        </div>

        {error && <div className="toast toast-error" style={{ marginBottom: 16, animation: 'none', minWidth: 'auto' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              id="register-username"
              className="form-input"
              type="text"
              placeholder="请输入用户名"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              id="register-email"
              className="form-input"
              type="email"
              placeholder="请输入邮箱"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              id="register-password"
              className="form-input"
              type="password"
              placeholder="至少6位密码"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              id="register-confirm-password"
              className="form-input"
              type="password"
              placeholder="再次输入密码"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>
          <button
            id="register-submit"
            className="btn btn-primary btn-lg"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  );
}
