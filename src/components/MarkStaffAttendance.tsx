import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, useProgress, darkTheme, lightTheme } from './Layout';
import { useToast } from './useToast';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import { format, isSunday, parseISO } from 'date-fns';
import {
  CheckCircle,
  Cancel,
  RemoveCircle,
  Info,
  Person,
  CalendarToday,
  Groups,
  Search,
  CheckCircleOutline,
  CancelOutlined,
  HourglassEmpty,
  Delete,
  Save,
  Refresh,
  Close,
  Work
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from './NoSessionsFound';
import Loader from '../components/Loader';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow: hidden; /* Prevent container scroll - let MainContent handle it */
  min-height: 0; /* Critical for flex children */
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 10px 12px;
  min-height: auto;
  
  @media (max-width: 700px) {
    padding: 8px 10px;
    gap: 6px;
  }
`;

const MainContent = styled.div`
  flex: 1; /* Fill remaining space */
  min-height: 0; /* Critical - allows flex child to shrink below content size */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0 8px 0;
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

// Mobile block styles
const MobileStaffList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 1rem;
`;

const MobileStaffCard = styled.div<{ $isOnHoliday?: boolean }>`
  display: flex;
  align-items: center;
  background: ${({ theme, $isOnHoliday }: { theme: any; $isOnHoliday?: boolean }) => 
    $isOnHoliday ? `${theme.CARD}80` : theme.CARD};
  border-radius: 12px;
  box-shadow: ${({ theme }: { theme: any }) => theme.SHADOW};
  border: 1px solid ${({ theme, $isOnHoliday }: { theme: any; $isOnHoliday?: boolean }) => 
    $isOnHoliday ? `${theme.BORDER}60` : theme.BORDER};
  padding: 0.5rem 0.7rem;
  gap: 0.7rem;
  font-size: 0.93rem;
  width: 100%;
  min-width: 320px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  cursor: ${({ $isOnHoliday }) => $isOnHoliday ? 'not-allowed' : 'pointer'};
  opacity: ${({ $isOnHoliday }) => $isOnHoliday ? 0.6 : 1};
  
  &:hover {
    background: ${({ theme, $isOnHoliday }: { theme: any; $isOnHoliday?: boolean }) => 
      $isOnHoliday ? `${theme.CARD}80` : `${theme.ACCENT}25`};
    border-color: ${({ theme, $isOnHoliday }: { theme: any; $isOnHoliday?: boolean }) => 
      $isOnHoliday ? `${theme.BORDER}60` : `${theme.ACCENT}40`};
  }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  margin-right: 0.7rem;
`;

const MobileAvatar = styled(Avatar)`
  width: 28px;
  height: 28px;
  font-size: 0.93rem;
`;

const NameBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
`;

const StaffName = styled.span`
  font-weight: 700;
  font-size: 0.97rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StaffRole = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-top: 0.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Status button styles
const MobileStatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 0.3rem;
  width: 128px;
`;

const EnhancedStatusButton = styled.button<{ $active: boolean; $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $active, $color }) => $active ? $color : 'transparent'};
  color: ${({ $active, $color }) => $active ? '#fff' : $color};
  border: 1.5px solid ${({ $color }) => $color};
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ $active, $color }) => $active ? `0 0 6px 1.5px ${$color}55` : 'none'};
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
  &:hover, &:focus {
    background: ${({ $color }) => $color};
    color: #fff;
    outline: none;
    box-shadow: 0 0 6px 1.5px ${({ $color }) => $color}55;
  }
`;

// Desktop status button styles
const DesktopStatusRow = styled.div`
  display: flex;
  gap: 0.6rem;
  margin-left: auto;
`;

const DesktopStatusButton = styled.button<{ $active: boolean; $color: string }>`
  min-width: 90px;
  padding: 0.45rem 1.1rem;
  border-radius: 22px;
  background: ${({ $active, $color }) => $active ? $color : 'transparent'};
  color: ${({ $active, $color }) => $active ? '#fff' : $color};
  border: 1.5px solid ${({ $color }) => $color};
  font-size: 1.01rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ $active, $color }) => $active ? `0 0 8px 2px ${$color}33` : 'none'};
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
  &:hover, &:focus {
    background: ${({ $color }) => $color};
    color: #fff;
    outline: none;
    box-shadow: 0 0 8px 2px ${({ $color }) => $color}33;
  }
`;

const CheckoutTimeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.08)'};
  color: ${({ theme }) => theme.ACCENT};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(59,130,246,0.28)' : 'rgba(59,130,246,0.18)'};
`;

const CheckoutButton = styled.button`
  min-width: 90px;
  padding: 0.4rem 0.85rem;
  border-radius: 18px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)'};
  color: ${({ theme }) => theme.ACCENT};
  border: 1.5px solid ${({ theme }) => theme.ACCENT};
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition: all 0.18s ease;
  &:hover, &:focus {
    background: ${({ theme }) => theme.ACCENT};
    color: #fff;
    outline: none;
  }
`;

// Serial checkbox for selection
const SerialCheckbox = styled.div`
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  border: 2px solid ${({ theme }) => theme.ACCENT};
  background: ${({ theme }) => theme.FIELD_BG};
  transition: all 0.2s ease;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};

  &:hover {
    background: ${({ theme }) => theme.ACCENT}15;
    transform: scale(1.05);
  }

  &.checked {
    background: ${({ theme }) => theme.ACCENT};
    color: white;
  }

  @media (max-width: 700px) {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
  }
`;

// Move bounceAnimation to the top, before any styled components use it
const bounceAnimation = `
  @keyframes bounceAttention {
    0%, 100% { transform: scale(1); }
    10% { transform: scale(1.08, 0.92); }
    20% { transform: scale(0.92, 1.08); }
    30% { transform: scale(1.04, 0.96); }
    40% { transform: scale(0.98, 1.02); }
    50% { transform: scale(1.02, 0.98); }
    60% { transform: scale(1, 1); }
  }
`;

// Update swellAnimation to last 4 seconds
const swellAnimation = `
  @keyframes swell {
    0% { transform: scale(1); }
    100% { transform: scale(1.45); }
  }
`;

interface StaffMember {
  id: number;
  name: string;
  role: string;
  status?: 'present' | 'absent' | 'leave' | 'late';
  picture_url?: string;
  remarks?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  source?: string | null;
  isOnHoliday?: boolean;
  rfid_uid?: string | null;
  isOnLeave?: boolean;
  attendance_enabled?: boolean | null;
}

// Add a hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

const toInputTime = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return '';

  // Parse full timestamps into the browser's local timezone so saved manual
  // checkout/check-in times stay aligned with the user's region.
  if (raw.includes('T') || /[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
    }
  }

  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const buildLocalTimestamp = (date: string, value?: string | null) => {
  const normalized = toInputTime(value);
  if (!normalized) return null;

  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = normalized.split(':').map(Number);
  const localDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);

  if (Number.isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
};

const toDbTimestamp = (date: string, value?: string | null) => {
  return buildLocalTimestamp(date, value);
};

const currentTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const getManualAttendanceTimestamp = (date: string, existingValue?: string | null) => {
  if (existingValue) return existingValue;

  const today = format(new Date(), 'yyyy-MM-dd');
  if (date === today) {
    return toDbTimestamp(date, currentTimeValue());
  }

  return buildLocalTimestamp(date, '08:00');
};

// Segmented Group Styles
const SEGMENTED_HEIGHT = '32px';
const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
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
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
`;

const SegmentedInput = styled.input<{ pill?: boolean }>`
  ${SegmentedBase}
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  ${({ pill }) => pill && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  &:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }
  &:not(:first-child) {
    border-left: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    border-radius: 0;
    &:last-child {
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    }
    &:first-child {
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 1.12em;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
  }

  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
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
  background: ${({ active, theme }) => active ? theme.ACCENT : theme.BG};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1.5px solid ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  font-weight: ${({ active }) => active ? 700 : 400};
  &:hover, &:focus {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353535' : '#e5e7eb'};
    opacity: 0.92;
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
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    `}
    ${({ last }) => last && `
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    `}
  }
`;

// Spinner component
const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid #fff6;
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @media (prefers-reduced-motion: no-preference) {
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  }
`;

const MarkStaffAttendance: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const toast = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const { setFooterContent } = usePageFooter();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'manual_only' | 'rfid_ready' | 'on_leave'>('all');
  const [hoveredAvatar, setHoveredAvatar] = useState<{ id: number; x: number; y: number; url: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveButtonBounce, setSaveButtonBounce] = useState(false);
  const [hasAttendanceRecords, setHasAttendanceRecords] = useState(false);
  const [statusBounce, setStatusBounce] = useState<{ id: number; status: string } | null>(null);
  const [checkoutModalStaff, setCheckoutModalStaff] = useState<StaffMember | null>(null);
  const [checkoutTime, setCheckoutTime] = useState(currentTimeValue());
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [hasAnyStaff, setHasAnyStaff] = useState<boolean | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Stats - memoized to prevent unnecessary recalculations
  const statusHash = staffMembers.map(s => `${s.id}:${s.status || 'none'}`).join(',');
  const stats = React.useMemo(() => {
    return {
      total: staffMembers.length,
      present: staffMembers.filter(s => s.status === 'present').length,
      absent: staffMembers.filter(s => s.status === 'absent').length,
      leave: staffMembers.filter(s => s.status === 'leave').length,
      late: staffMembers.filter(s => s.status === 'late').length,
    };
  }, [staffMembers.length, statusHash]);
  
  const totalStaff = stats.total;
  const presentCount = stats.present;
  const absentCount = stats.absent;
  const leaveCount = stats.leave;
  const lateCount = stats.late;

  const didSetDefaultStatus = useRef(false);
  const didAutoSelect = useRef(false);
  const lastCheckedDate = useRef<string | null>(null);
  const isCheckingHoliday = useRef(false);
  const isFetchingStaff = useRef(false);

  useEffect(() => {
    if (!didSetDefaultStatus.current && staffMembers.length > 0) {
      setStaffMembers(prev => prev.map(s => ({ ...s, status: s.status || 'present' })));
      didSetDefaultStatus.current = true;
    }
    if (staffMembers.length > 0 && !didAutoSelect.current) {
      setSelectedRows(staffMembers.map(s => s.id));
      didAutoSelect.current = true;
    }
  }, [staffMembers]);

  useEffect(() => {
    didSetDefaultStatus.current = false;
  }, [date]);

  // Main data loading effect with progress bar
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      if (!user?.school_id) {
        setLoading(false);
        return;
      }
      const minDuration = 1500;
      const start = Date.now();
      startProgress(false);
      setProgress(10);
      
      // Fetch active session
      setProgress(20);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      if (sessionData) {
        setSessionId(sessionData.id);
        setHasActiveSession(true);
      } else {
        setHasActiveSession(false);
      }
      setLoadingSession(false);
      
      // Check for any active staff
      setProgress(60);
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, attendance_enabled')
        .eq('school_id', user.school_id)
        .eq('status', 'active');
      
      setHasAnyStaff((staffData || []).some((staff: any) => staff.attendance_enabled !== false));
      
      setProgress(100);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
      }
    };
    loadInitialData();
  }, [user?.school_id]);

  // Fetch active session on mount
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
      if (error && !(
        error.code === 'PGRST116' ||
        error.message?.includes('multiple (or no) rows returned') ||
        error.details?.includes('contains 0 rows')
      )) {
        setHasActiveSession(false);
      }
      setLoadingSession(false);
    };
    fetchSession();
  }, [user]);

  // Check for any active staff in the system (only if not already checked)
  useEffect(() => {
    const checkForAnyActiveStaff = async () => {
      if (!user?.school_id || hasAnyStaff !== null) return; // Skip if already checked
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, attendance_enabled')
        .eq('school_id', user.school_id)
        .eq('status', 'active');
      
      
      if (!staffError && staffData && staffData.some((staff: any) => staff.attendance_enabled !== false)) {
        setHasAnyStaff(true);
      } else {
        setHasAnyStaff(false);
      }
    };
    checkForAnyActiveStaff();
  }, [user?.school_id, hasAnyStaff]);

  const fetchStaff = useCallback(async () => {
    if (!date || !user?.school_id || !sessionId) {
      return;
    }
    // Prevent multiple simultaneous calls using ref (state is async)
    if (isFetchingStaff.current) {
      return;
    }
    isFetchingStaff.current = true;
    setLoadingStaff(true);
    isCheckingHoliday.current = true;
    try {
      // First check if it's a Sunday
      if (isSunday(parseISO(date))) {
        toast.showToast('Selected date is a Sunday', 'error');
        setStaffMembers([]);
        setLoadingStaff(false);
        isCheckingHoliday.current = false;
        isFetchingStaff.current = false;
        return;
      }

      // Fetch all staff members first
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role, picture_url, rfid_uid, attendance_enabled')
        .eq('school_id', user.school_id)
        .eq('status', 'active');

      if (staffError) {
        throw staffError;
      }

      const attendanceEligibleStaff = (staffData || []).filter((staff: any) => staff.attendance_enabled !== false);

      if (attendanceEligibleStaff.length === 0) {
        toast.showToast('No staff members are enabled for attendance', 'success');
        setStaffMembers([]);
        setLoadingStaff(false);
        isCheckingHoliday.current = false;
        isFetchingStaff.current = false;
        return;
      }

      // Check for holidays - get all holidays for the date range
      const { data: allHolidays } = await supabase
        .from('holidays')
        .select('id, name, start_date, end_date')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .lte('start_date', date)
        .gte('end_date', date);

      // Get holiday assignments if holidays exist
      let holidayStaffAssignments: any[] = [];
      let globalHolidays: any[] = [];
      
      if (allHolidays && allHolidays.length > 0) {
        const holidayIds = allHolidays.map(h => h.id);
        
        // Get holiday class assignments (to check for global holidays)
        const { data: allHolidayClassAssignments } = await supabase
          .from('holiday_classes')
          .select('holiday_id, school_id')
          .in('holiday_id', holidayIds);
        
        // Filter class assignments: include if school_id is null/undefined (legacy) or matches user's school_id
        const holidayClassAssignments = (allHolidayClassAssignments || []).filter(a => {
          return a.school_id === null || a.school_id === undefined || Number(a.school_id) === Number(user.school_id);
        });

        // Get holiday staff assignments
        const { data: staffAssignments } = await supabase
          .from('holiday_staff')
          .select('holiday_id, staff_id')
          .in('holiday_id', holidayIds);
        
        holidayStaffAssignments = staffAssignments || [];

        // Identify global holidays (no class assignments and no staff assignments)
        globalHolidays = allHolidays.filter(holiday => {
          const hasClassAssignments = holidayClassAssignments?.some(a => a.holiday_id === holiday.id) || false;
          const hasStaffAssignments = holidayStaffAssignments?.some(a => a.holiday_id === holiday.id) || false;
          return !hasClassAssignments && !hasStaffAssignments;
        });
      }

      // Filter staff members: exclude those who are on holiday
      const staffOnHoliday = new Set<number>();
      const holidayNames: string[] = [];

      // Check each staff member against holiday assignments
      attendanceEligibleStaff.forEach((staff: any) => {
        let isOnHoliday = false;
        let holidayName = '';

        // Check if staff is in a global holiday
        if (globalHolidays.length > 0) {
          isOnHoliday = true;
          holidayName = globalHolidays[0].name; // Use first global holiday name
        } else {
          // Check if staff is specifically assigned to any holiday
          const staffHolidayAssignment = holidayStaffAssignments.find(
            a => a.staff_id === staff.id
          );
          if (staffHolidayAssignment) {
            const holiday = allHolidays?.find(h => h.id === staffHolidayAssignment.holiday_id);
            if (holiday) {
              isOnHoliday = true;
              holidayName = holiday.name;
            }
          }
        }

        if (isOnHoliday) {
          staffOnHoliday.add(staff.id);
          if (holidayName && !holidayNames.includes(holidayName)) {
            holidayNames.push(holidayName);
          }
        }
      });

      // Keep all staff members but mark which ones are on holiday
      // If ALL staff are on holiday, show toast
      if (staffOnHoliday.size === attendanceEligibleStaff.length && staffOnHoliday.size > 0) {
        const holidayMessage = holidayNames.length > 0 
          ? `Selected date is a holiday: ${holidayNames.join(', ')}`
          : 'Selected date is a holiday';
        toast.showToast(holidayMessage, 'error');
      }

      // Fetch attendance records for this date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance_records')
        .select('staff_id, status, remarks, check_in_time, check_out_time, source')
        .eq('date', date)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId);

      if (attendanceError) {
        // Don't throw error for attendance records as table might not exist yet
      }

      const staffIds = attendanceEligibleStaff.map((staff: any) => staff.id);
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('staff_id')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .eq('status', 'approved')
        .in('staff_id', staffIds)
        .lte('start_date', date)
        .gte('end_date', date);

      // Merge attendance status into all staff (including those on holiday)
      const attendanceMap = new Map();
      (attendanceData || []).forEach((rec: any) => {
        attendanceMap.set(rec.staff_id, {
          status: rec.status,
          remarks: rec.remarks,
          check_in_time: rec.check_in_time,
          check_out_time: rec.check_out_time,
          source: rec.source
        });
      });
      const approvedLeaveSet = new Set((leaveData || []).map((leave: any) => leave.staff_id));
      
      const formattedStaff = attendanceEligibleStaff.map((staff: any) => {
        const att = attendanceMap.get(staff.id);
        const isOnHoliday = staffOnHoliday.has(staff.id);
        const isOnLeave = approvedLeaveSet.has(staff.id);
        return {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          status: att ? att.status : (isOnLeave ? 'leave' : undefined),
          picture_url: staff.picture_url,
          remarks: att ? att.remarks || '' : '',
          check_in_time: att ? att.check_in_time || null : null,
          check_out_time: att ? att.check_out_time || null : null,
          source: att ? att.source || null : null,
          isOnHoliday: isOnHoliday,
          rfid_uid: staff.rfid_uid,
          isOnLeave,
          attendance_enabled: staff.attendance_enabled,
        };
      }).sort((a, b) => {
        // First, sort by holiday status (non-holiday first)
        if (a.isOnHoliday !== b.isOnHoliday) {
          return a.isOnHoliday ? 1 : -1;
        }
        // Then sort by ID
        return a.id - b.id;
      });
      
      setStaffMembers(formattedStaff);
      setHasAttendanceRecords((attendanceData || []).length > 0);
    } catch (error) {
      toast.showToast('Failed to fetch staff', 'error');
    } finally {
      setLoadingStaff(false);
      isCheckingHoliday.current = false;
      isFetchingStaff.current = false;
    }
  }, [date, user?.school_id, sessionId]);

  const handleStatusChange = (staffId: number, status: 'present' | 'absent' | 'leave' | 'late') => {
    setStaffMembers(prev =>
      prev.map(staff =>
        staff.id === staffId
          ? ({
              ...staff,
              status: status.toLowerCase() as 'present' | 'absent' | 'leave' | 'late',
              check_in_time: status === 'present' || status === 'late'
                ? getManualAttendanceTimestamp(date, staff.check_in_time)
                : null,
              check_out_time: status === 'present' || status === 'late' ? staff.check_out_time : null,
              source: status === 'present' || status === 'late' ? (staff.source || 'manual') : 'manual'
            } as StaffMember)
          : staff
      )
    );
    setSelectedRows(prev => prev.includes(staffId) ? prev : [...prev, staffId]);
    setStatusBounce({ id: staffId, status: status.toLowerCase() });
    setTimeout(() => setStatusBounce(null), 600);
  };

  const handleBulkMark = useCallback((status: 'present' | 'absent' | 'leave') => {
    setStaffMembers(prev =>
      prev.map(staff => ({
        ...staff,
        status,
        check_in_time: status === 'present' ? getManualAttendanceTimestamp(date, staff.check_in_time) : null,
        check_out_time: status === 'present' ? staff.check_out_time : null,
        source: 'manual'
      }))
    );
  }, [date]);

  const handleOpenCheckoutModal = useCallback((staff: StaffMember) => {
    setCheckoutModalStaff(staff);
    setCheckoutTime(toInputTime(staff.check_out_time) || currentTimeValue());
  }, []);

  const handleConfirmCheckout = useCallback(() => {
    if (!checkoutModalStaff) return;

    const normalizedCheckout = toDbTimestamp(date, checkoutTime);
    if (!normalizedCheckout) {
      toast.showToast('Please select a valid checkout time', 'error');
      return;
    }

    setStaffMembers(prev =>
      prev.map(staff =>
        staff.id === checkoutModalStaff.id
          ? {
              ...staff,
              check_in_time: staff.check_in_time || getManualAttendanceTimestamp(date, staff.check_in_time),
              check_out_time: normalizedCheckout,
              status: staff.status === 'late' ? 'late' : 'present',
              source: staff.source || 'manual'
            }
          : staff
      )
    );
    setSelectedRows(prev => prev.includes(checkoutModalStaff.id) ? prev : [...prev, checkoutModalStaff.id]);
    setCheckoutModalStaff(null);
  }, [checkoutModalStaff, checkoutTime, date, toast]);

  const filteredStaff = staffMembers.filter(staff =>
    (
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase())
    ) &&
    (
      attendanceFilter === 'all' ||
      (attendanceFilter === 'manual_only' && !staff.rfid_uid) ||
      (attendanceFilter === 'rfid_ready' && !!staff.rfid_uid) ||
      (attendanceFilter === 'on_leave' && !!staff.isOnLeave)
    )
  );

  useEffect(() => {
    if (date && user?.school_id && sessionId && !isFetchingStaff.current) {
      fetchStaff();
    }
  }, [date, user?.school_id, sessionId, fetchStaff]);

  // Only consider staff who are not on holiday for "select all" functionality
  const availableStaffForSelection = filteredStaff.filter(s => !s.isOnHoliday);
  const allChecked = availableStaffForSelection.length > 0 && availableStaffForSelection.every(s => selectedRows.includes(s.id));
  
  const handleToggleSelectAll = () => {
    // Only select/deselect staff who are not on holiday
    const availableStaff = filteredStaff.filter(s => !s.isOnHoliday);
    if (allChecked) {
      setSelectedRows(prev => prev.filter(id => !availableStaff.some(s => s.id === id)));
      setStaffMembers(prev => prev.map(s => availableStaff.some(f => f.id === s.id) ? { ...s, status: undefined } : s));
    } else {
      setSelectedRows(prev => Array.from(new Set([...prev, ...availableStaff.map(s => s.id)])));
      setStaffMembers(prev => prev.map(s => availableStaff.some(f => f.id === s.id) ? { ...s, status: 'present' } : s));
    }
  };

  const handleSelectRow = (staffId: number) => {
    const staff = staffMembers.find(s => s.id === staffId);
    // Don't allow selection for staff on holiday
    if (staff?.isOnHoliday) {
      return;
    }
    setSelectedRows(prev => {
      if (prev.includes(staffId)) {
        setStaffMembers(staff => staff.map(s => s.id === staffId ? { ...s, status: undefined } : s));
        return prev.filter(id => id !== staffId);
      } else {
        setStaffMembers(staff => staff.map(s => s.id === staffId ? { ...s, status: 'present' } : s));
        return [...prev, staffId];
      }
    });
  };

  const handleRemarksChange = (staffId: number, value: string) => {
    setStaffMembers(prev => prev.map(s => s.id === staffId ? { ...s, remarks: value } : s));
  };

  const handleSave = useCallback(async () => {
    if (!date || !user?.school_id) {
      toast.showToast('Please select date', 'error');
      return;
    }
    if (!sessionId) {
      toast.showToast('No active session found. Please contact administrator.', 'error');
      return;
    }
    setSaving(true);
    
    startProgress(false);
    setProgress(10);
    
    try {
      const validStatuses = ['present', 'absent', 'leave', 'late'];
      // Filter staffMembers directly instead of using filteredStaff
      const staffToSave = staffMembers.filter(staff => {
        const matchesSearch = !searchTerm || 
          staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staff.role.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch && typeof staff.status === 'string' && validStatuses.includes(staff.status);
      });
      
      if (staffToSave.length === 0) {
        toast.showToast('No valid attendance records to save', 'error');
        return;
      }
      
      setProgress(30);
      const attendanceRecords = staffToSave.map(staff => ({
        staff_id: staff.id,
        date,
        status: typeof staff.status === 'string' ? staff.status.toLowerCase() : staff.status,
        remarks: staff.remarks || null,
        check_in_time: staff.status === 'present' || staff.status === 'late'
          ? getManualAttendanceTimestamp(date, staff.check_in_time)
          : null,
        check_out_time: toDbTimestamp(date, staff.check_out_time),
        source: staff.source || 'manual',
        created_at: new Date().toISOString(),
        session_id: sessionId,
        school_id: user.school_id,
      }));
      
      setProgress(50);
      // Delete existing records first to avoid conflicts
      const { error: deleteError } = await supabase
        .from('staff_attendance_records')
        .delete()
        .eq('date', date)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId);
      if (deleteError) throw deleteError;
      
      setProgress(70);
      // Insert new records
      const { error: insertError } = await supabase
        .from('staff_attendance_records')
        .insert(attendanceRecords);
      if (insertError) throw insertError;
      
      setProgress(90);
      setHasAttendanceRecords(true);
      toast.showToast('Staff attendance saved successfully', 'success');
      
      // Refresh the staff list to show updated status
      await fetchStaff();
      
      setProgress(100);
      completeProgress();
    } catch (error: any) {
      toast.showToast(error.message || 'Failed to save staff attendance', 'error');
      completeProgress();
    } finally {
      setSaving(false);
    }
  }, [date, user?.school_id, sessionId, staffMembers, searchTerm, fetchStaff, toast, startProgress, completeProgress]);

  const handleDelete = useCallback(async () => {
    if (!date || !user?.school_id) return;
    
    setDeleting(true);
    
    startProgress(false);
    setProgress(10);
    
    try {
      setProgress(50);
      const { error } = await supabase
        .from('staff_attendance_records')
        .delete()
        .eq('date', date)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId || 0);

      if (error) throw error;

      setProgress(80);
      // Set all staff to present after deletion
      setStaffMembers(prev => prev.map(s => ({ ...s, status: 'present' })));
      setHasAttendanceRecords(false);
      
      setProgress(100);
      completeProgress();
      toast.showToast('Staff attendance records deleted successfully', 'success');
    } catch (error) {
      toast.showToast('Failed to delete staff attendance records', 'error');
      completeProgress();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [date, user?.school_id, sessionId, toast, startProgress, completeProgress]);

  // Enter key submits
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  useEffect(() => {
    if (selectedRows.length > 0) {
      const interval = setInterval(() => {
        setSaveButtonBounce(true);
        setTimeout(() => setSaveButtonBounce(false), 600);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setSaveButtonBounce(false);
    }
  }, [selectedRows.length]);

  // Memoized handler for delete click
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  // Set footer content for global footer
  useEffect(() => {
    const FooterContent = React.memo(() => {
      // Check if all staff are on holiday
      const allStaffOnHoliday = staffMembers.length > 0 && staffMembers.every(s => s.isOnHoliday);
      
      // Don't show footer if all staff are on holiday
      if (allStaffOnHoliday) {
        return null;
      }
      
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center', 
          justifyContent: isMobile ? 'center' : 'space-between', 
          width: '100%',
          gap: isMobile ? '6px' : '8px',
          flexWrap: isMobile ? 'nowrap' : 'wrap'
        }}>
          <div style={{ 
            fontSize: isMobile ? '0.75rem' : '0.98rem', 
            color: themeObj.TEXT_SECONDARY, 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? 3 : 8, 
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-start',
            whiteSpace: isMobile ? 'nowrap' : 'normal'
          }}>
            <span>Total: {totalStaff}</span>
            <span>|</span>
            <span>Present: {presentCount}</span>
            <span>|</span>
            <span>Absent: {absentCount}</span>
            <span>|</span>
            <span>Leave: {leaveCount}</span>
            <span>|</span>
            <span>Late: {lateCount}</span>
          </div>
          <SegmentedGroup
            theme={themeObj}
            style={isMobile
              ? { width: '100%', justifyContent: 'center', overflowX: 'auto', marginTop: 0 }
              : { justifyContent: 'flex-end', marginTop: 0 }
            }
          >
            <SegmentedButton
              theme={themeObj}
              first
              onClick={() => handleBulkMark('present')}
              style={{ minWidth: 70, padding: '0.3rem 0.6em', fontSize: isMobile ? '0.7em' : '0.85em', minHeight: 28, justifyContent: 'center' }}
              disabled={allStaffOnHoliday || staffMembers.length === 0 || selectedRows.length === 0}
            >
              {!isMobile && <CheckCircle style={{ fontSize: 16, marginRight: 4 }} />}
              All Present
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              onClick={() => handleBulkMark('absent')}
              style={{ minWidth: 70, padding: '0.3rem 0.6em', fontSize: isMobile ? '0.7em' : '0.85em', minHeight: 28, justifyContent: 'center' }}
              disabled={allStaffOnHoliday || staffMembers.length === 0 || selectedRows.length === 0}
            >
              {!isMobile && <Cancel style={{ fontSize: 16, marginRight: 4 }} />}
              All Absent
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              onClick={() => handleBulkMark('leave')}
              style={{ minWidth: 70, padding: '0.3rem 0.6em', fontSize: isMobile ? '0.7em' : '0.85em', minHeight: 28, justifyContent: 'center' }}
              disabled={allStaffOnHoliday || staffMembers.length === 0 || selectedRows.length === 0}
            >
              Leave All
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              onClick={handleDeleteClick}
              disabled={allStaffOnHoliday || staffMembers.length === 0 || selectedRows.length === 0 || !date || deleting}
              style={{ minWidth: 90, padding: '0.3rem 0.6em', fontSize: '0.9em', color: '#fff', background: '#dc2626', borderColor: '#dc2626', minHeight: 28, opacity: 0.93 }}
            >
              {deleting ? <Spinner /> : <><Delete style={{ fontSize: 16, marginRight: 4 }} /> Delete</>}
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              last
              onClick={handleSave}
              disabled={allStaffOnHoliday || staffMembers.length === 0 || selectedRows.length === 0 || saving}
              style={{ minWidth: 90, padding: '0.3rem 0.6em', fontSize: '0.9em', color: '#fff', background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, minHeight: 28, opacity: 0.93 }}
            >
              {saving ? <Spinner /> : <><Save style={{ fontSize: 16, marginRight: 4 }} /> Save</>}
            </SegmentedButton>
          </SegmentedGroup>
        </div>
      );
    });

    const footerContent = <FooterContent />;
    // Check if footer should be visible (not all staff on holiday)
    const allStaffOnHoliday = staffMembers.length > 0 && staffMembers.every(s => s.isOnHoliday);
    
    setFooterContent({
      visible: !allStaffOnHoliday,
      content: footerContent
    });

    // Cleanup on unmount
    return () => {
      setFooterContent(null);
    };
  }, [
    totalStaff,
    presentCount,
    absentCount,
    leaveCount,
    lateCount,
    staffMembers,
    selectedRows.length,
    date,
    deleting,
    saving,
    isMobile,
    theme,
    setFooterContent,
    handleBulkMark,
    handleSave,
    handleDeleteClick
  ]);

  // Set footer loading state when loading
  useEffect(() => {
    if (loadingSession || loading) {
      setFooterContent({
        visible: true,
        loading: true,
      });
    } else {
      // Clear footer loading when not loading (actual footer content will be set by the footer useEffect)
      if (!date) {
        setFooterContent(null);
      }
    }
  }, [loadingSession, loading, date, setFooterContent]);

  // Show skeleton loader for any loading state
  if (loadingSession || loading) {
    return <Loader />;
  }

  if (!hasActiveSession) {
    return <NoSessionsFound />;
  }

  if (hasAnyStaff === false && !loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%', textAlign: 'center', color: '#888', fontWeight: 600
      }}>
        <Work style={{ fontSize: 54, color: '#6366f1', marginBottom: 12 }} />
        <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>No Staff Members Found</div>
        <div style={{ fontSize: '1rem', marginTop: 8, color: '#aaa' }}>Please add staff members to mark their attendance.</div>
      </div>
    );
  }

  return (
    <PageContainer>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isMobile && (
            <h2 style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: 1, color: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT, margin: 0 }}>
              Mark Staff Attendance
            </h2>
          )}
        </div>
        <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
          <SegmentedInput
            theme={theme === 'dark' ? darkTheme : lightTheme}
            type="date"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setDate(e.target.value);
            }}
            style={{ minWidth: 120 }}
          />
          <SegmentedInput
            theme={theme === 'dark' ? darkTheme : lightTheme}
            type="text"
            placeholder="Search by name or role..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(e.target.value);
            }}
            style={{ minWidth: 180 }}
          />
          <SegmentedSelect
            theme={theme === 'dark' ? darkTheme : lightTheme}
            value={attendanceFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAttendanceFilter(e.target.value as any)}
            style={{ minWidth: 130 }}
          >
            <option value="all">All</option>
            <option value="manual_only">No Card</option>
            <option value="rfid_ready">Has Card</option>
            <option value="on_leave">On Leave</option>
          </SegmentedSelect>
        </SegmentedGroup>
      </Header>
      
      <MainContent>
        <MobileStaffList>
          {/* Select All checkbox */}
          {filteredStaff.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px 12px', fontSize: '0.97em' }}>
              <SerialCheckbox
                className={allChecked ? 'checked' : ''}
                onClick={handleToggleSelectAll}
                title={allChecked ? 'Deselect all staff' : 'Select all staff'}
                style={{ fontSize: '0.6rem', fontWeight: 'bold' }}
              >
                {allChecked ? '✓' : '○'}
              </SerialCheckbox>
              <span style={{ userSelect: 'none', color: '#a0a7b8' }}>Select All</span>
            </div>
          )}
          
          {loadingStaff ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: 16 }}>
              <Spinner />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1.2px' }}>Loading staff…</div>
            </div>
          ) : staffMembers.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: '#888', fontWeight: 600
            }}>
              <span style={{ fontSize: 48, marginBottom: 12 }}>
                <Work />
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>No staff members found.</div>
            </div>
          ) : (
            filteredStaff.map((staff, idx) => {
              const isSelected = selectedRows.includes(staff.id);
              const isOnHoliday = staff.isOnHoliday || false;
              return (
                <MobileStaffCard key={staff.id} $isOnHoliday={isOnHoliday}>
                  <SerialCheckbox
                    className={isSelected ? 'checked' : ''}
                    onClick={() => !isOnHoliday && handleSelectRow(staff.id)}
                    title={isOnHoliday ? 'On Holiday' : (isSelected ? 'Deselect staff' : 'Select staff')}
                    style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                  >
                    {idx + 1}
                  </SerialCheckbox>
                  <MobileAvatar
                    onMouseEnter={e => {
                      if (staff.picture_url) {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setHoveredAvatar({
                          id: staff.id,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          url: staff.picture_url
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredAvatar(null)}
                  >
                    {staff.picture_url ? (
                      <img src={staff.picture_url} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      staff.name.charAt(0)
                    )}
                  </MobileAvatar>
                  <NameBlock>
                    <StaffName style={{ opacity: isOnHoliday ? 0.6 : 1 }}>
                      {staff.name}
                      {isOnHoliday && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#f59e42', fontWeight: 600 }}>(Holiday)</span>}
                      {!staff.rfid_uid && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#f59e42', fontWeight: 600 }}>(No Card)</span>}
                      {staff.isOnLeave && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#4a6cf7', fontWeight: 600 }}>(Leave)</span>}
                    </StaffName>
                    <StaffRole style={{ opacity: isOnHoliday ? 0.6 : 1 }}>{staff.role}</StaffRole>
                  </NameBlock>
                  {isMobile ? (
                    <MobileStatusGrid>
                      <EnhancedStatusButton
                        $active={staff.status === 'present'}
                        $color="#16a34a"
                        onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'present')}
                        style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                      >
                        P
                      </EnhancedStatusButton>
                      <EnhancedStatusButton
                        $active={staff.status === 'absent'}
                        $color="#dc2626"
                        onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'absent')}
                        style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                      >
                        A
                      </EnhancedStatusButton>
                      <EnhancedStatusButton
                        $active={staff.status === 'leave'}
                        $color="#4a6cf7"
                        onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'leave')}
                        style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                      >
                        L
                      </EnhancedStatusButton>
                      <EnhancedStatusButton
                        $active={staff.status === 'late'}
                        $color="#f59e42"
                        onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'late')}
                        style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                      >
                        Lt
                      </EnhancedStatusButton>
                      <CheckoutButton
                        theme={themeObj}
                        onClick={() => !isOnHoliday && handleOpenCheckoutModal(staff)}
                        style={{
                          minWidth: 0,
                          width: 28,
                          height: 28,
                          padding: 0,
                          borderRadius: '50%',
                          opacity: isOnHoliday ? 0.5 : 1,
                          cursor: isOnHoliday ? 'not-allowed' : 'pointer'
                        }}
                        title={staff.check_out_time ? `Edit checkout (${toInputTime(staff.check_out_time)})` : 'Set checkout time'}
                      >
                        <Close style={{ fontSize: 15 }} />
                      </CheckoutButton>
                      <input
                        type="text"
                        value={staff.remarks || ''}
                        onChange={e => !isOnHoliday && handleRemarksChange(staff.id, e.target.value)}
                        placeholder="Remarks"
                        disabled={isOnHoliday}
                        style={{
                          marginTop: '0.3rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '6px',
                          border: '1px solid #888',
                          fontSize: '0.8rem',
                          background: 'rgba(255,255,255,0.07)',
                          color: '#fff',
                          outline: 'none',
                          gridColumn: '1 / -1',
                          opacity: isOnHoliday ? 0.5 : 1
                        }}
                      />
                      {staff.check_out_time && (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.15rem' }}>
                          <CheckoutTimeBadge theme={themeObj}>
                            <Close style={{ fontSize: 13 }} />
                            Out {toInputTime(staff.check_out_time)}
                          </CheckoutTimeBadge>
                        </div>
                      )}
                    </MobileStatusGrid>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={staff.remarks || ''}
                        onChange={e => !isOnHoliday && handleRemarksChange(staff.id, e.target.value)}
                        placeholder="Remarks"
                        disabled={isOnHoliday}
                        style={{
                          marginRight: '1rem',
                          padding: '0.4rem 0.7rem',
                          borderRadius: '8px',
                          border: '1px solid #888',
                          minWidth: '120px',
                          maxWidth: '200px',
                          fontSize: '0.97rem',
                          background: 'rgba(255,255,255,0.07)',
                          color: '#fff',
                          outline: 'none',
                          opacity: isOnHoliday ? 0.5 : 1
                        }}
                      />
                      {staff.check_out_time && (
                        <CheckoutTimeBadge theme={themeObj} style={{ marginRight: '0.7rem' }}>
                          <Close style={{ fontSize: 13 }} />
                          Out {toInputTime(staff.check_out_time)}
                        </CheckoutTimeBadge>
                      )}
                      <CheckoutButton
                        theme={themeObj}
                        onClick={() => !isOnHoliday && handleOpenCheckoutModal(staff)}
                        style={{ marginRight: '0.7rem', opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                        title={staff.check_out_time ? `Edit checkout (${toInputTime(staff.check_out_time)})` : 'Set checkout time'}
                      >
                        <Close style={{ fontSize: 15 }} />
                        {staff.check_out_time ? 'Edit Out' : 'Check Out'}
                      </CheckoutButton>
                      <DesktopStatusRow>
                        <DesktopStatusButton
                          $active={staff.status === 'present'}
                          $color="#16a34a"
                          onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'present')}
                          style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                        >
                          Present
                        </DesktopStatusButton>
                        <DesktopStatusButton
                          $active={staff.status === 'absent'}
                          $color="#dc2626"
                          onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'absent')}
                          style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                        >
                          Absent
                        </DesktopStatusButton>
                        <DesktopStatusButton
                          $active={staff.status === 'leave'}
                          $color="#4a6cf7"
                          onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'leave')}
                          style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                        >
                          Leave
                        </DesktopStatusButton>
                        <DesktopStatusButton
                          $active={staff.status === 'late'}
                          $color="#f59e42"
                          onClick={() => !isOnHoliday && handleStatusChange(staff.id, 'late')}
                          style={{ opacity: isOnHoliday ? 0.5 : 1, cursor: isOnHoliday ? 'not-allowed' : 'pointer' }}
                        >
                          Late
                        </DesktopStatusButton>
                      </DesktopStatusRow>
                    </>
                  )}
                </MobileStaffCard>
              );
            })
          )}
        </MobileStaffList>
      </MainContent>

      {checkoutModalStaff && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: '#0006',
              zIndex: 3899
            }}
            onClick={() => setCheckoutModalStaff(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: theme === 'dark' ? darkTheme.CARD : lightTheme.CARD,
              padding: '1.25rem',
              borderRadius: '12px',
              boxShadow: '0 8px 32px #0004',
              zIndex: 3900,
              minWidth: isMobile ? 'min(92vw, 320px)' : '360px',
              border: `1px solid ${theme === 'dark' ? darkTheme.BORDER : lightTheme.BORDER}`
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: themeObj.TEXT_PRIMARY, fontSize: '1.05rem' }}>
              Manual Checkout
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: themeObj.TEXT_SECONDARY, fontSize: '0.92rem', lineHeight: 1.45 }}>
              Set a manual checkout time for <strong>{checkoutModalStaff.name}</strong>.
            </p>
            <input
              type="time"
              value={checkoutTime}
              onChange={(e) => setCheckoutTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: `1px solid ${themeObj.FIELD_BORDER}`,
                background: themeObj.FIELD_BG,
                color: themeObj.TEXT_PRIMARY,
                fontSize: '0.98rem',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={() => setCheckoutModalStaff(null)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: `1px solid ${themeObj.BORDER}`,
                  background: 'transparent',
                  color: themeObj.TEXT_SECONDARY,
                  fontWeight: 700
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckout}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: `1px solid ${themeObj.ACCENT}`,
                  background: themeObj.ACCENT,
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                Save Checkout
              </button>
            </div>
          </div>
        </>
      )}
      
      {showDeleteConfirm && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0006',
            zIndex: 3999
          }} onClick={() => setShowDeleteConfirm(false)} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: theme === 'dark' ? darkTheme.CARD : lightTheme.CARD,
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 8px 32px #0004',
            zIndex: 4000,
            minWidth: '300px',
            border: `1px solid ${theme === 'dark' ? darkTheme.BORDER : lightTheme.BORDER}`
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: theme === 'dark' ? darkTheme.TEXT_PRIMARY : lightTheme.TEXT_PRIMARY, fontSize: '1.2rem' }}>
              Delete Staff Attendance Records
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: theme === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY, fontSize: '1rem', lineHeight: 1.5 }}>
              Are you sure you want to delete all staff attendance records for the selected date? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: theme === 'dark' ? darkTheme.FIELD_BG : lightTheme.FIELD_BG,
                  color: 'inherit',
                  transition: 'all 0.18s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  transition: 'all 0.18s'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
      
      {hoveredAvatar && (
        <div
          style={{
            position: 'fixed',
            left: hoveredAvatar.x - 60,
            top: hoveredAvatar.y - 130,
            zIndex: 4000,
            pointerEvents: 'none',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 24px #0007',
            border: '2px solid #4a6cf7',
            padding: 4,
            width: 120,
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <img
            src={hoveredAvatar.url}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
      )}
    </PageContainer>
  );
};

export default MarkStaffAttendance;
