import { supabase } from '../../../supabaseClient';

// Homework service functions will be extracted here
// fetchHomeworkDiary, etc.

export const fetchHomeworkDiary = async (
  schoolId: string,
  dashboardDate: string,
  setHomeworkDiaryData: (data: any[]) => void,
  setHomeworkLoading: (loading: boolean) => void
): Promise<void> => {
  if (!schoolId || !dashboardDate) return;

  setHomeworkLoading(true);

  try {
    const { data, error } = await supabase
      .from('homework_diary')
      .select(`
        id,
        class_id,
        section_id,
        subject_id,
        homework_text,
        homework_date,
        assigned_by,
        classes:class_id(id, name),
        sections:section_id(id, name),
        subjects:subject_id(id, name),
        assigned_by_user:users!assigned_by(id, name)
      `)
      .eq('homework_date', dashboardDate)
      .eq('school_id', schoolId)
      .order('class_id', { ascending: true })
      .order('section_id', { ascending: true, nullsFirst: true })
      .order('subject_id', { ascending: true, nullsFirst: true });

    if (error) {
      setHomeworkDiaryData([]);
      return;
    }

    const processedData = (data || []).map((item: any) => ({
      ...item,
      users: item.assigned_by_user || item.created_by_user || null
    }));

    setHomeworkDiaryData(processedData);
  } catch (error) {
    console.error('Error fetching homework diary:', error);
    setHomeworkDiaryData([]);
  } finally {
    setHomeworkLoading(false);
  }
};

