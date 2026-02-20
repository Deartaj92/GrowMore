import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { CreatePayrollAdjustmentInput } from '../../../../types/payroll';
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

interface CreateAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAdjustmentModal: React.FC<CreateAdjustmentModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    staffId: 0,
    adjustmentType: 'bonus' as 'bonus' | 'fine' | 'extra_cut' | 'other',
    amount: 0,
    reason: '',
    payrollMonth: new Date().getMonth() + 1,
    payrollYear: new Date().getFullYear(),
  });

  useEffect(() => {
    if (open && user?.school_id) {
      loadStaff();
      resetForm();
    }
  }, [open, user?.school_id]);

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
      adjustmentType: 'bonus',
      amount: 0,
      reason: '',
      payrollMonth: new Date().getMonth() + 1,
      payrollYear: new Date().getFullYear(),
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
      showToast('Amount must be greater than 0', 'error');
      return;
    }

    if (!formData.reason.trim()) {
      showToast('Please provide a reason', 'error');
      return;
    }

    setLoading(true);
    try {
      const adjustmentInput: CreatePayrollAdjustmentInput = {
        staffId: formData.staffId,
        adjustmentType: formData.adjustmentType,
        amount: formData.amount,
        reason: formData.reason,
        payrollMonth: formData.payrollMonth,
        payrollYear: formData.payrollYear,
      };

      await payrollService.createAdjustment(user.school_id, adjustmentInput, user.id);
      showToast('Adjustment created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving adjustment:', error);
      showToast(error.message || 'Failed to save adjustment', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay open={open} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Create Adjustment</ModalTitle>
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
            <Label>Adjustment Type *</Label>
            <FormControl fullWidth size="small">
              <Select
                value={formData.adjustmentType}
                onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value as any })}
              >
                <MenuItem value="bonus">Bonus</MenuItem>
                <MenuItem value="fine">Fine</MenuItem>
                <MenuItem value="extra_cut">Extra Cut</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </FormGroup>

          <Box display="flex" gap={2}>
            <FormGroup style={{ flex: 1 }}>
              <Label>Amount *</Label>
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

            <FormGroup style={{ flex: 1 }}>
              <Label>Month *</Label>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.payrollMonth}
                  onChange={(e) => setFormData({ ...formData, payrollMonth: Number(e.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <MenuItem key={month} value={month}>
                      {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormGroup>

            <FormGroup style={{ flex: 1 }}>
              <Label>Year *</Label>
              <TextField
                type="number"
                size="small"
                value={formData.payrollYear}
                onChange={(e) => setFormData({ ...formData, payrollYear: parseInt(e.target.value) || new Date().getFullYear() })}
                fullWidth
                variant="outlined"
                inputProps={{ min: 2000, max: 2100 }}
              />
            </FormGroup>
          </Box>

          <FormGroup>
            <Label>Reason *</Label>
            <TextField
              size="small"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              placeholder="Enter reason for this adjustment..."
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
            {loading ? 'Creating...' : 'Create Adjustment'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateAdjustmentModal;

