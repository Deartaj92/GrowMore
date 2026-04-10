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
  TrendingDown,
  AccountBalance,
  LocationOn,
  Inventory,
  AttachFile,
  Close as CloseIcon,
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
import AppDateField from '../../../../components/shared/AppDateField';
import { assetsService } from '../../services/assetsService';
import { Asset, AssetCategory, AssetFilters, AssetDepreciation, DepreciationMethod, AssetStatus } from '../../../../types/asset';
import { supabase } from '../../../../supabaseClient';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

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
      case 'active': return '#10b98120';
      case 'disposed': return '#ef444420';
      case 'under_maintenance': return '#f59e0b20';
      case 'sold': return '#6366f120';
      default: return 'rgba(0, 0, 0, 0.1)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'active': return '#10b981';
      case 'disposed': return '#ef4444';
      case 'under_maintenance': return '#f59e0b';
      case 'sold': return '#6366f1';
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

const AssetsTab: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<AssetFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDepreciation, setShowDepreciation] = useState(false);
  const [depreciations, setDepreciations] = useState<AssetDepreciation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paidWithCheque, setPaidWithCheque] = useState(false);
  const [chequeNumber, setChequeNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    categoryId: string;
    description: string;
    purchaseDate: string;
    purchaseCost: string;
    currentValue: string;
    depreciationMethod: DepreciationMethod;
    depreciationRate: string;
    usefulLifeYears: string;
    location: string;
    vendorName: string;
    invoiceNumber: string;
    serialNumber: string;
    status: AssetStatus;
    notes: string;
    paymentMethod: string;
    accountId: string;
  }>({
    name: '',
    categoryId: '',
    description: '',
    purchaseDate: '',
    purchaseCost: '',
    currentValue: '',
    depreciationMethod: 'straight_line',
    depreciationRate: '',
    usefulLifeYears: '',
    location: '',
    vendorName: '',
    invoiceNumber: '',
    serialNumber: '',
    status: 'active',
    notes: '',
    paymentMethod: 'Cash', // Use 'Cash' as default (same as ExpenseManager)
    accountId: '',
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchAssets = useCallback(async () => {
    if (!user?.school_id) return;
    
    setIsLoading(true);
    try {
      const assetsData = await assetsService.getAssets(user.school_id, filters);
      setAssets(assetsData);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      showToast('Failed to fetch assets', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.school_id, filters, showToast]);

  const fetchCategories = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      const categoriesData = await assetsService.getAssetCategories(user.school_id);
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
    fetchAssets();
  }, [fetchAssets]);

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

  // Get accounts with chequebook for cheque payments
  const accountsWithChequebook = useMemo(() => {
    return accounts.filter(account => account.has_chequebook === true);
  }, [accounts]);

  // Get payment method options (Cash + Accounts) - same as ExpenseManager
  const paymentMethodOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; isAccount: boolean; accountId?: number; icon?: React.ReactElement }> = [
      { value: 'Cash', label: 'Cash', isAccount: false, icon: React.createElement(AttachMoney) }
    ];

    // If paid with cheque, only show accounts with chequebook
    const accountsToShow = paidWithCheque ? accountsWithChequebook : accounts;

    // Add accounts as payment options
    accountsToShow.forEach(account => {
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
  }, [accounts, accountTypes, paidWithCheque, accountsWithChequebook]);

  const handleAdd = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      categoryId: '',
      description: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: '',
      currentValue: '',
      depreciationMethod: 'straight_line',
      depreciationRate: '',
      usefulLifeYears: '',
      location: '',
      vendorName: '',
      invoiceNumber: '',
      serialNumber: '',
      status: 'active',
      notes: '',
      paymentMethod: 'Cash', // Use 'Cash' as default (same as ExpenseManager)
      accountId: '',
    });
    setPaidWithCheque(false);
    setChequeNumber('');
    setTransactionId('');
    setShowForm(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      categoryId: String(asset.categoryId),
      description: asset.description || '',
      purchaseDate: asset.purchaseDate,
      purchaseCost: String(asset.purchaseCost),
      currentValue: asset.currentValue ? String(asset.currentValue) : '',
      depreciationMethod: asset.depreciationMethod,
      depreciationRate: asset.depreciationRate ? String(asset.depreciationRate) : '',
      usefulLifeYears: asset.usefulLifeYears ? String(asset.usefulLifeYears) : '',
      location: asset.location || '',
      vendorName: asset.vendorName || '',
      invoiceNumber: asset.invoiceNumber || '',
      serialNumber: asset.serialNumber || '',
      status: asset.status,
      notes: asset.notes || '',
      // Load payment method and account (convert from DB format to form format)
      paymentMethod: (asset as any).paymentMethod === 'account' && (asset as any).accountId 
        ? `account_${(asset as any).accountId}` 
        : (asset as any).paymentMethod === 'cash' || !(asset as any).paymentMethod 
          ? 'Cash' 
          : (asset as any).paymentMethod,
      accountId: (asset as any).accountId ? String((asset as any).accountId) : '',
    });
    // Load cheque/transaction info if it exists
    if ((asset as any).cheque_number) {
      setPaidWithCheque(true);
      setChequeNumber((asset as any).cheque_number);
      setTransactionId('');
    } else if ((asset as any).transaction_id) {
      setPaidWithCheque(false);
      setChequeNumber('');
      setTransactionId((asset as any).transaction_id);
    } else {
      setPaidWithCheque(false);
      setChequeNumber('');
      setTransactionId('');
    }
    setShowForm(true);
  };

  const handleDelete = async (asset: Asset) => {
    if (!user?.school_id) return;
    if (!window.confirm(`Are you sure you want to delete "${asset.name}"?`)) return;
    
    setLoading(true);
    try {
      await assetsService.deleteAsset(asset.id, user.school_id);
      showToast('Asset deleted successfully', 'success');
      fetchAssets();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      showToast(error.message || 'Failed to delete asset', 'error');
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
      // Handle payment method and account selection (same as ExpenseManager)
      let paymentMethod = formData.paymentMethod;
      let accountId: number | undefined = undefined;

      // If payment method starts with 'account_', extract account ID and set payment_method to 'account'
      if (formData.paymentMethod.startsWith('account_')) {
        accountId = parseInt(formData.paymentMethod.replace('account_', ''));
        // Store 'account' as payment method for database constraint
        paymentMethod = 'account';
      } else if (formData.paymentMethod === 'Cash') {
        paymentMethod = 'cash';
      }

      const assetData = {
        schoolId: user.school_id,
        categoryId: parseInt(formData.categoryId),
        name: formData.name,
        description: formData.description || undefined,
        purchaseDate: formData.purchaseDate,
        purchaseCost: parseFloat(formData.purchaseCost),
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        depreciationMethod: formData.depreciationMethod,
        depreciationRate: formData.depreciationRate ? parseFloat(formData.depreciationRate) : undefined,
        usefulLifeYears: formData.usefulLifeYears ? parseInt(formData.usefulLifeYears) : undefined,
        location: formData.location || undefined,
        vendorName: formData.vendorName || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        serialNumber: formData.serialNumber || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        paymentMethod: paymentMethod as any,
        accountId: accountId,
        chequeNumber: paidWithCheque ? chequeNumber.trim() : undefined,
        transactionId: !paidWithCheque && formData.paymentMethod.startsWith('account_') ? transactionId.trim() : undefined,
        createdBy: user.id,
      };

      if (editingAsset) {
        await assetsService.updateAsset(editingAsset.id, user.school_id, assetData);
        showToast('Asset updated successfully', 'success');
      } else {
        await assetsService.createAsset(assetData);
        showToast('Asset created successfully', 'success');
      }
      
      setShowForm(false);
      fetchAssets();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      showToast(error.message || 'Failed to save asset', 'error');
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const handleViewDepreciation = async (asset: Asset) => {
    if (!user?.school_id) return;
    
    setSelectedAsset(asset);
    setLoading(true);
    try {
      const depData = await assetsService.getAssetDepreciations(asset.id, user.school_id);
      setDepreciations(depData);
      setShowDepreciation(true);
    } catch (error: any) {
      console.error('Error fetching depreciations:', error);
      showToast('Failed to fetch depreciation history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum, a) => sum + a.purchaseCost, 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + (a.currentValue || a.purchaseCost), 0);
    const totalDepreciation = totalValue - totalCurrentValue;
    
    return { totalAssets, totalValue, totalCurrentValue, totalDepreciation };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    let filtered = assets.filter(asset => {
      if (filters.categoryId && asset.categoryId !== filters.categoryId) return false;
      if (filters.status && asset.status !== filters.status) return false;
      if (filters.location && !asset.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    return filtered;
  }, [assets, filters, searchQuery]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

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
          <AccountBalance />
          Assets Management
        </HeaderTitle>
        <HeaderActions theme={theme}>
          <ActionButton theme={theme} onClick={() => setShowCategories(true)}>
            <CategoryIcon style={{ fontSize: '1rem' }} />
            Categories
          </ActionButton>
          <ActionButton theme={theme} onClick={fetchAssets}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </ActionButton>
          <ActionButton theme={theme} className="primary" onClick={handleAdd}>
            <AddIcon style={{ fontSize: '1rem' }} />
            Add Asset
          </ActionButton>
        </HeaderActions>
      </Header>

      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Assets</StatLabel>
          <StatValue theme={theme}>{summary.totalAssets}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Value</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summary.totalValue)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Current Value</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summary.totalCurrentValue)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Depreciation</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summary.totalDepreciation)}</StatValue>
        </StatCard>
      </StatsGrid>

      <FiltersContainer theme={theme}>
        <SearchBar theme={theme}>
          <SearchIcon style={{ fontSize: '1rem', color: theme.TEXT_SECONDARY }} />
          <SearchInput
            theme={theme}
            type="text"
            placeholder="Search assets..."
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
          <option value="disposed">Disposed</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="sold">Sold</option>
        </StyledSelect>
      </FiltersContainer>

      <ContentCard theme={theme}>
        {filteredAssets.length === 0 ? (
          <EmptyState theme={theme}>
            <AccountBalance style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <div>No assets found</div>
            <Button theme={theme} $variant="primary" onClick={handleAdd} style={{ marginTop: '1rem' }}>
              <AddIcon style={{ fontSize: '1rem', marginRight: '0.5rem' }} />
              Add First Asset
            </Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHead theme={theme}>
              <TableRow theme={theme}>
                <TableHeaderCell theme={theme}>Name</TableHeaderCell>
                <TableHeaderCell theme={theme}>Category</TableHeaderCell>
                <TableHeaderCell theme={theme}>Purchase Date</TableHeaderCell>
                <TableHeaderCell theme={theme}>Purchase Cost</TableHeaderCell>
                <TableHeaderCell theme={theme}>Current Value</TableHeaderCell>
                <TableHeaderCell theme={theme}>Status</TableHeaderCell>
                <TableHeaderCell theme={theme}>Location</TableHeaderCell>
                <TableHeaderCell theme={theme}>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <tbody>
              {paginatedAssets.map(asset => (
                <TableRow key={asset.id} theme={theme}>
                  <TableCell theme={theme}>
                    <div style={{ fontWeight: 600 }}>{asset.name}</div>
                    {asset.serialNumber && (
                      <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                        SN: {asset.serialNumber}
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
                          backgroundColor: asset.category?.color || '#3b82f6',
                        }}
                      />
                      {asset.category?.name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell theme={theme}>
                    {format(new Date(asset.purchaseDate), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell theme={theme}>{formatCurrency(asset.purchaseCost)}</TableCell>
                  <TableCell theme={theme}>
                    {formatCurrency(asset.currentValue || asset.purchaseCost)}
                  </TableCell>
                  <TableCell theme={theme}>
                    <StatusBadge $status={asset.status}>
                      {asset.status.replace('_', ' ').toUpperCase()}
                    </StatusBadge>
                  </TableCell>
                  <TableCell theme={theme}>{asset.location || '-'}</TableCell>
                  <TableCell theme={theme}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <ActionButton
                        theme={theme}
                        onClick={() => handleViewDepreciation(asset)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <TrendingDown style={{ fontSize: '0.875rem' }} />
                      </ActionButton>
                      <ActionButton
                        theme={theme}
                        onClick={() => handleEdit(asset)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <EditIcon style={{ fontSize: '0.875rem' }} />
                      </ActionButton>
                      <ActionButton
                        theme={theme}
                        onClick={() => handleDelete(asset)}
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

      {filteredAssets.length > 0 && (
        <PaginationContainer theme={theme}>
          <PaginationInfo theme={theme}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAssets.length)} of {filteredAssets.length} assets
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

      {/* Asset Form Dialog */}
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
            {editingAsset ? 'Edit Asset' : 'Add New Asset'}
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
                  label="Asset Name"
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
                <AppDateField
                  label="Purchase Date"
                  required
                  fullWidth
                  size="small"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  textFieldProps={{
                    InputLabelProps: {
                      shrink: true,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Purchase Cost"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  required
                  fullWidth
                  size="small"
                  value={formData.purchaseCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseCost: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Current Value"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  fullWidth
                  size="small"
                  value={formData.currentValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.paymentMethod}
                    label="Payment Method"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, paymentMethod: value }));
                      // Extract account ID if it's an account payment
                      if (value.startsWith('account_')) {
                        const accountId = parseInt(value.replace('account_', ''));
                        setFormData(prev => ({ ...prev, accountId: accountId.toString() }));
                        // If paid with cheque, verify account has chequebook
                        const account = accounts.find(a => a.id === accountId);
                        if (paidWithCheque && !account?.has_chequebook) {
                          showToast('Selected account does not have chequebook facility', 'error');
                          setPaidWithCheque(false);
                          setChequeNumber('');
                        }
                      } else {
                        // Cash selected - reset account-related fields
                        setFormData(prev => ({ ...prev, accountId: '' }));
                        setPaidWithCheque(false);
                        setChequeNumber('');
                        setTransactionId('');
                      }
                    }}
                    required
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                        },
                      },
                    }}
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
              {formData.paymentMethod.startsWith('account_') && (() => {
                const accountId = parseInt(formData.paymentMethod.replace('account_', ''));
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
              {formData.paymentMethod.startsWith('account_') && (
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

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AssetStatus }))}
                    required
                    MenuProps={selectMenuProps}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="disposed">Disposed</MenuItem>
                    <MenuItem value="under_maintenance">Under Maintenance</MenuItem>
                    <MenuItem value="sold">Sold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Depreciation Method</InputLabel>
                  <Select
                    value={formData.depreciationMethod}
                    label="Depreciation Method"
                    onChange={(e) => setFormData(prev => ({ ...prev, depreciationMethod: e.target.value as DepreciationMethod }))}
                    MenuProps={selectMenuProps}
                  >
                    <MenuItem value="straight_line">Straight Line</MenuItem>
                    <MenuItem value="declining_balance">Declining Balance</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Depreciation Rate (%)"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  fullWidth
                  size="small"
                  value={formData.depreciationRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, depreciationRate: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Useful Life (Years)"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.usefulLifeYears}
                  onChange={(e) => setFormData(prev => ({ ...prev, usefulLifeYears: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Location"
                  fullWidth
                  size="small"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vendor Name"
                  fullWidth
                  size="small"
                  value={formData.vendorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Invoice Number"
                  fullWidth
                  size="small"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Serial Number"
                  fullWidth
                  size="small"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                />
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
            {saving ? (editingAsset ? 'Updating...' : 'Creating...') : (editingAsset ? 'Update Asset' : 'Create Asset')}
          </MuiButton>
        </FormActionsStyled>
      </StyledDialog>

      {/* Categories Manager Dialog */}
      {showCategories && (
        <AssetCategoriesManager
          theme={theme}
          categories={categories}
          onClose={() => setShowCategories(false)}
          onUpdate={fetchCategories}
          schoolId={user?.school_id || 0}
        />
      )}

      {/* Depreciation View Dialog */}
      <OldDialog theme={theme} $open={showDepreciation}>
        <OldDialogContent theme={theme}>
          <DialogHeader>
            <DialogTitle theme={theme}>
              Depreciation History - {selectedAsset?.name}
            </DialogTitle>
            <Button theme={theme} onClick={() => setShowDepreciation(false)}>
              <CloseIcon />
            </Button>
          </DialogHeader>
          {depreciations.length === 0 ? (
            <EmptyState theme={theme}>
              <TrendingDown style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
              <div>No depreciation records found</div>
            </EmptyState>
          ) : (
            <Table>
              <TableHead theme={theme}>
                <TableRow theme={theme}>
                  <TableHeaderCell theme={theme}>Date</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Amount</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Accumulated</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Remaining Value</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {depreciations.map(dep => (
                  <TableRow key={dep.id} theme={theme}>
                    <TableCell theme={theme}>
                      {format(new Date(dep.depreciationDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell theme={theme}>{formatCurrency(dep.depreciationAmount)}</TableCell>
                    <TableCell theme={theme}>{formatCurrency(dep.accumulatedDepreciation)}</TableCell>
                    <TableCell theme={theme}>{formatCurrency(dep.remainingValue)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </OldDialogContent>
      </OldDialog>
    </TabContainer>
  );
};

// Categories Manager Component
const AssetCategoriesManager: React.FC<{
  theme: any;
  categories: AssetCategory[];
  onClose: () => void;
  onUpdate: () => void;
  schoolId: number;
}> = ({ theme, categories, onUpdate, onClose, schoolId }) => {
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    depreciationMethod: DepreciationMethod;
    defaultDepreciationRate: string;
    color: string;
    isActive: boolean;
  }>({
    name: '',
    description: '',
    depreciationMethod: 'straight_line',
    defaultDepreciationRate: '',
    color: '#3b82f6',
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const categoryData = {
        name: formData.name,
        description: formData.description || undefined,
        depreciationMethod: formData.depreciationMethod,
        defaultDepreciationRate: formData.defaultDepreciationRate ? parseFloat(formData.defaultDepreciationRate) : undefined,
        color: formData.color,
        isActive: formData.isActive,
      };
      
      if (editingCategory) {
        await assetsService.updateAssetCategory(editingCategory.id, schoolId, categoryData);
        showToast('Category updated successfully', 'success');
      } else {
        await assetsService.createAssetCategory({
          schoolId,
          ...categoryData,
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

  const handleDelete = async (category: AssetCategory) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setLoading(true);
    try {
      await assetsService.deleteAssetCategory(category.id, schoolId);
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
          <DialogTitle theme={theme}>Asset Categories</DialogTitle>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button theme={theme} $variant="primary" onClick={() => {
              setEditingCategory(null);
              setFormData({
                name: '',
                description: '',
                depreciationMethod: 'straight_line',
                defaultDepreciationRate: '',
                color: '#3b82f6',
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormGroup>
                <Label theme={theme}>Depreciation Method</Label>
                <StyledSelect
                  theme={theme}
                  value={formData.depreciationMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, depreciationMethod: e.target.value as any }))}
                >
                  <option value="straight_line">Straight Line</option>
                  <option value="declining_balance">Declining Balance</option>
                  <option value="none">None</option>
                </StyledSelect>
              </FormGroup>
              <FormGroup>
                <Label theme={theme}>Default Depreciation Rate (%)</Label>
                <Input
                  theme={theme}
                  type="number"
                  step="0.01"
                  value={formData.defaultDepreciationRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultDepreciationRate: e.target.value }))}
                />
              </FormGroup>
            </div>
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
          <>
            <Table>
              <TableHead theme={theme}>
                <TableRow theme={theme}>
                  <TableHeaderCell theme={theme}>Name</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Depreciation Method</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Default Rate</TableHeaderCell>
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
                    <TableCell theme={theme}>{cat.depreciationMethod.replace('_', ' ')}</TableCell>
                    <TableCell theme={theme}>
                      {cat.defaultDepreciationRate ? `${cat.defaultDepreciationRate}%` : '-'}
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
                              depreciationMethod: cat.depreciationMethod as DepreciationMethod,
                              defaultDepreciationRate: cat.defaultDepreciationRate ? String(cat.defaultDepreciationRate) : '',
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
          </>
        )}
      </OldDialogContent>
    </OldDialog>
  );
};

export default AssetsTab;




