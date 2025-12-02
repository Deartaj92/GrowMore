import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Skeleton,
  Paper,
  Avatar,
  useTheme,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  ArrowForward as ArrowForwardIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/useToast';
import { hasPermission } from '../services/permissionService';

import Loader from '../components/Loader';
interface School {
  id: number;
  name: string;
  address: string;
  contact: string;
  email: string;
  status: string;
  logo_url?: string;
  created_at: string;
}

interface InstituteProfile {
  id: number;
  name: string;
  short_name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  website?: string;
  country?: string;
  logo_url?: string;
  school_id: number;
  created_at: string;
  updated_at: string;
}

const SchoolWelcomeScreen: React.FC = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [school, setSchool] = useState<School | null>(null);
  const [instituteProfile, setInstituteProfile] = useState<InstituteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.school_id) {
        setError('No school associated with this user');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch school data
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', user.school_id)
          .single();

        if (schoolError) throw schoolError;

        // Fetch institute profile data
        const { data: profileData, error: profileError } = await supabase
          .from('institute_profile')
          .select('*')
          .eq('school_id', user.school_id)
          .single();

        if (schoolData) {
          setSchool(schoolData);
        }
        
        if (profileData) {
          setInstituteProfile(profileData);
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to fetch information');
        showToast('Error loading information', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, showToast]);

  // Removed auto-navigation splash; navigation is user-initiated only

  const handleProceedToApp = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Check dashboard permission before navigating
    if (user?.id && user?.school_id) {
      try {
        const hasDashboardPermission = await hasPermission(user.id, 'dashboard', user.school_id);
        if (hasDashboardPermission) {
    navigate('/dashboard', { replace: true });
        } else {
          navigate('/user', { replace: true });
        }
      } catch (error) {
        console.error('Error checking dashboard permission:', error);
        // On error, default to user dashboard
        navigate('/user', { replace: true });
      }
    } else {
      // Fallback to user dashboard if user info is missing
      navigate('/user', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // No need to navigate here as signOut already handles navigation
    } catch (error) {
      showToast('Error logging out', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        p: 2,
        bgcolor: theme.palette.background.default
      }}>
        <Paper sx={{ 
          p: 3, 
          maxWidth: 400, 
          width: '100%', 
          textAlign: 'center',
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <Skeleton variant="circular" width={60} height={60} sx={{ margin: '0 auto', mb: 2 }} />
          <Skeleton variant="text" width="80%" height={32} sx={{ margin: '0 auto', mb: 1 }} />
          <Skeleton variant="text" width="60%" height={24} sx={{ margin: '0 auto', mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1, mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1 }} />
        </Paper>
      </Box>
    );
  }

  if (error || !school) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        p: 2,
        bgcolor: theme.palette.background.default
      }}>
        <Paper sx={{ 
          p: 3, 
          maxWidth: 400, 
          width: '100%', 
          textAlign: 'center',
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <SchoolIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5, color: theme.palette.primary.main }} />
          <Typography variant="h5" gutterBottom color="error">Error Loading Information</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {error || 'Information not available'}
          </Typography>
          <Button
            variant="contained"
            type="button"
            onClick={handleProceedToApp}
            fullWidth
            size="large"
            sx={{ mb: 2 }}
          >
            Proceed to Dashboard
          </Button>
          <Button
            variant="outlined"
            onClick={handleLogout}
            fullWidth
            size="large"
            startIcon={<LogoutIcon />}
          >
            Log Out
          </Button>
        </Paper>
      </Box>
    );
  }

  const displayName = instituteProfile?.name || school.name;
  const displayTagline = instituteProfile?.tagline || 'School Management System';
  const displayLogo = instituteProfile?.logo_url || school.logo_url;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      p: 2,
      bgcolor: theme.palette.background.default
    }}>
      <Paper sx={{ 
        p: 3, 
        maxWidth: 400, 
        width: '100%',
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        {/* School Logo & Name */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Avatar
            src={displayLogo}
            sx={{ 
              width: 60, 
              height: 60, 
              margin: '0 auto', 
              mb: 2,
              bgcolor: theme.palette.primary.main,
              border: `2px solid ${theme.palette.primary.light}`,
              boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}
          >
            <SchoolIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom fontWeight={600} color="primary">
            {displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
            {displayTagline}
          </Typography>
        </Box>

        {/* User Info */}
        <Box sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', 
          p: 2, 
          borderRadius: 1, 
          mb: 3,
          textAlign: 'center',
          border: `1px solid ${theme.palette.divider}`
        }}>
          <Chip
            icon={<PersonIcon />}
            label={`${user?.name} (${user?.role})`}
            variant="filled"
            color="primary"
            size="small"
            sx={{ mb: 1, fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Welcome! You're ready to proceed
          </Typography>
        </Box>

        {/* Quick Info */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <LocationIcon sx={{ fontSize: 18, mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {instituteProfile?.address || school.address || 'Address not specified'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <PhoneIcon sx={{ fontSize: 18, mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {instituteProfile?.phone || school.contact || 'Contact not specified'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <EmailIcon sx={{ fontSize: 18, mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {school.email || 'Email not specified'}
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            type="button"
            onClick={handleProceedToApp}
            fullWidth
            size="large"
            sx={{ 
              py: 1.5, 
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: 2,
              boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}
          >
            Proceed to Dashboard
          </Button>
          
          <Button
            variant="outlined"
            onClick={handleLogout}
            fullWidth
            size="large"
            startIcon={<LogoutIcon />}
            sx={{ 
              py: 1.5, 
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: 2,
              borderColor: theme.palette.error.main,
              color: theme.palette.error.main,
              '&:hover': {
                borderColor: theme.palette.error.dark,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.08)' : 'rgba(244, 67, 54, 0.04)'
              }
            }}
          >
            Log Out
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SchoolWelcomeScreen;
