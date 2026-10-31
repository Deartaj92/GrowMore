import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Print, Close, FamilyRestroom } from '@mui/icons-material';
import { CollectFamilyPaymentResult } from '../../../types/feeLedger';
import { formatFeeCurrency, ModernButton } from '../FeeHubStyles';

interface Props {
  familyReceipt: CollectFamilyPaymentResult;
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
  border-radius: 10px;
  max-width: 720px;
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

const FamilyReceiptSheet = styled.div`
  border: 1.5px dashed #334155;
  padding: 20px;
  background: #ffffff;
  color: #0f172a;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 0.82rem;

  .inst-header {
    text-align: center;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 10px;
    margin-bottom: 12px;

    h2 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: -0.01em;
    }
    .doc-badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 10px;
      background: #0f172a;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    p {
      margin: 3px 0 0 0;
      font-size: 0.74rem;
      color: #475569;
    }
  }

  .family-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 16px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 0.78rem;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 1px dotted #e2e8f0;
      padding-bottom: 3px;
    }
    .meta-label {
      color: #475569;
      font-weight: 600;
    }
    .meta-val {
      font-weight: 800;
      color: #0f172a;
      text-align: right;
    }
  }

  .sibling-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;

    th {
      background: #f1f5f9;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      text-align: left;
      padding: 6px 8px;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    td {
      padding: 7px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.78rem;
      vertical-align: top;
    }
  }

  .totals-section {
    border: 1.5px solid #0f172a;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 12px;
    background: #f8fafc;

    .row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 0.82rem;
    }
    .grand {
      font-size: 1.05rem;
      font-weight: 900;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding: 6px 0;
      margin: 4px 0;
      color: #059669;
    }
  }

  .sig-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 26px;
    padding-top: 10px;
    border-top: 1px dashed #cbd5e1;
    font-size: 0.72rem;
    color: #475569;

    .sig-box {
      border-top: 1px solid #334155;
      padding-top: 4px;
      width: 160px;
      text-align: center;
      font-weight: 700;
      color: #0f172a;
    }
  }
`;

export const PrintFamilyReceiptModal: React.FC<Props> = ({ familyReceipt, onClose }) => {
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
            paddingBottom: '0.6rem',
            borderBottom: '1px solid #e2e8f0',
          }}
          className="no-print"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FamilyRestroom style={{ color: '#059669' }} />
            <div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>
                Consolidated Family Receipt • {familyReceipt.batch_ref}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {familyReceipt.member_receipts.length} Sibling Receipt(s) Settled Simultaneously
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ModernButton $variant="primary" onClick={handlePrint}>
              <Print fontSize="small" /> Print Family Receipt
            </ModernButton>
            <ModernButton $variant="ghost" onClick={onClose}>
              <Close fontSize="small" />
            </ModernButton>
          </div>
        </div>

        <FamilyReceiptSheet>
          <div className="inst-header">
            <h2>GROWMORE SCHOOL SYSTEM</h2>
            <span className="doc-badge">Consolidated Family Fee Payment Receipt</span>
            <p>Main Campus • Official Family Counter Voucher</p>
          </div>

          <div className="family-meta-grid">
            <div className="meta-row">
              <span className="meta-label">Family Account:</span>
              <span className="meta-val">
                {familyReceipt.family_name} (ID #{familyReceipt.family_id})
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Batch Voucher Ref:</span>
              <span className="meta-val" style={{ fontFamily: 'monospace' }}>
                {familyReceipt.batch_ref}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Depositor / Payer:</span>
              <span className="meta-val">{familyReceipt.payer_name || familyReceipt.family_name}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Date & Time:</span>
              <span className="meta-val">
                {familyReceipt.paid_at
                  ? new Date(familyReceipt.paid_at).toLocaleString()
                  : new Date().toLocaleString()}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Contact Phone:</span>
              <span className="meta-val">{familyReceipt.contact_number || '—'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Payment Mode:</span>
              <span className="meta-val" style={{ textTransform: 'uppercase' }}>
                {String(familyReceipt.payment_method || 'CASH').replace('_', ' ')}
              </span>
            </div>
          </div>

          <table className="sibling-table">
            <thead>
              <tr>
                <th>Sibling / Student</th>
                <th>Class & Roll</th>
                <th>Receipt #</th>
                <th>Challan(s) Settled</th>
                <th style={{ textAlign: 'right' }}>Allocated</th>
                <th style={{ textAlign: 'right' }}>Advance</th>
                <th style={{ textAlign: 'right' }}>Paid (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {familyReceipt.member_receipts.map((mr, idx) => {
                const challans =
                  (mr.allocations || [])
                    .map((a: any) => `#${a.challan_no || a.demand_id}`)
                    .filter(Boolean)
                    .join(', ') || 'Advance / Wallet';

                return (
                  <tr key={mr.receipt_id || idx}>
                    <td>
                      <div style={{ fontWeight: 800 }}>{mr.student_name}</div>
                      {mr.father_name && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>s/o {mr.father_name}</div>
                      )}
                    </td>
                    <td>
                      <div>{mr.class_name || '—'}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        Roll: {mr.roll_number || 'N/A'}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{mr.receipt_no}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{challans}</td>
                    <td style={{ textAlign: 'right' }}>{formatFeeCurrency(mr.allocated_amount)}</td>
                    <td style={{ textAlign: 'right', color: mr.wallet_amount > 0 ? '#059669' : '#64748b' }}>
                      {mr.wallet_amount > 0 ? `+${formatFeeCurrency(mr.wallet_amount)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                      {formatFeeCurrency(mr.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="totals-section">
            <div className="row grand">
              <span>TOTAL FAMILY PAYMENT RECEIVED:</span>
              <span>{formatFeeCurrency(familyReceipt.total_amount)}</span>
            </div>
            <div className="row">
              <span>Total Applied to Sibling Challans:</span>
              <span style={{ fontWeight: 700 }}>{formatFeeCurrency(familyReceipt.total_allocated)}</span>
            </div>
            {familyReceipt.total_wallet > 0 && (
              <div className="row" style={{ color: '#059669', fontWeight: 700 }}>
                <span>Credited to Family / Sibling Advance Wallet:</span>
                <span>+{formatFeeCurrency(familyReceipt.total_wallet)}</span>
              </div>
            )}
            <div className="row" style={{ borderTop: '1px dashed #cbd5e1', marginTop: '4px', paddingTop: '4px' }}>
              <span>Remaining Balance Across Included Siblings:</span>
              <span
                style={{
                  fontWeight: 800,
                  color: familyReceipt.total_balance_after > 0 ? '#dc2626' : '#059669',
                }}
              >
                {formatFeeCurrency(familyReceipt.total_balance_after)}
              </span>
            </div>
          </div>

          <div className="sig-footer">
            <div>
              <div>Computer generated consolidated family receipt.</div>
              <div>Individual ledger receipts: {familyReceipt.member_receipts.map((m) => `#${m.receipt_no}`).join(', ')}</div>
            </div>
            <div className="sig-box">Cashier Signature & Stamp</div>
          </div>
        </FamilyReceiptSheet>

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
              size: A5 landscape;
              margin: 8mm;
            }
          }
        `}</style>
      </Dialog>
    </Backdrop>,
    document.body
  );
};

export default PrintFamilyReceiptModal;

