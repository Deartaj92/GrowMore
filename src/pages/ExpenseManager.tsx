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
} from '@mui/icons-material';
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
  height: 92vh;
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

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
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

const IconButton = styled.button`
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

const Select = styled.select`
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

const ExpenseManager: React.FC = () => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  
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
    paymentMethod: 'cash',
    referenceNumber: '',
    vendorName: '',
    vendorContact: '',
    status: 'pending',
  });
  
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

  const loadData = async () => {
    if (!user?.school_id) return;
    
    try {
      setLocalLoading(true);
      const [categoriesData, expensesData] = await Promise.all([
        expenseService.getExpenseCategories(user.school_id),
        expenseService.getExpenses(user.school_id, { ...filters, searchQuery }),
      ]);
      setCategories(categoriesData);
      setExpenses(expensesData);
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
      paymentMethod: 'cash',
      referenceNumber: '',
      vendorName: '',
      vendorContact: '',
      status: 'pending',
    });
    setIsModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate,
      categoryId: expense.categoryId.toString(),
      paymentMethod: expense.paymentMethod,
      referenceNumber: expense.referenceNumber || '',
      vendorName: expense.vendorName || '',
      vendorContact: expense.vendorContact || '',
      status: expense.status,
    });
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
      const expenseData = {
        schoolId: user.school_id,
        categoryId: parseInt(formData.categoryId),
        title: formData.title,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        paymentMethod: formData.paymentMethod as any,
        referenceNumber: formData.referenceNumber || undefined,
        vendorName: formData.vendorName || undefined,
        vendorContact: formData.vendorContact || undefined,
        status: formData.status as any,
        createdBy: user.id,
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
    
    const tableData = expenses.map(exp => [
      format(new Date(exp.expenseDate), 'MMM dd, yyyy'),
      exp.title,
      exp.category?.name || 'N/A',
      exp.paymentMethod,
      `Rs. ${exp.amount.toFixed(2)}`,
      exp.status,
    ]);
    
    autoTable(doc, {
      head: [['Date', 'Title', 'Category', 'Payment Method', 'Amount', 'Status']],
      body: tableData,
      startY: 30,
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
    return (
      <ThemeProvider theme={theme}>
        <PageContainer>
          <Loader />
        </PageContainer>
      </ThemeProvider>
    );
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
            <Button variant="secondary" onClick={handleManageCategories}>
              <CategoryIcon style={{ fontSize: '16px' }} />
              Categories
            </Button>
            <Button variant="secondary" onClick={handleExportPDF}>
              <Download style={{ fontSize: '16px' }} />
              Export
            </Button>
            <Button variant="primary" onClick={handleAddExpense}>
              <AddIcon style={{ fontSize: '16px' }} />
              Add Expense
            </Button>
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
                    <TableCell>{expense.paymentMethod.replace('_', ' ').toUpperCase()}</TableCell>
                    <AmountCell>Rs. {expense.amount.toFixed(2)}</AmountCell>
                    <TableCell>
                      <StatusBadge status={expense.status}>
                        {getStatusIcon(expense.status)}
                        {expense.status.toUpperCase()}
                      </StatusBadge>
                    </TableCell>
                    <ActionCell>
                      <IconButton onClick={() => handleEditExpense(expense)} title="Edit">
                        <EditIcon style={{ fontSize: '16px' }} />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteExpense(expense.id)} title="Delete">
                        <DeleteIcon style={{ fontSize: '16px' }} />
                      </IconButton>
                    </ActionCell>
                  </TableRow>
                ))}
              </TableBody>
            </ExpensesTable>
          )}
        </ContentArea>

        {/* Expense Modal */}
        <ModalOverlay open={isModalOpen} onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</ModalTitle>
              <IconButton onClick={() => setIsModalOpen(false)}>
                <CloseIcon />
              </IconButton>
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter expense title"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter expense description"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Category *</Label>
                <Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Expense Date *</Label>
                <Input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Reference Number</Label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="Cheque number, transaction ID, etc."
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Vendor Name</Label>
                <Input
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  placeholder="Supplier/vendor name"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Vendor Contact</Label>
                <Input
                  value={formData.vendorContact}
                  onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })}
                  placeholder="Vendor contact information"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid</option>
                </Select>
              </FormGroup>
              
              <ActionButtons style={{ marginTop: '8px' }}>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveExpense}>
                  {editingExpense ? 'Update' : 'Create'} Expense
                </Button>
              </ActionButtons>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>

        {/* Category Management Modal */}
        <ModalOverlay open={isCategoryModalOpen} onClick={() => setIsCategoryModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <ModalHeader>
              <ModalTitle>Manage Categories</ModalTitle>
              <ActionButtons>
                <Button variant="primary" onClick={handleAddCategory} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  <AddIcon style={{ fontSize: '14px' }} />
                  Add
                </Button>
                <IconButton onClick={() => setIsCategoryModalOpen(false)}>
                  <CloseIcon />
                </IconButton>
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
                    <Button variant="secondary" onClick={() => {
                      setEditingCategory(null);
                      setIsAddingCategory(false);
                    }}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveCategory}>
                      Save
                    </Button>
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
                        <IconButton onClick={() => handleEditCategory(cat)}>
                          <EditIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteCategory(cat.id)}>
                          <DeleteIcon style={{ fontSize: '16px' }} />
                        </IconButton>
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

