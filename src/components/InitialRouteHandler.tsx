import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../services/permissionService';
import { supabase } from '../supabaseClient';
import Loader from './Loader';

const InitialRouteHandler: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasDashboardPerm, setHasDashboardPerm] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if user is Super Admin and dashboard permission
  useEffect(() => {
    const checkPermission = async () => {
      // 1. Initial basic checks
      if (loading) return;
      if (!user) {
        setPermissionChecked(true);
        return;
      }

      // 2. Trust the user object from AuthContext first (most efficient)
      if (user.is_super_admin || user.role === 'Super Admin' || user.role === 'school_admin' || user.role === 'School Admin') {
        setIsSuperAdmin(user.is_super_admin || user.role === 'Super Admin');
        setHasDashboardPerm(true);
        setPermissionChecked(true);
        return;
      }

      // 3. For regular users, check permissions
      // We prioritize the cached check inside hasPermission()
      if (user.id && (user.school_id || user.role)) {
        try {
          // If we are offline, hasPermission will use the local cache immediately
          const hasPerm = await hasPermission(user.id, 'dashboard', user.school_id || 1);
          setHasDashboardPerm(hasPerm);

          // Only attempt a network-based super-admin check if we are online 
          // AND the user's role suggests they might be an administrator but not explicitly marked
          if (navigator.onLine && !isSuperAdmin) {
            try {
              const { data: superAdminData } = await supabase
                .from('super_admins')
                .select('id')
                .eq('username', user.username)
                .maybeSingle();

              if (superAdminData) {
                setIsSuperAdmin(true);
                setHasDashboardPerm(true);
              }
            } catch (err) {
              // Silently ignore network errors for super admin check during boot
            }
          }
        } catch (error) {
          console.error('Error in boot sequence:', error);
          setHasDashboardPerm(false);
        } finally {
          setPermissionChecked(true);
        }
      } else {
        setPermissionChecked(true);
      }
    };
    checkPermission();
  }, [user, loading]);

  useEffect(() => {
    // Wait for both auth loading and permission check to complete
    if (!loading && permissionChecked) {
      if (!user) {
        // Check for student session before redirecting to login
        const studentSession = localStorage.getItem('studentSession');
        if (studentSession) {
          try {
            const parsed = JSON.parse(studentSession);
            if (parsed?.id) {
              // Student is logged in, redirect to landing page (which acts as their dashboard/menu)
              navigate('/home', { replace: true });
              return;
            }
          } catch (e) {
            // If parsing fails, fall through to check parent session
          }
        }
        // Check for parent session before redirecting to login
        const parentSession = localStorage.getItem('parentSession');
        if (parentSession) {
          try {
            const parsed = JSON.parse(parentSession);
            if (parsed?.id) {
              // Parent is logged in, redirect to landing page
              navigate('/home', { replace: true });
              return;
            }
          } catch (e) {
            // If parsing fails, fall through to login redirect
          }
        }
        // No user, student, or parent session, redirect to login page
        navigate('/login', { replace: true });
        return;
      }

      // User exists, redirect based on permissions
      if (isSuperAdmin) {
        // Super Admin always goes to welcome page
        navigate('/welcome', { replace: true });
      } else if (hasDashboardPerm) {
        // User has dashboard permission, go to full dashboard
        navigate('/dashboard', { replace: true });
      } else if (user.school_id) {
        // User doesn't have dashboard permission, go to user dashboard
        navigate('/user', { replace: true });
      } else {
        // No school_id, go to landing page
        navigate('/home', { replace: true });
      }
    }
  }, [user, loading, navigate, permissionChecked, hasDashboardPerm, isSuperAdmin]);

  // Show loading while determining where to redirect
  return <Loader />;
};

export default InitialRouteHandler;
