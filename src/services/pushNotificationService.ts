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
   */
  async initCapacitorPush(userId: number, schoolId: number, userType: 'staff' | 'student') {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Always check permission on each app run
      let permStatus = await PushNotifications.checkPermissions();

      // If not granted ("prompt" or "denied"), actively request again
      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        return;
      }

      // Rehydrate existing token (if any) so it points to current user before requesting a new one
      await this.rehydrateStoredToken(userId, schoolId, userType);

      // Register
      await PushNotifications.register();

      // Listeners
      PushNotifications.addListener('registration', (token) => {
        this.registerDeviceToken(userId, schoolId, token.value, userType);
      });

      PushNotifications.addListener('registrationError', (error) => {
        // Error on registration
      });

      // Foreground notification
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        // The NotificationContext will handle showing the announcement modal
        // No need for alert here
      });

      // Action performed (tap)
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        // Navigate to specific page if needed
      });

    } catch (error) {
      // Failed to init capacitor push
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
