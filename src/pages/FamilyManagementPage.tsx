import React, { useContext, useEffect, useState } from 'react';
import FamilyManagement from '../components/FamilyManagement';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress, Paper, Grid } from '@mui/material';
import Loader from '../components/Loader';
import { useTheme } from '@mui/material/styles';
import { useLoading } from '../contexts/LoadingContext';
import NoStudentsFound from '../components/NoStudentsFound';
import { supabase } from '../supabaseClient';
import styled, { keyframes } from 'styled-components';

const FamilyManagementPage: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { user, loading: authLoading } = useAuth();
  const { setLoading, loading } = useLoading();
  const [isReady, setIsReady] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
  const muiTheme = useTheme();

  useEffect(() => {
    if (!authLoading) {
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      setIsReady(true);
      // Simulate fetching families (replace with real fetch logic)
      setFamilies([]); // TODO: Replace with actual fetch
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, setLoading]);

  // Check if there are any students in the system for the active session
  useEffect(() => {
    const checkForAnyStudents = async () => {
      if (!user?.school_id) return;
      
      let sessionToUse = null;
      // Get active session
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, is_active')
        .eq('school_id', user?.school_id);
      if (sessionsData) {
        const activeSession = sessionsData.find((s) => s.is_active);
        if (activeSession) sessionToUse = String(activeSession.id);
      }
      
      if (sessionToUse) {
        // Check if there are any students in student_class_history for the active session
        const { data, error } = await supabase
          .from('student_class_history')
          .select('student_id')
          .eq('session_id', sessionToUse)
          .eq('school_id', user?.school_id)
          .limit(1);
        
        setHasAnyStudents(!error && data && data.length > 0);
      } else {
        // Fallback: check if there are any students in the students table
        const { data, error } = await supabase
          .from('students')
          .select('id')
          .eq('school_id', user?.school_id)
          .limit(1);
        
        setHasAnyStudents(!error && data && data.length > 0);
      }
    };
    
    checkForAnyStudents();
  }, [user?.school_id]);

  // Skeleton loading components
  const shimmer = keyframes`
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  `;

  const isDarkSkeleton = (theme: any) => theme.BG === '#252525' || theme.BG === '#181c2a';

  const SkeletonBase = styled.div`
    position: relative;
    overflow: hidden;
    background: ${({ theme }) => isDarkSkeleton(theme) ? '#2a2a2a' : '#f5f5f5'};
    border-radius: 8px;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        ${({ theme }) => isDarkSkeleton(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'},
        transparent
      );
      animation: ${shimmer} 2.5s ease-in-out infinite;
    }
  `;

  const SkeletonLine = styled(SkeletonBase)<{ width?: string; height?: string }>`
    width: ${({ width }) => width || '100%'};
    height: ${({ height }) => height || '16px'};
    border-radius: 6px;
    background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  `;

  const SkeletonContainer = styled.div`
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0 12px 6px 12px;
    box-sizing: border-box;
    background: ${({ theme }) => theme.BG};
    display: flex;
    flex-direction: column;
  `;

  const SkeletonHeader = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 6px 0 4px 0;
    padding: 0.5rem 0;
  `;

  const SkeletonTitle = styled(SkeletonLine)`
    width: 200px;
    height: 24px;
    border-radius: 8px;
  `;

  const SkeletonButton = styled(SkeletonBase)`
    width: 120px;
    height: 36px;
    border-radius: 8px;
    background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  `;

  const SkeletonContent = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 0 8px 0;
  `;

  const SkeletonGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    
    @media (max-width: 700px) {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  `;

  const SkeletonCard = styled.div`
    background: ${({ theme }) => theme.CARD};
    border-radius: 12px;
    padding: 1rem;
    box-shadow: ${({ theme }) => isDarkSkeleton(theme) 
      ? '0 2px 8px rgba(0, 0, 0, 0.2)' 
      : '0 2px 8px rgba(0, 0, 0, 0.08)'};
    border: 1px solid ${({ theme }) => isDarkSkeleton(theme) 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.05)'};
    border-top: 3px solid ${({ theme }) => theme.ACCENT}40;
  `;

  const SkeletonAvatar = styled(SkeletonBase)`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${({ theme }) => isDarkSkeleton(theme) ? '#2a2a2a' : '#f0f0f0'};
  `;

  const FamilyManagementSkeleton: React.FC = () => {
    const { theme } = useContext(ThemeContext);
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

    return (
      <SkeletonContainer theme={themeObj}>
        <SkeletonHeader>
          <SkeletonTitle theme={themeObj} />
          <SkeletonButton theme={themeObj} />
        </SkeletonHeader>
        <SkeletonContent>
          <SkeletonGrid>
            {Array.from({ length: isMobile ? 6 : 8 }).map((_, i) => (
              <SkeletonCard key={i} theme={themeObj}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: `1px solid ${isDarkSkeleton(themeObj) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}` }}>
                  <SkeletonAvatar theme={themeObj} />
                  <div style={{ flex: 1 }}>
                    <SkeletonLine width="65%" height="18px" theme={themeObj} />
                    <SkeletonLine width="85%" height="14px" theme={themeObj} />
                  </div>
                </div>
                <SkeletonLine width="40%" height="12px" theme={themeObj} />
                <SkeletonLine width="100%" height="36px" theme={themeObj} />
                <SkeletonLine width="100%" height="36px" theme={themeObj} />
              </SkeletonCard>
            ))}
          </SkeletonGrid>
        </SkeletonContent>
      </SkeletonContainer>
    );
  };

  if (authLoading || loading || !isReady) {
    return <Loader />;
  }

  if (!user?.school_id) {
    return (
      <Box minHeight="100vh" bgcolor={muiTheme.palette.background.default}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh" color="#ef4444" textAlign="center" p={4}>
          <Box>
            <Typography variant="h5" fontWeight={700} mb={1}>Access Restricted</Typography>
            <Typography variant="body1">You need to be associated with a school to access family management.</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Show NoStudentsFound only if there are truly no students in the system
  if (!loading && hasAnyStudents === false) {
    return <NoStudentsFound />;
  }

  return (
    <Box minHeight="100vh" bgcolor={muiTheme.palette.background.default}>
      <FamilyManagement />
    </Box>
  );
};

export default FamilyManagementPage; 