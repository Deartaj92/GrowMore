import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  BookOpenCheck,
  Award,
  CalendarRange,
  Users,
  Sparkles,
} from 'lucide-react';
import './QuickActions.css';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Mark Attendance',
      desc: 'Mark attendance for assigned section',
      icon: CalendarCheck,
      color: 'emerald',
      path: '/attendance',
    },
    {
      title: 'Assign Homework',
      desc: 'Publish diary work & reading notes',
      icon: BookOpenCheck,
      color: 'indigo',
      path: '/homework',
    },
    {
      title: 'Record Test Marks',
      desc: 'Enter assessment scores & remarks',
      icon: Award,
      color: 'amber',
      path: '/tests',
    },
    {
      title: 'Apply for Leave',
      desc: 'Submit official faculty time-off request',
      icon: CalendarRange,
      color: 'rose',
      path: '/leave',
    },
    {
      title: 'Class Roster',
      desc: 'View student directory & parent contacts',
      icon: Users,
      color: 'cyan',
      path: '/classes',
    },
  ];

  return (
    <div className="quick-actions-card glass-panel">
      <div className="quick-actions-header">
        <div className="quick-actions-title-group">
          <div className="quick-icon-badge">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="quick-actions-title">Teacher Action Hub</h3>
            <p className="quick-actions-subtitle">Frequent classroom and administrative workflows</p>
          </div>
        </div>
      </div>

      <div className="quick-actions-grid">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              type="button"
              className={`quick-action-btn clay-card quick-action-btn--${act.color}`}
              onClick={() => navigate(act.path)}
            >
              <div className={`quick-action-icon-circle ${act.color}`}>
                <Icon size={20} />
              </div>
              <div className="quick-action-info">
                <span className="quick-action-name">{act.title}</span>
                <span className="quick-action-desc">{act.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
