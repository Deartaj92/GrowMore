import React, { useState, useEffect, useContext } from 'react';
import styled, { createGlobalStyle, css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { PageHeaderContext } from '../components/Layout';
import Loader from '../components/Loader';
import { 
  ContentPaste as TagIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckIcon,
  Class as ClassIcon,
  Book as SubjectIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import {
  getLayoutPalette,
  getFieldPalette,
  isDark as checkIsDark,
  ClayCard,
  ClayButton,
  ClaySelect
} from '../styles/DesignSystem';

// ==========================================
// STYLED COMPONENTS
// ==========================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100%;
  padding: 0 10px 1.5rem 10px;
  background: ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    const dark = checkIsDark(theme);
    return `
      radial-gradient(circle at top left, ${dark ? 'rgba(255, 255, 255, 0.035)' : `${theme.ACCENT}10`} 0%, transparent 26%),
      linear-gradient(180deg, rgba(255,255,255,${dark ? '0.02' : '0.35'}) 0%, transparent 18%),
      ${layout.shellBg}
    `;
  }};
`;

const PrintGlobalStyle = createGlobalStyle`
  @media print {
    @page {
      margin: 5mm;
      size: A4;
    }
    
    body {
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body * {
      visibility: hidden;
    }
    
    #print-section, #print-section * {
      visibility: visible;
    }
    
    #print-section {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  }

  .button-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: button-spin 0.8s linear infinite;
    display: inline-block;
  }

  @keyframes button-spin {
    to { transform: rotate(360deg); }
  }
`;

const ControlPanel = styled(ClayCard)`
  padding: 0.85rem 1rem;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  border-radius: 14px;

  @media print {
    display: none;
  }
`;

const ControlRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 190px));
  gap: 0.8rem;
  align-items: end;
  flex: 1 1 auto;

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    width: 100%;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  display: flex;
  align-items: center;
  gap: 0.4rem;

  svg {
    font-size: 1rem;
    opacity: 0.7;
  }
`;

const SubjectGrid = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  padding: 0.75rem;
  background: ${({ theme }) => getFieldPalette(theme).bg};
  border: 1px solid ${({ theme }) => getFieldPalette(theme).border};
  border-radius: 12px;
  margin-top: 0.2rem;
`;

const SubjectPill = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  ${({ $selected, theme }) => {
    const accent = theme.ACCENT;
    if ($selected) {
      return css`
        background: ${accent};
        color: white;
        box-shadow: 0 4px 10px ${accent}44;
      `;
    }
    return css`
      background: ${getFieldPalette(theme).bg};
      color: ${getLayoutPalette(theme).shellMutedText};
      border: 1.5px solid ${getFieldPalette(theme).border};
      
      &:hover {
        border-color: ${accent}88;
        background: ${accent}11;
        color: ${accent};
      }
    `;
  }}
`;

const PreviewTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 800;
  margin: 1.5rem 0 0.5rem 5px;
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  gap: 0.6rem;

  @media print {
    display: none;
  }
`;

const TagsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(3.65in, 1fr));
  gap: 18px;
  justify-content: center;
  padding: 10px;

  @media print {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 0;
  }
`;

const TagItem = styled.div`
  width: 3.65in;
  min-height: 2.34in;
  background: #ffffff;
  border: 1.5px solid #2e2e2e;
  border-radius: 12px;
  padding: 10px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  page-break-inside: avoid;
  color: #1f2937;
  gap: 10px;

  &::before {
    content: '';
    position: absolute;
    inset: 7px;
    border: 1.5px solid #2e2e2e;
    border-radius: 8px;
    z-index: 0;
    pointer-events: none;
  }

  @media print {
    box-shadow: none;
    border: 1.5px solid #cfd5de;
    margin: 2px;
    background: white !important;
  }
`;

const SpiralRing = styled.div<{ $top: number }>`
  display: none;
`;

const TagCardInner = styled.div`
  position: relative;
  z-index: 1;
  margin-left: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TagHeader = styled.div`
  display: block;
  padding: 0;
`;

const SubjectBadge = styled.div`
  width: 100%;
  font-size: 1.24rem;
  font-weight: 900;
  color: #ffffff;
  background: linear-gradient(180deg, #8e8e8e 0%, #787878 100%);
  border: 1px solid #6d6d6d;
  border-radius: 12px;
  padding: 0.72rem 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`;

const HeaderMeta = styled.div`
  display: none;
`;

const HeaderCaption = styled.div`
  display: none;
`;

const HeaderName = styled.div`
  display: none;
`;

const TagBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
`;

const TopInfoRow = styled.div`
  display: grid;
  grid-template-columns: 1.22fr 0.78fr;
  gap: 8px;
`;

const InfoPanel = styled.div`
  position: relative;
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
  border: 1.5px solid #2e2e2e;
`;

const TeacherPanel = styled(InfoPanel)`
  min-height: 58px;
`;

const LowerInfoRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const PanelLabel = styled.div`
  font-size: 0.62rem;
  font-weight: 500;
  color: #111111;
  text-transform: none;
  letter-spacing: 0;
  margin-bottom: 0.16rem;
`;

const PanelValue = styled.div`
  font-size: 0.94rem;
  font-weight: 500;
  color: #000000;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StudentLine = styled.div`
  font-size: 1rem;
  font-weight: 500;
  color: #000000;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TeacherValue = styled(PanelValue)`
  font-size: 0.96rem;
`;

const SchoolLine = styled.div`
  position: relative;
  margin: auto 0 0 0;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 900;
  text-transform: none;
  letter-spacing: 0;
  line-height: 1.2;
  color: #ffffff;
  background: linear-gradient(180deg, #8e8e8e 0%, #787878 100%);
  border: 1px solid #6d6d6d;
  border-radius: 12px;
  padding: 8px 14px;
  overflow: hidden;
`;

const SchoolLineText = styled.span`
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;


const EmptyState = styled(ClayCard)`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  svg {
    font-size: 3rem;
    opacity: 0.3;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0;
  flex-wrap: nowrap;
  align-self: end;
  flex: 0 0 auto;

  @media (max-width: 900px) {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
`;

// ==========================================
// COMPONENT
// ==========================================

const NotebookTagGenerator: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { setPageHeader } = useContext(PageHeaderContext);

  // State
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [classSubjectsMapping, setClassSubjectsMapping] = useState<any[]>([]);

  useEffect(() => {
    setPageHeader('Notebook Tags');
  }, [setPageHeader]);

  // Initial Data Fetch
  useEffect(() => {
    if (!user?.school_id) return;

    const fetchInitialData = async () => {
      try {
        const [
          { data: classesData },
          { data: sectionsData },
          { data: subjectsData },
          { data: classSubjectsData },
          { data: teacherAssignmentsData },
          { data: activeSessionData },
          { data: profileData },
          { data: schoolData }
        ] = await Promise.all([
          supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name'),
          supabase.from('sections').select('id, class_id, name').eq('school_id', user.school_id).order('name'),
          supabase.from('subjects').select('id, name').eq('school_id', user.school_id).order('name'),
          supabase.from('class_subjects').select('class_id, subject_id').eq('school_id', user.school_id),
          supabase
            .from('teacher_class_subjects')
            .select('section_id, class_subjects (class_id, subject_id), staff (name)')
            .eq('school_id', user.school_id),
          supabase.from('sessions').select('id').eq('school_id', user.school_id).eq('is_active', true).maybeSingle(),
          supabase.from('institute_profile').select('*').eq('school_id', user.school_id).single(),
          supabase.from('schools').select('*').eq('id', user.school_id).single()
        ]);

        setClasses(classesData || []);
        setSections(sectionsData || []);
        setSubjects(subjectsData || []);
        setClassSubjectsMapping(classSubjectsData || []);
        setTeacherAssignments(teacherAssignmentsData || []);
        setActiveSessionId(activeSessionData?.id || null);
        setSchoolProfile({
          name: profileData?.name || schoolData?.name || 'GrowMore ERP',
          address: profileData?.address || schoolData?.address || ''
        });
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        toast.showToast('Failed to load classes and subjects', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  // Fetch students from class history for the active session
  useEffect(() => {
    if (!user?.school_id || !activeSessionId) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setFetchingStudents(true);
      try {
        const historyQuery = supabase
          .from('student_class_history')
          .select(`
            student_id,
            new_class_id,
            new_section_id,
            adm_class_id,
            adm_section_id
          `)
          .eq('session_id', activeSessionId)
          .eq('school_id', user.school_id);

        const { data: historyData, error: historyError } = await historyQuery;
        if (historyError) throw historyError;

        if (!historyData || historyData.length === 0) {
          setStudents([]);
          return;
        }

        const uniqueHistory = Array.from(
          new Map(
            historyData.map((entry: any) => [
              entry.student_id,
              {
                ...entry,
                current_class_id: entry.new_class_id || entry.adm_class_id,
                current_section_id:
                  entry.new_section_id !== null && entry.new_section_id !== undefined
                    ? entry.new_section_id
                    : entry.adm_section_id
              }
            ])
          ).values()
        )
          .filter((entry: any) => entry.current_class_id)
          .filter((entry: any) =>
            selectedClass === 'all'
              ? true
              : entry.current_class_id?.toString() === selectedClass
          )
          .filter((entry: any) =>
            selectedSection === 'all'
              ? true
              : entry.current_section_id?.toString() === selectedSection
          );

        if (uniqueHistory.length === 0) {
          setStudents([]);
          return;
        }

        const studentIds = uniqueHistory.map((entry: any) => entry.student_id);
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .in('id', studentIds)
          .order('name');

        if (studentsError) throw studentsError;

        const historyMap = new Map(
          uniqueHistory.map((entry: any) => [entry.student_id, entry])
        );

        const getRollSortValue = (student: any) => {
          const rollValue = getStudentRoll(student);
          const numericRoll = Number(String(rollValue).replace(/[^\d.-]/g, ''));
          return Number.isFinite(numericRoll) ? numericRoll : Number.MAX_SAFE_INTEGER;
        };

        const mappedStudents = (studentsData || [])
          .map((student: any) => {
            const historyEntry = historyMap.get(student.id);
            if (!historyEntry) return null;
            return {
              ...student,
              class_id: historyEntry.current_class_id,
              section_id: historyEntry.current_section_id ?? null
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => {
            const rollDiff = getRollSortValue(a) - getRollSortValue(b);
            if (rollDiff !== 0) return rollDiff;
            return (a.name || '').localeCompare(b.name || '');
          });

        setStudents(mappedStudents);
      } catch (err: any) {
        console.error('Error fetching students from class history:', err);
        toast.showToast('Failed to fetch students', 'error');
      } finally {
        setFetchingStudents(false);
      }
    };

    fetchStudents();
  }, [activeSessionId, selectedClass, selectedSection, user, toast]);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId) 
        : [...prev, subjectId]
    );
  };

  const handleSelectAllSubjects = () => {
    const classSubjects = uniqueSubjects
      .filter(Boolean)
      .map((subject: any) => subject.name);
    
    // If all are already selected, clear. Otherwise select all.
    const uniqueClassSubjects = Array.from(new Set(classSubjects));
    const currentlySelectedNames = selectedSubjects;
    
    const allSelected = uniqueClassSubjects.every(name => currentlySelectedNames.includes(name));
    
    if (allSelected) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(uniqueClassSubjects);
    }
  };

  const drawRoundedRect = (
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    style: 'S' | 'F' | 'DF' = 'S'
  ) => {
    pdf.roundedRect(x, y, width, height, radius, radius, style);
  };

  const getStudentRoll = (student: any) =>
    student?.roll_no ||
    student?.rollNumber ||
    student?.admission_no ||
    student?.admissionNumber ||
    student?.gr_no ||
    student?.registration_no ||
    student?.id ||
    '-';

  const findTeacherForTag = (student: any, subjectName: string) => {
    const subject = subjects.find(s => s.name === subjectName);
    if (!subject) return null;

    const matchingAssignments = teacherAssignments.filter((assignment) => {
      const classSubject = Array.isArray(assignment.class_subjects)
        ? assignment.class_subjects[0]
        : assignment.class_subjects;
      return (
        classSubject?.class_id?.toString() === student.class_id?.toString() &&
        classSubject?.subject_id?.toString() === subject.id?.toString()
      );
    });

    const sectionSpecific = matchingAssignments.find(
      assignment => assignment.section_id?.toString() === student.section_id?.toString()
    );
    const fallback = matchingAssignments.find(assignment => !assignment.section_id);
    const resolved = sectionSpecific || fallback || matchingAssignments[0];
    const staff = Array.isArray(resolved?.staff) ? resolved?.staff[0] : resolved?.staff;
    return staff?.name || null;
  };

  const drawTagToPdf = (
    pdf: jsPDF,
    tag: any,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const contentX = x + 6;
    const contentWidth = width - 12;
    const studentName = tag.student.name || '-';
    const parentName = tag.student.father_name || '-';
    const classValue = `${tag.className}${tag.sectionName ? ` (${tag.sectionName})` : ''}` || '-';
    const subjectValue = tag.subjectName || '-';
    const teacherValue = tag.teacherName || 'Not Assigned';
    const schoolName = schoolProfile?.name || 'AL HARAM PUBLIC SCHOOL AND IQRA ACADEMY';
    const subjectY = y + 4.2;
    const subjectH = 12.6;
    const topRowY = subjectY + subjectH + 3.2;
    const topRowH = 12.6;
    const teacherY = topRowY + topRowH + 2.8;
    const teacherH = topRowH;
    const footerH = 8.6;
    const footerY = y + height - footerH - 4.2;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(46, 46, 46);
    pdf.setLineWidth(0.6);
    drawRoundedRect(pdf, x, y, width, height, 3.2, 'DF');

    pdf.setDrawColor(46, 46, 46);
    pdf.setLineWidth(0.3);
    drawRoundedRect(pdf, x + 2, y + 2, width - 4, height - 4, 2.2, 'S');

    pdf.setFillColor(142, 142, 142);
    pdf.setDrawColor(109, 109, 109);
    drawRoundedRect(pdf, contentX, subjectY, contentWidth, subjectH, 2.8, 'DF');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    const subjectLine = pdf.splitTextToSize(subjectValue.toUpperCase(), contentWidth - 8).slice(0, 1);
    const subjectText = Array.isArray(subjectLine) ? subjectLine[0] : subjectLine;
    const subjectTextX = x + (width - pdf.getTextWidth(subjectText)) / 2;
    const subjectTextY = subjectY + (subjectH / 2) + 2.1;
    pdf.text(subjectText, subjectTextX, subjectTextY);
    pdf.text(subjectText, subjectTextX + 0.15, subjectTextY);

    const leftBoxW = contentWidth * 0.66;
    const gap = 4;
    const rightBoxW = contentWidth - leftBoxW - gap;
    const leftBoxX = contentX;
    const rightBoxX = leftBoxX + leftBoxW + gap;
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(46, 46, 46);
    drawRoundedRect(pdf, leftBoxX, topRowY, leftBoxW, topRowH, 3, 'DF');
    drawRoundedRect(pdf, rightBoxX, topRowY, rightBoxW, topRowH, 3, 'DF');

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.1);
    pdf.text('Name', leftBoxX + 3, topRowY + 3.9);
    pdf.setFontSize(9.8);
    pdf.text(pdf.splitTextToSize(studentName, leftBoxW - 6).slice(0, 1), leftBoxX + 3, topRowY + 9.6);

    pdf.setFontSize(5.1);
    pdf.text('Class', rightBoxX + 3, topRowY + 3.9);
    pdf.setFontSize(9);
    pdf.text(pdf.splitTextToSize(classValue, rightBoxW - 6).slice(0, 2), rightBoxX + 3, topRowY + 9.5);

    const lowerLeftW = (contentWidth - gap) / 2;
    const lowerRightX = contentX + lowerLeftW + gap;
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(46, 46, 46);
    drawRoundedRect(pdf, contentX, teacherY, lowerLeftW, teacherH, 3, 'DF');
    drawRoundedRect(pdf, lowerRightX, teacherY, lowerLeftW, teacherH, 3, 'DF');
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.1);
    pdf.text('Father', contentX + 3, teacherY + 3.8);
    pdf.setFontSize(9.4);
    pdf.text(pdf.splitTextToSize(parentName, lowerLeftW - 6).slice(0, 1), contentX + 3, teacherY + 9.5);
    pdf.setFontSize(5.1);
    pdf.text('Subject Teacher', lowerRightX + 3, teacherY + 3.8);
    pdf.setFontSize(9.4);
    pdf.text(pdf.splitTextToSize(teacherValue, lowerLeftW - 6).slice(0, 1), lowerRightX + 3, teacherY + 9.5);

    pdf.setFillColor(142, 142, 142);
    pdf.setDrawColor(109, 109, 109);
    drawRoundedRect(pdf, contentX, footerY, contentWidth, footerH, 2.8, 'DF');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.8);
    const schoolLine = pdf.splitTextToSize(schoolName, contentWidth - 8).slice(0, 1);
    const schoolText = Array.isArray(schoolLine) ? schoolLine[0] : schoolLine;
    pdf.text(schoolText, x + (width - pdf.getTextWidth(schoolText)) / 2, footerY + (footerH / 2) + 1.9);
  };

  const generatePDF = async () => {
    if (tagsToRender.length === 0) {
      toast.showToast('Please select subjects to generate tags.', 'warning');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const totalTags = tagsToRender.length;
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 6;
      const marginY = 6;
      const gapX = 5;
      const gapY = 3;
      const cols = 2;
      const rows = 4;
      const tagsPerPage = cols * rows;
      const cardWidth = (pageWidth - marginX * 2 - gapX) / cols;
      const cardHeight = (pageHeight - marginY * 2 - gapY) / rows;
      const renderedCardHeight = cardHeight - 6;
      const totalPages = Math.ceil(totalTags / tagsPerPage);

      for (let p = 0; p < totalPages; p++) {
        const startIdx = p * tagsPerPage;
        const endIdx = Math.min(startIdx + tagsPerPage, totalTags);
        if (p > 0) pdf.addPage();

        for (let i = startIdx; i < endIdx; i++) {
          const indexOnPage = i - startIdx;
          const col = indexOnPage % cols;
          const row = Math.floor(indexOnPage / cols);
          const x = marginX + col * (cardWidth + gapX);
          const y = marginY + row * (cardHeight + gapY);
          drawTagToPdf(pdf, tagsToRender[i], x, y, cardWidth, renderedCardHeight);
        }
      }

      const fileName = `Notebook_Tags_${selectedClass}.pdf`;
      pdf.save(fileName);
      toast.showToast(`Professional PDF generated (${totalTags} tags)!`, 'success');
    } catch (error) {
      console.error('PDF Generation error:', error);
      toast.showToast('Failed to generate PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) return <Loader />;

  const filteredSections = selectedClass === 'all'
    ? sections
    : sections.filter(s => s.class_id.toString() === selectedClass);

  const availableClassIds = Array.from(
    new Set(
      students
        .map(student => student.class_id?.toString())
        .filter(Boolean)
    )
  );

  const classSubjects = subjects.filter(s =>
    classSubjectsMapping.some(m =>
      availableClassIds.includes(m.class_id?.toString()) && m.subject_id === s.id
    )
  );
  
  // Get unique subject names
  const uniqueSubjects = Array.from(new Set(classSubjects.map(s => s.name)))
    .map(name => classSubjects.find(s => s.name === name));

  const filteredStudents = selectedStudent === 'all'
    ? students
    : students.filter(student => student.id.toString() === selectedStudent);

  const tagsToRender: any[] = [];
  if (filteredStudents.length > 0 && selectedSubjects.length > 0) {
    filteredStudents.forEach(student => {
      selectedSubjects.forEach(subjectName => {
        const teacherName = findTeacherForTag(student, subjectName);
        tagsToRender.push({
          student,
          rollNo: getStudentRoll(student),
          subjectName,
          teacherName,
          className: classes.find(c => c.id.toString() === student.class_id.toString())?.name || '-',
          sectionName: sections.find(s => s.id.toString() === student.section_id?.toString())?.name || ''
        });
      });
    });
  }

  return (
    <Container>
      <PrintGlobalStyle />
      
      <ControlPanel>
        <ControlRow>
          <FilterGroup>
            <FormGroup>
              <Label><ClassIcon /> Class</Label>
              <ClaySelect 
                value={selectedClass} 
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('all');
                  setSelectedStudent('all');
                  setSelectedSubjects([]);
                }}
              >
                <option value="all">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </ClaySelect>
            </FormGroup>

            <FormGroup>
              <Label><ClassIcon /> Section</Label>
              <ClaySelect 
                value={selectedSection} 
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setSelectedStudent('all');
                  setSelectedSubjects([]);
                }}
              >
                <option value="all">All Sections</option>
                {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </ClaySelect>
            </FormGroup>

            <FormGroup>
              <Label><TagIcon /> Student</Label>
              <ClaySelect
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={students.length === 0}
              >
                <option value="all">All Students</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {[getStudentRoll(student), student.name, student.father_name]
                      .filter(Boolean)
                      .join(' - ')}
                  </option>
                ))}
              </ClaySelect>
            </FormGroup>
          </FilterGroup>

          <Actions>
            <ClayButton 
              $variant="secondary"
              onClick={handleSelectAllSubjects}
              disabled={uniqueSubjects.length === 0}
            >
              {selectedSubjects.length === uniqueSubjects.length && uniqueSubjects.length > 0 ? <UncheckIcon /> : <CheckIcon />}
              {selectedSubjects.length === uniqueSubjects.length && uniqueSubjects.length > 0 ? 'Deselect All' : 'All Subjects'}
            </ClayButton>
            
            <ClayButton 
              $variant="primary" 
              onClick={generatePDF}
              disabled={tagsToRender.length === 0 || isGeneratingPdf}
              style={{ minWidth: '150px' }}
            >
              {isGeneratingPdf ? <div className="button-spinner" style={{ marginRight: '8px' }} /> : <PdfIcon />}
              {isGeneratingPdf ? 'Generating...' : `Export PDF (${tagsToRender.length} Tags)`}
            </ClayButton>
          </Actions>
        </ControlRow>

        {uniqueSubjects.length > 0 && (
          <FormGroup>
            <Label><SubjectIcon /> Subjects</Label>
            <SubjectGrid>
              {uniqueSubjects.map(s => s && (
                <SubjectPill 
                  key={s.id} 
                  $selected={selectedSubjects.includes(s.name)}
                  onClick={() => handleSubjectToggle(s.name)}
                >
                  {selectedSubjects.includes(s.name) ? <CheckIcon fontSize="small" /> : <UncheckIcon fontSize="small" />}
                  {s.name}
                </SubjectPill>
              ))}
            </SubjectGrid>
          </FormGroup>
        )}
      </ControlPanel>

      {fetchingStudents ? (
        <Loader />
      ) : tagsToRender.length > 0 ? (
        <>
          <PreviewTitle><TagIcon /> Preview Tags</PreviewTitle>
          <TagsContainer id="print-section">
            {tagsToRender.map((tag, idx) => (
              <TagItem key={`${tag.student.id}-${tag.subjectName}-${idx}`}>
                {[18, 40, 62, 84, 106].map((top) => (
                  <SpiralRing key={top} $top={top} />
                ))}
                <TagCardInner>
                  <TagHeader>
                    <SubjectBadge>{tag.subjectName}</SubjectBadge>
                  </TagHeader>

                  <TagBody>
                    <TopInfoRow>
                      <InfoPanel>
                        <PanelLabel>Name</PanelLabel>
                        <StudentLine>{tag.student.name}</StudentLine>
                      </InfoPanel>

                      <InfoPanel>
                        <PanelLabel>Class</PanelLabel>
                        <PanelValue>{tag.className} {tag.sectionName ? `(${tag.sectionName})` : ''}</PanelValue>
                      </InfoPanel>
                    </TopInfoRow>

                    <LowerInfoRow>
                      <TeacherPanel>
                        <PanelLabel>Father</PanelLabel>
                        <TeacherValue>{tag.student.father_name || '-'}</TeacherValue>
                      </TeacherPanel>

                      <TeacherPanel>
                        <PanelLabel>Subject Teacher</PanelLabel>
                        <TeacherValue>{tag.teacherName || 'Not Assigned'}</TeacherValue>
                      </TeacherPanel>
                    </LowerInfoRow>
                  </TagBody>

                  <SchoolLine>
                    <SchoolLineText>{schoolProfile?.name || 'AL HARAM PUBLIC SCHOOL AND IQRA ACADEMY'}</SchoolLineText>
                  </SchoolLine>
                </TagCardInner>
              </TagItem>
            ))}
          </TagsContainer>
        </>
      ) : (
        <EmptyState>
          <TagIcon />
          {selectedSubjects.length === 0
            ? 'Select one or more subjects to generate notebook tags.'
            : 'No active-session students found for the selected filters.'}
        </EmptyState>
      )}
    </Container>
  );
};

export default NotebookTagGenerator;
