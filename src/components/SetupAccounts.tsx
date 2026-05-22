import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { supabase } from '../supabaseClient';
import { 
  AccountBalance,
  Add,
  Edit,
  Delete,
  Refresh as RefreshIcon,
  AccountBalanceWallet,
  Payment,
  CreditCard,
  AccountCircle,
  Settings as SettingsIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import { useLoading } from '../contexts/LoadingContext';
import Loader from './Loader';
import {
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  useTheme as useMuiTheme,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  Grid
} from '@mui/material';
import { Theme } from '@mui/material/styles';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    padding-bottom: 2rem;
    gap: 0.2rem;
  }
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
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    margin-bottom: 0.2rem;
    gap: 0.5rem;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    flex-shrink: 0;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
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
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
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
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
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
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(0, 0, 0, 0.01)'};
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

const StyledIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.ACCENT};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 1.1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

// Styled components for Account Types modals (still using custom styled components)
const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 8px 32px rgba(0, 0, 0, 0.2)'};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
  
  svg {
    font-size: 1.5rem;
  }
`;

// Material-UI Dialog Styled Components (similar to CreateStudentReportForm)
// Using useTheme hook approach - will be created inside component

// Dialog styled components will use sx prop instead

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
  }
};

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
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
  transition: all 0.2s ease;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 1)'};
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
  transition: all 0.2s ease;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 1)'};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const PrimaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
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
  }
`;

// ===== MAIN COMPONENT =====

interface Account {
  id: number;
  school_id: number;
  name: string;
  type: string;
  account_number?: string;
  bank_name?: string;
  branch_name?: string;
  iban?: string;
  swift_code?: string;
  mobile_number?: string;
  wallet_number?: string;
  raast_id?: string;
  description?: string;
  has_chequebook?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AccountType {
  id: number;
  school_id: number;
  name: string;
  display_name: string;
  icon_name: string;
  is_system_type: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SetupAccountsProps {
  className?: string;
}

const SetupAccounts: React.FC<SetupAccountsProps> = ({ className }) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const { showToast } = useToast();
  const muiTheme = useMuiTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountTypeModalOpen, setIsAccountTypeModalOpen] = useState(false);
  const [isAccountTypeFormModalOpen, setIsAccountTypeFormModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingAccountType, setEditingAccountType] = useState<AccountType | null>(null);
  const [accountTypeFormData, setAccountTypeFormData] = useState({
    name: '',
    display_name: '',
    icon_name: 'AccountCircle',
    is_active: true
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    account_number: '',
    bank_name: '',
    branch_name: '',
    iban: '',
    swift_code: '',
    mobile_number: '',
    wallet_number: '',
    raast_id: '',
    description: '',
    has_chequebook: false,
    is_active: true
  });

  // Icon mapping for dynamic icon rendering
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || AccountCircle;
    return React.createElement(IconComponent);
  };

  // Get account types for dropdown
  const accountTypesForSelect = useMemo(() => {
    return accountTypes
      .filter(type => type.is_active)
      .map(type => ({
        value: type.name,
        label: type.display_name,
        icon: getIconComponent(type.icon_name),
        isSystemType: type.is_system_type
      }));
  }, [accountTypes]);

  // Fetch account types
  const fetchAccountTypes = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      // Fetch system types (school_id = 1) and school-specific types
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .or(`school_id.eq.1,school_id.eq.${user.school_id}`)
        .eq('is_active', true)
        .order('is_system_type', { ascending: false })
        .order('display_name', { ascending: true });

      if (error) throw error;

      // Remove duplicates - prefer system types (school_id = 1) over school-specific ones
      const uniqueTypes = new Map();
      (data || []).forEach((type: AccountType) => {
        const key = type.name;
        if (!uniqueTypes.has(key)) {
          uniqueTypes.set(key, type);
        } else {
          // If we already have this type, prefer the system type (school_id = 1)
          const existing = uniqueTypes.get(key);
          if (type.school_id === 1 && existing.school_id !== 1) {
            uniqueTypes.set(key, type);
          }
        }
      });

      // Sort account types: system types first, then custom types, then "Other" at the end
      const sortedTypes = Array.from(uniqueTypes.values()).sort((a, b) => {
        // "Other" always goes to the end
        if (a.name === 'other' && b.name !== 'other') return 1;
        if (a.name !== 'other' && b.name === 'other') return -1;
        if (a.name === 'other' && b.name === 'other') return 0;
        
        // System types come before custom types
        if (a.is_system_type && !b.is_system_type) return -1;
        if (!a.is_system_type && b.is_system_type) return 1;
        
        // Within same category, sort alphabetically by display name
        return a.display_name.localeCompare(b.display_name);
      });

      setAccountTypes(sortedTypes);
    } catch (error: any) {
      console.error('Error fetching account types:', error);
      showToast('Failed to fetch account types', 'error');
    }
  }, [user?.school_id, showToast]);

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    if (!user?.school_id) return;
    
    setLoading(true);
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      showToast('Failed to fetch accounts', 'error');
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  }, [user?.school_id, setLoading, showToast]);

  useEffect(() => {
    fetchAccountTypes();
  }, [fetchAccountTypes]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'bank',
      account_number: '',
      bank_name: '',
      branch_name: '',
      iban: '',
      swift_code: '',
      mobile_number: '',
      wallet_number: '',
      raast_id: '',
      description: '',
      has_chequebook: false,
      is_active: true
    });
    setEditingAccount(null);
  };

  // Open modal for create
  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (account: Account) => {
    setFormData({
      name: account.name,
      type: account.type,
      account_number: account.account_number || '',
      bank_name: account.bank_name || '',
      branch_name: account.branch_name || '',
      iban: account.iban || '',
      swift_code: account.swift_code || '',
      mobile_number: account.mobile_number || '',
      wallet_number: account.wallet_number || '',
      raast_id: account.raast_id || '',
      description: account.description || '',
      has_chequebook: account.has_chequebook || false,
      is_active: account.is_active
    });
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = async (account: Account) => {
    if (!window.confirm(`Are you sure you want to delete "${account.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id)
        .eq('school_id', user?.school_id);

      if (error) throw error;

      showToast('Account deleted successfully', 'success');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      showToast('Failed to delete account', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    // Validate wallet_number for EasyPaisa and JazzCash
    if ((formData.type === 'easypaisa' || formData.type === 'jazzcash') && !formData.wallet_number?.trim()) {
      showToast('Wallet number is required for EasyPaisa and JazzCash accounts', 'error');
      return;
    }

    // Validate raast_id for Raast ID
    if (formData.type === 'raast_id' && !formData.raast_id?.trim()) {
      showToast('Raast ID is required for Raast ID accounts', 'error');
      return;
    }

    setLoading(true);
    try {
      const accountData = {
        school_id: user.school_id,
        name: formData.name,
        type: formData.type,
        account_number: formData.account_number || null,
        bank_name: formData.bank_name || null,
        branch_name: formData.branch_name || null,
        iban: formData.iban || null,
        swift_code: formData.swift_code || null,
        mobile_number: formData.mobile_number || null,
        wallet_number: formData.wallet_number || null,
        raast_id: formData.raast_id || null,
        description: formData.description || null,
        has_chequebook: formData.type === 'bank' ? formData.has_chequebook : false,
        is_active: formData.is_active
      };

      if (editingAccount) {
        // Update
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingAccount.id)
          .eq('school_id', user.school_id);

        if (error) throw error;
        showToast('Account updated successfully', 'success');
      } else {
        // Create
        const { error } = await supabase
          .from('accounts')
          .insert([accountData]);

        if (error) throw error;
        showToast('Account created successfully', 'success');
      }

      setIsModalOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      console.error('Error saving account:', error);
      showToast(error.message || 'Failed to save account', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get account type icon
  const getAccountTypeIcon = (type: string) => {
    const accountType = accountTypes.find(t => t.name === type);
    if (accountType) {
      return getIconComponent(accountType.icon_name);
    }
    return <AccountBalanceWallet />;
  };

  // Get account type label
  const getAccountTypeLabel = (type: string) => {
    const accountType = accountTypes.find(t => t.name === type);
    return accountType?.display_name || type;
  };

  // Account Type Management
  const handleManageAccountTypes = () => {
    setIsAccountTypeModalOpen(true);
  };

  const handleCreateAccountType = () => {
    setAccountTypeFormData({
      name: '',
      display_name: '',
      icon_name: 'AccountCircle',
      is_active: true
    });
    setEditingAccountType(null);
    setIsAccountTypeFormModalOpen(true);
  };

  const handleEditAccountType = (accountType: AccountType) => {
    setAccountTypeFormData({
      name: accountType.name,
      display_name: accountType.display_name,
      icon_name: accountType.icon_name,
      is_active: accountType.is_active
    });
    setEditingAccountType(accountType);
    setIsAccountTypeFormModalOpen(true);
  };

  const handleDeleteAccountType = async (accountType: AccountType) => {
    if (accountType.is_system_type) {
      showToast('System account types cannot be deleted', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${accountType.display_name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('account_types')
        .delete()
        .eq('id', accountType.id)
        .eq('school_id', user?.school_id);

      if (error) throw error;

      showToast('Account type deleted successfully', 'success');
      fetchAccountTypes();
    } catch (error: any) {
      console.error('Error deleting account type:', error);
      showToast('Failed to delete account type', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAccountType = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    setLoading(true);
    try {
      const accountTypeData = {
        school_id: user.school_id,
        name: accountTypeFormData.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: accountTypeFormData.display_name,
        icon_name: accountTypeFormData.icon_name,
        is_system_type: false,
        is_active: accountTypeFormData.is_active
      };

      if (editingAccountType) {
        // Update
        const { error } = await supabase
          .from('account_types')
          .update(accountTypeData)
          .eq('id', editingAccountType.id)
          .eq('school_id', user.school_id);

        if (error) throw error;
        showToast('Account type updated successfully', 'success');
      } else {
        // Create
        const { error } = await supabase
          .from('account_types')
          .insert([accountTypeData]);

        if (error) throw error;
        showToast('Account type created successfully', 'success');
      }

      setIsAccountTypeFormModalOpen(false);
      setAccountTypeFormData({
        name: '',
        display_name: '',
        icon_name: 'AccountCircle',
        is_active: true
      });
      setEditingAccountType(null);
      fetchAccountTypes();
    } catch (error: any) {
      console.error('Error saving account type:', error);
      showToast(error.message || 'Failed to save account type', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingData) {
    return <Loader />;
  }

  return (
    <PageContainer  className={className}>
      <Header >
        <HeaderTitle >
          <AccountBalanceWallet />
          Setup Accounts
        </HeaderTitle>
        <HeaderActions >
          <ActionButton  onClick={handleManageAccountTypes}>
            <SettingsIcon style={{ fontSize: '1rem' }} />
            Manage Types
          </ActionButton>
          <ActionButton  onClick={handleCreate}>
            <Add style={{ fontSize: '1rem' }} />
            Add Account
          </ActionButton>
          <ActionButton  onClick={fetchAccounts}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </ActionButton>
        </HeaderActions>
      </Header>

      <ContentCard >
        {accounts.length === 0 ? (
          <EmptyState >
            <AccountBalanceWallet style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No accounts found</div>
            <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>
              Click "Add Account" to create your first account
            </div>
          </EmptyState>
        ) : (
          <Table>
            <TableHead >
              <TableRow >
                <TableHeaderCell >Type</TableHeaderCell>
                <TableHeaderCell >Title</TableHeaderCell>
                <TableHeaderCell >Account Details</TableHeaderCell>
                <TableHeaderCell >Status</TableHeaderCell>
                <TableHeaderCell >Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <tbody>
              {accounts.map((account) => (
                <TableRow key={account.id} >
                  <TableCell >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getAccountTypeIcon(account.type)}
                      <span style={{ fontWeight: 500 }}>{getAccountTypeLabel(account.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell >
                    <div style={{ fontWeight: 600 }}>{account.name}</div>
                    {account.description && (
                      <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                        {account.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell >
                    <div style={{ fontSize: '0.85rem' }}>
                      {account.type === 'bank' && (
                        <>
                          {account.bank_name && <div>Bank: {account.bank_name}</div>}
                          {account.account_number && <div>Account: {account.account_number}</div>}
                          {account.branch_name && <div>Branch: {account.branch_name}</div>}
                          {account.iban && <div>IBAN: {account.iban}</div>}
                          {account.swift_code && <div>SWIFT: {account.swift_code}</div>}
                        </>
                      )}
                      {(account.type === 'easypaisa' || account.type === 'jazzcash') && (
                        <>
                          {account.wallet_number && <div>Wallet: {account.wallet_number}</div>}
                        </>
                      )}
                      {account.type === 'raast_id' && (
                        <>
                          {account.raast_id && <div>Raast ID: {account.raast_id}</div>}
                        </>
                      )}
                      {account.type !== 'bank' && account.type !== 'easypaisa' && account.type !== 'jazzcash' && account.type !== 'raast_id' && (
                        <>
                          {account.account_number && <div>Account: {account.account_number}</div>}
                          {account.mobile_number && <div>Mobile: {account.mobile_number}</div>}
                          {account.bank_name && <div>Bank: {account.bank_name}</div>}
                          {account.wallet_number && <div>Wallet: {account.wallet_number}</div>}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell >
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: account.is_active 
                        ? (isDark(theme) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
                        : (isDark(theme) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: account.is_active ? '#22c55e' : '#ef4444'
                    }}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell >
                    <ButtonGroup>
                      <StyledIconButton  onClick={() => handleEdit(account)} title="Edit">
                        <Edit />
                      </StyledIconButton>
                      <StyledIconButton  onClick={() => handleDelete(account)} title="Delete">
                        <Delete />
                      </StyledIconButton>
                    </ButtonGroup>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>

      {/* Modal for Create/Edit */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300,
              backgroundColor: isDark(theme) ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: isDark(theme) ? theme.CARD : theme.CARD,
            maxWidth: '600px',
            width: '95%',
            margin: '84px 16px 16px',
            overflow: 'hidden',
            boxShadow: isDark(theme)
              ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
            border: isDark(theme)
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            },
            position: 'relative',
            zIndex: 1301,
            isolation: 'isolate'
          }
        }}
      >
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
          background: isDark(theme)
            ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
          position: 'relative',
          zIndex: 1
        }}>
          <Typography sx={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: theme.ACCENT,
            textShadow: isDark(theme) ? '0 2px 4px rgba(0, 0, 0, 0.5)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {editingAccount ? <Edit /> : <Add />}
            {editingAccount ? 'Edit Account' : 'Add New Account'}
          </Typography>
          <IconButton onClick={() => setIsModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: isDark(theme) ? 'rgba(255, 255, 255, 0.2) transparent' : 'rgba(0, 0, 0, 0.2) transparent',
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
            backgroundColor: isDark(theme) ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            border: `2px solid ${theme.CARD}`,
            '&:hover': {
              backgroundColor: isDark(theme) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
            }
          },
          background: isDark(theme)
            ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
          '& .MuiFormControl-root': {
            transition: 'background-color 0.2s ease',
          },
          '& .MuiInputBase-root': {
            background: isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            border: isDark(theme) ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
            transition: 'background-color 0.2s ease',
            '&:hover, &.Mui-focused': {
              background: isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            },
            '& .MuiSelect-select, & .MuiInputBase-input': {
              padding: '12px 14px',
              fontSize: '0.95rem',
              '&::placeholder': {
                color: isDark(theme) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                opacity: 1
              }
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            }
          }
        }}>
          <form id="account-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Account Title *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter account name"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account Type *</InputLabel>
                  <Select
                    value={formData.type}
                    label="Account Type *"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 300,
                          backgroundColor: isDark(theme) ? theme.CARD : theme.CARD,
                          '& .MuiList-root': {
                            padding: '4px 0',
                            maxHeight: 300,
                            overflowY: 'auto',
                            scrollbarWidth: 'thin',
                            scrollbarColor: isDark(theme) ? 'rgba(255, 255, 255, 0.2) transparent' : 'rgba(0, 0, 0, 0.2) transparent',
                            '&::-webkit-scrollbar': {
                              width: '12px',
                              background: 'transparent'
                            },
                            '&::-webkit-scrollbar-track': {
                              background: 'transparent'
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: isDark(theme) ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                              borderRadius: '6px',
                              border: `3px solid ${theme.CARD}`,
                              '&:hover': {
                                backgroundColor: isDark(theme) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                              }
                            }
                          },
                          '& .MuiMenuItem-root': {
                            padding: '10px 14px',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
                            },
                            '&.Mui-selected': {
                              backgroundColor: isDark(theme) ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
                              fontWeight: 500,
                              '&:hover': {
                                backgroundColor: isDark(theme) ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.12)'
                              }
                            }
                          }
                        }
                      }
                    }}
                  >
                    {accountTypesForSelect.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon && <Box sx={{ display: 'flex', alignItems: 'center' }}>{type.icon}</Box>}
                          <span>{type.label}</span>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {formData.type === 'bank' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Bank Name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="Enter bank name"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Account Number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="Enter account number"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Branch Name"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="Enter branch name"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="IBAN"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      placeholder="Enter IBAN"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="SWIFT Code"
                      value={formData.swift_code}
                      onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                      placeholder="Enter SWIFT code"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.has_chequebook}
                          onChange={(e) => setFormData({ ...formData, has_chequebook: e.target.checked })}
                        />
                      }
                      label="Has ChequeBook"
                    />
                  </Grid>
                </>
              )}

              {(formData.type === 'easypaisa' || formData.type === 'jazzcash') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Wallet Number *"
                    value={formData.wallet_number}
                    onChange={(e) => setFormData({ ...formData, wallet_number: e.target.value })}
                    placeholder="Enter wallet number"
                    required
                  />
                </Grid>
              )}

              {formData.type === 'raast_id' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Raast ID *"
                    value={formData.raast_id}
                    onChange={(e) => setFormData({ ...formData, raast_id: e.target.value })}
                    placeholder="Enter Raast ID"
                    required
                  />
                </Grid>
              )}

              {formData.type !== 'bank' && formData.type !== 'easypaisa' && formData.type !== 'jazzcash' && formData.type !== 'raast_id' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Account Number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="Enter account number"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Mobile Number"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      placeholder="Enter mobile number"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description (optional)"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          borderTop: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
          background: isDark(theme)
            ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
            : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
          '& .MuiButton-root': {
            borderRadius: '8px',
            textTransform: 'none',
            padding: '8px 20px',
            fontWeight: 500,
            transition: 'background-color 0.2s ease'
          }
        }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active"
          />
          <Box sx={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="outlined"
              onClick={() => setIsModalOpen(false)}
              sx={{ minWidth: '100px' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              form="account-form"
              sx={{ minWidth: '100px' }}
            >
              {editingAccount ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Account Types List Modal */}
      <ModalOverlay $isOpen={isAccountTypeModalOpen} onClick={() => setIsAccountTypeModalOpen(false)}>
        <Modal  onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <ModalHeader >
            <ModalTitle >
              <SettingsIcon />
              Manage Account Types
            </ModalTitle>
            <ModalCloseButton  onClick={() => setIsAccountTypeModalOpen(false)}>
              ×
            </ModalCloseButton>
          </ModalHeader>

          <div style={{ marginBottom: '1rem' }}>
            <ActionButton  onClick={handleCreateAccountType} style={{ width: '100%', justifyContent: 'center' }}>
              <Add style={{ fontSize: '1rem' }} />
              Add New Account Type
            </ActionButton>
          </div>

          {accountTypes.length === 0 ? (
            <EmptyState >
              <AccountCircle style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
              <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No account types found</div>
              <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>
                Click "Add New Account Type" to create your first custom account type
              </div>
            </EmptyState>
          ) : (
            <Table>
              <TableHead >
                <TableRow >
                  <TableHeaderCell >Type</TableHeaderCell>
                  <TableHeaderCell >Display Name</TableHeaderCell>
                  <TableHeaderCell >Status</TableHeaderCell>
                  <TableHeaderCell >Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {accountTypes.map((accountType) => (
                  <TableRow key={accountType.id} >
                    <TableCell >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getIconComponent(accountType.icon_name)}
                        <span style={{ fontWeight: 500 }}>{accountType.name}</span>
                        {accountType.is_system_type && (
                          <span style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY }}>(System)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell >
                      <div style={{ fontWeight: 600 }}>{accountType.display_name}</div>
                    </TableCell>
                    <TableCell >
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: accountType.is_active 
                          ? (isDark(theme) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
                          : (isDark(theme) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                        color: accountType.is_active ? '#22c55e' : '#ef4444'
                      }}>
                        {accountType.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell >
                      <ButtonGroup>
                        {!accountType.is_system_type && (
                          <>
                            <StyledIconButton  onClick={() => handleEditAccountType(accountType)} title="Edit">
                              <Edit />
                            </StyledIconButton>
                            <StyledIconButton  onClick={() => handleDeleteAccountType(accountType)} title="Delete">
                              <Delete />
                            </StyledIconButton>
                          </>
                        )}
                      </ButtonGroup>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </Modal>
      </ModalOverlay>

      {/* Account Type Form Modal (Create/Edit) */}
      <ModalOverlay $isOpen={isAccountTypeFormModalOpen} onClick={() => setIsAccountTypeFormModalOpen(false)}>
        <Modal  onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <ModalHeader >
            <ModalTitle >
              {editingAccountType ? <Edit /> : <Add />}
              {editingAccountType ? 'Edit Account Type' : 'Add New Account Type'}
            </ModalTitle>
            <ModalCloseButton  onClick={() => setIsAccountTypeFormModalOpen(false)}>
              ×
            </ModalCloseButton>
          </ModalHeader>

          <form onSubmit={handleSubmitAccountType}>
            <FormGroup>
              <Label >Display Name *</Label>
              <Input
                
                type="text"
                value={accountTypeFormData.display_name}
                onChange={(e) => setAccountTypeFormData({ ...accountTypeFormData, display_name: e.target.value })}
                required
                placeholder="e.g., PayPal, Stripe"
              />
            </FormGroup>

            <FormGroup>
              <Label >Icon *</Label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '0.75rem',
                padding: '0.75rem',
                border: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                borderRadius: '8px',
                background: isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.9)',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {[
                  { value: 'AccountBalance', label: 'Bank' },
                  { value: 'Payment', label: 'Payment' },
                  { value: 'CreditCard', label: 'Card' },
                  { value: 'AccountCircle', label: 'Default' },
                  { value: 'AccountBalanceWallet', label: 'Wallet' },
                  { value: 'Receipt', label: 'Receipt' },
                  { value: 'MonetizationOn', label: 'Money' },
                  { value: 'Savings', label: 'Savings' },
                  { value: 'LocalAtm', label: 'ATM' },
                  { value: 'Store', label: 'Store' },
                  { value: 'AttachMoney', label: 'Cash' },
                  { value: 'Description', label: 'Document' },
                  { value: 'AccountBox', label: 'Account' },
                  { value: 'Business', label: 'Business' },
                  { value: 'Wallet', label: 'Wallet' }
                ].map((iconOption) => {
                  const IconComponent = (Icons as any)[iconOption.value] || AccountCircle;
                  const isSelected = accountTypeFormData.icon_name === iconOption.value;
                  return (
                    <div
                      key={iconOption.value}
                      onClick={() => setAccountTypeFormData({ ...accountTypeFormData, icon_name: iconOption.value })}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: `2px solid ${isSelected ? theme.ACCENT : 'transparent'}`,
                        background: isSelected 
                          ? (isDark(theme) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                          : (isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                        transition: 'all 0.2s ease',
                        minHeight: '80px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isDark(theme) 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'rgba(0, 0, 0, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isDark(theme) 
                            ? 'rgba(255, 255, 255, 0.05)' 
                            : 'rgba(0, 0, 0, 0.03)';
                        }
                      }}
                    >
                      <IconComponent style={{ 
                        fontSize: '2rem', 
                        color: isSelected ? theme.ACCENT : theme.TEXT_PRIMARY,
                        marginBottom: '0.5rem'
                      }} />
                      <span style={{ 
                        fontSize: '0.7rem', 
                        color: isSelected ? theme.ACCENT : theme.TEXT_SECONDARY,
                        textAlign: 'center',
                        fontWeight: isSelected ? 600 : 400
                      }}>
                        {iconOption.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </FormGroup>

            <FormGroup>
              <Label  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={accountTypeFormData.is_active}
                  onChange={(e) => setAccountTypeFormData({ ...accountTypeFormData, is_active: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                Active
              </Label>
            </FormGroup>

            <ModalActions>
              <SecondaryButton  type="button" onClick={() => setIsAccountTypeFormModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton  type="submit">
                {editingAccountType ? 'Update' : 'Create'}
              </PrimaryButton>
            </ModalActions>
          </form>
        </Modal>
      </ModalOverlay>
    </PageContainer>
  );
};

export default SetupAccounts;




