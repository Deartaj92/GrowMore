import React, { useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { CircularProgress } from '@mui/material';
import {
  AccessTime,
  Analytics,
  Assessment,
  Badge,
  CheckCircle,
  Groups,
  Login,
  Logout,
  Schedule,
  Timer,
  WorkHistory,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import AppDateField from '../components/shared/AppDateField';
import NoSessionsFound from '../components/NoSessionsFound';
import {
  CARD_RADIUS_LG,
  clayCardStyle,
  clayInputStyle,
  clayPanelStyle,
  getDashboardPalette,
  getLayoutPalette,
  isDark as checkIsDark,
  minimalSelectMenuStyle,
} from '../styles/DesignSystem';

type AttendanceRow = {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late' | 'half_day';
  staff_id: number;
  check_in_time: string | null;
  check_out_time: string | null;
  source: string | null;
  paid_leave: boolean;
};

type StaffRow = {
  id: number;
  name: string;
  role: string | null;
};

type SessionRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
};

type AttendanceSettingsRow = {
  staff_start_time: string | null;
  staff_end_time: string | null;
  grace_period_minutes: number | null;
};

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#0ea5e9'];

const isPresentLike = (status: AttendanceRow['status']) =>
  ['present', 'late', 'half_day'].includes(status);

const parseTimeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
};

const parseTimestampToDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMinutesAsTime = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '-';
  const safe = Math.round(minutes);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '-';
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${hours}h ${mins}m`;
};

const shortDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Page = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    const dark = checkIsDark(theme);
    return `
      radial-gradient(circle at top left, ${dark ? 'rgba(255,255,255,0.035)' : `${theme.ACCENT}10`} 0%, transparent 28%),
      linear-gradient(180deg, rgba(255,255,255,${dark ? '0.025' : '0.36'}) 0%, transparent 16%),
      ${layout.shellBg}
    `;
  }};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 0.375rem;
    gap: 0.3rem;
  }
`;

const Hero = styled.section`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(340px, 0.9fr);
  gap: 0.65rem;
  padding: 0.75rem 0.85rem;
  border-radius: ${CARD_RADIUS_LG};

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const TitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
`;

const TitleIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT} 0%, #2563eb 100%);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.28);
  flex-shrink: 0;
`;

const TitleBlock = styled.div`
  min-width: 0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.02rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  letter-spacing: 0.2px;
`;

const Subtitle = styled.p`
  margin: 0.18rem 0 0;
  font-size: 0.78rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  line-height: 1.45;
`;

const SessionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const SessionChip = styled.div`
  ${({ theme }) => {
    const palette = getDashboardPalette(theme);
    return css`
      background: ${palette.accentTintSoft};
      border: 1px solid ${palette.divider};
      color: ${theme.TEXT_PRIMARY};
    `;
  }}
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
`;

const FilterCard = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayCardStyle}
      border: 1px solid ${layout.shellBorder};
    `;
  }}
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Input = styled.input`
  ${clayInputStyle}
  padding: 0.5rem 0.72rem;
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
`;

const Select = styled.select`
  ${clayInputStyle}
  ${minimalSelectMenuStyle}
  padding: 0.5rem 1.9rem 0.5rem 0.72rem;
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  cursor: pointer;
`;

const MiniNote = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const MetricsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 0.4rem;
`;

const MetricCard = styled.article`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayCardStyle}
      border: 1px solid ${layout.shellBorder};
    `;
  }}
  padding: 0.65rem 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 92px;
`;

const MetricLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.73rem;
  font-weight: 700;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const MetricValue = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.01em;
`;

const MetricMeta = styled.div`
  color: ${({ theme }) => getLayoutPalette(theme).shellSoftText};
  font-size: 0.72rem;
  line-height: 1.35;
`;

const LayoutGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.45rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section<{ $span?: number }>`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  grid-column: span ${({ $span = 12 }) => $span};
  padding: 0.72rem 0.8rem;
  border-radius: ${CARD_RADIUS_LG};
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;

  @media (max-width: 1100px) {
    grid-column: span 1;
  }
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PanelTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.38rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const PanelMeta = styled.span`
  font-size: 0.72rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const InsightStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InsightCard = styled.div`
  ${({ theme }) => {
    const palette = getDashboardPalette(theme);
    return css`
      background: ${palette.selectionBg};
      border: 1px solid ${palette.divider};
    `;
  }}
  border-radius: 12px;
  padding: 0.55rem 0.65rem;
`;

const InsightLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const InsightValue = styled.div`
  margin-top: 0.18rem;
  font-size: 0.86rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ChartBox = styled.div`
  width: 100%;
  height: 280px;
`;

const TableWrap = styled.div`
  overflow: auto;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
`;

const Table = styled.table`
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
`;

const TH = styled.th`
  padding: 0.62rem 0.7rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  background: ${({ theme }) => getDashboardPalette(theme).selectionBg};
  border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
  white-space: nowrap;
`;

const TD = styled.td`
  padding: 0.62rem 0.7rem;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
  white-space: nowrap;
`;

const NameCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
`;

const SubText = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const BadgePill = styled.span<{ $tone: 'success' | 'warning' | 'danger' | 'info' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  padding: 0.24rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  ${({ $tone }) => {
    if ($tone === 'success') return css`background: rgba(34, 197, 94, 0.12); color: #16a34a;`;
    if ($tone === 'warning') return css`background: rgba(245, 158, 11, 0.12); color: #d97706;`;
    if ($tone === 'danger') return css`background: rgba(239, 68, 68, 0.12); color: #dc2626;`;
    return css`background: rgba(59, 130, 246, 0.12); color: #2563eb;`;
  }}
`;

const EmptyState = styled.div`
  padding: 1.1rem;
  text-align: center;
  font-size: 0.8rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const CenterPanel = styled(Panel)`
  align-items: center;
  justify-content: center;
  min-height: 180px;
`;

const StaffAttendanceAnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const toast = useToast();
  const isDark = theme === 'dark';

  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [settings, setSettings] = useState<AttendanceSettingsRow | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [staffQuery, setStaffQuery] = useState('');
  const [loadingRef, setLoadingRef] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [didSeedRange, setDidSeedRange] = useState(false);

  useEffect(() => {
    const fetchReferenceData = async () => {
      if (!user?.school_id) return;

      setLoadingRef(true);
      try {
        const [sessionRes, settingsRes, staffRes] = await Promise.all([
          supabase
            .from('sessions')
            .select('id, name, start_date, end_date')
            .eq('school_id', user.school_id)
            .eq('is_active', true)
            .order('start_date', { ascending: false })
            .limit(1),
          supabase
            .from('attendance_settings')
            .select('staff_start_time, staff_end_time, grace_period_minutes')
            .eq('school_id', user.school_id)
            .maybeSingle(),
          supabase
            .from('staff')
            .select('id, name, role')
            .eq('school_id', user.school_id)
            .order('name', { ascending: true }),
        ]);

        if (sessionRes.error) throw sessionRes.error;
        if (settingsRes.error) throw settingsRes.error;
        if (staffRes.error) throw staffRes.error;

        const session = sessionRes.data?.[0] || null;
        setActiveSession(session);
        setHasActiveSession(Boolean(session));
        setSettings(settingsRes.data || null);
        setStaff((staffRes.data || []) as StaffRow[]);

        if (session && !didSeedRange) {
          setFromDate(session.start_date);
          setToDate(session.end_date);
          setDidSeedRange(true);
        }
      } catch (error: any) {
        toast.showToast(`Failed to load employee attendance analytics: ${error?.message || 'Unknown error'}`, 'error');
      } finally {
        setLoadingRef(false);
      }
    };

    fetchReferenceData();
  }, [didSeedRange, toast, user?.school_id]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.school_id || !activeSession?.id || !fromDate || !toDate) return;

      setLoadingAttendance(true);
      try {
        const data = await fetchAllRows<AttendanceRow>(async (from, to) => (
          supabase
            .from('staff_attendance_records')
            .select('id, date, status, staff_id, check_in_time, check_out_time, source, paid_leave')
            .eq('school_id', user.school_id)
            .eq('session_id', activeSession.id)
            .gte('date', fromDate)
            .lte('date', toDate)
            .order('date', { ascending: true })
            .range(from, to)
        ));

        setAttendance(data || []);
      } catch (error: any) {
        toast.showToast(`Failed to load attendance records: ${error?.message || 'Unknown error'}`, 'error');
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [activeSession?.id, fromDate, toDate, toast, user?.school_id]);

  const availableRoles = useMemo(
    () => Array.from(new Set(staff.map((item) => item.role || 'Unassigned'))).sort(),
    [staff]
  );

  const filteredStaff = useMemo(() => (
    staff.filter((member) => {
      const matchesRole = selectedRole === 'all' || (member.role || 'Unassigned') === selectedRole;
      const query = staffQuery.trim().toLowerCase();
      const matchesQuery = !query || member.name.toLowerCase().includes(query);
      return matchesRole && matchesQuery;
    })
  ), [selectedRole, staff, staffQuery]);

  const filteredStaffIds = useMemo(() => new Set(filteredStaff.map((item) => item.id)), [filteredStaff]);

  const filteredAttendance = useMemo(() => (
    attendance.filter((record) => {
      if (!filteredStaffIds.has(record.staff_id)) return false;
      if (selectedSource !== 'all' && (record.source || 'manual') !== selectedSource) return false;
      return true;
    })
  ), [attendance, filteredStaffIds, selectedSource]);

  const aggregatedStaff = useMemo(() => {
    const startMinutes = parseTimeToMinutes(settings?.staff_start_time) ?? 8 * 60;
    const endMinutes = parseTimeToMinutes(settings?.staff_end_time) ?? 14 * 60;
    const graceMinutes = settings?.grace_period_minutes ?? 15;

    const map = new Map<number, {
      id: number;
      name: string;
      role: string;
      total: number;
      present: number;
      late: number;
      absent: number;
      leave: number;
      halfDay: number;
      paidLeave: number;
      manual: number;
      rfid: number;
      missingCheckout: number;
      checkInMinutes: number[];
      checkOutMinutes: number[];
      workMinutes: number[];
      onTimeCount: number;
    }>();

    filteredStaff.forEach((member) => {
      map.set(member.id, {
        id: member.id,
        name: member.name,
        role: member.role || 'Unassigned',
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        halfDay: 0,
        paidLeave: 0,
        manual: 0,
        rfid: 0,
        missingCheckout: 0,
        checkInMinutes: [],
        checkOutMinutes: [],
        workMinutes: [],
        onTimeCount: 0,
      });
    });

    filteredAttendance.forEach((record) => {
      const member = map.get(record.staff_id);
      if (!member) return;

      member.total += 1;
      if (record.source === 'rfid') member.rfid += 1;
      else member.manual += 1;

      if (record.status === 'present') member.present += 1;
      if (record.status === 'late') member.late += 1;
      if (record.status === 'absent') member.absent += 1;
      if (record.status === 'leave') member.leave += 1;
      if (record.status === 'half_day') member.halfDay += 1;
      if (record.paid_leave) member.paidLeave += 1;

      const checkInDate = parseTimestampToDate(record.check_in_time);
      const checkOutDate = parseTimestampToDate(record.check_out_time);
      const checkInMinutes = checkInDate ? (checkInDate.getHours() * 60) + checkInDate.getMinutes() : null;
      const checkOutMinutes = checkOutDate ? (checkOutDate.getHours() * 60) + checkOutDate.getMinutes() : null;

      if (checkInMinutes !== null) {
        member.checkInMinutes.push(checkInMinutes);
        if (checkInMinutes <= startMinutes + graceMinutes && isPresentLike(record.status)) {
          member.onTimeCount += 1;
        }
      }

      if (checkOutMinutes !== null) {
        member.checkOutMinutes.push(checkOutMinutes);
      }

      if (checkInDate && checkOutDate) {
        member.workMinutes.push((checkOutDate.getTime() - checkInDate.getTime()) / 60000);
      }

      if (checkInDate && !checkOutDate && isPresentLike(record.status)) {
        member.missingCheckout += 1;
      }
    });

    return Array.from(map.values()).map((item) => {
      const attendedDays = item.present + item.late + item.halfDay;
      const avgCheckIn = item.checkInMinutes.length
        ? item.checkInMinutes.reduce((sum, value) => sum + value, 0) / item.checkInMinutes.length
        : null;
      const avgCheckOut = item.checkOutMinutes.length
        ? item.checkOutMinutes.reduce((sum, value) => sum + value, 0) / item.checkOutMinutes.length
        : null;
      const avgWorkMinutes = item.workMinutes.length
        ? item.workMinutes.reduce((sum, value) => sum + value, 0) / item.workMinutes.length
        : null;

      return {
        ...item,
        attendedDays,
        attendanceRate: item.total ? Math.round((attendedDays / item.total) * 100) : 0,
        punctualityRate: attendedDays ? Math.round((item.onTimeCount / attendedDays) * 100) : 0,
        avgCheckIn,
        avgCheckOut,
        avgWorkMinutes,
        shiftAdherence: avgCheckOut !== null ? Math.round(((avgCheckOut - endMinutes) / 60) * 10) / 10 : null,
      };
    });
  }, [filteredAttendance, filteredStaff, settings?.grace_period_minutes, settings?.staff_end_time, settings?.staff_start_time]);

  const overview = useMemo(() => {
    const recordedDays = Array.from(new Set(filteredAttendance.map((item) => item.date))).sort();
    const attendanceRecords = filteredAttendance.length;
    const presentDays = filteredAttendance.filter((item) => item.status === 'present').length;
    const lateDays = filteredAttendance.filter((item) => item.status === 'late').length;
    const halfDays = filteredAttendance.filter((item) => item.status === 'half_day').length;
    const leaveDays = filteredAttendance.filter((item) => item.status === 'leave').length;
    const absentDays = filteredAttendance.filter((item) => item.status === 'absent').length;
    const paidLeaveDays = filteredAttendance.filter((item) => item.paid_leave).length;
    const checkInRecords = filteredAttendance.filter((item) => item.check_in_time).length;
    const checkOutRecords = filteredAttendance.filter((item) => item.check_out_time).length;
    const missingCheckout = filteredAttendance.filter((item) => item.check_in_time && !item.check_out_time && isPresentLike(item.status)).length;
    const manualEntries = filteredAttendance.filter((item) => (item.source || 'manual') !== 'rfid').length;
    const rfidEntries = filteredAttendance.filter((item) => item.source === 'rfid').length;

    const avgCheckInValues = filteredAttendance
      .map((item) => parseTimestampToDate(item.check_in_time))
      .filter((item): item is Date => Boolean(item))
      .map((item) => (item.getHours() * 60) + item.getMinutes());

    const avgCheckOutValues = filteredAttendance
      .map((item) => parseTimestampToDate(item.check_out_time))
      .filter((item): item is Date => Boolean(item))
      .map((item) => (item.getHours() * 60) + item.getMinutes());

    const avgWorkValues = filteredAttendance
      .map((item) => {
        const checkIn = parseTimestampToDate(item.check_in_time);
        const checkOut = parseTimestampToDate(item.check_out_time);
        if (!checkIn || !checkOut) return null;
        return (checkOut.getTime() - checkIn.getTime()) / 60000;
      })
      .filter((item): item is number => item !== null);

    return {
      recordedDays: recordedDays.length,
      attendanceRecords,
      presentDays,
      lateDays,
      halfDays,
      leaveDays,
      absentDays,
      paidLeaveDays,
      checkInRecords,
      checkOutRecords,
      missingCheckout,
      manualEntries,
      rfidEntries,
      presentRate: attendanceRecords ? Math.round(((presentDays + lateDays + halfDays) / attendanceRecords) * 100) : 0,
      avgCheckIn: avgCheckInValues.length ? avgCheckInValues.reduce((sum, value) => sum + value, 0) / avgCheckInValues.length : null,
      avgCheckOut: avgCheckOutValues.length ? avgCheckOutValues.reduce((sum, value) => sum + value, 0) / avgCheckOutValues.length : null,
      avgWorkMinutes: avgWorkValues.length ? avgWorkValues.reduce((sum, value) => sum + value, 0) / avgWorkValues.length : null,
    };
  }, [filteredAttendance]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, {
      date: string;
      total: number;
      attended: number;
      late: number;
      missingCheckout: number;
    }>();

    filteredAttendance.forEach((item) => {
      if (!map.has(item.date)) {
        map.set(item.date, {
          date: item.date,
          total: 0,
          attended: 0,
          late: 0,
          missingCheckout: 0,
        });
      }

      const entry = map.get(item.date)!;
      entry.total += 1;
      if (isPresentLike(item.status)) entry.attended += 1;
      if (item.status === 'late') entry.late += 1;
      if (item.check_in_time && !item.check_out_time && isPresentLike(item.status)) entry.missingCheckout += 1;
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        label: shortDateLabel(item.date),
        attendanceRate: item.total ? Math.round((item.attended / item.total) * 100) : 0,
      }));
  }, [filteredAttendance]);

  const statusBreakdown = useMemo(() => ([
    { name: 'Present', value: overview.presentDays, color: PIE_COLORS[0] },
    { name: 'Late', value: overview.lateDays, color: PIE_COLORS[1] },
    { name: 'Absent', value: overview.absentDays, color: PIE_COLORS[2] },
    { name: 'Leave', value: overview.leaveDays, color: PIE_COLORS[3] },
    { name: 'Half Day', value: overview.halfDays, color: PIE_COLORS[4] },
  ].filter((item) => item.value > 0)), [overview.absentDays, overview.halfDays, overview.lateDays, overview.leaveDays, overview.presentDays]);

  const roleBreakdown = useMemo(() => {
    const map = new Map<string, { role: string; total: number; attended: number; late: number; avgWorkSeed: number[] }>();

    aggregatedStaff.forEach((item) => {
      const key = item.role || 'Unassigned';
      if (!map.has(key)) {
        map.set(key, { role: key, total: 0, attended: 0, late: 0, avgWorkSeed: [] });
      }
      const entry = map.get(key)!;
      entry.total += item.total;
      entry.attended += item.attendedDays;
      entry.late += item.late;
      if (item.avgWorkMinutes !== null) entry.avgWorkSeed.push(item.avgWorkMinutes);
    });

    return Array.from(map.values())
      .map((item) => ({
        role: item.role,
        attendanceRate: item.total ? Math.round((item.attended / item.total) * 100) : 0,
        lateRate: item.total ? Math.round((item.late / item.total) * 100) : 0,
        avgWorkMinutes: item.avgWorkSeed.length
          ? item.avgWorkSeed.reduce((sum, value) => sum + value, 0) / item.avgWorkSeed.length
          : null,
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 8);
  }, [aggregatedStaff]);

  const sourceBreakdown = useMemo(() => ([
    { name: 'Manual', value: overview.manualEntries },
    { name: 'RFID', value: overview.rfidEntries },
  ].filter((item) => item.value > 0)), [overview.manualEntries, overview.rfidEntries]);

  const checkInBuckets = useMemo(() => {
    const startMinutes = parseTimeToMinutes(settings?.staff_start_time) ?? 8 * 60;
    const graceMinutes = settings?.grace_period_minutes ?? 15;
    const buckets = { early: 0, onTime: 0, grace: 0, late: 0 };

    filteredAttendance.forEach((item) => {
      const checkIn = parseTimestampToDate(item.check_in_time);
      if (!checkIn) return;
      const minute = (checkIn.getHours() * 60) + checkIn.getMinutes();

      if (minute < startMinutes) buckets.early += 1;
      else if (minute === startMinutes) buckets.onTime += 1;
      else if (minute <= startMinutes + graceMinutes) buckets.grace += 1;
      else buckets.late += 1;
    });

    return [
      { bucket: 'Early', value: buckets.early },
      { bucket: 'On Time', value: buckets.onTime },
      { bucket: 'Grace', value: buckets.grace },
      { bucket: 'Late', value: buckets.late },
    ];
  }, [filteredAttendance, settings?.grace_period_minutes, settings?.staff_start_time]);

  const topPunctualStaff = useMemo(() => (
    [...aggregatedStaff]
      .filter((item) => item.total > 0)
      .sort((a, b) => b.punctualityRate - a.punctualityRate || b.attendanceRate - a.attendanceRate || a.name.localeCompare(b.name))
      .slice(0, 8)
  ), [aggregatedStaff]);

  const checkoutRiskStaff = useMemo(() => (
    [...aggregatedStaff]
      .filter((item) => item.missingCheckout > 0 || item.late > 0)
      .sort((a, b) => b.missingCheckout - a.missingCheckout || b.late - a.late || a.name.localeCompare(b.name))
      .slice(0, 8)
  ), [aggregatedStaff]);

  const fullTable = useMemo(() => (
    [...aggregatedStaff].sort((a, b) => a.name.localeCompare(b.name))
  ), [aggregatedStaff]);

  const chartTheme = useMemo(() => ({
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    tick: isDark ? '#9ca3af' : '#64748b',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
  }), [isDark]);

  if (loadingRef && !didSeedRange) {
    return (
      <Page theme={themeObj}>
        <CenterPanel theme={themeObj}>
          <CircularProgress size={24} />
        </CenterPanel>
      </Page>
    );
  }

  if (hasActiveSession === false) {
    return <NoSessionsFound />;
  }

  return (
    <Page theme={themeObj}>
      <Hero theme={themeObj}>
        <TitleWrap>
          <TitleRow>
            <TitleIcon theme={themeObj}>
              <Assessment fontSize="small" />
            </TitleIcon>
            <TitleBlock>
              <Title theme={themeObj}>Employee Attendance Analytics</Title>
              <Subtitle theme={themeObj}>
                Compact view of presence, punctuality, check-in/check-out behavior, and employee-level attendance performance for the active session.
              </Subtitle>
            </TitleBlock>
          </TitleRow>

          <SessionMeta>
            <SessionChip theme={themeObj}>{activeSession?.name || 'Active Session'}</SessionChip>
            <SessionChip theme={themeObj}>
              {activeSession ? `${shortDateLabel(activeSession.start_date)} to ${shortDateLabel(activeSession.end_date)}` : 'Session range unavailable'}
            </SessionChip>
            <SessionChip theme={themeObj}>
              Shift {settings?.staff_start_time?.slice(0, 5) || '08:00'} - {settings?.staff_end_time?.slice(0, 5) || '14:00'}
            </SessionChip>
            <SessionChip theme={themeObj}>
              Grace {settings?.grace_period_minutes ?? 15} min
            </SessionChip>
          </SessionMeta>
        </TitleWrap>

        <FilterCard theme={themeObj}>
          <FilterGrid>
            <AppDateField
              label="From"
              value={fromDate}
              onChangeValue={setFromDate}
              minDate={activeSession?.start_date}
              maxDate={toDate || activeSession?.end_date}
              fullWidth
            />
            <AppDateField
              label="To"
              value={toDate}
              onChangeValue={setToDate}
              minDate={fromDate || activeSession?.start_date}
              maxDate={activeSession?.end_date}
              fullWidth
            />
            <Select theme={themeObj} value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
              <option value="all">All Roles</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
            <Select theme={themeObj} value={selectedSource} onChange={(event) => setSelectedSource(event.target.value)}>
              <option value="all">All Sources</option>
              <option value="manual">Manual</option>
              <option value="rfid">RFID</option>
            </Select>
          </FilterGrid>
          <Input
            theme={themeObj}
            type="text"
            placeholder="Search employee name..."
            value={staffQuery}
            onChange={(event) => setStaffQuery(event.target.value)}
          />
          <MiniNote theme={themeObj}>
            <span>{filteredStaff.length} employee{filteredStaff.length === 1 ? '' : 's'} in current filter</span>
            <span>{overview.recordedDays} recorded day{overview.recordedDays === 1 ? '' : 's'} in range</span>
          </MiniNote>
        </FilterCard>
      </Hero>

      <MetricsGrid>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Groups fontSize="inherit" /> Attendance Coverage</MetricLabel>
          <MetricValue theme={themeObj}>{overview.attendanceRecords}</MetricValue>
          <MetricMeta theme={themeObj}>{overview.recordedDays} recorded dates across {filteredStaff.length} filtered employees</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><CheckCircle fontSize="inherit" /> Present Rate</MetricLabel>
          <MetricValue theme={themeObj}>{overview.presentRate}%</MetricValue>
          <MetricMeta theme={themeObj}>{overview.presentDays + overview.lateDays + overview.halfDays} present-like records</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><AccessTime fontSize="inherit" /> Late Arrivals</MetricLabel>
          <MetricValue theme={themeObj}>{overview.lateDays}</MetricValue>
          <MetricMeta theme={themeObj}>{overview.checkInRecords} rows with check-in timestamps</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Login fontSize="inherit" /> Avg Check In</MetricLabel>
          <MetricValue theme={themeObj}>{formatMinutesAsTime(overview.avgCheckIn)}</MetricValue>
          <MetricMeta theme={themeObj}>Shift starts at {settings?.staff_start_time?.slice(0, 5) || '08:00'}</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Logout fontSize="inherit" /> Avg Check Out</MetricLabel>
          <MetricValue theme={themeObj}>{formatMinutesAsTime(overview.avgCheckOut)}</MetricValue>
          <MetricMeta theme={themeObj}>{overview.missingCheckout} present records still missing checkout</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Timer fontSize="inherit" /> Avg Work Time</MetricLabel>
          <MetricValue theme={themeObj}>{formatDuration(overview.avgWorkMinutes)}</MetricValue>
          <MetricMeta theme={themeObj}>{overview.rfidEntries} RFID and {overview.manualEntries} manual entries</MetricMeta>
        </MetricCard>
      </MetricsGrid>

      {loadingAttendance ? (
        <CenterPanel theme={themeObj}>
          <CircularProgress size={24} />
        </CenterPanel>
      ) : (
        <LayoutGrid>
          <Panel theme={themeObj} $span={7}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Analytics fontSize="small" /> Daily Attendance Pattern</PanelTitle>
              <PanelMeta theme={themeObj}>Attendance rate, late rows, and checkout gaps by day</PanelMeta>
            </PanelHead>
            <InsightStrip>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Best Day</InsightLabel>
                <InsightValue theme={themeObj}>
                  {dailyTrend.length ? `${dailyTrend.slice().sort((a, b) => b.attendanceRate - a.attendanceRate)[0].label} (${dailyTrend.slice().sort((a, b) => b.attendanceRate - a.attendanceRate)[0].attendanceRate}%)` : '-'}
                </InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Most Late Arrivals</InsightLabel>
                <InsightValue theme={themeObj}>
                  {dailyTrend.length ? `${dailyTrend.slice().sort((a, b) => b.late - a.late)[0].label} (${dailyTrend.slice().sort((a, b) => b.late - a.late)[0].late})` : '-'}
                </InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Checkout Gaps</InsightLabel>
                <InsightValue theme={themeObj}>{overview.missingCheckout} incomplete present rows</InsightValue>
              </InsightCard>
            </InsightStrip>
            <ChartBox>
              {dailyTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend} margin={{ top: 12, right: 14, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText, borderRadius: 12, border: 'none' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="attendanceRate" name="Attendance %" stroke="#2563eb" strokeWidth={2.4} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="late" name="Late Rows" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="missingCheckout" name="Missing Checkout" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState theme={themeObj}>No attendance data found in the selected range.</EmptyState>
              )}
            </ChartBox>
          </Panel>

          <Panel theme={themeObj} $span={5}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Assessment fontSize="small" /> Status and Source Mix</PanelTitle>
              <PanelMeta theme={themeObj}>Current filter composition</PanelMeta>
            </PanelHead>
            <InsightStrip>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Leaves</InsightLabel>
                <InsightValue theme={themeObj}>{overview.leaveDays} total, {overview.paidLeaveDays} paid</InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Check In Rows</InsightLabel>
                <InsightValue theme={themeObj}>{overview.checkInRecords}</InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Check Out Rows</InsightLabel>
                <InsightValue theme={themeObj}>{overview.checkOutRecords}</InsightValue>
              </InsightCard>
            </InsightStrip>
            <ChartBox>
              {statusBreakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={2}>
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText, borderRadius: 12, border: 'none' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState theme={themeObj}>Status breakup will appear once records are available.</EmptyState>
              )}
            </ChartBox>
            <InsightStrip>
              {sourceBreakdown.length ? sourceBreakdown.map((entry) => (
                <InsightCard theme={themeObj} key={entry.name}>
                  <InsightLabel theme={themeObj}>{entry.name}</InsightLabel>
                  <InsightValue theme={themeObj}>{entry.value} rows</InsightValue>
                </InsightCard>
              )) : (
                <InsightCard theme={themeObj}>
                  <InsightLabel theme={themeObj}>Source</InsightLabel>
                  <InsightValue theme={themeObj}>No source data</InsightValue>
                </InsightCard>
              )}
            </InsightStrip>
          </Panel>

          <Panel theme={themeObj} $span={6}>
            <PanelHead>
              <PanelTitle theme={themeObj}><WorkHistory fontSize="small" /> Role Performance</PanelTitle>
              <PanelMeta theme={themeObj}>Attendance rate and average work time by role</PanelMeta>
            </PanelHead>
            <ChartBox>
              {roleBreakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleBreakdown} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="role" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText, borderRadius: 12, border: 'none' }} />
                    <Legend />
                    <Bar dataKey="attendanceRate" name="Attendance %" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="lateRate" name="Late %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState theme={themeObj}>Role-based analytics will appear when employee records exist.</EmptyState>
              )}
            </ChartBox>
          </Panel>

          <Panel theme={themeObj} $span={6}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Schedule fontSize="small" /> Check-In Windows</PanelTitle>
              <PanelMeta theme={themeObj}>Arrival spread around the configured shift start</PanelMeta>
            </PanelHead>
            <ChartBox>
              {checkInBuckets.some((entry) => entry.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={checkInBuckets} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="bucket" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText, borderRadius: 12, border: 'none' }} />
                    <Bar dataKey="value" name="Rows" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState theme={themeObj}>Check-in timestamps are needed for arrival window analytics.</EmptyState>
              )}
            </ChartBox>
          </Panel>

          <Panel theme={themeObj} $span={6}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Badge fontSize="small" /> Most Punctual Employees</PanelTitle>
              <PanelMeta theme={themeObj}>Ranked by on-time check-ins and attendance strength</PanelMeta>
            </PanelHead>
            <TableWrap theme={themeObj}>
              <Table>
                <thead>
                  <tr>
                    <TH theme={themeObj}>Employee</TH>
                    <TH theme={themeObj}>Role</TH>
                    <TH theme={themeObj}>Attendance</TH>
                    <TH theme={themeObj}>Punctuality</TH>
                    <TH theme={themeObj}>Avg In</TH>
                  </tr>
                </thead>
                <tbody>
                  {topPunctualStaff.length ? topPunctualStaff.map((item) => (
                    <tr key={`punctual-${item.id}`}>
                      <TD theme={themeObj}>
                        <NameCell>
                          <span>{item.name}</span>
                          <SubText theme={themeObj}>#{item.id}</SubText>
                        </NameCell>
                      </TD>
                      <TD theme={themeObj}>{item.role}</TD>
                      <TD theme={themeObj}><BadgePill $tone="success">{item.attendanceRate}%</BadgePill></TD>
                      <TD theme={themeObj}><BadgePill $tone="info">{item.punctualityRate}%</BadgePill></TD>
                      <TD theme={themeObj}>{formatMinutesAsTime(item.avgCheckIn)}</TD>
                    </tr>
                  )) : (
                    <tr>
                      <TD theme={themeObj} colSpan={5}><EmptyState theme={themeObj}>No employee rows match the current filter.</EmptyState></TD>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Panel>

          <Panel theme={themeObj} $span={6}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Logout fontSize="small" /> Checkout and Late Risks</PanelTitle>
              <PanelMeta theme={themeObj}>Employees with missing exits or repeated lateness</PanelMeta>
            </PanelHead>
            <TableWrap theme={themeObj}>
              <Table>
                <thead>
                  <tr>
                    <TH theme={themeObj}>Employee</TH>
                    <TH theme={themeObj}>Role</TH>
                    <TH theme={themeObj}>Late</TH>
                    <TH theme={themeObj}>Missing Out</TH>
                    <TH theme={themeObj}>Avg Out</TH>
                  </tr>
                </thead>
                <tbody>
                  {checkoutRiskStaff.length ? checkoutRiskStaff.map((item) => (
                    <tr key={`risk-${item.id}`}>
                      <TD theme={themeObj}>
                        <NameCell>
                          <span>{item.name}</span>
                          <SubText theme={themeObj}>{item.attendedDays} attended rows</SubText>
                        </NameCell>
                      </TD>
                      <TD theme={themeObj}>{item.role}</TD>
                      <TD theme={themeObj}><BadgePill $tone={item.late > 0 ? 'warning' : 'success'}>{item.late}</BadgePill></TD>
                      <TD theme={themeObj}><BadgePill $tone={item.missingCheckout > 0 ? 'danger' : 'success'}>{item.missingCheckout}</BadgePill></TD>
                      <TD theme={themeObj}>{formatMinutesAsTime(item.avgCheckOut)}</TD>
                    </tr>
                  )) : (
                    <tr>
                      <TD theme={themeObj} colSpan={5}><EmptyState theme={themeObj}>No checkout or lateness risks in the current results.</EmptyState></TD>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Panel>

          <Panel theme={themeObj} $span={12}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Groups fontSize="small" /> Employee Detail Matrix</PanelTitle>
              <PanelMeta theme={themeObj}>Attendance, punctuality, source usage, and average shift behavior per employee</PanelMeta>
            </PanelHead>
            <TableWrap theme={themeObj}>
              <Table>
                <thead>
                  <tr>
                    <TH theme={themeObj}>Employee</TH>
                    <TH theme={themeObj}>Role</TH>
                    <TH theme={themeObj}>Rows</TH>
                    <TH theme={themeObj}>Present</TH>
                    <TH theme={themeObj}>Late</TH>
                    <TH theme={themeObj}>Leave</TH>
                    <TH theme={themeObj}>Attendance %</TH>
                    <TH theme={themeObj}>Punctuality %</TH>
                    <TH theme={themeObj}>Avg In</TH>
                    <TH theme={themeObj}>Avg Out</TH>
                    <TH theme={themeObj}>Avg Work</TH>
                    <TH theme={themeObj}>RFID / Manual</TH>
                  </tr>
                </thead>
                <tbody>
                  {fullTable.length ? fullTable.map((item) => (
                    <tr key={`detail-${item.id}`}>
                      <TD theme={themeObj}>
                        <NameCell>
                          <span>{item.name}</span>
                          <SubText theme={themeObj}>ID {item.id}</SubText>
                        </NameCell>
                      </TD>
                      <TD theme={themeObj}>{item.role}</TD>
                      <TD theme={themeObj}>{item.total}</TD>
                      <TD theme={themeObj}>{item.present + item.halfDay}</TD>
                      <TD theme={themeObj}>{item.late}</TD>
                      <TD theme={themeObj}>
                        {item.leave}
                        {item.paidLeave > 0 ? <SubText theme={themeObj}> / paid {item.paidLeave}</SubText> : null}
                      </TD>
                      <TD theme={themeObj}>
                        <BadgePill $tone={item.attendanceRate >= 85 ? 'success' : item.attendanceRate >= 65 ? 'warning' : 'danger'}>
                          {item.attendanceRate}%
                        </BadgePill>
                      </TD>
                      <TD theme={themeObj}>
                        <BadgePill $tone={item.punctualityRate >= 85 ? 'success' : item.punctualityRate >= 65 ? 'warning' : 'info'}>
                          {item.punctualityRate}%
                        </BadgePill>
                      </TD>
                      <TD theme={themeObj}>{formatMinutesAsTime(item.avgCheckIn)}</TD>
                      <TD theme={themeObj}>{formatMinutesAsTime(item.avgCheckOut)}</TD>
                      <TD theme={themeObj}>{formatDuration(item.avgWorkMinutes)}</TD>
                      <TD theme={themeObj}>{item.rfid} / {item.manual}</TD>
                    </tr>
                  )) : (
                    <tr>
                      <TD theme={themeObj} colSpan={12}><EmptyState theme={themeObj}>No employee attendance analytics available for this selection.</EmptyState></TD>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Panel>
        </LayoutGrid>
      )}
    </Page>
  );
};

export default StaffAttendanceAnalyticsPage;
