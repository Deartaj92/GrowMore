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
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: null,
  setPanelOpen: () => {},
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  updatePreferences: async () => {},
  subscribeToNotifications: () => {},
  unsubscribeFromNotifications: () => {},
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

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const panelOpenRef = useRef(false);

  const setPanelOpen = useCallback((isOpen: boolean) => {
    panelOpenRef.current = isOpen;
  }, []);

  // Load notifications
  const refreshNotifications = useCallback(async () => {
    if (!user?.staff_id || !user?.school_id) return;

    setIsLoading(true);
    try {
      const [notificationsData, unreadCountData, preferencesData] = await Promise.all([
        activityTrackingService.getUserNotifications(user.staff_id, user.school_id),
        activityTrackingService.getUnreadNotificationsCount(user.staff_id, user.school_id),
        activityTrackingService.getNotificationPreferences(user.staff_id, user.school_id)
      ]);

      // Filter out teacher activity notifications for teachers and students
      const teacherActivityTypes = ['attendance', 'test_marks', 'examination_marks', 'subject_assignment', 'homework_diary', 'class_management', 'student_management'];
      const filteredNotifications = (user?.role === 'Teacher' || user?.role === 'Student') 
        ? notificationsData.filter(notification => !teacherActivityTypes.includes(notification.notification_type))
        : notificationsData;
      
      // Sort notifications: important and unread first, then by date (newest first)
      const sortedNotifications = [...filteredNotifications].sort((a, b) => {
        // Important notifications first
        if (a.is_important && !b.is_important) return -1;
        if (!a.is_important && b.is_important) return 1;
        
        // Unread notifications before read ones
        if (!a.is_read && b.is_read) return -1;
        if (a.is_read && !b.is_read) return 1;
        
        // Then by date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Recalculate unread count for filtered notifications
      const filteredUnreadCount = sortedNotifications.filter(n => !n.is_read).length;

      setNotifications(sortedNotifications);
      setUnreadCount(filteredUnreadCount);
      setPreferences(preferencesData);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.staff_id, user?.school_id, user?.role]);

  // Mark notifications as read (only when explicitly requested)
  const markAsRead = useCallback(async (notificationIds: number[]) => {
    if (!user?.staff_id || !user?.school_id) return;

    try {
      await activityTrackingService.markNotificationsRead(
        user.staff_id,
        user.school_id,
        notificationIds
      );

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
  }, [user?.staff_id, user?.school_id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.staff_id || !user?.school_id) return;

    try {
      await activityTrackingService.markNotificationsRead(user.staff_id, user.school_id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [user?.staff_id, user?.school_id]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.staff_id || !user?.school_id) return;

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
  }, [user?.staff_id, user?.school_id]);

  // Subscribe to real-time notifications
  const subscribeToNotifications = useCallback(() => {
    if (!user?.staff_id || !user?.school_id || subscription) {
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
            // Add new notification to the list
            const newNotification = payload.new as Notification;
            
            // Filter out teacher activity notifications for teachers and students
            const teacherActivityTypes = ['attendance', 'test_marks', 'examination_marks', 'subject_assignment', 'homework_diary', 'class_management', 'student_management'];
            const shouldFilter = (user?.role === 'Teacher' || user?.role === 'Student') && teacherActivityTypes.includes(newNotification.notification_type);
            
            if (!shouldFilter) {
              setNotifications(prev => [newNotification, ...prev]);
              
              // Update unread count
              if (!newNotification.is_read) {
                setUnreadCount(prev => prev + 1);
                
                // Show toast notification
                showToastNotification(newNotification);
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
            filter: `recipient_id=eq.${user.staff_id}`
          },
          (payload) => {
            // Update notification in the list
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => 
              prev.map(notification => 
                notification.id === updatedNotification.id 
                  ? updatedNotification 
                  : notification
              )
            );
            
            // Update unread count if read status changed
            if (payload.old.is_read !== updatedNotification.is_read) {
              setUnreadCount(prev => 
                updatedNotification.is_read ? prev - 1 : prev + 1
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            // Fallback to polling every 30 seconds
            const pollInterval = setInterval(() => {
              refreshNotifications();
            }, 30000);
            
            // Store interval for cleanup
            setSubscription({ unsubscribe: () => clearInterval(pollInterval) });
          }
        });

      setSubscription(newSubscription);
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
    }
  }, [user?.staff_id, user?.school_id, user?.role, subscription, refreshNotifications]);

  // Unsubscribe from notifications
  const unsubscribeFromNotifications = useCallback(() => {
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(null);
    }
  }, [subscription]);

  // Show toast notification
  const showToastNotification = useCallback((notification: Notification) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideInRight 0.3s ease-out;
    `;
    
    // Add animation keyframes
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Get notification icon
    const getNotificationIcon = (type: string, isImportant: boolean) => {
      if (isImportant) return '❌';
      switch (type) {
        case 'attendance': return '👤';
        case 'test_marks': return '📊';
        case 'examination_marks': return '🎓';
        case 'subject_assignment': return '📝';
        case 'class_management': return '🏫';
        case 'student_management': return '👥';
        default: return '🔔';
      }
    };
    
    // Format time
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return date.toLocaleDateString();
    };
    
    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <div style="font-size: 16px; margin-top: 2px;">
          ${getNotificationIcon(notification.notification_type, notification.is_important)}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="font-weight: 600; font-size: 14px; color: #333;">${notification.title}</div>
            <div style="font-size: 12px; color: #666;">${formatTime(notification.created_at)}</div>
          </div>
          <div style="font-size: 13px; color: #666; line-height: 1.3;">${notification.message}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    });
  }, []);

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user?.staff_id && user?.school_id) {
      refreshNotifications();
      
      // Set up polling as fallback (every 10 seconds)
      const pollInterval = setInterval(() => {
        if (!panelOpenRef.current) {
          refreshNotifications();
        }
      }, 10000);
      
      return () => clearInterval(pollInterval);
    }
  }, [user?.staff_id, user?.school_id, refreshNotifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (user?.staff_id && user?.school_id) {
      subscribeToNotifications();
    }

    return () => {
      unsubscribeFromNotifications();
    };
  }, [user?.staff_id, user?.school_id, subscribeToNotifications, unsubscribeFromNotifications]);

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
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
