import React, { useState, useEffect } from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../services/supabase';
import {
  BookOpenCheck,
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Users,
  BookOpen,
  X,
} from 'lucide-react';
import './Homework.css';

interface HomeworkEntry {
  id: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  status: 'active' | 'completed';
}

const DEFAULT_HOMEWORK: HomeworkEntry[] = [
  {
    id: 'hw-1',
    class_name: 'Class 10',
    section_name: 'A',
    subject_name: 'Mathematics',
    title: 'Quadratic Equations Exercise 4.2',
    description: 'Solve Questions 1 through 8 in your homework notebook. Review formula derivations on page 84.',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    status: 'active',
  },
  {
    id: 'hw-2',
    class_name: 'Class 9',
    section_name: 'B',
    subject_name: 'Physics',
    title: 'Newton Laws of Motion Chapter Summary',
    description: 'Draw free-body diagrams for examples 3.1 and 3.2. Prepare 5 conceptual questions for class discussion.',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: 'active',
  },
  {
    id: 'hw-3',
    class_name: 'Class 10',
    section_name: 'B',
    subject_name: 'Chemistry',
    title: 'Chemical Reactions and Equations Worksheet',
    description: 'Complete the balance equation worksheet questions 1 to 15. Submit by tomorrow morning.',
    assigned_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    status: 'completed',
  },
];

export const Homework: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<HomeworkEntry[]>(() => {
    try {
      const saved = localStorage.getItem('growmore_teacher_homework');
      return saved ? JSON.parse(saved) : DEFAULT_HOMEWORK;
    } catch {
      return DEFAULT_HOMEWORK;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newHw, setNewHw] = useState({
    class_name: 'Class 10',
    section_name: 'A',
    subject_name: 'Mathematics',
    title: '',
    description: '',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  });

  const handleCreateHw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHw.title.trim()) {
      showToast('Please enter a homework task title.', 'warning');
      return;
    }

    const created: HomeworkEntry = {
      id: `hw-${Date.now()}`,
      class_name: newHw.class_name,
      section_name: newHw.section_name,
      subject_name: newHw.subject_name,
      title: newHw.title,
      description: newHw.description,
      assigned_date: new Date().toISOString().split('T')[0],
      due_date: newHw.due_date,
      status: 'active',
    };

    const updated = [created, ...entries];
    setEntries(updated);
    localStorage.setItem('growmore_teacher_homework', JSON.stringify(updated));
    showToast('Homework assignment published successfully!', 'success');
    setIsModalOpen(false);
    setNewHw({
      class_name: 'Class 10',
      section_name: 'A',
      subject_name: 'Mathematics',
      title: '',
      description: '',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    });
  };

  const filteredEntries = entries.filter((hw) => {
    return (
      !search ||
      hw.title.toLowerCase().includes(search.toLowerCase()) ||
      hw.subject_name.toLowerCase().includes(search.toLowerCase()) ||
      hw.class_name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="homework-module-page">
      {/* 1. CONTROL STRIP */}
      <div className="module-control-strip">
        <div className="module-strip-context">
          <span className="module-context-chip">
            <BookOpenCheck size={14} className="text-emerald" />
            <span>Homework Diary Feed</span>
          </span>
          <span className="badge badge-emerald">
            {entries.length} Assigned Tasks
          </span>
        </div>

        <div className="module-actions-row">
          <div className="search-wrapper" style={{ minWidth: '220px' }}>
            <Search size={14} className="search-lens" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search homework by subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={15} />
            <span>Assign Homework</span>
          </button>
        </div>
      </div>

      {/* 2. HOMEWORK CARDS LIST */}
      <div className="homework-cards-list">
        {filteredEntries.map((hw) => (
          <div key={hw.id} className="homework-card">
            <div className="homework-card-header">
              <div className="homework-card-title-group">
                <h3 className="homework-card-title">{hw.title}</h3>
                <span className="badge badge-indigo">{hw.subject_name}</span>
                <span className="badge badge-neutral">
                  {hw.class_name} · Sec {hw.section_name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="badge badge-amber">
                  <Clock size={12} /> Due: {hw.due_date}
                </span>
                {hw.status === 'completed' ? (
                  <span className="badge badge-emerald">Completed</span>
                ) : (
                  <span className="badge badge-emerald">Active</span>
                )}
              </div>
            </div>

            <p className="homework-body-text">{hw.description}</p>

            <div className="homework-card-footer">
              <span>Assigned by: {teacher?.name || 'Faculty Member'}</span>
              <span>Date: {hw.assigned_date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop-custom" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            maxWidth: '520px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Publish Daily Homework
              </h3>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateHw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Class & Section
                </label>
                <select
                  className="toolbar-select"
                  style={{ width: '100%' }}
                  value={`${newHw.class_name} · ${newHw.section_name}`}
                  onChange={(e) => {
                    const [c, s] = e.target.value.split(' · ');
                    setNewHw({ ...newHw, class_name: c, section_name: s });
                  }}
                >
                  <option value="Class 10 · A">Class 10 · Section A</option>
                  <option value="Class 10 · B">Class 10 · Section B</option>
                  <option value="Class 9 · A">Class 9 · Section A</option>
                  <option value="Class 9 · B">Class 9 · Section B</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Subject
                </label>
                <input
                  type="text"
                  className="toolbar-search-input"
                  style={{ width: '100%' }}
                  value={newHw.subject_name}
                  onChange={(e) => setNewHw({ ...newHw, subject_name: e.target.value })}
                  placeholder="e.g. Mathematics, Physics, English"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Homework Title / Topic
                </label>
                <input
                  type="text"
                  className="toolbar-search-input"
                  style={{ width: '100%' }}
                  value={newHw.title}
                  onChange={(e) => setNewHw({ ...newHw, title: e.target.value })}
                  placeholder="e.g. Chapter 4 Exercise Problems"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Instructions & Diary Notes
                </label>
                <textarea
                  className="toolbar-search-input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  value={newHw.description}
                  onChange={(e) => setNewHw({ ...newHw, description: e.target.value })}
                  placeholder="Specific problems, textbook pages, or submission instructions…"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Submission Due Date
                </label>
                <input
                  type="date"
                  className="toolbar-search-input"
                  style={{ width: '100%' }}
                  value={newHw.due_date}
                  onChange={(e) => setNewHw({ ...newHw, due_date: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish to Student LMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
