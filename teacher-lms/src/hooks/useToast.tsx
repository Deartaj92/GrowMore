import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ============================================================
   GROWMORE FACULTY LMS — TOAST / FEEDBACK SYSTEM
   Self-contained, matches main GrowMore app pill aesthetics.
   Uses lucide-react (already in dependencies, no extra deps).
   ============================================================ */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

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

/* ------- Smart shortener so long messages stay readable ------- */
const MESSAGE_SHORTENER_MAP: Array<[RegExp, string]> = [
  [/^please fill in all (highlighted )?required fields$/i, 'Required fields missing'],
  [/^please complete all required fields$/i, 'Required fields missing'],
  [/^user school information not found$/i, 'School info missing'],
  [/^active session not found.*$/i, 'No active session'],
  [/^no active session found$/i, 'No active session'],
  [/^failed to (fetch|load) (.+)$/i, '$2 load failed'],
  [/^failed to (create|save|update|delete) (.+)$/i, '$2 $1 failed'],
  [/^could not (.+)\. please (try again|contact.+)?\.?$/i, '$1 failed'],
  [/^(.+) (created|updated|saved|deleted) successfully!?$/i, '$1 $2'],
  [/^successfully (saved|created|updated|deleted) (.+)!?$/i, '$2 $1'],
  [/^operation completed successfully$/i, 'Completed'],
];

const formatMsg = (rawMsg: string): { title: string; sub?: string } => {
  if (!rawMsg) return { title: 'Notification' };
  let msg = rawMsg.trim();

  for (const [pattern, replacement] of MESSAGE_SHORTENER_MAP) {
    if (pattern.test(msg)) {
      msg = msg.replace(pattern, replacement);
      break;
    }
  }

  if (msg.includes(': ')) {
    const parts = msg.split(': ');
    const title = parts[0].length > 30 ? parts[0].substring(0, 28) + '…' : parts[0];
    const sub = parts.slice(1).join(': ');
    return { title, sub: sub.length > 40 ? sub.substring(0, 38) + '…' : sub };
  }

  return { title: msg.length > 48 ? msg.substring(0, 46) + '…' : msg };
};

/* ------- Toast Pill Component ------- */
const ToastPill: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const { title, sub } = formatMsg(toast.msg);

  const palette: Record<ToastType, { bg: string; shadow: string }> = {
    success: {
      bg: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.97) 100%)',
      shadow: 'rgba(16,185,129,0.38)',
    },
    error: {
      bg: 'linear-gradient(135deg, rgba(239,68,68,0.95) 0%, rgba(220,38,38,0.97) 100%)',
      shadow: 'rgba(239,68,68,0.38)',
    },
    warning: {
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.95) 0%, rgba(217,119,6,0.97) 100%)',
      shadow: 'rgba(245,158,11,0.38)',
    },
    info: {
      bg: 'linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(79,70,229,0.97) 100%)',
      shadow: 'rgba(99,102,241,0.38)',
    },
  };

  const { bg, shadow } = palette[toast.type];

  const Icon =
    toast.type === 'success'
      ? CheckCircle2
      : toast.type === 'error'
      ? XCircle
      : toast.type === 'warning'
      ? AlertTriangle
      : Info;

  return (
    <div
      className="gm-teacher-toast-pill"
      style={{
        background: bg,
        boxShadow: `0 8px 28px -4px ${shadow}, 0 0 0 1px rgba(255,255,255,0.18)`,
      }}
    >
      <div className="gm-teacher-toast-icon">
        <Icon size={14} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="gm-teacher-toast-title">{title}</div>
        {sub && <div className="gm-teacher-toast-sub">{sub}</div>}
      </div>

      <button
        className="gm-teacher-toast-dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        <X size={12} color="rgba(255,255,255,0.8)" />
      </button>
    </div>
  );
};

/* ------- Provider ------- */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { msg, type, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="gm-teacher-toast-container">
          {toasts.map((t) => (
            <ToastPill key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
      <style>{`
        .gm-teacher-toast-container {
          position: fixed;
          bottom: 36px;
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

        .gm-teacher-toast-pill {
          color: #ffffff;
          padding: 8px 14px 8px 10px;
          border-radius: 24px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          animation: gm-teacher-toast-in 0.28s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 420px;
          min-width: 180px;
          will-change: transform, opacity;
        }

        .gm-teacher-toast-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .gm-teacher-toast-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: var(--font-family, 'Plus Jakarta Sans', sans-serif);
        }

        .gm-teacher-toast-sub {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.86);
          margin-top: 1px;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: var(--font-family, 'Plus Jakarta Sans', sans-serif);
        }

        .gm-teacher-toast-dismiss {
          background: rgba(255,255,255,0.16);
          border: none;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          margin-left: 2px;
          transition: background 0.15s;
          padding: 0;
        }

        .gm-teacher-toast-dismiss:hover {
          background: rgba(255,255,255,0.3);
        }

        @keyframes gm-teacher-toast-in {
          0%   { transform: translateY(18px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1);      opacity: 1; }
        }

        @media (max-width: 600px) {
          .gm-teacher-toast-container {
            bottom: 24px;
            max-width: calc(100vw - 24px);
          }
          .gm-teacher-toast-pill {
            max-width: calc(100vw - 28px);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
