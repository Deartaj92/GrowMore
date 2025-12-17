import React, { useState, useEffect, useContext, useMemo, useCallback, memo, useRef } from 'react';
import styled, { keyframes, DefaultTheme, css } from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';

// Responsive grid component for single line layout
const SingleLineGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 0.75rem;
  align-items: end;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
`;

// Responsive grid component
const ResponsiveGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 0.75rem;
  align-items: end;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
`;

// Spinner animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Spinner component
const Spinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff40;
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

// Desktop layout for test configuration
const DesktopLayout = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// Mobile layout for test configuration
const MobileLayout = styled.div`
  display: none;
  flex-direction: column;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    display: flex;
  }
`;

// Student avatar component with mobile hiding
const StudentAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #4a6cf720;
  color: #4a6cf7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// Student percentage component with mobile hiding
const StudentPercentage = styled.div<{ color: string }>`
  min-width: 60px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    display: none;
  }
`;

import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { useTheme } from '@mui/material';
import { ThemeProvider } from 'styled-components';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import { testRecordService } from '../services/testRecordService';
import { TestRecord, TestResult, CreateTestRecordDTO, CreateTestResultDTO } from '../types/testRecords';
import { useNavigate } from 'react-router-dom';
import { useLoading } from '../contexts/LoadingContext';
import {
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  Group as GroupIcon,
  Class as ClassIcon,
  Subject as SubjectIcon,
} from '@mui/icons-material';
import { Textfit } from '@techstack/react-textfit';
import GlowingCards, { GlowingCard } from './ui/glowing-cards';
import { supabase } from '../supabaseClient';
import Loader from './Loader';


// Styled components matching MarksEntryManager.tsx exactly
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f5f7fa'};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* Hardware acceleration for container */
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
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f5f7fa'};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;

  /* Mobile layout - stack in two rows */
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px;
    min-height: auto;
  }
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  flex-wrap: nowrap;

  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
`;

const HeaderBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;

  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const DesktopSegmentedGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;

  @media (max-width: 700px) {
    display: none;
  }
`;

const MobileHeaderLayout = styled.div`
  display: none;

  @media (max-width: 700px) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
`;

const MobileRow = styled.div`
  display: flex;
  width: 100%;
`;


const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#4a6cf7' : '#4a6cf7'};
  margin: 0;
`;

// --- Segmented Group Styles (copied from MarkAttendance.tsx) ---
const SEGMENTED_HEIGHT = '32px';
const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#222' : '#f3f4f6'};
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
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#C0C0C0' : '#444'};
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? '#555' : '#e5e7eb'};
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
    border-left: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? '#555' : '#e5e7eb'};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => theme.palette?.mode === 'dark'
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

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 60px 0;
  /* Super smooth scrolling optimizations */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  
  /* Hardware acceleration */
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  
  /* Momentum scrolling for mobile */
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
    background: ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

// Footer button styled components
const FooterButtonGroup = styled.div`
  display: flex;
  gap: 6px;
  
  @media (min-width: 701px) {
    gap: 8px;
  }
`;

const FooterButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 60px;

  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: #4a6cf7;
        color: white;
        &:hover {
          background: #4a6cf7cc;
        }
      `;
    } else {
      return `
        background: ${theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'};
        color: ${theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
        border: 1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        &:hover {
          background: ${theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'}cc;
          border-color: #4a6cf7;
        }
      `;
    }
  }}
`;

// Types for the new structure
interface Class {
  id: number;
  name: string;
  school_id: number;
  has_sections?: boolean;
}

interface Section {
  id: number;
  name: string;
  class_id: number;
  school_id: number;
}

interface Student {
  id: number;
  name: string;
  father_name?: string;
  roll_number?: string;
  picture_url?: string;
  class_id: number;
  section_id: number;
  school_id: number;
}

interface Subject {
  id: number;
  class_id: number;
  subject_id: number;
  max_marks?: number;
  total_marks?: number;
  school_id: number;
  subject: {
    name: string;
    code?: string;
  };
}

const TestRecordManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const { setLoading, loading } = useLoading();
  const navigate = useNavigate();
  const { logTestMarksActivity } = useActivityTracking();
  const { setFooterContent } = usePageFooter();
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  
  // State for form fields
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Selected values
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  // Test record data
  const [testName, setTestName] = useState('');
  const [testType] = useState<'Quiz' | 'Test' | 'Assignment' | 'Practice'>('Test');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxMarks, setMaxMarks] = useState<number | ''>('');
  const [passingMarks, setPassingMarks] = useState<number | ''>('');
  
  // Test creation state
  const [testCreated, setTestCreated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  
  // Session state
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  
  // Loading states
  const [loadingExistingMarks, setLoadingExistingMarks] = useState(false);
  const [checkingExistingMarks, setCheckingExistingMarks] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Marks data
  const [marksData, setMarksData] = useState<{ [studentId: number]: number | string }>({});
  const [hasExistingRecords, setHasExistingRecords] = useState(false);
  
  const [showToTop, setShowToTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inputErrors, setInputErrors] = useState<{ [studentId: number]: boolean }>({});
  const [focusedStudentId, setFocusedStudentId] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, studentId: number) => {
    // Allow "A" key for absent students (even with numeric input mode)
    if (e.key === 'A' || e.key === 'a') {
      e.preventDefault();
      handleMarksInput(studentId, 'A', maxMarks);
      return;
    }

    // Prevent arrow keys from changing the value
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      return;
    }

    // Handle Enter key to move to next student
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < students.length) {
        const nextInput = document.querySelector(`input[data-student-index="${nextIndex}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          setTimeout(() => {
            nextInput.select();
          }, 0);
          scrollToKeepVisible(nextInput);
        }
      } else {
        setShowSaveModal(true);
      }
    }

    // Handle Tab key for navigation
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < students.length) {
        const targetInput = document.querySelector(`input[data-student-index="${nextIndex}"]`) as HTMLInputElement;
        if (targetInput) {
          targetInput.focus();
          setTimeout(() => {
            targetInput.select();
          }, 0);
          scrollToKeepVisible(targetInput);
        }
      }
    }
  };

  const scrollToKeepVisible = (inputElement: HTMLInputElement) => {
    if (!mainContentRef.current) return;
    
    const container = mainContentRef.current;
    const containerRect = container.getBoundingClientRect();
    const inputRect = inputElement.getBoundingClientRect();
    
    const distanceFromBottom = containerRect.bottom - inputRect.bottom;
    
    if (distanceFromBottom < 100) {
      const scrollAmount = Math.min(150, container.scrollHeight - container.scrollTop - container.clientHeight);
      container.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
    
    const distanceFromTop = inputRect.top - containerRect.top;
    
    if (distanceFromTop < 50) {
      container.scrollBy({
        top: -100,
        behavior: 'smooth'
      });
    }
  };

  const handleFocus = (studentId: number, inputElement: HTMLInputElement) => {
    setActiveStudentId(studentId);
    setFocusedStudentId(studentId);
    scrollToKeepVisible(inputElement);
    setTimeout(() => {
      inputElement.select();
    }, 0);
  };

  const handleBlur = () => {
    setActiveStudentId(null);
    setFocusedStudentId(null);
  };

  // Selection handlers
  const handleSelectStudent = (studentId: number, checked: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
        setMarksData(prev => {
          const newMarks = { ...prev };
          delete newMarks[studentId];
          return newMarks;
        });
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedStudents(new Set(students.map(s => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedStudents(new Set());
    setMarksData({});
  };

  const handleToggleAll = () => {
    if (selectedStudents.size === students.length) {
      handleDeselectAll();
    } else {
      handleSelectAll();
    }
  };

  // Modal handlers
  const handleSaveFromModal = async () => {
    setShowSaveModal(false);
    setSelectedStudents(new Set(students.map(s => s.id)));
    await handleSaveTest();
  };

  const handleCancelModal = () => {
    setShowSaveModal(false);
  };

  // Handle "A" button click for absent students
  const handleAbsentButton = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find the currently focused input
    const focusedInput = document.querySelector('input[data-student-index]:focus') as HTMLInputElement;
    
    if (focusedInput) {
      // Get the student index from the data attribute
      const studentIndex = parseInt(focusedInput.getAttribute('data-student-index') || '0');
      const studentId = students[studentIndex]?.id;
      
      if (studentId) {
        // Update React state directly
        setMarksData(prev => ({
          ...prev,
          [studentId]: 'A'
        }));
        
        // Select student when "A" is entered
        setSelectedStudents(prev => new Set(prev).add(studentId));
        
        // Clear any error state
        setInputErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[studentId];
          return newErrors;
        });
        
        // Update the input value directly to show "A" immediately
        focusedInput.value = 'A';
        
        // Keep focus on the input
        setTimeout(() => {
          focusedInput.focus();
          focusedInput.select();
        }, 0);
      }
    }
  }, [students]);

  // Handle marks input with validation and error feedback
  const handleMarksInput = (studentId: number, inputValue: string, maxMarks: number | '') => {
    const existingMarks = marksData[studentId];
    
    if (inputValue === 'A' || inputValue === '') {
      setMarksData(prev => ({
        ...prev,
        [studentId]: inputValue
      }));
      
      if (inputValue === 'A') {
        setSelectedStudents(prev => new Set(prev).add(studentId));
      } else {
        setSelectedStudents(prev => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
      }
      
      setInputErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[studentId];
        return newErrors;
      });
      return;
    }

    if (!isNaN(Number(inputValue)) && inputValue !== '') {
      const value = Number(inputValue);
      
      if (typeof maxMarks === 'number' && value > maxMarks) {
        setInputErrors(prev => ({ ...prev, [studentId]: true }));
        showToast(`Marks cannot exceed ${maxMarks}.`, 'error');
        
        setMarksData(prev => ({
          ...prev,
          [studentId]: existingMarks !== undefined ? existingMarks : ''
        }));
        
        setTimeout(() => {
          setInputErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[studentId];
            return newErrors;
          });
        }, 1000);
        
        return;
      }
      
      setMarksData(prev => ({
        ...prev,
        [studentId]: value
      }));
      
      setSelectedStudents(prev => new Set(prev).add(studentId));
      
      setInputErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[studentId];
        return newErrors;
      });
    }
  };

  // Save test record and results
  const handleSaveTest = useCallback(async () => {
    if (!testCreated) {
      showToast('Please create the test first', 'error');
      return;
    }

    if (selectedStudents.size === 0) {
      showToast('Please select students to save marks for', 'error');
      return;
    }

    if (saving) {
      showToast('Already saving test, please wait...', 'error');
      return;
    }

    try {
      setSaving(true);

      // Create test record
      const hasSections = selectedClass!.has_sections ?? true;
      const testData: CreateTestRecordDTO = {
        name: testName,
        test_type: testType,
        subject_id: selectedSubject!.subject_id,
        class_id: selectedClass!.id,
        section_id: hasSections ? selectedSection?.id : undefined,
        session_id: activeSessionId!,
        test_date: testDate,
        max_marks: typeof maxMarks === 'number' ? maxMarks : 100,
        passing_marks: typeof passingMarks === 'number' ? passingMarks : 40
      };

      // Check for existing test records based on subject, class/section, and date
      const existingTestRecord = await testRecordService.getTestRecords({
        class_id: selectedClass!.id,
        section_id: hasSections ? selectedSection?.id : undefined,
        subject_id: selectedSubject!.subject_id,
        session_id: activeSessionId!
      }, 1, 1, user?.school_id!);

      // Filter by test date to find exact matches
      const existingRecords = existingTestRecord.data?.filter(record => 
        record.test_date === testDate
      ) || [];

      let testRecord: TestRecord;
      
      if (existingRecords.length > 0) {
        // Found existing test record with same subject, class/section, and date
        const existingRecord = existingRecords[0];
        
        // Check if there are existing marks for this test
        const { data: existingResults, error: resultsError } = await supabase
          .from('test_results')
          .select('student_id, obtained_marks')
          .eq('test_id', existingRecord.id)
          .eq('school_id', user?.school_id!);

        if (resultsError) {
          showToast('Error checking existing marks', 'error');
          return;
        }

        if (existingResults && existingResults.length > 0) {
          // Show warning about existing marks
          const existingStudents = existingResults.map(r => r.student_id);
          const selectedStudentIds = Array.from(selectedStudents);
          const overlappingStudents = selectedStudentIds.filter(id => existingStudents.includes(id));
          
          if (overlappingStudents.length > 0) {
            showToast(`Warning: ${overlappingStudents.length} students already have marks for ${selectedSubject?.subject?.name} on ${testDate}. Marks will be updated.`, 'error');
          }
        }

        // Update existing test record
        testRecord = await testRecordService.updateTestRecord(existingRecord.id, {
          name: testName,
          test_type: testType,
          max_marks: typeof maxMarks === 'number' ? maxMarks : 100,
          passing_marks: typeof passingMarks === 'number' ? passingMarks : 40
        }, user?.school_id!);
        showToast(`Updated existing test record for ${selectedSubject?.subject?.name} on ${testDate}`, 'success');
      } else {
        // Create new test record
        testRecord = await testRecordService.createTestRecord(testData, user?.school_id!, user?.id!);
        showToast(`Created new test record for ${selectedSubject?.subject?.name} on ${testDate}`, 'success');
      }

      // Prepare results data
      const selectedMarksData = Object.entries(marksData)
        .filter(([studentId]) => selectedStudents.has(parseInt(studentId)))
        .filter(([studentId, marks]) => marks !== '' && marks !== null && marks !== undefined);

      if (selectedMarksData.length === 0) {
        showToast('No valid marks to save for selected students', 'error');
        return;
      }

      // Delete existing test results for this test record and selected students
      const studentIds = selectedMarksData.map(([studentId]) => parseInt(studentId));
      await testRecordService.deleteTestResultsByTestAndStudents(testRecord.id, studentIds, user?.school_id!);

      const resultsData: CreateTestResultDTO[] = selectedMarksData.map(([studentId, marks]) => ({
        test_id: testRecord.id,
        student_id: parseInt(studentId),
        session_id: activeSessionId!,
        obtained_marks: marks === 'A' ? 0 : marks as number,
        max_marks: typeof maxMarks === 'number' ? maxMarks : 100,
        remarks: marks === 'A' ? 'Absent' : undefined
      }));

      await testRecordService.createBulkTestResults(resultsData, user?.school_id!);

      showToast(`Successfully saved test "${testName}" with ${resultsData.length} student results`, 'success');
      
      // Log test marks activity
      try {
        await logTestMarksActivity(
          'create',
          selectedClass?.name || 'Unknown Class',
          selectedSection?.name || 'All Sections',
          selectedSubject?.subject?.name || 'Unknown Subject',
          testName,
          resultsData.length
        );
      } catch (activityError) {
        // Don't fail the save operation if activity logging fails
      }
      
      // Reset form
      setTestName('');
      setMarksData({});
      setSelectedStudents(new Set());
    } catch (error) {
      showToast('Failed to save test', 'error');
    } finally {
      setSaving(false);
    }
  }, [testCreated, selectedStudents.size, saving, selectedClass, selectedSection, selectedSubject, testName, testType, testDate, maxMarks, passingMarks, activeSessionId, marksData, user?.school_id, user?.id, showToast, logTestMarksActivity]);

  // Show delete confirmation modal
  const handleDeleteClick = useCallback(() => {
    if (selectedStudents.size === 0) {
      showToast('Please select students to delete marks for', 'error');
      return;
    }
    setShowDeleteModal(true);
  }, [selectedStudents.size, showToast]);

  // Delete test results for selected students from database
  const handleDeleteMarks = async () => {
    if (selectedStudents.size === 0) {
      showToast('Please select students to delete marks for', 'error');
      return;
    }

    if (deleting) {
      showToast('Already deleting marks, please wait...', 'error');
      return;
    }

    if (!selectedClass || !selectedSubject || !activeSessionId) {
      showToast('Missing required information to delete marks', 'error');
      return;
    }

    try {
      setDeleting(true);
      setShowDeleteModal(false);

      // Find the test record for the selected class, section, subject, and date
      const hasSections = selectedClass.has_sections ?? true;
      let trQuery = supabase
        .from('test_records')
        .select('id')
        .eq('class_id', selectedClass.id)
        .eq('subject_id', selectedSubject.subject_id)
        .eq('test_date', testDate)
        .eq('session_id', activeSessionId)
        .eq('school_id', user?.school_id!);

      if (hasSections) {
        if (!selectedSection) {
          showToast('Section is required', 'error');
          return;
        }
        trQuery = trQuery.eq('section_id', selectedSection.id);
      } else {
        trQuery = trQuery.is('section_id', null);
      }

      const { data: testRecords, error: testRecordsError } = await trQuery;

      if (testRecordsError) {
        showToast('Error finding test record', 'error');
        return;
      }

      if (!testRecords || testRecords.length === 0) {
        showToast('No test record found to delete marks from', 'error');
        return;
      }

      const testRecordId = testRecords[0].id;
      const studentIds = Array.from(selectedStudents);

      // Delete test results for the selected students
      const { error: deleteError } = await supabase
        .from('test_results')
        .delete()
        .eq('test_id', testRecordId)
        .eq('school_id', user?.school_id!)
        .in('student_id', studentIds);

      if (deleteError) {
        showToast('Failed to delete marks from database', 'error');
        return;
      }

      // Check if there are any remaining test results for this test record
      const { data: remainingResults, error: checkError } = await supabase
        .from('test_results')
        .select('id')
        .eq('test_id', testRecordId)
        .eq('school_id', user?.school_id!)
        .limit(1);

      if (checkError) {
        // Continue even if check fails - we'll just not delete the test record
      }

      // If no results remain, delete the test record as well
      if (!remainingResults || remainingResults.length === 0) {
        const { error: deleteTestRecordError } = await supabase
          .from('test_records')
          .delete()
          .eq('id', testRecordId)
          .eq('school_id', user?.school_id!);

        if (deleteTestRecordError) {
          showToast('Marks deleted but failed to delete test record', 'error');
        } else {
          // Test record deleted, reset the form
          setTestCreated(false);
          setTestName('');
          setMaxMarks('');
          setPassingMarks('');
          setMarksData({});
          setSelectedStudents(new Set());
          setHasExistingRecords(false);
          
          // Log test marks activity (test record deleted)
          try {
            await logTestMarksActivity(
              'delete',
              selectedClass?.name || 'Unknown Class',
              selectedSection?.name || 'All Sections',
              selectedSubject?.subject?.name || 'Unknown Subject',
              testName || 'Test Record',
              studentIds.length
            );
          } catch (activityError) {
            // Don't fail the delete operation if activity logging fails
          }
          
          showToast(`Successfully deleted marks and test record for ${selectedStudents.size} selected student${selectedStudents.size !== 1 ? 's' : ''}`, 'success');
          return; // Exit early since we've reset everything
        }
      }

      // Update local state
      const newMarksData = { ...marksData };
      selectedStudents.forEach(studentId => {
        delete newMarksData[studentId];
      });
      setMarksData(newMarksData);

      showToast(`Successfully deleted marks for ${selectedStudents.size} selected student${selectedStudents.size !== 1 ? 's' : ''}`, 'success');
      setSelectedStudents(new Set());

      // Reload existing marks to update the UI
      await loadExistingMarks();

      // Log test marks activity
      try {
        await logTestMarksActivity(
          'delete',
          selectedClass?.name || 'Unknown Class',
          selectedSection?.name || 'All Sections',
          selectedSubject?.subject?.name || 'Unknown Subject',
          testName || 'Test Record',
          studentIds.length
        );
      } catch (activityError) {
        // Don't fail the delete operation if activity logging fails
      }
    } catch (error) {
      showToast('Failed to delete marks', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete modal
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Load initial data
  useEffect(() => {
    if (user?.school_id) {
      loadClasses();
    }
  }, [user?.school_id]);

  // Fetch active session on mount
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!user?.school_id) {
        setHasActiveSession(false);
        return;
      }
      
      try {
        setLoadingSessions(true);
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();
        
        if (data) {
          setActiveSessionId(data.id);
          setHasActiveSession(true);
        } else {
          setHasActiveSession(false);
        }
        
        if (error && !(
          error.code === 'PGRST116' ||
          error.message?.includes('multiple (or no) rows returned') ||
          error.details?.includes('contains 0 rows')
        )) {
          setHasActiveSession(false);
        }
      } catch (error) {
        setHasActiveSession(false);
      } finally {
        setLoadingSessions(false);
      }
    };
    
    fetchActiveSession();
  }, [user?.school_id]);

  // Load sections/subjects when class is selected
  useEffect(() => {
    if (selectedClass) {
      if (selectedClass.has_sections ?? true) {
        loadSections(selectedClass.id);
      } else {
        setSections([]);
        setSelectedSection(null);
      }
      loadSubjects(selectedClass.id);
    }
  }, [selectedClass]);

  // Load students when class is selected and
  // - if class has sections: section must be selected
  // - if no sections: load immediately
  useEffect(() => {
    if (!selectedClass) return;
    const hasSections = selectedClass.has_sections ?? true;
    if (hasSections && selectedSection) {
      loadStudents(selectedClass.id, selectedSection.id);
      setTestCreated(false);
    } else if (!hasSections) {
      loadStudents(selectedClass.id, null);
      setTestCreated(false);
    }
  }, [selectedClass, selectedSection]);

  // Reset test creation when subject changes
  useEffect(() => {
    if (selectedSubject) {
      setTestCreated(false);
    }
  }, [selectedSubject]);

  // Load existing marks when class, section, and subject are selected
  useEffect(() => {
    if (selectedClass && selectedSection && selectedSubject && students.length > 0) {
      loadExistingMarks();
    }
  }, [selectedClass, selectedSection, selectedSubject, students]);

  // Load existing marks when test date changes
  useEffect(() => {
    if (selectedClass && selectedSection && selectedSubject && students.length > 0) {
      loadExistingMarks();
    }
  }, [testDate]);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup footer on unmount
  useEffect(() => {
    return () => {
      setFooterContent(null);
    };
  }, [setFooterContent]);

  // Set footer content for global footer
  useEffect(() => {
    const shouldShowFooter = selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && selectedSubject && students.length > 0 && testCreated && !checkingExistingMarks;
    
    if (shouldShowFooter) {
      const FooterContentComponent = React.memo(() => {
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: isMobile ? '6px' : '8px',
            flexWrap: 'nowrap'
          }}>
            <button
              onMouseDown={handleAbsentButton}
              style={{
                padding: isMobile ? '6px 10px' : '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: '1px solid #f59e0b',
                backgroundColor: '#f59e0b',
                color: 'white',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                flexShrink: 0
              }}
            >
              A
            </button>
            <FooterButtonGroup style={{ marginLeft: 'auto' }}>
              <FooterButton
                variant="secondary"
                onClick={() => {
                  setMarksData({});
                  setSelectedStudents(new Set());
                }}
                style={{ minWidth: isMobile ? '50px' : '60px', fontSize: isMobile ? '0.75rem' : '0.8rem' }}
              >
                Reset
              </FooterButton>
              {hasExistingRecords && (
                <FooterButton
                  variant="secondary"
                  onClick={handleDeleteClick}
                  disabled={deleting || selectedStudents.size === 0}
                  style={{ 
                    opacity: (deleting || selectedStudents.size === 0) ? 0.7 : 1,
                    cursor: (deleting || selectedStudents.size === 0) ? 'not-allowed' : 'pointer',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: '1px solid #ef4444',
                    fontSize: isMobile ? '0.75rem' : '0.8rem'
                  }}
                >
                  {deleting ? (
                    <>
                      <Spinner />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </FooterButton>
              )}
              <FooterButton
                variant="primary"
                onClick={handleSaveTest}
                disabled={saving || deleting || selectedStudents.size === 0}
                style={{ 
                  opacity: (saving || deleting || selectedStudents.size === 0) ? 0.7 : 1,
                  cursor: (saving || deleting || selectedStudents.size === 0) ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '0.75rem' : '0.8rem'
                }}
              >
                {saving ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  'Save Test'
                )}
              </FooterButton>
            </FooterButtonGroup>
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
  }, [selectedClass, selectedSection, selectedSubject, students.length, testCreated, checkingExistingMarks, selectedStudents.size, saving, deleting, isMobile, theme, setFooterContent, handleAbsentButton, handleDeleteClick, handleSaveTest, hasExistingRecords]);

  // Create test and show students
  const handleCreateTest = () => {
    if (!hasActiveSession || !activeSessionId) {
      showToast('No active session found. Please contact administrator to set up an active session.', 'error');
      return;
    }

    if (!testName.trim()) {
      showToast('Please enter test name', 'error');
      return;
    }

    // Set default values if empty
    const finalMaxMarks = maxMarks === '' ? 100 : maxMarks;
    const finalPassingMarks = passingMarks === '' ? 40 : passingMarks;

    if (finalPassingMarks > finalMaxMarks) {
      showToast('Passing marks cannot exceed max marks', 'error');
      return;
    }

    // Update state with final values
    setMaxMarks(finalMaxMarks);
    setPassingMarks(finalPassingMarks);
    setTestCreated(true);
    showToast('Test created! You can now enter marks for students.', 'success');
  };

  // Reset test creation state
  const handleResetTest = () => {
    setTestCreated(false);
    setMarksData({});
    setSelectedStudents(new Set());
    setTestName('');
    setMaxMarks('');
    setPassingMarks('');
    setTestDate(new Date().toISOString().split('T')[0]);
    setHasExistingRecords(false);
  };


  const loadClasses = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'Teacher' && user?.staff_id) {
        // For teachers, get classes where they have assigned subjects
        const { data, error } = await supabase
          .from('teacher_class_subjects')
          .select(`
            class_subject_id,
            class_subjects!inner(
              class_id,
              classes!inner(id, name, school_id, has_sections)
            )
          `)
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user?.school_id);
        
        if (error) throw error;
        
        // Extract unique classes from the nested structure
        const uniqueClasses = new Map();
        data?.forEach(item => {
          const classData = (item.class_subjects as any)?.classes;
          if (classData && !uniqueClasses.has(classData.id)) {
            uniqueClasses.set(classData.id, classData);
          }
        });
        
        const teacherClasses = Array.from(uniqueClasses.values());
        const sortedClasses = sortClasses(teacherClasses);
        setClasses(sortedClasses);
      } else {
        // For other roles, load all classes
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, school_id, has_sections')
          .eq('school_id', user?.school_id);
        
        if (error) throw error;
        
        const sortedClasses = sortClasses(data || []);
        setClasses(sortedClasses);
      }
    } catch (error) {
      showToast('Failed to load classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (classId: number) => {
    try {
      if (user?.role === 'Teacher' && user?.staff_id) {
        // For teachers, get sections where they have assigned subjects
        const { data, error } = await supabase
          .from('teacher_class_subjects')
          .select(`
            section_id,
            class_subjects!inner(
              class_id,
              classes!inner(id, name, school_id, has_sections)
            )
          `)
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user?.school_id)
          .eq('class_subjects.class_id', classId);
        
        if (error) throw error;
        
        // Extract unique sections from the nested structure
        const uniqueSections = new Map();
        data?.forEach(item => {
          if (item.section_id) {
            // Get section details
            const sectionId = item.section_id;
            if (!uniqueSections.has(sectionId)) {
              uniqueSections.set(sectionId, { id: sectionId });
            }
          }
        });
        
        // Fetch full section details for the unique section IDs
        if (uniqueSections.size > 0) {
          const sectionIds = Array.from(uniqueSections.keys());
          const { data: sectionsData, error: sectionsError } = await supabase
            .from('sections')
            .select('*')
            .in('id', sectionIds)
            .eq('school_id', user?.school_id)
            .order('name');
          
          if (sectionsError) throw sectionsError;
          setSections(sectionsData || []);
        } else {
          setSections([]);
        }
      } else {
        // For other roles, load all sections for the class
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('class_id', classId)
          .eq('school_id', user?.school_id)
          .order('name');
        
        if (error) throw error;
        setSections(data || []);
      }
    } catch (error) {
      showToast('Failed to load sections', 'error');
    }
  };

  const loadSubjects = async (classId: number) => {
    try {
      if (user?.role === 'Teacher' && user?.staff_id) {
        // For teachers, get subjects through teacher_class_subjects table
        const { data, error } = await supabase
          .from('teacher_class_subjects')
          .select(`
            class_subjects!inner(
              *,
              subject:subjects(name, code)
            )
          `)
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user?.school_id)
          .eq('class_subjects.class_id', classId);
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          // Extract class_subjects data from the nested structure
          const subjects = data.map(item => item.class_subjects).filter(Boolean) as any[];
          setSubjects(subjects);
        } else {
          setSubjects([]);
          showToast('No subjects assigned to you for this class', 'error');
        }
      } else {
        // For other roles, get all subjects for the class
        const { data, error } = await supabase
          .from('class_subjects')
          .select(`
            *,
            subject:subjects(name, code)
          `)
          .eq('class_id', classId)
          .eq('school_id', user?.school_id);
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          setSubjects(data);
        } else {
          setSubjects([]);
        }
      }
    } catch (error) {
      showToast('Failed to load subjects', 'error');
    }
  };

  const loadStudents = async (classId: number, sectionId: number | null) => {
    try {
      if (!activeSessionId) {
        showToast('No active session found. Please contact administrator.', 'error');
        setStudents([]);
        return;
      }

      // Fetch students from student_class_history for the active session and selected class/section
      let schQuery = supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', activeSessionId)
        .eq('new_class_id', classId)
        .eq('school_id', user?.school_id);

      if (sectionId === null) {
        schQuery = schQuery.is('new_section_id', null);
      } else {
        schQuery = schQuery.eq('new_section_id', sectionId);
      }

      const { data: schData, error: schError } = await schQuery;

      if (schError) {
        throw schError;
      }

      if (!schData || schData.length === 0) {
          setStudents([]);
          return;
        }
        
      // Get student IDs from student_class_history
      const studentIds = schData.map(sch => sch.student_id);

      // Fetch full student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, father_name, picture_url, class_id, section_id, school_id, roll_number')
        .eq('school_id', user?.school_id)
        .eq('status', 'active')
        .in('id', studentIds);
      
      if (studentsError) {
        throw studentsError;
      }

      const formattedStudents = (studentsData || []).sort((a, b) => a.id - b.id);
      setStudents(formattedStudents);
      
      // View activities are not logged - only create, update, and delete
      try {
        // No activity logging for view actions
      } catch (activityError) {
        // Don't fail the operation if activity logging fails
      }
    } catch (error) {
      showToast('Failed to load students', 'error');
    }
  };

  // Load existing marks for the selected class, section, and subject
  const loadExistingMarks = async () => {
    if (!selectedClass || !selectedSubject || students.length === 0) {
      return;
    }

    try {
      setLoadingExistingMarks(true);
      setCheckingExistingMarks(true);
      
      // Get the test date for today or the selected test date
      const currentTestDate = testDate;
      
      // Find existing test records for this class, section, subject, and date
      let trQuery = supabase
        .from('test_records')
        .select('id, name, test_date, max_marks, passing_marks')
        .eq('class_id', selectedClass.id)
        .eq('subject_id', selectedSubject.subject_id)
        .eq('test_date', currentTestDate)
        .eq('session_id', activeSessionId)
        .eq('school_id', user?.school_id);

      const hasSections = selectedClass.has_sections ?? true;
      if (hasSections) {
        if (!selectedSection) {
          setLoadingExistingMarks(false);
          return;
        }
        trQuery = trQuery.eq('section_id', selectedSection.id);
      } else {
        trQuery = trQuery.is('section_id', null);
      }

      const { data: existingTestRecords, error: testRecordsError } = await trQuery;

      if (testRecordsError) {
        return;
      }

      if (!existingTestRecords || existingTestRecords.length === 0) {
        // No existing test records found - clear marks and reset form
        setMarksData({});
        setSelectedStudents(new Set());
        setTestName('');
        setMaxMarks('');
        setPassingMarks('');
        setTestCreated(false);
        setHasExistingRecords(false);
        return;
      }

      // Get the most recent test record (in case there are multiple)
      const testRecord = existingTestRecords[0];
      
      // Load existing test results for this test record
      const { data: existingResults, error: resultsError } = await supabase
        .from('test_results')
        .select('student_id, obtained_marks, max_marks, remarks')
        .eq('test_id', testRecord.id)
        .eq('school_id', user?.school_id)
        .in('student_id', students.map(s => s.id));

      if (resultsError) {
        return;
      }

      // Convert to marksData format
      const marksData: { [studentId: number]: number | string } = {};
      const studentsWithMarks = new Set<number>();
      
      existingResults?.forEach(result => {
        // If remarks is "Absent", show "A", otherwise show the obtained marks
        marksData[result.student_id] = result.remarks === 'Absent' ? 'A' : result.obtained_marks;
        // Select students who have marks (including 0 and A)
        studentsWithMarks.add(result.student_id);
      });

      setMarksData(marksData);
      setSelectedStudents(studentsWithMarks);
      
      // Update test name, max marks, and passing marks from existing record
      setTestName(testRecord.name);
      setMaxMarks(testRecord.max_marks);
      setPassingMarks(testRecord.passing_marks);
      
      // Set test as created so students section appears
      setTestCreated(true);
      
      // Track if there are existing records
      setHasExistingRecords(existingResults && existingResults.length > 0);
      
      if (existingResults && existingResults.length > 0) {
        showToast(`Loaded existing marks for ${existingResults.length} students`, 'success');
      } else {
        showToast('No existing marks found for this test', 'success');
      }
    } catch (error) {
      showToast('Failed to load existing marks', 'error');
    } finally {
      setLoadingExistingMarks(false);
      setCheckingExistingMarks(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Header>
          <HeaderTopRow>
            <Title>Test Record Management</Title>
            
            
            <DesktopSegmentedGroup>
              <SegmentedGroup>
                <SegmentedSelect
                  value={selectedClass?.id || ''}
                  onChange={(e) => {
                    const classId = Number(e.target.value);
                    const selected = classes.find(c => c.id === classId);
                    setSelectedClass(selected || null);
                    setSelectedSection(null);
                    setSelectedSubject(null);
                    setStudents([]);
                  }}
                  style={{ minWidth: 120 }}
                  first
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </SegmentedSelect>
                {(selectedClass?.has_sections ?? true) && (
                  <SegmentedSelect
                    value={selectedSection?.id || ''}
                    onChange={(e) => {
                      const sectionId = Number(e.target.value);
                      const selected = sections.find(s => s.id === sectionId);
                      setSelectedSection(selected || null);
                      setSelectedSubject(null);
                      setStudents([]);
                    }}
                    disabled={!selectedClass}
                    style={{ minWidth: 120 }}
                  >
                    <option value="">Select Section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </SegmentedSelect>
                )}
                <SegmentedSelect
                  value={selectedSubject?.id || ''}
                  onChange={(e) => {
                    const subjectId = Number(e.target.value);
                    const selected = subjects.find(s => s.id === subjectId);
                    setSelectedSubject(selected || null);
                  }}
                  style={{ minWidth: 120 }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject?.name}
                    </option>
                  ))}
                </SegmentedSelect>
              </SegmentedGroup>
            </DesktopSegmentedGroup>
          </HeaderTopRow>
          
          <HeaderBottomRow>
            <MobileHeaderLayout>
              <MobileRow>
                <SegmentedGroup>
                  <SegmentedSelect
                    value={selectedClass?.id || ''}
                    onChange={(e) => {
                      const classId = Number(e.target.value);
                      const selected = classes.find(c => c.id === classId);
                      setSelectedClass(selected || null);
                      setSelectedSection(null);
                      setSelectedSubject(null);
                      setStudents([]);
                    }}
                    style={{ minWidth: 120 }}
                    first
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </SegmentedSelect>
                  {(selectedClass?.has_sections ?? true) && (
                    <SegmentedSelect
                      value={selectedSection?.id || ''}
                      onChange={(e) => {
                        const sectionId = Number(e.target.value);
                        const selected = sections.find(s => s.id === sectionId);
                        setSelectedSection(selected || null);
                        setSelectedSubject(null);
                        setStudents([]);
                      }}
                      disabled={!selectedClass}
                      style={{ minWidth: 120 }}
                      last
                    >
                      <option value="">Select Section</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </SegmentedSelect>
                  )}
                </SegmentedGroup>
              </MobileRow>

              <MobileRow>
                <SegmentedGroup>
                  <SegmentedSelect
                    value={selectedSubject?.id || ''}
                    onChange={(e) => {
                      const subjectId = Number(e.target.value);
                      const selected = subjects.find(s => s.id === subjectId);
                      setSelectedSubject(selected || null);
                    }}
                    style={{ minWidth: 120 }}
                    first
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.subject?.name}
                      </option>
                    ))}
                  </SegmentedSelect>
                </SegmentedGroup>
              </MobileRow>
            </MobileHeaderLayout>
          </HeaderBottomRow>
        </Header>

        <MainContent ref={mainContentRef}>
          {/* Test Configuration */}
          {selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && selectedSubject && (
            <div style={{
              background: theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff',
              borderRadius: '8px',
              padding: '0.5rem',
              marginBottom: '0.75rem',
              boxShadow: theme.palette?.mode === 'dark' ? '0 1px 3px 0 #0003' : '0 1px 3px 0 #0003',
              border: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
            }}>
              {/* Desktop: Single Line Layout */}
              <DesktopLayout>
                <div style={{ flex: '1', minWidth: '0' }}>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Test Name *"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      border: `1px solid ${testName.trim() === '' ? '#ef4444' : theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                      borderRadius: '4px',
                      background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                      color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                
                <div style={{ minWidth: '100px' }}>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      border: `1px solid ${theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                      borderRadius: '4px',
                      background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                      color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                
                <div style={{ width: '160px' }}>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      setMaxMarks(value);
                      if (typeof value === 'number' && typeof passingMarks === 'number' && passingMarks > value) {
                        setPassingMarks(value);
                      }
                    }}
                    min="1"
                    max="1000"
                    placeholder="Max Marks"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      border: `1px solid ${theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                      borderRadius: '4px',
                      background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                      color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                
                <div style={{ width: '160px' }}>
                  <input
                    type="number"
                    value={passingMarks}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      if (typeof value === 'number' && typeof maxMarks === 'number' && value > maxMarks) {
                        showToast(`Passing marks cannot exceed max marks (${maxMarks})`, 'error');
                      } else {
                        setPassingMarks(value);
                      }
                    }}
                    min="0"
                    max={typeof maxMarks === 'number' ? maxMarks : undefined}
                    placeholder="Passing Marks"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      border: `1px solid ${(typeof passingMarks === 'number' && typeof maxMarks === 'number' && passingMarks > maxMarks) ? '#ef4444' : theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                      borderRadius: '4px',
                      background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                      color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {!testCreated ? (
                  <button
                    onClick={handleCreateTest}
                    style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                      fontWeight: '600',
                        fontSize: '0.8rem',
                      cursor: 'pointer',
                      border: 'none',
                      background: '#4a6cf7',
                      color: 'white',
                      transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Create
                    </button>
                  ) : (
                    <button
                      onClick={handleResetTest}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        border: `1px solid ${theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                        background: 'transparent',
                        color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </DesktopLayout>
              
              {/* Mobile: Two Line Layout */}
              <MobileLayout>
                {/* First Row: Test Name and Date */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: '1' }}>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      placeholder="Test Name *"
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        border: `1px solid ${testName.trim() === '' ? '#ef4444' : theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                        borderRadius: '4px',
                        background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                        color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div style={{ minWidth: '120px' }}>
                    <input
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        border: `1px solid ${theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                        borderRadius: '4px',
                        background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                        color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
                
                {/* Second Row: Max Marks, Passing Marks, and Action Button */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ width: '160px' }}>
                    <input
                      type="number"
                      value={maxMarks}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : Number(e.target.value);
                        setMaxMarks(value);
                        if (typeof value === 'number' && typeof passingMarks === 'number' && passingMarks > value) {
                          setPassingMarks(value);
                        }
                      }}
                      min="1"
                      max="1000"
                      placeholder="Max Marks"
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        border: `1px solid ${theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                        borderRadius: '4px',
                        background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                        color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div style={{ width: '160px' }}>
                    <input
                      type="number"
                      value={passingMarks}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : Number(e.target.value);
                        if (typeof value === 'number' && typeof maxMarks === 'number' && value > maxMarks) {
                          showToast(`Passing marks cannot exceed max marks (${maxMarks})`, 'error');
                        } else {
                          setPassingMarks(value);
                        }
                      }}
                      min="0"
                      max={typeof maxMarks === 'number' ? maxMarks : undefined}
                      placeholder="Passing Marks"
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        border: `1px solid ${(typeof passingMarks === 'number' && typeof maxMarks === 'number' && passingMarks > maxMarks) ? '#ef4444' : theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                        borderRadius: '4px',
                        background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                        color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div style={{ flex: '1' }}>
                    {!testCreated ? (
                      <button
                        onClick={handleCreateTest}
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '4px',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          border: 'none',
                          background: '#4a6cf7',
                          color: 'white',
                          transition: 'all 0.2s ease'
                    }}
                  >
                    Create Test
                  </button>
                    ) : (
                  <button
                    onClick={handleResetTest}
                    style={{
                          width: '100%',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '4px',
                      fontWeight: '600',
                          fontSize: '0.8rem',
                      cursor: 'pointer',
                      border: `1px solid ${theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'}`,
                      background: 'transparent',
                      color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Reset
                  </button>
                    )}
                  </div>
                </div>
              </MobileLayout>
              
              {/* Loading Existing Marks Indicator */}
              {loadingExistingMarks && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem'
                }}>
                  <Loader size="small" />
                </div>
              )}
            </div>
          )}

          {/* Loading Sessions Indicator */}
          {loadingSessions && (
            <Loader size="small" />
          )}

          {/* No Active Session Warning */}
          {!hasActiveSession && !loadingSessions && (
            <div style={{
              background: theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              border: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: theme.palette?.mode === 'dark' ? '#ff6b6b' : '#dc2626'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: theme.palette?.mode === 'dark' ? '#ff6b6b' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                !
              </div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  No Active Session Found
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  Please contact your administrator to set up an active session before creating test records.
                </div>
              </div>
            </div>
          )}


          {/* Loading indicator when checking existing marks */}
          {checkingExistingMarks && (
            <Loader size="small" />
          )}

          {/* Students and Marks Entry */}
          {selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && selectedSubject && students.length > 0 && testCreated && !checkingExistingMarks && (
            <div style={{
              background: theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff',
              borderRadius: '12px',
              boxShadow: theme.palette?.mode === 'dark' ? '0 1.8px 7.2px 0 #0003' : '0 1.8px 7.2px 0 #0003',
              border: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              overflow: 'hidden',
              marginTop: '20px'
            }}>
              {/* Selection Controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: theme.palette?.mode === 'dark' ? '#252525' : '#f7faff',
                borderBottom: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                fontSize: '0.9rem',
                fontWeight: '500',
                color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'
              }}>
                <div
                  onClick={handleToggleAll}
                  style={{
                    position: 'relative',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    border: '2px solid #4a6cf7',
                    background: selectedStudents.size === students.length && students.length > 0 ? '#4a6cf7' : (theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'),
                    color: selectedStudents.size === students.length && students.length > 0 ? 'white' : '#4a6cf7',
                    fontSize: '0.7rem',
                    fontWeight: '600'
                  }}
                >
                  {selectedStudents.size === students.length && students.length > 0 ? '✓' : '○'}
                </div>
                <span>
                  {selectedStudents.size === 0 
                    ? 'Select students to save marks' 
                    : `${selectedStudents.size} of ${students.length} students selected`
                  }
                </span>
              </div>
              
              {students.map((student, index) => {
                const marksValue = marksData[student.id];
                const obtainedMarks = marksValue === 'A' ? 0 : (marksValue !== undefined && marksValue !== null ? parseFloat(String(marksValue)) : 0);
                const percentage = (typeof maxMarks === 'number' && maxMarks > 0) ? (obtainedMarks / maxMarks) * 100 : 0;
                const isSelected = selectedStudents.has(student.id);
                
                return (
                  <div key={student.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                    gap: '16px',
                    transition: 'background-color 0.2s ease',
                    position: 'relative',
                    background: activeStudentId === student.id ? (theme.palette?.mode === 'dark' ? 'rgba(74, 108, 247, 0.12)' : 'rgba(74, 108, 247, 0.06)') : 'transparent'
                  }}>
                    <div
                      onClick={() => handleSelectStudent(student.id, !isSelected)}
                      style={{
                        position: 'relative',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        border: '2px solid #4a6cf7',
                        background: isSelected ? '#4a6cf7' : (theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'),
                        color: isSelected ? 'white' : '#4a6cf7',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                      }}
                    >
                      {index + 1}
                    </div>
                    
                    <StudentAvatar>
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
                        />
                      ) : (
                        student.name.charAt(0).toUpperCase()
                      )}
                    </StudentAvatar>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                        fontSize: '0.95rem',
                        marginBottom: '2px'
                      }}>
                        {student.name}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <span>{student.father_name}</span>
                        <span style={{
                          background: '#4a6cf715',
                          color: '#4a6cf7',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '500'
                        }}>
                          ID: {getStudentDisplayId(student)}
                        </span>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={marksData[student.id] !== undefined ? marksData[student.id] : ''}
                      onChange={(e) => {
                        const inputValue = e.target.value.toUpperCase();
                        handleMarksInput(student.id, inputValue, maxMarks);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, students.indexOf(student), student.id)}
                      onFocus={(e) => handleFocus(student.id, e.target as HTMLInputElement)}
                      onBlur={handleBlur}
                      placeholder="Marks"
                      maxLength={10}
                      data-student-index={students.indexOf(student)}
                      style={{
                        width: '80px',
                        padding: '8px 12px',
                        border: `1px solid ${inputErrors[student.id] ? '#ef4444' : (theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9')}`,
                        borderRadius: '8px',
                        background: inputErrors[student.id] ? (theme.palette?.mode === 'dark' ? '#2d1b1b' : '#fef2f2') : (theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'),
                        color: inputErrors[student.id] ? (theme.palette?.mode === 'dark' ? '#fca5a5' : '#dc2626') : (theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'),
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    />
                    
                    <StudentPercentage 
                      color={percentage >= 80 ? '#16a34a' : 
                             percentage >= 60 ? '#f59e0b' : 
                             percentage >= 40 ? '#f97316' : '#dc2626'}
                    >
                      {marksData[student.id] === 'A' ? 'Absent' : 
                       marksData[student.id] === 0 ? '0%' :
                       isNaN(percentage) ? '0%' : `${percentage.toFixed(1)}%`}
                    </StudentPercentage>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Students Message */}
          {selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && students.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666',
              fontSize: '1.1rem',
              margin: '48px 0',
              padding: '40px'
            }}>
              No students found in {selectedClass.name}{selectedClass.has_sections && selectedSection ? ` - ${selectedSection.name}` : ''}
            </div>
          )}

          {/* No Selection Message */}
          {(!selectedClass || !(selectedClass.has_sections ? !!selectedSection : true) || !selectedSubject) && (
            <div style={{
              textAlign: 'center',
              color: theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666',
              fontSize: '1.1rem',
              margin: '48px 0',
              padding: '40px'
            }}>
              Please select Class{selectedClass?.has_sections ? ', Section' : ''}, and Subject to configure test
            </div>
          )}

          {/* Test Not Created Message */}
          {selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && selectedSubject && !testCreated && (
            <div style={{
              textAlign: 'center',
              color: theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666',
              fontSize: '1.1rem',
              margin: '48px 0',
              padding: '40px'
            }}>
              Configure your test details above and click "Create Test" to start entering marks
            </div>
          )}
        </MainContent>

        {/* Save Modal */}
        {showSaveModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                margin: '0 0 16px 0',
                textAlign: 'center'
              }}>
                List Completed
              </h3>
              <p style={{
                fontSize: '1rem',
                color: theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666',
                margin: '0 0 24px 0',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                You have reached the end of the student list. Would you like to save the test with all the marks you have entered?
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleCancelModal}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minWidth: '100px',
                    background: theme.palette?.mode === 'dark' ? '#444' : '#f3f4f6',
                    color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                    border: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFromModal}
                  disabled={saving || deleting}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
                    border: 'none',
                    minWidth: '100px',
                    background: '#4a6cf7',
                    color: 'white',
                    opacity: (saving || deleting) ? 0.7 : 1
                  }}
                >
                  {saving ? (
                    <>
                      <Spinner />
                      Saving...
                    </>
                  ) : (
                    'Save Test'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                margin: '0 0 16px 0',
                textAlign: 'center'
              }}>
                Confirm Delete
              </h3>
              <p style={{
                fontSize: '1rem',
                color: theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666',
                margin: '0 0 24px 0',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Are you sure you want to delete marks for {selectedStudents.size} selected student{selectedStudents.size !== 1 ? 's' : ''}? This action cannot be undone.
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    minWidth: '100px',
                    background: theme.palette?.mode === 'dark' ? '#444' : '#f3f4f6',
                    color: theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
                    border: `1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    opacity: deleting ? 0.7 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMarks}
                  disabled={deleting}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    border: 'none',
                    minWidth: '100px',
                    background: '#ef4444',
                    color: 'white',
                    opacity: deleting ? 0.7 : 1
                  }}
                >
                  {deleting ? (
                    <>
                      <Spinner />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </ThemeProvider>
  );
};

export default TestRecordManager;
