import React, { useState, useEffect } from 'react';
import {
  AccountBalance,
  Add,
  Policy,
  Category,
  Edit,
  Close,
  Save,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/useToast';
import { supabase } from '../../supabaseClient';
import {
  FeeHead,
  FeePolicyVersion,
  FeeHeadCategory,
  FeeFrequency,
  FeeAmountRule,
  LateFineType,
} from '../../types/feeLedger';
import {
  fetchFeeHeads,
  upsertFeeHead,
  fetchFeePolicyVersions,
  createFeePolicyVersion,
} from '../../services/feeLedgerService';
import {
  DenseContainer,
  DenseHeader,
  StatsStrip,
  StatCard,
  DenseCard,
  CompactTable,
  DenseBadge,
  CompactButton,
  DenseSelect,
  DenseInput,
} from './FeeSharedComponents';

export const FeeCatalogPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;

  const [activeTab, setActiveTab] = useState<'heads' | 'policies'>('heads');
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [policies, setPolicies] = useState<FeePolicyVersion[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [sessions, setSessions] = useState<{ id: number; name: string; is_active: boolean }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(0);

  // Modal State for Fee Head
  const [headModalOpen, setHeadModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<Partial<FeeHead>>({
    code: '',
    title: '',
    category: 'academic',
    is_refundable: false,
    is_active: true,
  });

  // Modal State for Policy
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Partial<FeePolicyVersion>>({
    fee_head_id: 0,
    frequency: 'monthly',
    amount_rule: 'class_based',
    base_amount: 0,
    class_id: null,
    due_day_of_month: 10,
    grace_period_days: 5,
    late_fine_type: 'fixed',
    late_fine_amount: 100,
    max_late_fine: 500,
    allow_partial_payment: true,
    allow_concessions: true,
    rolls_into_arrears: true,
    status: 'active',
  });

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadPolicies(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadInitialData = async () => {
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
      }

      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('id', { ascending: true });

      if (classData) setClasses(classData);

      await loadFeeHeads();
    } catch (err: any) {
      showToast('Failed to load initial catalog data.', 'error');
    }
  };

  const loadFeeHeads = async () => {
    try {
      const heads = await fetchFeeHeads(schoolId);
      setFeeHeads(heads);
    } catch (err: any) {
      showToast('Failed to load fee heads.', 'error');
    }
  };

  const loadPolicies = async (sessionId: number) => {
    try {
      const pols = await fetchFeePolicyVersions(schoolId, sessionId);
      setPolicies(pols);
    } catch (err: any) {
      showToast('Failed to load fee policies.', 'error');
    }
  };

  const handleSaveHead = async () => {
    if (!editingHead.code || !editingHead.title) {
      showToast('Code and Title are required.', 'error');
      return;
    }
    try {
      await upsertFeeHead(schoolId, editingHead);
      showToast('Fee head saved!', 'success');
      setHeadModalOpen(false);
      loadFeeHeads();
    } catch (err: any) {
      showToast(err.message || 'Failed to save fee head.', 'error');
    }
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy.fee_head_id || !selectedSessionId) {
      showToast('Select a Fee Head.', 'error');
      return;
    }
    try {
      await createFeePolicyVersion(schoolId, {
        ...editingPolicy,
        session_id: selectedSessionId,
      });
      showToast('Policy created!', 'success');
      setPolicyModalOpen(false);
      loadPolicies(selectedSessionId);
    } catch (err: any) {
      showToast(err.message || 'Failed to create fee policy.', 'error');
    }
  };

  return (
    <DenseContainer>
      {/* Header */}
      <DenseHeader>
        <div className="title-group">
          <h1>
            <AccountBalance style={{ color: '#4f46e5', fontSize: '1.4rem' }} /> Fee Catalog & Policy Engine
          </h1>
          <span className="subtitle">Rate Cards, Schedules & Penalties</span>
        </div>

        <div className="actions-group">
          {activeTab === 'policies' && (
            <DenseSelect
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              style={{ width: 'auto' }}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? '★' : ''}
                </option>
              ))}
            </DenseSelect>
          )}

          {activeTab === 'heads' ? (
            <CompactButton
              $variant="primary"
              onClick={() => {
                setEditingHead({
                  code: '',
                  title: '',
                  category: 'academic',
                  is_refundable: false,
                  is_active: true,
                });
                setHeadModalOpen(true);
              }}
            >
              <Add fontSize="inherit" /> Add Fee Head
            </CompactButton>
          ) : (
            <CompactButton
              $variant="primary"
              onClick={() => {
                setEditingPolicy({
                  fee_head_id: feeHeads[0]?.id || 0,
                  frequency: 'monthly',
                  amount_rule: 'class_based',
                  base_amount: 0,
                  class_id: classes[0]?.id || null,
                  due_day_of_month: 10,
                  grace_period_days: 5,
                  late_fine_type: 'fixed',
                  late_fine_amount: 100,
                  max_late_fine: 500,
                  allow_partial_payment: true,
                  allow_concessions: true,
                  rolls_into_arrears: true,
                  status: 'active',
                });
                setPolicyModalOpen(true);
              }}
            >
              <Add fontSize="inherit" /> New Policy Version
            </CompactButton>
          )}
        </div>
      </DenseHeader>

      {/* Top Enriched Stats */}
      <StatsStrip>
        <StatCard $accentColor="#4f46e5">
          <span className="stat-label">Fee Heads</span>
          <div className="stat-val-row">
            <span className="stat-val">{feeHeads.length}</span>
            <span className="stat-sub">Defined</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#059669">
          <span className="stat-label">Active Policies</span>
          <div className="stat-val-row">
            <span className="stat-val">{policies.length}</span>
            <span className="stat-sub">Session Rate Cards</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#3b82f6">
          <span className="stat-label">Configured Classes</span>
          <div className="stat-val-row">
            <span className="stat-val">{classes.length}</span>
            <span className="stat-sub">Classes</span>
          </div>
        </StatCard>
      </StatsStrip>

      {/* Compact Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <CompactButton
          $variant={activeTab === 'heads' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('heads')}
        >
          <Category fontSize="inherit" /> Fee Heads ({feeHeads.length})
        </CompactButton>
        <CompactButton
          $variant={activeTab === 'policies' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('policies')}
        >
          <Policy fontSize="inherit" /> Policy Versions ({policies.length})
        </CompactButton>
      </div>

      {/* Content Table */}
      <DenseCard style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'heads' ? (
          <CompactTable>
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Category</th>
                <th>Refundable</th>
                <th>GL Account</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {feeHeads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                    No fee heads configured yet.
                  </td>
                </tr>
              ) : (
                feeHeads.map((head) => (
                  <tr key={head.id}>
                    <td><strong>{head.code}</strong></td>
                    <td>{head.title}</td>
                    <td><DenseBadge $variant="info">{head.category}</DenseBadge></td>
                    <td>{head.is_refundable ? 'Yes (Deposit)' : 'No'}</td>
                    <td className="num">{head.gl_account_code || '—'}</td>
                    <td>
                      <DenseBadge $variant={head.is_active ? 'success' : 'neutral'}>
                        {head.is_active ? 'Active' : 'Inactive'}
                      </DenseBadge>
                    </td>
                    <td>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '2px' }}
                        onClick={() => {
                          setEditingHead(head);
                          setHeadModalOpen(true);
                        }}
                      >
                        <Edit fontSize="small" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </CompactTable>
        ) : (
          <CompactTable>
            <thead>
              <tr>
                <th>Head</th>
                <th>Class</th>
                <th>Frequency</th>
                <th>Base Amount</th>
                <th>Due Day</th>
                <th>Grace</th>
                <th>Late Fine</th>
                <th>Arrears</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                    No policy versions configured for this session.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.head_title || p.fee_head_id}</strong></td>
                    <td>{p.class_name || 'All Classes'}</td>
                    <td><DenseBadge $variant="neutral">{p.frequency}</DenseBadge></td>
                    <td className="num">Rs. {Number(p.base_amount).toLocaleString()}</td>
                    <td>Day {p.due_day_of_month}</td>
                    <td>{p.grace_period_days}d</td>
                    <td>
                      {p.late_fine_type === 'none'
                        ? 'None'
                        : `Rs. ${p.late_fine_amount} (${p.late_fine_type})`}
                    </td>
                    <td>{p.rolls_into_arrears ? 'Yes' : 'No'}</td>
                    <td>
                      <DenseBadge $variant={p.status === 'active' ? 'success' : 'warning'}>
                        v{p.version_number} {p.status}
                      </DenseBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </CompactTable>
        )}
      </DenseCard>

      {/* MODAL: FEE HEAD */}
      {headModalOpen && (
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
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{editingHead.id ? 'Edit Fee Head' : 'Add Fee Head'}</h3>
              <Close style={{ cursor: 'pointer' }} onClick={() => setHeadModalOpen(false)} />
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Code</label>
              <input
                type="text"
                value={editingHead.code || ''}
                onChange={(e) => setEditingHead({ ...editingHead, code: e.target.value.toUpperCase() })}
                style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Title</label>
              <input
                type="text"
                value={editingHead.title || ''}
                onChange={(e) => setEditingHead({ ...editingHead, title: e.target.value })}
                style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Category</label>
              <DenseSelect
                value={editingHead.category || 'academic'}
                onChange={(e) => setEditingHead({ ...editingHead, category: e.target.value as FeeHeadCategory })}
              >
                <option value="academic">Academic / Tuition</option>
                <option value="admission">Admission Fee</option>
                <option value="transport">Transport</option>
                <option value="hostel">Hostel</option>
                <option value="lab">Computer / Science Lab</option>
                <option value="library">Library</option>
                <option value="fine">Penalty / Fine</option>
                <option value="security_deposit">Refundable Security Deposit</option>
                <option value="one_time">One-Time Special Charge</option>
              </DenseSelect>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <CompactButton onClick={() => setHeadModalOpen(false)}>Cancel</CompactButton>
              <CompactButton $variant="primary" onClick={handleSaveHead}>Save</CompactButton>
            </div>
          </DenseCard>
        </div>
      )}

      {/* MODAL: POLICY */}
      {policyModalOpen && (
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
          <DenseCard style={{ maxWidth: '440px', width: '100%', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Configure Rate Card Policy</h3>
              <Close style={{ cursor: 'pointer' }} onClick={() => setPolicyModalOpen(false)} />
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Fee Head</label>
              <DenseSelect
                value={editingPolicy.fee_head_id}
                onChange={(e) => setEditingPolicy({ ...editingPolicy, fee_head_id: Number(e.target.value) })}
              >
                {feeHeads.map((h) => (
                  <option key={h.id} value={h.id}>{h.title} ({h.code})</option>
                ))}
              </DenseSelect>
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Class</label>
              <DenseSelect
                value={editingPolicy.class_id || ''}
                onChange={(e) => setEditingPolicy({ ...editingPolicy, class_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </DenseSelect>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Base Amount</label>
                <input
                  type="number"
                  value={editingPolicy.base_amount || 0}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, base_amount: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Due Day</label>
                <input
                  type="number"
                  value={editingPolicy.due_day_of_month || 10}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, due_day_of_month: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <CompactButton onClick={() => setPolicyModalOpen(false)}>Cancel</CompactButton>
              <CompactButton $variant="primary" onClick={handleSavePolicy}>Save Policy</CompactButton>
            </div>
          </DenseCard>
        </div>
      )}
    </DenseContainer>
  );
};

export default FeeCatalogPage;
