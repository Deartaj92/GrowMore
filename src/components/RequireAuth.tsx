import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUser } from '../utils/auth';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getUser();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default RequireAuth; 