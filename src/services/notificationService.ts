import { supabase } from '../supabaseClient';

export interface UnreadCounts {
  leaveRequests: number;
  complaints: number;
  suggestions: number;
}

/**
 * Fetch unread counts for leave requests, complaints, and suggestions
 */
export const fetchUnreadCounts = async (schoolId: number): Promise<UnreadCounts> => {
  try {
    // Fetch unread leave requests (is_read = false)
    const { count: leaveRequestsCount, error: leaveRequestsError } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_read', false);

    if (leaveRequestsError) {
      console.error('Error fetching unread leave requests count:', leaveRequestsError);
    }

    // Fetch unread complaints (is_read = false)
    const { count: complaintsCount, error: complaintsError } = await supabase
      .from('complaints')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_read', false);

    if (complaintsError) {
      console.error('Error fetching unread complaints count:', complaintsError);
    }

    // Fetch unread suggestions (is_read = false)
    const { count: suggestionsCount, error: suggestionsError } = await supabase
      .from('suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_read', false);

    if (suggestionsError) {
      console.error('Error fetching unread suggestions count:', suggestionsError);
    }

    return {
      leaveRequests: leaveRequestsCount || 0,
      complaints: complaintsCount || 0,
      suggestions: suggestionsCount || 0,
    };
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    return {
      leaveRequests: 0,
      complaints: 0,
      suggestions: 0,
    };
  }
};
