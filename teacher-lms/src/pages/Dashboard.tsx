import React from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { useTeacherData } from '../hooks/useTeacherData';
import {
  Calendar,
  Users,
  Clock,
  BookOpenCheck,
  Award,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CalendarCheck,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { TimetableTimeline } from '../components/TimetableTimeline';
import { QuickActions } from '../components/QuickActions';
import { RecentHomeworkWidget } from '../components/RecentHomeworkWidget';
import { AnnouncementsWidget } from '../components/AnnouncementsWidget';
import { TeacherLoader } from '../components/TeacherLoader';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const { loading, stats, classes, todayPeriods, homeworkList, announcements } =
    useTeacherData(teacher);
  const navigate = useNavigate();

  const [publishedExam, setPublishedExam] = React.useState<{ id: number; name: string } | null>(null);

  React.useEffect(() => {
    const fetchPublishedExam = async () => {
      if (!teacher) return;
      try {
        const schoolId = teacher.school_id || 2;
        const { data } = await supabase
          .from('examinations')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('status', 'published')
          .limit(1)
          .maybeSingle();

        setPublishedExam(data);
      } catch (e) {
        console.error('Error fetching published exam for dashboard:', e);
      }
    };
    fetchPublishedExam();
  }, [teacher]);

  if (loading) {
    return <TeacherLoader message="Loading Faculty Dashboard…" fullScreen={false} />;
  }

  // Determine greeting based on current hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const classTeacherSections = classes.filter((c) => c.is_class_teacher);

  // Compute active or upcoming period for executive context
  const nextPeriod = todayPeriods.find((p) => p.is_current) || todayPeriods.find((p) => !p.is_completed) || todayPeriods[0];

  return (
    <div className="teacher-dashboard-page">
      {/* EXECUTIVE WELCOME BRIEFING */}
      <section className="dashboard-hero-banner glass-panel">
        <div className="hero-banner-main">
          <div className="hero-badge-row">
            <span className="badge badge-emerald">
              <Sparkles size={12} /> Session {stats.active_session_name}
            </span>
            {teacher?.employee_id && (
              <span className="badge badge-neutral">
                EMP ID: {teacher.employee_id}
              </span>
            )}
            <span className="badge badge-indigo">
              <GraduationCap size={12} /> {teacher?.designation || 'Faculty'}
            </span>
          </div>

          <h2 className="hero-greeting">
            {greeting}, {teacher?.name || 'Faculty Member'}
          </h2>

          <div className="hero-context-line">
            {nextPeriod ? (
              <span>
                Today's Schedule: <strong>{stats.classes_today_count} periods</strong> · Next lecture:{' '}
                <strong>{nextPeriod.subject_name}</strong> for <strong>{nextPeriod.class_name}</strong> at{' '}
                <strong>{nextPeriod.start_time}</strong> (Room {nextPeriod.room_number || 'Main'})
              </span>
            ) : (
              <span>
                Today's Schedule: <strong>{stats.classes_today_count} periods</strong> assigned across{' '}
                <strong>{classes.length} classes</strong>.
              </span>
            )}
          </div>

          {classTeacherSections.length > 0 && (
            <div className="hero-tags-row">
              <div className="hero-tag-item highlight">
                <ShieldCheck size={14} />
                <span>
                  Class In-Charge: {classTeacherSections.map((s) => `${s.class_name} (${s.section_name})`).join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="hero-banner-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/attendance')}
          >
            <CalendarCheck size={16} /> Mark Attendance
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/homework')}
          >
            <BookOpenCheck size={16} /> Post Diary
          </button>
        </div>
      </section>

      {/* PUBLISHED EXAM ALERT BANNER */}
      {publishedExam && (
        <section
          className="dashboard-exam-alert glass-panel no-print"
          style={{
            padding: '1.1rem 1.4rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                  }}
                >
                  Published Exam Active
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Marks entry open for linked subjects
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {publishedExam.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/exams')}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Award size={16} /> Enter Exam Marks
          </button>
        </section>
      )}

      {/* STAT CARDS ROW */}
      <section className="dashboard-stats-grid" aria-label="Key Performance Indicators">
        <StatCard
          label="Today's Classes"
          value={stats.classes_today_count}
          subtext="Scheduled across 3 rooms"
          icon={Clock}
          variant="indigo"
          trend={{ value: 'Active Schedule', isPositive: true }}
        />

        <StatCard
          label="Total Students"
          value={stats.total_students}
          subtext={`Enrolled across ${classes.length} assigned sections`}
          icon={Users}
          variant="cyan"
          trend={{ value: '+4 New', isPositive: true }}
        />

        <StatCard
          label="Attendance Compliance"
          value={`${stats.attendance_compliance_rate}%`}
          subtext="Monthly section average"
          icon={CalendarCheck}
          variant="emerald"
          trend={{ value: 'Above Target', isPositive: true }}
        />

        <StatCard
          label="Pending Homework"
          value={stats.homework_pending_review}
          subtext="Awaiting verification & grading"
          icon={BookOpenCheck}
          variant="amber"
          trend={{ value: 'Review Needed', isPositive: false }}
        />

        <StatCard
          label="Teacher Rating"
          value={`${stats.performance_score}/10`}
          subtext="Score based on attendance & diaries"
          icon={Award}
          variant="rose"
          trend={{ value: 'Outstanding', isPositive: true }}
        />
      </section>

      {/* TWO COLUMN WORKSPACE GRID */}
      <div className="dashboard-workspace-grid">
        {/* LEFT COLUMN: TIMETABLE & ACTION HUB & HOMEWORK */}
        <div className="workspace-main-column">
          {/* Today's Schedule Timeline */}
          <TimetableTimeline periods={todayPeriods} />

          {/* Quick Actions Hub */}
          <QuickActions />

          {/* Recent Homework Diary Widget */}
          <RecentHomeworkWidget homework={homeworkList} />
        </div>

        {/* RIGHT COLUMN: TEACHER PROFILE CHIP & ATTENDANCE PULSE & NOTICE BOARD */}
        <div className="workspace-side-column">
          {/* Assigned Classes Roster Card */}
          <div className="assigned-classes-card glass-panel">
            <div className="side-card-header">
              <div className="side-card-title-group">
                <div className="side-card-icon-badge">
                  <Users size={17} />
                </div>
                <div>
                  <h4 className="side-card-title">Assigned Classes</h4>
                  <p className="side-card-subtitle">Your active sections & student rosters</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/classes')}
              >
                All <ArrowRight size={13} />
              </button>
            </div>

            <div className="assigned-classes-list">
              {classes.length === 0 ? (
                <div
                  style={{
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px dashed var(--border-medium)',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  No class assignments registered for this session.
                </div>
              ) : (
                classes.map((cls) => (
                  <div key={cls.id} className="assigned-class-item">
                    <div className="assigned-class-header">
                      <span className="class-title-badge">
                        {cls.class_name} · {cls.section_name}
                      </span>
                      {cls.is_class_teacher && (
                        <span className="badge badge-emerald">Class Teacher</span>
                      )}
                    </div>
                    <div className="assigned-class-subject">{cls.subject_name}</div>
                    <div className="assigned-class-footer">
                      <span className="student-count-pill">
                        <Users size={12} /> {cls.total_students || 35} Students
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate('/attendance')}
                        >
                          Attendance
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate('/homework')}
                        >
                          Diary
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Faculty Notice Board */}
          <AnnouncementsWidget announcements={announcements} />

          {/* Daily Attendance Compliance Pulse */}
          <div className="attendance-pulse-card glass-panel">
            <div className="side-card-header">
              <div className="side-card-title-group">
                <div className="side-card-icon-badge emerald">
                  <CheckCircle size={17} />
                </div>
                <div>
                  <h4 className="side-card-title">Attendance Compliance</h4>
                  <p className="side-card-subtitle">Daily section verification status</p>
                </div>
              </div>
            </div>

            <div className="compliance-pulse-body">
              <div className="pulse-metric-row">
                <div className="pulse-metric-block">
                  <span className="pulse-val text-emerald">100%</span>
                  <span className="pulse-lbl">Punctuality</span>
                </div>
                <div className="pulse-metric-block">
                  <span className="pulse-val text-indigo">4 / 4</span>
                  <span className="pulse-lbl">Logs Submitted</span>
                </div>
              </div>
              <p className="compliance-note">
                Attendance marked in the first 15 minutes of each period triggers SMS and parent app alerts automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
