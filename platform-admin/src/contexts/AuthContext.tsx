import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface User {
  id: number;
  username: string;
  name: string;
  status: string;
  role: string;
  schoolId?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('platformAdminUser');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          localStorage.removeItem('platformAdminUser');
        }
      }
      setLoading(false);
    };

    loadUser();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'platformAdminUser') {
        loadUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const signIn = async (username: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      // Attempt platform admin login first
    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('*')
      .eq('username', username)
      .single();

    if (!adminError && adminData) {
      if (adminData.password === password && adminData.status === 'active') {
        const loggedUser: User = {
          id: adminData.id,
          username: adminData.username,
          name: adminData.name,
          status: adminData.status,
          role: 'Platform Admin'
        };
        setUser(loggedUser);
        localStorage.setItem('platformAdminUser', JSON.stringify(loggedUser));
        return loggedUser;
      }
      throw new Error('Invalid username or password');
    }

    // Attempt school admin login
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('role', 'school_admin')
      .single();

    if (userError || !userData) {
      throw new Error('Invalid username or password');
    }
    if (userData.password !== password || userData.status !== 'active') {
      throw new Error('Invalid username or password');
    }
    // Fetch the school associated with this admin
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('school_admin_id', userData.id)
      .single();
    const loggedUser: User = {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      status: userData.status,
      role: 'School Admin',
      schoolId: schoolData ? schoolData.id : undefined
    };
    setUser(loggedUser);
    localStorage.setItem('platformAdminUser', JSON.stringify(loggedUser));
    return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('platformAdminUser');
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
