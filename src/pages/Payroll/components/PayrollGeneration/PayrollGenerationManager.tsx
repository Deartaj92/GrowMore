import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { supabase } from '../../../../supabaseClient';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  LinearProgress,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Collapse,
  InputAdornment,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import { PayrollGeneration } from '../../../../types/payroll';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100%;
`;

const Header = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
`;

const ControlsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  overflow: hidden;
`;

const StyledTable = styled(Table)`
  & .MuiTableCell-root {
    padding: 8px 12px;
    font-size: 0.875rem;
  }
  
  & .MuiTableCell-head {
    font-weight: 600;
    font-size: 0.8rem;
    background: ${({ theme }) => theme.BG};
  }
`;

const ProgressDialog = styled(Dialog)`
  & .MuiDialog-paper {
    min-width: 400px;
  }
`;

const CalculationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  backdrop-filter: blur(2px);
`;

const CalculationCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 32px;
  min-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const CalculationTitle = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
  font-size: 1.25rem;
  margin-bottom: 16px;
  text-align: center;
`;

const ProgressText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.875rem;
  margin-top: 12px;
  text-align: center;
`;

interface EligibleStaff {
  staffId: number;
  staffName: string;
  staffRole: string;
  planId: number;
  planName: string;
  basicPay: number;
  hasExistingGeneration: boolean;
  existingGenerationId?: number;
}

interface PreviewData {
  staffName: string;
  planName: string;
  grossSalary: number;
  allowances: number;
  deductions: number;
  leaveDeductions: number;
  lateDeductions: number;
  advanceDeductions: number;
  adjustments: number;
  absentDeductions?: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  lateDays: number;
}

const PayrollGenerationManager: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Set<number>>(new Set());
  const [generations, setGenerations] = useState<PayrollGeneration[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [salaryBreakdowns, setSalaryBreakdowns] = useState<Map<number, PreviewData>>(new Map());
  const [loadingBreakdowns, setLoadingBreakdowns] = useState<Set<number>>(new Set());
  const [progressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [calculationMode, setCalculationMode] = useState<'full' | 'partial'>('full');
  const [calculationModes, setCalculationModes] = useState<Map<number, 'full' | 'partial'>>(new Map());
  const [calculatingAmounts, setCalculatingAmounts] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    if (user?.school_id) {
      // Clear cached breakdowns when month/year or calculation mode changes
      setSalaryBreakdowns(new Map());
      setExpandedRows(new Set());
      setCalculationModes(new Map()); // Reset per-employee modes when month/year changes
      loadEligibleStaff();
      loadGenerations();
    }
  }, [user?.school_id, selectedMonth, selectedYear, calculationMode]);

  // Auto-calculate salaries for all eligible staff when they load or when month/year/mode changes
  useEffect(() => {
    if (eligibleStaff.length > 0 && user?.school_id) {
      // Clear existing breakdowns
      setSalaryBreakdowns(new Map());
      setCalculatingAmounts(true);
      setCalculationProgress({ current: 0, total: eligibleStaff.length });
      
      // Calculate breakdowns for all eligible staff automatically
      eligibleStaff.forEach((staff, index) => {
        // Add small delay to prevent overwhelming the API
        setTimeout(() => {
          loadSalaryBreakdown(staff.staffId, eligibleStaff.length);
        }, index * 50);
      });
    } else {
      setCalculatingAmounts(false);
      setCalculationProgress({ current: 0, total: 0 });
    }
  }, [eligibleStaff, selectedMonth, selectedYear, calculationMode, calculationModes, user?.school_id]);

  const loadEligibleStaff = async () => {
    if (!user?.school_id) return;
    
    try {
      setLoading(true);
      const staff = await payrollService.getStaffEligibleForPayroll(
        user.school_id,
        selectedMonth,
        selectedYear
      );
      setEligibleStaff(staff);
    } catch (error: any) {
      console.error('Error loading eligible staff:', error);
      showToast('Failed to load eligible staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadGenerations = async () => {
    if (!user?.school_id) return;
    
    try {
      const data = await payrollService.getPayrollGenerations(user.school_id, {
        payrollMonth: selectedMonth,
        payrollYear: selectedYear,
      });
      setGenerations(data);
    } catch (error: any) {
      console.error('Error loading generations:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedStaff.size === eligibleStaff.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(eligibleStaff.map(s => s.staffId)));
    }
  };

  const handleSelectStaff = (staffId: number) => {
    const newSelected = new Set(selectedStaff);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedStaff(newSelected);
  };

  const toggleExpand = (staffId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(staffId)) {
      newExpanded.delete(staffId);
    } else {
      newExpanded.add(staffId);
      // Load breakdown if not already loaded
      if (!salaryBreakdowns.has(staffId)) {
        loadSalaryBreakdown(staffId);
      }
    }
    setExpandedRows(newExpanded);
  };

  const loadSalaryBreakdown = async (staffId: number, totalCount?: number) => {
    if (!user?.school_id) return;
    
    setLoadingBreakdowns(prev => new Set(prev).add(staffId));
    
    try {
      const staff = eligibleStaff.find(s => s.staffId === staffId);
      if (!staff) {
        showToast('Staff not found', 'error');
        return;
      }

      // Get settings
      const settings = await payrollService.getPayrollSettings(user.school_id);
      if (!settings) {
        showToast('Payroll settings not configured', 'error');
        return;
      }

      // Get plan
      const plan = await payrollService.getPayrollPlan(user.school_id, staff.planId);
      if (!plan) {
        showToast('Payroll plan not found', 'error');
        return;
      }

      // Get attendance summary
      // Calculate correct date range for the selected month and year (selectedMonth is 1-12)
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      // Use same approach as StaffAttendanceReport: get days in month and format end date
      const daysInMonth = getDaysInMonth(parseISO(startDate));
      const endDate = format(new Date(parseISO(startDate).getFullYear(), parseISO(startDate).getMonth(), daysInMonth), 'yyyy-MM-dd');
      
      // Verify we're fetching for the correct month/year
      console.log(`Fetching attendance for staff ${staffId}, month ${selectedMonth}/${selectedYear}: ${startDate} to ${endDate}`);
      
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .single();
      
      if (!sessionData) {
        showToast('No active session found', 'error');
        return;
      }

      // Fetch attendance records for the selected month and year only
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance_records')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('staff_id', staffId)
        .eq('session_id', sessionData.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        showToast('Error fetching attendance data', 'error');
        return;
      }

      const attendanceRecords = (attendanceData || []).map(ar => ({
        status: ar.status,
        date: ar.date,
      }));

      // Fetch half leaves for the selected month and year
      const { data: halfLeavesData } = await supabase
        .from('half_leaves')
        .select('date, leave_type')
        .eq('person_type', 'staff')
        .eq('person_id', staffId)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id)
        .gte('date', startDate)
        .lte('date', endDate);

      const halfLeavesMap = new Map<string, 'first_half' | 'second_half'>();
      (halfLeavesData || []).forEach((hl: any) => {
        halfLeavesMap.set(hl.date, hl.leave_type);
      });

      // Get calculation mode for this staff (use per-employee mode if set, otherwise global mode)
      const staffCalculationMode = calculationModes.get(staffId) || calculationMode;

      // Use monthlyWorkingDays from settings (not calculated)
      // This matches how employee profile counts attendance
      const { getAttendanceSummary } = await import('../../../../utils/payrollCalculations');
        const attendanceSummary = getAttendanceSummary(
        attendanceRecords,
        settings.monthlyWorkingDays,
        halfLeavesMap,
        staffCalculationMode
      );

      // Get advances and adjustments
      const advances = await payrollService.getAdvances(user.school_id, staffId, true);
      const adjustments = await payrollService.getAdjustments(user.school_id, {
        staffId,
        payrollMonth: selectedMonth,
        payrollYear: selectedYear,
      });
      const unappliedAdjustments = adjustments.filter(adj => !adj.isApplied);

      // Calculate breakdown with calculation mode
      const { calculateSalaryBreakdown } = await import('../../../../utils/payrollCalculations');
      const breakdown = calculateSalaryBreakdown(
        plan,
        plan.items || [],
        attendanceSummary,
        settings.allowedLeavesPerMonth,
        settings.leaveDeductionMethod,
        advances.filter(a => a.status === 'active'),
        unappliedAdjustments,
        settings.lateDeductionEnabled || false,
        settings.allowedLateDaysPerMonth || 0,
        settings.lateDeductionAmount || 0,
        settings.lateDeductionType || 'fixed',
        staffCalculationMode
      );

      const breakdownData: PreviewData = {
        staffName: staff.staffName,
        planName: staff.planName,
        grossSalary: breakdown.grossSalary,
        allowances: breakdown.allowances.reduce((sum, a) => sum + a.amount, 0),
        deductions: breakdown.deductions.reduce((sum, d) => sum + d.amount, 0),
        leaveDeductions: breakdown.leaveDeductions,
        lateDeductions: breakdown.lateDeductions,
        advanceDeductions: breakdown.advanceDeductions,
        adjustments: breakdown.adjustments.reduce((sum, adj) => sum + adj.amount, 0),
        absentDeductions: breakdown.absentDeductions || 0,
        netSalary: breakdown.netSalary,
        workingDays: attendanceSummary.workingDays,
        presentDays: attendanceSummary.presentDays,
        leaveDays: attendanceSummary.leaveDays,
        absentDays: attendanceSummary.absentDays,
        lateDays: attendanceSummary.lateDays,
      };
      
      setSalaryBreakdowns(prev => new Map(prev).set(staffId, breakdownData));
    } catch (error: any) {
      console.error('Error loading salary breakdown:', error);
      showToast(error.message || 'Failed to load salary breakdown', 'error');
    } finally {
      setLoadingBreakdowns(prev => {
        const newSet = new Set(prev);
        newSet.delete(staffId);
        
        // Update calculation progress based on completed count
        if (totalCount !== undefined) {
          const completed = totalCount - newSet.size;
          setCalculationProgress({ current: completed, total: totalCount });
          
          // If all calculations are done, hide the loading
          if (newSet.size === 0 && completed >= totalCount) {
            setTimeout(() => {
              setCalculatingAmounts(false);
            }, 300);
          }
        } else if (newSet.size === 0 && calculatingAmounts) {
          // If no total count provided but all calculations are done, hide loading
          setCalculatingAmounts(false);
        }
        
        return newSet;
      });
    }
  };

  const handleGenerate = async () => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    if (selectedStaff.size === 0) {
      showToast('Please select at least one employee', 'error');
      return;
    }

    setGenerating(true);
    setProgressOpen(true);
    setProgress({ current: 0, total: selectedStaff.size, message: 'Starting generation...' });

    const staffArray = Array.from(selectedStaff);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < staffArray.length; i++) {
        const staffId = staffArray[i];
        const staff = eligibleStaff.find(s => s.staffId === staffId);
        
        setProgress({
          current: i + 1,
          total: staffArray.length,
          message: `Generating payroll for ${staff?.staffName || 'employee'}...`,
        });

        try {
          // Get calculation mode for this staff (use per-employee mode if set, otherwise global mode)
          const staffCalculationMode = calculationModes.get(staffId) || calculationMode;
          
          await payrollService.generatePayroll(
            user.school_id,
            staffId,
            selectedMonth,
            selectedYear,
            user.id,
            staffCalculationMode
          );
          successCount++;
        } catch (error: any) {
          console.error(`Error generating payroll for staff ${staffId}:`, error);
          errorCount++;
        }

        // Small delay to allow UI update
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      showToast(
        `Payroll generation completed: ${successCount} successful, ${errorCount} failed`,
        successCount > 0 ? 'success' : 'error'
      );
      
      setSelectedStaff(new Set());
      await loadEligibleStaff();
      await loadGenerations();
    } catch (error: any) {
      console.error('Error in bulk generation:', error);
      showToast('Error during payroll generation', 'error');
    } finally {
      setGenerating(false);
      setProgressOpen(false);
    }
  };

  const handleApprove = async (generationId: number) => {
    if (!user?.school_id || !user?.id) return;
    
    try {
      await payrollService.approvePayroll(user.school_id, generationId, user.id);
      showToast('Payroll approved successfully', 'success');
      await loadGenerations();
    } catch (error: any) {
      showToast(error.message || 'Failed to approve payroll', 'error');
    }
  };

  const handleReject = async (generationId: number) => {
    if (!user?.school_id || !user?.id) return;
    
    try {
      await payrollService.rejectPayroll(user.school_id, generationId, user.id);
      showToast('Payroll rejected successfully', 'success');
      await loadGenerations();
    } catch (error: any) {
      showToast(error.message || 'Failed to reject payroll', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'paid': return 'info';
      case 'cancelled': return 'error';
      default: return 'warning';
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'Rs. 0.00';
    }
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter eligible staff based on search query
  const filteredStaff = eligibleStaff.filter(staff => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      staff.staffName.toLowerCase().includes(query) ||
      staff.staffRole.toLowerCase().includes(query) ||
      staff.planName.toLowerCase().includes(query)
    );
  });

  return (
    <PageContainer>
      <Header>
        <Title>Generate Payroll</Title>
      </Header>

      <ControlsCard>
        <Box display="flex" gap={2} alignItems="flex-end" flexWrap="wrap">
          <FormControl size="small" style={{ minWidth: 150 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value as number)}
              label="Month"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <MenuItem key={month} value={month}>
                  {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" style={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value as number)}
              label="Year"
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" style={{ minWidth: 120 }}>
            <InputLabel>Mode</InputLabel>
            <Select
              value={calculationMode}
              onChange={(e) => {
                setCalculationMode(e.target.value as 'full' | 'partial');
                // Clear all breakdowns when mode changes
                setSalaryBreakdowns(new Map());
                setExpandedRows(new Set());
              }}
              label="Mode"
            >
              <MenuItem value="full">Full</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: theme.TEXT_SECONDARY }} />
                </InputAdornment>
              ),
            }}
            style={{
              minWidth: 250,
            }}
          />

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadEligibleStaff();
              loadGenerations();
            }}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={generating ? <CircularProgress size={16} /> : <CalculateIcon />}
            onClick={handleGenerate}
            disabled={generating || selectedStaff.size === 0}
          >
            {generating ? 'Generating...' : `Generate (${selectedStaff.size})`}
          </Button>
        </Box>
      </ControlsCard>

      {calculatingAmounts && (
        <CalculationOverlay>
          <CalculationCard theme={theme}>
            <CalculationTitle theme={theme}>
              Calculating Amounts...
            </CalculationTitle>
            <LinearProgress 
              variant="determinate" 
              value={calculationProgress.total > 0 ? (calculationProgress.current / calculationProgress.total) * 100 : 0}
              style={{ height: 8, borderRadius: 4 }}
            />
            <ProgressText theme={theme}>
              {calculationProgress.current} of {calculationProgress.total} employees
            </ProgressText>
          </CalculationCard>
        </CalculationOverlay>
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          <TableContainer>
            <StyledTable>
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: '40px' }}></TableCell>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={eligibleStaff.length > 0 && selectedStaff.size === eligibleStaff.length}
                      indeterminate={selectedStaff.size > 0 && selectedStaff.size < eligibleStaff.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Payroll Plan</TableCell>
                  <TableCell align="right">Salary</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eligibleStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" style={{ padding: '32px' }}>
                      <Typography color={theme.TEXT_SECONDARY}>
                        No employees with active payroll plans found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff) => {
                    const isSelected = selectedStaff.has(staff.staffId);
                    const generation = generations.find(g => g.staffId === staff.staffId);
                    const isExpanded = expandedRows.has(staff.staffId);
                    const breakdown = salaryBreakdowns.get(staff.staffId);
                    const isLoadingBreakdown = loadingBreakdowns.has(staff.staffId);
                    
                    return (
                      <React.Fragment key={staff.staffId}>
                        <TableRow 
                          hover 
                          onClick={() => toggleExpand(staff.staffId)}
                          style={{ cursor: 'pointer' }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(staff.staffId);
                              }}
                              style={{ padding: '4px' }}
                            >
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelectStaff(staff.staffId)}
                            />
                          </TableCell>
                          <TableCell>{staff.staffName}</TableCell>
                          <TableCell>{staff.staffRole}</TableCell>
                          <TableCell>{staff.planName}</TableCell>
                        <TableCell align="right" style={{ fontWeight: 600, color: theme.ACCENT }}>
                          {(() => {
                            // Priority: generation net salary > breakdown net salary > basic pay
                            if (generation) {
                              return formatCurrency(generation.netSalary);
                            }
                            const breakdown = salaryBreakdowns.get(staff.staffId);
                            if (breakdown) {
                              return formatCurrency(breakdown.netSalary);
                            }
                            return formatCurrency(staff.basicPay || 0);
                          })()}
                        </TableCell>
                          <TableCell>
                            {generation ? (
                              <Chip
                                label={generation.status}
                                size="small"
                                color={getStatusColor(generation.status) as any}
                              />
                            ) : (
                              <Chip label="Not Generated" size="small" color="default" />
                            )}
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <FormControl size="small" style={{ minWidth: 100 }}>
                              <Select
                                value={calculationModes.get(staff.staffId) || calculationMode}
                                onChange={(e) => {
                                  const newModes = new Map(calculationModes);
                                  newModes.set(staff.staffId, e.target.value as 'full' | 'partial');
                                  setCalculationModes(newModes);
                                  // Clear and recalculate breakdown for this staff
                                  const newBreakdowns = new Map(salaryBreakdowns);
                                  newBreakdowns.delete(staff.staffId);
                                  setSalaryBreakdowns(newBreakdowns);
                                  // Recalculate immediately
                                  loadSalaryBreakdown(staff.staffId);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: '0.875rem' }}
                              >
                                <MenuItem value="full">Full</MenuItem>
                                <MenuItem value="partial">Partial</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ padding: '16px' }}>
                                {isLoadingBreakdown ? (
                                  <Box display="flex" justifyContent="center" padding={2}>
                                    <CircularProgress size={24} />
                                  </Box>
                                ) : breakdown ? (
                                  <Box>
                                    <Typography variant="subtitle2" style={{ marginBottom: '12px', fontWeight: 600, color: theme.TEXT_PRIMARY }}>
                                      Salary Breakdown
                                    </Typography>
                                    <Box display="flex" flexDirection="column" gap={1}>
                                      <Box display="flex" justifyContent="space-between" padding="4px 0">
                                        <Typography variant="body2">Working Days:</Typography>
                                        <Typography variant="body2" style={{ color: '#6366f1' }}>{breakdown.workingDays}</Typography>
                                      </Box>
                                      <Box display="flex" justifyContent="space-between" padding="4px 0">
                                        <Typography variant="body2">Present Days:</Typography>
                                        <Typography variant="body2" style={{ color: '#10b981' }}>{breakdown.presentDays}</Typography>
                                      </Box>
                                      <Box display="flex" justifyContent="space-between" padding="4px 0">
                                        <Typography variant="body2">Leave Days:</Typography>
                                        <Typography variant="body2" style={{ color: '#3b82f6' }}>{breakdown.leaveDays}</Typography>
                                      </Box>
                                      <Box display="flex" justifyContent="space-between" padding="4px 0">
                                        <Typography variant="body2">Absent Days:</Typography>
                                        <Typography variant="body2" style={{ color: '#ef4444' }}>{breakdown.absentDays}</Typography>
                                      </Box>
                                      {breakdown.lateDays > 0 && (
                                        <Box display="flex" justifyContent="space-between" padding="4px 0">
                                          <Typography variant="body2">Late Days:</Typography>
                                          <Typography variant="body2" style={{ color: '#f59e0b' }}>{breakdown.lateDays}</Typography>
                                        </Box>
                                      )}
                                      <Divider style={{ margin: '8px 0' }} />
                                      <Box display="flex" justifyContent="space-between" padding="4px 0">
                                        <Typography variant="body2">Gross Salary:</Typography>
                                        <Typography variant="body2" fontWeight={600}>{formatCurrency(breakdown.grossSalary)}</Typography>
                                      </Box>
                                      {breakdown.absentDeductions && breakdown.absentDeductions > 0 && (
                                        <Box display="flex" justifyContent="space-between" padding="4px 0">
                                          <Typography variant="body2">Absent Deductions:</Typography>
                                          <Typography variant="body2" color="error.main">-{formatCurrency(breakdown.absentDeductions)}</Typography>
                                        </Box>
                                      )}
                                      {breakdown.leaveDeductions > 0 && (
                                        <Box display="flex" justifyContent="space-between" padding="4px 0">
                                          <Typography variant="body2">Leave Deductions:</Typography>
                                          <Typography variant="body2" color="error.main">-{formatCurrency(breakdown.leaveDeductions)}</Typography>
                                        </Box>
                                      )}
                                      {breakdown.lateDeductions > 0 && (
                                        <Box display="flex" justifyContent="space-between" padding="4px 0">
                                          <Typography variant="body2">Late Deductions:</Typography>
                                          <Typography variant="body2" color="error.main">-{formatCurrency(breakdown.lateDeductions)}</Typography>
                                        </Box>
                                      )}
                                      {breakdown.advanceDeductions > 0 && (
                                        <Box display="flex" justifyContent="space-between" padding="4px 0">
                                          <Typography variant="body2">Advance Deductions:</Typography>
                                          <Typography variant="body2" color="error.main">-{formatCurrency(breakdown.advanceDeductions)}</Typography>
                                        </Box>
                                      )}
                                      {breakdown.adjustments !== 0 && (
                                        <Box display="flex" justifyContent="space-between" padding="4px 0">
                                          <Typography variant="body2">Adjustments:</Typography>
                                          <Typography variant="body2" color={breakdown.adjustments > 0 ? 'success.main' : 'error.main'}>
                                            {breakdown.adjustments > 0 ? '+' : ''}{formatCurrency(breakdown.adjustments)}
                                          </Typography>
                                        </Box>
                                      )}
                                      <Divider style={{ margin: '8px 0' }} />
                                      <Box display="flex" justifyContent="space-between" padding="4px 0">
                                        <Typography variant="body2" fontWeight={600}>Net Salary:</Typography>
                                        <Typography variant="body2" fontWeight={700} color="primary">
                                          {formatCurrency(breakdown.netSalary)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color={theme.TEXT_SECONDARY} style={{ padding: '16px', textAlign: 'center' }}>
                                    Click to expand and view salary breakdown
                                  </Typography>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </StyledTable>
          </TableContainer>
        </>
      )}


      <ProgressDialog open={progressOpen}>
        <DialogTitle>Generating Payroll</DialogTitle>
        <DialogContent>
          <Box padding={2}>
            <Typography variant="body2" color={theme.TEXT_SECONDARY} gutterBottom>
              {progress.message}
            </Typography>
            <Box marginTop={2}>
              <Typography variant="body2" color={theme.TEXT_SECONDARY}>
                Progress: {progress.current} / {progress.total}
              </Typography>
              <Box marginTop={1}>
                <div style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: theme.BORDER,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                    height: '100%',
                    backgroundColor: theme.ACCENT,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </ProgressDialog>
    </PageContainer>
  );
};

export default PayrollGenerationManager;
