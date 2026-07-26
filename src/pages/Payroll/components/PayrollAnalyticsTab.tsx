import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../components/Layout/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  TrendingUp as TrendUpIcon,
  PieChart as PieChartIcon,
  People as PeopleIcon,
  AccountBalanceWallet as WalletIcon,
  CalendarMonth as CalendarIcon,
  Assessment as AnalyticsIcon,
  CheckCircle as PaidIcon,
  HourglassEmpty as PendingIcon,
  Badge as StaffIcon,
  FilterAlt as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { clayCardStyle, clayInsetStyle, isDark } from '../../../styles/DesignSystem';
import {
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  Chip,
} from '@mui/material';

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

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const SelectGroup = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  ${clayInsetStyle}
  border-radius: 10px;
  padding: 0.25rem 0.5rem;
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
`;

const KPICard = styled.div<{ theme: any; $color?: string }>`
  ${clayCardStyle}
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    transform: translateY(-2px);
  }

  .kpi-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;

    label {
      font-size: 0.72rem;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.4px;
    }

    .icon-wrapper {
      padding: 0.35rem;
      border-radius: 8px;
      background: ${({ $color }) => `${$color || '#3b82f6'}18`};
      color: ${({ $color }) => $color || '#3b82f6'};
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.4);
    }
  }

  .kpi-value {
    font-size: 1.4rem;
    font-weight: 800;
    color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
  }

  .kpi-subtext {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    margin-top: 0.25rem;
  }
`;

const ChartsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SectionCard = styled.div<{ theme: any }>`
  ${clayCardStyle}
  padding: 0.85rem;

  h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    margin: 0 0 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const ProgressBar = styled.div<{ $color?: string }>`
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.4rem;

  div {
    height: 100%;
    background: ${({ $color }) => $color || '#3b82f6'};
    border-radius: 4px;
    transition: width 0.4s ease;
  }
`;

const ListRow = styled.div<{ theme: any }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.85rem;

  &:last-child {
    border-bottom: none;
  }

  .title {
    font-weight: 600;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  .subtitle {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }

  .val {
    font-weight: 700;
  }
`;

const StaffTable = styled.table<{ theme: any }>`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;

  th, td {
    padding: 0.75rem 0.85rem;
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

  tfoot tr {
    border-top: 2px solid ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) =>
      theme.BG === '#252525' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)'};
  }

  tfoot td {
    font-weight: 800;
    font-size: 0.88rem;
  }
`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface StaffSummary {
  staffId: number;
  name: string;
  role: string;
  basicPay: number;
  totalNetSalary: number;
  totalPaid: number;
  remainingBalance: number;
  generatedMonthsCount: number;
}

const PayrollAnalyticsTab: React.FC = () => {
  const { theme: themeMode } = useTheme();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();

  // Filters State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'ALL'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchStaff, setSearchStaff] = useState<string>('');
  const [staffRecordFilter, setStaffRecordFilter] = useState<'WITH_RECORDS' | 'ALL'>('WITH_RECORDS');

  const [loading, setLoading] = useState(true);

  // Raw DB State
  const [generations, setGenerations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [user?.school_id, selectedYear]);

  const loadAnalyticsData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      // 1. Fetch Staff with basic_pay via plans
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      // Fetch active payroll plans to map basic_pay for staff
      const { data: plansData } = await supabase
        .from('payroll_plans')
        .select('staff_id, basic_pay')
        .eq('school_id', user.school_id)
        .eq('status', 'active');

      const planMap = new Map<number, number>();
      if (plansData) {
        plansData.forEach(p => {
          planMap.set(p.staff_id, parseFloat(p.basic_pay || '0'));
        });
      }

      const mappedStaff = (staffData || []).map(s => ({
        ...s,
        basic_pay: planMap.get(s.id) || 0,
      }));

      setAllStaff(mappedStaff);

      // 2. Fetch all generations for selected year
      const { data: genData } = await supabase
        .from('payroll_generations')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('payroll_year', selectedYear);

      setGenerations(genData || []);

      // 3. Fetch payments for selected year
      const { data: payData } = await supabase
        .from('payroll_payments')
        .select('*')
        .eq('school_id', user.school_id);

      setPayments(payData || []);

      // 4. Fetch advances
      const { data: advData } = await supabase
        .from('payroll_advances')
        .select('*')
        .eq('school_id', user.school_id);

      setAdvances(advData || []);
    } catch (err: any) {
      console.error('Error loading payroll analytics:', err);
      showToast('Error loading analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Generations based on controls
  const filteredGenerations = generations.filter(g => {
    const matchesMonth = selectedMonthFilter === 'ALL' || g.payroll_month === selectedMonthFilter;
    const staffObj = allStaff.find(s => s.id === g.staff_id);
    const matchesRole = roleFilter === 'ALL' || (staffObj && staffObj.role === roleFilter);
    const matchesSearch = !searchStaff || (staffObj && staffObj.name.toLowerCase().includes(searchStaff.toLowerCase()));
    return matchesMonth && matchesRole && matchesSearch;
  });

  // Calculate Aggregates
  const totalYearlyPayroll = filteredGenerations.reduce((sum, g) => sum + parseFloat(g.net_salary || '0'), 0);

  const filteredGenIds = new Set(filteredGenerations.map(g => g.id));
  const totalYearlyDisbursed = payments
    .filter(p => filteredGenIds.has(p.generation_id))
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  const pendingDisbursement = Math.max(0, totalYearlyPayroll - totalYearlyDisbursed);
  
  const activeLoansList = advances.filter(a => a.status === 'active' || a.status === 'approved');
  const totalActiveLoans = activeLoansList.reduce((sum, a) => sum + (parseFloat(a.amount || '0') - parseFloat(a.repaid_amount || '0')), 0);

  const disbursementPercentage = totalYearlyPayroll > 0 ? Math.min(100, Math.round((totalYearlyDisbursed / totalYearlyPayroll) * 100)) : 0;

  // Roles list for dropdown
  const uniqueRoles = Array.from(new Set(allStaff.map(s => s.role).filter(Boolean)));

  // Per Staff Detailed Aggregation
  const staffSummaries: StaffSummary[] = allStaff
    .filter(s => roleFilter === 'ALL' || s.role === roleFilter)
    .filter(s => !searchStaff || s.name.toLowerCase().includes(searchStaff.toLowerCase()))
    .map(s => {
      const sGens = generations.filter(g => g.staff_id === s.id && (selectedMonthFilter === 'ALL' || g.payroll_month === selectedMonthFilter));
      const sGenIds = new Set(sGens.map(g => g.id));
      const sNet = sGens.reduce((sum, g) => sum + parseFloat(g.net_salary || '0'), 0);
      const sPaid = payments.filter(p => sGenIds.has(p.generation_id)).reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      return {
        staffId: s.id,
        name: s.name,
        role: s.role || 'Staff Member',
        basicPay: parseFloat(s.basic_pay || '0'),
        totalNetSalary: sNet,
        totalPaid: sPaid,
        remainingBalance: Math.max(0, sNet - sPaid),
        generatedMonthsCount: sGens.length,
      };
    })
    .filter(s => {
      if (staffRecordFilter === 'WITH_RECORDS') {
        return s.generatedMonthsCount > 0 || s.basicPay > 0;
      }
      return true;
    });

  // Monthly distribution breakdown
  const monthlyData = MONTHS.map((m, idx) => {
    const monthNum = idx + 1;
    const monthGens = filteredGenerations.filter(g => g.payroll_month === monthNum);
    const monthNet = monthGens.reduce((sum, g) => sum + parseFloat(g.net_salary || '0'), 0);
    const staffCount = monthGens.length;
    return {
      monthName: m,
      netSalary: monthNet,
      staffCount,
    };
  });

  const maxMonthlyNet = Math.max(1, ...monthlyData.map(m => m.netSalary));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <Container>
      {/* Header & Filter Controls Card */}
      <ControlsCard theme={theme}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AnalyticsIcon style={{ color: theme.ACCENT, fontSize: 24 }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: theme.TEXT_PRIMARY }}>
              Payroll Home & Financial Analytics
            </h2>
            <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
              Overview of payroll budgets, disbursements, staff salary breakdown, and loans
            </div>
          </div>
        </div>

        <FilterGroup>
          {/* Year Filter */}
          <SelectGroup theme={theme}>
            <CalendarIcon style={{ fontSize: 18, color: theme.TEXT_SECONDARY }} />
            <Select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              variant="standard"
              disableUnderline
              style={{ fontSize: '0.82rem', color: theme.TEXT_PRIMARY, fontWeight: 700 }}
            >
              {years.map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </SelectGroup>

          {/* Month Filter */}
          <SelectGroup theme={theme}>
            <FilterIcon style={{ fontSize: 18, color: theme.TEXT_SECONDARY }} />
            <Select
              value={selectedMonthFilter}
              onChange={e => setSelectedMonthFilter(e.target.value as any)}
              variant="standard"
              disableUnderline
              style={{ fontSize: '0.82rem', color: theme.TEXT_PRIMARY, fontWeight: 700 }}
            >
              <MenuItem value="ALL">All Months ({selectedYear})</MenuItem>
              {MONTHS.map((m, idx) => (
                <MenuItem key={idx} value={idx + 1}>{m}</MenuItem>
              ))}
            </Select>
          </SelectGroup>

          {/* Role Filter */}
          {uniqueRoles.length > 0 && (
            <SelectGroup theme={theme}>
              <StaffIcon style={{ fontSize: 18, color: theme.TEXT_SECONDARY }} />
              <Select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                variant="standard"
                disableUnderline
                style={{ fontSize: '0.82rem', color: theme.TEXT_PRIMARY, fontWeight: 700 }}
              >
                <MenuItem value="ALL">All Roles</MenuItem>
                {uniqueRoles.map(r => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </SelectGroup>
          )}

          {/* Staff Search */}
          <TextField
            placeholder="Search Staff..."
            value={searchStaff}
            onChange={e => setSearchStaff(e.target.value)}
            size="small"
            style={{ width: 140 }}
            InputProps={{
              style: { fontSize: '0.8rem' },
              startAdornment: <SearchIcon fontSize="small" style={{ color: theme.TEXT_SECONDARY, marginRight: 4 }} />,
            }}
          />
        </FilterGroup>
      </ControlsCard>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <CircularProgress size={32} color="primary" />
        </div>
      ) : (
        <>
          {/* KPI Summary Strip */}
          <KPIGrid>
            <KPICard theme={theme} $color={theme.ACCENT}>
              <div className="kpi-header">
                <label>Total Payroll Net ({selectedYear})</label>
                <div className="icon-wrapper"><WalletIcon fontSize="small" /></div>
              </div>
              <div className="kpi-value">{formatCurrency(totalYearlyPayroll)}</div>
              <div className="kpi-subtext">Cumulative net calculated for filtered criteria</div>
            </KPICard>

            <KPICard theme={theme} $color="#10b981">
              <div className="kpi-header">
                <label>Total Disbursed</label>
                <div className="icon-wrapper"><PaidIcon fontSize="small" /></div>
              </div>
              <div className="kpi-value">{formatCurrency(totalYearlyDisbursed)}</div>
              <div className="kpi-subtext">{disbursementPercentage}% of net salary disbursed</div>
            </KPICard>

            <KPICard theme={theme} $color="#ef4444">
              <div className="kpi-header">
                <label>Pending Disbursement</label>
                <div className="icon-wrapper"><PendingIcon fontSize="small" /></div>
              </div>
              <div className="kpi-value">{formatCurrency(pendingDisbursement)}</div>
              <div className="kpi-subtext">Carried unpaid liability</div>
            </KPICard>

            <KPICard theme={theme} $color="#f59e0b">
              <div className="kpi-header">
                <label>Outstanding Advances / Loans</label>
                <div className="icon-wrapper"><TrendUpIcon fontSize="small" /></div>
              </div>
              <div className="kpi-value">{formatCurrency(totalActiveLoans)}</div>
              <div className="kpi-subtext">{activeLoansList.length} active loan record(s)</div>
            </KPICard>
          </KPIGrid>

          {/* Breakdown Section */}
          <ChartsRow>
            {/* Monthly Expenditure Distribution */}
            <SectionCard theme={theme}>
              <h3>
                <PieChartIcon style={{ color: theme.ACCENT, fontSize: 20 }} /> Monthly Salary Distribution ({selectedYear})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {monthlyData.map(m => {
                  const pct = Math.round((m.netSalary / maxMonthlyNet) * 100);
                  return (
                    <div key={m.monthName}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 600, color: theme.TEXT_PRIMARY }}>{m.monthName}</span>
                        <span style={{ fontWeight: 700, color: m.netSalary > 0 ? theme.ACCENT : theme.TEXT_SECONDARY }}>
                          {formatCurrency(m.netSalary)} {m.staffCount > 0 && <small style={{ color: theme.TEXT_SECONDARY }}>({m.staffCount} staff)</small>}
                        </span>
                      </div>
                      <ProgressBar $color={theme.ACCENT}>
                        <div style={{ width: `${pct}%` }} />
                      </ProgressBar>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Financial Health & Disbursement Progress */}
            <SectionCard theme={theme}>
              <h3>
                <PeopleIcon style={{ color: theme.ACCENT, fontSize: 20 }} /> Disbursement Progress Summary
              </h3>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '10px', background: theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', border: `1px solid ${theme.BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: theme.TEXT_PRIMARY }}>Overall Disbursement Ratio</span>
                  <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>{disbursementPercentage}%</span>
                </div>
                <ProgressBar $color="#10b981">
                  <div style={{ width: `${disbursementPercentage}%` }} />
                </ProgressBar>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <ListRow theme={theme}>
                  <div>
                    <div className="title">Annual Salary Net Total</div>
                    <div className="subtitle">Total approved payroll net</div>
                  </div>
                  <div className="val" style={{ color: theme.TEXT_PRIMARY }}>{formatCurrency(totalYearlyPayroll)}</div>
                </ListRow>

                <ListRow theme={theme}>
                  <div>
                    <div className="title">Total Paid Out</div>
                    <div className="subtitle">Completed bank & cash disbursements</div>
                  </div>
                  <div className="val" style={{ color: '#10b981' }}>{formatCurrency(totalYearlyDisbursed)}</div>
                </ListRow>

                <ListRow theme={theme}>
                  <div>
                    <div className="title">Remaining Liability</div>
                    <div className="subtitle">Unpaid balance carried forward</div>
                  </div>
                  <div className="val" style={{ color: '#ef4444' }}>{formatCurrency(pendingDisbursement)}</div>
                </ListRow>

                <ListRow theme={theme}>
                  <div>
                    <div className="title">Active Loan Recoveries</div>
                    <div className="subtitle">Staff advance loan balance outstanding</div>
                  </div>
                  <div className="val" style={{ color: '#f59e0b' }}>{formatCurrency(totalActiveLoans)}</div>
                </ListRow>
              </div>
            </SectionCard>
          </ChartsRow>

          {/* Rich Staff Salary Summary Table */}
          <SectionCard theme={theme}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: 0 }}>
                <StaffIcon style={{ color: theme.ACCENT, fontSize: 20 }} /> Staff Salary & Disbursement Directory ({staffSummaries.length} Staff)
              </h3>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <Chip
                  label="Active Staff"
                  size="small"
                  color={staffRecordFilter === 'WITH_RECORDS' ? 'primary' : 'default'}
                  onClick={() => setStaffRecordFilter('WITH_RECORDS')}
                  style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.73rem' }}
                />
                <Chip
                  label="All Staff"
                  size="small"
                  color={staffRecordFilter === 'ALL' ? 'primary' : 'default'}
                  onClick={() => setStaffRecordFilter('ALL')}
                  style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.73rem' }}
                />
              </div>
            </div>
            {staffSummaries.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>
                No staff records match the current filter criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <StaffTable theme={theme}>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Basic Pay</th>
                      <th>Net Calculated</th>
                      <th>Total Disbursed</th>
                      <th>Remaining Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffSummaries.map(s => {
                      const isFullyPaid = s.remainingBalance <= 0 && s.totalNetSalary > 0;
                      const isPartial = s.totalPaid > 0 && s.remainingBalance > 0;
                      return (
                        <tr key={s.staffId}>
                          <td style={{ fontWeight: 700 }}>{s.name}</td>
                          <td>
                            <Chip label={s.role} size="small" variant="outlined" style={{ fontSize: '0.72rem' }} />
                          </td>
                          <td>{formatCurrency(s.basicPay)}</td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(s.totalNetSalary)}</td>
                          <td style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(s.totalPaid)}</td>
                          <td style={{ color: s.remainingBalance > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                            {formatCurrency(s.remainingBalance)}
                          </td>
                          <td>
                            {s.totalNetSalary === 0 ? (
                              <span style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY }}>Not Generated</span>
                            ) : isFullyPaid ? (
                              <Chip label="Fully Paid" size="small" color="success" style={{ fontSize: '0.72rem' }} />
                            ) : isPartial ? (
                              <Chip label="Partially Paid" size="small" color="warning" style={{ fontSize: '0.72rem' }} />
                            ) : (
                              <Chip label="Unpaid" size="small" color="error" style={{ fontSize: '0.72rem' }} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 800 }}>
                        TOTAL ({staffSummaries.length} Staff)
                      </td>
                      <td style={{ fontWeight: 800 }}>
                        {formatCurrency(staffSummaries.reduce((sum, s) => sum + s.basicPay, 0))}
                      </td>
                      <td style={{ fontWeight: 800, color: theme.ACCENT }}>
                        {formatCurrency(staffSummaries.reduce((sum, s) => sum + s.totalNetSalary, 0))}
                      </td>
                      <td style={{ fontWeight: 800, color: '#10b981' }}>
                        {formatCurrency(staffSummaries.reduce((sum, s) => sum + s.totalPaid, 0))}
                      </td>
                      <td style={{ fontWeight: 800, color: staffSummaries.reduce((sum, s) => sum + s.remainingBalance, 0) > 0 ? '#ef4444' : '#10b981' }}>
                        {formatCurrency(staffSummaries.reduce((sum, s) => sum + s.remainingBalance, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </StaffTable>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </Container>
  );
};

export default PayrollAnalyticsTab;
