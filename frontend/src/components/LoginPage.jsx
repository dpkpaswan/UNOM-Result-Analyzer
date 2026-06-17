import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    const result = await login(username.trim(), password.trim());
    if (!result.success) {
      setError(result.error || 'Invalid username or password');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />

        <div className="login-card">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="4" width="32" height="32" rx="8" stroke="url(#lg)" strokeWidth="2.5" fill="none"/>
                <path d="M14 20h12M20 14v12" stroke="url(#lg)" strokeWidth="2.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#818cf8"/>
                    <stop offset="1" stopColor="#c084fc"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="app-title">UNOM Result Analyzer</h1>
            <p className="app-subtitle">Sign in to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-username" className="input-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM8 9a5 5 0 00-5 5h10a5 5 0 00-5-5z" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Username
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="input-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="7" rx="2" stroke="#818cf8" strokeWidth="1.5"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="start-btn"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10h11m0 0l-4-4m4 4l-4 4M14 3h2a2 2 0 012 2v10a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="login-footer">Contact your administrator for credentials</p>
        </div>
      </div>
    </div>
  );
}
