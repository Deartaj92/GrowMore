import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, Groups, Person } from '@mui/icons-material';
import { useTheme } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { isDark } from '../styles/DesignSystem';

type AutomationLogRow = {
  id: number;
  school_id: number;
  local_date: string;
  run_at: string;
  student_absent_marked: number;
  staff_absent_marked: number;
  student_leave_marked: number;
  staff_leave_marked: number;
};

const POPUP_MS = 6500;
const POLL_MS = 20000;

const GlobalAttendanceAutomationNotifier: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme() as any;
  const [popupLog, setPopupLog] = useState<AutomationLogRow | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const lastSeenLogIdRef = useRef<number | null>(null);

  const closePopup = () => {
    setPopupLog(null);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleAutoClose = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setPopupLog(null);
      hideTimerRef.current = null;
    }, POPUP_MS);
  };

  const notifyAutomationRun = (log: AutomationLogRow) => {
    const studentChanges = (log.student_absent_marked || 0) + (log.student_leave_marked || 0);
    const staffChanges = (log.staff_absent_marked || 0) + (log.staff_leave_marked || 0);

    if (studentChanges === 0 && staffChanges === 0) {
      return;
    }

    setPopupLog(log);
    scheduleAutoClose();

    window.dispatchEvent(new CustomEvent('attendance-automation-triggered', {
      detail: { log }
    }));
  };

  useEffect(() => {
    if (!user?.school_id) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const primeLatestLog = async () => {
      const { data } = await supabase
        .from('attendance_automation_logs')
        .select('id')
        .eq('school_id', user.school_id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        lastSeenLogIdRef.current = data?.id ?? null;
      }
    };

    const processLog = (row: AutomationLogRow | null | undefined) => {
      if (!row || cancelled) return;

      if (lastSeenLogIdRef.current !== null && row.id <= lastSeenLogIdRef.current) {
        return;
      }

      lastSeenLogIdRef.current = row.id;
      notifyAutomationRun(row);
    };

    const pollLatestLog = async () => {
      const { data } = await supabase
        .from('attendance_automation_logs')
        .select('id, school_id, local_date, run_at, student_absent_marked, staff_absent_marked, student_leave_marked, staff_leave_marked')
        .eq('school_id', user.school_id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      processLog(data as AutomationLogRow | null);
    };

    primeLatestLog();

    channel = supabase
      .channel(`attendance-automation-${user.school_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_automation_logs',
          filter: `school_id=eq.${user.school_id}`,
        },
        payload => {
          processLog(payload.new as AutomationLogRow);
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      pollLatestLog().catch(error => {
        console.warn('Failed to poll attendance automation log:', error);
      });
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.school_id]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const palette = useMemo(() => {
    const dark = isDark(theme);
    return {
      backdrop: dark ? 'rgba(4, 10, 22, 0.6)' : 'rgba(15, 23, 42, 0.28)',
      card: dark ? 'rgba(20, 28, 45, 0.94)' : 'rgba(255, 255, 255, 0.96)',
      border: dark ? 'rgba(96, 165, 250, 0.24)' : 'rgba(37, 99, 235, 0.14)',
      title: dark ? '#f8fafc' : '#0f172a',
      text: dark ? '#cbd5e1' : '#475569',
      accent: '#22c55e',
      accentSoft: dark ? 'rgba(34, 197, 94, 0.14)' : 'rgba(34, 197, 94, 0.1)',
      line: dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.22)',
    };
  }, [theme]);

  if (!popupLog) return null;

  const studentSummary = `${popupLog.student_absent_marked || 0} absent, ${popupLog.student_leave_marked || 0} leave`;
  const staffSummary = `${popupLog.staff_absent_marked || 0} absent, ${popupLog.staff_leave_marked || 0} leave`;
  const runTime = popupLog.run_at
    ? new Date(popupLog.run_at).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
    : '';

  return ReactDOM.createPortal(
    <div
      onClick={closePopup}
      style={{
        position: 'fixed',
        inset: 0,
        background: palette.backdrop,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, 100%)',
          background: palette.card,
          border: `1px solid ${palette.border}`,
          borderRadius: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          padding: '1.25rem 1.25rem 1.1rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.9rem' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: palette.accentSoft,
              color: palette.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle style={{ fontSize: 30 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: palette.title, fontSize: '1.08rem', fontWeight: 800 }}>
              Attendance Auto-Mark Completed
            </div>
            <div style={{ color: palette.text, fontSize: '0.85rem', marginTop: 2 }}>
              {popupLog.local_date}{runTime ? ` • ${runTime}` : ''}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.7rem',
            marginBottom: '0.8rem',
          }}
        >
          <div
            style={{
              border: `1px solid ${palette.line}`,
              borderRadius: 18,
              padding: '0.85rem 0.95rem',
              background: 'rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: palette.title, fontWeight: 700, marginBottom: '0.35rem' }}>
              <Groups style={{ fontSize: 18 }} />
              Students
            </div>
            <div style={{ color: palette.text, fontSize: '0.88rem' }}>{studentSummary}</div>
          </div>

          <div
            style={{
              border: `1px solid ${palette.line}`,
              borderRadius: 18,
              padding: '0.85rem 0.95rem',
              background: 'rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: palette.title, fontWeight: 700, marginBottom: '0.35rem' }}>
              <Person style={{ fontSize: 18 }} />
              Staff
            </div>
            <div style={{ color: palette.text, fontSize: '0.88rem' }}>{staffSummary}</div>
          </div>
        </div>

        <div style={{ color: palette.text, fontSize: '0.78rem', textAlign: 'center' }}>
          Dashboard attendance cards will refresh automatically.
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GlobalAttendanceAutomationNotifier;
