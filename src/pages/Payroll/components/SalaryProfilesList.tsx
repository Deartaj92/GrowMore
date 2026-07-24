import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { newPayrollService, StaffSalaryProfile } from '../services/newPayrollService';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AccountBalanceWallet as PlanIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AddCircleOutline as AddCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Collapse,
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
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2<{ theme: any }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};

  input {
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font-size: 0.85rem;
    width: 180px;
  }
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

  &:hover {
    opacity: 0.9;
  }
`;

const StaffGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.75rem;
`;

const StaffGroupCard = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(248, 250, 252, 0.8)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
`;

const StaffCardHeader = styled.div<{ theme: any }>`
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};

  &:hover {
    background: ${({ theme }) => `${theme.ACCENT}08`};
  }
`;

const StaffInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }

  .name-block h4 {
    margin: 0 0 0.15rem 0;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .name-block span {
    font-size: 0.76rem;
    color: #888;
  }
`;

const BadgeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
`;

const PlanCountBadge = styled.span<{ theme: any }>`
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ theme }) => `${theme.ACCENT}15`};
  color: ${({ theme }) => theme.ACCENT};
  border: 1px solid ${({ theme }) => `${theme.ACCENT}30`};
`;

const PlansContainer = styled.div`
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const SinglePlanCard = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PlanTitle = styled.div<{ theme: any }>`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.35rem;
`;

const ChipContainer = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.35rem;
`;

const ItemChip = styled.span<{ $type: 'allowance' | 'deduction' }>`
  padding: 0.18rem 0.5rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  background: ${({ $type }) =>
    $type === 'allowance' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};
  color: ${({ $type }) => ($type === 'allowance' ? '#10b981' : '#ef4444')};
  border: 1px solid
    ${({ $type }) => ($type === 'allowance' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)')};
`;

const NetSalaryBadge = styled.div<{ theme: any }>`
  text-align: right;

  label {
    font-size: 0.68rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-weight: 700;
    display: block;
  }

  div {
    font-size: 1.15rem;
    font-weight: 800;
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const noSpinnerSx = {
  '& input[type=number]': {
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
};

/* ── SLEEK & PREMIUM MODAL STYLES ── */

const ModalContainer = styled.div<{ theme: any }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#1c1d21' : '#ffffff')};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
`;

const ModalHeader = styled.div<{ theme: any }>`
  padding: 1.1rem 1.5rem;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ModalContent = styled.div`
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionHeader = styled.div<{ $color?: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $color }) => $color || 'inherit'};
`;

const MiniCard = styled.div<{ theme: any; $type: 'allowance' | 'deduction' }>`
  background: ${({ $type, theme }) =>
    $type === 'allowance'
      ? theme.BG === '#252525'
        ? 'rgba(16,185,129,0.05)'
        : 'rgba(16,185,129,0.03)'
      : theme.BG === '#252525'
      ? 'rgba(239,68,68,0.05)'
      : 'rgba(239,68,68,0.03)'};
  border: 1px solid
    ${({ $type }) => ($type === 'allowance' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)')};
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CompactRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const InputStyled = styled.input<{ theme: any; width?: string }>`
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(0,0,0,0.3)' : '#ffffff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.82rem;
  outline: none;
  width: ${({ width }) => width || '100%'};

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const LabelSub = styled.label<{ theme: any }>`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
`;

const PlanSummaryBox = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-top: 0.5rem;
  font-size: 0.82rem;
`;

const ModalFooter = styled.div<{ theme: any }>`
  padding: 1rem 1.5rem;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

interface StaffGroup {
  staffId: number;
  staffName: string;
  role: string;
  plans: StaffSalaryProfile[];
}

interface PlanItemState {
  name: string;
  amount: number;
  startMonth?: string;
  endMonth?: string;
}

const SalaryProfilesList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();

  const [allPlans, setAllPlans] = useState<StaffSalaryProfile[]>([]);
  const [allStaff, setAllStaff] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStaff, setExpandedStaff] = useState<Record<number, boolean>>({});

  // Plan creation / editing modal
  const [openModal, setOpenModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StaffSalaryProfile | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  const [planName, setPlanName] = useState('Standard Salary Plan');
  const [basicPay, setBasicPay] = useState<number>(0);
  const [allowances, setAllowances] = useState<PlanItemState[]>([]);
  const [fixedDeductions, setFixedDeductions] = useState<PlanItemState[]>([]);
  const [saving, setSaving] = useState(false);

  // Clear all plans modal
  const [openClearPlansConfirm, setOpenClearPlansConfirm] = useState(false);
  const [clearingPlans, setClearingPlans] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.school_id]);

  const loadData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      if (staffData) setAllStaff(staffData);

      const planList = await newPayrollService.getStaffSalaryProfiles(user.school_id);
      setAllPlans(planList);

      const exp: Record<number, boolean> = {};
      planList.forEach(p => {
        exp[p.staffId] = true;
      });
      setExpandedStaff(exp);
    } catch (err: any) {
      console.error('Failed to load salary plans:', err);
      showToast('Error loading salary plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (staffId: number) => {
    setExpandedStaff(prev => ({ ...prev, [staffId]: !prev[staffId] }));
  };

  const handleOpenCreateForStaff = (staffId: number) => {
    setEditingPlan(null);
    setSelectedStaffId(staffId);
    setPlanName('Custom Salary Plan');
    setBasicPay(0);
    setAllowances([]);
    setFixedDeductions([]);
    setOpenModal(true);
  };

  const handleOpenCreateGeneral = () => {
    setEditingPlan(null);
    setSelectedStaffId(allStaff.length > 0 ? allStaff[0].id : '');
    setPlanName('Standard Salary Plan');
    setBasicPay(0);
    setAllowances([]);
    setFixedDeductions([]);
    setOpenModal(true);
  };

  const handleOpenEditModal = (plan: StaffSalaryProfile) => {
    setEditingPlan(plan);
    setSelectedStaffId(plan.staffId);
    setPlanName(plan.planName || 'Standard Salary Plan');
    setBasicPay(plan.basicPay || 0);
    setAllowances(
      plan.allowances && plan.allowances.length > 0
        ? plan.allowances.map(a => ({ name: a.name, amount: a.amount, startMonth: a.startMonth, endMonth: a.endMonth }))
        : []
    );
    setFixedDeductions(
      plan.fixedDeductions && plan.fixedDeductions.length > 0
        ? plan.fixedDeductions.map(d => ({ name: d.name, amount: d.amount, startMonth: d.startMonth, endMonth: d.endMonth }))
        : []
    );
    setOpenModal(true);
  };

  const handleAddAllowance = () => {
    setAllowances([...allowances, { name: '', amount: 0, startMonth: '', endMonth: '' }]);
  };

  const handleRemoveAllowance = (index: number) => {
    setAllowances(allowances.filter((_, idx) => idx !== index));
  };

  const handleAddDeduction = () => {
    setFixedDeductions([...fixedDeductions, { name: '', amount: 0, startMonth: '', endMonth: '' }]);
  };

  const handleRemoveDeduction = (index: number) => {
    setFixedDeductions(fixedDeductions.filter((_, idx) => idx !== index));
  };

  const handleSavePlan = async () => {
    if (!selectedStaffId || !user?.school_id) {
      showToast('Please select a staff member', 'error');
      return;
    }
    if (basicPay <= 0) {
      showToast('Please enter a valid basic monthly salary', 'error');
      return;
    }
    setSaving(true);
    try {
      await newPayrollService.createStaffSalaryPlan(
        user.school_id,
        Number(selectedStaffId),
        planName,
        basicPay,
        allowances,
        fixedDeductions,
        user.id
      );
      showToast('Salary Plan saved successfully!', 'success');
      setOpenModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Error saving salary plan:', err);
      showToast('Failed to save salary plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaffPlan = async (planId: number) => {
    if (!planId || !user?.school_id) return;
    try {
      await newPayrollService.deleteStaffSalaryPlan(user.school_id, planId);
      showToast('Salary plan deleted', 'success');
      await loadData();
    } catch (err: any) {
      console.error('Error deleting salary plan:', err);
      showToast('Failed to delete salary plan', 'error');
    }
  };

  const handleClearAllPlans = async () => {
    if (!user?.school_id) return;
    setClearingPlans(true);
    try {
      await newPayrollService.clearAllSalaryPlans(user.school_id);
      showToast('All staff salary plans cleared!', 'success');
      setOpenClearPlansConfirm(false);
      await loadData();
    } catch (err: any) {
      console.error('Error clearing salary plans:', err);
      showToast('Failed to clear salary plans', 'error');
    } finally {
      setClearingPlans(false);
    }
  };

  const staffGroupsMap = new Map<number, StaffGroup>();

  allPlans.forEach(plan => {
    if (!staffGroupsMap.has(plan.staffId)) {
      staffGroupsMap.set(plan.staffId, {
        staffId: plan.staffId,
        staffName: plan.name,
        role: plan.role,
        plans: [],
      });
    }
    staffGroupsMap.get(plan.staffId)!.plans.push(plan);
  });

  const staffGroupsArray = Array.from(staffGroupsMap.values()).filter(
    g =>
      g.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.plans.some(p => p.planName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAllowances = allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalDeductions = fixedDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalGross = basicPay + totalAllowances;
  const netMonthly = Math.max(0, totalGross - totalDeductions);

  return (
    <Card theme={theme}>
      <HeaderRow>
        <Title theme={theme}>
          <PlanIcon style={{ color: theme.ACCENT }} /> Staff Salary Plans Directory ({staffGroupsArray.length} Staff Configured)
        </Title>
        <ControlsGroup>
          <SearchInput theme={theme}>
            <SearchIcon style={{ fontSize: 18, color: theme.TEXT_SECONDARY }} />
            <input
              type="text"
              placeholder="Search staff or plan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </SearchInput>

          <ActionButton theme={theme} $variant="primary" onClick={handleOpenCreateGeneral}>
            <AddIcon style={{ fontSize: 16 }} /> Create Salary Plan
          </ActionButton>

          {allPlans.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setOpenClearPlansConfirm(true)}
              style={{ textTransform: 'none', fontWeight: 600 }}
            >
              Clear All Plans
            </Button>
          )}
        </ControlsGroup>
      </HeaderRow>

      {loading ? (
        <div style={{ padding: '2.5rem', textAlign: 'center' }}>
          <CircularProgress size={32} color="primary" />
        </div>
      ) : staffGroupsArray.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
          <PlanIcon style={{ fontSize: 42, color: theme.BORDER, marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Salary Plans Created Yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
            Click <b>"+ Create Salary Plan"</b> above to assign custom plans to staff members.
          </div>
        </div>
      ) : (
        <StaffGrid>
          {staffGroupsArray.map(group => {
            const isExpanded = !!expandedStaff[group.staffId];
            return (
              <StaffGroupCard key={group.staffId} theme={theme}>
                <StaffCardHeader theme={theme} onClick={() => toggleExpand(group.staffId)}>
                  <StaffInfo>
                    <div className="avatar">
                      {group.staffName.charAt(0).toUpperCase()}
                    </div>
                    <div className="name-block">
                      <h4>{group.staffName}</h4>
                      <span>{group.role}</span>
                    </div>
                  </StaffInfo>

                  <BadgeGroup>
                    <PlanCountBadge theme={theme}>
                      {group.plans.length} {group.plans.length === 1 ? 'Salary Plan' : 'Salary Plans'}
                    </PlanCountBadge>
                    <IconButton
                      size="small"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleOpenCreateForStaff(group.staffId);
                      }}
                      title="Add Another Plan for this Staff"
                    >
                      <AddCircleIcon style={{ color: theme.ACCENT }} />
                    </IconButton>
                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </BadgeGroup>
                </StaffCardHeader>

                <Collapse in={isExpanded}>
                  <PlansContainer>
                    {group.plans.map(p => {
                      const allowTotal = p.allowances.reduce((sum, a) => sum + a.amount, 0);
                      const dedTotal = p.fixedDeductions.reduce((sum, d) => sum + d.amount, 0);
                      const gross = p.basicPay + allowTotal;
                      const net = Math.max(0, gross - dedTotal);

                      return (
                        <SinglePlanCard key={p.id} theme={theme}>
                          <div>
                            <PlanTitle theme={theme}>{p.planName}</PlanTitle>
                            <div style={{ fontSize: '0.82rem', color: theme.TEXT_SECONDARY }}>
                              Basic Pay: <b>{formatCurrency(p.basicPay)}</b>
                            </div>
                            <ChipContainer>
                              {p.allowances.map((a, idx) => (
                                <ItemChip key={idx} $type="allowance">
                                  +{a.name}: {formatCurrency(a.amount)}
                                  {a.startMonth || a.endMonth ? ` (${a.startMonth || 'Start'} → ${a.endMonth || 'No Expiry'})` : ''}
                                </ItemChip>
                              ))}
                              {p.fixedDeductions.map((d, idx) => (
                                <ItemChip key={idx} $type="deduction">
                                  -{d.name}: {formatCurrency(d.amount)}
                                  {d.startMonth || d.endMonth ? ` (${d.startMonth || 'Start'} → ${d.endMonth || 'No Expiry'})` : ''}
                                </ItemChip>
                              ))}
                            </ChipContainer>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <NetSalaryBadge theme={theme}>
                              <label>Monthly Net Plan</label>
                              <div>{formatCurrency(net)}</div>
                            </NetSalaryBadge>

                            <div>
                              <IconButton size="small" onClick={() => handleOpenEditModal(p)} title="Edit Plan">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteStaffPlan(p.planId)} title="Delete Plan">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </div>
                          </div>
                        </SinglePlanCard>
                      );
                    })}
                  </PlansContainer>
                </Collapse>
              </StaffGroupCard>
            );
          })}
        </StaffGrid>
      )}

      {/* SLEEK & PREMIUM SALARY PLAN MODAL */}
      {openModal && (
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          PaperProps={{
            style: {
              borderRadius: '16px',
              background: theme.BG === '#252525' ? '#1c1d21' : '#ffffff',
              color: theme.TEXT_PRIMARY,
              overflow: 'hidden',
            },
          }}
          maxWidth="sm"
          fullWidth
        >
          <ModalHeader theme={theme}>
            <h3>{editingPlan ? `Edit Plan: ${editingPlan.planName}` : 'Create Staff Salary Plan'}</h3>
            <IconButton size="small" onClick={() => setOpenModal(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </ModalHeader>

          <ModalContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <FormControl size="small" fullWidth disabled={!!editingPlan}>
                  <InputLabel>Select Staff Member</InputLabel>
                  <Select
                    value={selectedStaffId}
                    label="Select Staff Member"
                    onChange={e => setSelectedStaffId(Number(e.target.value))}
                  >
                    {allStaff.map(s => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Salary Plan Title"
                  fullWidth
                  size="small"
                  variant="outlined"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder="e.g. Standard Contract Plan"
                />
              </div>

              <TextField
                label="Basic Monthly Salary (Rs.)"
                type="number"
                fullWidth
                size="small"
                variant="outlined"
                value={basicPay || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBasicPay(Number(e.target.value))}
                onWheel={(e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLElement).blur()}
                sx={noSpinnerSx}
                placeholder="e.g. 30000"
              />

              {/* Allowances Section */}
              <div>
                <SectionHeader $color="#10b981">
                  <span>➕ Allowances & Bonuses</span>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddAllowance}
                    style={{ color: '#10b981', textTransform: 'none', fontWeight: 600 }}
                  >
                    Add Allowance
                  </Button>
                </SectionHeader>

                {allowances.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: theme.TEXT_SECONDARY, padding: '0.25rem 0' }}>
                    No allowances added. Click "+ Add Allowance" above.
                  </div>
                ) : (
                  allowances.map((a, idx) => (
                    <MiniCard key={idx} theme={theme} $type="allowance">
                      <CompactRow>
                        <TextField
                          placeholder="Allowance Name (e.g. House Rent)"
                          value={a.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...allowances];
                            copy[idx].name = e.target.value;
                            setAllowances(copy);
                          }}
                          size="small"
                          fullWidth
                        />
                        <TextField
                          placeholder="Amount (Rs.)"
                          type="number"
                          value={a.amount || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...allowances];
                            copy[idx].amount = Number(e.target.value);
                            setAllowances(copy);
                          }}
                          onWheel={(e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLElement).blur()}
                          sx={noSpinnerSx}
                          size="small"
                          style={{ width: '130px' }}
                        />
                        <IconButton size="small" color="error" onClick={() => handleRemoveAllowance(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CompactRow>

                      <CompactRow>
                        <TextField
                          label="Effective From"
                          type="month"
                          InputLabelProps={{ shrink: true }}
                          value={a.startMonth || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...allowances];
                            copy[idx].startMonth = e.target.value;
                            setAllowances(copy);
                          }}
                          size="small"
                          fullWidth
                        />
                        <TextField
                          label="Expiry (Till Month)"
                          type="month"
                          InputLabelProps={{ shrink: true }}
                          value={a.endMonth || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...allowances];
                            copy[idx].endMonth = e.target.value;
                            setAllowances(copy);
                          }}
                          size="small"
                          fullWidth
                        />
                      </CompactRow>
                    </MiniCard>
                  ))
                )}
              </div>

              {/* Fixed Deductions Section */}
              <div>
                <SectionHeader $color="#ef4444">
                  <span>➖ Fixed Deductions</span>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddDeduction}
                    style={{ color: '#ef4444', textTransform: 'none', fontWeight: 600 }}
                  >
                    Add Deduction
                  </Button>
                </SectionHeader>

                {fixedDeductions.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: theme.TEXT_SECONDARY, padding: '0.25rem 0' }}>
                    No fixed deductions added. Click "+ Add Deduction" above.
                  </div>
                ) : (
                  fixedDeductions.map((d, idx) => (
                    <MiniCard key={idx} theme={theme} $type="deduction">
                      <CompactRow>
                        <TextField
                          placeholder="Deduction Name (e.g. Income Tax)"
                          value={d.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...fixedDeductions];
                            copy[idx].name = e.target.value;
                            setFixedDeductions(copy);
                          }}
                          size="small"
                          fullWidth
                        />
                        <TextField
                          placeholder="Amount (Rs.)"
                          type="number"
                          value={d.amount || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...fixedDeductions];
                            copy[idx].amount = Number(e.target.value);
                            setFixedDeductions(copy);
                          }}
                          onWheel={(e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLElement).blur()}
                          sx={noSpinnerSx}
                          size="small"
                          style={{ width: '130px' }}
                        />
                        <IconButton size="small" color="error" onClick={() => handleRemoveDeduction(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CompactRow>

                      <CompactRow>
                        <TextField
                          label="Effective From"
                          type="month"
                          InputLabelProps={{ shrink: true }}
                          value={d.startMonth || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...fixedDeductions];
                            copy[idx].startMonth = e.target.value;
                            setFixedDeductions(copy);
                          }}
                          size="small"
                          fullWidth
                        />
                        <TextField
                          label="Expiry (Till Month)"
                          type="month"
                          InputLabelProps={{ shrink: true }}
                          value={d.endMonth || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const copy = [...fixedDeductions];
                            copy[idx].endMonth = e.target.value;
                            setFixedDeductions(copy);
                          }}
                          size="small"
                          fullWidth
                        />
                      </CompactRow>
                    </MiniCard>
                  ))
                )}
              </div>

              <PlanSummaryBox theme={theme}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Basic Monthly Salary:</span>
                  <b>{formatCurrency(basicPay)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: '#10b981' }}>
                  <span>Total Allowances:</span>
                  <b>+{formatCurrency(totalAllowances)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: '#ef4444' }}>
                  <span>Total Fixed Deductions:</span>
                  <b>-{formatCurrency(totalDeductions)}</b>
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${theme.BORDER}`,
                    paddingTop: '0.4rem',
                    marginTop: '0.4rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    color: theme.ACCENT,
                  }}
                >
                  <span>Standard Monthly Net Salary:</span>
                  <span>{formatCurrency(netMonthly)}</span>
                </div>
              </PlanSummaryBox>
            </div>
          </ModalContent>

          <ModalFooter theme={theme}>
            <Button onClick={() => setOpenModal(false)} disabled={saving} style={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePlan}
              variant="contained"
              color="primary"
              disabled={saving}
              style={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', padding: '0.4rem 1.25rem' }}
            >
              {saving ? <CircularProgress size={18} color="inherit" /> : 'Save Salary Plan'}
            </Button>
          </ModalFooter>
        </Dialog>
      )}

      {/* Clear All Salary Plans Confirmation Modal */}
      <Dialog open={openClearPlansConfirm} onClose={() => setOpenClearPlansConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle style={{ fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}>
          Clear All Created Salary Plans?
        </DialogTitle>
        <DialogContent>
          <div style={{ fontSize: '0.88rem', color: theme.TEXT_PRIMARY, marginTop: '0.25rem' }}>
            Are you sure you want to delete all created staff salary plans? This operation will remove all current plans so you can create new custom plans from scratch.
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClearPlansConfirm(false)} disabled={clearingPlans}>
            Cancel
          </Button>
          <Button onClick={handleClearAllPlans} variant="contained" color="error" disabled={clearingPlans}>
            {clearingPlans ? <CircularProgress size={18} color="inherit" /> : 'Clear All Plans'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SalaryProfilesList;
