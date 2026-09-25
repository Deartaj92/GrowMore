import React, { useState, useEffect } from 'react';
import {
  ReceiptLong,
  Bolt,
  Search,
  Visibility,
  Close,
  Download,
  Print,
  TrendingUp,
  AccountBalanceWallet,
  CheckCircle,
  Delete,
  Person,
  Group,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/useToast';
import { supabase } from '../../supabaseClient';
import { FeeDemand, FeeDemandItem } from '../../types/feeLedger';
import { fetchFeeDemands, generateMonthlyDemands, deleteFeeDemand, generateFamilyMonthlyDemands } from '../../services/feeLedgerService';
import {
  DenseContainer,
  DenseHeader,
  StatsStrip,
  StatCard,
  DenseCard,
  FilterBar,
  CompactTable,
  DenseBadge,
  MiniProgressBar,
  CompactButton,
  DenseSelect,
  DenseInput,
  formatFeeDate,
} from './FeeSharedComponents';

export const FeeDemandsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;

  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [sessions, setSessions] = useState<{ id: number; name: string; is_active: boolean }[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(0);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [challanSearch, setChallanSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Generation Modal State
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genMode, setGenMode] = useState<'bulk' | 'single' | 'family'>('bulk');
  const [genSessionId, setGenSessionId] = useState<number>(0);
  const [genClassId, setGenClassId] = useState<number | ''>('');
  const [genStudentId, setGenStudentId] = useState<number | ''>('');
  const [genFamilyId, setGenFamilyId] = useState<number | ''>('');
  const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(new Date().getFullYear());
  const [genDueDate, setGenDueDate] = useState<string>(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [genValidityDate, setGenValidityDate] = useState<string>(
    new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0]
  );
  const [generating, setGenerating] = useState(false);

  // Student & Family lists for single/family generation
  const [studentList, setStudentList] = useState<any[]>([]);
  const [familyList, setFamilyList] = useState<{ family_id: number; family_name: string; siblings_count: number }[]>([]);

  // Demand Details Modal
  const [selectedDemand, setSelectedDemand] = useState<FeeDemand | null>(null);

  useEffect(() => {
    loadSessionsAndClasses();
  }, [schoolId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadDemands();
    }
  }, [selectedSessionId, selectedClassId, statusFilter]);

  const loadSessionsAndClasses = async () => {
    try {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', schoolId)
        .order('id', { ascending: false });

      if (sessionData && sessionData.length > 0) {
        setSessions(sessionData);
        const activeSess = sessionData.find((s) => s.is_active) || sessionData[0];
        setSelectedSessionId(activeSess.id);
        setGenSessionId(activeSess.id);
      }

      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('id', { ascending: true });

      if (classData) setClasses(classData);

      // Load active students & families
      const { data: stData } = await supabase
        .from('students')
        .select('id, name, father_name, roll_number, family_id, class_id, classes:class_id(name)')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
        .limit(300);

      if (stData) {
        setStudentList(stData);
        const famMap = new Map<number, { family_id: number; family_name: string; siblings_count: number }>();
        stData.forEach((s: any) => {
          if (s.family_id) {
            const existing = famMap.get(s.family_id);
            if (existing) {
              existing.siblings_count += 1;
            } else {
              famMap.set(s.family_id, {
                family_id: s.family_id,
                family_name: `Family #${s.family_id} (${s.father_name || s.name})`,
                siblings_count: 1,
              });
            }
          }
        });
        setFamilyList(Array.from(famMap.values()));
      }
    } catch (err: any) {
      showToast('Failed to load sessions, classes, and students.', 'error');
    }
  };

  const loadDemands = async () => {
    try {
      setLoading(true);
      const data = await fetchFeeDemands(schoolId, {
        sessionId: selectedSessionId,
        classId: selectedClassId ? Number(selectedClassId) : undefined,
        status: statusFilter || undefined,
        challanNo: challanSearch || undefined,
      });
      setDemands(data);
    } catch (err: any) {
      showToast('Failed to load fee demands.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDemands = async () => {
    try {
      setGenerating(true);
      if (genMode === 'single') {
        if (!genStudentId) {
          showToast('Please select a student for single-student generation.', 'error');
          setGenerating(false);
          return;
        }
        const res = await generateMonthlyDemands({
          p_school_id: schoolId,
          p_session_id: genSessionId,
          p_class_id: null,
          p_section_id: null,
          p_billing_month: genMonth,
          p_billing_year: genYear,
          p_issue_date: new Date().toISOString().split('T')[0],
          p_due_date: genDueDate,
          p_validity_date: genValidityDate,
          p_created_by: user?.id || 1,
          p_student_id: Number(genStudentId),
        });
        showToast(res.message || `Generated single student fee demand!`, 'success');
      } else if (genMode === 'family') {
        if (!genFamilyId) {
          showToast('Please select a family for family fee generation.', 'error');
          setGenerating(false);
          return;
        }
        const res = await generateFamilyMonthlyDemands({
          p_school_id: schoolId,
          p_family_id: Number(genFamilyId),
          p_session_id: genSessionId,
          p_billing_month: genMonth,
          p_billing_year: genYear,
          p_issue_date: new Date().toISOString().split('T')[0],
          p_due_date: genDueDate,
          p_validity_date: genValidityDate,
          p_created_by: user?.id || 1,
        });
        showToast(res.message || `Generated family fee demands!`, 'success');
      } else {
        const res = await generateMonthlyDemands({
          p_school_id: schoolId,
          p_session_id: genSessionId,
          p_class_id: genClassId ? Number(genClassId) : null,
          p_section_id: null,
          p_billing_month: genMonth,
          p_billing_year: genYear,
          p_issue_date: new Date().toISOString().split('T')[0],
          p_due_date: genDueDate,
          p_validity_date: genValidityDate,
          p_created_by: user?.id || 1,
        });
        showToast(res.message || `Generated ${res.generated_count} fee demands!`, 'success');
      }

      setGenModalOpen(false);
      loadDemands();
    } catch (err: any) {
      showToast(err.message || 'Generation failed.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteDemand = async (demand: FeeDemand) => {
    const isPaidOrPartial =
      Number(demand.total_paid_amount) > 0 ||
      demand.status === 'paid' ||
      demand.status === 'partially_paid';

    if (isPaidOrPartial) {
      showToast(
        `Cannot delete Challan #${demand.challan_no}: Payment of Rs. ${Number(
          demand.total_paid_amount
        ).toLocaleString()} has already been collected. Delete is allowed ONLY for unpaid demands.`,
        'error'
      );
      return;
    }

    const studentName = demand.snapshot_data?.student_name || `Student #${demand.student_id}`;
    const confirmMsg = `Are you sure you want to delete Challan #${demand.challan_no} for ${studentName}? This action will permanently remove this uncollected demand.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteFeeDemand(schoolId, demand.id, user?.id);
      showToast(res.message || `Challan #${demand.challan_no} deleted successfully!`, 'success');
      if (selectedDemand?.id === demand.id) {
        setSelectedDemand(null);
      }
      loadDemands();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete fee demand.', 'error');
    }
  };

  // Compute live enriched financial metrics
  const totalDemandsCount = demands.length;
  const totalBilled = demands.reduce((acc, d) => acc + Number(d.total_net_amount || 0), 0);
  const totalCollected = demands.reduce((acc, d) => acc + Number(d.total_paid_amount || 0), 0);
  const totalOutstanding = demands.reduce((acc, d) => acc + Number(d.total_balance_amount || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return (
    <DenseContainer>
      {/* Header */}
      <DenseHeader>
        <div className="title-group">
          <h1>
            <ReceiptLong style={{ color: '#059669', fontSize: '1.4rem' }} /> Fee Demands (Challans)
          </h1>
          <span className="subtitle">Ledger-Authoritative Invoicing & Receivables</span>
        </div>
        <div className="actions-group" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <CompactButton
            $variant="primary"
            onClick={() => {
              setGenMode('single');
              setGenModalOpen(true);
            }}
            title="Generate monthly fee challan for an individual student"
          >
            <Person fontSize="inherit" /> Single Student
          </CompactButton>

          <CompactButton
            $variant="secondary"
            onClick={() => {
              setGenMode('family');
              setGenModalOpen(true);
            }}
            title="Generate monthly fee challans for all siblings in a family"
          >
            <Group fontSize="inherit" /> Family Challan
          </CompactButton>

          <CompactButton
            $variant="success"
            onClick={() => {
              setGenMode('bulk');
              setGenClassId(selectedClassId);
              setGenModalOpen(true);
            }}
            title="Bulk generate monthly fee challans for whole school or target class"
          >
            <Bolt fontSize="inherit" /> Bulk Generate
          </CompactButton>
        </div>
      </DenseHeader>

      {/* Enriched Minimalist Statistics Strip */}
      <StatsStrip>
        <StatCard $accentColor="#3b82f6">
          <span className="stat-label">Total Challans</span>
          <div className="stat-val-row">
            <span className="stat-val">{totalDemandsCount}</span>
            <span className="stat-sub">Billed</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#6366f1">
          <span className="stat-label">Net Demanded</span>
          <div className="stat-val-row">
            <span className="stat-val">Rs. {totalBilled.toLocaleString()}</span>
            <span className="stat-sub">100%</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#10b981">
          <span className="stat-label">Total Collected</span>
          <div className="stat-val-row">
            <span className="stat-val">Rs. {totalCollected.toLocaleString()}</span>
            <span className="stat-sub">{collectionRate}% Recovery</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#ef4444">
          <span className="stat-label">Total Outstanding</span>
          <div className="stat-val-row">
            <span className="stat-val">Rs. {totalOutstanding.toLocaleString()}</span>
            <span className="stat-sub">{100 - collectionRate}% Pending</span>
          </div>
        </StatCard>
      </StatsStrip>

      {/* High Density Filter Bar */}
      <FilterBar>
        <div className="filter-field">
          <label>Session</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(Number(e.target.value))}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? '★' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="issued">Issued</option>
            <option value="partially_paid">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="filter-field" style={{ flex: 1, minWidth: '160px' }}>
          <label>Search</label>
          <input
            type="text"
            placeholder="Challan # / Student ID..."
            value={challanSearch}
            onChange={(e) => setChallanSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadDemands()}
            style={{ width: '100%' }}
          />
        </div>

        <CompactButton onClick={loadDemands}>
          <Search fontSize="inherit" /> Apply
        </CompactButton>
      </FilterBar>

      {/* Compact High-Density Table */}
      <DenseCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          <CompactTable>
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Student</th>
                <th>Class</th>
                <th>Month / Year</th>
                <th>Due Date</th>
                <th>Net Payable</th>
                <th>Paid</th>
                <th>Progress</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {demands.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No fee demands found for the selected filter set.
                  </td>
                </tr>
              ) : (
                demands.map((d) => {
                  const paidPct =
                    Number(d.total_net_amount) > 0
                      ? Math.round((Number(d.total_paid_amount) / Number(d.total_net_amount)) * 100)
                      : 0;

                  return (
                    <tr key={d.id}>
                      <td className="num">
                        <strong>{d.challan_no}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {d.snapshot_data?.student_name || `Student #${d.student_id}`}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>
                          F: {d.snapshot_data?.father_name || '—'}
                        </div>
                      </td>
                      <td>
                        {d.snapshot_data?.class_name || '—'}
                        {d.snapshot_data?.section_name ? `-${d.snapshot_data.section_name}` : ''}
                      </td>
                      <td>
                        <strong>
                          {d.billing_month
                            ? `${new Date(2000, d.billing_month - 1, 1).toLocaleString('en-US', { month: 'short' })} ${d.billing_year}`
                            : d.billing_year}
                        </strong>
                        {d.billing_month && (
                          <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>
                            M{d.billing_month}/{d.billing_year}
                          </div>
                        )}
                      </td>
                      <td>{formatFeeDate(d.due_date)}</td>
                      <td className="num">Rs. {Number(d.total_net_amount).toLocaleString()}</td>
                      <td className="num" style={{ color: '#10b981' }}>
                        Rs. {Number(d.total_paid_amount).toLocaleString()}
                      </td>
                      <td>
                        <MiniProgressBar $percent={paidPct} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{paidPct}%</span>
                      </td>
                      <td
                        className="num"
                        style={{
                          color: Number(d.total_balance_amount) > 0 ? '#ef4444' : '#10b981',
                        }}
                      >
                        Rs. {Number(d.total_balance_amount).toLocaleString()}
                      </td>
                      <td>
                        <DenseBadge
                          $variant={
                            d.status === 'paid'
                              ? 'success'
                              : d.status === 'partially_paid'
                              ? 'warning'
                              : d.status === 'overdue'
                              ? 'danger'
                              : 'info'
                          }
                        >
                          {d.status}
                        </DenseBadge>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#3b82f6',
                            padding: '2px',
                          }}
                          onClick={() => setSelectedDemand(d)}
                          title="View Itemized Breakdown"
                        >
                          <Visibility style={{ fontSize: '1.1rem' }} />
                        </button>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor:
                              Number(d.total_paid_amount) > 0 || d.status === 'paid' || d.status === 'partially_paid'
                                ? 'not-allowed'
                                : 'pointer',
                            color:
                              Number(d.total_paid_amount) > 0 || d.status === 'paid' || d.status === 'partially_paid'
                                ? '#64748b'
                                : '#ef4444',
                            opacity:
                              Number(d.total_paid_amount) > 0 || d.status === 'paid' || d.status === 'partially_paid'
                                ? 0.35
                                : 1,
                            padding: '2px',
                            marginLeft: '4px',
                          }}
                          onClick={() => handleDeleteDemand(d)}
                          disabled={
                            Number(d.total_paid_amount) > 0 || d.status === 'paid' || d.status === 'partially_paid'
                          }
                          title={
                            Number(d.total_paid_amount) > 0 || d.status === 'paid' || d.status === 'partially_paid'
                              ? 'Cannot delete: Payment has been recorded on this challan'
                              : 'Delete Unpaid Challan'
                          }
                        >
                          <Delete style={{ fontSize: '1.1rem' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </CompactTable>
        </div>
      </DenseCard>

      {/* MODAL: BULK GENERATE */}
      {genModalOpen && (
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
          <DenseCard style={{ maxWidth: '480px', width: '100%', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Generate Monthly Demands</h3>
              <Close style={{ cursor: 'pointer' }} onClick={() => setGenModalOpen(false)} />
            </div>

            {/* Generation Mode Selector Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '3px',
                marginBottom: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => setGenMode('bulk')}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: genMode === 'bulk' ? '#3b82f6' : 'transparent',
                  color: genMode === 'bulk' ? '#ffffff' : 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                Bulk Generation
              </button>
              <button
                type="button"
                onClick={() => setGenMode('single')}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: genMode === 'single' ? '#3b82f6' : 'transparent',
                  color: genMode === 'single' ? '#ffffff' : 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                Single Student
              </button>
              <button
                type="button"
                onClick={() => setGenMode('family')}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: genMode === 'family' ? '#3b82f6' : 'transparent',
                  color: genMode === 'family' ? '#ffffff' : 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                Family Challan
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Session
                </label>
                <DenseSelect
                  value={genSessionId}
                  onChange={(e) => setGenSessionId(Number(e.target.value))}
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </DenseSelect>
              </div>

              {genMode === 'bulk' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Target Class
                  </label>
                  <DenseSelect
                    value={genClassId}
                    onChange={(e) => setGenClassId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Whole School</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </DenseSelect>
                </div>
              )}

              {genMode === 'single' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Select Student
                  </label>
                  <DenseSelect
                    value={genStudentId}
                    onChange={(e) => setGenStudentId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Choose Student --</option>
                    {studentList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.classes?.name || 'Class'}) | #{s.id}
                      </option>
                    ))}
                  </DenseSelect>
                </div>
              )}

              {genMode === 'family' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Select Family
                  </label>
                  <DenseSelect
                    value={genFamilyId}
                    onChange={(e) => setGenFamilyId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Choose Family --</option>
                    {familyList.map((f) => (
                      <option key={f.family_id} value={f.family_id}>
                        {f.family_name} ({f.siblings_count} Siblings)
                      </option>
                    ))}
                  </DenseSelect>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Month (1-12)
                </label>
                <DenseInput
                  type="number"
                  min="1"
                  max="12"
                  value={genMonth}
                  onChange={(e) => setGenMonth(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Year
                </label>
                <DenseInput
                  type="number"
                  value={genYear}
                  onChange={(e) => setGenYear(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Due Date
                </label>
                <DenseInput
                  type="date"
                  value={genDueDate}
                  onChange={(e) => setGenDueDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Validity Date
                </label>
                <DenseInput
                  type="date"
                  value={genValidityDate}
                  onChange={(e) => setGenValidityDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <CompactButton onClick={() => setGenModalOpen(false)}>Cancel</CompactButton>
              <CompactButton
                $variant="success"
                disabled={generating}
                onClick={handleGenerateDemands}
              >
                <Bolt fontSize="inherit" />
                {generating ? 'Processing...' : 'Run Generation'}
              </CompactButton>
            </div>
          </DenseCard>
        </div>
      )}

      {/* MODAL: ITEM DETAILS */}
      {selectedDemand && (
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
          <DenseCard style={{ maxWidth: '580px', width: '100%', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Challan #{selectedDemand.challan_no}</h3>
                  <DenseBadge $variant="info">
                    {selectedDemand.billing_month
                      ? `${new Date(2000, selectedDemand.billing_month - 1, 1).toLocaleString('en-US', { month: 'long' })} ${selectedDemand.billing_year}`
                      : `Year ${selectedDemand.billing_year}`}
                  </DenseBadge>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>
                  {selectedDemand.snapshot_data?.student_name} | Class {selectedDemand.snapshot_data?.class_name}
                </div>
              </div>
              <Close style={{ cursor: 'pointer' }} onClick={() => setSelectedDemand(null)} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <span style={{ opacity: 0.6, display: 'block' }}>Month & Year</span>
                <strong>
                  {selectedDemand.billing_month
                    ? `${new Date(2000, selectedDemand.billing_month - 1, 1).toLocaleString('en-US', { month: 'short' })} ${selectedDemand.billing_year} (M${selectedDemand.billing_month})`
                    : `Year ${selectedDemand.billing_year}`}
                </strong>
              </div>
              <div>
                <span style={{ opacity: 0.6, display: 'block' }}>Issue Date</span>
                <strong>{formatFeeDate(selectedDemand.issue_date)}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.6, display: 'block' }}>Due Date</span>
                <strong>{formatFeeDate(selectedDemand.due_date)}</strong>
              </div>
            </div>

            <CompactTable style={{ marginTop: '0.5rem' }}>
              <thead>
                <tr>
                  <th>Head</th>
                  <th>Gross</th>
                  <th>Concession</th>
                  <th>Net</th>
                  <th>Paid</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDemand.items || []).map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.head_title_snapshot}</strong></td>
                    <td className="num">Rs. {Number(item.gross_amount).toLocaleString()}</td>
                    <td className="num" style={{ color: '#f59e0b' }}>
                      Rs. {Number(item.concession_amount).toLocaleString()}
                    </td>
                    <td className="num">Rs. {Number(item.net_amount).toLocaleString()}</td>
                    <td className="num" style={{ color: '#10b981' }}>
                      Rs. {Number(item.paid_amount).toLocaleString()}
                    </td>
                    <td
                      className="num"
                      style={{ color: Number(item.balance_amount) > 0 ? '#ef4444' : '#10b981' }}
                    >
                      Rs. {Number(item.balance_amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </CompactTable>

            <div
              style={{
                marginTop: '1rem',
                padding: '0.6rem 0.8rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <span>Remaining Balance:</span>
              <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '1rem' }}>
                Rs. {Number(selectedDemand.total_balance_amount).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <div>
                {(Number(selectedDemand.total_paid_amount) > 0 ||
                  selectedDemand.status === 'paid' ||
                  selectedDemand.status === 'partially_paid') && (
                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>
                    ⚠️ Payment recorded (Rs. {Number(selectedDemand.total_paid_amount).toLocaleString()}). Deletion prohibited.
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <CompactButton
                  $variant="danger"
                  disabled={
                    Number(selectedDemand.total_paid_amount) > 0 ||
                    selectedDemand.status === 'paid' ||
                    selectedDemand.status === 'partially_paid'
                  }
                  onClick={() => handleDeleteDemand(selectedDemand)}
                  title={
                    Number(selectedDemand.total_paid_amount) > 0 ||
                    selectedDemand.status === 'paid' ||
                    selectedDemand.status === 'partially_paid'
                      ? 'Deletion prohibited: Payment recorded'
                      : 'Delete Unpaid Challan'
                  }
                >
                  <Delete fontSize="inherit" /> Delete Challan
                </CompactButton>
                <CompactButton onClick={() => setSelectedDemand(null)}>Close</CompactButton>
              </div>
            </div>
          </DenseCard>
        </div>
      )}
    </DenseContainer>
  );
};

export default FeeDemandsPage;
