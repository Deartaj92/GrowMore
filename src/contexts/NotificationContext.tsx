import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { activityTrackingService, Notification, NotificationPreferences } from '../services/activityTrackingService';
import { supabase } from '../supabaseClient';
import { pushNotificationService } from '../services/pushNotificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreferences | null;
  setPanelOpen: (isOpen: boolean) => void;

  // Actions
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationIds: number[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;

  // Real-time updates
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;

  // Announcement actions
  activeAnnouncementId: number | null;
  openAnnouncement: (id: number) => void;
  closeAnnouncement: () => void;

  // Pagination
  loadMore: () => Promise<void>;
  hasMore: boolean;

  // Desktop Notifications
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: null,
  setPanelOpen: () => { },
  refreshNotifications: async () => { },
  markAsRead: async () => { },
  markAllAsRead: async () => { },
  updatePreferences: async () => { },
  subscribeToNotifications: () => { },
  unsubscribeFromNotifications: () => { },
  activeAnnouncementId: null,
  openAnnouncement: () => { },
  closeAnnouncement: () => { },
  loadMore: async () => { },
  hasMore: false,
  requestPermission: async () => false,
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

// Helper to get student info from localStorage
const getStudentInfo = () => {
  try {
    const studentSession = localStorage.getItem('studentSession');
    if (studentSession) {
      return JSON.parse(studentSession);
    }
  } catch (e) {
    // Error parsing student session
  }
  return null;
};

// Helper to get parent info from localStorage
const getParentInfo = () => {
  try {
    const parentSession = localStorage.getItem('parentSession');
    if (parentSession) {
      return JSON.parse(parentSession);
    }
  } catch (e) {
    // Error parsing parent session
  }
  return null;
};

// Helper to normalize ID lists from Supabase
const normalizeIdList = (raw: any): number[] => {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const withoutBraces = trimmed.replace(/[{}]/g, '');
    if (!withoutBraces) return [];
    return withoutBraces
      .split(',')
      .map(part => Number(part.trim()))
      .filter(value => Number.isFinite(value));
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? [raw] : [];
  }
  return [];
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const preferencesRef = useRef<NotificationPreferences | null>(null); // Ref for real-time callbacks
  const [subscription, setSubscription] = useState<any>(null);
  const panelOpenRef = useRef(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [parentInfo, setParentInfo] = useState<any>(null);
  const [activeAnnouncementId, setActiveAnnouncementId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const lastNotificationTimeRef = useRef<number>(0);
  const isRefreshingRef = useRef(false); // Prevent concurrent refresh calls
  const isLoadingMoreRef = useRef(false); // Prevent concurrent loadMore calls
  const PAGE_SIZE = 20;

  // Keep preferences ref in sync
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Helper to clean notification content (strip HTML and entities)
  const cleanText = useCallback((html: string | undefined | null) => {
    if (!html) return '';
    try {
      const tmp = document.createElement('DIV');
      tmp.innerHTML = html;
      return (tmp.textContent || tmp.innerText || '')
        .replace(/\u00A0/g, ' ') // Replace non-breaking space char
        .replace(/&nbsp;/g, ' ') // Replace literal &nbsp; string if it survived
        .replace(/\s+/g, ' ')
        .trim();
    } catch (e) {
      return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }, []);

  // Helper to clean notification object
  const cleanNotification = useCallback((n: Notification): Notification => {
    return {
      ...n,
      title: cleanText(n.title).substring(0, 100) || 'Notification',
      message: cleanText(n.message).substring(0, 200) || '',
    };
  }, [cleanText]);

  // Helper to enrich notification with activity_action from activity_logs
  // This is needed for real-time notifications which don't include the JOINed activity_action
  const enrichNotificationWithActivityAction = useCallback(async (
    notification: Notification,
    schoolId: number
  ): Promise<Notification> => {
    // If already has activity_action, return as is
    if (notification.activity_action) {
      return notification;
    }

    // If has activity_log_id, query activity_logs directly
    if (notification.activity_log_id) {
      const { data: activityLog } = await supabase
        .from('activity_logs')
        .select('activity_action')
        .eq('id', notification.activity_log_id)
        .maybeSingle();

      if (activityLog?.activity_action) {
        return { ...notification, activity_action: activityLog.activity_action };
      }
    }

    // If no activity_log_id, try to find matching activity log
    // This handles old notifications that weren't properly linked and real-time notifications
    if (notification.notification_type === 'report' || notification.notification_type !== 'announcement') {
      // Get teacher ID from notification title (teacher name)
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('name', notification.title)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (staffData?.id) {
        // For reports, check if message indicates delete (starts with "Report #")
        const isDeleteMessage = notification.notification_type === 'report' &&
          notification.message.includes('Report #') &&
          !notification.message.toLowerCase().includes('new') &&
          !notification.message.toLowerCase().includes('updated');

        // Query activity_logs to find a match, prioritize delete actions for reports
        const { data: activityLogs } = await supabase
          .from('activity_logs')
          .select('id, activity_action, entity_id, entity_name, created_at')
          .eq('teacher_id', staffData.id)
          .eq('school_id', schoolId)
          .eq('activity_type', notification.notification_type)
          .gte('created_at', new Date(new Date(notification.created_at).getTime() - 5 * 60 * 1000).toISOString())
          .lte('created_at', new Date(new Date(notification.created_at).getTime() + 5 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        if (activityLogs && activityLogs.length > 0) {
          // For reports, try to match by report ID in message
          if (notification.notification_type === 'report') {
            const reportIdMatch = notification.message.match(/Report #(\d+)/);
            if (reportIdMatch) {
              const reportId = parseInt(reportIdMatch[1]);
              // First try to find exact match by entity_id
              let matchingLog = activityLogs.find(
                log => log.entity_id === reportId
              );

              // If delete message, prioritize delete actions
              if (isDeleteMessage && !matchingLog) {
                matchingLog = activityLogs.find(
                  log => log.activity_action === 'delete' &&
                    (log.entity_id === reportId || log.entity_name?.includes(`Report #${reportId}`))
                );
              }

              // Fallback to entity_name match
              if (!matchingLog) {
                matchingLog = activityLogs.find(
                  log => log.entity_name?.includes(`Report #${reportId}`)
                );
              }

              if (matchingLog) {
                return {
                  ...notification,
                  activity_action: matchingLog.activity_action,
                  activity_log_id: matchingLog.id
                };
              }

              // If delete message but no exact match, use most recent delete action
              if (isDeleteMessage) {
                const deleteLog = activityLogs.find(log => log.activity_action === 'delete');
                if (deleteLog) {
                  return {
                    ...notification,
                    activity_action: deleteLog.activity_action,
                    activity_log_id: deleteLog.id
                  };
                }
              }
            }
          }

          // For other types or if no exact match, use the most recent activity log
          return {
            ...notification,
            activity_action: activityLogs[0].activity_action,
            activity_log_id: activityLogs[0].id
          };
        }
      }
    }

    return notification;
  }, []);

  // Update student and parent info when it changes
  useEffect(() => {
    const studentInfoData = getStudentInfo();
    const parentInfoData = getParentInfo();
    setStudentInfo(studentInfoData);
    setParentInfo(parentInfoData);

    // Listen for storage changes (when student/parent logs in/out)
    const handleStorageChange = () => {
      const updatedStudentInfo = getStudentInfo();
      const updatedParentInfo = getParentInfo();
      setStudentInfo(updatedStudentInfo);
      setParentInfo(updatedParentInfo);
    };

    window.addEventListener('storage', handleStorageChange);
    const customListener = handleStorageChange as EventListener;
    window.addEventListener('student-session-changed', customListener);
    window.addEventListener('parent-session-changed', customListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('student-session-changed', customListener);
      window.removeEventListener('parent-session-changed', customListener);
    };
  }, []);

  const setPanelOpen = useCallback((isOpen: boolean) => {
    panelOpenRef.current = isOpen;
  }, []);

  // Helper to get viewer identifier for announcements
  const getViewerIdentifier = useCallback(() => {
    if (studentInfo?.id) {
      return `student_${studentInfo.id}`;
    } else if (parentInfo?.id) {
      return `parent_${parentInfo.id}`;
    } else if (user?.staff_id) {
      return `staff_${user.staff_id}`;
    }
    return null;
  }, [studentInfo?.id, parentInfo?.id, user?.staff_id]);

  // Helper to check if a report notification should be shown to the current user
  // Teachers: Show reports they filed OR reports filed on them
  // Students: Show reports filed on them
  // Principal/Admin: Show all reports
  const shouldShowReportNotification = useCallback(async (
    notification: Notification,
    userRole?: string,
    staffId?: number,
    studentId?: number,
    schoolId?: number
  ): Promise<boolean> => {
    // Principal and Admin see all reports
    if (userRole === 'Principal' || userRole === 'Admin') {
      return true;
    }

    // If no staff_id or student_id, can't determine ownership
    if (!staffId && !studentId) {
      return false;
    }

    // Get report ID from activity_log_id
    let reportId: number | null = null;

    if (notification.activity_log_id) {
      const { data: activityLog } = await supabase
        .from('activity_logs')
        .select('entity_id')
        .eq('id', notification.activity_log_id)
        .maybeSingle();

      if (activityLog?.entity_id) {
        reportId = activityLog.entity_id;
      }
    }

    // If no report ID from activity log, try to extract from message
    if (!reportId && notification.message) {
      const reportIdMatch = notification.message.match(/Report #(\d+)/);
      if (reportIdMatch) {
        reportId = parseInt(reportIdMatch[1]);
      }
    }

    // If still no report ID, can't determine ownership - don't show
    if (!reportId || !schoolId) {
      return false;
    }

    // Query the report to check ownership
    const { data: report } = await supabase
      .from('reports')
      .select('reported_by, student_id, staff_id, subject_type')
      .eq('id', reportId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (!report) {
      return false; // Report doesn't exist or was deleted
    }

    // For teachers: show if they filed it OR if it's filed on them
    if (staffId) {
      return report.reported_by === staffId || report.staff_id === staffId;
    }

    // For students: show if it's filed on them
    if (studentId) {
      return report.student_id === studentId && report.subject_type === 'student';
    }

    return false;
  }, []);

  // Helper to check if notification should be shown based on category preferences
  // Note: Announcements are handled separately - students/teachers always get them, 
  // Principal/Admin get all when notify_announcements is enabled
  const shouldShowNotificationByCategory = useCallback((notification: Notification, prefs: NotificationPreferences | null, userRole?: string): boolean => {
    // Announcements are handled separately in fetchAnnouncementsAsNotifications
    // Don't filter announcements here - they're already filtered appropriately
    if (notification.notification_type === 'announcement') {
      return true;
    }

    // For non-Principal/Admin users (students, teachers), show all notifications
    // Preferences only apply to Principal/Admin
    if (userRole !== 'Principal' && userRole !== 'Admin') {
      return true;
    }

    if (!prefs) return true; // If no preferences, show all (default behavior)

    // Map notification types to preference keys (only boolean properties)
    const categoryMap: { [key: string]: 'notify_attendance' | 'notify_test_marks' | 'notify_examination_marks' | 'notify_homework_diary' | 'notify_subject_assignment' | 'notify_reports' | 'notify_system' } = {
      'attendance': 'notify_attendance',
      'test_marks': 'notify_test_marks',
      'examination_marks': 'notify_examination_marks',
      'homework_diary': 'notify_homework_diary',
      'subject_assignment': 'notify_subject_assignment',
      'report': 'notify_reports',
      'system': 'notify_system',
    };

    const preferenceKey = categoryMap[notification.notification_type];

    // If notification type doesn't have a specific preference, check general activity_notifications
    if (!preferenceKey) {
      return prefs.activity_notifications ?? true;
    }

    // Check the specific category preference (default to true if not set)
    const preferenceValue = prefs[preferenceKey];
    return typeof preferenceValue === 'boolean' ? preferenceValue : true;
  }, []);

  // Helper to check if announcement matches user's audience
  const matchesAnnouncementAudience = useCallback((announcement: any) => {
    // Ensure announcement has required fields
    if (!announcement || !announcement.audience_group) return false;

    if (studentInfo) {
      // Student user - ONLY show announcements for students
      // Explicitly reject any staff announcements
      if (announcement.audience_group !== 'students') return false;

      switch (announcement.target_scope) {
        case 'all':
          return true;
        case 'single':
        case 'multi': {
          const targetIds = [
            ...normalizeIdList(announcement.student_id),
            ...normalizeIdList(announcement.student_ids),
          ];
          return targetIds.includes(studentInfo.id);
        }
        case 'class': {
          const classMatches = !announcement.class_id || announcement.class_id === studentInfo.class_id;
          const sectionMatches = !announcement.section_id || announcement.section_id === studentInfo.section_id;
          return classMatches && sectionMatches;
        }
        default:
          return false;
      }
    } else if (user) {
      // Staff user - ONLY show announcements for staff
      // Explicitly reject any student announcements
      if (announcement.audience_group !== 'staff') return false;

      switch (announcement.target_scope) {
        case 'all':
          return true;
        case 'role':
          return !!announcement.staff_role && announcement.staff_role === user.role;
        case 'single':
        case 'multi': {
          if (!user.staff_id) return false;
          const targetIds = [
            ...normalizeIdList(announcement.staff_id),
            ...normalizeIdList(announcement.staff_ids),
          ];
          return targetIds.includes(user.staff_id);
        }
        default:
          return false;
      }
    }
    // If neither studentInfo nor user exists, don't show any announcements
    return false;
  }, [studentInfo, user]);

  // Fetch announcements and convert them to notifications
  const fetchAnnouncementsAsNotifications = useCallback(async (preferences?: NotificationPreferences | null): Promise<Notification[]> => {
    const schoolId = user?.school_id || studentInfo?.school_id;

    if (!schoolId) {
      return [];
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .lte('show_from', today)
        .or(`show_until.is.null,show_until.gte.${today}`)
        .order('created_at', { ascending: false });

      if (error || !announcements) {
        return [];
      }

      // For students and teachers: Always show announcements when they match (no preference filtering)
      // For Principal/Admin: Show ALL announcements (both student and staff targeted) when notify_announcements is enabled
      let filteredAnnouncements: any[] = [];

      if (studentInfo) {
        // Students: Only show student-targeted announcements that match them
        filteredAnnouncements = announcements.filter(announcement => {
          if (announcement.audience_group !== 'students') return false;
          return matchesAnnouncementAudience(announcement);
        });
      } else if (user) {
        // Check if user is Principal/Admin with notification settings access
        const hasNotificationSettingsAccess = user.role === 'Principal' || user.role === 'Admin';

        if (hasNotificationSettingsAccess && preferences) {
          // Principal/Admin: Show ALL announcements (both student and staff) when notify_announcements is enabled
          const notifyAnnouncements = preferences.notify_announcements ?? true;

          if (notifyAnnouncements) {
            // Show all announcements regardless of audience_group
            filteredAnnouncements = announcements;
          } else {
            // If disabled, show none
            filteredAnnouncements = [];
          }
        } else {
          // Teachers or other staff: Only show staff-targeted announcements that match them
          filteredAnnouncements = announcements.filter(announcement => {
            if (announcement.audience_group !== 'staff') return false;
            return matchesAnnouncementAudience(announcement);
          });
        }
      }

      // Get viewer identifier for checking read status
      const viewerIdentifier = getViewerIdentifier();

      if (!viewerIdentifier) {
        return [];
      }

      // Fetch announcement views to determine read status
      const { data: views } = await supabase
        .from('announcement_views')
        .select('announcement_id')
        .eq('viewer_identifier', viewerIdentifier);

      const viewedAnnouncementIds = new Set(views?.map(v => v.announcement_id) || []);

      // Transform announcements to notification format
      // Only include announcements that actually exist in the fetched list
      const announcementNotifications: Notification[] = filteredAnnouncements
        .filter(a => a && a.id) // Ensure valid announcement object
        .map(announcement => ({
          id: announcement.id,
          school_id: announcement.school_id,
          recipient_id: user?.staff_id || 0, // Use 0 for students
          notification_type: 'announcement',
          title: cleanText(announcement.title).substring(0, 100) || 'Announcement',
          message: cleanText(announcement.message).substring(0, 200) || '',
          is_read: viewedAnnouncementIds.has(announcement.id),
          is_important: false,
          created_at: announcement.created_at,
          read_at: viewedAnnouncementIds.has(announcement.id) ? announcement.created_at : null,
        }));

      return announcementNotifications;
    } catch (error) {
      return [];
    }
  }, [user?.school_id, user?.staff_id, studentInfo?.school_id, matchesAnnouncementAudience, getViewerIdentifier]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    if (window.Notification.permission === 'granted') {
      return true;
    }

    if (window.Notification.permission !== 'denied') {
      const permission = await window.Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  // Show desktop notification
  const showNotification = useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return;

    if (window.Notification.permission === 'granted' && (!preferences || preferences.push_notifications)) {
      try {
        // Get the correct icon path
        const iconPath = window.electronAPI
          ? `${process.env.PUBLIC_URL || '.'}/notification-icon.png`
          : '/notification-icon.png';

        // Windows will handle the app name in the header now that AUMID matches
        const notificationTitle = title;

        new window.Notification(notificationTitle, {
          body,
          icon: iconPath,
          badge: iconPath,
          tag: 'school-notification' // Group notifications
        });
      } catch (e) {
        // Error showing notification
      }
    }
  }, [preferences]);

  // Helper to sort notifications - chronological order (newest first)
  const sortNotifications = useCallback((notificationsList: Notification[]) => {
    const now = new Date().getTime();
    const THIRTY_MINUTES = 30 * 60 * 1000;

    const isPinned = (n: Notification) => {
      if (!n.is_important) return false;
      const created = new Date(n.created_at).getTime();
      return (now - created) < THIRTY_MINUTES;
    };

    return [...notificationsList].sort((a, b) => {
      const aPinned = isPinned(a);
      const bPinned = isPinned(b);

      // Pinned (Important < 30m) first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Then by date (newest first) - regardless of read status
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  // Load notifications
  const refreshNotifications = useCallback(async () => {
    // Prevent concurrent calls
    if (isRefreshingRef.current) {
      return;
    }

    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (!schoolId) {
      return;
    }

    isRefreshingRef.current = true;
    setIsLoading(true);
    setPage(0); // Reset page

    try {
      let allNotifications: Notification[] = [];
      let hasMoreNotifications = false;

      // For Principal/Admin: Show BOTH teacher activity notifications AND announcements
      const hasNotificationSettingsAccess = user?.role === 'Principal' || user?.role === 'Admin';

      if (hasNotificationSettingsAccess && user?.staff_id && user?.school_id) {
        // Fetch preferences with error handling
        let preferencesData: NotificationPreferences | null = null;
        try {
          preferencesData = await activityTrackingService.getNotificationPreferences(user.staff_id, user.school_id);
        } catch (error) {
          // Use default preferences if fetch fails
          preferencesData = {
            id: 0,
            user_id: user.staff_id,
            school_id: user.school_id,
            email_notifications: true,
            push_notifications: true,
            activity_notifications: true,
            system_notifications: true,
            notify_attendance: true,
            notify_test_marks: true,
            notify_examination_marks: true,
            notify_homework_diary: true,
            notify_subject_assignment: true,
            notify_reports: true,
            notify_announcements: true,
            notify_system: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }

        // Fetch notifications with pagination
        // Load all reports separately (fetched in batches to handle Supabase 1000 row limit)
        // Use user.id (users table ID) for staff, not staff_id, since notifications use recipient_id = user.id
        const [notificationsData, allReportsData, announcementNotifications] = await Promise.all([
          activityTrackingService.getUserNotifications(user.id, user.school_id, PAGE_SIZE, 0),
          activityTrackingService.getAllUserNotifications(user.id, user.school_id, 'report'), // Load all reports in batches
          fetchAnnouncementsAsNotifications(preferencesData)
        ]);

        // Separate reports from other notifications
        const allReportsRaw = allReportsData.filter(n => n.notification_type === 'report');

        // Filter reports based on user role and ownership
        // Teachers: reports they filed OR reports filed on them
        // Students: reports filed on them
        // Principal/Admin: all reports
        const allReports = await Promise.all(
          allReportsRaw.map(async (reportNotification) => {
            const shouldShow = await shouldShowReportNotification(
              reportNotification,
              user.role,
              user.staff_id,
              studentInfo?.id,
              user.school_id
            );
            return shouldShow ? reportNotification : null;
          })
        );
        const filteredReports = allReports.filter((n): n is Notification => n !== null);

        // Merge teacher activity notifications and announcements
        // Filter out any "announcement" type and "report" type notifications from the DB notifications to avoid duplicates/stale data
        const cleanNotificationsData = notificationsData.filter(n =>
          n.notification_type !== 'announcement' && n.notification_type !== 'report'
        );

        // Filter activity notifications based on category preferences (announcements already filtered in fetchAnnouncementsAsNotifications)
        // Reports are always shown regardless of preferences
        const filteredActivityNotifications = cleanNotificationsData.filter(n =>
          shouldShowNotificationByCategory(n, preferencesData, user.role)
        );

        // Combine: activity notifications + filtered reports + announcements
        allNotifications = [...filteredActivityNotifications, ...filteredReports, ...announcementNotifications];
        setPreferences(preferencesData);

        // Check if there are more notifications to load
        // If we got a full page of raw data, there might be more in the database
        // We check the raw notificationsData length because the database query returns all types mixed
        hasMoreNotifications = notificationsData.length >= PAGE_SIZE;
      } else {
        // For Teachers, Students, Parents, and other users: Show reports AND announcements AND other notifications
        // Determine user ID for fetching notifications (staff_id for staff, student_id for students, staff_id for parents via user account)
        let userId: number | undefined = user?.staff_id || studentInfo?.id;

        // For parents: Query notifications using getAllFamilyNotifications (similar to students)
        // Parents log in using family_id, so we query notifications for that family
        let parentNotificationsData: Notification[] = [];
        let allNotificationsData: Notification[] = [];
        let allReportsData: Notification[] = [];

        if (parentInfo?.id && !userId && schoolId) {
          try {
            // Fetch all notifications for parents using the family service function
            allNotificationsData = await activityTrackingService.getAllFamilyNotifications(
              parentInfo.id,
              schoolId
            );

            // Separate reports from other notifications
            allReportsData = allNotificationsData.filter(n => n.notification_type === 'report');
            parentNotificationsData = allNotificationsData.filter(n => n.notification_type !== 'report');
          } catch (error) {
            console.error('Error fetching parent notifications:', error);
          }
        } else if (userId && schoolId) {
          try {
            // Fetch all notifications from notifications table (works for both staff and students)
            allNotificationsData = await activityTrackingService.getAllUserNotifications(userId, schoolId);

            // Separate reports from other notifications
            allReportsData = allNotificationsData.filter(n => n.notification_type === 'report');

            // For students: Also query reports table directly as fallback (if no notifications found)
            if (studentInfo?.id && allReportsData.length === 0) {
              // Query reports table directly for student reports
              const { data: reports, error: reportsError } = await supabase
                .from('reports')
                .select(`
                  id,
                  reported_by,
                  student_id,
                  staff_id,
                  subject_type,
                  severity,
                  category:report_categories(name),
                  reporter:staff!reports_reported_by_fkey(name),
                  created_at
                `)
                .eq('school_id', schoolId)
                .eq('student_id', studentInfo.id)
                .eq('subject_type', 'student')
                .order('created_at', { ascending: false });

              if (!reportsError && reports) {
                // Get activity_log_id for each report
                const reportIds = reports.map(r => r.id);
                const { data: activityLogs } = await supabase
                  .from('activity_logs')
                  .select('id, entity_id')
                  .eq('school_id', schoolId)
                  .eq('activity_type', 'report')
                  .eq('activity_action', 'create')
                  .in('entity_id', reportIds);

                const activityLogMap = new Map<number, number>();
                if (activityLogs) {
                  activityLogs.forEach(log => {
                    if (log.entity_id) {
                      activityLogMap.set(log.entity_id, log.id);
                    }
                  });
                }

                // Convert reports to notification format
                allReportsData = reports.map(report => {
                  const categoryName = (report.category as any)?.name || 'Report';
                  const reporterName = (report.reporter as any)?.name || 'Unknown';
                  const severity = report.severity || 'low';
                  const activityLogId = activityLogMap.get(report.id) || null;

                  return {
                    id: report.id + 1000000, // Offset to avoid conflicts with real notification IDs
                    recipient_id: studentInfo.id,
                    school_id: schoolId,
                    notification_type: 'report',
                    title: reporterName,
                    message: `New Student Report - ${categoryName} [${severity.toUpperCase()}] - ${studentInfo.name || 'Student'}`,
                    activity_log_id: activityLogId,
                    activity_action: 'create',
                    is_read: false,
                    is_important: true,
                    created_at: report.created_at,
                    read_at: undefined
                  } as Notification;
                });
              }
            }
          } catch (error) {
            // If fetching fails (e.g., user doesn't have notifications), continue with empty array
            console.error('Error fetching notifications:', error);
          }
        }

        // Separate reports from other notifications
        const allReportsRaw = allReportsData.filter(n => n.notification_type === 'report');

        // Filter reports based on user role and ownership
        // Teachers: reports they filed OR reports filed on them
        // Students: reports filed on them (already filtered by query above)
        const filteredReports = await Promise.all(
          allReportsRaw.map(async (reportNotification) => {
            // For students, we already filtered by student_id in the query, so show all
            if (studentInfo?.id) {
              return reportNotification;
            }
            // For teachers, check ownership
            const shouldShow = await shouldShowReportNotification(
              reportNotification,
              user?.role,
              user?.staff_id,
              studentInfo?.id,
              schoolId
            );
            return shouldShow ? reportNotification : null;
          })
        );
        const validReports = filteredReports.filter((n): n is Notification => n !== null);

        // Filter out announcements and reports from allNotificationsData to avoid duplicates
        const otherNotifications = allNotificationsData.filter(n =>
          n.notification_type !== 'announcement' && n.notification_type !== 'report'
        );

        // Fetch announcements
        const announcementNotifications = await fetchAnnouncementsAsNotifications();

        // For parents: Combine all notifications (already fetched via getAllFamilyNotifications)
        if (parentInfo?.id && !userId) {
          // Combine: all parent notifications (already includes everything) + announcements
          allNotifications = [...allNotificationsData, ...announcementNotifications];
        } else {
          // Combine: other notifications (like leave_request) + filtered reports + announcements
          allNotifications = [...otherNotifications, ...validReports, ...announcementNotifications];
        }
        hasMoreNotifications = false; // Reports and announcements are all loaded at once
      }

      setHasMore(hasMoreNotifications);

      // Sort notifications: important (pinned < 30m) and unread first, then by date (newest first)
      const sortedNotifications = sortNotifications(allNotifications);

      // Calculate unread count
      const unreadNotifications = sortedNotifications.filter(n => !n.is_read).length;

      setNotifications(sortedNotifications);
      setUnreadCount(unreadNotifications);

      // Check for new notifications for desktop alert (Polling)
      if (sortedNotifications.length > 0) {
        const latestTime = new Date(sortedNotifications[0].created_at).getTime();

        // If we have a previous time recorded, and the new latest time is greater
        if (lastNotificationTimeRef.current > 0 && latestTime > lastNotificationTimeRef.current) {
          // Find all new unread notifications
          const newNotifications = sortedNotifications.filter(n =>
            new Date(n.created_at).getTime() > lastNotificationTimeRef.current && !n.is_read
          );

          newNotifications.forEach(n => {
            showNotification(n.title, n.message);
          });
        }

        // Update the ref to the latest time
        if (latestTime > lastNotificationTimeRef.current) {
          lastNotificationTimeRef.current = latestTime;
        }
      }
    } catch (error) {
      // Failed to refresh notifications
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, [user?.staff_id, user?.school_id, user?.role, studentInfo?.school_id, studentInfo?.id, fetchAnnouncementsAsNotifications, shouldShowNotificationByCategory, matchesAnnouncementAudience]);

  // Load more notifications (pagination)
  // Use refs to avoid circular dependency with hasMore and isLoading
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const pageRef = useRef(page);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const loadMore = useCallback(async () => {
    // Prevent concurrent calls
    if (isLoadingMoreRef.current) {
      return;
    }

    const hasNotificationSettingsAccess = user?.role === 'Principal' || user?.role === 'Admin';

    // Early return checks - use refs to get current values
    if (!hasMoreRef.current || isLoadingRef.current || !hasNotificationSettingsAccess || !user?.staff_id || !user?.school_id) {
      return;
    }

    isLoadingMoreRef.current = true;
    // Set loading state - don't change hasMore yet, let it stay true so UI shows loading indicator
    setIsLoading(true);

    try {
      const nextPage = pageRef.current + 1;
      const offset = nextPage * PAGE_SIZE;

      const newNotifications = await activityTrackingService.getUserNotifications(
        user.staff_id,
        user.school_id,
        PAGE_SIZE,
        offset
      );

      // Filter out announcement and report type notifications from DB
      // (announcements are loaded separately, reports are loaded separately on initial load)
      const cleanNewNotifications = newNotifications.filter(n =>
        n.notification_type !== 'announcement' && n.notification_type !== 'report'
      );

      // Filter by category preferences (reports are always shown, so they're not in this list)
      const filteredNewNotifications = cleanNewNotifications.filter(n =>
        shouldShowNotificationByCategory(n, preferences, user.role)
      );

      // Check if there are more notifications to load
      // If we got a full page of raw data, there might be more in the database
      // We check the raw newNotifications length because the database query returns all types mixed
      const hasMoreResults = newNotifications.length >= PAGE_SIZE;
      setHasMore(hasMoreResults);

      if (filteredNewNotifications.length > 0) {
        setNotifications(prev => {
          // Filter out duplicates just in case
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = filteredNewNotifications.filter(n => !existingIds.has(n.id));

          const combined = [...prev, ...uniqueNew];

          // Re-sort
          const sorted = sortNotifications(combined);
          return sorted;
        });
      }

      setPage(nextPage);
    } catch (error) {
      // Failed to load more notifications - set hasMore to false to prevent infinite loading
      setHasMore(false);
    } finally {
      setIsLoading(false);
      isLoadingMoreRef.current = false;
    }
  }, [user?.role, user?.staff_id, user?.school_id, preferences, shouldShowNotificationByCategory, sortNotifications]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: number[]) => {
    try {
      // Separate notifications by type: activity/report notifications vs announcements
      // Reports are stored in the notifications table like other activity notifications
      const activityAndReportNotifications = notifications.filter(n =>
        notificationIds.includes(n.id) && n.notification_type !== 'announcement'
      );
      const announcementNotifications = notifications.filter(n =>
        notificationIds.includes(n.id) && n.notification_type === 'announcement'
      );

      // For Principal/Admin: Mark activity and report notifications as read
      // This includes: attendance, test_marks, examination_marks, homework_diary, 
      // subject_assignment, report, system, and other activity types
      const hasNotificationSettingsAccess = user?.role === 'Principal' || user?.role === 'Admin';
      if (activityAndReportNotifications.length > 0 && hasNotificationSettingsAccess && user?.staff_id && user?.school_id) {
        await activityTrackingService.markNotificationsRead(
          user.staff_id,
          user.school_id,
          activityAndReportNotifications.map(n => n.id)
        );
      } else if (activityAndReportNotifications.length > 0) {
        // For students and parents: Directly update notifications table
        const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
        if (schoolId) {
          const notificationIds = activityAndReportNotifications.map(n => n.id);

          // For students: Update by recipient_id
          if (studentInfo?.id) {
            try {
              await supabase
                .from('notifications')
                .update({
                  is_read: true,
                  read_at: new Date().toISOString()
                })
                .in('id', notificationIds)
                .eq('recipient_id', studentInfo.id)
                .eq('school_id', schoolId);
            } catch (error) {
              console.error('Error marking student notifications as read:', error);
            }
          }

          // For parents: Update by family_recipient_id
          if (parentInfo?.id) {
            try {
              await supabase
                .from('notifications')
                .update({
                  is_read: true,
                  read_at: new Date().toISOString()
                })
                .in('id', notificationIds)
                .eq('family_recipient_id', parentInfo.id)
                .eq('school_id', schoolId);
            } catch (error) {
              console.error('Error marking parent notifications as read:', error);
            }
          }

          // For other staff users (Teachers, etc.): Update by recipient_id
          if (user?.staff_id && !hasNotificationSettingsAccess) {
            try {
              await supabase
                .from('notifications')
                .update({
                  is_read: true,
                  read_at: new Date().toISOString()
                })
                .in('id', notificationIds)
                .eq('recipient_id', user.id)
                .eq('school_id', schoolId);
            } catch (error) {
              console.error('Error marking staff notifications as read:', error);
            }
          }
        }
      }

      // For all users: Mark announcements as viewed in database
      if (announcementNotifications.length > 0) {
        const viewerIdentifier = getViewerIdentifier();
        if (viewerIdentifier) {
          const announcementIds = announcementNotifications.map(n => n.id);
          const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;

          if (schoolId) {
            // Build viewer payload
            const viewerType = studentInfo ? 'student' : (parentInfo ? 'parent' : 'staff');
            const viewerRole = studentInfo ? 'Student' : (parentInfo ? 'Parent' : (user?.role || 'Staff'));
            const viewerName = studentInfo?.name || parentInfo?.name || user?.name || 'User';

            const basePayload: any = {
              school_id: schoolId,
              viewer_type: viewerType,
              viewer_role: viewerRole,
              viewer_name: viewerName,
              viewer_identifier: viewerIdentifier,
            };

            if (studentInfo?.id) {
              basePayload.student_id = studentInfo.id;
            } else if (parentInfo?.id) {
              // For parents, we might not have a direct field, but we can use family_id if the table supports it
              // For now, just use the viewer_identifier
            } else if (user?.staff_id) {
              basePayload.staff_id = user.staff_id;
            }

            // Mark each announcement as viewed
            for (const announcementId of announcementIds) {
              try {
                await supabase
                  .from('announcement_views')
                  .upsert({
                    announcement_id: announcementId,
                    ...basePayload,
                    seen_at: new Date().toISOString()
                  }, {
                    onConflict: 'announcement_id,viewer_identifier'
                  });
              } catch (error) {
                // Failed to mark announcement as viewed, continue with others
              }
            }
          }
        }
      }

      // Update local state and re-sort (for all notification types including reports)
      setNotifications(prev => {
        const updated = prev.map(notification => {
          if (notificationIds.includes(notification.id)) {
            // Mark as read for all types: activities, reports, and announcements
            return { ...notification, is_read: true, read_at: new Date().toISOString() };
          }
          return notification;
        });
        // Re-sort to maintain chronological order
        return sortNotifications(updated);
      });

      // Update unread count - count only notifications that were actually unread before marking
      const actuallyUnread = notifications.filter(n =>
        notificationIds.includes(n.id) && !n.is_read
      ).length;
      setUnreadCount(prev => Math.max(0, prev - actuallyUnread));
    } catch (error) {
      // Failed to mark notifications as read
    }
  }, [user?.staff_id, user?.school_id, user?.role, user?.name, studentInfo, parentInfo, notifications, getViewerIdentifier, preferences, shouldShowNotificationByCategory]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }, [notifications, markAsRead]);

  // Update notification preferences (only for Principal)
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.staff_id || !user?.school_id || user?.role !== 'Principal') return;

    try {
      const updatedPreferences = await activityTrackingService.updateNotificationPreferences(
        user.staff_id,
        user.school_id,
        newPreferences
      );

      setPreferences(updatedPreferences);
    } catch (error) {
      // Failed to update notification preferences
    }
  }, [user?.staff_id, user?.school_id, user?.role]);



  const openAnnouncement = useCallback((id: number) => {
    setActiveAnnouncementId(id);
  }, []);

  const closeAnnouncement = useCallback(() => {
    setActiveAnnouncementId(null);
  }, []);

  // Subscribe to real-time notifications
  const subscribeToNotifications = useCallback(async () => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    // For staff users, use user.id (users table ID) not staff_id, since notifications use recipient_id = user.id
    let recipientId: number | undefined = user?.id || studentInfo?.id;

    // For parents: Subscribe to notifications by family_recipient_id
    // Parents log in using family_id, so we subscribe to notifications for that family
    const familyRecipientId = parentInfo?.id;

    // For parents, we need familyRecipientId; for others, we need recipientId
    if (!schoolId || (!recipientId && !familyRecipientId)) {
      return;
    }

    // Unsubscribe from existing subscription if it exists
    if (subscription) {
      supabase.removeChannel(subscription);
      setSubscription(null);
    }

    try {
      const channelName = recipientId
        ? `notifications-${schoolId}-${recipientId}`
        : `notifications-family-${schoolId}-${familyRecipientId}`;

      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: (recipientId || familyRecipientId || 'unknown').toString() }
          }
        });

      // 1. Subscribe to direct notifications (for staff with ID, students with ID)
      if (recipientId) {
        channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${recipientId}`
            },
            async (payload) => {
              const rawNotification = cleanNotification(payload.new as Notification);

              // Enrich notification with activity_action (real-time payloads don't include JOINed data)
              const newNotification = await enrichNotificationWithActivityAction(
                rawNotification,
                schoolId
              );

              // Use ref to get latest preferences
              const currentPreferences = preferencesRef.current;

              // For reports, check ownership (teachers/students only see their reports)
              // For other notifications, check category preferences
              let shouldShow = false;
              if (newNotification.notification_type === 'report') {
                shouldShow = await shouldShowReportNotification(
                  newNotification,
                  user?.role,
                  user?.staff_id,
                  studentInfo?.id,
                  schoolId
                );
              } else if (newNotification.notification_type === 'leave_request' ||
                newNotification.notification_type === 'suggestion' ||
                newNotification.notification_type === 'complaint') {
                // Always show leave_request, suggestion, and complaint notifications to the recipient
                shouldShow = true;
              } else {
                shouldShow = shouldShowNotificationByCategory(newNotification, currentPreferences, user?.role);
              }

              if (shouldShow) {
                setNotifications(prev => {
                  // Check if notification already exists (avoid duplicates)
                  const exists = prev.some(n => n.id === newNotification.id);
                  if (exists) {
                    return prev;
                  }

                  // Add new notification and sort
                  const updated = [newNotification, ...prev];
                  return sortNotifications(updated);
                });

                if (!newNotification.is_read) {
                  setUnreadCount(prev => prev + 1);
                  showNotification(newNotification.title, newNotification.message);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${recipientId}`
            },
            (payload) => {
              const updatedNotification = cleanNotification(payload.new as Notification);
              setNotifications(prev => {
                const updated = prev.map(notification =>
                  notification.id === updatedNotification.id
                    ? updatedNotification
                    : notification
                );
                // Re-sort after update
                return sortNotifications(updated);
              });

              if (payload.old.is_read !== updatedNotification.is_read) {
                setUnreadCount(prev =>
                  updatedNotification.is_read ? prev - 1 : prev + 1
                );
              }
            }
          );
      }

      // 1b. Subscribe to family notifications (for parents)
      if (familyRecipientId) {
        channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `family_recipient_id=eq.${familyRecipientId}`
            },
            async (payload) => {
              // Verify this notification is for this family
              if (payload.new?.family_recipient_id !== familyRecipientId) {
                return;
              }

              const rawNotification = cleanNotification(payload.new as Notification);

              // Enrich notification with activity_action (real-time payloads don't include JOINed data)
              const newNotification = await enrichNotificationWithActivityAction(
                rawNotification,
                schoolId
              );

              // For family notifications, show all types (leave_request, announcements, reports, etc.)
              // Always show to the recipient since they're specifically targeted
              const shouldShow = true;

              if (shouldShow) {
                setNotifications(prev => {
                  // Check if notification already exists (avoid duplicates)
                  const exists = prev.some(n => n.id === newNotification.id);
                  if (exists) {
                    return prev;
                  }

                  // Add new notification and sort
                  const updated = [newNotification, ...prev];
                  return sortNotifications(updated);
                });

                if (!newNotification.is_read) {
                  setUnreadCount(prev => prev + 1);
                  showNotification(newNotification.title, newNotification.message);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `family_recipient_id=eq.${familyRecipientId}`
            },
            (payload) => {
              const updatedNotification = cleanNotification(payload.new as Notification);
              setNotifications(prev => {
                const updated = prev.map(notification =>
                  notification.id === updatedNotification.id
                    ? updatedNotification
                    : notification
                );
                // Re-sort after update
                return sortNotifications(updated);
              });

              if (payload.old.is_read !== updatedNotification.is_read) {
                setUnreadCount(prev =>
                  updatedNotification.is_read ? prev - 1 : prev + 1
                );
              }
            }
          );
      }

      // 2. Subscribe to announcements (for everyone)
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements',
            filter: `school_id=eq.${schoolId}`
          },
          (payload) => {
            const newAnnouncement = payload.new;
            // Use ref to get latest preferences
            const currentPreferences = preferencesRef.current;

            // Determine if announcement should be shown
            const shouldShow = (() => {
              const hasNotificationSettingsAccess = user?.role === 'Principal' || user?.role === 'Admin';

              if (studentInfo) {
                // Students: Only show student-targeted announcements that match them
                return newAnnouncement.audience_group === 'students' && matchesAnnouncementAudience(newAnnouncement);
              } else if (user) {
                if (hasNotificationSettingsAccess && currentPreferences) {
                  // Principal/Admin: Show ALL announcements when notify_announcements is enabled
                  const notifyAnnouncements = currentPreferences.notify_announcements ?? true;
                  return notifyAnnouncements; // Show all if enabled
                } else {
                  // Teachers or other staff: Only show staff-targeted announcements that match them
                  return newAnnouncement.audience_group === 'staff' && matchesAnnouncementAudience(newAnnouncement);
                }
              }
              return false;
            })();

            if (shouldShow) {
              // Use user.id for staff (users table ID) or studentInfo.id for students
              const recipientId = user?.id || studentInfo?.id || 0;
              const notification: Notification = {
                id: newAnnouncement.id,
                school_id: newAnnouncement.school_id,
                recipient_id: recipientId,
                notification_type: 'announcement',
                title: cleanText(newAnnouncement.title).substring(0, 100) || 'Announcement',
                message: cleanText(newAnnouncement.message).substring(0, 200) || '',
                is_read: false,
                is_important: false,
                created_at: newAnnouncement.created_at,
                read_at: undefined
              };

              // No need to check preferences again - already handled in shouldShow logic above
              setNotifications(prev => {
                // Check if notification already exists (avoid duplicates)
                const exists = prev.some(n => n.id === notification.id && n.notification_type === 'announcement');
                if (exists) return prev;

                // Add new notification and sort
                const updated = [notification, ...prev];
                return sortNotifications(updated);
              });
              setUnreadCount(prev => prev + 1);
              showNotification(notification.title, notification.message);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'announcements',
            filter: `school_id=eq.${schoolId}`
          },
          (payload) => {
            const updatedAnnouncement = payload.new;
            // Update if it exists in our list
            setNotifications(prev => {
              const exists = prev.some(n => n.id === updatedAnnouncement.id && n.notification_type === 'announcement');
              if (!exists) return prev;

              const updated = prev.map(n => {
                if (n.id === updatedAnnouncement.id && n.notification_type === 'announcement') {
                  return {
                    ...n,
                    title: cleanText(updatedAnnouncement.title).substring(0, 100) || 'Announcement',
                    message: cleanText(updatedAnnouncement.message).substring(0, 200) || '',
                  };
                }
                return n;
              });
              // Re-sort after update
              return sortNotifications(updated);
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'announcements',
            filter: `school_id=eq.${schoolId}`
          },
          (payload) => {
            const deletedId = payload.old.id;
            setNotifications(prev => {
              const wasUnread = prev.find(n => n.id === deletedId && n.notification_type === 'announcement' && !n.is_read);
              if (wasUnread) {
                setUnreadCount(count => Math.max(0, count - 1));
              }
              return prev.filter(n => !(n.id === deletedId && n.notification_type === 'announcement'));
            });
          }
        );

      const newSubscription = channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Successfully subscribed
        } else if (status === 'CHANNEL_ERROR') {
          // Log error but don't break the app - notifications will still work via polling/refresh
          console.warn('[NotificationContext] Real-time subscription error (notifications will still work on refresh):', {
            channel: channelName,
            recipientId,
            familyRecipientId,
            schoolId,
            status
          });
        } else if (status === 'TIMED_OUT') {
          console.warn('[NotificationContext] Notification subscription timed out:', {
            channel: channelName
          });
        } else if (status === 'CLOSED') {
          // Channel closed - this is normal when unsubscribing
        }
      });
      setSubscription(newSubscription);
    } catch (error) {
      console.error('[NotificationContext] Failed to subscribe to notifications:', error);
    }
  }, [user?.id, user?.school_id, user?.role, studentInfo?.id, studentInfo?.school_id, parentInfo?.id, parentInfo?.school_id, subscription, matchesAnnouncementAudience, cleanText, cleanNotification, showNotification, enrichNotificationWithActivityAction, shouldShowNotificationByCategory, shouldShowReportNotification]);

  // Unsubscribe from notifications
  const unsubscribeFromNotifications = useCallback(() => {
    if (subscription) {
      supabase.removeChannel(subscription);
      setSubscription(null);
    }
  }, [subscription]);

  // Store functions in refs to avoid dependency issues
  const refreshNotificationsRef = useRef(refreshNotifications);
  const subscribeToNotificationsRef = useRef(subscribeToNotifications);
  const unsubscribeFromNotificationsRef = useRef(unsubscribeFromNotifications);

  useEffect(() => {
    refreshNotificationsRef.current = refreshNotifications;
  }, [refreshNotifications]);

  useEffect(() => {
    subscribeToNotificationsRef.current = subscribeToNotifications;
  }, [subscribeToNotifications]);

  useEffect(() => {
    unsubscribeFromNotificationsRef.current = unsubscribeFromNotifications;
  }, [unsubscribeFromNotifications]);

  // Load notifications on mount and when user changes
  // Only depend on actual user data, not functions
  useEffect(() => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (!schoolId) return;

    // Prevent concurrent calls
    if (isRefreshingRef.current) return;

    refreshNotificationsRef.current();
    subscribeToNotificationsRef.current();

    return () => {
      unsubscribeFromNotificationsRef.current();
    };
  }, [user?.staff_id, user?.school_id, user?.role, studentInfo?.school_id, parentInfo?.id, parentInfo?.school_id]);

  // Robust Push Initialization for push notifications
  useEffect(() => {
    const checkAndInitPush = () => {
      const latestStudentInfo = studentInfo || getStudentInfo();
      const userId = user?.staff_id || latestStudentInfo?.id;
      const schoolId = user?.school_id || latestStudentInfo?.school_id;
      const userType: 'staff' | 'student' = latestStudentInfo?.id ? 'student' : 'staff';

      if (userId && schoolId) {
        pushNotificationService.initCapacitorPush(userId, schoolId, userType);
        if (window.electronAPI) {
          pushNotificationService.initElectronPush(userId, schoolId, userType);
        }
        return true; // Successfully initialized
      }
      return false;
    };

    // Try immediately
    if (checkAndInitPush()) return;

    // Retry every 2 seconds until successful (max 5 attempts)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (checkAndInitPush() || attempts >= 5) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user?.staff_id, user?.school_id, studentInfo?.id, studentInfo?.school_id]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    preferences,
    setPanelOpen,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    activeAnnouncementId,
    openAnnouncement,
    closeAnnouncement,
    loadMore,
    hasMore,
    requestPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
