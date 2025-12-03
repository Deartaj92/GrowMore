import { supabase } from '../supabaseClient';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const TOKEN_STORAGE_PREFIX = 'push_token_';

const getPlatformLabel = () => {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'android' or 'ios'
  }
  if ((window as any).electronAPI) {
    return 'electron';
  }
  return 'web';
};

const getTokenStorageKey = (platform: string) => `${TOKEN_STORAGE_PREFIX}${platform}`;

const persistToken = (platform: string, token: string) => {
  try {
    localStorage.setItem(getTokenStorageKey(platform), token);
  } catch (error) {
    // Failed to persist token
  }
};

const retrieveToken = (platform: string): string | null => {
  try {
    return localStorage.getItem(getTokenStorageKey(platform));
  } catch (error) {
    return null;
  }
};

export const pushNotificationService = {
  /**
   * Register the device token with the backend
   */
  async registerDeviceToken(userId: number, schoolId: number, token: string, userType: 'staff' | 'student') {
    try {
      const platform = getPlatformLabel();

      const { error } = await supabase.rpc('upsert_device_token', {
        p_user_id: userId,
        p_school_id: schoolId,
        p_platform: platform,
        p_token: token,
        p_user_type: userType,
      });

      if (error) throw error;
      persistToken(platform, token);
    } catch (error) {
      // Failed to register token
    }
  },

  async rehydrateStoredToken(userId: number, schoolId: number, userType: 'staff' | 'student') {
    const platform = getPlatformLabel();
    const storedToken = retrieveToken(platform);
    if (storedToken) {
      await this.registerDeviceToken(userId, schoolId, storedToken, userType);
    }
  },

  /**
   * Remove the device token (e.g. on logout)
   */
  async unregisterDeviceToken(token: string) {
    try {
      const { error } = await supabase
        .from('device_push_tokens')
        .delete()
        .eq('token', token);

      if (error) throw error;
    } catch (error) {
      // Failed to unregister token
    }
  },

  /**
   * Initialize Push Notifications for Capacitor
   * Always requests permission on each app start if not granted
   * Returns permission status for UI to handle denied state
   */
  async initCapacitorPush(userId: number, schoolId: number, userType: 'staff' | 'student'): Promise<{ granted: boolean; status: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { granted: false, status: 'not_native' };
    }

    try {
      // Always check permission on each app run
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[PushNotifications] Current permission status:', permStatus);

      // If not granted ("prompt" or "denied"), actively request again on each app start
      if (permStatus.receive !== 'granted') {
        console.log('[PushNotifications] Permission not granted, requesting permission on app start...');
        
        // Always request permission on each app start if not granted
        permStatus = await PushNotifications.requestPermissions();
        console.log('[PushNotifications] Permission request result:', permStatus);

        // If still not granted after request, return status for UI handling
        if (permStatus.receive !== 'granted') {
          console.warn('[PushNotifications] Permission not granted after request:', permStatus);
          
          // Return status so UI can show appropriate message
          // The app will ask again on next startup
          return { granted: false, status: permStatus.receive || 'denied' };
        }
      }

      // Permission is granted, proceed with registration
      console.log('[PushNotifications] Permission granted, proceeding with registration...');

      // Rehydrate existing token (if any) so it points to current user before requesting a new one
      await this.rehydrateStoredToken(userId, schoolId, userType);

      // Register
      await PushNotifications.register();

      // Listeners - Remove existing listeners first to avoid duplicates
      await PushNotifications.removeAllListeners();

      // Listeners
      PushNotifications.addListener('registration', (token) => {
        console.log('[PushNotifications] Registration token received:', token.value);
        this.registerDeviceToken(userId, schoolId, token.value, userType).catch(err => {
          console.error('[PushNotifications] Failed to register token:', err);
        });
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushNotifications] Registration error:', error);
      });

      // Foreground notification
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PushNotifications] Notification received in foreground:', notification);
        // The NotificationContext will handle showing the announcement modal
        // No need for alert here
      });

      // Action performed (tap)
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[PushNotifications] Notification action performed:', notification);
        // Navigate to specific page if needed
      });

      console.log('[PushNotifications] Capacitor push notifications initialized successfully');
      return { granted: true, status: 'granted' };
    } catch (error) {
      console.error('[PushNotifications] Failed to init capacitor push:', error);
      return { granted: false, status: 'error' };
    }
  },

  /**
   * Initialize Push Notifications for Electron
   */
  async initElectronPush(userId: number, schoolId: number, userType: 'staff' | 'student') {
    if (!(window as any).electronAPI) return;

    try {
      // Before starting listeners, rehydrate any stored token so it belongs to the current user
      await this.rehydrateStoredToken(userId, schoolId, userType);

      // Start the service (Replace with your Firebase Sender ID)
      // You can get this from your Firebase Console -> Project Settings -> Cloud Messaging
      const SENDER_ID = "165947503568";
      (window as any).electronAPI.startPushService(SENDER_ID);

      // Listen for token updates
      (window as any).electronAPI.onPushTokenReceived((token: string) => {
        this.registerDeviceToken(userId, schoolId, token, userType);
      });

      // Listen for notifications
      (window as any).electronAPI.onPushNotificationReceived((notification: any) => {

        // Show native notification if window is not focused or just to be sure
        if (notification.notification) {
          new Notification(notification.notification.title, {
            body: notification.notification.body,
            icon: '/favicon.ico'
          });
        }
      });

    } catch (error) {
      // Failed to init electron push
    }
  }
};
