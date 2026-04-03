import React, { useState, useEffect, useRef } from 'react';
import styled, { useTheme } from 'styled-components';
import { supabase } from '../supabaseClient';
import { BarChart, CalendarMonth, PictureAsPdf, X, FilterList as FilterIcon, Block, AttachMoney } from '@mui/icons-material';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import ReactDOM from 'react-dom';
import { useToast } from './useToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NoSessionsFound from './NoSessionsFound';
import Loader from './Loader';
import { useProgress } from '../components/Layout';
import { ThemeContext, darkTheme, lightTheme } from './Layout';

const Container = styled.div`
  max-width: 100vw;
  padding: 0 1rem 1rem 1rem;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Enhanced Header Components
const SEGMENTED_HEIGHT = '32px';

const Header = styled.div`
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
  box-shadow: 0 1px 6px rgba(0,0,0,0.1);
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  padding: 6px 8px;
`;

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
  }
`;

const SegmentedInput = styled.input`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: #444;
  color: #C0C0C0;
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid #555;
  &:last-child { border-right: none; }
  &:not(:first-child) {
    border-left: 1px solid #555;
  }
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-left: none;
    border-right: none;
    min-width: 0;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: #444;
  color: #C0C0C0;
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid #555;
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
    border-left: 1px solid #555;
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
  }
`;

const SegmentedButton = styled.button<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: #444;
  color: #C0C0C0;
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  border-right: 1px solid #555;
  &:last-child { border-right: none; }
  &:not(:first-child) {
    border-left: 1px solid #555;
  }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  &:hover {
    background: #555;
  }
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-left: none;
    border-right: none;
    min-width: 0;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const InlineStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-left: auto;
  flex-wrap: wrap;
  @media (max-width: 700px) {
    margin-left: 0;
    justify-content: flex-start;
    gap: 0.7rem;
  }
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => theme.ICON_BG};
  border-radius: 12px;
  padding: 0.3rem 1.1rem 0.3rem 0.8rem;
  font-size: 1.01rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 700px) {
    padding: 0.2rem 0.6rem;
    font-size: 0.8rem;
    gap: 0.3rem;
    border-radius: 8px;
    min-width: auto;
    flex: 1;
    justify-content: center;
  }
`;

const StatValue = styled.span`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.25rem;
  font-weight: 700;
  margin-left: 0.2rem;
  
  @media (max-width: 700px) {
    font-size: 1rem;
    margin-left: 0.1rem;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
  thead tr:hover, tbody tr:hover {
    background: ${({ theme }) => isDark(theme) ? '#232a3b' : '#f3f4f8'} !important;
  }
  tbody tr {
    transition: background-color 0.2s ease;
    cursor: pointer;
  }
  tbody tr:hover {
    background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#f8f9fa'} !important;
  }
`;

const Th = styled.th`
  padding: 0.25rem 0.2rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 700;
  font-size: 0.93rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  position: sticky;
  top: 0;
  z-index: 2;
  min-width: 34px;
  max-width: 36px;
`;

const Td = styled.td`
  padding: 0.18rem 0.2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.97rem;
  text-align: center;
  min-width: 34px;
  max-width: 36px;
`;

const StatusCell = styled(Td)<{ status?: string }>`
  font-weight: 700;
  color: ${({ status }) =>
    status === 'P' ? '#16a34a' :
    status === 'A' ? '#dc2626' :
    status === 'Lt' ? '#f59e42' :
    status === 'L' ? '#4a6cf7' :
    status === 'H' ? '#8b5cf6' :
    '#888'};
  background: transparent;
`;

const NarrowTh = styled(Th)`
  min-width: 28px;
  max-width: 28px;
`;

const NarrowTd = styled(Td)`
  min-width: 28px;
  max-width: 28px;
`;

const StaffNameCell = styled(Td)`
  font-weight: 700;
  text-align: left;
  color: ${({ theme }) => isDark(theme) ? '#fff' : '#232323'};
  min-width: 120px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StatusBlock = styled.span<{ status?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 28px;
  padding: 0.13rem 0.7rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.97rem;
  text-align: center;
  background: ${({ status }) =>
    status === 'P' ? 'rgba(22,163,74,0.12)' :
    status === 'A' ? 'rgba(220,38,38,0.12)' :
    status === 'Lt' ? 'rgba(245,158,66,0.12)' :
    status === 'L' ? 'rgba(74,108,247,0.12)' :
    status === 'H' ? 'rgba(139,92,246,0.12)' :
    'rgba(68,68,68,0.08)'};
  color: ${({ status }) =>
    status === 'P' ? '#16a34a' :
    status === 'A' ? '#dc2626' :
    status === 'Lt' ? '#f59e42' :
    status === 'L' ? '#4a6cf7' :
    status === 'H' ? '#8b5cf6' :
    '#bbb'};
  transition: background 0.18s, color 0.18s;
`;
const HalfLeaveBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background: #ec4899;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 3px;
  border-radius: 3px;
  line-height: 1;
  z-index: 1;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
`;
const PaidLeaveBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #16a34a;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);

  svg {
    font-size: 0.58rem;
  }
`;
const SummaryRow = styled.tr`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  font-weight: 700;
  border-top: 2px solid ${({ theme }) => theme.BORDER};
`;
const SummaryCell = styled(Td)`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  text-align: center;
`;
const SummaryLabelCell = styled(SummaryCell)`
  text-align: right;
  padding-right: 0.5rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
`;

const StatusDropdown = styled.div`
  position: absolute;
  z-index: 10;
  min-width: 120px;
  background: ${({ theme }) => theme.CARD};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  box-shadow: 0 4px 24px #0003;
  padding: 0.3rem 0;
  display: flex;
  flex-direction: column;
`;

const StatusOption = styled.button<{ color: string }>`
  background: none;
  border: none;
  color: ${({ color }) => color};
  font-weight: 700;
  font-size: 1rem;
  padding: 0.5rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ color }) => color}22;
  }
`;

const SundayMergedCell = styled.td`
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#eaeaea'} !important;
  color: #dc2626 !important;
  font-weight: 700;
  text-align: center;
  border-radius: 8px;
  border: none;
  position: relative;
  vertical-align: middle;
  padding: 0;
  min-height: 120px;
  height: 120px;
  overflow: hidden;
`;

const AngledHolidayName = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  color: #4a6cf7;
  font-weight: 700;
  letter-spacing: 0.15em;
  white-space: nowrap;
  pointer-events: none;
  max-width: 95vw;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const isDark = (theme: any) => theme.BG === '#252525';

const statusOptions = [
  { value: 'P', label: 'Present', color: '#16a34a' },
  { value: 'A', label: 'Absent', color: '#dc2626' },
  { value: 'L', label: 'Leave', color: '#4a6cf7' },
  { value: 'Lt', label: 'Late', color: '#f59e42' },
  { value: 'H', label: 'Half Day', color: '#8b5cf6' },
];

const deleteOption = { value: 'DELETE', label: 'Delete', color: '#dc2626' };

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
}

interface LeaveDecisionState {
  staff: StaffMember;
  idx: number;
  dayIdx: number;
  dateStr: string;
}

interface Holiday {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  isGlobal?: boolean;
  staffIds?: number[];
}


const StaffAttendanceReport: React.FC = () => {
  const theme = useTheme();
  const modalTheme = isDark(theme) ? darkTheme : lightTheme;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startProgress, setProgress, completeProgress } = useProgress();
  
  // State management
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [staffMembers, setStaffMembers] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceMatrix, setAttendanceMatrix] = useState<string[][]>([]);
  const [workingDays, setWorkingDays] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<{ 
    row: number; 
    col: number; 
    rect: DOMRect | null;
    shouldPositionAbove?: boolean;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [hasAnyStaff, setHasAnyStaff] = useState<boolean | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const updatingStatusRef = useRef<Set<string>>(new Set());
  const lastClickTimeRef = useRef<number>(0);
  const [holidayTextStyle, setHolidayTextStyle] = useState<{ [key: string]: { angle: number, fontSize: string, maxWidth?: string } }>({});
  const holidayCellRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});
  const [halfLeavesMap, setHalfLeavesMap] = useState<Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>>(new Map());
  const [paidLeavesMap, setPaidLeavesMap] = useState<Map<string, boolean>>(new Map());
  const [leaveDecision, setLeaveDecision] = useState<LeaveDecisionState | null>(null);

  // Fetch active session on mount
  useEffect(() => {
    const fetchSession = async () => {
      if (!user?.school_id) {
        toast.showToast('User school information not found', 'error');
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
        toast.showToast('Failed to fetch active session for your school', 'error');
        setHasActiveSession(false);
      }
      setLoadingSession(false);
    };
    fetchSession();
  }, [user?.school_id]);

  // Check if there are any staff with attendance records in the system
  useEffect(() => {
    const checkForAnyStaff = async () => {
      if (!user?.school_id || !sessionId) return;
      
      // Check if there are any attendance records for this school
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance_records')
        .select('staff_id')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .limit(1);
      
      if (!attendanceError && attendanceData && attendanceData.length > 0) {
        setHasAnyStaff(true);
      } else {
        setHasAnyStaff(false);
      }
    };
    
    checkForAnyStaff();
  }, [user?.school_id, sessionId]);

  // Fetch staff and attendance when month changes
  useEffect(() => {
    const fetchData = async () => {
      const minDuration = 1500; // 1.5 seconds
      const start = Date.now();
      setLoadingStaff(true);
      startProgress(false);
      setProgress(10);
      
      // Fetch attendance records for the selected month/year to get staff who have attendance
      setProgress(20);
      const startDate = selectedMonth + '-01';
      const daysInMonth = getDaysInMonth(parseISO(startDate));
      const endDate = format(new Date(parseISO(startDate).getFullYear(), parseISO(startDate).getMonth(), daysInMonth), 'yyyy-MM-dd');
      
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance_records')
        .select('staff_id, date, status, paid_leave')
        .eq('school_id', user?.school_id)
        .eq('session_id', sessionId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError || !attendanceData) {
        setStaffMembers([]);
        setAttendanceMatrix([]);
        setWorkingDays(0);
        setAvgAttendance(0);
        setLoadingStaff(false);
        setProgress(100);
        completeProgress();
        return;
      }
      setProgress(40);
      if (attendanceData.length === 0) {
        setStaffMembers([]);
        setAttendanceMatrix([]);
        setWorkingDays(0);
        setAvgAttendance(0);
        setLoadingStaff(false);
        setProgress(100);
        completeProgress();
        return;
      }
      
      // Get unique staff IDs from attendance records
      const staffIds = Array.from(new Set(attendanceData.map(record => record.staff_id)));
      
      // Fetch staff details for those who have attendance records
      setProgress(60);
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('school_id', user?.school_id)
        .in('id', staffIds);

      if (staffError || !staffData) {
        setStaffMembers([]);
        setAttendanceMatrix([]);
        setWorkingDays(0);
        setAvgAttendance(0);
        setLoadingStaff(false);
        setProgress(100);
        completeProgress();
        return;
      }
      setStaffMembers(staffData);
      
      // Fetch half leaves for staff in this month
      setProgress(70);
      if (sessionId) {
        const { data: halfLeavesData } = await supabase
          .from('half_leaves')
          .select('person_id, date, leave_type, arrival_time, departure_time')
          .eq('person_type', 'staff')
          .eq('session_id', sessionId)
          .eq('school_id', user?.school_id)
          .in('person_id', staffIds)
          .gte('date', startDate)
          .lte('date', endDate);
        
        // Create a map for quick lookup: "staffId_date" -> half leave data
        const hlMap = new Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>();
        (halfLeavesData || []).forEach((hl: any) => {
          const key = `${hl.person_id}_${hl.date}`;
          hlMap.set(key, {
            leave_type: hl.leave_type,
            arrival_time: hl.arrival_time,
            departure_time: hl.departure_time
          });
        });
        setHalfLeavesMap(hlMap);
      } else {
        setHalfLeavesMap(new Map());
      }
      
      // Build attendance matrix
      setProgress(80);
      const attMap: Record<number, Record<number, string>> = {};
      const paidLeaveLookup = new Map<string, boolean>();
      attendanceData.forEach((rec: any) => {
        const day = parseInt(rec.date.split('-')[2], 10);
        if (!attMap[rec.staff_id]) attMap[rec.staff_id] = {};
        attMap[rec.staff_id][day] = rec.status === 'present' ? 'P' : rec.status === 'absent' ? 'A' : rec.status === 'late' ? 'Lt' : rec.status === 'leave' ? 'L' : rec.status === 'half_day' ? 'H' : '-';
        if (rec.status === 'leave' && rec.paid_leave) {
          paidLeaveLookup.set(`${rec.staff_id}_${rec.date}`, true);
        }
      });
      setPaidLeavesMap(paidLeaveLookup);
      const matrix = staffData.map((staff: any) =>
        Array.from({ length: daysInMonth }, (_, i) => attMap[staff.id]?.[i + 1] || '-')
      );
      setAttendanceMatrix(matrix);
      
      // Calculate working days
      const daysWithAttendance = new Set<number>();
      attendanceData.forEach((rec: any) => {
        const day = parseInt(rec.date.split('-')[2], 10);
        daysWithAttendance.add(day);
      });
      setWorkingDays(daysWithAttendance.size);
      
      // Calculate average attendance
      let presentCount = 0;
      let totalPossible = staffData.length * daysWithAttendance.size;
      matrix.forEach(row => {
        daysWithAttendance.forEach(day => {
          const status = row[day - 1];
          if (status === 'P' || status === 'Lt' || status === 'H') presentCount++;
        });
      });
      setAvgAttendance(totalPossible ? Math.round((presentCount / totalPossible) * 100) : 0);
      setProgress(100);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoadingStaff(false);
          completeProgress();
        }, minDuration - elapsed);
      } else {
        setLoadingStaff(false);
        completeProgress();
      }
    };
    fetchData();
  }, [selectedMonth, user?.school_id, sessionId]);

  // Fetch holidays for the selected month
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!selectedMonth || !sessionId || !user?.school_id) return;
      
      const startDate = selectedMonth + '-01';
      const daysInMonth = getDaysInMonth(parseISO(startDate));
      const endDate = format(new Date(parseISO(startDate).getFullYear(), parseISO(startDate).getMonth(), daysInMonth), 'yyyy-MM-dd');

      try {
        // Fetch all holidays for the period
        const { data: allHolidaysData, error: allHolidaysError } = await supabase
        .from('holidays')
          .select(`
            id,
            name,
            start_date,
            end_date
          `)
        .eq('session_id', sessionId)
        .eq('school_id', user.school_id)
        .lte('start_date', endDate)
        .gte('end_date', startDate);

        if (allHolidaysError) throw allHolidaysError;

        if (!allHolidaysData || allHolidaysData.length === 0) {
          setHolidays([]);
          return;
        }

        const holidayIds = allHolidaysData.map(h => h.id);
        
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
        const { data: holidayStaffAssignments } = await supabase
          .from('holiday_staff')
          .select('holiday_id, staff_id')
          .in('holiday_id', holidayIds);

        // Identify global holidays (no class assignments and no staff assignments)
        const globalHolidays = allHolidaysData.filter(holiday => {
          const hasClassAssignments = holidayClassAssignments?.some(a => a.holiday_id === holiday.id) || false;
          const hasStaffAssignments = (holidayStaffAssignments || []).some(a => a.holiday_id === holiday.id) || false;
          return !hasClassAssignments && !hasStaffAssignments;
        });

        // Store holidays with their assignment info for later filtering per staff
        const holidaysWithAssignments = allHolidaysData.map(holiday => {
          const isGlobal = globalHolidays.some(h => h.id === holiday.id);
          const staffAssignments = (holidayStaffAssignments || []).filter(a => a.holiday_id === holiday.id);
          return {
            ...holiday,
            isGlobal,
            staffIds: staffAssignments.map(a => a.staff_id)
          };
        });

        setHolidays(holidaysWithAssignments);
      } catch (error) {
        setHolidays([]);
      }
    };

    fetchHolidays();
  }, [selectedMonth, sessionId, user?.school_id]);

  // Filter staff based on search query and attendance records
  const filteredStaff = staffMembers.filter(staff => {
    // First check if staff matches search query
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         staff.role.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Then check if staff has any attendance records for the month
    const staffAttendance = attendanceMatrix[staffMembers.findIndex(s => s.id === staff.id)];
    if (!staffAttendance) return false;

    // Check if staff has at least one attendance record (any status except '-')
    return staffAttendance.some(status => status !== '-');
  });

  const daysInMonth = selectedMonth ? getDaysInMonth(parseISO(selectedMonth + '-01')) : 31;

  // Helper: Get holiday ranges for a specific staff member
  const getHolidayRangesForStaff = (staffId: number) => {
    return holidays
      .filter(holiday => {
        // Include holiday if:
        // 1. It's a global holiday (no assignments), OR
        // 2. Staff is specifically assigned to this holiday
        return holiday.isGlobal || (holiday.staffIds && holiday.staffIds.includes(staffId));
      })
      .map(holiday => {
    const start = parseISO(holiday.start_date);
    const end = parseISO(holiday.end_date);
    const monthStart = parseISO(selectedMonth + '-01');
    const daysInMonth = getDaysInMonth(monthStart);
    const firstDayIdx = Math.max(0, Math.ceil((start.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
    const lastDayIdx = Math.min(daysInMonth - 1, Math.floor((end.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      name: holiday.name,
      startIdx: firstDayIdx,
          endIdx: lastDayIdx,
          holidayId: holiday.id
    };
  });
  };


  // Helper function for dynamic angle and font size
  function getHolidayAngleAndFont(colSpan: number) {
    if (colSpan <= 1) return { angle: 0, fontSize: '1.2em' };
    if (colSpan === 2) return { angle: -20, fontSize: '1.2em' };
    if (colSpan === 3) return { angle: -30, fontSize: '1.15em' };
    if (colSpan === 4) return { angle: -40, fontSize: '1.1em' };
    if (colSpan === 5) return { angle: -50, fontSize: '1em' };
    if (colSpan === 6) return { angle: -58, fontSize: '0.95em' };
    return { angle: -65, fontSize: '0.9em' };
  }

  useEffect(() => {
    // For each holiday-staff combination, measure the cell and set angle/fontSize
    filteredStaff.forEach(staff => {
      const staffHolidays = getHolidayRangesForStaff(staff.id);
      staffHolidays.forEach(holiday => {
        const key = `${holiday.name}-${holiday.holidayId}-${staff.id}`;
      const cell = holidayCellRefs.current[key];
      if (cell) {
        const w = cell.offsetWidth;
        const h = cell.offsetHeight;
        if (w && h) {
          // Calculate angle in degrees
          const angle = -Math.atan(h / w) * (180 / Math.PI);
          // Estimate font size: fit text in diagonal, but be much more conservative
          const textLen = holiday.name.length;
          const diag = Math.sqrt(w * w + h * h);
          const fontSize = Math.max(10, Math.min(diag / (textLen * 2.2), h * 0.3, w * 0.5, 32)) + 'px';
          setHolidayTextStyle(prev => ({
            ...prev,
            [key]: { angle, fontSize, maxWidth: `${diag * 0.95}px` }
          }));
        }
      }
    });
    });
  }, [holidays, filteredStaff, selectedMonth]);

  const recalculateAttendanceStats = (matrix: string[][]) => {
    const daysWithAttendance = new Set<number>();
    for (let d = 0; d < matrix[0]?.length; d++) {
      for (let s = 0; s < matrix.length; s++) {
        if (matrix[s][d] && matrix[s][d] !== '-') {
          daysWithAttendance.add(d + 1);
          break;
        }
      }
    }

    setWorkingDays(daysWithAttendance.size);

    let presentCount = 0;
    const totalPossible = matrix.length * daysWithAttendance.size;
    matrix.forEach(row => {
      daysWithAttendance.forEach(day => {
        const status = row[day - 1];
        if (status === 'P' || status === 'Lt' || status === 'H') {
          presentCount++;
        }
      });
    });
    setAvgAttendance(totalPossible ? Math.round((presentCount / totalPossible) * 100) : 0);
  };

  const persistAttendanceStatus = async (
    optValue: string,
    idx: number,
    dayIdx: number,
    staff: StaffMember,
    paidLeave: boolean
  ) => {
    const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;
    const updateKey = `${staff.id}-${selectedMonth}-${dayIdx + 1}-${optValue}-${paidLeave ? 'paid' : 'unpaid'}`;

    if (updatingStatusRef.current.has(updateKey)) {
      return;
    }

    updatingStatusRef.current.add(updateKey);
    setIsUpdatingStatus(true);

    const previousStatus = attendanceMatrix[idx]?.[dayIdx] || '-';
    const paidLeaveKey = `${staff.id}_${dateStr}`;
    const previousPaidLeave = paidLeavesMap.get(paidLeaveKey) || false;

    try {
      if (optValue === 'DELETE') {
        const updatedMatrix = attendanceMatrix.map(row => [...row]);
        updatedMatrix[idx][dayIdx] = '-';
        setAttendanceMatrix(updatedMatrix);
        recalculateAttendanceStats(updatedMatrix);
        setPaidLeavesMap(prev => {
          const next = new Map(prev);
          next.delete(paidLeaveKey);
          return next;
        });
        setOpenDropdown(null);

        if (!staff.id || !dateStr || !user?.school_id || !sessionId) {
          throw new Error(`Missing required fields for delete: staff_id=${staff.id}, date=${dateStr}, school_id=${user?.school_id}, session_id=${sessionId}`);
        }

        const { error } = await supabase
          .from('staff_attendance_records')
          .delete()
          .eq('staff_id', staff.id)
          .eq('school_id', user.school_id)
          .eq('session_id', sessionId)
          .eq('date', dateStr);

        if (error) {
          throw error;
        }

        toast.showToast('Staff attendance record deleted.', 'success');
        return;
      }

      if (!sessionId) {
        toast.showToast('No active session found. Please activate a session first.', 'error');
        return;
      }

      const updatedMatrix = attendanceMatrix.map(row => [...row]);
      updatedMatrix[idx][dayIdx] = optValue;
      setAttendanceMatrix(updatedMatrix);
      recalculateAttendanceStats(updatedMatrix);
      setPaidLeavesMap(prev => {
        const next = new Map(prev);
        if (optValue === 'L' && paidLeave) {
          next.set(paidLeaveKey, true);
        } else {
          next.delete(paidLeaveKey);
        }
        return next;
      });
      setOpenDropdown(null);

      if (!staff.id || !dateStr || !user?.school_id || !sessionId) {
        throw new Error(`Missing required fields: staff_id=${staff.id}, date=${dateStr}, school_id=${user?.school_id}, session_id=${sessionId}`);
      }

      const statusMap: Record<string, string> = {
        'P': 'present',
        'A': 'absent',
        'L': 'leave',
        'Lt': 'late',
        'H': 'half_day'
      };
      const dbStatus = statusMap[optValue] || 'present';
      const upsertPayload = {
        staff_id: staff.id,
        date: dateStr,
        status: dbStatus,
        paid_leave: dbStatus === 'leave' ? paidLeave : false,
        school_id: user.school_id,
        session_id: sessionId
      };

      const { data: existingRecord, error: checkError } = await supabase
        .from('staff_attendance_records')
        .select('id, status, paid_leave')
        .eq('staff_id', staff.id)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .eq('date', dateStr)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let error;

      if (existingRecord) {
        const updateResult = await supabase
          .from('staff_attendance_records')
          .update({
            status: dbStatus,
            paid_leave: dbStatus === 'leave' ? paidLeave : false
          })
          .eq('id', existingRecord.id);
        error = updateResult.error;
      } else {
        const insertResult = await supabase
          .from('staff_attendance_records')
          .insert([upsertPayload]);
        error = insertResult.error;
      }

      if (error) {
        throw error;
      }

      toast.showToast('Staff attendance updated successfully.', 'success');
    } catch (err: any) {
      const revertedMatrix = attendanceMatrix.map(row => [...row]);
      revertedMatrix[idx][dayIdx] = previousStatus;
      setAttendanceMatrix(revertedMatrix);
      recalculateAttendanceStats(revertedMatrix);
      setPaidLeavesMap(prev => {
        const next = new Map(prev);
        if (previousPaidLeave) {
          next.set(paidLeaveKey, true);
        } else {
          next.delete(paidLeaveKey);
        }
        return next;
      });
      toast.showToast(`Could not update staff attendance: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      updatingStatusRef.current.delete(updateKey);
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (
    opt: StatusOption,
    idx: number,
    dayIdx: number,
    staff: StaffMember
  ) => {
    // Debounce rapid clicks (prevent clicks within 500ms)
    const now = Date.now();
    if (now - lastClickTimeRef.current < 500) {
      return;
    }
    lastClickTimeRef.current = now;
    
    try {
      if (opt.value === 'DELETE') {
        await persistAttendanceStatus(opt.value, idx, dayIdx, staff, false);
        return;
      }

      const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;

      if (opt.value === 'L') {
        if (!sessionId || !user?.school_id) {
          toast.showToast('No active session found. Please activate a session first.', 'error');
          return;
        }

        const startDate = `${selectedMonth}-01`;
        const daysInMonth = getDaysInMonth(parseISO(startDate));
        const endDate = format(
          new Date(parseISO(startDate).getFullYear(), parseISO(startDate).getMonth(), daysInMonth),
          'yyyy-MM-dd'
        );

        const { data: monthlyLeaveAbsenceRecords, error } = await supabase
          .from('staff_attendance_records')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('session_id', sessionId)
          .eq('staff_id', staff.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .in('status', ['absent', 'leave']);

        if (error) {
          throw error;
        }

        if ((monthlyLeaveAbsenceRecords || []).length > 0) {
          setOpenDropdown(null);
          setLeaveDecision({
            staff,
            idx,
            dayIdx,
            dateStr
          });
          return;
        }

        await persistAttendanceStatus(opt.value, idx, dayIdx, staff, false);
        return;
      }

      await persistAttendanceStatus(opt.value, idx, dayIdx, staff, false);
    } catch (err: any) {
      toast.showToast(`Could not update staff attendance: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openDropdown]);

  // Cleanup updatingStatusRef periodically to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (updatingStatusRef.current.size > 0) {
        updatingStatusRef.current.clear();
        setIsUpdatingStatus(false);
      }
    }, 30000); // Clean up every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  const handleExportPDF = async () => {
    if (!selectedMonth) {
      toast.showToast('Please select month');
      return;
    }
    
    setExportLoading(true);
    setIsExporting(true);
    
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        toast.showToast('Generating PDF for mobile... Please wait.', 'success');
      }
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Set font styles
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);

      // Add title
      const title = `Staff Monthly Attendance Report -`;
      doc.text(title, 14, 20);
      
      // Add month info to top right
      const monthYear = format(parseISO(selectedMonth + '-01'), 'MMMM yyyy');
      doc.text(monthYear, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' });

      // Add subtitle with month and stats
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Month: ${monthYear}`, 14, 30);
      doc.text(`Working Days: ${workingDays}`, 80, 30);
      doc.text(`Average Attendance: ${avgAttendance}%`, 160, 30);

      // Prepare a map of holiday days for each staff member for quick lookup
      const staffHolidayDayMaps: Record<number, Record<number, string>> = {};
      filteredStaff.forEach(staff => {
        const staffHolidayRanges = getHolidayRangesForStaff(staff.id);
        const staffHolidayMap: Record<number, string> = {};
        staffHolidayRanges.forEach(holidayRange => {
          // Use the holiday from the holidays array to get dates
          const holiday = holidays.find(h => h.id === holidayRange.holidayId);
          if (holiday) {
        const start = parseISO(holiday.start_date);
        const end = parseISO(holiday.end_date);
        const monthStart = parseISO(selectedMonth + '-01');
        const daysInMonth = getDaysInMonth(monthStart);
        const firstDayIdx = Math.max(0, Math.ceil((start.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
        const lastDayIdx = Math.min(daysInMonth - 1, Math.floor((end.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
        for (let i = firstDayIdx; i <= lastDayIdx; i++) {
              staffHolidayMap[i + 1] = holiday.name;
            }
          }
        });
        staffHolidayDayMaps[staff.id] = staffHolidayMap;
      });
      
      // Also prepare a global holiday map for summary row (any holiday affecting any staff)
      let globalHolidayDayMap: Record<number, string> = {};
      const allHolidayRanges = new Map<number, { name: string; startIdx: number; endIdx: number }>();
      filteredStaff.forEach(staffMember => {
        const staffHolidays = getHolidayRangesForStaff(staffMember.id);
        staffHolidays.forEach(holiday => {
          if (!allHolidayRanges.has(holiday.startIdx) || 
              allHolidayRanges.get(holiday.startIdx)!.endIdx < holiday.endIdx) {
            allHolidayRanges.set(holiday.startIdx, {
              name: holiday.name,
              startIdx: holiday.startIdx,
              endIdx: holiday.endIdx
            });
          }
        });
      });
      allHolidayRanges.forEach((holiday, startIdx) => {
        for (let i = startIdx; i <= holiday.endIdx; i++) {
          globalHolidayDayMap[i + 1] = holiday.name;
        }
      });

      // Prepare table data
      const sortedStaff = [...filteredStaff].sort((a, b) => a.id - b.id);
      const tableData = sortedStaff.map((staff, idx) => {
        const staffIndexInOriginal = staffMembers.findIndex(s => s.id === staff.id);
        const row = [
          (idx + 1).toString(),
          staff.id.toString(),
          staff.name,
          staff.role,
          ...Array.from({ length: daysInMonth }, (_, dayIdx) => {
            const date = new Date(parseISO(selectedMonth + '-01'));
            date.setDate(dayIdx + 1);
            const isSunday = date.getDay() === 0;
            if (isSunday) return '';
            
            // Check if this staff member is on holiday for this day
            const staffHolidayMap = staffHolidayDayMaps[staff.id] || {};
            if (staffHolidayMap[dayIdx + 1]) {
              return 'H'; // Holiday indicator
            }
            
            const status = attendanceMatrix[staffIndexInOriginal]?.[dayIdx] || '-';
            const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;
            const halfLeaveKey = `${staff.id}_${dateStr}`;
            const halfLeave = halfLeavesMap.get(halfLeaveKey);
            // Replace status with HL if half leave exists
            // Use "HLt" if original status was "Lt" (Late) to maintain yellow color
            if (halfLeave) {
              return status === 'Lt' ? 'HLt' : 'HL';
            }
            return status;
          })
        ];
        return row;
      });
      
      // Add summary row for absents/leaves
      const summaryRow = [
        '',
        '',
        '',
        'Absents/Leaves:',
        ...Array.from({ length: daysInMonth }, (_, dayIdx) => {
          const date = new Date(parseISO(selectedMonth + '-01'));
          date.setDate(dayIdx + 1);
          const isSunday = date.getDay() === 0;
          if (isSunday) return '';
          
          // Check for holidays (using global map for summary)
          if (globalHolidayDayMap[dayIdx + 1]) return '';
          
          // Count absent and leave staff for this day (excluding those on holiday)
          let absentCount = 0;
          sortedStaff.forEach((staff) => {
            // Check if this staff member is on holiday for this day
            const staffHolidayMap = staffHolidayDayMaps[staff.id] || {};
            const isOnHoliday = !!staffHolidayMap[dayIdx + 1];
            
            // Only count if not on holiday
            if (!isOnHoliday) {
            const staffIndexInOriginal = staffMembers.findIndex(s => s.id === staff.id);
            const status = attendanceMatrix[staffIndexInOriginal]?.[dayIdx];
            if (status === 'A' || status === 'L') {
              absentCount++;
              }
            }
          });
          
          return absentCount > 0 ? absentCount.toString() : '-';
        })
      ];
      tableData.push(summaryRow);

      // Prepare table headers
      const headers = [
        '#',
        'ID',
        'Staff Name',
        'Role',
        ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString())
      ];

      // Build columnStyles for uniform day columns
      const totalWidth = 270;
      const fixedColsWidth = 8 + 15 + 40 + 25; // #, ID, Name, Role
      const daysColCount = daysInMonth;
      const dayColWidth = (totalWidth - fixedColsWidth) / daysColCount;
      const columnStyles: any = {
        0: { cellWidth: 8 }, // #
        1: { cellWidth: 15 }, // ID
        2: { cellWidth: 40, halign: 'left' }, // Staff Name
        3: { cellWidth: 25, halign: 'left' }, // Role
      };
      for (let i = 4; i < daysInMonth + 4; i++) {
        columnStyles[i] = { cellWidth: dayColWidth, halign: 'center' };
      }

      // Add table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 35,
        margin: { left: 14 },
        styles: {
          fontSize: 8,
          cellPadding: 1,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles,
        didParseCell: function(data) {
          // Style for Sunday columns
          if (data.column.index > 3) {
            const date = new Date(parseISO(selectedMonth + '-01'));
            date.setDate(data.column.index - 3);
            if (date.getDay() === 0) {
              data.cell.styles.fillColor = [255, 235, 235];
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
          // Style for holiday columns (check per staff member)
          if (data.column.index > 3 && data.row.section !== 'head') {
            const dayIdx = data.column.index - 3;
            // Check if this is the summary row (last row)
            const isSummaryRow = data.row.index === tableData.length - 1;
            
            if (isSummaryRow) {
              // For summary row, use global holiday map
              if (globalHolidayDayMap[dayIdx + 1]) {
              data.cell.styles.fillColor = [234, 247, 255];
              data.cell.styles.textColor = [74, 108, 247];
                data.cell.text = [''];
              }
            } else {
              // For regular rows, check staff-specific holidays
              const staffRowIndex = data.row.index;
              const staff = sortedStaff[staffRowIndex];
              if (staff) {
                const staffHolidayMap = staffHolidayDayMaps[staff.id] || {};
                if (staffHolidayMap[dayIdx + 1]) {
                  data.cell.styles.fillColor = [234, 247, 255];
                  data.cell.styles.textColor = [74, 108, 247];
                  data.cell.text = ['H']; // Show 'H' for holiday
                }
              }
            }
          }
          // Style for status cells
          if (data.column.index > 3 && data.cell.raw !== '') {
            const cellValue = String(data.cell.raw || '');
            
            // Check if this is the summary row (last row)
            const isSummaryRow = data.row.index === tableData.length - 1;
            
            if (isSummaryRow) {
              // Style summary row
              data.cell.styles.fillColor = [248, 249, 250];
              data.cell.styles.fontStyle = 'bold';
              if (cellValue !== '-' && cellValue !== '') {
                data.cell.styles.textColor = [220, 38, 38]; // Red for absent counts
              }
            } else {
              // Style regular status cells
              if (cellValue === 'HL') {
                // Highlight HL in pink color (when replacing P, A, L, H, etc.)
                data.cell.styles.textColor = [236, 72, 153]; // Pink color for HL
                data.cell.styles.fontStyle = 'bold';
              } else if (cellValue === 'HLt') {
                // Highlight HL in yellow color (when replacing Lt/Late)
                data.cell.styles.textColor = [245, 158, 66]; // Yellow/Orange color for HL replacing Late
                data.cell.styles.fontStyle = 'bold';
                // Change text from "HLt" to "HL" for display
                data.cell.text = ['HL'];
              } else if (cellValue === 'P') {
              data.cell.styles.textColor = [22, 163, 74];
              } else if (cellValue === 'A') {
              data.cell.styles.textColor = [220, 38, 38];
              } else if (cellValue === 'L') {
              data.cell.styles.textColor = [74, 108, 247];
              } else if (cellValue === 'Lt') {
              data.cell.styles.textColor = [245, 158, 66];
              } else if (cellValue === 'H') {
              data.cell.styles.textColor = [139, 92, 246];
              }
            }
          }
        }
      });

      // Add holidays list at the bottom if there are any holidays
      if (holidays.length > 0) {
        // Sort holidays by start date
        const sortedHolidays = [...holidays].sort((a, b) => {
          const dateA = parseISO(a.start_date);
          const dateB = parseISO(b.start_date);
          return dateA.getTime() - dateB.getTime();
        });

        // Position the holiday list near the bottom of the page
        const pageHeight = doc.internal.pageSize.height;
        const finalY = pageHeight - (holidays.length * 5 + 20); // Leave some margin at bottom
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Holidays:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        sortedHolidays.forEach((holiday, index) => {
          const startDate = format(parseISO(holiday.start_date), 'dd MMM');
          const endDate = format(parseISO(holiday.end_date), 'dd MMM');
          const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
          doc.text(`• ${holiday.name} (${dateRange})`, 18, finalY + ((index + 1) * 5));
          });
      }

      // Add footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10
        );
      }

      // Format date as dd-mmm-yyyy for filename
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fileName = `Staff Attendance Report (${formatDateForFileName(new Date())}).pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use the same mobile PDF handling as student report
        try {
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `staff-attendance-report-${timestamp}.pdf`;

          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
              await window.Capacitor.Plugins.Filesystem.writeFile({
                path: mobileFileName,
                data: pdfBase64,
                directory: 'DOCUMENTS'
              });

              const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                path: mobileFileName,
                directory: 'DOCUMENTS'
              });

              toast.showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              doc.save(mobileFileName);
              toast.showToast('PDF downloaded successfully!', 'success');
            }
          } else {
            // Fallback for web browsers
            try {
              const pdfBlob = doc.output('blob');
              const url = URL.createObjectURL(pdfBlob);
              
              const downloadContainer = document.createElement('div');
              downloadContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #4a6cf7;
                border-radius: 12px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 90vw;
              `;
              
              downloadContainer.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
                <p style="margin: 0 0 15px 0; color: #666;">Staff Attendance Report</p>
                <a href="${url}" download="${fileName}" 
                   style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                  📄 Download PDF
                </a>
                <br>
                <button onclick="this.parentElement.remove()" 
                        style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                               border-radius: 6px; margin-top: 10px; cursor: pointer;">
                  Close
                </button>
              `;
              
              document.body.appendChild(downloadContainer);
              
              setTimeout(() => {
                if (downloadContainer.parentElement) {
                  downloadContainer.remove();
                }
                URL.revokeObjectURL(url);
              }, 30000);
              
              toast.showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');
              
            } catch (webError) {
              
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Staff Attendance Report PDF</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { text-align: center; margin-bottom: 20px; }
                        .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                        .download-btn:hover { background: #3a5ce5; }
                        iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h2>📄 Staff Attendance Report PDF Generated</h2>
                          <p>If the PDF doesn't open automatically, use the download button below:</p>
                        </div>
                        <div style="text-align: center;">
                          <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                            📥 Download PDF File
                          </a>
                        </div>
                        <iframe src="${pdfDataUri}"></iframe>
                      </div>
                    </body>
                  </html>
                `);
                newWindow.document.close();
                toast.showToast(`PDF opened in new tab. Use the download button in the new tab.`, 'success');
              } else {
                toast.showToast('Please allow popups for this site to download the PDF', 'error');
              }
            }
          }
        } catch (error) {
          toast.showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        toast.showToast('Staff attendance report PDF generated successfully', 'success');
      }
    } catch (error) {
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setExportLoading(false);
      setIsExporting(false);
    }
  };

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem', 
          gap: 16,
          color: '#888',
          fontSize: '1.1rem',
          fontWeight: 600
        }}>
          <X style={{ fontSize: '1.5rem' }} />
          No school context found. Please contact your administrator.
        </div>
      </Container>
    );
  }

  // Show skeleton loader only for initial session loading
  if (loadingSession || loading) {
    return <Loader />;
  }

  if (!hasActiveSession) {
    return <NoSessionsFound />;
  }


  if (!loading && hasAnyStaff === false) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem', 
          gap: 16,
          color: '#888',
          fontSize: '1.1rem',
          fontWeight: 600
        }}>
          <X style={{ fontSize: '1.5rem' }} />
          No staff attendance records found for this session.
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        {/* Header row: always flex row, header left, toggle right */}
        <div
          style={{
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 8,
            marginBottom: window.innerWidth <= 700 ? 4 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatCard>
              <CalendarMonth style={{ fontSize: window.innerWidth <= 700 ? 16 : 20, marginRight: window.innerWidth <= 700 ? 1 : 2 }} />
              <span style={{ display: window.innerWidth <= 700 ? 'none' : 'inline' }}>Working Days</span>
              <StatValue>{loadingStaff ? '...' : workingDays}</StatValue>
            </StatCard>
            <StatCard>
              <BarChart style={{ fontSize: window.innerWidth <= 700 ? 16 : 20, marginRight: window.innerWidth <= 700 ? 1 : 2 }} />
              <span style={{ display: window.innerWidth <= 700 ? 'none' : 'inline' }}>Average Attendance</span>
              <StatValue>{loadingStaff ? '...' : `${avgAttendance}%`}</StatValue>
            </StatCard>
          </div>
          {/* Mobile filter toggle button */}
          <div style={{ display: window.innerWidth > 700 ? 'none' : 'flex', alignItems: 'center' }}>
            <button
              aria-label="Show/hide filters"
              style={{
                background: '#23242a',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                marginLeft: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={() => setShowMobileFilters(v => !v)}
            >
              <FilterIcon style={{ fontSize: 24, color: '#C0C0C0' }} />
            </button>
          </div>
          {/* Desktop filters */}
          <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
            <SegmentedGroup>
              <SegmentedSelect
                first
                value={selectedMonth.split('-')[1] || ''}
                onChange={e => {
                  const year = selectedMonth.split('-')[0] || new Date().getFullYear().toString();
                  setSelectedMonth(`${year}-${e.target.value.padStart(2, '0')}`);
                }}
              >
                <option value="">Month</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </SegmentedSelect>
              <SegmentedSelect
                value={selectedMonth.split('-')[0] || ''}
                onChange={e => {
                  const month = selectedMonth.split('-')[1] || '01';
                  setSelectedMonth(`${e.target.value}-${month}`);
                }}
              >
                <option value="">Year</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </SegmentedSelect>
              <SegmentedInput
                type="text"
                placeholder="Search by name or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ minWidth: '120px' }}
              />
              <SegmentedButton
                last
                onClick={handleExportPDF}
                disabled={isExporting || loading || loadingStaff || exportLoading}
                style={{ opacity: (isExporting || loading || loadingStaff || exportLoading) ? 0.7 : 1 }}
              >
                {exportLoading ? (
                  <div style={{ 
                    width: 16, 
                    height: 16, 
                    border: '2px solid #e0e7ff', 
                    borderTop: '2px solid #4a6cf7', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                ) : (
                  <PictureAsPdf style={{ fontSize: 16 }} />
                )}
                {exportLoading ? 'Exporting...' : 'Export PDF'}
              </SegmentedButton>
            </SegmentedGroup>
          </HeaderFilters>
        </div>
        {/* Mobile filters: 2 columns, only if showMobileFilters is true */}
        {window.innerWidth <= 700 && showMobileFilters && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              width: '100%',
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <SegmentedSelect
              value={selectedMonth.split('-')[1] || ''}
              onChange={e => {
                const year = selectedMonth.split('-')[0] || new Date().getFullYear().toString();
                setSelectedMonth(`${year}-${e.target.value.padStart(2, '0')}`);
              }}
              style={{ width: '100%' }}
            >
              <option value="">Month</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </SegmentedSelect>
            <SegmentedSelect
              value={selectedMonth.split('-')[0] || ''}
              onChange={e => {
                const month = selectedMonth.split('-')[1] || '01';
                setSelectedMonth(`${e.target.value}-${month}`);
              }}
              style={{ width: '100%' }}
            >
              <option value="">Year</option>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                );
              })}
            </SegmentedSelect>
            <SegmentedInput
              type="text"
              placeholder="Search by name or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
            <SegmentedButton
              onClick={handleExportPDF}
              disabled={isExporting || loading || loadingStaff || exportLoading}
              style={{ width: '100%', opacity: (isExporting || loading || loadingStaff || exportLoading) ? 0.7 : 1 }}
            >
              {exportLoading ? (
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  border: '2px solid #e0e7ff', 
                  borderTop: '2px solid #4a6cf7', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
              ) : (
                <PictureAsPdf style={{ fontSize: 16 }} />
              )}
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </SegmentedButton>
          </div>
        )}
      </Header>

      <TableWrapper>
        {loadingStaff ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: 12 }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '2px solid #f3f3f3', 
              borderTop: '2px solid #4a6cf7', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#888' }}>Loading staff...</div>
          </div>
        ) : (!loadingStaff && filteredStaff.length === 0) ? (
          hasAnyStaff ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontWeight: 600 }}>
              No staff found for the selected month or search criteria.
            </div>
          ) : null
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <NarrowTh>#</NarrowTh>
                  <NarrowTh>ID</NarrowTh>
                  <Th>STAFF</Th>
                  <Th>ROLE</Th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const date = new Date(parseISO(selectedMonth + '-01'));
                    date.setDate(i + 1);
                    const isSunday = date.getDay() === 0;
                    const DayHeader = isSunday ? Th : Th;
                    return (
                      <DayHeader key={i + 1}>{i + 1}</DayHeader>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Pre-compute holidays for each day to check if ALL staff have the same holiday
                  const dayHolidayMap = new Map<number, { name: string; holidayId: number; startIdx: number; endIdx: number; allStaffHaveIt: boolean }>();
                  
                  for (let dayIdx = 0; dayIdx < daysInMonth; dayIdx++) {
                    const holidaysForDay = new Map<string, { name: string; holidayId: number; startIdx: number; endIdx: number; staffCount: number }>();
                    
                    filteredStaff.forEach((staff, staffIdx) => {
                      const staffHolidayRanges = getHolidayRangesForStaff(staff.id);
                      const holidayForDay = staffHolidayRanges.find(h => 
                        dayIdx >= h.startIdx && dayIdx <= h.endIdx
                      );
                      
                      if (holidayForDay) {
                        const holidayKey = `${holidayForDay.holidayId}-${holidayForDay.startIdx}-${holidayForDay.endIdx}`;
                        if (!holidaysForDay.has(holidayKey)) {
                          holidaysForDay.set(holidayKey, {
                            name: holidayForDay.name,
                            holidayId: holidayForDay.holidayId,
                            startIdx: holidayForDay.startIdx,
                            endIdx: holidayForDay.endIdx,
                            staffCount: 0
                          });
                        }
                        const holiday = holidaysForDay.get(holidayKey)!;
                        holiday.staffCount++;
                      }
                    });
                    
                    // Check if any holiday is shared by ALL staff
                    for (const [holidayKey, holiday] of Array.from(holidaysForDay.entries())) {
                      if (holiday.staffCount === filteredStaff.length && dayIdx === holiday.startIdx) {
                        dayHolidayMap.set(dayIdx, {
                          ...holiday,
                          allStaffHaveIt: true
                        });
                        break;
                      }
                    }
                  }
                  
                  return filteredStaff.map((staff, staffIdx) => {
                    const staffHolidayRanges = getHolidayRangesForStaff(staff.id);
                    
                  return (
                  <tr key={staff.id}>
                      <NarrowTd>{staffIdx + 1}</NarrowTd>
                    <NarrowTd>{staff.id}</NarrowTd>
                    <StaffNameCell>{staff.name}</StaffNameCell>
                    <Td style={{ textAlign: 'left', fontWeight: 600, color: '#666' }}>{staff.role}</Td>
                    {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                        // Check if this day is a Sunday first (Sundays take priority)
                        const date = new Date(parseISO(selectedMonth + '-01'));
                        date.setDate(dayIdx + 1);
                        const isSunday = date.getDay() === 0;
                        if (isSunday) {
                          if (staffIdx === 0) {
                            return (
                                <SundayMergedCell
                                  key={`sunday-${dayIdx}`}
                                  rowSpan={filteredStaff.length}
                                  style={{
                                    background: isDark(theme) ? '#232a3b' : '#ffeaea',
                                    color: '#dc2626',
                                    verticalAlign: 'middle',
                                    textAlign: 'center',
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    fontSize: '1.1rem',
                                    letterSpacing: '0.2em',
                                  }}
                                >
                                  SUNDAY
                                </SundayMergedCell>
                            );
                          } else {
                        return null;
                      }
                        }
                        
                        // Check if ALL staff have the same holiday on this day
                        const allStaffHoliday = dayHolidayMap.get(dayIdx);
                        if (allStaffHoliday && allStaffHoliday.allStaffHaveIt) {
                          // Only render on the start day and first staff member
                          if (dayIdx === allStaffHoliday.startIdx && staffIdx === 0) {
                            const colSpan = allStaffHoliday.endIdx - allStaffHoliday.startIdx + 1;
                            const rowSpan = filteredStaff.length;
                            const key = `${allStaffHoliday.name}-${allStaffHoliday.holidayId}-all`;
                          const styleObj = holidayTextStyle[key] || { angle: -45, fontSize: '1em', maxWidth: '100px' };
                            
                          return (
                            <SundayMergedCell
                                key={`holiday-all-${allStaffHoliday.name}-${dayIdx}`}
                              colSpan={colSpan}
                                rowSpan={rowSpan}
                                ref={el => { if (el) holidayCellRefs.current[key] = el; }}
                              style={{
                                background: isDark(theme) ? '#232a3b' : '#eaf7ff',
                                color: '#4a6cf7',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              {colSpan === 1 ? (
                                <span
                                  style={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    fontSize: styleObj.fontSize,
                                    fontWeight: 700,
                                    letterSpacing: '0.15em',
                                    color: '#4a6cf7',
                                    display: 'inline-block',
                                    maxWidth: styleObj.maxWidth,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                    {allStaffHoliday.name.toUpperCase()}
                                </span>
                              ) : (
                                <AngledHolidayName
                                  style={{
                                    transform: `translate(-50%, -50%) rotate(${styleObj.angle}deg)` ,
                                    fontSize: styleObj.fontSize,
                                    left: '50%',
                                    top: '50%',
                                    maxWidth: styleObj.maxWidth,
                                  }}
                                >
                                    {allStaffHoliday.name.toUpperCase()}
                                </AngledHolidayName>
                              )}
                            </SundayMergedCell>
                          );
                          } else if (dayIdx >= allStaffHoliday.startIdx && dayIdx <= allStaffHoliday.endIdx) {
                            // Skip columns for other days in the range
                          return null;
                        }
                      }
                        
                        // Check if this staff member is on holiday for this day (partial holiday)
                        const holidayForDay = staffHolidayRanges.find(h => 
                          dayIdx >= h.startIdx && dayIdx <= h.endIdx
                        );
                        
                        // If on holiday, show blocking cross instead of status
                        if (holidayForDay) {
                          return (
                            <StatusCell 
                              key={dayIdx} 
                              status="H"
                                style={{
                                background: isDark(theme) ? '#232a3b' : '#eaf7ff',
                                  color: '#dc2626',
                                fontWeight: 700,
                                position: 'relative',
                                cursor: 'help'
                              }}
                              title={holidayForDay.name}
                            >
                              <Block 
                                sx={{ 
                                  fontSize: '1.5rem', 
                                  color: '#dc2626',
                                  display: 'block',
                                  margin: '0 auto'
                                }} 
                              />
                            </StatusCell>
                          );
                        }
                      
                      // Otherwise, render attendance status
                      const staffMember = filteredStaff[staffIdx];
                      const staffIndexInOriginal = staffMembers.findIndex(s => s.id === staffMember.id);
                      const status = attendanceMatrix[staffIndexInOriginal]?.[dayIdx] || '-';
                      const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;
                      const halfLeaveKey = staffMember ? `${staffMember.id}_${dateStr}` : '';
                      const halfLeave = halfLeaveKey ? halfLeavesMap.get(halfLeaveKey) : null;
                      const isPaidLeave = halfLeaveKey ? paidLeavesMap.get(halfLeaveKey) : false;
                      
                      return (
                        <StatusCell key={dayIdx} status={status} style={{ position: 'relative' }}>
                          {halfLeave && (
                            <HalfLeaveBadge title={`Half Leave (${halfLeave.leave_type === 'first_half' ? 'First Half' : 'Second Half'})`}>
                              HL
                            </HalfLeaveBadge>
                          )}
                          {status === 'L' && isPaidLeave && (
                            <PaidLeaveBadge title="Paid Leave" aria-label="Paid Leave">
                              <AttachMoney />
                            </PaidLeaveBadge>
                          )}
                          <span
                            ref={el => {
                              if (openDropdown && openDropdown.row === staffIdx && openDropdown.col === dayIdx && el) {
                                if (openDropdown.rect == null) {
                                  setOpenDropdown({ row: staffIdx, col: dayIdx, rect: el.getBoundingClientRect() });
                                }
                              }
                            }}
                            style={{ display: 'inline-block' }}
                          >
                            <StatusBlock
                              status={status}
                              onClick={e => {
                                if (isUpdatingStatus) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return;
                                }
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                
                                // Simple positioning logic for now
                                const viewportHeight = window.innerHeight;
                                const dropdownHeight = 200;
                                const spaceBelow = viewportHeight - rect.bottom;
                                const shouldPositionAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
                                
                                setOpenDropdown({ 
                                  row: staffIdx, 
                                  col: dayIdx, 
                                  rect,
                                  shouldPositionAbove
                                });
                              }}
                              style={{ 
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                opacity: isUpdatingStatus ? 0.6 : 1
                              }}
                            >
                              {status}
                            </StatusBlock>
                          </span>
                          {openDropdown && openDropdown.rect && openDropdown.row === staffIdx && openDropdown.col === dayIdx && 
                            ReactDOM.createPortal(
                              <StatusDropdown
                                ref={dropdownRef}
                                style={{
                                  position: 'fixed',
                                  top: openDropdown.shouldPositionAbove 
                                    ? openDropdown.rect.top - 204 // Position above with some margin
                                    : openDropdown.rect.bottom + 4, // Position below as usual
                                  left: openDropdown.rect.left, // Keep it simple for now
                                }}
                              >
                                {statusOptions.map(opt => (
                                  <StatusOption
                                    key={opt.value}
                                    color={opt.color}
                                    onClick={() => {
                                      if (isUpdatingStatus) return;
                                      handleStatusChange(opt, staffIdx, dayIdx, staffMember);
                                    }}
                                    style={{ 
                                      opacity: isUpdatingStatus ? 0.5 : 1,
                                      cursor: isUpdatingStatus ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    {opt.label}
                                  </StatusOption>
                                ))}
                                <StatusOption
                                  color={deleteOption.color}
                                  style={{ 
                                    fontWeight: 700, 
                                    borderTop: '1px solid #eee', 
                                    marginTop: 2,
                                    opacity: isUpdatingStatus ? 0.5 : 1,
                                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={() => {
                                    if (isUpdatingStatus) return;
                                    handleStatusChange(deleteOption, staffIdx, dayIdx, staffMember);
                                  }}
                                >
                                  {deleteOption.label}
                                </StatusOption>
                              </StatusDropdown>,
                              document.body
                            )
                          }
                        </StatusCell>
                      );
                    })}
                  </tr>
                  );
                  });
                })()}
                {/* Summary row showing daily absent and leave counts */}
                <SummaryRow>
                  <SummaryLabelCell colSpan={4}>Absents/Leaves:</SummaryLabelCell>
                  {(() => {
                    let skipCols = 0;
                    // Get all unique holiday ranges across all staff (computed once before the loop)
                    const allHolidayRanges = new Map<number, { name: string; startIdx: number; endIdx: number }>();
                    filteredStaff.forEach(staffMember => {
                      const staffHolidays = getHolidayRangesForStaff(staffMember.id);
                      staffHolidays.forEach(holiday => {
                        // Use startIdx as key to avoid duplicates
                        if (!allHolidayRanges.has(holiday.startIdx) || 
                            allHolidayRanges.get(holiday.startIdx)!.endIdx < holiday.endIdx) {
                          allHolidayRanges.set(holiday.startIdx, {
                            name: holiday.name,
                            startIdx: holiday.startIdx,
                            endIdx: holiday.endIdx
                          });
                        }
                      });
                    });
                    
                    return Array.from({ length: daysInMonth }, (_, dayIdx) => {
                      if (skipCols > 0) {
                        skipCols--;
                        return null;
                      }
                      
                      const date = new Date(parseISO(selectedMonth + '-01'));
                      date.setDate(dayIdx + 1);
                      const isSunday = date.getDay() === 0;
                      
                      // Check if this day is the start of any holiday range (for any staff)
                      const holiday = allHolidayRanges.get(dayIdx);
                      if (holiday) {
                        skipCols = holiday.endIdx - holiday.startIdx;
                        const colSpan = holiday.endIdx - holiday.startIdx + 1;
                        return (
                          <SummaryCell 
                            key={dayIdx} 
                            colSpan={colSpan}
                            style={{ 
                              background: isDark(theme) ? '#232a3b' : '#eaf7ff',
                              color: '#4a6cf7'
                            }}
                          >
                            -
                          </SummaryCell>
                        );
                      }
                      
                      if (isSunday) {
                        return (
                          <SummaryCell 
                            key={dayIdx} 
                            style={{ background: isDark(theme) ? '#232a3b' : '#ffeaea', color: '#dc2626' }}
                          >
                            -
                          </SummaryCell>
                        );
                      }
                      
                      // Count absent and leave staff for this day (excluding those on holiday)
                      let absentCount = 0;
                      filteredStaff.forEach((staffMember) => {
                        // Check if this staff member is on holiday for this day
                        const staffHolidays = getHolidayRangesForStaff(staffMember.id);
                        const isOnHoliday = staffHolidays.some(h => 
                          dayIdx >= h.startIdx && dayIdx <= h.endIdx
                        );
                        
                        // Only count if not on holiday
                        if (!isOnHoliday) {
                          const staffIndexInOriginal = staffMembers.findIndex(s => s.id === staffMember.id);
                        const status = attendanceMatrix[staffIndexInOriginal]?.[dayIdx];
                        if (status === 'A' || status === 'L') {
                          absentCount++;
                          }
                        }
                      });
                      
                      return (
                        <SummaryCell key={dayIdx} style={{ color: absentCount > 0 ? '#dc2626' : 'inherit' }}>
                          {absentCount > 0 ? absentCount : '-'}
                        </SummaryCell>
                      );
                    });
                  })()}
                </SummaryRow>
              </tbody>
            </Table>
          </>
        )}
      </TableWrapper>

      {leaveDecision && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: '#0006',
              zIndex: 3999
            }}
            onClick={() => setLeaveDecision(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: modalTheme.CARD,
              border: `1px solid ${modalTheme.BORDER}`,
              borderRadius: 14,
              padding: '1.2rem',
              width: 'min(92vw, 440px)',
              zIndex: 4000,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: modalTheme.TEXT_PRIMARY, fontSize: '1rem' }}>Leave Type</h3>
            <p style={{ margin: '0 0 1rem 0', color: modalTheme.TEXT_SECONDARY, fontSize: '0.9rem', lineHeight: 1.45 }}>
              <strong>{leaveDecision.staff.name}</strong> already has an absent or leave entry in this month.
              Choose whether this leave should be treated as paid or unpaid.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  const currentDecision = leaveDecision;
                  if (!currentDecision) return;
                  setLeaveDecision(null);
                  await persistAttendanceStatus('L', currentDecision.idx, currentDecision.dayIdx, currentDecision.staff, true);
                }}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: `1px solid ${modalTheme.BORDER}`,
                  background: 'transparent',
                  color: modalTheme.TEXT_PRIMARY,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Paid Leave
              </button>
              <button
                onClick={async () => {
                  const currentDecision = leaveDecision;
                  if (!currentDecision) return;
                  setLeaveDecision(null);
                  await persistAttendanceStatus('L', currentDecision.idx, currentDecision.dayIdx, currentDecision.staff, false);
                }}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: `1px solid ${modalTheme.ACCENT}`,
                  background: modalTheme.ACCENT,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Unpaid Leave
              </button>
            </div>
          </div>
        </>
      )}
    </Container>
  );
};

export default StaffAttendanceReport;
