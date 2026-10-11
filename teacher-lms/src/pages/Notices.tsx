import React, { useState, useEffect } from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { supabase } from '../services/supabase';
import {
  Bell,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import { TeacherLoader } from '../components/TeacherLoader';
import { isTeacherLinkedNotice, stripHtml } from '../utils/noticeUtils';
import { AnnouncementPreviewModal, AnnouncementModalData } from '../components/AnnouncementPreviewModal';
import './Notices.css';

interface NoticeItem {
  id: string;
  title: string;
  raw_title?: string;
  description: string;
  raw_description?: string;
  footer_text?: string | null;
  notice_type?: string;
  created_at: string;
  expiry_date?: string | null;
  audience_group?: string;
}

export const Notices: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [previewData, setPreviewData] = useState<AnnouncementModalData | null>(null);

  useEffect(() => {
    const fetchNotices = async () => {
      if (!teacher) return;
      try {
        setLoading(true);
        const schoolId = teacher.school_id || 2;

        const [noticesRes, announcementsRes] = await Promise.all([
          supabase
            .from('notices')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false }),
          supabase
            .from('announcements')
            .select('*')
            .eq('school_id', schoolId)
            .eq('is_active', true)
            .in('audience_group', ['staff', 'all', 'teachers'])
            .order('created_at', { ascending: false })
        ]);

        const allItems: NoticeItem[] = [];

        // 1. Official broadcast announcements
        if (announcementsRes.data) {
          announcementsRes.data.forEach((a: any) => {
            allItems.push({
              id: `announcement-${a.id}`,
              title: stripHtml(a.title) || 'Official Announcement',
              raw_title: a.title,
              description: stripHtml(a.message) || '',
              raw_description: a.message,
              footer_text: a.footer_text || null,
              notice_type: 'urgent',
              created_at: a.created_at,
              audience_group: a.audience_group,
            });
          });
        }

        // 2. Linked notices
        if (noticesRes.data) {
          const linked = noticesRes.data.filter((notice: any) => isTeacherLinkedNotice(notice, teacher));
          linked.forEach((n: any) => {
            allItems.push({
              id: `notice-${n.id}`,
              title: n.title,
              raw_title: n.title,
              description: n.description || '',
              raw_description: `<p style="white-space: pre-line;">${n.description || ''}</p>`,
              footer_text: n.expiry_date ? `Valid until: ${n.expiry_date}` : null,
              notice_type: n.notice_type || 'info',
              created_at: n.created_at,
              expiry_date: n.expiry_date,
              audience_group: n.audience_group,
            });
          });
        }

        allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotices(allItems);
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [teacher]);

  const filteredNotices = notices.filter((n) => {
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'urgent' && n.notice_type === 'urgent') ||
      (filterType === 'info' && (n.notice_type === 'info' || !n.notice_type));
    const matchesSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <TeacherLoader message="Loading faculty circulars & memos…" />;
  }

  return (
    <div className="notices-module-page">
      {/* 1. FILTER & SEARCH BAR */}
      <div className="notices-filter-bar">
        <div className="notices-filter-tabs">
          <button
            type="button"
            className={`notices-filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Bulletins ({notices.length})
          </button>
          <button
            type="button"
            className={`notices-filter-tab ${filterType === 'urgent' ? 'active' : ''}`}
            onClick={() => setFilterType('urgent')}
          >
            Urgent Notices
          </button>
          <button
            type="button"
            className={`notices-filter-tab ${filterType === 'info' ? 'active' : ''}`}
            onClick={() => setFilterType('info')}
          >
            Official Memos
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="search-wrapper" style={{ minWidth: '240px' }}>
            <Search size={14} className="search-lens" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search circulars…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. NOTICES LIST */}
      <div className="notices-list-container">
        {filteredNotices.length === 0 ? (
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
            <Bell size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
              No Notice Circulars Found
            </h3>
            <p style={{ fontSize: '0.86rem', margin: 0 }}>
              There are currently no active administrative notices matching this selection.
            </p>
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const isUrgent = notice.notice_type === 'urgent';
            return (
              <div
                key={notice.id}
                className={`notice-card ${isUrgent ? 'urgent' : 'normal'}`}
                onClick={() => {
                  setPreviewData({
                    id: notice.id,
                    title: notice.title,
                    raw_title: notice.raw_title,
                    message: notice.description,
                    raw_message: notice.raw_description || notice.description,
                    footer_text: notice.footer_text,
                    time: new Date(notice.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                    priority: isUrgent ? 'urgent' : 'normal',
                    type: notice.id.startsWith('announcement-') ? 'announcement' : 'notice',
                  });
                }}
                title="Click to preview full announcement"
              >
                <div className="notice-card-header">
                  <div className="notice-card-title-group">
                    <h3 className="notice-card-title">{notice.title}</h3>
                    {isUrgent ? (
                      <span className="badge badge-rose">Urgent</span>
                    ) : (
                      <span className="badge badge-emerald">Administrative</span>
                    )}
                  </div>
                  <span className="notice-date-badge">
                    <Clock size={13} />
                    {new Date(notice.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <p className="notice-description">{notice.description}</p>

                <div className="notice-card-footer">
                  <span>Audience: {notice.audience_group ? notice.audience_group.toUpperCase() : 'FACULTY'}</span>
                  {notice.expiry_date && (
                    <span>Valid until: {notice.expiry_date}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Announcement Preview Modal */}
      <AnnouncementPreviewModal
        notification={previewData}
        onClose={() => setPreviewData(null)}
        onRemindMeLater={() => setPreviewData(null)}
        onDontShowAgain={() => setPreviewData(null)}
      />
    </div>
  );
};
