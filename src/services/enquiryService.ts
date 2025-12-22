import { supabase } from '../supabaseClient';
import {
  Enquiry,
  EnquiryType,
  EnquiryStatus,
  EnquiryFollowUp,
  EnquiryAttachment,
  EnquiryFormData,
  EnquiryFilters,
  EnquiryStats,
  EnquiryDashboardData
} from '../types/enquiry';
import { fetchAllRows } from '../utils/paginationHelper';

export const enquiryService = {
  // Enquiry Types (global, no school_id filter)
  async getEnquiryTypes(schoolId?: number): Promise<EnquiryType[]> {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('enquiry_types')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .range(from, to);
    });
    return data;
  },

  // Enquiry Statuses (global, no school_id filter)
  async getEnquiryStatuses(schoolId?: number): Promise<EnquiryStatus[]> {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('enquiry_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .range(from, to);
    });
    return data;
  },

  // Enquiries
  async getEnquiries(
    schoolId: number,
    filters: EnquiryFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: Enquiry[]; count: number }> {
    let query = supabase
      .from('enquiries')
      .select(`
        *,
        enquiry_types (
          id,
          name,
          description
        ),
        enquiry_statuses (
          id,
          name,
          description,
          color
        ),
        assigned_user:users!assigned_to (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('school_id', schoolId)
      .order('enquiry_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.enquiry_type_id) {
      query = query.eq('enquiry_type_id', filters.enquiry_type_id);
    }
    if (filters.status_id) {
      query = query.eq('status_id', filters.status_id);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.date_from) {
      query = query.gte('enquiry_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('enquiry_date', filters.date_to);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  async getEnquiryById(schoolId: number, enquiryId: number): Promise<Enquiry | null> {
    const { data, error } = await supabase
      .from('enquiries')
      .select(`
        *,
        enquiry_types (
          id,
          name,
          description
        ),
        enquiry_statuses (
          id,
          name,
          description,
          color
        ),
        assigned_user:users!assigned_to (
          id,
          name,
          email
        )
      `)
      .eq('school_id', schoolId)
      .eq('id', enquiryId)
      .single();

    if (error) throw error;
    return data;
  },

  async createEnquiry(schoolId: number, enquiryData: EnquiryFormData, createdBy?: number): Promise<Enquiry> {
    const { data, error } = await supabase
      .from('enquiries')
      .insert({
        school_id: schoolId,
        enquiry_type_id: enquiryData.enquiry_type_id,
        status_id: 1, // Default to 'New' status
        name: enquiryData.name,
        email: enquiryData.email,
        phone: enquiryData.phone,
        address: enquiryData.address,
        subject: enquiryData.subject,
        message: enquiryData.message,
        priority: enquiryData.priority,
        source: enquiryData.source,
        admission_details: enquiryData.admission_details,
        job_details: enquiryData.job_details,
        created_by: createdBy
      })
      .select(`
        *,
        enquiry_types (
          id,
          name,
          description
        ),
        enquiry_statuses (
          id,
          name,
          description,
          color
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateEnquiry(
    schoolId: number,
    enquiryId: number,
    updates: Partial<EnquiryFormData & { status_id?: number; assigned_to?: number; internal_notes?: string }>
  ): Promise<Enquiry> {
    const { data, error } = await supabase
      .from('enquiries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('school_id', schoolId)
      .eq('id', enquiryId)
      .select(`
        *,
        enquiry_types (
          id,
          name,
          description
        ),
        enquiry_statuses (
          id,
          name,
          description,
          color
        ),
        assigned_user:users!assigned_to (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEnquiry(schoolId: number, enquiryId: number): Promise<void> {
    const { error } = await supabase
      .from('enquiries')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', enquiryId);

    if (error) throw error;
  },

  // Follow-ups
  async getEnquiryFollowUps(schoolId: number, enquiryId: number): Promise<EnquiryFollowUp[]> {
    const { data, error } = await supabase
      .from('enquiry_follow_ups')
      .select(`
        *,
        assigned_user:users!assigned_to (
          id,
          name,
          email
        )
      `)
      .eq('school_id', schoolId)
      .eq('enquiry_id', enquiryId)
      .order('follow_up_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createFollowUp(
    schoolId: number,
    enquiryId: number,
    followUpData: Omit<EnquiryFollowUp, 'id' | 'school_id' | 'enquiry_id' | 'created_at' | 'updated_at'>,
    createdBy?: number
  ): Promise<EnquiryFollowUp> {
    const { data, error } = await supabase
      .from('enquiry_follow_ups')
      .insert({
        school_id: schoolId,
        enquiry_id: enquiryId,
        ...followUpData,
        created_by: createdBy
      })
      .select(`
        *,
        assigned_user:users!assigned_to (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateFollowUp(
    schoolId: number,
    followUpId: number,
    updates: Partial<EnquiryFollowUp>
  ): Promise<EnquiryFollowUp> {
    const { data, error } = await supabase
      .from('enquiry_follow_ups')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('school_id', schoolId)
      .eq('id', followUpId)
      .select(`
        *,
        assigned_user:users!assigned_to (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFollowUp(schoolId: number, followUpId: number): Promise<void> {
    const { error } = await supabase
      .from('enquiry_follow_ups')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', followUpId);

    if (error) throw error;
  },

  // Attachments
  async getEnquiryAttachments(schoolId: number, enquiryId: number): Promise<EnquiryAttachment[]> {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('enquiry_attachments')
        .select(`
          *,
          uploaded_user:users!uploaded_by (
            id,
            name,
            email
          )
        `)
        .eq('school_id', schoolId)
        .eq('enquiry_id', enquiryId)
        .order('uploaded_at', { ascending: false })
        .range(from, to);
    });
    return data;
  },

  async uploadAttachment(
    schoolId: number,
    enquiryId: number,
    file: File,
    description?: string,
    uploadedBy?: number
  ): Promise<EnquiryAttachment> {
    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `enquiries/${enquiryId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('enquiry-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Save attachment record
    const { data, error } = await supabase
      .from('enquiry_attachments')
      .insert({
        school_id: schoolId,
        enquiry_id: enquiryId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: fileExt,
        mime_type: file.type,
        description,
        uploaded_by: uploadedBy
      })
      .select(`
        *,
        uploaded_user:users!uploaded_by (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAttachment(schoolId: number, attachmentId: number): Promise<void> {
    // Get attachment details first
    const { data: attachment, error: fetchError } = await supabase
      .from('enquiry_attachments')
      .select('file_path')
      .eq('school_id', schoolId)
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('enquiry-attachments')
      .remove([attachment.file_path]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: dbError } = await supabase
      .from('enquiry_attachments')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', attachmentId);

    if (dbError) throw dbError;
  },

  // Statistics and Dashboard
  async getEnquiryStats(schoolId: number): Promise<EnquiryStats> {
    const [
      { data: totalEnquiries },
      { data: newEnquiries },
      { data: inProgressEnquiries },
      { data: resolvedEnquiries },
      { data: pendingFollowUps },
      { data: overdueFollowUps }
    ] = await Promise.all([
      supabase.from('enquiries').select('id', { count: 'exact' }).eq('school_id', schoolId),
      supabase.from('enquiries').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('status_id', 1),
      supabase.from('enquiries').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('status_id', 2),
      supabase.from('enquiries').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('status_id', 8),
      supabase.from('enquiry_follow_ups').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('status', 'pending'),
      supabase.from('enquiry_follow_ups').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('status', 'pending').lt('follow_up_date', new Date().toISOString())
    ]);

    // Get enquiries by type
    const enquiriesByType = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('enquiries')
        .select(`
          enquiry_type_id,
          enquiry_types!inner (name)
        `)
        .eq('school_id', schoolId)
        .range(from, to);
    });

    const typeCounts = enquiriesByType?.reduce((acc: any, item: any) => {
      const typeName = item.enquiry_types.name;
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get enquiries by status
    const enquiriesByStatus = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('enquiries')
        .select(`
          status_id,
          enquiry_statuses!inner (name, color)
        `)
        .eq('school_id', schoolId)
        .range(from, to);
    });

    const statusCounts = enquiriesByStatus?.reduce((acc: any, item: any) => {
      const statusName = item.enquiry_statuses.name;
      const color = item.enquiry_statuses.color;
      acc[statusName] = { count: (acc[statusName]?.count || 0) + 1, color };
      return acc;
    }, {}) || {};

    // Get enquiries by priority
    const enquiriesByPriority = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('enquiries')
        .select('priority')
        .eq('school_id', schoolId)
        .range(from, to);
    });

    const priorityCounts = enquiriesByPriority?.reduce((acc: any, item: any) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const { data: monthEnquiries } = await supabase
        .from('enquiries')
        .select('id', { count: 'exact' })
        .eq('school_id', schoolId)
        .gte('enquiry_date', monthStart.toISOString())
        .lte('enquiry_date', monthEnd.toISOString());

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count: monthEnquiries?.length || 0
      });
    }

    return {
      total_enquiries: totalEnquiries?.length || 0,
      new_enquiries: newEnquiries?.length || 0,
      in_progress_enquiries: inProgressEnquiries?.length || 0,
      resolved_enquiries: resolvedEnquiries?.length || 0,
      pending_follow_ups: pendingFollowUps?.length || 0,
      overdue_follow_ups: overdueFollowUps?.length || 0,
      enquiries_by_type: Object.entries(typeCounts).map(([type_name, count]) => ({
        type_name,
        count: count as number
      })),
      enquiries_by_status: Object.entries(statusCounts).map(([status_name, data]: [string, any]) => ({
        status_name,
        count: data.count,
        color: data.color
      })),
      enquiries_by_priority: Object.entries(priorityCounts).map(([priority, count]) => ({
        priority,
        count: count as number
      })),
      monthly_trends: monthlyTrends
    };
  },

  async getDashboardData(schoolId: number): Promise<EnquiryDashboardData> {
    const [
      stats,
      { data: recentEnquiries },
      { data: pendingFollowUps },
      { data: overdueFollowUps }
    ] = await Promise.all([
      this.getEnquiryStats(schoolId),
      supabase
        .from('enquiries')
        .select(`
          *,
          enquiry_types (name),
          enquiry_statuses (name, color)
        `)
        .eq('school_id', schoolId)
        .order('enquiry_date', { ascending: false })
        .limit(10),
      supabase
        .from('enquiry_follow_ups')
        .select(`
          *,
          enquiries!inner (name, subject)
        `)
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('follow_up_date', { ascending: true })
        .limit(10),
      supabase
        .from('enquiry_follow_ups')
        .select(`
          *,
          enquiries!inner (name, subject)
        `)
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .lt('follow_up_date', new Date().toISOString())
        .order('follow_up_date', { ascending: true })
        .limit(10)
    ]);

    // Get top enquiry sources
    const sourceData = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('enquiries')
        .select('source')
        .eq('school_id', schoolId)
        .range(from, to);
    });

    const sourceCounts = sourceData?.reduce((acc: any, item: any) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {}) || {};

    const topEnquirySources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      stats,
      recent_enquiries: recentEnquiries || [],
      pending_follow_ups: pendingFollowUps || [],
      overdue_follow_ups: overdueFollowUps || [],
      top_enquiry_sources: topEnquirySources
    };
  }
};
