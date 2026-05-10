import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import DottedLoader from '../shared/DottedLoader';
import {
  CheckCircle,
  Cancel,
  CalendarMonth,
  AccessTime,
  HourglassEmpty,
  Warning,
  Group,
  WhatsApp,
  AccountCircle,
  FileDownloadOutlined as ExportIcon,
  KeyboardArrowUpRounded as ChevronDownIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { supabase } from '../../../../supabaseClient';
import { useToast } from '../../../../components/useToast';
import { getStudentDisplayId } from '../../../../utils/studentUtils';
import { formatAppDate } from '../../../../utils/dateUtils';
import { whatsappSemiAutoService } from '../../../../services/whatsappSemiAuto';
import { STATUS_OPTIONS, DELETE_OPTION } from '../../constants';
import { getStatus } from '../../utils/dashboardUtils';

import { clayCardStyle, isDark, CARD_RADIUS_LG, getDashboardPalette } from '../../../../styles/DesignSystem';

// ===== STYLED COMPONENTS (Matching FeeAnalytics structure) =====

// Inline action button for manual mark absences
const ManualMarkRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.25rem 0.25rem 0.75rem 0.25rem;
`;

const ManualMarkBtn = styled.button`
  padding: 0.55rem 1rem;
  border-radius: 6px;
  border: 1px solid #3b82f6;
  background: #3b82f6;
  color: #fff;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

const StatCard = styled.div<{ $accent?: string }>`
  ${clayCardStyle}
  padding: 1rem 1.1rem;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  @media (max-width: 600px) { padding: 0.85rem; border-radius: ${CARD_RADIUS_LG}; }
`;

const HalfLeaveStatCard = styled(StatCard)`
  @media (max-width: 600px) {
    grid-column: 1 / -1;
  }
`;

/* Row: icon badge + percent chip */
const StatTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

/* Icon — clay bubble: white/opaque circle with accent glow */
const StatIconBadge = styled.div<{ $accent: string }>`
  width: 34px; height: 34px;
  border-radius: 12px;
  color: ${({ $accent }) => $accent};
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  /* Clay bubble bg: semi-transparent accent to add a tiny hint of color */
  background: ${({ theme, $accent }) =>
    isDark(theme)
      ? `${$accent}18`
      : `${$accent}15`
  };
  /* Neutral subtle shadow, no glow */
  box-shadow: ${({ theme }) =>
    isDark(theme)
      ? '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 3px rgba(255,255,255,0.08)'
      : '0 2px 6px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.9)'
  };
  border: 1px solid ${({ theme, $accent }) =>
    isDark(theme) ? `${$accent}25` : `${$accent}15`
  };
  svg {
    font-size: 1rem !important;
  }
`;

/* Percentage chip — solid filled accent pill for contrast over tinted card */
const StatChip = styled.span<{ $accent: string }>`
  font-size: 0.67rem;
  font-weight: 700;
  /* Solid accent fill so it pops against the pastel card */
  color: #fff;
  background: ${({ $accent }) => $accent};
  padding: 2px 7px;
  border-radius: 20px;
  letter-spacing: 0.2px;
  /* No glow — clean flat accent fill */
  box-shadow: none;
`;

const StatLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  /* Slightly more opaque in light for readability over pastel bg */
  color: ${({ theme }) => isDark(theme) ? theme.TEXT_SECONDARY : 'rgba(30,30,60,0.55)'};
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  /* In claymorphism use a darker tone of the accent group or straight primary */
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1;
  letter-spacing: -0.5px;

  @media (max-width: 600px) { font-size: 1.3rem; }
`;

const StatOf = styled.span`
  font-size: 0.67rem;
  font-weight: 400;
  color: ${({ theme }) => isDark(theme) ? theme.TEXT_SECONDARY : 'rgba(30,30,60,0.45)'};
  margin-left: 3px;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

/* Neutral clay panel + subtle shiny blue pop */
const ContentCard = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 1.5rem;
  
  @media (max-width: 768px) {
    padding: 1.1rem;
    border-radius: ${CARD_RADIUS_LG};
  }
`;

/* Card title with clay icon bubble */
const CardTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 0.875rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.1px;

  /* Clay bubble around the leading icon */
  svg:first-child {
    background: ${({ theme }) =>
      isDark(theme) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.85)'
    };
    border-radius: 8px;
    padding: 3px;
    box-shadow: ${({ theme }) =>
      isDark(theme)
        ? 'inset 0 1px 3px rgba(255,255,255,0.07)'
        : 'inset 0 1px 3px rgba(255,255,255,0.9)'
    };
    color: #6366f1;
    font-size: 1.1rem !important;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.75rem 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
  gap: 0.4rem;
  font-size: 0.875rem;
`;

// Additional styled components for charts summary
const ChartSummary = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.25rem;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: ${({ theme }) =>
    isDark(theme)
      ? '1px solid rgba(99,102,241,0.12)'
      : '1px solid rgba(99,102,241,0.09)'
  };
  flex-wrap: wrap;
`;

const ChartSummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ChartSummaryLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChartSummaryValue = styled.div<{ color?: string }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.TEXT_PRIMARY};
`;

const Container = styled.div`
  display: contents;
`;

// Floating action button for quick manual absents (bottom-right)
const FloatingFab = styled.button`
  position: fixed;
  bottom: 60px;
  @media (max-width: 600px) {
    bottom: 40px;
  }
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: coral;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
  cursor: pointer;
  z-index: 9999;
  transition: opacity 0.2s ease;
  &:hover { opacity: 0.92; }
`;

// Portal-based floating FAB to ensure stickiness to viewport
const FloatingFabPortal = ({ onClick, disabled, children, ariaLabel, title }: { onClick: () => void; disabled?: boolean; children?: React.ReactNode; ariaLabel?: string; title?: string }) => {
  return ReactDOM.createPortal(
    <FloatingFab onClick={onClick} disabled={disabled} aria-label={ariaLabel} title={title}>
      {children ?? <span>A</span>}
    </FloatingFab>,
    document.body
  );
};

// Keep existing styled components for absentees functionality
import {
  TwoColumnGrid,
  RightColumn,
  AbsentsTableWrapper,
  AbsentsTableHeader,
  AbsentsHeaderTitleRow,
  AbsentsHeaderTitle,
  AbsentsControls,
  DateInput,
  WhatsAppButton,
  ExportButton,
  ExportDropdown,
  ExportDropdownItem,
  ExpandIcon,
  AbsentsCollapsibleContent,
  AbsenteesGrid,
  CompactAnimatedAbsenteeCard,
  StudentAvatar,
  AbsenteeCardContent,
  AbsenteeRow,
  AbsenteeId,
  AbsenteeName,
  AbsenteeFather,
  Dot,
  StatusPill,
  StatusDropdown,
  StatusOption,
  AbsenteesDesktopTable,
  AbsenteesTableHeader,
  AbsenteesTableHeaderCell,
  AbsenteesTableRow,
  AbsenteesTableCell,
  AbsenteesTableAvatar,
  AbsenteesTableStatusPill,
  AbsenteesStatsRow,
  ConsecutiveAbsentTableContainer,
  ConsecutiveAbsentTable,
  ConsecutiveAbsentTableHeader,
  ConsecutiveAbsentTableHeaderCell,
  ConsecutiveAbsentTableBody,
  ConsecutiveAbsentTableRow,
  ConsecutiveAbsentTableCell,
  ConsecutiveDaysBadge,
  ConsecutiveAbsentGrid,
  ConsecutiveAbsentMobileCard,
  ConsecutiveAbsentCardContent,
  ConsecutiveAbsentRow,
  ConsecutiveAbsentId,
  ConsecutiveAbsentName,
  ConsecutiveAbsentClass,
  ConsecutiveAbsentDaysContainer
} from '../../styles';

interface AttendanceTabProps {
  // Attendance stats
  presentToday: number;
  absentToday: number;
  leaveToday: number;
  lateToday: number;
  halfLeaveCount: number;
  presentPercent: number;
  absentPercent: number;
  leavePercent: number;
  latePercent: number;
  halfLeavePercent: number;
  attendanceStatsLoading?: boolean;

  // Charts data
  attendanceChartsLoading: boolean;
  attendanceTrendData: any[];
  classAttendanceData: any[];
  todayAttendanceRate: number;
  weekAvgAttendanceRate: number;

  // Consecutive absent
  consecutiveAbsentLoading: boolean;
  consecutiveAbsentStudents: any[];

  // Absentees
  dashboardDate: string;
  absentDate: string;
  setAbsentDate: (date: string) => void;
  isAbsenteesExpanded: boolean;
  setIsAbsenteesExpanded: (expanded: boolean) => void;
  absentees: any[];
  studentDetails: Record<string, any>;
  attendanceDataForDate: any[];
  whatsappProcessing: boolean;
  setWhatsappProcessing: (processing: boolean) => void;
  setShowWhatsAppSender: (show: boolean) => void;
  setWhatsappNotificationData: (data: any[]) => void;
  exportAbsentLoading: boolean;
  exportPresentLoading: boolean;
  exportAbsenteesPDF: () => void;
  exportPresentStudentsPDF: () => void;
  exportConsecutiveAbsentPDF: () => void;
  showExportDropdown: boolean;
  setShowExportDropdown: (show: boolean) => void;
  exportDropdownRef: React.RefObject<HTMLButtonElement>;
  dropdownIdx: number | null;
  setDropdownIdx: (idx: number | null) => void;
  dropdownPos: { top: number; left: number } | null;
  setDropdownPos: (pos: { top: number; left: number } | null) => void;
  dropdownDirection: 'up' | 'down';
  setDropdownDirection: (dir: 'up' | 'down') => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  hoveredAvatar: { url: string; x: number; y: number } | null;
  setHoveredAvatar: (avatar: { url: string; x: number; y: number } | null) => void;
  setAbsentees: React.Dispatch<React.SetStateAction<any[]>>;
  setAttendanceDataForDate: React.Dispatch<React.SetStateAction<any[]>>;
  user: any;
  schoolName: string | null;
  hasRightCards: boolean;
  showAbsentees: boolean;
  isMobile: boolean;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({
  presentToday,
  absentToday,
  leaveToday,
  lateToday,
  halfLeaveCount,
  presentPercent,
  absentPercent,
  leavePercent,
  latePercent,
  halfLeavePercent,
  attendanceStatsLoading = false,
  attendanceChartsLoading,
  attendanceTrendData,
  classAttendanceData,
  todayAttendanceRate,
  weekAvgAttendanceRate,
  consecutiveAbsentLoading,
  consecutiveAbsentStudents,
  dashboardDate,
  absentDate,
  setAbsentDate,
  isAbsenteesExpanded,
  setIsAbsenteesExpanded,
  absentees,
  studentDetails,
  attendanceDataForDate,
  whatsappProcessing,
  setWhatsappProcessing,
  setShowWhatsAppSender,
  setWhatsappNotificationData,
  exportAbsentLoading,
  exportPresentLoading,
  exportAbsenteesPDF,
  exportPresentStudentsPDF,
  exportConsecutiveAbsentPDF,
  showExportDropdown,
  setShowExportDropdown,
  exportDropdownRef,
  dropdownIdx,
  setDropdownIdx,
  dropdownPos,
  setDropdownPos,
  dropdownDirection,
  setDropdownDirection,
  dropdownRef,
  hoveredAvatar,
  setHoveredAvatar,
  setAbsentees,
  setAttendanceDataForDate,
  user,
  schoolName,
  hasRightCards,
  showAbsentees,
  isMobile
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const dashboardPalette = getDashboardPalette(theme as any);
  const statusPalette = dashboardPalette.status;
  const isDarkTheme = isDark(theme as any);

  // Manual mark button state and handler for this tab
  const [manualMarkInProgress, setManualMarkInProgress] = useState(false);
  const triggerManualAbsentMarkTab = async () => {
    if (!user?.school_id) return;
    // Client-side Sunday guard
    const dateObj = new Date(dashboardDate);
    const isSunday = dateObj.getDay() === 0;
    if (isSunday) {
      toast.showToast('Cannot mark absents on Sundays.', 'warning');
      return;
    }
    setManualMarkInProgress(true);
    try {
      const { data, error } = await supabase.rpc('trigger_attendance_automation', {
        p_school_id: user.school_id,
        p_date: dashboardDate,
      });
      if (error) throw error;
      if (data?.status === 'ok') {
        toast.showToast(data?.message ?? 'Manual absence marking completed', 'success');
        // Trigger a refresh of attendance data in the parent Dashboard
        window.dispatchEvent(new CustomEvent('attendance-automation-triggered'));
      } else if (data?.status === 'skipped') {
        toast.showToast(data?.message ?? 'Manual absence marking skipped', 'warning');
      } else {
        toast.showToast(data?.message ?? 'Manual absence marking completed', 'success');
        window.dispatchEvent(new CustomEvent('attendance-automation-triggered'));
      }
    } catch (err: any) {
      const status = (err && err.status) || (err?.response?.status);
      if (status === 404 || (err?.message || '').includes('trigger_attendance_automation')) {
        toast.showToast('Automation service is not configured on this environment', 'error');
      } else {
        console.error('Manual absence trigger failed:', err);
        toast.showToast('Failed to trigger manual absence marking', 'error');
      }
    } finally {
      setManualMarkInProgress(false);
    }
  };

  // Calculate total number of students
  const totalStudents = attendanceDataForDate.length;

  // UI insertion point: render a manual mark button above charts/stats
  // (we'll render this button in the top area within the main container by injecting JSX in render below)

  const applyAbsenteeStatusChange = async (absentee: any, nextStatus: string) => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData?.id) {
        toast.showToast('No active session found for this school', 'error');
        return;
      }

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({ status: nextStatus })
        .match({
          id: absentee.id,
          student_id: absentee.student_id,
          date: absentDate,
          session_id: sessionData.id,
          school_id: user.school_id
        });

      if (updateError) throw updateError;

      setAttendanceDataForDate(prev =>
        prev.map(record =>
          record.id === absentee.id || record.student_id === absentee.student_id
            ? { ...record, status: nextStatus }
            : record
        )
      );

      if (nextStatus === 'absent' || nextStatus === 'leave') {
        setAbsentees(prev => prev.map(a =>
          a.id === absentee.id
            ? { ...a, status: nextStatus }
            : a
        ));
      } else {
        setAbsentees(prev => prev.filter(a => a.id !== absentee.id));
      }

      toast.showToast('Status updated successfully', 'success');
    } catch (err) {
      toast.showToast('Failed to update status', 'error');
    } finally {
      setDropdownIdx(null);
    }
  };

  const deleteAbsenteeRecord = async (absentee: any) => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData?.id) {
        toast.showToast('No active session found for this school', 'error');
        return;
      }

      const { error: deleteError } = await supabase
        .from('attendance_records')
        .delete()
        .match({
          id: absentee.id,
          student_id: absentee.student_id,
          date: absentDate,
          session_id: sessionData.id,
          school_id: user.school_id
        });

      if (deleteError) throw deleteError;

      setAbsentees(prev => prev.filter(a => a.id !== absentee.id));
      setAttendanceDataForDate(prev => prev.filter(r => r.student_id !== absentee.student_id));

      toast.showToast('Attendance record deleted', 'success');
    } catch (err) {
      toast.showToast('Failed to delete record', 'error');
    } finally {
      setDropdownIdx(null);
    }
  };

  return (
    <Container>
      {/* Floating FAB is rendered via portal to ensure it stays fixed to viewport */}
      <FloatingFabPortal onClick={triggerManualAbsentMarkTab} ariaLabel="Mark Absents Now" title="Mark Absents Now" disabled={manualMarkInProgress}>
        <span style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>A</span>
      </FloatingFabPortal>
      {/* Attendance Stats Cards */}
      <StatsGrid>
        {/* Present */}
        <StatCard $accent={statusPalette.success}>
          <StatTopRow>
            <StatIconBadge $accent={statusPalette.success}><CheckCircle /></StatIconBadge>
            {attendanceStatsLoading ? <DottedLoader size={0.55} /> : <StatChip $accent={statusPalette.success}>{presentPercent}%</StatChip>}
          </StatTopRow>
          <StatLabel>Present</StatLabel>
          <StatValue>
            {attendanceStatsLoading ? <DottedLoader /> : <>{presentToday}<StatOf>/ {totalStudents}</StatOf></>}
          </StatValue>
        </StatCard>

        {/* Absent */}
        <StatCard $accent={statusPalette.danger}>
          <StatTopRow>
            <StatIconBadge $accent={statusPalette.danger}><Cancel /></StatIconBadge>
            {attendanceStatsLoading ? <DottedLoader size={0.55} /> : <StatChip $accent={statusPalette.danger}>{absentPercent}%</StatChip>}
          </StatTopRow>
          <StatLabel>Absent</StatLabel>
          <StatValue>
            {attendanceStatsLoading ? <DottedLoader /> : <>{absentToday}<StatOf>/ {totalStudents}</StatOf></>}
          </StatValue>
        </StatCard>

        {/* Leave */}
        <StatCard $accent={statusPalette.info}>
          <StatTopRow>
            <StatIconBadge $accent={statusPalette.info}><CalendarMonth /></StatIconBadge>
            {attendanceStatsLoading ? <DottedLoader size={0.55} /> : <StatChip $accent={statusPalette.info}>{leavePercent}%</StatChip>}
          </StatTopRow>
          <StatLabel>Leave</StatLabel>
          <StatValue>
            {attendanceStatsLoading ? <DottedLoader /> : <>{leaveToday}<StatOf>/ {totalStudents}</StatOf></>}
          </StatValue>
        </StatCard>

        {/* Late */}
        <StatCard $accent={statusPalette.warning}>
          <StatTopRow>
            <StatIconBadge $accent={statusPalette.warning}><AccessTime /></StatIconBadge>
            {attendanceStatsLoading ? <DottedLoader size={0.55} /> : <StatChip $accent={statusPalette.warning}>{latePercent}%</StatChip>}
          </StatTopRow>
          <StatLabel>Late</StatLabel>
          <StatValue>
            {attendanceStatsLoading ? <DottedLoader /> : <>{lateToday}<StatOf>/ {totalStudents}</StatOf></>}
          </StatValue>
        </StatCard>

        {/* Half Leave */}
        <HalfLeaveStatCard $accent={statusPalette.violet}>
          <StatTopRow>
            <StatIconBadge $accent={statusPalette.violet}><HourglassEmpty /></StatIconBadge>
            {attendanceStatsLoading ? <DottedLoader size={0.55} /> : <StatChip $accent={statusPalette.violet}>{halfLeavePercent}%</StatChip>}
          </StatTopRow>
          <StatLabel>Half Leave</StatLabel>
          <StatValue>
            {attendanceStatsLoading ? <DottedLoader /> : <>{halfLeaveCount}<StatOf>/ {totalStudents}</StatOf></>}
          </StatValue>
        </HalfLeaveStatCard>
      </StatsGrid>

      {/* Attendance Charts */}
      <ContentGrid theme={theme}>
        {/* Attendance Trend Chart */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <CheckCircle style={{ fontSize: '1.1rem' }} />
            Attendance Trend
          </CardTitle>
          {attendanceChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : attendanceTrendData.length === 0 ? (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No attendance data available</div>
            </EmptyState>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={dashboardPalette.chartGrid}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: dashboardPalette.chartTick, fontSize: 11 }}
                    tickLine={{ stroke: dashboardPalette.chartAxis }}
                    axisLine={{ stroke: dashboardPalette.chartAxis }}
                  />
                  <YAxis
                    tick={{ fill: dashboardPalette.chartTick, fontSize: 11 }}
                    tickLine={{ stroke: dashboardPalette.chartAxis }}
                    axisLine={{ stroke: dashboardPalette.chartAxis }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: dashboardPalette.tooltipBg,
                      border: `1px solid ${dashboardPalette.tooltipBorder}`,
                      borderRadius: '8px',
                      color: dashboardPalette.tooltipText,
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                    labelFormatter={(label, payload) => {
                      const data = payload && payload[0]?.payload;
                      const dayOfWeek = data?.dayOfWeek || '';
                      return dayOfWeek ? `${dayOfWeek}, ${label}` : `Date: ${label}`;
                    }}
                    formatter={(value: any, name: string, props: any) => {
                      const data = props.payload;
                      // Calculate total students: present + absent + leave + late
                      const total = (data?.present || 0) + (data?.absent || 0) + (data?.leave || 0) + (data?.late || 0);
                      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                      return [`${value} (${percentage}%)`, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="presentWithLate"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Present"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Absent"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leave"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Leave"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="late"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Late"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </ContentCard>

        {/* Class Attendance Chart */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <Group style={{ fontSize: '1.1rem' }} />
            Class Attendance (Today)
          </CardTitle>
          {attendanceChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={classAttendanceData}
                  stackOffset="expand"
                  margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={dashboardPalette.chartGrid}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="class"
                    tick={{ fill: dashboardPalette.chartTick, fontSize: 11 }}
                    tickLine={{ stroke: dashboardPalette.chartAxis }}
                    axisLine={{ stroke: dashboardPalette.chartAxis }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: dashboardPalette.chartTick, fontSize: 11 }}
                    tickLine={{ stroke: dashboardPalette.chartAxis }}
                    axisLine={{ stroke: dashboardPalette.chartAxis }}
                    tickFormatter={(value) => `${Math.round(value * 100)}%`}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#1e293b',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                    formatter={(value: any, name: string, props: any) => {
                      const className = props.payload?.class;
                      const data = classAttendanceData.find(d => d.class === className);
                      if (!data) return [value, name];
                      const count = name === 'Present' ? data.present :
                        name === 'Absent' ? data.absent :
                          name === 'Leave' ? data.leave : data.late;
                      return [count, name];
                    }}
                    labelFormatter={(label) => `Class: ${label}`}
                  />
                  <Bar
                    dataKey="present"
                    stackId="a"
                    fill="#22c55e"
                    name="Present"
                  />
                  <Bar
                    dataKey="late"
                    stackId="a"
                    fill="#f59e0b"
                    name="Late"
                  />
                  <Bar
                    dataKey="leave"
                    stackId="a"
                    fill="#3b82f6"
                    name="Leave"
                  />
                  <Bar
                    dataKey="absent"
                    stackId="a"
                    fill="#ef4444"
                    name="Absent"
                  />
                </BarChart>
              </ResponsiveContainer>
              <ChartSummary theme={theme}>
                <ChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '2px' }} />
                    <ChartSummaryLabel theme={theme}>Present</ChartSummaryLabel>
                  </div>
                </ChartSummaryItem>
                <ChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
                    <ChartSummaryLabel theme={theme}>Late</ChartSummaryLabel>
                  </div>
                </ChartSummaryItem>
                <ChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }} />
                    <ChartSummaryLabel theme={theme}>Leave</ChartSummaryLabel>
                  </div>
                </ChartSummaryItem>
                <ChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                    <ChartSummaryLabel theme={theme}>Absent</ChartSummaryLabel>
                  </div>
                </ChartSummaryItem>
              </ChartSummary>
            </>
          )}
        </ContentCard>
      </ContentGrid>

      {/* Consecutive Absent Students Card — only when there are students */}
      {consecutiveAbsentStudents.length > 0 && (
      <ContentGrid theme={theme}>
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <Warning style={{ fontSize: '1.1rem' }} />
              Consecutive Absent Students
            </div>
              <ExportButton
              onClick={exportConsecutiveAbsentPDF}
              disabled={exportAbsentLoading}
              title="Export to PDF"
              >
                <span style={{ fontWeight: 900, fontSize: '1rem', color: '#fff' }}>A</span>
                {exportAbsentLoading ? 'Exporting...' : 'Export PDF'}
            </ExportButton>
          </CardTitle>
          <>
              {/* Mobile Card View */}
              <ConsecutiveAbsentGrid>
                {consecutiveAbsentStudents.map((student, index) => (
                  <ConsecutiveAbsentMobileCard key={`${student.student_id}-${index}`} $index={index}>
                    <StudentAvatar>
                      {student.picture_url ? (
                        <img
                          src={student.picture_url}
                          alt={student.student_name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextSibling) {
                              (target.nextSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div style={{ display: student.picture_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        {student.student_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    </StudentAvatar>
                    <ConsecutiveAbsentCardContent>
                      <ConsecutiveAbsentRow>
                        <ConsecutiveAbsentId>
                          {getStudentDisplayId({ id: student.student_id, roll_number: student.roll_number })}
                        </ConsecutiveAbsentId>
                        <Dot />
                        <ConsecutiveAbsentName>{student.student_name}</ConsecutiveAbsentName>
                        {student.father_name && (
                          <>
                            <Dot />
                            <AbsenteeFather>{student.father_name}</AbsenteeFather>
                          </>
                        )}
                      </ConsecutiveAbsentRow>
                      <ConsecutiveAbsentRow style={{ fontSize: '0.82rem', color: dashboardPalette.subtleText }}>
                        <span>
                          {student.class_name}
                          {student.section_name && ` (${student.section_name})`}
                        </span>
                        {student.mobile && (
                          <>
                            <Dot />
                            <span>{student.mobile}</span>
                          </>
                        )}
                      </ConsecutiveAbsentRow>
                    </ConsecutiveAbsentCardContent>
                    <ConsecutiveAbsentDaysContainer>
                      <ConsecutiveDaysBadge days={student.consecutive_days}>
                        {student.consecutive_days} {student.consecutive_days === 1 ? 'day' : 'days'}
                      </ConsecutiveDaysBadge>
                    </ConsecutiveAbsentDaysContainer>
                  </ConsecutiveAbsentMobileCard>
                ))}
              </ConsecutiveAbsentGrid>

              {/* Desktop Table View */}
              <ConsecutiveAbsentTableContainer>
                <ConsecutiveAbsentTable>
                  <ConsecutiveAbsentTableHeader>
                    <ConsecutiveAbsentTableHeaderCell>ID</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Student Name</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Father Name</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Mobile</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Class</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell style={{ textAlign: 'center' }}>Consecutive Days</ConsecutiveAbsentTableHeaderCell>
                  </ConsecutiveAbsentTableHeader>
                  <ConsecutiveAbsentTableBody>
                    {consecutiveAbsentStudents.map((student, index) => (
                      <ConsecutiveAbsentTableRow key={`${student.student_id}-${index}`}>
                        <ConsecutiveAbsentTableCell>
                          {getStudentDisplayId({ id: student.student_id, roll_number: student.roll_number })}
                        </ConsecutiveAbsentTableCell>
                        <ConsecutiveAbsentTableCell>{student.student_name}</ConsecutiveAbsentTableCell>
                        <ConsecutiveAbsentTableCell>{student.father_name || '-'}</ConsecutiveAbsentTableCell>
                        <ConsecutiveAbsentTableCell>{student.mobile || '-'}</ConsecutiveAbsentTableCell>
                        <ConsecutiveAbsentTableCell>
                          {student.class_name}
                          {student.section_name && ` (${student.section_name})`}
                        </ConsecutiveAbsentTableCell>
                        <ConsecutiveAbsentTableCell style={{ textAlign: 'center' }}>
                          <ConsecutiveDaysBadge days={student.consecutive_days}>
                            {student.consecutive_days} {student.consecutive_days === 1 ? 'day' : 'days'}
                          </ConsecutiveDaysBadge>
                        </ConsecutiveAbsentTableCell>
                      </ConsecutiveAbsentTableRow>
                    ))}
                  </ConsecutiveAbsentTableBody>
                </ConsecutiveAbsentTable>
              </ConsecutiveAbsentTableContainer>
          </>
        </ContentCard>
      </ContentGrid>
      )}

      {/* Main Content */}
      <ContentGrid theme={theme}>
        {showAbsentees && absentees.length > 0 && (
          <ContentCard theme={theme}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => setIsAbsenteesExpanded(!isAbsenteesExpanded)}>
              <CardTitle theme={theme} style={{ margin: 0 }}>
                Today's Absentees
              </CardTitle>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
                <WhatsAppButton
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (whatsappProcessing || absentees.length === 0) return;

                    setWhatsappProcessing(true);
                    try {
                      let lateRecords: { student_id: number; status: string; date: string; remarks?: string }[] = [];
                      if (user?.school_id) {
                        const { data: sessionData, error: sessionError } = await supabase
                          .from('sessions')
                          .select('id')
                          .eq('is_active', true)
                          .eq('school_id', user.school_id)
                          .single();

                        if (!sessionError && sessionData?.id) {
                          const { data: lateData, error: lateError } = await supabase
                            .from('attendance_records')
                            .select('student_id, status, date, remarks')
                            .eq('date', absentDate)
                            .eq('session_id', sessionData.id)
                            .eq('school_id', user.school_id)
                            .eq('status', 'late');

                          if (!lateError && lateData) {
                            lateRecords = lateData as any;
                          }
                        }
                      }

                      const attendanceForNotify = [
                        ...absentees.map(a => ({
                          id: a.student_id,
                          status: a.status,
                          date: absentDate,
                          remarks: a.remarks
                        })),
                        ...lateRecords.map(l => ({
                          id: l.student_id,
                          status: l.status,
                          date: l.date || absentDate,
                          remarks: l.remarks
                        }))
                      ];

                      const seen = new Set<number>();
                      const uniqueAttendance = attendanceForNotify.filter(entry => {
                        if (seen.has(entry.id)) return false;
                        seen.add(entry.id);
                        return true;
                      });

                      const notificationData = await whatsappSemiAutoService.prepareAttendanceNotifications(
                        uniqueAttendance,
                        user?.school_id!,
                        schoolName || 'School',
                        'All Classes',
                        undefined
                      );

                      if (notificationData.length > 0) {
                        setWhatsappNotificationData(notificationData);
                        setShowWhatsAppSender(true);
                        toast.showToast(`Prepared ${notificationData.length} notifications`, 'success');
                      } else {
                        toast.showToast('No students with phone numbers found', 'success');
                      }
                    } catch (error) {
                      toast.showToast('Failed to prepare notifications', 'error');
                    } finally {
                      setWhatsappProcessing(false);
                    }
                  }}
                  disabled={whatsappProcessing || absentees.length === 0}
                  style={{
                    opacity: (whatsappProcessing || absentees.length === 0) ? 0.5 : 1,
                    cursor: (whatsappProcessing || absentees.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                  title="Send WhatsApp/SMS notifications to absent students"
                >
                  {whatsappProcessing ? (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #25d366',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  ) : (
                    <WhatsApp />
                  )}
                </WhatsAppButton>
                {isMobile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ExportButton
                      onClick={(e) => {
                        e.stopPropagation();
                        exportAbsenteesPDF();
                      }}
                      disabled={exportAbsentLoading}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)',
                        opacity: exportAbsentLoading ? 0.5 : 1
                      }}
                    >
                      A
                    </ExportButton>
                    <ExportButton
                      onClick={(e) => {
                        e.stopPropagation();
                        exportPresentStudentsPDF();
                      }}
                      disabled={exportPresentLoading}
                      style={{
                        background: 'rgba(34,197,94,0.1)',
                        color: '#16a34a',
                        border: '1px solid rgba(34,197,94,0.2)',
                        opacity: exportPresentLoading ? 0.5 : 1
                      }}
                    >
                      P
                    </ExportButton>
                  </div>
                ) : (
                  <ExportButton
                    ref={exportDropdownRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExportDropdown(!showExportDropdown);
                    }}
                  >
                    <ExportIcon fontSize="small" />
                    Export
                    <ExpandIcon $expanded={showExportDropdown} />
                    {showExportDropdown && (
                      <ExportDropdown>
                        <ExportDropdownItem
                          $type="absent"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportDropdown(false);
                            exportAbsenteesPDF();
                          }}
                        >
                          <ExportIcon fontSize="small" />
                          Absent Students
                        </ExportDropdownItem>
                        <ExportDropdownItem
                          $type="present"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportDropdown(false);
                            exportPresentStudentsPDF();
                          }}
                        >
                          <ExportIcon fontSize="small" />
                          Present Students
                        </ExportDropdownItem>
                      </ExportDropdown>
                    )}
                  </ExportButton>
                )}
                <ExpandIcon $expanded={isAbsenteesExpanded} />
              </div>
            </div>
            {isAbsenteesExpanded && (
              <div>
                <AbsenteesGrid>
                  {(() => {
                    const selectedDate = new Date(absentDate);
                    const isSunday = selectedDate.getDay() === 0;
                    const hasAttendanceRecords = attendanceDataForDate.length > 0;
                    const hasAbsentStudents = absentees.length > 0;

                    if (isSunday) {
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2rem',
                          textAlign: 'center',
                          color: dashboardPalette.subtleText,
                          minHeight: '200px'
                        }}>
                          <div style={{
                            marginBottom: '1rem',
                            color: '#6366f1',
                            opacity: 0.7
                          }}>
                            <CalendarMonth style={{ fontSize: '2.5rem', color: '#6366f1', opacity: 0.6, marginBottom: '0.75rem' }} />
                          </div>
                          <div style={{
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                            color: dashboardPalette.titleText
                          }}>
                            Sunday - No Classes
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            opacity: 0.8
                          }}>
                            School is closed on Sundays
                          </div>
                        </div>
                      );
                    }

                    if (!hasAttendanceRecords) {
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2rem',
                          textAlign: 'center',
                          color: dashboardPalette.subtleText,
                          minHeight: '200px'
                        }}>
                          <div style={{
                            marginBottom: '1rem',
                            color: '#6366f1',
                            opacity: 0.7
                          }}>
                            <HourglassEmpty style={{ fontSize: '2.5rem', color: '#6366f1', opacity: 0.6, marginBottom: '0.75rem' }} />
                          </div>
                          <div style={{
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                            color: dashboardPalette.titleText
                          }}>
                            No Attendance Records
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            opacity: 0.8
                          }}>
                            No attendance has been recorded for {formatAppDate(absentDate)}
                          </div>
                        </div>
                      );
                    }

                    if (!hasAbsentStudents) {
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2rem',
                          textAlign: 'center',
                          color: dashboardPalette.subtleText,
                          minHeight: '200px'
                        }}>
                          <div style={{
                            marginBottom: '1rem',
                            color: '#22c55e',
                            opacity: 0.7
                          }}>
                            <CheckCircle style={{ fontSize: '2.5rem', color: '#22c55e', opacity: 0.6, marginBottom: '0.75rem' }} />
                          </div>
                          <div style={{
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                            color: dashboardPalette.titleText
                          }}>
                            No Absent Students
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            opacity: 0.8
                          }}>
                            All students are present on {formatAppDate(absentDate)}
                          </div>
                        </div>
                      );
                    }

                    return absentees.map((absentee, globalIdx) => {
                      const student = studentDetails[absentee.student_id];
                      if (!student) return null;

                      return (
                        <CompactAnimatedAbsenteeCard key={absentee.id} $index={globalIdx}>
                          <StudentAvatar
                            onMouseEnter={(e) => {
                              if (student.picture_url) {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setHoveredAvatar({
                                  url: student.picture_url,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top
                                });
                              }
                            }}
                            onMouseLeave={() => setHoveredAvatar(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHoveredAvatar(null);
                              navigate(`/students/profile/${student.id}`);
                            }}
                            title={`View profile of ${student.name}`}
                            style={{ cursor: 'pointer' }}
                          >
                            {student.picture_url ? (
                              <img src={student.picture_url} alt={student.name} />
                            ) : (
                              <AccountCircle style={{ fontSize: '1.3em', color: '#b0b8d1' }} />
                            )}
                          </StudentAvatar>
                          <AbsenteeCardContent>
                            <AbsenteeRow>
                              <AbsenteeId>{getStudentDisplayId(student)}</AbsenteeId>
                              <Dot />
                              <AbsenteeName>{student.name}</AbsenteeName>
                              {student.father_name && (
                                <>
                                  <Dot />
                                  <AbsenteeFather>{student.father_name}</AbsenteeFather>
                                </>
                              )}
                            </AbsenteeRow>
                            <AbsenteeRow style={{ fontSize: '0.82rem', color: dashboardPalette.subtleText }}>
                              <span>{student.class_name}</span>
                              {student.section_name && (
                                <>
                                  <Dot />
                                  <span>{student.section_name}</span>
                                </>
                              )}
                              <Dot />
                              <span>{student.monthly_absences || 0} M.A</span>
                              <Dot />
                              <span>{student.monthly_leaves || 0} M.L</span>
                              <Dot />
                              <span style={{
                                color: student.attendance_percentage < 75 ? '#ef4444' :
                                  student.attendance_percentage < 85 ? '#eab308' : '#22c55e',
                                fontWeight: 600
                              }}>
                                {student.attendance_percentage || 0}%
                              </span>
                            </AbsenteeRow>
                          </AbsenteeCardContent>
                          <StatusPill
                            $status={absentee.status}
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.preventDefault();
                              e.stopPropagation();

                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const spaceAbove = rect.top;
                              setDropdownDirection(spaceBelow >= 180 || spaceBelow > spaceAbove ? 'down' : 'up');
                              setDropdownPos({ top: rect.top, left: rect.left });
                              setDropdownIdx(globalIdx);
                              return false;
                            }}
                          >
                            {absentee.status === 'absent' ? 'Absent' : 'Leave'}
                          </StatusPill>
                          {dropdownIdx === globalIdx && dropdownPos &&
                            ReactDOM.createPortal(
                              <StatusDropdown
                                ref={dropdownRef}
                                direction={dropdownDirection}
                                style={{
                                  position: 'fixed',
                                  left: dropdownPos.left,
                                  top: dropdownDirection === 'down' ? dropdownPos.top : undefined,
                                  bottom: dropdownDirection === 'up' ? window.innerHeight - dropdownPos.top : undefined,
                                }}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <StatusOption
                                    key={opt.value}
                                    type="button"
                                    color={opt.color}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();

                                      applyAbsenteeStatusChange(absentees[globalIdx], opt.value);
                                      return false;
                                    }}
                                  >
                                    {opt.label}
                                  </StatusOption>
                                ))}
                                <StatusOption
                                  type="button"
                                  color={DELETE_OPTION.color}
                                  separator
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    deleteAbsenteeRecord(absentees[globalIdx]);
                                    return false;
                                  }}
                                >
                                  {DELETE_OPTION.label}
                                </StatusOption>
                              </StatusDropdown>,
                              document.body
                            )}
                        </CompactAnimatedAbsenteeCard>
                      );
                    });
                  })()}
                </AbsenteesGrid>
                {/* Desktop Table View */}
                <AbsenteesDesktopTable>
                  {(() => {
                    const selectedDate = new Date(absentDate);
                    const isSunday = selectedDate.getDay() === 0;
                    const hasAttendanceRecords = attendanceDataForDate.length > 0;
                    const hasAbsentStudents = absentees.length > 0;

                    if (isSunday || !hasAttendanceRecords || !hasAbsentStudents) {
                      return null;
                    }

                    return (
                      <>
                        <AbsenteesTableHeader>
                          <AbsenteesTableHeaderCell></AbsenteesTableHeaderCell>
                          <AbsenteesTableHeaderCell>ID</AbsenteesTableHeaderCell>
                          <AbsenteesTableHeaderCell>Student Name</AbsenteesTableHeaderCell>
                          <AbsenteesTableHeaderCell>Father Name</AbsenteesTableHeaderCell>
                          <AbsenteesTableHeaderCell>Class</AbsenteesTableHeaderCell>
                          <AbsenteesTableHeaderCell>Absence This Month</AbsenteesTableHeaderCell>
                          <AbsenteesTableHeaderCell>Monthly Leave</AbsenteesTableHeaderCell>
                          <AbsenteesTableHeaderCell>Status</AbsenteesTableHeaderCell>
                        </AbsenteesTableHeader>
                        {absentees.map((absentee, globalIdx) => {
                          const student = studentDetails[absentee.student_id];
                          if (!student) return null;

                          return (
                            <AbsenteesTableRow key={absentee.id} $index={globalIdx}>
                              <AbsenteesTableCell>
                                <AbsenteesTableAvatar
                                  onMouseEnter={(e) => {
                                    if (student.picture_url) {
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                      setHoveredAvatar({
                                        url: student.picture_url,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top
                                      });
                                    }
                                  }}
                                  onMouseLeave={() => setHoveredAvatar(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHoveredAvatar(null);
                                    navigate(`/students/profile/${student.id}`);
                                  }}
                                  title={`View profile of ${student.name}`}
                                >
                                  {student.picture_url ? (
                                    <img src={student.picture_url} alt={student.name} />
                                  ) : (
                                    <AccountCircle style={{ fontSize: '1.5em', color: dashboardPalette.mutedText }} />
                                  )}
                                </AbsenteesTableAvatar>
                              </AbsenteesTableCell>
                              <AbsenteesTableCell>
                                <span style={{ color: isDarkTheme ? '#b0b8d1' : '#6366f1', fontWeight: 600 }}>
                                  {getStudentDisplayId({ id: student.id, roll_number: student.roll_number })}
                                </span>
                              </AbsenteesTableCell>
                              <AbsenteesTableCell style={{ fontWeight: 700 }}>
                                {student.name}
                              </AbsenteesTableCell>
                              <AbsenteesTableCell style={{ color: dashboardPalette.mutedText }}>
                                {student.father_name || '-'}
                              </AbsenteesTableCell>
                              <AbsenteesTableCell style={{ color: dashboardPalette.subtleText }}>
                                {student.class_name || '-'}{student.section_name ? ` (${student.section_name})` : ''}
                              </AbsenteesTableCell>
                              <AbsenteesTableCell style={{ color: dashboardPalette.subtleText }}>
                                {student.monthly_absences || 0}
                              </AbsenteesTableCell>
                              <AbsenteesTableCell style={{ color: dashboardPalette.subtleText }}>
                                {student.monthly_leaves || 0}
                              </AbsenteesTableCell>
                              <AbsenteesTableCell>
                                <AbsenteesTableStatusPill
                                  $status={absentee.status}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    setDropdownDirection(spaceBelow >= 180 || spaceBelow > spaceAbove ? 'down' : 'up');
                                    setDropdownPos({ top: rect.top, left: rect.left });
                                    setDropdownIdx(globalIdx);
                                    return false;
                                  }}
                                >
                                  {absentee.status === 'absent' ? 'Absent' : 'Leave'}
                                </AbsenteesTableStatusPill>
                                {dropdownIdx === globalIdx && dropdownPos &&
                                  ReactDOM.createPortal(
                                    <StatusDropdown
                                      ref={dropdownRef}
                                      direction={dropdownDirection}
                                      style={{
                                        position: 'fixed',
                                        left: dropdownPos.left,
                                        top: dropdownDirection === 'down' ? dropdownPos.top : undefined,
                                        bottom: dropdownDirection === 'up' ? window.innerHeight - dropdownPos.top : undefined,
                                      }}
                                    >
                                      {STATUS_OPTIONS.map(opt => (
                                        <StatusOption
                                          key={opt.value}
                                          type="button"
                                          color={opt.color}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            applyAbsenteeStatusChange(absentees[globalIdx], opt.value);
                                            return false;
                                          }}
                                        >
                                          {opt.label}
                                        </StatusOption>
                                      ))}
                                      <StatusOption
                                        type="button"
                                        color={DELETE_OPTION.color}
                                        separator
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();

                                          deleteAbsenteeRecord(absentees[globalIdx]);
                                          return false;
                                        }}
                                      >
                                        {DELETE_OPTION.label}
                                      </StatusOption>
                                    </StatusDropdown>,
                                    document.body
                                  )}
                              </AbsenteesTableCell>
                            </AbsenteesTableRow>
                          );
                        })}
                      </>
                    );
                  })()}
                </AbsenteesDesktopTable>

              </div>
            )}
          </ContentCard>
        )}
      </ContentGrid>
    </Container>
  );
};


export default AttendanceTab;
