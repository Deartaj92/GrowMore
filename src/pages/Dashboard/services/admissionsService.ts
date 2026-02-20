import { supabase } from '../../../supabaseClient';
import { generateDummyAdmissions } from '../utils/dummyData';
import { USE_DUMMY_DATA } from '../constants';

// Admissions service functions will be extracted here
// fetchAdmissionsData, etc.

export const fetchAdmissionsData = async (
  schoolId: string,
  fromDate: string,
  toDate: string,
  setAdmissionsData: (data: any) => void,
  setAdmissionsLoading: (loading: boolean) => void,
  getCachedSession: () => Promise<any>
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
        .from('fee_heads')
        .select('id, name')
        .eq('school_id', schoolId)
        .limit(50) // Limit fee heads to 50 for faster loading
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

    // Fetch withdrawals data from student_status_history table
    // Try both action='withdraw' and new_status='withdrawn' separately and combine
    const [withdrawalsByAction, withdrawalsByStatus] = await Promise.all([
      supabase
        .from('student_status_history')
        .select('id, student_id, created_at, action, new_status, reason')
        .eq('school_id', schoolId)
        .eq('action', 'withdraw')
        .gte('created_at', dataStartDate)
        .lte('created_at', dataEndDate)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('student_status_history')
        .select('id, student_id, created_at, action, new_status, reason')
        .eq('school_id', schoolId)
        .eq('new_status', 'withdrawn')
        .gte('created_at', dataStartDate)
        .lte('created_at', dataEndDate)
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    // Combine results and remove duplicates (same record might match both conditions)
    const allWithdrawals = [
      ...(withdrawalsByAction.data || []),
      ...(withdrawalsByStatus.data || [])
    ];

    // Remove duplicates by id
    const uniqueWithdrawals = Array.from(
      new Map(allWithdrawals.map((record: any) => [record.id, record])).values()
    );

    // Log for debugging
    if (withdrawalsByAction.error) {
      console.error('Error fetching withdrawals by action:', withdrawalsByAction.error);
    }
    if (withdrawalsByStatus.error) {
      console.error('Error fetching withdrawals by status:', withdrawalsByStatus.error);
    }
    console.log('Total unique withdrawals found:', uniqueWithdrawals.length);

    // Get unique student IDs from withdrawal records
    const withdrawalStudentIds = Array.from(
      new Set(uniqueWithdrawals.map((record: any) => record.student_id))
    ).filter((id): id is number => id !== null && id !== undefined);

    // Fetch student gender data for withdrawal records
    let studentGenderMap = new Map<number, string>();
    if (withdrawalStudentIds.length > 0) {
      const studentsResult = await supabase
        .from('students')
        .select('id, gender')
        .eq('school_id', schoolId)
        .in('id', withdrawalStudentIds);

      if (studentsResult.data) {
        studentsResult.data.forEach((student: any) => {
          if (student.gender) {
            studentGenderMap.set(student.id, student.gender);
          }
        });
      }
    }

    // Process withdrawals for withdrawals chart using history table data
    uniqueWithdrawals.forEach((historyRecord: any) => {
      if (historyRecord.created_at) {
        const date = new Date(historyRecord.created_at);
        const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })}-${date.getFullYear()}`;

        if (!withdrawalsChartMap.has(monthKey)) {
          withdrawalsChartMap.set(monthKey, { boys: 0, girls: 0 });
        }
        const monthData = withdrawalsChartMap.get(monthKey)!;

        // Get gender from the student gender map
        const gender = studentGenderMap.get(historyRecord.student_id);
        if (gender) {
          if (gender === 'Male' || gender === 'male') {
            monthData.boys++;
          } else if (gender === 'Female' || gender === 'female') {
            monthData.girls++;
          }
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

    // Fetch total gender counts for all active students
    const [totalBoysResult, totalGirlsResult] = await Promise.all([
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .in('gender', ['Male', 'male']),
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .in('gender', ['Female', 'female'])
    ]);

    const totalBoys = totalBoysResult.count || 0;
    const totalGirls = totalGirlsResult.count || 0;

    // Generate gender data with total counts
    const genderData = [
      { name: 'Boys', value: totalBoys, color: '#3b82f6' },
      { name: 'Girls', value: totalGirls, color: '#ec4899' }
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

  } catch (error) {
    console.error('Error fetching admissions data:', error);
  } finally {
    setAdmissionsLoading(false);
  }
};

