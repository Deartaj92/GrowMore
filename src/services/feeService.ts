import { supabase } from '../supabaseClient';
import {
  FeeHead,
  FeeStructure,
  StudentFeePlan,
  FeeInvoice,
  FeeInvoiceItem,
  FeePayment,
  FeeAuditLog,
  StudentFeeConcession
} from '../types/fee';

// Helper function to set current user for audit logging
const setAuditUser = async (userId: number) => {
  // Set a unique session identifier for this browser session
  const sessionId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set the session name first
  await supabase.rpc('set_config', { 
    setting_name: 'application_name', 
    new_value: sessionId, 
    is_local: false 
  });
  
  // Then set the user context
  const { error } = await supabase.rpc('set_audit_user_id', { user_id: userId });
  if (error) {
    // Error setting audit user context
  }
};

export const feeService = {
  // Fee Heads
  async getFeeHeads(schoolId: number): Promise<FeeHead[]> {
    const { data, error } = await supabase
      .from('fee_heads')
      .select('*')
      .eq('school_id', schoolId);
    if (error) throw error;
    
    // Convert snake_case to camelCase
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      name: item.name,
      description: item.description,
      isRecurring: item.is_recurring,
      defaultAmount: item.default_amount,
      frequency: item.frequency || 'monthly',
      autoGenerate: item.auto_generate || false,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  // Fee Structures
  async getFeeStructures(schoolId: number, filters: Partial<{ classId: number; sectionId: number; sessionId: number }> = {}): Promise<FeeStructure[]> {
    let query = supabase
      .from('fee_structures')
      .select('*')
      .eq('school_id', schoolId);
    if (filters.classId) query = query.eq('class_id', filters.classId);
    if (filters.sectionId) query = query.eq('section_id', filters.sectionId);
    if (filters.sessionId) query = query.eq('session_id', filters.sessionId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Student Fee Plans
  async getStudentFeePlans(schoolId: number, studentId: number, sessionId?: number): Promise<StudentFeePlan[]> {
    let query = supabase
      .from('student_fee_plans')
      .select('*')
      .eq('school_id', schoolId)
      .eq('student_id', studentId);
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Fee Invoices
  async getFeeInvoices(schoolId: number, filters: Partial<{ studentId: number; sessionId: number; status: string }> = {}): Promise<FeeInvoice[]> {
    let query = supabase
      .from('fee_invoices')
      .select('*')
      .eq('school_id', schoolId);
    if (filters.studentId) query = query.eq('student_id', filters.studentId);
    if (filters.sessionId) query = query.eq('session_id', filters.sessionId);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert snake_case to camelCase
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      studentId: item.student_id,
      sessionId: item.session_id,
      invoiceDate: item.invoice_date,
      dueDate: item.due_date,
      month: item.month,
      year: item.year,
      totalAmount: item.total_amount,
      status: item.status,
      remarks: item.remarks,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  // Fee Invoice Items
  async getFeeInvoiceItems(schoolId: number, invoiceId: number): Promise<FeeInvoiceItem[]> {
    const { data, error } = await supabase
      .from('fee_invoice_items')
      .select('*')
      .eq('school_id', schoolId)
      .eq('invoice_id', invoiceId);
    if (error) throw error;
    
    // Convert snake_case to camelCase
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      invoiceId: item.invoice_id,
      feeHeadId: item.fee_head_id,
      amount: item.amount,
      discount: item.discount,
      fine: item.fine,
      remarks: item.remarks,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  // Fee Payments
  async getFeePayments(schoolId: number, invoiceId?: number): Promise<FeePayment[]> {
    let query = supabase
      .from('fee_payments')
      .select('*')
      .eq('school_id', schoolId);
    if (invoiceId) query = query.eq('invoice_id', invoiceId);
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert snake_case to camelCase
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      invoiceId: item.invoice_id,
      paymentDate: item.payment_date,
      amount: item.amount,
      paymentMode: item.payment_mode,
      referenceNo: item.reference_no,
      receivedBy: item.received_by,
      remarks: item.remarks,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  // Create Fee Payment
  async createFeePayment(payment: Omit<FeePayment, 'id'>): Promise<FeePayment> {
    const { schoolId, invoiceId, paymentDate, amount, paymentMode, referenceNo, receivedBy, remarks, ...rest } = payment;
    const { data, error } = await supabase
      .from('fee_payments')
      .insert({
        ...rest,
        school_id: schoolId,
        invoice_id: invoiceId,
        payment_date: paymentDate,
        amount,
        payment_mode: paymentMode,
        reference_no: referenceNo,
        received_by: receivedBy,
        remarks
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Create Fee Invoice
  async createFeeInvoice(invoice: Omit<FeeInvoice, 'id'>): Promise<FeeInvoice> {
    const { schoolId, studentId, sessionId, invoiceDate, dueDate, month, year, totalAmount, status, remarks, ...rest } = invoice;
    const { data, error } = await supabase
      .from('fee_invoices')
      .insert({
        ...rest,
        school_id: schoolId,
        student_id: studentId,
        session_id: sessionId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        month,
        year,
        total_amount: totalAmount,
        status,
        remarks
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Get Student Ledger (all invoices and payments for a student)
  async getStudentLedger(schoolId: number, studentId: number) {
    const [invoices, payments] = await Promise.all([
      this.getFeeInvoices(schoolId, { studentId }),
      this.getFeePayments(schoolId)
    ]);
    return { invoices, payments: payments.filter(p => invoices.some(inv => inv.id === p.invoiceId)) };
  },

  // Create Fee Structure
  async createFeeStructure(structure: Omit<FeeStructure, 'id'>, userId?: number): Promise<FeeStructure> {
    // Set user context for audit logging
    if (userId) await setAuditUser(userId);
    
    const { classId, sectionId, sessionId, feeHeadId, schoolId, ...rest } = structure;
    const { data, error } = await supabase
      .from('fee_structures')
      .insert({
        ...rest,
        school_id: schoolId,
        class_id: classId,
        section_id: sectionId,
        session_id: sessionId,
        fee_head_id: feeHeadId,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Update Fee Structure
  async updateFeeStructure(id: number, schoolId: number, updates: Partial<FeeStructure>, userId?: number): Promise<FeeStructure> {
    // Set user context for audit logging
    if (userId) await setAuditUser(userId);
    
    const { classId, sectionId, sessionId, feeHeadId, ...rest } = updates;
    const { data, error } = await supabase
      .from('fee_structures')
      .update({
        ...rest,
        ...(schoolId !== undefined ? { school_id: schoolId } : {}),
        ...(classId !== undefined ? { class_id: classId } : {}),
        ...(sectionId !== undefined ? { section_id: sectionId } : {}),
        ...(sessionId !== undefined ? { session_id: sessionId } : {}),
        ...(feeHeadId !== undefined ? { fee_head_id: feeHeadId } : {}),
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Delete Fee Structure
  async deleteFeeStructure(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('fee_structures')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw error;
  },

  // Create Fee Head
  async createFeeHead({ schoolId, name, description, defaultAmount, frequency, autoGenerate }: { schoolId: number; name: string; description?: string | null; defaultAmount?: number; frequency?: string; autoGenerate?: boolean }, userId?: number): Promise<FeeHead> {
    // Set user context for audit logging
    if (userId) await setAuditUser(userId);
    
    const { data, error } = await supabase
      .from('fee_heads')
      .insert({ 
        school_id: schoolId, 
        name, 
        description, 
        default_amount: defaultAmount || 0,
        frequency: frequency || 'monthly',
        auto_generate: autoGenerate || false
      })
      .select('*')
      .single();
    if (error) throw error;
    
    // Convert snake_case to camelCase
    return {
      id: data.id,
      schoolId: data.school_id,
      name: data.name,
      description: data.description,
      isRecurring: data.is_recurring,
      defaultAmount: data.default_amount,
      frequency: data.frequency || 'monthly',
      autoGenerate: data.auto_generate || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Bulk upsert fee structures
  async bulkUpsertFeeStructures(schoolId: number, sessionId: number, items: { classId: number; feeHeadId: number; amount: number }[], userId?: number): Promise<void> {
    if (!items.length) return;
    
    // Set user context for audit logging
    if (userId) await setAuditUser(userId);
    const upsertPayload = items.map(item => ({
      school_id: schoolId,
      session_id: sessionId,
      class_id: item.classId,
      section_id: null,
      fee_head_id: item.feeHeadId,
      amount: item.amount,
    }));
    const { error } = await supabase
      .from('fee_structures')
      .upsert(upsertPayload, { onConflict: 'class_id,section_id,session_id,fee_head_id,school_id' });
    if (error) throw error;
  },

  // Add deleteFeeHead
  async deleteFeeHead(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('fee_heads')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw error;
  },

  // Update Fee Head
  async updateFeeHead(id: number, schoolId: number, updates: { name: string; description?: string | null; defaultAmount?: number; frequency?: string; autoGenerate?: boolean }): Promise<void> {
    const { data, error } = await supabase
      .from('fee_heads')
      .update({ 
        name: updates.name, 
        description: updates.description,
        default_amount: updates.defaultAmount !== undefined ? updates.defaultAmount : undefined,
        frequency: updates.frequency !== undefined ? updates.frequency : undefined,
        auto_generate: updates.autoGenerate !== undefined ? updates.autoGenerate : undefined
      })
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw error;
  },

  // Update Fee Invoice
  async updateFeeInvoice(
    invoiceId: number,
    schoolId: number,
    feeData: { [feeHeadId: number]: number }
  ): Promise<FeeInvoice> {
    // 1. Calculate new total amount
    const totalAmount = Object.values(feeData).reduce((sum, amount) => sum + amount, 0);

    // 2. Update the main invoice record
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('fee_invoices')
      .update({ total_amount: totalAmount, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 3. Delete old invoice items to replace them
    const { error: deleteError } = await supabase
      .from('fee_invoice_items')
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('school_id', schoolId);
    
    if (deleteError) {
      throw deleteError;
    }

    // 4. Create new invoice items from the updated feeData
    for (const [feeHeadId, amount] of Object.entries(feeData)) {
      if (amount > 0) {
        await this.createFeeInvoiceItem({
          schoolId,
          invoiceId: invoiceId,
          feeHeadId: parseInt(feeHeadId),
          amount,
          discount: 0,
          fine: 0
        });
      }
    }

    return updatedInvoice;
  },

  // Bulk Generate or Update Fee Invoices (Optimized with batch operations)
  async upsertFeeInvoicesBulk(
    schoolId: number,
    students: any[],
    sessionId: number,
    month: string,
    year: number,
    feeData: { [studentId: number]: { [feeHeadId: number]: number } },
    onProgress?: (progress: number, status: string) => void
  ): Promise<{ createdCount: number, updatedCount: number }> {
    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) {
      return { createdCount: 0, updatedCount: 0 };
    }

    onProgress?.(10, 'Checking existing invoices...');

    // 1. Fetch existing invoices for the given period
    const { data: existingInvoices, error: fetchError } = await supabase
      .from('fee_invoices')
      .select('id, student_id')
      .in('student_id', studentIds)
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .eq('month', month)
      .eq('year', year);

    if (fetchError) {
      throw fetchError;
    }

    const existingInvoicesMap = new Map(existingInvoices.map(inv => [inv.student_id, inv.id]));
    let createdCount = 0;
    let updatedCount = 0;

    // Prepare batch data
    const newInvoices: any[] = [];
    const invoiceItems: any[] = [];
    const updateOperations: { invoiceId: number; feeData: { [feeHeadId: number]: number } }[] = [];

    onProgress?.(20, 'Preparing invoice data...');

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentFeeData = feeData[student.id];
      if (!studentFeeData || Object.keys(studentFeeData).length === 0) {
        continue;
      }

      const existingInvoiceId = existingInvoicesMap.get(student.id);

      if (existingInvoiceId) {
        // Prepare for batch update
        updateOperations.push({ invoiceId: existingInvoiceId, feeData: studentFeeData });
      } else {
        // Prepare for batch insert
        const totalAmount = Object.values(studentFeeData).reduce((sum, amount) => sum + amount, 0);
        const dueDate = new Date(year, this.getMonthNumber(month) + 1, 0);
        
        newInvoices.push({
          school_id: schoolId,
          student_id: student.id,
          session_id: sessionId,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          month,
          year,
          total_amount: totalAmount,
          status: 'unpaid'
        });
      }

      onProgress?.(20 + (i / students.length) * 30, `Processing student ${i + 1}/${students.length}...`);
    }

    onProgress?.(50, 'Creating new invoices...');

    // Batch create new invoices
    if (newInvoices.length > 0) {
      const { data: createdInvoices, error: invoiceError } = await supabase
        .from('fee_invoices')
        .insert(newInvoices)
        .select('*');

      if (invoiceError) throw invoiceError;

      // Prepare invoice items for batch insert
      for (let i = 0; i < createdInvoices.length; i++) {
        const invoice = createdInvoices[i];
        const student = students.find(s => s.id === invoice.student_id);
        if (!student) continue;

        const studentFeeData = feeData[student.id];
        for (const [feeHeadId, amount] of Object.entries(studentFeeData)) {
          if (amount > 0) {
            invoiceItems.push({
              school_id: schoolId,
              invoice_id: invoice.id,
              fee_head_id: parseInt(feeHeadId),
              amount,
              discount: 0,
              fine: 0
            });
          }
        }
        createdCount++;
      }
    }

    onProgress?.(70, 'Creating invoice items...');

    // Batch create invoice items
    if (invoiceItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('fee_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;
    }

    onProgress?.(80, 'Updating existing invoices...');

    // Batch update existing invoices
    if (updateOperations.length > 0) {
      // Delete existing items for all invoices to be updated
      const invoiceIdsToUpdate = updateOperations.map(op => op.invoiceId);
      const { error: deleteError } = await supabase
        .from('fee_invoice_items')
        .delete()
        .in('invoice_id', invoiceIdsToUpdate);

      if (deleteError) throw deleteError;

      // Prepare all new items for batch insert
      const updateItems: any[] = [];
      for (const { invoiceId, feeData } of updateOperations) {
        for (const [feeHeadId, amount] of Object.entries(feeData)) {
          if (amount > 0) {
            updateItems.push({
              school_id: schoolId,
              invoice_id: invoiceId,
              fee_head_id: parseInt(feeHeadId),
              amount,
              discount: 0,
              fine: 0
            });
          }
        }
      }

      // Batch insert all updated items
      if (updateItems.length > 0) {
        const { error: updateItemsError } = await supabase
          .from('fee_invoice_items')
          .insert(updateItems);

        if (updateItemsError) throw updateItemsError;
      }

      // Update invoice totals in parallel
      const invoiceUpdates = updateOperations.map(({ invoiceId, feeData }) => {
        const totalAmount = Object.values(feeData).reduce((sum, amount) => sum + amount, 0);
        return {
          id: invoiceId,
          total_amount: totalAmount
        };
      });

      // Batch update invoice totals in parallel
      const updatePromises = invoiceUpdates.map(update => 
        supabase
          .from('fee_invoices')
          .update({ total_amount: update.total_amount })
          .eq('id', update.id)
      );

      const updateResults = await Promise.all(updatePromises);
      const updateErrors = updateResults.filter(result => result.error);
      if (updateErrors.length > 0) {
        throw updateErrors[0].error;
      }

      updatedCount = updateOperations.length;
    }

    onProgress?.(100, 'Bulk fee generation completed!');

    return { createdCount, updatedCount };
  },

  // Generate Fee Invoice for Single Student
  async generateFeeInvoiceSingle(
    schoolId: number,
    student: any,
    sessionId: number,
    month: string,
    year: number,
    feeData: { [feeHeadId: number]: number }
  ): Promise<FeeInvoice> {
    const totalAmount = Object.values(feeData).reduce((sum, amount) => sum + amount, 0);
    const dueDate = new Date(year, this.getMonthNumber(month) + 1, 0);

    const invoice = await this.createFeeInvoice({
      schoolId,
      studentId: student.id,
      sessionId,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      month,
      year,
      totalAmount,
      status: 'unpaid'
    });

    for (const [feeHeadId, amount] of Object.entries(feeData)) {
      if (amount > 0) {
        await this.createFeeInvoiceItem({
          schoolId,
          invoiceId: invoice.id,
          feeHeadId: parseInt(feeHeadId),
          amount,
          discount: 0,
          fine: 0
        });
      }
    }

    return invoice;
  },

  // Generate Fee Invoices for Family (Optimized with batch operations)
  async generateFeeInvoicesForFamily(
    schoolId: number,
    studentsToProcess: { student: any; feeData: { [feeHeadId: number]: string } }[],
    sessionId: number,
    month: string,
    year: number,
    onProgress?: (progress: number, status: string) => void
  ): Promise<FeeInvoice[]> {
    const invoices: FeeInvoice[] = [];
    const studentIds = studentsToProcess.map(s => s.student.id);
    const totalStudents = studentsToProcess.length;

    onProgress?.(10, 'Checking existing invoices...');

    // Check for existing invoices for all students in one go
    const existingInvoices = await this.checkExistingInvoices(schoolId, studentIds, sessionId, month, year);
    const existingInvoicesMap = new Map(existingInvoices.map(inv => [inv.studentId, inv.invoiceId]));

    // Prepare batch data for new invoices and items
    const newInvoices: any[] = [];
    const invoiceItems: any[] = [];
    const updateOperations: { invoiceId: number; feeData: { [feeHeadId: number]: number } }[] = [];

    onProgress?.(20, 'Preparing invoice data...');

    for (let i = 0; i < studentsToProcess.length; i++) {
      const { student, feeData } = studentsToProcess[i];
      
      // Convert feeData amounts from string to number
      const numericFeeData: { [feeHeadId: number]: number } = {};
      for (const key in feeData) {
        numericFeeData[key] = parseFloat(feeData[key] || '0');
      }

      const totalAmount = Object.values(numericFeeData).reduce((sum, amount) => sum + amount, 0);

      if (totalAmount <= 0) {
        continue; // Skip students with no fee amount
      }

      const existingInvoiceId = existingInvoicesMap.get(student.id);

      if (existingInvoiceId) {
        // Prepare for batch update
        updateOperations.push({ invoiceId: existingInvoiceId, feeData: numericFeeData });
      } else {
        // Prepare for batch insert
        const dueDate = new Date(year, this.getMonthNumber(month) + 1, 0);
        
        newInvoices.push({
          school_id: schoolId,
          student_id: student.id,
          session_id: sessionId,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          month,
          year,
          total_amount: totalAmount,
          status: 'unpaid'
        });
      }

      onProgress?.(20 + (i / totalStudents) * 30, `Processing student ${i + 1}/${totalStudents}...`);
    }

    onProgress?.(50, 'Creating new invoices...');

    // Batch create new invoices
    if (newInvoices.length > 0) {
      const { data: createdInvoices, error: invoiceError } = await supabase
        .from('fee_invoices')
        .insert(newInvoices)
        .select('*');

      if (invoiceError) throw invoiceError;

      // Prepare invoice items for batch insert
      for (let i = 0; i < createdInvoices.length; i++) {
        const invoice = createdInvoices[i];
        const student = studentsToProcess.find(s => s.student.id === invoice.student_id);
        if (!student) continue;

        const numericFeeData: { [feeHeadId: number]: number } = {};
        for (const key in student.feeData) {
          numericFeeData[key] = parseFloat(student.feeData[key] || '0');
        }

        for (const [feeHeadId, amount] of Object.entries(numericFeeData)) {
          if (amount > 0) {
            invoiceItems.push({
              school_id: schoolId,
              invoice_id: invoice.id,
              fee_head_id: parseInt(feeHeadId),
              amount,
              discount: 0,
              fine: 0
            });
          }
        }
        invoices.push(invoice);
      }
    }

    onProgress?.(70, 'Creating invoice items...');

    // Batch create invoice items
    if (invoiceItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('fee_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;
    }

    onProgress?.(80, 'Updating existing invoices...');

    // Batch update existing invoices
    if (updateOperations.length > 0) {
      // Delete existing items for all invoices to be updated
      const invoiceIdsToUpdate = updateOperations.map(op => op.invoiceId);
      const { error: deleteError } = await supabase
        .from('fee_invoice_items')
        .delete()
        .in('invoice_id', invoiceIdsToUpdate);

      if (deleteError) throw deleteError;

      // Prepare all new items for batch insert
      const updateItems: any[] = [];
      for (const { invoiceId, feeData } of updateOperations) {
        for (const [feeHeadId, amount] of Object.entries(feeData)) {
          if (amount > 0) {
            updateItems.push({
              school_id: schoolId,
              invoice_id: invoiceId,
              fee_head_id: parseInt(feeHeadId),
              amount,
              discount: 0,
              fine: 0
            });
          }
        }
      }

      // Batch insert all updated items
      if (updateItems.length > 0) {
        const { error: updateItemsError } = await supabase
          .from('fee_invoice_items')
          .insert(updateItems);

        if (updateItemsError) throw updateItemsError;
      }

      // Update invoice totals in parallel
      const invoiceUpdates = updateOperations.map(({ invoiceId, feeData }) => {
        const totalAmount = Object.values(feeData).reduce((sum, amount) => sum + amount, 0);
        return { id: invoiceId, total_amount: totalAmount };
      });

      const updatePromises = invoiceUpdates.map(update => 
        supabase
          .from('fee_invoices')
          .update({ total_amount: update.total_amount })
          .eq('id', update.id)
      );

      const updateResults = await Promise.all(updatePromises);
      const updateErrors = updateResults.filter(result => result.error);
      if (updateErrors.length > 0) {
        throw updateErrors[0].error;
      }

      // Fetch all updated invoices in parallel
      const fetchPromises = updateOperations.map(({ invoiceId }) =>
        supabase
          .from('fee_invoices')
          .select('*')
          .eq('id', invoiceId)
          .single()
      );

      const fetchResults = await Promise.all(fetchPromises);
      const fetchErrors = fetchResults.filter(result => result.error);
      if (fetchErrors.length > 0) {
        throw fetchErrors[0].error;
      }

      // Add all updated invoices to the result
      fetchResults.forEach(result => {
        if (result.data) {
          invoices.push(result.data);
        }
      });
    }

    onProgress?.(100, 'Fee generation completed!');
    return invoices;
  },

  // Check for existing invoices (modified to return invoice IDs)
  async checkExistingInvoices(
    schoolId: number,
    studentIds: number[],
    sessionId: number,
    month: string,
    year: number
  ): Promise<{ studentId: number; hasInvoice: boolean, invoiceId: number | null }[]> {
    if (studentIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('fee_invoices')
      .select('student_id, id')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .eq('month', month)
      .eq('year', year)
      .in('student_id', studentIds);

    if (error) {
      throw error;
    }

    const existingInvoicesMap = new Map(data?.map(invoice => [invoice.student_id, invoice.id]) || []);

    return studentIds.map(studentId => ({
      studentId,
      hasInvoice: existingInvoicesMap.has(studentId),
      invoiceId: existingInvoicesMap.get(studentId) || null
    }));
  },

  // Check for existing fee invoice items at fee head level
  async checkExistingFeeInvoiceItems(
    schoolId: number,
    studentIds: number[],
    sessionId: number,
    month: string,
    year: number
  ): Promise<Map<string, number>> {
    if (studentIds.length === 0) return new Map();
    
    // First get the invoice IDs for the given criteria
    const { data: invoices, error: invoiceError } = await supabase
      .from('fee_invoices')
      .select('id, student_id')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .eq('month', month)
      .eq('year', year)
      .in('student_id', studentIds);

    if (invoiceError) {
      throw invoiceError;
    }

    if (!invoices || invoices.length === 0) return new Map();

    const invoiceIds = invoices.map(inv => inv.id);
    const invoiceStudentMap = new Map(invoices.map(inv => [inv.id, inv.student_id]));

    // Then get the fee invoice items for these invoices
    const { data: items, error: itemsError } = await supabase
      .from('fee_invoice_items')
      .select('invoice_id, fee_head_id, amount')
      .eq('school_id', schoolId)
      .in('invoice_id', invoiceIds);

    if (itemsError) {
      throw itemsError;
    }

    // Create a map of "studentId-feeHeadId" -> amount
    const existingItemsMap = new Map<string, number>();
    
    for (const item of items || []) {
      const studentId = invoiceStudentMap.get(item.invoice_id);
      if (studentId) {
        const key = `${studentId}-${item.fee_head_id}`;
        existingItemsMap.set(key, item.amount);
      }
    }

    return existingItemsMap;
  },

  // Create Fee Invoice Item
  async createFeeInvoiceItem(item: Omit<FeeInvoiceItem, 'id'>): Promise<FeeInvoiceItem> {
    const { invoiceId, feeHeadId, schoolId, ...rest } = item;
    const { data, error } = await supabase
      .from('fee_invoice_items')
      .insert({
        ...rest,
        school_id: schoolId,
        invoice_id: invoiceId,
        fee_head_id: feeHeadId,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Helper function to convert month name to number
  getMonthNumber(month: string): number {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  },

  // TODO: Add more advanced logic (auto-increment id, audit logs, etc.)

  // Get student concessions for multiple students
  async getStudentConcessionsForStudents(schoolId: number, studentIds: number[]): Promise<Map<number, StudentFeeConcession[]>> {
    if (studentIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('student_fee_concessions')
        .select('*')
        .eq('school_id', schoolId)
        .in('student_id', studentIds);

    if (error) {
        throw error;
    }

    const concessionsMap = new Map<number, StudentFeeConcession[]>();
    for (const concession of data) {
        const studentConcessions = concessionsMap.get(concession.student_id) || [];
        studentConcessions.push({
            id: concession.id,
            schoolId: concession.school_id,
            studentId: concession.student_id,
            feeHeadId: concession.fee_head_id,
            concessionAmount: concession.concession_amount,
            effectiveFrom: concession.effective_from,
            expires_on: concession.expires_on
        });
        concessionsMap.set(concession.student_id, studentConcessions);
    }
    return concessionsMap;
  },

  // Create new student concessions (always creates new records)
  async upsertStudentConcessions(
    schoolId: number,
    studentId: number,
    concessionData: { feeHeadId: number; concessionAmount: number; expires_on?: string | null }[]
  ): Promise<void> {
    if (concessionData.length === 0) return;

    // Always create new records
    const insertData = concessionData.map(c => ({
      school_id: schoolId,
      student_id: studentId,
      fee_head_id: c.feeHeadId,
      concession_amount: c.concessionAmount,
      expires_on: c.expires_on
    }));

    const { error } = await supabase
      .from('student_fee_concessions')
      .insert(insertData);

    if (error) {
      throw error;
    }
  },

  // Update deleteStudentConcessions to support individual deletions
  async deleteStudentConcessions(schoolId: number, studentId: number, feeHeadIds?: number[]): Promise<void> {
    // Safeguard to ensure we don't accidentally delete all concessions if feeHeadIds is empty or undefined
    if (!feeHeadIds || feeHeadIds.length === 0) {
      return; 
    }

    let query = supabase
      .from('student_fee_concessions')
      .delete()
      .eq('school_id', schoolId)
      .eq('student_id', studentId);
    
    if (feeHeadIds && feeHeadIds.length > 0) {
      query = query.in('fee_head_id', feeHeadIds);
    }
    
    const { error } = await query;
    if (error) throw error;
  },

  // Add method to delete all concessions for a student
  async deleteAllStudentConcessions(schoolId: number, studentId: number): Promise<void> {
    const { error } = await supabase
      .from('student_fee_concessions')
      .delete()
      .eq('school_id', schoolId)
      .eq('student_id', studentId);
    if (error) throw error;
  },

  // Delete Fee Invoice
  async deleteFeeInvoice(invoiceId: number, schoolId: number): Promise<void> {
    // First delete all invoice items
    const { error: itemsError } = await supabase
      .from('fee_invoice_items')
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('school_id', schoolId);
    
    if (itemsError) {
      throw itemsError;
    }

    // Then delete the invoice
    const { error: invoiceError } = await supabase
      .from('fee_invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('school_id', schoolId);
    
    if (invoiceError) {
      throw invoiceError;
    }
  },

  // Delete Fee Invoices for Multiple Students
  async deleteFeeInvoicesForStudents(
    schoolId: number,
    studentIds: number[],
    sessionId: number,
    month: string,
    year: number
  ): Promise<number> {
    if (studentIds.length === 0) return 0;

    // First get the invoice IDs to delete
    const { data: invoices, error: fetchError } = await supabase
      .from('fee_invoices')
      .select('id')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .eq('month', month)
      .eq('year', year)
      .in('student_id', studentIds);

    if (fetchError) {
      throw fetchError;
    }

    if (!invoices || invoices.length === 0) return 0;

    const invoiceIds = invoices.map(inv => inv.id);

    // Delete all invoice items for these invoices
    const { error: itemsError } = await supabase
      .from('fee_invoice_items')
      .delete()
      .in('invoice_id', invoiceIds)
      .eq('school_id', schoolId);
    
    if (itemsError) {
      throw itemsError;
    }

    // Delete the invoices
    const { error: invoiceError } = await supabase
      .from('fee_invoices')
      .delete()
      .in('id', invoiceIds)
      .eq('school_id', schoolId);
    
    if (invoiceError) {
      throw invoiceError;
    }

    return invoiceIds.length;
  },

  // Delete specific fee heads for multiple students (granular delete)
  async deleteFeeHeadsForStudents(
    schoolId: number,
    studentIds: number[],
    feeHeadIds: number[],
    sessionId: number,
    month: string,
    year: number
  ): Promise<number> {
    if (studentIds.length === 0 || feeHeadIds.length === 0) return 0;

    // First get the invoice IDs for the given criteria
    const { data: invoices, error: fetchError } = await supabase
      .from('fee_invoices')
      .select('id, student_id')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .eq('month', month)
      .eq('year', year)
      .in('student_id', studentIds);

    if (fetchError) {
      throw fetchError;
    }

    if (!invoices || invoices.length === 0) return 0;

    const invoiceIds = invoices.map(inv => inv.id);
    const invoiceStudentMap = new Map(invoices.map(inv => [inv.id, inv.student_id]));

    // Delete specific fee invoice items
    const { error: itemsError } = await supabase
      .from('fee_invoice_items')
      .delete()
      .in('invoice_id', invoiceIds)
      .in('fee_head_id', feeHeadIds)
      .eq('school_id', schoolId);
    
    if (itemsError) {
      throw itemsError;
    }

    // Check which invoices now have no items and delete them
    const { data: remainingItems, error: checkError } = await supabase
      .from('fee_invoice_items')
      .select('invoice_id')
      .in('invoice_id', invoiceIds)
      .eq('school_id', schoolId);

    if (checkError) {
      throw checkError;
    }

    // Find invoices with no remaining items
    const invoicesWithItems = new Set(remainingItems?.map(item => item.invoice_id) || []);
    const emptyInvoiceIds = invoiceIds.filter(id => !invoicesWithItems.has(id));

    // Delete empty invoices
    if (emptyInvoiceIds.length > 0) {
      const { error: emptyInvoiceError } = await supabase
        .from('fee_invoices')
        .delete()
        .in('id', emptyInvoiceIds)
        .eq('school_id', schoolId);
      
      if (emptyInvoiceError) {
        throw emptyInvoiceError;
      }
    }

    return feeHeadIds.length * studentIds.length; // Return count of deleted fee head-student combinations
  },

  // Delete specific fee heads for a single student (granular delete)
  async deleteFeeHeadsForSingleStudent(
    schoolId: number,
    studentId: number,
    feeHeadIds: number[],
    sessionId: number,
    month: string,
    year: number
  ): Promise<number> {
    return this.deleteFeeHeadsForStudents(schoolId, [studentId], feeHeadIds, sessionId, month, year);
  },
}; 