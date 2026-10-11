/**
 * Helper to determine whether an administrative notice is linked / targeted to a specific teacher
 */
export const isTeacherLinkedNotice = (notice: any, teacher: any): boolean => {
  if (!teacher || !notice) return false;
  const teacherId = Number(teacher.id);
  const userRole = (teacher.role || 'Teacher').toLowerCase();

  // 1. Individual targeting
  if (notice.audience_group && notice.target_scope) {
    const aud = String(notice.audience_group).toLowerCase();
    if (aud === 'all_users' || aud === 'all') {
      return true;
    }
    if (aud === 'staff') {
      switch (notice.target_scope) {
        case 'all':
          return true;
        case 'single':
        case 'multi': {
          const targetIds: number[] = [
            ...(notice.staff_id ? [Number(notice.staff_id)] : []),
            ...(Array.isArray(notice.staff_ids) ? notice.staff_ids.map(Number) : []),
          ];
          return targetIds.includes(teacherId);
        }
        case 'role': {
          const roleTarget = (notice.staff_role || '').toLowerCase();
          return !roleTarget || roleTarget === userRole || roleTarget === 'teacher';
        }
        default:
          return false;
      }
    }
    return false;
  }

  // 2. Direct staff ID check
  if (notice.staff_id) {
    return Number(notice.staff_id) === teacherId;
  }
  if (notice.staff_ids && Array.isArray(notice.staff_ids) && notice.staff_ids.length > 0) {
    return notice.staff_ids.map(Number).includes(teacherId);
  }

  // 3. Fallback role / visible_to check
  if (notice.visible_to && Array.isArray(notice.visible_to) && notice.visible_to.length > 0) {
    return notice.visible_to.some((r: string) => {
      const rl = String(r).toLowerCase();
      return rl === 'staff' || rl === 'teacher' || rl === 'teachers' || rl === userRole;
    });
  }

  // 4. Default if audience is staff/all without constraints
  if (notice.audience_group) {
    const aud = String(notice.audience_group).toLowerCase();
    return aud === 'staff' || aud === 'all';
  }

  return false;
};

/**
 * Strip any HTML tags from titles or messages
 */
export const stripHtml = (html?: string | null): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};
