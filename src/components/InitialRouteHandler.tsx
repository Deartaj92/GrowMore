import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const InitialRouteHandler: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on user role
      // Admin roles (Principal, Admin, Super Admin) go to dashboard
      if (user.role && ['Principal', 'Admin', 'Super Admin'].includes(user.role)) {
        if (user.role === 'Super Admin') {
          navigate('/welcome', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        // All other roles (Teacher, Student, Parent, Accountant, Guest) go to landing page
        navigate('/home', { replace: true });
      }
    } else if (!loading && !user) {
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
          // If parsing fails, fall through to login redirect
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
    }
  }, [user, loading, navigate]);

  // Show loading while determining where to redirect
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '16px',
      color: '#666'
    }}>
      Loading...
    </div>
  );
};

export default InitialRouteHandler;
