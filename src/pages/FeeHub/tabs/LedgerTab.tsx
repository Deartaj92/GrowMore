import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Print,
  Tune,
  Person,
  FamilyRestroom,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { isDark } from '../../../styles/DesignSystem';
import {
  StatementEntry,
  AdjustmentKind,
  FeeReceipt,
  FamilyFeeSummary,
  FamilyStatementEntry,
} from '../../../types/feeLedger';
import {
  getStatement,
  fetchAccountBalance,
  requestAdjustment,
  fetchReceipts,
  searchPosFamilies,
  getFamilyStatement,
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
import PrintFamilyStatementModal from '../components/PrintFamilyStatementModal';

const ModeToggleBar = styled.div`
  display: inline-flex;
  background: ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.06)' : '#f1f5f9')};
  padding: 3px;
  border-radius: 6px;
  gap: 3px;
`;

const ModeToggleBtn = styled.button<{ $active: boolean }>`
  border: none;
  background: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#334155' : '#ffffff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#f8fafc' : '#0f172a') : isDark(theme) ? '#94a3b8' : '#64748b'};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-size: 0.76rem;
  padding: 0.36rem 0.75rem;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s ease;
`;

export const LedgerTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  const [ledgerMode, setLedgerMode] = useState<'student' | 'family'>('student');

  // Student search
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Family search
  const [familySearchInput, setFamilySearchInput] = useState('');
  const [familySearchResults, setFamilySearchResults] = useState<FamilyFeeSummary[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyFeeSummary | null>(null);
  const [familyEntries, setFamilyEntries] = useState<FamilyStatementEntry[]>([]);

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
  const [printFamilyModalOpen, setPrintFamilyModalOpen] = useState(false);
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
      const [rows, bal, receipts] = await Promise.all([
        getStatement(schoolId, studentId),
        fetchAccountBalance(schoolId, studentId),
        fetchReceipts(schoolId, { studentId, limit: 30 }),
      ]);
      setStatement(rows);

      const totDebits = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
      const totCredits = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
      setAccountBalance({
        total_billed: totDebits,
        total_paid: totCredits,
        net_due: bal.balance,
        advance_balance: bal.wallet,
      });

      setStudentReceipts(receipts);
      if (receipts.length > 0) setSelectedReceiptId(receipts[0].id);
    } catch (err: any) {
      showToast('Failed to load student statement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Family Search & Statement Load
  const handleFamilySearch = async (query: string) => {
    setFamilySearchInput(query);
    if (!query || query.trim().length < 1) {
      setFamilySearchResults([]);
      return;
    }
    try {
      const fams = await searchPosFamilies(schoolId, query);
      setFamilySearchResults(fams);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectFamily = async (fam: FamilyFeeSummary) => {
    setSelectedFamily(fam);
    setFamilySearchResults([]);
    setFamilySearchInput('');
    loadFamilyLedgerData(fam.family_id);
  };

  const loadFamilyLedgerData = async (familyId: number) => {
    try {
      setLoading(true);
      const { family, entries } = await getFamilyStatement(schoolId, familyId);
      setSelectedFamily(family);
      setFamilyEntries(entries);
    } catch (err: any) {
      showToast(err.message || 'Failed to load family statement.', 'error');
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

  const filteredFamilyEntries = useMemo(() => {
    if (typeFilter === 'ALL') return familyEntries;
    return familyEntries.filter((s) => s.entry_type === typeFilter);
  }, [familyEntries, typeFilter]);

  const totalDebits = statement.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredits = statement.reduce((s, r) => s + (r.credit || 0), 0);
  const finalBalance = statement.length > 0 ? statement[statement.length - 1].running_balance : 0;

  const famDebits = familyEntries.reduce((s, r) => s + (r.debit || 0), 0);
  const famCredits = familyEntries.reduce((s, r) => s + (r.credit || 0), 0);
  const famFinalBalance =
    familyEntries.length > 0 ? familyEntries[familyEntries.length - 1].family_running_balance : 0;

  return (
    <div>
      {/* Student / Family Lookup Search Card */}
      <HubCard style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <ModeToggleBar>
            <ModeToggleBtn
              type="button"
              $active={ledgerMode === 'student'}
              onClick={() => setLedgerMode('student')}
            >
              <Person fontSize="small" /> Individual Student Ledger
            </ModeToggleBtn>
            <ModeToggleBtn
              type="button"
              $active={ledgerMode === 'family'}
              onClick={() => setLedgerMode('family')}
            >
              <FamilyRestroom fontSize="small" /> Family Consolidated Statement
            </ModeToggleBtn>
          </ModeToggleBar>

          {ledgerMode === 'student' && selectedStudent && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <ModernButton $variant="secondary" onClick={() => setAdjModalOpen(true)}>
                <Tune fontSize="small" /> Request Adjustment
              </ModernButton>
              <ModernButton $variant="primary" onClick={() => setPrintModalOpen(true)}>
                <Print fontSize="small" /> Print Student Statement
              </ModernButton>
            </div>
          )}

          {ledgerMode === 'family' && selectedFamily && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <ModernButton $variant="primary" onClick={() => setPrintFamilyModalOpen(true)}>
                <Print fontSize="small" /> Print Consolidated Family Statement
              </ModernButton>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {ledgerMode === 'student' ? (
            <div style={{ flex: 1, minWidth: '220px', width: '100%', position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: '0.25rem',
                  color: '#64748b',
                }}
              >
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
                    <SearchDropdownItem key={s.id} onClick={() => handleSelectStudent(s)}>
                      <div>
                        <div className="primary-text">{s.name}</div>
                        <div className="sub-text">
                          s/d of {s.father_name} • Roll: {s.roll_number || 'N/A'} • Class:{' '}
                          {s.classes?.name || '—'}
                        </div>
                      </div>
                      <ModernBadge $variant="info">Select</ModernBadge>
                    </SearchDropdownItem>
                  ))}
                </SearchDropdown>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: '220px', width: '100%', position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: '0.25rem',
                  color: '#64748b',
                }}
              >
                LOOKUP FAMILY ACCOUNT (FAMILY NAME / PHONE / SIBLING NAME):
              </label>
              <ModernInput
                type="text"
                placeholder="Search by family name, guardian phone, or any sibling name..."
                value={familySearchInput}
                onChange={(e) => handleFamilySearch(e.target.value)}
                onFocus={() => {
                  if (!familySearchInput) handleFamilySearch('');
                }}
                style={{ width: '100%', fontSize: '0.9rem' }}
              />

              {familySearchResults.length > 0 && (
                <SearchDropdown>
                  {familySearchResults.map((f) => (
                    <SearchDropdownItem key={f.family_id} onClick={() => handleSelectFamily(f)}>
                      <div>
                        <div className="primary-text">
                          {f.family_name} (#FAM-{f.family_id}) • {f.members.length} Sibling(s)
                        </div>
                        <div className="sub-text">
                          Phone: {f.contact_number || '—'} • Siblings:{' '}
                          {f.members.map((m) => m.name).join(', ') || 'None'}
                        </div>
                      </div>
                      <ModernBadge $variant={f.total_due > 0 ? 'danger' : 'success'}>
                        Due: {formatFeeCurrency(f.total_due)}
                      </ModernBadge>
                    </SearchDropdownItem>
                  ))}
                </SearchDropdown>
              )}
            </div>
          )}
        </div>
      </HubCard>

      {/* ==================== MODE 1: SELECTED STUDENT STATEMENT ==================== */}
      {ledgerMode === 'student' && selectedStudent && (
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
              <div className="value">{formatFeeCurrency(accountBalance?.advance_balance || 0)}</div>
              <div className="sub">Credit Balance in Trust</div>
            </StatBox>
          </StatsGrid>

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
                <option value="PAYMENT_REVERSAL">Voids / Reversals</option>
                <option value="WALLET_CREDIT">Wallet Credits</option>
                <option value="WALLET_DEBIT">Wallet Debits</option>
              </ModernSelect>
            </div>

            <ModernButton $size="sm" onClick={() => loadLedgerData(selectedStudent.id)}>
              Refresh
            </ModernButton>
          </HubFilterRow>

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
                              <span style={{ color: '#2563eb' }}>#{entry.challan_no}</span>
                            ) : entry.receipt_no ? (
                              <span style={{ color: '#059669' }}>#{entry.receipt_no}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>{entry.description}</td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: entry.debit ? 700 : 400,
                              color: entry.debit ? '#dc2626' : undefined,
                            }}
                          >
                            {entry.debit ? formatFeeCurrency(entry.debit) : '—'}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: entry.credit ? 700 : 400,
                              color: entry.credit ? '#059669' : undefined,
                            }}
                          >
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
                    <td colSpan={5} style={{ textAlign: 'right' }}>
                      Lifetime Totals:
                    </td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>
                      {formatFeeCurrency(totalDebits)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>
                      {formatFeeCurrency(totalCredits)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: finalBalance > 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      {formatFeeCurrency(finalBalance)}
                    </td>
                  </tr>
                </tfoot>
              </ModernTable>
            </TableWrapper>
          </HubCard>
        </>
      )}

      {/* ==================== MODE 2: CONSOLIDATED FAMILY STATEMENT ==================== */}
      {ledgerMode === 'family' && selectedFamily && (
        <>
          <StatsGrid>
            <StatBox $accent="#2563eb">
              <div className="title">Family Total Billed</div>
              <div className="value">{formatFeeCurrency(famDebits)}</div>
              <div className="sub">{selectedFamily.members.length} Sibling(s) Combined</div>
            </StatBox>

            <StatBox $accent="#059669">
              <div className="title">Family Total Credits / Paid</div>
              <div className="value">{formatFeeCurrency(famCredits)}</div>
              <div className="sub">Combined Payments & Concessions</div>
            </StatBox>

            <StatBox $accent={famFinalBalance > 0 ? '#dc2626' : '#059669'}>
              <div className="title">Net Family Balance Due</div>
              <div className="value" style={{ color: famFinalBalance > 0 ? '#dc2626' : '#059669' }}>
                {formatFeeCurrency(famFinalBalance)}
              </div>
              <div className="sub">{famFinalBalance > 0 ? 'Pending Family Balance' : 'Settled'}</div>
            </StatBox>

            <StatBox $accent="#7c3aed">
              <div className="title">Family Advance Wallet</div>
              <div className="value">{formatFeeCurrency(selectedFamily.total_wallet)}</div>
              <div className="sub">Combined Advance Credit</div>
            </StatBox>
          </StatsGrid>

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
                <option value="PAYMENT_REVERSAL">Voids / Reversals</option>
              </ModernSelect>
            </div>

            <ModernButton $size="sm" onClick={() => loadFamilyLedgerData(selectedFamily.family_id)}>
              Refresh
            </ModernButton>
          </HubFilterRow>

          <HubCard style={{ padding: '0.5rem' }}>
            <TableWrapper>
              <ModernTable>
                <thead>
                  <tr>
                    <th>Entry #</th>
                    <th>Date</th>
                    <th>Sibling Student</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Particulars / Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Rs)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Rs)</th>
                    <th style={{ textAlign: 'right' }}>Family Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                        Loading consolidated family statement...
                      </td>
                    </tr>
                  ) : filteredFamilyEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                        No ledger transactions found for this family.
                      </td>
                    </tr>
                  ) : (
                    filteredFamilyEntries.map((entry) => {
                      const badgeVariant =
                        entry.entry_type === 'PAYMENT' || entry.entry_type === 'WALLET_CREDIT'
                          ? 'success'
                          : entry.entry_type === 'CHARGE' || entry.entry_type === 'LATE_FINE'
                          ? 'danger'
                          : 'info';

                      return (
                        <tr key={entry.entry_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{entry.entry_id}</td>
                          <td>{formatFeeDate(entry.entry_date)}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{entry.student_name}</div>
                            <div style={{ fontSize: '0.68rem', opacity: 0.65 }}>
                              {entry.class_name || '—'} • Roll: {entry.roll_number || 'N/A'}
                            </div>
                          </td>
                          <td>
                            <ModernBadge $variant={badgeVariant}>
                              {entry.entry_type.replace('_', ' ')}
                            </ModernBadge>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
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
                              fontWeight: entry.debit ? 700 : 400,
                              color: entry.debit ? '#dc2626' : undefined,
                            }}
                          >
                            {entry.debit ? formatFeeCurrency(entry.debit) : '—'}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: entry.credit ? 700 : 400,
                              color: entry.credit ? '#059669' : undefined,
                            }}
                          >
                            {entry.credit ? formatFeeCurrency(entry.credit) : '—'}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              color: entry.family_running_balance > 0 ? '#dc2626' : '#059669',
                            }}
                          >
                            {formatFeeCurrency(entry.family_running_balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={6} style={{ textAlign: 'right' }}>
                      Consolidated Family Totals:
                    </td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>
                      {formatFeeCurrency(famDebits)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>
                      {formatFeeCurrency(famCredits)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: famFinalBalance > 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      {formatFeeCurrency(famFinalBalance)}
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
                        REC #{r.receipt_no} — Rs {Number(r.amount).toLocaleString()} ({r.payment_method}) on{' '}
                        {formatFeeDate(r.paid_at)}
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

      {/* Printable Student Statement Modal */}
      {printModalOpen && selectedStudent && (
        <PrintStatementModal
          student={selectedStudent}
          statement={statement}
          accountBalance={accountBalance}
          onClose={() => setPrintModalOpen(false)}
        />
      )}

      {/* Printable Consolidated Family Statement Modal */}
      {printFamilyModalOpen && selectedFamily && (
        <PrintFamilyStatementModal
          family={selectedFamily}
          entries={familyEntries}
          onClose={() => setPrintFamilyModalOpen(false)}
        />
      )}
    </div>
  );
};
export default LedgerTab;
