import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { getTheme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import './adminTheme.css';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SchoolsManagement from './pages/SchoolsManagement';

const App: React.FC = () => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('platformThemeMode');
    return (savedMode as 'light' | 'dark') || 'light';
  });

  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('platformThemeMode', newMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes inside Layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout toggleTheme={toggleTheme} mode={mode} />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="schools" element={<SchoolsManagement />} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
