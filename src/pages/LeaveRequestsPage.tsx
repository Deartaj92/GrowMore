import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';
import { supabase } from '../supabaseClient';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';
import { formatAppDate, formatAppDateTime, formatAppTime } from '../utils/dateUtils';
import { activityTrackingService } from '../services/activityTrackingService';
import AppDateField from '../components/shared/AppDateField';
import {
  EventBusy as EventBusyIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle,
  Cancel,
  Pending,
  Person as PersonIcon,
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  FilterList as FilterIcon,
  LocalHospital as SickIcon,
  PersonOutline as PersonalIcon,
  Warning as EmergencyIcon,
  Event as FamilyEventIcon,
  MoreHoriz as OtherIcon,
  Visibility as ViewIcon,
  ExpandMore,
  ExpandLess,
  Info as InfoIcon,
} from '@mui/icons-material';
import Loader from '../components/Loader';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  Grid,
} from '@mui/material';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    gap: 0.2rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    margin-bottom: 0.2rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    flex-shrink: 0;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }
`;

const StatCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1rem;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.05)'};
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    margin-bottom: 0.4rem;
  }
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color || '#3b82f6'};
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const FiltersContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.25rem;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.05)'};
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
  
  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }
`;

const SelectFilter = styled.select`
  padding: 0.6rem 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    min-width: 120px;
  }
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.05)'};
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  padding-bottom: 8px;
  
  @media (max-width: 768px) {
    overflow-x: visible;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// Mobile Card Layout
const MobileCardContainer = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }
`;

const MobileCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}40;
  }
`;

const MobileCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
`;

const MobileCardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
`;

const MobileCardName = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MobileCardId = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 400;
  margin-left: 0.25rem;
`;

const MobileCardStatus = styled.div`
  flex-shrink: 0;
`;

const MobileCardInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  font-size: 0.8rem;
  padding-top: 0.375rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
`;

const MobileCardInfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1 1 auto;
  min-width: 0;
`;

const MobileCardInfoLabel = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  white-space: nowrap;
`;

const MobileCardInfoValue = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.3rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MobileCardReason = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.4;
  padding-top: 0.375rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
`;

const MobileCardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  margin-top: 0.25rem;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#f8f9fa'};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.75rem;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $status?: string }>`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#f8f9fa'};
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.85rem;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  
  ${({ $status, theme }) => {
    if ($status === 'approved') {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)'};
        color: #22c55e;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.3)'};
      `;
    } else if ($status === 'rejected') {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)'};
        color: #ef4444;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'};
      `;
    } else if ($status === 'cancelled') {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(107,114,128,0.2)' : 'rgba(107,114,128,0.1)'};
        color: #6b7280;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(107,114,128,0.4)' : 'rgba(107,114,128,0.3)'};
      `;
    } else {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.1)'};
        color: #fbbf24;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(251,191,36,0.4)' : 'rgba(251,191,36,0.3)'};
      `;
    }
  }}
`;

const ActionButton = styled.button<{ $variant?: 'approve' | 'reject' | 'view' }>`
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  
  ${({ $variant, theme }) => {
    if ($variant === 'approve') {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)'};
        color: #22c55e;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.3)'};
        
        &:hover {
          background: ${theme.BG === '#252525' ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)'};
        }
      `;
    } else if ($variant === 'reject') {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)'};
        color: #ef4444;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'};
        
        &:hover {
          background: ${theme.BG === '#252525' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.15)'};
        }
      `;
    } else {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'};
        color: #6366f1;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)'};
        
        &:hover {
          background: ${theme.BG === '#252525' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)'};
        }
      `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#f8f9fa'};
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PaginationButton = styled.button`
  padding: 0.4rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.ACCENT};
    color: white;
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
  }
`;

const PageInput = styled.input`
  width: 60px;
  padding: 0.4rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  text-align: center;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    width: 50px;
    padding: 0.35rem;
    font-size: 0.75rem;
  }
`;

const LeaveTypeBadge = styled.span<{ $type: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
  background: ${({ $type, theme }) => {
    const colors: Record<string, string> = {
      sick: theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
      personal: theme.BG === '#252525' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
      emergency: theme.BG === '#252525' ? 'rgba(245,101,101,0.2)' : 'rgba(245,101,101,0.1)',
      family_event: theme.BG === '#252525' ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)',
      other: theme.BG === '#252525' ? 'rgba(107,114,128,0.2)' : 'rgba(107,114,128,0.1)',
    };
    return colors[$type] || colors.other;
  }};
  color: ${({ $type }) => {
    const colors: Record<string, string> = {
      sick: '#ef4444',
      personal: '#6366f1',
      emergency: '#f56565',
      family_event: '#22c55e',
      other: '#6b7280',
    };
    return colors[$type] || colors.other;
  }};
  border: 1px solid ${({ $type, theme }) => {
    const colors: Record<string, string> = {
      sick: theme.BG === '#252525' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)',
      personal: theme.BG === '#252525' ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)',
      emergency: theme.BG === '#252525' ? 'rgba(245,101,101,0.4)' : 'rgba(245,101,101,0.3)',
      family_event: theme.BG === '#252525' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.3)',
      other: theme.BG === '#252525' ? 'rgba(107,114,128,0.4)' : 'rgba(107,114,128,0.3)',
    };
    return colors[$type] || colors.other;
  }};
`;

const DaysBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'};
  color: #6366f1;
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)'};
  margin-left: 0.5rem;
`;

const ReasonCell = styled.div`
  position: relative;
  max-width: 250px;
  cursor: pointer;
`;

const ReasonText = styled.div<{ $expanded?: boolean }>`
  overflow: ${({ $expanded }) => $expanded ? 'visible' : 'hidden'};
  text-overflow: ${({ $expanded }) => $expanded ? 'clip' : 'ellipsis'};
  white-space: ${({ $expanded }) => $expanded ? 'normal' : 'nowrap'};
  font-size: 0.85rem;
  line-height: 1.4;
  ${({ $expanded }) => $expanded && `
    max-width: 100%;
    word-wrap: break-word;
  `}
`;

const ExpandButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem 0.4rem;
  margin-top: 0.25rem;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)'};
  }
`;

const ReviewInfo = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.25rem;
  
  .reviewer {
    font-weight: 500;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
  
  .review-date {
    font-size: 0.75rem;
    margin-top: 0.15rem;
  }
`;

// ===== MAIN COMPONENT =====

interface LeaveRequest {
  id: number;
  student_id: number | null;
  staff_id: number | null;
  school_id: number;
  session_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: string;
  requested_by_id: number;
  requested_by_name: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  students?: {
    id: number;
    name: string;
    roll_number: string | null;
    classes?: {
      id: number;
      name: string;
      has_sections: boolean;
    };
    sections?: {
      id: number;
      name: string;
    };
  };
  staff?: {
    id: number;
    name: string;
    role: string;
  };
  reviewer?: {
    id: number;
    name: string;
  };
}

const LeaveRequestsPage: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setFooterContent } = usePageFooter();
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Expanded reasons
  const [expandedReasons, setExpandedReasons] = useState<Set<number>>(new Set());
  
  // Fetch active session
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!user?.school_id) return;
      
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('is_active', true)
          .single();
        
        if (error) throw error;
        if (data) setActiveSessionId(data.id);
      } catch (error: any) {
        console.error('Error fetching active session:', error);
      }
    };
    
    fetchActiveSession();
  }, [user?.school_id]);
  
  // Fetch classes and sections
  useEffect(() => {
    const fetchClassesAndSections = async () => {
      if (!user?.school_id) return;
      
      try {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', user.school_id)
          .order('name');
        
        if (classesError) throw classesError;
        if (classesData) {
          setClasses(classesData);
        }
        
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('sections')
          .select('*')
          .eq('school_id', user.school_id)
          .order('name');
        
        if (sectionsError) throw sectionsError;
        if (sectionsData) {
          setSections(sectionsData);
        }
      } catch (error: any) {
        console.error('Error fetching classes and sections:', error);
      }
    };
    
    fetchClassesAndSections();
  }, [user?.school_id]);
  
  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    if (!user?.school_id || !activeSessionId) {
      setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          students:student_id (
            id,
            name,
            roll_number,
            classes:class_id (
              id,
              name,
              has_sections
            ),
            sections:section_id (
              id,
              name
            )
          ),
          reviewer:users!reviewed_by (
            id,
            name
          )
        `)
        .eq('school_id', user.school_id)
        .eq('session_id', activeSessionId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Enrich with staff data if staff_id is present
      if (data && data.length > 0) {
        const staffIds = data
          .filter((req: any) => req.staff_id)
          .map((req: any) => req.staff_id)
          .filter((id: number, index: number, self: number[]) => self.indexOf(id) === index); // Unique IDs
        
        if (staffIds.length > 0) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('id, name, role')
            .in('id', staffIds);
          
          if (staffData) {
            const staffMap = new Map(staffData.map((s: any) => [s.id, s]));
            data.forEach((req: any) => {
              if (req.staff_id && staffMap.has(req.staff_id)) {
                req.staff = staffMap.get(req.staff_id);
              }
            });
          }
        }
      }
      
      setLeaveRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      showToast('Failed to fetch leave requests: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsLoadingData(false);
    }
  };
  
  useEffect(() => {
    if (activeSessionId) {
      fetchLeaveRequests();
    }
  }, [activeSessionId, user?.school_id]);
  
  // Filter leave requests
  const filteredRequests = useMemo(() => {
    let filtered = [...leaveRequests];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(request => {
        const studentName = request.students?.name?.toLowerCase() || '';
        const studentId = request.students?.roll_number?.toLowerCase() || '';
        const staffName = request.staff?.name?.toLowerCase() || '';
        const staffRole = request.staff?.role?.toLowerCase() || '';
        const reason = request.reason?.toLowerCase() || '';
        const requestedBy = request.requested_by_name?.toLowerCase() || '';
        return studentName.includes(query) || 
               studentId.includes(query) || 
               staffName.includes(query) ||
               staffRole.includes(query) ||
               reason.includes(query) ||
               requestedBy.includes(query);
      });
    }
    
    // Class filter (only applies to student requests)
    if (selectedClass) {
      filtered = filtered.filter(request => {
        if (request.staff_id) return false; // Staff requests don't have classes
        return request.students?.classes?.id === parseInt(selectedClass);
      });
    }
    
    // Section filter (only applies to student requests)
    if (selectedSection) {
      filtered = filtered.filter(request => {
        if (request.staff_id) return false; // Staff requests don't have sections
        return request.students?.sections?.id === parseInt(selectedSection);
      });
    }
    
    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(request => request.status === selectedStatus);
    }
    
    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(request => 
        new Date(request.start_date) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(request => 
        new Date(request.end_date) <= new Date(dateTo)
      );
    }
    
    return filtered;
  }, [leaveRequests, searchQuery, selectedClass, selectedSection, selectedStatus, dateFrom, dateTo]);
  
  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClass, selectedSection, selectedStatus, dateFrom, dateTo]);
  
  // Set footer content for global footer
  useEffect(() => {
    if (filteredRequests.length > 0) {
      const FooterContentComponent = React.memo(() => {
        const from = ((currentPage - 1) * itemsPerPage) + 1;
        const to = Math.min(currentPage * itemsPerPage, filteredRequests.length);
        const total = filteredRequests.length;
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            width: '100%',
            gap: isMobile ? '0.5rem' : '1rem',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
            <PaginationInfo theme={theme} style={{ fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
              Showing {from} to {to} of {total} requests
            </PaginationInfo>
            <PaginationControls>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </PaginationButton>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </PaginationButton>
              <span style={{ color: theme.TEXT_SECONDARY, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                Page{' '}
                <PageInput
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  theme={theme}
                />
                {' '}of {totalPages}
              </span>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </PaginationButton>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </PaginationButton>
            </PaginationControls>
          </div>
        );
      });

      setFooterContent({
        visible: true,
        content: <FooterContentComponent />
      });

      return () => {
        setFooterContent(null);
      };
    } else {
      setFooterContent(null);
    }
  }, [filteredRequests.length, currentPage, totalPages, itemsPerPage, isMobile, theme, setFooterContent]);
  
  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = filteredRequests.length;
    const pending = filteredRequests.filter(r => r.status === 'pending').length;
    const approved = filteredRequests.filter(r => r.status === 'approved').length;
    const rejected = filteredRequests.filter(r => r.status === 'rejected').length;
    
    return { total, pending, approved, rejected };
  }, [filteredRequests]);
  
  // Helper functions
  const formatDate = (dateStr: string) => {
    return formatAppDate(dateStr);
  };
  
  const formatDateTime = (dateStr: string) => {
    return formatAppDateTime(dateStr);
  };
  
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
  };
  
  const getStudentDisplay = (request: LeaveRequest) => {
    const student = request.students;
    if (!student) return 'Unknown Student';
    
    const displayId = getStudentDisplayId({ id: student.id, roll_number: student.roll_number });
    return `${student.name} (S${user?.school_id}-${displayId})`;
  };
  
  const getStudentClass = (request: LeaveRequest) => {
    const student = request.students;
    if (!student) return '-';
    
    const className = student.classes?.name || '';
    const sectionName = student.sections?.name || '';
    const hasSections = student.classes?.has_sections;
    
    if (hasSections && sectionName) {
      return `${className} - ${sectionName}`;
    }
    return className || '-';
  };
  
  const getLeaveTypeIcon = (leaveType: string) => {
    switch (leaveType) {
      case 'sick':
        return <SickIcon style={{ fontSize: '1rem' }} />;
      case 'personal':
        return <PersonalIcon style={{ fontSize: '1rem' }} />;
      case 'emergency':
        return <EmergencyIcon style={{ fontSize: '1rem' }} />;
      case 'family_event':
        return <FamilyEventIcon style={{ fontSize: '1rem' }} />;
      default:
        return <OtherIcon style={{ fontSize: '1rem' }} />;
    }
  };
  
  const getLeaveTypeLabel = (leaveType: string) => {
    return leaveType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const handleReview = async (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    setReviewModalOpen(true);
    
    // Mark as read when viewing
    if (!request.is_read) {
      try {
        await supabase
          .from('leave_requests')
          .update({ is_read: true })
          .eq('id', request.id);
        // Update local state
        request.is_read = true;
      } catch (error) {
        console.error('Error marking leave request as read:', error);
      }
    }
  };
  
  const handleViewDetails = async (request: LeaveRequest) => {
    setSelectedRequest(request);
    setReviewAction(null);
    setReviewNotes(request.review_notes || '');
    setReviewModalOpen(true);
    
    // Mark as read when viewing
    if (!request.is_read) {
      try {
        await supabase
          .from('leave_requests')
          .update({ is_read: true })
          .eq('id', request.id);
        // Update local state
        request.is_read = true;
      } catch (error) {
        console.error('Error marking leave request as read:', error);
      }
    }
  };
  
  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewAction || !user?.id || !user?.school_id) {
      return;
    }
    
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: reviewAction === 'approve' ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
          is_read: true, // Mark as read when reviewed
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);
      
      if (error) throw error;
      
      // Create notification for the requester
      try {
        await createLeaveRequestNotification(
          selectedRequest, 
          reviewAction === 'approve' ? 'approved' : 'rejected', 
          user.school_id,
          reviewNotes
        );
      } catch (notificationError) {
        // Don't fail the review if notification fails
        console.error('Error creating notification:', notificationError);
      }
      
      showToast(
        `Leave request ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully!`,
        'success'
      );
      
      setReviewModalOpen(false);
      setSelectedRequest(null);
      setReviewAction(null);
      setReviewNotes('');
      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      showToast('Failed to submit review: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  // Create notification for leave request approval/rejection
  const createLeaveRequestNotification = async (
    request: LeaveRequest,
    status: 'approved' | 'rejected',
    schoolId: number,
    reviewNotes?: string
  ) => {
    try {
      const isStaffRequest = !!request.staff_id || request.requested_by === 'staff';
      const student = request.students;
      const staff = request.staff;
      
      let subjectName = '';
      let subjectIdentifier = '';
      let recipientId: number | null = null;
      let familyRecipientId: number | null = null;
      
      if (isStaffRequest && staff) {
        subjectName = staff.name || 'Staff';
        subjectIdentifier = staff.role || '';
      } else if (student) {
        subjectName = student.name || 'Student';
        subjectIdentifier = student ? String(getStudentDisplayId({ id: student.id, roll_number: student.roll_number })) : '';
      }
      
      const leaveType = getLeaveTypeLabel(request.leave_type);
      const dateRange = `${formatDate(request.start_date)} - ${formatDate(request.end_date)}`;
      
      const title = `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`;
      const message = isStaffRequest
        ? `Your leave request - ${leaveType} from ${dateRange} has been ${status}.${reviewNotes ? `\n\nNote: ${reviewNotes}` : ''}`
        : `Your leave request for ${subjectName} (${subjectIdentifier}) - ${leaveType} from ${dateRange} has been ${status}.${reviewNotes ? `\n\nNote: ${reviewNotes}` : ''}`;
      
      // Determine recipient based on who requested the leave
      if (request.requested_by === 'student') {
        // For students: requested_by_id is the student_id
        // Notifications table supports student IDs directly in recipient_id field
        if (request.requested_by_id) {
          recipientId = request.requested_by_id;
        } else {
          // Fallback: use student_id from the request if requested_by_id is missing
          recipientId = request.student_id;
        }
      } else if (request.requested_by === 'parent') {
        // For parents: requested_by_id is the family_id
        // Use family_recipient_id to send notification to the family
        if (request.requested_by_id) {
          familyRecipientId = request.requested_by_id;
        } else {
          // Fallback: try to find family_id from the student
          if (request.student_id) {
            const { data: familyMember } = await supabase
              .from('family_members')
              .select('family_id')
              .eq('student_id', request.student_id)
              .eq('school_id', schoolId)
              .limit(1)
              .maybeSingle();
            
            if (familyMember?.family_id) {
              familyRecipientId = familyMember.family_id;
            }
          }
        }
      } else if (request.requested_by === 'staff') {
        // For staff/employees: requested_by_id is the staff_id
        // Need to find the user.id (from users table) linked to this staff_id
        const staffIdToLookup = request.staff_id || request.requested_by_id;
        if (staffIdToLookup) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('staff_id', staffIdToLookup)
            .eq('school_id', schoolId)
            .maybeSingle();
          
          if (userData) {
            recipientId = userData.id;
          } else {
            console.warn(`No user account found for staff_id: ${staffIdToLookup}. Staff may not have a user account.`);
          }
        }
      }
      
      // Create notification if we have a valid recipient
      if (recipientId || familyRecipientId) {
        const notificationData: any = {
          school_id: schoolId,
          notification_type: 'leave_request',
          title: title,
          message: message,
          is_read: false,
          is_important: status === 'rejected', // Rejections are more important
          created_at: new Date().toISOString(),
        };
        
        if (recipientId) {
          notificationData.recipient_id = recipientId;
        }
        if (familyRecipientId) {
          notificationData.family_recipient_id = familyRecipientId;
        }
        
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData);
        
        if (notifError) {
          console.error('Error creating leave request notification:', notifError);
          console.error('Notification data:', notificationData);
          console.error('Request details:', {
            requestedBy: request.requested_by,
            requestedById: request.requested_by_id,
            studentId: request.student_id,
            staffId: request.staff_id
          });
        } else {
          console.log('Leave request notification created successfully:', {
            recipientId,
            familyRecipientId,
            requestedBy: request.requested_by,
            status,
            notificationId: notificationData.id
          });
        }
      } else {
        console.warn('No recipient found for leave request notification:', {
          requestedBy: request.requested_by,
          requestedById: request.requested_by_id,
          studentId: request.student_id,
          staffId: request.staff_id,
          requestId: request.id
        });
      }
    } catch (error: any) {
      console.error('Error in createLeaveRequestNotification:', error);
      console.error('Request details:', {
        requestedBy: request.requested_by,
        requestedById: request.requested_by_id,
        studentId: request.student_id,
        staffId: request.staff_id
      });
      // Don't throw - notification failure shouldn't break the review process
    }
  };
  
  const getFilteredSections = useMemo(() => {
    if (!selectedClass) return sections;
    return sections.filter(s => s.class_id === parseInt(selectedClass));
  }, [sections, selectedClass]);
  
  // Clear section when class changes
  useEffect(() => {
    if (selectedClass) {
      setSelectedSection('');
    }
  }, [selectedClass]);
  
  // Set footer loading state when loading
  useEffect(() => {
    if (isLoadingData) {
      setFooterContent({
        visible: true,
        loading: true,
      });
    } else {
      setFooterContent(null);
    }
  }, [isLoadingData, setFooterContent]);
  
  if (isLoadingData) {
    return <Loader />;
  }
  
  return (
    <PageContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <EventBusyIcon />
          Leave Requests Management
        </HeaderTitle>
        <HeaderActions>
          <RefreshButton theme={theme} onClick={fetchLeaveRequests}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </Header>
      
      {/* Summary Statistics */}
      <StatsGrid>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Requests</StatLabel>
          <StatValue theme={theme} $color="#3b82f6">{summaryStats.total}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Pending</StatLabel>
          <StatValue theme={theme} $color="#fbbf24">{summaryStats.pending}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Approved</StatLabel>
          <StatValue theme={theme} $color="#22c55e">{summaryStats.approved}</StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Rejected</StatLabel>
          <StatValue theme={theme} $color="#ef4444">{summaryStats.rejected}</StatValue>
        </StatCard>
      </StatsGrid>
      
      {/* Filters */}
      <FiltersContainer theme={theme}>
        <FilterRow>
          <SearchContainer>
            <SearchIcon style={{ color: theme.TEXT_SECONDARY, fontSize: '1.2rem' }} />
            <SearchInput
              type="text"
              placeholder="Search by name, ID, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              theme={theme}
            />
          </SearchContainer>
          
          <SelectFilter
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            theme={theme}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </SelectFilter>
          
          <SelectFilter
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            theme={theme}
            disabled={!selectedClass}
          >
            <option value="">All Sections</option>
            {getFilteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </SelectFilter>
          
          <SelectFilter
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            theme={theme}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </SelectFilter>
          
          <AppDateField
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            fullWidth={false}
            textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 170 } }}
          />
          
          <AppDateField
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            fullWidth={false}
            textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 170 } }}
          />
        </FilterRow>
      </FiltersContainer>
      
      {/* Table */}
      <TableContainer theme={theme}>
        <TableWrapper>
          {/* Desktop Table */}
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell theme={theme}>Request ID</TableHeaderCell>
                <TableHeaderCell theme={theme}>Name</TableHeaderCell>
                <TableHeaderCell theme={theme}>Class/Section/Role</TableHeaderCell>
                <TableHeaderCell theme={theme}>Leave Type</TableHeaderCell>
                <TableHeaderCell theme={theme}>Dates</TableHeaderCell>
                <TableHeaderCell theme={theme}>Reason</TableHeaderCell>
                <TableHeaderCell theme={theme}>Requested By</TableHeaderCell>
                <TableHeaderCell theme={theme}>Status</TableHeaderCell>
                <TableHeaderCell theme={theme}>Requested On</TableHeaderCell>
                <TableHeaderCell theme={theme}>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedRequests.length === 0 ? (
                <tr>
                  <TableCell colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: theme.TEXT_SECONDARY }}>
                    No leave requests found
                  </TableCell>
                </tr>
              ) : (
                paginatedRequests.map((request) => (
                  <TableRow key={request.id} theme={theme}>
                    <TableCell theme={theme}>#{request.id}</TableCell>
                    <TableCell theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PersonIcon style={{ fontSize: '1rem', color: theme.TEXT_SECONDARY }} />
                        <div>
                          {request.staff_id && request.staff ? (
                            <>
                              <div style={{ fontWeight: 500 }}>{request.staff.name || 'Unknown Staff'}</div>
                              <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                                {request.staff.role || 'Staff'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 500 }}>{request.students?.name || 'Unknown'}</div>
                              <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                                {request.students?.roll_number ? `S${user?.school_id}-${getStudentDisplayId({ id: request.students.id, roll_number: request.students.roll_number })}` : '-'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SchoolIcon style={{ fontSize: '1rem', color: theme.TEXT_SECONDARY }} />
                        {request.staff_id && request.staff ? (
                          <span>{request.staff.role || 'Staff'}</span>
                        ) : (
                          getStudentClass(request)
                        )}
                      </div>
                    </TableCell>
                    <TableCell theme={theme}>
                      <LeaveTypeBadge $type={request.leave_type} theme={theme}>
                        {getLeaveTypeIcon(request.leave_type)}
                        {getLeaveTypeLabel(request.leave_type)}
                      </LeaveTypeBadge>
                    </TableCell>
                    <TableCell theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <CalendarIcon style={{ fontSize: '1rem', color: theme.TEXT_SECONDARY }} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                          </div>
                          <DaysBadge theme={theme}>
                            <AccessTimeIcon style={{ fontSize: '0.7rem' }} />
                            {calculateDays(request.start_date, request.end_date)} {calculateDays(request.start_date, request.end_date) === 1 ? 'day' : 'days'}
                          </DaysBadge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell theme={theme} style={{ maxWidth: '250px' }}>
                      <ReasonCell>
                        <ReasonText 
                          $expanded={expandedReasons.has(request.id)}
                          theme={theme}
                        >
                          {request.reason}
                        </ReasonText>
                        {request.reason.length > 50 && (
                          <ExpandButton
                            theme={theme}
                            onClick={() => {
                              const newExpanded = new Set(expandedReasons);
                              if (newExpanded.has(request.id)) {
                                newExpanded.delete(request.id);
                              } else {
                                newExpanded.add(request.id);
                              }
                              setExpandedReasons(newExpanded);
                            }}
                          >
                            {expandedReasons.has(request.id) ? (
                              <>
                                <ExpandLess style={{ fontSize: '0.9rem' }} />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ExpandMore style={{ fontSize: '0.9rem' }} />
                                Show More
                              </>
                            )}
                          </ExpandButton>
                        )}
                      </ReasonCell>
                    </TableCell>
                    <TableCell theme={theme}>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div>{request.requested_by_name || '-'}</div>
                        <div style={{ color: theme.TEXT_SECONDARY, fontSize: '0.75rem' }}>
                          ({request.requested_by})
                        </div>
                      </div>
                    </TableCell>
                    <TableCell theme={theme}>
                      <div>
                        <StatusBadge $status={request.status} theme={theme}>
                          {request.status === 'approved' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                          {request.status === 'rejected' && <Cancel style={{ fontSize: '0.9rem' }} />}
                          {request.status === 'pending' && <Pending style={{ fontSize: '0.9rem' }} />}
                          {request.status === 'cancelled' && <Cancel style={{ fontSize: '0.9rem' }} />}
                          {request.status}
                        </StatusBadge>
                        {request.status !== 'pending' && request.reviewer && (
                          <ReviewInfo theme={theme}>
                            <div className="reviewer">
                              Reviewed by: {request.reviewer.name}
                            </div>
                            {request.reviewed_at && (
                              <div className="review-date">
                                {formatDateTime(request.reviewed_at)}
                              </div>
                            )}
                          </ReviewInfo>
                        )}
                      </div>
                    </TableCell>
                    <TableCell theme={theme}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AccessTimeIcon style={{ fontSize: '0.9rem', color: theme.TEXT_SECONDARY }} />
                          {formatDate(request.created_at)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                          {formatAppTime(request.created_at)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell theme={theme}>
                      <ActionButtons>
                        {request.status === 'pending' && (
                          <>
                            <ActionButton
                              $variant="approve"
                              theme={theme}
                              onClick={() => handleReview(request, 'approve')}
                            >
                              <CheckCircle style={{ fontSize: '0.9rem' }} />
                              Approve
                            </ActionButton>
                            <ActionButton
                              $variant="reject"
                              theme={theme}
                              onClick={() => handleReview(request, 'reject')}
                            >
                              <Cancel style={{ fontSize: '0.9rem' }} />
                              Reject
                            </ActionButton>
                          </>
                        )}
                        {request.status !== 'pending' && (
                          <ActionButton
                            $variant="view"
                            theme={theme}
                            onClick={() => handleViewDetails(request)}
                            title={request.review_notes ? 'View review notes' : 'View details'}
                          >
                            <ViewIcon style={{ fontSize: '0.9rem' }} />
                            {request.review_notes ? 'View Notes' : 'View Details'}
                          </ActionButton>
                        )}
                      </ActionButtons>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Mobile Card Layout */}
          <MobileCardContainer theme={theme}>
            {paginatedRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: theme.TEXT_SECONDARY, fontSize: '0.9rem' }}>
                No leave requests found
              </div>
            ) : (
              paginatedRequests.map((request) => (
                <MobileCard key={request.id} theme={theme}>
                  <MobileCardHeader theme={theme}>
                    <MobileCardTitle theme={theme}>
                      <PersonIcon style={{ fontSize: '0.9rem', color: theme.TEXT_SECONDARY, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <MobileCardName theme={theme}>
                          {request.staff_id && request.staff 
                            ? request.staff.name || 'Unknown Staff'
                            : request.students?.name || 'Unknown'}
                          <MobileCardId theme={theme}>
                            #{request.id}
                            {request.students?.roll_number && ` • S${user?.school_id}-${getStudentDisplayId({ id: request.students.id, roll_number: request.students.roll_number })}`}
                          </MobileCardId>
                        </MobileCardName>
                      </div>
                    </MobileCardTitle>
                    <MobileCardStatus theme={theme}>
                      <StatusBadge $status={request.status} theme={theme} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                        {request.status === 'approved' && <CheckCircle style={{ fontSize: '0.75rem' }} />}
                        {request.status === 'rejected' && <Cancel style={{ fontSize: '0.75rem' }} />}
                        {request.status === 'pending' && <Pending style={{ fontSize: '0.75rem' }} />}
                        {request.status === 'cancelled' && <Cancel style={{ fontSize: '0.75rem' }} />}
                        {request.status}
                      </StatusBadge>
                    </MobileCardStatus>
                  </MobileCardHeader>
                  
                  <MobileCardInfo theme={theme}>
                    <MobileCardInfoItem theme={theme}>
                      <SchoolIcon style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }} />
                      <MobileCardInfoLabel theme={theme}>Class:</MobileCardInfoLabel>
                      <MobileCardInfoValue theme={theme}>
                        {request.staff_id && request.staff 
                          ? request.staff.role || 'Staff'
                          : getStudentClass(request)}
                      </MobileCardInfoValue>
                    </MobileCardInfoItem>
                    
                    <MobileCardInfoItem theme={theme}>
                      <MobileCardInfoLabel theme={theme}>Type:</MobileCardInfoLabel>
                      <MobileCardInfoValue theme={theme}>
                        <LeaveTypeBadge $type={request.leave_type} theme={theme} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                          {getLeaveTypeIcon(request.leave_type)}
                          {getLeaveTypeLabel(request.leave_type)}
                        </LeaveTypeBadge>
                      </MobileCardInfoValue>
                    </MobileCardInfoItem>
                    
                    <MobileCardInfoItem theme={theme}>
                      <CalendarIcon style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }} />
                      <MobileCardInfoLabel theme={theme}>Dates:</MobileCardInfoLabel>
                      <MobileCardInfoValue theme={theme}>
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                      </MobileCardInfoValue>
                    </MobileCardInfoItem>
                    
                    <MobileCardInfoItem theme={theme}>
                      <AccessTimeIcon style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }} />
                      <MobileCardInfoLabel theme={theme}>Days:</MobileCardInfoLabel>
                      <MobileCardInfoValue theme={theme}>
                        {calculateDays(request.start_date, request.end_date)}
                      </MobileCardInfoValue>
                    </MobileCardInfoItem>
                    
                    <MobileCardInfoItem theme={theme}>
                      <MobileCardInfoLabel theme={theme}>By:</MobileCardInfoLabel>
                      <MobileCardInfoValue theme={theme}>
                        {request.requested_by_name || '-'} ({request.requested_by})
                      </MobileCardInfoValue>
                    </MobileCardInfoItem>
                    
                    <MobileCardInfoItem theme={theme}>
                      <AccessTimeIcon style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }} />
                      <MobileCardInfoLabel theme={theme}>On:</MobileCardInfoLabel>
                      <MobileCardInfoValue theme={theme}>
                        {formatDate(request.created_at)}
                      </MobileCardInfoValue>
                    </MobileCardInfoItem>
                  </MobileCardInfo>
                  
                  <MobileCardReason theme={theme}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
                      <span style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY, fontWeight: 500, marginTop: '0.1rem', flexShrink: 0 }}>Reason:</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {expandedReasons.has(request.id) ? (
                          <>
                            <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>{request.reason}</div>
                            {request.reason.length > 60 && (
                              <ExpandButton
                                theme={theme}
                                onClick={() => {
                                  const newExpanded = new Set(expandedReasons);
                                  newExpanded.delete(request.id);
                                  setExpandedReasons(newExpanded);
                                }}
                                style={{ marginTop: '0.25rem', fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                              >
                                <ExpandLess style={{ fontSize: '0.7rem' }} />
                                Less
                              </ExpandButton>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                              {request.reason.length > 60 ? `${request.reason.substring(0, 60)}...` : request.reason}
                            </div>
                            {request.reason.length > 60 && (
                              <ExpandButton
                                theme={theme}
                                onClick={() => {
                                  const newExpanded = new Set(expandedReasons);
                                  newExpanded.add(request.id);
                                  setExpandedReasons(newExpanded);
                                }}
                                style={{ marginTop: '0.25rem', fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                              >
                                <ExpandMore style={{ fontSize: '0.7rem' }} />
                                More
                              </ExpandButton>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </MobileCardReason>
                  
                  {request.status !== 'pending' && request.reviewer && (
                    <div style={{ 
                      fontSize: '0.75rem',
                      color: theme.TEXT_SECONDARY,
                      paddingTop: '0.375rem',
                      borderTop: `1px solid ${theme.BORDER}`
                    }}>
                      <span style={{ fontWeight: 500 }}>Reviewed by {request.reviewer.name}</span>
                      {request.reviewed_at && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          • {formatDateTime(request.reviewed_at)}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <MobileCardActions theme={theme}>
                    {request.status === 'pending' && (
                      <>
                        <ActionButton
                          $variant="approve"
                          theme={theme}
                          onClick={() => handleReview(request, 'approve')}
                          style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.45rem' }}
                        >
                          <CheckCircle style={{ fontSize: '0.8rem' }} />
                          Approve
                        </ActionButton>
                        <ActionButton
                          $variant="reject"
                          theme={theme}
                          onClick={() => handleReview(request, 'reject')}
                          style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.45rem' }}
                        >
                          <Cancel style={{ fontSize: '0.8rem' }} />
                          Reject
                        </ActionButton>
                      </>
                    )}
                    {request.status !== 'pending' && (
                      <ActionButton
                        $variant="view"
                        theme={theme}
                        onClick={() => handleViewDetails(request)}
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.45rem' }}
                      >
                        <ViewIcon style={{ fontSize: '0.8rem' }} />
                        View Details
                      </ActionButton>
                    )}
                  </MobileCardActions>
                </MobileCard>
              ))
            )}
          </MobileCardContainer>
        </TableWrapper>
      </TableContainer>
      
      {/* Review Modal */}
      <Dialog
        open={reviewModalOpen}
        onClose={() => {
          if (!isSubmittingReview) {
            setReviewModalOpen(false);
            setSelectedRequest(null);
            setReviewAction(null);
            setReviewNotes('');
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: theme.CARD,
            color: theme.TEXT_PRIMARY,
          }
        }}
      >
        <DialogTitle sx={{ 
          color: theme.TEXT_PRIMARY,
          borderBottom: `1px solid ${theme.BORDER}`,
          pb: 2
        }}>
          {reviewAction === 'approve' ? 'Approve' : reviewAction === 'reject' ? 'Reject' : 'Review'} Leave Request
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRequest && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ mb: 2, p: 1.5, bgcolor: isDark(theme) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <span style={{ color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>Student:</span>
                  <span style={{ fontWeight: 500 }}>{getStudentDisplay(selectedRequest)}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <span style={{ color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>Leave Type:</span>
                  <span style={{ textTransform: 'capitalize' }}>{selectedRequest.leave_type.replace('_', ' ')}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <span style={{ color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>Dates:</span>
                  <span>{formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>Reason:</span>
                  <span style={{ fontSize: '0.85rem', textAlign: 'right', maxWidth: '60%' }}>{selectedRequest.reason}</span>
                </Box>
              </Box>
              
              {reviewAction && (
                <TextField
                  label="Review Notes (Optional)"
                  multiline
                  rows={4}
                  fullWidth
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes or comments about this leave request..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: theme.TEXT_PRIMARY,
                      '& fieldset': {
                        borderColor: theme.BORDER,
                      },
                      '&:hover fieldset': {
                        borderColor: theme.ACCENT,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme.ACCENT,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: theme.TEXT_SECONDARY,
                    },
                  }}
                />
              )}
              
              {!reviewAction && (
                <Box>
                  <Box sx={{ mb: 1 }}>
                    <span style={{ color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>Review Notes:</span>
                  </Box>
                  <Box sx={{ 
                    p: 1.5, 
                    bgcolor: isDark(theme) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                    borderRadius: 1,
                    color: theme.TEXT_PRIMARY,
                    fontSize: '0.9rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedRequest.review_notes || 'No review notes provided.'}
                  </Box>
                  {selectedRequest.reviewed_at && (
                    <Box sx={{ mt: 1, fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>
                      Reviewed on: {formatAppDateTime(selectedRequest.reviewed_at)}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          px: 3, 
          pb: 2, 
          borderTop: `1px solid ${theme.BORDER}`,
          pt: 2
        }}>
          <Button
            onClick={() => {
              setReviewModalOpen(false);
              setSelectedRequest(null);
              setReviewAction(null);
              setReviewNotes('');
            }}
            disabled={isSubmittingReview}
            sx={{ color: theme.TEXT_SECONDARY }}
          >
            {reviewAction ? 'Cancel' : 'Close'}
          </Button>
          {reviewAction && (
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              variant="contained"
              sx={{
                bgcolor: reviewAction === 'approve' ? '#22c55e' : '#ef4444',
                '&:hover': {
                  bgcolor: reviewAction === 'approve' ? '#16a34a' : '#dc2626',
                },
              }}
            >
              {isSubmittingReview ? 'Submitting...' : reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default LeaveRequestsPage;
