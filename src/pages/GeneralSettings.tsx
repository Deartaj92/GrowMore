import React, { useState, useEffect, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import Loader from '../components/Loader';
import {
  AUTO_LOCK_IDLE_SECOND_OPTIONS,
  formatAutoLockIdleLabel,
  getAutoLockEnabled,
  getAutoLockIdleSeconds,
  SCREEN_LOCK_MIN_WIDTH,
  setAutoLockEnabled as writeAutoLockEnabledToStorage,
  setAutoLockIdleSeconds as writeAutoLockIdleSecondsToStorage,
} from '../utils/appScreenLockSettings';
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
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Timer,
  Assignment,
  Assessment,
  EventBusy,
  DesktopWindows as DesktopWindowsIcon,
  WhatsApp as WhatsAppIcon,
  School as SchoolIcon,
  Build as MaintenanceIcon,
  ViewModule as TabsIcon,
} from '@mui/icons-material';

export interface LmsPortalSettings {
  portal_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  tabs: {
    dashboard: { enabled: boolean; label: string };
    attendance: { enabled: boolean; label: string };
    fees: { enabled: boolean; label: string; allow_online_payment: boolean; payment_instructions: string };
    academics: { enabled: boolean; label: string; show_class_tests: boolean; show_exam_results: boolean; default_view: 'tests' | 'exams' };
    feedback: { enabled: boolean; label: string };
    profile: { enabled: boolean; label: string; allow_password_change: boolean };
  };
}

export const DEFAULT_LMS_SETTINGS: LmsPortalSettings = {
  portal_enabled: true,
  maintenance_mode: false,
  maintenance_message: 'Student LMS Portal is currently undergoing scheduled maintenance. Please check back shortly.',
  tabs: {
    dashboard: { enabled: true, label: 'Dashboard' },
    attendance: { enabled: true, label: 'Attendance' },
    fees: { enabled: true, label: 'Fees & Challans', allow_online_payment: true, payment_instructions: '' },
    academics: { enabled: true, label: 'Academics', show_class_tests: true, show_exam_results: true, default_view: 'exams' },
    feedback: { enabled: true, label: 'Feedback' },
    profile: { enabled: true, label: 'My Profile', allow_password_change: true },
  },
};

export const encodeLmsSettings = (s: LmsPortalSettings): string => {
  const safeMsg = (s.maintenance_message || '').slice(0, 175);

  const compact: any = {
    pe: s.portal_enabled ? 1 : 0,
    mm: s.maintenance_mode ? 1 : 0,
  };

  if (safeMsg) compact.m = safeMsg;

  const dLab = s.tabs.dashboard.label !== 'Dashboard' ? s.tabs.dashboard.label : undefined;
  const aLab = s.tabs.attendance.label !== 'Attendance' ? s.tabs.attendance.label : undefined;
  const fLab = s.tabs.fees.label !== 'Fees & Challans' ? s.tabs.fees.label : undefined;
  const cLab = s.tabs.academics.label !== 'Academics' ? s.tabs.academics.label : undefined;
  const bLab = s.tabs.feedback.label !== 'Feedback' ? s.tabs.feedback.label : undefined;
  const pLab = s.tabs.profile.label !== 'My Profile' ? s.tabs.profile.label : undefined;

  compact.t = {
    d: dLab ? [s.tabs.dashboard.enabled ? 1 : 0, dLab] : (s.tabs.dashboard.enabled ? 1 : 0),
    a: aLab ? [s.tabs.attendance.enabled ? 1 : 0, aLab] : (s.tabs.attendance.enabled ? 1 : 0),
    f: [s.tabs.fees.enabled ? 1 : 0, s.tabs.fees.allow_online_payment ? 1 : 0, ...(fLab ? [fLab] : [])],
    c: [s.tabs.academics.enabled ? 1 : 0, s.tabs.academics.show_class_tests ? 1 : 0, s.tabs.academics.show_exam_results ? 1 : 0, ...(cLab ? [cLab] : [])],
    b: bLab ? [s.tabs.feedback.enabled ? 1 : 0, bLab] : (s.tabs.feedback.enabled ? 1 : 0),
    p: [s.tabs.profile.enabled ? 1 : 0, s.tabs.profile.allow_password_change ? 1 : 0, ...(pLab ? [pLab] : [])],
  };

  return 'LMS:' + JSON.stringify(compact);
};

const cleanLabel = (val: any, fallback: string) => {
  if (typeof val === 'string' && val !== '1' && val !== '0' && val.trim().length > 0) {
    return val;
  }
  return fallback;
};

export const decodeLmsSettings = (str: string): LmsPortalSettings => {
  try {
    if (!str || !str.includes('LMS:')) return DEFAULT_LMS_SETTINGS;
    const jsonPart = str.split('LMS:')[1];
    const c = JSON.parse(jsonPart);

    const parseTab = (val: any, defaultEnabled: boolean, defaultLabel: string) => {
      if (typeof val === 'number') return { enabled: val === 1, label: defaultLabel };
      if (Array.isArray(val)) {
        const strLabel = val.find((item: any) => typeof item === 'string');
        return { enabled: val[0] === 1, label: cleanLabel(strLabel, defaultLabel) };
      }
      return { enabled: defaultEnabled, label: defaultLabel };
    };

    const parseFees = (val: any) => {
      if (!Array.isArray(val)) return { enabled: true, allow_online_payment: true, label: 'Fees & Challans', payment_instructions: '' };
      const strLabel = val.find((item: any) => typeof item === 'string');
      return {
        enabled: val[0] === 1,
        allow_online_payment: val[1] === 1,
        label: cleanLabel(strLabel, 'Fees & Challans'),
        payment_instructions: '',
      };
    };

    const parseAcademics = (val: any) => {
      if (!Array.isArray(val)) return { enabled: true, show_class_tests: true, show_exam_results: true, label: 'Academics', default_view: 'exams' as const };
      const strLabel = val.find((item: any) => typeof item === 'string');
      return {
        enabled: val[0] === 1,
        show_class_tests: val[1] === 1,
        show_exam_results: val[2] === 1,
        label: cleanLabel(strLabel, 'Academics'),
        default_view: 'exams' as const,
      };
    };

    const parseProfile = (val: any) => {
      if (!Array.isArray(val)) return { enabled: true, allow_password_change: true, label: 'My Profile' };
      const strLabel = val.find((item: any) => typeof item === 'string');
      return {
        enabled: val[0] === 1,
        allow_password_change: val[1] === 1,
        label: cleanLabel(strLabel, 'My Profile'),
      };
    };

    return {
      portal_enabled: c.pe === 1,
      maintenance_mode: c.mm === 1,
      maintenance_message: c.m || DEFAULT_LMS_SETTINGS.maintenance_message,
      tabs: {
        dashboard: parseTab(c.t?.d, true, 'Dashboard'),
        attendance: parseTab(c.t?.a, true, 'Attendance'),
        fees: parseFees(c.t?.f),
        academics: parseAcademics(c.t?.c),
        feedback: parseTab(c.t?.b, true, 'Feedback'),
        profile: parseProfile(c.t?.p),
      },
    };
  } catch (e) {
    return DEFAULT_LMS_SETTINGS;
  }
};

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
})) <{ $theme: any }>`
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'};
  border-radius: 8px;
  overflow: hidden;
`;

const StyledTableRow = styled(TableRow) <{ $theme: any }>`
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

export const DEFAULT_ABSENT_TEMPLATE = `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ {studentName} کلاس {className} آج بتاریخ {date} سکول سے غیر حاضر ہے۔
برائے مہربانی اپنے بچے کو باقاعدگی سے سکول بھیجیں۔ شکریہ

{schoolName}`;

export const DEFAULT_ABSENT_ENGLISH_TEMPLATE = `📚 Daily Attendance Report
Dear Parent/Guardian!
Your child {studentName} from class {className} was absent on {date}.
Please ensure your child attends school regularly. Thank you.

{schoolName}`;

const GeneralSettings: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [autoLockEnabled, setAutoLockEnabled] = useState(getAutoLockEnabled);
  const [autoLockIdleSeconds, setAutoLockIdleSeconds] = useState(getAutoLockIdleSeconds);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSettings, setTeacherSettings] = useState<Map<number, TeacherScoreSettings>>(new Map());
  // WhatsApp Absent Template State (Urdu & English)
  const [whatsappAbsentTemplate, setWhatsappAbsentTemplate] = useState<string>(() => {
    return localStorage.getItem('whatsapp_absent_template') || DEFAULT_ABSENT_TEMPLATE;
  });
  const [whatsappAbsentEnglishTemplate, setWhatsappAbsentEnglishTemplate] = useState<string>(() => {
    return localStorage.getItem('whatsapp_absent_english_template') || DEFAULT_ABSENT_ENGLISH_TEMPLATE;
  });
  // Student LMS Portal Control Settings State
  const [lmsSettings, setLmsSettings] = useState<LmsPortalSettings>(() => {
    try {
      const stored = localStorage.getItem('lms_portal_settings');
      if (stored) return { ...DEFAULT_LMS_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {}
    return DEFAULT_LMS_SETTINGS;
  });

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

      // Fetch saved WhatsApp absent message templates & LMS settings from institute_profile
      const { data: profileData } = await supabase
        .from('institute_profile')
        .select('absent_message_template, website')
        .eq('school_id', user.school_id)
        .maybeSingle();

      if (profileData?.absent_message_template) {
        const rawTmpl = profileData.absent_message_template.split('\n\nLMS_CFG:')[0];
        setWhatsappAbsentTemplate(rawTmpl);
        localStorage.setItem('whatsapp_absent_template', rawTmpl);
      }

      if (profileData?.website?.includes('LMS:')) {
        const decoded = decodeLmsSettings(profileData.website);
        setLmsSettings(decoded);
        localStorage.setItem('lms_portal_settings', JSON.stringify(decoded));
      }
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
    if (activeTab === 0 && !user?.school_id) return;

    try {
      setSaving(true);

      if (activeTab === 0) {
        // Save teacher score deduction settings
        const settingsToSave = Array.from(teacherSettings.values()).map((setting) => ({
          school_id: user!.school_id,
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
      } else if (activeTab === 1) {
        writeAutoLockEnabledToStorage(autoLockEnabled);
        writeAutoLockIdleSecondsToStorage(autoLockIdleSeconds);
      } else if (activeTab === 2) {
        localStorage.setItem('whatsapp_absent_template', whatsappAbsentTemplate.trim());
        localStorage.setItem('whatsapp_absent_english_template', whatsappAbsentEnglishTemplate.trim());
        if (user?.school_id) {
          const cleanTmpl = whatsappAbsentTemplate.trim();

          // 1. Query for existing institute_profile row for this school_id
          const { data: existingRows } = await supabase
            .from('institute_profile')
            .select('id')
            .eq('school_id', user.school_id);

          if (existingRows && existingRows.length > 0) {
            // Update existing row by primary key id
            await supabase
              .from('institute_profile')
              .update({
                absent_message_template: cleanTmpl,
              })
              .eq('id', existingRows[0].id);
          } else {
            // Insert new row with full required profile schema
            await supabase
              .from('institute_profile')
              .insert([
                {
                  school_id: user.school_id,
                  name: 'GrowMore School',
                  short_name: 'GMS',
                  tagline: 'Empowering Education',
                  phone: '0000000000',
                  website: '',
                  address: 'School Address',
                  country: 'Pakistan',
                  absent_message_template: cleanTmpl,
                },
              ]);
          }
        }
      } else if (activeTab === 3) {
        localStorage.setItem('lms_portal_settings', JSON.stringify(lmsSettings));
        if (user?.school_id) {
          const compactPayload = encodeLmsSettings(lmsSettings);

          // 1. Query for existing institute_profile row for this school_id
          const { data: existingRows } = await supabase
            .from('institute_profile')
            .select('id')
            .eq('school_id', user.school_id);

          if (existingRows && existingRows.length > 0) {
            // Update existing row by primary key id using website column
            await supabase
              .from('institute_profile')
              .update({
                website: compactPayload,
              })
              .eq('id', existingRows[0].id);
          } else {
            // Insert new row with full required profile schema
            await supabase
              .from('institute_profile')
              .insert([
                {
                  school_id: user.school_id,
                  name: 'GrowMore School',
                  short_name: 'GMS',
                  tagline: 'Empowering Education',
                  phone: '0000000000',
                  website: compactPayload,
                  address: 'School Address',
                  country: 'Pakistan',
                },
              ]);
          }
        }
      }

      setHasChanges(false);
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
          <Tab label="Screen" />
          <Tab label="WhatsApp Templates" />
          <Tab label="Student LMS Control Panel" />
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

        {activeTab === 1 && (
          <SettingsCard $theme={theme}>
            <SectionTitleContainer $theme={theme}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <DesktopWindowsIcon />
                <Typography variant="h6" component="div">
                  Screen & auto-lock
                </Typography>
              </Box>
              <Chip size="small" label="Desktop only" color="primary" variant="outlined" />
            </SectionTitleContainer>
            <Alert severity="info" sx={{ mb: 2 }}>
              Manual screen lock and automatic idle lock apply only on <strong>desktop-sized</strong> windows
              (browser or Electron), at least {SCREEN_LOCK_MIN_WIDTH}px wide. They are not used on phones or narrow layouts.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              When enabled, the app locks after no keyboard, mouse, or scroll activity for the chosen period.
              Configure the same behaviour from the header lock control on supported desktops.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={autoLockEnabled}
                  onChange={(e) => {
                    setAutoLockEnabled(e.target.checked);
                    setHasChanges(true);
                  }}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Auto-lock after idle
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Locks the application until the login password is entered
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', mb: 2, ml: 0 }}
            />
            <FormControl fullWidth disabled={!autoLockEnabled} sx={{ maxWidth: 360, mb: 2 }}>
              <InputLabel id="auto-lock-idle-label">Idle time before lock</InputLabel>
              <Select
                labelId="auto-lock-idle-label"
                label="Idle time before lock"
                value={autoLockIdleSeconds}
                onChange={(e) => {
                  setAutoLockIdleSeconds(Number(e.target.value));
                  setHasChanges(true);
                }}
              >
                {AUTO_LOCK_IDLE_SECOND_OPTIONS.map((sec) => (
                  <MenuItem key={sec} value={sec}>
                    {formatAutoLockIdleLabel(sec)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ActionsContainer $theme={theme}>
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

        {activeTab === 2 && (
          <SettingsCard $theme={theme}>
            <SectionTitleContainer $theme={theme}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <WhatsAppIcon style={{ color: '#25d366' }} />
                <Typography variant="h6" component="div">
                  Absent Student WhatsApp Message Template
                </Typography>
              </Box>
            </SectionTitleContainer>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customize the automatic WhatsApp / SMS message template sent to parents of absent students from the Dashboard.
              You can use placeholders like <code>&#123;studentName&#125;</code>, <code>&#123;className&#125;</code>, <code>&#123;date&#125;</code>, and <code>&#123;schoolName&#125;</code>.
            </Typography>
            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🇵🇰 Urdu Absent Message Template
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  label="Urdu Absent Template"
                  value={whatsappAbsentTemplate}
                  onChange={(e) => {
                    setWhatsappAbsentTemplate(e.target.value);
                    setHasChanges(true);
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🇺🇸 English Absent Message Template
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  label="English Absent Template"
                  value={whatsappAbsentEnglishTemplate}
                  onChange={(e) => {
                    setWhatsappAbsentEnglishTemplate(e.target.value);
                    setHasChanges(true);
                  }}
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip size="small" label="{studentName} = Student Name" variant="outlined" color="primary" />
              <Chip size="small" label="{className} = Class & Section" variant="outlined" color="primary" />
              <Chip size="small" label="{date} = Attendance Date" variant="outlined" color="primary" />
              <Chip size="small" label="{schoolName} = School Name" variant="outlined" color="primary" />
            </Box>
            <ActionsContainer $theme={theme}>
              <Button
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={() => {
                  setWhatsappAbsentTemplate(DEFAULT_ABSENT_TEMPLATE);
                  setWhatsappAbsentEnglishTemplate(DEFAULT_ABSENT_ENGLISH_TEMPLATE);
                  setHasChanges(true);
                }}
                disabled={saving}
              >
                Reset to Default Templates
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

        {activeTab === 3 && (
          <SettingsCard $theme={theme}>
            <SectionTitleContainer $theme={theme}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <SchoolIcon style={{ color: '#6366f1' }} />
                <Typography variant="h6" component="div">
                  Student LMS Control Panel
                </Typography>
              </Box>
              <Chip size="small" label="Live Portal Config" color="secondary" variant="outlined" />
            </SectionTitleContainer>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure live portal status, maintenance banners, tab rendering visibility, custom labels, and feature controls for the Student LMS portal.
            </Typography>

            {/* Global LMS Status & Maintenance Card */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MaintenanceIcon style={{ color: '#f59e0b' }} /> Global Status & Maintenance Mode
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={lmsSettings.portal_enabled}
                        onChange={(e) => {
                          setLmsSettings((prev) => ({ ...prev, portal_enabled: e.target.checked }));
                          setHasChanges(true);
                        }}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>Enable Student LMS Portal</Typography>
                        <Typography variant="caption" color="text.secondary">Allow students to log in and access the portal</Typography>
                      </Box>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={lmsSettings.maintenance_mode}
                        onChange={(e) => {
                          setLmsSettings((prev) => ({ ...prev, maintenance_mode: e.target.checked }));
                          setHasChanges(true);
                        }}
                        color="warning"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="warning.main">Enable Maintenance Mode</Typography>
                        <Typography variant="caption" color="text.secondary">Shows maintenance screen banner to students</Typography>
                      </Box>
                    }
                  />
                </Grid>
                {lmsSettings.maintenance_mode && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Maintenance Mode Banner Message"
                      value={lmsSettings.maintenance_message}
                      onChange={(e) => {
                        setLmsSettings((prev) => ({ ...prev, maintenance_message: e.target.value }));
                        setHasChanges(true);
                      }}
                      placeholder="e.g. Student LMS Portal is currently undergoing scheduled maintenance..."
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Rendering Tabs & Sub-Feature Controls */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TabsIcon style={{ color: '#3b82f6' }} /> Rendering Tabs & Sub-Feature Controls
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              {/* Dashboard Tab Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>📊 Dashboard Tab</Typography>
                    <Switch
                      checked={lmsSettings.tabs.dashboard.enabled}
                      onChange={(e) => {
                        setLmsSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, dashboard: { ...prev.tabs.dashboard, enabled: e.target.checked } },
                        }));
                        setHasChanges(true);
                      }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Display Label"
                    value={lmsSettings.tabs.dashboard.label}
                    onChange={(e) => {
                      setLmsSettings((prev) => ({
                        ...prev,
                        tabs: { ...prev.tabs, dashboard: { ...prev.tabs.dashboard, label: e.target.value } },
                      }));
                      setHasChanges(true);
                    }}
                  />
                </Paper>
              </Grid>

              {/* Attendance Tab Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>📅 Attendance Tab</Typography>
                    <Switch
                      checked={lmsSettings.tabs.attendance.enabled}
                      onChange={(e) => {
                        setLmsSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, attendance: { ...prev.tabs.attendance, enabled: e.target.checked } },
                        }));
                        setHasChanges(true);
                      }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Display Label"
                    value={lmsSettings.tabs.attendance.label}
                    onChange={(e) => {
                      setLmsSettings((prev) => ({
                        ...prev,
                        tabs: { ...prev.tabs, attendance: { ...prev.tabs.attendance, label: e.target.value } },
                      }));
                      setHasChanges(true);
                    }}
                  />
                </Paper>
              </Grid>

              {/* Academics Tab Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>🎓 Academics Tab</Typography>
                    <Switch
                      checked={lmsSettings.tabs.academics.enabled}
                      onChange={(e) => {
                        setLmsSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, academics: { ...prev.tabs.academics, enabled: e.target.checked } },
                        }));
                        setHasChanges(true);
                      }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Display Label"
                    value={lmsSettings.tabs.academics.label}
                    onChange={(e) => {
                      setLmsSettings((prev) => ({
                        ...prev,
                        tabs: { ...prev.tabs, academics: { ...prev.tabs.academics, label: e.target.value } },
                      }));
                      setHasChanges(true);
                    }}
                    sx={{ mb: 1.5 }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={lmsSettings.tabs.academics.show_class_tests}
                          onChange={(e) => {
                            setLmsSettings((prev) => ({
                              ...prev,
                              tabs: {
                                ...prev.tabs,
                                academics: { ...prev.tabs.academics, show_class_tests: e.target.checked },
                              },
                            }));
                            setHasChanges(true);
                          }}
                        />
                      }
                      label={<Typography variant="caption">Show Class Tests Tab</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={lmsSettings.tabs.academics.show_exam_results}
                          onChange={(e) => {
                            setLmsSettings((prev) => ({
                              ...prev,
                              tabs: {
                                ...prev.tabs,
                                academics: { ...prev.tabs.academics, show_exam_results: e.target.checked },
                              },
                            }));
                            setHasChanges(true);
                          }}
                        />
                      }
                      label={<Typography variant="caption">Show Examination Results Tab</Typography>}
                    />
                  </Box>
                </Paper>
              </Grid>

              {/* Fees Tab Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>💳 Fees & Challans Tab</Typography>
                    <Switch
                      checked={lmsSettings.tabs.fees.enabled}
                      onChange={(e) => {
                        setLmsSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, fees: { ...prev.tabs.fees, enabled: e.target.checked } },
                        }));
                        setHasChanges(true);
                      }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Display Label"
                    value={lmsSettings.tabs.fees.label}
                    onChange={(e) => {
                      setLmsSettings((prev) => ({
                        ...prev,
                        tabs: { ...prev.tabs, fees: { ...prev.tabs.fees, label: e.target.value } },
                      }));
                      setHasChanges(true);
                    }}
                    sx={{ mb: 1.5 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={lmsSettings.tabs.fees.allow_online_payment}
                        onChange={(e) => {
                          setLmsSettings((prev) => ({
                            ...prev,
                            tabs: { ...prev.tabs, fees: { ...prev.tabs.fees, allow_online_payment: e.target.checked } },
                          }));
                          setHasChanges(true);
                        }}
                      />
                    }
                    label={<Typography variant="caption">Enable "Pay Online" Button</Typography>}
                  />
                </Paper>
              </Grid>

              {/* Feedback Tab Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>💬 Feedback Tab</Typography>
                    <Switch
                      checked={lmsSettings.tabs.feedback.enabled}
                      onChange={(e) => {
                        setLmsSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, feedback: { ...prev.tabs.feedback, enabled: e.target.checked } },
                        }));
                        setHasChanges(true);
                      }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Display Label"
                    value={lmsSettings.tabs.feedback.label}
                    onChange={(e) => {
                      setLmsSettings((prev) => ({
                        ...prev,
                        tabs: { ...prev.tabs, feedback: { ...prev.tabs.feedback, label: e.target.value } },
                      }));
                      setHasChanges(true);
                    }}
                  />
                </Paper>
              </Grid>

              {/* My Profile Tab Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>👤 My Profile Tab</Typography>
                    <Switch
                      checked={lmsSettings.tabs.profile.enabled}
                      onChange={(e) => {
                        setLmsSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, profile: { ...prev.tabs.profile, enabled: e.target.checked } },
                        }));
                        setHasChanges(true);
                      }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Display Label"
                    value={lmsSettings.tabs.profile.label}
                    onChange={(e) => {
                      setLmsSettings((prev) => ({
                        ...prev,
                        tabs: { ...prev.tabs, profile: { ...prev.tabs.profile, label: e.target.value } },
                      }));
                      setHasChanges(true);
                    }}
                    sx={{ mb: 1.5 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={lmsSettings.tabs.profile.allow_password_change}
                        onChange={(e) => {
                          setLmsSettings((prev) => ({
                            ...prev,
                            tabs: { ...prev.tabs, profile: { ...prev.tabs.profile, allow_password_change: e.target.checked } },
                          }));
                          setHasChanges(true);
                        }}
                      />
                    }
                    label={<Typography variant="caption">Allow Students to Change Password</Typography>}
                  />
                </Paper>
              </Grid>
            </Grid>

            <ActionsContainer $theme={theme}>
              <Button
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={() => {
                  setLmsSettings(DEFAULT_LMS_SETTINGS);
                  setHasChanges(true);
                }}
                disabled={saving}
              >
                Reset to Default LMS Settings
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? 'Saving...' : 'Save LMS Settings'}
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
    </ThemeProvider >
  );
};

export default GeneralSettings;

