import React, { useState, useEffect } from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { supabase } from '../services/supabase';
import {
  CalendarRange,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Search,
  Filter,
} from 'lucide-react';
import { TeacherLoader } from '../components/TeacherLoader';
import { StudentAvatar, sanitizeAvatarUrl } from '../components/StudentAvatar';
import './Leave.css';

interface LeaveRequestItem {
  id: number;
  student_id?: number | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  requested_by_name?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string | null;
  created_at: string;
  student_picture_url?: string | null;
  student_gender?: string | null;
  student_roll_number?: string | null;
}

export const Leave: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!teacher) return;
      try {
        setLoading(true);
        const schoolId = teacher.school_id || 2;
        const { data, error } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const rawRequests = data || [];
        const studentIds = Array.from(
          new Set(
            rawRequests
              .map((r: any) => r.student_id || (r.requested_by === 'student' ? r.requested_by_id : null))
              .filter(Boolean)
          )
        );

        let studentMap = new Map<number, any>();
        if (studentIds.length > 0) {
          const { data: stData } = await supabase
            .from('students')
            .select('id, name, picture_url, gender, roll_number')
            .in('id', studentIds);

          if (stData) {
            stData.forEach((st: any) => studentMap.set(st.id, st));
          }
        }

        const enriched: LeaveRequestItem[] = rawRequests.map((r: any) => {
          const sId = r.student_id || (r.requested_by === 'student' ? r.requested_by_id : null);
          const studentProfile = sId ? studentMap.get(sId) : null;

          return {
            ...r,
            requested_by_name: r.requested_by_name || studentProfile?.name || 'Student Applicant',
            student_picture_url: sanitizeAvatarUrl(studentProfile?.picture_url),
            student_gender: studentProfile?.gender || null,
            student_roll_number: studentProfile?.roll_number || null,
          };
        });

        setRequests(enriched);
      } catch (err) {
        console.error('Failed to fetch leave requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [teacher]);

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      !search ||
      (r.requested_by_name && r.requested_by_name.toLowerCase().includes(search.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <TeacherLoader message="Loading leave applications…" />;
  }

  return (
    <div className="leave-module-page">
      {/* 1. CONTROL STRIP */}
      <div className="module-control-strip">
        <div className="module-strip-context">
          <span className="module-context-chip">
            <CalendarRange size={14} className="text-indigo" />
            <span>Leave Applications Register</span>
          </span>
          <span className="badge badge-emerald">
            {requests.length} Total Applications
          </span>
        </div>

        <div className="module-actions-row">
          <nav className="module-tabs-nav" aria-label="Status filters">
            <button
              type="button"
              className={`module-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({requests.length})
            </button>
            <button
              type="button"
              className={`module-tab-btn ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </button>
            <button
              type="button"
              className={`module-tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
          </nav>

          <div className="search-wrapper" style={{ minWidth: '220px' }}>
            <Search size={14} className="search-lens" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search by student or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. LEAVE REQUESTS LIST */}
      <div className="leave-requests-list">
        {filteredRequests.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
            }}
          >
            <CalendarRange size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
              No Leave Applications Found
            </h3>
            <p style={{ fontSize: '0.86rem', margin: 0 }}>
              There are currently no leave requests matching this filter criteria.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req.id} className="leave-card">
              <div className="leave-card-header">
                <div className="leave-requester-info" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <StudentAvatar
                    src={req.student_picture_url}
                    name={req.requested_by_name || 'Student Applicant'}
                    gender={req.student_gender}
                    size={38}
                    showGenderDot={true}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <h3 className="leave-requester-name" style={{ margin: 0 }}>
                        {req.requested_by_name || 'Student Applicant'}
                      </h3>
                      {req.student_roll_number && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                          {req.student_roll_number}
                        </span>
                      )}
                    </div>
                    <span className="badge badge-indigo" style={{ textTransform: 'capitalize', marginTop: '0.25rem', display: 'inline-block' }}>
                      {req.leave_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="leave-period-badge">
                    <Clock size={12} />
                    {req.start_date} → {req.end_date}
                  </span>

                  {req.status === 'approved' && (
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={12} /> Approved
                    </span>
                  )}
                  {req.status === 'pending' && (
                    <span className="badge badge-amber">
                      <Clock size={12} /> Pending Review
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="badge badge-rose">
                      <XCircle size={12} /> Rejected
                    </span>
                  )}
                </div>
              </div>

              <p className="leave-reason-text">"{req.reason}"</p>

              <div className="leave-card-footer">
                <span>
                  Submitted: {new Date(req.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {req.review_notes && (
                  <span style={{ fontWeight: 600, color: 'var(--emerald-500)' }}>
                    Remarks: {req.review_notes}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
