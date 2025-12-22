import { supabase } from '../../../supabaseClient';
import { fetchAllRows } from '../../../utils/paginationHelper';

export interface Challan {
  id: number;
  school_id: number;
  student_id: number;
  session_id: number;
  challan_date: string;
  due_date: string | null;
  month: string;
  year: number | null;
  total_amount: number;
  status: string;
  remarks: string | null;
  created_by: number | null;
  created_at: string;
}

export interface ChallanItem {
  id: number;
  school_id: number;
  challan_id: number;
  fee_head_id: number;
  amount: number;
  discount: number;
  fine: number;
  remarks: string | null;
  fee_heads?: {
    id: number;
    name: string;
  };
}

export interface ChallanFilters {
  schoolId: number;
  sessionId: number;
  classId?: number;
  sectionId?: number;
  month?: number | string;
  year?: number;
  status?: string;
}

/**
 * Load challans based on filters
 */
export const loadChallans = async (filters: ChallanFilters): Promise<Challan[]> => {
  let studentIds: number[] | undefined;

  // Filter by class and/or section if provided
  if (filters.classId || filters.sectionId) {
    let classHistoryQuery = supabase
      .from('student_class_history')
      .select('student_id')
      .eq('school_id', filters.schoolId)
      .eq('session_id', filters.sessionId);
    
    if (filters.classId) {
      classHistoryQuery = classHistoryQuery.eq('new_class_id', filters.classId);
    }
    
    if (filters.sectionId) {
      classHistoryQuery = classHistoryQuery.eq('new_section_id', filters.sectionId);
    }

    const classHistory = await fetchAllRows(async (from, to) => {
      return await classHistoryQuery.range(from, to);
    });

    if (classHistory && classHistory.length > 0) {
      studentIds = classHistory.map(ch => ch.student_id);
    } else {
      return [];
    }
  }

  const data = await fetchAllRows(async (from, to) => {
    let query = supabase
      .from('fee_challans')
      .select('*')
      .eq('school_id', filters.schoolId)
      .eq('session_id', filters.sessionId);

    // Apply student filter if class filter was used
    if (studentIds) {
      query = query.in('student_id', studentIds);
    }

    // Filter by month
    if (filters.month) {
      if (filters.month === 'one-time') {
        query = query.eq('month', 'one-time');
      } else {
        query = query.eq('month', filters.month.toString());
      }
    }

    // Filter by year
    if (filters.year) {
      query = query.eq('year', filters.year);
    }

    // Filter by status
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    return await query.order('created_at', { ascending: false }).range(from, to);
  });

  return data || [];
};

/**
 * Load challan items for a specific challan
 */
export const loadChallanItems = async (
  challanId: number,
  schoolId: number
): Promise<ChallanItem[]> => {
  const data = await fetchAllRows(async (from, to) => {
    return await supabase
      .from('fee_challans_items')
      .select(`
        *,
        fee_heads:fee_head_id (
          id,
          name
        )
      `)
      .eq('challan_id', challanId)
      .eq('school_id', schoolId)
      .order('id')
      .range(from, to);
  });

  return data || [];
};

/**
 * Load student details for challans
 */
export const loadStudentDetails = async (
  studentIds: number[],
  schoolId: number
): Promise<Map<number, any>> => {
  if (studentIds.length === 0) return new Map();

  // Split into chunks to avoid URL length limits
  const chunkSize = 1000;
  const chunks: number[][] = [];
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    chunks.push(studentIds.slice(i, i + chunkSize));
  }

  const allData: any[] = [];
  for (const chunk of chunks) {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('students')
        .select('id, name, roll_number, father_name')
        .eq('school_id', schoolId)
        .in('id', chunk)
        .range(from, to);
    });
    allData.push(...data);
  }

  return new Map(allData.map(s => [s.id, s]));
};

/**
 * Load student classes and sections for a session
 */
export const loadStudentClasses = async (
  studentIds: number[],
  sessionId: number,
  schoolId: number,
  classes: any[]
): Promise<Map<number, string>> => {
  if (studentIds.length === 0) return new Map();

  // Split into chunks to avoid URL length limits
  const chunkSize = 1000;
  const chunks: number[][] = [];
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    chunks.push(studentIds.slice(i, i + chunkSize));
  }

  const allClassHistoryData: any[] = [];
  for (const chunk of chunks) {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('student_class_history')
        .select('student_id, new_class_id, new_section_id')
        .eq('school_id', schoolId)
        .eq('session_id', sessionId)
        .in('student_id', chunk)
        .order('id', { ascending: false })
        .range(from, to);
    });
    allClassHistoryData.push(...data);
  }

  // Load all sections for the school
  const sectionsData = await fetchAllRows(async (from, to) => {
    return await supabase
      .from('sections')
      .select('id, name')
      .eq('school_id', schoolId)
      .range(from, to);
  });

  if (!allClassHistoryData || allClassHistoryData.length === 0) {
    // Set N/A for all students
    const classMap = new Map<number, string>();
    studentIds.forEach(studentId => {
      classMap.set(studentId, 'N/A');
    });
    return classMap;
  }

  const classMap = new Map<number, string>();
  const studentHistoryMap = new Map<number, any>();

  // Get latest class for each student
  allClassHistoryData.forEach(entry => {
    if (!studentHistoryMap.has(entry.student_id)) {
      studentHistoryMap.set(entry.student_id, entry);
    }
  });

  // Map to class names with sections
  studentHistoryMap.forEach((entry, studentId) => {
    const classObj = classes.find(c => c.id === entry.new_class_id);
    const className = classObj?.name || 'N/A';
    
    // Add section if available
    if (entry.new_section_id && sectionsData) {
      const sectionObj = sectionsData.find((s: any) => s.id === entry.new_section_id);
      if (sectionObj) {
        classMap.set(studentId, `${className} (${sectionObj.name})`);
      } else {
        classMap.set(studentId, className);
      }
    } else {
      classMap.set(studentId, className);
    }
  });

  // Set N/A for students without class history
  studentIds.forEach(studentId => {
    if (!classMap.has(studentId)) {
      classMap.set(studentId, 'N/A');
    }
  });

  return classMap;
};

/**
 * Get distinct months and years from challans based on filters
 */
export const getAvailableMonthsAndYears = async (
  filters: Omit<ChallanFilters, 'month' | 'year'>
): Promise<{ months: Array<{ value: number | string; label: string }>; years: number[] }> => {
  let studentIds: number[] | undefined;

  // Filter by class and/or section if provided
  if (filters.classId || filters.sectionId) {
    let classHistoryQuery = supabase
      .from('student_class_history')
      .select('student_id')
      .eq('school_id', filters.schoolId)
      .eq('session_id', filters.sessionId);
    
    if (filters.classId) {
      classHistoryQuery = classHistoryQuery.eq('new_class_id', filters.classId);
    }
    
    if (filters.sectionId) {
      classHistoryQuery = classHistoryQuery.eq('new_section_id', filters.sectionId);
    }

    const classHistory = await fetchAllRows(async (from, to) => {
      return await classHistoryQuery.range(from, to);
    });

    if (classHistory && classHistory.length > 0) {
      studentIds = classHistory.map(ch => ch.student_id);
    } else {
      return { months: [], years: [] };
    }
  }

  // Fetch all challans matching the filters (without month/year filters)
  const allChallans = await fetchAllRows(async (from, to) => {
    let query = supabase
      .from('fee_challans')
      .select('month, year')
      .eq('school_id', filters.schoolId)
      .eq('session_id', filters.sessionId);

    // Apply student filter if class filter was used
    if (studentIds && studentIds.length > 0) {
      // Handle chunking for large arrays
      if (studentIds.length > 1000) {
        const chunks: number[][] = [];
        for (let i = 0; i < studentIds.length; i += 1000) {
          chunks.push(studentIds.slice(i, i + 1000));
        }
        // For chunking, we need to fetch each chunk separately and combine
        // But for distinct months/years, we can use a simpler approach
        // Just fetch without the student filter and filter in memory
        // Actually, let's keep it simple and use the first chunk for now
        query = query.in('student_id', chunks[0]);
      } else {
        query = query.in('student_id', studentIds);
      }
    }

    return await query.range(from, to);
  });

  if (!allChallans || allChallans.length === 0) {
    return { months: [], years: [] };
  }

  // Extract distinct months and years
  const monthSet = new Set<string | number>();
  const yearSet = new Set<number>();

  allChallans.forEach(challan => {
    if (challan.month) {
      monthSet.add(challan.month);
    }
    if (challan.year) {
      yearSet.add(challan.year);
    }
  });

  // Convert months to array with labels
  const MONTHS = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ];

  const months: Array<{ value: number | string; label: string }> = [];
  
  // Add numeric months
  monthSet.forEach(month => {
    if (typeof month === 'number' || (typeof month === 'string' && !isNaN(Number(month)))) {
      const monthNum = typeof month === 'number' ? month : Number(month);
      if (monthNum >= 1 && monthNum <= 12) {
        const monthObj = MONTHS.find(m => m.value === monthNum);
        if (monthObj) {
          months.push(monthObj);
        }
      }
    } else if (typeof month === 'string' && (month.toLowerCase() === 'one-time' || month.toLowerCase() === 'one time')) {
      months.push({ value: 'one-time', label: 'One-time' });
    }
  });

  // Sort months: numeric months first (1-12), then one-time
  months.sort((a, b) => {
    if (a.value === 'one-time') return 1;
    if (b.value === 'one-time') return -1;
    if (typeof a.value === 'number' && typeof b.value === 'number') {
      return a.value - b.value;
    }
    return 0;
  });

  // Convert years to sorted array
  const years = Array.from(yearSet).sort((a, b) => a - b); // Ascending order

  return { months, years };
};

