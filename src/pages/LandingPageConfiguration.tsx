import React, { useState, useEffect, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { supabase } from '../supabaseClient';
import {
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  DragIndicator as DragIndicatorIcon,
  Settings as SettingsIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  RestartAlt as ResetIcon,
  Event as EventIcon,
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
  Typography,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Tooltip,
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

const RenderSettings: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const { showToast } = useToast();
  
  // Render Settings state
  const [renderSettings, setRenderSettings] = useState<RenderSettingsData>(getDefaultSettings());
  const [renderSettingsLoading, setRenderSettingsLoading] = useState(true);
  const [renderSettingsSaving, setRenderSettingsSaving] = useState(false);
  const [hasRenderSettingsChanges, setHasRenderSettingsChanges] = useState(false);
  const [renderSettingsTab, setRenderSettingsTab] = useState(0); // 0 = Teacher, 1 = Student, 2 = Parent, 3 = Guest
  
  // Convert theme mode string to theme object
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (user?.school_id) {
      loadRenderSettings();
    }
  }, [user]);

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

  // Access is controlled by ProtectedRoute with requiredPermission="settings-landing-page"

  return (
    <ThemeProvider theme={theme}>
      <Container $theme={theme}>
        <Header $theme={theme}>
          <HeaderTitle $theme={theme}>
            <SettingsIcon />
            Render Settings
          </HeaderTitle>
          <Box display="flex" gap={1} alignItems="center">
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
          </Box>
        </Header>

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
      </Container>
    </ThemeProvider>
  );
};

export default RenderSettings;

