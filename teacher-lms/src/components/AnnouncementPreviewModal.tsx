import React, { useEffect } from 'react';
import { X, Clock, EyeOff, ExternalLink, Sparkles, Megaphone, Bell, CalendarCheck } from 'lucide-react';
import './AnnouncementPreviewModal.css';

export interface AnnouncementModalData {
  id: string;
  title: string;
  raw_title?: string;
  message?: string;
  raw_message?: string;
  footer_text?: string | null;
  time?: string;
  priority?: 'normal' | 'important' | 'urgent';
  type?: 'announcement' | 'notice' | 'leave' | 'notification';
  link?: string;
  hide_dont_show?: boolean;
}

interface AnnouncementPreviewModalProps {
  notification: AnnouncementModalData | null;
  onClose: () => void;
  onRemindMeLater?: () => void;
  onDontShowAgain?: () => void;
  onNavigate?: (link: string) => void;
}

export const AnnouncementPreviewModal: React.FC<AnnouncementPreviewModalProps> = ({
  notification,
  onClose,
  onRemindMeLater,
  onDontShowAgain,
  onNavigate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (notification) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notification, onClose]);

  if (!notification) return null;

  const displayTitle = notification.raw_title || notification.title || 'Announcement';
  const displayBody = notification.raw_message || notification.message || '';
  const displayFooter = notification.footer_text;

  const handleRemindMeLater = () => {
    if (onRemindMeLater) onRemindMeLater();
    onClose();
  };

  const handleDontShowAgain = () => {
    if (onDontShowAgain) onDontShowAgain();
    onClose();
  };

  const handleOpenPage = () => {
    if (notification.link && onNavigate) {
      onNavigate(notification.link);
      onClose();
    }
  };

  const getBadgeIcon = () => {
    switch (notification.type) {
      case 'announcement':
        return <Sparkles size={13} className="text-amber" />;
      case 'notice':
        return <Megaphone size={13} className="text-emerald" />;
      case 'leave':
        return <CalendarCheck size={13} className="text-indigo" />;
      default:
        return <Bell size={13} className="text-emerald" />;
    }
  };

  const getBadgeLabel = () => {
    switch (notification.type) {
      case 'announcement':
        return 'Official Announcement';
      case 'notice':
        return 'Faculty Circular';
      case 'leave':
        return 'Leave Update';
      default:
        return 'Notification';
    }
  };

  return (
    <div
      className="announcement-preview-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="announcement-preview-box" onClick={(e) => e.stopPropagation()}>
        {/* Top Gradient Accent Strip */}
        <div className="announcement-top-glow-bar" />

        {/* Header Bar */}
        <div className="announcement-preview-header">
          <div className="announcement-tag-row">
            <span className={`announcement-pill pill-${notification.type || 'announcement'}`}>
              {getBadgeIcon()}
              <span>{getBadgeLabel()}</span>
            </span>
            {notification.time && (
              <span className="announcement-time-tag">
                <Clock size={11} />
                <span>{notification.time}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            className="announcement-preview-close-btn"
            onClick={onClose}
            aria-label="Close preview modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Title Container */}
        <div className="announcement-title-wrapper">
          <div
            className="announcement-preview-title ql-editor"
            dangerouslySetInnerHTML={{ __html: displayTitle }}
          />
        </div>

        {/* Scrollable Body Content */}
        <div className="announcement-preview-body">
          <div
            className="announcement-rich-content ql-editor"
            dangerouslySetInnerHTML={{ __html: displayBody }}
          />

          {/* Celebration / Callout Footer if provided */}
          {displayFooter && (
            <div className="announcement-celebration-card">
              <div
                className="announcement-celebration-content ql-editor"
                dangerouslySetInnerHTML={{ __html: displayFooter }}
              />
            </div>
          )}
        </div>

        {/* Actions Area */}
        <div className="announcement-preview-actions">
          {notification.link ? (
            <>
              <button
                type="button"
                className="announcement-btn announcement-btn-secondary"
                onClick={handleRemindMeLater}
              >
                <Clock size={15} />
                <span>Remind me later</span>
              </button>
              <button
                type="button"
                className="announcement-btn announcement-btn-primary"
                onClick={handleOpenPage}
              >
                <ExternalLink size={15} />
                <span>Open Details</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="announcement-btn announcement-btn-primary"
                onClick={handleRemindMeLater}
              >
                <Clock size={15} />
                <span>Remind me later</span>
              </button>
              {!notification.hide_dont_show && (
                <button
                  type="button"
                  className="announcement-btn announcement-btn-secondary"
                  onClick={handleDontShowAgain}
                >
                  <EyeOff size={15} />
                  <span>Don't show again</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPreviewModal;
