import React, { useState, useEffect, useContext } from 'react';
import {
  Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, Button, useMediaQuery, CircularProgress, Divider, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Card, InputAdornment, LinearProgress, useTheme as useMuiTheme
} from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { sortClasses } from '../utils/classUtils';
import { matchesStudentSearch, getStudentDisplayId } from '../utils/studentUtils';
import { Add as AddIcon, CheckCircle, ErrorOutline, Person, Group, CalendarMonth, AttachMoney, School, Commute, FamilyRestroom, Loyalty, Delete, Edit, Close as CloseIcon, CheckCircleOutline } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { feeService } from '../services/feeService';
import { fetchAllRows } from '../utils/paginationHelper';
import { FeePlanWithItems } from '../types/fee';
import { alpha } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useToast } from '../components/useToast';
import LoadingButton from '@mui/lab/LoadingButton';
import { keyframes } from '@emotion/react';
import NoStudentsFound from '../components/NoStudentsFound';
import Loader from '../components/Loader';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

const pulseKeyframes = keyframes({
  '0%': { opacity: 0.4 },
  '50%': { opacity: 1 },
  '100%': { opacity: 0.4 }
});

// ===== COMPACT & SPACE-EFFICIENT STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
  min-height: 0; /* Critical for flex children */
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    gap: 0.375rem;
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.06)'
    : '1px solid rgba(0, 0, 0, 0.06)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 1px 4px rgba(0, 0, 0, 0.15)'
    : '0 1px 4px rgba(0, 0, 0, 0.05)'};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.01em;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    gap: 0.375rem;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 8px;
  
  @media (max-width: 768px) {
    gap: 0.375rem;
    flex: none;
    overflow-y: visible;
    overflow-x: visible;
    min-height: auto;
  }
`;

const ContentCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.06)'
    : '1px solid rgba(0, 0, 0, 0.06)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 1px 4px rgba(0, 0, 0, 0.15)'
    : '0 1px 4px rgba(0, 0, 0, 0.05)'};
  padding: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    overflow: visible;
    flex: none;
    min-height: auto;
  }
`;
const PillButton = muiStyled(Button)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  return {
    background: isDarkMode
    ? 'linear-gradient(45deg, #4a6cf7, #7c3aed)'
    : 'linear-gradient(45deg, #4a6cf7, #3b82f6)',
  color: 'white',
  borderRadius: '10px',
  padding: '6px 20px',
  minWidth: 0,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.97rem',
    boxShadow: isDarkMode
    ? '0 4px 16px rgba(74, 108, 247, 0.18)'
    : '0 4px 16px rgba(74, 108, 247, 0.12)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
      boxShadow: isDarkMode
      ? '0 8px 24px rgba(74, 108, 247, 0.22)'
      : '0 8px 24px rgba(74, 108, 247, 0.18)'
  }
  };
});

// Fee Head Pill/Button
interface FeeHeadPillProps {
  $selected?: boolean;
}
const GlassSelectorContainer = muiStyled(Box)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  return {
    background: isDarkMode
    ? 'rgba(40,48,80,0.13)'
    : 'rgba(255,255,255,0.68)',
  borderRadius: 10,
  boxShadow: 'none',
    border: isDarkMode
    ? '1px solid rgba(74,108,247,0.10)'
    : '1px solid rgba(74,108,247,0.07)',
  padding: theme.spacing(1.2, 1.5),
  margin: `${theme.spacing(1.2)} 0`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  minHeight: 0,
  overflow: 'hidden',
  };
});
const FeeHeadPill = muiStyled(Box)<FeeHeadPillProps>(({ theme, $selected }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  const primaryColor = theme.palette.primary.main;
  const textColor = theme.palette.text.primary;
  
  return {
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: '4px 8px',
  borderRadius: 6,
    background: $selected
      ? (isDarkMode
        ? 'rgba(74,108,247,0.15)'
        : 'rgba(74,108,247,0.08)')
      : (isDarkMode
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(0,0,0,0.02)'),
    color: $selected ? primaryColor : textColor,
  fontWeight: 500,
  fontSize: '0.75rem',
  cursor: 'pointer',
  boxShadow: 'none',
    border: $selected
      ? `1px solid ${primaryColor}`
    : '1px solid rgba(74,108,247,0.06)',
  transition: 'all 0.15s',
  userSelect: 'none',
  position: 'relative',
  minWidth: 0,
  '&:hover, &:focus': {
      background: $selected
        ? (isDarkMode
          ? 'rgba(74,108,247,0.2)'
          : 'rgba(74,108,247,0.12)')
        : (isDarkMode
          ? 'rgba(74,108,247,0.08)'
          : 'rgba(74,108,247,0.05)'),
      borderColor: primaryColor,
  },
  };
});
const FeeHeadIcon = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  borderRadius: 4,
  background: 'rgba(74,108,247,0.08)',
  color: theme.palette.primary.main,
  fontSize: 12,
  flexShrink: 0,
}));
const FeeHeadName = muiStyled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '0.75rem',
  color: 'inherit',
  lineHeight: 1.2,
}));
const FeeHeadDesc = muiStyled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: theme.palette.text.secondary,
  fontWeight: 400,
  opacity: 0.7,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 100,
  marginLeft: theme.spacing(0.5),
}));
const FeeHeadSelectorBar = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  alignItems: 'stretch',
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: theme.spacing(0.5),
  
  /* Scrollbar styling */
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '3px',
    transition: 'background 0.2s',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
  },
  
  /* Firefox scrollbar */
  scrollbarWidth: 'thin',
  scrollbarColor: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.2) transparent' 
    : 'rgba(0, 0, 0, 0.2) transparent',
}));
const FeeHeadSelectorActions = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  alignItems: 'center',
  marginLeft: 'auto',
}));

const Sidebar = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.06)'
    : '1px solid rgba(0, 0, 0, 0.06)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 1px 4px rgba(0, 0, 0, 0.15)'
    : '0 1px 4px rgba(0, 0, 0, 0.05)'};
  padding: 0.75rem;
  min-width: 0;
  position: sticky;
  top: 0.5rem;
  align-self: flex-start;
  height: calc(100vh - 120px);
  max-height: calc(100vh - 120px);
  overflow: hidden;
  overflow-x: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'};
    border-radius: 2px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
  }
  
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'} transparent;
  
  @media (max-width: 768px) {
    position: static;
    padding: 0.5rem;
    max-height: none;
    overflow-y: visible;
  }
`;

const SectionHeader = styled.div`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  opacity: 0.8;
  
  &::before {
    content: '';
    width: 2px;
    height: 14px;
    background: ${({ theme }) => theme.ACCENT};
    border-radius: 1px;
  }
`;

const MainCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.06)'
    : '1px solid rgba(0, 0, 0, 0.06)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 1px 4px rgba(0, 0, 0, 0.15)'
    : '0 1px 4px rgba(0, 0, 0, 0.05)'};
  padding: 0.75rem;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

const PaginationContainer = muiStyled(Box)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  return {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  margin: '8px 0 0 0',
  padding: '6px 8px',
    background: isDarkMode ? '#1a1a1a' : '#f8fafc',
  borderRadius: '8px',
  boxShadow: '0 1px 4px #0001',
  minHeight: '32px',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '6px'
  }
  };
});

const PaginationInfo = muiStyled(Typography)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  return {
  fontSize: '0.8rem',
  fontWeight: 600,
    color: isDarkMode ? '#4a6cf7' : '#2563eb',
  margin: 0,
  [theme.breakpoints.down('sm')]: {
    textAlign: 'center'
  }
  };
});

const PaginationControls = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  [theme.breakpoints.down('sm')]: {
    justifyContent: 'center'
  }
}));

// Compact Tab Components
const StyledTabs = muiStyled(Tabs)(({ theme }) => ({
  minHeight: 36,
  '& .MuiTabs-indicator': {
    height: 2,
    borderRadius: 1,
    background: 'linear-gradient(90deg, #4a6cf7 0%, #3b82f6 100%)',
  },
  '& .MuiTabs-flexContainer': {
    gap: 0,
    padding: '0 2px',
  },
}));

const StyledTab = muiStyled(Tab)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  return {
    minHeight: 36,
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 6,
    margin: '0 2px',
    transition: 'all 0.2s ease',
    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
    '&.Mui-selected': {
      color: theme.palette.primary.main,
      background: isDarkMode ? 'rgba(74, 108, 247, 0.1)' : 'rgba(74, 108, 247, 0.08)',
    },
    '& .MuiTab-iconWrapper': {
      marginBottom: 0,
      marginRight: 6,
      fontSize: '0.875rem',
    },
    '&:hover': {
      background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    [theme.breakpoints.down('sm')]: {
      minHeight: 32,
      padding: '4px 10px',
      fontSize: '0.7rem',
      '& .MuiTab-iconWrapper': {
        marginRight: 4,
        fontSize: '0.8125rem',
      },
    },
  };
});

// Compact Scrollable Student List Container
const ScrollableStudentList = muiStyled(Box)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  return {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: '4px',
  marginRight: 0,
  scrollbarGutter: 'stable',
  scrollbarWidth: 'thin',
    scrollbarColor: `${isDarkMode ? 'rgba(74,108,247,0.3) transparent' : 'rgba(74,108,247,0.3) transparent'}`,
  msOverflowStyle: 'scrollbar',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
      background: 'transparent',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
      background: isDarkMode
      ? 'rgba(74,108,247,0.3)'
      : 'rgba(74,108,247,0.3)',
    borderRadius: '3px',
    transition: 'all 0.2s ease',
  },
  '&::-webkit-scrollbar-thumb:hover': {
      background: isDarkMode
      ? 'rgba(74,108,247,0.5)'
      : 'rgba(74,108,247,0.5)',
  },
  '&::-webkit-scrollbar-corner': {
    background: 'transparent',
  }
  };
});

// Footer with Generate Button
const GenerateButton = muiStyled(Button)<{ $disabled?: boolean }>(({ theme, $disabled }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  return {
  background: 'linear-gradient(45deg, #4a6cf7, #3b82f6)',
    color: '#ffffff',
    borderRadius: 6,
  padding: '6px 12px',
    minWidth: 0,
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'none',
    boxShadow: isDarkMode
    ? '0 2px 8px rgba(74, 108, 247, 0.15)'
    : '0 2px 8px rgba(74, 108, 247, 0.12)',
  transition: 'all 0.2s ease',
    '&, & *': {
      color: '#ffffff',
    },
    '& .MuiButton-startIcon': {
      color: '#ffffff',
    },
  '&:hover': {
    transform: 'translateY(-1px)',
      boxShadow: isDarkMode
      ? '0 4px 12px rgba(74, 108, 247, 0.2)'
      : '0 4px 12px rgba(74, 108, 247, 0.15)',
      background: 'linear-gradient(45deg, #5a7cf8, #4b92f7)',
      color: '#ffffff',
      '&, & *': {
        color: '#ffffff',
      },
      '& .MuiButton-startIcon': {
        color: '#ffffff',
      },
  },
  '&:disabled': {
      background: isDarkMode
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.08)',
      color: isDarkMode
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)',
    transform: 'none',
    boxShadow: 'none',
      '&, & *': {
        color: isDarkMode
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
      },
      '& .MuiButton-startIcon': {
        color: isDarkMode
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
      },
  },
  };
});

const ProgressDialogStyled = styled(Dialog)`
  & .MuiDialog-paper {
    border-radius: 12px;
    padding: 24px;
    min-width: 400px;
    background: ${({ theme }) => theme.CARD};
    border: 1px solid ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)'};
    box-shadow: ${({ theme }) => isDark(theme)
      ? '0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  }
`;

const ProgressContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
`;

const ProgressText = muiStyled(Typography)<{ $customTheme?: any }>(({ theme, $customTheme }) => ({
  fontSize: '0.9rem',
  color: $customTheme?.TEXT_PRIMARY || theme.palette.text.primary,
  textAlign: 'center',
  minHeight: '20px',
}));

const ProgressBar = muiStyled(LinearProgress)<{ $customTheme?: any }>(({ theme, $customTheme }) => {
  const isDarkMode = $customTheme ? isDark($customTheme) : theme.palette.mode === 'dark';
  return {
  width: '100%',
  height: '8px',
  borderRadius: '4px',
    backgroundColor: isDarkMode
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)',
  '& .MuiLinearProgress-bar': {
    borderRadius: '4px',
      background: 'linear-gradient(90deg, #4a6cf7 0%, #3b82f6 100%)',
  },
  };
});

// Editable grid cell
const EditableCell = styled.input<{ $muiTheme?: any }>`
  width: 70px;
  border: none;
  outline: none;
  border-radius: 4px;
  background: ${({ $muiTheme }) => {
    const isDarkMode = $muiTheme?.palette?.mode === 'dark';
    return isDarkMode ? 'rgba(74,108,247,0.08)' : 'rgba(74,108,247,0.05)';
  }};
  color: ${({ $muiTheme }) => {
    const isDarkMode = $muiTheme?.palette?.mode === 'dark';
    return $muiTheme?.palette?.text?.primary || (isDarkMode ? '#ffffff' : '#000000');
  }};
  font-weight: 500;
  font-size: 0.75rem;
  padding: 4px 6px;
  text-align: center;
  box-shadow: 0 1px 2px 0 rgba(74,108,247,0.05);
  transition: box-shadow 0.15s;
  
  &:focus {
    box-shadow: ${({ $muiTheme }) => {
      const primaryColor = $muiTheme?.palette?.primary?.main || '#4a6cf7';
      return `0 0 0 1.5px ${primaryColor}33`;
    }};
    background: ${({ $muiTheme }) => {
      const isDarkMode = $muiTheme?.palette?.mode === 'dark';
      return isDarkMode ? 'rgba(74,108,247,0.15)' : 'rgba(74,108,247,0.1)';
    }};
  }
  
  -moz-appearance: textfield;
  &::-webkit-inner-spin-button, &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const ProfileAvatar = muiStyled(Avatar)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  const primaryColor = theme.palette.primary.main;
  const paperBg = theme.palette.background.paper;
  return {
  width: 90,
  height: 90,
  fontSize: '2.25rem',
  fontWeight: 600,
  position: 'relative',
    border: `2px solid ${alpha(primaryColor, 0.3)}`,
    background: paperBg,
  boxShadow: `
      0 0 0 2px ${alpha(paperBg, 0.8)},
      0 0 0 4px ${alpha(primaryColor, 0.1)},
      0 0 10px ${alpha(primaryColor, 0.1)},
      0 0 20px ${alpha(primaryColor, 0.08)},
      0 0 30px ${alpha(primaryColor, 0.05)}
  `,
  '&[type=number]': {
    MozAppearance: 'textfield',
  },
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  '&:focus': {
      boxShadow: `0 0 0 2px ${primaryColor}33`,
      background: isDarkMode ? 'rgba(74,108,247,0.18)' : 'rgba(74,108,247,0.13)',
  },
  };
});

// Helper function to sort class names using the universal sorting function
const sortClassesLocal = (classes: any[]) => {
  return sortClasses(classes);
};

const NumericInput = styled('input')(({ theme }) => {
  const isDarkMode = theme?.palette?.mode === 'dark';
  const primaryColor = theme?.palette?.primary?.main || '#4a6cf7';
  const textColor = theme?.palette?.text?.primary || (isDarkMode ? '#ffffff' : '#000000');
  return {
  width: 70,
  height: 24,
  fontSize: '0.75rem',
  padding: '3px 6px',
  borderRadius: 4,
  textAlign: 'center',
    background: isDarkMode ? 'rgba(74,108,247,0.08)' : 'rgba(74,108,247,0.05)',
    border: `1px solid ${isDarkMode ? 'rgba(74,108,247,0.15)' : 'rgba(74,108,247,0.12)'}`,
    color: textColor,
  outline: 'none',
  transition: 'border 0.15s, box-shadow 0.15s',
  fontWeight: 600,
  '&[type=number]': {
    MozAppearance: 'textfield',
  },
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  '&:focus': {
      borderColor: primaryColor,
      boxShadow: `0 0 0 1.5px ${alpha(primaryColor, 0.15)}`,
  },
  };
});

const StyledDialog = muiStyled(Dialog)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  const paperBg = theme.palette.background.paper;
  return {
  zIndex: 1300,
  '& .MuiDialog-paper': {
      borderRadius: '16px',
        background: paperBg,
      maxWidth: '500px',
      width: '95%',
      overflow: 'hidden',
        boxShadow: isDarkMode
          ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
          : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
        border: isDarkMode
          ? '1px solid rgba(255, 255, 255, 0.05)'
          : '1px solid rgba(0, 0, 0, 0.05)',
  },
  '& .MuiBackdrop-root': {
        backgroundColor: isDarkMode
          ? 'rgba(0, 0, 0, 0.5)'
          : 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
  }
  };
});

const DialogHeader = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: `1px solid ${theme?.palette?.divider || (theme?.palette?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
}));

const EditDialogTitle = muiStyled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: theme.palette.primary.main,
}));

const StyledDialogContent = muiStyled(Box)(({ theme }) => {
  const isDarkMode = theme.palette.mode === 'dark';
  const dividerColor = theme.palette.divider;
  return {
  padding: '24px',
  '& .MuiTextField-root': {
      '& .MuiInputBase-root': {
            background: isDarkMode
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(0, 0, 0, 0.03)',
          borderRadius: '8px',
            border: `1px solid ${dividerColor}`,
          transition: 'background-color 0.2s ease',
          '&:hover, &.Mui-focused': {
                background: isDarkMode
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.05)',
          },
          '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
          }
      }
  }
  };
});

const FormActions = styled(DialogActions)(({ theme }) => {
  const dividerColor = theme?.palette?.divider || (theme?.palette?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
  return {
  padding: '16px 24px',
    borderTop: `1px solid ${dividerColor}`,
  };
});

// Add styled component for concession indicator
const ConcessionIndicator = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  fontSize: '0.75rem',
  color: theme.palette.primary.main,
  marginTop: theme.spacing(0.5),
}));

// Add helper function to format amount
const formatAmount = (amount: number) => {
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// Add months array at the top level
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];


export default function LoadFeePage() {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const muiTheme = useMuiTheme(); // MUI theme for components that need palette
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user } = useAuth();
  const schoolId = user?.school_id;
  const { showToast } = useToast();
  const { setFooterContent } = usePageFooter();

  // State
  const [tab, setTab] = useState(0); // 0: Bulk, 1: Single, 2: Family
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

  // State for Bulk Concessions Tab
  const [bulkConcessionClass, setBulkConcessionClass] = useState('');
  const [bulkConcessionSection, setBulkConcessionSection] = useState('');
  const [bulkConcessionStudents, setBulkConcessionStudents] = useState<any[]>([]);
  const [bulkConcessionSelectedStudents, setBulkConcessionSelectedStudents] = useState<number[]>([]);
  const [bulkConcessionSelectedFeeHeads, setBulkConcessionSelectedFeeHeads] = useState<number[]>([]);
  const [bulkConcessionAmounts, setBulkConcessionAmounts] = useState<{ [studentId: number]: { [feeHeadId: number]: string } }>({});
  const [bulkConcessionExpiresOn, setBulkConcessionExpiresOn] = useState<{ [feeHeadId: number]: string }>({});
  const [bulkConcessionLoading, setBulkConcessionLoading] = useState(false);

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
  
  // State for expanded student rows to show concessions

  // State for fee plans - Map<`${studentId}_${sessionId}`, FeePlanWithItems>
  const [feePlans, setFeePlans] = useState<Map<string, FeePlanWithItems>>(new Map());

  // Helper function to check if a class has sections
  const getClassHasSections = (classId: any) => {
    const classObj = classes.find(c => String(c.id) === String(classId));
    return classObj?.has_sections ?? true; // Default to true for backward compatibility
  };

  // Helper function to format class/section display
  const formatClassSectionDisplay = (classId: any, sectionId: any) => {
    const className = classes.find(c => c.id === classId)?.name || '-';
    const hasSections = getClassHasSections(classId);
    if (hasSections && sectionId) {
      const sectionName = sections.find(s => s.id === sectionId)?.name || '-';
      return `${className} (${sectionName})`;
    }
    return className;
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

  // Helper function to merge current class from student_class_history
  const mergeCurrentClassFromHistory = async (studentsData: any[]) => {
    if (!studentsData || studentsData.length === 0) return studentsData;
    
    const studentIds = studentsData.map(s => s.id);
    
    // Fetch class history for all students - get latest record for each student
    const { data: historyData } = await supabase
      .from('student_class_history')
      .select(`
        id,
        student_id,
        new_class_id,
        new_section_id,
        new_classes:new_class_id(id, name),
        new_sections:new_section_id(id, name)
      `)
      .in('student_id', studentIds)
      .eq('school_id', schoolId)
      .order('id', { ascending: true });

    // Create a map of current class for each student
    const currentClassMap = new Map();
    
    if (historyData && historyData.length > 0) {
      // Group by student_id
      const studentRecordsMap = new Map();
      historyData.forEach((entry: any) => {
        const studentId = entry.student_id;
        if (!studentRecordsMap.has(studentId)) {
          studentRecordsMap.set(studentId, []);
        }
        studentRecordsMap.get(studentId).push(entry);
      });
      
      // For each student, get the latest record (current class)
      studentRecordsMap.forEach((records, studentId) => {
        if (records.length > 0) {
          // Last record = current class
          const lastRecord = records[records.length - 1];
          currentClassMap.set(studentId, {
            class: lastRecord.new_classes || null,
            section: lastRecord.new_sections || null,
            class_id: lastRecord.new_class_id || null,
            section_id: lastRecord.new_section_id || null
          });
        }
      });
    }

    // Merge student data with current class from history
    return studentsData.map((student: any) => {
      const currentClass = currentClassMap.get(student.id);
      
      // Use current class from history if available, otherwise fall back to students table
      return {
        ...student,
        classes: currentClass?.class || null,
        sections: currentClass?.section || null,
        class_id: currentClass?.class_id || student.class_id || null,
        section_id: currentClass?.section_id || student.section_id || null
      };
    });
  };

  // Load students data with caching
  const loadStudentsData = async () => {
    if (!schoolId || students.length > 0) return; // Don't reload if already loaded
    setStudentsLoading(true);
    try {
      const { data: stu, error } = await supabase
        .from('students')
        .select('id, name, class_id, section_id, father_name, picture_url, roll_number')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Merge current class from student_class_history
      const studentsWithCurrentClass = await mergeCurrentClassFromHistory(stu || []);
      setStudents(studentsWithCurrentClass);
    } catch (error) {
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch classes, sections, sessions, fee heads, and students
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [cls, sec, ses, stu, fh] = await Promise.all([
        fetchAllRows(async (from, to) => {
          return await supabase.from('classes')
            .select('id, name, has_sections')
            .eq('school_id', schoolId)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('sections')
            .select('id, name, class_id')
            .eq('school_id', schoolId)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('sessions')
            .select('id, name, is_active')
            .eq('school_id', schoolId)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('students')
            .select('id, name, class_id, section_id, father_name, picture_url, roll_number')
            .eq('school_id', schoolId)
            .order('name', { ascending: true })
            .range(from, to);
        }),
        feeService.getFeeHeads(schoolId),
      ]);
      setClasses(sortClassesLocal(cls));
      setSections(sec);
      setSessions(ses);
      
      // Merge current class from student_class_history
      const studentsWithCurrentClass = await mergeCurrentClassFromHistory(stu);
      setStudents(studentsWithCurrentClass);
      setFeeHeads(fh || []);

      // Set default session (active session or latest)
      if (ses && ses.length > 0) {
        const activeSession = ses.find((s: any) => s.is_active);
        const defaultSession = activeSession ? activeSession.id : Math.max(...ses.map((s: any) => s.id));
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
        const structures = await feeService.getFeeStructures(schoolId);
        setFeeStructures(structures);
      } catch (error) {
      } finally {
        setFeeStructuresLoading(false);
      }
    })();
  }, [schoolId, selectedSession]);

  // Fetch fee plans for the session immediately when session is selected (bulk tab)
  useEffect(() => {
    // Only fetch for bulk tab (tab === 0)
    if (tab !== 0) return;

    const fetchFeePlans = async () => {
      if (!schoolId || !selectedSession) {
        setFeePlans(new Map());
        return;
      }

      try {
        // Fetch all fee plans for the session at once (much faster than individual calls)
        const allPlans = await feeService.getAllFeePlans(schoolId);
        
        // Convert to Map for quick lookup (using studentId as key since plans are session-independent)
        const plansMap = new Map<string, FeePlanWithItems>();
        allPlans.forEach(plan => {
          plansMap.set(`${plan.studentId}`, plan);
        });

        setFeePlans(plansMap);
      } catch (error) {
        console.error('Error fetching fee plans:', error);
        setFeePlans(new Map());
      }
    };

    fetchFeePlans();
  }, [schoolId, selectedSession, tab]);

  // Fetch fee plan for single student when student or session changes (single tab)
  useEffect(() => {
    // Only fetch for single tab (tab === 1)
    if (tab !== 1) return;

    const fetchFeePlan = async () => {
      if (!schoolId || !singleStudent || !singleSession) {
        setFeePlans(new Map());
        return;
      }

      try {
        // Use getAllFeePlans for consistency and better performance
        const allPlans = await feeService.getAllFeePlans(schoolId, singleStudent.id);

        const plansMap = new Map<string, FeePlanWithItems>();
        if (allPlans.length > 0) {
          const plan = allPlans[0]; // Should only be one plan for a single student
          plansMap.set(`${singleStudent.id}`, plan);
        }
        setFeePlans(plansMap);
      } catch (error) {
        console.error('Error fetching fee plan:', error);
        setFeePlans(new Map());
      }
    };

    fetchFeePlan();
  }, [schoolId, singleStudent?.id, singleSession, tab]);

  // Fetch fee plans for family students when family or session changes (family tab)
  useEffect(() => {
    // Only fetch for family tab (tab === 2)
    if (tab !== 2) return;

    const fetchFamilyFeePlans = async () => {
      if (!schoolId || !selectedFamily || !familySession) {
        setFeePlans(new Map());
        return;
      }

      try {
        // Fetch all fee plans (session-independent now)
        const allPlans = await feeService.getAllFeePlans(schoolId);
        
        const studentIds = selectedFamily.family_members
          ?.map((member: any) => member.student?.id)
          .filter(Boolean) || [];

        // Filter to only include plans for students in the selected family
        const plansMap = new Map<string, FeePlanWithItems>();
        allPlans.forEach(plan => {
          if (studentIds.includes(plan.studentId)) {
            plansMap.set(`${plan.studentId}`, plan);
          }
        });

        setFeePlans(plansMap);
      } catch (error) {
        console.error('Error fetching family fee plans:', error);
        setFeePlans(new Map());
      }
    };

    fetchFamilyFeePlans();
  }, [schoolId, selectedFamily, familySession, tab]);

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
    
    preview.forEach(stu => {
      newGrid[stu.id] = {};
      selectedFeeHeads.forEach(fhId => {
        // Use calculateFinalAmount which checks fee plans first, then defaults
        const finalAmount = calculateFinalAmount(stu.id, fhId, Number(stu.class_id), selectedSession, selectedMonth, selectedYear);
        // Always use the calculated amount (from fee plans or defaults) to ensure fee plan amounts are used
        newGrid[stu.id][fhId] = finalAmount;
      });
    });
    
    setAmountGrid(newGrid);
  }, [preview, selectedFeeHeads, feeStructures, feeHeads, selectedSession, existingFeeInvoiceAmountsMap, feePlans]);

  // Update useEffect for single student view
  useEffect(() => {
    if (tab === 1 && singleStudent) {
      const studentId = singleStudent.id;
      const classId = Number(singleStudent.class_id);
      
      const newGridForStudent: { [feeHeadId: number]: string } = {};
      
      singleStudentSelectedFeeHeads.forEach(fhId => {
        const key = `${studentId}-${fhId}`;
        if (existingFeeInvoiceAmountsMap.has(key)) {
          // Use existing amount if available
          newGridForStudent[fhId] = String(existingFeeInvoiceAmountsMap.get(key));
        } else {
          // Use calculateFinalAmount which checks fee plans first, then defaults
          newGridForStudent[fhId] = calculateFinalAmount(studentId, fhId, classId, singleSession, singleMonth, singleYear);
        }
      });

      setAmountGrid(prev => ({
        ...prev,
        [studentId]: newGridForStudent,
      }));
    }
  }, [singleStudentSelectedFeeHeads, singleStudent, tab, singleSession, existingFeeInvoiceAmountsMap, feePlans]);

  // Update family view useEffect
  useEffect(() => {
    if (!selectedFamily) return;

    const newGrid: { [studentId: number]: { [feeHeadId: number]: string } } = {};
    
    selectedFamily.family_members?.forEach((member: any) => {
      const stu = member.student;
      if (!stu) return;
      newGrid[stu.id] = {};
      familyTabSelectedFeeHeads.forEach(fhId => {
        const fh = feeHeads.find(h => h.id === fhId);
        if (fh) {
          const key = `${stu.id}-${fhId}`;
          if (existingFeeInvoiceAmountsMap.has(key)) {
            // Use existing amount if available
            newGrid[stu.id][fhId] = String(existingFeeInvoiceAmountsMap.get(key));
          } else {
            // Use calculateFinalAmount which checks fee plans first, then defaults
            newGrid[stu.id][fhId] = calculateFinalAmount(stu.id, fhId, Number(stu.class_id), familySession, familyMonth, familyYear);
          }
        }
      });
    });
    
    setFamilyAmountGrid(newGrid);
  }, [selectedFamily, familyTabSelectedFeeHeads, feeStructures, feeHeads, familySession, existingFeeInvoiceAmountsMap, feePlans]);

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

    // Second, check if there's a fee plan for this student and session
    if (session) {
      const planKey = `${studentId}_${session}`;
      const feePlan = feePlans.get(planKey);
      if (feePlan) {
        // Find the fee plan item for this fee head
        const planItem = feePlan.items.find(item => item.feeHeadId === feeHeadId);
        if (planItem) {
          // Use feeAfterDiscount from fee plan (amount after applying discounts)
          return String(planItem.feeAfterDiscount);
        }
      }
    }

    // If no fee plan, fall back to default amount from fee structures
    return getDefaultAmount(feeHeadId, classId);
  };

  // Get available fee heads based on current selection
  const getAvailableFeeHeads = (classId?: number, sectionId?: number) => {
    // Show fee heads as soon as class is selected
      // Don't require section to be selected for fee heads to appear
      if (!classId) return [];
      // Show all fee heads when class is selected, even if they don't have fee structures yet
      // This allows users to see and select fee heads before setting up fee structures
      return feeHeads;
  };

  // Reset amounts to default values (from fee plans or fee structures)
  const resetToDefaults = () => {
    const newGrid: { [studentId: number]: { [feeHeadId: number]: string } } = {};
    
    preview.forEach(stu => {
      newGrid[stu.id] = {};
      selectedFeeHeads.forEach(fhId => {
        const key = `${stu.id}-${fhId}`;
        if (existingFeeInvoiceAmountsMap.has(key)) {
          // Use existing amount if available
          newGrid[stu.id][fhId] = String(existingFeeInvoiceAmountsMap.get(key));
        } else {
          // Use calculateFinalAmount which checks fee plans first, then defaults
          const finalAmount = calculateFinalAmount(stu.id, fhId, Number(stu.class_id), selectedSession, selectedMonth, selectedYear);
          newGrid[stu.id][fhId] = finalAmount;
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
          throw sectionError;
        }

        filteredStudentIds = sectionData?.map(sch => sch.student_id) || [];
      }

      // Fetch full student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, class_id, section_id, father_name, picture_url, roll_number')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .in('id', filteredStudentIds)
        .order('name', { ascending: true });

      if (studentsError) {
        throw studentsError;
      }

      // Merge current class from student_class_history
      const filtered = await mergeCurrentClassFromHistory(studentsData || []);
      setPreview(filtered);
      // Select all students by default
      setSelectedStudents(filtered.map(stu => stu.id));
    } catch (error) {
      showToast('Failed to load students for the selected session', 'error');
      setPreview([]);
      setSelectedStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-preview when class, section, session, or fee heads change
  useEffect(() => {
    if (!selectedClass || selectedFeeHeads.length === 0 || !selectedSession || !schoolId) {
      setPreview([]);
      setSelectedStudents([]);
      return;
    }
    
    setLoading(true);
    
    // Fetch students from student_class_history for the active session
    const fetchStudentsForSession = async () => {
      try {
        // Fetch students and fee plans in parallel for better performance
        const [schResult, feePlansResult] = await Promise.all([
          supabase
            .from('student_class_history')
            .select('student_id')
            .eq('session_id', selectedSession)
            .eq('new_class_id', selectedClass)
            .eq('school_id', schoolId),
          // Fetch fee plans for the session in parallel
          feeService.getAllFeePlans(schoolId).catch(() => [])
        ]);

        const { data: schData, error: schError } = schResult;

        if (schError) {
          throw schError;
        }

        if (!schData || schData.length === 0) {
          setPreview([]);
          setSelectedStudents([]);
          setLoading(false);
          return;
        }

        // Update fee plans immediately
        const plansMap = new Map<string, FeePlanWithItems>();
        feePlansResult.forEach(plan => {
          plansMap.set(`${plan.studentId}`, plan);
        });
        setFeePlans(plansMap);

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
            throw sectionError;
          }

          filteredStudentIds = sectionData?.map(sch => sch.student_id) || [];
        }

        // Fetch full student details
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name, class_id, section_id, father_name, picture_url, roll_number')
          .eq('school_id', schoolId)
          .eq('status', 'active')
          .in('id', filteredStudentIds)
          .order('name', { ascending: true });

        if (studentsError) {
          throw studentsError;
        }

        // Merge current class from student_class_history
        const filtered = await mergeCurrentClassFromHistory(studentsData || []);
        setPreview(filtered);
        // Select all students by default
        setSelectedStudents(filtered.map(stu => stu.id));
      } catch (error) {
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
        // Use calculateFinalAmount which checks fee plans first, then defaults
        const finalAmount = calculateFinalAmount(stu.id, fhId, Number(stu.class_id), selectedSession, selectedMonth, selectedYear);
        // Always use the calculated amount (from fee plans or defaults) to ensure fee plan amounts are used
        newGrid[stu.id][fhId] = finalAmount;
      });
    });
    setAmountGrid(newGrid);
    // eslint-disable-next-line
  }, [preview, selectedFeeHeads, feeStructures, feeHeads, selectedSession, feePlans]);

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
          // Always use the calculated amount (from fee plans or defaults) to ensure fee plan amounts are used
          newGrid[studentId][fhId] = finalAmount;
        });
      }
    });
    setAmountGrid(newGrid);
    // eslint-disable-next-line
  }, [selectedStudents, selectedFeeHeads, feeStructures, feeHeads, selectedSession, feePlans]);

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

  // Refresh single student amount grid when fee plans are loaded
  useEffect(() => {
    if (tab === 1 && singleStudent && singleStudentSelectedFeeHeads.length > 0) {
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
  }, [feePlans, singleStudent, singleStudentSelectedFeeHeads, singleSession, existingFeeInvoiceAmountsMap]);

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
  }, [selectedClass, bulkConcessionClass, tab, classes]);

  // Add this effect after singleStudent is set from Autocomplete
  useEffect(() => {
    if (tab === 1 && singleStudent && singleStudent.id) {
      (async () => {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:classes(name), section:sections(name), roll_number')
          .eq('id', singleStudent.id)
          .single();
        if (!error && data) {
          // Merge current class from student_class_history
          const studentsWithCurrentClass = await mergeCurrentClassFromHistory([data]);
          if (studentsWithCurrentClass.length > 0) {
            setSingleStudent(studentsWithCurrentClass[0]);
          }
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

  // Set global footer content based on current tab
  useEffect(() => {
    const FooterContent = React.memo(() => {
      const currentTheme = themeMode === 'dark' ? darkTheme : lightTheme;
      
      if (tab === 0) {
        // Bulk tab footer
        if (preview.length === 0) {
          return null;
        }
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '4px 6px' : '6px 12px',
              gap: isMobile ? '4px' : '6px',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            <Typography variant="body2" sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem', color: currentTheme.TEXT_SECONDARY, fontWeight: 500 }}>
              {selectedStudents.length} of {preview.length} selected
            </Typography>
            <Box
              display="flex"
              sx={{
                gap: isMobile ? 0.25 : 0.5,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <GenerateButton 
                onClick={handleBulkUpsert} 
                disabled={loading || selectedStudents.length === 0 || !selectedMonth || !selectedYear} 
                startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />}
                sx={{
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  padding: isMobile ? '3px 6px' : '4px 10px',
                  minHeight: isMobile ? 24 : 26,
                  '& .MuiButton-startIcon': { marginRight: 0.5 },
                  whiteSpace: 'nowrap',
                }}
              >
                {existingFeeInvoiceItemsMap.size > 0 ? `Update (${selectedStudents.length})` : `Generate (${selectedStudents.length})`}
              </GenerateButton>
              {existingFeeInvoiceItemsMap.size > 0 && (
                <Button 
                  onClick={handleBulkDelete} 
                  disabled={loading || selectedStudents.length === 0 || !selectedSession || !selectedMonth || !selectedYear} 
                  variant="outlined" 
                  color="error"
                  sx={{ 
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    padding: isMobile ? '3px 6px' : '4px 10px',
                    minHeight: isMobile ? 24 : 26,
                    whiteSpace: 'nowrap',
                  }}
                  size="small"
                  startIcon={<Delete sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Box>
        );
      } else if (tab === 1) {
        // Single student tab footer
        if (!singleStudent || singleStudentSelectedFeeHeads.length === 0) {
          return null;
        }
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '4px 6px' : '6px 12px',
              gap: isMobile ? '4px' : '6px',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            <Typography variant="body2" sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem', color: currentTheme.TEXT_SECONDARY, fontWeight: 500 }}>
              Ready to generate
            </Typography>
            <Box
              display="flex"
              sx={{
                gap: isMobile ? 0.25 : 0.5,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <GenerateButton 
                onClick={handleSingleUpsert} 
                disabled={loading || !singleSession || !singleMonth || !singleYear}
                startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />}
                sx={{
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  padding: isMobile ? '3px 6px' : '4px 10px',
                  minHeight: isMobile ? 24 : 26,
                  '& .MuiButton-startIcon': { marginRight: 0.5 },
                  whiteSpace: 'nowrap',
                }}
              >
                {existingFeeInvoiceItemsMap.size > 0 ? 'Update Fee' : 'Generate Fee'}
              </GenerateButton>
              {existingFeeInvoiceItemsMap.size > 0 && (
                <Button 
                  onClick={handleSingleDelete} 
                  disabled={loading || !singleSession || !singleMonth || !singleYear} 
                  variant="outlined" 
                  color="error"
                  sx={{ 
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    padding: isMobile ? '3px 6px' : '4px 10px',
                    minHeight: isMobile ? 24 : 26,
                    whiteSpace: 'nowrap',
                  }}
                  size="small"
                  startIcon={<Delete sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Box>
        );
      } else if (tab === 2) {
        // Family tab footer
        if (!selectedFamily || familyTabSelectedFeeHeads.length === 0 || selectedFamilyStudents.length === 0) {
          return null;
        }
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '4px 6px' : '6px 12px',
              gap: isMobile ? '4px' : '6px',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            <Typography variant="body2" sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem', color: currentTheme.TEXT_SECONDARY, fontWeight: 500 }}>
              {selectedFamilyStudents.length} student{selectedFamilyStudents.length !== 1 ? 's' : ''} selected
            </Typography>
            <Box
              display="flex"
              sx={{
                gap: isMobile ? 0.25 : 0.5,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <GenerateButton 
                disabled={!selectedFamily || familyTabSelectedFeeHeads.length === 0 || selectedFamilyStudents.length === 0} 
                onClick={handleFamilyGenerate}
                startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />}
                sx={{
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  padding: isMobile ? '3px 6px' : '4px 10px',
                  minHeight: isMobile ? 24 : 26,
                  '& .MuiButton-startIcon': { marginRight: 0.5 },
                  whiteSpace: 'nowrap',
                }}
              >
                {existingFeeInvoiceItemsMap.size > 0 ? `Update (${selectedFamilyStudents.length})` : `Generate (${selectedFamilyStudents.length})`}
              </GenerateButton>
              {existingFeeInvoiceItemsMap.size > 0 && (
                <Button 
                  onClick={handleFamilyDelete} 
                  disabled={loading || !selectedFamily || selectedFamilyStudents.length === 0 || !familySession || !familyMonth || !familyYear} 
                  sx={{ 
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    padding: isMobile ? '3px 6px' : '4px 10px',
                    minHeight: isMobile ? 24 : 26,
                    whiteSpace: 'nowrap',
                  }} 
                  variant="outlined" 
                  color="error"
                  size="small"
                  startIcon={<Delete sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Box>
        );
      }
      return null;
    });

    setFooterContent({
      visible: true,
      content: <FooterContent />
    });
    
    return () => {
      setFooterContent(null);
    };
  }, [
    tab,
    preview.length,
    selectedStudents.length,
    singleStudent,
    singleStudentSelectedFeeHeads.length,
    selectedFamily,
    familyTabSelectedFeeHeads.length,
    selectedFamilyStudents.length,
    existingFeeInvoiceItemsMap.size,
    loading,
    selectedMonth,
    selectedYear,
    selectedSession,
    singleSession,
    singleMonth,
    singleYear,
    familySession,
    familyMonth,
    familyYear,
    isMobile,
    themeMode,
  ]);

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

  // Update renderAmount function to show concession details - Compact
  const renderAmount = (studentId: number, feeHeadId: number, amount: string) => {
    const key = `${studentId}-${feeHeadId}`;
    const concession = concessionInfo[key];
    
    return (
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
      <ProgressDialogStyled open={loading} maxWidth="sm" fullWidth theme={theme}>
        <DialogTitle sx={{ textAlign: 'center', pb: 1, color: theme.TEXT_PRIMARY }}>
          <Typography variant="h6" component="div" sx={{ color: theme.TEXT_PRIMARY }}>
            Generating Fees
          </Typography>
        </DialogTitle>
        <DialogContent>
          <ProgressContent>
            <ProgressBar variant="determinate" value={loadingProgress} $customTheme={theme} />
            <ProgressText $customTheme={theme}>
              {loadingStatus || 'Processing...'}
            </ProgressText>
            <Typography variant="body2" sx={{ mt: 1, color: theme.TEXT_SECONDARY }}>
              {Math.round(loadingProgress)}% Complete
            </Typography>
          </ProgressContent>
        </DialogContent>
      </ProgressDialogStyled>

    <PageContainer theme={theme}>
        <Header theme={theme}>
          <HeaderTitle theme={theme}>
            <AttachMoney style={{ fontSize: 20, color: theme.ACCENT }} />
            Load Fee to Students
          </HeaderTitle>
        </Header>
      <MainContent theme={theme}>
      <ContentCard theme={theme}>
        <Box sx={{ borderBottom: `1px solid ${muiTheme.palette.divider}`, mb: 1, pb: 0.5 }}>
          <StyledTabs value={tab} onChange={(_, v) => setTab(v)} variant={isMobile ? 'fullWidth' : 'standard'}>
            <StyledTab icon={<Group />} label={isMobile ? "Bulk" : "Bulk"} />
            <StyledTab icon={<Person />} label={isMobile ? "Single" : "Single"} />
            <StyledTab icon={<FamilyRestroom />} label="Family" />
          </StyledTabs>
        </Box>
        {tab === 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', gap: 0.5, 
            '@media (max-width: 768px)': { overflow: 'visible', flex: 'none', minHeight: 'auto' }
          }}>
            <Box display={{ xs: 'block', md: 'flex' }} gap={0.5} sx={{ flex: 1, minHeight: 0, overflow: 'hidden',
              '@media (max-width: 768px)': { overflow: 'visible', flex: 'none', minHeight: 'auto' }
            }}>
              {/* Left: Sticky Sidebar */}
              <Box sx={{ flex: { xs: 'unset', md: '0 0 240px' }, minWidth: { md: 240 }, maxWidth: { md: 280 }, mb: { xs: 0.5, md: 0 } }}>
                <Sidebar theme={theme}>
                  <Box sx={{ flexShrink: 0 }}>
                    <SectionHeader theme={theme}>Filters</SectionHeader>
                    <Box display="flex" flexDirection="column" gap={0.75} mb={1} sx={{ flexShrink: 0 }}>
                      <Box display="flex" gap={0.75}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Class</InputLabel>
                      <Select 
                        value={selectedClass} 
                        label="Class" 
                        onChange={e => setSelectedClass(e.target.value)}
                        sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                      >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                        {classes.map((c: any) => (
                          <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.75rem' }}>{c.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {selectedClass && getClassHasSections(selectedClass) && (
                      <FormControl size="small" sx={{ flex: 1 }}>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>Section</InputLabel>
                        <Select 
                          value={selectedSection} 
                          label="Section" 
                          onChange={e => setSelectedSection(e.target.value)}
                          sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                        >
                          <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                          {sections.filter(s => s.class_id === selectedClass).map((s: any) => (
                            <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.75rem' }}>{s.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                      </Box>
                      <Box display="flex" gap={0.75}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                          <InputLabel sx={{ fontSize: '0.75rem' }}>Session</InputLabel>
                          <Select 
                            value={selectedSession} 
                            label="Session" 
                            onChange={e => setSelectedSession(e.target.value)}
                            sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                          >
                            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                            {sessions.map((s: any) => (
                              <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.75rem' }}>{s.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box display="flex" gap={0.75}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                          <InputLabel sx={{ fontSize: '0.75rem' }}>Month</InputLabel>
                          <Select 
                            value={selectedMonth} 
                            label="Month" 
                            onChange={e => setSelectedMonth(e.target.value)}
                            sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                          >
                            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                            {months.map(m => (
                              <MenuItem key={m} value={m} sx={{ fontSize: '0.75rem' }}>{m}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                          <InputLabel sx={{ fontSize: '0.75rem' }}>Year</InputLabel>
                          <Select 
                            value={selectedYear} 
                            label="Year" 
                            onChange={e => setSelectedYear(e.target.value)}
                            sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                          >
                            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                              <MenuItem key={year} value={String(year)} sx={{ fontSize: '0.75rem' }}>{year}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <SectionHeader theme={theme}>Fee Heads</SectionHeader>
                    <Box sx={{ 
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      pr: 0.5,
                      scrollbarGutter: 'stable',
                      scrollbarWidth: 'auto',
                      scrollbarColor: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(74, 108, 247, 0.6) rgba(255, 255, 255, 0.1)' 
                        : 'rgba(74, 108, 247, 0.6) rgba(0, 0, 0, 0.1)',
                      '&::-webkit-scrollbar': { 
                        width: '10px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '5px',
                        margin: '2px 0',
                        border: muiTheme.palette.mode === 'dark'
                          ? '1px solid rgba(255, 255, 255, 0.05)'
                          : '1px solid rgba(0, 0, 0, 0.05)',
                      },
                      '&::-webkit-scrollbar-thumb': { 
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(74, 108, 247, 0.7)' 
                          : 'rgba(74, 108, 247, 0.7)',
                        borderRadius: '5px',
                        border: muiTheme.palette.mode === 'dark'
                          ? '2px solid rgba(255, 255, 255, 0.15)'
                          : '2px solid rgba(255, 255, 255, 0.9)',
                        minHeight: '30px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(74, 108, 247, 0.9)' 
                          : 'rgba(74, 108, 247, 0.9)',
                      },
                      '&::-webkit-scrollbar-thumb:active': {
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(74, 108, 247, 1)' 
                          : 'rgba(74, 108, 247, 1)',
                      }
                    }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        {getAvailableFeeHeads(Number(selectedClass), Number(selectedSection)).map((fh: any) => (
                          <FeeHeadPill
                            key={fh.id}
                            $selected={selectedFeeHeads.includes(fh.id)}
                            onClick={() => {
                              const newSelection = selectedFeeHeads.includes(fh.id)
                                ? selectedFeeHeads.filter(id => id !== fh.id)
                                : [...selectedFeeHeads, fh.id];
                              setSelectedFeeHeads(newSelection);
                            }}
                            sx={{ 
                              width: '100%', 
                              justifyContent: 'space-between', 
                              minHeight: 32,
                              padding: '6px 8px',
                              borderRadius: 4
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={0.75} sx={{ flex: 1, minWidth: 0 }}>
                              <FeeHeadIcon sx={{ width: 18, height: 18, fontSize: '0.8125rem' }}>
                                {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                                  fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                                  <AttachMoney fontSize="small" />}
                              </FeeHeadIcon>
                              <FeeHeadName sx={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {fh.name}
                              </FeeHeadName>
                            </Box>
                            <Box sx={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              color: 'primary.main',
                              flexShrink: 0,
                              ml: 1
                            }}>
                              Rs. {feeStructuresLoading ? '...' : getDefaultAmount(fh.id, Number(selectedClass))}
                            </Box>
                          </FeeHeadPill>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Sidebar>
              </Box>
              {/* Right: Main Card for Students/Results */}
              <Box sx={{ flex: { xs: 'unset', md: '1 1 0' }, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <MainCard theme={theme}>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0, mb: 1.5, pb: 1, borderBottom: `1px solid ${muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}` }}>
                  <SectionHeader theme={theme}>Students</SectionHeader>
                  {preview.length > 0 && selectedFeeHeads.length > 0 && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Button 
                        size="medium" 
                        variant="outlined"
                        onClick={selectAllStudents}
                        disabled={selectedStudents.length === preview.length}
                        sx={{ 
                          textTransform: 'none', 
                          fontSize: '0.8125rem', 
                          py: 1, 
                          px: 2,
                          minHeight: 36,
                          fontWeight: 600,
                          borderWidth: '2px',
                          boxShadow: muiTheme.palette.mode === 'dark' 
                            ? '0 2px 4px rgba(0, 0, 0, 0.2)' 
                            : '0 1px 3px rgba(0, 0, 0, 0.1)',
                          '&:hover': {
                            borderWidth: '2px',
                            boxShadow: muiTheme.palette.mode === 'dark' 
                              ? '0 4px 8px rgba(0, 0, 0, 0.3)' 
                              : '0 2px 6px rgba(0, 0, 0, 0.15)',
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Select All
                      </Button>
                      <Button 
                        size="medium" 
                        variant="outlined"
                        onClick={deselectAllStudents}
                        disabled={selectedStudents.length === 0}
                        sx={{ 
                          textTransform: 'none', 
                          fontSize: '0.8125rem', 
                          py: 1, 
                          px: 2,
                          minHeight: 36,
                          fontWeight: 600,
                          borderWidth: '2px',
                          boxShadow: muiTheme.palette.mode === 'dark' 
                            ? '0 2px 4px rgba(0, 0, 0, 0.2)' 
                            : '0 1px 3px rgba(0, 0, 0, 0.1)',
                          '&:hover': {
                            borderWidth: '2px',
                            boxShadow: muiTheme.palette.mode === 'dark' 
                              ? '0 4px 8px rgba(0, 0, 0, 0.3)' 
                              : '0 2px 6px rgba(0, 0, 0, 0.15)',
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Deselect All
                      </Button>
                    </Box>
                  )}
                </Box>
                {loading ? <Box display="flex" justifyContent="center" py={2} sx={{ flexShrink: 0 }}><CircularProgress size={20} /></Box> : (
                  preview.length > 0 && selectedFeeHeads.length > 0 ? (
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                      {/* Scrollable Student List */}
                      <ScrollableStudentList sx={{ flex: 1, minHeight: 0 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', boxSizing: 'border-box' }}>
                        {preview.map((stu, idx) => {
                          const isSelected = selectedStudents.includes(stu.id);
                          return (
                            <Box
                              key={stu.id}
                              sx={{
                                background: muiTheme.palette.mode === 'dark' 
                                  ? isSelected 
                                    ? 'rgba(74, 108, 247, 0.1)' 
                                    : 'rgba(40, 48, 80, 0.08)' 
                                  : isSelected 
                                    ? 'rgba(74, 108, 247, 0.06)' 
                                    : 'rgba(255, 255, 255, 0.95)',
                                borderRadius: 3,
                                boxShadow: 'none',
                                border: `1px solid ${isSelected ? muiTheme.palette.primary.main : (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')}`,
                                padding: '6px 8px',
                                gap: '6px',
                                fontSize: '0.75rem',
                                width: '100%',
                                transition: 'all 0.15s ease',
                                overflow: 'hidden',
                                '&:hover': {
                                  borderColor: muiTheme.palette.primary.main,
                                  background: muiTheme.palette.mode === 'dark'
                                    ? isSelected ? 'rgba(74, 108, 247, 0.15)' : 'rgba(74, 108, 247, 0.08)'
                                    : isSelected ? 'rgba(74, 108, 247, 0.1)' : 'rgba(74, 108, 247, 0.05)',
                                }
                              }}
                            >
                              {/* Main Row - Compact Layout */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  width: '100%',
                                }}
                              >
                                {/* S.No */}
                                <Box sx={{ 
                                  width: '1.5em', 
                                  minWidth: '1.5em', 
                                  textAlign: 'center', 
                                  fontSize: '0.7rem', 
                                  color: 'text.secondary', 
                                  fontWeight: 600 
                                }}>
                                  {idx + 1}
                                </Box>
                                
                                {/* Selection Checkbox */}
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleStudentSelection(stu.id, !isSelected);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  size="small"
                                  sx={{ 
                                    padding: '2px',
                                    '& .MuiSvgIcon-root': { fontSize: '1rem' }
                                  }}
                                />
                                
                                {/* Student Info - Compact */}
                                <Box sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  flex: 1,
                                  minWidth: 0,
                                  gap: '2px',
                                }}>
                                  <Typography sx={{
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    color: 'text.primary',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    lineHeight: 1.2,
                                  }}>
                                    <Box component="span" sx={{ opacity: 0.6, fontWeight: 500, fontSize: '0.7rem' }}>{getStudentDisplayId(stu)}</Box> - {stu.name}{stu.father_name ? (
                                      <> - <Box component="span" sx={{ opacity: 0.6, fontWeight: 500, fontSize: '0.7rem' }}>{stu.father_name}</Box></>
                                    ) : ''}
                                  </Typography>
                                  <Typography sx={{
                                    fontSize: '0.7rem',
                                    color: 'text.secondary',
                                    fontWeight: 400,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    lineHeight: 1.2,
                                  }}>
                                    {formatClassSectionDisplay(stu.class_id, stu.section_id)}
                                  </Typography>
                                </Box>

                                {/* Fee Amounts - Inline Compact */}
                                <Box 
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {selectedFeeHeads
                                    .filter(fhId => {
                                      // Filter out fee heads with 0 amount for this student
                                      const amount = amountGrid[stu.id]?.[fhId] ?? '';
                                      const finalAmount = calculateFinalAmount(stu.id, fhId, Number(stu.class_id), selectedSession, selectedMonth, selectedYear);
                                      const amountValue = parseFloat(finalAmount || amount || '0');
                                      return amountValue > 0;
                                    })
                                    .map(fhId => {
                                      const feeHead = feeHeads.find(fh => fh.id === fhId);
                                      return (
                                        <Box key={fhId} sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}>
                                          <Typography sx={{
                                            fontSize: '0.7rem',
                                            color: 'text.secondary',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                          }}>
                                            {feeHead?.name}:
                                          </Typography>
                                          <Box sx={{ minWidth: '70px' }}>
                                            {renderAmount(stu.id, fhId, amountGrid[stu.id]?.[fhId] ?? '')}
                                          </Box>
                                        </Box>
                                      );
                                    })}
                                </Box>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                      {existingFeeInvoiceItemsMap.size > 0 && (
                        <Box sx={{ mt: 1, p: 0.75, backgroundColor: alpha(muiTheme.palette.info.main, 0.08), borderRadius: 4 }}>
                          <Typography variant="caption" sx={{ color: 'info.dark', fontWeight: 500, fontSize: '0.7rem' }}>
                            Note: Some records exist and will be updated
                          </Typography>
                        </Box>
                      )}
                      </ScrollableStudentList>
                    </Box>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6}>
                      <Typography color="text.secondary" fontWeight={500} fontSize="1.1rem">No students to preview. Adjust your filters and try again.</Typography>
                    </Box>
                  )
                )}
              </MainCard>
              </Box>
            </Box>
          </Box>
        )}
        {tab === 1 && (
          !singleStudent ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={10}>
              <Person sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={3} sx={{ fontSize: { xs: '1rem', md: '1.25rem' }, fontWeight: 500 }}>
                Search for a student to begin
              </Typography>
              <Autocomplete
                options={students}
                loading={studentsLoading}
                getOptionLabel={(option: any) => `${option.name} (${getStudentDisplayId(option)})`}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) {
                    // Limit initial results to first 100 for performance
                    return options.slice(0, 100);
                  }
                  const searchLower = inputValue.toLowerCase();
                  const filtered = options.filter((s: any) => {
                    const nameMatch = s.name.toLowerCase().includes(searchLower);
                    const idMatch = matchesStudentSearch(s, inputValue);
                    return nameMatch || idMatch.matches;
                  });
                  // Limit filtered results to 200 for performance
                  return filtered.slice(0, 200);
                }}
                onChange={(_, value) => setSingleStudent(value || null)}
                onOpen={() => {
                  if (students.length === 0 && !studentsLoading) {
                    loadStudentsData();
                  }
                }}
                ListboxProps={{
                  style: { maxHeight: '400px' }
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
                          ID: {getStudentDisplayId(option)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          {formatClassSectionDisplay(option.class_id, option.section_id)}
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', gap: 0.5,
            '@media (max-width: 768px)': { overflow: 'visible', flex: 'none', minHeight: 'auto' }
          }}>
              <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={0.5} sx={{ flex: 1, minHeight: 0, overflow: 'hidden',
                '@media (max-width: 768px)': { overflow: 'visible', flex: 'none', minHeight: 'auto' }
              }}>
                {/* Column 1: Filters */}
                <Box sx={{
                    flex: { xs: 'unset', md: '0 0 240px' },
                    minWidth: { xs: '100%', md: 240 },
                    maxWidth: { xs: '100%', md: 280 },
                    mb: { xs: 0.5, md: 0 }
                }}>
                  <Sidebar theme={theme}>
                  <Autocomplete
                    options={students}
                    loading={studentsLoading}
                    getOptionLabel={(option: any) => `${option.name} (${getStudentDisplayId(option)})`}
                    filterOptions={(options, { inputValue }) => {
                      if (!inputValue) {
                        // Limit initial results to first 100 for performance
                        return options.slice(0, 100);
                      }
                      const searchLower = inputValue.toLowerCase();
                      const filtered = options.filter((s: any) => {
                        const nameMatch = s.name.toLowerCase().includes(searchLower);
                        const idMatch = matchesStudentSearch(s, inputValue);
                        return nameMatch || idMatch.matches;
                      });
                      // Limit filtered results to 200 for performance
                      return filtered.slice(0, 200);
                    }}
                    value={singleStudent ? students.find(s => s.id === singleStudent.id) : null}
                    onChange={(_, value) => setSingleStudent(value || null)}
                    onOpen={() => {
                      if (students.length === 0 && !studentsLoading) {
                        loadStudentsData();
                      }
                    }}
                    ListboxProps={{
                      style: { maxHeight: '400px' }
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
                              ID: {getStudentDisplayId(option)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                              {formatClassSectionDisplay(option.class_id, option.section_id)}
                            </Typography>
                          </Box>
                        </Box>
                      </li>
                    )}
                    sx={{ mb: 1, minWidth: { xs: '100%', md: 180 } }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                  />
                  <FormControl size="small" sx={{ mb: 0.75 }}>
                    <InputLabel sx={{ fontSize: '0.75rem' }}>Session</InputLabel>
                    <Select 
                      value={singleSession} 
                      label="Session" 
                      onChange={e => setSingleSession(e.target.value)}
                      sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                    >
                      <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                      {sessions.map((s: any) => (
                        <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.75rem' }}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={0.75} mb={0.75}>
                    <FormControl size="small" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Month</InputLabel>
                      <Select 
                        value={singleMonth} 
                        label="Month" 
                        onChange={e => setSingleMonth(e.target.value)}
                        sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                      >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                        {months.map(m => (
                          <MenuItem key={m} value={m} sx={{ fontSize: '0.75rem' }}>{m}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Year</InputLabel>
                      <Select 
                        value={singleYear} 
                        label="Year" 
                        onChange={e => setSingleYear(e.target.value)}
                        sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75 } }}
                      >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select</MenuItem>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <MenuItem key={year} value={String(year)} sx={{ fontSize: '0.75rem' }}>{year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <SectionHeader theme={theme}>Fee Heads</SectionHeader>
                    <Box sx={{ 
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      pr: 0.5,
                      scrollbarGutter: 'stable',
                      scrollbarWidth: 'auto',
                      scrollbarColor: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(74, 108, 247, 0.6) rgba(255, 255, 255, 0.1)' 
                        : 'rgba(74, 108, 247, 0.6) rgba(0, 0, 0, 0.1)',
                      '&::-webkit-scrollbar': { 
                        width: '10px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '5px',
                        margin: '2px 0',
                        border: muiTheme.palette.mode === 'dark'
                          ? '1px solid rgba(255, 255, 255, 0.05)'
                          : '1px solid rgba(0, 0, 0, 0.05)',
                      },
                      '&::-webkit-scrollbar-thumb': { 
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(74, 108, 247, 0.7)' 
                          : 'rgba(74, 108, 247, 0.7)',
                        borderRadius: '5px',
                        border: muiTheme.palette.mode === 'dark'
                          ? '2px solid rgba(255, 255, 255, 0.15)'
                          : '2px solid rgba(255, 255, 255, 0.9)',
                        minHeight: '30px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(74, 108, 247, 0.9)' 
                          : 'rgba(74, 108, 247, 0.9)',
                      },
                      '&::-webkit-scrollbar-thumb:active': {
                        background: muiTheme.palette.mode === 'dark' 
                          ? 'rgba(74, 108, 247, 1)' 
                          : 'rgba(74, 108, 247, 1)',
                      }
                    }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      {getAvailableFeeHeads(singleStudent ? Number(singleStudent.class_id) : undefined, singleStudent ? Number(singleStudent.section_id) : undefined).map((fh: any) => (
                        <FeeHeadPill
                          key={fh.id}
                          $selected={singleStudentSelectedFeeHeads.includes(fh.id)}
                          onClick={() => {
                            const newSelection = singleStudentSelectedFeeHeads.includes(fh.id)
                              ? singleStudentSelectedFeeHeads.filter(id => id !== fh.id)
                              : [...singleStudentSelectedFeeHeads, fh.id];
                            setSingleStudentSelectedFeeHeads(newSelection);
                          }}
                          sx={{ 
                            width: '100%', 
                            justifyContent: 'space-between', 
                            minHeight: 32,
                            padding: '6px 8px',
                            borderRadius: 4
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={0.75} sx={{ flex: 1, minWidth: 0 }}>
                            <FeeHeadIcon sx={{ width: 18, height: 18, fontSize: '0.8125rem' }}>
                              {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                                fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                                <AttachMoney fontSize="small" />}
                            </FeeHeadIcon>
                            <FeeHeadName sx={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {fh.name}
                            </FeeHeadName>
                          </Box>
                          <Box sx={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            color: 'primary.main',
                            flexShrink: 0,
                            ml: 1
                          }}>
                            Rs. {calculateFinalAmount(singleStudent.id, fh.id, Number(singleStudent.class_id), singleSession, singleMonth, singleYear)}
                          </Box>
                        </FeeHeadPill>
                      ))}
                      </Box>
                    </Box>
                  </Box>
                </Sidebar>
                </Box>
                
                {/* Column 2: Student List with Footer */}
                <Box sx={{ flex: { xs: 'unset', md: '1 1 0' }, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <MainCard theme={theme} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ flexShrink: 0, mb: 1 }}>
                    <SectionHeader theme={theme}>Selected Fee Heads</SectionHeader>
                  </Box>
                  
                  {/* Scrollable Fee Heads List */}
                  <ScrollableStudentList sx={{ flex: '0 1 auto', minHeight: 0, maxHeight: '320px', overflowY: 'auto', overflowX: 'hidden' }}>
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
                            background: muiTheme.palette.mode === 'dark' ? 'rgba(40,48,80,0.13)' : 'rgba(255,255,255,0.97)',
                            borderRadius: 2,
                            boxShadow: muiTheme.palette.mode === 'dark'
                              ? '0 4px 24px 0 #0005' 
                              : '0 4px 24px 0 #4a6cf71a',
                            border: `1px solid ${muiTheme.palette.mode === 'dark' ? '#333' : '#e0e7ef'}`,
                            padding: '0.8rem 1rem',
                            gap: '1rem',
                            fontSize: '0.93rem',
                            width: '100%',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                                boxShadow: muiTheme.palette.mode === 'dark'
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
                                background: muiTheme.palette.mode === 'dark' ? 'rgba(74,108,247,0.1)' : 'rgba(74,108,247,0.05)',
                                transform: 'scale(1.1)',
                              }
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                  </ScrollableStudentList>
                </MainCard>
                </Box>
              </Box>
            </Box>
          )
        )}
        {tab === 2 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', gap: 0.5,
            '@media (max-width: 768px)': { overflow: 'visible', flex: 'none', minHeight: 'auto' }
          }}>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={0.5} sx={{ flex: 1, minHeight: 0, overflow: 'hidden',
              '@media (max-width: 768px)': { overflow: 'visible', flex: 'none', minHeight: 'auto' }
            }}>
              {/* --- Column 1: Filters --- */}
              <Box sx={{ 
                flex: { xs: 'unset', md: '0 0 240px' }, 
                minWidth: { xs: '100%', md: 240 }, 
                maxWidth: { xs: '100%', md: 280 }
              }}>
                <Sidebar theme={theme}>
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
                          ID: {getStudentDisplayId(option)}
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
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <SectionHeader theme={theme}>Fee Heads</SectionHeader>
                  <Box sx={{ 
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    pr: 0.5,
                    scrollbarGutter: 'stable',
                    scrollbarWidth: 'auto',
                    scrollbarColor: muiTheme.palette.mode === 'dark' 
                      ? 'rgba(74, 108, 247, 0.6) rgba(255, 255, 255, 0.1)' 
                      : 'rgba(74, 108, 247, 0.6) rgba(0, 0, 0, 0.1)',
                    '&::-webkit-scrollbar': { 
                      width: '10px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(0, 0, 0, 0.1)',
                      borderRadius: '5px',
                      margin: '2px 0',
                      border: muiTheme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.05)'
                        : '1px solid rgba(0, 0, 0, 0.05)',
                    },
                    '&::-webkit-scrollbar-thumb': { 
                      background: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(74, 108, 247, 0.7)' 
                        : 'rgba(74, 108, 247, 0.7)',
                      borderRadius: '5px',
                      border: muiTheme.palette.mode === 'dark'
                        ? '2px solid rgba(255, 255, 255, 0.15)'
                        : '2px solid rgba(255, 255, 255, 0.9)',
                      minHeight: '30px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(74, 108, 247, 0.9)' 
                        : 'rgba(74, 108, 247, 0.9)',
                    },
                    '&::-webkit-scrollbar-thumb:active': {
                      background: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(74, 108, 247, 1)' 
                        : 'rgba(74, 108, 247, 1)',
                    }
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      {getAvailableFeeHeadsForFamily(selectedFamily).map((fh: any) => (
                        <FeeHeadPill
                          key={fh.id}
                          $selected={familyTabSelectedFeeHeads.includes(fh.id)}
                          onClick={() => {
                            const newSelection = familyTabSelectedFeeHeads.includes(fh.id)
                              ? familyTabSelectedFeeHeads.filter(id => id !== fh.id)
                              : [...familyTabSelectedFeeHeads, fh.id];
                            setFamilyTabSelectedFeeHeads(newSelection);
                          }}
                          sx={{ 
                            width: '100%', 
                            justifyContent: 'space-between', 
                            minHeight: 32,
                            padding: '6px 8px',
                            borderRadius: 4
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={0.75} sx={{ flex: 1, minWidth: 0 }}>
                            <FeeHeadIcon sx={{ width: 18, height: 18, fontSize: '0.8125rem' }}>
                              {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                               fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                               <AttachMoney fontSize="small" />}
                            </FeeHeadIcon>
                            <FeeHeadName sx={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {fh.name}
                            </FeeHeadName>
                          </Box>
                        </FeeHeadPill>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Sidebar>
              </Box>

              {/* --- Column 2 & 3 --- */}
              {selectedFamily && (
                <>
                  {/* --- Column 2: Linked Students --- */}
                  <Box sx={{ 
                    flex: { xs: 'unset', md: '0 0 200px' }, 
                    minWidth: { xs: '100%', md: 200 }, 
                    maxWidth: { xs: '100%', md: 240 },
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0
                  }}>
                    <Sidebar theme={theme} style={{ 
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                  }}>
                    <Box sx={{ flexShrink: 0, mb: 0.5 }}>
                      <SectionHeader theme={theme}>Linked Students</SectionHeader>
                    {/* Student Selection Controls */}
                      <Box display="flex" flexDirection={{ xs: 'row', md: 'column' }} gap={1} mb={2} mt={1} alignItems={{ xs: 'center', md: 'stretch' }}>
                      <Typography variant="body2" color="text.secondary" textAlign={{ xs: 'left', md: 'center' }} sx={{ 
                        fontSize: { xs: '0.8rem', md: '0.875rem' },
                        flex: { xs: 1, md: 'none' }
                      }}>
                        {selectedFamilyStudents.length} of {selectedFamily.family_members?.filter((member: any) => member.student).length || 0} selected
                      </Typography>
                      <Box display="flex" gap={0.75} justifyContent={{ xs: 'flex-end', md: 'center' }}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={selectAllFamilyStudents}
                          disabled={selectedFamilyStudents.length === (selectedFamily.family_members?.filter((member: any) => member.student).length || 0)}
                          sx={{ 
                            fontSize: '0.75rem',
                            py: 0.75,
                            px: 1.5,
                            minHeight: 32,
                            fontWeight: 500,
                            borderWidth: '1.5px',
                            '&:hover': {
                              borderWidth: '1.5px'
                            }
                          }}
                        >
                          Select All
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={deselectAllFamilyStudents}
                          disabled={selectedFamilyStudents.length === 0}
                          sx={{ 
                            fontSize: '0.75rem',
                            py: 0.75,
                            px: 1.5,
                            minHeight: 32,
                            fontWeight: 500,
                            borderWidth: '1.5px',
                            '&:hover': {
                              borderWidth: '1.5px'
                            }
                          }}
                        >
                          Deselect All
                        </Button>
                      </Box>
                    </Box>
                    </Box>
                     <ScrollableStudentList sx={{ 
                       flex: '0 1 auto', 
                       minHeight: 0, 
                       maxHeight: '320px', 
                       overflowY: 'auto', 
                       overflowX: 'hidden',
                       mt: 1
                     }}>
                      <Box display="flex" flexDirection="column" gap={2}>
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
                                  ? alpha(muiTheme.palette.primary.main, 0.1)
                                  : alpha(muiTheme.palette.primary.main, 0.05),
                              border: selectedFamilyStudents.includes(student.id) 
                                  ? `1px solid ${muiTheme.palette.primary.main}`
                                : '1px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                background: selectedFamilyStudents.includes(student.id)
                                    ? alpha(muiTheme.palette.primary.main, 0.15)
                                    : alpha(muiTheme.palette.primary.main, 0.08),
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
                                {formatClassSectionDisplay(student.class_id, student.section_id)}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                    </ScrollableStudentList>
                  </Sidebar>
                  </Box>
                  
                  {/* --- Column 3: Fee Table --- */}
                  <Box sx={{ flex: { xs: 'unset', md: '1 1 0' }, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <MainCard theme={theme} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                     <Box sx={{ flexShrink: 0, mb: 1 }}>
                       <SectionHeader theme={theme}>Fee Details</SectionHeader>
                     </Box>
                     {familyTabSelectedFeeHeads.length > 0 && selectedFamilyStudents.length > 0 ? (
                       <Box sx={{ 
                         flex: '0 1 auto', 
                         minHeight: 0, 
                         maxHeight: '320px', 
                         overflowY: 'auto', 
                         overflowX: 'auto',
                         mt: 2,
                         paddingRight: '8px',
                         scrollbarGutter: 'stable',
                         scrollbarWidth: 'auto',
                         scrollbarColor: `${muiTheme.palette.mode === 'dark' ? '#4a6cf7 #2a2a2a' : '#3b82f6 #e5e7eb'}`,
                         msOverflowStyle: 'scrollbar',
                         '&::-webkit-scrollbar': {
                           width: '12px',
                           height: '12px',
                         },
                         '&::-webkit-scrollbar-track': {
                           background: muiTheme.palette.mode === 'dark' ? 'rgba(42, 42, 42, 0.95)' : '#e5e7eb',
                           borderRadius: '6px',
                           margin: '2px 0',
                           border: muiTheme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                         },
                         '&::-webkit-scrollbar-thumb': {
                           background: muiTheme.palette.mode === 'dark'
                             ? 'linear-gradient(180deg, #5a7cf8 0%, #4a6cf7 100%)'
                             : 'linear-gradient(180deg, #4a6cf7 0%, #3b82f6 100%)',
                           borderRadius: '6px',
                           border: muiTheme.palette.mode === 'dark'
                             ? '2px solid rgba(255, 255, 255, 0.15)'
                             : '2px solid rgba(255, 255, 255, 0.8)',
                           boxShadow: muiTheme.palette.mode === 'dark'
                             ? 'inset 0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.3)'
                             : 'inset 0 0 0 1px rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.15)',
                           transition: 'all 0.2s ease',
                           minHeight: '40px',
                           minWidth: '40px',
                         },
                         '&::-webkit-scrollbar-thumb:hover': {
                           background: muiTheme.palette.mode === 'dark'
                             ? 'linear-gradient(180deg, #6b8cff 0%, #5a7cf8 100%)'
                             : 'linear-gradient(180deg, #5a7cf8 0%, #4b92f7 100%)',
                           boxShadow: muiTheme.palette.mode === 'dark'
                             ? 'inset 0 0 0 1px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.4)'
                             : 'inset 0 0 0 1px rgba(255,255,255,0.9), 0 4px 10px rgba(0,0,0,0.2)',
                         },
                         '&::-webkit-scrollbar-thumb:active': {
                           background: muiTheme.palette.mode === 'dark'
                             ? 'linear-gradient(180deg, #3a5ce6 0%, #2a82e6 100%)'
                             : 'linear-gradient(180deg, #3a5ce6 0%, #2a82e6 100%)',
                         },
                         '&::-webkit-scrollbar-corner': {
                           background: muiTheme.palette.mode === 'dark' ? 'rgba(42, 42, 42, 0.95)' : '#e5e7eb',
                         },
                       }}>
                         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                           <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
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
                                     <tr key={`${stu.id}-${fh.id}`} style={{ borderBottom: '1px solid ' + alpha(muiTheme.palette.divider, 0.1) }}>
                                      {index === 0 && (
                                         <td rowSpan={applicableHeads.length} style={{ padding: '8px 12px', fontWeight: 600, verticalAlign: 'top', borderRight: '1px solid ' + alpha(muiTheme.palette.divider, 0.1) }}>
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
                        <Box display="flex" alignItems="center" justifyContent="center" height="100%" minHeight={200} sx={{ flex: 1 }}>
                          <Typography color="text.secondary">
                            {selectedFamilyStudents.length === 0 ? 'Select students to see fee details.' : 'Select fee heads to see details.'}
                          </Typography>
                        </Box>
                     )}
                  </MainCard>
              </Box>
                </>
              )}
            </Box>
            {!selectedFamily && (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={400}>
                <FamilyRestroom sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography color="text.secondary" sx={{ fontSize: '1.125rem', fontWeight: 500 }}>Select a family to begin</Typography>
              </Box>
            )}
          </Box>
        )}
      </ContentCard>
      </MainContent>
    </PageContainer>

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
            backgroundColor: alpha(muiTheme.palette.warning.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(muiTheme.palette.warning.main, 0.2)}`,
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
            backgroundColor: alpha(muiTheme.palette.warning.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(muiTheme.palette.warning.main, 0.2)}`,
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
            backgroundColor: alpha(muiTheme.palette.primary.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(muiTheme.palette.primary.main, 0.2)}`,
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
            backgroundColor: alpha(muiTheme.palette.primary.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(muiTheme.palette.primary.main, 0.2)}`,
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
            backgroundColor: alpha(muiTheme.palette.primary.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(muiTheme.palette.primary.main, 0.2)}`,
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Student:</strong> {singleStudent?.name || 'N/A'} (ID: {singleStudent ? getStudentDisplayId(students.find(s => s.id === singleStudent.id) || singleStudent) : 'N/A'})
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
    </>
  );
} 