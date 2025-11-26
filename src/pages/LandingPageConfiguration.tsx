import React, { useState, useEffect, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { supabase } from '../supabaseClient';
import {
  Dashboard as DashboardIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  DragIndicator as DragIndicatorIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  RestartAlt as ResetIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
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
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  TEACHER_MENU_CARDS,
  TEACHER_PROFILE_TABS,
  TEACHER_PROFILE_SUMMARY_CARDS,
  STUDENT_MENU_CARDS,
  STUDENT_QUICK_ACTIONS,
  STUDENT_PROFILE_TABS,
  STUDENT_PROFILE_SUMMARY_CARDS,
  PARENT_MENU_CARDS,
  PARENT_FEE_SECTIONS,
  PARENT_QUICK_ACTIONS,
  TEACHER_QUICK_ACTIONS,
  DASHBOARD_CARDS,
  GUEST_SIDEBAR_MENUS,
  STUDENT_DASHBOARD_CARDS_GUEST,
  FEE_DASHBOARD_CARDS_GUEST,
  ATTENDANCE_DASHBOARD_CARDS_GUEST,
  EMPLOYEES_DASHBOARD_CARDS_GUEST,
  FINE_DASHBOARD_CARDS_GUEST,
  EXAMINATION_DASHBOARD_CARDS_GUEST,
  TEST_DASHBOARD_CARDS_GUEST,
  getDefaultSettings,
  mergeWithDefaults,
  MenuItemConfig
} from '../config/renderSettingsConfig';

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


// Render Settings styled components (matching RenderSettings.tsx)
const SettingsCard = styled.div<{ $theme: any }>`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'};
  border: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'};
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
`;

const SectionTitleContainer = styled.div<{ $theme: any }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ $theme }) => $theme?.TEXT_PRIMARY || '#1f2937'};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.875rem;
  margin-bottom: 1rem;
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const SettingItem = styled.div<{ $theme: any }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem;
  border-radius: 8px;
  background: ${({ $theme }) => $theme?.BG || '#ffffff'};
  border: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ $theme }) => $theme?.ACCENT || '#3b82f6'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const SettingHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SettingLabelText = styled.div<{ $theme: any }>`
  font-size: 0.95rem;
  color: ${({ $theme }) => $theme?.TEXT_PRIMARY || '#1f2937'};
  font-weight: 500;
`;

const SettingDescriptionText = styled.div<{ $theme: any }>`
  font-size: 0.8rem;
  color: ${({ $theme }) => $theme?.TEXT_SECONDARY || '#6b7280'};
  margin-top: 0.25rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ROLES = ['Principal', 'Admin', 'Teacher', 'Student', 'Parent', 'Accountant', 'Guest'];
// Event roles exclude admin roles (Principal, Admin, Super Admin) - they see everything
const EVENT_ROLES = ['Teacher', 'Student', 'Parent', 'Accountant', 'Guest'];

interface RenderSettingsData {
  teacher: Record<string, boolean>;
  student: Record<string, boolean>;
  parent: Record<string, boolean>;
  guest: Record<string, boolean>;
}

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

const LandingPageConfiguration: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const { showToast } = useToast();
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSaving, setEventsSaving] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [selectedEventRoles, setSelectedEventRoles] = useState<string[]>([]);
  
  // Render Settings state
  const [renderSettings, setRenderSettings] = useState<RenderSettingsData>(getDefaultSettings());
  const [renderSettingsLoading, setRenderSettingsLoading] = useState(true);
  const [renderSettingsSaving, setRenderSettingsSaving] = useState(false);
  const [hasRenderSettingsChanges, setHasRenderSettingsChanges] = useState(false);
  const [mainTab, setMainTab] = useState(0); // 0 = Events, 1 = Render Settings
  const [renderSettingsTab, setRenderSettingsTab] = useState(0); // 0 = Teacher, 1 = Student, 2 = Parent, 3 = Guest
  
  // Convert theme mode string to theme object
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (user?.school_id && user?.role === 'Principal') {
      loadEvents();
      loadRenderSettings();
    }
  }, [user]);

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

  const loadRenderSettings = async () => {
    if (!user?.school_id) return;

    try {
      setRenderSettingsLoading(true);
      const { data, error } = await supabase
        .from('render_settings')
        .select('settings')
        .eq('school_id', user.school_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings) {
        const mergedSettings = mergeWithDefaults(data.settings);
        setRenderSettings(mergedSettings);
      } else {
        const defaultSettings = getDefaultSettings();
        const { data: newData, error: createError } = await supabase
          .from('render_settings')
          .insert({
            school_id: user.school_id,
            settings: defaultSettings,
          })
          .select('settings')
          .single();

        if (createError) throw createError;
        if (newData?.settings) {
          setRenderSettings(mergeWithDefaults(newData.settings));
        }
      }
    } catch (error: any) {
      showToast('Failed to load render settings: ' + error.message, 'error');
      setRenderSettings(getDefaultSettings());
    } finally {
      setRenderSettingsLoading(false);
    }
  };

  const handleRenderSettingChange = (category: 'teacher' | 'student' | 'parent' | 'guest', key: string) => {
    setRenderSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category]?.[key],
      },
    }));
    setHasRenderSettingsChanges(true);
  };

  const handleSaveRenderSettings = async () => {
    if (!user?.school_id) return;

    try {
      setRenderSettingsSaving(true);
      const { error } = await supabase
        .from('render_settings')
        .upsert({
          school_id: user.school_id,
          settings: renderSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'school_id'
        });

      if (error) throw error;

      showToast('Render settings saved successfully!', 'success');
      setHasRenderSettingsChanges(false);
    } catch (error: any) {
      showToast('Failed to save render settings: ' + error.message, 'error');
    } finally {
      setRenderSettingsSaving(false);
    }
  };

  const handleResetRenderSettings = () => {
    if (window.confirm('Are you sure you want to reset all render settings to default (all enabled)?')) {
      setRenderSettings(getDefaultSettings());
      setHasRenderSettingsChanges(true);
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

  if (!user || user.role !== 'Principal') {
    return (
      <ThemeProvider theme={theme}>
        <Container $theme={theme}>
          <ContentCard $theme={theme}>
            <Typography>Access denied. Only Principal can configure the landing page.</Typography>
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
            <DashboardIcon />
            Landing Page & Render Settings
          </HeaderTitle>
          <Box display="flex" gap={1} alignItems="center">
            {mainTab === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddEvent}
              >
                Create Event
              </Button>
            )}
            {mainTab === 1 && (
              <>
                <Tooltip title="Reset to defaults">
                  <span>
                    <IconButton onClick={handleResetRenderSettings} disabled={renderSettingsSaving}>
                      <ResetIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveRenderSettings}
                  disabled={renderSettingsSaving || !hasRenderSettingsChanges}
                >
                  {renderSettingsSaving ? 'Saving...' : 'Save Render Settings'}
                </Button>
              </>
            )}
          </Box>
        </Header>

        {/* Main Tabs: Landing Page Widgets vs Render Settings */}
        <ContentCard $theme={theme}>
          <Tabs 
            value={mainTab} 
            onChange={(e, v) => setMainTab(v)}
            sx={{ mb: 2 }}
          >
            <Tab 
              icon={<EventIcon />} 
              iconPosition="start"
              label="Events" 
            />
            <Tab 
              icon={<SettingsIcon />} 
              iconPosition="start"
              label="Render Settings" 
            />
          </Tabs>
        </ContentCard>

        {/* Events Tab Content */}
        {mainTab === 0 && (
          <>
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
          </>
        )}

        {/* Render Settings Tab Content */}
        {mainTab === 1 && (
          <>
            {hasRenderSettingsChanges && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You have unsaved render settings changes. Don't forget to save!
              </Alert>
            )}

            {/* Render Settings Tabs */}
            <ContentCard $theme={theme}>
              <Tabs 
                value={renderSettingsTab} 
                onChange={(e, v) => setRenderSettingsTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    minHeight: 48,
                  },
                }}
              >
                <Tab 
                  icon={<SchoolIcon />} 
                  iconPosition="start"
                  label="Teacher" 
                />
                <Tab 
                  icon={<PersonIcon />} 
                  iconPosition="start"
                  label="Student" 
                />
                <Tab 
                  icon={<PersonAddIcon />} 
                  iconPosition="start"
                  label="Parent" 
                />
                <Tab 
                  icon={<PersonAddIcon />} 
                  iconPosition="start"
                  label="Guest" 
                />
              </Tabs>
            </ContentCard>

            {renderSettingsLoading ? (
              <ContentCard $theme={theme}>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                  <CircularProgress />
                </Box>
              </ContentCard>
            ) : (
              <>
                {/* Teacher Tab Content */}
                {renderSettingsTab === 0 && (
                  <Box>
                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <SchoolIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Teacher Menu Cards (Landing Page)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which menu cards are visible to teachers on the Landing Page
                      </Typography>
                      <SettingsGrid>
                        {TEACHER_MENU_CARDS.map((card) => (
                          <SettingItem key={card.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {card.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.teacher[card.key] !== false}
                                    onChange={() => handleRenderSettingChange('teacher', card.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Teacher Profile Tabs
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which tabs are visible on the teacher profile page
                      </Typography>
                      <SettingsGrid>
                        {TEACHER_PROFILE_TABS.map((tab) => (
                          <SettingItem key={tab.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{tab.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {tab.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.teacher[tab.key] !== false}
                                    onChange={() => handleRenderSettingChange('teacher', tab.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Teacher Profile Summary Cards
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which summary cards are displayed at the top of the teacher profile page
                      </Typography>
                      <SettingsGrid>
                        {TEACHER_PROFILE_SUMMARY_CARDS.map((card) => (
                          <SettingItem key={card.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {card.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.teacher[card.key] !== false}
                                    onChange={() => handleRenderSettingChange('teacher', card.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <EventIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Teacher Quick Actions (Landing Page)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which quick action cards are visible to teachers on the Landing Page
                      </Typography>
                      <SettingsGrid>
                        {TEACHER_QUICK_ACTIONS.map((action) => (
                          <SettingItem key={action.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{action.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {action.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.teacher[action.key] !== false}
                                    onChange={() => handleRenderSettingChange('teacher', action.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>
                  </Box>
                )}

                {/* Student Tab Content */}
                {renderSettingsTab === 1 && (
                  <Box>
                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Student Menu Cards (Landing Page)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which menu cards are visible to students on the Landing Page
                      </Typography>
                      <SettingsGrid>
                        {STUDENT_MENU_CARDS.map((card) => (
                          <SettingItem key={card.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {card.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.student[card.key] !== false}
                                    onChange={() => handleRenderSettingChange('student', card.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <EventIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Student Quick Actions (Landing Page)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which quick action cards are visible to students on the Landing Page
                      </Typography>
                      <SettingsGrid>
                        {STUDENT_QUICK_ACTIONS.map((action) => (
                          <SettingItem key={action.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{action.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {action.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.student[action.key] !== false}
                                    onChange={() => handleRenderSettingChange('student', action.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Student Profile Tabs
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which tabs are visible to students (and teachers viewing student profiles)
                      </Typography>
                      <SettingsGrid>
                        {STUDENT_PROFILE_TABS.map((tab) => (
                          <SettingItem key={tab.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{tab.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {tab.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.student[tab.key] !== false}
                                    onChange={() => handleRenderSettingChange('student', tab.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Student Profile Summary Cards
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which summary cards are displayed at the top of the student profile page
                      </Typography>
                      <SettingsGrid>
                        {STUDENT_PROFILE_SUMMARY_CARDS.map((card) => (
                          <SettingItem key={card.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {card.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.student[card.key] !== false}
                                    onChange={() => handleRenderSettingChange('student', card.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>
                  </Box>
                )}

                {/* Parent Tab Content */}
                {renderSettingsTab === 2 && (
                  <Box>
                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Parent Menu Cards (Landing Page)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which menu cards are visible to parents on the Landing Page
                      </Typography>
                      <SettingsGrid>
                        {PARENT_MENU_CARDS.map((card) => (
                          <SettingItem key={card.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {card.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.parent[card.key] !== false}
                                    onChange={() => handleRenderSettingChange('parent', card.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <EventIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Parent Quick Actions (Landing Page)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which quick action cards are visible to parents on the Landing Page
                      </Typography>
                      <SettingsGrid>
                        {PARENT_QUICK_ACTIONS.map((action) => (
                          <SettingItem key={action.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{action.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {action.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.parent[action.key] !== false}
                                    onChange={() => handleRenderSettingChange('parent', action.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <AttachMoneyIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Fee Sections (Landing Page)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which fee-related sections are visible to parents on the Landing Page
                      </Typography>
                      <SettingsGrid>
                        {PARENT_FEE_SECTIONS.map((section) => (
                          <SettingItem key={section.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{section.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {section.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.parent[section.key] !== false}
                                    onChange={() => handleRenderSettingChange('parent', section.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>
                  </Box>
                )}

                {/* Guest Tab Content */}
                {renderSettingsTab === 3 && (
                  <Box>
                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonAddIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Sidebar Menus (Guest Users)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select which main sidebar menus are shown to guest users.
                      </Typography>
                      <SettingsGrid>
                        {GUEST_SIDEBAR_MENUS.map((menu) => (
                          <SettingItem key={menu.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{menu.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {menu.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.guest[menu.key] !== false}
                                    onChange={() => handleRenderSettingChange('guest', menu.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    <SettingsCard $theme={theme}>
                      <SectionTitleContainer $theme={theme}>
                        <PersonAddIcon />
                        <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                          Dashboard Cards (Guest Users)
                        </Typography>
                      </SectionTitleContainer>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Control which cards are visible to guest users on the Dashboard page. Guest users can only view data, not modify it.
                      </Typography>
                      <SettingsGrid>
                        {DASHBOARD_CARDS.map((card) => (
                          <SettingItem key={card.key} $theme={theme}>
                            <SettingHeader>
                              <Box sx={{ flex: 1 }}>
                                <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                <SettingDescriptionText $theme={theme}>
                                  {card.description}
                                </SettingDescriptionText>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={renderSettings.guest[card.key] !== false}
                                    onChange={() => handleRenderSettingChange('guest', card.key)}
                                    color="primary"
                                  />
                                }
                                label=""
                                sx={{ ml: 1 }}
                              />
                            </SettingHeader>
                          </SettingItem>
                        ))}
                      </SettingsGrid>
                    </SettingsCard>

                    {renderSettings.guest['menu_students'] !== false && (
                      <SettingsCard $theme={theme}>
                        <SectionTitleContainer $theme={theme}>
                          <PersonIcon />
                          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                            Student Dashboard Cards (Guest Users)
                          </Typography>
                        </SectionTitleContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Control which cards are visible to guest users on the Student Dashboard.
                        </Typography>
                        <SettingsGrid>
                          {STUDENT_DASHBOARD_CARDS_GUEST.map((card) => (
                            <SettingItem key={card.key} $theme={theme}>
                              <SettingHeader>
                                <Box sx={{ flex: 1 }}>
                                  <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                  <SettingDescriptionText $theme={theme}>
                                    {card.description}
                                  </SettingDescriptionText>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={renderSettings.guest[card.key] !== false}
                                      onChange={() => handleRenderSettingChange('guest', card.key)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                  sx={{ ml: 1 }}
                                />
                              </SettingHeader>
                            </SettingItem>
                          ))}
                        </SettingsGrid>
                      </SettingsCard>
                    )}

                    {renderSettings.guest['menu_fee_management'] !== false && (
                      <SettingsCard $theme={theme}>
                        <SectionTitleContainer $theme={theme}>
                          <PersonIcon />
                          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                            Fee Management Dashboard Cards (Guest Users)
                          </Typography>
                        </SectionTitleContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Control which cards are visible to guest users on the Fee Management Dashboard.
                        </Typography>
                        <SettingsGrid>
                          {FEE_DASHBOARD_CARDS_GUEST.map((card) => (
                            <SettingItem key={card.key} $theme={theme}>
                              <SettingHeader>
                                <Box sx={{ flex: 1 }}>
                                  <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                  <SettingDescriptionText $theme={theme}>
                                    {card.description}
                                  </SettingDescriptionText>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={renderSettings.guest[card.key] !== false}
                                      onChange={() => handleRenderSettingChange('guest', card.key)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                  sx={{ ml: 1 }}
                                />
                              </SettingHeader>
                            </SettingItem>
                          ))}
                        </SettingsGrid>
                      </SettingsCard>
                    )}

                    {renderSettings.guest['menu_attendance'] !== false && (
                      <SettingsCard $theme={theme}>
                        <SectionTitleContainer $theme={theme}>
                          <PersonIcon />
                          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                            Attendance Dashboard Cards (Guest Users)
                          </Typography>
                        </SectionTitleContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Control which cards are visible to guest users on the Attendance Dashboard.
                        </Typography>
                        <SettingsGrid>
                          {ATTENDANCE_DASHBOARD_CARDS_GUEST.map((card) => (
                            <SettingItem key={card.key} $theme={theme}>
                              <SettingHeader>
                                <Box sx={{ flex: 1 }}>
                                  <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                  <SettingDescriptionText $theme={theme}>
                                    {card.description}
                                  </SettingDescriptionText>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={renderSettings.guest[card.key] !== false}
                                      onChange={() => handleRenderSettingChange('guest', card.key)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                  sx={{ ml: 1 }}
                                />
                              </SettingHeader>
                            </SettingItem>
                          ))}
                        </SettingsGrid>
                      </SettingsCard>
                    )}

                    {renderSettings.guest['menu_employees'] !== false && (
                      <SettingsCard $theme={theme}>
                        <SectionTitleContainer $theme={theme}>
                          <PersonIcon />
                          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                            Employees Dashboard Cards (Guest Users)
                          </Typography>
                        </SectionTitleContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Control which cards are visible to guest users on the Employees Dashboard.
                        </Typography>
                        <SettingsGrid>
                          {EMPLOYEES_DASHBOARD_CARDS_GUEST.map((card) => (
                            <SettingItem key={card.key} $theme={theme}>
                              <SettingHeader>
                                <Box sx={{ flex: 1 }}>
                                  <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                  <SettingDescriptionText $theme={theme}>
                                    {card.description}
                                  </SettingDescriptionText>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={renderSettings.guest[card.key] !== false}
                                      onChange={() => handleRenderSettingChange('guest', card.key)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                  sx={{ ml: 1 }}
                                />
                              </SettingHeader>
                            </SettingItem>
                          ))}
                        </SettingsGrid>
                      </SettingsCard>
                    )}

                    {renderSettings.guest['menu_fines'] !== false && (
                      <SettingsCard $theme={theme}>
                        <SectionTitleContainer $theme={theme}>
                          <PersonIcon />
                          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                            Fine Management Dashboard Cards (Guest Users)
                          </Typography>
                        </SectionTitleContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Control which cards are visible to guest users on the Fine Management Dashboard.
                        </Typography>
                        <SettingsGrid>
                          {FINE_DASHBOARD_CARDS_GUEST.map((card) => (
                            <SettingItem key={card.key} $theme={theme}>
                              <SettingHeader>
                                <Box sx={{ flex: 1 }}>
                                  <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                  <SettingDescriptionText $theme={theme}>
                                    {card.description}
                                  </SettingDescriptionText>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={renderSettings.guest[card.key] !== false}
                                      onChange={() => handleRenderSettingChange('guest', card.key)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                  sx={{ ml: 1 }}
                                />
                              </SettingHeader>
                            </SettingItem>
                          ))}
                        </SettingsGrid>
                      </SettingsCard>
                    )}

                    {renderSettings.guest['menu_examination'] !== false && (
                      <SettingsCard $theme={theme}>
                        <SectionTitleContainer $theme={theme}>
                          <PersonIcon />
                          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                            Examination Dashboard Cards (Guest Users)
                          </Typography>
                        </SectionTitleContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Control which cards are visible to guest users on the Examination Dashboard.
                        </Typography>
                        <SettingsGrid>
                          {EXAMINATION_DASHBOARD_CARDS_GUEST.map((card) => (
                            <SettingItem key={card.key} $theme={theme}>
                              <SettingHeader>
                                <Box sx={{ flex: 1 }}>
                                  <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                  <SettingDescriptionText $theme={theme}>
                                    {card.description}
                                  </SettingDescriptionText>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={renderSettings.guest[card.key] !== false}
                                      onChange={() => handleRenderSettingChange('guest', card.key)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                  sx={{ ml: 1 }}
                                />
                              </SettingHeader>
                            </SettingItem>
                          ))}
                        </SettingsGrid>
                      </SettingsCard>
                    )}

                    {renderSettings.guest['menu_test_record'] !== false && (
                      <SettingsCard $theme={theme}>
                        <SectionTitleContainer $theme={theme}>
                          <PersonIcon />
                          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
                            Test Dashboard Cards (Guest Users)
                          </Typography>
                        </SectionTitleContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Control which cards are visible to guest users on the Test Dashboard.
                        </Typography>
                        <SettingsGrid>
                          {TEST_DASHBOARD_CARDS_GUEST.map((card) => (
                            <SettingItem key={card.key} $theme={theme}>
                              <SettingHeader>
                                <Box sx={{ flex: 1 }}>
                                  <SettingLabelText $theme={theme}>{card.label}</SettingLabelText>
                                  <SettingDescriptionText $theme={theme}>
                                    {card.description}
                                  </SettingDescriptionText>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={renderSettings.guest[card.key] !== false}
                                      onChange={() => handleRenderSettingChange('guest', card.key)}
                                      color="primary"
                                    />
                                  }
                                  label=""
                                  sx={{ ml: 1 }}
                                />
                              </SettingHeader>
                            </SettingItem>
                          ))}
                        </SettingsGrid>
                      </SettingsCard>
                    )}
                  </Box>
                )}
              </>
            )}
          </>
        )}

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingEvent?.id ? 'Edit Event' : 'Create Event'}</DialogTitle>
        <DialogContent>
          {editingEvent && (
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Event Title"
                value={editingEvent.title || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={editingEvent.description || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                required
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={editingEvent.start_date || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                    fullWidth
                    required
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
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingEvent.is_all_day || false}
                    onChange={(e) => setEditingEvent({ ...editingEvent, is_all_day: e.target.checked })}
                  />
                }
                label="All Day Event"
              />
              {!editingEvent.is_all_day && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Start Time"
                      type="time"
                      value={editingEvent.start_time || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, start_time: e.target.value })}
                      fullWidth
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
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              )}
              <TextField
                label="Location"
                value={editingEvent.location || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={editingEvent.event_type || 'academic'}
                  onChange={(e) => setEditingEvent({ ...editingEvent, event_type: e.target.value as any })}
                >
                  <MenuItem value="academic">Academic</MenuItem>
                  <MenuItem value="sports">Sports</MenuItem>
                  <MenuItem value="cultural">Cultural</MenuItem>
                  <MenuItem value="holiday">Holiday</MenuItem>
                  <MenuItem value="meeting">Meeting</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Visible To (Roles)</InputLabel>
                <Select
                  multiple
                  value={selectedEventRoles}
                  onChange={(e) => setSelectedEventRoles(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {EVENT_ROLES.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEventDialogOpen(false);
            setEditingEvent(null);
            setSelectedEventRoles([]);
          }}>
            Cancel
          </Button>
          <Button onClick={handleSaveEvent} variant="contained" disabled={eventsSaving}>
            {eventsSaving ? 'Saving...' : 'Save Event'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default LandingPageConfiguration;

