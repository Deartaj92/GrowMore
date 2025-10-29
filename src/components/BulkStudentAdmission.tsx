import React, { useState, useEffect, useContext, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider, keyframes, createGlobalStyle, css } from 'styled-components';
import { Add as AddIcon, Refresh as RefreshIcon, Close as CloseIcon, Save as SaveIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoSessionsFound from './NoSessionsFound';
import NoClassesFound from './NoClassesFound';
import NoSectionsFound from './NoSectionsFound';

// --- Styled Components (matching MarkAttendance.tsx) ---
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 93vh;
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

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

const Footer = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.5rem;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 -1px 6px #0001;
  min-height: 36px;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 0.5rem 0.2rem;
    min-height: 44px;
  }
`;


const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 140px;
  flex: 1 1 180px;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    flex: none;
    &.search-group {
      margin-top: 0.7rem;
      order: 2;
    }
    &:not(.search-group) {
      order: 1;
    }
  }
`;

const Label = styled.label`
  font-size: 0.97rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }: { theme: any }) => theme.FIELD_BORDER};
  background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  &:focus {
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }: { theme: any }) => theme.ACCENT}33;
  }
  @media (max-width: 700px) {
    width: 100%;
  }
`;

const Select = styled.select`
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }: { theme: any }) => theme.FIELD_BORDER};
  background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  cursor: pointer;
  &:focus {
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }: { theme: any }) => theme.ACCENT}33;
  }
`;

const StudentsListContainer = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
`;

const StudentRow = styled.div<{ $focused?: boolean }>`
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: ${({ theme, $focused }) => $focused ? theme.ACCENT + '15' : theme.CARD};
  border: 1px solid ${({ theme, $focused }) => $focused ? theme.ACCENT : theme.FIELD_BORDER};
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.ACCENT};
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const SerialNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT + '20'};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  font-size: 0.9rem;
  border: 2px solid ${({ theme }) => theme.ACCENT + '40'};
  flex-shrink: 0;
`;

const RemoveButton = styled.button`
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.5);
    border-color: rgba(239, 68, 68, 0.6);
    transform: scale(1.05);
  }
`;

const InsertButton = styled.button`
  background: rgba(34, 197, 94, 0.3);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(34, 197, 94, 0.5);
    border-color: rgba(34, 197, 94, 0.6);
    transform: scale(1.05);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  
  @media (max-width: 700px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const AddStudentButton = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  margin-top: 16px;

  &:hover {
    background: ${({ theme }) => theme.ACCENT}ee;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ theme }) => `${theme.ACCENT}33`};
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30,32,38,0.85);
  z-index: 12000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.3rem;
  letter-spacing: 1px;
  backdrop-filter: blur(6px);
`;

const LoadingSpinner = styled.div`
  border: 6px solid #e0e7ff;
  border-top: 6px solid #4a6cf7;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  animation: spin 1.1s linear infinite;
  margin-bottom: 28px;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 32px;
  right: 32px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const ToastMsg = styled.div<{type: 'error' | 'success' | 'warning', themeMode: 'dark' | 'light'}>`
  min-width: 220px;
  background: ${({type, themeMode}) => 
    type === 'error' ? (themeMode === 'dark' ? '#ff3b3b' : '#ff5252') :
    type === 'warning' ? (themeMode === 'dark' ? '#ff9800' : '#ff9800') :
    (themeMode === 'dark' ? '#4caf50' : '#43a047')
  };
  color: #fff;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 1.08rem;
  font-weight: 600;
  margin-bottom: 10px;
  box-shadow: 0 4px 24px 0 #0007;
  opacity: 0.97;
  animation: ${keyframes`
    0% { transform: translateY(-30px) scale(0.95); opacity: 0; }
    60% { transform: translateY(4px) scale(1.03); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 0.97; }
  `} 0.5s;
`;

const GlobalStyle = createGlobalStyle<{
  fieldBg: string;
  textColor: string;
}>`
  input:-webkit-autofill,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:active,
  textarea:-webkit-autofill,
  textarea:-webkit-autofill:focus,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px ${props => props.fieldBg} inset !important;
    box-shadow: 0 0 0 1000px ${props => props.fieldBg} inset !important;
    -webkit-text-fill-color: ${props => props.textColor} !important;
    color: ${props => props.textColor} !important;
    caret-color: ${props => props.textColor} !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

// --- Segmented Group Styles (matching MarkAttendance.tsx) ---
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
    border-radius: 11px;
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
    min-width: 0;
    border-radius: 0;
    ${({ first }) => first && `
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    `}
    ${({ last }) => last && `
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    `}
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
    border-radius: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    ${({ first }) => first && `
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    `}
    ${({ last }) => last && `
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    `}
  }
`;

interface StudentData {
  id: string;
  name: string;
  fatherName: string;
  gender: string;
}

const BulkStudentAdmission: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, completeProgress, setProgress } = useProgress();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    class: '',
    section: ''
  });
  const [students, setStudents] = useState<StudentData[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string, has_sections?: boolean}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Array<{msg: string, type: 'error' | 'success' | 'warning', id: number}>>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [hasClasses, setHasClasses] = useState(true);
  const [hasSections, setHasSections] = useState(true);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const lastRowRef = useRef<HTMLDivElement>(null);
  
  const toastId = useRef(0);

  const showToast = (msg: string, type: 'error' | 'success' | 'warning' = 'success') => {
    const id = toastId.current++;
    setToasts(prev => [...prev, {msg, type, id}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  };

  // Initialize with 10 default student rows
  useEffect(() => {
    if (students.length === 0) {
      const defaultStudents: StudentData[] = Array.from({ length: 10 }, (_, index) => ({
        id: `default-${index + 1}`,
        name: '',
        fatherName: '',
        gender: 'Male'
      }));
      setStudents(defaultStudents);
    }
  }, []);

  // Check for active session and classes on mount
  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!user?.school_id) {
        console.error('No school_id found for user');
        showToast('User school information not found', 'error');
        return;
      }

      setLoading(true);
      startProgress(false);
      setProgress(10);

      try {
        // Check for active session for this school
        setProgress(20);
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();

        if (sessionError || !session) {
          setActiveSession(null);
        } else {
          setActiveSession(session);
        }

        // Check for classes for this school
        setProgress(40);
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', user.school_id)
          .limit(1);

        setHasClasses(!classesError && classes && classes.length > 0);

        // Check for sections for this school
        setProgress(60);
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id')
          .eq('school_id', user.school_id)
          .limit(1);

        setHasSections(!sectionsError && sections && sections.length > 0);

        setProgress(100);
      } catch (error) {
        console.error('Error checking prerequisites:', error);
      } finally {
        setLoading(false);
        completeProgress();
      }
    };

    checkPrerequisites();
  }, [user?.school_id, setLoading, startProgress, setProgress, completeProgress]);

  // Fetch classes on mount
  useEffect(() => {
    if (!user?.school_id) return;

    setLoadingClasses(true);
    supabase
      .from('classes')
      .select('id, name, has_sections')
      .eq('school_id', user.school_id)
      .then(({ data, error }) => {
        setLoadingClasses(false);
        if (error) {
          console.error('Error fetching classes:', error);
          return;
        }
        const sortedClasses = sortClasses(data || []);
        setClasses(sortedClasses);
      });
  }, [user?.school_id]);

  // Fetch sections when class changes
  useEffect(() => {
    if (!formData.class || !user?.school_id) { 
      setSections([]);
      setSelectedClassHasSections(true);
      return; 
    }
    
    // Check if selected class has sections
    const selectedClass = classes.find(c => String(c.id) === String(formData.class));
    console.log('Selected class:', selectedClass, 'Has sections:', selectedClass?.has_sections);
    const hasSections = selectedClass?.has_sections ?? true;
    setSelectedClassHasSections(hasSections);
    
    // Only fetch sections if class has sections
    if (!hasSections) {
      console.log('Class has no sections, clearing section field');
      setSections([]);
      setFormData(prev => ({ ...prev, section: '' }));
      return;
    }
    
    console.log('Class has sections, fetching sections...');
    setLoadingSections(true);
    supabase
      .from('sections')
      .select('id, name, class_id')
      .eq('class_id', Number(formData.class))
      .eq('school_id', user.school_id)
      .then(({ data, error }) => {
        setLoadingSections(false);
        if (error) {
          console.error('Section fetch error:', error);
        }
        setSections(data || []);
      });
  }, [formData.class, user?.school_id, classes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addStudent = () => {
    const newStudent: StudentData = {
      id: Date.now().toString(),
      name: '',
      fatherName: '',
      gender: 'Male'
    };
    setStudents([...students, newStudent]);
  };

  const insertStudent = (afterIndex: number) => {
    const newStudent: StudentData = {
      id: Date.now().toString(),
      name: '',
      fatherName: '',
      gender: 'Male'
    };
    
    const newStudents = [...students];
    newStudents.splice(afterIndex + 1, 0, newStudent);
    setStudents(newStudents);
    setFocusedStudentId(newStudent.id);
    
    // Focus the name field of the newly inserted student after a short delay
    setTimeout(() => {
      const nameInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="name"]`) as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 50);
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(student => student.id !== id));
  };

  const updateStudent = (id: string, field: keyof StudentData, value: string) => {
    setStudents(students.map(student => 
      student.id === id ? { ...student, [field]: value } : student
    ));
  };

  const handleSubmit = async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    if (!formData.class) {
      showToast('Please select a class!', 'error');
      return;
    }
    
    if (selectedClassHasSections && !formData.section) {
      showToast('Please select a section!', 'error');
      return;
    }

    if (students.length === 0) {
      showToast('Please add at least one student!', 'error');
      return;
    }

    // Filter out students without required fields (Name and Father only)
    const validStudents = students.filter(student => 
      student.name.trim() && student.fatherName.trim()
    );

    if (validStudents.length === 0) {
      showToast('Please add at least one student with Name and Father fields', 'error');
      return;
    }

    // Show warning if some students are incomplete but still allow submission
    if (validStudents.length !== students.length) {
      const incompleteCount = students.length - validStudents.length;
      showToast(`Warning: ${incompleteCount} students are missing Name or Father fields. Only complete students will be saved.`, 'warning');
    }

    setSubmitting(true);
    startProgress(false);
    setProgress(10);

    try {
      // Check for active session
      setProgress(20);
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      
      if (sessionError || !session) {
        showToast('Cannot add students: No active session found!', 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }

      // Get the current max student ID for this school and generate sequential IDs
      setProgress(40);
      const { data: maxIdData, error: maxIdError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id)
        .order('id', { ascending: false })
        .limit(1);
      
      if (maxIdError) {
        throw maxIdError;
      }
      
      const currentMaxId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id : 0;
      const studentIds: number[] = [];
      
      for (let i = 0; i < validStudents.length; i++) {
        studentIds.push(currentMaxId + i + 1);
      }

      // Prepare student data with defaults (only valid students)
      // Maintain the order as they appear in the students array
      const studentData = validStudents.map((student, index) => ({
        id: studentIds[index],
        name: student.name,
        class_id: Number(formData.class),
        section_id: selectedClassHasSections ? Number(formData.section) : null,
        admission_date: new Date().toISOString().split('T')[0],
        father_name: student.fatherName,
        mother_name: null,
        gender: student.gender,
        dob: '2000-01-01',
        blood_group: null,
        address: null,
        phone: null,
        father_mobile: null,
        mother_mobile: null,
        father_occupation: null,
        mother_occupation: null,
        father_income: null,
        mother_income: null,
        session_id: session.id,
        school_id: user.school_id,
        status: 'active'
      }));

      // Insert students
      setProgress(70);
      const { data: insertedStudents, error: insertError } = await supabase
        .from('students')
        .insert(studentData)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Insert into student_class_history
      setProgress(90);
      const historyData = insertedStudents.map(student => ({
        student_id: student.id,
        class_id: Number(formData.class),
        section_id: selectedClassHasSections ? Number(formData.section) : null,
        session_id: session.id,
        school_id: user.school_id,
        admission_date: new Date().toISOString().split('T')[0],
        status: 'active'
      }));

      const { error: historyError } = await supabase
        .from('student_class_history')
        .insert(historyData);

      if (historyError) {
        console.error('History insert error:', historyError);
        showToast('Students added but history update failed: ' + historyError.message, 'error');
      }

      setProgress(100);
      showToast(`${validStudents.length} students added successfully!`, 'success');
      
      // Reset form and add default rows
      setStudents([]);
      setFormData({ class: '', section: '' });
      
      // Add 10 default empty rows for new entries
      const defaultStudents: StudentData[] = Array.from({ length: 10 }, (_, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: '',
        fatherName: '',
        gender: 'Male'
      }));
      setStudents(defaultStudents);
      
    } catch (err: any) {
      console.error('Submission error:', err);
      showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSubmitting(false);
      completeProgress();
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleReset = () => {
    setStudents([]);
    setFormData({ class: '', section: '' });
    // Re-initialize with 10 default rows
    const defaultStudents: StudentData[] = Array.from({ length: 10 }, (_, index) => ({
      id: `default-${index + 1}`,
      name: '',
      fatherName: '',
      gender: 'Male'
    }));
    setStudents(defaultStudents);
  };

  // Handle tab key to add new row when tabbing from gender field in last row
  const handleTabKey = (e: React.KeyboardEvent, studentId: string, isLastRow: boolean, fieldType: string) => {
    if (e.key === 'Tab' && isLastRow && fieldType === 'gender') {
      e.preventDefault();
      
      // Add new student
      const newStudent: StudentData = {
        id: `temp-${Date.now()}-${Math.random()}`,
        name: '',
        fatherName: '',
        gender: 'Male'
      };
      
      setStudents(prev => [...prev, newStudent]);
      setFocusedStudentId(newStudent.id);
      
      // Focus the name field of the newly added student after a short delay
      setTimeout(() => {
        const nameInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="name"]`) as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
        }
      }, 50);
    }
  };

  // Handle focus changes to update focused student
  const handleFieldFocus = (studentId: string) => {
    setFocusedStudentId(studentId);
  };

  // Keyboard shortcuts for gender selection and Enter to save students
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Handle Enter key to save students
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Handle M/F keys for gender selection
      if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'f') {
        // Only handle if not typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
          return;
        }

        e.preventDefault();
        if (focusedStudentId) {
          updateStudent(focusedStudentId, 'gender', e.key.toLowerCase() === 'm' ? 'Male' : 'Female');
        } else {
          // If no focused student, find the first student and set gender
          const firstStudent = students[0];
          if (firstStudent) {
            setFocusedStudentId(firstStudent.id);
            updateStudent(firstStudent.id, 'gender', e.key.toLowerCase() === 'm' ? 'Male' : 'Female');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [students, focusedStudentId]);

  if (loading) {
    return (
      <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
        <LoadingOverlay>
          <LoadingSpinner />
          <div>Loading...</div>
        </LoadingOverlay>
      </ThemeProvider>
    );
  }

  if (!activeSession) {
    return <NoSessionsFound />;
  }

  if (!hasClasses) {
    return <NoClassesFound />;
  }

  if (!hasSections) {
    return <NoSectionsFound />;
  }

  return (
    <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <GlobalStyle
        fieldBg={(theme === 'dark' ? darkTheme.FIELD_BG : lightTheme.FIELD_BG) || '#23272f'}
        textColor={(theme === 'dark' ? darkTheme.TEXT_PRIMARY : lightTheme.TEXT_PRIMARY) || '#fff'}
      />
      {toasts.length > 0 && (
        ReactDOM.createPortal(
          <ToastContainer>
            {toasts.map(t => (
              <ToastMsg key={t.id} type={t.type} themeMode={theme}>
                {t.msg}
              </ToastMsg>
            ))}
          </ToastContainer>,
          document.body
        )
      )}
      {submitting && ReactDOM.createPortal(
        <LoadingOverlay>
          <LoadingSpinner />
          <div style={{marginTop: 12, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '1.5px'}}>Adding Students…</div>
          <div style={{marginTop: 8, fontSize: '1.05rem', color: '#b0b8d1'}}>Please wait while we save the records.</div>
        </LoadingOverlay>,
        document.body
      )}
      <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <Header theme={theme === 'dark' ? darkTheme : lightTheme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: 1, color: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT, margin: 0 }}>
              Bulk Student Admission
            </h2>
          </div>
          <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={formData.class}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFormData({ ...formData, class: e.target.value });
              }}
              first
            >
              <option value="">Select Class</option>
              {loadingClasses ? (
                <option disabled>Loading...</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </SegmentedSelect>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={formData.section}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFormData({ ...formData, section: e.target.value });
              }}
              disabled={!formData.class || !selectedClassHasSections}
              last
            >
              <option value="">
                {!formData.class ? 'Select Section' : !selectedClassHasSections ? 'No Sections' : 'Select Section'}
              </option>
              {loadingSections ? (
                <option disabled>Loading...</option>
              ) : (
                sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              )}
            </SegmentedSelect>
          </SegmentedGroup>
        </Header>
        <MainContent>
          <StudentsListContainer>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '12px',
              position: 'sticky',
              top: '0',
              background: theme === 'dark' ? darkTheme.CARD : lightTheme.CARD,
              padding: '12px 0',
              zIndex: 10,
              borderBottom: `1px solid ${theme === 'dark' ? darkTheme.FIELD_BORDER : lightTheme.FIELD_BORDER}`
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: theme === 'dark' ? darkTheme.TEXT_PRIMARY : lightTheme.TEXT_PRIMARY }}>
                  Students ({students.length})
                </h4>
              </div>
            </div>
            
            {students.map((student, index) => {
              const isLastRow = index === students.length - 1;
              return (
                <StudentRow 
                  key={student.id} 
                  $focused={focusedStudentId === student.id}
                  onClick={() => setFocusedStudentId(student.id)}
                  ref={isLastRow ? lastRowRef : null}
                >
                  <SerialNumber>
                    {index + 1}
                  </SerialNumber>
                  <Input
                    placeholder="Student Name*"
                    value={student.name}
                    onChange={(e) => updateStudent(student.id, 'name', e.target.value)}
                    onFocus={() => handleFieldFocus(student.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedStudentId(student.id);
                    }}
                    data-student-id={student.id}
                    data-field="name"
                  />
                  <Input
                    placeholder="Father Name*"
                    value={student.fatherName}
                    onChange={(e) => updateStudent(student.id, 'fatherName', e.target.value)}
                    onFocus={() => handleFieldFocus(student.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedStudentId(student.id);
                    }}
                    data-student-id={student.id}
                    data-field="fatherName"
                  />
                  <Select
                    value={student.gender}
                    onChange={(e) => updateStudent(student.id, 'gender', e.target.value)}
                    onFocus={() => handleFieldFocus(student.id)}
                    onKeyDown={(e) => handleTabKey(e, student.id, isLastRow, 'gender')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedStudentId(student.id);
                    }}
                    data-student-id={student.id}
                    data-field="gender"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                  <ButtonContainer>
                    <InsertButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        insertStudent(index);
                      }}
                      data-student-id={student.id}
                      data-field="insert"
                      tabIndex={-1}
                      title="Insert new row after this one"
                    >
                      <AddIcon fontSize="small" />
                    Row
                    </InsertButton>
                    <RemoveButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStudent(student.id);
                      }}
                      data-student-id={student.id}
                      data-field="remove"
                      tabIndex={-1}
                    >
                      <DeleteIcon fontSize="small" />
                      Remove
                    </RemoveButton>
                  </ButtonContainer>
                </StudentRow>
              );
            })}
          </StudentsListContainer>
        </MainContent>
        <Footer>
          <div style={{ fontSize: '0.98rem', color: (theme === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY), fontWeight: 600 }}>
            Total Students: {students.length}
          </div>
          <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
            <SegmentedButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              first
              onClick={handleReset}
            >
              <RefreshIcon style={{ fontSize: 17, marginRight: 4 }} />
              Reset
            </SegmentedButton>
            <SegmentedButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              onClick={handleCancel}
            >
              <CloseIcon style={{ fontSize: 17, marginRight: 4 }} />
              Cancel
            </SegmentedButton>
            <SegmentedButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              last
              onClick={handleSubmit}
              disabled={submitting}
              style={{ 
                color: '#fff', 
                background: '#16a34a', 
                borderColor: '#16a34a', 
                fontWeight: 700,
                opacity: submitting ? 0.6 : 1,
                whiteSpace: 'nowrap',
                minWidth: 'fit-content'
              }}
            >
              {submitting ? (
                <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <SaveIcon style={{ fontSize: 17, marginRight: 4 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Add {students.length} Students</span>
                </>
              )}
            </SegmentedButton>
          </SegmentedGroup>
        </Footer>
      </PageContainer>
    </ThemeProvider>
  );
};

export default BulkStudentAdmission;