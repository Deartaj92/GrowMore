import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from 'styled-components';
import DottedLoader from '../shared/DottedLoader';
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
  AreaChart
} from 'recharts';
import { supabase } from '../../../../supabaseClient';
import { useToast } from '../../../../components/useToast';
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
  AttendanceChartsGrid,
  AttendanceChartCard,
  AttendanceChartHeader,
  AttendanceChartSummary,
  AttendanceChartSummaryItem,
  AttendanceChartSummaryLabel,
  AttendanceChartSummaryValue,
  TwoColumnGrid,
  RightColumn,
  AbsentsTableWrapper,
  AbsentsTableHeader,
  AbsentsHeaderTitleRow,
  AbsentsHeaderTitle,
  AbsentsControls,
  DateInput,
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
  const isDark = (theme as any).BG === '#252525' || (theme as any).BG === '#181c2a';

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
        return '#22c55e';
      case 'absent':
        return '#ef4444';
      case 'late':
        return '#eab308';
      case 'leave':
        return '#2563eb';
      case 'half_day':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

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
                  {presentToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalEmployees}</span>
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
                  {absentToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalEmployees}</span>
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
                  {leaveToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalEmployees}</span>
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
                  {lateToday} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalEmployees}</span>
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
            <AttendanceStatTitle>Half Day</AttendanceStatTitle>
          </AttendanceStatTopRow>
          <AttendanceStatRow>
            <AttendanceStatValue>
              {attendanceStatsLoading ? <DottedLoader /> : (
                <>
                  {halfDayCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: isDark ? '#9ca3af' : '#6b7280' }}>of {totalEmployees}</span>
                </>
              )}
            </AttendanceStatValue>
            <AttendanceStatRightInfo>
              <AttendanceStatPercentage color="#8b5cf6">
                {attendanceStatsLoading ? <DottedLoader size={0.6} /> : `${halfDayPercent}%`}
              </AttendanceStatPercentage>
            </AttendanceStatRightInfo>
          </AttendanceStatRow>
        </AttendanceStatCard>
      </AttendanceStatsGrid>

      {/* Attendance Trend Chart */}
      <AttendanceChartsGrid>
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
                    <linearGradient id="colorEmployeeAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
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
                    formatter={(value: any) => [`${value}%`, 'Attendance Rate']}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorEmployeeAttendance)"
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
      </AttendanceChartsGrid>

      {/* Absentees Section */}
      {showAbsentees && (
        <TwoColumnGrid $columns={1}>
          <RightColumn>
            <AbsentsTableWrapper>
              <AbsentsTableHeader>
                <AbsentsHeaderTitleRow>
                  <AbsentsHeaderTitle>
                    <Cancel style={{ color: '#ef4444', fontSize: '1.1rem', marginRight: '0.5rem' }} />
                    Absent Employees
                  </AbsentsHeaderTitle>
                  <AbsentsControls isExpanded={isAbsenteesExpanded}>
                    <DateInput
                      type="date"
                      value={absentDate}
                      onChange={(e) => setAbsentDate(e.target.value)}
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
                </AbsentsHeaderTitleRow>
                </AbsentsTableHeader>
                <AbsentsCollapsibleContent $expanded={isAbsenteesExpanded}>
                  {absentees.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: isDark ? '#9ca3af' : '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      No absent employees found for this date
                    </div>
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
                                  <AbsenteeRow style={{ fontSize: '0.82rem', color: isDark ? '#a0a7b8' : '#64748b' }}>
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
                </AbsentsCollapsibleContent>
              </AbsentsTableWrapper>
            </RightColumn>
          </TwoColumnGrid>
        )}
    </div>
  );
};

export default EmployeeAttendanceTab;

