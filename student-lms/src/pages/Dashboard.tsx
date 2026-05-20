import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  Bell,
  BookOpen,
  UserCheck,
  Clock,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { StatBlock } from '../components/StatBlock';
import { PageLoader } from '../components/GrowMoreLoader';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { student } = useAuth();
  const { getDashboardData, getAttendanceData, loading } = useStudentData();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [attPercentage, setAttPercentage] = useState<number | null>(null);

  useEffect(() => {
    if (student) {
      // Fetch main dashboard data
      getDashboardData(student.id, student.school_id, student.class_id, student.section_id)
        .then((data: any) => {
          if (data) setDashboardData(data);
        });

      // Fetch attendance percentage
      getAttendanceData(student.id, student.school_id, null)
        .then((data: any) => {
          if (data && data.stats) {
            setAttPercentage(data.stats.percentage);
          }
        });
    }
  }, [student, getDashboardData, getAttendanceData]);

  if (loading || !student || !dashboardData) {
    return (
      <PageLoader message="Loading your dashboard…" />
    );
  }

  const { todayAttendance, todayHalfLeave, unpaidChallansCount, announcements, homework } = dashboardData;

  const getAttendanceStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present': return <span className="status-badge present">Present</span>;
      case 'absent': return <span className="status-badge absent">Absent</span>;
      case 'late': return <span className="status-badge late">Late</span>;
      case 'leave': return <span className="status-badge leave">On Leave</span>;
      default: return <span className="status-badge unmarked">Not Marked Yet</span>;
    }
  };

  return (
    <div className="dashboard-page">
      {/* Welcome Banner */}
      <div className="welcome-banner glass-panel">
        <div className="welcome-main">
          <h2>Welcome back, {student.name}</h2>
          <p>Here is an overview of your academic activities, attendance records, and pending fee challans.</p>
        </div>
        <div className="welcome-meta">
          <span className="session-tag">Session {dashboardData.activeSession?.name || '—'}</span>
          <span className="welcome-date">
            <Calendar size={14} strokeWidth={2} aria-hidden />
            <span className="welcome-date-text">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </span>
        </div>
      </div>

      <div className="stat-blocks">
        <StatBlock
          variant="blue"
          icon={UserCheck}
          value={attPercentage !== null ? `${attPercentage}%` : '—'}
          label="Attendance"
          to="/attendance"
        />
        <StatBlock
          variant="red"
          icon={CreditCard}
          value={unpaidChallansCount}
          label="Unpaid challans"
          to="/fees"
        />
        <StatBlock
          variant="teal"
          icon={Bell}
          value={announcements.length}
          label="Announcements"
          href="#noticeboard"
        />
        <StatBlock
          variant="purple"
          icon={BookOpen}
          value={homework.length}
          label="Assignments"
          href="#homework"
        />
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-grid">
        {/* Left Column: Notices and Homework */}
        <div className="dashboard-column-left">
          
          {/* Announcements Widget */}
          <section id="noticeboard" className="dashboard-section glass-panel">
            <div className="section-header">
              <Bell size={20} className="section-icon secondary-color" />
              <h3>Notice Board & Announcements</h3>
            </div>
            <div className="section-body announcements-list">
              {announcements.length === 0 ? (
                <div className="empty-state">
                  <AlertCircle size={36} className="text-muted" />
                  <p>No active announcements for your class.</p>
                </div>
              ) : (
                announcements.map((ann: any) => (
                  <div key={ann.id} className="announcement-card">
                    <div className="announcement-header">
                      <h4>{ann.title}</h4>
                      <span className="announcement-date">{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="announcement-content">{ann.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Homework Diary Widget */}
          <section id="homework" className="dashboard-section glass-panel">
            <div className="section-header">
              <BookOpen size={20} className="section-icon primary-color" />
              <h3>Homework Diary</h3>
            </div>
            <div className="section-body homework-list">
              {homework.length === 0 ? (
                <div className="empty-state">
                  <AlertCircle size={36} className="text-muted" />
                  <p>No homework assignments posted recently.</p>
                </div>
              ) : (
                homework.map((hw: any) => (
                  <div key={hw.id} className="homework-card">
                    <div className="homework-meta">
                      <span className="homework-subject">{hw.subject}</span>
                      <span className="homework-date">{new Date(hw.date).toLocaleDateString()}</span>
                    </div>
                    <p className="homework-text">{hw.text}</p>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Attendance widget and Quick links */}
        <div className="dashboard-column-right">

          {/* Today's Status Widget */}
          <section className="dashboard-section status-widget glass-panel">
            <div className="section-header">
              <Clock size={20} className="section-icon" />
              <h3>Today's Attendance Status</h3>
            </div>
            <div className="section-body status-container">
              <div className="status-display">
                {getAttendanceStatusBadge(todayAttendance?.status)}
              </div>
              
              {todayAttendance && (
                <div className="attendance-details">
                  {todayAttendance.remarks && (
                    <div className="detail-item">
                      <span className="detail-label">Remarks:</span>
                      <span className="detail-val">{todayAttendance.remarks}</span>
                    </div>
                  )}
                </div>
              )}

              {todayHalfLeave && (
                <div className="half-leave-alert danger-accent">
                  <div className="alert-header">
                    <strong>Half-Leave / Late-In Recorded</strong>
                  </div>
                  <div className="alert-details">
                    <div>Type: {todayHalfLeave.leave_type}</div>
                    {todayHalfLeave.arrival_time && <div>Arrival: {todayHalfLeave.arrival_time}</div>}
                    {todayHalfLeave.departure_time && <div>Departure: {todayHalfLeave.departure_time}</div>}
                  </div>
                </div>
              )}

              {!todayAttendance && !todayHalfLeave && (
                <p className="status-note">Attendance is marked automatically when you scan your card or are checked in by your teacher.</p>
              )}
            </div>
          </section>

          {/* Quick Shortcuts */}
          <section className="dashboard-section glass-panel">
            <div className="section-header">
              <BookOpen size={20} className="section-icon" />
              <h3>Quick Shortcuts</h3>
            </div>
            <div className="section-body shortcuts-list">
              <Link to="/academics" className="shortcut-item">
                <span className="shortcut-title">Timetable & Subjects</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/academics" className="shortcut-item">
                <span className="shortcut-title">Class Test Marks</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/fees" className="shortcut-item">
                <span className="shortcut-title">Download Fee Invoice</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/feedback" className="shortcut-item">
                <span className="shortcut-title">File Suggestion/Complaint</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
