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
} from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';

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

const Events: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const { showToast } = useToast();
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSaving, setEventsSaving] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [selectedEventRoles, setSelectedEventRoles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  
  // Convert theme mode string to theme object
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (user?.school_id) {
      loadEvents();
      loadRoles();
    }
  }, [user]);

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
            <EventIcon />
            Events Management
          </HeaderTitle>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEvent}
          >
            Create Event
          </Button>
        </Header>

        {eventsLoading ? (
          <ContentCard $theme={theme}>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          </ContentCard>
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
      </Container>
    </ThemeProvider>
  );
};

export default Events;

