import React, { useEffect, useRef, useState, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { Box, Button, useMediaQuery, Tooltip } from '@mui/material';
import { supabase } from '../supabaseClient';
import ReactDOM from 'react-dom';
import { useToast } from '../contexts/ToastContext';
import { fetchAllRows } from '../utils/paginationHelper';
import { formatAppDate } from '../utils/dateUtils';
import jsPDF from 'jspdf';
import autoTable, { CellHookData, UserOptions, Styles } from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import {
  Info,
  Save,
  PictureAsPdf,
  Description,
  Print,
  Settings,
  Close,
  CheckCircle,
  Delete,
  MeetingRoom,
  Class as ClassIcon,
  Book,
  Person,
  CalendarToday,
  Schedule,
  Layers,
  ContentCopy,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Select,
  MenuItem,
  Checkbox,
  ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NoTeachersFound from '../components/NoTeachersFound';
import Loader from '../components/Loader';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';

// Styled Components
const Container = styled.div`
  padding: 12px 16px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 8px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const PageHeaderText = styled.h1`
  font-size: 1.4rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 2px 0;
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const SessionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${({ theme }) => theme.ACCENT}15;
  color: ${({ theme }) => theme.ACCENT};
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 8px;
`;

const Subtitle = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.4;
`;

// "Assign Period to a Teacher" Panel Components
const AssignCard = styled.div<{ collapsed?: boolean }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: ${({ collapsed }) => (collapsed ? '10px 16px' : '14px 18px')};
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease-in-out;
`;

const AssignHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`;

const AssignTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AssignGrid = styled.div<{ collapsed?: boolean }>`
  display: ${({ collapsed }) => (collapsed ? 'none' : 'grid')};
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px 14px;
  margin-top: 12px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }
`;

const FormGroup = styled.div<{ spanFull?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${({ spanFull }) => spanFull && `grid-column: 1 / -1;`}
`;

const FormLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  gap: 4px;

  .required {
    color: #ef4444;
  }
`;

const FormSelect = styled.select`
  height: 40px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG || theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
  }

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}18;
  }
`;

const FormOption = styled.option`
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const FormInput = styled.input`
  height: 40px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG || theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}18;
  }
`;

const FormActionsRow = styled.div<{ collapsed?: boolean }>`
  display: ${({ collapsed }) => (collapsed ? 'none' : 'flex')};
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed ${({ theme }) => theme.BORDER};
`;

const AssignButton = styled.button`
  background: ${({ theme }) => theme.ACCENT_INPUT || '#2563eb'};
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ClearButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.FIELD_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

// Day Tabs
const DayTabsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 2px;
  }
`;

const DayTab = styled.button<{ active?: boolean }>`
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme, active }) => (active ? theme.ACCENT : theme.BORDER)};
  background: ${({ theme, active }) => (active ? theme.ACCENT + '18' : theme.CARD)};
  color: ${({ theme, active }) => (active ? theme.ACCENT : theme.TEXT_PRIMARY)};
  font-weight: ${({ active }) => (active ? 700 : 500)};
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;

  .badge {
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 10px;
    background: ${({ theme, active }) => (active ? theme.ACCENT + '30' : theme.FIELD_BG)};
    color: inherit;
    font-weight: 700;
  }

  &:hover {
    background: ${({ theme, active }) => (active ? theme.ACCENT + '25' : theme.ACCENT + '0d')};
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

// Table Matrix with Sticky Headers & Sticky First Column
const TableWrapper = styled.div`
  width: 100%;
  flex: 1;
  overflow: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid ${({ theme }) => theme.BORDER};
  position: relative;
  -webkit-overflow-scrolling: touch;
`;

const TimetableTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 950px;
  font-size: 0.875rem;

  thead tr th {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  tbody tr td:first-child,
  thead tr th:first-child {
    position: sticky;
    left: 0;
    z-index: 11;
  }

  thead tr th:first-child {
    z-index: 12;
  }
`;

const Th = styled.th<{ breakCol?: boolean; classCol?: boolean }>`
  padding: 10px 6px;
  text-align: center;
  color: ${({ theme, classCol }) => (classCol ? theme.TEXT_PRIMARY : theme.TEXT_SECONDARY)};
  font-weight: 700;
  font-size: 0.8rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme, breakCol, classCol }) =>
    breakCol ? theme.ACCENT + '20' : classCol ? theme.ACCENT + '15' : theme.FIELD_BG};
  min-width: ${({ breakCol }) => (breakCol ? '45px' : '100px')};
  width: ${({ breakCol }) => (breakCol ? '4%' : 'auto')};
  vertical-align: middle;
  writing-mode: ${({ breakCol }) => (breakCol ? 'vertical-rl' : 'horizontal-tb')};
  text-orientation: ${({ breakCol }) => (breakCol ? 'mixed' : 'initial')};
  white-space: nowrap;
`;

const Td = styled.td<{ breakCol?: boolean; classCol?: boolean; hasContent?: boolean }>`
  padding: 8px 6px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  text-align: center;
  background: ${({ theme, breakCol, classCol }) =>
    breakCol ? theme.ACCENT + '20' : classCol ? theme.ACCENT + '15' : theme.CARD};
  min-width: ${({ breakCol }) => (breakCol ? '45px' : '100px')};
  width: ${({ breakCol }) => (breakCol ? '4%' : 'auto')};
  vertical-align: middle;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme, breakCol, classCol, hasContent }) =>
      breakCol || classCol ? 'inherit' : hasContent ? theme.ACCENT + '12' : theme.FIELD_BG};
  }
`;

const BreakColumn = styled(Td)`
  background: ${({ theme }) => theme.ACCENT + '20'};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 800;
  font-size: 0.875rem;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  text-align: center;
  vertical-align: middle;
  padding: 12px 8px;
  white-space: nowrap;
  letter-spacing: 0.5px;
  border-right: 2px solid ${({ theme }) => theme.BORDER};
`;

const CellCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 4px;
  border-radius: 6px;
  background: ${({ theme }) => theme.ACCENT + '0d'};
  border: 1px solid ${({ theme }) => theme.ACCENT + '25'};

  .delete-icon {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &:hover .delete-icon {
    display: flex;
  }
`;

const RoomBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  background: ${({ theme }) => theme.ACCENT + '20'};
  padding: 1px 5px;
  border-radius: 4px;
  margin-top: 2px;
`;

const Dropdown = styled.div`
  position: fixed;
  z-index: 1000;
  min-width: 200px;
  max-width: 280px;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  max-height: 200px;
  overflow-y: auto;
`;

const DropdownOption = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  font-size: 0.875rem;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.ACCENT + '10'};
    color: ${({ theme }) => theme.ACCENT};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DropdownDivider = styled.div`
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  margin: 6px 8px;
`;

const BreakControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-weight: 600;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    white-space: nowrap;
  }
`;

const ActionButtonsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const MinimalSlipCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;

  @media print {
    border: 1px solid #000 !important;
    background: #fff !important;
    color: #000 !important;
    box-shadow: none !important;
    page-break-inside: avoid;
    margin-bottom: 12mm !important;
  }
`;

const SlipTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  th {
    background: ${({ theme }) => theme.ACCENT}15;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    border: 1px solid ${({ theme }) => theme.BORDER};
    padding: 5px 6px;
    font-weight: 700;
    text-align: center;
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  td {
    border: 1px solid ${({ theme }) => theme.BORDER};
    padding: 5px 6px;
    text-align: center;
    vertical-align: middle;
  }

  tr.break-row td {
    background: #fef3c7;
    color: #92400e;
    font-weight: 700;
  }

  tr.free-row td {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-style: italic;
  }

  @media print {
    th {
      background: #eee !important;
      color: #000 !important;
      border: 1px solid #000 !important;
    }
    td {
      border: 1px solid #000 !important;
      color: #000 !important;
    }
    tr.break-row td {
      background: #f5f5f5 !important;
      color: #000 !important;
    }
  }
`;

const NoAssignmentsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 24px;
  min-height: 400px;
`;

const NoAssignmentsIcon = styled.div`
  font-size: 4rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  opacity: 0.6;
`;

const NoAssignmentsTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const NoAssignmentsText = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  max-width: 400px;
  line-height: 1.5;
`;

const AssignSubjectsButton = styled.button`
  background: ${({ theme }) => theme.ACCENT_INPUT || '#2563eb'};
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.18s, transform 0.18s;

  &:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
  }
`;

// Days List Constant
const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' }
];

const ROOM_OPTIONS = [
  'No room',
  'Room 1',
  'Room 2',
  'Room 3',
  'Room 4',
  'Room 5',
  'Room 6',
  'Room 101',
  'Room 102',
  'Lab 1',
  'Lab 2',
  'Computer Lab',
  'Library',
  'Auditorium'
];

interface ClassAssignment {
  [classId: number]: { subjectId: number; teacherId: number }[];
}

const TimeTableManager: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { setFooterContent } = usePageFooter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Data State
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allDataLoaded, setAllDataLoaded] = useState(false);

  // Timetable State: Key = `${dayOfWeek}_${classId}_${periodIndex}`
  const [cellSelections, setCellSelections] = useState<Record<string, string[]>>({});
  const [classAssignments, setClassAssignments] = useState<ClassAssignment>({});

  // Active View Tab State (Day)
  const [activeDayTab, setActiveDayTab] = useState<number>(1); // 1 = Monday

  // Form State ("Assign Period to a Teacher")
  const [formDay, setFormDay] = useState<number>(1);
  const [formPeriodIndex, setFormPeriodIndex] = useState<string>('');
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([]);
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formRoom, setFormRoom] = useState<string>('No room');
  const [formSpans, setFormSpans] = useState<number>(1);
  const [formClassId, setFormClassId] = useState<string>('');

  // Custom Teacher & Clear Modal state
  const [customTeacherName, setCustomTeacherName] = useState<string>('');
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);

  // Form Collapsed State
  const [formCollapsed, setFormCollapsed] = useState(false);

  // Dropdown Popup for table cells
  const [dropdown, setDropdown] = useState<{ cellKey: string; rect: DOMRect | null } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [breakIdx, setBreakIdx] = useState(4); // Default: after 5th period
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);
  const [teacherSlipsLoading, setTeacherSlipsLoading] = useState(false);

  // Teacher Slips Modal State
  const [slipsModalOpen, setSlipsModalOpen] = useState(false);
  const [selectedSlipTeacherId, setSelectedSlipTeacherId] = useState<number | 'all'>('all');

  // Copy Day Schedule Modal State
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceDayId, setCopySourceDayId] = useState<number>(1);
  const [copyTargetDayIds, setCopyTargetDayIds] = useState<number[]>([]);

  const [periods, setPeriods] = useState<any[]>([]);
  const [breakSettings, setBreakSettings] = useState({ start: '11:00', end: '11:15' });

  // Timing Modal State
  const [timingModalOpen, setTimingModalOpen] = useState(false);
  const [tempPeriods, setTempPeriods] = useState<any[]>([]);
  const [tempBreakSettings, setTempBreakSettings] = useState({ start: '11:00', end: '11:15' });
  const [tempBreakIdx, setTempBreakIdx] = useState(4);

  // Fetch active session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('is_active', true)
          .eq('school_id', user?.school_id || '')
          .single();
        if (data) {
          setSessionId(data.id);
          setSessionName(data.name);
        } else {
          toast.showToast('No active session found. Timetable saving is disabled.', 'warning');
        }
      } catch (error) {
        toast.showToast('No active session found. Timetable saving is disabled.', 'warning');
      }
    };
    if (user?.school_id) {
      fetchSession();
    }
  }, [toast, user?.school_id]);

  // Helpers for names
  const getSubjectName = (id: number): string => subjects.find(s => s.id === id)?.name || '';
  const getTeacherName = (idOrStr: number | string): string => {
    if (typeof idOrStr === 'string' || isNaN(Number(idOrStr))) {
      const str = String(idOrStr);
      if (str === 'no_teacher') return 'No teacher';
      if (str.startsWith('custom:')) return str.substring(7);
      return str;
    }
    const numId = Number(idOrStr);
    return teachers.find(t => t.id === numId)?.name || 'Unknown';
  };
  const getClassName = (id: number): string => classes.find(c => c.id === id)?.name || '';

  const getTeacherNameWithPrefix = (id: number): string => {
    const teacher = teachers.find(t => t.id === id);
    if (!teacher) return '';
    const name = teacher.name;
    const gender = teacher.gender;
    let prefix = '';
    if (gender === 'Male') prefix = 'Mr.';
    else if (gender === 'Female') prefix = 'Ms.';
    return prefix ? `${prefix} ${name}` : name;
  };

  // Compute teacher assignment count (CN: count) across cellSelections
  const getTeacherAssignmentCount = (teacherId: number): number => {
    let count = 0;
    Object.values(cellSelections).forEach(selections => {
      selections.forEach(sel => {
        const parts = sel.split('_');
        if (Number(parts[1]) === teacherId) {
          count++;
        }
      });
    });
    return count;
  };

  // Compute assignment count for a specific day
  const getDayAssignmentCount = (dayId: number): number => {
    let count = 0;
    Object.keys(cellSelections).forEach(key => {
      const parts = key.split('_');
      const dId = parts.length === 3 ? Number(parts[0]) : 1;
      if (dId === dayId && cellSelections[key]?.length > 0) {
        count += cellSelections[key].length;
      }
    });
    return count;
  };

  // Fetch initial master data
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [cls, subs, tchs, tcs, secs] = await Promise.all([
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('classes')
              .select('id, name')
              .eq('school_id', user?.school_id || '')
              .order('name')
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('subjects')
              .select('id, name')
              .eq('school_id', user?.school_id || '')
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('staff')
              .select('id, name, role, gender')
              .eq('role', 'Teacher')
              .eq('status', 'active')
              .eq('school_id', user?.school_id || '')
              .order('name')
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('teacher_class_subjects')
              .select('id, teacher_id, class_subject_id, class_subjects (class_id, subject_id)')
              .eq('school_id', user?.school_id || '')
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sections')
              .select('id, class_id, teacher_id, name')
              .eq('school_id', user?.school_id || '')
              .range(from, to);
          })
        ]);

        const [
          { data: periodsData },
          { data: settingsData },
          instituteRes,
          schoolRes
        ] = await Promise.all([
          supabase.from('timetable_periods').select('*').eq('school_id', user?.school_id).order('period_index'),
          supabase.from('timetable_settings').select('*').eq('school_id', user?.school_id).single(),
          supabase.from('institute_profile').select('name').eq('school_id', user?.school_id).maybeSingle(),
          supabase.from('schools').select('name').eq('id', user?.school_id).maybeSingle()
        ]);

        const resolvedSchoolName =
          (instituteRes?.data?.name || '').trim() ||
          (schoolRes?.data?.name || '').trim();
        if (resolvedSchoolName) {
          setSchoolName(resolvedSchoolName);
        }

        if (periodsData && periodsData.length > 0) {
          setPeriods(
            periodsData.map((p: any) => ({
              num: p.period_index + 1,
              time: `${p.start_time}-${p.end_time}`
            }))
          );
        } else {
          setPeriods([
            { num: 1, time: '08:30-09:00' },
            { num: 2, time: '09:00-09:30' },
            { num: 3, time: '09:30-10:00' },
            { num: 4, time: '10:00-10:30' },
            { num: 5, time: '10:30-11:00' },
            { num: 6, time: '11:15-11:45' },
            { num: 7, time: '11:45-12:15' },
            { num: 8, time: '12:15-12:45' }
          ]);
        }

        if (settingsData) {
          setBreakIdx(settingsData.break_after_period_index);
          setBreakSettings({
            start: settingsData.break_start_time,
            end: settingsData.break_end_time
          });
        }

        setClasses(cls);
        setSubjects(subs);
        setTeachers(tchs);
        setTeacherClassSubjects(tcs);
        setSections(secs || []);

        const assignments: ClassAssignment = {};
        const activeTeacherIds = new Set(tchs.map((t: any) => t.id));

        tcs?.forEach((tcsItem: any) => {
          if (tcsItem.class_subjects && tcsItem.class_subjects.class_id && tcsItem.class_subjects.subject_id) {
            if (!activeTeacherIds.has(tcsItem.teacher_id)) return;
            const classId = tcsItem.class_subjects.class_id;
            if (!assignments[classId]) assignments[classId] = [];
            assignments[classId].push({
              subjectId: tcsItem.class_subjects.subject_id,
              teacherId: tcsItem.teacher_id
            });
          }
        });
        setClassAssignments(assignments);
      } catch (err) {
        // error reading master data
      } finally {
        setLoading(false);
        setAllDataLoaded(true);
      }
    };
    if (user?.school_id) {
      fetchAll();
    } else {
      setLoading(false);
      setAllDataLoaded(true);
    }
  }, [user?.school_id]);

  // Load Saved Timetable Data from Supabase
  useEffect(() => {
    const loadTimetable = async () => {
      if (!sessionId || !user?.school_id || !allDataLoaded) return;
      const schoolId = user.school_id;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('timetable')
          .select('class_id, period_index, subject_id, teacher_id, break_index, day_of_week')
          .eq('session_id', sessionId)
          .eq('school_id', schoolId);

        if (error) throw error;

        const loadedSelections: Record<string, string[]> = {};
        let loadedBreakIndex: number | undefined;
        const activeTeacherIds = new Set(teachers.map(t => t.id));

        data.forEach((item: any) => {
          if (!activeTeacherIds.has(item.teacher_id)) return;

          const dayOfWeek = item.day_of_week || 1;
          const cellKey = `${dayOfWeek}_${item.class_id}_${item.period_index}`;
          const selectionValue = `${item.subject_id}_${item.teacher_id}`;

          if (!loadedSelections[cellKey]) {
            loadedSelections[cellKey] = [];
          }
          if (!loadedSelections[cellKey].includes(selectionValue)) {
            loadedSelections[cellKey].push(selectionValue);
          }

          if (loadedBreakIndex === undefined && item.break_index !== undefined) {
            loadedBreakIndex = item.break_index;
          }
        });

        setCellSelections(loadedSelections);
        if (loadedBreakIndex !== undefined) {
          setBreakIdx(loadedBreakIndex);
        }
      } catch (error: any) {
        toast.showToast(`Failed to load timetable: ${error.message || error}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    loadTimetable();
  }, [sessionId, user?.school_id, toast, allDataLoaded, teachers]);

  // Handle Form Assignment ("Assign Period to a Teacher")
  const handleAssignPeriodForm = () => {
    if (!formDay) {
      toast.showToast('Please select a Day', 'warning');
      return;
    }
    if (formPeriodIndex === '') {
      toast.showToast('Please select a Period', 'warning');
      return;
    }
    if (!formClassId) {
      toast.showToast('Please select a Section / Class', 'warning');
      return;
    }
    if (!formSubjectIds || formSubjectIds.length === 0) {
      toast.showToast('Please select at least one Subject', 'warning');
      return;
    }
    if (!formTeacherId) {
      toast.showToast('Please select a Teacher option', 'warning');
      return;
    }

    let finalTeacherVal: string = formTeacherId;
    if (formTeacherId === 'custom') {
      const trimmed = customTeacherName.trim();
      if (!trimmed) {
        toast.showToast('Please enter custom teacher name', 'warning');
        return;
      }
      finalTeacherVal = `custom:${trimmed}`;
    }

    const startPeriodIdx = Number(formPeriodIndex);
    const classId = Number(formClassId);
    const spansCount = Number(formSpans) || 1;
    const roomStr = formRoom !== 'No room' ? formRoom : '';

    // Check teacher conflicts across all classes (only if numeric staff ID)
    if (!isNaN(Number(finalTeacherVal))) {
      const numericTeacherId = Number(finalTeacherVal);
      const conflicts: string[] = [];
      for (let offset = 0; offset < spansCount; offset++) {
        const pIdx = startPeriodIdx + offset;
        if (pIdx >= periods.length) break;

        Object.entries(cellSelections).forEach(([key, selections]) => {
          const parts = key.split('_');
          if (parts.length === 3) {
            const kDay = Number(parts[0]);
            const kClassId = Number(parts[1]);
            const kPIdx = Number(parts[2]);

            if (kDay === formDay && kPIdx === pIdx && kClassId !== classId) {
              selections.forEach(sel => {
                const [, tId] = sel.split('_');
                if (Number(tId) === numericTeacherId) {
                  conflicts.push(`Period ${pIdx + 1} (${getClassName(kClassId)})`);
                }
              });
            }
          }
        });
      }

      if (conflicts.length > 0) {
        toast.showToast(
          `Warning: ${getTeacherName(numericTeacherId)} is already assigned on ${DAYS_OF_WEEK.find(d => d.id === formDay)?.name} at ${conflicts.join(', ')}.`,
          'warning'
        );
      }
    }

    // Assign periods into cellSelections state:
    // Allows multiple subjects only if teacher is the same; replaces if teacher is different
    setCellSelections(prev => {
      const updated = { ...prev };
      for (let offset = 0; offset < spansCount; offset++) {
        const pIdx = startPeriodIdx + offset;
        if (pIdx >= periods.length) break;

        const cellKey = `${formDay}_${classId}_${pIdx}`;
        const existingList = updated[cellKey] ? [...updated[cellKey]] : [];

        // Check if existing assignments belong to a different teacher
        // Format of each selection: `${subjectId}_${teacherId}_${room}`
        const existingTeachers = existingList.map(item => item.split('_')[1]);
        const hasDifferentTeacher =
          existingTeachers.length > 0 && existingTeachers.some(tId => tId !== finalTeacherVal);

        // If teacher is different, replace completely; if same teacher, merge multiple subjects
        const targetList = hasDifferentTeacher ? [] : existingList;

        formSubjectIds.forEach(sId => {
          const val = `${sId}_${finalTeacherVal}${roomStr ? `_${roomStr}` : ''}`;
          if (!targetList.includes(val)) {
            targetList.push(val);
          }
        });

        updated[cellKey] = targetList;
      }
      return updated;
    });

    // Auto switch active tab day to the assigned day so user sees the change
    setActiveDayTab(formDay);
    toast.showToast(
      `Assigned Period successfully to ${getClassName(classId)}!`,
      'success'
    );
  };

  // Clear Form Fields
  const handleClearForm = () => {
    setFormPeriodIndex('');
    setFormSubjectIds([]);
    setFormTeacherId('');
    setCustomTeacherName('');
    setFormRoom('No room');
    setFormSpans(1);
    setFormClassId('');
  };

  // Helper to remove selection from a specific cell (or specific index if multiple)
  const handleRemoveCellAssignment = (cellKey: string, indexToRemove?: number) => {
    setCellSelections(prev => {
      const current = prev[cellKey] || [];
      const updated = { ...prev };
      if (indexToRemove === undefined || current.length <= 1) {
        delete updated[cellKey];
      } else {
        updated[cellKey] = current.filter((_, idx) => idx !== indexToRemove);
      }
      return updated;
    });
    toast.showToast('Period assignment removed', 'info');
  };

  // Open Copy Day Schedule Modal
  const handleOpenCopyModal = (defaultSourceId?: number) => {
    const src = defaultSourceId || activeDayTab;
    setCopySourceDayId(src);
    // Pre-select other working days (Mon-Sat, excluding source)
    setCopyTargetDayIds(
      DAYS_OF_WEEK.filter(d => d.id <= 6 && d.id !== src).map(d => d.id)
    );
    setCopyModalOpen(true);
  };

  // Toggle Target Day selection
  const handleToggleCopyTargetDay = (dayId: number) => {
    setCopyTargetDayIds(prev =>
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  // Quick Select Target Days
  const handleQuickSelectTargetDays = (type: 'weekdays' | 'workdays' | 'all' | 'clear') => {
    if (type === 'clear') {
      setCopyTargetDayIds([]);
    } else if (type === 'weekdays') {
      setCopyTargetDayIds([1, 2, 3, 4, 5].filter(id => id !== copySourceDayId));
    } else if (type === 'workdays') {
      setCopyTargetDayIds([1, 2, 3, 4, 5, 6].filter(id => id !== copySourceDayId));
    } else if (type === 'all') {
      setCopyTargetDayIds([1, 2, 3, 4, 5, 6, 7].filter(id => id !== copySourceDayId));
    }
  };

  // Execute Copy Day Schedule
  const handleExecuteCopyDay = () => {
    if (copyTargetDayIds.length === 0) {
      toast.showToast('Please select at least one destination day', 'warning');
      return;
    }

    // Collect all assignments for the source day
    const sourceAssignments: Array<{ classId: number; periodIdx: number; selections: string[] }> = [];

    classes.forEach(cls => {
      periods.forEach((_, pIdx) => {
        const key = `${copySourceDayId}_${cls.id}_${pIdx}`;
        const legacyKey = `${cls.id}_${pIdx}`;
        const sels =
          cellSelections[key] ||
          (copySourceDayId === 1 ? cellSelections[legacyKey] : []) ||
          [];

        if (sels.length > 0) {
          sourceAssignments.push({
            classId: cls.id,
            periodIdx: pIdx,
            selections: [...sels]
          });
        }
      });
    });

    if (sourceAssignments.length === 0) {
      const srcName = DAYS_OF_WEEK.find(d => d.id === copySourceDayId)?.name || 'selected day';
      toast.showToast(`No period assignments found on ${srcName} to copy.`, 'warning');
      return;
    }

    setCellSelections(prev => {
      const updated = { ...prev };

      copyTargetDayIds.forEach(targetDayId => {
        // Clear existing target day entries
        classes.forEach(cls => {
          periods.forEach((_, pIdx) => {
            const targetKey = `${targetDayId}_${cls.id}_${pIdx}`;
            delete updated[targetKey];
            if (targetDayId === 1) {
              delete updated[`${cls.id}_${pIdx}`];
            }
          });
        });

        // Replicate source day assignments to target day
        sourceAssignments.forEach(item => {
          const targetKey = `${targetDayId}_${item.classId}_${item.periodIdx}`;
          updated[targetKey] = [...item.selections];
        });
      });

      return updated;
    });

    const srcName = DAYS_OF_WEEK.find(d => d.id === copySourceDayId)?.name || 'Day';
    const destNames = copyTargetDayIds
      .map(tId => DAYS_OF_WEEK.find(d => d.id === tId)?.short || '')
      .join(', ');

    toast.showToast(
      `Successfully copied ${srcName}'s timetable (${sourceAssignments.length} periods) to: ${destNames}! Remember to save your timetable.`,
      'success'
    );
    setCopyModalOpen(false);
  };

  // Save Timetable to Supabase
  const handleSaveTimetable = useCallback(async () => {
    if (!sessionId || !user?.school_id) {
      toast.showToast('Cannot save timetable: Active session or school context missing.', 'error');
      return;
    }
    const schoolId = user.school_id;
    setLoading(true);

    const timetableDataToSave: Array<{
      class_id: number;
      period_index: number;
      subject_id: number;
      teacher_id: number;
      session_id: number;
      break_index: number;
      school_id: any;
      day_of_week: number;
    }> = [];

    Object.entries(cellSelections).forEach(([cellKey, selections]) => {
      const parts = cellKey.split('_');
      let dayOfWeek = 1;
      let classId = 0;
      let periodIndex = 0;

      if (parts.length === 3) {
        dayOfWeek = Number(parts[0]);
        classId = Number(parts[1]);
        periodIndex = Number(parts[2]);
      } else if (parts.length === 2) {
        classId = Number(parts[0]);
        periodIndex = Number(parts[1]);
        dayOfWeek = 1;
      }

      selections.forEach(selection => {
        const [subjectIdStr, teacherIdStr] = selection.split('_');
        const subjectId = Number(subjectIdStr);
        const teacherId = Number(teacherIdStr);

        if (subjectId && teacherId && classId) {
          timetableDataToSave.push({
            class_id: classId,
            period_index: periodIndex,
            subject_id: subjectId,
            teacher_id: teacherId,
            session_id: sessionId,
            break_index: breakIdx,
            school_id: schoolId,
            day_of_week: dayOfWeek
          });
        }
      });
    });

    try {
      // Get unique class_ids present
      const uniqueClassIds = Array.from(new Set(classes.map(c => c.id)));

      if (uniqueClassIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('timetable')
          .delete()
          .eq('session_id', sessionId)
          .eq('school_id', schoolId)
          .in('class_id', uniqueClassIds);

        if (deleteError) throw deleteError;
      }

      if (timetableDataToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('timetable')
          .insert(timetableDataToSave);

        if (insertError) throw insertError;
      }

      toast.showToast('Timetable saved successfully!', 'success');
    } catch (error: any) {
      toast.showToast(`Failed to save timetable: ${error.message || error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.school_id, cellSelections, classes, breakIdx, toast]);

  // Free Teachers for active day & period
  const getFreeTeachersForPeriod = (dayOfWeek: number, periodIndex: number): string[] => {
    const busyTeachers = new Set<number>();
    Object.entries(cellSelections).forEach(([key, selections]) => {
      const parts = key.split('_');
      if (parts.length === 3) {
        const kDay = Number(parts[0]);
        const kPIdx = Number(parts[2]);
        if (kDay === dayOfWeek && kPIdx === periodIndex) {
          selections.forEach(sel => {
            const [, tId] = sel.split('_');
            busyTeachers.add(Number(tId));
          });
        }
      } else if (parts.length === 2 && dayOfWeek === 1) {
        const kPIdx = Number(parts[1]);
        if (kPIdx === periodIndex) {
          selections.forEach(sel => {
            const [, tId] = sel.split('_');
            busyTeachers.add(Number(tId));
          });
        }
      }
    });

    return teachers
      .filter(t => !busyTeachers.has(t.id))
      .map(t => t.name)
      .sort();
  };

  // Export Timetable PDF (Per-Page Class-Wise with Days on Left)
  const handleExportPDF = useCallback(async () => {
    if (!sessionId) {
      toast.showToast('Ensure a session is active to export the timetable.', 'warning');
      return;
    }

    setExportLoading(true);
    setLoading(true);
    toast.showToast('Generating Class-wise PDF...', 'info');

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const tableWidth = pageWidth - 2 * margin;

      const activeClassIdsInSchedule = new Set(
        Object.keys(cellSelections).map(key => {
          const parts = key.split('_');
          return Number(parts.length === 3 ? parts[1] : parts[0]);
        })
      );

      const displayClasses = sortClasses(
        classes.filter(
          cls =>
            (classAssignments[cls.id] && classAssignments[cls.id].length > 0) ||
            activeClassIdsInSchedule.has(cls.id)
        )
      );
      const targetClasses = displayClasses.length > 0 ? displayClasses : sortClasses(classes);

      // Header row for autoTable
      const headerRow: (string | any)[] = ['Day'];
      for (let i = 0; i <= breakIdx; i++) {
        headerRow.push({
          content: `Period ${periods[i].num}\n${periods[i].time}`,
          styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' }
        });
      }
      headerRow.push({
        content: 'BREAK',
        styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] }
      });
      for (let i = breakIdx + 1; i < periods.length; i++) {
        headerRow.push({
          content: `Period ${periods[i].num}\n${periods[i].time}`,
          styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' }
        });
      }

      targetClasses.forEach((cls, pageIndex) => {
        if (pageIndex > 0) {
          doc.addPage();
        }

        // Title Header for the Class Page
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(`Class Timetable: ${cls.name} (${sessionName})`, pageWidth / 2, 14, { align: 'center' });

        // Footer Date
        const currentDate = formatAppDate(new Date());
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Printed on: ${currentDate}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

        // Body rows for this class across all days
        const bodyRows: any[][] = [];
        DAYS_OF_WEEK.forEach((day, dayIndex) => {
          const row: any[] = [day.name];

          // Periods before break
          for (let i = 0; i <= breakIdx; i++) {
            const cellKey = `${day.id}_${cls.id}_${i}`;
            const legacyKey = `${cls.id}_${i}`;
            const selected = cellSelections[cellKey] || (day.id === 1 ? cellSelections[legacyKey] : []) || [];

            if (selected.length > 0) {
              const formattedContent = selected
                .map(sel => {
                  const parts = sel.split('_');
                  const sId = Number(parts[0]);
                  const tId = Number(parts[1]);
                  const roomStr = parts[2] && parts[2] !== 'No room' ? `\n(${parts[2]})` : '';
                  return `${getSubjectName(sId)}\n${getTeacherName(tId)}${roomStr}`;
                })
                .join('\n');
              row.push(formattedContent);
            } else {
              row.push('-');
            }
          }

          // Break column
          if (dayIndex === 0) {
            row.push({
              content: `Break\n${breakSettings.start}-\n${breakSettings.end}`,
              rowSpan: DAYS_OF_WEEK.length,
              styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] }
            });
          }

          // Periods after break
          for (let i = breakIdx + 1; i < periods.length; i++) {
            const cellKey = `${day.id}_${cls.id}_${i}`;
            const legacyKey = `${cls.id}_${i}`;
            const selected = cellSelections[cellKey] || (day.id === 1 ? cellSelections[legacyKey] : []) || [];

            if (selected.length > 0) {
              const formattedContent = selected
                .map(sel => {
                  const parts = sel.split('_');
                  const sId = Number(parts[0]);
                  const tId = Number(parts[1]);
                  const roomStr = parts[2] && parts[2] !== 'No room' ? `\n(${parts[2]})` : '';
                  return `${getSubjectName(sId)}\n${getTeacherName(tId)}${roomStr}`;
                })
                .join('\n');
              row.push(formattedContent);
            } else {
              row.push('-');
            }
          }

          bodyRows.push(row);
        });

        autoTable(doc, {
          head: [headerRow],
          body: bodyRows,
          startY: 22,
          theme: 'grid',
          tableWidth: tableWidth,
          margin: { left: margin, right: margin, bottom: 15 },
          styles: { font: 'helvetica', fontSize: 8, halign: 'center', valign: 'middle', cellPadding: 3 },
          columnStyles: {
            0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 25 }
          }
        });
      });

      doc.save(`Class_Wise_Timetables_${formatAppDate(new Date())}.pdf`);
      toast.showToast('Class-wise PDF exported successfully!', 'success');
    } catch (error) {
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setExportLoading(false);
      setLoading(false);
    }
  }, [sessionId, sessionName, classes, classAssignments, periods, breakIdx, breakSettings, cellSelections, toast]);

  // Determine which days of week are used in cellSelections
  const usedDays = useMemo(() => {
    const daysSet = new Set<number>();
    Object.entries(cellSelections).forEach(([key, selections]) => {
      if (selections && selections.length > 0) {
        const parts = key.split('_');
        const dayId = parts.length === 3 ? Number(parts[0]) : 1;
        daysSet.add(dayId);
      }
    });
    const sorted = Array.from(daysSet).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : [1];
  }, [cellSelections]);

  // Get list of teacher IDs who have at least one period assigned
  const getActiveTeacherIds = useCallback((): number[] => {
    const ids = new Set<number>();
    Object.values(cellSelections).forEach(selections => {
      selections.forEach(sel => {
        const parts = sel.split('_');
        if (parts[1]) {
          const tId = Number(parts[1]);
          if (!isNaN(tId) && tId > 0) ids.add(tId);
        }
      });
    });
    return Array.from(ids).sort((a, b) => a - b);
  }, [cellSelections]);

  // Helper to format days list into concise labels (e.g. [Mon, Tue] => "Mon - Tue", [Mon, Sat] => "Mon - Sat", [Mon, Wed] => "Mon, Wed")
  const formatDaysLabel = (days: Array<{ id: number; name: string; short: string }>): string => {
    if (days.length === 0) return '';
    if (days.length === 1) return days[0].short;

    // Check if fully consecutive
    const isConsecutive = days.every((d, i) => i === 0 || d.id === days[i - 1].id + 1);
    if (isConsecutive) {
      return `${days[0].short} - ${days[days.length - 1].short}`;
    }

    // Break into consecutive segments (e.g. [Mon, Tue, Thu, Fri] => "Mon - Tue, Thu - Fri")
    const segments: string[] = [];
    let currentSegment: typeof days = [days[0]];

    for (let i = 1; i < days.length; i++) {
      if (days[i].id === days[i - 1].id + 1) {
        currentSegment.push(days[i]);
      } else {
        if (currentSegment.length === 1) {
          segments.push(currentSegment[0].short);
        } else {
          segments.push(`${currentSegment[0].short} - ${currentSegment[currentSegment.length - 1].short}`);
        }
        currentSegment = [days[i]];
      }
    }
    if (currentSegment.length === 1) {
      segments.push(currentSegment[0].short);
    } else {
      segments.push(`${currentSegment[0].short} - ${currentSegment[currentSegment.length - 1].short}`);
    }

    return segments.join(', ');
  };

  // Compute minimal schedule table for a teacher with day grouping
  const getTeacherSlipData = useCallback(
    (teacherId: number) => {
      const hasSpecificOtherDays = Object.keys(cellSelections).some(k => {
        const parts = k.split('_');
        return parts.length === 3 && Number(parts[0]) > 1 && (cellSelections[k] || []).length > 0;
      });

      const operatingDays = DAYS_OF_WEEK.filter(d => {
        if (d.id <= 6) return true;
        return Object.keys(cellSelections).some(
          k => k.startsWith('7_') && (cellSelections[k] || []).length > 0
        );
      });

      // Compute slot array for each operating day
      const daySignatures = operatingDays.map(d => {
        const slots = periods.map((period, pIdx) => {
          const assignedList: Array<{ className: string; subjectName: string }> = [];

          classes.forEach(cls => {
            const key = `${d.id}_${cls.id}_${pIdx}`;
            const legacyKey = `${cls.id}_${pIdx}`;
            const selections =
              cellSelections[key] ||
              (!hasSpecificOtherDays || d.id === 1 ? cellSelections[legacyKey] : []) ||
              [];

            selections.forEach(sel => {
              const [subjId, tId] = sel.split('_');
              if (Number(tId) === teacherId) {
                assignedList.push({
                  className: (cls.name || '').trim(),
                  subjectName: (getSubjectName(Number(subjId)) || 'Subject').trim()
                });
              }
            });
          });

          const isFree = assignedList.length === 0;
          let displayText = '—';
          if (!isFree) {
            const byClass: Record<string, string[]> = {};
            assignedList.forEach(a => {
              if (!byClass[a.className]) byClass[a.className] = [];
              if (!byClass[a.className].includes(a.subjectName)) {
                byClass[a.className].push(a.subjectName);
              }
            });
            displayText = Object.entries(byClass)
              .map(([clsName, subjNames]) => `${subjNames.join(', ')} - ${clsName}`)
              .join('\n');
          }

          return {
            periodNum: period.num,
            periodTime: period.time,
            displayText,
            assignedList,
            isFree
          };
        });

        const signature = slots.map(s => s.displayText).join('||');
        return { day: d, signature, slots };
      });

      // Group consecutive days with identical period schedules into ranges (e.g. Mon-Tue, Mon-Sat)
      const rawGroups: Array<{
        days: typeof operatingDays;
        signature: string;
        slots: Array<{
          periodNum: number;
          periodTime: string;
          displayText: string;
          assignedList: Array<{ className: string; subjectName: string }>;
          isFree: boolean;
        }>;
      }> = [];

      let curGroup: (typeof rawGroups)[0] | null = null;
      for (const item of daySignatures) {
        if (!curGroup) {
          curGroup = { days: [item.day], signature: item.signature, slots: item.slots };
        } else if (curGroup.signature === item.signature) {
          curGroup.days.push(item.day);
        } else {
          rawGroups.push(curGroup);
          curGroup = { days: [item.day], signature: item.signature, slots: item.slots };
        }
      }
      if (curGroup) rawGroups.push(curGroup);

      // Further combine any non-consecutive groups that share the exact same active schedule
      const mergedGroups: typeof rawGroups = [];
      rawGroups.forEach(group => {
        const hasLectures = group.slots.some(s => !s.isFree);
        if (hasLectures) {
          const match = mergedGroups.find(m => m.signature === group.signature);
          if (match) {
            match.days.push(...group.days);
            return;
          }
        }
        mergedGroups.push({ ...group, days: [...group.days] });
      });

      // Format final day column headers
      const dayGroups = mergedGroups.map(g => {
        const sortedDays = [...g.days].sort((a, b) => a.id - b.id);
        const label = formatDaysLabel(sortedDays);
        return { label, days: sortedDays, slots: g.slots };
      });

      // Calculate total weekly lectures
      let totalWeeklyLectures = 0;
      daySignatures.forEach(d => {
        d.slots.forEach(s => {
          if (!s.isFree) totalWeeklyLectures++;
        });
      });

      // Build rows for each period: [Period, ...DayColumns, Timing]
      const rows: Array<{
        periodNum: number;
        periodTime: string;
        isBreak: boolean;
        dayValues: string[];
      }> = [];

      periods.forEach((period, pIdx) => {
        rows.push({
          periodNum: period.num,
          periodTime: period.time,
          isBreak: false,
          dayValues: dayGroups.map(g => g.slots[pIdx]?.displayText || '—')
        });

        if (pIdx === breakIdx) {
          rows.push({
            periodNum: 0,
            periodTime: `${breakSettings.start} - ${breakSettings.end}`,
            isBreak: true,
            dayValues: []
          });
        }
      });

      return {
        dayGroups,
        rows,
        totalWeeklyLectures
      };
    },
    [cellSelections, periods, classes, breakIdx, breakSettings, subjects]
  );

  // Export Single Teacher Slip PDF (Clean, Minimal & Print-Ready)
  const handleExportSingleTeacherSlipPDF = useCallback(
    (teacherId: number) => {
      try {
        setTeacherSlipsLoading(true);
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const displayName = schoolName || 'School';
        const teacherName = getTeacherNameWithPrefix(teacherId);
        const slipData = getTeacherSlipData(teacherId);

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(displayName, 105, 18, { align: 'center' });

        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text('TEACHER TIMETABLE SLIP', 105, 24, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Academic Session: ${sessionName}`, 105, 29, { align: 'center' });

        // Teacher Info Bar
        doc.setDrawColor(210, 215, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 33, 182, 9.5, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`Teacher: ${teacherName}`, 105, 39.5, { align: 'center' });

        // Headers: Period - [Days...] - Timing
        const tableHeaders = ['Period', ...slipData.dayGroups.map(g => g.label), 'Timing'];

        const tableBody = slipData.rows.map(r => {
          if (r.isBreak) {
            return [
              {
                content: `☕ BREAK (${r.periodTime})`,
                colSpan: tableHeaders.length,
                styles: {
                  halign: 'center',
                  fontStyle: 'bold',
                  fillColor: [254, 243, 199],
                  textColor: [180, 83, 9]
                }
              }
            ];
          }
          return [`P${r.periodNum}`, ...r.dayValues, r.periodTime];
        });

        autoTable(doc, {
          head: [tableHeaders],
          body: tableBody as any,
          startY: 48,
          margin: { left: 14, right: 14 },
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2.8,
            halign: 'center',
            valign: 'middle',
            textColor: [30, 41, 59],
            lineWidth: 0.15,
            lineColor: [210, 215, 225]
          },
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center',
            lineWidth: 0.15
          },
          columnStyles: {
            0: { cellWidth: 16, fontStyle: 'bold' },
            [tableHeaders.length - 1]: { cellWidth: 26, fontStyle: 'normal' }
          },
          didParseCell: data => {
            if (data.row.section === 'body') {
              const val = String(data.cell.raw || '');
              if (val === '—') {
                data.cell.styles.textColor = [160, 174, 192];
              } else if (
                val &&
                data.column.index > 0 &&
                data.column.index < tableHeaders.length - 1
              ) {
                data.cell.styles.textColor = [16, 50, 140];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 14;

        // Footer & Signatures
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Issued on: ${new Date().toLocaleDateString('en-GB')}`, 14, finalY);

        doc.setDrawColor(180, 180, 180);
        doc.line(148, finalY, 192, finalY);
        doc.text('Principal Signature', 170, finalY + 4, { align: 'center' });

        doc.save(`Teacher_Slip_${teacherName.replace(/\s+/g, '_')}.pdf`);
        toast.showToast(`Teacher slip for ${teacherName} downloaded!`, 'success');
      } catch (err: any) {
        console.error('Failed to export single slip PDF:', err);
        toast.showToast('Could not download slip PDF. Please try again.', 'error');
      } finally {
        setTeacherSlipsLoading(false);
      }
    },
    [schoolName, sessionName, getTeacherNameWithPrefix, getTeacherSlipData, toast]
  );

  // Export All Teacher Slips (A4 Portrait - 4 Slips per page in 2x2 Grid with cut guidelines)
  const handleExportAllTeacherSlipsPDF = useCallback(() => {
    try {
      setTeacherSlipsLoading(true);
      const activeTeacherIds = getActiveTeacherIds();
      if (activeTeacherIds.length === 0) {
        toast.showToast('No teacher timetable assignments found to export.', 'warning');
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const gridCols = 2;
      const gridRows = 2;
      const slipsPerPage = gridCols * gridRows;
      const colGap = 8;
      const rowGap = 8;
      const slipWidth = (pageWidth - 2 * margin - colGap) / gridCols;
      const slipHeight = (pageHeight - 2 * margin - rowGap) / gridRows;

      activeTeacherIds.forEach((tId, index) => {
        if (index > 0 && index % slipsPerPage === 0) {
          doc.addPage();
        }

        const slotOnPage = index % slipsPerPage;
        const col = slotOnPage % gridCols;
        const row = Math.floor(slotOnPage / gridCols);

        const startX = margin + col * (slipWidth + colGap);
        const startY = margin + row * (slipHeight + rowGap);

        // Draw cut guideline box around slip
        doc.setDrawColor(215, 220, 228);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(startX, startY, slipWidth, slipHeight, 2, 2, 'D');
        doc.setLineDashPattern([], 0);

        // Slip Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(30, 41, 59);
        doc.text(
          schoolName || 'SCHOOL',
          startX + slipWidth / 2,
          startY + 6.5,
          { align: 'center' }
        );

        const teacherName = getTeacherNameWithPrefix(tId);
        doc.setFontSize(7.6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`TEACHER TIMETABLE SLIP · ${teacherName}`, startX + slipWidth / 2, startY + 11.2, {
          align: 'center'
        });

        const slipData = getTeacherSlipData(tId);
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Academic Session: ${sessionName}`,
          startX + slipWidth / 2,
          startY + 15.5,
          { align: 'center' }
        );

        const tableHeaders = ['Per', ...slipData.dayGroups.map(g => g.label), 'Timing'];
        const tableBody = slipData.rows.map(r => {
          if (r.isBreak) {
            return [
              {
                content: `BREAK (${r.periodTime})`,
                colSpan: tableHeaders.length,
                styles: {
                  halign: 'center',
                  fontStyle: 'bold',
                  fillColor: [254, 243, 199],
                  textColor: [180, 83, 9]
                }
              }
            ];
          }
          return [`P${r.periodNum}`, ...r.dayValues, r.periodTime];
        });

        // Calculate dynamic row height to fully and proportionally utilize vertical space (slipHeight = 136.5mm)
        const totalRows = tableBody.length + 1;
        const availableTableHeight = slipHeight - 30; // ~106.5mm between header (startY + 19) and footer (startY + 131)
        const calculatedRowHeight = Math.min(11.5, Math.max(7.2, Math.floor((availableTableHeight / totalRows) * 10) / 10));

        autoTable(doc, {
          head: [tableHeaders],
          body: tableBody as any,
          startY: startY + 19,
          margin: { left: startX + 3, right: pageWidth - (startX + slipWidth - 3) },
          tableWidth: slipWidth - 6,
          theme: 'grid',
          styles: {
            fontSize: 7.2,
            cellPadding: 2.2,
            minCellHeight: calculatedRowHeight,
            halign: 'center',
            valign: 'middle',
            textColor: [30, 41, 59],
            lineWidth: 0.12,
            lineColor: [210, 215, 225]
          },
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 7.8,
            minCellHeight: calculatedRowHeight,
            halign: 'center',
            lineWidth: 0.12,
            lineColor: [210, 215, 225]
          },
          columnStyles: {
            0: { cellWidth: 10, fontStyle: 'bold', halign: 'center' },
            [tableHeaders.length - 1]: { cellWidth: 20, halign: 'center' }
          },
          didParseCell: data => {
            if (data.row.section === 'body') {
              const val = String(data.cell.raw || '');
              if (val === '—') {
                data.cell.styles.textColor = [160, 174, 192];
              } else if (
                val &&
                data.column.index > 0 &&
                data.column.index < tableHeaders.length - 1
              ) {
                data.cell.styles.textColor = [16, 50, 140];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });

        const footerY = startY + slipHeight - 5.5;
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Issued: ${new Date().toLocaleDateString('en-GB')}`, startX + 4, footerY);
        doc.text('Principal Signature: _________', startX + slipWidth - 4, footerY, { align: 'right' });
      });

      doc.save(`All_Teacher_Slips_(${sessionName.replace(/\s+/g, '_')}).pdf`);
      toast.showToast('All teacher slips exported successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to export all slips PDF:', err);
      toast.showToast('Could not export slips PDF. Please try again.', 'error');
    } finally {
      setTeacherSlipsLoading(false);
    }
  }, [getActiveTeacherIds, schoolName, sessionName, getTeacherNameWithPrefix, getTeacherSlipData, toast]);

  // Export Teacher Slips PDF Handler (defaults to all slips grid)
  const handleExportTeacherSlips = useCallback(async () => {
    if (!sessionId) {
      toast.showToast('Ensure a session is active to export teacher slips.', 'warning');
      return;
    }
    handleExportAllTeacherSlipsPDF();
  }, [sessionId, handleExportAllTeacherSlipsPDF, toast]);

  // Helper to render individual minimal slip preview
  const renderSlipPreview = (teacherId: number) => {
    const slipData = getTeacherSlipData(teacherId);
    const teacherName = getTeacherNameWithPrefix(teacherId);
    const tableHeaders = ['Period', ...slipData.dayGroups.map(g => g.label), 'Timing'];

    return (
      <MinimalSlipCard key={teacherId} theme={theme} className="minimal-slip-card">
        <div style={{ textAlign: 'center', borderBottom: `1.5px solid ${theme.BORDER}`, paddingBottom: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {schoolName || 'School'}
          </h4>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: theme.ACCENT, marginTop: '2px', textTransform: 'uppercase' }}>
            Teacher Timetable Slip
          </div>
          <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '1px' }}>
            Academic Session: {sessionName || 'Current Session'}
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            padding: '5px 8px',
            background: theme.ACCENT + '0d',
            borderRadius: '4px',
            border: `1px solid ${theme.BORDER}`
          }}
        >
          Teacher: <strong>{teacherName}</strong>
        </div>

        <SlipTable theme={theme}>
          <thead>
            <tr>
              <th style={{ width: '12%' }}>Period</th>
              {slipData.dayGroups.map((g, gIdx) => (
                <th key={gIdx}>{g.label}</th>
              ))}
              <th style={{ width: '22%' }}>Timing</th>
            </tr>
          </thead>
          <tbody>
            {slipData.rows.map((row, idx) => {
              if (row.isBreak) {
                return (
                  <tr key={`break-${idx}`} className="break-row">
                    <td colSpan={tableHeaders.length}>
                      ☕ RECESS / BREAK ({row.periodTime})
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={`p-${idx}`}>
                  <td style={{ fontWeight: 700 }}>P{row.periodNum}</td>
                  {row.dayValues.map((val, vIdx) => (
                    <td
                      key={vIdx}
                      style={{
                        fontWeight: val !== '—' ? 700 : 400,
                        color: val !== '—' ? '#1d4ed8' : theme.TEXT_SECONDARY
                      }}
                    >
                      {val}
                    </td>
                  ))}
                  <td style={{ fontSize: '0.74rem', fontVariantNumeric: 'tabular-nums' }}>{row.periodTime}</td>
                </tr>
              );
            })}
          </tbody>
        </SlipTable>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '0.7rem',
            color: theme.TEXT_SECONDARY,
            borderTop: `1px dashed ${theme.BORDER}`,
            paddingTop: '6px',
            marginTop: '2px'
          }}
        >
          <div>
            Issued: {new Date().toLocaleDateString('en-GB')}
          </div>
          <div>
            <div style={{ borderTop: `1px solid ${theme.BORDER}`, minWidth: '90px', textAlign: 'center', paddingTop: '2px' }}>
              Principal Sign
            </div>
          </div>
        </div>
      </MinimalSlipCard>
    );
  };

  // Save Settings Modal Handler
  const handleSaveTimings = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const { error: pError } = await supabase
        .from('timetable_periods')
        .upsert(
          tempPeriods.map((p, idx) => ({
            period_index: idx,
            start_time: p.time.split('-')[0],
            end_time: p.time.split('-')[1],
            school_id: user.school_id
          })),
          { onConflict: 'school_id,period_index' }
        );

      if (pError) throw pError;

      const { error: sError } = await supabase.from('timetable_settings').upsert({
        school_id: user.school_id,
        break_after_period_index: tempBreakIdx,
        break_start_time: tempBreakSettings.start,
        break_end_time: tempBreakSettings.end
      });

      if (sError) throw sError;

      setPeriods([...tempPeriods]);
      setBreakSettings({ ...tempBreakSettings });
      setBreakIdx(tempBreakIdx);
      setTimingModalOpen(false);
      toast.showToast('Timetable settings saved successfully!', 'success');
    } catch (error: any) {
      toast.showToast('Failed to save settings: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Footer Setup
  useEffect(() => {
    const FooterContent = React.memo(() => {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '6px 8px' : '12px 16px',
            gap: isMobile ? '6px' : '12px',
            flexWrap: 'nowrap'
          }}
        >
          <BreakControl theme={theme}>
            <label htmlFor="break-select">Break after period:</label>
            <FormSelect
              theme={theme}
              id="break-select"
              value={breakIdx}
              onChange={e => setBreakIdx(Number(e.target.value))}
              style={{ height: '36px', padding: '4px 10px' }}
            >
              {periods.slice(0, periods.length - 1).map((p, idx) => (
                <FormOption key={p.num} theme={theme} value={idx}>
                  Period {idx + 1}
                </FormOption>
              ))}
            </FormSelect>
          </BreakControl>

          <ActionButtonsGroup theme={theme}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveTimetable}
              disabled={loading || !sessionId}
              size={isMobile ? 'small' : 'medium'}
              startIcon={<Save />}
            >
              {loading ? 'Saving...' : 'Save Timetable'}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleExportPDF}
              disabled={loading || exportLoading || !sessionId}
              size={isMobile ? 'small' : 'medium'}
              startIcon={<PictureAsPdf />}
            >
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </Button>
            <Button
              variant="contained"
              sx={{ backgroundColor: '#0284c7', '&:hover': { backgroundColor: '#0369a1' } }}
              onClick={() => {
                const ids = getActiveTeacherIds();
                if (ids.length > 0) {
                  setSelectedSlipTeacherId(ids[0]);
                } else {
                  setSelectedSlipTeacherId('all');
                }
                setSlipsModalOpen(true);
              }}
              disabled={loading || teacherSlipsLoading || !sessionId}
              size={isMobile ? 'small' : 'medium'}
              startIcon={<Description />}
            >
              Teacher Slips
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                setTempPeriods([...periods]);
                setTempBreakSettings({ ...breakSettings });
                setTempBreakIdx(breakIdx);
                setTimingModalOpen(true);
              }}
              disabled={loading}
              size={isMobile ? 'small' : 'medium'}
              startIcon={<Settings />}
            >
              Settings
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => setClearConfirmOpen(true)}
              disabled={loading}
              size={isMobile ? 'small' : 'medium'}
              startIcon={<Delete />}
            >
              Clear Timetable
            </Button>
          </ActionButtonsGroup>
        </Box>
      );
    });

    setFooterContent({
      visible: true,
      content: <FooterContent />
    });

    return () => setFooterContent(null);
  }, [
    breakIdx,
    loading,
    exportLoading,
    teacherSlipsLoading,
    sessionId,
    isMobile,
    theme,
    handleSaveTimetable,
    handleExportPDF,
    getActiveTeacherIds,
    setFooterContent,
    periods,
    breakSettings
  ]);

  // Derived options for cascading dropdowns (Class -> Subject -> Teacher)
  const availableClassSubjects = React.useMemo(() => {
    if (!formClassId) return [];
    const classId = Number(formClassId);
    const assignedPairs = classAssignments[classId] || [];
    const subjectIdSet = new Set(assignedPairs.map(p => p.subjectId));
    const list = subjects.filter(s => subjectIdSet.has(s.id));
    return list.length > 0 ? list : subjects;
  }, [formClassId, classAssignments, subjects]);

  const availableClassSubjectTeachers = React.useMemo(() => {
    if (!formClassId || formSubjectIds.length === 0) return teachers;
    const classId = Number(formClassId);
    const selectedSubjIdSet = new Set(formSubjectIds.map(Number));
    const assignedPairs = classAssignments[classId] || [];
    const teacherIdSet = new Set(
      assignedPairs.filter(p => selectedSubjIdSet.has(p.subjectId)).map(p => p.teacherId)
    );
    const list = teachers.filter(t => teacherIdSet.has(t.id));
    return list.length > 0 ? list : teachers;
  }, [formClassId, formSubjectIds, classAssignments, teachers]);

  if (!user?.school_id) {
    return (
      <Container>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          <Info style={{ fontSize: '1.5rem', marginBottom: '8px' }} />
          <div>No school context found. Please contact your administrator.</div>
        </div>
      </Container>
    );
  }

  if (loading || !allDataLoaded) {
    return <Loader />;
  }

  if (teachers.length === 0) {
    return <NoTeachersFound />;
  }

  const hasAssignments =
    Object.keys(classAssignments).length > 0 &&
    Object.values(classAssignments).some(assignments => assignments.length > 0);

  if (!hasAssignments) {
    return (
      <Container>
        <PageHeader>
          <HeaderLeft>
            <PageHeaderText>
              📅 Timetable
              {sessionName && <SessionBadge>{sessionName}</SessionBadge>}
            </PageHeaderText>
            <Subtitle>Manage weekly schedule and period assignments for all classes</Subtitle>
          </HeaderLeft>
        </PageHeader>
        <NoAssignmentsContainer>
          <NoAssignmentsIcon>📚</NoAssignmentsIcon>
          <NoAssignmentsTitle>No Subjects Assigned to Teachers</NoAssignmentsTitle>
          <NoAssignmentsText>
            No subjects have been assigned to teachers yet. You need to assign subjects to teachers first before creating a timetable.
          </NoAssignmentsText>
          <AssignSubjectsButton onClick={() => navigate('/teacher-subjects')}>
            📋 Assign Subjects to Teachers
          </AssignSubjectsButton>
        </NoAssignmentsContainer>
      </Container>
    );
  }

  const activeClassIdsInSchedule = new Set(
    Object.keys(cellSelections).map(key => {
      const parts = key.split('_');
      return Number(parts.length === 3 ? parts[1] : parts[0]);
    })
  );

  const displayClasses = sortClasses(
    classes.filter(
      cls =>
        (classAssignments[cls.id] && classAssignments[cls.id].length > 0) ||
        activeClassIdsInSchedule.has(cls.id)
    )
  );
  const filteredClasses = displayClasses.length > 0 ? displayClasses : sortClasses(classes);

  return (
    <Container>
      <PageHeader>
        <HeaderLeft>
          <PageHeaderText>
            📅 Timetable
            {sessionName && <SessionBadge>{sessionName}</SessionBadge>}
          </PageHeaderText>
          <Subtitle>Assign periods to teachers and manage weekly schedules</Subtitle>
        </HeaderLeft>
      </PageHeader>

      <MainContent>
        {/* "Assign Period to a Teacher" Top Card Panel */}
        <AssignCard theme={theme} collapsed={formCollapsed}>
          <AssignHeaderRow onClick={() => setFormCollapsed(!formCollapsed)}>
            <AssignTitle theme={theme}>
              <Schedule style={{ color: theme.ACCENT }} />
              Assign Period to a Teacher
            </AssignTitle>
            <IconButton size="small" style={{ color: theme.TEXT_SECONDARY }}>
              {formCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          </AssignHeaderRow>
          <AssignGrid collapsed={formCollapsed}>
            {/* Day * */}
            <FormGroup>
              <FormLabel theme={theme}>
                Day <span className="required">*</span>
              </FormLabel>
              <FormSelect
                theme={theme}
                value={formDay}
                onChange={e => setFormDay(Number(e.target.value))}
              >
                {DAYS_OF_WEEK.map(d => (
                  <FormOption key={d.id} theme={theme} value={d.id}>
                    {d.name}
                  </FormOption>
                ))}
              </FormSelect>
            </FormGroup>

            {/* Period * */}
            <FormGroup>
              <FormLabel theme={theme}>
                Period <span className="required">*</span>
              </FormLabel>
              <FormSelect
                theme={theme}
                value={formPeriodIndex}
                onChange={e => setFormPeriodIndex(e.target.value)}
              >
                <FormOption theme={theme} value="">
                  Select Period
                </FormOption>
                {periods.map((p, idx) => (
                  <FormOption key={p.num} theme={theme} value={idx}>
                    Period {p.num} ({p.time})
                  </FormOption>
                ))}
              </FormSelect>
            </FormGroup>

            {/* Section / Class * (Step 1) */}
            <FormGroup>
              <FormLabel theme={theme}>
                Section / Class <span className="required">*</span>
              </FormLabel>
              <FormSelect
                theme={theme}
                value={formClassId}
                onChange={e => {
                  setFormClassId(e.target.value);
                  setFormSubjectIds([]);
                  setFormTeacherId('');
                }}
              >
                <FormOption theme={theme} value="">
                  Select Class / Section
                </FormOption>
                {sortClasses(classes).map(c => (
                  <FormOption key={c.id} theme={theme} value={c.id}>
                    {c.name}
                  </FormOption>
                ))}
              </FormSelect>
            </FormGroup>

            {/* Subject (Step 2 - filtered by selected class, supports multi-selection) */}
            <FormGroup>
              <FormLabel theme={theme}>
                Subject(s) <span className="required">*</span>
              </FormLabel>
              <Select
                multiple
                size="small"
                displayEmpty
                value={formSubjectIds}
                disabled={!formClassId}
                onChange={e => {
                  const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  setFormSubjectIds(val);
                }}
                renderValue={selected => {
                  if (selected.length === 0) {
                    return (
                      <span style={{ color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>
                        {formClassId ? 'Select Subject(s)' : 'Select Class First'}
                      </span>
                    );
                  }
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '100%', overflow: 'hidden' }}>
                      {selected.map(sId => (
                        <span
                          key={sId}
                          style={{
                            background: theme.ACCENT + '25',
                            color: theme.TEXT_PRIMARY,
                            border: `1px solid ${theme.ACCENT}40`,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.74rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getSubjectName(Number(sId))}
                        </span>
                      ))}
                    </Box>
                  );
                }}
                sx={{
                  height: 40,
                  borderRadius: '8px',
                  backgroundColor: theme.FIELD_BG || theme.CARD,
                  color: theme.TEXT_PRIMARY,
                  fontSize: '0.875rem',
                  border: `1px solid ${theme.BORDER}`,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& .MuiSelect-select': {
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 280,
                      backgroundColor: theme.CARD,
                      color: theme.TEXT_PRIMARY,
                      border: `1px solid ${theme.BORDER}`
                    }
                  }
                }}
              >
                {availableClassSubjects.map(s => {
                  const isChecked = formSubjectIds.includes(String(s.id));
                  return (
                    <MenuItem key={s.id} value={String(s.id)} sx={{ fontSize: '0.875rem', py: 0.5 }}>
                      <Checkbox size="small" checked={isChecked} sx={{ p: 0.5, mr: 1, color: theme.ACCENT }} />
                      <ListItemText
                        primary={s.name}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isChecked ? 700 : 400 }}
                      />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormGroup>

            {/* Teacher (Step 3 - Shows all active teachers + No teacher + Custom options) */}
            <FormGroup>
              <FormLabel theme={theme}>
                Teacher <span className="required">*</span>
              </FormLabel>
              <FormSelect
                theme={theme}
                value={formTeacherId}
                disabled={!formClassId || formSubjectIds.length === 0}
                onChange={e => {
                  setFormTeacherId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomTeacherName('');
                  }
                }}
              >
                <FormOption theme={theme} value="">
                  {formSubjectIds.length > 0 ? 'Select Teacher' : 'Select Subject(s) First'}
                </FormOption>
                <FormOption theme={theme} value="no_teacher">
                  🚫 No teacher
                </FormOption>
                <FormOption theme={theme} value="custom">
                  ✏️ Custom Name...
                </FormOption>
                {teachers.map(t => {
                  const cnt = getTeacherAssignmentCount(t.id);
                  const isPreAssigned =
                    formClassId &&
                    formSubjectIds.length > 0 &&
                    (classAssignments[Number(formClassId)] || []).some(
                      p => formSubjectIds.map(Number).includes(p.subjectId) && p.teacherId === t.id
                    );
                  return (
                    <FormOption key={t.id} theme={theme} value={t.id}>
                      {t.name} (CN: {cnt}){isPreAssigned ? ' ★' : ''}
                    </FormOption>
                  );
                })}
              </FormSelect>
              {formTeacherId === 'custom' && (
                <FormInput
                  theme={theme}
                  type="text"
                  placeholder="Enter custom teacher name..."
                  value={customTeacherName}
                  onChange={e => setCustomTeacherName(e.target.value)}
                  style={{ marginTop: '6px' }}
                  autoFocus
                />
              )}
            </FormGroup>

            {/* Room (optional) */}
            <FormGroup>
              <FormLabel theme={theme}>Room(optional)</FormLabel>
              <FormSelect
                theme={theme}
                value={formRoom}
                onChange={e => setFormRoom(e.target.value)}
              >
                {ROOM_OPTIONS.map(r => (
                  <FormOption key={r} theme={theme} value={r}>
                    {r}
                  </FormOption>
                ))}
              </FormSelect>
            </FormGroup>

            {/* Spans */}
            <FormGroup>
              <FormLabel theme={theme}>Spans</FormLabel>
              <FormSelect
                theme={theme}
                value={formSpans}
                onChange={e => setFormSpans(Number(e.target.value))}
              >
                <FormOption theme={theme} value={1}>
                  1 period
                </FormOption>
                <FormOption theme={theme} value={2}>
                  2 periods
                </FormOption>
                <FormOption theme={theme} value={3}>
                  3 periods
                </FormOption>
                <FormOption theme={theme} value={4}>
                  4 periods
                </FormOption>
              </FormSelect>
            </FormGroup>
          </AssignGrid>

          <FormActionsRow theme={theme} collapsed={formCollapsed}>
            <ClearButton theme={theme} onClick={handleClearForm}>
              Clear
            </ClearButton>
            <AssignButton theme={theme} onClick={handleAssignPeriodForm}>
              <CheckCircle style={{ fontSize: '18px' }} />
              Assign Period
            </AssignButton>
          </FormActionsRow>
        </AssignCard>

        {/* Day Navigation Tabs & Copy Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <DayTabsContainer theme={theme} style={{ marginBottom: 0, flex: 1 }}>
            {DAYS_OF_WEEK.map(d => {
              const cnt = getDayAssignmentCount(d.id);
              return (
                <DayTab
                  key={d.id}
                  theme={theme}
                  active={activeDayTab === d.id}
                  onClick={() => setActiveDayTab(d.id)}
                >
                  <span>{d.name}</span>
                  {cnt > 0 && <span className="badge">{cnt}</span>}
                </DayTab>
              );
            })}
          </DayTabsContainer>

          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopy />}
            onClick={() => handleOpenCopyModal(activeDayTab)}
            sx={{
              borderColor: theme.BORDER,
              color: theme.TEXT_PRIMARY,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              height: '36px',
              '&:hover': {
                borderColor: theme.ACCENT,
                backgroundColor: theme.ACCENT + '12'
              }
            }}
          >
            Copy Day Schedule
          </Button>
        </div>

        {/* Matrix Timetable Grid */}
        <TableWrapper theme={theme}>
          <TimetableTable>
            <thead>
              <tr>
                <Th classCol theme={theme}>
                  Class
                </Th>
                {Array.from({ length: periods.length + 1 }).map((_, idx) => {
                  if (idx === breakIdx + 1) {
                    return <Th breakCol key="break" theme={theme} />;
                  } else {
                    const periodIdx = idx > breakIdx + 1 ? idx - 1 : idx;
                    const period = periods[periodIdx];
                    if (!period) return null;
                    return (
                      <Th key={period.num} theme={theme}>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>P{period.num}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8 }}>
                          {period.time}
                        </div>
                      </Th>
                    );
                  }
                })}
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls, rowIdx) => (
                <tr key={cls.id}>
                  <Td classCol theme={theme} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {cls.name}
                  </Td>

                  {Array.from({ length: periods.length + 1 }).map((_, idx) => {
                    if (idx === breakIdx + 1) {
                      if (rowIdx === 0) {
                        return (
                          <BreakColumn
                            key="break"
                            theme={theme}
                            rowSpan={filteredClasses.length + 1}
                          >
                            BREAK<br />
                            {breakSettings.start}-{breakSettings.end}
                          </BreakColumn>
                        );
                      }
                      return null;
                    }

                    const periodIdx = idx > breakIdx + 1 ? idx - 1 : idx;
                    const cellKey = `${activeDayTab}_${cls.id}_${periodIdx}`;
                    const legacyKey = `${cls.id}_${periodIdx}`;
                    const selected = cellSelections[cellKey] || (activeDayTab === 1 ? cellSelections[legacyKey] : []) || [];

                    return (
                      <Td
                        key={idx}
                        theme={theme}
                        hasContent={selected.length > 0}
                        style={{ position: 'relative' }}
                      >
                        {selected.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {selected.map((sel, sIdx) => {
                              const parts = sel.split('_');
                              const subjectId = Number(parts[0]);
                              const teacherId = Number(parts[1]);
                              const roomStr = parts[2] || '';

                              return (
                                <CellCard key={sIdx} theme={theme}>
                                  <div
                                    className="delete-icon"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleRemoveCellAssignment(cellKey, sIdx);
                                    }}
                                    title="Remove Subject"
                                  >
                                    ✕
                                  </div>
                                  <div style={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: '1.2' }}>
                                    {getSubjectName(subjectId)}
                                  </div>
                                  <div style={{ fontSize: '0.725rem', opacity: 0.8, lineHeight: '1.2' }}>
                                    {getTeacherName(teacherId)}
                                  </div>
                                  {roomStr && roomStr !== 'No room' && (
                                    <RoomBadge theme={theme}>{roomStr}</RoomBadge>
                                  )}
                                </CellCard>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: 'inherit', opacity: 0.35, fontSize: '0.75rem' }}>
                            -
                          </span>
                        )}
                      </Td>
                    );
                  })}
                </tr>
              ))}

              {/* Free Teachers Footer Row */}
              <tr>
                <Td classCol theme={theme} style={{ fontWeight: 700, fontSize: '0.8rem', background: theme.FIELD_BG }}>
                  Free Teachers
                </Td>
                {Array.from({ length: periods.length + 1 }).map((_, idx) => {
                  if (idx === breakIdx + 1) {
                    return null;
                  }
                  const periodIdx = idx > breakIdx + 1 ? idx - 1 : idx;
                  const freeList = getFreeTeachersForPeriod(activeDayTab, periodIdx);

                  return (
                    <Td
                      key={`free_${idx}`}
                      theme={theme}
                      style={{ fontSize: '0.725rem', color: theme.TEXT_SECONDARY, fontStyle: 'italic', padding: '6px 4px' }}
                    >
                      {freeList.length > 0 ? freeList.join(', ') : '-'}
                    </Td>
                  );
                })}
              </tr>
            </tbody>
          </TimetableTable>
        </TableWrapper>
      </MainContent>

      {/* Settings Modal */}
      <Dialog open={timingModalOpen} onClose={() => setTimingModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Timetable & Period Settings
          <IconButton onClick={() => setTimingModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Period Time Slots</h4>
            {tempPeriods.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ minWidth: '70px', fontWeight: 600, fontSize: '0.875rem' }}>
                  Period {p.num}:
                </span>
                <TextField
                  size="small"
                  label="Start Time - End Time"
                  value={p.time}
                  onChange={e => {
                    const newTime = e.target.value;
                    setTempPeriods(prev => prev.map((item, i) => (i === idx ? { ...item, time: newTime } : item)));
                  }}
                />
              </div>
            ))}

            <Divider style={{ margin: '8px 0' }} />

            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Break Settings</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <TextField
                size="small"
                label="Break Start Time"
                value={tempBreakSettings.start}
                onChange={e => setTempBreakSettings(prev => ({ ...prev, start: e.target.value }))}
              />
              <TextField
                size="small"
                label="Break End Time"
                value={tempBreakSettings.end}
                onChange={e => setTempBreakSettings(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions style={{ padding: '12px 24px' }}>
          <Button onClick={() => setTimingModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveTimings}>
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Timetable Confirmation Modal */}
      <Dialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle style={{ fontWeight: 700, color: '#ef4444' }}>
          Clear Timetable Schedule?
        </DialogTitle>
        <DialogContent dividers>
          <div style={{ fontSize: '0.9rem', color: theme.TEXT_SECONDARY, lineHeight: 1.5 }}>
            Are you sure you want to clear all period assignments from the current timetable? This action will reset all period entries on screen until saved.
          </div>
        </DialogContent>
        <DialogActions style={{ padding: '12px 24px' }}>
          <Button onClick={() => setClearConfirmOpen(false)}>No, Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setCellSelections({});
              setClearConfirmOpen(false);
              toast.showToast('Timetable schedule cleared!', 'info');
            }}
          >
            Yes, Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Day Schedule Modal */}
      <Dialog
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme.CARD,
            color: theme.TEXT_PRIMARY,
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.BORDER}`,
            padding: '14px 20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ContentCopy sx={{ color: theme.ACCENT }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Copy Day Schedule</span>
          </div>
          <IconButton onClick={() => setCopyModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY, lineHeight: 1.5 }}>
            Replicate the complete period assignments from one day to any other days of the week in one click.
          </div>

          {/* Source Day Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              1. Copy From (Source Day):
            </label>
            <FormSelect
              theme={theme}
              value={copySourceDayId}
              onChange={e => {
                const newSrc = Number(e.target.value);
                setCopySourceDayId(newSrc);
                setCopyTargetDayIds(prev => prev.filter(id => id !== newSrc));
              }}
              style={{ fontWeight: 600, fontSize: '0.9rem' }}
            >
              {DAYS_OF_WEEK.map(d => {
                const cnt = getDayAssignmentCount(d.id);
                return (
                  <FormOption key={d.id} theme={theme} value={d.id}>
                    {d.name} {cnt > 0 ? `(${cnt} periods configured)` : '(Empty)'}
                  </FormOption>
                );
              })}
            </FormSelect>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* Target Days Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                2. Copy To Destination Day(s):
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickSelectTargetDays('weekdays')}
                  sx={{ fontSize: '0.72rem', py: 0.3, px: 1, borderColor: theme.BORDER, color: theme.TEXT_PRIMARY }}
                >
                  Mon - Fri
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickSelectTargetDays('workdays')}
                  sx={{ fontSize: '0.72rem', py: 0.3, px: 1, borderColor: theme.BORDER, color: theme.TEXT_PRIMARY }}
                >
                  Mon - Sat
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickSelectTargetDays('all')}
                  sx={{ fontSize: '0.72rem', py: 0.3, px: 1, borderColor: theme.BORDER, color: theme.TEXT_PRIMARY }}
                >
                  All Days
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => handleQuickSelectTargetDays('clear')}
                  sx={{ fontSize: '0.72rem', py: 0.3, px: 0.8, color: theme.TEXT_SECONDARY }}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Target Days Checkbox List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              {DAYS_OF_WEEK.map(d => {
                const isSource = d.id === copySourceDayId;
                const isChecked = copyTargetDayIds.includes(d.id);
                const cnt = getDayAssignmentCount(d.id);

                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      if (!isSource) handleToggleCopyTargetDay(d.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSource ? theme.BORDER : isChecked ? theme.ACCENT : theme.BORDER}`,
                      background: isSource ? theme.ACCENT + '08' : isChecked ? theme.ACCENT + '12' : theme.CARD,
                      opacity: isSource ? 0.45 : 1,
                      cursor: isSource ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      disabled={isSource}
                      sx={{ p: 0, color: theme.ACCENT }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: isChecked ? 700 : 500, fontSize: '0.85rem' }}>
                        {d.name} {isSource && '(Source)'}
                      </span>
                      {!isSource && cnt > 0 && (
                        <span style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY }}>
                          {cnt} periods will be replaced
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>

        <DialogActions style={{ padding: '12px 20px', borderTop: `1px solid ${theme.BORDER}` }}>
          <Button onClick={() => setCopyModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ContentCopy />}
            disabled={copyTargetDayIds.length === 0}
            onClick={handleExecuteCopyDay}
          >
            Copy Schedule ({copyTargetDayIds.length} {copyTargetDayIds.length === 1 ? 'day' : 'days'})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Teacher Slips Modal */}
      <Dialog
        open={slipsModalOpen}
        onClose={() => setSlipsModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: theme.CARD,
            color: theme.TEXT_PRIMARY,
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.BORDER}`,
            padding: '14px 20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Description sx={{ color: theme.ACCENT }} />
            <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>Teacher Timetable Slips</span>
          </div>
          <IconButton onClick={() => setSlipsModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top selection strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              background: theme.ACCENT + '0d',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1px solid ${theme.BORDER}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="slip-teacher-select" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Select Faculty Slip:
              </label>
              <select
                id="slip-teacher-select"
                value={selectedSlipTeacherId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedSlipTeacherId(val === 'all' ? 'all' : Number(val));
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.BORDER}`,
                  background: theme.CARD,
                  color: theme.TEXT_PRIMARY,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {getActiveTeacherIds().map(tId => (
                  <option key={tId} value={tId}>
                    {getTeacherNameWithPrefix(tId)}
                  </option>
                ))}
                <option value="all">── All Teachers (Grid / Batch Print) ──</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Print />}
                onClick={() => window.print()}
                sx={{ borderColor: theme.BORDER, color: theme.TEXT_PRIMARY }}
              >
                Print Slip
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<PictureAsPdf />}
                onClick={() => {
                  if (selectedSlipTeacherId === 'all') {
                    handleExportAllTeacherSlipsPDF();
                  } else {
                    handleExportSingleTeacherSlipPDF(selectedSlipTeacherId);
                  }
                }}
                disabled={teacherSlipsLoading}
                sx={{ backgroundColor: '#0284c7', '&:hover': { backgroundColor: '#0369a1' } }}
              >
                {teacherSlipsLoading
                  ? 'Exporting...'
                  : selectedSlipTeacherId === 'all'
                  ? 'Download All (PDF)'
                  : 'Download Slip (PDF)'}
              </Button>
              {selectedSlipTeacherId !== 'all' && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExportAllTeacherSlipsPDF}
                  disabled={teacherSlipsLoading}
                  sx={{ borderColor: theme.BORDER, color: theme.ACCENT }}
                >
                  Download All (2x2 Grid)
                </Button>
              )}
            </div>
          </div>

          {/* Slips preview container */}
          <div id="printable-slips-area" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '4px' }}>
            {selectedSlipTeacherId === 'all' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {getActiveTeacherIds().map(tId => renderSlipPreview(tId))}
              </div>
            ) : typeof selectedSlipTeacherId === 'number' ? (
              renderSlipPreview(selectedSlipTeacherId)
            ) : getActiveTeacherIds().length > 0 ? (
              renderSlipPreview(getActiveTeacherIds()[0])
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: theme.TEXT_SECONDARY }}>
                No teacher assignments found.
              </div>
            )}
          </div>
        </DialogContent>

        <DialogActions style={{ padding: '10px 20px', borderTop: `1px solid ${theme.BORDER}` }}>
          <Button onClick={() => setSlipsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-slips-area, #printable-slips-area * {
            visibility: visible !important;
          }
          #printable-slips-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 4mm !important;
            margin: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8mm !important;
          }
          .minimal-slip-card {
            border: 1px dashed #333 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            padding: 8px 12px !important;
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>
    </Container>
  );
};

export default TimeTableManager;
