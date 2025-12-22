export interface FeePlanFormData {
  effectiveFrom: string;
  notes?: string;
  items: FeePlanItemFormData[];
}

export interface FeePlanItemFormData {
  feeHeadId: number;
  actualFee: number;
  discountAmount: number;
  discountPercent: number;
  feeAfterDiscount: number;
  discountType?: string;
  discountReason?: string;
}

export interface StudentInfo {
  id: number;
  name: string;
  fatherName?: string;
  studentNumber?: string;
  rollNumber?: string | null;
  dateOfAdmission?: string;
  campus?: string;
  className?: string;
  sectionName?: string;
  classId?: number;
  sectionId?: number;
  transport?: string;
  feeSchedule?: string;
}

