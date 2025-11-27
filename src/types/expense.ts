// Expense Management Types

export interface ExpenseCategory {
  id: number;
  schoolId: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: number;
  schoolId: number;
  categoryId: number;
  title: string;
  description?: string;
  amount: number;
  expenseDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'online' | 'other';
  referenceNumber?: string;
  vendorName?: string;
  vendorContact?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: number;
  approvedAt?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  category?: ExpenseCategory;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
  approvedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ExpenseAttachment {
  id: number;
  schoolId: number;
  expenseId: number;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: number;
  createdAt?: string;
}

export interface ExpenseFilters {
  categoryId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  searchQuery?: string;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalByCategory: { categoryId: number; categoryName: string; total: number; color: string }[];
  totalByStatus: { status: string; total: number; count: number }[];
  totalByPaymentMethod: { method: string; total: number; count: number }[];
  monthlyTotal: { month: string; total: number }[];
}

