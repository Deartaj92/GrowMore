import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Print, Close } from '@mui/icons-material';
import { StatementEntry } from '../../../types/feeLedger';
import { formatFeeCurrency, formatFeeDate, ModernButton } from '../FeeHubStyles';

interface Props {
  student: any;
  statement: StatementEntry[];
  accountBalance: { total_billed: number; total_paid: number; net_due: number; advance_balance: number } | null;
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
  max-width: 900px;
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
      font-size: 1.5rem;
      font-weight: 900;
      text-transform: uppercase;
    }
    p {
      margin: 2px 0 0 0;
      color: #475569;
      font-size: 0.85rem;
    }
  }

  .student-box {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
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
      font-weight: 700;
      margin-top: 2px;
    }
  }

  .table-scroll-container {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    @media print {
      overflow-x: visible;
    }
  }

  .statement-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
    margin-bottom: 20px;

    thead {
      background: #f1f5f9;
      border-top: 1px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
    }

    th {
      padding: 6px 8px;
      text-align: left;
      font-size: 0.7rem;
      font-weight: 700;
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
    margin-top: 50px;
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

export const PrintStatementModal: React.FC<Props> = ({
  student,
  statement,
  accountBalance,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const totalDebits = statement.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredits = statement.reduce((s, r) => s + (r.credit || 0), 0);
  const finalBalance = statement.length > 0 ? statement[statement.length - 1].running_balance : 0;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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
          <div>
            <h3 style={{ margin: 0, fontWeight: 800 }}>Student Financial Statement</h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Official Double-Entry Ledger
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ModernButton $variant="primary" onClick={handlePrint}>
              <Print fontSize="small" /> Print Statement
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
              <p>Official Student Account Statement & Financial Ledger</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#475569' }}>
              <div>Printed: {new Date().toLocaleDateString()}</div>
              <div>Status: Active Account</div>
            </div>
          </div>

          <div className="student-box">
            <div>
              <div className="field-title">Student Name</div>
              <div className="field-val">{student?.name}</div>
            </div>
            <div>
              <div className="field-title">Father Name</div>
              <div className="field-val">{student?.father_name || '—'}</div>
            </div>
            <div>
              <div className="field-title">Class / Roll #</div>
              <div className="field-val">
                {student?.classes?.name || '—'} (Roll: {student?.roll_number || 'N/A'})
              </div>
            </div>
            <div>
              <div className="field-title">Net Outstanding Due</div>
              <div
                className="field-val"
                style={{ color: finalBalance > 0 ? '#b91c1c' : '#15803d', fontSize: '1rem' }}
              >
                {formatFeeCurrency(finalBalance)}
              </div>
            </div>
          </div>

          <div className="table-scroll-container">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Ref (Challan / Rec)</th>
                  <th>Particulars / Description</th>
                  <th style={{ textAlign: 'right' }}>Debit (Rs)</th>
                  <th style={{ textAlign: 'right' }}>Credit (Rs)</th>
                  <th style={{ textAlign: 'right' }}>Balance (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {statement.map((entry) => (
                  <tr key={entry.entry_id}>
                    <td style={{ fontFamily: 'monospace' }}>#{entry.entry_id}</td>
                    <td>{formatFeeDate(entry.entry_date)}</td>
                    <td style={{ fontWeight: 600 }}>{entry.entry_type.replace('_', ' ')}</td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {entry.challan_no ? `CH-${entry.challan_no}` : entry.receipt_no ? `REC-${entry.receipt_no}` : '—'}
                    </td>
                    <td>{entry.description}</td>
                    <td style={{ textAlign: 'right', color: entry.debit ? '#b91c1c' : undefined, fontWeight: entry.debit ? 700 : 400 }}>
                      {entry.debit ? formatFeeCurrency(entry.debit) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: entry.credit ? '#15803d' : undefined, fontWeight: entry.credit ? 700 : 400 }}>
                      {entry.credit ? formatFeeCurrency(entry.credit) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                      {formatFeeCurrency(entry.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right' }}>LIFETIME TOTALS:</td>
                  <td style={{ textAlign: 'right', color: '#b91c1c' }}>{formatFeeCurrency(totalDebits)}</td>
                  <td style={{ textAlign: 'right', color: '#15803d' }}>{formatFeeCurrency(totalCredits)}</td>
                  <td style={{ textAlign: 'right', color: finalBalance > 0 ? '#b91c1c' : '#15803d' }}>
                    {formatFeeCurrency(finalBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

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
export default PrintStatementModal;
