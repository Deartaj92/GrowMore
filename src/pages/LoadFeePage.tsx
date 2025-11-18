import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, Button, useTheme, useMediaQuery, styled, CircularProgress, Divider, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Card, InputAdornment, LinearProgress
} from '@mui/material';
import { sortClasses } from '../utils/classUtils';
import { Add as AddIcon, CheckCircle, ErrorOutline, Person, Group, CalendarMonth, AttachMoney, School, Commute, FamilyRestroom, Loyalty, Delete, Edit, Close as CloseIcon, CheckCircleOutline } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { feeService } from '../services/feeService';
import { alpha } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Paper from '@mui/material/Paper';
import { useToast } from '../components/useToast';
import { Theme } from '@mui/material/styles';
import LoadingButton from '@mui/lab/LoadingButton';
import { keyframes } from '@emotion/react';
import NoStudentsFound from '../components/NoStudentsFound';
import Loader from '../components/Loader';

const pulseKeyframes = keyframes({
  '0%': { opacity: 0.4 },
  '50%': { opacity: 1 },
  '100%': { opacity: 0.4 }
});

// --- Styled Components (reuse FeeStructureManager style) ---
const PageContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  margin: 0,
  padding: '0 12px 6px 12px',
  boxSizing: 'border-box',
  background: theme.palette.mode === 'dark'
    ? '#1a1a1a'
    : '#f8fafc',
  maxWidth: '100vw',
  overflowX: 'hidden',
  minHeight: '92vh',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('sm')]: {
    padding: '0 8px 4px 8px'
  }
}));
const Header = styled(Box)(({ theme }) => ({
  flex: '0 0 auto',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  margin: '6px 0 4px 0',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f8fafc',
  boxShadow: '0 1px 6px #0001',
  borderRadius: '10px',
  padding: '4px 8px 2px 8px',
  minHeight: '36px',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '8px'
  }
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.05rem',
  fontWeight: 800,
  letterSpacing: '1px',
  color: theme.palette.mode === 'dark' ? '#4a6cf7' : '#2563eb',
  margin: 0,
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
    textAlign: 'center'
  }
}));
const MainContent = styled(Box)(({ theme }) => ({
  flex: '1 1 auto',
  minHeight: 0,
  maxHeight: 'none',
  overflowY: 'auto',
  padding: '0 0 32px 0',
  scrollBehavior: 'smooth',
  WebkitOverflowScrolling: 'touch',
  scrollSnapType: 'y proximity',
  willChange: 'scroll-position',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  [theme.breakpoints.down('sm')]: {
    scrollBehavior: 'auto',
    WebkitOverflowScrolling: 'touch'
  }
}));

const GlassCard = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.85)
    : alpha(theme.palette.background.paper, 0.75),
  backdropFilter: 'blur(8px)',
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  boxShadow: theme.palette.mode === 'dark'
    ? `0 2px 12px ${alpha(theme.palette.common.black, 0.2)}`
    : `0 2px 12px ${alpha(theme.palette.common.black, 0.08)}`,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  padding: '12px 8px 8px 8px',
  marginTop: '8px',
}));
const PillButton = styled(Button)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(45deg, #4a6cf7, #7c3aed)'
    : 'linear-gradient(45deg, #4a6cf7, #3b82f6)',
  color: 'white',
  borderRadius: '10px',
  padding: '6px 20px',
  minWidth: 0,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.97rem',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 4px 16px rgba(74, 108, 247, 0.18)'
    : '0 4px 16px rgba(74, 108, 247, 0.12)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 8px 24px rgba(74, 108, 247, 0.22)'
      : '0 8px 24px rgba(74, 108, 247, 0.18)'
  }
}));

// Fee Head Pill/Button
interface FeeHeadPillProps {
  selected?: boolean;
}
const GlassSelectorContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'rgba(40,48,80,0.13)'
    : 'rgba(255,255,255,0.68)',
  borderRadius: 10,
  boxShadow: 'none',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(74,108,247,0.10)'
    : '1px solid rgba(74,108,247,0.07)',
  padding: theme.spacing(1.2, 1.5),
  margin: `${theme.spacing(1.2)} 0`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
}));
const FeeHeadPill = styled(Box, { shouldForwardProp: (prop) => prop !== 'selected' })<FeeHeadPillProps>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: '5px 10px',
  borderRadius: 8,
  background: selected
    ? (theme.palette.mode === 'dark'
        ? 'rgba(74,108,247,0.18)'
        : 'rgba(74,108,247,0.10)')
    : (theme.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(0,0,0,0.02)'),
  color: selected ? theme.palette.primary.main : theme.palette.text.primary,
  fontWeight: 500,
  fontSize: '0.9rem',
  cursor: 'pointer',
  boxShadow: 'none',
  border: selected
    ? `1.5px solid ${theme.palette.primary.main}`
    : '1px solid rgba(74,108,247,0.08)',
  transition: 'all 0.15s',
  userSelect: 'none',
  position: 'relative',
  minWidth: 0,
  '&:hover, &:focus': {
    background: selected
      ? (theme.palette.mode === 'dark'
          ? 'rgba(74,108,247,0.24)'
          : 'rgba(74,108,247,0.14)')
      : (theme.palette.mode === 'dark'
          ? 'rgba(74,108,247,0.10)'
          : 'rgba(74,108,247,0.06)'),
    borderColor: theme.palette.primary.main,
  },
}));
const FeeHeadIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: 5,
  background: 'rgba(74,108,247,0.08)',
  color: theme.palette.primary.main,
  fontSize: 16,
  flexShrink: 0,
}));
const FeeHeadName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.9rem',
  color: 'inherit',
  lineHeight: 1.1,
}));
const FeeHeadDesc = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  color: theme.palette.text.secondary,
  fontWeight: 400,
  opacity: 0.7,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 120,
  marginLeft: theme.spacing(0.5),
}));
const FeeHeadSelectorBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  alignItems: 'center',
  minHeight: 0,
}));
const FeeHeadSelectorActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  alignItems: 'center',
  marginLeft: 'auto',
}));

// Glassy sidebar container with blue accent border
const GlassSidebar = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'rgba(40,48,80,0.15)'
    : 'rgba(255,255,255,0.85)',
  borderRadius: 12,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 2px 12px 0 #0003'
    : '0 2px 12px 0 #4a6cf70a',
  borderLeft: `3px solid ${theme.palette.primary.main}`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  padding: theme.spacing(2, 1.5, 1.5, 1.5),
  minWidth: 0,
  position: 'sticky',
  top: theme.spacing(2),
  alignSelf: 'flex-start',
  [theme.breakpoints.down('md')]: {
    position: 'static',
    borderLeft: 'none',
    borderRadius: 10,
    padding: theme.spacing(1.5, 1, 1, 1),
  },
}));
const SectionHeader = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '0.95rem',
  color: theme.palette.mode === 'dark' ? '#4a6cf7' : '#2563eb',
  marginBottom: theme.spacing(1),
  marginTop: theme.spacing(0.5),
  letterSpacing: 0.2,
}));
const GlassMainCard = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'rgba(40,48,80,0.15)'
    : 'rgba(255,255,255,0.92)',
  borderRadius: 12,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 2px 12px 0 #0003'
    : '0 2px 12px 0 #4a6cf70a',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
  padding: theme.spacing(2, 2, 1.5, 2),
  minHeight: 260,
  width: '100%',
  [theme.breakpoints.down('md')]: {
    borderRadius: 10,
    padding: theme.spacing(1.5, 1, 1, 1),
  },
}));

const PaginationContainer = styled(Box)(({ theme }) => ({
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  margin: '8px 0 0 0',
  padding: '6px 8px',
  background: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f8fafc',
  borderRadius: '8px',
  boxShadow: '0 1px 4px #0001',
  minHeight: '32px',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '6px'
  }
}));

const PaginationInfo = styled(Typography)(({ theme }) => ({
  fontSize: '0.8rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark' ? '#4a6cf7' : '#2563eb',
  margin: 0,
  [theme.breakpoints.down('sm')]: {
    textAlign: 'center'
  }
}));

const PaginationControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  [theme.breakpoints.down('sm')]: {
    justifyContent: 'center'
  }
}));

// Enhanced Tab Components
const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-indicator': {
    height: '3px',
    borderRadius: '2px',
    background: 'linear-gradient(90deg, #4a6cf7 0%, #3b82f6 100%)',
  },
  '& .MuiTabs-flexContainer': {
    gap: '2px',
    padding: '0 4px',
  },
  '@media (min-width: 900px)': {
    '& .MuiTabs-flexContainer': {
      gap: '4px',
      padding: '0 8px',
    }
  }
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: '36px',
  padding: '4px 8px',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'none',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
  borderRadius: '6px',
  margin: '0 1px',
  transition: 'all 0.2s ease',
  '&.Mui-selected': {
    color: theme.palette.mode === 'dark' ? '#4a6cf7' : '#2563eb',
    background: theme.palette.mode === 'dark' ? 'rgba(74, 108, 247, 0.1)' : 'rgba(37, 99, 235, 0.08)',
    fontWeight: 700,
  },
  '&:hover': {
    background: theme.palette.mode === 'dark' ? 'rgba(74, 108, 247, 0.05)' : 'rgba(37, 99, 235, 0.04)',
    color: theme.palette.mode === 'dark' ? '#4a6cf7' : '#2563eb',
  },
  '& .MuiTab-iconWrapper': {
    marginBottom: '1px',
    fontSize: '0.9rem',
  },
  '@media (min-width: 900px)': {
    minHeight: '44px',
    padding: '8px 16px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    margin: '0 2px',
    '& .MuiTab-iconWrapper': {
      marginBottom: '2px',
      fontSize: '1.1rem',
    }
  }
}));

// Scrollable Student List Container
const ScrollableStudentList = styled(Box)(({ theme }) => ({
  maxHeight: '320px',
  overflowY: 'scroll', // force scrollbar visibility
  overflowX: 'hidden',
  paddingRight: '14px', // make room so cards don't sit under the scrollbar
  marginRight: 0,
  scrollbarGutter: 'stable both-edges', // reserve space for scrollbar (FF/modern)
  scrollbarWidth: 'thin', // Firefox
  scrollbarColor: `${theme.palette.mode === 'dark' ? '#4a6cf7 #1f2937' : '#3b82f6 #e5e7eb'}`, // Firefox thumb track
  msOverflowStyle: 'auto', // legacy Edge/IE
  '&::-webkit-scrollbar': {
    width: '10px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.mode === 'dark' ? 'rgba(31, 41, 55, 0.9)' : '#eef2f7',
    borderRadius: '6px',
    margin: '2px 0',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, #5a7cf8 0%, #4a6cf7 100%)'
      : 'linear-gradient(180deg, #4a6cf7 0%, #3b82f6 100%)',
    borderRadius: '6px',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: theme.palette.mode === 'dark'
      ? 'inset 0 0 0 1px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.25)'
      : 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.12)',
    transition: 'all 0.2s ease',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, #6b8cff 0%, #5a7cf8 100%)'
      : 'linear-gradient(180deg, #5a7cf8 0%, #4b92f7 100%)',
    boxShadow: theme.palette.mode === 'dark'
      ? 'inset 0 0 0 1px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.35)'
      : 'inset 0 0 0 1px rgba(255,255,255,0.7), 0 4px 10px rgba(0,0,0,0.18)',
  },
  '&::-webkit-scrollbar-thumb:active': {
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, #3a5ce6 0%, #2a82e6 100%)'
      : 'linear-gradient(180deg, #3a5ce6 0%, #2a82e6 100%)',
  },
  '&::-webkit-scrollbar-corner': {
    background: 'transparent',
  }
}));

// Footer with Generate Button
const StudentListFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: theme.palette.mode === 'dark' ? 'rgba(40, 48, 80, 0.1)' : 'rgba(255, 255, 255, 0.8)',
  borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '0 0 12px 12px',
  marginTop: '8px',
  gap: '12px',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: '6px',
    padding: '8px 10px',
  }
}));

const GenerateButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #4a6cf7, #3b82f6)',
  color: 'white',
  borderRadius: '8px',
  padding: '8px 24px',
  minWidth: '120px',
  fontWeight: 600,
  fontSize: '0.9rem',
  textTransform: 'none',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 4px 16px rgba(74, 108, 247, 0.2)'
    : '0 4px 16px rgba(74, 108, 247, 0.15)',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 6px 20px rgba(74, 108, 247, 0.25)'
      : '0 6px 20px rgba(74, 108, 247, 0.2)',
  },
  '&:disabled': {
    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    transform: 'none',
    boxShadow: 'none',
  },
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    minWidth: 0,
    padding: '10px 12px',
    fontSize: '0.88rem',
    borderRadius: '10px'
  }
}));

const ProgressDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '12px',
    padding: '24px',
    minWidth: '400px',
    background: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
    border: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
  },
}));

const ProgressContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  padding: '8px 0',
}));

const ProgressText = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#666',
  textAlign: 'center',
  minHeight: '20px',
}));

const ProgressBar = styled(LinearProgress)(({ theme }) => ({
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f0f0f0',
  '& .MuiLinearProgress-bar': {
    borderRadius: '4px',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
  },
}));

// Editable grid cell
const EditableCell = styled('input')(({ theme }) => ({
  width: 80,
  border: 'none',
  outline: 'none',
  borderRadius: 8,
  background: theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.10)' : 'rgba(74,108,247,0.07)',
  color: theme.palette.text.primary,
  fontWeight: 500,
  fontSize: '1rem',
  padding: '6px 10px',
  textAlign: 'center',
  boxShadow: '0 1px 4px 0 rgba(74,108,247,0.07)',
  transition: 'box-shadow 0.18s',
  '&:focus': {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`,
    background: theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.18)' : 'rgba(74,108,247,0.13)',
  },
  MozAppearance: 'textfield',
  '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
    WebkitAppearance: 'none',
    margin: 0
  }
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
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
  '&[type=number]': {
    MozAppearance: 'textfield',
  },
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  '&:focus': {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`,
    background: theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.18)' : 'rgba(74,108,247,0.13)',
  },
}));

// Helper function to sort class names using the universal sorting function
const sortClassesLocal = (classes: any[]) => {
  return sortClasses(classes);
};

const NumericInput = styled('input')(({ theme }) => ({
  width: 80,
  height: 32,
  fontSize: '1rem',
  padding: '6px 8px',
  borderRadius: 8,
  textAlign: 'center',
  background: theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.10)' : 'rgba(74,108,247,0.07)',
  border: `1.5px solid ${theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.2)' : 'rgba(74,108,247,0.15)'}`,
  color: theme.palette.text.primary,
  outline: 'none',
  transition: 'border 0.18s, box-shadow 0.18s',
  fontWeight: 600,
  // Hide spinner buttons for number input
  '&[type=number]': {
    MozAppearance: 'textfield',
  },
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  '&:focus': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const StyledDialog = styled(Dialog)(({ theme }) => ({
  zIndex: 1300,
  '& .MuiDialog-paper': {
      borderRadius: '16px',
      background: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : theme.palette.background.paper,
      maxWidth: '500px',
      width: '95%',
      overflow: 'hidden',
      boxShadow: theme.palette.mode === 'dark'
          ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
          : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
      border: theme.palette.mode === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.05)'
          : '1px solid rgba(0, 0, 0, 0.05)',
  },
  '& .MuiBackdrop-root': {
      backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(0, 0, 0, 0.5)'
          : 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
  }
}));

const DialogHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const EditDialogTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: theme.palette.primary.main,
}));

const StyledDialogContent = styled(Box)(({ theme }) => ({
  padding: '24px',
  '& .MuiTextField-root': {
      '& .MuiInputBase-root': {
          background: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(0, 0, 0, 0.03)',
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`,
          transition: 'background-color 0.2s ease',
          '&:hover, &.Mui-focused': {
              background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.05)',
          },
          '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
          }
      }
  }
}));

const FormActions = styled(DialogActions)(({ theme }) => ({
  padding: '16px 24px',
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// Add styled component for concession indicator
const ConcessionIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  fontSize: '0.75rem',
  color: theme.palette.primary.main,
  marginTop: theme.spacing(0.5),
}));

// Add helper function to format amount
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('₹', 'Rs. ');
};

// Add months array at the top level
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Skeleton Loading Components - Dashboard Style
const SkeletonContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  padding: 'clamp(8px, 2vw, 24px)',
  boxSizing: 'border-box',
  '@media (max-width: 900px)': {
    padding: 'clamp(6px, 2vw, 12px)',
  },
  '@media (max-width: 600px)': {
    padding: '8px 10px',
    paddingBottom: '2.5rem',
  }
}));

const SkeletonCard = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? '#2a2a2a' : '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10)',
  padding: '1.5rem 1.5rem 1.2rem 1.5rem',
  marginBottom: '1rem',
  width: '100%',
  border: `1.5px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    zIndex: 2,
  },
  '@keyframes shimmer': {
    '0%': { left: '-100%' },
    '100%': { left: '100%' }
  }
}));

const SkeletonTabs = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '8px',
  marginBottom: '1.5rem',
  '& > *': {
    flex: 1,
    height: '44px',
    borderRadius: '8px',
    background: theme.palette.mode === 'dark' ? '#353b4a' : '#e5e7eb',
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
      animation: 'shimmer 1.5s infinite',
    }
  }
}));

const SkeletonLine = styled(Box)(({ theme }) => ({
  height: '16px',
  background: theme.palette.mode === 'dark' ? '#353b4a' : '#e5e7eb',
  borderRadius: '8px',
  marginBottom: '8px',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
  }
}));

const SkeletonFormField = styled(Box)(({ theme }) => ({
  height: '56px',
  background: theme.palette.mode === 'dark' ? '#353b4a' : '#e5e7eb',
  borderRadius: '8px',
  marginBottom: '12px',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
  }
}));

const SkeletonPill = styled(Box)(({ theme }) => ({
  height: '32px',
  width: '100px',
  background: theme.palette.mode === 'dark' ? '#353b4a' : '#e5e7eb',
  borderRadius: '16px',
  margin: '4px',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
  }
}));

const SkeletonStudentCard = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? '#2a2a2a' : '#ffffff',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    zIndex: 2,
  }
}));

const SkeletonAvatar = styled(Box)(({ theme }) => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: theme.palette.mode === 'dark' ? '#353b4a' : '#e5e7eb',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
  }
}));

const SkeletonButton = styled(Box)(({ theme }) => ({
  height: '40px',
  width: '120px',
  background: theme.palette.mode === 'dark' ? '#353b4a' : '#e5e7eb',
  borderRadius: '8px',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
    animation: 'shimmer 1.5s infinite',
  }
}));

const SkeletonLoader = () => (
  <SkeletonContainer>
    <SkeletonCard>
      <SkeletonTabs>
        <Box />
        <Box />
        <Box />
        <Box />
      </SkeletonTabs>
      
      <Box sx={{ marginTop: '1.5rem' }}>
        <Box sx={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
          <SkeletonFormField sx={{ flex: 1 }} />
          <SkeletonFormField sx={{ flex: 1 }} />
          <SkeletonFormField sx={{ flex: 1 }} />
          <SkeletonFormField sx={{ flex: 1 }} />
        </Box>
        
        <Box sx={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
          <SkeletonLine sx={{ width: '120px' }} />
          <SkeletonLine sx={{ width: '120px' }} />
          <SkeletonLine sx={{ width: '120px' }} />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
          <SkeletonPill />
          <SkeletonPill />
          <SkeletonPill />
          <SkeletonPill />
          <SkeletonPill />
        </Box>
        
        <Box>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonStudentCard key={i}>
              <SkeletonAvatar />
              <Box sx={{ flex: 1 }}>
                <SkeletonLine sx={{ width: '60%', height: '16px', marginBottom: '4px' }} />
                <SkeletonLine sx={{ width: '40%', height: '12px' }} />
              </Box>
              <SkeletonButton sx={{ width: '80px', height: '32px' }} />
            </SkeletonStudentCard>
          ))}
        </Box>
      </Box>
    </SkeletonCard>
  </SkeletonContainer>
);

export default function LoadFeePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const schoolId = user?.school_id;
  const { showToast } = useToast();

  // State
  const [tab, setTab] = useState(0); // 0: Bulk, 1: Single, 2: Family, 3: Concessions
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [showFamilyConfirmDialog, setShowFamilyConfirmDialog] = useState(false);
  const [showSingleConfirmDialog, setShowSingleConfirmDialog] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [singleStudent, setSingleStudent] = useState<any>(null);
  const [singleSession, setSingleSession] = useState('');
  const [singleMonth, setSingleMonth] = useState('');
  const [singleYear, setSingleYear] = useState('');
  const [feeHeads, setFeeHeads] = useState<any[]>([]);
  const [selectedFeeHeads, setSelectedFeeHeads] = useState<number[]>([]);
  const [singleStudentSelectedFeeHeads, setSingleStudentSelectedFeeHeads] = useState<number[]>([]);
  const [amountGrid, setAmountGrid] = useState<{ [studentId: number]: { [feeHeadId: number]: string } }>({});
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [feeStructuresLoading, setFeeStructuresLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [familyAmountGrid, setFamilyAmountGrid] = useState<{ [studentId: number]: { [feeHeadId: number]: string } }>({});
  const [familyTabSelectedFeeHeads, setFamilyTabSelectedFeeHeads] = useState<number[]>([]);
  const [familySession, setFamilySession] = useState('');
  const [familyMonth, setFamilyMonth] = useState('');
  const [familyYear, setFamilyYear] = useState('');
  const [selectedFamilyStudents, setSelectedFamilyStudents] = useState<number[]>([]);
  const [existingInvoicesMap, setExistingInvoicesMap] = useState<Map<number, { name: string, invoiceId: number }>>(new Map());
  const [singleStudentInvoiceId, setSingleStudentInvoiceId] = useState<number | null>(null);
  const [existingFeeInvoiceItemsMap, setExistingFeeInvoiceItemsMap] = useState<Map<string, boolean>>(new Map());
  const [existingFeeInvoiceAmountsMap, setExistingFeeInvoiceAmountsMap] = useState<Map<string, number>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const [concessions, setConcessions] = useState<Map<number, any[]>>(new Map());
  const [concessionStudent, setConcessionStudent] = useState<any>(null);
  const [concessionAmounts, setConcessionAmounts] = useState<{ [feeHeadId: number]: string }>({});
  const [existingConcessions, setExistingConcessions] = useState<any[]>([]);
  const [loadingConcessions, setLoadingConcessions] = useState(false);
  const [concessionSelectedFeeHeads, setConcessionSelectedFeeHeads] = useState<number[]>([]);
  const [existingConcessionFilter, setExistingConcessionFilter] = useState<number | null>(null);
  const [concessionExpiresOn, setConcessionExpiresOn] = useState<{ [feeHeadId: number]: string }>({});

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConcession, setEditingConcession] = useState<any>(null);
  const [editedAmount, setEditedAmount] = useState('');
  const [editedExpiresOn, setEditedExpiresOn] = useState('');

  // State for Delete Confirmation Modals
  const [isDeleteAllConcessionsModalOpen, setIsDeleteAllConcessionsModalOpen] = useState(false);
  const [isDeleteSingleConcessionModalOpen, setIsDeleteSingleConcessionModalOpen] = useState(false);
  const [concessionToDelete, setConcessionToDelete] = useState<any>(null);

  // State for Fee Deletion Confirmation Modals
  const [isDeleteBulkFeesModalOpen, setIsDeleteBulkFeesModalOpen] = useState(false);
  const [isDeleteSingleFeesModalOpen, setIsDeleteSingleFeesModalOpen] = useState(false);
  const [isDeleteFamilyFeesModalOpen, setIsDeleteFamilyFeesModalOpen] = useState(false);

  // Add new state for tracking concession info
  const [concessionInfo, setConcessionInfo] = useState<{ [key: string]: { applied: boolean, amount: number } }>({});

  // Helper function to check if a class has sections
  const getClassHasSections = (classId: any) => {
    const classObj = classes.find(c => String(c.id) === String(classId));
    return classObj?.has_sections ?? true; // Default to true for backward compatibility
  };

  // Get current month
  const getCurrentMonth = () => {
    const now = new Date();
    return months[now.getMonth()];
  };

  // Get current year
  const getCurrentYear = () => {
    const now = new Date();
    return String(now.getFullYear());
  };

  // Load students data with caching
  const loadStudentsData = async () => {
    if (!schoolId || students.length > 0) return; // Don't reload if already loaded
    setStudentsLoading(true);
    try {
      const { data: stu, error } = await supabase
        .from('students')
        .select('id, name, class_id, section_id, father_name, picture_url')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setStudents(stu || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch classes, sections, sessions, fee heads, and students
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [cls, sec, ses, stu, fh] = await Promise.all([
        supabase.from('classes').select('id, name, has_sections').eq('school_id', schoolId),
        supabase.from('sections').select('id, name, class_id').eq('school_id', schoolId),
        supabase.from('sessions').select('id, name, is_active').eq('school_id', schoolId),
        supabase.from('students').select('id, name, class_id, section_id, father_name, picture_url').eq('school_id', schoolId).order('name', { ascending: true }),
        feeService.getFeeHeads(schoolId),
      ]);
      setClasses(sortClassesLocal(cls.data || []));
      setSections(sec.data || []);
      setSessions(ses.data || []);
      setStudents(stu.data || []);
      setFeeHeads(fh || []);

      // Set default session (active session or latest)
      if (ses.data && ses.data.length > 0) {
        const activeSession = ses.data.find((s: any) => s.is_active);
        const defaultSession = activeSession ? activeSession.id : Math.max(...ses.data.map((s: any) => s.id));
        setSelectedSession(defaultSession);
        setSingleSession(defaultSession);
      }

      // Set default month (current month)
      const currentMonth = getCurrentMonth();
      setSelectedMonth(currentMonth);
      setSingleMonth(currentMonth);

      // Set default year (current year)
      const currentYear = getCurrentYear();
      setSelectedYear(currentYear);
      setSingleYear(currentYear);
      
      // Mark initial data as loaded
      setInitialDataLoaded(true);
    })();
  }, [schoolId]);

  // Set page loading to false only after all critical data is loaded
  useEffect(() => {
    if (initialDataLoaded) {
      setPageLoading(false);
    }
  }, [initialDataLoaded]);

  useEffect(() => {
    const check = async () => {
        if (!schoolId || !selectedStudents.length || !selectedSession || !selectedMonth || !selectedYear) {
            setExistingInvoicesMap(new Map());
            setExistingFeeInvoiceItemsMap(new Map());
            setExistingFeeInvoiceAmountsMap(new Map());
            return;
        }

        try {
            const existingItemsMap = await feeService.checkExistingFeeInvoiceItems(
                schoolId,
                selectedStudents,
                parseInt(selectedSession),
                selectedMonth,
                parseInt(selectedYear)
            );
            // For backward compatibility, also set the boolean map
            const boolMap = new Map<string, boolean>();
            for (const [key, amount] of Array.from(existingItemsMap.entries())) {
              boolMap.set(key, true);
            }
            setExistingFeeInvoiceItemsMap(boolMap);
            setExistingFeeInvoiceAmountsMap(existingItemsMap);
        } catch (e) {
            setExistingInvoicesMap(new Map());
            setExistingFeeInvoiceItemsMap(new Map());
            setExistingFeeInvoiceAmountsMap(new Map());
        }
    };

    check();
  }, [schoolId, selectedStudents, selectedSession, selectedMonth, selectedYear, refreshKey]);

  useEffect(() => {
    const check = async () => {
        if (!schoolId || !singleStudent || !singleSession || !singleMonth || !singleYear) {
            setExistingFeeInvoiceItemsMap(new Map());
            setExistingFeeInvoiceAmountsMap(new Map());
            return;
        }

        try {
            const existingItemsMap = await feeService.checkExistingFeeInvoiceItems(
                schoolId,
                [singleStudent.id],
                parseInt(singleSession),
                singleMonth,
                parseInt(singleYear)
            );
            const boolMap = new Map<string, boolean>();
            for (const [key, amount] of Array.from(existingItemsMap.entries())) {
              boolMap.set(key, true);
            }
            setExistingFeeInvoiceItemsMap(boolMap);
            setExistingFeeInvoiceAmountsMap(existingItemsMap);
        } catch (e) {
            setExistingFeeInvoiceItemsMap(new Map());
            setExistingFeeInvoiceAmountsMap(new Map());
        }
    };
    check();
  }, [schoolId, singleStudent, singleSession, singleMonth, singleYear, refreshKey]);

  // Check for existing fee invoice items at fee head level (for family tab)
  useEffect(() => {
    const check = async () => {
        if (!schoolId || !selectedFamily || selectedFamilyStudents.length === 0 || !familySession || !familyMonth || !familyYear) {
            setExistingFeeInvoiceItemsMap(new Map());
            return;
        }

        try {
            const existingItemsMap = await feeService.checkExistingFeeInvoiceItems(
                schoolId,
                selectedFamilyStudents,
                parseInt(familySession),
                familyMonth,
                parseInt(familyYear)
            );
            const boolMap = new Map<string, boolean>();
            for (const [key, amount] of Array.from(existingItemsMap.entries())) {
              boolMap.set(key, true);
            }
            setExistingFeeInvoiceItemsMap(boolMap);
            setExistingFeeInvoiceAmountsMap(existingItemsMap);
        } catch (e) {
            setExistingFeeInvoiceItemsMap(new Map());
            setExistingFeeInvoiceAmountsMap(new Map());
        }
    };
    check();
  }, [schoolId, selectedFamily, selectedFamilyStudents, familySession, familyMonth, familyYear, refreshKey]);

  // Fetch concessions for visible students
  useEffect(() => {
    const fetchConcessions = async (studentIds: number[]) => {
      if (!schoolId || studentIds.length === 0) {
        setConcessions(new Map());
        return;
      }
      try {
        const concessionsMap = await feeService.getStudentConcessionsForStudents(schoolId, studentIds);
        setConcessions(concessionsMap);
      } catch (error) {
        setConcessions(new Map());
      }
    };

    if (tab === 0 && preview.length > 0) {
      fetchConcessions(preview.map(s => s.id));
    } else if (tab === 1 && singleStudent) {
      fetchConcessions([singleStudent.id]);
    } else if (tab === 2 && selectedFamily) {
      const studentIds = selectedFamily.family_members
        .map((member: any) => member.student?.id)
        .filter(Boolean);
      fetchConcessions(studentIds);
    } else {
      setConcessions(new Map());
    }
  }, [schoolId, tab, preview, singleStudent, selectedFamily]);

  // Fetch fee structures when session changes
  useEffect(() => {
    if (!schoolId || !selectedSession) return;
    (async () => {
      try {
        setFeeStructuresLoading(true);
        const structures = await feeService.getFeeStructures(schoolId, { sessionId: Number(selectedSession) });
        setFeeStructures(structures);
      } catch (error) {
      } finally {
        setFeeStructuresLoading(false);
      }
    })();
  }, [schoolId, selectedSession]);

  // Also load fee structures for all sessions initially to have fallback data
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const allStructures = await feeService.getFeeStructures(schoolId);
        // Set as fallback structures
        setFeeStructures(allStructures);
      } catch (error) {
      }
    })();
  }, [schoolId]);

  // Update useEffect for bulk view
  useEffect(() => {
    // When preview or selectedFeeHeads changes, initialize amountGrid
    if (!preview.length || !selectedFeeHeads.length) return;
    const newGrid: { [studentId: number]: { [feeHeadId: number]: string } } = {};
    const newConcessionInfo: { [key: string]: { applied: boolean, amount: number } } = {};
    
    preview.forEach(stu => {
      newGrid[stu.id] = {};
      selectedFeeHeads.forEach(fhId => {
        const key = `${stu.id}-${fhId}`;
        if (existingFeeInvoiceAmountsMap.has(key)) {
          // Use existing amount if available
          newGrid[stu.id][fhId] = String(existingFeeInvoiceAmountsMap.get(key));
        } else {
          // Calculate new amount with concessions
          const defaultAmount = parseFloat(getDefaultAmount(fhId, Number(stu.class_id)));
          const concessionAmount = getConcessionAmount(stu.id, fhId, selectedSession, selectedMonth, selectedYear);
          const finalAmount = Math.max(0, defaultAmount - concessionAmount);
          newGrid[stu.id][fhId] = String(finalAmount);
          newConcessionInfo[key] = { 
            applied: concessionAmount > 0,
            amount: concessionAmount
          };
        }
      });
    });
    
    setAmountGrid(newGrid);
    setConcessionInfo(newConcessionInfo);
  }, [preview, selectedFeeHeads, feeStructures, feeHeads, concessions, selectedSession, selectedMonth, selectedYear, existingFeeInvoiceAmountsMap]);

  // Update useEffect for single student view
  useEffect(() => {
    if (tab === 1 && singleStudent) {
      const studentId = singleStudent.id;
      const classId = Number(singleStudent.class_id);
      
      const newGridForStudent: { [feeHeadId: number]: string } = {};
      const newConcessionInfo: { [key: string]: { applied: boolean, amount: number } } = {};
      
      singleStudentSelectedFeeHeads.forEach(fhId => {
        const key = `${studentId}-${fhId}`;
        const defaultAmount = parseFloat(getDefaultAmount(fhId, classId));
        const concessionAmount = getConcessionAmount(studentId, fhId, singleSession, singleMonth, singleYear);
        
        if (existingFeeInvoiceAmountsMap.has(key)) {
          // Use existing amount if available
          newGridForStudent[fhId] = String(existingFeeInvoiceAmountsMap.get(key));
          // Keep the concession status even for existing fee heads
          newConcessionInfo[key] = {
            applied: concessionAmount > 0,
            amount: concessionAmount
          };
        } else {
          // Calculate new amount with concessions
          const finalAmount = Math.max(0, defaultAmount - concessionAmount);
          newGridForStudent[fhId] = String(finalAmount);
          newConcessionInfo[key] = {
            applied: concessionAmount > 0,
            amount: concessionAmount
          };
        }
      });

      // Batch state updates together
      setAmountGrid(prev => ({
        ...prev,
        [studentId]: newGridForStudent,
      }));
      setConcessionInfo(prev => ({
        ...prev,
        ...newConcessionInfo
      }));
    }
  }, [singleStudentSelectedFeeHeads, singleStudent, tab, concessions, singleSession, singleMonth, singleYear, existingFeeInvoiceAmountsMap]);

  // Update family view useEffect
  useEffect(() => {
    if (!selectedFamily) return;

    const newGrid: { [studentId: number]: { [feeHeadId: number]: string } } = {};
    const newConcessionInfo: { [key: string]: { applied: boolean, amount: number } } = {};
    
    selectedFamily.family_members?.forEach((member: any) => {
      const stu = member.student;
      if (!stu) return;
      newGrid[stu.id] = {};
      familyTabSelectedFeeHeads.forEach(fhId => {
        const fh = feeHeads.find(h => h.id === fhId);
        if (fh) {
          const key = `${stu.id}-${fhId}`;
          const defaultAmount = parseFloat(getDefaultAmount(fhId, Number(stu.class_id)));
          const concessionAmount = getConcessionAmount(stu.id, fhId, familySession, familyMonth, familyYear);
          
          if (existingFeeInvoiceAmountsMap.has(key)) {
            // Use existing amount if available
            newGrid[stu.id][fhId] = String(existingFeeInvoiceAmountsMap.get(key));
            newConcessionInfo[key] = { applied: false, amount: 0 };
          } else {
            // Calculate new amount with concessions
            const finalAmount = Math.max(0, defaultAmount - concessionAmount);
            newGrid[stu.id][fhId] = String(finalAmount);
            newConcessionInfo[key] = {
              applied: concessionAmount > 0,
              amount: concessionAmount
            };
          }
        }
      });
    });
    
    // Batch state updates together
    setFamilyAmountGrid(newGrid);
    setConcessionInfo(prev => ({
      ...prev,
      ...newConcessionInfo
    }));
  }, [selectedFamily, familyTabSelectedFeeHeads, feeStructures, feeHeads, concessions, familySession, familyMonth, familyYear, existingFeeInvoiceAmountsMap]);

  // Get default amount for a fee head and class
  const getDefaultAmount = (feeHeadId: number, classId: number): string => {
    // Find fee structure for this class and fee head
    const structure = feeStructures.find(s => 
      s.feeHeadId === feeHeadId && s.classId === classId
    );
    
    if (structure) {
      return String(structure.amount);
    }
    
    // Fallback to fee head default amount
    const feeHead = feeHeads.find(fh => fh.id === feeHeadId);
    
    if (feeHead) {
      // If fee head has a default amount, use it; otherwise show 0 but don't hide the fee head
      const defaultAmount = feeHead.defaultAmount || 0;
      return String(defaultAmount);
    }
    return '0';
  };

  // Update isConcessionEffective to only check for expiry
  const isConcessionEffective = (concession: any, session: string, month: string, year: string): boolean => {
    if (!session || !month || !year) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    const expiresOn = concession.expires_on ? new Date(concession.expires_on) : null;
    if (expiresOn) {
      // Adjust for timezone issues by only comparing date parts
      const localExpiresOn = new Date(expiresOn.valueOf() + expiresOn.getTimezoneOffset() * 60 * 1000);
      localExpiresOn.setHours(0, 0, 0, 0);

      // Check if concession has expired
      if (today > localExpiresOn) {
        return false;
      }
    }
    return true;
  };

  // Update getConcessionAmount to check if concession is effective (not expired)
  const getConcessionAmount = (studentId: number, feeHeadId: number, session?: string, month?: string, year?: string): number => {
    if (!concessions.has(studentId)) {
      return 0;
    }
    
    const studentConcessions = concessions.get(studentId) || [];
    const feeHeadConcessions = studentConcessions.filter(c => c.feeHeadId === feeHeadId);
    
    if (feeHeadConcessions.length === 0) {
      return 0;
    }
    
    // If session, month, year are provided, check if concession is effective for this period
    if (session && month && year) {
      const effectiveConcessions = feeHeadConcessions.filter(concession => 
        isConcessionEffective(concession, session, month, year)
      );
      
      if (effectiveConcessions.length === 0) {
        return 0;
      }
      
      // If multiple effective concessions exist, use the one with the latest effective date
      const mostRecentEffective = effectiveConcessions.reduce((latest, current) => {
        if (!current.effectiveFrom) return latest; // Prefer concessions with effective dates
        if (!latest.effectiveFrom) return current;
        
        const currentDate = new Date(current.effectiveFrom);
        const latestDate = new Date(latest.effectiveFrom);
        return currentDate > latestDate ? current : latest;
      });
      
      return mostRecentEffective.concessionAmount;
    }
    
    // If no date context, return the first concession amount (for backward compatibility)
    return feeHeadConcessions[0].concessionAmount;
  };

  const calculateFinalAmount = (studentId: number, feeHeadId: number, classId: number, session?: string, month?: string, year?: string): string => {
    // First check if there's an existing record
    const key = `${studentId}-${feeHeadId}`;
    if (existingFeeInvoiceAmountsMap.has(key)) {
      return String(existingFeeInvoiceAmountsMap.get(key));
    }

    // If no existing record, calculate the amount with concessions
    const defaultAmount = parseFloat(getDefaultAmount(feeHeadId, classId));
    const concessionAmount = getConcessionAmount(studentId, feeHeadId, session, month, year);
    const finalAmount = Math.max(0, defaultAmount - concessionAmount);

    return String(finalAmount);
  };

  // Get available fee heads based on current selection
  const getAvailableFeeHeads = (classId?: number, sectionId?: number) => {
    if (tab === 3) {
      // In concessions tab, only require classId
      if (!classId) return [];
      // Show all fee heads for concessions, regardless of amount
      return feeHeads;
    } else {
      // In other tabs, show fee heads as soon as class is selected
      // Don't require section to be selected for fee heads to appear
      if (!classId) return [];
      // Show all fee heads when class is selected, even if they don't have fee structures yet
      // This allows users to see and select fee heads before setting up fee structures
      return feeHeads;
    }
  };

  // Reset amounts to default values (with concessions applied)
  const resetToDefaults = () => {
    const newGrid: { [studentId: number]: { [feeHeadId: number]: string } } = {};
    const newConcessionInfo: { [key: string]: { applied: boolean, amount: number } } = {};
    
    preview.forEach(stu => {
      newGrid[stu.id] = {};
        selectedFeeHeads.forEach(fhId => {
        const key = `${stu.id}-${fhId}`;
        if (existingFeeInvoiceAmountsMap.has(key)) {
          // Use existing amount if available
          newGrid[stu.id][fhId] = String(existingFeeInvoiceAmountsMap.get(key));
          newConcessionInfo[key] = { applied: false, amount: 0 };
        } else {
          // Calculate new amount with concessions
          const defaultAmount = parseFloat(getDefaultAmount(fhId, Number(stu.class_id)));
          const concessionAmount = getConcessionAmount(stu.id, fhId, selectedSession, selectedMonth, selectedYear);
          const finalAmount = Math.max(0, defaultAmount - concessionAmount);
          newGrid[stu.id][fhId] = String(finalAmount);
          setConcessionInfo(prev => ({
            ...prev,
            [key]: {
              applied: concessionAmount > 0,
              amount: concessionAmount
            }
          }));
      }
    });
    });
    
    setAmountGrid(newGrid);
  };

  // Handle student selection
  const handleStudentSelection = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
      // Clear amounts for deselected student
      setAmountGrid(prev => {
        const newGrid = { ...prev };
        delete newGrid[studentId];
        return newGrid;
      });
    }
  };

  // Select all students
  const selectAllStudents = () => {
    setSelectedStudents(preview.map(stu => stu.id));
  };

  // Deselect all students
  const deselectAllStudents = () => {
    setSelectedStudents([]);
    // Clear all amounts when deselecting all students
    setAmountGrid({});
  };

  // Handle family student selection
  const handleFamilyStudentSelection = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedFamilyStudents(prev => [...prev, studentId]);
    } else {
      setSelectedFamilyStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  // Select all family students
  const selectAllFamilyStudents = () => {
    if (!selectedFamily?.family_members) return;
    const studentIds = selectedFamily.family_members
      .map((member: any) => member.student?.id)
      .filter((id: number) => id);
    setSelectedFamilyStudents(studentIds);
  };

  // Deselect all family students
  const deselectAllFamilyStudents = () => {
    setSelectedFamilyStudents([]);
  };

  // --- Bulk Preview ---
  const handlePreview = async () => {
    setLoading(true);
    try {
      if (!selectedClass || !selectedSession) {
        setPreview([]);
        setSelectedStudents([]);
        setLoading(false);
        return;
      }

      // Fetch students from student_class_history for the active session
      const { data: schData, error: schError } = await supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', selectedSession)
        .eq('new_class_id', selectedClass)
        .eq('school_id', schoolId);

      if (schError) {
        console.error('Error fetching student_class_history:', schError);
        throw schError;
      }

      if (!schData || schData.length === 0) {
        setPreview([]);
        setSelectedStudents([]);
        setLoading(false);
        return;
      }

      // Get student IDs from student_class_history
      const studentIds = schData.map(sch => sch.student_id);

      // Apply section filter if selected and class has sections
      let filteredStudentIds = studentIds;
      if (selectedSection && getClassHasSections(selectedClass)) {
        const { data: sectionData, error: sectionError } = await supabase
          .from('student_class_history')
          .select('student_id')
          .eq('session_id', selectedSession)
          .eq('new_class_id', selectedClass)
          .eq('new_section_id', selectedSection)
          .eq('school_id', schoolId);

        if (sectionError) {
          console.error('Error fetching section data:', sectionError);
          throw sectionError;
        }

        filteredStudentIds = sectionData?.map(sch => sch.student_id) || [];
      }

      // Fetch full student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, class_id, section_id, father_name, picture_url')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .in('id', filteredStudentIds)
        .order('name', { ascending: true });

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      const filtered = studentsData || [];
      setPreview(filtered);
      // Select all students by default
      setSelectedStudents(filtered.map(stu => stu.id));
    } catch (error) {
      console.error('Error in handlePreview:', error);
      showToast('Failed to load students for the selected session', 'error');
      setPreview([]);
      setSelectedStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-preview when class, section, session, or fee heads change
  useEffect(() => {
    if (!selectedClass || selectedFeeHeads.length === 0 || !selectedSession) {
      setPreview([]);
      setSelectedStudents([]);
      return;
    }
    
    setLoading(true);
    
    // Fetch students from student_class_history for the active session
    const fetchStudentsForSession = async () => {
      try {
        const { data: schData, error: schError } = await supabase
          .from('student_class_history')
          .select('student_id')
          .eq('session_id', selectedSession)
          .eq('new_class_id', selectedClass)
          .eq('school_id', schoolId);

        if (schError) {
          console.error('Error fetching student_class_history:', schError);
          throw schError;
        }

        if (!schData || schData.length === 0) {
          setPreview([]);
          setSelectedStudents([]);
          setLoading(false);
          return;
        }

        // Get student IDs from student_class_history
        const studentIds = schData.map(sch => sch.student_id);

        // Apply section filter if selected and class has sections
        let filteredStudentIds = studentIds;
        if (selectedSection && getClassHasSections(selectedClass)) {
          const { data: sectionData, error: sectionError } = await supabase
            .from('student_class_history')
            .select('student_id')
            .eq('session_id', selectedSession)
            .eq('class_id', selectedClass)
            .eq('section_id', selectedSection)
            .eq('school_id', schoolId);

          if (sectionError) {
            console.error('Error fetching section data:', sectionError);
            throw sectionError;
          }

          filteredStudentIds = sectionData?.map(sch => sch.student_id) || [];
        }

        // Fetch full student details
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name, class_id, section_id, father_name, picture_url')
          .eq('school_id', schoolId)
          .eq('status', 'active')
          .in('id', filteredStudentIds)
          .order('name', { ascending: true });

        if (studentsError) {
          console.error('Error fetching students:', studentsError);
          throw studentsError;
        }

        const filtered = studentsData || [];
        setPreview(filtered);
        // Select all students by default
        setSelectedStudents(filtered.map(stu => stu.id));
      } catch (error) {
        console.error('Error in auto-preview:', error);
        showToast('Failed to load students for the selected session', 'error');
        setPreview([]);
        setSelectedStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsForSession();
  }, [selectedClass, selectedSection, selectedSession, selectedFeeHeads, schoolId]);

  // --- Bulk Generate / Update ---
  const handleBulkUpsert = async () => {
    if (!schoolId) {
      showToast('School ID not found. Please log in again.', 'error');
      return;
    }
    
    setShowBulkConfirmDialog(true);
  };

  const confirmBulkUpsert = async () => {
    setShowBulkConfirmDialog(false);
    setLoading(true);
    try {
      if (!schoolId) {
        showToast('School ID not found. Please log in again.', 'error');
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
        return;
      }

      const studentsToProcess = preview.filter(stu => selectedStudents.includes(stu.id));
      
      const feeData: { [studentId: number]: { [feeHeadId: number]: number } } = {};
      studentsToProcess.forEach(student => {
        feeData[student.id] = {};
        selectedFeeHeads.forEach(feeHeadId => {
          const amount = parseFloat(amountGrid[student.id]?.[feeHeadId] || '0');
          if (amount > 0) {
            feeData[student.id][feeHeadId] = amount;
          }
        });
      });

      const sessionId = parseInt(selectedSession);
      const year = parseInt(selectedYear);
      
      if (isNaN(sessionId) || isNaN(year)) {
        showToast('Please select valid session and year.', 'error');
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
        return;
      }

      const { createdCount, updatedCount } = await feeService.upsertFeeInvoicesBulk(
        schoolId, 
        studentsToProcess, 
        sessionId, 
        selectedMonth, 
        year,
        feeData,
        (progress, status) => {
          // Update loading state with progress
          setLoadingProgress(progress);
          setLoadingStatus(status);
        }
      );
      
      let message = '';
      if (createdCount > 0 && updatedCount > 0) {
        message = `Generated ${createdCount} and updated ${updatedCount} invoices!`;
      } else if (createdCount > 0) {
        message = `Generated ${createdCount} new invoices!`;
      } else if (updatedCount > 0) {
        message = `Updated ${updatedCount} existing invoices!`;
      } else {
        message = 'No invoices were generated or updated.';
      }
      
      showToast(message, 'success');
      setRefreshKey(k => k + 1);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to process fees.';
      showToast(errorMessage, 'error');
    }
    setLoading(false);
    setLoadingProgress(0);
    setLoadingStatus('');
  };

  // --- Single Generate / Update ---
  const handleSingleUpsert = async () => {
    if (!schoolId || !singleStudent) {
      showToast('Student not selected.', 'error');
      return;
    }
    
    setShowSingleConfirmDialog(true);
  };

  const confirmSingleUpsert = async () => {
    setShowSingleConfirmDialog(false);
    setLoading(true);
    try {
      if (!schoolId || !singleStudent) {
        showToast('School ID or student not found. Please try again.', 'error');
        setLoading(false);
        return;
      }

      const feeData: { [feeHeadId: number]: number } = {};
      singleStudentSelectedFeeHeads.forEach(feeHeadId => {
        const amount = parseFloat(amountGrid[singleStudent.id]?.[feeHeadId] || '0');
        if (amount > 0) {
          feeData[feeHeadId] = amount;
        }
      });

      const sessionId = parseInt(singleSession);
      const year = parseInt(singleYear);
      
      if (isNaN(sessionId) || isNaN(year)) {
        showToast('Please select valid session and year.', 'error');
        setLoading(false);
        return;
      }

      // Check for existing invoice first
      const existingInvoices = await feeService.checkExistingInvoices(
        schoolId, 
        [singleStudent.id!], 
        sessionId, 
        singleMonth, 
        year
      );

      const existingInvoice = existingInvoices.find(inv => inv.studentId === singleStudent.id!);

      if (existingInvoice?.invoiceId) {
        // Update existing invoice
        await feeService.updateFeeInvoice(existingInvoice.invoiceId, schoolId, feeData);
        showToast('Fee invoice updated successfully!', 'success');
      } else {
        // Create new invoice
      await feeService.generateFeeInvoiceSingle(
        schoolId,
        singleStudent,
          sessionId,
        singleMonth,
          year,
        feeData
      );
        showToast('Fee invoice generated successfully!', 'success');
      }
      
      setRefreshKey(k => k + 1);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to process fee invoice.';
      showToast(errorMessage, 'error');
    }
    setLoading(false);
  };

  // Students are now loaded with initial data, but keep loadStudentsData for Autocomplete triggers

  // --- Family Generate ---
  const handleFamilyGenerate = async () => {
    if (!schoolId) {
      showToast('School ID not found. Please log in again.', 'error');
      return;
    }
    
    setShowFamilyConfirmDialog(true);
  };

  const confirmFamilyGenerate = async () => {
    setShowFamilyConfirmDialog(false);
    setLoading(true);
    try {
      if (!schoolId) {
        showToast('School ID not found. Please log in again.', 'error');
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
        return;
      }

      // Get selected students with their fee data
      const studentsToProcess = selectedFamily.family_members
        .filter((member: any) => member.student && selectedFamilyStudents.includes(member.student.id))
        .map((member: any) => ({
          student: member.student,
          feeData: familyAmountGrid[member.student.id] || {}
        }));

      const sessionId = parseInt(familySession);
      const year = parseInt(familyYear);
      
      if (isNaN(sessionId) || isNaN(year)) {
        showToast('Please select valid session and year.', 'error');
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
        return;
      }

      // Call the optimized fee service with progress tracking
      const generatedInvoices = await feeService.generateFeeInvoicesForFamily(
        schoolId, 
        studentsToProcess, 
        sessionId, 
        familyMonth, 
        year,
        (progress, status) => {
          // Update loading state with progress
          setLoadingProgress(progress);
          setLoadingStatus(status);
        }
      );
      
      const generatedCount = generatedInvoices.length;
      const skippedCount = studentsToProcess.length - generatedCount;
      
      let message = `Fee generated for ${generatedCount} students in family!`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} students skipped - invoices already exist)`;
      }
      
      showToast(message, 'success');
      setRefreshKey(k => k + 1);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to generate fee for family.';
      showToast(errorMessage, 'error');
    }
    setLoading(false);
    setLoadingProgress(0);
    setLoadingStatus('');
  };

  // --- Render ---
  useEffect(() => {
    // When preview or selectedFeeHeads changes, initialize amountGrid
    if (!preview.length || !selectedFeeHeads.length) return;
    const newGrid: { [studentId: number]: { [feeHeadId: number]: string } } = {};
    preview.forEach(stu => {
      newGrid[stu.id] = {};
      selectedFeeHeads.forEach(fhId => {
        // Use default amount from fee structure or fee head and apply concession
        const finalAmount = calculateFinalAmount(stu.id, fhId, Number(stu.class_id), selectedSession, selectedMonth, selectedYear);
        newGrid[stu.id][fhId] = amountGrid[stu.id]?.[fhId] ?? finalAmount;
      });
    });
    setAmountGrid(newGrid);
    // eslint-disable-next-line
  }, [preview, selectedFeeHeads, feeStructures, feeHeads, concessions, selectedSession, selectedMonth, selectedYear]);

  // Update amount grid when student selection changes
  useEffect(() => {
    if (!selectedStudents.length || !selectedFeeHeads.length) return;
    const newGrid: { [studentId: number]: { [feeHeadId: number]: string } } = {};
    selectedStudents.forEach(studentId => {
      const student = preview.find(stu => stu.id === studentId);
      if (student) {
        newGrid[studentId] = {};
        selectedFeeHeads.forEach(fhId => {
          const finalAmount = calculateFinalAmount(studentId, fhId, Number(student.class_id), selectedSession, selectedMonth, selectedYear);
          newGrid[studentId][fhId] = amountGrid[studentId]?.[fhId] ?? finalAmount;
        });
      }
    });
    setAmountGrid(newGrid);
    // eslint-disable-next-line
  }, [selectedStudents, selectedFeeHeads, feeStructures, feeHeads, concessions, selectedSession, selectedMonth, selectedYear]);

  // Update amount grid for single student view
  useEffect(() => {
    if (tab === 1 && singleStudent) {
      const studentId = singleStudent.id;
      const classId = Number(singleStudent.class_id);
      
      const newGridForStudent: { [feeHeadId: number]: string } = {};
      singleStudentSelectedFeeHeads.forEach(fhId => {
        const key = `${studentId}-${fhId}`;
        if (existingFeeInvoiceAmountsMap.has(key)) {
          newGridForStudent[fhId] = String(existingFeeInvoiceAmountsMap.get(key));
        } else {
          newGridForStudent[fhId] = calculateFinalAmount(studentId, fhId, classId, singleSession, singleMonth, singleYear);
        }
      });

      setAmountGrid(prev => ({
        ...prev,
        [studentId]: newGridForStudent,
      }));
    }
  }, [singleStudentSelectedFeeHeads, singleStudent, tab, concessions, singleSession, singleMonth, singleYear, existingFeeInvoiceAmountsMap]);

  // Add a separate useEffect to refresh single student amount grid when concessions are loaded
  useEffect(() => {
    if (tab === 1 && singleStudent && singleStudentSelectedFeeHeads.length > 0) {
      const studentId = singleStudent.id;
      const classId = Number(singleStudent.class_id);
      // Only refresh if we have concessions data or if concessions map is empty (meaning no concessions exist)
      const hasConcessionsData = concessions.size > 0 || concessions.has(studentId);
      if (hasConcessionsData) {
        const newGridForStudent: { [feeHeadId: number]: string } = {};
        singleStudentSelectedFeeHeads.forEach(fhId => {
          const key = `${studentId}-${fhId}`;
          if (existingFeeInvoiceAmountsMap.has(key)) {
            newGridForStudent[fhId] = String(existingFeeInvoiceAmountsMap.get(key));
          } else {
            newGridForStudent[fhId] = calculateFinalAmount(studentId, fhId, classId, singleSession, singleMonth, singleYear);
          }
        });
        setAmountGrid(prev => ({
          ...prev,
          [studentId]: newGridForStudent,
        }));
      }
    }
  }, [concessions, singleStudent, singleStudentSelectedFeeHeads, singleSession, singleMonth, singleYear, existingFeeInvoiceAmountsMap]);

  // Add this effect after singleStudent is set
  useEffect(() => {
    if (tab === 1 && singleStudent) {
      setSingleStudentSelectedFeeHeads([]);
      setAmountGrid(prev => ({ ...prev, [singleStudent.id]: {} }));
    }
  }, [singleStudent, tab]);

  // Reset section selection when class changes or when class doesn't have sections
  useEffect(() => {
    if (tab === 0 && selectedClass) {
      const hasSections = getClassHasSections(selectedClass);
      if (!hasSections) {
        setSelectedSection('');
      }
    }
  }, [selectedClass, tab, classes]);

  // Add this effect after singleStudent is set from Autocomplete
  useEffect(() => {
    if (tab === 1 && singleStudent && singleStudent.id) {
      (async () => {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:classes(name), section:sections(name)')
          .eq('id', singleStudent.id)
          .single();
        if (!error && data) {
          setSingleStudent(data);
        }
      })();
    }
  }, [tab, singleStudent?.id]);

  // Fetch families on mount (or when schoolId changes)
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data: familiesData } = await supabase
        .from('families')
        .select(`
          *,
          family_members (
            id,
            student:students (
              id,
              name,
              class_id,
              section_id
            )
          )
        `)
        .eq('school_id', schoolId);
      setFamilies(familiesData || []);
    })();
  }, [schoolId]);

  // Initialize family filters with defaults
  useEffect(() => {
    if (sessions.length > 0) {
      const activeSession = sessions.find((s: any) => s.is_active);
      const defaultSession = activeSession ? activeSession.id : Math.max(...sessions.map((s: any) => s.id));
      setFamilySession(defaultSession);
    }
    setFamilyMonth(getCurrentMonth());
    setFamilyYear(getCurrentYear());
  }, [sessions]);

  // Create helper to get available fee heads for all students in a family
  const getAvailableFeeHeadsForFamily = (family: any) => {
    if (!family || !family.family_members) return [];
    const allHeads = new Map<number, any>();
    family.family_members.forEach((member: any) => {
      const stu = member.student;
      if (!stu) return;
      const studentHeads = getAvailableFeeHeads(Number(stu.class_id), Number(stu.section_id));
      studentHeads.forEach((fh: any) => {
        // Include all fee heads, regardless of amount
          if (!allHeads.has(fh.id)) {
            allHeads.set(fh.id, fh);
        }
      });
    });
    return Array.from(allHeads.values());
  };

  const handleConcessionFeeHeadSelection = (feeHeadId: number, checked: boolean) => {
    setConcessionSelectedFeeHeads(prev => 
      checked ? [...prev, feeHeadId] : prev.filter(id => id !== feeHeadId)
    );
  };

  const handleSelectAllConcessionFeeHeads = (selectAll: boolean) => {
    if (selectAll) {
      const allFeeHeadIds = getAvailableFeeHeads(concessionStudent.class_id, concessionStudent.section_id).map(fh => fh.id);
      setConcessionSelectedFeeHeads(allFeeHeadIds);
    } else {
      setConcessionSelectedFeeHeads([]);
    }
  };

  const handleSaveConcessions = async () => {
    if (!schoolId || !concessionStudent) {
      showToast('Please select a student first.', 'error');
      return;
    }

    if (concessionSelectedFeeHeads.length === 0) {
      showToast('Please select at least one fee head to save.', 'error');
      return;
    }

    setLoading(true);
    try {
      const concessionsToSave = concessionSelectedFeeHeads
        .map(feeHeadId => ({
          feeHeadId: feeHeadId,
          concessionAmount: parseFloat(concessionAmounts[feeHeadId] || '0'),
          expires_on: concessionExpiresOn[feeHeadId] || null
        }))
        .filter(c => c.concessionAmount > 0);

      if (concessionsToSave.length === 0) {
        showToast('Please enter a concession amount for the selected fee heads.', 'error');
        setLoading(false);
        return;
      }
        
      await feeService.upsertStudentConcessions(schoolId, concessionStudent.id, concessionsToSave);
      showToast('Concessions saved successfully!', 'success');
      
      // Clear the input fields after saving
      setConcessionAmounts({});
      setConcessionExpiresOn({});
      setConcessionSelectedFeeHeads([]);
      
      // Refresh the list of existing concessions
      setRefreshKey(k => k + 1);
    } catch (e) {
      showToast('Failed to save concessions.', 'error');
    }
    setLoading(false);
  };

  const handleDeleteConcessions = async () => {
    if (!schoolId || !concessionStudent) {
      showToast('Please select a student first.', 'error');
      return;
    }

    // Show confirmation modal instead of directly deleting
    setIsDeleteAllConcessionsModalOpen(true);
  };

  // Actual delete function for all concessions (called after confirmation)
  const handleConfirmDeleteAllConcessions = async () => {
    if (!schoolId || !concessionStudent) {
      showToast('Please select a student first.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Delete all concessions for the student
      await feeService.deleteAllStudentConcessions(schoolId, concessionStudent.id);
      showToast('Concessions deleted successfully!', 'success');
      setExistingConcessions([]);
      setConcessionAmounts({});
      setConcessionExpiresOn({});
      setRefreshKey(k => k + 1);
    } catch (e) {
      showToast('Failed to delete concessions.', 'error');
    }
    setLoading(false);
    setIsDeleteAllConcessionsModalOpen(false);
  };

  // Delete handlers for different tabs
  const handleBulkDelete = async () => {
    if (!schoolId || selectedStudents.length === 0 || selectedFeeHeads.length === 0 || !selectedSession || !selectedMonth || !selectedYear) {
      showToast('Please select students, fee heads and fill all required fields.', 'error');
      return;
    }

    // Show confirmation modal instead of directly deleting
    setIsDeleteBulkFeesModalOpen(true);
  };

  // Actual delete function for bulk fees (called after confirmation)
  const handleConfirmBulkDelete = async () => {
    if (!schoolId || selectedStudents.length === 0 || selectedFeeHeads.length === 0 || !selectedSession || !selectedMonth || !selectedYear) {
      showToast('Please select students, fee heads and fill all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const deletedCount = await feeService.deleteFeeHeadsForStudents(
        schoolId,
        selectedStudents,
        selectedFeeHeads,
        parseInt(selectedSession),
        selectedMonth,
        parseInt(selectedYear)
      );
      
      if (deletedCount > 0) {
        showToast(`Successfully deleted ${deletedCount} fee head(s) for selected students.`, 'success');
        setRefreshKey(k => k + 1);
      } else {
        showToast('No fee heads found to delete for the selected criteria.');
      }
    } catch (e) {
      showToast('Failed to delete fee heads.', 'error');
    }
    setLoading(false);
    setIsDeleteBulkFeesModalOpen(false);
  };

  const handleSingleDelete = async () => {
    if (!schoolId || !singleStudent || singleStudentSelectedFeeHeads.length === 0 || !singleSession || !singleMonth || !singleYear) {
      showToast('Please select a student, fee heads and fill all required fields.', 'error');
      return;
    }

    // Show confirmation modal instead of directly deleting
    setIsDeleteSingleFeesModalOpen(true);
  };

  // Actual delete function for single student fees (called after confirmation)
  const handleConfirmSingleDelete = async () => {
    if (!schoolId || !singleStudent || singleStudentSelectedFeeHeads.length === 0 || !singleSession || !singleMonth || !singleYear) {
      showToast('Please select a student, fee heads and fill all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const deletedCount = await feeService.deleteFeeHeadsForSingleStudent(
        schoolId,
        singleStudent.id,
        singleStudentSelectedFeeHeads,
        parseInt(singleSession),
        singleMonth,
        parseInt(singleYear)
      );
      
      if (deletedCount > 0) {
        showToast(`Successfully deleted ${deletedCount} fee head(s) for the student.`, 'success');
        setRefreshKey(k => k + 1);
      } else {
        showToast('No fee heads found to delete for the selected criteria.');
      }
    } catch (e) {
      showToast('Failed to delete fee heads.', 'error');
    }
    setLoading(false);
    setIsDeleteSingleFeesModalOpen(false);
  };

  const handleFamilyDelete = async () => {
    if (!schoolId || !selectedFamily || selectedFamilyStudents.length === 0 || familyTabSelectedFeeHeads.length === 0 || !familySession || !familyMonth || !familyYear) {
      showToast('Please select a family, students, fee heads and fill all required fields.', 'error');
      return;
    }

    // Show confirmation modal instead of directly deleting
    setIsDeleteFamilyFeesModalOpen(true);
  };

  // Actual delete function for family fees (called after confirmation)
  const handleConfirmFamilyDelete = async () => {
    if (!schoolId || !selectedFamily || selectedFamilyStudents.length === 0 || familyTabSelectedFeeHeads.length === 0 || !familySession || !familyMonth || !familyYear) {
      showToast('Please select a family, students, fee heads and fill all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const deletedCount = await feeService.deleteFeeHeadsForStudents(
        schoolId,
        selectedFamilyStudents,
        familyTabSelectedFeeHeads,
        parseInt(familySession),
        familyMonth,
        parseInt(familyYear)
      );
      
      if (deletedCount > 0) {
        showToast(`Successfully deleted ${deletedCount} fee head(s) for selected family students.`, 'success');
        setRefreshKey(k => k + 1);
      } else {
        showToast('No fee heads found to delete for the selected criteria.');
      }
    } catch (e) {
      showToast('Failed to delete fee heads.', 'error');
    }
    setLoading(false);
    setIsDeleteFamilyFeesModalOpen(false);
  };

  // Helper function to check if a specific fee head exists for a student
  const hasExistingFeeHead = (studentId: number, feeHeadId: number): boolean => {
    const key = `${studentId}-${feeHeadId}`;
    return existingFeeInvoiceItemsMap.has(key);
  };

  // Load existing concessions when student is selected in concessions tab
  useEffect(() => {
    const loadExistingConcessions = async () => {
      if (!schoolId || !concessionStudent) {
        setExistingConcessions([]);
        setConcessionAmounts({});
        setConcessionExpiresOn({});
        setExistingConcessionFilter(null);
        return;
      }
      setLoadingConcessions(true);
      try {
        const concessionsMap = await feeService.getStudentConcessionsForStudents(schoolId, [concessionStudent.id]);
        const studentConcessions = concessionsMap.get(concessionStudent.id) || [];
        setExistingConcessions(studentConcessions);
        
        const todayStr = new Date().toISOString().split('T')[0];
        const initialAmounts: { [feeHeadId: number]: string } = {};
        const initialExpires: { [feeHeadId: number]: string } = {};

        // Set default expiry for all available fee heads
        const availableFeeHeads = getAvailableFeeHeads(concessionStudent.class_id, concessionStudent.section_id);
        availableFeeHeads.forEach(fh => {
            initialExpires[fh.id] = todayStr;
        });

        // Then, overwrite with existing values
        studentConcessions.forEach(concession => {
          initialAmounts[concession.feeHeadId] = String(concession.concessionAmount);
          if (concession.expires_on) {
            initialExpires[concession.feeHeadId] = concession.expires_on.split('T')[0];
          }
        });

        setConcessionAmounts(initialAmounts);
        setConcessionExpiresOn(initialExpires);
      } catch (error) {
        setExistingConcessions([]);
        setConcessionAmounts({});
        setConcessionExpiresOn({});
      } finally {
        setLoadingConcessions(false);
      }
    };

    loadExistingConcessions();
  }, [schoolId, concessionStudent, refreshKey]);

  // Add helper function to get concession status
  const getConcessionStatus = (studentId: number, feeHeadId: number, session?: string, month?: string, year?: string) => {
    if (!concessions.has(studentId)) return { hasConcession: false, isEffective: false, amount: 0 };
    const studentConcessions = concessions.get(studentId) || [];
    const feeHeadConcessions = studentConcessions.filter(c => c.feeHeadId === feeHeadId);
    
    if (feeHeadConcessions.length === 0) return { hasConcession: false, isEffective: false, amount: 0 };
    
    // If session, month, year are provided, find the concession effective for this date
    if (session && month && year) {
      const feePeriodDate = new Date(parseInt(year), months.indexOf(month), 1); // First day of fee month
      
      // Find concessions that are effective on or before the fee loading date
      const effectiveConcessions = feeHeadConcessions.filter(concession => {
        if (!concession.effectiveFrom) return true; // If no effective date, always consider it
        const effectiveDate = new Date(concession.effectiveFrom);
        return effectiveDate <= feePeriodDate;
      });
      
      if (effectiveConcessions.length === 0) return { hasConcession: false, isEffective: false, amount: 0 };
      
      // If multiple effective concessions exist, use the one with the latest effective date
      const mostRecentEffective = effectiveConcessions.reduce((latest, current) => {
        if (!current.effectiveFrom) return latest; // Prefer concessions with effective dates
        if (!latest.effectiveFrom) return current;
        
        const currentDate = new Date(current.effectiveFrom);
        const latestDate = new Date(latest.effectiveFrom);
        return currentDate > latestDate ? current : latest;
      });
      
      return {
        hasConcession: true,
        isEffective: true,
        amount: mostRecentEffective.concessionAmount,
        effectiveFrom: mostRecentEffective.effectiveFrom
      };
    }
    
    // If no date context, return info about the first concession found
    const firstConcession = feeHeadConcessions[0];
    return {
      hasConcession: true,
      isEffective: true,
      amount: firstConcession.concessionAmount,
      effectiveFrom: firstConcession.effectiveFrom
    };
  };

  // Add new handler for updating existing concessions
  const handleUpdateConcessions = async () => {
    if (!schoolId || !concessionStudent) {
      showToast('Please select a student first.', 'error');
      return;
    }

    setLoading(true);
    try {
      const concessionsToUpdate = Object.entries(concessionAmounts)
        .map(([feeHeadId, amount]) => ({
          feeHeadId: parseInt(feeHeadId),
          concessionAmount: parseFloat(amount || '0'),
          expiresOn: concessionExpiresOn[parseInt(feeHeadId)] || null
        }))
        .filter(c => c.concessionAmount > 0);

      await feeService.upsertStudentConcessions(schoolId, concessionStudent.id, concessionsToUpdate);
      showToast('Concessions updated successfully!', 'success');
      setRefreshKey(k => k + 1);
    } catch (e) {
      showToast('Failed to update concessions.', 'error');
    }
    setLoading(false);
  };

  // Add reset handler for concessions form
  const handleResetConcessions = () => {
    setConcessionAmounts({});
    setConcessionExpiresOn({});
    showToast('Form fields cleared.', 'success');
  };

  // Add handler for editing individual concessions
  const handleEditConcession = (concession: any) => {
    setConcessionAmounts(prev => ({ ...prev, [concession.feeHeadId]: String(concession.concessionAmount) }));
    setConcessionExpiresOn(prev => ({ ...prev, [concession.feeHeadId]: concession.expires_on ? concession.expires_on.split('T')[0] : '' }));
    showToast('Concession loaded for editing.', 'success');
  };

  // Add handler for deleting individual concessions
  const handleDeleteConcession = async (concession: any) => {
    if (!schoolId || !concessionStudent) {
      showToast('Please select a student first.', 'error');
      return;
    }

    // Show confirmation modal instead of directly deleting
    setConcessionToDelete(concession);
    setIsDeleteSingleConcessionModalOpen(true);
  };

  // Actual delete function for single concession (called after confirmation)
  const handleConfirmDeleteSingleConcession = async () => {
    if (!schoolId || !concessionStudent || !concessionToDelete) {
      showToast('Please select a student first.', 'error');
      return;
    }

    setLoading(true);
    try {
      await feeService.deleteStudentConcessions(schoolId, concessionStudent.id, [concessionToDelete.feeHeadId]);
      showToast('Concession deleted successfully!', 'success');
      
      // Manually update the local state to reflect the deletion immediately
      setExistingConcessions(prev => prev.filter(c => c.feeHeadId !== concessionToDelete.feeHeadId));
      
      setRefreshKey(k => k + 1); // Still trigger a full refresh just in case
    } catch (e) {
      showToast('Failed to delete concession.', 'error');
    }
    setLoading(false);
    setIsDeleteSingleConcessionModalOpen(false);
    setConcessionToDelete(null);
  };

  const handleOpenEditModal = (concession: any) => {
    setEditingConcession(concession);
    setEditedAmount(String(concession.concessionAmount));
    setEditedExpiresOn(concession.expires_on ? concession.expires_on.split('T')[0] : '');
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingConcession(null);
    setEditedAmount('');
    setEditedExpiresOn('');
  };

  const handleUpdateSingleConcession = async () => {
    if (!schoolId || !editingConcession) {
      showToast('An error occurred. Please try again.', 'error');
      return;
    }
  
    setLoading(true);
    try {
      const concessionToUpdate = {
        feeHeadId: editingConcession.feeHeadId,
        concessionAmount: parseFloat(editedAmount || '0'),
        expiresOn: editedExpiresOn || null
      };
  
      if (concessionToUpdate.concessionAmount <= 0) {
        showToast('Concession amount must be greater than zero.', 'error');
        setLoading(false);
        return;
      }
  
      await feeService.upsertStudentConcessions(schoolId, editingConcession.studentId, [concessionToUpdate]);
      showToast('Concession updated successfully!', 'success');
      setRefreshKey(k => k + 1);
      handleCloseEditModal();
    } catch (e) {
      showToast('Failed to update concession.', 'error');
    }
    setLoading(false);
  };

  // Update renderAmount function to show concession details
  const renderAmount = (studentId: number, feeHeadId: number, amount: string) => {
    const key = `${studentId}-${feeHeadId}`;
    const concession = concessionInfo[key];
    const defaultAmount = getDefaultAmount(feeHeadId, Number(preview.find(s => s.id === studentId)?.class_id));
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
        <NumericInput
          value={amount}
          onChange={e => {
            const val = e.target.value;
            setAmountGrid(prev => ({
              ...prev,
              [studentId]: { ...prev[studentId], [feeHeadId]: val.replace(/[^\d.]/g, '') },
            }));
          }}
          style={{
            color: existingFeeInvoiceAmountsMap.has(key) ? '#2e7d32' : 'inherit',
            fontWeight: existingFeeInvoiceAmountsMap.has(key) ? 600 : 'normal'
          }}
        />
        {concession?.applied && (
          <ConcessionIndicator>
            <Loyalty fontSize="small" />
            <Typography variant="caption">
              Concession: {formatAmount(concession.amount)}
            </Typography>
          </ConcessionIndicator>
        )}
      </Box>
    );
  };

  if (pageLoading) {
    return <Loader />;
  }

  if (!loading && students.length === 0) {
    return <NoStudentsFound />;
  }

  return (
    <>
      <ProgressDialog open={loading} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h6" component="div">
            Generating Fees
          </Typography>
        </DialogTitle>
        <DialogContent>
          <ProgressContent>
            <ProgressBar variant="determinate" value={loadingProgress} />
            <ProgressText>
              {loadingStatus || 'Processing...'}
            </ProgressText>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {Math.round(loadingProgress)}% Complete
            </Typography>
          </ProgressContent>
        </DialogContent>
      </ProgressDialog>

    <PageContainer>
        <Header>
      <PageTitle>Load Fee to Students</PageTitle>
        </Header>
      <MainContent>
      <GlassCard>
        <StyledTabs value={tab} onChange={(_, v) => setTab(v)} variant={isMobile ? 'fullWidth' : 'standard'}>
          <StyledTab icon={<Group />} label={isMobile ? "Bulk" : "Bulk"} />
          <StyledTab icon={<Person />} label={isMobile ? "Single" : "Single Student"} />
          <StyledTab icon={<FamilyRestroom />} label="Family" />
          <StyledTab icon={<Loyalty />} label={isMobile ? "Concessions" : "Concessions"} />
        </StyledTabs>
        {tab === 0 && (
          <Box mt={2}>
            <Box display={{ xs: 'block', md: 'flex' }} gap={2}>
              {/* Left: Sticky Glassy Sidebar */}
              <GlassSidebar flex={{ xs: 'unset', md: '1 1 30%' }} minWidth={{ md: 240 }} maxWidth={{ md: 320 }} mb={{ xs: 1.5, md: 0 }}>
                <SectionHeader>Filters</SectionHeader>
                <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
                  <Box display="flex" gap={1.5}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Class</InputLabel>
                      <Select value={selectedClass} label="Class" onChange={e => setSelectedClass(e.target.value)}>
                        <MenuItem value="">Select</MenuItem>
                        {classes.map((c: any) => (
                          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Section</InputLabel>
                      <Select 
                        value={selectedSection} 
                        label="Section" 
                        onChange={e => setSelectedSection(e.target.value)}
                        disabled={!selectedClass || !getClassHasSections(selectedClass)}
                      >
                        <MenuItem value="">Select</MenuItem>
                        {sections.filter(s => !selectedClass || s.class_id === selectedClass).map((s: any) => (
                          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box display="flex" gap={1.5}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Session</InputLabel>
                      <Select value={selectedSession} label="Session" onChange={e => setSelectedSession(e.target.value)}>
                        <MenuItem value="">Select</MenuItem>
                        {sessions.map((s: any) => (
                          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box display="flex" gap={1.5}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Month</InputLabel>
                      <Select value={selectedMonth} label="Month" onChange={e => setSelectedMonth(e.target.value)}>
                        <MenuItem value="">Select</MenuItem>
                        {months.map(m => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Year</InputLabel>
                      <Select value={selectedYear} label="Year" onChange={e => setSelectedYear(e.target.value)}>
                        <MenuItem value="">Select</MenuItem>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <MenuItem key={year} value={String(year)}>{year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <SectionHeader>Fee Heads</SectionHeader>
                <GlassSelectorContainer sx={{ boxShadow: 'none', border: 'none', background: 'transparent', p: 0, m: 0, width: '100%' }}>
                  <FeeHeadSelectorBar sx={{ width: '100%', flexDirection: 'column', gap: 1 }}>
                    {getAvailableFeeHeads(Number(selectedClass), Number(selectedSection)).map((fh: any) => (
                      <FeeHeadPill
                        key={fh.id}
                        selected={selectedFeeHeads.includes(fh.id)}
                        onClick={() => {
                          const newSelection = selectedFeeHeads.includes(fh.id)
                            ? selectedFeeHeads.filter(id => id !== fh.id)
                            : [...selectedFeeHeads, fh.id];
                          setSelectedFeeHeads(newSelection);
                        }}
                        sx={{ width: '100%', justifyContent: 'space-between', minHeight: 44 }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <FeeHeadIcon>
                            {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                              fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                              <AttachMoney fontSize="small" />}
                          </FeeHeadIcon>
                          <FeeHeadName>{fh.name}</FeeHeadName>
                        </Box>
                        <Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'primary.main' }}>
                          Rs. {feeStructuresLoading ? '...' : getDefaultAmount(fh.id, Number(selectedClass))}
                        </Box>
                      </FeeHeadPill>
                    ))}
                  </FeeHeadSelectorBar>
                  <FeeHeadSelectorActions>
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={() => {
                        const availableHeads = getAvailableFeeHeads(Number(selectedClass), Number(selectedSection));
                        setSelectedFeeHeads(availableHeads.map(fh => fh.id));
                      }}
                      disabled={selectedFeeHeads.length === getAvailableFeeHeads(Number(selectedClass), Number(selectedSection)).length}
                    >
                      Select All
                    </Button>
                    <Button size="small" variant="text" onClick={() => setSelectedFeeHeads([])} disabled={selectedFeeHeads.length === 0}>
                      Clear All
                    </Button>
                  </FeeHeadSelectorActions>
                </GlassSelectorContainer>
              </GlassSidebar>
              {/* Right: Main Glassy Card for Students/Results */}
              <GlassMainCard flex={{ xs: 'unset', md: '2 1 70%' }} minWidth={0}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                <SectionHeader>Students</SectionHeader>
                  {preview.length > 0 && selectedFeeHeads.length > 0 && (
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box display="flex" gap={1}>
                          <Button 
                            size="small" 
                            variant="text" 
                            onClick={selectAllStudents}
                            disabled={selectedStudents.length === preview.length}
                          >
                            Select All
                          </Button>
                          <Button 
                            size="small" 
                            variant="text" 
                            onClick={deselectAllStudents}
                            disabled={selectedStudents.length === 0}
                          >
                            Deselect All
                          </Button>
                        </Box>
                      </Box>
                  )}
                </Box>
                <Box mt={1} mb={1.5}><Divider sx={{ opacity: 0.12, borderBottomWidth: 1 }} /></Box>
                {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
                  preview.length > 0 && selectedFeeHeads.length > 0 ? (
                    <Box mt={2}>
                      {/* Scrollable Student List */}
                      <ScrollableStudentList>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', boxSizing: 'border-box' }}>
                        {preview.map((stu, idx) => {
                          const isSelected = selectedStudents.includes(stu.id);
                          return (
                            <Box
                              key={stu.id}
                              onClick={() => handleStudentSelection(stu.id, !isSelected)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                flexDirection: { xs: 'column', sm: 'row' },
                                background: theme.palette.mode === 'dark' ? 'rgba(40,48,80,0.08)' : 'rgba(255,255,255,0.95)',
                                borderRadius: 6,
                                boxShadow: theme.palette.mode === 'dark' 
                                  ? '0 2px 8px 0 #0003' 
                                  : '0 2px 8px 0 #4a6cf70a',
                                border: `1.5px solid ${isSelected ? theme.palette.primary.main : (theme.palette.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')}`,
                                padding: { xs: '8px 10px', sm: '0.4rem 0.6rem' },
                                gap: { xs: '8px', sm: '0.6rem' },
                                fontSize: '0.9rem',
                                width: '100%',
                                minWidth: 300,
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                                '&:hover': {
                                  transform: 'translateY(-0.5px)',
                                  boxShadow: theme.palette.mode === 'dark' 
                                    ? '0 4px 16px 0 #0005' 
                                    : '0 4px 16px 0 #4a6cf70c',
                                }
                              }}
                            >
                              {/* S.No, Avatar, and Student Info grouped together */}
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                width: '100%',
                              }}>
                              {/* S.No */}
                              <Box sx={{ 
                                width: '1.8em', 
                                minWidth: '1.8em', 
                                textAlign: 'center', 
                                fontSize: '0.85rem', 
                                color: 'text.secondary', 
                                fontWeight: 600 
                              }}>
                                {idx + 1}
                              </Box>
                              {/* Avatar */}
                              <Avatar
                                sx={{
                                  width: 24,
                                  height: 24,
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  background: theme.palette.primary.main,
                                  color: '#fff',
                                  flexShrink: 0,
                                }}
                              >
                                {stu.name.charAt(0)}
                              </Avatar>
                              {/* Student Info */}
                              <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                flex: 1,
                                minWidth: 0,
                              }}>
                                <Typography sx={{
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  color: 'text.primary',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%',
                                  lineHeight: 1.2,
                                }}>
                                  {stu.name}
                                </Typography>
                                <Typography sx={{
                                  fontSize: '0.8rem',
                                  color: 'text.secondary',
                                  fontWeight: 500,
                                  marginTop: '0.1rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%',
                                  lineHeight: 1.2,
                                }}>
                                  {classes.find(c => c.id === stu.class_id)?.name || '-'} ({sections.find(s => s.id === stu.section_id)?.name || '-'})
                                </Typography>
                              </Box>
                              </Box>
                              
                              {/* Divider for mobile view */}
                              <Divider sx={{ width: '100%', display: { xs: 'block', sm: 'none' }, my: 1 }} />

                              {/* Fee Amounts */}
                              <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                marginLeft: { sm: 'auto' },
                                alignItems: 'flex-end',
                                minWidth: { sm: '300px' },
                                maxWidth: { sm: '400px' },
                                flex: { sm: 1 },
                                width: '100%',
                              }}>
                                {selectedFeeHeads.map(fhId => {
                                  const feeHead = feeHeads.find(fh => fh.id === fhId);
                                  return (
                                    <Box key={fhId} sx={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '1rem',
                                      width: '100%',
                                    }}>
                                      <Typography sx={{
                                        fontSize: '0.95rem',
                                        color: 'text.primary',
                                        fontWeight: 600,
                                        flex: 1,
                                        textAlign: 'right',
                                        marginTop: '8px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}>
                                        {feeHead?.name}:
                                      </Typography>
                                      <Box sx={{ minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        {renderAmount(stu.id, fhId, amountGrid[stu.id]?.[fhId] ?? '')}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                      {existingFeeInvoiceItemsMap.size > 0 && (
                        <Box sx={{ mt: 2, p: 1.5, backgroundColor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                          <Typography variant="caption" sx={{ color: 'info.dark', fontWeight: 'bold' }}>
                            Note: Some fee heads already have existing records and will be updated. Others will be created. Use "Delete Selected Fee Heads" to remove specific fee heads.
                          </Typography>
                        </Box>
                      )}
                      </ScrollableStudentList>
                      
                      {/* Footer with Generate Button */}
                      <StudentListFooter>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            {selectedStudents.length} of {preview.length} students selected
                          </Typography>
                        </Box>
                        <Box
                          display="flex"
                          sx={{
                            width: '100%',
                            flexDirection: { xs: 'column', md: 'row' },
                            justifyContent: { xs: 'stretch', md: 'flex-end' },
                            alignItems: { xs: 'stretch', md: 'center' },
                            gap: { xs: 1, md: 2 }
                          }}
                        >
                          <GenerateButton 
                          onClick={handleBulkUpsert} 
                          disabled={loading || selectedStudents.length === 0 || !selectedMonth || !selectedYear} 
                          startIcon={<AddIcon />} 
                        >
                          {existingFeeInvoiceItemsMap.size > 0 ? `Generate & Update Fee (${selectedStudents.length})` : `Generate Fee (${selectedStudents.length})`}
                          </GenerateButton>
                        {existingFeeInvoiceItemsMap.size > 0 && (
                          <Button 
                            onClick={handleBulkDelete} 
                            disabled={loading || selectedStudents.length === 0 || !selectedSession || !selectedMonth || !selectedYear} 
                            variant="outlined" 
                            color="error"
                              sx={{ 
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                width: { xs: '100%', sm: 'auto' },
                                padding: { xs: '10px 12px', sm: undefined }
                              }}
                            size="small"
                            startIcon={<Delete />}
                          >
                            Delete Selected Fee Heads
                          </Button>
                        )}
                      </Box>
                      </StudentListFooter>
                    </Box>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6}>
                      <Typography color="text.secondary" fontWeight={500} fontSize="1.1rem">No students to preview. Adjust your filters and try again.</Typography>
                    </Box>
                  )
                )}
              </GlassMainCard>
            </Box>
          </Box>
        )}
        {tab === 1 && (
          !singleStudent ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8}>
              <Typography variant="h6" color="text.secondary" mb={2} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Search for a student to begin.
              </Typography>
              <Autocomplete
                options={students}
                loading={studentsLoading}
                getOptionLabel={(option: any) => `${option.name} (${option.id})`}
                filterOptions={(options, { inputValue }) =>
                  options.filter(
                    (s: any) =>
                      s.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                      String(s.id).includes(inputValue)
                  )
                }
                onChange={(_, value) => setSingleStudent(value ? { id: value.id } : null)}
                onOpen={() => {
                  if (students.length === 0 && !studentsLoading) {
                    loadStudentsData();
                  }
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Search Student by Name or ID" 
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {studentsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                      <Avatar 
                        src={option.picture_url || undefined} 
                        sx={{ width: 40, height: 40 }}
                      >
                        {!option.picture_url && option.name && option.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                          {option.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          {option.father_name || 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          ID: {option.id}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          {classes.find(c => c.id === option.class_id)?.name || ''} ({sections.find(s => s.id === option.section_id)?.name || ''})
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
                sx={{ width: { xs: '100%', sm: 300 }, maxWidth: '100%' }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Box>
          ) : (
          <Box mt={2}>
              <Box mt={2} display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={{ xs: 2, md: 3 }}>
                {/* Column 1: Filters */}
                <GlassCard
                  sx={{
                    flex: { xs: 'unset', md: '1 1 30%' },
                    minWidth: { xs: '100%', md: 280 },
                    maxWidth: { xs: '100%', md: 350 },
                    mb: { xs: 2, md: 0 },
                    p: { xs: 2, md: 2.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 1.5, md: 2 },
                    alignItems: 'stretch',
                    boxShadow: '0 4px 24px 0 #4a6cf71a',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Autocomplete
                    options={students}
                    loading={studentsLoading}
                    getOptionLabel={(option: any) => `${option.name} (${option.id})`}
                    filterOptions={(options, { inputValue }) =>
                      options.filter(
                        (s: any) =>
                          s.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                          String(s.id).includes(inputValue)
                      )
                    }
                    value={singleStudent ? students.find(s => s.id === singleStudent.id) : null}
                    onChange={(_, value) => setSingleStudent(value ? { id: value.id } : null)}
                    onOpen={() => {
                      if (students.length === 0 && !studentsLoading) {
                        loadStudentsData();
                      }
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Search Student" 
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {studentsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                          <Avatar 
                            src={option.picture_url || undefined} 
                            sx={{ width: 40, height: 40 }}
                          >
                            {!option.picture_url && option.name && option.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                              {option.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                              {option.father_name || 'N/A'}
                            </Typography>
                          </Box>
                          <Box sx={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                              ID: {option.id}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                              {classes.find(c => c.id === option.class_id)?.name || ''} ({sections.find(s => s.id === option.section_id)?.name || ''})
                            </Typography>
                          </Box>
                        </Box>
                      </li>
                    )}
                    sx={{ mb: 1, minWidth: { xs: '100%', md: 180 } }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                  />
                  <FormControl size="small" sx={{ mb: 1 }}>
                    <InputLabel>Session</InputLabel>
                    <Select value={singleSession} label="Session" onChange={e => setSingleSession(e.target.value)}>
                      <MenuItem value="">Select</MenuItem>
                      {sessions.map((s: any) => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1} mb={1}>
                    <FormControl size="small" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
                      <InputLabel>Month</InputLabel>
                      <Select value={singleMonth} label="Month" onChange={e => setSingleMonth(e.target.value)}>
                        <MenuItem value="">Select</MenuItem>
                        {months.map(m => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
                      <InputLabel>Year</InputLabel>
                      <Select value={singleYear} label="Year" onChange={e => setSingleYear(e.target.value)}>
                        <MenuItem value="">Select</MenuItem>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <MenuItem key={year} value={String(year)}>{year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <SectionHeader>Fee Heads</SectionHeader>
                  <GlassSelectorContainer sx={{ boxShadow: 'none', border: 'none', background: 'transparent', p: 0, m: 0, width: '100%' }}>
                    <FeeHeadSelectorBar sx={{ width: '100%', flexDirection: 'column', gap: 1 }}>
                      {getAvailableFeeHeads(singleStudent ? Number(singleStudent.class_id) : undefined, singleStudent ? Number(singleStudent.section_id) : undefined).map((fh: any) => (
                        <FeeHeadPill
                          key={fh.id}
                          selected={singleStudentSelectedFeeHeads.includes(fh.id)}
                          onClick={() => {
                            const newSelection = singleStudentSelectedFeeHeads.includes(fh.id)
                              ? singleStudentSelectedFeeHeads.filter(id => id !== fh.id)
                              : [...singleStudentSelectedFeeHeads, fh.id];
                            setSingleStudentSelectedFeeHeads(newSelection);
                          }}
                          sx={{ 
                            width: '100%', 
                            justifyContent: 'space-between', 
                            minHeight: { xs: 48, md: 44 },
                            padding: { xs: '8px 12px', md: '6px 10px' },
                            fontSize: { xs: '0.9rem', md: '0.85rem' }
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <FeeHeadIcon>
                              {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                                fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                                <AttachMoney fontSize="small" />}
                            </FeeHeadIcon>
                            <FeeHeadName>{fh.name}</FeeHeadName>
                            {getConcessionStatus(singleStudent.id, fh.id, singleSession, singleMonth, singleYear).hasConcession && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                                <Loyalty sx={{ color: 'success.main', fontSize: '1rem' }} />
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                  Rs. {getConcessionStatus(singleStudent.id, fh.id, singleSession, singleMonth, singleYear).amount} off
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          <Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'primary.main' }}>
                            Rs. {calculateFinalAmount(singleStudent.id, fh.id, Number(singleStudent.class_id), singleSession, singleMonth, singleYear)}
                          </Box>
                        </FeeHeadPill>
                      ))}
                    </FeeHeadSelectorBar>
                    <FeeHeadSelectorActions>
                      <Button 
                        size="small" 
                        variant="text" 
                        onClick={() => {
                          const availableHeads = getAvailableFeeHeads(singleStudent ? Number(singleStudent.class_id) : undefined, singleStudent ? Number(singleStudent.section_id) : undefined);
                          setSingleStudentSelectedFeeHeads(availableHeads.map(fh => fh.id));
                        }}
                        disabled={!singleStudent || singleStudentSelectedFeeHeads.length === getAvailableFeeHeads(singleStudent ? Number(singleStudent.class_id) : undefined, singleStudent ? Number(singleStudent.section_id) : undefined).length}
                      >
                        Select All
                      </Button>
                      <Button size="small" variant="text" onClick={() => setSingleStudentSelectedFeeHeads([])} disabled={singleStudentSelectedFeeHeads.length === 0}>
                        Clear All
                      </Button>
                    </FeeHeadSelectorActions>
                  </GlassSelectorContainer>
                </GlassCard>
                
                {/* Column 2: Student List with Footer */}
                <GlassMainCard
                  flex={{ xs: 'unset', md: '1 1 70%' }}
                  minWidth={0}
                  sx={{
                    position: 'relative', 
                    overflow: 'visible', 
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)', 
                    backdropFilter: 'blur(10px)', 
                    border: '1.5px solid rgba(74,108,247,0.10)',
                    width: { xs: '100%', md: 'auto' },
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <SectionHeader>Selected Fee Heads</SectionHeader>
                  <Box mt={1} mb={1.5}><Divider sx={{ opacity: 0.12, borderBottomWidth: 1 }} /></Box>
                  
                  {/* Scrollable Fee Heads List */}
                  <ScrollableStudentList sx={{ flex: 1, maxHeight: { xs: '400px', md: '500px' } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', boxSizing: 'border-box' }}>
                        {singleStudentSelectedFeeHeads.map(fhId => {
                          const fh = feeHeads.find(h => h.id === fhId);
                          if (!fh) return null;
                      
                          return (
                        <Box
                          key={fh.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            background: theme.palette.mode === 'dark' ? 'rgba(40,48,80,0.13)' : 'rgba(255,255,255,0.97)',
                            borderRadius: 2,
                            boxShadow: theme.palette.mode === 'dark' 
                              ? '0 4px 24px 0 #0005' 
                              : '0 4px 24px 0 #4a6cf71a',
                            border: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e7ef'}`,
                            padding: '0.8rem 1rem',
                            gap: '1rem',
                            fontSize: '0.93rem',
                            width: '100%',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: theme.palette.mode === 'dark' 
                                ? '0 6px 32px 0 #0007' 
                                : '0 6px 32px 0 #4a6cf71a',
                            }
                          }}
                        >
                          {/* Icon */}
                                <FeeHeadIcon>
                                  {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                                    fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                                    <AttachMoney fontSize="small" />}
                                </FeeHeadIcon>
                          
                          {/* Fee Head Name */}
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}>
                            {fh.name}
                          </Typography>
                            {getConcessionStatus(singleStudent.id, fh.id, singleSession, singleMonth, singleYear).hasConcession && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Loyalty sx={{ color: 'success.main', fontSize: '1rem' }} />
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                  Rs. {getConcessionStatus(singleStudent.id, fh.id, singleSession, singleMonth, singleYear).amount} off
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          
                          {/* Default Amount */}
                          <Typography sx={{
                            fontSize: '0.9rem',
                            color: 'text.secondary',
                            fontWeight: 500,
                            minWidth: '80px',
                            textAlign: 'right',
                          }}>
                            Rs. {getDefaultAmount(fh.id, Number(singleStudent.class_id))}
                          </Typography>
                          
                          {/* Amount Input */}
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}>
                            <NumericInput
                                  type="number"
                                  min={0}
                                  value={amountGrid[singleStudent.id]?.[fhId] ?? ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setAmountGrid(prev => ({
                                      ...prev,
                                      [singleStudent.id]: { ...prev[singleStudent.id], [fhId]: val.replace(/[^\d.]/g, '') },
                                    }));
                                  }}
                                  style={{
                                    color: hasExistingFeeHead(singleStudent.id, fhId) ? '#2e7d32' : 'inherit',
                                    fontWeight: hasExistingFeeHead(singleStudent.id, fhId) ? 600 : 'normal'
                                  }}
                            />
                            {getConcessionStatus(singleStudent.id, fh.id, singleSession, singleMonth, singleYear).hasConcession && (
                              <Typography sx={{
                                fontSize: '0.75rem',
                                color: 'success.main',
                                fontWeight: 500,
                                textAlign: 'center',
                              }}>
                                ({getDefaultAmount(fh.id, Number(singleStudent.class_id))} - {getConcessionStatus(singleStudent.id, fh.id, singleSession, singleMonth, singleYear).amount})
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Reset Button */}
                                <RestartAltIcon
                                  onClick={() => {
                              const finalAmount = calculateFinalAmount(singleStudent.id, fh.id, Number(singleStudent.class_id), singleSession, singleMonth, singleYear);
                                    setAmountGrid(prev => ({
                                      ...prev,
                                [singleStudent.id]: { ...prev[singleStudent.id], [fhId]: finalAmount },
                                    }));
                                  }}
                            sx={{ 
                              cursor: 'pointer', 
                              color: 'primary.main',
                              padding: '0.5rem',
                              borderRadius: '50%',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                background: theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.1)' : 'rgba(74,108,247,0.05)',
                                transform: 'scale(1.1)',
                              }
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                  </ScrollableStudentList>
                  
                  {/* Footer with Buttons */}
                  {singleStudent && singleStudentSelectedFeeHeads.length > 0 && (
                    <StudentListFooter>
                      <GenerateButton 
                        onClick={handleSingleUpsert} 
                        disabled={loading || !singleSession || !singleMonth || !singleYear}
                        startIcon={<AddIcon />}
                      >
                        {existingFeeInvoiceItemsMap.size > 0 ? 'Generate & Update Fee' : 'Generate Fee'}
                      </GenerateButton>
                      {existingFeeInvoiceItemsMap.size > 0 && (
                        <Button 
                          onClick={handleSingleDelete} 
                          disabled={loading || !singleSession || !singleMonth || !singleYear} 
                          variant="outlined" 
                          color="error"
                          startIcon={<Delete />}
                        >
                          Delete Selected Fee Heads
                        </Button>
                      )}
                    </StudentListFooter>
                  )}
                </GlassMainCard>
              </Box>
            </Box>
          )
        )}
        {tab === 2 && (
          <Box mt={2}>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={{ xs: 2, md: 3 }}>
              {/* --- Column 1: Filters --- */}
              <GlassCard sx={{ 
                p: { xs: 2, md: 3 }, 
                flex: { xs: 'unset', md: '1 1 28%' }, 
                minWidth: { xs: '100%', md: 220 }, 
                maxWidth: { xs: '100%', md: 320 }, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: { xs: 1.5, md: 2 } 
              }}>
                <Autocomplete
                  options={families}
                  getOptionLabel={(option) => option.name || `Family #${option.id}`}
                  value={selectedFamily}
                  onChange={(_, value) => setSelectedFamily(value)}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                        <Avatar 
                          src={option.avatar_url || undefined} 
                          sx={{ width: 40, height: 40 }}
                        >
                          {!option.avatar_url && option.name && option.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                            {option.name || `Family #${option.id}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            {option.contact_number || 'No contact'} • {option.address || 'No address'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          ID: {option.id}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={params => <TextField {...params} label="Select Family" size="small" />}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Session</InputLabel>
                  <Select value={familySession} label="Session" onChange={e => setFamilySession(e.target.value)}>
                    {sessions.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box display="flex" flexDirection="row" gap={1}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select value={familyMonth} label="Month" onChange={e => setFamilyMonth(e.target.value)}>
                      {months.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select value={familyYear} label="Year" onChange={e => setFamilyYear(e.target.value)}>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <MenuItem key={year} value={String(year)}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Divider sx={{ my: 1 }} />
                <SectionHeader>Fee Heads</SectionHeader>
                <GlassSelectorContainer sx={{ boxShadow: 'none', border: 'none', background: 'transparent', p: 0, m: 0, width: '100%' }}>
                   <FeeHeadSelectorBar sx={{ width: '100%', flexDirection: 'column', gap: 1 }}>
                    {getAvailableFeeHeadsForFamily(selectedFamily).map((fh: any) => (
                      <FeeHeadPill
                        key={fh.id}
                        selected={familyTabSelectedFeeHeads.includes(fh.id)}
                        onClick={() => {
                          const newSelection = familyTabSelectedFeeHeads.includes(fh.id)
                            ? familyTabSelectedFeeHeads.filter(id => id !== fh.id)
                            : [...familyTabSelectedFeeHeads, fh.id];
                          setFamilyTabSelectedFeeHeads(newSelection);
                        }}
                        sx={{ 
                          width: '100%', 
                          justifyContent: 'space-between', 
                          minHeight: { xs: 48, md: 44 },
                          padding: { xs: '8px 12px', md: '6px 10px' },
                          fontSize: { xs: '0.9rem', md: '0.85rem' }
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <FeeHeadIcon>
                            {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                             fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                             <AttachMoney fontSize="small" />}
                          </FeeHeadIcon>
                          <FeeHeadName>{fh.name}</FeeHeadName>
                        </Box>
                      </FeeHeadPill>
                    ))}
                   </FeeHeadSelectorBar>
                   <FeeHeadSelectorActions>
                     <Button size="small" variant="text" onClick={() => setFamilyTabSelectedFeeHeads(getAvailableFeeHeadsForFamily(selectedFamily).map((fh: any) => fh.id))}>Select All</Button>
                     <Button size="small" variant="text" onClick={() => setFamilyTabSelectedFeeHeads([])}>Clear All</Button>
                   </FeeHeadSelectorActions>
                </GlassSelectorContainer>
              </GlassCard>

              {/* --- Column 2 & 3 --- */}
              {selectedFamily && (
                <>
                  {/* --- Column 2: Linked Students --- */}
                  <GlassCard sx={{ 
                    p: { xs: 2, md: 3 }, 
                    flex: { xs: 'unset', md: '1 1 22%' }, 
                    minWidth: { xs: '100%', md: 220 }, 
                    maxWidth: { xs: '100%', md: 320 } 
                  }}>
                    <SectionHeader sx={{ textAlign: 'center' }}>Linked Students</SectionHeader>
                    {/* Student Selection Controls */}
                    <Box display="flex" flexDirection={{ xs: 'row', md: 'column' }} gap={1} mb={2} alignItems={{ xs: 'center', md: 'stretch' }}>
                      <Typography variant="body2" color="text.secondary" textAlign={{ xs: 'left', md: 'center' }} sx={{ 
                        fontSize: { xs: '0.8rem', md: '0.875rem' },
                        flex: { xs: 1, md: 'none' }
                      }}>
                        {selectedFamilyStudents.length} of {selectedFamily.family_members?.filter((member: any) => member.student).length || 0} selected
                      </Typography>
                      <Box display="flex" gap={1} justifyContent={{ xs: 'flex-end', md: 'center' }}>
                        <Button 
                          size="small" 
                          variant="text" 
                          onClick={selectAllFamilyStudents}
                          disabled={selectedFamilyStudents.length === (selectedFamily.family_members?.filter((member: any) => member.student).length || 0)}
                          sx={{ 
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            minWidth: { xs: 'auto', md: 'auto' },
                            px: { xs: 1, md: 2 }
                          }}
                        >
                          Select All
                        </Button>
                        <Button 
                          size="small" 
                          variant="text" 
                          onClick={deselectAllFamilyStudents}
                          disabled={selectedFamilyStudents.length === 0}
                          sx={{ 
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            minWidth: { xs: 'auto', md: 'auto' },
                            px: { xs: 1, md: 2 }
                          }}
                        >
                          Deselect All
                        </Button>
                      </Box>
                    </Box>
                     <Box display="flex" flexDirection="column" gap={2} mt={2}>
                      {selectedFamily.family_members?.map((member: any) => {
                        const student = member.student;
                        if (!student) return null;
                        
                        return (
                          <Box 
                            key={member.id} 
                            display="flex" 
                            alignItems="center" 
                            gap={{ xs: 1.5, md: 2 }} 
                            p={{ xs: 1, md: 1.5 }} 
                            borderRadius={2} 
                            sx={{ 
                              background: selectedFamilyStudents.includes(student.id) 
                                ? alpha(theme.palette.primary.main, 0.1) 
                                : alpha(theme.palette.primary.main, 0.05),
                              border: selectedFamilyStudents.includes(student.id) 
                                ? `1px solid ${theme.palette.primary.main}` 
                                : '1px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                background: selectedFamilyStudents.includes(student.id)
                                  ? alpha(theme.palette.primary.main, 0.15)
                                  : alpha(theme.palette.primary.main, 0.08),
                                transform: 'translateY(-1px)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            onClick={() => handleFamilyStudentSelection(student.id, !selectedFamilyStudents.includes(student.id))}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFamilyStudents.includes(student.id)}
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent double triggering
                                handleFamilyStudentSelection(student.id, e.target.checked);
                              }}
                              style={{ transform: 'scale(1.2)', display: 'none' }}
                            />
                            <Avatar sx={{ 
                              bgcolor: 'primary.main', 
                              width: { xs: 36, md: 40 }, 
                              height: { xs: 36, md: 40 },
                              fontSize: { xs: '0.8rem', md: '1rem' }
                            }}>
                              {student.name ? student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?'}
                            </Avatar>
                            <Box>
                              <Typography fontWeight={600} sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
                                {student.name || 'Student'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                                {classes.find(c => c.id === student.class_id)?.name || '--'} ({sections.find(s => s.id === student.section_id)?.name || '--'})
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </GlassCard>
                  
                  {/* --- Column 3: Fee Table --- */}
                  <GlassMainCard 
                    flex={{ xs: 'unset', md: '1 1 50%' }} 
                    minWidth={0}
                    sx={{ width: { xs: '100%', md: 'auto' } }}
                  >
                     <SectionHeader>Fee Details</SectionHeader>
                     {familyTabSelectedFeeHeads.length > 0 && selectedFamilyStudents.length > 0 ? (
                       <Box sx={{ overflowX: 'auto', mt: 2 }}>
                         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                           <thead>
                              <tr style={{ background: 'linear-gradient(90deg, #4a6cf7 0%, #3b82f6 100%)', color: '#fff' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Student</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Fee Head</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Amount</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Reset</th>
                              </tr>
                           </thead>
                           <tbody>
                              {selectedFamily.family_members?.map((member: any) => {
                                const stu = member.student;
                                if (!stu || !selectedFamilyStudents.includes(stu.id)) return null;

                                // Filter fee heads for THIS student that have a non-zero amount
                                const applicableHeads = familyTabSelectedFeeHeads
                                  .map(fhId => feeHeads.find(h => h.id === fhId))
                                  .filter(fh => {
                                    if (!fh) return false;
                                    const defaultAmount = getDefaultAmount(fh.id, Number(stu.class_id));
                                    return parseFloat(defaultAmount) > 0;
                                  });

                                if (applicableHeads.length === 0) return null;

                                return applicableHeads.map((fh, index) => {
                                   if (!fh) return null;
                                   return (
                                    <tr key={`${stu.id}-${fh.id}`} style={{ borderBottom: '1px solid ' + alpha(theme.palette.divider, 0.1) }}>
                                      {index === 0 && (
                                        <td rowSpan={applicableHeads.length} style={{ padding: '8px 12px', fontWeight: 600, verticalAlign: 'top', borderRight: '1px solid ' + alpha(theme.palette.divider, 0.1) }}>
                                          {stu.name}
                                        </td>
                                      )}
                                      <td style={{ padding: '8px 12px' }}>{fh.name}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                        <Box sx={{ minWidth: '150px', margin: '0 auto' }}>
                                          <NumericInput
                                          type="number"
                                          min={0}
                                          value={familyAmountGrid[stu.id]?.[fh.id] ?? ''}
                                          onChange={e => {
                                            const val = e.target.value;
                                            setFamilyAmountGrid(prev => ({
                                              ...prev,
                                                [stu.id]: {
                                                  ...prev[stu.id],
                                                  [fh.id]: val.replace(/[^\d.]/g, '')
                                                }
                                            }));
                                          }}
                                          style={{ 
                                              color: hasExistingFeeHead(stu.id, fh.id) ? '#2e7d32' : 'inherit',
                                            fontWeight: hasExistingFeeHead(stu.id, fh.id) ? 600 : 'normal',
                                              width: '100%',
                                            }}
                                          />
                                          {concessionInfo[`${stu.id}-${fh.id}`]?.applied && (
                                            <ConcessionIndicator>
                                              <Loyalty fontSize="small" />
                                              <Typography variant="caption">
                                                Concession: {formatAmount(concessionInfo[`${stu.id}-${fh.id}`].amount)}
                                          </Typography>
                                            </ConcessionIndicator>
                                        )}
                                        </Box>
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            const finalAmount = calculateFinalAmount(
                                              stu.id,
                                              fh.id,
                                              Number(stu.class_id),
                                              familySession,
                                              familyMonth,
                                              familyYear
                                            );
                                            setFamilyAmountGrid(prev => ({
                                              ...prev,
                                              [stu.id]: {
                                                ...prev[stu.id],
                                                [fh.id]: finalAmount
                                              }
                                            }));
                                          }}
                                          sx={{ color: 'primary.main' }}
                                        >
                                          <RestartAltIcon />
                                        </IconButton>
                                      </td>
                                    </tr>
                                   );
                                });
                              })}
                           </tbody>
                         </table>
                       </Box>
                     ) : (
                        <Box display="flex" alignItems="center" justifyContent="center" height="100%" minHeight={200}>
                          <Typography color="text.secondary">
                            {selectedFamilyStudents.length === 0 ? 'Select students to see fee details.' : 'Select fee heads to see details.'}
                          </Typography>
                        </Box>
                     )}
                     <Box 
                       display="flex" 
                       flexDirection={{ xs: 'column', sm: 'row' }}
                       justifyContent={{ xs: 'center', sm: 'flex-end' }}
                       gap={{ xs: 2, sm: 2 }}
                       mt={4}
                       width="100%"
                     >
                       <PillButton 
                         disabled={!selectedFamily || familyTabSelectedFeeHeads.length === 0 || selectedFamilyStudents.length === 0} 
                         onClick={handleFamilyGenerate}
                         sx={{
                           width: { xs: '100%', sm: 'auto' },
                           minWidth: { xs: '100%', sm: 'auto' },
                           fontSize: { xs: '0.9rem', md: '1rem' },
                           px: { xs: 3, md: 4 },
                           py: { xs: 1, md: 1.2 }
                         }}
                       >
                         {existingFeeInvoiceItemsMap.size > 0 ? `Generate & Update Fee for ${selectedFamilyStudents.length} Student${selectedFamilyStudents.length !== 1 ? 's' : ''}` : `Generate Fee for ${selectedFamilyStudents.length} Student${selectedFamilyStudents.length !== 1 ? 's' : ''}`}
                       </PillButton>
                       {existingFeeInvoiceItemsMap.size > 0 && (
                         <Button 
                           onClick={handleFamilyDelete} 
                           disabled={loading || !selectedFamily || selectedFamilyStudents.length === 0 || !familySession || !familyMonth || !familyYear} 
                           sx={{ 
                             width: { xs: '100%', sm: 'auto' },
                             minWidth: { xs: '100%', sm: 'auto' },
                             fontSize: { xs: '0.9rem', md: '1rem' }
                           }} 
                           variant="outlined" 
                           color="error"
                           startIcon={<Delete />}
                         >
                           Delete Selected Fee Heads
                         </Button>
                       )}
                     </Box>
                  </GlassMainCard>
                </>
              )}
            </Box>
            {!selectedFamily && (
              <Box display="flex" alignItems="center" justifyContent="center" minHeight={300}>
                <Typography color="text.secondary">Select a family to begin.</Typography>
              </Box>
            )}
          </Box>
        )}
        {tab === 3 && (
          <Box mt={2} p={3}>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
              {/* Left Section: Add New Concessions Form */}
              <GlassCard sx={{ flex: { xs: 'unset', md: '1 1 40%' }, p: 3 }}>
                <SectionHeader>Add New Concessions</SectionHeader>
                
                {/* Student Selection */}
                <Autocomplete
                  options={students}
                  loading={studentsLoading}
                  getOptionLabel={(option: any) => `${option.name} (${option.id})`}
                  filterOptions={(options, { inputValue }) =>
                    options.filter(
                      (s: any) =>
                        s.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                        String(s.id).includes(inputValue)
                    )
                  }
                  value={concessionStudent}
                  onChange={(_, value) => setConcessionStudent(value)}
                  onOpen={() => {
                    if (students.length === 0 && !studentsLoading) {
                      loadStudentsData();
                    }
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ProfileAvatar 
                        src={option.picture_url || undefined}
                        sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                      >
                        {!option.picture_url && (option.name ? option.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?')}
                      </ProfileAvatar>
                      <Box>
                        <Typography variant="body1">
                          {option.name} <Typography component="span" variant="body2" color="text.secondary">({option.id})</Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {option.father_name && `Father: ${option.father_name} • `}
                          Class: {classes.find(c => c.id === option.class_id)?.name || '--'} ({sections.find(s => s.id === option.section_id)?.name || '--'})
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Search Student by Name or ID" 
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {studentsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  sx={{ mt: 2, mb: 3 }}
                />

                {/* Student Profile Details */}
                {concessionStudent && (
                  <Box 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 3,
                      p: 2,
                      borderRadius: 1,
                      background: theme => alpha(theme.palette.background.paper, 0.4),
                      backdropFilter: 'blur(12px)',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ProfileAvatar 
                      src={concessionStudent?.picture_url || undefined}
                      sx={{ width: 48, height: 48 }}
                    >
                      {!concessionStudent?.picture_url && (concessionStudent?.name ? concessionStudent.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?')}
                    </ProfileAvatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {concessionStudent?.name || 'Student Name'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                          #{concessionStudent?.id || '--'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {concessionStudent?.father_name || '--'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                          • {classes.find(c => c.id === concessionStudent?.class_id)?.name || '--'} ({sections.find(s => s.id === concessionStudent?.section_id)?.name || '--'})
                        </Typography>
                      </Box>
                    </Box>
                    <Box 
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 1,
                        pl: 2,
                        borderLeft: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '12px',
                          backgroundColor: theme => {
                            const hasActiveConcessions = existingConcessions.some(c => {
                              const expiryDate = c.expires_on ? new Date(c.expires_on) : null;
                              return !expiryDate || expiryDate > new Date();
                            });
                            const hasExpiredConcessions = existingConcessions.some(c => {
                              const expiryDate = c.expires_on ? new Date(c.expires_on) : null;
                              return expiryDate && expiryDate <= new Date();
                            });
                            
                            if (hasActiveConcessions) return theme.palette.success.main;
                            if (hasExpiredConcessions) return theme.palette.error.main;
                            return theme.palette.warning.main;
                          },
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {(() => {
                          const hasActiveConcessions = existingConcessions.some(c => {
                            const expiryDate = c.expires_on ? new Date(c.expires_on) : null;
                            return !expiryDate || expiryDate > new Date();
                          });
                          const hasExpiredConcessions = existingConcessions.some(c => {
                            const expiryDate = c.expires_on ? new Date(c.expires_on) : null;
                            return expiryDate && expiryDate <= new Date();
                          });

                          if (hasActiveConcessions) {
                            return (
                              <>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    animation: `${String(pulseKeyframes)} 2s ease-in-out infinite`
                                  }}
                                />
                                Active
                              </>
                            );
                          }
                          if (hasExpiredConcessions) return 'Expired';
                          return 'No Concessions';
                        })()}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Concessions:
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'primary.main' }}>
                          {existingConcessions.length}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Fee Heads Form */}
                {concessionStudent && (
                  <>
                    <SectionHeader>Fee Heads & Concessions</SectionHeader>
                    <Box sx={{ mt: 1, mb: 2, display: 'flex', gap: 2 }}>
                      <Button size="small" onClick={() => handleSelectAllConcessionFeeHeads(true)}>Select All</Button>
                      <Button size="small" onClick={() => handleSelectAllConcessionFeeHeads(false)}>Clear All</Button>
                    </Box>

                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                      gap: 1.5,
                      maxHeight: 400,
                      overflowY: 'auto',
                      pr: 1
                    }}>
                          {getAvailableFeeHeads(concessionStudent.class_id, concessionStudent.section_id).map(fh => (
                        <Card 
                              key={fh.id} 
                          sx={{ 
                            p: 1.5,
                            cursor: 'pointer',
                            border: '1px solid',
                            borderColor: concessionSelectedFeeHeads.includes(fh.id) ? 'primary.main' : 'divider',
                            bgcolor: concessionSelectedFeeHeads.includes(fh.id) ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.05)
                            },
                            position: 'relative'
                              }}
                              onClick={() => handleConcessionFeeHeadSelection(fh.id, !concessionSelectedFeeHeads.includes(fh.id))}
                            >
                          {concessionSelectedFeeHeads.includes(fh.id) && (
                            <CheckCircleOutline 
                              sx={{ 
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                color: 'primary.main',
                                fontSize: '1.1rem'
                              }} 
                            />
                          )}
                          <Box sx={{ mb: 1, pr: 3 }}>
                            <Typography variant="body1" fontWeight={500} sx={{ mb: 0.25, fontSize: '0.9rem' }}>
                                {fh.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Default: Rs. {getDefaultAmount(fh.id, concessionStudent.class_id)}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <TextField
                                  size="small"
                              placeholder="Concession"
                                  value={concessionAmounts[fh.id] || ''}
                                  onChange={e => {
                                const val = e.target.value.replace(/[^\d.]/g, '');
                                setConcessionAmounts(prev => ({ ...prev, [fh.id]: val }));
                                // Select the fee head if amount is entered
                                if (val && !concessionSelectedFeeHeads.includes(fh.id)) {
                                  setConcessionSelectedFeeHeads(prev => [...prev, fh.id]);
                                }
                                  }}
                                  InputProps={{
                                startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                sx: { 
                                  fontSize: '0.8rem',
                                  '& .MuiInputBase-input': { py: 0.75 },
                                  '& .MuiInputAdornment-root': { 
                                    '& .MuiTypography-root': { fontSize: '0.8rem' }
                                  }
                                }
                                  }}
                                  onClick={e => e.stopPropagation()}
                                />
                            
                                <TextField
                                  size="small"
                              type="date"
                              value={concessionExpiresOn[fh.id] || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                setConcessionExpiresOn(prev => ({ ...prev, [fh.id]: val }));
                                  }}
                                  InputLabelProps={{ shrink: true }}
                              label="Expires On"
                              sx={{ 
                                '& .MuiInputLabel-root': { fontSize: '0.8rem' },
                                '& .MuiInputBase-input': { py: 0.75, fontSize: '0.8rem' }
                                  }}
                                  onClick={e => e.stopPropagation()}
                                />
                          </Box>
                        </Card>
                          ))}
                    </Box>

                    {/* Action Buttons */}
                    <Box display="flex" gap={2} mt={3}>
                      <Button 
                        onClick={handleResetConcessions} 
                        disabled={loading}
                        variant="outlined" 
                        color="secondary"
                        fullWidth
                      >
                        Reset
                      </Button>
                      <PillButton onClick={handleSaveConcessions} disabled={loading} fullWidth>
                        Save Concessions
                      </PillButton>
                    </Box>
                  </>
        )}
      </GlassCard>

              {/* Right Section: Existing Concessions */}
              <GlassMainCard flex={{ xs: 'unset', md: '1 1 60%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <SectionHeader>Existing Concessions</SectionHeader>
                  {existingConcessions.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Filter by Fee Head</InputLabel>
                      <Select
                        value={existingConcessionFilter ? String(existingConcessionFilter) : ''}
                        label="Filter by Fee Head"
                        onChange={(e) => setExistingConcessionFilter(e.target.value ? Number(e.target.value) : null)}
                      >
                        <MenuItem value="">
                          <em>Show All</em>
                        </MenuItem>
                        {feeHeads
                          .filter(fh => existingConcessions.some(c => c.feeHeadId === fh.id))
                          .map((fh: any) => (
                            <MenuItem key={fh.id} value={fh.id}>{fh.name}</MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
                
                {loadingConcessions ? (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                ) : concessionStudent ? (
                  existingConcessions.length > 0 ? (
                    <Box sx={{ 
                      display: 'grid', 
                      gap: 2, 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      perspective: '1000px' // Add perspective for 3D effect
                    }}>
                      {existingConcessions
                        .filter(concession => !existingConcessionFilter || concession.feeHeadId === existingConcessionFilter)
                        .map((concession, index) => {
                          const feeHead = feeHeads.find(fh => fh.id === concession.feeHeadId);
                          return (
                            <Box key={index} sx={{ 
                              p: 1.5,
                              backgroundColor: 'background.paper',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              position: 'relative',
                              transition: 'all 0.3s ease',
                              transform: 'translateZ(0)',
                              transformStyle: 'preserve-3d',
                              backfaceVisibility: 'hidden',
                              boxShadow: theme => `
                                0 1px 2px ${alpha(theme.palette.common.black, 0.05)},
                                0 2px 4px ${alpha(theme.palette.common.black, 0.05)},
                                0 4px 8px ${alpha(theme.palette.common.black, 0.05)}
                              `,
                              '&:hover': {
                                transform: 'translateY(-4px) rotateX(2deg) rotateY(-2deg)',
                                borderColor: 'primary.main',
                                boxShadow: theme => `
                                  0 4px 8px ${alpha(theme.palette.common.black, 0.07)},
                                  0 8px 16px ${alpha(theme.palette.common.black, 0.07)},
                                  0 16px 32px ${alpha(theme.palette.common.black, 0.07)}
                                `,
                                '& .action-buttons': {
                                  opacity: 1,
                                  transform: 'translateY(0)'
                                },
                                '&::before': {
                                  opacity: 1
                                }
                              },
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderRadius: 1,
                                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent 50%)`,
                                opacity: 0,
                                transition: 'opacity 0.3s ease',
                                pointerEvents: 'none'
                              }
                            }}>
                              {/* Fee Head Name with subtle depth */}
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={500} 
                                sx={{ 
                                  mb: 0.5,
                                  color: 'text.primary',
                                  fontSize: '0.9rem',
                                  position: 'relative',
                                  textShadow: theme => `1px 1px 0 ${alpha(theme.palette.background.paper, 0.8)}`
                                }}
                              >
                                {feeHead?.name || `Fee Head ${concession.feeHeadId}`}
                              </Typography>
                              
                              {/* Amounts and Dates with depth effect */}
                              <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 0.5,
                                mb: 1.5,
                                position: 'relative',
                                zIndex: 1
                              }}>
                                {/* Default Amount */}
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  position: 'relative'
                                }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Default Amount:
                                </Typography>
                                  <Typography variant="body2">
                                    Rs. {getDefaultAmount(concession.feeHeadId, concessionStudent.class_id)}
                                </Typography>
                                </Box>

                                {/* Concession Amount with enhanced visibility */}
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  position: 'relative'
                                }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Concession:
                                  </Typography>
                                  <Typography 
                                    variant="body1" 
                                    color="primary.main" 
                                    fontWeight={500}
                                    sx={{ 
                                      textShadow: theme => `1px 1px 0 ${alpha(theme.palette.background.paper, 0.8)}`
                                    }}
                                  >
                                    Rs. {concession.concessionAmount}
                                  </Typography>
                                </Box>

                                {/* Expiry Date */}
                                {concession.expires_on && (
                                  <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    position: 'relative'
                                  }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Expires on:
                                    </Typography>
                                    <Typography variant="body2">
                                      {new Date(concession.expires_on).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      }).replace(/ /g, '-')}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>

                              {/* Action Buttons with 3D lift effect */}
                              <Box 
                                className="action-buttons"
                                sx={{ 
                                  display: 'flex', 
                                  gap: 1,
                                  opacity: 0.7,
                                  transition: 'all 0.3s ease',
                                  transform: 'translateY(2px)',
                                  position: 'relative',
                                  zIndex: 1
                                }}
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleOpenEditModal(concession)}
                                  disabled={loading}
                                  startIcon={<Edit sx={{ fontSize: '1rem' }} />}
                                  sx={{ 
                                    flex: 1,
                                    py: 0.5,
                                    fontSize: '0.75rem',
                                    '& .MuiButton-startIcon': {
                                      mr: 0.5
                                    },
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      transform: 'translateY(-1px)',
                                      boxShadow: theme => `0 2px 4px ${alpha(theme.palette.common.black, 0.1)}`
                                    }
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleDeleteConcession(concession)}
                                  disabled={loading}
                                  startIcon={<Delete sx={{ fontSize: '1rem' }} />}
                                  sx={{ 
                                    flex: 1,
                                    py: 0.5,
                                    fontSize: '0.75rem',
                                    '& .MuiButton-startIcon': {
                                      mr: 0.5
                                    },
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      transform: 'translateY(-1px)',
                                      boxShadow: theme => `0 2px 4px ${alpha(theme.palette.common.black, 0.1)}`
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </Box>
                          );
                        })}
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%" minHeight={200}>
                      <Typography color="text.secondary">No concessions found for this student.</Typography>
                    </Box>
                  )
                ) : (
                  <Box display="flex" alignItems="center" justifyContent="center" height="100%" minHeight={200}>
                    <Typography color="text.secondary">Select a student to view their concessions.</Typography>
                  </Box>
                )}
              </GlassMainCard>
            </Box>
          </Box>
        )}
      </GlassCard>

      <StyledDialog open={isEditModalOpen} onClose={handleCloseEditModal}>
        <DialogHeader>
          <EditDialogTitle>Edit Concession</EditDialogTitle>
          <IconButton onClick={handleCloseEditModal} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          {editingConcession && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', fontWeight: 500 }}>
                {feeHeads.find(fh => fh.id === editingConcession.feeHeadId)?.name}
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Concession Amount"
                type="number"
                fullWidth
                variant="outlined"
                value={editedAmount}
                onChange={(e) => setEditedAmount(e.target.value.replace(/[^\d.]/g, ''))}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Expires On"
                type="date"
                fullWidth
                variant="outlined"
                value={editedExpiresOn}
                onChange={(e) => setEditedExpiresOn(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </StyledDialogContent>
        <FormActions>
          <Button onClick={handleCloseEditModal} variant="outlined">Cancel</Button>
          <PillButton onClick={handleUpdateSingleConcession} disabled={loading}>
            Save Changes
          </PillButton>
        </FormActions>
      </StyledDialog>

      {/* Delete All Concessions Confirmation Modal */}
      <StyledDialog open={isDeleteAllConcessionsModalOpen} onClose={() => setIsDeleteAllConcessionsModalOpen(false)}>
        <DialogHeader>
          <EditDialogTitle>Delete All Concessions</EditDialogTitle>
          <IconButton onClick={() => setIsDeleteAllConcessionsModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>all concessions</strong> for{' '}
            <strong>{concessionStudent?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
            This action cannot be undone. All concession records for this student will be permanently removed.
          </Typography>
        </StyledDialogContent>
        <FormActions>
          <Button onClick={() => setIsDeleteAllConcessionsModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteAllConcessions} 
            disabled={loading}
            variant="contained" 
            color="error"
          >
            {loading ? <CircularProgress size={20} /> : 'Delete All Concessions'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Delete Single Concession Confirmation Modal */}
      <StyledDialog open={isDeleteSingleConcessionModalOpen} onClose={() => setIsDeleteSingleConcessionModalOpen(false)}>
        <DialogHeader>
          <EditDialogTitle>Delete Concession</EditDialogTitle>
          <IconButton onClick={() => setIsDeleteSingleConcessionModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          {concessionToDelete && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete the concession for{' '}
                <strong>{feeHeads.find(fh => fh.id === concessionToDelete.feeHeadId)?.name}</strong>?
              </Typography>
              <Box sx={{ 
                p: 2, 
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                mb: 2
              }}>
                <Typography variant="body2" color="text.secondary">
                  Concession Amount: <strong>Rs. {concessionToDelete.concessionAmount}</strong>
                </Typography>
                {concessionToDelete.expires_on && (
                  <Typography variant="body2" color="text.secondary">
                    Expires on: <strong>{new Date(concessionToDelete.expires_on).toLocaleDateString()}</strong>
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
                This action cannot be undone.
              </Typography>
            </Box>
          )}
        </StyledDialogContent>
        <FormActions>
          <Button onClick={() => setIsDeleteSingleConcessionModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteSingleConcession} 
            disabled={loading}
            variant="contained" 
            color="error"
          >
            {loading ? <CircularProgress size={20} /> : 'Delete Concession'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Delete Family Fees Confirmation Modal */}
      <StyledDialog open={isDeleteFamilyFeesModalOpen} onClose={() => setIsDeleteFamilyFeesModalOpen(false)}>
        <DialogHeader>
          <EditDialogTitle>Delete Family Fees</EditDialogTitle>
          <IconButton onClick={() => setIsDeleteFamilyFeesModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>all family fees</strong> for{' '}
            <strong>{selectedFamily?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
            This action cannot be undone. All family fee records for this family will be permanently removed.
          </Typography>
        </StyledDialogContent>
        <FormActions>
          <Button onClick={() => setIsDeleteFamilyFeesModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmFamilyDelete} 
            disabled={loading}
            variant="contained" 
            color="error"
          >
            {loading ? <CircularProgress size={20} /> : 'Delete All Family Fees'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Delete Bulk Fees Confirmation Modal */}
      <StyledDialog open={isDeleteBulkFeesModalOpen} onClose={() => setIsDeleteBulkFeesModalOpen(false)}>
        <DialogHeader>
          <EditDialogTitle>Delete Bulk Fees</EditDialogTitle>
          <IconButton onClick={() => setIsDeleteBulkFeesModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>selected fee heads</strong> for{' '}
            <strong>{selectedStudents.length} students</strong>?
          </Typography>
          <Box sx={{ 
            p: 2, 
            backgroundColor: alpha(theme.palette.warning.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Session:</strong> {sessions.find(s => s.id === parseInt(selectedSession))?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Period:</strong> {selectedMonth} {selectedYear}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Fee Heads:</strong> {selectedFeeHeads.length} selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Students:</strong> {selectedStudents.length} selected
            </Typography>
          </Box>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
            This action cannot be undone. All selected fee records will be permanently removed.
          </Typography>
        </StyledDialogContent>
        <FormActions>
          <Button onClick={() => setIsDeleteBulkFeesModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmBulkDelete} 
            disabled={loading}
            variant="contained" 
            color="error"
          >
            {loading ? <CircularProgress size={20} /> : 'Delete Selected Fees'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Delete Single Student Fees Confirmation Modal */}
      <StyledDialog open={isDeleteSingleFeesModalOpen} onClose={() => setIsDeleteSingleFeesModalOpen(false)}>
        <DialogHeader>
          <EditDialogTitle>Delete Student Fees</EditDialogTitle>
          <IconButton onClick={() => setIsDeleteSingleFeesModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>selected fee heads</strong> for{' '}
            <strong>{singleStudent?.name}</strong>?
          </Typography>
          <Box sx={{ 
            p: 2, 
            backgroundColor: alpha(theme.palette.warning.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Session:</strong> {sessions.find(s => s.id === parseInt(singleSession))?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Period:</strong> {singleMonth} {singleYear}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Fee Heads:</strong> {singleStudentSelectedFeeHeads.length} selected
            </Typography>
          </Box>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
            This action cannot be undone. All selected fee records will be permanently removed.
          </Typography>
        </StyledDialogContent>
        <FormActions>
          <Button onClick={() => setIsDeleteSingleFeesModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSingleDelete} 
            disabled={loading}
            variant="contained" 
            color="error"
          >
            {loading ? <CircularProgress size={20} /> : 'Delete Selected Fees'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Bulk Generate Confirmation Dialog */}
      <StyledDialog open={showBulkConfirmDialog} onClose={() => setShowBulkConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogHeader>
          <EditDialogTitle>Generate Fees</EditDialogTitle>
          <IconButton onClick={() => setShowBulkConfirmDialog(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to generate fees for <strong>{selectedStudents.length} students</strong>?
          </Typography>
          <Box sx={{ 
            p: 2, 
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Session:</strong> {sessions.find(s => s.id === parseInt(selectedSession))?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Period:</strong> {selectedMonth} {selectedYear}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Fee Heads:</strong> {selectedFeeHeads.length} selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Students:</strong> {selectedStudents.length} selected
            </Typography>
          </Box>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
            This will create or update fee invoices for the selected students with the specified amounts.
          </Typography>
        </StyledDialogContent>
        <FormActions>
          <Button 
            onClick={() => setShowBulkConfirmDialog(false)} 
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmBulkUpsert} 
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Generate Fees'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Family Generate Confirmation Dialog */}
      <StyledDialog open={showFamilyConfirmDialog} onClose={() => setShowFamilyConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogHeader>
          <EditDialogTitle>Generate Family Fees</EditDialogTitle>
          <IconButton onClick={() => setShowFamilyConfirmDialog(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to generate fees for <strong>{selectedFamilyStudents.length} students</strong> in this family?
          </Typography>
          <Box sx={{ 
            p: 2, 
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Family:</strong> {selectedFamily?.family_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Session:</strong> {sessions.find(s => s.id === parseInt(familySession))?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Period:</strong> {familyMonth} {familyYear}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Students:</strong> {selectedFamilyStudents.length} selected
            </Typography>
          </Box>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
            This will create or update fee invoices for the selected family members with the specified amounts.
          </Typography>
        </StyledDialogContent>
        <FormActions>
          <Button 
            onClick={() => setShowFamilyConfirmDialog(false)} 
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmFamilyGenerate} 
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Generate Fees'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Single Student Confirmation Dialog */}
      <StyledDialog open={showSingleConfirmDialog} onClose={() => setShowSingleConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogHeader>
          <EditDialogTitle>Generate Single Student Fee</EditDialogTitle>
          <IconButton onClick={() => setShowSingleConfirmDialog(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to generate fees for <strong>{singleStudent?.name || 'Selected Student'}</strong>?
          </Typography>
          <Box sx={{ 
            p: 2, 
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Student:</strong> {singleStudent?.name || 'N/A'} (ID: {singleStudent?.id || 'N/A'})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Session:</strong> {sessions.find(s => s.id === parseInt(singleSession))?.name || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Period:</strong> {singleMonth} {singleYear}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Fee Heads:</strong> {singleStudentSelectedFeeHeads.length} selected
            </Typography>
          </Box>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
            This will {existingFeeInvoiceItemsMap.size > 0 ? 'update existing' : 'create new'} fee invoice for the student with the specified amounts.
          </Typography>
        </StyledDialogContent>
        <FormActions>
          <Button 
            onClick={() => setShowSingleConfirmDialog(false)} 
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmSingleUpsert} 
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (existingFeeInvoiceItemsMap.size > 0 ? 'Update Fee' : 'Generate Fee')}
          </Button>
        </FormActions>
      </StyledDialog>
      </MainContent>
    </PageContainer>
    </>
  );
} 