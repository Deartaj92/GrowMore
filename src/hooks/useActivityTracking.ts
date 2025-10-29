import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { activityTrackingService, ActivityDetails } from '../services/activityTrackingService';

export const useActivityTracking = () => {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    activityType: string,
    activityAction: string,
    entityType: string,
    options: {
      entityId?: number;
      entityName?: string;
      details?: ActivityDetails;
      createNotification?: boolean;
    } = {}
  ) => {
    if (!user?.staff_id || !user?.school_id) {
      console.warn('Cannot log activity: user not authenticated');
      return;
    }

    try {
      const clientInfo = activityTrackingService.getClientInfo();
      
      const activityId = await activityTrackingService.logActivity(
        user.staff_id,
        user.school_id,
        activityType,
        activityAction,
        entityType,
        {
          ...options,
          ...clientInfo
        }
      );

      console.log(`Activity logged: ${activityType} - ${activityAction}`, { activityId });
      return activityId;
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
    }
  }, [user?.staff_id, user?.school_id]);

  const logAttendanceActivity = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'view',
    className: string,
    sectionName: string,
    studentCount: number,
    attendanceDate: string,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
    } = {}
  ) => {
    const details = activityTrackingService.createAttendanceActivityDetails(
      className,
      sectionName,
      studentCount,
      attendanceDate
    );

    return logActivity(
      'attendance',
      action,
      'attendance',
      {
        ...options,
        details
      }
    );
  }, [logActivity]);

  const logTestMarksActivity = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'view',
    className: string,
    sectionName: string,
    subjectName: string,
    testName: string,
    marksEntered: number,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
    } = {}
  ) => {
    const details = activityTrackingService.createTestMarksActivityDetails(
      className,
      sectionName,
      subjectName,
      testName,
      marksEntered
    );

    return logActivity(
      'test_marks',
      action,
      'test_record',
      {
        ...options,
        details
      }
    );
  }, [logActivity]);

  const logExaminationMarksActivity = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'view',
    className: string,
    sectionName: string,
    subjectName: string,
    examinationName: string,
    marksEntered: number,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
    } = {}
  ) => {
    const details = activityTrackingService.createExaminationMarksActivityDetails(
      className,
      sectionName,
      subjectName,
      examinationName,
      marksEntered
    );

    return logActivity(
      'examination_marks',
      action,
      'examination_marks',
      {
        ...options,
        details
      }
    );
  }, [logActivity]);

  const logSubjectAssignmentActivity = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'view',
    teacherName: string,
    subjectCount: number,
    classCount: number,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
    } = {}
  ) => {
    const details: ActivityDetails = {
      teacher_name: teacherName,
      subject_count: subjectCount,
      class_count: classCount
    };

    return logActivity(
      'subject_assignment',
      action,
      'teacher_subject',
      {
        ...options,
        details
      }
    );
  }, [logActivity]);

  const logClassManagementActivity = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'view',
    className: string,
    sectionName?: string,
    studentCount?: number,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
    } = {}
  ) => {
    const details: ActivityDetails = {
      class_name: className,
      section_name: sectionName,
      student_count: studentCount
    };

    return logActivity(
      'class_management',
      action,
      'class',
      {
        ...options,
        details
      }
    );
  }, [logActivity]);

  const logStudentManagementActivity = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'view',
    studentName: string,
    className: string,
    sectionName?: string,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
    } = {}
  ) => {
    const details: ActivityDetails = {
      student_name: studentName,
      class_name: className,
      section_name: sectionName
    };

    return logActivity(
      'student_management',
      action,
      'student',
      {
        ...options,
        details
      }
    );
  }, [logActivity]);

  return {
    logActivity,
    logAttendanceActivity,
    logTestMarksActivity,
    logExaminationMarksActivity,
    logSubjectAssignmentActivity,
    logClassManagementActivity,
    logStudentManagementActivity,
  };
};

export default useActivityTracking;
