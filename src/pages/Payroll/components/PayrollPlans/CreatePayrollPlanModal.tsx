import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollPlan, PayrollPlanItem, CreatePayrollPlanInput } from '../../../../types/payroll';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { supabase } from '../../../../supabaseClient';
import PayrollDateField from '../PayrollDateField';
import {
  blockNumberArrowKey,
  blockNumberWheelChange,
  isoToDisplayDate,
  isValidDisplayDate,
  payrollAmountInputSx,
} from '../../utils';

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
  max-width: 850px;
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

const StyledTable = styled(Table)`
  & .MuiTableCell-root {
    padding: 6px 8px;
    font-size: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  }
  
  & .MuiTableCell-head {
    font-weight: 600;
    font-size: 0.6875rem;
    background: ${({ theme }) => theme.BG};
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 8px;
  }
`;

interface CreatePayrollPlanModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPlan?: PayrollPlan | null;
}

const CreatePayrollPlanModal: React.FC<CreatePayrollPlanModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingPlan,
}) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  const [effectiveFromDisplay, setEffectiveFromDisplay] = useState(
    isoToDisplayDate(new Date().toISOString().split('T')[0])
  );
  const [effectiveToDisplay, setEffectiveToDisplay] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basicPay: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
  });
  const [items, setItems] = useState<Omit<PayrollPlanItem, 'id' | 'schoolId' | 'planId' | 'createdAt' | 'updatedAt'>[]>([]);

  useEffect(() => {
    if (open && user?.school_id) {
      loadStaff();
    }
  }, [open, user?.school_id]);

  useEffect(() => {
    if (editingPlan && open) {
      setSelectedStaffId(editingPlan.staffId || '');
      setFormData({
        name: editingPlan.name,
        description: editingPlan.description || '',
        basicPay: editingPlan.basicPay,
        effectiveFrom: editingPlan.effectiveFrom,
        effectiveTo: editingPlan.effectiveTo || '',
      });
      setEffectiveFromDisplay(isoToDisplayDate(editingPlan.effectiveFrom));
      setEffectiveToDisplay(isoToDisplayDate(editingPlan.effectiveTo || ''));
      loadPlanItems();
    } else if (open) {
      resetForm();
    }
  }, [editingPlan, open]);

  const loadStaff = async () => {
    if (!user?.school_id) return;
    try {
      setLoadingStaff(true);
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('school_id', user.school_id)
        .order('name');
      
      if (error) throw error;
      setStaffList(data || []);
    } catch (error: any) {
      console.error('Error loading staff:', error);
      showToast('Failed to load staff list', 'error');
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadPlanItems = async () => {
    if (!editingPlan || !user?.school_id) return;
    try {
      const planWithItems = await payrollService.getPayrollPlan(user.school_id, editingPlan.id);
      if (planWithItems?.items) {
        setItems(planWithItems.items.map(item => ({
          itemType: item.itemType,
          name: item.name,
          amountType: item.amountType,
          amount: item.amount,
          isTaxable: item.isTaxable,
          calculationBasis: item.calculationBasis,
          displayOrder: item.displayOrder,
        })));
      }
    } catch (error) {
      console.error('Error loading plan items:', error);
    }
  };

  const resetForm = () => {
    const todayIso = new Date().toISOString().split('T')[0];
    setSelectedStaffId('');
    setFormData({
      name: '',
      description: '',
      basicPay: 0,
      effectiveFrom: todayIso,
      effectiveTo: '',
    });
    setEffectiveFromDisplay(isoToDisplayDate(todayIso));
    setEffectiveToDisplay('');
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([...items, {
      itemType: 'allowance',
      name: '',
      amountType: 'fixed',
      amount: 0,
      isTaxable: false,
      calculationBasis: 'basic_pay',
      displayOrder: items.length,
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSave = async () => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    if (!selectedStaffId) {
      showToast('Please select an employee', 'error');
      return;
    }

    if (!formData.name.trim()) {
      showToast('Please enter plan name', 'error');
      return;
    }

    if (formData.basicPay <= 0) {
      showToast('Basic pay must be greater than 0', 'error');
      return;
    }

    if (!isValidDisplayDate(effectiveFromDisplay)) {
      showToast('Effective from date must be in dd-mm-yyyy format', 'error');
      return;
    }

    if (effectiveToDisplay && !isValidDisplayDate(effectiveToDisplay)) {
      showToast('Effective to date must be in dd-mm-yyyy format', 'error');
      return;
    }

    setSaving(true);
    try {
      const planData: CreatePayrollPlanInput = {
        staffId: selectedStaffId as number,
        name: formData.name,
        description: formData.description,
        basicPay: formData.basicPay,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || undefined,
        items: items.filter(item => item.name.trim() !== ''),
      };

      if (editingPlan) {
        await payrollService.updatePayrollPlan(
          user.school_id,
          editingPlan.id,
          {
            name: planData.name,
            description: planData.description,
            basicPay: planData.basicPay,
            effectiveFrom: planData.effectiveFrom,
            effectiveTo: planData.effectiveTo,
          },
          user.id
        );

        // Update items separately
        const existingItems = await payrollService.getPayrollPlanItems(user.school_id, editingPlan.id);
        for (const existingItem of existingItems) {
          await payrollService.deletePayrollPlanItem(user.school_id, existingItem.id, user.id);
        }

        for (const item of planData.items) {
          await payrollService.addPayrollPlanItem(
            user.school_id,
            editingPlan.id,
            item,
            user.id
          );
        }
      } else {
        await payrollService.createPayrollPlan(user.school_id, planData, user.id);
      }

      showToast(editingPlan ? 'Payroll plan updated successfully' : 'Payroll plan created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      showToast(error.message || 'Failed to save payroll plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay open={open} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{editingPlan ? 'Edit Payroll Plan' : 'Create Payroll Plan'}</ModalTitle>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </ModalHeader>

        <ModalBody>
          <FormGroup>
            <Label>Select Employee *</Label>
            <FormControl fullWidth size="small" variant="outlined">
              <Select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value as number | '')}
                disabled={!!editingPlan || loadingStaff}
                required
              >
                <MenuItem value="">
                  {loadingStaff ? 'Loading employees...' : 'Select an employee'}
                </MenuItem>
                {staffList.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {editingPlan && (
              <Box style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY, marginTop: '4px' }}>
                Employee cannot be changed after plan creation
              </Box>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Plan Name *</Label>
            <TextField
              size="small"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Monthly Salary Plan"
              fullWidth
              variant="outlined"
            />
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <TextField
              size="small"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Plan description"
              multiline
              rows={2}
              fullWidth
              variant="outlined"
            />
          </FormGroup>

          <Box display="flex" gap={2}>
            <FormGroup style={{ flex: 1 }}>
              <Label>Basic Pay *</Label>
              <TextField
                type="number"
                size="small"
                value={formData.basicPay}
                onChange={(e) => setFormData({ ...formData, basicPay: parseFloat(e.target.value) || 0 })}
                onKeyDown={blockNumberArrowKey}
                onWheelCapture={blockNumberWheelChange}
                fullWidth
                variant="outlined"
                inputProps={{ min: 0, step: 0.01 }}
                sx={payrollAmountInputSx}
              />
            </FormGroup>

            <FormGroup style={{ flex: 1 }}>
              <Label>Effective From *</Label>
              <PayrollDateField
                value={effectiveFromDisplay}
                onChange={(isoValue, displayValue) => {
                  setEffectiveFromDisplay(displayValue);
                  setFormData({ ...formData, effectiveFrom: isoValue });
                }}
              />
            </FormGroup>

            <FormGroup style={{ flex: 1 }}>
              <Label>Effective To</Label>
              <PayrollDateField
                value={effectiveToDisplay}
                onChange={(isoValue, displayValue) => {
                  setEffectiveToDisplay(displayValue);
                  setFormData({ ...formData, effectiveTo: isoValue });
                }}
              />
            </FormGroup>
          </Box>

          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
              <Label>Plan Items (Allowances & Deductions)</Label>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                variant="outlined"
              >
                Add Item
              </Button>
            </Box>

            {items.length > 0 ? (
              <TableContainer>
                <StyledTable size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Amount Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Taxable</TableCell>
                      <TableCell width={50}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            size="small"
                            value={item.itemType}
                            onChange={(e) => handleUpdateItem(index, 'itemType', e.target.value)}
                            style={{ width: '100px', fontSize: '0.8rem' }}
                          >
                            <MenuItem value="allowance">Allowance</MenuItem>
                            <MenuItem value="deduction">Deduction</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            placeholder="e.g., HRA, PF"
                            fullWidth
                            variant="outlined"
                            style={{ fontSize: '0.8rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={item.amountType}
                            onChange={(e) => handleUpdateItem(index, 'amountType', e.target.value)}
                            style={{ width: '100px', fontSize: '0.8rem' }}
                          >
                            <MenuItem value="fixed">Fixed</MenuItem>
                            <MenuItem value="percentage">%</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.amount}
                            onChange={(e) => handleUpdateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                            onKeyDown={blockNumberArrowKey}
                            onWheelCapture={blockNumberWheelChange}
                            fullWidth
                            variant="outlined"
                            inputProps={{ min: 0, step: 0.01 }}
                            style={{ fontSize: '0.8rem' }}
                            sx={payrollAmountInputSx}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            size="small"
                            checked={item.isTaxable}
                            onChange={(e) => handleUpdateItem(index, 'isTaxable', e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveItem(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </StyledTable>
              </TableContainer>
            ) : (
              <Box padding={2} textAlign="center" color={theme.TEXT_SECONDARY} fontSize="0.875rem">
                No items added. Click "Add Item" to add allowances or deductions.
              </Box>
            )}
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} variant="outlined" size="small">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            size="small"
            disabled={saving}
          >
            {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

const TableContainer = styled.div`
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  overflow: auto;
  max-height: 400px;
  
  @media (max-width: 768px) {
    max-height: 300px;
    border-radius: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export default CreatePayrollPlanModal;
