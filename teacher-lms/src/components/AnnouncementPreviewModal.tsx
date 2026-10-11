import React, { useEffect } from 'react';
import { X, Clock, EyeOff, ExternalLink, AlertCircle, Bell, Calendar } from 'lucide-react';
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

  return (
    <div className="announcement-preview-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="announcement-preview-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="announcement-preview-header">
          <div
            className="announcement-preview-title ql-editor"
            dangerouslySetInnerHTML={{ __html: displayTitle }}
          />
          <button
            type="button"
            className="announcement-preview-close-btn"
            onClick={onClose}
            aria-label="Close notification preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="announcement-preview-body">
          {/* Metadata pill bar */}
          <div className="announcement-preview-meta">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} />
              {notification.time || 'Recent'}
            </span>
            <span
              className={`badge ${
                notification.priority === 'urgent'
                  ? 'badge-rose'
                  : notification.priority === 'important'
                  ? 'badge-amber'
                  : 'badge-emerald'
              }`}
              style={{ fontSize: '0.68rem', padding: '1px 7px', textTransform: 'capitalize' }}
            >
              {notification.type || 'Notice'}
            </span>
          </div>

          {/* Rich Body Content */}
          <div
            className="ql-editor"
            dangerouslySetInnerHTML={{ __html: displayBody }}
          />
        </div>

        {/* Optional Footer Highlight */}
        {displayFooter && (
          <div className="announcement-preview-footer">
            <div
              className="announcement-preview-footer-highlight ql-editor"
              dangerouslySetInnerHTML={{ __html: displayFooter }}
            />
          </div>
        )}

        {/* Actions matching main app: Remind me later & Don't show again */}
        <div className="announcement-preview-actions">
          {notification.link ? (
            <>
              <button
                type="button"
                className="announcement-preview-btn secondary"
                onClick={handleRemindMeLater}
              >
                <Clock size={14} />
                Remind me later
              </button>
              <button
                type="button"
                className="announcement-preview-btn primary"
                onClick={handleOpenPage}
              >
                <ExternalLink size={14} />
                Open Details
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="announcement-preview-btn secondary"
                onClick={handleRemindMeLater}
              >
                <Clock size={14} />
                Remind me later
              </button>
              {!notification.hide_dont_show && (
                <button
                  type="button"
                  className="announcement-preview-btn primary"
                  onClick={handleDontShowAgain}
                >
                  <EyeOff size={14} />
                  Don't show again
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
