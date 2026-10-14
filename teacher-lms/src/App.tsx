import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeacherAuthProvider, useTeacherAuth } from './contexts/TeacherAuthContext';
import { ToastProvider } from './hooks/useToast';
import { Layout } from './components/Layout';
import { TeacherLoader } from './components/TeacherLoader';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Attendance } from './pages/Attendance';
import { Classes } from './pages/Classes';
import { Timetable } from './pages/Timetable';
import { Homework } from './pages/Homework';
import { Tests } from './pages/Tests';
import { Exams } from './pages/Exams';
import { Notices } from './pages/Notices';
import { Leave } from './pages/Leave';
import { Profile } from './pages/Profile';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useTeacherAuth();

  if (loading) {
    return <TeacherLoader message="Verifying faculty session…" fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useTeacherAuth();

  if (loading) {
    return <TeacherLoader message="Preparing sign in…" fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <ToastProvider>
      <TeacherAuthProvider>
        <HashRouter>
          <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Attendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <Classes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/timetable"
            element={
              <ProtectedRoute>
                <Timetable />
              </ProtectedRoute>
            }
          />

          <Route
            path="/homework"
            element={
              <ProtectedRoute>
                <Homework />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tests"
            element={
              <ProtectedRoute>
                <Tests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/exams"
            element={
              <ProtectedRoute>
                <Exams />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notices"
            element={
              <ProtectedRoute>
                <Notices />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leave"
            element={
              <ProtectedRoute>
                <Leave />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </TeacherAuthProvider>
  </ToastProvider>
  );
}

export default App;
