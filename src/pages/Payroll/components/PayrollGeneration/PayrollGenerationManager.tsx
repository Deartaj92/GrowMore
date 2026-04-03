import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { supabase } from '../../../../supabaseClient';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl as MuiFormControl,
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
  DeleteOutline as DeleteOutlineIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import { PayrollGeneration } from '../../../../types/payroll';
import { usePayrollDisplaySettings } from '../../PayrollDisplaySettingsContext';
import { formatPayrollCurrency } from '../../utils';
import {
  PayrollContainer,
  ContentCard,
  TableWrapper,
  StyledTable as SharedStyledTable,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
} from '../../styles';

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
  
  @media (max-width: 768px) {
    padding: 20px;
    min-width: 280px;
    max-width: 90vw;
    border-radius: 8px;
  }
`;

const CalculationTitle = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
  font-size: 1.25rem;
  margin-bottom: 16px;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 12px;
  }
`;

const ProgressText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.875rem;
  margin-top: 12px;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 0.8125rem;
    margin-top: 8px;
  }
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
  leaveBonusAmount?: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  lateDays: number;
}

const defaultPayrollPeriod = (() => {
  const now = new Date();
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    month: previousMonthDate.getMonth() + 1,
    year: previousMonthDate.getFullYear(),
  };
})();

const PayrollGenerationManager: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { roundUpAmounts, formatCurrency } = usePayrollDisplaySettings();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(defaultPayrollPeriod.month);
  const [selectedYear, setSelectedYear] = useState(defaultPayrollPeriod.year);
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [generations, setGenerations] = useState<PayrollGeneration[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [salaryBreakdowns, setSalaryBreakdowns] = useState<Map<string, PreviewData>>(new Map());
  const [loadingBreakdowns, setLoadingBreakdowns] = useState<Set<string>>(new Set());
  const [progressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [calculationMode, setCalculationMode] = useState<'full' | 'partial'>('full');
  const [calculationModes, setCalculationModes] = useState<Map<string, 'full' | 'partial'>>(new Map());
  const [calculatingAmounts, setCalculatingAmounts] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [includeLeaveBonus, setIncludeLeaveBonus] = useState<boolean>(true);
  const [payrollSettings, setPayrollSettings] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

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

  // Load payroll settings
  useEffect(() => {
    if (user?.school_id) {
      loadPayrollSettings();
    }
  }, [user?.school_id]);

  const loadPayrollSettings = async () => {
    if (!user?.school_id) return;
    try {
      const settings = await payrollService.getPayrollSettings(user.school_id);
      setPayrollSettings(settings);
      // Set default includeLeaveBonus based on settings
      if (settings?.allowLeaveBonus) {
        setIncludeLeaveBonus(true);
      }
    } catch (error) {
      console.error('Error loading payroll settings:', error);
    }
  };

  // Auto-calculate salaries for all eligible staff when they load or when month/year/mode changes
  useEffect(() => {
    if (eligibleStaff.length > 0 && user?.school_id) {
      // Clear existing breakdowns
      setSalaryBreakdowns(new Map());
      setExpandedRows(new Set());
      setCalculatingAmounts(true);
      setCalculationProgress({ current: 0, total: eligibleStaff.length });
      
      // Calculate breakdowns for all eligible staff automatically
      // Use a copy of eligibleStaff to avoid stale closure issues
      const staffToProcess = [...eligibleStaff];
      staffToProcess.forEach((staff, index) => {
        // Add small delay to prevent overwhelming the API
        setTimeout(() => {
          loadSalaryBreakdown(staff.staffId, staff.planId, staffToProcess.length);
        }, index * 50);
      });
    } else {
      setCalculatingAmounts(false);
      setCalculationProgress({ current: 0, total: 0 });
    }
  }, [eligibleStaff, selectedMonth, selectedYear, calculationMode, calculationModes, includeLeaveBonus, user?.school_id]);

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
      setSelectedStaff(new Set(eligibleStaff.map(s => `${s.staffId}-${s.planId}`)));
    }
  };

  const handleSelectStaff = (staffPlanKey: string) => {
    const newSelected = new Set(selectedStaff);
    if (newSelected.has(staffPlanKey)) {
      newSelected.delete(staffPlanKey);
    } else {
      newSelected.add(staffPlanKey);
    }
    setSelectedStaff(newSelected);
  };

  const toggleExpand = (staffPlanKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(staffPlanKey)) {
      newExpanded.delete(staffPlanKey);
    } else {
      newExpanded.add(staffPlanKey);
      // Load breakdown if not already loaded
      if (!salaryBreakdowns.has(staffPlanKey)) {
        const [staffId, planId] = staffPlanKey.split('-').map(Number);
        loadSalaryBreakdown(staffId, planId);
      }
    }
    setExpandedRows(newExpanded);
  };

  const loadSalaryBreakdown = async (staffId: number, planId: number, totalCount?: number) => {
    if (!user?.school_id) return;
    
    const staffPlanKey = `${staffId}-${planId}`;
    setLoadingBreakdowns(prev => new Set(prev).add(staffPlanKey));
    
    try {
      // Get staff info from eligibleStaff first - this is more reliable
      let staff = eligibleStaff.find(s => s.staffId === staffId && s.planId === planId);
      let currentEligibleStaff = eligibleStaff;
      
      // If not found in eligibleStaff, try to reload (in case a new plan was just created)
      if (!staff) {
        console.log(`Staff plan ${staffPlanKey} not found in eligibleStaff, reloading...`);
        try {
          const refreshedStaff = await payrollService.getStaffEligibleForPayroll(
            user.school_id,
            selectedMonth,
            selectedYear
          );
          // Update eligibleStaff state
          setEligibleStaff(refreshedStaff);
          // Use the refreshed data directly (don't rely on state update)
          currentEligibleStaff = refreshedStaff;
          // Try to find again in the refreshed data
          staff = refreshedStaff.find(s => s.staffId === staffId && s.planId === planId);
        } catch (error) {
          console.error('Error reloading eligible staff:', error);
        }
      }
      
      if (!staff) {
        console.error(`Staff plan ${staffPlanKey} not found after reload. Available plans:`, 
          currentEligibleStaff.map(s => `${s.staffId}-${s.planId}`).join(', '));
        // Don't show error toast - just silently fail and show as "not generated"
        // This allows new plans to appear in the list even if they can't be loaded yet
        return;
      }

      // Get settings
      const settings = await payrollService.getPayrollSettings(user.school_id);
      if (!settings) {
        showToast('Payroll settings not configured', 'error');
        return;
      }

      // Try to get the plan - handle errors gracefully, especially 406 errors
      let plan: any = null;
      let planFetchError: any = null;
      
      try {
        plan = await payrollService.getPayrollPlan(user.school_id, planId);
      } catch (error: any) {
        planFetchError = error;
        console.error(`Error fetching plan ${planId}:`, error);
        
        // If we get a 406 (Not Acceptable) or other error, try to fetch plan items separately
        // and construct a minimal plan object from staff data
        if (staff) {
          let planItems: any[] = [];
          try {
            // Try to fetch plan items directly (this might work even if the full plan query fails)
            planItems = await payrollService.getPayrollPlanItems(user.school_id, planId);
          } catch (itemsError) {
            console.error(`Error fetching plan items for plan ${planId}:`, itemsError);
            // Continue with empty items - basic salary calculation will still work
          }
          
          // Create a minimal plan object from staff data
          plan = {
            id: staff.planId,
            name: staff.planName,
            basicPay: staff.basicPay,
            staffId: staff.staffId,
            items: planItems,
            status: 'active',
            effectiveFrom: null,
            effectiveTo: null,
          };
        } else {
          // Can't proceed without plan or staff info
          return;
        }
      }
      
      if (!plan) {
        console.error(`Plan ${planId} not found`);
        return;
      }
      
      // Verify the plan belongs to the correct staff
      if (plan.staffId && plan.staffId !== staffId) {
        console.error(`Plan ${planId} does not belong to staff ${staffId}`);
        return;
      }
      
      // If plan was successfully fetched but doesn't have items, try to fetch them
      if (!planFetchError && (!plan.items || plan.items.length === 0)) {
        try {
          const planItems = await payrollService.getPayrollPlanItems(user.school_id, planId);
          plan.items = planItems;
        } catch (error) {
          console.error(`Error fetching plan items for plan ${planId}:`, error);
          // Continue with empty items - basic salary calculation will still work
          plan.items = plan.items || [];
        }
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
        paidLeave: !!ar.paid_leave,
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

      // Get calculation mode for this staff plan (use per-employee mode if set, otherwise global mode)
      const staffCalculationMode = calculationModes.get(staffPlanKey) || calculationMode;

      // Use monthlyWorkingDays from settings (not calculated)
      // This matches how employee profile counts attendance
      const { getAttendanceSummary, getAttendanceRecordSummary } = await import('../../../../utils/payrollCalculations');
      const attendanceSummary = getAttendanceSummary(
        attendanceRecords,
        settings.monthlyWorkingDays,
        halfLeavesMap,
        staffCalculationMode
      );
      const attendanceRecordSummary = getAttendanceRecordSummary(
        attendanceRecords,
        settings.monthlyWorkingDays,
        halfLeavesMap
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
        staffCalculationMode,
        includeLeaveBonus && settings.allowLeaveBonus ? settings.leaveBonusDays : 0
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
        leaveBonusAmount: breakdown.leaveBonusAmount,
        netSalary: breakdown.netSalary,
        workingDays: attendanceRecordSummary.workingDays,
        presentDays: attendanceRecordSummary.presentDays,
        leaveDays: attendanceRecordSummary.leaveDays,
        absentDays: attendanceRecordSummary.absentDays,
        lateDays: attendanceRecordSummary.lateDays,
      };
      
      setSalaryBreakdowns(prev => new Map(prev).set(staffPlanKey, breakdownData));
    } catch (error: any) {
      console.error('Error loading salary breakdown:', error);
      showToast(error.message || 'Failed to load salary breakdown', 'error');
    } finally {
      setLoadingBreakdowns(prev => {
        const newSet = new Set(prev);
        newSet.delete(staffPlanKey);
        
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

    // Check if any selected staff has a payroll with payments for the selected month/year (parallelized)
    const staffArray = Array.from(selectedStaff);
    const paymentChecks = staffArray.map(staffPlanKey => {
      const [staffId] = staffPlanKey.split('-').map(Number);
      return payrollService.hasPayrollWithPaymentsForMonth(
        user.school_id,
        staffId,
        selectedMonth,
        selectedYear
      ).then(hasPayments => ({ staffPlanKey, staffId, hasPayments }));
    });

    const paymentCheckResults = await Promise.all(paymentChecks);
    const staffWithPayments: string[] = [];

    paymentCheckResults.forEach(({ staffPlanKey, staffId, hasPayments }) => {
      if (hasPayments) {
        const staff = eligibleStaff.find(s => `${s.staffId}-${s.planId}` === staffPlanKey);
        staffWithPayments.push(staff?.staffName || `Employee ${staffId}`);
      }
    });

    if (staffWithPayments.length > 0) {
      showToast(
        `Cannot regenerate payroll. Payments have been made for: ${staffWithPayments.join(', ')}`,
        'error'
      );
      return;
    }

    setGenerating(true);
    setProgressOpen(true);
    setProgress({ current: 0, total: selectedStaff.size, message: 'Starting generation...' });

    let successCount = 0;
    let errorCount = 0;

    // Process payroll generation in parallel batches (5 at a time for optimal performance)
    const BATCH_SIZE = 5;
    
    try {
      for (let i = 0; i < staffArray.length; i += BATCH_SIZE) {
        const batch = staffArray.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (staffPlanKey, batchIndex) => {
          const [staffId, planId] = staffPlanKey.split('-').map(Number);
          const staff = eligibleStaff.find(s => s.staffId === staffId && s.planId === planId);
          const globalIndex = i + batchIndex;
          
          setProgress({
            current: globalIndex + 1,
            total: staffArray.length,
            message: `Generating payroll for ${staff?.staffName || 'employee'}...`,
          });

          try {
            // Get calculation mode for this staff plan (use per-employee mode if set, otherwise global mode)
            const staffCalculationMode = calculationModes.get(staffPlanKey) || calculationMode;
            
            // Update generatePayroll to accept planId - we'll need to modify the service function
            // For now, we'll use the planId from the staff object
            await payrollService.generatePayroll(
              user.school_id,
              staffId,
              selectedMonth,
              selectedYear,
              user.id,
              staffCalculationMode,
              includeLeaveBonus && payrollSettings?.allowLeaveBonus ? payrollSettings.leaveBonusDays : 0,
              planId // Pass planId to use the specific plan
            );
            return { success: true, staffPlanKey };
          } catch (error: any) {
            console.error(`Error generating payroll for staff ${staffId} plan ${planId}:`, error);
            return { success: false, staffPlanKey, error };
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
        });
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

  const handleApprove = async (generation: PayrollGeneration) => {
    if (!user?.school_id || !user?.id) return;
    if (generation.status !== 'draft') return;
    
    try {
      await payrollService.approvePayroll(user.school_id, generation.id, user.id);
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

  const handleDeleteGenerations = async (generationIds: number[]) => {
    if (!user?.school_id || !user?.id) return;
    if (generationIds.length === 0) {
      showToast('Select generated payrolls to delete', 'error');
      return;
    }

    const uniqueGenerationIds = Array.from(new Set(generationIds));
    setDeleting(true);

    try {
      const deletableGenerations = generations.filter(g => uniqueGenerationIds.includes(g.id));
      const deletedNames: string[] = [];
      const skippedNames: string[] = [];

      for (const generation of deletableGenerations) {
        try {
          await payrollService.deletePayrollGeneration(user.school_id, generation.id, user.id);
          deletedNames.push(generation.staff?.name || `Payroll #${generation.id}`);
        } catch (error: any) {
          const message = String(error?.message || '').toLowerCase();
          if (message.includes('payment')) {
            skippedNames.push(generation.staff?.name || `Payroll #${generation.id}`);
            continue;
          }
          throw error;
        }
      }

      const deletedCount = deletedNames.length;
      const skippedCount = skippedNames.length;

      if (deletedCount === 0 && skippedCount > 0) {
        showToast(
          `Skipped ${skippedCount} payroll${skippedCount > 1 ? 's' : ''} because payment has already been made`,
          'error'
        );
      } else if (deletedCount > 0 && skippedCount > 0) {
        showToast(
          `Deleted ${deletedCount} payroll${deletedCount > 1 ? 's' : ''}; skipped ${skippedCount} with payments`,
          'success'
        );
      } else if (deletedCount > 0) {
        showToast(
          `Deleted ${deletedCount} payroll${deletedCount > 1 ? 's' : ''} successfully`,
          'success'
        );
      }

      const remainingSelected = Array.from(selectedStaff).filter((staffPlanKey) => {
        const [staffId, planId] = staffPlanKey.split('-').map(Number);
        const generation = generations.find(g => g.staffId === staffId && g.planId === planId);
        return generation ? !uniqueGenerationIds.includes(generation.id) : true;
      });
      setSelectedStaff(new Set(remainingSelected));

      await loadEligibleStaff();
      await loadGenerations();
    } catch (error: any) {
      console.error('Error deleting payroll generations:', error);
      showToast(error.message || 'Failed to delete payroll generation', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportGeneratedPayrolls = async () => {
    if (!selectedGeneratedPayrollIds.length) {
      showToast('Select generated payrolls to export', 'error');
      return;
    }

    const selectedGenerations = Array.from(
      new Map(
        generations
          .filter(g => selectedGeneratedPayrollIds.includes(g.id))
          .map(g => [g.id, g])
      ).values()
    ).sort((a, b) => {
      const nameA = (a.staff?.name || '').toLowerCase();
      const nameB = (b.staff?.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    if (selectedGenerations.length === 0) {
      showToast('No generated payrolls found in the current selection', 'error');
      return;
    }

    try {
      setExportingPdf(true);

      const uniqueStaffIds = Array.from(new Set(selectedGenerations.map(generation => generation.staffId)));
      const staffBalanceEntries = await Promise.all(
        uniqueStaffIds.map(async (staffId) => {
          const balances = await payrollService.getEmployeePayrollGenerationsWithBalance(user.school_id, staffId);
          return [staffId, balances] as const;
        })
      );
      const balancesByStaff = new Map(staffBalanceEntries);

      const getPresentCountFromAttendance = (generation: PayrollGeneration) => {
        const records = generation.attendanceData?.records || [];
        return records.reduce((count, record) => {
          const status = String(record.status || '').toLowerCase();
          if (status === 'present' || status === 'late') {
            return count + 1;
          }
          return count;
        }, 0);
      };

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const monthLabel = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' });
      const generatedOn = format(new Date(), 'dd-MM-yyyy hh:mm a');
      const totalGrossPayroll = selectedGenerations.reduce((sum, generation) => sum + (generation.grossSalary || generation.totalEarnings), 0);
      const totalDeductions = selectedGenerations.reduce((sum, generation) => sum + generation.totalDeductions, 0);
      const totalOldBalance = selectedGenerations.reduce((sum, generation) => {
        const balanceEntries = balancesByStaff.get(generation.staffId) || [];
        const oldBalance = balanceEntries
          .filter(({ generation: previousGeneration }) => {
            const previousPeriod = previousGeneration.payrollYear * 100 + previousGeneration.payrollMonth;
            const currentPeriod = generation.payrollYear * 100 + generation.payrollMonth;
            return previousGeneration.id !== generation.id && previousPeriod < currentPeriod;
          })
          .reduce((balanceSum, item) => balanceSum + item.remainingBalance, 0);
        return sum + oldBalance;
      }, 0);
      const totalNet = selectedGenerations.reduce((sum, generation) => {
        const balanceEntries = balancesByStaff.get(generation.staffId) || [];
        const oldBalance = balanceEntries
          .filter(({ generation: previousGeneration }) => {
            const previousPeriod = previousGeneration.payrollYear * 100 + previousGeneration.payrollMonth;
            const currentPeriod = generation.payrollYear * 100 + generation.payrollMonth;
            return previousGeneration.id !== generation.id && previousPeriod < currentPeriod;
          })
          .reduce((balanceSum, item) => balanceSum + item.remainingBalance, 0);
        return sum + generation.netSalary + oldBalance;
      }, 0);

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 297, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Payroll Register', 14, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${monthLabel} ${selectedYear}`, 14, 19);
      doc.text(`Generated: ${generatedOn}`, 230, 12);
      doc.text(`Records: ${selectedGenerations.length}`, 230, 19);

      doc.setTextColor(31, 41, 55);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(14, 33, 269, 18, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Summary', 18, 39);
      doc.setFont('helvetica', 'normal');
      doc.text(`Old Balance: ${formatPayrollCurrency(totalOldBalance, roundUpAmounts)}`, 18, 46);
      doc.text(`Gross Payroll Amount: ${formatPayrollCurrency(totalGrossPayroll, roundUpAmounts)}`, 78, 46);
      doc.text(`Deductions: ${formatPayrollCurrency(totalDeductions, roundUpAmounts)}`, 162, 46);
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(205, 35.5, 74, 13, 3, 3, 'F');
      doc.setTextColor(219, 234, 254);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('NET PAYROLL AMOUNT', 242, 39.5, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12.5);
      doc.text(formatPayrollCurrency(totalNet, roundUpAmounts), 242, 45.8, { align: 'center' });

      const tableRows = selectedGenerations.map((generation, index) => {
        const staff = eligibleStaff.find(s => s.staffId === generation.staffId && s.planId === generation.planId);
        const oldBalance = (balancesByStaff.get(generation.staffId) || [])
          .filter(({ generation: previousGeneration }) => {
            const previousPeriod = previousGeneration.payrollYear * 100 + previousGeneration.payrollMonth;
            const currentPeriod = generation.payrollYear * 100 + generation.payrollMonth;
            return previousGeneration.id !== generation.id && previousPeriod < currentPeriod;
          })
          .reduce((sum, item) => sum + item.remainingBalance, 0);

        return [
          index + 1,
          `${generation.staff?.name || staff?.staffName || '-'}\n${generation.staff?.role || staff?.staffRole || '-'}`,
          staff?.planName || generation.planSnapshot?.planName || '-',
          generation.calculationMode || 'full',
          formatPayrollCurrency(oldBalance, roundUpAmounts),
          getPresentCountFromAttendance(generation),
          generation.leaveDays || 0,
          generation.absentDays || 0,
          generation.lateDays || 0,
          formatPayrollCurrency(generation.grossSalary || generation.totalEarnings, roundUpAmounts),
          formatPayrollCurrency(generation.absentDeductions || 0, roundUpAmounts),
          formatPayrollCurrency(generation.leaveDeductions || 0, roundUpAmounts),
          formatPayrollCurrency(generation.lateDeductions || 0, roundUpAmounts),
          formatPayrollCurrency(generation.advanceDeductions || 0, roundUpAmounts),
          formatPayrollCurrency(generation.totalDeductions, roundUpAmounts),
          formatPayrollCurrency(generation.netSalary + oldBalance, roundUpAmounts),
        ];
      });

      tableRows.push([
        '',
        'TOTAL',
        '',
        '',
        formatPayrollCurrency(totalOldBalance, roundUpAmounts),
        '',
        '',
        '',
        '',
        formatPayrollCurrency(totalGrossPayroll, roundUpAmounts),
        '',
        '',
        '',
        '',
        formatPayrollCurrency(totalDeductions, roundUpAmounts),
        formatPayrollCurrency(totalNet, roundUpAmounts),
      ]);

      autoTable(doc, {
        startY: 57,
        margin: { left: 10, right: 10 },
        head: [[
          '#',
          'Employee',
          'Plan',
          'Mode',
          'Old Bal.',
          'Present',
          'Leave',
          'Absent',
          'Late',
          'Gross',
          'Absent Ded.',
          'Leave Ded.',
          'Late Ded.',
          'Advance Ded.',
          'Total Ded.',
          'Net Salary',
        ]],
        body: tableRows,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.2,
          cellPadding: 2.1,
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          textColor: [31, 41, 55],
          valign: 'middle',
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 40, halign: 'left' },
          2: { cellWidth: 24, halign: 'left' },
          3: { cellWidth: 12 },
          4: { cellWidth: 16, halign: 'right' },
          5: { cellWidth: 15 },
          6: { cellWidth: 14 },
          7: { cellWidth: 14 },
          8: { cellWidth: 12 },
          9: { cellWidth: 17, halign: 'right' },
          10: { cellWidth: 17, halign: 'right' },
          11: { cellWidth: 17, halign: 'right' },
          12: { cellWidth: 17, halign: 'right' },
          13: { cellWidth: 17, halign: 'right' },
          14: { cellWidth: 15, halign: 'right' },
          15: { cellWidth: 19, halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 15) {
            data.cell.styles.fontStyle = 'bold';
          }

          if (data.section === 'body' && data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [239, 246, 255];
            data.cell.styles.lineWidth = 0.25;
            data.cell.styles.lineColor = [147, 197, 253];
          }
        },
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Payroll export for ${monthLabel} ${selectedYear}`,
            14,
            pageHeight - 7
          );
          doc.text(
            `Page ${pageCount}`,
            pageSize.getWidth() - 14,
            pageHeight - 7,
            { align: 'right' }
          );
        },
      });

      const fileMonth = String(selectedMonth).padStart(2, '0');
      doc.save(`Payroll_Register_${selectedYear}_${fileMonth}.pdf`);
      showToast(`PDF exported for ${selectedGenerations.length} payroll${selectedGenerations.length > 1 ? 's' : ''}`, 'success');
    } catch (error: any) {
      console.error('Error exporting payroll PDF:', error);
      showToast(error.message || 'Failed to export payroll PDF', 'error');
    } finally {
      setExportingPdf(false);
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

  const selectedGeneratedPayrollIds = Array.from(selectedStaff)
    .map((staffPlanKey) => {
      const [staffId, planId] = staffPlanKey.split('-').map(Number);
      const generation = generations.find(g => g.staffId === staffId && g.planId === planId);
      return generation?.id;
    })
    .filter((generationId): generationId is number => typeof generationId === 'number');

  return (
    <PayrollContainer>
      <ContentCard style={{ padding: '0.75rem 1rem', marginBottom: '0.375rem' }}>
        <Box display="flex" gap={1} alignItems="flex-end" flexWrap="wrap" justifyContent="space-between" sx={{ 
          '@media (max-width: 768px)': { 
            gap: 0.75,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'stretch',
          } 
        }}>
          <Box display="flex" gap={1} alignItems="flex-end" flexWrap="wrap" sx={{ 
            '@media (max-width: 768px)': { 
              width: '100%',
              flexDirection: 'column',
              alignItems: 'stretch',
            } 
          }}>
            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 110 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as number)}
                label="Month"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <MenuItem key={month} value={month} sx={{ fontSize: '0.75rem' }}>
                    {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'short' })}
                  </MenuItem>
                ))}
              </Select>
            </MuiFormControl>

            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 90 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as number)}
                label="Year"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year} sx={{ fontSize: '0.75rem' }}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </MuiFormControl>

            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 90 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Mode</InputLabel>
              <Select
                value={calculationMode}
                onChange={(e) => {
                  setCalculationMode(e.target.value as 'full' | 'partial');
                  // Clear all breakdowns when mode changes
                  setSalaryBreakdowns(new Map());
                  setExpandedRows(new Set());
                }}
                label="Mode"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                <MenuItem value="full" sx={{ fontSize: '0.75rem' }}>Full</MenuItem>
                <MenuItem value="partial" sx={{ fontSize: '0.75rem' }}>Partial</MenuItem>
              </Select>
            </MuiFormControl>

            {payrollSettings?.allowLeaveBonus && (
              <MuiFormControl component="fieldset" size="small" sx={{ minWidth: { xs: '100%', sm: 'auto' } }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 0.25,
                  padding: '2px 0',
                }}>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.6875rem', 
                    color: theme.TEXT_SECONDARY,
                    fontWeight: 500,
                  }}>
                    Leave Bonus
                  </Typography>
                  <Box display="flex" gap={0.75}>
                    <Box display="flex" alignItems="center" gap={0.375}>
                      <input
                        type="radio"
                        id="include-leave-bonus-yes"
                        name="includeLeaveBonus"
                        checked={includeLeaveBonus === true}
                        onChange={() => {
                          setIncludeLeaveBonus(true);
                          setSalaryBreakdowns(new Map());
                          setExpandedRows(new Set());
                        }}
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          cursor: 'pointer',
                          accentColor: theme.ACCENT,
                        }}
                      />
                      <label 
                        htmlFor="include-leave-bonus-yes" 
                        style={{ 
                          fontSize: '0.6875rem', 
                          color: theme.TEXT_PRIMARY,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        Include
                      </label>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.375}>
                      <input
                        type="radio"
                        id="include-leave-bonus-no"
                        name="includeLeaveBonus"
                        checked={includeLeaveBonus === false}
                        onChange={() => {
                          setIncludeLeaveBonus(false);
                          setSalaryBreakdowns(new Map());
                          setExpandedRows(new Set());
                        }}
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          cursor: 'pointer',
                          accentColor: theme.ACCENT,
                        }}
                      />
                      <label 
                        htmlFor="include-leave-bonus-no" 
                        style={{ 
                          fontSize: '0.6875rem', 
                          color: theme.TEXT_PRIMARY,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        Exclude
                      </label>
                    </Box>
                  </Box>
                </Box>
              </MuiFormControl>
            )}
          </Box>

          <Box display="flex" gap={0.75} alignItems="flex-end" sx={{ 
            '@media (max-width: 768px)': { 
              width: '100%',
              flexDirection: 'column',
              alignItems: 'stretch',
            } 
          }}>
            <TextField
              size="small"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: theme.TEXT_SECONDARY, fontSize: 16 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: { xs: '100%', sm: 200 },
                '& .MuiInputBase-root': {
                  height: '30px',
                  fontSize: '0.75rem',
                },
              }}
            />

            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                loadEligibleStaff();
                loadGenerations();
              }}
              disabled={loading}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              Refresh
            </Button>

            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={generating ? <CircularProgress size={12} /> : <CalculateIcon sx={{ fontSize: 14 }} />}
              onClick={handleGenerate}
              disabled={generating || selectedStaff.size === 0}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              {generating ? 'Generating...' : `Generate (${selectedStaff.size})`}
            </Button>

            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={deleting ? <CircularProgress size={12} /> : <DeleteOutlineIcon sx={{ fontSize: 14 }} />}
              onClick={() => handleDeleteGenerations(selectedGeneratedPayrollIds)}
              disabled={deleting || generating || selectedGeneratedPayrollIds.length === 0}
              sx={{
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              {deleting ? 'Deleting...' : `Delete (${selectedGeneratedPayrollIds.length})`}
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={exportingPdf ? <CircularProgress size={12} /> : <PictureAsPdfIcon sx={{ fontSize: 14 }} />}
              onClick={handleExportGeneratedPayrolls}
              disabled={exportingPdf || generating || deleting || selectedGeneratedPayrollIds.length === 0}
              sx={{
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              {exportingPdf ? 'Exporting...' : `Export PDF (${selectedGeneratedPayrollIds.length})`}
            </Button>
          </Box>
        </Box>
      </ContentCard>

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
          <TableWrapper>
            <SharedStyledTable>
              <thead>
                <tr>
                  <th style={{ width: '32px', padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}></th>
                  <th style={{ width: '40px', padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>
                    <Checkbox
                      checked={eligibleStaff.length > 0 && selectedStaff.size === eligibleStaff.length}
                      indeterminate={selectedStaff.size > 0 && selectedStaff.size < eligibleStaff.length}
                      onChange={handleSelectAll}
                      size="small"
                      sx={{ padding: '2px' }}
                    />
                  </th>
                  <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Employee</th>
                  <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Role</th>
                  <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Payroll Plan</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Salary</th>
                  <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Mode</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {eligibleStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyStateContainer>
                        <EmptyStateIcon><CalculateIcon /></EmptyStateIcon>
                        <EmptyStateTitle>No employees with active payroll plans found</EmptyStateTitle>
                        <EmptyStateText>Create payroll plans for employees to generate payrolls.</EmptyStateText>
                      </EmptyStateContainer>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    // Use a unique key combining staffId and planId to handle multiple plans per employee
                    const staffPlanKey = `${staff.staffId}-${staff.planId}`;
                    const isSelected = selectedStaff.has(staffPlanKey);
                    const generation = generations.find(g => g.staffId === staff.staffId && g.planId === staff.planId);
                    const isExpanded = expandedRows.has(staffPlanKey);
                    const breakdown = salaryBreakdowns.get(staffPlanKey);
                    const isLoadingBreakdown = loadingBreakdowns.has(staffPlanKey);
                    
                    return (
                      <React.Fragment key={staffPlanKey}>
                        <tr 
                          onClick={() => toggleExpand(staffPlanKey)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td onClick={(e) => e.stopPropagation()} style={{ padding: '0.625rem 0.625rem' }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(staffPlanKey);
                              }}
                              style={{ padding: '2px', width: '20px', height: '20px' }}
                            >
                              {isExpanded ? <ExpandLessIcon style={{ fontSize: '1rem' }} /> : <ExpandMoreIcon style={{ fontSize: '1rem' }} />}
                            </IconButton>
                          </td>
                          <td onClick={(e) => e.stopPropagation()} style={{ padding: '0.625rem 0.625rem' }}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelectStaff(staffPlanKey)}
                              size="small"
                              sx={{ padding: '2px' }}
                            />
                          </td>
                          <td style={{ padding: '0.625rem 0.625rem', fontSize: '0.8125rem', fontWeight: 500 }}>{staff.staffName}</td>
                          <td style={{ padding: '0.625rem 0.625rem', fontSize: '0.8125rem' }}>{staff.staffRole}</td>
                          <td style={{ padding: '0.625rem 0.625rem', fontSize: '0.8125rem' }}>{staff.planName}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: theme.ACCENT, padding: '0.625rem 0.625rem', fontSize: '0.8125rem' }}>
                            {(() => {
                              // Priority: generation net salary > breakdown net salary > basic pay
                              if (generation) {
                                return formatCurrency(generation.netSalary);
                              }
                              const breakdown = salaryBreakdowns.get(staffPlanKey);
                              if (breakdown) {
                                return formatCurrency(breakdown.netSalary);
                              }
                              return formatCurrency(staff.basicPay || 0);
                            })()}
                          </td>
                          <td style={{ padding: '0.625rem 0.625rem' }}>
                            {generation ? (
                              <Chip
                                label={generation.status}
                                size="small"
                                color={getStatusColor(generation.status) as any}
                                sx={{ fontSize: '0.6875rem', height: '20px' }}
                              />
                            ) : (
                              <Chip label="Not Generated" size="small" color="default" sx={{ fontSize: '0.6875rem', height: '20px' }} />
                            )}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.625rem 0.625rem' }} onClick={(e) => e.stopPropagation()}>
                            <MuiFormControl size="small" style={{ minWidth: 80 }}>
                              <Select
                                value={calculationModes.get(staffPlanKey) || calculationMode}
                                onChange={(e) => {
                                  const newModes = new Map(calculationModes);
                                  newModes.set(staffPlanKey, e.target.value as 'full' | 'partial');
                                  setCalculationModes(newModes);
                                  // Clear and recalculate breakdown for this staff plan
                                  const newBreakdowns = new Map(salaryBreakdowns);
                                  newBreakdowns.delete(staffPlanKey);
                                  setSalaryBreakdowns(newBreakdowns);
                                  // Recalculate immediately
                                  loadSalaryBreakdown(staff.staffId, staff.planId);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ fontSize: '0.6875rem', height: '26px' }}
                              >
                                <MenuItem value="full" sx={{ fontSize: '0.6875rem' }}>Full</MenuItem>
                                <MenuItem value="partial" sx={{ fontSize: '0.6875rem' }}>Partial</MenuItem>
                              </Select>
                            </MuiFormControl>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.625rem 0.625rem' }} onClick={(e) => e.stopPropagation()}>
                            {generation && generation.status === 'draft' ? (
                              <Box display="flex" gap={0.375} justifyContent="center">
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() => handleApprove(generation)}
                                  sx={{ minWidth: 65, fontSize: '0.6875rem', height: '24px', padding: '2px 6px' }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={() => handleReject(generation.id)}
                                  sx={{ minWidth: 65, fontSize: '0.6875rem', height: '24px', padding: '2px 6px' }}
                                >
                                  Reject
                                </Button>
                              </Box>
                            ) : generation ? (
                              <Box display="flex" gap={0.375} justifyContent="center" alignItems="center" flexWrap="wrap">
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteGenerations([generation.id])}
                                  disabled={deleting}
                                  sx={{ minWidth: 58, fontSize: '0.6875rem', height: '24px', padding: '2px 6px' }}
                                >
                                  Delete
                                </Button>
                              </Box>
                            ) : null}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ 
                                padding: { xs: '0.5rem 0.625rem', sm: '0.625rem 0.75rem' },
                              }}>
                                {isLoadingBreakdown ? (
                                  <Box display="flex" justifyContent="center" padding={1} sx={{ '@media (max-width: 768px)': { padding: 0.75 } }}>
                                    <CircularProgress size={18} />
                                  </Box>
                                ) : breakdown ? (
                                  <Box>
                                    <Typography variant="subtitle2" sx={{ 
                                      marginBottom: '0.5rem', 
                                      fontWeight: 700, 
                                      color: theme.TEXT_PRIMARY, 
                                      fontSize: '0.75rem',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                    }}>
                                      Salary Breakdown
                                    </Typography>
                                    
                                    {/* Attendance Summary Section */}
                                    <Box sx={{ 
                                      background: theme.BG === '#252525' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.08)',
                                      borderRadius: '6px',
                                      padding: '0.5rem',
                                      marginBottom: '0.5rem',
                                      border: theme.BG === '#252525' ? 'none' : '1px solid rgba(99, 102, 241, 0.15)',
                                    }}>
                                      <Typography variant="caption" sx={{ 
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: theme.TEXT_SECONDARY,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '0.375rem',
                                        display: 'block',
                                      }}>
                                        Attendance
                                      </Typography>
                                      <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="0.375rem 0.75rem">
                                        <Box>
                                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Working Days</Typography>
                                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#6366f1' : '#4f46e5' }}>{breakdown.workingDays}</Typography>
                                        </Box>
                                        <Box>
                                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Present Days</Typography>
                                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#10b981' : '#059669' }}>{breakdown.presentDays}</Typography>
                                        </Box>
                                        <Box>
                                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Leave Days</Typography>
                                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#3b82f6' : '#2563eb' }}>{breakdown.leaveDays}</Typography>
                                        </Box>
                                        <Box>
                                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Absent Days</Typography>
                                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#ef4444' : '#dc2626' }}>{breakdown.absentDays}</Typography>
                                        </Box>
                                        {breakdown.lateDays > 0 && (
                                          <Box>
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Late Days</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#f59e0b' : '#d97706' }}>{breakdown.lateDays}</Typography>
                                          </Box>
                                        )}
                                        {includeLeaveBonus && payrollSettings?.allowLeaveBonus && breakdown.absentDays === 0 && breakdown.leaveDays === 0 && payrollSettings.leaveBonusDays > 0 && (
                                          <Box>
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Bonus Leave</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#10b981' : '#059669' }}>+{payrollSettings.leaveBonusDays}</Typography>
                                          </Box>
                                        )}
                                      </Box>
                                    </Box>

                                    {/* Earnings Section */}
                                    <Box sx={{ marginBottom: '0.5rem' }}>
                                      <Typography variant="caption" sx={{ 
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: theme.TEXT_SECONDARY,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '0.375rem',
                                        display: 'block',
                                      }}>
                                        Earnings
                                      </Typography>
                                      <Box display="flex" flexDirection="column" gap="0.25rem">
                                        <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                          <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Gross Salary</Typography>
                                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.TEXT_PRIMARY }}>{formatCurrency(breakdown.grossSalary)}</Typography>
                                        </Box>
                                        {breakdown.leaveBonusAmount && breakdown.leaveBonusAmount > 0 && (
                                          <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                            <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Leave Bonus</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#10b981' : '#059669' }}>+{formatCurrency(breakdown.leaveBonusAmount)}</Typography>
                                          </Box>
                                        )}
                                        {breakdown.adjustments !== 0 && breakdown.adjustments > 0 && (
                                          <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                            <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Adjustments</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#10b981' : '#059669' }}>+{formatCurrency(breakdown.adjustments)}</Typography>
                                          </Box>
                                        )}
                                      </Box>
                                    </Box>

                                    {/* Deductions Section */}
                                    {((breakdown.absentDeductions ?? 0) > 0 || breakdown.leaveDeductions > 0 || breakdown.lateDeductions > 0 || breakdown.advanceDeductions > 0 || (breakdown.adjustments < 0)) && (
                                      <Box sx={{ 
                                        background: theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.08)',
                                        borderRadius: '6px',
                                        padding: '0.5rem',
                                        marginBottom: '0.5rem',
                                        border: theme.BG === '#252525' ? 'none' : '1px solid rgba(239, 68, 68, 0.15)',
                                      }}>
                                        <Typography variant="caption" sx={{ 
                                          fontSize: '0.65rem',
                                          fontWeight: 600,
                                          color: theme.TEXT_SECONDARY,
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px',
                                          marginBottom: '0.375rem',
                                          display: 'block',
                                        }}>
                                          Deductions
                                        </Typography>
                                        <Box display="flex" flexDirection="column" gap="0.25rem">
                                          {(breakdown.absentDeductions ?? 0) > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                              <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Absent</Typography>
                                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#ef4444' : '#dc2626' }}>-{formatCurrency(breakdown.absentDeductions ?? 0)}</Typography>
                                            </Box>
                                          )}
                                          {breakdown.leaveDeductions > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                              <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Leave</Typography>
                                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#ef4444' : '#dc2626' }}>-{formatCurrency(breakdown.leaveDeductions)}</Typography>
                                            </Box>
                                          )}
                                          {breakdown.lateDeductions > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                              <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Late</Typography>
                                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#ef4444' : '#dc2626' }}>-{formatCurrency(breakdown.lateDeductions)}</Typography>
                                            </Box>
                                          )}
                                          {breakdown.advanceDeductions > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                              <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Advance</Typography>
                                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#ef4444' : '#dc2626' }}>-{formatCurrency(breakdown.advanceDeductions)}</Typography>
                                            </Box>
                                          )}
                                          {breakdown.adjustments < 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" padding="0.25rem 0">
                                              <Typography variant="body2" sx={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>Adjustments</Typography>
                                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.BG === '#252525' ? '#ef4444' : '#dc2626' }}>{formatCurrency(breakdown.adjustments)}</Typography>
                                            </Box>
                                          )}
                                        </Box>
                                      </Box>
                                    )}

                                    {/* Net Salary Section */}
                                    <Box sx={{ 
                                      background: theme.BG === '#252525' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.12)',
                                      borderRadius: '6px',
                                      padding: '0.625rem',
                                      border: theme.BG === '#252525' ? `1px solid ${theme.ACCENT}40` : `1px solid ${theme.ACCENT}60`,
                                      marginBottom: generation && generation.status === 'draft' ? '0.5rem' : '0',
                                    }}>
                                      <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 700, color: theme.TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                          Net Salary
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 800, color: theme.ACCENT }}>
                                          {formatCurrency(breakdown.netSalary)}
                                        </Typography>
                                      </Box>
                                    </Box>

                                    {/* Approve/Reject Buttons (Mobile Only) */}
                                      {generation && generation.status === 'draft' && (
                                        <Box 
                                          display="flex" 
                                        gap={0.75} 
                                        marginTop={0.75} 
                                        paddingTop={0.75} 
                                        borderTop={`1px solid ${theme.BORDER}`}
                                        sx={{ 
                                          '@media (min-width: 769px)': { 
                                            display: 'none', // Hide on desktop
                                          },
                                          '@media (max-width: 768px)': { 
                                            gap: 0.5, 
                                            marginTop: 0.625, 
                                            paddingTop: 0.625,
                                            flexDirection: 'column',
                                          },
                                        }}
                                      >
                                        <Button
                                          variant="contained"
                                          color="success"
                                          size="small"
                                          onClick={() => handleApprove(generation)}
                                          sx={{ 
                                            flex: 1, 
                                            fontSize: { xs: '0.6875rem', sm: '0.75rem' }, 
                                            height: { xs: '32px', sm: '28px' }, 
                                            padding: { xs: '4px 8px', sm: '2px 8px' },
                                            '@media (max-width: 768px)': { width: '100%' },
                                          }}
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          size="small"
                                          onClick={() => handleReject(generation.id)}
                                          sx={{ 
                                            flex: 1, 
                                            fontSize: { xs: '0.6875rem', sm: '0.75rem' }, 
                                            height: { xs: '32px', sm: '28px' }, 
                                            padding: { xs: '4px 8px', sm: '2px 8px' },
                                            '@media (max-width: 768px)': { width: '100%' },
                                          }}
                                        >
                                          Reject
                                          </Button>
                                        </Box>
                                      )}

                                      {generation && generation.status !== 'draft' && (
                                        <Box
                                          display="flex"
                                          gap={0.75}
                                          marginTop={0.75}
                                          paddingTop={0.75}
                                          sx={{
                                            borderTop: `1px solid ${theme.BORDER}`,
                                            '@media (min-width: 769px)': { display: 'none' },
                                          }}
                                        >
                                          <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteGenerations([generation.id])}
                                            disabled={deleting}
                                            sx={{
                                              flex: 1,
                                              fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                                              height: { xs: '32px', sm: '28px' },
                                              padding: { xs: '4px 8px', sm: '2px 8px' },
                                              '@media (max-width: 768px)': { width: '100%' },
                                            }}
                                          >
                                            Delete Payroll
                                          </Button>
                                        </Box>
                                      )}
                                    </Box>
                                  ) : (
                                  <Typography variant="body2" color={theme.TEXT_SECONDARY} style={{ padding: '16px', textAlign: 'center' }}>
                                    Click to expand and view salary breakdown
                                  </Typography>
                                )}
                              </Box>
                            </Collapse>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </SharedStyledTable>
          </TableWrapper>
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
    </PayrollContainer>
  );
};

export default PayrollGenerationManager;
