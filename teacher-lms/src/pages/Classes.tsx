import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { supabase } from '../services/supabase';
import {
  Users,
  CalendarCheck,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  X,
} from 'lucide-react';
import { TeacherLoader } from '../components/TeacherLoader';
import { StudentAvatar, sanitizeAvatarUrl } from '../components/StudentAvatar';
import './Classes.css';

interface SectionCardItem {
  id: number;
  name: string;
  class_id: number;
  class_name: string;
  is_class_teacher: boolean;
  student_count: number;
}

export const Classes: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<SectionCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rosterSection, setRosterSection] = useState<SectionCardItem | null>(null);
  const [rosterStudents, setRosterStudents] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  const openRoster = async (sec: SectionCardItem) => {
    setRosterSection(sec);
    setLoadingRoster(true);
    setRosterSearch('');
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, roll_number, father_name, picture_url, gender, status')
        .eq('section_id', sec.id)
        .order('id');

      if (error) throw error;

      const activeList = (data || []).filter(
        (st: any) => !st.status || st.status.toLowerCase() === 'active'
      );
      const studentRoster = activeList.length > 0 ? activeList : (data || []);

      studentRoster.sort((a: any, b: any) => {
        if (a.roll_number && b.roll_number) {
          return a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
        }
        if (a.roll_number) return -1;
        if (b.roll_number) return 1;
        return a.id - b.id;
      });

      setRosterStudents(
        studentRoster.map((s: any) => ({
          ...s,
          picture_url: sanitizeAvatarUrl(s.picture_url),
        }))
      );
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    const fetchSections = async () => {
      if (!teacher) return;
      try {
        setLoading(true);
        const schoolId = teacher.school_id || 2;
        const teacherId = teacher.id;

        // Fetch sections with class info
        const { data: secsData, error } = await supabase
          .from('sections')
          .select(`
            id,
            name,
            class_id,
            teacher_id,
            classes:class_id(id, name)
          `)
          .eq('school_id', schoolId)
          .order('class_id');

        if (error) throw error;

        // Fetch student counts per section
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, section_id')
          .eq('school_id', schoolId)
          .eq('status', 'active');

        const countsMap = new Map<number, number>();
        if (studentsData) {
          studentsData.forEach((st: any) => {
            countsMap.set(st.section_id, (countsMap.get(st.section_id) || 0) + 1);
          });
        }

        const mapped: SectionCardItem[] = (secsData || []).map((sec: any) => ({
          id: sec.id,
          name: sec.name,
          class_id: sec.class_id,
          class_name: sec.classes?.name || `Class ${sec.class_id}`,
          is_class_teacher: sec.teacher_id === teacherId,
          student_count: countsMap.get(sec.id) || 0,
        }));

        setSections(mapped);
      } catch (err) {
        console.error('Failed to fetch class sections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [teacher]);

  const filteredSections = sections.filter((s) => {
    return (
      !search ||
      s.class_name.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading) {
    return <TeacherLoader message="Loading class directories & sections…" />;
  }

  return (
    <div className="classes-module-page">
      {/* 1. CONTROL STRIP */}
      <div className="module-control-strip">
        <div className="module-strip-context">
          <span className="module-context-chip">
            <Users size={14} className="text-emerald" />
            <span>Class Roster Directory</span>
          </span>
          <span className="badge badge-emerald">
            {sections.length} Sections Available
          </span>
        </div>

        <div className="search-wrapper" style={{ minWidth: '240px' }}>
          <Search size={14} className="search-lens" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Search class or section…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 2. CLASSES GRID */}
      <div className="classes-grid">
        {filteredSections.map((sec) => (
          <div
            key={sec.id}
            className={`class-card ${sec.is_class_teacher ? 'in-charge' : ''}`}
          >
            <div className="class-card-header">
              <div className="class-card-title-group">
                <h3 className="class-card-name">
                  {sec.class_name} · Sec {sec.name}
                </h3>
                <span className="class-card-subtitle">
                  Academic Section {sec.name}
                </span>
              </div>

              {sec.is_class_teacher && (
                <span className="badge badge-emerald" title="Assigned Class In-Charge">
                  <ShieldCheck size={12} /> In-Charge
                </span>
              )}
            </div>

            <div className="class-card-stats">
              <div
                className="class-stat-item"
                onClick={() => openRoster(sec)}
                style={{ cursor: 'pointer' }}
                title="Click to view enrolled student pictures and roster"
              >
                <span className="class-stat-label">Enrolled Students</span>
                <span className="class-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {sec.student_count}
                  <span style={{ fontSize: '0.72rem', color: 'var(--indigo-400)', fontWeight: 600 }}>Roster →</span>
                </span>
              </div>
              <div className="class-stat-item">
                <span className="class-stat-label">Academic Status</span>
                <span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>Active</span>
              </div>
            </div>

            <div className="class-card-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm flex-1"
                onClick={() => navigate('/attendance')}
              >
                <CalendarCheck size={14} /> Attendance
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openRoster(sec)}
                title="View student pictures and details"
              >
                <Users size={14} /> Students
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/timetable')}
                title="View schedule"
              >
                <Clock size={14} /> Schedule
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. ROSTER MODAL WITH STUDENT PICTURES */}
      {rosterSection && (
        <div className="roster-modal-backdrop" onClick={() => setRosterSection(null)}>
          <div className="roster-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="roster-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {rosterSection.class_name} · Section {rosterSection.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Enrolled Students Directory ({rosterStudents.length} Students)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRosterSection(null)}
                style={{ padding: '4px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roster-modal-search">
              <div className="search-wrapper">
                <Search size={14} className="search-lens" />
                <input
                  type="text"
                  className="toolbar-search-input"
                  placeholder="Filter by student name or roll number…"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="roster-modal-body">
              {loadingRoster ? (
                <TeacherLoader message="Loading student directory…" fullScreen={false} />
              ) : rosterStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No active students enrolled in this section.
                </div>
              ) : (
                <div className="roster-grid">
                  {rosterStudents
                    .filter((st) => {
                      if (!rosterSearch) return true;
                      const q = rosterSearch.toLowerCase();
                      return (
                        st.name?.toLowerCase().includes(q) ||
                        st.roll_number?.toLowerCase().includes(q) ||
                        st.father_name?.toLowerCase().includes(q)
                      );
                    })
                    .map((student, idx) => (
                      <div key={student.id} className="roster-student-card">
                        <StudentAvatar
                          src={student.picture_url}
                          name={student.name}
                          gender={student.gender}
                          size={40}
                          showGenderDot={true}
                        />
                        <div className="roster-student-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span className="roster-student-name">{student.name}</span>
                            {student.roll_number && (
                              <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                                #{student.roll_number}
                              </span>
                            )}
                          </div>
                          <span className="roster-student-meta">
                            {student.father_name ? `S/O ${student.father_name}` : `ID: ${student.id}`}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
