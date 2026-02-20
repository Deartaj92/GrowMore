import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollAdjustment, CreatePayrollAdjustmentInput } from '../../../../types/payroll';
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl as MuiFormControl,
  InputLabel,
  Button,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import CreateAdjustmentModal from './CreateAdjustmentModal';
import {
  PayrollContainer,
  ContentCard,
  TableWrapper,
  StyledTable,
  StatusBadge,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
} from '../../styles';


const PayrollAdjustmentsList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (user?.school_id) {
      loadAdjustments();
    }
  }, [user?.school_id]);

  const loadAdjustments = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getAdjustments(user.school_id, {});
      setAdjustments(data);
    } catch (error: any) {
      console.error('Error loading adjustments:', error);
      showToast('Failed to load adjustments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdjustments = adjustments.filter(adjustment => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!(
        adjustment.staff?.name?.toLowerCase().includes(searchLower) ||
        adjustment.reason?.toLowerCase().includes(searchLower)
      )) {
        return false;
      }
    }
    if (typeFilter !== 'all' && adjustment.adjustmentType !== typeFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <Loader />;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bonus': return '#10b981';
      case 'fine': return '#ef4444';
      case 'extra_cut': return '#f59e0b';
      default: return theme.TEXT_SECONDARY;
    }
  };

  return (
    <PayrollContainer>
      {/* Header matching Generate Payroll tab style */}
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
            <TextField
              size="small"
              placeholder="Search by employee, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Type"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All</MenuItem>
                <MenuItem value="bonus" sx={{ fontSize: '0.75rem' }}>Bonus</MenuItem>
                <MenuItem value="fine" sx={{ fontSize: '0.75rem' }}>Fine</MenuItem>
                <MenuItem value="extra_cut" sx={{ fontSize: '0.75rem' }}>Extra Cut</MenuItem>
                <MenuItem value="other" sx={{ fontSize: '0.75rem' }}>Other</MenuItem>
              </Select>
            </MuiFormControl>
          </Box>

          <Box display="flex" gap={0.75} alignItems="flex-end" sx={{ 
            '@media (max-width: 768px)': { 
              width: '100%',
              flexDirection: 'column',
              alignItems: 'stretch',
            } 
          }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={() => loadAdjustments()}
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
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              Create Adjustment
            </Button>
          </Box>
        </Box>
      </ContentCard>

      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Month/Year</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdjustments.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyStateContainer>
                    <EmptyStateIcon><AddIcon /></EmptyStateIcon>
                    <EmptyStateTitle>{searchTerm ? 'No adjustments found matching your search' : 'No adjustments recorded yet'}</EmptyStateTitle>
                    {!searchTerm && <EmptyStateText>Create adjustments to add bonuses, fines, or other adjustments to employee payrolls.</EmptyStateText>}
                  </EmptyStateContainer>
                </td>
              </tr>
            ) : (
              filteredAdjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td style={{ fontWeight: 500 }}>
                    {adjustment.staff?.name || 'N/A'}
                  </td>
                  <td>
                    <StatusBadge color={getTypeColor(adjustment.adjustmentType)}>
                      {adjustment.adjustmentType.replace('_', ' ')}
                    </StatusBadge>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {adjustment.adjustmentType === 'bonus' ? '+' : '-'}
                    Rs. {adjustment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    {adjustment.payrollMonth}/{adjustment.payrollYear}
                  </td>
                  <td style={{ color: theme.TEXT_SECONDARY, fontSize: '0.8rem' }}>
                    {adjustment.reason}
                  </td>
                  <td>
                    <StatusBadge status={adjustment.isApplied ? 'paid' : 'pending'}>
                      {adjustment.isApplied ? 'Applied' : 'Pending'}
                    </StatusBadge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </StyledTable>
      </TableWrapper>

      {createModalOpen && (
        <CreateAdjustmentModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            loadAdjustments();
            setCreateModalOpen(false);
          }}
        />
      )}
    </PayrollContainer>
  );
};

export default PayrollAdjustmentsList;

