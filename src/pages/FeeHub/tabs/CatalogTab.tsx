import React, { useState, useEffect } from 'react';
import {
  Settings,
  Add,
  FlashOn,
  CalendarMonth,
  AccessTime,
  CheckCircle,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import {
  FeeHead,
  FeeRate,
  FeeLateRule,
  FeeHeadCategory,
  FeeFrequency,
  LateFineType,
} from '../../../types/feeLedger';
import {
  fetchFeeHeads,
  upsertFeeHead,
  fetchFeeRates,
  createFeeRate,
  endFeeRate,
  fetchLateRules,
  saveLateRule,
  assessLateFines,
} from '../../../services/feeLedgerService';
import {
  HubCard,
  HubFilterRow,
  ModernInput,
  ModernSelect,
  ModernButton,
  ModernTable,
  TableWrapper,
  ModernBadge,
  ModalBackdrop,
  ModalDialog,
  formatFeeCurrency,
} from '../FeeHubStyles';

export const CatalogTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  const [subSection, setSubSection] = useState<'heads' | 'rates' | 'late'>('rates');

  // References
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(0);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);

  // Heads
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [headModalOpen, setHeadModalOpen] = useState(false);
  const [headForm, setHeadForm] = useState<Partial<FeeHead>>({
    code: '',
    title: '',
    category: 'academic',
    is_refundable: false,
    priority_order: 10,
    is_active: true,
  });

  // Rates
  const [rates, setRates] = useState<FeeRate[]>([]);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState<{
    fee_head_id: number;
    class_id: number | '';
    amount: number;
    frequency: FeeFrequency;
    billing_months: number[];
    due_day: number;
    allow_partial: boolean;
    allow_concession: boolean;
    valid_from: string;
  }>({
    fee_head_id: 0,
    class_id: '',
    amount: 3000,
    frequency: 'monthly',
    billing_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    due_day: 10,
    allow_partial: true,
    allow_concession: true,
    valid_from: new Date().toISOString().split('T')[0],
  });

  // Late Rules
  const [lateRules, setLateRules] = useState<FeeLateRule[]>([]);
  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [lateForm, setLateForm] = useState<Partial<FeeLateRule>>({
    fee_head_id: null,
    grace_days: 10,
    fine_type: 'fixed',
    fine_value: 300,
    max_fine: 1500,
    is_active: true,
  });

  // Late Assessment Engine
  const [assessing, setAssessing] = useState(false);

  useEffect(() => {
    loadSessionsAndClasses();
    loadHeads();
    loadLateRules();
  }, [schoolId]);

  useEffect(() => {
    if (selectedSessionId) loadRates(selectedSessionId);
  }, [schoolId, selectedSessionId]);

  const loadSessionsAndClasses = async () => {
    try {
      const { data: sData } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('id', { ascending: false });
      if (sData && sData.length > 0) {
        setSessions(sData);
        setSelectedSessionId(sData[0].id);
      }

      const { data: cData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      setClasses(cData || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadHeads = async () => {
    try {
      const data = await fetchFeeHeads(schoolId);
      setHeads(data);
      if (data.length > 0) {
        setRateForm((prev) => ({
          ...prev,
          fee_head_id: prev.fee_head_id || data[0].id,
        }));
      }
    } catch (err: any) {
      showToast('Failed to load fee heads.', 'error');
    }
  };

  const handleSeedStandardHeads = async () => {
    try {
      const standards = [
        { code: 'TUI', title: 'Tuition Fee', category: 'academic', is_refundable: false, priority_order: 10 },
        { code: 'ADM', title: 'Admission Fee', category: 'admission', is_refundable: false, priority_order: 1 },
        { code: 'ANN', title: 'Annual / Development Charges', category: 'one_time', is_refundable: false, priority_order: 20 },
        { code: 'EXM', title: 'Examination Fee', category: 'academic', is_refundable: false, priority_order: 30 },
        { code: 'LAB', title: 'Computer & Science Lab Fee', category: 'lab', is_refundable: false, priority_order: 40 },
        { code: 'LIB', title: 'Library Fee', category: 'library', is_refundable: false, priority_order: 50 },
        { code: 'SPT', title: 'Sports & Activity Fee', category: 'activity', is_refundable: false, priority_order: 60 },
        { code: 'TRN', title: 'Transport Fee', category: 'transport', is_refundable: false, priority_order: 70 },
        { code: 'SEC', title: 'Security Deposit', category: 'security_deposit', is_refundable: true, priority_order: 5 },
        { code: 'MISC', title: 'Miscellaneous Charges', category: 'custom', is_refundable: false, priority_order: 80 },
      ];
      for (const s of standards) {
        await upsertFeeHead(schoolId, s as any);
      }
      showToast('Standard Fee Heads initialized successfully!', 'success');
      await loadHeads();
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize standard heads', 'error');
    }
  };

  const handleOpenRateModal = () => {
    if (heads.length === 0) {
      showToast('Please create or initialize fee heads first.', 'warning');
      setSubSection('heads');
      return;
    }
    setRateForm((prev) => ({
      ...prev,
      fee_head_id: prev.fee_head_id || heads[0]?.id || 0,
    }));
    setRateModalOpen(true);
  };

  const loadRates = async (sessId: number) => {
    try {
      const data = await fetchFeeRates(schoolId, sessId);
      setRates(data);
    } catch (err: any) {
      showToast('Failed to load rate matrix.', 'error');
    }
  };

  const loadLateRules = async () => {
    try {
      const data = await fetchLateRules(schoolId);
      setLateRules(data);
    } catch (err: any) {
      showToast('Failed to load late rules.', 'error');
    }
  };

  // Save Head
  const handleSaveHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headForm.title?.trim() || !headForm.code?.trim()) {
      showToast('Title and Code are required.', 'error');
      return;
    }
    try {
      await upsertFeeHead(schoolId, headForm);
      showToast('Fee head saved successfully!', 'success');
      setHeadModalOpen(false);
      loadHeads();
    } catch (err: any) {
      showToast(err.message || 'Failed to save head.', 'error');
    }
  };

  // Save Rate
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) {
      showToast('Select an academic session.', 'error');
      return;
    }
    try {
      await createFeeRate(schoolId, userId, {
        fee_head_id: rateForm.fee_head_id,
        session_id: selectedSessionId,
        class_id: rateForm.class_id ? Number(rateForm.class_id) : null,
        amount: Number(rateForm.amount),
        frequency: rateForm.frequency,
        billing_months: rateForm.billing_months,
        due_day: Number(rateForm.due_day),
        allow_partial: rateForm.allow_partial,
        allow_concession: rateForm.allow_concession,
        valid_from: rateForm.valid_from,
      });
      showToast('Fee rate card created successfully!', 'success');
      setRateModalOpen(false);
      loadRates(selectedSessionId);
    } catch (err: any) {
      showToast(err.message || 'Failed to create rate.', 'error');
    }
  };

  // End Rate
  const handleEndRate = async (rateId: number) => {
    const endDate = prompt('Enter effective end date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!endDate) return;
    try {
      await endFeeRate(rateId, endDate);
      showToast('Rate closed cleanly.', 'success');
      loadRates(selectedSessionId);
    } catch (err: any) {
      showToast(err.message || 'Failed to end rate.', 'error');
    }
  };

  // Save Late Rule
  const handleSaveLateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveLateRule(schoolId, lateForm);
      showToast('Late penalty rule saved!', 'success');
      setLateModalOpen(false);
      loadLateRules();
    } catch (err: any) {
      showToast(err.message || 'Failed to save rule.', 'error');
    }
  };

  // Trigger Late Fine Assessment Engine
  const handleAssessFines = async () => {
    if (!window.confirm('Run automated late fine assessment across all overdue accounts as of today?')) return;
    try {
      setAssessing(true);
      const res = await assessLateFines({ schoolId, userId });
      showToast(
        `Late Assessment Complete! Created: ${res.fines_created}, Updated: ${res.fines_increased}, Added: Rs ${res.total_fine_added.toLocaleString()}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to assess late fines.', 'error');
    } finally {
      setAssessing(false);
    }
  };

  return (
    <div>
      {/* Sub-navigation bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <ModernButton
            $variant={subSection === 'rates' ? 'primary' : 'ghost'}
            onClick={() => setSubSection('rates')}
          >
            Class Rate Card Matrix ({rates.length})
          </ModernButton>
          <ModernButton
            $variant={subSection === 'heads' ? 'primary' : 'ghost'}
            onClick={() => setSubSection('heads')}
          >
            Fee Heads Catalog ({heads.length})
          </ModernButton>
          <ModernButton
            $variant={subSection === 'late' ? 'primary' : 'ghost'}
            onClick={() => setSubSection('late')}
          >
            Late Fine Penalty Rules ({lateRules.length})
          </ModernButton>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {subSection === 'rates' && (
            <ModernButton $variant="primary" onClick={handleOpenRateModal}>
              <Add fontSize="small" /> New Class Rate Card
            </ModernButton>
          )}
          {subSection === 'heads' && (
            <>
              {heads.length === 0 && (
                <ModernButton $variant="success" onClick={handleSeedStandardHeads}>
                  <FlashOn fontSize="small" /> Initialize Standard Heads
                </ModernButton>
              )}
              <ModernButton $variant="primary" onClick={() => setHeadModalOpen(true)}>
                <Add fontSize="small" /> New Fee Head
              </ModernButton>
            </>
          )}
          {subSection === 'late' && (
            <>
              <ModernButton $variant="warning" onClick={handleAssessFines} disabled={assessing}>
                <FlashOn fontSize="small" /> {assessing ? 'Assessing...' : 'Assess Late Fines Now'}
              </ModernButton>
              <ModernButton $variant="primary" onClick={() => setLateModalOpen(true)}>
                <Add fontSize="small" /> Add Late Rule
              </ModernButton>
            </>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1: RATE CARD MATRIX */}
      {/* ================================================================= */}
      {subSection === 'rates' && (
        <>
          <HubFilterRow>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Academic Session:
            </span>
            <ModernSelect
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </ModernSelect>
          </HubFilterRow>

          <HubCard style={{ padding: '0.5rem' }}>
            <TableWrapper>
              <ModernTable>
                <thead>
                  <tr>
                    <th>Head Title</th>
                    <th>Class Scope</th>
                    <th>Frequency</th>
                    <th style={{ textAlign: 'right' }}>Amount (Rs)</th>
                    <th>Due Day</th>
                    <th>Billing Months</th>
                    <th>Validity Window</th>
                    <th>Concession Allowed</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                        No rate cards found for this session. Click "New Class Rate Card" to configure rates.
                      </td>
                    </tr>
                  ) : (
                    rates.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700 }}>
                          {r.head_title} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({r.head_code})</span>
                        </td>
                        <td>
                          {r.class_name ? (
                            <ModernBadge $variant="info">{r.class_name}</ModernBadge>
                          ) : (
                            <ModernBadge $variant="purple">All Classes</ModernBadge>
                          )}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{r.frequency}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                          {formatFeeCurrency(r.amount)}
                        </td>
                        <td>Day {r.due_day} of month</td>
                        <td style={{ fontSize: '0.72rem', maxWidth: '160px' }}>
                          {r.billing_months?.length === 12
                            ? 'All 12 Months'
                            : `Months: ${r.billing_months?.join(', ')}`}
                        </td>
                        <td style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>
                          {r.valid_during.replace(/[\[\(\)\]]/g, '').replace(',', ' → ') || 'Active'}
                        </td>
                        <td>{r.allow_concession ? '✓ Yes' : '✗ No'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <ModernButton
                            $size="sm"
                            $variant="ghost"
                            onClick={() => handleEndRate(r.id)}
                            title="Close this rate as of date"
                          >
                            End Rate
                          </ModernButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </ModernTable>
            </TableWrapper>
          </HubCard>
        </>
      )}

      {/* ================================================================= */}
      {/* SECTION 2: FEE HEADS */}
      {/* ================================================================= */}
      {subSection === 'heads' && (
        <HubCard style={{ padding: '0.5rem' }}>
          <TableWrapper>
            <ModernTable>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title / Particular</th>
                  <th>Category</th>
                  <th>Refundable</th>
                  <th>Priority Order</th>
                  <th>GL Account Code</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {heads.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>{h.code}</td>
                    <td style={{ fontWeight: 700 }}>{h.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <ModernBadge $variant="info">{h.category}</ModernBadge>
                    </td>
                    <td>{h.is_refundable ? '✓ Refundable' : 'Non-Refundable'}</td>
                    <td>Order #{h.priority_order}</td>
                    <td style={{ fontFamily: 'monospace' }}>{h.gl_account_code || '—'}</td>
                    <td>
                      <ModernBadge $variant={h.is_active ? 'success' : 'neutral'}>
                        {h.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </ModernBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ModernTable>
          </TableWrapper>
        </HubCard>
      )}

      {/* ================================================================= */}
      {/* SECTION 3: LATE FINE RULES */}
      {/* ================================================================= */}
      {subSection === 'late' && (
        <HubCard style={{ padding: '0.5rem' }}>
          <TableWrapper>
            <ModernTable>
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Target Fee Head</th>
                  <th>Grace Days</th>
                  <th>Fine Calculation</th>
                  <th style={{ textAlign: 'right' }}>Fine Value</th>
                  <th style={{ textAlign: 'right' }}>Max Cap (Rs)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lateRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                      No late rules configured yet.
                    </td>
                  </tr>
                ) : (
                  lateRules.map((rule) => (
                    <tr key={rule.id}>
                      <td style={{ fontFamily: 'monospace' }}>#{rule.id}</td>
                      <td>{rule.head_title || 'Applies to Entire Overdue Balance'}</td>
                      <td>{rule.grace_days} Days post Due Date</td>
                      <td style={{ textTransform: 'capitalize' }}>{rule.fine_type.replace('_', ' ')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                        {rule.fine_type === 'percentage'
                          ? `${rule.fine_value}%`
                          : formatFeeCurrency(rule.fine_value)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {rule.max_fine ? formatFeeCurrency(rule.max_fine) : 'No Cap'}
                      </td>
                      <td>
                        <ModernBadge $variant={rule.is_active ? 'success' : 'neutral'}>
                          {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                        </ModernBadge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ModernTable>
          </TableWrapper>
        </HubCard>
      )}

      {/* Modal: New Head */}
      {headModalOpen && (
        <ModalBackdrop onClick={() => setHeadModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="480px">
            <h3 className="modal-title">New Fee Head</h3>
            <p className="modal-subtitle">Add a fee billing classification (e.g. Tuition, Exam, Lab, Transport).</p>

            <form onSubmit={handleSaveHead} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    HEAD CODE:
                  </label>
                  <ModernInput
                    type="text"
                    placeholder="TUI"
                    value={headForm.code}
                    onChange={(e) => setHeadForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', fontFamily: 'monospace' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    TITLE / PARTICULAR:
                  </label>
                  <ModernInput
                    type="text"
                    placeholder="Tuition Fee"
                    value={headForm.title}
                    onChange={(e) => setHeadForm((p) => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    CATEGORY:
                  </label>
                  <ModernSelect
                    value={headForm.category}
                    onChange={(e) => setHeadForm((p) => ({ ...p, category: e.target.value as FeeHeadCategory }))}
                    style={{ width: '100%' }}
                  >
                    <option value="academic">Academic</option>
                    <option value="admission">Admission</option>
                    <option value="transport">Transport</option>
                    <option value="hostel">Hostel</option>
                    <option value="lab">Lab / Science</option>
                    <option value="library">Library</option>
                    <option value="security_deposit">Security Deposit</option>
                    <option value="arrears">Arrears</option>
                    <option value="custom">Custom</option>
                  </ModernSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    PRIORITY ORDER:
                  </label>
                  <ModernInput
                    type="number"
                    value={headForm.priority_order}
                    onChange={(e) => setHeadForm((p) => ({ ...p, priority_order: parseInt(e.target.value) || 10 }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_ref"
                  checked={headForm.is_refundable}
                  onChange={(e) => setHeadForm((p) => ({ ...p, is_refundable: e.target.checked }))}
                />
                <label htmlFor="is_ref" style={{ fontSize: '0.82rem', cursor: 'pointer' }}>
                  Is Refundable Security Deposit
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setHeadModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary">
                  Save Fee Head
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: New Rate Card */}
      {rateModalOpen && (
        <ModalBackdrop onClick={() => setRateModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="560px">
            <h3 className="modal-title">Create Class Rate Card</h3>
            <p className="modal-subtitle">
              Configures standard monthly/term charges with race-free temporal non-overlapping ranges.
            </p>

            <form onSubmit={handleSaveRate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    FEE HEAD:
                  </label>
                  <ModernSelect
                    value={rateForm.fee_head_id || (heads[0]?.id ?? '')}
                    onChange={(e) => setRateForm((p) => ({ ...p, fee_head_id: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                    required
                  >
                    {heads.length === 0 ? (
                      <option value="">No fee heads in catalog — create one first</option>
                    ) : (
                      heads.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.title} ({h.code})
                        </option>
                      ))
                    )}
                  </ModernSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    CLASS SCOPE:
                  </label>
                  <ModernSelect
                    value={rateForm.class_id}
                    onChange={(e) =>
                      setRateForm((p) => ({
                        ...p,
                        class_id: e.target.value ? Number(e.target.value) : '',
                      }))
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="">All Classes (School-wide)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </ModernSelect>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    AMOUNT (RS):
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    step="0.01"
                    value={rateForm.amount}
                    onChange={(e) => setRateForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', fontSize: '1.1rem', fontWeight: 800 }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    DUE DAY OF MONTH:
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    max="28"
                    value={rateForm.due_day}
                    onChange={(e) => setRateForm((p) => ({ ...p, due_day: parseInt(e.target.value) || 10 }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    FREQUENCY:
                  </label>
                  <ModernSelect
                    value={rateForm.frequency}
                    onChange={(e) => setRateForm((p) => ({ ...p, frequency: e.target.value as FeeFrequency }))}
                    style={{ width: '100%' }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="biannual">Biannual</option>
                    <option value="annual">Annual</option>
                    <option value="one_time">One Time</option>
                  </ModernSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    VALID FROM DATE:
                  </label>
                  <ModernInput
                    type="date"
                    value={rateForm.valid_from}
                    onChange={(e) => setRateForm((p) => ({ ...p, valid_from: e.target.value }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              {/* Billing Month Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                  BILLING MONTHS:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem' }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const checked = rateForm.billing_months.includes(m);
                    return (
                      <label
                        key={m}
                        style={{
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          background: checked ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc',
                          padding: '3px 4px',
                          borderRadius: '4px',
                          border: `1px solid ${checked ? '#3b82f6' : '#e2e8f0'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRateForm((p) => ({ ...p, billing_months: [...p.billing_months, m].sort((a, b) => a - b) }));
                            } else {
                              setRateForm((p) => ({ ...p, billing_months: p.billing_months.filter((x) => x !== m) }));
                            }
                          }}
                        />
                        M{m}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setRateModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary">
                  Save Rate Card
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: New Late Rule */}
      {lateModalOpen && (
        <ModalBackdrop onClick={() => setLateModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="480px">
            <h3 className="modal-title">Configure Late Penalty Rule</h3>
            <p className="modal-subtitle">Automatic late fine policy applied when fee is unpaid past due date.</p>

            <form onSubmit={handleSaveLateRule} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  GRACE DAYS (POST DUE DATE):
                </label>
                <ModernInput
                  type="number"
                  min="0"
                  value={lateForm.grace_days}
                  onChange={(e) => setLateForm((p) => ({ ...p, grace_days: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    FINE CALCULATION:
                  </label>
                  <ModernSelect
                    value={lateForm.fine_type}
                    onChange={(e) => setLateForm((p) => ({ ...p, fine_type: e.target.value as LateFineType }))}
                    style={{ width: '100%' }}
                  >
                    <option value="fixed">Fixed Fine (One-time)</option>
                    <option value="per_day">Daily Penalty (Per day)</option>
                    <option value="percentage">Percentage of Overdue</option>
                  </ModernSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    FINE VALUE:
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    step="0.01"
                    value={lateForm.fine_value}
                    onChange={(e) => setLateForm((p) => ({ ...p, fine_value: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  MAXIMUM FINE CAP (OPTIONAL):
                </label>
                <ModernInput
                  type="number"
                  value={lateForm.max_fine || ''}
                  onChange={(e) =>
                    setLateForm((p) => ({
                      ...p,
                      max_fine: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g. 1500 (Leave empty for no cap)"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setLateModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary">
                  Save Late Rule
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}
    </div>
  );
};
export default CatalogTab;
