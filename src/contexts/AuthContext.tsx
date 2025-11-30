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
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          localStorage.removeItem('user');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    // Load user on mount
    loadUser();

    // Listen for storage changes (when user is set in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUser();
      }
    };

    // Listen for custom auth update event
    const handleAuthUpdate = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authUpdate', handleAuthUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authUpdate', handleAuthUpdate);
    };
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    try {
      setLoading(true);

      // Store credentials in localStorage first
      localStorage.setItem('auth_credentials', JSON.stringify({ username, password }));

      // OPTIMIZED: Run auth context and queries in parallel
      const [authContextResult, superAdminResult, userResult] = await Promise.allSettled([
        Promise.resolve(setAuthContext(username, password)).catch(() => null), // Don't block on auth context
        Promise.resolve(
          supabase
            .from('super_admins')
            .select('*')
            .eq('username', username)
            .single()
        )
          .then(result => ({ data: result.data, error: result.error }))
          .catch(() => ({ data: null, error: null })), // Ignore errors if table doesn't exist
        Promise.resolve(
          supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single()
        )
          .then(result => ({ data: result.data, error: result.error }))
          .catch(() => ({ data: null, error: { message: 'User not found' } }))
      ]);

      // Check super admin first
      const superAdminData = superAdminResult.status === 'fulfilled' && 
        superAdminResult.value?.data && 
        !superAdminResult.value?.error
        ? superAdminResult.value.data 
        : null;

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
        setLoading(false);
        return user;
      }

      // Check regular user
      const userData = userResult.status === 'fulfilled' && 
        userResult.value?.data && 
        !userResult.value?.error
        ? userResult.value.data 
        : null;

      if (userData && userData.password === password && userData.status === 'active') {
        // OPTIMIZED: Fetch session and update online status in parallel
        const [sessionResult, updateStatusResult] = await Promise.allSettled([
          userData.school_id 
            ? Promise.resolve(
                supabase
                  .from('sessions')
                  .select('id')
                  .eq('school_id', userData.school_id)
                  .eq('is_active', true)
                  .single()
              )
                .then(result => result.data?.id)
                .catch(() => undefined)
            : Promise.resolve(undefined),
          userData.staff_id
            ? Promise.resolve(
                supabase
                  .from('staff')
                  .update({
                    is_online: true,
                    last_online: new Date().toISOString(),
                    app_version: process.env.REACT_APP_VERSION || 'v1.4.0'
                  })
                  .eq('id', userData.staff_id)
              )
                .then(() => true)
                .catch(() => false)
            : Promise.resolve(false)
        ]);

        const sessionId = sessionResult.status === 'fulfilled' ? sessionResult.value : undefined;

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
        setLoading(false);
        return user;
      }

      // If no user found, remove credentials
      localStorage.removeItem('auth_credentials');
      throw new Error('Invalid username or password');
    } catch (error) {
      // On any error, remove credentials
      localStorage.removeItem('auth_credentials');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Update staff online status if applicable
      if (user?.staff_id) {
        await supabase
          .from('staff')
          .update({
            is_online: false,
            last_online: new Date().toISOString()
          })
          .eq('id', user.staff_id);
      }

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