import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, setAuthContext } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { crypt, gen_salt } from '../utils/crypto';

interface User {
  id: number;
  username: string;
  name: string;
  role?: string;
  staff_id?: number;
  school_id?: number;
  status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: string[]) => boolean;
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
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    try {
      setLoading(true);

      // Store credentials in localStorage first
      localStorage.setItem('auth_credentials', JSON.stringify({ username, password }));
      
      // Set auth context
      await setAuthContext(username, password);

      // Try super admin login first (simplified approach)
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('username', username)
        .single();

      if (superAdminData && superAdminData.password === password && superAdminData.status === 'active') {
        const user = {
          id: superAdminData.id,
          username: superAdminData.username,
          name: superAdminData.name,
          role: 'Super Admin',
          school_id: 1, // Super admins default to school 1
          status: superAdminData.status
        };
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/welcome', { replace: true });
        return user;
      }

      // Try regular user login (simplified approach)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (userData && userData.password === password && userData.status === 'active') {
        const user = {
          id: userData.id,
          username: userData.username,
          name: userData.name,
          role: userData.role,
          staff_id: userData.staff_id,
          school_id: userData.school_id,
          status: userData.status
        };
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Redirect based on user role
        if (userData.role === 'Teacher') {
          navigate('/teacher', { replace: true });
        } else {
          navigate('/welcome', { replace: true });
        }
        return user;
      }

      // If no user found, remove credentials
      localStorage.removeItem('auth_credentials');
      throw new Error('Invalid username or password');
    } catch (error) {
      // On any error, remove credentials
      localStorage.removeItem('auth_credentials');
      console.error('Error logging in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_credentials');
      setUser(null);
      
      // Reset navigation history by replacing current entry
      navigate('/login', { replace: true });
      
      // Clear browser history by pushing a new state and replacing it
      window.history.pushState(null, '', '/login');
      window.history.replaceState(null, '', '/login');
      
      // Force a page reload to completely reset the application state
      window.location.href = '/login';
    } catch (error: any) {
      throw error;
    }
  };

  const hasPermission = (requiredRoles: string[]) => {
    if (!user || !user.role) return false;
    if (user.role === 'Super Admin') return true; // Always allow Super Admin
    return requiredRoles.includes(user.role);
  };

  const value = {
    user,
    loading,
    signIn: login,
    signOut,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 