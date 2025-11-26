import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import {
  History,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Receipt,
  Print as PrintIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  AttachMoney,
  CalendarToday,
  Person,
  School,
  Payment,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import Loader from '../components/Loader';
import { useLoading } from '../contexts/LoadingContext';
import { format } from 'date-fns';
import { CircularProgress, Button } from '@mui/material';
import ReactDOM from 'react-dom';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
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
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
    margin-bottom: 0.2rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
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
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const FiltersSection = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 0.75rem 1rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem;
    gap: 0.375rem;
    margin-bottom: 0.2rem;
  }
  
  @media (min-width: 769px) {
    flex-wrap: nowrap;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
  flex: 1;
  
  @media (max-width: 768px) {
    min-width: 0;
    flex: 1;
  }
`;

const FilterRow = styled.div`
  display: contents;
  
  @media (max-width: 768px) {
    display: flex;
    gap: 0.375rem;
    width: 100%;
  }
`;

const FilterLabel = styled.label`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
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
  transition: all 0.2s ease;
  
  &:hover, &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
  }
  
  & option {
    background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#ffffff'};
    color: ${({ theme }) => isDark(theme) ? '#e2e8f0' : '#1e293b'};
  }
`;

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  padding-left: 2.5rem;
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
  width: 100%;
  transition: all 0.2s ease;
  
  &:hover, &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
  }
  
  &::placeholder {
    color: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(0, 0, 0, 0.3)'};
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  pointer-events: none;
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const TableWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  max-height: 840px;
  min-height: 0;
  
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.2) transparent'
    : 'rgba(0, 0, 0, 0.2) transparent'};
  
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    
    &:hover {
      background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    }
  }
  
  @media (max-width: 768px) {
    max-height: none;
    overflow-y: visible;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
  
  @media (max-width: 768px) {
    min-width: 1000px;
  }
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
  position: sticky;
  top: 0;
  z-index: 10;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  white-space: nowrap;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.02)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.85rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 0.375rem;
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
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
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
  }
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

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyStateText = styled.div`
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const EmptyStateSubtext = styled.div`
  font-size: 0.9rem;
  opacity: 0.7;
`;

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(0, 0, 0, 0.7)'
    : 'rgba(0, 0, 0, 0.5)'};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  box-sizing: border-box;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 0;
  max-width: 500px;
  width: 100%;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
  overflow: hidden;
  
  @media (max-width: 768px) {
    max-width: 95%;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem 2rem;
  border-top: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.02)'};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
    flex-direction: column-reverse;
    
    button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'};
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

const DangerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: #ef4444;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.02)'};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    align-items: stretch;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    text-align: center;
    width: 100%;
    font-size: 0.85rem;
    line-height: 1.4;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.375rem;
  }
`;

const PaginationButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 36px;
  
  &:hover:not(:disabled) {
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
  
  &.active {
    background: ${({ theme }) => theme.ACCENT};
    color: #fff;
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    min-width: 32px;
    font-size: 0.8rem;
  }
`;

const PageInput = styled.input`
  width: 60px;
  padding: 0.5rem;
  border-radius: 6px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  text-align: center;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    width: 50px;
    padding: 0.4rem;
    font-size: 0.8rem;
  }
`;


// ===== TYPES =====

interface Payment {
  id: number;
  payment_date: string;
  amount: number;
  discount_amount: number;
  net_amount: number;
  payment_mode: string;
  received_by: number | null;
  remarks: string | null;
  created_at: string;
  fee_invoices?: {
    student_id: number;
    student?: {
      id: number;
      name: string;
      roll_number?: string | null;
      father_name?: string | null;
      class_id: number;
      section_id: number;
      current_class?: {
        name: string;
        section?: {
          name: string;
        };
      };
    };
  }[];
}

// ===== MAIN COMPONENT =====

const PaymentHistoryPage: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading, loading } = useLoading();

  // State Management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<number | null>(null);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1000;

  // Helper functions
  const formatCurrency = (value: number): string => {
    if (value % 1 === 0) {
      return String(value);
    }
    return value.toFixed(2);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getPaymentDisplayId = (paymentId: number) => `S${user?.school_id || 0}-${paymentId}`;
  
  const getUserName = (userId: number | null) => {
    if (!userId) return 'Unknown User';
    return users.find((u: any) => u.id === userId)?.name || 'Unknown User';
  };

  const getStudentName = (payment: Payment) => {
    const invoice = payment.fee_invoices?.[0];
    return invoice?.student?.name || 'N/A';
  };

  const getStudentDisplay = (payment: Payment): string => {
    const invoice = payment.fee_invoices?.[0];
    if (!invoice?.student) return 'N/A';
    return String(getStudentDisplayId(invoice.student));
  };

  const getStudentClass = (payment: Payment) => {
    const invoice = payment.fee_invoices?.[0];
    const className = invoice?.student?.current_class?.name || 'N/A';
    const sectionName = invoice?.student?.current_class?.section?.name;
    return sectionName ? `${className} - ${sectionName}` : className;
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = [...payments];
    
    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(p => {
        const invoice = p.fee_invoices?.[0];
        return invoice?.student?.class_id === Number(selectedClass);
      });
    }
    
    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(p => {
        const invoice = p.fee_invoices?.[0];
        return invoice?.student?.section_id === Number(selectedSection);
      });
    }
    
    // Filter by payment method
    if (selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(p => p.payment_mode === selectedPaymentMethod);
    }
    
    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.payment_date);
        paymentDate.setHours(0, 0, 0, 0);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        return paymentDate >= fromDate;
      });
    }
    
    if (dateTo) {
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.payment_date);
        paymentDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        return paymentDate <= toDate;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const studentName = getStudentName(p).toLowerCase();
        const studentId = getStudentDisplay(p).toLowerCase();
        const paymentId = getPaymentDisplayId(p.id).toLowerCase();
        const fatherName = p.fee_invoices?.[0]?.student?.father_name?.toLowerCase() || '';
        return studentName.includes(query) || studentId.includes(query) || paymentId.includes(query) || fatherName.includes(query);
      });
    }
    
    return filtered;
  }, [payments, selectedClass, selectedSection, selectedPaymentMethod, dateFrom, dateTo, searchQuery, user?.school_id]);

  // Calculate statistics from filtered payments
  const stats = useMemo(() => {
    const total = filteredPayments.length;
    const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalDiscount = filteredPayments.reduce((sum, p) => sum + Number(p.discount_amount || 0), 0);
    const totalNet = filteredPayments.reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0);
    
    return { total, totalAmount, totalDiscount, totalNet };
  }, [filteredPayments]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedSection, selectedPaymentMethod, dateFrom, dateTo, searchQuery]);

  // Fetch classes
  const fetchClasses = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name');
      
      if (error) throw error;
      if (data) {
        const sortedClasses = sortClasses(data);
        setClasses(sortedClasses);
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      showToast('Failed to load classes', 'error');
    }
  }, [user?.school_id, showToast]);

  // Fetch sections
  const fetchSections = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', user.school_id)
        .order('name');
      
      if (error) throw error;
      if (data) {
        setSections(data);
      }
    } catch (error: any) {
      console.error('Error fetching sections:', error);
      showToast('Failed to load sections', 'error');
    }
  }, [user?.school_id, showToast]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('school_id', user.school_id);
      
      if (error) throw error;
      if (data) {
        setUsers(data);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  }, [user?.school_id]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    if (!user?.school_id) {
      setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true);
    try {
      // Fetch all payments first
      const { data: paymentsData, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('school_id', user.school_id)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (paymentsData && paymentsData.length > 0) {
        // Get unique invoice IDs
        const invoiceIds = Array.from(new Set(paymentsData.map((p: any) => p.invoice_id).filter(Boolean)));
        
        // Fetch invoices to get student IDs
        const { data: invoicesData } = await supabase
          .from('fee_invoices')
          .select('id, student_id')
          .in('id', invoiceIds);
        
        // Get unique student IDs
        const studentIds = Array.from(new Set(invoicesData?.map((inv: any) => inv.student_id).filter(Boolean) || []));
        
        if (studentIds.length > 0) {
          // Fetch students with their class/section info
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, name, roll_number, father_name, class_id, section_id')
            .in('id', studentIds);
          
          const classIds = Array.from(new Set(studentsData?.map((s: any) => s.class_id).filter(Boolean) || []));
          const sectionIds = Array.from(new Set(studentsData?.map((s: any) => s.section_id).filter(Boolean) || []));
          
          const [classesResult, sectionsResult] = await Promise.all([
            classIds.length > 0 
              ? supabase.from('classes').select('id, name').in('id', classIds)
              : Promise.resolve({ data: [], error: null }),
            sectionIds.length > 0
              ? supabase.from('sections').select('id, name').in('id', sectionIds)
              : Promise.resolve({ data: [], error: null })
          ]);
          
          const classesMap = new Map((classesResult.data || []).map((c: any) => [c.id, c]));
          const sectionsMap = new Map((sectionsResult.data || []).map((s: any) => [s.id, s]));
          const studentsMap = new Map((studentsData || []).map((s: any) => [s.id, s]));
          const invoicesMap = new Map((invoicesData || []).map((inv: any) => [inv.id, inv]));
          
          // Enrich payment data with student and class/section info
          const enrichedPayments = paymentsData.map((payment: any) => {
            const invoice = invoicesMap.get(payment.invoice_id);
            const studentId = invoice?.student_id;
            const student = studentId ? studentsMap.get(studentId) : null;
            
            if (student) {
              const classInfo = student.class_id ? classesMap.get(student.class_id) : null;
              const sectionInfo = student.section_id ? sectionsMap.get(student.section_id) : null;
              
              return {
                ...payment,
                fee_invoices: [{
                  student_id: studentId,
                  student: {
                    ...student,
                    current_class: classInfo ? {
                      ...classInfo,
                      section: sectionInfo
                    } : null
                  }
                }]
              };
            }
            
            return {
              ...payment,
              fee_invoices: []
            };
          });
          
          setPayments(enrichedPayments as Payment[]);
        } else {
          setPayments([]);
        }
      } else {
        setPayments([]);
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      showToast('Failed to load payment history', 'error');
      setPayments([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [user?.school_id, showToast]);

  // Initial data fetch
  useEffect(() => {
    if (user?.school_id) {
      fetchClasses();
      fetchSections();
      fetchUsers();
      fetchPayments();
    }
  }, [user?.school_id, fetchClasses, fetchSections, fetchUsers, fetchPayments]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (user?.school_id) {
      fetchPayments();
      fetchClasses();
      fetchSections();
      fetchUsers();
      showToast('Data refreshed', 'success');
    }
  }, [user?.school_id, fetchPayments, fetchClasses, fetchSections, fetchUsers, showToast]);

  // Delete payment handlers
  const handleOpenDeleteModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedPayment(null);
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;

    try {
      setDeletingPayment(selectedPayment.id);
      setLoading(true);
      
      const { error } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', selectedPayment.id)
        .eq('school_id', user?.school_id);
      
      if (error) throw error;
      
      showToast('Payment deleted successfully', 'success');
      handleCloseDeleteModal();
      await fetchPayments();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    } finally {
      setDeletingPayment(null);
      setLoading(false);
    }
  };

  // Generate invoice/receipt functions (imported from FeeCollectionNew logic)
  const generateInvoiceForPayment = async (payment: Payment) => {
    // This would need to import the function from FeeCollectionNew or duplicate the logic
    showToast('Invoice generation will be implemented', 'success');
  };

  const generateThermalReceiptForPayment = async (payment: Payment) => {
    // This would need to import the function from FeeCollectionNew or duplicate the logic
    showToast('Thermal receipt generation will be implemented', 'success');
  };

  // Get unique payment methods
  const paymentMethods = useMemo(() => {
    const methods = new Set(payments.map(p => p.payment_mode).filter(Boolean));
    return Array.from(methods).sort();
  }, [payments]);

  if (isLoadingData) {
    return (
      <PageContainer theme={theme}>
        <Loader />
      </PageContainer>
    );
  }

  return (
    <PageContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <History style={{ fontSize: 28, color: theme.ACCENT }} />
          Payment History
        </HeaderTitle>
        <HeaderActions>
          <ActionButton theme={theme} onClick={handleRefresh} disabled={loading}>
            <RefreshIcon style={{ fontSize: 18 }} />
            Refresh
          </ActionButton>
        </HeaderActions>
      </Header>

      {/* Statistics */}
      <StatsGrid>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Payments</StatLabel>
          <StatValue theme={theme}>{stats.total}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Amount</StatLabel>
          <StatValue theme={theme}>Rs. {formatCurrency(stats.totalAmount)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Discount</StatLabel>
          <StatValue theme={theme} style={{ color: '#f59e0b' }}>Rs. {formatCurrency(stats.totalDiscount)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Net Amount</StatLabel>
          <StatValue theme={theme} style={{ color: '#22c55e' }}>Rs. {formatCurrency(stats.totalNet)}</StatValue>
        </StatCard>
      </StatsGrid>

      {/* Filters */}
      <FiltersSection theme={theme}>
        <SearchWrapper>
          <FilterLabel theme={theme}>Search</FilterLabel>
          <div style={{ position: 'relative' }}>
            <SearchIconWrapper theme={theme}>
              <SearchIcon style={{ fontSize: 18 }} />
            </SearchIconWrapper>
            <SearchInput
              theme={theme}
              type="text"
              placeholder="Search by student name, ID, or payment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </SearchWrapper>
        
        <FilterRow>
          <FilterGroup>
            <FilterLabel theme={theme}>Class</FilterLabel>
            <StyledSelect
              theme={theme}
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('all');
              }}
            >
              <option value="all">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </StyledSelect>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel theme={theme}>Section</FilterLabel>
            <StyledSelect
              theme={theme}
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={selectedClass === 'all'}
            >
              <option value="all">All Sections</option>
              {sections
                .filter(sec => selectedClass === 'all' || String(sec.class_id) === String(selectedClass))
                .map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
            </StyledSelect>
          </FilterGroup>
        </FilterRow>

        <FilterGroup>
          <FilterLabel theme={theme}>Payment Method</FilterLabel>
          <StyledSelect
            theme={theme}
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          >
            <option value="all">All Methods</option>
            {paymentMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </StyledSelect>
        </FilterGroup>

        <FilterRow>
          <FilterGroup>
            <FilterLabel theme={theme}>Date From</FilterLabel>
            <SearchInput
              theme={theme}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ paddingLeft: '0.75rem' }}
            />
          </FilterGroup>

          <FilterGroup>
            <FilterLabel theme={theme}>Date To</FilterLabel>
            <SearchInput
              theme={theme}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ paddingLeft: '0.75rem' }}
            />
          </FilterGroup>
        </FilterRow>
      </FiltersSection>

      {/* Table */}
      <TableContainer theme={theme}>
        <TableWrapper theme={theme}>
          <Table>
            <TableHeader theme={theme}>
              <tr>
                <TableHeaderCell theme={theme}>Payment ID</TableHeaderCell>
                <TableHeaderCell theme={theme}>Date</TableHeaderCell>
                <TableHeaderCell theme={theme}>Student</TableHeaderCell>
                <TableHeaderCell theme={theme}>Class/Section</TableHeaderCell>
                <TableHeaderCell theme={theme}>Amount</TableHeaderCell>
                <TableHeaderCell theme={theme}>Discount</TableHeaderCell>
                <TableHeaderCell theme={theme}>Net Amount</TableHeaderCell>
                <TableHeaderCell theme={theme}>Method</TableHeaderCell>
                <TableHeaderCell theme={theme}>Received By</TableHeaderCell>
                <TableHeaderCell theme={theme}>Remarks</TableHeaderCell>
                <TableHeaderCell theme={theme}>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedPayments.length === 0 ? (
                <TableRow theme={theme}>
                  <TableCell theme={theme} colSpan={11} style={{ textAlign: 'center', padding: '2rem' }}>
                    <EmptyState theme={theme}>
                      <EmptyStateIcon theme={theme}>
                        <History style={{ fontSize: 64, opacity: 0.3 }} />
                      </EmptyStateIcon>
                      <EmptyStateText theme={theme}>No payments found</EmptyStateText>
                      <EmptyStateSubtext theme={theme}>
                        {searchQuery || selectedClass !== 'all' || selectedSection !== 'all' || selectedPaymentMethod !== 'all' || dateFrom || dateTo
                          ? 'Try adjusting your filters'
                          : 'No payment records available'}
                      </EmptyStateSubtext>
                    </EmptyState>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map((payment) => (
                  <TableRow key={payment.id} theme={theme}>
                    <TableCell theme={theme} style={{ fontWeight: '600' }}>
                      {getPaymentDisplayId(payment.id)}
                    </TableCell>
                    <TableCell theme={theme}>
                      {formatDate(payment.payment_date)}
                    </TableCell>
                    <TableCell theme={theme}>
                      <div>
                        <div style={{ fontWeight: 600, color: theme.TEXT_PRIMARY }}>
                          {getStudentName(payment)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                          {getStudentDisplay(payment)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell theme={theme}>
                      {getStudentClass(payment)}
                    </TableCell>
                    <TableCell theme={theme}>
                      Rs. {formatCurrency(Number(payment.amount || 0))}
                    </TableCell>
                    <TableCell theme={theme}>
                      {Number(payment.discount_amount || 0) > 0 ? (
                        <span style={{ color: '#f59e0b', fontWeight: '500' }}>
                          Rs. {formatCurrency(Number(payment.discount_amount || 0))}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell theme={theme} style={{ fontWeight: '600' }}>
                      Rs. {formatCurrency(Number(payment.net_amount || payment.amount || 0))}
                    </TableCell>
                    <TableCell theme={theme}>
                      {payment.payment_mode}
                    </TableCell>
                    <TableCell theme={theme}>
                      {payment.received_by ? `${payment.received_by} - ${getUserName(payment.received_by)}` : '-'}
                    </TableCell>
                    <TableCell theme={theme}>
                      {payment.remarks || '-'}
                    </TableCell>
                    <TableCell theme={theme}>
                      <ActionButtons>
                        <IconButton 
                          theme={theme} 
                          onClick={() => generateInvoiceForPayment(payment)} 
                          title="Generate Invoice"
                        >
                          <Receipt style={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton 
                          theme={theme} 
                          onClick={() => generateThermalReceiptForPayment(payment)} 
                          title="Generate Thermal Receipt"
                        >
                          <PrintIcon style={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton 
                          theme={theme} 
                          onClick={() => handleOpenDeleteModal(payment)} 
                          title="Delete Payment"
                        >
                          {deletingPayment === payment.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <DeleteIcon style={{ fontSize: 16 }} />
                          )}
                        </IconButton>
                      </ActionButtons>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>
        
        {/* Pagination Controls */}
        {filteredPayments.length > 0 && (
          <PaginationContainer theme={theme}>
            <PaginationInfo theme={theme}>
              Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
            </PaginationInfo>
            <PaginationControls>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                ««
              </PaginationButton>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                title="Previous page"
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
                title="Next page"
              >
                ›
              </PaginationButton>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                »»
              </PaginationButton>
            </PaginationControls>
          </PaginationContainer>
        )}
      </TableContainer>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedPayment && (
        <ModalOverlay theme={theme} onClick={handleCloseDeleteModal}>
          <ModalContent theme={theme} onClick={(e) => e.stopPropagation()}>
            <ModalHeader theme={theme}>
              <ModalTitle theme={theme}>
                <DeleteIcon style={{ fontSize: 24, color: '#ef4444' }} />
                Delete Payment
              </ModalTitle>
              <IconButton theme={theme} onClick={handleCloseDeleteModal}>
                <CloseIcon style={{ fontSize: 20 }} />
              </IconButton>
            </ModalHeader>
            <ModalBody theme={theme}>
              <div style={{ color: theme.TEXT_PRIMARY, lineHeight: 1.6 }}>
                Are you sure you want to delete this payment?
                <div style={{ marginTop: '1rem', padding: '1rem', background: isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', borderRadius: '8px' }}>
                  <div><strong>Payment ID:</strong> {getPaymentDisplayId(selectedPayment.id)}</div>
                  <div><strong>Student:</strong> {getStudentName(selectedPayment)}</div>
                  <div><strong>Amount:</strong> Rs. {formatCurrency(Number(selectedPayment.amount || 0))}</div>
                  <div><strong>Date:</strong> {formatDate(selectedPayment.payment_date)}</div>
                </div>
                <div style={{ marginTop: '1rem', color: '#ef4444', fontWeight: 500 }}>
                  This action cannot be undone and will affect the student's fee balance.
                </div>
              </div>
            </ModalBody>
            <ModalFooter theme={theme}>
              <SecondaryButton theme={theme} onClick={handleCloseDeleteModal}>
                <CloseIcon style={{ fontSize: 18 }} />
                Cancel
              </SecondaryButton>
              <DangerButton onClick={handleDeletePayment} disabled={loading || deletingPayment === selectedPayment.id}>
                <DeleteIcon style={{ fontSize: 18 }} />
                Delete
              </DangerButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default PaymentHistoryPage;

