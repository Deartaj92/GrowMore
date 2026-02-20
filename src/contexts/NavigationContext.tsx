import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { hasPermission } from '../services/permissionService';

interface NavigationContextType {
  navHistory: string[];
  forwardHistory: string[];
  handleGoBack: () => void;
  handleGoForward: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initialize nav history on mount
  React.useEffect(() => {
    if (location.pathname !== '/login') {
      setNavHistory([location.pathname]);
    }
  }, []);

  // Add to nav history when location changes
  React.useEffect(() => {
    if (location.pathname === '/login') return;
    
    setNavHistory(prev => {
      if (prev.length === 0 || prev[prev.length - 1] !== location.pathname) {
        const newHistory = [...prev, location.pathname];
        return newHistory.length > 20 ? newHistory.slice(-20) : newHistory;
      }
      return prev;
    });
  }, [location.pathname]);

  const handleGoBack = useCallback(async () => {
    if (location.pathname === '/dashboard') return;
    
    const currentPath = location.pathname;
    setForwardHistory(prev => [currentPath, ...prev]);
    
    if (navHistory.length > 1) {
      const previousPath = navHistory[navHistory.length - 2];
      setNavHistory(prev => prev.slice(0, -1));
      navigate(previousPath);
    } else {
      // Check dashboard permission before navigating
      if (user?.role === 'Super Admin') {
        navigate('/dashboard');
      } else if (user?.id && user?.school_id) {
        try {
          const hasDashboardPermission = await hasPermission(user.id, 'dashboard', user.school_id);
          navigate(hasDashboardPermission ? '/dashboard' : '/user');
        } catch (error) {
          console.error('Error checking dashboard permission:', error);
          navigate('/user');
        }
      } else {
        navigate('/user');
      }
    }
  }, [navHistory, navigate, location.pathname, user]);

  const handleGoForward = useCallback(() => {
    if (forwardHistory.length === 0) return;
    
    const nextPath = forwardHistory[0];
    setNavHistory(prev => [...prev, nextPath]);
    setForwardHistory(prev => prev.slice(1));
    navigate(nextPath);
  }, [forwardHistory, navigate]);

  const value = {
    navHistory,
    forwardHistory,
    handleGoBack,
    handleGoForward,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
