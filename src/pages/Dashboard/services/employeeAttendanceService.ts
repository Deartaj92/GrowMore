import { supabase } from '../../../supabaseClient';
import { USE_DUMMY_DATA } from '../constants';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fetchAllRows } from '../../../utils/paginationHelper';

export const fetchEmployeeAbsentees = async (
  schoolId: string,
  absentDate: string,
  sessionId: string,
  staff: any[],
  setAbsentees: (data: any[]) => void,
  setStaffDetails: (details: Record<string, any>) => void,
  getCachedSession: () => Promise<any>
): Promise<void> => {
  if (!absentDate || !schoolId) return;

  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const dummyStaffIds = staff.length > 0
        ? staff.map(s => s.id)
        : Array.from({ length: 50 }, (_, i) => i + 1);
      const dummyAbsentees = dummyStaffIds
        .filter((_, i) => i % 4 === 0) // Simulate some absentees
        .map((staffId, i) => ({
          id: i + 1,
          staff_id: staffId,
          status: Math.random() > 0.5 ? 'absent' : 'leave',
          date: absentDate,
          session_id: sessionId,
          remarks: null,
        }));

      const dummyDetails: Record<string, any> = {};
      dummyAbsentees.forEach((absentee) => {
        dummyDetails[absentee.staff_id] = {
          id: absentee.staff_id,
          name: `Staff ${absentee.staff_id}`,
          role: 'Teacher',
          picture_url: null,
          monthly_absences: Math.floor(Math.random() * 5) + 1,
          monthly_leaves: Math.floor(Math.random() * 2),
          attendance_percentage: Math.floor(Math.random() * 20) + 70,
        };
      });

      setAbsentees(dummyAbsentees);
      setStaffDetails(dummyDetails);
      return;
    }

    const sessionData = await getCachedSession();

    if (!sessionData?.id) {
      setStaffDetails({});
      setAbsentees([]);
      return;
    }

    const { data: allAttendanceData, error: attendanceError } = await supabase
      .from('staff_attendance_records')
      .select(`
        id,
        staff_id,
        status,
        remarks,
        date
      `)
      .eq('date', absentDate)
      .eq('session_id', sessionData.id)
      .eq('school_id', schoolId);

    if (attendanceError) {
      throw attendanceError;
    }

    const attendanceData = allAttendanceData || [];

    const staffIds = attendanceData
      .filter((record: any) => record.status === 'absent' || record.status === 'leave')
      .map(record => record.staff_id)
      .filter((id, index, self) => id && self.indexOf(id) === index);

    if (staffIds.length === 0) {
      setStaffDetails({});
      setAbsentees([]);
      return;
    }

    // Fetch staff with chunking for .in() limit
    let allStaff: any[] = [];
    for (let i = 0; i < staffIds.length; i += 1000) {
      const chunk = staffIds.slice(i, i + 1000);
      const chunkStaff = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('staff')
          .select(`
            id,
            name,
            role,
            picture_url
          `)
          .in('id', chunk)
          .eq('school_id', schoolId)
          .range(from, to);
      });
      allStaff.push(...chunkStaff);
    }
    const staffData = allStaff;

    // Get attendance statistics for each staff member for the current month
    const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

    // Fetch all monthly attendance records for the entire school to accurately determine working days
    const monthlyAttendance = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('staff_attendance_records')
        .select('staff_id, status, date')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('session_id', sessionData.id)
        .eq('school_id', schoolId)
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    const uniqueDates = new Set(monthlyAttendance?.map(a => a.date) || []);
    const workingDaysCount = uniqueDates.size;

    // Calculate monthly statistics for each staff member
    const monthlyStats: Record<number, { explicit_absences: number; leaves: number; total_explicit: number; present: number }> = {};
    if (monthlyAttendance) {
      monthlyAttendance.forEach(record => {
        if (!monthlyStats[record.staff_id]) {
          monthlyStats[record.staff_id] = { explicit_absences: 0, leaves: 0, total_explicit: 0, present: 0 };
        }
        monthlyStats[record.staff_id].total_explicit++;
        if (record.status === 'absent') {
          monthlyStats[record.staff_id].explicit_absences++;
        } else if (record.status === 'leave') {
          monthlyStats[record.staff_id].leaves++;
        } else if (record.status === 'present' || record.status === 'late' || record.status === 'half_day') {
          monthlyStats[record.staff_id].present++;
        }
      });
    }

    // Process and set data with monthly stats
    const details: Record<string, any> = {};
    staffData?.forEach((staffMember: any) => {
      const stats = monthlyStats[staffMember.id] || { explicit_absences: 0, leaves: 0, total_explicit: 0, present: 0 };
      const missingRecords = Math.max(0, workingDaysCount - stats.total_explicit);
      const totalAbsences = stats.explicit_absences + stats.leaves + missingRecords;

      const attendancePercentage = workingDaysCount > 0
        ? Math.round((stats.present / workingDaysCount) * 100)
        : 100;

      details[staffMember.id] = {
        ...staffMember,
        monthly_absences: totalAbsences,
        monthly_leaves: stats.leaves,
        attendance_percentage: attendancePercentage
      };
    });

    setStaffDetails(details);
    setAbsentees(attendanceData);
  } catch (error) {
    console.error('Error fetching employee absentees:', error);
    setStaffDetails({});
    setAbsentees([]);
  }
};





















































