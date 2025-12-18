import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../components/Layout';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { useLoading } from '../../../../contexts/LoadingContext';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  Payment,
  AccountBalance,
  TrendingUp,
  Close as CloseIcon,
  CheckCircle,
  AttachMoney,
  AccountCircle,
} from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import {
  Box,
  Button as MuiButton,
  Dialog,
  DialogContent,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
  styled as muiStyled,
  Theme,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { format } from 'date-fns';
import Loader from '../../../../components/Loader';
import { liabilitiesService } from '../../services/liabilitiesService';
import { Liability, LiabilityCategory, LiabilityFilters, LiabilityPayment, PaymentMethod, PaymentFrequency, LiabilityStatus } from '../../../../types/liability';
import { supabase } from '../../../../supabaseClient';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// Reuse styled components from AssetsTab (same styling pattern)
const TabContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.05)'};
    transform: translateY(-1px);
  }
  
  &.primary {
    background: ${({ theme }) => theme.ACCENT};
    color: white;
    border: none;
    
    &:hover {
      opacity: 0.9;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.75rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin-bottom: 0.5rem;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
  padding: 0.5rem;
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.8)'};
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
`;

const StyledSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  
  & option {
    background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#ffffff'};
    color: ${({ theme }) => isDark(theme) ? '#e2e8f0' : '#1e293b'};
  }
`;

const ContentCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  flex-shrink: 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
`;

const TableRow = styled.tr`
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.02)'};
  }
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $status }) => {
    switch ($status) {
      case 'active': return '#f59e0b20';
      case 'paid_off': return '#10b98120';
      case 'defaulted': return '#ef444420';
      case 'restructured': return '#6366f120';
      default: return 'rgba(0, 0, 0, 0.1)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'active': return '#f59e0b';
      case 'paid_off': return '#10b981';
      case 'defaulted': return '#ef4444';
      case 'restructured': return '#6366f1';
      default: return '#6b7280';
    }
  }};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin-top: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    text-align: center;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ $disabled, theme }) => $disabled
    ? isDark(theme)
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(0, 0, 0, 0.02)'
    : isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ $disabled, theme }) => $disabled
    ? theme.TEXT_SECONDARY
    : theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.05)'};
  }
  
  &:disabled {
    cursor: not-allowed;
  }
`;

const PageInput = styled.input`
  width: 50px;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  text-align: center;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const ItemsPerPageSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

// Old styled components for category manager and other dialogs
const OldDialog = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const OldDialogContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const DialogTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const DialogActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        &:hover { opacity: 0.9; }
      `;
    }
    if ($variant === 'danger') {
      return `
        background: #ef4444;
        color: white;
        &:hover { opacity: 0.9; }
      `;
    }
    return `
      background: ${isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
      color: ${theme.TEXT_PRIMARY};
      &:hover { background: ${isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}; }
    `;
  }}
`;

// Material-UI Styled Dialog Components (matching CreateStudentReportForm)
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

const DialogHeaderStyled = muiStyled(Box)(({ theme }) => ({
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

const FormActionsStyled = muiStyled(Box)(({ theme }) => ({
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

// ===== MAIN COMPONENT =====

const LiabilitiesTab: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [categories, setCategories] = useState<LiabilityCategory[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<LiabilityFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [selectedLiability, setSelectedLiability] = useState<Liability | null>(null);
  const [showPayments, setShowPayments] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payments, setPayments] = useState<LiabilityPayment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    categoryId: string;
    description: string;
    principalAmount: string;
    currentBalance: string;
    hasInterest: boolean;
    interestRate: string;
    startDate: string;
    dueDate: string;
    paymentFrequency: PaymentFrequency;
    paymentAmount: string;
    lenderName: string;
    accountNumber: string;
    referenceNumber: string;
    status: LiabilityStatus;
    notes: string;
  }>({
    name: '',
    categoryId: '',
    description: '',
    principalAmount: '',
    currentBalance: '',
    hasInterest: false,
    interestRate: '',
    startDate: '',
    dueDate: '',
    paymentFrequency: 'monthly',
    paymentAmount: '',
    lenderName: '',
    accountNumber: '',
    referenceNumber: '',
    status: 'active',
    notes: '',
  });

  // Payment form state
  const [paymentFormData, setPaymentFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: '',
    principalPaid: '',
    interestPaid: '',
    paymentMethod: 'Cash', // Use 'Cash' as default (same as ExpenseManager)
    accountId: '',
    referenceNumber: '',
    notes: '',
  });
  const [paidWithCheque, setPaidWithCheque] = useState(false);
  const [chequeNumber, setChequeNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchLiabilities = useCallback(async () => {
    if (!user?.school_id) return;
    
    setIsLoading(true);
    try {
      const liabilitiesData = await liabilitiesService.getLiabilities(user.school_id, filters);
      setLiabilities(liabilitiesData);
    } catch (error: any) {
      console.error('Error fetching liabilities:', error);
      showToast('Failed to fetch liabilities', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.school_id, filters, showToast]);

  const fetchCategories = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      const categoriesData = await liabilitiesService.getLiabilityCategories(user.school_id);
      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      showToast('Failed to fetch categories', 'error');
    }
  }, [user?.school_id, showToast]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      // Fetch both accounts and account types (same as ExpenseManager)
      const [accountsData, accountTypesData] = await Promise.all([
        supabase
        .from('accounts')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
          .order('name'),
        supabase
          .from('account_types')
          .select('*')
          .or(`school_id.eq.1,school_id.eq.${user.school_id}`)
          .eq('is_active', true)
          .order('display_name')
      ]);
      
      if (accountsData.error) throw accountsData.error;
      if (accountTypesData.error) throw accountTypesData.error;
      
      setAccounts(accountsData.data || []);
      
      // Deduplicate account types (prefer system types) - same as ExpenseManager
      if (accountTypesData.data) {
        const uniqueTypes = new Map();
        accountTypesData.data.forEach((type: any) => {
          if (!uniqueTypes.has(type.name) || type.school_id === 1) {
            uniqueTypes.set(type.name, type);
          }
        });
        setAccountTypes(Array.from(uniqueTypes.values()));
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
    }
  }, [user?.school_id]);

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
  }, [fetchCategories, fetchAccounts]);

  useEffect(() => {
    fetchLiabilities();
  }, [fetchLiabilities]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  // Helper function to get icon component from account type (same as ExpenseManager)
  const getAccountTypeIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || AccountCircle;
    return React.createElement(IconComponent);
  };

  // Get account type label (same as ExpenseManager)
  const getAccountTypeLabel = (account: any) => {
    const accountType = accountTypes.find(t => t.name === account.type);
    return accountType?.display_name || account.type;
  };

  // Get payment method options (Cash + Accounts) - same as ExpenseManager
  const paymentMethodOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; isAccount: boolean; accountId?: number; icon?: React.ReactElement }> = [
      { value: 'Cash', label: 'Cash', isAccount: false, icon: React.createElement(AttachMoney) }
    ];

    // Add accounts as payment options
    accounts.forEach(account => {
      const accountType = accountTypes.find(t => t.name === account.type);
      const displayName = accountType?.display_name || account.name;
      options.push({
        value: `account_${account.id}`,
        label: `${displayName} - ${account.name}`,
        isAccount: true,
        accountId: account.id,
        icon: accountType ? getAccountTypeIcon(accountType.icon_name) : undefined
      });
    });

    return options;
  }, [accounts, accountTypes]);

  const handleAdd = () => {
    setEditingLiability(null);
    setFormData({
      name: '',
      categoryId: '',
      description: '',
      principalAmount: '',
      currentBalance: '',
      hasInterest: false,
      interestRate: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentFrequency: 'monthly',
      paymentAmount: '',
      lenderName: '',
      accountNumber: '',
      referenceNumber: '',
      status: 'active',
      notes: '',
    });
    setShowForm(true);
  };

  const handleEdit = (liability: Liability) => {
    setEditingLiability(liability);
    setFormData({
      name: liability.name,
      categoryId: String(liability.categoryId),
      description: liability.description || '',
      principalAmount: String(liability.principalAmount),
      currentBalance: String(liability.currentBalance),
      hasInterest: liability.interestRate !== null && liability.interestRate !== undefined,
      interestRate: liability.interestRate ? String(liability.interestRate) : '',
      startDate: liability.startDate,
      dueDate: liability.dueDate || '',
      paymentFrequency: liability.paymentFrequency,
      paymentAmount: liability.paymentAmount ? String(liability.paymentAmount) : '',
      lenderName: liability.lenderName || '',
      accountNumber: liability.accountNumber || '',
      referenceNumber: liability.referenceNumber || '',
      status: liability.status,
      notes: liability.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (liability: Liability) => {
    if (!user?.school_id) return;
    if (!window.confirm(`Are you sure you want to delete "${liability.name}"?`)) return;
    
    setLoading(true);
    try {
      await liabilitiesService.deleteLiability(liability.id, user.school_id);
      showToast('Liability deleted successfully', 'success');
      fetchLiabilities();
    } catch (error: any) {
      console.error('Error deleting liability:', error);
      showToast(error.message || 'Failed to delete liability', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) return;
    
    setSaving(true);
    setLoading(true);
    try {
      const liabilityData = {
        schoolId: user.school_id,
        categoryId: parseInt(formData.categoryId),
        name: formData.name,
        description: formData.description || undefined,
        principalAmount: parseFloat(formData.principalAmount),
        currentBalance: formData.currentBalance ? parseFloat(formData.currentBalance) : parseFloat(formData.principalAmount),
        interestRate: formData.hasInterest && formData.interestRate ? parseFloat(formData.interestRate) : null, // NULL if interest not enabled
        startDate: formData.startDate,
        dueDate: formData.dueDate || undefined,
        paymentFrequency: formData.paymentFrequency,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : undefined,
        lenderName: formData.lenderName || undefined,
        accountNumber: formData.accountNumber || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        createdBy: user.id,
      };

      if (editingLiability) {
        await liabilitiesService.updateLiability(editingLiability.id, user.school_id, liabilityData);
        showToast('Liability updated successfully', 'success');
      } else {
        await liabilitiesService.createLiability(liabilityData);
        showToast('Liability created successfully', 'success');
      }
      
      setShowForm(false);
      fetchLiabilities();
    } catch (error: any) {
      console.error('Error saving liability:', error);
      showToast(error.message || 'Failed to save liability', 'error');
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const handleViewPayments = async (liability: Liability) => {
    if (!user?.school_id) return;
    
    setSelectedLiability(liability);
    setLoading(true);
    try {
      const paymentsData = await liabilitiesService.getLiabilityPayments(liability.id, user.school_id);
      setPayments(paymentsData);
      setShowPayments(true);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      showToast('Failed to fetch payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    if (!selectedLiability) return;
    
    setPaymentFormData({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentAmount: String(selectedLiability.currentBalance > 0 ? Math.min(selectedLiability.currentBalance, selectedLiability.paymentAmount || selectedLiability.currentBalance) : 0),
      principalPaid: '',
      interestPaid: '',
      paymentMethod: 'Cash', // Use 'Cash' as default (same as ExpenseManager)
      accountId: '',
      referenceNumber: '',
      notes: '',
    });
    setPaidWithCheque(false);
    setChequeNumber('');
    setTransactionId('');
    setShowPaymentForm(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id || !selectedLiability) return;
    
    setSaving(true);
    setLoading(true);
    try {
      const paymentAmount = parseFloat(paymentFormData.paymentAmount);
      // Let the service calculate principal/interest split based on liability's interest rate
      const principalPaid = paymentFormData.principalPaid ? parseFloat(paymentFormData.principalPaid) : paymentAmount;
      const interestPaid = paymentFormData.interestPaid ? parseFloat(paymentFormData.interestPaid) : null;

      // Validate cheque payment
      if (paidWithCheque) {
        if (!paymentFormData.accountId || !paymentFormData.paymentMethod.startsWith('account_')) {
          showToast('Please select an account for cheque payment', 'error');
          setSaving(false);
          setLoading(false);
          return;
        }
        if (!chequeNumber || !chequeNumber.trim()) {
          showToast('Please enter cheque number', 'error');
          setSaving(false);
          setLoading(false);
          return;
        }
        // Verify account has chequebook
        const accountId = parseInt(paymentFormData.paymentMethod.replace('account_', ''));
        const account = accounts.find(a => a.id === accountId);
        if (!account?.has_chequebook) {
          showToast('Selected account does not have chequebook facility', 'error');
          setSaving(false);
          setLoading(false);
          return;
        }
      }

      // Handle payment method and account selection (same as ExpenseManager)
      let paymentMethod = paymentFormData.paymentMethod;
      let accountId: number | undefined = undefined;

      // If payment method starts with 'account_', extract account ID and set payment_method to 'account'
      if (paymentFormData.paymentMethod.startsWith('account_')) {
        accountId = parseInt(paymentFormData.paymentMethod.replace('account_', ''));
        // Store 'account' as payment method for database constraint
        paymentMethod = 'account';
      } else if (paymentFormData.paymentMethod === 'Cash') {
        paymentMethod = 'cash';
      }

      const paymentData = {
        schoolId: user.school_id,
        liabilityId: selectedLiability.id,
        paymentDate: paymentFormData.paymentDate,
        paymentAmount,
        principalPaid,
        interestPaid,
        paymentMethod: paymentMethod as PaymentMethod,
        accountId: accountId,
        chequeNumber: paidWithCheque ? chequeNumber.trim() : undefined,
        transactionId: !paidWithCheque && paymentFormData.paymentMethod.startsWith('account_') ? transactionId.trim() : undefined,
        referenceNumber: paymentFormData.referenceNumber || undefined,
        notes: paymentFormData.notes || undefined,
        createdBy: user.id,
      };

      await liabilitiesService.createLiabilityPayment(paymentData, selectedLiability);
      showToast('Payment recorded successfully', 'success');
      setShowPaymentForm(false);
      handleViewPayments(selectedLiability); // Refresh payments
      fetchLiabilities(); // Refresh liabilities to update balances
    } catch (error: any) {
      console.error('Error saving payment:', error);
      showToast(error.message || 'Failed to save payment', 'error');
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const totalLiabilities = liabilities.length;
    const totalPrincipal = liabilities.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalCurrentBalance = liabilities.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalPaid = totalPrincipal - totalCurrentBalance;
    
    return { totalLiabilities, totalPrincipal, totalCurrentBalance, totalPaid };
  }, [liabilities]);

  const filteredLiabilities = useMemo(() => {
    let filtered = liabilities.filter(liability => {
      if (filters.categoryId && liability.categoryId !== filters.categoryId) return false;
      if (filters.status && liability.status !== filters.status) return false;
      if (filters.hasInterest !== undefined) {
        const hasInterest = liability.interestRate !== null && liability.interestRate !== undefined;
        if (filters.hasInterest !== hasInterest) return false;
      }
      if (searchQuery && !liability.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !liability.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !liability.lenderName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    return filtered;
  }, [liabilities, filters, searchQuery]);

  const paginatedLiabilities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLiabilities.slice(startIndex, endIndex);
  }, [filteredLiabilities, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLiabilities.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <TabContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <TrendingUp />
          Liabilities Management
        </HeaderTitle>
        <HeaderActions theme={theme}>
          <ActionButton theme={theme} onClick={() => setShowCategories(true)}>
            <CategoryIcon style={{ fontSize: '1rem' }} />
            Categories
          </ActionButton>
          <ActionButton theme={theme} onClick={fetchLiabilities}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </ActionButton>
          <ActionButton theme={theme} className="primary" onClick={handleAdd}>
            <AddIcon style={{ fontSize: '1rem' }} />
            Add Liability
          </ActionButton>
        </HeaderActions>
      </Header>

      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Liabilities</StatLabel>
          <StatValue theme={theme}>{summary.totalLiabilities}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Principal</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summary.totalPrincipal)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Current Balance</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summary.totalCurrentBalance)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Paid</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summary.totalPaid)}</StatValue>
        </StatCard>
      </StatsGrid>

      <FiltersContainer theme={theme}>
        <SearchBar theme={theme}>
          <SearchIcon style={{ fontSize: '1rem', color: theme.TEXT_SECONDARY }} />
          <SearchInput
            theme={theme}
            type="text"
            placeholder="Search liabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBar>
        <StyledSelect
          theme={theme}
          value={filters.categoryId || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value ? parseInt(e.target.value) : undefined }))}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </StyledSelect>
        <StyledSelect
          theme={theme}
          value={filters.status || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any || undefined }))}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paid_off">Paid Off</option>
          <option value="defaulted">Defaulted</option>
          <option value="restructured">Restructured</option>
        </StyledSelect>
        <StyledSelect
          theme={theme}
          value={filters.hasInterest === undefined ? '' : filters.hasInterest ? 'yes' : 'no'}
          onChange={(e) => setFilters(prev => ({ 
            ...prev, 
            hasInterest: e.target.value === '' ? undefined : e.target.value === 'yes' 
          }))}
        >
          <option value="">All Types</option>
          <option value="yes">With Interest</option>
          <option value="no">Without Interest</option>
        </StyledSelect>
      </FiltersContainer>

      <ContentCard theme={theme}>
        {filteredLiabilities.length === 0 ? (
          <EmptyState theme={theme}>
            <TrendingUp style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <div>No liabilities found</div>
            <Button theme={theme} $variant="primary" onClick={handleAdd} style={{ marginTop: '1rem' }}>
              <AddIcon style={{ fontSize: '1rem', marginRight: '0.5rem' }} />
              Add First Liability
            </Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHead theme={theme}>
              <TableRow theme={theme}>
                <TableHeaderCell theme={theme}>Name</TableHeaderCell>
                <TableHeaderCell theme={theme}>Category</TableHeaderCell>
                <TableHeaderCell theme={theme}>Principal</TableHeaderCell>
                <TableHeaderCell theme={theme}>Current Balance</TableHeaderCell>
                <TableHeaderCell theme={theme}>Interest Rate</TableHeaderCell>
                <TableHeaderCell theme={theme}>Due Date</TableHeaderCell>
                <TableHeaderCell theme={theme}>Status</TableHeaderCell>
                <TableHeaderCell theme={theme}>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <tbody>
              {paginatedLiabilities.map(liability => (
                <TableRow key={liability.id} theme={theme}>
                  <TableCell theme={theme}>
                    <div style={{ fontWeight: 600 }}>{liability.name}</div>
                    {liability.lenderName && (
                      <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                        Lender: {liability.lenderName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell theme={theme}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: liability.category?.color || '#ef4444',
                        }}
                      />
                      {liability.category?.name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell theme={theme}>{formatCurrency(liability.principalAmount)}</TableCell>
                  <TableCell theme={theme}>
                    <div style={{ fontWeight: 600, color: liability.currentBalance > 0 ? '#ef4444' : '#10b981' }}>
                      {formatCurrency(liability.currentBalance)}
                    </div>
                  </TableCell>
                  <TableCell theme={theme}>
                    {liability.interestRate ? `${liability.interestRate}%` : '-'}
                  </TableCell>
                  <TableCell theme={theme}>
                    {liability.dueDate ? format(new Date(liability.dueDate), 'dd MMM yyyy') : '-'}
                  </TableCell>
                  <TableCell theme={theme}>
                    <StatusBadge $status={liability.status}>
                      {liability.status.replace('_', ' ').toUpperCase()}
                    </StatusBadge>
                  </TableCell>
                  <TableCell theme={theme}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <ActionButton
                        theme={theme}
                        onClick={() => handleViewPayments(liability)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <Payment style={{ fontSize: '0.875rem' }} />
                      </ActionButton>
                      <ActionButton
                        theme={theme}
                        onClick={() => handleEdit(liability)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <EditIcon style={{ fontSize: '0.875rem' }} />
                      </ActionButton>
                      <ActionButton
                        theme={theme}
                        onClick={() => handleDelete(liability)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#ef4444' }}
                      >
                        <DeleteIcon style={{ fontSize: '0.875rem' }} />
                      </ActionButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>

      {filteredLiabilities.length > 0 && (
        <PaginationContainer theme={theme}>
          <PaginationInfo theme={theme}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLiabilities.length)} of {filteredLiabilities.length} liabilities
          </PaginationInfo>
          <PaginationControls>
            <ItemsPerPageSelect
              theme={theme}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </ItemsPerPageSelect>
            <PaginationButton
              theme={theme}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              $disabled={currentPage === 1}
            >
              ««
            </PaginationButton>
            <PaginationButton
              theme={theme}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              $disabled={currentPage === 1}
            >
              ‹
            </PaginationButton>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>Page</span>
              <PageInput
                theme={theme}
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  }
                }}
                onBlur={(e) => {
                  const page = parseInt(e.target.value);
                  if (isNaN(page) || page < 1) {
                    setCurrentPage(1);
                  } else if (page > totalPages) {
                    setCurrentPage(totalPages);
                  }
                }}
              />
              <span style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>of {totalPages}</span>
            </div>
            <PaginationButton
              theme={theme}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              $disabled={currentPage === totalPages}
            >
              ›
            </PaginationButton>
            <PaginationButton
              theme={theme}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              $disabled={currentPage === totalPages}
            >
              »»
            </PaginationButton>
          </PaginationControls>
        </PaginationContainer>
      )}

      {/* Liability Form Dialog */}
      <StyledDialog
        open={showForm}
        onClose={() => setShowForm(false)}
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
        <DialogHeaderStyled>
          <DialogTitleStyled>
            {editingLiability ? 'Edit Liability' : 'Add New Liability'}
          </DialogTitleStyled>
          <IconButton onClick={() => setShowForm(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeaderStyled>

        <StyledDialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Liability Name"
                  required
                  fullWidth
                  size="small"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.categoryId ? formData.categoryId.toString() : ''}
                    label="Category"
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    required
                    MenuProps={selectMenuProps}
                  >
                    <MenuItem value="">Select Category</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Principal Amount"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  required
                  fullWidth
                  size="small"
                  value={formData.principalAmount}
                  onChange={(e) => {
                    const principal = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      principalAmount: principal,
                      currentBalance: prev.currentBalance || principal
                    }));
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Current Balance"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  required
                  fullWidth
                  size="small"
                  value={formData.currentBalance}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentBalance: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.hasInterest}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        hasInterest: e.target.checked,
                        interestRate: e.target.checked ? prev.interestRate : ''
                      }))}
                    />
                  }
                  label="Apply Interest"
                />
              </Grid>

              {formData.hasInterest && (
                <Grid item xs={12}>
                  <TextField
                    label="Interest Rate (Annual %)"
                    type="number"
                    inputProps={{ step: '0.01' }}
                    required={formData.hasInterest}
                    fullWidth
                    size="small"
                    value={formData.interestRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  required
                  fullWidth
                  size="small"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Frequency</InputLabel>
                  <Select
                    value={formData.paymentFrequency}
                    label="Payment Frequency"
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentFrequency: e.target.value as PaymentFrequency }))}
                    required
                    MenuProps={selectMenuProps}
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="annually">Annually</MenuItem>
                    <MenuItem value="one-time">One-time</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Payment Amount"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  fullWidth
                  size="small"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Lender Name"
                  fullWidth
                  size="small"
                  value={formData.lenderName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lenderName: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Account Number"
                  fullWidth
                  size="small"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Reference Number"
                  fullWidth
                  size="small"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as LiabilityStatus }))}
                    required
                    MenuProps={selectMenuProps}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="paid_off">Paid Off</MenuItem>
                    <MenuItem value="defaulted">Defaulted</MenuItem>
                    <MenuItem value="restructured">Restructured</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </form>
        </StyledDialogContent>

        <FormActionsStyled>
          <MuiButton 
            onClick={() => setShowForm(false)}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
            variant="contained"
            size="small"
            disabled={saving}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {saving ? (editingLiability ? 'Updating...' : 'Creating...') : (editingLiability ? 'Update Liability' : 'Create Liability')}
          </MuiButton>
        </FormActionsStyled>
      </StyledDialog>

      {/* Payment History Dialog */}
      <OldDialog theme={theme} $open={showPayments}>
        <OldDialogContent theme={theme} style={{ maxWidth: '800px' }}>
          <DialogHeader>
            <DialogTitle theme={theme}>
              Payment History - {selectedLiability?.name}
            </DialogTitle>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedLiability && selectedLiability.currentBalance > 0 && (
                <Button theme={theme} $variant="primary" onClick={handleAddPayment}>
                  <AddIcon style={{ fontSize: '1rem', marginRight: '0.25rem' }} />
                  Add Payment
                </Button>
              )}
              <Button theme={theme} onClick={() => {
                setShowPayments(false);
                setSelectedLiability(null);
              }}>
                <CloseIcon />
              </Button>
            </div>
          </DialogHeader>
          {selectedLiability && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>Principal</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{formatCurrency(selectedLiability.principalAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>Current Balance</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: selectedLiability.currentBalance > 0 ? '#ef4444' : '#10b981' }}>
                    {formatCurrency(selectedLiability.currentBalance)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>Paid</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#10b981' }}>
                    {formatCurrency(selectedLiability.principalAmount - selectedLiability.currentBalance)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {payments.length === 0 ? (
            <EmptyState theme={theme}>
              <Payment style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
              <div>No payment records found</div>
              {selectedLiability && selectedLiability.currentBalance > 0 && (
                <Button theme={theme} $variant="primary" onClick={handleAddPayment} style={{ marginTop: '1rem' }}>
                  <AddIcon style={{ fontSize: '1rem', marginRight: '0.5rem' }} />
                  Record First Payment
                </Button>
              )}
            </EmptyState>
          ) : (
            <Table>
              <TableHead theme={theme}>
                <TableRow theme={theme}>
                  <TableHeaderCell theme={theme}>Date</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Payment Amount</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Principal Paid</TableHeaderCell>
                  {selectedLiability?.interestRate && (
                    <TableHeaderCell theme={theme}>Interest Paid</TableHeaderCell>
                  )}
                  <TableHeaderCell theme={theme}>Method</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {payments.map(payment => (
                  <TableRow key={payment.id} theme={theme}>
                    <TableCell theme={theme}>
                      {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell theme={theme} style={{ fontWeight: 600 }}>
                      {formatCurrency(payment.paymentAmount)}
                    </TableCell>
                    <TableCell theme={theme}>{formatCurrency(payment.principalPaid)}</TableCell>
                    {selectedLiability?.interestRate && (
                      <TableCell theme={theme}>
                        {payment.interestPaid ? formatCurrency(payment.interestPaid) : '-'}
                      </TableCell>
                    )}
                    <TableCell theme={theme}>{payment.paymentMethod.replace('_', ' ')}</TableCell>
                    <TableCell theme={theme}>
                      <Button
                        theme={theme}
                        $variant="danger"
                        onClick={async () => {
                          if (!window.confirm('Delete this payment?')) return;
                          if (!user?.school_id || !selectedLiability) return;
                          setLoading(true);
                          try {
                            await liabilitiesService.deleteLiabilityPayment(payment.id, user.school_id, selectedLiability.id);
                            showToast('Payment deleted successfully', 'success');
                            handleViewPayments(selectedLiability);
                            fetchLiabilities();
                          } catch (error: any) {
                            showToast(error.message || 'Failed to delete payment', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <DeleteIcon style={{ fontSize: '0.875rem' }} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </OldDialogContent>
      </OldDialog>

      {/* Payment Form Dialog */}
      <StyledDialog
        open={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
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
        <DialogHeaderStyled>
          <DialogTitleStyled>Record Payment</DialogTitleStyled>
          <IconButton onClick={() => setShowPaymentForm(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeaderStyled>

        <StyledDialogContent>
          <form onSubmit={handleSubmitPayment}>
            {selectedLiability && (
              <>
                <Box sx={{ mb: 2, p: 2, background: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderRadius: '8px' }}>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                    Current Balance: <strong style={{ color: muiTheme.palette.text.primary }}>{formatCurrency(selectedLiability.currentBalance)}</strong>
                  </Typography>
                  {selectedLiability.interestRate && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Interest Rate: {selectedLiability.interestRate}% (Annual)
                    </Typography>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Payment Date"
                      type="date"
                      required
                      fullWidth
                      size="small"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Payment Amount"
                      type="number"
                      inputProps={{ step: '0.01' }}
                      required
                      fullWidth
                      size="small"
                      value={paymentFormData.paymentAmount}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0;
                        setPaymentFormData(prev => {
                          let principalPaid = amount;
                          let interestPaid: number | null = null;

                          if (selectedLiability.interestRate) {
                            const monthlyInterestRate = selectedLiability.interestRate / 12 / 100;
                            const interestAmount = selectedLiability.currentBalance * monthlyInterestRate;
                            interestPaid = Math.min(interestAmount, amount * 0.2);
                            principalPaid = amount - interestPaid;
                          }

                          return {
                            ...prev,
                            paymentAmount: e.target.value,
                            principalPaid: String(principalPaid),
                            interestPaid: interestPaid ? String(interestPaid) : '',
                          };
                        });
                      }}
                    />
                  </Grid>

                  {selectedLiability.interestRate && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Principal Paid"
                          type="number"
                          inputProps={{ step: '0.01' }}
                          fullWidth
                          size="small"
                          value={paymentFormData.principalPaid}
                          onChange={(e) => setPaymentFormData(prev => ({ ...prev, principalPaid: e.target.value }))}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Interest Paid"
                          type="number"
                          inputProps={{ step: '0.01' }}
                          fullWidth
                          size="small"
                          value={paymentFormData.interestPaid}
                          onChange={(e) => setPaymentFormData(prev => ({ ...prev, interestPaid: e.target.value }))}
                        />
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentFormData.paymentMethod}
                        label="Payment Method"
                        onChange={(e) => {
                          const value = e.target.value;
                          setPaymentFormData(prev => ({ ...prev, paymentMethod: value }));
                          // Extract account ID if it's an account payment
                          if (value.startsWith('account_')) {
                            const accountId = parseInt(value.replace('account_', ''));
                            setPaymentFormData(prev => ({ ...prev, accountId: accountId.toString() }));
                            // If paid with cheque, verify account has chequebook
                            const account = accounts.find(a => a.id === accountId);
                            if (paidWithCheque && !account?.has_chequebook) {
                              showToast('Selected account does not have chequebook facility', 'error');
                              setPaidWithCheque(false);
                              setChequeNumber('');
                            }
                          } else {
                            // Cash selected - reset account-related fields
                            setPaymentFormData(prev => ({ ...prev, accountId: '' }));
                            setPaidWithCheque(false);
                            setChequeNumber('');
                            setTransactionId('');
                          }
                        }}
                        required
                        MenuProps={selectMenuProps}
                      >
                        {paymentMethodOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {option.icon && <Box sx={{ display: 'flex', alignItems: 'center' }}>{option.icon}</Box>}
                              {option.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Show checkbox only when bank account is selected AND has chequebook */}
                  {paymentFormData.paymentMethod.startsWith('account_') && (() => {
                    const accountId = parseInt(paymentFormData.paymentMethod.replace('account_', ''));
                    const selectedAccount = accounts.find(a => a.id === accountId);
                    return selectedAccount?.has_chequebook ? (
                  <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={paidWithCheque}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPaidWithCheque(checked);
                                if (checked) {
                                  setChequeNumber('');
                                  setTransactionId('');
                                } else {
                                  setChequeNumber('');
                                }
                              }}
                            />
                          }
                          label="Paid with Cheque"
                        />
                  </Grid>
                    ) : null;
                  })()}

                  {/* Show Transaction ID / Cheque No. field when bank account is selected */}
                  {paymentFormData.paymentMethod.startsWith('account_') && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label={paidWithCheque ? "Cheque No. *" : "Transaction ID"}
                        value={paidWithCheque ? chequeNumber : transactionId}
                        onChange={(e) => {
                          if (paidWithCheque) {
                            setChequeNumber(e.target.value);
                          } else {
                            setTransactionId(e.target.value);
                          }
                        }}
                        required={paidWithCheque}
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      label="Reference Number"
                      fullWidth
                      size="small"
                      value={paymentFormData.referenceNumber}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Notes"
                      multiline
                      rows={3}
                      fullWidth
                      size="small"
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </form>
        </StyledDialogContent>

        <FormActionsStyled>
          <MuiButton 
            onClick={() => setShowPaymentForm(false)}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton 
            onClick={(e) => {
              e.preventDefault();
              handleSubmitPayment(e as any);
            }}
            variant="contained"
            size="small"
            disabled={saving}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {saving ? 'Recording...' : 'Record Payment'}
          </MuiButton>
        </FormActionsStyled>
      </StyledDialog>

      {/* Categories Manager Dialog */}
      {showCategories && (
        <LiabilityCategoriesManager
          theme={theme}
          categories={categories}
          onClose={() => setShowCategories(false)}
          onUpdate={fetchCategories}
          schoolId={user?.school_id || 0}
        />
      )}
    </TabContainer>
  );
};

// Categories Manager Component
const LiabilityCategoriesManager: React.FC<{
  theme: any;
  categories: LiabilityCategory[];
  onClose: () => void;
  onUpdate: () => void;
  schoolId: number;
}> = ({ theme, categories, onUpdate, onClose, schoolId }) => {
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LiabilityCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#ef4444',
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCategory) {
        await liabilitiesService.updateLiabilityCategory(editingCategory.id, schoolId, formData);
        showToast('Category updated successfully', 'success');
      } else {
        await liabilitiesService.createLiabilityCategory({
          schoolId,
          ...formData,
        });
        showToast('Category created successfully', 'success');
      }
      setShowForm(false);
      onUpdate();
    } catch (error: any) {
      showToast(error.message || 'Failed to save category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: LiabilityCategory) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setLoading(true);
    try {
      await liabilitiesService.deleteLiabilityCategory(category.id, schoolId);
      showToast('Category deleted successfully', 'success');
      onUpdate();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete category', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OldDialog theme={theme} $open={true}>
      <OldDialogContent theme={theme} style={{ maxWidth: '800px' }}>
        <DialogHeader>
          <DialogTitle theme={theme}>Liability Categories</DialogTitle>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button theme={theme} $variant="primary" onClick={() => {
              setEditingCategory(null);
              setFormData({
                name: '',
                description: '',
                color: '#ef4444',
                isActive: true,
              });
              setShowForm(true);
            }}>
              <AddIcon style={{ fontSize: '1rem', marginRight: '0.25rem' }} />
              Add Category
            </Button>
            <Button theme={theme} onClick={onClose}>
              <CloseIcon />
            </Button>
          </div>
        </DialogHeader>
        
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label theme={theme}>Category Name *</Label>
              <Input
                theme={theme}
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </FormGroup>
            <FormGroup>
              <Label theme={theme}>Description</Label>
              <TextArea
                theme={theme}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </FormGroup>
            <FormGroup>
              <Label theme={theme}>Color</Label>
              <Input
                theme={theme}
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              />
            </FormGroup>
            <DialogActions>
              <Button theme={theme} type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button theme={theme} $variant="primary" type="submit">
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </DialogActions>
          </form>
        ) : (
          <Table>
            <TableHead theme={theme}>
              <TableRow theme={theme}>
                <TableHeaderCell theme={theme}>Name</TableHeaderCell>
                <TableHeaderCell theme={theme}>Status</TableHeaderCell>
                <TableHeaderCell theme={theme}>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <tbody>
              {categories.map(cat => (
                <TableRow key={cat.id} theme={theme}>
                  <TableCell theme={theme}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          backgroundColor: cat.color,
                        }}
                      />
                      {cat.name}
                    </div>
                  </TableCell>
                  <TableCell theme={theme}>
                    <StatusBadge $status={cat.isActive ? 'active' : 'disposed'}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell theme={theme}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        theme={theme}
                        onClick={() => {
                          setEditingCategory(cat);
                          setFormData({
                            name: cat.name,
                            description: cat.description || '',
                            color: cat.color,
                            isActive: cat.isActive,
                          });
                          setShowForm(true);
                        }}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <EditIcon style={{ fontSize: '0.875rem' }} />
                      </Button>
                      <Button
                        theme={theme}
                        $variant="danger"
                        onClick={() => handleDelete(cat)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <DeleteIcon style={{ fontSize: '0.875rem' }} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </OldDialogContent>
    </OldDialog>
  );
};

export default LiabilitiesTab;





