import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dashboard as DashboardIcon, Event as EventIcon, CalendarToday as CalendarIcon, AccessTime as AccessTimeIcon, LocationOn as LocationIcon, Person as PersonIcon, EventBusy as EventBusyIcon, Feedback as FeedbackIcon, Lightbulb as LightbulbIcon, Close as CloseIcon } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Select, MenuItem, FormControl, InputLabel, Box, IconButton, Typography, useTheme, useMediaQuery, Theme } from '@mui/material';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { styled as muiStyled } from '@mui/material/styles';

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  background: ${({ theme }) => theme.BG};
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const WelcomeCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const WelcomeTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const GreetingText = styled.span`
  font-size: 0.875rem;
  font-weight: 400;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const UserNameText = styled.span`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const InfoCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const InfoTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoText = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.6;
  margin: 0;
`;

// Events section styled components
const EventsSection = styled.div`
  margin-bottom: 3rem;
  width: 100%;
`;

const EventsTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const EventCard = styled.div<{ $eventType?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f6';
      case 'sports': return '#10b981';
      case 'cultural': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'meeting': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f6';
      case 'sports': return '#10b981';
      case 'cultural': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'meeting': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
  }
`;

const EventHeader = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const EventTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  flex: 1;
`;

const EventTypeBadge = styled.span<{ $eventType?: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f615';
      case 'sports': return '#10b98115';
      case 'cultural': return '#f59e0b15';
      case 'holiday': return '#ef444415';
      case 'meeting': return '#8b5cf615';
      default: return '#6b728015';
    }
  }};
  color: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f6';
      case 'sports': return '#10b981';
      case 'cultural': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'meeting': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
`;

const EventDescription = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 1rem 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EventDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EventDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  svg {
    font-size: 1rem;
    opacity: 0.7;
  }
`;

// Quick Actions section styled components
const QuickActionsSection = styled.div`
  margin-bottom: 2rem;
  width: 100%;
`;

const QuickActionsTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1rem;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }
`;

const QuickActionItem = styled.div<{ $color?: string; $fullWidthMobile?: boolean }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.25rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: ${({ $color }) => $color || '#6366f1'};
  }
  
  @media (max-width: 768px) {
    padding: 1rem 0.75rem;
    gap: 0.5rem;
    
    ${({ $fullWidthMobile }) => $fullWidthMobile && `
      grid-column: 1 / -1;
    `}
  }
`;

const QuickActionIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color, theme }) => $color ? `${$color}15` : theme.ICON_BG || 'rgba(99, 102, 241, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || '#6366f1'};
  transition: all 0.2s ease;
  
  svg {
    width: 24px !important;
    height: 24px !important;
  }
  
  ${QuickActionItem}:hover & {
    background: ${({ $color }) => $color ? `${$color}25` : 'rgba(99, 102, 241, 0.15)'};
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    
    svg {
      width: 20px !important;
      height: 20px !important;
    }
  }
`;

const QuickActionTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

// Styled Dialog Components (copied from CreateReportForm)
const StyledDialog = muiStyled(Dialog)(({ theme }) => ({
  zIndex: 1300,
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    background: theme.palette.mode === 'dark' 
      ? theme.palette.background.paper 
      : theme.palette.background.paper,
    maxWidth: '600px',
    width: '95%',
    margin: '84px 16px 16px',
    overflow: 'hidden',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
      : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    transform: 'translateY(0)',
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    zIndex: 1301,
    [theme.breakpoints.down('sm')]: {
      width: 'calc(100% - 32px)',
      height: 'calc(100% - 96px)',
      margin: '76px 16px 20px',
      borderRadius: '16px',
      maxHeight: 'calc(100% - 96px)'
    }
  },
  '& .MuiBackdrop-root': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.5)'
      : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    position: 'fixed',
    zIndex: 1300
  }
}));

const DialogHeader = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
  backdropFilter: 'blur(8px)',
  position: 'relative',
  zIndex: 1
}));

const DialogTitleStyled = muiStyled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main,
  textShadow: theme.palette.mode === 'dark'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'
}));

const StyledDialogContent = muiStyled(DialogContent)(({ theme }) => ({
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  maxHeight: 'calc(100vh - 180px)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.2) transparent'
    : 'rgba(0, 0, 0, 0.2) transparent',
  '&::-webkit-scrollbar': {
    width: '8px',
    backgroundColor: 'transparent'
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
    borderRadius: '4px',
    margin: '4px'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    border: `2px solid ${theme.palette.mode === 'dark'
      ? theme.palette.background.paper
      : theme.palette.background.paper}`,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'
    }
  },
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
  '& .MuiFormControl-root': {
    transition: 'background-color 0.2s ease',
  },
  '& .MuiInputBase-root': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'background-color 0.2s ease',
    '&:hover, &.Mui-focused': {
      background: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)',
    },
    '& .MuiSelect-select, & .MuiInputBase-input': {
      padding: '12px 14px',
      fontSize: '0.95rem',
      '&::placeholder': {
        color: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
        opacity: 1
      }
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none'
    }
  }
}));

const FormActions = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '16px 24px',
  borderTop: `1px solid ${theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
  '& .MuiButton-root': {
    borderRadius: '8px',
    textTransform: 'none',
    padding: '8px 20px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease'
  }
}));

// Select menu props configuration
const selectMenuProps = {
  PaperProps: {
    sx: {
      maxHeight: 300,
      backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' 
        ? theme.palette.background.paper
        : theme.palette.background.paper,
      '& .MuiList-root': {
        padding: '4px 0',
        maxHeight: 300,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: (theme: Theme) => theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.2) transparent'
          : 'rgba(0, 0, 0, 0.2) transparent',
        '&::-webkit-scrollbar': {
          width: '12px',
          background: 'transparent'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.2)',
          borderRadius: '6px',
          border: (theme: Theme) => `3px solid ${theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : theme.palette.background.paper}`,
          '&:hover': {
            backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.3)'
              : 'rgba(0, 0, 0, 0.3)'
          }
        },
        '@supports (-moz-appearance: none)': {
          scrollbarWidth: 'thin',
          scrollbarColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2) transparent'
            : 'rgba(0, 0, 0, 0.2) transparent'
        }
      },
      '& .MuiMenuItem-root': {
        padding: '10px 14px',
        fontSize: '0.95rem',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : theme.palette.action.hover
        },
        '&.Mui-selected': {
          backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.16)'
            : theme.palette.action.selected,
          fontWeight: 500,
          '&:hover': {
            backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.24)'
              : theme.palette.action.selected
          }
        }
      }
    }
  },
  MenuListProps: {
    style: {
      padding: 0
    }
  },
  anchorOrigin: {
    vertical: 'bottom' as const,
    horizontal: 'left' as const
  },
  transformOrigin: {
    vertical: 'top' as const,
    horizontal: 'left' as const
  }
};

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { showToast } = useToast();
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const [events, setEvents] = useState<Array<{
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    event_type: string;
    is_all_day: boolean;
    visible_to: string[];
  }>>([]);

  // Leave Request Modal state
  const [leaveRequestModalOpen, setLeaveRequestModalOpen] = useState(false);
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    studentId: '',
    staffId: '',
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Complaint modal state
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    subject: '',
    complaintText: '',
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Suggestion modal state
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    subject: '',
    suggestionText: '',
  });
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [staffGender, setStaffGender] = useState<string>('');

  // Load events and active session on component mount
  useEffect(() => {
    if (user?.school_id) {
      loadEvents();
      loadActiveSession();
    }
  }, [user?.school_id]);

  // Fetch staff gender for teachers
  useEffect(() => {
    const fetchStaffGender = async () => {
      if (user?.staff_id && user?.school_id) {
        try {
          const { data, error } = await supabase
            .from('staff')
            .select('gender')
            .eq('id', user.staff_id)
            .eq('school_id', user.school_id)
            .single();
          
          if (!error && data) {
            setStaffGender(data.gender || '');
          }
        } catch (error) {
          console.error('Error fetching staff gender:', error);
        }
      } else {
        setStaffGender('');
      }
    };
    
    fetchStaffGender();
  }, [user?.staff_id, user?.school_id]);

  // Helper function to get gender-based title
  const getGenderTitle = (gender: string) => {
    if (!gender) return '';
    const genderLower = gender.toLowerCase();
    if (genderLower === 'male' || genderLower === 'm') return 'Mr. ';
    if (genderLower === 'female' || genderLower === 'f') return 'Ms. ';
    return '';
  };

  // Helper function to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening';
    } else {
      return 'Good Evening';
    }
  };

  const loadActiveSession = async () => {
    if (!user?.school_id) return;
    try {
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .maybeSingle();

      if (activeSessionData) {
        setActiveSessionId(activeSessionData.id);
      }
    } catch (error) {
      console.error('[UserDashboard] Error loading active session:', error);
    }
  };

  const loadEvents = async () => {
    const schoolId = user?.school_id;
    if (!schoolId) return;

    try {
      const userRole = user?.role || 'Guest';

      // Fetch all events for the school
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('school_id', schoolId)
        .gte('end_date', new Date().toISOString().split('T')[0]) // Only future events
        .order('start_date', { ascending: true })
        .limit(10); // Limit to 10 upcoming events

      if (error) throw error;

      // Filter events based on user role and visible_to array
      const filteredEvents = (data || []).filter(event => {
        // If visible_to is empty, show to all
        if (!event.visible_to || event.visible_to.length === 0) return true;
        // Check if user's role is in visible_to array
        return event.visible_to.includes(userRole);
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('[UserDashboard] Error loading events:', error);
    }
  };

  // Helper function to format event date
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper function to format event time
  const formatEventTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Leave Request Modal JSX
  const leaveRequestModalJSX = useMemo(() => {
    const isTeacher = user?.role === 'Teacher';

    return (
      <StyledDialog
        open={leaveRequestModalOpen}
        onClose={() => !submittingLeaveRequest && setLeaveRequestModalOpen(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitleStyled>
            Request for Leave
          </DialogTitleStyled>
          <IconButton
            onClick={() => setLeaveRequestModalOpen(false)}
            disabled={submittingLeaveRequest}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            {isTeacher && user?.staff_id && (
              <Box sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: theme.BG === '#252525' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: `1px solid ${theme.BORDER}`
              }}>
                <Box component="span" sx={{ color: theme.TEXT_PRIMARY, fontWeight: 500 }}>
                  Requesting leave for: <strong>{user.name || 'You'}</strong>
                </Box>
              </Box>
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={leaveRequestForm.leaveType}
                onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, leaveType: e.target.value })}
                label="Leave Type"
                MenuProps={selectMenuProps}
              >
                <MenuItem value="sick">Sick Leave</MenuItem>
                <MenuItem value="personal">Personal Leave</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="family_event">Family Event</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <Box display="flex" gap={2}>
              <TextField
                label="Start Date"
                type="date"
                value={leaveRequestForm.startDate}
                onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, startDate: e.target.value })}
                fullWidth
                required
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={leaveRequestForm.endDate}
                onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, endDate: e.target.value })}
                fullWidth
                required
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              label="Reason"
              value={leaveRequestForm.reason}
              onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, reason: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
              size="small"
              placeholder="Please provide a detailed reason for the leave request..."
            />
          </Box>
        </StyledDialogContent>

        <FormActions>
          <Button
            onClick={() => setLeaveRequestModalOpen(false)}
            disabled={submittingLeaveRequest}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!user?.school_id || !activeSessionId) {
                showToast('Active session not found. Please contact administration.', 'error');
                return;
              }

              const isTeacher = user?.role === 'Teacher';
              const hasStaffId = isTeacher && user?.staff_id;

              if (!hasStaffId || !leaveRequestForm.startDate || !leaveRequestForm.endDate || !leaveRequestForm.reason.trim()) {
                showToast('Please fill in all required fields.', 'error');
                return;
              }

              if (new Date(leaveRequestForm.startDate) > new Date(leaveRequestForm.endDate)) {
                showToast('End date must be after start date.', 'error');
                return;
              }

              setSubmittingLeaveRequest(true);
              try {
                const requestedBy = isTeacher ? 'staff' : 'student';
                const requestedById = isTeacher ? (user?.staff_id || null) : null;
                const requestedByName = isTeacher ? (user?.name || 'Staff') : (user?.name || 'Student');

                const insertData: any = {
                  school_id: user.school_id,
                  session_id: activeSessionId,
                  leave_type: leaveRequestForm.leaveType,
                  start_date: leaveRequestForm.startDate,
                  end_date: leaveRequestForm.endDate,
                  reason: leaveRequestForm.reason.trim(),
                  requested_by: requestedBy,
                  requested_by_id: requestedById,
                  requested_by_name: requestedByName,
                  status: 'pending',
                };

                if (isTeacher && user?.staff_id) {
                  insertData.staff_id = user.staff_id;
                }

                const { error } = await supabase
                  .from('leave_requests')
                  .insert(insertData);

                if (error) throw error;

                showToast('Leave request submitted successfully!', 'success');
                setLeaveRequestModalOpen(false);
                setLeaveRequestForm({
                  studentId: '',
                  staffId: '',
                  leaveType: 'sick',
                  startDate: '',
                  endDate: '',
                  reason: '',
                });
              } catch (error: any) {
                console.error('Error submitting leave request:', error);
                showToast('Failed to submit leave request: ' + (error.message || 'Unknown error'), 'error');
              } finally {
                setSubmittingLeaveRequest(false);
              }
            }}
            variant="contained"
            size="small"
            disabled={submittingLeaveRequest || !(user?.role === 'Teacher' && user?.staff_id) || !leaveRequestForm.startDate || !leaveRequestForm.endDate || !leaveRequestForm.reason.trim()}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {submittingLeaveRequest ? 'Submitting...' : 'Submit Request'}
          </Button>
        </FormActions>
      </StyledDialog>
    );
  }, [leaveRequestModalOpen, submittingLeaveRequest, theme, user, activeSessionId, leaveRequestForm, showToast, fullScreen]);

  // Complaint Modal JSX
  const complaintModalJSX = useMemo(() => {
    return (
      <StyledDialog
        open={complaintModalOpen}
        onClose={() => !submittingComplaint && setComplaintModalOpen(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitleStyled>
            Register Complaint
          </DialogTitleStyled>
          <IconButton
            onClick={() => setComplaintModalOpen(false)}
            disabled={submittingComplaint}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Subject"
              value={complaintForm.subject}
              onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
              fullWidth
              required
              size="small"
              placeholder="Brief description of your complaint"
            />

            <TextField
              label="Complaint Details"
              value={complaintForm.complaintText}
              onChange={(e) => setComplaintForm({ ...complaintForm, complaintText: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
              size="small"
              placeholder="Please provide detailed information about your complaint..."
            />
          </Box>
        </StyledDialogContent>

        <FormActions>
          <Button
            onClick={() => setComplaintModalOpen(false)}
            disabled={submittingComplaint}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!user?.school_id) {
                showToast('School ID not found. Please contact administration.', 'error');
                return;
              }

              if (!complaintForm.subject.trim() || !complaintForm.complaintText.trim()) {
                showToast('Please fill in all required fields.', 'error');
                return;
              }

              setSubmittingComplaint(true);
              try {
                const isTeacher = user?.role === 'Teacher';
                const submittedBy = isTeacher ? 'staff' : 'student';
                const submittedById = isTeacher ? (user?.staff_id || null) : null;
                const submittedByName = isTeacher ? (user?.name || 'Staff') : (user?.name || 'Student');

                const { data: complaintData, error } = await supabase
                  .from('complaints')
                  .insert({
                    school_id: user.school_id,
                    submitted_by: submittedBy,
                    submitted_by_id: submittedById,
                    submitted_by_name: submittedByName,
                    subject: complaintForm.subject.trim(),
                    complaint_text: complaintForm.complaintText.trim(),
                    status: 'in_review',
                  })
                  .select()
                  .single();

                if (error) throw error;

                try {
                  await createComplaintNotificationForAdmins(
                    complaintData.id,
                    user.school_id,
                    submittedByName,
                    complaintForm.subject.trim()
                  );
                } catch (notificationError) {
                  console.error('Error creating notification for complaint:', notificationError);
                }

                showToast('Complaint submitted successfully!', 'success');
                setComplaintModalOpen(false);
                setComplaintForm({
                  subject: '',
                  complaintText: '',
                });
              } catch (error: any) {
                console.error('Error submitting complaint:', error);
                showToast('Failed to submit complaint: ' + (error.message || 'Unknown error'), 'error');
              } finally {
                setSubmittingComplaint(false);
              }
            }}
            variant="contained"
            size="small"
            disabled={submittingComplaint || !complaintForm.subject.trim() || !complaintForm.complaintText.trim()}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
          </Button>
        </FormActions>
      </StyledDialog>
    );
  }, [complaintModalOpen, submittingComplaint, complaintForm, theme, user, showToast, fullScreen]);

  // Suggestion Modal JSX
  const suggestionModalJSX = useMemo(() => {
    return (
      <StyledDialog
        open={suggestionModalOpen}
        onClose={() => !submittingSuggestion && setSuggestionModalOpen(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitleStyled>
            Submit Suggestion
          </DialogTitleStyled>
          <IconButton
            onClick={() => setSuggestionModalOpen(false)}
            disabled={submittingSuggestion}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Subject"
              value={suggestionForm.subject}
              onChange={(e) => setSuggestionForm({ ...suggestionForm, subject: e.target.value })}
              fullWidth
              required
              size="small"
              placeholder="Brief description of your suggestion"
            />

            <TextField
              label="Suggestion Details"
              value={suggestionForm.suggestionText}
              onChange={(e) => setSuggestionForm({ ...suggestionForm, suggestionText: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
              size="small"
              placeholder="Please provide detailed information about your suggestion..."
            />
          </Box>
        </StyledDialogContent>

        <FormActions>
          <Button
            onClick={() => setSuggestionModalOpen(false)}
            disabled={submittingSuggestion}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!user?.school_id) {
                showToast('School ID not found. Please contact administration.', 'error');
                return;
              }

              if (!suggestionForm.subject.trim() || !suggestionForm.suggestionText.trim()) {
                showToast('Please fill in all required fields.', 'error');
                return;
              }

              setSubmittingSuggestion(true);
              try {
                const isTeacher = user?.role === 'Teacher';
                const submittedBy = isTeacher ? 'staff' : 'student';
                const submittedById = isTeacher ? (user?.staff_id || null) : null;
                const submittedByName = isTeacher ? (user?.name || 'Staff') : (user?.name || 'Student');

                const { data: suggestionData, error } = await supabase
                  .from('suggestions')
                  .insert({
                    school_id: user.school_id,
                    submitted_by: submittedBy,
                    submitted_by_id: submittedById,
                    submitted_by_name: submittedByName,
                    subject: suggestionForm.subject.trim(),
                    suggestion_text: suggestionForm.suggestionText.trim(),
                    status: 'in_review',
                  })
                  .select()
                  .single();

                if (error) throw error;

                try {
                  await createSuggestionNotificationForAdmins(
                    suggestionData.id,
                    user.school_id,
                    submittedByName,
                    suggestionForm.subject.trim()
                  );
                } catch (notificationError) {
                  console.error('Error creating notification for suggestion:', notificationError);
                }

                showToast('Suggestion submitted successfully!', 'success');
                setSuggestionModalOpen(false);
                setSuggestionForm({
                  subject: '',
                  suggestionText: '',
                });
              } catch (error: any) {
                console.error('Error submitting suggestion:', error);
                showToast('Failed to submit suggestion: ' + (error.message || 'Unknown error'), 'error');
              } finally {
                setSubmittingSuggestion(false);
              }
            }}
            variant="contained"
            size="small"
            disabled={submittingSuggestion || !suggestionForm.subject.trim() || !suggestionForm.suggestionText.trim()}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {submittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}
          </Button>
        </FormActions>
      </StyledDialog>
    );
  }, [suggestionModalOpen, submittingSuggestion, suggestionForm, theme, user, showToast, fullScreen]);

  // Helper function to notify admins/staff when a suggestion is submitted
  const createSuggestionNotificationForAdmins = async (
    suggestionId: number,
    schoolId: number,
    submittedByName: string,
    subject: string
  ) => {
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)
        .in('role', ['Principal', 'Admin']);

      if (adminError) throw adminError;

      if (!adminUsers || adminUsers.length === 0) {
        return;
      }

      const notifications = adminUsers.map((admin) => ({
        recipient_id: admin.id,
        school_id: schoolId,
        notification_type: 'suggestion',
        title: 'New Suggestion Submitted',
        message: `${submittedByName} submitted a new suggestion: "${subject}"`,
        is_read: false,
        is_important: false,
        created_at: new Date().toISOString(),
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;
    } catch (error: any) {
      console.error('Error creating suggestion notifications for admins:', error);
      throw error;
    }
  };

  // Helper function to notify admins/staff when a complaint is submitted
  const createComplaintNotificationForAdmins = async (
    complaintId: number,
    schoolId: number,
    submittedByName: string,
    subject: string
  ) => {
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)
        .in('role', ['Principal', 'Admin']);

      if (adminError) throw adminError;

      if (!adminUsers || adminUsers.length === 0) {
        return;
      }

      const notifications = adminUsers.map((admin) => ({
        recipient_id: admin.id,
        school_id: schoolId,
        notification_type: 'complaint',
        title: 'New Complaint Submitted',
        message: `${submittedByName} submitted a new complaint: "${subject}"`,
        is_read: false,
        is_important: true,
        created_at: new Date().toISOString(),
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;
    } catch (error: any) {
      console.error('Error creating complaint notifications for admins:', error);
      throw error;
    }
  };

  return (
    <Container>
      <WelcomeCard>
        <WelcomeTitle>
          <GreetingText>{getTimeBasedGreeting()}</GreetingText>
          <UserNameText>{getGenderTitle(staffGender)}{user?.name || 'User'}</UserNameText>
        </WelcomeTitle>
      </WelcomeCard>

      {/* Events Section */}
      {events.length > 0 && (
        <EventsSection>
          <EventsTitle>
            <EventIcon />
            Upcoming Events
          </EventsTitle>
          <EventsGrid>
            {events.map((event) => (
              <EventCard key={event.id} $eventType={event.event_type}>
                <EventHeader>
                  <EventTitle>{event.title}</EventTitle>
                  <EventTypeBadge $eventType={event.event_type}>
                    {event.event_type}
                  </EventTypeBadge>
                </EventHeader>
                <EventDescription>{event.description}</EventDescription>
                <EventDetails>
                  <EventDetailRow>
                    <CalendarIcon />
                    <span>
                      {formatEventDate(event.start_date)}
                      {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                    </span>
                  </EventDetailRow>
                  {!event.is_all_day && event.start_time && (
                    <EventDetailRow>
                      <AccessTimeIcon />
                      <span>
                        {formatEventTime(event.start_time)}
                        {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                      </span>
                    </EventDetailRow>
                  )}
                  {event.location && (
                    <EventDetailRow>
                      <LocationIcon />
                      <span>{event.location}</span>
                    </EventDetailRow>
                  )}
                </EventDetails>
              </EventCard>
            ))}
          </EventsGrid>
        </EventsSection>
      )}

      {/* Quick Actions Section */}
      <QuickActionsSection>
        <QuickActionsTitle>Quick Actions</QuickActionsTitle>
        <QuickActionsGrid>
          <QuickActionItem 
            $color="#6366f1"
            $fullWidthMobile={true}
            onClick={() => {
              if (user?.role === 'Teacher' && user?.staff_id) {
                navigate('/profile');
              } else {
                navigate('/my-profile');
              }
            }}
          >
            <QuickActionIcon $color="#6366f1">
              <PersonIcon />
            </QuickActionIcon>
            <QuickActionTitle>My Profile</QuickActionTitle>
          </QuickActionItem>

          <QuickActionItem
            $color="#3b82f6"
            onClick={() => {
              if (user?.role === 'Teacher' && user?.staff_id) {
                setLeaveRequestForm({
                  studentId: '',
                  staffId: user.staff_id.toString(),
                  leaveType: 'sick',
                  startDate: '',
                  endDate: '',
                  reason: '',
                });
              } else {
                setLeaveRequestForm({
                  studentId: '',
                  staffId: '',
                  leaveType: 'sick',
                  startDate: '',
                  endDate: '',
                  reason: '',
                });
              }
              setLeaveRequestModalOpen(true);
            }}
          >
            <QuickActionIcon $color="#3b82f6">
              <EventBusyIcon />
            </QuickActionIcon>
            <QuickActionTitle>Request for Leave</QuickActionTitle>
          </QuickActionItem>

          <QuickActionItem
            $color="#ef4444"
            onClick={() => {
              setComplaintForm({
                subject: '',
                complaintText: '',
              });
              setComplaintModalOpen(true);
            }}
          >
            <QuickActionIcon $color="#ef4444">
              <FeedbackIcon />
            </QuickActionIcon>
            <QuickActionTitle>Register Complaint</QuickActionTitle>
          </QuickActionItem>

          <QuickActionItem
            $color="#f59e0b"
            onClick={() => {
              setSuggestionForm({
                subject: '',
                suggestionText: '',
              });
              setSuggestionModalOpen(true);
            }}
          >
            <QuickActionIcon $color="#f59e0b">
              <LightbulbIcon />
            </QuickActionIcon>
            <QuickActionTitle>Suggestions</QuickActionTitle>
          </QuickActionItem>
        </QuickActionsGrid>
      </QuickActionsSection>

      {/* Modals */}
      {leaveRequestModalJSX}
      {complaintModalJSX}
      {suggestionModalJSX}
    </Container>
  );
};

export default UserDashboard;

