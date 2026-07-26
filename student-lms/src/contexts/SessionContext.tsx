import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface Session {
  id: number;
  name: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface SessionContextValue {
  sessions: Session[];
  selectedSession: number | null;
  setSelectedSession: (id: number) => void;
  activeSession: Session | null;
  loadingSessions: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  sessions: [],
  selectedSession: null,
  setSelectedSession: () => {},
  activeSession: null,
  loadingSessions: true,
});

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { student } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSessionState] = useState<number | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!student) return;

    setLoadingSessions(true);
    supabase
      .from('sessions')
      .select('id, name, is_active, start_date, end_date')
      .eq('school_id', student.school_id)
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSessions(data);
          // Check localStorage for previously selected session
          const stored = localStorage.getItem(`lms-session-${student.school_id}`);
          const storedId = stored ? parseInt(stored, 10) : null;
          const isValid = storedId && data.some((s) => s.id === storedId);

          if (isValid && storedId) {
            setSelectedSessionState(storedId);
          } else {
            // Default to active session
            const active = data.find((s) => s.is_active);
            const defaultId = active ? active.id : data[0].id;
            setSelectedSessionState(defaultId);
          }
        }
        setLoadingSessions(false);
      });
  }, [student]);

  const setSelectedSession = (id: number) => {
    setSelectedSessionState(id);
    if (student) {
      localStorage.setItem(`lms-session-${student.school_id}`, String(id));
    }
  };

  const activeSession = sessions.find((s) => s.id === selectedSession) ?? null;

  return (
    <SessionContext.Provider value={{ sessions, selectedSession, setSelectedSession, activeSession, loadingSessions }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
