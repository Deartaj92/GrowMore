import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, Cancel as XCircle, Info as InfoIcon, Warning as WarningIcon } from '@mui/icons-material';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

export const useToast = () => useContext(ToastContext);

// Comprehensive dictionary of verbose message mappings across all app pages
const MESSAGE_SHORTENER_MAP: Array<[RegExp, string]> = [
  // Common validation & form prompts
  [/^please fill in all (highlighted )?required fields$/i, 'Required fields missing'],
  [/^please complete all required fields highlighted in red$/i, 'Required fields missing'],
  [/^please enter a detailed description$/i, 'Description required'],
  [/^please select at least one (.+)$/i, 'Select at least one $1'],
  [/^user school information not found$/i, 'School info missing'],
  [/^active session not found.*$/i, 'No active session'],
  [/^no active session found$/i, 'No active session'],

  // Report creation & operations
  [/^successfully created (\d+) student reports?$/i, '$1 Student reports created'],
  [/^successfully created (\d+) staff reports?$/i, '$1 Staff reports created'],
  [/^updated status for (\d+) late comers to (.+)$/i, '$1 Late comers → $2'],

  // User management & authentication
  [/^user permissions saved successfully$/i, 'Permissions saved'],
  [/^user permissions reset to role defaults successfully$/i, 'Permissions reset'],
  [/^parent updated successfully$/i, 'Parent updated'],
  [/^password updated successfully$/i, 'Password updated'],
  [/^password reset to default \((.+)\)$/i, 'Password reset ($1)'],
  [/^user deleted successfully$/i, 'User deleted'],

  // Downloads & Exporting
  [/^generating pdf\.\.\. please wait\.?$/i, 'Generating PDF...'],
  [/^pdf exported successfully$/i, 'PDF exported'],
  [/^excel exported successfully$/i, 'Excel exported'],

  // Generic patterns across all pages
  [/^failed to (fetch|load) (.+)$/i, '$2 load failed'],
  [/^failed to (create|save|update|delete) (.+)$/i, '$2 $1 failed'],
  [/^(.+) (created|updated|saved|deleted) successfully$/i, '$1 $2'],
  [/^successfully (saved|created|updated|deleted) (.+)$/i, '$2 $1'],
  [/^an error occurred while (saving|updating|deleting|loading) (.+)$/i, '$2 $1 failed'],
  [/^operation completed successfully$/i, 'Completed']
];

// Smart Message Shortener for clean mobile toast pills across all pages
const formatToastMessage = (rawMsg: string): { title: string; sub?: string } => {
  if (!rawMsg) return { title: 'Notification' };

  let msg = rawMsg.trim();

  // Apply mapped short replacements
  for (const [pattern, replacement] of MESSAGE_SHORTENER_MAP) {
    if (pattern.test(msg)) {
      msg = msg.replace(pattern, replacement);
      break;
    }
  }

  // Handle "Title: Subtitle" format
  if (msg.includes(': ')) {
    const parts = msg.split(': ');
    const title = parts[0].length > 28 ? parts[0].substring(0, 26) + '...' : parts[0];
    const sub = parts.slice(1).join(': ');
    const shortSub = sub.length > 36 ? sub.substring(0, 33) + '...' : sub;
    return { title, sub: shortSub };
  }

  // Truncate overly long single-line messages for mobile screens
  const shortTitle = msg.length > 40 ? msg.substring(0, 37) + '...' : msg;
  return { title: shortTitle };
};

export const ToastProvider: React.FC<{ children: React.ReactNode, theme: 'dark' | 'light', muted?: boolean }> = ({ children, theme, muted = false }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = toastId.current++;
    setToasts(prev => [...prev, { msg, type, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);

    // Play sound cues
    if (!muted) {
      if (type === 'success' || type === 'info') {
        const audio = new window.Audio(`${process.env.PUBLIC_URL || '.'}/success.mp3`);
        audio.volume = 0.7;
        audio.play().catch(() => { });
      } else if (type === 'error' || type === 'warning') {
        const audio = new window.Audio(`${process.env.PUBLIC_URL || '.'}/error.mp3`);
        audio.volume = 0.7;
        audio.play().catch(() => { });
      }
    }
  }, [muted]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && ReactDOM.createPortal(
        <>
          {/* Android-Style Bottom-Center Container */}
          <div className="gm-android-toast-container">
            {toasts.map(t => {
              const { title, sub } = formatToastMessage(t.msg);

              // Lighter, pleasant glassmorphic background colors based on message type
              let bgStyle = 'linear-gradient(135deg, rgba(16, 185, 129, 0.92) 0%, rgba(5, 150, 105, 0.94) 100%)'; // Emerald Green
              let shadowColor = 'rgba(16, 185, 129, 0.35)';

              if (t.type === 'error') {
                bgStyle = 'linear-gradient(135deg, rgba(239, 68, 68, 0.92) 0%, rgba(220, 38, 38, 0.94) 100%)'; // Rose Red
                shadowColor = 'rgba(239, 68, 68, 0.35)';
              } else if (t.type === 'warning') {
                bgStyle = 'linear-gradient(135deg, rgba(245, 158, 11, 0.92) 0%, rgba(217, 119, 6, 0.94) 100%)'; // Amber Orange
                shadowColor = 'rgba(245, 158, 11, 0.35)';
              } else if (t.type === 'info') {
                bgStyle = 'linear-gradient(135deg, rgba(59, 130, 246, 0.92) 0%, rgba(37, 99, 235, 0.94) 100%)'; // Royal Blue
                shadowColor = 'rgba(59, 130, 246, 0.35)';
              }

              return (
                <div 
                  key={t.id} 
                  className="gm-android-toast-pill"
                  style={{
                    background: bgStyle,
                    boxShadow: `0 8px 24px -4px ${shadowColor}, 0 0 0 1px rgba(255, 255, 255, 0.22)`
                  }}
                >
                  {/* Status Icon */}
                  <div 
                    className="gm-toast-icon-badge"
                    style={{ background: 'rgba(255, 255, 255, 0.22)' }}
                  >
                    {t.type === 'success' && <CheckCircle style={{ color: '#ffffff', fontSize: 14 }} />}
                    {t.type === 'error' && <XCircle style={{ color: '#ffffff', fontSize: 14 }} />}
                    {t.type === 'warning' && <WarningIcon style={{ color: '#ffffff', fontSize: 14 }} />}
                    {t.type === 'info' && <InfoIcon style={{ color: '#ffffff', fontSize: 14 }} />}
                  </div>

                  {/* Toast Text */}
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div className="gm-toast-title">
                      {title}
                    </div>
                    {sub && (
                      <div className="gm-toast-sub">
                        {sub}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <style>{`
            .gm-android-toast-container {
              position: fixed;
              bottom: 40px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 110000;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 6px;
              pointer-events: none;
              max-width: calc(100vw - 32px);
              width: max-content;
            }

            .gm-android-toast-pill {
              color: #ffffff;
              padding: 7px 16px;
              border-radius: 24px;
              backdrop-filter: blur(14px);
              -webkit-backdrop-filter: blur(14px);
              animation: android-toast-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
              pointer-events: auto;
              display: flex;
              align-items: center;
              gap: 8px;
              max-width: 420px;
              will-change: transform, opacity;
            }

            .gm-toast-icon-badge {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }

            .gm-toast-title {
              font-size: 0.8rem;
              font-weight: 800;
              color: #ffffff;
              line-height: 1.25;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .gm-toast-sub {
              font-size: 0.72rem;
              color: rgba(255, 255, 255, 0.88);
              margin-top: 1px;
              line-height: 1.15;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            @media (max-width: 600px) {
              .gm-android-toast-container {
                bottom: 28px;
                max-width: calc(100vw - 24px);
              }
              .gm-android-toast-pill {
                padding: 6px 14px;
                border-radius: 20px;
                gap: 7px;
              }
              .gm-toast-title {
                font-size: 0.76rem;
              }
              .gm-toast-sub {
                font-size: 0.68rem;
              }
            }

            @keyframes android-toast-in {
              0% { transform: translateY(20px) scale(0.92); opacity: 0; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
};