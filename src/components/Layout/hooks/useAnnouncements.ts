import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { normalizeIdList } from '../utils/layoutUtils';
import { AnnouncementIdentity, AnnouncementView } from '../types';

export const useAnnouncements = (
  identity: AnnouncementIdentity | null,
  authUser: any,
  studentInfo: any,
  staffId: string | null
) => {
  const [announcementQueue, setAnnouncementQueue] = useState<any[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [seenByModalOpen, setSeenByModalOpen] = useState(false);
  const [seenByEntries, setSeenByEntries] = useState<AnnouncementView[]>([]);
  const [seenByLoading, setSeenByLoading] = useState(false);
  const [seenByError, setSeenByError] = useState<string | null>(null);
  const seenAnnouncementsRef = useRef<Set<number>>(new Set());
  const snoozedAnnouncementsRef = useRef<Set<number>>(new Set());
  const viewerDeviceIdRef = useRef<string>('');

  const ensureViewerDeviceId = () => {
    if (viewerDeviceIdRef.current) return viewerDeviceIdRef.current;
    if (typeof window === 'undefined') return 'server-device';
    const key = 'gm_viewer_device_id';
    let existing = window.localStorage.getItem(key);
    if (!existing) {
      const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      existing = randomPart;
      window.localStorage.setItem(key, existing);
    }
    viewerDeviceIdRef.current = existing;
    return existing;
  };

  const getViewerIdentifier = (identity: AnnouncementIdentity | null) => {
    if (!identity) return null;
    const deviceId = ensureViewerDeviceId();
    if (identity.type === 'student') {
      if (identity.studentId) return `student_${identity.studentId}`;
      return `student_device_${deviceId}`;
    }
    if (identity.staffId) return `staff_${identity.staffId}`;
    if (identity.userId) return `user_${identity.userId}`;
    const roleKey = identity.role ? identity.role.replace(/\s+/g, '_').toLowerCase() : 'staff';
    return `staff_device_${deviceId}_${roleKey}`;
  };

  const getDismissStorageKey = (announcementId: number, identity: AnnouncementIdentity | null) => {
    if (!identity) return null;
    const recipientId = identity.type === 'student'
      ? identity.studentId
      : identity.staffId || identity.userId || identity.role || 'staff';
    return `gm_ann_dismiss_${identity.schoolId}_${identity.type}_${recipientId}_${announcementId}`;
  };

  const isAnnouncementDismissed = (announcementId: number, identity: AnnouncementIdentity | null) => {
    if (typeof window === 'undefined') return false;
    const key = getDismissStorageKey(announcementId, identity);
    if (!key) return false;
    return window.localStorage.getItem(key) === '1';
  };

  const persistAnnouncementDismissal = (announcementId: number, identity: AnnouncementIdentity | null) => {
    if (typeof window === 'undefined') return;
    const key = getDismissStorageKey(announcementId, identity);
    if (!key) return;
    window.localStorage.setItem(key, '1');
  };

  const matchesAnnouncementAudience = (announcement: any, identity: AnnouncementIdentity | null) => {
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
          const classMatches = !announcement.class_id || (identity.classId && announcement.class_id === identity.classId);
          const sectionMatches = !announcement.section_id || (identity.sectionId && announcement.section_id === identity.sectionId);
          return classMatches && sectionMatches;
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

  const isWithinDisplayWindow = (announcement: any, today: string) => {
    if (announcement.show_from && announcement.show_from > today) return false;
    if (announcement.show_until && announcement.show_until < today) return false;
    return true;
  };

  const shouldDisplayAnnouncement = (announcement: any, identity: AnnouncementIdentity | null, today: string) => {
    if (!identity || !announcement || announcement.is_active === false) return false;
    if (announcement.id && snoozedAnnouncementsRef.current.has(announcement.id)) return false;
    if (!isWithinDisplayWindow(announcement, today)) return false;
    if (!matchesAnnouncementAudience(announcement, identity)) return false;
    if (isAnnouncementDismissed(announcement.id, identity)) return false;
    return true;
  };

  const buildViewerPayload = (identity: AnnouncementIdentity | null, studentInfo: any, parentInfo: any, staffName: string | null, authUser: any) => {
    if (!identity) return null;
    const viewerIdentifier = getViewerIdentifier(identity);
    if (!viewerIdentifier) return null;
    const base: any = {
      school_id: identity.schoolId,
      viewer_type: identity.type,
      viewer_role: identity.type === 'student' ? 'Student' : identity.role || 'Staff',
      viewer_name: identity.type === 'student'
        ? studentInfo?.name || 'Student'
        : parentInfo?.name || staffName || authUser?.name || 'Staff Member',
      viewer_identifier: viewerIdentifier,
      viewer_device_id: ensureViewerDeviceId(),
    };
    if (identity.type === 'student') {
      if (identity.studentId) base.student_id = identity.studentId;
    } else {
      if (identity.staffId) base.staff_id = identity.staffId;
      if (identity.userId) base.user_id = identity.userId;
    }

    return base;
  };

  const trackAnnouncementSeen = useCallback(async (
    announcement: any,
    identity: AnnouncementIdentity | null,
    studentInfo: any,
    parentInfo: any,
    staffName: string | null,
    authUser: any
  ) => {
    if (!announcement?.id || seenAnnouncementsRef.current.has(announcement.id)) return;
    const payload = buildViewerPayload(identity, studentInfo, parentInfo, staffName, authUser);
    if (!identity || !payload) return;

    try {
      await supabase
        .from('announcement_views')
        .upsert(
          {
            announcement_id: announcement.id,
            ...payload,
          },
          { onConflict: 'announcement_id,viewer_identifier' }
        );
      seenAnnouncementsRef.current.add(announcement.id);
    } catch (error) {
      // Silent fail
    }
  }, []);

  const loadSeenByEntries = useCallback(async (announcementId: number) => {
    setSeenByLoading(true);
    setSeenByError(null);
    try {
      const { data, error } = await supabase
        .from('announcement_views')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('seen_at', { ascending: false });
      if (error) throw error;
      setSeenByEntries(data || []);
    } catch (error) {
      setSeenByError('Unable to load viewers right now.');
    } finally {
      setSeenByLoading(false);
    }
  }, []);

  const enqueueAnnouncement = (announcement: any) => {
    setAnnouncementQueue(prev => {
      if (prev.some(existing => existing.id === announcement.id)) {
        return prev;
      }
      if (!prev.length) {
        setCurrentAnnouncementIndex(0);
        setShowAnnouncement(true);
        return [announcement];
      }
      return [...prev, announcement];
    });
  };

  const loadAnnouncements = useCallback(async (
    identity: AnnouncementIdentity | null
  ) => {
    if (!identity) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('school_id', identity.schoolId)
        .eq('is_active', true)
        .lte('show_from', today)
        .or(`show_until.is.null,show_until.gte.${today}`)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error || !data) {
        return;
      }

      const filtered = data.filter((a: any) => shouldDisplayAnnouncement(a, identity, today));

      const visible = filtered;
      if (!visible.length) {
        setAnnouncementQueue([]);
        setShowAnnouncement(false);
        return;
      }

      setAnnouncementQueue(visible);
      setCurrentAnnouncementIndex(0);
      setShowAnnouncement(true);
    } catch {
      // Fail silently for announcements
    }
  }, []);

  return {
    announcementQueue,
    currentAnnouncementIndex,
    showAnnouncement,
    seenByModalOpen,
    seenByEntries,
    seenByLoading,
    seenByError,
    setCurrentAnnouncementIndex,
    setShowAnnouncement,
    setAnnouncementQueue,
    setSeenByModalOpen,
    enqueueAnnouncement,
    trackAnnouncementSeen,
    loadSeenByEntries,
    loadAnnouncements,
    persistAnnouncementDismissal,
    snoozedAnnouncementsRef,
    shouldDisplayAnnouncement,
  };
};

