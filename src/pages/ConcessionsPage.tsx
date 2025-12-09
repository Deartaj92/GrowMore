import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { feeService } from '../services/feeService';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import {
  Loyalty,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Person,
  School,
  AttachMoney,
  CalendarToday,
  CheckCircle,
  ErrorOutline,
  Warning,
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Group,
  Visibility,
  VisibilityOff,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import Loader from '../components/Loader';
import { useLoading } from '../contexts/LoadingContext';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
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
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    margin-bottom: 0.2rem;
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
    width: 100%;
    justify-content: space-between;
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
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
  flex: 1;
  
  @media (max-width: 768px) {
    min-width: 100%;
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

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.375rem;
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  padding-bottom: 0.375rem;
  margin-bottom: 0.25rem;
  overflow-x: auto;
  
  @media (max-width: 768px) {
    gap: 0.25rem;
    padding-bottom: 0.25rem;
    margin-bottom: 0.2rem;
  }
`;

const TabButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 8px 8px 0 0;
  border: none;
  background: ${({ active, theme }) => active
    ? (isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)')
    : 'transparent'};
  color: ${({ active, theme }) => active ? theme.ACCENT : theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  font-weight: ${({ active }) => active ? 600 : 500};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.03)'};
  }
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
  max-height: 840px; /* Approximately 12 rows (70px per row) */
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
    max-height: 900px; /* Slightly taller for mobile due to card layout */
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  @media (max-width: 768px) {
    display: block;
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

const TableBody = styled.tbody`
  @media (max-width: 768px) {
    display: block;
  }
`;

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
  
  @media (max-width: 768px) {
    display: block;
    margin-bottom: 0.75rem;
    border: ${({ theme }) => isDark(theme)
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)'};
    border-radius: 12px;
    background: ${({ theme }) => theme.CARD};
    box-shadow: ${({ theme }) => isDark(theme)
      ? '0 2px 8px rgba(0, 0, 0, 0.2)'
      : '0 2px 8px rgba(0, 0, 0, 0.05)'};
    overflow: hidden;
    
    &:last-child {
      border-bottom: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
    }
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
  
  @media (max-width: 768px) {
    display: block;
    padding: 0.75rem;
    border: none;
    border-bottom: ${({ theme }) => isDark(theme)
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)'};
    
    &:last-child {
      border-bottom: none;
    }
    
    &:nth-child(2) {
      display: none; /* Hide Class/Section column on mobile as it's redundant */
    }
    
    .student-name-mobile {
      white-space: normal !important;
      word-break: break-word;
      font-size: 0.85rem !important;
    }
    
    .student-name-header {
      flex-direction: row !important;
      align-items: flex-start !important;
    }
    
    .mobile-class-info {
      display: block !important;
    }
    
    .mobile-concession-count {
      display: block !important;
    }
    
    .desktop-concession-count {
      display: none !important;
    }
  }
  
  @media (min-width: 769px) {
    .mobile-class-info {
      display: none !important;
    }
    
    .mobile-concession-count {
      display: none !important;
    }
    
    .desktop-concession-count {
      display: flex !important;
    }
  }
`;

const StatusBadge = styled.span<{ status: 'active' | 'expired' | 'upcoming' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.15)' :
    status === 'expired' ? 'rgba(239, 68, 68, 0.15)' :
    'rgba(245, 158, 11, 0.15)'};
  color: ${({ status }) =>
    status === 'active' ? 'rgb(21, 128, 61)' :
    status === 'expired' ? 'rgb(185, 28, 28)' :
    'rgb(161, 98, 7)'};
  border: 1px solid ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.3)' :
    status === 'expired' ? 'rgba(239, 68, 68, 0.3)' :
    'rgba(245, 158, 11, 0.3)'};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

const CollapsibleSection = styled.div<{ isExpanded: boolean }>`
  overflow: hidden;
  max-height: ${({ isExpanded }) => isExpanded ? '2000px' : '0'};
  opacity: ${({ isExpanded }) => isExpanded ? '1' : '0'};
  transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
  border-top: ${({ theme, isExpanded }) => isExpanded 
    ? (isDark(theme) ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)')
    : 'none'};
  margin-top: ${({ isExpanded }) => isExpanded ? '0.75rem' : '0'};
  padding-top: ${({ isExpanded }) => isExpanded ? '0.75rem' : '0'};
`;

const ConcessionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 8px;
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ConcessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const ConcessionActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
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
  flex-shrink: 0;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.05)'};
  }
  
  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
  }
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

const ModalContent = styled.div<{ $hasFooter?: boolean }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 0;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
  overflow: hidden;
  
  @media (max-width: 768px) {
    max-height: 95vh;
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

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FormLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const FormInput = styled.input`
  padding: 0.75rem;
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

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
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

const LoadingText = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
`;

// ===== TYPES =====

interface Concession {
  id: string;
  student_id: string;
  fee_head_id: string;
  amount: number; // concession amount (discount)
  fee_amount?: number; // actual fee amount for the student
  effective_from?: string | null;
  expires_on: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    name: string;
    roll_number?: string | null;
    father_name?: string | null;
    class_id: string;
    section_id: string;
    current_class?: {
      name: string;
      section?: {
        name: string;
      };
    };
  };
  fee_head?: {
    id: string;
    name: string;
  };
}

interface Student {
  id: string;
  name: string;
  roll_number?: string | null;
  father_name?: string | null;
  class_id: string;
  section_id: string;
  current_class?: {
    name: string;
    section?: {
      name: string;
    };
  };
}

interface FeeHead {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  sections?: Section[];
}

interface Section {
  id: string;
  name: string;
  class_id: string;
}

// ===== MAIN COMPONENT =====

const ConcessionsPage: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading, loading } = useLoading();

  // State Management
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired' | 'upcoming'>('all');
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedFeeHead, setSelectedFeeHead] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'expired' | 'upcoming'>('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedConcession, setSelectedConcession] = useState<Concession | null>(null);
  
  // Form states for add/edit
  const [formData, setFormData] = useState({
    student_id: '',
    fee_head_id: '',
    amount: '',
    effective_from: '',
    expires_on: ''
  });
  
  // Bulk form states
  const [bulkFormData, setBulkFormData] = useState({
    class_id: '',
    section_id: '',
    fee_head_id: '',
    effective_from: '',
    expires_on: '',
    selectedStudents: [] as string[],
    studentAmounts: {} as Record<string, string> // studentId -> amount
  });
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [studentFeeAmounts, setStudentFeeAmounts] = useState<Record<string, number>>({}); // studentId -> max fee amount
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatusFilters, setExportStatusFilters] = useState({
    active: true,
    expired: true,
    upcoming: true
  });

  // Helper function to format amount as Rs. 5,000.00
  const formatAmount = useCallback((amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'Rs. 0.00';
    
    // Format with 2 decimal places, using comma as thousand separator and dot as decimal separator
    const parts = numAmount.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); // Add thousand separators (commas)
    const decimalPart = parts[1] || '00';
    
    return `Rs. ${integerPart}.${decimalPart}`;
  }, []);

  // Helper function to get concession status
  const getConcessionStatus = useCallback((concession: Concession): 'active' | 'expired' | 'upcoming' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if concession is upcoming (effective_from is in the future)
    if (concession.effective_from) {
      const effectiveDate = new Date(concession.effective_from);
      effectiveDate.setHours(0, 0, 0, 0);
      if (effectiveDate > today) {
        return 'upcoming';
      }
    }
    
    // Check if concession is expired (expires_on is in the past)
    if (concession.expires_on) {
      const expiryDate = new Date(concession.expires_on);
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        return 'expired';
      }
    }
    
    // Otherwise, it's active
    return 'active';
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = concessions.length;
    const active = concessions.filter(c => getConcessionStatus(c) === 'active').length;
    const expired = concessions.filter(c => getConcessionStatus(c) === 'expired').length;
    const upcoming = concessions.filter(c => getConcessionStatus(c) === 'upcoming').length;
    const totalAmount = concessions.reduce((sum, c) => sum + (c.amount || 0), 0);
    
    return { total, active, expired, upcoming, totalAmount };
  }, [concessions, getConcessionStatus]);

  // Filter concessions based on current filters
  const filteredConcessions = useMemo(() => {
    let filtered = [...concessions];
    
    // Filter by tab/status
    if (activeTab !== 'all') {
      filtered = filtered.filter(c => getConcessionStatus(c) === activeTab);
    }
    
    // Filter by status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => getConcessionStatus(c) === selectedStatus);
    }
    
    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(c => c.student?.class_id === selectedClass);
    }
    
    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(c => c.student?.section_id === selectedSection);
    }
    
    // Filter by fee head
    if (selectedFeeHead !== 'all') {
      filtered = filtered.filter(c => c.fee_head_id === selectedFeeHead);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const studentName = c.student?.name?.toLowerCase() || '';
        const studentRollNumber = c.student?.roll_number?.toLowerCase() || '';
        const studentId = c.student?.id?.toString().toLowerCase() || '';
        const fatherName = c.student?.father_name?.toLowerCase() || '';
        const feeHeadName = c.fee_head?.name?.toLowerCase() || '';
        return studentName.includes(query) || studentRollNumber.includes(query) || studentId.includes(query) || fatherName.includes(query) || feeHeadName.includes(query);
      });
    }
    
    return filtered;
  }, [concessions, activeTab, selectedStatus, selectedClass, selectedSection, selectedFeeHead, searchQuery, getConcessionStatus]);

  // Group concessions by student
  const groupedConcessions = useMemo(() => {
    const grouped = new Map<string, Concession[]>();
    filteredConcessions.forEach(concession => {
      const studentId = concession.student_id;
      if (!grouped.has(studentId)) {
        grouped.set(studentId, []);
      }
      grouped.get(studentId)!.push(concession);
    });
    return grouped;
  }, [filteredConcessions]);

  // Get unique students from filtered concessions
  const uniqueStudents = useMemo(() => {
    const studentMap = new Map<string, Concession['student']>();
    filteredConcessions.forEach(concession => {
      if (concession.student && !studentMap.has(concession.student_id)) {
        studentMap.set(concession.student_id, concession.student);
      }
    });
    return Array.from(studentMap.values());
  }, [filteredConcessions]);

  // Toggle student expansion
  const toggleStudentExpansion = useCallback((studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }, []);

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
      
      if (error) {
        console.error('Error fetching sections:', error);
        throw error;
      }
      
      if (data) {
        setSections(data);
      } else {
        setSections([]);
      }
    } catch (error: any) {
      console.error('Error fetching sections:', error);
      showToast('Failed to load sections', 'error');
      setSections([]);
    }
  }, [user?.school_id, showToast]);

  // Fetch fee heads
  const fetchFeeHeads = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('fee_heads')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name');
      
      if (error) throw error;
      if (data) {
        setFeeHeads(data);
      }
    } catch (error: any) {
      console.error('Error fetching fee heads:', error);
      showToast('Failed to load fee heads', 'error');
    }
  }, [user?.school_id, showToast]);

  // Fetch students (all or filtered)
  const fetchStudents = useCallback(async (classId?: string, sectionId?: string) => {
    if (!user?.school_id) return;
    
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          name,
          roll_number,
          class_id,
          section_id
        `)
        .eq('school_id', user.school_id);
      
      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }
      
      if (sectionId && sectionId !== 'all') {
        query = query.eq('section_id', sectionId);
      }
      
      const { data, error } = await query.order('id', { ascending: true });
      
      if (error) throw error;
      if (data && data.length > 0) {
        // Get unique class and section IDs
        const classIds = Array.from(new Set(data.map((s: any) => s.class_id).filter(Boolean)));
        const sectionIds = Array.from(new Set(data.map((s: any) => s.section_id).filter(Boolean)));
        
        // Fetch all classes and sections in bulk
        const [classesResult, sectionsResult] = await Promise.all([
          classIds.length > 0 
            ? supabase.from('classes').select('id, name').in('id', classIds)
            : Promise.resolve({ data: [], error: null }),
          sectionIds.length > 0
            ? supabase.from('sections').select('id, name').in('id', sectionIds)
            : Promise.resolve({ data: [], error: null })
        ]);
        
        // Create lookup maps
        const classesMap = new Map((classesResult.data || []).map((c: any) => [c.id, c]));
        const sectionsMap = new Map((sectionsResult.data || []).map((s: any) => [s.id, s]));
        
        // Enrich student data
        const enrichedData = data.map((student: any) => {
          const classInfo = student.class_id ? classesMap.get(student.class_id) : null;
          const sectionInfo = student.section_id ? sectionsMap.get(student.section_id) : null;
          
          return {
            ...student,
            current_class: classInfo ? {
              ...classInfo,
              section: sectionInfo
            } : null
          };
        });
        
        setStudents(enrichedData as Student[]);
      } else {
        setStudents([]);
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    }
  }, [user?.school_id, showToast]);

  // Fetch concessions with pagination
  const fetchConcessions = useCallback(async () => {
    if (!user?.school_id) {
      setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true);
    try {
      // Get active session first
      const { data: activeSession, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .maybeSingle();
      
      const activeSessionId = activeSession?.id;
      
      if (sessionError) {
        console.error('Error fetching active session:', sessionError);
      }
      
      // Fetch all fee structures for the active session in bulk (like FeeStructureManager does)
      let allFeeStructures: any[] = [];
      let allStudentFeePlans: any[] = [];
      
      if (activeSessionId) {
        try {
          // Fetch all fee structures for the session
          const structures = await feeService.getFeeStructures(user.school_id, { sessionId: activeSessionId });
          allFeeStructures = structures || [];
          
          // Fetch all student fee plans for the session (we'll filter by student later)
          const { data: studentPlans } = await supabase
            .from('student_fee_plans')
            .select('student_id, fee_head_id, amount')
            .eq('school_id', user.school_id)
            .eq('session_id', activeSessionId);
          
          allStudentFeePlans = studentPlans || [];
        } catch (error) {
          console.error('Error fetching fee structures:', error);
        }
      }
      
      let allConcessions: Concession[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('student_fee_concessions')
          .select(`
            id,
            student_id,
            fee_head_id,
            concession_amount,
            effective_from,
            expires_on,
            created_at,
            updated_at
          `)
          .eq('school_id', user.school_id)
          .range(from, from + pageSize - 1)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Fetch all students in bulk
          const studentIds = Array.from(new Set(data.map((c: any) => c.student_id)));
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, name, roll_number, father_name, class_id, section_id')
            .eq('school_id', user.school_id)
            .in('id', studentIds);
          
          // Fetch all classes and sections in bulk
          const classIds = Array.from(new Set(studentsData?.map((s: any) => s.class_id).filter(Boolean) || []));
          const sectionIds = Array.from(new Set(studentsData?.map((s: any) => s.section_id).filter(Boolean) || []));
          
          const [classesResult, sectionsResult, feeHeadsResult] = await Promise.all([
            classIds.length > 0 
              ? supabase.from('classes').select('id, name').in('id', classIds)
              : Promise.resolve({ data: [], error: null }),
            sectionIds.length > 0
              ? supabase.from('sections').select('id, name').in('id', sectionIds)
              : Promise.resolve({ data: [], error: null }),
            supabase.from('fee_heads').select('id, name').in('id', Array.from(new Set(data.map((c: any) => c.fee_head_id))))
          ]);
          
          // Create lookup maps
          const classesMap = new Map((classesResult.data || []).map((c: any) => [c.id, c]));
          const sectionsMap = new Map((sectionsResult.data || []).map((s: any) => [s.id, s]));
          const feeHeadsMap = new Map((feeHeadsResult.data || []).map((fh: any) => [fh.id, fh]));
          const studentsMap = new Map((studentsData || []).map((s: any) => [s.id, s]));
          
          // Create lookup maps for fee amounts
          const studentPlanMap = new Map(
            allStudentFeePlans.map((plan: any) => [`${plan.student_id}_${plan.fee_head_id}`, parseFloat(plan.amount)])
          );
          
          // Create lookup map for fee structures: key = `${class_id}_${section_id}_${fee_head_id}` or `${class_id}_null_${fee_head_id}`
          const feeStructureMap = new Map<string, number>();
          allFeeStructures.forEach((fs: any) => {
            const sectionKey = fs.section_id || null;
            const key = `${fs.class_id}_${sectionKey}_${fs.fee_head_id}`;
            feeStructureMap.set(key, parseFloat(fs.amount));
          });
          
          // Enrich concessions with all data
          const enrichedConcessions = data.map((concession: any) => {
            const studentData = studentsMap.get(concession.student_id);
            const classInfo = studentData?.class_id ? classesMap.get(studentData.class_id) : null;
            const sectionInfo = studentData?.section_id ? sectionsMap.get(studentData.section_id) : null;
            const feeHeadData = feeHeadsMap.get(concession.fee_head_id);
            
            // Look up fee amount
            let feeAmount: number | undefined = undefined;
            if (studentData && activeSessionId) {
              // Check student fee plan first
              const planKey = `${studentData.id}_${concession.fee_head_id}`;
              if (studentPlanMap.has(planKey)) {
                feeAmount = studentPlanMap.get(planKey);
              } else {
                // Check fee structure - section-specific first, then class-specific
                const sectionKey = `${studentData.class_id}_${studentData.section_id}_${concession.fee_head_id}`;
                const classKey = `${studentData.class_id}_null_${concession.fee_head_id}`;
                
                if (feeStructureMap.has(sectionKey)) {
                  feeAmount = feeStructureMap.get(sectionKey);
                } else if (feeStructureMap.has(classKey)) {
                  feeAmount = feeStructureMap.get(classKey);
                }
              }
            }
            
            return {
              ...concession,
              amount: concession.concession_amount,
              fee_amount: feeAmount,
              effective_from: concession.effective_from,
              student: studentData ? {
                ...studentData,
                father_name: studentData.father_name || null,
                current_class: classInfo ? {
                  ...classInfo,
                  section: sectionInfo
                } : null
              } : null,
              fee_head: feeHeadData
            };
          });
          
          allConcessions = [...allConcessions, ...enrichedConcessions];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      setConcessions(allConcessions);
    } catch (error: any) {
      console.error('Error fetching concessions:', error);
      showToast('Failed to load concessions', 'error');
    } finally {
      setIsLoadingData(false);
    }
  }, [user?.school_id, showToast]);

  // Initial data fetch
  useEffect(() => {
    if (user?.school_id) {
      fetchClasses();
      fetchSections();
      fetchFeeHeads();
      fetchConcessions();
      fetchStudents(); // Load all students initially
    }
  }, [user?.school_id, fetchClasses, fetchSections, fetchFeeHeads, fetchConcessions, fetchStudents]);

  // Fetch students when bulk form class/section changes
  useEffect(() => {
    if (isBulkModalOpen && bulkFormData.class_id) {
      fetchStudents(bulkFormData.class_id, bulkFormData.section_id);
    } else if (isBulkModalOpen && !bulkFormData.class_id) {
      fetchStudents(); // Load all when modal opens without class filter
    }
  }, [isBulkModalOpen, bulkFormData.class_id, bulkFormData.section_id, fetchStudents]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (user?.school_id) {
      fetchConcessions();
      fetchClasses();
      fetchSections();
      fetchFeeHeads();
      showToast('Data refreshed', 'success');
    }
  }, [user?.school_id, fetchConcessions, fetchClasses, fetchSections, fetchFeeHeads, showToast]);

  // Handlers for modals and actions
  const handleOpenAddModal = () => {
    setFormData({ student_id: '', fee_head_id: '', amount: '', effective_from: '', expires_on: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (concession: Concession) => {
    setSelectedConcession(concession);
    setFormData({
      student_id: concession.student_id,
      fee_head_id: concession.fee_head_id,
      amount: concession.amount.toString(),
      effective_from: concession.effective_from ? format(new Date(concession.effective_from), 'yyyy-MM-dd') : '',
      expires_on: concession.expires_on ? format(new Date(concession.expires_on), 'yyyy-MM-dd') : ''
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (concession: Concession) => {
    setSelectedConcession(concession);
    setIsDeleteModalOpen(true);
  };

  const handleOpenBulkModal = () => {
    setBulkFormData({
      class_id: '',
      section_id: '',
      fee_head_id: '',
      effective_from: '',
      expires_on: '',
      selectedStudents: [],
      studentAmounts: {}
    });
    setIsBulkModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsBulkModalOpen(false);
    setSelectedConcession(null);
  };

  // Save concession (add or edit)
  const handleSaveConcession = async () => {
    if (!user?.school_id || !formData.student_id || !formData.fee_head_id || !formData.amount) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      const concessionData = {
        school_id: user.school_id,
        student_id: formData.student_id,
        fee_head_id: formData.fee_head_id,
        concession_amount: parseFloat(formData.amount),
        effective_from: formData.effective_from || null,
        expires_on: formData.expires_on || null
      };

      if (isEditModalOpen && selectedConcession) {
        // Update existing
        const { error } = await supabase
          .from('student_fee_concessions')
          .update(concessionData)
          .eq('id', selectedConcession.id);
        
        if (error) throw error;
        showToast('Concession updated successfully', 'success');
      } else {
        // Create new
        const { error } = await supabase
          .from('student_fee_concessions')
          .insert([concessionData]);
        
        if (error) throw error;
        showToast('Concession added successfully', 'success');
      }

      handleCloseModals();
      await fetchConcessions();
    } catch (error: any) {
      console.error('Error saving concession:', error);
      showToast(error.message || 'Failed to save concession', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete concession
  const handleDeleteConcession = async () => {
    if (!selectedConcession) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('student_fee_concessions')
        .delete()
        .eq('id', selectedConcession.id);
      
      if (error) throw error;
      showToast('Concession deleted successfully', 'success');
      handleCloseModals();
      await fetchConcessions();
    } catch (error: any) {
      console.error('Error deleting concession:', error);
      showToast(error.message || 'Failed to delete concession', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save bulk concessions
  const handleSaveBulkConcessions = async () => {
    if (!user?.school_id || !bulkFormData.fee_head_id) {
      showToast('Please select a fee head', 'error');
      return;
    }

    // Only save records that have amounts (skip those without)
      const concessionsToSave = Object.entries(bulkFormData.studentAmounts)
        .filter(([studentId, amount]) => {
          const trimmedAmount = amount?.trim() || '';
          return trimmedAmount !== '' && !isNaN(parseFloat(trimmedAmount)) && parseFloat(trimmedAmount) > 0;
        })
        .map(([studentId, amount]) => ({
          school_id: user.school_id,
          student_id: studentId,
          fee_head_id: bulkFormData.fee_head_id,
          concession_amount: parseFloat(amount),
          effective_from: bulkFormData.effective_from || null,
          expires_on: bulkFormData.expires_on || null
        }));

    if (concessionsToSave.length === 0) {
      showToast('Please enter concession amounts for at least one student', 'error');
      return;
    }

    try {
      setLoading(true);

      // Handle upsert by deleting existing then inserting new
      // This avoids the onConflict constraint issue
      const studentIds = bulkFormData.selectedStudents;
      
      // Delete existing concessions for these students and fee head
      const { error: deleteError } = await supabase
        .from('student_fee_concessions')
        .delete()
        .eq('school_id', user.school_id)
        .eq('fee_head_id', bulkFormData.fee_head_id)
        .in('student_id', studentIds);
      
      if (deleteError) {
        console.error('Error deleting existing concessions:', deleteError);
        // Continue anyway - might be first time creating these concessions
      }
      
      // Insert the new concessions
      const { error } = await supabase
        .from('student_fee_concessions')
        .insert(concessionsToSave);
      
      if (error) throw error;
      showToast(`Bulk concessions applied to ${concessionsToSave.length} student${concessionsToSave.length !== 1 ? 's' : ''}`, 'success');
      handleCloseModals();
      await fetchConcessions();
    } catch (error: any) {
      console.error('Error saving bulk concessions:', error);
      showToast(error.message || 'Failed to save bulk concessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle student selection in bulk modal
  const handleToggleStudentSelection = (studentId: string) => {
    setBulkFormData(prev => {
      const isSelected = prev.selectedStudents.includes(studentId);
      const newSelectedStudents = isSelected
        ? prev.selectedStudents.filter(id => id !== studentId)
        : [...prev.selectedStudents, studentId];
      
      // Remove amount if deselecting, keep if selecting
      const newStudentAmounts = { ...prev.studentAmounts };
      if (isSelected) {
        delete newStudentAmounts[studentId];
      }
      
      return {
        ...prev,
        selectedStudents: newSelectedStudents,
        studentAmounts: newStudentAmounts
      };
    });
  };

  // Select all students in bulk modal
  const handleSelectAllStudents = () => {
    setBulkFormData(prev => ({
      ...prev,
      selectedStudents: students.map(s => s.id),
      studentAmounts: {} // Clear amounts when selecting all
    }));
  };

  // Deselect all students in bulk modal
  const handleDeselectAllStudents = () => {
    setBulkFormData(prev => ({
      ...prev,
      selectedStudents: [],
      studentAmounts: {}
    }));
  };

  // Handle individual student amount change
  const handleStudentAmountChange = (studentId: string, amount: string) => {
    setBulkFormData(prev => {
      const trimmedAmount = amount.trim();
      const numAmount = parseFloat(trimmedAmount);
      const hasAmount = trimmedAmount !== '' && !isNaN(numAmount) && numAmount > 0;
      
      // Validate against max fee amount
      const maxAmount = studentFeeAmounts[studentId];
      if (hasAmount && maxAmount !== undefined && numAmount > maxAmount) {
        showToast(`Concession amount cannot exceed fee amount (Max: ${formatAmount(maxAmount)})`, 'error');
        return prev; // Don't update if validation fails
      }
      
      // Update amounts
      const newStudentAmounts = { ...prev.studentAmounts };
      if (hasAmount) {
        newStudentAmounts[studentId] = trimmedAmount;
      } else {
        delete newStudentAmounts[studentId];
      }
      
      // Auto-select if amount entered, auto-unselect if cleared
      let newSelectedStudents = [...prev.selectedStudents];
      if (hasAmount && !newSelectedStudents.includes(studentId)) {
        newSelectedStudents.push(studentId);
      } else if (!hasAmount && newSelectedStudents.includes(studentId)) {
        newSelectedStudents = newSelectedStudents.filter(id => id !== studentId);
      }
      
      return {
        ...prev,
        selectedStudents: newSelectedStudents,
        studentAmounts: newStudentAmounts
      };
    });
  };

  // Open Export Modal
  const handleOpenExportModal = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  // Close Export Modal
  const handleCloseExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  // PDF Export Handler
  const handleExportPDF = useCallback(async () => {
    // Filter concessions based on selected status filters
    const filteredByStatus = filteredConcessions.filter(concession => {
      const status = getConcessionStatus(concession);
      return exportStatusFilters[status];
    });

    if (filteredByStatus.length === 0) {
      showToast('No concessions to export with selected filters', 'error');
      return;
    }

    // Group filtered concessions by student
    const filteredGroupedConcessions = new Map<string, Concession[]>();
    filteredByStatus.forEach(concession => {
      const studentId = concession.student_id;
      if (!filteredGroupedConcessions.has(studentId)) {
        filteredGroupedConcessions.set(studentId, []);
      }
      filteredGroupedConcessions.get(studentId)!.push(concession);
    });

    // Get unique students from filtered concessions
    const filteredUniqueStudents = Array.from(new Set(filteredByStatus.map(c => c.student_id)))
      .map(id => {
        const concession = filteredByStatus.find(c => c.student_id === id);
        return concession?.student;
      })
      .filter((s): s is NonNullable<typeof s> => s != null);

    if (filteredUniqueStudents.length === 0) {
      showToast('No students to export', 'error');
      return;
    }

    setIsExportModalOpen(false);
    setExportLoading(true);
    try {
      // Fetch school information
      let schoolName = 'School';
      if (user?.school_id) {
        try {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('name')
            .eq('id', user.school_id)
            .single();
          if (schoolData?.name) {
            schoolName = schoolData.name;
          }
        } catch (err) {
          console.error('Error fetching school name:', err);
        }
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 22;

      // Simple header
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolName, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 6;
      doc.setFontSize(13);
      doc.text('Fee Concessions', pageWidth / 2, currentY, { align: 'center' });
      
      currentY = 35;

      // Sort students by class, then by ID
      const sortedStudents = [...filteredUniqueStudents].filter((s): s is NonNullable<typeof s> => s != null).sort((a, b) => {
        // First sort by class name
        const classA = a.current_class?.name || '';
        const classB = b.current_class?.name || '';
        if (classA !== classB) {
          return classA.localeCompare(classB);
        }
        // Then by section
        const sectionA = a.current_class?.section?.name || '';
        const sectionB = b.current_class?.section?.name || '';
        if (sectionA !== sectionB) {
          return sectionA.localeCompare(sectionB);
        }
        // Finally by student ID
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idA - idB;
      });

      // Build single table with all concessions
      const tableData: any[][] = [];
      const classTotals = new Map<string, number>(); // class name -> total concession amount
      let currentClass = '';
      
      sortedStudents.forEach((student, studentIndex) => {
        if (!student) return;
        
        const studentConcessions = filteredGroupedConcessions.get(student.id) || [];
        if (studentConcessions.length === 0) return;
        
        const studentId = getStudentDisplayId(student);
        const studentDetails = `${student.name}\n${student.father_name || 'N/A'} - ${student.current_class?.name || 'N/A'}${student.current_class?.section?.name ? ` (${student.current_class.section.name})` : ''}`;
        const className = student.current_class?.name || 'N/A';
        const sectionName = student.current_class?.section?.name || '';
        const classWithSection = sectionName ? `${className} - ${sectionName}` : className;
        
        // Add class header row when class changes
        if (classWithSection !== currentClass) {
          currentClass = classWithSection;
          tableData.push([
            { 
              content: `Class: ${classWithSection}`, 
              colSpan: 8, 
              styles: { 
                fontStyle: 'bold', 
                fillColor: [240, 240, 240], 
                textColor: 60,
                halign: 'center',
                fontSize: 10
              } 
            }
          ]);
        }
        
        // Add a row for each concession
        studentConcessions.forEach((concession, concessionIndex) => {
          const status = getConcessionStatus(concession);
          const statusText = status.charAt(0).toUpperCase() + status.slice(1);
          const effectiveFrom = concession.effective_from
            ? format(new Date(concession.effective_from), 'dd.MM-yy')
            : 'Immediate';
          const expiresOn = concession.expires_on
            ? format(new Date(concession.expires_on), 'dd.MM-yy')
            : 'No expiry';
          
          // Accumulate class-wise totals
          const currentTotal = classTotals.get(className) || 0;
          classTotals.set(className, currentTotal + (concession.amount || 0));
          
          // Add concession data with proper rowSpan
          if (concessionIndex === 0) {
            // First row: include ID and Student with rowSpan
            tableData.push([
              { content: studentId, rowSpan: studentConcessions.length, styles: { fontStyle: 'bold', valign: 'top' } },
              { content: studentDetails, rowSpan: studentConcessions.length, styles: { fontStyle: 'bold', valign: 'top' } },
              concession.fee_head?.name || 'N/A',
              concession.fee_amount !== undefined ? formatAmount(concession.fee_amount) : 'N/A',
              formatAmount(concession.amount),
              effectiveFrom,
              expiresOn,
              statusText
            ]);
          } else {
            // Subsequent rows: exclude ID and Student columns (they are merged)
            tableData.push([
              concession.fee_head?.name || 'N/A',
              concession.fee_amount !== undefined ? formatAmount(concession.fee_amount) : 'N/A',
              formatAmount(concession.amount),
              effectiveFrom,
              expiresOn,
              statusText
            ]);
          }
        });
      });

      // Simple table
      autoTable(doc, {
        head: [['ID', 'Student', 'Fee Head', 'Fee Amount', 'Concession', 'Effective From', 'Expires On', 'Status']],
        body: tableData,
        startY: currentY,
        margin: { left: 6, right: 6 },
        tableWidth: 'auto',
        styles: { 
          fontSize: 9, 
          cellPadding: 1.5, 
          halign: 'center', 
          valign: 'middle' 
        },
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: 60, 
          fontStyle: 'bold', 
          halign: 'center', 
          fontSize: 8 
        },
        bodyStyles: { textColor: 60 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'left', cellWidth: 46 },
          2: { halign: 'left', cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'center', cellWidth: 20 },
          7: { cellWidth: 20 }
        },
        theme: 'grid',
        didParseCell: (data: any) => {
          // Styling is already handled by rowSpan styles
        },
        didDrawPage: () => {
          // Footer will be added after table is drawn
        }
      });
      
      // Get final Y position after main table
      const finalY = (doc as any).lastAutoTable?.finalY || currentY;
      let summaryY = finalY + 10;
      
      // Check if we need a new page for summary
      const pageHeight = doc.internal.pageSize.getHeight();
      if (summaryY > pageHeight - 40) {
        doc.addPage();
        summaryY = 22;
      }
      
      // Build class-wise summary table with counts
      const summaryData: any[][] = [];
      const classCounts = new Map<string, number>(); // class name -> count of concessions
      let grandTotal = 0;
      let grandCount = 0;
      
      // Calculate counts per class from filtered concessions
      filteredByStatus.forEach(concession => {
        const className = concession.student?.current_class?.name || 'N/A';
        const currentCount = classCounts.get(className) || 0;
        classCounts.set(className, currentCount + 1);
      });
      
      // Sort classes for summary
      const sortedClassNames = Array.from(classTotals.keys()).sort((a, b) => {
        // Use the same class sorting logic
        return a.localeCompare(b);
      });
      
      sortedClassNames.forEach(className => {
        const total = classTotals.get(className) || 0;
        const count = classCounts.get(className) || 0;
        grandTotal += total;
        grandCount += count;
        summaryData.push([
          className,
          count,
          formatAmount(total)
        ]);
      });
      
      // Add grand total row
      summaryData.push([
        { content: 'Grand Total', styles: { fontStyle: 'bold' } },
        { content: grandCount, styles: { fontStyle: 'bold' } },
        { content: formatAmount(grandTotal), styles: { fontStyle: 'bold' } }
      ]);
      
      // Add class-wise summary table
      autoTable(doc, {
        startY: summaryY,
        head: [['Class', 'Count', 'Total Concession']],
        body: summaryData,
        margin: { left: 6, right: 6 },
        tableWidth: 'auto',
        styles: { 
          fontSize: 9, 
          cellPadding: 1.5, 
          halign: 'center', 
          valign: 'middle' 
        },
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: 60, 
          fontStyle: 'bold', 
          halign: 'center', 
          fontSize: 8 
        },
        bodyStyles: { textColor: 60 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 80 },
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'right', cellWidth: 70 }
        },
        theme: 'grid'
      });
      
      // Add footer to all pages after all tables are drawn
      const totalPages = (doc as any).internal.pages.length - 1;
      const today = new Date();
      const printDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getFullYear()}`;
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        // Left: Printed date
        doc.text(`Printed: ${printDate}`, 6, doc.internal.pageSize.getHeight() - 10);
        
        // Right: Page number
        doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.getWidth() - 6, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      }

      // Save the PDF
      const fileName = `Concessions_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      showToast('PDF exported successfully', 'success');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to export PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  }, [
    uniqueStudents,
    groupedConcessions,
    filteredConcessions,
    stats,
    activeTab,
    selectedClass,
    selectedSection,
    selectedFeeHead,
    searchQuery,
    classes,
    sections,
    feeHeads,
    getConcessionStatus,
    formatAmount,
    getStudentDisplayId,
    user?.school_id,
    showToast
  ]);

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
          <Loyalty style={{ fontSize: 28, color: theme.ACCENT }} />
          Fee Concessions Management
        </HeaderTitle>
        <HeaderActions>
          <ActionButton theme={theme} onClick={handleOpenExportModal} disabled={exportLoading || uniqueStudents.length === 0}>
            <DownloadIcon style={{ fontSize: 18 }} />
            {exportLoading ? 'Exporting...' : 'Export PDF'}
          </ActionButton>
          <ActionButton theme={theme} onClick={handleOpenBulkModal}>
            <Group style={{ fontSize: 18 }} />
            Bulk Add
          </ActionButton>
          <ActionButton theme={theme} onClick={handleOpenAddModal}>
            <AddIcon style={{ fontSize: 18 }} />
            Add Concession
          </ActionButton>
          <ActionButton theme={theme} onClick={handleRefresh} disabled={loading}>
            <RefreshIcon style={{ fontSize: 18 }} />
            Refresh
          </ActionButton>
        </HeaderActions>
      </Header>

      {/* Statistics */}
      <StatsGrid>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Concessions</StatLabel>
          <StatValue theme={theme}>{stats.total}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Active</StatLabel>
          <StatValue theme={theme} style={{ color: '#22c55e' }}>{stats.active}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Expired</StatLabel>
          <StatValue theme={theme} style={{ color: '#ef4444' }}>{stats.expired}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Amount</StatLabel>
          <StatValue theme={theme}>{formatAmount(stats.totalAmount)}</StatValue>
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
              placeholder="Search by student name, ID, or fee head..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </SearchWrapper>
        
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

        <FilterGroup>
          <FilterLabel theme={theme}>Fee Head</FilterLabel>
          <StyledSelect
            theme={theme}
            value={selectedFeeHead}
            onChange={(e) => setSelectedFeeHead(e.target.value)}
          >
            <option value="all">All Fee Heads</option>
            {feeHeads.map(fh => (
              <option key={fh.id} value={fh.id}>{fh.name}</option>
            ))}
          </StyledSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel theme={theme}>Status</FilterLabel>
          <StyledSelect
            theme={theme}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="upcoming">Upcoming</option>
          </StyledSelect>
        </FilterGroup>
      </FiltersSection>

      {/* Tabs */}
      <TabsContainer theme={theme}>
        <TabButton
          theme={theme}
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
        >
          All ({concessions.length})
        </TabButton>
        <TabButton
          theme={theme}
          active={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
        >
          Active ({stats.active})
        </TabButton>
        <TabButton
          theme={theme}
          active={activeTab === 'expired'}
          onClick={() => setActiveTab('expired')}
        >
          Expired ({stats.expired})
        </TabButton>
        <TabButton
          theme={theme}
          active={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({stats.upcoming})
        </TabButton>
      </TabsContainer>

      {/* Table */}
      <TableContainer theme={theme}>
        <TableWrapper theme={theme}>
          <Table>
              <TableHeader theme={theme}>
                <tr>
                  <TableHeaderCell theme={theme}>Student</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Class/Section</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Concessions</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
                {uniqueStudents.length === 0 ? (
                  <TableRow theme={theme}>
                    <TableCell theme={theme} colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                      <EmptyState theme={theme}>
                        <EmptyStateIcon theme={theme}>
                          <Loyalty style={{ fontSize: 64, opacity: 0.3 }} />
                        </EmptyStateIcon>
                        <EmptyStateText theme={theme}>No students found</EmptyStateText>
                        <EmptyStateSubtext theme={theme}>
                          {searchQuery || selectedClass !== 'all' || selectedSection !== 'all' || selectedFeeHead !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Add a new concession to get started'}
                        </EmptyStateSubtext>
                      </EmptyState>
                    </TableCell>
                  </TableRow>
                ) : (
                  uniqueStudents.map((student) => {
                    if (!student) return null;
                    const studentConcessions = groupedConcessions.get(student.id) || [];
                    const isExpanded = expandedStudents.has(student.id);
                    
                    return (
                      <React.Fragment key={student.id}>
                        <TableRow 
                          theme={theme}
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleStudentExpansion(student.id)}
                        >
                          <TableCell theme={theme}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                marginBottom: '0.25rem'
                              }}
                              className="student-name-header"
                              >
                                <div style={{ 
                                  fontWeight: 600, 
                                  fontSize: '0.9rem',
                                  color: theme.TEXT_PRIMARY,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  lineHeight: 1.2,
                                  flex: 1,
                                  minWidth: 0
                                }}
                                className="student-name-mobile"
                                >
                                  <span style={{ opacity: 0.6, fontWeight: 500 }}>
                                    {getStudentDisplayId(student)}
                                  </span>
                                  {' - '}
                                  {student.name}
                                  {student.father_name && (
                                    <>
                                      {' - '}
                                      <span style={{ opacity: 0.6, fontWeight: 500 }}>{student.father_name}</span>
                                    </>
                                  )}
                                </div>
                                <div 
                                  style={{ 
                                    fontSize: '0.75rem', 
                                    color: theme.TEXT_SECONDARY,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  className="mobile-class-info"
                                >
                                  {student.current_class?.name || 'N/A'}
                                  {student.current_class?.section?.name && ` - ${student.current_class.section.name}`}
                                </div>
                              </div>
                              <div 
                                style={{ 
                                  display: 'none',
                                  marginTop: '0.5rem',
                                  paddingTop: '0.5rem',
                                  borderTop: isDark(theme) ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)'
                                }}
                                className="mobile-concession-count"
                              >
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between', 
                                  width: '100%',
                                  gap: '0.5rem'
                                }}>
                                  <span style={{ 
                                    fontWeight: 600, 
                                    color: theme.ACCENT,
                                    fontSize: '0.85rem'
                                  }}>
                                    {studentConcessions.length} concession{studentConcessions.length !== 1 ? 's' : ''}
                                  </span>
                                  <ExpandButton theme={theme} onClick={(e) => { e.stopPropagation(); toggleStudentExpansion(student.id); }}>
                                    {isExpanded ? <ExpandLess style={{ fontSize: 20 }} /> : <ExpandMore style={{ fontSize: 20 }} />}
                                  </ExpandButton>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell theme={theme}>
                            {student.current_class?.name || 'N/A'}
                            {student.current_class?.section?.name && ` - ${student.current_class.section.name}`}
                          </TableCell>
                          <TableCell theme={theme}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              gap: '0.5rem' 
                            }}
                            className="desktop-concession-count"
                            >
                              <span style={{ fontWeight: 600, color: theme.ACCENT }}>
                                {studentConcessions.length} concession{studentConcessions.length !== 1 ? 's' : ''}
                              </span>
                              <ExpandButton theme={theme} onClick={(e) => { e.stopPropagation(); toggleStudentExpansion(student.id); }}>
                                {isExpanded ? <ExpandLess style={{ fontSize: 18 }} /> : <ExpandMore style={{ fontSize: 18 }} />}
                              </ExpandButton>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow theme={theme}>
                            <TableCell theme={theme} colSpan={3} style={{ padding: '0.75rem 1rem', paddingTop: '0' }}>
                              <CollapsibleSection theme={theme} isExpanded={isExpanded}>
                                <div style={{ 
                                  fontSize: '0.85rem', 
                                  fontWeight: 600, 
                                  color: theme.ACCENT, 
                                  marginBottom: '0.75rem' 
                                }}>
                                  Concessions Granted
                                </div>
                                {studentConcessions.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {studentConcessions.map((concession) => {
                                      const status = getConcessionStatus(concession);
                                      return (
                                        <ConcessionItem key={concession.id} theme={theme}>
                                          <ConcessionDetails>
                                            <div style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '0.75rem',
                                              flexWrap: 'wrap'
                                            }}>
                                              <div style={{ fontWeight: 600, color: theme.TEXT_PRIMARY }}>
                                                {concession.fee_head?.name || 'N/A'}
                                              </div>
                                              <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                                                Amount: {concession.fee_amount !== undefined 
                                                  ? formatAmount(concession.fee_amount)
                                                  : 'N/A'}
                                              </div>
                                              <div style={{ fontSize: '0.8rem', color: theme.ACCENT, fontWeight: 600 }}>
                                                Discount: {formatAmount(concession.amount)}
                                              </div>
                                            </div>
                                            <div style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '1rem',
                                              fontSize: '0.8rem',
                                              color: theme.TEXT_SECONDARY,
                                              flexWrap: 'wrap'
                                            }}>
                                              <span>
                                                Effective: {concession.effective_from
                                                  ? format(new Date(concession.effective_from), 'dd MMM yyyy')
                                                  : 'Immediate'}
                                              </span>
                                              <span>
                                                Expires: {concession.expires_on
                                                  ? format(new Date(concession.expires_on), 'dd MMM yyyy')
                                                  : 'No expiry'}
                                              </span>
                                              <StatusBadge status={status}>
                                                {status === 'active' && <CheckCircle style={{ fontSize: 12 }} />}
                                                {status === 'expired' && <ErrorOutline style={{ fontSize: 12 }} />}
                                                {status === 'upcoming' && <Warning style={{ fontSize: 12 }} />}
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                              </StatusBadge>
                                            </div>
                                          </ConcessionDetails>
                                          <ConcessionActions>
                                            <IconButton 
                                              theme={theme} 
                                              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(concession); }} 
                                              title="Edit"
                                            >
                                              <EditIcon style={{ fontSize: 16 }} />
                                            </IconButton>
                                            <IconButton 
                                              theme={theme} 
                                              onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal(concession); }} 
                                              title="Delete"
                                            >
                                              <DeleteIcon style={{ fontSize: 16 }} />
                                            </IconButton>
                                          </ConcessionActions>
                                        </ConcessionItem>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div style={{ 
                                    padding: '1rem', 
                                    textAlign: 'center', 
                                    color: theme.TEXT_SECONDARY,
                                    fontSize: '0.85rem'
                                  }}>
                                    No concessions granted to this student.
                                  </div>
                                )}
                              </CollapsibleSection>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
        </TableWrapper>
      </TableContainer>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ModalOverlay theme={theme} onClick={handleCloseExportModal}>
          <ModalContent theme={theme} onClick={(e) => e.stopPropagation()}>
            <ModalHeader theme={theme}>
              <ModalTitle theme={theme}>
                <DownloadIcon style={{ fontSize: 24 }} />
                Export Concessions Report
              </ModalTitle>
              <IconButton theme={theme} onClick={handleCloseExportModal}>
                <CloseIcon style={{ fontSize: 20 }} />
              </IconButton>
            </ModalHeader>
            <ModalBody theme={theme}>
              <FormGroup>
                <FormLabel theme={theme}>Select Status Categories to Export</FormLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: theme.TEXT_PRIMARY }}>
                    <input
                      type="checkbox"
                      checked={exportStatusFilters.active}
                      onChange={(e) => setExportStatusFilters(prev => ({ ...prev, active: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Active Concessions</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: theme.TEXT_PRIMARY }}>
                    <input
                      type="checkbox"
                      checked={exportStatusFilters.expired}
                      onChange={(e) => setExportStatusFilters(prev => ({ ...prev, expired: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Expired Concessions</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: theme.TEXT_PRIMARY }}>
                    <input
                      type="checkbox"
                      checked={exportStatusFilters.upcoming}
                      onChange={(e) => setExportStatusFilters(prev => ({ ...prev, upcoming: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Upcoming Concessions</span>
                  </label>
                </div>
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <SecondaryButton onClick={handleCloseExportModal}>
                <CancelIcon style={{ fontSize: 18 }} />
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleExportPDF} disabled={!exportStatusFilters.active && !exportStatusFilters.expired && !exportStatusFilters.upcoming}>
                <DownloadIcon style={{ fontSize: 18 }} />
                Export PDF
              </PrimaryButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <ModalOverlay theme={theme} onClick={handleCloseModals}>
          <ModalContent theme={theme} onClick={(e) => e.stopPropagation()}>
            <ModalHeader theme={theme}>
              <ModalTitle theme={theme}>
                <Loyalty style={{ fontSize: 24 }} />
                {isEditModalOpen ? 'Edit Concession' : 'Add New Concession'}
              </ModalTitle>
              <IconButton theme={theme} onClick={handleCloseModals}>
                <CloseIcon style={{ fontSize: 20 }} />
              </IconButton>
            </ModalHeader>
            <ModalBody theme={theme}>
              <FormGroup>
                <FormLabel theme={theme}>Student *</FormLabel>
                <StyledSelect
                  theme={theme}
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({getStudentDisplayId(student)})
                    </option>
                  ))}
                </StyledSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel theme={theme}>Fee Head *</FormLabel>
                <StyledSelect
                  theme={theme}
                  value={formData.fee_head_id}
                  onChange={(e) => setFormData({ ...formData, fee_head_id: e.target.value })}
                >
                  <option value="">Select Fee Head</option>
                  {feeHeads.map(fh => (
                    <option key={fh.id} value={fh.id}>{fh.name}</option>
                  ))}
                </StyledSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel theme={theme}>Concession Amount (Rs) *</FormLabel>
                <FormInput
                  theme={theme}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </FormGroup>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <FormGroup>
                  <FormLabel theme={theme}>Effective From (Optional)</FormLabel>
                  <FormInput
                    theme={theme}
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel theme={theme}>Expires On (Optional)</FormLabel>
                  <FormInput
                    theme={theme}
                    type="date"
                    value={formData.expires_on}
                    onChange={(e) => setFormData({ ...formData, expires_on: e.target.value })}
                  />
                </FormGroup>
              </div>
            </ModalBody>
            <ModalFooter theme={theme}>
              <SecondaryButton theme={theme} onClick={handleCloseModals}>
                <CancelIcon style={{ fontSize: 18 }} />
                Cancel
              </SecondaryButton>
              <PrimaryButton theme={theme} onClick={handleSaveConcession} disabled={loading}>
                <SaveIcon style={{ fontSize: 18 }} />
                {isEditModalOpen ? 'Update' : 'Save'}
              </PrimaryButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedConcession && (
        <ModalOverlay theme={theme} onClick={handleCloseModals}>
          <ModalContent theme={theme} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <ModalHeader theme={theme}>
              <ModalTitle theme={theme}>
                <ErrorOutline style={{ fontSize: 24, color: '#ef4444' }} />
                Delete Concession
              </ModalTitle>
              <IconButton theme={theme} onClick={handleCloseModals}>
                <CloseIcon style={{ fontSize: 20 }} />
              </IconButton>
            </ModalHeader>
            <ModalBody theme={theme}>
              <div style={{ color: theme.TEXT_PRIMARY, lineHeight: 1.6 }}>
                Are you sure you want to delete this concession?
                <div style={{ marginTop: '1rem', padding: '1rem', background: isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', borderRadius: '8px' }}>
                  <div><strong>Student:</strong> {selectedConcession.student?.name}</div>
                  <div><strong>Fee Head:</strong> {selectedConcession.fee_head?.name}</div>
                  <div><strong>Amount:</strong> {formatAmount(selectedConcession.amount)}</div>
                  {selectedConcession.effective_from && (
                    <div><strong>Effective From:</strong> {format(new Date(selectedConcession.effective_from), 'dd MMM yyyy')}</div>
                  )}
                  {selectedConcession.expires_on && (
                    <div><strong>Expires On:</strong> {format(new Date(selectedConcession.expires_on), 'dd MMM yyyy')}</div>
                  )}
                </div>
                <div style={{ marginTop: '1rem', color: '#ef4444', fontWeight: 500 }}>
                  This action cannot be undone.
                </div>
              </div>
            </ModalBody>
            <ModalFooter theme={theme}>
              <SecondaryButton theme={theme} onClick={handleCloseModals}>
                <CancelIcon style={{ fontSize: 18 }} />
                Cancel
              </SecondaryButton>
              <DangerButton onClick={handleDeleteConcession} disabled={loading}>
                <DeleteIcon style={{ fontSize: 18 }} />
                Delete
              </DangerButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Bulk Add Modal */}
      {isBulkModalOpen && (
        <ModalOverlay theme={theme} onClick={handleCloseModals}>
          <ModalContent theme={theme} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '90vh' }}>
            <ModalHeader theme={theme}>
              <ModalTitle theme={theme}>
                <Group style={{ fontSize: 24 }} />
                Bulk Add Concessions
              </ModalTitle>
              <IconButton theme={theme} onClick={handleCloseModals}>
                <CloseIcon style={{ fontSize: 20 }} />
              </IconButton>
            </ModalHeader>
            <ModalBody theme={theme}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <FormGroup>
                    <FormLabel theme={theme}>Class *</FormLabel>
                    <StyledSelect
                      theme={theme}
                      value={bulkFormData.class_id}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, class_id: e.target.value, section_id: '', selectedStudents: [], studentAmounts: {} })}
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </StyledSelect>
                  </FormGroup>

                  <FormGroup>
                    <FormLabel theme={theme}>Section</FormLabel>
                    <StyledSelect
                      theme={theme}
                      value={bulkFormData.section_id}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, section_id: e.target.value, selectedStudents: [], studentAmounts: {} })}
                      disabled={!bulkFormData.class_id}
                    >
                      <option value="">All Sections</option>
                      {sections
                        .filter(sec => !bulkFormData.class_id || String(sec.class_id) === String(bulkFormData.class_id))
                        .map(sec => (
                          <option key={sec.id} value={sec.id}>{sec.name}</option>
                        ))}
                    </StyledSelect>
                  </FormGroup>
                </div>

                <FormGroup>
                  <FormLabel theme={theme}>Fee Head *</FormLabel>
                  <StyledSelect
                    theme={theme}
                    value={bulkFormData.fee_head_id}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, fee_head_id: e.target.value })}
                  >
                    <option value="">Select Fee Head</option>
                    {feeHeads.map(fh => (
                      <option key={fh.id} value={fh.id}>{fh.name}</option>
                    ))}
                  </StyledSelect>
                </FormGroup>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <FormGroup>
                    <FormLabel theme={theme}>Effective From (Optional)</FormLabel>
                    <FormInput
                      theme={theme}
                      type="date"
                      value={bulkFormData.effective_from}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, effective_from: e.target.value })}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel theme={theme}>Expires On (Optional)</FormLabel>
                    <FormInput
                      theme={theme}
                      type="date"
                      value={bulkFormData.expires_on}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, expires_on: e.target.value })}
                    />
                  </FormGroup>
                </div>

                {bulkFormData.class_id && (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <FormLabel theme={theme}>
                        Students ({Object.keys(bulkFormData.studentAmounts).filter(id => {
                          const amount = bulkFormData.studentAmounts[id]?.trim() || '';
                          return amount !== '' && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
                        }).length} with amounts)
                      </FormLabel>
                      <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                        Enter amounts to automatically select students. Only students with amounts will be saved.
                      </div>
                    </div>
                    <div style={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto', 
                      border: isDark(theme) ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                      borderRadius: '8px',
                      padding: '0.5rem'
                    }}>
                      {students.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
                          No students found
                        </div>
                      ) : (
                        [...students].sort((a, b) => {
                          // Sort by ID (convert to number for proper numeric sorting)
                          const idA = parseInt(a.id) || 0;
                          const idB = parseInt(b.id) || 0;
                          return idA - idB;
                        }).map(student => (
                          <div
                            key={student.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem',
                              borderRadius: '6px',
                              transition: 'background 0.2s',
                              marginBottom: '0.25rem',
                              background: bulkFormData.selectedStudents.includes(student.id)
                                ? (isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')
                                : 'transparent'
                            }}
                          >
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: theme.TEXT_PRIMARY }}>
                                  {student.name}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>
                                  {getStudentDisplayId(student)} • {student.current_class?.name || 'N/A'}
                                  {student.current_class?.section?.name && ` - ${student.current_class.section.name}`}
                                </div>
                              </div>
                              <div style={{ minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <FormInput
                                  theme={theme}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={studentFeeAmounts[student.id] || undefined}
                                  value={bulkFormData.studentAmounts[student.id] || ''}
                                  onChange={(e) => handleStudentAmountChange(student.id, e.target.value)}
                                  placeholder="Amount (Rs)"
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: '0.85rem',
                                    width: '100%'
                                  }}
                                />
                                {studentFeeAmounts[student.id] !== undefined && (
                                  <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                                    Max: {formatAmount(studentFeeAmounts[student.id])}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter theme={theme}>
              {(() => {
                const studentsWithAmounts = Object.keys(bulkFormData.studentAmounts).filter(id => {
                  const amount = bulkFormData.studentAmounts[id]?.trim() || '';
                  return amount !== '' && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
                });
                const count = studentsWithAmounts.length;
                
                return (
                  <>
                    <SecondaryButton theme={theme} onClick={handleCloseModals}>
                      <CancelIcon style={{ fontSize: 18 }} />
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton 
                      theme={theme} 
                      onClick={handleSaveBulkConcessions} 
                      disabled={loading || count === 0}
                    >
                      <SaveIcon style={{ fontSize: 18 }} />
                      Apply to {count} Student{count !== 1 ? 's' : ''}
                    </PrimaryButton>
                  </>
                );
              })()}
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default ConcessionsPage;

