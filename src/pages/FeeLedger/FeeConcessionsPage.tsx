import React, { useState, useEffect } from 'react';
import {
  CardGiftcard,
  Add,
  Search,
  AccountCircle,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/useToast';
import { supabase } from '../../supabaseClient';
import {
  StudentConcession,
  FeeHead,
  ConcessionType,
} from '../../types/feeLedger';
import {
  fetchFeeHeads,
  fetchStudentConcessions,
  createStudentConcession,
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
  DenseTextarea,
} from './FeeSharedComponents';

export const FeeConcessionsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;

  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [concessions, setConcessions] = useState<StudentConcession[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // New Concession Form State
  const [newConcession, setNewConcession] = useState<Partial<StudentConcession>>({
    fee_head_id: 0,
    concession_type: 'percentage',
    concession_value: 0,
    reason: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    approval_status: 'approved',
  });

  useEffect(() => {
    loadStudents();
    loadFeeHeads();
  }, [schoolId]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentConcessions(selectedStudent.id);
    }
  }, [selectedStudent]);

  const loadFeeHeads = async () => {
    try {
      const heads = await fetchFeeHeads(schoolId);
      setFeeHeads(heads);
      if (heads.length > 0) {
        setNewConcession((prev) => ({ ...prev, fee_head_id: heads[0].id }));
      }
    } catch (err: any) {
      showToast('Failed to load fee heads.', 'error');
    }
  };

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, name, father_name, class_id, section_id,
          classes:class_id ( name ),
          sections:section_id ( name )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('id', { ascending: true })
        .limit(150);

      if (error) throw error;
      setStudents(data || []);
      if (data && data.length > 0) {
        setSelectedStudent(data[0]);
      }
    } catch (err: any) {
      showToast('Failed to load students.', 'error');
    }
  };

  const loadStudentConcessions = async (studentId: number) => {
    try {
      const data = await fetchStudentConcessions(schoolId, studentId);
      setConcessions(data);
    } catch (err: any) {
      showToast('Failed to load student concessions.', 'error');
    }
  };

  const handleSaveConcession = async () => {
    if (!selectedStudent) return;
    if (!newConcession.reason || newConcession.reason.trim() === '') {
      showToast('Mandatory reason required.', 'error');
      return;
    }
    if (!newConcession.concession_value || Number(newConcession.concession_value) <= 0) {
      showToast('Valid concession value required.', 'error');
      return;
    }

    try {
      await createStudentConcession(schoolId, {
        ...newConcession,
        student_id: selectedStudent.id,
        approved_by: user?.id,
      });

      showToast('Concession granted!', 'success');
      setModalOpen(false);
      loadStudentConcessions(selectedStudent.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to create concession.', 'error');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.father_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.id).includes(searchTerm)
  );

  return (
    <DenseContainer>
      {/* Header */}
      <DenseHeader>
        <div className="title-group">
          <h1>
            <CardGiftcard style={{ color: '#ec4899', fontSize: '1.4rem' }} /> Fee Concessions & Scholarships
          </h1>
          <span className="subtitle">Layered Concession Registry</span>
        </div>

        <div className="actions-group">
          {selectedStudent && (
            <CompactButton $variant="primary" onClick={() => setModalOpen(true)}>
              <Add fontSize="inherit" /> Grant Concession
            </CompactButton>
          )}
        </div>
      </DenseHeader>

      {/* Top Enriched Stats */}
      <StatsStrip>
        <StatCard $accentColor="#ec4899">
          <span className="stat-label">Active Student Roster</span>
          <div className="stat-val-row">
            <span className="stat-val">{students.length}</span>
            <span className="stat-sub">Enrolled</span>
          </div>
        </StatCard>

        <StatCard $accentColor="#3b82f6">
          <span className="stat-label">Selected Student Grants</span>
          <div className="stat-val-row">
            <span className="stat-val">{concessions.length}</span>
            <span className="stat-sub">Active Policies</span>
          </div>
        </StatCard>
      </StatsStrip>

      {/* Two-Pane High Density Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0.75rem', alignItems: 'start' }}>
        {/* Left Pane: Student Picker */}
        <DenseCard style={{ padding: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
            <Search fontSize="small" style={{ opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem 0.5rem',
                fontSize: '0.82rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>

          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
                    #{s.id} | Class: {s.classes?.name || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </DenseCard>

        {/* Right Pane: Concession Registry */}
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
                <DenseBadge $variant="info">{concessions.length} Concessions</DenseBadge>
              </div>

              <CompactTable>
                <thead>
                  <tr>
                    <th>Fee Head</th>
                    <th>Type</th>
                    <th>Concession Value</th>
                    <th>Reason / Justification</th>
                    <th>Effective</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {concessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                        No concessions or scholarships assigned to this student.
                      </td>
                    </tr>
                  ) : (
                    concessions.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.head_title || 'All Heads'}</strong></td>
                        <td><DenseBadge $variant="info">{c.concession_type.replace('_', ' ')}</DenseBadge></td>
                        <td className="num">
                          {c.concession_type === 'percentage'
                            ? `${c.concession_value}%`
                            : `Rs. ${Number(c.concession_value).toLocaleString()}`}
                        </td>
                        <td>{c.reason}</td>
                        <td>{c.start_date}</td>
                        <td><DenseBadge $variant="success">{c.approval_status}</DenseBadge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </CompactTable>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.5 }}>
              Select a student from the left roster.
            </div>
          )}
        </DenseCard>
      </div>

      {/* MODAL: GRANT CONCESSION */}
      {modalOpen && (
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
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Grant Concession: {selectedStudent?.name}</h3>
              <Close style={{ cursor: 'pointer' }} onClick={() => setModalOpen(false)} />
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Fee Head</label>
              <DenseSelect
                value={newConcession.fee_head_id}
                onChange={(e) => setNewConcession({ ...newConcession, fee_head_id: Number(e.target.value) })}
              >
                {feeHeads.map((h) => (
                  <option key={h.id} value={h.id}>{h.title} ({h.code})</option>
                ))}
              </DenseSelect>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Type</label>
                <DenseSelect
                  value={newConcession.concession_type}
                  onChange={(e) => setNewConcession({ ...newConcession, concession_type: e.target.value as ConcessionType })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount (Rs.)</option>
                  <option value="sibling">Sibling Discount</option>
                  <option value="staff_child">Staff Child</option>
                  <option value="scholarship">Merit Scholarship</option>
                  <option value="need_based">Need-Based</option>
                </DenseSelect>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Value</label>
                <DenseInput
                  type="number"
                  min="1"
                  max={newConcession.concession_type === 'percentage' ? 100 : undefined}
                  value={newConcession.concession_value || ''}
                  onChange={(e) => setNewConcession({ ...newConcession, concession_value: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Mandatory Justification / Reason</label>
              <DenseTextarea
                rows={2}
                value={newConcession.reason || ''}
                onChange={(e) => setNewConcession({ ...newConcession, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <CompactButton onClick={() => setModalOpen(false)}>Cancel</CompactButton>
              <CompactButton $variant="primary" onClick={handleSaveConcession}>Approve & Grant</CompactButton>
            </div>
          </DenseCard>
        </div>
      )}
    </DenseContainer>
  );
};

export default FeeConcessionsPage;
