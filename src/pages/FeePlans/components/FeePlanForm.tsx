import React from 'react';
import styled from 'styled-components';
import { FeePlanFormData } from '../types';

const FormContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const Input = styled.input`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
`;

const Select = styled.select`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
  cursor: pointer;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
`;

const TextArea = styled.textarea`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
`;

interface FeePlanFormProps {
  formData: FeePlanFormData;
  onChange: (data: Partial<FeePlanFormData>) => void;
}

export const FeePlanForm: React.FC<FeePlanFormProps> = ({ formData, onChange }) => {
  return (
    <FormContainer>
      <FormGrid>
        <FormGroup>
          <Label>W.e.f (With effect from)</Label>
          <Input
            type="date"
            value={formData.effectiveFrom}
            onChange={(e) => onChange({ effectiveFrom: e.target.value })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Notes</Label>
          <Input
            type="text"
            value={formData.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value || undefined })}
            placeholder="Enter any additional notes..."
          />
        </FormGroup>
      </FormGrid>
    </FormContainer>
  );
};

