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
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NoSessionsFound from './NoSessionsFound';
import NoStudentsFound from './NoStudentsFound';
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

// Legacy components (keeping for compatibility)
const FilterBar = styled.div`
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

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
    padding: 0.7rem 0.5rem;
  }
`;
const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 110px;
  @media (max-width: 700px) {
    min-width: 0;
    width: 100%;
  }
`;
const Label = styled.label`
  font-size: 0.89rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-bottom: 0.1rem;
`;
const Select = styled.select`
  padding: 0.3rem 0.7rem;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.97rem;
  outline: none;
  min-width: 90px;
`;
const Input = styled.input`
  padding: 0.3rem 0.7rem;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.97rem;
  outline: none;
  min-width: 110px;
`;
const SearchInput = styled(Input)`
  min-width: 200px;
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;
const Button = styled.button`
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  transition: background 0.18s, box-shadow 0.18s;
  &:hover {
    background: ${({ theme }) => theme.ACCENT + 'cc'};
    box-shadow: 0 2px 8px ${({ theme }) => theme.ACCENT}22;
  }
`;
const SummaryGrid = styled.div`
  display: flex;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
`;
const SummaryCard = styled.div`
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
`;
const CardTitle = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.05rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;
const CardValue = styled.div`
  font-size: 2.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
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
const StatusCell = styled(Td) <{ status?: string }>`
  font-weight: 700;
  color: ${({ status }) =>
    status === 'P' ? '#16a34a' :
      status === 'A' ? '#dc2626' :
        status === 'Lt' ? '#f59e42' :
          status === 'L' ? '#4a6cf7' :
            '#888'};
  background: transparent;
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
const isDark = (theme: any) => theme.BG === '#252525';
const highlightDark = '#232a3b';
const SundayTh = styled(Th)`
  background: ${({ theme }) => isDark(theme) ? highlightDark : '#ffeaea'} !important;
  color: #dc2626 !important;
`;
const SundayTd = styled(Td) <{ status?: string }>`
  background: ${({ theme }) => isDark(theme) ? highlightDark : '#fff3f3'} !important;
  color: #dc2626 !important;
  font-style: italic;
`;
const NarrowTh = styled(Th)`
  min-width: 28px;
  max-width: 28px;
`;
const NarrowTd = styled(Td)`
  min-width: 28px;
  max-width: 28px;
`;
const StudentNameCell = styled(Td)`
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
            'rgba(68,68,68,0.08)'};
  color: ${({ status }) =>
    status === 'P' ? '#16a34a' :
      status === 'A' ? '#dc2626' :
        status === 'Lt' ? '#f59e42' :
          status === 'L' ? '#4a6cf7' :
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
const SundayMergedCell = styled.td`
  background: ${({ theme }) => isDark(theme) ? '#232a3b' : '#eaeaea'} !important;
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

const statusOptions = [
  { value: 'P', label: 'Present', color: '#16a34a' },
  { value: 'A', label: 'Absent', color: '#dc2626' },
  { value: 'L', label: 'Leave', color: '#4a6cf7' },
  { value: 'Lt', label: 'Late', color: '#f59e42' },
];
const deleteOption = { value: 'DELETE', label: 'Delete', color: '#dc2626' };

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface Student {
  id: number;
  name: string;
}

const ExportButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: ${({ theme }) => theme.ACCENT};
  &:hover {
    background: ${({ theme }) => theme.ACCENT + 'cc'};
  }
`;

const PDFContainer = styled.div`
  @media print {
    width: 297mm;
    height: 210mm;
    padding: 10mm;
    margin: 0;
    background: white;
    page-break-after: always;
  }
`;

const PDFHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  @media print {
    margin-bottom: 0.5rem;
  }
`;

const PDFTitle = styled.h1`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  @media print {
    font-size: 1.2rem;
  }
`;

const PDFInfo = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  @media print {
    font-size: 0.8rem;
  }
`;

const PDFTable = styled(Table)`
  @media print {
    font-size: 0.8rem;
    thead tr {
      background: #f5f5f5 !important;
      -webkit-print-color-adjust: exact;
    }
    td, th {
      padding: 0.1rem 0.2rem;
    }
  }
`;

// Helper for dynamic angle and font size
function getHolidayAngleAndFont(colSpan: number) {
  if (colSpan <= 1) return { angle: 0, fontSize: '1.2em' };
  if (colSpan === 2) return { angle: -20, fontSize: '1.2em' };
  if (colSpan === 3) return { angle: -30, fontSize: '1.15em' };
  if (colSpan === 4) return { angle: -40, fontSize: '1.1em' };
  if (colSpan === 5) return { angle: -50, fontSize: '1em' };
  if (colSpan === 6) return { angle: -58, fontSize: '0.95em' };
  return { angle: -65, fontSize: '0.9em' };
}

// Add at the top or before handleExportPDF
interface MergedCell {
  content: string;
  colSpan?: number;
  rowSpan?: number;
  isSunday?: boolean;
  isHoliday?: boolean;
  holidayColSpan?: number;
  holidayName?: string;
}


const AttendanceReport: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startProgress, setProgress, completeProgress } = useProgress();

  // School ID check is now done at render time to prevent hook violations

  const [classes, setClasses] = useState<Array<{ id: string; name: string; has_sections?: boolean }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [students, setStudents] = useState<Array<{ id: number; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceMatrix, setAttendanceMatrix] = useState<string[][]>([]);
  const [workingDays, setWorkingDays] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
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
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [teacherSections, setTeacherSections] = useState<Array<{ id: string; name: string; class_id: string }>>([]);
  const [teacherClasses, setTeacherClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [holidays, setHolidays] = useState<Array<{
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  }>>([]);
  const lastHolidayNameRef = useRef<string>('');
  const [holidayTextStyle, setHolidayTextStyle] = useState<{ [key: string]: { angle: number, fontSize: string, maxWidth?: string } }>({});
  const holidayCellRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const updatingStatusRef = useRef<Set<string>>(new Set());
  const lastClickTimeRef = useRef<number>(0);
  const [halfLeavesMap, setHalfLeavesMap] = useState<Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>>(new Map());

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

  // Check if there are any students with attendance records in the system
  useEffect(() => {
    const checkForAnyActiveStudents = async () => {
      if (!user?.school_id || !sessionId) return;

      // Fetch all student IDs from student_class_history for the active session
      const { data: schData, error: schError } = await supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', sessionId)
        .eq('school_id', user.school_id);

      if (schError || !schData || schData.length === 0) {
        setHasAnyStudents(false);
        return;
      }

      // Fetch student details with status: 'active'
      const studentIds = schData.map(sch => sch.student_id);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', studentIds);

      if (!studentsError && studentsData && studentsData.length > 0) {
        setHasAnyStudents(true);
      } else {
        setHasAnyStudents(false);
      }
    };

    checkForAnyActiveStudents();
  }, [user?.school_id, sessionId]);

  // Fetch classes on mount
  useEffect(() => {
    if (!hasActiveSession) return;
    const fetchClasses = async () => {
      if (!user?.school_id) {
        toast.showToast('User school information not found', 'error');
        return;
      }
      setLoadingClasses(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user.school_id);
      setLoadingClasses(false);
      if (!error && data) {
        const sortedClasses = sortClasses(data);
        setClasses(sortedClasses);
      }
    };
    fetchClasses();
  }, [user?.school_id, hasActiveSession]);

  // Fetch sections when class changes
  useEffect(() => {
    // Clear students and attendance data when class changes
    setStudents([]);
    setAttendanceMatrix([]);
    setWorkingDays(0);
    setAvgAttendance(0);

    if (!selectedClass || !user?.school_id) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;

    if (!hasSections) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    const fetchSections = async () => {
      setLoadingSections(true);
      const { data, error } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', selectedClass)
        .eq('school_id', user.school_id)
        .order('name');
      setLoadingSections(false);
      if (!error && data) setSections(data);
    };
    fetchSections();
  }, [selectedClass, user?.school_id, classes]);

  // Fetch students and attendance when filters change
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedClass || !selectedMonth || !user?.school_id) return;

      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;

      if (hasSections && !selectedSection) return; // Only return if sections are required but not selected

      const minDuration = 1500; // 1.5 seconds
      const start = Date.now();
      setLoadingStudents(true);
      startProgress(false);
      setProgress(10);
      // Fetch attendance records for the selected month/year
      setProgress(20);
      const startDate = selectedMonth + '-01';
      const daysInMonth = getDaysInMonth(parseISO(startDate));
      const endDate = format(new Date(parseISO(startDate).getFullYear(), parseISO(startDate).getMonth(), daysInMonth), 'yyyy-MM-dd');

      let attendanceQuery = supabase
        .from('attendance_records')
        .select('student_id, date, status')
        .eq('class_id', selectedClass)
        .eq('school_id', user.school_id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (hasSections) {
        attendanceQuery = attendanceQuery.eq('section_id', selectedSection);
      } else {
        attendanceQuery = attendanceQuery.is('section_id', null);
      }

      const { data: rawAttendanceData, error: attendanceError } = await attendanceQuery;
      const attendanceData = (attendanceError || !rawAttendanceData) ? [] : rawAttendanceData;

      setProgress(40);

      // Fetch students from student_class_history for the active session and selected class/section
      let schQuery = supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', sessionId)
        .eq('new_class_id', selectedClass)
        .eq('school_id', user.school_id);

      // Only filter by section if the class has sections
      if (hasSections) {
        schQuery = schQuery.eq('new_section_id', selectedSection);
      } else {
        schQuery = schQuery.is('new_section_id', null);
      }

      const { data: schData, error: schError } = await schQuery;

      if (schError || !schData || schData.length === 0) {
        setStudents([]);
        setAttendanceMatrix([]);
        setWorkingDays(0);
        setAvgAttendance(0);
        setLoadingStudents(false);
        setProgress(100);
        completeProgress();
        return;
      }

      // Get student IDs from student_class_history
      const studentIds = schData.map(sch => sch.student_id);

      // Fetch full student details
      setProgress(60);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, roll_number')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', studentIds);

      if (studentsError || !studentsData || studentsData.length === 0) {
        setStudents([]);
        setAttendanceMatrix([]);
        setWorkingDays(0);
        setAvgAttendance(0);
        setLoadingStudents(false);
        setProgress(100);
        completeProgress();
        return;
      }

      setStudents(studentsData);

      // Fetch half leaves for students in this month
      setProgress(70);
      if (sessionId) {
        const { data: halfLeavesData } = await supabase
          .from('half_leaves')
          .select('person_id, date, leave_type, arrival_time, departure_time')
          .eq('person_type', 'student')
          .eq('session_id', sessionId)
          .eq('school_id', user.school_id)
          .in('person_id', studentIds)
          .gte('date', startDate)
          .lte('date', endDate);

        // Create a map for quick lookup: "studentId_date" -> half leave data
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
      attendanceData.forEach((rec: any) => {
        const day = parseInt(rec.date.split('-')[2], 10);
        if (!attMap[rec.student_id]) attMap[rec.student_id] = {};
        attMap[rec.student_id][day] = rec.status === 'present' ? 'P' : rec.status === 'absent' ? 'A' : rec.status === 'late' ? 'Lt' : rec.status === 'leave' ? 'L' : '-';
      });
      const matrix = studentsData.map((stu: any) =>
        Array.from({ length: daysInMonth }, (_, i) => attMap[stu.id]?.[i + 1] || '-')
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
      let totalPossible = studentsData.length * daysWithAttendance.size;
      matrix.forEach(row => {
        daysWithAttendance.forEach(day => {
          const status = row[day - 1];
          if (status === 'P' || status === 'Lt') presentCount++;
        });
      });
      setAvgAttendance(totalPossible ? Math.round((presentCount / totalPossible) * 100) : 0);
      setProgress(100);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoadingStudents(false);
          completeProgress();
        }, minDuration - elapsed);
      } else {
        setLoadingStudents(false);
        completeProgress();
      }
    };
    fetchData();
  }, [selectedClass, selectedSection, selectedMonth, user?.school_id, sessionId, classes]);

  // Real-time subscription for attendance_records
  useEffect(() => {
    if (!selectedClass || !selectedMonth || !user?.school_id) return;

    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;

    if (hasSections && !selectedSection) return; // Only return if sections are required but not selected

    // Unsubscribe previous
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current!);
      subscriptionRef.current = null;
    }

    // Subscribe to changes for this class/section/month
    const startDate = selectedMonth + '-01';
    const daysInMonth = getDaysInMonth(parseISO(startDate));
    const endDate = format(new Date(parseISO(startDate).getFullYear(), parseISO(startDate).getMonth(), daysInMonth), 'yyyy-MM-dd');

    let filterString = `class_id=eq.${selectedClass}`;
    if (hasSections) {
      filterString += `,section_id=eq.${selectedSection}`;
    } else {
      filterString += `,section_id=is.null`;
    }

    const channel = supabase.channel('attendance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: filterString
        },
        (payload: any) => {
          // Only refetch if the date is in the current month
          const date: string | undefined = (payload.new as { date?: string })?.date || (payload.old as { date?: string })?.date;
          if (typeof date === 'string' && date >= startDate && date <= endDate) {
            // Refetch attendance data
            // (simulate filter change to trigger useEffect)
            setLoadingStudents(true);
            setTimeout(() => setLoadingStudents(false), 100); // quick flicker to show update
          }
        }
      )
      .subscribe();
    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [selectedClass, selectedSection, selectedMonth, user?.school_id, classes]);

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

  const daysInMonth = selectedMonth ? getDaysInMonth(parseISO(selectedMonth + '-01')) : 31;

  const handleStatusChange = async (
    opt: StatusOption,
    idx: number,
    dayIdx: number,
    student: Student
  ) => {
    // Debounce rapid clicks (prevent clicks within 500ms)
    const now = Date.now();
    if (now - lastClickTimeRef.current < 500) {
      return;
    }
    lastClickTimeRef.current = now;

    // Find the student's index in the original students array for attendanceMatrix lookup
    const studentIndexInOriginal = students.findIndex(s => s.id === student.id);
    if (studentIndexInOriginal === -1) {
      return;
    }

    // Create a unique key for this update operation
    const updateKey = `${student.id}-${selectedClass}-${selectedSection}-${selectedMonth}-${dayIdx + 1}-${opt.value}`;

    // Prevent duplicate calls
    if (updatingStatusRef.current.has(updateKey)) {
      return;
    }

    // Add to updating set
    updatingStatusRef.current.add(updateKey);
    setIsUpdatingStatus(true);


    try {
      if (opt.value === 'DELETE') {
        // Delete attendance record from Supabase
        setAttendanceMatrix(prev => {
          const updated = prev.map(row => [...row]);
          updated[studentIndexInOriginal][dayIdx] = '-';
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
              if (status === 'P' || status === 'Lt') presentCount++;
            });
          });
          setAvgAttendance(totalPossible ? Math.round((presentCount / totalPossible) * 100) : 0);
          // --- End realtime update ---
          return updated;
        });
        setOpenDropdown(null);
        const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;

        // Validate required fields for delete
        const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
        const hasSections = selectedClassObj?.has_sections ?? true;

        if (!student.id || !selectedClass || !dateStr || !user?.school_id || !sessionId) {
          throw new Error(`Missing required fields for delete: student_id=${student.id}, class_id=${selectedClass}, date=${dateStr}, school_id=${user?.school_id}, session_id=${sessionId}`);
        }

        if (hasSections && !selectedSection) {
          throw new Error(`Section is required for this class: section_id=${selectedSection}`);
        }


        let deleteQuery = supabase
          .from('attendance_records')
          .delete()
          .eq('student_id', student.id)
          .eq('class_id', selectedClass)
          .eq('school_id', user.school_id)
          .eq('session_id', sessionId)
          .eq('date', dateStr);

        if (hasSections) {
          deleteQuery = deleteQuery.eq('section_id', selectedSection);
        } else {
          deleteQuery = deleteQuery.is('section_id', null);
        }

        const { data, error } = await deleteQuery;

        if (error) {
          throw error;
        }

        toast.showToast('Attendance record deleted.', 'success');
        return;
      }

      if (!sessionId) {
        toast.showToast('No active session found. Please activate a session first.', 'error');
        return;
      }

      setAttendanceMatrix(prev => {
        const updated = prev.map(row => [...row]);
        updated[studentIndexInOriginal][dayIdx] = opt.value;

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
        // 2. Calculate average attendance (P and Lt count as present)
        let presentCount = 0;
        let totalPossible = updated.length * daysWithAttendance.size;
        updated.forEach(row => {
          daysWithAttendance.forEach(day => {
            const status = row[day - 1];
            if (status === 'P' || status === 'Lt') presentCount++;
          });
        });
        setAvgAttendance(totalPossible ? Math.round((presentCount / totalPossible) * 100) : 0);
        // --- End realtime update ---

        return updated;
      });
      setOpenDropdown(null);
      const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;

      // Validate required fields
      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;

      if (!student.id || !selectedClass || !dateStr || !user?.school_id || !sessionId) {
        throw new Error(`Missing required fields: student_id=${student.id}, class_id=${selectedClass}, date=${dateStr}, school_id=${user?.school_id}, session_id=${sessionId}`);
      }

      if (hasSections && !selectedSection) {
        throw new Error(`Section is required for this class: section_id=${selectedSection}`);
      }

      // Map UI status to DB status
      const statusMap: Record<string, string> = {
        'P': 'present',
        'A': 'absent',
        'L': 'leave',
        'Lt': 'late'
      };
      const dbStatus = statusMap[opt.value] || 'present';
      const upsertPayload = {
        student_id: student.id,
        class_id: selectedClass,
        section_id: hasSections ? selectedSection : null,
        date: dateStr,
        status: dbStatus,
        school_id: user.school_id,
        session_id: sessionId
      };


      // First, check if record already exists
      let checkQuery = supabase
        .from('attendance_records')
        .select('id, status')
        .eq('student_id', student.id)
        .eq('class_id', selectedClass)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .eq('date', dateStr);

      if (hasSections) {
        checkQuery = checkQuery.eq('section_id', selectedSection);
      } else {
        checkQuery = checkQuery.is('section_id', null);
      }

      const { data: existingRecord, error: checkError } = await checkQuery.single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let data, error;

      if (existingRecord) {
        // Record exists, update it
        const updateResult = await supabase
          .from('attendance_records')
          .update({ status: dbStatus })
          .eq('id', existingRecord.id);
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Record doesn't exist, insert it
        const insertResult = await supabase
          .from('attendance_records')
          .insert([upsertPayload]);
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        throw error;
      }

      toast.showToast('Attendance updated successfully.', 'success');

    } catch (err: any) {

      // Revert the UI state on error
      setAttendanceMatrix(prev => {
        const reverted = prev.map(row => [...row]);
        reverted[studentIndexInOriginal][dayIdx] = attendanceMatrix[studentIndexInOriginal]?.[dayIdx] || '-';
        return reverted;
      });

      toast.showToast(`Could not update attendance: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      // Clean up
      updatingStatusRef.current.delete(updateKey);
      setIsUpdatingStatus(false);
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    // Check if student matches search query (name or roll_number)
    const nameMatch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = matchesStudentSearch(student, searchQuery);
    const matchesSearch = nameMatch || idMatch.matches;
    if (!matchesSearch) return false;

    return true;
  }).sort((a, b) => a.id - b.id);

  // Helper to get class/section names
  const className = classes.find(c => String(c.id) === String(selectedClass))?.name || selectedClass;
  const sectionName = sections.find(s => String(s.id) === String(selectedSection))?.name || selectedSection;
  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
  const hasSections = selectedClassObj?.has_sections ?? true;
  const namesLoaded = !!classes.find(c => String(c.id) === String(selectedClass))?.name && (hasSections ? !!sections.find(s => String(s.id) === String(selectedSection))?.name : true);
  const hasSelection = !!selectedClass && !!selectedMonth && (hasSections ? !!selectedSection : true);

  // On mount, fetch staff_id for the logged-in user if teacher
  useEffect(() => {
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
        }
      } catch (error) {
        setStaffId(null);
      }
    };
    fetchStaffId();
  }, [user]);

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
        setTeacherSections(data || []);
        // Pre-select first section/class if not already selected
        if ((data?.length ?? 0) > 0 && !selectedSection) {
          setSelectedSection(data[0].id.toString());
          setSelectedClass(data[0].class_id.toString());
        }
      } catch (error) {
        setTeacherSections([]);
      }
    };
    fetchTeacherSections();
    // eslint-disable-next-line
  }, [user, staffId]);

  // Fetch teacher classes using teacherSections
  useEffect(() => {
    const fetchTeacherClasses = async () => {
      if (user?.role !== 'Teacher' || teacherSections.length === 0 || !user.school_id) return;
      const classIds = Array.from(new Set(teacherSections.map(s => s.class_id)));
      if (classIds.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds)
          .eq('school_id', user.school_id);
        if (error) throw error;
        setTeacherClasses(data || []);
      } catch (error) {
        setTeacherClasses([]);
      }
    };
    fetchTeacherClasses();
    // eslint-disable-next-line
  }, [teacherSections, user]);

  // Determine if teacher has only one section
  const teacherHasSingleSection = user?.role === 'Teacher' && teacherSections.length === 1;

  // Fetch holidays for the selected month
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!selectedMonth || !sessionId || !selectedClass || !user?.school_id) return;

      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;

      if (hasSections && !selectedSection) return; // Only return if sections are required but not selected

      const startDate = selectedMonth + '-01';
      const daysInMonth = getDaysInMonth(parseISO(startDate));
      const endDate = format(new Date(parseISO(startDate).getFullYear(), parseISO(startDate).getMonth(), daysInMonth), 'yyyy-MM-dd');

      try {
        // First, fetch all holidays for the period
        const { data: allHolidaysData, error: allHolidaysError } = await supabase
          .from('holidays')
          .select(`
            id,
            name,
            start_date,
            end_date,
            holiday_classes (
              class_id,
              section_id
            )
          `)
          .eq('session_id', sessionId)
          .eq('school_id', user.school_id)
          .lte('start_date', endDate)
          .gte('end_date', startDate);

        if (allHolidaysError) throw allHolidaysError;

        // Filter holidays to include:
        // 1. Global holidays (no class assignments)
        // 2. Class-specific holidays (matching class_id)
        // 3. Section-specific holidays (matching class_id and section_id)
        const relevantHolidays = (allHolidaysData || []).filter(holiday => {
          // If holiday has no class assignments, it's a global holiday
          if (!holiday.holiday_classes || holiday.holiday_classes.length === 0) {
            return true;
          }

          // Check if any of the holiday's class assignments match our criteria
          const matches = holiday.holiday_classes.some(assignment => {
            // Convert IDs to strings for comparison
            const classMatch = String(assignment.class_id) === String(selectedClass);
            const isClassSpecific = !assignment.section_id;
            const isSectionSpecific = hasSections ? String(assignment.section_id) === String(selectedSection) : false;

            // Match class-specific holiday (no section specified)
            if (classMatch && isClassSpecific) {
              return true;
            }
            // Match section-specific holiday (only if class has sections)
            if (hasSections && classMatch && isSectionSpecific) {
              return true;
            }
            return false;
          });

          return matches;
        });

        // Transform to final format
        const processedHolidays = relevantHolidays.map(h => ({
          id: h.id,
          name: h.name,
          start_date: h.start_date,
          end_date: h.end_date
        }));

        setHolidays(processedHolidays);
      } catch (error) {
        setHolidays([]);
      }
    };

    fetchHolidays();
  }, [selectedMonth, sessionId, selectedClass, selectedSection, user?.school_id, classes]);

  // Add this helper function after other helper functions
  const isHoliday = (date: Date) => {
    const isHol = holidays.some(holiday => {
      const startDate = parseISO(holiday.start_date);
      const endDate = parseISO(holiday.end_date);
      const isInRange = date >= startDate && date <= endDate;
      if (isInRange) {
      }
      return isInRange;
    });
    return isHol;
  };

  const getHolidayName = (date: Date) => {
    const holiday = holidays.find(holiday => {
      const startDate = parseISO(holiday.start_date);
      const endDate = parseISO(holiday.end_date);
      return date >= startDate && date <= endDate;
    });
    if (holiday) {
    }
    return holiday?.name || '';
  };

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
  }, [holidays, filteredStudents.length]);

  const handleExportPDF = async () => {
    if (!selectedClass || !selectedSection || !selectedMonth) {
      toast.showToast('Please select class, section and month');
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
      const title = `Monthly Attendance Report -`;
      doc.text(title, 14, 20);
      // Add class/section to top right (always show something)
      const classSectionStr = hasSections ? `${className} (${sectionName})` : className;
      doc.text(classSectionStr, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' });

      // Add subtitle with month and stats
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const monthYear = format(parseISO(selectedMonth + '-01'), 'MMMM yyyy');
      doc.text(`Month: ${monthYear}`, 14, 30);
      doc.text(`Working Days: ${workingDays}`, 80, 30);
      doc.text(`Average Attendance: ${avgAttendance}%`, 160, 30);

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

      // Prepare table data
      const sortedStudents = [...filteredStudents].sort((a, b) => a.id - b.id);
      const tableData = sortedStudents.map((student, idx) => {
        const studentIndexInOriginal = students.findIndex(s => s.id === student.id);
        const row = [
          (idx + 1).toString(),
          getStudentDisplayId(student).toString(),
          student.name,
          ...Array.from({ length: daysInMonth }, (_, dayIdx) => {
            const date = new Date(parseISO(selectedMonth + '-01'));
            date.setDate(dayIdx + 1);
            const isSunday = date.getDay() === 0;
            if (isSunday) return '';
            const status = attendanceMatrix[studentIndexInOriginal]?.[dayIdx] || '-';
            const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;
            const halfLeaveKey = `${student.id}_${dateStr}`;
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
        'Absents/Leaves:',
        ...Array.from({ length: daysInMonth }, (_, dayIdx) => {
          const date = new Date(parseISO(selectedMonth + '-01'));
          date.setDate(dayIdx + 1);
          const isSunday = date.getDay() === 0;
          if (isSunday) return '';

          // Check for holidays
          if (holidayDayMap[dayIdx + 1]) return '';

          // Count absent and leave students for this day
          let absentCount = 0;
          sortedStudents.forEach((student) => {
            const studentIndexInOriginal = students.findIndex(s => s.id === student.id);
            const status = attendanceMatrix[studentIndexInOriginal]?.[dayIdx];
            if (status === 'A' || status === 'L') {
              absentCount++;
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
        'Student Name',
        ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString())
      ];

      // Build columnStyles for uniform day columns
      const totalWidth = 270;
      const fixedColsWidth = 8 + 15 + 40; // #, ID, Name
      const daysColCount = daysInMonth;
      const dayColWidth = (totalWidth - fixedColsWidth) / daysColCount;
      const columnStyles: any = {
        0: { cellWidth: 8 }, // #
        1: { cellWidth: 15 }, // ID
        2: { cellWidth: 40, halign: 'left' }, // Student Name
      };
      for (let i = 3; i < daysInMonth + 3; i++) {
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
        didParseCell: function (data) {
          // Style for Sunday columns
          if (data.column.index > 2) {
            const date = new Date(parseISO(selectedMonth + '-01'));
            date.setDate(data.column.index - 2);
            if (date.getDay() === 0) {
              data.cell.styles.fillColor = [255, 235, 235];
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
          // Style for holiday columns
          if (data.column.index > 2) {
            const dayIdx = data.column.index - 2;
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
          if (data.column.index > 2 && data.cell.raw !== '') {
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
                // Highlight HL in pink color (when replacing P, A, L, etc.)
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

      const fileName = `Attendance Report (${formatDateForFileName(new Date())}).pdf`;

      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];

          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `attendance-report-${timestamp}.pdf`;

          // Check if Capacitor is available (for mobile apps)
          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
              // Write PDF to documents directory
              await window.Capacitor.Plugins.Filesystem.writeFile({
                path: mobileFileName,
                data: pdfBase64,
                directory: 'DOCUMENTS'
              });

              // Get the file URI
              const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                path: mobileFileName,
                directory: 'DOCUMENTS'
              });

              // Show success message and trigger native Android "Open with" dialog
              toast.showToast(`PDF saved successfully as ${mobileFileName}`, 'success');

              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');

            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
              toast.showToast('PDF downloaded successfully!', 'success');
            }
          } else {
            // Fallback for web browsers - use the blob approach
            try {
              const pdfBlob = doc.output('blob');
              const url = URL.createObjectURL(pdfBlob);

              // Create a visible download button for mobile
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
              <p style="margin: 0 0 15px 0; color: #666;">Attendance Report</p>
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

              // Auto-remove after 30 seconds
              setTimeout(() => {
                if (downloadContainer.parentElement) {
                  downloadContainer.remove();
                }
                URL.revokeObjectURL(url);
              }, 30000);

              toast.showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');

            } catch (webError) {

              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Attendance Report PDF</title>
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
                        <h2>📄 Attendance Report PDF Generated</h2>
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
        toast.showToast('Attendance report PDF generated successfully', 'success');
      }

      if (!namesLoaded) {
        toast.showToast('Class/section names not loaded, using IDs in PDF.', 'error');
      }
    } catch (error) {
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setExportLoading(false);
      setIsExporting(false);
    }
  };

  // Check if user has school_id at render time
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


  if (!loading && hasAnyStudents === false) {
    return <NoStudentsFound />;
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
              <StatValue>{loadingStudents ? '...' : workingDays}</StatValue>
            </StatCard>
            <StatCard>
              <BarChart style={{ fontSize: window.innerWidth <= 700 ? 16 : 20, marginRight: window.innerWidth <= 700 ? 1 : 2 }} />
              <span style={{ display: window.innerWidth <= 700 ? 'none' : 'inline' }}>Average Attendance</span>
              <StatValue>{loadingStudents ? '...' : `${avgAttendance}%`}</StatValue>
            </StatCard>
          </div>
          {/* Mobile filter toggle button and add button */}
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
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                disabled={user?.role === 'Teacher' ? teacherHasSingleSection : loadingClasses}
              >
                <option value="">Select Class</option>
                {user?.role === 'Teacher'
                  ? teacherClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                  : (loadingClasses ? <option>Loading...</option> :
                    classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    )))}
              </SegmentedSelect>
              {(() => {
                const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
                const hasSections = selectedClassObj?.has_sections ?? true;
                return hasSections ? (
                  <SegmentedSelect
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                    disabled={user?.role === 'Teacher' ? teacherHasSingleSection : (!selectedClass && user?.role !== 'Teacher') || loadingSections}
                  >
                    <option value="">Select Section</option>
                    {user?.role === 'Teacher'
                      ? teacherSections
                        .filter(s => s.class_id.toString() === selectedClass)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))
                      : (loadingSections ? <option>Loading...</option> :
                        sections.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        )))}
                  </SegmentedSelect>
                ) : null;
              })()}
              <SegmentedSelect
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
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ minWidth: '120px' }}
              />
              <SegmentedButton
                last
                onClick={handleExportPDF}
                disabled={!hasSelection || isExporting || loading || loadingStudents || exportLoading}
                style={{ opacity: (!hasSelection || isExporting || loading || loadingStudents || exportLoading) ? 0.7 : 1 }}
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
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              disabled={user?.role === 'Teacher' ? teacherHasSingleSection : loadingClasses}
              style={{ width: '100%' }}
            >
              <option value="">Select Class</option>
              {user?.role === 'Teacher'
                ? teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
                : (loadingClasses ? <option>Loading...</option> :
                  classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  )))}
            </SegmentedSelect>
            {(() => {
              const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
              const hasSections = selectedClassObj?.has_sections ?? true;
              return hasSections ? (
                <SegmentedSelect
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  disabled={user?.role === 'Teacher' ? teacherHasSingleSection : (!selectedClass && user?.role !== 'Teacher') || loadingSections}
                  style={{ width: '100%' }}
                >
                  <option value="">Select Section</option>
                  {user?.role === 'Teacher'
                    ? teacherSections
                      .filter(s => s.class_id.toString() === selectedClass)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))
                    : (loadingSections ? <option>Loading...</option> :
                      sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      )))}
                </SegmentedSelect>
              ) : null;
            })()}
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
              placeholder="Search by name or roll number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
            <SegmentedButton
              onClick={handleExportPDF}
              disabled={!hasSelection || isExporting || loading || loadingStudents || exportLoading}
              style={{ width: '100%', opacity: (!hasSelection || isExporting || loading || loadingStudents || exportLoading) ? 0.7 : 1 }}
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
        {loadingStudents ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: 12 }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #4a6cf7',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#888' }}>Loading students...</div>
          </div>
        ) : (!loadingStudents && filteredStudents.length === 0) ? (
          hasAnyStudents ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontWeight: 600 }}>
              No students found for the selected class, section, or month.
            </div>
          ) : null
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <NarrowTh>#</NarrowTh>
                  <NarrowTh>ID</NarrowTh>
                  <Th>STUDENT</Th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const date = new Date(parseISO(selectedMonth + '-01'));
                    date.setDate(i + 1);
                    const isSunday = date.getDay() === 0;
                    const DayHeader = isSunday ? SundayTh : Th;
                    return (
                      <DayHeader key={i + 1}>{i + 1}</DayHeader>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  let skipCols = 0;
                  // Find the student's index in the original students array for attendanceMatrix lookup
                  const studentIndexInOriginal = students.findIndex(s => s.id === student.id);
                  return (
                    <tr key={student.id}>
                      <NarrowTd>{idx + 1}</NarrowTd>
                      <NarrowTd>{getStudentDisplayId(student)}</NarrowTd>
                      <StudentNameCell>{student.name}</StudentNameCell>
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
                                rowSpan={filteredStudents.length}
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
                                      transform: `translate(-50%, -50%) rotate(${styleObj.angle}deg)`,
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
                                rowSpan={filteredStudents.length}
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
                        const status = attendanceMatrix[studentIndexInOriginal]?.[dayIdx] || '-';
                        const dateStr = `${selectedMonth}-${String(dayIdx + 1).padStart(2, '0')}`;
                        const halfLeaveKey = student ? `${student.id}_${dateStr}` : '';
                        const halfLeave = halfLeaveKey ? halfLeavesMap.get(halfLeaveKey) : null;

                        return (
                          <StatusCell key={dayIdx} status={status} style={{ position: 'relative' }}>
                            {halfLeave && (
                              <HalfLeaveBadge title="Half Leave">
                                HL
                              </HalfLeaveBadge>
                            )}
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
                                        handleStatusChange(opt, idx, dayIdx, student);
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
                                      handleStatusChange(deleteOption, idx, dayIdx, student);
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
                {/* Summary row showing daily absent and leave counts */}
                <SummaryRow>
                  <SummaryLabelCell colSpan={3}>Absents/Leaves:</SummaryLabelCell>
                  {(() => {
                    let skipCols = 0;
                    return Array.from({ length: daysInMonth }, (_, dayIdx) => {
                      if (skipCols > 0) {
                        skipCols--;
                        return null;
                      }

                      const date = new Date(parseISO(selectedMonth + '-01'));
                      date.setDate(dayIdx + 1);
                      const isSunday = date.getDay() === 0;

                      // Check if this day is the start of a holiday range
                      const holiday = holidayRanges.find(h => h.startIdx === dayIdx);
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

                      // Count absent and leave students for this day
                      let absentCount = 0;
                      filteredStudents.forEach((student) => {
                        const studentIndexInOriginal = students.findIndex(s => s.id === student.id);
                        const status = attendanceMatrix[studentIndexInOriginal]?.[dayIdx];
                        if (status === 'A' || status === 'L') {
                          absentCount++;
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
    </Container>
  );
};

export default AttendanceReport; 