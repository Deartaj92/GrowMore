import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Key,
  User,
  Eye,
  EyeOff,
  Loader2,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { GrowMoreLogo } from '../components/GrowMoreLogo';
import './Login.css';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const studentIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lms-theme');
    const theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputsReady, setInputsReady] = useState(false);

  useEffect(() => {
    setStudentId('');
    setPassword('');
    const frame = requestAnimationFrame(() => setInputsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !password.trim()) {
      setError('Please enter your roll number and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(studentId, password);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatStudentId = (val: string) => {
    let value = val;
    if (value.startsWith('s')) {
      value = 'S' + value.slice(1);
    }
    if (value === '' || /^([Ss]\d*\-?\d*|\d+)$/.test(value)) {
      setStudentId(value);
    }
  };

  const enableInputs = (el: HTMLInputElement) => {
    el.readOnly = false;
    if (el.value && el === studentIdRef.current && !studentId) {
      setStudentId('');
      setPassword('');
      el.value = '';
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow login-bg-glow--1" aria-hidden />
      <div className="login-bg-glow login-bg-glow--2" aria-hidden />

      <div className="login-shell animate-fade-in">
        <header className="login-brand">
          <GrowMoreLogo size="lg" withGlow className="login-brand-logo" alt="GrowMore" />
          <div className="login-brand-text">
            <span className="login-brand-name">GrowMore</span>
            <span className="login-brand-tag">Student Portal</span>
          </div>
        </header>

        <form
          className="login-form-card glass-panel"
          onSubmit={handleSubmit}
          autoComplete="off"
          noValidate
        >
          <div className="login-hero">
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">
              Sign in with your school roll number to open attendance, fees, and academics.
            </p>
          </div>

          <div className="login-features" aria-hidden>
            <span className="login-feature-pill">
              <CalendarCheck size={14} />
              Attendance
            </span>
            <span className="login-feature-pill">
              <CreditCard size={14} />
              Fees
            </span>
            <span className="login-feature-pill">
              <GraduationCap size={14} />
              Academics
            </span>
          </div>

          {error && (
            <div className="login-error-message" role="alert">
              {error}
            </div>
          )}

          <div className="input-group-wrapper">
            <label className="input-label" htmlFor="student-id">
              Student ID / Roll No
            </label>
            <div className="input-field-icon-wrapper login-input-wrap">
              <User size={18} className="input-icon" aria-hidden />
              <input
                ref={studentIdRef}
                type="text"
                id="student-id"
                name="lms_student_roll"
                className="input-field login-input"
                placeholder="e.g. S1-1"
                value={studentId}
                onChange={(e) => formatStudentId(e.target.value)}
                onFocus={(e) => enableInputs(e.currentTarget)}
                readOnly={!inputsReady}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="input-group-wrapper">
            <label className="input-label" htmlFor="password">
              Password
            </label>
            <div className="input-field-icon-wrapper login-input-wrap">
              <Key size={18} className="input-icon" aria-hidden />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="lms_student_password"
                className="input-field login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.readOnly = false;
                }}
                readOnly={!inputsReady}
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden />
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>

          <p className="login-help">
            <HelpCircle size={15} aria-hidden />
            <span>Need help? Contact your school administration.</span>
          </p>
        </form>
      </div>
    </div>
  );
};
