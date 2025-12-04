import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ExpandMore, ExpandLess, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { feeService } from '../../../services/feeService';
import { FeePlanWithItems } from '../../../types/fee';
import { FeeHead } from '../../../types/fee';
import { FeePlanItemsTable } from './FeePlanItemsTable';
import { FeePlanForm } from './FeePlanForm';
import { FeePlanFormData, FeePlanItemFormData } from '../types';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
`;

const TableHeaderRow = styled.tr`
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const TableHeader = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $isExpanded?: boolean }>`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  }
  
  ${({ $isExpanded }) => $isExpanded && `
    background: ${({ theme }: any) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  `}
`;

const TableCell = styled.td`
  padding: 12px 16px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
`;

const ExpandCell = styled(TableCell)`
  width: 40px;
  text-align: center;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 4px;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const ExpandedRow = styled.tr`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
`;

const ExpandedCell = styled.td`
  padding: 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ExpandedContent = styled.div`
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

const DiscountBadge = styled.span`
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: #6366f1;
  color: white;
  margin-left: 8px;
`;

interface FeePlansTableProps {
  schoolId: number;
  studentId?: number;
  sessionId?: number;
  feeHeads: FeeHead[];
  onRefresh?: () => void;
}

export const FeePlansTable: React.FC<FeePlansTableProps> = ({
  schoolId,
  studentId,
  sessionId,
  feeHeads,
  onRefresh
}) => {
  const toast = useToast();
  const [plans, setPlans] = useState<FeePlanWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  const [editingPlan, setEditingPlan] = useState<FeePlanWithItems | null>(null);
  const [formData, setFormData] = useState<FeePlanFormData | null>(null);
  const [studentsMap, setStudentsMap] = useState<Map<number, { name: string; rollNumber?: string; className?: string; sectionName?: string }>>(new Map());

  const loadPlans = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const fetchedPlans = await feeService.getAllFeePlans(schoolId, studentId, sessionId);
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
      discountType: plan.discountType,
      discountReason: plan.discountReason,
      notes: plan.notes,
      items: plan.items.map(item => ({
        feeHeadId: item.feeHeadId,
        actualFee: item.actualFee,
        discountAmount: item.discountAmount,
        discountPercent: item.discountPercent,
        feeAfterDiscount: item.feeAfterDiscount
      }))
    });
    if (!expandedPlans.has(plan.id)) {
      toggleExpand(plan.id);
    }
  };

  const handleSave = async () => {
    if (!editingPlan || !formData) return;

    try {
      await feeService.createOrUpdateFeePlan(
        schoolId,
        editingPlan.studentId,
        editingPlan.sessionId,
        formData,
        undefined
      );
      toast.showToast('Fee plan updated successfully!', 'success');
      setEditingPlan(null);
      setFormData(null);
      await loadPlans();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error saving fee plan:', error);
      toast.showToast(error.message || 'Failed to save fee plan', 'error');
    }
  };

  const handleDelete = async (plan: FeePlanWithItems) => {
    if (!window.confirm('Are you sure you want to delete this fee plan?')) return;

    try {
      await feeService.deleteFeePlan(schoolId, plan.studentId, plan.sessionId);
      toast.showToast('Fee plan deleted successfully!', 'success');
      await loadPlans();
      onRefresh?.();
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
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading fee plans...</div>;
  }

  if (plans.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <p>No fee plans found</p>
      </div>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableHeaderRow>
            <TableHeader style={{ width: '40px' }}></TableHeader>
            <TableHeader>Student</TableHeader>
            <TableHeader>Class</TableHeader>
            <TableHeader>Effective From</TableHeader>
            <TableHeader style={{ textAlign: 'right' }}>Total Amount</TableHeader>
            <TableHeader style={{ textAlign: 'center' }}>Items</TableHeader>
            <TableHeader style={{ textAlign: 'center', width: '100px' }}>Actions</TableHeader>
          </TableHeaderRow>
        </TableHead>
        <TableBody>
          {plans.map(plan => {
            const isExpanded = expandedPlans.has(plan.id);
            const isEditing = editingPlan?.id === plan.id;
            const studentInfo = studentsMap.get(plan.studentId);
            const totals = calculateTotals(plan.items.map(item => ({
              feeHeadId: item.feeHeadId,
              actualFee: item.actualFee,
              discountAmount: item.discountAmount,
              discountPercent: item.discountPercent,
              feeAfterDiscount: item.feeAfterDiscount
            })));

            return (
              <React.Fragment key={plan.id}>
                <TableRow $isExpanded={isExpanded} onClick={() => toggleExpand(plan.id)}>
                  <ExpandCell>
                    <ExpandButton onClick={(e) => { e.stopPropagation(); toggleExpand(plan.id); }}>
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </ExpandButton>
                  </ExpandCell>
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {studentInfo?.name || `Student #${plan.studentId}`}
                        {plan.discountType && <DiscountBadge>{plan.discountType}</DiscountBadge>}
                      </div>
                      {studentInfo?.rollNumber && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                          {studentInfo.rollNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {studentInfo?.className || '-'}
                    {studentInfo?.sectionName && ` / ${studentInfo.sectionName}`}
                  </TableCell>
                  <TableCell>{new Date(plan.effectiveFrom).toLocaleDateString()}</TableCell>
                  <TableCell style={{ textAlign: 'right', fontWeight: 600 }}>
                    Rs. {totals.feeAfterDiscount.toFixed(2)}
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>{plan.items.length}</TableCell>
                  <TableCell style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(plan);
                      }}
                      title="Edit"
                    >
                      <EditIcon style={{ fontSize: '18px' }} />
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(plan);
                      }}
                      title="Delete"
                    >
                      <DeleteIcon style={{ fontSize: '18px' }} />
                    </ActionButton>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <ExpandedRow>
                    <ExpandedCell colSpan={7}>
                      <ExpandedContent>
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
                                setFormData(prev => prev ? {
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== index)
                                } : null);
                              }}
                            />
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setEditingPlan(null);
                                  setFormData(null);
                                }}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '8px',
                                  border: '1px solid #ddd',
                                  background: 'transparent',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSave}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#6366f1',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                Save Changes
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <SummaryRow>
                              <SummaryItem>
                                <SummaryLabel>Total Actual Fee</SummaryLabel>
                                <SummaryValue>Rs. {totals.actualFee.toFixed(2)}</SummaryValue>
                              </SummaryItem>
                              <SummaryItem>
                                <SummaryLabel>Total Discount</SummaryLabel>
                                <SummaryValue>Rs. {totals.discountAmount.toFixed(2)}</SummaryValue>
                              </SummaryItem>
                              <SummaryItem>
                                <SummaryLabel>Total After Discount</SummaryLabel>
                                <SummaryValue>Rs. {totals.feeAfterDiscount.toFixed(2)}</SummaryValue>
                              </SummaryItem>
                            </SummaryRow>
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
                                feeAfterDiscount: item.feeAfterDiscount
                              }))}
                              onChange={() => {}}
                              onRemoveItem={() => {}}
                            />
                          </>
                        )}
                      </ExpandedContent>
                    </ExpandedCell>
                  </ExpandedRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

