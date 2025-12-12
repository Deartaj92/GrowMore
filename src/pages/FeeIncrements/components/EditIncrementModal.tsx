import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Percent as PercentIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { feeService } from '../../../services/feeService';
import { IncrementHistory } from '../types';
import { FeeHead } from '../../../types/fee';
import { CircularProgress } from '@mui/material';

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
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const FormSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TypeSelector = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const TypeOption = styled.button<{ selected: boolean }>`
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid ${({ theme, selected }) => 
    selected ? theme.ACCENT : theme.BORDER};
  background: ${({ theme, selected }) => 
    selected ? theme.ACCENT + '20' : theme.FIELD_BG};
  color: ${({ theme, selected }) => 
    selected ? theme.ACCENT : theme.TEXT_PRIMARY};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const InfoBox = styled.div`
  padding: 12px;
  background: ${({ theme }) => theme.WARNING + '20'};
  border: 1px solid ${({ theme }) => theme.WARNING + '40'};
  border-radius: 8px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  margin-bottom: 16px;
`;

const ModalFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        
        &:hover {
          background: ${theme.ACCENT}dd;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px ${theme.ACCENT}40;
        }
        
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `;
    } else {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        color: ${theme.TEXT_PRIMARY};
        border: 1px solid ${theme.BORDER};
        
        &:hover {
          background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
        }
      `;
    }
  }}
`;

interface EditIncrementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  historyItem: IncrementHistory;
  schoolId: number;
  feeHeads: FeeHead[];
}

export const EditIncrementModal: React.FC<EditIncrementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  historyItem,
  schoolId,
  feeHeads,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [incrementType, setIncrementType] = useState<'percentage' | 'fixed'>(historyItem.incrementType);
  const [incrementValue, setIncrementValue] = useState<number>(historyItem.incrementValue);

  useEffect(() => {
    if (isOpen) {
      setIncrementType(historyItem.incrementType);
      setIncrementValue(historyItem.incrementValue);
    }
  }, [isOpen, historyItem]);

  const handleSave = async () => {
    if (!incrementValue || incrementValue <= 0) {
      showToast('Please enter a valid increment value', 'error');
      return;
    }

    setLoading(true);
    try {
      await feeService.editIncrement(
        historyItem.id,
        schoolId,
        historyItem.sessionId,
        incrementType,
        incrementValue,
        {
          studentIds: historyItem.filterOptions.studentIds,
          classIds: historyItem.filterOptions.classIds,
          feeHeadIds: historyItem.filterOptions.feeHeadIds,
          preserveDiscountAmount: historyItem.filterOptions.preserveDiscountAmount,
        },
        user?.id
      );

      showToast('Increment edited successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to edit increment', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <EditIcon />
            Edit Increment
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <CloseIcon />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <InfoBox>
            <strong>Note:</strong> Editing this increment will first reverse the original increment, 
            then apply the new increment values. This ensures data integrity.
          </InfoBox>

          <FormSection>
            <SectionTitle>
              <TrendingUpIcon />
              Increment Type
            </SectionTitle>
            <TypeSelector>
              <TypeOption
                selected={incrementType === 'percentage'}
                onClick={() => setIncrementType('percentage')}
              >
                <PercentIcon />
                Percentage
              </TypeOption>
              <TypeOption
                selected={incrementType === 'fixed'}
                onClick={() => setIncrementType('fixed')}
              >
                <AttachMoneyIcon />
                Fixed Amount
              </TypeOption>
            </TypeSelector>
          </FormSection>

          <FormSection>
            <SectionTitle>Increment Value</SectionTitle>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={incrementValue}
              onChange={(e) => setIncrementValue(Number(e.target.value))}
              placeholder={incrementType === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 500 for Rs. 500'}
            />
          </FormSection>

          <FormSection>
            <SectionTitle>Current Settings</SectionTitle>
            <div style={{ 
              padding: '12px', 
              background: 'rgba(0, 0, 0, 0.02)', 
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: 'inherit'
            }}>
              <div><strong>Target:</strong> {historyItem.targetType === 'fee_plans' ? 'Fee Plans' : historyItem.targetType === 'fee_structures' ? 'Fee Structures' : 'Both'}</div>
              <div style={{ marginTop: '8px' }}>
                <strong>Filters:</strong> {historyItem.filterOptions.studentIds?.length ? `${historyItem.filterOptions.studentIds.length} student(s)` : ''}
                {historyItem.filterOptions.classIds?.length ? `${historyItem.filterOptions.classIds.length} class(es)` : ''}
                {historyItem.filterOptions.feeHeadIds?.length ? `${historyItem.filterOptions.feeHeadIds.length} fee head(s)` : ''}
                {!historyItem.filterOptions.studentIds?.length && !historyItem.filterOptions.classIds?.length && !historyItem.filterOptions.feeHeadIds?.length && 'All items'}
              </div>
            </div>
          </FormSection>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <CircularProgress size={16} style={{ color: 'white' }} />
                Saving...
              </>
            ) : (
              <>
                <EditIcon style={{ fontSize: '1rem' }} />
                Save Changes
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

