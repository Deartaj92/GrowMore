import { supabase } from '../supabaseClient';
import {
  ExpenseCategory,
  Expense,
  ExpenseAttachment,
  ExpenseFilters,
  ExpenseSummary
} from '../types/expense';

export const expenseService = {
  // Expense Categories
  async getExpenseCategories(schoolId: number, includeInactive: boolean = false): Promise<ExpenseCategory[]> {
    let query = supabase
      .from('expense_categories')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      name: item.name,
      description: item.description,
      color: item.color || '#3b82f6',
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async createExpenseCategory(category: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseCategory> {
    const { schoolId, name, description, color, isActive } = category;
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        school_id: schoolId,
        name,
        description,
        color: color || '#3b82f6',
        is_active: isActive !== undefined ? isActive : true,
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      name: data.name,
      description: data.description,
      color: data.color,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateExpenseCategory(
    id: number,
    schoolId: number,
    updates: Partial<Pick<ExpenseCategory, 'name' | 'description' | 'color' | 'isActive'>>
  ): Promise<void> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    updateData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('expense_categories')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  async deleteExpenseCategory(id: number, schoolId: number): Promise<void> {
    // Check if category is used by any expenses
    const { data: expenses, error: checkError } = await supabase
      .from('expenses')
      .select('id')
      .eq('category_id', id)
      .eq('school_id', schoolId)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (expenses && expenses.length > 0) {
      throw new Error('Cannot delete category that has associated expenses. Please deactivate it instead.');
    }
    
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Expenses
  async getExpenses(schoolId: number, filters: ExpenseFilters = {}): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          color,
          is_active
        ),
        accounts (
          id,
          name,
          type,
          bank_name,
          account_number,
          wallet_number,
          mobile_number,
          iban,
          swift_code,
          raast_id
        )
      `)
      .eq('school_id', schoolId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.startDate) {
      query = query.gte('expense_date', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('expense_date', filters.endDate);
    }
    
    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    let expenses = (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      categoryId: item.category_id,
      title: item.title,
      description: item.description,
      amount: parseFloat(item.amount),
      expenseDate: item.expense_date,
      paymentMethod: item.payment_method,
      referenceNumber: item.reference_number,
      vendorName: item.vendor_name,
      vendorContact: item.vendor_contact,
      status: item.status,
      approvedBy: item.approved_by,
      approvedAt: item.approved_at,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      accountId: item.account_id || undefined,
      transactionId: item.transaction_id || undefined,
      chequeNumber: item.cheque_number || undefined,
      category: item.expense_categories ? {
        id: item.expense_categories.id,
        schoolId: item.expense_categories.school_id,
        name: item.expense_categories.name,
        description: item.expense_categories.description,
        color: item.expense_categories.color,
        isActive: item.expense_categories.is_active,
      } : undefined,
      account: item.accounts ? {
        id: item.accounts.id,
        name: item.accounts.name,
        type: item.accounts.type,
        bank_name: item.accounts.bank_name,
        account_number: item.accounts.account_number,
        wallet_number: item.accounts.wallet_number,
        mobile_number: item.accounts.mobile_number,
        iban: item.accounts.iban,
        swift_code: item.accounts.swift_code,
        raast_id: item.accounts.raast_id,
      } : undefined,
    }));
    
    // Apply search filter if provided
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      expenses = expenses.filter(expense =>
        expense.title.toLowerCase().includes(searchLower) ||
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.vendorName?.toLowerCase().includes(searchLower) ||
        expense.referenceNumber?.toLowerCase().includes(searchLower)
      );
    }
    
    return expenses;
  },

  async getExpense(id: number, schoolId: number): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          color,
          is_active
        ),
        accounts (
          id,
          name,
          type,
          bank_name,
          account_number,
          wallet_number,
          mobile_number,
          iban,
          swift_code,
          raast_id
        )
      `)
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    if (!data) return null;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      title: data.title,
      description: data.description,
      amount: parseFloat(data.amount),
      expenseDate: data.expense_date,
      paymentMethod: data.payment_method,
      referenceNumber: data.reference_number,
      vendorName: data.vendor_name,
      vendorContact: data.vendor_contact,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.expense_categories ? {
        id: data.expense_categories.id,
        schoolId: data.expense_categories.school_id,
        name: data.expense_categories.name,
        description: data.expense_categories.description,
        color: data.expense_categories.color,
        isActive: data.expense_categories.is_active,
      } : undefined,
    };
  },

  async createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'account' | 'createdByUser' | 'approvedByUser'>): Promise<Expense> {
    const {
      schoolId,
      categoryId,
      title,
      description,
      amount,
      expenseDate,
      paymentMethod,
      referenceNumber,
      vendorName,
      vendorContact,
      status,
      createdBy,
      accountId,
      transactionId,
      chequeNumber,
    } = expense;
    
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        school_id: schoolId,
        category_id: categoryId,
        title,
        description,
        amount,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        vendor_name: vendorName,
        vendor_contact: vendorContact,
        status: status || 'pending',
        created_by: createdBy,
        account_id: accountId || null,
        transaction_id: transactionId || null,
        cheque_number: chequeNumber || null,
      })
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          color,
          is_active
        ),
        accounts (
          id,
          name,
          type,
          bank_name,
          account_number,
          wallet_number,
          mobile_number,
          iban,
          swift_code,
          raast_id
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      title: data.title,
      description: data.description,
      amount: parseFloat(data.amount),
      expenseDate: data.expense_date,
      paymentMethod: data.payment_method,
      referenceNumber: data.reference_number,
      vendorName: data.vendor_name,
      vendorContact: data.vendor_contact,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      accountId: data.account_id || undefined,
      transactionId: data.transaction_id || undefined,
      chequeNumber: data.cheque_number || undefined,
      category: data.expense_categories ? {
        id: data.expense_categories.id,
        schoolId: data.expense_categories.school_id,
        name: data.expense_categories.name,
        description: data.expense_categories.description,
        color: data.expense_categories.color,
        isActive: data.expense_categories.is_active,
      } : undefined,
      account: data.accounts ? {
        id: data.accounts.id,
        name: data.accounts.name,
        type: data.accounts.type,
        bank_name: data.accounts.bank_name,
        account_number: data.accounts.account_number,
        wallet_number: data.accounts.wallet_number,
        mobile_number: data.accounts.mobile_number,
        iban: data.accounts.iban,
        swift_code: data.accounts.swift_code,
        raast_id: data.accounts.raast_id,
      } : undefined,
    };
  },

  async updateExpense(
    id: number,
    schoolId: number,
    updates: Partial<Omit<Expense, 'id' | 'schoolId' | 'createdAt' | 'updatedAt' | 'category' | 'account' | 'createdByUser' | 'approvedByUser'>>
  ): Promise<Expense> {
    const updateData: any = {};
    
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.expenseDate !== undefined) updateData.expense_date = updates.expenseDate;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.referenceNumber !== undefined) updateData.reference_number = updates.referenceNumber;
    if (updates.vendorName !== undefined) updateData.vendor_name = updates.vendorName;
    if (updates.vendorContact !== undefined) updateData.vendor_contact = updates.vendorContact;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.approvedBy !== undefined) updateData.approved_by = updates.approvedBy;
    if (updates.approvedAt !== undefined) updateData.approved_at = updates.approvedAt;
    if (updates.accountId !== undefined) updateData.account_id = updates.accountId || null;
    if (updates.transactionId !== undefined) updateData.transaction_id = updates.transactionId || null;
    if (updates.chequeNumber !== undefined) updateData.cheque_number = updates.chequeNumber || null;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          color,
          is_active
        ),
        accounts (
          id,
          name,
          type,
          bank_name,
          account_number,
          wallet_number,
          mobile_number,
          iban,
          swift_code,
          raast_id
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      title: data.title,
      description: data.description,
      amount: parseFloat(data.amount),
      expenseDate: data.expense_date,
      paymentMethod: data.payment_method,
      referenceNumber: data.reference_number,
      vendorName: data.vendor_name,
      vendorContact: data.vendor_contact,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      accountId: data.account_id || undefined,
      transactionId: data.transaction_id || undefined,
      chequeNumber: data.cheque_number || undefined,
      category: data.expense_categories ? {
        id: data.expense_categories.id,
        schoolId: data.expense_categories.school_id,
        name: data.expense_categories.name,
        description: data.expense_categories.description,
        color: data.expense_categories.color,
        isActive: data.expense_categories.is_active,
      } : undefined,
      account: data.accounts ? {
        id: data.accounts.id,
        name: data.accounts.name,
        type: data.accounts.type,
        bank_name: data.accounts.bank_name,
        account_number: data.accounts.account_number,
        wallet_number: data.accounts.wallet_number,
        mobile_number: data.accounts.mobile_number,
        iban: data.accounts.iban,
        swift_code: data.accounts.swift_code,
        raast_id: data.accounts.raast_id,
      } : undefined,
    };
  },

  async deleteExpense(id: number, schoolId: number): Promise<void> {
    // Delete attachments first
    await supabase
      .from('expense_attachments')
      .delete()
      .eq('expense_id', id)
      .eq('school_id', schoolId);
    
    // Delete expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  async approveExpense(id: number, schoolId: number, approvedBy: number): Promise<Expense> {
    return this.updateExpense(id, schoolId, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString(),
    });
  },

  async rejectExpense(id: number, schoolId: number, approvedBy: number): Promise<Expense> {
    return this.updateExpense(id, schoolId, {
      status: 'rejected',
      approvedBy,
      approvedAt: new Date().toISOString(),
    });
  },

  // Expense Attachments
  async getExpenseAttachments(expenseId: number, schoolId: number): Promise<ExpenseAttachment[]> {
    const { data, error } = await supabase
      .from('expense_attachments')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      expenseId: item.expense_id,
      fileName: item.file_name,
      fileUrl: item.file_url,
      fileType: item.file_type,
      fileSize: item.file_size,
      uploadedBy: item.uploaded_by,
      createdAt: item.created_at,
    }));
  },

  async createExpenseAttachment(attachment: Omit<ExpenseAttachment, 'id' | 'createdAt'>): Promise<ExpenseAttachment> {
    const { schoolId, expenseId, fileName, fileUrl, fileType, fileSize, uploadedBy } = attachment;
    
    const { data, error } = await supabase
      .from('expense_attachments')
      .insert({
        school_id: schoolId,
        expense_id: expenseId,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize,
        uploaded_by: uploadedBy,
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      expenseId: data.expense_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileType: data.file_type,
      fileSize: data.file_size,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
    };
  },

  async deleteExpenseAttachment(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('expense_attachments')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Expense Summary/Analytics
  async getExpenseSummary(schoolId: number, startDate?: string, endDate?: string): Promise<ExpenseSummary> {
    let query = supabase
      .from('expenses')
      .select('amount, category_id, status, payment_method, expense_date, expense_categories(name, color)')
      .eq('school_id', schoolId);
    
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const expenses = data || [];
    
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    // Total by category
    const categoryMap = new Map<number, { name: string; total: number; color: string }>();
    expenses.forEach(exp => {
      const catId = exp.category_id;
      const category = (exp as any).expense_categories;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          name: category?.name || 'Unknown',
          total: 0,
          color: category?.color || '#3b82f6',
        });
      }
      const cat = categoryMap.get(catId)!;
      cat.total += parseFloat(exp.amount);
    });
    
    // Total by status
    const statusMap = new Map<string, { total: number; count: number }>();
    expenses.forEach(exp => {
      const status = exp.status;
      if (!statusMap.has(status)) {
        statusMap.set(status, { total: 0, count: 0 });
      }
      const stat = statusMap.get(status)!;
      stat.total += parseFloat(exp.amount);
      stat.count += 1;
    });
    
    // Total by payment method
    const methodMap = new Map<string, { total: number; count: number }>();
    expenses.forEach(exp => {
      const method = exp.payment_method;
      if (!methodMap.has(method)) {
        methodMap.set(method, { total: 0, count: 0 });
      }
      const meth = methodMap.get(method)!;
      meth.total += parseFloat(exp.amount);
      meth.count += 1;
    });
    
    // Monthly totals
    const monthlyMap = new Map<string, number>();
    expenses.forEach(exp => {
      const date = new Date(exp.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, 0);
      }
      monthlyMap.set(monthKey, monthlyMap.get(monthKey)! + parseFloat(exp.amount));
    });
    
    return {
      totalExpenses,
      totalByCategory: Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        total: data.total,
        color: data.color,
      })),
      totalByStatus: Array.from(statusMap.entries()).map(([status, data]) => ({
        status,
        total: data.total,
        count: data.count,
      })),
      totalByPaymentMethod: Array.from(methodMap.entries()).map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
      })),
      monthlyTotal: Array.from(monthlyMap.entries())
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  },
};

