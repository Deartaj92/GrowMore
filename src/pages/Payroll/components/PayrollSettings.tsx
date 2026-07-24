import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  EventBusy as AbsentIcon,
  AccessTime as LateIcon,
  AttachMoney as CurrencyIcon,
  Description as NoteIcon,
  AccountBalanceWallet as LoanIcon,
  CheckCircle as RuleIcon,
} from '@mui/icons-material';
import {
  CircularProgress,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

const Card = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  padding-bottom: 1rem;
`;

const Title = styled.h2<{ theme: any }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const SettingBlock = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const BlockTitle = styled.h3<{ theme: any; $color?: string }>`
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PayrollSettings: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { refreshSettings } = usePayrollDisplaySettings();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [unmarkedAsAbsent, setUnmarkedAsAbsent] = useState<boolean>(false);
  const [weekendRule, setWeekendRule] = useState<'sunday_only' | 'sat_sun' | 'no_weekend'>('sunday_only');
  const [allowedPaidLeaves, setAllowedPaidLeaves] = useState<number>(0);

  const [absentCutMode, setAbsentCutMode] = useState<'prorata' | 'fixed' | 'disabled'>('prorata');
  const [fixedAbsentRate, setFixedAbsentRate] = useState<number>(500);

  const [lateLeniencyCount, setLateLeniencyCount] = useState<number>(3);
  const [lateFineMode, setLateFineMode] = useState<'days' | 'fixed'>('days');
  const [lateDeductionDays, setLateDeductionDays] = useState<number>(1);
  const [fixedLateFine, setFixedLateFine] = useState<number>(200);

  const [autoDeductAdvance, setAutoDeductAdvance] = useState<boolean>(true);
  const [roundUpAmounts, setRoundUpAmounts] = useState<boolean>(false);
  const [currencySymbol, setCurrencySymbol] = useState<string>('Rs.');
  const [payslipNote, setPayslipNote] = useState<string>('Computer generated payslip. No signature required.');

  useEffect(() => {
    loadSettings();
  }, [user?.school_id]);

  const loadSettings = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const stored = localStorage.getItem(`payroll_settings_${user.school_id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.unmarkedAsAbsent !== undefined) setUnmarkedAsAbsent(parsed.unmarkedAsAbsent);
        if (parsed.weekendRule) setWeekendRule(parsed.weekendRule);
        if (parsed.allowedPaidLeaves !== undefined) setAllowedPaidLeaves(parsed.allowedPaidLeaves);

        if (parsed.absentCutMode) setAbsentCutMode(parsed.absentCutMode);
        if (parsed.fixedAbsentRate !== undefined) setFixedAbsentRate(parsed.fixedAbsentRate);

        if (parsed.lateLeniencyCount !== undefined) setLateLeniencyCount(parsed.lateLeniencyCount);
        if (parsed.lateFineMode) setLateFineMode(parsed.lateFineMode);
        if (parsed.lateDeductionDays !== undefined) setLateDeductionDays(parsed.lateDeductionDays);
        if (parsed.fixedLateFine !== undefined) setFixedLateFine(parsed.fixedLateFine);

        if (parsed.autoDeductAdvance !== undefined) setAutoDeductAdvance(parsed.autoDeductAdvance);
        if (parsed.roundUpAmounts !== undefined) setRoundUpAmounts(parsed.roundUpAmounts);
        if (parsed.currencySymbol) setCurrencySymbol(parsed.currencySymbol);
        if (parsed.payslipNote) setPayslipNote(parsed.payslipNote);
      }
    } catch (err) {
      console.error('Error loading payroll settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.school_id) return;
    setSaving(true);
    try {
      const payload = {
        unmarkedAsAbsent,
        weekendRule,
        allowedPaidLeaves,
        absentCutMode,
        fixedAbsentRate,
        lateLeniencyCount,
        lateFineMode,
        lateDeductionDays,
        fixedLateFine,
        autoDeductAdvance,
        roundUpAmounts,
        currencySymbol,
        payslipNote,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(`payroll_settings_${user.school_id}`, JSON.stringify(payload));
      await refreshSettings();
      showToast('Payroll settings updated successfully!', 'success');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card theme={theme}>
      <HeaderRow>
        <Title theme={theme}>
          <SettingsIcon style={{ color: theme.ACCENT }} /> Payroll & Attendance Settings
        </Title>
        <Button
          onClick={handleSaveSettings}
          variant="contained"
          color="primary"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          style={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
        >
          Save Configuration
        </Button>
      </HeaderRow>

      {loading ? (
        <div style={{ padding: '2.5rem', textAlign: 'center' }}>
          <CircularProgress size={32} color="primary" />
        </div>
      ) : (
        <SectionGrid>
          {/* Attendance Rules */}
          <SettingBlock theme={theme}>
            <BlockTitle theme={theme} $color="#8b5cf6">
              <RuleIcon fontSize="small" /> Attendance & Unmarked Days Rule
            </BlockTitle>

            <FormControl size="small" fullWidth>
              <InputLabel>Weekend Non-Working Days</InputLabel>
              <Select
                value={weekendRule}
                label="Weekend Non-Working Days"
                onChange={e => setWeekendRule(e.target.value as any)}
              >
                <MenuItem value="sunday_only">Sunday Only (Standard 6 Days/Week)</MenuItem>
                <MenuItem value="sat_sun">Saturday & Sunday (5 Days/Week)</MenuItem>
                <MenuItem value="no_weekend">No Weekend (All 7 Days Working)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={unmarkedAsAbsent}
                  onChange={e => setUnmarkedAsAbsent(e.target.checked)}
                  color="primary"
                />
              }
              label="Count Unmarked Past Working Days as Absent"
            />

            <TextField
              label="Allowed Free Paid Leaves per Month"
              type="number"
              size="small"
              fullWidth
              value={allowedPaidLeaves}
              onChange={e => setAllowedPaidLeaves(Number(e.target.value))}
              helperText="Leaves within this count won't incur salary deduction"
            />
          </SettingBlock>

          {/* Absence Salary Cut Policy */}
          <SettingBlock theme={theme}>
            <BlockTitle theme={theme} $color="#ef4444">
              <AbsentIcon fontSize="small" /> Absence Salary Cut Policy
            </BlockTitle>

            <FormControl size="small" fullWidth>
              <InputLabel>Absent Cut Mode</InputLabel>
              <Select
                value={absentCutMode}
                label="Absent Cut Mode"
                onChange={e => setAbsentCutMode(e.target.value as any)}
              >
                <MenuItem value="prorata">Pro-Rata Daily Rate (Basic Pay / Working Days)</MenuItem>
                <MenuItem value="fixed">Fixed Fine Rate per Absent Day</MenuItem>
                <MenuItem value="disabled">Disable Auto Absent Salary Cut</MenuItem>
              </Select>
            </FormControl>

            {absentCutMode === 'fixed' && (
              <TextField
                label="Fixed Fine Amount per Absent Day (Rs.)"
                type="number"
                size="small"
                fullWidth
                value={fixedAbsentRate}
                onChange={e => setFixedAbsentRate(Number(e.target.value))}
              />
            )}
          </SettingBlock>

          {/* Late Arrival Penalties */}
          <SettingBlock theme={theme}>
            <BlockTitle theme={theme} $color="#f59e0b">
              <LateIcon fontSize="small" /> Late Arrivals & Penalties
            </BlockTitle>

            <TextField
              label="Free Late Check-ins Count"
              type="number"
              size="small"
              fullWidth
              value={lateLeniencyCount}
              onChange={e => setLateLeniencyCount(Number(e.target.value))}
              helperText="Number of late check-ins allowed free per month"
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Late Fine Type</InputLabel>
              <Select
                value={lateFineMode}
                label="Late Fine Type"
                onChange={e => setLateFineMode(e.target.value as any)}
              >
                <MenuItem value="days">Deduct Days Salary per 3 Lates</MenuItem>
                <MenuItem value="fixed">Fixed Fine Amount per Late Check-in</MenuItem>
              </Select>
            </FormControl>

            {lateFineMode === 'days' ? (
              <TextField
                label="Salary Days Cut per 3 Lates"
                type="number"
                size="small"
                fullWidth
                value={lateDeductionDays}
                onChange={e => setLateDeductionDays(Number(e.target.value))}
              />
            ) : (
              <TextField
                label="Fixed Fine per Late Check-in (Rs.)"
                type="number"
                size="small"
                fullWidth
                value={fixedLateFine}
                onChange={e => setFixedLateFine(Number(e.target.value))}
              />
            )}
          </SettingBlock>

          {/* Loan Recovery & Currency */}
          <SettingBlock theme={theme}>
            <BlockTitle theme={theme} $color={theme.ACCENT}>
              <LoanIcon fontSize="small" /> Advance Recovery & Display Options
            </BlockTitle>

            <FormControlLabel
              control={
                <Switch
                  checked={autoDeductAdvance}
                  onChange={e => setAutoDeductAdvance(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto-Deduct Active Loan Monthly Installments"
            />

            <TextField
              label="Currency Symbol"
              size="small"
              fullWidth
              value={currencySymbol}
              onChange={e => setCurrencySymbol(e.target.value)}
              placeholder="e.g. Rs., $, AED"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={roundUpAmounts}
                  onChange={e => setRoundUpAmounts(e.target.checked)}
                  color="primary"
                />
              }
              label="Round Up Net Payable Amounts"
            />
          </SettingBlock>

          {/* Official Payslip Disclaimer */}
          <SettingBlock theme={theme}>
            <BlockTitle theme={theme} $color="#3b82f6">
              <NoteIcon fontSize="small" /> Printable Payslip Footer Note
            </BlockTitle>

            <TextField
              label="Payslip Footer Disclaimer / Note"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={payslipNote}
              onChange={e => setPayslipNote(e.target.value)}
              placeholder="e.g. Computer generated document. No signature required."
            />
          </SettingBlock>
        </SectionGrid>
      )}
    </Card>
  );
};

export default PayrollSettings;
