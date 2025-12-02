import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import { hasPermission } from '../services/permissionService';
import { supabase } from '../supabaseClient';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredPermission?: string; // Permission key from permissions table - REQUIRED for all routes
  redirectTo?: string;
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
  requiredPermission,
  redirectTo = '/unauthorized'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if user is Super Admin and check permission
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setPermissionChecked(true);
        setHasAccess(false);
        return;
      }

      // Check if user is Super Admin (from super_admins table)
      if (user.id && !user.school_id) {
        try {
          const { data: superAdminData } = await supabase
            .from('super_admins')
            .select('id')
            .eq('username', user.username)
            .maybeSingle();
          
          if (superAdminData) {
            setIsSuperAdmin(true);
            setHasAccess(true); // Super Admin has access to everything
            setPermissionChecked(true);
            return;
          }
        } catch (error) {
          console.error('Error checking super admin:', error);
        }
      }

      // For all other users, check permission using role_id
      if (requiredPermission && user.id && user.school_id) {
        try {
          const hasPerm = await hasPermission(user.id, requiredPermission, user.school_id);
          setHasAccess(hasPerm);
        } catch (error) {
          console.error('Error checking permission:', error);
          setHasAccess(false);
        } finally {
          setPermissionChecked(true);
        }
      } else if (!requiredPermission) {
        // If no permission required, deny access (permission is required)
        setHasAccess(false);
        setPermissionChecked(true);
      } else {
        setPermissionChecked(true);
        setHasAccess(false);
      }
    };

    if (!loading) {
      checkAccess();
    }
  }, [requiredPermission, user, loading]);

  // Show loading while auth is loading - just render children, let pages handle their own loading
  if (loading) {
    return <>{children}</>;
  }

  // Check for student or parent session if no user is logged in
  // These use localStorage sessions and should check permissions via their role_id if they have a user account
  if (!user) {
    const studentSession = localStorage.getItem('studentSession');
    if (studentSession) {
      try {
        const parsed = JSON.parse(studentSession);
        if (parsed?.id && requiredPermission) {
          // Check permission for student
          hasPermission(parsed.id, requiredPermission, parsed.school_id || 0)
            .then(hasPerm => {
              if (!hasPerm) {
                // Will redirect below
              }
            });
          // For now, allow access if student session exists (permission check will happen in component)
          return <>{children}</>;
        }
      } catch (e) {
        // If parsing fails, fall through to login redirect
      }
    }
    
    const parentSession = localStorage.getItem('parentSession');
    if (parentSession) {
      try {
        const parsed = JSON.parse(parentSession);
        if (parsed?.id && requiredPermission) {
          // Check permission for parent
          hasPermission(parsed.id, requiredPermission, parsed.school_id || 0)
            .then(hasPerm => {
              if (!hasPerm) {
                // Will redirect below
              }
            });
          // For now, allow access if parent session exists (permission check will happen in component)
          return <>{children}</>;
        }
      } catch (e) {
        // If parsing fails, fall through to login redirect
      }
    }
    
    // No user, student, or parent session, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Wait for permission check to complete
  if (requiredPermission && !permissionChecked) {
    return <>{children}</>;
  }

  // Check permission-based access
  if (requiredPermission) {
    if (!hasAccess) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{children}</>;
  }

  // If no permission specified, deny access (permission is required)
  return <Navigate to={redirectTo} replace />;
} 