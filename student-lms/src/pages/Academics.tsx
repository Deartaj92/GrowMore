import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { useStudentData } from '../hooks/useStudentData';
import {
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { PageLoader } from '../components/GrowMoreLoader';
import './Academics.css';

export const Academics: React.FC = () => {
  const { student } = useAuth();
  const { selectedSession, activeSession } = useSession();
  const { getAcademicsData, loading } = useStudentData();

  const [academics, setAcademics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'exams' | 'tests'>('exams');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const loadData = useCallback(() => {
    if (!student || selectedSession === null) return;
    getAcademicsData(student.id, student.school_id, student.class_id, student.section_id, selectedSession)
      .then((data) => {
        if (data) setAcademics(data);
      });
  }, [student, selectedSession, getAcademicsData]);

  useEffect(() => {
    setAcademics(null);
    loadData();
  }, [loadData]);

  const testResults = academics?.testResults || [];
  const examSummaries = academics?.examSummaries || [];

  // Group class tests by subject
  const subjectTestGroups = useMemo(() => {
    if (!testResults) return [];
    const groupsMap = new Map<string, any[]>();

    testResults.forEach((tr: any) => {
      const subjectName = tr.test_records?.subject_name || 'General / Unassigned';
      if (!groupsMap.has(subjectName)) {
        groupsMap.set(subjectName, []);
      }
      groupsMap.get(subjectName)!.push(tr);
    });

    return Array.from(groupsMap.entries()).map(([subjectName, tests]) => {
      const totalTests = tests.length;
      const passedCount = tests.filter((t: any) => {
        const passing = t.test_records?.passing_marks || 0;
        return (t.obtained_marks || 0) >= passing;
      }).length;

      const totalPctSum = tests.reduce(
        (sum: number, t: any) => sum + (parseFloat(t.percentage) || 0),
        0
      );
      const avgPercentage = totalTests > 0 ? Math.round(totalPctSum / totalTests) : 0;

      return {
        subjectName,
        tests,
        totalTests,
        passedCount,
        avgPercentage,
      };
    });
  }, [testResults]);

  const toggleSubject = (subjectName: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectName]: prev[subjectName] === undefined ? false : !prev[subjectName],
    }));
  };

  if (!student || selectedSession === null) {
    return <PageLoader message="Loading sessions…" />;
  }

  if (loading || !academics) {
    return <PageLoader message="Loading academics…" />;
  }

  const sessionName = activeSession?.name || '';

  return (
    <div className="academics-page">

      {/* Tab Navigation */}
      <div className="academics-tabs-header glass-panel">
        <button
          type="button"
          className={`tab-toggle ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          <Award size={18} strokeWidth={2} />
          <span>Examination Results</span>
        </button>
        <button
          type="button"
          className={`tab-toggle ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          <BookOpen size={18} strokeWidth={2} />
          <span>Class Tests ({testResults.length})</span>
        </button>
      </div>

      {/* ── Tab Contents ── */}
      <div className="academics-tab-content">

        {/* Term Exams */}
        {activeTab === 'exams' && (
          <div className="exams-tab">
            {examSummaries.length === 0 ? (
              <div className="empty-results-box glass-panel">
                <AlertCircle size={36} />
                <p>No examination results for <strong>{sessionName}</strong>.</p>
              </div>
            ) : (
              <div className="exam-cards-grid">
                {examSummaries.map((ex: any) => {
                  const isPass = ex.status?.toLowerCase() === 'pass';
                  const pct = Math.min(100, Math.max(0, parseFloat(ex.percentage) || 0));
                  const isSubjectPass = (s: any) =>
                    s.status ? s.status.toLowerCase() === 'pass' : (parseFloat(s.percentage) || 0) >= 33;
                  const passedSubjectsCount = (ex.subjects || []).filter(isSubjectPass).length;
                  const totalSubjectsCount = ex.subjects?.length || 0;

                  const r = 38;
                  const circ = 2 * Math.PI * r;
                  const offset = circ - (pct / 100) * circ;
                  const ringColor = pct >= 70 ? '#10b981' : pct >= 45 ? '#f59e0b' : '#ef4444';

                  return (
                    <div key={ex.examination_id} className={`exam-vcard ${isPass ? 'pass' : 'fail'}`}>

                      {/* Header */}
                      <div className="evc-header">
                        <div className="evc-title-col">
                          <span className="evc-type">{ex.examinations?.exam_type || 'Term Exam'}</span>
                          <h4 className="evc-name">{ex.examinations?.name || 'Examination'}</h4>
                        </div>
                        <span className={`evc-status ${isPass ? 'pass' : 'fail'}`}>
                          {isPass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {ex.status || 'N/A'}
                        </span>
                      </div>

                      {/* Score Ring + Stats */}
                      <div className="evc-score-row">
                        <div className="evc-ring-wrap">
                          <svg width="96" height="96" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                            <circle
                              cx="48" cy="48" r={r}
                              fill="none"
                              stroke={ringColor}
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={circ}
                              strokeDashoffset={offset}
                              transform="rotate(-90 48 48)"
                              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                            />
                          </svg>
                          <div className="evc-ring-center">
                            <span className="evc-ring-pct" style={{ color: ringColor }}>{pct.toFixed(0)}%</span>
                            <span className="evc-ring-label">Score</span>
                          </div>
                        </div>

                        <div className="evc-stats-col">
                          <div className="evc-stat">
                            <span className="evc-stat-label">Obtained</span>
                            <span className="evc-stat-val green">{ex.obtained_marks ?? '—'}</span>
                          </div>
                          <div className="evc-stat">
                            <span className="evc-stat-label">Total Marks</span>
                            <span className="evc-stat-val">{ex.total_marks ?? '—'}</span>
                          </div>
                          <div className="evc-stat">
                            <span className="evc-stat-label">Grade</span>
                            <span className="evc-stat-val purple">{ex.grade || '—'}</span>
                          </div>
                          {totalSubjectsCount > 0 && (
                            <div className="evc-stat">
                              <span className="evc-stat-label">Subjects</span>
                              <span className="evc-stat-val">{passedSubjectsCount}<span className="evc-stat-muted">/{totalSubjectsCount} Pass</span></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Position */}
                      {ex.position && (
                        <div className="evc-rank-row">
                          <div className="evc-rank-pill gold">
                            <Trophy size={12} />
                            <span>#{ex.position} Position</span>
                          </div>
                        </div>
                      )}

                      {/* Subject Marks */}
                      <div className="evc-subjects">
                        <div className="evc-subjects-hdr">
                          <span className="evc-subjects-title">Subject Marks</span>
                          {totalSubjectsCount > 0 && (
                            <span className="evc-sub-pill">{passedSubjectsCount}/{totalSubjectsCount} Passed</span>
                          )}
                        </div>

                        {totalSubjectsCount === 0 ? (
                          <div className="evc-no-subjects">
                            <AlertCircle size={15} />
                            <span>Subject marks not published yet.</span>
                          </div>
                        ) : (
                          <div className="evc-subject-rows">
                            {ex.subjects.map((sub: any) => {
                              const subPct = Math.min(100, Math.max(0, parseFloat(sub.percentage) || 0));
                              const subPass = sub.status
                                ? sub.status.toLowerCase() === 'pass'
                                : subPct >= 33;
                              const barColor = subPct >= 70 ? '#10b981' : subPct >= 45 ? '#f59e0b' : '#ef4444';

                              return (
                                <div key={sub.id} className="evc-subject-row">
                                  <div className="evc-sub-info">
                                    <span className="evc-sub-name">{sub.name}</span>
                                    <div className="evc-sub-bar-wrap">
                                      <div className="evc-sub-bar-track">
                                        <div
                                          className="evc-sub-bar-fill"
                                          style={{ width: `${subPct}%`, background: barColor }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="evc-sub-right">
                                    <span className="evc-sub-marks">
                                      <strong>{sub.obtained_marks ?? '—'}</strong>
                                      <span className="evc-sub-sep">/{sub.max_marks ?? '—'}</span>
                                    </span>
                                    <span className="evc-sub-grade">{sub.grade || '—'}</span>
                                    <span className={`evc-sub-status ${subPass ? 'pass' : 'fail'}`}>
                                      {subPass ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Subject-Wise Class Tests */}
        {activeTab === 'tests' && (
          <div className="tests-tab">
            <div className="tab-section-header glass-panel">
              <div>
                <h3>Class Test Results</h3>
                <p>Subject-wise tests and evaluations for <strong>{sessionName}</strong>.</p>
              </div>
              {subjectTestGroups.length > 0 && (
                <div className="tests-summary-badge">
                  {testResults.length} Total Test{testResults.length === 1 ? '' : 's'} · {subjectTestGroups.length} Subject{subjectTestGroups.length === 1 ? '' : 's'}
                </div>
              )}
            </div>

            {subjectTestGroups.length === 0 ? (
              <div className="empty-results-box glass-panel">
                <AlertCircle size={36} />
                <p>No class test results for <strong>{sessionName}</strong>.</p>
              </div>
            ) : (
              <div className="subject-test-groups-list">
                {subjectTestGroups.map((group) => {
                  const isExpanded = expandedSubjects[group.subjectName] !== false; // default open
                  const isAllPass = group.passedCount === group.totalTests;

                  return (
                    <div key={group.subjectName} className={`subject-test-card glass-panel ${isExpanded ? 'expanded' : ''}`}>
                      
                      {/* Subject Card Header */}
                      <button
                        type="button"
                        className="stc-header"
                        onClick={() => toggleSubject(group.subjectName)}
                        aria-expanded={isExpanded}
                      >
                        <div className="stc-title-group">
                          <div className="stc-icon-badge">
                            <BookOpen size={18} />
                          </div>
                          <div className="stc-title-text-col">
                            <h4 className="stc-subject-name">{group.subjectName}</h4>
                            <span className="stc-sub-info">
                              {group.totalTests} Test{group.totalTests === 1 ? '' : 's'} · {group.passedCount}/{group.totalTests} Passed
                            </span>
                          </div>
                        </div>

                        <div className="stc-right-group">
                          <div className="stc-avg-chip">
                            <span className="stc-chip-label">Avg Score</span>
                            <span className={`stc-chip-val ${group.avgPercentage >= 70 ? 'high' : group.avgPercentage >= 45 ? 'mid' : 'low'}`}>
                              {group.avgPercentage}%
                            </span>
                          </div>

                          <span className={`stc-pass-tag ${isAllPass ? 'pass' : 'warn'}`}>
                            {isAllPass ? 'All Passed' : `${group.totalTests - group.passedCount} Failed`}
                          </span>

                          <div className="stc-expand-icon">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </button>

                      {/* Subject Tests Table */}
                      {isExpanded && (
                        <div className="stc-content">
                          <div className="academics-table-wrapper">
                            <table className="academics-table">
                              <thead>
                                <tr>
                                  <th>Test Name</th>
                                  <th>Date</th>
                                  <th>Passing Marks</th>
                                  <th>Obtained / Max</th>
                                  <th>Percentage</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.tests.map((tr: any) => {
                                  const passing = tr.test_records?.passing_marks || 0;
                                  const isPassed = (tr.obtained_marks || 0) >= passing;

                                  return (
                                    <tr key={tr.id}>
                                      <td>
                                        <div className="stc-test-name-cell">
                                          <FileText size={14} className="test-cell-icon" />
                                          <strong>{tr.test_records?.name || 'Class Test'}</strong>
                                        </div>
                                      </td>
                                      <td>{tr.test_records?.test_date ? new Date(tr.test_records.test_date).toLocaleDateString() : '—'}</td>
                                      <td>{passing}</td>
                                      <td><strong>{tr.obtained_marks} / {tr.max_marks}</strong></td>
                                      <td>
                                        <div className="stc-pct-bar-cell">
                                          <span className="stc-pct-val">{tr.percentage}%</span>
                                          <div className="stc-pct-track">
                                            <div
                                              className="stc-pct-fill"
                                              style={{
                                                width: `${Math.min(100, Math.max(0, tr.percentage))}%`,
                                                background: tr.percentage >= 70 ? '#10b981' : tr.percentage >= 45 ? '#f59e0b' : '#ef4444',
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                      <td>
                                        <span className={`status-pill ${isPassed ? 'paid' : 'unpaid'}`}>
                                          {isPassed ? (
                                            <CheckCircle2 size={11} style={{ marginRight: 3 }} />
                                          ) : (
                                            <XCircle size={11} style={{ marginRight: 3 }} />
                                          )}
                                          {isPassed ? 'Passed' : 'Failed'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Academics;
