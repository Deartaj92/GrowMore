import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  People,
  CheckCircle,
  School,
  Groups,
  QrCodeScanner,
  Nfc,
  PersonAdd,
  AccountBalanceWallet,
  Assignment,
  MenuBook,
  Assessment,
  ReceiptLong,
  FactCheck,
  EventNote,
  Cake,
  TrendingUp,
  Badge,
  FamilyRestroom,
  WarningAmber,
  Gavel,
  Bolt,
  ChevronRight,
  ArrowForward,
} from '@mui/icons-material';
import {
  clayCardStyle,
  isDark,
  CARD_RADIUS_LG,
} from '../../../../styles/DesignSystem';
import { DashboardTab as DashboardTabType } from '../../types';
import { getStudentDisplayId } from '../../../../utils/studentUtils';

// ==========================================
// STYLED COMPONENTS (Matching AttendanceTab & DesignSystem)
// ==========================================

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StatCard = styled.div<{ $clickable?: boolean }>`
  ${clayCardStyle}
  padding: 1rem 1.15rem;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: ${({ $clickable }) => ($clickable ? 'translateY(-2px)' : 'none')};
  }

  @media (max-width: 600px) {
    padding: 0.85rem;
    border-radius: ${CARD_RADIUS_LG};
  }
`;

const StatTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatIconBadge = styled.div<{ $accent: string }>`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: ${({ $accent }) => $accent};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ theme, $accent }) =>
    isDark(theme) ? `${$accent}18` : `${$accent}14`};
  border: 1px solid
    ${({ theme, $accent }) => (isDark(theme) ? `${$accent}28` : `${$accent}18`)};

  svg {
    font-size: 1.05rem !important;
  }
`;

const StatChip = styled.span<{ $accent: string }>`
  font-size: 0.67rem;
  font-weight: 700;
  color: #fff;
  background: ${({ $accent }) => $accent};
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 0.2px;
`;

const StatLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) =>
    isDark(theme) ? theme.TEXT_SECONDARY : 'rgba(30, 30, 60, 0.55)'};
`;

const StatValue = styled.div`
  font-size: 1.55rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.1;
  letter-spacing: -0.5px;

  @media (max-width: 600px) {
    font-size: 1.3rem;
  }
`;

const StatOf = styled.span`
  font-size: 0.72rem;
  font-weight: 500;
  color: ${({ theme }) =>
    isDark(theme) ? theme.TEXT_SECONDARY : 'rgba(30, 30, 60, 0.45)'};
  margin-left: 4px;
`;

const StatSubtext = styled.div`
  font-size: 0.72rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ==========================================
// MAIN 2-COLUMN SPLIT LAYOUT
// ==========================================

const MainSplitGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr);
  gap: 0.5rem;
  align-items: stretch;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 1.25rem 1.4rem;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const CardTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.1px;

  svg:first-child {
    background: ${({ theme }) =>
      isDark(theme) ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'};
    border-radius: 8px;
    padding: 4px;
    color: #6366f1;
    font-size: 1.15rem !important;
  }
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SegmentedGroup = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)'};
  border: 1px solid
    ${({ theme }) =>
      isDark(theme) ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.07)'};
`;

const SegmentedBtn = styled.button<{ $active: boolean }>`
  border: none;
  background: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#3b82f6' : '#ffffff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? isDark(theme)
        ? '#ffffff'
        : theme.TEXT_PRIMARY
      : theme.TEXT_SECONDARY};
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: ${({ $active, theme }) =>
    $active && !isDark(theme) ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};
`;

const TextLinkBtn = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.ACCENT || '#3b82f6'};
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;

  &:hover {
    background: ${({ theme }) =>
      isDark(theme) ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)'};
  }

  svg {
    font-size: 0.9rem !important;
  }
`;

// ==========================================
// LEFT PANEL: TABLE STYLES
// ==========================================

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  max-height: 410px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      isDark(theme) ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'};
    border-radius: 4px;
  }
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

const Th = styled.th`
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${({ theme }) => (isDark(theme) ? '#232838' : '#f8fafc')};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid
    ${({ theme }) =>
      isDark(theme) ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)'};
`;

const Tr = styled.tr<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-bottom: 1px solid
    ${({ theme }) =>
      isDark(theme) ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)'};
  transition: background 0.12s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) =>
      isDark(theme) ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.03)'};
  }
`;

const Td = styled.td`
  padding: 0.65rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
`;

const ProgressCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 120px;
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number; $color: string }>`
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  height: 100%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  transition: width 0.35s ease;
`;

const PercentText = styled.span<{ $color: string }>`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  min-width: 36px;
  text-align: right;
`;

const StatusPill = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
`;

const EmptyBox = styled.div`
  padding: 2.5rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.82rem;
`;

// ==========================================
// RIGHT PANEL: CLEAN SHORTCUTS DIRECTORY
// ==========================================

const ShortcutsGroupsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const ShortcutSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const ShortcutSectionLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding-left: 0.15rem;
`;

const ShortcutGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ShortcutItemBtn = styled.button<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border-radius: ${CARD_RADIUS_LG};
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      isDark(theme) ? 'rgba(255, 255, 255, 0.06)' : 'rgba(226, 232, 240, 0.9)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      isDark(theme) ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'};
    border-color: ${({ $accent }) => `${$accent}55`};
    box-shadow: ${({ theme }) =>
      isDark(theme)
        ? '0 2px 8px rgba(0,0,0,0.28)'
        : '0 2px 8px rgba(15,23,42,0.06)'};
    transform: translateY(-1px);

    .shortcut-arrow {
      opacity: 1;
      transform: translateX(2px);
      color: ${({ $accent }) => $accent};
    }
  }
`;

const ShortcutIcon = styled.div<{ $accent: string }>`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $accent }) => `${$accent}16`};
  color: ${({ $accent }) => $accent};

  svg {
    font-size: 0.98rem !important;
  }
`;

const ShortcutLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ShortcutArrow = styled(ChevronRight)`
  font-size: 0.95rem !important;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  opacity: 0.45;
  transition: all 0.15s ease;
  flex-shrink: 0;
`;

// ==========================================
// COMPONENT PROPS & IMPLEMENTATION
// ==========================================

export interface DashboardOverviewTabProps {
  students: any[];
  classes: any[];
  sections: any[];
  staff: any[];
  presentToday: number;
  absentToday: number;
  leaveToday: number;
  lateToday: number;
  halfLeaveCount?: number;
  presentPercent: number;
  attendanceDataForDate?: any[];
  employeePresentToday?: number;
  employeeAbsentToday?: number;
  employeeLeaveToday?: number;
  employeeLateToday?: number;
  employeeHalfDayCount?: number;
  employeePresentPercent?: number;
  employeeAttendanceDataForDate?: any[];
  staffPresentToday?: number;
  staffAbsentToday?: number;
  staffLeaveToday?: number;
  staffLateToday?: number;
  classAttendanceData?: any[];
  absentees: any[];
  lateComers: any[];
  studentDetails: Record<string, any>;
  birthdaysToday?: any[];
  birthdaysTabVisible?: boolean;
  dashboardDate: string;
  setActiveTab?: (tab: DashboardTabType) => void;
  onSelectTab?: (tab: DashboardTabType) => void;
  allowedTabs: Set<DashboardTabType> | DashboardTabType[];
  hasPermission?: (perm: string) => boolean;
  canAccessShortcut?: (path: string) => boolean;
  isAdmin?: boolean;
  getClassName: (classId: any) => string;
  getSectionName: (sectionId: any) => string;
}

const DashboardOverviewTab: React.FC<DashboardOverviewTabProps> = ({
  students,
  classes,
  sections,
  staff,
  presentToday = 0,
  absentToday = 0,
  leaveToday = 0,
  lateToday = 0,
  presentPercent = 0,
  attendanceDataForDate = [],
  employeePresentToday,
  employeeAbsentToday,
  employeeLeaveToday,
  staffPresentToday,
  staffAbsentToday,
  classAttendanceData,
  absentees,
  lateComers,
  studentDetails,
  birthdaysToday,
  setActiveTab,
  onSelectTab,
  allowedTabs,
  getClassName,
  getSectionName,
}) => {
  const navigate = useNavigate();
  const [leftView, setLeftView] = useState<'classes' | 'absentees'>('classes');

  const switchTab = (tab: DashboardTabType) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const canAccessTab = (tab: DashboardTabType) => {
    if (!allowedTabs) return true;
    if (allowedTabs instanceof Set) return allowedTabs.size === 0 || allowedTabs.has(tab);
    if (Array.isArray(allowedTabs)) return allowedTabs.length === 0 || allowedTabs.includes(tab);
    return true;
  };

  // 1. Active Students Breakdown
  const totalStudents = students.length;
  const boysCount = useMemo(
    () =>
      students.filter((s) => {
        const g = String(s.gender || '').toLowerCase();
        return g === 'male' || g === 'boy' || g === 'm';
      }).length,
    [students]
  );
  const girlsCount = useMemo(
    () =>
      students.filter((s) => {
        const g = String(s.gender || '').toLowerCase();
        return g === 'female' || g === 'girl' || g === 'f';
      }).length,
    [students]
  );

  // 2. Staff with Attendance Enabled Only
  const attendanceStaff = useMemo(
    () =>
      (staff || []).filter(
        (s: any) =>
          String(s.status || 'active').toLowerCase() === 'active' &&
          s.attendance_enabled !== false
      ),
    [staff]
  );
  const totalStaff = attendanceStaff.length;
  // Note: employeePresentToday in Dashboard.tsx already includes both 'present' and 'late'
  const totalStaffPresent = Number(employeePresentToday ?? staffPresentToday ?? 0) || 0;
  const totalStaffAbsent = Number(employeeAbsentToday ?? staffAbsentToday ?? 0) || 0;
  const totalStaffLeave = Number(employeeLeaveToday ?? 0) || 0;
  const staffPresentPercent =
    totalStaff > 0 ? Math.round((totalStaffPresent / totalStaff) * 100) : 0;

  // 3. Today's Birthdays
  const todayBirthdaysCount = useMemo(() => {
    if (Array.isArray(birthdaysToday)) {
      return birthdaysToday.length;
    }
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return students.filter((s) => {
      if (!s.dob) return false;
      const parts = String(s.dob).split('-');
      if (parts.length < 3) return false;
      return parseInt(parts[1], 10) === m && parseInt(parts[2], 10) === d;
    }).length;
  }, [students, birthdaysToday]);

  // 4. Class-wise Summary Rows (computed live from students + attendanceDataForDate)
  const classSummaryRows = useMemo(() => {
    if (classAttendanceData && classAttendanceData.length > 0) {
      return classAttendanceData.slice(0, 15);
    }
    const attendanceByStudent = new Map<number, string>();
    (attendanceDataForDate || []).forEach((rec: any) => {
      if (rec?.student_id != null) {
        attendanceByStudent.set(Number(rec.student_id), String(rec.status || '').toLowerCase());
      }
    });

    return (classes || []).slice(0, 15).map((cls: any) => {
      const classStudents = students.filter(
        (s) => String(s.class_id) === String(cls.id)
      );
      const count = classStudents.length;
      let present = 0;
      let absent = 0;
      classStudents.forEach((s) => {
        const st = attendanceByStudent.get(Number(s.id));
        if (st === 'present' || st === 'late' || st === 'lt') {
          present++;
        } else if (st === 'absent') {
          absent++;
        }
      });
      const rate = count > 0 ? Math.round((present / count) * 100) : 0;
      return {
        name: cls.name,
        total: count,
        present,
        absent,
        rate,
      };
    });
  }, [classAttendanceData, classes, students, attendanceDataForDate]);

  // 5. Combined Absentees & Late Comers
  const combinedAbsentees = useMemo(() => {
    const list: Array<{
      student_id: any;
      status: 'Absent' | 'Late';
      name: string;
      displayId: string;
      classSection: string;
    }> = [];

    (absentees || []).forEach((a: any) => {
      const st = studentDetails[a.student_id] || a.student || {};
      const className = getClassName(st.class_id || a.class_id);
      const secName = getSectionName(st.section_id || a.section_id);
      list.push({
        student_id: a.student_id || st.id,
        status: 'Absent',
        name: st.name || a.name || 'Student',
        displayId: String(getStudentDisplayId(st) || a.student_id || ''),
        classSection: [className, secName].filter(Boolean).join(' - '),
      });
    });

    (lateComers || []).forEach((l: any) => {
      const st = studentDetails[l.student_id] || l.student || {};
      const className = getClassName(st.class_id || l.class_id);
      const secName = getSectionName(st.section_id || l.section_id);
      list.push({
        student_id: l.student_id || st.id,
        status: 'Late',
        name: st.name || l.name || 'Student',
        displayId: String(getStudentDisplayId(st) || l.student_id || ''),
        classSection: [className, secName].filter(Boolean).join(' - '),
      });
    });

    return list;
  }, [absentees, lateComers, studentDetails, getClassName, getSectionName]);

  // 6. Clean Categorized Shortcuts
  const shortcutGroups = useMemo(
    () => [
      {
        label: 'Attendance & Scanners',
        items: [
          {
            title: 'Face / QR Scanner',
            icon: <QrCodeScanner />,
            accent: '#10b981',
            onClick: () => navigate('/attendance/qr-scanner'),
          },
          {
            title: 'RFID Scanner',
            icon: <Nfc />,
            accent: '#6366f1',
            onClick: () => navigate('/attendance/rfid-scanner'),
          },
          {
            title: 'Mark Attendance',
            icon: <FactCheck />,
            accent: '#3b82f6',
            onClick: () => navigate('/attendance/mark'),
          },
          {
            title: 'Staff Attendance',
            icon: <EventNote />,
            accent: '#0ea5e9',
            onClick: () => navigate('/attendance/staff'),
          },
        ],
      },
      {
        label: 'Students & Admissions',
        items: [
          {
            title: 'Student Directory',
            icon: <People />,
            accent: '#3b82f6',
            onClick: () => navigate('/students/list'),
          },
          {
            title: 'New Admission',
            icon: <PersonAdd />,
            accent: '#8b5cf6',
            onClick: () => navigate('/students/add'),
          },
          {
            title: 'Student Enquiries',
            icon: <Badge />,
            accent: '#a855f7',
            onClick: () => navigate('/enquiries/list'),
          },
          {
            title: 'Family Management',
            icon: <FamilyRestroom />,
            accent: '#06b6d4',
            onClick: () => navigate('/FamilyManagement'),
          },
        ],
      },
      {
        label: 'Fee & Finance',
        items: [
          {
            title: 'Collect Fee',
            icon: <AccountBalanceWallet />,
            accent: '#f59e0b',
            onClick: () => navigate('/fee-collection'),
          },
          {
            title: 'Fee Defaulters',
            icon: <WarningAmber />,
            accent: '#ef4444',
            onClick: () => navigate('/fee-defaulters'),
          },
          {
            title: 'Expense Manager',
            icon: <ReceiptLong />,
            accent: '#14b8a6',
            onClick: () => navigate('/expense-manager'),
          },
          {
            title: 'Fine Management',
            icon: <Gavel />,
            accent: '#f97316',
            onClick: () => navigate('/fine-management'),
          },
        ],
      },
      {
        label: 'Academics & Reports',
        items: [
          {
            title: 'Examinations Hub',
            icon: <School />,
            accent: '#ec4899',
            onClick: () => navigate('/examinations'),
          },
          {
            title: 'Marks Entry',
            icon: <Assignment />,
            accent: '#6366f1',
            onClick: () => navigate('/marks-entry'),
          },
          {
            title: 'Daily Homework',
            icon: <MenuBook />,
            accent: '#10b981',
            onClick: () => navigate('/homework-diary'),
          },
          {
            title: 'Reports Center',
            icon: <Assessment />,
            accent: '#64748b',
            onClick: () => navigate('/reports'),
          },
        ],
      },
    ],
    [navigate]
  );

  return (
    <>
      {/* TOP KPI STAT ROW (Matches AttendanceTab style) */}
      <StatsGrid>
        <StatCard $clickable onClick={() => navigate('/students/list')}>
          <StatTopRow>
            <StatIconBadge $accent="#6366f1">
              <People />
            </StatIconBadge>
            <StatChip $accent="#6366f1">Active</StatChip>
          </StatTopRow>
          <StatValue>{totalStudents}</StatValue>
          <StatLabel>Active Students</StatLabel>
          <StatSubtext>
            {boysCount} Boys • {girlsCount} Girls
          </StatSubtext>
        </StatCard>

        <StatCard
          $clickable={canAccessTab('attendance')}
          onClick={() =>
            canAccessTab('attendance') && switchTab('attendance')
          }
        >
          <StatTopRow>
            <StatIconBadge $accent="#22c55e">
              <CheckCircle />
            </StatIconBadge>
            <StatChip $accent="#22c55e">{presentPercent}%</StatChip>
          </StatTopRow>
          <StatValue>
            {presentToday}
            <StatOf>/ {totalStudents}</StatOf>
          </StatValue>
          <StatLabel>Students Present</StatLabel>
          <StatSubtext>
            {absentToday} Absent • {leaveToday} Leave • {lateToday} Late
          </StatSubtext>
        </StatCard>

        <StatCard
          $clickable={canAccessTab('employeeAttendance')}
          onClick={() =>
            canAccessTab('employeeAttendance')
              ? switchTab('employeeAttendance')
              : navigate('/attendance/staff')
          }
        >
          <StatTopRow>
            <StatIconBadge $accent="#3b82f6">
              <Groups />
            </StatIconBadge>
            <StatChip $accent="#3b82f6">{staffPresentPercent}%</StatChip>
          </StatTopRow>
          <StatValue>
            {totalStaffPresent}
            <StatOf>/ {totalStaff}</StatOf>
          </StatValue>
          <StatLabel>Staff Present</StatLabel>
          <StatSubtext>
            {totalStaffAbsent} Absent • {totalStaffLeave} Leave
          </StatSubtext>
        </StatCard>

        <StatCard
          $clickable={canAccessTab('admissions')}
          onClick={() =>
            canAccessTab('admissions') && switchTab('admissions')
          }
        >
          <StatTopRow>
            <StatIconBadge $accent="#f59e0b">
              <School />
            </StatIconBadge>
            <StatChip $accent="#f59e0b">{sections.length} Sec</StatChip>
          </StatTopRow>
          <StatValue>{classes.length}</StatValue>
          <StatLabel>Active Classes</StatLabel>
          <StatSubtext>
            {sections.length} Sections • {totalStaff} Attendance Staff
          </StatSubtext>
        </StatCard>

        <StatCard $clickable onClick={() => navigate('/students/list')}>
          <StatTopRow>
            <StatIconBadge $accent="#ec4899">
              <Cake />
            </StatIconBadge>
            <StatChip $accent="#ec4899">Today</StatChip>
          </StatTopRow>
          <StatValue>{todayBirthdaysCount}</StatValue>
          <StatLabel>Student Birthdays</StatLabel>
          <StatSubtext>
            {todayBirthdaysCount > 0
              ? 'Celebrating today'
              : 'No birthdays today'}
          </StatSubtext>
        </StatCard>
      </StatsGrid>

      {/* MAIN 2-COLUMN WORKSPACE: Overview Data (Left) & Quick Shortcuts (Right) */}
      <MainSplitGrid>
        {/* LEFT COLUMN: Overview Data Table */}
        <ContentCard>
          <CardHeaderRow>
            <CardTitle>
              <TrendingUp />
              {leftView === 'classes'
                ? 'Class-wise Attendance Overview'
                : `Today's Absentees & Late (${combinedAbsentees.length})`}
            </CardTitle>

            <HeaderControls>
              <SegmentedGroup>
                <SegmentedBtn
                  $active={leftView === 'classes'}
                  onClick={() => setLeftView('classes')}
                >
                  Class Summary
                </SegmentedBtn>
                <SegmentedBtn
                  $active={leftView === 'absentees'}
                  onClick={() => setLeftView('absentees')}
                >
                  Absentees ({combinedAbsentees.length})
                </SegmentedBtn>
              </SegmentedGroup>

              {canAccessTab('attendance') && (
                <TextLinkBtn onClick={() => switchTab('attendance')}>
                  Analytics <ArrowForward />
                </TextLinkBtn>
              )}
            </HeaderControls>
          </CardHeaderRow>

          {leftView === 'classes' ? (
            classSummaryRows.length === 0 ? (
              <EmptyBox>No classes configured yet.</EmptyBox>
            ) : (
              <TableContainer>
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Class</Th>
                      <Th>Strength</Th>
                      <Th>Present</Th>
                      <Th>Absent</Th>
                      <Th>Attendance Rate</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {classSummaryRows.map((row: any, idx: number) => {
                      const className =
                        row.className || row.name || `Class ${idx + 1}`;
                      const total =
                        row.total ?? row.totalStudents ?? row.count ?? 0;
                      const present = row.present ?? row.presentCount ?? 0;
                      const absent = row.absent ?? row.absentCount ?? 0;
                      const rate =
                        row.attendanceRate !== undefined
                          ? Math.round(row.attendanceRate)
                          : row.rate !== undefined
                          ? Math.round(row.rate)
                          : total > 0
                          ? Math.round((present / total) * 100)
                          : 0;
                      const barColor =
                        rate >= 85
                          ? '#22c55e'
                          : rate >= 65
                          ? '#f59e0b'
                          : '#3b82f6';

                      return (
                        <Tr key={`${className}-${idx}`}>
                          <Td>{className}</Td>
                          <Td>{total}</Td>
                          <Td style={{ color: '#22c55e' }}>{present}</Td>
                          <Td style={{ color: '#ef4444' }}>{absent}</Td>
                          <Td>
                            <ProgressCell>
                              <ProgressTrack>
                                <ProgressFill
                                  $percent={rate}
                                  $color={barColor}
                                />
                              </ProgressTrack>
                              <PercentText $color={barColor}>
                                {rate}%
                              </PercentText>
                            </ProgressCell>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </TableContainer>
            )
          ) : combinedAbsentees.length === 0 ? (
            <EmptyBox>
              No absentees or late comers recorded for today.
            </EmptyBox>
          ) : (
            <TableContainer>
              <DataTable>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Student Name</Th>
                    <Th>Class</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {combinedAbsentees.slice(0, 30).map((item, idx) => (
                    <Tr
                      key={`${item.student_id}-${idx}`}
                      $clickable
                      onClick={() =>
                        item.student_id &&
                        navigate(`/students/profile/${item.student_id}`)
                      }
                    >
                      <Td style={{ opacity: 0.75 }}>{item.displayId}</Td>
                      <Td>{item.name}</Td>
                      <Td>{item.classSection || '—'}</Td>
                      <Td>
                        <StatusPill
                          $color={
                            item.status === 'Absent' ? '#ef4444' : '#f59e0b'
                          }
                        >
                          {item.status}
                        </StatusPill>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </TableContainer>
          )}
        </ContentCard>

        {/* RIGHT COLUMN: Clean Quick Shortcuts Panel */}
        <ContentCard>
          <CardHeaderRow>
            <CardTitle>
              <Bolt />
              Quick Shortcuts
            </CardTitle>
          </CardHeaderRow>

          <ShortcutsGroupsContainer>
            {shortcutGroups.map((group) => (
              <ShortcutSection key={group.label}>
                <ShortcutSectionLabel>{group.label}</ShortcutSectionLabel>
                <ShortcutGrid>
                  {group.items.map((item) => (
                    <ShortcutItemBtn
                      key={item.title}
                      $accent={item.accent}
                      onClick={item.onClick}
                    >
                      <ShortcutIcon $accent={item.accent}>
                        {item.icon}
                      </ShortcutIcon>
                      <ShortcutLabel>{item.title}</ShortcutLabel>
                      <ShortcutArrow className="shortcut-arrow" />
                    </ShortcutItemBtn>
                  ))}
                </ShortcutGrid>
              </ShortcutSection>
            ))}
          </ShortcutsGroupsContainer>
        </ContentCard>
      </MainSplitGrid>
    </>
  );
};

export default DashboardOverviewTab;

