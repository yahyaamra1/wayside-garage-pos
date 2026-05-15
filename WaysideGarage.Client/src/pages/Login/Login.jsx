import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SpeedometerLoader from './SpeedometerLoader';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(username, password);
      if (res?.success) {
        localStorage.setItem('wg_token', res.data.token);
        localStorage.setItem('wg_user', JSON.stringify(res.data.user));
        setTimeout(() => navigate('/pos'), 2800);
        return; // keep loading=true so speedometer stays until navigation
      }
      setError(res?.error ?? 'Login failed.');
    } catch {
      setError('Cannot connect to server.');
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      {loading && <SpeedometerLoader />}
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.jpg" alt="Wayside Garage" className="login-logo-img" />
        </div>

        <div className="login-form-wrap">
          <p className="login-tagline">Your Pit Stop for Every Part &mdash; <span>Trusted Since 1957</span></p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                required
                autoComplete="username"
              />
            </div>
            <div className="login-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              Sign In
            </button>
          </form>

          <p className="login-footer">Wayside Garage POS &nbsp;·&nbsp; Internal Use Only</p>
        </div>
      </div>
    </div>
  );
}
