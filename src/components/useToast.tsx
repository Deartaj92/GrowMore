import React, { createContext, useContext, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

export type ToastType = 'success' | 'error';
interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{children: React.ReactNode, theme: 'dark' | 'light', muted?: boolean}> = ({ children, theme, muted = false }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = (msg: string, type: ToastType = 'success') => {
    const id = toastId.current++;
    setToasts(prev => [...prev, { msg, type, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
    if (type === 'success' && !muted) {
      const audio = new window.Audio('/success.mp3');
      audio.volume = 1.0;
      audio.play().catch(() => {});
    }
    if (type === 'error' && !muted) {
      const audio = new window.Audio('/error.mp3');
      audio.volume = 1.0;
      audio.play().catch(() => {});
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && ReactDOM.createPortal(
        <>
          <div style={{ position: 'fixed', top: 32, right: 32, zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {toasts.map(t => (
              <div
                key={t.id}
                style={{
                  minWidth: 220,
                  background: t.type === 'error' ? (theme === 'dark' ? '#ff3b3b' : '#ff5252') : (theme === 'dark' ? '#4caf50' : '#43a047'),
                  color: '#fff',
                  padding: '14px 32px',
                  borderRadius: 12,
                  fontSize: '1.08rem',
                  fontWeight: 600,
                  marginBottom: 10,
                  boxShadow: '0 4px 24px 0 #0007',
                  opacity: 0.97,
                  animation: 'toast-in 0.5s',
                }}
              >
                {t.msg}
              </div>
            ))}
          </div>
          <style>{`
            @keyframes toast-in {
              0% { transform: translateY(-30px) scale(0.95); opacity: 0; }
              60% { transform: translateY(4px) scale(1.03); opacity: 1; }
              100% { transform: translateY(0) scale(1); opacity: 0.97; }
            }
          `}</style>
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
}; 