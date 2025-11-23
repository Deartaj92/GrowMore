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

  // Update student info when it changes
  useEffect(() => {
    const info = getStudentInfo();
    setStudentInfo(info);

    // Listen for storage changes (when student logs in/out)
    const handleStorageChange = () => {
      const updatedInfo = getStudentInfo();
      setStudentInfo(updatedInfo);
    };

    window.addEventListener('storage', handleStorageChange);
    const customListener = handleStorageChange as EventListener;
    window.addEventListener('student-session-changed', customListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('student-session-changed', customListener);
    };
  }, []);

  const setPanelOpen = useCallback((isOpen: boolean) => {
    panelOpenRef.current = isOpen;
  }, []);

  // Helper to get viewer identifier for announcements
  const getViewerIdentifier = useCallback(() => {
    if (studentInfo?.id) {
      return `student_${studentInfo.id}`;
    } else if (user?.staff_id) {
      return `staff_${user.staff_id}`;
    }
    return null;
  }, [studentInfo?.id, user?.staff_id]);

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
    
    const schoolId = user?.school_id || studentInfo?.school_id;
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
        // Load all reports separately (not paginated) - reports should always be visible
        const [notificationsData, allReportsData, announcementNotifications] = await Promise.all([
          activityTrackingService.getUserNotifications(user.staff_id, user.school_id, PAGE_SIZE, 0),
          activityTrackingService.getUserNotifications(user.staff_id, user.school_id, 10000, 0), // Load all reports
          fetchAnnouncementsAsNotifications(preferencesData)
        ]);

        // Separate reports from other notifications
        const allReports = allReportsData.filter(n => n.notification_type === 'report');
        
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
        
        // Combine: activity notifications + all reports + announcements
        allNotifications = [...filteredActivityNotifications, ...allReports, ...announcementNotifications];
        setPreferences(preferencesData);

        // Check if there are more notifications to load
        // If we got a full page of raw data, there might be more in the database
        // We check the raw notificationsData length because the database query returns all types mixed
        hasMoreNotifications = notificationsData.length >= PAGE_SIZE;
      } else {
        // For Teachers, Students, and other users: Show announcements as notifications only
        // They ALWAYS receive announcements when they match (no preference filtering)
        const announcementNotifications = await fetchAnnouncementsAsNotifications();
        allNotifications = announcementNotifications;
        hasMoreNotifications = false; // Announcements are all loaded at once
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
      }

      // For all users: Mark announcements as viewed in database
      if (announcementNotifications.length > 0) {
        const viewerIdentifier = getViewerIdentifier();
        if (viewerIdentifier) {
          const announcementIds = announcementNotifications.map(n => n.id);
          const schoolId = user?.school_id || studentInfo?.school_id;
          
          if (schoolId) {
            // Build viewer payload
            const viewerType = studentInfo ? 'student' : 'staff';
            const viewerRole = studentInfo ? 'Student' : (user?.role || 'Staff');
            const viewerName = studentInfo?.name || user?.name || 'User';
            
            const basePayload: any = {
              school_id: schoolId,
              viewer_type: viewerType,
              viewer_role: viewerRole,
              viewer_name: viewerName,
              viewer_identifier: viewerIdentifier,
            };
            
            if (studentInfo?.id) {
              basePayload.student_id = studentInfo.id;
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
  }, [user?.staff_id, user?.school_id, user?.role, user?.name, studentInfo, notifications, getViewerIdentifier, preferences, shouldShowNotificationByCategory]);

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
  const subscribeToNotifications = useCallback(() => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    const staffId = user?.staff_id;

    if (!schoolId || subscription) {
      return;
    }

    try {

      const channel = supabase
        .channel(`notifications-${schoolId}-${staffId || studentInfo?.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: (staffId || studentInfo?.id || 'unknown').toString() }
          }
        });

      // 1. Subscribe to direct notifications (only for staff with ID)
      if (staffId) {
        channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${staffId}`
            },
            (payload) => {
              const newNotification = cleanNotification(payload.new as Notification);
              
              // Use ref to get latest preferences
              const currentPreferences = preferencesRef.current;
              
              // Reports should always be shown, regardless of preferences
              // For other notifications, check category preferences
              const shouldShow = newNotification.notification_type === 'report' || 
                shouldShowNotificationByCategory(newNotification, currentPreferences, user?.role);
              
              if (shouldShow) {
                setNotifications(prev => {
                  // Check if notification already exists (avoid duplicates)
                  const exists = prev.some(n => n.id === newNotification.id);
                  if (exists) return prev;
                  
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
              filter: `recipient_id=eq.${staffId}`
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
              const notification: Notification = {
                id: newAnnouncement.id,
                school_id: newAnnouncement.school_id,
                recipient_id: staffId || 0,
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

      const newSubscription = channel.subscribe();
      setSubscription(newSubscription);
    } catch (error) {
      // Failed to subscribe to notifications
    }
  }, [user?.staff_id, user?.school_id, studentInfo, subscription, matchesAnnouncementAudience, cleanText, cleanNotification, showNotification]);

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
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (!schoolId) return;
    
    // Prevent concurrent calls
    if (isRefreshingRef.current) return;
    
    refreshNotificationsRef.current();
    subscribeToNotificationsRef.current();

    return () => {
      unsubscribeFromNotificationsRef.current();
    };
  }, [user?.staff_id, user?.school_id, user?.role, studentInfo?.school_id]);

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
