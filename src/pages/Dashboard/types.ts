export type DashboardTab = 'attendance' | 'fee' | 'admissions' | 'homework' | 'employeeAttendance' | 'accounts';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export type StatusType = 'good' | 'warning' | 'bad';

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}

export interface FineToDelete {
  id: string;
  studentName: string;
  studentId: string;
  className: string;
  amount: number;
  date: string;
}

export interface FeeSummary {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
}

export interface FeeCollectionPeriod {
  oldStudents: number;
  newAdmissions: number;
  totalPayable: number;
  paid: number;
  discount: number;
  droppedOut: number;
  remaining: number;
}

export interface FeeCollectionDetails {
  previousArrears: FeeCollectionPeriod;
  currentMonth: FeeCollectionPeriod;
  nextMonths: FeeCollectionPeriod;
  total: FeeCollectionPeriod;
}

export interface DefaulterData {
  month: string;
  challan: number;
  amount: number;
}

export interface AdmissionsData {
  totalInquiries: number;
  inquiriesThisMonth: number;
  totalStudents: number;
  studentsThisMonth: number;
  totalFamilies: number;
  familiesThisMonth: number;
  totalFeePlans: number;
  feePlansThisMonth: number;
  admissionsChart: any[];
  withdrawalsChart: any[];
  genderData: any[];
  gradeDistribution: any[];
  latestAdmissions: any[];
  todaysBirthdays: any[];
  todaysBirthdaysCount: number;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  chronic: number;
  rate: number;
  totalStudents: number;
}

export interface CollectionChartData {
  day?: string;
  month?: string;
  amount: number;
}

export interface HoveredAvatar {
  url: string;
  x: number;
  y: number;
}

export interface DropdownPosition {
  top: number;
  left: number;
}

