import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  MessageSquareCode,
  User,
  LogOut,
  Sun,
  Moon,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { MobileDockNav } from './MobileDockNav';
import { StudentPhoto } from './StudentPhoto';
import { GrowMoreLogo } from './GrowMoreLogo';
import './Layout.css';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Your academic overview at a glance' },
  '/attendance': { title: 'Attendance', subtitle: 'Calendar, rates, and daily records' },
  '/fees': { title: 'Fees & Challans', subtitle: 'Invoices, payments, and statements' },
  '/academics': { title: 'Academics', subtitle: 'Timetable, tests, and exam results' },
  '/feedback': { title: 'Feedback', subtitle: 'Suggestions and complaints' },
  '/profile': { title: 'My Profile', subtitle: 'Account and security' },
};

const DESKTOP_NAV = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { path: '/fees', label: 'Fees & Challans', icon: CreditCard },
  { path: '/academics', label: 'Academics', icon: GraduationCap },
  { path: '/feedback', label: 'Feedback', icon: MessageSquareCode },
  { path: '/profile', label: 'My Profile', icon: User },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { student, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('lms-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(() => {
    const v = localStorage.getItem('lms-notif-seen-count');
    return v ? parseInt(v, 10) : 0;
  });

  const { notifications, loading: notifLoading } = useNotifications(
    student?.id,
    student?.school_id,
    student?.class_id,
    student?.section_id
  );

  const unreadCount = Math.max(0, notifications.length - lastSeenCount);
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    localStorage.setItem('lms-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [notificationsOpen]);

  const markNotificationsSeen = () => {
    setLastSeenCount(notifications.length);
    localStorage.setItem('lms-notif-seen-count', String(notifications.length));
  };

  const toggleNotifications = () => {
    setNotificationsOpen((open) => {
      if (!open) markNotificationsSeen();
      return !open;
    });
  };

  const pageMeta = PAGE_META[location.pathname] ?? {
    title: 'Student Portal',
    subtitle: 'GrowMore learning management',
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="lms-layout">
      <aside className="lms-sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-mark">
              <GrowMoreLogo size="sm" alt="GrowMore" />
            </div>
            <div className="logo-text-block">
              <span className="logo-text">GrowMore</span>
              <span className="logo-subtext">Student Portal</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {DESKTOP_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon"><Icon size={18} strokeWidth={2} /></span>
                <span className="nav-label">{item.label}</span>
                <ChevronRight className="nav-arrow" size={14} />
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {student && (
            <Link to="/profile" className="student-badge">
              <StudentPhoto student={student} size="sm" className="student-badge-photo" />
              <div className="student-badge-info">
                <div className="student-badge-name">{student.name}</div>
                <div className="student-badge-class">
                  {student.class_name || 'Class'} · {student.section_name || 'Section'}
                </div>
              </div>
            </Link>
          )}
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={2} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="lms-main">
        <header className="lms-navbar">
          <div className="navbar-left">
            <div className="navbar-title-block">
              <h1 className="navbar-page-title">{pageMeta.title}</h1>
              <p className="navbar-page-subtitle">{pageMeta.subtitle}</p>
            </div>
          </div>

          <div className="navbar-right">
            <div className="notification-bell-container" ref={notifRef}>
              <button
                type="button"
                className={`navbar-action-btn notification-btn ${hasUnread ? 'has-unread' : ''}`}
                onClick={toggleNotifications}
                aria-label={`Notifications${hasUnread ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={notificationsOpen}
              >
                <Bell className="navbar-action-icon notify-icon" size={20} strokeWidth={2.25} aria-hidden />
                {hasUnread && (
                  <span className="notification-badge" aria-hidden>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notifications-dropdown glass-panel">
                  <div className="dropdown-header">
                    <h3>Notifications</h3>
                    {notifications.length > 0 && (
                      <button type="button" className="clear-btn" onClick={markNotificationsSeen}>
                        Mark read
                      </button>
                    )}
                  </div>
                  <div className="dropdown-content">
                    {notifLoading ? (
                      <p className="no-notifications">Loading…</p>
                    ) : notifications.length === 0 ? (
                      <p className="no-notifications">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`notification-item type-${n.type}`}>
                          <h4>{n.title}</h4>
                          <p>{n.content}</p>
                          <span className="notif-time">
                            {new Date(n.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="navbar-action-btn theme-toggle-btn"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="navbar-action-icon" size={20} strokeWidth={2.25} aria-hidden />
              ) : (
                <Sun className="navbar-action-icon" size={20} strokeWidth={2.25} aria-hidden />
              )}
            </button>

            <Link to="/profile" className="navbar-profile navbar-profile--desktop">
              <StudentPhoto student={student ?? { name: 'Student' }} size="sm" className="navbar-profile-photo" />
              <span className="navbar-name">{student?.name?.split(' ')[0] || 'Student'}</span>
            </Link>

            <button
              type="button"
              className="navbar-action-btn navbar-logout-btn"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="navbar-action-icon" size={20} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

        <main className="lms-content animate-fade-in">{children}</main>
      </div>

      <MobileDockNav />
    </div>
  );
};
