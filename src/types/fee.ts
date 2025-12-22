// Fee Management Types

export interface FeeHead {
  id: number;
  schoolId: number;
  name: string;
  description?: string;
  isRecurring: boolean;
  defaultAmount: number;
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'one-time';
  autoGenerate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeStructure {
  id: number;
  schoolId: number;
  classId: number;
  sectionId?: number;
  feeHeadId: number;
  amount: number;
  months?: number[]; // Array of month numbers (1-12) when fees should be collected
  firstTime?: boolean; // Whether this fee should be collected on first time enrollment
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentFeePlan {
  id: number;
  schoolId: number;
  studentId: number;
  sessionId: number;
  feeHeadId: number;
  amount: number;
  isCustom: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeInvoice {
  id: number;
  schoolId: number;
  studentId: number;
  sessionId: number;
  invoiceDate: string;
  dueDate: string;
  month?: string;
  year?: number;
  totalAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled';
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeInvoiceItem {
  id: number;
  schoolId: number;
  invoiceId: number;
  feeHeadId: number;
  amount: number;
  discount: number;
  fine: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeePayment {
  id: number;
  schoolId: number;
  invoiceId: number;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  receivedBy?: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeAuditLog {
  id: number;
  school_id: number;
  entity: string;
  entity_id: number;
  action: string;
  old_values?: any;
  new_values?: any;
  changed_by?: number;
  changed_at: string;
  changedByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
} 

export interface StudentFeeConcession {
  id: number;
  schoolId: number;
  studentId: number;
  feeHeadId: number;
  concessionAmount: number;
  effectiveFrom?: string;
  expires_on?: string;
}

export interface FeePlan {
  id: number;
  schoolId: number;
  studentId: number;
  effectiveFrom: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface FeePlanItem {
  id: number;
  feePlanId: number;
  schoolId: number;
  feeHeadId: number;
  actualFee: number;
  discountAmount: number;
  discountPercent: number;
  feeAfterDiscount: number;
  discountType?: string;
  discountReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeePlanWithItems extends FeePlan {
  items: FeePlanItem[];
} 