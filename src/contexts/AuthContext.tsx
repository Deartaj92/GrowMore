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
  session_id?: number;
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

  // Helper: Clear navigation history and lock current route in stack
  const clearNavigationHistory = (path: string) => {
    try {
      // Replace the current entry, then push and replace again to prevent back navigation
      window.history.replaceState(null, '', path);
      window.history.pushState(null, '', path);
      window.history.replaceState(null, '', path);
    } catch (e) {
      // Fallback: hard redirect
      window.location.replace(path);
    }
  };

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

      // Try super admin login first (only if super_admins table exists)
      // Handle 406 errors gracefully - table might not exist
      let superAdminData = null;
      try {
        const { data, error } = await supabase
          .from('super_admins')
          .select('*')
          .eq('username', username)
          .single();

        // Only use data if no error or if error is just "no rows" (PGRST116)
        if (!error || error.code === 'PGRST116') {
          superAdminData = data;
        }
      } catch (err) {
        // Ignore errors from super_admins table (might not exist)
        console.log('Super admins table not accessible, continuing with users table');
      }

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
        clearNavigationHistory('/welcome');
        return user;
      }

      // Try regular user login (simplified approach)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      // Handle case where user is not found (PGRST116 = no rows returned)
      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user:', userError);
        // Don't throw here - let it fall through to show "Invalid username or password"
      }

      if (userData && userData.password === password && userData.status === 'active') {
        // Fetch active session for the school
        let sessionId: number | undefined;
        if (userData.school_id) {
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('id')
            .eq('school_id', userData.school_id)
            .eq('is_active', true)
            .single();

          if (sessionData) {
            sessionId = sessionData.id;
          }
        }

        const user: User = {
          id: userData.id,
          username: userData.username,
          name: userData.name,
          role: userData.role,
          staff_id: userData.staff_id,
          school_id: userData.school_id,
          session_id: sessionId,
          status: userData.status
        };
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));

        // Redirect based on user role
        if (userData.role === 'Teacher') {
          navigate('/teacher', { replace: true });
          clearNavigationHistory('/teacher');
        } else if (userData.role === 'Guest') {
          navigate('/dashboard', { replace: true });
          clearNavigationHistory('/dashboard');
        } else {
          navigate('/welcome', { replace: true });
          clearNavigationHistory('/welcome');
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
      clearNavigationHistory('/login');
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