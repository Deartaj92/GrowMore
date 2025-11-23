import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import { fetchRenderSettings, isGuestPageAccessible } from '../services/renderSettingsService';
import { RenderSettings } from '../services/renderSettingsService';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
  guestPageKey?: string; // Key for guest page access check
};

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1a2e;
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid #4a6cf7;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/unauthorized',
  guestPageKey
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Fetch render settings if user is a guest
  useEffect(() => {
    if (user?.role === 'Guest' && user?.school_id && guestPageKey) {
      setSettingsLoading(true);
      fetchRenderSettings(user.school_id)
        .then(settings => {
          setRenderSettings(settings);
        })
        .catch(error => {
          // Error fetching render settings for guest
        })
        .finally(() => {
          setSettingsLoading(false);
        });
    }
  }, [user, guestPageKey]);

  // Show loading while auth or settings are loading
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  // Check for student or parent session if no user is logged in
  if (!user) {
    const studentSession = localStorage.getItem('studentSession');
    if (studentSession) {
      try {
        const parsed = JSON.parse(studentSession);
        if (parsed?.id) {
          // Student is logged in, allow access if Student role is in allowedRoles
          if (allowedRoles.includes('Student')) {
            return <>{children}</>;
          }
        }
      } catch (e) {
        // If parsing fails, fall through to check parent session
      }
    }
    
    const parentSession = localStorage.getItem('parentSession');
    if (parentSession) {
      try {
        const parsed = JSON.parse(parentSession);
        if (parsed?.id) {
          // Parent is logged in, allow access if Parent role is in allowedRoles
          if (allowedRoles.includes('Parent')) {
            return <>{children}</>;
          }
        }
      } catch (e) {
        // If parsing fails, fall through to login redirect
      }
    }
    
    // No user, student, or parent session, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Handle Guest users with render settings
  if (user.role === 'Guest') {
    // If no guestPageKey is provided, check if this is the guest dashboard route
    // The guest dashboard (/guest) should always be accessible to guest users
    if (!guestPageKey) {
      // Allow access if this is the guest dashboard route
      // Otherwise, deny access for other routes without guestPageKey
      if (location.pathname === '/guest' || location.pathname.startsWith('/guest/')) {
        return <>{children}</>;
      }
      // For other routes without guestPageKey, deny access
      return <Navigate to={redirectTo} replace />;
    }

    // If settings are still loading, wait
    if (settingsLoading) {
      return (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      );
    }

    // Check if guest can access this page based on render settings
    // If settings haven't loaded yet, allow temporary access (they'll be checked in the component)
    // This prevents premature denial while settings are being fetched
    if (renderSettings) {
      // Settings are loaded, check access
      if (!isGuestPageAccessible(renderSettings, guestPageKey)) {
        return <Navigate to={redirectTo} replace />;
      }
    }
    // If settings are null (not loaded yet), allow temporary access
    // The component itself will do the final check once settings are loaded
    return <>{children}</>;
  }

  // Handle regular role-based access
  if (!hasPermission(allowedRoles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
} 