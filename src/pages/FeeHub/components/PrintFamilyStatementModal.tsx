import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Print, Close, FamilyRestroom } from '@mui/icons-material';
import { FamilyFeeSummary, FamilyStatementEntry } from '../../../types/feeLedger';
import { formatFeeCurrency, formatFeeDate, ModernButton } from '../FeeHubStyles';

interface Props {
  family: FamilyFeeSummary;
  entries: FamilyStatementEntry[];
  onClose: () => void;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  padding: 1rem;
  box-sizing: border-box;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const Dialog = styled.div`
  background: #ffffff;
  color: #000000;
  border-radius: 8px;
  max-width: 980px;
  width: 100%;
  max-height: 95vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);

  @media print {
    padding: 0;
    max-width: 100%;
    box-shadow: none;
  }
`;

const StatementSheet = styled.div`
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #0f172a;
  background: #ffffff;
  padding: 10px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 10px;
    margin-bottom: 14px;

    h1 {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 900;
      text-transform: uppercase;
    }
    p {
      margin: 2px 0 0 0;
      color: #475569;
      font-size: 0.84rem;
    }
  }

  .family-box {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 0.8rem;

    @media (max-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }

    .field-title {
      font-size: 0.68rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .field-val {
      font-weight: 800;
      margin-top: 2px;
    }
  }

  .section-label {
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #334155;
    margin: 10px 0 6px 0;
    letter-spacing: 0.03em;
  }

  .statement-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.76rem;
    margin-bottom: 18px;

    thead {
      background: #f1f5f9;
      border-top: 1px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
    }

    th {
      padding: 6px 8px;
      text-align: left;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    tfoot {
      font-weight: 800;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      background: #f8fafc;
      td {
        padding: 8px;
      }
    }
  }

  .sig-area {
    display: flex;
    justify-content: space-between;
    margin-top: 45px;
    padding: 0 20px;

    .sig-col {
      text-align: center;
      width: 180px;
      border-top: 1px solid #475569;
      padding-top: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  }
`;

export const PrintFamilyStatementModal: React.FC<Props> = ({ family, entries, onClose }) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const totalDebits = entries.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredits = entries.reduce((s, r) => s + (r.credit || 0), 0);
  const finalBalance = entries.length > 0 ? entries[entries.length - 1].family_running_balance : 0;

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <Backdrop onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e2e8f0',
          }}
          className="no-print"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FamilyRestroom style={{ color: '#2563eb' }} />
            <div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Consolidated Family Financial Statement</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Family: {family.family_name} • {family.members.length} Linked Sibling(s)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ModernButton $variant="primary" onClick={handlePrint}>
              <Print fontSize="small" /> Print Family Statement
            </ModernButton>
            <ModernButton $variant="ghost" onClick={onClose}>
              <Close fontSize="small" />
            </ModernButton>
          </div>
        </div>

        <StatementSheet>
          <div className="header">
            <div>
              <h1>GROWMORE SCHOOL SYSTEM</h1>
              <p>Consolidated Family Account Statement & Sibling Fee Ledger</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#475569' }}>
              <div>Printed: {new Date().toLocaleDateString()}</div>
              <div>Family ID: #{family.family_id}</div>
            </div>
          </div>

          <div className="family-box">
            <div>
              <div className="field-title">Family / Guardian Name</div>
              <div className="field-val">{family.family_name}</div>
            </div>
            <div>
              <div className="field-title">Contact & Address</div>
              <div className="field-val">
                {family.contact_number || '—'} {family.address ? `• ${family.address}` : ''}
              </div>
            </div>
            <div>
              <div className="field-title">Linked Siblings</div>
              <div className="field-val">{family.members.length} Student(s)</div>
            </div>
            <div>
              <div className="field-title">Net Family Balance Due</div>
              <div
                className="field-val"
                style={{ color: family.total_due > 0 ? '#b91c1c' : '#15803d', fontSize: '1.05rem' }}
              >
                {formatFeeCurrency(family.total_due)}
              </div>
            </div>
          </div>

          {/* Sibling Summary Breakdown */}
          <div className="section-label">1. Sibling-Wise Financial Summary</div>
          <table className="statement-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Father Name</th>
                <th>Class & Roll</th>
                <th style={{ textAlign: 'right' }}>Total Billed (Rs)</th>
                <th style={{ textAlign: 'right' }}>Total Paid (Rs)</th>
                <th style={{ textAlign: 'right' }}>Wallet Credit (Rs)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {family.members.map((m) => (
                <tr key={m.student_id}>
                  <td style={{ fontWeight: 700 }}>{m.name}</td>
                  <td>{m.father_name || '—'}</td>
                  <td>
                    {m.class_name || '—'} (Roll: {m.roll_number || 'N/A'})
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatFeeCurrency(m.total_billed)}</td>
                  <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                    {formatFeeCurrency(m.total_paid)}
                  </td>
                  <td style={{ textAlign: 'right', color: m.wallet_balance > 0 ? '#059669' : '#64748b' }}>
                    {formatFeeCurrency(m.wallet_balance)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 800,
                      color: m.balance_due > 0 ? '#b91c1c' : '#15803d',
                    }}
                  >
                    {formatFeeCurrency(m.balance_due)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right' }}>
                  FAMILY TOTALS:
                </td>
                <td style={{ textAlign: 'right' }}>{formatFeeCurrency(family.total_billed)}</td>
                <td style={{ textAlign: 'right', color: '#15803d' }}>
                  {formatFeeCurrency(family.total_paid)}
                </td>
                <td style={{ textAlign: 'right' }}>{formatFeeCurrency(family.total_wallet)}</td>
                <td style={{ textAlign: 'right', color: family.total_due > 0 ? '#b91c1c' : '#15803d' }}>
                  {formatFeeCurrency(family.total_due)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Consolidated Chronological Ledger */}
          <div className="section-label">2. Consolidated Chronological Ledger Transactions</div>
          <table className="statement-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Sibling</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Particulars / Description</th>
                <th style={{ textAlign: 'right' }}>Debit (Rs)</th>
                <th style={{ textAlign: 'right' }}>Credit (Rs)</th>
                <th style={{ textAlign: 'right' }}>Family Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                    No ledger entries recorded for this family yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.entry_id}>
                    <td style={{ fontFamily: 'monospace' }}>#{entry.entry_id}</td>
                    <td>{formatFeeDate(entry.entry_date)}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{entry.student_name}</div>
                      {entry.class_name && (
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{entry.class_name}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{entry.entry_type.replace('_', ' ')}</td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {entry.challan_no
                        ? `#${entry.challan_no}`
                        : entry.receipt_no
                        ? `#${entry.receipt_no}`
                        : '—'}
                    </td>
                    <td>{entry.description}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: entry.debit ? '#b91c1c' : undefined,
                        fontWeight: entry.debit ? 700 : 400,
                      }}
                    >
                      {entry.debit ? formatFeeCurrency(entry.debit) : '—'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: entry.credit ? '#15803d' : undefined,
                        fontWeight: entry.credit ? 700 : 400,
                      }}
                    >
                      {entry.credit ? formatFeeCurrency(entry.credit) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                      {formatFeeCurrency(entry.family_running_balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ textAlign: 'right' }}>
                  CONSOLIDATED LIFETIME LEDGER TOTALS:
                </td>
                <td style={{ textAlign: 'right', color: '#b91c1c' }}>{formatFeeCurrency(totalDebits)}</td>
                <td style={{ textAlign: 'right', color: '#15803d' }}>{formatFeeCurrency(totalCredits)}</td>
                <td style={{ textAlign: 'right', color: finalBalance > 0 ? '#b91c1c' : '#15803d' }}>
                  {formatFeeCurrency(finalBalance)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="sig-area">
            <div className="sig-col">Cashier / Fee Counter</div>
            <div className="sig-col">Accounts Officer</div>
            <div className="sig-col">Principal / Director</div>
          </div>
        </StatementSheet>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .no-print {
              display: none !important;
            }
            #root, #root * {
              visibility: visible;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}</style>
      </Dialog>
    </Backdrop>,
    document.body
  );
};

export default PrintFamilyStatementModal;

