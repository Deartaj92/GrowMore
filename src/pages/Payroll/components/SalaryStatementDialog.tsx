import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../components/Layout/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../supabaseClient';
import { NewPayrollGeneration } from '../services/newPayrollService';
import { generateSalaryStatementPDF } from '../paymentReceipt';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  CheckCircle as PaidIcon,
  HourglassEmpty as UnpaidIcon,
  School as SchoolIcon,
  Receipt as ReceiptIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  WorkHistory as WorkIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingDown as DeductionIcon,
  TrendingUp as EarningIcon,
} from '@mui/icons-material';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { clayCardStyle, isDark } from '../../../styles/DesignSystem';

const CustomDialogContent = styled(DialogContent)<{ theme: any }>`
  padding: 1.25rem !important;
  background: ${({ theme }) => (isDark(theme) ? '#1c1d21' : '#ffffff')} !important;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SlipContainer = styled.div<{ theme: any }>`
  width: 100%;
  margin: 0 auto;

  @media print {
    padding: 1cm;
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: none !important;
  }
`;

const TopActionBar = styled.div<{ theme: any }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(255,255,255,0.03)' : '#f1f5f9'};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};

  @media print {
    display: none;
  }
`;

const HeaderSection = styled.div<{ theme: any }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 1.25rem;

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .logo-box {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: ${({ theme }) => `${theme.ACCENT}18`};
      color: ${({ theme }) => theme.ACCENT};
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 12px;
      }
    }

    h2 {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.3px;
      color: ${({ theme }) => theme.TEXT_PRIMARY};
    }

    p {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      margin: 0.15rem 0 0 0;
    }
  }

  .statement-meta {
    text-align: right;
    .badge {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.8px;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      background: ${({ theme }) => `${theme.ACCENT}18`};
      color: ${({ theme }) => theme.ACCENT};
      display: inline-block;
      margin-bottom: 0.3rem;
    }
    .period {
      font-size: 0.9rem;
      font-weight: 700;
      color: ${({ theme }) => theme.TEXT_PRIMARY};
    }
  }
`;

const MetaGrid = styled.div<{ theme: any }>`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
  padding: 1rem;
  border-radius: 12px;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 1.25rem;

  .meta-item {
    label {
      font-size: 0.68rem;
      text-transform: uppercase;
      font-weight: 700;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      display: block;
      margin-bottom: 0.15rem;
    }
    span {
      font-size: 0.92rem;
      font-weight: 700;
      color: ${({ theme }) => theme.TEXT_PRIMARY};
    }
  }
`;

const StatusChip = styled.span<{ $paid: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 8px;
  font-size: 0.73rem;
  font-weight: 700;
  background: ${({ $paid }) => ($paid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)')};
  color: ${({ $paid }) => ($paid ? '#10b981' : '#ef4444')};
  border: 1px solid ${({ $paid }) => ($paid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)')};
`;

const AttendanceRow = styled.div<{ theme: any }>`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.25rem;

  .att-box {
    padding: 0.6rem;
    border-radius: 10px;
    text-align: center;
    background: ${({ theme }) =>
      isDark(theme) ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
    border: 1px solid ${({ theme }) => theme.BORDER};

    label {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 700;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      display: block;
    }

    span {
      font-size: 1.05rem;
      font-weight: 800;
    }
  }
`;

const FinancialsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

const LedgerCard = styled.div<{ $type: 'earning' | 'deduction'; theme: any }>`
  border-radius: 12px;
  padding: 1rem;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(255,255,255,0.02)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .card-title {
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: ${({ $type }) => ($type === 'earning' ? '#10b981' : '#ef4444')};
  }

  .item-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    padding: 0.3rem 0;

    .name {
      color: ${({ theme }) => theme.TEXT_SECONDARY};
    }
    .amount {
      font-weight: 700;
    }
  }

  .total-row {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1.5px dashed ${({ theme }) => theme.BORDER};
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    font-size: 0.88rem;
    color: ${({ $type }) => ($type === 'earning' ? '#10b981' : '#ef4444')};
  }
`;

const NetSummaryBanner = styled.div<{ theme: any }>`
  padding: 1.1rem 1.25rem;
  border-radius: 14px;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)'};
  border: 1.5px solid ${({ theme }) => theme.ACCENT};
  display: flex;
  justify-content: space-between;
  align-items: center;

  .net-label {
    label {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 700;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      display: block;
    }
    span {
      font-size: 1.5rem;
      font-weight: 800;
      color: ${({ theme }) => theme.ACCENT};
    }
  }

  .net-status {
    text-align: right;
    font-size: 0.82rem;
    .paid {
      color: theme.TEXT_PRIMARY;
      font-weight: 600;
    }
    .rem {
      font-weight: 700;
      margin-top: 0.15rem;
    }
  }
`;

const SignatureBlock = styled.div<{ theme: any }>`
  display: none;
  justify-content: space-between;
  margin-top: 2.5rem;
  padding-top: 1rem;

  @media print {
    display: flex;
  }

  .sig-line {
    width: 180px;
    text-align: center;
    border-top: 1px solid #000;
    padding-top: 0.4rem;
    font-size: 0.78rem;
    font-weight: 700;
  }
`;

const ActionButton = styled.button<{ theme: any }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

interface StatementDialogProps {
  open: boolean;
  generation: NewPayrollGeneration | null;
  onClose: () => void;
}

const SalaryStatementDialog: React.FC<StatementDialogProps> = ({ open, generation, onClose }) => {
  const { theme: themeMode } = useTheme();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { formatCurrency } = usePayrollDisplaySettings();

  const [school, setSchool] = useState<{ name: string; address?: string; phone?: string; logo_url?: string } | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user?.school_id && generation?.id) {
      Promise.all([
        supabase.from('institute_profile').select('*').eq('school_id', user.school_id).maybeSingle(),
        supabase.from('schools').select('*').eq('id', user.school_id).maybeSingle(),
        supabase
          .from('payroll_payments')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('generation_id', generation.id)
          .order('payment_date', { ascending: true }),
      ]).then(([profRes, schoolRes, paymentsRes]) => {
        const p = profRes.data;
        const s = schoolRes.data;
        if (p || s) {
          setSchool({
            name: p?.name || p?.short_name || s?.name || 'School Statement',
            address: p?.address || s?.address || '',
            phone: p?.phone || s?.contact_number || s?.contact || '',
            logo_url: p?.logo_url || s?.logo_url || '',
          });
        }
        setPaymentHistory(paymentsRes.data || []);
      });
    }
  }, [user?.school_id, generation?.id]);

  if (!generation) return null;

  const monthName = new Date(generation.payrollYear, generation.payrollMonth - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const isPaid = generation.status === 'paid';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: '16px',
          overflow: 'hidden',
          background: isDark(theme) ? '#1c1d21' : '#ffffff',
          border: `1px solid ${theme.BORDER}`,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
          zIndex: 10000,
        },
      }}
    >
      <TopActionBar theme={theme}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: theme.TEXT_PRIMARY, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ReceiptIcon style={{ color: theme.ACCENT, fontSize: 20 }} /> Official Monthly Salary Statement
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <ActionButton
            theme={theme}
            onClick={() => {
              if (user?.school_id && generation) {
                generateSalaryStatementPDF(user.school_id, generation);
              }
            }}
          >
            <PrintIcon style={{ fontSize: 16 }} /> Print PDF (A5)
          </ActionButton>
          <IconButton onClick={onClose} size="small" style={{ color: theme.TEXT_SECONDARY }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </TopActionBar>

      <CustomDialogContent theme={theme}>
        <SlipContainer theme={theme}>
          {/* Header Branding Banner */}
          <HeaderSection theme={theme}>
            <div className="brand">
              <div className="logo-box">
                {school?.logo_url ? (
                  <img src={school.logo_url} alt={school.name} />
                ) : (
                  <SchoolIcon fontSize="medium" />
                )}
              </div>
              <div>
                <h2>{school?.name || 'Grow More Academy'}</h2>
                <p>{school?.address ? `${school.address} ${school.phone ? `• ${school.phone}` : ''}` : 'Official Staff Salary Statement'}</p>
              </div>
            </div>

            <div className="statement-meta">
              <div className="badge">SALARY STATEMENT</div>
              <div className="period">{monthName}</div>
            </div>
          </HeaderSection>

          {/* Staff & Status Info */}
          <MetaGrid theme={theme}>
            <div className="meta-item">
              <label>Staff Member</label>
              <span>{generation.staff?.name || `Staff #${generation.staffId}`}</span>
            </div>
            <div className="meta-item">
              <label>Designation / Role</label>
              <span>{generation.staff?.role || 'Staff Member'}</span>
            </div>
            <div className="meta-item">
              <label>Pay Period</label>
              <span>{monthName}</span>
            </div>
            <div className="meta-item">
              <label>Payment Status</label>
              <div>
                <StatusChip $paid={isPaid}>
                  {isPaid ? <PaidIcon style={{ fontSize: 13 }} /> : <UnpaidIcon style={{ fontSize: 13 }} />}
                  {generation.status.toUpperCase().replace('_', ' ')}
                </StatusChip>
              </div>
            </div>
          </MetaGrid>

          {/* Attendance Summary */}
          <AttendanceRow theme={theme}>
            <div className="att-box">
              <label>Working Days</label>
              <span>{generation.workingDays}</span>
            </div>
            <div className="att-box">
              <label>Present Days</label>
              <span style={{ color: '#10b981' }}>{generation.presentDays}</span>
            </div>
            <div className="att-box">
              <label>Absent Days</label>
              <span style={{ color: '#ef4444' }}>{generation.absentDays}</span>
            </div>
            <div className="att-box">
              <label>Late Days</label>
              <span style={{ color: '#f59e0b' }}>{generation.lateDays || 0}</span>
            </div>
          </AttendanceRow>

          {/* Detailed Earnings vs Deductions Breakdown */}
          <FinancialsGrid>
            <LedgerCard $type="earning" theme={theme}>
              <div>
                <div className="card-title">
                  <EarningIcon fontSize="small" /> Earnings Breakdown
                </div>
                <div className="item-row">
                  <span className="name">Basic Monthly Pay</span>
                  <span className="amount">{formatCurrency(generation.basicPay)}</span>
                </div>
                {generation.earningsItems.map((item, idx) => (
                  <div className="item-row" key={idx}>
                    <span className="name">{item.name}</span>
                    <span className="amount" style={{ color: '#10b981' }}>+{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="total-row">
                <span>Gross Earnings</span>
                <span>{formatCurrency(generation.totalEarnings)}</span>
              </div>
            </LedgerCard>

            <LedgerCard $type="deduction" theme={theme}>
              <div>
                <div className="card-title">
                  <DeductionIcon fontSize="small" /> Deductions Breakdown
                </div>
                {generation.deductionItems.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: theme.TEXT_SECONDARY, fontStyle: 'italic', padding: '0.4rem 0' }}>
                    No deductions for this period.
                  </div>
                ) : (
                  generation.deductionItems.map((item, idx) => (
                    <div className="item-row" key={idx}>
                      <span className="name">{item.name}</span>
                      <span className="amount" style={{ color: '#ef4444' }}>-{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="total-row">
                <span>Total Deductions</span>
                <span>-{formatCurrency(generation.totalDeductions)}</span>
              </div>
            </LedgerCard>
          </FinancialsGrid>

          {/* Net Salary Summary Banner */}
          <NetSummaryBanner theme={theme}>
            <div className="net-label">
              <label>Net Payable Salary</label>
              <span>{formatCurrency(generation.netSalary)}</span>
            </div>
            <div className="net-status">
              <div className="paid">Disbursed: <b>{formatCurrency(generation.paidAmount)}</b></div>
              <div className="rem" style={{ color: generation.remainingBalance > 0 ? '#ef4444' : '#10b981' }}>
                Remaining Balance: {formatCurrency(generation.remainingBalance)}
              </div>
            </div>
          </NetSummaryBanner>

          {/* Detailed Payment Audit Trail */}
          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: `1px dashed ${theme.BORDER}` }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: theme.TEXT_PRIMARY, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <WalletIcon style={{ color: theme.ACCENT, fontSize: 18 }} /> Payment Transaction History ({paymentHistory.length} Payments Recorded)
            </div>
            {paymentHistory.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: theme.TEXT_SECONDARY, fontStyle: 'italic', padding: '0.5rem', background: isDark(theme) ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderRadius: '8px', textAlign: 'center' }}>
                No disbursements recorded for this statement yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.BORDER}`, color: theme.TEXT_SECONDARY, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Receipt #</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Date & Time</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Mode</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Reference / Cheque</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((p, idx) => (
                      <tr key={p.id || idx} style={{ borderBottom: `1px solid ${theme.BORDER}` }}>
                        <td style={{ padding: '0.45rem 0.5rem', fontWeight: 700 }}>PR-{String(p.id).padStart(5, '0')}</td>
                        <td style={{ padding: '0.45rem 0.5rem' }}>
                          {new Date(p.payment_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textTransform: 'capitalize' }}>{(p.payment_mode || 'cash').replace('_', ' ')}</td>
                        <td style={{ padding: '0.45rem 0.5rem', color: theme.TEXT_SECONDARY }}>{p.reference_no || '-'}</td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                          {formatCurrency(parseFloat(p.amount || '0'))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Print Signatures */}
          <SignatureBlock theme={theme}>
            <div className="sig-line">Staff Member Signature</div>
            <div className="sig-line">Authorized Signatory / Accountant</div>
          </SignatureBlock>
        </SlipContainer>
      </CustomDialogContent>
    </Dialog>
  );
};

export default SalaryStatementDialog;
