import React, { useState, useEffect } from 'react';
import {
  MenuBook,
  Search,
  Print,
  DeleteForever,
  Close,
  Warning,
  FilterList,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/useToast';
import { supabase } from '../../supabaseClient';
import { FeeLedgerEntry } from '../../types/feeLedger';
import { getStudentLedger, voidFeePayment } from '../../services/feeLedgerService';
import {
  DenseContainer,
  DenseHeader,
  StatsStrip,
  StatCard,
  DenseCard,
  CompactTable,
  DenseBadge,
  CompactButton,
  DenseInput,
  DenseSelect,
  DenseTextarea,
  FilterBar,
  formatFeeDate,
} from './FeeSharedComponents';

export const FeeStudentLedgerPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;

  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [ledger, setLedger] = useState<FeeLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Void Receipt Modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedReceiptNo, setSelectedReceiptNo] = useState<string>('');
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    loadStudents();
  }, [schoolId]);

  useEffect(() => {
    if (selectedStudent) {
      loadLedger(selectedStudent.id);
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, name, father_name, roll_number, class_id,
          classes:class_id ( name )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('id', { ascending: true })
        .limit(200);

      if (error) throw error;
      setStudents(data || []);
      if (data && data.length > 0) {
        setSelectedStudent(data[0]);
      }
    } catch (err: any) {
      showToast('Failed to load students.', 'error');
    }
  };

  const loadLedger = async (studentId: number) => {
    try {
      setLoading(true);
      const data = await getStudentLedger(schoolId, studentId);
      setLedger(data);
    } catch (err: any) {
      showToast('Failed to load student ledger.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVoidPayment = async () => {
    if (!voidReason.trim()) {
      showToast('Mandatory reason required.', 'error');
      return;
    }

    try {
      const { data: recData, error: recErr } = await supabase
        .from('fee_receipts')
        .select('id')
        .eq('school_id', schoolId)
        .eq('receipt_no', selectedReceiptNo)
        .single();

      if (recErr || !recData) throw new Error('Receipt not found');

      await voidFeePayment({
        p_school_id: schoolId,
        p_receipt_id: recData.id,
        p_reason: voidReason,
        p_authorized_by: user?.id || 1,
      });

      showToast(`Receipt #${selectedReceiptNo} voided!`, 'success');
      setVoidModalOpen(false);
      setVoidReason('');
      if (selectedStudent) loadLedger(selectedStudent.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to void payment.', 'error');
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.father_name?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      String(s.id).includes(q)
    );
  });

  const filteredLedger = ledger.filter((entry) => {
    if (typeFilter === 'ALL') return true;
    return entry.entry_type === typeFilter;
  });

  const currentBalance =
    ledger.length > 0 ? Number(ledger[ledger.length - 1].running_balance) : 0;
  const totalDebits = ledger.reduce((acc, entry) => acc + Number(entry.debit_amount || 0), 0);
  const totalCredits = ledger.reduce((acc, entry) => acc + Number(entry.credit_amount || 0), 0);

  return (
    <DenseContainer>
      {/* Header */}
      <DenseHeader>
        <div className="title-group">
          <h1>
            <MenuBook style={{ color: '#4f46e5', fontSize: '1.4rem' }} /> Student Financial Ledger
          </h1>
          <span className="subtitle">Chronological Subledger Journal</span>
        </div>

        <div className="actions-group">
          {selectedStudent && (
            <CompactButton onClick={() => window.print()}>
              <Print fontSize="inherit" /> Print Statement
            </CompactButton>
          )}
        </div>
      </DenseHeader>

      {/* Top Enriched Statement Metrics */}
      <StatsStrip>
        <StatCard $accentColor={currentBalance > 0 ? '#ef4444' : '#10b981'}>
          <span className="stat-label">Current Ledger Balance</span>
          <div className="stat-val-row">
            <span
              className="stat-val"
              style={{ color: currentBalance > 0 ? '#ef4444' : '#10b981' }}
            >
              Rs. {currentBalance.toLocaleString()}
            </span>
            <span className="stat-sub">{currentBalance > 0 ? 'Receivable' : 'Settled'}</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#3b82f6">
          <span className="stat-label">Lifetime Demanded (DR)</span>
          <div className="stat-val-row">
            <span className="stat-val">Rs. {totalDebits.toLocaleString()}</span>
            <span className="stat-sub">Billed</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#10b981">
          <span className="stat-label">Lifetime Paid (CR)</span>
          <div className="stat-val-row">
            <span className="stat-val">Rs. {totalCredits.toLocaleString()}</span>
            <span className="stat-sub">Settled</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#6366f1">
          <span className="stat-label">Journal Entries</span>
          <div className="stat-val-row">
            <span className="stat-val">{ledger.length}</span>
            <span className="stat-sub">Audit Events</span>
          </div>
        </StatCard>
      </StatsStrip>

      {/* Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '0.75rem', alignItems: 'start' }}>
        {/* Left: Student Picker */}
        <DenseCard style={{ padding: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
            <Search fontSize="small" style={{ opacity: 0.5 }} />
            <DenseInput
              type="text"
              placeholder="Name, father, roll #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {filteredStudents.map((s) => {
              const isSelected = selectedStudent?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  style={{
                    padding: '0.45rem 0.6rem',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>
                    #{s.id} {s.roll_number ? `| Roll: ${s.roll_number}` : ''} | Class: {s.classes?.name || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </DenseCard>

        {/* Right: Subledger Journal */}
        <DenseCard style={{ padding: '0.75rem' }}>
          {selectedStudent ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  marginBottom: '0.5rem',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                    {selectedStudent.name}
                  </h3>
                  <div style={{ fontSize: '0.74rem', opacity: 0.7 }}>
                    Student ID: #{selectedStudent.id} | Father: {selectedStudent.father_name} | Class: {selectedStudent.classes?.name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Balance</div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: currentBalance > 0 ? '#ef4444' : '#10b981',
                    }}
                  >
                    Rs. {currentBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Entry Filter Bar */}
              <FilterBar style={{ marginBottom: '0.5rem' }}>
                <div className="filter-field">
                  <label><FilterList fontSize="inherit" /> Filter Entry Type:</label>
                  <DenseSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="ALL">All Journal Types ({ledger.length})</option>
                    <option value="DEMAND">Fee Demand (DR)</option>
                    <option value="PAYMENT">Payment (CR)</option>
                    <option value="CONCESSION">Concession (CR)</option>
                    <option value="LATE_FINE">Late Fine (DR)</option>
                    <option value="WAIVER">Fine Waiver (CR)</option>
                    <option value="VOID_REVERSAL">Void Reversal (DR)</option>
                    <option value="OPENING_BALANCE">Opening Balance (DR)</option>
                  </DenseSelect>
                </div>
              </FilterBar>

              <div style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
                <CompactTable>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Debit (DR)</th>
                      <th>Credit (CR)</th>
                      <th>Balance</th>
                      <th>Ref / Receipt</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                          No matching subledger entries recorded for this student.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((entry) => (
                        <tr key={entry.entry_id}>
                          <td>{formatFeeDate(entry.entry_date)}</td>
                          <td>
                            <DenseBadge
                              $variant={
                                entry.entry_type === 'PAYMENT'
                                  ? 'success'
                                  : entry.entry_type === 'DEMAND'
                                  ? 'info'
                                  : entry.entry_type === 'VOID_REVERSAL'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {entry.entry_type}
                            </DenseBadge>
                          </td>
                          <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>{entry.description}</td>
                          <td className="num">
                            {Number(entry.debit_amount) > 0
                              ? `Rs. ${Number(entry.debit_amount).toLocaleString()}`
                              : '—'}
                          </td>
                          <td className="num" style={{ color: '#10b981' }}>
                            {Number(entry.credit_amount) > 0
                              ? `Rs. ${Number(entry.credit_amount).toLocaleString()}`
                              : '—'}
                          </td>
                          <td className="num">
                            Rs. {Number(entry.running_balance).toLocaleString()}
                          </td>
                          <td>{entry.receipt_no || entry.challan_no || '—'}</td>
                          <td>
                            {entry.entry_type === 'PAYMENT' && entry.receipt_no && (
                              <button
                                title="Void / Reversal"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#ef4444',
                                  padding: '2px',
                                }}
                                onClick={() => {
                                  setSelectedReceiptNo(entry.receipt_no!);
                                  setVoidModalOpen(true);
                                }}
                              >
                                <DeleteForever fontSize="small" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </CompactTable>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.5 }}>
              Select a student to inspect their subledger journal.
            </div>
          )}
        </DenseCard>
      </div>

      {/* MODAL: VOID PAYMENT */}
      {voidModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <DenseCard style={{ maxWidth: '420px', width: '100%', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Warning fontSize="inherit" /> Void Receipt #{selectedReceiptNo}
              </h3>
              <Close style={{ cursor: 'pointer' }} onClick={() => setVoidModalOpen(false)} />
            </div>

            <p style={{ fontSize: '0.78rem', opacity: 0.8, lineHeight: 1.4, margin: '0 0 0.75rem 0' }}>
              This will reverse item allocations, restore the outstanding balance on the demand, and
              post an auditable compensating reversal debit entry to the ledger.
            </p>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                Mandatory Reason for Voiding:
              </label>
              <DenseTextarea
                rows={2}
                placeholder="Reason for payment reversal..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <CompactButton onClick={() => setVoidModalOpen(false)}>Cancel</CompactButton>
              <CompactButton $variant="danger" onClick={handleVoidPayment}>
                Authorize Reversal
              </CompactButton>
            </div>
          </DenseCard>
        </div>
      )}
    </DenseContainer>
  );
};

export default FeeStudentLedgerPage;
