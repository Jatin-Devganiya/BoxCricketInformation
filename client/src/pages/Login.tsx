import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Activity, Lock, User as UserIcon, AlertCircle, AlertTriangle, Sun, Moon } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, sessionTerminatedNotice, clearSessionTerminatedNotice } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login(username, password);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    clearSessionTerminatedNotice();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
        <button
          type="button"
          className="btn btn-secondary theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={17} />
              <span className="theme-toggle-text">Light</span>
            </>
          ) : (
            <>
              <Moon size={17} />
              <span className="theme-toggle-text">Dark</span>
            </>
          )}
        </button>
      </div>
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            className="brand-icon"
            style={{ width: '52px', height: '52px', margin: '0 auto 1rem auto' }}
          >
            <Activity size={30} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Cricket Statistics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Box Cricket Information & Scorecard Portal
          </p>
        </div>

        {sessionTerminatedNotice && !error && (
          <div
            className="alert alert-warning"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              background: 'rgba(245, 158, 11, 0.15)',
              borderColor: '#f59e0b',
              color: '#fbbf24',
              marginBottom: '1rem',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>Notice: </strong>
              {sessionTerminatedNotice}
            </div>
          </div>
        )}

        {error && (
          <div
            className="alert alert-danger"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.875rem' }}>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.7rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            Demo Accounts (Click to autofill):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickFill('admin', 'Admin@123')}
            >
              Admin (Full CRUD)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickFill('umpire', 'Umpire@123')}
            >
              Umpire 1 (Owner 1)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickFill('umpire2', 'Umpire2@123')}
            >
              Umpire 2 (Owner 2)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickFill('user', 'User@123')}
            >
              Scorer (Viewer)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
