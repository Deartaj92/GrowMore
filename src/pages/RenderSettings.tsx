import React, { useState, useEffect, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Save as SaveIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';
import {
  TEACHER_MENU_CARDS,
  TEACHER_PROFILE_TABS,
  TEACHER_PROFILE_SUMMARY_CARDS,
  STUDENT_PROFILE_TABS,
  STUDENT_PROFILE_SUMMARY_CARDS,
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

const Container = styled.div<{ $theme: any }>`
  padding: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  background: ${({ $theme }) => $theme?.BG || '#ffffff'};
  min-height: 100vh;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div<{ $theme: any }>`
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  height: 48px;
  padding: 0 8px;
  margin: 0 0 8px 0;
  background: ${({ $theme }: any) => ($theme?.CARD ? $theme.CARD : '#ffffffcc')};
  border-bottom: 1px solid ${({ $theme }: any) => $theme?.BORDER || '#e5e7eb'};
  backdrop-filter: saturate(180%) blur(8px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
`;

const Title = styled.h1<{ $theme: any }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ $theme }) => $theme?.TEXT_PRIMARY || '#1f2937'};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Subtitle = styled.p<{ $theme: any }>`
  font-size: 1rem;
  color: ${({ $theme }) => $theme?.TEXT_SECONDARY || '#6b7280'};
  margin: 0;
`;

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

const ActionsContainer = styled.div<{ $theme: any }>`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'};
`;

interface RenderSettingsData {
  teacher: Record<string, boolean>;
  student: Record<string, boolean>;
  guest: Record<string, boolean>;
}

const RenderSettings: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RenderSettingsData>(getDefaultSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Convert theme mode string to theme object
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (user?.school_id) {
      fetchSettings();
    }
  }, [user?.school_id]);

  const fetchSettings = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('render_settings')
        .select('settings')
        .eq('school_id', user.school_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - we'll create default settings
        throw error;
      }

      if (data?.settings) {
        // Merge with defaults to ensure all new items are included
        const mergedSettings = mergeWithDefaults(data.settings);
        setSettings(mergedSettings);
      } else {
        // Create default settings if none exist
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
          setSettings(mergeWithDefaults(newData.settings));
        }
      }
    } catch (error: any) {
      toast.showToast('Failed to load render settings: ' + error.message, 'error');
      // Use defaults on error
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category: 'teacher' | 'student' | 'guest', key: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category]?.[key],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.school_id) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('render_settings')
        .upsert({
          school_id: user.school_id,
          settings: settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'school_id'
        });

      if (error) throw error;

      toast.showToast('Render settings saved successfully!', 'success');
      setHasChanges(false);
    } catch (error: any) {
      toast.showToast('Failed to save render settings: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default (all enabled)?')) {
      setSettings(getDefaultSettings());
      setHasChanges(true);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Container $theme={theme}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container $theme={theme}>
        <Header $theme={theme}>
          <Title $theme={theme}>
            <VisibilityIcon fontSize="small" />
            Render Settings
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tooltip title="Reset to defaults">
              <span>
                <IconButton size="small" onClick={handleReset} disabled={saving}>
                  <ResetIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={hasChanges ? 'Save changes' : 'No changes to save'}>
              <span>
                <IconButton size="small" onClick={handleSave} disabled={saving || !hasChanges}>
                  {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </div>
        </Header>

        {hasChanges && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You have unsaved changes. Don't forget to save!
          </Alert>
        )}
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
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
              label="Guest" 
            />
          </Tabs>
        </Box>

        {/* Teacher Tab Content */}
        {activeTab === 0 && (
          <Box>
            <SettingsCard $theme={theme}>
          <SectionTitleContainer $theme={theme}>
            <SchoolIcon />
            <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
              Teacher Menu Cards (Welcome Page)
            </Typography>
          </SectionTitleContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Control which menu cards are visible to teachers on the Welcome Page
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
                        checked={settings.teacher[card.key] !== false}
                        onChange={() => handleSettingChange('teacher', card.key)}
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

            {/* Teacher Profile Tabs Settings */}
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
                        checked={settings.teacher[tab.key] !== false}
                        onChange={() => handleSettingChange('teacher', tab.key)}
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

            {/* Teacher Profile Summary Cards Settings */}
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
                        checked={settings.teacher[card.key] !== false}
                        onChange={() => handleSettingChange('teacher', card.key)}
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
        {activeTab === 1 && (
          <Box>
            {/* Student Profile Tabs Settings */}
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
                        checked={settings.student[tab.key] !== false}
                        onChange={() => handleSettingChange('student', tab.key)}
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

            {/* Student Profile Summary Cards Settings */}
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
                        checked={settings.student[card.key] !== false}
                        onChange={() => handleSettingChange('student', card.key)}
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
        {activeTab === 2 && (
          <Box>
            {/* Guest Sidebar Menus Settings */}
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
                        checked={settings.guest[menu.key] !== false}
                        onChange={() => handleSettingChange('guest', menu.key)}
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

            {/* Dashboard Cards Settings */}
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
                        checked={settings.guest[card.key] !== false}
                        onChange={() => handleSettingChange('guest', card.key)}
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

        {/* Per-Dashboard Sections (conditional on allowed sidebar menus) */}
        {settings.guest['menu_students'] !== false && (
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
                          checked={settings.guest[card.key] !== false}
                          onChange={() => handleSettingChange('guest', card.key)}
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

        {settings.guest['menu_fee_management'] !== false && (
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
                          checked={settings.guest[card.key] !== false}
                          onChange={() => handleSettingChange('guest', card.key)}
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

        {settings.guest['menu_attendance'] !== false && (
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
                          checked={settings.guest[card.key] !== false}
                          onChange={() => handleSettingChange('guest', card.key)}
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

        {settings.guest['menu_employees'] !== false && (
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
                          checked={settings.guest[card.key] !== false}
                          onChange={() => handleSettingChange('guest', card.key)}
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

        {settings.guest['menu_fines'] !== false && (
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
                          checked={settings.guest[card.key] !== false}
                          onChange={() => handleSettingChange('guest', card.key)}
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

        {settings.guest['menu_examination'] !== false && (
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
                          checked={settings.guest[card.key] !== false}
                          onChange={() => handleSettingChange('guest', card.key)}
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

        {settings.guest['menu_test_record'] !== false && (
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
                          checked={settings.guest[card.key] !== false}
                          onChange={() => handleSettingChange('guest', card.key)}
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

        
      </Container>
    </ThemeProvider>
  );
};

export default RenderSettings;
