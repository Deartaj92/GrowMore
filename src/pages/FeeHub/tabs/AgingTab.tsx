import React, { useState, useEffect, useMemo } from 'react';
import {
  AccessTime,
  Print,
  FileDownload,
  Phone,
  Refresh,
  Person,
  FamilyRestroom,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { AgingRow, FamilyAgingRow } from '../../../types/feeLedger';
import { getAgingReport, getFamilyAgingReport } from '../../../services/feeLedgerService';
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
  formatFeeCurrency,
} from '../FeeHubStyles';

export const AgingTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;

  const [viewMode, setViewMode] = useState<'student' | 'family'>('student');
  const [agingData, setAgingData] = useState<AgingRow[]>([]);
  const [familyAgingData, setFamilyAgingData] = useState<FamilyAgingRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | ''>('');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bucketFilter, setBucketFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSessionsAndClasses();
  }, [schoolId]);

  useEffect(() => {
    loadAging();
  }, [schoolId, selectedSessionId, asOfDate]);

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

  const loadAging = async () => {
    try {
      setLoading(true);
      const sessId = selectedSessionId ? Number(selectedSessionId) : null;
      const [rows, famRows] = await Promise.all([
        getAgingReport(schoolId, sessId, asOfDate),
        getFamilyAgingReport(schoolId, sessId, asOfDate),
      ]);
      setAgingData(rows);
      setFamilyAgingData(famRows);
    } catch (err: any) {
      showToast('Failed to load aging report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    return agingData.filter((r) => {
      if (selectedClassId && r.class_id !== Number(selectedClassId)) return false;

      if (bucketFilter === 'current' && r.not_due <= 0) return false;
      if (bucketFilter === '1_30' && r.d1_30 <= 0) return false;
      if (bucketFilter === '31_60' && r.d31_60 <= 0) return false;
      if (bucketFilter === '61_90' && r.d61_90 <= 0) return false;
      if (bucketFilter === '90_plus' && r.d90_plus <= 0) return false;
      if (bucketFilter === 'overdue_only' && r.d1_30 + r.d31_60 + r.d61_90 + r.d90_plus <= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m1 = r.student_name?.toLowerCase().includes(q);
        const m2 = r.father_name?.toLowerCase().includes(q);
        const m3 = r.roll_number?.toLowerCase().includes(q);
        const m4 = r.phone?.includes(q);
        if (!m1 && !m2 && !m3 && !m4) return false;
      }
      return true;
    });
  }, [agingData, selectedClassId, bucketFilter, searchQuery]);

  const filteredFamilyRows = useMemo(() => {
    return familyAgingData.filter((r) => {
      if (bucketFilter === 'current' && r.not_due <= 0) return false;
      if (bucketFilter === '1_30' && r.d1_30 <= 0) return false;
      if (bucketFilter === '31_60' && r.d31_60 <= 0) return false;
      if (bucketFilter === '61_90' && r.d61_90 <= 0) return false;
      if (bucketFilter === '90_plus' && r.d90_plus <= 0) return false;
      if (bucketFilter === 'overdue_only' && r.d1_30 + r.d31_60 + r.d61_90 + r.d90_plus <= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m1 = r.family_name?.toLowerCase().includes(q);
        const m2 = r.contact_number?.toLowerCase().includes(q);
        const m3 = r.siblings_summary?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [familyAgingData, bucketFilter, searchQuery]);

  const activeSource: Array<AgingRow | FamilyAgingRow> =
    viewMode === 'student' ? agingData : familyAgingData;
  const totalNotDue = activeSource.reduce((s, r) => s + (r.not_due || 0), 0);
  const total1_30 = activeSource.reduce((s, r) => s + (r.d1_30 || 0), 0);
  const total31_60 = activeSource.reduce((s, r) => s + (r.d31_60 || 0), 0);
  const total61_90 = activeSource.reduce((s, r) => s + (r.d61_90 || 0), 0);
  const total90Plus = activeSource.reduce((s, r) => s + (r.d90_plus || 0), 0);

  const handleExportCSV = () => {
    if (viewMode === 'family') {
      const headers = [
        'Family ID',
        'Family Head / Name',
        'Contact Phone',
        'Siblings Count',
        'Linked Siblings',
        'Current (Not Due)',
        '1-30 Days',
        '31-60 Days',
        '61-90 Days',
        '90+ Days',
        'Total Due',
      ];

      const csvRows = filteredFamilyRows.map((r) => [
        r.family_id,
        `"${r.family_name?.replace(/"/g, '""') || ''}"`,
        `"${r.contact_number || ''}"`,
        r.siblings_count,
        `"${r.siblings_summary?.replace(/"/g, '""') || ''}"`,
        r.not_due,
        r.d1_30,
        r.d31_60,
        r.d61_90,
        r.d90_plus,
        r.total_due,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Family_Fee_Aging_Defaulters_${asOfDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'Student ID',
      'Student Name',
      'Father Name',
      'Class',
      'Current (Not Due)',
      '1-30 Days',
      '31-60 Days',
      '61-90 Days',
      '90+ Days',
      'Total Due',
    ];

    const csvRows = filteredRows.map((r) => [
      r.student_id,
      `"${r.student_name?.replace(/"/g, '""') || ''}"`,
      `"${r.father_name?.replace(/"/g, '""') || ''}"`,
      `"${r.class_name || ''}"`,
      r.not_due,
      r.d1_30,
      r.d31_60,
      r.d61_90,
      r.d90_plus,
      r.total_due,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fee_Aging_Defaulters_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Top Action Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Aging Analysis & Recovery Defaulters</h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Audit overdue fee arrears categorized across 30, 60, and 90+ day buckets by individual student or consolidated family.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(148,163,184,0.12)', padding: '0.22rem', borderRadius: '9px', gap: '0.2rem' }}>
            <ModernButton
              $size="sm"
              $variant={viewMode === 'student' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('student')}
            >
              <Person fontSize="inherit" /> Student-Wise Defaulters
            </ModernButton>
            <ModernButton
              $size="sm"
              $variant={viewMode === 'family' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('family')}
            >
              <FamilyRestroom fontSize="inherit" /> Family-Wise Defaulters ({familyAgingData.length})
            </ModernButton>
          </div>

          <ModernButton $variant="secondary" onClick={handleExportCSV}>
            <FileDownload fontSize="small" /> Export CSV
          </ModernButton>
          <ModernButton $variant="primary" onClick={handlePrint}>
            <Print fontSize="small" /> Print Report
          </ModernButton>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <StatsGrid>
        <StatBox $accent="#2563eb">
          <div className="title">Current (Not Due)</div>
          <div className="value">{formatFeeCurrency(totalNotDue)}</div>
          <div className="sub">Upcoming Payments</div>
        </StatBox>

        <StatBox $accent="#d97706">
          <div className="title">1 – 30 Days Overdue</div>
          <div className="value">{formatFeeCurrency(total1_30)}</div>
          <div className="sub">Early Reminder Stage</div>
        </StatBox>

        <StatBox $accent="#ea580c">
          <div className="title">31 – 60 Days Overdue</div>
          <div className="value">{formatFeeCurrency(total31_60)}</div>
          <div className="sub">Notice Dispatched</div>
        </StatBox>

        <StatBox $accent="#dc2626">
          <div className="title">61 – 90 Days Overdue</div>
          <div className="value">{formatFeeCurrency(total61_90)}</div>
          <div className="sub">Severe Arrears</div>
        </StatBox>

        <StatBox $accent="#7f1d1d">
          <div className="title">90+ Days Critical</div>
          <div className="value">{formatFeeCurrency(total90Plus)}</div>
          <div className="sub">Board Escalation</div>
        </StatBox>
      </StatsGrid>

      {/* Filter Row */}
      <HubFilterRow>
        <div className="filter-item">
          <label>Session:</label>
          <ModernSelect
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </ModernSelect>
        </div>

        {viewMode === 'student' && (
          <div className="filter-item">
            <label>Class:</label>
            <ModernSelect
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </ModernSelect>
          </div>
        )}

        <div className="filter-item">
          <label>Aging Bucket:</label>
          <ModernSelect value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value)}>
            <option value="ALL">All Records</option>
            <option value="overdue_only">Overdue Accounts Only (&gt; 0 days)</option>
            <option value="1_30">1 – 30 Days Only</option>
            <option value="31_60">31 – 60 Days Only</option>
            <option value="61_90">61 – 90 Days Only</option>
            <option value="90_plus">90+ Days Critical Only</option>
            <option value="current">Current (Not Due)</option>
          </ModernSelect>
        </div>

        <div className="filter-item">
          <label>As Of Date:</label>
          <ModernInput type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </div>

        <div className="filter-item" style={{ flex: 1, minWidth: '180px' }}>
          <label>Search:</label>
          <ModernInput
            type="text"
            placeholder={viewMode === 'student' ? 'Student, father, phone...' : 'Family name, phone, siblings...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <ModernButton $size="sm" onClick={loadAging}>
          Refresh
        </ModernButton>
      </HubFilterRow>

      {/* Defaulters Table */}
      <HubCard style={{ padding: '0.5rem' }}>
        <TableWrapper>
          {viewMode === 'student' ? (
            <ModernTable>
              <thead>
                <tr>
                  <th>Student Details</th>
                  <th>Class</th>
                  <th>Contact Phone</th>
                  <th style={{ textAlign: 'right' }}>Current (Rs)</th>
                  <th style={{ textAlign: 'right' }}>1 – 30d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>31 – 60d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>61 – 90d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>90+d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>Total Due (Rs)</th>
                  <th>Risk Tier</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                      No overdue student fee accounts found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isCrit = r.d90_plus > 0;
                    const isHigh = r.d61_90 > 0;
                    const isMed = r.d31_60 > 0;
                    const isLow = r.d1_30 > 0;

                    const riskBadge = isCrit
                      ? { text: '90+d Critical', variant: 'danger' as const }
                      : isHigh
                      ? { text: '61-90d High', variant: 'danger' as const }
                      : isMed
                      ? { text: '31-60d Medium', variant: 'warning' as const }
                      : isLow
                      ? { text: '1-30d Early', variant: 'info' as const }
                      : { text: 'Current', variant: 'success' as const };

                    return (
                      <tr key={r.student_id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r.student_name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>s/o {r.father_name}</div>
                        </td>
                        <td>{r.class_name || '—'}</td>
                        <td>
                          {r.phone ? (
                            <a
                              href={`tel:${r.phone}`}
                              style={{ color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Phone style={{ fontSize: '0.85rem' }} /> {r.phone}
                            </a>
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', opacity: r.not_due ? 1 : 0.4 }}>
                          {r.not_due ? formatFeeCurrency(r.not_due) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: r.d1_30 ? 700 : 400, color: r.d1_30 ? '#d97706' : undefined }}>
                          {r.d1_30 ? formatFeeCurrency(r.d1_30) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: r.d31_60 ? 700 : 400, color: r.d31_60 ? '#ea580c' : undefined }}>
                          {r.d31_60 ? formatFeeCurrency(r.d31_60) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: r.d61_90 ? 700 : 400, color: r.d61_90 ? '#dc2626' : undefined }}>
                          {r.d61_90 ? formatFeeCurrency(r.d61_90) : '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 900,
                            color: r.d90_plus ? '#7f1d1d' : undefined,
                            background: r.d90_plus ? 'rgba(239, 68, 68, 0.08)' : undefined,
                          }}
                        >
                          {r.d90_plus ? formatFeeCurrency(r.d90_plus) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                          {formatFeeCurrency(r.total_due)}
                        </td>
                        <td>
                          <ModernBadge $variant={riskBadge.variant}>{riskBadge.text}</ModernBadge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800 }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>Total Overdue Sums ({filteredRows.length} Students):</td>
                  <td style={{ textAlign: 'right' }}>{formatFeeCurrency(filteredRows.reduce((s, r) => s + r.not_due, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#d97706' }}>{formatFeeCurrency(filteredRows.reduce((s, r) => s + r.d1_30, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#ea580c' }}>{formatFeeCurrency(filteredRows.reduce((s, r) => s + r.d31_60, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatFeeCurrency(filteredRows.reduce((s, r) => s + r.d61_90, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#b91c1c' }}>{formatFeeCurrency(filteredRows.reduce((s, r) => s + r.d90_plus, 0))}</td>
                  <td style={{ textAlign: 'right' }}>{formatFeeCurrency(filteredRows.reduce((s, r) => s + r.total_due, 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </ModernTable>
          ) : (
            <ModernTable>
              <thead>
                <tr>
                  <th>Family Head & Code</th>
                  <th>Linked Siblings</th>
                  <th>Contact Phone</th>
                  <th style={{ textAlign: 'right' }}>Current (Rs)</th>
                  <th style={{ textAlign: 'right' }}>1 – 30d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>31 – 60d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>61 – 90d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>90+d (Rs)</th>
                  <th style={{ textAlign: 'right' }}>Family Due (Rs)</th>
                  <th>Risk Tier</th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilyRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                      No overdue family accounts found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredFamilyRows.map((r) => {
                    const isCrit = r.d90_plus > 0;
                    const isHigh = r.d61_90 > 0;
                    const isMed = r.d31_60 > 0;
                    const isLow = r.d1_30 > 0;

                    const riskBadge = isCrit
                      ? { text: '90+d Critical', variant: 'danger' as const }
                      : isHigh
                      ? { text: '61-90d High', variant: 'danger' as const }
                      : isMed
                      ? { text: '31-60d Medium', variant: 'warning' as const }
                      : isLow
                      ? { text: '1-30d Early', variant: 'info' as const }
                      : { text: 'Current', variant: 'success' as const };

                    return (
                      <tr key={r.family_id}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{r.family_name}</div>
                          <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 800, fontFamily: 'monospace' }}>
                            FAM-{r.family_id} • {r.siblings_count} Sibling(s)
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#334155', maxWidth: '280px' }}>
                          {r.siblings_summary || '—'}
                        </td>
                        <td>
                          {r.contact_number ? (
                            <a
                              href={`tel:${r.contact_number}`}
                              style={{ color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Phone style={{ fontSize: '0.85rem' }} /> {r.contact_number}
                            </a>
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', opacity: r.not_due ? 1 : 0.4 }}>
                          {r.not_due ? formatFeeCurrency(r.not_due) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: r.d1_30 ? 700 : 400, color: r.d1_30 ? '#d97706' : undefined }}>
                          {r.d1_30 ? formatFeeCurrency(r.d1_30) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: r.d31_60 ? 700 : 400, color: r.d31_60 ? '#ea580c' : undefined }}>
                          {r.d31_60 ? formatFeeCurrency(r.d31_60) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: r.d61_90 ? 700 : 400, color: r.d61_90 ? '#dc2626' : undefined }}>
                          {r.d61_90 ? formatFeeCurrency(r.d61_90) : '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 900,
                            color: r.d90_plus ? '#7f1d1d' : undefined,
                            background: r.d90_plus ? 'rgba(239, 68, 68, 0.08)' : undefined,
                          }}
                        >
                          {r.d90_plus ? formatFeeCurrency(r.d90_plus) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                          {formatFeeCurrency(r.total_due)}
                        </td>
                        <td>
                          <ModernBadge $variant={riskBadge.variant}>{riskBadge.text}</ModernBadge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800 }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>Total Family Overdue Sums ({filteredFamilyRows.length} Families):</td>
                  <td style={{ textAlign: 'right' }}>{formatFeeCurrency(filteredFamilyRows.reduce((s, r) => s + r.not_due, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#d97706' }}>{formatFeeCurrency(filteredFamilyRows.reduce((s, r) => s + r.d1_30, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#ea580c' }}>{formatFeeCurrency(filteredFamilyRows.reduce((s, r) => s + r.d31_60, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatFeeCurrency(filteredFamilyRows.reduce((s, r) => s + r.d61_90, 0))}</td>
                  <td style={{ textAlign: 'right', color: '#b91c1c' }}>{formatFeeCurrency(filteredFamilyRows.reduce((s, r) => s + r.d90_plus, 0))}</td>
                  <td style={{ textAlign: 'right' }}>{formatFeeCurrency(filteredFamilyRows.reduce((s, r) => s + r.total_due, 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </ModernTable>
          )}
        </TableWrapper>
      </HubCard>
    </div>
  );
};
export default AgingTab;
