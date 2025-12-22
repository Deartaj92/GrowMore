import React, { useState, useEffect, useContext } from 'react';
import { useTheme as useMuiTheme, useMediaQuery, Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, Checkbox, FormControlLabel, Card, Chip, TextField, InputAdornment, Tooltip } from '@mui/material';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { feeService } from '../services/feeService';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { FeePlanWithItems, FeeStructure } from '../types/fee';
import { sortClasses } from '../utils/classUtils';
import { fetchAllRows } from '../utils/paginationHelper';
import { getSequenceNumber } from '../utils/studentUtils';
import Loader from '../components/Loader';
import { CalendarMonth, Receipt, CheckCircle, Done, Search } from '@mui/icons-material';

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  
  @media (max-width: 600px) {
    padding: 4px;
    gap: 4px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid ${({ theme }) => theme.BORDER};
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    padding: 6px 8px;
    border-radius: 4px;
  }
`;

const Title = styled.h2`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    font-size: 1.1rem;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  overflow: visible;
  min-height: 0;
  align-items: start;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 12px;
    display: flex;
    flex-direction: column;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: visible;
  width: 100%;
  
  @media (max-width: 1200px) {
    min-height: 400px;
    order: 1;
  }
  
  @media (max-width: 600px) {
    min-height: 0;
    gap: 8px;
    order: 1;
    flex: 0 0 auto;
  }
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: visible;
  width: 100%;
  
  @media (max-width: 1200px) {
    min-height: 300px;
    max-height: none;
    order: 2;
    margin-top: 0;
  }
  
  @media (max-width: 600px) {
    gap: 8px;
    min-height: 0;
    order: 2;
    flex: 0 0 auto;
    margin-top: 0;
  }
`;

const FilterCard = styled(Card)`
  background: ${({ theme }) => theme.CARD};
  border-radius: 6px;
  padding: 8px;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  
  @media (max-width: 600px) {
    padding: 6px;
    border-radius: 4px;
  }
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-bottom: 8px;
  
  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 800px) and (max-width: 1199px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
  
  @media (max-width: 600px) {
    gap: 4px;
    margin-bottom: 6px;
  }
`;

const FilterActions = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  flex-wrap: wrap;
`;

const StudentsList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${({ theme }) => theme.CARD};
  border-radius: 6px;
  min-height: 400px;
  max-height: 70vh;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  
  @media (max-width: 1200px) {
    min-height: 350px;
    max-height: 60vh;
  }
  
  @media (max-width: 600px) {
    min-height: 300px;
    max-height: 50vh;
  }
`;

const StudentsListContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 3px;
    
    &:hover {
      background: ${({ theme }) => theme.ACCENT};
    }
  }
  
  @media (max-width: 600px) {
    padding: 6px;
  }
`;

const StudentsListFooter = styled.div`
  padding: 8px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
`;

const StudentsListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  gap: 8px;
  padding: 8px;
  flex-wrap: wrap;
  
  @media (max-width: 600px) {
    padding: 8px;
    gap: 8px;
    margin-bottom: 6px;
    padding-bottom: 6px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const SearchInput = styled(TextField)`
  & .MuiOutlinedInput-root {
    height: 28px;
    font-size: 0.7rem;
    background: ${({ theme }) => theme.BG};
    border-radius: 4px;
    
    & fieldset {
      border-color: ${({ theme }) => theme.BORDER};
      border-width: 1px;
    }
    
    &:hover fieldset {
    border-color: ${({ theme }) => theme.ACCENT};
    }
    
    &.Mui-focused fieldset {
      border-color: ${({ theme }) => theme.ACCENT};
      border-width: 1px;
    }
  }
  
  & .MuiInputBase-input {
    padding: 4px 8px;
    font-size: 0.7rem;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
  
  & .MuiInputAdornment-root {
    & .MuiSvgIcon-root {
      font-size: 0.9rem;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
    }
  }
  
  @media (max-width: 600px) {
    width: 100% !important;
    min-width: 0;
    
    & .MuiOutlinedInput-root {
      height: 36px;
      font-size: 0.75rem;
    }
    
    & .MuiInputBase-input {
      padding: 8px 12px;
      font-size: 0.75rem;
    }
  }
`;

const StudentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 4px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StudentCard = styled.div<{ selected?: boolean }>`
  padding: 8px;
  border: 1px solid ${({ theme, selected }) => selected ? theme.ACCENT : theme.BORDER};
  border-radius: 6px;
  background: ${({ theme, selected }) => selected ? `${theme.ACCENT}12` : theme.CARD};
  cursor: pointer;
  transition: all 0.12s;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme, selected }) => selected ? `${theme.ACCENT}18` : `${theme.ACCENT}06`};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const StudentAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.BG === '#252525' ? '#a0a7b8' : '#64748b'};
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  
  @media (max-width: 600px) {
    width: 40px;
    height: 40px;
    font-size: 0.8rem;
  }
`;

const StudentInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StudentName = styled.div`
  font-weight: 600;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  .father-name {
    font-weight: 400;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    opacity: 0.7;
  }
`;

const StudentDetails = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SummaryCard = styled(Card)`
  background: ${({ theme }) => theme.CARD};
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 300px;
  max-height: 70vh;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 1;
  
  @media (max-width: 1200px) {
    min-height: 300px;
    max-height: 70vh;
  }
  
  @media (max-width: 600px) {
    padding: 8px;
    border-radius: 6px;
    min-height: 300px;
    max-height: 70vh;
    height: 300px;
    flex: 0 0 300px;
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  flex-shrink: 0;
  padding: 8px;
  gap: 8px;
  flex-wrap: wrap;
  
  @media (max-width: 600px) {
    padding: 6px;
    margin-bottom: 4px;
    padding-bottom: 4px;
    flex-direction: column;
    align-items: stretch;
    
    & > * {
      width: 100%;
    }
  }
`;

const PreviewContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  margin-right: -4px;
  min-height: 0;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 3px;
    
    &:hover {
      background: ${({ theme }) => theme.ACCENT};
    }
  }
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 4px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const PreviewItem = styled(Box)`
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 4px;
  background: ${({ theme }) => theme.BG};
  transition: all 0.12s;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  
  @media (max-width: 600px) {
    padding: 8px;
    border-radius: 4px;
  }
`;

const PreviewItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  padding-bottom: 3px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const FeeItemsList = styled.div`
  margin-bottom: 4px;
`;

const FeeItemRow = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
`;

const FeeItemName = styled(Typography)`
  font-size: 0.7rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  flex: 1;
  margin-right: 4px;
  line-height: 1.2;
`;

const FeeItemAmount = styled(Typography)`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  min-width: 65px;
  text-align: right;
  line-height: 1.2;
`;

const TotalRow = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0 0 0;
  margin-top: 3px;
  border-top: 1.5px solid ${({ theme }) => theme.ACCENT};
`;

const ActionButton = styled(Button)`
  padding: 6px 16px;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: none;
  border-radius: 4px;
  min-height: 32px;
  
  .MuiSvgIcon-root {
    font-size: 1rem;
  }
`;

const SectionTitle = styled(Typography)`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    font-size: 0.85rem;
    min-width: 100px;
  }
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 6px;
`;

const ChallanGenerationPage: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const schoolId = user?.school_id;
  
  // State
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlanWithItems[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [selectedSection, setSelectedSection] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('active');
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [previewData, setPreviewData] = useState<Array<{
    studentId: number;
    studentName: string;
    className: string;
    items: Array<{
      feeHeadId: number;
      feeHeadName: string;
      amount: number;
      frequency: string;
      isOneTime: boolean;
      alreadyGenerated: boolean;
    }>;
    totalAmount: number;
    newItemsTotal: number; // Total for items that are not already generated
  }>>([]);
  
  const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  
  // Load initial data
  useEffect(() => {
    if (!schoolId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [classesData, sectionsData, sessionsData] = await Promise.all([
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('classes')
              .select('*')
              .eq('school_id', schoolId)
              .order('name')
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sections')
              .select('*')
              .eq('school_id', schoolId)
              .range(from, to);
          }),
          supabase
              .from('sessions')
              .select('*')
              .eq('school_id', schoolId)
              .order('is_active', { ascending: false })
              .order('id', { ascending: false })
        ]);
        
        setClasses(classesData || []);
        setSections(sectionsData || []);
        const sessionsList = sessionsData?.data || [];
        setSessions(sessionsList);
        
        // Set default to active session
        const activeSession = Array.isArray(sessionsList) ? sessionsList.find((s: any) => s.is_active) : null;
        if (activeSession) {
          // Set loading state before setting session to show loading immediately
          setLoadingStudents(true);
          setSelectedSession(activeSession.id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [schoolId, showToast]);
  
  // Load students when class is selected
  useEffect(() => {
    if (!schoolId || !selectedSession) {
      setStudents([]);
      setFeePlans([]);
      return;
    }
    
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        // Get active session for student_class_history lookup
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!activeSession) {
          showToast('No active session found', 'error');
          setLoadingStudents(false);
          return;
        }
        
        // Get students from student_class_history - filter by class if selected, otherwise get all
        let classHistoryQuery = supabase
          .from('student_class_history')
          .select('student_id, new_class_id, new_section_id')
          .eq('school_id', schoolId)
          .eq('session_id', activeSession.id);
        
        if (selectedClass !== 'all') {
          classHistoryQuery = classHistoryQuery.eq('new_class_id', selectedClass);
        }
        
        const { data: classHistory } = await classHistoryQuery;
        
        if (classHistory && classHistory.length > 0) {
          const studentIds = classHistory.map(ch => ch.student_id);
          
          // Load fee plans first - only for students in selected class(es)
          const allPlans = await feeService.getAllFeePlans(schoolId);
          const relevantPlans = allPlans.filter(plan => studentIds.includes(plan.studentId));
          setFeePlans(relevantPlans);
          
          // Only get students who have fee plans
          const studentsWithPlans = relevantPlans.map(plan => plan.studentId);
          
          if (studentsWithPlans.length > 0) {
            // Fetch student details only for those with fee plans
            // Split into chunks to avoid URL length limits
            const chunkSize = 1000;
            const chunks: number[][] = [];
            for (let i = 0; i < studentsWithPlans.length; i += chunkSize) {
              chunks.push(studentsWithPlans.slice(i, i + chunkSize));
            }
            
            const allStudentsData: any[] = [];
            for (const chunk of chunks) {
              const data = await fetchAllRows(async (from, to) => {
                return await supabase
              .from('students')
              .select('id, name, roll_number, father_name, picture_url, status')
              .eq('school_id', schoolId)
                  .in('id', chunk)
                  .range(from, to);
              });
              allStudentsData.push(...data);
            }
            
            const studentsData = allStudentsData;
            
            if (studentsData) {
              // Merge student data with class history
              const studentsWithClass = studentsData.map((student: any) => {
                const history = classHistory.find(ch => ch.student_id === student.id);
                return {
                  ...student,
                  classId: history?.new_class_id,
                  sectionId: history?.new_section_id,
                };
              });
              
              setStudents(studentsWithClass);
              
              // Extract unique statuses from fetched students
              const uniqueStatuses = Array.from(new Set(
                studentsWithClass
                  .map((s: any) => s.status)
                  .filter((status: string | null | undefined) => status != null && status !== '')
              )).sort() as string[];
              setAvailableStatuses(uniqueStatuses);
            } else {
              setStudents([]);
              setAvailableStatuses([]);
            }
          } else {
            setStudents([]);
          }
        } else {
          setStudents([]);
          setFeePlans([]);
        }
      } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
        setStudents([]);
        setFeePlans([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    
    loadStudents();
  }, [schoolId, selectedClass, selectedSession, showToast]);
  
  // Load fee structures
  useEffect(() => {
    if (!schoolId) return;
    
    const loadStructures = async () => {
      try {
        const structures = await feeService.getFeeStructures(schoolId);
        setFeeStructures(structures);
      } catch (error) {
        console.error('Error loading fee structures:', error);
      }
    };
    
    loadStructures();
  }, [schoolId]);
  
  // Generate preview
  const generatePreview = async () => {
    if (!schoolId || selectedStudents.size === 0 || !selectedSession) {
      showToast('Please select students and session', 'error');
      return;
    }
    
    setLoading(true);
    setPreviewData([]);
    try {
      const studentIds = Array.from(selectedStudents);
      
      // Get active session for invoice lookup
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!activeSession) {
        showToast('No active session found', 'error');
        return;
      }
      
      // Batch fetch all data upfront
      const [feeHeadsData, classHistoryData, allChallans] = await Promise.all([
        // Load all fee heads for name lookup
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('fee_heads')
            .select('id, name')
            .eq('school_id', schoolId)
            .range(from, to);
        }),
        // Load all student class histories at once
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('student_class_history')
            .select('student_id, new_class_id, new_section_id')
            .eq('school_id', schoolId)
            .eq('session_id', activeSession.id)
            .in('student_id', studentIds)
            .order('id', { ascending: false })
            .range(from, to);
        }),
        // Load all challans for selected students
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('fee_challans')
            .select('id, student_id, month, year')
            .eq('school_id', schoolId)
            .eq('session_id', activeSession.id)
            .in('student_id', studentIds)
            .range(from, to);
        })
      ]);
      
      // Load all challan items for selected students (after we have challan IDs)
      let allChallanItems: any[] = [];
      if (allChallans && allChallans.length > 0) {
        const challanIds = allChallans.map((ch: any) => ch.id);
        
        // Split into chunks to avoid URL length limits
        const chunkSize = 1000;
        const chunks: number[][] = [];
        for (let i = 0; i < challanIds.length; i += chunkSize) {
          chunks.push(challanIds.slice(i, i + chunkSize));
        }
        
        for (const chunk of chunks) {
          const items = await fetchAllRows(async (from, to) => {
            return await supabase
              .from('fee_challans_items')
              .select('challan_id, fee_head_id')
              .in('challan_id', chunk)
              .range(from, to);
          });
          allChallanItems.push(...(items || []));
        }
      }
      
      // Create lookup maps for fast access
      const feeHeadsMap = new Map(feeHeadsData?.map(fh => [fh.id, fh.name]) || []);
      
      // Map student_id -> class_id (get latest for each student)
      const studentClassMap = new Map<number, number>();
      const classHistoryByStudent = new Map<number, any>();
      classHistoryData?.forEach(entry => {
        if (!classHistoryByStudent.has(entry.student_id)) {
          classHistoryByStudent.set(entry.student_id, entry);
          studentClassMap.set(entry.student_id, entry.new_class_id);
        }
      });
      
      // Map challan_id -> student_id
      const challanStudentMap = new Map<number, number>();
      allChallans?.forEach((ch: any) => {
        challanStudentMap.set(ch.id, ch.student_id);
      });
      
      // Create sets for fast lookup: student_id + fee_head_id -> already generated
      // For one-time: check if any challan for student has this fee_head
      // For monthly: check if challan for student + month + year has this fee_head
      const oneTimeGenerated = new Set<string>(); // "studentId-feeHeadId"
      const monthlyGenerated = new Set<string>(); // "studentId-month-year-feeHeadId"
      
      allChallanItems?.forEach((item: any) => {
        const studentId = challanStudentMap.get(item.challan_id);
        if (!studentId) return;
        
        const challan = allChallans?.find((ch: any) => ch.id === item.challan_id);
        if (!challan) return;
        
        const key = `${studentId}-${item.fee_head_id}`;
        if (challan.month === 'one-time') {
          oneTimeGenerated.add(key);
        } else {
          const monthlyKey = `${studentId}-${challan.month}-${challan.year}-${item.fee_head_id}`;
          monthlyGenerated.add(monthlyKey);
        }
      });
      
      const preview: typeof previewData = [];
      
      // Process each student
      for (const studentId of studentIds) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;
        
        const plan = feePlans.find(p => p.studentId === studentId);
        if (!plan || plan.items.length === 0) continue;
        
        const studentClassId = studentClassMap.get(studentId) || student.classId;
        const className = classes.find(c => c.id === studentClassId)?.name || 'Unknown';
        
        const items: Array<{ feeHeadId: number; feeHeadName: string; amount: number; frequency: string; isOneTime: boolean; alreadyGenerated: boolean }> = [];
        let totalAmount = 0;
        let newItemsTotal = 0;
        
        for (const planItem of plan.items) {
          // Get fee structure for this class and fee head
          const structure = feeStructures.find(
            s => s.classId === studentClassId && s.feeHeadId === planItem.feeHeadId
          );
          
          if (!structure) continue;
          
          // Check frequency - only include items for selected month/year
          let shouldInclude = false;
          let frequency = 'Monthly';
          let alreadyGenerated = false;
          
          if (structure.firstTime) {
            // One-time fee - exclude from monthly previews
            // One-time fees are not tied to a specific month/year, so don't show in monthly previews
            shouldInclude = false;
            frequency = 'One-time';
          } else if (structure.months && structure.months.length > 0) {
            // Monthly fees - only include if selected month is in the months list
            if (structure.months.length === 12) {
              // All months - include for any selected month
              shouldInclude = true;
              frequency = 'All months';
            } else {
              // Specific months - only include if selected month matches
              shouldInclude = structure.months.includes(selectedMonth);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              frequency = `Months: ${structure.months.map(m => monthNames[m - 1]).join(', ')}`;
            }
            
            // Check if challan already exists for this month/year
            if (shouldInclude) {
              const monthlyKey = `${studentId}-${selectedMonth}-${selectedYear}-${planItem.feeHeadId}`;
              alreadyGenerated = monthlyGenerated.has(monthlyKey);
            }
          } else {
            // No months specified - don't include
            shouldInclude = false;
            frequency = 'No months';
          }
          
          // Skip if amount is zero, should not be included, or already generated
          if (!shouldInclude || planItem.feeAfterDiscount <= 0) {
            continue;
          }
          
          items.push({
            feeHeadId: planItem.feeHeadId,
            feeHeadName: feeHeadsMap.get(planItem.feeHeadId) || 'Unknown',
            amount: planItem.feeAfterDiscount,
            frequency,
            isOneTime: structure.firstTime === true,
            alreadyGenerated,
          });
          
          totalAmount += planItem.feeAfterDiscount;
          if (!alreadyGenerated) {
            newItemsTotal += planItem.feeAfterDiscount;
          }
        }
        
        if (items.length > 0) {
          preview.push({
            studentId,
            studentName: student.name,
            className,
            items,
            totalAmount,
            newItemsTotal,
          });
        }
      }
      
      setPreviewData(preview);
      
      if (preview.length === 0) {
        showToast('No challans to generate for selected students', 'error');
      }
    } catch (error: any) {
      console.error('Error generating preview:', error);
      showToast(error.message || 'Failed to generate preview', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate challans
  const handleGenerateChallans = async () => {
    if (!schoolId || previewData.length === 0 || !selectedSession) {
      showToast('No challans to generate', 'error');
      return;
    }
    
    setGenerating(true);
    try {
      // Get active session
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!activeSession) {
        showToast('No active session found', 'error');
        return;
      }
      
      const studentIds = previewData.map(p => p.studentId);
      
      // Batch fetch all existing challans upfront
      const [existingOneTimeChallans, existingRegularChallans] = await Promise.all([
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('fee_challans')
            .select('id, student_id, total_amount')
            .eq('school_id', schoolId)
            .eq('session_id', activeSession.id)
            .eq('month', 'one-time')
            .in('student_id', studentIds)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('fee_challans')
            .select('id, student_id, total_amount')
            .eq('school_id', schoolId)
            .eq('session_id', activeSession.id)
            .eq('month', selectedMonth.toString())
            .eq('year', selectedYear)
            .in('student_id', studentIds)
            .range(from, to);
        })
      ]);
      
      // Create maps for fast lookup - ensure only one challan per student per month/year
      const oneTimeChallanMap = new Map<number, { id: number; total: number }>();
      const regularChallanMap = new Map<number, { id: number; total: number }>();
      
      existingOneTimeChallans?.forEach((challan: any) => {
        oneTimeChallanMap.set(challan.student_id, { id: challan.id, total: Number(challan.total_amount) || 0 });
      });
      
      existingRegularChallans?.forEach((challan: any) => {
        regularChallanMap.set(challan.student_id, { id: challan.id, total: Number(challan.total_amount) || 0 });
      });
      
      // Prepare challans to create and items to insert
      const challansToCreate: any[] = [];
      const challanUpdates: Array<{ id: number; newTotal: number }> = [];
      const itemsToInsert: any[] = [];
      
      const challanDate = new Date().toISOString().split('T')[0];
      const dueDateOneTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dueDateRegular = new Date(selectedYear, selectedMonth - 1, 15).toISOString().split('T')[0];
      
      let createdCount = 0;
      let updatedCount = 0;
      
      // Process each preview
      for (const preview of previewData) {
        const newItems = preview.items.filter(item => !item.alreadyGenerated);
        const oneTimeItems = newItems.filter(item => item.isOneTime === true);
        const regularItems = newItems.filter(item => item.isOneTime !== true);
        
        // Handle one-time items
        if (oneTimeItems.length > 0) {
          const oneTimeTotal = oneTimeItems.reduce((sum, item) => sum + item.amount, 0);
          const existing = oneTimeChallanMap.get(preview.studentId);
          
          if (existing) {
            // Update existing challan
            challanUpdates.push({
              id: existing.id,
              newTotal: existing.total + oneTimeTotal
            });
            updatedCount++;
            
            // Add items for existing challan
            oneTimeItems.forEach(item => {
              if (item.feeHeadId && item.amount > 0) {
                itemsToInsert.push({
                  school_id: schoolId,
                  challan_id: existing.id,
                  fee_head_id: item.feeHeadId,
                  amount: item.amount,
                  discount: 0,
                  fine: 0,
                });
              }
            });
          } else {
            // Create new challan - only one per student for one-time
            challansToCreate.push({
              school_id: schoolId,
              student_id: preview.studentId,
              session_id: activeSession.id,
              challan_date: challanDate,
              due_date: dueDateOneTime,
              month: 'one-time',
              year: selectedYear,
              total_amount: oneTimeTotal,
              status: 'unpaid',
              _items: oneTimeItems, // Store items temporarily
            });
            createdCount++;
          }
        }
        
        // Handle regular items - ensure only one challan per student per month/year
        if (regularItems.length > 0) {
          const regularTotal = regularItems.reduce((sum, item) => sum + item.amount, 0);
          const existing = regularChallanMap.get(preview.studentId);
          
          if (existing) {
            // Update existing challan
            challanUpdates.push({
              id: existing.id,
              newTotal: existing.total + regularTotal
            });
            updatedCount++;
            
            // Add items for existing challan
            regularItems.forEach(item => {
              if (item.feeHeadId && item.amount > 0) {
                itemsToInsert.push({
                  school_id: schoolId,
                  challan_id: existing.id,
                  fee_head_id: item.feeHeadId,
                  amount: item.amount,
                  discount: 0,
                  fine: 0,
                });
              }
            });
          } else {
            // Create new challan - only one per student per month/year
            challansToCreate.push({
              school_id: schoolId,
              student_id: preview.studentId,
              session_id: activeSession.id,
              challan_date: challanDate,
              due_date: dueDateRegular,
              month: selectedMonth.toString(),
              year: selectedYear,
              total_amount: regularTotal,
              status: 'unpaid',
              _items: regularItems, // Store items temporarily
            });
            createdCount++;
          }
        }
      }
      
      // Batch create challans - ensure only one per student per month/year
      // Break into smaller chunks to avoid network timeouts
      let createdChallans: any[] = [];
      if (challansToCreate.length > 0) {
        const challanData = challansToCreate.map(({ _items, ...challan }) => challan);
        
        // Insert in smaller chunks to avoid network failures
        const chunkSize = 50; // Smaller chunks for better reliability
        const chunks: any[][] = [];
        for (let i = 0; i < challanData.length; i += chunkSize) {
          chunks.push(challanData.slice(i, i + chunkSize));
        }
        
        // Insert chunks with retry logic
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex];
          let retries = 3;
          let lastError: any = null;
          
          while (retries > 0) {
            try {
              const { data: insertedChallans, error: challanError } = await supabase
                .from('fee_challans')
                .insert(chunk)
                .select('id, student_id, month');
              
              if (challanError) {
                lastError = challanError;
                
                // Check if it's a unique constraint violation (duplicate)
                if (challanError.code === '23505') {
                  // Break out of retry loop and handle duplicates
                  break;
                }
                
                // Check if it's a network error
                if (challanError.message?.includes('Failed to fetch') || challanError.message?.includes('NetworkError')) {
                  retries--;
                  if (retries > 0) {
                    const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff: 1s, 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                  }
                }
                
                // Other errors - throw immediately
                throw new Error(`Failed to create challans: ${challanError.message}`);
              }
              
              // Success - add to created challans
              if (insertedChallans && insertedChallans.length > 0) {
                createdChallans.push(...insertedChallans);
                break; // Success, exit retry loop
              }
              retries--;
              
            } catch (error: any) {
              lastError = error;
              retries--;
              if (retries > 0) {
                const delay = Math.pow(2, 3 - retries) * 1000;
                console.log(`Error inserting chunk, retrying in ${delay}ms... (${3 - retries + 1}/3)`);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                throw error;
              }
            }
          }
          
          // Handle duplicate constraint violations after retries
          if (lastError && lastError.code === '23505') {
            // Handle potential duplicates - try to get existing ones for this chunk
            const studentIdsInChunk = chunk.map((ch: any) => ch.student_id);
            const [existingOneTime, existingRegular] = await Promise.all([
              fetchAllRows(async (from, to) => {
                return await supabase
                  .from('fee_challans')
                  .select('id, student_id, total_amount')
                  .eq('school_id', schoolId)
                  .eq('session_id', activeSession.id)
                  .eq('month', 'one-time')
                  .in('student_id', studentIdsInChunk)
                  .range(from, to);
              }),
              fetchAllRows(async (from, to) => {
                return await supabase
                  .from('fee_challans')
                  .select('id, student_id, total_amount')
                  .eq('school_id', schoolId)
                  .eq('session_id', activeSession.id)
                  .eq('month', selectedMonth.toString())
                  .eq('year', selectedYear)
                  .in('student_id', studentIdsInChunk)
                  .range(from, to);
              })
            ]);
            
            // Map existing challans
            const existingMap = new Map<number, number>();
            existingOneTime?.forEach((ch: any) => existingMap.set(ch.student_id, ch.id));
            existingRegular?.forEach((ch: any) => existingMap.set(ch.student_id, ch.id));
            
            // Find corresponding challan data from original array
            chunk.forEach((challanData: any) => {
              const originalChallan = challansToCreate.find(ch => 
                ch.student_id === challanData.student_id && 
                ch.month === challanData.month && 
                ch.year === challanData.year
              );
              
              if (originalChallan) {
                const existingId = existingMap.get(challanData.student_id);
                if (existingId) {
                  originalChallan._items.forEach((item: any) => {
                    if (item.feeHeadId && item.amount > 0) {
                      itemsToInsert.push({
                        school_id: schoolId,
                        challan_id: existingId,
                        fee_head_id: item.feeHeadId,
                        amount: item.amount,
                        discount: 0,
                        fine: 0,
                      });
                    }
                  });
                }
              }
            });
          } else if (lastError && !lastError.code) {
            // All retries exhausted for non-duplicate errors
            throw new Error(`Failed to create challans after 3 attempts: ${lastError.message || 'Network error'}`);
          }
        }
        
        // Add items for newly created challans
        if (createdChallans.length > 0) {
          createdChallans.forEach((created: any) => {
            const originalChallan = challansToCreate.find(ch => 
              ch.student_id === created.student_id && 
              ch.month === created.month
            );
            
            if (originalChallan) {
              originalChallan._items.forEach((item: any) => {
                if (item.feeHeadId && item.amount > 0) {
                  itemsToInsert.push({
                    school_id: schoolId,
                    challan_id: created.id,
                    fee_head_id: item.feeHeadId,
                    amount: item.amount,
                    discount: 0,
                    fine: 0,
                  });
                }
              });
            }
          });
        }
      }
      
      // Batch update challan totals
      if (challanUpdates.length > 0) {
        // Update in chunks to avoid overwhelming the database
        const chunkSize = 50;
        for (let i = 0; i < challanUpdates.length; i += chunkSize) {
          const chunk = challanUpdates.slice(i, i + chunkSize);
          const updateResults = await Promise.all(
            chunk.map(update =>
              supabase
                .from('fee_challans')
                .update({ total_amount: update.newTotal })
                .eq('id', update.id)
            )
          );
          
          // Check for errors in updates
          updateResults.forEach((result) => {
            if (result.error) {
              // Error updating challan - continue with other updates
            }
          });
        }
      }
      
      // Batch insert challan items - check for duplicates first
      let totalItemsInserted = 0;
      if (itemsToInsert.length > 0) {
        // Get existing items to avoid duplicates
        const challanIdsForItems = Array.from(new Set(itemsToInsert.map(item => item.challan_id)));
        const existingItemsMap = new Map<string, boolean>(); // "challanId-feeHeadId" -> true
        
        if (challanIdsForItems.length > 0) {
          const chunkSize = 1000;
          const chunks: number[][] = [];
          for (let i = 0; i < challanIdsForItems.length; i += chunkSize) {
            chunks.push(challanIdsForItems.slice(i, i + chunkSize));
          }
          
          for (const chunk of chunks) {
            const existingItems = await fetchAllRows(async (from, to) => {
              return await supabase
                .from('fee_challans_items')
                .select('challan_id, fee_head_id')
                .in('challan_id', chunk)
                .range(from, to);
            });
            
            existingItems?.forEach((item: any) => {
              const key = `${item.challan_id}-${item.fee_head_id}`;
              existingItemsMap.set(key, true);
            });
          }
        }
        
        // Filter out items that already exist
        const newItemsToInsert = itemsToInsert.filter(item => {
          const key = `${item.challan_id}-${item.fee_head_id}`;
          return !existingItemsMap.has(key);
        });
        
        // Batch insert only new items
        if (newItemsToInsert.length > 0) {
          const chunkSize = 500;
          let itemsInserted = 0;
          for (let i = 0; i < newItemsToInsert.length; i += chunkSize) {
            const chunk = newItemsToInsert.slice(i, i + chunkSize);
            const { data: insertedItems, error: itemsError } = await supabase
              .from('fee_challans_items')
              .insert(chunk)
              .select('id');
            
            if (itemsError) {
              throw new Error(`Failed to insert challan items: ${itemsError.message}`);
            }
            
            if (insertedItems && insertedItems.length > 0) {
              itemsInserted += insertedItems.length;
            }
          }
          
          totalItemsInserted = itemsInserted;
          
          // Verify items were actually inserted
          if (itemsInserted === 0 && newItemsToInsert.length > 0) {
            throw new Error(`No challan items were inserted. Expected ${newItemsToInsert.length} items.`);
          }
          
          console.log(`Successfully inserted ${itemsInserted} challan items`);
        } else if (itemsToInsert.length > 0) {
          console.log(`All ${itemsToInsert.length} items already exist, skipping insert`);
        }
      }
      
      // Verify that we actually created/updated something
      const totalChallansCreated = createdChallans.length;
      const totalChallansUpdated = challanUpdates.length;
      
      // Only show success if we actually did something
      if (totalChallansCreated === 0 && totalChallansUpdated === 0) {
        if (challansToCreate.length > 0) {
          throw new Error('No challans were created or updated. Please check the console for errors.');
        } else {
          // No challans to create, but maybe we updated existing ones
          showToast('No new challans to generate', 'error');
          return;
        }
      }
      
      const message = `Successfully generated ${totalChallansCreated} new challans${totalChallansUpdated > 0 ? ` and updated ${totalChallansUpdated} existing challans` : ''}${totalItemsInserted > 0 ? ` with ${totalItemsInserted} items` : ''}`;
      showToast(message, 'success');
      
      // Reset
      setPreviewData([]);
      setSelectedStudents(new Set());
      generatePreview();
    } catch (error: any) {
      const errorMessage = error?.message || error?.details || error?.hint || 'Failed to generate challans. Please check the console for details.';
      showToast(errorMessage, 'error');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };
  
  const handleSelectAll = () => {
    // Always use filteredStudents to respect all active filters (class, section, status, search)
    const targetStudentIds = new Set(filteredStudents.map(s => s.id));
    
    // Check if all target students are selected
    const allSelected = targetStudentIds.size > 0 && Array.from(targetStudentIds).every(id => selectedStudents.has(id));
    
    if (allSelected) {
      // Deselect all target students
      setSelectedStudents(prev => {
        const newSet = new Set(prev);
        targetStudentIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all target students
      setSelectedStudents(prev => {
        const newSet = new Set(prev);
        targetStudentIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };
  
  if (loading) return <Loader />;
  
  const totalPreviewAmount = previewData.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalNewItemsAmount = previewData.reduce((sum, p) => sum + p.newItemsTotal, 0);
  
  // Filter students based on search query, class, section, and status
  const filteredStudents = students.filter(student => {
    // Filter by class
    if (selectedClass !== 'all' && student.classId !== selectedClass) {
      return false;
    }
    
    // Filter by section
    if (selectedSection !== 'all' && student.sectionId !== selectedSection) {
      return false;
    }
    
    // Filter by status
    if (selectedStatus !== 'all' && student.status !== selectedStatus) {
      return false;
    }
    
    // Filter by search query
    if (!studentSearchQuery.trim()) return true;
    const query = studentSearchQuery.toLowerCase();
    const rollNumberNumeric = getSequenceNumber(student.roll_number) || '';
    return (
      student.name?.toLowerCase().includes(query) ||
      student.roll_number?.toLowerCase().includes(query) ||
      rollNumberNumeric.includes(query) ||
      student.father_name?.toLowerCase().includes(query) ||
      classes.find(c => c.id === student.classId)?.name?.toLowerCase().includes(query) ||
      sections.find(s => s.id === student.sectionId)?.name?.toLowerCase().includes(query)
    );
  });
  
  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Header>
          <Title>
            <Receipt />
            Generate Challans
          </Title>
        </Header>
        
        <MainContent>
          <LeftColumn>
          <FilterCard>
              <SectionTitle style={{ marginBottom: '8px', fontSize: '0.8rem' }}>
              Filters
              </SectionTitle>
            <FilterGrid>
              <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.8rem', color: '#3b82f6' }}>Class</InputLabel>
                <Select
                  value={selectedClass}
                  label="Class"
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedClass(value === 'all' ? 'all' : Number(value));
                      setSelectedSection('all'); // Reset section when class changes
                    }}
                    renderValue={(selected) => {
                      if (selected === 'all' || selected === null || selected === undefined) {
                        return <span style={{ color: 'inherit' }}>All Classes</span>;
                      }
                      const selectedClassId = typeof selected === 'number' ? selected : Number(selected);
                      if (isNaN(selectedClassId)) {
                        return <span style={{ color: 'inherit' }}>All Classes</span>;
                      }
                      const selectedClassObj = classes.find(c => c.id === selectedClassId);
                      return selectedClassObj?.name || '';
                    }}
                    sx={{ 
                      fontSize: '0.8rem', 
                      height: '36px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#2563eb',
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6',
                        }
                      }
                    }}
                >
                    <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>All Classes</MenuItem>
                  {sortClasses(classes).map(cls => (
                      <MenuItem key={cls.id} value={cls.id} sx={{ fontSize: '0.8rem' }}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.8rem', color: '#10b981' }}>Section</InputLabel>
                <Select
                  value={selectedSection}
                  label="Section"
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedSection(value === 'all' ? 'all' : Number(value));
                  }}
                  disabled={selectedClass === 'all'}
                  renderValue={(selected) => {
                    if (selected === 'all' || selected === null || selected === undefined) {
                      return <span style={{ color: 'inherit' }}>All Sections</span>;
                    }
                    const selectedSectionId = typeof selected === 'number' ? selected : Number(selected);
                    if (isNaN(selectedSectionId)) {
                      return <span style={{ color: 'inherit' }}>All Sections</span>;
                    }
                    const selectedSectionObj = sections.find(s => s.id === selectedSectionId);
                    return selectedSectionObj?.name || '';
                  }}
                    sx={{ 
                      fontSize: '0.8rem', 
                      height: '36px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      '@media (max-width: 600px)': {
                        height: '44px',
                        fontSize: '0.85rem',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#10b981',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#059669',
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                        }
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      }
                    }}
                >
                    <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>All Sections</MenuItem>
                  {sections.filter(s => selectedClass === 'all' || s.class_id === selectedClass).map(sec => (
                      <MenuItem key={sec.id} value={sec.id} sx={{ fontSize: '0.8rem' }}>
                      {sec.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.8rem', color: '#f59e0b' }}>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="Status"
                  onChange={(e) => setSelectedStatus(e.target.value === 'all' ? 'all' : e.target.value)}
                    sx={{ 
                      fontSize: '0.8rem', 
                      height: '36px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      '@media (max-width: 600px)': {
                        height: '44px',
                        fontSize: '0.85rem',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#f59e0b',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d97706',
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#f59e0b',
                        }
                      }
                    }}
                >
                    <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>All Statuses</MenuItem>
                  {availableStatuses.map(status => (
                      <MenuItem key={status} value={status} sx={{ fontSize: '0.8rem' }}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.8rem', color: '#8b5cf6' }}>Month</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Month"
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    sx={{ 
                      fontSize: '0.8rem', 
                      height: '36px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#8b5cf6',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#7c3aed',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#8b5cf6',
                      }
                    }}
                >
                  {MONTHS.map(month => (
                      <MenuItem key={month.value} value={month.value} sx={{ fontSize: '0.8rem' }}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.8rem', color: '#ec4899' }}>Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Year"
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                    sx={{ 
                      fontSize: '0.8rem', 
                      height: '36px',
                      backgroundColor: 'rgba(236, 72, 153, 0.1)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#ec4899',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(236, 72, 153, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#db2777',
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(236, 72, 153, 0.15)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#ec4899',
                        }
                      },
                      '@media (max-width: 600px)': {
                        height: '44px',
                        fontSize: '0.85rem',
                      }
                    }}
                >
                  {Array.from({ length: 16 }, (_, i) => 2020 + i).map(year => (
                      <MenuItem key={year} value={year} sx={{ fontSize: '0.8rem' }}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FilterGrid>
          </FilterCard>
          
          {students.length > 0 && (
            <StudentsList>
                <StudentsListHeader>
                  <SectionTitle>
                    Students
                    <CountBadge>{filteredStudents.length}</CountBadge>
                  </SectionTitle>
                  <SearchInput
                    placeholder="Search students..."
                    size="small"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      width: '180px',
                      '& .MuiOutlinedInput-root': {
                        height: '28px',
                      },
                      '@media (max-width: 600px)': {
                        width: 'auto',
                        flex: '1 1 auto',
                        minWidth: '150px',
                        maxWidth: 'calc(100% - 120px)',
                        '& .MuiOutlinedInput-root': {
                          height: '32px',
                        }
                      }
                    }}
                  />
                </StudentsListHeader>
                <StudentsListContent>
                  {loadingStudents ? (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      padding: '40px',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <CircularProgress size={32} sx={{ color: theme.ACCENT }} />
                      <Typography sx={{ 
                        fontSize: '0.85rem', 
                        color: theme.TEXT_SECONDARY 
                      }}>
                        Loading students...
                      </Typography>
                    </Box>
                  ) : (
                    <StudentsGrid>
                      {filteredStudents.map(student => {
                        // Extract roll number without school ID prefix
                        const rollNumberNumeric = getSequenceNumber(student.roll_number) || 'N/A';
                        const className = classes.find(c => c.id === student.classId)?.name || 'N/A';
                        const sectionName = sections.find(s => s.id === student.sectionId)?.name;
                        const detailsLine = `${rollNumberNumeric} . ${className}${sectionName ? ` (${sectionName})` : ''}`;
                        const initials = student.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                        
                        const fullName = student.father_name 
                          ? `${student.name} . ${student.father_name}`
                          : student.name;
                        const tooltipText = `${fullName}\n${detailsLine}`;
                        
                        return (
                          <Tooltip 
                            key={student.id}
                            title={tooltipText}
                            arrow
                            placement="top"
                            disableInteractive
                            enterDelay={300}
                            leaveDelay={0}
                            PopperProps={{
                              style: { pointerEvents: 'none' }
                            }}
                          >
                            <StudentCard
                              selected={selectedStudents.has(student.id)}
                              onClick={() => handleStudentToggle(student.id)}
                            >
                              <StudentAvatar>
                                {student.picture_url ? (
                                  <img src={student.picture_url} alt={student.name} />
                                ) : (
                                  initials
                                )}
                              </StudentAvatar>
                              <StudentInfo>
                                <StudentName>
                                  {student.name}
                                  {student.father_name && (
                                    <> . <span className="father-name">{student.father_name}</span></>
                                  )}
                                </StudentName>
                                <StudentDetails>{detailsLine}</StudentDetails>
                              </StudentInfo>
                            </StudentCard>
                          </Tooltip>
                        );
                      })}
                    </StudentsGrid>
                  )}
                </StudentsListContent>
                <StudentsListFooter>
                  {filteredStudents.length > 0 && (() => {
                    // Always use filteredStudents to respect all active filters (class, section, status, search)
                    const targetStudentIds = new Set(filteredStudents.map(s => s.id));
                    const selectedCount = Array.from(targetStudentIds).filter(id => selectedStudents.has(id)).length;
                    const allSelected = targetStudentIds.size > 0 && selectedCount === targetStudentIds.size;
                    const someSelected = selectedCount > 0 && selectedCount < targetStudentIds.size;
                    
                    return (
                      <>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={handleSelectAll}
                              size="small"
                              sx={{ padding: '4px' }}
                            />
                          }
                          label={
                            <Typography sx={{ fontSize: '0.75rem' }}>
                              Select All <CountBadge>{selectedCount}/{targetStudentIds.size}</CountBadge>
                            </Typography>
                          }
                          sx={{ margin: 0 }}
                        />
                        <ActionButton
                          variant="contained"
                          startIcon={<CalendarMonth />}
                          onClick={generatePreview}
                          disabled={selectedStudents.size === 0 || !selectedSession}
                        >
                          Preview
                        </ActionButton>
                      </>
                    );
                  })()}
                </StudentsListFooter>
            </StudentsList>
          )}
          </LeftColumn>
          
          <RightColumn>
            {previewData.length > 0 ? (
            <SummaryCard>
                <PreviewHeader>
                  <SectionTitle>
                    Preview
                    <CountBadge>{previewData.length}</CountBadge>
                  </SectionTitle>
                  <ActionButton
                    variant="contained"
                    color="primary"
                    startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}
                    onClick={handleGenerateChallans}
                    disabled={generating || previewData.length === 0 || previewData.reduce((sum, p) => sum + p.newItemsTotal, 0) === 0}
                  >
                    {generating ? 'Generating...' : (() => {
                      const newChallansCount = previewData.filter(p => p.newItemsTotal > 0).length;
                      return newChallansCount > 0 ? `Generate ${newChallansCount}` : 'All Generated';
                    })()}
                  </ActionButton>
                </PreviewHeader>
              
              <PreviewContent>
                  <PreviewGrid>
                {previewData.map(preview => (
                  <PreviewItem key={preview.studentId}>
                        <PreviewItemHeader>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: theme.TEXT_PRIMARY }}>
                            {preview.studentName}
                    </Typography>
                          <Chip 
                            label={preview.className}
                            size="small" 
                            sx={{ 
                              height: '16px',
                              fontSize: '0.6rem',
                              fontWeight: 500,
                              padding: '0 4px'
                            }} 
                          />
                        </PreviewItemHeader>
                        <FeeItemsList>
                          {preview.items.map(item => (
                            <FeeItemRow 
                              key={item.feeHeadId}
                              sx={{
                                opacity: item.alreadyGenerated ? 0.65 : 1,
                                padding: '3px 0',
                              }}
                            >
                              <Box display="flex" alignItems="center" justifyContent="space-between" flex={1} gap={1}>
                                <Box display="flex" alignItems="center" gap={0.5} flex={1} minWidth={0}>
                                  <FeeItemName sx={{ 
                                    textDecoration: item.alreadyGenerated ? 'line-through' : 'none',
                                    color: item.alreadyGenerated ? theme.TEXT_SECONDARY : theme.TEXT_PRIMARY,
                              fontSize: '0.7rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {item.feeHeadName}
                                  </FeeItemName>
                                  {item.alreadyGenerated && (
                                    <Done 
                                      sx={{ 
                                        fontSize: '0.7rem',
                                        color: theme.ACCENT,
                                        flexShrink: 0
                            }} 
                          />
                                  )}
                        </Box>
                                <FeeItemAmount sx={{
                                  color: item.alreadyGenerated ? theme.TEXT_SECONDARY : theme.TEXT_PRIMARY,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  flexShrink: 0,
                                  minWidth: '70px',
                                  textAlign: 'right'
                                }}>
                          Rs. {item.amount.toFixed(2)}
                        </FeeItemAmount>
                              </Box>
                      </FeeItemRow>
                    ))}
                        </FeeItemsList>
                    <TotalRow>
                          <Box>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>Total:</Typography>
                            {preview.newItemsTotal < preview.totalAmount && (
                              <Typography sx={{ fontSize: '0.6rem', color: theme.TEXT_SECONDARY, mt: 0.2 }}>
                                New: Rs. {preview.newItemsTotal.toFixed(2)}
                              </Typography>
                            )}
                          </Box>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: theme.ACCENT }}>
                        Rs. {preview.totalAmount.toFixed(2)}
                      </Typography>
                    </TotalRow>
                  </PreviewItem>
                ))}
                  </PreviewGrid>
              </PreviewContent>
              
                {previewData.length > 0 && (
                  <Box 
                    pt={0.75} 
                    mt={0.75}
                    borderTop={`1px solid ${theme.BORDER}`}
                    sx={{ flexShrink: 0 }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={totalNewItemsAmount < totalPreviewAmount ? 0.4 : 0}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>
                        Grand Total:
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: theme.ACCENT }}>
                        Rs. {totalPreviewAmount.toFixed(2)}
                      </Typography>
                    </Box>
                    {totalNewItemsAmount < totalPreviewAmount && (
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 500, color: theme.TEXT_SECONDARY }}>
                          New Items:
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: theme.ACCENT }}>
                          Rs. {totalNewItemsAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </SummaryCard>
            ) : (
              <SummaryCard>
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  justifyContent="center" 
                  height="100%"
                  sx={{ color: theme.TEXT_SECONDARY }}
                >
                  <Receipt sx={{ fontSize: '3rem', opacity: 0.3, mb: 1 }} />
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    No preview available
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                    Select students and click Preview
                  </Typography>
              </Box>
            </SummaryCard>
          )}
          </RightColumn>
        </MainContent>
      </PageContainer>
    </ThemeProvider>
  );
};

export default ChallanGenerationPage;

