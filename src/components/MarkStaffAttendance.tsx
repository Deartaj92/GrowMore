import React, { useEffect, useState, useContext, useRef } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, useProgress, darkTheme, lightTheme } from './Layout';
import { useToast } from './useToast';
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
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 93vh;
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
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
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

const Footer = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.5rem;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 -1px 6px #0001;
  min-height: 36px;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 0.5rem 0.2rem;
    min-height: 44px;
  }
`;

// Mobile block styles
const MobileStaffList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 5.5rem;
`;

const MobileStaffCard = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }: { theme: any }) => theme.CARD};
  border-radius: 12px;
  box-shadow: ${({ theme }: { theme: any }) => theme.SHADOW};
  border: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  padding: 0.5rem 0.7rem;
  gap: 0.7rem;
  font-size: 0.93rem;
  width: 100%;
  min-width: 320px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.ACCENT}25;
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT}40;
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
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 0.3rem;
  width: 96px;
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
  status?: 'present' | 'absent' | 'leave' | 'late' | 'half_day';
  picture_url?: string;
  remarks?: string;
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
  const toast = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { startProgress, setProgress, completeProgress } = useProgress();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredAvatar, setHoveredAvatar] = useState<{ id: number; x: number; y: number; url: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveButtonBounce, setSaveButtonBounce] = useState(false);
  const [hasAttendanceRecords, setHasAttendanceRecords] = useState(false);
  const [statusBounce, setStatusBounce] = useState<{ id: number; status: string } | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [hasAnyStaff, setHasAnyStaff] = useState<boolean | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Stats
  const totalStaff = staffMembers.length;
  const presentCount = staffMembers.filter(s => s.status === 'present').length;
  const absentCount = staffMembers.filter(s => s.status === 'absent').length;
  const leaveCount = staffMembers.filter(s => s.status === 'leave').length;
  const lateCount = staffMembers.filter(s => s.status === 'late').length;
  const halfDayCount = staffMembers.filter(s => s.status === 'half_day').length;

  const didSetDefaultStatus = useRef(false);
  const didAutoSelect = useRef(false);

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
        .select('id')
        .eq('school_id', user.school_id);
      
      setHasAnyStaff(staffData && staffData.length > 0);
      
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
        .select('id')
        .eq('school_id', user.school_id);
      
      
      if (!staffError && staffData && staffData.length > 0) {
        setHasAnyStaff(true);
      } else {
        setHasAnyStaff(false);
      }
    };
    checkForAnyActiveStaff();
  }, [user?.school_id, hasAnyStaff]);

  const fetchStaff = async () => {
    if (!date || !user?.school_id || !sessionId) {
      return;
    }
    setLoadingStaff(true);
    try {
      // First check if it's a holiday or Sunday
      if (isSunday(parseISO(date))) {
        toast.showToast('Selected date is a Sunday', 'error');
        setStaffMembers([]);
        setLoadingStaff(false);
        return;
      }

      // Check for global holidays
      const { data: globalHolidays } = await supabase
        .from('holidays')
        .select('*')
        .eq('school_id', user.school_id)
        .lte('start_date', date)
        .gte('end_date', date);

      // Filter out holidays that have class assignments (keep only global holidays)
      const globalOnlyHolidays = globalHolidays?.filter(holiday => {
        // This is a simplified check - in a real implementation you'd check holiday_classes table
        return true; // For now, treat all holidays as global
      }) || [];

      if (globalOnlyHolidays && globalOnlyHolidays.length > 0) {
        const holiday = globalOnlyHolidays[0];
        toast.showToast(`${date} is a school-wide holiday: ${holiday.name}`, 'success');
        setStaffMembers([]);
        setLoadingStaff(false);
        return;
      }

      // Fetch all staff members
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role, picture_url')
        .eq('school_id', user.school_id);

      if (staffError) {
        throw staffError;
      }


      // Fetch attendance records for this date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance_records')
        .select('staff_id, status, remarks')
        .eq('date', date)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId);

      if (attendanceError) {
        // Don't throw error for attendance records as table might not exist yet
      }

      // Merge attendance status into staff
      const attendanceMap = new Map();
      (attendanceData || []).forEach((rec: any) => {
        attendanceMap.set(rec.staff_id, { status: rec.status, remarks: rec.remarks });
      });
      
      const formattedStaff = (staffData || []).map((staff: any) => {
        const att = attendanceMap.get(staff.id);
        return {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          status: att ? att.status : undefined,
          picture_url: staff.picture_url,
          remarks: att ? att.remarks || '' : '',
        };
      }).sort((a, b) => a.id - b.id);
      
      setStaffMembers(formattedStaff);
      if (formattedStaff.length === 0) {
        toast.showToast('No staff members found', 'success');
      } else {
      }
      setHasAttendanceRecords((attendanceData || []).length > 0);
    } catch (error) {
      toast.showToast('Failed to fetch staff', 'error');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleStatusChange = (staffId: number, status: 'present' | 'absent' | 'leave' | 'late' | 'half_day') => {
    setStaffMembers(prev =>
      prev.map(staff =>
        staff.id === staffId
          ? ({ ...staff, status: status.toLowerCase() as 'present' | 'absent' | 'leave' | 'late' | 'half_day' } as StaffMember)
          : staff
      )
    );
    setSelectedRows(prev => prev.includes(staffId) ? prev : [...prev, staffId]);
    setStatusBounce({ id: staffId, status: status.toLowerCase() });
    setTimeout(() => setStatusBounce(null), 600);
  };

  const handleBulkMark = (status: 'present' | 'absent') => {
    setStaffMembers(prev =>
      prev.map(staff => ({ ...staff, status }))
    );
    toast.showToast('Marked all staff as ' + status, 'success');
  };

  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (date && user?.school_id && sessionId) {
      fetchStaff();
    }
  }, [date, user, sessionId]);

  const allChecked = filteredStaff.length > 0 && filteredStaff.every(s => selectedRows.includes(s.id));
  
  const handleToggleSelectAll = () => {
    if (allChecked) {
      setSelectedRows(prev => prev.filter(id => !filteredStaff.some(s => s.id === id)));
      setStaffMembers(prev => prev.map(s => filteredStaff.some(f => f.id === s.id) ? { ...s, status: undefined } : s));
    } else {
      setSelectedRows(prev => Array.from(new Set([...prev, ...filteredStaff.map(s => s.id)])));
      setStaffMembers(prev => prev.map(s => filteredStaff.some(f => f.id === s.id) ? { ...s, status: 'present' } : s));
    }
  };

  const handleSelectRow = (staffId: number) => {
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

  const handleSave = async () => {
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
      const validStatuses = ['present', 'absent', 'leave', 'late', 'half_day'];
      const staffToSave = filteredStaff.filter(staff => typeof staff.status === 'string' && validStatuses.includes(staff.status));
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
  };

  const handleDelete = async () => {
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
  };

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
              return (
                <MobileStaffCard key={staff.id}>
                  <SerialCheckbox
                    className={isSelected ? 'checked' : ''}
                    onClick={() => handleSelectRow(staff.id)}
                    title={isSelected ? 'Deselect staff' : 'Select staff'}
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
                    <StaffName>{staff.name}</StaffName>
                    <StaffRole>{staff.role}</StaffRole>
                  </NameBlock>
                  {isMobile ? (
                    <MobileStatusGrid>
                      <EnhancedStatusButton
                        $active={staff.status === 'present'}
                        $color="#16a34a"
                        onClick={() => handleStatusChange(staff.id, 'present')}
                      >
                        P
                      </EnhancedStatusButton>
                      <EnhancedStatusButton
                        $active={staff.status === 'absent'}
                        $color="#dc2626"
                        onClick={() => handleStatusChange(staff.id, 'absent')}
                      >
                        A
                      </EnhancedStatusButton>
                      <EnhancedStatusButton
                        $active={staff.status === 'leave'}
                        $color="#4a6cf7"
                        onClick={() => handleStatusChange(staff.id, 'leave')}
                      >
                        L
                      </EnhancedStatusButton>
                      <EnhancedStatusButton
                        $active={staff.status === 'late'}
                        $color="#f59e42"
                        onClick={() => handleStatusChange(staff.id, 'late')}
                      >
                        Lt
                      </EnhancedStatusButton>
                      <EnhancedStatusButton
                        $active={staff.status === 'half_day'}
                        $color="#8b5cf6"
                        onClick={() => handleStatusChange(staff.id, 'half_day')}
                      >
                        H
                      </EnhancedStatusButton>
                      <input
                        type="text"
                        value={staff.remarks || ''}
                        onChange={e => handleRemarksChange(staff.id, e.target.value)}
                        placeholder="Remarks"
                        style={{
                          marginTop: '0.3rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '6px',
                          border: '1px solid #888',
                          fontSize: '0.8rem',
                          background: 'rgba(255,255,255,0.07)',
                          color: '#fff',
                          outline: 'none',
                          gridColumn: '1 / -1'
                        }}
                      />
                    </MobileStatusGrid>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={staff.remarks || ''}
                        onChange={e => handleRemarksChange(staff.id, e.target.value)}
                        placeholder="Remarks"
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
                        }}
                      />
                      <DesktopStatusRow>
                        <DesktopStatusButton
                          $active={staff.status === 'present'}
                          $color="#16a34a"
                          onClick={() => handleStatusChange(staff.id, 'present')}
                        >
                          Present
                        </DesktopStatusButton>
                        <DesktopStatusButton
                          $active={staff.status === 'absent'}
                          $color="#dc2626"
                          onClick={() => handleStatusChange(staff.id, 'absent')}
                        >
                          Absent
                        </DesktopStatusButton>
                        <DesktopStatusButton
                          $active={staff.status === 'leave'}
                          $color="#4a6cf7"
                          onClick={() => handleStatusChange(staff.id, 'leave')}
                        >
                          Leave
                        </DesktopStatusButton>
                        <DesktopStatusButton
                          $active={staff.status === 'late'}
                          $color="#f59e42"
                          onClick={() => handleStatusChange(staff.id, 'late')}
                        >
                          Late
                        </DesktopStatusButton>
                        <DesktopStatusButton
                          $active={staff.status === 'half_day'}
                          $color="#8b5cf6"
                          onClick={() => handleStatusChange(staff.id, 'half_day')}
                        >
                          Half Day
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
      
      <Footer>
        {!isMobile && (
          <div style={{ fontSize: '0.98rem', color: (theme === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY), fontWeight: 600 }}>
            Total: {totalStaff} | Present: {presentCount} | Absent: {absentCount} | Leave: {leaveCount} | Late: {lateCount} | Half Day: {halfDayCount}
          </div>
        )}
        <SegmentedGroup
          theme={theme === 'dark' ? darkTheme : lightTheme}
          style={isMobile
            ? { marginTop: 8, width: '100%', justifyContent: 'center', overflowX: 'auto' }
            : { marginTop: 8, justifyContent: 'flex-end' }
          }
        >
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
            first
            onClick={() => handleBulkMark('present')}
            style={{ minWidth: 70, padding: '0.35rem 0.7em', fontSize: '0.85em', minHeight: 32 }}
            disabled={staffMembers.length === 0 || selectedRows.length === 0}
          >
            {!isMobile && <CheckCircle style={{ fontSize: 18, marginRight: 4 }} />}
            All Present
          </SegmentedButton>
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
            onClick={() => handleBulkMark('absent')}
            style={{ minWidth: 70, padding: '0.35rem 0.7em', fontSize: '0.85em', minHeight: 32 }}
            disabled={staffMembers.length === 0 || selectedRows.length === 0}
          >
            {!isMobile && <Cancel style={{ fontSize: 18, marginRight: 4 }} />}
            All Absent
          </SegmentedButton>
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={staffMembers.length === 0 || selectedRows.length === 0 || !date || deleting}
            style={{ minWidth: 90, padding: '0.35rem 0.7em', fontSize: '0.97em', color: '#fff', background: '#dc2626', borderColor: '#dc2626', minHeight: 32, opacity: 0.93 }}
          >
            {deleting ? <Spinner /> : <><Delete style={{ fontSize: 18, marginRight: 4 }} /> Delete</>}
          </SegmentedButton>
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
            last
            onClick={handleSave}
            disabled={staffMembers.length === 0 || selectedRows.length === 0 || saving}
            style={{ minWidth: 90, padding: '0.35rem 0.7em', fontSize: '0.97em', color: '#fff', background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, minHeight: 32, opacity: 0.93 }}
          >
            {saving ? <Spinner /> : <><Save style={{ fontSize: 18, marginRight: 4 }} /> Save</>}
          </SegmentedButton>
        </SegmentedGroup>
      </Footer>
      
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
