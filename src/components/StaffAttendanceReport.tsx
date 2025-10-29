import React, { useState, useEffect, useRef } from 'react';
import styled, { useTheme } from 'styled-components';
import { supabase } from '../supabaseClient';
import { BarChart, CalendarMonth, PictureAsPdf, X, FilterList as FilterIcon } from '@mui/icons-material';
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

interface Holiday {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

// --- Dashboard-style Skeleton Loading Components for StaffAttendanceReport ---
const StaffAttendanceReportSkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: clamp(8px, 2vw, 24px);
  box-sizing: border-box;
  @media (max-width: 900px) {
    padding: clamp(6px, 2vw, 12px);
  }
  @media (max-width: 600px) {
    padding: 8px 10px;
    padding-bottom: 2.5rem;
  }
`;

const SkeletonFilterBar = styled.div`
  display: flex;
  gap: 1.1rem;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 1.1rem;
  padding: 0.3rem 1.2rem;
  border-radius: 18px;
  background: ${({ theme }) => theme.CARD};
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  min-height: 48px;
  flex-wrap: wrap;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
    padding: 0.7rem 0.5rem;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

const SkeletonFilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 110px;
  flex: 1 1 120px;
  @media (max-width: 700px) {
    min-width: 0;
    width: 100%;
    flex: none;
  }
`;

const SkeletonLabel = styled.div`
  width: 60px;
  height: 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  margin-bottom: 4px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonInput = styled.div`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonSummaryGrid = styled.div`
  display: flex;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
`;

const SkeletonSummaryCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  padding: 1.2rem 2.2rem;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
`;

const SkeletonSummaryTitle = styled.div`
  width: 80px;
  height: 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonSummaryValue = styled.div`
  width: 60px;
  height: 28px;
  border-radius: 6px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonTableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  margin-top: 1.2rem;
`;

const SkeletonTable = styled.div`
  width: 100%;
  min-width: 900px;
  display: table;
  border-collapse: collapse;
`;

const SkeletonTableRow = styled.div`
  display: table-row;
`;

const SkeletonTableCell = styled.div`
  display: table-cell;
  padding: 0.18rem 0.2rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  min-width: 34px;
  max-width: 36px;
  height: 32px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonStaffNameCell = styled(SkeletonTableCell)`
  min-width: 120px;
  max-width: 220px;
`;

const SkeletonTableHeader = styled(SkeletonTableCell)`
  background: ${({ theme }) => theme.CARD};
  height: 28px;
`;

const skeletonStaffRows = 7;
const skeletonDays = 20;

const StaffAttendanceReportSkeleton: React.FC = () => (
  <StaffAttendanceReportSkeletonContainer>
    <SkeletonFilterBar>
      {[1,2,3,4].map(i => (
        <SkeletonFilterGroup key={i}>
          <SkeletonLabel />
          <SkeletonInput />
        </SkeletonFilterGroup>
      ))}
    </SkeletonFilterBar>
    <SkeletonSummaryGrid>
      {[1,2].map(i => (
        <SkeletonSummaryCard key={i}>
          <SkeletonSummaryTitle />
          <SkeletonSummaryValue />
        </SkeletonSummaryCard>
      ))}
    </SkeletonSummaryGrid>
    <SkeletonTableWrapper>
      <SkeletonTable>
        <SkeletonTableRow>
          <SkeletonTableHeader style={{ minWidth: 28, maxWidth: 28 }} />
          <SkeletonTableHeader style={{ minWidth: 28, maxWidth: 28 }} />
          <SkeletonTableHeader style={{ minWidth: 120, maxWidth: 220 }} />
          {Array.from({ length: skeletonDays }).map((_, i) => (
            <SkeletonTableHeader key={i} />
          ))}
        </SkeletonTableRow>
        {Array.from({ length: skeletonStaffRows }).map((_, rowIdx) => (
          <SkeletonTableRow key={rowIdx}>
            <SkeletonTableCell style={{ minWidth: 28, maxWidth: 28 }} />
            <SkeletonTableCell style={{ minWidth: 28, maxWidth: 28 }} />
            <SkeletonStaffNameCell />
            {Array.from({ length: skeletonDays }).map((_, i) => (
              <SkeletonTableCell key={i} />
            ))}
          </SkeletonTableRow>
        ))}
      </SkeletonTable>
    </SkeletonTableWrapper>
  </StaffAttendanceReportSkeletonContainer>
);

const StaffAttendanceReport: React.FC = () => {
  const theme = useTheme();
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
        console.error('Error fetching active session:', error);
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
        .select('staff_id, date, status')
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
      
      // Build attendance matrix
      setProgress(80);
      const attMap: Record<number, Record<number, string>> = {};
      attendanceData.forEach((rec: any) => {
        const day = parseInt(rec.date.split('-')[2], 10);
        if (!attMap[rec.staff_id]) attMap[rec.staff_id] = {};
        attMap[rec.staff_id][day] = rec.status === 'present' ? 'P' : rec.status === 'absent' ? 'A' : rec.status === 'late' ? 'Lt' : rec.status === 'leave' ? 'L' : rec.status === 'half_day' ? 'H' : '-';
      });
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
        console.log('Fetching staff holidays with params:', {
          sessionId,
          startDate,
          endDate
        });

        // Fetch all holidays for the period - staff holidays are global (no class/section filtering needed)
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

        console.log('Raw staff holidays data:', allHolidaysData);

        // For staff, we include all holidays (global holidays apply to all staff)
        const relevantHolidays = (allHolidaysData || []).map(h => ({
          id: h.id,
          name: h.name,
          start_date: h.start_date,
          end_date: h.end_date
        }));

        console.log('Final processed staff holidays:', relevantHolidays);
        setHolidays(relevantHolidays);
      } catch (error) {
        console.error('Error fetching staff holidays:', error);
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

  // Helper: Get all holiday ranges for the month
  const holidayRanges = holidays.map(holiday => {
    const start = parseISO(holiday.start_date);
    const end = parseISO(holiday.end_date);
    const monthStart = parseISO(selectedMonth + '-01');
    const daysInMonth = getDaysInMonth(monthStart);
    const firstDayIdx = Math.max(0, Math.ceil((start.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
    const lastDayIdx = Math.min(daysInMonth - 1, Math.floor((end.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      name: holiday.name,
      startIdx: firstDayIdx,
      endIdx: lastDayIdx
    };
  });

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
    // For each holiday, measure the cell and set angle/fontSize
    holidays.forEach(holiday => {
      const key = `${holiday.name}-${holidays.find(hh => hh.name === holiday.name)?.start_date}`;
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
  }, [holidays, filteredStaff.length]);

  const handleStatusChange = async (
    opt: StatusOption,
    idx: number,
    dayIdx: number,
    staff: StaffMember
  ) => {
    // Debounce rapid clicks (prevent clicks within 500ms)
    const now = Date.now();
    if (now - lastClickTimeRef.current < 500) {
      console.log('Click too soon, ignoring');
      return;
    }
    lastClickTimeRef.current = now;
    
    // Create a unique key for this update operation
    const updateKey = `${staff.id}-${selectedMonth}-${dayIdx + 1}-${opt.value}`;
    
    // Prevent duplicate calls
    if (updatingStatusRef.current.has(updateKey)) {
      console.log('Update already in progress for:', updateKey);
      return;
    }
    
    // Add to updating set
    updatingStatusRef.current.add(updateKey);
    setIsUpdatingStatus(true);
    
    console.log('Starting status change for:', updateKey);
    
    try {
      if (opt.value === 'DELETE') {
        // Delete attendance record from Supabase
        setAttendanceMatrix(prev => {
          const updated = prev.map(row => [...row]);
          updated[idx][dayIdx] = '-';
          // --- Realtime average and working days update ---
          const daysWithAttendance = new Set<number>();
          for (let d = 0; d < updated[0]?.length; d++) {
            for (let s = 0; s < updated.length; s++) {
              if (updated[s][d] && updated[s][d] !== '-') {
                daysWithAttendance.add(d + 1);
                break;
              }
            }
          }
          setWorkingDays(daysWithAttendance.size);
          let presentCount = 0;
          let totalPossible = updated.length * daysWithAttendance.size;
          updated.forEach(row => {
            daysWithAttendance.forEach(day => {
              const status = row[day - 1];
              if (status === 'P' || status === 'Lt' || status === 'H') presentCount++;
            });
          });
          setAvgAttendance(totalPossible ? Math.round((presentCount / totalPossible) * 100) : 0);
          // --- End realtime update ---
          return updated;
        });
        setOpenDropdown(null);
        const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;
        
        // Validate required fields for delete
        if (!staff.id || !dateStr || !user?.school_id || !sessionId) {
          throw new Error(`Missing required fields for delete: staff_id=${staff.id}, date=${dateStr}, school_id=${user?.school_id}, session_id=${sessionId}`);
        }
        
        console.log('Attempting to delete staff attendance record:', {
          staff_id: staff.id,
          school_id: user.school_id,
          session_id: sessionId,
          date: dateStr
        });
        
        const { data, error } = await supabase
          .from('staff_attendance_records')
          .delete()
          .eq('staff_id', staff.id)
          .eq('school_id', user.school_id)
          .eq('session_id', sessionId)
          .eq('date', dateStr);
          
        if (error) {
          console.error('Supabase delete error:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('Delete successful:', data);
        toast.showToast('Staff attendance record deleted.', 'success');
        return;
      }
      
      if (!sessionId) {
        toast.showToast('No active session found. Please activate a session first.', 'error');
        return;
      }
      
      setAttendanceMatrix(prev => {
        const updated = prev.map(row => [...row]);
        updated[idx][dayIdx] = opt.value;

        // --- Realtime average and working days update ---
        // 1. Find working days (days with at least one attendance record)
        const daysWithAttendance = new Set<number>();
        for (let d = 0; d < updated[0]?.length; d++) {
          for (let s = 0; s < updated.length; s++) {
            if (updated[s][d] && updated[s][d] !== '-') {
              daysWithAttendance.add(d + 1);
              break;
            }
          }
        }
        setWorkingDays(daysWithAttendance.size);
        // 2. Calculate average attendance (P, Lt, and H count as present)
        let presentCount = 0;
        let totalPossible = updated.length * daysWithAttendance.size;
        updated.forEach(row => {
          daysWithAttendance.forEach(day => {
            const status = row[day - 1];
            if (status === 'P' || status === 'Lt' || status === 'H') presentCount++;
          });
        });
        setAvgAttendance(totalPossible ? Math.round((presentCount / totalPossible) * 100) : 0);
        // --- End realtime update ---

        return updated;
      });
      setOpenDropdown(null);
      const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;
      
      // Validate required fields
      if (!staff.id || !dateStr || !user?.school_id || !sessionId) {
        throw new Error(`Missing required fields: staff_id=${staff.id}, date=${dateStr}, school_id=${user?.school_id}, session_id=${sessionId}`);
      }
      
      // Map UI status to DB status
      const statusMap: Record<string, string> = {
        'P': 'present',
        'A': 'absent',
        'L': 'leave',
        'Lt': 'late',
        'H': 'half_day'
      };
      const dbStatus = statusMap[opt.value] || 'present';
      const upsertPayload = {
        staff_id: staff.id,
        date: dateStr,
        status: dbStatus,
        school_id: user.school_id,
        session_id: sessionId
      };
      
      console.log('Attempting to upsert staff attendance record:', upsertPayload);
      
      // First, check if record already exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('staff_attendance_records')
        .select('id, status')
        .eq('staff_id', staff.id)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .eq('date', dateStr)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing record:', checkError);
        throw checkError;
      }
      
      let data, error;
      
      if (existingRecord) {
        // Record exists, update it
        console.log('Record exists, updating:', existingRecord);
        const updateResult = await supabase
          .from('staff_attendance_records')
          .update({ status: dbStatus })
          .eq('id', existingRecord.id);
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Record doesn't exist, insert it
        console.log('Record does not exist, inserting new record');
        const insertResult = await supabase
          .from('staff_attendance_records')
          .insert([upsertPayload]);
        data = insertResult.data;
        error = insertResult.error;
      }
      
      if (error) {
        console.error('Supabase upsert error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Upsert successful:', data);
      toast.showToast('Staff attendance updated successfully.', 'success');
      
    } catch (err: any) {
      console.error('Full error object:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      // Revert the UI state on error
      setAttendanceMatrix(prev => {
        const reverted = prev.map(row => [...row]);
        reverted[idx][dayIdx] = attendanceMatrix[idx]?.[dayIdx] || '-';
        return reverted;
      });
      
      toast.showToast(`Could not update staff attendance: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      // Clean up
      updatingStatusRef.current.delete(updateKey);
      setIsUpdatingStatus(false);
      console.log('Status change completed for:', updateKey);
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
        console.log('Cleaning up updatingStatusRef, current size:', updatingStatusRef.current.size);
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

      // Prepare table data
      const sortedStaff = [...filteredStaff].sort((a, b) => a.id - b.id);
      const tableData = sortedStaff.map((staff, idx) => {
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
            return attendanceMatrix[idx]?.[dayIdx] || '-';
          })
        ];
        return row;
      });

      // Prepare table headers
      const headers = [
        '#',
        'ID',
        'Staff Name',
        'Role',
        ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString())
      ];

      // Prepare a map of holiday days for quick lookup
      let holidayDayMap: Record<number, string> = {};
      holidays.forEach(holiday => {
        const start = parseISO(holiday.start_date);
        const end = parseISO(holiday.end_date);
        const monthStart = parseISO(selectedMonth + '-01');
        const daysInMonth = getDaysInMonth(monthStart);
        const firstDayIdx = Math.max(0, Math.ceil((start.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
        const lastDayIdx = Math.min(daysInMonth - 1, Math.floor((end.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
        for (let i = firstDayIdx; i <= lastDayIdx; i++) {
          holidayDayMap[i + 1] = holiday.name;
        }
      });

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
          // Style for holiday columns
          if (data.column.index > 3) {
            const dayIdx = data.column.index - 3;
            if (holidayDayMap[dayIdx + 1]) {
              data.cell.styles.fillColor = [234, 247, 255];
              data.cell.styles.textColor = [74, 108, 247];
              if (data.row.section !== 'head') {
                // Remove text from holiday cells
                data.cell.text = [''];
              }
            }
          }
          // Style for status cells
          if (data.column.index > 3 && data.cell.raw !== '') {
            const status = String(data.cell.raw || '');
            if (status === 'P') {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (status === 'A') {
              data.cell.styles.textColor = [220, 38, 38];
            } else if (status === 'L') {
              data.cell.styles.textColor = [74, 108, 247];
            } else if (status === 'Lt') {
              data.cell.styles.textColor = [245, 158, 66];
            } else if (status === 'H') {
              data.cell.styles.textColor = [139, 92, 246];
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
              console.error('Filesystem error:', fsError);
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
              console.error('Web download failed, trying data URI method:', webError);
              
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
          console.error('Mobile PDF export error:', error);
          toast.showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        toast.showToast('Staff attendance report PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
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
    return <StaffAttendanceReportSkeleton />;
  }

  if (!hasActiveSession) {
    return <NoSessionsFound />;
  }

  if (loading) {
    return <Loader />;
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
                {filteredStaff.map((staff, idx) => {
                  let skipCols = 0;
                  return (
                  <tr key={staff.id}>
                    <NarrowTd>{idx + 1}</NarrowTd>
                    <NarrowTd>{staff.id}</NarrowTd>
                    <StaffNameCell>{staff.name}</StaffNameCell>
                    <Td style={{ textAlign: 'left', fontWeight: 600, color: '#666' }}>{staff.role}</Td>
                    {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                      if (skipCols > 0) {
                        skipCols--;
                        return null;
                      }
                      // Check if this day is the start of a holiday range
                      const holiday = holidayRanges.find(h => h.startIdx === dayIdx);
                      if (holiday) {
                        if (idx === 0) {
                          skipCols = holiday.endIdx - holiday.startIdx;
                          const colSpan = holiday.endIdx - holiday.startIdx + 1;
                          const key = `${holiday.name}-${holidays.find(hh => hh.name === holiday.name)?.start_date}`;
                          const styleObj = holidayTextStyle[key] || { angle: -45, fontSize: '1em', maxWidth: '100px' };
                          return (
                            <SundayMergedCell
                              key={`holiday-${holiday.name}-${dayIdx}`}
                              rowSpan={filteredStaff.length}
                              colSpan={colSpan}
                              ref={el => { holidayCellRefs.current[key] = el; }}
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
                                  {holiday.name.toUpperCase()}
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
                                  {holiday.name.toUpperCase()}
                                </AngledHolidayName>
                              )}
                            </SundayMergedCell>
                          );
                        } else {
                          skipCols = holiday.endIdx - holiday.startIdx;
                          return null;
                        }
                      }
                      // Check if this day is a Sunday
                      const date = new Date(parseISO(selectedMonth + '-01'));
                      date.setDate(dayIdx + 1);
                      const isSunday = date.getDay() === 0;
                      if (isSunday) {
                        if (idx === 0) {
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
                      // Otherwise, render attendance status
                      const status = attendanceMatrix[idx]?.[dayIdx] || '-';
                      return (
                        <StatusCell key={dayIdx} status={status} style={{ position: 'relative' }}>
                          <span
                            ref={el => {
                              if (openDropdown && openDropdown.row === idx && openDropdown.col === dayIdx && el) {
                                if (openDropdown.rect == null) {
                                  setOpenDropdown({ row: idx, col: dayIdx, rect: el.getBoundingClientRect() });
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
                                  row: idx, 
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
                          {openDropdown && openDropdown.rect && openDropdown.row === idx && openDropdown.col === dayIdx && 
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
                                      handleStatusChange(opt, idx, dayIdx, staff);
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
                                    handleStatusChange(deleteOption, idx, dayIdx, staff);
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
                })}
              </tbody>
            </Table>
          </>
        )}
      </TableWrapper>
    </Container>
  );
};

export default StaffAttendanceReport;
