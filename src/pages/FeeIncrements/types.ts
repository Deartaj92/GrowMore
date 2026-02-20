export interface IncrementFormData {
  incrementType: 'percentage' | 'fixed';
  incrementValue: number;
  targetType: 'plans' | 'structures' | 'both';
  preserveDiscountAmount?: boolean;
  studentIds?: number[];
  classIds?: number[];
  feeHeadIds?: number[];
}

export interface IncrementPreviewItem {
  id: string;
  type: 'fee_plan' | 'fee_structure';
  name: string;
  currentAmount: number;
  newAmount: number;
  change: number;
  changePercent: number;
  feeHeadName?: string;
  className?: string;
  studentName?: string;
}

export interface StudentInfo {
  id: number;
  name: string;
  classId?: number;
}

export interface ClassInfo {
  id: number;
  name: string;
}

export interface IncrementHistory {
  id: number;
  schoolId: number;
  sessionId: number;
  session?: {
    id: number;
    name: string;
    is_active: boolean;
  };
  incrementType: 'percentage' | 'fixed';
  incrementValue: number;
  targetType: 'fee_plans' | 'fee_structures' | 'both';
  filterOptions: {
    studentIds?: number[];
    classIds?: number[];
    feeHeadIds?: number[];
    preserveDiscountAmount?: boolean;
  };
  itemsUpdated: number;
  affectedStudents?: number;
  status: 'active' | 'reversed' | 'edited';
  snapshotBefore: any[];
  createdBy?: number;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  parentIncrementId?: number;
  remarks?: string;
}
