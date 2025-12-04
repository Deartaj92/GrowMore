import React from 'react';
import styled from 'styled-components';
import {
  Close as CloseIcon,
  Undo as UndoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { IncrementHistory } from '../types';

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
  max-width: 500px;
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
`;

const WarningBox = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.ERROR + '20'};
  border: 1px solid ${({ theme }) => theme.ERROR + '40'};
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const WarningText = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  line-height: 1.6;
  
  strong {
    color: ${({ theme }) => theme.ERROR};
  }
`;

const DetailsBox = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 20px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const DetailValue = styled.span`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
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
        background: ${theme.ERROR};
        color: white;
        
        &:hover {
          background: ${theme.ERROR}dd;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px ${theme.ERROR}40;
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

interface ReverseIncrementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  historyItem: IncrementHistory;
}

export const ReverseIncrementModal: React.FC<ReverseIncrementModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  historyItem,
}) => {
  const formatIncrementValue = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `₹${value.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <UndoIcon />
            Reverse Increment
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <CloseIcon />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <WarningBox>
            <WarningIcon style={{ color: 'inherit', fontSize: '1.5rem', flexShrink: 0, marginTop: '2px' }} />
            <WarningText>
              <strong>Warning:</strong> This action will reverse the increment and restore all affected 
              fee plans and/or fee structures to their original values before the increment was applied. 
              This action cannot be undone.
            </WarningText>
          </WarningBox>

          <DetailsBox>
            <DetailRow>
              <DetailLabel>Increment Type:</DetailLabel>
              <DetailValue>
                {historyItem.incrementType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Increment Value:</DetailLabel>
              <DetailValue>
                {formatIncrementValue(historyItem.incrementType, historyItem.incrementValue)}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Target:</DetailLabel>
              <DetailValue>
                {historyItem.targetType === 'fee_plans' ? 'Fee Plans' : 
                 historyItem.targetType === 'fee_structures' ? 'Fee Structures' : 'Both'}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Items Updated:</DetailLabel>
              <DetailValue>{historyItem.itemsUpdated}</DetailValue>
            </DetailRow>
            {historyItem.affectedStudents !== undefined && (
              <DetailRow>
                <DetailLabel>Affected Students:</DetailLabel>
                <DetailValue>{historyItem.affectedStudents}</DetailValue>
              </DetailRow>
            )}
          </DetailsBox>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            <UndoIcon style={{ fontSize: '1rem' }} />
            Reverse Increment
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

