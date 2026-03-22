import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider, keyframes, createGlobalStyle, css } from 'styled-components';
import { Add as AddIcon, Refresh as RefreshIcon, Close as CloseIcon, Save as SaveIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import { Box, Grid } from '@mui/material';
import Loader from './Loader';
import NoSessionsFound from './NoSessionsFound';
import NoClassesFound from './NoClassesFound';
import NoSectionsFound from './NoSectionsFound';
import {
  clayPanelStyle,
  clayCardStyle,
  clayInputStyle,
  clayButtonStyle,
  neumorphSelectFieldStyle,
  minimalSelectMenuStyle,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD,
  getLayoutPalette,
  getDashboardPalette,
} from '../styles/DesignSystem';

// --- Styled Components (matching MarkAttendance.tsx) ---
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 8px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  ${clayPanelStyle}
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 6px 0 6px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: ${CARD_RADIUS_LG};
  padding: 8px 10px;
  min-height: 44px;
`;

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;



const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 140px;
  flex: 1 1 180px;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    flex: none;
    &.search-group {
      margin-top: 0.7rem;
      order: 2;
    }
    &:not(.search-group) {
      order: 1;
    }
  }
`;

const Label = styled.label`
  font-size: 0.97rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Input = styled.input`
  ${clayInputStyle}
  width: 100%;
  min-height: 42px;
  padding: 0.62rem 0.9rem;
  font-size: 1rem;
  @media (max-width: 700px) {
    width: 100%;
    min-height: 40px;
    font-size: 0.92rem;
  }
`;

const Select = styled.select`
  ${neumorphSelectFieldStyle}
  width: 100%;
  min-height: 42px;
  padding: 0.62rem 2.2rem 0.62rem 0.9rem;
  font-size: 1rem;
  @media (max-width: 700px) {
    min-height: 40px;
    font-size: 0.92rem;
  }
`;

const StudentsListContainer = styled.div`
  ${clayCardStyle}
  padding: 14px;
  margin-top: 10px;
`;

const StudentRow = styled.div<{ $focused?: boolean }>`
  ${clayCardStyle}
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1.5px solid ${({ theme, $focused }) => $focused ? `${theme.ACCENT}88` : 'transparent'};
  border-radius: ${CARD_RADIUS_LG};
  margin-bottom: 8px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => `${theme.ACCENT}66`};
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 10px;
  }
`;

const SerialNumber = styled.div`
  ${clayCardStyle}
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.ACCENT}18`};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  font-size: 0.9rem;
  border: 1.5px solid ${({ theme }) => `${theme.ACCENT}33`};
  flex-shrink: 0;
`;

const RemoveButton = styled.button`
  ${clayButtonStyle}
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  border: 1px solid transparent;
  border-radius: ${CARD_RADIUS_MD};
  padding: 0.5rem 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const InsertButton = styled.button`
  ${clayButtonStyle}
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  border: 1px solid transparent;
  border-radius: ${CARD_RADIUS_MD};
  padding: 0.5rem 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  
  @media (max-width: 700px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const AddStudentButton = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  margin-top: 16px;

  &:hover {
    background: ${({ theme }) => theme.ACCENT}ee;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ theme }) => `${theme.ACCENT}33`};
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.56);
  z-index: 12000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.3rem;
  letter-spacing: 1px;
  backdrop-filter: blur(6px);
`;

const LoadingSpinner = styled.div`
  border: 6px solid #e0e7ff;
  border-top: 6px solid #4a6cf7;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  animation: spin 1.1s linear infinite;
  margin-bottom: 28px;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 32px;
  right: 32px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const ToastMsg = styled.div<{type: 'error' | 'success' | 'warning', themeMode: 'dark' | 'light'}>`
  min-width: 220px;
  background: ${({type, themeMode}) => 
    type === 'error' ? (themeMode === 'dark' ? '#ff3b3b' : '#ff5252') :
    type === 'warning' ? (themeMode === 'dark' ? '#ff9800' : '#ff9800') :
    (themeMode === 'dark' ? '#4caf50' : '#43a047')
  };
  color: #fff;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 1.08rem;
  font-weight: 600;
  margin-bottom: 10px;
  box-shadow: 0 4px 24px 0 #0007;
  opacity: 0.97;
  animation: ${keyframes`
    0% { transform: translateY(-30px) scale(0.95); opacity: 0; }
    60% { transform: translateY(4px) scale(1.03); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 0.97; }
  `} 0.5s;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.ACCENT};
`;

const ListHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 4px 2px 10px;
  background: ${({ theme }) => getDashboardPalette(theme).cardBg};
  border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
`;

const ListTitle = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const GlobalStyle = createGlobalStyle<{
  fieldBg: string;
  textColor: string;
}>`
  input:-webkit-autofill,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:active,
  textarea:-webkit-autofill,
  textarea:-webkit-autofill:focus,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px ${props => props.fieldBg} inset !important;
    box-shadow: 0 0 0 1000px ${props => props.fieldBg} inset !important;
    -webkit-text-fill-color: ${props => props.textColor} !important;
    color: ${props => props.textColor} !important;
    caret-color: ${props => props.textColor} !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

// --- Skeleton Loading Components ---
const skeletonShimmer = keyframes`
  0% { 
    transform: translateX(-100%);
  }
  100% { 
    transform: translateX(100%);
  }
`;

const isDarkSkeleton = (theme: any) => theme.BG === '#252525' || theme.BG === '#181c2a';

const SkeletonBase = styled.div`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#2a2a2a' : '#f5f5f5'};
  border-radius: 8px;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => isDarkSkeleton(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'},
      transparent
    );
    animation: ${skeletonShimmer} 2.5s ease-in-out infinite;
  }
`;

const SkeletonHeaderTitle = styled(SkeletonBase)`
  width: 180px;
  height: 22px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonSegmentedSelect = styled(SkeletonBase)`
  height: 32px;
  width: 140px;
  border-radius: 11px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  margin-right: 1px;
  
  &:first-child {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  
  &:last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`;

const SkeletonListHeaderTitle = styled(SkeletonBase)`
  width: 120px;
  height: 20px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonStudentRow = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.CARD};
  border: ${({ theme }) => isDarkSkeleton(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: ${({ theme }) => isDarkSkeleton(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.08)'};
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const SkeletonSerialNumber = styled(SkeletonBase)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  flex-shrink: 0;
`;

const SkeletonInput = styled(SkeletonBase)`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonSelect = styled(SkeletonBase)`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  
  @media (max-width: 700px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const SkeletonButton = styled(SkeletonBase)`
  width: 80px;
  height: 36px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonFooter = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-top: ${({ theme }) => isDarkSkeleton(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDarkSkeleton(theme)
    ? '0 -1px 6px rgba(0, 0, 0, 0.2)'
    : '0 -1px 6px rgba(0, 0, 0, 0.08)'};
  min-height: 36px;
  
  @media (max-width: 700px) {
    padding: 0.4rem 0.75rem;
    gap: 0.5rem;
    min-height: 32px;
  }
`;

const SkeletonFooterText = styled(SkeletonBase)`
  height: 18px;
  width: 140px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  
  @media (max-width: 700px) {
    display: none;
  }
`;

const SkeletonFooterSegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
`;

const SkeletonFooterButton = styled(SkeletonBase)`
  height: 32px;
  width: 100px;
  border-radius: 0;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  margin-right: 1px;
  
  &:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }
  
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
    margin-right: 0;
    width: 160px;
  }
`;


// --- Segmented Group Styles (matching MarkAttendance.tsx) ---
const SEGMENTED_HEIGHT = '32px';
const SegmentedGroup = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
  display: flex;
  align-items: center;
  background: ${layout.surfaceBg};
  border: 1px solid ${layout.surfaceBorder};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${layout.surfaceShadow};
  overflow: hidden;
    `;
  }}
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 11px;
  }
`;

const SegmentedBase = css`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  border: none;
  outline: none;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  appearance: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  ${minimalSelectMenuStyle}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  &:last-child { border-right: none; }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:not(:first-child) {
    border-left: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => {
    const color = encodeURIComponent(getDashboardPalette(theme).subtleText);
    return `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='${color}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
  }};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    border-radius: 0;
    ${({ first }) => first && `
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    `}
    ${({ last }) => last && `
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    `}
  }
`;

const SegmentedButton = styled.button<{ active?: boolean; first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  background: ${({ active, theme }) => active ? theme.ACCENT : 'transparent'};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1px solid ${({ active, theme }) => active ? theme.ACCENT : 'transparent'};
  font-weight: ${({ active }) => active ? 700 : 400};
  &:hover, &:focus {
    background: ${({ active, theme }) => active ? theme.ACCENT : getLayoutPalette(theme).navHoverBg};
    opacity: 1;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    border-radius: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    ${({ first }) => first && `
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    `}
    ${({ last }) => last && `
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    `}
  }
`;

interface StudentData {
  id: string;
  name: string;
  fatherName: string;
  gender: string;
}

const BulkStudentAdmission: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, completeProgress, setProgress } = useProgress();
  const { setFooterContent } = usePageFooter();
  const navigate = useNavigate();
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [formData, setFormData] = useState({
    class: '',
    section: ''
  });
  const [students, setStudents] = useState<StudentData[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string, has_sections?: boolean}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Array<{msg: string, type: 'error' | 'success' | 'warning', id: number}>>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [hasClasses, setHasClasses] = useState(true);
  const [hasSections, setHasSections] = useState(true);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const lastRowRef = useRef<HTMLDivElement>(null);
  const studentsRef = useRef<StudentData[]>([]);
  
  const toastId = useRef(0);
  
  // Keep ref in sync with state
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const showToast = useCallback((msg: string, type: 'error' | 'success' | 'warning' = 'success') => {
    const id = toastId.current++;
    setToasts(prev => [...prev, {msg, type, id}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  }, []);

  // Initialize with 10 default student rows
  useEffect(() => {
    if (students.length === 0) {
      const defaultStudents: StudentData[] = Array.from({ length: 10 }, (_, index) => ({
        id: `default-${index + 1}`,
        name: '',
        fatherName: '',
        gender: 'Male'
      }));
      setStudents(defaultStudents);
    }
  }, []);

  // Check for active session and classes on mount
  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!user?.school_id) {
        showToast('User school information not found', 'error');
        return;
      }

      setLoading(true);
      startProgress(false);
      setProgress(10);

      try {
        // Check for active session for this school
        setProgress(20);
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();

        if (sessionError || !session) {
          setActiveSession(null);
        } else {
          setActiveSession(session);
        }

        // Check for classes for this school
        setProgress(40);
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', user.school_id)
          .limit(1);

        setHasClasses(!classesError && classes && classes.length > 0);

        // Check for sections for this school
        setProgress(60);
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id')
          .eq('school_id', user.school_id)
          .limit(1);

        setHasSections(!sectionsError && sections && sections.length > 0);

        setProgress(100);
      } catch (error) {
      } finally {
        setLoading(false);
        completeProgress();
      }
    };

    checkPrerequisites();
  }, [user?.school_id, setLoading, startProgress, setProgress, completeProgress]);

  // Fetch classes on mount
  useEffect(() => {
    if (!user?.school_id) return;

    setLoadingClasses(true);
    supabase
      .from('classes')
      .select('id, name, has_sections')
      .eq('school_id', user.school_id)
      .then(({ data, error }) => {
        setLoadingClasses(false);
        if (error) {
          return;
        }
        const sortedClasses = sortClasses(data || []);
        setClasses(sortedClasses);
      });
  }, [user?.school_id]);

  // Fetch sections when class changes
  useEffect(() => {
    if (!formData.class || !user?.school_id) { 
      setSections([]);
      setSelectedClassHasSections(true);
      return; 
    }
    
    // Check if selected class has sections
    const selectedClass = classes.find(c => String(c.id) === String(formData.class));
    const hasSections = selectedClass?.has_sections ?? true;
    setSelectedClassHasSections(hasSections);
    
    // Only fetch sections if class has sections
    if (!hasSections) {
      setSections([]);
      setFormData(prev => ({ ...prev, section: '' }));
      return;
    }
    
    setLoadingSections(true);
    supabase
      .from('sections')
      .select('id, name, class_id')
      .eq('class_id', Number(formData.class))
      .eq('school_id', user.school_id)
      .then(({ data, error }) => {
        setLoadingSections(false);
        if (error) {
        }
        setSections(data || []);
      });
  }, [formData.class, user?.school_id, classes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addStudent = () => {
    const newStudent: StudentData = {
      id: Date.now().toString(),
      name: '',
      fatherName: '',
      gender: 'Male'
    };
    setStudents([...students, newStudent]);
  };

  const insertStudent = (afterIndex: number) => {
    const newStudent: StudentData = {
      id: Date.now().toString(),
      name: '',
      fatherName: '',
      gender: 'Male'
    };
    
    const newStudents = [...students];
    newStudents.splice(afterIndex + 1, 0, newStudent);
    setStudents(newStudents);
    setFocusedStudentId(newStudent.id);
    
    // Focus the name field of the newly inserted student after a short delay
    setTimeout(() => {
      const nameInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="name"]`) as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 50);
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(student => student.id !== id));
  };

  const updateStudent = (id: string, field: keyof StudentData, value: string) => {
    setStudents(students.map(student => 
      student.id === id ? { ...student, [field]: value } : student
    ));
  };

  // Helper function to get default password - memoized to prevent handleSubmit recreation
  const generateRandomPassword = useCallback((): string => {
    // Generate a random 5-digit number (10000 to 99999)
    const min = 10000;
    const max = 99999;
    const randomPassword = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(randomPassword);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    if (!formData.class) {
      showToast('Please select a class!', 'error');
      return;
    }
    
    if (selectedClassHasSections && !formData.section) {
      showToast('Please select a section!', 'error');
      return;
    }

    // Get current students from ref (avoids dependency on students array)
    const currentStudents = studentsRef.current;
    
    if (currentStudents.length === 0) {
      showToast('Please add at least one student!', 'error');
      return;
    }

    // Filter out students without required fields (Name and Father only)
    const validStudents = currentStudents.filter(student => 
      student.name.trim() && student.fatherName.trim()
    );

    if (validStudents.length === 0) {
      showToast('Please add at least one student with Name and Father fields', 'error');
      return;
    }

    // Show warning if some students are incomplete but still allow submission
    if (validStudents.length !== currentStudents.length) {
      const incompleteCount = currentStudents.length - validStudents.length;
      showToast(`Warning: ${incompleteCount} students are missing Name or Father fields. Only complete students will be saved.`, 'warning');
    }

    setSubmitting(true);
    startProgress(false);
    setProgress(10);

    try {
      // Check for active session
      setProgress(20);
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      
      if (sessionError || !session) {
        showToast('Cannot add students: No active session found!', 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }

      // Get the current max student ID for this school and generate sequential IDs
      setProgress(40);
      const { data: maxIdData, error: maxIdError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id)
        .order('id', { ascending: false })
        .limit(1);
      
      if (maxIdError) {
        throw maxIdError;
      }
      
      const currentMaxId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id : 0;
      const studentIds: number[] = [];
      
      for (let i = 0; i < validStudents.length; i++) {
        studentIds.push(currentMaxId + i + 1);
      }

      // Prepare student data with defaults (only valid students)
      // Maintain the order as they appear in the students array
      // roll_number will be auto-generated by database trigger
      const studentData = validStudents.map((student, index) => ({
        id: studentIds[index],
        name: student.name,
        class_id: Number(formData.class),
        section_id: selectedClassHasSections ? Number(formData.section) : null,
        admission_date: new Date().toISOString().split('T')[0],
        father_name: student.fatherName,
        mother_name: null,
        gender: student.gender,
        dob: '2000-01-01',
        blood_group: null,
        address: null,
        phone: null,
        father_mobile: null,
        mother_mobile: null,
        father_occupation: null,
        mother_occupation: null,
        father_income: null,
        mother_income: null,
        session_id: session.id,
        school_id: user.school_id,
        status: 'active',
        password: generateRandomPassword()
      }));

      // Insert students
      setProgress(70);
      const { data: insertedStudents, error: insertError } = await supabase
        .from('students')
        .insert(studentData)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Insert into student_class_history
      // For new admissions: adm_class_id and new_class_id are the same (admission = current)
      setProgress(90);
      const admissionClassId = Number(formData.class);
      const admissionSectionId = selectedClassHasSections ? Number(formData.section) : null;
      const historyData = insertedStudents.map(student => ({
        student_id: student.id,
        adm_class_id: admissionClassId,
        adm_section_id: admissionSectionId,
        new_class_id: admissionClassId, // For new students, current class = admission class
        new_section_id: admissionSectionId, // For new students, current section = admission section
        session_id: session.id,
        school_id: user.school_id,
        admission_date: new Date().toISOString().split('T')[0],
        status: 'active'
      }));

      const { error: historyError } = await supabase
        .from('student_class_history')
        .insert(historyData);

      if (historyError) {
        showToast('Students added but history update failed: ' + historyError.message, 'error');
      }

      setProgress(100);
      showToast(`${validStudents.length} students added successfully!`, 'success');
      
      // Reset form and add default rows
      setStudents([]);
      setFormData({ class: '', section: '' });
      
      // Add 10 default empty rows for new entries
      const defaultStudents: StudentData[] = Array.from({ length: 10 }, (_, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: '',
        fatherName: '',
        gender: 'Male'
      }));
      setStudents(defaultStudents);
      
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSubmitting(false);
      completeProgress();
    }
  }, [user?.school_id, formData.class, formData.section, selectedClassHasSections, students.length, showToast, startProgress, setProgress, completeProgress, generateRandomPassword]);

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleReset = useCallback(() => {
    setStudents([]);
    setFormData({ class: '', section: '' });
    // Re-initialize with 10 default rows
    const defaultStudents: StudentData[] = Array.from({ length: 10 }, (_, index) => ({
      id: `default-${index + 1}`,
      name: '',
      fatherName: '',
      gender: 'Male'
    }));
    setStudents(defaultStudents);
  }, []);

  // Handle tab key to add new row when tabbing from gender field in last row
  const handleTabKey = (e: React.KeyboardEvent, studentId: string, isLastRow: boolean, fieldType: string) => {
    if (e.key === 'Tab' && isLastRow && fieldType === 'gender') {
      e.preventDefault();
      
      // Add new student
      const newStudent: StudentData = {
        id: `temp-${Date.now()}-${Math.random()}`,
        name: '',
        fatherName: '',
        gender: 'Male'
      };
      
      setStudents(prev => [...prev, newStudent]);
      setFocusedStudentId(newStudent.id);
      
      // Focus the name field of the newly added student after a short delay
      setTimeout(() => {
        const nameInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="name"]`) as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
        }
      }, 50);
    }
  };

  // Handle focus changes to update focused student
  const handleFieldFocus = (studentId: string) => {
    setFocusedStudentId(studentId);
  };

  // Keyboard shortcuts for gender selection and Enter to save students
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Handle Enter key to save students
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Handle M/F keys for gender selection
      if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'f') {
        // Only handle if not typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
          return;
        }

        e.preventDefault();
        if (focusedStudentId) {
          updateStudent(focusedStudentId, 'gender', e.key.toLowerCase() === 'm' ? 'Male' : 'Female');
        } else {
          // If no focused student, find the first student and set gender
          const firstStudent = students[0];
          if (firstStudent) {
            setFocusedStudentId(firstStudent.id);
            updateStudent(firstStudent.id, 'gender', e.key.toLowerCase() === 'm' ? 'Male' : 'Female');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [students, focusedStudentId, handleSubmit]);

  // Set global footer content - MUST be before early returns
  useEffect(() => {
    const FooterContent = React.memo(() => {
      const themeObj = theme === 'dark' ? darkTheme : lightTheme;
      
      return (
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          width: '100%',
          gap: isMobile ? '0.5rem' : '1rem',
          flexWrap: isMobile ? 'nowrap' : 'wrap'
        }}>
          {!isMobile && (
            <div style={{ 
              fontSize: '0.98rem', 
              color: themeObj.TEXT_SECONDARY, 
              fontWeight: 600 
            }}>
              Total Students: {students.length}
            </div>
          )}
          <SegmentedGroup theme={themeObj}>
            <SegmentedButton
              theme={themeObj}
              first
              onClick={handleReset}
            >
              <RefreshIcon style={{ fontSize: 17, marginRight: 4 }} />
              Reset
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              onClick={handleCancel}
            >
              <CloseIcon style={{ fontSize: 17, marginRight: 4 }} />
              Cancel
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              last
              onClick={handleSubmit}
              disabled={submitting}
              style={{ 
                color: '#fff', 
                background: '#16a34a', 
                borderColor: '#16a34a', 
                fontWeight: 700,
                opacity: submitting ? 0.6 : 1,
                whiteSpace: 'nowrap',
                minWidth: 'fit-content'
              }}
            >
              {submitting ? (
                <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <SaveIcon style={{ fontSize: 17, marginRight: 4 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Add {students.length} Students</span>
                </>
              )}
            </SegmentedButton>
          </SegmentedGroup>
        </div>
      );
    });

    setFooterContent({
      visible: true,
      content: <FooterContent />
    });

    return () => {
      setFooterContent(null);
    };
  }, [students.length, submitting, isMobile, theme, setFooterContent, handleSubmit, handleCancel, handleReset]);

  if (loading) {
    return <Loader />;
  }

  if (!activeSession) {
    return <NoSessionsFound />;
  }

  if (!hasClasses) {
    return <NoClassesFound />;
  }

  if (!hasSections) {
    return <NoSectionsFound />;
  }

  return (
    <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <GlobalStyle
        fieldBg={(theme === 'dark' ? darkTheme.FIELD_BG : lightTheme.FIELD_BG) || '#23272f'}
        textColor={(theme === 'dark' ? darkTheme.TEXT_PRIMARY : lightTheme.TEXT_PRIMARY) || '#fff'}
      />
      {toasts.length > 0 && (
        ReactDOM.createPortal(
          <ToastContainer>
            {toasts.map(t => (
              <ToastMsg key={t.id} type={t.type} themeMode={theme}>
                {t.msg}
              </ToastMsg>
            ))}
          </ToastContainer>,
          document.body
        )
      )}
      {submitting && ReactDOM.createPortal(
        <LoadingOverlay>
          <LoadingSpinner />
          <div style={{marginTop: 12, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '1.5px'}}>Adding Students…</div>
          <div style={{marginTop: 8, fontSize: '1.05rem', color: '#b0b8d1'}}>Please wait while we save the records.</div>
        </LoadingOverlay>,
        document.body
      )}
      <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <Header theme={theme === 'dark' ? darkTheme : lightTheme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HeaderTitle>Bulk Student Admission</HeaderTitle>
          </div>
          <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={formData.class}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFormData({ ...formData, class: e.target.value });
              }}
              first
            >
              <option value="">Select Class</option>
              {loadingClasses ? (
                <option disabled>Loading...</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </SegmentedSelect>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={formData.section}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFormData({ ...formData, section: e.target.value });
              }}
              disabled={!formData.class || !selectedClassHasSections}
              last
            >
              <option value="">
                {!formData.class ? 'Select Section' : !selectedClassHasSections ? 'No Sections' : 'Select Section'}
              </option>
              {loadingSections ? (
                <option disabled>Loading...</option>
              ) : (
                sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              )}
            </SegmentedSelect>
          </SegmentedGroup>
        </Header>
        <MainContent>
          <StudentsListContainer>
            <ListHeader>
              <div>
                <ListTitle>Students ({students.length})</ListTitle>
              </div>
            </ListHeader>
            
            {students.map((student, index) => {
              const isLastRow = index === students.length - 1;
              return (
                <StudentRow 
                  key={student.id} 
                  $focused={focusedStudentId === student.id}
                  onClick={() => setFocusedStudentId(student.id)}
                  ref={isLastRow ? lastRowRef : null}
                >
                  <SerialNumber>
                    {index + 1}
                  </SerialNumber>
                  <Input
                    placeholder="Student Name*"
                    value={student.name}
                    onChange={(e) => updateStudent(student.id, 'name', e.target.value)}
                    onFocus={() => handleFieldFocus(student.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedStudentId(student.id);
                    }}
                    data-student-id={student.id}
                    data-field="name"
                  />
                  <Input
                    placeholder="Father Name*"
                    value={student.fatherName}
                    onChange={(e) => updateStudent(student.id, 'fatherName', e.target.value)}
                    onFocus={() => handleFieldFocus(student.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedStudentId(student.id);
                    }}
                    data-student-id={student.id}
                    data-field="fatherName"
                  />
                  <Select
                    value={student.gender}
                    onChange={(e) => updateStudent(student.id, 'gender', e.target.value)}
                    onFocus={() => handleFieldFocus(student.id)}
                    onKeyDown={(e) => handleTabKey(e, student.id, isLastRow, 'gender')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedStudentId(student.id);
                    }}
                    data-student-id={student.id}
                    data-field="gender"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                  <ButtonContainer>
                    <InsertButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        insertStudent(index);
                      }}
                      data-student-id={student.id}
                      data-field="insert"
                      tabIndex={-1}
                      title="Insert new row after this one"
                    >
                      <AddIcon fontSize="small" />
                    Row
                    </InsertButton>
                    <RemoveButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStudent(student.id);
                      }}
                      data-student-id={student.id}
                      data-field="remove"
                      tabIndex={-1}
                    >
                      <DeleteIcon fontSize="small" />
                      Remove
                    </RemoveButton>
                  </ButtonContainer>
                </StudentRow>
              );
            })}
          </StudentsListContainer>
        </MainContent>
      </PageContainer>
    </ThemeProvider>
  );
};

export default BulkStudentAdmission;
