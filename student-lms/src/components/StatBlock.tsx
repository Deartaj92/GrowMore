import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export type StatVariant = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'teal' | 'slate';

type StatBlockProps = {
  variant: StatVariant;
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  hint?: string;
  to?: string;
  href?: string;
  className?: string;
  valueClassName?: string;
};

export const StatBlock: React.FC<StatBlockProps> = ({
  variant,
  icon: Icon,
  value,
  label,
  hint,
  to,
  href,
  className = '',
  valueClassName = '',
}) => {
  const classes = `stat-block stat-block--${variant} ${className}`.trim();

  const body = (
    <>
      <div className="stat-block-head">
        <span className="stat-block-icon" aria-hidden>
          <Icon size={18} strokeWidth={2.25} />
        </span>
        <span className={`stat-block-value ${valueClassName}`.trim()}>{value}</span>
      </div>
      <span className="stat-block-label">{label}</span>
      {hint ? <span className="stat-block-hint">{hint}</span> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes}>
        {body}
      </a>
    );
  }

  return <div className={classes}>{body}</div>;
};
