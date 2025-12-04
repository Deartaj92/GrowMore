import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'styled-components';
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
  Refresh as RefreshIcon
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
  AreaChart
} from 'recharts';
import { supabase } from '../../../../supabaseClient';
import { useToast } from '../../../../components/useToast';
import { getStudentDisplayId } from '../../../../utils/studentUtils';
import { whatsappSemiAutoService } from '../../../../services/whatsappSemiAuto';
import {
  AttendanceStatsGrid,
  AttendanceStatCard,
  AttendanceStatTopRow,
  AttendanceStatIcon,
  AttendanceStatTitle,
  AttendanceStatRow,
  AttendanceStatValue,
  AttendanceStatRightInfo,
  AttendanceStatPercentage,
  AttendanceStatStatus,
  AttendanceChartsGrid,
  AttendanceChartCard,
  AttendanceChartHeader,
  AttendanceChartSummary,
  AttendanceChartSummaryItem,
  AttendanceChartSummaryLabel,
  AttendanceChartSummaryValue,
  ConsecutiveAbsentCard,
  ConsecutiveAbsentHeader,
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
  ConsecutiveAbsentDaysContainer,
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
  AbsenteesStatsRow
} from '../../styles';
import { STATUS_OPTIONS, DELETE_OPTION } from '../../constants';
import { getStatus } from '../../utils/dashboardUtils';

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
  const isDark = (theme as any).BG === '#252525' || (theme as any).BG === '#181c2a';
  
  // Calculate total number of students
  const totalStudents = attendanceDataForDate.length;

  return (
    <div>
      {/* Attendance Stats Cards */}
      <AttendanceStatsGrid>
        <AttendanceStatCard accentColor="#22c55e">
          <AttendanceStatTopRow>
            <AttendanceStatIcon color="#22c55e">
              <CheckCircle />
            </AttendanceStatIcon>
            <AttendanceStatTitle>Present</AttendanceStatTitle>
          </AttendanceStatTopRow>
          <AttendanceStatRow>
            <AttendanceStatValue>
              {attendanceStatsLoading ? <DottedLoader /> : (
                <>
                  {presentToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalStudents}</span>
                </>
              )}
            </AttendanceStatValue>
            <AttendanceStatRightInfo>
              <AttendanceStatPercentage color="#22c55e">
                {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${presentPercent}%`}
              </AttendanceStatPercentage>
            </AttendanceStatRightInfo>
          </AttendanceStatRow>
        </AttendanceStatCard>

        <AttendanceStatCard accentColor="#ef4444">
          <AttendanceStatTopRow>
            <AttendanceStatIcon color="#ef4444">
              <Cancel />
            </AttendanceStatIcon>
            <AttendanceStatTitle>Absent</AttendanceStatTitle>
          </AttendanceStatTopRow>
          <AttendanceStatRow>
            <AttendanceStatValue>
              {attendanceStatsLoading ? <DottedLoader /> : (
                <>
                  {absentToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalStudents}</span>
                </>
              )}
            </AttendanceStatValue>
            <AttendanceStatRightInfo>
              <AttendanceStatPercentage color="#ef4444">
                {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${absentPercent}%`}
              </AttendanceStatPercentage>
            </AttendanceStatRightInfo>
          </AttendanceStatRow>
        </AttendanceStatCard>

        <AttendanceStatCard accentColor="#3b82f6">
          <AttendanceStatTopRow>
            <AttendanceStatIcon color="#3b82f6">
              <CalendarMonth />
            </AttendanceStatIcon>
            <AttendanceStatTitle>Leave</AttendanceStatTitle>
          </AttendanceStatTopRow>
          <AttendanceStatRow>
            <AttendanceStatValue>
              {attendanceStatsLoading ? <DottedLoader /> : (
                <>
                  {leaveToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalStudents}</span>
                </>
              )}
            </AttendanceStatValue>
            <AttendanceStatRightInfo>
              <AttendanceStatPercentage color="#3b82f6">
                {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${leavePercent}%`}
              </AttendanceStatPercentage>
            </AttendanceStatRightInfo>
          </AttendanceStatRow>
        </AttendanceStatCard>

        <AttendanceStatCard accentColor="#f59e0b">
          <AttendanceStatTopRow>
            <AttendanceStatIcon color="#f59e0b">
              <AccessTime />
            </AttendanceStatIcon>
            <AttendanceStatTitle>Late</AttendanceStatTitle>
          </AttendanceStatTopRow>
          <AttendanceStatRow>
            <AttendanceStatValue>
              {attendanceStatsLoading ? <DottedLoader /> : (
                <>
                  {lateToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalStudents}</span>
                </>
              )}
            </AttendanceStatValue>
            <AttendanceStatRightInfo>
              <AttendanceStatPercentage color="#f59e0b">
                {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${latePercent}%`}
              </AttendanceStatPercentage>
            </AttendanceStatRightInfo>
          </AttendanceStatRow>
        </AttendanceStatCard>

        <AttendanceStatCard accentColor="#8b5cf6">
          <AttendanceStatTopRow>
            <AttendanceStatIcon color="#8b5cf6">
              <HourglassEmpty />
            </AttendanceStatIcon>
            <AttendanceStatTitle>Half Leave</AttendanceStatTitle>
          </AttendanceStatTopRow>
          <AttendanceStatRow>
            <AttendanceStatValue>
              {attendanceStatsLoading ? <DottedLoader /> : (
                <>
                  {halfLeaveCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalStudents}</span>
                </>
              )}
            </AttendanceStatValue>
            <AttendanceStatRightInfo>
              <AttendanceStatPercentage color="#8b5cf6">
                {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${halfLeavePercent}%`}
              </AttendanceStatPercentage>
            </AttendanceStatRightInfo>
          </AttendanceStatRow>
        </AttendanceStatCard>
      </AttendanceStatsGrid>

      {/* Attendance Charts */}
      <AttendanceChartsGrid>
        {/* Attendance Trend Chart */}
        <AttendanceChartCard>
          <AttendanceChartHeader>
            <CheckCircle style={{ color: '#3b82f6', fontSize: '1.1rem' }} />
            Attendance Trend
          </AttendanceChartHeader>
          {attendanceChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : attendanceTrendData.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', color: isDark ? '#9ca3af' : '#6b7280' }}>
              No attendance data available
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={attendanceTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorAttendanceRise" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorAttendanceFall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => `${value}%`}
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
                      const data = props.payload;
                      const change = data?.change;
                      const changeText = change !== undefined && change !== 0 
                        ? ` (${change > 0 ? '+' : ''}${change}%)` 
                        : '';
                      return [`${value}%${changeText}`, 'Attendance Rate'];
                    }}
                    labelFormatter={(label, payload) => {
                      const data = payload && payload[0]?.payload;
                      const dayOfWeek = data?.dayOfWeek || '';
                      return dayOfWeek ? `${dayOfWeek}, ${label}` : `Date: ${label}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorAttendance)"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload || cx === undefined || cy === undefined) return <g />;
                      const isIncrease = payload.isIncrease;
                      const fillColor = isIncrease === true ? '#22c55e' : isIncrease === false ? '#ef4444' : '#3b82f6';
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={fillColor}
                          stroke={isDark ? '#1e293b' : '#ffffff'}
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload || cx === undefined || cy === undefined) return <g />;
                      const isIncrease = payload.isIncrease;
                      const fillColor = isIncrease === true ? '#22c55e' : isIncrease === false ? '#ef4444' : '#3b82f6';
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={fillColor}
                          stroke={isDark ? '#1e293b' : '#ffffff'}
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <AttendanceChartSummary>
                <AttendanceChartSummaryItem>
                  <AttendanceChartSummaryLabel>Today</AttendanceChartSummaryLabel>
                  <AttendanceChartSummaryValue>{todayAttendanceRate}%</AttendanceChartSummaryValue>
                </AttendanceChartSummaryItem>
                <AttendanceChartSummaryItem>
                  <AttendanceChartSummaryLabel>Week Avg</AttendanceChartSummaryLabel>
                  <AttendanceChartSummaryValue>{weekAvgAttendanceRate}%</AttendanceChartSummaryValue>
                </AttendanceChartSummaryItem>
              </AttendanceChartSummary>
            </>
          )}
        </AttendanceChartCard>

        {/* Class Attendance Chart */}
        <AttendanceChartCard>
          <AttendanceChartHeader>
            <Group style={{ color: '#3b82f6', fontSize: '1.1rem' }} />
            Class Attendance (Today)
          </AttendanceChartHeader>
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
                    stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="class"
                    tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
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
              <AttendanceChartSummary>
                <AttendanceChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '2px' }} />
                    <AttendanceChartSummaryLabel>Present</AttendanceChartSummaryLabel>
                  </div>
                </AttendanceChartSummaryItem>
                <AttendanceChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
                    <AttendanceChartSummaryLabel>Late</AttendanceChartSummaryLabel>
                  </div>
                </AttendanceChartSummaryItem>
                <AttendanceChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }} />
                    <AttendanceChartSummaryLabel>Leave</AttendanceChartSummaryLabel>
                  </div>
                </AttendanceChartSummaryItem>
                <AttendanceChartSummaryItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                    <AttendanceChartSummaryLabel>Absent</AttendanceChartSummaryLabel>
                  </div>
                </AttendanceChartSummaryItem>
              </AttendanceChartSummary>
            </>
          )}
        </AttendanceChartCard>
      </AttendanceChartsGrid>

      {/* Consecutive Absent Students Card */}
      <ConsecutiveAbsentCard>
        <ConsecutiveAbsentHeader>
          <Warning style={{ color: '#ef4444', fontSize: '1.1rem' }} />
          Consecutive Absent Students
        </ConsecutiveAbsentHeader>
        {consecutiveAbsentLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : consecutiveAbsentStudents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: '0.875rem'
          }}>
            No students with consecutive absences found
          </div>
        ) : (
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
                    <ConsecutiveAbsentRow style={{ fontSize: '0.82rem', color: isDark ? '#a0a7b8' : '#64748b' }}>
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
                  <tr>
                    <ConsecutiveAbsentTableHeaderCell>ID</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Student Name</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Father Name</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Mobile</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell>Class</ConsecutiveAbsentTableHeaderCell>
                    <ConsecutiveAbsentTableHeaderCell style={{ textAlign: 'center' }}>Consecutive Days</ConsecutiveAbsentTableHeaderCell>
                  </tr>
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
        )}
      </ConsecutiveAbsentCard>

      {/* Main Content */}
      <TwoColumnGrid $columns={hasRightCards ? 1 : 0}>
        {hasRightCards && (
          <RightColumn>
            {showAbsentees && (
              <AbsentsTableWrapper>
                <AbsentsTableHeader onClick={() => setIsAbsenteesExpanded(!isAbsenteesExpanded)}>
                  <AbsentsHeaderTitleRow>
                    <AbsentsHeaderTitle>
                      Today's Absentees
                    </AbsentsHeaderTitle>
                    <AbsentsControls isExpanded={isAbsenteesExpanded}>
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
                  </AbsentsControls>
                </AbsentsHeaderTitleRow>
                </AbsentsTableHeader>
                <AbsentsCollapsibleContent $expanded={isAbsenteesExpanded}>
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
                            color: isDark ? '#a0a7b8' : '#64748b',
                            minHeight: '200px'
                          }}>
                            <div style={{
                              fontSize: '3rem',
                              marginBottom: '1rem',
                              color: '#6366f1',
                              opacity: 0.7
                            }}>
                              🏖️
                            </div>
                            <div style={{
                              fontSize: '1.2rem',
                              fontWeight: 600,
                              marginBottom: '0.5rem',
                              color: isDark ? '#e2e8f0' : '#1e293b'
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
                            color: isDark ? '#a0a7b8' : '#64748b',
                            minHeight: '200px'
                          }}>
                            <div style={{
                              fontSize: '3rem',
                              marginBottom: '1rem',
                              color: '#6366f1',
                              opacity: 0.7
                            }}>
                              📊
                            </div>
                            <div style={{
                              fontSize: '1.2rem',
                              fontWeight: 600,
                              marginBottom: '0.5rem',
                              color: isDark ? '#e2e8f0' : '#1e293b'
                            }}>
                              No Attendance Records
                            </div>
                            <div style={{
                              fontSize: '0.95rem',
                              opacity: 0.8
                            }}>
                              No attendance has been recorded for {new Date(absentDate).toLocaleDateString()}
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
                            color: isDark ? '#a0a7b8' : '#64748b',
                            minHeight: '200px'
                          }}>
                            <div style={{
                              fontSize: '3rem',
                              marginBottom: '1rem',
                              color: '#22c55e',
                              opacity: 0.7
                            }}>
                              ✅
                            </div>
                            <div style={{
                              fontSize: '1.2rem',
                              fontWeight: 600,
                              marginBottom: '0.5rem',
                              color: isDark ? '#e2e8f0' : '#1e293b'
                            }}>
                              No Absent Students
                            </div>
                            <div style={{
                              fontSize: '0.95rem',
                              opacity: 0.8
                            }}>
                              All students are present on {new Date(absentDate).toLocaleDateString()}
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
                              <AbsenteeRow style={{ fontSize: '0.82rem', color: isDark ? '#a0a7b8' : '#64748b' }}>
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

                                        const handleStatusUpdate = async () => {
                                          const absentee = absentees[globalIdx];
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

                                            if (opt.value === 'present' || opt.value === 'late') {
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
                                            } else {
                                              const { error: updateError } = await supabase
                                                .from('attendance_records')
                                                .update({
                                                  status: opt.value
                                                })
                                                .match({
                                                  id: absentee.id,
                                                  student_id: absentee.student_id,
                                                  date: absentDate,
                                                  session_id: sessionData.id,
                                                  school_id: user.school_id
                                                });

                                              if (updateError) throw updateError;

                                              setAbsentees(prev => prev.map(a =>
                                                a.id === absentee.id
                                                  ? { ...a, status: opt.value }
                                                  : a
                                              ));
                                            }

                                            setAttendanceDataForDate(prev => {
                                              if (opt.value === 'present' || opt.value === 'late') {
                                                return prev.filter(r => r.student_id !== absentee.student_id);
                                              } else {
                                                return prev.map(r =>
                                                  r.student_id === absentee.student_id
                                                    ? { ...r, status: opt.value }
                                                    : r
                                                );
                                              }
                                            });

                                            toast.showToast('Status updated successfully', 'success');
                                          } catch (err) {
                                            toast.showToast('Failed to update status', 'error');
                                          }
                                          setDropdownIdx(null);
                                        };

                                        handleStatusUpdate();
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

                                      const absentee = absentees[globalIdx];
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

                                        setAttendanceDataForDate(prev =>
                                          prev.filter(r => r.student_id !== absentee.student_id)
                                        );

                                        toast.showToast('Attendance record deleted', 'success');
                                      } catch (err) {
                                        toast.showToast('Failed to delete record', 'error');
                                      }
                                      setDropdownIdx(null);
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
                                      <AccountCircle style={{ fontSize: '1.5em', color: isDark ? '#b0b8d1' : '#94a3b8' }} />
                                    )}
                                  </AbsenteesTableAvatar>
                                </AbsenteesTableCell>
                                <AbsenteesTableCell>
                                  <span style={{ color: isDark ? '#b0b8d1' : '#6366f1', fontWeight: 600 }}>
                                    {getStudentDisplayId({ id: student.id, roll_number: student.roll_number })}
                                  </span>
                                </AbsenteesTableCell>
                                <AbsenteesTableCell style={{ fontWeight: 700 }}>
                                  {student.name}
                                </AbsenteesTableCell>
                                <AbsenteesTableCell style={{ color: isDark ? '#a0a7b8' : '#94a3b8' }}>
                                  {student.father_name || '-'}
                                </AbsenteesTableCell>
                                <AbsenteesTableCell style={{ color: isDark ? '#a0a7b8' : '#64748b' }}>
                                  {student.class_name || '-'}{student.section_name ? ` (${student.section_name})` : ''}
                                </AbsenteesTableCell>
                                <AbsenteesTableCell style={{ color: isDark ? '#a0a7b8' : '#64748b' }}>
                                  {student.monthly_absences || 0}
                                </AbsenteesTableCell>
                                <AbsenteesTableCell style={{ color: isDark ? '#a0a7b8' : '#64748b' }}>
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

                                              const handleStatusUpdate = async () => {
                                                const absentee = absentees[globalIdx];
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

                                                  if (opt.value === 'present' || opt.value === 'late') {
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
                                                  } else {
                                                    const { error: updateError } = await supabase
                                                      .from('attendance_records')
                                                      .update({
                                                        status: opt.value
                                                      })
                                                      .match({
                                                        id: absentee.id,
                                                        student_id: absentee.student_id,
                                                        date: absentDate,
                                                        session_id: sessionData.id,
                                                        school_id: user.school_id
                                                      });

                                                    if (updateError) throw updateError;

                                                    setAbsentees(prev => prev.map(a =>
                                                      a.id === absentee.id
                                                        ? { ...a, status: opt.value }
                                                        : a
                                                    ));
                                                  }

                                                  setAttendanceDataForDate(prev => {
                                                    if (opt.value === 'present' || opt.value === 'late') {
                                                      return prev.filter(r => r.student_id !== absentee.student_id);
                                                    } else {
                                                      return prev.map(r =>
                                                        r.student_id === absentee.student_id
                                                          ? { ...r, status: opt.value }
                                                          : r
                                                      );
                                                    }
                                                  });

                                                  toast.showToast('Status updated successfully', 'success');
                                                } catch (err) {
                                                  toast.showToast('Failed to update status', 'error');
                                                }
                                                setDropdownIdx(null);
                                              };

                                              handleStatusUpdate();
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

                                            const absentee = absentees[globalIdx];
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

                                              setAttendanceDataForDate(prev =>
                                                prev.filter(r => r.student_id !== absentee.student_id)
                                              );

                                              toast.showToast('Attendance record deleted', 'success');
                                            } catch (err) {
                                              toast.showToast('Failed to delete record', 'error');
                                            }
                                            setDropdownIdx(null);
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
                  <AbsenteesStatsRow>
                    <span className="stat total">T: <b>{attendanceDataForDate.length}</b></span>
                    <span className="stat present">P: <b>{attendanceDataForDate.filter(a => a.status === 'present').length}</b></span>
                    <span className="stat absent">A: <b>{attendanceDataForDate.filter(a => a.status === 'absent').length}</b></span>
                    <span className="stat leave">L: <b>{attendanceDataForDate.filter(a => a.status === 'leave').length}</b></span>
                    <span className="stat late">LT: <b>{attendanceDataForDate.filter(a => a.status === 'late').length}</b></span>
                    <span className="stat avg">P%: <b>{attendanceDataForDate.length ? Math.round(((attendanceDataForDate.filter(a => a.status === 'present').length + attendanceDataForDate.filter(a => a.status === 'late').length) / attendanceDataForDate.length) * 100) : 0}%</b></span>
                  </AbsenteesStatsRow>
                </AbsentsCollapsibleContent>
              </AbsentsTableWrapper>
            )}
          </RightColumn>
        )}
      </TwoColumnGrid>
    </div>
  );
};

export default AttendanceTab;

