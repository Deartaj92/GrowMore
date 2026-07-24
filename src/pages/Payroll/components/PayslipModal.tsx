import React, { useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { NewPayrollGeneration } from '../services/newPayrollService';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  CheckCircle as PaidIcon,
  HourglassEmpty as UnpaidIcon,
} from '@mui/icons-material';
import { IconButton } from '@mui/material';

const Overlay = styled.div<{ theme: any }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  padding: 1rem;
`;

const ModalCard = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? '#1e1e1e' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  max-width: 650px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;

  @media print {
    border: none;
    box-shadow: none;
    max-width: 100%;
    width: 100%;
  }
`;

const ModalHeader = styled.div<{ theme: any }>`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3<{ theme: any }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const PayslipHeader = styled.div<{ theme: any }>`
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 2px dashed ${({ theme }) => theme.BORDER};

  h2 {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0 0 0.25rem 0;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  p {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    margin: 0;
  }
`;

const InfoGrid = styled.div<{ theme: any }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.82rem;

  div span {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    display: block;
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  div b {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    font-size: 0.9rem;
  }
`;

const StatsStrip = styled.div<{ theme: any }>`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  text-align: center;
`;

const StatItem = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 0.5rem;

  label {
    font-size: 0.68rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-weight: 600;
    display: block;
  }

  value {
    font-size: 1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const BreakdownGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const ColumnCard = styled.div<{ $type: 'earning' | 'deduction'; theme: any }>`
  background: ${({ $type, theme }) =>
    $type === 'earning'
      ? theme.BG === '#252525'
        ? 'rgba(16,185,129,0.06)'
        : 'rgba(16,185,129,0.04)'
      : theme.BG === '#252525'
      ? 'rgba(239,68,68,0.06)'
      : 'rgba(239,68,68,0.04)'};
  border: 1px solid
    ${({ $type }) => ($type === 'earning' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)')};
  border-radius: 10px;
  padding: 1rem;

  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.82rem;
    font-weight: 700;
    color: ${({ $type }) => ($type === 'earning' ? '#10b981' : '#ef4444')};
    border-bottom: 1px solid
      ${({ $type }) => ($type === 'earning' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)')};
    padding-bottom: 0.35rem;
  }
`;

const RowItem = styled.div<{ theme: any }>`
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  padding: 0.2rem 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const NetSalaryBanner = styled.div<{ theme: any }>`
  background: ${({ theme }) => `${theme.ACCENT}15`};
  border: 1px solid ${({ theme }) => theme.ACCENT};
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  div span {
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }

  div b {
    font-size: 1.35rem;
    font-weight: 800;
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const StatusStamp = styled.div<{ $paid: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  background: ${({ $paid }) => ($paid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)')};
  color: ${({ $paid }) => ($paid ? '#10b981' : '#ef4444')};
  border: 1px solid ${({ $paid }) => ($paid ? '#10b981' : '#ef4444')};
`;

const PrintButton = styled.button<{ theme: any }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

interface PayslipModalProps {
  generation: NewPayrollGeneration;
  onClose: () => void;
}

const PayslipModal: React.FC<PayslipModalProps> = ({ generation, onClose }) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { formatCurrency } = usePayrollDisplaySettings();

  const monthName = new Date(generation.payrollYear, generation.payrollMonth - 1, 1).toLocaleString(
    'default',
    { month: 'long', year: 'numeric' }
  );

  const handlePrint = () => {
    window.print();
  };

  const isPaid = generation.status === 'paid';

  return (
    <Overlay theme={theme} onClick={onClose}>
      <ModalCard theme={theme} onClick={e => e.stopPropagation()}>
        <ModalHeader theme={theme}>
          <Title theme={theme}>Official Salary Payslip</Title>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <PrintButton theme={theme} onClick={handlePrint}>
              <PrintIcon style={{ fontSize: 16 }} /> Print Payslip
            </PrintButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </ModalHeader>

        <ModalBody>
          <PayslipHeader theme={theme}>
            <h2>Grow More Academy</h2>
            <p>Official Monthly Salary Statement — {monthName}</p>
          </PayslipHeader>

          <InfoGrid theme={theme}>
            <div>
              <span>Employee Name</span>
              <b>{generation.staff?.name || `Staff #${generation.staffId}`}</b>
            </div>
            <div>
              <span>Designation / Role</span>
              <b>{generation.staff?.role || 'Staff'}</b>
            </div>
            <div>
              <span>Pay Period</span>
              <b>{monthName}</b>
            </div>
            <div>
              <span>Payment Status</span>
              <StatusStamp $paid={isPaid}>
                {isPaid ? <PaidIcon style={{ fontSize: 14 }} /> : <UnpaidIcon style={{ fontSize: 14 }} />}
                {generation.status.toUpperCase()}
              </StatusStamp>
            </div>
          </InfoGrid>

          <StatsStrip theme={theme}>
            <StatItem theme={theme}>
              <label>Working Days</label>
              <div>{generation.workingDays}</div>
            </StatItem>
            <StatItem theme={theme}>
              <label>Present Days</label>
              <div style={{ color: '#10b981' }}>{generation.presentDays}</div>
            </StatItem>
            <StatItem theme={theme}>
              <label>Absent Days</label>
              <div style={{ color: '#ef4444' }}>{generation.absentDays}</div>
            </StatItem>
            <StatItem theme={theme}>
              <label>Leave Days</label>
              <div style={{ color: '#f59e0b' }}>{generation.leaveDays}</div>
            </StatItem>
          </StatsStrip>

          <BreakdownGrid>
            <ColumnCard $type="earning" theme={theme}>
              <h4>➕ Earnings Breakdown</h4>
              <RowItem theme={theme}>
                <span>Basic Monthly Pay:</span>
                <b>{formatCurrency(generation.basicPay)}</b>
              </RowItem>
              {generation.earningsItems.map((item, idx) => (
                <RowItem key={idx} theme={theme}>
                  <span>{item.name}:</span>
                  <span style={{ color: '#10b981' }}>+{formatCurrency(item.amount)}</span>
                </RowItem>
              ))}
              <div
                style={{
                  borderTop: '1px solid rgba(16,185,129,0.3)',
                  paddingTop: '0.4rem',
                  marginTop: '0.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                <span>Total Gross Earnings:</span>
                <span>{formatCurrency(generation.totalEarnings)}</span>
              </div>
            </ColumnCard>

            <ColumnCard $type="deduction" theme={theme}>
              <h4>➖ Deductions Breakdown</h4>
              {generation.deductionItems.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: theme.TEXT_SECONDARY, padding: '0.2rem 0' }}>
                  No deductions for this month.
                </div>
              ) : (
                generation.deductionItems.map((item, idx) => (
                  <RowItem key={idx} theme={theme}>
                    <span>{item.name}:</span>
                    <span style={{ color: '#ef4444' }}>-{formatCurrency(item.amount)}</span>
                  </RowItem>
                ))
              )}
              <div
                style={{
                  borderTop: '1px solid rgba(239,68,68,0.3)',
                  paddingTop: '0.4rem',
                  marginTop: '0.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  color: '#ef4444',
                }}
              >
                <span>Total Deductions:</span>
                <span>-{formatCurrency(generation.totalDeductions)}</span>
              </div>
            </ColumnCard>
          </BreakdownGrid>

          <NetSalaryBanner theme={theme}>
            <div>
              <span>Net Payable Salary</span>
              <br />
              <b>{formatCurrency(generation.netSalary)}</b>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block' }}>Paid Amount: {formatCurrency(generation.paidAmount)}</span>
              <span style={{ color: generation.remainingBalance > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                Remaining Balance: {formatCurrency(generation.remainingBalance)}
              </span>
            </div>
          </NetSalaryBanner>
        </ModalBody>
      </ModalCard>
    </Overlay>
  );
};

export default PayslipModal;
