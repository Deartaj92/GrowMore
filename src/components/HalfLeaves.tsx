import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, darkTheme, lightTheme } from './Layout';
import { useToast } from './useToast';
import { format, isSunday, parseISO } from 'date-fns';
import { sortClasses } from '../utils/classUtils';
import {
  CalendarToday,
  Class,
  Groups,
  Save,
  Refresh,
  School,
  AccessTime,
  Delete
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from './NoSessionsFound';
import Loader from '../components/Loader';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import { Skeleton, Box, Grid } from '@mui/material';
import {
  clayCardStyle,
  clayPanelStyle,
  clayInputStyle,
  getLayoutPalette,
  minimalSelectMenuStyle,
  CARD_RADIUS_LG,
  isDark as checkIsDark
} from '../styles/DesignSystem';

// Spinner animation
const spinAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0.55rem;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, ${({ theme }) => `${theme.ACCENT}14`} 0%, transparent 28%),
    ${({ theme }) => getLayoutPalette(theme).shellBg};
  max-width: 100%;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 26%),
      radial-gradient(circle at bottom left, ${({ theme }) => `${theme.ACCENT}10`} 0%, transparent 34%);
    z-index: -1;
  }

  @media (max-width: 700px) {
    padding: 0.38rem;
    gap: 0.35rem;
  }
`;

const Header = styled.div`
  ${clayPanelStyle}
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.42rem 0.58rem;
  min-height: auto;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  
  @media (max-width: 700px) {
    padding: 0.4rem 0.48rem;
    gap: 0.42rem;
  }
`;

const MainContent = styled.div`
  ${clayPanelStyle}
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.42rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  border-radius: ${CARD_RADIUS_LG};
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumb};
    border-radius: 4px;
  }
`;

const PersonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 4.5rem;
  @media (min-width: 701px) {
    gap: 0.55rem;
    padding-bottom: 0;
  }
`;

const PersonCard = styled.div`
  ${clayCardStyle}
  display: flex;
  align-items: flex-start;
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.72rem 0.82rem;
  gap: 0.75rem;
  transition: all 0.2s;
  flex-wrap: wrap;
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}40;
  }
  @media (max-width: 700px) {
    display: none;
  }
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PersonInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PersonName = styled.div`
  font-weight: 700;
  font-size: 0.94rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.2rem;
`;

const PersonDetails = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const LeaveTypeButtons = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
  align-items: center;
  @media (min-width: 701px) {
    width: auto;
  }
`;

const DesktopButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
  @media (max-width: 700px) {
    display: none;
  }
`;

const LeaveTypeButton = styled.button<{ $active: boolean; $color: string }>`
  padding: 0.38rem 0.78rem;
  border-radius: 10px;
  border: 1px solid ${({ $active, $color }) => $active ? 'transparent' : `${$color}44`};
  background: ${({ $active, $color, theme }) => $active ? `linear-gradient(135deg, ${$color} 0%, ${$color}dd 100%)` : getLayoutPalette(theme).surfaceBg};
  color: ${({ $active, $color, theme }) => $active ? '#fff' : (checkIsDark(theme) ? '#e2e8f0' : $color)};
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, $color }) => $active ? `linear-gradient(135deg, ${$color} 0%, ${$color}dd 100%)` : `${$color}18`};
    color: #fff;
  }
`;


const StatsBar = styled.div`
  display: none;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const StatLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const StatValue = styled.span`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

// Segmented Group Styles
const SEGMENTED_HEIGHT = '29px';
const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: stretch;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow: hidden;
    border-radius: ${CARD_RADIUS_LG};
  }
`;

const SegmentedBase = css`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 500;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  border: none;
  outline: none;
  transition: background 0.2s, color 0.2s;
  appearance: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SegmentedInput = styled.input<{ pill?: boolean; first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  ${({ pill }) => pill && `
    border-top-left-radius: ${CARD_RADIUS_LG};
    border-bottom-left-radius: ${CARD_RADIUS_LG};
    border-top-right-radius: ${CARD_RADIUS_LG};
    border-bottom-right-radius: ${CARD_RADIUS_LG};
  `}
  ${({ first }) => first && `
    border-top-left-radius: ${CARD_RADIUS_LG};
    border-bottom-left-radius: ${CARD_RADIUS_LG};
  `}
  ${({ last }) => last && `
    border-top-right-radius: ${CARD_RADIUS_LG};
    border-bottom-right-radius: ${CARD_RADIUS_LG};
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  `}
  &:last-child {
    border-top-right-radius: ${CARD_RADIUS_LG};
    border-bottom-right-radius: ${CARD_RADIUS_LG};
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  &:first-child {
    border-top-left-radius: ${CARD_RADIUS_LG};
    border-bottom-left-radius: ${CARD_RADIUS_LG};
  }
  &:not(:first-child) {
    border-left: none;
  }
  &:focus {
    background: ${({ theme }) => getLayoutPalette(theme).navHoverBg};
  }
  @media (max-width: 700px) {
    flex: 1 1 0;
    width: 100%;
    min-width: 0;
    border-radius: 0;
    &:last-child {
      border-top-right-radius: ${CARD_RADIUS_LG};
      border-bottom-right-radius: ${CARD_RADIUS_LG};
    }
    &:first-child {
      border-top-left-radius: ${CARD_RADIUS_LG};
      border-bottom-left-radius: ${CARD_RADIUS_LG};
    }
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  ${minimalSelectMenuStyle}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  &:last-child { border-right: none; }
  ${({ first }) => first && `
    border-top-left-radius: ${CARD_RADIUS_LG};
    border-bottom-left-radius: ${CARD_RADIUS_LG};
  `}
  ${({ last }) => last && `
    border-top-right-radius: ${CARD_RADIUS_LG};
    border-bottom-right-radius: ${CARD_RADIUS_LG};
  `}
  &:not(:first-child) {
    border-left: none;
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => {
    const stroke = checkIsDark(theme) ? '%2394a3b8' : '%2364748b';
    return `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='${stroke}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
  }};
  background-repeat: no-repeat;
  background-position: right 0.75em center;
  background-size: 0.9em 0.9em;
  cursor: pointer;
  &:focus {
    background: ${({ theme }) => getLayoutPalette(theme).navHoverBg};
  }
  @media (max-width: 700px) {
    flex: 1 1 0;
    width: 100%;
    min-width: 0;
    border-radius: 0;
    ${({ first }) => first && `
      border-top-left-radius: ${CARD_RADIUS_LG};
      border-bottom-left-radius: ${CARD_RADIUS_LG};
    `}
    ${({ last }) => last && `
      border-top-right-radius: ${CARD_RADIUS_LG};
      border-bottom-right-radius: ${CARD_RADIUS_LG};
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
    border-top-left-radius: ${CARD_RADIUS_LG};
    border-bottom-left-radius: ${CARD_RADIUS_LG};
  `}
  ${({ last }) => last && `
    border-top-right-radius: ${CARD_RADIUS_LG};
    border-bottom-right-radius: ${CARD_RADIUS_LG};
  `}
  cursor: pointer;
  background: ${({ active, theme }) => active ? `${theme.ACCENT}18` : 'transparent'};
  color: ${({ active, theme }) => active ? theme.ACCENT : theme.TEXT_PRIMARY};
  border: none;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  font-weight: ${({ active }) => active ? 700 : 500};
  &:hover, &:focus {
    background: ${({ active, theme }) => active ? `${theme.ACCENT}18` : getLayoutPalette(theme).navHoverBg};
    opacity: 1;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:last-child {
    border-right: none;
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
    ${({ first }) => first && `
      border-top-left-radius: ${CARD_RADIUS_LG};
      border-bottom-left-radius: ${CARD_RADIUS_LG};
    `}
    ${({ last }) => last && `
      border-top-right-radius: ${CARD_RADIUS_LG};
      border-bottom-right-radius: ${CARD_RADIUS_LG};
    `}
  }
`;

// Mobile optimized components
const MobilePersonCard = styled.div`
  ${clayCardStyle}
  display: flex;
  flex-direction: column;
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.42rem 0.58rem;
  gap: 0.5rem;
  font-size: 0.88rem;
  width: 100%;
  min-width: 320px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}25;
    border-color: ${({ theme }) => theme.ACCENT}40;
  }
  
  @media (min-width: 701px) {
    display: none;
  }
`;

const MobileCardTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
`;

const MobileAvatar = styled(Avatar)`
  width: 24px;
  height: 24px;
  font-size: 0.82rem;
  flex-shrink: 0;
`;

const MobilePersonInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
`;

const MobilePersonName = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const MobilePersonDetails = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-top: 0.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const MobileLeaveTypeButtons = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.3rem;
  flex-shrink: 0;
  margin-left: auto;
  align-items: center;
`;

const MobileLeaveTypeButton = styled(LeaveTypeButton)`
  padding: 0.3rem 0.62rem;
  font-size: 0.78rem;
  white-space: nowrap;
  min-width: auto;
  flex: none;
`;

// Time Input Components
const TimeInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.45rem;
  padding-top: 0.45rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  width: 100%;
  align-self: stretch;
  @media (min-width: 701px) {
    display: none;
  }
`;

const TimeInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  @media (min-width: 701px) {
    width: auto;
  }
`;

const TimeLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  min-width: 90px;
  flex-shrink: 0;
  white-space: nowrap;
`;

const TimeInput = styled.input`
  ${clayInputStyle}
  flex: 1;
  padding: 0.38rem 0.6rem;
  font-size: 0.82rem;
  font-family: inherit;
  min-width: 0;
  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.7;
  }
  
  @media (min-width: 701px) {
    width: 120px;
    flex: none;
  }
`;

const DesktopTimeInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  @media (max-width: 700px) {
    display: none;
  }
`;

const MobileTimeInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  width: 100%;
`;

const MobileTimeInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.3rem;
  width: 100%;
`;

const MobileTimeLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const MobileTimeInput = styled.input`
  ${clayInputStyle}
  width: 100%;
  padding: 0.38rem 0.5rem;
  font-size: 0.8rem;
  font-family: inherit;
  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.7;
  }
`;

// Confirmation Dialog Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0006;
  z-index: 3999;
`;

const ConfirmationDialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => checkIsDark(theme) ? theme.CARD : '#ffffff'};
  padding: 1.5rem;
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  z-index: 4000;
  min-width: 300px;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
`;

const DialogTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.2rem;
`;

const DialogContent = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1rem;
  line-height: 1.5;
`;

const DialogButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const DialogButton = styled.button<{ $variant?: 'danger' | 'secondary' }>`
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  background: ${({ $variant, theme }) =>
    $variant === 'danger' ? '#dc2626' : theme.FIELD_BG};
  color: ${({ $variant, theme }) => ($variant === 'danger' ? '#fff' : theme.TEXT_PRIMARY)};
  transition: all 0.18s;
  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger' ? '#991b1b' : 'inherit'};
    opacity: ${({ $variant }) => ($variant === 'danger' ? 1 : 0.8)};
  }
`;

// Types
interface Person {
  id: number;
  name: string;
  picture_url?: string;
  father_name?: string;
  role?: string;
  class_id?: number;
  section_id?: number;
  leave_type?: 'first_half' | 'second_half' | null;
  remarks?: string;
  arrival_time?: string | null;
  departure_time?: string | null;
}

const HalfLeaves: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const toast = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { setFooterContent } = usePageFooter();

  // Inject CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = spinAnimation;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  
  // This component is now student-only
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classes, setClasses] = useState<Array<{ id: string; name: string; has_sections?: boolean }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [teacherSections, setTeacherSections] = useState<Array<{ id: string; name: string; class_id: string }>>([]);
  const [teacherClasses, setTeacherClasses] = useState<Array<{ id: string; name: string; has_sections?: boolean }>>([]);
  const lastSundayErrorDate = useRef<string | null>(null);

  // Fetch active session
  useEffect(() => {
    const fetchSession = async () => {
      if (!user?.school_id) {
        setHasActiveSession(false);
        setLoadingSession(false);
        return;
      }
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      if (data) {
        setSessionId(data.id);
        setHasActiveSession(true);
      } else {
        setHasActiveSession(false);
      }
      setLoadingSession(false);
    };
    fetchSession();
  }, [user]);

  // On mount, fetch staff_id for the logged-in user if teacher
  useEffect(() => {
    if (!hasActiveSession) return;
    const fetchStaffId = async () => {
      if (!user || user.role !== 'Teacher') return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('staff_id')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (data && data.staff_id) {
          setStaffId(data.staff_id);
        } else {
          setStaffId(null);
          toast.showToast('No staff ID found for your user. Please contact admin.', 'error');
        }
      } catch (error) {
        setStaffId(null);
        toast.showToast('Failed to fetch staff ID for your user.', 'error');
      }
    };
    fetchStaffId();
    // eslint-disable-next-line
  }, [user, hasActiveSession]);

  // Fetch teacher sections using staffId
  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!user || user.role !== 'Teacher' || !staffId || !user.school_id) return;
      try {
        const { data, error } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('teacher_id', staffId)
          .eq('school_id', user.school_id);
        if (error) throw error;
        if (data && data.length > 0) {
          setTeacherSections(data.map(s => ({ ...s, id: String(s.id), class_id: String(s.class_id) })));
          // Determine unique classes linked to the teacher
          const uniqueClassIds = Array.from(new Set(data.map(s => String(s.class_id))));
          if (uniqueClassIds.length === 1) {
            const onlyClassId = uniqueClassIds[0];
            // Auto-select class if not already selected
            if (!selectedClass) {
              setSelectedClass(onlyClassId);
            }
            // If exactly one section in that class is linked to the teacher, auto-select it
            const sectionsInOnlyClass = data.filter(s => String(s.class_id) === String(onlyClassId));
            if (!selectedSection && sectionsInOnlyClass.length === 1) {
              setSelectedSection(String(sectionsInOnlyClass[0].id));
            }
          }
        } else {
          setTeacherSections([]);
          toast.showToast('No section assigned to you. Please contact admin.', 'error');
        }
      } catch (error) {
        toast.showToast('Failed to fetch your assigned sections', 'error');
      }
    };
    fetchTeacherSections();
    // eslint-disable-next-line
  }, [user, staffId]);

  // Fetch teacher classes using staffId
  useEffect(() => {
    const fetchTeacherClasses = async () => {
      if (user?.role !== 'Teacher' || teacherSections.length === 0 || !user.school_id) return;
      const classIds = Array.from(new Set(teacherSections.map(s => s.class_id)));
      if (classIds.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, has_sections')
          .in('id', classIds)
          .eq('school_id', user.school_id);
        if (error) throw error;
        const sortedClasses = sortClasses(data || []);
        setTeacherClasses(sortedClasses.map(c => ({ ...c, id: String(c.id) })));
      } catch (error) {
        setTeacherClasses([]);
      }
    };
    fetchTeacherClasses();
    // eslint-disable-next-line
  }, [teacherSections, user]);

  // Fetch classes
  useEffect(() => {
    if (!user?.school_id) return;
    const fetchClasses = async () => {
      try {
        let query = supabase
          .from('classes')
          .select('id, name, has_sections')
          .eq('school_id', user.school_id);
        
        // For teachers, only show classes they're assigned to
        if (user.role === 'Teacher' && teacherClasses.length > 0) {
          const classIds = teacherClasses.map(c => c.id);
          query = query.in('id', classIds);
        }
        
        const { data, error } = await query;
        if (!error && data) {
          const sortedClasses = sortClasses(data);
          setClasses(sortedClasses);
        }
      } catch (error) {
      }
    };
    fetchClasses();
  }, [user?.school_id, user?.role, teacherClasses]);

  // Fetch sections when class is selected
  useEffect(() => {
    if (!selectedClass || !user?.school_id) {
      setSections([]);
      return;
    }
    const fetchSections = async () => {
      try {
        let query = supabase
          .from('sections')
          .select('id, name')
          .eq('class_id', selectedClass)
          .eq('school_id', user.school_id)
          .order('name');
        
        // For teachers, only show sections they're assigned to
        if (user.role === 'Teacher' && staffId) {
          query = query.eq('teacher_id', staffId);
        }
        
        const { data, error } = await query;
        if (!error && data) {
          setSections(data);
        }
      } catch (error) {
      }
    };
    fetchSections();
  }, [selectedClass, user?.school_id, user?.role, staffId]);

  // Fetch students
  const fetchPersons = useCallback(async () => {
    if (!date || !user?.school_id || !sessionId) return;
    
    setLoadingPersons(true);
    try {
      // Sunday check is now done in useEffect to prevent multiple toasts
      if (isSunday(parseISO(date))) {
        setPersons([]);
        setLoadingPersons(false);
        return;
      }

      if (!selectedClass) {
        setPersons([]);
        setLoadingPersons(false);
        return;
      }
      
      const classList = user?.role === 'Teacher' ? teacherClasses : classes;
      const selectedClassObj = classList.find(c => String(c.id) === String(selectedClass)) || classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;
      
      if (hasSections && !selectedSection) {
        setPersons([]);
        setLoadingPersons(false);
        return;
      }

      // Fetch students
      let schQuery = supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', sessionId)
        .eq('new_class_id', selectedClass)
        .eq('school_id', user.school_id);
      
      if (hasSections) {
        schQuery = schQuery.eq('new_section_id', selectedSection);
      } else {
        schQuery = schQuery.is('new_section_id', null);
      }
      
      const { data: schData, error: schError } = await schQuery;
      if (schError) throw schError;

      if (!schData || schData.length === 0) {
        setPersons([]);
        setLoadingPersons(false);
        return;
      }

      const studentIds = schData.map(sch => sch.student_id);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, father_name, picture_url')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Fetch existing half leaves
      const { data: halfLeavesData } = await supabase
        .from('half_leaves')
        .select('person_id, leave_type, remarks, arrival_time, departure_time')
        .eq('person_type', 'student')
        .eq('date', date)
        .eq('session_id', sessionId)
        .in('person_id', studentIds);

      const halfLeavesMap = new Map();
      (halfLeavesData || []).forEach((hl: any) => {
        halfLeavesMap.set(hl.person_id, { 
          leave_type: hl.leave_type, 
          remarks: hl.remarks,
          arrival_time: hl.arrival_time || null,
          departure_time: hl.departure_time || null
        });
      });

      const formattedPersons = (studentsData || []).map((student: any) => {
        const hl = halfLeavesMap.get(student.id);
        return {
          id: student.id,
          name: student.name,
          father_name: student.father_name,
          picture_url: student.picture_url,
          leave_type: hl ? hl.leave_type : null,
          remarks: hl ? hl.remarks : '',
          arrival_time: hl ? hl.arrival_time : null,
          departure_time: hl ? hl.departure_time : null,
        };
      }).sort((a, b) => a.id - b.id);

      setPersons(formattedPersons);
    } catch (error) {
      toast.showToast('Failed to fetch students', 'error');
    } finally {
      setLoadingPersons(false);
    }
  }, [date, selectedClass, selectedSection, sessionId, user?.school_id, classes, teacherClasses, toast]);

  // Ensure selectedSection aligns with selectedClass for teachers
  useEffect(() => {
    if (user?.role !== 'Teacher') return;
    if (!selectedClass) return;
    if (!selectedSection) return;
    const isValid = teacherSections.some(
      (s) => String(s.id) === String(selectedSection) && String(s.class_id) === String(selectedClass)
    );
    if (!isValid) {
      setSelectedSection('');
    }
  }, [selectedClass, selectedSection, teacherSections, user?.role]);

  // Auto-select the only available section for the selected class (teacher),
  // but only when the teacher is linked to exactly one class
  useEffect(() => {
    if (user?.role !== 'Teacher') return;
    if (!selectedClass) return;
    const uniqueClassIds = Array.from(new Set(teacherSections.map(s => String(s.class_id))));
    if (uniqueClassIds.length !== 1) return;
    if (!selectedSection && sections.length === 1) {
      setSelectedSection(sections[0].id.toString());
    }
  }, [sections, selectedClass, selectedSection, user?.role, teacherSections]);

  // Check for Sunday when date changes - show error only once per date
  useEffect(() => {
    if (!date) return;
    
    const isDateSunday = isSunday(parseISO(date));
    
    if (isDateSunday) {
      // Only show toast once per date change - show if ref is null or different date
      if (lastSundayErrorDate.current !== date) {
        lastSundayErrorDate.current = date;
        setPersons([]);
        toast.showToast('Selected date is a Sunday', 'error');
      }
    } else {
      // Reset the ref when date is not Sunday
      lastSundayErrorDate.current = null;
    }
  }, [date, toast]);

  // Check for Sunday when class changes - show error if date is Sunday
  useEffect(() => {
    if (!date || !selectedClass) return;
    
    const isDateSunday = isSunday(parseISO(date));
    
    if (isDateSunday && lastSundayErrorDate.current !== date) {
      lastSundayErrorDate.current = date;
      toast.showToast('Selected date is a Sunday', 'error');
      setPersons([]);
    }
  }, [selectedClass, date, toast]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (!selectedClass || (sections.length > 0 && !selectedSection)) {
      setPersons([]);
      return;
    }
    if (date && sessionId) {
      // Skip if Sunday (error already shown in separate useEffect)
      if (isSunday(parseISO(date))) {
        setPersons([]);
        return;
      }
      fetchPersons();
    }
  }, [date, selectedClass, selectedSection, sessionId, fetchPersons, sections.length]);

  // Handle leave type change
  const handleLeaveTypeChange = (personId: number, leaveType: 'first_half' | 'second_half' | null) => {
    // Get current time in HH:mm format
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setPersons(prev =>
      prev.map(p =>
        p.id === personId
          ? { 
              ...p, 
              leave_type: leaveType,
              // Students only have second_half (half leave)
              // Second half leave = present in morning, leaves at half day (departure_time)
              arrival_time: null,
              departure_time: leaveType === null ? null : (leaveType === 'second_half' ? (p.departure_time || currentTime) : null)
            }
          : p
      )
    );
  };

  // Handle time change
  const handleTimeChange = (personId: number, timeType: 'arrival_time' | 'departure_time', value: string) => {
    setPersons(prev =>
      prev.map(p =>
        p.id === personId
          ? { ...p, [timeType]: value || null }
          : p
      )
    );
  };

  // Save half leaves
  const handleSave = useCallback(async () => {
    if (!date || !user?.school_id || !sessionId) {
      toast.showToast('Please select date and ensure session is active', 'error');
      return;
    }

    setSaving(true);
    try {
      const personsWithLeaves = persons.filter(p => p.leave_type !== null);
      
      if (personsWithLeaves.length === 0) {
        toast.showToast('No half leaves to save', 'success');
        setSaving(false);
        return;
      }

      // Delete existing records for this date and session
      const personIds = personsWithLeaves.map(p => p.id);
      await supabase
        .from('half_leaves')
        .delete()
        .eq('person_type', 'student')
        .eq('date', date)
        .eq('session_id', sessionId)
        .in('person_id', personIds);

      // Insert new records
      // Students only have second_half (half leave) = present in morning, leaves at half day (departure_time)
      const recordsToInsert = personsWithLeaves.map(p => ({
        person_type: 'student',
        person_id: p.id,
        session_id: sessionId,
        date: date,
        leave_type: p.leave_type,
        remarks: p.remarks || null,
        arrival_time: null,
        departure_time: p.leave_type === 'second_half' ? (p.departure_time || null) : null,
        school_id: user.school_id,
      }));

      const { error: insertError } = await supabase
        .from('half_leaves')
        .insert(recordsToInsert);

      if (insertError) throw insertError;

      toast.showToast(`Successfully saved ${personsWithLeaves.length} half leave(s)`, 'success');
      fetchPersons();
    } catch (error) {
      toast.showToast('Failed to save half leaves', 'error');
    } finally {
      setSaving(false);
    }
  }, [date, user?.school_id, sessionId, persons, fetchPersons, toast]);

  // Delete half leaves
  const handleDelete = useCallback(async () => {
    if (!date || !user?.school_id || !sessionId) {
      toast.showToast('Please select date and ensure session is active', 'error');
      return;
    }

    // Check if class/section is selected
    if (!selectedClass) {
      toast.showToast('Please select class', 'error');
      return;
    }
    const classList = user?.role === 'Teacher' ? teacherClasses : classes;
    const selectedClassObj = classList.find(c => String(c.id) === String(selectedClass)) || classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;
    if (hasSections && !selectedSection) {
      toast.showToast('Please select section', 'error');
      return;
    }

    setDeleting(true);
    try {
      // Delete all half leaves for the selected date, session, and students
      let deleteQuery = supabase
        .from('half_leaves')
        .delete()
        .eq('person_type', 'student')
        .eq('date', date)
        .eq('session_id', sessionId)
        .eq('school_id', user.school_id);

      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw deleteError;

      // Clear all leave types from persons
      setPersons(prev => prev.map(p => ({ ...p, leave_type: null })));

      toast.showToast('Half leaves deleted successfully', 'success');
      fetchPersons();
    } catch (error) {
      toast.showToast('Failed to delete half leaves', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [date, user?.school_id, sessionId, selectedClass, selectedSection, user?.role, teacherClasses, classes, fetchPersons, toast]);

  // Filter persons by search term
  const filteredPersons = persons.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.father_name && p.father_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Determine if teacher has only one section
  const teacherHasSingleSection = user?.role === 'Teacher' && teacherSections.length === 1;
  
  // Determine if teacher has multiple classes
  const teacherHasMultipleClasses = user?.role === 'Teacher' && teacherClasses.length > 1;
  
  // Determine if selected class has only one section (for teachers)
  // Only disable if class is selected AND it has exactly one section AND teacher doesn't have multiple classes
  const selectedClassHasSingleSection = !!(user?.role === 'Teacher' && selectedClass && sections.length === 1 && !teacherHasMultipleClasses);

  // Stats
  const totalPersons = filteredPersons.length;
  const secondHalfCount = filteredPersons.filter(p => p.leave_type === 'second_half').length;

  // Memoized handlers for footer
  const handleRefresh = useCallback(() => {
    setSearchTerm('');
    fetchPersons();
  }, [fetchPersons]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  // Set global footer content
  useEffect(() => {
    const canDelete = persons.length > 0 && 
      !deleting && 
      date && 
      sessionId &&
      persons.filter(p => p.leave_type !== null).length > 0 &&
      selectedClass && 
      ((user?.role === 'Teacher' ? teacherClasses : classes).find(c => String(c.id) === String(selectedClass))?.has_sections ?? true ? selectedSection : true);

    const FooterContent = React.memo(() => {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '4px 8px' : '6px 10px',
          gap: '6px',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {!isMobile && (
            <div style={{ fontSize: '0.86rem', color: theme.TEXT_SECONDARY, fontWeight: 600 }}>
              Total: {totalPersons} | Half Leave: {secondHalfCount}
            </div>
          )}
          <SegmentedGroup
            theme={theme}
            style={isMobile
              ? { marginTop: 2, width: '100%', justifyContent: 'center', overflow: 'hidden' }
              : { marginTop: 0, justifyContent: 'flex-end' }
            }
          >
            <SegmentedButton
              theme={theme}
              first
              onClick={handleRefresh}
              disabled={loadingPersons}
            >
              <Refresh style={{ fontSize: isMobile ? 14 : 16 }} />
              Refresh
            </SegmentedButton>
            <SegmentedButton
              theme={theme}
              onClick={handleDeleteClick}
              disabled={!canDelete}
              style={{ 
                color: '#fff', 
                background: '#dc2626', 
                borderColor: '#dc2626', 
                fontWeight: 700,
                opacity: canDelete ? 0.93 : 0.6
              }}
            >
              {deleting ? (
                <div style={{
                  width: 16,
                  height: 16,
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Delete style={{ fontSize: isMobile ? 14 : 16 }} />
              )}
              {deleting ? 'Deleting...' : 'Delete'}
            </SegmentedButton>
            <SegmentedButton
              theme={theme}
              last
              onClick={handleSave}
              disabled={saving || loadingPersons}
              style={{ 
                color: '#fff', 
                background: '#16a34a', 
                borderColor: '#16a34a', 
                fontWeight: 700,
                opacity: (saving || loadingPersons) ? 0.6 : 0.93
              }}
            >
              {saving ? (
                <div style={{
                  width: 16,
                  height: 16,
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Save style={{ fontSize: isMobile ? 14 : 16 }} />
              )}
              {saving ? 'Saving...' : 'Save'}
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
  }, [totalPersons, secondHalfCount, isMobile, theme, loadingPersons, deleting, saving, date, sessionId, selectedClass, selectedSection, persons, user?.role, teacherClasses, classes, handleSave, handleRefresh, handleDeleteClick]);

  // Set footer loading state when loading
  useEffect(() => {
    if (loadingSession || loadingPersons) {
      setFooterContent({
        visible: true,
        loading: true,
      });
    } else {
      // Clear footer loading when not loading (actual footer content will be set by the footer useEffect)
      if (!selectedClass || !date) {
        setFooterContent(null);
      }
    }
  }, [loadingSession, loadingPersons, selectedClass, date, setFooterContent]);

  if (loadingSession) {
    return <Loader />;
  }

  if (!hasActiveSession) {
    return (
      <PageContainer theme={theme}>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AccessTime style={{ fontSize: 20 }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: theme.TEXT_PRIMARY }}>
              Student Half Leaves Management
            </span>
          </div>
        </Header>
        <MainContent>
          <NoSessionsFound />
        </MainContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer theme={theme}>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isMobile && (
            <h2 style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: 1, color: theme.ACCENT, margin: 0 }}>
              Student Half Leaves Management
            </h2>
          )}
        </div>
        {isMobile ? (
          <>
            <SegmentedGroup theme={theme}>
              <SegmentedInput
                theme={theme}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                first
              />
              <SegmentedSelect
                theme={theme}
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
                disabled={user?.role === 'Teacher' ? teacherHasSingleSection : false}
              >
                <option value="">Class</option>
                {(user?.role === 'Teacher' ? teacherClasses : classes).map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </SegmentedSelect>
              {sections.length > 0 && (
                <SegmentedSelect
                  theme={theme}
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={!selectedClass ? true : (user?.role === 'Teacher' ? selectedClassHasSingleSection : false)}
                >
                  <option value="">Section</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </SegmentedSelect>
              )}
              <SegmentedInput
                theme={theme}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                last
              />
            </SegmentedGroup>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              gap: 12,
              fontSize: '0.89rem',
              color: theme.TEXT_SECONDARY,
              fontWeight: 600,
              marginTop: 8,
              textAlign: 'center'
            }}>
              <span>Total: {totalPersons}</span>
              <span>| Half Leave: {secondHalfCount}</span>
            </div>
          </>
        ) : (
          <SegmentedGroup theme={theme}>
            <SegmentedInput
              theme={theme}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <SegmentedSelect
              theme={theme}
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              disabled={user?.role === 'Teacher' && teacherClasses.length === 1}
            >
              <option value="">Select Class</option>
              {(user?.role === 'Teacher' ? teacherClasses : classes).map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </SegmentedSelect>
            {sections.length > 0 && (
              <SegmentedSelect
                theme={theme}
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedClass ? true : (user?.role === 'Teacher' ? selectedClassHasSingleSection : false)}
              >
                <option value="">Select Section</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </SegmentedSelect>
            )}
            <SegmentedInput
              theme={theme}
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              last
            />
          </SegmentedGroup>
        )}
      </Header>
      <MainContent>
        {(() => {
          // Show message when date is Sunday
          if (date && isSunday(parseISO(date))) {
            return (
              <div style={{
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '60vh', 
                width: '100%', 
                textAlign: 'center', 
                color: theme.TEXT_SECONDARY, 
                fontWeight: 600
              }}>
                <CalendarToday style={{ fontSize: 54, color: '#dc2626', marginBottom: 12 }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#dc2626' }}>
                  Selected date is a Sunday
                </div>
                <div style={{ fontSize: '1rem', marginTop: 8, color: theme.TEXT_SECONDARY }}>
                  Please select a different date to manage half leaves.
                </div>
              </div>
            );
          }

          // Show message when no class is selected
          if (!selectedClass) {
            return (
              <div style={{
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '60vh', 
                width: '100%', 
                textAlign: 'center', 
                color: theme.TEXT_SECONDARY, 
                fontWeight: 600
              }}>
                <Class style={{ fontSize: 54, color: theme.ACCENT, marginBottom: 12 }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: theme.TEXT_PRIMARY }}>
                  Select a class to manage half leaves
                </div>
                <div style={{ fontSize: '1rem', marginTop: 8, color: theme.TEXT_SECONDARY }}>
                  Students will appear here once you select a class.
                </div>
              </div>
            );
          }

          // Show message when class is selected but no section is selected
          if (selectedClass) {
            const classList = user?.role === 'Teacher' ? teacherClasses : classes;
            const selectedClassObj = classList.find(c => String(c.id) === String(selectedClass)) || classes.find(c => String(c.id) === String(selectedClass));
            const hasSections = selectedClassObj?.has_sections ?? true;
            
            if (hasSections && !selectedSection) {
              return (
                <div style={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minHeight: '60vh', 
                  width: '100%', 
                  textAlign: 'center', 
                  color: theme.TEXT_SECONDARY, 
                  fontWeight: 600
                }}>
                  <Groups style={{ fontSize: 54, color: theme.ACCENT, marginBottom: 12 }} />
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: theme.TEXT_PRIMARY }}>
                    Select a section to manage half leaves
                  </div>
                  <div style={{ fontSize: '1rem', marginTop: 8, color: theme.TEXT_SECONDARY }}>
                    Students will appear here once you select a section.
                  </div>
                </div>
              );
            }
          }

          // Show loading state
          if (loadingPersons) {
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, width: '100%', paddingBottom: { xs: '5.5rem', sm: 0 } }}>
                {Array.from({ length: isMobile ? 6 : 8 }, (_, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      bgcolor: 'background.paper',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: 'divider',
                      padding: 1,
                    }}
                  >
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Skeleton variant="text" width={150} height={20} />
                      <Skeleton variant="text" width={100} height={16} />
                    </Box>
                    <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
                  </Box>
                ))}
              </Box>
            );
          }

          // Show empty state when no persons found
          if (filteredPersons.length === 0) {
            return (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '3rem 0', 
                color: theme.TEXT_SECONDARY, 
                fontWeight: 600 
              }}>
                <School style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: theme.TEXT_PRIMARY }}>
                  No students found in selected class/section
                </div>
                <div style={{ fontSize: '0.95rem', marginTop: 8, color: theme.TEXT_SECONDARY }}>
                  Please select a different class or section
                </div>
              </div>
            );
          }

          // Show persons list
          return (
            <>
              <StatsBar theme={theme}>
                <StatItem>
                  <StatLabel theme={theme}>Total Students</StatLabel>
                  <StatValue theme={theme}>{totalPersons}</StatValue>
                </StatItem>
                <StatItem>
                  <StatLabel theme={theme}>Half Leave</StatLabel>
                  <StatValue theme={theme} style={{ color: '#8b5cf6' }}>{secondHalfCount}</StatValue>
                </StatItem>
              </StatsBar>

              <PersonList>
                {filteredPersons.map((person) => {
                  if (isMobile) {
                    // Mobile layout matching MarkAttendance style
                    return (
                      <MobilePersonCard key={person.id} theme={theme}>
                        <MobileCardTopRow>
                          <MobileAvatar theme={theme}>
                            {person.picture_url ? (
                              <img src={person.picture_url} alt={person.name} />
                            ) : (
                              person.name.charAt(0).toUpperCase()
                            )}
                          </MobileAvatar>
                          <MobilePersonInfo theme={theme}>
                            <MobilePersonName theme={theme}>{person.name}</MobilePersonName>
                            <MobilePersonDetails theme={theme}>
                              {person.father_name}
                            </MobilePersonDetails>
                          </MobilePersonInfo>
                          <MobileLeaveTypeButtons>
                            <MobileLeaveTypeButton
                              theme={theme}
                              $active={person.leave_type === 'second_half'}
                              $color="#8b5cf6"
                              onClick={() => handleLeaveTypeChange(
                                person.id,
                                person.leave_type === 'second_half' ? null : 'second_half'
                              )}
                            >
                              Half Leave
                            </MobileLeaveTypeButton>
                          </MobileLeaveTypeButtons>
                        </MobileCardTopRow>
                        {person.leave_type && (
                          <MobileTimeInputContainer theme={theme}>
                            {person.leave_type === 'second_half' && (
                              <MobileTimeInputGroup>
                                <MobileTimeLabel theme={theme}>Departure Time:</MobileTimeLabel>
                                <MobileTimeInput
                                  theme={theme}
                                  type="time"
                                  value={person.departure_time || ''}
                                  onChange={(e) => handleTimeChange(person.id, 'departure_time', e.target.value)}
                                />
                              </MobileTimeInputGroup>
                            )}
                          </MobileTimeInputContainer>
                        )}
                      </MobilePersonCard>
                    );
                  }
                  
                  // Desktop layout
                  return (
                    <PersonCard key={person.id} theme={theme}>
                      <Avatar theme={theme}>
                        {person.picture_url ? (
                          <img src={person.picture_url} alt={person.name} />
                        ) : (
                          person.name.charAt(0).toUpperCase()
                        )}
                      </Avatar>
                      <PersonInfo theme={theme}>
                        <PersonName theme={theme}>{person.name}</PersonName>
                        <PersonDetails theme={theme}>
                          {person.father_name}
                        </PersonDetails>
                      </PersonInfo>
                      <DesktopButtonRow>
                        {person.leave_type && (
                          <DesktopTimeInputGroup>
                            {person.leave_type === 'second_half' && (
                              <>
                                <TimeLabel theme={theme}>Departure Time:</TimeLabel>
                                <TimeInput
                                  theme={theme}
                                  type="time"
                                  value={person.departure_time || ''}
                                  onChange={(e) => handleTimeChange(person.id, 'departure_time', e.target.value)}
                                />
                              </>
                            )}
                          </DesktopTimeInputGroup>
                        )}
                        <LeaveTypeButtons>
                          <LeaveTypeButton
                            theme={theme}
                            $active={person.leave_type === 'second_half'}
                            $color="#8b5cf6"
                            onClick={() => handleLeaveTypeChange(
                              person.id,
                              person.leave_type === 'second_half' ? null : 'second_half'
                            )}
                          >
                            Half Leave
                          </LeaveTypeButton>
                        </LeaveTypeButtons>
                      </DesktopButtonRow>
                      {person.leave_type && (
                        <TimeInputContainer theme={theme}>
                          {person.leave_type === 'second_half' && (
                            <TimeInputGroup>
                              <TimeLabel theme={theme}>Departure Time:</TimeLabel>
                              <TimeInput
                                theme={theme}
                                type="time"
                                value={person.departure_time || ''}
                                onChange={(e) => handleTimeChange(person.id, 'departure_time', e.target.value)}
                              />
                            </TimeInputGroup>
                          )}
                        </TimeInputContainer>
                      )}
                    </PersonCard>
                  );
                })}
              </PersonList>
            </>
          );
        })()}
      </MainContent>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <>
          <Overlay onClick={() => setShowDeleteConfirm(false)} />
          <ConfirmationDialog theme={theme}>
            <DialogTitle theme={theme}>Delete Half Leaves</DialogTitle>
            <DialogContent theme={theme}>
              Are you sure you want to delete all half leave records for the selected class, section, and the selected date? This action cannot be undone.
            </DialogContent>
            <DialogButtons>
              <DialogButton theme={theme} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </DialogButton>
              <DialogButton theme={theme} $variant="danger" onClick={handleDelete}>
                Delete
              </DialogButton>
            </DialogButtons>
          </ConfirmationDialog>
        </>
      )}
    </PageContainer>
  );
};

export default HalfLeaves;
