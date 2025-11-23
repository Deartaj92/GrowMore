import { supabase } from '../supabaseClient';

export interface LandingPageWidget {
  id: number;
  school_id: number;
  widget_key: string;
  widget_name: string;
  widget_type: 'stat' | 'chart' | 'list' | 'link' | 'custom';
  widget_config: Record<string, any>;
  icon_name?: string;
  color?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface LandingPageRolePreference {
  id: number;
  school_id: number;
  widget_id: number;
  role: string;
  is_visible: boolean;
  order_index: number;
  custom_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WidgetWithPreference extends LandingPageWidget {
  preference?: LandingPageRolePreference;
}

class LandingPageService {
  /**
   * Get all widgets for a school
   */
  async getWidgets(schoolId: number): Promise<LandingPageWidget[]> {
    try {
      const { data, error } = await supabase
        .from('landing_page_widgets')
        .select('*')
        .eq('school_id', schoolId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[LandingPageService] Error fetching widgets:', error);
      return [];
    }
  }

  /**
   * Get widgets visible for a specific role
   */
  async getWidgetsForRole(schoolId: number, role: string): Promise<WidgetWithPreference[]> {
    try {
      const { data, error } = await supabase
        .from('landing_page_widgets')
        .select(`
          *,
          landing_page_role_preferences!inner(*)
        `)
        .eq('school_id', schoolId)
        .eq('landing_page_role_preferences.role', role)
        .eq('landing_page_role_preferences.is_visible', true)
        .order('landing_page_role_preferences.order_index', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        preference: item.landing_page_role_preferences?.[0]
      }));
    } catch (error) {
      console.error('[LandingPageService] Error fetching widgets for role:', error);
      return [];
    }
  }

  /**
   * Get role preferences for all widgets
   */
  async getRolePreferences(schoolId: number): Promise<LandingPageRolePreference[]> {
    try {
      const { data, error } = await supabase
        .from('landing_page_role_preferences')
        .select('*')
        .eq('school_id', schoolId)
        .order('role', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[LandingPageService] Error fetching role preferences:', error);
      return [];
    }
  }

  /**
   * Create or update a widget
   */
  async upsertWidget(widget: Partial<LandingPageWidget>): Promise<LandingPageWidget> {
    try {
      const { data, error } = await supabase
        .from('landing_page_widgets')
        .upsert(widget, {
          onConflict: 'school_id,widget_key',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LandingPageService] Error upserting widget:', error);
      throw error;
    }
  }

  /**
   * Update role preference for a widget
   */
  async updateRolePreference(
    schoolId: number,
    widgetId: number,
    role: string,
    preference: Partial<LandingPageRolePreference>
  ): Promise<LandingPageRolePreference> {
    try {
      const { data, error } = await supabase
        .from('landing_page_role_preferences')
        .upsert({
          school_id: schoolId,
          widget_id: widgetId,
          role,
          ...preference
        }, {
          onConflict: 'school_id,widget_id,role',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LandingPageService] Error updating role preference:', error);
      throw error;
    }
  }

  /**
   * Delete a widget
   */
  async deleteWidget(widgetId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('landing_page_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;
    } catch (error) {
      console.error('[LandingPageService] Error deleting widget:', error);
      throw error;
    }
  }

  /**
   * Get default widgets configuration
   */
  getDefaultWidgets(): Partial<LandingPageWidget>[] {
    return [
      {
        widget_key: 'total_students',
        widget_name: 'Total Students',
        widget_type: 'stat',
        widget_config: { query: 'students', field: 'count' },
        icon_name: 'People',
        color: '#3b82f6',
        order_index: 0
      },
      {
        widget_key: 'total_teachers',
        widget_name: 'Total Teachers',
        widget_type: 'stat',
        widget_config: { query: 'staff', field: 'count', filter: { role: 'Teacher' } },
        icon_name: 'School',
        color: '#10b981',
        order_index: 1
      },
      {
        widget_key: 'attendance_today',
        widget_name: 'Attendance Today',
        widget_type: 'stat',
        widget_config: { query: 'attendance', field: 'today' },
        icon_name: 'CheckCircle',
        color: '#f59e0b',
        order_index: 2
      },
      {
        widget_key: 'pending_reports',
        widget_name: 'Pending Reports',
        widget_type: 'stat',
        widget_config: { query: 'reports', field: 'count', filter: { status: 'pending' } },
        icon_name: 'Assignment',
        color: '#ef4444',
        order_index: 3
      },
      {
        widget_key: 'quick_links',
        widget_name: 'Quick Links',
        widget_type: 'link',
        widget_config: { links: [] },
        icon_name: 'Link',
        color: '#8b5cf6',
        order_index: 4
      }
    ];
  }
}

export const landingPageService = new LandingPageService();

