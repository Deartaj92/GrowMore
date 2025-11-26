import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { styled, useTheme, Theme, PaletteColor, PaletteColorOptions, keyframes } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  Collapse,
  Button,
  Tooltip,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  IconButton,
  Badge as MuiBadge,
  Skeleton,
  useMediaQuery,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Person,
  School,
  AttachMoney,
  Assignment,
  CalendarToday,
  LocationOn,
  Phone,
  Email,
  Cake,
  Bloodtype,
  Group,
  Note,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  History as HistoryIcon,
  Timer,
  ArrowForward as ArrowForwardIcon,
  CheckCircle,
  Cancel,
  EventBusy,
  Language,
  Home,
  ContactPhone,
  AlternateEmail,
  Badge,
  Wc,
  LocalHospital,
  Class,
  Groups,
  LocationCity,
  Streetview,
  PostAdd,
  AccessTime,
  CalendarMonth,
  ImportContacts,
  EmojiEvents,
  Psychology,
  SportsScore,
  Diversity3,
  MedicalInformation,
  Vaccines,
  FamilyRestroom,
  Work,
  AccountBalance,
  DirectionsBus,
  HomeWork,
  ChildCare,
  Church,
  Search,
  Autorenew,
  ChevronRight,
  Quiz,
  Grade,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { alpha } from '@mui/material/styles';
import NoSessionsFound from '../components/NoSessionsFound';
import { useProgress } from '../components/Layout';
import { PageHeaderContext } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { fetchRenderSettings, isStudentTabVisible, isStudentSummaryCardVisible, RenderSettings } from '../services/renderSettingsService';
import { getStudentDisplayId, fetchStudentByIdentifier, fetchStudentBySlug, createStudentSlug } from '../utils/studentUtils';
import { STUDENT_PROFILE_TABS } from '../config/renderSettingsConfig';
import { examinationService } from '../services/examinationService';
import { testRecordService } from '../services/testRecordService';
import { homeworkDiaryService } from '../services/homeworkDiaryService';
import { ExamResult } from '../types/examinations';
import { TestResult } from '../types/testRecords';
import { HomeworkDiary } from '../types/homeworkDiary';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

const pulseAnimation = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
`;

// Extend the Theme type to include our custom colors
declare module '@mui/material/styles' {
  interface Palette {
    success: PaletteColor;
    warning: PaletteColor;
    error: PaletteColor;
    info: PaletteColor;
  }
  interface PaletteOptions {
    success?: PaletteColorOptions;
    warning?: PaletteColorOptions;
    error?: PaletteColorOptions;
    info?: PaletteColorOptions;
  }
}

// Define the color keys type
type ColorKey = keyof Pick<Theme['palette'], 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'>;

// Define the stat item interface
interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: ColorKey;
}

// TypeScript Interfaces
type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed' | 'in_progress';

interface AttendanceRecord {
  id: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  date: string;
  remarks?: string;
  fine_amount?: number;
}

interface AttendanceData {
  status: 'present' | 'absent' | 'late' | 'leave';
  date: string;
}

interface FinePayment {
  id: string;
  amount: number;
  remission?: number;
  payment_date: string;
  payment_method: string;
  remarks?: string;
}

interface Student {
  id: string;
  name: string;
  class_id: number;
  section_id: number;
  school_id: number;
  admission_date: string;
  discount_in_fee?: number;
  phone?: string;
  picture_url?: string;
  dob?: string;
  form_b?: string;
  gender?: string;
  cast?: string;
  orphan?: string;
  osc?: string;
  id_mark?: string;
  blood_group?: string;
  previous_school?: string;
  previous_id?: string;
  religion?: string;
  disease?: string;
  additional_note?: string;
  total_siblings?: number;
  address?: string;
  father_name?: string;
  father_national_id?: string;
  father_education?: string;
  father_mobile?: string;
  father_occupation?: string;
  father_profession?: string;
  father_income?: number;
  mother_name?: string;
  mother_national_id?: string;
  mother_education?: string;
  mother_mobile?: string;
  mother_occupation?: string;
  mother_profession?: string;
  mother_income?: number;
  session_id: number;
  status?: string;
  roll_number?: string | null;
  class?: { name: string };
  section?: { name: string };
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
}

interface ExamSummary {
  exam_id: number;
  exam_name: string;
  exam_type: string;
  total_subjects: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade?: string;
  status: 'pass' | 'fail' | 'absent';
  position?: number;
  total_strength?: number;
  subjects: ExamResult[];
}

interface FineDetails {
  payments: FinePayment[];
  totalPaid: number;
  totalRemission: number;
}

interface MonthlyStats {
  month: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  halfLeaves: number;
  [key: string]: string | number; // Allow indexing by status string
}

type AttendanceStatusColor = 'success' | 'error' | 'warning' | 'info';

interface AttendancePatternStat {
  label: string;
  value: string;
  count: number;
  colorKey: ColorKey | 'secondary';
}

const statusColors: Record<string, string> = {
  'pending': '#ed6c02',    // Orange
  'in_review': '#2196f3',  // Blue
  'resolved': '#2e7d32',   // Green
  'dismissed': '#757575',  // Grey
  'in_progress': '#f59e42' // Orange
};

// Styled Components
const ProfileContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  }
}));

const GlassCard = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.8)
    : alpha(theme.palette.background.paper, 0.7),
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  border: `1px solid ${theme.palette.mode === 'dark'
    ? alpha(theme.palette.divider, 0.1)
    : alpha(theme.palette.divider, 0.1)}`,
  boxShadow: theme.palette.mode === 'dark'
    ? `0 4px 30px ${alpha(theme.palette.common.black, 0.3)}`
    : `0 4px 30px ${alpha(theme.palette.common.black, 0.1)}`,
  overflow: 'hidden',
  transition: 'all 0.3s ease',
}));

const ProfileHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2.5),
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(2.5),
  borderRadius: theme.shape.borderRadius * 2,
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.primary.main, 0.08)} 0%,
    ${alpha(theme.palette.primary.main, 0.12)} 50%,
    ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
  backdropFilter: 'blur(12px)',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  boxShadow: `
    0 1px 1px ${alpha(theme.palette.common.black, 0.02)},
    0 2px 2px ${alpha(theme.palette.common.black, 0.02)},
    0 4px 4px ${alpha(theme.palette.common.black, 0.02)},
    0 8px 8px ${alpha(theme.palette.common.black, 0.02)},
    0 16px 16px ${alpha(theme.palette.common.black, 0.02)},
    0 1px 3px ${alpha(theme.palette.primary.main, 0.1)},
    0 4px 6px ${alpha(theme.palette.primary.main, 0.05)},
    inset 0 1px 1px ${alpha(theme.palette.common.white, 0.08)},
    inset 0 -1px 1px ${alpha(theme.palette.common.black, 0.04)}
  `,
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    '& > *:last-child': {
      flex: 1,
      minWidth: 0,
    }
  },

  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  '&::before': {
    background: `radial-gradient(
      1000px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
      ${alpha(theme.palette.primary.main, 0.1)},
      transparent 40%
    )`,
    opacity: 0,
    zIndex: 1,
  },

  '&::after': {
    background: `linear-gradient(90deg,
      transparent 0%,
      ${alpha(theme.palette.primary.main, 0.12)} 50%,
      transparent 100%
    )`,
    transform: 'translateX(-100%)',
    animation: 'shimmer 3s infinite',
  },

  '@keyframes shimmer': {
    '100%': {
      transform: 'translateX(100%)',
    },
  },

  [theme.breakpoints.down('sm')]: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
  },

  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: `
      0 1px 1px ${alpha(theme.palette.common.black, 0.03)},
      0 2px 2px ${alpha(theme.palette.common.black, 0.03)},
      0 4px 4px ${alpha(theme.palette.common.black, 0.03)},
      0 8px 8px ${alpha(theme.palette.common.black, 0.03)},
      0 16px 16px ${alpha(theme.palette.common.black, 0.03)},
      0 1px 3px ${alpha(theme.palette.primary.main, 0.15)},
      0 6px 12px ${alpha(theme.palette.primary.main, 0.1)},
      inset 0 1px 1px ${alpha(theme.palette.common.white, 0.12)},
      inset 0 -1px 1px ${alpha(theme.palette.common.black, 0.05)}
    `,
    '&::before': {
      opacity: 1,
    }
  }
}));

const ProfileAvatar = styled(Avatar)<ProfileAvatarProps>(({ theme }) => ({
  width: 90,
  height: 90,
  fontSize: '2.25rem',
  fontWeight: 600,
  position: 'relative',
  border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  background: theme.palette.background.paper,
  boxShadow: `
    0 0 0 2px ${alpha(theme.palette.background.paper, 0.8)},
    0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)},
    0 0 10px ${alpha(theme.palette.primary.main, 0.1)},
    0 0 20px ${alpha(theme.palette.primary.main, 0.08)},
    0 0 30px ${alpha(theme.palette.primary.main, 0.05)}
  `,
  [theme.breakpoints.down('sm')]: {
    width: 70,
    height: 70,
    fontSize: '1.75rem',
    borderRadius: theme.shape.borderRadius * 2,
    marginTop: theme.spacing(0.5),
  },

  '&::before': {
    content: '""',
    position: 'absolute',
    inset: -4,
    padding: 2,
    borderRadius: '50%',
    background: `linear-gradient(135deg, 
      ${theme.palette.primary.main} 0%, 
      ${theme.palette.secondary.main} 100%)`,
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    animation: 'rotate 4s linear infinite',
  },

  '@keyframes rotate': {
    '0%': {
      transform: 'rotate(0deg)',
    },
    '100%': {
      transform: 'rotate(360deg)',
    },
  },

  '&:hover::before': {
    animationDuration: '2s',
  },

  [theme.breakpoints.down('sm')]: {
    width: 80,
    height: 80,
    fontSize: '2rem',
  }
}));

const StatCard = styled(GlassCard)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  textAlign: 'center',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: `linear-gradient(to right, transparent, ${alpha(theme.palette.primary.main, 0.3)}, transparent)`,
    animation: 'breathe 2s ease-in-out infinite'
  },
  '@keyframes breathe': {
    '0%, 100%': {
      opacity: 0.3,
      transform: 'scaleX(0.95)'
    },
    '50%': {
      opacity: 0.8,
      transform: 'scaleX(1.05)'
    }
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    background: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha(theme.palette.background.paper, 0.8),
    '&::after': {
      opacity: 0.8,
      transform: 'scaleX(1.1)'
    }
  }
}));

const TabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  }
}));

const ModernTabs = styled(Tabs)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.5)
    : alpha(theme.palette.background.paper, 0.8),
  borderRadius: 16,
  padding: theme.spacing(1),
  backdropFilter: 'blur(8px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  '& .MuiTabs-flexContainer': {
    gap: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
      gap: theme.spacing(0.5),
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    }
  },
  '& .MuiTabs-indicator': {
    height: '100%',
    borderRadius: 12,
    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.primary.main, 0.25)})`,
    zIndex: 0,
    [theme.breakpoints.down('sm')]: {
      display: 'none', // Hide indicator on mobile since tabs wrap
    }
  },
  [theme.breakpoints.down('sm')]: {
    borderRadius: 12,
    padding: theme.spacing(0.5),
    '& .MuiTabs-scrollableContainer': {
      overflow: 'visible !important',
    },
    '& .MuiTabs-scroller': {
      overflow: 'visible !important',
    },
  }
}));

const TabItem = styled(Tab)(({ theme }) => ({
  minHeight: 56,
  borderRadius: 12,
  padding: theme.spacing(1.5, 3),
  color: theme.palette.text.secondary,
  fontWeight: 500,
  fontSize: '0.9rem',
  textTransform: 'none',
  zIndex: 1,
  transition: 'all 0.3s ease',
  '&:hover': {
    color: theme.palette.text.primary,
  },
  '&.Mui-selected': {
    color: theme.palette.primary.main,
  },
  '& .tab-wrapper': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  '& .icon-wrapper': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'transparent',
    transition: 'all 0.3s ease',
  },
  '&.Mui-selected .icon-wrapper': {
    background: theme.palette.primary.main,
    '& .MuiSvgIcon-root': {
      color: theme.palette.primary.contrastText,
      transform: 'scale(1)',
    }
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.3rem',
    transition: 'all 0.3s ease',
    color: theme.palette.text.secondary,
  },
  '& .tab-label': {
    fontWeight: 600,
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: 28, // Half of 56px
    padding: theme.spacing(0.5, 1),
    fontSize: '0.75rem',
    flex: '0 0 auto',
    maxWidth: 'none',
    '& .icon-wrapper': {
      display: 'none',
    },
    '& .MuiSvgIcon-root': {
      display: 'none',
    },
    '& .tab-wrapper': {
      gap: 0,
    },
    '& .tab-label': {
      textAlign: 'center',
      fontSize: '0.7rem',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    },
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, 0.15),
      color: theme.palette.primary.main,
      borderRadius: 8,
      '& .tab-label': {
        fontWeight: 600,
      }
    }
  }
}));

const InfoCard = styled(GlassCard)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
  }
}));

const InfoSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}`
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  }
}));

const SectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(3),
  '& .icon-wrapper': {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    [theme.breakpoints.down('sm')]: {
      width: 32,
      height: 32,
      borderRadius: 10,
      '& .MuiSvgIcon-root': {
        fontSize: '1.1rem',
      }
    }
  },
  '& .title-content': {
    flex: 1
  },
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  }
}));

const InfoGrid = styled(Grid)(({ theme }) => ({
  '& .info-item': {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04)
    },
    '& .icon-container': {
      width: 36,
      height: 36,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: alpha(theme.palette.primary.main, 0.08),
      color: theme.palette.primary.main,
      flexShrink: 0,
      [theme.breakpoints.down('sm')]: {
        width: 28,
        height: 28,
        borderRadius: 6,
        '& .MuiSvgIcon-root': {
          fontSize: '1rem',
        }
      }
    },
    '& .info-content': {
      flex: 1
    },
    '& .info-label': {
      fontSize: '0.75rem',
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(0.5),
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.6rem',
        marginBottom: theme.spacing(0.25),
        letterSpacing: '0.3px',
      }
    },
    '& .info-value': {
      color: theme.palette.text.primary,
      fontWeight: 500,
      fontSize: '0.875rem',
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.7rem',
      }
    },
    '& .info-chip': {
      margin: theme.spacing(0.5),
      background: alpha(theme.palette.primary.main, 0.08),
      color: theme.palette.primary.main,
      borderRadius: '16px',
      fontSize: '0.75rem',
      fontWeight: 500
    }
  }
}));

const InfoItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.25),
  borderRadius: 8,
  transition: 'all 0.2s ease',
  marginBottom: theme.spacing(1),
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.05),
  },
  '& .icon-container': {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
    [theme.breakpoints.down('sm')]: {
      width: 28,
      height: 28,
      borderRadius: 6,
      '& .MuiSvgIcon-root': {
        fontSize: '0.9rem',
      }
    }
  },
  '& .info-content': {
    flex: 1,
  },
  '& .info-label': {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '4px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.6rem',
      marginBottom: '2px',
    }
  },
  '& .info-value': {
    color: theme.palette.text.primary,
    fontSize: '0.875rem',
    fontWeight: 400,
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.7rem',
    }
  },
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1),
    padding: theme.spacing(1),
  }
}));

const StatusChip = styled('span')<{ status: string }>(({ theme, status }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 20,
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: 1,
  gap: 6,
  backgroundColor: (() => {
    switch (status) {
      case 'present': return alpha(theme.palette.success.main, 0.1);
      case 'absent': return alpha(theme.palette.error.main, 0.1);
      case 'late': return alpha(theme.palette.warning.main, 0.1);
      case 'leave': return alpha(theme.palette.info.main, 0.1);
      default: return alpha(theme.palette.grey[500], 0.1);
    }
  })(),
  color: (() => {
    switch (status) {
      case 'present': return theme.palette.success.main;
      case 'absent': return theme.palette.error.main;
      case 'late': return theme.palette.warning.main;
      case 'leave': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  })(),
  border: `1px solid ${(() => {
    switch (status) {
      case 'present': return alpha(theme.palette.success.main, 0.2);
      case 'absent': return alpha(theme.palette.error.main, 0.2);
      case 'late': return alpha(theme.palette.warning.main, 0.2);
      case 'leave': return alpha(theme.palette.info.main, 0.2);
      default: return alpha(theme.palette.grey[500], 0.2);
    }
  })()}`,
  '&::before': {
    content: '""',
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  }
}));

const StyledTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& th': {
    padding: theme.spacing(2),
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    textAlign: 'left',
  },
  '& td': {
    padding: theme.spacing(2),
    fontSize: '0.875rem',
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
  },
  '& tr:last-child td': {
    borderBottom: 'none',
  },
  '& tr:hover td': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  }
}));

const AttendanceOverviewCard = styled(GlassCard)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  height: '100%',
  '& .attendance-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
  },
  '& .attendance-chart': {
    position: 'relative',
    width: '180px',
    height: '180px',
    margin: '0 auto',
  },
  '& .attendance-percentage': {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
}));

const AttendanceStatBox = styled(Box)<{ color: string }>(({ theme, color }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  background: alpha(color, 0.1),
  border: `1px solid ${alpha(color, 0.2)}`,
  '& .stat-label': {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: theme.spacing(1),
  },
  '& .stat-value': {
    color: color,
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1,
    marginBottom: theme.spacing(0.5),
  },
  '& .stat-subtext': {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
}));

const AttendanceTable = styled(Box)(({ theme }) => ({
  '& .header': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 2fr',
    padding: theme.spacing(1.5),
    gap: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& > *': {
      color: theme.palette.text.secondary,
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  '& .row': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 2fr',
    padding: theme.spacing(1.5),
    gap: theme.spacing(2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
    '& .date': {
      color: theme.palette.text.primary,
      fontSize: '0.875rem',
    },
    '& .remarks': {
      color: theme.palette.text.secondary,
      fontSize: '0.875rem',
    },
  },
}));

const MonthlyAttendanceCard = styled(GlassCard)(({ theme }) => ({
  height: '100%',
  '& .month-grid': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  },
}));

const MonthCard = styled(GlassCard)(({ theme }) => ({
  height: '100%',
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`
    : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`,
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.15)}`,
    '&::before': {
      transform: 'translateX(0)',
      opacity: 0.1,
    }
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '200%',
    height: '100%',
    background: `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.2)} 50%, transparent 100%)`,
    transform: 'translateX(-100%)',
    transition: 'transform 0.5s ease',
    opacity: 0,
    zIndex: 0,
  }
}));

// Add these styled components near the other styled components
const ReportsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(2),
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  height: '100%',
  minHeight: 300,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: `linear-gradient(to right, transparent, ${alpha(theme.palette.primary.main, 0.3)}, transparent)`,
    animation: 'breathe 2s ease-in-out infinite'
  },
  '@keyframes breathe': {
    '0%, 100%': {
      opacity: 0.3,
      transform: 'scaleX(0.95)'
    },
    '50%': {
      opacity: 0.8,
      transform: 'scaleX(1.05)'
    }
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    background: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha(theme.palette.background.paper, 0.8),
    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}`,
    '&::after': {
      opacity: 0.8,
      transform: 'scaleX(1.1)'
    }
  }
}));

const ReportsHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5, 0),
  marginBottom: theme.spacing(1.5),
  gap: theme.spacing(1.5),
  flexWrap: 'nowrap',
  '& .header-content': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    flex: 1,
    minWidth: 0,
  },
  '& .icon-wrapper': {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    transition: 'all 0.3s ease',
    flexShrink: 0,
    '& svg': {
      fontSize: '1.2rem',
    }
  },
  '& .header-text': {
    minWidth: 0,
    flex: '0 1 auto',
  },
  '& .header-title': {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.2,
    marginBottom: theme.spacing(0.25),
  },
  '& .header-subtitle': {
    fontSize: '0.75rem',
    opacity: 0.7,
    lineHeight: 1.2,
  },
  '& .date-picker-wrapper': {
    flexShrink: 0,
    width: '120px',
    [theme.breakpoints.down('sm')]: {
      width: '100px',
    }
  }
}));

const EmptyReportState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(4),
  height: '100%',
  '& .emoji': {
    fontSize: '3rem',
    animation: 'float 3s ease-in-out infinite'
  },
  '& .message': {
    color: theme.palette.text.secondary,
    textAlign: 'center',
    fontSize: '1rem',
    fontWeight: 500
  },
  '@keyframes float': {
    '0%, 100%': {
      transform: 'translateY(0) rotate(0deg)'
    },
    '50%': {
      transform: 'translateY(-10px) rotate(5deg)'
    }
  }
}));

const ReportsList = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  position: 'relative',

  '& .scroll-container': {
    overflowY: 'auto',
    maxHeight: `${theme.spacing(5 * 8)}`, // Height for 5 items (each item is ~8 spacing units)
    paddingRight: theme.spacing(1),
    marginRight: -theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    scrollbarWidth: 'thin',
    scrollbarColor: `${alpha(theme.palette.primary.main, 0.2)} transparent`,

    '&::-webkit-scrollbar': {
      width: '12px',
      background: 'transparent'
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: alpha(theme.palette.primary.main, 0.2),
      borderRadius: '6px',
      border: `3px solid ${theme.palette.background.paper}`,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.3)
      }
    },
    // Firefox specific styling
    '@supports (-moz-appearance: none)': {
      scrollbarWidth: 'thin',
      scrollbarColor: `${alpha(theme.palette.primary.main, 0.2)} transparent`
    }
  }
}));

const ReportItem = styled(Box)<{ $shadeIndex?: number }>(({ theme, $shadeIndex = 0 }) => {
  // Define light color shades (light pastel colors) - base colors
  const shadeColors = [
    theme.palette.info.main,      // Blue
    theme.palette.success.main,    // Green
    theme.palette.warning.main,    // Yellow/amber
    theme.palette.error.main,      // Red/pink
    theme.palette.primary.main,    // Primary
    theme.palette.secondary.main,  // Secondary
    '#9C27B0',                    // Purple
    '#00BCD4',                    // Cyan
  ];

  const colorIndex = $shadeIndex % shadeColors.length;
  const baseColor = shadeColors[colorIndex];
  const baseShade = alpha(baseColor, 0.08);
  const hoverShade = alpha(baseColor, 0.12); // Slightly brighter but still light

  return {
    padding: theme.spacing(1.5, 2),
    borderRadius: theme.spacing(1),
    background: baseShade,
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,

    '&:hover': {
      background: hoverShade,
      transform: 'translateY(-1px)',
      boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`,

      '& .homework-icon': {
        opacity: 0.9,
        color: theme.palette.text.primary,
      }
    }
  };
});

// Add new styled components for month card elements
const MonthHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5, 3),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: theme.spacing(3),
    right: theme.spacing(3),
    height: '1px',
    background: `linear-gradient(90deg, 
      ${alpha(theme.palette.divider, 0)} 0%, 
      ${alpha(theme.palette.divider, 0.7)} 50%, 
      ${alpha(theme.palette.divider, 0)} 100%
    )`,
  }
}));

const MonthTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}));

const MonthBadge = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.75, 2),
  borderRadius: 20,
  fontSize: '0.75rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  background: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.15),
  }
}));

const StatGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2, 3),
}));

const StatBox = styled(Box)<{ status: 'total' | 'present' | 'late' | 'absence' }>(({ theme, status }) => {
  const getStatusColor = (status: string): {
    light: string;
    main: string;
    dark: string;
    contrastText: string;
  } => {
    switch (status) {
      case 'total': return {
        light: theme.palette.primary.light,
        main: theme.palette.primary.main,
        dark: theme.palette.primary.dark,
        contrastText: theme.palette.primary.contrastText
      };
      case 'present': return {
        light: theme.palette.success.light,
        main: theme.palette.success.main,
        dark: theme.palette.success.dark,
        contrastText: theme.palette.success.contrastText
      };
      case 'late': return {
        light: theme.palette.warning.light,
        main: theme.palette.warning.main,
        dark: theme.palette.warning.dark,
        contrastText: theme.palette.warning.contrastText
      };
      case 'absence': return {
        light: theme.palette.error.light,
        main: theme.palette.error.main,
        dark: theme.palette.error.dark,
        contrastText: theme.palette.error.contrastText
      };
      default: return {
        light: theme.palette.grey[300],
        main: theme.palette.grey[500],
        dark: theme.palette.grey[700],
        contrastText: theme.palette.getContrastText(theme.palette.grey[500])
      };
    }
  };

  const statusColor = getStatusColor(status);

  return {
    padding: theme.spacing(2.5),
    borderRadius: theme.shape.borderRadius,
    background: alpha(statusColor.main, 0.08),
    border: `1px solid ${alpha(statusColor.main, 0.12)}`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    height: '100%',

    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 4px 20px ${alpha(statusColor.main, 0.15)}`,
      background: alpha(statusColor.main, 0.12),
      '& .stat-icon': {
        transform: 'scale(1.1) rotate(10deg)',
        opacity: 0.2,
      }
    },

    '& .stat-icon': {
      position: 'absolute',
      right: -10,
      bottom: -10,
      fontSize: '5rem',
      color: statusColor.main,
      opacity: 0.1,
      transition: 'all 0.3s ease',
      transform: 'rotate(-10deg)',
    },

    '& .stat-header': {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      '& .icon': {
        fontSize: '1.2rem',
        color: statusColor.main,
        background: alpha(statusColor.main, 0.1),
        padding: theme.spacing(0.8),
        borderRadius: '8px',
      }
    },

    '& .stat-value': {
      fontSize: '2.2rem',
      fontWeight: 700,
      color: statusColor.main,
      lineHeight: 1,
    },

    '& .stat-subvalue': {
      fontSize: '0.9rem',
      color: theme.palette.text.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    },

    '& .stat-label': {
      fontSize: '0.85rem',
      fontWeight: 500,
      color: theme.palette.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },

    '& .stat-percentage': {
      fontSize: '0.9rem',
      fontWeight: 600,
      color: statusColor.main,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      marginTop: 'auto',
      background: alpha(statusColor.main, 0.08),
      padding: theme.spacing(0.5, 1),
      borderRadius: '4px',
      width: 'fit-content',
    }
  };
});

const StatValue = styled(Typography)<{ color: string }>(({ theme, color }) => ({
  fontSize: '1.75rem',
  fontWeight: 700,
  color: color,
  marginBottom: theme.spacing(0.5),
  display: 'flex',
  alignItems: 'baseline',
  gap: theme.spacing(0.5),
  '& .percentage': {
    fontSize: '0.875rem',
    fontWeight: 500,
    opacity: 0.8,
  }
}));

const StatLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const ArcProgress = styled(Box)<{ value: number; color: string }>(({ theme, value, color }) => ({
  position: 'relative',
  width: '60px',
  height: '30px',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: `3px solid ${alpha(theme.palette.divider, 0.1)}`,
    borderTopColor: color,
    borderRightColor: color,
    transform: `rotate(${45 + (value * 1.8)}deg)`,
    transition: 'transform 0.5s ease',
    top: 0,
    left: 0,
  }
}));

// Add StatArc component and related styled components
const StatsArcRow = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: theme.spacing(3),
  padding: theme.spacing(2),
  '& > *': {
    minWidth: '180px',
    position: 'relative',
  }
}));

const StatArcWrapper = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  padding: theme.spacing(3),
  textAlign: 'center',
  position: 'relative',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
  },
  '& .stat-percentage': {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '2rem',
    fontWeight: 700,
    color: 'inherit',
    transition: 'transform 0.3s ease',
    textShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.1)}`,
  },
  '& .stat-label': {
    marginTop: theme.spacing(1),
    fontSize: '1rem',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  '& .stat-count': {
    fontSize: '1.1rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
  },
  '& .stat-icon': {
    fontSize: '1.5rem',
    transition: 'transform 0.3s ease',
  }
}));

const StatArcLabel = styled(Box)<{ theme?: Theme }>(({ theme }) => ({
  fontSize: '0.85rem',
  color: theme?.palette.text.secondary,
  fontWeight: 600,
  marginTop: '0.5rem'
}));

const StatArcCount = styled(Box)<{ theme?: Theme }>(({ theme }) => ({
  fontSize: '0.82rem',
  color: theme?.palette.text.primary,
  fontWeight: 500,
  marginTop: '0.25rem'
}));

const StatArc: React.FC<{
  percent: number;
  color: string;
  label: string;
  count: number;
}> = ({ percent, color }) => {
  const [displayPercent, setDisplayPercent] = useState(0);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;
    const duration = 1800;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayPercent(Math.round(progress * percent));
      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayPercent(percent);
      }
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [percent]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', color: color }}>
      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={alpha(color, 0.1)}
          strokeWidth="10"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${displayPercent * 2.83}, 283`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <TabPanel>{children}</TabPanel>}
    </div>
  );
}

const calculateMonthlyStats = (records: AttendanceData[], halfLeavesMap?: Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>): MonthlyStats[] => {
  const monthlyData: { [key: string]: MonthlyStats } = {};

  // Process each record and group by month
  records.forEach(record => {
    const date = new Date(record.date);
    const monthKey = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        halfLeaves: 0
      };
    }

    // Increment total and specific status count
    monthlyData[monthKey].total++;
    monthlyData[monthKey][record.status as keyof Pick<MonthlyStats, 'present' | 'absent' | 'late' | 'leave'>]++;
  });

  // Count half leaves per month
  if (halfLeavesMap) {
    halfLeavesMap.forEach((halfLeave, dateStr) => {
      const date = new Date(dateStr);
      const monthKey = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      if (monthlyData[monthKey]) {
        monthlyData[monthKey].halfLeaves++;
      }
    });
  }

  // Convert to array and sort by date (most recent first)
  return Object.values(monthlyData).sort((a, b) => {
    const [aMonth, aYear] = a.month.split(' ');
    const [bMonth, bYear] = b.month.split(' ');
    const dateA = new Date(`${aMonth} 1, ${aYear}`);
    const dateB = new Date(`${bMonth} 1, ${bYear}`);
    return dateB.getTime() - dateA.getTime();
  });
};

// Update the WeeklyAttendanceData interface
interface WeeklyAttendanceData {
  day: string;
  status: AttendanceData['status'] | null;
  count: number;
  details: {
    present: number;
    absent: number;
    late: number;
    leave: number;
    halfLeave: number;
  };
  percentages: {
    present: number;
    late: number;
    absent: number;
    leave: number;
    halfLeave: number;
  };
}

// Update the getWeeklyAttendance function to analyze all-time day patterns
const getWeeklyAttendance = (
  records: AttendanceData[],
  halfLeavesMap?: Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>
): WeeklyAttendanceData[] => {
  // Create a map for all weekdays (Mon-Sat)
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData: WeeklyAttendanceData[] = weekDays.map(day => ({
    day,
    status: null,
    count: 0,
    details: {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      halfLeave: 0
    },
    percentages: {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      halfLeave: 0
    }
  }));

  // Process each record
  records.forEach(record => {
    const recordDate = new Date(record.date);
    const dayIndex = recordDate.getDay() - 1; // Convert to 0-5 index (Mon-Sat)

    // Only process Mon-Sat (-1 is Sunday, which we skip)
    if (dayIndex >= 0 && dayIndex < 6) {
      weeklyData[dayIndex].count++;

      // Update the details for this day
      if (record.status && weeklyData[dayIndex].details) {
        weeklyData[dayIndex].details[record.status]++;
      }
    }
  });

  // Process half leaves
  if (halfLeavesMap) {
    halfLeavesMap.forEach((halfLeave, dateStr) => {
      const recordDate = new Date(dateStr);
      const dayIndex = recordDate.getDay() - 1;

      if (dayIndex >= 0 && dayIndex < 6) {
        weeklyData[dayIndex].details.halfLeave++;
        // Don't increment count for half leaves as they're already counted in records
      }
    });
  }

  // Calculate percentages and set dominant status for each day
  weeklyData.forEach(day => {
    if (day.count > 0) {
      const totalItems = day.count + day.details.halfLeave;
      day.percentages = {
        present: (day.details.present / totalItems) * 100,
        late: (day.details.late / totalItems) * 100,
        absent: (day.details.absent / totalItems) * 100,
        leave: (day.details.leave / totalItems) * 100,
        halfLeave: (day.details.halfLeave / totalItems) * 100
      };

      // Set the dominant status for the day based on the highest count
      const details = day.details;
      const statusCounts = [
        { status: 'present', count: details.present },
        { status: 'late', count: details.late },
        { status: 'absent', count: details.absent },
        { status: 'leave', count: details.leave },
        { status: 'halfLeave', count: details.halfLeave }
      ];

      const dominantStatus = statusCounts.reduce((prev, current) =>
        current.count > prev.count ? current : prev
      );

      day.status = dominantStatus.count > 0 ?
        dominantStatus.status as AttendanceData['status'] :
        null;
    } else {
      day.percentages = {
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        halfLeave: 0
      };
    }
  });

  return weeklyData;
};

const getAttendancePattern = (
  records: AttendanceData[],
  halfLeavesCount: number = 0
): AttendancePatternStat[] => {
  const total = records.length + halfLeavesCount;
  if (total === 0) return [];

  const onTime = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const leaves = records.filter(r => r.status === 'leave').length;
  const absents = records.filter(r => r.status === 'absent').length;

  return [
    {
      label: 'On Time',
      value: `${Math.round((onTime / total) * 100)}%`,
      count: onTime,
      colorKey: 'success' as const
    },
    {
      label: 'Late Arrivals',
      value: `${Math.round((late / total) * 100)}%`,
      count: late,
      colorKey: 'warning' as const
    },
    {
      label: 'Absents',
      value: `${Math.round((absents / total) * 100)}%`,
      count: absents,
      colorKey: 'error' as const
    },
    {
      label: 'Leaves',
      value: `${Math.round((leaves / total) * 100)}%`,
      count: leaves,
      colorKey: 'info' as const
    },
    {
      label: 'Half Leaves',
      value: `${Math.round((halfLeavesCount / total) * 100)}%`,
      count: halfLeavesCount,
      colorKey: 'secondary' as const
    }
  ];
};

const getYearlyOverview = (
  records: AttendanceData[],
  halfLeavesMap?: Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>
): { startDate: Date; endDate: Date; percentage: number }[] => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const weeks: { startDate: Date; endDate: Date; percentage: number }[] = [];

  // Create weeks from start of year to current date
  let currentWeek = new Date(startOfYear);
  while (currentWeek <= today) {
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= currentWeek && recordDate <= weekEnd;
    });

    // Count half leaves in this week
    let weekHalfLeaves = 0;
    if (halfLeavesMap) {
      halfLeavesMap.forEach((halfLeave, dateStr) => {
        const recordDate = new Date(dateStr);
        if (recordDate >= currentWeek && recordDate <= weekEnd) {
          weekHalfLeaves++;
        }
      });
    }

    const presentCount = weekRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    // Half leaves count as 0.5 attendance
    const totalCount = weekRecords.length + weekHalfLeaves || 0;
    const attendanceCount = presentCount + (weekHalfLeaves * 0.5);

    weeks.push({
      startDate: new Date(currentWeek),
      endDate: new Date(weekEnd),
      percentage: totalCount > 0 ? (attendanceCount / totalCount) : 0
    });

    // Move to next week
    currentWeek = new Date(weekEnd);
    currentWeek.setDate(currentWeek.getDate() + 1);
  }

  return weeks;
};

// Add new styled components for recent attendance
const RecentAttendanceItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  '&:last-child': {
    borderBottom: 'none',
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
  transition: 'background-color 0.2s ease'
}));

const DayLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: theme.spacing(0.5)
}));

const DateLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.primary,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5)
}));

const RecentAttendanceContainer = styled(Box)(({ theme }) => ({
  maxHeight: '400px',
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'thin',
  scrollbarColor: `${alpha(theme.palette.primary.main, 0.2)} transparent`,
  '&::-webkit-scrollbar': {
    width: '8px',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
    borderRadius: '8px',
    margin: theme.spacing(1),
  },
  '&::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.primary.main, 0.2),
    borderRadius: '8px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.3),
      borderRadius: '8px',
      border: '2px solid transparent',
      backgroundClip: 'padding-box',
    }
  },
  '&:hover::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.primary.main, 0.3),
    borderRadius: '8px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
  }
}));

const AttendanceStatsCard = styled(GlassCard)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`
    : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`,
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '200%',
    height: '100%',
    background: `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.1)} 50%, transparent 100%)`,
    transition: 'transform 0.5s ease',
    transform: 'translateX(-100%)',
  },
  '&:hover::before': {
    transform: 'translateX(0)',
  }
}));

const StatsHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: theme.spacing(3),
    right: theme.spacing(3),
    height: '1px',
    background: `linear-gradient(90deg, 
      ${alpha(theme.palette.divider, 0)} 0%, 
      ${alpha(theme.palette.divider, 0.7)} 50%, 
      ${alpha(theme.palette.divider, 0)} 100%
    )`,
  }
}));

const StatsGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(3),
  gap: theme.spacing(3),
  display: 'flex',
  flexWrap: 'wrap',
  '& .MuiGrid-item': {
    flex: '1 1 250px',
    minWidth: 0,
  }
}));

interface ReportCategory {
  id: string;
  name: string;
  count: number;
}

interface Report {
  id: string;
  created_at: string;
  description: string;
  status: ReportStatus;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  action_taken?: string;
  category: {
    id: string;
    name: string;
  };
  updates?: ReportUpdate[];
  reporter?: {
    id: number;
    name: string;
  };
}

// Add new interface for report updates
interface ReportUpdate {
  id: string;
  report_id: string;
  status: ReportStatus;
  comment: string;
  updated_by: string;
  updated_at: string;
  previous_status?: string;
  new_status?: string;
  update_note?: string;
  created_at: string;
  staff?: {
    name: string;
  };
}

// Add new styled components for updates
const UpdatesHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.default, 0.5),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05)
  }
}));

const UpdateTimeline = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '24px',
    top: 0,
    bottom: 0,
    width: '2px',
    background: alpha(theme.palette.primary.main, 0.1),
    zIndex: 0
  }
}));

const UpdateItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  paddingLeft: theme.spacing(6),
  paddingBottom: theme.spacing(3),
  '&:last-child': {
    paddingBottom: 0
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '20px',
    top: '4px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    zIndex: 1
  }
}));

const FormBlocks = styled('div')<{ theme?: Theme }>(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: '24px',
  width: '100%',
  height: '100%',
  background: 'transparent',
  padding: '0 16px',
  '@media (max-width: 900px)': {
    flexDirection: 'column',
    gap: '16px',
    padding: '0 8px'
  }
}));

const CardBlock = styled('div')<{ theme?: Theme }>(({ theme }) => ({
  background: theme?.palette.background.paper,
  borderRadius: '24px',
  boxShadow: theme?.shadows[1],
  padding: '48px 32px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: '280px',
  maxWidth: '340px',
  flex: '0 0 300px',
  position: 'relative',
  border: `1px solid ${theme?.palette.divider}`,
  backdropFilter: 'blur(8px)',

  '@media (max-width: 900px)': {
    width: '100%',
    maxWidth: '100vw',
    minWidth: 0,
    padding: '32px 16px',
    marginBottom: 0,
    borderRadius: '16px'
  }
}));

const FieldsCard = styled('div')<{ theme?: Theme }>(({ theme }) => ({
  background: theme?.palette.background.paper,
  borderRadius: '16px',
  boxShadow: theme?.shadows[1],
  padding: '24px 20px',
  flex: '1 1 0',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  zIndex: 1,
  maxWidth: 'calc(50% - 12px)',
  '@media (max-width: 900px)': {
    width: '100%',
    maxWidth: '100%',
    padding: '16px 12px',
    borderRadius: '12px',
    marginBottom: '24px'
  }
}));

const SectionContainer = styled('div')<{ theme?: Theme }>(({ theme }) => ({
  marginBottom: '24px',
  position: 'relative',
  zIndex: 1,
  '&:last-child': {
    marginBottom: 0
  },
  '& .section-header': {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${theme?.palette.divider}`,
    '& .icon-wrapper': {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: theme?.palette.primary.main,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '12px',
      '& svg': {
        color: '#fff',
        fontSize: '1.2rem'
      },
      '@media (max-width: 600px)': {
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        marginRight: '8px',
        '& svg': {
          fontSize: '1rem'
        }
      }
    },
    '& h6': {
      margin: 0,
      fontSize: '1.1rem',
      fontWeight: 600,
      '@media (max-width: 600px)': {
        fontSize: '0.95rem'
      }
    },
    '@media (max-width: 600px)': {
      marginBottom: '12px',
      paddingBottom: '6px',
    }
  },
  '@media (max-width: 600px)': {
    marginBottom: '16px',
  }
}));

interface ProfileAvatarProps {
  src?: string;
  theme?: Theme;
}

const StyledProfileAvatar = styled('div')<ProfileAvatarProps>(({ theme, src }) => ({
  width: '160px',
  height: '160px',
  borderRadius: '50%',
  background: src ?
    `url(${src}) center/cover no-repeat` :
    theme?.palette.primary.main,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '64px',
  fontWeight: 500,
  boxShadow: theme.shadows[3],
  border: `4px solid ${theme.palette.background.paper}`,
  marginBottom: '24px'
}));

// Add new styled component for info sections
const InfoSectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  '& .icon-wrapper': {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main
  },
  '& .title-text': {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: theme.palette.text.secondary
  }
}));

const CompactInfoGrid = styled(Grid)(({ theme }) => ({
  '& .info-item': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04)
    },
    '& .icon-wrapper': {
      width: 32,
      height: 32,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: alpha(theme.palette.primary.main, 0.08),
      color: theme.palette.primary.main
    },
    '& .info-label': {
      fontSize: '0.75rem',
      color: theme.palette.text.secondary,
      fontWeight: 500,
      minWidth: 120
    },
    '& .info-value': {
      fontSize: '0.875rem',
      color: theme.palette.text.primary,
      fontWeight: 500
    }
  }
}));

// Add new styled components for reports
const ReportCard = styled(GlassCard)(({ theme }) => ({
  height: '100%',
  '& .report-header': {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2)
  },
  '& .report-content': {
    padding: theme.spacing(2)
  },
  '& .report-footer': {
    padding: theme.spacing(2),
    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
}));

const ReportStatusBadge = styled(Box)<{ status: ReportStatus }>(({ theme, status }) => {
  const getStatusColor = (status: ReportStatus): { main: string; light: string; dark: string; contrastText: string } => {
    switch (status) {
      case 'pending': return theme.palette.warning;
      case 'in_review': return theme.palette.info;
      case 'resolved': return theme.palette.success;
      case 'dismissed': return {
        main: theme.palette.grey[500],
        light: theme.palette.grey[300],
        dark: theme.palette.grey[700],
        contrastText: theme.palette.getContrastText(theme.palette.grey[500])
      };
      case 'in_progress': return theme.palette.primary;
      default: return {
        main: theme.palette.grey[500],
        light: theme.palette.grey[300],
        dark: theme.palette.grey[700],
        contrastText: theme.palette.getContrastText(theme.palette.grey[500])
      };
    }
  };

  const statusColor = getStatusColor(status);

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: statusColor.main,
    backgroundColor: alpha(statusColor.main, 0.1),
    border: `1px solid ${alpha(statusColor.main, 0.2)}`,
    gap: theme.spacing(0.5),
    position: 'relative',
    '& .status-icon': {
      fontSize: '1rem'
    },
    ...(status === 'resolved' && {
      '&::before': {
        content: '""',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        boxShadow: `0 0 8px ${alpha(statusColor.main, 0.4)}`,
        animation: 'pulse 2s ease-in-out infinite'
      },
      animation: `${pulseAnimation} 2s ease-in-out infinite`
    })
  };
});

const CategoryChip = styled(Chip)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  fontWeight: 500,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2)
  }
}));

const categoryColors: Record<string, string> = {
  'Homework Incomplete': '#f59e0b',     // Amber
  'Notebook Incomplete': '#10b981',     // Emerald
  'Fighting': '#ef4444',                // Red
  'Misbehavior': '#f43f5e',            // Rose
  'Leaving School Premises': '#8b5cf6', // Violet
  'Dress Code Violation': '#6366f1',    // Indigo
  'Unauthorized Device Usage': '#ec4899',// Pink
  'Cheating': '#dc2626',               // Red
  'School Property Damage': '#9333ea',  // Purple
  'Class Time Management': '#0ea5e9',   // Light Blue
  'Poor Checking': '#f97316',          // Orange
  'Poor Class Management': '#06b6d4',   // Cyan
  'Late to Duty': '#eab308',           // Yellow
  'Other': '#64748b'                   // Slate
};

const getCategoryColor = (categoryName: string) => {
  return categoryColors[categoryName] || '#64748b'; // Default to slate if category not found
};

const calculateStudentScore = (
  attendanceStats: AttendanceStats | null,
  reports: Report[],
  examSummaries: ExamSummary[] = [],
  testResults: TestResult[] = [],
  halfLeavesCount: number = 0
): number => {
  let score = 10; // Start with perfect score

  // Calculate attendance deduction
  if (attendanceStats) {
    const attendancePercentage = (attendanceStats.present / attendanceStats.total) * 100;
    const percentageBelow100 = 100 - attendancePercentage;
    const attendanceDeduction = Math.floor(percentageBelow100 / 2) * 0.1; // -0.1 for every 2%
    score -= attendanceDeduction;
  }

  // Half Leave: deduct 0.05 per occurrence
  score -= halfLeavesCount * 0.05;

  // Calculate reports deduction
  if (reports && reports.length > 0) {
    reports.forEach(report => {
      switch (report.severity.toLowerCase()) {
        case 'low':
        case 'medium':
          score -= 0.2;
          break;
        case 'high':
        case 'urgent':
          score -= 0.5;
          break;
      }
    });
  }

  // Calculate examination deductions
  if (examSummaries && examSummaries.length > 0) {
    examSummaries.forEach(exam => {
      // Skip absent exams (they don't count as failed)
      if (exam.status === 'absent') return;

      // Deduct 0.5 for each failed exam
      if (exam.status === 'fail') {
        score -= 0.5;
      }
      // Deduct 0.2 for each exam below 70% (but not if already failed to avoid double counting)
      else if (exam.percentage < 70) {
        score -= 0.2;
      }
    });
  }

  // Calculate test deductions
  if (testResults && testResults.length > 0) {
    testResults.forEach(test => {
      // Determine if test is failed based on passing_marks from test_records
      // If test_records is joined and has passing_marks, use it; otherwise default to 40%
      let passingMarks = 40; // Default to 40% if not available
      if ((test as any).test_records && (test as any).test_records.passing_marks) {
        // Calculate passing percentage from passing_marks and max_marks
        passingMarks = (test.max_marks > 0)
          ? ((test as any).test_records.passing_marks / test.max_marks) * 100
          : 40;
      }

      // A test is considered failed if percentage < passing percentage
      if (test.percentage < passingMarks) {
        score -= 0.05; // Deduct 0.05 for each failed test
      }
    });
  }

  // Ensure score doesn't go below 0
  return Math.max(0, Math.round(score * 10) / 10);
};

const getScoreColor = (score: number): { light: string; main: string; dark: string } => {
  if (score >= 9) return { light: '#4CAF50', main: '#2E7D32', dark: '#1B5E20' }; // Excellent - Green
  if (score >= 7) return { light: '#03A9F4', main: '#0288D1', dark: '#01579B' }; // Good - Blue
  if (score >= 5) return { light: '#FFC107', main: '#FFA000', dark: '#FF6F00' }; // Average - Amber
  if (score >= 3) return { light: '#FF9800', main: '#F57C00', dark: '#E65100' }; // Below Average - Orange
  return { light: '#F44336', main: '#D32F2F', dark: '#B71C1C' }; // Poor - Red
};

const getScoreLabel = (score: number): string => {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Good';
  if (score >= 5) return 'Average';
  if (score >= 3) return 'Below Average';
  return 'Poor';
};

// --- Dashboard-style Skeleton Loader for StudentProfile ---
const StudentProfileSkeletonContainer = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  padding: 'clamp(8px, 2vw, 24px)',
  boxSizing: 'border-box',
  [theme.breakpoints.down('md')]: {
    padding: 'clamp(6px, 2vw, 12px)',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '8px 10px',
    paddingBottom: '2.5rem',
  },
}));
const SkeletonHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '2.5rem',
  marginBottom: '2.5rem',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '1.2rem',
  },
}));
const SkeletonAvatar = styled('div')(({ theme }) => ({
  width: 90,
  height: 90,
  borderRadius: '50%',
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '50%',
  },
  '@keyframes shimmer': {
    '0%': { left: '-100%' },
    '100%': { left: '100%' },
  },
}));
const SkeletonNameBlock = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.7rem',
});
const SkeletonName = styled('div')(({ theme }) => ({
  width: 180,
  height: 28,
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
  borderRadius: 8,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 8,
  },
}));
const SkeletonStatus = styled('div')(({ theme }) => ({
  width: 90,
  height: 18,
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
  borderRadius: 8,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 8,
  },
}));
const SkeletonSummaryGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 'clamp(0.7rem, 2vw, 1.5rem)',
  marginBottom: 'clamp(1rem, 3vw, 2.2rem)',
  width: '100%',
}));
const SkeletonSummaryCard = styled('div')(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
  borderRadius: 14,
  boxShadow: '0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10)',
  padding: 'clamp(0.8rem, 2vw, 1.2rem)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  minWidth: 0,
  flex: '1 1 0',
  position: 'relative',
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  minHeight: 120,
  marginBottom: 0,
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    zIndex: 2,
    borderRadius: 14,
  },
}));
const SkeletonTabBar = styled('div')(({ theme }) => ({
  width: '100%',
  height: 48,
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
  borderRadius: 12,
  marginBottom: '2rem',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 12,
  },
}));
const SkeletonTabContent = styled('div')(({ theme }) => ({
  width: '100%',
  height: 320,
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f3f4f6',
  borderRadius: 16,
  marginBottom: '2rem',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 16,
  },
}));
const StudentProfileSkeleton: React.FC = () => {
  const theme = useTheme();
  return (
    <ProfileContainer>
      {/* Profile Header Skeleton */}
      <ProfileHeader>
        <Skeleton variant="circular" width={90} height={90} sx={{ flexShrink: 0, [theme.breakpoints.down('sm')]: { width: 70, height: 70 } }} />
        <Stack
          spacing={0.5}
          sx={{
            flex: 1,
            minWidth: 0,
            [theme.breakpoints.down('sm')]: {
              alignItems: 'center',
            }
          }}
        >
          <Box sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1,
            flexWrap: 'wrap',
            width: '100%'
          }}>
            <Skeleton variant="text" width={200} height={36} sx={{ [theme.breakpoints.down('sm')]: { width: 150, height: 24 } }} />
            <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: '100px', [theme.breakpoints.down('sm')]: { width: 80, height: 20 } }} />
          </Box>
          <Box sx={{
            mt: { xs: 0.5, sm: 1 },
            width: '100%',
            textAlign: { xs: 'left', sm: 'left' }
          }}>
            <Skeleton variant="text" width={150} height={24} sx={{ mb: 0.25, [theme.breakpoints.down('sm')]: { width: 120, height: 18 } }} />
            <Skeleton variant="text" width={120} height={20} sx={{ [theme.breakpoints.down('sm')]: { width: 100, height: 16 } }} />
          </Box>
        </Stack>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.8, sm: 1.6 },
            ml: 'auto',
            p: { xs: 0.8, sm: 1.6 },
            borderRadius: 2.4,
            bgcolor: theme => alpha(theme.palette.background.paper, 0.05),
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: theme => alpha(theme.palette.divider, 0.1),
            [theme.breakpoints.down('sm')]: {
              position: 'absolute',
              right: 12,
              bottom: 12,
              p: 1,
            }
          }}
        >
          <Skeleton variant="circular" width={38} height={38} sx={{ [theme.breakpoints.down('sm')]: { width: 32, height: 32 } }} />
          <Box>
            <Skeleton variant="text" width={80} height={16} sx={{ mb: 0.5, [theme.breakpoints.down('sm')]: { width: 60, height: 12 } }} />
            <Skeleton variant="text" width={60} height={20} sx={{ [theme.breakpoints.down('sm')]: { width: 50, height: 16 } }} />
          </Box>
        </Box>
      </ProfileHeader>

      {/* Summary Cards Skeleton */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {/* Attendance Card Skeleton */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{
                  position: 'relative',
                  width: '180px',
                  height: '180px',
                  margin: '0 auto',
                  mb: 3
                }}>
                  <Skeleton variant="circular" width={180} height={180} />
                </Box>
                <Grid container spacing={2}>
                  {[1, 2, 3, 4].map((i) => (
                    <Grid item xs={6} key={i}>
                      <Box sx={{ p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Skeleton variant="circular" width={32} height={32} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width={40} height={24} />
                        <Skeleton variant="text" width={60} height={14} sx={{ mt: 0.5 }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </StatCard>
          </Grid>

          {/* Test Records Summary Card Skeleton */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header Skeleton */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Skeleton variant="text" width={80} height={16} />
                  <Skeleton variant="text" width={50} height={28} />
                </Box>

                {/* Stats Grid Skeleton */}
                <Grid container spacing={0.5} sx={{ mb: 1 }}>
                  {[1, 2, 3].map((i) => (
                    <Grid item xs={4} key={i}>
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                        height: '100%'
                      }}>
                        <Skeleton variant="circular" width={16} height={16} sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width={40} height={18} sx={{ mb: 0.25 }} />
                        <Skeleton variant="text" width={50} height={12} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Subject Summary Skeleton */}
                <Box sx={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  pt: 1.5
                }}>
                  <Skeleton variant="text" width={100} height={14} sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {[1, 2, 3, 4].map((i) => (
                      <Grid item xs={6} key={i}>
                        <Box sx={{
                          p: 1.25,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}>
                          <Skeleton variant="text" width="70%" height={12} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width="50%" height={12} />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            </StatCard>
          </Grid>

          {/* Examinations Summary Card Skeleton */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header Skeleton */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Skeleton variant="text" width={90} height={16} />
                  <Skeleton variant="text" width={50} height={28} />
                </Box>

                {/* Stats Grid Skeleton */}
                <Grid container spacing={1} sx={{ mb: 1.5 }}>
                  {[1, 2, 3].map((i) => (
                    <Grid item xs={4} key={i}>
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                        height: '100%'
                      }}>
                        <Skeleton variant="circular" width={16} height={16} sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width={40} height={18} sx={{ mb: 0.25 }} />
                        <Skeleton variant="text" width={50} height={12} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Exam Summary Skeleton */}
                <Box sx={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  pt: 1.5
                }}>
                  <Skeleton variant="text" width={100} height={14} sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {[1, 2, 3, 4].map((i) => (
                      <Grid item xs={6} key={i}>
                        <Box sx={{
                          p: 1.25,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}>
                          <Skeleton variant="text" width="70%" height={12} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width="50%" height={12} />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            </StatCard>
          </Grid>

          {/* Reports/Homework Diary Card Skeleton */}
          <Grid item xs={12} sm={6} md={3}>
            <ReportsCard>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                pb: 2,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="rectangular" width={40} height={40} sx={{ borderRadius: '12px' }} />
                  <Box>
                    <Skeleton variant="text" width={120} height={24} />
                    <Skeleton variant="text" width={100} height={16} sx={{ mt: 0.5 }} />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
              </Box>
              <Stack spacing={1}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Box key={i} sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: '8px' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton variant="text" width="80%" height={16} sx={{ mb: 0.5 }} />
                      <Skeleton variant="text" width="100%" height={14} />
                    </Box>
                    <Skeleton variant="circular" width={24} height={24} />
                  </Box>
                ))}
              </Stack>
            </ReportsCard>
          </Grid>

        </Grid>
      </Box>

      {/* Tabs Skeleton */}
      <GlassCard>
        <ModernTabs value={0}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TabItem
              key={i}
              disabled
              label={
                <Box className="tab-wrapper">
                  <Box className="icon-wrapper" sx={{ display: { xs: 'none', sm: 'flex' } }}>
                    <Skeleton variant="circular" width={24} height={24} />
                  </Box>
                  <Skeleton variant="text" width={80} height={20} />
                </Box>
              }
            />
          ))}
        </ModernTabs>

        {/* Tab Content Skeleton */}
        <TabPanel>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{
                p: 3,
                borderRadius: 2,
                background: theme => alpha(theme.palette.background.paper, 0.6),
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Skeleton variant="text" width={200} height={28} sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2, borderRadius: 1 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width={100} height={14} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width={150} height={18} />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{
                p: 3,
                borderRadius: 2,
                background: theme => alpha(theme.palette.background.paper, 0.6),
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Skeleton variant="text" width={200} height={28} sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2, borderRadius: 1 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width={100} height={14} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width={150} height={18} />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
      </GlassCard>
    </ProfileContainer>
  );
};
// --- Dashboard-style Skeleton Loader for StudentProfile ---

const ExaminationsSkeleton: React.FC = () => {
  return (
    <Box>
      {/* Summary Cards Skeleton */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <GlassCard>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: '12px' }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="40%" height={32} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="70%" height={20} />
                  </Box>
                </Box>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Examinations List Skeleton */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} key={item}>
              <GlassCard sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="text" width="20%" height={32} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton variant="rounded" width={80} height={24} />
                  <Skeleton variant="rounded" width={80} height={24} />
                  <Skeleton variant="rounded" width={80} height={24} />
                </Box>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

const TestRecordsSkeleton: React.FC = () => {
  return (
    <Box>
      {/* Session Selector Skeleton */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={150} height={32} />
        <Skeleton variant="rounded" width={200} height={40} />
      </Box>

      {/* Test Summary Skeleton */}
      <GlassCard sx={{ p: 3, mb: 3 }}>
        <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={6} sm={3} key={item}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Skeleton variant="text" width="60%" height={40} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="40%" height={20} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </GlassCard>

      {/* Subject-wise Test Records Skeleton */}
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} md={6} key={item}>
            <GlassCard sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Skeleton variant="text" width="50%" height={32} />
                <Skeleton variant="rounded" width={40} height={24} />
              </Box>
              <Box sx={{ mb: 2 }}>
                {[1, 2, 3].map((subItem) => (
                  <Box key={subItem} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <Skeleton variant="text" width="30%" />
                    <Skeleton variant="text" width="20%" />
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="20%" />
              </Box>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const TestRecordsContentSkeleton: React.FC = () => {
  return (
    <Box>
      {/* Test Summary Skeleton */}
      <GlassCard sx={{ p: 3, mb: 3 }}>
        <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={6} sm={3} key={item}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Skeleton variant="text" width="60%" height={40} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="40%" height={20} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </GlassCard>

      {/* Subject-wise Test Records Skeleton */}
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Grid item xs={12} md={6} lg={4} key={item}>
            <GlassCard sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="circular" width={24} height={24} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={60} height={24} />
              </Box>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const AttendanceContentSkeleton: React.FC = () => {
  return (
    <Box>
      {/* Stats Cards Skeleton */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Skeleton variant="rounded" height={200} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rounded" height={200} />
        </Grid>
      </Grid>

      {/* Monthly Attendance Skeleton */}
      <Box sx={{ mb: 2 }}>
        <Skeleton variant="text" width={250} height={32} />
      </Box>
      <Grid container spacing={2}>
        {[1, 2, 3].map((item) => (
          <Grid item xs={12} key={item}>
            <Skeleton variant="rounded" height={100} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export const StudentProfile: React.FC<{ isMyProfile?: boolean }> = ({ isMyProfile = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showToast } = useToast();
  const { setPageHeader } = React.useContext(PageHeaderContext);
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [fineDetails, setFineDetails] = useState<FineDetails | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [fineHistory, setFineHistory] = useState<AttendanceRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [examSummaries, setExamSummaries] = useState<ExamSummary[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSessionData, setTestSessionData] = useState<any[]>([]);
  const [testSubjects, setTestSubjects] = useState<string[]>([]);
  const [testSummaryData, setTestSummaryData] = useState<{
    totalSubjects: number;
    totalTests: number;
    totalObtainedMarks: number;
    totalMaxMarks: number;
    totalPercentage: number;
    subjectSummaries: Array<{
      subject_id: number;
      subject_name: string;
      obtained_marks: number;
      total_marks: number;
      percentage: number;
      test_count: number;
    }>;
  }>({
    totalSubjects: 0,
    totalTests: 0,
    totalObtainedMarks: 0,
    totalMaxMarks: 0,
    totalPercentage: 0,
    subjectSummaries: []
  });
  const [expandedTestCards, setExpandedTestCards] = useState<Set<number>>(new Set());
  const [selectedTestSession, setSelectedTestSession] = useState<number | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedUpdates, setExpandedUpdates] = useState<{ [key: string]: boolean }>({});
  const [expandedExams, setExpandedExams] = useState<{ [key: number]: boolean }>({});
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendanceData[]>([]);
  const [attendancePattern, setAttendancePattern] = useState<AttendancePatternStat[]>([]);
  const [yearlyOverview, setYearlyOverview] = useState<{ startDate: Date; endDate: Date; percentage: number }[]>([]);
  const [reportCategories, setReportCategories] = useState<ReportCategory[]>([]);
  const [homeworkDiaryEntries, setHomeworkDiaryEntries] = useState<HomeworkDiary[]>([]);
  const [selectedHomeworkDate, setSelectedHomeworkDate] = useState<Dayjs | null>(dayjs());
  const [studentScore, setStudentScore] = useState<number>(10);
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [halfLeavesMap, setHalfLeavesMap] = useState<Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>>(new Map());
  const [tabDataLoaded, setTabDataLoaded] = useState<{ [key: number]: boolean }>({});
  const [tabDataLoading, setTabDataLoading] = useState<{ [key: number]: boolean }>({});
  const [selectedAttendanceSession, setSelectedAttendanceSession] = useState<number | null>(null);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [testSessionLoading, setTestSessionLoading] = useState(false);
  const [attendanceSessionLoading, setAttendanceSessionLoading] = useState(false);
  const { startProgress, setProgress, completeProgress } = useProgress();
  const { user } = useAuth();
  const progressRef = useRef({ startProgress, setProgress, completeProgress });
  useEffect(() => {
    progressRef.current = { startProgress, setProgress, completeProgress };
  }, [startProgress, setProgress, completeProgress]);

  // Check if user is logged in as student
  const isStudent = useMemo(() => {
    try {
      const studentSession = localStorage.getItem('studentSession');
      return !!studentSession;
    } catch {
      return false;
    }
  }, []);

  // Get student ID from session if this is "my-profile" route
  const studentIdFromSession = useMemo(() => {
    if (isMyProfile) {
      try {
        const studentSession = localStorage.getItem('studentSession');
        if (studentSession) {
          const parsed = JSON.parse(studentSession);
          return parsed?.id;
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [isMyProfile]);

  // If student tries to access /student/:id, redirect to /my-profile
  useEffect(() => {
    if (isStudent && !isMyProfile && id) {
      // Student is trying to access /student/:id - redirect to /my-profile
      navigate('/my-profile', { replace: true });
      showToastRef.current('Please use "My Profile" to view your profile', 'success');
    }
  }, [isStudent, isMyProfile, id, navigate]);

  const toggleUpdates = (reportId: string) => {
    setExpandedUpdates(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  const toggleExamExpansion = (examId: number) => {
    setExpandedExams(prev => ({
      ...prev,
      [examId]: !prev[examId]
    }));
  };

  // Process test records for session-wise display
  const processTestRecords = useCallback(async (sessionId?: number) => {
    const targetSession = sessionId || selectedTestSession;
    if (!targetSession || !student) return;

    setTestSessionLoading(true);
    try {
      // Use school_id from student object directly
      const schoolId = student.school_id;

      // Get all test results for the selected student and session
      let testResults: any[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('test_results')
          .select(`
            id,
            obtained_marks,
            max_marks,
            percentage,
            grade,
            remarks,
            test_records!inner(
              id,
              name,
              test_date,
              subject_id,
              passing_marks
            )
          `)
          .eq('student_id', student?.id || parseInt(id!))
          .eq('session_id', targetSession)
          .eq('school_id', schoolId)
          .order('id', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          setTestSessionLoading(false);
          return;
        }

        if (data) {
          testResults = [...testResults, ...data];
          if (data.length < pageSize) break;
          page++;
        } else {
          break;
        }
      }

      if (!testResults || testResults.length === 0) {
        setTestSessionData([]);
        setTestSubjects([]);
        setTestSummaryData({
          totalSubjects: 0,
          totalTests: 0,
          totalObtainedMarks: 0,
          totalMaxMarks: 0,
          totalPercentage: 0,
          subjectSummaries: []
        });
        setTestSessionLoading(false);
        return;
      }

      // Extract test records from the joined data (already fetched)
      const testRecords = testResults.map(result => result.test_records).filter(Boolean);

      // Get subject information separately
      const uniqueSubjectIds = new Set(testRecords?.map(record => record.subject_id) || []);
      const subjectIds = Array.from(uniqueSubjectIds);
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds)
        .eq('school_id', schoolId);

      if (subjectsError) throw subjectsError;

      // Create a map of subjects by ID
      const subjectsMap = new Map();
      subjectsData?.forEach(subject => {
        subjectsMap.set(subject.id, subject);
      });

      // Create a map of test results by test record ID
      const resultsMap = new Map();
      testResults.forEach(result => {
        const testRecordId = (result.test_records as any).id;
        resultsMap.set(testRecordId, result);
      });

      // Group by subject and date
      const subjectMap = new Map<string, Map<string, any>>();
      const dateSet = new Set<string>();

      testRecords?.forEach(record => {
        const testDate = record.test_date;
        const subject = subjectsMap.get(record.subject_id);
        const subjectName = subject?.name;
        const result = resultsMap.get(record.id);

        if (!subjectName) return; // Skip if subject not found

        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, new Map());
        }

        subjectMap.get(subjectName)!.set(testDate, result);
        dateSet.add(testDate);
      });

      // Convert to session data
      const sessionData: any[] = [];
      const sortedDates = Array.from(dateSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      subjectMap.forEach((dateMap, subjectName) => {
        const subjectScores: { [subjectName: string]: number | string } = {};
        let totalObtained = 0;
        let totalMax = 0;

        sortedDates.forEach(testDate => {
          const result = dateMap.get(testDate);
          if (result) {
            subjectScores[testDate] = `${result.obtained_marks}/${result.max_marks}`;
            totalObtained += result.obtained_marks;
            totalMax += result.max_marks;
          } else {
            subjectScores[testDate] = '-';
          }
        });

        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const averageGrade = calculateTestGrade(percentage);

        sessionData.push({
          test_date: subjectName, // Using subject name as the identifier
          subject_scores: subjectScores,
          total_marks: totalMax,
          obtained_marks: totalObtained,
          percentage: percentage,
          average_grade: averageGrade
        });
      });

      // Sort by subject name
      sessionData.sort((a, b) => a.test_date.localeCompare(b.test_date));

      // Calculate summary data
      const subjectSummaries: Array<{
        subject_id: number;
        subject_name: string;
        obtained_marks: number;
        total_marks: number;
        percentage: number;
        test_count: number;
      }> = [];

      let totalSubjects = 0;
      let totalTests = 0;
      let totalObtainedMarks = 0;
      let totalMaxMarks = 0;

      subjectMap.forEach((dateMap, subjectName) => {
        const subject = Array.from(subjectsMap.values()).find(s => s.name === subjectName);
        if (subject) {
          let subjectObtainedMarks = 0;
          let subjectTotalMarks = 0;
          let subjectTestCount = 0;

          dateMap.forEach((result) => {
            if (result) {
              subjectObtainedMarks += result.obtained_marks;
              subjectTotalMarks += result.max_marks;
              subjectTestCount++;
            }
          });

          const subjectPercentage = subjectTotalMarks > 0 ? (subjectObtainedMarks / subjectTotalMarks) * 100 : 0;

          subjectSummaries.push({
            subject_id: subject.id,
            subject_name: subjectName,
            obtained_marks: subjectObtainedMarks,
            total_marks: subjectTotalMarks,
            percentage: subjectPercentage,
            test_count: subjectTestCount
          });

          totalSubjects++;
          totalTests += subjectTestCount;
          totalObtainedMarks += subjectObtainedMarks;
          totalMaxMarks += subjectTotalMarks;
        }
      });

      const totalPercentage = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;

      setTestSummaryData({
        totalSubjects,
        totalTests,
        totalObtainedMarks,
        totalMaxMarks,
        totalPercentage,
        subjectSummaries
      });

      setTestSessionData(sessionData);
      setTestSubjects(sortedDates);
      setTestSessionLoading(false);

    } catch (error) {
      setTestSessionLoading(false);
    }
  }, [selectedTestSession, student, id]);

  const calculateTestGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  // Load attendance data for a specific session with recursive fetching
  const loadAttendanceData = useCallback(async (sessionId: number) => {
    if (!student || !sessionId) return;

    const session = attendanceSessions.find(s => s.id === sessionId);
    if (!session) return;

    setAttendanceSessionLoading(true);
    try {
      // Recursively fetch ALL attendance records within session dates
      let allAttendanceData: any[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('id, date, status, remarks, class_id')
          .eq('student_id', student.id)
          .gte('date', session.start_date)
          .lte('date', session.end_date)
          .order('date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data) {
          allAttendanceData = [...allAttendanceData, ...data];
          if (data.length < pageSize) break;
          page++;
        } else {
          break;
        }
      }

      // Fetch half leaves for the session
      let hlMap = new Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>();
      const { data: halfLeavesData } = await supabase
        .from('half_leaves')
        .select('date, leave_type, arrival_time, departure_time')
        .eq('person_type', 'student')
        .eq('person_id', student.id)
        .eq('session_id', sessionId)
        .eq('school_id', student.school_id);

      (halfLeavesData || []).forEach((hl: any) => {
        hlMap.set(hl.date, {
          leave_type: hl.leave_type,
          arrival_time: hl.arrival_time,
          departure_time: hl.departure_time
        });
      });
      setHalfLeavesMap(hlMap);

      // Calculate attendance stats
      if (allAttendanceData) {
        const stats: AttendanceStats = {
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: allAttendanceData.length
        };

        allAttendanceData.forEach((record: AttendanceData) => {
          stats[record.status]++;
        });

        setAttendanceStats(stats);

        // Calculate monthly stats
        const monthlyStatsData = calculateMonthlyStats(allAttendanceData, hlMap);
        setMonthlyStats(monthlyStatsData);

        // Calculate weekly attendance
        const weeklyStats = getWeeklyAttendance(allAttendanceData, hlMap);
        setWeeklyAttendance(weeklyStats);

        // Calculate attendance pattern
        const patternStats = getAttendancePattern(allAttendanceData, hlMap.size);
        setAttendancePattern(patternStats);

        // Calculate yearly overview
        const yearlyStats = getYearlyOverview(allAttendanceData, hlMap);
        setYearlyOverview(yearlyStats);

        // Load fine history
        const fineRecords = allAttendanceData.filter(record =>
          record.status === 'absent' || record.status === 'late'
        );

        const { data: fineData } = await supabase
          .from('fines')
          .select('class_id, absent_fine, late_fine, effective_from')
          .eq('school_id', student.school_id)
          .order('effective_from', { ascending: true });

        const recordsWithFines = fineRecords.map(record => {
          const classIdFromRecord = record.class_id || student.class_id;
          const classFines = fineData?.filter((f: any) => f.class_id === classIdFromRecord) || [];

          let fine = classFines && classFines.length > 0 ? classFines[0] : null;
          for (const f of classFines) {
            if (f.effective_from <= record.date) fine = f;
          }
          let fineAmount = 0;
          if (fine) {
            fineAmount = record.status === 'absent' ? Number(fine.absent_fine) : Number(fine.late_fine);
          }
          return {
            ...record,
            fine_amount: fineAmount
          };
        });

        setFineHistory(recordsWithFines);
      }

      setAttendanceSessionLoading(false);
    } catch (error) {
      setAttendanceSessionLoading(false);
    }
  }, [student, attendanceSessions]);

  // Effect to load attendance when session changes
  useEffect(() => {
    if (selectedAttendanceSession) {
      loadAttendanceData(selectedAttendanceSession);
    }
  }, [selectedAttendanceSession, loadAttendanceData]);


  useEffect(() => {
    if (student && student.name) {
      setPageHeader(student.name);
    } else {
      setPageHeader('Student Profile');
    }
  }, [student, setPageHeader]);

  // Process test records when session changes
  useEffect(() => {
    if (selectedTestSession && student) {
      processTestRecords(selectedTestSession);
    }
  }, [selectedTestSession, student, processTestRecords]);

  useEffect(() => {
    const fetchRenderSettingsData = async () => {
      // Get school_id from student or user
      let schoolId: number | null = null;

      if (user?.school_id) {
        schoolId = user.school_id;
      } else if (student?.session_id) {
        // Try to get school_id from student's session
        try {
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('school_id')
            .eq('id', student.session_id)
            .single();
          if (sessionData) schoolId = sessionData.school_id;
        } catch (e) {
          // Ignore error
        }
      }

      if (schoolId) {
        const settings = await fetchRenderSettings(schoolId);
        setRenderSettings(settings);
      }
    };

    if (student || user) {
      fetchRenderSettingsData();
    }
  }, [student, user]);

  useEffect(() => {
    const fetchStudentData = async () => {
      const minDuration = 800; // Reduced from 1.5s to 0.8s
      const start = Date.now();
      progressRef.current.startProgress(false);
      progressRef.current.setProgress(10);
      try {
        // Fetch student details only (attendance will be loaded per session)
        // Support both ID and roll_number sequence in URL
        progressRef.current.setProgress(20);
        
        // Get school_id from user, student session, or parent session
        let schoolId = user?.school_id;
        if (!schoolId) {
          // Try to get school_id from student session
          try {
            const studentSession = localStorage.getItem('studentSession');
            if (studentSession) {
              const parsed = JSON.parse(studentSession);
              if (parsed?.school_id) {
                schoolId = parsed.school_id;
              }
            }
          } catch (e) {
            // Error parsing session
          }
        }
        if (!schoolId) {
          // Try to get school_id from parent session
          try {
            const parentSession = localStorage.getItem('parentSession');
            if (parentSession) {
              const parsed = JSON.parse(parentSession);
              if (parsed?.school_id) {
                schoolId = parsed.school_id;
              }
            }
          } catch (e) {
            // Error parsing session
          }
        }
        
        if (!schoolId) {
          throw new Error('School ID not found');
        }
        
        // For my-profile route, fetch directly by database ID to avoid ambiguity
        // For parent navigation, also fetch directly by database ID if ID is numeric
        // For regular route, use fetchStudentByIdentifier to handle both ID and roll_number sequence
        let studentData;
        if (isMyProfile && studentIdFromSession) {
          // Fetch directly by database ID for my-profile (no ambiguity)
          const { data: studentById, error: errorById } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentIdFromSession)
            .eq('school_id', schoolId)
            .single();
          
          if (errorById || !studentById) {
            throw new Error('Student not found');
          }
          studentData = studentById;
        } else if (id) {
          // Check if we have a parent session
          const hasParentSession = (() => {
            try {
              const parentSession = localStorage.getItem('parentSession');
              return !!parentSession;
            } catch {
              return false;
            }
          })();
          
          // Check if ID is a slug (non-numeric, lowercase letters/hyphens, not roll_number format)
          // A slug is typically lowercase letters and hyphens (e.g., "john-doe" or "john")
          const idStr = String(id);
          const isSlug = !isNaN(Number(idStr)) === false && 
                        !/^[Ss]\d+-\d+$/.test(idStr) && 
                        /^[a-z0-9-]+$/.test(idStr.toLowerCase());
          const isNumericId = !isNaN(Number(idStr)) && !/^[Ss]\d+-\d+$/.test(idStr);
          
          // If it's a slug (from parent navigation), fetch by slug
          if (isSlug && hasParentSession) {
            // Get linked student IDs from parent session for disambiguation
            let linkedStudentIds: number[] | undefined;
            try {
              const parentSession = localStorage.getItem('parentSession');
              if (parentSession) {
                const parsed = JSON.parse(parentSession);
                if (parsed?.id) {
                  // Fetch linked student IDs from family_members
                  const { data: familyMembers } = await supabase
                    .from('family_members')
                    .select('student_id')
                    .eq('family_id', parsed.id);
                  
                  if (familyMembers) {
                    linkedStudentIds = familyMembers.map((m: any) => m.student_id).filter(Boolean);
                  }
                }
              }
            } catch (e) {
              // Error getting linked students, continue without them
            }
            
            studentData = await fetchStudentBySlug(supabase, String(id), schoolId, linkedStudentIds);
          } else if (hasParentSession && isNumericId) {
            // If parent session and numeric ID, fetch directly by database ID to avoid roll_number ambiguity
            const { data: studentById, error: errorById } = await supabase
              .from('students')
              .select('*')
              .eq('id', parseInt(String(id)))
              .eq('school_id', schoolId)
              .single();
            
            if (!errorById && studentById) {
              studentData = studentById;
            } else {
              // Fallback to fetchStudentByIdentifier if direct lookup fails
              studentData = await fetchStudentByIdentifier(supabase, id, schoolId);
            }
          } else {
            // Use fetchStudentByIdentifier for regular route (handles both ID and roll_number sequence)
            studentData = await fetchStudentByIdentifier(supabase, id, schoolId);
          }
        
        if (!studentData) {
          throw new Error('Student not found');
          }
        } else {
          throw new Error('Student ID not found');
        }

        // Fetch sessions for attendance tab
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, name, start_date, end_date, is_active')
          .eq('school_id', studentData.school_id)
          .order('start_date', { ascending: false })
          .range(0, 99999);

        if (sessionsData && sessionsData.length > 0) {
          setAttendanceSessions(sessionsData);
          const activeSession = sessionsData.find((s: any) => s.is_active);
          const initialSessionId = activeSession ? activeSession.id : sessionsData[0].id;
          setSelectedAttendanceSession(initialSessionId);
        }

        // Get current class from student_class_history
        progressRef.current.setProgress(25);
        const { data: historyData } = await supabase
          .from('student_class_history')
          .select(`
            id,
            new_class_id,
            new_section_id,
            new_classes:new_class_id(id, name),
            new_sections:new_section_id(id, name)
          `)
          .eq('student_id', studentData.id)
          .eq('school_id', studentData.school_id)
          .order('id', { ascending: true });

        // Get the latest record (current class)
        let currentClass = null;
        let currentSection = null;
        let currentClassObj = null;
        let currentSectionObj = null;

        if (historyData && historyData.length > 0) {
          const lastRecord = historyData[historyData.length - 1];
          currentClass = lastRecord.new_class_id || studentData.class_id;
          currentSection = lastRecord.new_section_id !== null ? lastRecord.new_section_id : (studentData.section_id !== null ? studentData.section_id : null);

          // Handle class object (can be single object or array from Supabase join)
          const classObj = lastRecord.new_classes;
          if (classObj) {
            currentClassObj = Array.isArray(classObj) ? classObj[0] : classObj;
          }

          // Handle section object (can be single object or array from Supabase join)
          const sectionObj = lastRecord.new_sections;
          if (sectionObj) {
            currentSectionObj = Array.isArray(sectionObj) ? sectionObj[0] : sectionObj;
          }
        } else {
          // Fallback to students table if no history
          currentClass = studentData.class_id;
          currentSection = studentData.section_id;
          // Fetch class and section names from their tables
          if (currentClass) {
            const { data: classData } = await supabase
              .from('classes')
              .select('id, name')
              .eq('id', currentClass)
              .single();
            currentClassObj = classData;
          }
          if (currentSection) {
            const { data: sectionData } = await supabase
              .from('sections')
              .select('id, name')
              .eq('id', currentSection)
              .single();
            currentSectionObj = sectionData;
          }
        }

        // Merge current class information into student data
        // Preserve all fields including roll_number
        studentData = {
          ...studentData,
          class_id: currentClass,
          section_id: currentSection,
          class: currentClassObj && currentClassObj.name ? { name: currentClassObj.name } : null,
          section: currentSectionObj && currentSectionObj.name ? { name: currentSectionObj.name } : null,
          // Ensure roll_number is preserved
          roll_number: studentData.roll_number || null
        } as typeof studentData;

        setStudent(studentData);

        // Load minimal data for summary cards (counts only)
        progressRef.current.setProgress(50);
        const studentId = studentData.id;
        // Use studentData.school_id if available, otherwise use the schoolId we already have
        if (studentData.school_id) {
          schoolId = studentData.school_id;
        }

        // Load reports count for summary cards
        try {
          const reportsCountResult = await supabase
            .from('reports')
            .select('id, status, created_at, severity, category:report_categories(id, name), reporter:staff!reports_reported_by_fkey(id, name)')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

          if (!reportsCountResult.error && reportsCountResult.data) {
            // Set reports data for summary cards (minimal data for counts)
            setReports(reportsCountResult.data.map((r: any) => ({
              id: r.id.toString(),
              created_at: r.created_at || '',
              description: '',
              status: r.status,
              severity: (r.severity || 'low') as 'low' | 'medium' | 'high' | 'urgent',
              category: r.category,
              reporter: r.reporter
            })));

            // Calculate report categories for summary card
            const categoryMap = new Map<string, ReportCategory>();
            reportsCountResult.data.forEach((report: any) => {
              if (report.category) {
                const existing = categoryMap.get(report.category.id);
                if (existing) {
                  existing.count++;
                } else {
                  categoryMap.set(report.category.id, {
                    id: report.category.id,
                    name: report.category.name,
                    count: 1
                  });
                }
              }
            });
            setReportCategories(Array.from(categoryMap.values()));
          }
        } catch (error) {
        }

        // Load exam summaries count for summary cards
        try {
          // Try to load from examination_summaries table first (same as tab loading)
          const { data: examinationSummaries } = await supabase
            .from('examination_summaries')
            .select(`
              examination_id,
              total_marks,
              obtained_marks,
              percentage,
              grade,
              status,
              examinations!inner(
                id,
                name,
                exam_type,
                status
              )
            `)
            .eq('student_id', studentId)
            .eq('school_id', schoolId)
            .order('examination_id', { ascending: false });

          let filteredSummaries = examinationSummaries || [];
          if (isStudent) {
            filteredSummaries = filteredSummaries.filter(summary => {
              const examination = Array.isArray(summary.examinations) ? summary.examinations[0] : summary.examinations;
              return examination?.status === 'archived';
            });
          } else {
            filteredSummaries = filteredSummaries.filter(summary => {
              const examination = Array.isArray(summary.examinations) ? summary.examinations[0] : summary.examinations;
              return examination?.status === 'archived' || examination?.status === 'published';
            });
          }

          if (filteredSummaries && filteredSummaries.length > 0) {
            // Create minimal exam summaries from examination_summaries
            const summaries = filteredSummaries.map(summary => {
              const examination = Array.isArray(summary.examinations) ? summary.examinations[0] : summary.examinations;
              return {
                exam_id: summary.examination_id,
                exam_name: examination?.name || `Exam ${summary.examination_id}`,
                exam_type: examination?.exam_type || 'Examination',
                total_subjects: 0, // Will be populated when tab is opened
                total_marks: summary.total_marks || 0,
                obtained_marks: summary.obtained_marks || 0,
                percentage: summary.percentage || 0,
                grade: summary.grade,
                status: (summary.status as 'pass' | 'fail') || (summary.percentage >= 40 ? 'pass' as const : 'fail' as const),
                subjects: []
              } as ExamSummary;
            });

            setExamSummaries(summaries);
          } else {
            // Fallback: Load from exam_results and calculate
            const examResultsData = await examinationService.getExamResults({
              student_id: studentId
            }, schoolId);

            if (examResultsData && examResultsData.length > 0) {
              // Get unique exam IDs
              const examIds = Array.from(new Set(examResultsData.map((result: any) => result.exam_id)));

              // Fetch exam details with status filtering
              const { data: examsData } = await supabase
                .from('examinations')
                .select('id, name, exam_type, status')
                .in('id', examIds)
                .eq('school_id', schoolId);

              // Filter exams by status
              let filteredExams = examsData || [];
              if (isStudent) {
                filteredExams = filteredExams.filter(exam => exam.status === 'archived');
              } else {
                filteredExams = filteredExams.filter(exam => exam.status === 'archived' || exam.status === 'published');
              }

              if (filteredExams.length > 0) {
                const filteredExamIds = new Set(filteredExams.map(e => e.id));
                const summaries = examIds
                  .filter(examId => filteredExamIds.has(examId))
                  .map(examId => {
                    const exam = filteredExams.find(e => e.id === examId);
                    const examResults = examResultsData.filter((r: any) => r.exam_id === examId);
                    const totalMarks = examResults.reduce((sum: number, r: any) => sum + (r.max_marks || 0), 0);
                    const obtainedMarks = examResults.reduce((sum: number, r: any) => sum + (r.obtained_marks || 0), 0);
                    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

                    return {
                      exam_id: examId,
                      exam_name: exam?.name || 'Unknown',
                      exam_type: exam?.exam_type || 'unknown',
                      total_subjects: examResults.length,
                      total_marks: totalMarks,
                      obtained_marks: obtainedMarks,
                      percentage: percentage,
                      status: percentage >= 40 ? 'pass' as const : 'fail' as const,
                      subjects: []
                    } as ExamSummary;
                  });

                setExamSummaries(summaries);
              } else {
                setExamSummaries([]);
              }
            } else {
              setExamSummaries([]);
            }
          }
        } catch (error) {
          setExamSummaries([]);
        }

        // Load test results count for summary cards
        try {
          // Fetch test results with test_records join (matching TestRecordMasterSheet pattern)
          const { data: testResultsData } = await supabase
            .from('test_results')
            .select(`
              id, 
              test_id, 
              student_id, 
              session_id, 
              obtained_marks, 
              max_marks, 
              percentage, 
              grade, 
              school_id, 
              created_at, 
              updated_at,
              test_records!inner(
                id,
                name,
                test_date,
                subject_id,
                passing_marks
              )
            `)
            .eq('student_id', studentId)
            .eq('school_id', schoolId);

          if (testResultsData && testResultsData.length > 0) {
            // Get unique subject IDs from test_records
            const subjectIds = Array.from(new Set(
              testResultsData
                .map((r: any) => r.test_records?.subject_id)
                .filter((id: any) => id != null)
            ));

            // Fetch subjects separately (matching TestRecordMasterSheet pattern)
            let subjectsMap = new Map();
            if (subjectIds.length > 0) {
              const { data: subjectsData } = await supabase
                .from('subjects')
                .select('id, name')
                .in('id', subjectIds)
                .eq('school_id', schoolId);

              if (subjectsData) {
                subjectsData.forEach(subject => {
                  subjectsMap.set(subject.id, subject);
                });
              }
            }

            // Set minimal test results for count (with proper structure)
            setTestResults(testResultsData.map((r: any) => ({
              id: r.id,
              test_id: r.test_id || 0,
              student_id: r.student_id,
              session_id: r.session_id || 0,
              obtained_marks: r.obtained_marks || 0,
              max_marks: r.max_marks || 0,
              percentage: r.percentage || 0,
              grade: r.grade || '',
              school_id: r.school_id,
              created_at: r.created_at || new Date().toISOString(),
              updated_at: r.updated_at || new Date().toISOString(),
              // Add test_records for compatibility with score calculation
              test_records: r.test_records || { passing_marks: 40 } as any
            })));

            // Calculate test summary data
            const subjectMap = new Map<number, { name: string; obtained: number; total: number; count: number }>();
            let totalObtained = 0;
            let totalMax = 0;

            testResultsData.forEach((result: any) => {
              const subjectId = result.test_records?.subject_id;
              const subject = subjectsMap.get(subjectId);
              const subjectName = subject?.name || 'Unknown';
              const obtained = result.obtained_marks || 0;
              const max = result.max_marks || 0;

              totalObtained += obtained;
              totalMax += max;

              if (subjectId) {
                const existing = subjectMap.get(subjectId);
                if (existing) {
                  existing.obtained += obtained;
                  existing.total += max;
                  existing.count += 1;
                } else {
                  subjectMap.set(subjectId, {
                    name: subjectName,
                    obtained,
                    total: max,
                    count: 1
                  });
                }
              }
            });

            const subjectSummaries = Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
              subject_id: subjectId,
              subject_name: data.name,
              obtained_marks: data.obtained,
              total_marks: data.total,
              percentage: data.total > 0 ? (data.obtained / data.total) * 100 : 0,
              test_count: data.count
            }));

            setTestSummaryData({
              totalSubjects: subjectMap.size,
              totalTests: testResultsData.length,
              totalObtainedMarks: totalObtained,
              totalMaxMarks: totalMax,
              totalPercentage: totalMax > 0 ? (totalObtained / totalMax) * 100 : 0,
              subjectSummaries
            });
          } else {
            setTestResults([]);
            setTestSummaryData({
              totalSubjects: 0,
              totalTests: 0,
              totalObtainedMarks: 0,
              totalMaxMarks: 0,
              totalPercentage: 0,
              subjectSummaries: []
            });
          }
        } catch (error) {
          setTestResults([]);
          setTestSummaryData({
            totalSubjects: 0,
            totalTests: 0,
            totalObtainedMarks: 0,
            totalMaxMarks: 0,
            totalPercentage: 0,
            subjectSummaries: []
          });
        }

        progressRef.current.setProgress(100);
      } catch (error: any) {
        showToastRef.current('Failed to load student data', 'error');
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => {
            setLoading(false);
            progressRef.current.completeProgress();
          }, minDuration - elapsed);
        } else {
          setLoading(false);
          progressRef.current.completeProgress();
        }
      }
    };

    // For my-profile route, we need studentIdFromSession; for regular route, we need id
    if (isMyProfile) {
      if (studentIdFromSession) {
      fetchStudentData();
      } else {
        // If studentIdFromSession is not available yet, set loading to false and show error
        setLoading(false);
        showToastRef.current('Student session not found. Please log in again.', 'error');
        progressRef.current.completeProgress();
      }
    } else if (id) {
      fetchStudentData();
    } else {
      // No id and not my-profile route
      setLoading(false);
      progressRef.current.completeProgress();
    }
  }, [id, isMyProfile, studentIdFromSession]);

  // Fetch homework diary entries when date changes (for students only)
  useEffect(() => {
    const fetchHomeworkDiary = async () => {
      if (!isStudent || !student || !selectedHomeworkDate) return;

      try {
        // Get school_id from student data if not directly available
        let schoolId = (student as any).school_id;
        if (!schoolId && id) {
          const { data: studentData } = await supabase
            .from('students')
            .select('school_id')
            .eq('id', id)
            .single();
          schoolId = studentData?.school_id;
        }

        if (!schoolId) {
          return;
        }

        const selectedDateStr = selectedHomeworkDate.format('YYYY-MM-DD');
        const homeworkResponse = await homeworkDiaryService.getHomeworkDiary(
          {
            class_id: student.class_id,
            section_id: student.section_id,
            homework_date: selectedDateStr
          },
          1,
          50,
          schoolId
        );

        setHomeworkDiaryEntries(homeworkResponse.data || []);
      } catch (homeworkError) {
        setHomeworkDiaryEntries([]);
      }
    };

    fetchHomeworkDiary();
  }, [isStudent, student, selectedHomeworkDate, id]);

  // Calculate and update student score when attendance stats, reports, exam summaries, test results, or half leaves change
  useEffect(() => {
    const score = calculateStudentScore(attendanceStats, reports, examSummaries, testResults, halfLeavesMap.size);
    setStudentScore(score);
  }, [attendanceStats, reports, examSummaries, testResults, halfLeavesMap]);

  // Compute visible tabs and map indices based on render settings
  // Map tab keys to their original indices
  const tabIndexMap: Record<string, number> = {
    'profile_tab': 0,
    'reports_tab': 1,
    'examinations_tab': 2,
    'test_records_tab': 3,
    'attendance_tab': 4,
    'fines_tab': 5,
  };

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ originalIndex: number; label: string; icon: React.ReactNode }> = [];

    STUDENT_PROFILE_TABS.forEach((tabConfig) => {
      // Check if tab should be visible based on render settings
      const isVisible = isStudentTabVisible(renderSettings, tabConfig.key);

      // Fines tab is only for non-students
      if (tabConfig.key === 'fines_tab' && isStudent) {
        return; // Skip fines tab for students
      }

      if (isVisible) {
        const originalIndex = tabIndexMap[tabConfig.key];
        if (originalIndex !== undefined) {
          tabs.push({
            originalIndex,
            label: tabConfig.label.replace(' Tab', ''), // Remove "Tab" suffix for display
            icon: (
              originalIndex === 0 ? <Person /> :
                originalIndex === 1 ? <Assignment /> :
                  originalIndex === 2 ? <Quiz /> :
                    originalIndex === 3 ? <Assessment /> :
                      originalIndex === 4 ? <AttachMoney /> :
                        originalIndex === 5 ? <CalendarToday /> :
                          <Person />
            )
          });
        }
      }
    });

    return tabs;
  }, [renderSettings, isStudent]);

  // Map activeTab (visible index) to original tab index
  const getOriginalTabIndex = useCallback((visibleIndex: number): number => {
    return visibleTabs[visibleIndex]?.originalIndex ?? 0;
  }, [visibleTabs]);

  // Map original tab index to visible index
  const getVisibleTabIndex = useCallback((originalIndex: number): number => {
    return visibleTabs.findIndex(tab => tab.originalIndex === originalIndex);
  }, [visibleTabs]);

  // Adjust activeTab when tabs change
  useEffect(() => {
    if (visibleTabs.length > 0) {
      const currentVisibleIndex = getVisibleTabIndex(activeTab);
      if (currentVisibleIndex === -1 || currentVisibleIndex >= visibleTabs.length) {
        // Current tab is hidden or invalid, switch to first visible tab
        setActiveTab(visibleTabs[0].originalIndex);
      }
    }
  }, [visibleTabs, getVisibleTabIndex, activeTab]);

  // Lazy load tab-specific data when tab is accessed
  useEffect(() => {
    const loadTabData = async (tabIndex: number) => {
      if (tabDataLoaded[tabIndex] || tabDataLoading[tabIndex] || !student || !id) return;

      setTabDataLoading(prev => ({ ...prev, [tabIndex]: true }));

      try {
        const studentId = typeof student.id === 'string' ? parseInt(student.id, 10) : student.id;
        const schoolId = (student as any).school_id;

        switch (tabIndex) {
          case 1: // Reports tab
            const [reportsResult] = await Promise.all([
              supabase
                .from('reports')
                .select(`
            *,
            category:report_categories(id, name),
            reporter:staff!reports_reported_by_fkey(
              id,
              name
            ),
            updates:reports_updates(
              id,
              report_id,
              previous_status,
              new_status,
              update_note,
              created_at,
              staff:staff!reports_updates_updated_by_fkey(
                id,
                name,
                role
              )
            )
          `)
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })
            ]);

            if (reportsResult.error) throw reportsResult.error;
            const reportsData = reportsResult.data;

            const reportsWithSortedUpdates = reportsData?.map(report => ({
              ...report,
              updates: report.updates?.sort((a: ReportUpdate, b: ReportUpdate) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
            })) || [];

            setReports(reportsWithSortedUpdates);

            const categoryMap = new Map<string, ReportCategory>();
            reportsData?.forEach(report => {
              if (report.category) {
                const existing = categoryMap.get(report.category.id);
                if (existing) {
                  existing.count++;
                } else {
                  categoryMap.set(report.category.id, {
                    id: report.category.id,
                    name: report.category.name,
                    count: 1
                  });
                }
              }
            });
            setReportCategories(Array.from(categoryMap.values()));
            break;

          case 2: // Examinations tab
            try {
              const examResultsData = await examinationService.getExamResults({
                student_id: studentId
              });

              if (examResultsData && examResultsData.length > 0) {
                const enrichedExamResults = await Promise.all(
                  examResultsData.map(async (result) => {
                    try {
                      const { data: studentData } = await supabase
                        .from('students')
                        .select('name, father_name, picture_url')
                        .eq('id', result.student_id)
                        .eq('school_id', result.school_id)
                        .single();

                      return {
                        ...result,
                        student: studentData ? {
                          name: studentData.name,
                          father_name: studentData.father_name,
                          picture_url: studentData.picture_url
                        } : undefined
                      } as ExamResult;
                    } catch (error) {
                      return result;
                    }
                  })
                );

                setExamResults(enrichedExamResults);

                const { data: examinationSummaries } = await supabase
                  .from('examination_summaries')
                  .select(`
                  examination_id,
                  total_marks,
                  obtained_marks,
                  percentage,
                  grade,
                  position,
                  rank_in_class,
                  rank_in_section,
                  status,
                  total_strength,
                  examinations!inner(
                    id,
                    name,
                    exam_type,
                    status
                  )
                `)
                  .eq('student_id', studentId)
                  .eq('school_id', schoolId)
                  .order('examination_id', { ascending: false });

                let filteredSummaries = examinationSummaries || [];
                if (isStudent) {
                  filteredSummaries = filteredSummaries.filter(summary => {
                    const examination = Array.isArray(summary.examinations) ? summary.examinations[0] : summary.examinations;
                    return examination?.status === 'archived';
                  });
                } else {
                  filteredSummaries = filteredSummaries.filter(summary => {
                    const examination = Array.isArray(summary.examinations) ? summary.examinations[0] : summary.examinations;
                    return examination?.status === 'archived' || examination?.status === 'published';
                  });
                }

                if (filteredSummaries && filteredSummaries.length > 0) {
                  const examSummariesData = await Promise.all(
                    filteredSummaries.map(async (summary) => {
                      const { data: subjectResults } = await supabase
                        .from('exam_results')
                        .select(`
                        *,
                        subject:subjects!inner(
                          id,
                          name
                        )
                      `)
                        .eq('exam_id', summary.examination_id)
                        .eq('student_id', studentId)
                        .eq('school_id', schoolId);

                      const examination = Array.isArray(summary.examinations) ? summary.examinations[0] : summary.examinations;
                      return {
                        exam_id: summary.examination_id,
                        exam_name: examination?.name || `Exam ${summary.examination_id}`,
                        exam_type: examination?.exam_type || 'Examination',
                        total_subjects: subjectResults?.length || 0,
                        total_marks: summary.total_marks,
                        obtained_marks: summary.obtained_marks,
                        percentage: summary.percentage,
                        grade: summary.grade,
                        status: summary.status as 'pass' | 'fail',
                        position: summary.position,
                        rank_in_class: summary.rank_in_class,
                        rank_in_section: summary.rank_in_section,
                        total_strength: summary.total_strength,
                        subjects: subjectResults || []
                      } as ExamSummary;
                    })
                  );

                  setExamSummaries(examSummariesData);
                } else {
                  // Fallback calculation
                  const examIds = Array.from(new Set(enrichedExamResults.map(result => result.exam_id)));
                  const examDetails = new Map();

                  for (const examId of examIds) {
                    try {
                      const exam = await examinationService.getExaminationById(examId);
                      if (exam) {
                        if (isStudent) {
                          if (exam.status === 'archived') examDetails.set(examId, exam);
                        } else {
                          if (exam.status === 'archived' || exam.status === 'published') examDetails.set(examId, exam);
                        }
                      }
                    } catch (error) {
                    }
                  }

                  const examMap = new Map<number, ExamSummary>();
                  enrichedExamResults.forEach(result => {
                    if (!examDetails.has(result.exam_id)) return;

                    if (!examMap.has(result.exam_id)) {
                      const exam = examDetails.get(result.exam_id);
                      examMap.set(result.exam_id, {
                        exam_id: result.exam_id,
                        exam_name: exam?.name || `Exam ${result.exam_id}`,
                        exam_type: exam?.exam_type || 'Examination',
                        total_subjects: 0,
                        total_marks: 0,
                        obtained_marks: 0,
                        percentage: 0,
                        status: 'pass',
                        subjects: []
                      });
                    }

                    const exam = examMap.get(result.exam_id)!;
                    exam.subjects.push(result);
                    exam.total_subjects++;
                    exam.total_marks += result.max_marks;
                    exam.obtained_marks += result.obtained_marks;
                  });

                  examMap.forEach(exam => {
                    exam.percentage = exam.total_marks > 0 ? (exam.obtained_marks / exam.total_marks) * 100 : 0;
                    exam.status = exam.percentage >= 33 ? 'pass' : 'fail';
                  });

                  setExamSummaries(Array.from(examMap.values()));
                }
              } else {
                setExamSummaries([]);
              }
            } catch (examError) {
              setExamSummaries([]);
            }
            break;

          case 3: // Test Records tab
            const fetchAllSessions = async () => {
              let allData: any[] = [];
              let page = 0;
              while (true) {
                const { data, error } = await supabase
                  .from('sessions')
                  .select('id, name, start_date, end_date, is_active')
                  .eq('school_id', schoolId)
                  .order('start_date', { ascending: false })
                  .range(page * 1000, (page + 1) * 1000 - 1);
                if (error) throw error;
                if (!data || data.length === 0) break;
                allData.push(...data);
                if (data.length < 1000) break;
                page++;
              }
              return allData;
            };

            const fetchAllTestResults = async () => {
              let allData: any[] = [];
              let page = 0;
              while (true) {
                const { data, error } = await supabase
                  .from('test_results')
                  .select(`
                    *,
                    test_records!inner(
                      passing_marks
                    )
                  `)
                  .eq('student_id', studentId)
                  .eq('school_id', schoolId)
                  .order('created_at', { ascending: false })
                  .range(page * 1000, (page + 1) * 1000 - 1);
                if (error) throw error;
                if (!data || data.length === 0) break;
                allData.push(...data);
                if (data.length < 1000) break;
                page++;
              }
              return allData;
            };

            const [sessionsData, testResultsData] = await Promise.all([
              fetchAllSessions(),
              fetchAllTestResults()
            ]);

            if (sessionsData && sessionsData.length > 0) {
              setSessions(sessionsData);
              const activeSession = sessionsData.find((s: any) => s.is_active);
              const targetSessionId = activeSession ? activeSession.id : sessionsData[0].id;
              setSelectedTestSession(targetSessionId);

              // Pre-load session data to avoid "No Records" flash
              await processTestRecords(targetSessionId);
            }

            if (testResultsData) {
              setTestResults(testResultsData);
            }
            break;

          case 5: // Fines tab
            // Fine history is already loaded, just need payment data
            const [paymentDataResult] = await Promise.all([
              supabase
                .from('fine_payments')
                .select('*')
                .eq('student_id', studentId)
                .order('payment_date', { ascending: false })
            ]);

            if (paymentDataResult.error) throw paymentDataResult.error;
            const paymentData = paymentDataResult.data;

            const totalPaid = paymentData?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
            const totalRemission = paymentData?.reduce((sum, payment) => sum + Number(payment.remission || 0), 0) || 0;

            setFineDetails({
              payments: paymentData || [],
              totalPaid,
              totalRemission
            });
            break;
        }

        setTabDataLoaded(prev => ({ ...prev, [tabIndex]: true }));
      } catch (error: any) {
        showToast(`Failed to load tab data`, 'error');
      } finally {
        setTabDataLoading(prev => ({ ...prev, [tabIndex]: false }));
      }
    };

    const originalTabIndex = getOriginalTabIndex(activeTab);
    if (originalTabIndex !== 0 && originalTabIndex !== 4) { // Don't load for Profile (0) or Attendance (4) tabs
      loadTabData(originalTabIndex);
    }
  }, [activeTab, student, id, tabDataLoaded, tabDataLoading, isStudent, showToast, getOriginalTabIndex]);

  // Attendance percentage: Present and Late count as attended, Absent and Leave count as not attended
  const attendancePercentage = useMemo(() => {
    if (!attendanceStats?.total || attendanceStats.total === 0) return 0;
    // Present + Late = attended days
    const attendedDays = attendanceStats.present + attendanceStats.late;
    return Math.round((attendedDays / attendanceStats.total) * 100);
  }, [attendanceStats]);

  const totalFines = useMemo(() => {
    return fineHistory.reduce((total, record) => {
      return total + (record.fine_amount || 0);
    }, 0);
  }, [fineHistory]);

  // Memoize filtered students for reports/exams to avoid recalculation
  const activeReportsCount = useMemo(() => {
    return reports.filter(r => ['pending', 'in_review', 'in_progress'].includes(r.status)).length;
  }, [reports]);

  const resolvedReportsCount = useMemo(() => {
    return reports.filter(r => r.status === 'resolved').length;
  }, [reports]);

  const dismissedReportsCount = useMemo(() => {
    return reports.filter(r => r.status === 'dismissed').length;
  }, [reports]);

  // Memoize exam calculations
  const averageExamPercentage = useMemo(() => {
    if (examSummaries.length === 0) return 0;
    return Math.round(examSummaries.reduce((sum, exam) => sum + exam.percentage, 0) / examSummaries.length);
  }, [examSummaries]);

  const passedExamsCount = useMemo(() => {
    return examSummaries.filter(exam => exam.status === 'pass').length;
  }, [examSummaries]);

  const failedExamsCount = useMemo(() => {
    return examSummaries.filter(exam => exam.status === 'fail').length;
  }, [examSummaries]);

  const passRate = useMemo(() => {
    if (examSummaries.length === 0) return 0;
    return Math.round((passedExamsCount / examSummaries.length) * 100);
  }, [examSummaries, passedExamsCount]);

  const formatStatus = (status: string | undefined) => {
    if (!status) return 'Unknown';
    return status.split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return <StudentProfileSkeleton />;
  }

  if (!student) {
    return (
      <Box p={3}>
        <Typography variant="h5" color="error">Student not found</Typography>
      </Box>
    );
  }

  // Mouse tracking for depth effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();

    const x = clientX - left;
    const y = clientY - top;

    currentTarget.style.setProperty('--mouse-x', `${x}px`);
    currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <ProfileContainer>
      <ProfileHeader onMouseMove={handleMouseMove}>
        <ProfileAvatar src={student.picture_url} alt={student.name}>
          {!student.picture_url && student.name?.[0]}
        </ProfileAvatar>
        <Stack
          spacing={0.5}
          sx={{
            flex: 1,
            minWidth: 0,
            [theme.breakpoints.down('sm')]: {
              alignItems: 'center',
            }
          }}
        >
          <Box sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1,
            flexWrap: 'wrap',
            width: '100%'
          }}>
            <Typography
              variant="h4"
              fontWeight="600"
              sx={{
                fontSize: { xs: '1.25rem', sm: '2rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                width: { xs: 'auto', sm: 'auto' },
              }}
            >
              {student.name}
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                py: 0.25,
                borderRadius: '100px',
                fontSize: { xs: '0.675rem', sm: '0.875rem' },
                fontWeight: 500,
                letterSpacing: '0.025em',
                textTransform: 'capitalize',
                alignSelf: { xs: 'flex-start', sm: 'center' },
                border: '1px solid',
                borderColor: theme => alpha(
                  student.status === 'active' ? theme.palette.success.main :
                    student.status === 'inactive' ? theme.palette.error.main :
                      student.status === 'suspended' ? theme.palette.warning.main :
                        theme.palette.info.main, 0.2
                ),
                color: theme =>
                  student.status === 'active' ? theme.palette.success.main :
                    student.status === 'inactive' ? theme.palette.error.main :
                      student.status === 'suspended' ? theme.palette.warning.main :
                        theme.palette.info.main,
                bgcolor: theme => alpha(
                  student.status === 'active' ? theme.palette.success.main :
                    student.status === 'inactive' ? theme.palette.error.main :
                      student.status === 'suspended' ? theme.palette.warning.main :
                        theme.palette.info.main, 0.1
                ),
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'inherit',
                  opacity: 0.2,
                  animation: student.status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none'
                },
                '@keyframes pulse': {
                  '0%, 100%': {
                    opacity: 0.2,
                  },
                  '50%': {
                    opacity: 0.4,
                  }
                }
              }}
            >
              <Box component="span" sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'currentColor',
                mr: 1,
                boxShadow: theme => `0 0 8px ${alpha(
                  student.status === 'active' ? theme.palette.success.main :
                    student.status === 'inactive' ? theme.palette.error.main :
                      student.status === 'suspended' ? theme.palette.warning.main :
                        theme.palette.info.main, 0.4
                )}`,
              }} />
              {student.status || 'Unknown'}
            </Box>
          </Box>
          <Box sx={{
            mt: { xs: 0.5, sm: 1 },
            width: '100%',
            textAlign: { xs: 'left', sm: 'left' }
          }}>
            <Typography
              variant="h6"
              sx={{
                opacity: 0.8,
                fontSize: { xs: '0.875rem', sm: '1.25rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                mb: 0.25,
                color: theme => alpha(theme.palette.text.primary, 0.7),
              }}
            >
              Class {student.class?.name} {student.section?.name && `- ${student.section.name}`}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.6,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                color: theme => alpha(theme.palette.text.primary, 0.6),
              }}
            >
              ID: {getStudentDisplayId({ id: student.id, roll_number: student.roll_number })}
            </Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.8, sm: 1.6 },
            ml: 'auto',
            p: { xs: 0.8, sm: 1.6 },
            borderRadius: 2.4,
            bgcolor: theme => alpha(theme.palette.background.paper, 0.05),
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: theme => alpha(theme.palette.divider, 0.1),
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: theme => `linear-gradient(135deg, 
                ${alpha(getScoreColor(studentScore).light, 0.1)} 0%, 
                ${alpha(getScoreColor(studentScore).main, 0.05)} 100%
              )`,
              zIndex: 0,
            },
            [theme.breakpoints.down('sm')]: {
              position: 'absolute',
              right: 12,
              bottom: 12,
              left: 'auto',
              top: 'auto',
              p: 1,
              bgcolor: theme => alpha(theme.palette.background.paper, 0.85),
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 2,
              ml: 0,
            }
          }}
        >
          <Box sx={{
            width: { xs: 32, sm: 38 },
            height: { xs: 32, sm: 38 },
            position: 'relative',
            zIndex: 1
          }}>
            <CircularProgress
              variant="determinate"
              value={studentScore * 10}
              sx={{
                color: theme => getScoreColor(studentScore).main,
                position: 'absolute',
                left: 0,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                  transition: 'all 0.5s ease-in-out',
                }
              }}
              size="100%"
            />
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '0.6rem', sm: '0.8rem' },
                  fontWeight: 700,
                  color: theme => getScoreColor(studentScore).main,
                }}
              >
                {studentScore}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                fontWeight: 500,
                color: 'text.secondary',
                mb: { xs: 0.2, sm: 0.5 }
              }}
            >
              Student Score
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '0.7rem', sm: '1rem' },
                fontWeight: 700,
                color: theme => getScoreColor(studentScore).main,
                lineHeight: 1,
              }}
            >
              {getScoreLabel(studentScore)}
            </Typography>
          </Box>
        </Box>
      </ProfileHeader>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {/* Attendance Card */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: theme => `
                  linear-gradient(135deg, 
                    ${alpha(theme.palette.background.paper, 0.95)} 0%,
                    ${alpha(theme.palette.background.paper, 0.85)} 100%)
                `,
                borderRadius: 'inherit',
                zIndex: 0,
              }
            }}>
              {/* Main Content */}
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* Progress Ring */}
                <Box sx={{
                  position: 'relative',
                  width: '180px', // Reduced from original size
                  height: '180px', // Reduced from original size
                  margin: '0 auto',
                  mb: 3
                }}>
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Background Circle */}
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: theme => `10px solid ${alpha(theme.palette.divider, 0.08)}`, // Reduced border width
                    }} />

                    {/* Progress Circle */}
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: theme => `10px solid ${  // Reduced border width
                        attendancePercentage >= 75 ? theme.palette.success.main :
                          attendancePercentage >= 65 ? theme.palette.warning.main :
                            theme.palette.error.main
                        }`,
                      borderTop: 'none',
                      borderLeft: 'none',
                      transform: `rotate(${45 + (attendancePercentage * 1.8)}deg)`,
                      transition: 'all 0.5s ease-out',
                    }} />

                    {/* Center Content */}
                    <Box sx={{
                      position: 'relative',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h3" sx={{
                        fontWeight: 700,
                        color: theme =>
                          attendancePercentage >= 75 ? theme.palette.success.main :
                            attendancePercentage >= 65 ? theme.palette.warning.main :
                              theme.palette.error.main,
                        mb: 0.5,
                        fontSize: '2.5rem' // Reduced font size
                      }}>
                        {attendancePercentage}%
                      </Typography>
                      <Typography variant="caption" sx={{
                        color: 'text.secondary',
                        display: 'block',
                        fontSize: '0.75rem',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        Attendance
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Stats Grid */}
                <Grid container spacing={2}>
                  {([
                    {
                      label: 'Present',
                      value: attendanceStats?.present || 0,
                      icon: <CheckCircle />,
                      color: 'success' as ColorKey
                    },
                    {
                      label: 'Late',
                      value: attendanceStats?.late || 0,
                      icon: <Timer />,
                      color: 'warning' as ColorKey
                    },
                    {
                      label: 'Absent / Leave',
                      value: (attendanceStats?.absent || 0) + (attendanceStats?.leave || 0),
                      icon: <Cancel />,
                      color: 'error' as ColorKey,
                      showSeparateCounts: true,
                      absentCount: attendanceStats?.absent || 0,
                      leaveCount: attendanceStats?.leave || 0
                    },
                    {
                      label: 'Half Leaves',
                      value: halfLeavesMap.size,
                      icon: <AccessTime />,
                      color: 'secondary' as ColorKey,
                      customColor: '#ec4899'
                    }
                  ] as any[]).map((stat, index) => (
                    <Grid item xs={6} key={index}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: stat.customColor
                          ? alpha(stat.customColor, 0.2)
                          : theme => {
                            const paletteColor = (theme.palette as any)[stat.color] as { main: string } | undefined;
                            return alpha(paletteColor?.main || theme.palette.primary.main, 0.2);
                          },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        position: 'relative'
                      }}>
                        <Box sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: stat.customColor
                            ? alpha(stat.customColor, 0.1)
                            : theme => {
                              const paletteColor = (theme.palette as any)[stat.color] as { main: string } | undefined;
                              return alpha(paletteColor?.main || theme.palette.primary.main, 0.1);
                            },
                          color: stat.customColor || `${stat.color}.main`,
                          flexShrink: 0
                        }}>
                          {stat.icon}
                        </Box>
                        <Box sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center'
                        }}>
                          <Typography variant="h6" sx={{
                            color: stat.customColor || `${stat.color}.main`,
                            fontWeight: 600,
                            lineHeight: 1,
                            fontSize: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            justifyContent: 'center'
                          }}>
                            {stat.showSeparateCounts ? (
                              <>
                                <Box component="span" sx={{ color: theme => theme.palette.error.main }}>
                                  {stat.absentCount}
                                </Box>
                                <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.9em' }}>+</Box>
                                <Box component="span" sx={{ color: theme => theme.palette.info.main }}>
                                  {stat.leaveCount}
                                </Box>
                              </>
                            ) : (
                              stat.value
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                            letterSpacing: '0.4px'
                          }}>
                            {stat.label}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </StatCard>
          </Grid>

          {/* Test Records Summary Card */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{
              p: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: theme => `
                  linear-gradient(135deg, 
                    ${alpha(theme.palette.background.paper, 0.95)} 0%,
                    ${alpha(theme.palette.background.paper, 0.85)} 100%)
                `,
                borderRadius: 'inherit',
                zIndex: 0,
              }
            }}>
              {/* Main Content */}
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header with Title and Average Score */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="caption" sx={{
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Test Records
                  </Typography>
                  <Typography variant="h6" sx={{
                    color: theme => {
                      const percentage = testSummaryData.totalPercentage;
                      if (percentage >= 80) return theme.palette.success.main;
                      if (percentage >= 60) return theme.palette.warning.main;
                      if (percentage >= 40) return theme.palette.info.main;
                      return theme.palette.error.main;
                    },
                    fontWeight: 700,
                    lineHeight: 1,
                    fontSize: '1.5rem'
                  }}>
                    {Math.round(testSummaryData.totalPercentage)}%
                  </Typography>
                </Box>

                {/* Compact Stats Grid */}
                <Grid container spacing={0.5} sx={{ mb: 1 }}>
                  {[
                    {
                      label: 'Tests',
                      value: testSummaryData.totalTests,
                      icon: <Assessment sx={{ fontSize: 16 }} />,
                      color: 'info' as ColorKey
                    },
                    {
                      label: 'Subjects',
                      value: testSummaryData.totalSubjects,
                      icon: <Quiz sx={{ fontSize: 16 }} />,
                      color: 'primary' as ColorKey
                    },
                    {
                      label: 'Marks',
                      value: `${testSummaryData.totalObtainedMarks}/${testSummaryData.totalMaxMarks}`,
                      icon: <Grade sx={{ fontSize: 16 }} />,
                      color: 'success' as ColorKey
                    }
                  ].map((item, index) => (
                    <Grid item xs={4} key={index}>
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: theme => {
                          const paletteColor = (theme.palette as any)[item.color] as { main: string } | undefined;
                          return alpha(paletteColor?.main || theme.palette.primary.main, 0.2);
                        },
                        bgcolor: theme => {
                          const paletteColor = (theme.palette as any)[item.color] as { main: string } | undefined;
                          return alpha(paletteColor?.main || theme.palette.primary.main, 0.05);
                        },
                        textAlign: 'center',
                        height: '100%'
                      }}>
                        <Box sx={{
                          color: `${item.color}.main`,
                          mb: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.icon}
                        </Box>
                        <Typography variant="body2" sx={{
                          color: `${item.color}.main`,
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          lineHeight: 1.2,
                          mb: 0.25
                        }}>
                          {item.value}
                        </Typography>
                        <Typography variant="caption" sx={{
                          color: 'text.secondary',
                          fontSize: '0.65rem',
                          lineHeight: 1
                        }}>
                          {item.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Subject-wise Summary */}
                {testSummaryData.subjectSummaries.length > 0 && (
                  <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    pt: 1.5
                  }}>
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      mb: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Subject Summary
                    </Typography>
                    <Box sx={{
                      flex: 1,
                      overflowY: 'auto',
                      minHeight: 0,
                      pr: 0,
                      '&::-webkit-scrollbar': {
                        width: '4px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: theme => alpha(theme.palette.text.secondary, 0.2),
                        borderRadius: '2px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: theme => alpha(theme.palette.text.secondary, 0.3),
                      }
                    }}>
                      <Grid container spacing={1}>
                        {testSummaryData.subjectSummaries.map((subject) => (
                          <Grid item xs={6} key={subject.subject_id}>
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1.25,
                              borderRadius: 1,
                              bgcolor: theme => alpha(theme.palette.info.main, 0.05),
                              border: '1px solid',
                              borderColor: theme => alpha(theme.palette.info.main, 0.1),
                              transition: 'all 0.2s ease',
                              height: '100%',
                              '&:hover': {
                                bgcolor: theme => alpha(theme.palette.info.main, 0.08),
                                borderColor: theme => alpha(theme.palette.info.main, 0.2),
                                transform: 'translateY(-1px)',
                              }
                            }}>
                              <Typography variant="caption" sx={{
                                color: 'text.primary',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                                mr: 1
                              }}>
                                {subject.subject_name} ({subject.test_count})
                              </Typography>
                              <Typography variant="caption" sx={{
                                color: 'info.main',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}>
                                {subject.obtained_marks}/{subject.total_marks} - {subject.percentage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Box>
                )}
              </Box>
            </StatCard>
          </Grid>

          {/* Test Records Summary Card - Duplicate */}
          {isStudentSummaryCardVisible(renderSettings, 'test_records_summary_card_duplicate') && (
            <Grid item xs={12} sm={6} md={3}>
              <StatCard sx={{
                p: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: theme => `
                    linear-gradient(135deg, 
                      ${alpha(theme.palette.background.paper, 0.95)} 0%,
                      ${alpha(theme.palette.background.paper, 0.85)} 100%)
                  `,
                  borderRadius: 'inherit',
                  zIndex: 0,
                }
              }}>
                {/* Main Content */}
                <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Header with Title and Average Score */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                    pb: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Test Records
                    </Typography>
                    <Typography variant="h6" sx={{
                      color: theme => {
                        const percentage = testSummaryData.totalPercentage;
                        if (percentage >= 80) return theme.palette.success.main;
                        if (percentage >= 60) return theme.palette.warning.main;
                        if (percentage >= 40) return theme.palette.info.main;
                        return theme.palette.error.main;
                      },
                      fontWeight: 700,
                      lineHeight: 1,
                      fontSize: '1.5rem'
                    }}>
                      {Math.round(testSummaryData.totalPercentage)}%
                    </Typography>
                  </Box>

                  {/* Compact Stats Grid */}
                  <Grid container spacing={0.5} sx={{ mb: 1 }}>
                    {[
                      {
                        label: 'Tests',
                        value: testSummaryData.totalTests,
                        icon: <Assessment sx={{ fontSize: 16 }} />,
                        color: 'info' as ColorKey
                      },
                      {
                        label: 'Subjects',
                        value: testSummaryData.totalSubjects,
                        icon: <Quiz sx={{ fontSize: 16 }} />,
                        color: 'primary' as ColorKey
                      },
                      {
                        label: 'Marks',
                        value: `${testSummaryData.totalObtainedMarks}/${testSummaryData.totalMaxMarks}`,
                        icon: <Grade sx={{ fontSize: 16 }} />,
                        color: 'success' as ColorKey
                      }
                    ].map((item, index) => (
                      <Grid item xs={4} key={`test-card-duplicate-${index}`}>
                        <Box sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: theme => {
                            const paletteColor = (theme.palette as any)[item.color] as { main: string } | undefined;
                            return alpha(paletteColor?.main || theme.palette.primary.main, 0.2);
                          },
                          bgcolor: theme => {
                            const paletteColor = (theme.palette as any)[item.color] as { main: string } | undefined;
                            return alpha(paletteColor?.main || theme.palette.primary.main, 0.05);
                          },
                          textAlign: 'center',
                          height: '100%'
                        }}>
                          <Box sx={{
                            color: `${item.color}.main`,
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {item.icon}
                          </Box>
                          <Typography variant="body2" sx={{
                            color: `${item.color}.main`,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            lineHeight: 1.2,
                            mb: 0.25
                          }}>
                            {item.value}
                          </Typography>
                          <Typography variant="caption" sx={{
                            color: 'text.secondary',
                            fontSize: '0.65rem',
                            lineHeight: 1
                          }}>
                            {item.label}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Subject-wise Summary */}
                  {testSummaryData.subjectSummaries.length > 0 && (
                    <Box sx={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      pt: 1.5
                    }}>
                      <Typography variant="caption" sx={{
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Subject Summary
                      </Typography>
                      <Box sx={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        pr: 0,
                        '&::-webkit-scrollbar': {
                          width: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: theme => alpha(theme.palette.text.secondary, 0.2),
                          borderRadius: '2px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          background: theme => alpha(theme.palette.text.secondary, 0.3),
                        }
                      }}>
                        <Grid container spacing={1}>
                          {testSummaryData.subjectSummaries.map((subject) => (
                            <Grid item xs={6} key={`test-card-duplicate-subject-${subject.subject_id}`}>
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1.25,
                                borderRadius: 1,
                                bgcolor: theme => alpha(theme.palette.info.main, 0.05),
                                border: '1px solid',
                                borderColor: theme => alpha(theme.palette.info.main, 0.1),
                                transition: 'all 0.2s ease',
                                height: '100%',
                                '&:hover': {
                                  bgcolor: theme => alpha(theme.palette.info.main, 0.08),
                                  borderColor: theme => alpha(theme.palette.info.main, 0.2),
                                  transform: 'translateY(-1px)',
                                }
                              }}>
                                <Typography variant="caption" sx={{
                                  color: 'text.primary',
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: 1,
                                  minWidth: 0,
                                  mr: 1
                                }}>
                                  {subject.subject_name} ({subject.test_count})
                                </Typography>
                                <Typography variant="caption" sx={{
                                  color: 'info.main',
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}>
                                  {subject.obtained_marks}/{subject.total_marks} - {subject.percentage.toFixed(1)}%
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Box>
                  )}
                </Box>
              </StatCard>
            </Grid>
          )}

          {/* Examinations Summary Card */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{
              p: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: theme => `
                  linear-gradient(135deg, 
                    ${alpha(theme.palette.background.paper, 0.95)} 0%,
                    ${alpha(theme.palette.background.paper, 0.85)} 100%)
                `,
                borderRadius: 'inherit',
                zIndex: 0,
              }
            }}>
              {/* Main Content */}
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header with Title and Average Score */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  pb: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="caption" sx={{
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Examinations
                  </Typography>
                  <Typography variant="h6" sx={{
                    color: theme => {
                      const percentage = averageExamPercentage;
                      if (percentage >= 80) return theme.palette.success.main;
                      if (percentage >= 60) return theme.palette.warning.main;
                      if (percentage >= 40) return theme.palette.info.main;
                      return theme.palette.error.main;
                    },
                    fontWeight: 700,
                    lineHeight: 1,
                    fontSize: '1.5rem'
                  }}>
                    {averageExamPercentage}%
                  </Typography>
                </Box>

                {/* Compact Stats Grid */}
                <Grid container spacing={0.5} sx={{ mb: 1 }}>
                  {[
                    {
                      label: 'Exams',
                      value: examSummaries.length,
                      icon: <Quiz sx={{ fontSize: 16 }} />,
                      color: 'info' as ColorKey
                    },
                    {
                      label: 'Passed',
                      value: passedExamsCount,
                      icon: <CheckCircle sx={{ fontSize: 16 }} />,
                      color: 'success' as ColorKey
                    },
                    {
                      label: 'Failed',
                      value: failedExamsCount,
                      icon: <Cancel sx={{ fontSize: 16 }} />,
                      color: 'error' as ColorKey
                    }
                  ].map((item, index) => (
                    <Grid item xs={4} key={`exam-card-stats-${index}`}>
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: theme => {
                          const paletteColor = (theme.palette as any)[item.color] as { main: string } | undefined;
                          return alpha(paletteColor?.main || theme.palette.primary.main, 0.2);
                        },
                        bgcolor: theme => {
                          const paletteColor = (theme.palette as any)[item.color] as { main: string } | undefined;
                          return alpha(paletteColor?.main || theme.palette.primary.main, 0.05);
                        },
                        textAlign: 'center',
                        height: '100%'
                      }}>
                        <Box sx={{
                          color: `${item.color}.main`,
                          mb: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.icon}
                        </Box>
                        <Typography variant="body2" sx={{
                          color: `${item.color}.main`,
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          lineHeight: 1.2,
                          mb: 0.25
                        }}>
                          {item.value}
                        </Typography>
                        <Typography variant="caption" sx={{
                          color: 'text.secondary',
                          fontSize: '0.65rem',
                          lineHeight: 1
                        }}>
                          {item.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Exam-wise Summary */}
                {examSummaries.length > 0 && (
                  <Box sx={{
                    flex: '1 !important',
                    minHeight: '0 !important',
                    display: 'flex !important',
                    flexDirection: 'column !important',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    pt: '12px !important',
                    width: '100% !important',
                    boxSizing: 'border-box !important'
                  }}>
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      mb: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Exam Summary
                    </Typography>
                    <Box sx={{
                      flex: 1,
                      overflowY: 'auto',
                      minHeight: 0,
                      pr: '0 !important',
                      '&::-webkit-scrollbar': {
                        width: '4px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: theme => alpha(theme.palette.text.secondary, 0.2),
                        borderRadius: '2px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: theme => alpha(theme.palette.text.secondary, 0.3),
                      }
                    }}>
                      <Grid container spacing={1} sx={{
                        margin: '0 !important',
                        width: '100% !important',
                        '& > .MuiGrid-item': {
                          padding: '0 !important',
                          margin: '0 !important'
                        }
                      }}>
                        {examSummaries.map((exam) => (
                          <Grid item xs={12} key={exam.exam_id} sx={{
                            padding: '0 !important',
                            margin: '0 !important',
                            width: '100% !important'
                          }}>
                            <Box sx={{
                              display: 'flex !important',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: '10px !important',
                              borderRadius: '4px !important',
                              bgcolor: theme => alpha(theme.palette.info.main, 0.05),
                              border: '1px solid',
                              borderColor: theme => alpha(theme.palette.info.main, 0.1),
                              transition: 'all 0.2s ease',
                              height: '100%',
                              width: '100% !important',
                              boxSizing: 'border-box !important',
                              '&:hover': {
                                bgcolor: theme => alpha(theme.palette.info.main, 0.08),
                                borderColor: theme => alpha(theme.palette.info.main, 0.2),
                                transform: 'translateY(-1px)',
                              }
                            }}>
                              <Typography variant="caption" sx={{
                                color: 'text.primary',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                                mr: 1
                              }}>
                                {exam.exam_name}
                              </Typography>
                              <Typography variant="caption" sx={{
                                color: 'primary.main',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}>
                                {exam.obtained_marks}/{exam.total_marks} - {exam.percentage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Box>
                )}
              </Box>
            </StatCard>
          </Grid>

          {/* Reports Card or Homework Diary Card (conditional) */}
          <Grid item xs={12} sm={6} md={3}>
            {isStudent ? (
              <ReportsCard>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <ReportsHeader>
                    <Box className="header-content">
                      <Box className="icon-wrapper">
                        <HomeWork />
                      </Box>
                      <Box className="header-text">
                        <Typography className="header-title">
                          Homework Diary
                        </Typography>
                        <Typography className="header-subtitle">
                          {homeworkDiaryEntries.length} {homeworkDiaryEntries.length === 1 ? 'entry' : 'entries'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="date-picker-wrapper">
                      <DatePicker
                        value={selectedHomeworkDate}
                        onChange={(newValue) => setSelectedHomeworkDate(newValue)}
                        format="DD-MM-YYYY"
                        slotProps={{
                          textField: {
                            size: 'small',
                            sx: {
                              '& .MuiOutlinedInput-root': {
                                fontSize: '0.75rem',
                                height: '32px',
                                '& input': {
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                },
                                '& .MuiInputAdornment-root': {
                                  marginLeft: '4px',
                                  '& button': {
                                    padding: '4px',
                                  },
                                  '& svg': {
                                    fontSize: '1rem',
                                  }
                                },
                              },
                            }
                          }
                        }}
                      />
                    </Box>
                  </ReportsHeader>
                </LocalizationProvider>

                <ReportsList>
                  {homeworkDiaryEntries.length === 0 ? (
                    <EmptyReportState>
                      <Box className="emoji">📚</Box>
                      <Typography className="message">
                        No homework assigned for this date.
                        <br />
                        Check back later!
                      </Typography>
                    </EmptyReportState>
                  ) : (
                    <Box className="scroll-container">
                      {/* Show entries for selected date only */}
                      {homeworkDiaryEntries.map((entry, idx) => (
                        <ReportItem key={`${entry.id}-${idx}`} $shadeIndex={idx}>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                            flex: 1,
                            minWidth: 0
                          }}>
                            <Box
                              className="homework-icon"
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'transparent',
                                color: 'text.secondary',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                opacity: 0.7
                              }}
                            >
                              <HomeWork sx={{ fontSize: 18 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                mb: 0.25,
                                flexWrap: 'wrap'
                              }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'text.primary',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {entry.subject_name || 'General'}
                                </Typography>
                                {entry.assigned_by_name && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'text.secondary',
                                      fontSize: '0.65rem',
                                      fontWeight: 400,
                                    }}
                                  >
                                    • {entry.assigned_by_gender === 'Female' || entry.assigned_by_gender === 'female'
                                      ? 'Ms.'
                                      : entry.assigned_by_gender === 'Male' || entry.assigned_by_gender === 'male'
                                        ? 'Mr.'
                                        : ''} {entry.assigned_by_name}
                                  </Typography>
                                )}
                              </Box>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.7rem',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {entry.homework_text}
                              </Typography>
                            </Box>
                          </Box>
                        </ReportItem>
                      ))}
                    </Box>
                  )}
                </ReportsList>
              </ReportsCard>
            ) : (
              <ReportsCard>
                <ReportsHeader>
                  <Box className="header-content">
                    <Box className="icon-wrapper">
                      <Assignment />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Reports
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        Total Reports: {reportCategories.length}
                      </Typography>
                    </Box>
                  </Box>
                </ReportsHeader>

                <ReportsList>
                  {reportCategories.length === 0 ? (
                    <EmptyReportState>
                      <Box className="emoji">🌟</Box>
                      <Typography className="message">
                        Well done! No reports yet.
                        <br />
                        Keep up the good work!
                      </Typography>
                    </EmptyReportState>
                  ) : (
                    <Box className="scroll-container">
                      {reportCategories.map(category => (
                        <ReportItem key={category.id}>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            flex: 1,
                            minWidth: 0
                          }}>
                            <Box sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
                              color: 'primary.main'
                            }}>
                              <Assignment sx={{ fontSize: 18 }} />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.primary',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {category.name}
                            </Typography>
                          </Box>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'primary.main',
                                fontWeight: 500
                              }}
                            >
                              {category.count || 1}
                            </Typography>
                            <ArrowForwardIcon sx={{
                              fontSize: 18,
                              color: 'primary.main',
                              opacity: 0.8
                            }} />
                          </Box>
                        </ReportItem>
                      ))}
                    </Box>
                  )}
                </ReportsList>
              </ReportsCard>
            )}
          </Grid>

        </Grid>
      </Box>

      <GlassCard sx={{ mb: 3 }}>
        <ModernTabs
          value={getVisibleTabIndex(activeTab)}
          onChange={(_, newVisibleIndex) => {
            const originalIndex = getOriginalTabIndex(newVisibleIndex);
            setActiveTab(originalIndex);
          }}
          variant={isMobile ? "standard" : "scrollable"}
          scrollButtons={isMobile ? false : "auto"}
          sx={{
            [theme.breakpoints.down('sm')]: {
              '& .MuiTabs-flexContainer': {
                flexWrap: 'wrap',
              }
            }
          }}
        >
          {visibleTabs.map((tab, visibleIndex) => (
            <TabItem
              key={tab.originalIndex}
              label={
                <Box className="tab-wrapper">
                  <Box className="icon-wrapper">
                    {tab.icon}
                  </Box>
                  <span className="tab-label">{tab.label}</span>
                </Box>
              }
            />
          ))}
        </ModernTabs>

        <Box sx={{
          mt: { xs: 2, sm: 3 },
          bgcolor: 'background.paper',
          borderRadius: { xs: 1.5, sm: 2 },
          overflow: 'hidden'
        }}>
          <CustomTabPanel value={activeTab} index={0}>
            <FormBlocks>
              {/* Left Block - Basic & Contact Information */}
              <FieldsCard>
                {/* Basic Information */}
                <SectionContainer>
                  <Box className="section-header">
                    <Box className="icon-wrapper">
                      <Person />
                    </Box>
                    <Typography variant="h6" sx={{
                      fontSize: { xs: '0.95rem', sm: '1.25rem' }
                    }}>
                      Basic Information
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {student.form_b && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Badge fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Form-B/NIC</Typography>
                            <Typography className="info-value">{student.form_b}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.dob && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <CalendarMonth fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Date of Birth</Typography>
                            <Typography className="info-value">
                              {new Date(student.dob).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.gender && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Wc fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Gender</Typography>
                            <Typography className="info-value">{student.gender}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.blood_group && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <LocalHospital fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Blood Group</Typography>
                            <Typography className="info-value">{student.blood_group}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}
                  </Grid>
                </SectionContainer>

                {/* Contact Information */}
                <SectionContainer>
                  <Box className="section-header">
                    <Box className="icon-wrapper">
                      <ContactPhone />
                    </Box>
                    <Typography variant="h6" sx={{
                      fontSize: { xs: '0.95rem', sm: '1.25rem' }
                    }}>
                      Contact Details
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {student.phone && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Phone fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Student Phone</Typography>
                            <Typography className="info-value">{student.phone}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.father_mobile && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Phone fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Father's Mobile</Typography>
                            <Typography className="info-value">{student.father_mobile}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.mother_mobile && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Phone fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Mother's Mobile</Typography>
                            <Typography className="info-value">{student.mother_mobile}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.address && (
                      <Grid item xs={12}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Home fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Address</Typography>
                            <Typography className="info-value">{student.address}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}
                  </Grid>
                </SectionContainer>

                {/* Academic Information */}
                <SectionContainer>
                  <Box className="section-header">
                    <Box className="icon-wrapper">
                      <School />
                    </Box>
                    <Typography variant="h6">Academic Details</Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {student.admission_date && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <CalendarMonth fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Admission Date</Typography>
                            <Typography className="info-value">
                              {new Date(student.admission_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.previous_school && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <School fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Previous School</Typography>
                            <Typography className="info-value">{student.previous_school}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.discount_in_fee !== undefined && student.discount_in_fee !== null && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <AttachMoney fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Fee Discount</Typography>
                            <Typography className="info-value">
                              {student.discount_in_fee}%
                            </Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.class?.name && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Class fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Current Class</Typography>
                            <Typography className="info-value">
                              {student.class.name} {student.section?.name && `- ${student.section.name}`}
                            </Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}
                  </Grid>
                </SectionContainer>

                {/* Additional Information */}
                <SectionContainer>
                  <Box className="section-header">
                    <Box className="icon-wrapper">
                      <PostAdd />
                    </Box>
                    <Typography variant="h6" sx={{
                      fontSize: { xs: '0.95rem', sm: '1.25rem' }
                    }}>
                      Additional Details
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {student.religion && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Church fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Religion</Typography>
                            <Typography className="info-value">{student.religion}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.cast && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Groups fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Cast</Typography>
                            <Typography className="info-value">{student.cast}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.disease && (
                      <Grid item xs={12}>
                        <InfoItem>
                          <Box className="icon-container">
                            <MedicalInformation fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Medical Conditions</Typography>
                            <Typography className="info-value">{student.disease}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.id_mark && (
                      <Grid item xs={12}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Psychology fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Identification Mark</Typography>
                            <Typography className="info-value">{student.id_mark}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.total_siblings !== undefined && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Groups fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Total Siblings</Typography>
                            <Typography className="info-value">{student.total_siblings}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.osc && (
                      <Grid item xs={12} md={6}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Diversity3 fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">OSC Status</Typography>
                            <Typography className="info-value">{student.osc}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}

                    {student.additional_note && (
                      <Grid item xs={12}>
                        <InfoItem>
                          <Box className="icon-container">
                            <Note fontSize="small" />
                          </Box>
                          <Box className="info-content">
                            <Typography className="info-label">Additional Notes</Typography>
                            <Typography className="info-value">{student.additional_note}</Typography>
                          </Box>
                        </InfoItem>
                      </Grid>
                    )}
                  </Grid>
                </SectionContainer>
              </FieldsCard>

              {/* Right Block - Family & Additional Information */}
              <FieldsCard>
                {/* Section 3: Family Information */}
                <SectionContainer>
                  <Box className="section-header">
                    <Box className="icon-wrapper">
                      <FamilyRestroom />
                    </Box>
                    <Typography variant="h6" sx={{
                      fontSize: { xs: '0.95rem', sm: '1.25rem' }
                    }}>
                      Family Information
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    {/* Father's Information */}
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="primary.main" fontWeight={600}>
                          Father's Details
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        {student.father_name && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Person fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Name</Typography>
                                <Typography className="info-value">{student.father_name}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.father_national_id && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Badge fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">National ID</Typography>
                                <Typography className="info-value">{student.father_national_id}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.father_occupation && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Work fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Occupation</Typography>
                                <Typography className="info-value">{student.father_occupation}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.father_income !== undefined && student.father_income !== null && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <AccountBalance fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Income</Typography>
                                <Typography className="info-value">
                                  Rs. {student.father_income.toLocaleString()}
                                </Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.father_education && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <School fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Education</Typography>
                                <Typography className="info-value">{student.father_education}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.father_profession && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Work fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Profession</Typography>
                                <Typography className="info-value">{student.father_profession}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                      </Grid>
                    </Grid>

                    {/* Mother's Information */}
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2, mt: 2 }}>
                        <Typography variant="subtitle2" color="primary.main" fontWeight={600}>
                          Mother's Details
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        {student.mother_name && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Person fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Name</Typography>
                                <Typography className="info-value">{student.mother_name}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.mother_national_id && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Badge fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">National ID</Typography>
                                <Typography className="info-value">{student.mother_national_id}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.mother_occupation && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Work fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Occupation</Typography>
                                <Typography className="info-value">{student.mother_occupation}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.mother_profession && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <Work fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Profession</Typography>
                                <Typography className="info-value">{student.mother_profession}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.mother_education && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <School fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Education</Typography>
                                <Typography className="info-value">{student.mother_education}</Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                        {student.mother_income !== undefined && student.mother_income !== null && (
                          <Grid item xs={12} md={6}>
                            <InfoItem>
                              <Box className="icon-container">
                                <AccountBalance fontSize="small" />
                              </Box>
                              <Box className="info-content">
                                <Typography className="info-label">Income</Typography>
                                <Typography className="info-value">
                                  Rs. {student.mother_income.toLocaleString()}
                                </Typography>
                              </Box>
                            </InfoItem>
                          </Grid>
                        )}
                      </Grid>
                    </Grid>
                  </Grid>
                </SectionContainer>


              </FieldsCard>
            </FormBlocks>
          </CustomTabPanel>

          <CustomTabPanel value={activeTab} index={1}>
            {tabDataLoading[1] ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Reports Summary Cards */}
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    {/* Total Reports Card */}
                    <Grid item xs={12} sm={6} md={3}>
                      <GlassCard>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Assignment sx={{ color: 'primary.main', fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="h4" color="primary.main" fontWeight={600}>
                              {reports.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Reports
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>

                    {/* Active Reports Card */}
                    <Grid item xs={12} sm={6} md={3}>
                      <GlassCard>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme => alpha(theme.palette.warning.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Timer sx={{ color: 'warning.main', fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="h4" color="warning.main" fontWeight={600}>
                              {activeReportsCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Active Reports
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>

                    {/* Resolved Reports Card */}
                    <Grid item xs={12} sm={6} md={3}>
                      <GlassCard>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme => alpha(theme.palette.success.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="h4" color="success.main" fontWeight={600}>
                              {resolvedReportsCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Resolved Reports
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>

                    {/* Dismissed Reports Card */}
                    <Grid item xs={12} sm={6} md={3}>
                      <GlassCard>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme => alpha(theme.palette.grey[500], 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Cancel sx={{ color: 'grey.500', fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="h4" color="grey.500" fontWeight={600}>
                              {dismissedReportsCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Dismissed Reports
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>
                  </Grid>
                </Box>

                {/* Reports List */}
                <Grid container spacing={2}>
                  {reports.map((report, index) => (
                    <Grid item xs={12} key={report.id}>
                      <ReportCard>
                        <Box className="report-header">
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  color: 'text.secondary',
                                  minWidth: 'auto',
                                  fontWeight: 600,
                                  mr: 1
                                }}
                              >
                                #{reports.length - index}
                              </Typography>
                              <CategoryChip
                                label={report.category?.name}
                                size="small"
                                icon={<Assignment fontSize="small" />}
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                ml: 1
                              }}
                            >
                              {new Date(report.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                              <Box component="span" sx={{ color: 'text.disabled' }}>|</Box>
                              <Box
                                component="span"
                                sx={{
                                  color: theme => {
                                    switch (report.status) {
                                      case 'pending': return theme.palette.warning.main;
                                      case 'in_review': return theme.palette.info.main;
                                      case 'resolved': return theme.palette.success.main;
                                      case 'dismissed': return theme.palette.grey[500];
                                      case 'in_progress': return theme.palette.primary.main;
                                      default: return theme.palette.text.secondary;
                                    }
                                  },
                                  fontWeight: 600,
                                  textTransform: 'capitalize'
                                }}
                              >
                                {formatStatus(report.status)}
                              </Box>
                              {report.reporter?.name && (
                                <>
                                  <Box component="span" sx={{ color: 'text.disabled' }}>|</Box>
                                  <Box component="span" sx={{ color: 'text.secondary' }}>
                                    by {report.reporter.name}
                                  </Box>
                                </>
                              )}
                            </Typography>
                          </Box>
                        </Box>

                        <Box className="report-content">
                          <Typography variant="body1" gutterBottom>
                            {report.description}
                          </Typography>
                          {report.action_taken && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Action Taken:
                              </Typography>
                              <Typography variant="body2">
                                {report.action_taken}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        <Box
                          onClick={() => toggleUpdates(report.id)}
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: report.updates?.length ? 'pointer' : 'default',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            bgcolor: theme => alpha(theme.palette.background.default, 0.5),
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: theme => report.updates?.length ? alpha(theme.palette.primary.main, 0.05) : 'inherit'
                            },
                            borderBottomLeftRadius: expandedUpdates[report.id] ? 0 : 'inherit',
                            borderBottomRightRadius: expandedUpdates[report.id] ? 0 : 'inherit'
                          }}
                        >
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flex: 1
                          }}>
                            {report.updates && report.updates.length > 0 && (
                              <KeyboardArrowDownIcon
                                sx={{
                                  transform: expandedUpdates[report.id] ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.2s ease',
                                  color: 'primary.main'
                                }}
                              />
                            )}
                            <Typography variant="subtitle2" color="primary.main">
                              Report Updates
                            </Typography>
                            <Chip
                              size="small"
                              label={report.updates?.length || 0}
                              sx={{
                                ml: 1,
                                bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main'
                              }}
                            />
                          </Box>
                          {report.updates && report.updates.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTime fontSize="small" sx={{ color: 'text.secondary', opacity: 0.7 }} />
                              <Typography variant="caption" color="text.secondary">
                                Last updated: {report.updates[0] && new Date(report.updates[0].created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {report.updates && report.updates.length > 0 && (
                          <Collapse in={expandedUpdates[report.id]}>
                            <Box sx={{
                              position: 'relative',
                              p: 2,
                              bgcolor: theme => alpha(theme.palette.background.default, 0.5)
                            }}>
                              {report.updates.map((update, index, updates) => (
                                <Box
                                  key={update.id}
                                  sx={{
                                    position: 'relative',
                                    pl: 6,
                                    pb: index === updates.length - 1 ? 0 : 3,
                                    '&::before': {
                                      content: '""',
                                      position: 'absolute',
                                      left: 24,
                                      top: 6,
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      bgcolor: 'primary.main',
                                      boxShadow: theme => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
                                      zIndex: 1
                                    },
                                    '&::after': index !== updates.length - 1 ? {
                                      content: '""',
                                      position: 'absolute',
                                      left: 29,
                                      top: 18,
                                      width: 2,
                                      height: 'calc(100% - 6px)',
                                      background: theme => `linear-gradient(180deg, 
                                    ${alpha(theme.palette.primary.main, 0.3)} 0%, 
                                    ${alpha(theme.palette.primary.main, 0.1)} 100%
                                  )`,
                                      borderRadius: '4px'
                                    } : {}
                                  }}
                                >
                                  <Box sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2">
                                      Status changed from{' '}
                                      <Box
                                        component="span"
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          px: 1,
                                          py: 0.5,
                                          borderRadius: 1,
                                          bgcolor: theme => alpha(theme.palette.grey[500], 0.1),
                                          color: 'text.secondary',
                                          fontSize: '0.75rem',
                                          fontWeight: 600
                                        }}
                                      >
                                        {formatStatus(update.previous_status)}
                                      </Box>
                                      {' '}to{' '}
                                      <Box
                                        component="span"
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          px: 1,
                                          py: 0.5,
                                          borderRadius: 1,
                                          bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                                          color: 'primary.main',
                                          fontSize: '0.75rem',
                                          fontWeight: 600
                                        }}
                                      >
                                        {formatStatus(update.new_status)}
                                      </Box>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                      by {update.staff?.name} • {new Date(update.created_at).toLocaleString()}
                                    </Typography>
                                  </Box>
                                  {update.update_note && (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: 'text.secondary',
                                        bgcolor: theme => alpha(theme.palette.background.paper, 0.5),
                                        p: 1.5,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider'
                                      }}
                                    >
                                      {update.update_note}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          </Collapse>
                        )}
                      </ReportCard>
                    </Grid>
                  ))}

                  {reports.length === 0 && (
                    <Grid item xs={12}>
                      <Box sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: theme => alpha(theme.palette.background.paper, 0.6),
                        borderRadius: 2
                      }}>
                        <Assignment sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Reports Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          There are no reports recorded for this student.
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </>
            )}
          </CustomTabPanel>

          <CustomTabPanel value={activeTab} index={2}>
            {tabDataLoading[2] ? (
              <ExaminationsSkeleton />
            ) : (
              <>
                {/* Examinations Summary */}
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    {/* Total Examinations Card */}
                    <Grid item xs={12} sm={6} md={3}>
                      <GlassCard>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Quiz sx={{ color: 'primary.main', fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="h4" color="primary.main" fontWeight={600}>
                              {examSummaries.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Examinations
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>

                    {/* Average Performance Card */}
                    <Grid item xs={12} sm={6} md={3}>
                      <GlassCard>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme => alpha(theme.palette.success.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <TrendingUp sx={{ color: 'success.main', fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="h4" color="success.main" fontWeight={600}>
                              {averageExamPercentage}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Average Performance
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>

                    {/* Pass Rate Card */}
                    <Grid item xs={12} sm={6} md={3}>
                      <GlassCard>
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme => alpha(theme.palette.info.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CheckCircle sx={{ color: 'info.main', fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="h4" color="info.main" fontWeight={600}>
                              {passRate}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Pass Rate
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>

                  </Grid>
                </Box>

                {/* Examinations List */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Examination Records
                  </Typography>
                  {examSummaries.length === 0 ? (
                    <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                      <Quiz sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        No Examination Records Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This student has not appeared in any examinations yet.
                      </Typography>
                    </GlassCard>
                  ) : (
                    <Grid container spacing={2}>
                      {examSummaries.map((exam) => (
                        <Grid item xs={12} md={12} key={exam.exam_id}>
                          <GlassCard sx={{ p: 3 }}>
                            <Box
                              sx={{
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  borderRadius: 1
                                },
                                p: { xs: 1, sm: 1.5 },
                                mx: { xs: -1.5, sm: -1 },
                                my: { xs: -0.5, sm: 0 },
                                mb: 2,
                                transition: 'background-color 0.2s ease'
                              }}
                              onClick={() => toggleExamExpansion(exam.exam_id)}
                            >
                              {/* Top Row: Exam Name on Left, Marks and Expand Icon on Right */}
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: { xs: 1, sm: 0.75 },
                                gap: 1
                              }}>
                                <Typography
                                  variant="h6"
                                  fontWeight={600}
                                  sx={{
                                    fontSize: { xs: '1rem', sm: '1.25rem' },
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {exam.exam_name}
                                </Typography>
                                <Box sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: { xs: 0.5, sm: 1 },
                                  flexShrink: 0
                                }}>
                                  <Typography
                                    variant="h5"
                                    fontWeight={700}
                                    color={exam.status === 'pass' ? 'success.main' : 'error.main'}
                                    sx={{
                                      fontSize: { xs: '1.25rem', sm: '1.75rem' },
                                      lineHeight: 1,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {exam.obtained_marks}/{exam.total_marks}
                                  </Typography>
                                  {expandedExams[exam.exam_id] ?
                                    <KeyboardArrowDownIcon fontSize="small" sx={{ flexShrink: 0 }} /> :
                                    <KeyboardArrowRightIcon fontSize="small" sx={{ flexShrink: 0 }} />
                                  }
                                </Box>
                              </Box>

                              {/* Middle Row: Chips (Type, Status, Percentage, Position) */}
                              <Box sx={{
                                display: 'flex',
                                gap: { xs: 0.5, sm: 1 },
                                mb: { xs: 1, sm: 1 },
                                flexWrap: 'wrap',
                                alignItems: 'center'
                              }}>
                                <Chip
                                  label={exam.exam_type}
                                  color="info"
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                    height: { xs: 20, sm: 24 },
                                    '& .MuiChip-label': {
                                      px: { xs: 0.75, sm: 1 }
                                    }
                                  }}
                                />
                                <Chip
                                  label={exam.status === 'pass' ? 'Passed' : 'Failed'}
                                  color={exam.status === 'pass' ? 'success' : 'error'}
                                  size="small"
                                  sx={{
                                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                    height: { xs: 20, sm: 24 },
                                    '& .MuiChip-label': {
                                      px: { xs: 0.75, sm: 1 }
                                    }
                                  }}
                                />
                                <Chip
                                  label={`${exam.percentage.toFixed(1)}%`}
                                  color={exam.status === 'pass' ? 'success' : 'error'}
                                  variant="filled"
                                  size="small"
                                  sx={{
                                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                    height: { xs: 20, sm: 24 },
                                    fontWeight: 600,
                                    '& .MuiChip-label': {
                                      px: { xs: 0.75, sm: 1 }
                                    }
                                  }}
                                />
                                {exam.position && exam.total_strength && (
                                  <Chip
                                    label={`Position: ${exam.position}/${exam.total_strength}`}
                                    color="warning"
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                      height: { xs: 20, sm: 24 },
                                      '& .MuiChip-label': {
                                        px: { xs: 0.75, sm: 1 }
                                      }
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>

                            <Collapse in={expandedExams[exam.exam_id]}>
                              <Box>
                                <Divider sx={{ my: 2 }} />

                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, fontSize: '0.75rem' }}>
                                    Subject-wise Performance
                                  </Typography>
                                  <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5,
                                    '& > *': {
                                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                      '&:last-child': {
                                        borderBottom: 'none'
                                      }
                                    }
                                  }}>
                                    {exam.subjects.map((subject) => (
                                      <Box
                                        key={subject.subject_id}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          py: 0.75,
                                          px: 0.5,
                                          '&:hover': {
                                            bgcolor: theme => alpha(theme.palette.primary.main, 0.03)
                                          }
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            flex: '1 1 auto',
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          {subject.subject?.name || 'Unknown Subject'}
                                        </Typography>
                                        <Box sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                          flexShrink: 0,
                                          ml: 1
                                        }}>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              fontSize: '0.7rem',
                                              color: 'text.secondary',
                                              whiteSpace: 'nowrap'
                                            }}
                                          >
                                            {subject.obtained_marks}/{subject.max_marks}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              fontSize: '0.7rem',
                                              fontWeight: 600,
                                              color: theme =>
                                                subject.percentage >= 80 ? theme.palette.success.main :
                                                  subject.percentage >= 60 ? theme.palette.info.main :
                                                    subject.percentage >= 40 ? theme.palette.warning.main :
                                                      theme.palette.error.main,
                                              minWidth: '32px',
                                              textAlign: 'right'
                                            }}
                                          >
                                            {subject.percentage.toFixed(0)}%
                                          </Typography>
                                          {subject.grade && (
                                            <Chip
                                              label={subject.grade}
                                              size="small"
                                              sx={{
                                                height: 18,
                                                fontSize: '0.65rem',
                                                '& .MuiChip-label': {
                                                  px: 0.75,
                                                  py: 0
                                                }
                                              }}
                                            />
                                          )}
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              </Box>
                            </Collapse>
                          </GlassCard>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </>
            )}
          </CustomTabPanel>

          <CustomTabPanel value={activeTab} index={3}>
            {tabDataLoading[3] ? (
              <TestRecordsSkeleton />
            ) : (
              <>
                {/* Session Selector */}
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Test Records
                  </Typography>
                  <Box sx={{ minWidth: 200 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={selectedTestSession || ''}
                      onChange={(e) => setSelectedTestSession(e.target.value ? parseInt(e.target.value as string) : null)}
                      variant="outlined"
                      sx={{
                        bgcolor: 'background.paper',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    >
                      {sessions.map((session) => (
                        <MenuItem key={session.id} value={session.id}>
                          {session.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Box>

                {!selectedTestSession ? (
                  <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      Select a Session
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please select a session from the dropdown above to view test records
                    </Typography>
                  </GlassCard>
                ) : testSessionLoading ? (
                  <TestRecordsContentSkeleton />
                ) : testSessionData.length > 0 ? (
                  <>
                    {/* Test Summary */}
                    <GlassCard sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Test Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary.main" fontWeight={700}>
                              {testSummaryData.totalSubjects}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Subjects
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main" fontWeight={700}>
                              {testSummaryData.totalTests}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Tests
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="info.main" fontWeight={700}>
                              {testSummaryData.totalObtainedMarks}/{testSummaryData.totalMaxMarks}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Marks
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main" fontWeight={700}>
                              {testSummaryData.totalPercentage.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Overall %
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </GlassCard>

                    {/* Subject-wise Test Records */}
                    <Grid container spacing={2}>
                      {testSessionData.map((subjectData, index) => {
                        const isExpanded = expandedTestCards.has(index);
                        const toggleCard = () => {
                          setExpandedTestCards(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(index)) {
                              newSet.delete(index);
                            } else {
                              newSet.add(index);
                            }
                            return newSet;
                          });
                        };

                        return (
                          <Grid item xs={12} md={6} lg={4} key={index}>
                            <GlassCard
                              sx={{
                                p: 2,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                }
                              }}
                            >
                              <Box
                                onClick={toggleCard}
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: isExpanded ? 1.5 : 0,
                                  pb: isExpanded ? 1 : 0,
                                  borderBottom: isExpanded ? '1px solid' : 'none',
                                  borderColor: 'divider',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  '&:hover': {
                                    bgcolor: theme => alpha(theme.palette.divider, 0.1),
                                    borderRadius: 1,
                                    mx: -1,
                                    px: 1
                                  },
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
                                  <Typography variant="subtitle1" fontWeight={600} noWrap>
                                    {subjectData.test_date} ({testSubjects.filter(date => subjectData.subject_scores[date] !== '-').length})
                                  </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                  <Box sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    border: '1px solid',
                                    borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                                    whiteSpace: 'nowrap',
                                    display: { xs: 'none', sm: 'block' }
                                  }}>
                                    {subjectData.obtained_marks}/{subjectData.total_marks}
                                  </Box>
                                  <Box sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    border: '1px solid',
                                    borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {subjectData.percentage.toFixed(1)}%
                                  </Box>
                                  <Box sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    bgcolor: subjectData.average_grade === 'A+' || subjectData.average_grade === 'A' ? '#10b981' :
                                      subjectData.average_grade === 'B+' || subjectData.average_grade === 'B' ? '#f59e0b' :
                                        subjectData.average_grade === 'C+' || subjectData.average_grade === 'C' ? '#f97316' : '#ef4444',
                                    color: 'white',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {subjectData.average_grade}
                                  </Box>
                                  <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'text.secondary',
                                    transition: 'transform 0.2s ease',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                  }}>
                                    <KeyboardArrowDownIcon fontSize="small" />
                                  </Box>
                                </Box>
                              </Box>

                              <Collapse in={isExpanded}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {testSubjects
                                    .filter(date => subjectData.subject_scores[date] !== '-')
                                    .map((date) => {
                                      const scoreStr = String(subjectData.subject_scores[date]);
                                      let scoreColor = 'text.primary';
                                      if (scoreStr.includes('/')) {
                                        const [obtained, max] = scoreStr.split('/').map(Number);
                                        const percentage = (obtained / max) * 100;
                                        if (percentage >= 80) scoreColor = '#10b981';
                                        else if (percentage >= 60) scoreColor = '#f59e0b';
                                        else scoreColor = '#ef4444';
                                      }

                                      return (
                                        <Box key={date} sx={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          p: 1,
                                          bgcolor: 'background.default',
                                          borderRadius: 1,
                                          border: '1px solid',
                                          borderColor: 'divider'
                                        }}>
                                          <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            {new Date(date).toLocaleDateString('en-GB')}
                                          </Typography>
                                          <Typography variant="body2" fontWeight={600} sx={{ color: scoreColor }}>
                                            {subjectData.subject_scores[date]}
                                          </Typography>
                                        </Box>
                                      );
                                    })}
                                </Box>
                              </Collapse>
                            </GlassCard>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                ) : (
                  <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      No Test Records Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This student has not appeared in any tests for the selected session.
                    </Typography>
                  </GlassCard>
                )}
              </>
            )}
          </CustomTabPanel>

          {!isStudent && (
            <CustomTabPanel value={activeTab} index={5}>
              {tabDataLoading[5] ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Grid container spacing={3}>
                    {/* Top Row - Summary Cards */}
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                          <StatBox status="total">
                            <AttachMoney className="stat-icon" />
                            <Box className="stat-header">
                              <AttachMoney className="icon" />
                              <Typography className="stat-label">Total Fine Generated</Typography>
                            </Box>
                            <Typography className="stat-value">Rs. {totalFines}</Typography>
                            <Box className="stat-percentage">
                              <ArrowForwardIcon sx={{ fontSize: '0.9rem' }} />
                              {fineHistory.length} Records
                            </Box>
                          </StatBox>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                          <StatBox status="present">
                            <CheckCircle className="stat-icon" />
                            <Box className="stat-header">
                              <CheckCircle className="icon" />
                              <Typography className="stat-label">Total Paid</Typography>
                            </Box>
                            <Typography className="stat-value">Rs. {fineDetails?.totalPaid || 0}</Typography>
                            <Box className="stat-percentage">
                              <ArrowForwardIcon sx={{ fontSize: '0.9rem' }} />
                              {totalFines > 0 ? Math.round(((fineDetails?.totalPaid || 0) / totalFines) * 100) : 0}% Paid
                            </Box>
                          </StatBox>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                          <StatBox status="absence">
                            <Cancel className="stat-icon" />
                            <Box className="stat-header">
                              <Cancel className="icon" />
                              <Typography className="stat-label">Outstanding Balance</Typography>
                            </Box>
                            <Typography className="stat-value">
                              Rs. {totalFines - (fineDetails?.totalPaid || 0) - (fineDetails?.totalRemission || 0)}
                            </Typography>
                            <Box className="stat-subvalue">
                              <EventBusy sx={{ fontSize: '0.9rem', opacity: 0.7 }} />
                              Remission: Rs. {fineDetails?.totalRemission || 0}
                            </Box>
                          </StatBox>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Bottom Row - History Tables */}
                    <Grid item xs={12} md={5}>
                      <GlassCard>
                        <Box sx={{
                          p: 2,
                          borderBottom: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <HistoryIcon color="primary" />
                          <Typography variant="h6" fontWeight={600}>
                            Fine History
                          </Typography>
                        </Box>
                        <Box sx={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => `${alpha(theme.palette.primary.main, 0.2)} transparent`,
                          '&::-webkit-scrollbar': {
                            width: '12px',
                            background: 'transparent'
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'transparent'
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: theme => alpha(theme.palette.primary.main, 0.2),
                            borderRadius: '6px',
                            border: theme => `3px solid ${theme.palette.background.paper}`,
                            '&:hover': {
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.3)
                            }
                          },
                          // Firefox specific styling
                          '@supports (-moz-appearance: none)': {
                            scrollbarWidth: 'thin',
                            scrollbarColor: theme => `${alpha(theme.palette.primary.main, 0.2)} transparent`
                          }
                        }}>
                          {fineHistory.map((record) => (
                            <Box
                              key={record.id}
                              sx={{
                                p: 2,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                '&:hover': {
                                  bgcolor: theme => alpha(theme.palette.primary.main, 0.02)
                                }
                              }}
                            >
                              <Box sx={{ minWidth: 100 }}>
                                <Typography variant="caption" color="textSecondary" display="block">
                                  {new Date(record.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block">
                                  {new Date(record.date).getFullYear()}
                                </Typography>
                              </Box>

                              <Box sx={{ flex: 1 }}>
                                <StatusChip status={record.status}>
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </StatusChip>
                                {record.remarks && (
                                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {record.remarks}
                                  </Typography>
                                )}
                              </Box>

                              <Typography
                                variant="subtitle2"
                                sx={{
                                  color: 'error.main',
                                  fontWeight: 600,
                                  minWidth: 100,
                                  textAlign: 'right'
                                }}
                              >
                                Rs. {record.fine_amount || 0}
                              </Typography>
                            </Box>
                          ))}
                          {fineHistory.length === 0 && (
                            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                              <Typography>No fine records found</Typography>
                            </Box>
                          )}
                        </Box>
                      </GlassCard>
                    </Grid>

                    <Grid item xs={12} md={7}>
                      <GlassCard>
                        <Box sx={{
                          p: 2,
                          borderBottom: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <AttachMoney color="primary" />
                          <Typography variant="h6" fontWeight={600}>
                            Payment History
                          </Typography>
                        </Box>
                        <Box sx={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'auto',
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => `${alpha(theme.palette.primary.main, 0.2)} transparent`,
                          '&::-webkit-scrollbar': {
                            width: '12px',
                            height: '12px',
                            background: 'transparent'
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'transparent'
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: theme => alpha(theme.palette.primary.main, 0.2),
                            borderRadius: '6px',
                            border: theme => `3px solid ${theme.palette.background.paper}`,
                            '&:hover': {
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.3)
                            }
                          },
                          // Firefox specific styling
                          '@supports (-moz-appearance: none)': {
                            scrollbarWidth: 'thin',
                            scrollbarColor: theme => `${alpha(theme.palette.primary.main, 0.2)} transparent`
                          }
                        }}>
                          <Box sx={{ overflowX: 'auto' }}>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Date</TableCell>
                                  <TableCell>Amount</TableCell>
                                  <TableCell>Remission</TableCell>
                                  <TableCell>Method</TableCell>
                                  <TableCell>Remarks</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {fineDetails?.payments?.map((payment: any) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>
                                      {payment.payment_date
                                        ? new Date(payment.payment_date).toLocaleDateString('en-GB', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                        : '-'}
                                    </TableCell>
                                    <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>
                                      Rs. {payment.amount}
                                    </TableCell>
                                    <TableCell>Rs. {payment.remission || 0}</TableCell>
                                    <TableCell>{payment.payment_method}</TableCell>
                                    <TableCell>{payment.remarks || '-'}</TableCell>
                                  </TableRow>
                                ))}
                                {(!fineDetails?.payments || fineDetails.payments.length === 0) && (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                                      No payment records found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>
                  </Grid>
                </>
              )}
            </CustomTabPanel>
          )}

          <CustomTabPanel value={activeTab} index={4}>
            {/* Session Selector */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Attendance Records
              </Typography>
              <Box sx={{ minWidth: 200 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedAttendanceSession || ''}
                  onChange={(e) => setSelectedAttendanceSession(e.target.value ? parseInt(e.target.value as string) : null)}
                  variant="outlined"
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                >
                  {attendanceSessions.map((session) => (
                    <MenuItem key={session.id} value={session.id}>
                      {session.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            {attendanceSessionLoading ? (
              <AttendanceContentSkeleton />
            ) : (
              <Grid container spacing={3}>
                {/* Left Column */}
                <Grid item xs={12} md={8}>
                  {/* Attendance Stats */}
                  <AttendanceStatsCard sx={{ mb: 3 }}>
                    <StatsHeader>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday sx={{ fontSize: '1.8rem', color: 'primary.main' }} />
                          Attendance Overview
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {attendanceStats?.total || 0} total tracked days
                        </Typography>
                      </Box>
                    </StatsHeader>

                    <StatsGrid container>
                      <Grid item>
                        <StatBox status="present">
                          <CheckCircle className="stat-icon" />
                          <Box className="stat-header">
                            <CheckCircle className="icon" />
                            <Typography className="stat-label">Present Days</Typography>
                          </Box>
                          <Typography className="stat-value">{attendanceStats?.present || 0}</Typography>
                          <Box className="stat-percentage">
                            <ArrowForwardIcon sx={{ fontSize: '0.9rem' }} />
                            {attendanceStats && attendanceStats.total > 0
                              ? Math.round(((attendanceStats.present + attendanceStats.late) / attendanceStats.total) * 100)
                              : 0}% Attendance Rate
                          </Box>
                        </StatBox>
                      </Grid>

                      <Grid item>
                        <StatBox status="late">
                          <Timer className="stat-icon" />
                          <Box className="stat-header">
                            <Timer className="icon" />
                            <Typography className="stat-label">Late Arrivals</Typography>
                          </Box>
                          <Typography className="stat-value">{attendanceStats?.late || 0}</Typography>
                          <Box className="stat-percentage">
                            <ArrowForwardIcon sx={{ fontSize: '0.9rem' }} />
                            {attendanceStats ? Math.round((attendanceStats.late / attendanceStats.total) * 100) : 0}% Tardiness Rate
                          </Box>
                        </StatBox>
                      </Grid>

                      <Grid item>
                        <StatBox status="absence">
                          <Cancel className="stat-icon" />
                          <Box className="stat-header">
                            <Cancel className="icon" />
                            <Typography className="stat-label">Total Absences</Typography>
                          </Box>
                          <Typography className="stat-value">
                            {(attendanceStats?.absent || 0) + (attendanceStats?.leave || 0)}
                          </Typography>
                          <Box className="stat-subvalue">
                            <EventBusy sx={{ fontSize: '0.9rem', opacity: 0.7 }} />
                            Including {attendanceStats?.leave || 0} granted leaves
                          </Box>
                          <Box className="stat-percentage">
                            <ArrowForwardIcon sx={{ fontSize: '0.9rem' }} />
                            {attendanceStats && attendanceStats.total > 0
                              ? Math.round(((attendanceStats.absent + attendanceStats.leave) / attendanceStats.total) * 100)
                              : 0}% Absence Rate
                          </Box>
                        </StatBox>
                      </Grid>

                      <Grid item>
                        <Box
                          sx={{
                            padding: theme.spacing(2.5),
                            borderRadius: theme.shape.borderRadius,
                            background: alpha('#ec4899', 0.08),
                            border: `1px solid ${alpha('#ec4899', 0.12)}`,
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: theme.spacing(1),
                            height: '100%',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 20px ${alpha('#ec4899', 0.15)}`,
                              background: alpha('#ec4899', 0.12),
                              '& .stat-icon': {
                                transform: 'scale(1.1) rotate(10deg)',
                                opacity: 0.2,
                              }
                            },
                            '& .stat-icon': {
                              position: 'absolute',
                              right: -10,
                              bottom: -10,
                              fontSize: '5rem',
                              color: '#ec4899',
                              opacity: 0.1,
                              transition: 'all 0.3s ease',
                              transform: 'rotate(-10deg)',
                            },
                            '& .stat-header': {
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing(1),
                              '& .icon': {
                                fontSize: '1.2rem',
                                color: '#ec4899',
                                background: alpha('#ec4899', 0.1),
                                padding: theme.spacing(0.8),
                                borderRadius: '8px',
                              }
                            },
                            '& .stat-value': {
                              fontSize: '2.2rem',
                              fontWeight: 700,
                              color: '#ec4899',
                              lineHeight: 1,
                            },
                            '& .stat-label': {
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              color: theme.palette.text.secondary,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            },
                          }}
                        >
                          <AccessTime className="stat-icon" />
                          <Box className="stat-header">
                            <AccessTime className="icon" />
                            <Typography className="stat-label">Half Leaves</Typography>
                          </Box>
                          <Typography className="stat-value">{halfLeavesMap.size}</Typography>
                          <Box className="stat-percentage" sx={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#ec4899',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing(0.5),
                            marginTop: 'auto',
                            background: alpha('#ec4899', 0.08),
                            padding: theme.spacing(0.5, 1),
                            borderRadius: '4px',
                            width: 'fit-content',
                          }}>
                            <ArrowForwardIcon sx={{ fontSize: '0.9rem' }} />
                            {attendanceStats?.total ? Math.round((halfLeavesMap.size / attendanceStats.total) * 100) : 0}% of total days
                          </Box>
                        </Box>
                      </Grid>
                    </StatsGrid>
                  </AttendanceStatsCard>

                  {/* Monthly Attendance */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight="600">
                      Monthly Attendance Breakdown
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {monthlyStats.map((month) => (
                      <Grid item xs={12} key={month.month}>
                        <MonthCard>
                          <MonthHeader>
                            <MonthTitle>
                              <Typography variant="h6" fontWeight="600">
                                {month.month.split(' ')[0]}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {month.month.split(' ')[1]}
                              </Typography>
                            </MonthTitle>
                            <MonthBadge>
                              <CalendarToday sx={{ fontSize: '0.875rem' }} />
                              <Box component="span">
                                {month.total} Days • {month.total > 0 ? Math.round(((month.present + month.late) / month.total) * 100) : 0}% Attendance
                              </Box>
                            </MonthBadge>
                          </MonthHeader>

                          <StatGrid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <StatBox status="present">
                                <CheckCircle className="stat-icon" />
                                <StatValue color={theme.palette.success.main}>
                                  {month.present}
                                  <span className="percentage">
                                    ({((month.present / month.total) * 100).toFixed(1)}%)
                                  </span>
                                </StatValue>
                                <StatLabel>Present</StatLabel>
                              </StatBox>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <StatBox status="absence">
                                <Cancel className="stat-icon" />
                                <StatValue color={theme.palette.error.main}>
                                  {month.absent + month.leave}
                                  <span className="percentage">
                                    ({(((month.absent + month.leave) / month.total) * 100).toFixed(1)}%)
                                  </span>
                                </StatValue>
                                <StatLabel>Absences</StatLabel>
                              </StatBox>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <StatBox status="late">
                                <Timer className="stat-icon" />
                                <StatValue color={theme.palette.warning.main}>
                                  {month.late}
                                  <span className="percentage">
                                    ({((month.late / month.total) * 100).toFixed(1)}%)
                                  </span>
                                </StatValue>
                                <StatLabel>Late</StatLabel>
                              </StatBox>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box
                                sx={{
                                  padding: theme.spacing(2.5),
                                  borderRadius: theme.shape.borderRadius,
                                  background: alpha('#ec4899', 0.08),
                                  border: `1px solid ${alpha('#ec4899', 0.12)}`,
                                  position: 'relative',
                                  overflow: 'hidden',
                                  transition: 'all 0.3s ease',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: theme.spacing(1),
                                  height: '100%',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 4px 20px ${alpha('#ec4899', 0.15)}`,
                                    background: alpha('#ec4899', 0.12),
                                    '& .stat-icon': {
                                      transform: 'scale(1.1) rotate(10deg)',
                                      opacity: 0.2,
                                    }
                                  },
                                  '& .stat-icon': {
                                    position: 'absolute',
                                    right: -10,
                                    bottom: -10,
                                    fontSize: '5rem',
                                    color: '#ec4899',
                                    opacity: 0.1,
                                    transition: 'all 0.3s ease',
                                    transform: 'rotate(-10deg)',
                                  },
                                }}
                              >
                                <AccessTime className="stat-icon" />
                                <StatValue color="#ec4899">
                                  {month.halfLeaves || 0}
                                  <span className="percentage">
                                    ({month.total > 0 ? ((month.halfLeaves || 0) / month.total * 100).toFixed(1) : 0}%)
                                  </span>
                                </StatValue>
                                <StatLabel>Half Leaves</StatLabel>
                              </Box>
                            </Grid>
                          </StatGrid>
                        </MonthCard>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Right Column */}
                <Grid item xs={12} md={4}>
                  <Grid container spacing={3}>
                    {/* Recent Attendance Section */}
                    <Grid item xs={12}>
                      <GlassCard>
                        <Box sx={{
                          p: 2,
                          borderBottom: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Typography variant="subtitle1" fontWeight="600">
                            Recent Attendance
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Last {Math.min(fineHistory.length, 20)} records
                          </Typography>
                        </Box>
                        <RecentAttendanceContainer>
                          {fineHistory.slice(0, 20).map((record) => {
                            const recordDate = new Date(record.date);
                            const dayName = recordDate.toLocaleDateString('en-US', { weekday: 'long' });
                            const formattedDate = recordDate.toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            });
                            const dateStr = record.date;
                            const halfLeave = halfLeavesMap.get(dateStr);

                            return (
                              <RecentAttendanceItem key={record.id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Box>
                                    <DayLabel>{dayName}</DayLabel>
                                    <DateLabel>
                                      <CalendarToday sx={{ fontSize: '0.875rem', opacity: 0.7 }} />
                                      {formattedDate}
                                    </DateLabel>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {halfLeave && (
                                      <Box
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          px: 0.75,
                                          py: 0.25,
                                          borderRadius: '4px',
                                          bgcolor: '#ec4899',
                                          color: 'white',
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          lineHeight: 1,
                                        }}
                                        title="Half Leave"
                                      >
                                        HL
                                      </Box>
                                    )}
                                    <StatusChip status={record.status}>
                                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                    </StatusChip>
                                  </Box>
                                </Box>
                                {halfLeave && (
                                  <Box sx={{
                                    mt: 0.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    color: '#ec4899',
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    bgcolor: alpha('#ec4899', 0.1),
                                    width: 'fit-content'
                                  }}>
                                    <AccessTime sx={{ fontSize: '0.75rem' }} />
                                    Half Leave
                                    {halfLeave.departure_time && ` (Departed: ${halfLeave.departure_time})`}
                                  </Box>
                                )}
                                {record.remarks && (
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    sx={{
                                      display: 'block',
                                      mt: 0.5,
                                      fontSize: '0.75rem',
                                      fontStyle: 'italic'
                                    }}
                                  >
                                    {record.remarks}
                                  </Typography>
                                )}
                                {(record.fine_amount ?? 0) > 0 && (
                                  <Box sx={{
                                    mt: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    color: 'error.main',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    bgcolor: theme => alpha(theme.palette.error.main, 0.08),
                                    width: 'fit-content'
                                  }}>
                                    <AttachMoney sx={{ fontSize: '0.875rem' }} />
                                    Fine: Rs. {record.fine_amount}
                                  </Box>
                                )}
                              </RecentAttendanceItem>
                            );
                          })}
                          {fineHistory.length === 0 && (
                            <Box sx={{
                              p: 4,
                              textAlign: 'center',
                              color: 'text.secondary'
                            }}>
                              <Typography variant="body2">
                                No attendance records found
                              </Typography>
                            </Box>
                          )}
                        </RecentAttendanceContainer>
                      </GlassCard>
                    </Grid>

                    {/* Weekly Trend */}
                    <Grid item xs={12}>
                      <GlassCard>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle1" fontWeight="600">
                            Weekly Day Patterns
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Attendance patterns by day of week
                          </Typography>
                        </Box>
                        <Box sx={{ p: 2, height: '250px', display: 'flex', alignItems: 'flex-end' }}>
                          <Box sx={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: 2,
                            height: '200px',
                            position: 'relative'
                          }}>
                            {weeklyAttendance.map((data) => {
                              const { day, status, count, details, percentages } = data;

                              const getStatusColor = (status: string | null, theme: Theme) => {
                                if (!status) return alpha(theme.palette.divider, 0.1);
                                switch (status.toLowerCase()) {
                                  case 'present': return theme.palette.success.main;
                                  case 'late': return theme.palette.warning.main;
                                  case 'absent': return theme.palette.error.main;
                                  case 'leave': return theme.palette.info.main;
                                  case 'halfleave': return '#ec4899';
                                  default: return alpha(theme.palette.divider, 0.1);
                                }
                              };

                              return (
                                <Box
                                  key={day}
                                  sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                    position: 'relative'
                                  }}
                                >
                                  <Tooltip
                                    title={
                                      <Box sx={{ p: 1 }}>
                                        <Typography variant="caption" display="block" sx={{ fontWeight: 600, mb: 1 }}>
                                          {day} Statistics
                                        </Typography>
                                        {details && (
                                          <>
                                            <Typography variant="caption" display="block" color="success.main">
                                              Present: {details.present} ({percentages.present.toFixed(1)}%)
                                            </Typography>
                                            <Typography variant="caption" display="block" color="warning.main">
                                              Late: {details.late} ({percentages.late.toFixed(1)}%)
                                            </Typography>
                                            <Typography variant="caption" display="block" color="error.main">
                                              Absent: {details.absent} ({percentages.absent.toFixed(1)}%)
                                            </Typography>
                                            <Typography variant="caption" display="block" color="info.main">
                                              Leave: {details.leave} ({percentages.leave.toFixed(1)}%)
                                            </Typography>
                                            <Typography variant="caption" display="block" sx={{ color: '#ec4899' }}>
                                              Half Leave: {details.halfLeave} ({percentages.halfLeave.toFixed(1)}%)
                                            </Typography>
                                            <Divider sx={{ my: 1 }} />
                                            <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                                              Total Records: {count + details.halfLeave}
                                            </Typography>
                                          </>
                                        )}
                                      </Box>
                                    }
                                    arrow
                                    placement="top"
                                  >
                                    <Box sx={{
                                      width: '100%',
                                      height: '150px',
                                      position: 'relative',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      border: theme => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s ease',
                                      '&:hover': {
                                        transform: 'translateY(-2px)'
                                      }
                                    }}>
                                      {/* Stacked bars for each status */}
                                      {details && (
                                        <>
                                          <Box sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${percentages.present}%`,
                                            bgcolor: theme => alpha(theme.palette.success.main, 0.3),
                                            transition: 'height 0.3s ease'
                                          }} />
                                          <Box sx={{
                                            position: 'absolute',
                                            bottom: `${percentages.present}%`,
                                            left: 0,
                                            width: '100%',
                                            height: `${percentages.late}%`,
                                            bgcolor: theme => alpha(theme.palette.warning.main, 0.3),
                                            transition: 'height 0.3s ease'
                                          }} />
                                          <Box sx={{
                                            position: 'absolute',
                                            bottom: `${percentages.present + percentages.late}%`,
                                            left: 0,
                                            width: '100%',
                                            height: `${percentages.absent}%`,
                                            bgcolor: theme => alpha(theme.palette.error.main, 0.3),
                                            transition: 'height 0.3s ease'
                                          }} />
                                          <Box sx={{
                                            position: 'absolute',
                                            bottom: `${percentages.present + percentages.late + percentages.absent}%`,
                                            left: 0,
                                            width: '100%',
                                            height: `${percentages.leave}%`,
                                            bgcolor: theme => alpha(theme.palette.info.main, 0.3),
                                            transition: 'height 0.3s ease'
                                          }} />
                                          <Box sx={{
                                            position: 'absolute',
                                            bottom: `${percentages.present + percentages.late + percentages.absent + percentages.leave}%`,
                                            left: 0,
                                            width: '100%',
                                            height: `${percentages.halfLeave}%`,
                                            bgcolor: alpha('#ec4899', 0.3),
                                            transition: 'height 0.3s ease'
                                          }} />
                                        </>
                                      )}
                                    </Box>
                                  </Tooltip>
                                  <Box sx={{ textAlign: 'center' }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'text.primary',
                                        fontWeight: 600,
                                        display: 'block'
                                      }}
                                    >
                                      {day}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: theme => getStatusColor(status, theme),
                                        fontSize: '0.7rem',
                                        display: 'block',
                                        mt: 0.5,
                                        fontWeight: 500
                                      }}
                                    >
                                      {count + details.halfLeave > 0 ? `${count + details.halfLeave} Days` : 'No Data'}
                                    </Typography>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>

                    {/* Attendance Pattern */}
                    <Grid item xs={12}>
                      <GlassCard>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle1" fontWeight="600">
                            Attendance Pattern
                          </Typography>
                        </Box>
                        <Box sx={{ p: 2 }}>
                          <Grid container spacing={2}>
                            {attendancePattern.map((stat) => {
                              const color = stat.colorKey === 'secondary' ? '#ec4899' : undefined;

                              return (
                                <Grid item xs={12} key={stat.label}>
                                  <Box sx={{ mb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                      <Typography variant="caption" color="textSecondary">
                                        {stat.label}
                                      </Typography>
                                      <Typography variant="caption" sx={{
                                        color: color || (theme => {
                                          const paletteColor = (theme.palette as any)[stat.colorKey] as { main: string } | undefined;
                                          return paletteColor?.main || theme.palette.primary.main;
                                        })
                                      }}>
                                        {stat.count} days ({stat.value})
                                      </Typography>
                                    </Box>
                                    <Box sx={{
                                      width: '100%',
                                      height: '4px',
                                      bgcolor: color ? alpha(color, 0.1) : (theme => {
                                        const paletteColor = (theme.palette as any)[stat.colorKey] as { main: string } | undefined;
                                        return alpha(paletteColor?.main || theme.palette.primary.main, 0.1);
                                      }),
                                      borderRadius: '2px',
                                      overflow: 'hidden'
                                    }}>
                                      <Box sx={{
                                        width: stat.value,
                                        height: '100%',
                                        bgcolor: color || (theme => {
                                          const paletteColor = (theme.palette as any)[stat.colorKey] as { main: string } | undefined;
                                          return paletteColor?.main || theme.palette.primary.main;
                                        }),
                                        transition: 'width 1s ease-in-out'
                                      }} />
                                    </Box>
                                  </Box>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                      </GlassCard>
                    </Grid>

                    {/* Yearly Overview */}
                    <Grid item xs={12}>
                      <GlassCard>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle1" fontWeight="600">
                            Yearly Overview
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date().getFullYear()} Attendance
                          </Typography>
                        </Box>
                        <Box sx={{ p: 2 }}>
                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(20px, 1fr))',
                            gap: 0.5
                          }}>
                            {yearlyOverview.map((week, i) => (
                              <Tooltip
                                key={i}
                                title={
                                  <>
                                    <Typography variant="caption" display="block">
                                      {week.startDate.toLocaleDateString()} - {week.endDate.toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Attendance: {Math.round(week.percentage * 100)}%
                                    </Typography>
                                  </>
                                }
                                arrow
                              >
                                <Box
                                  sx={{
                                    width: '100%',
                                    paddingBottom: '100%',
                                    bgcolor: theme => {
                                      if (week.percentage === 0) return alpha(theme.palette.divider, 0.1);
                                      if (week.percentage > 0.8) return alpha(theme.palette.success.main, 0.8);
                                      if (week.percentage > 0.6) return alpha(theme.palette.success.main, 0.6);
                                      if (week.percentage > 0.4) return alpha(theme.palette.success.main, 0.4);
                                      return alpha(theme.palette.success.main, 0.2);
                                    },
                                    borderRadius: '2px',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      transform: 'scale(1.2)',
                                      zIndex: 1
                                    }
                                  }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </Box>
                      </GlassCard>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </CustomTabPanel>
        </Box>
      </GlassCard>
    </ProfileContainer>
  );
}; 