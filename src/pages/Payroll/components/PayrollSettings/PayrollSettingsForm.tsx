import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollSettings } from '../../../../types/payroll';
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  FormHelperText,
  CircularProgress,
} from '@mui/material';
import { Settings as SettingsIcon, Save as SaveIcon } from '@mui/icons-material';
import Loader from '../../../../components/Loader';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 20px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100%;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
`;

const SettingsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  font-weight: 500;
`;

const HelperText = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 4px 0 0 0;
  line-height: 1.4;
`;

const ActionButton = styled(Button)`
  margin-top: 16px;
  padding: 10px 24px;
  font-weight: 600;
  text-transform: none;
  border-radius: 8px;
`;

const PayrollSettingsForm: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);

  const [formData, setFormData] = useState({
    monthlyWorkingDays: 26,
    allowedLeavesPerMonth: 2,
    leaveDeductionMethod: 'full_day' as 'full_day' | 'half_day' | 'proportional',
    salaryCalculationMethod: 'monthly' as 'monthly' | 'daily' | 'hourly',
    defaultPaymentMode: 'bank_transfer' as 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other',
    autoApprovePayroll: false,
    lateDeductionEnabled: false,
    allowedLateDaysPerMonth: 0,
    lateDeductionAmount: 0,
    lateDeductionType: 'fixed' as 'fixed' | 'percentage',
  });

  useEffect(() => {
    if (user?.school_id) {
      loadSettings();
    }
  }, [user?.school_id]);

  const loadSettings = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getPayrollSettings(user.school_id);
      
      if (data) {
        setSettings(data);
        setFormData({
          monthlyWorkingDays: data.monthlyWorkingDays,
          allowedLeavesPerMonth: data.allowedLeavesPerMonth,
          leaveDeductionMethod: data.leaveDeductionMethod,
          salaryCalculationMethod: data.salaryCalculationMethod,
          defaultPaymentMode: data.defaultPaymentMode,
          autoApprovePayroll: data.autoApprovePayroll,
          lateDeductionEnabled: data.lateDeductionEnabled || false,
          allowedLateDaysPerMonth: data.allowedLateDaysPerMonth || 0,
          lateDeductionAmount: data.lateDeductionAmount || 0,
          lateDeductionType: data.lateDeductionType || 'fixed',
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      showToast('Failed to load payroll settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    setSaving(true);
    try {
      await payrollService.updatePayrollSettings(
        user.school_id,
        formData,
        user.id
      );
      
      showToast('Payroll settings saved successfully', 'success');
      await loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast(error.message || 'Failed to save payroll settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Loader />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>
          <SettingsIcon style={{ fontSize: 24 }} />
          Payroll Settings
        </Title>
        <Subtitle>Configure general payroll settings and calculation methods</Subtitle>
      </Header>

      <SettingsCard>
        <SectionTitle>Working Days & Leaves</SectionTitle>
        
        <FormGroup>
          <Label>Monthly Working Days</Label>
          <TextField
            type="number"
            value={formData.monthlyWorkingDays}
            onChange={(e) => setFormData({
              ...formData,
              monthlyWorkingDays: parseInt(e.target.value) || 26,
            })}
            inputProps={{ min: 1, max: 31 }}
            size="small"
            fullWidth
            variant="outlined"
          />
          <HelperText>Number of working days in a month (typically 26)</HelperText>
        </FormGroup>

        <FormGroup>
          <Label>Allowed Leaves Per Month</Label>
          <TextField
            type="number"
            value={formData.allowedLeavesPerMonth}
            onChange={(e) => setFormData({
              ...formData,
              allowedLeavesPerMonth: parseInt(e.target.value) || 0,
            })}
            inputProps={{ min: 0 }}
            size="small"
            fullWidth
            variant="outlined"
          />
          <HelperText>Number of leaves allowed per month without deduction</HelperText>
        </FormGroup>

        <FormGroup>
          <FormControl component="fieldset">
            <FormLabel component="legend" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
              Leave Deduction Method
            </FormLabel>
            <RadioGroup
              value={formData.leaveDeductionMethod}
              onChange={(e) => setFormData({
                ...formData,
                leaveDeductionMethod: e.target.value as any,
              })}
            >
              <FormControlLabel
                value="full_day"
                control={<Radio size="small" />}
                label="Full Day (deduct full day salary)"
              />
              <FormControlLabel
                value="half_day"
                control={<Radio size="small" />}
                label="Half Day (deduct half day salary)"
              />
              <FormControlLabel
                value="proportional"
                control={<Radio size="small" />}
                label="Proportional (based on working days)"
              />
            </RadioGroup>
          </FormControl>
        </FormGroup>
      </SettingsCard>

      <SettingsCard>
        <SectionTitle>Late Attendance Deduction</SectionTitle>
        
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={formData.lateDeductionEnabled}
                onChange={(e) => setFormData({
                  ...formData,
                  lateDeductionEnabled: e.target.checked,
                })}
                size="small"
              />
            }
            label="Enable Late Attendance Deduction"
          />
          <HelperText>Deduct amount for late attendance in payroll calculations</HelperText>
        </FormGroup>

        {formData.lateDeductionEnabled && (
          <>
            <FormGroup>
              <Label>Allowed Late Days Per Month</Label>
              <TextField
                type="number"
                value={formData.allowedLateDaysPerMonth}
                onChange={(e) => setFormData({
                  ...formData,
                  allowedLateDaysPerMonth: parseInt(e.target.value) || 0,
                })}
                inputProps={{ min: 0 }}
                size="small"
                fullWidth
                variant="outlined"
              />
              <HelperText>Number of late attendance days allowed per month without deduction</HelperText>
            </FormGroup>

            <FormGroup>
              <FormControl component="fieldset">
                <FormLabel component="legend" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                  Deduction Type
                </FormLabel>
                <RadioGroup
                  value={formData.lateDeductionType}
                  onChange={(e) => setFormData({
                    ...formData,
                    lateDeductionType: e.target.value as 'fixed' | 'percentage',
                  })}
                >
                  <FormControlLabel
                    value="fixed"
                    control={<Radio size="small" />}
                    label="Fixed Amount (per late day)"
                  />
                  <FormControlLabel
                    value="percentage"
                    control={<Radio size="small" />}
                    label="Percentage (of daily rate per late day)"
                  />
                </RadioGroup>
              </FormControl>
            </FormGroup>

            <FormGroup>
              <Label>
                {formData.lateDeductionType === 'fixed' 
                  ? 'Deduction Amount Per Day (Rs.)' 
                  : 'Deduction Percentage Per Day (%)'}
              </Label>
              <TextField
                type="number"
                value={formData.lateDeductionAmount}
                onChange={(e) => setFormData({
                  ...formData,
                  lateDeductionAmount: parseFloat(e.target.value) || 0,
                })}
                inputProps={{ 
                  min: 0, 
                  step: formData.lateDeductionType === 'percentage' ? 0.1 : 1 
                }}
                size="small"
                fullWidth
                variant="outlined"
              />
              <HelperText>
                {formData.lateDeductionType === 'fixed'
                  ? 'Fixed amount to deduct per late day after allowed days (e.g., Rs. 50 per late day)'
                  : 'Percentage of daily rate to deduct per late day after allowed days (e.g., 5% of daily rate)'}
              </HelperText>
            </FormGroup>
          </>
        )}
      </SettingsCard>

      <SettingsCard>
        <SectionTitle>Salary Calculation</SectionTitle>
        
        <FormGroup>
          <FormControl component="fieldset">
            <FormLabel component="legend" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
              Salary Calculation Method
            </FormLabel>
            <RadioGroup
              value={formData.salaryCalculationMethod}
              onChange={(e) => setFormData({
                ...formData,
                salaryCalculationMethod: e.target.value as any,
              })}
            >
              <FormControlLabel
                value="monthly"
                control={<Radio size="small" />}
                label="Monthly (fixed monthly salary)"
              />
              <FormControlLabel
                value="daily"
                control={<Radio size="small" />}
                label="Daily (calculated based on days worked)"
              />
              <FormControlLabel
                value="hourly"
                control={<Radio size="small" />}
                label="Hourly (calculated based on hours worked)"
              />
            </RadioGroup>
          </FormControl>
        </FormGroup>
      </SettingsCard>

      <SettingsCard>
        <SectionTitle>Payment Settings</SectionTitle>
        
        <FormGroup>
          <FormControl component="fieldset">
            <FormLabel component="legend" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
              Default Payment Mode
            </FormLabel>
            <RadioGroup
              value={formData.defaultPaymentMode}
              onChange={(e) => setFormData({
                ...formData,
                defaultPaymentMode: e.target.value as any,
              })}
            >
              <FormControlLabel
                value="cash"
                control={<Radio size="small" />}
                label="Cash"
              />
              <FormControlLabel
                value="bank_transfer"
                control={<Radio size="small" />}
                label="Bank Transfer"
              />
              <FormControlLabel
                value="cheque"
                control={<Radio size="small" />}
                label="Cheque"
              />
              <FormControlLabel
                value="upi"
                control={<Radio size="small" />}
                label="UPI"
              />
              <FormControlLabel
                value="other"
                control={<Radio size="small" />}
                label="Other"
              />
            </RadioGroup>
          </FormControl>
        </FormGroup>

        <FormGroup>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Label>Auto-Approve Payroll</Label>
              <HelperText>Automatically approve payrolls after generation</HelperText>
            </Box>
            <Switch
              checked={formData.autoApprovePayroll}
              onChange={(e) => setFormData({
                ...formData,
                autoApprovePayroll: e.target.checked,
              })}
              size="small"
            />
          </Box>
        </FormGroup>
      </SettingsCard>

      <ActionButton
        variant="contained"
        color="primary"
        startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </ActionButton>
    </PageContainer>
  );
};

export default PayrollSettingsForm;

