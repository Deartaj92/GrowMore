import React, { useState, useEffect, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import Loader from '../components/Loader';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  RestartAlt as ResetIcon,
  CheckCircle,
  Cancel,
  Help as HelpIcon,
  Close as CloseIcon,
  AccessTime,
  Assignment,
  Assessment,
  EventBusy,
  Timer
} from '@mui/icons-material';

const Container = styled.div<{ $theme: any }>`
  padding: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ $theme }) => $theme?.BG || '#ffffff'};
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;
  
  @media (max-width: 768px) {
    padding: 1rem;
    padding-bottom: 2rem;
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
  justify-content: space-between;
  gap: 0.75rem;
`;

const VibrationKeyframes = `
  @keyframes vibrate {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }
    2% {
      transform: translate(-1px, -1px) rotate(-0.5deg);
    }
    4% {
      transform: translate(1px, 1px) rotate(0.5deg);
    }
    6% {
      transform: translate(-1px, 1px) rotate(-0.5deg);
    }
    8% {
      transform: translate(1px, -1px) rotate(0.5deg);
    }
    10% {
      transform: translate(-1px, -1px) rotate(-0.5deg);
    }
    12% {
      transform: translate(1px, 1px) rotate(0.5deg);
    }
    14% {
      transform: translate(-1px, 1px) rotate(-0.5deg);
    }
    16% {
      transform: translate(1px, -1px) rotate(0.5deg);
    }
    18% {
      transform: translate(-1px, -1px) rotate(-0.5deg);
    }
    20%, 100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }
`;

const VibratingHelpButton = styled(IconButton)`
  ${VibrationKeyframes}
  animation: vibrate 2.3s ease-in-out infinite;
  
  &:hover {
    animation: none;
    transform: scale(1.1);
  }
`;

const ActionsContainer = styled.div<{ $theme: any }>`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'};
`;

const StyledTable = styled(TableContainer).attrs(() => ({
  component: Paper
}))<{ $theme: any }>`
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'};
  border-radius: 8px;
  overflow: hidden;
`;

const StyledTableRow = styled(TableRow)<{ $theme: any }>`
  &:hover {
    background: ${({ $theme }) => $theme?.BG || '#f9fafb'};
  }
`;

interface Teacher {
  id: number;
  name: string;
  picture_url?: string | null;
  role: string;
}

interface TeacherScoreSettings {
  teacher_id: number;
  enable_attendance_deduction: boolean;
  enable_diary_deduction: boolean;
  enable_test_deduction: boolean;
}

const GeneralSettings: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSettings, setTeacherSettings] = useState<Map<number, TeacherScoreSettings>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (user?.school_id) {
      fetchData();
    }
  }, [user?.school_id]);

  const fetchData = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      
      // Fetch all staff members (teachers)
      const { data: teachersData, error: teachersError } = await supabase
        .from('staff')
        .select('id, name, picture_url, role')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      if (teachersError) throw teachersError;

      setTeachers(teachersData || []);

      // Fetch teacher score deduction settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('teacher_score_deduction_settings')
        .select('teacher_id, enable_attendance_deduction, enable_diary_deduction, enable_test_deduction')
        .eq('school_id', user.school_id);

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      // Create a map of teacher settings
      const settingsMap = new Map<number, TeacherScoreSettings>();
      if (settingsData) {
        settingsData.forEach((setting: any) => {
          settingsMap.set(setting.teacher_id, {
            teacher_id: setting.teacher_id,
            enable_attendance_deduction: setting.enable_attendance_deduction ?? true,
            enable_diary_deduction: setting.enable_diary_deduction ?? false,
            enable_test_deduction: setting.enable_test_deduction ?? false,
          });
        });
      }

      // Initialize default settings for teachers without settings
      (teachersData || []).forEach((teacher: Teacher) => {
        if (!settingsMap.has(teacher.id)) {
          settingsMap.set(teacher.id, {
            teacher_id: teacher.id,
            enable_attendance_deduction: true,
            enable_diary_deduction: false,
            enable_test_deduction: false,
          });
        }
      });

      setTeacherSettings(settingsMap);
    } catch (error: any) {
      toast.showToast('Failed to load settings: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (teacherId: number, settingKey: keyof TeacherScoreSettings, value: boolean) => {
    setTeacherSettings((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(teacherId) || {
        teacher_id: teacherId,
        enable_attendance_deduction: true,
        enable_diary_deduction: false,
        enable_test_deduction: false,
      };
      newMap.set(teacherId, {
        ...current,
        [settingKey]: value,
      });
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.school_id) return;

    try {
      setSaving(true);

      if (activeTab === 0) {
        // Save teacher score deduction settings
        const settingsToSave = Array.from(teacherSettings.values()).map((setting) => ({
          school_id: user.school_id,
          teacher_id: setting.teacher_id,
          enable_attendance_deduction: setting.enable_attendance_deduction,
          enable_diary_deduction: setting.enable_diary_deduction,
          enable_test_deduction: setting.enable_test_deduction,
        }));

        const { error } = await supabase
          .from('teacher_score_deduction_settings')
          .upsert(settingsToSave, {
            onConflict: 'school_id,teacher_id',
          });

        if (error) throw error;
        setHasChanges(false);
      }

      toast.showToast('Settings saved successfully!', 'success');
    } catch (error: any) {
      toast.showToast('Failed to save settings: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This will enable attendance deduction and disable diary and test deductions for all teachers.')) {
      const defaultMap = new Map<number, TeacherScoreSettings>();
      teachers.forEach((teacher) => {
        defaultMap.set(teacher.id, {
          teacher_id: teacher.id,
          enable_attendance_deduction: true,
          enable_diary_deduction: false,
          enable_test_deduction: false,
        });
      });
      setTeacherSettings(defaultMap);
      setHasChanges(true);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <ThemeProvider theme={theme}>
      <Container $theme={theme}>
        <Header $theme={theme}>
          <Title $theme={theme}>
            <SettingsIcon />
            General Settings
          </Title>
        </Header>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Teachers Score Deduction" />
        </Tabs>

        {activeTab === 0 && (
          <SettingsCard $theme={theme}>
            <SectionTitleContainer $theme={theme}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <PersonIcon />
                <Typography variant="h6" component="div">
                  Teachers Score Deduction Settings
                </Typography>
              </Box>
              <VibratingHelpButton
                onClick={() => setHelpModalOpen(true)}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <HelpIcon />
              </VibratingHelpButton>
            </SectionTitleContainer>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure score deduction settings for individual teachers. Control which deductions apply to each teacher's score calculation.
            </Typography>

            {teachers.length === 0 ? (
              <Alert severity="info">No active teachers found.</Alert>
            ) : (
              <StyledTable $theme={theme}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        <Tooltip title="Deduct score for absences, leaves, late arrivals, and half leaves">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'help' }}>
                            Attendance
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        <Tooltip title="Deduct score based on homework diary assignment average per day (based on present/late attendance days). Average < 3 deducts score.">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'help' }}>
                            Diary
                          </Box>
                        </Tooltip>
                      </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>
                            <Tooltip title="Deduct score based on average test performance of students. Average < 60% deducts score (0.3-1 points based on performance level).">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'help' }}>
                                Test
                              </Box>
                            </Tooltip>
                          </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teachers.map((teacher) => {
                      const settings = teacherSettings.get(teacher.id) || {
                        teacher_id: teacher.id,
                        enable_attendance_deduction: true,
                        enable_diary_deduction: false,
                        enable_test_deduction: false,
                      };

                      return (
                        <StyledTableRow key={teacher.id} $theme={theme}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                src={teacher.picture_url || undefined}
                                alt={teacher.name}
                                sx={{ width: 40, height: 40 }}
                              >
                                {teacher.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {teacher.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {teacher.role}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={settings.enable_attendance_deduction}
                                  onChange={(e) =>
                                    handleSettingChange(teacher.id, 'enable_attendance_deduction', e.target.checked)
                                  }
                                  color="primary"
                                />
                              }
                              label=""
                            />
                          </TableCell>
                          <TableCell align="center">
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={settings.enable_diary_deduction}
                                  onChange={(e) =>
                                    handleSettingChange(teacher.id, 'enable_diary_deduction', e.target.checked)
                                  }
                                  color="primary"
                                />
                              }
                              label=""
                            />
                          </TableCell>
                          <TableCell align="center">
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={settings.enable_test_deduction}
                                  onChange={(e) =>
                                    handleSettingChange(teacher.id, 'enable_test_deduction', e.target.checked)
                                  }
                                  color="primary"
                                />
                              }
                              label=""
                            />
                          </TableCell>
                        </StyledTableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </StyledTable>
            )}

            <ActionsContainer $theme={theme}>
              <Button
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={handleReset}
                disabled={saving}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </ActionsContainer>
          </SettingsCard>
        )}

        {/* Help Modal */}
        <Dialog
          open={helpModalOpen}
          onClose={() => setHelpModalOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pb: 1,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HelpIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Score Deduction Rules
              </Typography>
            </Box>
            <IconButton
              onClick={() => setHelpModalOpen(false)}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'error.main',
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                  Overview
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Teachers start with a base score of 10. Points are deducted based on various factors. 
                  Each deduction type can be enabled or disabled individually for each teacher.
                </Typography>
              </Box>

              <Divider />

              {/* Attendance Deduction */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <AccessTime sx={{ color: 'error.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Attendance Deduction
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Absent"
                      secondary="Deducts 0.2 points per absence"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EventBusy sx={{ color: 'info.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Leave"
                      secondary="Deducts 0.1 points per leave"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Timer sx={{ color: 'warning.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Late"
                      secondary="Deducts 0.1 points per late arrival"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AccessTime sx={{ color: '#ec4899', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Half Leave"
                      secondary="Deducts 0.05 points per half leave"
                    />
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* Diary Deduction */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Assignment sx={{ color: 'warning.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Diary Assignment Deduction
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Based on average homework assignments per day (calculated from present and late attendance days):
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average ≥ 3 assignments/day"
                      secondary="No deduction"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Cancel sx={{ color: 'warning.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average < 3 and ≥ 2 assignments/day"
                      secondary="Deducts 0.5 points"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average < 2 and ≥ 1 assignment/day"
                      secondary="Deducts 1 point"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average < 1 assignment/day"
                      secondary="Deducts 2 points"
                    />
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* Test Deduction */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Assessment sx={{ color: 'info.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Test Performance Deduction
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Based on average test performance percentage of students:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average ≥ 60%"
                      secondary="No deduction"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Cancel sx={{ color: 'warning.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average < 60% and ≥ 50%"
                      secondary="Deducts 0.3 points"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average < 50% and ≥ 40%"
                      secondary="Deducts 0.5 points"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average < 40%"
                      secondary="Deducts 1 point"
                    />
                  </ListItem>
                </List>
              </Box>

              <Divider />

              <Box sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'info.light',
                border: '1px solid',
                borderColor: 'info.main',
              }}>
                <Typography variant="body2" fontWeight={600} color="info.dark" sx={{ mb: 0.5 }}>
                  Note
                </Typography>
                <Typography variant="body2" color="info.dark">
                  The final score cannot go below 0. All deductions are calculated independently and summed together.
                </Typography>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default GeneralSettings;

