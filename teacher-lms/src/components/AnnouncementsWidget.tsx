import React from 'react';
import { Bell, AlertTriangle, Info, Calendar } from 'lucide-react';
import type { TeacherAnnouncement } from '../types/teacherSession';
import './AnnouncementsWidget.css';

interface AnnouncementsWidgetProps {
  announcements: TeacherAnnouncement[];
}

export const AnnouncementsWidget: React.FC<AnnouncementsWidgetProps> = ({
  announcements,
}) => {
  return (
    <div className="announcements-widget glass-panel">
      <div className="announcements-widget-header">
        <div className="announcements-widget-title-group">
          <div className="announcements-icon-badge">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="announcements-title">Faculty Notice Board</h3>
            <p className="announcements-subtitle">Official school circulars and staff updates</p>
          </div>
        </div>
      </div>

      <div className="announcements-list">
        {announcements.map((ann) => {
          const isUrgent = ann.priority === 'urgent';
          const isImportant = ann.priority === 'important';

          return (
            <div
              key={ann.id}
              className={`announcement-item clay-card ${
                isUrgent ? 'urgent' : isImportant ? 'important' : 'normal'
              }`}
            >
              <div className="announcement-item-top">
                <span
                  className={`badge ${
                    isUrgent
                      ? 'badge-rose'
                      : isImportant
                      ? 'badge-amber'
                      : 'badge-emerald'
                  }`}
                >
                  {isUrgent ? (
                    <>
                      <AlertTriangle size={12} /> Urgent Notice
                    </>
                  ) : isImportant ? (
                    <>
                      <Info size={12} /> Important
                    </>
                  ) : (
                    'General Circular'
                  )}
                </span>
                <span className="announcement-date">
                  <Calendar size={13} /> {ann.date}
                </span>
              </div>

              <h4 className="announcement-item-title">{ann.title}</h4>
              <p className="announcement-item-content">{ann.content}</p>

              {ann.target_audience && (
                <div className="announcement-target-tag">
                  Target: <span>{ann.target_audience}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
