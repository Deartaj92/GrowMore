import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import {
  Send,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import './Feedback.css';

export const Feedback: React.FC = () => {
  const { student } = useAuth();
  const { getFeedbackHistory, sendFeedback } = useStudentData();
  
  const [history, setHistory] = useState<any[]>([]);
  const [type, setType] = useState<'Complaint' | 'Suggestion'>('Complaint');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchHistory = () => {
    if (student) {
      getFeedbackHistory(student.id, student.school_id)
        .then((data: any) => {
          if (data) setHistory(data);
        });
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [student, getFeedbackHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setSubmitError('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await sendFeedback(
        student!.id,
        student!.name,
        student!.school_id,
        type,
        subject,
        message
      );
      setSubmitSuccess(true);
      setSubject('');
      setMessage('');
      fetchHistory(); // Reload history
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'reviewed') {
      return <CheckCircle size={16} className="text-green" />;
    }
    return <Clock size={16} className="text-amber" />;
  };

  return (
    <div className="feedback-page">
      <div className="feedback-grid">
        
        {/* Submit Form Column */}
        <div className="feedback-form-section glass-panel">
          <div className="form-header">
            <h3>Submit Feedback or Complaint</h3>
            <p>Your suggestions and complaints are routed directly to school administrators to improve our services.</p>
          </div>

          <form onSubmit={handleSubmit} className="feedback-form">
            {submitSuccess && (
              <div className="alert-message success">
                <CheckCircle size={18} />
                <span>Your feedback has been submitted successfully.</span>
              </div>
            )}

            {submitError && (
              <div className="alert-message danger">
                <AlertCircle size={18} />
                <span>{submitError}</span>
              </div>
            )}

            <div className="form-group">
              <label>Feedback Category:</label>
              <div className="category-toggle-group">
                <button
                  type="button"
                  className={`category-toggle-btn ${type === 'Complaint' ? 'active danger' : ''}`}
                  onClick={() => setType('Complaint')}
                >
                  Complaint
                </button>
                <button
                  type="button"
                  className={`category-toggle-btn ${type === 'Suggestion' ? 'active primary' : ''}`}
                  onClick={() => setType('Suggestion')}
                >
                  Suggestion
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="feedback-subject">Subject:</label>
              <input
                type="text"
                id="feedback-subject"
                className="input-field"
                placeholder="e.g. System slow during loading, Issue with Class tests..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="feedback-message">Details / Description:</label>
              <textarea
                id="feedback-message"
                className="input-field text-area"
                rows={6}
                placeholder="Describe your issue or suggestion in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
              <Send size={16} />
              <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="feedback-history-section glass-panel">
          <div className="history-header">
            <h3>Feedback Log & History</h3>
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-history">
                <HelpCircle size={36} className="text-muted" />
                <p>You haven't submitted any feedback yet.</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={`${item.type}-${item.id}`} className="history-card premium-card">
                  <div className="history-card-header">
                    <span className={`type-badge ${item.type.toLowerCase()}`}>{item.type}</span>
                    <span className="history-date">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <strong className="history-subject">{item.subject}</strong>
                  <p className="history-text-preview">{item.complaint_text || item.suggestion_text}</p>
                  
                  <div className="history-status-bar">
                    <div className="status-indicator">
                      {getStatusIcon(item.status)}
                      <span className="status-label">{item.status === 'reviewed' ? 'Reviewed' : 'In Review'}</span>
                    </div>
                  </div>

                  {item.review_notes && (
                    <div className="admin-notes-box">
                      <strong>Admin Notes:</strong>
                      <p>{item.review_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
