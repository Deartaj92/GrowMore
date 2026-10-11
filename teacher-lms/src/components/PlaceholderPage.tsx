import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, CheckCircle2, Sparkles, Layers } from 'lucide-react';
import './PlaceholderPage.css';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  badge?: string;
  plannedFeatures: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge = 'Next Phase Module',
  plannedFeatures,
}) => {
  const navigate = useNavigate();

  return (
    <div className="placeholder-page">
      <div className="placeholder-hero glass-panel">
        <div className="placeholder-top-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <span className="badge badge-emerald">
            <Sparkles size={12} /> {badge}
          </span>
        </div>

        <div className="placeholder-main">
          <div className="placeholder-icon-wrap">
            <Icon size={38} />
          </div>
          <div className="placeholder-text-wrap">
            <h2 className="placeholder-title">{title}</h2>
            <p className="placeholder-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="placeholder-status-banner">
          <div className="status-indicator-dot" />
          <span>
            Menu routing & layout integration complete. This dedicated module will be added next.
          </span>
        </div>
      </div>

      <div className="placeholder-features-card glass-panel">
        <div className="features-card-header">
          <div className="features-icon-badge">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="features-card-title">Planned Capabilities for this Module</h3>
            <p className="features-card-subtitle">
              Features engineered for the upcoming page implementation
            </p>
          </div>
        </div>

        <div className="features-list-grid">
          {plannedFeatures.map((feat, i) => (
            <div key={i} className="feature-item clay-card">
              <CheckCircle2 size={18} className="feature-check-icon" />
              <span className="feature-text">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
