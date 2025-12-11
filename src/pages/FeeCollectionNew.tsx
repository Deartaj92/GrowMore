import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import styled, { useTheme } from 'styled-components';
import { Save, MonetizationOn, Calculate, Payment, History, Search, AccountCircle, CardGiftcard, Paid, ErrorOutline, DeleteOutline as DeleteIcon, Info, School, Class, Receipt, Add as AddIcon, Edit as EditIcon, Delete as DeleteIconMUI, Search as SearchIcon, FilterList as FilterIcon, People as PeopleIcon, School as SchoolIcon, Close as CloseIcon, MoreVert as MoreIcon, Check as CheckIcon, Warning as WarningIcon, Info as InfoIcon, RemoveCircleOutline as UnlinkIcon, Assessment as AssessmentIcon, CalendarToday as CalendarIcon, KeyboardArrowUp as KeyboardArrowUpIcon, Print as PrintIcon } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoStudentsFound from '../components/NoStudentsFound';
import { useProgress } from '../components/Layout';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { getStudentDisplayId, matchesStudentSearch, getSequenceNumber } from '../utils/studentUtils';
import { ThemeProvider } from 'styled-components';
import { useTheme as useMuiTheme, useMediaQuery } from '@mui/material';
import { CircularProgress, TextField, Button, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, SelectChangeEvent, Grid } from '@mui/material';
import Loader from '../components/Loader';

// ===== STYLED COMPONENTS =====

// Main Container
const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 1rem;
  padding-bottom: 3rem; /* Extra padding at bottom to prevent clipping */
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    padding-bottom: 3rem;
  }
`;

// Header Section
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
    padding: 0.75rem;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    text-align: center;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 0.5rem 1rem;
  min-width: 300px;
  z-index: 1001;
  
  @media (max-width: 768px) {
    min-width: auto;
    width: 100%;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  width: 100%;
  margin-left: 0.5rem;
  
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1002;
  max-height: 250px;
  overflow-y: auto;
  width: 100%;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.TEXT_SECONDARY};
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BORDER} ${({ theme }) => theme.BG};
`;

const SuggestionItem = styled.div<{ $isActive?: boolean }>`
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s ease;
  background: ${({ $isActive, theme }) => $isActive ? theme.BG : 'transparent'};
  
  &:hover {
    background: ${({ theme }) => theme.BG};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const SuggestionAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.7rem;
  flex-shrink: 0;
`;

const SuggestionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SuggestionName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  margin-bottom: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  .father-name {
    font-weight: 400;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const SuggestionDetails = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Main Content Grid
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    
    /* Reorder cards for mobile - Student Details first */
    & > div:first-child {
      order: 2;
    }
    
    & > div:last-child {
      order: 1;
    }
  }
`;

// Card Styling
const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0; /* prevent overflow on small screens */
  
  @media (max-width: 768px) {
    padding: 1rem;
    overflow: hidden;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Fee Summary Table
const TableContainer = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const TableWrapper = styled.div`
  flex: 1;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto; /* allow horizontal scroll on small screens */
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  
  /* Force scrollbar to always be visible */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BORDER} transparent;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.BG};
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.FIELD_BG};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-right: none;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-right: none;
  }
`;

const AmountInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  text-align: center;
  
  -webkit-appearance: none;
  -moz-appearance: textfield;
  
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

// Student Info
const StudentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const StudentAvatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
`;

const StudentDetails = styled.div`
  flex: 1;
`;

const StudentName = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.25rem;
`;

const StudentInfoText = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.25rem;
`;

// Payment Form
const PaymentForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  justify-content: space-between;
`;

const FormFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormButton = styled.div`
  margin-top: auto;
  padding-top: 1rem;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

// Footer
const Footer = styled.div`
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  text-align: right;
`;

const RemainingFee = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  span {
    color: #22c55e;
    font-weight: 700;
    font-size: 1.2rem;
  }
`;

// Payment History Section
const PaymentHistorySection = styled.div`
  margin-top: 2rem;
`;

const PaymentHistoryCard = styled(Card)`
  margin-top: 1rem;
`;

// Delete Confirmation Modal - Using Material-UI Dialog
const StyledDialog = styled(Dialog)(({ theme }) => ({
  zIndex: 1300,
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    maxWidth: '400px',
    width: '95%',
    overflow: 'hidden',
    boxShadow: theme?.palette?.mode === 'dark'
      ? '0 0 40px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.6)'
      : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
    border: theme?.palette?.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.05)',
  }
}));

const DialogHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: theme?.palette?.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)',
  backgroundColor: 'transparent',
}));

const StyledDialogTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme?.palette?.mode === 'dark'
    ? '#ffffff'
    : theme?.palette?.primary?.main || '#1976d2',
}));

const StyledDialogContent = styled(Box)(({ theme }) => ({
  padding: '24px',
  textAlign: 'center',
  backgroundColor: 'transparent',
}));

const StyledDialogActions = styled(Box)(({ theme }) => ({
  padding: '16px 24px',
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  backgroundColor: 'transparent',
}));

// Legacy modal components (keeping for compatibility)
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  box-sizing: border-box;
  backdrop-filter: blur(4px);
`;

const ModalDialog = styled.div`
  background: ${({ theme }) => theme.CARD};
  padding: 2rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 450px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  text-align: center;
  position: relative;
  margin: auto;
  @media (max-width: 700px) {
    padding: 1.1rem 0.7rem;
    max-width: 98vw;
    min-width: 0;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ModalIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fef2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  font-size: 1.5rem;
`;

const ModalTitle = styled.h4`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.3rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 0.8rem;
`;

const ModalMessage = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#adb5bd'};
  font-size: 1rem;
  margin-bottom: 1.8rem;
  line-height: 1.6;
`;

const ModalButtonRow = styled.div`
  display: flex;
  gap: 0.8rem;
  justify-content: center;
`;

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 0.6rem 1.5rem;
  border-radius: 7px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;

  ${({ theme, primary }) => primary ? `
    background-color: ${theme.ACCENT_DANGER || '#e53e3e'};
    color: #fff;
    border-color: ${theme.ACCENT_DANGER || '#e53e3e'};
    &:hover {
      background-color: ${theme.ACCENT_DANGER_DARK || '#c53030'};
      border-color: ${theme.ACCENT_DANGER_DARK || '#c53030'};
    }
  ` : `
    background-color: ${theme.BUTTON_SECONDARY_BG || theme.FIELD_BG};
    color: ${theme.TEXT_PRIMARY};
    border: 1px solid ${theme.BUTTON_SECONDARY_BORDER || theme.FIELD_BORDER};
    &:hover {
      background-color: ${theme.BUTTON_SECONDARY_HOVER_BG || theme.HOVER_BG};
      border-color: ${theme.BUTTON_SECONDARY_HOVER_BORDER || theme.ACCENT};
    }
  `}
`;

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #ef4444;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

// ===== MAIN COMPONENT =====

const FeeCollectionNew: React.FC = () => {
  const theme = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:768px)');

  // State variables
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [searchExactMatch, setSearchExactMatch] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [justSelectedStudent, setJustSelectedStudent] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Fee-related state
  const [feeInvoices, setFeeInvoices] = useState<any[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Payment-related state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Amount distribution state
  const [distributedAmounts, setDistributedAmounts] = useState<{ [key: string]: number }>({});

  // Delete payment state
  const [deletingPayment, setDeletingPayment] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <ThemeProvider theme={theme}>
        <PageContainer>
          <ErrorContainer>
            <Info style={{ marginRight: '0.5rem' }} />
            No school context found. Please contact your administrator.
          </ErrorContainer>
        </PageContainer>
      </ThemeProvider>
    );
  }

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      startProgress(false);
      setProgress(10);
      setLoading(true);
      const minDuration = 1500;
      const start = Date.now();

      const dataPromise = (async () => {
        const [{ data: studentsData }, { data: classesData }, { data: sectionsData }, { data: sessionsData }, { data: usersData }] = await Promise.all([
          supabase.from('students').select('id, name, father_name, class_id, section_id, picture_url, roll_number').eq('status', 'active').eq('school_id', user.school_id),
          supabase.from('classes').select('id, name').eq('school_id', user.school_id),
          supabase.from('sections').select('id, name').eq('school_id', user.school_id),
          supabase.from('sessions').select('id, name, is_active').eq('school_id', user.school_id).order('is_active', { ascending: false }),
          supabase.from('users').select('id, name, email').eq('school_id', user.school_id),
        ]);
        if (studentsData) setStudents(studentsData);
        if (classesData) setClasses(classesData);
        if (sectionsData) setSections(sectionsData);
        if (sessionsData) {
          setSessions(sessionsData);
          const activeSession = sessionsData.find((s: any) => s.is_active);
          if (activeSession) setCurrentSession(activeSession);
        }
        if (usersData) setUsers(usersData);
      })();

      const timerPromise = new Promise(res => setTimeout(res, minDuration));
      await Promise.all([dataPromise, timerPromise]);
      setProgress(100);
      completeProgress();
      if (isMounted) setLoading(false);
    };
    loadAll();
    return () => { isMounted = false; };
  }, [user?.school_id]);

  // Handle pre-selected student from navigation
  useEffect(() => {
    if (location.state?.preSelected && location.state?.selectedStudent) {
      const student = location.state.selectedStudent;
      setSelectedStudent(student);
      setSearch(student.name);
      setSearchExactMatch(true);
      setJustSelectedStudent(true);
    }
  }, [location.state]);

  // Auto-focus search input on page load
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select?.();
      }
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // Ensure focus after loading finishes (skeleton -> real UI)
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select?.();
        }
      }, 50);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Handle student selection
  const handleSelectStudent = (student: any) => {
    setSearch(student.name);
    setShowSuggestions(false);
    setJustSelectedStudent(true);
    setSearchExactMatch(true);
    setSelectedStudent(student);
    // Blur search to allow amount field to grab focus
    searchInputRef.current?.blur();
    inputRef.current?.blur();

    // Reset all form fields to default values
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentRemarks('');
    setDiscountAmount('');
    setDistributedAmounts({});

    // Focus amount field after selecting a student
    setTimeout(() => {
      if (amountInputRef.current) {
        amountInputRef.current.focus();
        amountInputRef.current.select?.();
      }
    }, 120);
  };

  // Search functionality
  useEffect(() => {
    if (justSelectedStudent) {
      setShowSuggestions(false);
      setJustSelectedStudent(false);
      return;
    }

    if (searchExactMatch && selectedStudent && search === selectedStudent.name) {
      setShowSuggestions(false);
      return;
    }

    if (searchExactMatch && (!selectedStudent || search !== selectedStudent.name)) {
      setSearchExactMatch(false);
    }

    if (search.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      return;
    }

    const s = search.trim().toLowerCase();
    let filtered = students.filter(
      (stu: any) => {
        const nameMatch = stu.name.toLowerCase().includes(s);
        const idMatch = matchesStudentSearch(stu, s);
        return nameMatch || idMatch.matches;
      }
    );
    // If searching by digits, sort by roll_number sequence ascending; otherwise keep name order
    if (/^\d+$/.test(s)) {
      filtered = filtered.sort((a: any, b: any) => {
        const aSeq = parseInt(getSequenceNumber(a.roll_number) || '0');
        const bSeq = parseInt(getSequenceNumber(b.roll_number) || '0');
        return aSeq - bSeq;
      });
    }
    filtered = filtered.slice(0, 8);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveSuggestion(0);
    setSuggestionsLoading(false);
  }, [search, students, justSelectedStudent, selectedStudent, searchExactMatch]);

  // Helper functions
  const getClassName = (classId: number) => classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  const getSectionName = (sectionId: number) => sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';
  const getUserName = (userId: number) => users.find((u: any) => u.id === userId)?.name || 'Unknown User';
  const getPaymentDisplayId = (paymentId: number) => `S${user.school_id}-${paymentId}`;

  // Get default print type from settings
  const getDefaultPrintType = (): 'invoice' | 'thermal' => {
    if (!user?.school_id) return 'invoice';
    const savedSetting = localStorage.getItem(`fee_print_default_${user.school_id}`);
    return (savedSetting === 'invoice' || savedSetting === 'thermal') ? savedSetting : 'invoice';
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      setActiveSuggestion((prev: number) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      setActiveSuggestion((prev: number) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[activeSuggestion]) {
        handleSelectStudent(suggestions[activeSuggestion]);
      } else {
        // If no suggestion is highlighted, move focus to amount
        amountInputRef.current?.focus();
        amountInputRef.current?.select?.();
      }
    }
  };

  const handleSearchFocus = () => {
    if (!searchExactMatch && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setSuggestionsLoading(true);
    if (searchExactMatch && selectedStudent && newValue !== selectedStudent.name) {
      setSearchExactMatch(false);
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Calculate totals
  const totalFeeAmount = useMemo(() => {
    return feeInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount || 0), 0);
  }, [feeInvoices]);

  const totalPaidAmount = useMemo(() => {
    return paymentHistory.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  }, [paymentHistory]);

  const totalDiscountAmount = useMemo(() => {
    return paymentHistory.reduce((sum: number, payment: any) => sum + Number(payment.discount_amount || 0), 0);
  }, [paymentHistory]);

  const totalNetPaidAmount = useMemo(() => {
    return paymentHistory.reduce((sum: number, payment: any) => sum + Number(payment.net_amount || 0), 0);
  }, [paymentHistory]);

  const totalRemainingAmount = useMemo(() => {
    return totalFeeAmount - totalNetPaidAmount;
  }, [totalFeeAmount, totalNetPaidAmount]);

  const formatCurrency = (value: number): string => {
    if (value % 1 === 0) {
      return String(value);
    }
    return value.toFixed(2);
  };

  // Helper function to format date as dd-mmm-yyyy
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Generate fee invoice print preview
  const generateInvoicePDF = async (paymentData: {
    paymentId?: number; // Payment ID to fetch items from fee_payment_items
    paymentItems?: Array<{ fee_item_id: string; amount: number; fee_head_name?: string; monthYear?: string }>; // Legacy: for backward compatibility
    amount: number;
    discount: number;
    netAmount: number;
    paymentMethod: string;
    paymentDate: string;
    paymentRemarks: string;
    receivedBy: number;
    feeInvoicesOverride?: any[]; // Optional override for fee invoices (for past payments)
  }) => {
    try {
      // Fetch school information
      const [{ data: profileData }, { data: schoolData }] = await Promise.all([
        supabase.from('institute_profile').select('*').eq('school_id', user.school_id).single(),
        supabase.from('schools').select('*').eq('id', user.school_id).single(),
      ]);

      const schoolInfo = {
        name: profileData?.name || schoolData?.name || 'AL-HARAM PUBLIC SCHOOL & IQRA ACADEMY',
        address: profileData?.address || schoolData?.address || 'BALU SHARIF DISTT. NOWSHERA',
        phone: profileData?.phone || schoolData?.contact || '0315 949830',
        logo_url: profileData?.logo_url || schoolData?.logo_url || null,
      };

      // Fetch payment items from fee_payment_items using payment_id
      let allFeeItems: any[] = [];

      if (paymentData.paymentId) {
        // Fetch ALL items from fee_payment_items table using payment_id
        // This includes items with paid_amount = 0 to show what items were available at payment time
        const { data: paymentItemsData, error: paymentItemsError } = await supabase
          .from('fee_payment_items')
          .select(`
            id,
            fee_item_id,
            amount,
            paid_amount,
            fee_invoice_items!inner(
              id,
              fee_head_id,
              invoice_id,
              fee_heads(id, name),
              fee_invoices(id, month, year)
            )
          `)
          .eq('payment_id', paymentData.paymentId)
          .eq('school_id', user.school_id)
          .order('id', { ascending: true }); // Order by id to maintain consistent order

        if (paymentItemsError) throw paymentItemsError;

        if (paymentItemsData) {
          allFeeItems = paymentItemsData.map((item: any) => {
            const feeInvoiceItem = item.fee_invoice_items;
            return {
              id: item.fee_item_id,
              amount: Number(item.amount || 0), // Full amount from page/UI (stored in DB)
              paid_amount: Number(item.paid_amount || 0), // Paid amount
              fee_head_id: feeInvoiceItem?.fee_head_id,
              fee_head_name: feeInvoiceItem?.fee_heads?.name || 'Unknown Fee Head',
              invoice_id: feeInvoiceItem?.invoice_id,
              month: feeInvoiceItem?.fee_invoices?.month,
              year: feeInvoiceItem?.fee_invoices?.year
            };
          });
        }
      } else if (paymentData.paymentItems && paymentData.paymentItems.length > 0) {
        // Legacy: Fallback to using paymentItems (for backward compatibility)
        const feeItemIds = paymentData.paymentItems.map(item => item.fee_item_id).filter(Boolean);

        const fetchPromises = feeItemIds.map(id =>
          supabase
            .from('fee_invoice_items')
            .select('id, amount, fee_head_id, invoice_id, fee_heads(id, name)')
            .eq('id', id)
            .eq('school_id', user.school_id)
            .maybeSingle()
        );

        const results = await Promise.all(fetchPromises);
        const feeInvoiceItems = results
          .map(r => r.data)
          .filter(Boolean) as any[];

        const feeItemsError = results.find(r => r.error)?.error;
        if (feeItemsError) throw feeItemsError;

        // Fetch invoices separately to get month and year
        const invoiceIds = Array.from(new Set(feeInvoiceItems.map((item: any) => item.invoice_id).filter(Boolean)));
        const { data: invoices } = invoiceIds.length > 0 ? await supabase
          .from('fee_invoices')
          .select('id, month, year')
          .in('id', invoiceIds)
          .eq('school_id', user.school_id) : { data: [] };

        const invoicesMap = new Map();
        if (invoices) {
          invoices.forEach((inv: any) => {
            invoicesMap.set(inv.id, inv);
          });
        }

        // Build fee items list from payment items
        feeInvoiceItems.forEach((item: any) => {
          const invoice = invoicesMap.get(item.invoice_id);
          const paymentItem = paymentData.paymentItems?.find(pi => pi.fee_item_id === item.id.toString());
          allFeeItems.push({
            id: item.id,
            amount: Number(paymentItem?.amount || item.amount || 0),
            fee_head_id: item.fee_head_id,
            fee_head_name: item.fee_heads?.name || 'Unknown Fee Head',
            invoice_id: item.invoice_id,
            month: invoice?.month,
            year: invoice?.year
          });
        });
      }

      // Calculate total from payment items' full amounts (this is what's shown in the table)
      const totalRemaining = allFeeItems.reduce((sum, item) => sum + item.amount, 0);

      // For remaining amount calculation, we still need all fee items to get the overall remaining
      // Use provided fee invoices or fall back to state
      const invoicesToUse = paymentData.feeInvoicesOverride || feeInvoices;
      const allStudentFeeItems: any[] = [];
      invoicesToUse.forEach((invoice: any) => {
        invoice.fee_invoice_items?.forEach((item: any) => {
          allStudentFeeItems.push({
            amount: Number(item.amount || 0)
          });
        });
      });
      const totalAllFeeItems = allStudentFeeItems.reduce((sum, item) => sum + item.amount, 0);

      // Calculate total paid across ALL payments (including previous ones)
      // Get all payment items for this student to calculate total paid
      let totalPaidAllPayments = 0;
      if (selectedStudent && currentSession) {
        try {
          const { data: allPaymentsData } = await supabase
            .from('fee_payments')
            .select(`
              id,
              amount,
              discount_amount,
              fee_invoices!inner (
                student_id,
                session_id
              ),
              fee_payment_items (
                amount
              )
            `)
            .eq('fee_invoices.student_id', selectedStudent.id)
            .eq('fee_invoices.session_id', currentSession.id)
            .eq('school_id', user.school_id);

          if (allPaymentsData) {
            // Sum all payment amounts (including discounts)
            totalPaidAllPayments = allPaymentsData.reduce((sum, payment) => {
              const paymentAmount = Number(payment.amount || 0);
              const discountAmount = Number(payment.discount_amount || 0);
              return sum + paymentAmount + discountAmount; // net amount
            }, 0);
          }
        } catch (err) {
          // If error, just use current payment amount
          totalPaidAllPayments = paymentData.netAmount;
        }
      } else {
        // Fallback to just this payment if student/session not available
        totalPaidAllPayments = paymentData.netAmount;
      }

      // Remaining amount = Total All Fee Items - All payments (including this one)
      const remainingAmount = totalAllFeeItems - totalPaidAllPayments;

      // Format payment date
      const paymentDateObj = new Date(paymentData.paymentDate);
      const day = paymentDateObj.getDate().toString().padStart(2, '0');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const month = months[paymentDateObj.getMonth()];
      const year = paymentDateObj.getFullYear();
      const dateString = `${day} ${month}, ${year}`;

      // Build items table rows - show ALL fee items with their full amounts only
      // Ensure at least 11 rows, add empty rows if needed
      const minRows = 11;
      const itemsRows = allFeeItems.map((feeItem, index) => {
        const monthYear = feeItem.month && feeItem.year
          ? new Date(feeItem.month + '/01/' + feeItem.year).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : '';
        return `
          <tr>
            <td style="text-align: center; padding: 8px; border: 1px solid #000;">${index + 1}</td>
            <td style="text-align: left; padding: 8px; border: 1px solid #000;">${monthYear ? `${feeItem.fee_head_name} (${monthYear})` : feeItem.fee_head_name}</td>
            <td style="text-align: center; padding: 8px; border: 1px solid #000;">${formatCurrency(feeItem.amount)}</td>
          </tr>
        `;
      }).join('');

      // Add empty rows if needed to reach minimum of 11 rows (without numbers)
      const emptyRows = Math.max(0, minRows - allFeeItems.length);
      const emptyRowsHtml = Array(emptyRows).fill(0).map(() => {
        return `
          <tr>
            <td style="text-align: center; padding: 8px; border: 1px solid #000;">&nbsp;</td>
            <td style="text-align: left; padding: 8px; border: 1px solid #000;">&nbsp;</td>
            <td style="text-align: center; padding: 8px; border: 1px solid #000;">&nbsp;</td>
          </tr>
        `;
      }).join('');

      const allItemsRows = itemsRows + emptyRowsHtml;

      // Create HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fee Invoice</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0;
                /* Remove all margins to minimize header/footer space */
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 210mm;
                height: 297mm;
              }
              body::before,
              body::after {
                display: none !important;
                content: none !important;
              }
              /* Hide any potential header/footer elements */
              @page :first {
                margin: 0;
              }
              @page :left {
                margin: 0;
              }
              @page :right {
                margin: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #000;
            }
            @media print {
              body {
                padding: 15mm !important;
              }
            }
            .invoice-container {
              max-width: 210mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .school-name {
              font-size: 26px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .contact-info {
              font-size: 16px;
              margin-bottom: 8px;
            }
            .invoice-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 16px;
            }
            .separator {
              border-top: 1px solid #000;
              margin: 16px 0;
            }
            .payment-details-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-top: 15px;
            }
            .received-by-section {
              font-size: 12px;
            }
            .summary-section {
              width: 300px;
            }
            table {
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            table th {
              font-weight: bold;
              text-align: center;
              padding: 8px;
              border: 1px solid #000;
            }
            table td {
              padding: 8px;
              border: 1px solid #000;
            }
            .student-table {
              width: 100%;
            }
            .student-table th:nth-child(1),
            .student-table td:nth-child(1),
            .student-table th:nth-child(2),
            .student-table td:nth-child(2) {
              width: 40%;
            }
            .student-table th:nth-child(3),
            .student-table td:nth-child(3) {
              width: 20%;
            }
            .fee-items-table {
              width: 100%;
              table-layout: fixed;
            }
            .fee-items-table th:nth-child(1),
            .fee-items-table td:nth-child(1) {
              width: 10%;
            }
            .fee-items-table th:nth-child(2),
            .fee-items-table td:nth-child(2) {
              width: auto;
            }
            .fee-items-table th:nth-child(3),
            .fee-items-table td:nth-child(3) {
              width: 120px;
              min-width: 120px;
              max-width: 120px;
            }
            .summary-table {
              width: 300px;
              table-layout: fixed;
            }
            .summary-table td:first-child {
              font-weight: bold;
              text-align: left;
            }
            .summary-table td:last-child {
              text-align: right;
              width: 120px;
              min-width: 120px;
              max-width: 120px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="school-name">${schoolInfo.name}</div>
              <div class="contact-info">${schoolInfo.address || ''}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 8px; margin-bottom: 8px;">
                <div>Invoice# ${paymentData.paymentId ? getPaymentDisplayId(paymentData.paymentId) : 'N/A'}</div>
                <div>Date: ${dateString}</div>
              </div>
            </div>
            
            <div class="separator"></div>
            
            <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 16px;">Fee Invoice</div>
            
            <table class="student-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Father</th>
                  <th>Class</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">${getStudentDisplayId(selectedStudent)} - ${selectedStudent.name}</td>
                  <td style="text-align: center;">${selectedStudent.father_name || '-'}</td>
                  <td style="text-align: center;">${getClassName(selectedStudent.class_id)}${getSectionName(selectedStudent.section_id) ? ` (${getSectionName(selectedStudent.section_id)})` : ''}</td>
                </tr>
              </tbody>
            </table>
            
            <table class="fee-items-table">
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>Particulars</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${allItemsRows}
              </tbody>
            </table>
            
            <div class="payment-details-container">
              <div class="received-by-section">
                <div style="margin-bottom: 4px;">
                  <strong>Payment Mode:</strong> ${paymentData.paymentMethod}
                </div>
                <div>
                  <strong>Received By:</strong> ${paymentData.receivedBy} - ${getUserName(paymentData.receivedBy)}
                </div>
              </div>
              <div class="summary-section">
                <table class="summary-table">
                  <tbody>
                    <tr>
                      <td>Total</td>
                      <td>${formatCurrency(totalRemaining)}</td>
                    </tr>
                    <tr>
                      <td>Paid</td>
                      <td>${formatCurrency(paymentData.amount)}</td>
                    </tr>
                    <tr>
                      <td>Discount</td>
                      <td>${formatCurrency(paymentData.discount)}</td>
                    </tr>
                    <tr>
                      <td>Remain</td>
                      <td>${formatCurrency(remainingAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open print preview
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };

        showToast('Print preview opened!', 'success');
      } else {
        showToast('Failed to open print preview. Please allow popups.', 'error');
      }
    } catch (error: any) {
      showToast('Failed to generate invoice: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  // Generate invoice for a payment from history
  const generateInvoiceForPayment = async (payment: any) => {
    try {
      // Generate invoice using payment_id - it will fetch from fee_payment_items
      await generateInvoicePDF({
        paymentId: payment.id, // Use payment_id to fetch from fee_payment_items
        amount: Number(payment.amount || 0),
        discount: Number(payment.discount_amount || 0),
        netAmount: Number(payment.net_amount || payment.amount || 0),
        paymentMethod: payment.payment_mode || 'Cash',
        paymentDate: payment.payment_date || payment.created_at,
        paymentRemarks: payment.remarks || '',
        receivedBy: payment.received_by || user.id
      });
    } catch (error: any) {
      showToast('Failed to generate invoice: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  // Generate thermal printer receipt
  const generateThermalReceipt = async (paymentData: {
    paymentId?: number;
    paymentItems?: Array<{ fee_item_id: string; amount: number; fee_head_name?: string; monthYear?: string }>;
    amount: number;
    discount: number;
    netAmount: number;
    paymentMethod: string;
    paymentDate: string;
    paymentRemarks: string;
    receivedBy: number;
    feeInvoicesOverride?: any[];
  }) => {
    try {
      if (!selectedStudent) {
        showToast('No student selected', 'error');
        return;
      }

      // Fetch school info (same approach as invoice)
      const [{ data: profileData }, { data: schoolData }] = await Promise.all([
        supabase.from('institute_profile').select('*').eq('school_id', user.school_id).single(),
        supabase.from('schools').select('*').eq('id', user.school_id).single(),
      ]);

      const schoolInfo = {
        name: profileData?.name || schoolData?.name || 'School Name',
        address: profileData?.address || schoolData?.address || '',
        phone: profileData?.phone || schoolData?.contact || '',
      };

      // Fetch payment items if paymentId is provided (same approach as invoice)
      let paymentItems: any[] = [];
      if (paymentData.paymentId) {
        const { data: paymentItemsData, error: paymentItemsError } = await supabase
          .from('fee_payment_items')
          .select(`
            id,
            fee_item_id,
            amount,
            paid_amount,
            fee_invoice_items!inner(
              id,
              fee_head_id,
              invoice_id,
              fee_heads(id, name),
              fee_invoices(id, month, year)
            )
          `)
          .eq('payment_id', paymentData.paymentId)
          .eq('school_id', user.school_id)
          .order('id', { ascending: true });

        if (paymentItemsError) {
          console.error('Error fetching payment items:', paymentItemsError);
          throw paymentItemsError;
        } else if (paymentItemsData) {
          paymentItems = paymentItemsData.map((item: any) => {
            const feeInvoiceItem = item.fee_invoice_items;
            const monthYear = feeInvoiceItem?.fee_invoices?.month && feeInvoiceItem?.fee_invoices?.year
              ? new Date(feeInvoiceItem.fee_invoices.month + '/01/' + feeInvoiceItem.fee_invoices.year).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
              : '';
            return {
              fee_item_id: item.fee_item_id,
              amount: Number(item.amount || 0),
              paid_amount: Number(item.paid_amount || 0),
              fee_head_name: feeInvoiceItem?.fee_heads?.name || 'Unknown',
              monthYear: monthYear
            };
          });
        }
      } else if (paymentData.paymentItems) {
        paymentItems = paymentData.paymentItems;
      }

      // Format payment date
      const paymentDateObj = new Date(paymentData.paymentDate);
      const day = paymentDateObj.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[paymentDateObj.getMonth()];
      const year = paymentDateObj.getFullYear();
      const time = paymentDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateString = `${day} ${month} ${year} ${time}`;

      // Build receipt content
      const receiptContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fee Receipt</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 80mm;
              }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 10px 5px;
              width: 80mm;
              color: #000;
            }
            .receipt-container {
              width: 100%;
              max-width: 80mm;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
            }
            .school-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .address {
              font-size: 10px;
              margin-bottom: 4px;
            }
            .receipt-title {
              font-size: 13px;
              font-weight: bold;
              margin-top: 8px;
              text-align: center;
              text-transform: uppercase;
            }
            .info-line {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              font-size: 11px;
            }
            .info-label {
              font-weight: bold;
            }
            .separator {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .items-section {
              margin: 8px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              font-size: 11px;
            }
            .item-name {
              flex: 1;
              margin-right: 5px;
            }
            .item-amount {
              text-align: right;
              min-width: 60px;
            }
            .summary-section {
              margin-top: 8px;
              border-top: 1px dashed #000;
              padding-top: 8px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              font-size: 11px;
            }
            .summary-label {
              font-weight: bold;
            }
            .summary-total {
              font-weight: bold;
              font-size: 12px;
              border-top: 1px solid #000;
              padding-top: 4px;
              margin-top: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 12px;
              padding-top: 8px;
              border-top: 1px dashed #000;
              font-size: 10px;
            }
            .thank-you {
              text-align: center;
              margin-top: 8px;
              font-weight: bold;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="school-name">${schoolInfo.name}</div>
              <div class="address">${schoolInfo.address || ''}</div>
            </div>
            
            <div class="receipt-title">Fee Payment Receipt</div>
            
            <div class="separator"></div>
            
            <div class="info-line">
              <span class="info-label">Receipt#:</span>
              <span>${paymentData.paymentId ? getPaymentDisplayId(paymentData.paymentId) : 'N/A'}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Date:</span>
              <span>${dateString}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Student:</span>
              <span>${getStudentDisplayId(selectedStudent)} - ${selectedStudent.name}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Class:</span>
              <span>${getClassName(selectedStudent.class_id)}${getSectionName(selectedStudent.section_id) ? ` (${getSectionName(selectedStudent.section_id)})` : ''}</span>
            </div>
            
            <div class="separator"></div>
            
            <div class="items-section">
              ${paymentItems.length > 0 ? paymentItems.map((item: any) => {
        const itemName = item.monthYear ? `${item.fee_head_name} (${item.monthYear})` : item.fee_head_name;
        // Show full amount like invoice (not paid_amount)
        return `
                  <div class="item-row">
                    <span class="item-name">${itemName}</span>
                    <span class="item-amount">${formatCurrency(item.amount)}</span>
                  </div>
                `;
      }).join('') : '<div class="item-row"><span>No items</span></div>'}
            </div>
            
            <div class="summary-section">
              <div class="summary-row">
                <span class="summary-label">Total:</span>
                <span>${formatCurrency(paymentItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0))}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Paid:</span>
                <span>${formatCurrency(paymentData.amount)}</span>
              </div>
              ${Number(paymentData.discount) > 0 ? `
                <div class="summary-row">
                  <span class="summary-label">Discount:</span>
                  <span>${formatCurrency(paymentData.discount)}</span>
                </div>
              ` : ''}
              <div class="summary-row summary-total">
                <span>Remaining:</span>
                <span>${formatCurrency(paymentItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) - paymentData.amount - paymentData.discount)}</span>
              </div>
            </div>
            
            <div class="separator"></div>
            
            <div class="info-line">
              <span class="info-label">Payment Mode:</span>
              <span>${paymentData.paymentMethod}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Received By:</span>
              <span>${paymentData.receivedBy} - ${getUserName(paymentData.receivedBy)}</span>
            </div>
            ${paymentData.paymentRemarks ? `
              <div class="info-line">
                <span class="info-label">Remarks:</span>
                <span>${paymentData.paymentRemarks}</span>
              </div>
            ` : ''}
            
            <div class="footer">
              <div class="thank-you">Thank You!</div>
              <div style="margin-top: 4px;">This is a computer generated receipt</div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open print preview for thermal receipt
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(receiptContent);
        printWindow.document.close();

        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };

        showToast('Thermal receipt opened!', 'success');
      } else {
        showToast('Failed to open print preview. Please allow popups.', 'error');
      }
    } catch (error: any) {
      showToast('Failed to generate thermal receipt: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  // Generate thermal receipt for a payment from history
  const generateThermalReceiptForPayment = async (payment: any) => {
    try {
      await generateThermalReceipt({
        paymentId: payment.id,
        amount: Number(payment.amount || 0),
        discount: Number(payment.discount_amount || 0),
        netAmount: Number(payment.net_amount || payment.amount || 0),
        paymentMethod: payment.payment_mode || 'Cash',
        paymentDate: payment.payment_date || payment.created_at,
        paymentRemarks: payment.remarks || '',
        receivedBy: payment.received_by || user.id
      });
    } catch (error: any) {
      showToast('Failed to generate thermal receipt: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  // Fetch fee invoices when student is selected
  useEffect(() => {
    if (!selectedStudent || !currentSession) {
      setFeeInvoices([]);
      setFeeError(null);
      return;
    }

    const fetchFeeInvoices = async () => {
      setFeeLoading(true);
      setFeeError(null);
      try {
        const { data: invoicesData, error } = await supabase
          .from('fee_invoices')
          .select(`
            id,
            student_id,
            session_id,
            month,
            year,
            total_amount,
            status,
            due_date,
            created_at,
            fee_invoice_items (
              id,
              fee_head_id,
              amount,
              fee_heads (
                id,
                name,
                description
              )
            )
          `)
          .eq('student_id', selectedStudent.id)
          .eq('session_id', currentSession.id)
          .eq('school_id', user.school_id)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (error) throw error;
        setFeeInvoices(invoicesData || []);
      } catch (err: any) {
        setFeeError('Failed to fetch fee invoices: ' + (err.message || 'Unknown error'));
        setFeeInvoices([]);
      } finally {
        setFeeLoading(false);
      }
    };

    fetchFeeInvoices();
  }, [selectedStudent, currentSession, user?.school_id]);

  // Fetch payment history when student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setPaymentHistory([]);
      setPaymentHistoryError(null);
      return;
    }

    const fetchPaymentHistory = async () => {
      setPaymentHistoryLoading(true);
      setPaymentHistoryError(null);
      try {
        const { data, error } = await supabase
          .from('fee_payments')
          .select(`
            *,
            fee_invoices!inner (
              student_id
            ),
            fee_payment_items (
              id,
              fee_item_id,
              amount,
              paid_amount
            )
          `)
          .eq('fee_invoices.student_id', selectedStudent.id)
          .eq('school_id', user.school_id)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPaymentHistory(data || []);
      } catch (err: any) {
        setPaymentHistoryError('Failed to fetch payment history: ' + (err.message || 'Unknown error'));
        setPaymentHistory([]);
      } finally {
        setPaymentHistoryLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [selectedStudent, user?.school_id]);

  // Function to distribute payment amount across fee rows
  const distributePaymentAmount = (amount: number, discount: number = 0) => {
    if (!feeInvoices.length) return;

    const newDistributedAmounts: { [key: string]: number } = {};
    const netAmount = amount + discount;
    let remainingAmount = netAmount;

    // Get only unpaid items (same logic as display)
    const unpaidItems: any[] = [];
    feeInvoices.forEach((invoice: any, invoiceIndex: number) => {
      invoice.fee_invoice_items?.forEach((item: any, itemIndex: number) => {
        const itemAmount = Number(item.amount || 0);

        // Calculate already paid amount for this specific fee item
        const alreadyPaid = paymentHistory.reduce((sum: number, payment: any) => {
          if (payment.fee_payment_items) {
            const itemPayment = payment.fee_payment_items.find(
              (paymentItem: any) => paymentItem.fee_item_id === item.id
            );
            // Use paid_amount if available (new records), otherwise use amount (old records for backward compatibility)
            if (itemPayment) {
              const paidAmt = itemPayment.paid_amount ?? itemPayment.amount ?? 0;
              return sum + Number(paidAmt);
            }
            return sum;
          }
          return sum;
        }, 0);

        const remainingItemAmount = Math.max(0, itemAmount - alreadyPaid);

        // Only include items that still need payment
        if (remainingItemAmount > 0) {
          unpaidItems.push({
            ...item,
            invoice,
            key: `${invoice.id}-${item.id}`,
            remainingAmount: remainingItemAmount
          });
        }
      });
    });

    // Distribute amount across unpaid items only
    unpaidItems.forEach((item) => {
      if (remainingAmount <= 0) {
        newDistributedAmounts[item.key] = 0;
        return;
      }

      const amountToDistribute = Math.min(remainingAmount, item.remainingAmount);
      newDistributedAmounts[item.key] = amountToDistribute;
      remainingAmount -= amountToDistribute;
    });

    setDistributedAmounts(newDistributedAmounts);
  };

  // Handle payment amount change
  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPaymentAmount(value);

    const amount = parseFloat(value || '0');
    const discount = parseFloat(discountAmount || '0');

    if (amount > 0 || discount > 0) {
      distributePaymentAmount(amount, discount);
    } else {
      setDistributedAmounts({});
    }
  };

  // Handle discount amount change
  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDiscountAmount(value);

    const amount = parseFloat(paymentAmount || '0');
    const discount = parseFloat(value || '0');

    if (amount > 0 || discount > 0) {
      distributePaymentAmount(amount, discount);
    } else {
      setDistributedAmounts({});
    }
  };

  // Auto-distribute when amount or discount changes
  useEffect(() => {
    const amount = parseFloat(paymentAmount || '0');
    const discount = parseFloat(discountAmount || '0');

    if (amount > 0 || discount > 0) {
      distributePaymentAmount(amount, discount);
    } else {
      setDistributedAmounts({});
    }
  }, [paymentAmount, discountAmount, feeInvoices, paymentHistory]);

  // Check if amount exceeds total remaining
  const isAmountExceeded = useMemo(() => {
    const amount = parseFloat(paymentAmount || '0');
    const discount = parseFloat(discountAmount || '0');
    const netAmount = amount + discount;
    return netAmount > totalRemainingAmount && totalRemainingAmount > 0;
  }, [paymentAmount, discountAmount, totalRemainingAmount]);

  // Payment collection logic
  const handleCollectPayment = async () => {
    if (!selectedStudent) {
      showToast("Please select a student first.", 'error');
      return;
    }

    const amount = parseFloat(paymentAmount || '0');
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid payment amount.", 'error');
      return;
    }

    const discount = parseFloat(discountAmount || '0');
    const netAmount = amount + discount;

    if (netAmount > totalRemainingAmount) {
      showToast(`Net payment amount (Rs. ${formatCurrency(netAmount)}) cannot exceed remaining fee (Rs. ${formatCurrency(totalRemainingAmount)}).`, 'error');
      return;
    }

    setIsCollecting(true);
    try {
      // Get ONLY the items that are shown in the fee summary section (unpaid items)
      // Store: amount (remaining amount from fee summary table), paid_amount (distributed amount)
      const paymentItems: any[] = [];
      const invoicePaymentItems: Array<{ fee_item_id: string; amount: number; fee_head_name?: string; monthYear?: string }> = [];

      feeInvoices.forEach((invoice: any, invoiceIndex: number) => {
        invoice.fee_invoice_items?.forEach((item: any, itemIndex: number) => {
          const itemAmount = Number(item.amount || 0);

          // Calculate already paid amount for this specific fee item (same logic as fee summary)
          const alreadyPaid = paymentHistory.reduce((sum: number, payment: any) => {
            if (payment.fee_payment_items) {
              const itemPayment = payment.fee_payment_items.find(
                (paymentItem: any) => paymentItem.fee_item_id === item.id
              );
              // Use paid_amount if available (new records), otherwise use amount (old records for backward compatibility)
              if (itemPayment) {
                const paidAmt = itemPayment.paid_amount ?? itemPayment.amount ?? 0;
                return sum + Number(paidAmt);
              }
              return sum;
            }
            return sum;
          }, 0);

          const remainingItemAmount = Math.max(0, itemAmount - alreadyPaid);

          // Only record items that are shown in fee summary (items with remaining amount > 0)
          if (remainingItemAmount > 0) {
            const key = `${invoice.id}-${item.id}`;
            const distributedAmount = distributedAmounts[key] || 0;

            // Store the remaining amount (what's shown in fee summary) and paid amount
            paymentItems.push({
              fee_item_id: item.id,
              amount: remainingItemAmount, // Remaining amount from fee summary table (not full amount)
              paid_amount: distributedAmount // Paid amount for this payment
            });

            // Build invoice items with fee head info
            const feeHeadName = item.fee_heads?.name || 'Unknown Fee Head';
            const monthYear = new Date(invoice.month + '/01/' + invoice.year).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            invoicePaymentItems.push({
              fee_item_id: item.id,
              amount: remainingItemAmount, // Remaining amount for invoice display
              fee_head_name: feeHeadName,
              monthYear: monthYear
            });
          }
        });
      });

      if (paymentItems.length === 0) {
        showToast("No fee items found.", 'error');
        return;
      }

      // Calculate discount and net amounts
      const discount = parseFloat(discountAmount || '0');
      const netAmount = amount + discount;

      // Create main payment record
      const paymentRecord = {
        invoice_id: feeInvoices[0].id, // Use first invoice for now
        amount: amount,
        payment_mode: paymentMethod,
        remarks: paymentRemarks,
        payment_date: paymentDate,
        school_id: user.school_id,
        received_by: user.id, // Store the user ID who collected the payment
        discount_amount: discount,
        net_amount: netAmount
      };

      // Insert payment and get the ID
      const { data: newPayment, error: paymentError } = await supabase
        .from('fee_payments')
        .insert([paymentRecord])
        .select();

      if (paymentError) throw paymentError;

      if (newPayment && newPayment.length > 0) {
        const paymentId = newPayment[0].id;

        // Create payment items for ALL items (including those with paid_amount = 0)
        const paymentItemsWithPaymentId = paymentItems.map(item => ({
          payment_id: paymentId,
          fee_item_id: item.fee_item_id,
          amount: item.amount, // Full amount from page/UI
          paid_amount: item.paid_amount, // Paid amount (0 if not paid)
          school_id: user.school_id
        }));

        const { error: itemsError } = await supabase
          .from('fee_payment_items')
          .insert(paymentItemsWithPaymentId);

        if (itemsError) throw itemsError;

        // Refresh all data to update the summary
        const refreshAllData = async () => {
          try {
            // Refresh fee invoices
            const { data: invoicesData, error: invoicesError } = await supabase
              .from('fee_invoices')
              .select(`
                id,
                student_id,
                session_id,
                month,
                year,
                total_amount,
                status,
                due_date,
                created_at,
                fee_invoice_items (
                  id,
                  fee_head_id,
                  amount,
                  fee_heads (
                    id,
                    name,
                    description
                  )
                )
              `)
              .eq('student_id', selectedStudent.id)
              .eq('session_id', currentSession.id)
              .eq('school_id', user.school_id)
              .order('year', { ascending: false })
              .order('month', { ascending: false });

            if (invoicesError) throw invoicesError;

            // Refresh payment history with items
            const { data: paymentData, error: paymentError } = await supabase
              .from('fee_payments')
              .select(`
                *,
                fee_invoices!inner (
                  student_id
                ),
                fee_payment_items (
                  id,
                  fee_item_id,
                  amount,
                  paid_amount
                )
              `)
              .eq('fee_invoices.student_id', selectedStudent.id)
              .eq('school_id', user.school_id)
              .order('payment_date', { ascending: false });

            if (paymentError) throw paymentError;

            // Update both states
            if (invoicesData) setFeeInvoices(invoicesData);
            if (paymentData) setPaymentHistory(paymentData);

            return invoicesData; // Return fresh invoices data
          } catch (err) {
            showToast("Payment collected but failed to refresh data. Please refresh the page.", 'error');
            return null;
          }
        };

        const freshInvoicesData = await refreshAllData();

        showToast("Payment collected successfully!", 'success');

        // Generate default print type based on settings
        const defaultPrintType = getDefaultPrintType();
        const paymentData = {
          paymentId: paymentId,
          amount: amount,
          discount: discount,
          netAmount: netAmount,
          paymentMethod: paymentMethod,
          paymentDate: paymentDate,
          paymentRemarks: paymentRemarks,
          receivedBy: user.id,
          feeInvoicesOverride: freshInvoicesData || undefined
        };

        if (defaultPrintType === 'invoice') {
          // Generate invoice as default
          await generateInvoicePDF(paymentData);
        } else {
          // Generate thermal receipt as default
          try {
            await generateThermalReceipt(paymentData);
          } catch (thermalError) {
            // Fallback to invoice if thermal receipt fails
            console.log('Thermal receipt generation failed, falling back to invoice:', thermalError);
            await generateInvoicePDF(paymentData);
          }
        }

        setPaymentAmount('');
        setPaymentRemarks('');
        setDiscountAmount('');
        setPaymentDate(new Date().toISOString().slice(0, 10));
        setDistributedAmounts({});

        // Focus back on search and select its content
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select?.();
          }
        }, 100);
      }
    } catch (err: any) {
      showToast("Failed to collect payment: " + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsCollecting(false);
    }
  };

  // Show delete confirmation modal
  const showDeleteConfirmation = (paymentId: string) => {
    setPaymentToDelete(paymentId);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirmation = async () => {
    if (!paymentToDelete) return;

    setIsDeleting(true);
    setShowDeleteModal(false);
    try {
      // First delete payment items
      const { error: itemsError } = await supabase
        .from('fee_payment_items')
        .delete()
        .eq('payment_id', paymentToDelete);

      if (itemsError) throw itemsError;

      // Then delete the payment
      const { error: paymentError } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', paymentToDelete);

      if (paymentError) throw paymentError;

      // Refresh all data to update the summary
      const refreshAllData = async () => {
        try {
          // Refresh payment history with items
          const { data: paymentData, error: paymentError } = await supabase
            .from('fee_payments')
            .select(`
              *,
              fee_invoices!inner (
                student_id
              ),
              fee_payment_items (
                id,
                fee_item_id,
                amount,
                paid_amount
              )
            `)
            .eq('fee_invoices.student_id', selectedStudent.id)
            .eq('school_id', user.school_id)
            .order('payment_date', { ascending: false });

          if (paymentError) throw paymentError;

          // Update payment history
          if (paymentData) setPaymentHistory(paymentData);
        } catch (err) {
          showToast("Payment deleted but failed to refresh data. Please refresh the page.", 'error');
        }
      };

      await refreshAllData();
      showToast("Payment deleted successfully!", 'success');
    } catch (err: any) {
      showToast("Failed to delete payment: " + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsDeleting(false);
      setPaymentToDelete(null);
    }
  };

  // Handle Enter key press on form inputs
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isCollecting) {
      e.preventDefault();
      handleCollectPayment();
    }
  };

  // Handle Enter key for delete confirmation modal
  useEffect(() => {
    if (!showDeleteModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isDeleting) {
        e.preventDefault();
        handleDeleteConfirmation();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal, isDeleting]);

  // Check if payment form should be disabled
  const isPaymentDisabled = useMemo(() => {
    return !selectedStudent || totalRemainingAmount <= 0 || isCollecting;
  }, [selectedStudent, totalRemainingAmount, isCollecting]);

  if (loading) {
    return <Loader />;
  }

  if (!loading && students.length === 0) {
    return <NoStudentsFound />;
  }

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        {/* Header */}
        <Header>
          <Title>Fee Collection</Title>
          <SearchContainer>
            <SearchIcon style={{ color: (theme as any).TEXT_SECONDARY }} />
            <SearchInput
              ref={searchInputRef}
              value={search}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or ID..."
            />
            {showSuggestions && suggestions.length > 0 && (
              <SuggestionsDropdown>
                {suggestions.map((student: any, index: number) => (
                  <SuggestionItem
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    $isActive={activeSuggestion === index}
                  >
                    <SuggestionAvatar>
                      {student.picture_url ? (
                        <img
                          src={student.picture_url}
                          alt={student.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '50%'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextSibling = e.currentTarget.nextSibling as HTMLElement;
                            if (nextSibling) {
                              nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          display: student.picture_url ? 'none' : 'flex',
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'inherit',
                          color: 'inherit',
                          fontWeight: 'inherit',
                          fontSize: 'inherit'
                        }}
                      >
                        {student.name.charAt(0)}
                      </div>
                    </SuggestionAvatar>
                    <SuggestionInfo>
                      <SuggestionName>
                        {student.name} • <span className="father-name">{student.father_name}</span>
                      </SuggestionName>
                      <SuggestionDetails>
                        Class: {getClassName(student.class_id)} {getSectionName(student.section_id)} | ID: {getStudentDisplayId(student)}
                      </SuggestionDetails>
                    </SuggestionInfo>
                  </SuggestionItem>
                ))}
              </SuggestionsDropdown>
            )}
          </SearchContainer>
        </Header>

        {/* Main Content */}
        <ContentGrid>
          {/* Fee Summary Card */}
          <Card>
            <CardTitle>
              <Payment style={{ color: (theme as any).ACCENT }} />
              Fee Summary
            </CardTitle>

            <TableContainer>
              {selectedStudent ? (
                feeLoading ? (
                  <Loader />
                ) : feeInvoices.length > 0 ? (
                  <>
                    <TableWrapper style={{
                      overflowY: 'scroll',
                      scrollbarGutter: 'stable'
                    }}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell style={{ width: '10%' }}>#</TableHeaderCell>
                            <TableHeaderCell style={{ width: '50%' }}>Particulars</TableHeaderCell>
                            <TableHeaderCell style={{ width: '20%' }}>Amount</TableHeaderCell>
                            <TableHeaderCell style={{ width: '20%' }}>Enter Amount</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <tbody>
                          {(() => {
                            let globalIndex = 0;
                            return feeInvoices.flatMap((invoice: any, invoiceIndex: number) =>
                              invoice.fee_invoice_items?.map((item: any, itemIndex: number) => {
                                const itemAmount = Number(item.amount || 0);

                                // Calculate already paid amount for this specific fee item
                                const alreadyPaid = paymentHistory.reduce((sum: number, payment: any) => {
                                  if (payment.fee_payment_items) {
                                    const itemPayment = payment.fee_payment_items.find(
                                      (paymentItem: any) => paymentItem.fee_item_id === item.id
                                    );
                                    // Use paid_amount if available (new records), otherwise use amount (old records for backward compatibility)
                                    if (itemPayment) {
                                      const paidAmt = itemPayment.paid_amount ?? itemPayment.amount ?? 0;
                                      return sum + Number(paidAmt);
                                    }
                                    return sum;
                                  }
                                  return sum;
                                }, 0);

                                const remainingItemAmount = Math.max(0, itemAmount - alreadyPaid);

                                // Only show items that still need payment
                                if (remainingItemAmount <= 0) return null;

                                globalIndex++;
                                return (
                                  <TableRow key={`${invoice.id}-${item.id}`}>
                                    <TableCell>{globalIndex}</TableCell>
                                    <TableCell>
                                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                        {item.fee_heads?.name || 'Unknown Fee Head'}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                                        {new Date(invoice.month + '/01/' + invoice.year).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                      </div>
                                    </TableCell>
                                    <TableCell style={{ textAlign: 'right', fontWeight: '600' }}>
                                      Rs. {formatCurrency(remainingItemAmount)}
                                    </TableCell>
                                    <TableCell>
                                      <AmountInput
                                        type="number"
                                        placeholder="0"
                                        value={distributedAmounts[`${invoice.id}-${item.id}`] || ''}
                                        readOnly
                                        style={{
                                          backgroundColor: distributedAmounts[`${invoice.id}-${item.id}`] ? '#e8f5e8' : 'transparent',
                                          color: distributedAmounts[`${invoice.id}-${item.id}`] ? '#16a34a' : 'inherit'
                                        }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              }).filter(Boolean) || []
                            );
                          })()}
                        </tbody>
                      </Table>
                    </TableWrapper>

                    <Footer>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: '0.75rem',
                        alignItems: 'stretch',
                        justifyContent: 'stretch',
                        width: '100%'
                      }}>
                        <div style={{
                          padding: '8px 12px',
                          border: `1px solid ${(theme as any).BORDER}`,
                          borderRadius: 8,
                          background: (theme as any).FIELD_BG,
                          color: (theme as any).TEXT_SECONDARY,
                          minWidth: 0
                        }}>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>Total Fee</div>
                          <div style={{ fontWeight: 700, color: (theme as any).TEXT_PRIMARY }}>Rs. {formatCurrency(totalFeeAmount)}</div>
                        </div>

                        <div style={{
                          padding: '8px 12px',
                          border: `1px solid ${(theme as any).BORDER}`,
                          borderRadius: 8,
                          background: (theme as any).FIELD_BG,
                          color: (theme as any).TEXT_SECONDARY,
                          minWidth: 0
                        }}>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>Paid</div>
                          <div style={{ fontWeight: 700, color: (theme as any).TEXT_PRIMARY }}>
                            Rs. {formatCurrency(totalPaidAmount)}
                          </div>
                        </div>

                        <div style={{
                          padding: '8px 12px',
                          border: `1px solid ${(theme as any).BORDER}`,
                          borderRadius: 8,
                          background: (theme as any).FIELD_BG,
                          color: '#f59e0b',
                          minWidth: 0
                        }}>
                          <div style={{ fontSize: 12, color: (theme as any).TEXT_SECONDARY }}>Discount</div>
                          <div style={{ fontWeight: 800 }}>Rs. {formatCurrency(totalDiscountAmount)}</div>
                        </div>

                        <div style={{
                          padding: '8px 12px',
                          border: `1px solid ${(theme as any).BORDER}`,
                          borderRadius: 8,
                          background: (theme as any).FIELD_BG,
                          color: (theme as any).TEXT_SECONDARY,
                          minWidth: 0
                        }}>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>Remaining Fee</div>
                          <div style={{ fontWeight: 800, color: '#22c55e' }}>Rs. {formatCurrency(totalRemainingAmount)}</div>
                        </div>
                      </div>
                    </Footer>
                  </>
                ) : (
                  <EmptyState>
                    <Receipt style={{ fontSize: '3rem', marginBottom: '1rem', color: (theme as any).TEXT_SECONDARY }} />
                    No fee invoices found for this student
                  </EmptyState>
                )
              ) : (
                <EmptyState>
                  <Search style={{ fontSize: '3rem', marginBottom: '1rem', color: (theme as any).TEXT_SECONDARY }} />
                  Select a student to view fee summary
                </EmptyState>
              )}
            </TableContainer>
          </Card>

          {/* Student Details Card */}
          <Card>
            <CardTitle>
              <AccountCircle style={{ color: (theme as any).ACCENT }} />
              Student Details
            </CardTitle>

            {selectedStudent ? (
              <>
                <StudentInfo>
                  <StudentAvatar>
                    {selectedStudent.picture_url ? (
                      <img
                        src={selectedStudent.picture_url}
                        alt={selectedStudent.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const nextSibling = e.currentTarget.nextSibling as HTMLElement;
                          if (nextSibling) {
                            nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        display: selectedStudent.picture_url ? 'none' : 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'inherit',
                        color: 'inherit',
                        fontWeight: 'inherit',
                        fontSize: 'inherit'
                      }}
                    >
                      {selectedStudent.name.charAt(0)}
                    </div>
                  </StudentAvatar>
                  <StudentDetails>
                    <StudentName>
                      {selectedStudent.name} • <span style={{ fontWeight: '400', color: (theme as any).TEXT_SECONDARY }}>{selectedStudent.father_name}</span>
                    </StudentName>
                    <StudentInfoText>Class: 9th B | ID: {getStudentDisplayId(selectedStudent)}</StudentInfoText>
                  </StudentDetails>
                </StudentInfo>

                <PaymentForm>
                  <FormFields>
                    <FormRow style={{ display: 'flex', gap: '1rem' }}>
                      <TextField
                        inputRef={amountInputRef}
                        label="Amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePaymentAmountChange(e)}
                        onKeyDown={handleFormKeyDown}
                        placeholder="Enter payment amount"
                        size="small"
                        required
                        disabled={isPaymentDisabled}
                        error={isAmountExceeded}
                        helperText={isAmountExceeded ? `Amount exceeds remaining fee (Rs. ${formatCurrency(totalRemainingAmount)})` : ''}
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-error fieldset': {
                              borderColor: '#f44336',
                            },
                          },
                        }}
                      />
                      <TextField
                        label="Discount Amount"
                        type="number"
                        value={discountAmount}
                        onChange={handleDiscountAmountChange}
                        onKeyDown={handleFormKeyDown}
                        placeholder="Enter discount amount (optional)"
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ flex: 1 }}
                      />
                    </FormRow>

                    <FormRow>
                      <FormControl fullWidth size="small">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          value={paymentMethod}
                          label="Payment Method"
                          onChange={(e: SelectChangeEvent<string>) => setPaymentMethod(e.target.value)}
                        >
                          <MenuItem value="Cash">Cash</MenuItem>
                          <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                          <MenuItem value="Cheque">Cheque</MenuItem>
                          <MenuItem value="Online">Online</MenuItem>
                        </Select>
                      </FormControl>
                    </FormRow>

                    <FormRow>
                      <TextField
                        label="Payment Date"
                        type="date"
                        value={paymentDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentDate(e.target.value)}
                        onKeyDown={handleFormKeyDown}
                        fullWidth
                        size="small"
                        required
                        InputLabelProps={{ shrink: true }}
                      />
                    </FormRow>

                    <FormRow>
                      <TextField
                        label="Remarks"
                        value={paymentRemarks}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentRemarks(e.target.value)}
                        onKeyDown={handleFormKeyDown}
                        placeholder="Enter payment remarks (optional)"
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                      />
                    </FormRow>
                  </FormFields>

                  <FormButton>
                    <Button
                      onClick={handleCollectPayment}
                      disabled={!paymentAmount || isCollecting}
                      variant="contained"
                      fullWidth
                      size="small"
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.5,
                        background: '#16a34a',
                        '&:hover': {
                          background: '#15803d',
                        }
                      }}
                    >
                      {isCollecting ? (
                        <>
                          <CircularProgress size={16} style={{ marginRight: '8px', color: '#fff' }} />
                          Collecting...
                        </>
                      ) : (
                        <>
                          <Payment style={{ fontSize: 18, marginRight: '8px' }} />
                          Collect Payment
                        </>
                      )}
                    </Button>
                  </FormButton>
                </PaymentForm>
              </>
            ) : (
              <EmptyState>
                <AccountCircle style={{ fontSize: '3rem', marginBottom: '1rem', color: (theme as any).TEXT_SECONDARY }} />
                Select a student to view details
              </EmptyState>
            )}
          </Card>
        </ContentGrid>

        {/* Payment History Section */}
        {selectedStudent && (
          <PaymentHistorySection>
            <PaymentHistoryCard>
              <CardTitle>
                <History style={{ color: (theme as any).ACCENT }} />
                Payment History
              </CardTitle>

              {paymentHistoryLoading ? (
                <Loader size="small" />
              ) : paymentHistory.length > 0 ? (
                <TableWrapper>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Payment ID</TableHeaderCell>
                        <TableHeaderCell>Date</TableHeaderCell>
                        <TableHeaderCell>Amount</TableHeaderCell>
                        <TableHeaderCell>Discount</TableHeaderCell>
                        <TableHeaderCell>Net Amount</TableHeaderCell>
                        <TableHeaderCell>Method</TableHeaderCell>
                        <TableHeaderCell>Received By</TableHeaderCell>
                        <TableHeaderCell>Remarks</TableHeaderCell>
                        <TableHeaderCell>Action</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <tbody>
                      {[...paymentHistory]
                        .sort((a: any, b: any) => {
                          // Use payment_date first, then created_at as fallback
                          const aDate = a.payment_date || a.created_at;
                          const bDate = b.payment_date || b.created_at;
                          const aTime = aDate ? new Date(aDate).getTime() : 0;
                          const bTime = bDate ? new Date(bDate).getTime() : 0;
                          return bTime - aTime; // most recent first (descending order)
                        })
                        .map((payment: any, idx: number) => (
                          <TableRow key={payment.id || idx}>
                            <TableCell style={{ fontWeight: '600' }}>{getPaymentDisplayId(payment.id)}</TableCell>
                            <TableCell>{formatDate(payment.payment_date)}</TableCell>
                            <TableCell>Rs. {formatCurrency(Number(payment.amount || 0))}</TableCell>
                            <TableCell>
                              {Number(payment.discount_amount || 0) > 0 ? (
                                <span style={{ color: '#f59e0b', fontWeight: '500' }}>
                                  Rs. {formatCurrency(Number(payment.discount_amount || 0))}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell style={{ fontWeight: '600' }}>
                              Rs. {formatCurrency(Number(payment.net_amount || payment.amount || 0))}
                            </TableCell>
                            <TableCell>{payment.payment_mode}</TableCell>
                            <TableCell>
                              {payment.received_by ? `${payment.received_by} - ${getUserName(payment.received_by)}` : '-'}
                            </TableCell>
                            <TableCell>{payment.remarks || '-'}</TableCell>
                            <TableCell>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <Button
                                  onClick={() => generateInvoiceForPayment(payment)}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  sx={{ minWidth: 'auto', padding: '4px 8px' }}
                                  title="Generate Invoice"
                                >
                                  <Receipt fontSize="small" />
                                </Button>
                                <Button
                                  onClick={() => generateThermalReceiptForPayment(payment)}
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  sx={{ minWidth: 'auto', padding: '4px 8px' }}
                                  title="Generate Thermal Receipt"
                                >
                                  <PrintIcon fontSize="small" />
                                </Button>
                                <Button
                                  onClick={() => showDeleteConfirmation(payment.id)}
                                  disabled={deletingPayment === payment.id}
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  sx={{ minWidth: 'auto', padding: '4px 8px' }}
                                  title="Delete Payment"
                                >
                                  {deletingPayment === payment.id ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <DeleteIconMUI fontSize="small" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </tbody>
                  </Table>
                </TableWrapper>
              ) : (
                <EmptyState>
                  No payment history found for this student.
                </EmptyState>
              )}
            </PaymentHistoryCard>
          </PaymentHistorySection>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && ReactDOM.createPortal(
          <ModalOverlay onClick={() => setShowDeleteModal(false)}>
            <ModalDialog onClick={(e) => e.stopPropagation()}>
              <ModalTitle>Delete Payment</ModalTitle>
              <ModalMessage>
                Are you sure you want to delete this payment? This action cannot be undone and will affect the student's fee balance.
              </ModalMessage>
              <ModalButtonRow>
                <ModalButton onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
                  Cancel
                </ModalButton>
                <ModalButton
                  primary
                  onClick={handleDeleteConfirmation}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Payment'}
                </ModalButton>
              </ModalButtonRow>
            </ModalDialog>
          </ModalOverlay>,
          document.body
        )}
      </PageContainer>
    </ThemeProvider>
  );
};

export default FeeCollectionNew;
