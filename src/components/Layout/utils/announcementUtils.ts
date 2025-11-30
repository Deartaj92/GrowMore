import { AnnouncementIdentity } from '../types';
import { normalizeIdList } from './layoutUtils';

/**
 * Gets announcement identity based on current user context
 */
export const getAnnouncementIdentity = (
  studentInfo: any,
  authUser: any,
  staffId: string | null
): AnnouncementIdentity | null => {
  if (studentInfo) {
    return {
      type: 'student' as const,
      schoolId: studentInfo.school_id,
      studentId: studentInfo.id,
      classId: studentInfo.class_id ?? undefined,
      sectionId: studentInfo.section_id ?? undefined,
    };
  }
  if (authUser?.school_id) {
    return {
      type: 'staff' as const,
      schoolId: authUser.school_id,
      staffId: staffId ? Number(staffId) : undefined,
      role: authUser.role,
      userId: authUser.id,
    };
  }
  return null;
};

/**
 * Checks if announcement matches the audience criteria
 */
export const matchesAnnouncementAudience = (announcement: any, identity: AnnouncementIdentity | null): boolean => {
  if (!identity) return false;
  if (identity.type === 'student') {
    if (announcement.audience_group !== 'students') return false;
    switch (announcement.target_scope) {
      case 'all':
        return true;
      case 'single':
      case 'multi': {
        if (!identity.studentId) return false;
        const targetIds = [
          ...normalizeIdList(announcement.student_id),
          ...normalizeIdList(announcement.student_ids),
        ];
        return targetIds.includes(identity.studentId);
      }
      case 'class': {
        const classMatches = !announcement.class_id || !!(identity.classId && announcement.class_id === identity.classId);
        const sectionMatches = !announcement.section_id || !!(identity.sectionId && announcement.section_id === identity.sectionId);
        return !!(classMatches && sectionMatches);
      }
      default:
        return false;
    }
  } else {
    if (announcement.audience_group !== 'staff') return false;
    switch (announcement.target_scope) {
      case 'all':
        return true;
      case 'role':
        return !!announcement.staff_role && announcement.staff_role === identity.role;
      case 'single':
      case 'multi': {
        if (!identity.staffId) return false;
        const targetIds = [
          ...normalizeIdList(announcement.staff_id),
          ...normalizeIdList(announcement.staff_ids),
        ];
        return targetIds.includes(identity.staffId);
      }
      default:
        return false;
    }
  }
};

/**
 * Checks if announcement is within its display window
 */
export const isWithinDisplayWindow = (announcement: any, today: string): boolean => {
  if (announcement.show_from && announcement.show_from > today) return false;
  if (announcement.show_until && announcement.show_until < today) return false;
  return true;
};

/**
 * Determines if an announcement should be displayed
 */
export const shouldDisplayAnnouncement = (
  announcement: any,
  identity: AnnouncementIdentity | null,
  today: string,
  snoozedAnnouncements: Set<number>,
  isAnnouncementDismissed: (id: number) => boolean
): boolean => {
  if (!identity || !announcement || announcement.is_active === false) return false;
  if (announcement.id && snoozedAnnouncements.has(announcement.id)) return false;
  if (!isWithinDisplayWindow(announcement, today)) return false;
  if (!matchesAnnouncementAudience(announcement, identity)) return false;
  if (isAnnouncementDismissed(announcement.id)) return false;
  return true;
};

