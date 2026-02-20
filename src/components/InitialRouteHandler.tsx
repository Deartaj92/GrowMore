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
      if (loading) {
        // Still loading, wait
        return;
      }

      if (!user) {
        // No user, permission check complete
        setPermissionChecked(true);
        return;
      }

      // Check if user is Super Admin (from super_admins table)
      // Super Admin is identified by checking the super_admins table
      try {
        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        
        if (superAdminData) {
          setIsSuperAdmin(true);
          setHasDashboardPerm(true); // Super Admin always has dashboard access
          setPermissionChecked(true);
          return;
        }
      } catch (error) {
        console.error('Error checking super admin:', error);
        // Continue to check permissions even if super admin check fails
      }

      // For all other users, check dashboard permission using role_id
      if (user.id && user.school_id) {
        try {
          const hasPerm = await hasPermission(user.id, 'dashboard', user.school_id);
          setHasDashboardPerm(hasPerm);
        } catch (error) {
          console.error('Error checking dashboard permission:', error);
          setHasDashboardPerm(false);
        } finally {
          setPermissionChecked(true);
        }
      } else if (user.id && user.role === 'Super Admin') {
        // Super Admin from AuthContext (has school_id: 1)
        setIsSuperAdmin(true);
        setHasDashboardPerm(true);
        setPermissionChecked(true);
      } else {
        // User has no school_id and is not super admin
        setHasDashboardPerm(false);
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
        // No user, student, or parent session, redirect to login
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
