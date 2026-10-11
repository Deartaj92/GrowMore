import React from 'react';
import { Clock, MapPin, CheckCircle2, PlayCircle, BookOpen } from 'lucide-react';
import type { TeacherPeriod } from '../types/teacherSession';
import './TimetableTimeline.css';

interface TimetableTimelineProps {
  periods: TeacherPeriod[];
  onSelectPeriod?: (period: TeacherPeriod) => void;
}

export const TimetableTimeline: React.FC<TimetableTimelineProps> = ({
  periods,
  onSelectPeriod,
}) => {
  return (
    <div className="timeline-widget glass-panel">
      <div className="timeline-widget-header">
        <div className="timeline-widget-title-group">
          <div className="timeline-icon-badge">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="timeline-title">Today's Class Schedule</h3>
            <p className="timeline-subtitle">Chronological periods and room allocations</p>
          </div>
        </div>
        <span className="badge badge-indigo">
          {periods.length} Periods Scheduled
        </span>
      </div>

      <div className="timeline-list">
        {periods.length === 0 ? (
          <div className="timeline-empty-notice clay-card">
            <Clock size={28} className="empty-clock-icon" />
            <p className="empty-notice-title">No Timetable Periods Configured</p>
            <span className="empty-notice-sub">
              No period slots are assigned to your profile for the current academic session.
            </span>
          </div>
        ) : (
          periods.map((period) => {
          const isCurrent = period.is_current;
          const isCompleted = period.is_completed;

          return (
            <div
              key={period.id}
              className={`timeline-item ${isCurrent ? 'is-current' : ''} ${
                isCompleted ? 'is-completed' : ''
              }`}
              onClick={() => onSelectPeriod?.(period)}
            >
              <div className="timeline-time-col">
                <span className="timeline-start-time">{period.start_time}</span>
                <span className="timeline-end-time">{period.end_time}</span>
              </div>

              <div className="timeline-node">
                {isCompleted ? (
                  <CheckCircle2 size={16} className="timeline-status-icon completed" />
                ) : isCurrent ? (
                  <span className="timeline-status-pulse" />
                ) : (
                  <span className="timeline-status-dot" />
                )}
                <div className="timeline-track-line" />
              </div>

              <div className="timeline-card clay-card">
                <div className="timeline-card-top">
                  <div className="timeline-period-badge">
                    Period {period.period_number}
                  </div>
                  {isCurrent && (
                    <span className="badge badge-emerald live-badge">
                      <PlayCircle size={12} /> Live Period
                    </span>
                  )}
                  {isCompleted && (
                    <span className="badge badge-neutral">Completed</span>
                  )}
                </div>

                <div className="timeline-card-content">
                  <h4 className="timeline-subject">
                    <BookOpen size={15} />
                    {period.subject_name}
                  </h4>
                  <div className="timeline-meta-row">
                    <span className="timeline-class-tag">
                      {period.class_name} ({period.section_name})
                    </span>
                    {period.room && (
                      <span className="timeline-room-tag">
                        <MapPin size={13} /> {period.room}
                      </span>
                    )}
                  </div>
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
