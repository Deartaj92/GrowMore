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
  activity_action?: string; // Include activity_action to identify delete actions
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
  // Category-specific preferences
  notify_attendance?: boolean;
  notify_test_marks?: boolean;
  notify_examination_marks?: boolean;
  notify_homework_diary?: boolean;
  notify_subject_assignment?: boolean;
  notify_reports?: boolean;
  notify_announcements?: boolean;
  notify_system?: boolean;
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
        throw error;
      }

      // Create notification for admins if requested (only for create/update/delete, not view)
      console.log('[ActivityTracking] Checking if notification should be created:', {
        createNotification: options.createNotification,
        activityAction,
        activityType,
        shouldCreate: options.createNotification !== false && 
          (activityAction === 'create' || activityAction === 'update' || activityAction === 'delete')
      });
      
      if (options.createNotification !== false && 
          (activityAction === 'create' || activityAction === 'update' || activityAction === 'delete')) {
        try {
          console.log('[ActivityTracking] Creating notification for admins:', {
            teacherId,
            schoolId,
            activityType,
            activityAction,
            entityName: options.entityName,
            activityLogId: data
          });
          
          await this.createNotificationForAdmins(
            teacherId,
            schoolId,
            activityType,
            activityAction,
            options.entityName || 'Activity',
            options.details,
            data // Pass the activity_log_id (returned from log_teacher_activity)
          );
          
          console.log('[ActivityTracking] Notification creation completed');
        } catch (notificationError) {
          // Don't fail the activity logging if notification fails
          console.error('[ActivityTracking] Error creating notification:', notificationError);
        }
      } else {
        console.log('[ActivityTracking] Notification not created - conditions not met');
      }

      return data;
    } catch (error) {
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
    details?: ActivityDetails,
    activityLogId?: number
  ): Promise<void> {
    try {
      // Get teacher name and role
      const { data: teacher, error: teacherError } = await supabase
        .from('staff')
        .select('name, role')
        .eq('id', teacherId)
        .single();

      if (teacherError || !teacher) {
        return;
      }

      const isImportant = activityType === 'report' && activityAction === 'create';
      const message = this.getNotificationMessage(activityType, activityAction, entityName, details);
      const notifications: any[] = [];

      // 1. Create notifications for all admins
      const { data: admins, error: adminError } = await supabase
        .from('staff')
        .select('id')
        .eq('school_id', schoolId)
        .in('role', ['Super Admin', 'Principal', 'Admin']);

      if (!adminError && admins) {
        admins.forEach(admin => {
          notifications.push({
            recipient_id: admin.id,
            school_id: schoolId,
            notification_type: activityType,
            title: teacher.name,
            message: message,
            activity_log_id: activityLogId || null,
            is_important: isImportant,
            expires_at: null
          });
        });
      }

      // 2. For reports, also notify the teacher who created it (if not an admin) and the subject
      if (activityType === 'report' && activityAction === 'create' && activityLogId && details) {
        // Notify the teacher who created the report (if not an admin)
        const isAdmin = teacher.role === 'Super Admin' || teacher.role === 'Principal' || teacher.role === 'Admin';
        if (!isAdmin) {
          notifications.push({
            recipient_id: teacherId,
            school_id: schoolId,
            notification_type: activityType,
            title: teacher.name,
            message: message,
            activity_log_id: activityLogId,
            is_important: isImportant,
            expires_at: null
          });
        }

        // Notify the subject (student or staff) if it's a report
        // For staff reports: notify the staff member
        if (details.subject_type === 'staff' && details.staff_id) {
          notifications.push({
            recipient_id: details.staff_id,
            school_id: schoolId,
            notification_type: activityType,
            title: teacher.name,
            message: message,
            activity_log_id: activityLogId,
            is_important: isImportant,
            expires_at: null
          });
        }
        // For student reports: we can't directly notify students via notifications table
        // because recipient_id references staff(id). However, the filtering logic in
        // NotificationContext will show reports to students by querying the reports table.
      }

      if (notifications.length > 0) {
        // Validate that all recipient_ids are staff members (for FK constraint)
        const recipientIds = Array.from(new Set(notifications.map(n => n.recipient_id)));
        const { data: validStaff } = await supabase
          .from('staff')
          .select('id')
          .in('id', recipientIds);
        
        if (validStaff) {
          const validStaffIds = new Set(validStaff.map(s => s.id));
          const validNotifications = notifications.filter(n => validStaffIds.has(n.recipient_id));
          
          if (validNotifications.length > 0) {
            const { error: insertError } = await supabase
              .from('notifications')
              .insert(validNotifications);

            if (insertError) {
              console.error('[ActivityTracking] Error creating notifications:', insertError);
            } else {
              console.log('[ActivityTracking] Created notifications:', {
                count: validNotifications.length,
                activityType,
                activityAction,
                entityName,
                notificationTypes: validNotifications.map(n => n.notification_type)
              });
            }
          }
        }
      } else {
        console.warn('[ActivityTracking] No notifications to create:', {
          activityType,
          activityAction,
          adminsCount: admins?.length || 0
        });
      }
    } catch (error) {
      console.error('[ActivityTracking] Failed to create admin notifications:', error);
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
        // For delete, show the report title (entityName) prominently
        if (activityAction === 'delete') {
          // entityName is like "Report #123", show it as the main message
          return `${entityName || `Report`} - ${details?.category_name || 'Report'}${severityText} - ${details?.subject_name || 'Subject'}`;
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
        throw error;
      }

      return data;
    } catch (error) {
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
        throw error;
      }

      return data || 0;
    } catch (error) {
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
        // If function doesn't exist (42883) or other errors, return empty array gracefully
        // This prevents breaking the app if the database function hasn't been created yet
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          // Database function doesn't exist - return empty array
          return [];
        }
        // For other errors, also return empty array to prevent breaking the app
        return [];
      }

      return data || [];
    } catch (error) {
      // Return empty array on any error to prevent breaking the app
      return [];
    }
  }

  /**
   * Enrich notifications with activity_action by querying activity_logs
   * This is a fallback for notifications that don't have activity_log_id set
   */
  private async enrichNotificationsWithActivityAction(
    notifications: Notification[],
    schoolId: number
  ): Promise<Notification[]> {
    // Find notifications that need enrichment (have null activity_action but are activity-based)
    const needsEnrichment = notifications.filter(
      n => !n.activity_action && n.notification_type !== 'announcement' && n.notification_type !== 'system'
    );

    if (needsEnrichment.length === 0) {
      return notifications;
    }

    // Get all staff names to match with notification titles
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name')
      .eq('school_id', schoolId);

    if (!staffData) {
      return notifications;
    }

    const staffMap = new Map(staffData.map(s => [s.name, s.id]));

    // For each notification, try to find matching activity log
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        // If already has activity_action, return as is
        if (notification.activity_action) {
          return notification;
        }

        // Skip if not an activity-based notification
        if (notification.notification_type === 'announcement' || notification.notification_type === 'system') {
          return notification;
        }

        // Try to find matching activity log
        const teacherId = staffMap.get(notification.title);
        if (!teacherId) {
          return notification;
        }

        // Query activity_logs to find a match
        // Match on: activity_type, teacher_id, school_id, and time proximity
        const { data: activityLogs } = await supabase
          .from('activity_logs')
          .select('id, activity_action, entity_id, entity_name, created_at')
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId)
          .eq('activity_type', notification.notification_type)
          .gte('created_at', new Date(new Date(notification.created_at).getTime() - 5 * 60 * 1000).toISOString())
          .lte('created_at', new Date(new Date(notification.created_at).getTime() + 5 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (!activityLogs || activityLogs.length === 0) {
          return notification;
        }

        // Try to match by entity_name in message (for reports: "Report #123")
        if (notification.notification_type === 'report') {
          const reportIdMatch = notification.message.match(/Report #(\d+)/);
          if (reportIdMatch) {
            const reportId = parseInt(reportIdMatch[1]);
            const matchingLog = activityLogs.find(
              log => log.entity_id === reportId || log.entity_name?.includes(`Report #${reportId}`)
            );
            if (matchingLog) {
              return { ...notification, activity_action: matchingLog.activity_action, activity_log_id: matchingLog.id };
            }
          }
        }

        // For other types, try to match by entity_name in message
        const matchingLog = activityLogs.find(log => {
          if (log.entity_name && notification.message.includes(log.entity_name)) {
            return true;
          }
          return false;
        });

        if (matchingLog) {
          return { ...notification, activity_action: matchingLog.activity_action, activity_log_id: matchingLog.id };
        }

        // If no exact match, use the most recent activity log (best guess)
        return { ...notification, activity_action: activityLogs[0].activity_action, activity_log_id: activityLogs[0].id };
      })
    );

    return enrichedNotifications;
  }

  /**
   * Get all notifications for a user (fetches in batches to handle Supabase 1000 row limit)
   * Fetches all notifications first, then filters by type if specified
   */
  async getAllUserNotifications(
    userId: number,
    schoolId: number,
    notificationType?: string
  ): Promise<Notification[]> {
    const BATCH_SIZE = 1000; // Supabase limit per query
    const allNotifications: Notification[] = [];
    let offset = 0;
    let hasMore = true;

    try {
      // Fetch all notifications in batches
      while (hasMore) {
        const batch = await this.getUserNotifications(userId, schoolId, BATCH_SIZE, offset);
        
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        allNotifications.push(...batch);

        // If we got less than BATCH_SIZE, we've reached the end
        if (batch.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          offset += BATCH_SIZE;
        }
      }

      // Enrich notifications with activity_action if missing (fallback for old notifications)
      const enrichedNotifications = await this.enrichNotificationsWithActivityAction(allNotifications, schoolId);

      // Filter by notification type if specified (after fetching all)
      if (notificationType) {
        return enrichedNotifications.filter(n => n.notification_type === notificationType);
      }

      return enrichedNotifications;
    } catch (error) {
      // Return what we have so far on error, filtered if needed
      if (notificationType) {
        return allNotifications.filter(n => n.notification_type === notificationType);
      }
      return allNotifications;
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
        throw error;
      }

      return data;
    } catch (error) {
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
        throw error;
      }

      return data || [];
    } catch (error) {
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
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no rows found

      // Handle 406 errors gracefully (table doesn't exist or RLS blocking)
      if (error) {
        // PGRST116 = no rows returned (this is fine, return null)
        if (error.code === 'PGRST116') {
          return null;
        }
        // PGRST406 = Not Acceptable (table doesn't exist or RLS blocking)
        // Check for 406 in message or code
        if (error.code === 'PGRST406' || error.message?.includes('406') || (error as any).status === 406) {
          return null;
        }
        // For other errors, still return null gracefully to avoid breaking the app
        return null;
      }

      return data;
    } catch (error: any) {
      // Handle all errors gracefully - return null instead of throwing
      // This prevents console errors from breaking the app
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
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors

      // Handle 406 errors gracefully (table doesn't exist or RLS blocking)
      if (error) {
        // PGRST406 = Not Acceptable (table doesn't exist or RLS blocking)
        // Check for 406 in message or code
        if (error.code === 'PGRST406' || error.message?.includes('406') || (error as any).status === 406) {
          return null;
        }
        // For other errors, still return null gracefully
        return null;
      }

      return data;
    } catch (error: any) {
      // Handle all errors gracefully - return null instead of throwing
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
