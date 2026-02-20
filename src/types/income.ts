export interface IncomeCategory {
  id: number;
  schoolId: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Income {
  id: number;
  schoolId: number;
  categoryId: number;
  title: string;
  description?: string;
  amount: number;
  incomeDate: string;
  paymentMethod: 'cash' | 'cheque' | 'account' | 'bank_transfer' | 'card' | 'online' | 'other' | string; // Allow string for account-based payments
  accountId?: number;
  transactionId?: string;
  chequeNumber?: string;
  payerName?: string;
  payerContact?: string;
  status: 'pending' | 'approved' | 'rejected' | 'received';
  approvedBy?: number;
  approvedAt?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  category?: IncomeCategory;
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
}

export interface IncomeFilters {
  categoryId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  paymentMethod?: string;
}

export interface IncomeSummary {
  total: number;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    total: number;
  }>;
  byStatus: Array<{
    status: string;
    total: number;
  }>;
}

