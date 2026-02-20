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

      return activityId;
    } catch (error) {
      throw error;
    }
  }, [user?.staff_id, user?.school_id]);

  const logAttendanceActivity = useCallback(async (
    action: 'create' | 'update' | 'delete',
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
    action: 'create' | 'update' | 'delete',
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

  const logHomeworkDiaryActivity = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'view',
    className: string,
    sectionName: string | null,
    subjectName: string | null,
    homeworkDate: string,
    homeworkCount: number,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
    } = {}
  ) => {
    const details = activityTrackingService.createHomeworkDiaryActivityDetails(
      className,
      sectionName,
      subjectName,
      homeworkDate,
      homeworkCount
    );

    return logActivity(
      'homework_diary',
      action,
      'homework_diary',
      {
        ...options,
        details
      }
    );
  }, [logActivity]);

  const logReportActivity = useCallback(async (
    action: 'create' | 'update' | 'delete',
    categoryName: string,
    subjectName: string,
    subjectType: 'student' | 'staff',
    severity: string,
    options: {
      entityId?: number;
      entityName?: string;
      createNotification?: boolean;
      studentId?: number;
      staffId?: number;
    } = {}
  ) => {
    const details = {
      category_name: categoryName,
      subject_name: subjectName,
      subject_type: subjectType,
      severity: severity,
      student_id: options.studentId,
      staff_id: options.staffId
    };

    return logActivity(
      'report',
      action,
      'report',
      {
        ...options,
        details,
        createNotification: options.createNotification !== false // Default to true for reports
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
    logHomeworkDiaryActivity,
    logReportActivity,
  };
};

export default useActivityTracking;
