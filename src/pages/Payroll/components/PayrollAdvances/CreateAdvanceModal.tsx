import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollAdvance, CreatePayrollAdvanceInput } from '../../../../types/payroll';
import { supabase } from '../../../../supabaseClient';
import {
  Box,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ModalOverlay = styled.div<{ open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: ${props => props.open ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1300;
  padding: 16px;
  
  @media (max-width: 768px) {
    padding: 8px;
    align-items: flex-end;
  }
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  
  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 95vh;
    border-radius: 12px 12px 0 0;
    margin: 0;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    padding: 8px 12px;
  }
`;

const ModalTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 0.9375rem;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  @media (max-width: 768px) {
    padding: 12px;
    gap: 10px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    gap: 6px;
    flex-direction: column-reverse;
    
    & > button {
      width: 100%;
    }
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

interface CreateAdvanceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAdvance?: PayrollAdvance | null;
}

const CreateAdvanceModal: React.FC<CreateAdvanceModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingAdvance,
}) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    staffId: 0,
    advanceDate: new Date().toISOString().split('T')[0],
    amount: 0,
    repaymentAmountPerMonth: 0,
    reason: '',
  });

  useEffect(() => {
    if (open && user?.school_id) {
      loadStaff();
      if (editingAdvance) {
        setFormData({
          staffId: editingAdvance.staffId,
          advanceDate: editingAdvance.advanceDate,
          amount: editingAdvance.amount,
          repaymentAmountPerMonth: editingAdvance.repaymentAmountPerMonth,
          reason: editingAdvance.reason || '',
        });
      } else {
        resetForm();
      }
    }
  }, [open, editingAdvance, user?.school_id]);

  const loadStaff = async () => {
    if (!user?.school_id) return;
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('school_id', user.school_id)
        .order('name');
      
      if (error) throw error;
      setStaffList(data || []);
    } catch (error: any) {
      console.error('Error loading staff:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      staffId: 0,
      advanceDate: new Date().toISOString().split('T')[0],
      amount: 0,
      repaymentAmountPerMonth: 0,
      reason: '',
    });
  };

  const handleSave = async () => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    if (!formData.staffId) {
      showToast('Please select an employee', 'error');
      return;
    }

    if (formData.amount <= 0) {
      showToast('Advance amount must be greater than 0', 'error');
      return;
    }

    if (formData.repaymentAmountPerMonth <= 0) {
      showToast('Repayment amount per month must be greater than 0', 'error');
      return;
    }

    // Check if the staff has a payroll with payments for the month of the advance date
    const advanceDate = new Date(formData.advanceDate);
    const advanceMonth = advanceDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    const advanceYear = advanceDate.getFullYear();

    try {
      const hasPayrollWithPayments = await payrollService.hasPayrollWithPaymentsForMonth(
        user.school_id,
        formData.staffId,
        advanceMonth,
        advanceYear
      );

      if (hasPayrollWithPayments) {
        const monthName = advanceDate.toLocaleString('default', { month: 'long' });
        showToast(
          `Cannot create advance. A payroll with payments already exists for ${monthName} ${advanceYear}`,
          'error'
        );
        return;
      }
    } catch (error: any) {
      console.error('Error checking payroll payments:', error);
      showToast('Failed to validate advance. Please try again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const advanceInput: CreatePayrollAdvanceInput = {
        staffId: formData.staffId,
        advanceDate: formData.advanceDate,
        amount: formData.amount,
        repaymentAmountPerMonth: formData.repaymentAmountPerMonth,
        reason: formData.reason || undefined,
      };

      await payrollService.createAdvance(user.school_id, advanceInput, user.id);
      showToast(editingAdvance ? 'Advance updated successfully' : 'Advance created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving advance:', error);
      showToast(error.message || 'Failed to save advance', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay open={open} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{editingAdvance ? 'Edit Advance' : 'Create Advance'}</ModalTitle>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </ModalHeader>

        <ModalBody>
          <FormGroup>
            <Label>Employee *</Label>
            <FormControl fullWidth size="small">
              <Select
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: Number(e.target.value) })}
                displayEmpty
              >
                <MenuItem value={0} disabled>Select Employee</MenuItem>
                {staffList.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormGroup>

          <FormGroup>
            <Label>Advance Date *</Label>
            <TextField
              type="date"
              size="small"
              value={formData.advanceDate}
              onChange={(e) => setFormData({ ...formData, advanceDate: e.target.value })}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </FormGroup>

          <FormGroup>
            <Label>Advance Amount *</Label>
            <TextField
              type="number"
              size="small"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              variant="outlined"
              inputProps={{ min: 0, step: 0.01 }}
            />
          </FormGroup>

          <FormGroup>
            <Label>Repayment Amount Per Month *</Label>
            <TextField
              type="number"
              size="small"
              value={formData.repaymentAmountPerMonth}
              onChange={(e) => setFormData({ ...formData, repaymentAmountPerMonth: parseFloat(e.target.value) || 0 })}
              fullWidth
              variant="outlined"
              inputProps={{ min: 0, step: 0.01 }}
            />
          </FormGroup>

          <FormGroup>
            <Label>Reason</Label>
            <TextField
              size="small"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              multiline
              rows={2}
              fullWidth
              variant="outlined"
            />
          </FormGroup>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} variant="outlined" size="small" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            size="small"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Saving...' : editingAdvance ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateAdvanceModal;

