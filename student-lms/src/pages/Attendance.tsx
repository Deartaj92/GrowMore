import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import { supabase } from '../services/supabase';
import {
  UserCheck,
  UserMinus,
  Clock,
  Briefcase,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Percent,
  CalendarDays,
  TrendingUp,
  Flame,
  Split,
} from 'lucide-react';
import { StatBlock } from '../components/StatBlock';
import { PageLoader } from '../components/GrowMoreLoader';
import {
  DonutRing,
  HorizontalBarChart,
  MonthlyBarChart,
  WeekStrip,
  StackedStatusBar,
} from '../components/AttendanceCharts';
import { computeAttendanceAnalytics } from '../utils/attendanceAnalytics';
import './Attendance.css';

const LOGS_DISPLAY_LIMIT = 15;

export const Attendance: React.FC = () => {
  const { student } = useAuth();
  const { getAttendanceData, loading } = useStudentData();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [halfLeaves, setHalfLeaves] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (student) {
      supabase
        .from('sessions')
        .select('*')
        .eq('school_id', student.school_id)
        .order('start_date', { ascending: false })
        .then(({ data }) => {
          if (data) {
            setSessions(data);
            const active = data.find((s) => s.is_active);
            if (active) setSelectedSession(active.id);
            else if (data.length > 0) setSelectedSession(data[0].id);
          }
        });
    }
  }, [student]);

  useEffect(() => {
    if (student && selectedSession !== null) {
      getAttendanceData(student.id, student.school_id, selectedSession).then((data: any) => {
        if (data) {
          setAttendanceRecords(data.records);
          setHalfLeaves(data.halfLeaves);
          setStats(data.stats);
        }
      });
    }
  }, [student, selectedSession, getAttendanceData]);

  const analytics = useMemo(
    () => computeAttendanceAnalytics(attendanceRecords, halfLeaves),
    [attendanceRecords, halfLeaves]
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysNum = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysNum };
  };

  const changeMonth = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (dir === 'prev') next.setMonth(prev.getMonth() - 1);
      else next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const getRecordForDate = (dayNum: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const record = attendanceRecords.find((r) => r.date === dateStr);
    const halfLeave = halfLeaves.find((hl) => hl.date === dateStr);
    return { record, halfLeave };
  };

  const renderCalendarDays = () => {
    const { firstDay, daysNum } = getDaysInMonth(currentDate);
    const dayCells = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < firstDay; i++) {
      dayCells.push(<div key={`blank-${i}`} className="calendar-day blank"></div>);
    }

    for (let day = 1; day <= daysNum; day++) {
      const { record, halfLeave } = getRecordForDate(day);
      let statusClass = 'unmarked';

      if (record) {
        statusClass = record.status.toLowerCase();
      }

      const isToday =
        new Date().toDateString() ===
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

      dayCells.push(
        <div
          key={`day-${day}`}
          className={`calendar-day status-${statusClass} ${isToday ? 'today' : ''}`}
        >
          <span className="day-number">{day}</span>
          {record && <span className="day-dot"></span>}
          {halfLeave && (
            <span className="half-leave-indicator" title="Half leave recorded"></span>
          )}
        </div>
      );
    }

    return { weekdays, dayCells };
  };

  const filteredLogs = attendanceRecords.filter((record) => {
    if (filterStatus === 'all') return true;
    return record.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const visibleLogs = filteredLogs.slice(0, LOGS_DISPLAY_LIMIT);
  const hasMoreLogs = filteredLogs.length > LOGS_DISPLAY_LIMIT;

  const { weekdays, dayCells } = renderCalendarDays();

  const monthSummary = analytics.currentMonth;

  if (loading || !student || !stats) {
    return (
      <PageLoader message="Loading attendance…" />
    );
  }

  return (
    <div className="attendance-page">
      <div className="attendance-top-bar glass-panel">
        <div className="session-selector-wrapper">
          <label htmlFor="session-select">Select Academic Session:</label>
          <select
            id="session-select"
            value={selectedSession || ''}
            onChange={(e) => setSelectedSession(Number(e.target.value))}
            className="input-field session-select"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <StatBlock
          variant="blue"
          icon={Percent}
          value={`${stats.percentage}%`}
          label="Attendance rate"
          className="stat-block--inline"
        />
      </div>

      <div className="stat-blocks">
        <StatBlock
          variant="green"
          icon={UserCheck}
          value={`${stats.present}/${stats.total}`}
          label="Present"
        />
        <StatBlock
          variant="red"
          icon={UserMinus}
          value={`${stats.absent}/${stats.total}`}
          label="Absent"
        />
        <StatBlock
          variant="amber"
          icon={Clock}
          value={`${stats.late}/${stats.total}`}
          label="Late"
        />
        <StatBlock
          variant="purple"
          icon={Briefcase}
          value={`${stats.leave}/${stats.total}`}
          label="Leave"
        />
        {stats.halfLeaves > 0 && (
          <StatBlock
            variant="teal"
            icon={Split}
            value={stats.halfLeaves}
            label="Half-leaves"
          />
        )}
      </div>

      {/* Analytics: ring + breakdown + insights */}
      <div className="attendance-analytics-grid">
        <section className="att-chart-card glass-panel att-chart-card--overview">
          <h3 className="att-chart-title">Overview</h3>
          <div className="att-overview-body">
            <DonutRing
              percentage={analytics.stats.percentage}
              label="Rate"
              sublabel={`${analytics.stats.total} days marked`}
            />
            <div className="att-overview-side">
              <StackedStatusBar
                present={analytics.stats.present}
                absent={analytics.stats.absent}
                late={analytics.stats.late}
                leave={analytics.stats.leave}
              />
              <div className="att-overview-legend">
                <span><i className="dot present" /> Present {analytics.stats.present}</span>
                <span><i className="dot absent" /> Absent {analytics.stats.absent}</span>
                <span><i className="dot late" /> Late {analytics.stats.late}</span>
                <span><i className="dot leave" /> Leave {analytics.stats.leave}</span>
              </div>
              {analytics.insights.needsAttention && (
                <p className="att-insight-warn">
                  <AlertTriangle size={14} />
                  {analytics.insights.needsAttention}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="att-chart-card glass-panel">
          <h3 className="att-chart-title">Status breakdown</h3>
          <p className="att-chart-desc">Count and share of each status for this session</p>
          <HorizontalBarChart items={analytics.statusBars} total={analytics.stats.total} />
        </section>

        <section className="att-chart-card glass-panel">
          <h3 className="att-chart-title">
            <TrendingUp size={16} />
            Monthly trend
          </h3>
          <p className="att-chart-desc">Attendance rate by month (last 6 months)</p>
          <MonthlyBarChart months={analytics.monthly} />
        </section>

        <section className="att-chart-card glass-panel att-chart-card--insights">
          <h3 className="att-chart-title">Quick insights</h3>
          <ul className="att-insights-list">
            <li>
              <CalendarDays size={16} />
              <div>
                <span className="att-insight-lbl">This month</span>
                <span className="att-insight-val">
                  {analytics.insights.daysMarkedThisMonth} days marked
                  {monthSummary ? ` · ${monthSummary.rate}% rate` : ''}
                </span>
              </div>
            </li>
            {analytics.presentStreak > 0 && (
              <li>
                <Flame size={16} />
                <div>
                  <span className="att-insight-lbl">Present streak</span>
                  <span className="att-insight-val">
                    {analytics.presentStreak} day{analytics.presentStreak === 1 ? '' : 's'} in a row
                  </span>
                </div>
              </li>
            )}
            {analytics.insights.bestMonth && (
              <li>
                <TrendingUp size={16} />
                <div>
                  <span className="att-insight-lbl">Best month</span>
                  <span className="att-insight-val">
                    {analytics.insights.bestMonth.label} ({analytics.insights.bestMonth.rate}%)
                  </span>
                </div>
              </li>
            )}
            {stats.halfLeaves > 0 && (
              <li>
                <Split size={16} />
                <div>
                  <span className="att-insight-lbl">Half-leaves</span>
                  <span className="att-insight-val">{stats.halfLeaves} recorded in session</span>
                </div>
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="att-week-panel glass-panel">
        <div className="att-week-header">
          <h3 className="att-chart-title">Last 7 days</h3>
          <p className="att-chart-desc">Daily status at a glance</p>
        </div>
        <WeekStrip days={analytics.last7Days} />
      </section>

      <div className="attendance-layout-grid">
        <div className="calendar-section glass-panel">
          <div className="calendar-header">
            <h3>Monthly Attendance Grid</h3>
            <div className="calendar-month-toggle">
              <button onClick={() => changeMonth('prev')} className="month-toggle-btn" type="button">
                <ChevronLeft size={18} />
              </button>
              <span className="month-name">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth('next')} className="month-toggle-btn" type="button">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {weekdays.map((d) => (
              <div key={d} className="weekday-lbl">
                {d}
              </div>
            ))}
          </div>
          <div className="calendar-days-grid">{dayCells}</div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot status-present"></span>
              <span>Present</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot status-absent"></span>
              <span>Absent</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot status-late"></span>
              <span>Late</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot status-leave"></span>
              <span>On Leave</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot status-unmarked"></span>
              <span>Unmarked</span>
            </div>
          </div>
        </div>

        <div className="logs-section glass-panel">
          <div className="logs-header">
            <h3>Detailed Logs</h3>
            <div className="logs-filter-group">
              <button
                type="button"
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-btn present ${filterStatus === 'present' ? 'active' : ''}`}
                onClick={() => setFilterStatus('present')}
              >
                Present
              </button>
              <button
                type="button"
                className={`filter-btn absent ${filterStatus === 'absent' ? 'active' : ''}`}
                onClick={() => setFilterStatus('absent')}
              >
                Absent
              </button>
              <button
                type="button"
                className={`filter-btn late ${filterStatus === 'late' ? 'active' : ''}`}
                onClick={() => setFilterStatus('late')}
              >
                Late
              </button>
              <button
                type="button"
                className={`filter-btn leave ${filterStatus === 'leave' ? 'active' : ''}`}
                onClick={() => setFilterStatus('leave')}
              >
                Leave
              </button>
            </div>
          </div>

          <p className="logs-limit-hint">
            Showing latest {LOGS_DISPLAY_LIMIT} days
            {hasMoreLogs ? ` (${filteredLogs.length} total in filter)` : ''}
          </p>

          <div className="logs-list" role="list">
            {visibleLogs.length === 0 ? (
              <div className="empty-logs">
                <AlertTriangle size={32} className="text-muted" />
                <p>No matching attendance logs found.</p>
              </div>
            ) : (
              visibleLogs.map((r) => {
                const hl = halfLeaves.find((h) => h.date === r.date);
                return (
                  <div key={r.id} className={`log-item log-status-${r.status.toLowerCase()}`}>
                    <div className="log-info">
                      <span className="log-date">
                        {new Date(r.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {r.remarks && <p className="log-remarks">Remarks: {r.remarks}</p>}
                      {hl && (
                        <div className="log-half-leave">
                          <span className="hl-label">Half-Leave:</span> {hl.leave_type}
                          {hl.arrival_time && ` | In: ${hl.arrival_time}`}
                          {hl.departure_time && ` | Out: ${hl.departure_time}`}
                        </div>
                      )}
                    </div>
                    <div className="log-status-lbl">{r.status}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
