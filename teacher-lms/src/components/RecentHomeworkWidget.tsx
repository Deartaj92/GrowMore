import React from 'react';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TeacherHomeworkItem } from '../types/teacherSession';
import './RecentHomeworkWidget.css';

interface RecentHomeworkWidgetProps {
  homework: TeacherHomeworkItem[];
}

export const RecentHomeworkWidget: React.FC<RecentHomeworkWidgetProps> = ({ homework }) => {
  const navigate = useNavigate();

  return (
    <div className="homework-widget glass-panel">
      <div className="homework-widget-header">
        <div className="homework-widget-title-group">
          <div className="homework-icon-badge">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="homework-title">Homework Diary & Assignments</h3>
            <p className="homework-subtitle">Recent tasks published to student diaries</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/homework')}
        >
          View All <ArrowRight size={14} />
        </button>
      </div>

      <div className="homework-cards-list">
        {homework.length === 0 ? (
          <div
            style={{
              padding: '2rem 1.5rem',
              textAlign: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-medium)',
              color: 'var(--text-muted)',
            }}
          >
            <BookOpen size={28} style={{ opacity: 0.5, marginBottom: '6px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>No Homework Assigned Yet</div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>All classes are up-to-date with their daily tasks.</div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/homework')}
              style={{ marginTop: '12px' }}
            >
              Post Today's Diary
            </button>
          </div>
        ) : (
          homework.map((hw) => {
            const percent = Math.round((hw.submission_count / hw.total_count) * 100);

            return (
              <div key={hw.id} className="homework-item-card clay-card">
                <div className="homework-item-top">
                  <div className="homework-class-badge">
                    {hw.class_name} · {hw.section_name}
                  </div>
                  <span className="homework-due-date">
                    <Calendar size={13} /> Due {hw.due_date}
                  </span>
                </div>

                <h4 className="homework-item-title">{hw.title}</h4>
                <p className="homework-item-desc">{hw.description}</p>

                <div className="homework-progress-box">
                  <div className="homework-progress-meta">
                    <span className="submission-count-text">
                      Submissions: <strong>{hw.submission_count}</strong> / {hw.total_count}
                    </span>
                    <span className="submission-pct-text">{percent}%</span>
                  </div>
                  <div className="homework-progress-track">
                    <div
                      className="homework-progress-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
