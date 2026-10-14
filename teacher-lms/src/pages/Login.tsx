import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { useToast } from '../hooks/useToast';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Clock,
  CalendarCheck,
  BookOpenCheck,
  Award,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { GrowMoreLogo } from '../components/GrowMoreLogo';
import './Login.css';

const REMEMBER_KEY = 'growmore_remembered_staff';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState(() => {
    return localStorage.getItem(REMEMBER_KEY) || '';
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useTeacherAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Staff Username, Email, or Mobile Number.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your portal password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, identifier.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      await login(identifier, password);
      showToast('Welcome to GrowMore Faculty Portal!', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err?.message || 'Invalid credentials. Please verify your staff username and password.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teacher-login-page">
      <div className="teacher-login-container">
        {/* LEFT: INSTITUTIONAL SHOWCASE PANEL */}
        <aside className="login-showcase-panel">
          <div className="login-showcase-brand">
            <GrowMoreLogo size="md" withGlow className="login-brand-logo" alt="GrowMore" />
            <div className="login-brand-text">
              <span className="login-brand-title">GrowMore</span>
              <span className="login-brand-badge">
                <ShieldCheck size={12} /> Faculty Portal
              </span>
            </div>
          </div>

          <div className="login-showcase-content">
            <div>
              <h2 className="login-showcase-headline">
                Academic Intelligence & Faculty Workspace
              </h2>
              <p className="login-showcase-sub">
                Institutional educator workspace for class attendance, timetable schedules, homework diaries, and examination registers.
              </p>
            </div>

            <div className="login-features-list">
              <div className="login-feature-item">
                <div className="login-feature-icon-box">
                  <Clock size={16} />
                </div>
                <div className="login-feature-meta">
                  <h4 className="login-feature-title">Dynamic Timetable & Schedule</h4>
                  <p className="login-feature-desc">
                    Daily period breakdown, section assignments, and room allocations.
                  </p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon-box">
                  <CalendarCheck size={16} />
                </div>
                <div className="login-feature-meta">
                  <h4 className="login-feature-title">Attendance & Compliance</h4>
                  <p className="login-feature-desc">
                    Period roll calls, student attendance logs, and leave synchronization.
                  </p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon-box">
                  <BookOpenCheck size={16} />
                </div>
                <div className="login-feature-meta">
                  <h4 className="login-feature-title">Homework & Lesson Diary</h4>
                  <p className="login-feature-desc">
                    Daily class diaries, homework assignments, and review tracking.
                  </p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon-box">
                  <Award size={16} />
                </div>
                <div className="login-feature-meta">
                  <h4 className="login-feature-title">Assessment & Examination</h4>
                  <p className="login-feature-desc">
                    Class tests, quizzes, and official published term exam grading.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-showcase-footer">
            <span className="login-institution-name">
              Al Haram Public School & Iqra Academy
            </span>
            <span className="login-security-tag">
              <ShieldCheck size={12} /> Verified SSO
            </span>
          </div>
        </aside>

        {/* RIGHT: AUTHENTICATION FORM PANEL */}
        <main className="login-form-panel">
          {/* Small screens brand bar */}
          <div className="login-mobile-header">
            <GrowMoreLogo size="sm" withGlow alt="GrowMore" />
            <div className="login-brand-text">
              <span className="login-brand-title" style={{ fontSize: '1.25rem' }}>
                GrowMore
              </span>
              <span className="login-brand-badge">
                <ShieldCheck size={11} /> Faculty Portal
              </span>
            </div>
          </div>

          <div className="login-form-header">
            <h1 className="login-form-title">Faculty Sign In</h1>
            <p className="login-form-subtitle">
              Enter your staff credentials to access your academic dashboard.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="login-error-alert" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="teacher-login-form">
            <div className="form-group">
              <label htmlFor="identifier" className="form-label">
                Staff ID, Username or Mobile
              </label>
              <div className="input-group-container">
                <input
                  id="identifier"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Enter username or registered mobile"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
                <div className="input-icon-box">
                  <User size={16} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-group-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <div className="input-icon-box">
                  <Lock size={16} />
                </div>
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <label className="login-remember-label">
                <input
                  type="checkbox"
                  className="login-remember-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember username</span>
              </label>

              <span className="login-help-link" title="Contact School IT Administrator">
                Forgot password? Contact IT
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Faculty Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="login-footer-security">
            <ShieldCheck size={12} />
            <span>Protected by Institutional 256-bit Encryption</span>
          </div>

          <a href="/index.html" className="login-portal-back-link">
            <ArrowLeft size={13} />
            <span>Return to GrowMore Main Portal</span>
          </a>
        </main>
      </div>
    </div>
  );
};
