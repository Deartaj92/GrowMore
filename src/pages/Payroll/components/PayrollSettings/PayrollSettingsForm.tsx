import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
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
  CircularProgress,
} from '@mui/material';
import { Settings as SettingsIcon, Save as SaveIcon, CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon, CheckBox as CheckBoxIcon } from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import { blockNumberArrowKey, blockNumberWheelChange, payrollAmountInputSx } from '../../utils';
import { usePayrollDisplaySettings } from '../../PayrollDisplaySettingsContext';
import { reportService } from '../../../../utils/reportService';
import { Autocomplete, Checkbox } from '@mui/material';
import {
  PayrollContainer,
  ToolbarCard,
  ToolbarRow,
  ToolbarGroup,
  PageHeading,
  PageTitle,
  PageSubtitle,
  ContentCard,
} from '../../styles';

const SettingsCard = styled(ContentCard)`
  padding: 12px 14px;
  height: fit-content;
  display: inline-block;
  width: 100%;
  break-inside: avoid;
  margin-bottom: 12px;
  
  @media (max-width: 768px) {
    padding: 10px 12px;
    margin-bottom: 10px;
    border-radius: 4px;
  }
`;

const SettingsGrid = styled.div`
  column-count: 2;
  column-gap: 12px;
  margin-bottom: 12px;

  @media (max-width: 900px) {
    column-count: 1;
    margin-bottom: 10px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  
  @media (max-width: 768px) {
    font-size: 0.875rem;
    margin: 0 0 8px 0;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 14px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 12px;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8125rem;
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    margin-bottom: 4px;
  }
`;

const HelperText = styled.p`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 3px 0 0 0;
  line-height: 1.4;
  
  @media (max-width: 768px) {
    font-size: 0.625rem;
  }
`;

const ActionButton = styled(Button)`
  padding: 6px 16px;
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: none;
  border-radius: 6px;
  height: 32px;
  
  @media (max-width: 768px) {
    height: 36px;
    font-size: 0.75rem;
  }
`;

const StickyToolbarCard = styled(ToolbarCard)`
  position: sticky;
  top: 0;
  z-index: 20;
`;

const PayrollSettingsForm: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { refreshSettings } = usePayrollDisplaySettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    monthlyWorkingDays: 26,
    allowedLeavesPerMonth: 2,
    leaveDeductionMethod: 'full_day' as 'full_day' | 'half_day' | 'proportional',
    salaryCalculationMethod: 'monthly' as 'monthly' | 'daily' | 'hourly',
    defaultPaymentMode: 'bank_transfer' as 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other',
    autoApprovePayroll: false,
    lateDeductionEnabled: false,
    allowedLateDaysPerMonth: 0,
    lateDeductionAmount: 0,
    lateDeductionType: 'fixed' as 'fixed' | 'percentage',
    allowLeaveBonus: false,
    leaveBonusDays: 1 as 1 | 2,
    leaveBonusStaffIds: [] as number[],
    roundUpAmounts: false,
  });

  useEffect(() => {
    if (user?.school_id) {
      loadSettings();
      loadStaff();
    }
  }, [user?.school_id]);

  const loadStaff = async () => {
    try {
      const data = await reportService.getStaff(user.school_id);
      setStaffList(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const loadSettings = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getPayrollSettings(user.school_id);
      
      if (data) {
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
          allowLeaveBonus: data.allowLeaveBonus || false,
          leaveBonusDays: (data.leaveBonusDays === 2 ? 2 : 1) as 1 | 2,
          leaveBonusStaffIds: data.leaveBonusStaffIds || [],
          roundUpAmounts: data.roundUpAmounts || false,
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
      await refreshSettings();
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
      <PayrollContainer>
        <Loader />
      </PayrollContainer>
    );
  }

  return (
    <PayrollContainer>
      <StickyToolbarCard>
        <ToolbarRow>
          <ToolbarGroup>
            <PageHeading>
              <PageTitle>
                <SettingsIcon style={{ fontSize: 20 }} />
                Payroll Settings
              </PageTitle>
              <PageSubtitle>Configure working days, leave rules, deduction logic, and payment defaults with the same global clay styling used elsewhere in the app.</PageSubtitle>
            </PageHeading>
          </ToolbarGroup>
          <ToolbarGroup>
            <ActionButton
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </ActionButton>
          </ToolbarGroup>
        </ToolbarRow>
      </StickyToolbarCard>

      <SettingsGrid>
      <SettingsCard>
        <SectionTitle>Display & Rounding</SectionTitle>

        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={formData.roundUpAmounts}
                onChange={(e) => setFormData({
                  ...formData,
                  roundUpAmounts: e.target.checked,
                })}
                size="small"
              />
            }
            label="Round Up Payroll Amounts For Display"
          />
          <HelperText>When enabled, payroll amounts across tabs and PDF export are rounded upward to the nearest rupee.</HelperText>
        </FormGroup>
      </SettingsCard>

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
            onKeyDown={blockNumberArrowKey}
            onWheelCapture={blockNumberWheelChange}
            inputProps={{ min: 1, max: 31 }}
            size="small"
            fullWidth
            variant="outlined"
            sx={payrollAmountInputSx}
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
            onKeyDown={blockNumberArrowKey}
            onWheelCapture={blockNumberWheelChange}
            inputProps={{ min: 0 }}
            size="small"
            fullWidth
            variant="outlined"
            sx={payrollAmountInputSx}
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
                onKeyDown={blockNumberArrowKey}
                onWheelCapture={blockNumberWheelChange}
                inputProps={{ min: 0 }}
                size="small"
                fullWidth
                variant="outlined"
                sx={payrollAmountInputSx}
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
                onKeyDown={blockNumberArrowKey}
                onWheelCapture={blockNumberWheelChange}
                inputProps={{ 
                  min: 0, 
                  step: formData.lateDeductionType === 'percentage' ? 0.1 : 1 
                }}
                size="small"
                fullWidth
                variant="outlined"
                sx={payrollAmountInputSx}
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
        <SectionTitle>Leave Bonus</SectionTitle>
        
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={formData.allowLeaveBonus}
                onChange={(e) => setFormData({
                  ...formData,
                  allowLeaveBonus: e.target.checked,
                })}
                size="small"
              />
            }
            label="Allow Leave Bonus"
          />
          <HelperText>Enable bonus leave days for employees with no absentees</HelperText>
        </FormGroup>

        {formData.allowLeaveBonus && (
          <FormGroup>
            <FormControl component="fieldset">
              <FormLabel component="legend" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                Bonus Leave Days
              </FormLabel>
              <RadioGroup
                value={formData.leaveBonusDays}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBonusDays: parseInt(e.target.value) as 1 | 2,
                })}
              >
                <FormControlLabel
                  value={1}
                  control={<Radio size="small" />}
                  label="1 Day"
                />
                <FormControlLabel
                  value={2}
                  control={<Radio size="small" />}
                  label="2 Days"
                />
              </RadioGroup>
            </FormControl>
            <HelperText>Number of bonus leave days to add when employee has zero absentees</HelperText>
          </FormGroup>
        )}

        {formData.allowLeaveBonus && (
          <FormGroup>
            <Label>Eligible Employees</Label>
            <Autocomplete
              multiple
              options={staffList}
              getOptionLabel={(option) => option.name}
              value={staffList.filter(s => formData.leaveBonusStaffIds?.includes(s.id))}
              onChange={(_, newValue) => {
                setFormData({
                  ...formData,
                  leaveBonusStaffIds: newValue.map(v => v.id)
                });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  variant="outlined" 
                  size="small" 
                  placeholder="Select employees..." 
                  sx={payrollAmountInputSx}
                />
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  {option.name} ({option.role})
                </li>
              )}
              disableCloseOnSelect
              size="small"
            />
            <HelperText>Only selected employees will be eligible for the leave bonus. If none selected, the bonus will not be applied to anyone.</HelperText>
          </FormGroup>
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
                value="easypaisa_jazzcash"
                control={<Radio size="small" />}
                label="EasyPaisa/JazzCash"
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
      </SettingsGrid>

    </PayrollContainer>
  );
};

export default PayrollSettingsForm;
