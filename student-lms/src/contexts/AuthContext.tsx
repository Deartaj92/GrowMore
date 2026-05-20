import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import {
  loadStoredSession,
  saveStoredSession,
  clearStoredSession,
} from '../utils/authSession';
import { finishBootSplash, setBootProgress } from '../utils/bootSplash';
import type { StudentSession } from '../types/studentSession';

export type { StudentSession };

interface AuthContextType {
  student: StudentSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (studentId: string, passwordText: string) => Promise<StudentSession>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const cachedSession = loadStoredSession();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentSession | null>(cachedSession);
  const [loading, setLoading] = useState(cachedSession === null);

  const fetchFullStudentProfile = useCallback(async (studentId: number): Promise<StudentSession | null> => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError || !studentData) return null;

      const { data: historyData } = await supabase
        .from('student_class_history')
        .select(`
          new_class_id,
          new_section_id
        `)
        .eq('student_id', studentId)
        .order('id', { ascending: false })
        .limit(1);

      let classId = studentData.class_id;
      let sectionId = studentData.section_id;

      if (historyData && historyData.length > 0) {
        classId = historyData[0].new_class_id || classId;
        sectionId = historyData[0].new_section_id !== null ? historyData[0].new_section_id : sectionId;
      }

      let className = null;
      if (classId) {
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', classId)
          .single();
        if (classData) className = classData.name;
      }

      let sectionName = null;
      if (sectionId) {
        const { data: sectionData } = await supabase
          .from('sections')
          .select('name')
          .eq('id', sectionId)
          .single();
        if (sectionData) sectionName = sectionData.name;
      }

      return {
        id: studentData.id,
        name: studentData.name,
        roll_number: studentData.roll_number,
        father_name: studentData.father_name,
        school_id: studentData.school_id,
        class_id: classId,
        section_id: sectionId,
        class_name: className,
        section_name: sectionName,
        photo_url: studentData.picture_url || studentData.photo_url || null,
        isStudent: true,
      };
    } catch (e) {
      console.error('Error fetching full student profile:', e);
      return null;
    }
  }, []);

  const applySession = useCallback((profile: StudentSession) => {
    setStudent(profile);
    saveStoredSession(profile);
  }, []);

  const refreshProfile = async () => {
    const active = student ?? loadStoredSession();
    if (!active?.id) return;

    const profile = await fetchFullStudentProfile(active.id);
    if (profile) {
      applySession(profile);
    }
  };

  useEffect(() => {
    setBootProgress(72);
  }, []);

  useEffect(() => {
    if (!loading) {
      setBootProgress(100);
      finishBootSplash();
    }
  }, [loading]);

  useEffect(() => {
    const initializeAuth = async () => {
      const stored = loadStoredSession();
      if (!stored?.id) {
        setLoading(false);
        return;
      }

      setStudent(stored);

      try {
        const profile = await fetchFullStudentProfile(stored.id);
        if (profile) {
          applySession(profile);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [applySession, fetchFullStudentProfile]);

  const login = async (studentIdInput: string, passwordText: string): Promise<StudentSession> => {
    const trimmedId = studentIdInput.trim();
    const normalizedId = trimmedId.toUpperCase();
    const isNumeric = !isNaN(Number(trimmedId));

    const rollNumberMatch = normalizedId.match(/^[Ss]?\d+\-(\d+)$/);
    const pureNumberMatch = normalizedId.match(/^(\d+)$/);
    const sequenceNum = rollNumberMatch?.[1] || pureNumberMatch?.[1] || null;

    const queries = [
      (async () => {
        try {
          const res = await supabase
            .from('students')
            .select('*')
            .eq('roll_number', normalizedId)
            .maybeSingle();
          return { type: 'roll_number', ...res };
        } catch {
          return { type: 'roll_number', data: null, error: null };
        }
      })(),

      (async () => {
        if (!sequenceNum) return { type: 'sequence', data: null, error: null };
        try {
          const res = await supabase
            .from('students')
            .select('*')
            .like('roll_number', `%-${sequenceNum}`)
            .limit(10);
          return { type: 'sequence', ...res };
        } catch {
          return { type: 'sequence', data: null, error: null };
        }
      })(),

      (async () => {
        if (!isNumeric) return { type: 'id', data: null, error: null };
        try {
          const res = await supabase
            .from('students')
            .select('*')
            .eq('id', parseInt(trimmedId))
            .maybeSingle();
          return { type: 'id', ...res };
        } catch {
          return { type: 'id', data: null, error: null };
        }
      })(),
    ];

    const results = await Promise.all(queries);

    let matchingStudent: any = null;
    for (const result of results) {
      if (result.data) {
        if (result.type === 'sequence' && Array.isArray(result.data) && sequenceNum) {
          const exactMatch = result.data.find((s: any) => {
            const seq = s.roll_number?.match(/-(\d+)$/)?.[1];
            return seq === sequenceNum;
          });
          if (exactMatch) {
            matchingStudent = exactMatch;
            break;
          } else if (result.data.length > 0) {
            matchingStudent = result.data[0];
            break;
          }
        } else if (!Array.isArray(result.data)) {
          matchingStudent = result.data;
          break;
        }
      }
    }

    if (!matchingStudent) {
      throw new Error('Student not found. Please check your Student ID.');
    }

    const correctPassword = matchingStudent.password || 'aa';
    if (passwordText !== correctPassword) {
      throw new Error('Incorrect password.');
    }

    const fullProfile = await fetchFullStudentProfile(matchingStudent.id);
    if (!fullProfile) {
      throw new Error('Failed to load profile details.');
    }

    (async () => {
      try {
        await supabase
          .from('students')
          .update({
            is_online: true,
            last_online: new Date().toISOString(),
            app_version: 'LMS-v1.0.0',
          })
          .eq('id', fullProfile.id);
      } catch {
        // silent fail
      }
    })();

    applySession(fullProfile);
    return fullProfile;
  };

  const logout = () => {
    if (student) {
      (async () => {
        try {
          await supabase
            .from('students')
            .update({
              is_online: false,
              last_online: new Date().toISOString(),
            })
            .eq('id', student.id);
        } catch {
          // silent fail
        }
      })();
    }
    setStudent(null);
    clearStoredSession();
  };

  return (
    <AuthContext.Provider
      value={{
        student,
        loading,
        isAuthenticated: !!student,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
