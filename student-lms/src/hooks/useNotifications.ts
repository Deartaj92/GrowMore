import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export type AppNotification = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  type: 'announcement' | 'fee' | 'homework';
};

export const useNotifications = (
  studentId: number | undefined,
  schoolId: number | undefined,
  classId: number | null | undefined,
  sectionId: number | null | undefined
) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!studentId || !schoolId) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const items: AppNotification[] = [];

      const { data: annData } = await supabase
        .from('announcements')
        .select('id, title, content, created_at, audience_group, target_scope, class_id, section_id, student_id, student_ids')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .lte('show_from', todayStr)
        .or(`show_until.is.null,show_until.gte.${todayStr}`)
        .order('created_at', { ascending: false })
        .limit(8);

      if (annData) {
        annData.forEach((ann: any) => {
          if (ann.audience_group !== 'students') return;
          let matches = false;
          if (ann.target_scope === 'all') matches = true;
          else if (ann.target_scope === 'class') {
            const classMatches = !ann.class_id || (!!classId && ann.class_id === classId);
            const sectionMatches = !ann.section_id || (!!sectionId && ann.section_id === sectionId);
            matches = !!(classMatches && sectionMatches);
          } else if (ann.target_scope === 'single' || ann.target_scope === 'multi') {
            const targetIds = [
              ...(ann.student_id ? [parseInt(ann.student_id, 10)] : []),
              ...(ann.student_ids ? ann.student_ids.map((id: any) => parseInt(id, 10)) : []),
            ];
            matches = targetIds.includes(studentId);
          }
          if (matches) {
            items.push({
              id: `ann-${ann.id}`,
              title: ann.title || 'Announcement',
              content: ann.content || '',
              created_at: ann.created_at,
              type: 'announcement',
            });
          }
        });
      }

      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();

      if (activeSession?.id) {
        const { count } = await supabase
          .from('fee_challans')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('school_id', schoolId)
          .eq('session_id', activeSession.id)
          .eq('status', 'unpaid');

        if (count && count > 0) {
          items.unshift({
            id: 'fee-unpaid',
            title: 'Unpaid fee challans',
            content: `You have ${count} unpaid fee challan${count > 1 ? 's' : ''} pending.`,
            created_at: new Date().toISOString(),
            type: 'fee',
          });
        }
      }

      if (classId) {
        let hwQuery = supabase
          .from('homework_diary')
          .select('id, homework_date, homework_text, subjects:subject_id(name)')
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .gte('homework_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
          .order('homework_date', { ascending: false })
          .limit(3);

        if (sectionId) hwQuery = hwQuery.eq('section_id', sectionId);

        const { data: hwData } = await hwQuery;
        hwData?.forEach((hw: any) => {
          const subject = Array.isArray(hw.subjects) ? hw.subjects[0]?.name : hw.subjects?.name;
          items.push({
            id: `hw-${hw.id}`,
            title: `New homework: ${subject || 'Subject'}`,
            content: (hw.homework_text || '').slice(0, 120),
            created_at: hw.homework_date,
            type: 'homework',
          });
        });
      }

      setNotifications(items.slice(0, 12));
    } catch (e) {
      console.error('Failed to load notifications', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, schoolId, classId, sectionId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return { notifications, loading, refresh: fetchNotifications };
};
