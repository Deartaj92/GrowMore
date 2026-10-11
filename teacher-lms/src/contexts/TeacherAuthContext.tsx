import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { TeacherSession } from '../types/teacherSession';

interface TeacherAuthContextType {
  teacher: TeacherSession | null;
  availableTeachers: TeacherSession[];
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, passwordText: string) => Promise<TeacherSession>;
  loginAsTeacher: (teacherId: number) => Promise<TeacherSession>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateLocalProfile: (partial: Partial<TeacherSession>) => void;
}

const STORAGE_KEY = 'growmore_teacher_session';

const loadStoredTeacher = (): TeacherSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse teacher session', e);
    return null;
  }
};

const TeacherAuthContext = createContext<TeacherAuthContextType | undefined>(undefined);

export const TeacherAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teacher, setTeacher] = useState<TeacherSession | null>(loadStoredTeacher);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real teachers from Supabase on mount
  useEffect(() => {
    const fetchRealTeachers = async () => {
      try {
        const [{ data: staffList }, { data: usersList }, { data: schoolData }] =
          await Promise.all([
            supabase
              .from('staff')
              .select('*')
              .eq('status', 'active')
              .order('id'),
            supabase
              .from('users')
              .select('*')
              .in('role', ['Teacher', 'teacher']),
            supabase
              .from('schools')
              .select('id, name')
              .maybeSingle(),
          ]);

        if (staffList && staffList.length > 0) {
          const schoolName = schoolData?.name || 'Al Haram Public School and Iqra Academy';
          
          // Map real teachers
          const teachers: TeacherSession[] = staffList
            .filter((s: any) => s.role === 'Teacher' || s.designation?.toLowerCase().includes('teacher') || s.id === 2 || s.id === 5)
            .map((s: any) => {
              const matchedUser = usersList?.find((u: any) => u.staff_id === s.id);
              return {
                id: s.id,
                user_id: matchedUser?.id || s.id,
                name: s.name,
                email: s.email || null,
                phone: s.mobile || null,
                designation: s.education || s.role || 'Teacher',
                role: s.role || 'Teacher',
                employee_id: s.national_id ? `ID: ${s.national_id}` : `EMP-${s.id}`,
                school_id: s.school_id || 2,
                school_name: schoolName,
                qualification: s.education || null,
                gender: s.gender || null,
                photo_url: s.picture_url || null,
                joining_date: s.joining_date || null,
                is_demo: false,
              };
            });

          setAvailableTeachers(teachers);

          // If no stored teacher session, automatically default to the primary real teacher (Wasim Abbas)
          const stored = loadStoredTeacher();
          if (!stored && teachers.length > 0) {
            const primary = teachers.find((t) => t.id === 2) || teachers[0];
            setTeacher(primary);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(primary));
          }
        }
      } catch (err) {
        console.error('Error fetching real teachers:', err);
      }
    };

    fetchRealTeachers();
  }, []);

  // Login as any real teacher by staff id
  const loginAsTeacher = useCallback(async (teacherId: number): Promise<TeacherSession> => {
    setLoading(true);
    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (!staffData) {
        throw new Error('Teacher record not found in database');
      }

      const { data: userMatched } = await supabase
        .from('users')
        .select('*')
        .eq('staff_id', teacherId)
        .maybeSingle();

      const { data: schoolData } = await supabase
        .from('schools')
        .select('name')
        .eq('id', staffData.school_id || 2)
        .maybeSingle();

      const session: TeacherSession = {
        id: staffData.id,
        user_id: userMatched?.id || staffData.id,
        name: staffData.name,
        email: staffData.email || null,
        phone: staffData.mobile || null,
        designation: staffData.education || staffData.role || 'Teacher',
        role: staffData.role || 'Teacher',
        employee_id: staffData.national_id ? `ID: ${staffData.national_id}` : `EMP-${staffData.id}`,
        school_id: staffData.school_id || 2,
        school_name: schoolData?.name || 'Al Haram Public School and Iqra Academy',
        qualification: staffData.education || null,
        gender: staffData.gender || null,
        photo_url: staffData.picture_url || null,
        joining_date: staffData.joining_date || null,
        is_demo: false,
      };

      setTeacher(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return session;
    } finally {
      setLoading(false);
    }
  }, []);

  // Standard login using credentials against real users table
  const login = useCallback(async (identifier: string, passwordText: string): Promise<TeacherSession> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordText.trim();

    setLoading(true);
    try {
      // 1. Query users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanId)
        .maybeSingle();

      if (!userError && userData) {
        if (userData.password !== cleanPass) {
          throw new Error('Incorrect password. Please verify credentials.');
        }

        const staffIdToUse = userData.staff_id || 2;
        return await loginAsTeacher(staffIdToUse);
      }

      // 2. Query staff table directly
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .or(`mobile.eq.${cleanId},email.eq.${cleanId},name.ilike.%${cleanId}%`)
        .maybeSingle();

      if (staffData) {
        return await loginAsTeacher(staffData.id);
      }

      throw new Error(`Invalid credentials. Account "${identifier}" not found. Please verify your staff ID or mobile number.`);
    } catch (err: any) {
      console.error('Teacher login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loginAsTeacher]);

  const logout = useCallback(() => {
    setTeacher(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateLocalProfile = useCallback((partial: Partial<TeacherSession>) => {
    setTeacher((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!teacher) return;
    try {
      const { data: updatedStaff } = await supabase
        .from('staff')
        .select('*')
        .eq('id', teacher.id)
        .single();
      if (updatedStaff) {
        const next: TeacherSession = {
          ...teacher,
          name: updatedStaff.name || teacher.name,
          phone: updatedStaff.mobile || teacher.phone,
          email: updatedStaff.email || teacher.email,
          qualification: updatedStaff.education || teacher.qualification,
          gender: updatedStaff.gender || teacher.gender,
          photo_url: updatedStaff.picture_url || teacher.photo_url,
        };
        setTeacher(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch (e) {
      console.warn('Could not refresh teacher profile:', e);
    }
  }, [teacher]);

  return (
    <TeacherAuthContext.Provider
      value={{
        teacher,
        availableTeachers,
        loading,
        isAuthenticated: !!teacher,
        login,
        loginAsTeacher,
        logout,
        refreshProfile,
        updateLocalProfile,
      }}
    >
      {children}
    </TeacherAuthContext.Provider>
  );
};

export const useTeacherAuth = () => {
  const context = useContext(TeacherAuthContext);
  if (!context) {
    throw new Error('useTeacherAuth must be used within TeacherAuthProvider');
  }
  return context;
};
