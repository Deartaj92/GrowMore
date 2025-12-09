import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import {
  Checkbox,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Box,
  Badge,
} from '@mui/material';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { darkTheme, lightTheme } from '../components/Layout';
import { 
  Info, 
  Search, 
  Person, 
  Assignment, 
  Close, 
  School, 
  Groups,
  Edit,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import NoTeachersFound from '../components/NoTeachersFound';

// ============================================
// PART 1: CONTAINER & HEADER
// ============================================

const Container = styled.div`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow: hidden; /* Prevent container scroll - let MainContent handle it */
  min-height: 0; /* Critical for flex children */
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 0 10px 6px 10px;
  }
`;

const PageHeader = styled.div`
  flex-shrink: 0; /* Don't shrink */
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem 0;
  margin-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    padding: 0.4rem 0;
    margin-bottom: 10px;
  }
`;

const MainContent = styled.div`
  flex: 1; /* Fill remaining space */
  min-height: 0; /* Critical - allows flex child to shrink below content size */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0 8px 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  @media (max-width: 768px) {
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

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  gap: 12px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }
`;

const TitleSection = styled.div`
  flex: 1;
`;

const MainTitle = styled.h1`
  font-size: 1.15rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 2px 0;
  letter-spacing: -0.2px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 768px) {
    font-size: 1.05rem;
  }
`;

const Subtitle = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.3;
`;

const SearchWrapper = styled.div`
  min-width: 240px;
  max-width: 320px;
  width: 100%;
  
  @media (max-width: 768px) {
    min-width: 100%;
    max-width: 100%;
  }
`;

const SearchInput = styled(TextField)`
  .MuiOutlinedInput-root {
    background: ${({ theme }) => theme.CARD};
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${({ theme }) => theme.FIELD_BG};
    }
    
    &.Mui-focused {
      background: ${({ theme }) => theme.CARD};
      box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}15;
    }
    
    fieldset {
      border-color: ${({ theme }) => theme.BORDER};
      border-width: 1.5px;
    }
    
    &:hover fieldset {
      border-color: ${({ theme }) => theme.ACCENT};
    }
    
    &.Mui-focused fieldset {
      border-color: ${({ theme }) => theme.ACCENT};
    }
  }
  
  input {
    padding: 8px 12px;
    font-size: 0.8rem;
  }
`;

// ============================================
// PART 2: STATS CARDS
// ============================================

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 0;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  cursor: default;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  .icon-wrapper {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${({ theme }) => theme.ACCENT}15;
    color: ${({ theme }) => theme.ACCENT};
    flex-shrink: 0;
    
    svg {
      font-size: 1rem !important;
    }
  }
  
  .content {
    flex: 1;
    min-width: 0;
  }
  
  .label {
    font-size: 0.65rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    margin-bottom: 1px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  
  .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    line-height: 1.2;
  }
`;

// ============================================
// PART 3: TEACHER CARDS GRID
// ============================================

const TeachersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const TeacherCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${({ theme }) => theme.ACCENT}, ${({ theme }) => theme.ACCENT}80);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.ACCENT};
    
    &::before {
      transform: scaleX(1);
    }
  }
`;

const TeacherHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const TeacherInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TeacherName = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: ${({ theme }) => theme.ACCENT}20;
    color: ${({ theme }) => theme.ACCENT};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
    flex-shrink: 0;
  }
`;

const TeacherBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
    gap: 5px;
  margin-top: 6px;
`;

const BadgeChip = styled.span<{ variant?: 'primary' | 'success' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 0.7rem;
    font-weight: 600;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT}15;
        color: ${theme.ACCENT};
        border: 1px solid ${theme.ACCENT}30;
      `;
    } else if (variant === 'success') {
      return `
        background: #10b98115;
        color: #10b981;
        border: 1px solid #10b98130;
      `;
    } else {
      return `
        background: ${theme.FIELD_BG};
        color: ${theme.TEXT_SECONDARY};
        border: 1px solid ${theme.BORDER};
      `;
    }
  }}
`;

const AssignButton = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 600;
    font-size: 0.8rem;
  border: 2px solid ${({ theme }) => theme.ACCENT};
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  
  &:hover {
    background: transparent;
    color: ${({ theme }) => theme.ACCENT};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  svg {
    font-size: 0.9rem !important;
  }
`;

const AssignmentsSection = styled.div`
  margin-top: 12px;
`;

const SectionTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
    gap: 6px;
  
  svg {
    font-size: 0.9rem !important;
  }
`;

const AssignmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AssignmentItem = styled.div`
  padding: 10px;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  border-left: 3px solid ${({ theme }) => theme.ACCENT};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}08;
    border-color: ${({ theme }) => theme.ACCENT};
    transform: translateX(3px);
  }
`;

const AssignmentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
`;

const ClassSection = styled.span`
  font-weight: 700;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  .section {
    color: ${({ theme }) => theme.ACCENT};
  font-weight: 600;
    margin-left: 4px;
  }
`;

const SubjectsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
`;

const SubjectTag = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding: 2px 6px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const EmptyAssignments = styled.div`
  text-align: center;
  padding: 16px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  font-style: italic;
`;

// ============================================
// PART 4: MODAL (will continue in next part)
// ============================================

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const ModalHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, ${({ theme }) => theme.FIELD_BG} 0%, ${({ theme }) => theme.CARD} 100%);
  border-radius: 16px 16px 0 0;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  
  svg {
    font-size: 1.3rem !important;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.FIELD_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.FIELD_BG};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 4px;
    
    &:hover {
      background: ${({ theme }) => theme.TEXT_SECONDARY};
    }
  }
`;

const ModalFooter = styled.div`
  padding: 14px 20px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 0 0 16px 16px;
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    font-size: 1rem !important;
  }
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        
        &:hover:not(:disabled) {
          background: #3a5ce5;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px ${theme.ACCENT}50;
        }
        
        &:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }
      `;
    } else {
      return `
        background: transparent;
        color: ${theme.TEXT_SECONDARY};
        border: 2px solid ${theme.BORDER};
        
        &:hover {
          background: ${theme.FIELD_BG};
          border-color: ${theme.ACCENT};
          color: ${theme.ACCENT};
        }
      `;
    }
  }}
`;

const StyledTabs = styled(Tabs)`
  margin-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  
  .MuiTabs-indicator {
    background-color: ${({ theme }) => theme.ACCENT};
    height: 2px;
    border-radius: 2px;
  }
  
  .MuiTab-root {
    text-transform: none;
    font-weight: 600;
    font-size: 0.875rem;
    min-height: 44px;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    transition: all 0.2s;
    
    &.Mui-selected {
      color: ${({ theme }) => theme.ACCENT};
    }
    
    &:hover {
      color: ${({ theme }) => theme.ACCENT};
    }
  }
`;

const ModalSubjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
`;

const ModalSubjectCard = styled.div<{ isSelected?: boolean; hasConflict?: boolean }>`
  padding: 12px;
  border: 2px solid ${({ isSelected, hasConflict, theme }) => 
    hasConflict ? '#f59e0b' :
    isSelected ? theme.ACCENT : theme.BORDER
  };
  border-radius: 10px;
  background: ${({ isSelected, theme }) => isSelected ? theme.ACCENT + '08' : theme.CARD};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ModalSubjectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
`;

const ModalSubjectName = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ModalSubjectCode = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 3px;
`;

const ModalSectionsContainer = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
`;

const ModalSectionsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`;

const ModalSectionChip = styled.div<{ selected?: boolean; conflicted?: boolean }>`
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid ${({ selected, conflicted, theme }) => 
    conflicted ? '#f59e0b' :
    selected ? theme.ACCENT : theme.BORDER
  };
  background: ${({ selected, conflicted, theme }) => 
    conflicted ? '#fef3c7' :
    selected ? theme.ACCENT + '15' : 'transparent'
  };
  color: ${({ selected, conflicted, theme }) => 
    conflicted ? '#92400e' :
    selected ? theme.ACCENT : theme.TEXT_PRIMARY
  };
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.ACCENT + '10'};
  }
`;

interface Teacher {
  id: number;
  name: string;
  role: string;
  section?: { class_name: string; section_name: string }[] | null;
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  classes: { name: string; has_sections: boolean };
  subjects: { name: string; code: string };
}

interface TeacherClassSubject {
  id: string;
  teacher_id: string;
  class_subject_id: string;
  section_id?: string | null;
  class_subjects: {
    id: string;
    classes: { name: string; has_sections: boolean };
    subjects: { name: string; code: string };
  };
  staff: { name: string };
}

const TeacherSubjectManager = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { logSubjectAssignmentActivity } = useActivityTracking();
  const { setFooterContent } = usePageFooter();
  const { theme } = useTheme();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<TeacherClassSubject[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);
  const [assignSelectedClassSubjects, setAssignSelectedClassSubjects] = useState<string[]>([]);
  const [assignSelectedSections, setAssignSelectedSections] = useState<{[key: string]: string[]}>({});
  const [classes, setClasses] = useState<{ id: number; name: string; has_sections: boolean }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string; class_id: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (user?.school_id) {
      fetchClassSubjects();
      fetchTeacherClassSubjects();
      fetchClasses();
      fetchSections();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (classes.length > 0 && user?.school_id) {
      fetchTeachers();
    }
  }, [classes, user?.school_id]);

  const fetchClasses = async () => {
    if (!user?.school_id) return;
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, has_sections')
      .eq('school_id', user.school_id);
    if (!error && data) setClasses(data);
  };

  const fetchSections = async () => {
    if (!user?.school_id) return;
    const { data, error } = await supabase
      .from('sections')
      .select('id, name, class_id')
      .eq('school_id', user.school_id);
    if (!error && data) setSections(data);
  };

  const fetchTeachers = async () => {
    if (!user?.school_id) return;
    const { data, error } = await supabase
      .from('staff')
      .select(`
        id,
        name,
        role,
        sections:sections(id, name, class_id, teacher_id, classes(id, name))
      `)
      .eq('role', 'Teacher')
      .eq('school_id', user.school_id)
      .order('name');

    if (error) {
      showToast('Error fetching teachers', 'error');
      return;
    }

    const getClassName = (id: number) => classes.find(c => c.id === id)?.name || 'Unknown';

    const transformedData = (data || []).map(teacher => ({
      ...teacher,
      section: Array.isArray(teacher.sections)
        ? teacher.sections
            .filter(sec => sec.teacher_id === teacher.id)
            .map(sec => ({
              class_name: getClassName(sec.class_id),
              section_name: sec.name || 'Unknown'
            }))
        : null
    })) as Teacher[];
    setTeachers(transformedData);
  };

  const fetchClassSubjects = async () => {
    if (!user?.school_id) return;
    const { data, error } = await supabase
      .from('class_subjects')
      .select('id, class_id, subject_id, classes (name, has_sections), subjects (name, code)')
      .eq('school_id', user.school_id);
    if (error) {
      showToast('Error fetching class-subjects', 'error');
      return;
    }
    const fixed = (data || []).map(cs => ({
      ...cs,
      classes: Array.isArray(cs.classes) ? cs.classes[0] : cs.classes,
      subjects: Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects,
    }));
    setClassSubjects(fixed);
  };

  const fetchTeacherClassSubjects = async () => {
    if (!user?.school_id) return;
    const { data, error } = await supabase
      .from('teacher_class_subjects')
      .select('*, class_subjects (id, classes (name, has_sections), subjects (name, code)), staff (name)')
      .eq('school_id', user.school_id);
    if (error) {
      showToast('Error fetching assignments', 'error');
      return;
    }
    setTeacherClassSubjects(data || []);
  };

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const query = searchQuery.toLowerCase();
    return teachers.filter(teacher => 
      teacher.name.toLowerCase().includes(query)
    );
  }, [teachers, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const assignedCount = teacherClassSubjects.length === 0 
      ? 0 
      : (() => {
          const uniqueIds: string[] = [];
          teacherClassSubjects.forEach(tcs => {
            const teacherId = tcs.teacher_id.toString();
            if (!uniqueIds.includes(teacherId)) {
              uniqueIds.push(teacherId);
            }
          });
          return uniqueIds.length;
        })();
    
    const classesCount = classSubjects.length === 0
      ? 0
      : (() => {
          const uniqueClasses: string[] = [];
          classSubjects.forEach(cs => {
            if (!uniqueClasses.includes(cs.classes.name)) {
              uniqueClasses.push(cs.classes.name);
            }
          });
          return uniqueClasses.length;
        })();

    return {
      totalTeachers: teachers.length,
      assigned: assignedCount,
      classes: classesCount
    };
  }, [teachers.length, teacherClassSubjects, classSubjects]);

  const getTeacherAssignmentsGrouped = (teacherId: number) => {
    const assignments = teacherClassSubjects.filter(ts => 
      ts.teacher_id.toString() === teacherId.toString()
    );
    
    const grouped: {[key: string]: {subjects: string[], sections: string[]}} = {};
    
    assignments.forEach(assignment => {
      const className = assignment.class_subjects.classes.name;
      const subjectName = assignment.class_subjects.subjects.name;
      const sectionName = assignment.section_id 
        ? sections.find(s => s.id === parseInt(assignment.section_id!))?.name || 'All'
        : 'All';
      
      if (!grouped[className]) {
        grouped[className] = { subjects: [], sections: [] };
      }
      
      if (!grouped[className].subjects.includes(subjectName)) {
        grouped[className].subjects.push(subjectName);
      }
      
      if (!grouped[className].sections.includes(sectionName)) {
        grouped[className].sections.push(sectionName);
      }
    });
    
    return grouped;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const openAssignModal = (teacher: Teacher) => {
    setAssigningTeacher(teacher);
    setActiveTab(0);
    
    const assigned = teacherClassSubjects
      .filter(ts => ts.teacher_id.toString() === teacher.id.toString())
      .map(ts => ts.class_subject_id.toString());
    
    const uniqueAssigned = assigned.filter((id, index) => assigned.indexOf(id) === index);
    setAssignSelectedClassSubjects(uniqueAssigned);
    
    const sectionAssignments: {[key: string]: string[]} = {};
    teacherClassSubjects
      .filter(ts => ts.teacher_id.toString() === teacher.id.toString())
      .forEach(ts => {
        if (ts.section_id) {
          const key = ts.class_subject_id.toString();
          if (!sectionAssignments[key]) sectionAssignments[key] = [];
          sectionAssignments[key].push(ts.section_id.toString());
        }
      });
    setAssignSelectedSections(sectionAssignments);
    
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningTeacher(null);
    setAssignSelectedClassSubjects([]);
    setAssignSelectedSections({});
    setActiveTab(0);
  };

  const isAssignmentValid = () => {
    if (assignSelectedClassSubjects.length === 0) return false;
    
    return assignSelectedClassSubjects.every(class_subject_id => {
      const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
      const selectedSections = assignSelectedSections[class_subject_id] || [];
      
      if (classSubject?.classes.has_sections) {
        return selectedSections.length > 0;
      }
      
      return true;
    });
  };

  const handleAssignModalSave = async () => {
    if (!assigningTeacher || !user?.school_id) return;
    
    try {
      const validationErrors: string[] = [];
      
      assignSelectedClassSubjects.forEach(class_subject_id => {
        const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
        const selectedSections = assignSelectedSections[class_subject_id] || [];
        
        if (classSubject?.classes.has_sections && selectedSections.length === 0) {
          validationErrors.push(`${classSubject.classes.name} - ${classSubject.subjects.name}`);
        }
      });
      
      if (validationErrors.length > 0) {
        showToast(`Please select sections for: ${validationErrors.join(', ')}`, 'error');
        return;
      }
      
      const conflictingAssignments: string[] = [];
      
      assignSelectedClassSubjects.forEach(class_subject_id => {
        const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
        const selectedSections = assignSelectedSections[class_subject_id] || [];
        
        if (classSubject?.classes.has_sections) {
          selectedSections.forEach(section_id => {
            const existingAssignment = teacherClassSubjects.find(ts => 
              ts.class_subject_id.toString() === class_subject_id && 
              ts.section_id != null &&
              parseInt(ts.section_id.toString()) === parseInt(section_id) &&
              ts.teacher_id.toString() !== assigningTeacher.id.toString()
            );
            
            if (existingAssignment) {
              const teacherName = existingAssignment.staff?.name || 'Unknown Teacher';
              const sectionName = sections.find(s => s.id === parseInt(section_id))?.name || 'Unknown Section';
              conflictingAssignments.push(`${classSubject.subjects.name} - ${sectionName} (${teacherName})`);
            }
          });
        } else {
          const existingAssignment = teacherClassSubjects.find(ts => 
            ts.class_subject_id.toString() === class_subject_id && 
            ts.section_id === null &&
            ts.teacher_id.toString() !== assigningTeacher.id.toString()
          );
          
          if (existingAssignment && classSubject) {
            const teacherName = existingAssignment.staff?.name || 'Unknown Teacher';
            conflictingAssignments.push(`${classSubject.subjects.name} (${teacherName})`);
          }
        }
      });
      
      if (conflictingAssignments.length > 0) {
        showToast(`Conflict: ${conflictingAssignments.join(', ')}`, 'error');
        return;
      }
      
    const { error: delError } = await supabase
      .from('teacher_class_subjects')
      .delete()
      .eq('teacher_id', assigningTeacher.id)
      .eq('school_id', user.school_id);
      
    if (delError) {
      showToast('Error removing previous assignments.', 'error');
      return;
    }

    if (assignSelectedClassSubjects.length > 0) {
        const assignments: any[] = [];
        
        assignSelectedClassSubjects.forEach(class_subject_id => {
          const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
          const selectedSections = assignSelectedSections[class_subject_id] || [];
          
          if (classSubject?.classes.has_sections) {
            selectedSections.forEach(section_id => {
              assignments.push({
        teacher_id: assigningTeacher.id,
        class_subject_id,
                section_id: parseInt(section_id),
        school_id: user.school_id,
              });
            });
          } else {
            assignments.push({
              teacher_id: assigningTeacher.id,
              class_subject_id,
              section_id: null,
              school_id: user.school_id,
            });
          }
        });

        if (assignments.length > 0) {
          const { error: insError } = await supabase
            .from('teacher_class_subjects')
            .insert(assignments);
          
      if (insError) {
        showToast('Error assigning class-subjects.', 'error');
        return;
      }
    }
      }
      
    showToast('Assignments updated successfully.', 'success');
      
      try {
        const subjectCount = assignSelectedClassSubjects.length;
        const uniqueClassNames: string[] = [];
        assignSelectedClassSubjects.forEach(id => {
          const classSubject = classSubjects.find(cs => cs.id.toString() === id);
          const className = classSubject?.classes.name;
          if (className && !uniqueClassNames.includes(className)) {
            uniqueClassNames.push(className);
          }
        });
        const classCount = uniqueClassNames.length;
        
        await logSubjectAssignmentActivity(
          'create',
          assigningTeacher.name,
          subjectCount,
          classCount
        );
      } catch (activityError) {
        // Silent fail for activity logging
      }
      
    fetchTeacherClassSubjects();
    closeAssignModal();
    } catch (error) {
      showToast('Error saving assignments.', 'error');
    }
  };

  // Group classSubjects by class
  const classMap: { [className: string]: ClassSubject[] } = {};
  classSubjects.forEach(cs => {
    if (!classMap[cs.classes.name]) classMap[cs.classes.name] = [];
    classMap[cs.classes.name].push(cs);
  });
  
  const classObjects = Object.keys(classMap).map(name => ({ name }));
  const sortedClassObjects = sortClasses(classObjects);
  const sortedClassNames = sortedClassObjects.map(cls => cls.name);

  // Set footer content with stats
  useEffect(() => {
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    const isMobile = window.innerWidth <= 700;

    const FooterContent = React.memo(() => (
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center', 
        justifyContent: isMobile ? 'center' : 'space-between', 
        width: '100%',
        gap: isMobile ? '6px' : '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '16px',
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            color: themeObj.TEXT_SECONDARY,
            fontWeight: 500
          }}>
            <Person style={{ fontSize: isMobile ? '1rem' : '1.1rem' }} />
            <span style={{ fontWeight: 600, color: themeObj.TEXT_PRIMARY }}>{stats.totalTeachers}</span>
            <span>Teachers</span>
          </div>
          <span style={{ color: themeObj.BORDER }}>|</span>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            color: themeObj.TEXT_SECONDARY,
            fontWeight: 500
          }}>
            <Assignment style={{ fontSize: isMobile ? '1rem' : '1.1rem' }} />
            <span style={{ fontWeight: 600, color: themeObj.TEXT_PRIMARY }}>{stats.assigned}</span>
            <span>Assigned</span>
          </div>
          <span style={{ color: themeObj.BORDER }}>|</span>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            color: themeObj.TEXT_SECONDARY,
            fontWeight: 500
          }}>
            <School style={{ fontSize: isMobile ? '1rem' : '1.1rem' }} />
            <span style={{ fontWeight: 600, color: themeObj.TEXT_PRIMARY }}>{stats.classes}</span>
            <span>Classes</span>
          </div>
        </div>
      </div>
    ));

    setFooterContent({
      visible: true,
      content: <FooterContent />
    });

    return () => {
      setFooterContent(null);
    };
  }, [stats.totalTeachers, stats.assigned, stats.classes, theme, setFooterContent]);

  if (!user?.school_id) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem',
          minHeight: '100%'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            color: '#888',
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            <Info style={{ fontSize: '1.5rem' }} />
            No school context found. Please contact your administrator.
          </div>
        </div>
      </Container>
    );
  }

  if (teachers.length === 0 && classes.length > 0) {
    return <NoTeachersFound />;
  }

  if (classSubjects.length === 0) {
    return (
      <Container>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          minHeight: '100%'
        }}>
          <div style={{ 
            textAlign: 'center',
            padding: '60px 20px',
            color: '#888'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📚</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'inherit', marginBottom: '8px' }}>
              No Subjects Assigned to Classes
            </div>
            <div style={{ fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              You need to assign subjects to classes first before you can assign them to teachers.
            </div>
            <button
              onClick={() => navigate('/subjects')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: '#4a6cf7',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              Go to Subject Assignment
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader>
        <HeaderTop>
          <TitleSection>
            <MainTitle>
              <Assignment style={{ fontSize: '1.5rem', color: 'inherit' }} />
              Teacher Assignments
            </MainTitle>
            <Subtitle>
              Manage subject and class assignments for all teachers in your school
            </Subtitle>
          </TitleSection>
          <SearchWrapper>
            <SearchInput
              fullWidth
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search style={{ color: '#888' }} />
                  </InputAdornment>
                ),
              }}
            />
          </SearchWrapper>
        </HeaderTop>
      </PageHeader>

      <MainContent>
        <TeachersGrid>
        {filteredTeachers.map(teacher => {
          const assignments = getTeacherAssignmentsGrouped(teacher.id);
          const assignmentCount = Object.keys(assignments).length;
                                    
                                    return (
            <TeacherCard key={teacher.id}>
              <TeacherHeader>
                <TeacherInfo>
                  <TeacherName>
                    <div className="avatar">{getInitials(teacher.name)}</div>
                    {teacher.name}
                  </TeacherName>
                  <TeacherBadges>
                    {teacher.section && teacher.section.length > 0 && (
                      <BadgeChip variant="primary">
                        <Groups style={{ fontSize: '0.9rem' }} />
                        Class Teacher
                      </BadgeChip>
                    )}
                    {assignmentCount > 0 && (
                      <BadgeChip variant="success">
                        <CheckCircle style={{ fontSize: '0.9rem' }} />
                        {assignmentCount} Assignment{assignmentCount !== 1 ? 's' : ''}
                      </BadgeChip>
                    )}
                  </TeacherBadges>
                  {teacher.section && teacher.section.length > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#888' }}>
                      {teacher.section.map((s, idx) => (
                        <span key={idx}>
                          <strong style={{ color: '#4a6cf7' }}>{s.class_name}</strong>
                          {' - '}
                          <span style={{ color: '#f7b84a', fontWeight: 600 }}>{s.section_name}</span>
                          {idx < teacher.section!.length - 1 && ', '}
                        </span>
                      ))}
                                  </div>
                                )}
                </TeacherInfo>
            <AssignButton onClick={() => openAssignModal(teacher)}>
                  <Edit style={{ fontSize: '1rem' }} />
                  Assign
            </AssignButton>
              </TeacherHeader>

              <AssignmentsSection>
                <SectionTitle>
                  <Assignment style={{ fontSize: '1rem' }} />
                  Current Assignments
                </SectionTitle>
                {assignmentCount > 0 ? (
                  <AssignmentList>
                    {Object.entries(assignments).map(([className, data]) => (
                      <AssignmentItem key={className}>
                        <AssignmentHeader>
                          <ClassSection>
                            {className}
                            <span className="section">({data.sections.join(', ')})</span>
                </ClassSection>
                        </AssignmentHeader>
                        <SubjectsList>
                          {data.subjects.map((subject, idx) => (
                            <SubjectTag key={idx}>{subject}</SubjectTag>
                          ))}
                        </SubjectsList>
                      </AssignmentItem>
                    ))}
                  </AssignmentList>
                ) : (
                  <EmptyAssignments>
                    No assignments yet. Click "Assign" to add subjects.
                  </EmptyAssignments>
                )}
              </AssignmentsSection>
            </TeacherCard>
          );
        })}
        </TeachersGrid>
      </MainContent>

      {/* Assignment Modal */}
      {assignModalOpen && ReactDOM.createPortal(
        <ModalOverlay onClick={closeAssignModal}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                <Assignment style={{ fontSize: '1.5rem' }} />
                Assign Subjects to {assigningTeacher?.name}
              </ModalTitle>
              <CloseButton onClick={closeAssignModal}>
                <Close />
              </CloseButton>
            </ModalHeader>
            
            <ModalContent>
              {assignSelectedClassSubjects.length > 0 && !isAssignmentValid() && (
                <div style={{ 
                  marginBottom: 20, 
                  padding: 12, 
                  background: 'rgba(220, 38, 38, 0.1)', 
                  border: '1px solid rgba(220, 38, 38, 0.3)', 
                  borderRadius: 10,
                  fontSize: '0.875rem',
                  color: '#dc2626',
                  fontWeight: 600
                }}>
                  ⚠️ Please select sections for sectioned classes
                </div>
              )}
              
              <StyledTabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
              {sortedClassNames.map(className => (
                  <Tab key={className} label={className} />
                ))}
              </StyledTabs>
              
              {sortedClassNames.map((className, index) => (
                <Box key={className} hidden={activeTab !== index} role="tabpanel">
                  <ModalSubjectsGrid>
                    {classMap[className]
                      .sort((a, b) => parseInt(a.subjects.code, 10) - parseInt(b.subjects.code, 10))
                      .map(cs => {
                        const classSections = sections.filter(s => s.class_id === parseInt(cs.class_id));
                        const isSelected = assignSelectedClassSubjects.includes(cs.id.toString());
                        const selectedSections = assignSelectedSections[cs.id.toString()] || [];
                        
                        const existingAssignments = teacherClassSubjects.filter(ts => 
                          ts.class_subject_id === cs.id && 
                          ts.teacher_id.toString() !== assigningTeacher?.id.toString()
                        );
                        const hasConflict = existingAssignments.length > 0;
                        
                        const toggleSubject = () => {
                          if (isSelected) {
                            setAssignSelectedClassSubjects(assignSelectedClassSubjects.filter(id => id !== cs.id.toString()));
                            const newSections = { ...assignSelectedSections };
                            delete newSections[cs.id.toString()];
                            setAssignSelectedSections(newSections);
                          } else {
                            setAssignSelectedClassSubjects([...assignSelectedClassSubjects, cs.id.toString()]);
                          }
                        };

                        return (
                          <ModalSubjectCard
                          key={cs.id}
                            isSelected={isSelected}
                            hasConflict={hasConflict}
                            onClick={toggleSubject}
                          >
                            <ModalSubjectHeader>
                              <div>
                                <ModalSubjectName>{cs.subjects.name}</ModalSubjectName>
                                <ModalSubjectCode>Code: {cs.subjects.code}</ModalSubjectCode>
                              </div>
                            <Checkbox
                                  checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                    toggleSubject();
                                  }}
                                size="small"
                              />
                            </ModalSubjectHeader>
                            
                            {hasConflict && (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                marginBottom: '8px'
                              }}>
                                ⚠️ {existingAssignments.length} other teacher{existingAssignments.length > 1 ? 's' : ''}
                                </div>
                            )}
                            
                            {isSelected && cs.classes.has_sections && classSections.length > 0 && (
                              <ModalSectionsContainer onClick={e => e.stopPropagation()}>
                                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px', fontWeight: 600 }}>
                                  Select Sections:
                                </div>
                                <ModalSectionsGrid>
                                  {classSections.map(section => {
                                    const isSectionSelected = selectedSections.includes(section.id.toString());
                                    const isConflicted = existingAssignments.some(assignment => 
                                      assignment.section_id != null &&
                                      parseInt(assignment.section_id.toString()) === section.id
                                    );
                                    
                                    return (
                                      <ModalSectionChip
                                        key={section.id}
                                        selected={isSectionSelected}
                                        conflicted={isConflicted}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newSections = { ...assignSelectedSections };
                                          if (!newSections[cs.id.toString()]) newSections[cs.id.toString()] = [];
                                          
                                          if (isSectionSelected) {
                                            newSections[cs.id.toString()] = newSections[cs.id.toString()].filter(id => id !== section.id.toString());
                                          } else {
                                            newSections[cs.id.toString()] = [...newSections[cs.id.toString()], section.id.toString()];
                                          }
                                          setAssignSelectedSections(newSections);
                                        }}
                                      >
                                        {section.name}
                                      </ModalSectionChip>
                                    );
                                  })}
                                </ModalSectionsGrid>
                                {selectedSections.length === 0 && (
                                  <div style={{ 
                                    marginTop: 10, 
                                    color: '#dc2626', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600
                                  }}>
                                    ⚠️ Select at least one section
                                  </div>
                                )}
                              </ModalSectionsContainer>
                            )}
                            
                            {isSelected && !cs.classes.has_sections && (
                              <div style={{ 
                                marginTop: 10, 
                                padding: 8, 
                                  background: '#f0f9ff', 
                                  border: '1px solid #0ea5e9', 
                                borderRadius: 8,
                                  color: '#0369a1',
                                fontSize: '0.8rem',
                                  fontWeight: 500
                              }}>
                                ℹ️ Applies to entire class
                              </div>
                            )}
                          </ModalSubjectCard>
                        );
                      })}
                  </ModalSubjectsGrid>
                </Box>
              ))}
            </ModalContent>
            
            <ModalFooter>
              <ModalButton variant="secondary" onClick={closeAssignModal}>
                <Cancel style={{ fontSize: '1.1rem' }} />
                Cancel
              </ModalButton>
              <ModalButton 
                variant="primary" 
                onClick={handleAssignModalSave}
                disabled={!isAssignmentValid()}
              >
                <CheckCircle style={{ fontSize: '1.1rem' }} />
                Save Assignments
              </ModalButton>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>,
        document.body
      )}
    </Container>
  );
};

export default TeacherSubjectManager; 
