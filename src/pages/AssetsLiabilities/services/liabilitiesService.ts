import { supabase } from '../../../supabaseClient';
import {
  LiabilityCategory,
  Liability,
  LiabilityPayment,
  LiabilityAttachment,
  LiabilityFilters,
  LiabilitySummary
} from '../../../types/liability';

export const liabilitiesService = {
  // Liability Categories
  async getLiabilityCategories(schoolId: number, includeInactive: boolean = false): Promise<LiabilityCategory[]> {
    let query = supabase
      .from('liability_categories')
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
      color: item.color || '#ef4444',
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async createLiabilityCategory(category: Omit<LiabilityCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<LiabilityCategory> {
    const { schoolId, name, description, color, isActive } = category;
    const { data, error } = await supabase
      .from('liability_categories')
      .insert({
        school_id: schoolId,
        name,
        description,
        color: color || '#ef4444',
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

  async updateLiabilityCategory(
    id: number,
    schoolId: number,
    updates: Partial<Pick<LiabilityCategory, 'name' | 'description' | 'color' | 'isActive'>>
  ): Promise<void> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    updateData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('liability_categories')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  async deleteLiabilityCategory(id: number, schoolId: number): Promise<void> {
    // Check if category is used by any liabilities
    const { data: liabilities, error: checkError } = await supabase
      .from('liabilities')
      .select('id')
      .eq('category_id', id)
      .eq('school_id', schoolId)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (liabilities && liabilities.length > 0) {
      throw new Error('Cannot delete category that has associated liabilities. Please deactivate it instead.');
    }
    
    const { error } = await supabase
      .from('liability_categories')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Liabilities
  async getLiabilities(schoolId: number, filters: LiabilityFilters = {}): Promise<Liability[]> {
    // Helper function to handle Supabase's 1000 row limit by automatically paginating
    const fetchAllRows = async <T,>(
      queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
    ): Promise<T[]> => {
      const allResults: T[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      let consecutiveEmptyPages = 0;
      const maxEmptyPages = 2; // Safety check to prevent infinite loops

      while (hasMore && consecutiveEmptyPages < maxEmptyPages) {
        const { data, error } = await queryFn(from, from + pageSize - 1);
        if (error) {
          console.error('Error in fetchAllRows:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allResults.push(...data);
          from += pageSize;
          // Continue if we got a full page (might be more data)
          hasMore = data.length === pageSize;
          consecutiveEmptyPages = 0; // Reset counter on successful fetch
        } else {
          // No data returned - check if we should continue
          if (allResults.length > 0 || from === 0) {
            hasMore = false;
          } else {
            consecutiveEmptyPages++;
          }
        }
      }

      return allResults;
    };

    // Fetch all liabilities with pagination
    const data = await fetchAllRows(async (from, to) => {
      let query = supabase
        .from('liabilities')
        .select(`
          *,
          liability_categories (
            id,
            name,
            description,
            color,
            is_active
          )
        `)
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('start_date', filters.endDate);
      }
      
      if (filters.hasInterest !== undefined) {
        if (filters.hasInterest) {
          query = query.not('interest_rate', 'is', null);
        } else {
          query = query.is('interest_rate', null);
        }
      }
      
      return await query.range(from, to);
    });
    
    let liabilities = data.map(item => ({
      id: item.id,
      schoolId: item.school_id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description,
      principalAmount: parseFloat(item.principal_amount),
      currentBalance: parseFloat(item.current_balance),
      interestRate: item.interest_rate ? parseFloat(item.interest_rate) : null,
      startDate: item.start_date,
      dueDate: item.due_date || undefined,
      paymentFrequency: item.payment_frequency || 'monthly',
      paymentAmount: item.payment_amount ? parseFloat(item.payment_amount) : undefined,
      lenderName: item.lender_name || undefined,
      accountNumber: item.account_number || undefined,
      referenceNumber: item.reference_number || undefined,
      status: item.status,
      paidOffDate: item.paid_off_date || undefined,
      notes: item.notes || undefined,
      createdBy: item.created_by || undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      category: item.liability_categories ? {
        id: item.liability_categories.id,
        schoolId: item.liability_categories.school_id,
        name: item.liability_categories.name,
        description: item.liability_categories.description,
        color: item.liability_categories.color,
        isActive: item.liability_categories.is_active,
      } : undefined,
    }));
    
    // Apply search filter if provided
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      liabilities = liabilities.filter(liability =>
        liability.name.toLowerCase().includes(searchLower) ||
        liability.description?.toLowerCase().includes(searchLower) ||
        liability.lenderName?.toLowerCase().includes(searchLower) ||
        liability.accountNumber?.toLowerCase().includes(searchLower) ||
        liability.referenceNumber?.toLowerCase().includes(searchLower)
      );
    }
    
    return liabilities;
  },

  async getLiability(id: number, schoolId: number): Promise<Liability | null> {
    const { data, error } = await supabase
      .from('liabilities')
      .select(`
        *,
        liability_categories (
          id,
          name,
          description,
          color,
          is_active
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
      name: data.name,
      description: data.description,
      principalAmount: parseFloat(data.principal_amount),
      currentBalance: parseFloat(data.current_balance),
      interestRate: data.interest_rate ? parseFloat(data.interest_rate) : null,
      startDate: data.start_date,
      dueDate: data.due_date || undefined,
      paymentFrequency: data.payment_frequency || 'monthly',
      paymentAmount: data.payment_amount ? parseFloat(data.payment_amount) : undefined,
      lenderName: data.lender_name || undefined,
      accountNumber: data.account_number || undefined,
      referenceNumber: data.reference_number || undefined,
      status: data.status,
      paidOffDate: data.paid_off_date || undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.liability_categories ? {
        id: data.liability_categories.id,
        schoolId: data.liability_categories.school_id,
        name: data.liability_categories.name,
        description: data.liability_categories.description,
        color: data.liability_categories.color,
        isActive: data.liability_categories.is_active,
      } : undefined,
    };
  },

  async createLiability(liability: Omit<Liability, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'createdByUser'>): Promise<Liability> {
    const {
      schoolId,
      categoryId,
      name,
      description,
      principalAmount,
      currentBalance,
      interestRate,
      startDate,
      dueDate,
      paymentFrequency,
      paymentAmount,
      lenderName,
      accountNumber,
      referenceNumber,
      status,
      notes,
      createdBy,
    } = liability;
    
    const { data, error } = await supabase
      .from('liabilities')
      .insert({
        school_id: schoolId,
        category_id: categoryId,
        name,
        description,
        principal_amount: principalAmount,
        current_balance: currentBalance || principalAmount,
        interest_rate: interestRate || null, // NULL by default if not provided
        start_date: startDate,
        due_date: dueDate || null,
        payment_frequency: paymentFrequency || 'monthly',
        payment_amount: paymentAmount || null,
        lender_name: lenderName || null,
        account_number: accountNumber || null,
        reference_number: referenceNumber || null,
        status: status || 'active',
        notes: notes || null,
        created_by: createdBy || null,
      })
      .select(`
        *,
        liability_categories (
          id,
          name,
          description,
          color,
          is_active
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      name: data.name,
      description: data.description,
      principalAmount: parseFloat(data.principal_amount),
      currentBalance: parseFloat(data.current_balance),
      interestRate: data.interest_rate ? parseFloat(data.interest_rate) : null,
      startDate: data.start_date,
      dueDate: data.due_date || undefined,
      paymentFrequency: data.payment_frequency || 'monthly',
      paymentAmount: data.payment_amount ? parseFloat(data.payment_amount) : undefined,
      lenderName: data.lender_name || undefined,
      accountNumber: data.account_number || undefined,
      referenceNumber: data.reference_number || undefined,
      status: data.status,
      paidOffDate: data.paid_off_date || undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.liability_categories ? {
        id: data.liability_categories.id,
        schoolId: data.liability_categories.school_id,
        name: data.liability_categories.name,
        description: data.liability_categories.description,
        color: data.liability_categories.color,
        isActive: data.liability_categories.is_active,
      } : undefined,
    };
  },

  async updateLiability(
    id: number,
    schoolId: number,
    updates: Partial<Omit<Liability, 'id' | 'schoolId' | 'createdAt' | 'updatedAt' | 'category' | 'createdByUser'>>
  ): Promise<Liability> {
    const updateData: any = {};
    
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.principalAmount !== undefined) updateData.principal_amount = updates.principalAmount;
    if (updates.currentBalance !== undefined) updateData.current_balance = updates.currentBalance;
    if (updates.interestRate !== undefined) updateData.interest_rate = updates.interestRate || null; // NULL if explicitly set to null/undefined
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
    if (updates.paymentFrequency !== undefined) updateData.payment_frequency = updates.paymentFrequency;
    if (updates.paymentAmount !== undefined) updateData.payment_amount = updates.paymentAmount || null;
    if (updates.lenderName !== undefined) updateData.lender_name = updates.lenderName || null;
    if (updates.accountNumber !== undefined) updateData.account_number = updates.accountNumber || null;
    if (updates.referenceNumber !== undefined) updateData.reference_number = updates.referenceNumber || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.paidOffDate !== undefined) updateData.paid_off_date = updates.paidOffDate || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('liabilities')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select(`
        *,
        liability_categories (
          id,
          name,
          description,
          color,
          is_active
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      name: data.name,
      description: data.description,
      principalAmount: parseFloat(data.principal_amount),
      currentBalance: parseFloat(data.current_balance),
      interestRate: data.interest_rate ? parseFloat(data.interest_rate) : null,
      startDate: data.start_date,
      dueDate: data.due_date || undefined,
      paymentFrequency: data.payment_frequency || 'monthly',
      paymentAmount: data.payment_amount ? parseFloat(data.payment_amount) : undefined,
      lenderName: data.lender_name || undefined,
      accountNumber: data.account_number || undefined,
      referenceNumber: data.reference_number || undefined,
      status: data.status,
      paidOffDate: data.paid_off_date || undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.liability_categories ? {
        id: data.liability_categories.id,
        schoolId: data.liability_categories.school_id,
        name: data.liability_categories.name,
        description: data.liability_categories.description,
        color: data.liability_categories.color,
        isActive: data.liability_categories.is_active,
      } : undefined,
    };
  },

  async deleteLiability(id: number, schoolId: number): Promise<void> {
    // Delete payments first
    await supabase
      .from('liability_payments')
      .delete()
      .eq('liability_id', id)
      .eq('school_id', schoolId);
    
    // Delete attachments
    await supabase
      .from('liability_attachments')
      .delete()
      .eq('liability_id', id)
      .eq('school_id', schoolId);
    
    // Delete liability
    const { error } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Liability Payments
  async getLiabilityPayments(liabilityId: number, schoolId: number): Promise<LiabilityPayment[]> {
    const { data, error } = await supabase
      .from('liability_payments')
      .select(`
        *,
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
      .eq('liability_id', liabilityId)
      .eq('school_id', schoolId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      liabilityId: item.liability_id,
      paymentDate: item.payment_date,
      paymentAmount: parseFloat(item.payment_amount),
      principalPaid: parseFloat(item.principal_paid),
      interestPaid: item.interest_paid ? parseFloat(item.interest_paid) : null,
      paymentMethod: item.payment_method,
      accountId: item.account_id || undefined,
      referenceNumber: item.reference_number || undefined,
      notes: item.notes || undefined,
      createdBy: item.created_by || undefined,
      createdAt: item.created_at,
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
  },

  async createLiabilityPayment(
    payment: Omit<LiabilityPayment, 'id' | 'createdAt' | 'liability' | 'account' | 'createdByUser'>,
    liability: Liability
  ): Promise<LiabilityPayment> {
    const { schoolId, liabilityId, paymentDate, paymentAmount, principalPaid, interestPaid, paymentMethod, accountId, referenceNumber, notes, createdBy, chequeNumber, transactionId } = payment as any;
    
    // If liability has no interest rate, ensure interest_paid is NULL and all payment goes to principal
    const finalInterestPaid = liability.interestRate ? (interestPaid || null) : null;
    const finalPrincipalPaid = liability.interestRate ? principalPaid : paymentAmount;
    
    const { data, error } = await supabase
      .from('liability_payments')
      .insert({
        school_id: schoolId,
        liability_id: liabilityId,
        payment_date: paymentDate,
        payment_amount: paymentAmount,
        principal_paid: finalPrincipalPaid,
        interest_paid: finalInterestPaid,
        payment_method: paymentMethod,
        account_id: accountId || null,
        cheque_number: chequeNumber || null,
        transaction_id: transactionId || null,
        reference_number: referenceNumber || null,
        notes: notes || null,
        created_by: createdBy || null,
      })
      .select(`
        *,
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
    
    // Update liability's current balance
    const newBalance = Math.max(0, liability.currentBalance - finalPrincipalPaid);
    const newStatus = newBalance <= 0 ? 'paid_off' : liability.status;
    const paidOffDate = newBalance <= 0 ? paymentDate : null;
    
    await supabase
      .from('liabilities')
      .update({
        current_balance: newBalance,
        status: newStatus,
        paid_off_date: paidOffDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', liabilityId)
      .eq('school_id', schoolId);
    
    return {
      id: data.id,
      schoolId: data.school_id,
      liabilityId: data.liability_id,
      paymentDate: data.payment_date,
      paymentAmount: parseFloat(data.payment_amount),
      principalPaid: parseFloat(data.principal_paid),
      interestPaid: data.interest_paid ? parseFloat(data.interest_paid) : null,
      paymentMethod: data.payment_method,
      accountId: data.account_id || undefined,
      referenceNumber: data.reference_number || undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
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

  async deleteLiabilityPayment(id: number, schoolId: number, liabilityId: number): Promise<void> {
    // Get payment details before deleting
    const { data: payment, error: paymentError } = await supabase
      .from('liability_payments')
      .select('principal_paid')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();
    
    if (paymentError) throw paymentError;
    
    // Delete payment
    const { error } = await supabase
      .from('liability_payments')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
    
    // Recalculate liability balance
    const payments = await this.getLiabilityPayments(liabilityId, schoolId);
    const totalPaid = payments.reduce((sum, p) => sum + p.principalPaid, 0);
    const liability = await this.getLiability(liabilityId, schoolId);
    
    if (liability) {
      const newBalance = liability.principalAmount - totalPaid;
      const newStatus = newBalance <= 0 ? 'paid_off' : (newBalance >= liability.principalAmount ? 'active' : liability.status);
      
      await supabase
        .from('liabilities')
        .update({
          current_balance: Math.max(0, newBalance),
          status: newStatus,
          paid_off_date: newBalance <= 0 ? null : liability.paidOffDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', liabilityId)
        .eq('school_id', schoolId);
    }
  },

  // Liability Attachments
  async getLiabilityAttachments(liabilityId: number, schoolId: number): Promise<LiabilityAttachment[]> {
    const { data, error } = await supabase
      .from('liability_attachments')
      .select('*')
      .eq('liability_id', liabilityId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      liabilityId: item.liability_id,
      fileName: item.file_name,
      fileUrl: item.file_url,
      fileType: item.file_type,
      fileSize: item.file_size,
      uploadedBy: item.uploaded_by,
      createdAt: item.created_at,
    }));
  },

  async createLiabilityAttachment(attachment: Omit<LiabilityAttachment, 'id' | 'createdAt'>): Promise<LiabilityAttachment> {
    const { schoolId, liabilityId, fileName, fileUrl, fileType, fileSize, uploadedBy } = attachment;
    
    const { data, error } = await supabase
      .from('liability_attachments')
      .insert({
        school_id: schoolId,
        liability_id: liabilityId,
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
      liabilityId: data.liability_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileType: data.file_type,
      fileSize: data.file_size,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
    };
  },

  async deleteLiabilityAttachment(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('liability_attachments')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Liability Summary/Analytics
  async getLiabilitySummary(schoolId: number, filters: LiabilityFilters = {}): Promise<LiabilitySummary> {
    const liabilities = await this.getLiabilities(schoolId, filters);
    
    const totalLiabilities = liabilities.length;
    const totalPrincipal = liabilities.reduce((sum, liability) => sum + liability.principalAmount, 0);
    const totalCurrentBalance = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
    
    // Get all payments to calculate total interest paid
    let totalInterestPaid = 0;
    for (const liability of liabilities) {
      const payments = await this.getLiabilityPayments(liability.id, schoolId);
      totalInterestPaid += payments.reduce((sum, p) => sum + (p.interestPaid || 0), 0);
    }
    
    // By category
    const categoryMap = new Map<number, { name: string; count: number; totalPrincipal: number; totalCurrentBalance: number; color: string }>();
    liabilities.forEach(liability => {
      const catId = liability.categoryId;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          name: liability.category?.name || 'Unknown',
          count: 0,
          totalPrincipal: 0,
          totalCurrentBalance: 0,
          color: liability.category?.color || '#ef4444',
        });
      }
      const cat = categoryMap.get(catId)!;
      cat.count += 1;
      cat.totalPrincipal += liability.principalAmount;
      cat.totalCurrentBalance += liability.currentBalance;
    });
    
    // By status
    const statusMap = new Map<string, { count: number; totalBalance: number }>();
    liabilities.forEach(liability => {
      const status = liability.status;
      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, totalBalance: 0 });
      }
      const stat = statusMap.get(status)!;
      stat.count += 1;
      stat.totalBalance += liability.currentBalance;
    });
    
    // By payment frequency
    const frequencyMap = new Map<string, { count: number; totalBalance: number }>();
    liabilities.forEach(liability => {
      const frequency = liability.paymentFrequency;
      if (!frequencyMap.has(frequency)) {
        frequencyMap.set(frequency, { count: 0, totalBalance: 0 });
      }
      const freq = frequencyMap.get(frequency)!;
      freq.count += 1;
      freq.totalBalance += liability.currentBalance;
    });
    
    return {
      totalLiabilities,
      totalPrincipal,
      totalCurrentBalance,
      totalInterestPaid,
      byCategory: Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        count: data.count,
        totalPrincipal: data.totalPrincipal,
        totalCurrentBalance: data.totalCurrentBalance,
        color: data.color,
      })),
      byStatus: Array.from(statusMap.entries()).map(([status, data]) => ({
        status: status as any,
        count: data.count,
        totalBalance: data.totalBalance,
      })),
      byPaymentFrequency: Array.from(frequencyMap.entries()).map(([frequency, data]) => ({
        frequency: frequency as any,
        count: data.count,
        totalBalance: data.totalBalance,
      })),
    };
  },
};





