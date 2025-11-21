import { supabase } from '../supabaseClient';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export const pushNotificationService = {
  /**
   * Register the device token with the backend
   */
  async registerDeviceToken(userId: number, schoolId: number, token: string) {
    try {
      let platform = 'web';
      if (Capacitor.isNativePlatform()) {
        platform = Capacitor.getPlatform(); // 'android' or 'ios'
      } else if (window.electronAPI) {
        platform = 'electron';
      }

      const { error } = await supabase.rpc('upsert_device_token', {
        p_user_id: userId,
        p_school_id: schoolId,
        p_platform: platform,
        p_token: token
      });

      if (error) throw error;
      console.log('[PushService] Token registered successfully');
    } catch (error) {
      console.error('[PushService] Failed to register token:', error);
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
  async initCapacitorPush(userId: number, schoolId: number) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('[PushService] Permission denied');
        return;
      }

      // Register
      await PushNotifications.register();

      // Listeners
      PushNotifications.addListener('registration', (token) => {
        console.log('[PushService] Push registration success:', token.value);
        this.registerDeviceToken(userId, schoolId, token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushService] Error on registration:', error);
      });

      // Foreground notification
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PushService] Notification received:', notification);
        // You can trigger a refresh in your NotificationContext here if needed
        // or let the existing polling/realtime handle it.
        // This listener ensures we can show a toast or update UI immediately.
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
  initElectronPush(userId: number, schoolId: number) {
    if (!(window as any).electronAPI) return;

    try {
      // Start the service (Replace with your Firebase Sender ID)
      // You can get this from your Firebase Console -> Project Settings -> Cloud Messaging
      const SENDER_ID = "165947503568"; 
      (window as any).electronAPI.startPushService(SENDER_ID);

      // Listen for token updates
      (window as any).electronAPI.onPushTokenReceived((token: string) => {
        console.log('[PushService] Electron Push Token:', token);
        this.registerDeviceToken(userId, schoolId, token);
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
