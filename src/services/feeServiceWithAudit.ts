import { supabase } from '../supabaseClient';
import { feeAuditService } from './feeAuditService';
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
  await supabase.rpc('set_audit_user_id', { user_id: userId });
};

export const feeServiceWithAudit = {
  // Fee Heads with Audit Logging
  async createFeeHead(schoolId: number, feeHead: Omit<FeeHead, 'id'>, userId?: number): Promise<FeeHead> {
    if (userId) await setAuditUser(userId);
    
    const { data, error } = await supabase
      .from('fee_heads')
      .insert({
        school_id: schoolId,
        name: feeHead.name,
        description: feeHead.description,
        is_recurring: feeHead.isRecurring,
        default_amount: feeHead.defaultAmount,
        frequency: feeHead.frequency,
        auto_generate: feeHead.autoGenerate
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Log the creation
    await feeAuditService.logFeeHeadChange(
      schoolId,
      'create',
      data.id,
      undefined,
      data,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      name: data.name,
      description: data.description,
      isRecurring: data.is_recurring,
      defaultAmount: data.default_amount,
      frequency: data.frequency,
      autoGenerate: data.auto_generate,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateFeeHead(schoolId: number, feeHeadId: number, updates: Partial<FeeHead>, userId?: number): Promise<FeeHead> {
    if (userId) await setAuditUser(userId);
    
    // Get old values for audit
    const { data: oldData, error: fetchError } = await supabase
      .from('fee_heads')
      .select('*')
      .eq('id', feeHeadId)
      .eq('school_id', schoolId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data, error } = await supabase
      .from('fee_heads')
      .update({
        name: updates.name,
        description: updates.description,
        is_recurring: updates.isRecurring,
        default_amount: updates.defaultAmount,
        frequency: updates.frequency,
        auto_generate: updates.autoGenerate
      })
      .eq('id', feeHeadId)
      .eq('school_id', schoolId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Log the update
    await feeAuditService.logFeeHeadChange(
      schoolId,
      'update',
      feeHeadId,
      oldData,
      data,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      name: data.name,
      description: data.description,
      isRecurring: data.is_recurring,
      defaultAmount: data.default_amount,
      frequency: data.frequency,
      autoGenerate: data.auto_generate,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteFeeHead(schoolId: number, feeHeadId: number, userId?: number): Promise<void> {
    if (userId) await setAuditUser(userId);
    
    // Get old values for audit
    const { data: oldData, error: fetchError } = await supabase
      .from('fee_heads')
      .select('*')
      .eq('id', feeHeadId)
      .eq('school_id', schoolId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { error } = await supabase
      .from('fee_heads')
      .delete()
      .eq('id', feeHeadId)
      .eq('school_id', schoolId);
    
    if (error) throw error;
    
    // Log the deletion
    await feeAuditService.logFeeHeadChange(
      schoolId,
      'delete',
      feeHeadId,
      oldData,
      undefined,
      userId
    );
  },

  // Fee Payments with Audit Logging
  async createFeePayment(schoolId: number, payment: Omit<FeePayment, 'id'>, userId?: number): Promise<FeePayment> {
    if (userId) await setAuditUser(userId);
    
    const { data, error } = await supabase
      .from('fee_payments')
      .insert({
        school_id: schoolId,
        invoice_id: payment.invoiceId,
        payment_date: payment.paymentDate,
        amount: payment.amount,
        payment_mode: payment.paymentMode,
        reference_no: payment.referenceNo,
        received_by: payment.receivedBy,
        remarks: payment.remarks
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Log the creation
    await feeAuditService.logFeePaymentChange(
      schoolId,
      'create',
      data.id,
      undefined,
      data,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      invoiceId: data.invoice_id,
      paymentDate: data.payment_date,
      amount: data.amount,
      paymentMode: data.payment_mode,
      referenceNo: data.reference_no,
      receivedBy: data.received_by,
      remarks: data.remarks,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateFeePayment(schoolId: number, paymentId: number, updates: Partial<FeePayment>, userId?: number): Promise<FeePayment> {
    if (userId) await setAuditUser(userId);
    
    // Get old values for audit
    const { data: oldData, error: fetchError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('school_id', schoolId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data, error } = await supabase
      .from('fee_payments')
      .update({
        payment_date: updates.paymentDate,
        amount: updates.amount,
        payment_mode: updates.paymentMode,
        reference_no: updates.referenceNo,
        received_by: updates.receivedBy,
        remarks: updates.remarks
      })
      .eq('id', paymentId)
      .eq('school_id', schoolId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Log the update
    await feeAuditService.logFeePaymentChange(
      schoolId,
      'update',
      paymentId,
      oldData,
      data,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      invoiceId: data.invoice_id,
      paymentDate: data.payment_date,
      amount: data.amount,
      paymentMode: data.payment_mode,
      referenceNo: data.reference_no,
      receivedBy: data.received_by,
      remarks: data.remarks,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteFeePayment(schoolId: number, paymentId: number, userId?: number): Promise<void> {
    if (userId) await setAuditUser(userId);
    
    // Get old values for audit
    const { data: oldData, error: fetchError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('school_id', schoolId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { error } = await supabase
      .from('fee_payments')
      .delete()
      .eq('id', paymentId)
      .eq('school_id', schoolId);
    
    if (error) throw error;
    
    // Log the deletion
    await feeAuditService.logFeePaymentChange(
      schoolId,
      'delete',
      paymentId,
      oldData,
      undefined,
      userId
    );
  },

  // Fee Invoices with Audit Logging
  async createFeeInvoice(schoolId: number, invoice: Omit<FeeInvoice, 'id'>, userId?: number): Promise<FeeInvoice> {
    if (userId) await setAuditUser(userId);
    
    const { data, error } = await supabase
      .from('fee_invoices')
      .insert({
        school_id: schoolId,
        student_id: invoice.studentId,
        session_id: invoice.sessionId,
        invoice_date: invoice.invoiceDate,
        due_date: invoice.dueDate,
        month: invoice.month,
        year: invoice.year,
        total_amount: invoice.totalAmount,
        status: invoice.status,
        remarks: invoice.remarks
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Log the creation
    await feeAuditService.logFeeInvoiceChange(
      schoolId,
      'create',
      data.id,
      undefined,
      data,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      studentId: data.student_id,
      sessionId: data.session_id,
      invoiceDate: data.invoice_date,
      dueDate: data.due_date,
      month: data.month,
      year: data.year,
      totalAmount: data.total_amount,
      status: data.status,
      remarks: data.remarks,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateFeeInvoice(schoolId: number, invoiceId: number, updates: Partial<FeeInvoice>, userId?: number): Promise<FeeInvoice> {
    if (userId) await setAuditUser(userId);
    
    // Get old values for audit
    const { data: oldData, error: fetchError } = await supabase
      .from('fee_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('school_id', schoolId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data, error } = await supabase
      .from('fee_invoices')
      .update({
        invoice_date: updates.invoiceDate,
        due_date: updates.dueDate,
        month: updates.month,
        year: updates.year,
        total_amount: updates.totalAmount,
        status: updates.status,
        remarks: updates.remarks
      })
      .eq('id', invoiceId)
      .eq('school_id', schoolId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Log the update
    await feeAuditService.logFeeInvoiceChange(
      schoolId,
      'update',
      invoiceId,
      oldData,
      data,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      studentId: data.student_id,
      sessionId: data.session_id,
      invoiceDate: data.invoice_date,
      dueDate: data.due_date,
      month: data.month,
      year: data.year,
      totalAmount: data.total_amount,
      status: data.status,
      remarks: data.remarks,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Get audit logs for a specific entity
  async getAuditLogs(schoolId: number, entity?: string, entityId?: number): Promise<FeeAuditLog[]> {
    return await feeAuditService.getAuditLogs(schoolId, { entity, entityId, limit: 100 });
  },

  // Get audit logs for a specific entity
  async getAuditLogsByEntity(schoolId: number, entity: string, entityId: number): Promise<FeeAuditLog[]> {     
    return await feeAuditService.getAuditLogs(schoolId, { entity, entityId });
  }
};
