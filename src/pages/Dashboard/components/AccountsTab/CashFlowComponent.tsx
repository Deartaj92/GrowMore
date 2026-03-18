import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Line,
  LineChart
} from 'recharts';
import { formatCurrency } from '../../utils/dashboardUtils';
import { CashFlowData } from '../../services/accountsService';
import DottedLoader from '../shared/DottedLoader';
import { format } from 'date-fns';

import { clayCardStyle, isDark, CARD_RADIUS_LG } from '../../../../styles/DesignSystem';

const ContentCard = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 1.5rem;
  
  @media (max-width: 768px) {
    padding: 1.1rem;
    border-radius: ${CARD_RADIUS_LG};
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const CashFlowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

const CashFlowCard = styled.div`
  ${clayCardStyle}
  padding: 1rem 1.1rem;

  @media (max-width: 768px) {
    padding: 0.85rem;
    border-radius: ${CARD_RADIUS_LG};
  }
`;

const CashFlowLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CashFlowValue = styled.div<{ $positive?: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ $positive, theme }) => {
    if ($positive === undefined) return theme.TEXT_PRIMARY;
    return $positive ? '#22c55e' : '#ef4444';
  }};
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const BreakdownSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
`;

const BreakdownTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 0.75rem 0;
`;

const BreakdownItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.85rem;
`;

const BreakdownLabel = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const BreakdownAmount = styled.span<{ $positive?: boolean }>`
  font-weight: 600;
  color: ${({ $positive, theme }) => {
    if ($positive === undefined) return theme.TEXT_PRIMARY;
    return $positive ? '#22c55e' : '#ef4444';
  }};
`;

const TransactionsTable = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
`;

const TableContainer = styled.div`
  overflow-x: auto;
  margin-top: 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:first-child {
    padding-left: 1rem;
  }
  
  &:last-child {
    padding-right: 1rem;
    text-align: right;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(0, 0, 0, 0.02)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  &:first-child {
    padding-left: 1rem;
  }
  
  &:last-child {
    padding-right: 1rem;
    text-align: right;
    font-weight: 600;
  }
`;

const TypeBadge = styled.span<{ $type: 'credit' | 'debit' }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $type }) => $type === 'credit' 
    ? 'rgba(34, 197, 94, 0.1)' 
    : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ $type }) => $type === 'credit' ? '#22c55e' : '#ef4444'};
`;

const CategoryLabel = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.8rem;
`;

const EmptyTransactions = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const PaginationInfo = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.875rem;
  
  @media (max-width: 768px) {
    text-align: center;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean; $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme, $active }) => 
    $active 
      ? theme.ACCENT 
      : isDark(theme)
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.1)'};
  background: ${({ theme, $active, $disabled }) => {
    if ($disabled) return isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
    if ($active) return theme.ACCENT;
    return 'transparent';
  }};
  color: ${({ theme, $active, $disabled }) => {
    if ($disabled) return theme.TEXT_SECONDARY;
    if ($active) return '#fff';
    return theme.TEXT_PRIMARY;
  }};
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  min-width: 2.5rem;
  
  &:hover:not(:disabled) {
    background: ${({ theme, $active }) => 
      $active 
        ? theme.ACCENT 
        : isDark(theme)
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(0, 0, 0, 0.05)'};
    border-color: ${({ theme, $active }) => 
      $active 
        ? theme.ACCENT 
        : isDark(theme)
          ? 'rgba(255, 255, 255, 0.15)'
          : 'rgba(0, 0, 0, 0.15)'};
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const ItemsPerPageSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const ItemsPerPageLabel = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.875rem;
  margin-right: 0.5rem;
  
  @media (max-width: 768px) {
    display: block;
    margin-bottom: 0.5rem;
    margin-right: 0;
  }
`;

const ItemsPerPageContainer = styled.div`
  display: flex;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

interface CashFlowComponentProps {
  cashFlow: CashFlowData | null;
  loading: boolean;
}

const CashFlowComponent: React.FC<CashFlowComponentProps> = ({ cashFlow, loading }) => {
  const theme = useTheme() as any;
  const isDarkTheme = isDark(theme);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calculate pagination
  const paginatedData = useMemo(() => {
    if (!cashFlow?.transactions) return { transactions: [], totalPages: 0 };
    
    const totalPages = Math.ceil(cashFlow.transactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = cashFlow.transactions.slice(startIndex, endIndex);
    
    return {
      transactions: paginatedTransactions,
      totalPages,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, cashFlow.transactions.length),
      totalItems: cashFlow.transactions.length
    };
  }, [cashFlow?.transactions, currentPage, itemsPerPage]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
  };

  if (loading) {
    return (
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>
          <AccountBalanceIcon />
          Cash Flow Statement
        </CardTitle>
        <EmptyState theme={theme}>
          <DottedLoader />
        </EmptyState>
      </ContentCard>
    );
  }

  if (!cashFlow) {
    return (
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>
          <AccountBalanceIcon />
          Cash Flow Statement
        </CardTitle>
        <EmptyState theme={theme}>
          No cash flow data available
        </EmptyState>
      </ContentCard>
    );
  }

  return (
    <ContentCard theme={theme}>
      <CardTitle theme={theme}>
        <AccountBalanceIcon />
        Cash Flow Statement
      </CardTitle>

      {/* Summary Cards */}
      <CashFlowGrid>
        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Opening Balance</CashFlowLabel>
          <CashFlowValue theme={theme}>
            {formatCurrency(cashFlow.openingBalance)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Total Inflows</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={true}>
            <ArrowUpIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            {formatCurrency(cashFlow.inflows.total)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Total Outflows</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={false}>
            <ArrowDownIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            {formatCurrency(cashFlow.outflows.total)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Net Cash Flow</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={cashFlow.netCashFlow >= 0}>
            {cashFlow.netCashFlow >= 0 ? (
              <TrendingUpIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            ) : (
              <TrendingDownIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            )}
            {formatCurrency(cashFlow.netCashFlow)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Closing Balance</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={cashFlow.closingBalance >= 0}>
            {formatCurrency(cashFlow.closingBalance)}
          </CashFlowValue>
        </CashFlowCard>
      </CashFlowGrid>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Inflows Breakdown */}
        <BreakdownSection>
          <BreakdownTitle>Cash Inflows</BreakdownTitle>
          <BreakdownItem>
            <BreakdownLabel>Fee Payments</BreakdownLabel>
            <BreakdownAmount $positive={true}>
              {formatCurrency(cashFlow.inflows.feePayments)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem>
            <BreakdownLabel>Other Incomes</BreakdownLabel>
            <BreakdownAmount $positive={true}>
              {formatCurrency(cashFlow.inflows.otherIncomes)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem style={{ 
            marginTop: '0.5rem', 
            paddingTop: '0.75rem', 
            borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            fontWeight: 600
          }}>
            <BreakdownLabel>Total Inflows</BreakdownLabel>
            <BreakdownAmount $positive={true}>
              {formatCurrency(cashFlow.inflows.total)}
            </BreakdownAmount>
          </BreakdownItem>
        </BreakdownSection>

        {/* Outflows Breakdown */}
        <BreakdownSection>
          <BreakdownTitle>Cash Outflows</BreakdownTitle>
          <BreakdownItem>
            <BreakdownLabel>Expenses</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.expenses)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem>
            <BreakdownLabel>Asset Purchases</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.assetPurchases)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem>
            <BreakdownLabel>Liability Payments</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.liabilityPayments)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem style={{ 
            marginTop: '0.5rem', 
            paddingTop: '0.75rem', 
            borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            fontWeight: 600
          }}>
            <BreakdownLabel>Total Outflows</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.total)}
            </BreakdownAmount>
          </BreakdownItem>
        </BreakdownSection>
      </div>

      {/* Monthly Cash Flow Chart */}
      {cashFlow.monthlyCashFlow && cashFlow.monthlyCashFlow.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <BreakdownTitle>Monthly Cash Flow Trend</BreakdownTitle>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlow.monthlyCashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDarkTheme ? '#555' : '#d1d5db'}
                opacity={0.8}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: isDarkTheme ? '#888' : '#666', fontSize: 11 }}
                tickLine={{ stroke: isDarkTheme ? '#444' : '#ddd' }}
              />
              <YAxis
                tick={{ fill: isDarkTheme ? '#888' : '#666', fontSize: 12 }}
                tickLine={{ stroke: isDarkTheme ? '#444' : '#ddd' }}
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
                  border: isDarkTheme ? '1px solid #334155' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDarkTheme ? '#e2e8f0' : '#1e293b'
                }}
                formatter={(value: any, name: string) => [
                  formatCurrency(value),
                  name === 'inflows' ? 'Inflows' : name === 'outflows' ? 'Outflows' : 'Net Flow'
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend
                formatter={(value: string) => {
                  if (value === 'inflows') return 'Inflows';
                  if (value === 'outflows') return 'Outflows';
                  if (value === 'netFlow') return 'Net Flow';
                  return value;
                }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="inflows"
                stroke="#22c55e"
                strokeWidth={2}
                name="inflows"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="outflows"
                stroke="#ef4444"
                strokeWidth={2}
                name="outflows"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="netFlow"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="netFlow"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Individual Transactions Table */}
      <TransactionsTable theme={theme}>
        <BreakdownTitle>Individual Transactions</BreakdownTitle>
        {cashFlow.transactions && cashFlow.transactions.length > 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell theme={theme}>Date</TableHeaderCell>
                    <TableHeaderCell theme={theme}>Type</TableHeaderCell>
                    <TableHeaderCell theme={theme}>Category</TableHeaderCell>
                    <TableHeaderCell theme={theme}>Description</TableHeaderCell>
                    <TableHeaderCell theme={theme}>Payment Method</TableHeaderCell>
                    <TableHeaderCell theme={theme}>Amount</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {paginatedData.transactions.map((transaction) => (
                    <TableRow key={transaction.id} theme={theme}>
                      <TableCell theme={theme}>
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell theme={theme}>
                        <TypeBadge $type={transaction.type}>
                          {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                        </TypeBadge>
                      </TableCell>
                      <TableCell theme={theme}>
                        <CategoryLabel theme={theme}>
                          {transaction.category === 'fee_payment' && 'Fee Payment'}
                          {transaction.category === 'other_income' && 'Other Income'}
                          {transaction.category === 'expense' && 'Expense'}
                          {transaction.category === 'asset_purchase' && 'Asset Purchase'}
                          {transaction.category === 'liability_payment' && 'Liability Payment'}
                        </CategoryLabel>
                      </TableCell>
                      <TableCell theme={theme}>
                        {transaction.description}
                      </TableCell>
                      <TableCell theme={theme}>
                        {transaction.paymentMethod || '-'}
                      </TableCell>
                      <TableCell theme={theme} style={{
                        color: transaction.type === 'credit' ? '#22c55e' : '#ef4444'
                      }}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            {paginatedData.totalPages > 0 && (
              <PaginationContainer theme={theme}>
                <PaginationInfo theme={theme}>
                  Showing {paginatedData.startIndex} to {paginatedData.endIndex} of {paginatedData.totalItems} transactions
                </PaginationInfo>
                
                <PaginationControls>
                  <ItemsPerPageContainer>
                    <ItemsPerPageLabel theme={theme}>Items per page:</ItemsPerPageLabel>
                    <ItemsPerPageSelect 
                      value={itemsPerPage} 
                      onChange={handleItemsPerPageChange}
                      theme={theme}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </ItemsPerPageSelect>
                  </ItemsPerPageContainer>
                  
                  <PaginationButton
                    theme={theme}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    $disabled={currentPage === 1}
                  >
                    <ChevronLeftIcon style={{ fontSize: '1.2rem' }} />
                  </PaginationButton>
                  
                  {Array.from({ length: paginatedData.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      if (page === 1 || page === paginatedData.totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <PaginationButton theme={theme} disabled style={{ cursor: 'default' }}>
                              ...
                            </PaginationButton>
                          )}
                          <PaginationButton
                            theme={theme}
                            onClick={() => handlePageChange(page)}
                            $active={currentPage === page}
                          >
                            {page}
                          </PaginationButton>
                        </React.Fragment>
                      );
                    })}
                  
                  <PaginationButton
                    theme={theme}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === paginatedData.totalPages}
                    $disabled={currentPage === paginatedData.totalPages}
                  >
                    <ChevronRightIcon style={{ fontSize: '1.2rem' }} />
                  </PaginationButton>
                </PaginationControls>
              </PaginationContainer>
            )}
          </>
        ) : (
          <EmptyTransactions theme={theme}>
            No transactions found for the selected period
          </EmptyTransactions>
        )}
      </TransactionsTable>
    </ContentCard>
  );
};

export default CashFlowComponent;








