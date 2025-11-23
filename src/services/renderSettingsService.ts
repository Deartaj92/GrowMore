import { supabase } from '../supabaseClient';
import { getDefaultSettings, mergeWithDefaults } from '../config/renderSettingsConfig';

export interface RenderSettings {
  teacher: Record<string, boolean>;
  student: Record<string, boolean>;
  parent: Record<string, boolean>;
  guest: Record<string, boolean>;
}

/**
 * Fetch render settings for a school
 */
export const fetchRenderSettings = async (schoolId: number): Promise<RenderSettings> => {
  try {
    const { data, error } = await supabase
      .from('render_settings')
      .select('settings')
      .eq('school_id', schoolId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      return getDefaultSettings();
    }

    if (data?.settings) {
      // Merge with defaults to ensure all new items are included
      return mergeWithDefaults(data.settings);
    }

    // Return defaults if no settings exist
    return getDefaultSettings();
  } catch (error) {
    return getDefaultSettings();
  }
};

/**
 * Check if a teacher menu card should be visible
 */
export const isTeacherCardVisible = (
  settings: RenderSettings | null,
  cardKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  return settings.teacher[cardKey] !== false;
};

/**
 * Check if a student menu card should be visible
 */
export const isStudentCardVisible = (
  settings: RenderSettings | null,
  cardKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  return settings.student[cardKey] !== false;
};

/**
 * Check if a parent menu card should be visible
 */
export const isParentCardVisible = (
  settings: RenderSettings | null,
  cardKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  return settings.parent[cardKey] !== false;
};

/**
 * Check if a student profile tab should be visible
 */
export const isStudentTabVisible = (
  settings: RenderSettings | null,
  tabKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  return settings.student[tabKey] !== false;
};

/**
 * Check if a student profile summary card should be visible
 */
export const isStudentSummaryCardVisible = (
  settings: RenderSettings | null,
  cardKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  return settings.student[cardKey] !== false;
};

/**
 * Check if a teacher profile tab should be visible
 */
export const isTeacherTabVisible = (
  settings: RenderSettings | null,
  tabKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  return settings.teacher[tabKey] !== false;
};

/**
 * Check if a teacher profile summary card should be visible
 */
export const isTeacherSummaryCardVisible = (
  settings: RenderSettings | null,
  cardKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  return settings.teacher[cardKey] !== false;
};

/**
 * Check if a guest user can access a page
 * @param settings - Render settings object (null if not loaded yet)
 * @param pageKey - Key of the page to check
 * @param allowIfNull - If true, allow access when settings are null (default: false)
 */
export const isGuestPageAccessible = (
  settings: RenderSettings | null,
  pageKey: string,
  allowIfNull: boolean = false
): boolean => {
  if (!settings) {
    // If settings are null and we allow null, return true (temporary access)
    // Otherwise, return false (deny access until settings are loaded)
    return allowIfNull || true;
  }
  // Allow by default unless explicitly disabled
  return settings.guest?.[pageKey] !== false;
};

/**
 * Check if a dashboard card should be visible to guest users
 */
export const isDashboardCardVisible = (
  settings: RenderSettings | null,
  cardKey: string
): boolean => {
  if (!settings) return true; // Default to visible if settings not loaded
  // Allow by default unless explicitly disabled
  return settings.guest?.[cardKey] !== false;
};

