import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { AccountCircle, Search, Visibility, VisibilityOff, Lock, Refresh, FilterList, Clear } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from '../components/NoSessionsFound';
import Loader from '../components/Loader';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';

// Types
interface Student {
  id: number;
  student_number?: string;
  name: string;
  father_name?: string;
  password?: string;
  class_id?: number;
  section_id?: number;
  classes?: { name: string } | null;
  sections?: { name: string } | null;
  school_id: number;
  status: string;
  last_online?: string;
  is_online?: boolean;
  app_version?: string;
}

// Styled Components
const Container = styled.div`
  width: 90vw;
  max-width: 1550px;
  margin: 0 auto;
  padding: 1.5rem 0.3rem;
  @media (max-width: 768px) {
    width: 100vw;
    padding: 0.75rem 0.5rem;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  @media (max-width: 480px) {
    padding: 0.5rem 0.25rem;
  }
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  padding: 2px 6px;
  min-width: 120px;
  max-width: 180px;
  width: 100%;
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
  @media (max-width: 600px) {
    flex-direction: row;
    align-items: stretch;
    gap: 8px;
    flex-wrap: nowrap;
  }
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 14px;
  cursor: pointer;
  min-width: 150px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
  }
  @media (max-width: 600px) {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    padding: 6px 8px;
  }
`;

const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f3f4f6'};
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  outline: none;
  width: 100%;
  margin-left: 4px;
`;

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  box-shadow: 0 1px 4px #0001;
  padding: 6px 8px;
`;

// Segmented Group Components
const SEGMENTED_HEIGHT = '32px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
  }
`;

const SegmentedBase = css`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
`;

const SegmentedInput = styled.input`
  ${SegmentedBase}
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-right: none;
    min-width: 0;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  &:last-child { border-right: none; }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:not(:first-child) {
    border-left: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => theme.BG === '#252525'
    ? `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
  }
`;

const SegmentedButton = styled.button<{ active?: boolean; first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  background: ${({ active, theme }) => active ? theme.ACCENT : theme.BG};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1.5px solid ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  font-weight: ${({ active }) => active ? 700 : 400};
  &:hover, &:focus {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353535' : '#e5e7eb'};
    opacity: 0.92;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
  }
`;

const StudentTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  margin-top: 1.5rem;
  table-layout: fixed;
  
  @media (max-width: 768px) {
    display: table;
    width: 100%;
    table-layout: auto;
    border-radius: 12px;
  }
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  
  @media (max-width: 768px) {
    display: table-header-group;
  }
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background 0.2s;
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  }
  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 14px;
  white-space: nowrap;
  @media (max-width: 768px) {
    padding: 8px 6px;
    font-size: 12px;
    font-weight: 700;
    white-space: normal;
    word-break: break-word;
  }
  @media (max-width: 480px) {
    padding: 7px 5px;
    font-size: 11px;
  }
`;

const TableCell = styled.td`
  padding: 16px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 14px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  @media (max-width: 768px) {
    padding: 8px 6px;
    font-size: 13px;
    max-width: none;
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
  }
  @media (max-width: 480px) {
    padding: 7px 5px;
    font-size: 12px;
  }
`;

const NameCell = styled(TableCell)`
  @media (max-width: 768px) {
    white-space: normal;
    width: 28%;
    line-height: 1.4;
  }
  @media (max-width: 480px) {
    width: 30%;
  }
`;

const NameText = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  @media (max-width: 768px) {
    font-size: 13px;
    margin-bottom: 3px;
  }
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const FatherNameText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#6b7280'};
  font-size: 13px;
  @media (max-width: 768px) {
    font-size: 12px;
    opacity: 0.8;
    margin-top: 3px;
  }
  @media (max-width: 480px) {
    font-size: 11px;
  }
`;

const StudentIdCell = styled(TableCell)`
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  
  @media (max-width: 768px) {
    font-size: 13px;
    width: 15%;
    max-width: 50px;
  }
  @media (max-width: 480px) {
    font-size: 12px;
    width: 12%;
    max-width: 45px;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $variant, theme }) =>
    $variant === 'danger'
      ? '#ef4444'
      : theme.ACCENT || '#6366f1'};
  color: white;
  white-space: nowrap;
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
  @media (max-width: 768px) {
    padding: 6px 8px;
    font-size: 12px;
    gap: 4px;
    min-width: 32px;
    width: auto;
  }
  @media (max-width: 480px) {
    padding: 5px 7px;
    font-size: 11px;
    min-width: 28px;
  }
`;

const PasswordModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(0, 0, 0, 0.5)'
    : 'rgba(255, 255, 255, 0.5)'};
  backdrop-filter: blur(8px);
  WebkitBackdropFilter: blur(8px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.2s ease-out;
  @keyframes fade-in {
    from { opacity: 0; backdrop-filter: blur(0); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  }
`;

const PasswordFormContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  width: 90vw;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin: 32px 16px;
  position: relative;
  z-index: 1301;
  padding: 24px;
  overflow-y: auto;
  animation: slide-up 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);
  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (max-width: 768px) {
    width: calc(100% - 32px);
    max-height: auto;
    height: auto;
    margin: 16px;
    padding: 16px 12px;
  }
  @media (max-width: 480px) {
    width: calc(100% - 24px);
    margin: 12px;
    padding: 14px 10px;
    max-height: 85vh;
  }
`;

const PasswordTitle = styled.h2`
  margin: 0 0 20px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 20px;
  
  @media (max-width: 768px) {
    font-size: 16px;
    margin: 0 0 12px 0;
    font-weight: 700;
  }
  @media (max-width: 480px) {
    font-size: 14px;
    margin: 0 0 10px 0;
  }
`;

const PasswordFormGroup = styled.div`
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    margin-bottom: 14px;
  }
  @media (max-width: 480px) {
    margin-bottom: 12px;
  }
`;

const PasswordLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  font-size: 14px;
  
  @media (max-width: 768px) {
    font-size: 12px;
    margin-bottom: 6px;
  }
  @media (max-width: 480px) {
    font-size: 11px;
    margin-bottom: 5px;
  }
`;

const PasswordInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 14px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
  }
  @media (max-width: 768px) {
    padding: 8px 10px;
    font-size: 13px;
  }
  @media (max-width: 480px) {
    padding: 7px 9px;
    font-size: 12px;
  }
`;

const PasswordButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
  @media (max-width: 480px) {
    gap: 6px;
    margin-top: 14px;
  }
`;

const PasswordButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ variant, theme }) =>
    variant === 'secondary'
      ? (theme.BG === '#252525' ? '#2a2a2a' : '#f3f4f6')
      : (theme.ACCENT || '#6366f1')};
  color: ${({ variant }) => variant === 'secondary' ? 'inherit' : 'white'};
  &:hover {
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    padding: 10px;
    font-size: 13px;
    width: 100%;
  }
  @media (max-width: 480px) {
    padding: 8px;
    font-size: 12px;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  background: ${({ status }) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#22c55e20';
      case 'suspended': return '#f59e0b20';
      case 'withdrawn': return '#ef444420';
      default: return '#6b728020';
    }
  }};
  color: ${({ status }) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#22c55e';
      case 'suspended': return '#f59e0b';
      case 'withdrawn': return '#ef4444';
      default: return '#6b7280';
    }
  }};
  
  @media (max-width: 768px) {
    padding: 4px 6px;
    font-size: 12px;
    font-weight: 600;
  }
  @media (max-width: 480px) {
    padding: 3px 5px;
    font-size: 11px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 20px;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  border-top: 4px solid ${({ theme }) => theme.ACCENT || '#6366f1'};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    border-width: 3px;
  }
`;

const LoadingText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 16px;
  font-weight: 500;
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const PasswordDisplayWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ResetButton = styled(ActionButton)`
  background: #f59e0b;
  &:hover {
    background: #d97706;
  }
`;

const StudentPasswordManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const toast = useToast();
  const { user } = useAuth();
  const { theme } = React.useContext(ThemeContext);

  // Update mobile state on resize (throttled for performance)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Prevent body scroll when modal is open and ensure modal is viewport-centered
  useEffect(() => {
    if (showPasswordModal) {
      // Store current scroll position
      const scrollY = window.scrollY;
      // Prevent body scroll and lock position
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.setAttribute('data-scroll-position', scrollY.toString());
    } else {
      // Restore scroll position
      const scrollY = document.body.getAttribute('data-scroll-position');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-position');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    }
    return () => {
      // Cleanup on unmount
      const scrollY = document.body.getAttribute('data-scroll-position');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        document.body.removeAttribute('data-scroll-position');
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    };
  }, [showPasswordModal]);

  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user?.school_id)
        .maybeSingle();
      if (sessionError && !(
        sessionError.code === 'PGRST116' ||
        sessionError.message?.includes('multiple (or no) rows returned') ||
        sessionError.details?.includes('contains 0 rows')
      )) {
        setHasActiveSession(false);
        setLoading(false);
        return;
      }
      setHasActiveSession(!!sessionData);
      setLoading(false);
    };
    checkActiveSession();
  }, [user?.school_id]);

  const fetchClasses = useCallback(async () => {
    if (!user?.school_id) return;
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name');
      if (!error && data) {
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, [user?.school_id]);

  const fetchSections = useCallback(async () => {
    if (!user?.school_id) return;
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', user.school_id)
        .order('name');
      if (!error && data) {
        setSections(data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  }, [user?.school_id]);

  const fetchStudents = useCallback(async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      setLoading(false);
      return;
    }

    try {
      // Fetch students with their current class/section info from student_class_history
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .maybeSingle();

      if (activeSessionData) {
        // Fetch from student_class_history for active session
        const { data: historyData, error: historyError } = await supabase
          .from('student_class_history')
          .select(`
            student_id,
            new_class_id,
            new_section_id,
            adm_class_id,
            adm_section_id,
            new_classes:new_class_id(id, name),
            new_sections:new_section_id(id, name),
            adm_classes:adm_class_id(id, name),
            adm_sections:adm_section_id(id, name)
          `)
          .eq('session_id', activeSessionData.id)
          .eq('school_id', user.school_id);

        if (!historyError && historyData && historyData.length > 0) {
          const studentIds = Array.from(new Set(historyData.map((sch: any) => sch.student_id)));
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('id, student_number, name, father_name, password, school_id, status, last_online, is_online, app_version')
            .eq('school_id', user.school_id)
            .in('id', studentIds);

          if (!studentsError && studentsData) {
            const studentsMap = new Map(studentsData.map((student: any) => [student.id, student]));
            const mapped = historyData.map((sch: any) => {
              const student = studentsMap.get(sch.student_id);
              if (!student) return null;
              return {
                ...student,
                class_id: sch.new_class_id || sch.adm_class_id, // Current class (fallback to admission)
                section_id: sch.new_section_id !== null ? sch.new_section_id : (sch.adm_section_id !== null ? sch.adm_section_id : null), // Current section
                classes: sch.new_classes || sch.adm_classes, // Current class object
                sections: sch.new_sections || sch.adm_sections, // Current section object
              };
            }).filter(Boolean);
            // Sort by ID descending (higher IDs first)
            const sorted = mapped.sort((a: Student, b: Student) => b.id - a.id);
            setStudents(sorted as Student[]);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback: fetch all students directly (same pattern as StudentList)
      const { data, error } = await supabase
        .from('students')
        .select(`*, classes(name), sections(name)`)
        .eq('school_id', user.school_id)
        .order('id', { ascending: false });

      if (!error) {
        // Sort by ID descending (higher IDs first)
        const sorted = (data || []).sort((a: Student, b: Student) => b.id - a.id);
        setStudents(sorted);
      } else {
        console.error('Error fetching students:', error);
        toast.showToast('Failed to load students', 'error');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error in fetchStudents:', error);
      toast.showToast('Failed to fetch students', 'error');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.school_id, toast]);

  // Fetch data when session becomes active
  useEffect(() => {
    if (hasActiveSession && user?.school_id) {
      fetchStudents();
      fetchClasses();
      fetchSections();
    }
  }, [hasActiveSession, user?.school_id]);

  const handleViewPassword = useCallback((student: Student) => {
    setSelectedStudent(student);
    setShowPasswordModal(true);
    setShowPassword(false);
    setNewPassword('');
  }, []);

  const handleChangePassword = useCallback(async () => {
    if (!selectedStudent || !user?.school_id) {
      toast.showToast('Student information not found', 'error');
      return;
    }
    if (!newPassword.trim()) {
      toast.showToast('Password cannot be empty', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('students')
        .update({ password: newPassword.trim() })
        .eq('id', selectedStudent.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Password updated successfully', 'success');
      setShowPasswordModal(false);
      setSelectedStudent(null);
      setNewPassword('');
      fetchStudents();
    } catch (error) {
      toast.showToast('Failed to update password', 'error');
    }
  }, [selectedStudent, user?.school_id, newPassword, toast, fetchStudents]);

  const handleResetPassword = useCallback(async () => {
    if (!selectedStudent || !user?.school_id) {
      toast.showToast('Student information not found', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('students')
        .update({ password: 'aa' })
        .eq('id', selectedStudent.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Password reset to default (aa)', 'success');
      setShowPasswordModal(false);
      setSelectedStudent(null);
      setNewPassword('');
      fetchStudents();
    } catch (error) {
      toast.showToast('Failed to reset password', 'error');
    }
  }, [selectedStudent, user?.school_id, toast, fetchStudents]);

  // Memoize filtered students for performance
  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        // Search filter (using debounced term)
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch = !debouncedSearchTerm ||
          student.name.toLowerCase().includes(searchLower) ||
          String(student.id).includes(debouncedSearchTerm) ||
          (student.father_name && student.father_name.toLowerCase().includes(searchLower)) ||
          (student.classes?.name?.toLowerCase().includes(searchLower)) ||
          (student.sections?.name?.toLowerCase().includes(searchLower));

        // Class filter
        const matchesClass = !classFilter || String(student.class_id) === classFilter;

        // Section filter
        const matchesSection = !sectionFilter || String(student.section_id) === sectionFilter;

        // Status filter
        const matchesStatus = !statusFilter || (student.status || 'active').toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesClass && matchesSection && matchesStatus;
      })
      .sort((a, b) => b.id - a.id); // Sort by ID descending (higher IDs first)
  }, [students, debouncedSearchTerm, classFilter, sectionFilter, statusFilter]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setClassFilter('');
    setSectionFilter('');
    setStatusFilter('');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(searchTerm || classFilter || sectionFilter || statusFilter);
  }, [searchTerm, classFilter, sectionFilter, statusFilter]);

  // Memoize filtered sections for better performance
  const filteredSections = useMemo(() => {
    if (!classFilter) return sections;
    return sections.filter((sec) => String(sec.class_id) === classFilter);
  }, [sections, classFilter]);

  if (!hasActiveSession) return <NoSessionsFound />;

  return (
    <Container>
      <Header>
        {/* Header row: always flex row, header left, filters right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 8,
            marginBottom: window.innerWidth <= 700 ? 4 : 0,
          }}
        >
          <Title theme={theme === 'dark' ? darkTheme : lightTheme}>
            Student Password Management
          </Title>
          {/* Desktop filters */}
          <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
            <SegmentedGroup>
              <SegmentedInput
                theme={theme === 'dark' ? darkTheme : lightTheme}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
                style={{ minWidth: 180, maxWidth: 250 }}
              />
              <SegmentedSelect
                theme={theme === 'dark' ? darkTheme : lightTheme}
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter(''); // Clear section when class changes
                }}
                disabled={loading}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </SegmentedSelect>
              <SegmentedSelect
                theme={theme === 'dark' ? darkTheme : lightTheme}
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                disabled={!classFilter || loading}
                style={{ borderRadius: 0 }}
              >
                <option value="">All Sections</option>
                {filteredSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </SegmentedSelect>
              <SegmentedSelect
                theme={theme === 'dark' ? darkTheme : lightTheme}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
                style={{ borderRadius: 0 }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="withdrawn">Withdrawn</option>
              </SegmentedSelect>
              {hasActiveFilters && (
                <SegmentedButton
                  theme={theme === 'dark' ? darkTheme : lightTheme}
                  onClick={clearFilters}
                  last
                >
                  <Clear style={{ fontSize: 15 }} />
                  Clear
                </SegmentedButton>
              )}
            </SegmentedGroup>
          </HeaderFilters>
        </div>
        {/* Mobile search bar - always visible */}
        {window.innerWidth <= 700 && (
          <div style={{ width: '100%' }}>
            <SegmentedInput
              theme={theme === 'dark' ? darkTheme : lightTheme}
              type="text"
              placeholder="Search by name, ID, father name, class, section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
              style={{ width: '100%' }}
            />
          </div>
        )}
        {/* Mobile filters: in one row */}
        {window.innerWidth <= 700 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              width: '100%',
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSectionFilter(''); // Clear section when class changes
              }}
              disabled={loading}
              style={{ width: '100%' }}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </SegmentedSelect>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              disabled={!classFilter || loading}
              style={{ width: '100%' }}
            >
              <option value="">All Sections</option>
              {filteredSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </SegmentedSelect>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={loading}
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="withdrawn">Withdrawn</option>
            </SegmentedSelect>
            {hasActiveFilters && (
              <SegmentedButton
                theme={theme === 'dark' ? darkTheme : lightTheme}
                onClick={clearFilters}
                style={{ width: '100%' }}
              >
                <Clear style={{ fontSize: 15 }} />
                Clear
              </SegmentedButton>
            )}
          </div>
        )}
      </Header>

      {filteredStudents.length === 0 && !loading ? (
        <EmptyState>
          <AccountCircle style={{ fontSize: 64, color: '#6b7280', marginBottom: 16 }} />
          <p>No students found</p>
        </EmptyState>
      ) : (
        <div style={{
          width: '100%',
          position: 'relative',
          ...(isMobile ? {
            margin: '0',
            padding: '0',
            overflowX: 'visible'
          } : {
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          })
        }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: '14px'
            }}>
              <LoadingSpinner />
              <LoadingText>Loading students...</LoadingText>
            </div>
          )}
          <StudentTable style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={isMobile ? { width: '15%', maxWidth: '50px' } : {}}>ID</TableHeaderCell>
                <TableHeaderCell style={isMobile ? { width: '28%' } : {}}>Name</TableHeaderCell>
                {!isMobile && <TableHeaderCell>Father Name</TableHeaderCell>}
                <TableHeaderCell style={isMobile ? { width: '22%' } : {}}>Class</TableHeaderCell>
                <TableHeaderCell style={isMobile ? { width: '18%' } : {}}>Status</TableHeaderCell>
                {!isMobile && <TableHeaderCell>Online</TableHeaderCell>}
                {!isMobile && <TableHeaderCell>Version</TableHeaderCell>}
                <TableHeaderCell style={isMobile ? { width: '15%' } : {}}>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <StudentIdCell>{student.id}</StudentIdCell>
                  <NameCell title={`${student.name}${student.father_name ? ` - ${student.father_name}` : ''}`}>
                    <NameText>{student.name}</NameText>
                    {isMobile && student.father_name && (
                      <FatherNameText>{student.father_name}</FatherNameText>
                    )}
                  </NameCell>
                  {!isMobile && (
                    <TableCell title={student.father_name || ''}>{student.father_name || '-'}</TableCell>
                  )}
                  <TableCell style={isMobile ? { width: '22%', fontSize: '10px' } : {}}>
                    {student.classes?.name
                      ? `${student.classes.name}${student.sections?.name ? ` (${student.sections.name})` : ''}`
                      : '-'}
                  </TableCell>
                  <TableCell style={isMobile ? { width: '18%' } : {}}>
                    <StatusBadge status={student.status || 'active'}>
                      {(student.status || 'active').charAt(0).toUpperCase() + (student.status || 'active').slice(1)}
                    </StatusBadge>
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: student.is_online ? '#22c55e' : '#9ca3af',
                          boxShadow: student.is_online ? '0 0 4px #22c55e' : 'none'
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: student.is_online ? '#22c55e' : 'inherit' }}>
                            {student.is_online ? 'Online' : 'Offline'}
                          </span>
                          {!student.is_online && student.last_online && (
                            <span style={{ fontSize: '10px', color: '#6b7280' }}>
                              {new Date(student.last_online).toLocaleDateString()} {new Date(student.last_online).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell>
                      <span style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        background: theme.BG === '#252525' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {student.app_version || 'v1.0.0'}
                      </span>
                    </TableCell>
                  )}
                  <TableCell style={isMobile ? { width: '15%' } : {}}>
                    <ActionButton onClick={() => handleViewPassword(student)}>
                      <Lock style={{ fontSize: isMobile ? 10 : 14 }} />
                      {!isMobile && <span>Manage</span>}
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </StudentTable>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && selectedStudent && ReactDOM.createPortal(
        <PasswordModal onClick={() => setShowPasswordModal(false)}>
          <PasswordFormContainer onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <PasswordTitle>Manage Student Password</PasswordTitle>
            <div style={{
              marginBottom: isMobile ? 12 : 16,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '8px' : '12px'
            }}>
              <AccountCircle style={{ fontSize: isMobile ? 32 : 40, color: '#6366f1' }} />
              <div>
                <div style={{
                  fontWeight: 600,
                  color: 'inherit',
                  fontSize: isMobile ? '14px' : '16px'
                }}>
                  {selectedStudent.name}
                </div>
                <div style={{
                  fontSize: isMobile ? 11 : 14,
                  color: '#6b7280',
                  marginTop: isMobile ? 2 : 0
                }}>
                  ID: {selectedStudent.id} {selectedStudent.father_name && `| Father: ${selectedStudent.father_name}`}
                </div>
              </div>
            </div>
            <PasswordFormGroup>
              <PasswordLabel>Current Password</PasswordLabel>
              <PasswordDisplayWrapper>
                <PasswordInput
                  type={showPassword ? 'text' : 'password'}
                  value={selectedStudent.password || 'aa'}
                  readOnly
                  style={{ flex: 1 }}
                />
                <ActionButton type="button" onClick={() => setShowPassword(v => !v)} style={{ padding: '8px 12px' }}>
                  {showPassword ? <VisibilityOff style={{ fontSize: 18 }} /> : <Visibility style={{ fontSize: 18 }} />}
                </ActionButton>
              </PasswordDisplayWrapper>
            </PasswordFormGroup>
            <PasswordFormGroup>
              <PasswordLabel>New Password <span style={{ color: '#ef4444' }}>*</span></PasswordLabel>
              <PasswordInput
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </PasswordFormGroup>
            <PasswordButtonGroup>
              <PasswordButton variant="secondary" onClick={() => {
                setNewPassword('aa');
                handleResetPassword();
              }}>
                <Refresh style={{ fontSize: 16, marginRight: 4 }} />
                Reset to Default
              </PasswordButton>
              <PasswordButton
                onClick={handleChangePassword}
                disabled={!newPassword || !newPassword.trim()}
              >
                Change Password
              </PasswordButton>
            </PasswordButtonGroup>
            <PasswordButton
              variant="secondary"
              onClick={() => {
                setShowPasswordModal(false);
                setSelectedStudent(null);
                setNewPassword('');
              }}
              style={{ marginTop: 12, width: '100%' }}
            >
              Cancel
            </PasswordButton>
          </PasswordFormContainer>
        </PasswordModal>,
        document.body
      )}
    </Container>
  );
};

export default StudentPasswordManagement;

