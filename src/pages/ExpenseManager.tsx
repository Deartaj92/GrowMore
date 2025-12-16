import React, { useEffect, useState, useContext } from 'react';
import styled, { css } from 'styled-components';
import { useTheme, useMediaQuery } from '@mui/material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachMoney,
  Category as CategoryIcon,
  CheckCircle,
  Cancel,
  Pending,
  Receipt,
  Download,
  Print,
  Visibility,
  VisibilityOff,
  Description,
  AccountCircle,
  Info as InfoIcon,
} from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import { FormControl, InputLabel, Select, MenuItem, Box, TextField, SelectChangeEvent, Dialog, DialogContent, DialogActions, Typography, Grid, IconButton, Button } from '@mui/material';
import { supabase } from '../supabaseClient';
import { expenseService } from '../services/expenseService';
import { Expense, ExpenseCategory, ExpenseFilters } from '../types/expense';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { useLoading } from '../contexts/LoadingContext';
import Loader from '../components/Loader';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Styled Components
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
  will-change: transform;
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
  min-height: 36px;
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
  min-width: 120px;
  max-width: 180px;
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

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
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
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return css`
        background: ${theme.ACCENT};
        color: white;
        &:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      `;
    }
    if (variant === 'danger') {
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
  margin-bottom: 8px;
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
  padding: 8px 0;
`;

const ExpensesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb'};
  position: sticky;
  top: 0;
  z-index: 5;
`;

const TableHeaderRow = styled.tr``;

const TableHeaderCell = styled.th`
  padding: 12px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ status?: string }>`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
  transition: background 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb'};
  }
`;

const TableCell = styled.td`
  padding: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  
  ${({ status }) => {
    switch (status) {
      case 'approved':
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
      case 'paid':
        return css`
          background: #3b82f620;
          color: #3b82f6;
        `;
      default:
        return css`
          background: #6b728020;
          color: #6b7280;
        `;
    }
  }}
`;

const CategoryBadge = styled.span<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ color }) => `${color}20`};
  color: ${({ color }) => color};
`;

const AmountCell = styled(TableCell)`
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const ActionCell = styled(TableCell)`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const StyledIconButton = styled.button`
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

// Modal Styles
const ModalOverlay = styled.div<{ open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.open ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1300;
  backdrop-filter: blur(4px);
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const ModalBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const Input = styled.input`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.ACCENT}20`};
  }
`;

const TextArea = styled.textarea`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.ACCENT}20`};
  }
`;

const StyledSelect = styled.select`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.ACCENT}20`};
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

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

const ExpenseManager: React.FC = () => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLocalLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    paymentMethod: 'Cash',
    referenceNumber: '',
    vendorName: '',
    vendorContact: '',
    status: 'pending',
  });
  
  // Payment-related state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    loadData();
  }, [user?.school_id]);

  useEffect(() => {
    if (user?.school_id) {
      loadExpenses();
    }
  }, [user?.school_id, filters, searchQuery]);

  // Helper function to get icon component from account type
  const getAccountTypeIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || AccountCircle;
    return React.createElement(IconComponent);
  };

  // Get account type label
  const getAccountTypeLabel = (account: any) => {
    const accountType = accountTypes.find(t => t.name === account.type);
    return accountType?.display_name || account.type;
  };

  // Get payment method options (Cash + Cheque + Accounts)
  const paymentMethodOptions = React.useMemo(() => {
    const options: Array<{ value: string; label: string; isAccount: boolean; accountId?: number; icon?: React.ReactElement }> = [
      { value: 'Cash', label: 'Cash', isAccount: false, icon: React.createElement(AttachMoney) },
      { value: 'Cheque', label: 'Cheque', isAccount: false, icon: React.createElement(Description) }
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

  const loadData = async () => {
    if (!user?.school_id) return;
    
    try {
      setLocalLoading(true);
      const [categoriesData, expensesData, accountsData, accountTypesData] = await Promise.all([
        expenseService.getExpenseCategories(user.school_id),
        expenseService.getExpenses(user.school_id, { ...filters, searchQuery }),
        supabase.from('accounts').select('*').eq('school_id', user.school_id).eq('is_active', true).order('name'),
        supabase.from('account_types').select('*').or(`school_id.eq.1,school_id.eq.${user.school_id}`).eq('is_active', true).order('display_name'),
      ]);
      setCategories(categoriesData);
      setExpenses(expensesData);
      if (accountsData.data) setAccounts(accountsData.data);
      if (accountTypesData.data) {
        // Deduplicate account types (prefer system types)
        const uniqueTypes = new Map();
        accountTypesData.data.forEach((type: any) => {
          if (!uniqueTypes.has(type.name) || type.school_id === 1) {
            uniqueTypes.set(type.name, type);
          }
        });
        // Sort: system types first, then custom, "other" at end
        const sortedTypes = Array.from(uniqueTypes.values()).sort((a, b) => {
          if (a.name === 'other' && b.name !== 'other') return 1;
          if (a.name !== 'other' && b.name === 'other') return -1;
          if (a.is_system_type && !b.is_system_type) return -1;
          if (!a.is_system_type && b.is_system_type) return 1;
          return a.display_name.localeCompare(b.display_name);
        });
        setAccountTypes(sortedTypes);
      }
    } catch (error: any) {
      showToast('Error loading data: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLocalLoading(false);
    }
  };

  const loadExpenses = async () => {
    if (!user?.school_id) return;
    
    try {
      const data = await expenseService.getExpenses(user.school_id, { ...filters, searchQuery });
      setExpenses(data);
    } catch (error: any) {
      showToast('Error loading expenses: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      description: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      categoryId: categories[0]?.id.toString() || '',
      paymentMethod: 'Cash',
      referenceNumber: '',
      vendorName: '',
      vendorContact: '',
      status: 'pending',
    });
    setSelectedAccountId(null);
    setTransactionId('');
    setChequeNumber('');
    setIsModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    // Determine payment method display value
    let paymentMethodValue = expense.paymentMethod;
    if (expense.paymentMethod === 'account' && expense.accountId) {
      paymentMethodValue = `account_${expense.accountId}`;
    } else if (expense.paymentMethod === 'cash') {
      paymentMethodValue = 'Cash';
    } else if (expense.paymentMethod === 'cheque') {
      paymentMethodValue = 'Cheque';
    }
    setFormData({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate,
      categoryId: expense.categoryId.toString(),
      paymentMethod: paymentMethodValue,
      referenceNumber: expense.referenceNumber || '',
      vendorName: expense.vendorName || '',
      vendorContact: expense.vendorContact || '',
      status: expense.status,
    });
    setSelectedAccountId(expense.accountId || null);
    setTransactionId(expense.transactionId || '');
    setChequeNumber(expense.chequeNumber || '');
    setIsModalOpen(true);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!user?.school_id) return;
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      setLoading(true);
      await expenseService.deleteExpense(id, user.school_id);
      showToast('Expense deleted successfully', 'success');
      loadExpenses();
    } catch (error: any) {
      showToast('Error deleting expense: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!user?.school_id || !user?.id) return;
    
    if (!formData.title || !formData.amount || !formData.categoryId) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      setLoading(true);
      // Determine payment method and account ID
      let paymentMethod = formData.paymentMethod;
      let accountId: number | undefined = undefined;
      
      if (formData.paymentMethod.startsWith('account_')) {
        accountId = parseInt(formData.paymentMethod.replace('account_', ''));
        // Store 'account' as payment method for database constraint
        paymentMethod = 'account';
      } else if (formData.paymentMethod === 'Cash') {
        paymentMethod = 'cash';
      } else if (formData.paymentMethod === 'Cheque') {
        paymentMethod = 'cheque';
      }
      
      const expenseData = {
        schoolId: user.school_id,
        categoryId: parseInt(formData.categoryId),
        title: formData.title,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        paymentMethod: paymentMethod as any,
        referenceNumber: formData.referenceNumber || undefined,
        vendorName: formData.vendorName || undefined,
        vendorContact: formData.vendorContact || undefined,
        status: formData.status as any,
        createdBy: user.id,
        accountId: accountId,
        transactionId: transactionId && transactionId.trim() ? transactionId.trim() : undefined,
        chequeNumber: chequeNumber && chequeNumber.trim() ? chequeNumber.trim() : undefined,
      };
      
      if (editingExpense) {
        await expenseService.updateExpense(editingExpense.id, user.school_id, expenseData);
        showToast('Expense updated successfully', 'success');
      } else {
        await expenseService.createExpense(expenseData);
        showToast('Expense created successfully', 'success');
      }
      
      setIsModalOpen(false);
      loadExpenses();
    } catch (error: any) {
      showToast('Error saving expense: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManageCategories = () => {
    setIsCategoryModalOpen(true);
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsAddingCategory(true);
    setCategoryFormData({
      name: '',
      description: '',
      color: '#3b82f6',
    });
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setIsAddingCategory(false);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
    });
  };

  const handleSaveCategory = async () => {
    if (!user?.school_id) return;
    
    if (!categoryFormData.name) {
      showToast('Please enter a category name', 'error');
      return;
    }
    
    try {
      setLoading(true);
      if (editingCategory) {
        await expenseService.updateExpenseCategory(
          editingCategory.id,
          user.school_id,
          categoryFormData
        );
        showToast('Category updated successfully', 'success');
      } else {
        await expenseService.createExpenseCategory({
          schoolId: user.school_id,
          ...categoryFormData,
          isActive: true,
        });
        showToast('Category created successfully', 'success');
      }
      
      setEditingCategory(null);
      setIsAddingCategory(false);
      loadData();
    } catch (error: any) {
      showToast('Error saving category: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!user?.school_id) return;
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      setLoading(true);
      await expenseService.deleteExpenseCategory(id, user.school_id);
      showToast('Category deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast('Error deleting category: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Expense Report', 14, 20);
    
    const tableData = expenses.map(exp => {
      // Format payment method with transaction ID or cheque number
      let paymentMethodDisplay = exp.paymentMethod.replace('_', ' ').toUpperCase();
      
      if (exp.paymentMethod === 'account' && exp.account) {
        paymentMethodDisplay = exp.account.name;
        if (exp.transactionId) {
          paymentMethodDisplay += `\nTrx ID: ${exp.transactionId}`;
        }
      } else if (exp.paymentMethod === 'cheque' && exp.chequeNumber) {
        paymentMethodDisplay = `Cheque\nCheque #: ${exp.chequeNumber}`;
      }
      
      return [
        format(new Date(exp.expenseDate), 'MMM dd, yyyy'),
        exp.title,
        exp.category?.name || 'N/A',
        paymentMethodDisplay,
        `Rs. ${exp.amount.toFixed(2)}`,
        exp.status,
      ];
    });
    
    autoTable(doc, {
      head: [['Date', 'Title', 'Category', 'Payment Method', 'Amount', 'Status']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9 },
      columnStyles: {
        3: { cellWidth: 40 } // Payment Method column wider to accommodate multi-line text
      }
    });
    
    doc.save(`expenses-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle style={{ fontSize: '14px' }} />;
      case 'pending':
        return <Pending style={{ fontSize: '14px' }} />;
      case 'rejected':
        return <Cancel style={{ fontSize: '14px' }} />;
      case 'paid':
        return <Receipt style={{ fontSize: '14px' }} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Header>
          <Title>Expense Manager</Title>
          <ActionButtons>
            <SearchBar>
              <SearchIcon style={{ fontSize: '16px', color: theme.TEXT_SECONDARY }} />
              <SearchInput
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchBar>
            <StyledButton variant="secondary" onClick={handleManageCategories}>
              <CategoryIcon style={{ fontSize: '16px' }} />
              Categories
            </StyledButton>
            <StyledButton variant="secondary" onClick={handleExportPDF}>
              <Download style={{ fontSize: '16px' }} />
              Export
            </StyledButton>
            <StyledButton variant="primary" onClick={handleAddExpense}>
              <AddIcon style={{ fontSize: '16px' }} />
              Add Expense
            </StyledButton>
          </ActionButtons>
        </Header>

        <FiltersContainer>
          <FilterSelect
            value={filters.categoryId || ''}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value ? parseInt(e.target.value) : undefined })}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </FilterSelect>
          
          <FilterSelect
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </FilterSelect>
          
          <FilterSelect
            value={filters.paymentMethod || ''}
            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value || undefined })}
          >
            <option value="">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="other">Other</option>
          </FilterSelect>
          
          <Input
            type="date"
            placeholder="Start Date"
            value={filters.startDate || ''}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          />
          
          <Input
            type="date"
            placeholder="End Date"
            value={filters.endDate || ''}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          />
        </FiltersContainer>

        <ContentArea>
          {expenses.length === 0 ? (
            <EmptyState>
              <EmptyStateIcon>💰</EmptyStateIcon>
              <EmptyStateText>No expenses found. Add your first expense to get started.</EmptyStateText>
            </EmptyState>
          ) : (
            <ExpensesTable>
              <TableHeader>
                <TableHeaderRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Payment Method</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id} status={expense.status}>
                    <TableCell>{format(new Date(expense.expenseDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{expense.title}</TableCell>
                    <TableCell>
                      {expense.category && (
                        <CategoryBadge color={expense.category.color}>
                          {expense.category.name}
                        </CategoryBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.paymentMethod === 'account' && expense.account
                        ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div>{expense.account.name}</div>
                              {expense.transactionId && (
                                <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>
                                  Trx ID: {expense.transactionId}
                                </div>
                              )}
                            </div>
                          )
                        : expense.paymentMethod === 'cheque' && expense.chequeNumber
                        ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div>Cheque</div>
                              <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                                Cheque #: {expense.chequeNumber}
                              </div>
                            </div>
                          )
                        : expense.paymentMethod.replace('_', ' ').toUpperCase()}
                    </TableCell>
                    <AmountCell>Rs. {expense.amount.toFixed(2)}</AmountCell>
                    <TableCell>
                      <StatusBadge status={expense.status}>
                        {getStatusIcon(expense.status)}
                        {expense.status.toUpperCase()}
                      </StatusBadge>
                    </TableCell>
                    <ActionCell>
                      <StyledIconButton onClick={() => handleEditExpense(expense)} title="Edit">
                        <EditIcon style={{ fontSize: '16px' }} />
                      </StyledIconButton>
                      <StyledIconButton onClick={() => handleDeleteExpense(expense.id)} title="Delete">
                        <DeleteIcon style={{ fontSize: '16px' }} />
                      </StyledIconButton>
                    </ActionCell>
                  </TableRow>
                ))}
              </TableBody>
            </ExpensesTable>
          )}
        </ContentArea>

        {/* Expense Modal */}
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
              {editingExpense ? <EditIcon /> : <AddIcon />}
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
            <form id="expense-form" onSubmit={(e) => { e.preventDefault(); handleSaveExpense(); }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Title *"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Enter expense title"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter expense description"
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
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat.id} value={cat.id.toString()}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Amount"
                    type="number"
                    inputProps={{ step: 0.01, min: 0 }}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Expense Date"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
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
                        // Extract account ID if it's an account payment
                        if (value.startsWith('account_')) {
                          const accountId = parseInt(value.replace('account_', ''));
                          setSelectedAccountId(accountId);
                        } else {
                          setSelectedAccountId(null);
                          setTransactionId(''); // Clear transaction ID when not using account
                        }
                        // Clear cheque number if not cheque
                        if (value !== 'Cheque') {
                          setChequeNumber('');
                        }
                      }}
                      required
                    >
                      {paymentMethodOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {option.icon && <Box sx={{ display: 'flex', alignItems: 'center' }}>{option.icon}</Box>}
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
                      <Box sx={{ 
                        padding: '0.75rem', 
                        background: theme.CARD, 
                        borderRadius: '8px',
                        border: `1px solid ${theme.BORDER}`,
                        fontSize: '0.85rem'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: '0.5rem' }}>
                          <InfoIcon sx={{ fontSize: '1rem', color: theme.ACCENT }} />
                          <strong>Selected Account Details:</strong>
                        </Box>
                        {(() => {
                          const selectedAccount = accounts.find(a => a.id === selectedAccountId);
                          if (!selectedAccount) return null;
                          const accountType = accountTypes.find(t => t.name === selectedAccount.type);
                          return (
                            <Box sx={{ paddingLeft: '1.5rem', color: theme.TEXT_SECONDARY }}>
                              <div><strong>Name:</strong> {selectedAccount.name}</div>
                              <div><strong>Type:</strong> {accountType?.display_name || selectedAccount.type}</div>
                              {selectedAccount.type === 'bank' && (
                                <>
                                  {selectedAccount.bank_name && <div><strong>Bank:</strong> {selectedAccount.bank_name}</div>}
                                  {selectedAccount.account_number && <div><strong>Account:</strong> {selectedAccount.account_number}</div>}
                                  {selectedAccount.iban && <div><strong>IBAN:</strong> {selectedAccount.iban}</div>}
                                </>
                              )}
                              {(selectedAccount.type === 'easypaisa' || selectedAccount.type === 'jazzcash') && (
                                <>
                                  {selectedAccount.wallet_number && <div><strong>Wallet:</strong> {selectedAccount.wallet_number}</div>}
                                </>
                              )}
                              {selectedAccount.type === 'raast_id' && (
                                <>
                                  {selectedAccount.raast_id && <div><strong>Raast ID:</strong> {selectedAccount.raast_id}</div>}
                                </>
                              )}
                              {selectedAccount.type !== 'bank' && selectedAccount.type !== 'easypaisa' && selectedAccount.type !== 'jazzcash' && selectedAccount.type !== 'raast_id' && (
                                <>
                                  {selectedAccount.account_number && <div><strong>Account:</strong> {selectedAccount.account_number}</div>}
                                  {selectedAccount.mobile_number && <div><strong>Mobile:</strong> {selectedAccount.mobile_number}</div>}
                                </>
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
                        onChange={(e) => setTransactionId(e.target.value)}
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
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="Enter cheque number"
                      required
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Reference Number"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="Additional reference (optional)"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Vendor Name"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    placeholder="Supplier/vendor name"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Vendor Contact"
                    value={formData.vendorContact}
                    onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })}
                    placeholder="Vendor contact information"
                  />
                </Grid>
              </Grid>
            </form>
          </DialogContent>

          <Box sx={{
            display: 'flex',
            justifyContent: 'flex-end',
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
              form="expense-form"
              sx={{ minWidth: '100px' }}
            >
              {editingExpense ? 'Update' : 'Create'} Expense
            </Button>
          </Box>
        </Dialog>

        {/* Category Management Modal */}
        <ModalOverlay open={isCategoryModalOpen} onClick={() => setIsCategoryModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <ModalHeader>
              <ModalTitle>Manage Categories</ModalTitle>
              <ActionButtons>
                <StyledButton variant="primary" onClick={handleAddCategory} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  <AddIcon style={{ fontSize: '14px' }} />
                  Add
                </StyledButton>
                <StyledIconButton onClick={() => setIsCategoryModalOpen(false)}>
                  <CloseIcon />
                </StyledIconButton>
              </ActionButtons>
            </ModalHeader>
            <ModalBody>
              {(editingCategory !== null || isAddingCategory) ? (
                <>
                  <FormGroup>
                    <Label>Category Name *</Label>
                    <Input
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Description</Label>
                    <TextArea
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    />
                  </FormGroup>
                  <ActionButtons>
                    <StyledButton variant="secondary" onClick={() => {
                      setEditingCategory(null);
                      setIsAddingCategory(false);
                    }}>
                      Cancel
                    </StyledButton>

                    <StyledButton variant="primary" onClick={handleSaveCategory}>
                      Save
                    </StyledButton>
                  </ActionButtons>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: theme.FIELD_BG,
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: cat.color,
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      </div>
                      <ActionButtons>
                        <StyledIconButton onClick={() => handleEditCategory(cat)}>
                          <EditIcon style={{ fontSize: '16px' }} />
                        </StyledIconButton>
                        <StyledIconButton onClick={() => handleDeleteCategory(cat.id)}>
                          <DeleteIcon style={{ fontSize: '16px' }} />
                        </StyledIconButton>
                      </ActionButtons>
                    </div>
                  ))}
                </div>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      </PageContainer>
    </ThemeProvider>
  );
};

export default ExpenseManager;

