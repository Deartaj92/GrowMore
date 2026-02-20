import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Close as CloseIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { feeService } from '../../../services/feeService';
import { FeeHead, FeeStructure } from '../../../types/fee';
import { FeePlanFormData, FeePlanItemFormData, StudentInfo } from '../types';
import { StudentSelector } from './StudentSelector';
import { FeePlanForm } from './FeePlanForm';
import { FeePlanItemsTable } from './FeePlanItemsTable';
import { supabase } from '../../../supabaseClient';
import Loader from '../../../components/Loader';
import { fetchAllRows } from '../../../utils/paginationHelper';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  width: 100%;
  max-width: 1200px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  min-height: 48px;
`;

const HeaderSearch = styled.div`
  flex: 1;
  min-width: 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ClearStudentButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 4px;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        
        &:hover:not(:disabled) {
          background: ${theme.ACCENT}dd;
          transform: translateY(-1px);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `;
    } else {
      return `
        background: transparent;
        color: ${theme.TEXT_PRIMARY};
        border: 1px solid ${theme.BORDER};
        
        &:hover:not(:disabled) {
          background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `;
    }
  }}
`;

const EmptyFeeStructuresPlaceholder = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 48px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const PlaceholderIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 32px;
  margin-bottom: 8px;
`;

const PlaceholderTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const PlaceholderMessage = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  max-width: 500px;
  line-height: 1.5;
`;

const PlaceholderButton = styled(Button)`
  margin-top: 8px;
`;

interface CreateFeePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: number;
  feeHeads: FeeHead[];
  initialStudent?: StudentInfo | null;
}

export const CreateFeePlanModal: React.FC<CreateFeePlanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  feeHeads,
  initialStudent
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [formData, setFormData] = useState<FeePlanFormData>({
    effectiveFrom: new Date().toISOString().split('T')[0],
    notes: undefined,
    items: []
  });
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [filteredFeeHeads, setFilteredFeeHeads] = useState<FeeHead[]>([]);
  const loadingRef = useRef(false);
  const lastLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setSelectedStudent(null);
      setFormData({
        effectiveFrom: new Date().toISOString().split('T')[0],
        notes: undefined,
        items: []
      });
      setFeeStructures([]);
      setFilteredFeeHeads([]);
      loadingRef.current = false;
      lastLoadedRef.current = null;
    } else if (initialStudent) {
      // Set initial student when modal opens with one
      setSelectedStudent(initialStudent);
    }
  }, [isOpen, initialStudent]);

  useEffect(() => {
    const loadFeeStructures = async () => {
      if (!schoolId || !selectedStudent || loadingRef.current || feeHeads.length === 0) {
        if (!selectedStudent) {
          setFormData({
            effectiveFrom: new Date().toISOString().split('T')[0],
            notes: undefined,
            items: []
          });
          setFeeStructures([]);
          lastLoadedRef.current = null;
        }
        return;
      }

      // Get active session for student_class_history lookup
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();

      if (!activeSession) {
        console.warn('No active session found');
        return;
      }

      // Prevent re-running if the same student combination was already loaded
      const currentLoadKey = `${selectedStudent.id}_${feeHeads.length}`;
      if (lastLoadedRef.current === currentLoadKey) {
        return;
      }

      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      setLoadingPlan(true);

      try {
        // Get student's class first (needed for filtering fee heads)
        let classId = selectedStudent.classId;
        let sectionId = selectedStudent.sectionId;

        // Get student's class from class history if available
        if (activeSession) {
          const { data: historyData } = await supabase
            .from('student_class_history')
            .select('new_class_id, new_section_id')
            .eq('student_id', selectedStudent.id)
            .eq('session_id', activeSession.id)
            .eq('school_id', schoolId)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (historyData) {
            classId = historyData.new_class_id;
            sectionId = historyData.new_section_id;
          }
        }

        if (!classId) {
          toast.showToast('Student class not found for this session', 'error');
          setFormData({
            effectiveFrom: new Date().toISOString().split('T')[0],
            notes: undefined,
            items: []
          });
          setFeeStructures([]);
          setFilteredFeeHeads([]);
          lastLoadedRef.current = currentLoadKey;
          loadingRef.current = false;
          return;
        }

        // Get fee structures for the student's class to filter fee heads
        const structuresData = await fetchAllRows(async (from, to) => {
          let query = supabase
            .from('fee_structures')
            .select('*')
            .eq('school_id', schoolId)
            .eq('class_id', classId);
          return await query.range(from, to);
        });
        
        const structures: FeeStructure[] = structuresData.map((item: any) => ({
          id: item.id,
          schoolId: item.school_id,
          classId: item.class_id,
          sectionId: item.section_id,
          sessionId: item.session_id,
          feeHeadId: item.fee_head_id,
          amount: item.amount,
          months: item.months || [],
          firstTime: item.first_time || false,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        
        // Filter fee heads to only those that have a fee structure for this class
        const applicableFeeHeadIds = new Set(structures.map(s => s.feeHeadId));
        const filteredFeeHeads = feeHeads.filter(fh => applicableFeeHeadIds.has(fh.id));
        setFilteredFeeHeads(filteredFeeHeads);
        setFeeStructures(structures);

        // Check if there's an existing fee plan
        const existingPlan = await feeService.getFeePlan(
          schoolId,
          selectedStudent.id
        );

        if (existingPlan) {
          // Filter existing plan items to only include those with applicable fee heads
          const filteredItems = existingPlan.items
            .filter(item => applicableFeeHeadIds.has(item.feeHeadId))
            .map(item => ({
              feeHeadId: item.feeHeadId,
              actualFee: item.actualFee || 0,
              discountAmount: item.discountAmount || 0,
              discountPercent: item.discountPercent || 0,
              feeAfterDiscount: item.feeAfterDiscount || 0,
              discountType: item.discountType,
              discountReason: item.discountReason
            }));

          setFormData({
            effectiveFrom: existingPlan.effectiveFrom || new Date().toISOString().split('T')[0],
            notes: existingPlan.notes,
            items: filteredItems
          });
          toast.showToast('Loaded existing fee plan', 'success');
          lastLoadedRef.current = currentLoadKey;
          loadingRef.current = false;
          return;
        }

        // No existing plan - continue with creating new plan items
        // (classId and structures are already loaded above)
        
        // Check if fee heads exist (not fee structures)
        // If no fee heads exist at all, show placeholder
        if (feeHeads.length === 0) {
          setFormData(prev => ({
            ...prev,
            items: []
          }));
          lastLoadedRef.current = currentLoadKey;
          return;
        }

        // Create fee plan items only for fee heads that are applicable to this class
        const items: FeePlanItemFormData[] = filteredFeeHeads.map(fh => {
          const structure = structures.find(s => s.feeHeadId === fh.id);
          const amount = structure?.amount || fh.defaultAmount || 0;
          return {
            feeHeadId: fh.id,
            actualFee: amount,
            discountAmount: 0,
            discountPercent: 0,
            feeAfterDiscount: amount,
            discountType: undefined,
            discountReason: undefined
          };
        });

        setFormData(prev => ({
          ...prev,
          items
        }));

        toast.showToast(`Loaded ${items.length} fee head(s)`, 'success');
        lastLoadedRef.current = currentLoadKey;
      } catch (error: any) {
        console.error('Error loading fee plan:', error);
        toast.showToast(error.message || 'Failed to load fee plan', 'error');
      } finally {
        setLoadingPlan(false);
        loadingRef.current = false;
      }
    };

    loadFeeStructures();
  }, [selectedStudent?.id, selectedStudent?.classId, selectedStudent?.sectionId, schoolId, feeHeads.length]);

  const handleSave = async () => {
    if (!selectedStudent) {
      toast.showToast('Please select a student first', 'error');
      return;
    }

    setSaving(true);
    try {
      await feeService.createOrUpdateFeePlan(
        schoolId,
        selectedStudent.id,
        formData,
        user?.id
      );
      toast.showToast('Fee plan created successfully!', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving fee plan:', error);
      toast.showToast(error.message || 'Failed to save fee plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderSearch>
            <StudentSelector
              schoolId={schoolId}
              sessionId={null}
              onSelect={setSelectedStudent}
              selectedStudent={selectedStudent}
            />
          </HeaderSearch>
          <CloseButton onClick={onClose} title="Close">
            <CloseIcon style={{ fontSize: '18px' }} />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          {selectedStudent && (
            <>
              {loadingPlan ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <Loader />
                </div>
              ) : (
                <>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px', 
                    background: 'rgba(99, 102, 241, 0.08)', 
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    <span>
                      <strong>{selectedStudent.name}</strong>
                      {selectedStudent.rollNumber && ` • ${selectedStudent.rollNumber}`}
                      {selectedStudent.className && ` • ${selectedStudent.className}`}
                      {selectedStudent.sectionName && ` / ${selectedStudent.sectionName}`}
                    </span>
                    <ClearStudentButton
                      onClick={() => setSelectedStudent(null)}
                      title="Clear selection"
                    >
                      <ClearIcon style={{ fontSize: '16px' }} />
                    </ClearStudentButton>
                  </div>
                  
                  <FeePlanForm
                    formData={formData}
                    onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
                  />
                  
                  {feeStructures.length === 0 && formData.items.length === 0 ? (
                    <EmptyFeeStructuresPlaceholder>
                      <PlaceholderIcon>📋</PlaceholderIcon>
                      <PlaceholderTitle>No Fee Heads Found</PlaceholderTitle>
                      <PlaceholderMessage>
                        Fee heads have not been added for {selectedStudent.className} yet.
                        Please add fee heads for this class in the Fee Structures page first.
                      </PlaceholderMessage>
                      <PlaceholderButton
                        variant="primary"
                        onClick={() => {
                          onClose();
                          navigate('/fee-structure-management');
                        }}
                      >
                        Go to Fee Structures
                      </PlaceholderButton>
                    </EmptyFeeStructuresPlaceholder>
                  ) : (
                    <FeePlanItemsTable
                      feeHeads={filteredFeeHeads.length > 0 ? filteredFeeHeads : feeHeads}
                      items={formData.items}
                      onChange={(index, updates) => {
                        setFormData(prev => ({
                          ...prev,
                          items: prev.items.map((item, i) => 
                            i === index ? { ...item, ...updates } : item
                          )
                        }));
                      }}
                      onRemoveItem={(index) => {
                        if (!formData) return;
                        const itemToRemove = formData.items[index];
                        const feeHead = feeHeads.find(fh => fh.id === itemToRemove.feeHeadId);
                        const confirmMessage = feeHead 
                          ? `Are you sure you want to remove "${feeHead.name}" from this fee plan?`
                          : 'Are you sure you want to remove this fee head from the fee plan?';
                        
                        if (window.confirm(confirmMessage)) {
                          setFormData(prev => ({
                            ...prev,
                            items: prev.items.filter((_, i) => i !== index)
                          }));
                        }
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}
          
          {!selectedStudent && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px', 
              color: '#666',
              fontSize: '0.9rem'
            }}>
              Search and select a student in the header to create a fee plan
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedStudent || saving || loadingPlan}
          >
            {saving ? 'Saving...' : 'Save Fee Plan'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

