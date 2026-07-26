import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { ThemeProvider, useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { supabase, setAuthContext } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { broadcastStudentSessionChange } from '../utils/studentSessionEvents';
import { pushNotificationService } from '../services/pushNotificationService';
import { hasPermission } from '../services/permissionService';
import { Visibility, VisibilityOff, School as SchoolIcon, DarkMode as DarkModeIcon, LightMode as LightModeIcon, FamilyRestroom, Person } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import {
  clayCardStyle,
  clayButtonStyle,
  neumorphFieldStyle,
  getFieldPalette,
  getLayoutPalette,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD,
} from '../styles/DesignSystem';

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


const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.BG};
  padding: 1rem;

  @media (max-width: 768px) {
    padding: 1rem 0.5rem;
    align-items: center;
  }

  @media (max-width: 480px) {
    padding: 1rem 0.75rem;
    align-items: center;
  }
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
  ${clayCardStyle}
  padding: 2.2rem 2rem 1.7rem 2rem;
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
  max-width: 410px;
  align-items: stretch;

  @media (max-width: 768px) {
    padding: 1.8rem 1.5rem 1.5rem 1.5rem;
    margin-left: 1rem;
    margin-right: 1rem;
    max-width: calc(100% - 2rem);
    width: calc(100% - 2rem);
  }

  @media (max-width: 480px) {
    padding: 1.5rem 1.2rem 1.2rem 1.2rem;
    margin-left: 0.75rem;
    margin-right: 0.75rem;
    max-width: calc(100% - 1.5rem);
    width: calc(100% - 1.5rem);
  }
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
  border-radius: ${CARD_RADIUS_MD};
  padding: 0 12px;
  transition: all 0.18s;
  &:focus-within {
    /* The focus state is handled by the neumorphFieldStyle */
  }
`;
const Input = styled.input`
  ${neumorphFieldStyle}
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.08rem;
  padding: 13px 12px;
  width: 100%;
  
  /* Override neumorphFieldStyle padding if needed */
  & {
    padding: 13px 12px;
  }
  
  /* Prevent autofill from changing theme style */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px ${({ theme }) => getFieldPalette(theme).bg} inset !important;
    -webkit-text-fill-color: ${({ theme }) => theme.TEXT_PRIMARY} !important;
    caret-color: ${({ theme }) => theme.TEXT_PRIMARY} !important;
    transition: background-color 5000s ease-in-out 0s;
  }
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
const Button = styled.button.attrs({ $variant: 'primary' })`
  ${clayButtonStyle}
  border-radius: ${CARD_RADIUS_MD};
  padding: 13px 0;
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  width: 100%;
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

const LoginModeSwitch = styled.div`
  display: flex;
  gap: 2px;
  margin-bottom: 16px;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border-radius: ${CARD_RADIUS_LG};
  padding: 4px;
  position: relative;
  border: 1.5px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
`;

const SwitchOption = styled.button<{ $active: boolean }>`
  ${clayButtonStyle}
  flex: 1;
  border-radius: ${CARD_RADIUS_MD};
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  cursor: pointer;
  position: relative;
  z-index: 1;
  
  /* Use variant based on active state */
  ${({ $active }) => $active ? `
    $variant: 'primary';
  ` : `
    $variant: 'secondary';
  `}
  
  &:active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.9rem;
  }
`;

const SwitchLabel = styled.span`
  display: block;
  white-space: nowrap;
`;

const Login: React.FC = () => {
  const [loginMode, setLoginMode] = useState<'staff' | 'parent' | 'student' | null>(null);
  const [username, setUsername] = useState('');
  const [studentId, setStudentId] = useState('');
  const [familyId, setFamilyId] = useState('');
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

  // Lock mode during submission to prevent switching
  const loginModeRef = useRef<'staff' | 'parent' | 'student' | null>(null);
  loginModeRef.current = loginMode;

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

  // Handle mode switching with field clearing
  const handleModeSwitch = (mode: 'staff' | 'parent' | 'student') => {
    if (loading) return; // Prevent switching during submission
    
    if (mode === 'student') {
      setLoginMode(mode);
      // Short delay for UI to update before redirecting
      setTimeout(() => {
        if ((window as any).electronAPI) {
          // In electron, find the root path and append
          const currentUrl = window.location.href;
          const rootPath = currentUrl.split('index.html')[0];
          window.location.href = rootPath + 'student-portal/index.html';
        } else {
          window.location.href = '/student-portal/index.html';
        }
      }, 100);
      return;
    }

    setLoginMode(mode);
    setError('');
    // Clear form fields when switching modes
    setUsername('');
    setStudentId('');
    setFamilyId('');
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Use ref to get the current mode (locked during submission)
    const currentMode = loginModeRef.current;

    // Validate that a mode is selected
    if (!currentMode) {
      setError('Please select a login type (Staff, Parent, or Student).');
      return;
    }

    // Validate fields based on mode
    if (currentMode === 'staff') {
      if (!username.trim()) {
        setError('Please enter your username.');
        return;
      }
      if (!password.trim()) {
        setError('Please enter your password.');
        return;
      }
    } else if (currentMode === 'parent') {
      if (!familyId.trim()) {
        setError('Please enter your Family ID.');
        return;
      }
      if (!password.trim()) {
        setError('Please enter your password.');
        return;
      }
    } else {
      if (!studentId.trim()) {
        setError('Please enter your Student ID.');
        return;
      }
      if (!password.trim()) {
        setError('Please enter your password.');
        return;
      }
    }

    setLoading(true);
    try {
      if (currentMode === 'staff') {
        // Clear any existing student/parent session when staff logs in
        localStorage.removeItem('studentSession');
        localStorage.removeItem('parentSession');
        const staffUser = await signIn(username, password);
        // OPTIMIZED: Make push notification rehydration non-blocking (fire and forget)
        if (staffUser?.staff_id && staffUser?.school_id) {
          pushNotificationService.rehydrateStoredToken(staffUser.staff_id, staffUser.school_id, 'staff').catch(() => {
            // Silently fail - push notifications are not critical for login
          });
        }

        // Check dashboard permission before redirecting (regardless of previous page)
        let hasDashboardPerm = false;
        if (
          staffUser?.is_super_admin ||
          staffUser?.role === 'Super Admin' ||
          staffUser?.role === 'School Admin' ||
          staffUser?.role === 'school_admin'
        ) {
          hasDashboardPerm = true;
        } else if (staffUser?.id && staffUser?.school_id) {
          hasDashboardPerm = await hasPermission(staffUser.id, 'dashboard', staffUser.school_id);
        }

        if (hasDashboardPerm) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/user', { replace: true });
        }
        return;
      } else if (currentMode === 'parent') {
        // Parent authentication: lookup by family id and password
        let familyLookup = null;
        if (!isNaN(Number(familyId))) {
          const { data: family, error: familyError } = await supabase
            .from('families')
            .select('*')
            .eq('id', familyId)
            .single();

          familyLookup = { data: family, error: familyError };
        }

        if (!familyLookup || familyLookup.error || !familyLookup.data) {
          setError('Family not found. Please check your Family ID.');
          setLoading(false);
          return;
        }

        const family = familyLookup.data;
        // Check password logic, fallback to 'aa' if empty/null
        const passToCheck = family.password || 'aa';
        if (password !== passToCheck) {
          setError('Incorrect password.');
          setLoading(false);
          return;
        }

        // Clear any existing student/staff session when parent logs in
        localStorage.removeItem('studentSession');

        // Store parent session info
        localStorage.setItem('parentSession', JSON.stringify({
          id: family.id,
          name: family.name,
          school_id: family.school_id,
          isParent: true
        }));

        // Redirect to landing page
        navigate('/home', { replace: true });
        return;
      } else {
        // Student authentication: lookup by roll_number (e.g., "S1-1") or id
        // OPTIMIZED: Try all lookup methods in parallel for faster response
        const trimmedId = studentId.trim();
        const normalizedId = trimmedId.toUpperCase();
        const isNumeric = !isNaN(Number(trimmedId));
        
        // Extract sequence number if possible
        const rollNumberMatch = normalizedId.match(/^[Ss]?\d+\-(\d+)$/);
        const pureNumberMatch = normalizedId.match(/^(\d+)$/);
        const sequenceNum = rollNumberMatch?.[1] || pureNumberMatch?.[1] || null;

        // OPTIMIZED: Run all possible queries in parallel
        const queries = [
          // Try exact roll_number match
          Promise.resolve(
            supabase
              .from('students')
              .select('*')
              .eq('roll_number', normalizedId)
              .single()
          )
            .then(result => ({ type: 'roll_number', ...result }))
            .catch(() => ({ type: 'roll_number', data: null, error: null })),
          
          // Try by sequence if we have one
          sequenceNum
            ? Promise.resolve(
                supabase
                  .from('students')
                  .select('*')
                  .like('roll_number', `%-${sequenceNum}`)
                  .limit(10)
              )
                .then(result => ({ type: 'sequence', ...result }))
                .catch(() => ({ type: 'sequence', data: null, error: null }))
            : Promise.resolve({ type: 'sequence', data: null, error: null }),
          
          // Try by numeric ID if input is numeric
          isNumeric
            ? Promise.resolve(
                supabase
                  .from('students')
                  .select('*')
                  .eq('id', parseInt(trimmedId))
                  .single()
              )
                .then(result => ({ type: 'id', ...result }))
                .catch(() => ({ type: 'id', data: null, error: null }))
            : Promise.resolve({ type: 'id', data: null, error: null })
        ];

        const results = await Promise.all(queries);
        
        // Find the first successful result in priority order
        let studentLookup = null;
        for (const result of results) {
          if (result.data && !result.error) {
            // For sequence results, find exact match
            if (result.type === 'sequence' && Array.isArray(result.data) && sequenceNum) {
              const exactMatch = result.data.find((s: any) => {
                const seq = s.roll_number?.match(/-(\d+)$/)?.[1];
                return seq === sequenceNum;
              });
              if (exactMatch) {
                studentLookup = { data: exactMatch, error: null };
                break;
              } else if (result.data.length > 0) {
                studentLookup = { data: result.data[0], error: null };
                break;
              }
            } else {
              studentLookup = { data: result.data, error: null };
              break;
            }
          }
        }
        
        // If no match found, set error
        if (!studentLookup) {
          studentLookup = { data: null, error: { message: 'Student not found' } };
        }

        if (!studentLookup || studentLookup.error || !studentLookup.data) {
          setError('Student not found. Please check your ID.');
          setLoading(false);
          return;
        }
        const student = studentLookup.data;
        // Check password logic, fallback to 'aa' if empty/null
        const passToCheck = student.password || 'aa';
        if (password !== passToCheck) {
          setError('Incorrect password.');
          setLoading(false);
          return;
        }
        // Store student session info with all necessary fields for notifications
        localStorage.setItem('studentSession', JSON.stringify({
          id: student.id,
          name: student.name,
          school_id: student.school_id,
          class_id: student.class_id,
          section_id: student.section_id,
          isStudent: true
        }));
        broadcastStudentSessionChange();

        // OPTIMIZED: Run push notification and online status update in parallel, non-blocking
        Promise.allSettled([
          pushNotificationService.rehydrateStoredToken(student.id, student.school_id, 'student').catch(() => {
            // Silently fail - push notifications are not critical for login
          }),
          Promise.resolve(
            supabase
              .from('students')
              .update({
                is_online: true,
                last_online: new Date().toISOString(),
                app_version: process.env.REACT_APP_VERSION || 'v1.4.0'
              })
              .eq('id', student.id)
          ).catch(() => {
            // Silently fail - online status update is not critical for login
          })
        ]);

        // Redirect to landing page
        navigate('/home', { replace: true });
        return;
      }
      toast.showToast('Login successful', 'success');
    } catch (err: any) {
      setError(err.message || 'Login failed');
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
          <LoginModeSwitch>
            <SwitchOption
              $active={loginMode === 'staff'}
              onClick={() => handleModeSwitch('staff')}
              disabled={loading}
              type="button"
            >
              <SwitchLabel>Staff</SwitchLabel>
            </SwitchOption>
            <SwitchOption
              $active={loginMode === 'parent'}
              onClick={() => handleModeSwitch('parent')}
              disabled={loading}
              type="button"
            >
              <SwitchLabel>Parent</SwitchLabel>
            </SwitchOption>
            <SwitchOption
              $active={loginMode === 'student'}
              onClick={() => handleModeSwitch('student')}
              disabled={loading}
              type="button"
            >
              <SwitchLabel>Student</SwitchLabel>
            </SwitchOption>
          </LoginModeSwitch>
          {!loginMode ? (
            <>
              <Title>Select Login Type</Title>
              <div style={{
                textAlign: 'center',
                color: 'var(--text-secondary, #666)',
                fontSize: '0.95rem',
                padding: '20px 0'
              }}>
                Please select Staff, Parent, or Student to continue
              </div>
            </>
          ) : loginMode === 'staff' ? (
            <>
              <Title>Sign In</Title>
              <Label htmlFor="username">Username</Label>
              <InputGroup>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  autoComplete="username"
                  autoFocus={!isMobile}
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
            </>
          ) : loginMode === 'parent' ? (
            <>
              <Title>Parent Login</Title>
              <Label htmlFor="familyId">Family ID</Label>
              <InputGroup>
                <Input
                  id="familyId"
                  type="text"
                  inputMode="numeric"
                  value={familyId}
                  onChange={e => {
                    const value = e.target.value;
                    // Only allow numeric characters
                    if (value === '' || /^\d+$/.test(value)) {
                      setFamilyId(value);
                    }
                  }}
                  autoFocus={!isMobile}
                  autoComplete="off"
                  required
                  placeholder="Enter your Family ID"
                />
              </InputGroup>
              <Label htmlFor="parentPassword">Password</Label>
              <InputGroup>
                <Input
                  id="parentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
                <ToggleButton type="button" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </ToggleButton>
              </InputGroup>
            </>
          ) : (
            <>
              <Title>Student Portal</Title>
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
                Redirecting to Student Portal...
              </div>
            </>
          )}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <Button
            type="submit"
            disabled={loading || !loginMode}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </LoginCard>
      </Container>
    </ThemeProvider>
  );
};

export default Login; 