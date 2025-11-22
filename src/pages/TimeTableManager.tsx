import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { Box, Button } from '@mui/material';
import { supabase } from '../supabaseClient';
import ReactDOM from 'react-dom';
import { useToast } from '../contexts/ToastContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import { UserOptions, Styles } from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { Info, PersonAdd } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import NoTeachersFound from '../components/NoTeachersFound';
import Loader from '../components/Loader';

const Container = styled.div`
  padding: 20px;
  max-width: 1550px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 10px;
  }
`;
const PageHeaderCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 0.7rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 16px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2.5px solid ${({ theme }) => theme.BORDER};
`;
const PageHeaderText = styled.h2`
  font-size: 1.35rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  text-align: center;
  margin: 0;
  letter-spacing: 0.5px;
`;

// Timetable grid styles (to be refined for reference image)
const TimetableGrid = styled.div`
  display: grid;
  grid-template-columns: 110px repeat(8, minmax(0, 1fr)) minmax(0, 0.5fr);
  gap: 0;
  background: ${({ theme }) => theme.BACKGROUND};
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.BORDER};
`;
const Cell = styled.div<{ header?: boolean; breakCol?: boolean; classCol?: boolean; isEditing?: boolean }>`
  background: ${({ header, breakCol, classCol, isEditing, theme }) =>
    header ? theme.ACCENT + '22' : 
    breakCol ? theme.ACCENT + '44' : 
    classCol ? theme.ACCENT + '33' : 
    isEditing ? theme.ACCENT + '11' : theme.CARD};
  color: ${({ header, breakCol, classCol, theme }) =>
    header || breakCol || classCol ? theme.TEXT_PRIMARY : theme.TEXT_SECONDARY};
  font-weight: ${({ header, classCol }) => (header || classCol ? 700 : 500)};
  font-size: ${({ header }) => (header ? '1.1rem' : '1rem')};
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  padding: ${({ header, breakCol }) => (header || breakCol ? '10px 4px' : '8px 4px')};
  text-align: center;
  min-width: 80px;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme, header, breakCol, classCol }) => 
      header || breakCol || classCol ? 'inherit' : theme.ACCENT + '11'};
  }

  select {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: ${({ isEditing }) => isEditing ? 1 : 0};
    cursor: pointer;
    z-index: 2;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    padding: 4px;
    transition: opacity 0.2s ease;

    &:focus {
      outline: none;
    }

    option {
      background: ${({ theme }) => theme.CARD};
      color: ${({ theme }) => theme.TEXT_PRIMARY};
      padding: 8px;
    }
  }

  .cell-content {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .dropdown-indicator {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 0.8rem;
    pointer-events: none;
    opacity: ${({ isEditing }) => isEditing ? 1 : 0};
    transition: opacity 0.2s ease;
  }
`;
const BreakCell = styled(Cell)`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 1px;
  background: ${({ theme }) => theme.ACCENT + '44'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-right: 2px solid ${({ theme }) => theme.BORDER};
`;

const periods = [
  { num: 1, time: '08:30-09:00' },
  { num: 2, time: '09:00-09:30' },
  { num: 3, time: '09:30-10:00' },
  { num: 4, time: '10:00-10:30' },
  { num: 5, time: '10:30-11:00' },
  { num: 6, time: '11:15-11:45' },
  { num: 7, time: '11:45-12:15' },
  { num: 8, time: '12:15-12:45' },
];
const breakText = 'Break\n11:00-11:15';

// Add type definitions
interface SubjectTeacherPair {
  subjectId: number;
  teacherId: number;
}

interface ClassAssignment {
  [classId: number]: SubjectTeacherPair[];
}

const Dropdown = styled.div`
  position: fixed;
  z-index: 1000; /* Ensure dropdown is on top */
  min-width: 180px;
  background: ${({ theme }) => theme.CARD};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  box-shadow: 0 4px 24px #0003;
  padding: 0.3rem 0;
  display: flex;
  flex-direction: column;
`;
const DropdownOption = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
  font-size: 1rem;
  padding: 0.5rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.ACCENT + '22'};
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  position: relative;
`;
const BreakOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  color: #fff;
  font-weight: 800;
  font-size: 1.1rem;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  background: ${({ theme }) => theme.ACCENT + '44'};
`;
const TimetableTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1100px;
`;
const Th = styled.th<{ breakCol?: boolean; classCol?: boolean }>`
  padding: 0.5rem 0.2rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 700;
  font-size: 1.05rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme, breakCol, classCol }) =>
    breakCol ? theme.ACCENT + '44' : classCol ? theme.ACCENT + '33' : theme.CARD};
  ${({ breakCol }) => breakCol && `border-bottom: none !important;`}
  min-width: ${({ breakCol }) => (breakCol ? '60px' : '120px')};
  width: ${({ breakCol }) => (breakCol ? '5%' : '10%')};
  vertical-align: middle;
  writing-mode: ${({ breakCol }) => (breakCol ? 'vertical-rl' : 'horizontal-tb')};
  text-orientation: ${({ breakCol }) => (breakCol ? 'mixed' : 'initial')};
`;
const Td = styled.td<{ breakCol?: boolean; classCol?: boolean }>`
  padding: 0.4rem 0.2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  text-align: center;
  background: ${({ theme, breakCol, classCol }) =>
    breakCol ? theme.ACCENT + '44' : classCol ? theme.ACCENT + '33' : theme.CARD};
  min-width: ${({ breakCol }) => (breakCol ? '60px' : '120px')};
  width: ${({ breakCol }) => (breakCol ? '5%' : '10%')};
  vertical-align: middle;
  ${({ breakCol }) => breakCol && `border-top: none;`}
`;

const ThemedSelect = styled.select`
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG || theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 600;
  outline: none;
  margin-right: 16px;
  transition: border 0.18s, box-shadow 0.18s;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;
const ThemedOption = styled.option`
  background: ${({ theme }) => theme.FIELD_BG || theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

// Define types
type Color = [number, number, number];
interface Class {
  id: number;
  name: string;
}

// Helper function to sort classes using the universal sorting function
const sortClassesLocal = (classes: Class[]): Class[] => {
  return sortClasses(classes);
};

const ActionButtonsContainer = styled(Box)`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-top: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    
    & > button {
      width: 100%;
    }
    
    & > select {
      width: 100%;
      margin-right: 0 !important;
    }

    & > label {
      width: 100%;
      text-align: center;
      margin: 0 !important;
    }
  }
`;

const BreakColumn = styled(Td)`
  background: ${({ theme }) => theme.ACCENT + '44'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 800;
  font-size: 1.1rem;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  text-align: center;
  vertical-align: middle;
  padding: 8px;
  white-space: nowrap;
  letter-spacing: 1px;
`;

const NoAssignmentsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 24px;
  min-height: 400px;
`;

const NoAssignmentsIcon = styled.div`
  font-size: 4rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  opacity: 0.6;
`;

const NoAssignmentsTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const NoAssignmentsText = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  max-width: 400px;
  line-height: 1.5;
`;

const AssignSubjectsButton = styled.button`
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

const TimeTableManager: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  // Data state
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cellSelections, setCellSelections] = useState<Record<string, string[]>>({});
  
  // Consolidated loading state that tracks all data checks
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [classAssignments, setClassAssignments] = useState<ClassAssignment>({});
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const selectRefs = useRef<Record<string, HTMLSelectElement | null>>({});
  const [dropdown, setDropdown] = useState<{ cellKey: string, rect: DOMRect | null } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [breakIdx, setBreakIdx] = useState(5); // Default: after 5th period
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);
  const [teacherSlipsLoading, setTeacherSlipsLoading] = useState(false);

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

  // Fetch active session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();
        if (data) {
          setSessionId(data.id);
          setSessionName(data.name);
        } else {
          toast.showToast('No active session found. Timetable saving is disabled.', 'warning');
        }
      } catch (error) {
        toast.showToast('No active session found. Timetable saving is disabled.', 'warning');
      }
    };
    fetchSession();
  }, [toast, user.school_id]);

  // Helper functions for getting names
  const getSubjectName = (id: number): string => subjects.find(s => s.id === id)?.name || '';
  const getTeacherName = (id: number): string => teachers.find(t => t.id === id)?.name || '';
  
  // Helper function to get teacher name with gender-based prefix
  const getTeacherNameWithPrefix = (id: number): string => {
    const teacher = teachers.find(t => t.id === id);
    if (!teacher) return '';
    
    const name = teacher.name;
    const gender = teacher.gender;
    
    // Determine prefix based on gender
    let prefix = '';
    if (gender === 'Male') {
      prefix = 'Mr.';
    } else if (gender === 'Female') {
      prefix = 'Ms.';
    } else {
      // For 'Other' or any other gender, use a neutral prefix or no prefix
      prefix = '';
    }
    
    return prefix ? `${prefix} ${name}` : name;
  };

  useEffect(() => {
    // Fetch all required data for timetable generation
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [cls, subs, tchs, tcs, secs] = await Promise.all([
          supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name'),
          supabase.from('subjects').select('id, name').eq('school_id', user.school_id),
          supabase.from('staff').select('id, name, role, gender').eq('role', 'Teacher').eq('school_id', user.school_id).order('name'),
          supabase.from('teacher_class_subjects').select('id, teacher_id, class_subject_id, class_subjects (class_id, subject_id)').eq('school_id', user.school_id),
          supabase.from('sections').select('id, class_id, teacher_id').eq('school_id', user.school_id),
        ]);
        setClasses(cls.data || []);
        setSubjects(subs.data || []);
        setTeachers(tchs.data || []);
        setTeacherClassSubjects(tcs.data || []);
        setSections(secs.data || []);

        // Build classAssignments map
        const assignments: ClassAssignment = {};
        tcs.data?.forEach((tcs: any) => {
          if (tcs.class_subjects && tcs.class_subjects.class_id && tcs.class_subjects.subject_id) {
            const classId = tcs.class_subjects.class_id;
            if (!assignments[classId]) assignments[classId] = [];
            assignments[classId].push({
              subjectId: tcs.class_subjects.subject_id,
              teacherId: tcs.teacher_id
            });
          }
        });
        setClassAssignments(assignments);
      } catch (err) {
        // Timetable fetchAll error
      } finally {
        setLoading(false);
        setAllDataLoaded(true);
      }
    };
    fetchAll();
  }, [user.school_id]);

  useEffect(() => {
    if (editingCell && selectRefs.current[editingCell]) {
      const select = selectRefs.current[editingCell];
      select?.focus();
      // Try to open the dropdown programmatically
      select?.click();
    }
  }, [editingCell]);

  // Helper to group subject-teacher pairs by teacher for a class
  function groupByTeacher(pairs: { subjectId: number, teacherId: number }[]) {
    const map: Record<number, number[]> = {};
    pairs.forEach(pair => {
      if (!map[pair.teacherId]) map[pair.teacherId] = [];
      map[pair.teacherId].push(pair.subjectId);
    });
    return map;
  }

  // Helper to get subjects for a teacher in a class
  function getTeacherSubjects(teacherId: number, classId: number): number[] {
    const allSubjects = classAssignments[classId] || [];
    return allSubjects
      .filter((pair: SubjectTeacherPair) => pair.teacherId === teacherId)
      .map((pair: SubjectTeacherPair) => pair.subjectId);
  }

  // Helper to get remaining subjects for a teacher in a class
  function getRemainingSubjects(teacherId: number, classId: number, currentCellKey: string): number[] {
    const teacherSubjects = getTeacherSubjects(teacherId, classId);
    // Only check other cells for selected subjects, not the current cell
    const selectedSubjects = Object.entries(cellSelections)
      .filter(([key, _]) => key.startsWith(`${classId}_`) && key !== currentCellKey)
      .flatMap(([_, selections]) => selections)
      .map((selection: string) => Number(selection.split('_')[0]));

    return teacherSubjects.filter((subjectId: number) => !selectedSubjects.includes(subjectId));
  }

  // Helper to get all available subjects for a teacher in a class
  function getAvailableSubjects(teacherId: number, classId: number, currentCellKey: string): number[] {
    const teacherSubjects = getTeacherSubjects(teacherId, classId);
    const currentSelections = cellSelections[currentCellKey] || [];
    const selectedInCurrentCell = currentSelections.map(sel => Number(sel.split('_')[0]));
    
    // Return all subjects that aren't selected in the current cell
    return teacherSubjects.filter(subjectId => !selectedInCurrentCell.includes(subjectId));
  }

  // Helper to check if a teacher is already selected in this cell
  function isTeacherSelectedInCell(teacherId: number, cellKey: string): boolean {
    const selections = cellSelections[cellKey] || [];
    return selections.some((selection: string) => Number(selection.split('_')[1]) === teacherId);
  }

  // Helper to get all booked subject-teacher pairs for a class
  function getBookedPairs(classId: number, currentCellKey: string): Set<string> {
    return new Set(
      Object.entries(cellSelections)
        .filter(([key, _]) => key.startsWith(`${classId}_`) && key !== currentCellKey)
        .flatMap(([_, selections]) => selections)
    );
  }

  // Helper to get all available subject-teacher pairs for a class
  function getAvailablePairs(classId: number, currentCellKey: string): { value: string, label: string }[] {
    const bookedPairs = getBookedPairs(classId, currentCellKey);
    const currentSelections = new Set(cellSelections[currentCellKey] || []);
    const options: { value: string, label: string }[] = [];

    // Get all subject-teacher pairs for this class
    const allPairs = classAssignments[classId] || [];
    
    // Group by teacher for better organization
    const teacherMap = groupByTeacher(allPairs);
    
    Object.entries(teacherMap).forEach(([teacherId, subjectIds]) => {
      subjectIds.forEach(sid => {
        const pair = `${sid}_${teacherId}`;
        // Only add if not booked in other cells and not selected in current cell
        if (!bookedPairs.has(pair) && !currentSelections.has(pair)) {
          const value = pair;
          const label = `${getSubjectName(Number(sid))} - ${getTeacherName(Number(teacherId))}`;
          options.push({ value, label });
        }
      });
    });

    // Sort options by teacher name, then subject name
    return options.sort((a, b) => {
      const [aSubject, aTeacher] = a.label.split(' - ');
      const [bSubject, bTeacher] = b.label.split(' - ');
      if (aTeacher === bTeacher) {
        return aSubject.localeCompare(bSubject);
      }
      return aTeacher.localeCompare(bTeacher);
    });
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(null);
      }
    }
    if (dropdown) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdown]);

  // Handle Save Timetable
  const handleSaveTimetable = async () => {
    if (!sessionId) {
      toast.showToast('No active session found. Cannot save timetable.', 'error');
      return;
    }
    setLoading(true);
    const timetableDataToSave: Array<{ class_id: number; period_index: number; subject_id: number; teacher_id: number; session_id: number; break_index: number; school_id: number; day_of_week: number }> = [];

    // Prepare data from cellSelections
    Object.entries(cellSelections).forEach(([cellKey, selections]) => {
      const [classIdStr, periodIndexStr] = cellKey.split('_');
      const classId = Number(classIdStr);
      const periodIndex = Number(periodIndexStr);

      selections.forEach(selection => {
        const [subjectIdStr, teacherIdStr] = selection.split('_');
        const subjectId = Number(subjectIdStr);
        const teacherId = Number(teacherIdStr);

        timetableDataToSave.push({
          class_id: classId,
          period_index: periodIndex,
          subject_id: subjectId,
          teacher_id: teacherId,
          session_id: sessionId,
          break_index: breakIdx,
          school_id: user.school_id!,
          day_of_week: 1 // Default to Monday since this appears to be a daily timetable
        });
      });
    });


    try {
      // Get unique class_ids and day_of_week present in current selections to delete existing records
      const uniqueClassIds = Array.from(new Set(timetableDataToSave.map(item => item.class_id)));
      const dayOfWeek = 1; // Since this is a daily timetable, we're working with day 1 (Monday)

      // Delete existing records for the classes being saved, current session, and specific day
      if (uniqueClassIds.length > 0) {
        // First, check what records exist before deletion
        const { data: existingRecords, error: checkError } = await supabase
          .from('timetable')
          .select('*')
          .eq('session_id', sessionId)
          .eq('school_id', user.school_id)
          .eq('day_of_week', dayOfWeek)
          .in('class_id', uniqueClassIds);
        
        if (checkError) {
          // Error checking existing records
        }
        
        const { error: deleteError } = await supabase
          .from('timetable')
          .delete()
          .eq('session_id', sessionId)
          .eq('school_id', user.school_id)
          .eq('day_of_week', dayOfWeek)
          .in('class_id', uniqueClassIds);
        
        if (deleteError) {
          throw deleteError;
        }
      }

      // Insert the new data
      if (timetableDataToSave.length > 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('timetable')
          .insert(timetableDataToSave);

        if (insertError) {
          throw insertError;
        }
        
        // Verify the data was actually inserted
        const { data: verifyData, error: verifyError } = await supabase
          .from('timetable')
          .select('*')
          .eq('session_id', sessionId)
          .eq('school_id', user.school_id)
          .eq('day_of_week', 1)
          .in('class_id', uniqueClassIds);
        
        if (verifyError) {
          // Verify error
        }
      }

      toast.showToast('Timetable saved successfully!', 'success');
    } catch (error: any) {
      toast.showToast(`Failed to save timetable: ${error.message || error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Timetable
  useEffect(() => {
    const loadTimetable = async () => {
      if (!sessionId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('timetable')
          .select('class_id, period_index, subject_id, teacher_id, break_index, day_of_week')
          .eq('session_id', sessionId)
          .eq('school_id', user.school_id)
          .eq('day_of_week', 1); // Only load Monday's timetable

        if (error) throw error;


        const loadedSelections: Record<string, string[]> = {};
        let loadedBreakIndex: number | undefined;

        data.forEach((item: any) => {
          const cellKey = `${item.class_id}_${item.period_index}`;
          const selectionValue = `${item.subject_id}_${item.teacher_id}`;

          if (!loadedSelections[cellKey]) {
            loadedSelections[cellKey] = [];
          }
          loadedSelections[cellKey].push(selectionValue);
          if (loadedBreakIndex === undefined) {
            loadedBreakIndex = item.break_index;
          }
        });


        setCellSelections(loadedSelections);
        if (loadedBreakIndex !== undefined) {
          setBreakIdx(loadedBreakIndex);
        }
        toast.showToast('Timetable loaded successfully!', 'success');
      } catch (error: any) {
        toast.showToast(`Failed to load timetable: ${error.message || error}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    loadTimetable();
  }, [sessionId, user.school_id, toast]); // Dependency on sessionId, school_id, and toast

  // Helper function to get free teachers for a period
  const getFreeTeachers = (periodIndex: number): string[] => {
    // Get all teachers who have assignments in this period
    const busyTeachers = new Set<number>();
    Object.entries(cellSelections)
      .filter(([key]) => key.endsWith(`_${periodIndex}`))
      .forEach(([_, selections]) => {
        selections.forEach(selection => {
          const [_, teacherId] = selection.split('_');
          busyTeachers.add(Number(teacherId));
        });
      });

    // Return names of teachers who are not busy
    return teachers
      .filter(t => !busyTeachers.has(t.id))
      .map(t => t.name)
      .sort();
  };

  // Handle Export PDF
  const handleExportPDF = async () => {
    if (!sessionId) {
      toast.showToast('Ensure a session is active to export the timetable.', 'warning');
      return;
    }

    setExportLoading(true);
    setLoading(true);
    toast.showToast('Generating PDF...', 'info');

    try {
      // Initialize PDF in landscape A4
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions in mm (landscape)
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;

      // Add header with session name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Timetable for Session - ${sessionName}`, pageWidth / 2, 15, { align: 'center' });

      // Add printed date at bottom right
      const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Printed on: ${currentDate}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

      // Filter and sort classes
      const filteredClasses = sortClassesLocal(
        classes.filter(cls => classAssignments[cls.id] && classAssignments[cls.id].length > 0)
      );

      // Calculate table dimensions
      const tableWidth = pageWidth - (2 * margin);
      const breakColWidth = 18;
      const classColWidth = 22;
      const regularColWidth = Math.floor((tableWidth - breakColWidth - classColWidth) / periods.length);

      // Define types for table data
      type Color = [number, number, number];
      interface CellStyle extends Partial<Styles> {
        valign?: 'middle' | 'bottom' | 'top';
        halign?: 'left' | 'center' | 'right';
        fontStyle?: 'normal' | 'bold' | 'italic';
        fillColor?: Color;
        fontSize?: number;
        cellPadding?: { top: number; right: number; bottom: number; left: number };
        minCellHeight?: number;
      }

      interface CellDef {
        content: string;
        rowSpan?: number;
        styles?: CellStyle;
      }

      // Helper function to format cell content
      const formatCellContent = (selected: string[]): string => {
        const teacherGroups = selected.reduce((acc: { [key: string]: string[] }, sel) => {
          const [subjectId, teacherId] = sel.split('_');
          const teacher = teacherId;
          if (!acc[teacher]) {
            acc[teacher] = [];
          }
          acc[teacher].push(getSubjectName(Number(subjectId)));
          return acc;
        }, {});

        return Object.entries(teacherGroups)
          .map(([teacherId, subjects]) => {
            const sortedSubjects = subjects.sort().join(' / ');
            const teacherName = getTeacherName(Number(teacherId));
            return `${sortedSubjects}\n${teacherName}`;
          })
          .join('\n\n');
      };

      // Prepare table data with proper typing
      const headerRow: (string | CellDef)[] = ['Class'];

      // First add all period columns before break
      for (let i = 0; i <= breakIdx; i++) {
        headerRow.push({
          content: `Period ${periods[i].num}\n${periods[i].time}`,
          styles: {
            valign: 'middle',
            halign: 'center',
            fontStyle: 'bold',
            cellPadding: { top: 4, right: 2, bottom: 4, left: 2 }
          }
        });
      }

      // Add break column
      headerRow.push({
        content: '',
        styles: {
          valign: 'middle',
          halign: 'center',
          fontStyle: 'bold',
          fillColor: [245, 245, 245] as Color,
          fontSize: 11,
          cellWidth: breakColWidth
        }
      });

      // Add remaining period columns after break
      for (let i = breakIdx + 1; i < periods.length; i++) {
        headerRow.push({
          content: `Period ${periods[i].num}\n${periods[i].time}`,
          styles: {
            valign: 'middle',
            halign: 'center',
            fontStyle: 'bold',
            cellPadding: { top: 4, right: 2, bottom: 4, left: 2 }
          }
        });
      }

      const bodyRows: (string | CellDef)[][] = [];
      // Prepare body rows with optimized content
      filteredClasses.forEach((cls, rowIndex) => {
        const row: (string | CellDef)[] = [cls.name];

        // Add cells for periods before break
        for (let i = 0; i <= breakIdx; i++) {
          const cellKey = `${cls.id}_${i}`;
          const selected = cellSelections[cellKey] || [];
          
          if (selected.length > 0) {
            const teacherGroups = selected.reduce((acc: { [key: string]: string[] }, sel) => {
              const [subjectId, teacherId] = sel.split('_');
              if (!acc[teacherId]) {
                acc[teacherId] = [];
              }
              acc[teacherId].push(getSubjectName(Number(subjectId)));
              return acc;
            }, {});

            const formattedContent = Object.entries(teacherGroups)
              .map(([teacherId, subjects]) => {
                const sortedSubjects = subjects.sort().join(' / ');
                const teacherName = getTeacherName(Number(teacherId));
                return `${sortedSubjects}\n${teacherName}`;
              })
              .join('\n\n');

            row.push({
              content: formattedContent,
              styles: {
                fontSize: 8,
                cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
                minCellHeight: 18,
                halign: 'center',
                valign: 'middle'
              }
            });
          } else {
            row.push('-');
          }
        }

        // Add break column
        if (rowIndex === 0) {
          row.push({
            content: 'Break\n11:00-\n11:15',
            rowSpan: filteredClasses.length,
            styles: {
              valign: 'middle',
              halign: 'center',
              fontStyle: 'bold',
              fillColor: [245, 245, 245] as Color,
              fontSize: 11,
              cellWidth: breakColWidth
            }
          });
        }

        // Add cells for periods after break
        for (let i = breakIdx + 1; i < periods.length; i++) {
          const cellKey = `${cls.id}_${i}`;
          const selected = cellSelections[cellKey] || [];
          
          if (selected.length > 0) {
            const teacherGroups = selected.reduce((acc: { [key: string]: string[] }, sel) => {
              const [subjectId, teacherId] = sel.split('_');
              if (!acc[teacherId]) {
                acc[teacherId] = [];
              }
              acc[teacherId].push(getSubjectName(Number(subjectId)));
              return acc;
            }, {});

            const formattedContent = Object.entries(teacherGroups)
              .map(([teacherId, subjects]) => {
                const sortedSubjects = subjects.sort().join(' / ');
                const teacherName = getTeacherName(Number(teacherId));
                return `${sortedSubjects}\n${teacherName}`;
              })
              .join('\n\n');

            row.push({
              content: formattedContent,
              styles: {
                fontSize: 8,
                cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
                minCellHeight: 18,
                halign: 'center',
                valign: 'middle'
              }
            });
          } else {
            row.push('-');
          }
        }

        bodyRows.push(row);
      });

      // Add free teachers row
      const freeTeachersRow: (string | CellDef)[] = ['Free Teachers'];
      for (let i = 0; i <= breakIdx; i++) {
        const freeTeachers = getFreeTeachers(i);
        freeTeachersRow.push({
          content: freeTeachers.join('\n'),
          styles: {
            fontSize: 9,
            textColor: [100, 100, 100] as Color,
            fontStyle: 'italic'
          }
        });
      }
      // Add break column
      freeTeachersRow.push({
        content: '',
        styles: {
          fillColor: [245, 245, 245] as Color
        }
      });
      // Add remaining periods
      for (let i = breakIdx + 1; i < periods.length; i++) {
        const freeTeachers = getFreeTeachers(i);
        freeTeachersRow.push({
          content: freeTeachers.join('\n'),
          styles: {
            fontSize: 9,
            textColor: [100, 100, 100] as Color,
            fontStyle: 'italic'
          }
        });
      }
      bodyRows.push(freeTeachersRow);

      // Set up table configuration
      const tableConfig: UserOptions = {
        head: [headerRow],
        body: bodyRows,
        startY: 30,
        theme: 'grid',
        tableWidth: tableWidth,
        margin: { 
          left: margin, 
          right: margin,
          bottom: 20
        },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          overflow: 'linebreak',
          minCellHeight: 18,
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [240, 240, 240] as Color,
          textColor: [40, 40, 40] as Color,
          fontSize: 9,
          fontStyle: 'bold',
          minCellHeight: 12,
          halign: 'center',
          valign: 'middle',
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 }
        },
        columnStyles: {
          0: {
            cellWidth: classColWidth,
            fontStyle: 'bold',
            fillColor: [245, 245, 245] as Color,
            fontSize: 9,
            halign: 'center',
            valign: 'middle'
          },
          // Set consistent width for all period columns
          ...Array.from({ length: periods.length + 1 }, (_, i) => ({
            [i + 1]: {
              cellWidth: regularColWidth,
              halign: 'center',
              valign: 'middle'
            }
          })).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        },
        didParseCell: function(data: CellHookData) {
          const rowData = data.row.raw as unknown as (string | { content: string, colSpan: number })[];
          if (rowData) {
            // Existing cell styling
            const firstCell = rowData[0];
            if (firstCell && typeof firstCell === 'object' && 'content' in firstCell && firstCell.content === 'BREAK') {
              data.cell.styles.fillColor = [245, 245, 245] as Color;
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 11;
              data.cell.styles.halign = 'center';
            }
            // Style for free periods
            if (rowData[1] === 'Free Period') {
              data.cell.styles.textColor = [128, 128, 128] as Color;
              data.cell.styles.fontStyle = 'italic';
            }
            // Style for free teachers row
            if (data.row.index === bodyRows.length - 1) {
              data.cell.styles.fontStyle = 'italic';
              if (data.column.index === 0) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [0, 0, 0] as Color;
              }
            }
          }
        }
      };

      // Generate table
      autoTable(doc, tableConfig);

      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
      }
      
      // Format date as dd-mmm-yyyy for filename
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fileName = `Timetable (${formatDateForFileName(new Date())}).pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `timetable-${timestamp}.pdf`;

          // Check if Capacitor is available (for mobile apps)
          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
              // Write PDF to documents directory
              await window.Capacitor.Plugins.Filesystem.writeFile({
                path: mobileFileName,
                data: pdfBase64,
                directory: 'DOCUMENTS'
              });

              // Get the file URI
              const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                path: mobileFileName,
                directory: 'DOCUMENTS'
              });

              // Show success message and trigger native Android "Open with" dialog
              
              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
            }
          } else {
            // Fallback for web browsers - use the blob approach
            try {
              const pdfBlob = doc.output('blob');
              const url = URL.createObjectURL(pdfBlob);
              
              // Create a visible download button for mobile
              const downloadContainer = document.createElement('div');
              downloadContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #4a6cf7;
                border-radius: 12px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 90vw;
              `;
              
              downloadContainer.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
                <p style="margin: 0 0 15px 0; color: #666;">Timetable Report</p>
                <a href="${url}" download="${fileName}" 
                   style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                  📄 Download PDF
                </a>
                <br>
                <button onclick="this.parentElement.remove()" 
                        style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                               border-radius: 6px; margin-top: 10px; cursor: pointer;">
                  Close
                </button>
              `;
              
              document.body.appendChild(downloadContainer);
              
              // Auto-remove after 30 seconds
              setTimeout(() => {
                if (downloadContainer.parentElement) {
                  downloadContainer.remove();
                }
                URL.revokeObjectURL(url);
              }, 30000);
              
              
            } catch (webError) {
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Timetable PDF</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { text-align: center; margin-bottom: 20px; }
                        .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                        .download-btn:hover { background: #3a5ce5; }
                        iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h2>📄 Timetable PDF Generated</h2>
                          <p>If the PDF doesn't open automatically, use the download button below:</p>
                        </div>
                        <div style="text-align: center;">
                          <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                            📥 Download PDF File
                          </a>
                        </div>
                        <iframe src="${pdfDataUri}"></iframe>
                      </div>
                    </body>
                  </html>
                `);
                newWindow.document.close();
              }
            }
          }
        } catch (error) {
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
      }
      
      toast.showToast('PDF generated successfully!', 'success');
    } catch (error) {
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setExportLoading(false);
      setLoading(false);
    }
  };

  // Helper function to get teacher's schedule
  const getTeacherSchedule = (teacherId: number, classes: Class[]) => {
    const scheduleMap = new Map<number, { classes: string[]; subjects: string[] }>();
    const filteredClasses = classes.filter(cls => classAssignments[cls.id] && classAssignments[cls.id].length > 0);
    
    filteredClasses.forEach((cls: Class) => {
      periods.forEach((period, idx) => {
        const cellKey = `${cls.id}_${idx}`;
        const selected = cellSelections[cellKey] || [];
        selected.forEach(sel => {
          const [subjectId, tid] = sel.split('_');
          if (Number(tid) === teacherId) {
            const periodNum = period.num;
            if (!scheduleMap.has(periodNum)) {
              scheduleMap.set(periodNum, {
                classes: [],
                subjects: []
              });
            }
            const entry = scheduleMap.get(periodNum)!;
            entry.classes.push(cls.name);
            entry.subjects.push(getSubjectName(Number(subjectId)));
          }
        });
      });
    });
    
    // Convert map to array and sort by period
    return Array.from(scheduleMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([period, entry]) => ({
        period: period,
        class: entry.classes.join(' / '),
        subject: entry.subjects.join(' / ')
      }));
  };

  const handleExportTeacherSlips = async () => {
    if (!sessionId) {
      toast.showToast('Ensure a session is active to export teacher slips.', 'warning');
      return;
    }

    setTeacherSlipsLoading(true);
    setLoading(true);
    toast.showToast('Generating teacher slips...', 'info');

    try {
      // Initialize PDF in portrait A4
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      
      // Calculate dimensions for 2x2 grid
      const gridCols = 2;
      const gridRows = 2;
      const slipsPerPage = gridCols * gridRows;
      const horizontalGap = 25; // Increased from 10 to 25mm
      const slipWidth = (pageWidth - (2 * margin) - horizontalGap) / gridCols;
      const slipHeight = (pageHeight - (2 * margin) - 10) / gridRows; // 10mm gap between rows
      
      // Get all teachers who have classes
      const activeTeachers = new Set<number>();
      Object.values(cellSelections).forEach(selections => {
        selections.forEach(sel => {
          const [_, teacherId] = sel.split('_');
          activeTeachers.add(Number(teacherId));
        });
      });

      let currentSlip = 0;
      let currentPage = 1;

      interface PeriodInfo {
        period: number | 'Break';
        time: string;
      }

      Array.from(activeTeachers).forEach(teacherId => {
        if (currentSlip === slipsPerPage) {
          doc.addPage();
          currentPage++;
          currentSlip = 0;
        }

        // Calculate position in 2x2 grid
        const row = Math.floor(currentSlip / gridCols);
        const col = currentSlip % gridCols;
        const startX = margin + (col * (slipWidth + horizontalGap));
        const startY = margin + (row * (slipHeight + 5));

        // Get all periods including break
        const allPeriods: PeriodInfo[] = [];
        for (let i = 1; i <= periods.length; i++) {
          if (i === breakIdx + 2) {
            allPeriods.push({ period: 'Break', time: '11:00-11:15' });
          }
          if (i <= periods.length) {
            allPeriods.push({ period: i, time: periods[i-1].time });
          }
        }

        // Draw teacher name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(getTeacherNameWithPrefix(teacherId), startX, startY + 8, { maxWidth: slipWidth });

        // Get teacher's schedule
        const schedule = getTeacherSchedule(teacherId, classes);
        // Create a map for quick lookup
        const scheduleMap = new Map<number, { class: string; subject: string }>(
          schedule.map(s => [s.period, { class: s.class, subject: s.subject }])
        );

        // Draw table
        const tableData = allPeriods.map(p => {
          if (p.period === 'Break') {
            return [{ content: 'BREAK', colSpan: 3 }];
          }
          const scheduleItem = scheduleMap.get(p.period);
          return [
            p.period.toString(),
            scheduleItem ? scheduleItem.class : 'Free Period',
            scheduleItem ? scheduleItem.subject : '-'
          ];
        });

        autoTable(doc, {
          head: [['Period', 'Class', 'Subject']],
          body: tableData,
          startY: startY + 12,
          margin: { left: startX, right: margin },
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            minCellHeight: 6,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            fillColor: undefined
          },
          headStyles: {
            fillColor: [240, 240, 240] as Color,
            textColor: [40, 40, 40] as Color,
            fontSize: 11,
            fontStyle: 'bold',
            minCellHeight: 6
          },
          // Add custom styles for specific rows
          didParseCell: function(data: CellHookData) {
            const rowData = data.row.raw as unknown as (string | { content: string, colSpan: number })[];
            if (rowData) {
              // Highlight break row
              const firstCell = rowData[0];
              if (firstCell && typeof firstCell === 'object' && 'content' in firstCell && firstCell.content === 'BREAK') {
                data.cell.styles.fillColor = [245, 245, 245] as Color;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 11;
                data.cell.styles.halign = 'center';
              }
              // Style for free periods
              if (rowData[1] === 'Free Period') {
                data.cell.styles.textColor = [128, 128, 128] as Color;
                data.cell.styles.fontStyle = 'italic';
              }
            }
          },
          tableWidth: slipWidth
        });

        currentSlip++;
      });

      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
      }
      
      // Format date as dd-mmm-yyyy for filename
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fileName = `Teacher Schedules (${formatDateForFileName(new Date())}).pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `teacher-schedules-${timestamp}.pdf`;

          // Check if Capacitor is available (for mobile apps)
          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
              // Write PDF to documents directory
              await window.Capacitor.Plugins.Filesystem.writeFile({
                path: mobileFileName,
                data: pdfBase64,
                directory: 'DOCUMENTS'
              });

              // Get the file URI
              const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                path: mobileFileName,
                directory: 'DOCUMENTS'
              });

              // Show success message and trigger native Android "Open with" dialog
              
              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
            }
          } else {
            // Fallback for web browsers - use the blob approach
            try {
              const pdfBlob = doc.output('blob');
              const url = URL.createObjectURL(pdfBlob);
              
              // Create a visible download button for mobile
              const downloadContainer = document.createElement('div');
              downloadContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #4a6cf7;
                border-radius: 12px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 90vw;
              `;
              
              downloadContainer.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
                <p style="margin: 0 0 15px 0; color: #666;">Teacher Schedules Report</p>
                <a href="${url}" download="${fileName}" 
                   style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                  📄 Download PDF
                </a>
                <br>
                <button onclick="this.parentElement.remove()" 
                        style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                               border-radius: 6px; margin-top: 10px; cursor: pointer;">
                  Close
                </button>
              `;
              
              document.body.appendChild(downloadContainer);
              
              // Auto-remove after 30 seconds
              setTimeout(() => {
                if (downloadContainer.parentElement) {
                  downloadContainer.remove();
                }
                URL.revokeObjectURL(url);
              }, 30000);
              
              
            } catch (webError) {
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Teacher Schedules PDF</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { text-align: center; margin-bottom: 20px; }
                        .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                        .download-btn:hover { background: #3a5ce5; }
                        iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h2>📄 Teacher Schedules PDF Generated</h2>
                          <p>If the PDF doesn't open automatically, use the download button below:</p>
                        </div>
                        <div style="text-align: center;">
                          <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                            📥 Download PDF File
                          </a>
                        </div>
                        <iframe src="${pdfDataUri}"></iframe>
                      </div>
                    </body>
                  </html>
                `);
                newWindow.document.close();
              }
            }
          }
        } catch (error) {
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
      }
      
      toast.showToast('Teacher slips generated successfully!', 'success');
    } catch (error) {
      toast.showToast('Failed to generate teacher slips', 'error');
    } finally {
      setTeacherSlipsLoading(false);
      setLoading(false);
    }
  };

  // Show loading animation while all data is being fetched and checked
  if (loading || !allDataLoaded) {
    return <Loader />;
  }

  // Check if no teachers are available
  if (teachers.length === 0) {
    return <NoTeachersFound />;
  }

  // Check if no subjects are assigned to teachers
  const hasAssignments = Object.keys(classAssignments).length > 0 && 
    Object.values(classAssignments).some(assignments => assignments.length > 0);
  
  if (!hasAssignments) {
    return (
      <Container>
        <PageHeaderCard>
          <PageHeaderText>Timetable for {sessionName}</PageHeaderText>
        </PageHeaderCard>
        <NoAssignmentsContainer>
          <NoAssignmentsIcon>📚</NoAssignmentsIcon>
          <NoAssignmentsTitle>No Subjects Assigned to Teachers</NoAssignmentsTitle>
          <NoAssignmentsText>
            No subjects have been assigned to teachers yet. You need to assign subjects to teachers first before you can create a timetable.
          </NoAssignmentsText>
          <AssignSubjectsButton onClick={() => navigate('/teacher-subjects')}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            Assign Subjects to Teachers
          </AssignSubjectsButton>
        </NoAssignmentsContainer>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeaderCard>
        <PageHeaderText>Timetable for {sessionName}</PageHeaderText>
      </PageHeaderCard>
      {loading ? <div>Loading...</div> : (
        <TableWrapper>
          <TimetableTable>
            <thead>
              <tr>
                <Th classCol>Class</Th>
                {Array.from({ length: 8 + 1 }).map((_, idx) => {
                  if (idx === breakIdx + 1) {
                    return <Th breakCol key="break"></Th>;
                  } else {
                    const periodIdx = idx > breakIdx + 1 ? idx - 1 : idx;
                    const period = periods[periodIdx];
                    return (
                      <Th key={period.num}>
                        <div>{period.num}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{period.time}</div>
                      </Th>
                    );
                  }
                })}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredClasses = sortClassesLocal(
                  classes.filter(cls => classAssignments[cls.id] && classAssignments[cls.id].length > 0)
                );
                return [
                  ...filteredClasses.map((cls, rowIdx) => (
                    <tr key={cls.id}>
                      <Td classCol>{cls.name}</Td>
                      {Array.from({ length: 8 + 1 }).map((_, idx) => {
                        if (idx === breakIdx + 1) {
                          if (rowIdx === 0) {
                            return (
                              <BreakColumn
                                key="break"
                                rowSpan={filteredClasses.length + 1} // +1 for free teachers row
                              >
                                Break<br />11:00-11:15
                              </BreakColumn>
                            );
                          }
                          return null;
                        }
                        const periodIdx = idx > breakIdx + 1 ? idx - 1 : idx;
                        const cellKey = `${cls.id}_${periodIdx}`;
                        const selected = cellSelections[cellKey] || [];
                        const isEditing = dropdown?.cellKey === cellKey;
                        const options = getAvailablePairs(cls.id, cellKey);
                        let display;
                        if (selected.length > 0) {
                          const teacherGroups = selected.reduce((acc: { [key: string]: string[] }, sel) => {
                            const [subjectId, teacherId] = sel.split('_');
                            if (!acc[teacherId]) acc[teacherId] = [];
                            acc[teacherId].push(getSubjectName(Number(subjectId)));
                            return acc;
                          }, {});
                          display = (
                            <>
                              {Object.entries(teacherGroups).map(([teacherId, subjects], idx) => (
                                <div key={teacherId} style={{ marginBottom: idx < Object.keys(teacherGroups).length - 1 ? '8px' : 0 }}>
                                  <b>{subjects.sort().join(' / ')}</b>
                                  <br />
                                  <span style={{ fontSize: '0.97em', color: '#4a6cf7' }}>
                                    {getTeacherName(Number(teacherId))}
                                  </span>
                                </div>
                              ))}
                            </>
                          );
                        } else {
                          display = <span style={{ color: '#888' }}>Select...</span>;
                        }
                        return (
                          <Td
                            key={idx}
                            style={{ cursor: 'pointer', position: 'relative' }}
                            onClick={e => {
                              if (dropdown?.cellKey !== cellKey) {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setDropdown({ cellKey, rect });
                              }
                            }}
                          >
                            <div className="cell-content">
                              {display}
                            </div>
                            {dropdown?.cellKey === cellKey && dropdown.rect &&
                              ReactDOM.createPortal(
                                (() => {
                                  const rect = dropdown.rect;
                                  const dropdownWidth = Math.max(rect.width, 220);
                                  let top = rect.bottom + 4;
                                  let left = rect.left;
                                  // Adjust vertical position, preferring below but checking for space
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  if (spaceBelow < 180 + 8 && spaceAbove > 180 + 8) { // Not enough space below, but enough above
                                    top = rect.top - 180 - 4; // Position above the cell
                                  } else if (spaceBelow < 180 + 8) { // Not enough space below and not enough above
                                    top = window.innerHeight - 180 - 8; // Position at bottom edge
                                    if (top < 8) top = 8; // Prevent going off top edge
                                  }
                                  
                                  // Adjust horizontal position, preferring left alignment but checking for space
                                  const spaceRight = window.innerWidth - rect.left;
                                  const spaceLeft = rect.left + rect.width;
                                  let finalLeft = rect.left;
                                  if (spaceRight < dropdownWidth + 8 && spaceLeft > dropdownWidth + 8) { // Not enough space right, but enough left (aligned to cell's right)
                                    finalLeft = rect.right - dropdownWidth; // Position to the left of the cell, aligned to cell's right edge
                                  } else if (spaceRight < dropdownWidth + 8) { // Not enough space right and not enough left
                                    finalLeft = window.innerWidth - dropdownWidth - 8; // Position at right edge
                                    if (finalLeft < 8) finalLeft = 8; // Prevent going off left edge
                                  }

                                  // Use the calculated finalLeft
                                  left = finalLeft;

                                  return (
                                    <Dropdown
                                      ref={dropdownRef}
                                      style={{
                                        top,
                                        left,
                                        minWidth: dropdownWidth,
                                        maxHeight: '180px',
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                      }}
                                    >
                                      {(cellSelections[cellKey] && cellSelections[cellKey].length > 0) && <>
                                        <DropdownOption
                                          style={{ color: '#dc2626', fontWeight: 700 }}
                                          onClick={() => {
                                            setCellSelections(s => ({ ...s, [cellKey]: [] }));
                                            setDropdown(null);
                                          }}
                                        >
                                          Deselect
                                        </DropdownOption>
                                        <div style={{ borderTop: '1px solid #eee', margin: '4px 0 2px 0' }} />
                                      </>}
                                      {options.length === 0 ? (
                                        <DropdownOption disabled>No options</DropdownOption>
                                      ) : options.map((opt, i) => (
                                        <DropdownOption
                                          key={i}
                                          onClick={() => {
                                            setCellSelections(s => {
                                              const current = s[cellKey] || [];
                                              const [newSubjectId, newTeacherId] = opt.value.split('_');
                                              if (current.length === 0) {
                                                // No selection yet, just add
                                                const newSelections = { ...s, [cellKey]: [opt.value] };
                                                return newSelections;
                                              }
                                              // Get teacherId of current selection(s)
                                              const [, currentTeacherId] = current[0].split('_');
                                              
                                              if (current.every(sel => sel.split('_')[1] === newTeacherId)) {
                                                // Same teacher, add if not already present
                                                if (!current.includes(opt.value)) {
                                                  const newSelections = { ...s, [cellKey]: [...current, opt.value] };
                                                  return newSelections;
                                                } else {
                                                  return s; // Already selected
                                                }
                                              } else {
                                                // Different teacher, replace selection
                                                const newSelections = { ...s, [cellKey]: [opt.value] };
                                                return newSelections;
                                              }
                                            });
                                            setDropdown(null);
                                          }}
                                        >
                                          {opt.label}
                                        </DropdownOption>
                                      ))}
                                    </Dropdown>
                                  );
                                })(),
                                document.body
                              )
                            }
                          </Td>
                        );
                      })}
                    </tr>
                  )),
                  // Free teachers row
                  <tr key="free-teachers">
                    <Td classCol style={{ fontWeight: 'bold' }}>Free Teachers</Td>
                    {Array.from({ length: 8 + 1 }).map((_, idx) => {
                      if (idx === breakIdx + 1) {
                        return null; // Skip break column as it's already spanned
                      }
                      const periodIdx = idx > breakIdx + 1 ? idx - 1 : idx;
                      const freeTeachers = getFreeTeachers(periodIdx);
                      return (
                        <Td key={idx} style={{ fontSize: '0.9rem', color: '#666' }}>
                          {freeTeachers.join(', ')}
                        </Td>
                      );
                    })}
                  </tr>
                ];
              })()}
            </tbody>
          </TimetableTable>
        </TableWrapper>
      )}
      <ActionButtonsContainer>
        <label htmlFor="break-select" style={{ fontWeight: 600, marginRight: 8 }}>Break after:</label>
        <ThemedSelect
          id="break-select"
          value={breakIdx}
          onChange={e => setBreakIdx(Number(e.target.value))}
        >
          {periods.slice(0, periods.length - 1).map((p, idx) => (
            <ThemedOption key={p.num} value={idx}>{idx + 1}</ThemedOption>
          ))}
        </ThemedSelect>
        <Button variant="contained" color="primary" onClick={handleSaveTimetable} disabled={loading || !sessionId}>
          {loading ? 'Saving...' : 'Save Timetable'}
        </Button>
        <Button variant="contained" color="secondary" onClick={handleExportPDF} disabled={loading || exportLoading || !sessionId}>
          {exportLoading ? (
            <>
              <div style={{ 
                width: 16, 
                height: 16, 
                border: '2px solid #e0e7ff', 
                borderTop: '2px solid #4a6cf7', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
              }} />
              Exporting...
            </>
          ) : (
            'Export PDF'
          )}
        </Button>
        <Button variant="contained" color="info" onClick={handleExportTeacherSlips} disabled={loading || teacherSlipsLoading || !sessionId}>
          {teacherSlipsLoading ? (
            <>
              <div style={{ 
                width: 16, 
                height: 16, 
                border: '2px solid #e0e7ff', 
                borderTop: '2px solid #4a6cf7', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
              }} />
              Exporting...
            </>
          ) : (
            'Export Teacher Slips'
          )}
        </Button>
      </ActionButtonsContainer>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
  );
};

export default TimeTableManager; 