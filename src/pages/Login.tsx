import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { ThemeProvider, useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { supabase, setAuthContext } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { broadcastStudentSessionChange } from '../utils/studentSessionEvents';
import { pushNotificationService } from '../services/pushNotificationService';
import { hasPermission } from '../services/permissionService';
import { Visibility, VisibilityOff, School as SchoolIcon, DarkMode as DarkModeIcon, LightMode as LightModeIcon, FamilyRestroom, Person, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import {
  clayCardStyle,
  clayButtonStyle,
  neumorphFieldStyle,
  getFieldPalette,
  getLayoutPalette,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD,
  isDark,
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
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.BG};
  padding: 1.5rem 1rem;
  box-sizing: border-box;
  position: relative;

  @media (max-width: 480px) {
    padding: 1rem 0.75rem;
  }

  @media (max-height: 620px) {
    align-items: flex-start;
    padding-top: 1.25rem;
    padding-bottom: 1.25rem;
  }
`;

const TopRightControls = styled.div`
  position: fixed;
  top: 14px;
  right: 16px;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 480px) {
    top: 10px;
    right: 10px;
    gap: 6px;
  }
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
  margin-right: 6px;

  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    color: ${({ theme }) => theme.ACCENT};
    transform: scale(1.05);
    box-shadow: ${({ theme }) => `0 2px 8px ${theme.ACCENT}33`};
  }

  @media (max-width: 480px) {
    margin-right: 0;
  }
`;

const LoginCard = styled.form`
  ${clayCardStyle}
  padding: 2.2rem 2rem 1.8rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 1.6rem 1.15rem 1.4rem 1.15rem;
    gap: 1rem;
    border-radius: 12px;
  }

  @media (max-width: 360px) {
    padding: 1.35rem 0.9rem 1.2rem 0.9rem;
    gap: 0.85rem;
  }
`;

const Logo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  user-select: none;
  text-align: center;
  margin-bottom: 2px;

  svg {
    color: ${({ theme }) => theme.ACCENT};
    font-size: 34px;
  }

  .brand-text {
    font-size: clamp(1.22rem, 4vw, 1.45rem);
    font-weight: 700;
    line-height: 1.2;
  }

  @media (max-width: 480px) {
    svg {
      font-size: 30px;
    }
  }
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: clamp(1.2rem, 3.5vw, 1.38rem);
  font-weight: 700;
  margin: 0 0 6px 0;
  text-align: center;
  line-height: 1.25;
`;

const Label = styled.label`
  font-size: clamp(0.88rem, 2.4vw, 0.96rem);
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  margin-bottom: 2px;
`;

const InputGroup = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  ${neumorphFieldStyle}
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 16px; /* 16px avoids auto-zoom on mobile Safari */
  padding: 12px 14px;
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  
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

  @media (max-width: 480px) {
    padding: 10px 12px;
    height: 46px;
  }
`;

const PasswordInput = styled(Input)`
  padding-right: 46px;

  @media (max-width: 480px) {
    padding-right: 44px;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  z-index: 2;
  transition: color 0.18s, background-color 0.18s;

  &:hover {
    color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => `${theme.ACCENT}15`};
  }

  svg {
    font-size: 21px;
  }
`;

const Button = styled.button.attrs({ $variant: 'primary' })`
  ${clayButtonStyle}
  border-radius: ${CARD_RADIUS_MD};
  padding: 0;
  height: 48px;
  font-size: clamp(0.96rem, 2.5vw, 1.05rem);
  font-weight: 600;
  cursor: pointer;
  margin-top: 6px;
  width: 100%;

  @media (max-width: 480px) {
    height: 46px;
  }
`;

const ErrorMsg = styled.div`
  color: #ef4444;
  font-size: 0.92rem;
  text-align: center;
  margin-top: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fff8f8'};
  border-radius: 8px;
  padding: 8px 12px;
`;

const RoleBlocksContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  margin: 2px 0 4px 0;
`;

const RoleHeader = styled.div`
  text-align: center;
`;

const RoleSubtitle = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: clamp(0.82rem, 2.4vw, 0.88rem);
  margin: 3px 0 0 0;
  font-weight: 500;
`;

const BlocksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 420px) {
    gap: 7px;
  }

  @media (max-width: 340px) {
    gap: 5px;
  }
`;

const RoleBlockButton = styled.button<{ $color: string; $glow: string }>`
  background: ${({ theme }) =>
    isDark(theme)
      ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(30, 36, 50, 0.75) 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f6f8fc 100%)'};
  border: 1.5px solid ${({ theme }) =>
    isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.95)'};
  border-radius: 12px;
  padding: 14px 6px 12px 6px;
  min-height: 102px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ theme }) =>
    isDark(theme)
      ? '0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
      : '0 4px 12px rgba(15, 23, 42, 0.05), inset 0 1px 0 #ffffff'};

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $color }) => $color};
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: ${({ $color }) => `${$color}90`};
    box-shadow: ${({ theme, $glow }) =>
      isDark(theme)
        ? `0 8px 20px rgba(0, 0, 0, 0.45), 0 0 16px ${$glow}`
        : `0 8px 18px rgba(37, 99, 235, 0.12), 0 0 12px ${$glow}`};

    &:before {
      opacity: 1;
    }

    .role-icon-box {
      transform: scale(1.08);
      background: ${({ $color }) => `${$color}22`};
    }
  }

  &:active {
    transform: translateY(-1px) scale(0.98);
  }

  @media (max-width: 420px) {
    padding: 12px 4px 10px 4px;
    min-height: 94px;
    border-radius: 10px;
    gap: 5px;
  }

  @media (max-width: 340px) {
    padding: 10px 2px 8px 2px;
    min-height: 88px;
    border-radius: 8px;
    gap: 4px;
  }
`;

const RoleIconBox = styled.div<{ $color: string }>`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  transition: all 0.22s ease;

  svg {
    font-size: 22px;
  }

  @media (max-width: 420px) {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    svg {
      font-size: 19px;
    }
  }

  @media (max-width: 340px) {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    svg {
      font-size: 17px;
    }
  }
`;

const RoleName = styled.span`
  font-size: clamp(0.82rem, 2.5vw, 0.95rem);
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  letter-spacing: -0.01em;
  line-height: 1.1;
`;

const RoleDescription = styled.span`
  font-size: clamp(0.64rem, 1.9vw, 0.72rem);
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2px;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 8px;
  transition: all 0.18s;

  &:hover {
    color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => `${theme.ACCENT}15`};
  }

  svg {
    font-size: 18px;
  }
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
            <div className="brand-text">Welcome to <span style={{ color: '#ff6b35' }}>GROW</span> <span style={{ color: '#4a6cf7' }}>MORE</span>!</div>
          </Logo>

          {!loginMode ? (
            <RoleBlocksContainer>
              <RoleHeader>
                <Title style={{ marginBottom: '4px' }}>Select Login Type</Title>
                <RoleSubtitle>Choose your portal to proceed with login</RoleSubtitle>
              </RoleHeader>

              <BlocksGrid>
                <RoleBlockButton
                  type="button"
                  $color="#3b82f6"
                  $glow="rgba(59, 130, 246, 0.25)"
                  onClick={() => handleModeSwitch('staff')}
                  aria-label="Staff Login"
                >
                  <RoleIconBox $color="#3b82f6" className="role-icon-box">
                    <Person />
                  </RoleIconBox>
                  <RoleName>Staff</RoleName>
                  <RoleDescription>Admin & Faculty</RoleDescription>
                </RoleBlockButton>

                <RoleBlockButton
                  type="button"
                  $color="#10b981"
                  $glow="rgba(16, 185, 129, 0.25)"
                  onClick={() => handleModeSwitch('parent')}
                  aria-label="Parent Login"
                >
                  <RoleIconBox $color="#10b981" className="role-icon-box">
                    <FamilyRestroom />
                  </RoleIconBox>
                  <RoleName>Parent</RoleName>
                  <RoleDescription>Family Portal</RoleDescription>
                </RoleBlockButton>

                <RoleBlockButton
                  type="button"
                  $color="#ff6b35"
                  $glow="rgba(255, 107, 53, 0.25)"
                  onClick={() => handleModeSwitch('student')}
                  aria-label="Student Portal"
                >
                  <RoleIconBox $color="#ff6b35" className="role-icon-box">
                    <SchoolIcon />
                  </RoleIconBox>
                  <RoleName>Student</RoleName>
                  <RoleDescription>Learning LMS</RoleDescription>
                </RoleBlockButton>
              </BlocksGrid>
            </RoleBlocksContainer>
          ) : (
            <>
              <FormHeader>
                <BackBtn type="button" onClick={() => setLoginMode(null)}>
                  <ArrowBackIcon /> Change Role
                </BackBtn>
              </FormHeader>

              {loginMode === 'staff' ? (
                <>
                  <Title>Staff Sign In</Title>
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
                    <PasswordInput
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                    />
                    <ToggleButton type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </ToggleButton>
                  </InputGroup>
                </>
              ) : loginMode === 'parent' ? (
                <>
                  <Title>Parent Sign In</Title>
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
                    <PasswordInput
                      id="parentPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                    <ToggleButton type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
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

              {loginMode !== 'student' && (
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              )}
            </>
          )}
        </LoginCard>
      </Container>
    </ThemeProvider>
  );
};

export default Login; 