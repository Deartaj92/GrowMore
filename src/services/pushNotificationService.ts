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
    console.warn('[PushService] Failed to persist token:', error);
  }
};

const retrieveToken = (platform: string): string | null => {
  try {
    return localStorage.getItem(getTokenStorageKey(platform));
  } catch (error) {
    console.warn('[PushService] Failed to read stored token:', error);
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
      console.log('[PushService] Token registered successfully');
      persistToken(platform, token);
    } catch (error) {
      console.error('[PushService] Failed to register token:', error);
    }
  },

  async rehydrateStoredToken(userId: number, schoolId: number, userType: 'staff' | 'student') {
    const platform = getPlatformLabel();
    const storedToken = retrieveToken(platform);
    if (storedToken) {
      console.log('[PushService] Rehydrating stored token for platform:', platform);
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
      console.error('[PushService] Failed to unregister token:', error);
    }
  },

  /**
   * Initialize Push Notifications for Capacitor
   */
  async initCapacitorPush(userId: number, schoolId: number, userType: 'staff' | 'student') {
    if (!Capacitor.isNativePlatform()) return;

    try {
      console.log('[PushService] Checking permissions...');
      // Always check permission on each app run
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[PushService] Current permission:', permStatus.receive);

      // If not granted ("prompt" or "denied"), actively request again
      if (permStatus.receive !== 'granted') {
        console.log('[PushService] Requesting permission (not granted)...');
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('[PushService] Permission still not granted after request:', permStatus.receive);
        return;
      }

      console.log('[PushService] Permission granted. Registering with FCM...');

      // Rehydrate existing token (if any) so it points to current user before requesting a new one
      await this.rehydrateStoredToken(userId, schoolId, userType);

      // Register
      await PushNotifications.register();
      console.log('[PushService] Register call made. Waiting for listener...');

      // Listeners
      PushNotifications.addListener('registration', (token) => {
        console.log('[PushService] Push registration success! Token:', token.value);
        this.registerDeviceToken(userId, schoolId, token.value, userType);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushService] Error on registration:', error);
      });

      // Foreground notification
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PushService] Notification received:', notification);
        // The NotificationContext will handle showing the announcement modal
        // No need for alert here
      });

      // Action performed (tap)
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[PushService] Notification action performed:', notification);
        // Navigate to specific page if needed
      });

    } catch (error) {
      console.error('[PushService] Failed to init capacitor push:', error);
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
        console.log('[PushService] Electron Push Token:', token);
        this.registerDeviceToken(userId, schoolId, token, userType);
      });

      // Listen for notifications
      (window as any).electronAPI.onPushNotificationReceived((notification: any) => {
        console.log('[PushService] Electron Notification Received:', notification);

        // Show native notification if window is not focused or just to be sure
        if (notification.notification) {
          new Notification(notification.notification.title, {
            body: notification.notification.body,
            icon: '/favicon.ico'
          });
        }
      });

    } catch (error) {
      console.error('[PushService] Failed to init electron push:', error);
    }
  }
};
