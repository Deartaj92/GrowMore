import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollGeneration, ProcessPaymentInput } from '../../../../types/payroll';
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
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Payment as PaymentIcon } from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import PayrollDateField from '../PayrollDateField';
import {
  blockNumberArrowKey,
  blockNumberWheelChange,
  formatPayrollCurrency,
  isoToDisplayDate,
  isValidDisplayDate,
  payrollAmountInputSx,
} from '../../utils';
import { usePayrollDisplaySettings } from '../../PayrollDisplaySettingsContext';

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
  max-width: 500px;
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

const InfoBox = styled.div`
  background: ${({ theme }) => theme.BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    padding: 5px 6px;
    margin-bottom: 6px;
  }
`;

interface ProcessPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  generationId?: number | null;
}

const ProcessPaymentModal: React.FC<ProcessPaymentModalProps> = ({
  open,
  onClose,
  onSuccess,
  generationId,
}) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { roundUpAmounts, formatCurrency } = usePayrollDisplaySettings();
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState<PayrollGeneration | null>(null);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other'>('bank_transfer');
  const [paymentDateDisplay, setPaymentDateDisplay] = useState(
    isoToDisplayDate(new Date().toISOString().split('T')[0])
  );
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMode: 'bank_transfer' as 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other',
    referenceNo: '',
    remarks: '',
  });

  useEffect(() => {
    if (open && user?.school_id) {
      loadDefaultPaymentMode();
      if (generationId) {
        loadGeneration();
      } else {
        resetForm();
      }
    }
  }, [open, generationId, user?.school_id]);

  const loadDefaultPaymentMode = async () => {
    if (!user?.school_id) return;

    try {
      const settings = await payrollService.getPayrollSettings(user.school_id);
      const paymentMode = settings?.defaultPaymentMode || 'bank_transfer';
      setDefaultPaymentMode(paymentMode);
      setFormData(prev => ({
        ...prev,
        paymentMode: paymentMode,
      }));
    } catch (error) {
      console.error('Error loading payroll settings:', error);
    }
  };

  const loadGeneration = async () => {
    if (!generationId || !user?.school_id) return;
    try {
      setLoading(true);
      const data = await payrollService.getPayrollGeneration(user.school_id, generationId);
      if (data) {
        setGeneration(data);
        
        // Get all payments for this generation to calculate remaining balance
        const payments = await payrollService.getPayrollPayments(user.school_id, {});
        const generationPayments = payments.filter(p => p.generationId === generationId && p.status === 'completed');
        const totalPaid = generationPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, data.netSalary - totalPaid);
        
        setRemainingBalance(remaining);
        setFormData(prev => ({
          ...prev,
          amount: remaining, // Pre-fill with remaining balance
        }));
      }
    } catch (error: any) {
      console.error('Error loading generation:', error);
      showToast('Failed to load payroll generation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const todayIso = new Date().toISOString().split('T')[0];
    setFormData({
      paymentDate: todayIso,
      amount: 0,
      paymentMode: defaultPaymentMode,
      referenceNo: '',
      remarks: '',
    });
    setPaymentDateDisplay(isoToDisplayDate(todayIso));
    setGeneration(null);
  };

  const handleSave = async () => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    if (!generationId && !generation) {
      showToast('Please select a payroll generation', 'error');
      return;
    }

    if (!isValidDisplayDate(paymentDateDisplay)) {
      showToast('Payment date must be in dd-mm-yyyy format', 'error');
      return;
    }

    if (formData.amount <= 0) {
      showToast('Payment amount must be greater than 0', 'error');
      return;
    }

    if (formData.amount > remainingBalance) {
      showToast(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`, 'error');
      return;
    }

    setLoading(true);
    try {
      const paymentInput: ProcessPaymentInput = {
        generationId: generationId || generation!.id,
        paymentDate: formData.paymentDate,
        amount: formData.amount,
        paymentMode: formData.paymentMode,
        referenceNo: formData.referenceNo || undefined,
        remarks: formData.remarks || undefined,
      };

      await payrollService.processPayment(user.school_id, paymentInput, user.id);
      showToast('Payment processed successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      showToast(error.message || 'Failed to process payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay open={open} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Process Payment</ModalTitle>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </ModalHeader>

        <ModalBody>
          {loading && !generation ? (
            <Loader />
          ) : generation ? (
            <InfoBox>
              <Box display="flex" flexDirection="column" gap={0.5}>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6875rem', sm: '0.75rem' }, color: theme.TEXT_SECONDARY }}>
                    {generation.staff?.name} • {generation.payrollMonth}/{generation.payrollYear}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6875rem', sm: '0.75rem' }, fontWeight: 600, color: remainingBalance > 0 ? '#ef4444' : '#10b981' }}>
                    Balance: {formatCurrency(remainingBalance)}
                  </Typography>
                </Box>
              </Box>
            </InfoBox>
          ) : null}

          <FormGroup>
            <Label>Payment Date *</Label>
            <PayrollDateField
              value={paymentDateDisplay}
              onChange={(isoValue, displayValue) => {
                setPaymentDateDisplay(displayValue);
                setFormData({ ...formData, paymentDate: isoValue });
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: '36px', sm: '32px' },
                },
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>Amount *</Label>
            <TextField
              type="number"
              size="small"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              onKeyDown={blockNumberArrowKey}
              onWheelCapture={blockNumberWheelChange}
              fullWidth
              variant="outlined"
              inputProps={{ min: 0, max: remainingBalance, step: 0.01 }}
              helperText={`Maximum: ${formatPayrollCurrency(remainingBalance, roundUpAmounts)}`}
              sx={{
                ...payrollAmountInputSx,
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: '36px', sm: '32px' },
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.625rem', sm: '0.6875rem' },
                },
              }}
            />
            <Box display="flex" gap={1} marginTop={1} sx={{ '@media (max-width: 768px)': { marginTop: 0.75 } }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setFormData({ ...formData, amount: remainingBalance })}
                disabled={remainingBalance === 0}
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: '32px', sm: '28px' },
                  padding: { xs: '4px 10px', sm: '2px 10px' },
                }}
              >
                Pay Full Balance
              </Button>
            </Box>
          </FormGroup>

          <FormGroup>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Payment Mode *</InputLabel>
              <Select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                label="Payment Mode *"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: '36px', sm: '32px' },
                }}
              >
                <MenuItem value="cash" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Cash</MenuItem>
                <MenuItem value="bank_transfer" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Bank Transfer</MenuItem>
                <MenuItem value="cheque" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Cheque</MenuItem>
                <MenuItem value="easypaisa_jazzcash" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>EasyPaisa/JazzCash</MenuItem>
                <MenuItem value="other" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Other</MenuItem>
              </Select>
            </FormControl>
          </FormGroup>

          <FormGroup>
            <Label>Reference Number</Label>
            <TextField
              size="small"
              value={formData.referenceNo}
              onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
              placeholder="Transaction ID, Cheque No, etc."
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: '36px', sm: '32px' },
                },
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>Remarks</Label>
            <TextField
              size="small"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              multiline
              rows={2}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                },
              }}
            />
          </FormGroup>
        </ModalBody>

        <ModalFooter>
          <Button 
            onClick={onClose} 
            variant="outlined" 
            size="small" 
            disabled={loading}
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              height: { xs: '36px', sm: '32px' },
              padding: { xs: '4px 10px', sm: '4px 12px' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            size="small"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <PaymentIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />}
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              height: { xs: '36px', sm: '32px' },
              padding: { xs: '4px 10px', sm: '4px 12px' },
            }}
          >
            {loading ? 'Processing...' : 'Process Payment'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProcessPaymentModal;
