import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../components/Layout/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { newPayrollService, NewPayrollGeneration } from '../services/newPayrollService';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import SalaryStatementDialog from './SalaryStatementDialog';
import {
  Calculate as GenerateIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import {
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  MenuItem,
  Select,
  Checkbox,
} from '@mui/material';

import { clayCardStyle } from '../../../styles/DesignSystem';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ControlsCard = styled.div<{ theme: any }>`
  ${clayCardStyle}
  padding: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const SelectGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SummaryStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
`;

const SummaryCard = styled.div<{ theme: any; $color?: string }>`
  ${clayCardStyle}
  padding: 0.85rem;

  label {
    font-size: 0.72rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-weight: 700;
    display: block;
    margin-bottom: 0.2rem;
  }

  div {
    font-size: 1.35rem;
    font-weight: 800;
    color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
  }
`;

const TableCard = styled.div<{ theme: any }>`
  ${clayCardStyle}
  padding: 0.85rem;
  overflow-x: auto;
`;

const Table = styled.table<{ theme: any }>`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;

  th,
  td {
    padding: 0.85rem 0.85rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    font-size: 0.83rem;
  }

  th {
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.5px;
  }

  td {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  tbody tr:hover {
    background: ${({ theme }) =>
      theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  }
`;

const StatusBadge = styled.span<{ $generated: boolean }>`
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.73rem;
  font-weight: 700;
  background: ${({ $generated }) =>
    $generated ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'};
  color: ${({ $generated }) => ($generated ? '#10b981' : '#f59e0b')};
  border: 1px solid
    ${({ $generated }) => ($generated ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)')};
`;

const ActionButton = styled.button<{ theme: any; $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'primary' ? theme.ACCENT : theme.BORDER};
  background: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.ACCENT : 'transparent'};
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? 'white' : theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    background: ${({ theme }) => (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')};
    border-color: ${({ theme }) => (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1')};
    color: ${({ theme }) => (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8')};
    cursor: not-allowed;
    opacity: 0.85;
  }
`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type GenerationItem = NewPayrollGeneration & { isGeneratedInDb: boolean };

const PayrollGenerator: React.FC = () => {
  const { theme: themeMode } = useTheme();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Payslip modal state
  const [viewPayslipGen, setViewPayslipGen] = useState<NewPayrollGeneration | null>(null);

  // Clear records dialog
  const [openClearConfirm, setOpenClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadMonthlyData();
  }, [user?.school_id, selectedMonth, selectedYear]);

  const loadMonthlyData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const data = await newPayrollService.getMonthlyGenerations(
        user.school_id,
        selectedMonth,
        selectedYear
      );
      setGenerations(data as GenerationItem[]);

      // Select all by default
      const allIds = new Set(data.map(g => g.staffId));
      setSelectedStaffIds(allIds);
    } catch (err: any) {
      console.error('Error loading payroll data:', err);
      showToast('Error loading monthly payroll', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedStaffIds.size === generations.length) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(generations.map(g => g.staffId)));
    }
  };

  const handleToggleStaff = (staffId: number) => {
    const next = new Set(selectedStaffIds);
    if (next.has(staffId)) next.delete(staffId);
    else next.add(staffId);
    setSelectedStaffIds(next);
  };

  const handleGenerateSelected = async () => {
    if (selectedStaffIds.size === 0) {
      showToast('Please select at least one staff member to generate payroll', 'error');
      return;
    }
    if (!user?.school_id) return;
    setGenerating(true);
    try {
      await newPayrollService.commitPayrollGenerations(
        user.school_id,
        selectedMonth,
        selectedYear,
        Array.from(selectedStaffIds),
        user.id
      );
      showToast(`Payroll generated in database for ${selectedStaffIds.size} staff member(s)!`, 'success');
      await loadMonthlyData();
    } catch (err: any) {
      console.error('Error generating payroll:', err);
      showToast('Failed to generate payroll', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSingle = async (staffId: number) => {
    if (!user?.school_id) return;
    setGenerating(true);
    try {
      await newPayrollService.commitPayrollGenerations(
        user.school_id,
        selectedMonth,
        selectedYear,
        [staffId],
        user.id
      );
      showToast('Staff payroll generated in database!', 'success');
      await loadMonthlyData();
    } catch (err: any) {
      console.error('Error generating single staff payroll:', err);
      showToast('Failed to generate staff payroll', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSingleGeneration = async (genId: number, staffName?: string) => {
    if (!user?.school_id || !genId) return;
    if (!window.confirm(`Are you sure you want to delete the generated payroll for ${staffName || 'this staff member'}?`)) {
      return;
    }
    try {
      await newPayrollService.deleteSinglePayrollGeneration(user.school_id, genId);
      showToast('Payroll generation record deleted successfully!', 'success');
      await loadMonthlyData();
    } catch (err: any) {
      console.error('Error deleting payroll generation:', err);
      showToast(err.message || 'Failed to delete payroll generation', 'error');
    }
  };

  const handleClearAllRecords = async () => {
    if (!user?.school_id) return;
    setClearing(true);
    try {
      await newPayrollService.clearAllSalaryRecords(user.school_id);
      showToast('All previous salary generations and payment records cleared!', 'success');
      setOpenClearConfirm(false);
      await loadMonthlyData();
    } catch (err: any) {
      console.error('Error clearing salary records:', err);
      showToast('Failed to clear salary records', 'error');
    } finally {
      setClearing(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const totalPayroll = generations.reduce((sum, g) => sum + g.netSalary, 0);
  const totalPaid = generations.reduce((sum, g) => sum + g.paidAmount, 0);
  const remainingBalance = totalPayroll - totalPaid;

  const selectedGenerations = generations.filter(g => selectedStaffIds.has(g.staffId));
  const ungeneratedSelectedCount = selectedGenerations.filter(g => !g.isGeneratedInDb).length;
  const isGenerateDisabled = generating || selectedStaffIds.size === 0 || ungeneratedSelectedCount === 0;

  return (
    <Container>
      <ControlsCard theme={theme}>
        <SelectGroup>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <GenerateIcon style={{ color: theme.ACCENT }} /> Select Payroll Month & Year
          </div>

          <Select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            size="small"
            style={{ width: '130px', background: theme.BG === '#252525' ? 'rgba(0,0,0,0.3)' : '#fff' }}
          >
            {MONTHS.map((m, idx) => (
              <MenuItem key={idx} value={idx + 1}>
                {m}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            size="small"
            style={{ width: '100px', background: theme.BG === '#252525' ? 'rgba(0,0,0,0.3)' : '#fff' }}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </SelectGroup>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ActionButton theme={theme} $variant="primary" onClick={handleGenerateSelected} disabled={isGenerateDisabled}>
            {generating ? (
              <CircularProgress size={16} color="inherit" />
            ) : ungeneratedSelectedCount === 0 && selectedStaffIds.size > 0 ? (
              <>
                <CheckIcon style={{ fontSize: 16 }} /> Selected Already Generated ({selectedStaffIds.size})
              </>
            ) : (
              <>
                <GenerateIcon style={{ fontSize: 16 }} /> Generate Payroll for Selected ({ungeneratedSelectedCount})
              </>
            )}
          </ActionButton>


        </div>
      </ControlsCard>

      <SummaryStrip>
        <SummaryCard theme={theme}>
          <label>Total Calculated Payroll</label>
          <div>{formatCurrency(totalPayroll)}</div>
        </SummaryCard>
        <SummaryCard theme={theme} $color="#10b981">
          <label>Total Disbursed So Far</label>
          <div>{formatCurrency(totalPaid)}</div>
        </SummaryCard>
        <SummaryCard theme={theme} $color={remainingBalance > 0 ? '#ef4444' : '#10b981'}>
          <label>Remaining Unpaid Balance</label>
          <div>{formatCurrency(remainingBalance)}</div>
        </SummaryCard>
      </SummaryStrip>

      <TableCard theme={theme}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <CircularProgress size={32} color="primary" />
          </div>
        ) : generations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
            <GenerateIcon style={{ fontSize: 42, color: theme.BORDER, marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Active Staff Salary Plans Configured</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Please create staff salary plans first in the <b>"Base Salary Directory"</b> tab.
            </div>
          </div>
        ) : (
          <Table theme={theme}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <Checkbox
                    size="small"
                    checked={selectedStaffIds.size === generations.length && generations.length > 0}
                    indeterminate={selectedStaffIds.size > 0 && selectedStaffIds.size < generations.length}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th>Staff Member</th>
                <th>Attendance (P / A / L)</th>
                <th>Basic Pay</th>
                <th>Arrears (Old Bal.)</th>
                <th>Absent Cut</th>
                <th>Late Fine</th>
                <th>Other Deductions</th>
                <th>Net Payable</th>
                <th>Generation Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {generations.map(gen => {
                const absentCut = gen.absentDeductions || 0;
                const lateFine = gen.lateDeductions || 0;
                const otherDeds = Math.max(0, gen.totalDeductions - absentCut - lateFine);
                const isSelected = selectedStaffIds.has(gen.staffId);
                const oldBal = gen.oldBalanceAmount || 0;

                return (
                  <tr
                    key={gen.staffId}
                    style={{
                      opacity: gen.isGeneratedInDb ? 0.65 : 1,
                      background: gen.isGeneratedInDb
                        ? theme.BG === '#252525'
                          ? 'rgba(0, 0, 0, 0.25)'
                          : 'rgba(0, 0, 0, 0.03)'
                        : undefined,
                    }}
                  >
                    <td>
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        disabled={gen.isGeneratedInDb}
                        onChange={() => handleToggleStaff(gen.staffId)}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{gen.staff?.name || `Staff #${gen.staffId}`}</div>
                      <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>{gen.staff?.role || 'Staff'}</div>
                    </td>
                    <td>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{gen.presentDays}P</span> /{' '}
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{gen.absentDays}A</span> /{' '}
                      <span style={{ color: '#3b82f6', fontWeight: 700 }}>{gen.leaveDays}L</span>
                      {gen.lateDays > 0 && (
                        <>
                          {' '} / <span style={{ color: '#f59e0b', fontWeight: 700 }}>{gen.lateDays}Lt</span>
                        </>
                      )}
                    </td>
                    <td>{formatCurrency(gen.basicPay)}</td>

                    {/* Arrears (Old Unpaid Balance) */}
                    <td style={{ color: oldBal > 0 ? '#8b5cf6' : theme.TEXT_SECONDARY, fontWeight: oldBal > 0 ? 700 : 400 }}>
                      {oldBal > 0 ? `+${formatCurrency(oldBal)}` : 'Rs. 0'}
                    </td>

                    {/* Absent Cut */}
                    <td style={{ color: absentCut > 0 ? '#ef4444' : theme.TEXT_SECONDARY, fontWeight: absentCut > 0 ? 700 : 400 }}>
                      {absentCut > 0 ? `-${formatCurrency(absentCut)}` : 'Rs. 0'}
                    </td>

                    {/* Late Fine */}
                    <td style={{ color: lateFine > 0 ? '#f59e0b' : theme.TEXT_SECONDARY, fontWeight: lateFine > 0 ? 700 : 400 }}>
                      {lateFine > 0 ? `-${formatCurrency(lateFine)}` : 'Rs. 0'}
                    </td>

                    {/* Other Deductions */}
                    <td style={{ color: otherDeds > 0 ? '#ef4444' : theme.TEXT_SECONDARY, fontWeight: otherDeds > 0 ? 600 : 400 }}>
                      {otherDeds > 0 ? `-${formatCurrency(otherDeds)}` : 'Rs. 0'}
                    </td>

                    {/* Net Payable */}
                    <td style={{ fontWeight: 800, color: theme.ACCENT, fontSize: '0.95rem' }}>
                      {formatCurrency(gen.netSalary)}
                    </td>

                    <td>
                      <StatusBadge $generated={gen.isGeneratedInDb}>
                        {gen.isGeneratedInDb ? 'GENERATED' : 'NOT GENERATED'}
                      </StatusBadge>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {gen.isGeneratedInDb ? (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <CheckIcon style={{ fontSize: 16 }} /> Generated
                          </span>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleGenerateSingle(gen.staffId)}
                            disabled={generating}
                            style={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                          >
                            Generate
                          </Button>
                        )}

                        <IconButton size="small" onClick={() => setViewPayslipGen(gen)} title="View Payslip Breakdown">
                          <ReceiptIcon fontSize="small" />
                        </IconButton>

                        {gen.isGeneratedInDb && gen.paidAmount === 0 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteSingleGeneration(gen.id, gen.staff?.name)}
                            title="Delete Generated Payroll (No Payment Made)"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </TableCard>

      {/* Salary Statement Dialog */}
      <SalaryStatementDialog
        open={!!viewPayslipGen}
        generation={viewPayslipGen}
        onClose={() => setViewPayslipGen(null)}
      />
    </Container>
  );
};

export default PayrollGenerator;
