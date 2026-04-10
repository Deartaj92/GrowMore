import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ExpandMore, ExpandLess, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { feeService } from '../../../services/feeService';
import { FeePlanWithItems } from '../../../types/fee';
import { FeeHead } from '../../../types/fee';
import { FeePlanItemsTable } from './FeePlanItemsTable';
import { FeePlanForm } from './FeePlanForm';
import { FeePlanFormData, FeePlanItemFormData } from '../types';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { formatAppDate } from '../../../utils/dateUtils';

const PlansListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PlanRow = styled.div<{ $isExpanded: boolean }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  
  ${({ $isExpanded }) => $isExpanded && `
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  `}
`;

const PlanRowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  }
`;

const PlanRowInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const PlanRowTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlanRowSubtitle = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const PlanRowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
    transform: translateY(-1px);
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
    transform: translateY(-1px);
  }
`;

const ExpandedContent = styled.div<{ $isExpanded: boolean }>`
  max-height: ${({ $isExpanded }) => $isExpanded ? '5000px' : '0'};
  opacity: ${({ $isExpanded }) => $isExpanded ? '1' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
  border-top: ${({ theme, $isExpanded }) => $isExpanded 
    ? (theme.BG === '#252525' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)')
    : 'none'};
`;

const ExpandedInner = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  border-radius: 6px;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

interface FeePlansListProps {
  schoolId: number;
  studentId?: number;
  sessionId?: number;
  feeHeads: FeeHead[];
  onEdit?: (plan: FeePlanWithItems) => void;
  onDelete?: (planId: number) => void;
  onRefresh?: () => void;
}

export const FeePlansList: React.FC<FeePlansListProps> = ({
  schoolId,
  studentId,
  sessionId,
  feeHeads,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const toast = useToast();
  const [plans, setPlans] = useState<FeePlanWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  const [editingPlan, setEditingPlan] = useState<FeePlanWithItems | null>(null);
  const [formData, setFormData] = useState<FeePlanFormData | null>(null);
  const [studentsMap, setStudentsMap] = useState<Map<number, { name: string; rollNumber?: string; className?: string; sectionName?: string }>>(new Map());
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading fee plans:', { schoolId, studentId, sessionId });
      const fetchedPlans = await feeService.getAllFeePlans(schoolId, studentId);
      console.log('Fetched fee plans:', fetchedPlans);
      setPlans(fetchedPlans);

      // Fetch student information for all plans
      if (fetchedPlans.length > 0) {
        const uniqueStudentIds = Array.from(new Set(fetchedPlans.map(p => p.studentId)));
        
        // Fetch students with class and section info
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            id,
            name,
            roll_number,
            class_id,
            section_id,
            classes(name),
            sections(name)
          `)
          .eq('school_id', schoolId)
          .in('id', uniqueStudentIds);

        if (!studentsError && studentsData) {
          const newStudentsMap = new Map();
          studentsData.forEach((student: any) => {
            newStudentsMap.set(student.id, {
              name: student.name || 'Unknown',
              rollNumber: student.roll_number || '',
              className: student.classes?.name || '',
              sectionName: student.sections?.name || ''
            });
          });
          setStudentsMap(newStudentsMap);
        }
      }
    } catch (error: any) {
      console.error('Error loading fee plans:', error);
      toast.showToast(error.message || 'Failed to load fee plans', 'error');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, sessionId, toast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const toggleExpand = (planId: number) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
        setEditingPlan(null);
        setFormData(null);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const handleEdit = (plan: FeePlanWithItems) => {
    setEditingPlan(plan);
    setFormData({
      effectiveFrom: plan.effectiveFrom,
      notes: plan.notes,
      items: plan.items.map(item => ({
        feeHeadId: item.feeHeadId,
        actualFee: item.actualFee,
        discountAmount: item.discountAmount,
        discountPercent: item.discountPercent,
        feeAfterDiscount: item.feeAfterDiscount,
        discountType: item.discountType,
        discountReason: item.discountReason
      }))
    });
    if (!expandedPlans.has(plan.id)) {
      toggleExpand(plan.id);
    }
  };

  const handleSave = async () => {
    if (!editingPlan || !formData || saving) return;

    setSaving(true);
    try {
      await feeService.createOrUpdateFeePlan(
        schoolId,
        editingPlan.studentId,
        formData,
        undefined // userId - you may want to pass this
      );
      toast.showToast('Fee plan updated successfully!', 'success');
      setEditingPlan(null);
      setFormData(null);
      await loadPlans();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error saving fee plan:', error);
      toast.showToast(error.message || 'Failed to save fee plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: FeePlanWithItems) => {
    if (!window.confirm('Are you sure you want to delete this fee plan?')) return;

    try {
      await feeService.deleteFeePlan(schoolId, plan.studentId);
      toast.showToast('Fee plan deleted successfully!', 'success');
      await loadPlans();
      onRefresh?.();
      onDelete?.(plan.id);
    } catch (error: any) {
      console.error('Error deleting fee plan:', error);
      toast.showToast(error.message || 'Failed to delete fee plan', 'error');
    }
  };

  const calculateTotals = (items: FeePlanItemFormData[]) => {
    return items.reduce((acc, item) => ({
      actualFee: acc.actualFee + item.actualFee,
      discountAmount: acc.discountAmount + item.discountAmount,
      feeAfterDiscount: acc.feeAfterDiscount + item.feeAfterDiscount
    }), { actualFee: 0, discountAmount: 0, feeAfterDiscount: 0 });
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading fee plans...</div>;
  }

  if (plans.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <p>No fee plans found</p>
      </div>
    );
  }

  return (
    <PlansListContainer>
      {plans.map(plan => {
        const isExpanded = expandedPlans.has(plan.id);
        const isEditing = editingPlan?.id === plan.id;
        const totals = calculateTotals(plan.items.map(item => ({
          feeHeadId: item.feeHeadId,
          actualFee: item.actualFee,
          discountAmount: item.discountAmount,
          discountPercent: item.discountPercent,
          feeAfterDiscount: item.feeAfterDiscount
        })));

        return (
          <PlanRow key={plan.id} $isExpanded={isExpanded}>
            <PlanRowHeader onClick={() => toggleExpand(plan.id)}>
              <PlanRowInfo>
                <PlanRowTitle>
                  {studentsMap.get(plan.studentId)?.name || `Student #${plan.studentId}`}
                  {studentsMap.get(plan.studentId)?.rollNumber && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      opacity: 0.7,
                      marginLeft: '8px'
                    }}>
                      ({studentsMap.get(plan.studentId)?.rollNumber})
                    </span>
                  )}
                </PlanRowTitle>
                <PlanRowSubtitle>
                  {studentsMap.get(plan.studentId)?.className && (
                    <>
                      {studentsMap.get(plan.studentId)?.className}
                      {studentsMap.get(plan.studentId)?.sectionName && ` - ${studentsMap.get(plan.studentId)?.sectionName}`}
                      {' • '}
                    </>
                  )}
                  Effective From: {formatAppDate(plan.effectiveFrom)} •
                  Total: Rs. {totals.feeAfterDiscount.toFixed(2)} • 
                  Items: {plan.items.length}
                </PlanRowSubtitle>
              </PlanRowInfo>
              <PlanRowActions onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <ActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPlan(null);
                      setFormData(null);
                    }}
                    title="Cancel Edit"
                  >
                    <CloseIcon style={{ fontSize: '18px' }} />
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(plan);
                    }}
                    title="Edit"
                  >
                    <EditIcon style={{ fontSize: '18px' }} />
                  </ActionButton>
                )}
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(plan);
                  }}
                  title="Delete"
                >
                  <DeleteIcon style={{ fontSize: '18px' }} />
                </ActionButton>
                <ExpandButton onClick={() => toggleExpand(plan.id)}>
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </ExpandButton>
              </PlanRowActions>
            </PlanRowHeader>
            <ExpandedContent $isExpanded={isExpanded}>
              <ExpandedInner>
                {isEditing && formData ? (
                  <>
                    <FeePlanForm
                      formData={formData}
                      onChange={(updates) => setFormData(prev => prev ? { ...prev, ...updates } : null)}
                    />
                    <FeePlanItemsTable
                      feeHeads={feeHeads}
                      items={formData.items}
                      onChange={(index, updates) => {
                        setFormData(prev => prev ? {
                          ...prev,
                          items: prev.items.map((item, i) => 
                            i === index ? { ...item, ...updates } : item
                          )
                        } : null);
                      }}
                      onRemoveItem={(index) => {
                        if (!formData) return;
                        const itemToRemove = formData.items[index];
                        const feeHead = feeHeads.find(fh => fh.id === itemToRemove.feeHeadId);
                        const confirmMessage = feeHead 
                          ? `Are you sure you want to remove "${feeHead.name}" from this fee plan?`
                          : 'Are you sure you want to remove this fee head from the fee plan?';
                        
                        if (window.confirm(confirmMessage)) {
                          setFormData(prev => prev ? {
                            ...prev,
                            items: prev.items.filter((_, i) => i !== index)
                          } : null);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          if (!saving) {
                            setEditingPlan(null);
                            setFormData(null);
                          }
                        }}
                        disabled={saving}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          background: 'transparent',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          background: saving ? '#9ca3af' : '#6366f1',
                          color: 'white',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          opacity: saving ? 0.7 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {plan.notes && (
                      <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px' }}>
                        <strong>Notes:</strong> {plan.notes}
                      </div>
                    )}
                    <FeePlanItemsTable
                      feeHeads={feeHeads}
                      items={plan.items.map(item => ({
                        feeHeadId: item.feeHeadId,
                        actualFee: item.actualFee,
                        discountAmount: item.discountAmount,
                        discountPercent: item.discountPercent,
                        feeAfterDiscount: item.feeAfterDiscount,
                        discountType: item.discountType,
                        discountReason: item.discountReason
                      }))}
                      onChange={() => {}}
                    />
                  </>
                )}
              </ExpandedInner>
            </ExpandedContent>
          </PlanRow>
        );
      })}
    </PlansListContainer>
  );
};
