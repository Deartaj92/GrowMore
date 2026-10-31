import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Print, Close, FamilyRestroom } from '@mui/icons-material';
import { FamilyFeeSummary } from '../../../types/feeLedger';
import { formatFeeCurrency, formatFeeDate, ModernButton } from '../FeeHubStyles';

interface Props {
  family: FamilyFeeSummary;
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
  max-width: 1180px;
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

  @media (max-width: 960px) {
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
  font-size: 0.7rem;
  line-height: 1.3;
  background: #ffffff;

  .slip-header {
    text-align: center;
    border-bottom: 1.5px solid #1e293b;
    padding-bottom: 6px;
    margin-bottom: 6px;

    .inst-title {
      font-size: 0.92rem;
      font-weight: 900;
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
      font-size: 0.62rem;
      border-radius: 3px;
      text-transform: uppercase;
    }
  }

  .family-box {
    background: #f8fafc;
    padding: 5px 7px;
    border-radius: 3px;
    margin-bottom: 6px;
    border: 1px solid #cbd5e1;
  }

  .siblings-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;

    th {
      border-bottom: 1px solid #1e293b;
      background: #f1f5f9;
      padding: 3px 3px;
      text-align: left;
      font-size: 0.62rem;
      text-transform: uppercase;
    }

    td {
      padding: 3px 3px;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 0.66rem;
      vertical-align: top;
    }
  }

  .totals-box {
    border: 1.5px solid #1e293b;
    padding: 5px 7px;
    border-radius: 3px;
    margin-bottom: 6px;
    background: #f1f5f9;

    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 0.7rem;
    }
    .bold-row {
      font-weight: 900;
      font-size: 0.78rem;
      border-top: 1px solid #94a3b8;
      padding-top: 3px;
      margin-top: 2px;
    }
  }

  .sig-row {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 4px;
    border-top: 1px solid #94a3b8;
    font-size: 0.6rem;
    font-weight: 600;
  }
`;

export const PrintFamilyChallanModal: React.FC<Props> = ({ family, onClose }) => {
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

  const copies = ['Bank Copy', 'School Copy', 'Family Copy'];
  const allUnpaid = family.members.flatMap((m) =>
    m.unpaid_demands.map((d) => ({
      member: m,
      demand: d,
    }))
  );

  const earliestDueDate =
    allUnpaid.length > 0
      ? allUnpaid.reduce((min, x) => (x.demand.due_date < min ? x.demand.due_date : min), allUnpaid[0].demand.due_date)
      : new Date().toISOString().split('T')[0];

  const totalNetBilled = allUnpaid.reduce((s, x) => s + Number(x.demand.net_amount || 0), 0);
  const totalAlreadyPaid = allUnpaid.reduce((s, x) => s + Number(x.demand.paid_amount || 0), 0);
  const totalPayableWithinDue = allUnpaid.reduce((s, x) => s + Number(x.demand.balance_amount || 0), 0);
  const totalPayableAfterDue = totalPayableWithinDue + Math.max(1, family.members.filter((m) => m.balance_due > 0).length) * 300;

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
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e2e8f0',
          }}
          className="no-print"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FamilyRestroom style={{ color: '#2563eb' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Consolidated 3-Copy Family Bank Challan
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Family: {family.family_name} (#{family.family_id}) • {family.members.length} Sibling(s)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ModernButton $variant="primary" onClick={handlePrint}>
              <Print fontSize="small" /> Print Family Challan (A4)
            </ModernButton>
            <ModernButton $variant="ghost" onClick={onClose}>
              <Close fontSize="small" />
            </ModernButton>
          </div>
        </div>

        <ChallanRow>
          {copies.map((copyName, idx) => (
            <ChallanSlip key={idx}>
              <div>
                <div className="slip-header">
                  <h2 className="inst-title">GROWMORE SCHOOL</h2>
                  <div style={{ fontSize: '0.62rem', color: '#475569' }}>
                    Consolidated Family Fee Challan
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '2px' }}>
                    Bank: Allied Bank Ltd / A/C: 0010-4492-0012
                  </div>
                  <span className="copy-tag">{copyName}</span>
                </div>

                <div className="family-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <strong>Family Voucher:</strong> #FAM-{family.family_id}
                    </span>
                    <span>
                      <strong>Due Date:</strong> {formatFeeDate(earliestDueDate)}
                    </span>
                  </div>
                  <div>
                    <strong>Family Head:</strong> {family.family_name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <strong>Phone:</strong> {family.contact_number || '—'}
                    </span>
                    <span>
                      <strong>Siblings:</strong> {family.members.length}
                    </span>
                  </div>
                </div>

                <table className="siblings-table">
                  <thead>
                    <tr>
                      <th>Sibling & Class</th>
                      <th>Challan #</th>
                      <th style={{ textAlign: 'right' }}>Net Fee</th>
                      <th style={{ textAlign: 'right' }}>Due (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUnpaid.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '12px 4px', color: '#059669', fontWeight: 700 }}>
                          All sibling dues are settled (Rs 0 due).
                        </td>
                      </tr>
                    ) : (
                      allUnpaid.map(({ member, demand }) => (
                        <tr key={demand.demand_id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{member.name}</div>
                            <div style={{ fontSize: '0.6rem', color: '#475569' }}>
                              {member.class_name || '—'} • Roll: {member.roll_number || 'N/A'}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>
                            <div>#{demand.challan_no}</div>
                            {demand.period_month && (
                              <div style={{ fontSize: '0.58rem', color: '#475569' }}>
                                Period: {demand.period_month}/{demand.period_year}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatFeeCurrency(demand.net_amount)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800 }}>
                            {formatFeeCurrency(demand.balance_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="totals-box">
                  <div className="row">
                    <span>Total Family Billed:</span>
                    <span>{formatFeeCurrency(totalNetBilled)}</span>
                  </div>
                  {totalAlreadyPaid > 0 && (
                    <div className="row" style={{ color: '#059669', fontWeight: 700 }}>
                      <span>Paid / Part-Settled:</span>
                      <span>-{formatFeeCurrency(totalAlreadyPaid)}</span>
                    </div>
                  )}
                  <div className="row bold-row">
                    <span>Payable Within Due Date:</span>
                    <span>{formatFeeCurrency(totalPayableWithinDue)}</span>
                  </div>
                  <div className="row" style={{ color: '#dc2626', fontWeight: 700 }}>
                    <span>Payable After Due Date:</span>
                    <span>{formatFeeCurrency(totalPayableAfterDue)}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.58rem', color: '#475569', marginBottom: '12px' }}>
                  * Consolidated voucher covers all listed sibling challans.
                  <br />* Please ensure bank/counter cashier signs & stamps this slip.
                </div>

                <div className="sig-row">
                  <span>Officer Stamp</span>
                  <span>Cashier Signature</span>
                </div>
              </div>
            </ChallanSlip>
          ))}
        </ChallanRow>

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

export default PrintFamilyChallanModal;

