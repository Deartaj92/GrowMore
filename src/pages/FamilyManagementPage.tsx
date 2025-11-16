import React, { useContext, useEffect, useState } from 'react';
import FamilyManagement from '../components/FamilyManagement';
import { ThemeContext } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useLoading } from '../contexts/LoadingContext';
import NoStudentsFound from '../components/NoStudentsFound';
import { supabase } from '../supabaseClient';

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

  if (authLoading || loading || !isReady) {
    return null;
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