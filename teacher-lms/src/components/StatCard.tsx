import React from 'react';
import type { LucideIcon } from 'lucide-react';
import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'indigo' | 'amber' | 'cyan' | 'rose';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'emerald',
  trend,
}) => {
  return (
    <div className={`stat-card clay-card stat-card--${variant}`}>
      <div className="stat-card-header">
        <div className={`stat-icon-box stat-icon-box--${variant}`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
        {trend && (
          <span className={`stat-trend-pill ${trend.isPositive ? 'positive' : 'neutral'}`}>
            {trend.value}
          </span>
        )}
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {subtext && <div className="stat-card-subtext">{subtext}</div>}
      </div>

      <div className={`stat-card-glow stat-card-glow--${variant}`} />
    </div>
  );
};
