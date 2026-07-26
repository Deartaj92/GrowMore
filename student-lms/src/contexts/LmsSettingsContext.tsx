import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface LmsPortalSettings {
  portal_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  tabs: {
    dashboard: { enabled: boolean; label: string };
    attendance: { enabled: boolean; label: string };
    fees: { enabled: boolean; label: string; allow_online_payment: boolean; payment_instructions: string };
    academics: { enabled: boolean; label: string; show_class_tests: boolean; show_exam_results: boolean; default_view: 'tests' | 'exams' };
    feedback: { enabled: boolean; label: string };
    profile: { enabled: boolean; label: string; allow_password_change: boolean };
  };
}

export const DEFAULT_LMS_SETTINGS: LmsPortalSettings = {
  portal_enabled: true,
  maintenance_mode: false,
  maintenance_message: 'Student LMS Portal is currently undergoing scheduled maintenance. Please check back shortly.',
  tabs: {
    dashboard: { enabled: true, label: 'Dashboard' },
    attendance: { enabled: true, label: 'Attendance' },
    fees: { enabled: true, label: 'Fees & Challans', allow_online_payment: true, payment_instructions: '' },
    academics: { enabled: true, label: 'Academics', show_class_tests: true, show_exam_results: true, default_view: 'exams' },
    feedback: { enabled: true, label: 'Feedback' },
    profile: { enabled: true, label: 'My Profile', allow_password_change: true },
  },
};

const cleanLabel = (val: any, fallback: string) => {
  if (typeof val === 'string' && val !== '1' && val !== '0' && val.trim().length > 0) {
    return val;
  }
  return fallback;
};

const mergeSettings = (raw: any): LmsPortalSettings => {
  if (!raw) return DEFAULT_LMS_SETTINGS;
  const rawTabs = raw.tabs || {};
  return {
    portal_enabled: typeof raw.portal_enabled === 'boolean' ? raw.portal_enabled : true,
    maintenance_mode: typeof raw.maintenance_mode === 'boolean' ? raw.maintenance_mode : false,
    maintenance_message: raw.maintenance_message || DEFAULT_LMS_SETTINGS.maintenance_message,
    tabs: {
      dashboard: {
        enabled: typeof rawTabs.dashboard?.enabled === 'boolean' ? rawTabs.dashboard.enabled : true,
        label: cleanLabel(rawTabs.dashboard?.label, DEFAULT_LMS_SETTINGS.tabs.dashboard.label),
      },
      attendance: {
        enabled: typeof rawTabs.attendance?.enabled === 'boolean' ? rawTabs.attendance.enabled : true,
        label: cleanLabel(rawTabs.attendance?.label, DEFAULT_LMS_SETTINGS.tabs.attendance.label),
      },
      fees: {
        enabled: typeof rawTabs.fees?.enabled === 'boolean' ? rawTabs.fees.enabled : true,
        label: cleanLabel(rawTabs.fees?.label, DEFAULT_LMS_SETTINGS.tabs.fees.label),
        allow_online_payment: typeof rawTabs.fees?.allow_online_payment === 'boolean' ? rawTabs.fees.allow_online_payment : true,
        payment_instructions: rawTabs.fees?.payment_instructions || '',
      },
      academics: {
        enabled: typeof rawTabs.academics?.enabled === 'boolean' ? rawTabs.academics.enabled : true,
        label: cleanLabel(rawTabs.academics?.label, DEFAULT_LMS_SETTINGS.tabs.academics.label),
        show_class_tests: typeof rawTabs.academics?.show_class_tests === 'boolean' ? rawTabs.academics.show_class_tests : true,
        show_exam_results: typeof rawTabs.academics?.show_exam_results === 'boolean' ? rawTabs.academics.show_exam_results : true,
        default_view: rawTabs.academics?.default_view || 'exams',
      },
      feedback: {
        enabled: typeof rawTabs.feedback?.enabled === 'boolean' ? rawTabs.feedback.enabled : true,
        label: cleanLabel(rawTabs.feedback?.label, DEFAULT_LMS_SETTINGS.tabs.feedback.label),
      },
      profile: {
        enabled: typeof rawTabs.profile?.enabled === 'boolean' ? rawTabs.profile.enabled : true,
        label: cleanLabel(rawTabs.profile?.label, DEFAULT_LMS_SETTINGS.tabs.profile.label),
        allow_password_change: typeof rawTabs.profile?.allow_password_change === 'boolean' ? rawTabs.profile.allow_password_change : true,
      },
    },
  };
};

interface LmsSettingsContextValue {
  settings: LmsPortalSettings;
  loadingSettings: boolean;
  refreshSettings: () => Promise<void>;
}

const LmsSettingsContext = createContext<LmsSettingsContextValue>({
  settings: DEFAULT_LMS_SETTINGS,
  loadingSettings: false,
  refreshSettings: async () => {},
});

const decodeLmsSettings = (str: string): LmsPortalSettings => {
  try {
    if (!str || !str.includes('LMS:')) return DEFAULT_LMS_SETTINGS;
    const jsonPart = str.split('LMS:')[1];
    const c = JSON.parse(jsonPart);

    const parseTab = (val: any, defaultEnabled: boolean, defaultLabel: string) => {
      if (typeof val === 'number') return { enabled: val === 1, label: defaultLabel };
      if (Array.isArray(val)) {
        const strLabel = val.find((item: any) => typeof item === 'string');
        return { enabled: val[0] === 1, label: cleanLabel(strLabel, defaultLabel) };
      }
      return { enabled: defaultEnabled, label: defaultLabel };
    };

    const parseFees = (val: any) => {
      if (!Array.isArray(val)) return { enabled: true, allow_online_payment: true, label: 'Fees & Challans', payment_instructions: '' };
      const strLabel = val.find((item: any) => typeof item === 'string');
      return {
        enabled: val[0] === 1,
        allow_online_payment: val[1] === 1,
        label: cleanLabel(strLabel, 'Fees & Challans'),
        payment_instructions: '',
      };
    };

    const parseAcademics = (val: any) => {
      if (!Array.isArray(val)) return { enabled: true, show_class_tests: true, show_exam_results: true, label: 'Academics', default_view: 'exams' as const };
      const strLabel = val.find((item: any) => typeof item === 'string');
      return {
        enabled: val[0] === 1,
        show_class_tests: val[1] === 1,
        show_exam_results: val[2] === 1,
        label: cleanLabel(strLabel, 'Academics'),
        default_view: 'exams' as const,
      };
    };

    const parseProfile = (val: any) => {
      if (!Array.isArray(val)) return { enabled: true, allow_password_change: true, label: 'My Profile' };
      const strLabel = val.find((item: any) => typeof item === 'string');
      return {
        enabled: val[0] === 1,
        allow_password_change: val[1] === 1,
        label: cleanLabel(strLabel, 'My Profile'),
      };
    };

    return {
      portal_enabled: c.pe === 1,
      maintenance_mode: c.mm === 1,
      maintenance_message: c.m || DEFAULT_LMS_SETTINGS.maintenance_message,
      tabs: {
        dashboard: parseTab(c.t?.d, true, 'Dashboard'),
        attendance: parseTab(c.t?.a, true, 'Attendance'),
        fees: parseFees(c.t?.f),
        academics: parseAcademics(c.t?.c),
        feedback: parseTab(c.t?.b, true, 'Feedback'),
        profile: parseProfile(c.t?.p),
      },
    };
  } catch (e) {
    return DEFAULT_LMS_SETTINGS;
  }
};

export const LmsSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { student } = useAuth();
  const [settings, setSettings] = useState<LmsPortalSettings>(() => {
    try {
      const stored = localStorage.getItem('lms_portal_settings');
      if (stored) return mergeSettings(JSON.parse(stored));
    } catch (e) {}
    return DEFAULT_LMS_SETTINGS;
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      let fetchedSettings: LmsPortalSettings | null = null;

      // 1. Try querying dedicated lms_control_settings table
      if (student?.school_id) {
        const { data: dbData } = await supabase
          .from('lms_control_settings')
          .select('*')
          .eq('school_id', student.school_id)
          .maybeSingle();

        if (dbData) {
          fetchedSettings = {
            portal_enabled: dbData.portal_enabled ?? true,
            maintenance_mode: dbData.maintenance_mode ?? false,
            maintenance_message: dbData.maintenance_message || DEFAULT_LMS_SETTINGS.maintenance_message,
            tabs: dbData.tabs_config ? { ...DEFAULT_LMS_SETTINGS.tabs, ...dbData.tabs_config } : DEFAULT_LMS_SETTINGS.tabs,
          };
        }
      }

      // 2. Fallback to institute_profile website column
      if (!fetchedSettings && student?.school_id) {
        const { data: profileData } = await supabase
          .from('institute_profile')
          .select('website')
          .eq('school_id', student.school_id)
          .maybeSingle();

        if (profileData?.website?.includes('LMS:')) {
          fetchedSettings = decodeLmsSettings(profileData.website);
        }
      }

      if (!fetchedSettings) {
        const { data: anyProfile } = await supabase
          .from('institute_profile')
          .select('website')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyProfile?.website?.includes('LMS:')) {
          fetchedSettings = decodeLmsSettings(anyProfile.website);
        }
      }

      if (fetchedSettings) {
        setSettings(fetchedSettings);
        localStorage.setItem('lms_portal_settings', JSON.stringify(fetchedSettings));
      } else {
        const stored = localStorage.getItem('lms_portal_settings');
        if (stored) {
          try {
            setSettings(mergeSettings(JSON.parse(stored)));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Failed to load LMS portal settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  }, [student?.school_id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Real-time subscription to lms_control_settings & institute_profile changes
  useEffect(() => {
    const channel1 = supabase
      .channel('lms_control_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lms_control_settings' },
        (payload: any) => {
          if (payload.new) {
            const newSettings: LmsPortalSettings = {
              portal_enabled: payload.new.portal_enabled ?? true,
              maintenance_mode: payload.new.maintenance_mode ?? false,
              maintenance_message: payload.new.maintenance_message || DEFAULT_LMS_SETTINGS.maintenance_message,
              tabs: payload.new.tabs_config ? { ...DEFAULT_LMS_SETTINGS.tabs, ...payload.new.tabs_config } : DEFAULT_LMS_SETTINGS.tabs,
            };
            setSettings(newSettings);
            localStorage.setItem('lms_portal_settings', JSON.stringify(newSettings));
          }
        }
      )
      .subscribe();

    const channel2 = supabase
      .channel('lms_portal_profile_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'institute_profile' },
        (payload: any) => {
          if (payload.new?.website?.includes('LMS:')) {
            const decoded = decodeLmsSettings(payload.new.website);
            setSettings(decoded);
            localStorage.setItem('lms_portal_settings', JSON.stringify(decoded));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  return (
    <LmsSettingsContext.Provider value={{ settings, loadingSettings, refreshSettings: fetchSettings }}>
      {children}
    </LmsSettingsContext.Provider>
  );
};

export const useLmsSettings = () => useContext(LmsSettingsContext);
