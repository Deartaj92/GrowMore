import React from 'react';
import type { MonthBucket, StatusBarItem, WeekDayBucket } from '../utils/attendanceAnalytics';
import './AttendanceCharts.css';

type DonutRingProps = {
  percentage: number;
  size?: number;
  label?: string;
  sublabel?: string;
};

export const DonutRing: React.FC<DonutRingProps> = ({
  percentage,
  size = 120,
  label = 'Attendance',
  sublabel,
}) => {
  const clamped = Math.min(100, Math.max(0, percentage));
  const ringStyle = {
    width: size,
    height: size,
    background: `conic-gradient(var(--primary) ${clamped * 3.6}deg, var(--bg-secondary) 0deg)`,
  } as React.CSSProperties;

  return (
    <div className="att-donut" style={{ width: size, height: size }}>
      <div className="att-donut-ring" style={ringStyle} aria-hidden />
      <div className="att-donut-center">
        <span className="att-donut-value">{clamped}%</span>
        <span className="att-donut-label">{label}</span>
        {sublabel && <span className="att-donut-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
};

type HorizontalBarChartProps = {
  items: StatusBarItem[];
  total: number;
};

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ items, total }) => (
  <div className="att-h-bars" role="img" aria-label="Attendance breakdown by status">
    {items.map((item) => (
      <div key={item.key} className="att-h-bar-row">
        <div className="att-h-bar-meta">
          <span className="att-h-bar-label">{item.label}</span>
          <span className="att-h-bar-counts">
            <strong>{item.count}</strong>
            <span className="att-h-bar-sep">·</span>
            {item.percent}%
            {total > 0 && (
              <span className="att-h-bar-of"> of {total}</span>
            )}
          </span>
        </div>
        <div className="att-h-bar-track">
          <div
            className="att-h-bar-fill"
            style={{ width: `${item.percent}%`, backgroundColor: item.color }}
          />
        </div>
      </div>
    ))}
  </div>
);

type MonthlyBarChartProps = {
  months: MonthBucket[];
};

export const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ months }) => {
  if (months.length === 0) {
    return <p className="att-chart-empty">No monthly data for this session yet.</p>;
  }

  const maxRate = Math.max(...months.map((m) => m.rate), 1);

  return (
    <div className="att-v-bars" role="img" aria-label="Monthly attendance rate">
      {months.map((m) => (
        <div key={m.key} className="att-v-bar-col">
          <span className="att-v-bar-value">{m.rate}%</span>
          <div className="att-v-bar-track">
            <div
              className="att-v-bar-fill"
              style={{ height: `${(m.rate / maxRate) * 100}%` }}
              title={`${m.label}: ${m.rate}% (${m.total} days)`}
            />
          </div>
          <span className="att-v-bar-label">{m.label}</span>
          <span className="att-v-bar-sub">{m.total}d</span>
        </div>
      ))}
    </div>
  );
};

type WeekStripProps = {
  days: WeekDayBucket[];
};

const statusClass = (status: string | null) => {
  if (!status) return 'none';
  return status;
};

export const WeekStrip: React.FC<WeekStripProps> = ({ days }) => (
  <div className="att-week-strip" role="img" aria-label="Last 7 days attendance">
    {days.map((d) => (
      <div key={d.date} className="att-week-day">
        <div className={`att-week-pill status-${statusClass(d.status)}`} title={d.status ?? 'No record'} />
        <span className="att-week-lbl">{d.label}</span>
      </div>
    ))}
  </div>
);

type StackedBarProps = {
  present: number;
  absent: number;
  late: number;
  leave: number;
};

export const StackedStatusBar: React.FC<StackedBarProps> = ({ present, absent, late, leave }) => {
  const total = present + absent + late + leave;
  if (total === 0) {
    return <div className="att-stacked att-stacked--empty">No records</div>;
  }

  const segments = [
    { key: 'present', count: present, color: 'var(--status-present)' },
    { key: 'absent', count: absent, color: 'var(--status-absent)' },
    { key: 'late', count: late, color: 'var(--status-late)' },
    { key: 'leave', count: leave, color: 'var(--status-leave)' },
  ].filter((s) => s.count > 0);

  return (
    <div className="att-stacked" role="img" aria-label="Session composition">
      {segments.map((s) => (
        <div
          key={s.key}
          className={`att-stacked-seg seg-${s.key}`}
          style={{ flex: s.count, backgroundColor: s.color }}
          title={`${s.key}: ${s.count}`}
        />
      ))}
    </div>
  );
};
