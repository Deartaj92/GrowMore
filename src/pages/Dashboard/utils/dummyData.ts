export const generateDummyStudents = (count: number = 500) => {
  const dummyClasses = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  const dummySections = ['A', 'B', 'C'];
  const genders = ['Male', 'Female'];
  const statuses = ['active'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Student ${i + 1}`,
    father_name: `Father ${i + 1}`,
    gender: genders[i % genders.length],
    status: statuses[0],
    class_id: (i % dummyClasses.length) + 1,
    section_id: (i % dummySections.length) + 1,
    picture_url: null,
    roll_number: String(i + 1),
  }));
};

export const generateDummyClasses = () => {
  return ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map((name, i) => ({
    id: i + 1,
    name,
    has_sections: true,
  }));
};

export const generateDummySections = () => {
  const sections = ['A', 'B', 'C'];
  const classes = generateDummyClasses();
  const result: any[] = [];
  classes.forEach((cls) => {
    sections.forEach((sec, idx) => {
      result.push({
        id: cls.id * 10 + idx + 1,
        name: sec,
        class_id: cls.id,
      });
    });
  });
  return result;
};

export const generateDummyAttendance = (studentIds: number[], date: string, sessionId: number) => {
  const statuses = ['present', 'absent', 'late', 'leave'];
  return studentIds.map((studentId, i) => ({
    id: i + 1,
    student_id: studentId,
    status: statuses[i % statuses.length],
    date,
    session_id: sessionId,
    class_id: (i % 10) + 1,
    section_id: ((i % 10) * 3) + 1,
    remarks: null,
  }));
};

export const generateDummySession = () => ({
  id: 1,
  is_active: true,
  start_date: '2024-01-01',
  end_date: '2024-12-31',
});

export const generateDummyStudentClassHistory = (studentIds: number[], sessionId: number) => {
  return studentIds.map((studentId, i) => ({
    id: i + 1,
    student_id: studentId,
    session_id: sessionId,
    new_class_id: (i % 10) + 1,
    new_section_id: ((i % 10) * 3) + 1,
    status: 'active',
    created_at: new Date().toISOString(),
  }));
};

export const generateDummyFeeSummary = () => ({
  totalInvoiced: 5000000,
  totalCollected: 3500000,
  totalOutstanding: 1500000,
  collectionRate: 70,
});

export const generateDummyFeeCollectionCharts = () => {
  const today = new Date();
  
  // Generate last 7 days data
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i)); // Last 7 days including today
    const dayLabel = `${date.getDate()}/${date.getMonth() + 1}`;
    return {
      day: dayLabel,
      amount: Math.floor(Math.random() * 50000) + 10000,
    };
  });

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      amount: Math.floor(Math.random() * 500000) + 200000,
    });
  }

  return { daily: dailyData, monthly: months };
};

export const generateDummyFeeCollectionDetails = () => ({
  previousArrears: {
    oldStudents: 500000,
    newAdmissions: 100000,
    totalPayable: 600000,
    paid: 400000,
    discount: 20000,
    droppedOut: 30000,
    remaining: 150000,
  },
  currentMonth: {
    oldStudents: 800000,
    newAdmissions: 200000,
    totalPayable: 1000000,
    paid: 700000,
    discount: 50000,
    droppedOut: 0,
    remaining: 250000,
  },
  nextMonths: {
    oldStudents: 600000,
    newAdmissions: 150000,
    totalPayable: 750000,
    paid: 100000,
    discount: 0,
    droppedOut: 0,
    remaining: 650000,
  },
  total: {
    oldStudents: 1900000,
    newAdmissions: 450000,
    totalPayable: 2350000,
    paid: 1200000,
    discount: 70000,
    droppedOut: 30000,
    remaining: 1050000,
  },
});

export const generateDummyDefaulters = () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() - i - 1, 1);
    const monthLabel = `${date.toLocaleDateString('en-US', { month: 'short' })}-${date.getFullYear()}`;
    months.push({
      month: monthLabel,
      challan: Math.floor(Math.random() * 50) + 10,
      amount: Math.floor(Math.random() * 200000) + 50000,
    });
  }
  return months;
};

export const generateDummyAdmissions = () => {
  const today = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      students: Math.floor(Math.random() * 30) + 10,
      boys: Math.floor(Math.random() * 20) + 5,
      girls: Math.floor(Math.random() * 15) + 3,
    });
  }

  return {
    totalInquiries: 500,
    inquiriesThisMonth: 45,
    totalStudents: 1200,
    studentsThisMonth: 35,
    totalFamilies: 800,
    familiesThisMonth: 25,
    totalFeePlans: 1000,
    feePlansThisMonth: 30,
    admissionsChart: months,
    withdrawalsChart: months.map(m => ({ ...m, students: Math.floor(m.students * 0.1) })),
    genderData: [
      { name: 'Boys', value: 650, color: '#22c55e' },
      { name: 'Girls', value: 550, color: '#a78bfa' },
    ],
    gradeDistribution: ['1st', '2nd', '3rd', '4th', '5th'].map((grade, i) => ({
      grade,
      boys: Math.floor(Math.random() * 30) + 10,
      girls: Math.floor(Math.random() * 25) + 8,
      total: Math.floor(Math.random() * 55) + 18,
    })),
    latestAdmissions: Array.from({ length: 5 }, (_, i) => ({
      name: `New Student ${i + 1}`,
      pictureUrl: null,
      className: `${i + 1}st`,
      admissionDate: new Date().toISOString(),
    })),
    todaysBirthdays: Array.from({ length: 3 }, (_, i) => ({
      name: `Birthday Student ${i + 1}`,
      pictureUrl: null,
      className: `${i + 2}nd`,
    })),
    todaysBirthdaysCount: 3,
  };
};

export const generateDummyAbsentees = (studentIds: number[], date: string) => {
  const absentCount = Math.floor(studentIds.length * 0.15); // 15% absent
  const selectedIds = studentIds.slice(0, absentCount);
  return selectedIds.map((studentId, i) => ({
    id: i + 1,
    student_id: studentId,
    status: 'absent',
    date,
    remarks: null,
    class_id: (i % 10) + 1,
    section_id: ((i % 10) * 3) + 1,
  }));
};

export const generateDummyAttendanceTrend = () => {
  const today = new Date();
  // Generate exactly 7 days of data (one week)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      day: `${date.getDate()}/${date.getMonth() + 1}`,
      rate: Math.floor(Math.random() * 20) + 75, // 75-95%
    };
  });
};

export const generateDummyClassAttendance = () => {
  const classes = generateDummyClasses();
  return classes.map((cls, i) => ({
    class: cls.name,
    present: Math.floor(Math.random() * 40) + 20,
    absent: Math.floor(Math.random() * 10) + 2,
    leave: Math.floor(Math.random() * 5) + 1,
    late: Math.floor(Math.random() * 3),
    total: Math.floor(Math.random() * 50) + 25,
  }));
};

export const generateDummyFineDetails = () => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    student_id: i + 1,
    amount: Math.floor(Math.random() * 500) + 100,
    remission: 0,
    date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  }));
};

export const generateDummyConsecutiveAbsent = () => {
  return Array.from({ length: 5 }, (_, i) => ({
    student_id: i + 1,
    student_name: `Student ${i + 1}`,
    father_name: `Father ${i + 1}`,
    mobile: `0300${i + 1}000000`,
    roll_number: `${i + 1}`,
    class_name: `${i + 1}st`,
    section_name: 'A',
    consecutive_days: Math.floor(Math.random() * 10) + 3,
  }));
};

export const generateDummyAttendanceStats = () => {
  return {
    present: 450,
    absent: 50,
    chronic: 5,
    rate: 90,
    totalStudents: 500,
  };
};

