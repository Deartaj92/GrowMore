import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import DottedLoader from '../shared/DottedLoader';
import AppDateField from '../../../../components/shared/AppDateField';
import {
  CheckCircle,
  Cancel,
  CalendarMonth,
  AccessTime,
  HourglassEmpty,
  FileDownloadOutlined as ExportIcon,
  KeyboardArrowUpRounded as ChevronDownIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon
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
import {
  AbsentsControls,
  DateInput,
  ExportButton,
  ExportDropdown,
  ExportDropdownItem,
  ExpandIcon,
  AbsenteesGrid,
  CompactAnimatedAbsenteeCard,
  StudentAvatar,
  AbsenteeCardContent,
  AbsenteeRow,
  AbsenteeId,
  AbsenteeName,
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
import { EMPLOYEE_STATUS_OPTIONS, DELETE_OPTION } from '../../constants';

import { clayCardStyle, isDark, CARD_RADIUS_LG, getDashboardPalette } from '../../../../styles/DesignSystem';

// ===== STYLED COMPONENTS (Matching FeeAnalytics structure) =====

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
`;

const StatCard = styled.div`
  ${clayCardStyle}
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 600px) {
    padding: 0.85rem;
    border-radius: ${CARD_RADIUS_LG};
  }
`;

const HalfLeaveStatCard = styled(StatCard)`
  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const StatChange = styled.div<{ $positive?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
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

const ContentCard = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 1.5rem;
  
  @media (max-width: 768px) {
    padding: 1.1rem;
    border-radius: ${CARD_RADIUS_LG};
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

const ChartSummary = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
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

interface EmployeeAttendanceTabProps {
  // Attendance stats
  presentToday: number;
  absentToday: number;
  leaveToday: number;
  lateToday: number;
  halfDayCount: number;
  presentPercent: number;
  absentPercent: number;
  leavePercent: number;
  latePercent: number;
  halfDayPercent: number;
  attendanceStatsLoading?: boolean;
  
  // Charts data
  attendanceChartsLoading: boolean;
  attendanceTrendData: any[];
  todayAttendanceRate: number;
  weekAvgAttendanceRate: number;
  
  // Absentees
  absentDate: string;
  setAbsentDate: (date: string) => void;
  isAbsenteesExpanded: boolean;
  setIsAbsenteesExpanded: (expanded: boolean) => void;
  absentees: any[];
  staffDetails: Record<string, any>;
  attendanceDataForDate: any[];
  exportAbsentLoading: boolean;
  exportPresentLoading: boolean;
  exportAbsenteesPDF: () => void;
  exportPresentEmployeesPDF: () => void;
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
  showAbsentees: boolean;
  isMobile: boolean;
}

const EmployeeAttendanceTab: React.FC<EmployeeAttendanceTabProps> = ({
  presentToday,
  absentToday,
  leaveToday,
  lateToday,
  halfDayCount,
  presentPercent,
  absentPercent,
  leavePercent,
  latePercent,
  halfDayPercent,
  attendanceStatsLoading = false,
  attendanceChartsLoading,
  attendanceTrendData,
  todayAttendanceRate,
  weekAvgAttendanceRate,
  absentDate,
  setAbsentDate,
  isAbsenteesExpanded,
  setIsAbsenteesExpanded,
  absentees,
  staffDetails,
  attendanceDataForDate,
  exportAbsentLoading,
  exportPresentLoading,
  exportAbsenteesPDF,
  exportPresentEmployeesPDF,
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
  showAbsentees,
  isMobile
}) => {
  const theme = useTheme();
  const toast = useToast();
  const dashboardPalette = getDashboardPalette(theme as any);
  const statusPalette = dashboardPalette.status;

  // Calculate total number of employees
  const totalEmployees = attendanceDataForDate.length;

  const getStaffInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return statusPalette.success;
      case 'absent':
        return statusPalette.danger;
      case 'late':
        return statusPalette.warningStrong;
      case 'leave':
        return statusPalette.infoStrong;
      case 'half_day':
        return statusPalette.violet;
      default:
        return statusPalette.neutral;
    }
  };

  return (
    <Container>
      {/* Attendance Stats Cards */}
      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Present</StatLabel>
            <CheckCircle style={{ fontSize: '1.25rem', color: statusPalette.success }} />
          </div>
          <StatValue theme={theme}>
            {attendanceStatsLoading ? <DottedLoader /> : (
              <>
                {presentToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: dashboardPalette.subtleText }}>of {totalEmployees}</span>
              </>
            )}
          </StatValue>
          <StatChange $positive={true} theme={theme}>
            {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${presentPercent}%`}
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Absent</StatLabel>
            <Cancel style={{ fontSize: '1.25rem', color: statusPalette.danger }} />
          </div>
          <StatValue theme={theme}>
            {attendanceStatsLoading ? <DottedLoader /> : (
              <>
                {absentToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: dashboardPalette.subtleText }}>of {totalEmployees}</span>
              </>
            )}
          </StatValue>
          <StatChange $positive={false} theme={theme}>
            {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${absentPercent}%`}
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Leave</StatLabel>
            <CalendarMonth style={{ fontSize: '1.25rem', color: statusPalette.info }} />
          </div>
          <StatValue theme={theme}>
            {attendanceStatsLoading ? <DottedLoader /> : (
              <>
                {leaveToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: dashboardPalette.subtleText }}>of {totalEmployees}</span>
              </>
            )}
          </StatValue>
          <StatChange $positive={true} theme={theme}>
            {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${leavePercent}%`}
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Late</StatLabel>
            <AccessTime style={{ fontSize: '1.25rem', color: statusPalette.warning }} />
          </div>
          <StatValue theme={theme}>
            {attendanceStatsLoading ? <DottedLoader /> : (
              <>
                {lateToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: dashboardPalette.subtleText }}>of {totalEmployees}</span>
              </>
            )}
          </StatValue>
          <StatChange $positive={true} theme={theme}>
            {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${latePercent}%`}
          </StatChange>
        </StatCard>

        <HalfLeaveStatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Half Day</StatLabel>
            <HourglassEmpty style={{ fontSize: '1.25rem', color: statusPalette.violet }} />
          </div>
          <StatValue theme={theme}>
            {attendanceStatsLoading ? <DottedLoader /> : (
              <>
                {halfDayCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: dashboardPalette.subtleText }}>of {totalEmployees}</span>
              </>
            )}
          </StatValue>
          <StatChange $positive={true} theme={theme}>
            {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${halfDayPercent}%`}
          </StatChange>
        </HalfLeaveStatCard>
      </StatsGrid>

      {/* Attendance Trend Chart */}
      <ContentGrid theme={theme}>
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <CheckCircle style={{ fontSize: '1.1rem' }} />
            Attendance Trend
          </CardTitle>
          {attendanceChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
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
                      // Calculate total employees: present + absent + leave + late
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
      </ContentGrid>

      {/* Absentees Section */}
      {showAbsentees && (
        <ContentCard theme={theme}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => setIsAbsenteesExpanded(!isAbsenteesExpanded)}>
            <CardTitle theme={theme} style={{ margin: 0 }}>
              <Cancel style={{ color: '#ef4444', fontSize: '1.1rem' }} />
              Absent Employees
            </CardTitle>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AbsentsControls isExpanded={isAbsenteesExpanded} style={{ cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                    <AppDateField
                      value={absentDate}
                      onChange={(e) => setAbsentDate(e.target.value)}
                      fullWidth={false}
                      textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 170 } }}
                    />
                    <ExportButton
                      ref={exportDropdownRef}
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                    >
                      <ExportIcon />
                      Export
                    </ExportButton>
                    {showExportDropdown && ReactDOM.createPortal(
                      <ExportDropdown
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'fixed',
                          top: exportDropdownRef.current
                            ? exportDropdownRef.current.getBoundingClientRect().bottom + 5
                            : 0,
                          left: exportDropdownRef.current
                            ? exportDropdownRef.current.getBoundingClientRect().left
                            : 0,
                          zIndex: 1000
                        }}
                      >
                        <ExportDropdownItem
                          $type="absent"
                          onClick={exportAbsenteesPDF}
                          disabled={exportAbsentLoading}
                        >
                          {exportAbsentLoading ? 'Generating...' : 'Export Absent Employees'}
                        </ExportDropdownItem>
                        <ExportDropdownItem
                          $type="present"
                          onClick={exportPresentEmployeesPDF}
                          disabled={exportPresentLoading}
                        >
                          {exportPresentLoading ? 'Generating...' : 'Export Present Employees'}
                        </ExportDropdownItem>
                      </ExportDropdown>,
                      document.body
                    )}
                    <ExpandIcon
                      $expanded={isAbsenteesExpanded}
                    />
                  </AbsentsControls>
              </div>
            </div>
            <div style={{ display: isAbsenteesExpanded ? 'block' : 'none' }}>
              {absentees.length === 0 ? (
                <EmptyState theme={theme}>
                  No absent employees found for this date
                </EmptyState>
              ) : (
                    <>
                      {/* Mobile Card View */}
                      {isMobile && (
                        <AbsenteesGrid>
                          {absentees.map((absentee, index) => {
                            const staffDetail = staffDetails[absentee.staff_id];
                            if (!staffDetail) return null;
                            const globalIdx = index;
                            return (
                              <CompactAnimatedAbsenteeCard key={absentee.id || index} $index={index}>
                                <StudentAvatar
                                  onMouseEnter={(e) => {
                                    if (staffDetail.picture_url) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredAvatar({
                                        url: staffDetail.picture_url,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top
                                      });
                                    }
                                  }}
                                  onMouseLeave={() => setHoveredAvatar(null)}
                                >
                                  {staffDetail.picture_url ? (
                                    <img
                                      src={staffDetail.picture_url}
                                      alt={staffDetail.name}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        if (target.nextSibling) {
                                          (target.nextSibling as HTMLElement).style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div style={{ display: staffDetail.picture_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                    {getStaffInitials(staffDetail.name)}
                                  </div>
                                </StudentAvatar>
                                <AbsenteeCardContent>
                                  <AbsenteeRow>
                                    <AbsenteeId>E{staffDetail.id}</AbsenteeId>
                                    <AbsenteeName>{staffDetail.name}</AbsenteeName>
                                  </AbsenteeRow>
                                  <AbsenteeRow style={{ fontSize: '0.82rem', color: dashboardPalette.subtleText }}>
                                    <span>{staffDetail.role || 'Employee'}</span>
                                  </AbsenteeRow>
                                </AbsenteeCardContent>
                                <StatusPill
                                  status={absentee.status}
                                  $status={absentee.status}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const buttonRect = e.currentTarget.getBoundingClientRect();
                                    setDropdownPos({
                                      top: buttonRect.bottom + 5,
                                      left: buttonRect.left
                                    });
                                    setDropdownDirection(buttonRect.bottom > window.innerHeight / 2 ? 'up' : 'down');
                                    setDropdownIdx(globalIdx);
                                  }}
                                >
                                  {absentee.status === 'absent' ? 'Absent' :
                                   absentee.status === 'leave' ? 'Leave' :
                                   absentee.status === 'late' ? 'Late' :
                                   absentee.status === 'half_day' ? 'Half Day' : 'Unknown'}
                                </StatusPill>
                                {dropdownIdx === globalIdx && dropdownPos && ReactDOM.createPortal(
                                  <StatusDropdown
                                    ref={dropdownRef}
                                    direction={dropdownDirection}
                                    style={{
                                      position: 'fixed',
                                      top: dropdownDirection === 'up' ? dropdownPos.top - 200 : dropdownPos.top,
                                      left: dropdownPos.left,
                                      zIndex: 1000
                                    }}
                                  >
                                    {EMPLOYEE_STATUS_OPTIONS.map((opt) => (
                                      <StatusOption
                                        key={opt.value}
                                        type="button"
                                        color={opt.color}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          // Status update logic here
                                          setDropdownIdx(null);
                                        }}
                                      >
                                        {opt.label}
                                      </StatusOption>
                                    ))}
                                  </StatusDropdown>,
                                  document.body
                                )}
                              </CompactAnimatedAbsenteeCard>
                            );
                          })}
                        </AbsenteesGrid>
                      )}

                      {/* Desktop Table View */}
                      {!isMobile && (
                        <AbsenteesDesktopTable>
                          {absentees.map((absentee, index) => {
                            const staffDetail = staffDetails[absentee.staff_id];
                            if (!staffDetail) return null;
                            const globalIdx = index;
                            return (
                              <AbsenteesTableRow key={absentee.id || index} $index={index}>
                                <AbsenteesTableCell>
                                  <AbsenteesTableAvatar
                                    onMouseEnter={(e) => {
                                      if (staffDetail.picture_url) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setHoveredAvatar({
                                          url: staffDetail.picture_url,
                                          x: rect.left + rect.width / 2,
                                          y: rect.top
                                        });
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredAvatar(null)}
                                  >
                                    {staffDetail.picture_url ? (
                                      <img
                                        src={staffDetail.picture_url}
                                        alt={staffDetail.name}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          if (target.nextSibling) {
                                            (target.nextSibling as HTMLElement).style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div style={{ display: staffDetail.picture_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                      {getStaffInitials(staffDetail.name)}
                                    </div>
                                  </AbsenteesTableAvatar>
                                </AbsenteesTableCell>
                                <AbsenteesTableCell>E{staffDetail.id}</AbsenteesTableCell>
                                <AbsenteesTableCell>{staffDetail.name}</AbsenteesTableCell>
                                <AbsenteesTableCell>{staffDetail.role || 'Employee'}</AbsenteesTableCell>
                                <AbsenteesTableCell>
                                  <AbsenteesTableStatusPill
                                    $status={absentee.status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const buttonRect = e.currentTarget.getBoundingClientRect();
                                      setDropdownPos({
                                        top: buttonRect.bottom + 5,
                                        left: buttonRect.left
                                      });
                                      setDropdownDirection(buttonRect.bottom > window.innerHeight / 2 ? 'up' : 'down');
                                      setDropdownIdx(globalIdx);
                                    }}
                                  >
                                    {absentee.status === 'absent' ? 'Absent' :
                                     absentee.status === 'leave' ? 'Leave' :
                                     absentee.status === 'late' ? 'Late' :
                                     absentee.status === 'half_day' ? 'Half Day' : 'Unknown'}
                                  </AbsenteesTableStatusPill>
                                  {dropdownIdx === globalIdx && dropdownPos && ReactDOM.createPortal(
                                    <StatusDropdown
                                      ref={dropdownRef}
                                      direction={dropdownDirection}
                                      style={{
                                        position: 'fixed',
                                        top: dropdownDirection === 'up' ? dropdownPos.top - 200 : dropdownPos.top,
                                        left: dropdownPos.left,
                                        zIndex: 1000
                                      }}
                                    >
                                      {EMPLOYEE_STATUS_OPTIONS.map((opt) => (
                                        <StatusOption
                                          key={opt.value}
                                          type="button"
                                          color={opt.color}
                                          onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Status update logic here
                                            setDropdownIdx(null);
                                          }}
                                        >
                                          {opt.label}
                                        </StatusOption>
                                      ))}
                                    </StatusDropdown>,
                                    document.body
                                  )}
                                </AbsenteesTableCell>
                              </AbsenteesTableRow>
                            );
                          })}
                        </AbsenteesDesktopTable>
                      )}
                      <AbsenteesStatsRow>
                        <span className="stat total">T: <b>{attendanceDataForDate.length}</b></span>
                        <span className="stat present">P: <b>{attendanceDataForDate.filter(a => a.status === 'present').length}</b></span>
                        <span className="stat absent">A: <b>{attendanceDataForDate.filter(a => a.status === 'absent').length}</b></span>
                        <span className="stat leave">L: <b>{attendanceDataForDate.filter(a => a.status === 'leave').length}</b></span>
                        <span className="stat late">LT: <b>{attendanceDataForDate.filter(a => a.status === 'late').length}</b></span>
                        <span className="stat half_day">HD: <b>{attendanceDataForDate.filter(a => a.status === 'half_day').length}</b></span>
                        <span className="stat avg">P%: <b>{attendanceDataForDate.length ? Math.round(((attendanceDataForDate.filter(a => a.status === 'present').length + attendanceDataForDate.filter(a => a.status === 'late').length + attendanceDataForDate.filter(a => a.status === 'half_day').length) / attendanceDataForDate.length) * 100) : 0}%</b></span>
                      </AbsenteesStatsRow>
                    </>
                  )}
            </div>
        </ContentCard>
        )}
    </Container>
  );
};

export default EmployeeAttendanceTab;
