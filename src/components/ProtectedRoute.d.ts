import { ReactNode } from 'react';

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

declare const ProtectedRoute: React.FC<ProtectedRouteProps>;

export default ProtectedRoute; 