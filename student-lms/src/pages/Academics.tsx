import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import {
  Calendar,
  BookOpen,
  Award,
  AlertCircle
} from 'lucide-react';
import { PageLoader } from '../components/GrowMoreLoader';
import './Academics.css';

export const Academics: React.FC = () => {
  const { student } = useAuth();
  const { getAcademicsData, loading } = useStudentData();
  const [academics, setAcademics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'tests' | 'exams'>('schedule');

  useEffect(() => {
    if (student) {
      getAcademicsData(student.id, student.school_id, student.class_id, student.section_id)
        .then((data) => {
          if (data) setAcademics(data);
        });
    }
  }, [student, getAcademicsData]);

  if (loading || !student || !academics) {
    return (
      <PageLoader message="Loading academics…" />
    );
  }

  const { subjects, timetable, testResults, examSummaries } = academics;

  // Timetable formatting helper (group by day)
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const formattedTimetable = daysOfWeek.map(day => {
    const slots = timetable.filter((item: any) => item.day_of_week?.toLowerCase() === day.toLowerCase());
    // Sort slots by period number or start time if available
    slots.sort((a: any, b: any) => (a.period_number || 0) - (b.period_number || 0));
    return { day, slots };
  });

  return (
    <div className="academics-page">
      {/* Academics Tabs */}
      <div className="academics-tabs-header glass-panel">
        <button
          type="button"
          className={`tab-toggle ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
          aria-label="Class Schedule"
          aria-pressed={activeTab === 'schedule'}
        >
          <Calendar size={18} strokeWidth={2} aria-hidden />
          <span>Schedule</span>
        </button>

        <button
          type="button"
          className={`tab-toggle ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
          aria-label="Class Tests"
          aria-pressed={activeTab === 'tests'}
        >
          <BookOpen size={18} strokeWidth={2} aria-hidden />
          <span>Tests</span>
        </button>

        <button
          type="button"
          className={`tab-toggle ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
          aria-label="Term Exams"
          aria-pressed={activeTab === 'exams'}
        >
          <Award size={18} strokeWidth={2} aria-hidden />
          <span>Exams</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="academics-tab-content">
        
        {/* Schedule/Timetable Tab */}
        {activeTab === 'schedule' && (
          <div className="schedule-tab glass-panel">
            <div className="tab-section-header">
              <h3>Weekly Timetable</h3>
              <p>Your class periods and subject schedule for {student.class_name || 'Class'} - {student.section_name || 'Section'}</p>
            </div>

            <div className="timetable-days-list">
              {formattedTimetable.map(({ day, slots }) => (
                <div key={day} className="timetable-day-row">
                  <div className="day-name-badge">
                    <strong>{day}</strong>
                  </div>
                  <div className="periods-row-wrapper">
                    {slots.length === 0 ? (
                      <div className="no-periods-note">No classes scheduled</div>
                    ) : (
                      slots.map((slot: any) => (
                        <div key={slot.id} className="period-box premium-card primary-accent">
                          <span className="period-number">Period {slot.period_number || 'N/A'}</span>
                          <strong className="period-subject">{slot.subject_name || 'General'}</strong>
                          {slot.start_time && (
                            <span className="period-time">{slot.start_time} - {slot.end_time || ''}</span>
                          )}
                          {slot.room_number && (
                            <span className="period-room">Room: {slot.room_number}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Subjects List */}
            <div className="subjects-section-list">
              <h3>Enrolled Curriculum Subjects</h3>
              <div className="subjects-grid">
                {subjects.map((sub: any) => (
                  <div key={sub.id} className="subject-item-card premium-card secondary-accent">
                    <BookOpen size={20} className="secondary-color" />
                    <div className="sub-detail">
                      <strong>{sub.name}</strong>
                      <p>Code: {sub.code || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Class Tests Tab */}
        {activeTab === 'tests' && (
          <div className="tests-tab glass-panel">
            <div className="tab-section-header">
              <h3>Class Test Performance Logs</h3>
              <p>Daily/Weekly class tests evaluations and grading reports.</p>
            </div>

            <div className="academics-table-wrapper">
              <table className="academics-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Passing Marks</th>
                    <th>Obtained Marks</th>
                    <th>Percentage</th>
                    <th>Grade / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-results-row">
                        <AlertCircle size={32} className="text-muted" />
                        <p>No class test results posted yet.</p>
                      </td>
                    </tr>
                  ) : (
                    testResults.map((tr: any) => {
                      const passing = tr.test_records?.passing_marks || 0;
                      const isPassed = (tr.obtained_marks || 0) >= passing;
                      
                      return (
                        <tr key={tr.id}>
                          <td><strong>{tr.test_records?.name}</strong></td>
                          <td>{new Date(tr.test_records?.test_date).toLocaleDateString()}</td>
                          <td>{tr.test_records?.subject_name || 'Subject'}</td>
                          <td>{passing}</td>
                          <td><strong>{tr.obtained_marks} / {tr.max_marks}</strong></td>
                          <td>{tr.percentage}%</td>
                          <td>
                            <span className={`status-pill ${isPassed ? 'paid' : 'unpaid'}`}>
                              {isPassed ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Term Exams Tab */}
        {activeTab === 'exams' && (
          <div className="exams-tab glass-panel">
            <div className="tab-section-header">
              <h3>Term Examinations Summaries</h3>
              <p>Final aggregated term performance reports and academic evaluations.</p>
            </div>

            <div className="academics-table-wrapper">
              <table className="academics-table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Exam Type</th>
                    <th>Total Marks</th>
                    <th>Obtained Marks</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {examSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-results-row">
                        <AlertCircle size={32} className="text-muted" />
                        <p>No final examination summaries available yet.</p>
                      </td>
                    </tr>
                  ) : (
                    examSummaries.map((ex: any) => (
                      <tr key={ex.examination_id}>
                        <td><strong>{ex.examinations?.name}</strong></td>
                        <td>{ex.examinations?.exam_type}</td>
                        <td>{ex.total_marks}</td>
                        <td><strong>{ex.obtained_marks}</strong></td>
                        <td>{ex.percentage}%</td>
                        <td><strong>{ex.grade || 'N/A'}</strong></td>
                        <td>
                          <span className={`status-pill ${ex.status?.toLowerCase() === 'pass' ? 'paid' : 'unpaid'}`}>
                            {ex.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
