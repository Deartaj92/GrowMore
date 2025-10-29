import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import {
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { Info, PersonAdd } from '@mui/icons-material';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import NoTeachersFound from '../components/NoTeachersFound';

// Styled components (reuse from SubjectManager)
const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;
const GAP = '16px';
const CardBase = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2.5px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: visible;
  margin-bottom: ${GAP};
  width: 100%;
  min-width: 0;
  transition: border 0.4s cubic-bezier(0.4,0,0.2,1);
  &:hover {
    border-color: #4a6cf7;
    box-shadow: none;
    transform: none;
  }
`;
const PageHeaderCard = styled(CardBase)`
  margin-bottom: ${GAP};
  padding: 0.7rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  &:hover {
    border-color: ${({ theme }) => theme.BORDER};
    box-shadow: ${({ theme }) => theme.SHADOW};
    transform: none;
  }
`;
const PageHeaderText = styled.h2`
  font-size: 1.35rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  text-align: center;
  margin: 0;
  letter-spacing: 0.5px;
`;
const TeacherCard = styled(CardBase)`
  align-items: flex-start;
  color: inherit;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-left: 6px solid ${({ theme }) => theme.ACCENT};
  padding: 1.2rem 1.2rem 1.1rem 1.5rem;
  margin-bottom: 0;
  box-shadow: ${({ theme }) => theme.SHADOW};
  transition: box-shadow 0.18s, border-color 0.18s;
  &:hover {
    border-color: #274bb5;
    box-shadow: 0 4px 16px 0 #4a6cf733;
  }
`;
const TeacherId = styled.div`
  position: absolute;
  top: 1rem;
  right: 1.2rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  opacity: 0.7;
`;
const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: ${GAP};
  align-items: flex-start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;
const TeachersGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;
const AssignmentChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px 10px;
  margin: 10px 0 18px 0;
  min-height: 32px;
`;
const NoAssignments = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.01rem;
  font-weight: 500;
  text-align: center;
  width: 100%;
  margin: 10px 0 18px 0;
`;
const AssignButton = styled.button`
  width: 100%;
  margin-top: auto;
  margin-bottom: 2px;
  background: rgba(74, 108, 247, 0.3);
  color: #4a6cf7;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 0;
  font-size: 1.08rem;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  box-shadow: 0 2px 8px 0 #4a6cf733;
  &:hover {
    background: rgba(74, 108, 247, 0.5);
    color: #fff;
    box-shadow: 0 4px 16px 0 #4a6cf755;
  }
`;
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modal-fade-in 0.3s ease-out;
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 10px;
    align-items: flex-start;
    padding-top: 20px;
  }
  
  @keyframes modal-fade-in {
    from { 
      opacity: 0; 
      transform: scale(0.95) translateY(-20px);
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0);
    }
  }
`;

const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  position: relative;
  
  @media (max-width: 768px) {
    max-width: 95vw;
    max-height: 90vh;
    border-radius: 8px;
  }
`;
const ModalHeaderBar = styled.div`
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  padding: 16px 20px;
  border-radius: 12px 12px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    border-radius: 8px 8px 0 0;
  }
`;

const ModalHeaderTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: white;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ModalHeaderActions = styled.div`
  display: flex;
  gap: 8px;
  
  @media (max-width: 768px) {
    gap: 6px;
  }
`;
const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  
  @media (max-width: 768px) {
    padding: 12px;
  }
`;

const ClassSection = styled.div`
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ClassHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  .class-icon {
    width: 24px;
    height: 24px;
    background: ${({ theme }) => theme.ACCENT};
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.8rem;
  }
  
  .class-title {
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    margin: 0;
  }
  
  .class-subtitle {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    margin: 0;
  }
`;

const SubjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 8px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`;

const SubjectCard = styled.div<{ hasOtherTeachers?: boolean; isSelected?: boolean }>`
  background: ${({ theme, isSelected }) => isSelected ? theme.ACCENT + '08' : theme.CARD};
  border: 1px solid ${({ hasOtherTeachers, isSelected, theme }) => 
    isSelected ? theme.ACCENT : 
    hasOtherTeachers ? '#f59e0b' : 
    theme.BORDER
  };
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    border-color: ${({ theme, isSelected }) => isSelected ? theme.ACCENT : '#4a6cf7'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const SubjectHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const SubjectInfo = styled.div`
  flex: 1;
`;

const SubjectName = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 2px;
`;

const SubjectCode = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const SubjectCheckbox = styled.div`
  display: flex;
  align-items: center;
`;

const SectionSelection = styled.div`
  margin-top: 8px;
  padding: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const SectionTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  
  .required {
    color: #dc2626;
    font-size: 0.7rem;
  }
`;

const SectionsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const SectionChip = styled.div<{ selected?: boolean }>`
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid ${({ selected, theme }) => selected ? theme.ACCENT : theme.BORDER};
  background: ${({ selected, theme }) => selected ? theme.ACCENT + '15' : 'transparent'};
  color: ${({ selected, theme }) => selected ? theme.ACCENT : theme.TEXT_PRIMARY};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.ACCENT + '10'};
  }
`;

const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  padding: 6px 8px;
  margin-top: 6px;
  
  .warning-header {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    color: #92400e;
    font-size: 0.75rem;
    margin-bottom: 2px;
  }
  
  .warning-details {
    font-size: 0.7rem;
    color: #92400e;
    opacity: 0.8;
  }
`;

const ModalFooter = styled.div`
  background: ${({ theme }) => theme.FIELD_BG};
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-radius: 0 0 12px 12px;
  
  @media (max-width: 768px) {
    padding: 10px 12px;
    border-radius: 0 0 8px 8px;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        
        &:hover:not(:disabled) {
          background: #3a5ce5;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px ${theme.ACCENT}40;
        }
        
        &:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `;
    } else {
      return `
        background: transparent;
        color: ${theme.TEXT_SECONDARY};
        border: 1px solid ${theme.BORDER};
        
        &:hover {
          background: ${theme.FIELD_BG};
          border-color: ${theme.ACCENT};
          color: ${theme.ACCENT};
        }
      `;
    }
  }}
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 0.8rem;
  }
`;

const SubjectGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px 12px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const NoClassSubjectsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 24px;
  min-height: 400px;
`;

const NoClassSubjectsIcon = styled.div`
  font-size: 4rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  opacity: 0.6;
`;

const NoClassSubjectsTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const NoClassSubjectsText = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  max-width: 400px;
  line-height: 1.5;
`;

const AssignClassSubjectsButton = styled.button`
  background: ${({ theme }) => theme.ACCENT_INPUT};
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.18s, transform 0.18s;
  box-shadow: 0 4px 16px ${({ theme }) => theme.ACCENT_INPUT}33;
  
  &:hover {
    background: #274bb5;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${({ theme }) => theme.ACCENT_INPUT}44;
  }
`;

interface Teacher {
  id: number;
  name: string;
  role: string;
  section?: { class_name: string; section_name: string }[] | null;
  sections?: Array<{
    id: number;
    name: string;
    class_id: number;
    teacher_id?: number | null;
    classes: Array<{ id: number; name: string }>;
  }>;
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
  is_primary: boolean;
  remarks: string;
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
  
  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem', 
          gap: 16,
          color: '#888',
          fontSize: '1.1rem',
          fontWeight: 600
        }}>
          <Info style={{ fontSize: '1.5rem' }} />
          No school context found. Please contact your administrator.
        </div>
      </Container>
    );
  }

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<TeacherClassSubject[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);
  const [assignSelectedClassSubjects, setAssignSelectedClassSubjects] = useState<string[]>([]);
  const [assignSelectedSections, setAssignSelectedSections] = useState<{[key: string]: string[]}>({});
  const [classes, setClasses] = useState<{ id: number; name: string; has_sections: boolean }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string; class_id: number }[]>([]);

  useEffect(() => {
    if (user?.school_id) {
      fetchClassSubjects();
      fetchTeacherClassSubjects();
      fetchClasses();
      fetchSections();
    }
  }, [user?.school_id]);

  // Fetch teachers only after classes are loaded
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
    // For each teacher, fetch all sections where they are class teacher, and for each section, fetch class and section names
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
      console.error('Error fetching teachers:', error);
      showToast('Error fetching teachers', 'error');
      return;
    }

    // Helper to get class name by id
    const getClassName = (id: number) => classes.find(c => c.id === id)?.name || 'Unknown';

    // Transform: for each teacher, get all their class-teacher sections as class-section pairs
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
    // Fix: ensure classes/subjects are single objects, not arrays
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

  const openAssignModal = (teacher: Teacher) => {
    setAssigningTeacher(teacher);
    
    // Preselect already assigned class-subjects
    const assigned = teacherClassSubjects
      .filter(ts => ts.teacher_id.toString() === teacher.id.toString())
      .map(ts => ts.class_subject_id);
    
    // Remove duplicates and convert to strings
    const uniqueAssigned = assigned.filter((id, index) => assigned.indexOf(id) === index).map(id => id.toString());
    setAssignSelectedClassSubjects(uniqueAssigned);
    
    // Preselect sections for each class-subject
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
    
    // Debug logging
    console.log('Preselecting for teacher:', teacher.name);
    console.log('Selected class subjects:', uniqueAssigned);
    console.log('Selected sections:', sectionAssignments);
    
    setAssignModalOpen(true);
  };
  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningTeacher(null);
    setAssignSelectedClassSubjects([]);
    setAssignSelectedSections({});
  };

  // Helper function to check if all required sections are selected
  const isAssignmentValid = () => {
    if (assignSelectedClassSubjects.length === 0) return false;
    
    return assignSelectedClassSubjects.every(class_subject_id => {
      const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
      const selectedSections = assignSelectedSections[class_subject_id] || [];
      
      // For sectioned classes, at least one section must be selected
      if (classSubject?.classes.has_sections) {
        return selectedSections.length > 0;
      }
      
      // For non-sectioned classes, no section selection required
      return true;
    });
  };
  const handleAssignModalSave = async () => {
    if (!assigningTeacher || !user?.school_id) return;
    
    try {
      // Validate section selections for sectioned classes
      const validationErrors: string[] = [];
      
      assignSelectedClassSubjects.forEach(class_subject_id => {
        const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
        const selectedSections = assignSelectedSections[class_subject_id] || [];
        
        if (classSubject?.classes.has_sections && selectedSections.length === 0) {
          validationErrors.push(`${classSubject.classes.name} - ${classSubject.subjects.name}: Please select at least one section`);
        }
      });
      
      if (validationErrors.length > 0) {
        showToast(`Please select sections for: ${validationErrors.join(', ')}`, 'error');
        return;
      }
      
      // Check for conflicting assignments (same class-subject-section already assigned to other teachers)
      const conflictingAssignments: string[] = [];
      
      assignSelectedClassSubjects.forEach(class_subject_id => {
        const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
        const selectedSections = assignSelectedSections[class_subject_id] || [];
        
        if (classSubject?.classes.has_sections) {
          // For sectioned classes, check each selected section
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
              conflictingAssignments.push(`${classSubject.subjects.name} - ${sectionName} - ${teacherName}`);
            }
          });
        } else {
          // For non-sectioned classes, check if already assigned to another teacher
          const existingAssignment = teacherClassSubjects.find(ts => 
            ts.class_subject_id.toString() === class_subject_id && 
            ts.section_id === null &&
            ts.teacher_id.toString() !== assigningTeacher.id.toString()
          );
          
          if (existingAssignment && classSubject) {
            const teacherName = existingAssignment.staff?.name || 'Unknown Teacher';
            conflictingAssignments.push(`${classSubject.subjects.name} - ${teacherName}`);
          }
        }
      });
      
      if (conflictingAssignments.length > 0) {
        showToast(`Cannot assign: ${conflictingAssignments.join(', ')}`, 'error');
        return;
      }
      
    // Remove all existing assignments for this teacher
    const { error: delError } = await supabase
      .from('teacher_class_subjects')
      .delete()
      .eq('teacher_id', assigningTeacher.id)
      .eq('school_id', user.school_id);
      
    if (delError) {
      showToast('Error removing previous assignments.', 'error');
      return;
    }

      // Add new assignments with section information
    if (assignSelectedClassSubjects.length > 0) {
        const assignments: any[] = [];
        
        assignSelectedClassSubjects.forEach(class_subject_id => {
          const classSubject = classSubjects.find(cs => cs.id.toString() === class_subject_id);
          const selectedSections = assignSelectedSections[class_subject_id] || [];
          
          if (classSubject?.classes.has_sections) {
            // For classes with sections, create separate entries for each selected section
            selectedSections.forEach(section_id => {
              assignments.push({
        teacher_id: assigningTeacher.id,
        class_subject_id,
                section_id: parseInt(section_id),
        school_id: user.school_id,
              });
            });
          } else {
            // For classes without sections, create one entry without section
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
      
      // Log subject assignment activity
      try {
        const subjectCount = assignSelectedClassSubjects.length;
        const classCount = new Set(assignSelectedClassSubjects.map(id => {
          const classSubject = classSubjects.find(cs => cs.id.toString() === id);
          return classSubject?.classes.name;
        })).size;
        
        await logSubjectAssignmentActivity(
          'create',
          assigningTeacher.name,
          subjectCount,
          classCount
        );
      } catch (activityError) {
        console.error('Failed to log subject assignment activity:', activityError);
        // Don't fail the save operation if activity logging fails
      }
      
    fetchTeacherClassSubjects();
    closeAssignModal();
    } catch (error) {
      console.error('Error saving assignments:', error);
      showToast('Error saving assignments.', 'error');
    }
  };

  // Helper to get assigned class-subjects for a teacher
  const getTeacherClassSubjects = (teacherId: string | number) => {
    const tid = teacherId.toString();
    return teacherClassSubjects
      .filter(ts => ts.teacher_id.toString() === tid)
      .map(ts => ts.class_subjects)
      .filter(Boolean);
  };

  // Sort teachers by name
  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
  // Sort class-subjects by class name then subject code
  const sortedClassSubjects = [...classSubjects].sort((a, b) => {
    const classCmp = a.classes.name.localeCompare(b.classes.name);
    if (classCmp !== 0) return classCmp;
    return parseInt(a.subjects.code, 10) - parseInt(b.subjects.code, 10);
  });

  // Helper: group classSubjects by class
  const classMap: { [className: string]: ClassSubject[] } = {};
  sortedClassSubjects.forEach(cs => {
    if (!classMap[cs.classes.name]) classMap[cs.classes.name] = [];
    classMap[cs.classes.name].push(cs);
  });
  // Sort class names using the universal class sorting function
  const classObjects = Object.keys(classMap).map(name => ({ name }));
  const sortedClassObjects = sortClasses(classObjects);
  const sortedClassNames = sortedClassObjects.map(cls => cls.name);

  // Check if no teachers are available
  if (sortedTeachers.length === 0) {
    return <NoTeachersFound />;
  }

  // Check if no subjects are assigned to classes
  if (classSubjects.length === 0) {
    return (
      <Container>
        <PageHeaderCard>
          <PageHeaderText>Teacher Class-Subject Assignment</PageHeaderText>
        </PageHeaderCard>
        <NoClassSubjectsContainer>
          <NoClassSubjectsIcon>📚</NoClassSubjectsIcon>
          <NoClassSubjectsTitle>No Subjects Assigned to Classes</NoClassSubjectsTitle>
          <NoClassSubjectsText>
            No subjects have been assigned to classes yet. You need to assign subjects to classes first before you can assign them to teachers.
          </NoClassSubjectsText>
          <AssignClassSubjectsButton onClick={() => navigate('/subjects')}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            Assign Subjects to Classes
          </AssignClassSubjectsButton>
        </NoClassSubjectsContainer>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeaderCard>
        <PageHeaderText>Teacher Class-Subject Assignment</PageHeaderText>
      </PageHeaderCard>
      <TwoColumnGrid as={TeachersGrid}>
        {sortedTeachers.map(teacher => (
          <TeacherCard key={teacher.id}>
            <TeacherId>ID: {teacher.id}</TeacherId>
            <Typography variant="h6" style={{ fontSize: '1.13rem', fontWeight: 800, marginBottom: 2 }}>{teacher.name}</Typography>
            <Typography color="textSecondary" style={{ fontSize: '0.97rem', marginBottom: 2 }}>
              {teacher.section && teacher.section.length > 0
                ? (() => {
                    const sectionLength = teacher.section ? teacher.section.length : 0;
                    return (
                      <>
                        Class Teacher of: {teacher.section!.map((s, idx) => (
                          <span key={idx} style={{ fontWeight: 700, color: '#4a6cf7' }}>
                            {s.class_name} <span style={{ fontWeight: 700, color: '#f7b84a' }}>- {s.section_name}</span>{idx < sectionLength - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </>
                    );
                  })()
                : 'Not assigned as Class Teacher'}
            </Typography>
            <AssignmentChips>
              {getTeacherClassSubjects(teacher.id).length > 0 ? (
                (() => {
                  // Group assignments by class and section
                  const groupedAssignments: {[key: string]: {class: string, section: string, subjects: string[]}} = {};
                  
                  getTeacherClassSubjects(teacher.id).forEach((cs) => {
                    const assignment = teacherClassSubjects.find(ts => 
                      ts.teacher_id.toString() === teacher.id.toString() && 
                      ts.class_subjects.id === cs.id
                    );
                    
                    const sectionInfo = assignment?.section_id 
                      ? sections.find(s => s.id === parseInt(assignment.section_id!))
                      : null;
                    
                    const sectionName = sectionInfo ? sectionInfo.name : 'All Sections';
                    const key = `${cs.classes.name}(${sectionName})`;
                    
                    if (!groupedAssignments[key]) {
                      groupedAssignments[key] = {
                        class: cs.classes.name,
                        section: sectionName,
                        subjects: []
                      };
                    }
                    
                    groupedAssignments[key].subjects.push(cs.subjects.name);
                  });
                  
                  // Display grouped assignments
                  return Object.values(groupedAssignments).map((group, idx) => (
                    <Chip
                      key={idx}
                      label={`${group.class} (${group.section}) - ${group.subjects.join(', ')}`}
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                      style={{ fontSize: '0.9rem' }}
                    />
                  ));
                })()
              ) : (
                <NoAssignments>No assignments</NoAssignments>
              )}
            </AssignmentChips>
            <AssignButton onClick={() => openAssignModal(teacher)}>
              Assign Class-Subjects
            </AssignButton>
          </TeacherCard>
        ))}
      </TwoColumnGrid>
      {/* Assign Class-Subjects Modal */}
      {assignModalOpen && ReactDOM.createPortal(
        <ModalOverlay onClick={closeAssignModal}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalHeaderBar>
              <ModalHeaderTitle>
                Assign Subjects to {assigningTeacher?.name}
              </ModalHeaderTitle>
              <ModalHeaderActions>
                <ActionButton variant="secondary" onClick={closeAssignModal}>
                  Cancel
                </ActionButton>
                <ActionButton 
                  variant="primary" 
                  onClick={handleAssignModalSave}
                  disabled={!isAssignmentValid()}
                >
                  Save Assignments
                </ActionButton>
              </ModalHeaderActions>
            </ModalHeaderBar>
            
            <ModalContent>
              {assignSelectedClassSubjects.length > 0 && !isAssignmentValid() && (
                <div style={{ 
                  marginBottom: 12, 
                  padding: 8, 
                  background: 'rgba(220, 38, 38, 0.1)', 
                  border: '1px solid rgba(220, 38, 38, 0.3)', 
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  fontWeight: 600
                }}>
                  ⚠️ Please select sections for sectioned classes
                </div>
              )}
              
              {sortedClassNames.map(className => (
                <ClassSection key={className}>
                  <ClassHeader>
                    <div className="class-icon">
                      {className.charAt(0)}
                    </div>
                    <div>
                      <h3 className="class-title">{className}</h3>
                      <p className="class-subtitle">
                        {classMap[className].length} subject{classMap[className].length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </ClassHeader>
                  
                  <SubjectsGrid>
                    {classMap[className]
                      .filter(cs => true) // Show all class-subjects
                      .sort((a, b) => parseInt(a.subjects.code, 10) - parseInt(b.subjects.code, 10))
                      .map(cs => {
                        const classSections = sections.filter(s => s.class_id === parseInt(cs.class_id));
                        const isSelected = assignSelectedClassSubjects.includes(cs.id.toString());
                        const selectedSections = assignSelectedSections[cs.id.toString()] || [];
                        
                        // Check if this class-subject is already assigned to other teachers
                        const existingAssignments = teacherClassSubjects.filter(ts => 
                          ts.class_subject_id === cs.id && 
                          ts.teacher_id.toString() !== assigningTeacher?.id.toString()
                        );
                        const hasOtherTeachers = existingAssignments.length > 0;
                        
                        // Check if any selected sections are already assigned to other teachers
                        const conflictingSections: string[] = [];
                        if (isSelected && cs.classes.has_sections) {
                          const selectedSections = assignSelectedSections[cs.id.toString()] || [];
                          selectedSections.forEach(sectionId => {
                            const conflictingAssignment = existingAssignments.find(assignment => 
                              assignment.section_id != null &&
                              parseInt(assignment.section_id.toString()) === parseInt(sectionId)
                            );
                            if (conflictingAssignment) {
                              const teacherName = conflictingAssignment.staff?.name || 'Unknown Teacher';
                              const sectionName = sections.find(s => s.id === parseInt(sectionId))?.name || 'Unknown Section';
                              conflictingSections.push(`${sectionName} - ${teacherName}`);
                            }
                          });
                        }
                        
                        const toggleSubject = () => {
                          if (isSelected) {
                            setAssignSelectedClassSubjects(assignSelectedClassSubjects.filter(id => id !== cs.id.toString()));
                            // Clear section selections when unchecking
                            const newSections = { ...assignSelectedSections };
                            delete newSections[cs.id.toString()];
                            setAssignSelectedSections(newSections);
                          } else {
                            setAssignSelectedClassSubjects([...assignSelectedClassSubjects, cs.id.toString()]);
                          }
                        };

                        return (
                          <SubjectCard 
                          key={cs.id}
                            hasOtherTeachers={hasOtherTeachers}
                            isSelected={isSelected}
                            onClick={toggleSubject}
                            style={{ cursor: 'pointer' }}
                          >
                            <SubjectHeader>
                              <SubjectInfo>
                                <SubjectName>{cs.subjects.name}</SubjectName>
                                <SubjectCode>Code: {cs.subjects.code}</SubjectCode>
                              </SubjectInfo>
                              <SubjectCheckbox>
                            <Checkbox
                                  checked={isSelected}
                              onChange={e => {
                                    e.stopPropagation(); // Prevent card click when clicking checkbox
                                    toggleSubject();
                                  }}
                                />
                              </SubjectCheckbox>
                            </SubjectHeader>
                            
                            {hasOtherTeachers && (
                              <WarningBox onClick={e => e.stopPropagation()}>
                                <div className="warning-header">
                                  <span>⚠️</span>
                                  <span>Already assigned to other teachers</span>
                                </div>
                                <div className="warning-details">
                                  {existingAssignments.map(assignment => {
                                    const teacherName = assignment.staff?.name || 'Unknown Teacher';
                                    const sectionInfo = assignment.section_id 
                                      ? sections.find(s => s.id === parseInt(assignment.section_id!))
                                      : null;
                                    return sectionInfo 
                                      ? `${sectionInfo.name} - ${teacherName}`
                                      : teacherName;
                                  }).join(', ')}
                                </div>
                              </WarningBox>
                            )}
                            
                            {isSelected && cs.classes.has_sections && classSections.length > 0 && (
                              <SectionSelection onClick={e => e.stopPropagation()}>
                                <SectionTitle>
                                  <span>Select Sections</span>
                                  <span className="required">(Required)</span>
                                </SectionTitle>
                                <SectionsGrid>
                                  {classSections.map(section => {
                                    const isSelected = selectedSections.includes(section.id.toString());
                                    const isConflicting = existingAssignments.some(assignment => 
                                      assignment.section_id != null &&
                                      parseInt(assignment.section_id.toString()) === section.id
                                    );
                                    
                                    return (
                                      <SectionChip
                                        key={section.id}
                                        selected={isSelected}
                                        onClick={e => {
                                          e.stopPropagation(); // Prevent card click
                                          const newSections = { ...assignSelectedSections };
                                          if (!newSections[cs.id.toString()]) newSections[cs.id.toString()] = [];
                                          
                                          if (selectedSections.includes(section.id.toString())) {
                                            newSections[cs.id.toString()] = newSections[cs.id.toString()].filter(id => id !== section.id.toString());
                                          } else {
                                            newSections[cs.id.toString()] = [...newSections[cs.id.toString()], section.id.toString()];
                                          }
                                          setAssignSelectedSections(newSections);
                                        }}
                                        style={{
                                          borderColor: isConflicting ? '#dc2626' : undefined,
                                          backgroundColor: isConflicting && !isSelected ? '#fef2f2' : undefined,
                                          color: isConflicting && !isSelected ? '#dc2626' : undefined
                                        }}
                                      >
                                        {section.name}
                                        {isConflicting && !isSelected && (
                                          <span style={{ fontSize: '0.7rem', marginLeft: 4 }}>⚠️</span>
                                        )}
                                      </SectionChip>
                                    );
                                  })}
                                </SectionsGrid>
                                {selectedSections.length === 0 && (
                                  <div style={{ 
                                    marginTop: 8, 
                                    color: '#dc2626', 
                                    fontSize: '0.85rem', 
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}>
                                    ⚠️ At least one section must be selected
                </div>
                                )}
                                {conflictingSections.length > 0 && (
                                  <div style={{ 
                                    marginTop: 8, 
                                    color: '#dc2626', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#fef2f2',
                                    padding: 6,
                                    borderRadius: 4,
                                    border: '1px solid #fecaca'
                                  }}>
                                    ⚠️ Already assigned: {conflictingSections.join(', ')}
                                  </div>
                                )}
                              </SectionSelection>
                            )}
                            
                            {isSelected && !cs.classes.has_sections && (
                              <div 
                                onClick={e => e.stopPropagation()}
                                style={{ 
                                  marginTop: 6, 
                                  padding: 6, 
                                  background: '#f0f9ff', 
                                  border: '1px solid #0ea5e9', 
                                  borderRadius: 4,
                                  color: '#0369a1',
                                  fontSize: '0.75rem',
                                  fontWeight: 500
                                }}
                              >
                                ℹ️ No sections - applies to entire class
                              </div>
                            )}
                          </SubjectCard>
                        );
                      })}
                  </SubjectsGrid>
                </ClassSection>
              ))}
            </ModalContent>
            
            <ModalFooter>
              <ActionButton variant="secondary" onClick={closeAssignModal}>
                Cancel
              </ActionButton>
              <ActionButton 
                variant="primary" 
                onClick={handleAssignModalSave}
                disabled={!isAssignmentValid()}
              >
                Save Assignments
              </ActionButton>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>,
        document.body
      )}
    </Container>
  );
};

export default TeacherSubjectManager; 