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

      // 1. Check if user is Super Admin, Owner, or School Admin (full access)
      if (user.is_super_admin || user.role === 'Super Admin' || user.role === 'super_admin' || user.role === 'owner' || user.role === 'school_admin') {
        setIsSuperAdmin(true);
        setHasAccess(true);
        setPermissionChecked(true);
        return;
      }

      // 2. For all other users, check permission using role_id
      if (requiredPermission && user.id && user.school_id) {
        try {
          const hasPerm = await hasPermission(user.id, requiredPermission, user.school_id);
          setHasAccess(hasPerm);
        } catch (error) {
          console.error('Error checking permission:', error);
          // If error occurs (likely offline), hasPermission now handles fallback internally
          setHasAccess(false);
        } finally {
          setPermissionChecked(true);
        }
      } else {
        setPermissionChecked(true);
        setHasAccess(false);
      }
    };

    if (!loading) {
      checkAccess();
    }
  }, [requiredPermission, user, loading]);

  // Show loading while auth is loading or permission is being checked
  if (loading || (requiredPermission && !permissionChecked)) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  // No user, student, or parent session, redirect to login
  if (!user) {
    const studentSession = localStorage.getItem('studentSession');
    if (studentSession) {
      try {
        const parsed = JSON.parse(studentSession);
        if (parsed?.id && requiredPermission) {
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
          // For now, allow access if parent session exists (permission check will happen in component)
          return <>{children}</>;
        }
      } catch (e) {
        // If parsing fails, fall through to login redirect
      }
    }

    // No valid user or session, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Check permission-based access for logged in users
  if (requiredPermission) {
    if (!hasAccess && !isSuperAdmin) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{children}</>;
  }

  // If no permission specified, deny access (permission is required)
  return <Navigate to={redirectTo} replace />;
}
 