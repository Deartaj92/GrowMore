import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';
import { supabase } from '../supabaseClient';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import {
  AccountBalance,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ExpandMore,
  ExpandLess,
  Person,
  School,
  AttachMoney,
  CalendarToday,
  Receipt,
  CheckCircle,
  ErrorOutline,
  Warning
} from '@mui/icons-material';
import Loader from '../components/Loader';
import { useLoading } from '../contexts/LoadingContext';
import { format } from 'date-fns';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== TYPES =====

interface Student {
  id: number;
  name: string;
  roll_number: string | null;
  class_id: number | null;
  section_id: number | null;
  class?: { id: number; name: string } | null;
  section?: { id: number; name: string } | null;
}

interface FeeInvoice {
  id: number;
  student_id: number;
  month: string | null;
  year: number | null;
  total_amount: number;
  status: string;
  invoice_date: string;
  due_date: string;
}

interface FeePayment {
  id: number;
  invoice_id: number;
  payment_date: string;
  amount: number;
  discount_amount: number;
  net_amount: number;
  payment_mode: string;
  received_by: number | null;
}

interface LedgerEntry {
  student: Student;
  invoices: FeeInvoice[];
  payments: FeePayment[];
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
}

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    gap: 0.2rem;
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 2rem;
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
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
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const FiltersContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  margin-bottom: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
  
  @media (min-width: 769px) {
    flex-wrap: nowrap;
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

const DateInput = styled.input`
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
  transition: all 0.2s ease;
  
  &:hover, &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
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
  min-height: 0;
  padding-bottom: 8px;
  
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
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $isExpanded?: boolean }>`
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.02)'};
  }
  
  ${({ $isExpanded }) => $isExpanded && `
    background: ${isDark({ BG: '#252525' }) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  `}
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

const ExpandButton = styled.button`
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
`;

const ExpandedRow = styled.tr`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.01)'};
`;

const ExpandedCell = styled.td`
  padding: 0;
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
`;

const ExpandedContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InvoiceTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

const InvoiceTableHeader = styled.thead`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
`;

const InvoiceTableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
`;

const InvoiceTableRow = styled.tr`
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(0, 0, 0, 0.01)'};
  }
`;

const InvoiceTableCell = styled.td`
  padding: 0.75rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  
  ${({ $status }) => {
    if ($status === 'paid') {
      return `
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      `;
    } else if ($status === 'partial') {
      return `
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      `;
    } else {
      return `
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      `;
    }
  }}
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

// Skeleton Components
const SkeletonBox = styled.div<{ $width?: string; $height?: string }>`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
  animation: shimmer 1.5s infinite;
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  background: linear-gradient(
    90deg,
    ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.03)'} 0%,
    ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.08)'} 50%,
    ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.03)'} 100%
  );
  background-size: 1000px 100%;
`;

const LedgerSkeleton: React.FC<{ theme: any }> = ({ theme }) => (
  <PageContainer theme={theme}>
    <Header theme={theme}>
      <SkeletonBox $width="150px" $height="28px" />
      <SkeletonBox $width="100px" $height="36px" />
    </Header>

    <StatsGrid theme={theme}>
      {[1, 2, 3, 4].map(i => (
        <StatCard key={i} theme={theme}>
          <SkeletonBox $width="100px" $height="12px" />
          <SkeletonBox $width="120px" $height="24px" />
        </StatCard>
      ))}
    </StatsGrid>

    <FiltersContainer theme={theme}>
      <SkeletonBox $width="100%" $height="40px" />
      <SkeletonBox $width="150px" $height="40px" />
      <SkeletonBox $width="150px" $height="40px" />
      <SkeletonBox $width="150px" $height="40px" />
      <SkeletonBox $width="150px" $height="40px" />
    </FiltersContainer>

    <TableContainer theme={theme}>
      <TableWrapper theme={theme}>
        <Table>
          <TableHeader theme={theme}>
            <tr>
              <TableHeaderCell theme={theme} style={{ width: '40px' }}></TableHeaderCell>
              {['Student ID', 'Student Name', 'Class/Section', 'Total Invoiced', 'Total Paid', 'Outstanding'].map((header, i) => (
                <TableHeaderCell key={i} theme={theme}>
                  <SkeletonBox $width="100px" $height="16px" />
                </TableHeaderCell>
              ))}
            </tr>
          </TableHeader>
          <TableBody theme={theme}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(row => (
              <TableRow key={row} theme={theme}>
                <TableCell theme={theme}>
                  <SkeletonBox $width="32px" $height="32px" />
                </TableCell>
                <TableCell theme={theme}>
                  <SkeletonBox $width="80px" $height="16px" />
                </TableCell>
                <TableCell theme={theme}>
                  <SkeletonBox $width="150px" $height="16px" />
                </TableCell>
                <TableCell theme={theme}>
                  <SkeletonBox $width="120px" $height="16px" />
                </TableCell>
                <TableCell theme={theme}>
                  <SkeletonBox $width="100px" $height="16px" />
                </TableCell>
                <TableCell theme={theme}>
                  <SkeletonBox $width="100px" $height="16px" />
                </TableCell>
                <TableCell theme={theme}>
                  <SkeletonBox $width="100px" $height="16px" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    </TableContainer>
  </PageContainer>
);

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
  
  @media (max-width: 768px) {
    padding: 0.5rem;
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
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.9)'};
  }
  
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 1;
  }
`;

// ===== MAIN COMPONENT =====

export default function LedgerPage() {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const { showToast } = useToast();
  const { setFooterContent } = usePageFooter();
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [classes, setClasses] = useState<{ id: number; name: string; has_sections?: boolean }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string; class_id: number }[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Helper functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string): string => {
    try {
      return format(new Date(date), 'dd MMM yyyy');
    } catch {
      return date;
    }
  };

  const getStudentName = (student: Student): string => {
    return student.name || 'N/A';
  };

  const getStudentDisplay = (student: Student): string => {
    return String(getStudentDisplayId(student));
  };

  const getStudentClass = (student: Student): string => {
    if (!student.class?.name) {
      return 'N/A';
    }
    if (student.section?.name) {
      return `${student.class.name} - ${student.section.name}`;
    }
    // For non-sectioned classes, just show the class name
    return student.class.name;
  };

  const getClassHasSections = (classId: number | null): boolean => {
    if (!classId) return true; // Default to true for backward compatibility
    const classObj = classes.find(c => c.id === classId);
    return classObj?.has_sections ?? true;
  };

  const getUserName = (userId: number | null): string => {
    // This would need to fetch from users table if needed
    return userId ? `User ${userId}` : 'N/A';
  };

  // Fetch data
  const fetchLedgerData = useCallback(async () => {
    if (!user?.school_id) return;

    setLoading(true);
    setIsLoadingData(true);
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, roll_number, class_id, section_id')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      if (studentsError) throw studentsError;

      // Fetch classes and sections
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('fee_invoices')
        .select('*')
        .eq('school_id', user.school_id)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('school_id', user.school_id)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Build ledger entries
      const entries: LedgerEntry[] = (studentsData || []).map(student => {
        const studentInvoices = (invoicesData || []).filter(inv => inv.student_id === student.id);
        const studentPayments = (paymentsData || []).filter(pay => 
          studentInvoices.some(inv => inv.id === pay.invoice_id)
        );

        const totalInvoiced = studentInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        const totalPaid = studentPayments.reduce((sum, pay) => sum + Number(pay.net_amount || pay.amount || 0), 0);
        const totalOutstanding = totalInvoiced - totalPaid;

        // Enrich student with class and section
        const enrichedStudent: Student = {
          ...student,
          class: classesData?.find(c => c.id === student.class_id) || null,
          section: sectionsData?.find(s => s.id === student.section_id && s.class_id === student.class_id) || null,
        };

        return {
          student: enrichedStudent,
          invoices: studentInvoices,
          payments: studentPayments,
          totalInvoiced,
          totalPaid,
          totalOutstanding,
        };
      });

      setLedgerEntries(entries);
      setClasses(classesData || []);
      setSections(sectionsData || []);
    } catch (error: any) {
      console.error('Error fetching ledger data:', error);
      showToast('Failed to fetch ledger data', 'error');
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  }, [user?.school_id, setLoading, showToast]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  // Clear section filter when non-sectioned class is selected
  useEffect(() => {
    if (selectedClass) {
      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;
      if (!hasSections) {
        setSelectedSection('');
      }
    }
  }, [selectedClass, classes]);

  // Filter ledger entries
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter(entry => {
      // Class filter
      if (selectedClass && entry.student.class_id !== Number(selectedClass)) {
        return false;
      }

      // Section filter - handle non-sectioned classes
      if (selectedSection) {
        // If a specific section is selected, filter by that section
        if (entry.student.section_id !== Number(selectedSection)) {
          return false;
        }
      } else if (selectedClass) {
        // If a class is selected but no section is selected
        const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
        const hasSections = selectedClassObj?.has_sections ?? true;
        
        if (!hasSections) {
          // For non-sectioned classes, only show students with section_id = null
          if (entry.student.section_id !== null) {
            return false;
          }
        }
        // For sectioned classes with no section selected, show all students from that class (no additional filter)
      }

      // Date filter (filter by invoice date or payment date)
      if (dateFrom || dateTo) {
        const hasMatchingDate = entry.invoices.some(inv => {
          const invDate = new Date(inv.invoice_date);
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo) : null;
          
          if (fromDate && invDate < fromDate) return false;
          if (toDate && invDate > toDate) return false;
          return true;
        }) || entry.payments.some(pay => {
          const payDate = new Date(pay.payment_date);
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo) : null;
          
          if (fromDate && payDate < fromDate) return false;
          if (toDate && payDate > toDate) return false;
          return true;
        });

        if (!hasMatchingDate) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = entry.student.name?.toLowerCase().includes(query);
        const matchesId = matchesStudentSearch(entry.student, query).matches;
        return matchesName || matchesId;
      }

      return true;
    });
  }, [ledgerEntries, selectedClass, selectedSection, dateFrom, dateTo, searchQuery]);

  // Pagination
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalStudents = filteredEntries.length;
    const totalInvoiced = filteredEntries.reduce((sum, entry) => sum + entry.totalInvoiced, 0);
    const totalPaid = filteredEntries.reduce((sum, entry) => sum + entry.totalPaid, 0);
    const totalOutstanding = filteredEntries.reduce((sum, entry) => sum + entry.totalOutstanding, 0);

    return {
      totalStudents,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
    };
  }, [filteredEntries]);

  // Toggle row expansion
  const toggleRow = (studentId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedSection, dateFrom, dateTo, searchQuery]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  // Set footer content for global footer
  useEffect(() => {
    if (filteredEntries.length > 0) {
      const FooterContentComponent = React.memo(() => {
        const from = startIndex + 1;
        const to = Math.min(endIndex, filteredEntries.length);
        const total = filteredEntries.length;
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            width: '100%',
            gap: isMobile ? '0.5rem' : '1rem',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
            <PaginationInfo theme={theme} style={{ fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
              Showing {from} to {to} of {total} students
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
                <span style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', color: theme.TEXT_SECONDARY }}>Page</span>
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
                <span style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', color: theme.TEXT_SECONDARY }}>of {totalPages}</span>
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
          </div>
        );
      });

      setFooterContent({
        visible: true,
        content: <FooterContentComponent />
      });

      return () => {
        setFooterContent(null);
      };
    } else {
      setFooterContent(null);
    }
  }, [filteredEntries.length, startIndex, endIndex, currentPage, totalPages, isMobile, theme, setFooterContent]);

  if (isLoadingData) {
    return <LedgerSkeleton theme={theme} />;
  }

  return (
    <PageContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <AccountBalance />
          Fee Ledger
        </HeaderTitle>
        <HeaderActions theme={theme}>
          <ActionButton theme={theme} onClick={fetchLedgerData}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </ActionButton>
        </HeaderActions>
      </Header>

      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Students</StatLabel>
          <StatValue theme={theme}>{summaryStats.totalStudents}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Invoiced</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summaryStats.totalInvoiced)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Paid</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summaryStats.totalPaid)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Outstanding</StatLabel>
          <StatValue theme={theme}>{formatCurrency(summaryStats.totalOutstanding)}</StatValue>
        </StatCard>
      </StatsGrid>

      <FiltersContainer theme={theme}>
        <SearchWrapper theme={theme}>
          <FilterLabel theme={theme}>Search</FilterLabel>
          <div style={{ position: 'relative' }}>
            <SearchIconWrapper theme={theme}>
              <SearchIcon style={{ fontSize: '1rem' }} />
            </SearchIconWrapper>
            <SearchInput
              theme={theme}
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </SearchWrapper>

        <FilterRow>
          <FilterGroup theme={theme}>
            <FilterLabel theme={theme}>Class</FilterLabel>
            <StyledSelect
              theme={theme}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {sortClasses(classes).map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </StyledSelect>
          </FilterGroup>

          <FilterGroup theme={theme}>
            <FilterLabel theme={theme}>Section</FilterLabel>
            <StyledSelect
              theme={theme}
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={selectedClass ? !getClassHasSections(Number(selectedClass)) : false}
            >
              <option value="">All Sections</option>
              {selectedClass && getClassHasSections(Number(selectedClass)) && sections
                .filter(sec => sec.class_id === Number(selectedClass))
                .map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
            </StyledSelect>
          </FilterGroup>
        </FilterRow>

        <FilterRow>
          <FilterGroup theme={theme}>
            <FilterLabel theme={theme}>Date From</FilterLabel>
            <DateInput
              theme={theme}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </FilterGroup>

          <FilterGroup theme={theme}>
            <FilterLabel theme={theme}>Date To</FilterLabel>
            <DateInput
              theme={theme}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </FilterGroup>
        </FilterRow>
      </FiltersContainer>

      <TableContainer theme={theme}>
        <TableWrapper theme={theme}>
          {paginatedEntries.length === 0 ? (
            <EmptyState theme={theme}>
              <EmptyStateIcon theme={theme}>
                <AccountBalance style={{ fontSize: '4rem' }} />
              </EmptyStateIcon>
              <EmptyStateText theme={theme}>No ledger entries found</EmptyStateText>
              <EmptyStateSubtext theme={theme}>
                Try adjusting your filters or search query
              </EmptyStateSubtext>
            </EmptyState>
          ) : (
            <Table>
              <TableHeader theme={theme}>
                <tr>
                  <TableHeaderCell theme={theme} style={{ width: '40px' }}></TableHeaderCell>
                  <TableHeaderCell theme={theme}>Student ID</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Student Name</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Class/Section</TableHeaderCell>
                  <TableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Total Invoiced</TableHeaderCell>
                  <TableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Total Paid</TableHeaderCell>
                  <TableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Outstanding</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody theme={theme}>
                {paginatedEntries.map(entry => {
                  const isExpanded = expandedRows.has(entry.student.id);
                  return (
                    <React.Fragment key={entry.student.id}>
                      <TableRow theme={theme} $isExpanded={isExpanded}>
                        <TableCell theme={theme}>
                          <ExpandButton
                            theme={theme}
                            onClick={() => toggleRow(entry.student.id)}
                          >
                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                          </ExpandButton>
                        </TableCell>
                        <TableCell theme={theme} style={{ fontWeight: '600' }}>
                          {getStudentDisplay(entry.student)}
                        </TableCell>
                        <TableCell theme={theme}>{getStudentName(entry.student)}</TableCell>
                        <TableCell theme={theme}>{getStudentClass(entry.student)}</TableCell>
                        <TableCell theme={theme} style={{ textAlign: 'right' }}>
                          {formatCurrency(entry.totalInvoiced)}
                        </TableCell>
                        <TableCell theme={theme} style={{ textAlign: 'right' }}>
                          {formatCurrency(entry.totalPaid)}
                        </TableCell>
                        <TableCell theme={theme} style={{ textAlign: 'right', fontWeight: '600' }}>
                          {formatCurrency(entry.totalOutstanding)}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <ExpandedRow theme={theme}>
                          <ExpandedCell theme={theme} colSpan={7}>
                            <ExpandedContent theme={theme}>
                              <div>
                                <SectionTitle theme={theme}>
                                  <Receipt style={{ fontSize: '1rem' }} />
                                  Invoices
                                </SectionTitle>
                                {entry.invoices.length === 0 ? (
                                  <div style={{ padding: '1rem', color: theme.TEXT_SECONDARY }}>
                                    No invoices found
                                  </div>
                                ) : (
                                  <InvoiceTable theme={theme}>
                                    <InvoiceTableHeader theme={theme}>
                                      <tr>
                                        <InvoiceTableHeaderCell theme={theme}>Invoice #</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme}>Month/Year</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme}>Invoice Date</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme}>Due Date</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Amount</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme}>Status</InvoiceTableHeaderCell>
                                      </tr>
                                    </InvoiceTableHeader>
                                    <tbody>
                                      {entry.invoices.map(invoice => (
                                        <InvoiceTableRow key={invoice.id} theme={theme}>
                                          <InvoiceTableCell theme={theme}>{invoice.id}</InvoiceTableCell>
                                          <InvoiceTableCell theme={theme}>
                                            {invoice.month && invoice.year
                                              ? `${invoice.month} ${invoice.year}`
                                              : 'N/A'}
                                          </InvoiceTableCell>
                                          <InvoiceTableCell theme={theme}>{formatDate(invoice.invoice_date)}</InvoiceTableCell>
                                          <InvoiceTableCell theme={theme}>{formatDate(invoice.due_date)}</InvoiceTableCell>
                                          <InvoiceTableCell theme={theme} style={{ textAlign: 'right' }}>
                                            {formatCurrency(Number(invoice.total_amount || 0))}
                                          </InvoiceTableCell>
                                          <InvoiceTableCell theme={theme}>
                                            <StatusBadge $status={invoice.status}>
                                              {invoice.status}
                                            </StatusBadge>
                                          </InvoiceTableCell>
                                        </InvoiceTableRow>
                                      ))}
                                    </tbody>
                                  </InvoiceTable>
                                )}
                              </div>

                              <div>
                                <SectionTitle theme={theme}>
                                  <AttachMoney style={{ fontSize: '1rem' }} />
                                  Payments
                                </SectionTitle>
                                {entry.payments.length === 0 ? (
                                  <div style={{ padding: '1rem', color: theme.TEXT_SECONDARY }}>
                                    No payments found
                                  </div>
                                ) : (
                                  <InvoiceTable theme={theme}>
                                    <InvoiceTableHeader theme={theme}>
                                      <tr>
                                        <InvoiceTableHeaderCell theme={theme}>Payment #</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme}>Payment Date</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme}>Invoice #</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Amount</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Discount</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Net Amount</InvoiceTableHeaderCell>
                                        <InvoiceTableHeaderCell theme={theme}>Payment Mode</InvoiceTableHeaderCell>
                                      </tr>
                                    </InvoiceTableHeader>
                                    <tbody>
                                      {entry.payments.map(payment => (
                                        <InvoiceTableRow key={payment.id} theme={theme}>
                                          <InvoiceTableCell theme={theme}>{payment.id}</InvoiceTableCell>
                                          <InvoiceTableCell theme={theme}>{formatDate(payment.payment_date)}</InvoiceTableCell>
                                          <InvoiceTableCell theme={theme}>{payment.invoice_id}</InvoiceTableCell>
                                          <InvoiceTableCell theme={theme} style={{ textAlign: 'right' }}>
                                            {formatCurrency(Number(payment.amount || 0))}
                                          </InvoiceTableCell>
                                          <InvoiceTableCell theme={theme} style={{ textAlign: 'right' }}>
                                            {formatCurrency(Number(payment.discount_amount || 0))}
                                          </InvoiceTableCell>
                                          <InvoiceTableCell theme={theme} style={{ textAlign: 'right' }}>
                                            {formatCurrency(Number(payment.net_amount || payment.amount || 0))}
                                          </InvoiceTableCell>
                                          <InvoiceTableCell theme={theme}>{payment.payment_mode}</InvoiceTableCell>
                                        </InvoiceTableRow>
                                      ))}
                                    </tbody>
                                  </InvoiceTable>
                                )}
                              </div>
                            </ExpandedContent>
                          </ExpandedCell>
                        </ExpandedRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableWrapper>
      </TableContainer>
    </PageContainer>
  );
}

