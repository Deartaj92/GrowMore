import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { supabase } from '../services/supabase';
import { Award, Layers, LayoutDashboard, Calendar, AlertCircle } from 'lucide-react';
import { ExamMarksManager } from '../components/ExamMarksManager';
import { TeacherLoader } from '../components/TeacherLoader';

export const Exams: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [publishedCount, setPublishedCount] = useState<number>(0);

  useEffect(() => {
    const checkExams = async () => {
      if (!teacher) return;
      try {
        setLoading(true);
        const schoolId = teacher.school_id || 2;
        const { data, error } = await supabase
          .from('examinations')
          .select('id, name, status')
          .eq('school_id', schoolId)
          .eq('status', 'published');

        if (error) throw error;
        setPublishedCount(data ? data.length : 0);
      } catch (err) {
        console.error('Error checking published examinations:', err);
      } finally {
        setLoading(false);
      }
    };

    checkExams();
  }, [teacher]);

  if (loading) {
    return <TeacherLoader message="Checking published term examinations…" />;
  }

  if (publishedCount === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--amber-500)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <Award size={32} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            No Term Examinations Currently Published
          </h2>

          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--text-muted)',
              maxWidth: '520px',
              margin: '0 auto 1.75rem auto',
              lineHeight: 1.6,
            }}
          >
            Examination marks entry is only enabled when the school administration publishes an official term exam
            (e.g., Mid-Term or Final-Term Examination). Once published, this dedicated portal will allow you to record and
            submit marks for your linked subjects.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/tests')}
            >
              <Layers size={16} /> Go to Class Tests & Quizzes
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              <LayoutDashboard size={16} /> Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exams-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <ExamMarksManager onSwitchToTests={() => navigate('/tests')} />
    </div>
  );
};
