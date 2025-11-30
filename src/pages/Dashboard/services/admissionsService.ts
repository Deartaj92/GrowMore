import { supabase } from '../../../supabaseClient';
import { generateDummyAdmissions } from '../utils/dummyData';
import { USE_DUMMY_DATA } from '../constants';
import { getTabCacheKey } from '../utils/cacheUtils';

// Admissions service functions will be extracted here
// fetchAdmissionsData, etc.

export const fetchAdmissionsData = async (
  schoolId: string,
  fromDate: string,
  toDate: string,
  setAdmissionsData: (data: any) => void,
  setAdmissionsLoading: (loading: boolean) => void,
  getCachedSession: () => Promise<any>,
  setCachedTabData: (key: string, data: any, params?: Record<string, any>) => void
): Promise<void> => {
  if (!schoolId) {
    setAdmissionsLoading(false);
    return;
  }

  setAdmissionsLoading(true);
  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setAdmissionsData(generateDummyAdmissions());
      setAdmissionsLoading(false);
      return;
    }

    const dataStartDate = new Date(fromDate).toISOString();
    const dataEndDate = new Date(toDate).toISOString();

    const [sessionResult, enquiriesThisMonthResult, studentsThisMonthResult, familiesThisMonthResult,
      totalEnquiriesResult, totalStudentsResult, totalFamiliesResult] = await Promise.all([
        getCachedSession(),
        supabase
          .from('enquiries')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .gte('created_at', dataStartDate)
          .lte('created_at', dataEndDate),
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .gte('created_at', dataStartDate)
          .lte('created_at', dataEndDate),
        supabase
          .from('families')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .gte('created_at', dataStartDate)
          .lte('created_at', dataEndDate),
        supabase
          .from('enquiries')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
        supabase
          .from('families')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
      ]);

    const sessionData = sessionResult;
    const inquiriesThisRange = enquiriesThisMonthResult.count || 0;
    const studentsThisRange = studentsThisMonthResult.count || 0;
    const familiesThisRange = familiesThisMonthResult.count || 0;
    const totalInquiries = totalEnquiriesResult.count || 0;
    const totalStudents = totalStudentsResult.count || 0;
    const totalFamilies = totalFamiliesResult.count || 0;

    // Fetch detailed data for charts - OPTIMIZED: Limit to last 100 records for faster loading
    const [recentEnquiriesResult, recentStudentsResult, recentFamiliesResult, feePlansResult] = await Promise.all([
      supabase
        .from('enquiries')
        .select('id, created_at')
        .eq('school_id', schoolId)
        .gte('created_at', dataStartDate)
        .order('created_at', { ascending: false })
        .limit(100), // Limit to 100 most recent for faster loading
      supabase
        .from('students')
        .select('id, created_at, gender, class_id, name, picture_url, dob, status')
        .eq('school_id', schoolId)
        .gte('created_at', dataStartDate)
        .order('created_at', { ascending: false })
        .limit(100), // Limit to 100 most recent for faster loading
      supabase
        .from('families')
        .select('id, created_at')
        .eq('school_id', schoolId)
        .gte('created_at', dataStartDate)
        .order('created_at', { ascending: false })
        .limit(100), // Limit to 100 most recent for faster loading
      supabase
        .from('fee_plans')
        .select('id, name')
        .eq('school_id', schoolId)
        .limit(50) // Limit fee plans to 50 for faster loading
    ]);

    // Process and return admissions data
    const admissionsData = {
      inquiriesThisRange,
      studentsThisRange,
      familiesThisRange,
      totalInquiries,
      totalStudents,
      totalFamilies,
      recentEnquiries: recentEnquiriesResult.data || [],
      recentStudents: recentStudentsResult.data || [],
      recentFamilies: recentFamiliesResult.data || [],
      feePlans: feePlansResult.data || []
    };

    setAdmissionsData(admissionsData);
    
    // Cache the data
    const cacheKey = getTabCacheKey('admissions', { 
      school_id: schoolId, 
      fromDate, 
      toDate 
    });
    setCachedTabData(cacheKey, admissionsData, { school_id: schoolId, fromDate, toDate });
  } catch (error) {
    console.error('Error fetching admissions data:', error);
  } finally {
    setAdmissionsLoading(false);
  }
};

