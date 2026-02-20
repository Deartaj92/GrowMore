import { supabase } from '../../../supabaseClient';
import { generateDummyAbsentees } from '../utils/dummyData';
import { USE_DUMMY_DATA } from '../constants';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fetchAllRows } from '../../../utils/paginationHelper';

// Attendance service functions will be extracted here
// fetchAbsentees, fetchAttendanceForDate, fetchAttendanceTrend, fetchClassAttendance, fetchConsecutiveAbsent, etc.

export const fetchAbsentees = async (
  schoolId: string,
  absentDate: string,
  sessionId: string,
  students: any[],
  setAbsentees: (data: any[]) => void,
  setStudentDetails: (details: Record<string, any>) => void,
  getCachedSession: () => Promise<any>
): Promise<void> => {
  if (!absentDate || !schoolId) return;

  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const dummyStudentIds = students.length > 0 
        ? students.map(s => s.id)
        : Array.from({ length: 500 }, (_, i) => i + 1);
      const dummyAbsentees = generateDummyAbsentees(dummyStudentIds, absentDate);
      
      const dummyDetails: Record<string, any> = {};
      dummyAbsentees.forEach((absentee) => {
        dummyDetails[absentee.student_id] = {
          id: absentee.student_id,
          name: `Student ${absentee.student_id}`,
          father_name: `Father ${absentee.student_id}`,
          picture_url: null,
          class_id: absentee.class_id,
          section_id: absentee.section_id,
          class_name: `Class ${absentee.class_id}`,
          section_name: `Section ${absentee.section_id}`,
          monthly_absences: Math.floor(Math.random() * 5) + 1,
          monthly_leaves: Math.floor(Math.random() * 2),
          attendance_percentage: Math.floor(Math.random() * 20) + 70,
        };
      });
      
      setAbsentees(dummyAbsentees);
      setStudentDetails(dummyDetails);
      return;
    }
    
    const sessionData = await getCachedSession();

    if (!sessionData?.id) {
      setStudentDetails({});
      setAbsentees([]);
      return;
    }

    const attendanceData = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          status,
          remarks,
          date,
          class_id,
          section_id
        `)
        .eq('date', absentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', schoolId)
        .or('status.eq.absent,status.eq.leave')
        .range(from, to);
    });

    const studentIds = attendanceData
      .map(record => record.student_id)
      .filter((id, index, self) => id && self.indexOf(id) === index);

    if (studentIds.length === 0) {
      setStudentDetails({});
      setAbsentees([]);
      return;
    }

    // Fetch students with chunking for .in() limit
    let allStudents: any[] = [];
    for (let i = 0; i < studentIds.length; i += 1000) {
      const chunk = studentIds.slice(i, i + 1000);
      const chunkStudents = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('students')
          .select(`
            id,
            name,
            father_name,
            picture_url,
            roll_number,
            class_id,
            section_id,
            classes:class_id(id, name),
            sections:section_id(id, name)
          `)
          .in('id', chunk)
          .eq('school_id', schoolId)
          .range(from, to);
      });
      allStudents.push(...chunkStudents);
    }
    const studentsData = allStudents;

    // Get attendance statistics for each student for the current month
    const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

    const fetchedStudentIds = studentsData?.map(s => s.id) || [];
    
    // Fetch all monthly attendance records for these students using fetchAllRows to handle pagination
    const monthlyAttendance = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .in('student_id', fetchedStudentIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('session_id', sessionData.id)
        .eq('school_id', schoolId)
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Calculate monthly statistics for each student
    const monthlyStats: Record<number, { absences: number; leaves: number; total: number; present: number }> = {};
    if (monthlyAttendance) {
      monthlyAttendance.forEach(record => {
        if (!monthlyStats[record.student_id]) {
          monthlyStats[record.student_id] = { absences: 0, leaves: 0, total: 0, present: 0 };
        }
        monthlyStats[record.student_id].total++;
        if (record.status === 'absent') {
          monthlyStats[record.student_id].absences++;
        } else if (record.status === 'leave') {
          monthlyStats[record.student_id].leaves++;
        } else if (record.status === 'present' || record.status === 'late') {
          monthlyStats[record.student_id].present++;
        }
      });
    }

    // Process and set data with monthly stats
    const details: Record<string, any> = {};
    studentsData?.forEach((student: any) => {
      const stats = monthlyStats[student.id] || { absences: 0, leaves: 0, total: 0, present: 0 };
      const attendancePercentage = stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100) 
        : 100;
      
      details[student.id] = {
        ...student,
        class_name: student.classes?.name || '',
        section_name: student.sections?.name || '',
        monthly_absences: stats.absences,
        monthly_leaves: stats.leaves,
        attendance_percentage: attendancePercentage
      };
    });

    setStudentDetails(details);
    setAbsentees(attendanceData);
  } catch (error) {
    console.error('Error fetching absentees:', error);
    setStudentDetails({});
    setAbsentees([]);
  }
};

// Additional attendance service functions will be added here

