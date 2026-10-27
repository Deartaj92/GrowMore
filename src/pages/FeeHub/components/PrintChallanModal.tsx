import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Print, Close } from '@mui/icons-material';
import { FeeDemand, FeeDemandLine } from '../../../types/feeLedger';
import { formatFeeCurrency, formatFeeDate, ModernButton } from '../FeeHubStyles';

interface Props {
  demand: FeeDemand;
  lines: FeeDemandLine[];
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
  max-width: 1100px;
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

const ChallanRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  background: #ffffff;
  color: #000000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ChallanSlip = styled.div`
  border: 1.5px solid #1e293b;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.72rem;
  line-height: 1.3;
  background: #ffffff;

  .slip-header {
    text-align: center;
    border-bottom: 1.5px solid #1e293b;
    padding-bottom: 6px;
    margin-bottom: 6px;

    .inst-title {
      font-size: 0.95rem;
      font-weight: 900;
      letter-spacing: -0.01em;
      margin: 0;
      text-transform: uppercase;
    }

    .copy-tag {
      display: inline-block;
      margin-top: 3px;
      padding: 1px 8px;
      background: #1e293b;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.65rem;
      border-radius: 3px;
      text-transform: uppercase;
    }
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px 6px;
    margin-bottom: 6px;
    background: #f8fafc;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;

    th {
      border-bottom: 1px solid #1e293b;
      padding: 3px 2px;
      text-align: left;
      font-size: 0.65rem;
      text-transform: uppercase;
    }

    td {
      padding: 3px 2px;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 0.7rem;
    }
  }

  .totals-box {
    border: 1.5px solid #1e293b;
    padding: 4px 6px;
    border-radius: 3px;
    margin-bottom: 6px;
    background: #f1f5f9;

    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 0.72rem;
    }
    .bold-row {
      font-weight: 800;
      font-size: 0.8rem;
      border-top: 1px solid #cbd5e1;
      padding-top: 3px;
      margin-top: 2px;
    }
  }

  .instructions {
    font-size: 0.62rem;
    color: #475569;
    margin-bottom: 16px;
  }

  .sig-row {
    display: flex;
    justify-content: space-between;
    margin-top: 18px;
    padding-top: 4px;
    border-top: 1px solid #94a3b8;
    font-size: 0.62rem;
    font-weight: 600;
  }
`;

export const PrintChallanModal: React.FC<Props> = ({ demand, lines, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const copies = ['Bank Copy', 'Institute Copy', 'Student Copy'];
  const snapshot = demand.snapshot || {};

  const totalCharges = lines
    .filter((l) => l.line_type === 'charge')
    .reduce((s, l) => s + (l.gross_amount ?? l.amount ?? 0), 0);
  const totalConcessions = lines
    .filter((l) => l.line_type === 'charge')
    .reduce((s, l) => s + (l.concession_amount || 0), 0);
  const lateFine = lines
    .filter((l) => l.line_type === 'late_fine')
    .reduce((s, l) => s + (l.gross_amount ?? l.amount ?? 0), 0);

  const payableWithinDueDate = demand.net_amount;
  const payableAfterDueDate = payableWithinDueDate + (lateFine > 0 ? 0 : 300); // Standard Rs 300 default late fine preview if not yet assessed

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
        {/* Controls (hidden during print) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e2e8f0',
          }}
          className="no-print"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              Official 3-Copy Bank Challan
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Challan #{demand.challan_no}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ModernButton $variant="primary" onClick={handlePrint}>
              <Print fontSize="small" /> Print Challan (A4)
            </ModernButton>
            <ModernButton $variant="ghost" onClick={onClose}>
              <Close fontSize="small" />
            </ModernButton>
          </div>
        </div>

        {/* 3-Copy Slip Grid */}
        <div ref={printRef}>
          <ChallanRow>
            {copies.map((copyName, idx) => (
              <ChallanSlip key={idx}>
                <div>
                  <div className="slip-header">
                    <h2 className="inst-title">GROWMORE SCHOOL</h2>
                    <div style={{ fontSize: '0.65rem', color: '#475569' }}>
                      Main Campus • Ph: (042) 3578-9000
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '2px' }}>
                      Bank: Allied Bank Ltd / A/C: 0010-4492-0012
                    </div>
                    <span className="copy-tag">{copyName}</span>
                  </div>

                  <div className="meta-grid">
                    <div>
                      <strong>Challan:</strong> #{demand.challan_no}
                    </div>
                    <div>
                      <strong>Issue:</strong> {formatFeeDate(demand.issue_date)}
                    </div>
                    <div>
                      <strong>Due Date:</strong> {formatFeeDate(demand.due_date)}
                    </div>
                    <div>
                      <strong>Session:</strong> #{demand.session_id}
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      marginBottom: '6px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <strong>Student:</strong> {snapshot.student_name || `ID #${demand.student_id}`}
                    </div>
                    <div>
                      <strong>Father:</strong> {snapshot.father_name || '—'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        <strong>Class:</strong> {snapshot.class_name || '—'}
                      </span>
                      <span>
                        <strong>Roll:</strong> {snapshot.roll_number || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Particulars</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, lIdx) => (
                        <tr key={lIdx}>
                          <td>{l.title}</td>
                          <td style={{ textAlign: 'right' }}>{formatFeeCurrency(l.gross_amount ?? l.amount ?? 0)}</td>
                        </tr>
                      ))}
                      {totalConcessions > 0 && (
                        <tr style={{ color: '#059669' }}>
                          <td>Concession / Scholarship</td>
                          <td style={{ textAlign: 'right' }}>-{formatFeeCurrency(totalConcessions)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className="totals-box">
                    <div className="row bold-row">
                      <span>Within Due Date:</span>
                      <span>{formatFeeCurrency(payableWithinDueDate)}</span>
                    </div>
                    <div className="row" style={{ color: '#dc2626', fontWeight: 700 }}>
                      <span>After Due Date:</span>
                      <span>{formatFeeCurrency(payableAfterDueDate)}</span>
                    </div>
                    {demand.paid_amount > 0 && (
                      <div className="row" style={{ color: '#059669', fontWeight: 700 }}>
                        <span>Paid So Far:</span>
                        <span>{formatFeeCurrency(demand.paid_amount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="instructions">
                    * Fee once deposited is not refundable.
                    <br />* Please ensure bank cashier signs & stamps this slip.
                  </div>

                  <div className="sig-row">
                    <span>Officer Stamp</span>
                    <span>Cashier Sign</span>
                  </div>
                </div>
              </ChallanSlip>
            ))}
          </ChallanRow>
        </div>

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
              size: A4 landscape;
              margin: 8mm;
            }
          }
        `}</style>
      </Dialog>
    </Backdrop>,
    document.body
  );
};
export default PrintChallanModal;
