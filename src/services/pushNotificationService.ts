import { supabase } from '../supabaseClient';

const TOKEN_STORAGE_PREFIX = 'push_token_';

const getPlatformLabel = () => {
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
  async initCapacitorPush(userId: number, schoolId: number, userType: 'staff' | 'student'): Promise<{ granted: boolean; status: string }> {
    return { granted: false, status: 'not_native' };
  },

  /**
   * Initialize Push Notifications for Electron
   */
  async initElectronPush(userId: number, schoolId: number, userType: 'staff' | 'student') {
    return;
  }
};
