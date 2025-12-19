import { supabase } from '../../../supabaseClient';
import { USE_DUMMY_DATA } from '../constants';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fetchAllRows } from './feeService';

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

    const { data: attendanceData, error: attendanceError } = await supabase
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
      .eq('school_id', schoolId)
      .or('status.eq.absent,status.eq.leave');

    if (attendanceError) {
      throw attendanceError;
    }

    const staffIds = attendanceData
      .map(record => record.staff_id)
      .filter((id, index, self) => id && self.indexOf(id) === index);

    if (staffIds.length === 0) {
      setStaffDetails({});
      setAbsentees([]);
      return;
    }

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        name,
        role,
        picture_url
      `)
      .in('id', staffIds)
      .eq('school_id', schoolId);

    if (staffError) {
      throw staffError;
    }

    // Get attendance statistics for each staff member for the current month
    const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

    const fetchedStaffIds = staffData?.map(s => s.id) || [];
    
    // Fetch all monthly attendance records for these staff using fetchAllRows to handle pagination
    const monthlyAttendance = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('staff_attendance_records')
        .select('staff_id, status, date')
        .in('staff_id', fetchedStaffIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('session_id', sessionData.id)
        .eq('school_id', schoolId)
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Calculate monthly statistics for each staff member
    const monthlyStats: Record<number, { absences: number; leaves: number; total: number; present: number }> = {};
    if (monthlyAttendance) {
      monthlyAttendance.forEach(record => {
        if (!monthlyStats[record.staff_id]) {
          monthlyStats[record.staff_id] = { absences: 0, leaves: 0, total: 0, present: 0 };
        }
        monthlyStats[record.staff_id].total++;
        if (record.status === 'absent') {
          monthlyStats[record.staff_id].absences++;
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
      const stats = monthlyStats[staffMember.id] || { absences: 0, leaves: 0, total: 0, present: 0 };
      const attendancePercentage = stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100) 
        : 100;
      
      details[staffMember.id] = {
        ...staffMember,
        monthly_absences: stats.absences,
        monthly_leaves: stats.leaves,
        attendance_percentage: attendancePercentage
      };
    });

    setStaffDetails(details);
    setAbsentees(attendanceData || []);
  } catch (error) {
    console.error('Error fetching employee absentees:', error);
    setStaffDetails({});
    setAbsentees([]);
  }
};
















































