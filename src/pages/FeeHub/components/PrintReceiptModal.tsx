import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Print, Close } from '@mui/icons-material';
import { CollectPaymentResult } from '../../../types/feeLedger';
import { formatFeeCurrency, formatFeeDate, ModernButton } from '../FeeHubStyles';

interface Props {
  receipt: CollectPaymentResult;
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
  max-width: 520px;
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

const ThermalReceipt = styled.div`
  border: 1px dashed #475569;
  padding: 18px;
  background: #ffffff;
  color: #0f172a;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.82rem;

  .inst-header {
    text-align: center;
    border-bottom: 2px dashed #0f172a;
    padding-bottom: 10px;
    margin-bottom: 12px;

    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 900;
    }
    p {
      margin: 2px 0 0 0;
      font-size: 0.75rem;
      color: #475569;
    }
  }

  .meta-table {
    width: 100%;
    margin-bottom: 12px;
    td {
      padding: 2px 0;
    }
  }

  .alloc-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    th {
      border-bottom: 1px solid #0f172a;
      text-align: left;
      padding: 4px 0;
      font-size: 0.75rem;
    }
    td {
      padding: 4px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
  }

  .totals-section {
    border-top: 2px dashed #0f172a;
    padding-top: 8px;
    margin-top: 10px;

    .row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .grand {
      font-size: 1.05rem;
      font-weight: 900;
      border-top: 1px solid #0f172a;
      border-bottom: 1px solid #0f172a;
      padding: 4px 0;
      margin: 4px 0;
    }
  }

  .footer {
    text-align: center;
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px dashed #cbd5e1;
    font-size: 0.72rem;
    color: #475569;
  }
`;

export const PrintReceiptModal: React.FC<Props> = ({ receipt, onClose }) => {
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
            <h3 style={{ margin: 0, fontWeight: 800 }}>Payment Receipt #{receipt.receipt_no}</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Transaction Confirmed & Allocated
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ModernButton $variant="primary" onClick={handlePrint}>
              <Print fontSize="small" /> Print
            </ModernButton>
            <ModernButton $variant="ghost" onClick={onClose}>
              <Close fontSize="small" />
            </ModernButton>
          </div>
        </div>

        <ThermalReceipt>
          <div className="inst-header">
            <h2>GROWMORE SCHOOL</h2>
            <p>Official Fee Collection Receipt</p>
            <p>NTN: 894412-4 • Ph: (042) 3578-9000</p>
          </div>

          <table className="meta-table">
            <tbody>
              <tr>
                <td><strong>Receipt No:</strong></td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>#{receipt.receipt_no}</td>
              </tr>
              <tr>
                <td><strong>Date & Time:</strong></td>
                <td style={{ textAlign: 'right' }}>
                  {receipt.snapshot?.paid_at
                    ? new Date(receipt.snapshot.paid_at).toLocaleString()
                    : new Date().toLocaleString()}
                </td>
              </tr>
              {(receipt.student_name || receipt.snapshot?.student_name) && (
                <tr>
                  <td><strong>Student:</strong></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {receipt.student_name || receipt.snapshot?.student_name}
                  </td>
                </tr>
              )}
              {(receipt.roll_number || receipt.snapshot?.roll_number) && (
                <tr>
                  <td><strong>Roll / Father:</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    {receipt.roll_number || receipt.snapshot?.roll_number}
                    {(receipt.father_name || receipt.snapshot?.father_name)
                      ? ` (s/o ${receipt.father_name || receipt.snapshot?.father_name})`
                      : ''}
                  </td>
                </tr>
              )}
              <tr>
                <td><strong>Payment Mode:</strong></td>
                <td style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                  {receipt.payment_method || receipt.snapshot?.payment_method || 'CASH'}
                </td>
              </tr>
            </tbody>
          </table>

          {receipt.allocations && receipt.allocations.length > 0 && (
            <table className="alloc-table">
              <thead>
                <tr>
                  <th>Particulars / Demand</th>
                  <th style={{ textAlign: 'right' }}>Allocated</th>
                </tr>
              </thead>
              <tbody>
                {receipt.allocations.map((a: any, i: number) => (
                  <tr key={i}>
                    <td>Challan #{a.challan_no}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatFeeCurrency(a.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="totals-section">
            <div className="row grand">
              <span>TOTAL RECEIVED:</span>
              <span>{formatFeeCurrency(receipt.amount)}</span>
            </div>
            <div className="row">
              <span>Applied to Demands:</span>
              <span>{formatFeeCurrency(receipt.allocated_amount)}</span>
            </div>
            {receipt.wallet_amount > 0 && (
              <div className="row" style={{ color: '#059669', fontWeight: 700 }}>
                <span>Credited to Advance Wallet:</span>
                <span>+{formatFeeCurrency(receipt.wallet_amount)}</span>
              </div>
            )}
          </div>

          <div className="footer">
            <p style={{ margin: 0 }}>This is a computer generated receipt.</p>
            <p style={{ margin: '2px 0 0 0' }}>Thank you for your payment!</p>
          </div>
        </ThermalReceipt>

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
              size: 80mm auto;
              margin: 4mm;
            }
          }
        `}</style>
      </Dialog>
    </Backdrop>,
    document.body
  );
};
export default PrintReceiptModal;
