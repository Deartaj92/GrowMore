import { supabase } from '../supabaseClient';

export interface ActivityLog {
  id: number;
  teacher_id: number;
  school_id: number;
  activity_type: string;
  activity_action: string;
  entity_type: string;
  entity_id?: number;
  entity_name?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  recipient_id: number;
  school_id: number;
  notification_type: string;
  title: string;
  message: string;
  activity_log_id?: number;
  is_read: boolean;
  is_important: boolean;
  expires_at?: string;
  created_at: string;
  read_at?: string;
}

export interface NotificationPreferences {
  id: number;
  user_id: number;
  school_id: number;
  activity_notifications: boolean;
  system_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityDetails {
  class_name?: string;
  section_name?: string;
  subject_name?: string;
  student_count?: number;
  test_name?: string;
  examination_name?: string;
  marks_entered?: number;
  attendance_date?: string;
  [key: string]: any;
}

class ActivityTrackingService {
  /**
   * Log a teacher activity and create notification
   */
  async logActivity(
    teacherId: number,
    schoolId: number,
    activityType: string,
    activityAction: string,
    entityType: string,
    options: {
      entityId?: number;
      entityName?: string;
      details?: ActivityDetails;
      ipAddress?: string;
      userAgent?: string;
      createNotification?: boolean;
    } = {}
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('log_teacher_activity', {
        p_teacher_id: teacherId,
        p_school_id: schoolId,
        p_activity_type: activityType,
        p_activity_action: activityAction,
        p_entity_type: entityType,
        p_entity_id: options.entityId || null,
        p_entity_name: options.entityName || null,
        p_details: options.details || null,
        p_ip_address: options.ipAddress || null,
        p_user_agent: options.userAgent || null
      });

      if (error) {
        console.error('Error logging activity:', error);
        throw error;
      }

      // Create notification for admins if requested (only for create/update/delete, not view)
      if (options.createNotification !== false && 
          (activityAction === 'create' || activityAction === 'update' || activityAction === 'delete')) {
        try {
          await this.createNotificationForAdmins(
            teacherId,
            schoolId,
            activityType,
            activityAction,
            options.entityName || 'Activity',
            options.details
          );
        } catch (notificationError) {
          console.error('Failed to create notification:', notificationError);
          // Don't fail the activity logging if notification fails
        }
      }

      return data;
    } catch (error) {
      console.error('Activity logging failed:', error);
      throw error;
    }
  }

  /**
   * Create notification for admins about teacher activities
   */
  private async createNotificationForAdmins(
    teacherId: number,
    schoolId: number,
    activityType: string,
    activityAction: string,
    entityName: string,
    details?: ActivityDetails
  ): Promise<void> {
    try {
      // Get teacher name
      const { data: teacher, error: teacherError } = await supabase
        .from('staff')
        .select('name')
        .eq('id', teacherId)
        .single();

      if (teacherError || !teacher) {
        console.error('Error fetching teacher:', teacherError);
        return;
      }

      // Get all admins for this school
      const { data: admins, error: adminError } = await supabase
        .from('staff')
        .select('id')
        .eq('school_id', schoolId)
        .in('role', ['Super Admin', 'Principal', 'Admin']);

      if (adminError || !admins) {
        console.error('Error fetching admins:', adminError);
        return;
      }

      // Create notification for each admin
      // Mark report notifications as important for high attention
      const isImportant = activityType === 'report' && activityAction === 'create';
      
      const notifications = admins.map(admin => ({
        recipient_id: admin.id,
        school_id: schoolId,
        notification_type: activityType, // Use the actual activity type for specific icons
        title: teacher.name,
        message: this.getNotificationMessage(activityType, activityAction, entityName, details),
        is_important: isImportant,
        expires_at: null
      }));

      if (notifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (insertError) {
          console.error('Error creating notifications:', insertError);
        }
      }
    } catch (error) {
      console.error('Failed to create admin notifications:', error);
    }
  }

  /**
   * Get notification title based on activity
   */
  private getNotificationTitle(activityType: string, activityAction: string): string {
    const actionText = activityAction === 'create' ? 'Created' : 
                      activityAction === 'update' ? 'Updated' : 
                      activityAction === 'delete' ? 'Deleted' :
                      activityAction === 'view' ? 'Viewed' : 'Modified';
    
    switch (activityType) {
      case 'attendance':
        return `${actionText} Attendance`;
      case 'test_marks':
        return `${actionText} Test Marks`;
      case 'examination_marks':
        return `${actionText} Examination Marks`;
      case 'subject_assignment':
        return `${actionText} Subject Assignment`;
      case 'homework_diary':
        return `${actionText} Homework Diary`;
      case 'report':
        return `${actionText} Report`;
      default:
        return `${actionText} Activity`;
    }
  }

  /**
   * Get notification message based on activity
   */
  private getNotificationMessage(
    activityType: string, 
    activityAction: string, 
    entityName: string, 
    details?: ActivityDetails
  ): string {
    const currentDate = new Date().toLocaleDateString();
    
    switch (activityType) {
      case 'attendance':
        if (activityAction === 'delete') {
          return `Deleted Attendance - ${currentDate} - ${details?.class_name || 'Class'}${details?.section_name ? ` (${details.section_name})` : ''}`;
        }
        return `Marked Attendance - ${currentDate} - ${details?.class_name || 'Class'}${details?.section_name ? ` (${details.section_name})` : ''}`;
      case 'test_marks':
        if (activityAction === 'delete') {
          return `Deleted Test Marks - ${currentDate} - ${details?.subject_name || 'Subject'} - ${details?.test_name || 'Test'} - ${details?.marks_entered || 0} Student${(details?.marks_entered || 0) !== 1 ? 's' : ''}`;
        } else if (activityAction === 'update') {
          return `Updated Test Marks - ${currentDate} - ${details?.subject_name || 'Subject'} - ${details?.test_name || 'Test'} - ${details?.marks_entered || 0} Students`;
        }
        return `Test Marks Entered - ${currentDate} - ${details?.subject_name || 'Subject'} - ${details?.test_name || 'Test'} - ${details?.marks_entered || 0} Students`;
      case 'examination_marks':
        if (activityAction === 'delete') {
          return `Deleted Examination Marks - ${currentDate} - ${details?.subject_name || 'Subject'} - ${details?.examination_name || 'Examination'}`;
        } else if (activityAction === 'update') {
          return `Updated Examination Marks - ${currentDate} - ${details?.subject_name || 'Subject'} - ${details?.examination_name || 'Examination'}`;
        }
        return `Examination Marks Entered - ${currentDate} - ${details?.subject_name || 'Subject'} - ${details?.examination_name || 'Examination'}`;
      case 'subject_assignment':
        if (activityAction === 'delete') {
          return `Deleted Subject Assignment - ${currentDate} - ${details?.subject_count || 0} Subjects`;
        }
        return `Subject Assignment - ${currentDate} - ${details?.subject_count || 0} Subjects`;
      case 'homework_diary':
        if (activityAction === 'delete') {
          return `Deleted Homework Entry - ${currentDate} - ${details?.class_name || 'Class'}${details?.section_name ? ` (${details.section_name})` : ''} - ${details?.subject_name || 'General'}`;
        }
        return `Homework Diary - ${currentDate} - ${details?.class_name || 'Class'}${details?.section_name ? ` (${details.section_name})` : ''} - ${details?.homework_count || 0} ${details?.homework_count === 1 ? 'Entry' : 'Entries'}`;
      case 'report':
        const severityText = details?.severity ? ` [${details.severity.toUpperCase()}]` : '';
        const subjectTypeText = details?.subject_type === 'student' ? 'Student' : 'Staff';
        if (activityAction === 'delete') {
          return `Deleted ${subjectTypeText} Report - ${details?.category_name || 'Report'}${severityText} - ${details?.subject_name || 'Subject'}`;
        } else if (activityAction === 'update') {
          return `Updated ${subjectTypeText} Report - ${details?.category_name || 'Report'}${severityText} - ${details?.subject_name || 'Subject'}`;
        } else if (activityAction === 'create') {
          return `New ${subjectTypeText} Report - ${details?.category_name || 'Report'}${severityText} - ${details?.subject_name || 'Subject'}`;
        }
        return `${subjectTypeText} Report - ${details?.category_name || 'Report'}${severityText} - ${details?.subject_name || 'Subject'}`;
      default:
        return `${entityName} - ${currentDate}`;
    }
  }

  /**
   * Create a notification
   */
  async createNotification(
    recipientId: number,
    schoolId: number,
    notificationType: string,
    title: string,
    message: string,
    options: {
      activityLogId?: number;
      isImportant?: boolean;
      expiresAt?: string;
    } = {}
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_recipient_id: recipientId,
        p_school_id: schoolId,
        p_notification_type: notificationType,
        p_title: title,
        p_message: message,
        p_activity_log_id: options.activityLogId || null,
        p_is_important: options.isImportant || false,
        p_expires_at: options.expiresAt || null
      });

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Notification creation failed:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadNotificationsCount(userId: number, schoolId: number): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_unread_notifications_count', {
        p_user_id: userId,
        p_school_id: schoolId
      });

      if (error) {
        console.error('Error getting unread notifications count:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to get unread notifications count:', error);
      return 0;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: number,
    schoolId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: userId,
        p_school_id: schoolId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error getting user notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(
    userId: number,
    schoolId: number,
    notificationIds?: number[]
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('mark_notifications_read', {
        p_user_id: userId,
        p_school_id: schoolId,
        p_notification_ids: notificationIds || null
      });

      if (error) {
        console.error('Error marking notifications as read:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get recent activities for a teacher
   */
  async getTeacherRecentActivities(
    teacherId: number,
    schoolId: number,
    limit: number = 10
  ): Promise<ActivityLog[]> {
    try {
      const { data, error } = await supabase.rpc('get_teacher_recent_activities', {
        p_teacher_id: teacherId,
        p_school_id: schoolId,
        p_limit: limit
      });

      if (error) {
        console.error('Error getting teacher activities:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get teacher activities:', error);
      return [];
    }
  }

  /**
   * Get notification preferences for a user
   * Returns null if table doesn't exist (graceful fallback)
   */
  async getNotificationPreferences(userId: number, schoolId: number): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        // If table doesn't exist or RLS blocks access (406 error), return null gracefully
        if (error.code === 'PGRST406' || error.message?.includes('406')) {
          // Silently handle - table might not exist or RLS might be blocking
          return null;
        }
        // Only log non-406 errors
        console.error('Error getting notification preferences:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      // Handle 406 errors gracefully (table doesn't exist or RLS blocking)
      if (error?.code === 'PGRST406' || error?.message?.includes('406')) {
        return null;
      }
      console.error('Failed to get notification preferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences for a user
   * Returns null if table doesn't exist (graceful fallback)
   */
  async updateNotificationPreferences(
    userId: number,
    schoolId: number,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          school_id: schoolId,
          ...preferences
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist or RLS blocks access (406 error), return null gracefully
        if (error.code === 'PGRST406' || error.message?.includes('406')) {
          // Silently handle - table might not exist or RLS might be blocking
          return null;
        }
        // Only log non-406 errors
        console.error('Error updating notification preferences:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      // Handle 406 errors gracefully (table doesn't exist or RLS blocking)
      if (error?.code === 'PGRST406' || error?.message?.includes('406')) {
        return null;
      }
      console.error('Failed to update notification preferences:', error);
      return null;
    }
  }

  /**
   * Helper method to get client IP and user agent
   */
  getClientInfo(): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: undefined, // Will be handled by server-side
      userAgent: navigator.userAgent
    };
  }

  /**
   * Helper method to create activity details for attendance
   */
  createAttendanceActivityDetails(
    className: string,
    sectionName: string,
    studentCount: number,
    attendanceDate: string
  ): ActivityDetails {
    return {
      class_name: className,
      section_name: sectionName,
      student_count: studentCount,
      attendance_date: attendanceDate
    };
  }

  /**
   * Helper method to create activity details for test marks
   */
  createTestMarksActivityDetails(
    className: string,
    sectionName: string,
    subjectName: string,
    testName: string,
    marksEntered: number
  ): ActivityDetails {
    return {
      class_name: className,
      section_name: sectionName,
      subject_name: subjectName,
      test_name: testName,
      marks_entered: marksEntered
    };
  }

  /**
   * Helper method to create activity details for examination marks
   */
  createExaminationMarksActivityDetails(
    className: string,
    sectionName: string,
    subjectName: string,
    examinationName: string,
    marksEntered: number
  ): ActivityDetails {
    return {
      class_name: className,
      section_name: sectionName,
      subject_name: subjectName,
      examination_name: examinationName,
      marks_entered: marksEntered
    };
  }

  /**
   * Helper method to create activity details for homework diary
   */
  createHomeworkDiaryActivityDetails(
    className: string,
    sectionName: string | null,
    subjectName: string | null,
    homeworkDate: string,
    homeworkCount: number
  ): ActivityDetails {
    return {
      class_name: className,
      section_name: sectionName || undefined,
      subject_name: subjectName || undefined,
      homework_date: homeworkDate,
      homework_count: homeworkCount
    };
  }
}

export const activityTrackingService = new ActivityTrackingService();
