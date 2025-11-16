import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const InitialRouteHandler: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on user role
      if (user.role === 'Teacher') {
        navigate('/teacher', { replace: true });
      } else if (user.role === 'Super Admin') {
        navigate('/welcome', { replace: true });
      } else if (user.role === 'Guest') {
        navigate('/guest', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else if (!loading && !user) {
      // Check for student session before redirecting to login
      const studentSession = localStorage.getItem('studentSession');
      if (studentSession) {
        try {
          const parsed = JSON.parse(studentSession);
          if (parsed?.id) {
            // Student is logged in, redirect to their profile page
            navigate(`/student/${parsed.id}`, { replace: true });
            return;
          }
        } catch (e) {
          // If parsing fails, fall through to login redirect
        }
      }
      // No user or student session, redirect to login
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
