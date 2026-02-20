// Liability Management Types

export type PaymentFrequency = 'monthly' | 'quarterly' | 'annually' | 'one-time';
export type LiabilityStatus = 'active' | 'paid_off' | 'defaulted' | 'restructured';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'online' | 'other';

export interface LiabilityCategory {
  id: number;
  schoolId: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Liability {
  id: number;
  schoolId: number;
  categoryId: number;
  name: string;
  description?: string;
  principalAmount: number;
  currentBalance: number;
  interestRate?: number | null; // Annual percentage (optional, NULL by default)
  startDate: string;
  dueDate?: string;
  paymentFrequency: PaymentFrequency;
  paymentAmount?: number; // Per payment
  lenderName?: string;
  accountNumber?: string;
  referenceNumber?: string;
  status: LiabilityStatus;
  paidOffDate?: string;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  category?: LiabilityCategory;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface LiabilityPayment {
  id: number;
  schoolId: number;
  liabilityId: number;
  paymentDate: string;
  paymentAmount: number;
  principalPaid: number;
  interestPaid?: number | null; // NULL if liability has no interest rate
  paymentMethod: PaymentMethod;
  accountId?: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  // Joined data
  liability?: Liability;
  account?: {
    id: number;
    name: string;
    type: string;
    bank_name?: string;
    account_number?: string;
    wallet_number?: string;
    mobile_number?: string;
    iban?: string;
    swift_code?: string;
    raast_id?: string;
  };
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface LiabilityAttachment {
  id: number;
  schoolId: number;
  liabilityId: number;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: number;
  createdAt?: string;
}

export interface LiabilityFilters {
  categoryId?: number;
  status?: LiabilityStatus | string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  hasInterest?: boolean; // Filter by whether liability has interest
}

export interface LiabilitySummary {
  totalLiabilities: number;
  totalPrincipal: number;
  totalCurrentBalance: number;
  totalInterestPaid: number;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    count: number;
    totalPrincipal: number;
    totalCurrentBalance: number;
    color: string;
  }>;
  byStatus: Array<{
    status: LiabilityStatus;
    count: number;
    totalBalance: number;
  }>;
  byPaymentFrequency: Array<{
    frequency: PaymentFrequency;
    count: number;
    totalBalance: number;
  }>;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: {
    total: number;
    byCategory: Array<{
      categoryId: number;
      categoryName: string;
      total: number;
      color: string;
    }>;
  };
  liabilities: {
    total: number;
    byCategory: Array<{
      categoryId: number;
      categoryName: string;
      total: number;
      color: string;
    }>;
  };
  netWorth: number;
}





