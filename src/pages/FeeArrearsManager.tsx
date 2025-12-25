import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import Loader from '../components/Loader';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';
import { 
  Receipt, 
  Search,
  Add,
  Edit,
  Delete,
  Close,
  Person,
  CalendarToday,
  AccountBalanceWallet,
  CheckCircle,
  Cancel,
  Schedule,
  Info
} from '@mui/icons-material';
import { sortClasses } from '../utils/classUtils';
import { fetchAllRows } from '../utils/paginationHelper';
import { getSequenceNumber, getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Chip,
  Checkbox,
  InputAdornment
} from '@mui/material';

// ===== STYLED COMPONENTS =====
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 6px 4px 6px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin: 2px 0 1px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 4px #0001;
  border-radius: 6px;
  padding: 2px 4px 1px 4px;
  min-height: 28px;
`;

const Title = styled.h1`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.PRIMARY};
  }
`;

const StudentSearchContainer = styled.div`
  position: relative;
  width: 100%;
`;

const StudentSearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.PRIMARY};
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
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

// Pagination Components
const PaginationInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PaginationButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 36px;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.BG};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PageInput = styled.input`
  width: 60px;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  text-align: center;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const TableContainer = styled.div`
  flex: 1;
  overflow: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-top: 4px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  position: sticky;
  top: 0;
  z-index: 5;
  background: ${({ theme }) => theme.CARD};
`;

const TableHeaderCell = styled.th`
  padding: 10px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  }
`;

const TableCell = styled.td`
  padding: 10px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: ${({ theme }) => theme.PRIMARY};
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    opacity: 0.9;
  }
  
  &.delete {
    background: #dc3545;
  }
  
  &.edit {
    background: #ffc107;
    color: #000;
  }
`;

const StatusChip = styled(Chip)<{ status: string }>`
  && {
    font-size: 0.75rem;
    height: 24px;
    ${({ status }) => {
      switch (status) {
        case 'paid':
          return 'background: #28a745; color: white;';
        case 'partial':
          return 'background: #ffc107; color: #000;';
        case 'unpaid':
          return 'background: #dc3545; color: white;';
        case 'cancelled':
          return 'background: #6c757d; color: white;';
        default:
          return '';
      }
    }}
  }
`;

const AddButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: ${({ theme }) => theme.PRIMARY};
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    opacity: 0.9;
  }
`;

// ===== MAIN COMPONENT =====
const FeeArrearsManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setFooterContent } = usePageFooter();
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  
  const [loading, setLoading] = useState(true);
  const [arrears, setArrears] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [feeHeads, setFeeHeads] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArrear, setEditingArrear] = useState<any>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    session_id: '',
    fee_head_id: '',
    amount: '',
    due_date: '',
    remarks: ''
  });
  
  // Bulk add state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkFormData, setBulkFormData] = useState({
    session_id: '',
    fee_head_id: '',
    due_date: '',
    bulkClass: '',
    bulkSection: '',
    defaultAmount: ''
  });
  const [bulkStudentAmounts, setBulkStudentAmounts] = useState<Record<number, string>>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  
  // Student search state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [activeStudentSuggestion, setActiveStudentSuggestion] = useState(0);
  const [selectedStudentForForm, setSelectedStudentForForm] = useState<any>(null);
  const studentSearchInputRef = React.useRef<HTMLInputElement>(null);
  const studentSearchContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Load initial data
  useEffect(() => {
    if (!user?.school_id) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [studentsData, classesData, sectionsData, feeHeadsData, sessionsData] = await Promise.all([
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('students')
              .select('id, name, father_name, class_id, section_id, roll_number, picture_url')
              .eq('status', 'active')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('classes')
              .select('id, name')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sections')
              .select('id, name, class_id')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('fee_heads')
              .select('id, name')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sessions')
              .select('id, name, is_active')
              .eq('school_id', user.school_id)
              .order('is_active', { ascending: false })
              .range(from, to);
          })
        ]);
        
        setStudents(studentsData || []);
        if (classesData) {
          setClasses(sortClasses(classesData));
        }
        setSections(sectionsData || []);
        setFeeHeads(feeHeadsData || []);
        setSessions(sessionsData || []);
        
        // Set default session to active session
        const activeSession = sessionsData?.find(s => s.is_active);
        if (activeSession) {
          setFormData(prev => ({ ...prev, session_id: activeSession.id.toString() }));
        }
      } catch (error: any) {
        showToast('Failed to load data: ' + (error.message || 'Unknown error'), 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.school_id]);
  
  // Load arrears
  useEffect(() => {
    if (!user?.school_id) return;
    
    const loadArrears = async () => {
      try {
        const query = supabase
          .from('fee_arrears')
          .select(`
            *,
            students(id, name, father_name, class_id, section_id, roll_number),
            fee_heads(id, name),
            sessions(id, name)
          `)
          .eq('school_id', user.school_id)
          .order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        setArrears(data || []);
      } catch (error: any) {
        showToast('Failed to load arrears: ' + (error.message || 'Unknown error'), 'error');
      }
    };
    
    loadArrears();
  }, [user?.school_id]);
  
  // Filter arrears
  const filteredArrears = useMemo(() => {
    let filtered = arrears;
    
    // Search filter
    if (search) {
      filtered = filtered.filter(arrear => {
        const student = arrear.students;
        return matchesStudentSearch(student, search);
      });
    }
    
    // Class filter
    if (selectedClass) {
      filtered = filtered.filter(arrear => {
        const student = arrear.students;
        return student?.class_id === Number(selectedClass);
      });
    }
    
    // Section filter
    if (selectedSection) {
      filtered = filtered.filter(arrear => {
        const student = arrear.students;
        return student?.section_id === Number(selectedSection);
      });
    }
    
    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(arrear => arrear.status === selectedStatus);
    }
    
    return filtered;
  }, [arrears, search, selectedClass, selectedSection, selectedStatus]);
  
  // Filter sections by class
  const filteredSections = useMemo(() => {
    if (!selectedClass) return [];
    return sections.filter(s => s.class_id === Number(selectedClass));
  }, [sections, selectedClass]);
  
  // Reset section when class changes
  useEffect(() => {
    setSelectedSection('');
  }, [selectedClass]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedClass, selectedSection, selectedStatus]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredArrears.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedArrears = filteredArrears.slice(startIndex, endIndex);
  
  // Student search functionality
  useEffect(() => {
    if (studentSearch.trim().length === 0) {
      setStudentSuggestions([]);
      setShowStudentSuggestions(false);
      return;
    }
    
    const s = studentSearch.trim().toLowerCase();
    let filtered = students.filter((stu: any) => {
      const nameMatch = stu.name.toLowerCase().includes(s);
      const idMatch = matchesStudentSearch(stu, s);
      return nameMatch || idMatch.matches;
    });
    
    // If searching by digits, sort by roll_number sequence ascending
    if (/^\d+$/.test(s)) {
      filtered = filtered.sort((a: any, b: any) => {
        const aSeq = parseInt(getSequenceNumber(a.roll_number) || '0');
        const bSeq = parseInt(getSequenceNumber(b.roll_number) || '0');
        return aSeq - bSeq;
      });
    }
    
    filtered = filtered.slice(0, 8);
    setStudentSuggestions(filtered);
    setShowStudentSuggestions(filtered.length > 0);
    setActiveStudentSuggestion(0);
  }, [studentSearch, students]);
  
  // Click outside to close student suggestions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (studentSearchContainerRef.current && !studentSearchContainerRef.current.contains(e.target as Node)) {
        setShowStudentSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  // Handle student selection
  const handleSelectStudentForForm = (student: any) => {
    setSelectedStudentForForm(student);
    setStudentSearch(student.name);
    setShowStudentSuggestions(false);
    setFormData(prev => ({ ...prev, student_id: student.id.toString() }));
  };
  
  // Handle student search change
  const handleStudentSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setStudentSearch(newValue);
    if (selectedStudentForForm && newValue !== selectedStudentForForm.name) {
      setSelectedStudentForForm(null);
      setFormData(prev => ({ ...prev, student_id: '' }));
    }
  };
  
  // Handle keyboard navigation for student search
  const handleStudentSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showStudentSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveStudentSuggestion((prev) => Math.min(prev + 1, studentSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveStudentSuggestion((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (studentSuggestions[activeStudentSuggestion]) {
        handleSelectStudentForForm(studentSuggestions[activeStudentSuggestion]);
      }
    }
  };
  
  // Helper functions for student display
  const getClassNameById = (classId: number) => {
    return classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  };
  
  const getSectionName = (sectionId: number) => {
    return sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';
  };
  
  // Open add dialog
  const handleAdd = () => {
    setEditingArrear(null);
    const activeSession = sessions.find(s => s.is_active);
    setFormData({
      student_id: '',
      session_id: activeSession?.id?.toString() || '',
      fee_head_id: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setStudentSearch('');
    setSelectedStudentForForm(null);
    setShowStudentSuggestions(false);
    setDialogOpen(true);
  };
  
  // Open edit dialog
  const handleEdit = (arrear: any) => {
    setEditingArrear(arrear);
    const student = students.find(s => s.id === arrear.student_id);
    setFormData({
      student_id: arrear.student_id.toString(),
      session_id: arrear.session_id.toString(),
      fee_head_id: arrear.fee_head_id.toString(),
      amount: arrear.amount.toString(),
      due_date: arrear.due_date,
      remarks: arrear.remarks || ''
    });
    setStudentSearch(student?.name || '');
    setSelectedStudentForForm(student || null);
    setShowStudentSuggestions(false);
    setDialogOpen(true);
  };
  
  // Delete arrear
  const handleDelete = async (arrear: any) => {
    if (!confirm(`Are you sure you want to delete this arrear for ${arrear.students?.name}?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('fee_arrears')
        .delete()
        .eq('id', arrear.id)
        .eq('school_id', user?.school_id || 0);
      
      if (error) throw error;
      
      showToast('Arrear deleted successfully', 'success');
      setArrears(arrears.filter(a => a.id !== arrear.id));
    } catch (error: any) {
      showToast('Failed to delete arrear: ' + (error.message || 'Unknown error'), 'error');
    }
  };
  
  // Save arrear
  const handleSave = async () => {
    if (!formData.student_id || !formData.session_id || !formData.fee_head_id || !formData.amount || !formData.due_date) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      const arrearData: any = {
        school_id: user?.school_id || 0,
        student_id: Number(formData.student_id),
        session_id: Number(formData.session_id),
        fee_head_id: Number(formData.fee_head_id),
        amount: Number(formData.amount),
        due_date: formData.due_date,
        remarks: formData.remarks || null,
        created_by: user?.id || null
      };
      
      if (editingArrear) {
        // Update
        const { error } = await supabase
          .from('fee_arrears')
          .update(arrearData)
          .eq('id', editingArrear.id)
          .eq('school_id', user?.school_id || 0);
        
        if (error) throw error;
        showToast('Arrear updated successfully', 'success');
      } else {
        // Insert
        const { error } = await supabase
          .from('fee_arrears')
          .insert([arrearData]);
        
        if (error) throw error;
        showToast('Arrear added successfully', 'success');
      }
      
      setDialogOpen(false);
      
      // Reload arrears
      const { data, error } = await supabase
        .from('fee_arrears')
        .select(`
          *,
          students(id, name, father_name, class_id, section_id, roll_number),
          fee_heads(id, name),
          sessions(id, name)
        `)
        .eq('school_id', user?.school_id || 0)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setArrears(data || []);
    } catch (error: any) {
      showToast('Failed to save arrear: ' + (error.message || 'Unknown error'), 'error');
    }
  };
  
  // Get student name
  const getStudentName = (arrear: any) => {
    const student = arrear.students;
    if (!student) return 'Unknown';
    return `${student.name}${student.father_name ? ` - ${student.father_name}` : ''}`;
  };
  
  // Get class name
  const getClassName = (arrear: any) => {
    const student = arrear.students;
    if (!student) return '-';
    const classObj = classes.find(c => c.id === student.class_id);
    const sectionObj = sections.find(s => s.id === student.section_id);
    return classObj ? `${classObj.name}${sectionObj ? ` (${sectionObj.name})` : ''}` : '-';
  };
  
  // Format currency
  const formatCurrency = (value: number) => {
    return `Rs. ${value.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };
  
  // Toggle bulk mode
  const handleBulkAdd = () => {
    const activeSession = sessions.find(s => s.is_active);
    setBulkFormData({
      session_id: activeSession?.id?.toString() || '',
      fee_head_id: '',
      due_date: new Date().toISOString().split('T')[0],
      bulkClass: '',
      bulkSection: '',
      defaultAmount: ''
    });
    setBulkStudentAmounts({});
    setIsBulkMode(true);
  };
  
  // Cancel bulk mode
  const handleCancelBulk = () => {
    setIsBulkMode(false);
    setBulkSearch('');
    setBulkFormData({
      session_id: '',
      fee_head_id: '',
      due_date: '',
      bulkClass: '',
      bulkSection: '',
      defaultAmount: ''
    });
    setBulkStudentAmounts({});
  };
  
  // Apply default amount to all students
  const handleApplyDefaultAmount = () => {
    if (!bulkFormData.defaultAmount || Number(bulkFormData.defaultAmount) <= 0) {
      showToast('Please enter a valid default amount', 'error');
      return;
    }
    
    const newAmounts: Record<number, string> = {};
    bulkAddStudents.forEach(student => {
      newAmounts[student.id] = bulkFormData.defaultAmount;
    });
    setBulkStudentAmounts(newAmounts);
    showToast(`Applied default amount to ${bulkAddStudents.length} students`, 'success');
  };
  
  // Get students for bulk add based on filters
  const bulkAddStudents = useMemo(() => {
    let filtered = students;
    
    if (bulkFormData.bulkClass) {
      filtered = filtered.filter(s => s.class_id === Number(bulkFormData.bulkClass));
    }
    
    if (bulkFormData.bulkSection) {
      filtered = filtered.filter(s => s.section_id === Number(bulkFormData.bulkSection));
    }
    
    return filtered;
  }, [students, bulkFormData.bulkClass, bulkFormData.bulkSection]);
  
  // Handle amount change for a student
  const handleBulkAmountChange = (studentId: number, value: string) => {
    setBulkStudentAmounts(prev => {
      const newAmounts = { ...prev };
      if (value && Number(value) > 0) {
        newAmounts[studentId] = value;
      } else {
        delete newAmounts[studentId];
      }
      return newAmounts;
    });
  };
  
  // Get selected students count
  const selectedStudentsCount = useMemo(() => {
    return Object.keys(bulkStudentAmounts).filter(id => {
      const amount = bulkStudentAmounts[Number(id)];
      return amount && Number(amount) > 0;
    }).length;
  }, [bulkStudentAmounts]);
  
  // Save bulk arrears with chunking
  const handleBulkSave = async () => {
    if (!bulkFormData.session_id || !bulkFormData.fee_head_id || !bulkFormData.due_date) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    const studentsToSave = Object.entries(bulkStudentAmounts)
      .filter(([_, amount]) => amount && Number(amount) > 0)
      .map(([studentId, amount]) => ({
        school_id: user?.school_id || 0,
        student_id: Number(studentId),
        session_id: Number(bulkFormData.session_id),
        fee_head_id: Number(bulkFormData.fee_head_id),
        amount: Number(amount),
        due_date: bulkFormData.due_date,
        status: 'unpaid',
        created_by: user?.id || null
      }));
    
    if (studentsToSave.length === 0) {
      showToast('Please enter amounts for at least one student', 'error');
      return;
    }
    
    setIsBulkSaving(true);
    try {
      // Chunk the data into batches of 100 records to avoid request size limits
      const CHUNK_SIZE = 100;
      const chunks: typeof studentsToSave[] = [];
      
      for (let i = 0; i < studentsToSave.length; i += CHUNK_SIZE) {
        chunks.push(studentsToSave.slice(i, i + CHUNK_SIZE));
      }
      
      // Insert chunks sequentially
      let totalInserted = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const { error } = await supabase
          .from('fee_arrears')
          .insert(chunk);
        
        if (error) {
          throw new Error(`Failed to insert chunk ${i + 1}/${chunks.length}: ${error.message}`);
        }
        
        totalInserted += chunk.length;
        
        // Show progress for large batches (using success type as info is not available)
        if (chunks.length > 1 && i < chunks.length - 1) {
          // Only show progress for intermediate chunks, final success will be shown after
          console.log(`Inserting... ${totalInserted}/${studentsToSave.length}`);
        }
      }
      
      showToast(`Successfully added ${totalInserted} arrears`, 'success');
      handleCancelBulk();
      
      // Reload arrears
      const { data, error: reloadError } = await supabase
        .from('fee_arrears')
        .select(`
          *,
          students(id, name, father_name, class_id, section_id, roll_number),
          fee_heads(id, name),
          sessions(id, name)
        `)
        .eq('school_id', user?.school_id || 0)
        .order('created_at', { ascending: false });
      
      if (reloadError) throw reloadError;
      setArrears(data || []);
    } catch (error: any) {
      showToast('Failed to add bulk arrears: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsBulkSaving(false);
    }
  };
  
  // Set footer content for pagination
  useEffect(() => {
    if (!isBulkMode && filteredArrears.length > 0) {
      const FooterContentComponent = React.memo(() => {
        const from = startIndex + 1;
        const to = Math.min(endIndex, filteredArrears.length);
        const total = filteredArrears.length;
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '100%',
            gap: '1rem'
          }}>
            <PaginationInfo theme={theme}>
              Showing {from} to {to} of {total} arrears
            </PaginationInfo>
            <PaginationControls theme={theme}>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                ««
              </PaginationButton>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                title="Previous page"
              >
                ‹
              </PaginationButton>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: (theme as any).TEXT_SECONDARY }}>Page</span>
                <PageInput
                  theme={theme}
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  onBlur={(e) => {
                    const page = parseInt(e.target.value);
                    if (isNaN(page) || page < 1) {
                      setCurrentPage(1);
                    } else if (page > totalPages) {
                      setCurrentPage(totalPages);
                    }
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: (theme as any).TEXT_SECONDARY }}>of {totalPages}</span>
              </div>
              
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                ›
              </PaginationButton>
              <PaginationButton
                theme={theme}
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                »»
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
  }, [filteredArrears, isBulkMode, theme, setFooterContent, currentPage, itemsPerPage, startIndex, endIndex, totalPages]);
  
  if (loading) {
    return <Loader />;
  }
  
  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Header>
          <Title>
            <Receipt />
            Fee Arrears Management
          </Title>
          <FilterGroup>
            <SearchInput
              type="text"
              placeholder="Search by name, father's name, ID, class, or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                onChange={(e: SelectChangeEvent) => setSelectedClass(e.target.value)}
                label="Class"
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map(cls => (
                  <MenuItem key={cls.id} value={cls.id.toString()}>{cls.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel>Section</InputLabel>
              <Select
                value={selectedSection}
                onChange={(e: SelectChangeEvent) => setSelectedSection(e.target.value)}
                label="Section"
                disabled={!selectedClass}
              >
                <MenuItem value="">All Sections</MenuItem>
                {filteredSections.map(sec => (
                  <MenuItem key={sec.id} value={sec.id.toString()}>{sec.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e: SelectChangeEvent) => setSelectedStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="unpaid">Unpaid</MenuItem>
                <MenuItem value="partial">Partial</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <AddButton onClick={handleAdd}>
              <Add />
              Add Arrear
            </AddButton>
            <AddButton onClick={handleBulkAdd} style={{ background: (theme as any).ACCENT }}>
              <Add />
              Bulk Add
            </AddButton>
          </FilterGroup>
        </Header>
        
        {isBulkMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
            {/* Compact top row for filters */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr auto',
              gap: '8px',
              padding: '8px',
              background: (theme as any).CARD,
              border: `1px solid ${(theme as any).BORDER}`,
              borderRadius: '6px',
              alignItems: 'end'
            }}>
              <TextField
                label="Search Students"
                type="text"
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                size="small"
                fullWidth
                placeholder="Search by name, father, ID..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search style={{ fontSize: '18px', color: (theme as any).TEXT_SECONDARY }} />
                    </InputAdornment>
                  )
                }}
              />
              
              <FormControl size="small" fullWidth>
                <InputLabel>Class</InputLabel>
                <Select
                  value={bulkFormData.bulkClass}
                  onChange={(e: SelectChangeEvent) => {
                    setBulkFormData({ ...bulkFormData, bulkClass: e.target.value, bulkSection: '' });
                    setBulkStudentAmounts({});
                  }}
                  label="Class"
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map(cls => (
                    <MenuItem key={cls.id} value={cls.id.toString()}>{cls.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" fullWidth>
                <InputLabel>Section</InputLabel>
                <Select
                  value={bulkFormData.bulkSection}
                  onChange={(e: SelectChangeEvent) => {
                    setBulkFormData({ ...bulkFormData, bulkSection: e.target.value });
                    setBulkStudentAmounts({});
                  }}
                  label="Section"
                  disabled={!bulkFormData.bulkClass}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {filteredSections
                    .filter(s => !bulkFormData.bulkClass || s.class_id === Number(bulkFormData.bulkClass))
                    .map(sec => (
                      <MenuItem key={sec.id} value={sec.id.toString()}>{sec.name}</MenuItem>
                    ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" fullWidth>
                <InputLabel>Fee Head *</InputLabel>
                <Select
                  value={bulkFormData.fee_head_id}
                  onChange={(e: SelectChangeEvent) => setBulkFormData({ ...bulkFormData, fee_head_id: e.target.value })}
                  label="Fee Head *"
                >
                  {feeHeads.map(head => (
                    <MenuItem key={head.id} value={head.id.toString()}>
                      {head.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Due Date *"
                type="date"
                value={bulkFormData.due_date}
                onChange={(e) => setBulkFormData({ ...bulkFormData, due_date: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              
              <TextField
                label="Default Amount"
                type="number"
                value={bulkFormData.defaultAmount}
                onChange={(e) => setBulkFormData({ ...bulkFormData, defaultAmount: e.target.value })}
                size="small"
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="0"
              />
              
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleApplyDefaultAmount}
                disabled={!bulkFormData.defaultAmount || Number(bulkFormData.defaultAmount) <= 0 || bulkAddStudents.length === 0}
                style={{ minWidth: '80px', height: '40px' }}
              >
                Apply
              </Button>
            </div>
            
            {/* Student list with amounts */}
            <div style={{ flex: 1, overflow: 'auto', background: (theme as any).CARD, border: `1px solid ${(theme as any).BORDER}`, borderRadius: '6px' }}>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell style={{ width: '5%' }}>SNo</TableHeaderCell>
                    <TableHeaderCell style={{ width: '10%' }}>ID</TableHeaderCell>
                    <TableHeaderCell style={{ width: '25%' }}>Name</TableHeaderCell>
                    <TableHeaderCell style={{ width: '25%' }}>Father</TableHeaderCell>
                    <TableHeaderCell style={{ width: '15%' }}>Amount</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {bulkAddStudents.length === 0 ? (
                    <tr>
                      <TableCell colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: (theme as any).TEXT_SECONDARY }}>
                        {bulkFormData.bulkClass || bulkFormData.bulkSection
                          ? 'No students found for selected filters'
                          : 'Please select a class to see students'}
                      </TableCell>
                    </tr>
                  ) : (
                    bulkAddStudents.map((student, index) => {
                      const amount = bulkStudentAmounts[student.id] || '';
                      const isSelected = amount && Number(amount) > 0;
                      return (
                        <TableRow 
                          key={student.id}
                          style={{
                            backgroundColor: isSelected ? `${(theme as any).PRIMARY}15` : 'transparent'
                          }}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{getStudentDisplayId(student)}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.father_name || '-'}</TableCell>
                          <TableCell>
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => handleBulkAmountChange(student.id, e.target.value)}
                              placeholder="0"
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: `1px solid ${isSelected ? (theme as any).PRIMARY : (theme as any).BORDER}`,
                                borderRadius: '4px',
                                background: (theme as any).FIELD_BG,
                                color: (theme as any).TEXT_PRIMARY,
                                fontSize: '0.875rem',
                                outline: 'none'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Action buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              background: (theme as any).CARD,
              border: `1px solid ${(theme as any).BORDER}`,
              borderRadius: '6px'
            }}>
              <div style={{ color: (theme as any).TEXT_SECONDARY, fontSize: '0.875rem' }}>
                {selectedStudentsCount} student{selectedStudentsCount !== 1 ? 's' : ''} selected
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={handleCancelBulk} disabled={isBulkSaving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkSave}
                  variant="contained"
                  color="primary"
                  disabled={isBulkSaving || selectedStudentsCount === 0 || !bulkFormData.fee_head_id || !bulkFormData.due_date}
                >
                  {isBulkSaving ? 'Saving...' : `Save ${selectedStudentsCount} Arrear${selectedStudentsCount !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>SNo</TableHeaderCell>
                  <TableHeaderCell>Student</TableHeaderCell>
                  <TableHeaderCell>Class</TableHeaderCell>
                  <TableHeaderCell>Fee Head</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Due Date</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Remarks</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
                {paginatedArrears.length === 0 ? (
                  <tr>
                    <TableCell colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                      No arrears found
                    </TableCell>
                  </tr>
                ) : (
                  paginatedArrears.map((arrear, index) => (
                    <TableRow key={arrear.id}>
                      <TableCell>{startIndex + index + 1}</TableCell>
                      <TableCell>{getStudentName(arrear)}</TableCell>
                      <TableCell>{getClassName(arrear)}</TableCell>
                      <TableCell>{arrear.fee_heads?.name || 'Unknown'}</TableCell>
                      <TableCell>{formatCurrency(arrear.amount)}</TableCell>
                      <TableCell>{formatDate(arrear.due_date)}</TableCell>
                      <TableCell>
                        <StatusChip
                          label={arrear.status.charAt(0).toUpperCase() + arrear.status.slice(1)}
                          status={arrear.status}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{arrear.remarks || '-'}</TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <ActionButton className="edit" onClick={() => handleEdit(arrear)}>
                            <Edit style={{ fontSize: '14px' }} />
                          </ActionButton>
                          <ActionButton className="delete" onClick={() => handleDelete(arrear)}>
                            <Delete style={{ fontSize: '14px' }} />
                          </ActionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingArrear ? 'Edit Arrear' : 'Add New Arrear'}
            <IconButton
              onClick={() => setDialogOpen(false)}
              style={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: (theme as any).TEXT_SECONDARY, fontWeight: 500 }}>
                  Student *
                </label>
                <StudentSearchContainer ref={studentSearchContainerRef}>
                  <StudentSearchInput
                    ref={studentSearchInputRef}
                    type="text"
                    value={studentSearch}
                    onChange={handleStudentSearchChange}
                    onKeyDown={handleStudentSearchKeyDown}
                    onFocus={() => {
                      if (studentSuggestions.length > 0) {
                        setShowStudentSuggestions(true);
                      }
                    }}
                    placeholder="Search by name or ID..."
                  />
                  {showStudentSuggestions && studentSuggestions.length > 0 && (
                    <SuggestionsDropdown>
                      {studentSuggestions.map((student: any, index: number) => (
                        <SuggestionItem
                          key={student.id}
                          onClick={() => handleSelectStudentForForm(student)}
                          $isActive={activeStudentSuggestion === index}
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
                              {student.name} • <span className="father-name">{student.father_name || ''}</span>
                            </SuggestionName>
                            <SuggestionDetails>
                              Class: {getClassNameById(student.class_id)} {getSectionName(student.section_id) ? `(${getSectionName(student.section_id)})` : ''} | ID: {getStudentDisplayId(student)}
                            </SuggestionDetails>
                          </SuggestionInfo>
                        </SuggestionItem>
                      ))}
                    </SuggestionsDropdown>
                  )}
                </StudentSearchContainer>
              </div>
              
              <FormControl fullWidth>
                <InputLabel>Session *</InputLabel>
                <Select
                  value={formData.session_id}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, session_id: e.target.value })}
                  label="Session *"
                >
                  {sessions.map(session => (
                    <MenuItem key={session.id} value={session.id.toString()}>
                      {session.name} {session.is_active ? '(Active)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Fee Head *</InputLabel>
                <Select
                  value={formData.fee_head_id}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, fee_head_id: e.target.value })}
                  label="Fee Head *"
                >
                  {feeHeads.map(head => (
                    <MenuItem key={head.id} value={head.id.toString()}>
                      {head.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Amount *"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
              
              <TextField
                label="Due Date *"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="Remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              {editingArrear ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
        
      </PageContainer>
    </ThemeProvider>
  );
};

export default FeeArrearsManager;

