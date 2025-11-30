import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { matchesStudentSearch, getSequenceNumber } from '../../../utils/studentUtils';
import { StudentSearchSuggestion } from '../types';

export const useStudentSearch = (user: any) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [studentSearchSuggestions, setStudentSearchSuggestions] = useState<StudentSearchSuggestion[]>([]);
  const [studentSearchShowSuggestions, setStudentSearchShowSuggestions] = useState(false);
  const [studentSearchActiveSuggestion, setStudentSearchActiveSuggestion] = useState(0);
  const [studentSearchExpanded, setStudentSearchExpanded] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const studentSearchInputRef = useRef<HTMLInputElement>(null);
  const [studentsList, setStudentsList] = useState<Array<{
    id: number;
    name: string;
    father_name?: string;
    class_id: number;
    section_id: number;
    picture_url?: string;
    roll_number?: string | null;
  }>>([]);
  const [classesList, setClassesList] = useState<Array<{ id: number; name: string; has_sections?: boolean }>>([]);
  const [sectionsList, setSectionsList] = useState<Array<{ id: number; name: string }>>([]);

  // Fetch students, classes, and sections for search
  useEffect(() => {
    if (!user?.school_id) return;

    const fetchSearchData = async () => {
      try {
        const [studentsResult, classesResult, sectionsResult] = await Promise.all([
          supabase
            .from('students')
            .select('id, name, father_name, class_id, section_id, picture_url, roll_number')
            .eq('school_id', user.school_id),
          supabase
            .from('classes')
            .select('id, name, has_sections')
            .eq('school_id', user.school_id),
          supabase
            .from('sections')
            .select('id, name')
            .eq('school_id', user.school_id)
        ]);

        if (studentsResult.data) setStudentsList(studentsResult.data);
        if (classesResult.data) setClassesList(classesResult.data);
        if (sectionsResult.data) setSectionsList(sectionsResult.data);
      } catch (error) {
        // Error fetching search data
      }
    };

    fetchSearchData();
  }, [user?.school_id]);

  // Search logic
  useEffect(() => {
    if (!studentSearchExpanded) {
      setStudentSearchSuggestions([]);
      setStudentSearchShowSuggestions(false);
      return;
    }

    if (studentSearchInput.trim().length === 0) {
      setStudentSearchSuggestions([]);
      setStudentSearchShowSuggestions(false);
      return;
    }

    const searchTerm = studentSearchInput.trim().toLowerCase();

    const scoredStudents = studentsList
      .map(student => {
        const studentNameLower = student.name.toLowerCase();
        let score = 0;
        let matches = false;

        const idMatch = matchesStudentSearch(student, searchTerm);
        if (idMatch.matches) {
          score = idMatch.score;
          matches = true;
        }

        if (studentNameLower.startsWith(searchTerm)) {
          score = Math.max(score, 100);
          matches = true;
        } else if (studentNameLower.includes(searchTerm)) {
          score = Math.max(score, 50);
          matches = true;
        }

        return matches ? { student, score } : null;
      })
      .filter(item => item !== null)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, 8)
      .map(item => item!.student);

    const enriched = scoredStudents.map(student => {
      const classObj = classesList.find(c => c.id === student.class_id);
      const sectionObj = sectionsList.find(s => s.id === student.section_id);
      return {
        ...student,
        roll_number: student.roll_number,
        class_name: classObj?.name || '',
        section_name: sectionObj?.name || ''
      };
    });

    setStudentSearchSuggestions(enriched);
    setStudentSearchShowSuggestions(enriched.length > 0);
    setStudentSearchActiveSuggestion(0);
  }, [studentSearchInput, studentsList, classesList, sectionsList, studentSearchExpanded]);

  // Close search when clicking outside
  useEffect(() => {
    if (!studentSearchExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target as Node)) {
        setStudentSearchExpanded(false);
        setStudentSearchInput('');
        setStudentSearchSuggestions([]);
        setStudentSearchShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [studentSearchExpanded]);

  // Collapse search when route changes
  useEffect(() => {
    setStudentSearchExpanded(false);
    setStudentSearchInput('');
    setStudentSearchSuggestions([]);
    setStudentSearchShowSuggestions(false);
  }, [location.pathname]);

  const getStudentClassName = (classId: number) => {
    return classesList.find(c => c.id === classId)?.name || '-';
  };

  const getStudentSectionName = (sectionId: number) => {
    return sectionsList.find(s => s.id === sectionId)?.name || '';
  };

  const getStudentClassHasSections = (classId: number) => {
    return classesList.find(c => c.id === classId)?.has_sections ?? true;
  };

  const handleStudentSelect = (student: StudentSearchSuggestion) => {
    let displayId: string | number;
    if (student.roll_number) {
      const sequenceNumber = getSequenceNumber(student.roll_number);
      displayId = sequenceNumber || student.id;
    } else {
      displayId = student.id;
    }
    navigate(`/students/profile/${String(displayId)}`);
    setStudentSearchInput('');
    setStudentSearchSuggestions([]);
    setStudentSearchShowSuggestions(false);
    setStudentSearchExpanded(false);
  };

  const handleStudentSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!studentSearchShowSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setStudentSearchActiveSuggestion(prev => Math.min(prev + 1, studentSearchSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setStudentSearchActiveSuggestion(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (studentSearchSuggestions[studentSearchActiveSuggestion]) {
        handleStudentSelect(studentSearchSuggestions[studentSearchActiveSuggestion]);
      }
    } else if (e.key === 'Escape') {
      setStudentSearchExpanded(false);
      setStudentSearchInput('');
      setStudentSearchSuggestions([]);
      setStudentSearchShowSuggestions(false);
    }
  };

  return {
    studentSearchInput,
    setStudentSearchInput,
    studentSearchSuggestions,
    studentSearchShowSuggestions,
    setStudentSearchShowSuggestions,
    studentSearchActiveSuggestion,
    setStudentSearchActiveSuggestion,
    studentSearchExpanded,
    setStudentSearchExpanded,
    studentSearchRef,
    studentSearchInputRef,
    handleStudentSearchKeyDown,
    handleStudentSelect,
    getStudentClassName,
    getStudentSectionName,
    getStudentClassHasSections,
  };
};

