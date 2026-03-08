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

export const ToastProvider: React.FC<{ children: React.ReactNode, theme: 'dark' | 'light', muted?: boolean }> = ({ children, theme, muted = false }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = toastId.current++;
    setToasts(prev => [...prev, { msg, type, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);

    // Play sounds
    if (!muted) {
      if (type === 'success' || type === 'info') {
        const audio = new window.Audio(`${process.env.PUBLIC_URL || '.'}/success.mp3`);
        audio.volume = 1.0;
        audio.play().catch(() => { });
      } else if (type === 'error' || type === 'warning') {
        const audio = new window.Audio(`${process.env.PUBLIC_URL || '.'}/error.mp3`);
        audio.volume = 1.0;
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
          <div style={{
            position: 'fixed',
            top: 32,
            right: 32,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '12px',
            pointerEvents: 'none'
          }}>
            {toasts.map(t => {
              // Parse out title and sub string if it follows the "Title: Sub" or "Title: Sub • Sub2" convention
              let title = t.msg;
              let sub = '';
              if (t.msg.includes(': ')) {
                const parts = t.msg.split(': ');
                title = parts[0];
                sub = parts.slice(1).join(': ');
              }

              // Determine deep, vibrant colored backgrounds for both Light and Dark themes
              // This fixes the "white bg" issue by making it actively colored!
              let bgColor, iconColor, iconBg;

              if (t.type === 'error') {
                bgColor = theme === 'dark' ? 'rgba(220, 38, 38, 0.85)' : 'rgba(239, 68, 68, 0.9)';
                iconColor = '#fff';
                iconBg = 'rgba(255, 255, 255, 0.2)';
              } else if (t.type === 'warning') {
                bgColor = theme === 'dark' ? 'rgba(217, 119, 6, 0.85)' : 'rgba(245, 158, 11, 0.9)'; // Orange/Amber
                iconColor = '#fff';
                iconBg = 'rgba(255, 255, 255, 0.2)';
              } else if (t.type === 'info') {
                bgColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.85)' : 'rgba(59, 130, 246, 0.9)'; // Blue
                iconColor = '#fff';
                iconBg = 'rgba(255, 255, 255, 0.2)';
              } else {
                // Default Success
                bgColor = theme === 'dark' ? 'rgba(22, 163, 74, 0.85)' : 'rgba(34, 197, 94, 0.9)'; // Green
                iconColor = '#fff';
                iconBg = 'rgba(255, 255, 255, 0.2)';
              }

              return (
                <div
                  key={t.id}
                  style={{
                    minWidth: 200,
                    maxWidth: 380,
                    background: bgColor,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px -8px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    animation: 'gm-toast-in 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards',
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    willChange: 'transform, opacity'
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {t.type === 'success' && <CheckCircle style={{ color: iconColor, fontSize: 18 }} />}
                    {t.type === 'error' && <XCircle style={{ color: iconColor, fontSize: 18 }} />}
                    {t.type === 'warning' && <WarningIcon style={{ color: iconColor, fontSize: 18 }} />}
                    {t.type === 'info' && <InfoIcon style={{ color: iconColor, fontSize: 18 }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {title}
                    </div>
                    {sub && (
                      <div style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginTop: '2px',
                        lineHeight: 1.3
                      }}>
                        {sub}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <style>{`
            /* Using translateY and scale to completely avoid horizontal scrollbar layout shifts! */
            @keyframes gm-toast-in {
              0% { transform: translateY(-40px) scale(0.9); opacity: 0; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
}; 