import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
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
          <h1>求职CRM</h1>
          <p>登录你的账号，开始高效求职</p>
        </div>

        {error && <div className="toast toast-error" style={{ marginBottom: 16, animation: 'none', minWidth: 'auto' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用户名 / 邮箱</label>
            <input
              id="login-username"
              className="form-input"
              type="text"
              placeholder="请输入用户名或邮箱"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            id="login-submit"
            className="btn btn-primary btn-lg"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="auth-footer">
          还没有账号？<Link to="/register">立即注册</Link>
        </div>
      </div>
    </div>
  );
}
