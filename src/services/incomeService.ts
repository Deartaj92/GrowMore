import { supabase } from '../supabaseClient';
import {
  IncomeCategory,
  Income,
  IncomeFilters,
  IncomeSummary
} from '../types/income';

export const incomeService = {
  // Income Categories
  async getIncomeCategories(schoolId: number, includeInactive: boolean = false): Promise<IncomeCategory[]> {
    let query = supabase
      .from('income_categories')
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
      color: item.color || '#22c55e',
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async createIncomeCategory(category: Omit<IncomeCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncomeCategory> {
    const { schoolId, name, description, color, isActive } = category;
    const { data, error } = await supabase
      .from('income_categories')
      .insert({
        school_id: schoolId,
        name,
        description,
        color: color || '#22c55e',
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

  async updateIncomeCategory(
    id: number,
    schoolId: number,
    updates: Partial<Pick<IncomeCategory, 'name' | 'description' | 'color' | 'isActive'>>
  ): Promise<void> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    updateData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('income_categories')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  async deleteIncomeCategory(id: number, schoolId: number): Promise<void> {
    // Check if category is used by any incomes
    const { data: incomes, error: checkError } = await supabase
      .from('other_incomes')
      .select('id')
      .eq('category_id', id)
      .eq('school_id', schoolId)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (incomes && incomes.length > 0) {
      throw new Error('Cannot delete category that has associated income records. Please deactivate it instead.');
    }
    
    const { error } = await supabase
      .from('income_categories')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Incomes
  async getIncomes(schoolId: number, filters: IncomeFilters = {}): Promise<Income[]> {
    let query = supabase
      .from('other_incomes')
      .select(`
        *,
        income_categories (
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
      .order('income_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.startDate) {
      query = query.gte('income_date', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('income_date', filters.endDate);
    }
    
    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    let incomes = (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      categoryId: item.category_id,
      title: item.title,
      description: item.description,
      amount: parseFloat(item.amount),
      incomeDate: item.income_date,
      paymentMethod: item.payment_method,
      accountId: item.account_id || undefined,
      transactionId: item.transaction_id || undefined,
      chequeNumber: item.cheque_number || undefined,
      payerName: item.payer_name,
      payerContact: item.payer_contact,
      status: item.status,
      approvedBy: item.approved_by,
      approvedAt: item.approved_at,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      category: item.income_categories ? {
        id: item.income_categories.id,
        schoolId: item.income_categories.school_id,
        name: item.income_categories.name,
        description: item.income_categories.description,
        color: item.income_categories.color,
        isActive: item.income_categories.is_active,
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
      incomes = incomes.filter(income =>
        income.title.toLowerCase().includes(searchLower) ||
        income.description?.toLowerCase().includes(searchLower) ||
        income.payerName?.toLowerCase().includes(searchLower) ||
        income.transactionId?.toLowerCase().includes(searchLower) ||
        income.chequeNumber?.toLowerCase().includes(searchLower)
      );
    }
    
    return incomes;
  },

  async getIncome(id: number, schoolId: number): Promise<Income | null> {
    const { data, error } = await supabase
      .from('other_incomes')
      .select(`
        *,
        income_categories (
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
      incomeDate: data.income_date,
      paymentMethod: data.payment_method,
      accountId: data.account_id || undefined,
      transactionId: data.transaction_id || undefined,
      chequeNumber: data.cheque_number || undefined,
      payerName: data.payer_name,
      payerContact: data.payer_contact,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.income_categories ? {
        id: data.income_categories.id,
        schoolId: data.income_categories.school_id,
        name: data.income_categories.name,
        description: data.income_categories.description,
        color: data.income_categories.color,
        isActive: data.income_categories.is_active,
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

  async createIncome(income: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'account'>): Promise<Income> {
    const {
      schoolId,
      categoryId,
      title,
      description,
      amount,
      incomeDate,
      paymentMethod,
      accountId,
      transactionId,
      chequeNumber,
      payerName,
      payerContact,
      status,
      createdBy,
    } = income;
    
    const { data, error } = await supabase
      .from('other_incomes')
      .insert({
        school_id: schoolId,
        category_id: categoryId,
        title,
        description,
        amount,
        income_date: incomeDate,
        payment_method: paymentMethod,
        account_id: accountId || null,
        transaction_id: transactionId || null,
        cheque_number: chequeNumber || null,
        payer_name: payerName,
        payer_contact: payerContact,
        status: status || 'pending',
        created_by: createdBy,
      })
      .select(`
        *,
        income_categories (
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
      incomeDate: data.income_date,
      paymentMethod: data.payment_method,
      accountId: data.account_id || undefined,
      transactionId: data.transaction_id || undefined,
      chequeNumber: data.cheque_number || undefined,
      payerName: data.payer_name,
      payerContact: data.payer_contact,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.income_categories ? {
        id: data.income_categories.id,
        schoolId: data.income_categories.school_id,
        name: data.income_categories.name,
        description: data.income_categories.description,
        color: data.income_categories.color,
        isActive: data.income_categories.is_active,
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

  async updateIncome(
    id: number,
    schoolId: number,
    updates: Partial<Omit<Income, 'id' | 'schoolId' | 'createdAt' | 'updatedAt' | 'category' | 'account'>>
  ): Promise<void> {
    const updateData: any = {};
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.incomeDate !== undefined) updateData.income_date = updates.incomeDate;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.accountId !== undefined) updateData.account_id = updates.accountId || null;
    if (updates.transactionId !== undefined) updateData.transaction_id = updates.transactionId || null;
    if (updates.chequeNumber !== undefined) updateData.cheque_number = updates.chequeNumber || null;
    if (updates.payerName !== undefined) updateData.payer_name = updates.payerName;
    if (updates.payerContact !== undefined) updateData.payer_contact = updates.payerContact;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.approvedBy !== undefined) updateData.approved_by = updates.approvedBy || null;
    if (updates.approvedAt !== undefined) updateData.approved_at = updates.approvedAt || null;
    updateData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('other_incomes')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  async deleteIncome(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('other_incomes')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  async getIncomeSummary(schoolId: number, startDate?: string, endDate?: string): Promise<IncomeSummary> {
    let query = supabase
      .from('other_incomes')
      .select('amount, category_id, status, income_categories(name)')
      .eq('school_id', schoolId)
      .eq('status', 'approved');
    
    if (startDate) {
      query = query.gte('income_date', startDate);
    }
    if (endDate) {
      query = query.lte('income_date', endDate);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const total = (data || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    const byCategoryMap = new Map<number, { categoryId: number; categoryName: string; total: number }>();
    const byStatusMap = new Map<string, number>();
    
    (data || []).forEach(item => {
      const amount = parseFloat(item.amount || 0);
      const categoryId = item.category_id;
      const categoryName = (item.income_categories as any)?.name || 'Unknown';
      const status = item.status;
      
      if (!byCategoryMap.has(categoryId)) {
        byCategoryMap.set(categoryId, { categoryId, categoryName, total: 0 });
      }
      const categoryEntry = byCategoryMap.get(categoryId)!;
      categoryEntry.total += amount;
      
      if (!byStatusMap.has(status)) {
        byStatusMap.set(status, 0);
      }
      byStatusMap.set(status, byStatusMap.get(status)! + amount);
    });
    
    return {
      total,
      byCategory: Array.from(byCategoryMap.values()),
      byStatus: Array.from(byStatusMap.entries()).map(([status, total]) => ({ status, total })),
    };
  },
};
