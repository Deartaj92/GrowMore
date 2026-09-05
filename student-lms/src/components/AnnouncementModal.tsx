import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import './AnnouncementModal.css';

export interface AnnouncementItem {
  id: string | number;
  title: string;
  message?: string;
  content?: string;
  footer_text?: string;
  created_at: string;
  hide_dont_show?: boolean;
}

interface AnnouncementModalProps {
  announcements: AnnouncementItem[];
  onClose?: () => void;
  ignoreDismissed?: boolean;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcements,
  onClose,
  ignoreDismissed = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lms_seen_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const activeAnnouncements = ignoreDismissed
    ? announcements
    : announcements.filter((ann) => !dismissedIds.includes(String(ann.id)));

  if (activeAnnouncements.length === 0) return null;

  const currentAnn = activeAnnouncements[currentIndex] || activeAnnouncements[0];
  const bodyText = currentAnn.message || currentAnn.content || '';

  const handleRemindLater = () => {
    if (currentIndex >= activeAnnouncements.length - 1) {
      if (onClose) onClose();
    } else {
      setCurrentIndex((prev) => Math.min(activeAnnouncements.length - 1, prev + 1));
    }
  };

  const handleDontShowAgain = () => {
    const newDismissed = [...dismissedIds, String(currentAnn.id)];
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem('lms_seen_announcements', JSON.stringify(newDismissed));
    } catch (e) {
      console.error(e);
    }

    if (currentIndex >= activeAnnouncements.length - 1) {
      if (onClose) onClose();
    } else {
      setCurrentIndex((prev) => Math.min(activeAnnouncements.length - 1, prev + 1));
    }
  };

  return (
    <div className="lms-announcement-overlay animate-fade-in" onClick={onClose}>
      <div className="lms-announcement-box glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Pagination & Close Header */}
        <div className="lms-announcement-header-meta">
          {activeAnnouncements.length > 1 ? (
            <div className="lms-announcement-nav">
              <button
                type="button"
                className="nav-arrow-btn"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="nav-page-text">
                {currentIndex + 1} / {activeAnnouncements.length}
              </span>
              <button
                type="button"
                className="nav-arrow-btn"
                disabled={currentIndex >= activeAnnouncements.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(activeAnnouncements.length - 1, prev + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div />
          )}
          <button
            type="button"
            className="lms-announcement-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Announcement Header Title */}
        <div className="lms-announcement-header">
          <div
            className="lms-announcement-title ql-editor"
            dangerouslySetInnerHTML={{ __html: currentAnn.title || 'Announcement' }}
          />
        </div>

        {/* Announcement Scrollable Body */}
        <div className="lms-announcement-body ql-editor">
          <div dangerouslySetInnerHTML={{ __html: bodyText }} />
        </div>

        {/* Announcement Footer Highlight */}
        {currentAnn.footer_text && (
          <div className="lms-announcement-footer">
            <div
              className="lms-announcement-footer-highlight ql-editor"
              dangerouslySetInnerHTML={{ __html: currentAnn.footer_text }}
            />
          </div>
        )}

        {/* Announcement Action Buttons matching UserAnnouncements preview */}
        <div className="lms-announcement-actions">
          <button
            type="button"
            className="lms-btn-action lms-btn-primary"
            onClick={handleRemindLater}
          >
            Remind me later
          </button>
          {!currentAnn.hide_dont_show && (
            <button
              type="button"
              className="lms-btn-action lms-btn-secondary"
              onClick={handleDontShowAgain}
            >
              Don't show again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
