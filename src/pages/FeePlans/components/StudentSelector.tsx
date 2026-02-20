import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Search as SearchIcon } from '@mui/icons-material';
import { supabase } from '../../../supabaseClient';
import { StudentInfo } from '../types';

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  margin-bottom: 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    opacity: 0.6;
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  pointer-events: none;
  
  svg {
    font-size: 18px;
  }
`;

const SuggestionsList = styled.div<{ show: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  display: ${props => props.show ? 'block' : 'none'};
`;

const SuggestionItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const StudentName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  margin-bottom: 4px;
`;

const StudentDetails = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

interface StudentSelectorProps {
  schoolId: number;
  sessionId: number | null;
  onSelect: (student: StudentInfo) => void;
  selectedStudent: StudentInfo | null;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  schoolId,
  sessionId,
  onSelect,
  selectedStudent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<StudentInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchStudents = async () => {
      setLoading(true);
      try {
        // Search students by name, student number, or roll number
        const searchLower = searchTerm.toLowerCase();
        
        // Check if search term is numeric (could be an ID)
        const isNumeric = /^\d+$/.test(searchTerm.trim());
        
        let query = supabase
          .from('students')
          .select(`
            id,
            name,
            father_name,
            roll_number,
            admission_date,
            class_id,
            section_id
          `)
          .eq('school_id', schoolId);
        
        // Search by name, father's name, or ID (if numeric)
        if (isNumeric) {
          query = query.or(`name.ilike.%${searchTerm}%,father_name.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
        } else {
          query = query.or(`name.ilike.%${searchTerm}%,father_name.ilike.%${searchTerm}%`);
        }
        
        query = query.limit(20);

        const { data: studentsData, error } = await query;

        if (error) throw error;

        if (!studentsData || studentsData.length === 0) {
          setSuggestions([]);
          setShowSuggestions(false);
          setLoading(false);
          return;
        }

        // Get current class from student_class_history if session is available
        const studentIds = studentsData.map(s => s.id);
        let classHistoryMap = new Map();

        if (sessionId) {
          const { data: historyData } = await supabase
            .from('student_class_history')
            .select(`
              student_id,
              new_class_id,
              new_section_id,
              new_classes:new_class_id(id, name),
              new_sections:new_section_id(id, name)
            `)
            .in('student_id', studentIds)
            .eq('session_id', sessionId)
            .eq('school_id', schoolId)
            .order('id', { ascending: true });

          if (historyData) {
            // Group by student_id and get latest
            const studentHistoryMap = new Map();
            historyData.forEach((entry: any) => {
              if (!studentHistoryMap.has(entry.student_id)) {
                studentHistoryMap.set(entry.student_id, []);
              }
              studentHistoryMap.get(entry.student_id).push(entry);
            });

            studentHistoryMap.forEach((records, studentId) => {
              if (records.length > 0) {
                const lastRecord = records[records.length - 1];
                classHistoryMap.set(studentId, {
                  classId: lastRecord.new_class_id,
                  sectionId: lastRecord.new_section_id,
                  className: Array.isArray(lastRecord.new_classes) 
                    ? lastRecord.new_classes[0]?.name 
                    : lastRecord.new_classes?.name,
                  sectionName: Array.isArray(lastRecord.new_sections) 
                    ? lastRecord.new_sections[0]?.name 
                    : lastRecord.new_sections?.name,
                });
              }
            });
          }
        }

        // Get classes and sections
        const classIds = Array.from(new Set([
          ...studentsData.map(s => s.class_id).filter(Boolean),
          ...Array.from(classHistoryMap.values()).map(v => v.classId).filter(Boolean)
        ]));
        const sectionIds = Array.from(new Set([
          ...studentsData.map(s => s.section_id).filter(Boolean),
          ...Array.from(classHistoryMap.values()).map(v => v.sectionId).filter(Boolean)
        ]));

        const [classesResult, sectionsResult] = await Promise.all([
          classIds.length > 0 ? supabase
            .from('classes')
            .select('id, name')
            .in('id', classIds)
            .eq('school_id', schoolId) : { data: [] },
          sectionIds.length > 0 ? supabase
            .from('sections')
            .select('id, name')
            .in('id', sectionIds)
            .eq('school_id', schoolId) : { data: [] }
        ]);

        const classesMap = new Map((classesResult.data || []).map(c => [c.id, c.name]));
        const sectionsMap = new Map((sectionsResult.data || []).map(s => [s.id, s.name]));

        // Map students to StudentInfo
        const mappedStudents: StudentInfo[] = studentsData.map(student => {
          const history = classHistoryMap.get(student.id);
          return {
            id: student.id,
            name: student.name || '',
            fatherName: student.father_name || '',
            studentNumber: student.roll_number || '', // Use roll_number as student number
            rollNumber: student.roll_number,
            dateOfAdmission: student.admission_date || '',
            className: history?.className || classesMap.get(student.class_id) || '',
            sectionName: history?.sectionName || sectionsMap.get(student.section_id) || '',
            classId: history?.classId || student.class_id || undefined,
            sectionId: history?.sectionId || student.section_id || undefined,
          };
        });

        setSuggestions(mappedStudents);
        setShowSuggestions(mappedStudents.length > 0);
      } catch (error) {
        console.error('Error searching students:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchStudents, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, schoolId, sessionId]);

  const handleSelect = (student: StudentInfo) => {
    onSelect(student);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  return (
    <SearchContainer ref={containerRef}>
      <SearchIconWrapper>
        <SearchIcon style={{ fontSize: '20px' }} />
      </SearchIconWrapper>
      <SearchInput
        type="text"
        placeholder="Search by student name, ID, or roll number..."
        value={selectedStudent ? `${selectedStudent.name}${selectedStudent.studentNumber ? ` (${selectedStudent.studentNumber})` : ''}` : searchTerm}
        onChange={(e) => {
          if (!selectedStudent) {
            setSearchTerm(e.target.value);
          }
        }}
        onFocus={() => {
          if (searchTerm && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
        }}
      />
      <SuggestionsList show={showSuggestions && suggestions.length > 0}>
        {suggestions.map((student) => (
          <SuggestionItem
            key={student.id}
            onClick={() => handleSelect(student)}
          >
            <StudentName>{student.name}</StudentName>
            <StudentDetails>
              {student.studentNumber && <span>ID: {student.studentNumber}</span>}
              {student.rollNumber && <span>Roll: {student.rollNumber}</span>}
              {student.className && <span>Class: {student.className}{student.sectionName ? ` / ${student.sectionName}` : ''}</span>}
            </StudentDetails>
          </SuggestionItem>
        ))}
      </SuggestionsList>
    </SearchContainer>
  );
};

