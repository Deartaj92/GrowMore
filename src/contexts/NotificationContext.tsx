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
  const [subscription, setSubscription] = useState<any>(null);
  const panelOpenRef = useRef(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [activeAnnouncementId, setActiveAnnouncementId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const lastNotificationTimeRef = useRef<number>(0);
  const PAGE_SIZE = 20;

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

  // Helper to check if announcement matches user's audience
  const matchesAnnouncementAudience = useCallback((announcement: any) => {
    if (studentInfo) {
      // Student user
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
      // Staff user
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
    return false;
  }, [studentInfo, user]);

  // Fetch announcements and convert them to notifications
  const fetchAnnouncementsAsNotifications = useCallback(async (): Promise<Notification[]> => {
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

      // Filter announcements that match the user's audience
      const filteredAnnouncements = announcements.filter(matchesAnnouncementAudience);

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

  // Helper to sort notifications
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

      // Unread notifications before read ones
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;

      // Then by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  // Load notifications
  const refreshNotifications = useCallback(async () => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (!schoolId) {
      return;
    }

    setIsLoading(true);
    setPage(0); // Reset page

    try {
      let allNotifications: Notification[] = [];
      let hasMoreNotifications = false;

      // For Principal: Show BOTH teacher activity notifications AND announcements
      if (user?.role === 'Principal' && user?.staff_id && user?.school_id) {
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }

        const [notificationsData, announcementNotifications] = await Promise.all([
          activityTrackingService.getUserNotifications(user.staff_id, user.school_id, PAGE_SIZE, 0),
          fetchAnnouncementsAsNotifications()
        ]);

        // Merge teacher activity notifications and announcements
        // Filter out any "announcement" type notifications from the DB notifications to avoid duplicates/stale data
        const cleanNotificationsData = notificationsData.filter(n => n.notification_type !== 'announcement');
        allNotifications = [...cleanNotificationsData, ...announcementNotifications];
        setPreferences(preferencesData);

        // Check if there are more notifications to load
        hasMoreNotifications = notificationsData.length >= PAGE_SIZE;
      } else {
        // For all other users (Teachers, Students, etc.): Show announcements as notifications only
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
    }
  }, [user?.staff_id, user?.school_id, user?.role, studentInfo?.school_id, studentInfo?.id, fetchAnnouncementsAsNotifications]);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || user?.role !== 'Principal' || !user?.staff_id || !user?.school_id) return;

    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const offset = nextPage * PAGE_SIZE;

      const newNotifications = await activityTrackingService.getUserNotifications(
        user.staff_id,
        user.school_id,
        PAGE_SIZE,
        offset
      );

      // Filter out announcement type notifications from DB
      const cleanNewNotifications = newNotifications.filter(n => n.notification_type !== 'announcement');

      if (newNotifications.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setNotifications(prev => {
        // Filter out duplicates just in case
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = cleanNewNotifications.filter(n => !existingIds.has(n.id));

        const combined = [...prev, ...uniqueNew];

        // Re-sort
        return sortNotifications(combined);
      });

      setPage(nextPage);
    } catch (error) {
      // Failed to load more notifications
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, page, user?.role, user?.staff_id, user?.school_id]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: number[]) => {
    try {
      // Separate teacher activity notifications from announcements
      const teacherActivityNotifications = notifications.filter(n =>
        notificationIds.includes(n.id) && n.notification_type !== 'announcement'
      );
      const announcementNotifications = notifications.filter(n =>
        notificationIds.includes(n.id) && n.notification_type === 'announcement'
      );

      // For Principal: Mark teacher activity notifications as read
      if (teacherActivityNotifications.length > 0 && user?.role === 'Principal' && user?.staff_id && user?.school_id) {
        await activityTrackingService.markNotificationsRead(
          user.staff_id,
          user.school_id,
          teacherActivityNotifications.map(n => n.id)
        );
      }

      // For all users: Mark announcements as viewed
      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      // Failed to mark notifications as read
    }
  }, [user?.staff_id, user?.school_id, user?.role, user?.name, studentInfo, notifications, getViewerIdentifier]);

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
              setNotifications(prev => [newNotification, ...prev]);

              if (!newNotification.is_read) {
                setUnreadCount(prev => prev + 1);
                showNotification(newNotification.title, newNotification.message);
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
              setNotifications(prev =>
                prev.map(notification =>
                  notification.id === updatedNotification.id
                    ? updatedNotification
                    : notification
                )
              );

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
            // Check if this announcement targets the current user
            if (matchesAnnouncementAudience(newAnnouncement)) {
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

              setNotifications(prev => [notification, ...prev]);
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

              return prev.map(n => {
                if (n.id === updatedAnnouncement.id && n.notification_type === 'announcement') {
                  return {
                    ...n,
                    title: cleanText(updatedAnnouncement.title).substring(0, 100) || 'Announcement',
                    message: cleanText(updatedAnnouncement.message).substring(0, 200) || '',
                  };
                }
                return n;
              });
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

  // Load notifications on mount and when user changes
  useEffect(() => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (schoolId) {
      refreshNotifications();
      subscribeToNotifications();

      return () => {
        unsubscribeFromNotifications();
      };
    }
  }, [user?.staff_id, user?.school_id, user?.role, studentInfo?.school_id, refreshNotifications, subscribeToNotifications, unsubscribeFromNotifications]);

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
