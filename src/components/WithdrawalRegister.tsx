import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { useNavigate } from 'react-router-dom';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import NoStudentsFound from './NoStudentsFound';
import { useLoading } from '../contexts/LoadingContext';
import { useProgress as useProgressHook } from './Layout';
import Loader from './Loader';
import {
  PictureAsPdf,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
  will-change: transform;
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

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  box-shadow: 0 1px 4px #0001;
  padding: 6px 8px;
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

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
  height: 32px;
  line-height: 32px;
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
  min-width: 220px;
  max-width: 320px;
  width: 100%;
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

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow: hidden;
  padding: 0 0 0 0;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: scroll-position;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
    perspective: none;
    overscroll-behavior: contain;
    scroll-snap-type: none;
  }
  
  @media (min-width: 701px) {
    scroll-behavior: smooth;
    scroll-snap-type: y proximity;
    perspective: 1000px;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
  
  @media (max-width: 700px) {
    &::-webkit-scrollbar {
      width: 4px;
    }
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  margin-top: 8px;
  position: relative;
  flex: 1;
  min-height: 0;
  
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 1100px;
  
  @media (max-width: 768px) {
    min-width: 900px;
    font-size: 0.9rem;
  }
  
  thead {
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  thead tr {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
    position: relative;
  }
  
  
  tbody tr {
    transition: background-color 0.2s ease;
    cursor: pointer;
    border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
    
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
    }
    
    &:last-child {
      border-bottom: none;
    }
  }
`;

const Th = styled.th`
  padding: 1rem 1.2rem;
  text-align: left;
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  position: sticky;
  top: 0;
  z-index: 100;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.9rem;
    font-size: 0.75rem;
  }
`;

const ThGroup = styled.th`
  padding: 0.5rem 1.2rem;
  text-align: center;
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  position: sticky;
  top: 0;
  z-index: 100;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.9rem;
    font-size: 0.8rem;
  }
`;

const Td = styled.td`
  padding: 1rem 1.2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  font-weight: 500;
  vertical-align: middle;
  white-space: normal;
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.9rem;
    font-size: 0.85rem;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ status }) =>
    status === 'active' ? 'rgb(34, 197, 94)' :
    status === 'suspended' ? 'rgb(245, 158, 11)' :
    status === 'withdrawn' ? 'rgb(239, 68, 68)' :
    'rgb(99, 102, 241)'};
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.13);
  letter-spacing: 0.02em;
`;

const ActionButton = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
  margin-right: 0.5rem;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}dd;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  & svg {
    font-size: 1rem;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  padding: 0.15rem 0;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 -1px 6px #0001;
  flex: 0 0 auto;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 0;
    padding: 0.15rem 0.1rem 0.05rem 0.1rem;
  }
`;

const PaginationInfo = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  
  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.9rem;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 700px) {
    flex: none;
    margin-left: auto;
    width: auto;
    gap: 0.2rem;
  }
`;

const NoResults = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  margin: 48px 0;
  padding: 2rem;
`;

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'withdrawn', label: 'Withdrawn' },
] as const;

const WithdrawalRegister: React.FC = () => {
  const { theme } = React.useContext(ThemeContext);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const [students, setStudents] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [sectionOptions, setSectionOptions] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [sessionOptions, setSessionOptions] = useState<any[]>([]);
  const [loadingSessionsFilter, setLoadingSessionsFilter] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const { startProgress, completeProgress, setProgress } = useProgressHook();
  const [showNoStudents, setShowNoStudents] = useState(false);
  const [hasFetchedStudents, setHasFetchedStudents] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  // Filtered students computation
  const filteredStudents = useMemo(() => {
    if (!students.length) return [];
    
    const searchLower = search.trim().toLowerCase();
    const searchTerm = search.trim();
    const isNumericSearch = !isNaN(Number(searchTerm));
    const searchTermNum = isNumericSearch ? parseInt(searchTerm) : null;
    const classFilterStr = classFilter ? String(classFilter) : '';
    const sectionFilterStr = sectionFilter ? String(sectionFilter) : '';
    const sessionFilterStr = sessionFilter ? String(sessionFilter) : '';
    const statusFilterStr = statusFilter ? String(statusFilter) : '';
    
    const scoredResults: Array<{ student: typeof students[0]; score: number }> = [];
    
    for (let i = 0; i < students.length; i++) {
      const stu = students[i];
      let shouldInclude = true;
      let searchScore = 0;
      
      // Search filter
      if (searchLower && shouldInclude) {
        let searchMatch = false;

        // Check ID/roll_number search using utility function
        const idMatch = matchesStudentSearch(stu, searchTerm);
        if (idMatch.matches) {
          searchScore = idMatch.score;
          searchMatch = true;
        }
        
        if (!searchMatch) {
          const nameMatch = stu.name?.toLowerCase().includes(searchLower);
          const classMatch = stu.classes?.name?.toLowerCase().includes(searchLower);
          const sectionMatch = stu.sections?.name?.toLowerCase().includes(searchLower);
          const sessionMatch = stu.sessions?.name?.toLowerCase().includes(searchLower);
          
          if (nameMatch || classMatch || sectionMatch || sessionMatch) {
            searchMatch = true;
            if (nameMatch) {
              if (stu.name?.toLowerCase().startsWith(searchLower)) {
                searchScore = Math.max(searchScore, 100);
              } else {
                searchScore = Math.max(searchScore, 50);
              }
            } else {
              searchScore = Math.max(searchScore, 25);
            }
          }
        }
        
        if (!searchMatch) {
          shouldInclude = false;
        }
      }
      
      // Class filter - filter by current class (new_class_id)
      if (classFilterStr && shouldInclude) {
        // Check both current class and admission class for filtering
        const currentClassId = stu.class_id || (stu.classes?.id ? String(stu.classes.id) : null);
        const admissionClassId = stu.admission_class?.id ? String(stu.admission_class.id) : null;
        shouldInclude = currentClassId === classFilterStr || admissionClassId === classFilterStr;
      }
      
      // Section filter - filter by current section (new_section_id)
      if (sectionFilterStr && shouldInclude) {
        // Check both current section and admission section for filtering
        const currentSectionId = stu.section_id ? String(stu.section_id) : null;
        const admissionSectionId = stu.admission_section?.id ? String(stu.admission_section.id) : null;
        shouldInclude = currentSectionId === sectionFilterStr || admissionSectionId === sectionFilterStr;
      }
      
      // Session filter
      if (sessionFilterStr && shouldInclude) {
        shouldInclude = String(stu.session_id) === sessionFilterStr;
      }
      
      // Status filter
      if (statusFilterStr && shouldInclude) {
        shouldInclude = String(stu.status) === statusFilterStr;
      }
      
      if (shouldInclude) {
        scoredResults.push({ student: stu, score: searchScore });
      }
    }
    
    // Sort by score descending, then by ID ascending
    scoredResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.student.id - b.student.id;
    });
    
    return scoredResults.map(item => item.student);
  }, [students, search, classFilter, sectionFilter, sessionFilter, statusFilter]);

  const totalPages = Math.ceil(filteredStudents.length / perPage);
  const paginated = filteredStudents.slice((page - 1) * perPage, page * perPage);

  // Search debounce
  useEffect(() => {
    const delay = 300;
    let timeoutId: NodeJS.Timeout;
    
    timeoutId = setTimeout(() => {
      setSearch(searchInput);
    }, delay);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchInput]);

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.school_id) {
        showToast('User school information not found', 'error');
        setLoading(false);
        setHasFetchedStudents(true);
        return;
      }
      
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      startProgress(false);
      setProgress(10);
      
      // Always fetch all students from all sessions - no session filtering
      setProgress(40);
      
      setProgress(70);
      const { data, error } = await supabase
        .from('students')
        .select(`*, classes(name), sections(name)`)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });
      
      setProgress(90);
      
      if (!error) {
        const studentsData = data || [];
        
        // Fetch admission class and current class for each student from student_class_history
        // Get the first record (admission) and the latest record (current) for each student
        const studentIds = studentsData.map((s: any) => s.id);
        if (studentIds.length > 0) {
          // Get all history records for these students
          const { data: historyData } = await supabase
            .from('student_class_history')
            .select(`
              id,
              student_id,
              adm_class_id,
              adm_section_id,
              new_class_id,
              new_section_id,
              exit_date,
              status,
              adm_classes:adm_class_id(id, name),
              adm_sections:adm_section_id(id, name),
              new_classes:new_class_id(id, name),
              new_sections:new_section_id(id, name)
            `)
            .in('student_id', studentIds)
            .eq('school_id', user.school_id)
            .order('id', { ascending: true });
          
          // Create maps for admission (first record), current (last record), and withdrawal classes
          const admissionClassMap = new Map();
          const currentClassMap = new Map();
          const withdrawalDataMap = new Map();
          
          if (historyData && historyData.length > 0) {
            // Group by student_id
            const studentRecordsMap = new Map();
            historyData.forEach((entry: any) => {
              const studentId = entry.student_id;
              if (!studentRecordsMap.has(studentId)) {
                studentRecordsMap.set(studentId, []);
              }
              studentRecordsMap.get(studentId).push(entry);
            });
            
            // For each student, get first record (admission), last record (current), and withdrawal record
            studentRecordsMap.forEach((records, studentId) => {
              if (records.length > 0) {
                // First record = admission
                const firstRecord = records[0];
                admissionClassMap.set(studentId, {
                  class: firstRecord.adm_classes,
                  section: firstRecord.adm_sections
                });
                
                // Last record = current
                const lastRecord = records[records.length - 1];
                currentClassMap.set(studentId, {
                  class: lastRecord.new_classes || lastRecord.adm_classes,
                  section: lastRecord.new_sections || lastRecord.adm_sections
                });
                
                // Find withdrawal record (with exit_date)
                const withdrawalRecord = records.find((r: any) => r.exit_date);
                if (withdrawalRecord) {
                  withdrawalDataMap.set(studentId, {
                    exit_date: withdrawalRecord.exit_date,
                    class: withdrawalRecord.new_classes || withdrawalRecord.adm_classes,
                    section: withdrawalRecord.new_sections || withdrawalRecord.adm_sections
                  });
                }
              }
            });
          }
          
          // Add admission, current, and withdrawal data to each student
          const studentsWithClasses = studentsData.map((student: any) => {
            const admission = admissionClassMap.get(student.id);
            const current = currentClassMap.get(student.id);
            const withdrawal = withdrawalDataMap.get(student.id);
            
            // Get admission and current class IDs for comparison
            const admissionClassId = admission?.class?.id;
            const currentClassId = current?.class?.id || (student.classes ? student.class_id : null);
            
            // Initialize withdrawal data
            let finalWithdrawalClass = withdrawal?.class;
            let finalWithdrawalSection = withdrawal?.section;
            let finalWithdrawalDate = withdrawal?.exit_date;
            
            // If admission class and current class are different, set current class as withdrawal class
            // But only set withdrawal date if student is withdrawn or suspended
            if (admissionClassId && currentClassId && admissionClassId !== currentClassId) {
              finalWithdrawalClass = current?.class || (student.classes ? { id: student.class_id, name: student.classes?.name } : null);
              finalWithdrawalSection = current?.section || (student.sections ? { id: student.section_id, name: student.sections?.name } : null);
              
              // Only set withdrawal date if student is withdrawn or suspended
              if (student.status !== 'withdrawn' && student.status !== 'suspended') {
                finalWithdrawalDate = null;
              }
            }
            
            // For withdrawn/suspended students, if no withdrawal class found, use current class as withdrawal class
            if ((student.status === 'withdrawn' || student.status === 'suspended') && !finalWithdrawalClass) {
              finalWithdrawalClass = current?.class || (student.classes ? { id: student.class_id, name: student.classes?.name } : null);
              finalWithdrawalSection = current?.section || (student.sections ? { id: student.section_id, name: student.sections?.name } : null);
            }
            
            // If still no withdrawal date for withdrawn students, use status_updated_at
            if (student.status === 'withdrawn' && !finalWithdrawalDate && student.status_updated_at) {
              finalWithdrawalDate = new Date(student.status_updated_at).toISOString().split('T')[0];
            }
            
            return {
              ...student,
              admission_class: admission?.class || null,
              admission_section: admission?.section || null,
              // Override current class/section from history if available
              classes: current?.class || student.classes || null,
              sections: current?.section || student.sections || null,
              // Withdrawal data
              withdrawal_date: finalWithdrawalDate || null,
              withdrawal_class: finalWithdrawalClass || null,
              withdrawal_section: finalWithdrawalSection || null,
            };
          });
          
          setStudents(studentsWithClasses);
        } else {
          setStudents(studentsData);
        }
      } else {
        showToast('Failed to load students', 'error');
      }
      
      setProgress(100);
      
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
          setHasFetchedStudents(true);
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
        setHasFetchedStudents(true);
      }
    };
    
    fetchStudents().catch((error) => {
      setLoading(false);
      completeProgress();
      setHasFetchedStudents(true);
      showToast('Failed to load students', 'error');
    });
  }, [sessionFilter, user?.school_id, startProgress, setProgress, completeProgress]);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.school_id) return;
      
      setLoadingClasses(true);
      const { data } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user.school_id);
      const sortedClasses = sortClasses(data || []);
      setClassOptions(sortedClasses);
      setLoadingClasses(false);
    };
    fetchClasses();
  }, [user?.school_id]);

  // Fetch sections
  useEffect(() => {
    if (!classFilter || !user?.school_id) {
      setSectionOptions([]);
      return;
    }
    const fetchSections = async () => {
      setLoadingSections(true);
      const { data } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', classFilter)
        .eq('school_id', user.school_id);
      setSectionOptions(data || []);
      setLoadingSections(false);
    };
    fetchSections();
  }, [classFilter, user?.school_id]);

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.school_id) return;
      
      setLoadingSessionsFilter(true);
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user.school_id);
      if (sessionsError) {
      } else {
        setSessionOptions(sessionsData || []);
        // Don't set default session filter - show all students from all sessions
      }
      setLoadingSessionsFilter(false);
    };
    fetchSessions();
  }, [user?.school_id]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filteredStudents.length, perPage]);

  // Handle filter changes
  const handleClassFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassFilter = e.target.value;
    setClassFilter(newClassFilter);
    setSectionFilter('');
    
    const selectedClass = classOptions.find(c => String(c.id) === String(newClassFilter));
    const hasSections = selectedClass?.has_sections ?? true;
    
    if (!hasSections) {
      setSectionFilter('');
    }
  }, [classOptions]);

  const handleSectionFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSectionFilter(e.target.value);
  }, []);

  const handleSessionFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSessionFilter(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  // Format date helper
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Export to PDF
  const handleExportPdf = async () => {
    if (!filteredStudents.length) return;
    
    setExportLoading(true);
    try {
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      
      const { jsPDF } = jsPDFModule;
      const autoTable = autoTableModule.default;
    
      // Fetch school details
      let schoolName = '';
      let schoolAddress = '';
      let schoolPhone = '';
      
      if (user?.school_id) {
        try {
          // Fetch institute profile
          const { data: profileData } = await supabase
            .from('institute_profile')
            .select('*')
            .eq('school_id', user.school_id)
            .single();
          
          // Fetch school data
          const { data: schoolData } = await supabase
            .from('schools')
            .select('*')
            .eq('id', user.school_id)
            .single();
          
          // Merge data (prefer institute_profile, fallback to schools)
          schoolName = profileData?.name || schoolData?.name || '';
          schoolAddress = profileData?.address || schoolData?.address || '';
          schoolPhone = profileData?.phone || schoolData?.contact || '';
        } catch (error) {
        }
      }
    
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;
      const tableTop = 25; // Increased to accommodate school details
      const tableBottom = pageHeight - 15;
      
      const sortedStudents = [...filteredStudents].sort((a, b) => Number(a.id) - Number(b.id));
      
      // Helper to add header on each page
      const addHeader = (pageNum: number, totalPages: number) => {
        let yPos = 8;
        
        // School name (if available) - same font size as report title
        if (schoolName) {
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
          yPos += 5;
        }
        
        // School address and phone (if available) - increased font size
        if (schoolAddress || schoolPhone) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const schoolInfo = [schoolAddress, schoolPhone].filter(Boolean).join(' | ');
          doc.text(schoolInfo, pageWidth / 2, yPos, { align: 'center' });
          yPos += 6; // Increased spacing to properly separate from report title
        }
        
        // Report title - same font size as school name
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Admission & Withdrawal Register', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
        
        // Session and class info - moved to right side
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        // Show active session in header, or use sessionFilter if explicitly selected
        const activeSession = sessionOptions.find(s => s.is_active);
        const sessionName = sessionFilter 
          ? sessionOptions.find(s => String(s.id) === String(sessionFilter))?.name || 'All Sessions'
          : (activeSession?.name || 'All Sessions');
        const className = classFilter ? classOptions.find(c => String(c.id) === String(classFilter))?.name || 'All Classes' : 'All Classes';
        doc.text(`Session: ${sessionName} | Class: ${className}`, pageWidth - margin, yPos, { align: 'right' });
        
        // Generated date - left side
        doc.setFontSize(7);
        doc.text(`Generated: ${formatDate(new Date())}`, margin, yPos, { align: 'left' });
        yPos += 4;
        
        // No line under header
      };
      
      // Helper to add footer
      const addFooter = (pageNum: number, totalPages: number) => {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Total Students: ${sortedStudents.length} | Page ${pageNum} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
        doc.setTextColor(0, 0, 0);
      };
      
      // Table columns - compact and professional
      const head = [
        ['#', 'ID', 'Student Name', 'Father Name', 'Adm Date', 'Adm Class', 'Wid. Date', 'Wid. Class', 'DOB', 'Phone', 'Address', 'Status']
      ];
      
      // Table rows - optimized for space
      // Store status values for color coding
      const statusMap = new Map<number, string>();
      const body = sortedStudents.map((stu: any, idx: number) => {
        const originalStatus = (stu.status || 'active').toLowerCase();
        statusMap.set(idx, originalStatus);
        
        return [
          idx + 1,
          getStudentDisplayId(stu),
          stu.name || '-',
          stu.father_name || '-',
          formatDate(stu.admission_date || stu.created_at),
          stu.admission_class?.name 
            ? `${stu.admission_class.name}${stu.admission_section?.name ? ` (${stu.admission_section.name})` : ''}`
            : '-',
          stu.withdrawal_date ? formatDate(stu.withdrawal_date) : '-',
          stu.withdrawal_class?.name 
            ? `${stu.withdrawal_class.name}${stu.withdrawal_section?.name ? ` (${stu.withdrawal_section.name})` : ''}`
            : '-',
          stu.dob ? formatDate(stu.dob) : '-',
          stu.phone || stu.father_mobile || '-',
          (stu.address || '-').substring(0, 30) + ((stu.address && stu.address.length > 30) ? '...' : ''),
          (() => {
            const status = originalStatus;
            // Replace "withdrawn" with "Withd."
            if (status === 'withdrawn') {
              return 'Withd.';
            }
            const statusText = status.charAt(0).toUpperCase() + status.slice(1);
            // Truncate if longer than 8 characters (fits in 11mm column width)
            if (statusText.length > 8) {
              return statusText.substring(0, 8) + '..';
            }
            return statusText;
          })()
        ];
      });
      
      // Calculate available width (page width minus margins)
      const availableWidth = pageWidth - (2 * margin);
      
      // Fixed widths for content-fitting columns (all except Name and Father Name)
      const fixedWidths = {
        sno: 6,      // S.No - fit content
        id: 7,       // ID - fit content
        admDate: 14, // Adm Date - fit content
        admClass: 16, // Adm Class - fit content
        withdDate: 14, // Wid. Date - fit content
        withdClass: 16, // Wid. Class - fit content
        dob: 14,     // DOB - fit content
        phone: 18,   // Phone - fit content
        address: 25, // Address - fit content
        status: 11   // Status - fit content (increased to prevent header wrapping)
      };
      
      // Calculate total fixed width
      const totalFixedWidth = fixedWidths.sno + fixedWidths.id + fixedWidths.admDate + 
                              fixedWidths.admClass + fixedWidths.withdDate + fixedWidths.withdClass + 
                              fixedWidths.dob + fixedWidths.phone + fixedWidths.address + fixedWidths.status;
      
      // Remaining width for Name and Father Name (equal width)
      const nameColumnWidth = (availableWidth - totalFixedWidth) / 2;
      
      // Column widths array
      const columnWidths = [
        fixedWidths.sno,           // 0: S.No
        fixedWidths.id,            // 1: ID
        nameColumnWidth,           // 2: Student Name (equal share)
        nameColumnWidth,           // 3: Father Name (equal share)
        fixedWidths.admDate,       // 4: Adm Date
        fixedWidths.admClass,      // 5: Adm Class
        fixedWidths.withdDate,     // 6: Withd Date
        fixedWidths.withdClass,    // 7: Withd Class
        fixedWidths.dob,           // 8: DOB
        fixedWidths.phone,         // 9: Phone
        fixedWidths.address,       // 10: Address
        fixedWidths.status         // 11: Status
      ];
      
      autoTable(doc, {
        head,
        body,
        theme: 'grid',
        startY: tableTop,
        margin: { top: tableTop, left: margin, right: margin, bottom: 15 },
        headStyles: {
          fillColor: [51, 51, 51],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
          lineWidth: 0.2,
        },
        bodyStyles: {
          fontSize: 6.5,
          cellPadding: { top: 1, bottom: 1, left: 0.8, right: 0.8 },
          halign: 'left',
          valign: 'middle',
          textColor: [40, 40, 40],
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          minCellHeight: 4,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: columnWidths[0] }, // S.No
          1: { halign: 'center', cellWidth: columnWidths[1] }, // ID
          2: { cellWidth: columnWidths[2] }, // Student Name
          3: { cellWidth: columnWidths[3] }, // Father Name
          4: { halign: 'center', cellWidth: columnWidths[4] }, // Adm Date
          5: { halign: 'center', cellWidth: columnWidths[5] }, // Adm Class
          6: { halign: 'center', cellWidth: columnWidths[6] }, // Withd Date
          7: { halign: 'center', cellWidth: columnWidths[7] }, // Withd Class
          8: { halign: 'center', cellWidth: columnWidths[8] }, // DOB
          9: { halign: 'center', cellWidth: columnWidths[9] }, // Phone
          10: { cellWidth: columnWidths[10], fontSize: 6 }, // Address (smaller font)
          11: { halign: 'center', cellWidth: columnWidths[11], overflow: 'hidden' }, // Status (prevent wrapping)
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245],
        },
        showHead: 'everyPage',
        showFoot: 'never',
        didParseCell: (data: any) => {
          // Apply row fill and text colors for body rows only
          if (data.row.index !== undefined && (data.row.section === 'body' || !data.row.section)) {
            const rowIndex = data.row.index;
            const status = statusMap.get(rowIndex) || 'active';
            
            // Fill entire row with light red for withdrawn and suspended students
            if (status === 'withdrawn' || status === 'suspended') {
              data.cell.styles.fillColor = [255, 240, 240]; // Light red background
            }
            
            // Apply text colors to status column (column index 11)
            if (data.column.index === 11) {
              if (status === 'active') {
                data.cell.styles.textColor = [34, 197, 94]; // Green text
              } else if (status === 'suspended') {
                data.cell.styles.textColor = [245, 158, 11]; // Orange text
              } else if (status === 'withdrawn') {
                data.cell.styles.textColor = [239, 68, 68]; // Red text
              } else {
                data.cell.styles.textColor = [99, 102, 241]; // Default purple text
              }
            }
          }
        },
        didDrawPage: (data: any) => {
          // Store the final Y position on each page (will use the last page's position)
          (doc as any).lastAutoTable = { finalY: data.cursor.y };
        },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        tableWidth: 'wrap',
      });
      
      // Get actual total pages after table is drawn
      const actualTotalPages = (doc as any).internal.pages.length - 1;
      
      // Calculate summary statistics
      const totalStudents = sortedStudents.length;
      const activeStudents = sortedStudents.filter((s: any) => (s.status || 'active').toLowerCase() === 'active').length;
      const inactiveStudents = sortedStudents.filter((s: any) => (s.status || 'active').toLowerCase() === 'inactive').length;
      const withdrawnStudents = sortedStudents.filter((s: any) => (s.status || 'active').toLowerCase() === 'withdrawn').length;
      const suspendedStudents = sortedStudents.filter((s: any) => (s.status || 'active').toLowerCase() === 'suspended').length;
      
      // Add summary at the end of the last page
      const lastPage = actualTotalPages;
      doc.setPage(lastPage);
      
      // Get the current Y position after the table
      const finalY = (doc as any).lastAutoTable?.finalY || pageHeight - 30;
      let summaryY = finalY + 5;
      
      // Draw a line before summary
      doc.setLineWidth(0.2);
      doc.line(margin, summaryY, pageWidth - margin, summaryY);
      summaryY += 3;
      
      // Add summary text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', margin, summaryY, { align: 'left' });
      summaryY += 4;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Students: ${totalStudents}`, margin + 5, summaryY, { align: 'left' });
      doc.text(`Active: ${activeStudents}`, margin + 50, summaryY, { align: 'left' });
      doc.text(`Inactive: ${inactiveStudents}`, margin + 80, summaryY, { align: 'left' });
      doc.text(`Withdrawn: ${withdrawnStudents}`, margin + 110, summaryY, { align: 'left' });
      if (suspendedStudents > 0) {
        doc.text(`Suspended: ${suspendedStudents}`, margin + 150, summaryY, { align: 'left' });
      }
      
      // Add headers and footers on all pages with correct total (only once)
      for (let i = 1; i <= actualTotalPages; i++) {
        doc.setPage(i);
        addHeader(i, actualTotalPages);
        addFooter(i, actualTotalPages);
      }
      
      const fileName = `Withdrawal_Register_${formatDate(new Date()).replace(/-/g, '_')}.pdf`;
      doc.save(fileName);
      showToast('Register exported successfully', 'success');
    } catch (error) {
      showToast('Failed to generate PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Show loading
  if (loading || !hasFetchedStudents) {
    return <Loader />;
  }

  if (showNoStudents && students.length === 0 && hasFetchedStudents) {
    return <NoStudentsFound />;
  }

  const from = (page - 1) * perPage + 1;
  const to = (page - 1) * perPage + paginated.length;
  const total = filteredStudents.length;

  return (
    <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
      <Header>
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
            Admission & Withdrawal Register <span style={{fontWeight:400, fontSize:'1rem', color: theme === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({filteredStudents.length})</span>
          </Title>
          
          {/* Mobile filter toggle */}
          {window.innerWidth <= 700 && (
            <button
              aria-label="Show/hide filters"
              style={{
                background: theme === 'dark' ? '#23242a' : '#f3f4f6',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                marginLeft: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0002',
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={() => setShowMobileFilters(v => !v)}
            >
              <FilterListIcon style={{ fontSize: 24, color: theme === 'dark' ? '#C0C0C0' : '#444' }} />
            </button>
          )}
          
          {/* Desktop filters */}
          <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
            <SegmentedGroup>
              <SegmentedInput
                theme={theme === 'dark' ? darkTheme : lightTheme}
                type="text"
                placeholder="Search Student..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{ minWidth: 220, maxWidth: 320, width: '100%' }}
              />
              <SegmentedSelect
                value={classFilter}
                onChange={handleClassFilterChange}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              >
                <option value="">All Classes</option>
                {loadingClasses ? <option>Loading...</option> :
                  classOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </SegmentedSelect>
              {(() => {
                const selectedClass = classOptions.find(c => String(c.id) === String(classFilter));
                const hasSections = selectedClass?.has_sections ?? true;
                return hasSections ? (
                  <SegmentedSelect
                    value={sectionFilter}
                    onChange={handleSectionFilterChange}
                    disabled={!classFilter}
                    style={{ borderRadius: 0 }}
                  >
                    <option value="">All Sections</option>
                    {loadingSections ? <option>Loading...</option> :
                      sectionOptions.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </SegmentedSelect>
                ) : null;
              })()}
              <SegmentedSelect
                value={sessionFilter}
                onChange={handleSessionFilterChange}
                style={{ borderRadius: 0 }}
              >
                {loadingSessionsFilter ? <option>Loading...</option> :
                  sessionOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </SegmentedSelect>
              <SegmentedSelect
                value={statusFilter}
                onChange={handleStatusFilterChange}
                style={{ borderRadius: 0 }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </SegmentedSelect>
              <SegmentedButton
                theme={theme === 'dark' ? darkTheme : lightTheme}
                onClick={handleExportPdf}
                disabled={exportLoading}
                title="Export to PDF"
                last
                style={{
                  minWidth: 110,
                  maxWidth: 130,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {exportLoading ? (
                  <div style={{ 
                    width: 15, 
                    height: 15, 
                    border: '2px solid #e0e7ff', 
                    borderTop: '2px solid #4a6cf7', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                ) : (
                  <PictureAsPdf style={{ fontSize: 15 }} />
                )}
                <span style={{ fontWeight: 700, display: 'inline-block' }}>
                  {exportLoading ? 'Exporting...' : 'Export'}
                </span>
              </SegmentedButton>
            </SegmentedGroup>
          </HeaderFilters>
        </div>
        
        {/* Mobile search bar */}
        {window.innerWidth <= 700 && (
          <div style={{ width: '100%' }}>
            <SegmentedInput
              theme={theme === 'dark' ? darkTheme : lightTheme}
              type="text"
              placeholder="Search Student..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        )}
        
        {/* Mobile filters */}
        {window.innerWidth <= 700 && showMobileFilters && (
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
              value={classFilter}
              onChange={handleClassFilterChange}
              style={{ width: '100%' }}
            >
              <option value="">All Classes</option>
              {loadingClasses ? <option>Loading...</option> :
                classOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </SegmentedSelect>
            {(() => {
              const selectedClass = classOptions.find(c => String(c.id) === String(classFilter));
              const hasSections = selectedClass?.has_sections ?? true;
              return hasSections ? (
                <SegmentedSelect
                  value={sectionFilter}
                  onChange={handleSectionFilterChange}
                  disabled={!classFilter}
                  style={{ width: '100%' }}
                >
                  <option value="">All Sections</option>
                  {loadingSections ? <option>Loading...</option> :
                    sectionOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </SegmentedSelect>
              ) : null;
            })()}
            <SegmentedSelect
              value={sessionFilter}
              onChange={handleSessionFilterChange}
              style={{ width: '100%' }}
            >
              {loadingSessionsFilter ? <option>Loading...</option> :
                sessionOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </SegmentedSelect>
            <SegmentedSelect
              value={statusFilter}
              onChange={handleStatusFilterChange}
              style={{ width: '100%' }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SegmentedSelect>
            <SegmentedButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              onClick={handleExportPdf}
              disabled={exportLoading}
              title="Export to PDF"
              style={{ width: '100%', gridColumn: '1 / -1' }}
            >
              {exportLoading ? (
                <div style={{ 
                  width: 15, 
                  height: 15, 
                  border: '2px solid #e0e7ff', 
                  borderTop: '2px solid #4a6cf7', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
              ) : (
                <PictureAsPdf style={{ fontSize: 15 }} />
              )}
              <span style={{ fontWeight: 700 }}>
                {exportLoading ? 'Exporting...' : 'Export PDF'}
              </span>
            </SegmentedButton>
          </div>
        )}
      </Header>
      
      <MainContent theme={theme === 'dark' ? darkTheme : lightTheme}>
        {filteredStudents.length === 0 ? (
          <NoResults>No students found matching your search criteria.</NoResults>
        ) : (
          <TableWrapper theme={theme === 'dark' ? darkTheme : lightTheme}>
            <Table>
              <thead>
                <tr>
                  <Th rowSpan={2}>S.No</Th>
                  <Th rowSpan={2}>ID</Th>
                  <Th rowSpan={2}>Name / Father Name</Th>
                  <ThGroup colSpan={2}>Admission</ThGroup>
                  <ThGroup colSpan={2}>Withdrawal</ThGroup>
                  <Th rowSpan={2}>DOB</Th>
                  <Th rowSpan={2}>Phone</Th>
                  <Th rowSpan={2}>Address</Th>
                  <Th rowSpan={2}>Status</Th>
                </tr>
                <tr>
                  <Th>Adm Date</Th>
                  <Th>Adm Class</Th>
                  <Th>Wid. Date</Th>
                  <Th>Wid. Class</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((student, index) => (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/students/profile/${student.id}`)}
                  >
                    <Td>{(page - 1) * perPage + index + 1}</Td>
                    <Td>{getStudentDisplayId(student)}</Td>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{student.name || '-'}</span>
                        <span style={{ fontSize: '0.85rem', color: theme === 'dark' ? '#b0b8d1' : '#666' }}>
                          {student.father_name || '-'}
                        </span>
                      </div>
                    </Td>
                    <Td>{formatDate(student.admission_date || student.created_at)}</Td>
                    <Td>
                      {student.admission_class?.name 
                        ? `${student.admission_class.name}${student.admission_section?.name ? ` (${student.admission_section.name})` : ''}`
                        : '-'
                      }
                    </Td>
                    <Td>{student.withdrawal_date ? formatDate(student.withdrawal_date) : '-'}</Td>
                    <Td>
                      {student.withdrawal_class?.name 
                        ? `${student.withdrawal_class.name}${student.withdrawal_section?.name ? ` (${student.withdrawal_section.name})` : ''}`
                        : '-'
                      }
                    </Td>
                    <Td>{student.dob ? formatDate(student.dob) : '-'}</Td>
                    <Td>{student.phone || student.father_mobile || '-'}</Td>
                    <Td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {student.address || '-'}
                    </Td>
                    <Td>
                      <StatusBadge status={student.status || 'active'}>
                        {(student.status || 'active').charAt(0).toUpperCase() + (student.status || 'active').slice(1)}
                      </StatusBadge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </MainContent>
      
      {filteredStudents.length > 0 && (
        <PaginationContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
          <PaginationInfo>
            {window.innerWidth <= 700 
              ? `${from} to ${to} of ${total}`
              : `Showing ${from} to ${to} of ${total} students`
            }
          </PaginationInfo>
          <PaginationControls>
            <SegmentedGroup>
              <SegmentedButton
                theme={theme === 'dark' ? darkTheme : lightTheme}
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                first
                style={{ minWidth: 32 }}
              >
                ‹
              </SegmentedButton>
              {page > 1 && (
                <SegmentedButton
                  theme={theme === 'dark' ? darkTheme : lightTheme}
                  onClick={() => handlePageChange(page - 1)}
                  style={{ minWidth: 32 }}
                >
                  {page - 1}
                </SegmentedButton>
              )}
              <SegmentedButton
                theme={theme === 'dark' ? darkTheme : lightTheme}
                active
                disabled
                style={{ minWidth: 32 }}
              >
                {page}
              </SegmentedButton>
              {page < totalPages && (
                <SegmentedButton
                  theme={theme === 'dark' ? darkTheme : lightTheme}
                  onClick={() => handlePageChange(page + 1)}
                  style={{ minWidth: 32 }}
                >
                  {page + 1}
                </SegmentedButton>
              )}
              <SegmentedButton
                theme={theme === 'dark' ? darkTheme : lightTheme}
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                last
                style={{ minWidth: 32 }}
              >
                ›
              </SegmentedButton>
            </SegmentedGroup>
          </PaginationControls>
        </PaginationContainer>
      )}
    </PageContainer>
  );
};

export default memo(WithdrawalRegister);

