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

    // Batch requests to avoid hitting WiFi router connection limits
    // WiFi routers typically limit to 50-100 concurrent connections
    // Batch into groups of 3-4 to stay under limits
    const [sessionResult, ...rangeResults] = await Promise.all([
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
    ]);

    // Second batch for total counts
    const [totalEnquiriesResult, totalStudentsResult, totalFamiliesResult] = await Promise.all([
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
    const enquiriesThisMonthResult = rangeResults[0];
    const studentsThisMonthResult = rangeResults[1];
    const familiesThisMonthResult = rangeResults[2];
    
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

    // Process chart data from fetched records
    // Generate monthly admissions chart data
    const admissionsChartMap = new Map<string, { boys: number; girls: number }>();
    const withdrawalsChartMap = new Map<string, { boys: number; girls: number }>();
    const genderCounts = { boys: 0, girls: 0 };

    // Process students for admissions chart (group by month)
    (recentStudentsResult.data || []).forEach((student: any) => {
      if (student.created_at) {
        const date = new Date(student.created_at);
        const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })}-${date.getFullYear()}`;
        
        if (!admissionsChartMap.has(monthKey)) {
          admissionsChartMap.set(monthKey, { boys: 0, girls: 0 });
        }
        const monthData = admissionsChartMap.get(monthKey)!;
        
        if (student.gender === 'Male' || student.gender === 'male') {
          monthData.boys++;
          genderCounts.boys++;
        } else if (student.gender === 'Female' || student.gender === 'female') {
          monthData.girls++;
          genderCounts.girls++;
        }
      }
    });

    // Fetch withdrawals data (students with status 'withdrawn' or 'inactive')
    const withdrawalsResult = await supabase
      .from('students')
      .select('id, created_at, gender, status')
      .eq('school_id', schoolId)
      .in('status', ['withdrawn', 'inactive'])
      .gte('created_at', dataStartDate)
      .order('created_at', { ascending: false })
      .limit(100);

    // Process withdrawals for withdrawals chart
    (withdrawalsResult.data || []).forEach((student: any) => {
      if (student.created_at) {
        const date = new Date(student.created_at);
        const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })}-${date.getFullYear()}`;
        
        if (!withdrawalsChartMap.has(monthKey)) {
          withdrawalsChartMap.set(monthKey, { boys: 0, girls: 0 });
        }
        const monthData = withdrawalsChartMap.get(monthKey)!;
        
        if (student.gender === 'Male' || student.gender === 'male') {
          monthData.boys++;
        } else if (student.gender === 'Female' || student.gender === 'female') {
          monthData.girls++;
        }
      }
    });

    // Generate last 12 months of chart data
    const today = new Date();
    const admissionsChart: any[] = [];
    const withdrawalsChart: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })}-${date.getFullYear()}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      const admissionsData = admissionsChartMap.get(monthKey) || { boys: 0, girls: 0 };
      const withdrawalsData = withdrawalsChartMap.get(monthKey) || { boys: 0, girls: 0 };
      
      admissionsChart.push({
        month: monthLabel,
        boys: admissionsData.boys,
        girls: admissionsData.girls,
        total: admissionsData.boys + admissionsData.girls
      });
      
      withdrawalsChart.push({
        month: monthLabel,
        boys: withdrawalsData.boys,
        girls: withdrawalsData.girls,
        students: withdrawalsData.boys + withdrawalsData.girls
      });
    }

    // Generate gender data
    const genderData = [
      { name: 'Boys', value: genderCounts.boys, color: '#3b82f6' },
      { name: 'Girls', value: genderCounts.girls, color: '#ec4899' }
    ];

    // Process latest admissions (last 10 students)
    const latestAdmissions = (recentStudentsResult.data || [])
      .slice(0, 10)
      .map((student: any) => ({
        name: student.name || 'Unknown',
        pictureUrl: student.picture_url || null,
        admissionDate: student.created_at || null,
        className: 'N/A' // Will be populated if class data is available
      }));

    // Process today's birthdays
    const todayStr = today.toISOString().split('T')[0];
    const todaysBirthdays = (recentStudentsResult.data || [])
      .filter((student: any) => {
        if (!student.dob) return false;
        const dob = new Date(student.dob);
        const dobStr = dob.toISOString().split('T')[0];
        return dobStr.substring(5) === todayStr.substring(5); // Compare month-day
      })
      .map((student: any) => ({
        name: student.name || 'Unknown',
        pictureUrl: student.picture_url || null,
        className: 'N/A'
      }));

    // Process and return admissions data
    const admissionsData = {
      inquiriesThisRange,
      studentsThisRange,
      familiesThisRange,
      totalInquiries,
      totalStudents,
      totalFamilies,
      totalFeePlans: feePlansResult.data?.length || 0,
      feePlansThisMonth: feePlansResult.data?.length || 0,
      recentEnquiries: recentEnquiriesResult.data || [],
      recentStudents: recentStudentsResult.data || [],
      recentFamilies: recentFamiliesResult.data || [],
      feePlans: feePlansResult.data || [],
      admissionsChart,
      withdrawalsChart,
      genderData,
      latestAdmissions,
      todaysBirthdays,
      todaysBirthdaysCount: todaysBirthdays.length,
      gradeDistribution: [] // Can be populated if needed
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

