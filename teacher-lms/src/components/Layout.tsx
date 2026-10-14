import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../services/supabase';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Users,
  Clock,
  BookOpenCheck,
  Award,
  Layers,
  Bell,
  CalendarRange,
  User,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  CheckCircle,
  CheckCheck,
} from 'lucide-react';
import { GrowMoreLogo } from './GrowMoreLogo';
import { isTeacherLinkedNotice, stripHtml } from '../utils/noticeUtils';
import { AnnouncementPreviewModal } from './AnnouncementPreviewModal';
import './Layout.css';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Teacher Dashboard', subtitle: 'Executive overview of classes, timetable, and diary activities' },
  '/attendance': { title: 'Class & Staff Attendance', subtitle: 'Attendance records, compliance, and leave logs' },
  '/classes': { title: 'My Classes & Sections', subtitle: 'Class rosters, student profiles, and subject assignments' },
  '/timetable': { title: 'Timetable & Schedule', subtitle: 'Weekly period distribution, room allocations, and free periods' },
  '/homework': { title: 'Homework Diary', subtitle: 'Assign homework, review student submissions, and upload materials' },
  '/tests': { title: 'Class Tests & Quizzes', subtitle: 'Daily & weekly class tests, quiz registers, and performance reports' },
  '/exams': { title: 'Official Term Examination Marks', subtitle: 'Record and submit marks for active published term examinations' },
  '/notices': { title: 'Notice Board', subtitle: 'Official announcements, circulars, and departmental updates' },
  '/leave': { title: 'Leave Management', subtitle: 'Apply for official faculty leave and track approval status' },
  '/profile': { title: 'Faculty Profile', subtitle: 'Credentials, assigned subjects, and portal preferences' },
};

interface HeaderNotification {
  id: string;
  title: string;
  raw_title?: string;
  message?: string;
  raw_message?: string;
  footer_text?: string | null;
  time: string;
  priority: 'urgent' | 'important' | 'normal';
  type: 'announcement' | 'notice' | 'notification' | 'leave';
  link?: string;
  is_read: boolean;
  created_at: string;
  hide_dont_show?: boolean;
}

interface LayoutNavItem {
  path: string;
  label: string;
  icon: any;
  isProminent?: boolean;
  badge?: string;
}

interface LayoutNavGroup {
  id: string;
  title: string;
  items: LayoutNavItem[];
}

const formatRelativeTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teacher, logout } = useTeacherAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('teacher-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark'; // Dark theme default for executive look
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Real Notifications State
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [previewNotification, setPreviewNotification] = useState<HeaderNotification | null>(null);

  // Check if any examination is currently published for the school
  const [hasPublishedExam, setHasPublishedExam] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkPublishedExam = async () => {
      if (!teacher) return;
      try {
        const schoolId = teacher.school_id || 2;
        const { data, error } = await supabase
          .from('examinations')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('status', 'published')
          .limit(1);

        if (error) throw error;
        if (isMounted) {
          setHasPublishedExam(Boolean(data && data.length > 0));
        }
      } catch (err) {
        console.error('Error checking published exam in Layout:', err);
      }
    };

    checkPublishedExam();
    return () => {
      isMounted = false;
    };
  }, [teacher, location.pathname]);

  // Fetch real notifications for this teacher from notices and notifications tables
  useEffect(() => {
    if (!teacher) return;
    let isMounted = true;

    const fetchNotifications = async () => {
      setNotifLoading(true);
      try {
        const schoolId = teacher.school_id || 2;
        const teacherStaffId = teacher.id;
        const teacherUserId = teacher.user_id;

        // Load read notification IDs from localStorage
        const readIdsKey = `growmore_read_notifs_${teacherStaffId}`;
        const readIds: string[] = JSON.parse(localStorage.getItem(readIdsKey) || '[]');
        const readIdsSet = new Set<string>(readIds);

        // Load dismissed notification IDs from localStorage
        const dismissedIdsKey = `growmore_dismissed_notifs_${teacherStaffId}`;
        const dismissedIds: string[] = JSON.parse(localStorage.getItem(dismissedIdsKey) || '[]');
        const dismissedIdsSet = new Set<string>(dismissedIds);

        const items: HeaderNotification[] = [];

        // 1. Fetch recent announcements for this school (to display and to hydrate broadcast notifications)
        const { data: dbAnnouncements } = await supabase
          .from('announcements')
          .select('*')
          .eq('school_id', schoolId)
          .order('id', { ascending: false })
          .limit(25);

        const allAnnouncements = dbAnnouncements || [];

        // Map of announcements for instant lookup
        const announcementMap = new Map<string, any>();
        allAnnouncements.forEach((a: any) => {
          announcementMap.set(String(a.id), a);
          const clean = stripHtml(a.title).toLowerCase().trim();
          if (clean && !announcementMap.has(clean)) {
            announcementMap.set(clean, a);
          }
        });

        // Add active announcements targeted to staff/all
        allAnnouncements.forEach((a: any) => {
          const audience = a.audience_group || 'all';
          const isStaffTarget = ['staff', 'all', 'teachers', 'all_users', 'students_staff'].includes(audience);
          if (!isStaffTarget || a.is_active === false) return;

          const notifId = `announcement-${a.id}`;
          if (dismissedIdsSet.has(notifId)) return;

          const cleanTitle = stripHtml(a.title) || 'Official Announcement';
          const cleanMsg = stripHtml(a.message) || '';
          const isRead = readIdsSet.has(notifId);

          items.push({
            id: notifId,
            title: cleanTitle,
            raw_title: a.title,
            message: cleanMsg ? cleanMsg.substring(0, 85) + (cleanMsg.length > 85 ? '…' : '') : '',
            raw_message: a.message,
            footer_text: a.footer_text || null,
            time: formatRelativeTime(a.created_at),
            priority: 'urgent',
            type: 'announcement',
            is_read: isRead,
            created_at: a.created_at,
            hide_dont_show: a.hide_dont_show,
          });
        });

        // 2. Fetch from notifications table and hydrate truncated messages with full announcements if available
        const { data: dbNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('school_id', schoolId)
          .or(`recipient_id.eq.${teacherUserId || -1},recipient_id.eq.${teacherStaffId}`)
          .order('created_at', { ascending: false })
          .limit(15);

        if (dbNotifs && dbNotifs.length > 0) {
          dbNotifs.forEach((n: any) => {
            const notifId = `db-${n.id}`;
            if (dismissedIdsSet.has(notifId)) return;

            const cleanTitle = stripHtml(n.title) || 'Notification';
            const cleanMsg = stripHtml(n.message) || '';
            const isRead = n.is_read || readIdsSet.has(notifId);

            // Look up full matching announcement to prevent truncated text
            const lookupKey = cleanTitle.toLowerCase().trim();
            const matchedAnn = announcementMap.get(lookupKey) ||
              allAnnouncements.find((a: any) => {
                const aClean = stripHtml(a.title).toLowerCase().trim();
                return aClean && (aClean === lookupKey || aClean.includes(lookupKey) || lookupKey.includes(aClean));
              });

            const fullMessage = (matchedAnn && matchedAnn.message) ? matchedAnn.message : n.message;
            const fullTitle = (matchedAnn && matchedAnn.title) ? matchedAnn.title : n.title;
            const fullFooter = (matchedAnn && matchedAnn.footer_text) ? matchedAnn.footer_text : (n.footer_text || null);
            const hideDontShow = matchedAnn ? matchedAnn.hide_dont_show : false;

            items.push({
              id: notifId,
              title: cleanTitle,
              raw_title: fullTitle,
              message: cleanMsg ? cleanMsg.substring(0, 85) + (cleanMsg.length > 85 ? '…' : '') : '',
              raw_message: fullMessage,
              footer_text: fullFooter,
              time: formatRelativeTime(n.created_at),
              priority: n.is_important ? 'important' : (matchedAnn ? 'urgent' : 'normal'),
              type: (matchedAnn || n.notification_type === 'announcement') ? 'announcement' : 'notification',
              is_read: isRead,
              created_at: n.created_at,
              hide_dont_show: hideDontShow,
            });
          });
        }

        // 3. Fetch linked circular notices from notices table
        const { data: dbNotices } = await supabase
          .from('notices')
          .select('*')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (dbNotices && dbNotices.length > 0) {
          const linked = dbNotices.filter((n: any) => isTeacherLinkedNotice(n, teacher));
          linked.forEach((n: any) => {
            const notifId = `notice-${n.id}`;
            if (dismissedIdsSet.has(notifId)) return;

            const isRead = readIdsSet.has(notifId);
            items.push({
              id: notifId,
              title: n.title,
              raw_title: n.title,
              message: n.description ? n.description.substring(0, 85) + (n.description.length > 85 ? '…' : '') : '',
              raw_message: `<p style="white-space: pre-line;">${n.description || ''}</p>`,
              footer_text: n.expiry_date ? `Valid until: ${n.expiry_date}` : null,
              time: formatRelativeTime(n.created_at),
              priority: n.notice_type === 'urgent' ? 'urgent' : 'important',
              type: 'notice',
              link: '/notices',
              is_read: isRead,
              created_at: n.created_at,
            });
          });
        }

        // 4. Fetch pending student leave requests
        const { data: pendingLeaves } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('school_id', schoolId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        if (pendingLeaves && pendingLeaves.length > 0) {
          pendingLeaves.forEach((l: any) => {
            const notifId = `leave-${l.id}`;
            if (dismissedIdsSet.has(notifId)) return;

            const isRead = readIdsSet.has(notifId);
            items.push({
              id: notifId,
              title: `Leave: ${l.requested_by_name || 'Student'}`,
              raw_title: `Leave Application · ${l.requested_by_name || 'Student'}`,
              message: l.reason ? `"${l.reason.substring(0, 75)}"` : 'Pending review',
              raw_message: `<p><strong>Applicant:</strong> ${l.requested_by_name || 'Student'}</p><p><strong>Reason:</strong> ${l.reason || 'None provided'}</p><p><strong>Leave Dates:</strong> ${l.start_date} to ${l.end_date}</p>`,
              footer_text: `Status: Pending Review · Type: ${l.leave_type?.replace('_', ' ') || 'General'}`,
              time: formatRelativeTime(l.created_at),
              priority: 'important',
              type: 'leave',
              link: '/leave',
              is_read: isRead,
              created_at: l.created_at,
            });
          });
        }

        // Sort items chronologically
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (isMounted) {
          setNotifications(items.slice(0, 10));
        }
      } catch (err) {
        console.error('Error fetching real header notifications:', err);
      } finally {
        if (isMounted) setNotifLoading(false);
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [teacher]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const handleMarkAsRead = (id: string, link?: string) => {
    if (!teacher) return;
    const readIdsKey = `growmore_read_notifs_${teacher.id}`;
    const readIds: string[] = JSON.parse(localStorage.getItem(readIdsKey) || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(readIdsKey, JSON.stringify(readIds));
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleNotificationClick = (item: HeaderNotification) => {
    handleMarkAsRead(item.id);
    setNotifOpen(false);
    setPreviewNotification(item);
  };

  const handleMarkAllAsRead = () => {
    if (!teacher) return;
    const readIdsKey = `growmore_read_notifs_${teacher.id}`;
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem(readIdsKey, JSON.stringify(allIds));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    showToast('All notifications marked as read', 'info');
  };

  // Dynamic Semantic Navigation Groups
  const navGroups = useMemo<LayoutNavGroup[]>(() => {
    const groups: LayoutNavGroup[] = [
      {
        id: 'academics',
        title: 'ACADEMICS',
        items: [
          { path: '/', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/attendance', label: 'Attendance', icon: CalendarCheck },
          { path: '/classes', label: 'My Classes', icon: Users },
          { path: '/timetable', label: 'Timetable', icon: Clock },
        ],
      },
      {
        id: 'assessment',
        title: 'EVALUATION & DIARY',
        items: [
          { path: '/homework', label: 'Homework Diary', icon: BookOpenCheck },
          { path: '/tests', label: 'Class Tests', icon: Layers },
        ],
      },
      {
        id: 'records',
        title: 'INSTITUTE & COMM',
        items: [
          { path: '/notices', label: 'Notice Board', icon: Bell },
          { path: '/leave', label: 'Leave Requests', icon: CalendarRange },
          { path: '/profile', label: 'Faculty Profile', icon: User },
        ],
      },
    ];

    // Conditionally inject prominent Exam Marks item when a published exam exists
    if (hasPublishedExam) {
      groups[1].items.push({
        path: '/exams',
        label: 'Exam Marks',
        icon: Award,
        isProminent: true,
        badge: 'Active',
      });
    }

    return groups;
  }, [hasPublishedExam]);

  useEffect(() => {
    localStorage.setItem('teacher-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Close notifications on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    logout();
    showToast('Signed out successfully', 'info');
    navigate('/login');
  };

  const currentMeta = PAGE_META[location.pathname] || {
    title: 'Teachers Panel',
    subtitle: 'GrowMore Academic Management',
  };

  return (
    <div className="teacher-layout">
      {/* DESKTOP SIDEBAR */}
      <aside className="teacher-sidebar">
        <div className="sidebar-brand-block">
          <Link to="/" className="sidebar-brand-link">
            <GrowMoreLogo size="md" />
            <div className="sidebar-brand-text">
              <span className="brand-name">GrowMore</span>
              <span className="brand-panel-tag">Faculty Portal</span>
            </div>
          </Link>
        </div>

        {/* GROUPED NAVIGATION MENU */}
        <nav className="sidebar-nav-container" aria-label="Teacher navigation">
          {navGroups.map((group) => (
            <div key={group.id} className="sidebar-nav-group">
              <div className="sidebar-group-header">{group.title}</div>
              <div className="sidebar-group-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `sidebar-nav-item ${item.isProminent ? 'prominent-exam-nav' : ''} ${isActive ? 'active' : ''}`
                      }
                    >
                      <span className="nav-item-icon-box">
                        <Icon size={17} strokeWidth={item.isProminent ? 2.5 : 2.2} />
                      </span>
                      <span className="nav-item-label">{item.label}</span>
                      {item.badge && (
                        <span className={`nav-item-badge ${item.isProminent ? 'exam-live-badge' : ''}`}>
                          {item.isProminent && <span className="exam-live-dot" />}
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="nav-item-arrow" size={13} />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* TEACHER PROFILE FOOTER */}
        <div className="sidebar-footer-profile">
          <div className="teacher-profile-chip">
            <div className="teacher-avatar-wrapper">
              {teacher?.photo_url ? (
                <img src={teacher.photo_url} alt={teacher.name} className="teacher-avatar-img" />
              ) : (
                <div className="teacher-avatar-fallback">
                  {teacher?.name?.charAt(0) || 'T'}
                </div>
              )}
              <span className="teacher-online-dot" />
            </div>

            <div className="teacher-meta-text">
              <span className="teacher-name-tag">{teacher?.name || 'Faculty Member'}</span>
              <span className="teacher-role-tag">{teacher?.designation || 'Teacher'}</span>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            <button
              type="button"
              className="footer-action-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              className="footer-action-btn logout"
              onClick={handleLogout}
              title="Sign out of Teachers Portal"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="sidebar-brand-text">
                <span className="brand-name">GrowMore</span>
                <span className="brand-panel-tag">Faculty Portal</span>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              {navGroups.map((group) => (
                <div key={group.id} className="mobile-nav-group">
                  <div className="mobile-group-header">{group.title}</div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                          `mobile-nav-link ${item.isProminent ? 'prominent-exam-nav' : ''} ${isActive ? 'active' : ''}`
                        }
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span
                            className={`nav-item-badge ${item.isProminent ? 'exam-live-badge' : ''}`}
                            style={{ marginLeft: 'auto' }}
                          >
                            {item.isProminent && <span className="exam-live-dot" />}
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="mobile-drawer-footer">
              <button type="button" className="btn btn-secondary w-full" onClick={handleLogout}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="teacher-main-wrapper">
        {/* TOP HEADER */}
        <header className="teacher-top-header">
          <div className="header-left">
            <button
              type="button"
              className="btn btn-icon btn-ghost mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            <div className="header-page-titles">
              <span className="header-breadcrumb">
                Faculty Portal · {location.pathname === '/' ? 'Dashboard' : currentMeta.title}
              </span>
              <h1 className="header-title">{currentMeta.title}</h1>
              <p className="header-subtitle">{currentMeta.subtitle}</p>
            </div>
          </div>

          <div className="header-right">
            {/* Quick Primary Shortcut Button */}
            <button
              type="button"
              className="header-quick-action-btn"
              onClick={() => navigate('/attendance')}
              title="Quick Attendance Entry"
            >
              <CalendarCheck size={14} />
              <span>Mark Attendance</span>
            </button>

            {/* Today's Date Tag */}
            <div className="header-date-pill">
              <Calendar size={13} />
              <span className="date-text">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {/* Notifications Popover */}
            <div className="header-notif-wrapper" ref={notifRef}>
              <button
                type="button"
                className={`btn btn-icon btn-ghost notif-bell-btn ${notifOpen ? 'active' : ''}`}
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label="View notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && <span className="notif-badge-dot" />}
              </button>

              {notifOpen && (
                <div className="notif-dropdown-card glass-panel">
                  <div className="notif-dropdown-header">
                    <div>
                      <h4>Notifications & Notices</h4>
                      <span className="notif-header-subtitle">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="notif-mark-read-btn"
                        onClick={handleMarkAllAsRead}
                        title="Mark all notifications as read"
                      >
                        <CheckCheck size={13} />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="notif-dropdown-list">
                    {notifLoading ? (
                      <div className="notif-empty-state">
                        <span className="notif-empty-desc">Loading notifications…</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="notif-empty-state">
                        <CheckCircle size={26} className="notif-empty-icon" />
                        <p className="notif-empty-title">All caught up</p>
                        <span className="notif-empty-desc">No notifications or notices for you right now.</span>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`notif-drop-item ${item.is_read ? 'read' : 'unread'}`}
                          onClick={() => handleNotificationClick(item)}
                          role="button"
                          tabIndex={0}
                        >
                          <span className={`notif-drop-dot ${item.priority || 'normal'}`} />
                          <div className="notif-drop-content">
                            <div className="notif-drop-row">
                              <p className="notif-drop-title">{item.title}</p>
                              {!item.is_read && <span className="notif-unread-pill">New</span>}
                            </div>
                            {item.message && (
                              <p className="notif-drop-msg">{item.message}</p>
                            )}
                            <span className="notif-drop-time">{item.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="notif-dropdown-footer">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm w-full"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/notices');
                      }}
                    >
                      Open Full Notice Board
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              className="btn btn-icon btn-ghost theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="teacher-content-area">{children}</main>

        {/* Rich Announcement & Notification Preview Modal */}
        <AnnouncementPreviewModal
          notification={previewNotification}
          onClose={() => setPreviewNotification(null)}
          onRemindMeLater={() => {
            setPreviewNotification(null);
          }}
          onDontShowAgain={() => {
            if (previewNotification && teacher) {
              const dismissedIdsKey = `growmore_dismissed_notifs_${teacher.id}`;
              const dismissed: string[] = JSON.parse(localStorage.getItem(dismissedIdsKey) || '[]');
              if (!dismissed.includes(previewNotification.id)) {
                dismissed.push(previewNotification.id);
                localStorage.setItem(dismissedIdsKey, JSON.stringify(dismissed));
              }
              setNotifications((prev) => prev.filter((n) => n.id !== previewNotification.id));
            }
            setPreviewNotification(null);
          }}
          onNavigate={(link) => {
            navigate(link);
            setPreviewNotification(null);
          }}
        />

        {/* MOBILE BOTTOM DOCK NAV */}
        <nav className="mobile-dock-nav" aria-label="Mobile quick navigation">
          <NavLink to="/" end className={({ isActive }) => `dock-tab ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/attendance" className={({ isActive }) => `dock-tab ${isActive ? 'active' : ''}`}>
            <CalendarCheck size={20} />
            <span>Attendance</span>
          </NavLink>
          {hasPublishedExam && (
            <NavLink to="/exams" className={({ isActive }) => `dock-tab prominent-dock-tab ${isActive ? 'active' : ''}`}>
              <Award size={20} />
              <span>Exams</span>
            </NavLink>
          )}
          <NavLink to="/timetable" className={({ isActive }) => `dock-tab ${isActive ? 'active' : ''}`}>
            <Clock size={20} />
            <span>Schedule</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `dock-tab ${isActive ? 'active' : ''}`}>
            <User size={20} />
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
};
