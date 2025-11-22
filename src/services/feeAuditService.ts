import { supabase } from '../supabaseClient';
import { FeeAuditLog } from '../types/fee';

export interface AuditLogEntry {
  schoolId: number;
  entity: string;
  entityId: number;
  action: 'create' | 'update' | 'delete';
  oldValues?: any;
  newValues?: any;
  changedBy?: number;
}

export const feeAuditService = {
  /**
   * Create an audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<void> {
    const { error } = await supabase
      .from('fee_audit_logs')
      .insert({
        school_id: entry.schoolId,
        entity: entry.entity,
        entity_id: entry.entityId,
        action: entry.action.toUpperCase(),
        old_values: entry.oldValues,
        new_values: entry.newValues,
        changed_by: entry.changedBy
      });

    if (error) {
      throw error;
    }
  },

  /**
   * Get audit logs with optional filtering
   */
  async getAuditLogs(
    schoolId: number,
    options: {
      entity?: string;
      entityId?: number;
      action?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<FeeAuditLog[]> {
    let query = supabase
      .from('fee_audit_logs')
      .select(`
        *,
        users!changed_by (
          id,
          name,
          email
        )
      `)
      .eq('school_id', schoolId)
      .order('changed_at', { ascending: false });

    if (options.entity) {
      query = query.eq('entity', options.entity);
    }

    if (options.entityId) {
      query = query.eq('entity_id', options.entityId);
    }

    if (options.action) {
      query = query.eq('action', options.action.toUpperCase());
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data.map(log => ({
      id: log.id,
      school_id: log.school_id,
      entity: log.entity,
      entity_id: log.entity_id,
      action: log.action,
      old_values: log.old_values,
      new_values: log.new_values,
      changed_by: log.changed_by,
      changed_at: log.changed_at,
      changedByUser: log.users ? {
        id: log.users.id,
        name: log.users.name,
        email: log.users.email
      } : null
    }));
  },

  /**
   * Get audit logs count for pagination
   */
  async getAuditLogsCount(
    schoolId: number,
    options: {
      entity?: string;
      entityId?: number;
      action?: string;
    } = {}
  ): Promise<number> {
    let query = supabase
      .from('fee_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    if (options.entity) {
      query = query.eq('entity', options.entity);
    }

    if (options.entityId) {
      query = query.eq('entity_id', options.entityId);
    }

    if (options.action) {
      query = query.eq('action', options.action.toUpperCase());
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count || 0;
  },

  /**
   * Log fee head changes
   */
  async logFeeHeadChange(
    schoolId: number,
    action: 'create' | 'update' | 'delete',
    entityId: number,
    oldValues?: any,
    newValues?: any,
    changedBy?: number
  ): Promise<void> {
    await this.createAuditLog({
      schoolId,
      entity: 'fee_heads',
      entityId,
      action,
      oldValues,
      newValues,
      changedBy
    });
  },

  /**
   * Log fee structure changes
   */
  async logFeeStructureChange(
    schoolId: number,
    action: 'create' | 'update' | 'delete',
    entityId: number,
    oldValues?: any,
    newValues?: any,
    changedBy?: number
  ): Promise<void> {
    await this.createAuditLog({
      schoolId,
      entity: 'fee_structures',
      entityId,
      action,
      oldValues,
      newValues,
      changedBy
    });
  },

  /**
   * Log fee invoice changes
   */
  async logFeeInvoiceChange(
    schoolId: number,
    action: 'create' | 'update' | 'delete',
    entityId: number,
    oldValues?: any,
    newValues?: any,
    changedBy?: number
  ): Promise<void> {
    await this.createAuditLog({
      schoolId,
      entity: 'fee_invoices',
      entityId,
      action,
      oldValues,
      newValues,
      changedBy
    });
  },

  /**
   * Log fee payment changes
   */
  async logFeePaymentChange(
    schoolId: number,
    action: 'create' | 'update' | 'delete',
    entityId: number,
    oldValues?: any,
    newValues?: any,
    changedBy?: number
  ): Promise<void> {
    await this.createAuditLog({
      schoolId,
      entity: 'fee_payments',
      entityId,
      action,
      oldValues,
      newValues,
      changedBy
    });
  },

  /**
   * Log student fee plan changes
   */
  async logStudentFeePlanChange(
    schoolId: number,
    action: 'create' | 'update' | 'delete',
    entityId: number,
    oldValues?: any,
    newValues?: any,
    changedBy?: number
  ): Promise<void> {
    await this.createAuditLog({
      schoolId,
      entity: 'student_fee_plans',
      entityId,
      action,
      oldValues,
      newValues,
      changedBy
    });
  },

  /**
   * Log student fee concession changes
   */
  async logStudentFeeConcessionChange(
    schoolId: number,
    action: 'create' | 'update' | 'delete',
    entityId: number,
    oldValues?: any,
    newValues?: any,
    changedBy?: number
  ): Promise<void> {
    await this.createAuditLog({
      schoolId,
      entity: 'student_fee_concessions',
      entityId,
      action,
      oldValues,
      newValues,
      changedBy
    });
  }
};
