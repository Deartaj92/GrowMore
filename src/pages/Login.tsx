import React, { useState, useEffect } from 'react';
import styled, { ThemeProvider, useTheme } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/useToast';
import { Visibility, VisibilityOff, School as SchoolIcon, DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Mac-style window controls (copied from Layout.tsx)
const MacWindowControls = styled.div`
  display: flex;
  gap: 11px;
  margin-left: 16px;
  height: 28px;
  align-items: center;
  -webkit-app-region: no-drag;
`;
const MacButton = styled.button<{ color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: box-shadow 0.18s, background 0.18s;
  box-shadow: 0 1px 2px #0002;
  outline: none;
  &:hover { filter: brightness(1.1); }
  &:focus { outline: none; }
  &:active { filter: brightness(0.95); }
`;
const MacIcon = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #222c;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s;
  ${MacButton}:hover & { opacity: 1; }
`;
function MacWindowControlsComponent() {
  const [isMaximized, setIsMaximized] = React.useState(false);
  React.useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);
  const handleMinimize = () => { if (window.electronAPI) window.electronAPI.minimize(); };
  const handleMaximize = () => { if (window.electronAPI) { if (isMaximized) window.electronAPI.unmaximize(); else window.electronAPI.maximize(); } };
  const handleClose = () => { if (window.electronAPI) window.electronAPI.close(); };
  return (
    <MacWindowControls>
      <MacButton color="#ffbd2e" aria-label="Minimize" title="Minimize" onClick={handleMinimize}><MacIcon>&#8211;</MacIcon></MacButton>
      <MacButton color="#27c93f" aria-label={isMaximized ? 'Restore' : 'Maximize'} title={isMaximized ? 'Restore' : 'Maximize'} onClick={handleMaximize}><MacIcon>{isMaximized ? <>&#9633;</> : <>&#9723;</>}</MacIcon></MacButton>
      <MacButton color="#ff5f56" aria-label="Close" title="Close" onClick={handleClose}><MacIcon>&#10005;</MacIcon></MacButton>
    </MacWindowControls>
  );
}

// Theme objects (copied from Layout.tsx)
const darkTheme = {
  BG: '#252525',
  CARD: '#2a2a2a',
  ACCENT: '#4a6cf7',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#e0e0e0',
  TEXT_SECONDARY: '#b0b8d1',
  BORDER: 'rgba(255, 255, 255, 0.05)',
  HOVER_BG: 'rgba(74, 108, 247, 0.18)',
  FIELD_BG: '#252525',
  FIELD_BORDER: '#3a3f4b',
  ACCENT_INPUT: '#4a6cf7',
};
const lightTheme = {
  BG: '#f5f7fa',
  CARD: '#ffffff',
  ACCENT: '#4a6cf7',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#1a1a1a',
  TEXT_SECONDARY: '#666666',
  BORDER: 'rgba(0, 0, 0, 0.05)',
  HOVER_BG: 'rgba(74, 108, 247, 0.15)',
  FIELD_BG: '#f7faff',
  FIELD_BORDER: '#b6c2d9',
  ACCENT_INPUT: '#4a6cf7',
};

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.BG};
`;
const TopRightControls = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px 0 0;
`;
const ThemeToggle = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => theme.CARD};
  box-shadow: ${({ theme }) => theme.SHADOW};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    color: ${({ theme }) => theme.ACCENT};
    transform: scale(1.05);
    box-shadow: ${({ theme }) => `0 2px 8px ${theme.ACCENT}33`};
  }
`;
const LoginCard = styled.form`
  background: ${({ theme }) => theme.CARD};
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  border-radius: 14px;
  padding: 2.2rem 2rem 1.7rem 2rem;
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
  max-width: 410px;
  align-items: stretch;
`;
const Logo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin-bottom: 8px;
  user-select: none;
  text-align: center;
  svg { color: ${({ theme }) => theme.ACCENT}; font-size: 32px; }
`;
const Title = styled.h2`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.45rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-align: center;
`;
const Label = styled.label`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  margin-bottom: 0.1rem;
`;
const InputGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  padding: 0 12px;
  transition: border 0.18s;
  &:focus-within { border-color: ${({ theme }) => theme.ACCENT_INPUT}; }
`;
const Input = styled.input`
  border: none;
  background: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.08rem;
  padding: 13px 0;
  width: 100%;
  &:focus { outline: none; }
`;
const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.ACCENT};
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
`;
const Button = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 13px 0;
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.18s;
  width: 100%;
  box-shadow: 0 2px 8px #6366f122;
  &:hover { background: #4f46e5; }
`;
const ErrorMsg = styled.div`
  color: #ef4444;
  font-size: 1rem;
  text-align: center;
  margin-top: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fff8f8'};
  border-radius: 8px;
  padding: 7px 0 5px 0;
`;

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { signIn } = useAuth();
  const [themeMode, setThemeMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });
  const [isMobile, setIsMobile] = useState(false);
  const themeObj = themeMode === 'dark' ? darkTheme : lightTheme;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleThemeToggle = () => {
    setThemeMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(username, password);
      toast.showToast('Login successful', 'success');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={themeObj}>
      <Container>
        <TopRightControls>
          <ThemeToggle onClick={handleThemeToggle} aria-label="Toggle theme">
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </ThemeToggle>
          {!isMobile && <MacWindowControlsComponent />}
        </TopRightControls>
        <LoginCard onSubmit={handleSubmit}>
          <Logo>
            <SchoolIcon />
            <div>Welcome to <span style={{ color: '#ff6b35' }}>GROW</span> <span style={{ color: '#4a6cf7' }}>MORE</span>!</div>
          </Logo>
          <Title>Sign In</Title>
          <Label htmlFor="username">Username</Label>
          <InputGroup>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              autoComplete="username"
              required
              placeholder="Enter your username"
            />
          </InputGroup>
          <Label htmlFor="password">Password</Label>
          <InputGroup>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
            />
            <ToggleButton type="button" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </ToggleButton>
          </InputGroup>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
        </LoginCard>
    </Container>
    </ThemeProvider>
  );
};

export default Login; 