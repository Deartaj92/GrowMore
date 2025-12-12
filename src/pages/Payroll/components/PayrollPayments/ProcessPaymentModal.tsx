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
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ModalTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const InfoBox = styled.div`
  background: ${({ theme }) => theme.BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
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
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState<PayrollGeneration | null>(null);
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMode: 'bank_transfer' as 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other',
    referenceNo: '',
    remarks: '',
  });

  useEffect(() => {
    if (open && generationId && user?.school_id) {
      loadGeneration();
    } else if (open) {
      resetForm();
    }
  }, [open, generationId, user?.school_id]);

  const loadGeneration = async () => {
    if (!generationId || !user?.school_id) return;
    try {
      setLoading(true);
      const data = await payrollService.getPayrollGeneration(user.school_id, generationId);
      if (data) {
        setGeneration(data);
        setFormData(prev => ({
          ...prev,
          amount: data.netSalary,
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
    setFormData({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMode: 'bank_transfer',
      referenceNo: '',
      remarks: '',
    });
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

    if (formData.amount <= 0) {
      showToast('Payment amount must be greater than 0', 'error');
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
              <Typography variant="subtitle2" style={{ marginBottom: 8, fontWeight: 600 }}>
                Payroll Details
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 4 }}>
                Employee: {generation.staff?.name}
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 4 }}>
                Month/Year: {generation.payrollMonth}/{generation.payrollYear}
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 4 }}>
                Net Salary: Rs. {generation.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>
            </InfoBox>
          ) : null}

          <FormGroup>
            <Label>Payment Date *</Label>
            <TextField
              type="date"
              size="small"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </FormGroup>

          <FormGroup>
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

          <FormGroup>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Mode *</InputLabel>
              <Select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                label="Payment Mode *"
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="other">Other</MenuItem>
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
            startIcon={loading ? <CircularProgress size={16} /> : <PaymentIcon />}
          >
            {loading ? 'Processing...' : 'Process Payment'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProcessPaymentModal;

