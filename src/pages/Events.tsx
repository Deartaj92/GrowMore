import React, { useState, useEffect, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { supabase } from '../supabaseClient';
import {
  Event as EventIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
  Notifications as NoticeIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  IconButton,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Theme,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';
import Loader from '../components/Loader';

const Container = styled.div<{ $theme?: any }>`
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  background: ${({ $theme }) => $theme?.BG || '#ffffff'};

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div<{ $theme?: any }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem;
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'};
  border: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'};
  border-radius: 12px;
  margin-bottom: 2rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
    gap: 1rem;
  }
`;

const HeaderTitle = styled.div<{ $theme?: any }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${({ $theme }) => $theme?.TEXT_PRIMARY || '#1f2937'};
  font-size: 1.5rem;
  font-weight: 700;
`;

const ContentCard = styled(Paper)<{ $theme?: any }>`
  padding: 1.5rem;
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'} !important;
  border: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'} !important;
  margin-bottom: 1.5rem;
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

// Admin roles that see everything (excluded from event visibility selection)
const ADMIN_ROLES = ['Principal', 'Admin', 'Super Admin'];

interface Event {
  id?: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  event_type: 'academic' | 'sports' | 'cultural' | 'holiday' | 'meeting' | 'other';
  is_all_day: boolean;
  visible_to: string[]; // Array of roles
  school_id: number;
  created_at?: string;
  updated_at?: string;
}

interface Notice {
  id?: number;
  title: string;
  description: string;
  notice_type: 'info' | 'warning' | 'urgent' | 'success';
  visible_to?: string[]; // Array of roles (legacy, for backward compatibility)
  is_active: boolean;
  school_id: number;
  expiry_date?: string | null; // Date when notice expires
  // Individual targeting fields
  audience_group?: 'students' | 'staff' | 'parents' | 'all_users';
  target_scope?: 'all' | 'single' | 'multi' | 'class' | 'role';
  student_id?: number | null;
  student_ids?: number[] | null;
  staff_id?: number | null;
  staff_ids?: number[] | null;
  family_id?: number | null;
  family_ids?: number[] | null;
  class_id?: number | null;
  section_id?: number | null;
  staff_role?: string | null;
  created_at?: string;
  updated_at?: string;
}

const Events: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const { showToast } = useToast();
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  // Tab state
  const [activeTab, setActiveTab] = useState(0); // 0 = Events, 1 = Notices
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSaving, setEventsSaving] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [selectedEventRoles, setSelectedEventRoles] = useState<string[]>([]);
  // Notices state
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticesSaving, setNoticesSaving] = useState(false);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Partial<Notice> | null>(null);
  const [selectedNoticeRoles, setSelectedNoticeRoles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  // Individual targeting state
  const [noticeAudience, setNoticeAudience] = useState<'all_students' | 'all_staff' | 'all_parents' | 'students_selected' | 'staff_selected' | 'parents_selected' | 'all_users'>('all_students');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<number[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedSectionId, setSelectedSectionId] = useState<number | ''>('');
  const [students, setStudents] = useState<Array<{ id: number; name: string; father_name?: string | null; class_id: number; section_id: number | null; roll_number?: string | null }>>([]);
  const [staffMembers, setStaffMembers] = useState<Array<{ id: number; name: string; role?: string | null }>>([]);
  const [families, setFamilies] = useState<Array<{ id: number; name: string; contact_person?: string | null; contact_number?: string | null }>>([]);
  const [staffToUserIdMap, setStaffToUserIdMap] = useState<Map<number, number>>(new Map());
  const [familyToUserIdMap, setFamilyToUserIdMap] = useState<Map<number, number>>(new Map());
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: number; name: string; class_id: number }>>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [familySearchTerm, setFamilySearchTerm] = useState('');
  
  // Convert theme mode string to theme object
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (user?.school_id) {
      loadEvents();
      loadNotices();
      loadRoles();
      loadTargetingData();
    }
  }, [user]);

  const loadTargetingData = async () => {
    if (!user?.school_id) return;
    try {
      const [
        { data: classData },
        { data: sectionData },
        { data: studentData },
        { data: staffData },
        { data: familiesData }
      ] = await Promise.all([
        supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name'),
        supabase.from('sections').select('id, name, class_id').eq('school_id', user.school_id).order('name'),
        supabase.from('students').select('id, name, father_name, class_id, section_id, roll_number').eq('school_id', user.school_id).order('id'),
        supabase.from('staff').select('id, name, role').eq('school_id', user.school_id).order('name'),
        supabase.from('families').select('id, name, contact_person, contact_number').eq('school_id', user.school_id).order('name')
      ]);
      
      // Fetch users separately with error handling
      let usersResult: { data: any[] | null; error: any } = { data: null, error: null };
      try {
        const result = await supabase.from('users').select('id, staff_id, family_id').eq('school_id', user.school_id);
        usersResult = { data: result.data, error: result.error };
      } catch (err) {
        usersResult = { data: null, error: err };
        console.warn('Could not load users mapping (this is optional):', err);
      }
      if (classData) setClasses(classData);
      if (sectionData) setSections(sectionData);
      if (studentData) setStudents(studentData);
      if (staffData) setStaffMembers(staffData);
      if (familiesData) setFamilies(familiesData);
      
      // Build maps for staff_id -> user_id and family_id -> user_id
      // Handle users query error gracefully - it might fail due to RLS or missing column
      if (usersResult && !usersResult.error && usersResult.data) {
        const staffMap = new Map<number, number>();
        const familyMap = new Map<number, number>();
        usersResult.data.forEach((u: any) => {
          if (u.staff_id) {
            staffMap.set(u.staff_id, u.id);
          }
          if (u.family_id) {
            familyMap.set(u.family_id, u.id);
          }
        });
        setStaffToUserIdMap(staffMap);
        setFamilyToUserIdMap(familyMap);
      } else if (usersResult?.error) {
        // Log error but don't block the UI - we can still work without the user mapping
        console.warn('Could not load users mapping (this is optional):', usersResult.error);
      }
    } catch (error) {
      console.error('Error loading targeting data:', error);
    }
  };

  const loadRoles = async () => {
    if (!user?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('name')
        .eq('school_id', user.school_id)
        .order('name');

      if (error) throw error;
      
      // Get role names from database, exclude admin roles, and add Student and Parent
      const roleNames = (data || []).map(role => role.name);
      const filteredRoles = roleNames.filter(role => !ADMIN_ROLES.includes(role));
      
      // Add Student and Parent if not already present
      const allRoles = [...filteredRoles, 'Student', 'Parent'];
      const eventRoles = Array.from(new Set(allRoles));
      setAvailableRoles(eventRoles);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      // Fallback to default roles if fetch fails
      setAvailableRoles(['Teacher', 'Student', 'Parent', 'Accountant', 'Guest']);
    }
  };

  const loadEvents = async () => {
    if (!user?.school_id) return;
    
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('school_id', user.school_id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      showToast('Failed to load events: ' + error.message, 'error');
    } finally {
      setEventsLoading(false);
    }
  };

  const [noticeViewsData, setNoticeViewsData] = useState<Map<number, Array<{ viewer_identifier: string; viewer_type: string; viewer_role?: string; viewer_name?: string; student_id?: number; staff_id?: number; user_id?: number; seen_at: string; dismissed?: boolean; dismissed_at?: string | null }>>>(new Map());
  const [seenByModalOpen, setSeenByModalOpen] = useState(false);
  const [selectedNoticeForSeenBy, setSelectedNoticeForSeenBy] = useState<Notice | null>(null);
  const [seenByEntries, setSeenByEntries] = useState<Array<any>>([]);
  const [seenByLoading, setSeenByLoading] = useState(false);
  const [seenBySearchTerm, setSeenBySearchTerm] = useState('');

  const loadNotices = async () => {
    if (!user?.school_id) return;
    
    setNoticesLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('school_id', user.school_id)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`) // Only get notices that haven't expired
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);

      // Load notice views data for all notices
      if (data && data.length > 0) {
        const noticeIds = data.map(n => n.id).filter((id): id is number => id !== undefined);
        if (noticeIds.length > 0) {
          const { data: viewsData, error: viewsError } = await supabase
            .from('notice_views')
            .select('*')
            .in('notice_id', noticeIds)
            .order('seen_at', { ascending: false });

          if (!viewsError && viewsData) {
            // Group by notice_id
            const viewsMap = new Map<number, Array<any>>();
            viewsData.forEach(item => {
              if (!viewsMap.has(item.notice_id)) {
                viewsMap.set(item.notice_id, []);
              }
              viewsMap.get(item.notice_id)!.push(item);
            });
            setNoticeViewsData(viewsMap);
          }
        }
      }
    } catch (error: any) {
      showToast('Failed to load notices: ' + error.message, 'error');
    } finally {
      setNoticesLoading(false);
    }
  };

  const handleAddEvent = () => {
    setEditingEvent({
      title: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      location: '',
      event_type: 'academic',
      is_all_day: false,
      visible_to: [],
      school_id: user?.school_id || 0
    });
    setSelectedEventRoles([]);
    setEventDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setSelectedEventRoles(event.visible_to || []);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!user?.school_id || !editingEvent) return;

    try {
      setEventsSaving(true);
      const eventData = {
        ...editingEvent,
        visible_to: selectedEventRoles,
        school_id: user.school_id,
        updated_at: new Date().toISOString()
      };

      if (editingEvent.id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
          .eq('school_id', user.school_id);

        if (error) throw error;
        showToast('Event updated successfully', 'success');
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert([{
            ...eventData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        showToast('Event created successfully', 'success');
      }

      setEventDialogOpen(false);
      setEditingEvent(null);
      setSelectedEventRoles([]);
      loadEvents();
    } catch (error: any) {
      showToast('Failed to save event: ' + error.message, 'error');
    } finally {
      setEventsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('school_id', user?.school_id);

      if (error) throw error;
      showToast('Event deleted successfully', 'success');
      loadEvents();
    } catch (error: any) {
      showToast('Failed to delete event: ' + error.message, 'error');
    }
  };

  // Notices handlers
  const handleAddNotice = () => {
    setEditingNotice({
      title: '',
      description: '',
      notice_type: 'info',
      is_active: true,
      visible_to: [],
      expiry_date: null,
      school_id: user?.school_id || 0
    });
    setSelectedNoticeRoles([]);
    setNoticeAudience('all_students');
    setSelectedStudentIds([]);
    setSelectedStaffIds([]);
    setSelectedFamilyIds([]);
    setSelectedClassId('');
    setSelectedSectionId('');
    setStudentSearchTerm('');
    setStaffSearchTerm('');
    setFamilySearchTerm('');
    setNoticeDialogOpen(true);
  };

  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice);
    setSelectedNoticeRoles(notice.visible_to || []);
    
    // Determine audience type from notice data
    if (notice.audience_group === 'students') {
      if (notice.target_scope === 'all') {
        setNoticeAudience('all_students');
      } else if (notice.target_scope === 'class') {
        setNoticeAudience('students_selected');
        setSelectedClassId(notice.class_id || '');
        setSelectedSectionId(notice.section_id || '');
      } else if (notice.target_scope === 'multi' || notice.target_scope === 'single') {
        setNoticeAudience('students_selected');
        setSelectedStudentIds(notice.student_ids || (notice.student_id ? [notice.student_id] : []));
      }
    } else if (notice.audience_group === 'staff') {
      if (notice.target_scope === 'all') {
        setNoticeAudience('all_staff');
      } else if (notice.target_scope === 'multi' || notice.target_scope === 'single') {
        setNoticeAudience('staff_selected');
        setSelectedStaffIds(notice.staff_ids || (notice.staff_id ? [notice.staff_id] : []));
      }
    } else if (notice.audience_group === 'parents') {
      if (notice.target_scope === 'all') {
        setNoticeAudience('all_parents');
      } else if (notice.target_scope === 'multi' || notice.target_scope === 'single') {
        setNoticeAudience('parents_selected');
        setSelectedFamilyIds(notice.family_ids || (notice.family_id ? [notice.family_id] : []));
      }
    } else if (notice.audience_group === 'all_users') {
      setNoticeAudience('all_users');
    } else {
      // Legacy: use visible_to roles
      setNoticeAudience('all_students');
    }
    
    setNoticeDialogOpen(true);
  };

  const handleSaveNotice = async () => {
    if (!user?.school_id || !editingNotice) return;

    try {
      setNoticesSaving(true);
      
      // Build targeting data based on audience selection
      let targetingData: any = {};
      
      if (noticeAudience === 'all_students') {
        targetingData = {
          audience_group: 'students',
          target_scope: 'all',
          student_id: null,
          student_ids: null,
          class_id: null,
          section_id: null,
        };
      } else if (noticeAudience === 'students_selected') {
        if (selectedClassId) {
          // Class-based targeting
          targetingData = {
            audience_group: 'students',
            target_scope: 'class',
            class_id: selectedClassId,
            section_id: selectedSectionId || null,
            student_id: null,
            student_ids: null,
          };
        } else if (selectedStudentIds.length > 0) {
          // Individual student targeting
          targetingData = {
            audience_group: 'students',
            target_scope: selectedStudentIds.length === 1 ? 'single' : 'multi',
            student_id: selectedStudentIds.length === 1 ? selectedStudentIds[0] : null,
            student_ids: selectedStudentIds.length > 1 ? selectedStudentIds : null,
            class_id: null,
            section_id: null,
          };
        } else {
          showToast('Please select at least one student or class', 'error');
          return;
        }
      } else if (noticeAudience === 'all_staff') {
        targetingData = {
          audience_group: 'staff',
          target_scope: 'all',
          staff_id: null,
          staff_ids: null,
          staff_role: null,
        };
      } else if (noticeAudience === 'staff_selected') {
        if (selectedStaffIds.length === 0) {
          showToast('Please select at least one staff member', 'error');
          return;
        }
        targetingData = {
          audience_group: 'staff',
          target_scope: selectedStaffIds.length === 1 ? 'single' : 'multi',
          staff_id: selectedStaffIds.length === 1 ? selectedStaffIds[0] : null,
          staff_ids: selectedStaffIds.length > 1 ? selectedStaffIds : null,
          staff_role: null,
        };
      } else if (noticeAudience === 'all_parents') {
        targetingData = {
          audience_group: 'parents',
          target_scope: 'all',
          family_id: null,
          family_ids: null,
        };
      } else if (noticeAudience === 'parents_selected') {
        if (selectedFamilyIds.length === 0) {
          showToast('Please select at least one family', 'error');
          return;
        }
        targetingData = {
          audience_group: 'parents',
          target_scope: selectedFamilyIds.length === 1 ? 'single' : 'multi',
          family_id: selectedFamilyIds.length === 1 ? selectedFamilyIds[0] : null,
          family_ids: selectedFamilyIds.length > 1 ? selectedFamilyIds : null,
        };
      } else if (noticeAudience === 'all_users') {
        targetingData = {
          audience_group: 'all_users',
          target_scope: 'all',
          student_id: null,
          student_ids: null,
          staff_id: null,
          staff_ids: null,
          family_id: null,
          family_ids: null,
          class_id: null,
          section_id: null,
          staff_role: null,
        };
      }

      const noticeData = {
        ...editingNotice,
        ...targetingData,
        visible_to: selectedNoticeRoles, // Keep for backward compatibility
        school_id: user.school_id,
        updated_at: new Date().toISOString()
      };

      if (editingNotice.id) {
        // Update existing notice
        const { error } = await supabase
          .from('notices')
          .update(noticeData)
          .eq('id', editingNotice.id)
          .eq('school_id', user.school_id);

        if (error) throw error;
        showToast('Notice updated successfully', 'success');
      } else {
        // Create new notice
        const { data, error } = await supabase
          .from('notices')
          .insert([{
            ...noticeData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        showToast('Notice created successfully', 'success');
      }

      setNoticeDialogOpen(false);
      setEditingNotice(null);
      setSelectedNoticeRoles([]);
      setNoticeAudience('all_students');
      setSelectedStudentIds([]);
      setSelectedStaffIds([]);
      setSelectedFamilyIds([]);
      setSelectedClassId('');
      setSelectedSectionId('');
      loadNotices();
    } catch (error: any) {
      showToast('Failed to save notice: ' + error.message, 'error');
    } finally {
      setNoticesSaving(false);
    }
  };

  const handleDeleteNotice = async (noticeId: number) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', noticeId)
        .eq('school_id', user?.school_id);

      if (error) throw error;
      showToast('Notice deleted successfully', 'success');
      loadNotices();
    } catch (error: any) {
      showToast('Failed to delete notice: ' + error.message, 'error');
    }
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <WarningIcon />;
      case 'urgent': return <ErrorIcon />;
      case 'success': return <SuccessIcon />;
      default: return <InfoIcon />;
    }
  };

  const getNoticeColor = (type: string) => {
    switch (type) {
      case 'warning': return '#f59e0b';
      case 'urgent': return '#ef4444';
      case 'success': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const loadSeenByEntries = async (noticeId: number) => {
    setSeenByLoading(true);
    try {
      const { data, error } = await supabase
        .from('notice_views')
        .select('*')
        .eq('notice_id', noticeId)
        .order('seen_at', { ascending: false });

      if (error) throw error;
      setSeenByEntries(data || []);
    } catch (error) {
      console.error('Error loading seen by entries:', error);
      setSeenByEntries([]);
    } finally {
      setSeenByLoading(false);
    }
  };

  // Helper functions for seen by display (similar to announcement page)
  const getSeenByPrimaryLabel = (entry: any) => {
    if (entry.student_id) return String(entry.student_id);
    if (entry.staff_id) return String(entry.staff_id);
    // Check if it's a parent (viewer_identifier starts with "parent_")
    if (entry.viewer_identifier && entry.viewer_identifier.startsWith('parent_')) {
      const familyId = entry.viewer_identifier.replace('parent_', '');
      return `Family ${familyId}`;
    }
    return entry.viewer_identifier || entry.viewer_name || '—';
  };

  const getSeenByNameValue = (entry: any) => {
    if (entry.student_id) {
      const student = students.find(s => s.id === entry.student_id);
      return student?.name || entry.viewer_name || entry.viewer_identifier || '';
    }
    if (entry.staff_id) {
      const staff = staffMembers.find(s => s.id === entry.staff_id);
      return staff?.name || entry.viewer_name || entry.viewer_identifier || '';
    }
    // Check if it's a parent (viewer_identifier starts with "parent_")
    if (entry.viewer_identifier && entry.viewer_identifier.startsWith('parent_')) {
      const familyId = parseInt(entry.viewer_identifier.replace('parent_', ''), 10);
      if (familyId && !isNaN(familyId)) {
        const family = families.find(f => f.id === familyId);
        return family?.name || entry.viewer_name || entry.viewer_identifier || '';
      }
    }
    return entry.viewer_name || entry.viewer_identifier || '';
  };

  const getSeenByDetailLine = (entry: any) => {
    if (entry.student_id) {
      const student = students.find(s => s.id === entry.student_id);
      const parts: string[] = [];
      if (student?.father_name) parts.push(student.father_name);
      const className = student?.class_id 
        ? classes.find(c => c.id === student.class_id)?.name 
        : null;
      const sectionName = student?.section_id 
        ? sections.find(s => s.id === student.section_id)?.name 
        : null;
      if (className) parts.push(sectionName ? `${className} (${sectionName})` : className);
      return parts.join(' · ');
    }
    if (entry.staff_id) {
      const staff = staffMembers.find(s => s.id === entry.staff_id);
      const parts: string[] = [];
      if (staff?.role || entry.viewer_role) parts.push(staff?.role || entry.viewer_role);
      return parts.join(' · ');
    }
    // Check if it's a parent (viewer_identifier starts with "parent_")
    if (entry.viewer_identifier && entry.viewer_identifier.startsWith('parent_')) {
      const familyId = parseInt(entry.viewer_identifier.replace('parent_', ''), 10);
      if (familyId && !isNaN(familyId)) {
        const family = families.find(f => f.id === familyId);
        const parts: string[] = [];
        if (family?.contact_person) parts.push(family.contact_person);
        if (family?.contact_number) parts.push(family.contact_number);
        return parts.join(' · ') || 'Parent';
      }
    }
    return entry.viewer_name || entry.viewer_identifier || '';
  };

  const filteredSeenByEntries = seenByEntries.filter(entry => {
    const needle = seenBySearchTerm.trim().toLowerCase();
    if (!needle) return true;
    const name = getSeenByNameValue(entry).toLowerCase();
    const role = (entry.viewer_role || entry.viewer_type || '').toLowerCase();
    const identifier = (entry.viewer_identifier || '').toLowerCase();
    const detail = getSeenByDetailLine(entry).toLowerCase();
    const primary = getSeenByPrimaryLabel(entry).toLowerCase();
    return name.includes(needle) || role.includes(needle) || identifier.includes(needle) || detail.includes(needle) || primary.includes(needle);
  });

  const getNoticeTargetingItems = (notice: Notice): Array<{ label: string; userId?: number; staffId?: number; familyId?: number; studentId?: number; rollNumber?: string | null }> => {
    // If using individual targeting (new method)
    if (notice.audience_group && notice.target_scope) {
      if (notice.audience_group === 'all_users') {
        return [{ label: 'All Users' }];
      }
      
      if (notice.audience_group === 'students') {
        if (notice.target_scope === 'all') {
          return [{ label: 'All Students' }];
        } else if (notice.target_scope === 'class') {
          const classText = notice.class_id 
            ? classes.find(c => c.id === notice.class_id)?.name || `Class ${notice.class_id}`
            : '';
          const sectionText = notice.section_id
            ? sections.find(s => s.id === notice.section_id)?.name || `Section ${notice.section_id}`
            : '';
          if (sectionText) {
            return [{ label: `${classText} - ${sectionText}` }];
          }
          return [{ label: classText || 'Selected Class' }];
        } else if (notice.target_scope === 'single' || notice.target_scope === 'multi') {
          // Get selected student IDs
          const studentIds = notice.student_ids || (notice.student_id ? [notice.student_id] : []);
          if (studentIds.length > 0) {
            // Get student names with class/section info and user IDs
            const studentItems = studentIds
              .map(id => {
                const student = students.find(s => s.id === id);
                if (!student) return null;
                
                const className = student.class_id 
                  ? classes.find(c => c.id === student.class_id)?.name || ''
                  : '';
                const sectionName = student.section_id
                  ? sections.find(s => s.id === student.section_id)?.name || ''
                  : '';
                
                let classSectionInfo = '';
                if (className && sectionName) {
                  classSectionInfo = ` (${className} - ${sectionName})`;
                } else if (className) {
                  classSectionInfo = ` (${className})`;
                }
                
                // Use roll_number for display and targeting
                const rollNumber = student.roll_number || `ID: ${student.id}`;
                const displayName = `${student.name} (${rollNumber})${classSectionInfo}`;
                
                // For students, we need to check if there's a user linked to this student
                // Since students don't have a direct user_id link, we'll need to check dismissed_notices differently
                // For now, we'll use null and handle student dismissals separately
                return {
                  label: displayName,
                  userId: undefined, // Students don't have direct user_id link
                  studentId: student.id, // Store student.id for reference
                  rollNumber: student.roll_number // Store roll_number for targeting
                };
              })
              .filter(item => item !== null) as Array<{ label: string; userId?: number; studentId?: number; rollNumber?: string | null }>;
            
            if (studentItems.length > 0) {
              return studentItems;
            }
          }
          return [{ label: 'Selected Students' }];
        }
      }
      
      if (notice.audience_group === 'staff') {
        if (notice.target_scope === 'all') {
          return [{ label: 'All Staff' }];
        } else if (notice.target_scope === 'role') {
          return notice.staff_role ? [{ label: `Staff - ${notice.staff_role}` }] : [{ label: 'Selected Staff Role' }];
        } else if (notice.target_scope === 'single' || notice.target_scope === 'multi') {
          // Get selected staff IDs
          const staffIds = notice.staff_ids || (notice.staff_id ? [notice.staff_id] : []);
          if (staffIds.length > 0) {
            // Get staff names with role info and user IDs
            const staffItems = staffIds
              .map(id => {
                const staff = staffMembers.find(s => s.id === id);
                if (!staff) return null;
                
                const roleInfo = staff.role ? ` (${staff.role})` : '';
                // Get user_id from staffToUserIdMap
                // If not found in map, try to fetch it (fallback for cases where map isn't populated yet)
                let userId = staffToUserIdMap.get(id);
                if (!userId && staffToUserIdMap.size === 0) {
                  // Map might not be populated yet, will be handled by dismissed check
                  userId = undefined;
                }
                return {
                  label: `${staff.name}${roleInfo}`,
                  userId: userId,
                  staffId: id // Store staff_id for reverse lookup if needed
                };
              })
              .filter(item => item !== null) as Array<{ label: string; userId?: number }>;
            
            if (staffItems.length > 0) {
              return staffItems;
            }
          }
          return [{ label: 'Selected Staff' }];
        }
      }
      
      if (notice.audience_group === 'parents') {
        if (notice.target_scope === 'all') {
          return [{ label: 'All Parents' }];
        } else if (notice.target_scope === 'single' || notice.target_scope === 'multi') {
          // Get selected family IDs
          const familyIds = notice.family_ids || (notice.family_id ? [notice.family_id] : []);
          if (familyIds.length > 0) {
            // Get family names
            const familyItems = familyIds
              .map(id => {
                const family = families.find(f => f.id === id);
                if (!family) return null;
                // Get user_id from familyToUserIdMap
                const userId = familyToUserIdMap.get(id);
                return {
                  label: family.name,
                  userId: userId,
                  familyId: id // Store family_id for reverse lookup if needed
                };
              })
              .filter(item => item !== null) as Array<{ label: string; userId?: number }>;
            
            if (familyItems.length > 0) {
              return familyItems;
            }
          }
          return [{ label: 'Selected Parents' }];
        }
      }
    }
    
    // Legacy: use visible_to roles
    if (notice.visible_to && notice.visible_to.length > 0) {
      return notice.visible_to.map(role => ({ label: role }));
    }
    
    return [{ label: 'All Users' }];
  };

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <Container $theme={theme}>
          <ContentCard $theme={theme}>
            <Typography>Please log in to view events.</Typography>
          </ContentCard>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container $theme={theme}>
        <Header $theme={theme}>
          <HeaderTitle $theme={theme}>
            {activeTab === 0 ? <EventIcon /> : <NoticeIcon />}
            {activeTab === 0 ? 'Events Management' : 'Notices Management'}
          </HeaderTitle>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={activeTab === 0 ? handleAddEvent : handleAddNotice}
          >
            {activeTab === 0 ? 'Create Event' : 'Create Notice'}
          </Button>
        </Header>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: theme.TEXT_SECONDARY,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: theme.ACCENT,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.ACCENT,
              },
            }}
          >
            <Tab icon={<EventIcon />} iconPosition="start" label="Events" />
            <Tab icon={<NoticeIcon />} iconPosition="start" label="Notices" />
          </Tabs>
        </Box>

        {/* Events Tab Content */}
        {activeTab === 0 && (
          <>
            {eventsLoading ? (
              <Loader />
            ) : events.length === 0 ? (
              <ContentCard $theme={theme}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
                  <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No events created yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create your first event to get started
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddEvent}>
                    Create Event
                  </Button>
                </Box>
              </ContentCard>
            ) : (
              <Grid container spacing={2}>
                {events.map((event) => (
                  <Grid item xs={12} sm={6} md={4} key={event.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Typography variant="h6" component="h3" gutterBottom>
                            {event.title}
                          </Typography>
                          <Box display="flex" gap={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditEvent(event)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteEvent(event.id!)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {event.description}
                        </Typography>
                        <Box mt={2}>
                          <Typography variant="caption" display="block" color="text.secondary">
                            <CalendarIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                            {new Date(event.start_date).toLocaleDateString()}
                            {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
                          </Typography>
                          {!event.is_all_day && event.start_time && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {event.start_time} {event.end_time && `- ${event.end_time}`}
                            </Typography>
                          )}
                          {event.location && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              📍 {event.location}
                            </Typography>
                          )}
                        </Box>
                        <Box mt={2}>
                          <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                            Visible to:
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {event.visible_to?.map((role) => (
                              <Chip
                                key={role}
                                label={role}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Chip
                          label={event.event_type}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Notices Tab Content */}
        {activeTab === 1 && (
          <>
            {noticesLoading ? (
              <Loader />
            ) : notices.length === 0 ? (
              <ContentCard $theme={theme}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
                  <NoticeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No notices created yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create your first notice to get started
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNotice}>
                    Create Notice
                  </Button>
                </Box>
              </ContentCard>
            ) : (
              <Grid container spacing={2}>
                {notices.map((notice) => (
                  <Grid item xs={12} sm={6} md={4} key={notice.id}>
                    <Card 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        borderLeft: `4px solid ${getNoticeColor(notice.notice_type)}`,
                        opacity: notice.is_active ? 1 : 0.6
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Box display="flex" alignItems="center" gap={1} flex={1}>
                            <Box sx={{ color: getNoticeColor(notice.notice_type) }}>
                              {getNoticeIcon(notice.notice_type)}
                            </Box>
                            <Typography variant="h6" component="h3" gutterBottom>
                              {notice.title}
                            </Typography>
                          </Box>
                          <Box display="flex" gap={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditNotice(notice)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteNotice(notice.id!)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {notice.description}
                        </Typography>
                        <Box mt={2}>
                          <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                            Visible to:
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {getNoticeTargetingItems(notice).map((item, index) => {
                              const viewEntries = notice.id ? noticeViewsData.get(notice.id) || [] : [];
                              
                              // Determine viewer_identifier for this item
                              let viewerIdentifier: string | null = null;
                              if (item.studentId) {
                                viewerIdentifier = `student_${item.studentId}`;
                              } else if (item.staffId) {
                                viewerIdentifier = `staff_${item.staffId}`;
                              } else if (item.familyId) {
                                viewerIdentifier = `parent_${item.familyId}`;
                              } else if (item.userId) {
                                // For users without staff_id, use user_id
                                viewerIdentifier = `user_${item.userId}`;
                              }
                              
                              // Check if this item is seen/dismissed by matching viewer_identifier
                              // Only check for individual targets (not "All" groups)
                              const isAllGroup = !viewerIdentifier && (item.label.includes('All ') || item.label === 'All Users');
                              
                              // Find matching view entry - must match viewer_identifier exactly
                              let viewEntry = null;
                              if (viewerIdentifier) {
                                // Find exact viewer_identifier match
                                viewEntry = viewEntries.find(e => {
                                  // Must match viewer_identifier exactly
                                  if (e.viewer_identifier !== viewerIdentifier) return false;
                                  
                                  // Additional validation: if staff_id/student_id is present in both, they must match
                                  // This prevents false matches if viewer_identifier format is ambiguous
                                  if (item.staffId !== undefined && e.staff_id !== undefined && e.staff_id !== item.staffId) {
                                    return false;
                                  }
                                  if (item.studentId !== undefined && e.student_id !== undefined && e.student_id !== item.studentId) {
                                    return false;
                                  }
                                  
                                  return true;
                                });
                              }
                              
                              // Only consider seen/dismissed if we have a viewerIdentifier (individual target) AND found a matching entry
                              const isSeen = viewerIdentifier ? (viewEntry !== null) : false;
                              const isDismissed = viewerIdentifier ? (viewEntry?.dismissed === true) : false;
                              
                              // Determine background color: yellow if dismissed, green if seen (not dismissed), no color if not seen or is "All" group
                              let backgroundColor: string | undefined = undefined;
                              let borderColor: string | undefined = undefined;
                              // Only apply colors for individual targets that have been seen/dismissed
                              if (viewerIdentifier) {
                                if (isDismissed) {
                                  backgroundColor = 'rgba(234, 179, 8, 0.2)'; // Yellow for dismissed
                                  borderColor = 'rgba(234, 179, 8, 0.5)';
                                } else if (isSeen && !isDismissed) {
                                  backgroundColor = 'rgba(16, 185, 129, 0.2)'; // Green for seen (not dismissed)
                                  borderColor = 'rgba(16, 185, 129, 0.5)';
                                }
                                // No color if not seen
                              }
                              // No color for "All" groups
                              
                              const chip = (
                                <Chip
                                  key={index}
                                  label={item.label}
                                  size="small"
                                  variant="outlined"
                                  onClick={isAllGroup ? () => {
                                    setSelectedNoticeForSeenBy(notice);
                                    setSeenByModalOpen(true);
                                    loadSeenByEntries(notice.id!);
                                  } : undefined}
                                  sx={{
                                    backgroundColor: backgroundColor,
                                    borderColor: borderColor,
                                    cursor: isAllGroup ? 'pointer' : 'default',
                                    '&:hover': isAllGroup ? {
                                      backgroundColor: muiTheme.palette.mode === 'dark' 
                                        ? 'rgba(255, 255, 255, 0.08)' 
                                        : 'rgba(0, 0, 0, 0.04)'
                                    } : undefined
                                  }}
                                />
                              );

                              if (isSeen && viewEntry) {
                                let tooltipContent: React.ReactNode;
                                if (isDismissed && viewEntry.dismissed_at) {
                                  // Show both seen on and dismissed on on separate lines
                                  tooltipContent = (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div>Seen on {new Date(viewEntry.seen_at).toLocaleString()}</div>
                                      <div>Dismissed on {new Date(viewEntry.dismissed_at).toLocaleString()}</div>
                                    </div>
                                  );
                                } else if (isDismissed) {
                                  // Fallback if dismissed_at is not set yet
                                  tooltipContent = (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div>Seen on {new Date(viewEntry.seen_at).toLocaleString()}</div>
                                      <div>Dismissed on {new Date(viewEntry.seen_at).toLocaleString()}</div>
                                    </div>
                                  );
                                } else {
                                  tooltipContent = `Seen on ${new Date(viewEntry.seen_at).toLocaleString()}`;
                                }
                                return (
                                  <Tooltip
                                    key={index}
                                    title={tooltipContent}
                                    arrow
                                  >
                                    {chip}
                                  </Tooltip>
                                );
                              }

                              return chip;
                            })}
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Chip
                          label={notice.notice_type}
                          size="small"
                          sx={{
                            backgroundColor: `${getNoticeColor(notice.notice_type)}15`,
                            color: getNoticeColor(notice.notice_type),
                            border: `1px solid ${getNoticeColor(notice.notice_type)}40`
                          }}
                        />
                        <Chip
                          label={notice.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={notice.is_active ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Event Dialog */}
        <StyledDialog
          open={eventDialogOpen}
          onClose={() => {
            setEventDialogOpen(false);
            setEditingEvent(null);
            setSelectedEventRoles([]);
          }}
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
              {editingEvent?.id ? 'Edit Event' : 'Create Event'}
            </DialogTitleStyled>
            <IconButton onClick={() => {
              setEventDialogOpen(false);
              setEditingEvent(null);
              setSelectedEventRoles([]);
            }} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogHeader>

          <StyledDialogContent>
            {editingEvent && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Event Title"
                    value={editingEvent.title || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    fullWidth
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    value={editingEvent.description || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Event Type</InputLabel>
                    <Select
                      value={editingEvent.event_type || 'academic'}
                      label="Event Type"
                      onChange={(e) => setEditingEvent({ ...editingEvent, event_type: e.target.value as any })}
                      MenuProps={selectMenuProps}
                    >
                      <MenuItem value="academic">Academic</MenuItem>
                      <MenuItem value="sports">Sports</MenuItem>
                      <MenuItem value="cultural">Cultural</MenuItem>
                      <MenuItem value="holiday">Holiday</MenuItem>
                      <MenuItem value="meeting">Meeting</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Visible To (Roles)</InputLabel>
                    <Select
                      multiple
                      value={selectedEventRoles}
                      label="Visible To (Roles)"
                      onChange={(e) => setSelectedEventRoles(e.target.value as string[])}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                      MenuProps={selectMenuProps}
                    >
                      {availableRoles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={editingEvent.start_date || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                    fullWidth
                    required
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="End Date"
                    type="date"
                    value={editingEvent.end_date || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
                    fullWidth
                    required
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingEvent.is_all_day || false}
                        onChange={(e) => setEditingEvent({ ...editingEvent, is_all_day: e.target.checked })}
                      />
                    }
                    label="All Day Event"
                  />
                </Grid>
                {!editingEvent.is_all_day && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={editingEvent.start_time || ''}
                        onChange={(e) => setEditingEvent({ ...editingEvent, start_time: e.target.value })}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="End Time"
                        type="time"
                        value={editingEvent.end_time || ''}
                        onChange={(e) => setEditingEvent({ ...editingEvent, end_time: e.target.value })}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <TextField
                    label="Location"
                    value={editingEvent.location || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            )}
          </StyledDialogContent>

          <FormActions>
            <Button 
              onClick={() => {
                setEventDialogOpen(false);
                setEditingEvent(null);
                setSelectedEventRoles([]);
              }}
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
              onClick={handleSaveEvent} 
              variant="contained" 
              size="small"
              disabled={eventsSaving}
              sx={{ 
                borderRadius: '6px',
                textTransform: 'none',
                px: 2
              }}
            >
              {eventsSaving ? 'Saving...' : (editingEvent?.id ? 'Update Event' : 'Create Event')}
            </Button>
          </FormActions>
        </StyledDialog>

        {/* Notice Dialog */}
        <StyledDialog
          open={noticeDialogOpen}
          onClose={() => {
            setNoticeDialogOpen(false);
            setEditingNotice(null);
            setSelectedNoticeRoles([]);
            setNoticeAudience('all_students');
            setSelectedStudentIds([]);
            setSelectedStaffIds([]);
            setSelectedFamilyIds([]);
            setSelectedClassId('');
            setSelectedSectionId('');
            setStudentSearchTerm('');
            setStaffSearchTerm('');
            setFamilySearchTerm('');
          }}
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
              {editingNotice?.id ? 'Edit Notice' : 'Create Notice'}
            </DialogTitleStyled>
            <IconButton onClick={() => {
              setNoticeDialogOpen(false);
              setEditingNotice(null);
              setSelectedNoticeRoles([]);
              setNoticeAudience('all_students');
              setSelectedStudentIds([]);
              setSelectedStaffIds([]);
              setSelectedFamilyIds([]);
              setSelectedClassId('');
              setSelectedSectionId('');
              setStudentSearchTerm('');
              setStaffSearchTerm('');
              setFamilySearchTerm('');
            }} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogHeader>

          <StyledDialogContent>
            {editingNotice && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Notice Title"
                    value={editingNotice.title || ''}
                    onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                    fullWidth
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    value={editingNotice.description || ''}
                    onChange={(e) => setEditingNotice({ ...editingNotice, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={4}
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Notice Type</InputLabel>
                    <Select
                      value={editingNotice.notice_type || 'info'}
                      label="Notice Type"
                      onChange={(e) => setEditingNotice({ ...editingNotice, notice_type: e.target.value as any })}
                      MenuProps={selectMenuProps}
                    >
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                      <MenuItem value="success">Success</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Target Audience</InputLabel>
                    <Select
                      value={noticeAudience}
                      label="Target Audience"
                      onChange={(e) => {
                        const newAudience = e.target.value as typeof noticeAudience;
                        setNoticeAudience(newAudience);
                        // Reset selections when changing audience
                        if (newAudience !== 'students_selected') {
                          setSelectedStudentIds([]);
                          setSelectedClassId('');
                          setSelectedSectionId('');
                        }
                        if (newAudience !== 'staff_selected') {
                          setSelectedStaffIds([]);
                        }
                        if (newAudience !== 'parents_selected') {
                          setSelectedFamilyIds([]);
                        }
                      }}
                      MenuProps={selectMenuProps}
                    >
                      <MenuItem value="all_students">All Students</MenuItem>
                      <MenuItem value="students_selected">Selected Students</MenuItem>
                      <MenuItem value="all_staff">All Staff</MenuItem>
                      <MenuItem value="staff_selected">Selected Staff</MenuItem>
                      <MenuItem value="all_parents">All Parents</MenuItem>
                      <MenuItem value="parents_selected">Selected Parents</MenuItem>
                      <MenuItem value="all_users">All Users</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Students Selection */}
                {noticeAudience === 'students_selected' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Class</InputLabel>
                        <Select
                          value={selectedClassId}
                          label="Class"
                          onChange={(e) => {
                            setSelectedClassId(e.target.value as number);
                            setSelectedSectionId('');
                            setSelectedStudentIds([]);
                          }}
                          MenuProps={selectMenuProps}
                        >
                          <MenuItem value="">All Classes</MenuItem>
                          {classes.map((cls) => (
                            <MenuItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    {selectedClassId && (
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Section</InputLabel>
                          <Select
                            value={selectedSectionId}
                            label="Section"
                            onChange={(e) => {
                              setSelectedSectionId(e.target.value as number);
                              setSelectedStudentIds([]);
                            }}
                            MenuProps={selectMenuProps}
                          >
                            <MenuItem value="">All Sections</MenuItem>
                            {sections
                              .filter(sec => sec.class_id === selectedClassId)
                              .map((sec) => (
                                <MenuItem key={sec.id} value={sec.id}>
                                  {sec.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                    {!selectedClassId && (
                      <>
                        <Grid item xs={12}>
                          <TextField
                            label="Search Students"
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="Search by name, ID, or father's name..."
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Box
                            sx={{
                              border: `1px solid ${muiTheme.palette.divider}`,
                              borderRadius: 1,
                              p: 1,
                              maxHeight: 200,
                              overflowY: 'auto',
                              bgcolor: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'
                            }}
                          >
                            {students
                              .filter(student => {
                                if (studentSearchTerm) {
                                  const term = studentSearchTerm.toLowerCase();
                                  return student.name.toLowerCase().includes(term) ||
                                    String(student.id).includes(term) ||
                                    (student.father_name && student.father_name.toLowerCase().includes(term));
                                }
                                return true;
                              })
                              .map((student) => {
                                const isSelected = selectedStudentIds.includes(student.id);
                                const className = classes.find(c => c.id === student.class_id)?.name || '';
                                const sectionName = student.section_id ? sections.find(s => s.id === student.section_id)?.name : '';
                                return (
                                  <Box
                                    key={student.id}
                                    onClick={() => {
                                      setSelectedStudentIds(prev =>
                                        prev.includes(student.id)
                                          ? prev.filter(id => id !== student.id)
                                          : [...prev, student.id]
                                      );
                                    }}
                                    sx={{
                                      p: 1,
                                      mb: 0.5,
                                      cursor: 'pointer',
                                      borderRadius: 1,
                                      bgcolor: isSelected
                                        ? (muiTheme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)')
                                        : 'transparent',
                                      border: `1px solid ${isSelected ? muiTheme.palette.primary.main : 'transparent'}`,
                                      '&:hover': {
                                        bgcolor: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                                      }
                                    }}
                                  >
                                    <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                                      {student.name} {student.father_name && `(${student.father_name})`}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      ID: {student.id} {className && `· ${className}`} {sectionName && `(${sectionName})`}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            {students.filter(student => {
                              if (studentSearchTerm) {
                                const term = studentSearchTerm.toLowerCase();
                                return student.name.toLowerCase().includes(term) ||
                                  String(student.id).includes(term) ||
                                  (student.father_name && student.father_name.toLowerCase().includes(term));
                              }
                              return true;
                            }).length === 0 && (
                              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                No students found
                              </Typography>
                            )}
                          </Box>
                          {selectedStudentIds.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selectedStudentIds.map(id => {
                                const student = students.find(s => s.id === id);
                                return student ? (
                                  <Chip
                                    key={id}
                                    label={`${student.name} (ID: ${id})`}
                                    size="small"
                                    onDelete={() => setSelectedStudentIds(prev => prev.filter(sid => sid !== id))}
                                  />
                                ) : null;
                              })}
                            </Box>
                          )}
                        </Grid>
                      </>
                    )}
                  </>
                )}

                {/* Staff Selection */}
                {noticeAudience === 'staff_selected' && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        label="Search Staff"
                        value={staffSearchTerm}
                        onChange={(e) => setStaffSearchTerm(e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="Search by name, ID, or role..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          border: `1px solid ${muiTheme.palette.divider}`,
                          borderRadius: 1,
                          p: 1,
                          maxHeight: 200,
                          overflowY: 'auto',
                          bgcolor: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'
                        }}
                      >
                        {staffMembers
                          .filter(staff => {
                            if (staffSearchTerm) {
                              const term = staffSearchTerm.toLowerCase();
                              return staff.name.toLowerCase().includes(term) ||
                                String(staff.id).includes(term) ||
                                (staff.role && staff.role.toLowerCase().includes(term));
                            }
                            return true;
                          })
                          .map((staff) => {
                            const isSelected = selectedStaffIds.includes(staff.id);
                            return (
                              <Box
                                key={staff.id}
                                onClick={() => {
                                  setSelectedStaffIds(prev =>
                                    prev.includes(staff.id)
                                      ? prev.filter(id => id !== staff.id)
                                      : [...prev, staff.id]
                                  );
                                }}
                                sx={{
                                  p: 1,
                                  mb: 0.5,
                                  cursor: 'pointer',
                                  borderRadius: 1,
                                  bgcolor: isSelected
                                    ? (muiTheme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)')
                                    : 'transparent',
                                  border: `1px solid ${isSelected ? muiTheme.palette.primary.main : 'transparent'}`,
                                  '&:hover': {
                                    bgcolor: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                                  }
                                }}
                              >
                                <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                                  {staff.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {staff.id} {staff.role && `· ${staff.role}`}
                                </Typography>
                              </Box>
                            );
                          })}
                        {staffMembers.filter(staff => {
                          if (staffSearchTerm) {
                            const term = staffSearchTerm.toLowerCase();
                            return staff.name.toLowerCase().includes(term) ||
                              String(staff.id).includes(term) ||
                              (staff.role && staff.role.toLowerCase().includes(term));
                          }
                          return true;
                        }).length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                            No staff found
                          </Typography>
                        )}
                      </Box>
                      {selectedStaffIds.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selectedStaffIds.map(id => {
                            const staff = staffMembers.find(s => s.id === id);
                            return staff ? (
                              <Chip
                                key={id}
                                label={`${staff.name} (ID: ${id})`}
                                size="small"
                                onDelete={() => setSelectedStaffIds(prev => prev.filter(sid => sid !== id))}
                              />
                            ) : null;
                          })}
                        </Box>
                      )}
                    </Grid>
                  </>
                )}

                {/* Families/Parents Selection */}
                {noticeAudience === 'parents_selected' && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        label="Search Families"
                        value={familySearchTerm}
                        onChange={(e) => setFamilySearchTerm(e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="Search by name, contact person, or phone..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          border: `1px solid ${muiTheme.palette.divider}`,
                          borderRadius: 1,
                          p: 1,
                          maxHeight: 200,
                          overflowY: 'auto',
                          bgcolor: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'
                        }}
                      >
                        {families
                          .filter(family => {
                            if (familySearchTerm) {
                              const term = familySearchTerm.toLowerCase();
                              return family.name.toLowerCase().includes(term) ||
                                String(family.id).includes(term) ||
                                (family.contact_person && family.contact_person.toLowerCase().includes(term)) ||
                                (family.contact_number && family.contact_number.includes(term));
                            }
                            return true;
                          })
                          .map((family) => {
                            const isSelected = selectedFamilyIds.includes(family.id);
                            return (
                              <Box
                                key={family.id}
                                onClick={() => {
                                  setSelectedFamilyIds(prev =>
                                    prev.includes(family.id)
                                      ? prev.filter(id => id !== family.id)
                                      : [...prev, family.id]
                                  );
                                }}
                                sx={{
                                  p: 1,
                                  mb: 0.5,
                                  cursor: 'pointer',
                                  borderRadius: 1,
                                  bgcolor: isSelected
                                    ? (muiTheme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)')
                                    : 'transparent',
                                  border: `1px solid ${isSelected ? muiTheme.palette.primary.main : 'transparent'}`,
                                  '&:hover': {
                                    bgcolor: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                                  }
                                }}
                              >
                                <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                                  {family.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {family.id} {family.contact_person && `· ${family.contact_person}`} {family.contact_number && `· ${family.contact_number}`}
                                </Typography>
                              </Box>
                            );
                          })}
                        {families.filter(family => {
                          if (familySearchTerm) {
                            const term = familySearchTerm.toLowerCase();
                            return family.name.toLowerCase().includes(term) ||
                              String(family.id).includes(term) ||
                              (family.contact_person && family.contact_person.toLowerCase().includes(term)) ||
                              (family.contact_number && family.contact_number.includes(term));
                          }
                          return true;
                        }).length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                            No families found
                          </Typography>
                        )}
                      </Box>
                      {selectedFamilyIds.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selectedFamilyIds.map(id => {
                            const family = families.find(f => f.id === id);
                            return family ? (
                              <Chip
                                key={id}
                                label={`${family.name} (ID: ${id})`}
                                size="small"
                                onDelete={() => setSelectedFamilyIds(prev => prev.filter(fid => fid !== id))}
                              />
                            ) : null;
                          })}
                        </Box>
                      )}
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Expiry Date (Optional)"
                    type="date"
                    value={editingNotice.expiry_date || ''}
                    onChange={(e) => setEditingNotice({ ...editingNotice, expiry_date: e.target.value || null })}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty for no expiry"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingNotice.is_active !== false}
                        onChange={(e) => setEditingNotice({ ...editingNotice, is_active: e.target.checked })}
                      />
                    }
                    label="Active Notice"
                  />
                </Grid>
              </Grid>
            )}
          </StyledDialogContent>

          <FormActions>
            <Button 
              onClick={() => {
                setNoticeDialogOpen(false);
                setEditingNotice(null);
                setSelectedNoticeRoles([]);
                setNoticeAudience('all_students');
                setSelectedStudentIds([]);
                setSelectedStaffIds([]);
                setSelectedFamilyIds([]);
                setSelectedClassId('');
                setSelectedSectionId('');
                setStudentSearchTerm('');
                setStaffSearchTerm('');
                setFamilySearchTerm('');
              }}
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
              onClick={handleSaveNotice} 
              variant="contained" 
              size="small"
              disabled={noticesSaving}
              sx={{ 
                borderRadius: '6px',
                textTransform: 'none',
                px: 2
              }}
            >
              {noticesSaving ? 'Saving...' : (editingNotice?.id ? 'Update Notice' : 'Create Notice')}
            </Button>
          </FormActions>
        </StyledDialog>

        {/* Seen By Dialog */}
        <Dialog
          open={seenByModalOpen}
          onClose={() => {
            setSeenByModalOpen(false);
            setSelectedNoticeForSeenBy(null);
            setSeenByEntries([]);
            setSeenBySearchTerm('');
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Seen by</Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setSeenByModalOpen(false);
                  setSelectedNoticeForSeenBy(null);
                  setSeenByEntries([]);
                  setSeenBySearchTerm('');
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            {selectedNoticeForSeenBy && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {selectedNoticeForSeenBy.title}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              placeholder="Search viewers..."
              value={seenBySearchTerm}
              onChange={(e) => setSeenBySearchTerm(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            {seenByLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={24} />
              </Box>
            ) : filteredSeenByEntries.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                {seenByEntries.length === 0 ? 'No one has seen this notice yet.' : 'No viewers match your search.'}
              </Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={1}>
                {filteredSeenByEntries.map((entry, index) => (
                  <Box
                    key={`${entry.notice_id}-${entry.viewer_identifier}-${index}`}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: `1px solid ${muiTheme.palette.divider}`,
                      bgcolor: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.04)' 
                        : 'rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {getSeenByPrimaryLabel(entry)}
                      </Typography>
                      {getSeenByNameValue(entry) && (
                        <>
                          <Typography variant="caption" color="text.secondary">-</Typography>
                          <Typography variant="body2">
                            {getSeenByNameValue(entry)}
                          </Typography>
                        </>
                      )}
                      {getSeenByDetailLine(entry) && (
                        <>
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getSeenByDetailLine(entry)}
                          </Typography>
                        </>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(entry.seen_at).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setSeenByModalOpen(false);
              setSelectedNoticeForSeenBy(null);
              setSeenByEntries([]);
              setSeenBySearchTerm('');
            }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default Events;

