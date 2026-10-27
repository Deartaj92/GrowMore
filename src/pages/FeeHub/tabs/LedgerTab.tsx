import React, { useState, useEffect, useMemo } from 'react';
import {
  MenuBook,
  Search,
  Print,
  Tune,
  Receipt,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { StatementEntry, AdjustmentKind, FeeReceipt } from '../../../types/feeLedger';
import {
  getStatement,
  requestAdjustment,
  fetchReceipts,
} from '../../../services/feeLedgerService';
import {
  HubCard,
  HubFilterRow,
  StatsGrid,
  StatBox,
  ModernInput,
  ModernSelect,
  ModernButton,
  ModernTable,
  TableWrapper,
  ModernBadge,
  SearchDropdown,
  SearchDropdownItem,
  ModalBackdrop,
  ModalDialog,
  formatFeeCurrency,
  formatFeeDate,
} from '../FeeHubStyles';
import PrintStatementModal from '../components/PrintStatementModal';

export const LedgerTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  // Student search
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Statement & Balances
  const [statement, setStatement] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [accountBalance, setAccountBalance] = useState<{
    total_billed: number;
    total_paid: number;
    net_due: number;
    advance_balance: number;
  } | null>(null);

  // Modals
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [adjModalOpen, setAdjModalOpen] = useState(false);

  // Adjustment Form
  const [adjKind, setAdjKind] = useState<AdjustmentKind>('waiver');
  const [adjReason, setAdjReason] = useState('');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [studentReceipts, setStudentReceipts] = useState<FeeReceipt[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  const handleStudentSearch = async (query: string) => {
    setStudentSearchInput(query);
    if (!query || query.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('students')
      .select('id, name, father_name, roll_number, class_id, classes:class_id(name)')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .or(`name.ilike.%${query}%,father_name.ilike.%${query}%,roll_number.ilike.%${query}%`)
      .limit(10);
    setStudentSearchResults(data || []);
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setStudentSearchResults([]);
    setStudentSearchInput('');
    loadLedgerData(student.id);
  };

  const loadLedgerData = async (studentId: number) => {
    try {
      setLoading(true);
      const rows = await getStatement(schoolId, studentId);
      setStatement(rows);

      // Fetch account balance view
      const { data: acct } = await supabase
        .from('v_fee_account_balances')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (acct) {
        setAccountBalance({
          total_billed: Number(acct.total_billed || 0),
          total_paid: Number(acct.total_paid || 0),
          net_due: Number(acct.net_due || 0),
          advance_balance: Number(acct.advance_balance || 0),
        });
      }

      // Load receipts for adjustment selector
      const receipts = await fetchReceipts(schoolId, { studentId, limit: 30 });
      setStudentReceipts(receipts);
      if (receipts.length > 0) setSelectedReceiptId(receipts[0].id);
    } catch (err: any) {
      showToast('Failed to load student statement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Adjustment Request
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      showToast('A clear justification is required.', 'error');
      return;
    }
    if ((adjKind === 'waiver' || adjKind === 'refund') && adjAmount <= 0) {
      showToast('Amount must be greater than zero.', 'error');
      return;
    }
    if ((adjKind === 'void' || adjKind === 'refund') && !selectedReceiptId) {
      showToast('Please select a receipt.', 'error');
      return;
    }

    try {
      await requestAdjustment(
        { schoolId, userId },
        {
          kind: adjKind,
          reason: adjReason.trim(),
          receiptId: adjKind === 'void' || adjKind === 'refund' ? selectedReceiptId : null,
          amount: adjAmount > 0 ? adjAmount : null,
        }
      );
      showToast('Adjustment request submitted for maker-checker approval.', 'success');
      setAdjModalOpen(false);
      setAdjReason('');
      setAdjAmount(0);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit adjustment.', 'error');
    }
  };

  const filteredStatement = useMemo(() => {
    if (typeFilter === 'ALL') return statement;
    return statement.filter((s) => s.entry_type === typeFilter);
  }, [statement, typeFilter]);

  const totalDebits = statement.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredits = statement.reduce((s, r) => s + (r.credit || 0), 0);
  const finalBalance = statement.length > 0 ? statement[statement.length - 1].running_balance : 0;

  return (
    <div>
      {/* Student Lookup Search Card */}
      <HubCard style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', width: '100%', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
              LOOKUP STUDENT ACCOUNT:
            </label>
            <ModernInput
              type="text"
              placeholder="Search by student name, roll #, or father's name..."
              value={studentSearchInput}
              onChange={(e) => handleStudentSearch(e.target.value)}
              style={{ width: '100%', fontSize: '0.9rem' }}
            />

            {studentSearchResults.length > 0 && (
              <SearchDropdown>
                {studentSearchResults.map((s) => (
                  <SearchDropdownItem
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                  >
                    <div>
                      <div className="primary-text">{s.name}</div>
                      <div className="sub-text">
                        s/d of {s.father_name} • Roll: {s.roll_number || 'N/A'} • Class: {s.classes?.name || '—'}
                      </div>
                    </div>
                    <ModernBadge $variant="info">Select</ModernBadge>
                  </SearchDropdownItem>
                ))}
              </SearchDropdown>
            )}
          </div>

          {selectedStudent && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <ModernButton $variant="secondary" onClick={() => setAdjModalOpen(true)}>
                <Tune fontSize="small" /> Request Adjustment
              </ModernButton>
              <ModernButton $variant="primary" onClick={() => setPrintModalOpen(true)}>
                <Print fontSize="small" /> Print Statement
              </ModernButton>
            </div>
          )}
        </div>
      </HubCard>

      {/* Selected Student Account Dashboard */}
      {selectedStudent && (
        <>
          <StatsGrid>
            <StatBox $accent="#2563eb">
              <div className="title">Total Billed / Invoiced</div>
              <div className="value">{formatFeeCurrency(totalDebits)}</div>
              <div className="sub">Lifetime Charges</div>
            </StatBox>

            <StatBox $accent="#059669">
              <div className="title">Total Paid / Settled</div>
              <div className="value">{formatFeeCurrency(totalCredits)}</div>
              <div className="sub">Lifetime Collections</div>
            </StatBox>

            <StatBox $accent={finalBalance > 0 ? '#dc2626' : '#059669'}>
              <div className="title">Net Balance Due</div>
              <div className="value" style={{ color: finalBalance > 0 ? '#dc2626' : '#059669' }}>
                {formatFeeCurrency(finalBalance)}
              </div>
              <div className="sub">{finalBalance > 0 ? 'Pending Payment' : 'Settled'}</div>
            </StatBox>

            <StatBox $accent="#7c3aed">
              <div className="title">Advance Wallet Credit</div>
              <div className="value">
                {formatFeeCurrency(accountBalance?.advance_balance || 0)}
              </div>
              <div className="sub">Credit Balance in Trust</div>
            </StatBox>
          </StatsGrid>

          {/* Filter Row */}
          <HubFilterRow>
            <div className="filter-item">
              <label>Transaction Type:</label>
              <ModernSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="ALL">All Entries</option>
                <option value="CHARGE">Charges (Debits)</option>
                <option value="PAYMENT">Payments (Credits)</option>
                <option value="LATE_FINE">Late Fine Penalties</option>
                <option value="CONCESSION">Concessions</option>
                <option value="WAIVER">Waivers</option>
                <option value="VOID">Voids / Reversals</option>
                <option value="WALLET_CREDIT">Wallet Credits</option>
                <option value="WALLET_DEBIT">Wallet Debits</option>
              </ModernSelect>
            </div>

            <ModernButton $size="sm" onClick={() => loadLedgerData(selectedStudent.id)}>
              Refresh
            </ModernButton>
          </HubFilterRow>

          {/* Double-Entry Ledger Table */}
          <HubCard style={{ padding: '0.5rem' }}>
            <TableWrapper>
              <ModernTable>
                <thead>
                  <tr>
                    <th>Entry #</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Particulars / Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Rs)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Rs)</th>
                    <th style={{ textAlign: 'right' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatement.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                        No ledger transactions found for this student.
                      </td>
                    </tr>
                  ) : (
                    filteredStatement.map((entry) => {
                      const badgeVariant =
                        entry.entry_type === 'PAYMENT' || entry.entry_type === 'WALLET_CREDIT'
                          ? 'success'
                          : entry.entry_type === 'CHARGE' || entry.entry_type === 'LATE_FINE'
                          ? 'danger'
                          : entry.entry_type === 'CONCESSION' || entry.entry_type === 'WAIVER'
                          ? 'info'
                          : 'warning';

                      return (
                        <tr key={entry.entry_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{entry.entry_id}</td>
                          <td>{formatFeeDate(entry.entry_date)}</td>
                          <td>
                            <ModernBadge $variant={badgeVariant}>
                              {entry.entry_type.replace('_', ' ')}
                            </ModernBadge>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                            {entry.challan_no ? (
                              <span style={{ color: '#2563eb' }}>CH-{entry.challan_no}</span>
                            ) : entry.receipt_no ? (
                              <span style={{ color: '#059669' }}>REC-{entry.receipt_no}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>{entry.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: entry.debit ? 700 : 400, color: entry.debit ? '#dc2626' : undefined }}>
                            {entry.debit ? formatFeeCurrency(entry.debit) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: entry.credit ? 700 : 400, color: entry.credit ? '#059669' : undefined }}>
                            {entry.credit ? formatFeeCurrency(entry.credit) : '—'}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              color: entry.running_balance > 0 ? '#dc2626' : '#059669',
                            }}
                          >
                            {formatFeeCurrency(entry.running_balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={5} style={{ textAlign: 'right' }}>Lifetime Totals:</td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatFeeCurrency(totalDebits)}</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>{formatFeeCurrency(totalCredits)}</td>
                    <td style={{ textAlign: 'right', color: finalBalance > 0 ? '#dc2626' : '#059669' }}>
                      {formatFeeCurrency(finalBalance)}
                    </td>
                  </tr>
                </tfoot>
              </ModernTable>
            </TableWrapper>
          </HubCard>
        </>
      )}

      {/* Modal: Request Financial Adjustment */}
      {adjModalOpen && (
        <ModalBackdrop onClick={() => setAdjModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="520px">
            <h3 className="modal-title">Request Financial Adjustment</h3>
            <p className="modal-subtitle">
              Adjustments require maker-checker authorization. A supervisor must approve before this alters ledger balances.
            </p>

            <form onSubmit={handleSubmitAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  ADJUSTMENT TYPE:
                </label>
                <ModernSelect
                  value={adjKind}
                  onChange={(e) => setAdjKind(e.target.value as AdjustmentKind)}
                  style={{ width: '100%' }}
                >
                  <option value="waiver">Fee Line Waiver (Write-off fee charge)</option>
                  <option value="void">Void Payment Receipt (Reverses payment allocation)</option>
                  <option value="refund">Cash Refund (Returns money from wallet/receipt)</option>
                </ModernSelect>
              </div>

              {(adjKind === 'void' || adjKind === 'refund') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    TARGET RECEIPT:
                  </label>
                  <ModernSelect
                    value={selectedReceiptId || ''}
                    onChange={(e) => setSelectedReceiptId(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    {studentReceipts.map((r) => (
                      <option key={r.id} value={r.id}>
                        REC #{r.receipt_no} — Rs {Number(r.amount).toLocaleString()} ({r.payment_method}) on {formatFeeDate(r.paid_at)}
                      </option>
                    ))}
                  </ModernSelect>
                </div>
              )}

              {(adjKind === 'waiver' || adjKind === 'refund') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    ADJUSTMENT AMOUNT (RS):
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    step="0.01"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', fontSize: '1.1rem', fontWeight: 800 }}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  REASON / JUSTIFICATION (MANDATORY):
                </label>
                <ModernInput
                  type="text"
                  placeholder="Explain why this adjustment is requested..."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setAdjModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary">
                  Submit for Approval
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Printable Statement Modal */}
      {printModalOpen && selectedStudent && (
        <PrintStatementModal
          student={selectedStudent}
          statement={statement}
          accountBalance={accountBalance}
          onClose={() => setPrintModalOpen(null as any)}
        />
      )}
    </div>
  );
};
export default LedgerTab;
