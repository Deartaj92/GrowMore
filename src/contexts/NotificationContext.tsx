import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { activityTrackingService, Notification, NotificationPreferences } from '../services/activityTrackingService';
import { supabase } from '../supabaseClient';

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
    console.error('Error parsing student session:', e);
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
  const PAGE_SIZE = 20;

  // Update student info when it changes
  useEffect(() => {
    const info = getStudentInfo();
    setStudentInfo(info);
    console.log('[NotificationContext] Student info loaded:', info);

    // Listen for storage changes (when student logs in/out)
    const handleStorageChange = () => {
      const updatedInfo = getStudentInfo();
      setStudentInfo(updatedInfo);
      console.log('[NotificationContext] Student info updated:', updatedInfo);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
    console.log('[NotificationContext] Fetching announcements for school:', schoolId, 'User:', user?.role, 'Student:', studentInfo?.id);

    if (!schoolId) {
      console.log('[NotificationContext] No school ID found, skipping announcement fetch');
      return [];
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('[NotificationContext] Today:', today);

      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .lte('show_from', today)
        .or(`show_until.is.null,show_until.gte.${today}`)
        .order('created_at', { ascending: false });

      if (error || !announcements) {
        console.error('[NotificationContext] Error fetching announcements:', error);
        return [];
      }

      console.log('[NotificationContext] Found announcements:', announcements.length, announcements);

      // Filter announcements that match the user's audience
      const filteredAnnouncements = announcements.filter(matchesAnnouncementAudience);
      console.log('[NotificationContext] Filtered announcements:', filteredAnnouncements.length, filteredAnnouncements);

      // Get viewer identifier for checking read status
      const viewerIdentifier = getViewerIdentifier();
      console.log('[NotificationContext] Viewer identifier:', viewerIdentifier);

      if (!viewerIdentifier) {
        console.log('[NotificationContext] No viewer identifier, skipping');
        return [];
      }

      // Fetch announcement views to determine read status
      const { data: views } = await supabase
        .from('announcement_views')
        .select('announcement_id')
        .eq('viewer_identifier', viewerIdentifier);

      const viewedAnnouncementIds = new Set(views?.map(v => v.announcement_id) || []);
      console.log('[NotificationContext] Viewed announcements:', viewedAnnouncementIds);

      // Transform announcements to notification format
      const announcementNotifications: Notification[] = filteredAnnouncements.map(announcement => ({
        id: announcement.id,
        school_id: announcement.school_id,
        recipient_id: user?.staff_id || 0, // Use 0 for students
        notification_type: 'announcement',
        title: announcement.title?.replace(/<[^>]*>/g, '').substring(0, 100) || 'Announcement',
        message: announcement.body?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
        is_read: viewedAnnouncementIds.has(announcement.id),
        is_important: false,
        created_at: announcement.created_at,
        read_at: viewedAnnouncementIds.has(announcement.id) ? announcement.created_at : null,
      }));

      console.log('[NotificationContext] Transformed to notifications:', announcementNotifications.length, announcementNotifications);
      return announcementNotifications;
    } catch (error) {
      console.error('[NotificationContext] Error fetching announcements as notifications:', error);
      return [];
    }
  }, [user?.school_id, user?.staff_id, studentInfo?.school_id, matchesAnnouncementAudience, getViewerIdentifier]);

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
    console.log('[NotificationContext] refreshNotifications called - schoolId:', schoolId, 'user:', user?.role, 'student:', studentInfo?.id);

    if (!schoolId) {
      console.log('[NotificationContext] No school ID, skipping refresh');
      return;
    }

    setIsLoading(true);
    setPage(0); // Reset page

    try {
      let allNotifications: Notification[] = [];
      let hasMoreNotifications = false;

      // For Principal: Show BOTH teacher activity notifications AND announcements
      if (user?.role === 'Principal' && user?.staff_id && user?.school_id) {
        console.log('[NotificationContext] Fetching for Principal');
        const [notificationsData, preferencesData, announcementNotifications] = await Promise.all([
          activityTrackingService.getUserNotifications(user.staff_id, user.school_id, PAGE_SIZE, 0),
          activityTrackingService.getNotificationPreferences(user.staff_id, user.school_id),
          fetchAnnouncementsAsNotifications()
        ]);

        // Merge teacher activity notifications and announcements
        allNotifications = [...notificationsData, ...announcementNotifications];
        setPreferences(preferencesData);

        // Check if there are more notifications to load
        hasMoreNotifications = notificationsData.length >= PAGE_SIZE;
        console.log('[NotificationContext] Principal notifications:', allNotifications.length, 'Has more:', hasMoreNotifications);
      } else {
        // For all other users (Teachers, Students, etc.): Show announcements as notifications only
        console.log('[NotificationContext] Fetching announcements for non-Principal user');
        const announcementNotifications = await fetchAnnouncementsAsNotifications();
        allNotifications = announcementNotifications;
        hasMoreNotifications = false; // Announcements are all loaded at once
        console.log('[NotificationContext] Non-Principal notifications:', allNotifications.length);
      }

      setHasMore(hasMoreNotifications);

      // Sort notifications: important (pinned < 30m) and unread first, then by date (newest first)
      const sortedNotifications = sortNotifications(allNotifications);

      // Calculate unread count
      const unreadNotifications = sortedNotifications.filter(n => !n.is_read).length;

      console.log('[NotificationContext] Final notifications:', sortedNotifications.length, 'Unread:', unreadNotifications);
      setNotifications(sortedNotifications);
      setUnreadCount(unreadNotifications);
    } catch (error) {
      console.error('[NotificationContext] Failed to refresh notifications:', error);
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

      console.log('[NotificationContext] Loading more notifications, page:', nextPage, 'offset:', offset);

      const newNotifications = await activityTrackingService.getUserNotifications(
        user.staff_id,
        user.school_id,
        PAGE_SIZE,
        offset
      );

      if (newNotifications.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setNotifications(prev => {
        // Filter out duplicates just in case
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));

        const combined = [...prev, ...uniqueNew];

        // Re-sort
        return sortNotifications(combined);
      });

      setPage(nextPage);
    } catch (error) {
      console.error('[NotificationContext] Failed to load more notifications:', error);
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
      if (announcementNotifications.length > 0) {
        const viewerIdentifier = getViewerIdentifier();
        if (viewerIdentifier) {
          const schoolId = user?.school_id || studentInfo?.school_id;
          if (schoolId) {
            const viewsToInsert = announcementNotifications.map(n => ({
              announcement_id: n.id,
              school_id: schoolId,
              viewer_type: studentInfo ? 'student' : 'staff',
              viewer_role: studentInfo ? 'Student' : (user?.role || 'Staff'),
              viewer_name: studentInfo?.name || user?.name || 'Unknown',
              viewer_identifier: viewerIdentifier,
              viewer_device_id: 'web',
              ...(studentInfo ? { student_id: studentInfo.id } : { staff_id: user?.staff_id }),
            }));

            await supabase
              .from('announcement_views')
              .upsert(viewsToInsert, { onConflict: 'announcement_id,viewer_identifier' });
          }
        }
      }

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
      console.error('Failed to mark notifications as read:', error);
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
      console.error('Failed to update notification preferences:', error);
    }
  }, [user?.staff_id, user?.school_id, user?.role]);



  const openAnnouncement = useCallback((id: number) => {
    setActiveAnnouncementId(id);
  }, []);

  const closeAnnouncement = useCallback(() => {
    setActiveAnnouncementId(null);
  }, []);

  // Subscribe to real-time notifications (only for Principal)
  const subscribeToNotifications = useCallback(() => {
    if (user?.role !== 'Principal' || !user?.staff_id || !user?.school_id || subscription) {
      return;
    }

    try {
      const newSubscription = supabase
        .channel(`notifications-${user.staff_id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user.staff_id.toString() }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.staff_id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);

            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.staff_id}`
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
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
        )
        .subscribe();

      setSubscription(newSubscription);
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
    }
  }, [user?.staff_id, user?.school_id, user?.role, subscription]);

  // Unsubscribe from notifications
  const unsubscribeFromNotifications = useCallback(() => {
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(null);
    }
  }, [subscription]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (schoolId) {
      refreshNotifications();

      // Set up polling (every 30 seconds for announcements, 10 seconds for Principal)
      const pollInterval = setInterval(() => {
        if (!panelOpenRef.current) {
          refreshNotifications();
        }
      }, user?.role === 'Principal' ? 10000 : 30000);

      return () => clearInterval(pollInterval);
    }
  }, [user?.staff_id, user?.school_id, user?.role, studentInfo?.school_id, refreshNotifications]);

  // Subscribe to real-time updates (only for Principal)
  useEffect(() => {
    if (user?.role === 'Principal' && user?.staff_id && user?.school_id) {
      subscribeToNotifications();
    }

    return () => {
      unsubscribeFromNotifications();
    };
  }, [user?.staff_id, user?.school_id, user?.role, subscribeToNotifications, unsubscribeFromNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeFromNotifications();
    };
  }, [unsubscribeFromNotifications]);

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
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
