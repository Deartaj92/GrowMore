import React, { useState, useEffect, useCallback, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import Loader from '../components/Loader';
import { ThemeContext } from '../components/Layout';
const isDark = (themeObj: any) => themeObj?.BG === '#252525' || themeObj?.BG === '#181c2a';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CalendarMonth as CalendarIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  People as PeopleIcon,
  CheckCircle as PresentIcon,
  Warning as LateIcon,
  Block as AbsentIcon,
  CancelScheduleSend as LeaveIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { format, getDaysInMonth, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.BG};
  padding: 1.5rem;
  padding-bottom: 3rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    padding-bottom: 2.5rem;
    gap: 0.75rem;
  }
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  border: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme) ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.05)'};
  flex-wrap: wrap;
  gap: 1rem;
`;

const TitleArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#fff'};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT} 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
  }
`;

const Subtitle = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#888'};
`;

const ControlsArea = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const MonthPickerContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const InputMonth = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  
  color-scheme: ${({ theme }) => isDark(theme) ? 'dark' : 'light'};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px ${({ theme }) => `${theme.ACCENT}30`};
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  &:disabled {
    background: ${({ theme }) => theme.BORDER || '#ccc'};
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
  width: 250px;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  width: 100%;
  
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const StatCard = styled.div<{ $borderColors?: string }>`
  background: ${({ theme }) => theme.CARD};
  padding: 1.25rem;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  border-left: 4px solid ${({ $borderColors, theme }) => $borderColors || theme.ACCENT};
  box-shadow: ${({ theme }) => isDark(theme) ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.02)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#888'};
  font-weight: 500;
`;

const StatValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#fff'};
`;

const StatIconContainer = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color }) => $color ? `${$color}15` : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ $color }) => $color || 'inherit'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const GridCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  border: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme) ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.05)'};
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
`;

const TableWrapper = styled.div`
  overflow: auto;
  max-height: 65vh;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
  position: relative;
  
  /* custom scrollbars */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
`;

const Th = styled.th<{ $stickyLeft?: boolean; $zIndex?: number }>`
  background: ${({ theme }) => isDark(theme) ? '#1f2433' : '#f8fafc'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.85rem 1rem;
  border-bottom: 2px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  border-right: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  text-align: center;
  
  position: sticky;
  top: 0;
  z-index: ${({ $zIndex }) => $zIndex || 2};
  
  ${({ $stickyLeft, theme }) => $stickyLeft && `
    position: sticky;
    left: 0;
    z-index: 3;
    background: ${isDark(theme) ? '#1e222f' : '#f1f5f9'};
    border-right: 2px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
    text-align: left;
    min-width: 130px;
  `}
`;

const Td = styled.td<{ $stickyLeft?: boolean; $isWeekend?: boolean }>`
  padding: 0.65rem 0.75rem;
  font-size: 0.85rem;
  border-bottom: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  border-right: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  text-align: center;
  background: ${({ $isWeekend, theme }) => 
    $isWeekend 
      ? (isDark(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)') 
      : theme.CARD};
  
  ${({ $stickyLeft, theme }) => $stickyLeft && `
    position: sticky;
    left: 0;
    z-index: 1;
    background: ${isDark(theme) ? '#1a1d29' : '#f8fafc'};
    border-right: 2px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
    text-align: left;
    font-weight: 600;
  `}
`;

const Tr = styled.tr`
  &:hover {
    td {
      background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'} !important;
    }
  }
`;

const StaffHeaderCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 140px;
`;

const StaffName = styled.span`
  font-weight: 600;
  font-size: 0.85rem;
`;

const StaffRole = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#aaa'};
  font-weight: 400;
`;

const DateCellText = styled.div`
  display: flex;
  flex-direction: column;
`;

const DateLabelText = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const DayOfWeekText = styled.span<{ $isWeekend?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $isWeekend, theme }) => $isWeekend ? '#ef4444' : theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const CellContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-height: 44px;
  justify-content: center;
`;

const StatusBadge = styled.span<{ $status: string }>`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  
  ${({ $status }) => {
    switch ($status.toLowerCase()) {
      case 'present':
        return 'background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2);';
      case 'late':
        return 'background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.2);';
      case 'half_day':
        return 'background: rgba(249, 115, 22, 0.15); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2);';
      case 'absent':
        return 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);';
      case 'leave':
        return 'background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2);';
      case 'holiday':
        return 'background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2);';
      default:
        return 'background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.2);';
    }
  }}
`;

const TimeText = styled.span<{ $type: 'in' | 'out'; $isMissing?: boolean }>`
  font-size: 0.75rem;
  font-family: monospace;
  font-weight: 500;
  color: ${({ $isMissing, $type, theme }) => 
    $isMissing 
      ? '#ef4444' 
      : (isDark(theme) ? '#e5e7eb' : '#374151')};

  & > strong {
    color: ${({ $type, theme }) => 
      $type === 'in' ? (isDark(theme) ? '#4ade80' : '#16a34a') : (isDark(theme) ? '#38bdf8' : '#0284c7')};
    font-weight: 600;
  }
`;

const ExpectedTimeText = styled.span`
  font-size: 0.65rem;
  font-family: monospace;
  color: ${({ theme }) => isDark(theme) ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'};
  font-weight: 400;
  letter-spacing: 0.01em;
`;

const EmptyText = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#888'};
  opacity: 0.5;
`;

const LegendContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const LegendColorBox = styled.span<{ $status: string }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  
  ${({ $status }) => {
    switch ($status.toLowerCase()) {
      case 'present': return 'background: #22c55e;';
      case 'late': return 'background: #eab308;';
      case 'half_day': return 'background: #f97316;';
      case 'absent': return 'background: #ef4444;';
      case 'leave': return 'background: #a855f7;';
      case 'holiday': return 'background: #3b82f6;';
      default: return 'background: #9ca3af;';
    }
  }}
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const StaffCheckInOutGrid: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return format(today, 'yyyy-MM');
  });
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceSettings, setAttendanceSettings] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Fetch active session
  useEffect(() => {
    const fetchSession = async () => {
      if (!user?.school_id) return;
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();
        if (data) {
          setSessionId(data.id);
        }
      } catch (err) {
        console.error('Error fetching active session:', err);
      }
    };
    fetchSession();
  }, [user?.school_id]);

  // Fetch staff and attendance records for selected month
  const fetchData = useCallback(async () => {
    if (!user?.school_id || !selectedMonth) return;
    
    setLoading(true);
    try {
      // 1. Fetch active staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role, attendance_enabled')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('name', { ascending: true });
        
      if (staffError) throw staffError;
      
      const filteredStaff = (staffData || []).filter((s: any) => s.attendance_enabled !== false);
      setStaffList(filteredStaff);
      
      // 2. Fetch monthly attendance records
      const year = parseInt(selectedMonth.split('-')[0], 10);
      const month = parseInt(selectedMonth.split('-')[1], 10);
      
      const startDateStr = `${selectedMonth}-01`;
      const daysCount = getDaysInMonth(new Date(year, month - 1, 1));
      const endDateStr = `${selectedMonth}-${String(daysCount).padStart(2, '0')}`;
      
      const { data: attData, error: attError } = await supabase
        .from('staff_attendance_records')
        .select('id, staff_id, date, status, check_in_time, check_out_time, expected_arrival_time, expected_departure_time, paid_leave, remarks')
        .eq('school_id', user.school_id)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
        
      if (attError) throw attError;
      setAttendanceRecords(attData || []);
      
      // 3. Fetch attendance settings fallback
      const { data: settingsData } = await supabase
        .from('attendance_settings')
        .select('staff_start_time, staff_end_time')
        .eq('school_id', user.school_id)
        .single();
        
      if (settingsData) {
        setAttendanceSettings(settingsData);
      }
      
    } catch (err: any) {
      toast.showToast(err.message || 'Failed to fetch attendance grid data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.school_id, selectedMonth, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get dates of selected month
  const monthDate = parseISO(`${selectedMonth}-01`);
  const daysInMonth = getDaysInMonth(monthDate);
  const datesArray = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const dateObj = parseISO(dateStr);
    return {
      dateStr,
      day,
      dayOfWeek: format(dateObj, 'EEE'),
      isWeekend: format(dateObj, 'i') === '6' || format(dateObj, '7') === '7', // Sat/Sun
    };
  });

  // Filter staff by search term
  const filteredStaffList = staffList.filter(
    (staff) =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.role && staff.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group attendance records by key: staff_id-date
  const attendanceMap = React.useMemo(() => {
    const map = new Map<string, any>();
    attendanceRecords.forEach((rec) => {
      map.set(`${rec.staff_id}-${rec.date}`, rec);
    });
    return map;
  }, [attendanceRecords]);

  // Format timestamp to hh:mm a
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    try {
      const parsed = new Date(timestamp);
      if (isNaN(parsed.getTime())) return null;
      return format(parsed, 'hh:mm a');
    } catch {
      return null;
    }
  };

  // Stats calculation
  const stats = React.useMemo(() => {
    const totalStaff = filteredStaffList.length;
    const totalRecords = attendanceRecords.length;
    
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    
    attendanceRecords.forEach((rec) => {
      const status = rec.status?.toLowerCase();
      if (status === 'present') presentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'leave') leaveCount++;
      else if (status === 'half_day') presentCount++; // Treat half day as present contribution
    });
    
    const totalPresentAndLate = presentCount + lateCount;
    const punctuality = totalPresentAndLate > 0 
      ? Math.round((presentCount / totalPresentAndLate) * 100) 
      : 100;

    return {
      totalStaff,
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      punctuality
    };
  }, [filteredStaffList, attendanceRecords]);

  // CSV export function
  const handleExportCSV = () => {
    if (filteredStaffList.length === 0) {
      toast.showToast('No staff data to export', 'error');
      return;
    }

    try {
      // Headers
      const headers = ['Date', 'Day', 'Expected Time', ...filteredStaffList.map(s => `${s.name} (${s.role || 'Staff'})`)];
      
      // Rows
      const csvRows = datesArray.map(d => {
        const anyRec = filteredStaffList
          .map(s => attendanceMap.get(`${s.id}-${d.dateStr}`))
          .find(r => r?.expected_arrival_time || r?.expected_departure_time);
        
        const expArr = anyRec?.expected_arrival_time || '-';
        const expDep = anyRec?.expected_departure_time || '-';
        const expectedTimeStr = (expArr !== '-' || expDep !== '-') ? `${expArr}-${expDep}` : '-';

        const rowData = [d.dateStr, d.dayOfWeek, expectedTimeStr];
        filteredStaffList.forEach(staff => {
          const rec = attendanceMap.get(`${staff.id}-${d.dateStr}`);
          if (rec) {
            const status = rec.status ? rec.status.toUpperCase() : 'NO STATUS';
            const checkIn = formatTime(rec.check_in_time) || '-';
            const checkOut = formatTime(rec.check_out_time) || '-';
            rowData.push(`${status} [In: ${checkIn} | Out: ${checkOut}]`);
          } else {
            rowData.push('-');
          }
        });
        return rowData.map(val => `"${val.replace(/"/g, '""')}"`).join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Staff_CheckInOut_Grid_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.showToast('CSV Exported successfully', 'success');
    } catch (err) {
      console.error(err);
      toast.showToast('Failed to export CSV', 'error');
    }
  };

  // PDF export function (minimal, print-friendly & professional)
  const handleExportPDF = () => {
    if (filteredStaffList.length === 0) {
      toast.showToast('No staff data to export', 'error');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Header title and details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Staff Daily Check In-Out Grid', 14, 15);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const monthLabel = format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy');
      doc.text(`Month: ${monthLabel}`, 14, 21);
      doc.text(`Total Staff: ${stats.totalStaff}`, 70, 21);
      doc.text(`Punctuality: ${stats.punctuality}%`, 110, 21);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, doc.internal.pageSize.getWidth() - 14, 21, { align: 'right' });

      // Columns: Date, Day, and each staff member
      const columns = ['Date / Day', ...filteredStaffList.map(s => `${s.name}\n(${s.role || 'Staff'})`)];

      // Rows
      const rows = datesArray.map(d => {
        const anyRec = filteredStaffList
          .map(s => attendanceMap.get(`${s.id}-${d.dateStr}`))
          .find(r => r?.expected_arrival_time || r?.expected_departure_time);
        
        const expArr = anyRec?.expected_arrival_time;
        const expDep = anyRec?.expected_departure_time;
        const expStr = (expArr || expDep) ? `\nExp: ${expArr || '?'} - ${expDep || '?'}` : '';

        const rowData = [
          `${format(parseISO(d.dateStr), 'dd MMM yyyy')}\n${d.dayOfWeek}${expStr}`
        ];
        filteredStaffList.forEach(staff => {
          const rec = attendanceMap.get(`${staff.id}-${d.dateStr}`);
          if (rec) {
            const status = rec.status ? rec.status.toUpperCase() : '-';
            const checkIn = formatTime(rec.check_in_time);
            const checkOut = formatTime(rec.check_out_time);
            if (['PRESENT', 'LATE', 'HALF_DAY'].includes(status)) {
              const inStr = checkIn ? checkIn : 'Missing';
              const outStr = checkOut ? checkOut : 'Missing';
              rowData.push(`${status}\nIn: ${inStr}\nOut: ${outStr}`);
            } else {
              rowData.push(status);
            }
          } else {
            rowData.push('-');
          }
        });
        return rowData;
      });

      // Call autoTable
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 25,
        styles: {
          fontSize: 6,
          cellPadding: 1,
          halign: 'center',
          valign: 'middle',
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 28 }
        },
        headStyles: {
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontSize: 6,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        willDrawCell: (data) => {
          if (data.column.index > 0 && data.section === 'body') {
            (data.cell as any).rawTextForCustomDraw = [...data.cell.text];
            data.cell.text = []; // Clear so autoTable doesn't draw it
          }
        },
        didDrawCell: (data) => {
          if (data.column.index > 0 && data.section === 'body') {
            const lines = (data.cell as any).rawTextForCustomDraw;
            if (!lines || lines.length === 0) return;
            const doc = data.doc as any;
            const x = data.cell.x + data.cell.width / 2;
            const fontSize = data.cell.styles.fontSize as number;
            doc.setFontSize(fontSize);
            // approximate line height in mm
            const lineHt = (fontSize * 1.15) * 0.352778;
            const totalHt = lineHt * lines.length;
            // vertically center
            let startY = data.cell.y + (data.cell.height - totalHt) / 2 + lineHt * 0.8;

            lines.forEach((line: string) => {
              if (line.includes('ABSENT')) {
                doc.setTextColor(220, 38, 38);
                doc.setFont('helvetica', 'bold');
              } else if (line.includes('LATE') || line.includes('HALF_DAY')) {
                doc.setTextColor(217, 119, 6);
                doc.setFont('helvetica', 'bold');
              } else if (line.includes('PRESENT')) {
                doc.setTextColor(22, 163, 74);
                doc.setFont('helvetica', 'bold');
              } else if (line.includes('LEAVE')) {
                doc.setTextColor(147, 51, 234);
                doc.setFont('helvetica', 'bold');
              } else if (line.includes('HOLIDAY')) {
                doc.setTextColor(37, 99, 235);
                doc.setFont('helvetica', 'bold');
              } else if (line.startsWith('In:')) {
                doc.setTextColor(22, 163, 74);
                doc.setFont('helvetica', 'normal');
              } else if (line.startsWith('Out:')) {
                doc.setTextColor(2, 132, 199);
                doc.setFont('helvetica', 'normal');
              } else if (line === '-') {
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
              } else {
                doc.setTextColor(50, 50, 50);
                doc.setFont('helvetica', 'normal');
              }
              doc.text(line, x, startY, { align: 'center' });
              startY += lineHt;
            });
          }
        }
      });

      doc.save(`Staff_CheckInOut_Grid_${selectedMonth}.pdf`);
      toast.showToast('PDF Exported successfully', 'success');
    } catch (err) {
      console.error(err);
      toast.showToast('Failed to export PDF', 'error');
    }
  };

  return (
    <PageContainer>
      <HeaderSection>
        <TitleArea>
          <Title>
            <CalendarIcon fontSize="large" style={{ color: '#8b5cf6', fill: 'url(#accent-grad)' }} />
            Staff Daily Check In-Out
          </Title>
          <Subtitle>Monthly matrix showing daily check-in, checkout, and attendance status</Subtitle>
        </TitleArea>
        
        <ControlsArea>
          <MonthPickerContainer>
            <Label>
              <CalendarIcon fontSize="small" />
              Month:
            </Label>
            <InputMonth
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </MonthPickerContainer>
          
          <SearchContainer>
            <SearchIcon fontSize="small" style={{ opacity: 0.7 }} />
            <SearchInput
              type="text"
              placeholder="Search staff or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>
          
          <ActionButton onClick={handleExportCSV} disabled={loading || staffList.length === 0}>
            <DownloadIcon fontSize="small" />
            Export CSV
          </ActionButton>

          <ActionButton onClick={handleExportPDF} disabled={loading || staffList.length === 0} style={{ background: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            <PdfIcon fontSize="small" />
            Export PDF
          </ActionButton>
        </ControlsArea>
      </HeaderSection>

      {/* Stats Cards */}
      <StatsGrid>
        <StatCard $borderColors="#8b5cf6">
          <StatInfo>
            <StatLabel>Total Staff</StatLabel>
            <StatValue>{stats.totalStaff}</StatValue>
          </StatInfo>
          <StatIconContainer $color="#8b5cf6">
            <PeopleIcon />
          </StatIconContainer>
        </StatCard>

        <StatCard $borderColors="#22c55e">
          <StatInfo>
            <StatLabel>On-Time Punctuality</StatLabel>
            <StatValue>{stats.punctuality}%</StatValue>
          </StatInfo>
          <StatIconContainer $color="#22c55e">
            <PresentIcon />
          </StatIconContainer>
        </StatCard>

        <StatCard $borderColors="#eab308">
          <StatInfo>
            <StatLabel>Late & Half-Days</StatLabel>
            <StatValue>{stats.lateCount}</StatValue>
          </StatInfo>
          <StatIconContainer $color="#eab308">
            <LateIcon />
          </StatIconContainer>
        </StatCard>

        <StatCard $borderColors="#ef4444">
          <StatInfo>
            <StatLabel>Total Absents</StatLabel>
            <StatValue>{stats.absentCount}</StatValue>
          </StatInfo>
          <StatIconContainer $color="#ef4444">
            <AbsentIcon />
          </StatIconContainer>
        </StatCard>
      </StatsGrid>

      {/* Main Grid Matrix Card */}
      <GridCard>
        {loading ? (
          <Loader />
        ) : filteredStaffList.length === 0 ? (
          <NoDataContainer>
            <PeopleIcon style={{ fontSize: 64, opacity: 0.3 }} />
            <h3>No Staff Members Found</h3>
            <p>Make sure staff members exist, status is active, and attendance is enabled.</p>
          </NoDataContainer>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th $stickyLeft $zIndex={4}>Date / Day</Th>
                    {filteredStaffList.map((staff) => (
                      <Th key={staff.id}>
                        <StaffHeaderCell>
                          <StaffName>{staff.name}</StaffName>
                          <StaffRole>{staff.role || 'Staff'}</StaffRole>
                        </StaffHeaderCell>
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datesArray.map((dateObj) => (
                    <Tr key={dateObj.dateStr}>
                      <Td $stickyLeft $isWeekend={dateObj.isWeekend}>
                        <DateCellText>
                          <DateLabelText>{format(parseISO(dateObj.dateStr), 'dd MMM yyyy')}</DateLabelText>
                          <DayOfWeekText $isWeekend={dateObj.isWeekend}>
                            {dateObj.dayOfWeek}
                          </DayOfWeekText>
                          {(() => {
                            const anyRec = filteredStaffList
                              .map(s => attendanceMap.get(`${s.id}-${dateObj.dateStr}`))
                              .find(r => r?.expected_arrival_time || r?.expected_departure_time);
                            
                            const expArr = anyRec?.expected_arrival_time;
                            const expDep = anyRec?.expected_departure_time;

                            return (expArr || expDep) ? (
                              <ExpectedTimeText>
                                Exp: {expArr || '?'} – {expDep || '?'}
                              </ExpectedTimeText>
                            ) : null;
                          })()}
                        </DateCellText>
                      </Td>
                      {filteredStaffList.map((staff) => {
                        const rec = attendanceMap.get(`${staff.id}-${dateObj.dateStr}`);
                        return (
                          <Td key={staff.id} $isWeekend={dateObj.isWeekend}>
                            <CellContent>
                              {rec ? (
                                <>
                                  <StatusBadge $status={rec.status}>
                                    {rec.status}
                                  </StatusBadge>
                                  
                                  {/* Render check-in / check-out if present, late, or half-day */}
                                  {['present', 'late', 'half_day'].includes(rec.status?.toLowerCase()) ? (
                                    <>
                                      <TimeText $type="in" $isMissing={!rec.check_in_time}>
                                        <strong>In:</strong> {formatTime(rec.check_in_time) || 'Missing'}
                                      </TimeText>
                                      <TimeText $type="out" $isMissing={!rec.check_out_time}>
                                        <strong>Out:</strong> {formatTime(rec.check_out_time) || 'Missing'}
                                      </TimeText>
                                    </>
                                  ) : null}
                                </>
                              ) : (
                                <EmptyText>-</EmptyText>
                              )}
                            </CellContent>
                          </Td>
                        );
                      })}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>

            {/* Color Legend */}
            <LegendContainer>
              <LegendItem>
                <LegendColorBox $status="present" /> Present
              </LegendItem>
              <LegendItem>
                <LegendColorBox $status="late" /> Late
              </LegendItem>
              <LegendItem>
                <LegendColorBox $status="half_day" /> Half Day
              </LegendItem>
              <LegendItem>
                <LegendColorBox $status="absent" /> Absent
              </LegendItem>
              <LegendItem>
                <LegendColorBox $status="leave" /> Leave
              </LegendItem>
              <LegendItem>
                <LegendColorBox $status="holiday" /> Holiday
              </LegendItem>
            </LegendContainer>
          </>
        )}
      </GridCard>
    </PageContainer>
  );
};

// Main Export wrapping with ThemeContext logic
export default function StaffCheckInOutGridPage() {
  const theme = useContext(ThemeContext);
  return (
    <ThemeProvider theme={theme || darkTheme}>
      <StaffCheckInOutGrid />
    </ThemeProvider>
  );
}
