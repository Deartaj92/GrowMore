import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../components/Layout/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { newPayrollService, StaffAdjustment } from '../services/newPayrollService';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Tune as TuneIcon,
  TrendingUp as AddMoneyIcon,
  TrendingDown as CutMoneyIcon,
  CalendarMonth as CalendarIcon,
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

const SelectGroup = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0,0,0,0.03)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
`;

const ActionButton = styled.button<{ theme: any; $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.95rem;
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

const Table = styled.table<{ theme: any }>`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;

  th,
  td {
    padding: 0.85rem 1rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    font-size: 0.85rem;
  }

  th {
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-size: 0.72rem;
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

const TypeBadge = styled.span<{ $type: 'addition' | 'subtraction' }>`
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ $type }) =>
    $type === 'addition' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};
  color: ${({ $type }) => ($type === 'addition' ? '#10b981' : '#ef4444')};
  border: 1px solid
    ${({ $type }) => ($type === 'addition' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)')};
`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyAdjustmentsList: React.FC = () => {
  const { theme: themeMode } = useTheme();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [adjustments, setAdjustments] = useState<StaffAdjustment[]>([]);
  const [allStaff, setAllStaff] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [staffId, setStaffId] = useState<number | ''>('');
  const [adjType, setAdjType] = useState<'addition' | 'subtraction'>('addition');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStaff();
  }, [user?.school_id]);

  useEffect(() => {
    loadAdjustments();
  }, [user?.school_id, selectedMonth, selectedYear]);

  const loadStaff = async () => {
    if (!user?.school_id) return;
    try {
      const { data } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      if (data) {
        setAllStaff(data);
        if (data.length > 0) setStaffId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading staff:', err);
    }
  };

  const loadAdjustments = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const list = await newPayrollService.getMonthlyAdjustments(user.school_id, selectedMonth, selectedYear);
      setAdjustments(list);
    } catch (err: any) {
      console.error('Failed to load adjustments:', err);
      showToast('Error loading adjustments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: 'addition' | 'subtraction') => {
    setAdjType(type);
    setTitle(type === 'addition' ? 'Performance Bonus' : 'Late Arrival Cut');
    setAmount(0);
    setRemarks('');
    setOpenModal(true);
  };

  const handleSaveAdjustment = async () => {
    if (!staffId || !title.trim() || amount <= 0 || !user?.school_id) {
      showToast('Please fill all required adjustment fields', 'error');
      return;
    }
    setSaving(true);
    try {
      await newPayrollService.addMonthlyAdjustment(
        user.school_id,
        Number(staffId),
        selectedMonth,
        selectedYear,
        adjType,
        title,
        amount,
        remarks
      );
      showToast('Monthly adjustment saved!', 'success');
      setOpenModal(false);
      await loadAdjustments();
    } catch (err: any) {
      console.error('Error saving adjustment:', err);
      showToast('Failed to save adjustment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdjustment = async (id: number) => {
    try {
      await newPayrollService.deleteMonthlyAdjustment(id);
      showToast('Adjustment removed', 'success');
      await loadAdjustments();
    } catch (err: any) {
      console.error('Error deleting adjustment:', err);
      showToast('Failed to delete adjustment', 'error');
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <Card theme={theme}>
      <HeaderRow>
        <Title theme={theme}>
          <TuneIcon style={{ color: theme.ACCENT }} /> Monthly Staff Adjustments ({MONTHS[selectedMonth - 1]} {selectedYear})
        </Title>

        <ControlsGroup>
          <SelectGroup theme={theme}>
            <CalendarIcon style={{ fontSize: 18, color: theme.TEXT_SECONDARY }} />
            <Select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              variant="standard"
              disableUnderline
              style={{ fontSize: '0.85rem', color: theme.TEXT_PRIMARY }}
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
              variant="standard"
              disableUnderline
              style={{ fontSize: '0.85rem', color: theme.TEXT_PRIMARY }}
            >
              {years.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </SelectGroup>

          <ActionButton theme={theme} $variant="primary" onClick={() => handleOpenModal('addition')}>
            <AddMoneyIcon style={{ fontSize: 16 }} /> + Add Addition
          </ActionButton>

          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => handleOpenModal('subtraction')}
            startIcon={<CutMoneyIcon style={{ fontSize: 16 }} />}
            style={{ textTransform: 'none', fontWeight: 600 }}
          >
            - Add Subtraction
          </Button>
        </ControlsGroup>
      </HeaderRow>

      {loading ? (
        <div style={{ padding: '2.5rem', textAlign: 'center' }}>
          <CircularProgress size={32} color="primary" />
        </div>
      ) : adjustments.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
          <TuneIcon style={{ fontSize: 42, color: theme.BORDER, marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Adjustments Recorded for {MONTHS[selectedMonth - 1]} {selectedYear}</div>
          <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
            Click <b>"+ Add Addition"</b> or <b>"- Add Subtraction"</b> to apply one-time monthly adjustments.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table theme={theme}>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Adjustment Type</th>
                <th>Title / Reason</th>
                <th>Amount</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(adj => (
                <tr key={adj.id}>
                  <td style={{ fontWeight: 600 }}>{adj.staffName}</td>
                  <td>{adj.role}</td>
                  <td>
                    <TypeBadge $type={adj.type}>
                      {adj.type === 'addition' ? '➕ Addition' : '➖ Subtraction'}
                    </TypeBadge>
                  </td>
                  <td style={{ fontWeight: 600 }}>{adj.title}</td>
                  <td style={{ fontWeight: 700, color: adj.type === 'addition' ? '#10b981' : '#ef4444' }}>
                    {adj.type === 'addition' ? '+' : '-'}{formatCurrency(adj.amount)}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>{adj.remarks || 'N/A'}</td>
                  <td>
                    <IconButton size="small" color="error" onClick={() => handleDeleteAdjustment(adj.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Add Adjustment Modal */}
      {openModal && (
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle style={{ fontWeight: 700, fontSize: '1.05rem', color: adjType === 'addition' ? '#10b981' : '#ef4444' }}>
            {adjType === 'addition' ? '➕ Add One-Time Salary Addition' : '➖ Add One-Time Salary Subtraction'}
          </DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Select Staff Member</InputLabel>
                <Select
                  value={staffId}
                  label="Select Staff Member"
                  onChange={e => setStaffId(Number(e.target.value))}
                >
                  {allStaff.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Adjustment Title / Reason"
                fullWidth
                size="small"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Eid Bonus, Performance Reward, Equipment Cut"
              />

              <TextField
                label="Amount (Rs.)"
                type="number"
                fullWidth
                size="small"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
              />

              <TextField
                label="Remarks / Notes (Optional)"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>
          </DialogContent>
          <DialogActions style={{ padding: '1rem 1.5rem' }}>
            <Button onClick={() => setOpenModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAdjustment}
              variant="contained"
              color={adjType === 'addition' ? 'primary' : 'error'}
              disabled={saving}
              style={{ fontWeight: 700, textTransform: 'none' }}
            >
              {saving ? <CircularProgress size={18} color="inherit" /> : 'Save Adjustment'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Card>
  );
};

export default MonthlyAdjustmentsList;
