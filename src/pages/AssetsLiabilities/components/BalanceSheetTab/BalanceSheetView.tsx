import React, { useState, useEffect, useContext, useCallback } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../components/Layout';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { useLoading } from '../../../../contexts/LoadingContext';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Refresh as RefreshIcon,
  Download,
  CalendarToday,
} from '@mui/icons-material';
import { format } from 'date-fns';
import Loader from '../../../../components/Loader';
import { balanceSheetService } from '../../services/balanceSheetService';
import { BalanceSheet } from '../../../../types/liability';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const TabContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
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
  cursor: pointer;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
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

const StatValue = styled.div<{ $positive?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $positive, theme }) => {
    if ($positive === undefined) return theme.ACCENT;
    return $positive ? '#10b981' : '#ef4444';
  }};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
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
  
  &.total {
    font-weight: 700;
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)'};
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
  
  &.amount {
    text-align: right;
    font-weight: 600;
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

// ===== MAIN COMPONENT =====

const BalanceSheetView: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchBalanceSheet = useCallback(async () => {
    if (!user?.school_id) return;
    
    setIsLoading(true);
    try {
      const data = await balanceSheetService.getBalanceSheet(user.school_id, asOfDate);
      setBalanceSheet(data);
    } catch (error: any) {
      console.error('Error fetching balance sheet:', error);
      showToast('Failed to fetch balance sheet', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.school_id, asOfDate, showToast]);

  useEffect(() => {
    fetchBalanceSheet();
  }, [fetchBalanceSheet]);

  const handleExportPDF = () => {
    if (!balanceSheet) return;
    
    const doc = new jsPDF();
    const isDarkMode = isDark(theme);
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(isDarkMode ? 255 : 0, isDarkMode ? 255 : 0, isDarkMode ? 255 : 0);
    doc.text('Balance Sheet', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(128, 128, 128);
    doc.text(`As of: ${format(new Date(balanceSheet.asOfDate), 'dd MMMM yyyy')}`, 14, 30);
    
    let yPos = 40;
    
    // Assets Section
    doc.setFontSize(14);
    doc.setTextColor(isDarkMode ? 255 : 0, isDarkMode ? 255 : 0, isDarkMode ? 255 : 0);
    doc.text('ASSETS', 14, yPos);
    yPos += 10;
    
    const assetsData = balanceSheet.assets.byCategory.map(cat => [
      cat.categoryName,
      formatCurrency(cat.total)
    ]);
    assetsData.push(['TOTAL ASSETS', formatCurrency(balanceSheet.assets.total)]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: assetsData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Liabilities Section
    doc.setFontSize(14);
    doc.text('LIABILITIES', 14, yPos);
    yPos += 10;
    
    const liabilitiesData = balanceSheet.liabilities.byCategory.map(cat => [
      cat.categoryName,
      formatCurrency(cat.total)
    ]);
    liabilitiesData.push(['TOTAL LIABILITIES', formatCurrency(balanceSheet.liabilities.total)]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: liabilitiesData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Net Worth
    doc.setFontSize(14);
    doc.setTextColor(balanceSheet.netWorth >= 0 ? 16 : 239, balanceSheet.netWorth >= 0 ? 163 : 68, balanceSheet.netWorth >= 0 ? 74 : 68);
    doc.text('NET WORTH', 14, yPos);
    doc.setFontSize(16);
    doc.text(formatCurrency(balanceSheet.netWorth), 14, yPos + 10);
    
    doc.save(`balance-sheet-${balanceSheet.asOfDate}.pdf`);
    showToast('Balance sheet exported successfully', 'success');
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!balanceSheet) {
    return (
      <TabContainer theme={theme}>
        <Header theme={theme}>
          <HeaderTitle theme={theme}>
            <AccountBalance />
            Balance Sheet
          </HeaderTitle>
        </Header>
        <EmptyState theme={theme}>
          <AccountBalance style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
          <div>No balance sheet data available</div>
        </EmptyState>
      </TabContainer>
    );
  }

  return (
    <TabContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <AccountBalance />
          Balance Sheet
        </HeaderTitle>
        <HeaderActions theme={theme}>
          <DateInput
            theme={theme}
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
          <ActionButton theme={theme} onClick={fetchBalanceSheet}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </ActionButton>
          <ActionButton theme={theme} onClick={handleExportPDF}>
            <Download style={{ fontSize: '1rem' }} />
            Export PDF
          </ActionButton>
        </HeaderActions>
      </Header>

      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Assets</StatLabel>
          <StatValue theme={theme}>{formatCurrency(balanceSheet.assets.total)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Liabilities</StatLabel>
          <StatValue theme={theme}>{formatCurrency(balanceSheet.liabilities.total)}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Net Worth</StatLabel>
          <StatValue theme={theme} $positive={balanceSheet.netWorth >= 0}>
            {formatCurrency(balanceSheet.netWorth)}
          </StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>As of Date</StatLabel>
          <StatValue theme={theme} style={{ fontSize: '1rem' }}>
            {format(new Date(balanceSheet.asOfDate), 'dd MMM yyyy')}
          </StatValue>
        </StatCard>
      </StatsGrid>

      <ContentGrid theme={theme}>
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <TrendingUp style={{ color: '#10b981' }} />
            Assets
          </CardTitle>
          {balanceSheet.assets.byCategory.length === 0 ? (
            <EmptyState theme={theme}>
              <div>No assets found</div>
            </EmptyState>
          ) : (
            <Table>
              <TableHead theme={theme}>
                <TableRow theme={theme}>
                  <TableHeaderCell theme={theme}>Category</TableHeaderCell>
                  <TableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {balanceSheet.assets.byCategory.map(cat => (
                  <TableRow key={cat.categoryId} theme={theme}>
                    <TableCell theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                          }}
                        />
                        {cat.categoryName}
                      </div>
                    </TableCell>
                    <TableCell theme={theme} className="amount">
                      {formatCurrency(cat.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow theme={theme} className="total">
                  <TableCell theme={theme} style={{ fontWeight: 700 }}>
                    Total Assets
                  </TableCell>
                  <TableCell theme={theme} className="amount" style={{ fontWeight: 700 }}>
                    {formatCurrency(balanceSheet.assets.total)}
                  </TableCell>
                </TableRow>
              </tbody>
            </Table>
          )}
        </ContentCard>

        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <TrendingDown style={{ color: '#ef4444' }} />
            Liabilities
          </CardTitle>
          {balanceSheet.liabilities.byCategory.length === 0 ? (
            <EmptyState theme={theme}>
              <div>No liabilities found</div>
            </EmptyState>
          ) : (
            <Table>
              <TableHead theme={theme}>
                <TableRow theme={theme}>
                  <TableHeaderCell theme={theme}>Category</TableHeaderCell>
                  <TableHeaderCell theme={theme} style={{ textAlign: 'right' }}>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {balanceSheet.liabilities.byCategory.map(cat => (
                  <TableRow key={cat.categoryId} theme={theme}>
                    <TableCell theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                          }}
                        />
                        {cat.categoryName}
                      </div>
                    </TableCell>
                    <TableCell theme={theme} className="amount">
                      {formatCurrency(cat.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow theme={theme} className="total">
                  <TableCell theme={theme} style={{ fontWeight: 700 }}>
                    Total Liabilities
                  </TableCell>
                  <TableCell theme={theme} className="amount" style={{ fontWeight: 700 }}>
                    {formatCurrency(balanceSheet.liabilities.total)}
                  </TableCell>
                </TableRow>
              </tbody>
            </Table>
          )}
        </ContentCard>
      </ContentGrid>

      <ContentCard theme={theme}>
        <CardTitle theme={theme}>
          <AccountBalance />
          Summary
        </CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: isDark(theme) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY, marginBottom: '0.5rem' }}>TOTAL ASSETS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
              {formatCurrency(balanceSheet.assets.total)}
            </div>
          </div>
          <div style={{ padding: '1rem', background: isDark(theme) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY, marginBottom: '0.5rem' }}>TOTAL LIABILITIES</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
              {formatCurrency(balanceSheet.liabilities.total)}
            </div>
          </div>
          <div style={{ padding: '1rem', background: isDark(theme) ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY, marginBottom: '0.5rem' }}>NET WORTH</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: balanceSheet.netWorth >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCurrency(balanceSheet.netWorth)}
            </div>
          </div>
        </div>
      </ContentCard>
    </TabContainer>
  );
};

export default BalanceSheetView;





