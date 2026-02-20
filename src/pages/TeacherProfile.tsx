import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { styled, useTheme, Theme, PaletteColor, PaletteColorOptions, keyframes, alpha } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
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
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Person,
  School,
  CalendarToday,
  LocationOn,
  Phone,
  Email,
  Cake,
  Bloodtype,
  Work,
  Class,
  Groups,
  AccessTime,
  CheckCircle,
  Cancel,
  EventBusy,
  Timer,
  Assignment,
  History as HistoryIcon,
  Assessment,
  TrendingUp,
  Edit as EditIcon,
  Close as CloseIcon,
  PhotoCamera,
} from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AttachMoney from '@mui/icons-material/AttachMoney';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { useProgress } from '../components/Layout';
import { fetchAllRows } from '../utils/paginationHelper';
import { PageHeaderContext } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { homeworkDiaryService } from '../services/homeworkDiaryService';
import imageCompression from 'browser-image-compression';
import { AccountCircle } from '@mui/icons-material';
import { fetchRenderSettings, isTeacherTabVisible, isTeacherSummaryCardVisible, RenderSettings } from '../services/renderSettingsService';
import { TEACHER_PROFILE_TABS, TEACHER_PROFILE_SUMMARY_CARDS } from '../config/renderSettingsConfig';
import Loader from '../components/Loader';

const pulseAnimation = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
`;

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
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
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
  [theme.breakpoints.up('sm')]: {
    alignItems: 'center',
  },
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
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

interface ProfileAvatarProps {
  src?: string;
  theme?: Theme;
}

const ProfileAvatar = styled(Avatar)<ProfileAvatarProps>(({ theme }) => ({
  width: 75,
  height: 75,
  fontSize: '1.875rem',
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
    width: 60,
    height: 60,
    fontSize: '1.5rem',
    borderRadius: theme.shape.borderRadius * 2,
    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.3)}`,
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

const TabsContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
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

// Timetable styled components (from MyTimetable.tsx)
const TimetableContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  borderRadius: '16px',
  padding: theme.spacing(3),
  boxShadow: theme.shadows[2],
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

const TimetableGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: theme.spacing(2.5),
  marginTop: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    gap: theme.spacing(2),
  },
}));

const PeriodCard = styled(Box)(({ theme }) => ({
  background: '#e3f2fd',
  borderRadius: '12px',
  padding: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  border: '1px solid #bbdefb',
  position: 'relative',
}));

const PeriodHeader = styled(Box)(({ theme }) => ({
  background: '#ff6b35',
  borderRadius: '8px',
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  boxShadow: '0 2px 4px rgba(255, 107, 53, 0.3)',
  textAlign: 'center',
}));

const PeriodNumber = styled(Typography)(({ theme }) => ({
  color: 'white',
  fontSize: '1.1rem',
  fontWeight: 700,
  marginBottom: '2px',
}));

const PeriodTime = styled(Typography)(({ theme }) => ({
  color: 'white',
  fontSize: '0.85rem',
  fontWeight: 500,
  opacity: 0.9,
}));

const PeriodContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing(1),
  width: '100%',
}));

const ContentCard = styled(Box)(({ theme }) => ({
  background: '#2196f3',
  borderRadius: '8px',
  padding: theme.spacing(1.5),
  boxShadow: '0 2px 4px rgba(33, 150, 243, 0.3)',
  textAlign: 'center',
  minHeight: '50px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
}));

const ContentText = styled(Typography)(({ theme }) => ({
  color: 'white',
  fontSize: '0.95rem',
  fontWeight: 700,
  lineHeight: 1.2,
  wordBreak: 'break-word',
}));

const BreakCard = styled(Box)(({ theme }) => ({
  background: '#e3f2fd',
  borderRadius: '12px',
  padding: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  border: '1px solid #bbdefb',
  textAlign: 'center',
  gridColumn: '1 / -1',
}));

const BreakHeader = styled(Box)(({ theme }) => ({
  background: '#f59e0b',
  borderRadius: '8px',
  padding: theme.spacing(2),
  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
}));

const BreakText = styled(Typography)(({ theme }) => ({
  color: 'white',
  fontSize: '1.2rem',
  fontWeight: 700,
  marginBottom: '4px',
}));

const BreakTime = styled(Typography)(({ theme }) => ({
  color: 'white',
  fontSize: '0.9rem',
  fontWeight: 500,
  opacity: 0.9,
}));

const FreePeriodCard = styled(PeriodCard)(({ theme }) => ({
  background: '#f5f5f5',
  border: '1px solid #e0e0e0',
  opacity: 0.8,
}));

const FreePeriodHeader = styled(Box)(({ theme }) => ({
  background: '#9e9e9e',
  borderRadius: '8px',
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  boxShadow: '0 2px 4px rgba(158, 158, 158, 0.3)',
  textAlign: 'center',
}));

const FreePeriodContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '50px',
  color: '#757575',
  fontStyle: 'italic',
  fontSize: '0.95rem',
  fontWeight: 500,
  background: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
}));

const NoTimetableMessage = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(7.5, 2.5),
  color: theme.palette.text.secondary,
  fontSize: '1.2rem',
}));

const NoTimetableIcon = styled(Box)(({ theme }) => ({
  fontSize: '4rem',
  marginBottom: theme.spacing(2),
  opacity: 0.6,
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
    [theme.breakpoints.down('sm')]: {
      gap: theme.spacing(1),
      padding: theme.spacing(1.25),
    }
  }
}));

const InfoItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  padding: theme.spacing(1.25, 1.5),
  borderRadius: 10,
  transition: 'all 0.2s ease',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  background: alpha(theme.palette.background.paper, 0.4),
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.08),
    borderColor: alpha(theme.palette.primary.main, 0.2),
    transform: 'translateY(-1px)',
    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
  '& .icon-container': {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    flexShrink: 0,
    [theme.breakpoints.down('sm')]: {
      width: 28,
      height: 28,
      borderRadius: 8,
    }
  },
  '& .info-content': {
    flex: 1,
    minWidth: 0,
  },
  '& .info-label': {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    fontWeight: 500,
    marginBottom: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.6rem',
      marginBottom: '1px',
      letterSpacing: '0.3px',
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
    gap: theme.spacing(0.75),
    padding: theme.spacing(0.75, 1),
    borderRadius: 8,
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
      case 'half_day': return alpha(theme.palette.secondary.main, 0.1);
      default: return alpha(theme.palette.grey[500], 0.1);
    }
  })(),
  color: (() => {
    switch (status) {
      case 'present': return theme.palette.success.main;
      case 'absent': return theme.palette.error.main;
      case 'late': return theme.palette.warning.main;
      case 'leave': return theme.palette.info.main;
      case 'half_day': return theme.palette.secondary.main;
      default: return theme.palette.grey[500];
    }
  })(),
  border: `1px solid ${(() => {
    switch (status) {
      case 'present': return alpha(theme.palette.success.main, 0.2);
      case 'absent': return alpha(theme.palette.error.main, 0.2);
      case 'late': return alpha(theme.palette.warning.main, 0.2);
      case 'leave': return alpha(theme.palette.info.main, 0.2);
      case 'half_day': return alpha(theme.palette.secondary.main, 0.2);
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

// Edit Modal Styled Components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    background: theme.palette.mode === 'dark' 
      ? theme.palette.background.paper 
      : theme.palette.background.paper,
    maxWidth: '900px',
    width: '90%',
    margin: '60px 16px 16px',
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

const DialogHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px',
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

const DialogTitleStyled = styled(Box)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  textShadow: theme.palette.mode === 'dark'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  maxHeight: 'calc(100vh - 160px)',
  overflowY: 'auto',
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
      padding: '10px 12px',
      fontSize: '0.9rem',
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

const FormActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '12px 24px',
  borderTop: `1px solid ${theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'}`,
  background: theme.palette.mode === 'dark'
    ? theme.palette.background.paper
    : theme.palette.background.paper,
  backdropFilter: 'blur(8px)',
  position: 'sticky',
  bottom: 0,
  zIndex: 10,
  '& .MuiButton-root': {
    borderRadius: '8px',
    textTransform: 'none',
    padding: '6px 16px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease'
  }
}));

const ModalSectionContainer = styled(Box)({
  marginBottom: '16px'
});

const ModalSectionTitle = styled(Box)(({ theme }) => ({
  fontSize: '1.2rem',
  fontWeight: 700,
  color: theme.palette.primary.main,
  marginBottom: '16px',
  paddingBottom: '8px',
  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
}));

const PhotoUploadSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  marginBottom: '24px',
  borderRadius: '12px',
  border: `2px dashed ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(0, 0, 0, 0.2)'}`,
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.02)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    background: theme.palette.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.1)'
      : 'rgba(99, 102, 241, 0.05)',
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
  }
}));

const AvatarContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginBottom: '12px',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '50%',
    border: `3px solid ${theme.palette.primary.main}`,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover::after': {
    opacity: 0.3,
  }
}));

const UploadIconOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  border: `3px solid ${theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white'}`,
  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.2)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
  }
}));


interface Teacher {
  id: number;
  name: string;
  role: string;
  mobile?: string;
  picture_url?: string;
  joining_date?: string;
  salary?: number;
  father_name?: string;
  gender?: string;
  experience?: string;
  national_id?: string;
  education?: string;
  religion?: string;
  blood_group?: string;
  email?: string;
  dob?: string;
  address?: string;
  school_id: number;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  leave: number;
  half_day: number;
  total: number;
}

interface MonthlyStats {
  month: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  half_day: number;
  halfLeaves: number;
}

interface AttendanceRecord {
  date: string;
  status: string;
  remarks?: string;
}

interface WeeklyAttendanceData {
  day: string;
  status: AttendanceRecord['status'] | null;
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

interface AttendancePatternStat {
  label: string;
  value: string;
  count: number;
  colorKey: 'success' | 'warning' | 'error' | 'info' | 'secondary';
}

// Helper functions for attendance analysis
const getWeeklyAttendance = (
  records: AttendanceRecord[],
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
      const status = record.status.toLowerCase();
      if (status === 'present') weeklyData[dayIndex].details.present++;
      else if (status === 'absent') weeklyData[dayIndex].details.absent++;
      else if (status === 'late') weeklyData[dayIndex].details.late++;
      else if (status === 'leave') weeklyData[dayIndex].details.leave++;
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
        dominantStatus.status : 
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
  records: AttendanceRecord[],
  halfLeavesCount: number = 0
): AttendancePatternStat[] => {
  const total = records.length + halfLeavesCount;
  if (total === 0) return [];

  const onTime = records.filter(r => r.status.toLowerCase() === 'present').length;
  const late = records.filter(r => r.status.toLowerCase() === 'late').length;
  const leaves = records.filter(r => r.status.toLowerCase() === 'leave').length;
  const absents = records.filter(r => r.status.toLowerCase() === 'absent').length;

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
  records: AttendanceRecord[],
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

    const presentCount = weekRecords.filter(r => r.status.toLowerCase() === 'present' || r.status.toLowerCase() === 'late').length;
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

// Score calculation functions
const calculateTeacherScore = (
  attendanceStats: AttendanceStats | null,
  halfLeavesCount: number = 0,
  homeworkSummary?: { totalAssignments: number; averagePerDay: number } | null,
  testSummary?: { totalTests: number; totalStudents: number; averagePercentage: number } | null,
  enableDiaryDeduction: boolean = false,
  enableAttendanceDeduction: boolean = true,
  enableTestDeduction: boolean = false
): number => {
  let score = 10; // Start with perfect score

  // Calculate attendance deductions based on actual counts (if enabled)
  if (enableAttendanceDeduction && attendanceStats) {
    // Absent: deduct 0.2 per occurrence
    score -= attendanceStats.absent * 0.2;

    // Leave: deduct 0.1 per occurrence
    score -= attendanceStats.leave * 0.1;

    // Late: deduct 0.1 per occurrence
    score -= attendanceStats.late * 0.1;

    // Half Leave: deduct 0.05 per occurrence
    score -= halfLeavesCount * 0.05;
  }

  // Calculate diary assignment deduction (optional)
  if (enableDiaryDeduction && homeworkSummary && attendanceStats) {
    // Calculate average assignments per day based on present and late attendance days
    const attendedDays = (attendanceStats.present || 0) + (attendanceStats.late || 0);
    
    if (attendedDays > 0 && homeworkSummary.totalAssignments > 0) {
      const averageAssignmentsPerDay = homeworkSummary.totalAssignments / attendedDays;
      
      // Deduction logic:
      // - If average >= 3: no deduction
      // - If average < 3 and >= 2: deduct 0.5
      // - If average < 2 and >= 1: deduct 1
      // - If average < 1: deduct 2
      if (averageAssignmentsPerDay < 1) {
        score -= 2;
      } else if (averageAssignmentsPerDay < 2) {
        score -= 1;
      } else if (averageAssignmentsPerDay < 3) {
        score -= 0.5;
      }
      // If average >= 3, no deduction
    }
  }

  // Calculate test performance deduction (optional)
  if (enableTestDeduction && testSummary && testSummary.totalTests > 0) {
    const averagePercentage = testSummary.averagePercentage;
    
    // Deduction logic based on average test performance (relaxed):
    // - If average >= 60%: no deduction (acceptable performance)
    // - If average < 60% and >= 50%: deduct 0.3 (below average)
    // - If average < 50% and >= 40%: deduct 0.5 (poor performance)
    // - If average < 40%: deduct 1 (very poor performance)
    if (averagePercentage < 40) {
      score -= 1;
    } else if (averagePercentage < 50) {
      score -= 0.5;
    } else if (averagePercentage < 60) {
      score -= 0.3;
    }
    // If average >= 60%, no deduction
  }

  // Ensure score doesn't go below 0
  return Math.max(0, Math.round(score * 10) / 10);
};

interface ScoreBreakdown {
  baseScore: number;
  attendanceDeduction: number;
  diaryDeduction: number;
  testDeduction: number;
  totalDeduction: number;
  finalScore: number;
  attendanceDetails: {
    absent: number;
    leave: number;
    late: number;
    halfLeave: number;
  };
  diaryDetails: {
    averagePerDay: number;
    deductionReason: string;
  } | null;
  testDetails: {
    averagePercentage: number;
    deductionReason: string;
  } | null;
}

const calculateScoreBreakdown = (
  attendanceStats: AttendanceStats | null,
  halfLeavesCount: number = 0,
  homeworkSummary?: { totalAssignments: number; averagePerDay: number } | null,
  testSummary?: { totalTests: number; totalStudents: number; averagePercentage: number } | null,
  enableDiaryDeduction: boolean = false,
  enableAttendanceDeduction: boolean = true,
  enableTestDeduction: boolean = false
): ScoreBreakdown => {
  const baseScore = 10;
  let attendanceDeduction = 0;
  let diaryDeduction = 0;
  let testDeduction = 0;

  const attendanceDetails = {
    absent: 0,
    leave: 0,
    late: 0,
    halfLeave: 0,
  };

  let diaryDetails: { averagePerDay: number; deductionReason: string } | null = null;
  let testDetails: { averagePercentage: number; deductionReason: string } | null = null;

  // Calculate attendance deductions
  if (enableAttendanceDeduction && attendanceStats) {
    attendanceDetails.absent = attendanceStats.absent || 0;
    attendanceDetails.leave = attendanceStats.leave || 0;
    attendanceDetails.late = attendanceStats.late || 0;
    attendanceDetails.halfLeave = halfLeavesCount;

    attendanceDeduction = 
      (attendanceDetails.absent * 0.2) +
      (attendanceDetails.leave * 0.1) +
      (attendanceDetails.late * 0.1) +
      (attendanceDetails.halfLeave * 0.05);
  }

  // Calculate diary assignment deduction
  if (enableDiaryDeduction && homeworkSummary && attendanceStats) {
    const attendedDays = (attendanceStats.present || 0) + (attendanceStats.late || 0);
    
    if (attendedDays > 0 && homeworkSummary.totalAssignments > 0) {
      const averageAssignmentsPerDay = homeworkSummary.totalAssignments / attendedDays;
      diaryDetails = { averagePerDay: averageAssignmentsPerDay, deductionReason: '' };
      
      if (averageAssignmentsPerDay < 1) {
        diaryDeduction = 2;
        diaryDetails.deductionReason = 'Average < 1 assignment per day';
      } else if (averageAssignmentsPerDay < 2) {
        diaryDeduction = 1;
        diaryDetails.deductionReason = 'Average < 2 assignments per day';
      } else if (averageAssignmentsPerDay < 3) {
        diaryDeduction = 0.5;
        diaryDetails.deductionReason = 'Average < 3 assignments per day';
      } else {
        diaryDetails.deductionReason = 'No deduction (average ≥ 3)';
      }
    }
  }

  // Calculate test performance deduction
  if (enableTestDeduction && testSummary && testSummary.totalTests > 0) {
    const averagePercentage = testSummary.averagePercentage;
    testDetails = { averagePercentage, deductionReason: '' };
    
    if (averagePercentage < 40) {
      testDeduction = 1;
      testDetails.deductionReason = 'Average < 40%';
    } else if (averagePercentage < 50) {
      testDeduction = 0.5;
      testDetails.deductionReason = 'Average < 50%';
    } else if (averagePercentage < 60) {
      testDeduction = 0.3;
      testDetails.deductionReason = 'Average < 60%';
    } else {
      testDetails.deductionReason = 'No deduction (average ≥ 60%)';
    }
  }

  const totalDeduction = attendanceDeduction + diaryDeduction + testDeduction;
  const finalScore = Math.max(0, Math.round((baseScore - totalDeduction) * 10) / 10);

  return {
    baseScore,
    attendanceDeduction: Math.round(attendanceDeduction * 10) / 10,
    diaryDeduction: Math.round(diaryDeduction * 10) / 10,
    testDeduction: Math.round(testDeduction * 10) / 10,
    totalDeduction: Math.round(totalDeduction * 10) / 10,
    finalScore,
    attendanceDetails,
    diaryDetails,
    testDetails,
  };
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

export const TeacherProfile: React.FC<{ isMyProfile?: boolean }> = ({ isMyProfile = false }) => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showToast } = useToast();
  const { setPageHeader } = React.useContext(PageHeaderContext);
  
  // For my-profile route, use staff_id from user context instead of URL
  const staffId = isMyProfile && user?.staff_id ? user.staff_id.toString() : id;
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendanceData[]>([]);
  const [attendancePattern, setAttendancePattern] = useState<AttendancePatternStat[]>([]);
  const [yearlyOverview, setYearlyOverview] = useState<{ startDate: Date; endDate: Date; percentage: number }[]>([]);
  const [assignedSections, setAssignedSections] = useState<Array<{ id: number; name: string; class_id: number; class_name: string }>>([]);
  const [activeTab, setActiveTab] = useState(0); // Attendance tab is now index 0
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [halfLeavesMap, setHalfLeavesMap] = useState<Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>>(new Map());
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [timetablePeriods, setTimetablePeriods] = useState<number>(0);
  const [testSummary, setTestSummary] = useState<{
    totalTests: number;
    totalStudents: number;
    averagePercentage: number;
    testsBySubject: Array<{ subject: string; count: number }>;
    recentTests: Array<{ id: number; name: string; subject: string; class: string; date: string }>;
  }>({
    totalTests: 0,
    totalStudents: 0,
    averagePercentage: 0,
    testsBySubject: [],
    recentTests: [],
  });
  const [teacherScore, setTeacherScore] = useState<number>(10);
  const [enableDiaryScoreDeduction, setEnableDiaryScoreDeduction] = useState<boolean>(false);
  const [enableAttendanceDeduction, setEnableAttendanceDeduction] = useState<boolean>(true);
  const [enableTestDeduction, setEnableTestDeduction] = useState<boolean>(false);
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState<boolean>(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [homeworkSummary, setHomeworkSummary] = useState<{
    totalAssignments: number;
    averagePerDay: number;
    assignmentsBySubject: Array<{ subject: string; count: number }>;
    assignmentsByClass: Array<{ class: string; count: number }>;
    recentAssignments: Array<{ id: number; subject: string; class: string; date: string; description: string }>;
  }>({
    totalAssignments: 0,
    averagePerDay: 0,
    assignmentsBySubject: [],
    assignmentsByClass: [],
    recentAssignments: [],
  });
  const [testMonthlyData, setTestMonthlyData] = useState<Array<{
    month: string;
    monthKey: string;
    weeks: Array<{
      week: string;
      weekNumber: number;
      tests: number;
      classes: Array<{ className: string; testCount: number }>;
    }>;
    totalTests: number;
  }>>([]);
  const [testAnalysisSessionId, setTestAnalysisSessionId] = useState<number | null>(null);
  const [diaryAnalysisSessionId, setDiaryAnalysisSessionId] = useState<number | null>(null);
  const [diaryMonthlyData, setDiaryMonthlyData] = useState<Array<{
    month: string;
    monthKey: string;
    weeks: Array<{
      week: string;
      weekNumber: number;
      assignments: number;
      classes: Array<{ className: string; assignmentCount: number }>;
    }>;
    totalAssignments: number;
  }>>([]);
  const [diaryAnalysisData, setDiaryAnalysisData] = useState<{
    totalAssignments: number;
    totalStudents: number;
    averagePerDay: number;
    assignmentsBySubject: Array<{ subject: string; count: number }>;
    assignmentsByClass: Array<{ class: string; count: number }>;
    recentAssignments: Array<{ id: number; subject: string; class: string; date: string; description: string }>;
  }>({
    totalAssignments: 0,
    totalStudents: 0,
    averagePerDay: 0,
    assignmentsBySubject: [],
    assignmentsByClass: [],
    recentAssignments: [],
  });
  const [sessions, setSessions] = useState<Array<{ id: number; name: string; is_active: boolean }>>([]);
  const [tabDataLoaded, setTabDataLoaded] = useState<{ [key: number]: boolean }>({});
  const [tabDataLoading, setTabDataLoading] = useState<{ [key: number]: boolean }>({});
  const isLoadingRef = useRef(false);
  const lastSessionIdRef = useRef<number | null>(null);
  const diaryLoadingRef = useRef(false);
  const lastDiarySessionIdRef = useRef<number | null>(null);
  const { startProgress, setProgress, completeProgress } = useProgress();
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    role: '',
    picture: null as string | null,
    pictureFile: null as File | null,
    joiningDate: '',
    fatherName: '',
    gender: '',
    experience: '',
    nationalId: '',
    education: '',
    religion: '',
    bloodGroup: '',
    email: '',
    dob: '',
    address: '',
  });
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  
  // Constants for form
  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
  const RELIGION_OPTIONS = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
  const ROLE_OPTIONS = ['Principal', 'Management Staff', 'Teacher', 'Accountant', 'Store Manager', 'Other'];
  
  // Check if current user is viewing their own profile
  const isOwnProfile = user?.staff_id && staffId && parseInt(staffId) === user.staff_id;

  // Fetch render settings
  useEffect(() => {
    const fetchRenderSettingsData = async () => {
      if (!user?.school_id) return;
      
      try {
        const settings = await fetchRenderSettings(user.school_id);
        setRenderSettings(settings);
      } catch (error) {
      }
    };

    if (user?.school_id) {
      fetchRenderSettingsData();
    }
  }, [user?.school_id]);

  // Fetch individual teacher score deduction settings
  useEffect(() => {
    const fetchTeacherScoreSettings = async () => {
      if (!user?.school_id || !staffId) return;
      
      try {
        const { data, error } = await supabase
          .from('teacher_score_deduction_settings')
          .select('enable_attendance_deduction, enable_diary_deduction, enable_test_deduction')
          .eq('school_id', user.school_id)
          .eq('teacher_id', parseInt(staffId))
          .single();

        if (!error && data) {
          // Use individual teacher settings
          setEnableAttendanceDeduction(data.enable_attendance_deduction ?? true);
          setEnableDiaryScoreDeduction(data.enable_diary_deduction ?? false);
          setEnableTestDeduction(data.enable_test_deduction ?? false);
        } else {
          // Default values if no settings found
          setEnableAttendanceDeduction(true);
          setEnableDiaryScoreDeduction(false);
          setEnableTestDeduction(false);
        }
      } catch (error) {
        // Default values on error
        setEnableAttendanceDeduction(true);
        setEnableDiaryScoreDeduction(false);
        setEnableTestDeduction(false);
      }
    };

    fetchTeacherScoreSettings();
  }, [user?.school_id, staffId]);

  useEffect(() => {
    if (isOwnProfile) {
      setPageHeader('My Profile');
    } else {
      setPageHeader('Employee Profile');
    }
  }, [teacher, isOwnProfile, setPageHeader]);

  // Memoized calculate monthly stats
  const calculateMonthlyStats = useCallback((records: AttendanceRecord[], halfLeavesMap?: Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>): MonthlyStats[] => {
    const monthlyData: Record<string, MonthlyStats> = {};

    records.forEach(record => {
      const date = parseISO(record.date);
      const monthKey = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          half_day: 0,
          halfLeaves: 0,
        };
      }

      monthlyData[monthKey].total++;
      const status = record.status.toLowerCase();
      if (status === 'present') monthlyData[monthKey].present++;
      else if (status === 'absent') monthlyData[monthKey].absent++;
      else if (status === 'late') monthlyData[monthKey].late++;
      else if (status === 'leave') monthlyData[monthKey].leave++;
      else if (status === 'half_day') monthlyData[monthKey].half_day++;
    });

    // Count half leaves per month
    if (halfLeavesMap) {
      halfLeavesMap.forEach((halfLeave, dateStr) => {
        const date = parseISO(dateStr);
        const monthKey = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].halfLeaves++;
        }
      });
    }

    return Object.values(monthlyData).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB.getTime() - dateA.getTime();
    });
  }, []);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!staffId || !user?.school_id) return;

      const minDuration = 800; // Reduced minimum loading time
      const start = Date.now();
      startProgress(false);
      setProgress(10);
      setLoading(true);

      try {
        // Parallel fetch: session, teacher details, and user_id lookup
        setProgress(20);
        const [sessionResult, teacherResult, userResult] = await Promise.all([
          supabase
            .from('sessions')
            .select('id')
            .eq('is_active', true)
            .eq('school_id', user.school_id)
            .single(),
          supabase
            .from('staff')
            .select('*')
            .eq('id', parseInt(staffId))
            .eq('school_id', user.school_id)
            .single(),
          supabase
            .from('users')
            .select('id')
            .eq('staff_id', parseInt(staffId))
            .eq('school_id', user.school_id)
            .maybeSingle()
        ]);

        const sessionData = sessionResult.data;
        if (sessionData) {
          setSessionId(sessionData.id);
        }

        if (teacherResult.error) throw teacherResult.error;
        setTeacher(teacherResult.data);

        const userId = userResult.data?.id;

        // Parallel fetch: sections, subjects, classes, timetable
        setProgress(35);
        const [sectionsData, subjectsData, classesData, timetableResult] = await Promise.all([
          // Fetch sections linked to teacher (teacher_id is at section level, not session-specific)
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sections')
              .select(`
                id,
                name,
                class_id,
                classes!inner(id, name)
              `)
              .eq('teacher_id', parseInt(staffId))
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase.from('subjects')
              .select('id, name')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase.from('classes')
              .select('id, name')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          sessionData
            ? fetchAllRows(async (from, to) => {
                return await supabase
                  .from('timetable')
                  .select('period_index, subject_id, class_id, day_of_week')
                  .eq('teacher_id', parseInt(staffId))
                  .eq('session_id', sessionData.id)
                  .eq('school_id', user.school_id)
                  .eq('day_of_week', 1)
                  .range(from, to);
              })
            : Promise.resolve([])
        ]);

        if (sectionsData && sectionsData.length > 0) {
          const formattedSections = sectionsData.map((sec: any) => ({
            id: sec.id,
            name: sec.name,
            class_id: sec.class_id,
            class_name: sec.classes?.name || 'Unknown',
          }));
          setAssignedSections(formattedSections);
        }

        setSubjects(subjectsData);
        setClasses(classesData);

        if (timetableResult && timetableResult.length > 0) {
          setTimetableData(timetableResult || []);
          const uniquePeriods = new Set(timetableResult.map((t: any) => t.period_index + 1));
          setTimetablePeriods(uniquePeriods.size);
        }

        // Fetch attendance records and half leaves in parallel
        setProgress(50);
        let allRecords: AttendanceRecord[] = [];
        let hlMap = new Map<string, { leave_type: string; arrival_time?: string | null; departure_time?: string | null }>();

        if (sessionData) {
          const [attendanceResult, halfLeavesResult] = await Promise.all([
            supabase
              .from('staff_attendance_records')
              .select('date, status, remarks')
              .eq('staff_id', parseInt(staffId))
              .eq('session_id', sessionData.id)
              .eq('school_id', user.school_id)
              .order('date', { ascending: false }),
            supabase
              .from('half_leaves')
              .select('date, leave_type, arrival_time, departure_time')
              .eq('person_type', 'staff')
              .eq('person_id', parseInt(staffId))
              .eq('session_id', sessionData.id)
              .eq('school_id', user.school_id)
          ]);

          // Process attendance records
          if (!attendanceResult.error && attendanceResult.data) {
            allRecords = attendanceResult.data.map((rec: any) => ({
              date: rec.date,
              status: rec.status,
              remarks: rec.remarks,
            }));

            // Calculate stats
            const stats: AttendanceStats = {
              present: 0,
              absent: 0,
              late: 0,
              leave: 0,
              half_day: 0,
              total: allRecords.length,
            };

            allRecords.forEach(record => {
              const status = record.status.toLowerCase();
              if (status === 'present') stats.present++;
              else if (status === 'absent') stats.absent++;
              else if (status === 'late') stats.late++;
              else if (status === 'leave') stats.leave++;
              else if (status === 'half_day') stats.half_day++;
            });

            setAttendanceStats(stats);
            setRecentAttendance(allRecords.slice(0, 10));
          }

          // Process half leaves
          if (!halfLeavesResult.error && halfLeavesResult.data) {
            (halfLeavesResult.data || []).forEach((hl: any) => {
              hlMap.set(hl.date, {
                leave_type: hl.leave_type,
                arrival_time: hl.arrival_time,
                departure_time: hl.departure_time
              });
            });
            setHalfLeavesMap(hlMap);
          }

          // Defer monthly stats calculation
          setTimeout(() => {
            const monthlyStatsData = calculateMonthlyStats(allRecords, hlMap);
            setMonthlyStats(monthlyStatsData);

            // Calculate weekly attendance patterns
            const weeklyData = getWeeklyAttendance(allRecords, hlMap);
            setWeeklyAttendance(weeklyData);

            // Calculate attendance pattern
            const patternStats = getAttendancePattern(allRecords, hlMap.size);
            setAttendancePattern(patternStats);

            // Calculate yearly overview
            const yearlyStats = getYearlyOverview(allRecords, hlMap);
            setYearlyOverview(yearlyStats);
          }, 0);
        }

        // Fetch homework diary and test summary in parallel (if userId exists)
        setProgress(60);
        if (userId) {
          // Parallel fetch homework and test data
          const [homeworkPromise, testPromise] = await Promise.all([
            // Homework summary
            (async () => {
              try {
                // Fetch homework diary entries created by this teacher
                let homeworkQuery = supabase
                  .from('homework_diary')
                  .select(`
                    id,
                    homework_date,
                    subject_id,
                    class_id,
                    subjects:subject_id(id, name),
                    classes:class_id(id, name)
                  `)
                  .eq('assigned_by', userId)
                  .eq('school_id', user.school_id);

                // Only filter by session if we have one
                if (sessionData) {
                  homeworkQuery = homeworkQuery.eq('session_id', sessionData.id);
                }

                const { data: homeworkEntries, error: homeworkError } = await homeworkQuery
                  .order('homework_date', { ascending: false });

                if (homeworkError) {
                }

                const totalAssignments = homeworkEntries?.length || 0;

                if (totalAssignments > 0) {
                  // Calculate unique days with assignments
                  const uniqueDays = new Set(homeworkEntries?.map((entry: any) => entry.homework_date) || []);
                  const uniqueDaysCount = uniqueDays.size;
                  const averagePerDay = uniqueDaysCount > 0 ? totalAssignments / uniqueDaysCount : 0;

                  // Calculate assignments by subject
                  const subjectMap = new Map<string, number>();
                  homeworkEntries?.forEach((entry: any) => {
                    const subjectName = entry.subjects?.name || 'General Homework';
                    subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1);
                  });
                  const assignmentsBySubject = Array.from(subjectMap.entries())
                    .map(([subject, count]) => ({ subject, count }))
                    .sort((a, b) => b.count - a.count);

                  // Calculate assignments by class
                  const classMap = new Map<string, number>();
                  homeworkEntries?.forEach((entry: any) => {
                    const className = entry.classes?.name || 'Unknown Class';
                    classMap.set(className, (classMap.get(className) || 0) + 1);
                  });
                  const assignmentsByClass = Array.from(classMap.entries())
                    .map(([className, count]) => ({ class: className, count }))
                    .sort((a, b) => b.count - a.count);

                  // Get recent assignments (last 10)
                  const recentAssignments = (homeworkEntries || []).slice(0, 10).map((entry: any) => ({
                    id: entry.id,
                    subject: entry.subjects?.name || 'General Homework',
                    class: entry.classes?.name || 'Unknown Class',
                    date: entry.homework_date || '',
                    description: entry.homework_text || '',
                  }));

                  return {
                    totalAssignments,
                    averagePerDay,
                    assignmentsBySubject,
                    assignmentsByClass,
                    recentAssignments,
                  };
                } else {
                  return {
                    totalAssignments: 0,
                    averagePerDay: 0,
                    assignmentsBySubject: [],
                    assignmentsByClass: [],
                    recentAssignments: [],
                  };
                }
              } catch (error) {
                return {
                  totalAssignments: 0,
                  averagePerDay: 0,
                  assignmentsBySubject: [],
                  assignmentsByClass: [],
                  recentAssignments: [],
                };
              }
            })(),
            // Test summary (basic data only, monthly data will be lazy loaded)
            (async () => {
              try {
                // Build query for test records
                let testRecordsQuery = supabase
                  .from('test_records')
                  .select('id, name, test_date, subject_id, class_id')
                  .eq('created_by', userId)
                  .eq('school_id', user.school_id);

                // Only filter by session if we have one
                if (sessionData) {
                  testRecordsQuery = testRecordsQuery.eq('session_id', sessionData.id);
                }

                const { data: testRecords, error: testRecordsError } = await testRecordsQuery
                  .order('test_date', { ascending: false });

                if (testRecordsError) {
                }

                const testRecordIds = testRecords?.map(r => r.id) || [];
                const totalTests = testRecordIds.length;

                if (totalTests > 0) {
                  // Get unique subject and class IDs
                  const subjectIds = Array.from(new Set(testRecords?.map(r => r.subject_id).filter(Boolean) || []));
                  const classIds = Array.from(new Set(testRecords?.map(r => r.class_id).filter(Boolean) || []));

                  // Fetch subjects and classes separately with chunking for .in() limit
                  let allSubjects: any[] = [];
                  if (subjectIds.length > 0) {
                    for (let i = 0; i < subjectIds.length; i += 1000) {
                      const chunk = subjectIds.slice(i, i + 1000);
                      const chunkSubjects = await fetchAllRows(async (from, to) => {
                        return await supabase
                          .from('subjects')
                          .select('id, name')
                          .in('id', chunk)
                          .eq('school_id', user.school_id)
                          .range(from, to);
                      });
                      allSubjects.push(...chunkSubjects);
                    }
                  }
                  
                  let allClasses: any[] = [];
                  if (classIds.length > 0) {
                    for (let i = 0; i < classIds.length; i += 1000) {
                      const chunk = classIds.slice(i, i + 1000);
                      const chunkClasses = await fetchAllRows(async (from, to) => {
                        return await supabase
                          .from('classes')
                          .select('id, name')
                          .in('id', chunk)
                          .eq('school_id', user.school_id)
                          .range(from, to);
                      });
                      allClasses.push(...chunkClasses);
                    }
                  }

                  const subjectsMap = new Map(allSubjects.map(s => [s.id, s.name]));
                  const classesMap = new Map(allClasses.map(c => [c.id, c.name]));

                  // Get test results for these test records with chunking for .in() limit
                  let allTestResults: any[] = [];
                  for (let i = 0; i < testRecordIds.length; i += 1000) {
                    const chunk = testRecordIds.slice(i, i + 1000);
                    const chunkResults = await fetchAllRows(async (from, to) => {
                      return await supabase
                        .from('test_results')
                        .select('student_id, obtained_marks, max_marks')
                        .in('test_id', chunk)
                        .eq('school_id', user.school_id)
                        .range(from, to);
                    });
                    allTestResults.push(...chunkResults);
                  }
                  const testResults = allTestResults;

                  const uniqueStudents = new Set(testResults.map(r => r.student_id));
                  const totalStudents = uniqueStudents.size;

                  let averagePercentage = 0;
                  if (testResults && testResults.length > 0) {
                    const totalObtained = testResults.reduce((sum, r) => sum + r.obtained_marks, 0);
                    const totalMax = testResults.reduce((sum, r) => sum + r.max_marks, 0);
                    averagePercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
                  }

                  // Calculate tests by subject
                  const subjectMap = new Map<string, number>();
                  testRecords?.forEach((record: any) => {
                    const subjectName = subjectsMap.get(record.subject_id) || 'Unknown';
                    subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1);
                  });
                  const testsBySubject = Array.from(subjectMap.entries())
                    .map(([subject, count]) => ({ subject, count }))
                    .sort((a, b) => b.count - a.count);

                  // Get recent tests (last 10)
                  const recentTests = (testRecords || []).slice(0, 10).map((record: any) => ({
                    id: record.id,
                    name: record.name || 'Unnamed Test',
                    subject: subjectsMap.get(record.subject_id) || 'Unknown',
                    class: classesMap.get(record.class_id) || 'Unknown',
                    date: record.test_date || '',
                  }));

                  // Monthly data will be lazy loaded when Test Analysis tab is accessed
                  return {
                    totalTests,
                    totalStudents,
                    averagePercentage,
                    testsBySubject,
                    recentTests,
                  };
                } else {
                  return {
                    totalTests: 0,
                    totalStudents: 0,
                    averagePercentage: 0,
                    testsBySubject: [],
                    recentTests: [],
                  };
                }
              } catch (error) {
                return {
                  totalTests: 0,
                  totalStudents: 0,
                  averagePercentage: 0,
                  testsBySubject: [],
                  recentTests: [],
                };
              }
            })()
          ]);

          // Set the results
          setHomeworkSummary(homeworkPromise);
          setTestSummary(testPromise);
        } else {
          // No userId found
          setHomeworkSummary({
            totalAssignments: 0,
            averagePerDay: 0,
            assignmentsBySubject: [],
            assignmentsByClass: [],
            recentAssignments: [],
          });
          setTestSummary({
            totalTests: 0,
            totalStudents: 0,
            averagePercentage: 0,
            testsBySubject: [],
            recentTests: [],
          });
        }

        // Wait for minimum duration
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
        }

        setProgress(100);
        completeProgress();
      } catch (error: any) {
        showToast('Failed to load teacher profile', 'error');
        completeProgress();
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [staffId, user?.school_id, showToast, startProgress, setProgress, completeProgress, calculateMonthlyStats, isMyProfile]);

  // Lazy load test data when Test Analysis tab is accessed or session changes
  useEffect(() => {
    const loadTestData = async () => {
      if (activeTab !== 3 || !id || !user?.school_id || !testAnalysisSessionId) return;
      
      // Prevent loading if already loading or if same session is already loaded
      if (isLoadingRef.current) return;
      if (lastSessionIdRef.current === testAnalysisSessionId && tabDataLoaded[3]) return;

      isLoadingRef.current = true;
      lastSessionIdRef.current = testAnalysisSessionId;
      setTabDataLoading(prev => ({ ...prev, [3]: true }));

      try {
        // Get user_id for this teacher
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('staff_id', parseInt(id))
          .eq('school_id', user.school_id)
          .maybeSingle();

        if (!userData) {
          setTabDataLoaded(prev => ({ ...prev, [3]: true }));
          setTabDataLoading(prev => ({ ...prev, [3]: false }));
          return;
        }

        // Fetch test records for monthly distribution
        const { data: testRecordsForMonthly } = await supabase
          .from('test_records')
          .select('id, name, test_date, subject_id, class_id, section_id')
          .eq('created_by', userData.id)
          .eq('school_id', user.school_id)
          .eq('session_id', testAnalysisSessionId)
          .order('test_date', { ascending: false });

        // Fetch test records for summary (same query, different fields)
        const { data: testRecordsForSummary } = await supabase
          .from('test_records')
          .select('id, name, test_date, subject_id, class_id')
          .eq('created_by', userData.id)
          .eq('school_id', user.school_id)
          .eq('session_id', testAnalysisSessionId)
          .order('test_date', { ascending: false });

        if (!testRecordsForMonthly || testRecordsForMonthly.length === 0) {
          // Still try to load summary even if no monthly data
          if (testRecordsForSummary && testRecordsForSummary.length > 0) {
            // Load summary data
          } else {
            setTestSummary({
              totalTests: 0,
              totalStudents: 0,
              averagePercentage: 0,
              testsBySubject: [],
              recentTests: [],
            });
            setTestMonthlyData([]);
            setTabDataLoaded(prev => ({ ...prev, [3]: true }));
            setTabDataLoading(prev => ({ ...prev, [3]: false }));
            return;
          }
        }

        // Get unique class IDs for monthly data
        const classIds = Array.from(new Set(testRecordsForMonthly?.map(r => r.class_id).filter(Boolean) || []));
        const sectionIds = Array.from(new Set(testRecordsForMonthly?.map(r => r.section_id).filter(Boolean) || []));

        // Fetch classes and sections with chunking for .in() limit
        let allClasses: any[] = [];
        if (classIds.length > 0) {
          for (let i = 0; i < classIds.length; i += 1000) {
            const chunk = classIds.slice(i, i + 1000);
            const chunkClasses = await fetchAllRows(async (from, to) => {
              return await supabase.from('classes')
                .select('id, name')
                .in('id', chunk)
                .eq('school_id', user.school_id)
                .range(from, to);
            });
            allClasses.push(...chunkClasses);
          }
        }
        
        let allSections: any[] = [];
        if (sectionIds.length > 0) {
          for (let i = 0; i < sectionIds.length; i += 1000) {
            const chunk = sectionIds.slice(i, i + 1000);
            const chunkSections = await fetchAllRows(async (from, to) => {
              return await supabase.from('sections')
                .select('id, name')
                .in('id', chunk)
                .eq('school_id', user.school_id)
                .range(from, to);
            });
            allSections.push(...chunkSections);
          }
        }

        const classesMap = new Map(allClasses.map(c => [c.id, c.name]));
        const sectionsMap = new Map(allSections.map(s => [s.id, s.name]));

        // Calculate monthly/weekly test distribution
        if (testRecordsForMonthly && testRecordsForMonthly.length > 0) {
          const monthlyMap = new Map<string, {
            month: string;
            monthKey: string;
            weeks: Map<number, {
              week: string;
              weekNumber: number;
              tests: number;
              classes: Map<string, number>;
            }>;
            totalTests: number;
          }>();

          testRecordsForMonthly.forEach((record: any) => {
            const date = new Date(record.test_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            if (!monthlyMap.has(monthKey)) {
              monthlyMap.set(monthKey, {
                month: monthName,
                monthKey,
                weeks: new Map(),
                totalTests: 0,
              });
            }

            const monthData = monthlyMap.get(monthKey)!;
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const dayOfMonth = date.getDate();
            const weekNumber = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);

            if (!monthData.weeks.has(weekNumber)) {
              const weekStart = new Date(date);
              weekStart.setDate(dayOfMonth - ((date.getDay() + 6) % 7));
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              const weekLabel = `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`;

              monthData.weeks.set(weekNumber, {
                week: weekLabel,
                weekNumber,
                tests: 0,
                classes: new Map(),
              });
            }

            const weekData = monthData.weeks.get(weekNumber)!;
            const className = classesMap.get(record.class_id) || 'Unknown';
            const sectionName = record.section_id ? sectionsMap.get(record.section_id) : null;
            const classDisplayName = sectionName ? `${className}-${sectionName}` : className;

            weekData.classes.set(classDisplayName, (weekData.classes.get(classDisplayName) || 0) + 1);
            weekData.tests++;
            monthData.totalTests++;
          });

          // Convert to array format
          const monthlyArray = Array.from(monthlyMap.values())
          .map(monthData => ({
            month: monthData.month,
            monthKey: monthData.monthKey,
            weeks: Array.from(monthData.weeks.values())
              .map(week => ({
                week: week.week,
                weekNumber: week.weekNumber,
                tests: week.tests,
                classes: Array.from(week.classes.entries())
                  .map(([className, testCount]) => ({ className, testCount }))
                  .sort((a, b) => a.className.localeCompare(b.className)),
              }))
              .sort((a, b) => a.weekNumber - b.weekNumber),
            totalTests: monthData.totalTests,
          }))
            .sort((a, b) => new Date(a.monthKey).getTime() - new Date(b.monthKey).getTime());

          setTestMonthlyData(monthlyArray);
        } else {
          setTestMonthlyData([]);
        }

        // Also reload test summary for the selected session
        if (testRecordsForSummary && testRecordsForSummary.length > 0) {
          const testRecordIds = testRecordsForSummary.map(r => r.id);
          const subjectIds = Array.from(new Set(testRecordsForSummary.map(r => r.subject_id).filter(Boolean)));
          const classIdsForSummary = Array.from(new Set(testRecordsForSummary.map(r => r.class_id).filter(Boolean)));

          const [subjectsResult, classesResult, testResultsResult] = await Promise.all([
            subjectIds.length > 0
              ? supabase.from('subjects').select('id, name').in('id', subjectIds).eq('school_id', user.school_id)
              : { data: [] },
            classIdsForSummary.length > 0
              ? supabase.from('classes').select('id, name').in('id', classIdsForSummary).eq('school_id', user.school_id)
              : { data: [] },
            supabase
              .from('test_results')
              .select('student_id, obtained_marks, max_marks')
              .in('test_id', testRecordIds)
              .eq('school_id', user.school_id)
          ]);

          const subjectsMap = new Map((subjectsResult.data || []).map(s => [s.id, s.name]));
          const classesMap = new Map((classesResult.data || []).map(c => [c.id, c.name]));

          const uniqueStudents = new Set(testResultsResult.data?.map(r => r.student_id) || []);
          const totalStudents = uniqueStudents.size;

          let averagePercentage = 0;
          if (testResultsResult.data && testResultsResult.data.length > 0) {
            const totalObtained = testResultsResult.data.reduce((sum, r) => sum + r.obtained_marks, 0);
            const totalMax = testResultsResult.data.reduce((sum, r) => sum + r.max_marks, 0);
            averagePercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
          }

          const subjectMap = new Map<string, number>();
          testRecordsForSummary.forEach((record: any) => {
            const subjectName = subjectsMap.get(record.subject_id) || 'Unknown';
            subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1);
          });
          const testsBySubject = Array.from(subjectMap.entries())
            .map(([subject, count]) => ({ subject, count }))
            .sort((a, b) => b.count - a.count);

          const recentTests = testRecordsForSummary.slice(0, 10).map((record: any) => ({
            id: record.id,
            name: record.name || 'Unnamed Test',
            subject: subjectsMap.get(record.subject_id) || 'Unknown',
            class: classesMap.get(record.class_id) || 'Unknown',
            date: record.test_date || '',
          }));

          setTestSummary({
            totalTests: testRecordsForSummary.length,
            totalStudents,
            averagePercentage,
            testsBySubject,
            recentTests,
          });
        } else {
          setTestSummary({
            totalTests: 0,
            totalStudents: 0,
            averagePercentage: 0,
            testsBySubject: [],
            recentTests: [],
          });
        }

        setTabDataLoaded(prev => ({ ...prev, [3]: true }));
      } catch (error) {
        lastSessionIdRef.current = null; // Reset on error so it can retry
      } finally {
        isLoadingRef.current = false;
        setTabDataLoading(prev => ({ ...prev, [3]: false }));
      }
    };

    // Only load if session is selected and tab is active
    if (testAnalysisSessionId) {
      loadTestData();
    }
  }, [activeTab, testAnalysisSessionId, staffId, user?.school_id, isMyProfile]); // tabDataLoaded intentionally excluded to prevent infinite loop

  // Fetch sessions when Test Analysis tab is accessed
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.school_id || activeTab !== 3) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user.school_id)
        .order('name', { ascending: false });
      
      if (!error && data) {
        setSessions(data);
        // Auto-select active session or first session only if not already set
        if (!testAnalysisSessionId) {
          const activeSession = data.find(s => s.is_active);
          if (activeSession) {
            setTestAnalysisSessionId(activeSession.id);
          } else if (data.length > 0) {
            setTestAnalysisSessionId(data[0].id);
          }
        }
      }
    };
    
    fetchSessions();
  }, [activeTab, user?.school_id]); // Removed testAnalysisSessionId from dependencies

  // Fetch sessions when Diary Analysis tab is accessed
  useEffect(() => {
    const fetchSessionsForDiary = async () => {
      if (!user?.school_id || activeTab !== 4) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user.school_id)
        .order('name', { ascending: false });
      
      if (!error && data) {
        setSessions(data);
        // Auto-select active session or first session only if not already set
        if (!diaryAnalysisSessionId) {
          const activeSession = data.find(s => s.is_active);
          if (activeSession) {
            setDiaryAnalysisSessionId(activeSession.id);
          } else if (data.length > 0) {
            setDiaryAnalysisSessionId(data[0].id);
          }
        }
      }
    };
    
    fetchSessionsForDiary();
  }, [activeTab, user?.school_id]); // Removed diaryAnalysisSessionId from dependencies

  // Lazy load diary analysis data when Diary Analysis tab is accessed or session changes
  useEffect(() => {
    const loadDiaryData = async () => {
      if (activeTab !== 4 || !id || !user?.school_id || !diaryAnalysisSessionId) return;
      
      // Prevent loading if already loading or if same session is already loaded
      if (diaryLoadingRef.current) return;
      if (lastDiarySessionIdRef.current === diaryAnalysisSessionId && tabDataLoaded[4]) return;

      diaryLoadingRef.current = true;
      lastDiarySessionIdRef.current = diaryAnalysisSessionId;
      setTabDataLoading(prev => ({ ...prev, [4]: true }));

      try {
        // Get user_id for the teacher
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('staff_id', parseInt(id))
          .eq('school_id', user.school_id)
          .maybeSingle();

        if (!userData?.id) {
          setDiaryAnalysisData({
            totalAssignments: 0,
            totalStudents: 0,
            averagePerDay: 0,
            assignmentsBySubject: [],
            assignmentsByClass: [],
            recentAssignments: [],
          });
          setDiaryMonthlyData([]);
          setTabDataLoaded(prev => ({ ...prev, [4]: true }));
          return;
        }

        // Fetch homework diary entries for the selected session
        const { data: homeworkEntries, error: homeworkError } = await supabase
          .from('homework_diary')
          .select(`
            id,
            homework_date,
            homework_text,
            subject_id,
            class_id,
            section_id,
            subjects:subject_id(id, name),
            classes:class_id(id, name),
            sections:section_id(id, name)
          `)
          .eq('assigned_by', userData.id)
          .eq('session_id', diaryAnalysisSessionId)
          .eq('school_id', user.school_id)
          .order('homework_date', { ascending: false });

        if (homeworkError) {
          setDiaryAnalysisData({
            totalAssignments: 0,
            totalStudents: 0,
            averagePerDay: 0,
            assignmentsBySubject: [],
            assignmentsByClass: [],
            recentAssignments: [],
          });
          setDiaryMonthlyData([]);
          setTabDataLoaded(prev => ({ ...prev, [4]: true }));
          return;
        }

        if (!homeworkEntries || homeworkEntries.length === 0) {
          setDiaryAnalysisData({
            totalAssignments: 0,
            totalStudents: 0,
            averagePerDay: 0,
            assignmentsBySubject: [],
            assignmentsByClass: [],
            recentAssignments: [],
          });
          setDiaryMonthlyData([]);
          setTabDataLoaded(prev => ({ ...prev, [4]: true }));
          return;
        }

        // Get unique class and section IDs for mapping
        const classIds = Array.from(new Set(homeworkEntries.map((e: any) => e.class_id).filter(Boolean)));
        const sectionIds = Array.from(new Set(homeworkEntries.map((e: any) => e.section_id).filter(Boolean)));
        const subjectIds = Array.from(new Set(homeworkEntries.map((e: any) => e.subject_id).filter(Boolean)));

        // Fetch classes, sections, and subjects with chunking for .in() limit
        let allClasses: any[] = [];
        if (classIds.length > 0) {
          for (let i = 0; i < classIds.length; i += 1000) {
            const chunk = classIds.slice(i, i + 1000);
            const chunkClasses = await fetchAllRows(async (from, to) => {
              return await supabase.from('classes')
                .select('id, name')
                .in('id', chunk)
                .eq('school_id', user.school_id)
                .range(from, to);
            });
            allClasses.push(...chunkClasses);
          }
        }
        
        let allSections: any[] = [];
        if (sectionIds.length > 0) {
          for (let i = 0; i < sectionIds.length; i += 1000) {
            const chunk = sectionIds.slice(i, i + 1000);
            const chunkSections = await fetchAllRows(async (from, to) => {
              return await supabase.from('sections')
                .select('id, name')
                .in('id', chunk)
                .eq('school_id', user.school_id)
                .range(from, to);
            });
            allSections.push(...chunkSections);
          }
        }
        
        let allSubjects: any[] = [];
        if (subjectIds.length > 0) {
          for (let i = 0; i < subjectIds.length; i += 1000) {
            const chunk = subjectIds.slice(i, i + 1000);
            const chunkSubjects = await fetchAllRows(async (from, to) => {
              return await supabase.from('subjects')
                .select('id, name')
                .in('id', chunk)
                .eq('school_id', user.school_id)
                .range(from, to);
            });
            allSubjects.push(...chunkSubjects);
          }
        }

        const classesMap = new Map(allClasses.map(c => [c.id, c.name]));
        const sectionsMap = new Map(allSections.map(s => [s.id, s.name]));
        const subjectsMap = new Map(allSubjects.map(s => [s.id, s.name]));

        // Calculate monthly/weekly diary distribution
        const monthlyMap = new Map<string, {
          month: string;
          monthKey: string;
          weeks: Map<number, {
            week: string;
            weekNumber: number;
            assignments: number;
            classes: Map<string, number>;
          }>;
          totalAssignments: number;
        }>();

        homeworkEntries.forEach((entry: any) => {
          const date = new Date(entry.homework_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
              month: monthName,
              monthKey,
              weeks: new Map(),
              totalAssignments: 0,
            });
          }

          const monthData = monthlyMap.get(monthKey)!;
          const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
          const dayOfMonth = date.getDate();
          const weekNumber = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);

          if (!monthData.weeks.has(weekNumber)) {
            const weekStart = new Date(date);
            weekStart.setDate(dayOfMonth - ((date.getDay() + 6) % 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekLabel = `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`;

            monthData.weeks.set(weekNumber, {
              week: weekLabel,
              weekNumber,
              assignments: 0,
              classes: new Map(),
            });
          }

          const weekData = monthData.weeks.get(weekNumber)!;
          const className = classesMap.get(entry.class_id) || 'Unknown';
          const sectionName = entry.section_id ? sectionsMap.get(entry.section_id) : null;
          const classDisplayName = sectionName ? `${className}-${sectionName}` : className;

          weekData.classes.set(classDisplayName, (weekData.classes.get(classDisplayName) || 0) + 1);
          weekData.assignments++;
          monthData.totalAssignments++;
        });

        // Convert to array format
        const monthlyArray = Array.from(monthlyMap.values())
          .map(monthData => ({
            month: monthData.month,
            monthKey: monthData.monthKey,
            weeks: Array.from(monthData.weeks.values())
              .map(week => ({
                week: week.week,
                weekNumber: week.weekNumber,
                assignments: week.assignments,
                classes: Array.from(week.classes.entries())
                  .map(([className, assignmentCount]) => ({ className, assignmentCount }))
                  .sort((a, b) => a.className.localeCompare(b.className)),
              }))
              .sort((a, b) => a.weekNumber - b.weekNumber),
            totalAssignments: monthData.totalAssignments,
          }))
          .sort((a, b) => new Date(a.monthKey).getTime() - new Date(b.monthKey).getTime());

        setDiaryMonthlyData(monthlyArray);

        // Calculate summary statistics
        const totalAssignments = homeworkEntries.length;
        const uniqueDays = new Set(homeworkEntries.map((e: any) => e.homework_date));
        const uniqueDaysCount = uniqueDays.size;
        const averagePerDay = uniqueDaysCount > 0 ? totalAssignments / uniqueDaysCount : 0;

        // Calculate assignments by subject
        const subjectMap = new Map<string, number>();
        homeworkEntries.forEach((entry: any) => {
          const subjectName = entry.subjects?.name || 'General Homework';
          subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1);
        });
        const assignmentsBySubject = Array.from(subjectMap.entries())
          .map(([subject, count]) => ({ subject, count }))
          .sort((a, b) => b.count - a.count);

        // Calculate assignments by class
        const classMap = new Map<string, number>();
        homeworkEntries.forEach((entry: any) => {
          const className = classesMap.get(entry.class_id) || 'Unknown';
          const sectionName = entry.section_id ? sectionsMap.get(entry.section_id) : null;
          const classDisplayName = sectionName ? `${className}-${sectionName}` : className;
          classMap.set(classDisplayName, (classMap.get(classDisplayName) || 0) + 1);
        });
        const assignmentsByClass = Array.from(classMap.entries())
          .map(([className, count]) => ({ class: className, count }))
          .sort((a, b) => b.count - a.count);

        // Get recent assignments
        const recentAssignments = homeworkEntries.slice(0, 10).map((entry: any) => ({
          id: entry.id,
          subject: entry.subjects?.name || 'General Homework',
          class: (() => {
            const className = classesMap.get(entry.class_id) || 'Unknown';
            const sectionName = entry.section_id ? sectionsMap.get(entry.section_id) : null;
            return sectionName ? `${className}-${sectionName}` : className;
          })(),
          date: entry.homework_date || '',
          description: entry.homework_text || '',
        }));

        // Calculate total students (approximate - count unique class-section combinations)
        const uniqueClassSections = new Set(
          homeworkEntries.map((e: any) => {
            const className = classesMap.get(e.class_id) || 'Unknown';
            const sectionName = e.section_id ? sectionsMap.get(e.section_id) : null;
            return sectionName ? `${className}-${sectionName}` : className;
          })
        );
        const totalStudents = uniqueClassSections.size;

        setDiaryAnalysisData({
          totalAssignments,
          totalStudents,
          averagePerDay,
          assignmentsBySubject,
          assignmentsByClass,
          recentAssignments,
        });

        setTabDataLoaded(prev => ({ ...prev, [4]: true }));
      } catch (error) {
        lastDiarySessionIdRef.current = null; // Reset on error so it can retry
      } finally {
        diaryLoadingRef.current = false;
        setTabDataLoading(prev => ({ ...prev, [4]: false }));
      }
    };

    // Only load if session is selected and tab is active
    if (diaryAnalysisSessionId) {
      loadDiaryData();
    }
  }, [activeTab, diaryAnalysisSessionId, staffId, user?.school_id, isMyProfile]);

  // Edit modal functions
  const handleOpenEditModal = () => {
    if (!teacher) return;
    setEditForm({
      name: teacher.name || '',
      mobile: teacher.mobile || '',
      role: teacher.role || '',
      picture: null,
      pictureFile: null,
      joiningDate: teacher.joining_date || '',
      fatherName: teacher.father_name || '',
      gender: teacher.gender || '',
      experience: teacher.experience || '',
      nationalId: teacher.national_id || '',
      education: teacher.education || '',
      religion: teacher.religion || '',
      bloodGroup: teacher.blood_group || '',
      email: teacher.email || '',
      dob: teacher.dob || '',
      address: teacher.address || '',
    });
    setEditImage(teacher.picture_url || null);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.09,
            maxWidthOrHeight: 400,
            useWebWorker: true,
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      const reader = new FileReader();
      reader.onload = ev => setEditImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      setEditForm(prev => ({ ...prev, pictureFile: file }));
    }
  };

  const handleRemoveEditImage = () => {
    setEditImage(null);
    setEditForm(prev => ({ ...prev, pictureFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id || !staffId) {
      showToast('No school context found', 'error');
      return;
    }
    setEditLoading(true);
    try {
      let picture_url = editImage;
      if (editForm.pictureFile) {
        const fileExt = editForm.pictureFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `staff/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('staff-avatars')
          .upload(filePath, editForm.pictureFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('staff-avatars')
          .getPublicUrl(filePath);
        picture_url = publicUrl;
      }

      const staffData = {
        name: editForm.name.trim(),
        role: editForm.role,
        mobile: editForm.mobile.trim(),
        picture_url,
        joining_date: editForm.joiningDate,
        father_name: editForm.fatherName.trim() || null,
        gender: editForm.gender || null,
        experience: editForm.experience.trim() || null,
        national_id: editForm.nationalId.trim() || null,
        education: editForm.education.trim() || null,
        religion: editForm.religion || null,
        blood_group: editForm.bloodGroup || null,
        email: editForm.email.trim() || null,
        dob: editForm.dob || null,
        address: editForm.address.trim() || null,
      };

      const { error: updateError } = await supabase
        .from('staff')
        .update(staffData)
        .eq('id', parseInt(staffId))
        .eq('school_id', user.school_id);

      if (updateError) throw updateError;

      showToast('Profile updated successfully', 'success');
      handleCloseEditModal();
      
      // Reload teacher data
      const { data: updatedTeacher, error: fetchError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', parseInt(staffId))
        .eq('school_id', user.school_id)
        .single();
      
      if (!fetchError && updatedTeacher) {
        setTeacher(updatedTeacher);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Memoized calculations (must be before early returns)
  // Attendance percentage: Present and Late count as attended, Absent and Leave count as not attended
  const attendancePercentage = useMemo(() => {
    if (!attendanceStats?.total || attendanceStats.total === 0) return 0;
    // Present + Late = attended days
    const attendedDays = attendanceStats.present + attendanceStats.late;
    return Math.round((attendedDays / attendanceStats.total) * 100);
  }, [attendanceStats]);

  // Calculate teacher score based on attendance, diary assignments, and test performance
  useEffect(() => {
    const score = calculateTeacherScore(
      attendanceStats, 
      halfLeavesMap.size, 
      homeworkSummary,
      testSummary,
      enableDiaryScoreDeduction,
      enableAttendanceDeduction,
      enableTestDeduction
    );
    setTeacherScore(score);
  }, [attendanceStats, halfLeavesMap, homeworkSummary, testSummary, enableDiaryScoreDeduction, enableAttendanceDeduction, enableTestDeduction]);

  // Compute visible tabs and map indices based on render settings
  // Map tab keys to their original indices
  const tabIndexMap: Record<string, number> = {
    'info_tab': 0,
    'attendance_tab': 1,
    'timetable_tab': 2,
    'test_analysis_tab': 3,
    'diary_analysis_tab': 4,
  };

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ originalIndex: number; label: string; icon: React.ReactNode }> = [];

    TEACHER_PROFILE_TABS.forEach((tabConfig) => {
      // Check if tab should be visible based on render settings
      const isVisible = isTeacherTabVisible(renderSettings, tabConfig.key);

      if (isVisible) {
        const originalIndex = tabIndexMap[tabConfig.key];
        if (originalIndex !== undefined) {
          tabs.push({
            originalIndex,
            label: tabConfig.label.replace(' Tab', ''), // Remove "Tab" suffix for display
            icon: (
              originalIndex === 0 ? <Person /> :
              originalIndex === 1 ? <HistoryIcon /> :
              originalIndex === 2 ? <CalendarToday /> :
              originalIndex === 3 ? <Assessment /> :
              originalIndex === 4 ? <Assignment /> :
              <Person />
            )
          });
        }
      }
    });

    return tabs;
  }, [renderSettings]);

  // Map visible tab index to original tab index
  const getOriginalTabIndex = useCallback((visibleIndex: number): number => {
    return visibleTabs[visibleIndex]?.originalIndex ?? 0;
  }, [visibleTabs]);

  // Map original tab index to visible index
  const getVisibleTabIndex = useCallback((originalIndex: number): number => {
    return visibleTabs.findIndex(tab => tab.originalIndex === originalIndex);
  }, [visibleTabs]);

  // Update activeTab when visible tabs change
  useEffect(() => {
    if (visibleTabs.length > 0) {
      const currentVisibleIndex = getVisibleTabIndex(activeTab);
      if (currentVisibleIndex === -1) {
        // Current tab is not visible, switch to first visible tab
        setActiveTab(visibleTabs[0].originalIndex);
      }
    }
  }, [visibleTabs, activeTab, getVisibleTabIndex]);


  if (loading) {
    return <Loader />;
  }

  if (!teacher) {
    return (
      <ProfileContainer>
        <Typography variant="h6" color="error">
          Teacher not found
        </Typography>
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer>
      {/* Profile Header */}
      <ProfileHeader
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
          e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          [theme.breakpoints.up('sm')]: {
            alignSelf: 'center',
          },
          [theme.breakpoints.down('sm')]: {
            '& .MuiAvatar-root': {
              width: '60px !important',
              height: '60px !important',
              fontSize: '1.5rem !important',
            }
          }
        }}>
          <ProfileAvatar src={teacher.picture_url}>
            {teacher.name.charAt(0).toUpperCase()}
          </ProfileAvatar>
        </Box>
        <Box sx={{ 
          flex: 1, 
          position: 'relative', 
          zIndex: 2, 
          minWidth: 0, 
          display: 'flex', 
          flexDirection: 'column',
          [theme.breakpoints.up('sm')]: {
            justifyContent: 'center',
          }
        }}>
          {/* Top Row: Name, Score Badge, Edit Button */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'center', sm: 'center' }, 
            justifyContent: 'space-between', 
            gap: { xs: 1, sm: 2 }, 
            mb: { xs: 1, sm: 2 },
            flexWrap: { xs: 'wrap', sm: 'nowrap' }
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: { xs: 0.25, sm: 0.5 }, 
              flex: 1, 
              minWidth: 0,
              [theme.breakpoints.up('sm')]: {
                justifyContent: 'center',
              }
            }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: '1rem', sm: '1.5rem' },
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {teacher.name}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  fontFamily: 'monospace'
                }}
              >
                ID: {teacher.id}
              </Typography>
              {assignedSections.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.5 }, flexWrap: 'wrap' }}>
                  {assignedSections.map((section, index) => (
                    <Chip
                      key={section.id}
                      label={`${section.class_name}${section.name ? `-${section.name}` : ''}`}
                      size="small"
                      sx={{
                        height: { xs: 18, sm: 22 },
                        fontSize: { xs: '0.625rem', sm: '0.7rem' },
                        fontWeight: 500,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        '& .MuiChip-label': {
                          px: { xs: 0.5, sm: 1 },
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
              {/* Teacher Score Badge */}
              <Box
                onClick={() => setScoreBreakdownOpen(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  px: { xs: 0.75, sm: 1.5 },
                  py: { xs: 0.375, sm: 0.75 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  bgcolor: theme => alpha(getScoreColor(teacherScore).light, 0.1),
                  border: theme => `1px solid ${alpha(getScoreColor(teacherScore).main, 0.2)}`,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    bgcolor: theme => alpha(getScoreColor(teacherScore).light, 0.15),
                    border: theme => `1px solid ${alpha(getScoreColor(teacherScore).main, 0.3)}`,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: theme => `linear-gradient(135deg, 
                      ${alpha(getScoreColor(teacherScore).light, 0.1)} 0%, 
                      ${alpha(getScoreColor(teacherScore).main, 0.05)} 100%
                    )`,
                    zIndex: 0,
                  },
                }}
              >
                <Box sx={{ 
                  width: { xs: 28, sm: 36 }, 
                  height: { xs: 28, sm: 36 },
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <CircularProgress
                    variant="determinate"
                    value={teacherScore * 10}
                    thickness={2.5}
                    sx={{
                      position: 'absolute',
                      color: theme => alpha(getScoreColor(teacherScore).main, 0.2),
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      },
                      [theme.breakpoints.down('sm')]: {
                        thickness: 2,
                      }
                    }}
                    size="100%"
                  />
                  <CircularProgress
                    variant="determinate"
                    value={teacherScore * 10}
                    thickness={2.5}
                    sx={{
                      color: theme => getScoreColor(teacherScore).main,
                      position: 'absolute',
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                        transition: 'all 0.5s ease-in-out',
                      },
                      [theme.breakpoints.down('sm')]: {
                        thickness: 2,
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
                      variant="body2"
                      sx={{
                        fontSize: { xs: '0.625rem', sm: '0.8rem' },
                        fontWeight: 700,
                        color: theme => getScoreColor(teacherScore).main,
                      }}
                    >
                      {teacherScore}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ position: 'relative', zIndex: 1, display: { xs: 'none', sm: 'block' } }}>
                  <Typography 
                    variant="body2"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                      mb: 0.2
                    }}
                  >
                    Teacher Score
                  </Typography>
                  <Typography 
                    variant="body2"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: theme => getScoreColor(teacherScore).main,
                      lineHeight: 1,
                    }}
                  >
                    {getScoreLabel(teacherScore)}
                  </Typography>
                </Box>
              </Box>
              {isOwnProfile && (
                <Button
                  onClick={handleOpenEditModal}
                  variant="outlined"
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    flexShrink: 0,
                    fontSize: { xs: '0.625rem', sm: '0.75rem' },
                    padding: { xs: '0.25rem 0.5rem', sm: '0.375rem 0.75rem' },
                    minWidth: 'auto',
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: { xs: 1, sm: 1.5 },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Edit
                </Button>
              )}
            </Box>
          </Box>
          
          {/* Info Items: Organized in a grid */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: { xs: 1, sm: 1.5 },
            mt: 0
          }}>
            {teacher.mobile && (
              <InfoItem>
                <Box className="icon-container">
                  <Phone sx={{ fontSize: { xs: 14, sm: 18 } }} />
                </Box>
                <Box className="info-content">
                  <Typography className="info-label">Mobile</Typography>
                  <Typography className="info-value">{teacher.mobile}</Typography>
                </Box>
              </InfoItem>
            )}
            {teacher.email && (
              <InfoItem>
                <Box className="icon-container">
                  <Email sx={{ fontSize: { xs: 14, sm: 18 } }} />
                </Box>
                <Box className="info-content">
                  <Typography className="info-label">Email</Typography>
                  <Typography 
                    className="info-value"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {teacher.email}
                  </Typography>
                </Box>
              </InfoItem>
            )}
          </Box>
        </Box>
      </ProfileHeader>

      {/* Summary Cards */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {/* Attendance Card */}
          {isTeacherSummaryCardVisible(renderSettings, 'attendance_summary_card') && (
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
                  width: '180px',
                  height: '180px',
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
                      border: theme => `10px solid ${alpha(theme.palette.divider, 0.08)}`,
                    }} />
                    
                    {/* Progress Circle */}
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: theme => `10px solid ${
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
                        fontSize: '2.5rem'
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
                      color: 'success' as const
                    },
                    { 
                      label: 'Late', 
                      value: attendanceStats?.late || 0,
                      icon: <Timer />,
                      color: 'warning' as const
                    },
                    { 
                      label: 'Absent / Leave', 
                      value: (attendanceStats?.absent || 0) + (attendanceStats?.leave || 0),
                      icon: <Cancel />,
                      color: 'error' as const,
                      showSeparateCounts: true,
                      absentCount: attendanceStats?.absent || 0,
                      leaveCount: attendanceStats?.leave || 0
                    },
                    { 
                      label: 'Half Leaves', 
                      value: halfLeavesMap.size,
                      icon: <AccessTime />,
                      color: 'secondary' as const,
                      customColor: '#ec4899'
                    }
                  ]).map((stat, index) => (
                    <Grid item xs={6} key={index}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: stat.customColor 
                          ? alpha(stat.customColor, 0.2)
                          : theme => alpha(theme.palette[stat.color].main, 0.2),
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
                            : theme => alpha(theme.palette[stat.color].main, 0.1),
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
                            {(stat as any).showSeparateCounts ? (
                              <>
                                <Box component="span" sx={{ color: theme => theme.palette.error.main }}>
                                  {(stat as any).absentCount}
                                </Box>
                                <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.9em' }}>+</Box>
                                <Box component="span" sx={{ color: theme => theme.palette.info.main }}>
                                  {(stat as any).leaveCount}
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
          )}

          {/* Test Summary Card */}
          {isTeacherSummaryCardVisible(renderSettings, 'test_summary_card') && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{
              p: 1.5,
              px: 1.5,
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
              <Box sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 1.25,
                  flexShrink: 0
                }}>
                  <Assessment sx={{ 
                    fontSize: 18, 
                    color: '#8b5cf6',
                    flexShrink: 0
                  }} />
                  <Typography variant="subtitle2" sx={{ 
                    color: '#8b5cf6',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    lineHeight: 1
                  }}>
                    Test Summary
                  </Typography>
                </Box>

                {testSummary.totalTests === 0 ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 2,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      No tests created
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    '&::-webkit-scrollbar': {
                      width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: theme => alpha('#8b5cf6', 0.3),
                      borderRadius: '2px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: theme => alpha('#8b5cf6', 0.5),
                    },
                  }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      {/* Summary Stats */}
                      <Box sx={{
                        py: 1.25,
                        px: 1.25,
                        borderRadius: 1,
                        border: '1.5px solid',
                        borderColor: alpha('#8b5cf6', 0.3),
                        bgcolor: alpha('#8b5cf6', 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha('#8b5cf6', 0.12),
                          borderColor: alpha('#8b5cf6', 0.4),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 2px 8px ${alpha('#8b5cf6', 0.15)}`,
                        }
                      }}>
                        <Box sx={{
                          minWidth: '75px',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start'
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontWeight: 800,
                            color: '#8b5cf6',
                            fontSize: '0.9rem',
                            lineHeight: 1.2,
                            letterSpacing: '0.3px'
                          }}>
                            {testSummary.totalTests}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: alpha('#8b5cf6', 0.7),
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            lineHeight: 1,
                            mt: 0.25
                          }}>
                            Tests
                          </Typography>
                        </Box>
                        <Box sx={{
                          width: '1.5px',
                          height: '24px',
                          bgcolor: alpha('#8b5cf6', 0.25),
                          flexShrink: 0,
                          borderRadius: '1px'
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ 
                            color: 'text.primary',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'block',
                            lineHeight: 1.3,
                            mb: 0.25
                          }}>
                            {testSummary.averagePercentage.toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            display: 'block',
                            lineHeight: 1
                          }}>
                            Average Performance
                          </Typography>
                        </Box>
                      </Box>

                      {/* Students Assessed */}
                      <Box sx={{
                        py: 1.25,
                        px: 1.25,
                        borderRadius: 1,
                        border: '1.5px solid',
                        borderColor: alpha('#8b5cf6', 0.3),
                        bgcolor: alpha('#8b5cf6', 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha('#8b5cf6', 0.12),
                          borderColor: alpha('#8b5cf6', 0.4),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 2px 8px ${alpha('#8b5cf6', 0.15)}`,
                        }
                      }}>
                        <Box sx={{
                          minWidth: '75px',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start'
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontWeight: 800,
                            color: '#8b5cf6',
                            fontSize: '0.9rem',
                            lineHeight: 1.2,
                            letterSpacing: '0.3px'
                          }}>
                            {testSummary.totalStudents}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: alpha('#8b5cf6', 0.7),
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            lineHeight: 1,
                            mt: 0.25
                          }}>
                            Students
                          </Typography>
                        </Box>
                        <Box sx={{
                          width: '1.5px',
                          height: '24px',
                          bgcolor: alpha('#8b5cf6', 0.25),
                          flexShrink: 0,
                          borderRadius: '1px'
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ 
                            color: 'text.primary',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'block',
                            lineHeight: 1.3
                          }}>
                            Assessed
                          </Typography>
                        </Box>
                      </Box>

                      {/* Tests by Subject */}
                      {testSummary.testsBySubject.length > 0 && (
                        <Box sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.75,
                          width: '100%',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 0.5,
                          '&::-webkit-scrollbar': {
                            width: '6px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: theme => theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.common.white, 0.05) 
                              : alpha(theme.palette.common.black, 0.05),
                            borderRadius: '3px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme => theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.2)
                              : alpha(theme.palette.common.black, 0.2),
                            borderRadius: '3px',
                            '&:hover': {
                              background: theme => theme.palette.mode === 'dark'
                                ? alpha(theme.palette.common.white, 0.3)
                                : alpha(theme.palette.common.black, 0.3),
                            }
                          },
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => theme.palette.mode === 'dark'
                            ? `${alpha(theme.palette.common.white, 0.2)} ${alpha(theme.palette.common.white, 0.05)}`
                            : `${alpha(theme.palette.common.black, 0.2)} ${alpha(theme.palette.common.black, 0.05)}`,
                        }}>
                          {testSummary.testsBySubject.map((item, index) => (
                            <Box
                              key={index}
                              sx={{
                                py: 0.9,
                                px: 1,
                                borderRadius: 0.875,
                                border: '1px solid',
                                borderColor: alpha('#10b981', 0.25),
                                bgcolor: alpha('#10b981', 0.08),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                width: '100%',
                                boxSizing: 'border-box',
                                minWidth: 0,
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: alpha('#10b981', 0.12),
                                  borderColor: alpha('#10b981', 0.4),
                                  transform: 'translateY(-1px)',
                                  boxShadow: `0 1px 4px ${alpha('#10b981', 0.15)}`,
                                }
                              }}
                            >
                              <Box sx={{
                                minWidth: '36px',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 0.4,
                                px: 0.6,
                                borderRadius: 0.5,
                                bgcolor: alpha('#10b981', 0.18),
                                border: `1px solid ${alpha('#10b981', 0.3)}`
                              }}>
                                <Typography variant="caption" sx={{ 
                                  fontWeight: 800,
                                  color: '#10b981',
                                  fontSize: '0.75rem',
                                  lineHeight: 1,
                                  letterSpacing: '0.2px'
                                }}>
                                  {item.count}
                                </Typography>
                              </Box>
                              
                              <Box sx={{
                                width: '1px',
                                height: '18px',
                                bgcolor: alpha('#10b981', 0.25),
                                flexShrink: 0,
                                borderRadius: '1px'
                              }} />
                              
                              <Typography variant="caption" sx={{ 
                                color: 'text.primary',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                                lineHeight: 1.4
                              }}>
                                {item.subject}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            </StatCard>
          </Grid>
          )}

          {/* Homework Diary Summary Card */}
          {isTeacherSummaryCardVisible(renderSettings, 'homework_diary_summary_card') && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{
              p: 1.5,
              px: 1.5,
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
              <Box sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 1.25,
                  flexShrink: 0
                }}>
                  <Assignment sx={{ 
                    fontSize: 18, 
                    color: '#ec4899',
                    flexShrink: 0
                  }} />
                  <Typography variant="subtitle2" sx={{ 
                    color: '#ec4899',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    lineHeight: 1
                  }}>
                    Homework Diary
                  </Typography>
                </Box>

                {homeworkSummary.totalAssignments === 0 ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 2,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      No assignments
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    '&::-webkit-scrollbar': {
                      width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: theme => alpha('#ec4899', 0.3),
                      borderRadius: '2px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: theme => alpha('#ec4899', 0.5),
                    },
                  }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      {/* Summary Stats */}
                      <Box sx={{
                        py: 1.25,
                        px: 1.25,
                        borderRadius: 1,
                        border: '1.5px solid',
                        borderColor: alpha('#ec4899', 0.3),
                        bgcolor: alpha('#ec4899', 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha('#ec4899', 0.12),
                          borderColor: alpha('#ec4899', 0.4),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 2px 8px ${alpha('#ec4899', 0.15)}`,
                        }
                      }}>
                        <Box sx={{
                          minWidth: '75px',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start'
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontWeight: 800,
                            color: '#ec4899',
                            fontSize: '0.9rem',
                            lineHeight: 1.2,
                            letterSpacing: '0.3px'
                          }}>
                            {homeworkSummary.totalAssignments}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: alpha('#ec4899', 0.7),
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            lineHeight: 1,
                            mt: 0.25
                          }}>
                            Assignments
                          </Typography>
                        </Box>
                        <Box sx={{
                          width: '1.5px',
                          height: '24px',
                          bgcolor: alpha('#ec4899', 0.25),
                          flexShrink: 0,
                          borderRadius: '1px'
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ 
                            color: 'text.primary',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'block',
                            lineHeight: 1.3,
                            mb: 0.25
                          }}>
                            {homeworkSummary.averagePerDay.toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            display: 'block',
                            lineHeight: 1
                          }}>
                            Avg per Day
                          </Typography>
                        </Box>
                      </Box>

                      {/* Classes Count */}
                      <Box sx={{
                        py: 1,
                        px: 1.25,
                        borderRadius: 1,
                        border: '1.5px solid',
                        borderColor: alpha('#ec4899', 0.3),
                        bgcolor: alpha('#ec4899', 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha('#ec4899', 0.12),
                          borderColor: alpha('#ec4899', 0.4),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 2px 8px ${alpha('#ec4899', 0.15)}`,
                        }
                      }}>
                        <Box sx={{
                          minWidth: '75px',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start'
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontWeight: 800,
                            color: '#ec4899',
                            fontSize: '0.9rem',
                            lineHeight: 1.2,
                            letterSpacing: '0.3px'
                          }}>
                            {homeworkSummary.assignmentsByClass.length}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: alpha('#ec4899', 0.7),
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            lineHeight: 1,
                            mt: 0.25
                          }}>
                            Classes
                          </Typography>
                        </Box>
                      </Box>

                      {/* Assignments by Subject */}
                      {homeworkSummary.assignmentsBySubject.length > 0 && (
                        <Box sx={{ 
                          width: '100%',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 0.5,
                          '&::-webkit-scrollbar': {
                            width: '6px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: theme => theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.common.white, 0.05) 
                              : alpha(theme.palette.common.black, 0.05),
                            borderRadius: '3px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme => theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.2)
                              : alpha(theme.palette.common.black, 0.2),
                            borderRadius: '3px',
                            '&:hover': {
                              background: theme => theme.palette.mode === 'dark'
                                ? alpha(theme.palette.common.white, 0.3)
                                : alpha(theme.palette.common.black, 0.3),
                            }
                          },
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => theme.palette.mode === 'dark'
                            ? `${alpha(theme.palette.common.white, 0.2)} ${alpha(theme.palette.common.white, 0.05)}`
                            : `${alpha(theme.palette.common.black, 0.2)} ${alpha(theme.palette.common.black, 0.05)}`,
                        }}>
                          <Stack spacing={0.5} sx={{ width: '100%' }}>
                            {homeworkSummary.assignmentsBySubject.map((item, index) => (
                              <Box
                                key={index}
                                sx={{
                                  py: 0.875,
                                  px: 1,
                                  borderRadius: 0.75,
                                  border: '1px solid',
                                  borderColor: alpha('#10b981', 0.2),
                                  bgcolor: alpha('#10b981', 0.06),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1,
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: alpha('#10b981', 0.1),
                                    borderColor: alpha('#10b981', 0.3),
                                  }
                                }}
                              >
                                <Typography variant="caption" sx={{ 
                                  color: 'text.primary',
                                  fontSize: '0.7rem',
                                  fontWeight: 500,
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.subject}
                                </Typography>
                                <Box sx={{
                                  minWidth: '24px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  bgcolor: alpha('#10b981', 0.15),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  px: 0.5,
                                  flexShrink: 0
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#10b981',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    lineHeight: 1
                                  }}>
                                    {item.count}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            </StatCard>
          </Grid>
          )}

          {/* Timetable Card */}
          {isTeacherSummaryCardVisible(renderSettings, 'timetable_summary_card') && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard sx={{
              p: 1.5,
              px: 1.5,
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
              <Box sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 1.25,
                  flexShrink: 0
                }}>
                  <CalendarToday sx={{ 
                    fontSize: 18, 
                    color: 'info.main',
                    flexShrink: 0
                  }} />
                  <Typography variant="subtitle2" sx={{ 
                    color: 'info.main',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    lineHeight: 1
                  }}>
                    Timetable
                  </Typography>
                </Box>

                {timetablePeriods === 0 ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 2,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      No timetable assigned
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    pr: 0.5,
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: theme => theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.common.white, 0.05) 
                        : alpha(theme.palette.common.black, 0.05),
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: theme => theme.palette.mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.2)
                        : alpha(theme.palette.common.black, 0.2),
                      borderRadius: '3px',
                      '&:hover': {
                        background: theme => theme.palette.mode === 'dark'
                          ? alpha(theme.palette.common.white, 0.3)
                          : alpha(theme.palette.common.black, 0.3),
                      }
                    },
                    scrollbarWidth: 'thin',
                    scrollbarColor: theme => theme.palette.mode === 'dark'
                      ? `${alpha(theme.palette.common.white, 0.2)} ${alpha(theme.palette.common.white, 0.05)}`
                      : `${alpha(theme.palette.common.black, 0.2)} ${alpha(theme.palette.common.black, 0.05)}`,
                  }}>
                    <Stack spacing={0.5} sx={{ width: '100%' }}>
                      {(() => {
                        const periods = [
                          { num: 1, time: '08:30-09:00' },
                          { num: 2, time: '09:00-09:30' },
                          { num: 3, time: '09:30-10:00' },
                          { num: 4, time: '10:00-10:30' },
                          { num: 5, time: '10:30-11:00' },
                          { num: 6, time: '11:15-11:45' },
                          { num: 7, time: '11:45-12:15' },
                          { num: 8, time: '12:15-12:45' },
                        ];

                        const getSubjectName = (id: number): string => subjects.find(s => s.id === id)?.name || '';
                        const getClassName = (id: number): string => classes.find(c => c.id === id)?.name || '';

                        const scheduleMap = new Map<number, { classes: string[]; subjects: string[] }>();
                        
                        timetableData.forEach((item: any) => {
                          const period = item.period_index + 1;
                          const className = getClassName(item.class_id);
                          const subjectName = getSubjectName(item.subject_id);
                          
                          if (!scheduleMap.has(period)) {
                            scheduleMap.set(period, { classes: [className], subjects: [subjectName] });
                          } else {
                            const existing = scheduleMap.get(period)!;
                            existing.classes.push(className);
                            existing.subjects.push(subjectName);
                          }
                        });

                        const allPeriods = [];
                        for (let i = 1; i <= periods.length; i++) {
                          if (i === 6) {
                            allPeriods.push({ period: 'Break', time: '11:00-11:15' });
                          }
                          
                          const scheduleItem = scheduleMap.get(i);
                          if (scheduleItem) {
                            const uniqueSubjects = Array.from(new Set(scheduleItem.subjects));
                            const uniqueClasses = Array.from(new Set(scheduleItem.classes));
                            allPeriods.push({
                              period: i,
                              time: periods[i-1].time,
                              class: uniqueClasses.join(' / '),
                              subject: uniqueSubjects.join(' / ')
                            });
                          } else {
                            allPeriods.push({
                              period: i,
                              time: periods[i-1].time,
                              class: 'Free',
                              subject: '-'
                            });
                          }
                        }

                        return allPeriods.map((item, index) => {
                          if (item.period === 'Break') {
                            return (
                              <Box
                                key={index}
                                sx={{
                                  py: 0.5,
                                  px: 0.875,
                                  borderRadius: 0.5,
                                  bgcolor: alpha('#f59e0b', 0.1),
                                  border: '1px solid',
                                  borderColor: alpha('#f59e0b', 0.2),
                                  textAlign: 'center',
                                  width: '100%',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <Typography variant="caption" sx={{ 
                                  fontWeight: 600, 
                                  color: '#f59e0b',
                                  fontSize: '0.65rem',
                                  lineHeight: 1.2
                                }}>
                                  BREAK
                                </Typography>
                              </Box>
                            );
                          }

                          const isFree = item.class === 'Free';
                          return (
                            <Box
                              key={index}
                              sx={{
                                py: 0.75,
                                px: 0.875,
                                borderRadius: 0.5,
                                border: '1px solid',
                                borderColor: isFree 
                                  ? alpha('#9e9e9e', 0.15)
                                  : theme => alpha(theme.palette.info.main, 0.2),
                                bgcolor: isFree 
                                  ? alpha('#9e9e9e', 0.03)
                                  : theme => alpha(theme.palette.info.main, 0.05),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.875,
                                width: '100%',
                                boxSizing: 'border-box',
                                minWidth: 0,
                              }}
                            >
                              {/* Period Number */}
                              <Typography variant="caption" sx={{ 
                                fontWeight: 700,
                                color: isFree ? 'text.secondary' : 'info.main',
                                fontSize: '0.7rem',
                                minWidth: '26px',
                                flexShrink: 0
                              }}>
                                P{item.period}
                              </Typography>
                              
                              {/* Separator */}
                              <Box sx={{
                                width: '1px',
                                height: '14px',
                                bgcolor: isFree 
                                  ? alpha('#9e9e9e', 0.2)
                                  : theme => alpha(theme.palette.info.main, 0.2),
                                flexShrink: 0
                              }} />
                              
                              {/* Class */}
                              {!isFree ? (
                                <>
                                  <Typography variant="caption" sx={{ 
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    minWidth: '55px',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {item.class}
                                  </Typography>
                                  
                                  {/* Separator */}
                                  <Box sx={{
                                    width: '1px',
                                    height: '14px',
                                    bgcolor: theme => alpha(theme.palette.info.main, 0.2),
                                    flexShrink: 0
                                  }} />
                                  
                                  {/* Subject */}
                                  <Typography variant="caption" sx={{ 
                                    color: 'info.main',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    minWidth: 0
                                  }}>
                                    {item.subject}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="caption" sx={{ 
                                  color: 'text.secondary',
                                  fontSize: '0.65rem',
                                  fontStyle: 'italic',
                                  flex: 1,
                                  minWidth: 0
                                }}>
                                  Free Period
                                </Typography>
                              )}
                            </Box>
                          );
                        });
                      })()}
                    </Stack>
                  </Box>
                )}
              </Box>
            </StatCard>
          </Grid>
          )}
        </Grid>
      </Box>

      {/* Tabs */}
      {visibleTabs.length > 0 && (
      <GlassCard>
        <TabsContainer>
          <ModernTabs
            value={getVisibleTabIndex(activeTab) >= 0 ? getVisibleTabIndex(activeTab) : 0}
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
            {visibleTabs.map((tab) => (
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
        </TabsContainer>

        {/* Info Tab */}
        {activeTab === 0 && isTeacherTabVisible(renderSettings, 'info_tab') && (
          <TabPanel>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <InfoSection>
                  <SectionTitle>
                    <Box className="icon-wrapper">
                      <Person />
                    </Box>
                    <Box className="title-content">
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700,
                        fontSize: { xs: '0.95rem', sm: '1.25rem' }
                      }}>
                        Personal Information
                      </Typography>
                    </Box>
                  </SectionTitle>
                  <InfoGrid container spacing={2}>
                    {teacher.dob && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Cake />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Date of Birth</Typography>
                          <Typography className="info-value">
                            {format(parseISO(teacher.dob), 'MMM dd, yyyy')}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.gender && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Person />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Gender</Typography>
                          <Typography className="info-value">{teacher.gender}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.blood_group && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Bloodtype />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Blood Group</Typography>
                          <Typography className="info-value">{teacher.blood_group}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.father_name && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Person />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Father's Name</Typography>
                          <Typography className="info-value">{teacher.father_name}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.national_id && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Assignment />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">National ID</Typography>
                          <Typography className="info-value">{teacher.national_id}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.religion && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Person />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Religion</Typography>
                          <Typography className="info-value">{teacher.religion}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.address && (
                      <Grid item xs={12} className="info-item">
                        <Box className="icon-container">
                          <LocationOn />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Address</Typography>
                          <Typography className="info-value">{teacher.address}</Typography>
                        </Box>
                      </Grid>
                    )}
                  </InfoGrid>
                </InfoSection>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoSection>
                  <SectionTitle>
                    <Box className="icon-wrapper">
                      <Work />
                    </Box>
                    <Box className="title-content">
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700,
                        fontSize: { xs: '0.95rem', sm: '1.25rem' }
                      }}>
                        Professional Information
                      </Typography>
                    </Box>
                  </SectionTitle>
                  <InfoGrid container spacing={2}>
                    {teacher.education && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <School />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Education</Typography>
                          <Typography className="info-value">{teacher.education}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.experience && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Work />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Experience</Typography>
                          <Typography className="info-value">{teacher.experience}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.role && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Work />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Role</Typography>
                          <Typography className="info-value">{teacher.role}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.joining_date && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <CalendarToday />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Joining Date</Typography>
                          <Typography className="info-value">
                            {format(parseISO(teacher.joining_date), 'MMM dd, yyyy')}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.salary && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <AttachMoney />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Salary</Typography>
                          <Typography className="info-value">Rs. {teacher.salary.toLocaleString()}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.mobile && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Phone />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Mobile</Typography>
                          <Typography className="info-value">{teacher.mobile}</Typography>
                        </Box>
                      </Grid>
                    )}
                    {teacher.email && (
                      <Grid item xs={12} sm={6} className="info-item">
                        <Box className="icon-container">
                          <Email />
                        </Box>
                        <Box className="info-content">
                          <Typography className="info-label">Email</Typography>
                          <Typography className="info-value">{teacher.email}</Typography>
                        </Box>
                      </Grid>
                    )}
                  </InfoGrid>
                </InfoSection>
              </Grid>
            </Grid>
          </TabPanel>
        )}

        {/* Attendance Tab */}
        {activeTab === 1 && isTeacherTabVisible(renderSettings, 'attendance_tab') && (() => {
          const theme = useTheme();
          return (
            <TabPanel>
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
                            {attendanceStats ? Math.round(((attendanceStats.absent + attendanceStats.leave) / attendanceStats.total) * 100) : 0}% Absence Rate
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
                            Last {Math.min(recentAttendance.length, 20)} records
                          </Typography>
                        </Box>
                        <RecentAttendanceContainer>
                          {recentAttendance.slice(0, 20).map((record, idx) => {
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
                              <RecentAttendanceItem key={idx}>
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
                                    <StatusChip status={record.status.toLowerCase()}>
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
                                    {halfLeave.leave_type === 'first_half' && halfLeave.arrival_time && ` (Arrived: ${halfLeave.arrival_time})`}
                                    {halfLeave.leave_type === 'second_half' && halfLeave.departure_time && ` (Departed: ${halfLeave.departure_time})`}
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
                              </RecentAttendanceItem>
                            );
                          })}
                          {recentAttendance.length === 0 && (
                            <Box sx={{ 
                              p: 4, 
                              textAlign: 'center',
                              color: 'text.secondary'
                            }}>
                              <Typography>No attendance records found</Typography>
                            </Box>
                          )}
                        </RecentAttendanceContainer>
                      </GlassCard>
                    </Grid>

                    {/* Weekly Day Patterns */}
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
            </TabPanel>
          );
        })()}

        {/* Timetable Tab */}
        {activeTab === 2 && isTeacherTabVisible(renderSettings, 'timetable_tab') && (
          <TabPanel>
            <TimetableContainer>
              {timetableData.length === 0 ? (
                <NoTimetableMessage>
                  <NoTimetableIcon>📅</NoTimetableIcon>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No timetable assigned yet
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Please contact your administrator to assign your teaching schedule.
                  </Typography>
                </NoTimetableMessage>
              ) : (
                <TimetableGrid>
                  {(() => {
                    const periods = [
                      { num: 1, time: '08:30-09:00' },
                      { num: 2, time: '09:00-09:30' },
                      { num: 3, time: '09:30-10:00' },
                      { num: 4, time: '10:00-10:30' },
                      { num: 5, time: '10:30-11:00' },
                      { num: 6, time: '11:15-11:45' },
                      { num: 7, time: '11:45-12:15' },
                      { num: 8, time: '12:15-12:45' },
                    ];

                    const getSubjectName = (id: number): string => subjects.find(s => s.id === id)?.name || '';
                    const getClassName = (id: number): string => classes.find(c => c.id === id)?.name || '';

                    const scheduleMap = new Map<number, { classes: string[]; subjects: string[] }>();
                    
                    timetableData.forEach((item: any) => {
                      const period = item.period_index + 1;
                      const className = getClassName(item.class_id);
                      const subjectName = getSubjectName(item.subject_id);
                      
                      if (!scheduleMap.has(period)) {
                        scheduleMap.set(period, { classes: [className], subjects: [subjectName] });
                      } else {
                        const existing = scheduleMap.get(period)!;
                        existing.classes.push(className);
                        existing.subjects.push(subjectName);
                      }
                    });

                    const allPeriods = [];
                    for (let i = 1; i <= periods.length; i++) {
                      if (i === 6) {
                        allPeriods.push({ period: 'Break', time: '11:00-11:15', class: '', subject: '' });
                      }
                      
                      const scheduleItem = scheduleMap.get(i);
                      if (scheduleItem) {
                        const uniqueSubjects = Array.from(new Set(scheduleItem.subjects));
                        const uniqueClasses = Array.from(new Set(scheduleItem.classes));
                        allPeriods.push({
                          period: i,
                          time: periods[i-1].time,
                          class: uniqueClasses.join(' / '),
                          subject: uniqueSubjects.join(' / ')
                        });
                      } else {
                        allPeriods.push({
                          period: i,
                          time: periods[i-1].time,
                          class: 'Free Period',
                          subject: '-'
                        });
                      }
                    }

                    return allPeriods.map((item, index) => {
                      if (item.period === 'Break') {
                        return (
                          <BreakCard key={index}>
                            <BreakHeader>
                              <BreakText>BREAK</BreakText>
                              <BreakTime>{item.time}</BreakTime>
                            </BreakHeader>
                          </BreakCard>
                        );
                      }

                      if (item.class === 'Free Period') {
                        return (
                          <FreePeriodCard key={index}>
                            <FreePeriodHeader>
                              <PeriodNumber>Period {item.period}</PeriodNumber>
                              <PeriodTime>{item.time}</PeriodTime>
                            </FreePeriodHeader>
                            <FreePeriodContent>
                              Free Period
                            </FreePeriodContent>
                          </FreePeriodCard>
                        );
                      }

                      return (
                        <PeriodCard key={index}>
                          <PeriodHeader>
                            <PeriodNumber>Period {item.period}</PeriodNumber>
                            <PeriodTime>{item.time}</PeriodTime>
                          </PeriodHeader>
                          <PeriodContent>
                            <ContentCard>
                              <ContentText>{item.class}</ContentText>
                            </ContentCard>
                            <ContentCard>
                              <ContentText>{item.subject}</ContentText>
                            </ContentCard>
                          </PeriodContent>
                        </PeriodCard>
                      );
                    });
                  })()}
                </TimetableGrid>
              )}
            </TimetableContainer>
          </TabPanel>
        )}

        {/* Test Analysis Tab */}
        {activeTab === 3 && isTeacherTabVisible(renderSettings, 'test_analysis_tab') && (
          <TabPanel>
            {/* Session Selector */}
            {sessions.length > 0 && (
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Session</InputLabel>
                  <Select
                    value={testAnalysisSessionId || ''}
                    label="Session"
                    onChange={(e) => {
                      const newSessionId = Number(e.target.value);
                      setTestAnalysisSessionId(newSessionId);
                      setTabDataLoaded(prev => ({ ...prev, [3]: false })); // Reset loaded state to reload data
                      lastSessionIdRef.current = null; // Reset ref to allow reload
                      isLoadingRef.current = false; // Reset loading ref
                      setTestMonthlyData([]); // Clear monthly data
                      setTestSummary({ // Clear summary data
                        totalTests: 0,
                        totalStudents: 0,
                        averagePercentage: 0,
                        testsBySubject: [],
                        recentTests: [],
                      });
                    }}
                  >
                    {sessions.map((session) => (
                      <MenuItem key={session.id} value={session.id}>
                        {session.name} {session.is_active && '(Active)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {!testAnalysisSessionId ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Please select a session
                </Typography>
              </Box>
            ) : testSummary.totalTests === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No test records found
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Overview Stats */}
                <Grid item xs={12} md={4}>
                  <InfoCard>
                    <CardContent>
                      <SectionTitle>
                        <Box className="icon-wrapper">
                          <Assessment />
                        </Box>
                        <Box className="title-content">
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Total Tests
                          </Typography>
                        </Box>
                      </SectionTitle>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'center', my: 2 }}>
                        {testSummary.totalTests}
                      </Typography>
                    </CardContent>
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={4}>
                  <InfoCard>
                    <CardContent>
                      <SectionTitle>
                        <Box className="icon-wrapper">
                          <Groups />
                        </Box>
                        <Box className="title-content">
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Students Assessed
                          </Typography>
                        </Box>
                      </SectionTitle>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: 'success.main', textAlign: 'center', my: 2 }}>
                        {testSummary.totalStudents}
                      </Typography>
                    </CardContent>
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={4}>
                  <InfoCard>
                    <CardContent>
                      <SectionTitle>
                        <Box className="icon-wrapper">
                          <TrendingUp />
                        </Box>
                        <Box className="title-content">
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Average Performance
                          </Typography>
                        </Box>
                      </SectionTitle>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: 'info.main', textAlign: 'center', my: 2 }}>
                        {testSummary.averagePercentage.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </InfoCard>
                </Grid>

                {/* Monthly Test Distribution */}
                {testMonthlyData.length > 0 && (
                  <Grid item xs={12}>
                    <InfoCard>
                      <CardContent>
                        <SectionTitle>
                          <Box className="icon-wrapper">
                            <CalendarToday />
                          </Box>
                          <Box className="title-content">
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Monthly Test Distribution
                            </Typography>
                          </Box>
                        </SectionTitle>
                        <Box sx={{ 
                          mt: 2,
                          maxHeight: '500px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 1,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: theme => alpha(theme.palette.divider, 0.1),
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme => alpha(theme.palette.primary.main, 0.4),
                            borderRadius: '4px',
                            border: theme => `1px solid ${alpha(theme.palette.background.paper, 0.2)}`,
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            background: theme => alpha(theme.palette.primary.main, 0.6),
                          },
                          // Firefox scrollbar
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => `${alpha(theme.palette.primary.main, 0.4)} ${alpha(theme.palette.divider, 0.1)}`,
                        }}>
                          <Grid container spacing={2}>
                            {testMonthlyData.length > 0 ? (
                              testMonthlyData.map((monthData, monthIndex) => {
                                // Array of distinct colors for months
                                const monthColors = [
                                  { bg: '#3b82f6', hover: '#2563eb' }, // Blue
                                  { bg: '#8b5cf6', hover: '#7c3aed' }, // Purple
                                  { bg: '#ec4899', hover: '#db2777' }, // Pink
                                  { bg: '#10b981', hover: '#059669' }, // Green
                                  { bg: '#f59e0b', hover: '#d97706' }, // Amber
                                  { bg: '#ef4444', hover: '#dc2626' }, // Red
                                  { bg: '#06b6d4', hover: '#0891b2' }, // Cyan
                                  { bg: '#84cc16', hover: '#65a30d' }, // Lime
                                  { bg: '#f97316', hover: '#ea580c' }, // Orange
                                  { bg: '#6366f1', hover: '#4f46e5' }, // Indigo
                                  { bg: '#14b8a6', hover: '#0d9488' }, // Teal
                                  { bg: '#a855f7', hover: '#9333ea' }, // Violet
                                ];
                                const colorIndex = monthIndex % monthColors.length;
                                const monthColor = monthColors[colorIndex];
                                
                                return (
                              <Grid item xs={12} sm={6} md={3} key={monthData.monthKey}>
                                <Box
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: alpha(monthColor.bg, 0.3),
                                    bgcolor: alpha(monthColor.bg, 0.05),
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: alpha(monthColor.bg, 0.1),
                                      borderColor: monthColor.bg,
                                    },
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                                      {monthData.month}
                                    </Typography>
                                    <Chip
                                      label={`${monthData.totalTests} test${monthData.totalTests !== 1 ? 's' : ''}`}
                                      size="small"
                                      sx={{
                                        bgcolor: alpha(monthColor.bg, 0.15),
                                        color: monthColor.bg,
                                        fontWeight: 600,
                                        border: `1px solid ${alpha(monthColor.bg, 0.3)}`,
                                      }}
                                    />
                                  </Box>
                                  <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                    <Stack spacing={1}>
                                      {monthData.weeks.map((week) => (
                                        <Box
                                          key={week.weekNumber}
                                          sx={{
                                            p: 1.5,
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: alpha(monthColor.bg, 0.2),
                                            bgcolor: alpha(monthColor.bg, 0.03),
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                              bgcolor: alpha(monthColor.bg, 0.08),
                                              transform: 'translateX(4px)',
                                            },
                                          }}
                                        >
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                              Week {week.weekNumber}: {week.week}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: monthColor.bg }}>
                                              {week.tests} test{week.tests !== 1 ? 's' : ''}
                                            </Typography>
                                          </Box>
                                          {week.classes.length > 0 && (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                              {week.classes.map((classData, idx) => (
                                                <Chip
                                                  key={idx}
                                                  label={`${classData.className} (${classData.testCount})`}
                                                  size="small"
                                                  sx={{
                                                    fontSize: '0.7rem',
                                                    height: '24px',
                                                    bgcolor: alpha('#8b5cf6', 0.1),
                                                    color: '#8b5cf6',
                                                    border: `1px solid ${alpha('#8b5cf6', 0.3)}`,
                                                  }}
                                                />
                                              ))}
                                            </Box>
                                          )}
                                        </Box>
                                      ))}
                                    </Stack>
                                  </Box>
                                </Box>
                              </Grid>
                                );
                              })
                            ) : (
                              <Grid item xs={12}>
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    No monthly test data available
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </CardContent>
                    </InfoCard>
                  </Grid>
                )}

                {/* Tests by Subject */}
                {testSummary.testsBySubject.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <InfoCard>
                      <CardContent>
                        <SectionTitle>
                          <Box className="icon-wrapper">
                            <Class />
                          </Box>
                          <Box className="title-content">
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Tests by Subject
                            </Typography>
                          </Box>
                        </SectionTitle>
                        <Stack spacing={1} sx={{ mt: 2 }}>
                          {testSummary.testsBySubject.map((item, index) => (
                            <Box
                              key={index}
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: alpha('#10b981', 0.2),
                                bgcolor: alpha('#10b981', 0.06),
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: alpha('#10b981', 0.1),
                                  borderColor: alpha('#10b981', 0.3),
                                },
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {item.subject}
                              </Typography>
                              <Chip
                                label={item.count}
                                size="small"
                                sx={{
                                  bgcolor: alpha('#10b981', 0.15),
                                  color: '#10b981',
                                  fontWeight: 700,
                                }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </InfoCard>
                  </Grid>
                )}

                {/* Recent Tests */}
                {testSummary.recentTests.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <InfoCard>
                      <CardContent>
                        <SectionTitle>
                          <Box className="icon-wrapper">
                            <HistoryIcon />
                          </Box>
                          <Box className="title-content">
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Recent Tests
                            </Typography>
                          </Box>
                        </SectionTitle>
                        <Box sx={{ 
                          mt: 2,
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 1,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: theme => alpha(theme.palette.divider, 0.1),
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme => alpha(theme.palette.primary.main, 0.4),
                            borderRadius: '4px',
                            border: theme => `1px solid ${alpha(theme.palette.background.paper, 0.2)}`,
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            background: theme => alpha(theme.palette.primary.main, 0.6),
                          },
                          // Firefox scrollbar
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => `${alpha(theme.palette.primary.main, 0.4)} ${alpha(theme.palette.divider, 0.1)}`,
                        }}>
                          <Stack spacing={1}>
                            {testSummary.recentTests.map((test) => (
                            <Box
                              key={test.id}
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: alpha('#3b82f6', 0.05),
                                  transform: 'translateX(4px)',
                                },
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {test.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                <Chip
                                  label={test.subject}
                                  size="small"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                                <Chip
                                  label={test.class}
                                  size="small"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                  {format(parseISO(test.date), 'MMM dd, yyyy')}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                          </Stack>
                        </Box>
                      </CardContent>
                    </InfoCard>
                  </Grid>
                )}
              </Grid>
            )}
          </TabPanel>
        )}

        {/* Diary Analysis Tab */}
        {activeTab === 4 && isTeacherTabVisible(renderSettings, 'diary_analysis_tab') && (
          <TabPanel>
            {/* Session Selector */}
            {sessions.length > 0 && (
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Session</InputLabel>
                  <Select
                    value={diaryAnalysisSessionId || ''}
                    label="Session"
                    onChange={(e) => setDiaryAnalysisSessionId(e.target.value as number)}
                  >
                    {sessions.map((session) => (
                      <MenuItem key={session.id} value={session.id}>
                        {session.name} {session.is_active && '(Active)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {tabDataLoading[4] ? (
              <Grid container spacing={3}>
                {/* Session Selector Skeleton */}
                {sessions.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                      <Skeleton variant="rectangular" width={200} height={40} sx={{ borderRadius: 1 }} />
                    </Box>
                  </Grid>
                )}

                {/* Overview Stats Skeleton */}
                <Grid item xs={12} md={4}>
                  <InfoCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={150} height={28} />
                      </Box>
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Skeleton variant="text" width={80} height={56} sx={{ mx: 'auto', mb: 1 }} />
                        <Skeleton variant="text" width={120} height={20} sx={{ mx: 'auto' }} />
                      </Box>
                    </CardContent>
                  </InfoCard>
                </Grid>

                <Grid item xs={12} md={6}>
                  <InfoCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={140} height={28} />
                      </Box>
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Skeleton variant="text" width={60} height={56} sx={{ mx: 'auto', mb: 1 }} />
                        <Skeleton variant="text" width={140} height={20} sx={{ mx: 'auto' }} />
                      </Box>
                    </CardContent>
                  </InfoCard>
                </Grid>

                {/* Monthly Diary Distribution Skeleton */}
                <Grid item xs={12}>
                  <InfoCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={220} height={28} />
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          {[1, 2, 3, 4].map((i) => (
                            <Grid item xs={12} sm={6} md={3} key={i}>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'background.paper',
                                  height: '200px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Skeleton variant="text" width={80} height={24} />
                                  <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 1 }} />
                                </Box>
                                <Stack spacing={1} sx={{ flex: 1 }}>
                                  {[1, 2].map((j) => (
                                    <Box
                                      key={j}
                                      sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Skeleton variant="text" width={100} height={20} />
                                        <Skeleton variant="text" width={80} height={20} />
                                      </Box>
                                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                        <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
                                        <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
                                      </Box>
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </CardContent>
                  </InfoCard>
                </Grid>

                {/* Assignments by Subject Skeleton */}
                <Grid item xs={12} md={6}>
                  <InfoCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={180} height={28} />
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Stack spacing={1}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Box
                              key={i}
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Skeleton variant="text" width={120} height={20} />
                              <Skeleton variant="rectangular" width={30} height={24} sx={{ borderRadius: 1 }} />
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </CardContent>
                  </InfoCard>
                </Grid>

                {/* Recent Assignments Skeleton */}
                <Grid item xs={12} md={6}>
                  <InfoCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={160} height={28} />
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Stack spacing={1}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Box
                              key={i}
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                                <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: 1 }} />
                                <Skeleton variant="rectangular" width={100} height={20} sx={{ borderRadius: 1 }} />
                                <Skeleton variant="text" width={90} height={16} sx={{ ml: 'auto' }} />
                              </Box>
                              <Skeleton variant="text" width="100%" height={16} />
                              <Skeleton variant="text" width="80%" height={16} sx={{ mt: 0.5 }} />
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </CardContent>
                  </InfoCard>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={3}>
                {/* Overview Stats */}
                <Grid item xs={12} md={4}>
                  <InfoCard>
                    <CardContent>
                      <SectionTitle>
                        <Box className="icon-wrapper">
                          <Assignment />
                        </Box>
                        <Box className="title-content">
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Total Assignments
                          </Typography>
                        </Box>
                      </SectionTitle>
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#ec4899' }}>
                          {diaryAnalysisData.totalAssignments}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Assignments Created
                        </Typography>
                      </Box>
                    </CardContent>
                  </InfoCard>
                </Grid>

                <Grid item xs={12} md={6}>
                  <InfoCard>
                    <CardContent>
                      <SectionTitle>
                        <Box className="icon-wrapper">
                          <TrendingUp />
                        </Box>
                        <Box className="title-content">
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Average per Day
                          </Typography>
                        </Box>
                      </SectionTitle>
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#10b981' }}>
                          {diaryAnalysisData.averagePerDay.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Assignments per Day
                        </Typography>
                      </Box>
                    </CardContent>
                  </InfoCard>
                </Grid>

                {/* Monthly Diary Distribution */}
                {diaryMonthlyData.length > 0 && (
                  <Grid item xs={12}>
                    <InfoCard>
                      <CardContent>
                        <SectionTitle>
                          <Box className="icon-wrapper">
                            <CalendarToday />
                          </Box>
                          <Box className="title-content">
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Monthly Diary Distribution
                            </Typography>
                          </Box>
                        </SectionTitle>
                        <Box sx={{ 
                          mt: 2,
                          maxHeight: '500px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 1,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: theme => alpha(theme.palette.divider, 0.1),
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme => alpha('#ec4899', 0.4),
                            borderRadius: '4px',
                            border: theme => `1px solid ${alpha(theme.palette.background.paper, 0.2)}`,
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            background: theme => alpha('#ec4899', 0.6),
                          },
                          // Firefox scrollbar
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => `${alpha('#ec4899', 0.4)} ${alpha(theme.palette.divider, 0.1)}`,
                        }}>
                          <Grid container spacing={2}>
                            {diaryMonthlyData.map((monthData, monthIndex) => {
                              // Array of distinct colors for months (pink theme)
                              const monthColors = [
                                { bg: '#ec4899', hover: '#db2777' }, // Pink
                                { bg: '#f472b6', hover: '#f43f5e' }, // Rose
                                { bg: '#fb7185', hover: '#f43f5e' }, // Pink Rose
                                { bg: '#fda4af', hover: '#fb7185' }, // Light Pink
                                { bg: '#f97316', hover: '#ea580c' }, // Orange
                                { bg: '#f59e0b', hover: '#d97706' }, // Amber
                                { bg: '#8b5cf6', hover: '#7c3aed' }, // Purple
                                { bg: '#a855f7', hover: '#9333ea' }, // Violet
                                { bg: '#c084fc', hover: '#a855f7' }, // Light Purple
                                { bg: '#d946ef', hover: '#c026d3' }, // Fuchsia
                                { bg: '#e879f9', hover: '#d946ef' }, // Light Fuchsia
                                { bg: '#f0abfc', hover: '#e879f9' }, // Very Light Fuchsia
                              ];
                              const colorIndex = monthIndex % monthColors.length;
                              const monthColor = monthColors[colorIndex];
                              
                              return (
                                <Grid item xs={12} sm={6} md={3} key={monthData.monthKey}>
                                  <Box
                                    sx={{
                                      p: 2,
                                      borderRadius: 2,
                                      border: '1px solid',
                                      borderColor: alpha(monthColor.bg, 0.3),
                                      bgcolor: alpha(monthColor.bg, 0.05),
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        bgcolor: alpha(monthColor.bg, 0.1),
                                        borderColor: monthColor.bg,
                                      },
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                                        {monthData.month}
                                      </Typography>
                                      <Chip
                                        label={`${monthData.totalAssignments} assignment${monthData.totalAssignments !== 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{
                                          bgcolor: alpha(monthColor.bg, 0.15),
                                          color: monthColor.bg,
                                          fontWeight: 600,
                                          border: `1px solid ${alpha(monthColor.bg, 0.3)}`,
                                        }}
                                      />
                                    </Box>
                                    <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                      <Stack spacing={1}>
                                        {monthData.weeks.map((week) => (
                                          <Box
                                            key={week.weekNumber}
                                            sx={{
                                              p: 1.5,
                                              borderRadius: 1,
                                              border: '1px solid',
                                              borderColor: alpha(monthColor.bg, 0.2),
                                              bgcolor: alpha(monthColor.bg, 0.03),
                                              transition: 'all 0.2s ease',
                                              '&:hover': {
                                                bgcolor: alpha(monthColor.bg, 0.08),
                                                transform: 'translateX(4px)',
                                              },
                                            }}
                                          >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                Week {week.weekNumber}: {week.week}
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 700, color: monthColor.bg }}>
                                                {week.assignments} assignment{week.assignments !== 1 ? 's' : ''}
                                              </Typography>
                                            </Box>
                                            {week.classes.length > 0 && (
                                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                                {week.classes.map((classData, idx) => (
                                                  <Chip
                                                    key={idx}
                                                    label={`${classData.className} (${classData.assignmentCount})`}
                                                    size="small"
                                                    sx={{
                                                      fontSize: '0.7rem',
                                                      height: '24px',
                                                      bgcolor: alpha('#8b5cf6', 0.1),
                                                      color: '#8b5cf6',
                                                      border: `1px solid ${alpha('#8b5cf6', 0.3)}`,
                                                    }}
                                                  />
                                                ))}
                                              </Box>
                                            )}
                                          </Box>
                                        ))}
                                      </Stack>
                                    </Box>
                                  </Box>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                      </CardContent>
                    </InfoCard>
                  </Grid>
                )}

                {/* Assignments by Subject */}
                {diaryAnalysisData.assignmentsBySubject.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <InfoCard>
                      <CardContent>
                        <SectionTitle>
                          <Box className="icon-wrapper">
                            <Assignment />
                          </Box>
                          <Box className="title-content">
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Assignments by Subject
                            </Typography>
                          </Box>
                        </SectionTitle>
                        <Box sx={{ 
                          mt: 2,
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 1,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: theme => alpha(theme.palette.divider, 0.1),
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme => alpha('#10b981', 0.4),
                            borderRadius: '4px',
                            border: theme => `1px solid ${alpha(theme.palette.background.paper, 0.2)}`,
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            background: theme => alpha('#10b981', 0.6),
                          },
                          // Firefox scrollbar
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => `${alpha('#10b981', 0.4)} ${alpha(theme.palette.divider, 0.1)}`,
                        }}>
                          <Stack spacing={1}>
                            {diaryAnalysisData.assignmentsBySubject.map((item, index) => (
                              <Box
                                key={index}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: alpha('#10b981', 0.2),
                                  bgcolor: alpha('#10b981', 0.06),
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: alpha('#10b981', 0.1),
                                    transform: 'translateX(4px)',
                                  },
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {item.subject}
                                </Typography>
                                <Chip
                                  label={item.count}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha('#10b981', 0.15),
                                    color: '#10b981',
                                    fontWeight: 600,
                                  }}
                                />
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </CardContent>
                    </InfoCard>
                  </Grid>
                )}

                {/* Recent Assignments */}
                {diaryAnalysisData.recentAssignments.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <InfoCard>
                      <CardContent>
                        <SectionTitle>
                          <Box className="icon-wrapper">
                            <HistoryIcon />
                          </Box>
                          <Box className="title-content">
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Recent Assignments
                            </Typography>
                          </Box>
                        </SectionTitle>
                        <Box sx={{ 
                          mt: 2,
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          pr: 1,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: theme => alpha(theme.palette.divider, 0.1),
                            borderRadius: '4px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: theme => alpha('#ec4899', 0.4),
                            borderRadius: '4px',
                            border: theme => `1px solid ${alpha(theme.palette.background.paper, 0.2)}`,
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            background: theme => alpha('#ec4899', 0.6),
                          },
                          // Firefox scrollbar
                          scrollbarWidth: 'thin',
                          scrollbarColor: theme => `${alpha('#ec4899', 0.4)} ${alpha(theme.palette.divider, 0.1)}`,
                        }}>
                          <Stack spacing={1}>
                            {diaryAnalysisData.recentAssignments.map((assignment) => (
                              <Box
                                key={assignment.id}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: alpha('#ec4899', 0.05),
                                    transform: 'translateX(4px)',
                                  },
                                }}
                              >
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                                  <Chip
                                    label={assignment.subject}
                                    size="small"
                                    sx={{ fontSize: '0.7rem', height: '20px', bgcolor: alpha('#10b981', 0.1), color: '#10b981' }}
                                  />
                                  <Chip
                                    label={assignment.class}
                                    size="small"
                                    sx={{ fontSize: '0.7rem', height: '20px' }}
                                  />
                                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                    {format(parseISO(assignment.date), 'MMM dd, yyyy')}
                                  </Typography>
                                </Box>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'text.primary',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.6,
                                    mt: 0.75,
                                    mb: 0.25,
                                    wordWrap: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                  }}
                                >
                                  {assignment.description || ''}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </CardContent>
                    </InfoCard>
                  </Grid>
                )}

                {/* Empty State */}
                {!tabDataLoading[4] && diaryAnalysisData.totalAssignments === 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        No Diary Assignments
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No homework diary assignments found for the selected session.
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </TabPanel>
        )}

      </GlassCard>
      )}

      {/* Edit Profile Modal */}
      <StyledDialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
      >
        <DialogHeader>
          <DialogTitleStyled>
            Edit Profile
          </DialogTitleStyled>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button 
              onClick={handleCloseEditModal} 
              disabled={editLoading}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editFormRef.current) {
                  editFormRef.current.requestSubmit();
                }
              }}
              variant="contained"
              disabled={editLoading}
              sx={{ 
                textTransform: 'none',
                minWidth: 100,
                background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
                }
              }}
            >
              {editLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Update'}
            </Button>
          </Box>
        </DialogHeader>
        <form ref={editFormRef} onSubmit={handleEditSubmit}>
          <StyledDialogContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleEditImage}
              style={{ display: 'none' }}
            />
            <PhotoUploadSection onClick={() => fileInputRef.current?.click()}>
              <AvatarContainer>
                <Avatar
                  src={editImage || teacher?.picture_url || undefined}
                  sx={{
                    width: 120,
                    height: 120,
                    cursor: 'pointer',
                    border: `3px solid ${theme.palette.primary.main}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                    }
                  }}
                >
                  {!editImage && !teacher?.picture_url && (
                    <AccountCircle sx={{ fontSize: 120, color: 'text.secondary' }} />
                  )}
                </Avatar>
                <UploadIconOverlay>
                  <PhotoCamera sx={{ fontSize: 20 }} />
                </UploadIconOverlay>
                {(editImage || teacher?.picture_url) && (
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEditImage();
                    }}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      left: -8,
                      bgcolor: 'error.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'error.dark' },
                      zIndex: 2,
                    }}
                    size="small"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </AvatarContainer>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 500,
                  mt: 1,
                  textAlign: 'center'
                }}
              >
                {editImage || teacher?.picture_url ? 'Click to change photo' : 'Click to upload photo'}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  mt: 0.5,
                  textAlign: 'center',
                  opacity: 0.7
                }}
              >
                JPG, PNG or GIF (max 5MB)
              </Typography>
            </PhotoUploadSection>
            <Grid container spacing={2}>
              {/* Basic Information */}
              <ModalSectionContainer sx={{ width: '100%' }}>
                <ModalSectionTitle>Basic Information</ModalSectionTitle>
              </ModalSectionContainer>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Employee Name"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mobile No"
                  name="mobile"
                  value={editForm.mobile}
                  onChange={handleEditFormChange}
                  placeholder="e.g +92xxxxxxxxxx"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Employee Role</InputLabel>
                  <Select
                    name="role"
                    value={editForm.role}
                    onChange={handleEditFormChange}
                    label="Employee Role"
                    required
                  >
                    {ROLE_OPTIONS.map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date of Joining"
                  name="joiningDate"
                  type="date"
                  value={editForm.joiningDate}
                  onChange={handleEditFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Other Information */}
              <ModalSectionContainer sx={{ width: '100%', mt: 2 }}>
                <ModalSectionTitle>Other Information</ModalSectionTitle>
              </ModalSectionContainer>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Father / Husband Name"
                  name="fatherName"
                  value={editForm.fatherName}
                  onChange={handleEditFormChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    name="gender"
                    value={editForm.gender}
                    onChange={handleEditFormChange}
                    label="Gender"
                  >
                    {GENDER_OPTIONS.map(g => (
                      <MenuItem key={g} value={g}>{g}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Experience"
                  name="experience"
                  value={editForm.experience}
                  onChange={handleEditFormChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="National ID"
                  name="nationalId"
                  value={editForm.nationalId}
                  onChange={handleEditFormChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Education"
                  name="education"
                  value={editForm.education}
                  onChange={handleEditFormChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Religion</InputLabel>
                  <Select
                    name="religion"
                    value={editForm.religion}
                    onChange={handleEditFormChange}
                    label="Religion"
                  >
                    {RELIGION_OPTIONS.map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Blood Group</InputLabel>
                  <Select
                    name="bloodGroup"
                    value={editForm.bloodGroup}
                    onChange={handleEditFormChange}
                    label="Blood Group"
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditFormChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  name="dob"
                  type="date"
                  value={editForm.dob}
                  onChange={handleEditFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Home Address"
                  name="address"
                  value={editForm.address}
                  onChange={handleEditFormChange}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </StyledDialogContent>
        </form>
      </StyledDialog>

      {/* Score Breakdown Modal */}
      <Dialog
        open={scoreBreakdownOpen}
        onClose={() => setScoreBreakdownOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.95)
              : alpha(theme.palette.background.paper, 0.98),
            backdropFilter: 'blur(20px)',
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
            <Assessment sx={{ color: getScoreColor(teacherScore).main }} />
            <Typography variant="h6" fontWeight={600}>
              Score Breakdown
            </Typography>
          </Box>
          <IconButton
            onClick={() => setScoreBreakdownOpen(false)}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: 'error.main',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {(() => {
            const breakdown = calculateScoreBreakdown(
              attendanceStats,
              halfLeavesMap.size,
              homeworkSummary,
              testSummary,
              enableDiaryScoreDeduction,
              enableAttendanceDeduction,
              enableTestDeduction
            );

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Base Score */}
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight={600} color="success.main">
                      Base Score
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {breakdown.baseScore}
                    </Typography>
                  </Box>
                </Box>

                {/* Deductions */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: 'text.secondary' }}>
                    Deductions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Attendance Deduction */}
                    {enableAttendanceDeduction && (
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.error.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Cancel sx={{ fontSize: 20, color: 'error.main' }} />
                            <Typography variant="body2" fontWeight={600}>
                              Attendance
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700} color="error.main">
                            -{breakdown.attendanceDeduction}
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Absent: {breakdown.attendanceDetails.absent} × 0.2 = -{(breakdown.attendanceDetails.absent * 0.2).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Leave: {breakdown.attendanceDetails.leave} × 0.1 = -{(breakdown.attendanceDetails.leave * 0.1).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Late: {breakdown.attendanceDetails.late} × 0.1 = -{(breakdown.attendanceDetails.late * 0.1).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Half Leave: {breakdown.attendanceDetails.halfLeave} × 0.05 = -{(breakdown.attendanceDetails.halfLeave * 0.05).toFixed(1)}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Diary Deduction */}
                    {enableDiaryScoreDeduction && breakdown.diaryDetails && (
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Assignment sx={{ fontSize: 20, color: 'warning.main' }} />
                            <Typography variant="body2" fontWeight={600}>
                              Diary Assignments
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700} color="warning.main">
                            {breakdown.diaryDeduction > 0 ? `-${breakdown.diaryDeduction}` : '0'}
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 4 }}>
                          <Typography variant="caption" color="text.secondary">
                            Average: {breakdown.diaryDetails.averagePerDay.toFixed(2)} assignments/day
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {breakdown.diaryDetails.deductionReason}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Test Deduction */}
                    {enableTestDeduction && breakdown.testDetails && (
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Assessment sx={{ fontSize: 20, color: 'info.main' }} />
                            <Typography variant="body2" fontWeight={600}>
                              Test Performance
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700} color="info.main">
                            {breakdown.testDeduction > 0 ? `-${breakdown.testDeduction}` : '0'}
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 4 }}>
                          <Typography variant="caption" color="text.secondary">
                            Average: {breakdown.testDetails.averagePercentage.toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {breakdown.testDetails.deductionReason}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* No Deductions Message */}
                    {breakdown.totalDeduction === 0 && (
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                        textAlign: 'center',
                      }}>
                        <Typography variant="body2" color="success.main" fontWeight={500}>
                          No deductions applied
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Total Deduction */}
                {breakdown.totalDeduction > 0 && (
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" fontWeight={600} color="error.main">
                        Total Deduction
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="error.main">
                        -{breakdown.totalDeduction}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Final Score */}
                <Box sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: alpha(getScoreColor(breakdown.finalScore).main, 0.1),
                  border: `2px solid ${alpha(getScoreColor(breakdown.finalScore).main, 0.3)}`,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: getScoreColor(breakdown.finalScore).main }}>
                      Final Score
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: getScoreColor(breakdown.finalScore).main }}>
                      {breakdown.finalScore}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {getScoreLabel(breakdown.finalScore)}
                  </Typography>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>
    </ProfileContainer>
  );
};

export default TeacherProfile;

