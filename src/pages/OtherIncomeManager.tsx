import React, { useContext, useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { useTheme as useMuiTheme, useMediaQuery, Box, Button, Dialog, DialogContent, FormControl, Grid, IconButton, InputLabel, MenuItem, Select, SelectChangeEvent, TextField, Typography, Checkbox, FormControlLabel } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
  Download as DownloadIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  AccountCircle as AccountCircleIcon,
  Info as InfoIcon,
  CheckCircle,
  Pending,
  Cancel,
  Check as CheckIcon,
  ArrowUpward,
  ArrowDownward,
  UnfoldMore,
} from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { useLoading } from '../contexts/LoadingContext';
import Loader from '../components/Loader';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';
import { supabase } from '../supabaseClient';
import { incomeService } from '../services/incomeService';
import { Income, IncomeCategory, IncomeFilters } from '../types/income';
import * as Icons from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import AppDateField from '../components/shared/AppDateField';

// =============== Styled layout components (adapted from ExpenseManager) ===============

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  padding: 2px 6px;
  min-width: 140px;
  max-width: 220px;
  width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  outline: none;
  width: 100%;
  margin-left: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const StyledButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return css`
        background: ${theme.ACCENT};
        color: white;
        &:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      `;
    }
    if ($variant === 'danger') {
      return css`
        background: #ef4444;
        color: white;
        &:hover {
          opacity: 0.9;
        }
      `;
    }
    return css`
      background: ${theme.FIELD_BG};
      color: ${theme.TEXT_PRIMARY};
      border: 1px solid ${theme.FIELD_BORDER};
      &:hover {
        background: ${theme.BG === '#252525' ? '#353535' : '#f3f4f6'};
      }
    `;
  }}
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  margin-bottom: 0;
`;

const FilterSelect = styled.select`
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  outline: none;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb')};
  position: sticky;
  top: 0;
  z-index: 10;
  
  th:first-child {
    border-top-left-radius: 8px;
  }
  
  th:last-child {
    border-top-right-radius: 8px;
  }
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: 12px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  border-right: 1px solid ${({ theme }) => theme.BORDER}40;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  position: relative;
  transition: background 0.2s;
  
  &:hover {
    background: ${({ theme, $sortable }) =>
      $sortable ? (theme.BG === '#252525' ? '#333333' : '#f0f0f0') : 'transparent'};
  }
  
  &:last-child {
    cursor: default;
    border-right: none;
  }
`;

const SortIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  vertical-align: middle;
  opacity: 0.6;
  
  svg {
    font-size: 14px;
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $status?: string }>`
  border-bottom: 1px solid ${({ theme }) => `${theme.BORDER}40`};
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb')};
  }
  
  &:last-child td:first-child {
    border-bottom-left-radius: 8px;
  }
  
  &:last-child td:last-child {
    border-bottom-right-radius: 8px;
  }
`;

const Td = styled.td`
  padding: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER}40;
  
  &:last-child {
    border-right: none;
  }
`;

const AmountCell = styled(Td)`
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;

  ${({ $status }) => {
    switch ($status) {
      case 'approved':
      case 'received':
        return css`
          background: #10b98120;
          color: #10b981;
        `;
      case 'pending':
        return css`
          background: #f59e0b20;
          color: #f59e0b;
        `;
      case 'rejected':
        return css`
          background: #ef444420;
          color: #ef4444;
        `;
      default:
        return css`
          background: #6b728020;
          color: #6b7280;
        `;
    }
  }}
`;

const CategoryBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
`;

const ActionCell = styled(Td)`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const IconButtonStyled = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.FIELD_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  margin: 0;
`;

// =============== Confirmation Modal ===============
const ConfirmationModalOverlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: ${props => props.$open ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

const ConfirmationModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.BORDER};
  animation: slideIn 0.2s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const ConfirmationModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ConfirmationModalMessage = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const ConfirmationModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ConfirmationButton = styled.button<{ $variant: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  
  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return css`
        background: ${theme.ACCENT};
        color: white;
        &:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        &:active {
          transform: translateY(0);
        }
      `;
    } else if ($variant === 'danger') {
      return css`
        background: #ef4444;
        color: white;
        &:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }
        &:active {
          transform: translateY(0);
        }
      `;
    } else {
      return css`
        background: ${theme.FIELD_BG};
        color: ${theme.TEXT_PRIMARY};
        border: 1px solid ${theme.FIELD_BORDER};
        &:hover {
          background: ${theme.BG === '#252525' ? '#353535' : '#f3f4f6'};
        }
      `;
    }
  }}
`;

// =============== Helpers ===============

const isDark = (themeObj: any) => themeObj.BG === '#252525';

const getAccountTypeIcon = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName] || AccountCircleIcon;
  return React.createElement(IconComponent);
};

// =============== Component ===============

const OtherIncomeManager: React.FC = () => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme === 'dark' ? darkTheme : lightTheme;

  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();

  const muiTheme = useMuiTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountTypes, setAccountTypes] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<IncomeFilters>({});

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { setFooterContent } = usePageFooter();
  const isMobile = useMediaQuery('(max-width: 700px)');

  const [localLoading, setLocalLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IncomeCategory | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [confirmationModal, setConfirmationModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDeleteStep?: boolean;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDeleteStep: false,
  });

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paidWithCheque, setPaidWithCheque] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    incomeDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    paymentMethod: 'Cash',
    payerName: '',
    payerContact: '',
    status: 'pending' as Income['status'],
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    color: '#22c55e',
  });

  // Payment method options: cash, cheque, and all active accounts
  const paymentMethodOptions = useMemo(
    () => {
      const baseOptions: Array<{ value: string; label: string; isAccount: boolean; accountId?: number; icon?: React.ReactElement }> = [
        { value: 'Cash', label: 'Cash', isAccount: false, icon: React.createElement(AttachMoneyIcon) },
        { value: 'Cheque', label: 'Cheque', isAccount: false, icon: React.createElement(DescriptionIcon) },
      ];

      accounts.forEach(account => {
        const typeInfo = accountTypes.find((t: any) => t.name === account.type);
        const displayName = typeInfo?.display_name || account.name;
        baseOptions.push({
          value: `account_${account.id}`,
          label: `${displayName} - ${account.name}`,
          isAccount: true,
          accountId: account.id,
          icon: typeInfo ? getAccountTypeIcon(typeInfo.icon_name) : undefined,
        });
      });

      return baseOptions;
    },
    [accounts, accountTypes]
  );

  // Get accounts with chequebook for cheque payments
  const accountsWithChequebook = useMemo(() => {
    return accounts.filter(account => account.has_chequebook === true);
  }, [accounts]);

  // Initial data load
  useEffect(() => {
    if (!user?.school_id) return;

    const loadAll = async () => {
      if (!user?.school_id) return;
      
      try {
        setLocalLoading(true);
        const [categoryData, incomeData, accountsData, accountTypesData] = await Promise.all([
          incomeService.getIncomeCategories(user.school_id),
          incomeService.getIncomes(user.school_id, { ...filters, searchQuery }),
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
            .order('display_name'),
        ]);

        setCategories(categoryData);
        setIncomes(incomeData);

        if (accountsData.data) setAccounts(accountsData.data);
        if (accountTypesData.data) {
          const uniqueTypes = new Map();
          accountTypesData.data.forEach((t: any) => {
            if (!uniqueTypes.has(t.name) || t.school_id === 1) {
              uniqueTypes.set(t.name, t);
            }
          });
          const sortedTypes = Array.from(uniqueTypes.values()).sort((a: any, b: any) => {
            if (a.name === 'other' && b.name !== 'other') return 1;
            if (a.name !== 'other' && b.name === 'other') return -1;
            if (a.is_system_type && !b.is_system_type) return -1;
            if (!a.is_system_type && b.is_system_type) return 1;
            return a.display_name.localeCompare(b.display_name);
          });
          setAccountTypes(sortedTypes);
        }
      } catch (err: any) {
        showToast('Error loading incomes: ' + (err.message || 'Unknown error'), 'error');
      } finally {
        setLocalLoading(false);
      }
    };

    loadAll();
  }, [user?.school_id]);

  // Reload incomes when filters or search query change
  useEffect(() => {
    if (!user?.school_id) return;

    const loadIncomes = async () => {
      if (!user?.school_id) return;
      
      try {
        const data = await incomeService.getIncomes(user.school_id, { ...filters, searchQuery });
        setIncomes(data);
      } catch (err: any) {
        showToast('Error loading incomes: ' + (err.message || 'Unknown error'), 'error');
      }
    };

    loadIncomes();
  }, [user?.school_id, filters, searchQuery, showToast]);

  // Auto-select first category when categories load and modal is open (for new income)
  useEffect(() => {
    if (isModalOpen && !editingIncome && categories.length > 0 && !formData.categoryId) {
      setFormData(prev => ({
        ...prev,
        categoryId: categories[0].id.toString(),
      }));
    }
  }, [categories, isModalOpen, editingIncome, formData.categoryId]);

  // =============== Handlers: Income CRUD ===============

  const openAddIncomeModal = () => {
    setEditingIncome(null);
    setFormData({
      title: '',
      description: '',
      amount: '',
      incomeDate: new Date().toISOString().split('T')[0],
      categoryId: categories[0]?.id.toString() || '',
      paymentMethod: 'Cash',
      payerName: '',
      payerContact: '',
      status: 'pending',
    });
    setSelectedAccountId(null);
    setTransactionId('');
    setChequeNumber('');
    setPaidWithCheque(false);
    setIsModalOpen(true);
  };

  const openEditIncomeModal = (income: Income) => {
    setEditingIncome(income);

    let paymentValue: string = income.paymentMethod;
    if (income.paymentMethod === 'account' && income.accountId) {
      paymentValue = `account_${income.accountId}`;
      // Check if this was a cheque payment
      if (income.chequeNumber) {
        setPaidWithCheque(true);
      }
    } else if (income.paymentMethod === 'cash') {
      paymentValue = 'Cash';
    }

    setFormData({
      title: income.title,
      description: income.description || '',
      amount: income.amount.toString(),
      incomeDate: income.incomeDate,
      categoryId: income.categoryId.toString(),
      paymentMethod: paymentValue,
      payerName: income.payerName || '',
      payerContact: income.payerContact || '',
      status: income.status,
    });

    setSelectedAccountId(income.accountId || null);
    setTransactionId(income.transactionId || '');
    setChequeNumber(income.chequeNumber || '');
    setIsModalOpen(true);
  };

  const handleDeleteIncome = async (income: Income) => {
    if (!user?.school_id) return;
    
    // First confirmation step
    setConfirmationModal({
      open: true,
      title: 'Delete Income',
      message: `Are you sure you want to delete "${income.title}"?`,
      isDeleteStep: false,
      onConfirm: () => {
        // Second confirmation step - irreversible warning
        setConfirmationModal({
          open: true,
          title: 'Confirm Deletion',
          message: 'This action cannot be reversed. Please confirm to permanently delete this income record.',
          isDeleteStep: true,
          onConfirm: async () => {
            if (!user?.school_id) return;
            try {
              setLoading(true);
              await incomeService.deleteIncome(income.id, user.school_id);
              showToast('Income deleted successfully', 'success');
              const data = await incomeService.getIncomes(user.school_id, { ...filters, searchQuery });
              setIncomes(data);
              setConfirmationModal({ open: false, title: '', message: '', onConfirm: () => {}, isDeleteStep: false });
            } catch (err: any) {
              showToast('Error deleting income: ' + (err.message || 'Unknown error'), 'error');
            } finally {
              setLoading(false);
            }
          },
        });
      },
    });
  };

  const handleMarkAsReceived = async (income: Income) => {
    if (!user?.school_id) return;
    
    setConfirmationModal({
      open: true,
      title: 'Mark as Received',
      message: `Are you sure you want to mark "${income.title}" as received?`,
      onConfirm: async () => {
        if (!user?.school_id) return;
        try {
          setLoading(true);
          await incomeService.updateIncome(income.id, user.school_id, { status: 'received' });
          showToast('Income marked as received successfully', 'success');
          const data = await incomeService.getIncomes(user.school_id, { ...filters, searchQuery });
          setIncomes(data);
          setConfirmationModal({ open: false, title: '', message: '', onConfirm: () => {} });
        } catch (err: any) {
          showToast('Error updating income: ' + (err.message || 'Unknown error'), 'error');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSaveIncome = async () => {
    if (!user?.school_id || !user?.id) return;

    if (!formData.title || !formData.amount || !formData.categoryId) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);

      let paymentMethod = formData.paymentMethod;
      let accountId: number | undefined;

      if (formData.paymentMethod.startsWith('account_')) {
        accountId = parseInt(formData.paymentMethod.replace('account_', ''), 10);
        paymentMethod = 'account';
      } else if (formData.paymentMethod === 'Cash') {
        paymentMethod = 'cash';
      } else if (formData.paymentMethod === 'Cheque') {
        paymentMethod = 'cheque';
      }

      const payload: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'account'> = {
        schoolId: user.school_id,
        categoryId: parseInt(formData.categoryId, 10),
        title: formData.title,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        incomeDate: formData.incomeDate,
        paymentMethod: paymentMethod as any,
        accountId,
        transactionId: transactionId && transactionId.trim() ? transactionId.trim() : undefined,
        chequeNumber: chequeNumber && chequeNumber.trim() ? chequeNumber.trim() : undefined,
        payerName: formData.payerName || undefined,
        payerContact: formData.payerContact || undefined,
        status: formData.status,
        approvedBy: undefined,
        approvedAt: undefined,
        createdBy: user.id,
      };

      if (editingIncome) {
        await incomeService.updateIncome(editingIncome.id, user.school_id, payload);
        showToast('Income updated successfully', 'success');
      } else {
        await incomeService.createIncome(payload);
        showToast('Income created successfully', 'success');
      }

      setIsModalOpen(false);
      const data = await incomeService.getIncomes(user.school_id, { ...filters, searchQuery });
      setIncomes(data);
    } catch (err: any) {
      showToast('Error saving income: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // =============== Handlers: Categories ===============

  const openCategoryManager = () => {
    setIsCategoryModalOpen(true);
    setEditingCategory(null);
    setIsAddingCategory(false);
  };

  const startAddCategory = () => {
    setEditingCategory(null);
    setIsAddingCategory(true);
    setCategoryFormData({ name: '', description: '', color: '#22c55e' });
  };

  const startEditCategory = (category: IncomeCategory) => {
    setEditingCategory(category);
    setIsAddingCategory(false);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
    });
  };

  const saveCategory = async () => {
    if (!user?.school_id) return;
    if (!categoryFormData.name) {
      showToast('Please enter a category name', 'error');
      return;
    }

    try {
      setLoading(true);
      if (editingCategory) {
        await incomeService.updateIncomeCategory(editingCategory.id, user.school_id, {
          name: categoryFormData.name,
          description: categoryFormData.description,
          color: categoryFormData.color,
        });
        showToast('Category updated successfully', 'success');
      } else {
        await incomeService.createIncomeCategory({
          schoolId: user.school_id,
          name: categoryFormData.name,
          description: categoryFormData.description,
          color: categoryFormData.color,
          isActive: true,
        });
        showToast('Category created successfully', 'success');
      }

      setEditingCategory(null);
      setIsAddingCategory(false);

      const freshCategories = await incomeService.getIncomeCategories(user.school_id);
      setCategories(freshCategories);
    } catch (err: any) {
      showToast('Error saving category: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!user?.school_id) return;
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      setLoading(true);
      await incomeService.deleteIncomeCategory(id, user.school_id);
      showToast('Category deleted successfully', 'success');
      const freshCategories = await incomeService.getIncomeCategories(user.school_id);
      setCategories(freshCategories);
    } catch (err: any) {
      showToast('Error deleting category: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // =============== Export ===============

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text('Other Income Report', 14, 20);

    const body = incomes.map(inc => {
      let paymentLabel = inc.paymentMethod.replace('_', ' ').toUpperCase();

      if (inc.paymentMethod === 'account' && inc.account) {
        paymentLabel = inc.account.name;
        if (inc.transactionId) {
          paymentLabel += `\nTrx ID: ${inc.transactionId}`;
        }
      } else if (inc.paymentMethod === 'cheque' && inc.chequeNumber) {
        paymentLabel = `Cheque\nCheque #: ${inc.chequeNumber}`;
      }

      return [
        format(new Date(inc.incomeDate), 'MMM dd, yyyy'),
        inc.title,
        inc.category?.name || 'N/A',
        paymentLabel,
        `Rs. ${inc.amount.toFixed(2)}`,
        inc.status,
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Title', 'Category', 'Payment Method', 'Amount', 'Status']],
      body,
      startY: 30,
      styles: { fontSize: 9 },
      columnStyles: {
        3: { cellWidth: 40 },
      },
    });

    doc.save(`other-incomes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const getStatusIcon = (status: Income['status']) => {
    switch (status) {
      case 'approved':
      case 'received':
        return <CheckCircle style={{ fontSize: '14px' }} />;
      case 'pending':
        return <Pending style={{ fontSize: '14px' }} />;
      case 'rejected':
        return <Cancel style={{ fontSize: '14px' }} />;
      default:
        return null;
    }
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <UnfoldMore style={{ fontSize: '14px' }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUpward style={{ fontSize: '14px' }} />
    ) : (
      <ArrowDownward style={{ fontSize: '14px' }} />
    );
  };

  // Sort incomes based on current sort settings
  const sortedIncomes = useMemo(() => {
    if (!sortColumn) return incomes;

    const sorted = [...incomes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'date':
          aValue = new Date(a.incomeDate).getTime();
          bValue = new Date(b.incomeDate).getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category?.name || '';
          bValue = b.category?.name || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [incomes, sortColumn, sortDirection]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = sortedIncomes.length;
    const totalAmount = sortedIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const pendingCount = sortedIncomes.filter(inc => inc.status === 'pending').length;
    const pendingAmount = sortedIncomes
      .filter(inc => inc.status === 'pending')
      .reduce((sum, inc) => sum + inc.amount, 0);
    const receivedCount = sortedIncomes.filter(inc => inc.status === 'received').length;
    const receivedAmount = sortedIncomes
      .filter(inc => inc.status === 'received')
      .reduce((sum, inc) => sum + inc.amount, 0);
    
    return {
      total,
      totalAmount,
      pendingCount,
      pendingAmount,
      receivedCount,
      receivedAmount,
    };
  }, [sortedIncomes]);

  // Set footer content
  useEffect(() => {
    if (incomes.length === 0) {
      setFooterContent(null);
      return;
    }

    const FooterContentComponent = React.memo(() => (
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        width: '100%',
        gap: isMobile ? '6px' : '12px',
        flexWrap: 'wrap',
        fontSize: isMobile ? '0.8rem' : '0.85rem',
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: theme.TEXT_PRIMARY }}>
            Total: <span style={{ color: theme.ACCENT }}>{summary.total}</span> incomes
          </span>
          <span style={{ opacity: 0.6 }}>•</span>
          <span style={{ fontWeight: 600, color: theme.TEXT_PRIMARY }}>
            Amount: <span style={{ color: theme.ACCENT }}>Rs. {summary.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#f59e0b' }}>
            Pending: {summary.pendingCount} (Rs. {summary.pendingAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </span>
          <span style={{ opacity: 0.6 }}>•</span>
          <span style={{ color: '#10b981' }}>
            Received: {summary.receivedCount} (Rs. {summary.receivedAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </span>
        </div>
      </div>
    ));

    setFooterContent({
      visible: true,
      content: <FooterContentComponent />,
    });

    return () => {
      setFooterContent(null);
    };
  }, [summary, incomes.length, isMobile, theme, setFooterContent]);

  if (localLoading) {
    return <Loader />;
  }

  return (
    <ThemeContext.Provider value={themeCtx}>
      <PageContainer>
        {/* Header */}
        <Header>
          <Title>Other Income Manager</Title>
          <ActionButtons>
            <SearchBar>
              <SearchIcon style={{ fontSize: '16px', color: theme.TEXT_SECONDARY }} />
              <SearchInput
                placeholder="Search incomes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </SearchBar>
            <StyledButton $variant="secondary" onClick={openCategoryManager}>
              <CategoryIcon style={{ fontSize: '16px' }} />
              Categories
            </StyledButton>
            <StyledButton $variant="secondary" onClick={handleExportPdf}>
              <DownloadIcon style={{ fontSize: '16px' }} />
              Export
            </StyledButton>
            <StyledButton $variant="primary" onClick={openAddIncomeModal}>
              <AddIcon style={{ fontSize: '16px' }} />
              Add Income
            </StyledButton>
          </ActionButtons>
        </Header>

        {/* Filters */}
        <FiltersContainer>
          <FilterSelect
            value={filters.categoryId || ''}
            onChange={e =>
              setFilters({
                ...filters,
                categoryId: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={filters.status || ''}
            onChange={e =>
              setFilters({
                ...filters,
                status: e.target.value || undefined,
              })
            }
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
          </FilterSelect>

          <FilterSelect
            value={filters.paymentMethod || ''}
            onChange={e =>
              setFilters({
                ...filters,
                paymentMethod: e.target.value || undefined,
              })
            }
          >
            <option value="">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="other">Other</option>
          </FilterSelect>

          <AppDateField
            size="small"
            label="Start Date"
            value={filters.startDate || ''}
            onChange={e =>
              setFilters({
                ...filters,
                startDate: e.target.value || undefined,
              })
            }
            textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 160 } }}
          />

          <AppDateField
            size="small"
            label="End Date"
            value={filters.endDate || ''}
            onChange={e =>
              setFilters({
                ...filters,
                endDate: e.target.value || undefined,
              })
            }
            textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 160 } }}
          />
        </FiltersContainer>

        {/* Table / Empty state */}
        <ContentArea>
          {incomes.length === 0 ? (
            <EmptyState>
              <EmptyStateIcon>💸</EmptyStateIcon>
              <EmptyStateText>
                No other income records found. Add your first record to get started.
              </EmptyStateText>
            </EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <Th $sortable onClick={() => handleSort('date')}>
                    Date
                    <SortIcon>{getSortIcon('date')}</SortIcon>
                  </Th>
                  <Th $sortable onClick={() => handleSort('title')}>
                    Title
                    <SortIcon>{getSortIcon('title')}</SortIcon>
                  </Th>
                  <Th $sortable onClick={() => handleSort('category')}>
                    Category
                    <SortIcon>{getSortIcon('category')}</SortIcon>
                  </Th>
                  <Th>Payment Method</Th>
                  <Th $sortable onClick={() => handleSort('amount')}>
                    Amount
                    <SortIcon>{getSortIcon('amount')}</SortIcon>
                  </Th>
                  <Th $sortable onClick={() => handleSort('status')}>
                    Status
                    <SortIcon>{getSortIcon('status')}</SortIcon>
                  </Th>
                  <Th>Actions</Th>
                </tr>
              </TableHeader>
              <Tbody>
                {sortedIncomes.map(inc => (
                  <Tr key={inc.id} $status={inc.status}>
                    <Td>{format(new Date(inc.incomeDate), 'MMM dd, yyyy')}</Td>
                    <Td>{inc.title}</Td>
                    <Td>
                      {inc.category && (
                        <CategoryBadge $color={inc.category.color}>{inc.category.name}</CategoryBadge>
                      )}
                    </Td>
                    <Td>
                      {inc.paymentMethod === 'account' && inc.account ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div>{inc.account.name}</div>
                          {inc.chequeNumber && (
                            <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                              Cheque #: {inc.chequeNumber}
                            </div>
                          )}
                          {inc.transactionId && !inc.chequeNumber && (
                            <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>
                              Trx ID: {inc.transactionId}
                            </div>
                          )}
                        </div>
                      ) : inc.paymentMethod === 'cheque' && inc.chequeNumber ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div>Cheque (Legacy)</div>
                          <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                            Cheque #: {inc.chequeNumber}
                          </div>
                        </div>
                      ) : (
                        inc.paymentMethod.replace('_', ' ').toUpperCase()
                      )}
                    </Td>
                    <AmountCell>Rs. {inc.amount.toFixed(2)}</AmountCell>
                    <Td>
                      <StatusBadge $status={inc.status}>
                        {getStatusIcon(inc.status)}
                        {inc.status.toUpperCase()}
                      </StatusBadge>
                    </Td>
                    <ActionCell>
                      {inc.status === 'pending' && (
                        <IconButtonStyled
                          onClick={() => handleMarkAsReceived(inc)}
                          title="Mark as Received"
                          style={{ color: '#10b981' }}
                        >
                          <CheckIcon style={{ fontSize: '16px' }} />
                        </IconButtonStyled>
                      )}
                      <IconButtonStyled onClick={() => openEditIncomeModal(inc)} title="Edit">
                        <EditIcon style={{ fontSize: '16px' }} />
                      </IconButtonStyled>
                      <IconButtonStyled onClick={() => handleDeleteIncome(inc)} title="Delete">
                        <DeleteIcon style={{ fontSize: '16px' }} />
                      </IconButtonStyled>
                    </ActionCell>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </ContentArea>

        {/* Add/Edit Income Modal */}
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
                backgroundColor: isDark(theme)
                  ? 'rgba(0, 0, 0, 0.5)'
                  : 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              },
            },
          }}
          PaperProps={{
            sx: {
              borderRadius: '16px',
              background: theme.CARD,
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
                sm: 'calc(100% - 100px)',
              },
              position: 'relative',
              zIndex: 1301,
              isolation: 'isolate',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: `1px solid ${
                isDark(theme)
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.05)'
              }`,
              background: isDark(theme)
                ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: theme.ACCENT,
                textShadow: isDark(theme) ? '0 2px 4px rgba(0, 0, 0, 0.5)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {editingIncome ? <EditIcon /> : <AddIcon />}
              {editingIncome ? 'Edit Income' : 'Add New Income'}
            </Typography>
            <IconButton onClick={() => setIsModalOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <DialogContent
            sx={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxHeight: 'calc(100vh - 180px)',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: isDark(theme)
                ? 'rgba(255, 255, 255, 0.2) transparent'
                : 'rgba(0, 0, 0, 0.2) transparent',
              '&::-webkit-scrollbar': {
                width: '8px',
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
                borderRadius: '4px',
                margin: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: isDark(theme)
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                border: `2px solid ${theme.CARD}`,
                '&:hover': {
                  backgroundColor: isDark(theme)
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(0, 0, 0, 0.3)',
                },
              },
              background: isDark(theme)
                ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
              '& .MuiFormControl-root': {
                transition: 'background-color 0.2s ease',
              },
              '& .MuiInputBase-root': {
                background: isDark(theme)
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(255, 255, 255, 0.8)',
                borderRadius: '8px',
                border: isDark(theme)
                  ? '1px solid rgba(255, 255, 255, 0.05)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
                transition: 'background-color 0.2s ease',
                '&:hover, &.Mui-focused': {
                  background: isDark(theme)
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.9)',
                },
                '& .MuiSelect-select, & .MuiInputBase-input': {
                  padding: '12px 14px',
                  fontSize: '0.95rem',
                  '&::placeholder': {
                    color: isDark(theme)
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'rgba(0, 0, 0, 0.3)',
                    opacity: 1,
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
              },
            }}
          >
            <form
              id="other-income-form"
              onSubmit={e => {
                e.preventDefault();
                handleSaveIncome();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Title *"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Enter income title"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter income description"
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.categoryId}
                      label="Category"
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                      disabled={categories.length === 0}
                    >
                      {categories.length === 0 ? (
                        <MenuItem disabled value="">
                          No categories available. Please create one first.
                        </MenuItem>
                      ) : (
                        categories.map(cat => (
                          <MenuItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  {categories.length === 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        marginTop: '4px',
                        color: theme.TEXT_SECONDARY,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CategoryIcon sx={{ fontSize: '14px' }} />
                      Click "Categories" button in the header to create income categories first.
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Amount"
                    type="number"
                    inputProps={{ 
                      step: 0.01, 
                      min: 0,
                      style: { 
                        MozAppearance: 'textfield',
                      }
                    }}
                    sx={{
                      '& input[type=number]': {
                        MozAppearance: 'textfield',
                      },
                      '& input[type=number]::-webkit-outer-spin-button': {
                        WebkitAppearance: 'none',
                        margin: 0,
                      },
                      '& input[type=number]::-webkit-inner-spin-button': {
                        WebkitAppearance: 'none',
                        margin: 0,
                      },
                    }}
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <AppDateField
                    fullWidth
                    size="small"
                    label="Income Date"
                    value={formData.incomeDate}
                    onChange={e => setFormData({ ...formData, incomeDate: e.target.value })}
                    required
                    textFieldProps={{ InputLabelProps: { shrink: true } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={e =>
                        setFormData({ ...formData, status: e.target.value as Income['status'] })
                      }
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="received">Received</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={formData.paymentMethod}
                      label="Payment Method"
                      onChange={(e: SelectChangeEvent<string>) => {
                        const value = e.target.value;
                        setFormData({ ...formData, paymentMethod: value });

                        if (value.startsWith('account_')) {
                          const id = parseInt(value.replace('account_', ''), 10);
                          setSelectedAccountId(id);
                        } else {
                          setSelectedAccountId(null);
                          setTransactionId('');
                        }

                        if (value !== 'Cheque') {
                          setChequeNumber('');
                        }
                      }}
                      required
                    >
                      {paymentMethodOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {option.icon && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>{option.icon}</Box>
                            )}
                            <span>{option.label}</span>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {selectedAccountId && (
                  <>
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          padding: '0.75rem',
                          background: theme.CARD,
                          borderRadius: '8px',
                          border: `1px solid ${theme.BORDER}`,
                          fontSize: '0.85rem',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            marginBottom: '0.5rem',
                          }}
                        >
                          <InfoIcon sx={{ fontSize: '1rem', color: theme.ACCENT }} />
                          <strong>Selected Account Details:</strong>
                        </Box>
                        {(() => {
                          const account = accounts.find(a => a.id === selectedAccountId);
                          if (!account) return null;
                          const typeInfo = accountTypes.find((t: any) => t.name === account.type);
                          return (
                            <Box sx={{ paddingLeft: '1.5rem', color: theme.TEXT_SECONDARY }}>
                              <div>
                                <strong>Name:</strong> {account.name}
                              </div>
                              <div>
                                <strong>Type:</strong>{' '}
                                {typeInfo?.display_name || account.type}
                              </div>
                              {account.bank_name && (
                                <div>
                                  <strong>Bank:</strong> {account.bank_name}
                                </div>
                              )}
                              {account.account_number && (
                                <div>
                                  <strong>Account:</strong> {account.account_number}
                                </div>
                              )}
                              {account.wallet_number && (
                                <div>
                                  <strong>Wallet:</strong> {account.wallet_number}
                                </div>
                              )}
                              {account.mobile_number && (
                                <div>
                                  <strong>Mobile:</strong> {account.mobile_number}
                                </div>
                              )}
                              {account.iban && (
                                <div>
                                  <strong>IBAN:</strong> {account.iban}
                                </div>
                              )}
                              {account.raast_id && (
                                <div>
                                  <strong>Raast ID:</strong> {account.raast_id}
                                </div>
                              )}
                            </Box>
                          );
                        })()}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Transaction ID"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        placeholder="Enter transaction ID (optional)"
                      />
                    </Grid>
                  </>
                )}

                {formData.paymentMethod === 'Cheque' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Cheque Number *"
                      value={chequeNumber}
                      onChange={e => setChequeNumber(e.target.value)}
                      placeholder="Enter cheque number"
                      required
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Payer Name"
                    value={formData.payerName}
                    onChange={e => setFormData({ ...formData, payerName: e.target.value })}
                    placeholder="Name of payer (optional)"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Payer Contact"
                    value={formData.payerContact}
                    onChange={e => setFormData({ ...formData, payerContact: e.target.value })}
                    placeholder="Contact info (optional)"
                  />
                </Grid>
              </Grid>
            </form>
          </DialogContent>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 24px',
              borderTop: `1px solid ${
                isDark(theme)
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.05)'
              }`,
              background: isDark(theme)
                ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
                : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
              '& .MuiButton-root': {
                borderRadius: '8px',
                textTransform: 'none',
                padding: '8px 20px',
                fontWeight: 500,
                transition: 'background-color 0.2s ease',
              },
            }}
          >
            <Button variant="outlined" onClick={() => setIsModalOpen(false)} sx={{ minWidth: '100px' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              form="other-income-form"
              sx={{ minWidth: '100px' }}
            >
              {editingIncome ? 'Update' : 'Create'} Income
            </Button>
          </Box>
        </Dialog>

        {/* Category Management Modal (simple custom modal using styled components) */}
        {isCategoryModalOpen && (
          <div
            onClick={() => setIsCategoryModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: theme.CARD,
                borderRadius: 16,
                maxWidth: 500,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: `1px solid ${theme.BORDER}`,
                }}
              >
                <ModalTitle>Manage Income Categories</ModalTitle>
                <ActionButtons>
                  <StyledButton
                    $variant="primary"
                    onClick={startAddCategory}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    <AddIcon style={{ fontSize: '14px' }} />
                    Add
                  </StyledButton>
                  <IconButtonStyled onClick={() => setIsCategoryModalOpen(false)}>
                    <CloseIcon />
                  </IconButtonStyled>
                </ActionButtons>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {editingCategory !== null || isAddingCategory ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Category Name *</label>
                      <input
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          border: `1px solid ${theme.FIELD_BORDER}`,
                          background: theme.FIELD_BG,
                          color: theme.TEXT_PRIMARY,
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                        value={categoryFormData.name}
                        onChange={e =>
                          setCategoryFormData({ ...categoryFormData, name: e.target.value })
                        }
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Description</label>
                      <textarea
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          border: `1px solid ${theme.FIELD_BORDER}`,
                          background: theme.FIELD_BG,
                          color: theme.TEXT_PRIMARY,
                          fontSize: '0.9rem',
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: 80,
                        }}
                        value={categoryFormData.description}
                        onChange={e =>
                          setCategoryFormData({ ...categoryFormData, description: e.target.value })
                        }
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Color</label>
                      <input
                        type="color"
                        style={{
                          padding: 0,
                          width: 60,
                          height: 32,
                          borderRadius: 8,
                          border: `1px solid ${theme.FIELD_BORDER}`,
                          background: theme.FIELD_BG,
                        }}
                        value={categoryFormData.color}
                        onChange={e =>
                          setCategoryFormData({ ...categoryFormData, color: e.target.value })
                        }
                      />
                    </div>

                    <ActionButtons>
                      <StyledButton
                        $variant="secondary"
                        onClick={() => {
                          setEditingCategory(null);
                          setIsAddingCategory(false);
                        }}
                      >
                        Cancel
                      </StyledButton>
                      <StyledButton $variant="primary" onClick={saveCategory}>
                        Save
                      </StyledButton>
                    </ActionButtons>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {categories.map(cat => (
                      <div
                        key={cat.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 12,
                          background: theme.FIELD_BG,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              background: cat.color,
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{cat.name}</span>
                        </div>
                        <ActionButtons>
                          <IconButtonStyled onClick={() => startEditCategory(cat)}>
                            <EditIcon style={{ fontSize: '16px' }} />
                          </IconButtonStyled>
                          <IconButtonStyled onClick={() => deleteCategory(cat.id)}>
                            <DeleteIcon style={{ fontSize: '16px' }} />
                          </IconButtonStyled>
                        </ActionButtons>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModalOverlay
          $open={confirmationModal.open}
          onClick={() => setConfirmationModal({ open: false, title: '', message: '', onConfirm: () => {}, isDeleteStep: false })}
        >
          <ConfirmationModalContent onClick={(e) => e.stopPropagation()}>
            <ConfirmationModalTitle>
              {confirmationModal.isDeleteStep ? (
                <DeleteIcon style={{ fontSize: '20px', color: '#ef4444' }} />
              ) : (
                <CheckCircle style={{ fontSize: '20px', color: theme.ACCENT }} />
              )}
              {confirmationModal.title}
            </ConfirmationModalTitle>
            <ConfirmationModalMessage>{confirmationModal.message}</ConfirmationModalMessage>
            <ConfirmationModalActions>
              <ConfirmationButton
                $variant="secondary"
                onClick={() => setConfirmationModal({ open: false, title: '', message: '', onConfirm: () => {}, isDeleteStep: false })}
              >
                Cancel
              </ConfirmationButton>
              <ConfirmationButton
                $variant={confirmationModal.isDeleteStep ? 'danger' : 'primary'}
                onClick={() => {
                  confirmationModal.onConfirm();
                }}
                style={confirmationModal.isDeleteStep ? { background: '#ef4444', color: 'white' } : undefined}
              >
                {confirmationModal.isDeleteStep ? (
                  <>
                    <DeleteIcon style={{ fontSize: '16px' }} />
                    Confirm Delete
                  </>
                ) : (
                  <>
                    <CheckIcon style={{ fontSize: '16px' }} />
                    Confirm
                  </>
                )}
              </ConfirmationButton>
            </ConfirmationModalActions>
          </ConfirmationModalContent>
        </ConfirmationModalOverlay>
      </PageContainer>
    </ThemeContext.Provider>
  );
};

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

export default OtherIncomeManager;

